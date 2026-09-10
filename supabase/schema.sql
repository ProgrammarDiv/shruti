-- Shruti — Supabase schema. Paste into the SQL editor and run once.
-- Mirrors lib/types.ts one-to-one; column names are snake_case.

create extension if not exists pgcrypto;

-- ===== Clinics & doctors =====
create table if not exists clinics (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code_prefix   text not null default 'SHR',
  patient_seq   int  not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  clinic_id     uuid not null references clinics(id),
  full_name     text not null,
  qualification text,
  reg_number    text,
  role          text not null default 'doctor' check (role in ('doctor','admin')),
  created_at    timestamptz not null default now()
);

-- The clinic of the signed-in user. Used by every RLS policy below.
create or replace function auth_clinic_id() returns uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from profiles where id = auth.uid()
$$;

-- ===== Patients =====
create table if not exists patients (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references clinics(id) default auth_clinic_id(),
  patient_code       text,
  full_name          text not null,
  age_years          int,
  gender             text check (gender in ('male','female','other')),
  phone              text,
  email              text,
  address            text,
  blood_group        text,
  abha_number        text,
  allergies          text[] not null default '{}',
  preferred_language text not null default 'hi',
  consent_given      boolean not null default false,
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  unique (clinic_id, patient_code)
);
create index if not exists patients_clinic_name on patients (clinic_id, full_name);
create index if not exists patients_phone on patients (phone);

-- SHR-2026-0149 style codes, one counter per clinic.
create or replace function assign_patient_code() returns trigger
language plpgsql as $$
declare
  seq int; prefix text;
begin
  if new.patient_code is null then
    update clinics set patient_seq = patient_seq + 1 where id = new.clinic_id
      returning patient_seq, code_prefix into seq, prefix;
    new.patient_code := format('%s-%s-%s', prefix, to_char(now(), 'YYYY'), lpad(seq::text, 4, '0'));
  end if;
  return new;
end $$;
drop trigger if exists patients_assign_code on patients;
create trigger patients_assign_code before insert on patients
  for each row execute function assign_patient_code();

-- ===== Consultations =====
create table if not exists consultations (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references clinics(id) default auth_clinic_id(),
  patient_id         uuid not null references patients(id),
  doctor_id          uuid not null references profiles(id) default auth.uid(),
  visit_type         text not null default 'new' check (visit_type in ('new','follow-up')),
  status             text not null default 'draft' check (status in ('draft','signed')),
  chief_complaint    text,
  language_used      text not null default 'hi',
  completeness_score int  not null default 0,
  transcript         text,
  summary            text,
  started_at         timestamptz not null default now(),
  signed_at          timestamptz,
  is_locked          boolean not null default false
);
create index if not exists consultations_patient on consultations (patient_id, started_at desc);
create index if not exists consultations_clinic_started on consultations (clinic_id, started_at desc);

create table if not exists case_sections (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  section_key     text not null,
  content         text not null default '',
  source          text not null default 'doctor' check (source in ('doctor','ai_draft','ai_accepted','ai_edited')),
  ai_confidence   numeric(3,2),
  source_quote    text,
  carried_from    uuid,
  updated_at      timestamptz not null default now(),
  unique (consultation_id, section_key)
);

create table if not exists vitals (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null unique references consultations(id) on delete cascade,
  bp_systolic     int,
  bp_diastolic    int,
  pulse_bpm       int,
  temperature_f   numeric(4,1),
  resp_rate       int,
  spo2_percent    int,
  height_cm       numeric(5,1),
  weight_kg       numeric(5,2),
  bmi             numeric(4,1) generated always as
                    (round(weight_kg / nullif(power(height_cm / 100, 2), 0), 1)) stored,
  recorded_at     timestamptz not null default now()
);

-- Every AI call, logged. Null accepted_at means it never entered the record.
create table if not exists ai_outputs (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) default auth_clinic_id(),
  consultation_id uuid references consultations(id) on delete set null,
  kind            text not null check (kind in ('structure','gaps','summary')),
  model           text,
  input_chars     int,
  output          jsonb,
  latency_ms      int,
  input_tokens    int,
  output_tokens   int,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);

-- ===== A signed note is immutable =====
create or replace function block_locked_consultation() returns trigger
language plpgsql as $$
begin
  if old.is_locked then
    raise exception 'This consultation has been signed and cannot be edited. Add an addendum instead.';
  end if;
  return new;
end $$;
drop trigger if exists consultations_no_edit_after_sign on consultations;
create trigger consultations_no_edit_after_sign before update on consultations
  for each row execute function block_locked_consultation();

create or replace function block_locked_child() returns trigger
language plpgsql as $$
declare locked boolean;
begin
  select is_locked into locked from consultations where id = coalesce(new.consultation_id, old.consultation_id);
  if locked then
    raise exception 'This consultation has been signed and cannot be edited.';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists case_sections_locked on case_sections;
create trigger case_sections_locked before insert or update or delete on case_sections
  for each row execute function block_locked_child();
drop trigger if exists vitals_locked on vitals;
create trigger vitals_locked before insert or update or delete on vitals
  for each row execute function block_locked_child();

-- ===== Row-level security: a clinic sees only its own rows =====
alter table clinics       enable row level security;
alter table profiles      enable row level security;
alter table patients      enable row level security;
alter table consultations enable row level security;
alter table case_sections enable row level security;
alter table vitals        enable row level security;
alter table ai_outputs    enable row level security;

drop policy if exists "own clinic" on clinics;
create policy "own clinic" on clinics for select using (id = auth_clinic_id());
drop policy if exists "clinic counter" on clinics;
create policy "clinic counter" on clinics for update using (id = auth_clinic_id());

drop policy if exists "same clinic" on profiles;
create policy "same clinic" on profiles for select using (clinic_id = auth_clinic_id() or id = auth.uid());

drop policy if exists "own clinic" on patients;
create policy "own clinic" on patients for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());

drop policy if exists "own clinic" on consultations;
create policy "own clinic" on consultations for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());

drop policy if exists "via consultation" on case_sections;
create policy "via consultation" on case_sections for all
  using (exists (select 1 from consultations c where c.id = consultation_id and c.clinic_id = auth_clinic_id()))
  with check (exists (select 1 from consultations c where c.id = consultation_id and c.clinic_id = auth_clinic_id()));

drop policy if exists "via consultation" on vitals;
create policy "via consultation" on vitals for all
  using (exists (select 1 from consultations c where c.id = consultation_id and c.clinic_id = auth_clinic_id()))
  with check (exists (select 1 from consultations c where c.id = consultation_id and c.clinic_id = auth_clinic_id()));

drop policy if exists "own clinic" on ai_outputs;
create policy "own clinic" on ai_outputs for all using (clinic_id = auth_clinic_id()) with check (clinic_id = auth_clinic_id());
