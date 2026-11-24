-- ADRAB backend foundation. Raw post-operative observations only.
-- No rubric scores, grades, aggregates, predictions, or model outputs are stored here.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'clinician' check (role in ('administrator','surgeon','radiologist','clinician','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  display_label text not null,
  procedure text,
  surgical_stage text,
  surgery_date date,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  notes text,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_members (
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'read' check (permission in ('read','write')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create or replace function public.has_case_access(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.case_members m
    where m.case_id = p_case_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_write_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.case_members m
    where m.case_id = p_case_id
      and m.user_id = auth.uid()
      and m.permission = 'write'
  );
$$;

create table if not exists public.case_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  object_path text not null unique,
  original_filename text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text,
  modality text,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.postop_observations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  rubric_version_reference text,
  criterion_key text not null,
  criterion_label text not null,
  evidence_type text not null check (evidence_type in ('clinical','radiological','patient_reported')),
  observation_state text not null check (observation_state in ('recorded','not_assessed','not_applicable','uncertain','conflicting')),
  finding text,
  observed_value numeric,
  observed_unit text,
  method text,
  case_file_id uuid references public.case_files(id) on delete set null,
  modality text,
  view_or_plane text,
  slice_thickness_mm numeric,
  quality_limitation text,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  source_observation_id uuid references public.postop_observations(id) on delete set null,
  event_type text not null,
  description text not null,
  event_status text not null default 'open' check (event_status in ('open','acknowledged','closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  closed_by uuid references auth.users(id),
  closed_at timestamptz
);

create table if not exists public.copilot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.copilot_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  source_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  citation text,
  source_url text,
  document_type text not null check (document_type in ('book_chapter','research_paper','guideline','protocol','other')),
  access_status text not null default 'metadata_only'
    check (access_status in ('full_text_verified','abstract_only','metadata_only','not_available')),
  is_approved_for_ai_context boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.has_conversation_access(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.copilot_conversations c
    where c.id = p_conversation_id
      and (c.user_id = auth.uid() or (c.case_id is not null and public.has_case_access(c.case_id)))
  );
$$;

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_members enable row level security;
alter table public.case_files enable row level security;
alter table public.postop_observations enable row level security;
alter table public.safety_events enable row level security;
alter table public.copilot_conversations enable row level security;
alter table public.copilot_messages enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.audit_events enable row level security;

create policy "profile read own" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profile update own display fields" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "case access" on public.cases
  for select to authenticated using (public.has_case_access(id));
create policy "case create owned" on public.cases
  for insert to authenticated with check (owner_id = auth.uid());
create policy "case update writable" on public.cases
  for update to authenticated using (public.can_write_case(id)) with check (public.can_write_case(id));
create policy "case owner delete" on public.cases
  for delete to authenticated using (owner_id = auth.uid());

create policy "case member list" on public.case_members
  for select to authenticated using (public.has_case_access(case_id));

create policy "case file access" on public.case_files
  for select to authenticated using (public.has_case_access(case_id));
create policy "case file metadata insert" on public.case_files
  for insert to authenticated with check (public.can_write_case(case_id) and uploaded_by = auth.uid());

create policy "observation read" on public.postop_observations
  for select to authenticated using (public.has_case_access(case_id));
create policy "observation insert" on public.postop_observations
  for insert to authenticated with check (public.can_write_case(case_id) and recorded_by = auth.uid());
create policy "observation update" on public.postop_observations
  for update to authenticated using (public.can_write_case(case_id)) with check (public.can_write_case(case_id));

create policy "safety event read" on public.safety_events
  for select to authenticated using (public.has_case_access(case_id));
create policy "safety event insert" on public.safety_events
  for insert to authenticated with check (public.can_write_case(case_id) and created_by = auth.uid());
create policy "safety event update" on public.safety_events
  for update to authenticated using (public.can_write_case(case_id)) with check (public.can_write_case(case_id));

create policy "conversation owner or case member" on public.copilot_conversations
  for all to authenticated
  using (user_id = auth.uid() or (case_id is not null and public.has_case_access(case_id)))
  with check (user_id = auth.uid() or (case_id is not null and public.has_case_access(case_id)));

create policy "message access" on public.copilot_messages
  for all to authenticated
  using (public.has_conversation_access(conversation_id))
  with check (public.has_conversation_access(conversation_id));

create policy "published knowledge read" on public.knowledge_documents
  for select to authenticated using (true);

create policy "audit read" on public.audit_events
  for select to authenticated using (actor_id = auth.uid() or (case_id is not null and public.has_case_access(case_id)));
create policy "audit append" on public.audit_events
  for insert to authenticated with check (actor_id = auth.uid());

-- Private bucket. Object names must begin with the case UUID: <case-uuid>/<opaque-file-id>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('case-files', 'case-files', false, 1073741824)
on conflict (id) do update set public = false;

create policy "private case file read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'case-files'
    and public.has_case_access(((storage.foldername(name))[1])::uuid)
  );

create policy "private case file insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-files'
    and public.can_write_case(((storage.foldername(name))[1])::uuid)
  );


-- Hardening pass: prevent self-assigned privileged roles and restrict conversation ownership.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), 'clinician')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Membership is granted through an owner-checked RPC, never by direct table writes.
create or replace function public.grant_case_access(
  p_case_id uuid,
  p_user_id uuid,
  p_permission text default 'read'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_permission not in ('read', 'write') then
    raise exception 'Invalid permission';
  end if;
  if not exists (
    select 1 from public.cases
    where id = p_case_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the case owner can grant access';
  end if;

  insert into public.case_members (case_id, user_id, permission, invited_by)
  values (p_case_id, p_user_id, p_permission, auth.uid())
  on conflict (case_id, user_id)
  do update set permission = excluded.permission, invited_by = excluded.invited_by;
end;
$$;

revoke all on function public.grant_case_access(uuid, uuid, text) from public;
grant execute on function public.grant_case_access(uuid, uuid, text) to authenticated;

-- A file metadata row must point to an object in its own case folder.
alter table public.case_files
  add constraint case_files_object_path_matches_case
  check (split_part(object_path, '/', 1) = case_id::text) not valid;
alter table public.case_files
  validate constraint case_files_object_path_matches_case;

-- Conversation ownership is always the authenticated user, even for case-scoped threads.
drop policy if exists "conversation owner or case member" on public.copilot_conversations;
create policy "conversation owner and case access" on public.copilot_conversations
  for all to authenticated
  using (user_id = auth.uid() and (case_id is null or public.has_case_access(case_id)))
  with check (user_id = auth.uid() and (case_id is null or public.has_case_access(case_id)));

create or replace function public.has_conversation_access(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.copilot_conversations c
    where c.id = p_conversation_id
      and c.user_id = auth.uid()
      and (c.case_id is null or public.has_case_access(c.case_id))
  );
$$;

revoke all on function public.has_case_access(uuid) from public;
revoke all on function public.can_write_case(uuid) from public;
revoke all on function public.has_conversation_access(uuid) from public;
grant execute on function public.has_case_access(uuid) to authenticated;
grant execute on function public.can_write_case(uuid) to authenticated;
grant execute on function public.has_conversation_access(uuid) to authenticated;

-- Audit records are append-only. Application users cannot manufacture, edit, or delete them.
drop policy if exists "audit append" on public.audit_events;


-- Private file deletion is restricted to case writers.
create policy "case file metadata delete" on public.case_files
  for delete to authenticated using (public.can_write_case(case_id));

create policy "private case file delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-files'
    and public.can_write_case(((storage.foldername(name))[1])::uuid)
  );

-- Append-only audit events are written by this trigger, not directly by the browser.
create or replace function public.write_case_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_case_id uuid;
  v_resource_id text;
  v_actor uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_actor := auth.uid();

  if tg_table_name = 'cases' then
    v_case_id := (v_row->>'id')::uuid;
    v_resource_id := v_row->>'id';
    if v_actor is null then v_actor := nullif(v_row->>'owner_id','')::uuid; end if;
  else
    v_case_id := nullif(v_row->>'case_id','')::uuid;
    v_resource_id := v_row->>'id';
    if v_actor is null then
      v_actor := coalesce(
        nullif(v_row->>'recorded_by','')::uuid,
        nullif(v_row->>'created_by','')::uuid,
        nullif(v_row->>'uploaded_by','')::uuid,
        nullif(v_row->>'user_id','')::uuid
      );
    end if;
  end if;

  if v_actor is not null then
    insert into public.audit_events (
      case_id, actor_id, action, resource_type, resource_id, metadata
    ) values (
      case when tg_table_name = 'cases' and tg_op = 'DELETE' then null else v_case_id end,
      v_actor,
      lower(tg_op),
      tg_table_name,
      v_resource_id,
      jsonb_build_object('recorded_at', now())
    );
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_cases
  after insert or update or delete on public.cases
  for each row execute procedure public.write_case_audit_event();
create trigger audit_case_files
  after insert or update or delete on public.case_files
  for each row execute procedure public.write_case_audit_event();
create trigger audit_postop_observations
  after insert or update or delete on public.postop_observations
  for each row execute procedure public.write_case_audit_event();
create trigger audit_safety_events
  after insert or update or delete on public.safety_events
  for each row execute procedure public.write_case_audit_event();
create trigger audit_copilot_conversations
  after insert or update or delete on public.copilot_conversations
  for each row execute procedure public.write_case_audit_event();
