-- Hồ sơ người chơi + bộ bài đã lưu. Mỗi người chỉ đọc/ghi dữ liệu của mình (RLS).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  created_at timestamptz not null default now()
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  -- danh sách id lá bài (cho phép trùng), vd ["cau_lua","cau_lua","bay_gai"]
  cards text[] not null default '{}',
  -- bộ bài dùng mặc định khi vào trận
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index decks_owner_idx on public.decks (owner_id);
-- mỗi người chỉ có 1 bộ đang dùng
create unique index decks_one_active on public.decks (owner_id) where is_active;

alter table public.profiles enable row level security;
alter table public.decks enable row level security;

create policy "profiles: tự xem" on public.profiles for select using (auth.uid() = id);
create policy "profiles: tự sửa" on public.profiles for update using (auth.uid() = id);

create policy "decks: tự xem" on public.decks for select using (auth.uid() = owner_id);
create policy "decks: tự tạo" on public.decks for insert with check (auth.uid() = owner_id);
create policy "decks: tự sửa" on public.decks for update using (auth.uid() = owner_id);
create policy "decks: tự xoá" on public.decks for delete using (auth.uid() = owner_id);

-- Đăng ký xong tự tạo hồ sơ (tên lấy từ metadata display_name, không có thì lấy phần trước @ của email)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)), 24));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
