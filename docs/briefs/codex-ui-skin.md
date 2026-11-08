# Brief cho Codex: bộ skin UI vẽ sẵn (khung, nút, họa tiết) để ghép vào game Cocos

Repo: `D:/Repositories/starci-league`. Thầy nhận xét ngày 2026-11-04: các khung, nút, viền, lá bài trong game đang do code
tự vẽ nên phẳng, thiếu họa tiết và gờ viền so với mockup của Codex. Việc: **imagegen từng mảnh UI** đúng chất mockup,
xuất PNG nền trong suốt dạng **9-slice**; Claude ghép vào Cocos (Sprite SLICED), chữ vẫn là chữ thật do code vẽ.

## Chuẩn tham chiếu (xem kỹ, vẽ đúng chất này)

`docs/mockups/cocos/{auth,decks,builder,card-anatomy}.png`, `docs/mockups/match/{lobby,draft,chain,weapon-pick,craft,result}.png`,
`docs/UI_DNA.md`. Đặc trưng: khung vàng kim **gờ nổi** (viền ngoài đậm có bóng, viền trong mảnh, vạch sáng), **góc vát
có họa tiết** (cuộn lá, đinh, ngọc), ngọc thoi xanh ngọc giữa cạnh trên/dưới, nền trong tối xanh than, nút chính xanh
ngọc **phát sáng có gờ vàng**, ánh kim loại. Chất tranh vẽ fantasy MOBA, nét sắc, không mờ.

## Giới hạn

- Thiết kế riêng của StarCi. Không chép khung, nút, icon, hoa văn của League of Legends hay game có thật nào.
- **Không có chữ, số, nhân vật trong mọi mảnh.** Nền **trong suốt thật (alpha)**, không viền trắng/đen thừa, không bóng đổ
  ra ngoài ô. Phần ruột của khung (vùng đặt chữ / tranh) **trong suốt hoàn toàn** để code tự tô nền.
- Không sửa code. Không commit. Chạy không tương tác. Tự mở lại từng ảnh ở kích thước thật kiểm: alpha đúng, cạnh giữa
  là dải lặp được (kéo giãn không méo họa tiết), 4 góc đối xứng.

## Mảnh cần vẽ, lưu ở `cocos/assets/resources/skin/`

Mọi khung 9-slice: **4 góc giữ nguyên, 4 cạnh là dải đồng nhất lặp / kéo được, ruột trong suốt**. Họa tiết lớn (ngọc, cuộn lá)
chỉ nằm trong 4 góc hoặc là mảnh riêng ở mục 5, không nằm giữa cạnh.

1. **Panel lớn**: `panel.png` 640×640, biên 9-slice 88 px. Viền vàng kim đôi, góc vát có họa tiết cuộn, đinh. (Không vẽ ngọc
   giữa cạnh, ngọc là mảnh riêng.) Thêm `panel-soft.png` 640×640 biên 72: cùng kiểu nhưng mảnh và nhẹ hơn (hàng, thanh).
2. **Ô vuông** (ô tướng / đồ / chiêu), mỗi file 256×256, biên 52:
   `slot-gold.png` (vàng), `slot-ally.png` (viền xanh lam, ánh xanh), `slot-enemy.png` (viền đỏ, ánh đỏ),
   `slot-teal.png` (viền ngọc phát sáng, dùng cho ô đang chọn / mục tiêu hợp lệ), `slot-bronze.png`, `slot-steel.png`
   (đồng, thép, dùng cho 4 nhóm bài ở sảnh). Có đinh góc, gờ nổi.
3. **Nút**, mỗi file 384×96, biên ngang 44 / dọc 36: `btn-gold.png` (nền trong suốt, viền vàng kim gờ nổi, hai đầu
   có họa tiết nhỏ), `btn-gold-hover.png`, `btn-primary.png` (viền vàng + **lõi xanh ngọc phát sáng có gờ**; nút chính
   cỡ lớn), `btn-primary-hover.png`, `btn-danger.png` (viền đỏ), `btn-disabled.png` (xám than, viền xám).
   Ruột nút để trong suốt cho nút gold / disabled; nút primary **được phép có lõi xanh ngọc đã tô sẵn** (đây là ngoại lệ).
   Thêm `btn-pill.png` 192×56 biên 24 (nút nhỏ viền vàng mảnh) và `tab-underline.png` 256×24 biên ngang 40 (gạch chân
   tab: vạch xanh ngọc phát sáng có hai mũi nhọn ở đầu).
4. **Ô nhập / thanh**: `field.png` 512×80 biên 28 (viền vàng mảnh, góc vát nhỏ, ruột trong suốt), `field-focus.png` (cùng cỡ,
   viền xanh ngọc phát sáng), `notice-error.png` và `notice-ok.png` 512×72 biên 28 (khung báo: viền đỏ / viền xanh ngọc,
   chừa chỗ icon bên trái, **ruột có nền tô sẵn** đỏ sẫm / ngọc sẫm).
5. **Họa tiết riêng (không 9-slice)**, PNG trong suốt, lưu thêm vào `skin/ornament/`:
   `gem.png` 96×96 (ngọc thoi xanh ngọc viền vàng, dùng giữa cạnh panel), `gem-red.png`, `gem-gold.png`,
   `divider.png` 640×40 (đường kẻ vàng hai đầu nhọn có ngọc nhỏ giữa), `divider-short.png` 320×32,
   `title-flourish.png` 900×120 (cánh / cuộn lá hai bên tiêu đề lớn, ruột trống để đặt chữ), `victory-wings.png` 1200×300
   (cánh vàng ngọc đặt sau chữ THẮNG LỢI, ruột trống), `defeat-wings.png` (bản đỏ sẫm, vỡ nứt),
   `corner-bracket.png` 64×64 (thanh góc vàng), `mana-badge.png` 96×96 (huy hiệu tròn xanh lam gờ vàng, ruột trống),
   `quick-ribbon.png` 256×48 (nhãn dải xanh ngọc có gờ), `rune-circle.png` 512×512 (vòng rune xanh ngọc phát sáng, nền trong,
   dùng trang trí ô chế độ đang chọn và màn ghép trận), `crown-lock.png` 128×128 (ổ khoá vàng).
6. **Khung lá bài**, 5 file 500×700 (tỉ lệ 5:7) lưu ở `skin/card/`: `card-basic.png` (vàng đồng), `card-spell.png` (xanh ngọc
   có rune), `card-gold.png` (vàng ròng, đồng xu), `card-item.png` (thép xanh lam, đinh tán), `card-skill.png` (viền vàng +
   dải xanh lam đậm, cho lá chiêu tướng). **Không 9-slice**, dùng nguyên khung, kéo đều theo tỉ lệ. Cửa sổ tranh phía trên
   **trong suốt hoàn toàn** (code đặt tranh phía dưới), dải tên và vùng mô tả phía dưới **tô nền tối sẵn** (để chữ đọc rõ),
   có ô tròn trống góc trên-trái cho huy hiệu mana, ô nhỏ góc trên-phải cho nhãn Q/E/R, huy hiệu chữ nhật góc dưới-phải.
   Kèm `skin/card/cards.json`: `{ "art": {x,y,w,h}, "plate": {x,y,w,h}, "type": {x,y,w,h}, "desc": {x,y,w,h},
   "mana": {x,y,r}, "key": {x,y,w,h}, "count": {x,y,w,h} }` theo pixel của khung 500×700 (gốc trên-trái), dùng chung cho cả 5.
   Thêm `card-back.png` 500×700 (lưng bài: họa tiết la bàn ngôi sao, viền vàng).

## Metadata

`skin/slices.json`: `{ "panel.png": { "top": 88, "right": 88, "bottom": 88, "left": 88 }, ... }` cho **mọi** file 9-slice ở mục 1–4,
đúng giá trị biên bạn đã vẽ (px của ảnh gốc).

## Bàn giao

1. Toàn bộ file trên. 2. `docs/mockups/skin/sheet.png` 1920×1080: sheet xem trước mọi mảnh trên nền xanh than
   (có nhãn tên file bên dưới từng mảnh) để thầy duyệt. 3. Báo cáo ngắn: danh sách file, đã kiểm alpha và 9-slice từng mảnh.
   Làm theo thứ tự 1, 2, 3, 4, 6, 5; xong mục nào ghi rõ để Claude ghép dần.
