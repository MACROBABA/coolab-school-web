-- Coolab portalı üçün ilkin verilənlər bazası modeli.
-- Bu faylı Supabase layihəsi yaradıldıqdan sonra migration kimi işlədəcəyik.

create type public.app_role as enum ('parent', 'student', 'mentor', 'admin');
create type public.application_status as enum ('submitted', 'under_review', 'approved', 'rejected');
create type public.enrollment_status as enum ('pending', 'approved', 'active', 'suspended', 'completed');
create type public.payment_status as enum ('pending', 'paid', 'overdue', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  account_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_role public.app_role not null check (requested_role <> 'admin'),
  status public.application_status not null default 'submitted',
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  birth_year smallint,
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.parent_students (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  mentor_id uuid references public.profiles(id),
  schedule_note text,
  capacity smallint,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  status public.enrollment_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (student_id, group_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  meeting_url text,
  material_path text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.game_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_key text not null,
  score integer not null default 0 check (score >= 0),
  badges text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (student_id, game_key)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- RLS aktivdir. Ətraflı siyasətlər rol və qrup endpointləri əlavə ediləndə yazılacaq.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_applications enable row level security;
alter table public.students enable row level security;
alter table public.parent_students enable row level security;
alter table public.courses enable row level security;
alter table public.groups enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.game_progress enable row level security;
alter table public.audit_logs enable row level security;
