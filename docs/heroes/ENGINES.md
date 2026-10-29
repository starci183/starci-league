# ENGINES: động cơ đội hình + mục đích từng tướng (bản chuẩn để 4 agent cùng bám)

Luật thiết kế (chủ dự án): **một tướng = một mục đích**; nội tại + Q + E + R cùng kể một câu chuyện. Không bộ đếm ẩn (status/stack/marker hiện trên bàn thì được). Q/E/R chỉ là ô lá (Q/E ~6 lá, R hiếm ~2): đặt hiệu ứng chữ ký vào ô hợp nhất, đổi ô thì báo mapping art. Mỗi chiêu = hiệu ứng gốc + 1 điều kiện đọc được từ bàn (tay/mộ/bộ, lá thưởng, mạng, đồ, đường, chuỗi, ô phụ).

## Động cơ (engine)
| id | Tên | Ý |
|---|---|---|
| draw | Rút bài | rút nhiều, biến lá rút thành giá trị |
| grave | Mộ bài | mộ bài là tài nguyên (đếm lá, lấy lại, sao chép) |
| items | Đồ / rèn | đồ, Vàng, mảnh Đồ, Kiệt Tác (stack `itemAmp`) |
| tokens | Ô triệu hồi phụ | vật triệu hồi `g.summonToken` (Tibbers, Thiếu Nữ, Thùng thuốc súng) |
| chain | Chuỗi Quick | lá `quick`/`chainOnly`, ngắt chuỗi bằng Choáng (fizzle) |
| marks | Dấu / kích nổ | status có stack hiện trên tướng, tự cháy hoặc kích nổ |
| lanes | Vị trí đường | kéo, đổi chỗ, cô lập, đường kề |
| mill | Ép cạn bài | Nấm, đốt bộ, sắp xếp bộ địch |
| hand | Phá tay | cướp, bỏ, xem tay đối thủ |
| recycle | Tái chế | xáo mộ vào bộ, đổi lá thừa lấy máu |
| prizes | Lá thưởng / mạng | lật thêm lá thưởng, điều kiện theo mạng |
| scaling | Lớn dần | chết/sống càng lâu càng mạnh, máu là tài nguyên |

## Độ khó (chủ dự án): khoảng 1/3 mỗi loại
- **Đơn giản:** sức mạnh thẳng, một mục đích rõ, cách khắc dễ hiểu (thả diều / chặn / giết trước khi nó lớn). Không cần mind game.
- **Vừa:** có một điều kiện/setup cần đọc bàn.
- **Phức tạp:** thông tin ẩn, đánh cược hai phía, setup nhiều lượt (kiểu Gangplank thùng úp).
Bắt buộc với mọi tướng: một mục đích, chỉ trạng thái nhìn thấy, đối thủ có cách đáp trả thật nhưng tốn kém, không phát Quick tràn lan (Quick chỉ cho tướng phản ứng). Luật token: chỉ đòn đánh của **xạ thủ** nhắm được vật triệu hồi ở ô phụ.

## 30 tướng: mục đích (1 dòng) · engine · combo · bị khắc bởi
| Tướng | Vai | Độ khó | Mục đích | Engine | Combo cùng đội | Bị khắc bởi | Lá Q/E/R |
|---|---|---|---|---|---|---|---|
| darius | Đấu sĩ | Đơn giản | Đao phủ: rải Chảy Máu rồi kết liễu kẻ đang chảy máu | marks, lanes | blitzcrank, leona, nami | soraka, braum | 3/3/2 |
| zed | Sát thủ | Vừa | Một lượt dồn chết: nhân bản lá trong mộ bằng Bóng | grave | nami, blitzcrank | braum, lissandra | 6/4/2 |
| katarina | Sát thủ | Vừa | Mưa dao găm: tạo lá Dao tạm, hạ gục thì lấy lại chiêu từ mộ | grave, lanes | leona, lux | garen, lissandra, ornn | 6/5/2 |
| khazix | Sát thủ | Vừa | Săn mồi cô lập; tiến hoá theo lá thưởng đã lật | lanes, prizes | brand, blitzcrank | garen, leona, annie | 5/4/2 |
| qiyana | Sát thủ | Phức tạp | Nguyên tố = lá trên cùng mộ bài; tự đốt bài để đổi | grave, mill | teemo, malphite | lux, braum | 5/4/2 |
| aatrox | Đấu sĩ | Đơn giản | Máu là đạn: tiêu máu mình để chém, yếu máu thì nguy hiểm | prizes, scaling | soraka, janna, leona | lissandra, vayne | 4/3/1 |
| garen | Đấu sĩ | Đơn giản | Công lý: trừng phạt phe đang dẫn trước (nhiều đồ/mạng/bài hơn) | items | ornn, janna, soraka | kogmaw, vayne, aatrox | 4/3/1 |
| vayne | Xạ thủ | Vừa | Săn tank: 3 Mũi Tên Bạc theo % máu, Kết Án ghim tường giữa chuỗi | marks, lanes | janna, ornn | ahri, khazix | 5/4/2 |
| braum | Đỡ đòn | Vừa | Chỉ chơi trong lượt đối thủ: mọi lá là phản ứng | chain | kogmaw, viktor, jinx | twistedfate, malphite | 9/7/3 |
| blitzcrank | Đỡ đòn | Phức tạp | Cướp bài: lá của đối thủ thành vũ khí của mình | hand, lanes | darius, teemo, renata | nami, soraka | 10/6/3 |
| leona | Đỡ đòn | Vừa | Khoá chặt: Choáng/ngắt chuỗi, Ánh Dương cho đồng đội kích nổ | marks, lanes | darius, jinx, aatrox | malphite, kogmaw | 6/5/2 |
| malphite | Đỡ đòn | Đơn giản | Giáp là tất cả; R không thể bị nối chuỗi | items | ornn, leona | kogmaw, vayne, jinx | 4/4/2 |
| ornn | Đỡ đòn | Phức tạp | Lò rèn của đội: cấp mảnh Đồ, tiêu Vàng rèn Kiệt Tác | items | gangplank, garen, jinx, malphite | blitzcrank, renata | 3/3/1 |
| janna | Trợ thủ | Vừa | Chống đòn đánh: thổi bay đòn tay giữa chuỗi | marks | jinx, vayne, kogmaw | malphite, blitzcrank | 4/3/1 |
| soraka | Trợ thủ | Đơn giản | Bền bài: lá thừa thành máu, xáo mộ để không bao giờ cạn | recycle | kogmaw, nami, garen | zed, katarina | 5/5/2 |
| yorick | Đấu sĩ | Phức tạp | Người chăn hồn: lá Yorick trong mộ = linh hồn, Thiếu Nữ ở ô phụ | grave, tokens | zed, viktor | lux, gangplank, brand | 6/4/2 |
| kogmaw | Xạ thủ | Đơn giản | Lớn lên từ cái chết: Kog Stack sống/chết đều tăng | scaling | braum, soraka, nami | teemo, darius, ashe | 5/4/2 |
| jinx | Xạ thủ | Đơn giản | Phấn khích dây chuyền: mỗi hạ gục mở đòn tiếp + bài | items, draw | ornn, nami, leona | zed, janna | 5/4/2 |
| ashe | Xạ thủ | Đơn giản | Đóng băng nhịp đối thủ: Buốt tướng, đẩy lá chiêu địch xuống đáy bộ | mill, marks | teemo, lissandra | zed, khazix | 5/5/2 |
| lux | Pháp sư | Vừa | Chiếu Sáng rồi kích nổ; R xuyên cả hàng | marks | leona, ahri, nami | katarina, khazix | 8/8/2 |
| ahri | Pháp sư | Vừa | Quyến Rũ rồi khai thác mục tiêu bị Quyến Rũ | lanes | lux, leona | yorick, braum | 8/8/2 |
| annie | Pháp sư | Đơn giản | Gấu Tibbers ở ô phụ là trung tâm mọi lá | tokens, grave | braum, janna | gangplank, katarina, viktor | 8/6/2 |
| lissandra | Pháp sư | Vừa | Băng giá: Buốt là chìa khoá; Quan Tài Băng nối chuỗi | chain, prizes | ashe, brand | malphite, twistedfate | 10/10/3 |
| gangplank | Đấu sĩ | Phức tạp | Thùng thuốc súng ở ô phụ, kích nổ bằng Quick giữa lượt địch | items, tokens, prizes | ornn, twistedfate | vayne, katarina | 5/4/2 |
| renata | Trợ thủ | Phức tạp | Lật kèo: đồng minh sắp chết vẫn đứng dậy, địch càng mạnh càng tự hại | hand, chain | blitzcrank, lux | twistedfate, malphite | 5/4/1 |
| brand | Pháp sư | Phức tạp | Lửa lan: Bỏng (stack hiện) tự cháy mỗi lượt hoặc kích nổ ngay; chết thì lan | marks | khazix, lissandra, lux | soraka, janna | 8/7/2 |
| nami | Trợ thủ | Đơn giản | Thuỷ triều nuôi bài: mỗi lá rút thành sức mạnh cho đồng đội | draw | viktor, zed, jinx | teemo, renata | 3/3/1 |
| viktor | Pháp sư | Phức tạp | Tiến hoá bằng mộ bài: mỗi 3 lá Viktor trong mộ = 1 bậc | grave, draw | nami, twistedfate, braum | zed, blitzcrank | 8/7/2 |
| twistedfate | Pháp sư | Phức tạp | Kiểm soát bộ bài: tìm lá, soi/huỷ Nấm, xem và phá tay | draw, hand | darius, zed, viktor | blitzcrank, qiyana | 7/6/2 |
| teemo | Xạ thủ | Phức tạp | Ép cạn bài: Nấm trong bộ địch, rút càng nhiều càng nổ | mill | ashe, blitzcrank, qiyana | twistedfate, soraka | 6/5/2 |

Vòng khắc chế chính: Nami/Viktor (rút nhiều) ← Teemo (Nấm) ← Twisted Fate/Ashe (soi, huỷ/đẩy Nấm) ← Blitzcrank (cướp lá vừa tìm) ← Nami/Soraka (bù bài). Dồn chết (Zed, Darius, Katarina) ← phản ứng (Braum, Lissandra, Janna) ← không thể nối chuỗi / soi tay (Malphite, Twisted Fate) ← rã giáp (Kog'Maw, Vayne).
"Combo"/"bị khắc" là dữ liệu trong `packages/shared/src/cardgame/synergy.ts` (SYNERGY); "khắc ai" suy ra tự động. `npx tsx scripts/card_selfplay.ts 1000 5 1 --jobs=25 --pairs` in tỉ lệ thắng từng cặp.
