-- Supabase Postgres schema for VMS-UMBC
-- Run this in Supabase SQL Editor or via migration

create table if not exists employees (
  id bigint generated always as identity primary key,
  first_name text,
  last_name text,
  umbc_email text unique,
  department text,
  title text,
  flagged boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists visas (
  id bigint generated always as identity primary key,
  employee_id bigint not null references employees(id) on delete cascade,
  type text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create index if not exists idx_visas_employee on visas(employee_id);
create index if not exists idx_visas_end_date on visas(end_date);

create table if not exists notes (
  id bigint generated always as identity primary key,
  employee_id bigint not null references employees(id) on delete cascade,
  text text,
  created_at timestamptz default now()
);

create index if not exists idx_notes_employee on notes(employee_id);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id bigint,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Helper views for stats
create or replace view v_employee_current_visa as
select e.id as employee_id,
       v.type,
       v.start_date,
       v.end_date
from employees e
left join lateral (
  select * from visas
  where visas.employee_id = e.id
  order by end_date desc nulls last
  limit 1
) v on true;

-- Row Level Security (enable, then define policies)
alter table employees enable row level security;
alter table visas enable row level security;
alter table notes enable row level security;
alter table audit_log enable row level security;

-- Basic policies: authenticated can read; restricted writes
create policy "employees read" on employees
  for select using (auth.role() = 'authenticated');
create policy "visas read" on visas
  for select using (auth.role() = 'authenticated');
create policy "notes read" on notes
  for select using (auth.role() = 'authenticated');
create policy "audit read" on audit_log
  for select using (auth.role() = 'authenticated');

-- Write policies (adjust as needed): allow authenticated inserts/updates
create policy "employees write" on employees
  for insert with check (auth.role() = 'authenticated')
  using (auth.role() = 'authenticated');
create policy "employees update" on employees
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "visas write" on visas
  for insert with check (auth.role() = 'authenticated')
  using (auth.role() = 'authenticated');

create policy "notes write" on notes
  for insert with check (auth.role() = 'authenticated')
  using (auth.role() = 'authenticated');

create policy "audit write" on audit_log
  for insert with check (auth.role() = 'authenticated')
  using (auth.role() = 'authenticated');
