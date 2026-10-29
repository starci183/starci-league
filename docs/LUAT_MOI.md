# StarCi League: luật mới "bản đồ chung" (bản nháp chờ thầy duyệt)

Ý tưởng: đánh theo lượt như game thẻ bài, nhưng bàn là **một bản đồ chung** như MOBA thật. Tướng vượt sông sang đánh nhau, tầm đánh tính theo ô, chiêu bắn theo hướng từ chỗ tướng đứng.
Những phần giữ nguyên: bộ bài (phép, bẫy, trang bị, cường hoá), mana người chơi, ghép đồ (đã bỏ chợ mua mảnh bằng vàng), cấm/chọn 5 tướng, đồ 33,3% chí mạng mỗi món, bộ chiêu và nội tại riêng của 20 tướng (viết lại phần chọn mục tiêu).

---

## 1. Bản đồ

```
                 đường 1   2     3     4     5
             | TRỤ   TRỤ   NHÀ   TRỤ   TRỤ |               ← nhà + trụ phe Đỏ
             | ô     ô     ô     ô     ô   |               hàng Đỏ 3 (hậu tuyến)
 Chim Đỏ  [] | ô     ô     ô     ô     ô   | [] Bùa Xanh   hàng Đỏ 2
             | ô     ô     ô     ô     ô   |               hàng Đỏ 1 (tiền tuyến)
 BARON    [] | sông  sông  sông  sông  sông|               hàng sông: ai cũng đi qua được
             | ô     ô     ô     ô     ô   |               hàng Xanh 1 (tiền tuyến)
 Bầy Sói  [] | ô     ô     ô     ô     ô   | [] Bùa Đỏ     hàng Xanh 2
             | ô     ô     ô     ô     ô   |               hàng Xanh 3 (hậu tuyến)
             | TRỤ   TRỤ   NHÀ   TRỤ   TRỤ |               ← nhà + trụ phe Xanh
```

- Lưới **5 đường × 7 hàng**: 3 hàng mỗi phe và 1 hàng sông. Toạ độ là chung cho mọi thứ: (đường, hàng 1–7).
- **Triệu hồi:** tướng chỉ ra sân ở 3 hàng bên mình, đường đang mở (đường vẫn mở dần theo số tướng như cũ).
- **Rừng chia hai bên tường** (cột ngoài đường 1 và ngoài đường 5). Tướng đứng ở đường biên, kề bãi quái **theo 4 hướng**, thì đánh được quái.
  - Tường trái: Chim Đỏ (phía Đỏ), **Baron ngang sông**, Bầy Sói (phía Xanh).
  - Tường phải: Bùa Xanh (phía Đỏ), Bùa Đỏ (phía Xanh).
  - Mỗi phe có một bãi nhỏ và một bùa ở gần mình. Hai bùa phải có giá trị ngang nhau.
  - Đánh Baron thì phải kéo đội sang đường 1. Bên tường phải không có boss nên đội kia có thể đẩy đường 5 để đổi lại.
- **Trụ** đứng ở đầu mỗi đường (4 trụ ở đường 1, 2, 4, 5, Nhà ở đường 3), là vật cản. Trụ tự bắn tướng địch đứng ở ô ngay trước nó.

## 2. Lượt chơi

Mỗi lượt, mỗi tướng được:
1. **Di chuyển** (xem mục 3),
2. **Đánh thường 1 lần** (theo tầm của vai),
3. **Tung chiêu** bao nhiêu cũng được nếu đủ mana và chiêu đã hồi.

Thứ tự trong lượt tuỳ ý: đi rồi đánh, hoặc đánh rồi đi.

## 3. Di chuyển

- Mỗi tướng **đi 1 ô mỗi lượt** theo 4 hướng (lên, xuống, trái, phải), không đi chéo. Không đi vào ô có người, trụ, quái hay Tường Băng. *(Tạm chốt theo đề xuất; thầy có thể đổi.)*
- **Tốc Biến** (thẻ bài): nhảy tới ô trống cách tối đa 2 ô theo bất kỳ hướng nào, bỏ qua vật cản, kèm Không Cản Phá 1 vòng.
- Chiêu có hiệu ứng "lướt" hoặc "đi thêm 1 ô" dùng chung luật này.
- Tướng **bị khiêu khích** (xem đỡ đòn) vẫn đi được, nhưng đòn đánh thường bị khoá vào kẻ khiêu khích.

## 4. Tầm đánh thường: chỉ 4 hướng thẳng, không chéo

Đánh thường với tới các ô **cùng hàng hoặc cùng đường** với tướng, trong số ô theo tầm. **Ô chéo không bao giờ bị đánh thường**: đứng chéo là góc chiến lược để né hoặc rình.

| Vai | Tầm | Ô đánh được |
|---|---|---|
| Đỡ đòn, Đấu sĩ, Sát thủ (**cận chiến**) | **1** | 4 ô kề: trên, dưới, trái, phải |
| Pháp sư, Trợ thủ (**tầm trung**) | **2** | tối đa 2 ô theo mỗi hướng (8 ô) |
| Xạ thủ (**đánh xa**) | **3** | tối đa 3 ô theo mỗi hướng (12 ô) |

```
 Xạ thủ (X), tầm 3:          Cận chiến (C), tầm 1:
 .  .  .  o  .  .  .          .  o  .
 .  .  .  o  .  .  .          o  C  o
 .  .  .  o  .  .  .          .  o  .
 o  o  o  X  o  o  o
 .  .  .  o  .  .  .         (ô chéo "." luôn an toàn trước đánh thường)
 .  .  .  o  .  .  .
 .  .  .  o  .  .  .
```

Có tướng khác đứng chắn giữa thì không bắn xuyên qua được: đánh thường trúng **tướng địch đầu tiên** trên đường bắn. Đồng minh không chắn đường.
Đánh trụ/Nhà: trụ nằm trong tầm theo 4 hướng. Muốn đánh Nhà thì phải phá ít nhất 1 trụ trước.

## 5. Chiêu: 4 kiểu chọn mục tiêu

| Kiểu | Cách chọn | Ví dụ |
|---|---|---|
| **Chọn tướng** | 1 tướng trong tầm chiêu (tính bằng ô) | Q của Annie |
| **Chọn ô** | 1 ô bất kỳ trong tầm làm tâm, nổ theo hình vùng | Tibbers, Tường Băng |
| **Định hướng** *(mới)* | Chọn 1 trong **4 hướng** (lên, xuống, trái, phải; không chéo). Chiêu tính **từ ô của tướng**: đường thẳng N ô, hình nón, vùng 3×3 trước mặt, lướt tới N ô | Lux R (tia thẳng 5 ô), Darius Q (nón trước mặt), Kha'Zix E (lướt 2 ô) |
| **Bản thân** | Không chọn | R của Kha'Zix |

Đường thẳng: dừng ở tướng đầu tiên trúng (đạn) hoặc xuyên hết (tia), tuỳ chiêu ghi.

## 6. Mana: tất cả tướng dùng mana (bỏ Nộ)

- Bắt đầu 30, tối đa 100. **+10 mỗi lượt**, +10 mỗi đòn đánh, +5 khi bị đánh trúng.
- Pháp sư hồi nhanh hơn (xem nội tại vai).
- Aatrox, Darius, Zed, Kha'Zix, Katarina chuyển sang mana. Giá chiêu làm lại.

## 7. Nội tại vai (mỗi vai đúng 1 nội tại)

| Vai | Nội tại |
|---|---|
| **Sát thủ: Ám Kích** | **Lần đầu được triệu hồi**, sát thủ có thể **dịch chuyển tới 1 ô trống kề 1 tướng địch bất kỳ trên sân**, kể cả bên kia sông |
| **Xạ thủ: Bắn Xa** | Tầm đánh thường **3 ô theo 4 hướng**, xa nhất game (mục 4) |
| **Pháp sư: Thiên Phú** | Hồi **+20 mana mỗi lượt** thay vì +10 |
| **Đỡ đòn: Khiêu Khích** | Xạ thủ địch có đỡ đòn này trong tầm đánh thì **bắt buộc đánh thường vào đỡ đòn**. Chiêu của xạ thủ vẫn chọn mục tiêu khác bình thường. Có nhiều đỡ đòn trong tầm thì xạ thủ chọn 1 trong số đó |
| **Đấu sĩ: Tay Đôi** | Đánh mục tiêu không có đồng đội nào đứng kề: +15% sát thương. Không có đồng minh nào đứng kề (4 hướng): nhận ít hơn 10% sát thương |
| **Trợ thủ: Hỗ Trợ** | Khiên và hồi máu lên đồng minh đứng kề mạnh hơn 15% |

"Đứng kề" trong toàn bộ luật mới tính **4 hướng** (trên, dưới, trái, phải). Ô chéo không tính là kề.

Mỗi tướng còn có **1 nội tại riêng** của mình như hiện nay. Mỗi tướng có tổng cộng 2 nội tại: một của vai, một của tướng.

## 8. Trụ, Nhà, lính, rừng

- **Trụ:** 650 máu. Bắn tướng địch ở ô ngay trước trụ: 90 sát thương, mỗi lượt liên tiếp +30.
- **Nhà:** 1300 máu, được bảo hộ tới vòng 7.
- **Lính đẩy đường:** đầu mỗi vòng, đường nào có tướng một phe đứng trên **nửa sân địch** mà phe kia không có ai ở nửa sân của mình trong đường đó, thì trụ (trụ sập thì Nhà) bị trừ 60 × số tướng đang đẩy.
- **Rừng:** máu, bùa và vàng như cũ. Baron cho bùa +15% AD, +20 AP, đánh trụ +50%.
- **Kéo dài trận:** từ vòng 32, mỗi vòng cả hai Nhà mất 100 +50/vòng, trừ cùng lúc.

## 9. Những thứ phải làm lại

| Phần | Việc |
|---|---|
| Lõi luật (shared) | Toạ độ chung, di chuyển 4 hướng, vật cản, tầm theo ô, kiểu chiêu định hướng, nội tại vai mới, bỏ Nộ |
| 20 tướng | Viết lại phần chọn mục tiêu của khoảng 80 chiêu ("cùng đường / 3 đường quanh mình" chuyển thành tầm ô, hướng, vùng) |
| Server + bot | Áp luật mới. Bot biết đi, tránh trụ, nhắm hướng chiêu, đi rừng |
| Giao diện (phiên UX/UI) | Vẽ lưới chung 5×7 + cột rừng; chọn hướng chiêu (mũi tên/nón); vẽ tầm đánh |
| Cân bằng | Chạy lại từ đầu tới 49–51% |

Thứ tự đề xuất: lõi luật → server/bot → 20 tướng (chia 3–4 agent) → giao diện → cân bằng.

## 10. Đã chốt / còn chờ

Đã chốt: tầm theo 4 hướng (cận chiến 1, tầm trung 2, xạ thủ 3; không chéo), chiêu định hướng 4 hướng, rừng chia hai bên tường và Baron ở một bên.

Tạm chốt theo đề xuất (thầy chưa trả lời): di chuyển 1 ô/lượt 4 hướng, Tốc Biến nhảy 2 ô.

Còn mở:
1. **Di chuyển:** mỗi tướng đi 1 ô mỗi lượt (4 hướng)? Hay giữ "chỉ đi được khi có Tốc Biến/chiêu"? Nếu giữ thì gần như không ai qua được sông.

## 11. Tường và góc

- **Tường** = ô ở **đường biên sát quái rừng** (đường 1 hoặc 5) **hoặc hàng dưới cùng** của sân mỗi phe (hậu tuyến, sát Nhà/trụ). Ô kề Tường Băng cũng tính.
- **Góc** = nơi hai bức tường gặp nhau: đường biên **và** hàng dưới cùng. Bị kẹt hai mặt, không có đường lùi.
- Bị đẩy về phía tường mà không lùi được thì "đập tường" (choáng). Ở góc thì bị đẩy hướng nào cũng đập.
- Tướng khắc tường/góc: **Qiyana** (tướng thứ 21, sát thủ). Nội tại +20% sát thương lên kẻ sát tường, +44% lên kẻ ở góc. R hất về bức tường gần nhất (sang đường biên hoặc lùi về hàng cuối): đã sát tường thì Choáng 2 vòng, kẹt góc thì thêm Câm Lặng 2 vòng.
