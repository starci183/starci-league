-- Xếp hạng: điểm Elo, số thắng và số thua trên hồ sơ. Điểm khởi đầu 1000; chỉ trận xếp hạng giữa hai người đăng nhập mới đổi điểm.

alter table profiles
  add column rating integer not null default 1000,
  add column wins integer not null default 0,
  add column losses integer not null default 0;

create index profiles_rating_idx on profiles (rating desc);
