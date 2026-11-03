# Brief cho Codex: DNA giao diện MOBA và bản đồ mới

Repo: `D:/Repositories/starci-league` (React + Vite + PixiJS, client ở `packages/client`).
Thầy (chủ dự án) đã duyệt hướng này ngày 2026-11-03, sửa lại cùng ngày.

## Đã chốt

- **DNA đã chốt** (thầy duyệt 2026-11-03):
  1. Nền xanh than gần đen (ví dụ `#010a13`, `#0a1428`, `#091428`), bỏ tông xanh lục rừng.
  2. Khung viền vàng kim mảnh, vát góc, có đường viền trong (ví dụ `#c8aa6e`, `#785a28`, sáng `#f0e6d2`).
     Phe mình viền xanh, phe địch viền đỏ.
  3. Trạng thái chọn / hover / focus và nút hành động chính dùng xanh ngọc phát sáng (ví dụ `#0ac8b9`, `#0397ab`).
  4. Tiêu đề serif in hoa, giãn chữ; font phải hỗ trợ tiếng Việt.
- **Bố cục giữ nguyên.** UI/UX hiện tại là template chuẩn: vị trí, kích thước, số lượng và thứ tự các vùng giữ y như
  đang chạy. Chỉ thay DNA (màu, chất liệu, khung, chữ, tranh nền). Không thiết kế lại bố cục.
- Bản nháp lần trước đã bị loại vì sai bố cục, để ở `.../rejected/`. Không dùng lại bố cục của chúng.

## Template chuẩn: màn trận đấu hiện tại

Ảnh: `docs/briefs/current-board.jpg` (toàn màn) và `docs/briefs/current-board-zoom.png`. Trang đang chạy:
`http://localhost:5180/vfx/examples/jinx-summon` (dev server đã bật; nếu chụp được thì chụp ở 1920×1080).

Các vùng phải giữ:

- Thanh trên: hai người chơi hai góc (avatar, máu dạng chấm, thanh mana đội), giữa là các pha
  Draw / Reward / Standby / Main 1 / Battle / Main 2 / End, dưới là "Vòng N" và "Lượt của bạn".
- Cột trái: thẻ chi tiết tướng đang chọn (chân dung, tên, vai trò, máu, AD/AP/Giáp/KPhép), tab Đồ / Chiêu / Bổ trợ,
  danh sách kỹ năng, "Hiệu ứng đang chịu".
- Giữa: bàn đấu (chi tiết ở dưới), cột chồng bài nhỏ sát mép phải bàn.
- Cột phải: "Chuỗi kỹ năng hiện tại", "Nhật ký trận", "Đội dự bị" (lưới ô tướng vuông), các nút Đánh / Ghép đồ /
  Chưa gọi được.
- Dưới: tay bài (Tay x/10, Bộ bài, Đánh) với các lá bài nằm ngang.

## Bản đồ: 5 lane, 10 ô

Bàn hiện tại (xem ảnh template) là:

- **5 lane chạy dọc** (5 cột), không phải chạy ngang.
- **Sông chạy ngang** cắt giữa bàn, chia mỗi lane thành **ô phe địch (nửa trên)** và **ô phe mình (nửa dưới)**:
  tổng **10 ô**. Mỗi ô là một ô đặt tướng rõ ràng (có dấu ô ở giữa và bảng tên nhỏ "Đường N" ở mép dưới ô).
- Giữa các lane là dải rừng / đá ngăn cách.
- **Vòng tròn "Triệu hồi phụ" (2 vòng)**: thầy sửa ngày 2026-11-03, đặt **trên sông, thẳng cột Đường 2 và Đường 4**,
  không còn ở hai mép trái / phải như bàn cũ.
  Thầy sửa tiếp: 2 vòng phải **tự nhiên**, là một phần của cảnh chứ không phải huy hiệu UI dán lên sông. Ví dụ: bệ đá
  cổ trồi lên giữa dòng nước, mặt bệ phẳng có vòng rêu / vòng rune khắc chìm phát sáng xanh ngọc nhẹ, nước vỗ quanh
  chân bệ, vài tảng đá bước nối ra hai bờ. Không viền vàng kim kiểu khung UI, không ngọc gắn bốn hướng. Mặt bệ vẫn
  phẳng, tối và trống để game đặt lá triệu hồi lên.
- Cả bàn có khung viền bao quanh.
- **Không có chữ nào trên bản đồ** (thầy chốt): không "Đường N", không "Triệu hồi phụ", không "Trống". Game hiện các nhãn
  này bằng chữ DOM. Chỉ giữ dấu ô và chỗ trống cho bảng tên (không chữ) nếu cần.

Việc: vẽ lại đúng bố cục đó theo DNA mới (chất tranh MOBA fantasy, nhìn từ trên xuống):

- File `packages/client/public/map-v2/board.jpg`, **2560×1707** (cùng tỉ lệ 3:2 với `public/map/board5.jpg`), sao
  cho 10 ô, sông và 2 vòng triệu hồi nằm đúng vị trí tương đối như bàn hiện tại để thay thẳng được.
- 10 ô phẳng, ít chi tiết, đọc rõ khi game phủ `brightness(.65) saturate(.70)`; chi tiết dồn vào dải rừng giữa các
  lane, sông và khung. Ô phe địch có ánh đỏ nhẹ, ô phe mình ánh xanh nhẹ.
- Không vẽ tướng, trụ hay quái đè lên trong 10 ô.
- Bố cục là của StarCi, không dựa trên Summoner's Rift.

## Giới hạn bắt buộc

- Hướng là **cùng thể loại và cảm giác** với client MOBA (League of Legends), **không sao chép**. Không chép, đồ lại
  hay vẽ sát bản đồ, khung giao diện, icon, logo hay tranh của Riot. Không dùng ảnh Riot làm đầu vào. Không vẽ nhân
  vật có thật của game nào; tướng minh hoạ là nhân vật tự tạo.
- Không sửa code game, luật, engine hay cân bằng. Không sửa file đang có thay đổi chưa commit, trừ `docs/UI_DNA.md`.
- Không xoá hay ghi đè asset cũ. Asset mới ở thư mục mới.
- Không commit, không push. Chạy không tương tác: không hỏi lại, gặp chỗ mơ hồ thì chọn phương án an toàn nhất và ghi
  lại trong báo cáo.

## Việc cần làm, theo thứ tự

1. `packages/client/public/map-v2/board.jpg` như trên. Bản đang có (không chữ, vòng ở Đường 2 và 4 nhưng là huy hiệu
   viền vàng) đã đúng mọi thứ trừ 2 vòng: chuyển nó sang `map-v2/rejected/board-medallion.jpg`, rồi **chỉ sửa 2 vòng**
   cho tự nhiên như trên; giữ nguyên 10 ô, dải rừng, sông, khung, màu và vị trí. Bản này là bản gốc để sửa.
2. `packages/client/public/ui/moba-v1/reference/match-hud.png`, 1920×1080: **màn trận đấu y bố cục template**, thay DNA,
   đặt bản đồ mới vào vùng bàn.
3. `docs/UI_DNA.md`: bản gốc đã được chép sang `docs/UI_DNA.forest.md` (nếu chưa có thì chép trước khi sửa). Giữ các
   luật kỹ thuật (canvas 1920×1080, `useGameOverlay()`, chữ DOM thật, `ScrollArea`, `ActionDialog`, `GameCardVisual`,
   ô tướng vuông, luật hiệu ứng, quy trình duyệt ảnh). Thay phần màu / chất liệu bằng 4 điểm DNA đã chốt. Thêm mục
   "Bố cục" (bố cục hiện tại là chuẩn, chỉ đổi DNA) và mục "Hình mẫu" trỏ tới 2 ảnh trên. Ghi rõ chất "bàn rừng" cũ
   không còn là chuẩn màu, nhưng bố cục của nó vẫn là chuẩn.

Chưa đổi đường dẫn `board5.jpg` trong code; việc gắn vào game làm ở giai đoạn 2 sau khi thầy duyệt.

## Bàn giao

- Trả lời ngắn: danh sách file tạo / sửa, và mỗi ảnh tạo bằng cách nào.
- Tự xem lại từng ảnh ở kích thước thật, so với ảnh template, trước khi báo xong.
