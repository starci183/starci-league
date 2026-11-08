# Bộ 50 lá Phép kiểu Yu-Gi-Oh (bản đề xuất, 01/11/2026, chưa code, chờ thầy chốt)

Phép không còn là lá một lần đơn lẻ. Mỗi lá có **loại**, **điều kiện**, gọi **đích danh tướng hoặc vùng đất**, và nhiều lá có **hiệu ứng từ mộ**. Xếp bộ quanh đội hình sẽ ra combo, giống xếp bộ Yu-Gi-Oh quanh một archetype.

Đủ 36 tướng, tính cả Sylas và Mel, đều có ít nhất một lá gọi tên hoặc gọi vùng đất của mình.

## 5 loại Phép

| Loại | Dùng khi nào | Ở lại bao lâu |
|---|---|---|
| **Thường** | Lượt mình, bước chính | Vào mộ ngay |
| **Nhanh** | Nối Chuỗi theo điều kiện ghi trên lá, hoặc lượt mình | Vào mộ ngay |
| **Trang Bị** | Lượt mình, gắn lên 1 tướng | Tới khi tướng đó chết hoặc lá bị phá |
| **Liên Tục** | Lượt mình, đặt vào ô Phép | Tới khi bị phá |
| **Sân** | Lượt mình, đặt vào ô Sân chung của cả bàn | Tới khi Sân khác thay |

## Luật chung đề xuất

- **Khu vực mới:** mỗi bên 2 ô Phép Liên Tục. Cả bàn 1 ô Sân chung: Sân áp dụng cho **cả hai bên**, nên đối thủ có tướng cùng vùng đất cũng được hưởng, và đặt Sân mới sẽ đè Sân cũ.
- **Không tốn mana.** Giá của Phép là chỗ trong bộ, lá phải bỏ, hoặc điều kiện trên lá.
- **"Chọn 1 tướng mình; nó..."**: tướng đó là người gây hiệu ứng. Sát thương dùng AD hoặc AP của nó và tính là **chiêu của nó**, nên chạy nội tại: Brand gắn Bỏng, Nami cộng Phước Lành, Lux không tính vì không trả mana. Đây là chỗ Phép nối vào combo tướng.
- **Tướng đang Choáng hoặc Câm Lặng không làm người gây hiệu ứng được.**
- **Mỗi lá tối đa 3 bản. Lá ghi "Một lá trong bộ" chỉ được 1 bản.** Số nằm trong `balance/spells.json`, ký hiệu `a, b, c`.
- **Hiệu ứng từ mộ** chỉ dùng được lượt sau, tính từ lượt lá vào mộ. Dùng xong lá bị loại khỏi trận, Rumble không lấy lại được.
- Sylas đoạt được chiêu, không đoạt được Phép. Mel E và Blitzcrank E chỉ trả lời lá chiêu; Phép được trả lời bằng lá ghi rõ.

## 8 lá nền (giữ nguyên, thành Nhanh hoặc Thường như hiện tại)

Hồi Máu, Tốc Biến, Thiêu Đốt, Kiệt Sức, Lá Chắn, Thanh Tẩy, Trừng Phạt, Dịch Chuyển.

## Phép Sân: 10 vùng đất

Mỗi Sân cho tướng đúng vùng đất một lợi thế, kèm một hiệu ứng "Một lần mỗi lượt" của riêng phe đặt Sân.

| # | Lá | Vùng đất (tướng) | Hiệu ứng |
|---|---|---|---|
| 1 | Pháo Đài Noxus | Darius, Katarina, Annie | Tướng Noxus gây thêm `a`% lên địch dưới `b`% Máu. Một lần mỗi lượt: khi tướng Noxus của bạn hạ gục, rút 1 lá. |
| 2 | Vệ Thành Demacia | Garen, Lux, Vayne, Sylas | Tướng Demacia nhận thêm `a`% Khiên. Một lần mỗi lượt: khi tướng Demacia bị nhắm, nó nhận `b` Kháng tới hết lượt. |
| 3 | Băng Nguyên Freljord | Ashe, Braum, Lissandra, Ornn, Brand | Tướng Freljord không bị giảm Tốc Đánh. Đầu lượt: địch ít Máu nhất nhận 1 Buốt. Một lần mỗi lượt: lá Hoá Băng tan chậm thêm 1 đơn vị. |
| 4 | Hội Đồng Piltover | Jinx, Viktor, Blitzcrank, Renata, Janna, Mel | Đội hồi `a` mana đầu lượt nếu có tướng vùng này. Một lần mỗi lượt: bỏ 1 Vàng, rút 1 lá. |
| 5 | Thánh Địa Ionia | Ahri, Zed | Chiêu đầu mỗi lượt của tướng Ionia được đổi đường sau khi dùng. Một lần mỗi lượt: tướng Ionia né được đòn đầu tiên nếu đã đổi đường lượt đó. |
| 6 | Cảng Bilgewater | Gangplank, Miss Fortune, Twisted Fate, Nami | Đầu lượt: lật lá trên cùng bộ; là Vàng thì lên tay. Một lần mỗi lượt: khi Thùng nổ hoặc lá lật ra lá chiêu, gây thêm `a`. |
| 7 | Đỉnh Targon | Leona, Soraka | Tướng Targon hồi `a`% Máu tối đa cuối lượt. Choáng do tướng Targon gây dài thêm `b` đơn vị. |
| 8 | Vực Hư Không | Kog'Maw, Vel'Koz, Kha'Zix | Mọi bộ đếm của tướng Hư Không tăng thêm 1 khi tăng. Một lần mỗi lượt: khi địch chết, tướng Hư Không hồi `a`. |
| 9 | Thành Phố Bandle | Teemo, Tristana, Rumble | Tướng Bandle thêm `a` Tốc Đánh. Một lần mỗi lượt: khi Nấm nổ, Bom nổ hoặc Lá Tái Chế dùng xong, rút 1 lá nếu tay dưới 4. |
| 10 | Ma Đảo và Cát Cổ | Yorick, Aatrox, Qiyana, Malphite | Tướng vùng này thêm `a` Máu tối đa. Một lần mỗi lượt: khi tướng phe bạn chết, đốt `b` lá bộ đối thủ. |

## Phép Trang Bị: 8 lá

| # | Lá | Điều kiện | Hiệu ứng | Từ mộ |
|---|---|---|---|---|
| 11 | Gấu Bông Khâu Vá | Trang bị cho Annie | Annie thêm `a`·Máu tối đa. Tibbers đánh thêm 1 lần cuối lượt. Annie chết: lá về tay. | |
| 12 | Hoả Ấn Rune | Trang bị cho Brand | Bỏng cháy thêm `a`%. Khi Brand chết, Bỏng giữ nguyên và địch mất thêm `b` Máu mỗi Bỏng. | |
| 13 | Đồng Hồ Kim Quay Ngược | Trang bị cho Zed hoặc Vayne | Liên Hoàn không mất khi hết lượt, giữ tối đa `a`; Vayne được 1 đòn đánh miễn phí đầu lượt. | Loại lá: Liên Hoàn hoặc Bóng Đêm +`b`. |
| 14 | Lá Bài Đánh Dấu | Trang bị cho Twisted Fate | Đầu lượt được xem `a` lá thay vì 1; Thần Bài chọn lá đặt đỉnh. | |
| 15 | Xiềng Cổ Thạch | Trang bị cho Sylas | Chiêu Đoạt không mất mana lần đầu mỗi lượt. Đòn thường nhận 1 Xiềng Nổ. | |
| 16 | Mặt Dây Chói Lọi | Trang bị cho Mel | Ngưỡng hạ của nội tại tăng `a`. Phản Quang Chiết Kính đánh thêm 1 địch ngẫu nhiên. | |
| 17 | Vương Miện Tro Tàn | Trang bị cho Aatrox hoặc Darius | Mất Máu không dưới 1 từ chiêu của chính mình. Hồi thêm `a`% sát thương gây ra. | Loại lá: chọn tướng chết của bạn; nó hồi sinh ngay ở lượt sau. |
| 18 | Cẩm Nang Thợ Rèn | Trang bị cho Ornn | Mỗi Kiệt Tác cộng thêm `a`% cho cả đội. Ornn chết: tạo 1 mảnh đồ lên tay. | |

## Phép Liên Tục: 6 lá

| # | Lá | Hiệu ứng | Hợp với |
|---|---|---|---|
| 19 | Gai Zyra | Đầu lượt: 1 tướng mình ngẫu nhiên gây `a + b·AP` phép lên địch đối diện nó. Mỗi lần trúng cộng 1 Gai; đủ `c` Gai, lá vào mộ và mọi địch nhận `d`. | Nami tích Dậy Sóng, Brand gắn Bỏng mỗi đầu lượt |
| 20 | Vùng Trói Bóng Tối | Khi địch nhận hiệu ứng bất lợi, cộng 1 Bóng. Đủ `a` Bóng: Choáng kẻ đó `b` đơn vị, trừ hết Bóng. | Ashe, Brand, Darius, Lissandra |
| 21 | Kho Tích Vàng | Mỗi Vàng bạn dùng: thêm 1 Kho. Bỏ lá này: rút Kho/`a` lá. | Ornn, Gangplank Thùng Vàng |
| 22 | Thư Viện Ryze | Khi lá vào mộ từ tay phe bạn: 1 tướng mình +`a` AP tới hết lượt. Một lần mỗi lượt: bỏ 1 lá, rút 1 lá. | Viktor, Rumble, Twisted Fate |
| 23 | Tháp Heimerdinger | Cuối lượt: địch ít Máu nhất nhận `a`. Có Rumble, Viktor hoặc Blitzcrank trên sân: thêm `b`. | Kết liễu cho Jinx, Mel ngưỡng hạ |
| 24 | Bãi Mìn Ziggs | Mỗi đầu lượt đối thủ: 1 đường ngẫu nhiên phe địch nổ `a`. Có Gangplank: Thùng cộng thêm 1 Thuốc Súng. | Gangplank |

## Phép Nhanh: 9 lá

| # | Lá | Điều kiện nối Chuỗi | Hiệu ứng | Từ mộ |
|---|---|---|---|---|
| 25 | Phép Khiên Sivir | Địch dùng chiêu nhắm đúng 1 tướng mình | Vô Hiệu, đội hồi `a` mana. | |
| 26 | Biến Hình Lulu | Địch đánh hoặc dùng chiêu đơn mục tiêu | Kẻ đó Mù và Câm Lặng `a` đơn vị, huỷ hành động. | |
| 27 | Nuốt Chửng Tahm Kench | Địch nhắm đúng 1 tướng mình | Tướng đó Bất Động tới hết Chuỗi. Có Braum: Braum nhận `a` Song Giáp. | |
| 28 | Thần Thánh Kayle | Địch sắp hạ 1 tướng mình | Tướng đó giữ 1 Máu. Có Soraka hoặc Renata: hồi thêm `a`% Máu. | |
| 29 | Tường Gió Yasuo | Địch đánh | Huỷ đòn. Có Janna: nhận `a` Gió Thuận. | Loại lá khi địch đánh tướng có Khiên: huỷ đòn đó. |
| 30 | Nhảy Cá Fizz | Địch nhắm đúng 1 tướng mình | Tướng đó né, dời sang đường kề. Có Katarina: 1 Dao rơi đường mới. Có Qiyana: đổi Nguyên Tố. | |
| 31 | Đoàn Kết Shen | Địch đánh 1 tướng mình | 1 đồng minh đổi chỗ vào nhận thay, kèm `a` Khiên. Có Malphite: cả hai vào Liên Kết Đá. | |
| 32 | Vô Hiệu Morgana | Địch dùng lá Phép | Vô Hiệu lá đó. Lá Phép duy nhất trả lời được Phép. | |
| 33 | Phản Xạ Hextech | Địch dùng chiêu nhắm 1 tướng Piltover của bạn | `a`% sát thương dội lại kẻ dùng. Có Mel: thêm `b` Chói Lọi lên kẻ đó. | |

## Phép Thường: 9 lá

| # | Lá | Hiệu ứng | Từ mộ |
|---|---|---|---|
| 34 | Lưỡi Hái Thresh | Chọn 1 tướng mình và 1 địch bất kỳ đường; kéo địch sang đối diện tướng đó, nó gây `a + b·AD` hoặc AP. Có Blitzcrank: cướp 1 lá thêm. | |
| 35 | Tuyết Lở Sejuani | Mọi địch có Buốt: tiêu hết Buốt, Choáng `a + b·số Buốt`. Có Ashe: gây thêm `c` mỗi Buốt. | |
| 36 | Độc Kế Cassiopeia | Chọn 1 tướng mình và 1 địch; `a + b·AP`, gấp đôi nếu địch có Bỏng, Thiêu Đốt hoặc Chảy Máu. | |
| 37 | Thánh Thương Lucian | Chọn 1 Xạ Thủ mình: đánh 2 đòn miễn phí, mỗi đòn `a`%. Hiệu ứng trúng đòn vẫn chạy. | Loại lá: Xạ Thủ đó đánh thêm 1 đòn `b`%. |
| 38 | Bom Khói Akali | Chọn 1 tướng mình; nó và 2 đường kề Tàng Hình `a` đơn vị. Có Qiyana đứng đường Cỏ: thêm 1 đơn vị. | |
| 39 | Tua Ngược Zilean | Chọn 1 lá chiêu không phải R trong mộ bạn: lên tay, tồn tại tới hết lượt đối phương. | |
| 40 | Chuông Bard | Xem `a` lá trên cùng bộ, sắp xếp tuỳ ý. Có Twisted Fate: được đặt 1 lá xuống đáy. | Loại lá: thêm 1 lá E hoặc Q của 1 tướng mình từ bộ lên tay. |
| 41 | Hư Không Thấu Malzahar | Đốt `a` lá bộ đối thủ. Có Yorick: mỗi lá chiêu bị đốt cho 1 Hồn Ma. Có Teemo: xáo thêm `b` Nấm. | |
| 42 | Hội Tụ Sao Băng | Chọn 1 Pháp Sư mình; gây `a + b·AP` lên 1 đường. Mỗi lá chiêu đã dùng lượt này thêm `c`. Có Vel'Koz: mỗi tướng trúng nhận 1 Phân Rã. | |

## Ví dụ combo khi ghép

- **Freljord Buốt:** đặt Băng Nguyên Freljord, Ashe rải Buốt, Tuyết Lở Sejuani Choáng cả bàn, Ashe bắn thêm theo Buốt.
- **Brand một mình cháy cả trận:** Hoả Ấn Rune, Gai Zyra gọi Brand làm người bắn nên mỗi đầu lượt gắn thêm Bỏng, Độc Kế gấp đôi lên kẻ đang Bỏng.
- **Sylas phản Mel:** Mel Phản Quang Chiết Kính trả lời chiêu, Sylas đoạt chính Phản Quang Chiết Kính của Mel địch, Xiềng Cổ Thạch miễn mana lần đầu.
- **Yorick cạn bộ:** Ma Đảo và Cát Cổ, Hư Không Thấu Malzahar cho Hồn Ma, đủ bội số lấy lại R.
- **Vayne giữ trong kho:** Đồng Hồ Kim Quay Ngược, gọi ra lúc tích đủ Bóng Đêm, Thánh Thương Lucian đánh hai đòn nhanh, R nổ.
- **Gangplank bom chậm:** Cảng Bilgewater nổ thêm, Bãi Mìn Ziggs cộng Thuốc Súng mỗi lượt đối thủ.

## Việc engine cần thêm khi chốt

Ô Sân và ô Liên Tục trên bàn, hook "khi địch nhận hiệu ứng bất lợi", hiệu ứng từ mộ, trường vùng đất trong JSON tướng, lá Trang Bị riêng ngoài 3 ô đồ, Vô Hiệu lá Phép trong Chuỗi, UI hiển thị và tooltip cho hai khu vực mới, bot biết dùng.

## Điểm cần thầy chốt

1. Đủ 5 loại Phép, thêm ô Sân chung và 2 ô Liên Tục mỗi bên.
2. Phép không tốn mana, tối đa 3 bản.
3. Sân chung cho cả hai bên, ai cùng vùng đất đều hưởng.
4. Bảng vùng đất của 36 tướng ở trên, đặc biệt Brand ở Freljord và lá gộp "Ma Đảo và Cát Cổ".
