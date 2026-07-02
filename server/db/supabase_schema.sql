-- ============================================================
-- BandLogic Content Library — Supabase (Postgres) schema
-- Content plane only. User auth/sessions stay in Firebase.
-- Run in Supabase SQL Editor or via `supabase db push`.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. LIBRARY / DECKS
-- A deck = one source collection ("Makkar May-Aug 2023",
-- "2020 Speaking Actual Tests", "80 Listening Tests").
-- ------------------------------------------------------------
create table if not exists decks (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,              -- 'makkar-may-aug-2023'
  title         text not null,
  description   text,
  module        text not null check (module in ('speaking','listening','reading','writing')),
  source        text,                              -- book/PDF provenance
  cover_url     text,
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. SPEAKING: CUE CARDS (Part 2) + FOLLOW-UPS (Part 3)
-- ------------------------------------------------------------
create table if not exists cue_cards (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references decks(id) on delete cascade,
  card_number    int,                              -- original numbering in the book
  title          text not null,                    -- 'Describe a long car journey...'
  prompts        jsonb not null default '[]'::jsonb, -- ["Where you went", "What you did", ...]
  sample_answer  text,                             -- model answer (newline-joined bullets)
  topics         text[] not null default '{}',     -- ['travel','family'] for filtering
  needs_review   boolean not null default false,   -- flagged by the parser
  search         tsvector generated always as
                   (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(sample_answer,''))) stored,
  created_at     timestamptz not null default now(),
  unique (deck_id, card_number)
);

create table if not exists followup_questions (
  id             uuid primary key default gen_random_uuid(),
  cue_card_id    uuid not null references cue_cards(id) on delete cascade,
  position       int not null,
  question       text not null,
  sample_answer  text,
  unique (cue_card_id, position)
);

-- ------------------------------------------------------------
-- 3. LISTENING: TESTS -> SECTIONS -> QUESTIONS
-- audio_url exists at both test and section level; use whichever
-- granularity your audio files have (section-level is typical).
-- ------------------------------------------------------------
create table if not exists listening_tests (
  id               uuid primary key default gen_random_uuid(),
  deck_id          uuid not null references decks(id) on delete cascade,
  test_number      int not null,                   -- 1..80
  title            text not null,
  audio_url        text,                           -- full-test audio (optional)
  duration_seconds int,
  difficulty       text check (difficulty in ('easy','medium','hard')),
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (deck_id, test_number)
);

create table if not exists listening_sections (
  id              uuid primary key default gen_random_uuid(),
  test_id         uuid not null references listening_tests(id) on delete cascade,
  section_number  int not null check (section_number between 1 and 4),
  audio_url       text,                            -- per-section audio file
  transcript      text,
  instructions    text,                            -- 'Questions 1-10. Complete the notes...'
  unique (test_id, section_number)
);

create table if not exists listening_questions (
  id               uuid primary key default gen_random_uuid(),
  section_id       uuid not null references listening_sections(id) on delete cascade,
  question_number  int not null,                   -- 1..40 (global within test)
  question_type    text not null check (question_type in
                     ('gap_fill','mcq','multi_select','matching','map_labelling',
                      'short_answer','table_completion','sentence_completion')),
  prompt           text not null,
  options          jsonb,                          -- MCQ/matching: ["A ...","B ..."] or {"A":"..."}
  answer           jsonb not null,                 -- ["harbour","harbor"] = accepted variants
  explanation      text,
  unique (section_id, question_number)
);

-- ------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------
create index if not exists idx_cue_cards_deck        on cue_cards(deck_id);
create index if not exists idx_cue_cards_search      on cue_cards using gin(search);
create index if not exists idx_cue_cards_topics      on cue_cards using gin(topics);
create index if not exists idx_followups_card        on followup_questions(cue_card_id);
create index if not exists idx_ltests_deck           on listening_tests(deck_id);
create index if not exists idx_lsections_test        on listening_sections(test_id);
create index if not exists idx_lquestions_section    on listening_questions(section_id);

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Content is read-only for the app; ONLY the service-role key
-- (server / seed scripts) can write. Two read models supported:
--   A) All reads go through your Express server with the service
--      key -> you can leave the anon policies out entirely.
--   B) Client reads Supabase directly using Firebase as a
--      third-party auth provider -> keep the policies below.
-- ------------------------------------------------------------
alter table decks               enable row level security;
alter table cue_cards           enable row level security;
alter table followup_questions  enable row level security;
alter table listening_tests     enable row level security;
alter table listening_sections  enable row level security;
alter table listening_questions enable row level security;

-- Read published content (works for anon or authenticated JWTs).
create policy "read published decks"     on decks     for select using (is_published);
create policy "read cue cards"           on cue_cards for select
  using (exists (select 1 from decks d where d.id = deck_id and d.is_published));
create policy "read followups"           on followup_questions for select
  using (exists (select 1 from cue_cards c join decks d on d.id = c.deck_id
                 where c.id = cue_card_id and d.is_published));
create policy "read published tests"     on listening_tests for select using (is_published);
create policy "read sections"            on listening_sections for select
  using (exists (select 1 from listening_tests t where t.id = test_id and t.is_published));
create policy "read questions"           on listening_questions for select
  using (exists (select 1 from listening_sections s join listening_tests t on t.id = s.test_id
                 where s.id = section_id and t.is_published));
-- No insert/update/delete policies: service-role key bypasses RLS.
