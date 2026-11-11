create table public.people (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

create policy "People can read their own profile"
  on public.people for select
  to authenticated
  using (id = (select auth.uid()));

create policy "People can update their own profile"
  on public.people for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.people (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  created_on date not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, owner_id)
);

create function public.set_habit_created_on()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_timezone text;
begin
  select timezone into owner_timezone
  from public.people
  where id = new.owner_id;
  if owner_timezone is null then
    raise exception 'Habit owner profile was not found.';
  end if;
  new.created_on := (now() at time zone owner_timezone)::date;
  return new;
end;
$$;

create trigger set_habit_creation_date
  before insert on public.habits
  for each row execute function public.set_habit_created_on();

create function public.enforce_active_habit_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (old.archived_at is null or new.archived_at is not null) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(new.owner_id::text));
  if (
    select count(*)
    from public.habits
    where owner_id = new.owner_id
      and archived_at is null
      and (tg_op = 'INSERT' or id <> new.id)
  ) >= 5 then
    raise exception 'A person can have at most five active habits.';
  end if;
  return new;
end;
$$;

create trigger enforce_active_habit_limit_on_insert
  before insert on public.habits
  for each row execute function public.enforce_active_habit_limit();

create trigger enforce_active_habit_limit_on_unarchive
  before update of archived_at on public.habits
  for each row execute function public.enforce_active_habit_limit();

create function public.is_valid_weekdays(days smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(days) between 1 and 7
    and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(days) = (
      select count(distinct day_value)::integer
      from unnest(days) as weekday_values(day_value)
    );
$$;

create table public.habit_week_settings (
  habit_id uuid not null,
  owner_id uuid not null,
  week_start date not null,
  name text not null check (length(trim(name)) between 1 and 80),
  color text not null check (length(trim(color)) > 0),
  habit_type text not null check (habit_type in ('yes_no', 'amount', 'rating')),
  amount_target numeric,
  unit text,
  frequency_style text not null check (frequency_style in ('specific_days', 'weekly_count')),
  days_of_week smallint[] not null default '{}',
  weekly_goal smallint,
  created_at timestamptz not null default now(),
  primary key (habit_id, week_start),
  foreign key (habit_id, owner_id)
    references public.habits (id, owner_id) on delete cascade,
  check (extract(isodow from week_start) = 1),
  check (
    (habit_type = 'amount'
      and amount_target is not null
      and amount_target > 0
      and unit is not null
      and length(trim(unit)) > 0)
    or (habit_type in ('yes_no', 'rating') and amount_target is null and unit is null)
  ),
  check (
    (frequency_style = 'specific_days'
      and public.is_valid_weekdays(days_of_week)
      and weekly_goal is null)
    or (frequency_style = 'weekly_count'
      and cardinality(days_of_week) = 0
      and weekly_goal is not null
      and weekly_goal between 1 and 7)
  )
);

create function public.guard_habit_week_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  settings_owner uuid;
  owner_timezone text;
  current_week_start date;
  effective_week_start date;
begin
  if tg_op = 'DELETE' then
    settings_owner := old.owner_id;
    effective_week_start := old.week_start;
  else
    settings_owner := new.owner_id;
    effective_week_start := new.week_start;
  end if;

  if extract(isodow from effective_week_start) <> 1 then
    raise exception 'Week settings must start on a Monday.';
  end if;

  select timezone into owner_timezone
  from public.people
  where id = settings_owner;
  if owner_timezone is null then
    raise exception 'Habit owner profile was not found.';
  end if;
  current_week_start :=
    (now() at time zone owner_timezone)::date
    - (extract(isodow from now() at time zone owner_timezone)::integer - 1);

  if tg_op = 'INSERT' and effective_week_start < current_week_start then
    raise exception 'Past weeks cannot receive new habit settings.';
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.week_start <= current_week_start then
    raise exception 'Habit targets and frequency are locked once the week starts.';
  end if;
  if tg_op = 'UPDATE' and (
    new.habit_id <> old.habit_id
    or new.owner_id <> old.owner_id
    or new.week_start <> old.week_start
  ) then
    raise exception 'A weekly settings row cannot be moved.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger guard_habit_week_settings
  before insert or update or delete on public.habit_week_settings
  for each row execute function public.guard_habit_week_settings();

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  owner_id uuid not null,
  log_date date not null,
  completed boolean,
  amount numeric,
  rating smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date),
  foreign key (habit_id, owner_id)
    references public.habits (id, owner_id) on delete cascade,
  check (
    (completed is not null and amount is null and rating is null)
    or (completed is null and amount is not null and rating is null)
    or (completed is null and amount is null and rating is not null)
  ),
  check (amount is null or amount >= 0),
  check (rating is null or rating between 1 and 5)
);

create function public.guard_daily_log()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_timezone text;
  owner_today date;
  v_week_start date;
  habit_created_on date;
  settings public.habit_week_settings%rowtype;
begin
  select timezone into owner_timezone
  from public.people
  where id = new.owner_id;
  if owner_timezone is null then
    raise exception 'Habit owner profile was not found.';
  end if;

  owner_today := (now() at time zone owner_timezone)::date;
  v_week_start := new.log_date - (extract(isodow from new.log_date)::integer - 1);
  if new.log_date > owner_today then
    raise exception 'Future days cannot be logged.';
  end if;
  if owner_today > v_week_start + 7 then
    raise exception 'The grace window for this week has closed.';
  end if;

  select created_on into habit_created_on
  from public.habits
  where id = new.habit_id and owner_id = new.owner_id;
  if habit_created_on is null or new.log_date < habit_created_on then
    raise exception 'A habit cannot be logged before it was created.';
  end if;

  select * into settings
  from public.habit_week_settings
  where habit_id = new.habit_id and habit_week_settings.week_start = v_week_start;
  if not found then
    raise exception 'Weekly settings are missing for this habit.';
  end if;

  if settings.frequency_style = 'specific_days'
    and not (extract(isodow from new.log_date)::smallint = any(settings.days_of_week)) then
    raise exception 'This habit is not scheduled for that weekday.';
  end if;
  if (settings.habit_type = 'yes_no' and new.completed is null)
    or (settings.habit_type = 'amount' and (new.amount is null or new.amount < 0))
    or (settings.habit_type = 'rating' and (new.rating is null or new.rating not between 1 and 5)) then
    raise exception 'The daily log value does not match the habit type.';
  end if;
  if (settings.habit_type <> 'yes_no' and new.completed is not null)
    or (settings.habit_type <> 'amount' and new.amount is not null)
    or (settings.habit_type <> 'rating' and new.rating is not null) then
    raise exception 'The daily log contains a value for the wrong habit type.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_daily_log
  before insert or update on public.daily_logs
  for each row execute function public.guard_daily_log();

alter table public.habits enable row level security;
alter table public.habit_week_settings enable row level security;
alter table public.daily_logs enable row level security;

create policy "People can manage their own habits"
  on public.habits for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "People can manage their own weekly settings"
  on public.habit_week_settings for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "People can manage their own daily logs"
  on public.daily_logs for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create index habit_week_settings_owner_week_idx
  on public.habit_week_settings (owner_id, week_start);
create index daily_logs_owner_date_idx
  on public.daily_logs (owner_id, log_date);
