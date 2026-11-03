# Brief cho Codex: đồng bộ lá bài trong các mockup trận với lá bài đã duyệt

Repo: `D:/Repositories/starci-league`. Thầy nhận xét ngày 2026-11-04: lá bài trong mockup trận (`docs/mockups/match/`)
xấu hơn lá ở sảnh / màn xếp bộ, phải **đồng bộ một kiểu lá bài** cho toàn game.

## Chuẩn lá bài (đã duyệt)

Lấy đúng như `docs/mockups/cocos/card-anatomy.png` và lá trong `docs/mockups/cocos/builder.png`:
lá đứng 5:7, khung vàng kim vát góc theo nhóm, ngọc ở đỉnh và đáy, ô tranh ~55% phía trên, dải tên in hoa đè mép dưới
tranh, dòng loại, mô tả ngắn 1–2 dòng, huy hiệu ở góc dưới-phải. Bốn kiểu khung nhóm của lá trong bộ giữ nguyên:
Đánh thường vàng đồng, Bổ trợ xanh ngọc, Vàng vàng ròng, Đồ thép xanh lam.

Thêm kiểu khung thứ năm cho **lá chiêu của tướng** (Q / E / R vào tay khi tướng ra sân), cùng họ khung:
viền vàng kim với dải xanh lam đậm, **huy hiệu mana tròn ở góc trên-trái** (ví dụ "20"), nhãn chiêu Q / E / R ở góc
trên-phải, dòng loại ghi "Chiêu · <tên tướng>". Lá Đánh thường / Vàng có mana 0 thì không cần huy hiệu mana.

Tranh trong lá:
- Lá trong bộ (Đánh thường, Rút Bài, phép bổ trợ, Vàng, mảnh Đồ): dùng đúng tranh đã duyệt ở
  `cocos/assets/resources/art/cards/<mã>.png`.
- Lá chiêu của tướng: ô tranh là **ô vuông giữ chỗ để trống** (thầy tự thêm ảnh sau), giữ nguyên khung lá đẹp xung quanh.

Trạng thái lá trên tay: thường; nâng lên + viền ngọc khi dùng được (Quick play, có thể đánh); hạ xuống + mờ khi không dùng
được; lá đang kéo to hơn, có bóng. Lá trong cột chuỗi kỹ năng là lá thu nhỏ cùng kiểu khung (không dùng ô vuông trơn).

## Việc

Sửa **chỉ phần lá bài** trong sáu mockup, giữ nguyên mọi phần khác (bố cục, hộp thoại, bàn, chữ, ô tướng vuông để trống):

- `weapon-pick.png`, `form-switch.png`, `craft.png`, `steal.png`: tay bài ở đáy màn đổi thành lá chuẩn.
- `chain.png`: tay bài (2 lá Quick play nâng lên sáng ngọc, các lá khác hạ xuống) và 3 mắt xích trong cột chuỗi dùng lá
  thu nhỏ chuẩn.
- `targeting.png`: lá đang kéo "E · Tên Băng" là lá chiêu chuẩn cỡ lớn; tay bài còn lại là lá chuẩn.

Ghi đè đúng tên file cũ, giữ 1920×1080. Trước khi sửa, chép bản cũ sang `docs/mockups/match/rejected/<tên>-old-cards.png`.

## Giới hạn

- Nhân vật và tranh là của StarCi; không vẽ hay gợi tướng, tranh, icon của game có thật nào.
- Không sửa code, không commit, không hỏi lại. Tự xem lại từng ảnh ở kích thước thật: lá giống hệt lá đã duyệt, chữ đúng
  dấu, ô tướng vẫn vuông và trống.
