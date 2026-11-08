# Brief cho Codex: mockup UX/UI sảnh đấu và toàn bộ UX trong trận

Repo: `D:/Repositories/starci-league`. Thầy yêu cầu ngày 2026-11-04: vẽ mockup nguyên trang cho sảnh đấu và mọi UX/UI
trong trận. Cách làm giống lần trước (thầy đã duyệt): Codex imagegen **mockup nguyên trang**, Claude bóc thành trang game
và dựng UI bằng code trong Cocos.

## Chuẩn phải theo

- DNA đã chốt: `docs/UI_DNA.md`. Mẫu đã duyệt: `docs/mockups/cocos/*.png` (đăng nhập, bộ bài, xếp bộ, cấu tạo lá) và
  `packages/client/public/ui/moba-v1/reference/match-hud.png` (màn trận). Khung vàng kim vát góc có ngọc, nền xanh than,
  xanh ngọc cho chọn / hover / nút chính, lá bài 4 kiểu khung theo nhóm, chữ serif Alegreya / Alegreya SC.
- Sân khấu 1920×1080. Màn ngoài trận dùng nền menu chung `cocos/assets/resources/bg/menu.jpg`. Hộp thoại trong trận đặt
  đè lên màn trận (bàn 10 ô `packages/client/public/map-v2/board.jpg`) đã làm tối, đúng bố cục `match-hud.png`.
- Chữ tiếng Việt đúng dấu, đúng dữ liệu thật dưới đây.

## Giới hạn bắt buộc

- **Mọi nhân vật là nhân vật tự tạo của StarCi.** Không vẽ, không vẽ sát, không gợi ngoại hình của tướng Riot / League of
  Legends (kể cả Jinx, Jayce, Sylas) hay nhân vật của game có thật nào. Mô tả bên dưới gọi tướng theo **cơ chế**; chân dung
  trong mockup là nhân vật gốc minh hoạ cho cơ chế đó.
- Không chép giao diện, icon, logo của game có thật.
- Không sửa code, không commit, không hỏi lại; chỗ mơ hồ chọn phương án an toàn và ghi trong báo cáo.

## Ô tướng và ô đồ: vuông, để trống (thầy chốt 2026-11-04)

- **Mọi ô chân dung tướng và mọi ô món đồ / mảnh đồ đều là hình vuông.** Thầy sẽ tự thêm ảnh vào sau.
- Trong mockup, **không vẽ nhân vật hay món đồ vào các ô này**. Mỗi ô là một ô giữ chỗ: nền xanh than tối, viền vàng kim
  mảnh, giữa có biểu tượng mờ chung (bóng người cho ô tướng, hình khiên / kiếm đơn giản cho ô đồ). Tên tướng, tên món và
  mọi chữ đi kèm vẫn ghi đầy đủ bên dưới / bên cạnh ô.
- Giữ cùng một cỡ ô cho cùng một loại ở mỗi màn, để code dựng lại được: ô tướng lớn (hộp thoại, kết thúc trận), ô tướng
  vừa (lưới cấm / chọn), ô tướng nhỏ (cột đội), ô đồ (bảng ghép đồ, khung chi tiết).
- Biểu tượng chiêu (Q / E / R, tuyệt chiêu) cũng là ô vuông giữ chỗ như trên.

## Danh sách mockup (PNG 1920×1080, lưu ở `docs/mockups/match/`)

1. `lobby.png`, **Sảnh đấu** (sau đăng nhập, nền menu): thanh trên (logo, tên người chơi, bộ bài đang dùng, nút Bộ bài,
   Đăng xuất); khu chọn chế độ lớn: ĐẤU NHANH (ghép ngẫu nhiên), ĐẤU MÁY DỄ, ĐẤU MÁY KHÓ, PHÒNG RIÊNG (tạo phòng, ô nhập
   mã phòng + nút Vào phòng); thẻ "Bộ đang dùng" (tên bộ, 80/80, tổng 4 nhóm, nút Đổi bộ); nút chính VÀO TRẬN.
2. `matchmaking.png`, **Đang ghép trận**: vòng rune xoay, thời gian chờ, chế độ đã chọn, nút Huỷ; trạng thái mất kết nối
   (khung báo đỏ + nút Thử lại) vẽ nhỏ ở góc như một biến thể.
3. `draft.png`, **Cấm / Chọn tướng**: tiêu đề "Cấm / Chọn tướng", dòng "Mỗi đội 5 tướng. Tướng đã bị cấm hoặc đã được chọn
   thì không ai lấy được nữa."; lưới chân dung tướng vuông (trạng thái: thường, đang chọn, Đã cấm, Đã chọn, nhãn gợi ý
   Khắc chế / Combo / Bị khắc / Nên cấm); hai cột Đội của bạn / Đội địch có ô cấm; khung "Phân tích đối thủ" (Yếu trước,
   Khắc chế, Cách đánh bại); nút Cấm / Chọn; nút chính "Xác nhận đội hình".
4. `weapon-pick.png`, **Chọn vũ khí khi ra sân** (tướng hai vũ khí, ví dụ súng liên thanh / bệ phóng tên lửa): hộp thoại
   đè lên màn trận; hai lựa chọn lớn cạnh nhau, mỗi bên: biểu tượng vũ khí, tên, so sánh đòn Q / E / R ngắn, nhãn "Đang
   dùng" / "Xem trước"; ghi chú "Đổi vũ khí là bị động, không tốn mana"; nút Xác nhận / Huỷ.
5. `form-switch.png`, **Đổi thế** (tướng hai thế, ví dụ búa cận chiến / pháo tầm xa): cùng khung với 4 nhưng so sánh
   chiêu Q / E / R theo thế, chỉ rõ thế hiện tại ở góc dưới-trái chân dung; nút Đổi thế / Huỷ.
6. `craft.png`, **Ghép đồ**: hộp thoại "Ghép đồ"; bảng công thức 8×8 (hàng và cột là 8 mảnh Đồ: Kiếm Dài, Gậy Quá Khổ,
   Cung Gỗ, Găng Đấu Tập, Giáp Lưới, Áo Choàng Bạc, Đai Khổng Lồ, Nước Mắt Nữ Thần; ô giao là món ghép); ô ghép được ngay
   từ tay bài sáng xanh ngọc, ô thiếu mảnh mờ; khung chi tiết món đang chọn (tên, chỉ số, nội tại, cần 2 mảnh + 1 Vàng);
   ghi chú "Ghép xong lá đồ về tay, đánh lá đó để đeo"; nút Ghép / Đóng.
7. `steal.png`, **Cướp chiêu cuối** (tướng có chiêu cướp tuyệt chiêu của địch): hộp thoại liệt kê tướng địch trên sân, mỗi
   dòng: chân dung, tên tướng, tuyệt chiêu sẽ cướp (biểu tượng, tên, mô tả ngắn), mana phải trả; dòng đang chọn sáng ngọc;
   ghi chú chiêu cướp về tay hay dùng ngay; nút Cướp / Huỷ.
8. `chain.png`, **Chuỗi kỹ năng**: màn trận với cột phải "Chuỗi kỹ năng hiện tại" mở rộng: các mắt xích xếp chồng (lá,
   người dùng, mục tiêu, thứ tự giải 1-2-3 từ trên xuống), mắt xích đang giải sáng; cửa sổ phản ứng ở giữa màn "Đối thủ
   nối chuỗi, bạn có muốn phản ứng?" với các lá Quick play trên tay được nâng lên, đồng hồ đếm ngược, nút Bỏ qua.
9. `targeting.png`, **Đánh lá và chọn mục tiêu**: một lá trên tay đang kéo lên bàn, đường cong ngắm từ lá tới ô mục tiêu,
   ô hợp lệ sáng ngọc, ô không hợp lệ mờ, tooltip mục tiêu (tên, Máu, hiệu ứng), nút huỷ nhỏ.
10. `result.png`, **Kết thúc trận**: THẮNG LỢI (biến thể THẤT BẠI nhỏ ở góc), đội hình 5 tướng hai bên, thống kê (sát thương,
    lá đã đánh, chuỗi dài nhất, lượt), phần thưởng, nút Về sảnh / Đấu lại.

## Bàn giao

- Mười file PNG trên, theo thứ tự. Báo cáo ngắn: danh sách file, mỗi ảnh tạo bằng cách nào, đã xem lại từng ảnh ở kích
  thước thật (chữ đúng dấu, không nhân vật nào giống tướng của game có thật).
