# StarCi League: Thiết kế lại kỹ năng V2 (cập nhật V3 giao tranh, 2026-10-30)

> Bản thiết kế trên giấy. Số liệu chỉ là gợi ý; con số thật sẽ chỉnh bằng mô phỏng (QA số).
> **V3 (2026-10-30):** mỗi tướng giữ đúng MỘT chất (tài nguyên riêng, R là đỉnh), nhưng bộ chiêu phải có chức năng giao tranh đúng vai. Mọi con số ghi công thức AD + AP. Bảng thay đổi từng tướng: `V3_TEAMFIGHT_PASS.md`.

## Luật chung (đã chốt)
- Mỗi lượt rút 2 lá. Tay tối đa 10 lá.
- Mỗi người chơi tối đa **3 đòn đánh/lượt**, tính mọi đòn (lá Đánh Thường, đấu sĩ đánh không lá, đòn thêm do chiêu). Không có ngoại lệ.
- **Đòn đánh thường = 1× AD cho mọi vai; Sát thủ 1.25× AD** (chốt 2026-10-30, thay cho Xạ thủ 200% / Sát thủ 350% cũ). Xạ thủ vẫn giữ quyền đánh mọi mục tiêu và ô phụ.
- **Đấu sĩ**: có nút đặc biệt **đòn Quick 66%**: đánh không cần lá, dùng được như Quick (cả trong lượt địch/chuỗi), 1 lần/lượt mỗi tướng, tính vào giới hạn 3 đòn. Không dùng nút thì đánh như thường bằng lá Đánh Thường (100%). Đấu sĩ chỉ đánh kẻ trước mặt (ngoại lệ duy nhất: ô Thùng của Gangplank).
- **Trợ thủ**: khi ra sân, lá Q và E vào thẳng tay. Nội tại mạnh, đủ sức lật kèo (ngang Renata).
- **Bộ bài**: 40 lá chung (Đánh Thường, bổ trợ, vàng, đồ) + mỗi tướng đúng **4Q, 4E, 1R** (9 lá) × 5 tướng = **85 lá**. Mọi tướng cùng số bản.
- **Kiếm Dài miễn phí** (chốt 2026-10-30): cứ mỗi 2 lượt, mỗi người chơi nhận 1 mảnh đồ **Kiếm Dài** lên tay. Lá này **không lấy từ bộ bài** (không làm bộ bài cạn, không tính vào 85 lá).
- **Đồ tháo ra được** (chốt 2026-10-30): mọi món đồ (mảnh hay đồ ghép) đều là một lá bài. Tháo đồ thì lá đó về tay (tay đầy 10 lá thì lá bị đốt), rồi có thể lắp cho tướng khác. (Câu hỏi mở cho chủ: tháo đồ có tốn hành động/đòn đánh không, và đồ ghép tháo ra về tay nguyên món hay tách lại mảnh.)
- **Nâng AD gốc** (chốt 2026-10-30): Giáp đã giảm sát thương, nên AD gốc nâng khoảng ×1.4 so với code cũ để đòn đánh "thốn". Dải AD gốc **85–125** (Sát thủ/Xạ thủ ở đỉnh, Đỡ đòn/Trợ thủ ở đáy), máu gốc **300–500**, Giáp/Kháng phép chênh nhau tối đa **1.4×** (Giáp 25–35, Kháng phép 26–34). Mục tiêu: không đồ thì ≈3–4 đòn đánh hạ một tướng điển hình, có đồ ≈2. Bảng chỉ số từng tướng và số đòn hạ gục: `V3_TEAMFIGHT_PASS.md`.
- **Mốc gọi tướng** (chốt 2026-10-30): gọi tướng ở **vòng 1, 4, 8, 13, 19** (5 mốc = 5 tướng), không còn mỗi vòng gọi 1. Ngoài mốc thì không gọi thêm (hồi sinh vẫn theo luật hồi sinh).
- **Pháp sư**: lá chiêu nằm trong bộ bài như mọi tướng, nhưng dùng chiêu tốn mana của pháp sư đó. Mana theo thang ×10: mỗi lượt +10 (mặc định tối đa 100), tuỳ pháp sư; giá từng chiêu tuỳ tướng, có thể lẻ (15, 25…). Giá mana trong tài liệu này lấy theo code hiện tại.
- Các vai trò khác không dùng mana.
- **Bài trên tay quyết định gọi ai ra sân.** Chiêu của tướng chưa ra sân là bài chết trên tay, nên phải tính. Ví dụ tay: Đánh, Đánh, Đánh, E Blitz, E Renata. Mốc gọi đầu có thể gọi Renata để dựng thế thủ (E Renata là Quick, ra sân còn nhận Q), gọi Blitz để mở giao tranh, hoặc gọi đấu sĩ dùng 3 lá Đánh (đấu sĩ không cần bài vẫn đánh) và giữ E Blitz, E Renata chờ mốc sau. Mốc gọi giờ thưa hơn (1, 4, 8, 13, 19) nên giữ đúng bài cho đúng tướng càng quan trọng. Bot cũng phải chọn tướng ra sân theo bài trên tay.
- **Pha triệu hồi: 2 bên úp bài gọi tướng cùng lúc rồi mới lật**, mỗi bên gọi cùng số tướng; không có chuyện bên này thấy bên kia gọi 1 rồi gọi thêm 2 để ăn hiếp.
- Chiêu dùng xong vào mộ. Thua khi phải rút mà bộ bài rỗng, hoặc mất hết 7 mạng.
- Chỉ Xạ thủ đánh được ô phụ (ô triệu hồi thêm); riêng ô Thùng của Gangplank thì Xạ thủ và Đấu sĩ đều đánh được.
- **Cơ chế giữ nguyên, con số sẽ QA lại** (chốt 2026-10-30).

### Luật số liệu V3 (chốt 2026-10-30)
- **Mọi con số (sát thương, hồi máu, Khiên, lượng buff) ghi kèm hệ số AD và AP trong ngoặc**, kiểu chú thích LoL: `(40 + 30% AD + 60% AP)`. AD/AP là của tướng dùng chiêu (trừ khi ghi khác).
- Tỉ trọng: tướng **vật lý** AD cao hơn, AP nhỏ; tướng **phép** AP cao hơn; **Đỡ đòn/Trợ thủ** gần cân bằng (trợ thủ nghiêng AP như mẫu Janna).
- **Hiệu ứng thuần giữ cố định**: Choáng, Câm Lặng, Mê, Mù, +N stack, cướp/rút/bỏ lá, Tàng Hình, ×2…
- **Tỉ lệ là cơ chế thì giữ cố định**: % giảm sát thương theo stack (Vững, Núi Đá), % sát thương cộng thêm của Rèn, hệ số nhân (×2), % hút máu, % theo máu đã mất / máu đã trả. Phần sát thương dạng % máu tối đa (Kog'Maw) ghi kiểu `(1.6% + 0.4% mỗi 100 AD + 0.8% mỗi 100 AP)`.
- **Đổi chỉ số lấy chỉ số** (Lux: mana → AP) không tự nhân theo chính chỉ số đó.
- **Đề xuất chờ chủ duyệt: AP gốc.** Hiện tướng chỉ có `atk`; nếu AP gốc = 0 thì công thức nghiêng AP làm tướng phép yếu hẳn lúc đầu trận. Đề xuất: tướng **sát thương phép** có AP gốc = AD gốc **cũ** (giá trị `atk` trong code trước khi nâng AD); tướng vật lý AP gốc = 0. Hệ số trong tài liệu này được chia sao cho **ở chỉ số cũ, tổng sát thương ≈ code hiện tại**; đồ AP/AD làm lệch dần theo vai.
- **Lưu ý khi nâng AD gốc ×1.4:** mọi phần "% AD" trong chiêu cũng mạnh lên theo (chiêu nặng AD mạnh thêm khoảng 25–40%). Chủ muốn đánh thốn nên tạm giữ hệ số; nếu QA thấy hạ gục quá nhanh thì giảm phần % AD của chiêu (không giảm đòn đánh thường).

### Chức năng giao tranh theo vai (chốt 2026-10-30)
| Vai | Bắt buộc có trong bộ chiêu |
|---|---|
| Trợ thủ | 1–2 khống chế + Khiên/hồi máu |
| Đỡ đòn | khống chế + giảm sát thương/Khiên |
| Đấu sĩ | trụ (hồi máu/hút máu/Khiên) + sát thương |
| Pháp sư | khống chế hoặc dồn sát thương (burst) + sát thương |
| Xạ thủ | tự cứu hoặc tiện ích + sát thương |
| Sát thủ | burst + thoát (Tàng Hình) hoặc làm mới (reset) |

Một chiêu vừa gây sát thương vừa khống chế là **được**, miễn khống chế là giá trị chính (ví dụ Janna Q Lốc Xoáy). Chức năng giao tranh thêm vào không được đổi chất tướng; nên gắn vào cơ chế sẵn có (ví dụ Leona nhận Khiên mỗi lần Nắng gây Choáng).

- **Tài nguyên tặng (chốt 2026-10-30, thay cho "Kiếm Dài mỗi 2 lượt"):** cứ 2 lượt mỗi người được tặng 1 lá **Đánh Thường**, cứ 3 lượt được tặng 1 **mảnh đồ**; cả hai không lấy từ bộ bài.

- **Tàng Hình (chốt 2026-10-30):** không bị chọn làm mục tiêu, nhưng vẫn nhận đủ sát thương từ hiệu ứng không chọn mục tiêu (đánh mọi địch, nổ, Bỏng...).

- **Ô phụ (chốt 2026-10-30):** Xạ thủ và Đấu sĩ đánh được mọi thứ ở ô phụ (Thùng, Thiếu Nữ, token khác); các vai khác không đánh được.

## Nguyên tắc
1. Mỗi tướng có **một câu Chất** = một điều kiện/lối chơi. Cả 4 kỹ năng phục vụ đúng lối chơi đó, không có chiêu độn. **Nhưng tướng không được một chiều**: bộ chiêu phải có chức năng giao tranh đúng vai (bảng trên).
2. Kỹ năng ngắn: một câu tác dụng, thêm tối đa một điều kiện tạo ra lựa chọn.
3. Điều kiện tạo cái hay: "nếu khiên vỡ...", "khi địch đánh...", "hạ được thì dùng lại...".
4. ~~Hoặc là chiêu sát thương, hoặc là chiêu hiệu ứng thuần.~~ **V3:** chiêu sát thương + khống chế được phép khi khống chế là giá trị thật. Vẫn tránh chiêu nửa vời (sát thương nhỏ + hiệu ứng nhỏ không ai cần).
5. Không chọn mục tiêu rối rắm. Chỉ dùng: 1 mục tiêu, mọi địch, mọi đồng minh, hoặc tự động.
6. Chiêu phòng thủ/phản ứng là Quick.
7. Không có chiêu đổi chỗ cho có, không gọi quân chiếm ô cho có. Chỉ được di chuyển khi đó là phần thưởng của lối chơi.
8. **Không bắt chước LoL.** Chỉ giữ chất/hương vị của tướng; cơ chế phải thiết kế lại cho game bài, không chép bộ chiêu thật.
9. **Nhiều Khiên/hồi máu** để giao tranh "phê": đánh qua đánh lại, đỡ được, lật được.

**Hai quy tắc phụ (rút ra từ góp ý):**
- Nội tại phải là động cơ của chuỗi combo chính, không phải phần thưởng phụ.
- Cơ chế tối giản: không thêm dấu/stack/đếm số, trừ khi chính bộ đếm đó là chất của tướng (Bỏng của Brand, Chảy Máu của Darius, Dồn của Zed, Đói của Kog'Maw).

**Từ khoá dùng trong tài liệu:** Choáng (mất lượt hành động), Câm Lặng (không dùng chiêu), Mê (không đánh được lượt kế), Mù (đòn đánh kế trượt), Tàng Hình, Khiên, Giáp, Cuồng Bạo (Renata), Chảy Máu (Darius), Bỏng (Brand), Dồn (Zed), Buốt (Ashe), Đói (Kog'Maw), Điên (Jinx). Mỗi status riêng chỉ thuộc về một tướng; Choáng/Câm Lặng/Mê/Mù/Tàng Hình/Khiên/Giáp là status chung.

---

Bổ sung sau khi duyệt với chủ:
- **R là đỉnh của chất tướng:** lấy chính cơ chế của nội tại/Q/E đẩy lên tối đa, không thêm hiệu ứng lạ (Darius R chém theo Chảy Máu, Brand R nhân đôi Bỏng, Ashe R đóng băng mọi địch có Buốt và nổ theo Buốt).
- **Mỗi lá đứng được một mình:** R chỉ có 1 lá trong 85, lối chơi không được dựa vào R; Q, E (4 lá mỗi chiêu) phải tự làm nên chất **và tự mang chức năng giao tranh của vai** (khống chế/Khiên của tướng không được chỉ nằm ở R).
- **Không 2 chiêu cùng mục đích:** so từng cặp trong cùng tướng (vd nội tại và E cùng chuyển máu là trùng). Nhiều chiêu cùng dùng một cơ chế (Ashe: cùng gắn Buốt) thì được, miễn mỗi chiêu một cách/một nấc khác nhau.
- **Ưu tiên cơ chế thẻ bài** (tay, bộ bài, mộ) hơn bê chiêu LoL; không bày thêm thứ vô nghĩa (gọi quân chiếm ô, bắn lan).

## A. 5 tướng mẫu (đã duyệt, giữ nguyên cơ chế)

### Renata (Trợ thủ, phép)
**Chất:** "Địch có dám đánh không": trừng phạt kẻ tấn công.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đồng minh bị hạ thì hồi sinh với 25% máu tối đa + (20 + 15% AD + 25% AP) máu và hoá **Cuồng Bạo**: tới hết lượt kế của nó, đòn đánh +(15 + 15% AD + 25% AP) sát thương, kèm 1 Đòn Miễn Phí | 1 lần/đồng minh/trận, Renata phải đang trên sân |
| Q | - | Cả đội +Giáp (10 + 10% AD + 15% AP) và mọi địch nhận (20 + 20% AD + 30% AP) sát thương phép | Mỏng nhưng trúng cả hai đội; lên đồ là dày (chủ chốt) |
| E | Có | Khi một địch tấn công 1 đồng minh: phản lại 40% sát thương đòn đó + (10 + 10% AD + 15% AP), sát thương chuẩn | Ép địch phải cân nhắc trước khi đánh |
| R | - | Thâu Tóm: mỗi tướng địch đánh 2 đòn vào 1 đồng đội ngẫu nhiên của chính nó (không đánh chính nó; không có đồng đội thì bỏ qua) | Địch càng mạnh càng tự hại nhau nặng |

**V3:** chỉ thêm hệ số. Đổi tên "Điên" của Renata thành **Cuồng Bạo** (như code) để không trùng Điên của Jinx. Khống chế của Renata chỉ có ở R (chủ đã chốt giữ nguyên, ghi chú để chủ cân nhắc).

### Darius (Đấu sĩ, vật lý)
**Chất:** "Xay một thằng": dồn một mục tiêu đến chết.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh +1 Chảy Máu (cộng dồn, tối đa 6); đầu lượt của nó, mỗi Chảy Máu gây (3 + 5% AD) sát thương | Đánh một con là nó chảy máu dần |
| Q | - | Tàn Sát: kẻ trước mặt nhận (40 + 120% AD + 20% AP) sát thương vật lý + 2 Chảy Máu; Darius hồi (6 + 8% AD + 2% AP) mỗi Chảy Máu trên nó | Đập thốn, càng xay sâu càng hút máu |
| E | - | Bắt Giữ: kẻ trước mặt nhận (10 + 65% AD + 13% AP) sát thương vật lý; trước mặt trống thì kéo 1 địch khác về và +1 Chảy Máu lên nó | Luôn có người để xay |
| R | - | Chém Đầu: (16 + 25% AD + 5% AP) sát thương chuẩn mỗi Chảy Máu, rồi xoá Chảy Máu; hạ được thì lá R về tay | Chém xong đứa này xay đứa khác |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (Q choáng cắt nhịp), Ashe (Buốt giảm sát thương) · **Combo với:** Blitzcrank (choáng giữ mục tiêu), Braum (Dấu Băng: Darius phụ đòn là choáng).

### Janna (Trợ thủ, phép)
**Chất:** "Bão che chở": khống chế, bảo kê, lật kèo bằng gió.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đầu lượt bạn: đồng minh máu thấp nhất nhận Khiên (30 + 20% AD + 40% AP) | Tự động |
| Q | Có | Lốc Xoáy: 1 địch nhận (40 + 30% AD + 60% AP) sát thương phép + Choáng 1 lượt | Khống chế chính |
| E | Có | Mắt Bão: Khiên (80 + 40% AD + 70% AP) cho 1 đồng minh; còn Khiên thì miễn khống chế | Bảo kê |
| R | Có | Gió Mùa: tới hết lượt địch cả đội miễn sát thương từ đòn đánh; hết lượt cả đội hồi (80 + 40% AD + 80% AP) | Lật kèo |

**V3:** giữ nguyên bản chủ chốt.

### Brand (Pháp sư, phép)
**Chất:** "Bỏng cháy mãi mãi, spam chiêu là cháy hết."

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Bỏng không bao giờ hết, cộng dồn (tối đa 12); đầu mỗi lượt địch, mỗi Bỏng gây (1% máu tối đa của nó + 1% AD + 2% AP) sát thương phép | Trận càng dài càng cháy |
| Q | - | 10 | Hoả Cầu: 1 địch nhận (35 + 45% AD + 90% AP) sát thương phép + 1 Bỏng; nó đang có từ 3 Bỏng thì bị Choáng 1 lượt | Khống chế đứa đã cháy đủ |
| E | - | 20 | Lửa Lan: mọi địch nhận (20 + 10% AD + 30% AP) sát thương phép + 1 Bỏng | Rải lửa |
| R | - | 50 | Bão Lửa: mọi địch nhận (60 + 20% AD + 50% AP) sát thương phép, rồi Bỏng nhân đôi và cháy ngay 1 lần | Cú chốt khi Bỏng đã dày |

**Khắc chế bởi:** Soraka (hồi bù Bỏng), Zed, Kha'Zix (Brand mỏng máu) · **Combo với:** Annie (Q choáng → Annie +50%), Zed (địch đứng yên chờ dồn).

### Zed (Sát thủ, vật lý)
**Chất:** "Một nhịp": dồn bài đánh thường và chiêu trong một lượt, mỗi phát sau đau hơn phát trước.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Liên Hoàn: mỗi lần Zed gây sát thương trong lượt, phát đó thêm (8 + 8% AD + 2% AP) × số lần Zed đã gây sát thương trước đó trong lượt này + 5% máu đã mất của mục tiêu; đếm lại từ 0 mỗi lượt | Tung hết bài trong một nhịp |
| Q | - | Phi Tiêu: kẻ trước mặt nhận (40 + 100% AD + 20% AP) sát thương vật lý | Một phát |
| E | - | Phân Thân: Zed đổi chỗ để đứng đối diện 1 địch bất kỳ, rồi nó nhận (30 + 80% AD + 15% AP) sát thương vật lý | Lướt tới con mồi |
| R | - | Dấu Ấn Tử Thần: 1 địch nhận (60 + 100% AD + 20% AP) sát thương vật lý ngay; cuối lượt nó nhận thêm lần nữa (cũng tính Liên Hoàn theo số phát đã gây trong lượt) | Mở và chốt nhịp |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (huỷ một đòn làm gãy nhịp), Annie, Braum (choáng/khiên trong lượt địch) · **Combo với:** Leona, Annie (giữ mục tiêu đứng yên).

## B. Đấu sĩ

### Aatrox (vật lý)
**Chất:** "Đổi máu lấy máu": tự rút máu để chém, chém trúng thì hút lại; R biến hình thành Kẻ Diệt Thế.

Máu gốc 420.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh của Aatrox (cả nút 66%) gây thêm (15% máu Aatrox đã mất + 5% AD + 2% AP) sát thương vật lý | Máu càng cạn đòn càng nặng |
| Q | - | Trả Máu: Aatrox mất 25% máu tối đa (không tự chết); kẻ trước mặt nhận (120% máu đã trả + 60% AD + 10% AP) sát thương vật lý | Trả máu lấy sát thương |
| E | Có | Huyết Tế: đến hết lượt, đòn đánh của Aatrox hồi máu bằng 100% sát thương gây ra | Trụ bằng máu địch |
| R | - | Kẻ Diệt Thế (biến hình) trong 2 lượt của bạn: +(30% AD) AD, +(30% máu tối đa) máu tối đa và hồi ngay lượng đó, mọi hồi máu Aatrox nhận +50%. Hạ gục khi đang biến hình thì kéo dài thêm 1 lượt. Đang biến hình mà bị hạ: Aatrox hồi sinh ngay tại chỗ với (30% máu tối đa + 50% AD) máu và hết biến hình (1 lần mỗi lần R) | Biến hình quỷ, càng giết càng lâu, chết một lần không sao |

Bộ: Q ×4 · E ×4 · R ×1. Khi biến hình, thẻ Aatrox đổi sang hình dạng Kẻ Diệt Thế (khung đỏ, hiệu ứng lửa). **Khắc chế bởi:** Janna (Q choáng cắt lượt hút máu), Zed (dồn chết lúc Aatrox thấp máu), Vết Thương Sâu · **Combo với:** Renata, Soraka (giữ Aatrox sống ở máu thấp).

### Garen (vật lý)
**Chất:** "Tay đôi với kẻ trước mặt": đứng trước Garen thì đánh là chết, không đánh là vô dụng.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Kẻ đối diện Garen mỗi lần tấn công (bất kỳ ai) +1 Tội (tối đa 10); đòn đánh của Garen thêm (6% AD + 2% AP) sát thương vật lý mỗi Tội | Tội luôn nằm đúng chỗ Garen đánh tới |
| Q | - | Đòn Quyết Định: kẻ trước mặt nhận (30 + 100% AD + 15% AP) + (15% AD + 3% AP) mỗi Tội sát thương vật lý; Garen hồi 30% sát thương gây ra | Trụ đường bằng Tội |
| E | - | Phán Xét: kẻ trước mặt nhận (20 + 100% AD + 20% AP) sát thương vật lý và +3 Tội (sát thương chiêu, không tính 3 đòn) | Nuôi Tội |
| R | - | Công Lý Demacia: kẻ trước mặt nhận (100 + 80% AD + 20% AP) + 15 mỗi Tội sát thương chuẩn; Tội giữ nguyên | Chém đầu, Tội chỉ là phần cộng thêm |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** bỏ trống đường đối diện Garen, Ashe (Buốt giảm sát thương) · **Combo với:** Darius (E kéo địch về chỗ trống trước mặt), Braum (Dấu Băng).

### Gangplank (vật lý)
**Chất:** "Ăn cam trụ đường, gài thùng nổ trúng ai thì người đó lãnh": đấu sĩ bền, bịp bằng thùng giả.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Thùng thật trên sân +1 Thuốc Súng mỗi lượt GP. Đòn đánh của GP (cả nút 66%) vào Thùng thật thì Thùng nổ: **1 tướng địch ngẫu nhiên** nhận (40 + 60% AD + 10% AP) sát thương vật lý mỗi Thuốc Súng. **Thùng giả:** GP úp **bất kỳ lá nào trên tay** vào ô Thùng (lá đó mất); địch không phân biệt được thật/giả | Bịp: địch phải đoán thùng nào đáng phá |
| Q | - | Cam, 2 cách dùng: (1) Ăn ngay: GP hồi H = (100 + 60% AD + 15% AP). (2) Úp xuống ô Thùng làm Thùng giả: địch phá thì GP hồi 160% H; GP tự đánh vỡ thì hồi 40% H | Trụ đường hoặc gài bẫy cam |
| E | - | Đặt 1 Thùng thật (1 Thuốc Súng) vào ô phụ | Gài sớm, thùng to dần |
| R | - | Thêm 1 lá Cam (Q) + 1 lá Thùng (E) lên tay | Nạp đạn để trụ và gài tiếp |

Ô phụ chứa tối đa 1 Thùng (thật hoặc giả). Xạ thủ và Đấu sĩ địch đánh được Thùng (đấu sĩ được ngoại lệ đánh vào ô Thùng); đánh vào Thùng giả thì lá giả bị lật và vào mộ, phí một đòn. Thùng giả là lá thường bị địch phá thì GP hồi 30% H. Cam úp: địch phá hồi 160% H, GP tự đánh vỡ hồi 40% H. Thùng thật bị phá thì không hồi. Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Xạ thủ và Đấu sĩ địch (Jinx, Darius phá thùng), Blitzcrank (cướp lá Cam/Thùng) · **Combo với:** Brand (Bỏng + nổ thùng dọn cả đội), Malphite (giữ tay dày để có lá úp giả).

**V3:** chỉ thêm hệ số. Vai đấu sĩ đủ: trụ (Cam, Thùng giả hồi) + sát thương (Thùng nổ).

### Yorick (vật lý)
**Chất:** "Nuôi Thiếu Nữ": Yorick đánh để lấp mộ, mộ càng dày Thiếu Nữ Sương Mù càng đáng sợ.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Người Đào Mộ: đòn đánh của Yorick chỉ gây 40% sát thương (giảm 60%), nhưng mỗi đòn (cả nút 66%) vứt 1 lá trên cùng bộ bài của bạn vào mộ | Yorick đánh để nuôi mộ, không để giết |
| Q | - | Chôn Cất: chôn 1 lá trên tay vào mộ, rút 1 lá; Yorick hồi (25 + 20% AD + 5% AP) | Bài chết thành mộ, trụ đường |
| E | - | Đào Mộ: vứt 3 lá trên cùng bộ bài của bạn vào mộ, rồi chọn 1 lá trong 3 lá đó lấy về tay | Lấp mộ nhanh, chọn bài |
| R | - | Thiếu Nữ Sương Mù: gọi Thiếu Nữ vào ô phụ (máu 150 + 8 mỗi lá trong mộ). Đầu mỗi lượt bạn, Thiếu Nữ đánh 1 địch ngẫu nhiên: (1.5% máu tối đa của nó mỗi 5 lá trong mộ + 8% máu tối đa của Yorick + 50% Giáp của Yorick) sát thương vật lý, và Yorick hồi (1% máu tối đa của Yorick mỗi 5 lá trong mộ) | Mộ càng dày Thiếu Nữ càng đau, Yorick càng trâu |

Thiếu Nữ ở ô phụ nên chỉ Xạ thủ và Đấu sĩ địch đánh được. Cái giá: vứt bài từ bộ làm bạn dễ cạn bài (thua khi phải rút mà bộ rỗng). Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Xạ thủ, Đấu sĩ (đánh Thiếu Nữ), Blitzcrank (cướp bài), đánh nhanh trước khi cạn bài kết thúc trận · **Combo với:** Viktor (bỏ bài vào mộ), Twisted Fate (R ném cả tay vào mộ).

## C. Đỡ đòn

### Blitzcrank
**Chất:** "Thò tay vào bài địch": cướp chiêu của tướng nào thì tướng đó lãnh đòn. Mỗi chiêu chỉ một mục tiêu liên quan, không ghép hai hiệu ứng rời nhau.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lá Blitz cướp được: Blitz nhận Khiên (20 + 10% AD + 15% AP). Lá chung thì Blitz giữ dùng; lá chiêu địch biến thành 1 lá Q hoặc E ngẫu nhiên của 1 tướng phe bạn đang sống trên sân | Cướp chiêu địch thành chiêu mình |
| Q | - | Cướp 1 lá ngẫu nhiên từ tay địch (tay đang lộ thì chọn lá). Là chiêu của tướng nào thì tướng đó nhận (60 + 60% AD + 60% AP) sát thương; tướng đó đã chết hoặc chưa ra sân thì sát thương vào 1 tướng địch còn sống ngẫu nhiên | Cướp trúng chiêu = tướng đó ăn đòn |
| E | Có | Khi địch dùng 1 chiêu: huỷ chiêu đó, giật lá, tướng tung chiêu bị Choáng 1 lượt | Huỷ và phạt đúng kẻ tung chiêu |
| R | - | Lộ toàn bộ tay địch đến hết lượt; tướng nào có chiêu trên tay địch nhận (80 + 50% AD + 80% AP) sát thương và Choáng | Đỉnh của "đọc bài": soi xong phạt cả đội |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** đội đánh hết bài nhanh, Twisted Fate (xem và xếp bài) · **Combo với:** Teemo (vừa phá tay vừa gài Nấm), Zed (tướng bị choáng đứng yên chờ dồn).

### Braum (phép)
**Chất:** "Đứng sau tôi": Braum mở giao tranh cho đồng đội và hứng đòn thay họ, càng hứng càng cứng (Song Giáp).

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi đòn đánh trúng Braum +1 Song Giáp, cộng dồn vĩnh viễn; mỗi Song Giáp: +1.5 Giáp và +1.5 Kháng Phép (không giới hạn; cân bằng chỉnh trong khoảng 1-2) | Bị đánh là cứng thêm, mãi mãi |
| Q | - | Đấm Băng: 1 địch nhận (40 + 40% AD + 40% AP) sát thương và bị gắn Dấu Băng đến hết lượt; đồng minh đánh trúng nó lần đầu thì nó bị Choáng 1 lượt và Braum +2 Song Giáp | Braum mở, đồng đội phụ đòn là khoá |
| E | Có | Đứng Sau Tôi: khi địch đánh 1 đồng minh, Braum đỡ thay đòn đó, +2 Song Giáp và nhận Khiên (40 + 30% AD + 30% AP) | Che đúng đứa bị nhắm |
| R | Có | Băng Phong Ấn: 1 địch bị Choáng 1 lượt; mỗi địch còn lại có (5% + 1% mỗi 100 máu tối đa + 1% mỗi 10 Giáp của Braum) bị Choáng 1 lượt. Dùng được trong lượt địch để cắt giao tranh | Khoá chắc 1 đứa, may thì khoá thêm |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand, Lux (sát thương bằng chiêu, không nạp Song Giáp) · **Combo với:** Kog'Maw, Jinx (phụ đòn vào Dấu Băng, Braum che xạ thủ), Annie (choáng → Annie +50%).

### Leona (vật lý)
**Chất:** "Mặt trời mọc": Leona khoá bằng chiêu, đánh dấu Nắng cho đồng đội ăn theo, hứng đòn thay cả đội.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Nắng: chiêu của Leona gắn Nắng lên địch; đồng minh đánh vào địch có Nắng gây thêm (20 + 20% AD + 30% AP của Leona) sát thương, rồi Nắng tan | Leona đánh dấu, đồng đội ăn |
| Q | - | Khiên Mặt Trời: kẻ trước mặt nhận (40 + 60% AD + 40% AP) sát thương, Choáng 1 lượt + Nắng | Khoá chắc 1 đứa |
| E | Có | Nhật Thực: đến hết lượt địch, Leona +60 Giáp và +60 Kháng Phép và hút mọi sát thương địch gây ra về Leona (đỡ thay cả đội); cuối lượt, 1 tướng địch ngẫu nhiên nhận 40% tổng sát thương Leona đã hứng + (20 + 20% AD + 30% AP) và gắn Nắng | Hứng cả lượt, trả lại một phần |
| R | - | Mặt Trời Hạ San: mọi địch nhận (60 + 40% AD + 60% AP) sát thương + Nắng; đứa đã có Nắng từ trước thì bị Choáng | Khoá cả đội đã bị đánh dấu |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (miễn khống chế), Brand, Kog'Maw (sát thương theo % máu xuyên giáp) · **Combo với:** Zed, Darius (đánh vào Nắng), Annie (choáng → +50%).

### Malphite (phép)
**Chất:** "Núi đá, giáp là vũ khí": càng cứng đánh càng đau.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Lá Chắn Đá: đầu lượt bạn, Malphite nhận Khiên (5% máu tối đa + 100% Giáp) (không cộng dồn) | Giáp càng cao khiên càng dày |
| Q | - | Mảnh Vỡ Địa Chấn: 1 địch nhận (40 + 30% AD + 40% AP + 50% Giáp) sát thương phép; Malphite lấy 15 Giáp của nó đến hết lượt sau | Đánh ai lấy giáp người đó |
| E | Có | Sấm Động: khi Malphite bị đánh, đến hết lượt +(10 + 30% Giáp) Giáp và kẻ đánh nhận (20 + 60% Giáp + 20% AP) sát thương phép | Cứng thêm theo giáp, phạt kẻ ra tay |
| R | - | Không Thể Cản Phá: mọi địch nhận (80 + 30% AD + 50% AP + 100% Giáp) sát thương phép; mỗi địch có (15% + 1% mỗi 10 Giáp) bị Choáng 1 lượt | Mở giao tranh, may thì khoá được nhiều |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Kog'Maw, Brand (sát thương theo % máu), Lux, Lissandra (sát thương phép, giáp không cản) · **Combo với:** Annie (choáng → +50%), Zed (đứa bị choáng chờ dồn).

### Ornn (phép)
**Chất:** "Thần Rèn": Ornn làm mọi món đồ của đội mạnh hơn và rèn đồ mới giữa trận.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Lò Rèn: Ornn trên sân thì mọi đồ đang mặc của phe bạn +(10% + 2% mỗi 100 AD + 2% mỗi 100 AP của Ornn + 1% mỗi vòng món đó đã được mặc) chỉ số; mỗi món tính riêng từ lúc được mặc, gỡ ra thì đếm lại | Đồ mặc càng lâu càng khoẻ |
| Q | - | Phun Trào: 1 địch nhận (40 + 6% máu tối đa + 50% Giáp + 20% AP) sát thương phép và bị Giảm Giáp 20 đến hết lượt sau | Mở đường cho đồng đội |
| E | Có | Lao Húc: khi địch đánh 1 đồng minh, kẻ đánh nhận (20 + 10 mỗi món đồ của đồng minh đó + 4% máu tối đa + 30% Giáp) sát thương và Choáng 1 lượt | Che đồng minh, phạt kẻ ra tay |
| R | - | Tiếng Gọi Thần Rèn: Ornn và 1 đồng minh mỗi người nhận 1 món đồ hoàn chỉnh ngẫu nhiên (mặc ngay nếu còn ô, không thì vào tay) | Đỉnh của thần rèn |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp lá đồ), Brand, Kog'Maw (sát thương theo % máu) · **Combo với:** Jinx, Darius, Ashe (carry lên đồ).

## D. Sát thủ

### Katarina (phép)
**Chất:** "Hạ một là làm lại": cả đội hạ được đứa Kat đã chạm là lá Kat quay về tay.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Tham Lam: địch chết trong lượt mà Katarina đã gây sát thương lên nó (ai hạ cũng được): mọi lá Katarina đã dùng lượt này quay về tay | Quay vòng chiêu trong giao tranh |
| Q | - | Phi Dao: 1 địch nhận (45 + 30% AD + 60% AP) sát thương phép + gắn Dao | Mở chuỗi |
| E | Có | Thuấn Bộ: khi địch đánh Katarina, Kat né (đòn trượt) và kẻ đánh nhận (25 + 20% AD + 40% AP) sát thương phép; nó có Dao thì ×2 | Đường thoát, phạt kẻ ra tay |
| R | - | Bông Sen Tử Thần: mọi địch nhận (40 + 25% AD + 55% AP) sát thương phép; đứa có Dao nhận thêm 60% | Dọn bàn |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Renata (hồi sinh làm hụt), Soraka (không ai chết khi Soraka còn máu) · **Combo với:** Darius, Brand (cả đội dồn, Kat chạm là hoàn lá), Annie (choáng giữ mục tiêu).

### Kha'Zix (vật lý)
**Chất:** "Săn kẻ đứng một mình."

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Địch đang **Cô Lập** (trạng thái CHỈ Kha'Zix gắn bằng E/R; chủ 30/10 bỏ luật vị trí "không có đồng minh ở đường kề"): đòn đánh của Kha'Zix lên nó gây thêm (20 + 50% AD + 10% AP) sát thương vật lý; Q lên nó gây thêm (40 + 90% AD + 15% AP) | Đánh dấu rồi săn |
| Q | - | 1 địch nhận (50 + 110% AD + 20% AP) sát thương vật lý (+ phần thêm của nội tại nếu nó Cô Lập) | Đòn săn chính |
| E | - | Chọn 1 tướng địch bất kỳ (không đổi đường): nó bị Cô Lập tới hết lượt và nhận (30 + 60% AD + 10% AP) sát thương vật lý | Chọn con mồi |
| R | Có | Kha'Zix Tàng Hình ngay (tới hết lượt kế của đối thủ); địch đối diện Kha'Zix (không có thì 1 địch ngẫu nhiên) bị Cô Lập tới hết lượt kế của bạn; thêm 1 lá Q Kha'Zix lên tay | Lặn + đánh dấu con mồi + nạp thêm một nhát săn |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** đội đứng kín năm đường, Janna (Q Choáng trước lượt săn), đòn diện rộng (vẫn trúng khi Tàng Hình) · **Combo với:** Darius, Jinx (hạ một con là hai con bên cạnh lẻ ra), Leona (con mồi bị Choáng không trả được).

**V3 (chủ chốt bộ chiêu 2026-10-30):** chỉ thêm hệ số AD + AP. Vai sát thủ đủ: burst (Q + phần thêm Cô Lập) + thoát (R Tàng Hình, Quick) + làm mới (R trả 1 lá Q). Nội tại đổi từ ×2 sang sát thương cộng thêm. E đổi đường là ngoại lệ chủ duyệt cho luật "không đổi chỗ cho có" (đổi chỗ ở đây là để chọn con mồi, đúng chất săn).

### Qiyana (vật lý)
**Chất:** "Sát thủ nguyên tố": mỗi lượt một nguyên tố ngẫu nhiên, Q/E/R đổi theo; đối thủ thấy nguyên tố hiện tại và phải đoán.

Nội tại: đầu mỗi lượt của bạn, Qiyana nhận 1 nguyên tố ngẫu nhiên, giữ tới đầu lượt kế: Đỏ (Đá) = dồn sát thương, Xanh (Sông) = khống chế, Lục (Cỏ) = cơ động.

| | Quick? | Đỏ: dồn sát thương | Xanh: khống chế | Lục: cơ động |
|---|---|---|---|---|
| Q | - | 1 địch (40 + 110% AD + 20% AP); đến hết lượt mỗi lần Qiyana gây sát thương lên nó +15% | 1 địch (30 + 80% AD + 15% AP) + Choáng 1 lượt | Qiyana đổi chỗ để đứng đối diện 1 địch bất kỳ, rồi nó nhận (30 + 80% AD + 15% AP) |
| E | Có | Địch đánh Qiyana: Qiyana đánh trả kẻ đó (30 + 80% AD + 15% AP) | Địch đánh Qiyana: kẻ đó bị Choáng trước khi đòn ra (đòn huỷ) | Địch đánh Qiyana: Qiyana đổi chỗ với 1 đồng minh, đòn trượt |
| R | - | Mọi địch (60 + 120% AD + 20% AP) | Mọi địch (40 + 80% AD + 15% AP); đứa máu cao nhất và Xạ thủ địch bị Choáng (không có Xạ thủ thì 1 địch ngẫu nhiên khác) | Mọi địch (40 + 80% AD + 15% AP); Qiyana đổi chỗ tự do và lấy 1 lá Q lên tay |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Renata (phản sát thương), Janna (R miễn sát thương đòn đánh) · **Combo với:** Brand (cùng rải sát thương), Annie (Xanh choáng → Annie +50%).

## E. Pháp sư

### Ahri (phép)
**Chất:** "Mê hồn": pháp sư cân bằng sát thương và hiệu ứng; Mê tích vĩnh viễn, địch càng mê càng yếu và càng ăn đau.

Mê (cộng dồn tối đa 3, vĩnh viễn): mỗi tầng làm địch đó gây ít hơn 7.5% sát thương và nhận thêm 5% sát thương từ Ahri.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Mỗi lần chiêu của Ahri trúng địch: có (10% + 5% mỗi 100 AD + 10% mỗi 100 AP) cơ hội +1 Mê lên nó | Đánh nhiều thì mê dày |
| Q | - | 10 | Quả Cầu Ma Lực: 1 địch nhận (40 + 20% AD + 70% AP) sát thương phép, và 1 địch ngẫu nhiên khác nhận (20 + 10% AD + 30% AP) sát thương chuẩn | Thuần sát thương |
| E | - | 25 | Mê Hoặc: 1 địch nhận (30 + 20% AD + 50% AP) sát thương phép và chắc chắn +1 Mê | Gắn Mê chắc |
| R | - | 50 | Phi Hồ: Ahri đổi chỗ với 1 đồng minh, rồi kẻ trước mặt chỗ mới nhận (80 + 30% AD + 90% AP) sát thương phép | Thuần sát thương, lướt tới chốt |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (khiên miễn khống chế), Zed (dồn chết sớm) · **Combo với:** Darius, Zed (đánh đứa đã yếu vì Mê), Annie.

### Annie
**Chất:** "Choáng rồi đốt": đếm Lửa tới choáng, chiêu vào kẻ đang choáng thì đau hơn.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Mỗi chiêu của Annie +1 Lửa; đủ 4 Lửa thì chiêu kế tiếp Choáng đúng mục tiêu của nó, Lửa về 0. Q, E, R gây thêm 50% sát thương lên địch đang Choáng | Đếm Lửa, canh choáng |
| Q | - | 10 | Thiêu Đốt: (60 + 20% AD + 80% AP) sát thương 1 địch | Rẻ, nạp Lửa |
| E | Có | 15 | Khiên Lửa: Annie nhận Khiên (60 + 20% AD + 50% AP). Dùng Quick để đáp lại đòn/chiêu nhắm vào Annie khi đang đủ 4 Lửa: kẻ đó bị Choáng trước khi đòn kịp ra (đòn bị huỷ) và nhận (40 + 10% AD + 60% AP) sát thương (đang Choáng nên +50%). Dùng bình thường: chỉ Khiên, không sát thương | Bẫy Quick ở 4 Lửa |
| R | - | 50 | Tibbers vồ mọi địch (120 + 30% AD + 100% AP): địch đang Choáng ăn thêm sát thương, địch chưa Choáng thì bị Choáng | Q choáng trước → R nổ to; chưa choáng → R khoá cả đội |

Tibbers chỉ là cú vồ, không chiếm đường. **Khắc chế bởi:** Janna (miễn khống chế), Zed (dồn chết trước) · **Combo với:** Brand, Zed, Leona (choáng sẵn cho Annie nổ).

### Lissandra (phép)
**Chất:** "Hoá Băng bài địch": đánh trúng là có thể đóng băng bài trên tay địch, băng càng dày càng nguy.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Mỗi lần sát thương của Lissandra trúng địch: có (10% + 5% mỗi 100 AD + 10% mỗi 100 AP) cơ hội Hoá Băng 1 lá ngẫu nhiên trên tay đối thủ. Lá Hoá Băng không dùng được (vẫn chiếm chỗ); băng tan khi Lissandra rời sân | Đánh nhiều thì băng dày |
| Q | - | 20 | Mảnh Băng: 1 địch nhận (50 + 30% AD + 80% AP) sát thương phép | Đòn chính |
| E | - | 30 | Vòng Băng: 1 địch nhận (30 + 35% AD + 70% AP) sát thương phép; trên tay đối thủ có lá chiêu Hoá Băng của chính tướng đó thì nó bị Choáng 1 lượt | Khoá đúng tướng có bài bị băng |
| R | Có | 50 | Hầm Mộ Băng: Lissandra tự đóng băng (miễn mọi sát thương, không bị chọn làm mục tiêu, không hành động) đến hết lượt; mọi địch nhận (30 + 10% AD + 20% AP) sát thương phép mỗi lá Hoá Băng trên tay đối thủ | Thoát chết và phản công theo băng |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Darius, Garen (đánh không cần lá), Zed (hạ Lissandra là tan băng) · **Combo với:** Blitzcrank (lộ tay địch), Teemo (tay kẹt băng rút trúng Nấm).

### Lux (phép)
**Chất:** "Bể ánh sáng": mana Lux tiêu ra không mất mà dồn vào Bể; Bể càng đầy E và R càng đau, mạnh dần về cuối trận.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Mọi mana Lux tiêu đều cộng vĩnh viễn vào Bể Mana (không mất khi chết) | Tiêu mana là tích sức mạnh |
| Q | - | 0 | Lăng Kính: hồi (20 + 5% AD + 10% AP) mana và Lux nhận Khiên (20 + 10% AD + 40% AP) | Nạp mana, che thân |
| E | - | 30 | Khoá Ánh Sáng: 1 địch nhận (20 + 30% AD + 60% AP) + 10% Bể Mana sát thương phép; Bể Mana từ 150 trở lên thì nó bị Choáng 1 lượt | Đòn chính, giữa trận có khống chế |
| R | - | Toàn bộ (tối thiểu 20) | Cầu Vồng Tối Thượng: 1 địch nhận (15% AD + 30% AP) + 1.5 mỗi mana tiêu lần này + 25% Bể Mana sát thương phép | Xả một phát, Bể càng đầy càng khủng |

**Khắc chế bởi:** Zed (dồn chết sớm), Blitzcrank (cướp Q/E) · **Combo với:** Janna (bảo kê Lux), Annie (E choáng → Annie +50%).

### Twisted Fate
**Chất:** "Tay bài là đạn": tay càng dày đánh càng đau, cuối trận lên đồ là R xoá sổ.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Đòn đánh của TF gây thêm sát thương phép (3 + 1% AD + 2% AP) mỗi lá trên tay | Giữ tay dày |
| Q | - | 20 | Chọn Bài: ném 1 lá vào 1 địch, (50 + 30% AD + 80% AP) sát thương; Xanh: TF hồi 30 mana / Đỏ: địch đó Giảm Giáp đến hết lượt / Vàng: địch đó Choáng 1 lượt | Chọn màu theo tình huống |
| E | - | 15 | Xáo Bài: xem 3 lá trên cùng, lấy 2 lên tay, lá còn lại xuống đáy | Nạp đạn |
| R | - | 50 | Định Mệnh: bỏ cả tay vào mộ, mỗi lá (tối đa tính 7) gây (30 + 20% AD + 30% AP) sát thương lên mọi địch | Mạnh dần về cuối trận theo đồ |

**Khắc chế bởi:** Blitzcrank (cướp lá trên tay), Lissandra (đóng băng lá) · **Combo với:** Yorick (R lấp mộ), Malphite (cùng thích tay dày).

### Viktor (phép)
**Chất:** "Tiến Hoá": đổi bài thừa lấy sức mạnh vĩnh viễn.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Tiến Hoá (vĩnh viễn, cộng dồn, tối đa 10, không mất khi chết): mỗi nấc làm chiêu Viktor gây thêm 8% sát thương | Mạnh dần |
| Q | - | 10 | Tháo Rời: bỏ tối đa 3 lá trên tay, mỗi lá +1 Tiến Hoá và Viktor nhận Khiên (20 + 10% AD + 20% AP) | Bài chết thành sức mạnh |
| E | - | 35 | Tia Tử Thần: mọi địch nhận (55 + 35% AD + 65% AP) sát thương phép, +8% mỗi Tiến Hoá | Đòn chính |
| R | - | 60 | Trường Trọng Lực: mọi địch nhận (80 + 30% AD + 60% AP) sát thương phép (+8% mỗi Tiến Hoá); đứa nhiều máu nhất bị Choáng 1 lượt; Viktor +2 Tiến Hoá | Giao tranh + nuôi Tiến Hoá |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp bài trước khi kịp bỏ), Zed (dồn chết sớm) · **Combo với:** Yorick (Q bỏ bài vào mộ), Malphite, Twisted Fate (giữ tay dày).

## F. Xạ thủ

### Ashe (vật lý)
**Chất:** "Chồng Buốt": xạ thủ hướng hỗ trợ, địch yếu dần, Buốt càng dày Ashe càng đau. Buốt không bao giờ bị xoá bởi chiêu của Ashe.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh của Ashe gắn Buốt (cộng dồn, tối đa 10); Buốt: giảm 2.5% sát thương địch đó gây ra mỗi tầng (tối đa 25% ở 10 tầng). Ashe đánh được mọi địch đang có Buốt, bỏ qua đỡ đòn/khiêu khích, nhưng các đòn này không thể chí mạng | Chọn mục tiêu ở hàng sau, đổi lại mất chí mạng |
| Q | - | Tên Băng: bắn 1 địch (40 + 80% AD + 20% AP) sát thương + 3 Buốt lên nó | Sát thương + chồng nhanh |
| E | - | Tập Trung: lượt này mỗi đòn đánh của Ashe gây thêm (30 + 40% AD + 10% AP) và gắn 2 Buốt | Lượt bắn đau |
| R | - | Đại Băng Tiễn: 1 địch nhận (100 + 80% AD + 30% AP) sát thương, bị Choáng 1 lượt và +5 Buốt | Khoá một mục tiêu và mở đường cho cả đội đánh vào nó |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand, Lux (sát thương bằng chiêu), Blitzcrank (cướp Q/E) · **Combo với:** Darius, Jinx (đánh vào địch đã yếu), Annie (R choáng thì Annie ăn thêm 50%).

### Jinx (vật lý)
**Chất:** "Nhặt mạng, càng nhặt càng Điên": xạ thủ cơ hội, đánh vào đứa máu càng thấp càng Điên.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đánh trúng địch dưới 75% máu: +1 Điên; dưới 25% máu: +2 Điên; hạ gục: +10 Điên (tối đa 30); Jinx chết thì mất nửa Điên. Mỗi Điên: đòn đánh của Jinx thêm (1 + 1% AD + 0.5% AP) sát thương vật lý | Đánh đứa đã sứt máu là tích; chết là mất |
| Q | - | Đổi Súng: đòn đánh kế của Jinx gây (20 + 100% AD + 20% AP + 2 mỗi Điên) lên mục tiêu, và 25% lượng đó lên mọi địch còn lại (mỗi đứa trúng đều tính Điên) | Một phát tích Điên trên cả đội |
| E | Có | Bẫy Lửa: khi địch đánh Jinx, Jinx nhận ít hơn 20% sát thương đến hết lượt và lấy 1 lá Q của Jinx lên tay | Tự cứu, bị đánh là có đạn |
| R | - | Tên Lửa: 1 địch nhận (100 + 80% AD + 20% AP + 5 mỗi Điên) + 20% máu đã mất của nó sát thương vật lý | Headshot, Điên càng cao máu nó càng thấp càng đau |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Soraka, Janna (giữ máu đồng minh cao, khó tích Điên), Renata (hồi sinh làm hụt hạ gục) · **Combo với:** Brand (Bỏng làm cả đội tụt máu), Darius (xay xuống máu thấp).

### Kog'Maw (phép)
**Chất:** "Đói": trận càng dài, sống càng dai càng mạnh; bắn theo % máu tối đa, tank càng trâu càng lủng.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lượt Kog còn sống +1 Đói; có tướng chết (bất kỳ phe) +1 Đói (tối đa 20); Kog chết thì mất nửa Đói. Đòn đánh của Kog gây thêm (0.8% máu tối đa mục tiêu mỗi Đói + 10% AD + 15% AP) sát thương phép | Sống dai là mạnh |
| Q | - | Tạt Axit: 1 địch nhận (40 + 80% AD + 40% AP) sát thương phép, Kog +3 Đói | Vừa đánh vừa nuôi |
| E | - | Xả Đạn: lượt này phần % máu tối đa từ Đói trên mỗi đòn đánh ×2 | Lượt xả |
| R | - | Đại Bác Sinh Học: mọi địch nhận (1.5% máu tối đa mỗi Đói + 30% AD + 50% AP) sát thương phép | Đói càng nhiều càng đau |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Zed (dồn chết sớm), Jinx (nhặt mạng lúc Kog còn yếu) · **Combo với:** Soraka, Janna, Braum (giữ Kog sống lâu).

### Teemo (phép)
**Chất:** "Nấm trong bộ bài địch": địch rút trúng là ăn đòn, R kích nổ cả bãi.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi đòn đánh của Teemo xáo 1 Nấm vào bộ bài địch. Địch rút trúng Nấm: Nấm nổ lên tướng máu thấp nhất bên đó (50 + 12% AD + 23% AP) sát thương phép, rồi họ vẫn rút 1 lá như thường | Bắn đều là gài đều |
| Q | - | Gài Nấm: xáo 3 Nấm vào bộ bài địch | Gài nhanh không cần đánh |
| E | Có | Phi Tiêu Mù: khi địch đánh Teemo, kẻ đó bị Mù (đòn trượt) và nhận (25 + 15% AD + 30% AP) + (8 + 5% AD + 10% AP) mỗi Nấm trong bộ địch | Tự cứu, Nấm càng dày càng đau |
| R | - | Kích Nổ: mọi Nấm trong bộ bài địch nổ cùng lúc, mỗi Nấm nổ lên tướng địch máu thấp nhất lúc đó (sát thương như nội tại), rồi biến mất | Xả cả bãi, nổ dây chuyền dọn đứa yếu |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Soraka (chịu thay đòn kết liễu), Renata (hồi sinh) · **Combo với:** Brand (Bỏng hạ máu cả đội, Nấm kết liễu), Blitzcrank (phá tay địch).

### Vayne (Sát thủ, vật lý)
**Chất:** "Thợ săn bóng đêm": càng ở lâu trong bóng tối, ra tay càng chí mạng. (Chuyển từ Xạ thủ sang Sát thủ.)

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lượt Vayne không ở trên sân (chưa gọi/chờ hồi sinh): +2 Đêm (tối đa 10). Mỗi đòn đánh tiêu 1 Đêm, gây thêm (24 + 36% AD + 8% AP) sát thương chuẩn | Giữ Vayne trên tay, gọi ra đúng lúc |
| Q | Có | Nhào Lộn: Vayne Tàng Hình đến hết lượt địch, +2 Đêm | Đường thoát của sát thủ |
| E | - | Mũi Tên Bạc: lượt này mỗi đòn đánh tiêu 2 Đêm, phần sát thương thêm ×2 | Lượt xả nhanh |
| R | - | Giờ Khắc Định Mệnh: đòn đánh kế tiêu hết Đêm: (60 + 100% AD + 20% AP) + (15 + 15% AD) mỗi Đêm sát thương chuẩn | Một phát định mệnh |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand, Ashe (sát thương diện rộng vẫn trúng Vayne đang Tàng Hình) · **Combo với:** Janna, Renata (giữ Vayne sống để xả hết Đêm).

## G. Trợ thủ

### Nami (phép)
**Chất:** "Thuỷ triều nuôi bài": mỗi đòn đánh, mỗi lần hồi máu của cả đội là một cơ hội rút bài; Nami tự tạo thật nhiều lần như vậy.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lần một đồng minh gây sát thương hoặc hồi máu: có tỉ lệ (5% + 0.05% mỗi điểm AD + 0.05% mỗi điểm AP **của đồng minh đó**) cho bạn rút 1 lá (áp dụng như nhau cho mọi đồng minh, kể cả Nami). **Tối đa 2 lá/lượt từ nội tại** (đề xuất, chống cạn bộ) | Cả đội ra đòn/hồi càng nhiều lần, càng nhiều bài |
| Q | - | Bong bóng: 1 địch nhận (40 + 25% AD + 55% AP) sát thương phép, Choáng 1 lượt và bị đánh dấu 3 nấc: 3 đòn kế tiếp của đồng minh lên nó, mỗi đòn tiêu 1 nấc và gây thêm (10 + 10% AD + 20% AP) sát thương phép (theo chỉ số Nami) | Khống chế chính; 3 đòn đánh dấu = 3 lần quay rút bài |
| E (chủ gọi W) | - | Nước hồi sinh: Nami hồi (35 + 15% AD + 35% AP), rồi dòng nước nảy ngẫu nhiên giữa các đồng minh (có thể nảy lại người cũ), tối đa 5 lần nảy, mỗi lần nảy hồi (35 + 15% AD + 35% AP). Mỗi lần hồi đều kích nội tại | Hồi máu nhiều lần nhỏ = nhiều lần quay rút bài |
| R | - | Sóng thần: mọi đồng minh hồi (100 + 30% AD + 70% AP); mọi địch Choáng 1 lượt | Lật kèo giao tranh; mỗi lần hồi cũng kích nội tại |

Bộ: Q ×4 · E ×4 · R ×1 (Q + E vào tay khi ra sân). Cái giá: rút nhiều thì bộ bài cạn nhanh, tay đầy thì bị đốt bài. **Khắc chế bởi:** Blitzcrank (cướp bài vừa rút), Teemo (rút nhiều dễ trúng Nấm), Vết Thương Sâu · **Combo với:** Darius, Garen (đánh đều mỗi lượt), Jinx, Vayne (3 đòn tiêu đúng 3 nấc Q), Twisted Fate (tay bài là đạn).

**V3 (chủ chốt bộ chiêu mới 2026-10-30, thay bộ rút bài cũ):** chỉ thêm hệ số. Vai trợ thủ đủ: khống chế (Q, R) + hồi máu (E, R). Chất rút bài chuyển vào nội tại theo tỉ lệ. Ví dụ tỉ lệ: đồng minh 110 AD / 0 AP: 5% + 5.5% = 10.5% mỗi lần; Nami 88 AD / 66 AP tự hồi: 5% + 4.4% + 3.3% = 12.7% mỗi lần. Một lượt E (6 lần hồi) + 3 đòn đánh thường chạm trần 2 lá khá thường xuyên.

### Soraka (phép)
**Chất:** "Máu của Soraka là máu của cả đội."

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đồng minh nhận đòn kết liễu: Soraka chịu toàn bộ sát thương đòn đó, đồng minh còn ít nhất 1 máu. Soraka không đủ máu thì Soraka ngã, đồng minh vẫn sống | Máu Soraka là kho chung |
| Q | - | Sao Băng: 1 địch nhận (40 + 20% AD + 60% AP) sát thương phép, Soraka hồi (60 + 20% AD + 40% AP); phần hồi thừa thành Khiên cho đồng minh máu thấp nhất | Bắn sao để nạp kho |
| E | Có | Phân Định: khi địch tung chiêu vào đồng minh, huỷ chiêu đó và tướng tung chiêu bị Câm Lặng 1 lượt | Chặn chiêu |
| R | - | Ước Nguyện: mọi đồng minh, kể cả Soraka, hồi (150 + 40% AD + 80% AP) | Lật kèo giao tranh |

Bộ: Q ×4 · E ×4 · R ×1 (Q + E vào tay khi ra sân). **Khắc chế bởi:** Zed (dồn chết Soraka trước), Vết Thương Sâu, Blitzcrank (cướp Q/E) · **Combo với:** Aatrox, Darius (đứng xay lâu).

## H. Tướng mới (chốt 2026-10-30)

### Tristana (Xạ thủ, vật lý)
**Chất:** "Bom nổ chậm": gắn bom một đứa rồi nện cho nổ, nổ hạ được thì có bom tiếp.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Bom Hẹn Giờ: đòn đánh của Tristana lên địch mang Bom +1 Nạp; đủ 4 Nạp hoặc tới cuối lượt sau thì Bom nổ: (40 + 50% AD + 50% AP) + (15 + 20% AD) mỗi Nạp. Bom nổ hạ được địch thì lá E quay về tay | Gắn rồi nện |
| Q | - | Bắn Nhanh: lượt này mỗi đòn đánh của Tristana thêm (20 + 40% AD) sát thương vật lý | Lượt nện |
| E | - | Gắn Bom: gắn Bom lên 1 địch, nó nhận (30 + 40% AD + 30% AP) sát thương | Mở |
| R | - | Đại Bác: 1 địch nhận (80 + 100% AD + 50% AP) sát thương, kích nổ Bom trên nó ngay và Choáng 1 lượt | Chốt |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (huỷ đòn), Zed (dồn sớm) · **Combo với:** Braum, Leona (giữ mục tiêu cho Tristana nện).

### Miss Fortune (Xạ thủ, vật lý)
**Chất:** "Mưa đạn": đổi mục tiêu liên tục, bắn cả bàn.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Cú Bắn Tình Yêu: mỗi lượt, đòn đầu tiên lên mỗi địch khác nhau gây thêm (20 + 50% AD + 10% AP) | Đổi mục tiêu là lời |
| Q | - | Bắn Nảy: 1 địch nhận (40 + 90% AD + 20% AP), đạn nảy sang 1 địch khác nhận ×1.5 lượng đó (×2 nếu phát đầu hạ gục) | Nảy cho đau |
| E | Có | Mưa Đạn: mọi địch nhận (20 + 30% AD + 20% AP) sát thương và Vết Thương Sâu đến hết lượt sau | Cắt hồi máu |
| R | - | Bão Đạn: mọi địch nhận (40 + 60% AD + 20% AP) ngay và lần nữa cuối lượt địch; MF bị khống chế trước khi phase 2 nổ thì phase 2 huỷ | Địch phải khống chế MF |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna, Braum, Annie (khống chế huỷ phase 2) · **Combo với:** Brand (cùng rải), Leona.

### Vel'Koz (Pháp sư, phép)
**Chất:** "Phân rã": pháp sư gánh sát thương, nhiều tia nhỏ, trúng đủ 3 lần là rã chuẩn.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Phân Rã Hữu Cơ: mỗi lần chiêu Vel'Koz trúng 1 địch, nó +1 Phân Rã; đủ 3 thì nổ (30 + 10% AD + 40% AP + 5% máu tối đa của nó) sát thương chuẩn và về 0. | Nhiều tia = nhiều lần rã |
| Q | - | 20 | Phân Hạch Plasma: 1 địch (chọn) nhận gấp đôi: (40 + 20% AD + 160% AP + 4% máu đã mất); 2 địch ngẫu nhiên khác mỗi đứa nhận (20 + 10% AD + 80% AP + 2% máu đã mất) sát thương phép | Đứa chính ăn đậm, tản ra 2 đứa |
| E | - | 30 | Khe Nứt Hư Không (W gốc): 1 địch nhận (30 + 10% AD + 50% AP + 4% máu đã mất) ngay, và lần nữa cuối lượt (tính lại theo máu đã mất lúc đó) | Hai nhịp |
| R | - | 60 | Tia Phân Rã Sự Sống: bắn 10 tia, mỗi tia vào 1 địch ngẫu nhiên: (15 + 3% AD + 12% AP + 3% máu đã mất của nó) sát thương phép; mỗi tia tính Phân Rã | Quét cả đội, kích rã liên tục |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Zed, Kha'Zix (dồn sớm), Janna (miễn nhịp hai) · **Combo với:** Janna, Braum (che Vel'Koz), Brand (cùng rải).

## Cặp combo & khắc chế đáng chú ý
- **Leona / Ahri / Malphite → Qiyana:** khống chế rồi Qiyana R xoá sổ. Khắc chế: Janna E miễn khống chế.
- **Leona → Zed:** Choáng để Zed dồn trọn lượt rồi R kích nổ; hạ được thì Zed Tàng Hình.
- **Renata + Malphite / Braum:** Giáp từ Renata Q chồng lên giảm sát thương của đỡ đòn.
- **Blitzcrank + Teemo:** phá tay địch và gài Nấm vào bộ, địch vừa mất bài vừa rút trúng bom.
- **Nami + Vayne / Jinx:** Q nhốt và đánh dấu một con, 3 đòn của Xạ thủ tiêu đúng 3 nấc: vừa thêm sát thương vừa thêm cơ hội rút bài.
- **Kog'Maw + Janna / Soraka:** giữ Kog sống thật lâu là thắng về cuối trận. Khắc chế: Zed/Kha'Zix dồn sớm.
- **Brand + Katarina:** Bỏng hạ máu cả đội, Kat R dọn rồi nối chuỗi.
- **Yorick + Katarina / Twisted Fate:** lá về mộ nhanh, Yorick to nhanh.
- **Twisted Fate + đội cần khống chế:** Q lấy lá Vàng là Choáng, giữ lá Vàng trên tay cũng là đạn cho E.
- **Renata vs Katarina / Jinx / Zed:** hồi sinh phá các lối chơi "hạ được thì...".
- **Blitzcrank vs đội giữ bài (Lux nhịn mana, Gangplank giữ Q):** R soi tay rồi Q cướp đúng lá; mỗi lá cướp là một Khiên.
- **Ornn + Darius / Jinx:** Q Ornn rèn carry, đòn kế Choáng mở đường dồn.

## Rủi ro cân bằng
- **Hiệu ứng vĩnh viễn:** Bỏng của Brand, Dồn của Zed, Đói của Kog'Maw, Tiến Hoá của Viktor, Rèn của Ornn. Đã có trần (Bỏng 12, Dồn 8, Đói 20, Tiến Hoá 10, Rèn 10); theo dõi.
- **Dồn sát thương trong 3 đòn:** trần cứng 3 đòn/lượt đã chốt; Điên của Jinx tối đa 30 (R ngưỡng tối đa 60%).
- **Choáng mọi địch:** Leona R, Ashe R, Blitzcrank R, Nami R. Hai cái liên tiếp có thể khoá cả đội địch 2 lượt. Đề xuất: tướng vừa hết Choáng được miễn Choáng 1 lượt.
- **Malphite:** giảm sát thương theo tay + Khiên E, rồi R sát thương diện rộng; theo dõi tay 10.
- **Vòng lặp hồi lá:** Katarina (nội tại + R), Darius R dùng lại. Cần giới hạn số lần/lượt nếu quá mạnh.
- **Blitzcrank cướp bài:** R Choáng mọi tướng có chiêu trên tay địch có thể khoá cả đội nếu địch giữ nhiều chiêu. Theo dõi.
- **Lux giữ mana:** AP theo mana cộng E theo mana có thể quá mạnh khi mana đầy.
- **Garen:** kẻ đối diện đánh nhiều thì Tội dày; theo dõi khi kẻ đối diện là Xạ thủ 3 đòn/lượt.
- **Zed R chết ngay:** ngưỡng 6 Dồn cần chỉnh để không xoá Đỡ đòn quá dễ.
- **Aatrox:** Q liên tục rồi R có thể ra một nhát cực lớn; giữ hệ số 200%.
- **Gangplank:** tối đa 1 Thùng; theo dõi số Thuốc Súng trung bình lúc nổ.
- **Braum:** Vững tối đa + E gần như miễn sát thương đòn đánh; trần 80% (cá nhân) / 60% (cả đội).
- **Leona:** R +2 Nắng sau một lượt đánh rải có thể Choáng gần cả đội.
- **Ornn:** Rèn vĩnh viễn và R nhân đôi; trần 10 Rèn mỗi tướng.

### Rủi ro V3 (2026-10-30)
- **Đòn đánh 1× AD (Sát thủ 1.25×):** Xạ thủ mất một nửa sát thương đòn đánh (200% → 100%), Sát thủ mất gần 2/3 (350% → 125%). Các bộ dựa đòn đánh (Jinx, Vayne, Kog'Maw, Ashe, Qiyana, Zed E) cần QA lại; Rủi ro cũ "Qiyana 3 đòn 350% ×2" không còn.
- **AP gốc:** nếu chủ không duyệt AP gốc cho tướng phép thì mọi công thức nghiêng AP phải chia lại (tướng phép sẽ yếu đầu trận).
- **Kiếm Dài mỗi 2 lượt chỉ cho AD:** tướng vật lý lớn đều theo thời gian, tướng phép (hệ số AP cao) lớn chậm hơn. Cân nhắc phát luân phiên mảnh AP, hoặc QA hệ số AD của tướng phép.
- **Khống chế nhiều hơn:** V3 thêm Choáng/Câm Lặng/Mù cho Braum E, Malphite Q, Ornn Q, Twisted Fate Q, Soraka E, Teemo E; bộ Nami mới (chủ chốt) có Choáng ở Q (4 lá) và Choáng cả đội ở R.
- **Nami nội tại rút theo tỉ lệ:** trần đề xuất 2 lá/lượt; nếu bỏ trần, E (6 lần hồi) + nhiều đòn có thể rút 3–4 lá/lượt và tự cạn bộ. Cộng với Janna Q (4 lá Choáng), cần luật miễn Choáng 1 lượt sau Choáng (đề xuất ở trên) trước khi chạy 1000 trận.
- **Khiên chồng Khiên:** Janna + Braum + Blitzcrank + Nami có thể làm giao tranh kéo quá dài. Đề xuất trần Khiên trên 1 tướng (ví dụ tối đa 60% máu tối đa).
- **AD gốc ×1.4 + Kiếm Dài mỗi 2 lượt:** đến vòng 10 một tướng có thể đeo 5 Kiếm Dài (+75 AD). Cộng với đồ tháo/lắp được, người chơi dồn hết đồ lên một carry. Theo dõi số đòn hạ gục giữa trận (mục tiêu ≈2).
- **Kha'Zix R:** Quick, Tàng Hình + trả lá Q, có thể dùng trong lượt địch để né. Theo dõi số lần Kha'Zix chết trước lượt săn.
- **Mốc gọi tướng 1/4/8/13/19:** lá chiêu của tướng chưa gọi nằm chết lâu hơn; Yorick Q, Ornn Q, Viktor Q, Twisted Fate (bỏ/ném bài) được lợi. Vayne nạp Đêm ngoài sân dễ đầy.
