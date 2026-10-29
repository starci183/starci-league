# StarCi League: luật bản thẻ bài thuần (bản nháp chờ thầy duyệt)

> **CHỐT MỚI (thay các mục cũ bên dưới nếu khác):**
> - **Trợ thủ rút thêm tối đa 1 lá mỗi lượt** (có nhiều Trợ thủ sống cũng chỉ +1).
> - **GỌI TƯỚNG TRƯỚC, RÚT BÀI SAU (thay "rút bài trước" và thẻ chiêu chung):** mỗi lượt bắt đầu bằng **bước gọi tướng** (phase `summon`): gọi tướng dự bị vào đường mở còn trống (gọi bao nhiêu tuỳ ý, hoặc bỏ qua), rồi bấm **rút bài** (`draw`) mới rút 2 lá (+1 mỗi Trợ thủ). Không gọi được ai thì tự rút. Gọi tướng trong lúc đánh bài vẫn được.
> - **Mở đầu trận:** không còn tay đầu sẵn và **bỏ hẳn thẻ chiêu chung** (Q/E/R). Lượt đầu của mỗi bên **bắt buộc gọi tướng đầu tiên** (vòng 1 chỉ mở đường 3), lá của tướng đó xáo vào bộ, rồi rút **tay đầu 5 lá** (`RULES.startHand`); lượt đầu không rút thêm 2 lá đầu lượt. Bên B gọi tướng sau khi thấy tướng của A.
> - **Lá thưởng** chỉ gồm thẻ hỗ trợ (Đánh thường, Vàng, Đồ, Rút Bài, phép bổ trợ), không còn thẻ chiêu chung. Blitzcrank cướp được lá chiêu của đối thủ thì lá đó thành 1 lá Đánh thường.
> - ~~Thứ tự lượt: rút bài trước~~ (đã đổi: gọi tướng trước, rút sau, xem trên).
> - ~~Tay đầu = 5 lá gốc + 3 thẻ chiêu chung (Q, E, R)~~ (đã bỏ thẻ chiêu chung) không gắn tướng: đánh ra thì chọn 1 tướng mình đang trên sân và tung chiêu Q/E/R của tướng đó. Giúp lên chiến thuật khi chưa biết sẽ rút được tướng nào. Dùng xong vào mộ như lá chiêu.
> - **Mục tiêu chiêu do lối chơi từng tướng quyết định** (không ép theo vai); kiểu mục tiêu: tướng đối diện · 1 tướng địch · tối đa N · mọi tướng địch · tướng mình · bản thân.
> - **Chọn mục tiêu chiêu kiểu Yu-Gi-Oh** (không theo đường): 1 tướng địch · tối đa N tướng địch · mọi tướng địch · 1 / tối đa N / mọi tướng mình · bản thân. Đường chỉ dùng cho đánh thường theo vai và hiệu ứng kéo/đổi chỗ.
> - **Thẻ thưởng (Prize) kiểu Pokémon:** đầu trận mỗi đội úp **6 lá thưởng** ngẫu nhiên (thẻ hỗ trợ + thẻ chiêu chung Q/E/R, không lấy từ bộ bài chính). Hạ 1 tướng địch thì lật 1 lá thưởng lên tay. **Giữ 7 mạng:** 6 lần hạ đầu mỗi lần lật 1 lá thưởng; lần hạ thứ 7 là thắng trận.
> - **Quick play** là nhãn của từng chiêu (vd "E · Quick"): chiêu Quick dùng được trong lượt đối thủ để **nối chuỗi** kiểu Yu-Gi-Oh; chuỗi giải quyết từ mắt xích cuối về đầu.
> - **Ô triệu hồi phụ:** mỗi bên 1 ô ngoài 5 đường cho vật triệu hồi / đồng minh phụ (vd Tibbers làm máu ảo cho Annie: sát thương vào Annie đánh Tibbers trước, hết máu thì Tibbers chết). Không có hiệu ứng vùng tròn; mọi hiệu ứng đặt lên tướng.
> - **Nhắm vật triệu hồi ở ô phụ:** chỉ **đòn đánh thường của xạ thủ** (lá Đánh thường hoặc đòn miễn phí) chọn được vật triệu hồi làm mục tiêu. Chiêu đơn mục tiêu / tối đa N **không** chọn được vật triệu hồi, trừ khi lá ghi rõ (`targetsTokens`); chiêu "mọi tướng địch" vẫn trúng. Vật triệu hồi có thể **úp mặt** (đối thủ không biết nó là gì tới khi lật, rời sân thì tự lật) và có thể **tự hết hạn** sau N lượt (hiện số lượt còn lại trên token).
> - **Quick dành cho tướng phản ứng:** lá Quick chỉ cấp cho tướng mà mục đích duy nhất là phản ứng. Đòn lớn đánh trong lượt mình để đối thủ có một lượt đọc bàn và đáp trả.
> - **Số lá chiêu theo từng tướng** (không cố định 6/6/2): Q 3–10 lá, E 3–10 lá, R 1–3 lá (`HeroDef.skillCopies`, mặc định 6/6/2). Đấu sĩ/tướng đánh tay mang ít lá chiêu (bộ gọn), pháp sư mang nhiều. Số lá cũng là núm cân bằng: chiêu mạnh mỗi lá thì ít bản.
> - **Bộ gốc tự xếp 20 lá** (thay bộ gốc 10 Đánh thường/6 Vàng/6 Đồ): chỉ thẻ hỗ trợ (Đánh thường ≤8, Rút Bài ≤2, Bổ Trợ ≤2, Bình Máu ≤2), Vàng ≤4 và **mảnh Đồ chọn đích danh** (mỗi mảnh ≤2), xem `packages/shared/src/cardgame/deck.ts`. Thiếu/sai thì dùng bộ mặc định. Tay đầu vẫn rút 5 lá từ bộ gốc + 3 thẻ chiêu chung. Mỗi tướng ra sân vẫn xáo thêm 20 thẻ hỗ trợ của tướng (có thể chỉnh riêng: `HeroDef.supportCopies`) + toàn bộ lá chiêu của tướng.
> - **Đồ đã đeo không tháo ra được:** không có hành động tháo/chuyển đồ; đồ ở lại trên tướng qua cả lúc chết và hồi sinh.
> - **Ghép đồ ra lá đồ huyền thoại:** 2 lá Đồ + 1 lá Vàng trên tay ghép thành **1 lá đồ huyền thoại lên tay** (tay đầy thì vào mộ), chưa đeo. Đeo là một lượt đánh riêng: đánh lá đó lên 1 tướng mình trên sân còn ô đồ (tối đa 3 món); khi đeo, máu tối đa/hiện tại tăng theo máu của món.
> - **Trạng thái chung** (có hiệu ứng riêng trên bàn, mọi tướng dùng chung id): Choáng `stun`, Câm Lặng `silence`, Vết Thương Sâu `grievous` (hồi máu/Khiên nhận vào −50%), Buốt `chill`, Mù `blind`, Khiêu Khích `taunt`, cộng Khiên.
> - **Phép bổ trợ (8 lá, kiểu LMHT) thay Bình Máu và Bổ Trợ:** Hồi Máu (hồi 150 + 10% máu tối đa) · Tốc Biến (dời 1 tướng mình sang đường mở còn trống) · Thiêu Đốt (địch mất 50 máu đầu mỗi lượt của nó trong 2 lượt, kèm Vết Thương Sâu: hồi máu và Khiên nhận vào giảm 50%) · Kiệt Sức (địch gây ít hơn 40% sát thương tới hết lượt kế của nó) · Lá Chắn (Khiên 120 + 10% máu tối đa) · Thanh Tẩy (gỡ mọi khống chế/hiệu ứng xấu) · Trừng Phạt (400 sát thương chuẩn lên vật triệu hồi ở ô phụ địch: cách để tướng không phải xạ thủ trả lời token) · Dịch Chuyển (1 tướng đang chờ hồi sinh quay lại ngay vào đường mở còn trống với 50% máu). Dùng trong lượt mình (không Quick), dùng xong biến mất. 20 thẻ hỗ trợ của mỗi tướng: 9 Đánh thường, 2 Vàng, 4 Đồ, 2 Rút Bài, 1 Hồi Máu, 1 Lá Chắn, 1 Thanh Tẩy (2 Vàng vì 1 lần ghép tốn 2 Đồ + 1 Vàng) (tướng có thể đổi riêng).
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
> | **Bình Máu** | 1 tướng mình hồi {150 + 10% máu tối đa} |
> | **Rút Bài** | rút 2 lá |
> | **Bổ Trợ** | 1 tướng mình +20% sát thương và Khiên {100} tới hết lượt đối thủ |
>
> - **Đồ chỉ dùng bảng 8×8:** 8 mảnh (Kiếm Dài, Gậy Quá Khổ, Cung Gỗ, Găng Tay, Giáp Lưới, Áo Choàng, Đai Khổng Lồ, Nước Mắt) → 36 món ghép. Bỏ Pha Lê Lam, Cuốc Chim và các món từ chúng.
> - Luật pháp sư "×1,5 số lá" bỏ (mọi tướng đều 6/6/2). Thay bằng: chiêu của pháp sư mạnh hơn 40% (`RULES.mageSkillBonus`).
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
1. **Rút 2 lá.**
2. **Đánh bao nhiêu lá cũng được**, thứ tự tuỳ ý. Không có mana, không có hồi chiêu.
3. **Đấu sĩ tự đánh thường** tướng đối diện (không tốn lá).
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
| **Đấu sĩ** | **không cần lá**, tự đánh mỗi lượt | tướng đối diện | 100% AD | ít, chiêu đơn giản |
| **Đỡ đòn** | cần lá | tướng đối diện | 100% AD | nhiều, đa dụng. **Khiêu khích:** lá đánh thường của xạ thủ địch phải đánh vào đỡ đòn |
| **Sát thủ** | cần lá | tướng **cùng đường** | **350% AD** | vừa |
| **Xạ thủ** | cần lá | **tướng nào cũng được** | **200% AD** | vừa |
| **Pháp sư** | cần lá | tướng đối diện | 100% AD (phép) | **×1,5 số lá** mọi chiêu |
| **Trợ thủ** | cần lá | tướng đối diện | 100% AD | vừa. Còn sống thì **rút thêm 1 lá** mỗi lượt |

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
