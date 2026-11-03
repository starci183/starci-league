# Bàn giao mockup Cocos — 2026-11-03

Đã vẽ bằng **imagegen tích hợp**, theo thứ tự: auth → decks → builder → card anatomy → nền menu sạch. Ba màn dùng cùng bối cảnh sảnh đá cổ, vòm sao, đèn vàng và rune xanh ngọc.

| File | Cách tạo |
|---|---|
| [auth.png](auth.png) | Imagegen vẽ nguyên trang; chọn tab **ĐĂNG KÝ** để hiện đủ trường Tên hiển thị, Email, Mật khẩu và dòng lỗi. |
| [decks.png](decks.png) | Imagegen dùng auth làm tham chiếu, thay UI bằng bộ sưu tập ba bộ bài, giữ bối cảnh menu. |
| [builder.png](builder.png) | Imagegen dùng auth và decks làm tham chiếu; vẽ đủ 19 lá, danh sách 17 loại đang có trong bộ mặc định, đường cong phân bố và các thao tác. |
| [card-anatomy.png](card-anatomy.png) | Imagegen dựa trên builder; một lượt chỉnh phần thân lá lớn; có sáu chú thích, bốn họ khung và năm trạng thái. |
| [menu.jpg](../../../cocos/assets/resources/bg/menu.jpg) | Imagegen xoá toàn bộ UI khỏi auth, đối chiếu decks/builder và phục dựng phần nền bị che. |

Cả năm ảnh đã được xuất **1920×1080**. Bốn mockup là PNG; nền là **JPG quality 90**. Nguồn imagegen 1672×941 được nội suy bicubic chất lượng cao tới kích thước bàn giao. Hậu kỳ chỉ đổi kích thước/định dạng, không ghép chữ hoặc dựng khung bằng code. [Bộ prompt đầy đủ](prompts.md) lưu nguyên văn cả sáu lượt vẽ/chỉnh.

Đã mở và xem lại từng ảnh xuất ở kích thước thật 1920×1080. Đã đối chiếu chữ tiếng Việt, tab/trường/nút, một nhãn ĐANG DÙNG, phân trang, đủ 19 lá cùng n/max, 17 dòng bộ đang xếp, tổng **16 / 18 / 16 / 30 = 80**, bốn kiểu khung và năm trạng thái. Nền sạch không có chữ, panel, nút hay lá bài.

Giả định: tên người chơi **Lữ Khách** và ba tên bộ **Bình Minh / Thủy Triều / Tinh Tú** là dữ liệu minh họa. Số bản và giới hạn lấy từ `packages/shared/src/cardgame/deck.ts`; Rút Bài thuộc nhóm Bổ trợ.

Lựa chọn artwork: brief vừa yêu cầu tranh có sẵn vừa cấm dùng Riot artwork làm input. `scripts/card_support_art.py` xác nhận các ảnh phép/đồ lấy từ Data Dragon; `.work/codex_basic3/prompt.txt` và `run.sh` cho thấy basic/draw/gold cũng được tạo từ tham chiếu icon Riot. Vì vậy cả 19 minh họa trong bộ bàn giao được vẽ mới theo ý niệm tương ứng, không dùng các ảnh ấy làm input.

Lưu ý khi dựng UI: đây là mockup raster; hình học khung lá còn sai số so với tỷ lệ ghi trên sheet. Khi bóc và dựng trong Cocos cần khóa chính xác **5:7**, ô tranh khoảng **60%**. Các phần nền bị UI che được imagegen phục dựng từ cùng bối cảnh tham chiếu.

Không sửa code, không commit, không tạo asset 9-slice hoặc sửa `slices.json`.
