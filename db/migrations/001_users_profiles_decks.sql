-- Tài khoản, hồ sơ và bộ bài trên PostgreSQL thuần (thay auth.users + RLS của Supabase).
-- Quyền "mỗi người chỉ đọc/ghi dữ liệu của mình" nay do API của server kiểm (lọc theo owner_id lấy từ token).

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) between 3 and 254),
  -- scrypt: "scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>"
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  created_at timestamptz not null default now()
);

create table decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  -- danh sách mã lá (cho phép trùng), vd ["cg:basic","cg:gold"]
  cards text[] not null default '{}',
  -- bộ bài dùng mặc định khi vào trận
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index decks_owner_idx on decks (owner_id);
-- mỗi người chỉ có 1 bộ đang dùng
create unique index decks_one_active on decks (owner_id) where is_active;
