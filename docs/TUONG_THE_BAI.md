# 30 tướng bản thẻ bài thuần (bản remake toàn bộ, đã cân bằng)

Luật: `docs/LUAT_THE_BAI.md` (phần CHỐT MỚI). Engine/API: `docs/CARDGAME_API.md`. Động cơ đội hình: `docs/heroes/ENGINES.md`; dữ liệu combo/khắc chế dùng chung: `packages/shared/src/cardgame/synergy.ts`.

**Nguyên tắc thiết kế (chủ dự án):**
- **Một tướng = một mục đích.** Nội tại + Q + E + R cùng kể một câu chuyện; mỗi chiêu = hiệu ứng gốc + 1 điều kiện đọc được ngay trên bàn (tay/mộ/bộ, lá thưởng, mạng, đồ, đường, chuỗi, ô phụ). Không bộ đếm ẩn: mọi trạng thái kéo dài là status/stack/marker/token hiện trên bàn.
- **Độ khó trộn đều:** ~1/3 Đơn giản (sức mạnh thẳng), ~1/3 Vừa, ~1/3 Phức tạp (thông tin ẩn, đánh cược hai phía).
- **Đối thủ luôn có cách đáp trả thật nhưng tốn kém.** Quick chỉ dành cho tướng mà mục đích là phản ứng (Braum, Lissandra). Đòn lớn đánh trong lượt mình.
- **Q/E/R là ô lá**, không phải chiêu LMHT gốc; số lá mỗi ô theo tướng (Q 3–10, E 3–10, R 1–3; `HeroDef.skillCopies`), đấu sĩ mang ít lá chiêu, pháp sư nhiều.

Số liệu chính xác (công thức, máu, AD, số lá) luôn lấy theo code `packages/shared/src/cardgame/heroes/<id>.ts`; các mục chi tiết bên dưới có thể lệch vài con số sau đợt cân bằng cuối.

## Bảng tổng (sinh từ code sau đợt cân bằng cuối)

> **Dải chỉ số (chốt của chủ, đợt rescale 10/2026):** máu gốc 300–500, AD 60–90, Giáp 28–39, Kháng phép 28–38 (mọi chỉ số ngoài máu lệch tối đa 1,4 lần giữa tướng thấp nhất và cao nhất). Cột Máu/AD là máu gốc / AD gốc; số lá Q/E/R theo `skillCopies`.
| Tướng | Vai | Độ khó | Mục đích | Engine | Lá Q/E/R | Máu/AD | Combo cùng đội | Bị khắc bởi | Khắc |
|---|---|---|---|---|---|---|---|---|---|
| Darius | Fighter | Đơn giản | Đao phủ: rải Chảy Máu rồi kết liễu kẻ đang chảy máu | marks, lanes | 3/3/2 | 370/60 | blitzcrank, leona, nami | soraka, braum | kogmaw |
| Nami | Support | Đơn giản | Thuỷ triều nuôi bài: mỗi lá rút thành sức mạnh cho đồng đội | draw | 5/4/1 | 390/61 | viktor, zed, jinx | teemo, renata | blitzcrank |
| Braum | Tank | Vừa | Chỉ chơi trong lượt đối thủ: mọi lá là phản ứng | chain | 9/7/3 | 475/80 | kogmaw, viktor, jinx | twistedfate, malphite | darius, zed, qiyana, ahri |
| Blitzcrank | Tank | Phức tạp | Cướp bài: lá của đối thủ thành vũ khí của mình | hand, lanes | 10/6/3 | 450/85 | darius, teemo, renata | nami, soraka | viktor, twistedfate, ornn, janna |
| Zed | Assassin | Vừa | Một lượt dồn chết: nhân bản lá trong mộ bằng Bóng | grave | 6/4/2 | 380/90 | nami, blitzcrank | braum, lissandra | viktor, soraka, ashe, jinx |
| Viktor | Mage | Phức tạp | Tiến hoá bằng mộ bài: mỗi 3 lá Viktor trong mộ = 1 bậc | grave, draw | 8/7/2 | 340/69 | nami, twistedfate, braum | zed, blitzcrank | annie |
| Twisted Fate | Mage | Phức tạp | Kiểm soát bộ bài: tìm lá, soi/huỷ Nấm, xem và phá tay | draw, hand | 3/3/2 | 300/69 | darius, zed, viktor | blitzcrank, qiyana | braum, teemo, lissandra, renata |
| Soraka | Support | Đơn giản | Bền bài: lá thừa thành máu, xáo mộ để không bao giờ cạn | recycle | 6/6/2 | 500/60 | kogmaw, nami, garen | zed, katarina | darius, blitzcrank, teemo, brand |
| Teemo | Marksman | Phức tạp | Ép cạn bài: Nấm trong bộ địch, rút càng nhiều càng nổ | mill | 7/6/2 | 500/90 | ashe, blitzcrank, qiyana | twistedfate, soraka | nami, kogmaw |
| Kog'Maw | Marksman | Đơn giản | Lớn lên từ cái chết: Kog Stack sống/chết đều tăng | scaling | 5/4/2 | 320/80 | braum, soraka, nami | teemo, darius, ashe | garen, leona, malphite |
| Aatrox | Fighter | Đơn giản | Máu là đạn: tiêu máu mình để chém, yếu máu thì nguy hiểm | prizes, scaling | 4/3/1 | 320/62 | soraka, janna, leona | lissandra, vayne | garen |
| Garen | Fighter | Đơn giản | Công lý: trừng phạt phe đang dẫn trước (nhiều đồ/mạng/bài hơn) | items | 4/3/1 | 345/64 | ornn, janna, soraka | kogmaw, vayne, aatrox | katarina, khazix |
| Yorick | Fighter | Phức tạp | Người chăn hồn: lá Yorick trong mộ = linh hồn, Thiếu Nữ ở ô phụ | grave, tokens | 6/4/2 | 340/70 | zed, viktor | lux, gangplank, brand | ahri |
| Gangplank | Fighter | Phức tạp | Thùng thuốc súng ở ô phụ, kích nổ bằng Quick giữa lượt địch | items, tokens, prizes | 5/4/2 | 355/70 | ornn, twistedfate | vayne, katarina | yorick, annie |
| Leona | Tank | Vừa | Khoá chặt: Choáng/ngắt chuỗi, Ánh Dương cho đồng đội kích nổ | marks, lanes | 6/5/2 | 470/75 | darius, jinx, aatrox | malphite, kogmaw | khazix |
| Malphite | Tank | Đơn giản | Giáp là tất cả; R không thể bị nối chuỗi | items | 4/4/2 | 460/68 | ornn, leona | kogmaw, vayne, jinx | braum, leona, lissandra, janna, renata |
| Ornn | Tank | Phức tạp | Lò rèn của đội: cấp mảnh Đồ, tiêu Vàng rèn Kiệt Tác | items | 4/4/1 | 490/72 | gangplank, garen, jinx, malphite | blitzcrank, renata | katarina |
| Katarina | Assassin | Vừa | Mưa dao găm: tạo lá Dao tạm, hạ gục thì lấy lại chiêu từ mộ | grave, lanes | 6/5/2 | 365/90 | leona, lux | garen, lissandra, ornn | soraka, gangplank, annie, lux |
| Kha'Zix | Assassin | Vừa | Săn mồi cô lập; tiến hoá theo lá thưởng đã lật | lanes, prizes | 5/4/2 | 400/90 | brand, blitzcrank | garen, leona, annie | lux, ashe, vayne |
| Qiyana | Assassin | Phức tạp | Nguyên tố = lá trên cùng mộ bài; tự đốt bài để đổi | grave, mill | 5/4/2 | 360/84 | teemo, malphite | lux, braum | twistedfate |
| Ahri | Mage | Vừa | Quyến Rũ rồi khai thác mục tiêu bị Quyến Rũ | lanes | 8/8/2 | 405/76 | lux, leona | yorick, braum | vayne |
| Annie | Mage | Đơn giản | Gấu Tibbers ở ô phụ là trung tâm mọi lá | tokens, grave | 8/6/2 | 380/71 | braum, janna | gangplank, katarina, viktor | khazix |
| Lissandra | Mage | Vừa | Băng giá: Buốt là chìa khoá; Quan Tài Băng nối chuỗi | chain, prizes | 10/10/3 | 430/90 | ashe, brand | malphite, twistedfate | zed, aatrox, katarina |
| Lux | Mage | Vừa | Chiếu Sáng rồi kích nổ; R xuyên cả hàng | marks | 8/8/2 | 380/73 | leona, ahri, nami | katarina, khazix | yorick, qiyana |
| Ashe | Marksman | Đơn giản | Đóng băng nhịp đối thủ: Buốt tướng, đẩy lá chiêu địch xuống đáy bộ | mill, marks | 5/5/2 | 385/90 | teemo, lissandra | zed, khazix | kogmaw |
| Jinx | Marksman | Đơn giản | Phấn khích dây chuyền: mỗi hạ gục mở đòn tiếp + bài | items, draw | 3/3/1 | 300/60 | ornn, nami, leona | zed, janna | malphite |
| Vayne | Marksman | Vừa | Săn tank: 3 Mũi Tên Bạc theo % máu, Kết Án ghim tường giữa chuỗi | marks, lanes | 5/4/2 | 430/90 | janna, ornn | ahri, khazix | aatrox, garen, gangplank, malphite |
| Janna | Support | Vừa | Chống đòn đánh: thổi bay đòn tay giữa chuỗi | marks | 6/5/2 | 500/63 | jinx, vayne, kogmaw | malphite, blitzcrank | jinx, brand |
| Brand | Mage | Phức tạp | Lửa lan: Bỏng (stack hiện) tự cháy mỗi lượt hoặc kích nổ ngay; chết thì lan | marks | 6/6/2 | 380/84 | khazix, lissandra, lux | soraka, janna | yorick |
| Renata Glasc | Support | Phức tạp | Lật kèo: đồng minh sắp chết vẫn đứng dậy, địch càng mạnh càng tự hại | hand, chain | 5/4/1 | 310/60 | blitzcrank, lux | twistedfate, malphite | nami, ornn |

## Vòng khắc chế chính
- **Rút nhiều** (Nami, Viktor, Twisted Fate) ← **Teemo** (Nấm trong bộ, rút càng nhiều càng nổ) ← **Twisted Fate / Ashe / Soraka** (lục bộ huỷ Nấm, soi đẩy bài, xáo mộ nạp lại bộ) ← **Blitzcrank** (cướp lá vừa tìm) ← **Nami / Soraka** (rút bù, lá bị ép bỏ thành máu).
- **Dồn chết bằng chiêu** (Zed, Darius, Katarina) ← **phản ứng** (Braum, Lissandra, Janna) ← **không thể nối chuỗi / soi tay** (Malphite, Twisted Fate) ← **rã giáp, % máu** (Kog'Maw, Vayne).
- **Vật triệu hồi ở ô phụ** (Annie, Yorick, Gangplank) ← **xạ thủ + Trừng Phạt** (chỉ đòn đánh của xạ thủ và phép Trừng Phạt nhắm được token) ← **đỡ đòn khiêu khích**.
- Annie, Yorick, Gangplank cùng dùng Ô triệu hồi phụ (mỗi phe 1 ô): chọn chung thì tranh ô; bot/selfplay tránh ghép (`cg.clashesExtraZone`).

## Chỉ số đội hình (selfplay 1000 trận, seed 1, đội 5, `--pairs`)
Selfplay bằng bot tham lam (chấm điểm từng hành động); cặp combo/khắc chế đo bằng tỉ lệ thắng của đội có cặp đó. Kết quả gộp ~50% cho thấy bot tham lam chưa khai thác combo có chủ đích (bot thông minh là việc tiếp theo); các cặp nổi bật xem báo cáo cân bằng.

---

## Nami: Thuỷ triều nuôi bài (Trợ thủ, phép) · Đơn giản
**Mục đích:** mỗi lá rút thành sức mạnh cho đồng đội. **Engine:** draw. **Combo:** Viktor, Zed, Jinx. **Bị khắc bởi:** Teemo, Renata.
- **Nội tại, Thuỷ Triều:** mỗi lá rút nhờ lá chiêu, đồng minh máu thấp nhất hồi {15 + 10% AP}.
- **Q ×6, Sóng Triều:** rút 2. *Điều kiện:* mỗi lá chiêu rút được của tướng mình đang trên sân thì tướng đó nhận Phước Lành (đòn kế miễn phí).
- **E ×6, Phước Lành:** 1 đồng minh: đòn kế miễn phí + {40 + 20% AP} phép. *Điều kiện:* đòn đó chí mạng thì rút 1.
- **R ×2, Đại Hồng Thuỷ:** rút 2, mọi tướng mình nhận Phước Lành. *Điều kiện:* còn ≤3 mạng thì rút 4.
- **Cách khắc:** Teemo (rút nhiều thì nổ Nấm nhiều), Renata (tay to thì Thâu Tóm/Bắt Tay mạnh hơn).

## Viktor: Tiến hoá bằng mộ bài (Pháp sư, phép) · Phức tạp
**Mục đích:** đánh càng nhiều lá Viktor, mộ càng dày, cả ba chiêu càng mạnh. **Engine:** grave, draw. **Combo:** Nami, Twisted Fate, Braum. **Bị khắc bởi:** Zed, Blitzcrank.
- **Nội tại, Tiến Hoá Vinh Quang:** bậc mọi chiêu = số lá Viktor trong mộ ÷ 3 (tối đa 3), nhìn thấy ngay ở mộ. Bộ bài: 8 Q, 7 E, 2 R, 5 Đánh thường.
- **Q, Tia Hấp Thụ:** sát thương + Khiên. Bậc 1 +20% · bậc 2 Khiên ×2 · bậc 3 rút 1.
- **E, Tia Huỷ Diệt:** tối đa 2 địch. Bậc 1 +20% · bậc 2 Buốt · bậc 3 dư chấn ngay 50%.
- **R, Bão Hỗn Loạn:** bão bám 3 lượt (đánh ngay 1 lần). Bậc 1 +1 lượt · bậc 2 Câm Lặng · bậc 3 mỗi Q/E bão đánh thêm.
- **Cách khắc:** dồn chết sớm (Zed); cướp lá trước khi vào mộ (Blitzcrank); Soraka đồng đội xáo mộ thì mất bậc (chống combo).

## Teemo: Ép cạn bài (Xạ thủ, phép) · Phức tạp
**Mục đích:** trừng phạt đội rút nhiều bằng Nấm úp trong bộ bài địch. **Engine:** mill. **Combo:** Ashe, Blitzcrank, Qiyana. **Bị khắc bởi:** Twisted Fate, Soraka.
- **Nội tại, Nấm Độc:** Nấm trong bộ địch: rút trúng thì nổ ({120 + 30% AP} lên tướng ít máu nhất) và đốt 3 lá trên cùng.
- **Q, Trồng Nấm:** xáo 2 Nấm vào bộ địch. *Điều kiện:* bộ địch <30 lá thì 3 Nấm.
- **E, Bẫy Trên Đường:** đặt 1 Nấm lên **trên cùng** bộ địch. *Điều kiện:* tay địch ≥6 lá thì 2 Nấm.
- **R, Mùa Nấm:** xáo 3 Nấm. *Điều kiện:* lượt kế của địch mỗi Nấm đốt 4 lá.
- **Cách khắc:** TF E lục bộ huỷ hết Nấm; Ashe/soi bộ; Soraka xáo mộ nạp lại bộ.

## Twisted Fate: Kiểm soát bộ bài (Pháp sư, phép) · Phức tạp
**Mục đích:** luôn có đúng lá mình cần và phá đúng lá đối thủ cần. **Engine:** draw, hand. **Combo:** Darius, Zed, Viktor. **Bị khắc bởi:** Blitzcrank, Qiyana.
- **Nội tại, Bàn Tay Vàng:** ghép đồ bằng lá Vàng thì rút 1.
- **Q, Chọn Bài:** Xanh rút 2 · Đỏ sát thương mọi địch · Vàng sát thương + Choáng + nhận 1 Vàng. *Điều kiện:* đang cầm lá Vàng thì mạnh thêm 50%.
- **E, Xào Bài:** lục bộ lấy 1 lá bất kỳ, huỷ mọi Nấm của địch trong bộ. *Điều kiện:* lấy lá R thì bỏ 1 lá.
- **R, Định Mệnh:** xem tay đối thủ, chọn 1 lá cho họ bỏ. *Điều kiện:* lá đó là lá Quick thì rút 1.
- **Cách khắc:** Blitzcrank cướp lá vừa lục; Qiyana dồn sát thương nhanh.

## Renata Glasc: Lật kèo (Trợ thủ, phép) · Phức tạp
**Mục đích:** đội đang thua là lúc nguy hiểm nhất. **Engine:** hand, prizes. **Combo:** Blitzcrank, Lux. **Bị khắc bởi:** Twisted Fate, Malphite.
- **Nội tại, Cứu Trợ:** đồng minh sắp bị hạ còn 1 máu + status Cứu Trợ tới hết lượt sau của bạn; hạ được 1 địch thì sống tiếp, không thì bị hạ.
- **Q, Bắt Tay:** kéo + {60 + 40% AP} + Choáng. *Điều kiện:* đội ít mạng hơn thì cướp 1 lá.
- **E, Gói Cứu Trợ:** Khiên {40 + 30% AP} + 20% máu đã mất, +20% sát thương. *Điều kiện:* dưới 40% máu (hoặc đang Cứu Trợ) thì đòn kế miễn phí.
- **R, Thâu Tóm:** mọi tướng địch tung đòn đánh đầy đủ vào đồng đội của nó: càng mạnh càng tự hại. *Điều kiện:* đội ít mạng hơn thì đánh 2 lần.
- **Cách khắc:** đừng để Cứu Trợ hạ được ai (giữ máu tướng mình cao, Choáng tướng đang Cứu Trợ); TF bỏ lá R; Malphite dồn chết cả đội cùng lúc.

## Brand: Lửa lan (Pháp sư, phép) · Phức tạp
**Mục đích:** Bỏng (stack hiện trên tướng): để cháy dần hay kích nổ ngay. **Engine:** marks. **Combo:** Kha'Zix, Lissandra, Lux. **Bị khắc bởi:** Soraka, Janna.
- **Nội tại, Bùng Cháy:** chiêu cho stack Bỏng (tối đa 5); đầu lượt tướng bị Bỏng mất {12 + 8% AP} mỗi stack; tướng Bỏng chết thì lửa lan sang tướng kề đường.
- **Q, Thiêu Rụi:** {45 + 40% AP} +2 Bỏng. *Điều kiện:* đang Bỏng thì Choáng.
- **E, Hoả Ngục:** chỉ nhắm tướng đang Bỏng: kích nổ mỗi stack {75 + 25% AP}. *Điều kiện:* nổ ≥3 stack thì tướng kề nhận 2 Bỏng.
- **R, Bão Lửa:** mọi địch {90 + 30% AP} +2 Bỏng (+3 nếu đang Bỏng).
- **Cách khắc:** hồi máu/xoá thời gian (Soraka), tách đội khỏi đường kề để lửa không lan, giết Brand trước khi stack đủ.


# Nhóm G2: Darius, Zed, Katarina, Kha'Zix, Qiyana, Aatrox, Garen, Vayne

Mỗi tướng có: mục đích (1 dòng), độ khó, số lá chiêu (`skillCopies`), engine, combo, bị khắc bởi, khắc ai, và cách đối thủ trả lời.
"Khắc ai" suy ra từ cột "Bị khắc bởi" trong `ENGINES.md`. Mọi trạng thái đều hiện trên bàn (status/stack trên tướng, mộ bài, lá thưởng, mạng, đường).

| Tướng | Độ khó | Q/E/R | Engine |
|---|---|---|---|
| Darius | Đơn giản | 4/3/2 | marks, lanes |
| Garen | Đơn giản | 4/3/1 | items, prizes |
| Aatrox | Vừa | 5/4/2 | scaling |
| Kha'Zix | Vừa | 6/4/2 | lanes, prizes |
| Vayne | Vừa | 5/4/2 | marks, lanes (bỏ chain: không còn lá Quick) |
| Katarina | Phức tạp | 6/5/2 | lanes, grave |
| Zed | Phức tạp | 6/4/2 | grave |
| Qiyana | Phức tạp | 6/5/2 | grave, mill |

## Darius (Đơn giản, Q4 E3 R2)
- **Mục đích:** Đao phủ: rải Chảy Máu, kéo kẻ đang chảy máu ra trước mặt, kết liễu khi máu nó ≤ 10% máu tối đa × số dấu (Kề Đao).
- **Engine:** marks, lanes.
- **Combo:** Blitzcrank (kéo thêm mục tiêu vào tầm), Leona (Choáng giữ mục tiêu đứng yên chịu dấu), Nami (bơm bài cho chuỗi Q-R).
- **Bị khắc bởi:** Soraka (hồi máu ra khỏi ngưỡng Kề Đao), Braum (đổi mục tiêu Máy Chém).
- **Khắc:** Kog'Maw.
- **Đối thủ trả lời:** thả diều / chặn bằng tướng khác, dùng Bình Máu hoặc hồi máu đưa mục tiêu ra khỏi ngưỡng, đợi dấu hết hạn (2 lượt), hoặc dồn chết Darius trước khi hắn lăn cầu tuyết.

## Garen (Đơn giản, Q4 E3 R1)
- **Mục đích:** Công lý Demacia: phe địch dẫn trước ở mỗi hạng mục (mạng, tổng đồ, số lá trên tay) thì Garen mạnh thêm 15%.
- **Engine:** items (phạt kẻ nhiều đồ), prizes (R lật thêm lá thưởng khi đang thua mạng).
- **Combo:** Ornn, Janna, Soraka (giữ Garen sống để đổi đòn khi đang bị dẫn).
- **Bị khắc bởi:** Kog'Maw, Vayne (thả diều, % máu).
- **Khắc:** Katarina, Kha'Zix.
- **Đối thủ trả lời:** đừng dẫn lộ liễu (tiêu bớt bài trên tay, dồn đồ cho tướng ở xa Garen), hoặc bắn Garen từ xa bằng xạ thủ.

## Aatrox (Vừa, Q5 E4 R2)
- **Mục đích:** Máu là đạn: Q tiêu máu chính mình để chém, càng mất máu càng đau, E hút máu nạp đạn, R Kẻ Diệt Thế đốt 30% máu để không gục ở đòn hạ gục đầu tiên.
- **Engine:** scaling.
- **Combo:** Soraka, Janna (hồi/khiên cho Aatrox đứng ở vùng máu thấp an toàn), Leona.
- **Bị khắc bởi:** Lissandra (khống chế lúc hắn thấp máu), Vayne (sát thương chuẩn theo % máu tối đa).
- **Khắc:** (không có trong bảng).
- **Đối thủ trả lời:** dồn sát thương lớn đúng lúc Aatrox thấp máu (sát thương chuẩn, % máu), cần 2 đòn hạ gục khi hắn có Kẻ Diệt Thế, hoặc thả diều để hắn tự tiêu máu mà không có ai để hút.

## Kha'Zix (Vừa, Q6 E4 R2)
- **Mục đích:** Săn mồi cô lập: tướng địch không có đồng đội ở 2 đường kề bên là Cô Lập (+40% sát thương); vồ tới rồi Tàng Hình; tiến hoá theo số lá thưởng phe mình đã lật.
- **Engine:** lanes, prizes.
- **Combo:** Brand, Blitzcrank (kéo/tách mục tiêu khỏi đội hình).
- **Bị khắc bởi:** Garen (chiêu đánh cả đường kề), Leona (Khiêu khích, đứng cụm).
- **Khắc:** Lux, Ashe, Vayne (xạ thủ/pháp sư đứng lẻ).
- **Đối thủ trả lời:** đứng thành cụm (gọi tướng lấp đường kề), Khiêu khích, hoặc chiêu đánh mọi tướng (Tàng Hình không né được).

## Vayne (Vừa, Q5 E4 R2)
- **Mục đích:** Săn tank: Mũi Tên Bạc (số mũi hiện trên tướng) nổ ở mũi thứ 3 theo 12% máu tối đa; Kết Án đẩy ra mép, bị ghim vào tường mà đã mang mũi thì Choáng.
- **Engine:** marks, lanes. *(ENGINES.md ghi chain; theo luật mới "Quick chỉ cho tướng phản ứng", Kết Án là lá thường trong lượt Vayne.)*
- **Combo:** Janna (giữ Vayne sống), Ornn (đồ cho xạ thủ).
- **Bị khắc bởi:** Ahri, Kha'Zix (vồ xạ thủ đứng lẻ).
- **Khắc:** Aatrox, Garen, Malphite, Gangplank.
- **Đối thủ trả lời:** đứng cạnh đồng đội (đẩy vào ô có đồng đội chỉ đổi chỗ, không bị ghim), đợi mũi rơi (2 lượt), hoặc dồn chết Vayne mỏng máu.

## Katarina (Phức tạp, Q6 E5 R2)
- **Mục đích:** Mưa dao găm: cắm Dao Găm lên đường (stack `daggerN` = số lượt còn lại), lướt tới đường có dao để chém, bỏ lại dao ở chỗ vừa rời; hạ gục thì lấy lại Q/E từ mộ.
- **Engine:** lanes, grave.
- **Combo:** Leona (Choáng giữ địch đứng ở đường có dao), Lux.
- **Bị khắc bởi:** Garen, Lissandra (khống chế / chịu đòn ngay đường dao).
- **Khắc:** Soraka, Gangplank, Annie, Lux.
- **Đối thủ trả lời:** Choáng/Câm Lặng Katarina trước lượt cô (dao chỉ sống 2 lượt của cô), đổi mục tiêu khi cô lướt, hoặc chấp nhận để trống đường có dao.

## Zed (Phức tạp, Q6 E4 R2)
- **Mục đích:** Một lượt dồn chết từ mộ bài: các lượt đầu nuôi mộ bằng lá Zed (+3% sát thương mỗi lá), lượt kết liễu đặt Dấu Ấn (số đòn hiện trên dấu), E gọi Bóng nhân bản Q/R trong mộ, dấu nổ cuối lượt theo số đòn.
- **Engine:** grave.
- **Combo:** Nami (rút bài nuôi mộ và tìm lá), Blitzcrank.
- **Bị khắc bởi:** Braum (đổi mục tiêu giữa chuỗi), Lissandra (Choáng làm lá Zed fizzle).
- **Khắc:** Soraka, Viktor, Ashe, Jinx.
- **Đối thủ trả lời:** nối chuỗi trong lượt Zed dồn (đổi mục tiêu, Choáng làm fizzle), hoặc khiên/hồi máu cho mục tiêu mang Dấu Ấn trước khi dấu nổ; tay Zed bí mật nên phải đoán lượt nào hắn có đủ Bóng.

## Qiyana (Phức tạp, Q6 E5 R2)
- **Mục đích:** Nguyên tố = lá trên cùng mộ bài của bạn (Đá: Vàng/Đồ → Choáng; Sông: Bình Máu/Rút Bài/Bổ Trợ → Buốt; Cỏ: Đánh thường/lá chiêu → +40% sát thương). E tự đốt bài để đổi nguyên tố (đánh cược lá trên cùng bộ), R đốt 3 lá bộ địch và lấy mọi nguyên tố lật được.
- **Engine:** grave, mill.
- **Combo:** Teemo (cùng ép cạn bộ địch), Malphite.
- **Bị khắc bởi:** Lux, Braum.
- **Khắc:** Twisted Fate.
- **Đối thủ trả lời:** đổi lá trên cùng mộ của Qiyana (bắt cô bỏ bài / đốt bộ của cô), phản ứng trong lượt cô; cô tự đốt bộ nên càng chơi càng gần cạn bài.

## Ánh xạ art (lá -> chữ chiêu LoL cho `scripts/card_skill_art.py`)
| Lá | Icon LoL |
|---|---|
| darius_q / e / r | Darius Q / E / R |
| zed_q / e / r | Zed Q / W (Phân Thân Bóng Tối) / R |
| katarina_q / e / r | Katarina Q / E / R |
| khazix_q / e / r | Kha'Zix Q / E / R |
| qiyana_q / e / r | Qiyana Q / W (Bẻ Cong Địa Hình) / R |
| aatrox_q / e / r | Aatrox Q / W (Xiềng Xích) / R |
| garen_q / e / r | Garen Q / E / R |
| vayne_q / e / r | Vayne Q / E / R |


# Nhóm G3: Braum, Blitzcrank, Leona, Malphite, Ornn, Janna, Soraka, Yorick

Mỗi tướng: mục đích (1 dòng) · độ khó · số lá Q/E/R (`HeroDef.skillCopies`) · engine · combo · bị khắc bởi · khắc ai · đối thủ trả lời thế nào.
Chỉ Braum có lá Quick (mục đích của Braum là phản ứng). Mọi trạng thái đều hiện trên bàn: status/stack trên tướng, số lá trong mộ/tay/bộ, token ở ô phụ.
Test: `npx tsx scripts/card_tests_g3.ts`.

## Braum · Phức tạp · Q5 E4 R2
- **Mục đích:** Bức tường phản ứng. Braum chỉ chơi trong lượt đối thủ: mọi lá là Quick chỉ-nối-chuỗi để đỡ cho đồng đội.
- **Nội tại Bức Tường Freljord:** mỗi lá Quick của Braum giải quyết xong thì rút 1 lá.
- **Q Đứng Sau Tôi:** đòn/chiêu đơn nhắm tướng mình thì đổi mục tiêu sang Braum, Braum nhận Khiên; nếu đã có Khiên thì phản 30% sát thương.
- **E Bất Khả Xâm Phạm:** gặp chiêu nhiều mục tiêu thì cả đội nhận ít hơn 40% sát thương; nếu là R thì miễn luôn khống chế.
- **R Vết Nứt Băng Giá:** chặn trọn 1 lá chiêu (0 sát thương, 0 khống chế), kẻ tung trúng sát thương + Buốt; tay còn từ 2 lá Braum thì trúng mọi tướng địch.
- **Engine:** chain. **Combo:** kogmaw, jinx, viktor (carry được che). **Bị khắc:** malphite (R không thể nối chuỗi), twistedfate/blitzcrank (thấy/cướp lá phản ứng đang giữ). **Khắc:** zed, darius, lux (dồn sát thương bằng chiêu).
- **Đối thủ trả lời:** đánh lá rẻ trước để dụ Braum dùng phản ứng (đối thủ không biết Braum đang giữ lá gì), dùng chiêu không thể nối chuỗi, hoặc cướp/xem tay; Braum trả giá vì lá của hắn chết hẳn trong lượt mình.

## Blitzcrank · Phức tạp · Q6 E4 R1
- **Mục đích:** Kẻ cướp bài: tay đối thủ là kho vũ khí của Blitzcrank; tay địch càng mỏng thì càng dễ bị đấm gục.
- **Nội tại Lò Phản Ứng:** lá chiêu cướp được thành thẻ chiêu chung cùng chữ; mỗi lá cướp được thì +5 giáp/kháng vĩnh viễn (tối đa +30, stack `bonusRes`).
- **Q Bàn Tay Hoả Tiễn:** cướp 1 lá ngẫu nhiên; nếu là lá chiêu của tướng địch trên sân thì móc tướng đó về đối diện Blitzcrank và gây sát thương.
- **E Đấm Móc:** đánh tướng đối diện miễn phí + sát thương; tay đối thủ ≤3 lá thì Choáng.
- **R Trường Điện Từ:** đối thủ bỏ 2 lá ngẫu nhiên; mọi địch nhận sát thương + Câm Lặng (tay còn ≤2 thì Choáng).
- **Engine:** hand, lanes. **Combo:** darius (Blitz kéo vào đường, Darius chém), teemo (cùng ép tài nguyên), renata. **Bị khắc:** soraka (lá bị ép bỏ thành máu), nami (rút bù). **Khắc:** braum, janna, ornn (giữ lá/Vàng trên tay).
- **Đối thủ trả lời:** đánh hết lá ra, không ôm tay; Q cướp ngẫu nhiên nên có thể chỉ trúng lá rác (một ván cược với cả hai bên).

## Leona · Vừa · Q5 E4 R2
- **Mục đích:** Khoá một mục tiêu cho cả đội: chất Ánh Dương, đồng đội đánh trúng thì dấu nổ; đủ 3 dấu thì nổ kèm Choáng.
- **Nội tại Ánh Dương:** status `sunlight` (v = 1..3, hết sau lượt kế của mục tiêu). Đồng minh khác (cả token) đánh/chiêu trúng thì nổ mỗi dấu {30 + 50% Giáp + 20% AP}; nổ 3 dấu thì Choáng.
- **Q Khiên Bình Minh:** đánh đối diện miễn phí + 2 dấu; đã có dấu thì Choáng.
- **E Thiên Đỉnh Kiếm:** Leona đổi sang đường đối diện 1 tướng địch, sát thương + 1 dấu; đã có dấu thì Choáng.
- **R Thái Dương Hạ San:** tối đa 3 địch: sát thương + đầy 3 dấu; đã có dấu thì Choáng ngay.
- **Engine:** marks, lanes. **Combo:** jinx, darius, yorick (Thây Ma đánh mỗi lượt sẽ kích nổ). **Bị khắc:** janna (làm Mù đòn kích nổ), malphite. **Khắc:** khazix, zed (sát thủ lao vào bị khoá).
- **Đối thủ trả lời:** dấu hết hạn sau lượt kế của nó; đối thủ chặn/làm Mù/hạ đồng đội sẽ kích nổ, hoặc chấp nhận một lượt né.

## Malphite · Đơn giản · Q4 E4 R2
- **Mục đích:** Giáp là tất cả: mọi lá tính theo Giáp, nuốt mảnh Đồ để hoá đá, R không lá Quick nào chặn được.
- **Nội tại Khiên Đá Granite:** đầu lượt, không có Khiên thì nhận Khiên {200% Giáp}.
- **Q Mảnh Chấn Địa:** sát thương theo Giáp + Rã giáp; Giáp mục tiêu thấp hơn Giáp Malphite thì +50%.
- **E Hoá Đá:** có thể bỏ 1 lá Đồ: +10 giáp/kháng vĩnh viễn (tối đa +60); rồi Khiên {120% Giáp}, gấp đôi nếu đeo ≥2 món.
- **R Lao Thẳng:** không thể bị nối chuỗi; mọi địch nhận sát thương theo Giáp + Choáng; đang có Khiên thì thêm 50% lượng Khiên.
- **Engine:** items. **Combo:** ornn (Ornn cấp lá Đồ mỗi lượt cho Malphite nuốt, Kiệt Tác nhân đôi giáp đồ), leona (R Choáng cả đội rồi nổ dấu). **Bị khắc:** vayne, kogmaw (sát thương % máu/chuẩn). **Khắc:** braum, janna, lissandra (lối chơi phản ứng).
- **Đối thủ trả lời:** sát thương chuẩn / theo % máu, phá Khiên trước khi hắn tung R (tốn một đòn đánh); Malphite trả giá bằng các lá Đồ đáng lẽ dùng để ghép đồ.

## Ornn · Vừa · Q5 E6 R1
- **Mục đích:** Lò rèn của đội: Ornn không gây sát thương mà cấp mảnh Đồ, tìm Vàng và rèn đồ đồng đội thành Kiệt Tác (stack `itemAmp`, +100% = gấp đôi chỉ số đồ).
- **Nội tại Lò Rèn Sống:** đầu lượt, tay không có lá Đồ thì tạo 1 lá Đồ.
- **Q Thổi Bễ:** tìm 1 Vàng (nếu chưa có) hoặc 1 Đồ trong bộ; Khiên cho Ornn; nếu đủ 2 Đồ + 1 Vàng thì rút 1.
- **E Rèn Kiệt Tác:** bỏ 1 Vàng: đồ của 1 đồng minh +50% (tối đa +100%); đồng minh đủ 3 món thì rút 1.
- **R Lời Hiệu Triệu Thần Rèn:** tối đa 2 đồng minh được rèn ngay 1 món ngẫu nhiên + Khiên; ai đủ 3 món thì +50% Kiệt Tác.
- **Engine:** items. **Combo:** malphite, garen, jinx, gangplank. **Bị khắc:** blitzcrank (cướp Vàng/Đồ trên tay), renata. **Khắc:** lux, ahri (sát thương phép dồn vào đồng minh có kháng phép nhân đôi).
- **Đối thủ trả lời:** cướp hoặc ép bỏ Vàng trước khi rèn, dồn hạ carry đang mang Kiệt Tác; Ornn trả giá vì mỗi lá Vàng tiêu cho Kiệt Tác là một món đồ không ghép được.

## Janna · Đơn giản · Q7 E7 R2
- **Mục đích:** Làm chủ đòn đánh: gió làm đòn đánh của địch trượt (Mù), và tiếp gió cho đồng đội đánh miễn phí.
- **Nội tại Mắt Gió:** đòn đánh của địch nhắm tướng mình bị trượt thì tướng bị nhắm nhận Khiên.
- **Q Gió Lốc:** sát thương + Mù 1 đòn (số đòn hiện trên tướng, tối đa 3); xạ thủ/sát thủ bị Mù 2 đòn.
- **E Mắt Bão:** Khiên + 1 đòn đánh miễn phí cho đồng minh; địch đối diện đang Mù thì Khiên +50%.
- **R Gió Mùa:** cả đội hồi máu, mọi địch Mù 1 đòn (đội còn ≤3 mạng thì 2 đòn).
- **Engine:** marks (Mù là dấu trên tướng địch). Không còn lá Quick theo luật mới (ENGINES.md cũ ghi chain). **Combo:** jinx, vayne, kogmaw (đòn miễn phí), leona (đòn miễn phí kích nổ Ánh Dương). **Bị khắc:** malphite, blitzcrank. **Khắc:** ashe, vayne, jinx khi ở phe địch (xạ thủ phụ thuộc đòn đánh), leona.
- **Đối thủ trả lời:** dùng chiêu thay cho đòn đánh (Mù chỉ chặn đòn đánh), hoặc bỏ một lá Đánh thường rẻ để xả Mù (lá đó phí và Janna được Khiên); Mù hết sau lượt kế.

## Soraka · Vừa · Q6 E6 R3
- **Mục đích:** Bền bài: không lá nào phí. Lá thừa/lá chết bỏ đi thành máu, mộ được đưa lại vào bộ để đội không bao giờ cạn bài.
- **Nội tại Sao Băng:** mỗi lá bị bỏ khỏi tay (kể cả do đối thủ ép bỏ, trừ tràn tay) thì đồng minh máu thấp nhất được hồi máu.
- **Q Gieo Sao:** xáo 3 lá trên cùng mộ vào bộ, hồi máu mỗi lá; bộ ít hơn mộ thì rút 1.
- **E Hiến Tế:** bỏ bao nhiêu lá tuỳ ý, mỗi lá hồi cho 1 đồng minh (lá chết +50%).
- **R Nguyện Ước:** cả đội hồi máu, xáo toàn bộ mộ vào bộ; bộ <10 lá thì cả đội có thêm Khiên.
- **Engine:** recycle. **Combo:** kogmaw, nami (rút nhiều mà không cạn bài), garen, yorick (Yorick đào bộ, Soraka gieo lại). **Bị khắc:** zed, katarina (dồn chết nhanh hơn tốc độ hồi). **Khắc:** teemo, ashe (ép cạn bài), blitzcrank (bị ép bỏ thì lại thành máu).
- **Đối thủ trả lời:** dồn hạ trong 1 lượt thay vì đánh rỉ máu; Soraka không có sát thương nên đội phải thắng nhờ người khác.

## Yorick · Vừa · Q6 E4 R2
- **Mục đích:** Người chăn hồn: tự đào bộ bài vào mộ; mỗi lá Yorick trong mộ là 1 Linh Hồn; R gọi Thây Ma Sương Mù vào ô phụ, máu theo số lá trong mộ, sức đánh theo số Linh Hồn.
- **Nội tại Người Chăn Hồn:** cuối lượt mình, Thây Ma +1 sức đánh mỗi Linh Hồn, đánh tướng địch ít máu nhất, rồi mất 1 lượt tồn tại (stack `turns`, từ 3, về 0 thì tan).
- **Q Nghi Thức Cuối:** sát thương đối diện, đào 2 lá trên cùng bộ của mình vào mộ; mỗi lá Yorick bị đào lên thì hồi máu.
- **E Sương Sầu:** sát thương + Rã giáp 1 địch; có Thây Ma thì nó đánh ngay mục tiêu đó.
- **R Khúc Ai Ca Quần Đảo:** Thây Ma Sương Mù: máu 150 + 20/lá mộ, sức đánh 30 + 10/Linh Hồn, tồn tại 3 lượt; từ 4 Linh Hồn thì làm máu ảo cho Yorick.
- **Engine:** grave, tokens. **Combo:** zed, viktor (đào bộ làm dày mộ cho họ), leona (Thây Ma kích nổ Ánh Dương), soraka. **Bị khắc:** lux, gangplank; xạ thủ địch (theo luật chung chỉ đòn Đánh thường của xạ thủ phá được token ở ô phụ). **Khắc:** ahri (vật triệu hồi đứng ngoài đường).
- **Đối thủ trả lời:** xạ thủ dùng lá Đánh thường bắn Thây Ma, hạ Yorick (Thây Ma tan theo), hoặc câu giờ 3 lượt; Yorick trả giá bằng việc tự đào bộ bài, tiến gần tới thua do cạn bài.

## Art (icon chiêu LoL cho scripts/card_skill_art.py)
braum {q:W, e:E, r:R} · blitzcrank {q:Q, e:E, r:R} · leona {q:Q, e:E, r:R} · malphite {q:Q, e:W, r:R} · ornn {q:W, e:P(nội tại Living Forge; nếu script không có P thì E), r:R} · janna {q:Q, e:E, r:R} · soraka {q:Q, e:W, r:R} · yorick {q:Q, e:E, r:R}


# Nhóm G4: Kog'Maw, Jinx, Ashe, Lux, Ahri, Annie, Lissandra, Gangplank

Code: `packages/shared/src/cardgame/heroes/<id>.ts` · tiếng Anh: `packages/shared/src/cardgame/i18n/en_g4.ts` · test: `npx tsx scripts/card_tests_g4.ts`.
Engine theo `docs/heroes/ENGINES.md`. Mọi trạng thái người chơi cần nhớ đều hiện trên bàn (status/stack trên tướng hoặc trên token, số mạng, số lá bộ/tay).
Độ phức tạp: **Đơn giản** 3 (Kog'Maw, Jinx, Lux) · **Vừa** 3 (Ashe, Ahri, Annie) · **Phức tạp** 2 (Lissandra, Gangplank). Chỉ Lissandra có lá Quick (tướng phản ứng).

| Tướng | Độ khó | Số lá Q/E/R | Engine |
|---|---|---|---|
| Kog'Maw | Đơn giản | 5 / 4 / 2 | scaling (+ lật kèo theo mạng) |
| Jinx | Đơn giản | 5 / 4 / 2 | items, draw |
| Ashe | Vừa | 5 / 5 / 2 | mill, marks |
| Lux | Đơn giản | 8 / 8 / 2 | marks |
| Ahri | Vừa | 7 / 7 / 2 | lanes (+ hand) |
| Annie | Vừa | 8 / 6 / 2 | tokens |
| Lissandra | Phức tạp | 8 / 6 / 2 | chain, prizes |
| Gangplank | Phức tạp | 6 / 5 / 2 | items, tokens |

Luật chung có lợi cho nhóm: chỉ **đòn Đánh thường của xạ thủ** nhắm được token ở ô phụ, nên ba xạ thủ G4 (Kog'Maw, Jinx, Ashe) là câu trả lời tự nhiên cho Thùng Thuốc Súng của Gangplank và Tibbers của Annie. Annie và Gangplank **không nên chung đội**: cả hai cần Ô triệu hồi phụ duy nhất của phe.

## Kog'Maw (Đơn giản)
- **Mục đích:** lớn lên từ cái chết. Mỗi tướng mình gục là thêm Kog Stack; đội càng thua mạng thì Kog càng nguy hiểm.
- **Nội tại "Cơn Đói Hư Không":** tướng mình gục thì +1 Kog Stack (Kog tự gục thì +2), mỗi Stack tăng sát thương đòn đánh. Kog gục thì nổ sát thương chuẩn lên mọi tướng địch.
- **Q Phun Axít:** sát thương + Rã giáp 1 địch. Nếu đội ít mạng hơn đối thủ thì Rã giáp cả đội địch.
- **E Cao Xạ Ma Pháp:** 2 lượt tự bắn cuối lượt, cộng thêm % máu tối đa. Nếu đang ít mạng hơn thì kéo dài 3 lượt.
- **R Pháo Sinh Học:** sát thương cộng theo Stack. Nếu mục tiêu đang Rã giáp và đội đang thua mạng thì tiêu Rã giáp và lá R về tay.
- **Engine:** scaling. **Combo:** Braum, Soraka, Nami (giữ đội sống lâu, rồi Kog gánh). **Bị khắc bởi:** Teemo (thắng bằng cạn bài, không cần hạ ai), Darius (kết liễu trước khi Stack kịp lớn). **Khắc:** Garen, Leona, Malphite (Rã giáp xuyên giáp dày).

## Jinx (Đơn giản)
- **Mục đích:** phấn khích dây chuyền. Mỗi tướng địch gục trong lượt Jinx cho thêm 1 lá và 1 phát bắn miễn phí; đồ là đạn.
- **Nội tại "Phấn Khích!":** địch gục trong lượt bạn thì Jinx Phấn Khích (hiện trên tướng), bạn rút 1 lá, đòn kế không cần lá Đánh thường.
- **Q Tráo Súng: Cá Mập:** sát thương 1 địch, thêm 1 tên lửa (50%) cho mỗi món đồ. Nếu đang Phấn Khích thì rút 1.
- **E Nạp Đạn Pow-Pow:** tìm 1 lá Đánh thường trong bộ, đòn kế mạnh hơn. Có từ 2 đồ thì tìm 2.
- **R Tên Lửa Siêu Khủng Khiếp:** sát thương + % máu đã mất, lan 50% sang hai đường kề, mỗi món đồ thêm 15%.
- **Engine:** items, draw. **Combo:** Ornn (cấp đồ), Nami (bài), Leona (khoá mục tiêu để kết liễu). **Bị khắc bởi:** Zed (dồn chết Jinx máu giấy), Janna (thổi bay đòn đánh). **Khắc:** Annie, Gangplank (xạ thủ đập token ở ô phụ).

## Ashe (Vừa)
- **Mục đích:** đóng băng nhịp đối thủ. Buốt là chìa khoá: mỗi tướng địch đang Buốt đẩy lá chiêu của họ xuống đáy bộ.
- **Nội tại "Băng Tiễn":** đòn đánh gây Buốt. Cuối lượt bạn, mỗi tướng địch đang Buốt: lá trên cùng bộ địch nếu là lá chiêu thì xuống đáy.
- **Q Mưa Tên:** tối đa 3 địch + Buốt. Nếu bộ địch ít lá hơn bộ bạn thì trúng tất cả.
- **E Ưng Thần:** sát thương nhẹ + Buốt; soi 3 lá trên cùng bộ địch: lá chiêu xuống đáy, lá khác (kể cả Nấm) giữ trên. Đẩy được từ 2 lá thì rút 1.
- **R Mũi Tên Pha Lê:** sát thương + Choáng. Nếu mục tiêu đang Buốt thì Choáng 2 lượt và đối thủ đặt 1 lá chiêu trên tay xuống đáy bộ.
- **Engine:** mill, marks. **Combo:** Teemo (Nấm giữ trên cùng để nổ), Lissandra (cùng dùng Buốt). **Bị khắc bởi:** Zed, Kha'Zix (dồn chết xạ thủ đứng một mình). **Khắc:** Nami, Viktor (lá chiêu rút ra bị chôn), Gangplank (xạ thủ đập thùng).

## Lux (Đơn giản)
- **Mục đích:** Chiếu Sáng rồi kích nổ. Mọi chiêu gắn dấu, Lux hoặc **đồng đội** đánh trúng dấu thì dấu nổ.
- **Nội tại "Chiếu Sáng":** chiêu gắn dấu (status `illum`, 2 lượt). Sát thương chiêu/đòn đánh của phe Lux lên tướng có dấu sẽ tiêu dấu, Lux gây thêm sát thương phép.
- **Q Khoá Ánh Sáng:** tối đa 2 địch; ai đã có dấu từ trước thì bị Choáng.
- **E Quả Cầu Ánh Sáng:** tối đa 3 địch, gắn dấu. Còn từ 5 lá trên tay thì trúng tất cả.
- **R Cầu Vồng Tối Thượng:** xuyên cả hàng địch, mỗi dấu nổ gấp đôi. Nổ từ 3 dấu thì rút 2.
- **Engine:** marks. **Combo:** Leona, Ahri, Nami (đồng đội nhiều đòn để kích nổ dấu). **Bị khắc bởi:** Katarina, Kha'Zix (dồn chết pháp sư). **Khắc:** Qiyana, Yorick (đội nhiều mục tiêu yếu, dễ bị nổ dây chuyền).

## Ahri (Vừa)
- **Mục đích:** Quyến Rũ rồi khai thác. Tướng bị Quyến Rũ bị kéo về trước mặt Ahri, tay đối thủ bị lộ, và lá nó đánh vào phe Ahri bẻ sang chính đồng đội của nó.
- **Nội tại "Mê Hoặc":** tướng đang bị Quyến Rũ gây sát thương chiêu/đòn lên phe bạn: phe bạn không mất gì, đồng đội ít máu nhất của nó nhận đúng lượng đó (chuẩn), Ahri hồi máu.
- **Q Quả Cầu Ma Thuật:** sát thương. Mục tiêu đang bị Quyến Rũ thì đối thủ bỏ 1 lá chiêu ngẫu nhiên.
- **E Hôn Gió:** sát thương + Quyến Rũ 1 lượt + kéo về đường đối diện Ahri + lộ tay đối thủ. Mục tiêu vốn đứng đối diện thì Quyến Rũ 2 lượt.
- **R Phi Hồ Phi Thân:** tối đa 3 địch, Quyến Rũ cả 3. Tướng đã bị Quyến Rũ từ trước nhận ×1,5.
- **Engine:** lanes (+ hand). **Combo:** Lux (kéo về để Lux bắn), Leona. **Bị khắc bởi:** Yorick (ít lá gây sát thương trực tiếp), Braum (đổi mục tiêu sang tướng không bị Quyến Rũ). **Khắc:** Vayne, Jinx, Kog'Maw (đội sống bằng đòn đánh).

## Annie (Vừa)
- **Mục đích:** cô bé và gấu. Tibbers ở ô triệu hồi phụ đỡ mọi đòn nhắm Annie; gấu càng bị đánh thì Annie càng Bốc Lửa.
- **Nội tại "Bạn Gấu":** Tibbers là máu ảo của Annie. Mỗi lần Tibbers nhận sát thương từ địch, Annie +1 Bốc Lửa (tối đa 3, hiện trên tướng). Cuối lượt, Tibbers vồ tướng đối diện Annie.
- **Q Thiêu Đốt:** sát thương, cộng thêm theo Bốc Lửa và tiêu hết; đủ 3 thì Choáng.
- **E Tibbers Ơi!:** gọi Tibbers; nếu Tibbers đã có mặt thì gấu nhận Khiên và vồ ngay.
- **R Tibbers Nổi Giận:** gọi Tibbers khổng lồ, gấu vồ mọi tướng địch; Annie đủ 3 Bốc Lửa thì mọi tướng bị vồ bị Choáng.
- **Engine:** tokens. **Combo:** Braum, Janna (bảo kê thêm để Tibbers trụ lâu). **Bị khắc bởi:** Gangplank (tranh/đánh ô phụ, nổ diện rộng), Katarina; thêm xạ thủ địch (đập thẳng Tibbers). **Khắc:** Zed, Katarina khi không có xạ thủ (dồn chết không xuyên qua gấu).
- **Lưu ý:** không chung đội với Gangplank (một ô phụ).

## Lissandra (Phức tạp)
- **Mục đích:** đóng băng kẻ dám ra tay. Buốt địch, rồi trong lượt đối thủ Choáng đúng tướng Buốt vừa đánh lá để huỷ lá đó.
- **Nội tại "Băng Giá Vĩnh Cửu":** tướng địch gục khi đang Buốt thì bạn lật thêm 1 lá thưởng.
- **Q Mảnh Băng (Quick):** nối chuỗi lên bất kỳ lá nào của đối thủ: sát thương + Buốt tới hết lượt kế tiếp. Mục tiêu đã Buốt thì bị Câm Lặng.
- **E Vòng Băng (Quick):** khi tướng địch **đang Buốt** đánh lá: sát thương + Choáng, lá của nó bị huỷ (fizzle). Trong lượt mình: Choáng 1 tướng đang Buốt.
- **R Quan Tài Băng (Quick, chỉ nối chuỗi):** đồng minh bị nhắm không nhận sát thương/khống chế từ lá đó; kẻ tung bị sát thương + Buốt; nếu đã Buốt từ trước thì bị Choáng.
- **Engine:** chain, prizes. **Combo:** Ashe (Buốt sẵn), Brand. **Bị khắc bởi:** Malphite (R không thể nối chuỗi), Twisted Fate (xem tay, phá lá phản ứng). **Khắc:** Zed, Katarina, Aatrox (dồn bài trong một lượt bị huỷ giữa chừng).
- **Lời giải cho đối thủ:** Buốt hiện trên tướng: đừng đánh lá bằng tướng đang Buốt, hoặc ép Lissandra tiêu lá Quick trước bằng lá rẻ.

## Gangplank (Phức tạp)
- **Mục đích:** thùng thuốc súng úp mặt. Úp 1 lá thành thùng thật/giả, Thuốc Súng tăng mỗi lượt; đối thủ phải đoán.
- **Nội tại "Thuốc Súng Bilgewater":** thùng úp ở ô phụ, +1 Thuốc Súng đầu mỗi lượt của bạn (hiện trên thùng), tự xịt sau 3 lượt. Chỉ đòn Đánh thường của xạ thủ địch đập được thùng (1 máu, đập thùng thật thì không nổ). Lá úp vào mộ khi thùng nổ/vỡ/xịt. Gangplank hạ tướng địch thì nhận 1 lá Vàng. Mỗi món đồ +8% sát thương.
- **Q Bắn Một Phát:** bắn 1 địch, hoặc bắn thùng của mình: lật, thật thì nổ lên mọi tướng địch theo Thuốc Súng, giả thì không gì. Hạ gục thì lá về tay.
- **E Thùng Thuốc Súng:** úp 1 lá trên tay thành thùng (lá Gangplank = thật, lá khác = giả). Chỉ đánh khi chưa có thùng. Có từ 2 đồ thì thùng ra với sẵn 1 Thuốc Súng.
- **R Mưa Đại Bác:** kích nổ thùng trước, rồi 1 + số đồ đợt đại bác lên mọi tướng địch.
- **Không có lá Quick:** mọi thứ diễn ra trong lượt Gangplank, đối thủ luôn có trọn 1 lượt để đọc bàn và trả lời.
- **Engine:** items, tokens. **Combo:** Ornn (đồ: thêm đợt đại bác, thùng ra sẵn Thuốc Súng), Twisted Fate (tìm lá Gangplank để úp thùng thật). **Bị khắc bởi:** Vayne và xạ thủ nói chung (đập thùng), Katarina. **Khắc:** Yorick, Annie (đội dựa vào ô phụ và đứng dày).
- **Lời giải cho đối thủ:** tốn 1 lá Đánh thường của xạ thủ để đập thùng (thùng giả thì phí đòn), hoặc hạ Gangplank (thùng biến mất theo chủ).

## Ánh xạ art (card key -> ô chiêu LoL cho `scripts/card_skill_art.py`)
| Tướng | Q | E | R |
|---|---|---|---|
| kogmaw (KogMaw) | Q | W | R |
| jinx (Jinx) | Q | W | R |
| ashe (Ashe) | W | E | R |
| lux (Lux) | Q | E | R |
| ahri (Ahri) | Q | E | R |
| annie (Annie) | Q | E | R |
| lissandra (Lissandra) | Q | W | R |
| gangplank (Gangplank) | Q | E | R |

Jinx E "Nạp Đạn Pow-Pow" dùng icon W (Zap!) để không trùng icon Q (Switcheroo). Annie E dùng icon E (Molten Shield) vì icon R đã là Tibbers.

