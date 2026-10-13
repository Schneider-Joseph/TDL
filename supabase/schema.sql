-- TDL cloud-sync foundation
-- Run this in the Supabase SQL Editor for your TDL project.
-- Each task belongs to exactly one authenticated user. RLS is the security boundary.

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'Personal'
    check (category in ('Homework', 'Chore', 'Event', 'Personal')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_date date,
  due_time time,
  notes text not null default '' check (char_length(notes) <= 2000),
  completed boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists tasks_user_id_updated_at_idx
  on public.tasks (user_id, updated_at desc);

alter table public.tasks enable row level security;

-- Remove default access, then allow signed-in users to work only with their own rows.
revoke all on table public.tasks from anon, authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);
