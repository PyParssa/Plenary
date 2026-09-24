create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  selected_atmospheres text[] not null default '{}',
  role text not null default 'user' check (role in ('user', 'creator', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'creator', 'manager'));

-- Initial seed: promote designated administrator/manager email to 'manager'
-- Configurable: replace with your primary administrator email address
update public.profiles
set role = 'manager', updated_at = now()
where lower(email) = 'parssamohammadi@gmail.com';


create table if not exists public.cards (
  id text primary key,
  category text not null,
  author text not null,
  author_avatar text not null,
  author_bio text,
  book text not null,
  question text not null,
  backstory text not null,
  related_inquiries jsonb not null default '[]'::jsonb,
  vouch_count integer not null default 0,
  published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.cards add column if not exists vouch_count integer not null default 0;
alter table public.cards add column if not exists published boolean not null default true;

create index if not exists idx_cards_created_at on public.cards (created_at desc);
create index if not exists idx_cards_published on public.cards (published);
create index if not exists idx_profiles_created_at on public.profiles (created_at desc);
create index if not exists idx_profiles_role on public.profiles (role);

create table if not exists public.card_vouches (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create or replace function public.update_card_vouch_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.cards
    set vouch_count = vouch_count + 1
    where id = NEW.card_id;
    return NEW;
  elsif tg_op = 'DELETE' then
    update public.cards
    set vouch_count = greatest(0, vouch_count - 1)
    where id = OLD.card_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists on_card_vouch_change on public.card_vouches;
create trigger on_card_vouch_change
after insert or delete on public.card_vouches
for each row execute procedure public.update_card_vouch_count();

create table if not exists public.reflection_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  session jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.card_vouches enable row level security;
alter table public.reflection_sessions enable row level security;

create policy "Users can read their profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can create their profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Authenticated users can read cards" on public.cards;
drop policy if exists "Anyone can read cards" on public.cards;
drop policy if exists "Anyone can read published cards" on public.cards;
create policy "Anyone can read published cards"
  on public.cards for select
  using (
    published = true
    or
    (
      auth.uid() is not null
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role = 'manager'
      )
    )
  );
drop policy if exists "Users can create cards" on public.cards;
drop policy if exists "Creators and managers can create cards" on public.cards;
create policy "Creators and managers can create cards"
  on public.cards for insert to authenticated
  with check (
    auth.uid() = created_by
    and (select role from public.profiles where id = auth.uid()) in ('creator', 'manager')
  );

create policy "Users can read their vouches"
  on public.card_vouches for select using (auth.uid() = user_id);
create policy "Users can create their vouches"
  on public.card_vouches for insert with check (auth.uid() = user_id);
create policy "Users can remove their vouches"
  on public.card_vouches for delete using (auth.uid() = user_id);

create policy "Users can read their reflections"
  on public.reflection_sessions for select using (auth.uid() = user_id);
create policy "Users can create their reflections"
  on public.reflection_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their reflections"
  on public.reflection_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    -- Auto-elevate the bootstrap manager; adjust or expand email matching as needed
    case when lower(new.email) = 'parssamohammadi@gmail.com' then 'manager' else 'user' end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email)
select id, email
from auth.users
where email is not null
on conflict (id) do nothing;

insert into public.cards (id, category, author, author_avatar, book, question, backstory, related_inquiries, vouch_count)
values
  ('q-1', 'Existential Inquiry', 'Viktor Frankl', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80', $$Man's Search for Meaning$$, 'What would you attempt if you knew failure was not fatal?', 'In the crucible of deprivation, Frankl observed that survival was tied not to physical stamina, but to holding an inviolable internal purpose.', '["What task is currently waiting only for your signature?", "Are you suffering for an aim you actually chose?"]'::jsonb, 0),
  ('q-2', 'Solitude & Identity', 'Rainer Maria Rilke', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Letters to a Young Poet', 'Can you love the questions themselves, like locked rooms or books written in a foreign tongue?', 'Rilke urged patient coexistence with unresolved ambiguity and the capacity to embody an answer.', '["Which unresolved tension are you forcing into premature certainty?", "What if not knowing is the work?"]'::jsonb, 0),
  ('q-3', 'Career Reinvention', 'Marcus Aurelius', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Meditations (Book V)', 'At dawn, when you have trouble getting out of bed, do you remember what you were constructed to do?', 'Even Rome’s ruler struggled with lethargy, lecturing himself on morning duty as a citizen of the cosmos.', '["What work leaves you energized even when physically depleted?", "Who are you serving when you hide behind busyness?"]'::jsonb, 0),
  ('q-4', 'Mortality & Meaning', 'Mary Oliver', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'New and Selected Poems', 'Tell me, what is it you plan to do with your one wild and precious life?', 'Oliver pivoted from natural observation to direct existential confrontation: mortality gives attention its sacred weight.', '["What devotion are you postponing for a more convenient decade?", "If this year was your final chapter, what changes today?"]'::jsonb, 0),
  ('q-5', 'Career Reinvention', 'Seneca', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'On the Shortness of Life', 'Are you truly living, or are you merely being occupied by the demands of others?', 'Seneca chastised those who complained of brief lifespans while squandering daylight on frivolous obligations.', '["Which obligations on your calendar are born strictly from fear of disapproval?", "What would you say no to if your dignity depended on it?"]'::jsonb, 0),
  ('q-6', 'Deep Relationships', 'Simone de Beauvoir', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'The Ethics of Ambiguity', 'Does your love for another enlarge their liberty, or does it seek to cage them in your expectations?', 'Genuine moral existence requires willing the freedom of other people rather than reducing them to props in our private security.', '["Where are you demanding predictability instead of presence?", "Can you respect the secret life of the person you love?"]'::jsonb, 0),
  ('q-7', 'Creativity & Craft', 'Rainer Maria Rilke', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Letters to a Young Poet', 'Go into yourself. Find out the reason that commands you to write; see whether it has spread its roots into the very depth of your heart.', 'Rilke advised abandoning outside critique and comparison in favor of quiet creative necessity.', '["What creative impulse continues to haunt you when the house is quiet?", "What are you protecting by refusing to begin?"]'::jsonb, 0),
  ('q-8', 'Midlife Reckoning', 'Marcus Aurelius', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Meditations (Book IV)', 'How much time he gains who does not look to see what his neighbor says or does or thinks, but only at what he does himself?', 'Marcus observed how people exhaust their vital reserves surveying opinions they do not respect. Reclaiming your own standard is the antidote to regret.', '["Whose invisible courtroom are you defending yourself in?", "What is your private definition of an uncompromised day?"]'::jsonb, 0)
on conflict (id) do nothing;

-- Synchronize vouch_count from existing vouches (if any exist)
update public.cards c
set vouch_count = (
  select count(*)
  from public.card_vouches v
  where v.card_id = c.id
);


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
  '{"authors": [{"id": "steve-jobs", "name": "Steve Jobs", "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", "tagline": "What would Steve Jobs ask you?", "signatureQuestion": "If today were the last day of your life, would you want to do what you''re about to do today?", "description": "Co-founder of Apple \u2014 on craft, ruthless focus, design & mortality without compromise.", "filterKey": "Steve Jobs", "accentColor": "#f5f0eb", "darkAccentColor": "#1a222a"}, {"id": "naval-ravikant", "name": "Naval Ravikant", "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", "tagline": "What would Naval ask you?", "signatureQuestion": "Are you working on something that compounds, or just keeping busy?", "description": "Philosopher & investor \u2014 on leverage, specific knowledge, internal peace & clarity.", "filterKey": "Naval Ravikant", "accentColor": "#eef4fb", "darkAccentColor": "#162232"}, {"id": "viktor-frankl", "name": "Viktor Frankl", "avatarUrl": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80", "tagline": "What would Viktor Frankl ask you?", "signatureQuestion": "What would you attempt if you knew failure was not fatal?", "description": "Founder of Logotherapy \u2014 on meaning, suffering & the irreducible human will.", "filterKey": "Viktor Frankl", "accentColor": "#f3f0f8", "darkAccentColor": "#201b2c"}, {"id": "marcus-aurelius", "name": "Marcus Aurelius", "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", "tagline": "What would Marcus Aurelius ask you?", "signatureQuestion": "How much time do you lose worrying about what your neighbor thinks?", "description": "Roman Emperor & Stoic \u2014 on duty, discipline, impermanence & inner sovereignty.", "filterKey": "Marcus Aurelius", "accentColor": "#f0f5f0", "darkAccentColor": "#18241c"}, {"id": "paul-graham", "name": "Paul Graham", "avatarUrl": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80", "tagline": "What would Paul Graham ask you?", "signatureQuestion": "What problem are you working on that most people think is too small to matter?", "description": "YC co-founder & essayist \u2014 on startups, taste, intellectual honesty & relentlessly resourceful work.", "filterKey": "Paul Graham", "accentColor": "#fdf8f0", "darkAccentColor": "#252018"}, {"id": "seneca", "name": "Seneca", "avatarUrl": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80", "tagline": "What would Seneca ask you?", "signatureQuestion": "Are you truly living, or are you merely being occupied by the demands of others?", "description": "Roman Stoic statesman \u2014 on time scarcity, tranquility, anger & the art of living with dignity.", "filterKey": "Seneca", "accentColor": "#faf5ee", "darkAccentColor": "#241f19"}, {"id": "mary-oliver", "name": "Mary Oliver", "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", "tagline": "What would Mary Oliver ask you?", "signatureQuestion": "Tell me, what is it you plan to do with your one wild and precious life?", "description": "Pulitzer-winning poet \u2014 on fierce attention, wildness, presence & the sacredness of reality.", "filterKey": "Mary Oliver", "accentColor": "#f0f7f3", "darkAccentColor": "#17241e"}], "categories": [{"id": "cat-career", "label": "Career Change", "emoji": "\ud83e\udded", "tagline": "Questions for a career crossroads", "description": "When you sense the path no longer fits \u2014 or never did.", "filterKey": "Career Reinvention", "accentColor": "#eef4fb", "darkAccentColor": "#162332"}, {"id": "cat-life-decision", "label": "Life Decision", "emoji": "\u2696\ufe0f", "tagline": "For when the fork in the road is real", "description": "Major choices that cannot be undone \u2014 finding stillness before you leap.", "filterKey": "Existential Inquiry", "accentColor": "#fdf8f0", "darkAccentColor": "#252018"}, {"id": "cat-relationships", "label": "Relationships", "emoji": "\ud83e\udd1d", "tagline": "Questions about love, autonomy & deep bonds", "description": "When a connection demands more sovereign honesty than comfort.", "filterKey": "Deep Relationships", "accentColor": "#fdf0f3", "darkAccentColor": "#271a22"}, {"id": "cat-identity", "label": "Who Am I?", "emoji": "\ud83e\ude9e", "tagline": "Solitude, selfhood, and the unexamined life", "description": "Questions for when you need to meet your own quiet mind again.", "filterKey": "Solitude & Identity", "accentColor": "#f3f0f8", "darkAccentColor": "#201a2a"}, {"id": "cat-creativity", "label": "Creative Life", "emoji": "\ud83c\udfa8", "tagline": "For makers, writers & builders at the edge", "description": "When the blank page or unmade product calls for courage.", "filterKey": "Creativity & Craft", "accentColor": "#f0f5f0", "darkAccentColor": "#17241d"}, {"id": "cat-midlife", "label": "Midlife Reckoning", "emoji": "\ud83c\udf05", "tagline": "Questions about the second half of life", "description": "When ambition meets accumulated reflection \u2014 and priorities recalibrate.", "filterKey": "Midlife Reckoning", "accentColor": "#faf5ee", "darkAccentColor": "#241f18"}, {"id": "cat-mortality", "label": "Mortality & Meaning", "emoji": "\ud83d\udd6f\ufe0f", "tagline": "Questions at the edge of finitude", "description": "Confronting the finite nature of time to illuminate the present moment.", "filterKey": "Mortality & Meaning", "accentColor": "#f5f0eb", "darkAccentColor": "#211d19"}]}'::jsonb
)
on conflict (key) do nothing;
