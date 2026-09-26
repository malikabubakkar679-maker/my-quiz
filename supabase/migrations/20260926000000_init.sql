-- My Quiz core schema
create extension if not exists pgcrypto;

create type public.institution_type as enum ('school', 'college', 'university');
create type public.difficulty_level as enum ('easy', 'medium', 'hard');
create type public.room_status as enum ('waiting', 'in_progress', 'ended', 'cancelled');
create type public.challenge_status as enum ('pending', 'accepted', 'declined', 'completed', 'cancelled');
create type public.attempt_mode as enum ('single', 'room', 'challenge');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 50),
  avatar_url text,
  institution_type public.institution_type,
  institution_name text check (char_length(institution_name) <= 120),
  city text check (char_length(city) <= 80),
  country text check (char_length(country) <= 80),
  bio text check (char_length(bio) <= 300),
  onboarding_completed boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  total_score integer not null default 0 check (total_score >= 0),
  total_quizzes integer not null default 0 check (total_quizzes >= 0),
  total_wins integer not null default 0 check (total_wins >= 0),
  total_challenges integer not null default 0 check (total_challenges >= 0),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_requires_fields check (
    not onboarding_completed or (
      username is not null and display_name is not null and avatar_url is not null
      and institution_type is not null and institution_name is not null
    )
  )
);
create index profiles_xp_idx on public.profiles (xp desc);
create index profiles_score_idx on public.profiles (total_score desc);
create index profiles_country_idx on public.profiles (lower(country));
create index profiles_username_trgm_idx on public.profiles (username text_pattern_ops);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  description text,
  icon text,
  image text,
  category text,
  difficulty public.difficulty_level not null default 'medium',
  question_count integer not null default 0,
  quiz_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_name_idx on public.courses (lower(name));
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- quizzes
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  difficulty public.difficulty_level not null default 'medium',
  duration integer not null default 600 check (duration between 30 and 7200),
  question_count integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index quizzes_course_idx on public.quizzes (course_id);
create index quizzes_title_idx on public.quizzes (lower(title));

-- ---------------------------------------------------------------- questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_text text not null check (char_length(question_text) between 1 and 1000),
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer char(1) not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty public.difficulty_level not null default 'medium',
  created_at timestamptz not null default now()
);
create index questions_quiz_idx on public.questions (quiz_id);

create or replace function public.refresh_course_counts(p_course uuid) returns void
language sql security definer set search_path = public as $$
  update courses c set
    quiz_count = (select count(*) from quizzes q where q.course_id = p_course),
    question_count = (select coalesce(sum(q.question_count), 0) from quizzes q where q.course_id = p_course)
  where c.id = p_course;
$$;

create or replace function public.questions_refresh_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_quiz uuid;
begin
  if tg_op = 'DELETE' then v_quiz := old.quiz_id; else v_quiz := new.quiz_id; end if;
  update quizzes set question_count = (select count(*) from questions where quiz_id = v_quiz) where id = v_quiz;
  perform refresh_course_counts((select course_id from quizzes where id = v_quiz));
  if tg_op = 'UPDATE' and old.quiz_id <> new.quiz_id then
    update quizzes set question_count = (select count(*) from questions where quiz_id = old.quiz_id) where id = old.quiz_id;
    perform refresh_course_counts((select course_id from quizzes where id = old.quiz_id));
  end if;
  return null;
end $$;

create or replace function public.quizzes_refresh_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform refresh_course_counts(old.course_id); end if;
  if tg_op in ('INSERT', 'UPDATE') then perform refresh_course_counts(new.course_id); end if;
  return null;
end $$;

create trigger questions_counts after insert or update or delete on public.questions
  for each row execute function public.questions_refresh_counts();
create trigger quizzes_counts after insert or update of course_id, question_count or delete on public.quizzes
  for each row execute function public.quizzes_refresh_counts();

-- ---------------------------------------------------------------- rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code char(8) not null unique check (room_code ~ '^[A-Z0-9]{8}$'),
  room_name text not null check (char_length(room_name) between 1 and 60),
  description text check (char_length(description) <= 300),
  course_id uuid not null references public.courses (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  status public.room_status not null default 'waiting',
  max_players integer not null default 10 check (max_players between 2 and 100),
  question_ids uuid[] not null,
  duration_seconds integer not null check (duration_seconds between 30 and 7200),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);
create index rooms_creator_idx on public.rooms (creator_id, created_at desc);
create index rooms_status_idx on public.rooms (status);

create table public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null default 0,
  correct_answers integer not null default 0,
  wrong_answers integer not null default 0,
  answered integer not null default 0,
  total_time integer not null default 0,
  status text not null default 'joined' check (status in ('joined', 'playing', 'finished', 'left')),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create index room_participants_user_idx on public.room_participants (user_id);

-- ---------------------------------------------------------------- challenges
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  status public.challenge_status not null default 'pending',
  question_ids uuid[] not null,
  duration_seconds integer not null check (duration_seconds between 30 and 7200),
  sender_score integer,
  receiver_score integer,
  sender_correct integer,
  receiver_correct integer,
  sender_time integer,
  receiver_time integer,
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  check (sender_id <> receiver_id)
);
create index challenges_sender_idx on public.challenges (sender_id, created_at desc);
create index challenges_receiver_idx on public.challenges (receiver_id, created_at desc);

-- ---------------------------------------------------------------- attempts & results
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  mode public.attempt_mode not null default 'single',
  room_id uuid references public.rooms (id) on delete cascade,
  challenge_id uuid references public.challenges (id) on delete cascade,
  question_ids uuid[] not null,
  answers jsonb not null default '{}'::jsonb,
  duration_seconds integer not null check (duration_seconds between 30 and 7200),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);
create unique index quiz_attempts_room_user_uq on public.quiz_attempts (room_id, user_id) where room_id is not null;
create unique index quiz_attempts_challenge_user_uq on public.quiz_attempts (challenge_id, user_id) where challenge_id is not null;

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.quiz_attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  mode public.attempt_mode not null,
  room_id uuid references public.rooms (id) on delete set null,
  challenge_id uuid references public.challenges (id) on delete set null,
  score integer not null,
  max_score integer not null,
  correct_answers integer not null,
  wrong_answers integer not null,
  unanswered integer not null,
  total_questions integer not null,
  total_time integer not null,
  average_time numeric(8, 2) not null,
  xp_earned integer not null default 0,
  is_winner boolean not null default false,
  started_at timestamptz not null,
  completed_at timestamptz not null default now()
);
create index quiz_results_user_idx on public.quiz_results (user_id, completed_at desc);
create index quiz_results_completed_idx on public.quiz_results (completed_at desc);
create index quiz_results_quiz_idx on public.quiz_results (quiz_id);

-- ---------------------------------------------------------------- notifications, achievements, reports
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('challenge_request', 'challenge_accepted', 'challenge_declined', 'challenge_completed', 'room_invitation', 'quiz_result', 'achievement', 'level_up')),
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'trophy'
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('question', 'quiz', 'course', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports (status, created_at desc);

insert into public.achievements (code, name, description, icon) values
  ('first_quiz', 'First Steps', 'Complete your first quiz', 'sparkles'),
  ('perfect_score', 'Flawless', 'Answer every question correctly', 'star'),
  ('ten_quizzes', 'Dedicated', 'Complete 10 quizzes', 'flame'),
  ('first_win', 'Champion', 'Win a room or challenge', 'trophy'),
  ('level_5', 'Rising Star', 'Reach level 5', 'rocket'),
  ('challenger', 'Challenger', 'Complete 5 challenges', 'swords');

-- ---------------------------------------------------------------- game logic (server-authoritative)
create or replace function public.level_for_xp(p_xp integer) returns integer
language sql immutable as $$ select floor(sqrt(greatest(p_xp, 0) / 100.0))::int + 1 $$;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link, data) values (p_user, p_type, p_title, p_body, p_link, coalesce(p_data, '{}'::jsonb));
$$;

create or replace function public.grant_achievement(p_user uuid, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ach achievements;
begin
  select * into v_ach from achievements where code = p_code;
  if not found then return; end if;
  insert into user_achievements (user_id, achievement_id) values (p_user, v_ach.id)
    on conflict do nothing;
  if found then
    perform notify(p_user, 'achievement', 'Achievement unlocked: ' || v_ach.name, v_ach.description, '/profile?tab=achievements');
  end if;
end $$;

create or replace function public.add_xp(p_user uuid, p_xp integer) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old int;
  v_new int;
begin
  select level into v_old from profiles where id = p_user for update;
  update profiles set xp = xp + p_xp, level = level_for_xp(xp + p_xp) where id = p_user returning level into v_new;
  if v_new > v_old then
    perform notify(p_user, 'level_up', 'Level up!', 'You reached level ' || v_new || '.', '/profile');
    if v_new >= 5 then perform grant_achievement(p_user, 'level_5'); end if;
  end if;
end $$;

-- Evaluate answers for an attempt: returns correct / wrong / answered counts.
create or replace function public.attempt_counts(p_attempt public.quiz_attempts, out correct int, out wrong int, out answered int)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where p_attempt.answers ->> q.id::text = q.correct_answer)::int,
    count(*) filter (where p_attempt.answers ? q.id::text and p_attempt.answers ->> q.id::text <> q.correct_answer)::int,
    count(*) filter (where p_attempt.answers ? q.id::text)::int
  from questions q where q.id = any (p_attempt.question_ids);
$$;

-- Record/replace an answer. Enforces ownership, deadline and question membership.
create or replace function public.record_answer(p_attempt_id uuid, p_user uuid, p_question_id uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_att quiz_attempts;
  v_c record;
begin
  select * into v_att from quiz_attempts where id = p_attempt_id for update;
  if not found or v_att.user_id <> p_user then raise exception 'attempt_not_found' using errcode = 'P0002'; end if;
  if v_att.submitted_at is not null then raise exception 'attempt_submitted' using errcode = 'P0001'; end if;
  if now() > v_att.expires_at + interval '3 seconds' then raise exception 'attempt_expired' using errcode = 'P0001'; end if;
  if now() < v_att.started_at then raise exception 'attempt_not_started' using errcode = 'P0001'; end if;
  if not (p_question_id = any (v_att.question_ids)) then raise exception 'invalid_question' using errcode = 'P0001'; end if;
  if p_answer is null then
    update quiz_attempts set answers = answers - p_question_id::text where id = p_attempt_id returning * into v_att;
  elsif p_answer in ('A', 'B', 'C', 'D') then
    update quiz_attempts set answers = jsonb_set(answers, array[p_question_id::text], to_jsonb(p_answer)) where id = p_attempt_id returning * into v_att;
  else
    raise exception 'invalid_answer' using errcode = 'P0001';
  end if;
  if v_att.room_id is not null then
    select * into v_c from attempt_counts(v_att);
    update room_participants set
      correct_answers = v_c.correct, wrong_answers = v_c.wrong, answered = v_c.answered,
      score = v_c.correct * 10, status = 'playing',
      total_time = greatest(0, extract(epoch from (least(now(), v_att.expires_at) - v_att.started_at)))::int
    where room_id = v_att.room_id and user_id = p_user;
  end if;
end $$;

create or replace function public.finish_room_if_done(p_room_id uuid, p_force boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_room rooms;
  v_pending int;
  v_winner room_participants;
  v_att record;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found or v_room.status <> 'in_progress' then return; end if;
  if p_force or now() > v_room.started_at + make_interval(secs => v_room.duration_seconds + 5) then
    for v_att in select id from quiz_attempts where room_id = p_room_id and submitted_at is null loop
      perform finalize_attempt(v_att.id, true);
    end loop;
    update room_participants set status = 'left' where room_id = p_room_id and status in ('joined', 'playing');
  end if;
  select count(*) into v_pending from room_participants where room_id = p_room_id and status in ('joined', 'playing');
  if v_pending > 0 then return; end if;
  update rooms set status = 'ended', ended_at = now() where id = p_room_id;
  select * into v_winner from room_participants where room_id = p_room_id and status = 'finished'
    order by correct_answers desc, total_time asc, joined_at asc limit 1;
  if found and (select count(*) from room_participants where room_id = p_room_id and status = 'finished') > 1 then
    update profiles set total_wins = total_wins + 1 where id = v_winner.user_id;
    update quiz_results set is_winner = true where room_id = p_room_id and user_id = v_winner.user_id;
    perform add_xp(v_winner.user_id, 50);
    perform grant_achievement(v_winner.user_id, 'first_win');
  end if;
end $$;

-- Finalize an attempt: compute results server-side from stored answers. Idempotent.
create or replace function public.finalize_attempt(p_attempt_id uuid, p_internal boolean default false, p_user uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_att quiz_attempts;
  v_c record;
  v_total int;
  v_time int;
  v_score int;
  v_xp int;
  v_result uuid;
  v_ch challenges;
  v_winner uuid;
  v_quiz_title text;
  v_profile profiles;
begin
  select * into v_att from quiz_attempts where id = p_attempt_id for update;
  if not found or (not p_internal and v_att.user_id is distinct from p_user) then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  if v_att.submitted_at is not null then
    select id into v_result from quiz_results where attempt_id = p_attempt_id;
    return v_result;
  end if;

  select * into v_c from attempt_counts(v_att);
  v_total := coalesce(array_length(v_att.question_ids, 1), 0);
  v_time := greatest(1, ceil(extract(epoch from (least(now(), v_att.expires_at) - v_att.started_at))))::int;
  v_time := least(v_time, v_att.duration_seconds);
  v_score := v_c.correct * 10;
  v_xp := v_c.correct * 10 + case when v_c.answered > 0 then 20 else 0 end;

  update quiz_attempts set submitted_at = now() where id = p_attempt_id;
  insert into quiz_results (attempt_id, user_id, quiz_id, mode, room_id, challenge_id, score, max_score,
    correct_answers, wrong_answers, unanswered, total_questions, total_time, average_time, xp_earned, started_at)
  values (v_att.id, v_att.user_id, v_att.quiz_id, v_att.mode, v_att.room_id, v_att.challenge_id, v_score, v_total * 10,
    v_c.correct, v_c.wrong, v_total - v_c.answered, v_total, v_time,
    round(v_time::numeric / greatest(v_total, 1), 2), v_xp, v_att.started_at)
  returning id into v_result;

  update profiles set total_quizzes = total_quizzes + 1, total_score = total_score + v_score
    where id = v_att.user_id returning * into v_profile;
  perform add_xp(v_att.user_id, v_xp);

  perform grant_achievement(v_att.user_id, 'first_quiz');
  if v_total > 0 and v_c.correct = v_total then perform grant_achievement(v_att.user_id, 'perfect_score'); end if;
  if v_profile.total_quizzes >= 10 then perform grant_achievement(v_att.user_id, 'ten_quizzes'); end if;

  select title into v_quiz_title from quizzes where id = v_att.quiz_id;
  if v_att.mode = 'single' then
    perform notify(v_att.user_id, 'quiz_result', 'Quiz completed: ' || v_quiz_title,
      'You scored ' || v_score || '/' || (v_total * 10) || ' and earned ' || v_xp || ' XP.', '/results/' || v_result);
  end if;

  if v_att.room_id is not null then
    update room_participants set
      correct_answers = v_c.correct, wrong_answers = v_c.wrong, answered = v_c.answered,
      score = v_score, total_time = v_time, status = 'finished'
    where room_id = v_att.room_id and user_id = v_att.user_id;
    if not p_internal then perform finish_room_if_done(v_att.room_id); end if;
  end if;

  if v_att.challenge_id is not null then
    select * into v_ch from challenges where id = v_att.challenge_id for update;
    if v_ch.sender_id = v_att.user_id then
      update challenges set sender_score = v_score, sender_correct = v_c.correct, sender_time = v_time where id = v_ch.id returning * into v_ch;
    else
      update challenges set receiver_score = v_score, receiver_correct = v_c.correct, receiver_time = v_time where id = v_ch.id returning * into v_ch;
    end if;
    if v_ch.sender_time is not null and v_ch.receiver_time is not null then
      -- Primary: correct answers. Tie-breaker: lower completion time. Otherwise a draw.
      v_winner := case
        when v_ch.sender_correct > v_ch.receiver_correct then v_ch.sender_id
        when v_ch.receiver_correct > v_ch.sender_correct then v_ch.receiver_id
        when v_ch.sender_time < v_ch.receiver_time then v_ch.sender_id
        when v_ch.receiver_time < v_ch.sender_time then v_ch.receiver_id
        else null end;
      update challenges set status = 'completed', completed_at = now(), winner_id = v_winner where id = v_ch.id;
      update profiles set total_challenges = total_challenges + 1 where id in (v_ch.sender_id, v_ch.receiver_id);
      if v_winner is not null then
        update profiles set total_wins = total_wins + 1 where id = v_winner;
        update quiz_results set is_winner = true where challenge_id = v_ch.id and user_id = v_winner;
        perform add_xp(v_winner, 50);
        perform grant_achievement(v_winner, 'first_win');
      end if;
      perform notify(v_ch.sender_id, 'challenge_completed', 'Challenge completed', 'See who won your ' || v_quiz_title || ' challenge.', '/challenge/' || v_ch.id);
      perform notify(v_ch.receiver_id, 'challenge_completed', 'Challenge completed', 'See who won your ' || v_quiz_title || ' challenge.', '/challenge/' || v_ch.id);
      if (select total_challenges from profiles where id = v_ch.sender_id) >= 5 then perform grant_achievement(v_ch.sender_id, 'challenger'); end if;
      if (select total_challenges from profiles where id = v_ch.receiver_id) >= 5 then perform grant_achievement(v_ch.receiver_id, 'challenger'); end if;
    end if;
  end if;

  return v_result;
end $$;

-- Leaderboard for a period ('all' | 'weekly' | 'monthly'), optionally filtered by country.
create or replace function public.get_leaderboard(p_period text default 'all', p_country text default null, p_limit int default 50, p_offset int default 0)
returns table (
  rank bigint, profile_id uuid, username text, display_name text, avatar_url text, country text,
  level int, xp bigint, score bigint, quizzes bigint, wins bigint
) language plpgsql stable security definer set search_path = public as $$
declare
  v_since timestamptz;
begin
  if p_period = 'all' then
    return query
      select row_number() over (order by p.xp desc, p.total_score desc, p.created_at asc),
        p.id, p.username, p.display_name, p.avatar_url, p.country, p.level,
        p.xp::bigint, p.total_score::bigint, p.total_quizzes::bigint, p.total_wins::bigint
      from profiles p
      where p.onboarding_completed and not p.is_banned
        and (p_country is null or lower(p.country) = lower(p_country))
      order by 1
      limit least(p_limit, 100) offset greatest(p_offset, 0);
  else
    v_since := case when p_period = 'weekly' then now() - interval '7 days' else now() - interval '30 days' end;
    return query
      with agg as (
        select r.user_id, sum(r.xp_earned + case when r.is_winner then 50 else 0 end)::bigint as xp,
          sum(r.score)::bigint as score, count(*)::bigint as quizzes, count(*) filter (where r.is_winner)::bigint as wins
        from quiz_results r where r.completed_at >= v_since group by r.user_id
      )
      select row_number() over (order by a.xp desc, a.score desc, p.created_at asc),
        p.id, p.username, p.display_name, p.avatar_url, p.country, p.level, a.xp, a.score, a.quizzes, a.wins
      from agg a join profiles p on p.id = a.user_id
      where p.onboarding_completed and not p.is_banned
        and (p_country is null or lower(p.country) = lower(p_country))
      order by 1
      limit least(p_limit, 100) offset greatest(p_offset, 0);
  end if;
end $$;

create or replace function public.admin_daily_activity(p_days int default 14)
returns table (day date, attempts bigint, new_users bigint)
language sql stable security definer set search_path = public as $$
  select d::date,
    (select count(*) from quiz_results r where r.completed_at::date = d::date),
    (select count(*) from profiles p where p.created_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') d
  order by 1;
$$;

-- ---------------------------------------------------------------- row level security
-- All writes happen through the server (service role) after Clerk verification.
-- Public (anon) reads are limited to non-sensitive catalog data and live room state for Realtime.
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.challenges enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_results enable row level security;
alter table public.notifications enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.reports enable row level security;

create policy "courses are public" on public.courses for select to anon, authenticated using (true);
create policy "published quizzes are public" on public.quizzes for select to anon, authenticated using (is_published);
create policy "achievements are public" on public.achievements for select to anon, authenticated using (true);
create policy "room state is readable for realtime" on public.rooms for select to anon, authenticated using (true);
create policy "room scores are readable for realtime" on public.room_participants for select to anon, authenticated using (true);

revoke all on public.questions, public.quiz_attempts, public.profiles, public.challenges, public.quiz_results,
  public.notifications, public.user_achievements, public.reports from anon, authenticated;
revoke insert, update, delete on public.courses, public.quizzes, public.rooms, public.room_participants, public.achievements from anon, authenticated;
revoke select on public.rooms from anon, authenticated;
grant select (id, room_code, room_name, description, course_id, quiz_id, creator_id, status, max_players,
  duration_seconds, settings, created_at, started_at, ended_at) on public.rooms to anon, authenticated;

revoke execute on all functions in schema public from anon, authenticated, public;

alter publication supabase_realtime add table public.rooms, public.room_participants;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
