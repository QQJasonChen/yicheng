-- 一程工作誌雲端同步資料表
-- 共用 yike 的 Supabase 專案（ofhupqifavtafiylehkj），但用獨立的 worklog 表，與 yike 的 journal 表互不干擾。
-- auth.users 共用：用同一組帳號登入 yike / yicheng 即可（資料各自存在 journal / worklog）。
-- 在 Supabase Dashboard → SQL Editor 貼上執行一次（本專案已透過 db 連線建好）。
create table if not exists public.worklog (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,        -- localStorage key（wj:day:YYYY-MM-DD / wj:projects / wj:settings）
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.worklog enable row level security;

-- 每個用戶只能讀寫自己的資料
create policy "own rows select" on public.worklog for select using (auth.uid() = user_id);
create policy "own rows insert" on public.worklog for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.worklog for update using (auth.uid() = user_id);
create policy "own rows delete" on public.worklog for delete using (auth.uid() = user_id);
