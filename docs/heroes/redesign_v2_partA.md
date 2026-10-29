# StarCi League: Thiết kế lại V2, phần A (9 tướng)

> Bản giấy, chờ chủ duyệt rồi gộp vào `REDESIGN_V2.md`. Số liệu chỉ là gợi ý, chỉnh bằng mô phỏng.
> Tướng: Aatrox, Gangplank (Đấu sĩ) · Braum, Leona, Malphite, Ornn (Đỡ đòn) · Katarina, Kha'Zix, Qiyana (Sát thủ).
> Từ khoá mới (mỗi cái chỉ thuộc một tướng): **Thuốc Súng** (Gangplank), **Vững** (Braum), **Nắng** (Leona), **Rèn** (Ornn), **Cô Lập** (Kha'Zix), **Đặc Quyền** (Qiyana). Aatrox dùng máu đã mất, Malphite dùng số lá trên tay, Katarina dùng mộ: không thêm stack.

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

### Gangplank
**Chất:** "Gài thùng, nuôi thùng, châm đúng lúc": địch phải đoán thùng thật hay giả trước khi nó to.

| | Quick? | Tác dụng | Điều kiện/ý đồ |
|---|---|---|---|
| Nội tại | - | Đầu lượt GP: đặt 1 **Thùng** úp vào ô phụ (thật hoặc giả, GP chọn). Thùng thật +1 Thuốc Súng mỗi lượt GP, nằm quá 3 lượt thì mất. Chỉ Xạ thủ đánh được Thùng. Trong lượt GP, đòn đánh của GP có thể nhắm Thùng thật của mình: Thùng nổ, mọi địch nhận sát thương theo Thuốc Súng | Lõi thùng đã duyệt. Nút 66% không cần lá nên GP luôn có ngòi nổ; mỗi lần nổ tốn 1 trong 3 đòn |
| Q | - | Mọi Thùng thật +2 Thuốc Súng | Nuôi nhanh. Địch thấy GP đánh Q nhưng không biết thùng nào thật |
| E | - | Lượt này Thùng nổ gây sát thương ×2 | Lượt châm ngòi lớn |
| R | - | Kích nổ mọi Thùng thật cùng lúc, không tốn đòn đánh | Xả cả kho thùng, không bị giới hạn 3 đòn |

Bộ: Q ×4 · E ×4 · R ×1. **Khắc chế bởi:** Jinx, Kog'Maw, Ashe (Xạ thủ bắn vỡ Thùng), Blitzcrank (cướp Q/E) · **Combo với:** Brand (hai nguồn sát thương lên mọi địch), Jinx (Thùng kéo cả đội địch xuống dưới 50% máu cho Jinx tích Điên).

**Tự kiểm:** R là đỉnh của Thùng (nổ hết một lúc, không tốn đòn): có. Q (+Thuốc Súng) và E (×2 lúc nổ) là hai nấc khác nhau, không trùng; nội tại tự đặt thùng nên không chiêu nào làm lại việc đặt. Không có R: nội tại đặt thùng, nút 66% châm nổ, Q nuôi, E nhân; mỗi lá Q/E đứng được một mình vì nội tại đã có cả thùng lẫn ngòi. Không chiêu nửa vời. Thùng giả giữ đúng vai mồi lừa Xạ thủ địch phí đòn.

---

## C. Đỡ đòn

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

## Rủi ro cân bằng (phần A)
- **Aatrox:** Q liên tục rồi R có thể ra một nhát cực lớn; cần trần sát thương R hoặc giữ hệ số 2.
- **Gangplank:** 3 Thùng thật + Q + E + R có thể xoá cả bàn trong 1 lượt; theo dõi số Thuốc Súng trung bình lúc nổ.
- **Braum:** Vững tối đa + E gần như miễn sát thương đòn đánh; đã đặt trần 80%.
- **Leona:** R +2 Nắng sau một lượt đánh rải có thể Choáng gần cả đội (cùng rủi ro Choáng mọi địch đã ghi).
- **Malphite:** E rút bài là lợi thế lá; cần theo dõi tỉ lệ thua do cạn bộ và sức mạnh R khi tay đầy 10.
- **Ornn:** Rèn vĩnh viễn và R nhân đôi; đã đặt trần 10 Rèn mỗi tướng.
- **Katarina:** R cũng theo nội tại (hạ gục thì về tay); nếu vòng lặp quá mạnh, thêm "R tối đa 1 lần/lượt".
- **Qiyana:** 3 đòn Sát thủ 350% ×2 lên 3 địch mỗi lượt không cần chiêu; có thể phải giảm hệ số xuống ×1.5.
