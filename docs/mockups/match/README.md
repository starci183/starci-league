# Bàn giao 10 mockup UX trận — 2026-11-04

Cả mười màn là PNG **1920×1080**, vẽ nguyên trang bằng **imagegen tích hợp**, tạo lần đầu đúng thứ tự dưới đây. Mọi ô tướng, trang bị, mảnh đồ, vũ khí, thế và kỹ năng đều dùng ô vuông nền xanh than trống, chỉ có thể có dấu thoi hình học mờ; không vẽ nhân vật, vật phẩm hoặc hình minh hoạ chiêu trong ô.

| Thứ tự | File | Cách tạo |
|---|---|---|
| 1 | [lobby.png](lobby.png) | Imagegen dựa trên nền menu và auth đã duyệt; một lượt chỉnh nhãn bốn nhóm bộ bài. |
| 2 | [matchmaking.png](matchmaking.png) | Imagegen dựa trên menu và lobby; có biến thể mất kết nối nhỏ. |
| 3 | [draft.png](draft.png) | Imagegen theo menu/lobby; chỉnh ô vuông và trạng thái cấm/chọn nhất quán. |
| 4 | [weapon-pick.png](weapon-pick.png) | Imagegen theo match-hud/board; thay toàn bộ tranh bằng ô trống; chỉnh inspector khớp hộp thoại. |
| 5 | [form-switch.png](form-switch.png) | Imagegen theo weapon-pick; đánh dấu thế hiện tại dưới-trái chân dung; chỉnh inspector theo thế Búa. |
| 6 | [craft.png](craft.png) | Imagegen theo nền trận/khung hộp thoại; chỉnh 64 ô vuông và trạng thái công thức đối xứng. |
| 7 | [steal.png](steal.png) | Imagegen theo nền trận/khung hộp thoại; năm mục tiêu, chi phí gốc cộng 35 mana, cướp dùng ngay. |
| 8 | [chain.png](chain.png) | Imagegen theo HUD/bàn trận; chỉnh bên nối chuỗi và lá phản ứng hợp lệ; giữ thứ tự giải 1–2–3. |
| 9 | [targeting.png](targeting.png) | Imagegen theo chain/board; chỉnh ô mục tiêu hợp lệ, nhật ký và nhãn lá trang bị. |
| 10 | [result.png](result.png) | Imagegen theo menu/lobby; hai đội hình 5+5, thống kê, phần thưởng và biến thể thất bại. |

[Bộ prompt nguyên văn](prompts.md). [Nguồn và danh sách file](manifest.json).

Đã mở xem từng bản xuất bằng `view_image` ở mức `original`, kích thước thật 1920×1080, và rà lại các bản chỉnh: chữ tiếng Việt, nội dung/nút, ô giữ chỗ, bảng 8×8, hai đội 5+5, các biến thể nhỏ. Không có tranh nhân vật/vật phẩm trong ô. Đây là bản raster để bóc UI; khi dựng trong Cocos cần khóa hình học ô vuông và font bằng code theo UI_DNA.

Ảnh nguồn imagegen khoảng 1672×941 (lobby 1671×941), nội suy bicubic chất lượng cao thành 1920×1080. Không ghép chữ, vẽ khung hay thêm placeholder bằng code; toàn bộ hình ảnh đến từ imagegen.

Các lựa chọn ở phần brief chưa chốt:
- Dùng tên người chơi **Lữ Khách**, bộ **Bình Minh** như bộ mockup đã duyệt. Tên tướng trong các màn là nhãn minh hoạ theo cơ chế hoặc tên gốc từ match-hud; không thay roster.
- Số liệu thời gian, máu hiện tại, thống kê và phần thưởng **120 Vàng / 60 kinh nghiệm** là dữ liệu minh hoạ cho UX.
- Công thức/giá quan trọng đối chiếu code hiện hành: bộ 80 lá = Đánh thường 16 / Bổ trợ 18 / Vàng 16 / Đồ 30; Kiếm Dài + Kiếm Dài + 1 Vàng → Kiếm Tử Thần +70 Sức mạnh công kích, không nội tại; Q/E/R vũ khí 20/25/60 mana; thế 25/25/60; đổi vũ khí/thế là nội tại ở Standby, mỗi lượt một lần; cướp R trả 35 mana cộng giá chiêu gốc và dùng ngay.
- Tên tám mảnh trong bảng ghép giữ nguyên brief; tên món của ô giao hiển thị ở khung chi tiết khi được chọn. Ô còn lại chỉ thể hiện trạng thái công thức.
- Các cảnh là trạng thái UX độc lập. Inspector ở các màn nền trận khác giữ dữ liệu tham chiếu, không phải bản ghi một trận đã chạy.

Tham chiếu: `docs/UI_DNA.md`, `docs/mockups/cocos/`, `cocos/assets/resources/bg/menu.jpg`, `packages/client/public/ui/moba-v1/reference/match-hud.png`, `packages/client/public/map-v2/board.jpg`. Dữ liệu đối chiếu từ `packages/shared/src/cardgame/deck.ts`, `items.ts`, các hero module và dữ liệu balance tương ứng.

Chỉ thêm ảnh và tài liệu bàn giao trong thư mục này. Không sửa code, không commit.

