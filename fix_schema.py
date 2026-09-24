import json

with open('discovery.json', 'r') as f:
    data = json.load(f)

json_str = json.dumps(data).replace("'", "''")

sql = f"""
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

alter table public.app_settings enable row level security;
create policy "Anyone can read app_settings"
  on public.app_settings for select using (true);
create policy "Managers can update app_settings"
  on public.app_settings for all
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'manager'
    )
  );

insert into public.app_settings (key, value)
values (
  'discovery',
  '{json_str}'::jsonb
)
on conflict (key) do nothing;
"""

with open('supabase/schema.sql', 'r') as f:
    lines = f.readlines()

with open('supabase/schema.sql', 'w') as f:
    f.writelines(lines[:187])
    f.write(sql)
