# StarCi League: Thiết kế lại kỹ năng V2

> Bản thiết kế trên giấy. Số liệu chỉ là gợi ý; con số thật sẽ chỉnh bằng mô phỏng.

## Luật chung (đã chốt)
- Mỗi lượt rút 2 lá. Tay tối đa 10 lá.
- Mỗi người chơi tối đa **3 đòn đánh/lượt**, tính mọi đòn (lá Đánh Thường, đấu sĩ đánh không lá, đòn thêm do chiêu). Không có ngoại lệ.
- **Đấu sĩ**: có nút đặc biệt **đòn Quick 66%**: đánh không cần lá, dùng được như Quick (cả trong lượt địch/chuỗi), 1 lần/lượt mỗi tướng, tính vào giới hạn 3 đòn. Không dùng nút thì đánh như thường bằng lá Đánh Thường (100%).
- **Trợ thủ**: khi ra sân, lá Q và E vào thẳng tay. Nội tại mạnh, đủ sức lật kèo (ngang Renata).
- **Bộ bài**: 40 lá chung (Đánh Thường, bổ trợ, vàng, đồ) + mỗi tướng đúng **4Q, 4E, 1R** (9 lá) × 5 tướng = **85 lá**. Mọi tướng cùng số bản.
- **Pháp sư**: lá chiêu nằm trong bộ bài như mọi tướng, nhưng dùng chiêu tốn mana của pháp sư đó. Mana theo thang ×10: mỗi lượt +10 (mặc định tối đa 100), tuỳ pháp sư; giá từng chiêu tuỳ tướng, có thể lẻ (15, 25…).
- Các vai trò khác không dùng mana.
- **Bài trên tay quyết định gọi ai ra sân.** Chiêu của tướng chưa ra sân là bài chết trên tay, nên phải tính. Ví dụ tay: Đánh, Đánh, Đánh, E Blitz, E Renata. Lượt đầu có thể gọi Renata để dựng thế thủ (E Renata là Quick, ra sân còn nhận Q), gọi Blitz để mở giao tranh, hoặc gọi đấu sĩ dùng 3 lá Đánh (đấu sĩ không cần bài vẫn đánh) và giữ E Blitz, E Renata chờ gọi đúng lúc. Bot cũng phải chọn tướng ra sân theo bài trên tay.
- **Pha triệu hồi: 2 bên úp bài gọi tướng cùng lúc rồi mới lật**, mỗi bên gọi cùng số tướng; không có chuyện bên này thấy bên kia gọi 1 rồi gọi thêm 2 để ăn hiếp.
- Chiêu dùng xong vào mộ. Thua khi phải rút mà bộ bài rỗng, hoặc mất hết 7 mạng.
- Chỉ Xạ thủ đánh được ô phụ (ô triệu hồi thêm).

## Nguyên tắc
1. Mỗi tướng có **một câu Chất** = một điều kiện/lối chơi. Cả 4 kỹ năng phục vụ đúng lối chơi đó, không có chiêu độn.
2. Kỹ năng ngắn: một câu tác dụng, thêm tối đa một điều kiện tạo ra lựa chọn.
3. Điều kiện tạo cái hay: "nếu khiên vỡ...", "khi địch đánh...", "hạ được thì dùng lại...".
4. Hoặc là chiêu sát thương, hoặc là chiêu hiệu ứng thuần. Không có chiêu nửa vời (sát thương nhỏ cộng hiệu ứng nhỏ).
5. Không chọn mục tiêu rối rắm. Chỉ dùng: 1 mục tiêu, mọi địch, mọi đồng minh, hoặc tự động.
6. Chiêu phòng thủ/phản ứng là Quick.
7. Không có chiêu đổi chỗ cho có. Chỉ được di chuyển khi đó là phần thưởng của lối chơi.
8. **Không bắt chước LoL.** Chỉ giữ chất/hương vị của tướng; cơ chế phải thiết kế lại cho game bài, không chép bộ chiêu thật.

**Hai quy tắc phụ (rút ra từ góp ý):**
- Nội tại phải là động cơ của chuỗi combo chính, không phải phần thưởng phụ.
- Cơ chế tối giản: không thêm dấu/stack/đếm số, trừ khi chính bộ đếm đó là chất của tướng (Bỏng của Brand, Chảy Máu của Darius, Dồn của Zed, Đói của Kog'Maw).

**Từ khoá dùng trong tài liệu:** Choáng (mất lượt hành động), Câm Lặng (không dùng chiêu), Mê (không đánh được lượt kế), Khiên, Giáp, Chảy Máu (Darius), Bỏng (Brand), Dồn (Zed), Buốt (Ashe), Đóng Băng (Lissandra), Đói (Kog'Maw). Mỗi status riêng chỉ thuộc về một tướng; Choáng/Câm Lặng/Mê/Khiên/Giáp là status chung.

---

Bổ sung sau khi duyệt với chủ:
- **R là đỉnh của chất tướng:** lấy chính cơ chế của nội tại/Q/E đẩy lên tối đa, không thêm hiệu ứng lạ (Darius R chém theo Chảy Máu, Brand R nhân đôi Bỏng, Ashe R đóng băng mọi địch có Buốt và nổ theo Buốt).
- **Mỗi lá đứng được một mình:** R chỉ có 1 lá trong 85, lối chơi không được dựa vào R; Q, E (4 lá mỗi chiêu) phải tự làm nên chất.
- **Không 2 chiêu cùng mục đích:** so từng cặp trong cùng tướng (vd nội tại và E cùng chuyển máu là trùng). Nhiều chiêu cùng dùng một cơ chế (Ashe: cùng gắn Buốt) thì được, miễn mỗi chiêu một cách/một nấc khác nhau.
- **Ưu tiên cơ chế thẻ bài** (tay, bộ bài, mộ) hơn bê chiêu LoL; không bày thêm thứ vô nghĩa (gọi quân chiếm ô, bắn lan).

## A. 5 tướng mẫu (đã duyệt, giữ nguyên)

### Renata (Trợ thủ)
**Chất:** "Địch có dám đánh không": trừng phạt kẻ tấn công.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đồng minh bị hạ thì hồi sinh với 25% máu và hoá **Điên** (tốc đánh + ATK lớn trong lượt đó) | 1 lần/đồng minh/trận, Renata phải đang trên sân |
| Q | Có | Buff Giáp lớn cho 1 đồng minh | Giáp bị phá: kẻ phá nhận sát thương lớn + Choáng |
| E | Có | Khi một địch tấn công, phản lại sát thương | Ép địch phải cân nhắc trước khi đánh |
| R | - | Mọi địch đánh lẫn nhau | Địch càng mạnh càng tự hại nhau nặng |

### Darius (Đấu sĩ)
**Chất:** "Xay một thằng": dồn một mục tiêu đến chết.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh gây Chảy Máu (cộng dồn) | Cứ đánh một con là tích stack |
| Q | - | 1 đòn nặng + 2 Chảy Máu | Tăng tốc tích stack |
| E | - | Gây sát thương kẻ đối diện | Đối diện trống thì kéo 1 địch khác về trước mặt |
| R | - | Kết liễu, sát thương theo số stack Chảy Máu | Hạ được thì dùng lại R |

### Janna (Trợ thủ)
**Chất:** "Địch đánh vào là hụt": ngăn đòn đánh, không gây sát thương.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đầu lượt bạn, đồng minh ít máu nhất nhận Khiên nhỏ | Tự động |
| Q | Có | Huỷ 1 đòn đánh của địch lên đồng minh | Giữ lá chờ đòn to nhất |
| E | Có | Khiên 1 đồng minh; còn Khiên thì miễn khống chế | Chặn combo Choáng |
| R | Có | Đến hết lượt địch, mọi đòn lên đội mình −50% | Hết lượt, cả đội hồi máu bằng lượng đã chặn |

### Brand (Pháp sư)
**Chất:** "Bỏng cháy mãi mãi, spam chiêu là cháy hết."

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Bỏng không bao giờ hết, cộng dồn; mỗi stack gây sát thương phép đầu mỗi lượt địch | Trận càng dài càng cháy |
| Q | - | 10 | Sát thương 1 địch + 1 Bỏng | Chiêu rẻ để spam |
| E | - | 20 | Mọi địch +1 Bỏng | Rải lửa |
| R | - | 50 | Nhân đôi stack Bỏng trên mọi địch | Để dành lúc stack đã dày |

### Zed (Sát thủ)
**Chất:** "Dồn": mỗi đòn của Zed chồng thêm một nấc, rồi kích nổ một thằng.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi đòn Zed trúng địch (đánh thường hoặc chiêu) +1 Dồn lên nó; Dồn ở lại đến khi Zed dùng R lên nó | Dồn một mục tiêu |
| Q | - | Sát thương kẻ đối diện (+1 Dồn qua nội tại) | Chiêu nạp Dồn |
| E | - | Lượt này mọi đòn của Zed chí mạng | Lượt dồn chính |
| R | - | Kích nổ: mỗi stack Dồn gây sát thương lớn | Dồn chạm ngưỡng thì mục tiêu chết ngay |

---

## B. Đấu sĩ

### Aatrox
**Chất:** "Đổi máu lấy máu": Aatrox tự rút máu mình để chém, máu càng cạn đòn càng nặng, chém trúng thì hút lại.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh của Aatrox (cả nút Quick 66%) gây thêm sát thương bằng 25% máu Aatrox đã mất | Tài nguyên là máu đã mất, hiện ngay trên thanh máu |
| Q | - | Aatrox mất 25% máu tối đa; kẻ trước mặt nhận sát thương gấp 2 lượng đó | Trả máu lấy sát thương, đồng thời nạp nội tại. Không tự giết (còn tối thiểu 1 máu) |
| E | Có | Đến hết lượt, đòn đánh của Aatrox hồi máu bằng 100% sát thương gây ra | Tiêu máu đã mất để sống lại; Quick nên ghép được với nút 66% trong lượt địch |
| R | - | Kẻ trước mặt nhận sát thương bằng 2 lần máu Aatrox đã mất; Aatrox hồi đúng lượng đó | Xả toàn bộ máu đã mất thành một nhát, rồi đứng dậy đầy máu |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (Q huỷ đòn, Aatrox không hút được), Zed (dồn chết lúc Aatrox đang thấp máu) · **Combo với:** Renata (hồi sinh 25% máu = máu đã mất rất lớn, kèm Điên), Soraka (chịu đòn chí mạng thay, Aatrox dám đứng ở 1 máu).

**Tự kiểm:** R xả đúng thứ nội tại đếm (máu đã mất) và cả hai chiều đổi máu: có. Q (trả máu ra sát thương) và E (sát thương ra máu) là hai chiều ngược nhau, không trùng. Không có R: Q hạ máu, đánh thường nặng dần, E hút lại; đủ vòng. Không chiêu nửa vời: Q và R là sát thương thật, E là hiệu ứng thuần. Mọi sát thương rơi vào kẻ trước mặt, đúng luật đấu sĩ.

### Garen
**Chất:** "Tay đôi với kẻ trước mặt": đứng trước Garen thì đánh là chết, không đánh là vô dụng.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Kẻ đối diện Garen mỗi lần tấn công (bất kỳ ai) +1 Tội; đòn đánh của Garen gây thêm sát thương theo Tội | Tội luôn nằm đúng chỗ Garen đánh tới |
| Q | - | Chém kẻ trước mặt 1 phát lớn + sát thương theo Tội | Dùng Tội |
| E | - | Chém kẻ trước mặt 3 nhát (sát thương chiêu, không tính 3 đòn), mỗi nhát +1 Tội | Nuôi Tội |
| R | - | Phán Quyết: kẻ trước mặt nhận sát thương cực lớn theo Tội | Xả Tội |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** bỏ trống đường đối diện Garen, Ashe (kẻ trước mặt đánh yếu, ít Tội) · **Combo với:** Darius (E kéo địch về chỗ trống trước mặt).

### Gangplank
**Chất:** "Ăn cam trụ đường, gài thùng nổ cả đội": đấu sĩ bền, bịp bằng thùng giả.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Thùng thật trên sân +1 Thuốc Súng mỗi lượt GP. Đòn đánh của GP (cả nút 66%) vào Thùng thật thì Thùng nổ: **cả đội địch** nhận sát thương theo Thuốc Súng. **Thùng giả:** GP úp **bất kỳ lá nào trên tay** vào ô Thùng (lá đó mất); địch không phân biệt được thật/giả | Bịp: địch phải đoán thùng nào đáng phá |
| Q | - | Ăn cam: hồi máu lớn | Trụ đường, đúng chất đấu sĩ |
| E | - | Đặt 1 Thùng thật vào ô phụ | Gài sớm, thùng to dần |
| R | - | Thêm 1 lá Cam (Q) + 1 lá Thùng (E) lên tay | Nạp đạn để trụ và gài tiếp |

Ô phụ chứa tối đa 1 Thùng (thật hoặc giả). Xạ thủ và Đấu sĩ địch đánh được Thùng (đấu sĩ được ngoại lệ đánh vào ô Thùng); đánh vào Thùng giả thì lá giả bị lật và vào mộ, phí một đòn. Thùng giả bị địch phá thì GP hồi máu: lá thường hồi 30% lượng hồi của Q, lá Cam hồi 100%. GP tự đánh vào Cam úp của mình (ăn cam úp) thì hồi 60%. Thùng thật bị phá thì không hồi. Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Xạ thủ và Đấu sĩ địch (Jinx, Darius phá thùng), Blitzcrank (cướp lá Cam/Thùng) · **Combo với:** Brand (Bỏng + nổ thùng dọn cả đội), Malphite (giữ tay dày để có lá úp giả).

### Yorick
**Chất:** "Mộ càng dày, Yorick càng to."

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Yorick +ATK và +máu tối đa theo số lá trong mộ của bạn | Đánh bài nào cũng là nuôi Yorick |
| Q | - | Chôn 1 lá trên tay vào mộ, rút 1 lá | Biến bài chết (chiêu của tướng chưa ra sân) thành sức mạnh |
| E | - | Lấy 1 lá chiêu của đồng minh (trừ R) từ mộ về tay | Dùng lại chiêu mạnh đã đánh |
| R | - | Lượt này đòn đánh của Yorick gây thêm sát thương theo số lá trong mộ và hút máu | Lượt bùng nổ khi mộ đã dày |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp bài trước khi kịp chôn), Khống chế (Leona) · **Combo với:** Viktor (bỏ bài vào mộ), Brand (spam chiêu, mộ đầy nhanh).

---

## C. Đỡ đòn

### Blitzcrank
**Chất:** "Thò tay vào bài địch": phạt việc giữ bài, cướp đúng lá địch cần.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Lá Blitz cướp được: lá chung thì Blitz giữ dùng; lá chiêu của tướng địch thì bị đốt và tướng đó Choáng 1 lượt | Cướp trúng chiêu là vừa mất bài vừa đứng hình |
| Q | - | Cướp 1 lá ngẫu nhiên từ tay địch; tay địch đang lộ thì chọn lá | Phá kế hoạch giữ bài |
| E | Có | Khi địch đánh 1 lá: giật lá đó, huỷ tác dụng, xử lý như lá cướp | Giật đúng chiêu quan trọng |
| R | - | Lộ toàn bộ tay địch đến hết lượt; tướng nào có chiêu trên tay địch thì Choáng | R rồi Q: soi bài, cướp đúng lá |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** đội đánh hết bài nhanh (Đấu sĩ đánh không lá), Twisted Fate (xem và xếp bài) · **Combo với:** Teemo (vừa phá tay vừa gài Nấm vào bộ địch).

### Braum
**Chất:** "Đứng sau tôi": Braum hứng đòn cho đồng đội, càng hứng càng Vững.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi đòn đánh trúng Braum +1 **Vững** (giữ mãi, tối đa 6). Mỗi Vững: Braum nhận ít hơn 10% sát thương | Bị đánh là cứng thêm |
| Q | Có | Khi địch đánh 1 đồng minh: Braum đỡ thay đòn đó và +2 Vững | Kéo đòn về Braum để nạp Vững |
| E | Có | Đến hết lượt, Vững của Braum tính ×2 (tối đa giảm 80%) | Bật ngay trước đòn to |
| R | Có | Đến hết lượt địch, mọi đồng minh nhận ít sát thương hơn theo Vững của Braum | Cả đội đứng sau tấm khiên |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand, Lux (sát thương bằng chiêu, không qua đòn đánh nên không nạp Vững) · **Combo với:** Kog'Maw, Jinx (Braum hứng đòn cho Xạ thủ sống lâu), Renata (Q Renata thêm Giáp lên Braum đang hứng đòn).

**Tự kiểm:** R đưa chính Vững (giảm sát thương) lên cả đội: có. Q (đỡ thay, nạp) và E (nhân đôi) khác việc. Không có R: Q kéo đòn và nạp, E nhân lúc cần; đủ chất. Không chiêu nửa vời, không gây sát thương. Mọi lá là Quick, đúng tướng phòng thủ.

### Leona
**Chất:** "Mặt trời mọc": gom Nắng lên địch, đủ Nắng là Choáng, đồng đội đánh sau.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh của Leona +1 **Nắng** lên mục tiêu. Địch đủ 3 Nắng thì Choáng 1 lượt và mất hết Nắng | Nắng là đồng hồ đếm ngược tới Choáng |
| Q | - | 1 địch +2 Nắng | Đánh thêm 1 đòn là Choáng |
| E | - | Lượt này mỗi đòn đánh của đồng minh +1 Nắng lên mục tiêu | Cả đội cùng đốt nắng, dồn 3 đòn là Choáng |
| R | - | Mọi địch +2 Nắng | Ai đã có Nắng thì Choáng ngay, số còn lại chỉ còn cách 1 đòn |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (E miễn khống chế) · **Combo với:** Zed, Darius (kẻ bị Choáng đứng yên chịu dồn), Ashe (3 đòn của Xạ thủ trong lượt E Leona là 3 Nắng).

**Tự kiểm:** R là Q lên mọi địch, đúng một cơ chế Nắng: có. Q (Leona tự đặt 2 Nắng lên 1 địch) và E (cho đòn đánh của cả đội đặt Nắng) là hai nguồn khác nhau, không trùng. Không có R: Q + 1 đòn đánh = Choáng; đủ chất. Không chiêu nửa vời, Leona không gây sát thương bằng chiêu. Bỏ hẳn chiêu lao đổi chỗ.

### Malphite
**Chất:** "Núi đá": tay bài càng dày, Malphite càng cứng và đập càng đau.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Malphite nhận ít hơn 5% sát thương cho mỗi lá trên tay bạn | Tài nguyên là số lá trên tay (tối đa 10 = −50%) |
| Q | - | Gây sát thương 1 địch theo số lá trên tay bạn | Đánh mà không mất lá nào trên tay |
| E | Có | Khi Malphite bị đánh: rút 2 lá trước khi tính sát thương | Nạp tay ngay giữa lượt địch |
| R | - | Bỏ toàn bộ tay; mọi địch nhận sát thương theo số lá đã bỏ (×2 so với Q) | Ném cả ngọn núi, rồi Malphite mềm lại |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp bài làm mỏng tay) · **Combo với:** Yorick (R đổ cả tay vào mộ, Yorick lớn vọt), Twisted Fate (Xanh rút 2).

**Tự kiểm:** R xả toàn bộ tài nguyên (cả tay) thành sát thương diện rộng: có. Q (đọc tay ra sát thương) và E (nạp tay) khác việc; nội tại là phòng thủ, Q là tấn công. Không có R: giữ bài để cứng, Q đánh, E rút; đủ chất. Không chiêu nửa vời. Cái giá thật: tay chung cả đội, đánh bài nào Malphite cũng mềm đi, rút nhiều thì bộ bài cạn nhanh hơn.

### Ornn
**Chất:** "Lò rèn của đội": mỗi lượt Ornn rèn đồng đội cứng và sắc thêm.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đầu lượt bạn: 1 đồng minh (bạn chọn) +1 **Rèn** (vĩnh viễn, tối đa 10). Mỗi Rèn: +ATK và +Giáp | Lò luôn đỏ: cứ đứng trên sân là rèn |
| Q | - | Bỏ 1 lá trên tay: 1 đồng minh +3 Rèn | Đổi bài chết (chiêu của tướng chưa ra sân) thành đồ rèn |
| E | Có | 1 đồng minh: đến hết lượt, Rèn của nó tính ×2 | Lượt mình là ATK ×2, lượt địch là Giáp ×2 |
| R | - | Nhân đôi Rèn của mọi đồng minh (vĩnh viễn) | Rèn cả đội lên Kiệt Tác |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand (Bỏng là sát thương phép, Giáp vô dụng), Kog'Maw (bắn theo % máu tối đa) · **Combo với:** Darius, Jinx (đổ Rèn vào một carry), Yorick (Q bỏ lá cũng là nuôi mộ).

**Tự kiểm:** R nhân đôi chính Rèn trên cả đội: có (cùng kiểu Brand R). E (×2 tạm thời, 1 người) và R (×2 vĩnh viễn, mọi người) là hai nấc khác nhau; Q là nạp, không trùng. Không có R: nội tại + Q dồn Rèn lên một người, E bật đúng lúc; đủ chất. Không chiêu nửa vời. Bỏ hẳn lớp mảnh đồ/ghép đồ để khỏi phụ thuộc lá Đồ trong bộ.

---


---

## D. Sát thủ

### Katarina
**Chất:** "Hạ một là làm lại": lá nào hạ gục được thì quay về tay.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Lá Katarina hạ gục được địch thì quay về tay thay vì vào mộ | Chọn đúng con đủ yếu để giữ lá |
| Q | - | Sát thương lớn 1 địch | Mở chuỗi, hoặc hạ luôn rồi dùng lại |
| E | - | Sát thương 1 địch; nó dưới 50% máu thì ×2 | Lá kết liễu, nối chuỗi chắc tay |
| R | - | Sát thương mọi địch; mỗi địch bị hạ: lấy 1 lá Katarina từ mộ về tay | Dọn cả bàn, kho lá đầy lại |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Renata (hồi sinh: hạ hụt, lá không về), Soraka (Soraka còn máu thì không ai chết) · **Combo với:** Brand (Bỏng hạ máu cả đội trước), Darius (xay một thằng xuống ngưỡng cho Kat kết).

**Tự kiểm:** R là đỉnh của "hạ gục trả lá": hạ nhiều, về nhiều lá, kể cả lá đã vào mộ từ trước: có. Q (sát thương thô, mở) và E (×2 lên con yếu, kết) cùng phục vụ chuỗi nhưng hai nấc khác nhau, kiểu Darius Q/E. Không có R: Q mở, E kết, lá hạ gục quay về; đủ chất. Không chiêu nửa vời, cả ba đều là sát thương thật. Chuỗi tự giới hạn bằng số địch còn sống.

### Kha'Zix
**Chất:** "Săn kẻ đứng một mình."

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh và chiêu của Kha'Zix gây ×2 sát thương lên địch **Cô Lập** (không có đồng minh nào ở đường kề) | Đọc đội hình địch; mỗi con chết là mở thêm đường trống |
| Q | - | Sát thương lớn 1 địch | Ném vào con Cô Lập là ×2 |
| E | - | 1 địch bị Cô Lập đến hết lượt | Tự tạo mồi khi địch đứng kín |
| R | - | Đến hết lượt, mọi địch bị Cô Lập | Lượt đi săn cả bàn |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** đội đứng kín năm đường, Janna (Q huỷ đòn đánh) · **Combo với:** Darius, Jinx (hạ một con là hai con bên cạnh lẻ ra), Leona (con mồi bị Choáng không trả được).

**Tự kiểm:** R áp chính điều kiện Cô Lập lên mọi địch: có. Q (sát thương) và E (tạo điều kiện) khác việc. Không có R: E + Q, hoặc Q lên con lẻ tự nhiên; đủ chất. Không chiêu nửa vời. Bỏ Tàng Hình (không thuộc chất săn mồi).

### Qiyana
**Chất:** "Đặc Quyền của Nữ Hoàng": mỗi địch chỉ cần một nhát, và nhát đầu luôn đau gấp đôi.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lượt, lần đầu Qiyana gây sát thương lên một địch (đòn đánh hoặc chiêu) thì ×2; địch đã ăn nhát đầu mất **Đặc Quyền** tới lượt sau | Rải đòn ra cả bàn, ngược với Zed/Darius dồn một con |
| Q | - | Sát thương lớn 1 địch | Ném vào con còn Đặc Quyền |
| E | - | Mọi địch có lại Đặc Quyền | Đánh xong một vòng thì làm lại vòng hai |
| R | - | Sát thương mọi địch | Mọi địch còn Đặc Quyền ăn ×2 cùng lúc |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Renata (E phản sát thương mỗi lần bị đánh, Qiyana đánh lan nhiều thì bị phản nhiều), Janna (R −50%) · **Combo với:** Brand (cùng rải lên mọi địch), Jinx (cả đội địch tụt dưới 50% máu, Jinx tích Điên mỗi phát).

**Tự kiểm:** R lấy Đặc Quyền trên mọi địch một lần: có. Q (tiêu) và E (nạp lại) là hai chiều ngược nhau, không trùng. Không có R: 3 đòn Đánh Thường + Q lên các địch khác nhau đều ×2, E mở vòng hai; đủ chất. Không chiêu nửa vời. Không đụng vào Choáng nên khác hẳn Leona; khác Kha'Zix (vị trí) và Katarina (hạ gục trả lá).

---


---

## E. Pháp sư

### Ahri
**Chất:** "Say Mê": hồ ly làm địch mê mẩn không ra tay, Mê càng sâu chiêu càng đau.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Địch còn Say Mê (cộng dồn) thì không đánh được; cuối mỗi lượt của nó mất 1 Say Mê | Mỗi Say Mê = 1 lượt địch không đánh |
| Q | - | 20 | 1 địch +2 Say Mê | Khoá xạ thủ/đấu sĩ địch |
| E | - | 25 | Sát thương phép 1 địch, mỗi Say Mê trên nó +50% | Không tiêu Say Mê: vừa khoá vừa đánh |
| R | - | 50 | Mọi địch +2 Say Mê | Cả đội địch 2 lượt không đánh được |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Janna (Khiên miễn khống chế), Brand, Lux (sống bằng chiêu, Say Mê vô dụng) · **Combo với:** Darius, Zed (dồn kẻ đứng im không đánh trả được).

**Tự kiểm:** R = Q lên mọi địch, đúng đỉnh của Say Mê. Q nạp, E tiêu, không trùng việc. Không R vẫn chạy (Q khoá, E đánh). Không chiêu nửa vời: Q thuần hiệu ứng, E thuần sát thương.

### Annie
**Chất:** "Đếm đến Tibbers": mỗi phép là một que diêm, đủ 5 Lửa là gấu dậy vồ cả đội địch.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Annie có Lửa; đủ 5 Lửa thì Tibbers hiện ra vồ mọi địch (sát thương lớn) rồi biến mất, Lửa về 0 | Tibbers là cú nổ, không chiếm ô |
| Q | - | 10 | Sát thương phép 1 địch, +1 Lửa | Rẻ để spam |
| E | - | 20 | +2 Lửa | Đẩy nhanh lượt gấu dậy |
| R | - | 40 | Tibbers dậy ngay: vồ mọi địch, sát thương ×(1 + Lửa đang có); Lửa về 0 | Dùng lúc 4 Lửa là gấp 5 |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp Q/E, Lửa đứng yên), Zed (dồn chết Annie trước khi đủ 5) · **Combo với:** Jinx (Tibbers hạ máu cả đội, Jinx nhặt), Brand (cùng đốt diện rộng).

**Tự kiểm:** R là cú vồ của nội tại, đẩy lên theo Lửa. Q (sát thương + Lửa như Brand Q) và E (Lửa thuần) khác nấc. Không R vẫn đủ 5 Lửa bằng Q/E. Tibbers không chiếm ô, không phải quản lý thêm đơn vị.

### Lissandra
**Chất:** "Hoá Băng bài địch": lá trên tay đối thủ đóng thành băng, rồi đập vỡ.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Lá Hoá Băng trên tay đối thủ không dùng được (vẫn chiếm chỗ); băng tan khi Lissandra rời sân | Muốn tan băng thì phải hạ Lissandra |
| Q | Có | 20 | Hoá Băng 2 lá ngẫu nhiên trên tay đối thủ | Dùng trong lượt địch, ngay lúc họ cần bài |
| E | - | 30 | Sát thương phép 1 địch, mỗi lá Hoá Băng trên tay đối thủ +X | Băng càng dày càng đau |
| R | - | 50 | Đập vỡ: Đốt mọi lá Hoá Băng, mỗi lá gây sát thương lên mọi địch | Xả hết băng; đổi lại tay địch được giải phóng |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Darius, Garen (đấu sĩ đánh không cần lá), Zed (hạ Lissandra là tan băng) · **Combo với:** Blitzcrank (cùng bóp tay địch; R Blitz lộ tay), Teemo (tay kẹt băng thì ép rút là đốt lá thừa).

**Tự kiểm:** R xả toàn bộ Hoá Băng, đúng đỉnh. Q nạp, E tiêu theo số, R xả hết: 3 nấc khác nhau. Không R vẫn khoá bài và gây sát thương. Không dùng Đóng Băng/Buốt của Ashe; băng ở trên lá bài, không ở trên tướng.

### Lux
**Chất:** "Càng nhiều mana càng mạnh": mana là sức mạnh ở mọi lá, không phụ thuộc bốc được R.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Càng nhiều mana càng cộng thêm AP | Giữ mana là mạnh |
| Q | - | 0 | Hồi mana | Nạp năng lượng |
| E | - | 30 | Gây sát thương theo số mana đang có | Đòn chính, vẫn giữ được mana |
| R | - | Toàn bộ | Tiêu hết mana để gây sát thương | Xả một phát cực lớn, sau đó Lux tụt yếu |

**Khắc chế bởi:** Zed (dồn chết sớm), Blitzcrank (cướp Q/E trên tay) · **Combo với:** Janna (bảo kê Lux sống lâu để giữ mana).

### Twisted Fate
**Chất:** "Tay bài là đạn": TF rút nhiều, giữ dày, rồi ném cả tay.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | TF trên sân: lượt rút của bạn rút 3 lá thay vì 2 | Tay luôn dày |
| Q | - | 15 | Chọn Bài: xem 3 lá trên cùng bộ bài, lấy 2 lên tay, lá còn lại xuống đáy | Nạp tay, chọn đúng lá |
| E | - | 25 | Sát thương phép 1 địch, mỗi lá trên tay bạn +X | Lá chết trên tay cũng thành sát thương |
| R | - | 45 | Ném hết bài: bỏ mọi lá trên tay vào mộ, mỗi lá gây sát thương lên mọi địch | Xả cả tay một lần |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp bài làm mỏng tay), Teemo (rút nhiều thì dính Nấm nhiều) · **Combo với:** Yorick (R ném cả tay vào mộ, Yorick to vọt).

**Tự kiểm:** R tiêu toàn bộ tay, đúng đỉnh của "tay bài". Nội tại và Q cùng nạp tay nhưng khác cách (tự động mỗi lượt / chủ động có chọn lọc), giống Kog nội tại + Q. Không R vẫn chạy: rút, giữ, E. Rủi ro tự cạn bộ bài là cái giá của lối chơi.

### Viktor
**Chất:** "Tiến Hoá": đổi bài thừa lấy sức mạnh vĩnh viễn.

| | Quick? | Mana | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|---|
| Nội tại | - | - | Tiến Hoá (vĩnh viễn, cộng dồn): mỗi nấc làm chiêu Viktor gây thêm sát thương | Không mất khi Viktor chết |
| Q | - | 10 | Bỏ tối đa 3 lá trên tay; mỗi lá +1 Tiến Hoá | Biến lá chết thành sức mạnh |
| E | - | 35 | Sát thương phép mọi địch | Đòn chính, lớn theo Tiến Hoá |
| R | - | 60 | Nhân đôi Tiến Hoá | Tiến Hoá Vinh Quang |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Blitzcrank (cướp bài trước khi kịp bỏ), Zed (dồn chết Viktor khi E còn yếu) · **Combo với:** Yorick (Q bỏ bài vào mộ), Twisted Fate (rút 3 lá mỗi lượt, có bài để bỏ).

**Tự kiểm:** R nhân đôi chính Tiến Hoá. Q nạp, E dùng, R nhân: không trùng. Không R vẫn chạy bằng Q + E. Khác Lux (mana) và Yorick (đếm mộ): Viktor đếm lá chính tay mình bỏ. Cần trần Tiến Hoá.

---


---

## F. Xạ thủ

### Ashe
**Chất:** "Chồng Buốt": xạ thủ hướng hỗ trợ, địch yếu dần, Buốt càng dày Ashe càng đau.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đòn đánh của Ashe gắn Buốt (cộng dồn); Buốt giảm mạnh tốc đánh và sức mạnh của địch | Bắn đều là chồng đều |
| Q | - | Gắn 3 Buốt lên 1 địch | Chồng nhanh không cần đánh |
| E | - | Lượt này mỗi đòn đánh của Ashe tăng sát thương và gắn 2 Buốt | Lượt bắn đau, chồng gấp đôi |
| R | - | Đóng băng mọi địch đang có Buốt và gây sát thương theo số Buốt | Thu hoạch toàn bộ Buốt |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand, Lux (sát thương bằng chiêu, Buốt không giảm được), Blitzcrank (cướp Q/E) · **Combo với:** Darius, Jinx (đánh vào địch đã yếu vì Buốt).

### Jinx
**Chất:** "Nhặt mạng, càng nhặt càng Điên": xạ thủ cơ hội, gọi ra đúng lúc địch yếu.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đánh trúng địch dưới 50% máu: +1 Điên; hạ gục: +10 Điên. Mỗi Điên làm đòn đánh của Jinx đau hơn | Săn đứa yếu để tích Điên |
| Q | - | Bắn thốn: 1 phát sát thương lớn vào 1 địch | Đẩy máu xuống thấp hoặc nhặt mạng |
| E | Có | Bẫy: địch được gọi ra sân đối diện Jinx thì Choáng 1 lượt | Phạt việc gọi tướng |
| R | - | Tên lửa: địch dưới ngưỡng máu thì chết luôn (ngưỡng tăng theo Điên); không đủ ngưỡng thì gây sát thương lớn | Kết liễu |

Bộ: Q ×4 · E ×4 · R ×1. Giữ bài chờ đồng đội làm địch tụt máu rồi mới gọi Jinx. **Khắc chế bởi:** Soraka, Janna (giữ máu đồng minh cao), Renata (hồi sinh làm hụt hạ gục) · **Combo với:** Brand (Bỏng làm cả đội tụt máu), Darius (xay một thằng xuống máu thấp).

### Kog'Maw
**Chất:** "Đói": trận càng dài, sống càng dai càng mạnh; bắn theo % máu tối đa, tank càng trâu càng lủng.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lượt Kog còn sống +1 Đói; có tướng chết (bất kỳ phe) +1 Đói. Đòn đánh của Kog gây thêm % máu tối đa theo Đói. Kog chết thì mất nửa Đói | Sống dai là mạnh |
| Q | - | +3 Đói | Nuôi nhanh |
| E | - | Lượt này mỗi đòn đánh của Kog x2 % máu tối đa | Lượt xả |
| R | - | Bắn mọi địch, gây % máu tối đa theo Đói | Thu hoạch Đói |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Zed (dồn chết sớm), Jinx (nhặt mạng lúc Kog còn yếu) · **Combo với:** Soraka, Janna (giữ Kog sống lâu).

### Teemo
**Chất:** "Nấm trong bộ bài địch": địch rút trúng là nổ vào đứa yếu nhất.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi đòn đánh của Teemo xáo 1 Nấm vào bộ bài địch; địch rút trúng Nấm thì Nấm nổ lên tướng máu thấp nhất bên đó (thay cho lá rút) | Bắn đều là gài đều; Nấm tự săn đứa yếu |
| Q | - | Xáo 3 Nấm vào bộ bài địch | Gài nhanh không cần đánh |
| E | - | Bắn 1 địch (kể cả ô phụ), mỗi Nấm đang nằm trong bộ địch +X sát thương | Nhặt mạng khi bộ địch đã đầy Nấm |
| R | - | Nấm Độc: gây sát thương mọi địch theo số Nấm đang trong bộ bài địch (Nấm vẫn ở nguyên) | Phá bài càng dày R càng đau, không tự gỡ bẫy |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Soraka (Nấm nhắm đứa máu thấp, Soraka chịu thay), Renata (hồi sinh làm hụt mạng) · **Combo với:** Brand (Bỏng hạ máu cả đội, Nấm kết liễu), Blitzcrank (địch mất bài phải sống bằng lượt rút).

**Tự kiểm:** R nổ hết Nấm, đúng đỉnh. Nội tại và Q cùng gài Nấm nhưng khác nấc (theo đòn / 3 phát thẳng), như Ashe. E tiêu theo số Nấm mà không làm mất Nấm. Không R vẫn chạy. Chất xạ thủ cơ hội: Nấm và E đều săn kẻ yếu, E bắn được ô phụ.

### Vayne
**Chất:** "Thợ săn bóng đêm": càng ở lâu trong bóng tối, ra tay càng chí mạng.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lượt của bạn Vayne không trên sân (chưa gọi/chờ hồi sinh): +2 Đêm (tối đa 10). Mỗi đòn đánh của Vayne tiêu 1 Đêm, gây thêm sát thương chuẩn lớn | Giữ Vayne trên tay, gọi ra đúng lúc |
| Q | Có | Vayne Tàng Hình đến hết lượt địch, +2 Đêm | Lùi vào bóng tối để nạp |
| E | - | Lượt này mỗi đòn đánh của Vayne tiêu 2 Đêm, phần sát thương thêm gấp đôi | Lượt xả nhanh |
| R | - | Đòn đánh kế của Vayne tiêu hết Đêm vào một phát | Một phát hạ bất kỳ ai |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Brand (E rải mọi địch vẫn trúng Vayne Tàng Hình), Ashe (Buốt làm đòn yếu) · **Combo với:** Janna, Renata (giữ Vayne sống để xả hết Đêm).

**Tự kiểm:** R xả toàn bộ Đêm, đúng đỉnh. Q nạp (phòng thủ, Quick), E xả nhanh trên 3 đòn, R dồn hết vào 1 đòn: cùng cơ chế, ba nấc khác nhau. Không R vẫn chạy: nạp ngoài sân rồi bắn. Chết không mất trắng: chờ hồi sinh lại nạp Đêm. Không có đòn đánh thêm.

---


---

## G. Trợ thủ

### Nami
**Chất:** "Đồng đội đánh là rút bài": trợ thủ nuôi tay bài cho cả đội.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Mỗi lượt, đòn đánh đầu tiên của mỗi đồng minh trúng địch: bạn rút 1 lá | Cả đội đánh là có bài |
| Q | - | Rút 2 lá | Rút thẳng |
| E | - | 1 đồng minh: lượt này mỗi đòn đánh của nó trúng địch thì rút 1 lá | Lượt rút dồn |
| R | - | Sóng bài: rút tới khi tay đủ 5 lá | Hồi tay khi cạn bài |

Bộ: Q ×4 · E ×4 · R ×1 (Q + E vào tay khi ra sân). Cái giá: rút nhiều thì bộ bài cạn nhanh, tay đầy thì bị đốt bài. **Khắc chế bởi:** Blitzcrank (cướp bài vừa rút), Teemo (rút nhiều dễ trúng Nấm) · **Combo với:** Darius, Garen (đánh đều mỗi lượt), Twisted Fate (tay bài là đạn).

### Soraka
**Chất:** "Máu của Soraka là máu của cả đội."

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đồng minh nhận đòn chí mạng thì Soraka chịu thay bằng máu của mình; Soraka còn máu thì không ai chết | Máu Soraka là kho chung |
| Q | - | Soraka tự hồi máu lớn | Nạp lại kho |
| E | Có | Khi địch tung chiêu vào đồng minh: huỷ chiêu đó | Chặn chiêu, không cho kho máu bị rút |
| R | - | Hồi máu lớn cả đội, kể cả Soraka | Lật kèo giao tranh lớn |

Bộ: Q ×4 · E ×4 · R ×1 (Q + E vào tay khi ra sân). **Khắc chế bởi:** Zed (dồn chết Soraka trước), Thiêu Đốt (vết thương sâu), Blitzcrank (cướp Q/E) · **Combo với:** Aatrox, Darius (đứng xay lâu mà không chết).

---

## Cặp combo & khắc chế đáng chú ý
- **Leona / Lissandra / Ahri → Qiyana:** khống chế rồi Qiyana R xoá sổ. Khắc chế: Janna E/miễn khống chế.
- **Leona → Zed:** Choáng để Zed dồn trọn lượt rồi R kích nổ.
- **Renata + Malphite:** Giáp từ Renata Q nạp thẳng vào Q/R Malphite.
- **Blitzcrank + Teemo:** phá tay địch và gài Nấm vào bộ, địch vừa mất bài vừa rút trúng bom.
- **Nami + Vayne / Jinx:** 3 đòn được Nami cường hoá, đủ để Vayne lên đòn thứ 3 hoặc Jinx tích Điên nhanh.
- **Kog'Maw + Janna / Soraka:** giữ Kog sống thật lâu là thắng về cuối trận. Khắc chế: Zed/Kha'Zix dồn sớm.
- **Brand + Katarina:** Bỏng hạ máu cả đội, Kat R dọn rồi nối chuỗi.
- **Yorick + Katarina:** mỗi mạng bị hạ (của bất kỳ phe nào) đều thêm Ma Sương.
- **Twisted Fate vs Teemo:** TF E đẩy Nấm xuống đáy, R bỏ lá Quick của đối thủ.
- **Renata vs Katarina / Jinx / Zed:** hồi sinh phá các lối chơi "hạ được thì...".
- **Blitzcrank vs đội giữ bài (Lux nhịn mana, Gangplank giữ Q):** R soi tay rồi Q cướp đúng lá.
- **Ornn + Vayne / Jinx:** Kiệt Tác trên Xạ thủ, R Ornn nổ theo số món đồ.

## Rủi ro cân bằng
- **Hiệu ứng vĩnh viễn:** Bỏng của Brand (không hết, R nhân đôi), Dồn của Zed (ở lại đến khi bị R), Đói của Kog'Maw, Nâng của Viktor, Kiệt Tác của Ornn. Cần trần hoặc cách xoá (ví dụ Bỏng tối đa X stack, Đói tối đa Y).
- **Dồn sát thương trong 3 đòn:** trần cứng 3 đòn/lượt đã chốt, nhưng Nami E + R lên Vayne có thể dồn quá nhiều sát thương vào 3 đòn; Điên của Jinx không giới hạn có thể làm R giết cả tướng đầy máu. Theo dõi khi chạy 1000 trận.
- **Choáng mọi địch:** Leona R, Lissandra R (Đóng Băng). Hai cái liên tiếp có thể khoá cả đội địch 2 lượt. Đề xuất: tướng vừa hết Choáng được miễn Choáng 1 lượt. Braum R cũng gần như cấm đánh Braum cả lượt.
- **Malphite:** Giáp tích từ nội tại × E nhân đôi, rồi R ra sát thương diện rộng. Cần trần Giáp.
- **Vòng lặp hồi lá:** Katarina (nội tại + R), Qiyana Q quay lại tay, Darius R dùng lại. Cần giới hạn số lần/lượt.
- **Blitzcrank cướp bài:** R Choáng mọi tướng có chiêu trên tay địch có thể khoá cả đội nếu địch giữ nhiều chiêu. Theo dõi tỉ lệ thắng, cân nhắc giới hạn số tướng bị Choáng.
- **Lux giữ mana:** AP theo mana cộng E theo mana có thể quá mạnh khi mana đầy; cần trần mana và theo dõi.
- **Teemo R + tay 10:** ép rút có thể đốt lá quan trọng của đối thủ. Mạnh, nhưng cũng là phản đòn tự nhiên với đội cầm bài nhiều.
- **Lissandra R tự bất tử (Quick):** cộng với hồi sinh của Renata, có thể quá khó hạ. Nên giới hạn 1 lần/trận.
- **Garen nội tại −50%:** gần như bất tử với Xạ thủ/Pháp sư đường khác. Theo dõi kỹ.
- **Zed R chết ngay:** ngưỡng chết theo Dồn cần chỉnh để không xoá Đỡ đòn quá dễ.

### Rủi ro bổ sung (17 tướng làm lại)
- **Aatrox:** Q liên tục rồi R có thể ra một nhát cực lớn; cần trần sát thương R hoặc giữ hệ số 2.
- **Gangplank:** 3 Thùng thật + Q + E + R có thể xoá cả bàn trong 1 lượt; theo dõi số Thuốc Súng trung bình lúc nổ.
- **Braum:** Vững tối đa + E gần như miễn sát thương đòn đánh; đã đặt trần 80%.
- **Leona:** R +2 Nắng sau một lượt đánh rải có thể Choáng gần cả đội (cùng rủi ro Choáng mọi địch đã ghi).
- **Malphite:** E rút bài là lợi thế lá; cần theo dõi tỉ lệ thua do cạn bộ và sức mạnh R khi tay đầy 10.
- **Ornn:** Rèn vĩnh viễn và R nhân đôi; đã đặt trần 10 Rèn mỗi tướng.
- **Katarina:** R cũng theo nội tại (hạ gục thì về tay); nếu vòng lặp quá mạnh, thêm "R tối đa 1 lần/lượt".
- **Qiyana:** 3 đòn Sát thủ 350% ×2 lên 3 địch mỗi lượt không cần chiêu; có thể phải giảm hệ số xuống ×1.5.
