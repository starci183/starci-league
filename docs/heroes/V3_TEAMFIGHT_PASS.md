# V3 Teamfight Pass (2026-10-30): bảng thay đổi 30 tướng

Bản chi tiết từng tướng nằm trong `REDESIGN_V2.md`. File này chỉ liệt kê **cái gì đổi** để chủ duyệt/gạch.
Chỉ trên giấy, chưa đụng code.

Ký hiệu: **[THÊM]** = chức năng mới do agent thêm, **chủ có thể gạch**. **[CHỦ]** = chủ đã chốt.
Cột "Công thức" ghi `cũ → mới`; "cũ" lấy theo code hiện tại (`packages/shared/src/cardgame/heroes/*.ts`).

## 1. Luật chung mới (đã ghi vào REDESIGN_V2.md, mục "Luật chung")
| Luật | Nội dung |
|---|---|
| Mốc gọi tướng [CHỦ] | Vòng 1, 4, 8, 13, 19 (5 mốc), thay cho mỗi vòng gọi 1 |
| Đòn đánh thường [CHỦ] | 1× AD mọi vai; Sát thủ 1.25× AD (bỏ Xạ thủ 200%, Sát thủ 350%) |
| Kiếm Dài miễn phí [CHỦ] | Mỗi 2 lượt mỗi người nhận 1 Kiếm Dài (+15 AD), không lấy từ bộ bài |
| Đồ tháo được [CHỦ] | Mọi đồ là lá bài; tháo ra về tay (tay đầy thì đốt), lắp được cho tướng khác. **Câu hỏi mở:** tháo có tốn hành động không? Đồ ghép tháo ra nguyên món hay tách mảnh? |
| Nâng AD gốc [CHỦ] | ≈ ×1.4, dải 85–125, xem mục 3 |
| Cơ chế giữ, số QA lại [CHỦ] | |
| Hệ số AD + AP [CHỦ] | Mọi số (sát thương, hồi, Khiên, buff) ghi `(gốc + x% AD + y% AP)`; vật lý nghiêng AD, phép nghiêng AP, đỡ đòn/trợ thủ gần cân bằng. Hiệu ứng thuần giữ cố định |
| Chức năng giao tranh theo vai [CHỦ] | Trợ thủ: 1–2 khống chế + Khiên/hồi · Đỡ đòn: khống chế + giảm sát thương/Khiên · Đấu sĩ: trụ + sát thương · Pháp sư: khống chế hoặc burst + sát thương · Xạ thủ: tự cứu hoặc tiện ích + sát thương · Sát thủ: burst + thoát hoặc làm mới |
| Nguyên tắc 4 cũ | Bỏ "hoặc sát thương hoặc hiệu ứng thuần"; sát thương + khống chế được khi khống chế là giá trị chính |
| Tỉ lệ là cơ chế [ĐỀ XUẤT] | % giảm sát thương theo stack (Vững, Núi Đá), % của Rèn, hệ số ×N, % hút máu, % máu đã mất giữ cố định; % máu tối đa của Kog ghi kiểu `(x% + y% mỗi 100 AD + z% mỗi 100 AP)` |
| AP gốc [ĐỀ XUẤT, chờ duyệt] | Tướng sát thương phép có AP gốc = AD gốc **cũ** (atk trong code trước khi nâng); tướng vật lý AP gốc = 0. Không có AP gốc thì công thức nghiêng AP làm tướng phép yếu hẳn đầu trận. Hệ số chiêu được chia để ở chỉ số cũ tổng sát thương ≈ code |

## 2. Bảng thay đổi từng tướng
Cột "Trước/Sau" = chức năng giao tranh theo vai. KC = khống chế, Khiên/Hồi = trụ/bảo kê, ST = sát thương.

| Tướng | Vai | Trước | Sau | Thêm mới | Công thức đổi (cũ → mới) |
|---|---|---|---|---|---|
| Renata | Trợ thủ | KC (R) · hồi sinh · ST (Q mới) · Giáp | Giữ nguyên | Không. Đổi tên "Điên" của Renata → **Cuồng Bạo** (trùng tên Điên của Jinx). Ghi chú: KC chỉ có ở R (1 lá), chủ đã chốt giữ | Q [CHỦ]: Giáp (10 + 10% AD + 15% AP), ST (20 + 20% AD + 30% AP) · Hồi sinh 25% máu → 25% máu + (20 + 15% AD + 25% AP) · Cuồng Bạo ×1.15 → +(15 + 15% AD + 25% AP)/đòn · E phản 40% → 40% + (10 + 10% AD + 15% AP) chuẩn |
| Darius | Đấu sĩ | ST | ST + Hồi | [THÊM] Q hồi (6 + 8% AD + 2% AP) mỗi Chảy Máu trên mục tiêu | Q (5 + 80% AD) → (5 + 80% AD + 15% AP) · E (10 + 65% AD) → (10 + 65% AD + 13% AP) · R/stack (16 + 25% AD) → (16 + 25% AD + 5% AP) |
| Janna | Trợ thủ | KC + Khiên + Hồi | Giữ nguyên [CHỦ] | Không | Đã có hệ số chủ ghi: nội tại (30 + 20% AD + 40% AP), Q (40 + 30% AD + 60% AP) + Choáng, E (80 + 40% AD + 70% AP), R hồi (80 + 40% AD + 80% AP). (Code cũ: nội tại 24 + 25% AD, E 70 + 55% AD, R −50% thay vì miễn) |
| Brand | Pháp sư | ST + burst (R) | Giữ nguyên | Không | Bỏng/stack (10 + 4% AP) → (10 + 2% AD + 4% AP) · Q (35 + 95% AD + 40% AP) → (35 + 45% AD + 90% AP) |
| Zed | Sát thủ | Burst | Burst + Thoát | [THÊM] E: nếu lượt đó Zed hạ gục → Tàng Hình tới hết lượt kế của đối thủ | Q (80 + 160% AD) → (80 + 160% AD + 30% AP) · R/Dồn (36 + 60% AD) → (36 + 60% AD + 12% AP) |
| Aatrox | Đấu sĩ | ST + Hồi | Giữ nguyên | Không | Nội tại 15% máu đã mất → (15% máu đã mất + 5% AD + 2% AP) · Q 1.2× máu Trả → (120% máu Trả + 20% AD + 5% AP) · R 2× máu đã mất → (200% máu đã mất + 40% AD + 10% AP) |
| Garen | Đấu sĩ | ST | ST + Hồi | [THÊM] Q: Garen hồi 30% sát thương Q gây ra | Nội tại/Tội (6% AD) → (6% AD + 2% AP) · Q (15 + 80% AD) +(15% AD)/Tội → (15 + 80% AD + 15% AP) +(15% AD + 3% AP)/Tội · E/nhát (6 + 35% AD) → (6 + 35% AD + 7% AP) · R/Tội (15 + 40% AD) → (15 + 40% AD + 8% AP) |
| Gangplank | Đấu sĩ | ST (Thùng) + Hồi (Cam) | Giữ nguyên [CHỦ] | Không | Q (100 + 60% AD) → (100 + 60% AD + 15% AP) · Thuốc Súng (15 + 30% AD) → (15 + 30% AD + 6% AP). Luật Thùng giữ: tối đa 1 Thùng, Xạ thủ + Đấu sĩ đánh được Thùng |
| Yorick | Đấu sĩ | ST (Hồi chỉ ở R) | ST + Hồi | [THÊM] Q: Yorick hồi (25 + 20% AD + 5% AP) | Nội tại +0.5 AD/lá → đòn đánh +(0.3 + 0.3% AD + 0.1% AP)/lá; +2 máu/lá → +(1.5 + 1% AD + 0.3% AP)/lá · R 1.5/lá → (0.9 + 1% AD + 0.2% AP)/lá, hút 50% giữ |
| Blitzcrank | Đỡ đòn | KC | KC + Khiên | [THÊM] nội tại: mỗi lần Cướp, Blitz nhận Khiên (30 + 25% AD + 25% AP) | Không có số cũ |
| Braum | Đỡ đòn | Giảm ST | Giảm ST + Khiên + KC | [THÊM] Q: Khiên (40 + 30% AD + 30% AP) · [THÊM] E: Braum có từ 3 Vững → kẻ đánh Choáng 1 lượt | Vững 10%/stack, trần 80%/60% giữ cố định |
| Leona | Đỡ đòn | KC | KC + Khiên | [THÊM] nội tại: mỗi lần Nắng gây Choáng, Leona nhận Khiên (40 + 25% AD + 25% AP) | Không có số cũ |
| Malphite | Đỡ đòn | Giảm ST + ST | Giảm ST + Khiên + KC + ST | [THÊM] Q: tay từ 6 lá → Choáng 1 lượt · [THÊM] E: Khiên (30 + 20% AD + 20% AP) | Q/R mỗi lá (10 + 16% AD) → (10 + 8% AD + 8% AP) · Giảm/lá 3.5% (theo code; V2 ghi 5%) |
| Ornn | Đỡ đòn | Giáp (Rèn) | Giáp + KC | [THÊM] Q: đòn đánh kế của đồng minh được rèn Choáng mục tiêu 1 lượt | Giáp/Rèn 12 → (6 + 4% AD + 4% AP) · Sát thương/Rèn 15% giữ · Q +3 Rèn (code đang 5) |
| Katarina | Sát thủ | Burst + Làm mới | Giữ nguyên | Không | Chuyển sang nghiêng AP: Q (45 + 90% AD) → (45 + 30% AD + 60% AP) · E (25 + 60% AD) → (25 + 20% AD + 40% AP) · R (40 + 80% AD) → (40 + 25% AD + 55% AP) |
| Kha'Zix | Sát thủ | Burst | Burst + Thoát + Làm mới | [CHỦ] bộ mới: nội tại đòn đánh/Q thêm sát thương lên Cô Lập; E đổi đường với đồng minh, kẻ đối diện mới bị Cô Lập + nhận ST; R (Quick) Tàng Hình ngay + kẻ đối diện Cô Lập + thêm 1 lá Q lên tay | Nội tại ×2 → đòn đánh +(20 + 50% AD + 10% AP), Q +(40 + 90% AD + 15% AP) · Q (80 + 180% AD) → (50 + 110% AD + 20% AP) · E mới (30 + 60% AD + 10% AP) |
| Qiyana | Sát thủ | Burst + Làm mới (E) | Giữ nguyên | Không | Q (30 + 90% AD) → (30 + 90% AD + 18% AP) · R (30 + 70% AD) → (30 + 70% AD + 14% AP) |
| Ahri | Pháp sư | KC + ST | Giữ nguyên | Không | E (50 + 110% AD + 40% AP) → (50 + 50% AD + 100% AP); +70%/Say Mê giữ |
| Annie | Pháp sư | Burst + ST | + Khiên | [THÊM] E: Annie nhận Khiên (30 + 15% AD + 30% AP) | Tibbers (25 + 65% AD + 40% AP) → (25 + 35% AD + 70% AP) · Q (35 + 85% AD + 40% AP) → (35 + 40% AD + 85% AP) |
| Lissandra | Pháp sư | KC bài + ST + burst | Giữ nguyên | Không | E (30 + 75% AD + 30% AP) → (30 + 35% AD + 70% AP) · E/lá (14 + 20% AP) → (14 + 7% AD + 14% AP) · R/lá (18 + 35% AD + 25% AP) → (18 + 20% AD + 40% AP) |
| Lux | Pháp sư | ST + burst | Giữ nguyên [CHỦ] | Không | E (20 + 60% AD + 30% AP) +1.5/mana → (20 + 30% AD + 60% AP) +(0.5 + 0.5% AD + 1% AP)/mana · R (40% AP) +3.5/mana → (15% AD + 30% AP) +(1.5 + 1% AD + 2% AP)/mana · Nội tại 1.1 AP/mana giữ (đổi chỉ số) |
| Twisted Fate | Pháp sư | ST + burst | + KC | [THÊM] Q: lấy lên được lá Vàng → chọn 1 địch Choáng 1 lượt | E (5 + 25% AD + 30% AP) → (5 + 20% AD + 35% AP) · E/lá (3 + 5% AP) → (3 + 2% AD + 4% AP) · R/lá giữ (8 + 6% AD + 12% AP) |
| Viktor | Pháp sư | ST diện rộng | + Khiên | [THÊM] Q: mỗi lá bỏ, Viktor nhận Khiên (20 + 10% AD + 20% AP) | E (55 + 50% AD + 50% AP) → (55 + 35% AD + 65% AP) |
| Ashe | Xạ thủ | Tiện ích (Buốt) + ST | Giữ nguyên [CHỦ] | Không | E thêm 100% AD → (100% AD + 20% AP) · R/Buốt (60 + 55% AD) → (60 + 55% AD + 10% AP) |
| Jinx | Xạ thủ | Tiện ích (bẫy) + ST | Giữ nguyên [CHỦ] | Không | Điên +3/stack → (1 + 2% AD + 0.5% AP) · Q (70 + 170% AD) → (70 + 170% AD + 30% AP) · R (150 + 120% AD) → (150 + 120% AD + 25% AP) |
| Kog'Maw | Xạ thủ | ST | ST + Tự cứu | [THÊM] Q: Kog nhận Khiên (30 + 20% AD + 30% AP) | Đòn/Đói 2.6% → (1.6% + 0.4%/100 AD + 0.8%/100 AP) máu tối đa · R/Đói 4.5% → (2.8% + 0.7%/100 AD + 1.4%/100 AP) |
| Teemo | Xạ thủ | Tiện ích (Nấm) + ST | + KC nhẹ | [THÊM] E: mục tiêu bị Mù 1 (đòn đánh kế trượt). R [CHỦ] giữ | Nấm (50 + 35% AD) → (50 + 12% AD + 23% AP) · E (25 + 45% AD) +20/Nấm → (25 + 15% AD + 30% AP) +(8 + 5% AD + 10% AP)/Nấm · R/Nấm (18 + 12% AD) → (18 + 4% AD + 8% AP) |
| Vayne | Xạ thủ | Tự cứu (Q) + ST | Giữ nguyên | Không | Đêm (24 + 36% AD) → (24 + 36% AD + 8% AP) |
| Nami | Trợ thủ | Chỉ rút bài (không KC, không hồi) | KC + Hồi + rút bài | [CHỦ] bộ mới: nội tại rút theo tỉ lệ khi đồng minh gây ST/hồi; Q ST + Choáng + đánh dấu 3 đòn; E hồi nảy 5 lần; R hồi cả đội + Choáng cả địch. [ĐỀ XUẤT] trần nội tại 2 lá/lượt | Nội tại: tỉ lệ (5% + 0.05%/AD + 0.05%/AP của đồng minh đó), không nhân đôi cho Nami · Q (40 + 25% AD + 55% AP), mỗi đòn đánh dấu +(10 + 10% AD + 20% AP) · E mỗi lần hồi (35 + 15% AD + 35% AP) · R hồi (100 + 30% AD + 70% AP) |
| Soraka | Trợ thủ | Hồi (không KC) | Hồi + KC + Khiên | [THÊM] E: kẻ tung chiêu bị Câm Lặng 1 lượt · [THÊM] Q: hồi thừa thành Khiên cho đồng minh máu thấp nhất | Q (100 + 100% AP) → (100 + 30% AD + 60% AP) · R (190 + 100% AP) → (150 + 40% AD + 80% AP) |

### Tướng có chức năng mới do agent thêm (chủ gạch được)
Darius, Garen, Yorick, Zed, Blitzcrank, Braum, Leona, Malphite, Ornn, Annie, Twisted Fate, Viktor, Kog'Maw, Teemo, Soraka (15 tướng).
Kha'Zix và Nami cũng có bộ mới nhưng là bộ **chủ chốt**, không phải agent thêm.

## 3. Chỉ số gốc đề xuất (nâng AD)
Công thức giảm sát thương trong engine: `sát thương × 100 / (100 + Giáp)`.
Dải: AD 85–125 (trung bình cũ 74.6 → mới ≈ 103, ≈ ×1.38) · Máu 310–500 · Giáp 25–35 (1.4×) · Kháng phép 26–34 (1.31×).
Thứ tự AD: Sát thủ/Xạ thủ cao nhất, Đấu sĩ, Pháp sư, rồi Đỡ đòn/Trợ thủ. AD cũ không theo vai (Leona/Blitz 90 bằng Jinx), nên số mới đặt theo dải vai, không nhân đều ×1.4.

| Tướng | Vai | Loại ST | Máu cũ → mới | AD cũ → mới | Giáp cũ → mới | KP cũ → mới |
|---|---|---|---|---|---|---|
| Zed | Sát thủ | Vật lý | 350 → 330 | 90 → **125** | 32 → 28 | 28 → 26 |
| Kha'Zix | Sát thủ | Vật lý | 330 → 320 | 86 → **122** | 30 → 27 | 28 → 26 |
| Qiyana | Sát thủ | Vật lý | 300 → 320 | 74 → **118** | 30 → 27 | 28 → 26 |
| Katarina | Sát thủ | Phép | 300 → 320 | 82 → **115** | 30 → 26 | 30 → 28 |
| Jinx | Xạ thủ | Vật lý | 350 → 330 | 90 → **124** | 28 → 25 | 28 → 26 |
| Vayne | Xạ thủ | Vật lý | 390 → 340 | 90 → **124** | 31 → 26 | 28 → 26 |
| Ashe | Xạ thủ | Vật lý | 410 → 350 | 90 → **120** | 31 → 26 | 28 → 26 |
| Kog'Maw | Xạ thủ | Phép | 380 → 340 | 84 → **116** | 28 → 25 | 28 → 27 |
| Teemo | Xạ thủ | Phép | 300 → 310 | 78 → **112** | 28 → 25 | 28 → 26 |
| Aatrox | Đấu sĩ | Vật lý | 300 → 370 | 64 → **108** | 30 → 30 | 30 → 29 |
| Darius | Đấu sĩ | Vật lý | 300 → 380 | 62 → **108** | 35 → 31 | 30 → 29 |
| Gangplank | Đấu sĩ | Vật lý | 370 → 380 | 74 → **106** | 33 → 30 | 30 → 29 |
| Garen | Đấu sĩ | Vật lý | 300 → 400 | 60 → **104** | 33 → 33 | 31 → 31 |
| Yorick | Đấu sĩ | Vật lý | 300 → 390 | 60 → **100** | 36 → 31 | 32 → 30 |
| Ahri | Pháp sư | Phép | 380 → 340 | 76 → **98** | 28 → 25 | 30 → 28 |
| Brand | Pháp sư | Phép | 310 → 320 | 78 → **98** | 28 → 25 | 30 → 28 |
| Annie | Pháp sư | Phép | 350 → 330 | 74 → **96** | 28 → 25 | 30 → 28 |
| Twisted Fate | Pháp sư | Phép | 300 → 320 | 72 → **96** | 28 → 25 | 30 → 28 |
| Lissandra | Pháp sư | Phép | 350 → 340 | 72 → **94** | 30 → 26 | 32 → 29 |
| Lux | Pháp sư | Phép | 350 → 320 | 72 → **94** | 28 → 25 | 30 → 28 |
| Viktor | Pháp sư | Phép | 310 → 330 | 68 → **92** | 28 → 26 | 30 → 28 |
| Leona | Đỡ đòn | Vật lý | 450 → 480 | 90 → **94** | 39 → 35 | 38 → 33 |
| Blitzcrank | Đỡ đòn | Phép | 450 → 480 | 90 → **92** | 38 → 34 | 38 → 33 |
| Ornn | Đỡ đòn | Phép | 450 → 480 | 78 → **92** | 39 → 34 | 38 → 34 |
| Malphite | Đỡ đòn | Phép | 380 → 500 | 68 → **88** | 39 → 35 | 30 → 30 |
| Braum | Đỡ đòn | Phép | 430 → 470 | 66 → **86** | 39 → 35 | 38 → 34 |
| Janna | Trợ thủ | Phép | 300 → 340 | 66 → **88** | 28 → 26 | 30 → 29 |
| Nami | Trợ thủ | Phép | 360 → 350 | 66 → **88** | 28 → 25 | 32 → 29 |
| Soraka | Trợ thủ | Phép | 360 → 380 | 58 → **86** | 30 → 26 | 34 → 30 |
| Renata | Trợ thủ | Phép | 300 → 340 | 60 → **85** | 28 → 25 | 30 → 28 |

Ghi chú: Đấu sĩ cũ máu 300 (code) thấp hơn hẳn ghi chú đầu file (420/460), nên nâng lên 370–400 cho đúng vai trụ. Xạ thủ hạ máu nhẹ vì AD lên và họ bắn được mọi mục tiêu. AP gốc (nếu chủ duyệt) = AD **cũ** của tướng phép.

### Số đòn đánh thường để hạ gục (không đồ)
`số đòn = máu ÷ (AD × hệ số đòn × 100 / (100 + Giáp))`. Làm tròn lên = số đòn thật.

| Người đánh | Mục tiêu | ST mỗi đòn | Số đòn |
|---|---|---|---|
| **Điển hình:** AD 110 | máu 340, Giáp 27 | 86.6 | **3.9 → 4** |
| Jinx (124) | Lux (320, 25) | 99.2 | 3.2 → 4 |
| Zed (125 × 1.25) | Lux (320, 25) | 125.0 | 2.6 → 3 |
| Darius (108) | Lux (320, 25) | 86.4 | 3.7 → 4 |
| Jinx (124) | Darius (380, 31) | 94.7 | 4.0 → 4 |
| Ahri (98) | Jinx (330, 25) | 78.4 | 4.2 → 5 |
| Darius (108) | Garen (400, 33) | 81.2 | 4.9 → 5 |
| Janna (88) | Jinx (330, 25) | 70.4 | 4.7 → 5 |
| Jinx (124) | Leona (480, 35) | 91.9 | 5.2 → 6 |

Kết quả: mục tiêu mỏng (sát thủ/xạ thủ/pháp sư/trợ thủ) ≈ 3–4 đòn; đấu sĩ ≈ 4–5; đỡ đòn ≈ 6 (cố ý). Vì luật 3 đòn/lượt, một tướng mỏng thường chết trong 2 lượt đánh không đồ.

### Có đồ (≈2 đòn)
- Giữa trận (≈ vòng 8): 4 Kiếm Dài miễn phí = +60 AD. Người đánh điển hình 110 + 60 = 170 lên mục tiêu điển hình (340, 27): 133.9/đòn → **2.5 đòn**.
- Thêm 1 món ghép (+45 AD) = 215 AD: 169/đòn → **2.0 đòn**. Xạ thủ có món chí mạng hoặc Sát thủ (×1.25) xuống dưới 2.
- Mục tiêu lên Giáp (+30) thì quay lại ≈ 3 đòn. Như vậy "có đồ ≈ 2" chỉ đúng khi bên đánh đi đồ công còn bên chịu chưa lên Giáp.

### Lưu ý cân bằng khi nâng AD
- Chiêu có "% AD" mạnh lên cùng AD gốc (khoảng +25–40% với chiêu nặng AD). Chủ muốn đánh thốn nên tạm giữ; nếu QA thấy hạ gục quá nhanh thì giảm % AD của **chiêu**, không giảm đòn đánh thường.
- Kiếm Dài chỉ cho AD: tướng phép (hệ số AP cao) lớn chậm hơn tướng vật lý. Cân nhắc phát luân phiên Gậy Quá Khổ (+20 AP).
- Đồ tháo/lắp được + Kiếm Dài đều đặn: dễ dồn hết đồ lên một carry. Theo dõi.

## 4. Việc chờ chủ quyết
1. Duyệt/gạch 15 chức năng [THÊM] ở mục 2.
2. AP gốc cho tướng phép (đề xuất AP gốc = AD cũ).
3. Trần nội tại Nami 2 lá/lượt.
4. Tháo đồ có tốn hành động không; đồ ghép tháo ra nguyên món hay tách mảnh.
5. Luật miễn Choáng 1 lượt sau khi hết Choáng (V3 có nhiều Choáng hơn: Janna Q, Nami Q/R, Braum E, Malphite Q, Ornn Q, TF Q).
6. Trần Khiên trên một tướng (đề xuất 60% máu tối đa).
7. Renata: khống chế chỉ có ở R (1 lá) — chủ đã chốt giữ, có muốn thêm không.
