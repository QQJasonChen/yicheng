import { useEffect, useRef, useState } from 'react'
import { Block, Project, Task } from './types'

// 時間軸範圍：06:00 – 23:00，每格 30 分鐘
const START_MIN = 6 * 60
const END_MIN = 23 * 60
const SLOT = 30
const SLOT_PX = 26 // 與 .tl-row 高度一致

const snap = (min: number) => Math.round(min / SLOT) * SLOT
const clampRange = (min: number) => Math.max(START_MIN, Math.min(END_MIN, min))
const minToY = (min: number) => ((min - START_MIN) / SLOT) * SLOT_PX
const fmt = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

let blockSeq = 0
const newId = () => `b${++blockSeq}-${performance.now().toString(36)}`

interface DragState {
  mode: 'create' | 'move' | 'resize'
  blockId?: string
  anchorMin: number
  curStart: number
  curEnd: number
  origStart: number
  origEnd: number
}

interface Props {
  blocks: Block[]
  tasks: Task[]
  projects: Project[]
  isToday: boolean
  onChange: (blocks: Block[]) => void
  /** 由 DayView 注入：任務拖放時呼叫，回傳是否成功放進時間軸 */
  dropRef: React.MutableRefObject<
    ((clientX: number, clientY: number, text: string, taskIndex: number) => boolean) | null
  >
}

export default function Timeline({ blocks, tasks, projects, isToday, onChange, dropRef }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes())

  // 時間塊 → 任務 → 專案（yicheng 差異化：時間軸一眼看到時間花在哪個專案）
  const projOfBlock = (taskIndex: number | null): Project | null => {
    if (taskIndex === null) return null
    const t = tasks[taskIndex]
    if (!t) return null
    return projects.find((p) => p.id === t.projectId) ?? null
  }

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setNowMin(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    dropRef.current = (clientX, clientY, text, taskIndex) => {
      const el = gridRef.current
      if (!el) return false
      const r = el.getBoundingClientRect()
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom)
        return false
      const min = clampRange(snap(START_MIN + ((clientY - r.top) / SLOT_PX) * SLOT))
      const start = Math.min(min, END_MIN - SLOT)
      onChange([
        ...blocks,
        { id: newId(), start, end: Math.min(start + 60, END_MIN), text, taskIndex },
      ])
      return true
    }
    return () => {
      dropRef.current = null
    }
  })

  const pointerMin = (clientY: number) => {
    const r = gridRef.current!.getBoundingClientRect()
    return clampRange(snap(START_MIN + ((clientY - r.top) / SLOT_PX) * SLOT))
  }

  const onGridPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('tl-cell'))
      return
    if (e.pointerType === 'mouse') {
      e.preventDefault()
      const m = pointerMin(e.clientY)
      setEditId(null)
      setDrag({ mode: 'create', anchorMin: m, curStart: m, curEnd: m + SLOT, origStart: m, origEnd: m })
    }
  }

  const onGridClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (drag) return
    if (!(e.target as HTMLElement).classList.contains('tl-cell')) return
    const m = Math.min(pointerMin(e.clientY), END_MIN - SLOT)
    const b: Block = { id: newId(), start: m, end: m + SLOT, text: '', taskIndex: null }
    onChange([...blocks, b])
    setEditId(b.id)
  }

  const startBlockDrag = (e: React.PointerEvent, b: Block, mode: 'move' | 'resize') => {
    e.stopPropagation()
    e.preventDefault()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 略過 */
    }
    const m = pointerMin(e.clientY)
    setDrag({
      mode,
      blockId: b.id,
      anchorMin: mode === 'move' ? m - b.start : 0,
      curStart: b.start,
      curEnd: b.end,
      origStart: b.start,
      origEnd: b.end,
    })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const m = pointerMin(e.clientY)
    setDrag((d) => {
      if (!d) return d
      if (d.mode === 'create') {
        const lo = Math.min(d.anchorMin, m)
        const hi = Math.max(d.anchorMin + SLOT, m + (m >= d.anchorMin ? SLOT : 0))
        return { ...d, curStart: lo, curEnd: Math.max(hi, lo + SLOT) }
      }
      if (d.mode === 'move') {
        const len = d.curEnd - d.curStart
        let start = clampRange(m - snap(d.anchorMin))
        start = Math.min(start, END_MIN - len)
        return { ...d, curStart: start, curEnd: start + len }
      }
      return { ...d, curEnd: Math.max(d.curStart + SLOT, m) }
    })
  }

  const onPointerUp = () => {
    if (!drag) return
    if (drag.mode === 'create') {
      const b: Block = { id: newId(), start: drag.curStart, end: drag.curEnd, text: '', taskIndex: null }
      onChange([...blocks, b])
      setEditId(b.id)
      suppressClick.current = true
    } else {
      const changed = drag.curStart !== drag.origStart || drag.curEnd !== drag.origEnd
      if (changed) {
        onChange(
          blocks.map((b) =>
            b.id === drag.blockId ? { ...b, start: drag.curStart, end: drag.curEnd } : b
          )
        )
        suppressClick.current = true
      }
    }
    setDrag(null)
  }

  const updateBlock = (id: string, patch: Partial<Block>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id))
    setEditId(null)
  }

  const rows: number[] = []
  for (let m = START_MIN; m < END_MIN; m += SLOT) rows.push(m)

  const editing = editId ? blocks.find((b) => b.id === editId) : null

  return (
    <div className="timeline-wrap">
      <div className="timeline-head">
        <div className="label" style={{ marginTop: 0 }}>
          今日時間軸
        </div>
      </div>
      <div className="timeline-hint">點空格新增・拖拉移動・拉底部把手調長度</div>
      <div
        className="timeline"
        ref={gridRef}
        onPointerDown={onGridPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onGridClick}
      >
        {rows.map((m) => (
          <div key={m} className={`tl-row ${m % 60 === 0 ? 'hour' : 'half'}`}>
            <div className="tl-time">{m % 60 === 0 ? fmt(m) : ''}</div>
            <div className="tl-cell" />
          </div>
        ))}

        <div className="tl-blocks">
          {blocks.map((b) => {
            const isDragging = drag?.blockId === b.id
            const start = isDragging ? drag.curStart : b.start
            const end = isDragging ? drag.curEnd : b.end
            const proj = projOfBlock(b.taskIndex)
            return (
              <div
                key={b.id}
                className={`tl-block ${b.taskIndex !== null ? 'linked' : ''} ${proj ? 'proj' : ''} ${
                  isDragging ? 'dragging' : ''
                } ${end - start <= SLOT ? 'slim' : ''}`}
                style={
                  {
                    top: minToY(start),
                    height: minToY(end) - minToY(start) - 2,
                    ...(proj ? { '--proj': `var(--proj-${proj.color})` } : {}),
                  } as React.CSSProperties
                }
                onPointerDown={(e) => startBlockDrag(e, b, 'move')}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => {
                  if (drag) {
                    onPointerUp()
                  } else {
                    e.stopPropagation()
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClick.current) {
                    suppressClick.current = false
                    return
                  }
                  setEditId(b.id)
                }}
              >
                <span className="tl-block-time">
                  {proj && <span className="tl-block-proj">{proj.emoji}</span>}
                  {fmt(start)} – {fmt(end)}
                </span>
                {b.text || '（未命名）'}
                <div
                  className="tl-resize"
                  onPointerDown={(e) => startBlockDrag(e, b, 'resize')}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                />
              </div>
            )
          })}

          {drag?.mode === 'create' && (
            <div
              className="tl-ghost"
              style={{
                top: minToY(drag.curStart),
                height: minToY(drag.curEnd) - minToY(drag.curStart) - 2,
              }}
            />
          )}
        </div>

        {isToday && nowMin >= START_MIN && nowMin <= END_MIN && (
          <div className="now-line" style={{ top: minToY(nowMin) }} />
        )}

        {editing && (
          <div
            className="block-pop"
            style={{
              top: Math.min(minToY(editing.start), ((END_MIN - START_MIN) / SLOT) * SLOT_PX - 110),
              right: 0,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="做什麼？例：深度工作、開會"
              value={editing.text}
              onChange={(e) => updateBlock(editing.id, { text: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && setEditId(null)}
            />
            <div className="pop-times">
              <select
                value={editing.start}
                onChange={(e) => {
                  const start = Number(e.target.value)
                  updateBlock(editing.id, { start, end: Math.max(editing.end, start + SLOT) })
                }}
              >
                {rows.map((min) => (
                  <option key={min} value={min}>
                    {fmt(min)}
                  </option>
                ))}
              </select>
              <span>–</span>
              <select
                value={editing.end}
                onChange={(e) => updateBlock(editing.id, { end: Number(e.target.value) })}
              >
                {rows
                  .map((min) => min + SLOT)
                  .filter((min) => min > editing.start)
                  .map((min) => (
                    <option key={min} value={min}>
                      {fmt(min)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="pop-actions">
              <span />
              <span>
                <button className="pop-del" onClick={() => removeBlock(editing.id)}>
                  刪除
                </button>
                {'　'}
                <button onClick={() => setEditId(null)}>完成</button>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
