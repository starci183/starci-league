# Brief cho Codex: xuất các mảnh tranh để dựng trang Cocos từ mockup

Repo: `D:/Repositories/starci-league`. Thầy đã duyệt 3 mockup ở `docs/mockups/cocos/` (`auth.png`, `decks.png`,
`builder.png`) và `card-anatomy.png` ngày 2026-11-03. Claude đang dựng lại các trang bằng code trong Cocos (khung, chữ,
nút vẽ bằng code). Cần các mảnh **tranh** khớp đúng mockup, nét, không chữ, để gắn vào.

## Giới hạn

- Giữ đúng hình và màu như trong mockup (cùng vật, cùng bố cục, cùng ánh sáng), chỉ vẽ lại ở độ phân giải cao.
- **Không chữ, không số, không khung UI, không viền lá bài** trong bất kỳ tranh nào (khung do code vẽ).
- Thiết kế riêng của StarCi, không chép tranh hay biểu tượng của game có thật nào.
- Không sửa code, không commit, không hỏi lại.

## Bàn giao (thư mục `cocos/assets/resources/`)

1. `art/cards/<mã>.png`, 512×512, tranh vuông phủ kín, cho đủ 19 lá, đúng hình trong `builder.png`:
   `basic`, `draw`, `spell_heal`, `spell_flash`, `spell_ignite`, `spell_exhaust`, `spell_barrier`, `spell_cleanse`,
   `spell_smite`, `spell_teleport`, `gold`, `item_kiem_dai`, `item_gay_qua_kho`, `item_cung_go`, `item_gang_tay`,
   `item_giap_luoi`, `item_ao_choang`, `item_dai_khong_lo`, `item_nuoc_mat`.
2. `art/decks/cover_1.png` … `cover_3.png`, 768×1024: tranh bìa hộp bài như ba hộp trong `decks.png` (kiếm lửa
   bình minh, sóng nước với ngọc, gậy sao với đồng xu), chỉ phần tranh, không khung, không chữ.
3. `art/logo/crest.png`: biểu tượng ngôi sao la bàn vàng kim có lõi xanh ngọc như trong mockup, nền trong suốt,
   512×512. Và `art/logo/wordmark.png`: chữ STARCI LEAGUE đúng kiểu như `auth.png` (logo được phép là chữ), nền trong
   suốt, rộng 1200 px.
4. Báo cáo ngắn: danh sách file, đã xem lại từng tranh ở kích thước thật.
