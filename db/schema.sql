-- Phase 2 admin feature schema (Neon/Postgres). Applied by db/migrate.js.
-- Draft approved in planning; segments/prompt shapes mirror the existing
-- hardcoded CHALLENGE_LEVELS (App.jsx) and klongPrompts.js so migrating
-- their data over is a straight copy, not a redesign.

create table if not exists admin_accounts (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_settings (
  id integer primary key default 1,
  ai_enabled boolean not null default true,
  ai_autofill_enabled boolean not null default true,
  prompt_template text,
  updated_at timestamptz not null default now(),
  constraint ai_settings_singleton check (id = 1)
);

create table if not exists validator_settings (
  id integer primary key default 1,
  allow_tone_penalty boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint validator_settings_singleton check (id = 1)
);

-- Migration: an earlier apply of this script (Phase 2 Step 1) used the
-- misnamed column ek_toe_toe_toe_enabled — doesn't read as เอกโทษ/โทโทษ at
-- all (flagged in Step 5's commit). Renamed here rather than a separate
-- migration file, since this script is the only migration mechanism this
-- project has; safe to re-run on any DB state (fresh installs never had
-- the old name, so the IF EXISTS is always false for them).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'validator_settings' and column_name = 'ek_toe_toe_toe_enabled'
  ) then
    alter table validator_settings rename column ek_toe_toe_toe_enabled to allow_tone_penalty;
  end if;
end $$;

create table if not exists challenges (
  id serial primary key,
  title text not null,
  description text,
  segments jsonb not null,
  badge text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prompt_categories (
  id serial primary key,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists prompts (
  id serial primary key,
  category_id integer not null references prompt_categories(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists algorithm_docs_comments (
  id serial primary key,
  admin_id integer not null references admin_accounts(id) on delete cascade,
  body text not null,
  linked_irregular_syllable text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ai_settings / validator_settings are singleton config rows (id always 1).
insert into ai_settings (id) values (1) on conflict (id) do nothing;
insert into validator_settings (id) values (1) on conflict (id) do nothing;
