# StarCi League: luật bản thẻ bài thuần (bản nháp chờ thầy duyệt)

## LUẬT V2 (chốt 30/10/2026): đè lên MỌI dòng cũ bên dưới nếu khác

Các mục "CHỐT MỚI" và mục 1-6 bên dưới là lịch sử của bản V1. Khi mâu thuẫn, **luật V2 này thắng**. Mọi con số dưới đây đọc từ `RULES` trong `packages/shared/src/cardgame/types.ts` (đổi một chỗ là đổi cả game).

### 1. Bộ bài 170 lá, có đủ từ đầu trận (gấp đôi, chủ chốt 30/10)
- Mỗi người tự xếp **bộ chung 80 lá** (`RULES.sharedDeckSize`): Đánh thường, Rút Bài, phép bổ trợ, Vàng, mảnh Đồ. Bộ cũ 20 lá không còn hợp lệ, game dùng bộ mặc định và client nhắc "Bộ bài cần 40 lá, hãy xếp lại".
- Mỗi tướng trong đội 5 người mang **đúng 8 lá Q + 8 lá E + 2 lá R = 18 lá** (`RULES.skillCopies`), **giống nhau cho mọi tướng**. 80 + 5 × 18 = **170 lá**. Bộ mặc định: 16 Đánh thường, 2 Rút Bài + 16 phép bổ trợ, 16 Vàng, 30 mảnh Đồ (tối đa mỗi lá: Đánh thường 20, Rút Bài/phép 6, Vàng 16, mỗi mảnh 6).
- **Không còn xáo thêm lá khi gọi tướng**, không còn "20 thẻ hỗ trợ riêng của tướng". Lá chiêu của tướng chưa gọi hoặc đang chết là **lá chết** nằm trên tay: dùng chưa được, nhưng báo trước cho bạn nên gọi ai.
- Lá chiêu **dùng xong vào mộ bài**.

### 2. Rút bài và tay
- **Tay đầu 5 lá được rút ngay đầu ván, TRƯỚC khi gọi tướng**, nên bạn nhìn tay mà quyết định gọi ai.
- Từ lượt sau, mỗi lượt rút **1 lá** (`RULES.drawPerTurn`, chốt 30/10; trước là 2). Lượt đầu của mỗi bên không rút thêm.
- Tay tối đa **10 lá**. Rút thừa thì lá thừa **bị đốt vào mộ** (hiện "Tay đầy: ... bị đốt vào mộ"), không còn gọi là "bỏ do tràn".
- **Thua khi tới lượt phải rút mà bộ bài đã hết**, hoặc khi mất đủ **7 mạng**. Bộ còn 1 lá thì vẫn rút 1 lá, không thua.

### 3. Đường mở từng đường một
- Mỗi vòng mở **đúng 1 đường mới** (thứ tự giữa, rồi 2 bên: `RULES.laneOrder`), tới khi đủ 5 đường. Nhịp mở là `RULES.laneOpenEvery` (mặc định 1 vòng một đường), để cân bằng nhịp ván.
- Mỗi bên gọi **tối đa 1 tướng mỗi bước gọi tướng**. Mục tiêu nhịp: ván thường kết thúc khi mỗi bên có khoảng **4 tướng** trên sân.

### 4. Gọi tướng úp đồng thời
- Đầu mỗi vòng, **hai bên cùng chọn tướng và đường, úp mặt**, rồi bấm chốt. Khi cả hai chốt thì **lật cùng lúc và đặt cùng lúc**. Không ai thấy đối thủ gọi gì rồi mới đáp lại.
- Có một **mức trần N chung** cho cả hai bên mỗi bước (bằng số đường mở trong vòng đó). Bên nào ít tướng hơn (đã ra sân hết hoặc đang chờ hồi sinh) **không chặn** bên kia: bên kia vẫn gọi được tới N.
- Bên chưa có tướng nào trên sân thì **bắt buộc gọi ít nhất 1**.
- Trợ thủ được gọi ra lần đầu thì **lấy 1 lá Q và 1 lá E của nó từ bộ lên tay** (thiếu thì được tạo mới; tay đầy thì lá thừa bị đốt). Hồi sinh không lấy thêm.

### 5. Tướng chết ở nguyên đường
- Tướng bị hạ **ở lại đường của nó, hiện xám kèm đếm ngược hồi sinh**. Đường đó **được giữ chỗ**: không gọi tướng khác vào.
- Tướng chết **không bị nhắm, không bị đánh, không nhận buff, không bị kéo/đổi chỗ**. Với mọi cách nhắm, đường đó coi như trống.
- Sau `RULES.respawnRounds` (3) vòng, tướng **hồi sinh đúng đường đó, đầy máu**, còn nguyên đồ. Dịch Chuyển (phép bổ trợ) hồi sinh nó ngay tại đường cũ.

### 6. Giới hạn 3 đòn đánh mỗi lượt
- Mỗi người **tối đa 3 đòn đánh mỗi lượt** (`RULES.attackLimit`), áp dụng cho **mọi tướng**, tính **tất cả**: lá Đánh thường, đòn không cần lá của Đấu sĩ.
- Không có chiêu hay đồ nào nâng quá 3. Đòn đánh nằm **bên trong** một chiêu (ví dụ chiêu tự đánh 3 lần) và đòn tự động của riêng tướng (Kog'Maw) **không tính**.
- Đếm lại từ 0 ở lượt kế tiếp của bạn.

### 7. Đấu sĩ
- Đấu sĩ **không còn tự đánh cuối lượt**. Đấu sĩ **dùng được lá Đánh thường** (100% AD) như mọi người.
- Mỗi Đấu sĩ có thêm nút **"Đánh không cần lá"**: **66% sát thương** (`RULES.fighterCardlessMult`), **1 lần mỗi lượt mỗi Đấu sĩ**, tính vào giới hạn 3 đòn. Không bao giờ tự chạy: bạn bấm mới đánh, bấm xong có thể dừng.
- Đây là **đòn chủ động, KHÔNG phải Quick**: chỉ đánh được trong lượt mình, bước chính. Không bao giờ có trong lượt đối thủ hay khi nối chuỗi (quyết định 14). Không dùng được khi Choáng, khi đã đủ 3 đòn. Token vai Đấu sĩ không có nút này.

### 7b. Bỏ bài xuống mộ
- Trong lượt mình (bước chính, không trong chuỗi hay bước gọi tướng úp), bạn có thể bỏ **bất kỳ lá nào trên tay** xuống mộ, **miễn phí, không giới hạn số lần**, không tính vào giới hạn hành động. Nút "Bỏ vào mộ" hiện khi bấm một lá trên tay.
- Đi qua đường bỏ bài thường nên hook `onDiscard` chạy (mộ của Yorick tăng); log "Bạn bỏ <lá> vào mộ".
- Lá tạm và lá đặc biệt không bỏ được. Lá bị Hoá Băng (Lissandra) **bỏ được**: đó là lối thoát khỏi băng.
- Bot không tự bỏ bài chủ động.

### 8. Pháp sư và mana (nhân 10)
- Chỉ Pháp sư có mana. Mặc định **tối đa 100, bắt đầu 100, mỗi lượt của bạn +10** (`RULES.mage`); từng Pháp sư có thể đặt số riêng.
- **Mỗi chiêu Pháp sư tốn mana**, ghi trên chiêu, có thể là số lẻ như 15, 25. Thiếu mana thì lá mờ đi ("Thiếu mana (cần X, còn Y)") và không dùng được, kể cả khi định dùng như Quick trong lượt đối thủ.
- Mana trừ ngay lúc tung chiêu, **không hoàn lại** nếu chiêu bị hụt (người tung bị choáng giữa chuỗi). Hồi sinh thì về mana khởi đầu.
- Thẻ hỗ trợ "Hồi Mana" (nếu có trong bộ) hồi mana cho 1 Pháp sư chưa đầy.
- **Pháp sư nhận chiêu tạm** (luật chủ 30/10, `RULES.mageTempSkill`): đầu mỗi lượt của bạn, mỗi Pháp sư còn sống trên sân nhận 1 lá chiêu **tạm** Q hoặc E của chính nó (ngẫu nhiên 50/50), nhật ký "Lux nhận lá tạm: Q Lăng Kính". Lá tạm tốn mana và hoạt động y hệt lá thật; không dùng thì **biến mất cuối lượt** (không vào mộ). Lá tạm **không tính** vào giới hạn tay 10 (không bao giờ gây đốt bài), không thể Bỏ vào mộ, không thể chế tạo; bị Blitzcrank cướp thì chỉ biến mất.

### Tóm tắt một lượt V2
1. (Đầu vòng) Gọi tướng úp đồng thời, lật cùng lúc.
2. Rút 1 lá (lượt đầu không rút); từ lượt thứ 2 được tặng 1 lá Đánh Thường mỗi lượt và 1 mảnh đồ mỗi 3 lượt. Pháp sư +10 mana.
3. Đánh bài tuỳ ý, nhưng tối đa 3 đòn đánh. Đấu sĩ có thể dùng nút "Đánh không cần lá".
4. Kết thúc lượt: trạng thái hết hạn, lá tạm trên tay biến mất, đòn tự động của tướng (Kog'Maw) chạy.

### Cân bằng V2 (bot tự đấu, 30/10/2026, CHƯA xong)
Đo bằng `npx tsx scripts/card_selfplay.ts 2000 5 <seed> --jobs=27` (bot hard hai bên). Số cuối (2000 trận, seed 9): cạn bài 14%, TB 19,5 vòng, bên A thắng 54%, tướng trên sân lúc kết thúc 3,98/bên, lá bị đốt 7/trận (trước: 38). Tỉ lệ thắng tướng còn 40-59%, chưa đạt 45-55%.
- **Luật:** `RULES.respawnRounds` 3 → **2**. `laneOpenEvery` giữ 1.
- **Bot:** giữ bài quá chỗ trống cho lượt rút kế (tay tối đa − số lá sẽ rút) bị trừ giá một lá bị đốt (`EVAL.burnCost` 50, `overflowKeep` 0,3); lá chiêu trên sân trên tay 60 → 45. Stack giữ ngoài sân (Đêm Vayne, Đói Kog'Maw) được tính cả khi chưa gọi/chờ hồi sinh; `HeroBotHint.holdBack` (Vayne: hoãn gọi tới khi đủ 4 Đêm).
- **Chỉ số gốc** đưa về dải luật (Giáp 28-39, Kháng 28-38, AD 60-90): mọi tướng máu ×0,9 (sàn 300) rồi chỉnh riêng; Janna/Renata/Braum/Nami/Soraka AD lên 60+. Đấu sĩ (Garen 60, Yorick 60, Darius 62, Aatrox 64 AD, máu 300) bị hạ mạnh nhất vì đòn không cần lá làm họ trội.
- **Giảm:** Yorick 0,5 AD + 2 máu mỗi lá mộ, R 1,5/lá · Aatrox nội tại 15%, Q ×1,2 · Garen Q {15 + 80% AD}, E {6 + 35% AD}, R {15 + 40% AD}/Tội · Darius Q {5 + 80% AD}, E {10 + 65% AD}, R {16 + 25% AD}, tối đa 6 Chảy Máu · Qiyana Q {30 + 90% AD}, R {30 + 70% AD} · Katarina Q {45 + 90% AD}, E {25 + 60% AD}, R {40 + 80% AD} · TF E {5 + 25% AD + 30% AP} + {3 + 5% AP}/lá, R {8 + 6% AD + 12% AP}/lá, mana Q/E/R 20/30/55 · Renata hồi sinh 15%, Cuồng Bạo ×1,15, Q Khiên {70 + 50% AD}, phạt {60 + 70% AD}, E phản 40% · Malphite 3,5%/lá, {10 + 16% AD}/lá · Soraka Q {100 + 100% AP}, R {190 + 100% AP} · Teemo Nấm {50 + 35% AD}, E {25 + 45% AD} · Janna nội tại {24 + 25% AD}, E {70 + 55% AD} · Viktor E {55 + 50% AD + 50% AP}.
- **Tăng:** Ashe Buốt −15% đòn/−8% chiêu, E {100% AD}, R {60 + 55% AD}/Buốt · Vayne Đêm {24 + 36% AD}, R ×3 · Kog'Maw 2,6%/Đói, R 4,5% · Ornn mỗi Rèn +15% sát thương và +12 Giáp, Q +5 Rèn · Lux 1,1 AP/mana, E {20 + 60% AD + 30% AP} + 1,5/mana, R 3,5/mana · Ahri E {50 + 110% AD + 40% AP}, +70%/Say Mê, mana Q/E 10/20 · Annie Q {35 + 85% AD + 40% AP}, Tibbers {25 + 65% AD + 40% AP}, mana E 15 · Kha'Zix Q {80 + 180% AD} · Zed Q {80 + 160% AD}, R {36 + 60% AD}/Dồn · Jinx Q {70 + 170% AD} · Brand Q {35 + 95% AD + 40% AP}, Bỏng {10 + 4% AP} · Lissandra E {30 + 75% AD + 30% AP}, R {18 + 35% AD + 25% AP}/lá · Leona/Blitzcrank AD 90, Giáp/Kháng 39/38 và 38/38.
- **Gangplank:** Ô phụ tối đa **1 Thùng** (chủ chốt), máu 370 (theo đợt ×0,9).
- **Vấn đề còn lại (cần luật, không sửa bằng số được):** tướng rút bài (Nami: ~20 lá rút thêm mỗi ván có Nami, 30% ván có Nami thua do cạn bài; TF ~20%) làm cạn bài; nhịp ván chậm, sát thương nhỏ so với máu. Xem báo cáo cân bằng.


### Cân bằng V3 (bot tự đấu, 30/10/2026)
Đo bằng `npx tsx scripts/card_selfplay.ts 1000 5 <seed> --jobs=13` (bot hard, seed 1 và 2). Thử luật nhanh không sửa code: `--set=khoá=giá trị` (vd `--set=respawnRounds=1 --set=summonRounds=1/3/6/10/15`).
- **Luật (chủ chốt):** bộ gấp đôi (80 lá chung + 8Q/8E/2R mỗi tướng = 170; bộ mặc định 16 Đánh thường, 2 Rút Bài + 16 phép, 16 Vàng, 30 mảnh Đồ) · rút **1** lá/lượt · AP gốc = 0 mọi tướng (bù bằng số cố định: + %AP × AP gốc cũ, vd Annie R 120 → 194) · máu theo vai: Đỡ đòn 500-550, Đấu sĩ 400-500, các vai khác 300-400 · Đỡ đòn AD thấp (78-82).
- **Luật (cân bằng):** `RULES.freeBasicEvery` 2 → **1** (từ lượt thứ 2 của mình, mỗi lượt +1 lá Đánh Thường; lượt đầu không có quà). Lý do: rút 1 lá + máu cao làm ván kéo 25 vòng, 1% ván quá 150 vòng; tặng mỗi lượt đưa về TB ~19 vòng, 0% cạn bài. `respawnRounds` giữ 2, `summonRounds` giữ 1/4/8/13/19.
- **Kha'Zix (chủ):** Cô Lập chỉ còn là trạng thái do Kha'Zix gắn (bỏ luật "không có đồng minh ở đường kề"); E chọn 1 địch bất kỳ, gắn Cô Lập + sát thương, không đổi đường; R gắn Cô Lập lên địch đối diện (không có thì 1 địch ngẫu nhiên).
- **Tốc Biến (chủ):** đổi đường 1 tướng mình với 1 tướng mình khác đang trên sân; không còn dời vào đường trống hay đường chưa mở.
- **Vel'Koz (chủ):** bỏ lá tạm "Phân Rã Hữu Cơ" mỗi lượt; nội tại chỉ còn Phân Rã khi chiêu trúng.
- **Giảm:** Janna nội tại {20 + 15% AD + 30% AP}, Q {60 + 30% AD + 60% AP}, E {70 + ...}, R hồi {80 + ...} · Aatrox nội tại 15% → 10% máu đã mất, Q ×1,2 → ×1,0 máu đã Trả · Darius Q {30 + 100% AD}, R {12 + 20% AD}/Chảy Máu · Garen Q {20 + 90% AD}, R {80 + 70% AD} · Miss Fortune Q {30 + 80% AD}, R {35 + 50% AD} · Blitzcrank Q {90 + 50% AD + 60% AP}, R {120 + 50% AD + 80% AP}.
- **Tăng:** Jinx Q {50 + 110% AD}, R {120 + 90% AD} · Ashe Q {55 + 95% AD}, R {120 + 90% AD} · Lux E {115 + 30% AD + 60% AP}, Khiên Q {70 + ...} · Teemo Nấm {80 + 16% AD + 23% AP}, E {65 + 20% AD + 30% AP} · Tristana E {45 + 50% AD}, R {100 + 110% AD} · Ahri Q {115 + ...}, tỉ lệ Say Mê 18% gốc · Lissandra Q {125 + ...}, E {100 + ...}, tỉ lệ Hoá Băng 18% gốc · Viktor E {115 + ...} · Qiyana Q Đỏ {50 + 120% AD} · Yorick Q {35 + 30% AD} · Ornn Rèn 12% gốc.
- **Số cuối (2 × 1000 trận):** TB 18,8 vòng (trung vị 18-19), cạn bài 0%, quá giới hạn 0, bên A thắng 53-56%, tướng trên sân lúc kết thúc 3,3/bên.
- **Còn lại:** Đấu sĩ Darius/Aatrox/Garen ~61% (máu 400+ theo dải mới làm họ trội), Miss Fortune 58%, Janna 57%, Blitzcrank 56% còn mạnh; Teemo/Lux/Tristana ~41-42%, Yorick/Brand/Ashe/Gangplank ~44-45% còn yếu; bên đi trước vẫn hơi lợi; tướng trên sân lúc kết thúc dưới 4.

---

> **CHỐT MỚI (thay các mục cũ bên dưới nếu khác):**
> - **DẢI CHỈ SỐ TƯỚNG (chốt 10/2026):** máu gốc **300–500**, AD gốc **60–90**, Giáp 28–39, Kháng phép 28–38; ngoài máu, mỗi chỉ số gốc giữa tướng thấp nhất và cao nhất lệch **tối đa 1,4 lần**. AP gốc luôn 0. Mục tiêu nhịp: Đánh thường tự động của đấu sĩ + 1 lá Đánh thường ≈ 25–35% máu một tướng trung bình, 1 chiêu ≈ 20–40%, chiêu cuối ≈ 50–70%; tướng bị dồn thường chết sau 2–3 lượt. Đồ trong chế độ thẻ bài: máu của đồ ×0,4 (`RULES.itemScale`, chỉ áp cho đồ chưa có bản riêng thẻ bài).
> - **Đánh thường theo vai (`RULES.roleAttack`):** Xạ thủ **150% AD**, Sát thủ **200% AD**, các vai khác 100% AD.
> - **Rút 1 lá mỗi lượt** (`RULES.drawPerTurn = 1`); tay đầu vẫn 5 lá (rút sau khi gọi tướng đầu tiên).
> - **Đặc quyền Trợ thủ (thay "rút thêm 1 lá mỗi lượt"):** khi một tướng Trợ thủ **được gọi ra sân** (kể cả lần gọi đầu trận), chủ rút **1 lá**, một lần; hồi sinh không tính.
> - **Bỏ "+40% sát thương chiêu" của Pháp sư** (`RULES.mageSkillBonus = 0`); công thức của pháp sư đã tự bù. Cơ chế riêng của pháp sư (mana) đang thiết kế.
> - **Số của thẻ hỗ trợ/phép bổ trợ (sau rescale):** Bình Máu {100 + 10% máu tối đa} · Bổ Trợ +20% sát thương và Khiên 70 · Hồi Máu 100 + 10% máu tối đa · Lá Chắn 80 + 10% · Thiêu Đốt 40 máu/lượt × 2 · Trừng Phạt 150 sát thương chuẩn lên vật triệu hồi.
> - ~~Trợ thủ rút thêm tối đa 1 lá mỗi lượt~~ (đã bỏ, xem đặc quyền Trợ thủ ở trên).
> - **GỌI TƯỚNG TRƯỚC, RÚT BÀI SAU (thay "rút bài trước" và thẻ chiêu chung):** mỗi lượt bắt đầu bằng **bước gọi tướng** (phase `summon`): gọi tướng dự bị vào đường mở còn trống (gọi bao nhiêu tuỳ ý, hoặc bỏ qua), rồi bấm **rút bài** (`draw`) mới rút 1 lá. Không gọi được ai thì tự rút. Gọi tướng trong lúc đánh bài vẫn được.
> - **Mở đầu trận:** không còn tay đầu sẵn và **bỏ hẳn thẻ chiêu chung** (Q/E/R). Lượt đầu của mỗi bên **bắt buộc gọi tướng đầu tiên** (vòng 1 chỉ mở đường 3), lá của tướng đó xáo vào bộ, rồi rút **tay đầu 5 lá** (`RULES.startHand`); lượt đầu không rút thêm 2 lá đầu lượt. Bên B gọi tướng sau khi thấy tướng của A.
> - **Lá thưởng** chỉ gồm thẻ hỗ trợ (Đánh thường, Vàng, Đồ, Rút Bài, phép bổ trợ), không còn thẻ chiêu chung. Blitzcrank cướp được lá chiêu của đối thủ thì lá đó thành 1 lá Đánh thường.
> - ~~Thứ tự lượt: rút bài trước~~ (đã đổi: gọi tướng trước, rút sau, xem trên).
> - ~~Tay đầu = 5 lá gốc + 3 thẻ chiêu chung (Q, E, R)~~ (đã bỏ thẻ chiêu chung) không gắn tướng: đánh ra thì chọn 1 tướng mình đang trên sân và tung chiêu Q/E/R của tướng đó. Giúp lên chiến thuật khi chưa biết sẽ rút được tướng nào. Dùng xong vào mộ như lá chiêu.
> - **Mục tiêu chiêu do lối chơi từng tướng quyết định** (không ép theo vai); kiểu mục tiêu: tướng đối diện · 1 tướng địch · tối đa N · mọi tướng địch · tướng mình · bản thân.
> - **Chọn mục tiêu chiêu kiểu Yu-Gi-Oh** (không theo đường): 1 tướng địch · tối đa N tướng địch · mọi tướng địch · 1 / tối đa N / mọi tướng mình · bản thân. Đường chỉ dùng cho đánh thường theo vai và hiệu ứng kéo/đổi chỗ.
> - **Thẻ thưởng (Prize) kiểu Pokémon:** đầu trận mỗi đội úp **6 lá thưởng** ngẫu nhiên (thẻ hỗ trợ + thẻ chiêu chung Q/E/R, không lấy từ bộ bài chính). Hạ 1 tướng địch thì lật 1 lá thưởng lên tay. **Giữ 7 mạng:** 6 lần hạ đầu mỗi lần lật 1 lá thưởng; lần hạ thứ 7 là thắng trận.
> - **Quick play** là nhãn của từng chiêu (vd "E · Quick"): chiêu Quick dùng được trong lượt đối thủ để **nối chuỗi** kiểu Yu-Gi-Oh; chuỗi giải quyết từ mắt xích cuối về đầu.
> - **Ô triệu hồi phụ:** mỗi bên 1 ô ngoài 5 đường cho vật triệu hồi / đồng minh phụ (vd Tibbers làm máu ảo cho Annie: sát thương vào Annie đánh Tibbers trước, hết máu thì Tibbers chết). Không có hiệu ứng vùng tròn; mọi hiệu ứng đặt lên tướng.
> - **Nhắm vật triệu hồi ở ô phụ:** **đòn đánh thường của mọi vai tướng, bất kể lane** (lá Đánh thường hoặc đòn do chiêu kích hoạt) chọn được vật triệu hồi làm mục tiêu. Chiêu đơn mục tiêu / tối đa N **không** chọn được vật triệu hồi, trừ khi lá ghi rõ (`targetsTokens`); chiêu "mọi tướng địch" vẫn trúng. Vật triệu hồi có thể **úp mặt** (đối thủ không biết nó là gì tới khi lật, rời sân thì tự lật) và có thể **tự hết hạn** sau N lượt (hiện số lượt còn lại trên token).
> - **Quick dành cho tướng phản ứng:** lá Quick chỉ cấp cho tướng mà mục đích duy nhất là phản ứng. Đòn lớn đánh trong lượt mình để đối thủ có một lượt đọc bàn và đáp trả.
> - **Số lá chiêu theo từng tướng** (không cố định 6/6/2): Q 3–10 lá, E 3–10 lá, R 1–3 lá (`HeroDef.skillCopies`, mặc định 6/6/2). Đấu sĩ/tướng đánh tay mang ít lá chiêu (bộ gọn), pháp sư mang nhiều. Số lá cũng là núm cân bằng: chiêu mạnh mỗi lá thì ít bản.
> - **Bộ gốc tự xếp 20 lá** (thay bộ gốc 10 Đánh thường/6 Vàng/6 Đồ): chỉ thẻ hỗ trợ (Đánh thường ≤8, Rút Bài ≤2, Bổ Trợ ≤2, Bình Máu ≤2), Vàng ≤4 và **mảnh Đồ chọn đích danh** (mỗi mảnh ≤2), xem `packages/shared/src/cardgame/deck.ts`. Thiếu/sai thì dùng bộ mặc định. Tay đầu vẫn rút 5 lá từ bộ gốc + 3 thẻ chiêu chung. Mỗi tướng ra sân vẫn xáo thêm 20 thẻ hỗ trợ của tướng (có thể chỉnh riêng: `HeroDef.supportCopies`) + toàn bộ lá chiêu của tướng.
> - **Đồ đã đeo không tháo ra được:** không có hành động tháo/chuyển đồ; đồ ở lại trên tướng qua cả lúc chết và hồi sinh.
> - **Ghép đồ ra lá đồ huyền thoại:** 2 lá Đồ + 1 lá Vàng trên tay ghép thành **1 lá đồ huyền thoại lên tay** (tay đầy thì vào mộ), chưa đeo. Đeo là một lượt đánh riêng: đánh lá đó lên 1 tướng mình trên sân còn ô đồ (tối đa 3 món); khi đeo, máu tối đa/hiện tại tăng theo máu của món.
> - **Trạng thái chung** (có hiệu ứng riêng trên bàn, mọi tướng dùng chung id): Choáng `stun`, Câm Lặng `silence`, Vết Thương Sâu `grievous` (hồi máu/Khiên nhận vào −50%), Buốt `chill`, Mù `blind`, Khiêu Khích `taunt`, cộng Khiên.
> - **Phép bổ trợ (8 lá, kiểu LMHT) thay Bình Máu và Bổ Trợ:** Hồi Máu (hồi 100 + 10% máu tối đa) · Tốc Biến (dời 1 tướng mình sang đường mở còn trống) · Thiêu Đốt (địch mất 40 máu đầu mỗi lượt của nó trong 2 lượt, kèm Vết Thương Sâu: hồi máu và Khiên nhận vào giảm 50%) · Kiệt Sức (địch gây ít hơn 40% sát thương tới hết lượt kế của nó) · Lá Chắn (Khiên 80 + 10% máu tối đa) · Thanh Tẩy (gỡ mọi khống chế/hiệu ứng xấu) · Trừng Phạt (150 sát thương chuẩn lên vật triệu hồi ở ô phụ địch: cách để tướng không phải xạ thủ trả lời token) · Dịch Chuyển (1 tướng đang chờ hồi sinh quay lại ngay vào đường mở còn trống với 50% máu). Dùng trong lượt mình (không Quick), dùng xong biến mất. 20 thẻ hỗ trợ của mỗi tướng: 9 Đánh thường, 2 Vàng, 4 Đồ, 2 Rút Bài, 1 Hồi Máu, 1 Lá Chắn, 1 Thanh Tẩy (2 Vàng vì 1 lần ghép tốn 2 Đồ + 1 Vàng) (tướng có thể đổi riêng).
> - **Bỏ hẳn lá phép và lá bẫy** (của chế độ đấu bài cũ).
> - **Lá chiêu dùng xong vào mộ bài** (không quay lại bộ). Chỉ chiêu nào ghi rõ (vd Soraka xáo mộ, Viktor Q bậc 3 về tay) mới đưa lá trở lại.
> - **Hai cách thắng:** hạ đủ **7 mạng** địch, **hoặc** đối thủ **cạn bài**: tới lượt phải rút mà bộ bài hết thì người đó **thua ngay**.
> - **Mỗi tướng ra sân mang vào bộ bài 34 lá:**
>   - **14 lá chiêu:** 6 Q + 6 E + 2 R. Dùng xong **vào mộ bài**.
>   - **20 thẻ hỗ trợ:** **dùng xong là mất.** Đề xuất: 6 Đánh thường, 4 Vàng, 4 Đồ (mảnh), 2 Bình Máu, 2 Rút Bài, 2 Bổ Trợ.
> - 1v1 thì bộ có 34 lá, 3v3 có 102 lá, 5v5 có 170 lá. Rút bài nhiều thì mạnh ngay nhưng cạn bài nhanh hơn.
>
> | Thẻ hỗ trợ | Tác dụng (đề xuất) |
> |---|---|
> | **Đánh thường** | 1 tướng mình đánh thường theo luật vai |
> | **Vàng** | 1 vàng, dùng ghép đồ |
> | **Đồ** (mảnh) | 2 Đồ + 1 Vàng = 1 món đồ đeo vào tướng (tối đa 3 đồ/tướng) |
> | **Bình Máu** | 1 tướng mình hồi {100 + 10% máu tối đa} |
> | **Rút Bài** | rút 2 lá |
> | **Bổ Trợ** | 1 tướng mình +20% sát thương và Khiên {70} tới hết lượt đối thủ |
>
> - **Đồ chỉ dùng bảng 8×8:** 8 mảnh (Kiếm Dài, Gậy Quá Khổ, Cung Gỗ, Găng Tay, Giáp Lưới, Áo Choàng, Đai Khổng Lồ, Nước Mắt) → 36 món ghép. Bỏ Pha Lê Lam, Cuốc Chim và các món từ chúng.
> - Luật pháp sư "×1,5 số lá" bỏ (mọi tướng đều 6/6/2). Thay bằng: chiêu của pháp sư mạnh hơn 40% (`RULES.mageSkillBonus`) — ~~đã bỏ 10/2026~~, xem dòng đầu.
> - **Viktor:** mỗi lần dùng một chiêu thì chiêu đó +1 điểm; **đủ điểm thì tự cường hoá lên bậc** (Q, E: 3 điểm/bậc; R: 1 điểm/bậc; tối đa bậc 3). Hiệu ứng bậc như trong `TUONG_THE_BAI.md`.
> - **Mẫu thiết kế chiêu:** hiệu ứng gốc + 1 điều kiện kiểu bài (loại lá rút được, chí mạng, số mạng còn, số lần chết...). Ví dụ:
>   - **Nami Q:** rút 2 lá; nếu 2 lá **khác loại** thì bỏ 1.
>   - **Nami E:** buff 1 đồng minh: đòn đánh kế tiếp mạnh hơn và **không cần lá Đánh thường**; nếu đòn đó **chí mạng** thì rút thêm 1 lá.
>   - **Nami R:** rút 3 lá; nếu đội mình **chỉ còn 3 mạng** thì rút 5.
>   - **Soraka:** bỏ bài lấy máu, và **xáo lá trong mộ vào lại bộ bài** (giữ bộ bài khỏi cạn).
>   - **Kog'Maw:** chết càng nhiều càng mạnh (Kog Stack).
>   - **Teemo:** rút trúng Nấm thì Nấm nổ và **đốt 2 lá trên cùng bộ bài địch** vào mộ (ép cạn bài).
> - Số lá Q/E/R ghi trong `TUONG_THE_BAI.md` là bản cũ; khi chốt sẽ đổi hết về 6/6/2 và viết lại theo mẫu trên.

## 1. Chuẩn bị
- Cấm/chọn **5 tướng** mỗi bên như cũ.
- Bộ bài gốc mỗi bên: **10 Đánh thường, 6 Vàng, 6 Đồ (mảnh)**. Không có lá phép, lá bẫy, không có quái rừng *(số lượng là đề xuất)*.
- **Đầu trận cầm 5 lá** (rút từ bộ bài gốc, vì lúc đó chưa có tướng nào ra sân). Tay tối đa 10 lá. Rút quá 10 thì lá thừa vào mộ bài.

## 2. Bàn và nhịp trận
- **5 đường**, mỗi đường có 1 ô cho mỗi bên. Hai tướng cùng đường **đứng đối diện** nhau.
- **Đường mở dần:** vòng 1 chỉ mở **đường giữa (đường 3)**, mỗi bên 1 tướng, đánh 1v1. **Vòng 4** mở thêm **đường 2 và 4** (3v3). **Vòng 8** mở nốt **đường 1 và 5** (5v5). Mốc vòng là đề xuất. Tướng gọi ra vào đường mới mở.
- **Gọi tướng ra sân thì xáo toàn bộ lá chiêu của tướng đó vào bộ bài.**
- **Mỗi bên có 7 mạng. Bị hạ tổng cộng 7 lần là thua** (tức hạ đủ 7 tướng địch là thắng).
- Tướng bị hạ **hồi sinh sau 3 lượt**, ra lại đúng đường cũ, còn nguyên đồ. Trong lúc chết, lá chiêu của nó là **lá chết**: không dùng được, nhưng vẫn chiếm chỗ trên tay và trong bộ.

## 3. Một lượt
1. **Rút 2 lá** (V2).
2. **Đánh bao nhiêu lá cũng được**, thứ tự tuỳ ý. Không có mana, không có hồi chiêu.
3. ~~Đấu sĩ tự đánh thường~~ (V2: không còn; Đấu sĩ có nút Đánh không cần lá 66%, xem Luật V2 mục 7).
4. Kết thúc lượt: trạng thái hết hạn, hiệu ứng "cuối lượt" chạy.

Lá dùng xong vào **mộ bài**. Bộ bài hết thì xáo mộ bài lại làm bộ mới.

## 4. Các loại lá
| Lá | Dùng thế nào |
|---|---|
| **Lá chiêu** (Q/E/R của tướng) | Tướng đó phải đang trên sân. Hiệu ứng ghi trên lá |
| **Đánh thường** | 1 tướng của mình đánh thường theo luật vai (mục 5) |
| **Vàng** | Phí đúc đồ (1 lá = 1 vàng) |
| **Đồ (mảnh)** | **2 lá Đồ + 1 lá Vàng** ghép thành **1 lá món đồ** và đeo luôn vào 1 tướng. Mỗi tướng tối đa 3 đồ. Hệ đồ giữ nguyên (AD, AP, máu, giáp, kháng, chí mạng 33,3% mỗi món...) |
| **Lá đặc biệt** | Do chiêu tạo ra: Nấm, Bóng, Dao... (xem tướng) |

## 5. Chỉ số và luật vai
- Chỉ số như cũ: máu vài trăm, AD (vật lý), AP (phép, chỉ từ đồ: AP gốc = 0), giáp/kháng phép giảm theo 100/(100 + giáp). Chỉ số gốc lệch nhau tối đa 45%.
- Mỗi tướng **3 chiêu: Q, E, R**, kèm **1 nội tại riêng**.

| Vai | Đánh thường | Đánh ai | Sát thương | Lá chiêu |
|---|---|---|---|---|
| **Đấu sĩ** | lá Đánh thường (100% AD) **hoặc** nút Đánh không cần lá (66%, chỉ lượt mình, 1 lần/lượt) | tướng đối diện | xem V2 mục 7 | ít, chiêu đơn giản |
| **Đỡ đòn** | cần lá | tướng đối diện | 100% AD | nhiều, đa dụng. **Khiêu khích:** lá đánh thường của xạ thủ địch phải đánh vào đỡ đòn |
| **Sát thủ** | cần lá | tướng **cùng đường** | **200% AD** | vừa |
| **Xạ thủ** | cần lá | **tướng nào cũng được** | **150% AD** | vừa |
| **Pháp sư** | cần lá | tướng đối diện | 100% AD (phép) | (cơ chế mana đang thiết kế) |
| **Trợ thủ** | cần lá | tướng đối diện | 100% AD | vừa. Được gọi ra sân thì chủ **rút 1 lá** (một lần) |

## 6. Từ khoá bài dùng chung
| Từ khoá | Nghĩa |
|---|---|
| **Rút N** | lấy N lá trên cùng bộ bài lên tay |
| **Tìm (lá X)** | lục bộ bài lấy 1 lá X lên tay, rồi xáo bộ bài |
| **Soi N** | xem N lá trên cùng bộ bài, xếp lại tuỳ ý, có thể đặt lá xuống đáy |
| **Bỏ N** | bỏ N lá trên tay vào mộ bài |
| **Hồi lá** | lấy 1 lá từ mộ bài về tay |
| **Nhét (lá X) vào bộ địch** | xáo lá X vào bộ bài đối thủ |
| **Cướp** | lấy 1 lá trên tay đối thủ |
| **Phản ứng** | lá đánh được **trong lượt đối thủ** khi điều kiện xảy ra |
| **Tự bật** | lá tự kích hoạt ngay khi được rút, không tốn lượt |
