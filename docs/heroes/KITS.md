# Bộ chiêu 38 tướng (bản chốt với thầy, 31/10 – 01/11/2026)

Đặc tả đã nối engine. Luật chung ở `law.md` mục 10–12. Số thật nằm trong `packages/shared/src/cardgame/balance/heroes/<id>.json`; `p1`, `q0`, `q1`... là tham số trong JSON (xem `docs/heroes/BALANCE.md`).

Luật tóm tắt:
- Pháp sư, Trợ thủ: chiêu chỉ scale AP. Đỡ đòn: Máu, Giáp, Kháng. Xạ thủ, Sát thủ, Đấu sĩ: AD (Đấu sĩ thêm Máu).
- Mọi chiêu Pháp sư có sát thương. Chiêu tạo Khiên là Quick, ghi rõ điều kiện nối Chuỗi.
- Bộ đếm nội tại mất một nửa khi chết, trừ ngoại lệ ghi riêng.
- Choáng huỷ cả chiêu và đòn đánh, Câm Lặng huỷ chiêu, Mù huỷ đòn đánh.
- Thời hạn ghi bằng đơn vị. Không có giới hạn số đòn mỗi lượt.
- Sát thương tăng vọt dùng `p·n·(1 + n/k)`.

## Trợ thủ

Thang sức mạnh so với Pháp sư: P 1.5, Q 1, E 1, R 0.8.

### Nami · nước
Thang tham số theo JSON `balance/heroes/nami.json`: P `p1..p3`, Q `q0..q5`, E `e0..e6`, R `r0..r7`.
- **Nội tại Dậy Sóng:** Mỗi khi các tướng phe bạn gây tổng cộng `p1` sát thương lên tướng địch, Nami nhận 1 [Dậy Sóng], cộng dồn vô hạn.
- **Dậy Sóng:** Mỗi Dậy Sóng cộng dồn giúp mọi đồng minh (cả Nami) tăng `p2` AP, và khi số Dậy Sóng đạt bội của `p3` (20), rút 1 lá. Khi Nami bị hạ, mất một nửa. Đang chết thì tầng giữ, phần AP tắt.
- **Q Thuỷ Triều** `q0`: Chỉ định 1 đồng minh; nó hồi `q1 + q2·AP` Máu, rồi 1 tướng địch ngẫu nhiên nhận `q3 + q4·AP` sát thương phép. Sau đó, 1 đồng minh ngẫu nhiên chưa được hồi hồi lại, rồi 1 tướng địch ngẫu nhiên chưa bị đánh nhận lại. Tối đa `q5` lượt nảy (2); hết mục tiêu thì dừng. Sự kiện hồi và sát thương mang `via` = đơn vị liền trước (lượt đầu là Nami).
- **E Phước Lành Thuỷ Triều** `e0`: Quick. Chọn 1 tướng mình; nó nhận `e1 + e2·AP` Khiên và `e3` (3) [Phước Lành], cộng dồn vô hạn. Khi địch nhắm đúng 1 tướng mình; mục tiêu là tướng đó.
- **Phước Lành:** Mỗi khi lá chiêu của tướng mang gây sát thương lên địch, tiêu 1 Phước Lành; mỗi tướng địch trúng chịu thêm `e4 + e5·AD + e6·AP` sát thương theo AD/AP của tướng mang. Không hết hạn, không mất khi tướng mang bị hạ.
- **R Sóng Thần** `r0`: Mọi tướng địch nhận `r1 + r2·AP` sát thương phép. Sau đó, mỗi tướng bị Choáng `r3 + r4·AP` đơn vị và nhận [Dễ Tổn Thương] trong `r5` (1) đơn vị. Dễ Tổn Thương: nhận thêm `r6 + r7·AP` % sát thương (30% + hệ số).

### Renata · khói
Tham số: `balance/heroes/renata.json`. Cờ `reviveSelf` (0): Renata không tự cứu mình.
- **Nội tại Cấp Vốn** `p1..p5`: Mọi tướng mình nhận Tốc Đánh, Chí Mạng và AD theo Mức Cấp Vốn = tổng % Máu đã mất của mọi tướng mình chia `p1` (500); mỗi Mức cho `p2` Tốc Đánh, `p3` Chí Mạng, `p4` AD. Khi 1 tướng mình bị hạ: hồi sinh với `p5` (40%) Máu tối đa. Một lần mỗi đồng minh mỗi trận. Đứng đầu `RULES.lethalOrder`.
- **Q Cứu Cánh** `q0`: Chọn 1 tướng mình; nó mất `q1` (20%) Máu hiện tại (còn tối thiểu 1), nhận `q3` Tốc Đánh, `q4` Chí Mạng, `q5` AD trong `q2` (2) đơn vị; đòn đánh gây thêm `q6` lượng Máu đã mất của nó.
- **E Hoả Lực Yểm Trợ** `e0`: Quick. Chọn 1 tướng mình; nó bắn gây `e1 + e2·AD + e3·AP` sát thương theo AD/AP của nó, rồi nhận `e4` (50%) tổng sát thương thành Khiên. Khi địch nhắm đúng 1 tướng mình; mục tiêu là tướng đó. Kẻ bị bắn: người vừa nhắm nó, không có thì địch đối diện, rồi địch ngẫu nhiên.
- **R Hợp Chất Điên Loạn** `r0`: Mọi tướng địch nhận [Cuồng Loạn] trong `r1` (1) đơn vị: thêm `r2` Tốc Đánh, tự đánh mục tiêu gần nhất theo ưu tiên đồng minh của nó, trung lập, tướng phe Renata, Renata.

### Janna · gió
Tham số: `balance/heroes/janna.json`.
- **Nội tại Hộ Phong** `p1..p3`: Mỗi khi các tướng phe bạn nhận tổng `p1` Khiên, Janna nhận 1 [Gió Thuận], vô hạn. Mỗi Gió Thuận: Khiên mới tăng `p2`, tướng mình còn Khiên tăng `p3` Tốc Đánh. Mất một nửa khi chết.
- **Q Gió Lốc** `q0`: Chọn 1 tướng địch; gây `q1 + q2·AP` + `q3` tổng Khiên phe bạn sát thương phép, Choáng `q4 + q5·AP` đơn vị.
- **E Mắt Bão** `e0`: Quick. Chọn 1 tướng mình; nó nhận `e1 + e2·AP` Khiên và [Mắt Bão] trong khi còn Khiên: tăng AD/AP bằng `e3` Khiên đang có. Khi địch nhắm đúng 1 tướng mình; mục tiêu là tướng đó.
- **R Gió Mùa** `r0`: Quick. Khi địch dùng lá chiêu nhắm nhiều tướng mình hoặc cả phe, hoặc dùng chủ động. Mọi tướng mình nhận `r1 + r2·AP` Khiên, hồi `r3` lượng Khiên đó thành Máu.

### Sona · nạp mana cả đội (tướng mới)
Tham số: `balance/heroes/sona.json`. Chưa có VFX và ảnh riêng, dùng hiệu ứng chung `bolt`, `heal`.
- **Nội tại Sức Mạnh Hợp Âm** `p1..p5`: Mỗi lá chiêu phe mình trả mana: đội hồi `p1`% mana đã trả + `p2·Máu tối đa` của Sona. Mỗi `p3` Máu phe mình mất (dồn ở khoá ẩn `aura:sona_lost`): đội hồi `p4 + p5·AP`. Lá miễn phí không tính. Đòn thường gây phép.
- **Q Anh Hùng Ca** `q0`: Chọn 1 tướng mình: vĩnh viễn `q1 + q3·AP` AD và `q4 + q5·AP` AP, không trần. 1 tướng kề nhận `q2`% (2 tướng kề thì tướng Máu thấp hơn).
- **E Giai Điệu Khích Lệ** `e0`: Quick khi địch đánh hoặc dùng chiêu. Như Q: `e1 + e3·AP` Giáp và `e4 + e5·AP` Kháng phép, lan `e2`%.
- **Buff:** Stack `buff_atk, buff_ap, buff_armor, buff_mr` trên tướng nhận, `g.stats` đọc nên còn khi Sona đã ngã; `carrierStacks`: tướng mang chết mất một nửa.
- **R Khúc Cao Trào** `r0`: Quick khi địch đánh hoặc dùng chiêu. Mọi tướng mình hồi `r1 + r2·AP` Máu, đội hồi `r3 + r4·AP` mana.

### Soraka · ánh sáng
Tham số: `balance/heroes/soraka.json`.
- **Nội tại Cứu Rỗi** `p1..p4`: Mỗi khi phe bạn được hồi tổng `p1` Máu, nhận 1 [Thánh Quang], vô hạn. Mỗi tầng tăng `p2` hồi Máu nhận vào của mọi tướng mình. Đòn thường tướng mình gây thêm `p3 + p4·AP` nếu Máu hiện tại nhiều hơn mục tiêu. Mất một nửa khi chết. Bỏ cứu chết (đã xoá `hero:soraka` khỏi `RULES.lethalOrder`).
- **Q Sao Băng** `q0`: Chọn 1 tướng địch; gây `q1 + q2·AP` sát thương phép. Nếu trúng: Soraka hồi `q3 + q4·AP`.
- **E Truyền Sinh Lực** `e0`: Quick. Chọn 1 tướng mình khác; Soraka mất `e1` Máu, tối thiểu còn 1; nó hồi `e2 + e3·AP`. Khi địch nhắm đúng 1 tướng mình khác; mục tiêu là tướng đó.
- **R Điều Ước** `r0`: Mọi tướng mình hồi `r1 + r2·AP`. Dưới `r3` (40%) Máu tối đa hồi gấp đôi.
## Pháp sư

Mỗi lượt nhận 1 lá phép tạm, tồn tại tới hết lượt đối phương.

### Brand · lửa
Tham số: `balance/heroes/brand.json`.
- **Nội tại Hoả Lực** `p1..p4`: Chiêu trúng gắn `p1 + p2·AP` [Bỏng] theo đơn vị X.Y (2,26 = 2 chắc + 26% thêm 1).
- **Bỏng:** Bộ đếm đặt trên tướng địch (`carrierStacks`). Đầu lượt tướng mang, mỗi Bỏng gây `p3` Máu hiện tại + `p4` Máu tối đa sát thương phép. Không hết hạn. Tướng mang chết mất một nửa; Brand chết không ảnh hưởng (vẫn cháy qua `onStandby`).
- **Q Thiêu Rụi** `q0`: Chọn 1 địch; `q1 + q2·AP` phép, gắn Bỏng. Sau đó nếu nó có từ `q3` (3) Bỏng: Choáng `q4 + q5·AP`.
- **E Rải Lửa** `e0`: Mọi địch `e1 + e2·AP` phép, gắn Bỏng.
- **R Bão Lửa** `r0`: Mọi địch `r1 + r2·AP` phép, gắn Bỏng; Bỏng nhân đôi và cháy ngay.

### Ahri · lửa cáo
Tham số: `balance/heroes/ahri.json`.
- **Nội tại Hút Tinh Hoa** `p1..p3`: Mỗi đánh thường, dùng chiêu hoặc đổi chỗ cho 1 [Tinh Hoa] theo từng điều kiện, vô hạn; đòn thường gây phép.
- **Tinh Hoa:** Q, E, R thêm `p1`; đòn thường thêm `p2·AP` và `p3` Tốc Đánh. Mất một nửa khi chết.
- **Q Quả Cầu Ma Lực** `q0`: Chọn địch đối diện, hoặc địch có Say Mê ở bất kỳ đường; gây `q1 + q2·AP` phép. Sau đó, gây thêm `q3`% Máu đã mất thành chuẩn.
- **E Phi Hồ** `e0`: Chọn 1 tướng mình khác; đổi chỗ, địch đối diện vị trí mới nhận `e1 + e2·AP` phép.
- **R Mê Hoặc** `r0`: Chọn địch đối diện; `r1 + r2·AP` phép và [Say Mê]: Ahri gây thêm `r3`%, nó gây ít hơn `r4`% lên Ahri. Không hết hạn, tối đa 1 tầng, mất khi nó bị hạ.

### Annie · lửa ấm
Scale theo AP và Máu tối đa. Tham số: `balance/heroes/annie.json`. Cờ `stunBonusOnly` (1): quyết định tạm của chủ, phần chịu thêm chỉ áp cho Choáng (0 = mọi khống chế).
- **Nội tại Hoả Thuật** `p1..p4`: Chiêu cho 1 [Lửa], tối đa `p1` (4). Đủ: chiêu kế tiêu hết (không cho Lửa) và Choáng mọi địch trúng `p2 + p3·AP` đơn vị. Tướng đang Choáng chịu thêm `p4` từ Annie và Tibbers. Mất một nửa Lửa khi chết.
- **Q Phi Tiêu Lửa** `q0`: 1 địch `q1 + q2·AP + q3·Máu tối đa` phép. Hạ gục: lá về tay.
- **E Lá Chắn Cháy** `e0`: Quick. Chọn 1 địch; `e1 + e2·AP + e3·Máu tối đa` phép, Annie nhận `e4 + e5·AP + e6·Máu tối đa` Khiên. Khi địch nhắm đúng Annie; mục tiêu là kẻ đó.
- **R Tibbers** `r0`: Mọi địch `r1 + r2·AP + r3·Máu tối đa` phép; gọi [Tibbers] ô phụ: Máu `r4 + r5·AP + r6·Máu tối đa`, Giáp `r7..r9`, Kháng `r10..r12`, sát thương phép `r13 + r14·AP + r15·Máu tối đa` (cùng dạng); cuối lượt Annie đánh 1 địch ngẫu nhiên. Annie chết thì biến mất.

### Lux · ánh sáng lăng kính
Tham số: `balance/heroes/lux.json`. Cờ `rStep`: bước giữa các mức chi mana của R trong giao diện. Khoá stack giữ tên cũ `lux_pool`; phần mana lẻ chưa đủ `p1` dồn ở khoá ẩn `aura:lux_rem`.
- **Nội tại Chiếu Sáng** `p1, p2`: Mỗi `p1` mana cả đội tiêu cho 1 [Ánh Sáng], vô hạn. Chiêu thêm `p2`·Ánh Sáng phép (tính sau khi trả mana của chiêu đó), không tăng đánh thường. Mất một nửa khi chết.
- **Q Lăng Kính** `q0`: Quick. Chọn 1 địch; `q1 + q2·AP` phép, Lux nhận `q3 + q4·AP` Khiên.
- **E Khoá Ánh Sáng** `e0`: 1 địch `e1 + e2·AP` phép. Từ `e3` Ánh Sáng: Choáng `e4 + e5·AP` đơn vị.
- **R Cầu Vồng Tối Thượng** `r0`–`r1`: Chi M mana (từ `r0` đến `r1`, không quá mana đội). 1 địch `r2 + r3·AP + r4·M` phép.

### Viktor · hextech
Tham số: `balance/heroes/viktor.json`.
- **Nội tại Tiến Hoá Vinh Quang** `p1`: Mỗi lá bỏ khỏi tay phe mình (mọi cách bỏ) cho 1 [Tiến Hoá], vô hạn; mỗi chiêu thêm `p1` phép mỗi Tiến Hoá lên mỗi mục tiêu. Mất một nửa khi chết.
- **Q Tháo Rời** `q0`: Quick. Bỏ tối đa `q1` lá, chọn 1 địch; `q2 + q3·AP` phép, nhận `q4 + q5·AP` Khiên mỗi lá.
- **E Tia Tử Thần** `e0`: Mọi địch `e1 + e2·AP` phép.
- **R Trường Trọng Lực** `r0`: Mọi địch `r1 + r2·AP` phép; Choáng địch nhiều Máu nhất `r3 + r4·AP` đơn vị.

### Lissandra · băng
Tham số: `balance/heroes/lissandra.json` (R giữ tên `r6` cho thời gian Đóng Băng, không có `r4`, `r5`).
- **Nội tại Băng Sâu** `p1..p3`: Chiêu gây sát thương (mỗi lá thử 1 lần) có `p1 + p2·AP` cơ hội Hoá Băng 1 lá tay đối thủ. Lá băng không dùng được, tan sau `p3` đơn vị hoặc khi Lissandra bị hạ.
- **Q Mảnh Băng** `q0`: 1 địch `q1 + q2·AP` phép, Hoá Băng 1 lá.
- **E Vòng Băng** `e0`: 1 địch `e1 + e2·AP`. Lá chiêu của nó đang băng: Choáng `e3 + e4·AP` đơn vị.
- **R Hầm Mộ Băng** `r0`: Quick. Mọi địch `r1 + r2·AP + r3·N` phép, N số lá băng. Sau đó, Lissandra Đóng Băng `r6` đơn vị. Khi địch nhắm đúng Lissandra.

### Twisted Fate · bài
Tham số: `balance/heroes/twistedfate.json`.
- **Nội tại Thần Bài:** Đầu lượt, sau khi rút, chủ xem lá trên cùng bộ và có thể đặt xuống đáy (lá tạm Thần Bài ghi lá đó; không chọn thì biến mất). Cần thêm hook `onMainStart` vì bước rút chạy ngay sau `onTurnStart`.
- **Q Chọn Bài** `q0`: Chọn 1 địch; lật lá trên cùng bộ của mình, gây `q1 + q2·AP` phép. Lá chiêu: trúng thêm 2 đường kề (cùng sát thương). Vàng hoặc đồ: Choáng `q3 + q4·AP` đơn vị. Lá khác: rút lá đó. Lá lật không được rút vào mộ.
- **E Xào Bài** `e0`: 1 địch `e1 + e2·AP`; xem `e3` lá trên cùng, chọn 1 lá đặt lên đỉnh, các lá còn lại giữ thứ tự (args.pick).
- **R Định Mệnh** `r0`: Lật `r1` lá; mỗi lá 1 địch ngẫu nhiên nhận `r2 + r3·AP`, lá chiêu gấp đôi; lá vào mộ.

### Vel'Koz · plasma hư không
Tham số: `balance/heroes/velkoz.json`.
- **Nội tại Phân Rã** `p1..p4`: Mỗi tia trúng cho 1 Phân Rã, đủ `p1`: nổ `p2 + p3·AP + p4`% Máu tối đa chuẩn. Tướng mang chết mất một nửa.
- **Q Phân Hạch Plasma** `q0..q4`: 1 địch `q1 + q2·AP`; sau đó tách sang tối đa 2 địch ngẫu nhiên, mỗi tướng `q3 + q4·AP`.
- **E Khe Nứt Hư Không** `e0..e6`: khe cắt ngang tâm `e1 + e2·AP` (nhẹ) và 2 đường kề `e3 + e4·AP` (nặng), rồi nổ ngay: ai còn đứng nhận thêm `e5 + e6·AP`.
- **R Tia Phân Rã Sự Sống** `r0`: 1 địch `r1` tia, mỗi tia `r2 + r3·AP`.

### Rumble · phế liệu (tướng mới)
Tham số: `balance/heroes/rumble.json`. Cờ `pickOffer` (6): số lựa chọn Tái Chế tối đa mỗi lần (id lá khác nhau). Lựa chọn là lá tạm `rumble_pick` (data `group, uid, left`), Lá Tái Chế mang id lá gốc (`darius_q`), `data.recycled` = tướng gốc.
- **Nội tại Tái Chế** `p1, p2`: Một lần mỗi lượt (chỉ tiêu khi có lá để chọn): Khi dùng chiêu, chọn 1 lá chiêu không phải R trong mộ; lên tay thành [Lá Tái Chế]: Rumble dùng như chiêu của mình, hệ số theo AP (AD đổi theo `p2`, mặc định 2 AP = 1 AD), không áp khống chế, giảm `p1` mana, tồn tại tới hết lượt đối phương, dùng xong biến mất.
- **Q Súng Phun Lửa** `q0`: Địch đối diện và 2 đường kề `q1 + q2·AP` phép.
- **E Khiên Phế Liệu** `e0`: Quick. 1 địch `e1 + e2·AP`, nhận `e3 + e4·AP` Khiên. Khi địch nhắm đúng Rumble; mục tiêu là kẻ đó.
- **R Mưa Tên Lửa** `r0`: Mọi địch `r1 + r2·AP`. Sau đó, chọn tối đa `r4` lá chiêu không phải R trong mộ thành Lá Tái Chế.

### Sylas · xích cổ thạch (tướng mới)
Tham số: `balance/heroes/sylas.json`. Cờ `keepCC` (1): Chiêu Đoạt giữ khống chế, khác Rumble. Chiêu Đoạt dùng lại cơ chế Lá Tái Chế: mang id lá gốc, `data.recycled` = tướng gốc, `data.stolen` = 1, `data.apPerAd` = `p4`.
- **Nội tại Bùng Nổ Cổ Thạch** `p1..p3`: Mỗi lá chiêu Sylas dùng cho 1 [Xiềng Nổ], tối đa `p1` (3). Đòn đánh thường gây phép; mỗi đòn tiêu 1 Xiềng Nổ để gây thêm `p2 + p3·AP` phép lên mục tiêu và 2 đường kề. Mất một nửa khi chết.
- **Q Roi Xích** `q0`: Địch đối diện và 2 đường kề `q1 + q2·AP` phép, địch đối diện nhận `q3`%.
- **E Thợ Săn Vua** `e0`: Quick. Chọn 1 địch; `e1 + e2·AP` phép, Sylas hồi `e3 + e4·AP` cộng `e5`% Máu đã mất. Khi địch nhắm đúng Sylas; mục tiêu là kẻ đó.
- **R Đoạt Chiêu** `r0`: Chọn 1 địch trên sân, đoạt R của tướng đó (cờ `stealOnlyR`) và tung ngay, nhắm đúng tướng đó nếu được, không lên tay (cờ `stealToHand` tắt). Phải đủ mana cả `r0` lẫn mana gốc. Sylas dùng như chiêu của mình, trả mana gốc của lá đó, mọi hệ số AD đổi thành AP theo `p4` (2 AP = 1 AD, cùng tỉ lệ Rumble), giữ nguyên khống chế (`keepCC` = 1), giữ Quick nếu lá gốc là Quick, tồn tại tới hết lượt đối phương, dùng xong biến mất. Hệ số Máu, Giáp của lá gốc giữ nguyên chữ, tính theo Sylas.
- **Không hiện trong lựa chọn:** chiêu có `canPlay`/`options` rỗng với Sylas lúc đó (Katarina R, Darius R khi chưa có Chảy Máu, Teemo R, Azir Q, R khi phe Sylas chưa có Lính trên sân) và danh sách `OWNER_BOUND` trong `heroes/sylas.ts`: Ashe Q, Kog'Maw E, Tristana Q, Tristana E, Vayne R, Jinx Q, Kha'Zix R, Gangplank E, Gangplank R, Sylas R (trận gương).
- **Mất phần phụ nhưng vẫn đoạt được** (phần chính là sát thương, phần phụ nằm ở hook của chủ): Ahri R mất Say Mê, Zed Q mất đòn thêm, Brand mất Bỏng cháy đầu lượt nếu phe mình không có Brand, Braum Q mất Dấu Băng, Gangplank Q không tìm được lá E. Azir Q, E, R đoạt được: Sylas đặt Lính phe mình, Lính đâm theo đòn của Sylas, hết hạn và mất một nửa khi chết như Azir, Sylas không nhận Tốc Đánh theo Lính. Rumble R đoạt được: lá chọn Tái Chế và Lá Tái Chế về Sylas, theo luật Rumble (không khống chế). Zed R nhịp sau vẫn bắn nhờ `DelayedEffect.hookHero`; Vel'Koz E nổ ngay trong lúc dùng.

### Mel · ánh vàng (tướng mới)
Tham số: `balance/heroes/mel.json`. Chói Lọi là carrier stack (`mel_glow`). Ngưỡng hạ đi qua `g.executeLethal`: không tính Khiên, Giáp nhưng vẫn qua cứu chết.
Lối chơi: Q và E tích nhiều Chói Lọi để R.
- **Nội tại Hào Quang Chói Lọi** `p1..p5`: Chiêu Mel trúng gắn `p1 + p2·AP` [Chói Lọi] theo đơn vị X.Y lên địch, vô hạn. Đòn thường Mel gây phép. Đầu lượt không tự cháy. Q, E, R gây thêm `p5·Chói Lọi` phép theo số Chói Lọi mục tiêu đang có, Sylas đoạt Q, R cũng tính. Sau khi Mel gây sát thương lên địch có Chói Lọi: nếu Máu hiện tại của nó không quá `p3 + p4·Chói Lọi`, nó bị hạ ngay. Tướng mang chết mất một nửa, Mel chết không đổi.
- **Q Loạt Bắn Rực Rỡ** `q0`: Chọn 1 địch; nó nhận `q1` tia, 2 đường kề mỗi tướng địch nhận `q4` tia. Mỗi tia `q2 + q3·AP` phép và gắn Chói Lọi riêng. Một nhịp.
- **E Phản Quang Chiết Kính** `e0`: Quick, Chỉ Nối Chuỗi. Khi địch dùng lá chiêu nhắm đúng 1 tướng mình. Không Vô Hiệu: chiêu vẫn trúng, sát thương lên tướng đó giảm `e1`%. Sau khi chiêu giải quyết, Mel tung lại đúng lá chiêu về kẻ dùng (`g.applyMirror` phát `play`, `cast` và các nhát `tag: skill`, nên client chạy anim gốc), đúng số nhát, mỗi nhát `e2`% sát thương thực của nhát đó, cùng loại sát thương, nhát phép đầu cộng `p5·Chói Lọi` phép, khống chế trả về với `e4`% thời lượng (đơn vị X.Y), và mọi khống chế chiêu gây, rồi gắn `e3` Chói Lọi. Đổi chỗ, cướp bài, hồi Máu của kẻ dùng không phản.
  - Sát thương thực chịu = Máu mất + phần Khiên hấp thụ, sau `e1` và sau Giáp/Kháng của tướng được bảo vệ. Liên Kết Đá chia sát thương thì chỉ tính phần tướng đó nhận.
  - Phần phản là `e2`% con số đó rồi đi qua Giáp/Kháng và Khiên của kẻ dùng như sát thương hiệu ứng cùng loại; không nối Chuỗi được nên không có vòng lặp phản.
  - Cùng thời lượng = kẻ dùng mất đúng số lượt của chính nó như tướng được bảo vệ. Phản trong lượt kẻ dùng thì tính từ lượt kế của nó.
  - Chiêu bị huỷ ở mắt xích dưới thì không phản gì, cũng không gắn dấu. Lá phản bị giật hoặc huỷ thì chiêu địch trúng bình thường.
- **R Nhật Thực Vàng** `r0`: Mọi địch trên sân nhận `r1 + r2·AP + r3·Chói Lọi` phép (thêm `p5·Chói Lọi` của nội tại), không cần có Chói Lọi; xét ngưỡng; rồi tiêu hết Chói Lọi.

### Azir · cát Shurima (tướng mới)
Tham số: `balance/heroes/azir.json`. Vùng Shurima: engine chưa có trường vùng đất, khi có thì thêm Azir vào Shurima.
- **Lính Cát (chốt 02/11/2026):** Bộ đếm `laneStacks[side][lane].azir_soldiers` thuộc **ô sân**, không phải unit hoặc stack trên tướng. Cả phe tối đa `p1` (5), không tự hết hạn. Tướng đổi chỗ, bị hạ hay hồi sinh không di chuyển/xóa Lính. Khi Azir bị hạ, cả phe giữ `floor(tổng Lính / 2)`: chia đôi từng ô trước, các Lính lẻ còn được giữ ưu tiên đường số nhỏ để tổng chỉ làm tròn một lần. Ô đồng minh trống vẫn có Lính và vẫn đâm địch đối diện nếu có.
- **Nội tại Hoàng Đế Shurima** `p2..p6, p8`: Mỗi `p2` phát đồng đội đánh trúng địch (đếm ở stack `azir_call`), Azir nhận 1 lá E tạm miễn phí, không tốn mana, tồn tại tới hết lượt đối phương. Đánh thường gây phép, thêm `p8·AP` phép. Mỗi Lính phe mình cho Azir `p3` Tốc Đánh. Mỗi đòn đánh Azir trúng: mọi Lính trên sân đâm địch đối diện ô có Lính, mỗi Lính `p4 + p5·AP + p6·Tốc Đánh` phép, là sát thương hiệu ứng, không kích hiệu ứng trúng đòn của đồ. Lính cùng ô gộp một số.
- **Q Cát Càn Quét** `q0`: Chọn 1 tướng địch; mọi Lính trên sân đâm nó, mỗi Lính `q1 + q2·AP` phép mỗi nhát; số nhát theo Tốc Đánh như đòn đánh (`g.attackHits`). Không có Lính trên sân thì không dùng được. Nhắm đơn nên Mel E phản được.
- **E Trỗi Dậy** `e0`: Chọn 1 tướng mình (gồm Azir); gọi 1 Lính lên ô của tướng đó. Đủ `p1` Lính thì không dùng được.
- **R Phân Chia Thiên Hạ** `r0`: Mọi Lính trên sân đâm 1 nhát địch đối diện ô có Lính, mỗi Lính `r1 + r2·AP` phép. Không có Lính trên sân thì không dùng được.

## Đỡ đòn

### Braum · băng
- **Nội tại Song Giáp:** Đòn địch trúng cho `p1` Song Giáp, vô hạn, mỗi tầng `p2` Giáp và Kháng. Mất một nửa khi chết.
- **Q Cú Đấm Băng:** 1 địch `q1 + q2·Máu tối đa` phép, gắn [Dấu Băng] `q3` đơn vị: đồng minh khác đánh trúng thì tiêu, Choáng `p3 + p4·Giáp`, Braum nhận `p5` Song Giáp. Braum tự đánh thì dấu giữ nguyên.
- **E Đứng Sau Tôi:** Quick, Chỉ Nối Chuỗi. Khi địch đánh hoặc dùng chiêu nhắm đúng 1 tướng mình khác: huỷ tác động lên tướng đó (`ReactFx.intercept`); Braum nhận thay `e5`% sát thương (60), `e4` Song Giáp và `e1 + e2·Máu tối đa + e3·Giáp` Khiên. Không đỡ chiêu cả phe.
- **R Khe Băng:** Mọi địch `r1 + r2·Máu tối đa`. Đối diện Choáng `r3 + r4·Giáp`, còn lại `r5 + r6·Giáp`.

### Leona · mặt trời
- **Nội tại Giáp Mặt Trời:** Thêm `p1`% tổng Giáp (qua `allyBonusStats`, không tính hào quang Ornn/Malphite).
- **Q Khiên Bình Minh:** Địch đối diện `q1 + q2·Giáp` vật lý, Choáng `q3 + q4·Giáp`.
- **E Nhật Thực:** Quick. 1 địch `e1 + e2·Giáp` phép, Choáng `e3 + e4·Giáp`; Leona nhận `e5 + e6·Giáp` Giáp trong `e7` đơn vị. Khi địch đánh hoặc dùng chiêu; mục tiêu là kẻ đó.
- **R Thái Dương Giáng Thế:** Mọi địch `r1 + r2·Giáp` phép, Choáng `r3 + r4·Giáp`.

### Malphite · đá (không khống chế)
- **Nội tại Thân Đá:** Trên sân: mọi tướng mình (kể cả Malphite) thêm `p1`·Giáp và `p2`·Máu tối đa gốc của Malphite.
- **Q Mảnh Vỡ Địa Chấn:** 1 địch `q1 + q2·Giáp` phép; mọi tướng mình `q3 + q4·Giáp` Giáp trong `q5` đơn vị.
- **E Mạch Đá:** Quick (`e0` mana). Khi địch đánh hoặc dùng chiêu. Chọn 1 tướng mình khác; nó và Malphite nhận [Liên Kết Đá]: không hết hạn, nối nhiều tướng; sát thương địch lên 1 tướng liên kết chia đều cho mọi tướng liên kết, sát thương cả phe không chia. Malphite chết mất hết; tướng chết mất liên kết của nó.
- **R Không Thể Cản Phá:** Mọi địch `r1 + r2·Giáp` phép, mất `r3 + r4·Giáp` Giáp trong `r5` đơn vị.

### Blitzcrank · cướp bài
- **Nội tại Thu Gom:** Cướp 1 lá: 1 [Phụ Tùng], mỗi tầng `p1` Giáp và Kháng. Mất một nửa khi chết.
- **Cướp:** Lá thường giữ nguyên. Lá chiêu địch vào mộ, thay bằng lá Q hoặc E ngẫu nhiên của tướng mình trên sân.
- **Q Bàn Tay Hoả Tiễn:** Đối thủ có lá; chọn 1 địch; Cướp 1 lá ngẫu nhiên, `q1 + q2·Giáp + q3·Kháng` phép. Lá cướp là lá chiêu của chính địch đó: Kéo nó sang đối diện Blitzcrank.
- **E Tay Giật:** Quick, Chỉ Nối Chuỗi. Khi địch dùng lá chiêu (kể cả R): Cướp và Vô Hiệu, Choáng kẻ dùng `e1 + e2·Máu tối đa`.
- **R Trường Điện Từ:** Mọi địch `r1 + r2·Máu tối đa` phép, Câm Lặng `r3 + r4·Kháng` đơn vị; đối thủ bỏ `r5` lá ngẫu nhiên.

### Ornn · rèn đồ
- **Nội tại Lò Rèn Sống:** Trên sân: chỉ số đồ cả đội thêm `p1`%, thêm `p2`% mỗi vòng đã mặc, trừ Máu.
- **Q Núi Lửa Trồi:** 1 địch `q1 + q2·Máu tối đa` phép, tạo 1 mảnh đồ lên tay.
- **E Rèn Lửa:** Quick. Khi địch đánh hoặc dùng chiêu. Chọn 1 tướng mình có đồ; đồ nhận `e1` Kiệt Tác, nó nhận `e2 + e3·Giáp` Khiên mỗi món. Kiệt Tác: mỗi tầng tăng `p3`% chỉ số đồ, không mất khi chết (chờ thầy chốt; cờ JSON `masterworkKeptOnDeath`, tắt thì mất một nửa). Engine: stack `ornn_mw` (tầng) và `itemAmp` (= tầng × `p3`, `g.stats` đọc).
- **R Tiếng Gọi Thần Rèn:** Quick. Khi địch đánh hoặc dùng chiêu. Chọn 1 tướng mình; rèn 1 món hoàn chỉnh ngẫu nhiên mặc ngay, đủ ô thì về tay, rồi tạo thêm 1 món hoàn chỉnh ngẫu nhiên lên tay. Không sát thương.

## Xạ thủ

Sống bằng đánh thường, scale AD.

### Ashe
Mana `q0`, `e0`, `r0`. Buốt là carrier stack (`frost`) trong stacks của tướng mang.
- **Nội tại Băng Tiễn:** Đòn trúng gắn 1 [Buốt], vô hạn: chịu thêm `p1`% sát thương từ phe Ashe mỗi Buốt (khi Ashe còn trên sân). Đạt `p2`: tiêu hết, Choáng `p3 + p4·AD`. Tướng mang chết mất một nửa; Ashe chết không đổi.
- **Q Tập Trung:** Trong `q3` đơn vị: `q1` Tốc Đánh, đòn gắn thêm `q2` Buốt.
- **E Tên Băng:** 1 địch `e1 + e2·AD`, gắn `e3` Buốt.
- **R Đại Băng Tiễn:** 1 địch bất kỳ đường `r1 + r2·AD`, `r3` Buốt, Choáng `r4 + r5·AD`.

### Teemo
Mana `q0`, `e0`, `r0`. Cờ JSON `halveMushroomsOnDeath` (hiện `false`, chờ thầy chốt): Teemo chết thì kho Nấm trong bộ đối thủ mất một nửa.
- **Nội tại Nấm Độc:** Đòn trúng xáo `p1` Nấm vào bộ đối thủ. Rút trúng: tướng tỉ lệ Máu thấp nhất nhận `p2 + p3·AD + p4·Tốc Đánh` vật lý, có thể chí mạng, rồi rút bù. Nấm giữ nguyên lá đặc biệt `mushroom` và sự kiện `mushroom` (client vẽ).
- **Q Gài Nấm:** 1 địch `q2 + q3·AD`, xáo `q1` Nấm.
- **E Phi Tiêu Mù:** Quick. 1 địch `e1 + e2·AD + e3`·Nấm, Mù `e4 + e5·AD`. Khi địch đánh Teemo; mục tiêu là kẻ đánh.
- **R Kích Nổ:** Nổ tối đa `r1` Nấm, mỗi Nấm `r2 + r3·AD + r4·Tốc Đánh` lên tướng tỉ lệ Máu thấp nhất, có thể chí mạng, không rút bù. Chỉ đánh được khi bộ đối thủ có Nấm.

### Tristana
Mana `q0`, `e0`, `r0`. Bom là carrier stack (`tri_bomb`). Cờ JSON: `noCrit` (true), `detonatesPerTurn` (1).
- **Nội tại Bom Hẹn Giờ:** Đòn trúng gắn `p1` [Bom], vô hạn. Cờ `noCrit`: không chí mạng, mỗi 1% Chí mạng đổi thành `p2` Tốc Đánh. Nút `tri_detonate` (không tốn lá, `detonatesPerTurn` lần mỗi lượt): kích nổ Bom trên 1 địch. Sát thương Bom đủ hạ thì tự nổ. Tướng mang chết mất một nửa; Tristana chết không đổi.
- **Bom nổ:** `p3·n·(1 + n/p4)·(1 + p5·AD)` vật lý, không chí mạng.
- **Q Bắn Nhanh:** Trong `q1` đơn vị: `q2 + q3·AD` Tốc Đánh.
- **E Gắn Bom:** 1 địch `e1` Bom.
- **R Đại Bác:** 1 địch bất kỳ đường: kích nổ Bom trên nó, địch khác nhận `r3`% vụ nổ, rồi nó (còn sống) nhận `r1 + r2·AD`.

### Kog'Maw
Mana `q0`, `e0`, `r0`. Cờ JSON `gainsHungerOnDeath` (true). Đói là stack của chính Kog'Maw, không nằm trong `deathHalf`.
- **Nội tại Cơn Đói Hư Không:** Đầu lượt trên sân: `p1` Đói nhân `(1 + p7·chí mạng)`. Tướng khác chết (khi Kog'Maw trên sân): `p2` Đói, cũng nhân vậy. Vô hạn, phần lẻ theo X.Y. Kog'Maw không chí mạng.
- **Đói:** Mỗi Đói, đòn trúng thêm `p3`% Máu tối đa mục tiêu + `p4 + p5·AD` vật lý, không chí mạng. Bị hạ: nhận `p6` Đói, không mất Đói (ngoại lệ).
- **Q Phun Axít:** 1 địch `q1 + q2·AD`, Rã Giáp `q3` đơn vị.
- **E Cao Xạ Ma Pháp:** `e1` đơn vị: `e2` Tốc Đánh, đòn tới mọi đường (bỏ qua ép đánh Đỡ Đòn), thêm `e3`% Máu tối đa mục tiêu.
- **R Pháo Sinh Học:** 1 địch bất kỳ đường `r1 + r2·AD + r3`% Máu đã mất. Hạ: `r4` Đói.

### Jinx
Mana `q0`, `e0`, `r0`. `summonModes` `minigun` / `rocket`; súng lưu ở stack `jinx_gun` (0 Bằng Chíu, 1 Xương Cá).
- **Nội tại Phấn Khích:** Đòn trúng: `p1` × tỉ lệ Máu đã mất của mục tiêu là cơ hội nhận `p2 + p2b·Tốc Đánh` Điên. Hạ gục: thêm `p3` Điên.
- **Điên:** Mỗi Điên, đòn trúng thêm `p4 + p5·AD`. Mất một nửa khi chết.
- **Súng:** Chọn khi ra sân; nút Tráo Hàng! (`jinx_swap`) chỉ dùng ở Standby, 1 lần mỗi lượt, không tốn lá và mana. Bằng Chíu: `q1` Tốc Đánh. Xương Cá: đòn thêm `q2 + q3·AD` lên 2 đường kề mục tiêu.
- **Q Giật Bắn!** `q0`: Chọn 1 địch bất kỳ đường; 1 đòn đánh thật theo súng đang cầm (không tốn lượt đánh), thêm `q4 + q5·AD` và `q6` lần phần Điên, có thể chí mạng. Trúng: chắc chắn nhận `p2 + p2b·Tốc Đánh` Điên.
- **E Lựu Đạn Ma Hỏa!:** Quick. 1 địch `e1 + e2·AD`, Mù `e3 + e4·AD`. Khi địch đánh đúng 1 tướng mình; mục tiêu là kẻ đánh.
- **R Tên Lửa Đạn Đạo Siêu Khủng Khiếp!:** 1 địch bất kỳ đường `r1 + r2·AD + r3`% Máu đã mất, 2 đường kề nhận `r4`%. Hạ: Phấn Khích (nhận Điên như một đòn trúng, chắc chắn).

### Miss Fortune · diện rộng
Mana `q0`, `e0`, `r0`.
- **Nội tại Song Súng:** Mỗi đòn nảy sang 1 địch khác, `p1`% sát thương.
- **Q Bắn Nảy:** 1 địch `q1 + q2·AD`, có thể chí mạng, nảy 2 địch khác `q3`%.
- **E Mưa Đạn:** Mọi địch `e1 + e2·AD`; `e3` đơn vị chịu thêm `e4`% từ phe bạn.
- **R Đạn Tử Thần:** `r1 + r2·Tốc Đánh` loạt (phần lẻ theo X.Y), mỗi loạt mọi địch `r3 + r4·AD`, có thể chí mạng.

## Đấu sĩ

Giữ đòn không cần lá 50%. Scale AD và Máu.

### Gangplank
- **Nội tại Thuốc Súng:** Đầu lượt [Thùng] +1 Thuốc Súng, không trần. Đòn của Gangplank vào Thùng mình kích nổ (`extraAttackTargets`).
- **Nút Úp Lá** (`abilities` `gp_stash`, `p1` mana, 1 lần mỗi lượt): ô phụ trống: Úp 1 lá tay thành Thùng 0 Thuốc Súng, đối thủ không thấy. Sự kiện `ability` không mang lá; lá và Thuốc Súng nằm trong `token.card` / `token.secret`.
- **Thùng:** Vật Triệu Hồi Úp ô phụ, 1 Máu, tối đa 1, mọi vai địch đánh được. Vỡ hoặc nổ thì lật. Lá chiêu: nổ `p2·n·(1 + n/p4)·(1 + p3·AD)` vật lý (n = Thuốc Súng); địch phá chỉ kẻ phá nhận, tự kích mọi địch nhận. Vàng: 2 lá Vàng. Đồ: lá về tay. Lá khác: hồi `p5 + p6·Máu tối đa`.
- **Q Ăn Cam** `q0`: Hồi `q1 + q2·Máu tối đa`, `q3 + q4·Máu tối đa` Giáp `q5` đơn vị. Tìm 1 lá E.
- **E Thùng Thuốc Súng** `e0`: Ô phụ trống: Úp lá này thành Thùng `e1` Thuốc Súng (3), đối thủ không thấy.
- **R Lệnh Truy Nã** `r0`: 1 địch bất kỳ đường; đặt [Truy Nã] `r1` đơn vị, kích nổ Thùng: lá gì cũng nổ theo Thuốc Súng. Trong hạn, Thùng nổ chỉ đánh tướng này `r2`%. Nó bị hạ trong hạn: `r3` Vàng.

### Darius
- **Nội tại Xuất Huyết:** Đòn trúng 1 [Chảy Máu], vô hạn, carrier stack trên tướng mang (kèm trạng thái song song `bleed_t` làm đồng hồ); đầu lượt tướng mang mỗi tầng `p1 + p2·AD` vật lý; hết sau `p3` đơn vị từ lần cộng cuối. Tướng mang chết mất một nửa; Darius chết không ảnh hưởng.
- **Q Tàn Sát** `q0`: Đối diện `q1 + q2·AD + q3·Máu tối đa` + `q6` mỗi Chảy Máu, gắn `q4`; hồi `q5` mỗi Chảy Máu.
- **E Bắt Giữ** `e0`: 1 địch khác đường; hoán đổi với địch đối diện Darius, `e1 + e2·AD` + `e4` mỗi Chảy Máu, gắn `e3`.
- **R Máy Chém Noxus** `r0`: 1 địch có Chảy Máu bất kỳ đường; đổi chỗ sang đối diện nó, `r1 + r2·AD` + `r3` mỗi Chảy Máu chuẩn, tiêu hết. Hạ: về tay ngay (`c.toHand()`). Không hạ: lá biến mất (`c.vanish()`), `g.delay("r_return")` đếm mỗi đầu lượt Darius, sau `r4` đơn vị tạo lá R mới trên tay (sự kiện `returnToHand`), kể cả khi Darius đã chết.

### Garen · phổ thông, không cần đồ
- **Nội tại Kiên Cường:** Đòn hồi `p1 + p2·Máu tối đa`, tăng `p3` Giáp, vô hạn; mất một nửa khi chết.
- **Q Đòn Quyết Định:** Đối diện `q1 + q2·AD`, Câm Lặng `q3` đơn vị.
- **E Phán Xét:** Quick. `e1 + e2·Máu tối đa` Khiên; đối diện và 2 đường kề `e3 + e4·AD`. Khi địch nhắm đúng Garen.
- **R Công Lý Demacia:** 1 địch bất kỳ đường `r1 + r2·AD` chuẩn, số gốc cao, hệ số thấp.

### Aatrox
- **Nội tại Cái Giá Bằng Máu:** Thêm `p1`% sát thương mỗi 1% Máu đã mất (mọi sát thương đòn và chiêu lên tướng địch); hồi `p2`% sát thương gây ra.
- **Q Lưỡi Gươm Darkin** `q0`: Mất `q1`% Máu hiện tại (còn ít nhất 1); đối diện và 2 đường kề `q2 + q3·AD + q4·Máu đã mất`.
- **E Xiềng Xích Hút Máu** `e0`: 1 địch `e1 + e2·AD`, hồi `e3`% sát thương.
- **R Kẻ Diệt Thế** `r0`: Mọi địch `r1 + r2·AD`, rồi `g.transform` `r3` đơn vị: thêm `r6` AD, `r7`% Máu tối đa, `r8` Tốc Đánh, nội tại gấp `r5`; lần đầu về 0 còn `r4`% Máu (`reviveHp`, khoá cứu chết `transform`).

### Yorick · câu giờ đốt bài
- **Nội tại Người Đào Mộ:** Đòn trúng: Đốt `p1` lá bộ đối thủ, nhận 1 [Hồn Ma]. Mỗi tầng `p2` Máu tối đa và `p3` Giáp. Mỗi bội số `p4` (20): tạo 1 lá R. Mất một nửa khi chết. Cờ `deckOutWinUsesEngineRule` = true (quyết định tạm): thắng bằng cạn bộ là luật sẵn của engine, không thêm điều kiện thắng.
- **Q Nghi Thức Cuối** `q0`: Đối diện `q1 + q2·Máu tối đa`, hồi `q3 + q4·Máu tối đa`.
- **E Sương Sầu** `e0`: Đốt `e1` lá; 1 địch `e2 + e3·Giáp`, Rã Giáp `e4` đơn vị. Có Ma Sương: nó đánh tướng đó.
- **R Khúc Ai Ca** `r0`: Gọi [Ma Sương] ô phụ. Đã có: hồi đầy, Ma Sương nhận 1 Tiến Hoá (`r8` Máu, `r9` Giáp, `r10` sát thương, mất khi Ma Sương mất).
- **Ma Sương:** Vật triệu hồi, Máu `r1 + r2·Máu tối đa`, Giáp `r3 + r4·Giáp`. Đầu lượt và mỗi đòn Yorick: đánh đối diện `r5 + r6·Hồn Ma`, Đốt `r7` lá. Yorick chết thì biến mất.

### Jayce · đổi vai Đấu sĩ và Xạ thủ (tướng mới)
Tham số: `balance/heroes/jayce.json`. Vùng Piltover: engine chưa có trường vùng đất, khi có thì thêm Jayce vào Piltover. Đổi vai qua `HeroDef.roleOf`, mọi nơi đọc `g.role(u)` theo dạng; Jayce mặc định vai Đấu sĩ ở màn chọn.
- **Đổi chỉ số đồ** `p3..p7`, `HeroDef.itemConvert`: chỉ tính chỉ số từ đồ, chỉ số gốc giữ nguyên. Búa: Tốc Đánh `p3` Máu mỗi điểm, Chí Mạng `p4` Máu mỗi 1%, hai chỉ số đó về 0. Pháo: Máu `p5`, Giáp `p6`, Kháng phép `p7` đổi thành AD, ba chỉ số đó về 0. Đổi dạng cập nhật Máu tối đa theo chênh lệch.
- **Búa hồi Máu** `p8, q7, e9, r9`: mỗi đòn đánh trúng hồi `p8·Máu tối đa`; Q hồi `q7`% sát thương gây ra; E hồi `e9·Máu đã mất`; R hồi `r9`% tổng sát thương gây ra.
- **Nội tại Tụ Điện Hextech** `p1, p2`: `summonModes` hammer / cannon như Jinx, lưu ở stack `jayce_form` (0 Búa, 1 Pháo). Búa: vai fighter, đánh đối diện, có đòn không cần lá. Pháo: vai marksman, đánh mọi đường, không có đòn không cần lá. Sau mỗi lần đổi dạng, đòn đánh kế thêm `p1 + p2·AD`. Mất Tăng Lực khi chết; dạng giữ nguyên qua hồi sinh.
- **Q** `q0`: Búa Chỉ Thiên!: 1 địch bất kỳ đường, hoán đổi sang đối diện, `q1 + q2·AD + q3·Máu tối đa`. Pháo Cầu Sấm: 1 địch bất kỳ đường `q4 + q5·AD`, 2 đường kề `q6`%.
- **E** `e0`: Búa Lôi Phạt: đối diện `e1 + e2·AD + e3`% Máu tối đa mục tiêu, Choáng `e4` đơn vị. Pháo Cổng Tăng Tốc: Jayce nhận 1 Gia Tốc (`jayce_gate`), không trần, không hạn. Mỗi Gia Tốc cho `e5` Tốc Đánh, cộng `e6` sát thương Q Pháo, `e7` sát thương R Pháo. Chỉ tính ở Pháo; ở Búa vẫn giữ nhưng không có tác dụng; chết mất một nửa (`deathHalf`). Sylas đoạt: không có Gia Tốc, nhận `e5` Tốc Đánh `e8` đơn vị.
- **Nút Đổi Dạng** (`abilities` `jayce_swap`): Không tốn lá, không tốn mana, chỉ dùng được ở Standby, 1 lần mỗi lượt của Jayce. Đổi dạng, nhận Tăng Lực. Có nút thì lượt dừng ở Standby chờ chọn; dùng xong tự sang Main 1.
- **R** `r0`: Búa Sấm Chớp Rền Vang: địch đối diện và 2 đường kề `r1 + r2·AD + r3·Máu tối đa`, đối diện chịu `r4`%. Pháo Tích Tụ: 1 địch bất kỳ đường `r5 + r6·AD + r7`% Máu đã mất, xuyên `r8` Giáp.
- Lá Q, E, R chỉ có một loại lá: `SkillDef.variant` đổi tên và chữ theo dạng; lá mang `data.form` lúc đánh, Chiêu Đoạt của Sylas mang dạng lúc đoạt (Sylas đoạt được cả R).

## Sát thủ

Sát thương R vùng 3 đường, tướng đối diện chịu nặng nhất.

### Qiyana
- **Nội tại Thần Khí Ixtal:** `setup` ghi `GameState.laneElements` một lần (bỏ qua nếu đã có): 5 đường mang Nguyên Tố công khai ngẫu nhiên, số lượng `lane_earth` Đất, `lane_water` Nước, `lane_grass` Cỏ (2/2/1). Qiyana hấp thụ theo đường đang đứng, áp cho chiêu kế.
- **Đất:** thêm `p1 + p2·AD` và `p3`% Máu đã mất mục tiêu; hạ gục hồi `p4`. **Nước:** Choáng `p5 + p6·AD` đơn vị. **Cỏ:** Tàng Hình `p7` đơn vị, E nối Chuỗi né chiêu đơn mục tiêu.
- **Q Lưỡi Đao Nguyên Tố** `q0`: Đối diện `q1 + q2·AD`, kèm Nguyên Tố.
- **E Vũ Điệu Nguyên Tố** `e0`: 1 địch bất kỳ đường; đổi chỗ sang đối diện, `e1 + e2·AD`, kèm Nguyên Tố của đường cũ. Đổi Nguyên Tố theo đường mới sau khi giải quyết. Quick nếu đứng đường Cỏ, khi địch nhắm đúng Qiyana (huỷ hành động đó).
- **R Biến Động Tối Thượng** `r0`: Đối diện và 2 kề `r1 + r2·AD`, đối diện gấp `r3`%. Đất: nổ thêm `r4`% Máu đã mất. Nước: Choáng 2 kề `r5` đơn vị, đối diện `r6`. Cỏ: tướng mình 3 đường Tàng Hình `r7` đơn vị.

### Katarina · sát thủ cơ hội
- **Nội tại Nhặt Dao:** Đầu lượt 1 Dao rơi ngẫu nhiên 1 trong 5 đường (dấu `dagger` trên đường phía Katarina; cờ `daggerOpenLanesOnly` = chỉ đường đã mở). Vào đường có Dao (tự dời, bị hoán đổi, Q, E): nhặt 1 Dao, đối diện nhận `p1 + p2·AD`.
- **Q Phi Dao** `q0`: 1 địch; dịch chuyển sang đối diện, `q1 + q2·AD`; 1 Dao rơi ngẫu nhiên.
- **E Thuấn Bộ** `e0`: Quick. 1 đường có Dao; dịch chuyển, đối diện `e1 + e2·AD`. Khi địch nhắm đúng Katarina.
- **R Bông Sen Tử Thần** `r0`: Chỉ khi lượt này đã nhặt Dao. Đối diện và 2 kề `r1 + r2·AD`, đối diện nhận `r3`% lượng đó (150 = ×1,5).

### Zed · combo một lượt
- **Nội tại Liên Hoàn:** Mỗi chiêu hoặc đòn trong lượt cho 1 [Liên Hoàn], hết lượt mất. Mỗi tầng: chiêu kế thêm `p1 + p2·AD`.
- **Q Phi Tiêu Sắc Lẻm** `q0`: Đối diện `q1 + q2·AD`; đòn đánh lượt này thêm `q3 + q4·AD`.
- **E Phân Thân Bóng Tối** `e0`: Quick. 1 địch bất kỳ đường; dịch chuyển sang đối diện, `e1 + e2·AD`. Khi địch nhắm đúng Zed; mục tiêu là kẻ đó.
- **R Dấu Ấn Tử Thần** `r0`: Đối diện `r1 + r2·AD`, gắn [Dấu Ấn], lá mất sau khi dùng. Cuối lượt nổ `r3` + `r4`% Máu đã mất + `r5` mỗi Liên Hoàn, sát thương chuẩn (nổ cả khi Zed đã chết). Liên Hoàn tính theo lượt, các chiêu và đòn đều +1; chiêu thêm `p1 + p2·AD` cho mỗi tầng đang có.

### Kha'Zix · bắt tướng thiếu buff
- **Nội tại Sát Thủ Hư Không:** Đầu lượt và mỗi lần đổi đường: tung Cô Lập `p6` đơn vị cho địch đối diện: `p1`%, cộng `p2`% nếu nó không có hiệu ứng có lợi nào (kể cả Khiên), cộng `p3`% nếu nó có hiệu ứng bất lợi. Địch Tàng Hình đối diện bị lộ, luôn Cô Lập.
- **Cô Lập:** `p6` đơn vị: đòn Kha'Zix thêm `p4 + p5·AD`.
- **Q Nếm Thử Nỗi Sợ** `q0`: Đối diện `q1 + q2·AD`; Cô Lập: thêm `q3 + q4·AD`.
- **E Vồ Mồi** `e0`: 1 địch bất kỳ đường; đổi chỗ sang đối diện, `e1 + e2·AD`.
- **R Tấn Công Hư Không** `r0`: Quick. Tàng Hình `r1` đơn vị, né đòn đang nhắm, tạo 1 lá Q miễn phí tồn tại tới hết lượt đối phương; xáo R mới vào `r2` lá trên cùng (5), lá R đang dùng mất. Cờ `freeQSpansNextTurn`: dùng trong lượt địch thì Q miễn phí sống tới hết lượt kế của địch. Khi địch nhắm đúng Kha'Zix.

### Vayne
- **Nội tại Thợ Săn Đêm:** Đầu mỗi lượt: `p1` [Bóng Đêm] nếu chưa ra sân, `p2` nếu trên sân, `p1 > p2`, vô hạn. Mỗi tầng `p3` AD và `p4` Tốc Đánh. Mất một nửa khi chết.
- **Q Nhào Lộn** `q0`: Quick. Dịch chuyển sang đường kề, né đòn đang nhắm. Khi địch nhắm đúng Vayne.
- **E Kết Án** `e0`: Đối diện `e1 + e2·AD` vật lý.
- **R Giờ Cuối** `r0`: Trong lượt này: mỗi đòn thêm `r1 + r2·AD`, mỗi đòn thứ 3 nổ `r3 + r4`% Máu tối đa chuẩn. Lối chơi: gọi muộn, giữ lá Đánh Thường, R xả một lượt lật kèo.
