# Bàn giao tranh Cocos

Đã bàn giao đủ **24 PNG** theo [brief](codex-cocos-art-pieces.md), tạo bằng **imagegen tích hợp**, tham chiếu trực tiếp các mockup đã duyệt. Bộ [prompt nguyên văn và thông số kiểm tra](cocos-art-pieces-prompts.json) có đủ 24 hạng mục.

Đã mở và xem riêng **từng ảnh ở kích thước thật**: 19 tranh lá bài 512×512, 3 bìa 768×1024, crest 512×512 và wordmark 1200×512. Đã đối chiếu vật thể, bố cục, màu và ánh sáng với mockup. Tranh phủ kín, không chữ, số hay khung UI/viền ngoài; wordmark là ngoại lệ chữ theo brief.

Hai logo có kênh alpha thật, pixel góc alpha=0; đã kiểm tra mép trên nền navy và trắng. 22 tranh còn lại là PNG RGB nền kín. Hậu kỳ chỉ giảm mẫu bicubic và đổi định dạng; không ghép chữ/khung bằng code. Không sửa code, không commit.

| File | Kích thước | Nội dung | Đã xem bản thật |
|---|---|---|---|
| [art/cards/basic.png](../../cocos/assets/resources/art/cards/basic.png) | 512×512 | Vệt chém đỏ vàng | Có |
| [art/cards/draw.png](../../cocos/assets/resources/art/cards/draw.png) | 512×512 | Ba lá bài xanh xòe quạt | Có |
| [art/cards/spell_heal.png](../../cocos/assets/resources/art/cards/spell_heal.png) | 512×512 | Ngọc chữa lành trên chén vàng | Có |
| [art/cards/spell_flash.png](../../cocos/assets/resources/art/cards/spell_flash.png) | 512×512 | Sét xanh giữa hai trụ đá | Có |
| [art/cards/spell_ignite.png](../../cocos/assets/resources/art/cards/spell_ignite.png) | 512×512 | Tinh thể tím trong vòng lửa | Có |
| [art/cards/spell_exhaust.png](../../cocos/assets/resources/art/cards/spell_exhaust.png) | 512×512 | Đá xám với dải khí tím | Có |
| [art/cards/spell_barrier.png](../../cocos/assets/resources/art/cards/spell_barrier.png) | 512×512 | Khiên trong suốt xanh ngọc | Có |
| [art/cards/spell_cleanse.png](../../cocos/assets/resources/art/cards/spell_cleanse.png) | 512×512 | Giọt bạc và dải nước | Có |
| [art/cards/spell_smite.png](../../cocos/assets/resources/art/cards/spell_smite.png) | 512×512 | Tia vàng đánh xuống đá | Có |
| [art/cards/spell_teleport.png](../../cocos/assets/resources/art/cards/spell_teleport.png) | 512×512 | Hai cổng vàng/xanh nối nhau | Có |
| [art/cards/gold.png](../../cocos/assets/resources/art/cards/gold.png) | 512×512 | Cụm đồng xu sao la bàn | Có |
| [art/cards/item_kiem_dai.png](../../cocos/assets/resources/art/cards/item_kiem_dai.png) | 512×512 | Kiếm bạc, chuôi vàng | Có |
| [art/cards/item_gay_qua_kho.png](../../cocos/assets/resources/art/cards/item_gay_qua_kho.png) | 512×512 | Gậy đầu sao tím | Có |
| [art/cards/item_cung_go.png](../../cocos/assets/resources/art/cards/item_cung_go.png) | 512×512 | Cung gỗ | Có |
| [art/cards/item_gang_tay.png](../../cocos/assets/resources/art/cards/item_gang_tay.png) | 512×512 | Găng da nâu | Có |
| [art/cards/item_giap_luoi.png](../../cocos/assets/resources/art/cards/item_giap_luoi.png) | 512×512 | Mắt xích thép trên vải lam | Có |
| [art/cards/item_ao_choang.png](../../cocos/assets/resources/art/cards/item_ao_choang.png) | 512×512 | Áo choàng bạc, khóa sao vàng | Có |
| [art/cards/item_dai_khong_lo.png](../../cocos/assets/resources/art/cards/item_dai_khong_lo.png) | 512×512 | Đai da nâu, khóa vàng | Có |
| [art/cards/item_nuoc_mat.png](../../cocos/assets/resources/art/cards/item_nuoc_mat.png) | 512×512 | Ngọc giọt nước xanh | Có |
| [art/decks/cover_1.png](../../cocos/assets/resources/art/decks/cover_1.png) | 768×1024 | Bình Minh — kiếm vàng và vòng lửa | Có |
| [art/decks/cover_2.png](../../cocos/assets/resources/art/decks/cover_2.png) | 768×1024 | Thủy Triều — sóng bạc và ngọc | Có |
| [art/decks/cover_3.png](../../cocos/assets/resources/art/decks/cover_3.png) | 768×1024 | Tinh Tú — gậy sao và đồng xu | Có |
| [art/logo/crest.png](../../cocos/assets/resources/art/logo/crest.png) | 512×512 · alpha | Sao la bàn vàng, lõi xanh ngọc | Có |
| [art/logo/wordmark.png](../../cocos/assets/resources/art/logo/wordmark.png) | 1200×512 · alpha | Hai dòng STARCI / LEAGUE | Có |

Trừng Phạt và Dịch Chuyển được xuất ở độ sáng tranh bình thường; trạng thái tối trong mockup thuộc lớp tương tác UI. Các chi tiết vật thể có sẵn trong tranh tham chiếu được giữ.

