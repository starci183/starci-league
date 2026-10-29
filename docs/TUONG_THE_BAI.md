# 10 tướng bản thẻ bài thuần (thiết kế chốt để code)

Luật: `docs/LUAT_THE_BAI.md` (phần CHỐT MỚI ở đầu file).
- Mỗi tướng: **3 chiêu** (Q, E, R; R là chiêu cuối) + **1 nội tại**. Bộ lá mỗi tướng: **6 Q, 6 E, 2 R** + 20 thẻ hỗ trợ.
- Chiêu dùng xong vào mộ. Hết bài thì thua.
- Chọn mục tiêu kiểu Yu-Gi-Oh (tướng đối diện, 1 tướng, tối đa N tướng, mọi tướng, tướng mình, bản thân). **Mục tiêu do lối chơi của từng tướng quyết định**, không ép theo vai.
- Chỉ số như cũ: máu vài trăm, AD, AP (chỉ từ đồ), giáp/kháng; công thức {…} tính theo tướng dùng chiêu.

**Nguyên tắc thiết kế:** mỗi tướng có **một lối chơi duy nhất**. Nội tại và cả 3 chiêu đều phục vụ lối đó. Mỗi chiêu có một điều kiện **đẩy người chơi đi đúng lối** ấy. Tướng nào cũng có cách thắng rõ ràng và có điểm yếu rõ ràng để đối thủ khắc.

| # | Tướng | Vai | Lối chơi (một câu) |
|---|---|---|---|
| 1 | Darius | Đấu sĩ | **Đao phủ dây chuyền:** dồn dấu chảy máu nhiều lượt, rồi một lượt kéo, chém, kéo, chém liên tục |
| 2 | Braum | Đỡ đòn | **Hộ vệ phản ứng:** giữ bài, chơi trong lượt đối thủ để chặn đòn |
| 3 | Blitzcrank | Đỡ đòn | **Kẻ cướp bài:** móc tướng và móc bài; lá cướp được thành vũ khí của mình |
| 4 | Zed | Sát thủ | **Một lượt dồn chết:** nhân bản chiêu bằng Bóng, dồn hết vào một mục tiêu |
| 5 | Viktor | Pháp sư | **Tự tiến hoá:** dùng chiêu càng nhiều thì chiêu càng mạnh, mạnh nhất cuối trận |
| 6 | Twisted Fate | Pháp sư | **Kiểm soát bài:** chọn màu lá, tìm đúng lá, xem tay đối thủ |
| 7 | Nami | Trợ thủ | **Máy rút bài cho carry:** rút bài liên tục, buff đòn đánh, chí mạng thì rút thêm |
| 8 | Soraka | Trợ thủ | **Bền bài:** đổi bài thừa lấy máu, xáo mộ vào lại bộ để không bao giờ cạn |
| 9 | Teemo | Xạ thủ | **Đốt bài:** cài Nấm vào bộ địch, ép đối thủ cạn bài |
| 10 | Kog'Maw | Xạ thủ | **Lăn cầu tuyết từ cái chết:** chết càng nhiều càng mạnh, sống càng lâu càng đáng sợ |

---

## 1. Darius: Đao phủ dây chuyền (Đấu sĩ, vật lý)
**Máu 940 · AD 82 · giáp/kháng 36/30.** Tự đánh tướng đối diện mỗi lượt (luật đấu sĩ).

- **Nội tại, Xuất Huyết:** mỗi đòn đánh và chiêu của Darius cho mục tiêu **1 dấu chảy máu** (tối đa 5). Dấu ở lại cả khi Darius đổi mục tiêu. Đầu lượt của mục tiêu, nó mất {6 + 6% AD} máu cho mỗi dấu.
- **Q ×6, Tàn Sát** (tướng đối diện): {50 + 70% AD + 30% AP} vật lý, +1 dấu.
  - **Điều kiện:** mục tiêu đã có dấu thì **+2 dấu** thay vì 1, và Darius hồi {20 + 4% máu cộng thêm}.
- **E ×6, Bắt Giữ** (1 tướng địch bất kỳ): kéo nó về **đối diện Darius** (đổi chỗ với tướng đang ở đó), rồi Darius đánh thường nó ngay, miễn phí.
  - **Điều kiện:** mục tiêu có **từ 3 dấu** thì lá E này **quay về tay**.
- **R ×2, Máy Chém Noxus** (tướng đối diện): {80 + 50% AD + 20% AP} + 30 mỗi dấu, sát thương chuẩn.
  - **Điều kiện:** **hạ gục** thì lá R quay về tay và thầy rút 1 lá.
- **Lối chơi:** vài lượt đầu Darius tự đánh và dùng Q để rải dấu (Q nhân dấu rất nhanh). Đến lượt bùng nổ: E kéo một tướng nhiều dấu về trước mặt (E quay về tay), R chém chết (R quay về tay, rút 1), lại E kéo tướng tiếp theo, lại R... Một lượt có thể hạ 2–3 tướng.
- **Kết hợp tốt:** Blitzcrank (kéo thêm mục tiêu), Nami (rút ra lá R/E đúng lúc).
- **Bị khắc bởi:** Soraka (hồi máu bù dấu), Blitzcrank địch (cướp mất lá R), đội không để Darius dồn dấu.

## 2. Braum: Hộ vệ phản ứng (Đỡ đòn, phép)
**Máu 1000 · AD 62 · giáp/kháng 37/37.** Hầu như chỉ chơi bài **trong lượt đối thủ**.

- **Nội tại, Cảnh Giác:** cuối lượt đối thủ, nếu trong lượt đó Braum đã dùng **ít nhất 1 lá phản ứng**, thầy rút 1 lá.
- **Q ×6, Đứng Sau Tôi** (phản ứng, khi 1 đồng minh bị chọn làm mục tiêu): **đổi mục tiêu sang Braum** và Braum nhận Khiên {60 + 10% máu cộng thêm + 30% AP}.
  - **Điều kiện:** Braum **đang có Khiên** từ trước thì phản lại 30% sát thương đó cho kẻ tấn công.
- **E ×6, Bất Khả Xâm Phạm** (phản ứng, khi địch dùng chiêu nhắm **nhiều tướng**: tối đa N hoặc mọi tướng): mọi đồng minh nhận **ít hơn 40%** sát thương từ chiêu đó.
  - **Điều kiện:** chiêu bị chặn là **chiêu cuối (R)** thì đồng minh còn được miễn hiệu ứng khống chế của nó.
- **R ×2, Vết Nứt Băng Giá** (mọi tướng địch, dùng trong lượt mình): {80 + 40% AP} phép và Choáng 1 lượt.
  - **Điều kiện:** trên tay còn **từ 2 lá phản ứng** (Q/E) thì Choáng 2 lượt.
- **Lối chơi:** lượt của mình Braum gần như không làm gì, chỉ giữ Q và E trên tay. Sang lượt đối thủ, Q chặn đòn đơn, E chặn chiêu diện rộng; mỗi lần phản ứng lại được rút thêm bài. R dành cho lượt mở giao tranh.
- **Kết hợp tốt:** Kog'Maw, Viktor (carry cần sống lâu).
- **Bị khắc bởi:** Twisted Fate (xem tay biết Braum giữ lá gì), Blitzcrank (cướp lá phản ứng trên tay).

## 3. Blitzcrank: Kẻ cướp bài (Đỡ đòn, phép)
**Máu 960 · AD 68 · giáp/kháng 36/34.**

- **Nội tại, Lá Chắn Phản Lực:** lá chiêu **cướp được từ đối thủ** nằm trên tay thầy thành **thẻ chiêu chung** cùng chữ (Q/E/R), dùng được cho bất kỳ tướng nào của thầy. Mỗi lá cướp được, Blitzcrank +5 giáp và kháng vĩnh viễn (tối đa +30).
- **Q ×6, Bàn Tay Hoả Tiễn** (1 tướng địch bất kỳ): kéo nó về đối diện Blitzcrank, {50 + 40% AP} phép, Choáng 1 lượt, và **cướp 1 lá ngẫu nhiên** trên tay đối thủ.
  - **Điều kiện:** lá cướp được là **lá của chính tướng bị kéo** thì cướp thêm 1 lá.
- **E ×6, Đấm Móc** (tướng đối diện): đánh ngay (không cần lá Đánh thường) thêm {40 + 50% AD}, Choáng 1 lượt.
  - **Điều kiện:** tay đối thủ **còn từ 3 lá trở xuống** thì Choáng 2 lượt.
- **R ×2, Trường Điện Từ** (mọi tướng địch): {80 + 40% AP} phép, Câm Lặng 1 lượt, và đối thủ **bỏ 2 lá ngẫu nhiên** trên tay.
  - **Điều kiện:** tay đối thủ **trống** sau khi bỏ thì Blitzcrank nhận Khiên {30% máu tối đa}.
- **Lối chơi:** vừa kéo carry địch về trước mặt, vừa rút cạn tay đối thủ. Lá cướp được biến thành chiêu của đội mình. Đối thủ mất lá R vào tay Blitzcrank là mất luôn chiêu cuối.
- **Kết hợp tốt:** Darius (Blitzcrank kéo, Darius chém), Teemo (vừa đốt bài vừa cướp bài).
- **Bị khắc bởi:** đội đánh bài nhanh, không giữ bài trên tay (Viktor Q bậc 3, Soraka đổi bài lấy máu trước).

## 4. Zed: Một lượt dồn chết (Sát thủ, vật lý)
**Máu 820 · AD 84 · giáp/kháng 30/28.** Lá Đánh thường gây 350% AD lên tướng cùng đường.

- **Nội tại, Khinh Thường Kẻ Yếu:** đòn đánh của Zed lên mục tiêu **dưới 50% máu** gây thêm 8% máu tối đa của nó.
- **Q ×6, Phi Tiêu Sắc Lẻm** (1 tướng địch bất kỳ): {40 + 60% AD + 20% AP} vật lý.
  - **Điều kiện:** mục tiêu **đang bị Dấu Ấn (R)** thì thêm 40% sát thương.
- **E ×6, Phân Thân Bóng Tối** (bản thân): Zed chuyển sang đường bất kỳ (đổi chỗ với tướng mình nếu có), rồi tạo **1 lá Bóng** lên tay, là bản sao lá Zed **vào mộ gần nhất**. Lá Bóng biến mất cuối lượt nếu không dùng.
  - **Điều kiện:** **trong mộ có từ 3 lá Zed** thì tạo 2 lá Bóng.
- **R ×2, Dấu Ấn Tử Thần** (1 tướng địch): đánh dấu nó. Cuối lượt đối thủ, dấu nổ gây **50% tổng sát thương Zed đã gây lên nó** từ lúc đánh dấu.
  - **Điều kiện:** dấu nổ **hạ gục** thì lá R quay về tay.
- **Lối chơi:** Zed tích lá trên tay qua vài lượt mà không đánh. Đến lượt dồn: R đánh dấu carry, E chuyển sang cùng đường và tạo Bóng, rồi Đánh thường 350%, Q, Bóng-Q, Bóng-Q. Cuối lượt đối thủ dấu nổ thêm. Mục tiêu chết trong một lượt.
- **Kết hợp tốt:** Nami (E buff cho Zed đánh không cần lá), Blitzcrank (kéo carry ra).
- **Bị khắc bởi:** Braum (Q đổi mục tiêu sang Braum làm phí cả combo), Soraka (hồi máu trước khi dấu nổ).

## 5. Viktor: Tự tiến hoá (Pháp sư, phép)
**Máu 740 · AD 60 · giáp/kháng 28/30.**

- **Nội tại, Tiến Hoá Vinh Quang:** mỗi lần dùng một chiêu, chiêu đó **+1 điểm**. **Đủ điểm thì tự lên bậc** (Q và E: 3 điểm mỗi bậc; R: 1 điểm mỗi bậc; tối đa bậc 3). Bậc áp cho mọi lá cùng loại, giữ cả trận.
- **Q ×6, Tia Hấp Thụ** (1 tướng địch): {50 + 20% AD + 50% AP} phép, Viktor nhận Khiên {20 + 20% AP}.
  - Bậc 1: +15% sát thương. Bậc 2: Khiên gấp đôi. **Bậc 3: dùng xong lá về thẳng tay.**
- **E ×6, Tia Huỷ Diệt** (tối đa 2 tướng địch): {40 + 20% AD + 40% AP} phép.
  - Bậc 1: +15%. Bậc 2: Buốt 1 lượt. **Bậc 3: mục tiêu nhận thêm dư chấn 50% vào đầu lượt sau.**
- **R ×2, Bão Hỗn Loạn** (1 tướng địch): bão bám nó 3 lượt, đầu mỗi lượt của thầy gây {40 + 30% AP} phép.
  - Bậc 1: thêm 1 lượt. Bậc 2: Câm Lặng 1 lượt khi bão xuất hiện. **Bậc 3: mỗi lần Viktor dùng Q/E khi bão còn, bão đánh thêm 1 lần.**
- **Lối chơi:** đầu trận dùng chiêu để lấy điểm, chấp nhận yếu. Cuối trận cả 3 chiêu lên bậc 3: lượt nào cũng có Q trên tay, R làm bão đánh theo mỗi chiêu. Viktor sống tới cuối là thắng.
- **Kết hợp tốt:** Nami (rút ra nhiều lá Viktor để lên bậc nhanh), Braum (bảo kê), Soraka (mỗi lần lên bậc tốn 1 lá vào mộ, Soraka xáo lại).
- **Bị khắc bởi:** Zed, Darius (dồn chết Viktor sớm khi chưa lên bậc), Teemo (Viktor ngốn bài, bị đốt bài là cạn).

## 6. Twisted Fate: Kiểm soát bài (Pháp sư, phép)
**Máu 740 · AD 60 · giáp/kháng 28/30.**

- **Nội tại, Bàn Tay Vàng:** mỗi lần dùng lá **Vàng** để ghép đồ, thầy rút 1 lá.
- **Q ×6, Chọn Bài** (đổi màu, chọn khi đánh):
  - **Xanh** (bản thân): rút 2 lá.
  - **Đỏ** (mọi tướng địch): {35 + 20% AD + 35% AP} phép.
  - **Vàng** (1 tướng địch): {50 + 20% AD + 45% AP} phép, Choáng 1 lượt, nhận 1 lá Vàng.
  - **Điều kiện:** **chọn cùng màu với lần Q trước** thì hiệu ứng mạnh thêm 50% (Xanh thì rút 3).
- **E ×6, Xào Bài** (bản thân): **lục bộ bài lấy 1 lá bất kỳ** lên tay, rồi xáo bộ bài.
  - **Điều kiện:** lấy đúng **lá chiêu cuối (R)** thì phải bỏ 1 lá khác trên tay.
- **R ×2, Định Mệnh** (bản thân): **xem toàn bộ tay đối thủ** tới hết lượt. 1 tướng mình chuyển sang đường bất kỳ, đòn đánh kế tiếp của nó gấp đôi.
  - **Điều kiện:** tay đối thủ **có lá phản ứng** (như Braum Q/E) thì TF được bỏ 1 lá trong số đó.
- **Lối chơi:** TF là "não" của đội. Chọn màu theo tình thế: thiếu bài thì Xanh, cần choáng thì Vàng. E lục đúng lá combo cho đồng đội (lá R của Darius, lá Q của Viktor). R soi tay đối thủ để phá thế phản ứng.
- **Kết hợp tốt:** Darius, Zed (TF tìm đúng lá R cho lượt bùng nổ).
- **Bị khắc bởi:** Teemo (TF lục bài làm bộ bài cạn nhanh), Blitzcrank (cướp mất lá vừa lục được).

## 7. Nami: Máy rút bài cho carry (Trợ thủ, phép)
**Máu 790 · AD 58 · giáp/kháng 30/34.**

- **Nội tại, Thuỷ Triều:** mỗi lá thầy rút nhờ lá chiêu (của bất kỳ tướng nào), đồng minh máu thấp nhất hồi {15 + 10% AP}.
- **Q ×6, Sóng Triều** (bản thân): rút 2 lá.
  - **Điều kiện:** 2 lá **khác loại** (lá chiêu khác thẻ hỗ trợ, Đồ khác Vàng...) thì bỏ 1 lá tuỳ chọn.
- **E ×6, Phước Lành** (1 tướng mình): đòn đánh kế tiếp của tướng đó **không cần lá Đánh thường** và thêm {30 + 20% AP} phép.
  - **Điều kiện:** đòn đó **chí mạng** thì thầy rút thêm 1 lá.
- **R ×2, Đại Hồng Thuỷ** (bản thân): **rút 3 lá** (chỉ rút bài).
  - **Điều kiện:** đội mình **chỉ còn từ 3 mạng trở xuống** thì rút 5.
- **Lối chơi:** Nami biến lá của mình thành đòn đánh miễn phí cho xạ thủ và sát thủ (E), và thành bài cho cả đội (Q, R). Cầm đồ chí mạng thì E vừa đánh vừa rút bài. Đội đang thua thì R rút 5 để lật kèo.
- **Kết hợp tốt:** xạ thủ hoặc sát thủ chí mạng (Zed, Kog'Maw), Viktor (cần nhiều lá).
- **Bị khắc bởi:** Teemo (rút nhiều thì rút trúng Nấm nhiều), đội ép cạn bài.

## 8. Soraka: Bền bài (Trợ thủ, phép)
**Máu 800 · AD 58 · giáp/kháng 30/34.**

- **Nội tại, Sao Băng:** mỗi lá bị **bỏ khỏi tay** (bất kỳ lý do gì), đồng minh máu thấp nhất hồi {20 + 10% AP}.
- **Q ×6, Sao Rơi** (1 tướng địch): {40 + 20% AD + 40% AP} phép, Soraka hồi {30 + 20% AP}.
  - **Điều kiện:** **mộ bài có từ 10 lá** thì hồi thêm cho đồng minh máu thấp nhất.
- **E ×6, Hiến Tế** (1 tướng mình): **bỏ bao nhiêu lá trên tay tuỳ ý**, mỗi lá bỏ đi hồi cho tướng đó {70 + 30% AP}.
  - **Điều kiện:** lá bỏ đi là **lá của tướng đang chết** (lá chết) thì hồi thêm 50%.
- **R ×2, Nguyện Ước** (mọi tướng mình): hồi {120 + 50% AP}, rồi **xáo toàn bộ mộ bài vào lại bộ bài**.
  - **Điều kiện:** bộ bài **còn dưới 10 lá** thì mọi đồng minh còn được Khiên {100 + 30% AP}.
- **Lối chơi:** lá thừa và lá chết không bao giờ phí, bỏ đi để hồi máu. Khi bộ bài sắp cạn thì R hồi cả đội và nạp lại bộ bài. Đội có Soraka gần như không thể thua vì cạn bài.
- **Kết hợp tốt:** Viktor, Nami (đội ngốn bài), Kog'Maw (chết nhiều thì nhiều lá chết để đổi máu).
- **Bị khắc bởi:** Zed, Darius (dồn chết trong một lượt, hồi không kịp), Blitzcrank (cướp lá R).

## 9. Teemo: Đốt bài (Xạ thủ, phép)
**Máu 720 · AD 66 · giáp/kháng 28/30.** Lá Đánh thường gây 200% AD lên tướng bất kỳ.

- **Nội tại, Nấm Độc:** lá **Nấm** nằm trong bộ bài đối thủ. Rút trúng thì Nấm nổ: tướng ít máu nhất bên đó nhận {40 + 30% AP} phép, và **2 lá trên cùng bộ bài đối thủ bị đốt vào mộ**. Nấm chiếm chỗ lá rút đó, rồi bị huỷ.
- **Q ×6, Trồng Nấm** (bản thân): xáo 1 Nấm vào bộ bài đối thủ.
  - **Điều kiện:** bộ bài đối thủ **dưới 30 lá** thì xáo 2 Nấm.
- **E ×6, Phi Tiêu Mù** (1 tướng địch): {40 + 20% AD + 30% AP} phép; đòn đánh kế tiếp của nó bị **trượt**.
  - **Điều kiện:** mục tiêu là **xạ thủ** thì trượt 2 đòn.
- **R ×2, Mùa Nấm** (bản thân): xáo 3 Nấm vào bộ bài đối thủ.
  - **Điều kiện:** trong lượt kế tiếp của đối thủ, mỗi Nấm nổ **đốt 3 lá** thay vì 2.
- **Lối chơi:** Teemo không cần giết ai. Mỗi Nấm nổ là đối thủ mất 3 lá (lá rút trúng Nấm + 2 lá bị đốt). Càng về cuối, bộ bài đối thủ càng mỏng và Nấm càng dày, tới khi họ rút trúng bộ bài rỗng và thua.
- **Kết hợp tốt:** Blitzcrank (cướp bài cùng lúc đốt bài), Braum (bảo kê Teemo sống lâu).
- **Bị khắc bởi:** Soraka (xáo mộ vào lại bộ, Nấm mất tác dụng), Zed (Teemo máu giấy).

## 10. Kog'Maw: Lăn cầu tuyết từ cái chết (Xạ thủ, vật lý)
**Máu 710 · AD 68 · giáp/kháng 26/28.** Lá Đánh thường gây 200% AD lên tướng bất kỳ.

- **Nội tại, Kog Stack:** mỗi vòng Kog'Maw còn sống +1 Stack. **Mỗi lần Kog'Maw chết +2 Stack.** Stack giữ qua các lần chết. Mỗi Stack: đòn đánh của Kog'Maw +{4 + 2% AD}.
- **Q ×6, Phun Axít** (1 tướng địch): {40 + 60% AD + 30% AP} vật lý, **Rã giáp** (giáp và kháng −40%) 2 lượt.
  - **Điều kiện:** Kog'Maw **từ 6 Stack** thì Rã giáp **mọi tướng địch**.
- **E ×6, Cao Xạ Ma Pháp** (bản thân): trong 2 lượt, Kog'Maw **tự đánh mỗi lượt không cần lá Đánh thường**, nhắm tướng bất kỳ, thêm 3% máu tối đa mục tiêu.
  - **Điều kiện:** đánh trúng tướng **đang Rã giáp** thì +1 Stack.
- **R ×2, Pháo Sinh Học** (1 tướng địch): {80 + 50% AD + 50% AP} + 10 mỗi Stack, phép.
  - **Điều kiện:** mục tiêu **dưới 40% máu** thì gấp đôi.
- **Lối chơi:** gọi ra sớm thì Kog'Maw dễ chết (đối thủ được điểm), nhưng mỗi lần chết lại +2 Stack. Đối thủ rơi vào thế khó: giết thì Kog'Maw mạnh lên, để sống cũng mạnh lên. Khi đủ Stack, Q rã giáp cả đội địch, E tự bắn mỗi lượt, R kết liễu.
- **Kết hợp tốt:** Braum (bảo kê qua giai đoạn yếu), Nami (E buff thêm đòn đánh), Soraka (mỗi lần Kog'Maw chết thì có lá chết để đổi máu).
- **Bị khắc bởi:** đội ép cạn bài (Teemo): Kog'Maw cần thời gian, Teemo không cho thời gian.

---

## Vòng khắc chế
- **Dồn chết nhanh** (Darius, Zed) **khắc** **bền bỉ cuối trận** (Viktor, Kog'Maw, Soraka).
- **Bền bài** (Soraka) **khắc** **đốt bài** (Teemo).
- **Đốt bài, cướp bài** (Teemo, Blitzcrank) **khắc** **ngốn bài** (Viktor, Nami, TF).
- **Phản ứng** (Braum) **khắc** **dồn chết** (Zed, Darius).
- **Soi bài** (TF) **khắc** **phản ứng** (Braum).

## Tạm gác (thiết kế sau)
Garen, Annie, Lux, Lissandra, Ashe, Jinx, Vayne, Thresh, Janna, Kha'Zix, Katarina, Aatrox, Malphite, Leona, Ahri, Qiyana.
