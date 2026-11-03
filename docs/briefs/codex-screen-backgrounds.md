# Brief cho Codex: thiết kế UX/UI từng màn ngoài trận (client Cocos)

Repo: `D:/Repositories/starci-league`. Client Cocos ở `cocos/` (Creator 3.8.8). Thầy yêu cầu ngày 2026-11-03:
**vẽ UX/UI từng trang cho chuẩn, sáng tạo hết mức**. Bản đồ 10 ô (`map-v2/board.jpg`) **chỉ là nền sân đấu**, không
dùng ngoài trận. Mọi màn ngoài trận dùng **chung một tranh nền** riêng (nền menu), còn bố cục UX/UI thì thiết kế riêng,
kỹ cho từng màn.

## DNA phải theo (đã chốt, xem `docs/UI_DNA.md`)

Nền xanh than gần đen (`#010a13`, `#0a1428`), khung vàng kim cổ mảnh vát góc (`#c8aa6e`, `#785a28`, `#f0e6d2`),
xanh ngọc phát sáng (`#0ac8b9`) cho chọn / hover / focus / nút chính, tiêu đề serif in hoa có dấu tiếng Việt.
Chất tranh vẽ fantasy MOBA, ánh sáng điện ảnh.

## Giới hạn

- Thiết kế riêng của StarCi. Không chép, không vẽ sát tranh, địa danh, nhân vật, logo hay giao diện của Riot / League of
  Legends hay game có thật nào. Nhân vật (nếu có) là nhân vật tự tạo.
- Không sửa code. Không commit. Chạy không tương tác, không hỏi lại; chỗ mơ hồ chọn phương án an toàn và ghi lại.
- Chữ trong mockup phải đúng tiếng Việt có dấu. Tranh nền sạch và bộ khung thì **không có chữ**.

## Dữ liệu thật của từng màn (mockup phải đủ các phần này, đúng chữ)

1. **Đăng nhập / Đăng ký**: tên game STARCI LEAGUE, dòng phụ "Game bài chiến thuật 1v1, 5 đường"; hai tab ĐĂNG NHẬP /
   ĐĂNG KÝ; ô Tên hiển thị (chỉ khi đăng ký), Email, Mật khẩu; dòng báo lỗi; nút chính ĐĂNG NHẬP / TẠO TÀI KHOẢN.
2. **Danh sách bộ bài**: thanh trên (tên game, tiêu đề BỘ BÀI, tên người chơi, nút ĐĂNG XUẤT); các bộ bài của người chơi
   (tên bộ, số lá "80 lá", nhãn ĐANG DÙNG cho đúng một bộ, nút SỬA / DÙNG / XOÁ); ô "+ BỘ MỚI"; phân trang khi nhiều bộ.
3. **Xếp bộ bài**: ô tên bộ; bộ đếm "80 / 80"; tổng theo nhóm (Đánh thường, Bổ trợ, Vàng, Đồ); KHO LÁ 19 lá (Đánh thường,
   Rút Bài, 8 phép: Hồi Máu, Tốc Biến, Thiêu Đốt, Kiệt Sức, Lá Chắn, Thanh Tẩy, Trừng Phạt, Dịch Chuyển; Vàng; 8 mảnh Đồ:
   Kiếm Dài, Gậy Quá Khổ, Cung Gỗ, Găng Đấu Tập, Giáp Lưới, Áo Choàng Bạc, Đai Khổng Lồ, Nước Mắt Nữ Thần), mỗi lá có số
   đang có / tối đa; BỘ ĐANG XẾP liệt kê lá và số bản; nút QUAY LẠI, BỘ MẶC ĐỊNH, LƯU, DÙNG.

Bố cục mỗi màn do Codex thiết kế lại cho đẹp và dễ dùng (không bắt buộc giữ bố cục đang có của bản Cocos), miễn đủ
các phần trên, chạy ở sân khấu 1920×1080. Cả ba màn đặt trên **cùng một nền menu**; sự khác nhau nằm ở bố cục, panel,
lá bài, điểm nhấn ánh sáng của từng màn.

Nền menu chung: một bối cảnh fantasy riêng của StarCi (ví dụ: sảnh đá cổ của một học viện triệu hồi về đêm, cửa vòm
lớn nhìn ra trời sao, rune xanh ngọc, đèn vàng kim), không phải sân đấu. Giữa màn tối, ít chi tiết để panel nổi lên;
chi tiết dồn ra hai mép và phía xa; không chữ, không khung UI.

## Lá bài: chuẩn game thẻ bài (thầy nhấn mạnh)

Kho lá và bộ đang xếp phải là **lá bài thật**, không phải ô chữ sơ sài.

- Lá đứng tỉ lệ 5:7. Cấu tạo: khung vàng kim vát góc; ô tranh lớn chiếm ~60% trên; dải tên serif in hoa; dòng loại
  (Đánh thường / Bổ trợ / Vàng / Đồ); ô mô tả ngắn; huy hiệu số bản "n/max" ở góc dưới.
- Mỗi nhóm một kiểu khung nhận ra ngay: Đánh thường viền vàng đồng, Bổ trợ viền xanh ngọc có rune, Vàng viền vàng ròng
  có hoa văn đồng xu, Đồ viền xanh lam thép có đinh tán.
- Trạng thái: thường; hover (nhấc lên, ánh xanh ngọc); đã đủ max (dải "ĐỦ" mờ, vẫn đọc được); có trong bộ (huy hiệu số
  sáng); không thêm được (mờ). Kéo thả / bấm để thêm là việc của code, mockup chỉ cần thể hiện trạng thái.
- Kho có thanh lọc theo nhóm (TẤT CẢ / ĐÁNH THƯỜNG / BỔ TRỢ / VÀNG / ĐỒ) và lưới lá đẹp, có khoảng thở.
- Bộ đang xếp là danh sách lá thu nhỏ (dải ngang có tranh nhỏ, tên, ×n), xếp theo nhóm, có đường cong phân bố nhóm.
- Tranh trong lá lấy từ tranh có sẵn của dự án: `packages/client/public/card_support/<id>.png` (basic, draw, gold),
  `card_support/spell_<phép>.png`, `card_items/<mảnh>.png` (512×512).
- Bàn giao thêm: `docs/mockups/cocos/card-anatomy.png` (một lá phóng to có chú thích từng phần + 4 kiểu khung nhóm +
  các trạng thái), và khung lá 9-slice `cocos/assets/resources/ui/card-<nhóm>.png` (4 file) ghi vào `slices.json`.

## Cách làm (thầy chốt 2026-11-03)

Codex **imagegen khung UX/UI nguyên trang trước**. Claude sau đó tự bóc mockup thành trang game: cắt nền, khung, lá,
rồi dựng UI bằng code trong Cocos. Vì vậy Codex **không** cần làm bộ asset 9-slice riêng; chỉ cần mockup nguyên trang
thật chuẩn, nét, đúng chữ, chi tiết khung rõ để bóc được.

## Bàn giao, theo thứ tự

1. Mockup nguyên trang 1920×1080 PNG ở `docs/mockups/cocos/`: `auth.png`, `decks.png`, `builder.png`. Ba trang dùng
   chung một nền menu; mỗi trang bố cục UX/UI riêng; lá bài trong `builder.png` và hộp bài trong `decks.png` theo mục
   "Lá bài" ở trên.
2. `docs/mockups/cocos/card-anatomy.png`: một lá phóng to có chú thích, 4 kiểu khung nhóm, các trạng thái.
3. Tranh nền menu sạch (không UI, không chữ) đúng như nền trong mockup: `cocos/assets/resources/bg/menu.jpg`,
   1920×1080 JPG chất lượng 90.
4. Báo cáo ngắn: danh sách file, mỗi ảnh tạo bằng cách nào, đã xem lại ở kích thước thật.
