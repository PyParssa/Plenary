create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  selected_atmospheres text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.card_vouches (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

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

create policy "Authenticated users can read cards"
  on public.cards for select to authenticated using (true);
create policy "Users can create cards"
  on public.cards for insert to authenticated with check (auth.uid() = created_by);

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
  insert into public.profiles (id, email)
  values (new.id, new.email)
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

insert into public.cards (id, category, author, author_avatar, book, question, backstory, related_inquiries)
values
  ('q-1', 'Existential Inquiry', 'Viktor Frankl', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80', $$Man's Search for Meaning$$, 'What would you attempt if you knew failure was not fatal?', 'In the crucible of deprivation, Frankl observed that survival was tied not to physical stamina, but to holding an inviolable internal purpose.', '["What task is currently waiting only for your signature?", "Are you suffering for an aim you actually chose?"]'::jsonb),
  ('q-2', 'Solitude & Identity', 'Rainer Maria Rilke', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Letters to a Young Poet', 'Can you love the questions themselves, like locked rooms or books written in a foreign tongue?', 'Rilke urged patient coexistence with unresolved ambiguity and the capacity to embody an answer.', '["Which unresolved tension are you forcing into premature certainty?", "What if not knowing is the work?"]'::jsonb),
  ('q-3', 'Career Reinvention', 'Marcus Aurelius', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Meditations (Book V)', 'At dawn, when you have trouble getting out of bed, do you remember what you were constructed to do?', 'Even Rome’s ruler struggled with lethargy, lecturing himself on morning duty as a citizen of the cosmos.', '["What work leaves you energized even when physically depleted?", "Who are you serving when you hide behind busyness?"]'::jsonb),
  ('q-4', 'Mortality & Meaning', 'Mary Oliver', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'New and Selected Poems', 'Tell me, what is it you plan to do with your one wild and precious life?', 'Oliver pivoted from natural observation to direct existential confrontation: mortality gives attention its sacred weight.', '["What devotion are you postponing for a more convenient decade?", "If this year was your final chapter, what changes today?"]'::jsonb),
  ('q-5', 'Career Reinvention', 'Seneca', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'On the Shortness of Life', 'Are you truly living, or are you merely being occupied by the demands of others?', 'Seneca chastised those who complained of brief lifespans while squandering daylight on frivolous obligations.', '["Which obligations on your calendar are born strictly from fear of disapproval?", "What would you say no to if your dignity depended on it?"]'::jsonb),
  ('q-6', 'Deep Relationships', 'Simone de Beauvoir', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'The Ethics of Ambiguity', 'Does your love for another enlarge their liberty, or does it seek to cage them in your expectations?', 'Genuine moral existence requires willing the freedom of other people rather than reducing them to props in our private security.', '["Where are you demanding predictability instead of presence?", "Can you respect the secret life of the person you love?"]'::jsonb),
  ('q-7', 'Creativity & Craft', 'Rainer Maria Rilke', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Letters to a Young Poet', 'Go into yourself. Find out the reason that commands you to write; see whether it has spread its roots into the very depth of your heart.', 'Rilke advised abandoning outside critique and comparison in favor of quiet creative necessity.', '["What creative impulse continues to haunt you when the house is quiet?", "What are you protecting by refusing to begin?"]'::jsonb),
  ('q-8', 'Midlife Reckoning', 'Marcus Aurelius', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Meditations (Book IV)', 'How much time he gains who does not look to see what his neighbor says or does or thinks, but only at what he does himself?', 'Marcus observed how people exhaust their vital reserves surveying opinions they do not respect. Reclaiming your own standard is the antidote to regret.', '["Whose invisible courtroom are you defending yourself in?", "What is your private definition of an uncompromised day?"]'::jsonb)
on conflict (id) do nothing;
