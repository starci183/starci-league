# Hướng dẫn 6 tướng: concept, scale chiêu, lối chơi

Bản để thầy duyệt (16/11/2026). Số lấy thẳng từ `packages/shared/src/cardgame/balance/heroes/<id>.json`. Cột "Scale" ghi chiêu tăng theo chỉ số nào. "Máu tối đa" là của chính tướng, trừ khi ghi "mục tiêu". Chưa chạy cân bằng; sửa dần sau.

---

## 1. Garen: Đấu sĩ trơn, vua tay đôi

**Concept.** Chiến binh không cần trang bị. Mạnh nhất lúc đầu trận khi hai bên đấu 1v1, càng ít địch trên sân thì chém càng đau. Cả 3 chiêu đều 0 mana.

Chỉ số gốc: 450 Máu, 71 Công, 33 Giáp, 31 Kháng phép. Giới hạn mỗi lượt: Q 2, E 1, R 1.

| Chiêu | Tham số | Scale |
|---|---|---|
| **P Kiên Cường** | p1 = 3% Máu tối đa; p2 = +2% mỗi ô đồ trống; p3 = Q và E +3% sát thương mỗi đường địch trống | Số ô đồ trống, số đường địch trống |
| **Q Đòn Quyết Định** (0 mana) | q1 = 25 · q2 = 100% Công · q3 = 6% Máu tối đa · q4 = Câm Lặng 1 đơn vị | Công + Máu |
| **E Phán Xét** (0 mana, Quick khi bị nhắm) | e1 = 15 · e2 = 80% Công · e3 = 5% Máu tối đa · e4 = 2 đường kề nhận 30% · e5 = hồi 40% tổng sát thương | Công + Máu |
| **R Công Lý Demacia** (0 mana, sát thương chuẩn) | r1 = 60 · r2 = 12% Máu tối đa mục tiêu · r3 = +100% khi mục tiêu cùng đường | Máu mục tiêu |

**Lối chơi.**
- Ra sân ở đường mở đầu tiên để thắng tay đôi.
- Không đeo đồ: nhường suất đồ cho chủ lực.
- Giữ E để phản ứng khi bị nhắm. Dùng R lên tướng đỡ đòn đứng cùng đường.

**Lên đồ.** Mặc định không lên đồ. Nếu buộc phải lên một món thì chọn món cho cả Công và Máu: Móng Vuốt Sterak.

**Mạnh.** Đầu trận; không tốn mana; R hạ tướng nhiều Máu.

**Yếu.** Bị Choáng; bị đổi chỗ khỏi đường; giảm hồi máu; địch lấp đủ 5 đường.

---

## 2. Darius: Càng chém càng thốn

**Concept.** Đao phủ Noxus. Mỗi đòn cắm thêm Chảy Máu và đòn sau đau hơn đòn trước. E kéo con mồi về rồi Giữ Chân. R kết liễu kẻ thấp Máu; hạ được thì về tay, trượt thì nằm trong 5 lá trên cùng bộ bài để rút lại. Cả 3 chiêu 0 mana.

Chỉ số gốc: 430 Máu, 74 Công, 31 Giáp, 29 Kháng phép. Giới hạn mỗi lượt: Q 2, E 1, R 2.

| Chiêu | Tham số | Scale |
|---|---|---|
| **P Xuất Huyết** | Mỗi đòn trúng +1 Chảy Máu; mỗi tầng gây p1 = 4 + p2 = 6% Công đầu lượt; hết sau p3 = 2 đơn vị; đánh thường +p4 = 3 mỗi tầng | Công, số tầng |
| **Q Tàn Sát** (0 mana) | q1 = 30 · q2 = 100% Công · q3 = 4% Máu tối đa · q6 = +6 mỗi tầng · gắn q4 = 2 tầng · hồi q5 = 4 mỗi tầng | Công + Máu + tầng |
| **E Bắt Giữ** (0 mana) | Kéo về đối diện; e1 = 20 · e2 = 70% Công · e4 = +5 mỗi tầng · Giữ Chân e3 = 1 đơn vị | Công + tầng |
| **R Máy Chém Noxus** (0 mana, sát thương chuẩn) | (r1 = 40 + r2 = 80% Công + r3 = 6% Máu tối đa + r5 = 15 mỗi tầng) × (1 + r4 = 0,8 × % Máu đã mất mục tiêu); trượt thì vào r6 = 5 lá trên cùng bộ bài | Công + Máu + tầng + Máu đã mất mục tiêu |

**Giữ Chân** (trạng thái mới): không đổi đường, không bị kéo hay bị đổi chỗ; vẫn đánh và dùng chiêu được.

**Lối chơi.** Đánh thường và Q dồn dấu lên một mục tiêu, E kéo con mồi yếu về rồi Giữ Chân, R kết liễu khi nó thấp Máu.

**Lên đồ.** Ưu tiên Công: Kiếm Tử Thần. Công kèm Máu: Móng Vuốt Sterak. Đánh thường nhiều để cộng dồn: Cuồng Đao Guinsoo.

**Mạnh.** Giao tranh kéo dài; R dây chuyền; không tốn mana.

**Yếu.** Cần vài đòn mới đủ dấu; hồi máu và Khiên của địch làm phí dấu.

---

## 3. Aatrox: Đổi máu lấy máu

**Concept.** Kẻ Diệt Thế trả Máu cho mọi đòn. Máu càng thấp Công càng cao và hút lại càng nhiều, nên Aatrox tự đứng vững ở vùng Máu thấp. E tạo Khiên, R hoá quỷ tăng mạnh Công và hồi sinh một lần. Chiêu không tốn mana.

Chỉ số gốc: 420 Máu, 74 Công, 30 Giáp, 29 Kháng phép. Giới hạn mỗi lượt: Q 2, E 1, R 1.

| Chiêu | Tham số | Scale |
|---|---|---|
| **P Cái Giá Bằng Máu** | Công thêm p1 = 100% Công gốc × tỉ lệ Máu đã mất; đánh thường trả p2 = 10% Máu hiện tại, hút p3 = 10% → p4 = 100% sát thương theo Máu đã mất | Máu đã mất |
| **Q Lưỡi Gươm Darkin** (0 mana) | Trả q1 = 20% Máu hiện tại; đối diện nhận q2 = 20 + q3 = 90% Công + q4 = 8% Máu tối đa; hút như nội tại | Công + Máu |
| **E Huyết Thuẫn** (0 mana, Quick khi bị nhắm) | Trả e5 = 20% Máu hiện tại; đối diện nhận e1 = 30 + e2 = 100% Công + e3 = 5% Máu tối đa; Khiên e4 = 50% sát thương | Công + Máu |
| **R Kẻ Diệt Thế** (0 mana) | Trả r5 = 50% Máu hiện tại; hoá quỷ r1 = 2 đơn vị +r2 = 50% Công; lần đầu về 0 Máu hồi sinh với r4 = 30% | Công |

**Lối chơi.** Dùng Q, đánh thường để tự hạ Máu xuống vùng thấp: Công tăng, hút máu tăng, đòn nào cũng hồi lại phần lớn. E làm Khiên khi bị dồn. R lúc đã thấp Máu để Công cao nhất và có mạng phụ.

**Lên đồ.** Công: Kiếm Tử Thần. Công kèm Máu: Móng Vuốt Sterak.

**Mạnh.** Giao tranh kéo dài; tự hồi; khó chết khi có R.

**Yếu.** Bị dồn sát thương lớn một lúc; giảm hồi máu.

---

## 4. Yorick: Người Đào Mộ, đốt bài để mạnh lên

**Concept.** Đấu sĩ thuần, chỉ chạm tướng đối diện, không triệu hồi. Mỗi lá Yorick đốt khỏi bộ bài đối thủ thành 1 Hồn, làm Yorick to dần. Hai đường thắng: đối thủ cạn bộ bài (luật engine), hoặc nuôi Hồn rồi R chém kết liễu. Cả 3 chiêu 0 mana.

Chỉ số gốc: 380 Máu, 64 Công, 31 Giáp, 30 Kháng phép. Giới hạn mỗi lượt: Q 2, E 1, R 1.

| Chiêu | Tham số | Scale |
|---|---|---|
| **P Người Đào Mộ** | Đòn trúng đối diện đốt p1 = 1 lá. Mỗi lá Yorick đốt = 1 Hồn, lá chiêu thêm p5 = 1. Mỗi Hồn +p2 = 2 Công, +p3 = 10 Máu tối đa. Mốc p6 = 25 Hồn (25/50/75, tối đa p7 = 3 mốc) mỗi mốc tạo 1 lá R, chỉ một lần. Chết mất nửa Hồn | Số Hồn |
| **Q Nghi Thức Cuối** | Đối diện nhận q1 = 20 + q2 = 80% Công + q3 = 5% Máu tối đa vật lý; đốt q4 = 1 lá; hồi q5 = 15 Máu mỗi Hồn nhận được | Công, Máu |
| **E Sương Sầu** (Quick khi bị nhắm) | Đối diện nhận e1 = 25 + e2 = 60% Công + e3 = 4% Máu tối đa vật lý, Rã Giáp e5 = 2 đơn vị; đốt e4 = 2 lá; Khiên e6 = 20 mỗi lá đốt | Công, Máu |
| **R Khúc Ai Ca** | Đốt r1 = 3 lá, rồi đối diện nhận r2 = 40 + r3 = 80% Công + r4 = 5% Máu tối đa vật lý, cộng r5 = 4 sát thương chuẩn mỗi Hồn | Công, Máu, Hồn |

**Lối chơi.** Đầu trận đánh thường và Q để tích Hồn. Bị nhắm thì nối E Quick: vừa đỡ bằng Khiên vừa đốt 2 lá. Cuối trận R với 20–30 Hồn chém rất đau, hoặc tiếp tục ép đối thủ cạn bài.

**Lên đồ.** Công kèm Máu; đồ tăng số đòn để đốt nhiều lá hơn.

**Mạnh.** Trận dài; càng đánh càng to; hai đường thắng.

**Yếu.** Chỉ đánh đối diện; đầu trận yếu; chết mất nửa Hồn.

---

## 5. Braum: Khiên của đồng đội

**Concept.** Mở giao tranh bằng Dấu Băng, đỡ đòn thay đồng đội, càng bị đánh càng cứng, rồi khoá cả hàng địch.

Chỉ số gốc: 485 Máu, 64 Công, 35 Giáp, 34 Kháng phép. Giới hạn mỗi lượt: Q 2, E 1, R 1.

| Chiêu | Tham số | Scale |
|---|---|---|
| **P Song Giáp** | Mỗi đòn địch trúng +p1 = 1 tầng; mỗi tầng +p2 = 1,5 Giáp và Kháng phép; Dấu Băng Choáng p3 = 1 + p4 = 0,3% Giáp đơn vị | Số lần bị đánh |
| **Q Cú Đấm Băng** (25 mana) | q1 = 60 + q2 = 10% Máu tối đa sát thương phép; Dấu Băng q3 = 2 đơn vị | Máu |
| **E Đứng Sau Tôi** (25 mana, Quick, chỉ nối chuỗi) | Đỡ thay, chịu e5 = 60% sát thương; Khiên e1 = 40 + e2 = 6% Máu tối đa + e3 = 50% Giáp; +e4 = 2 tầng | Máu + Giáp |
| **R Khe Băng** (55 mana) | Mọi địch r1 = 50 + r2 = 8% Máu tối đa; đối diện Choáng r3 = 1 + r4 = 0,4% Giáp, còn lại r5 = 0,4 + r6 = 0,3% Giáp | Máu + Giáp |

**Lối chơi.** Q gắn Dấu Băng để đồng đội đánh trúng gây Choáng. Giữ mana cho E khi chủ lực bị nhắm. R mở giao tranh lớn.

**Lên đồ.** Máu kèm Giáp: Áo Choàng Lửa. Giáp kèm Kháng phép: Thú Tượng Thạch Giáp. Máu: Giáp Máu Warmog.

**Mạnh.** Bảo kê chủ lực; khống chế diện rộng.

**Yếu.** Sát thương thấp; E chỉ dùng được khi nối chuỗi.

---

## 6. Blitzcrank: Người máy cướp bài

**Concept.** Thò tay vào bài địch, cướp lá chiêu giữa chuỗi và biến nó thành chiêu của đội mình.

Chỉ số gốc: 490 Máu, 64 Công, 34 Giáp, 33 Kháng phép. Giới hạn mỗi lượt: Q 1, E 1, R 1.

| Chiêu | Tham số | Scale |
|---|---|---|
| **P Thu Gom** | Mỗi lá cướp được +1 Phụ Tùng: +p1 = 2 Giáp và Kháng phép | Số lá cướp |
| **Q Bàn Tay Hoả Tiễn** (25 mana) | Cướp 1 lá; q1 = 50 + q2 = 50% Giáp + q3 = 50% Kháng phép sát thương phép; cướp đúng lá chiêu của mục tiêu thì kéo nó về đối diện | Giáp + Kháng phép |
| **E Tay Giật** (30 mana, Quick, chỉ nối chuỗi) | Cướp và Vô Hiệu lá chiêu địch; Choáng e1 = 1 + e2 = 0,06% Máu tối đa đơn vị | Máu |
| **R Trường Điện Từ** (60 mana) | Mọi địch r1 = 40 + r2 = 10% Máu tối đa; Câm Lặng r3 = 1 + r4 = 0,3% Kháng phép đơn vị; đối thủ bỏ r5 = 2 lá | Máu + Kháng phép |

**Lối chơi.** Giữ E để chặn chiêu lớn của địch (kể cả R). Q để lấy bài và kéo mục tiêu. R để phá tay bài địch trước lượt quan trọng.

**Lên đồ.** Giáp kèm Kháng phép: Thú Tượng Thạch Giáp. Máu kèm Kháng phép: Giáp Vai Nguyệt Thần. Máu: Giáp Máu Warmog.

**Mạnh.** Phá tay bài và chuỗi phản ứng của địch.

**Yếu.** Phụ thuộc bài trên tay đối thủ; sát thương thấp.
