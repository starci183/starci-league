# ITEMS V2: thiết kế lại đồ cho chế độ thẻ bài

> Bản trên giấy. Số liệu là gợi ý thô, con số thật sẽ chỉnh bằng mô phỏng (`card_selfplay`).
> Thay cho `docs/ITEMS_CARD.md` khi code. Luật nền: `docs/ENGINE_V2_SPEC.md` (gồm mục "Owner decisions"); tướng: `docs/heroes/REDESIGN_V2.md`.

## 0. Tóm tắt
- **8 mảnh** (giữ nguyên) và **36 món** (giữ bảng ghép 8×8: mỗi cặp mảnh ra đúng 1 món).
- 31 món giữ id (có icon sẵn), **5 món mới dùng id/icon LoL đã có** trong `public/card_items` và `public/items`; 5 món cũ bị bỏ.
- **Luật sức mạnh:** mỗi món hoàn chỉnh nhân sức mạnh tướng (Máu hiệu dụng × Sát thương mỗi lượt) **×1,5 đến ×2**; 3 món đúng hướng ≈ **×5–7**, vượt 4 tướng trắng (ngưỡng ×4).
- Mảnh: đeo riêng được, mỗi mảnh khoảng **+20%** (nhỏ hơn món nhiều).

## 1. Luật áp dụng (từ V2)
| Luật V2 | Hệ quả cho đồ |
|---|---|
| Tối đa 3 đòn đánh/lượt mỗi người chơi, tính mọi đòn | **Không có món cho thêm đòn.** Đồ tăng *giá trị mỗi đòn* hoặc gây sát thương ngoài đòn đánh. |
| Đấu sĩ có đòn Quick 66% không cần lá | Có món thưởng cho việc đánh/chiêu Quick trong lượt địch (Ngọn Giáo Shojin). |
| Pháp sư dùng mana (×10: +10/lượt, tối đa mặc định 100, giá chiêu lẻ 15, 25…) | 5 món mana: tăng mana tối đa, mana mỗi lượt, giảm giá, nạp mana bằng đòn đánh. Dùng API có sẵn `maxMana`, `manaRegen`, `manaCostMod`. |
| Tướng chết nằm lại đường, hồi sinh tại chỗ | Đồ và bộ đếm của đồ ở lại qua chết. Giáp Thiên Thần đứng dậy ngay tại đường. |
| Mỗi trạng thái riêng chỉ thuộc 1 tướng (Chảy Máu, Bỏng, Dồn, Buốt, Đóng Băng, Đói, Tội, Điên) | Đồ **không gắn** trạng thái riêng của tướng; chỉ *khuếch đại* chúng (Cuồng Đao Guinsoo). Đồ chỉ dùng trạng thái chung: Choáng, Câm Lặng, Mê, Khiên, Giáp. |
| Đồ đã đeo không tháo, tối đa 3 ô | Giữ nguyên. |

## 2. Nguyên tắc thiết kế đồ (giống nguyên tắc tướng)
1. **Một món, một việc.** Mỗi món có đúng một bản sắc, đọc tên là biết dùng cho ai.
2. **Chữ ngắn:** chỉ số + tối đa một câu hiệu ứng.
3. **Hoặc chỉ số khủng, hoặc hiệu ứng mạnh.** Không có kiểu "ít chỉ số + hiệu ứng tí hon". Món thuần chỉ số cho **+100% trục của nó** (vd +75 AD trên tướng 75 AD).
4. **Đồ một trục tụt giá trị:** 3 món cùng trục chỉ ×4 (hoà 4 tướng trắng); muốn vượt hẳn phải lên đồ phối hợp (công + thủ + hiệu ứng). Đây là chủ ý: thưởng cho build có suy nghĩ.
5. Không chép chữ LoL; chỉ lấy hương vị (tên, icon, cảm giác món).
6. Có món trả thưởng cho cơ chế tướng: cộng dồn (Cuồng Đao), Quick (Shojin), mana (5 món), hạ gục (Kẻ Thu Thập, Áo Choàng Bóng Tối), hồi máu/Khiên (Chuộc Tội, Vuốt Rồng), đứng đối diện (Khiên Hư Vô).

## 3. Mảnh đồ (8)
**Mới:** mảnh **đeo riêng được** (chiếm 1 ô). Tướng đang mang 1 mảnh có thể nhận thêm 1 mảnh + 1 Vàng để **ghép tại chỗ** thành món theo bảng ghép (mảnh trong ô biến thành món, không tốn thêm ô). Ghép trên tay (2 Đồ + 1 Vàng → lá đồ huyền thoại) vẫn giữ nguyên.

| id | Tên | Chỉ số khi đeo riêng (~+20%) | Hướng khi ghép |
|---|---|---|---|
| kiem_dai | Kiếm Dài | +15 AD | đòn đánh, kết liễu |
| gay_qua_kho | Gậy Quá Khổ | +20 AP | chiêu |
| cung_go | Cung Gỗ | +15% sát thương đòn đánh | hiệu ứng theo đòn |
| gang_tay | Găng Tay | +15% chí mạng | chí mạng, kết liễu |
| giap_luoi | Giáp Lưới | +20 Giáp | chống đòn đánh, phản đòn |
| ao_choang | Áo Choàng Phủ Phép | +20 Kháng phép | chống chiêu, chống khống chế |
| dai_khong_lo | Đai Khổng Lồ | +100 Máu | trâu, theo % máu |
| nuoc_mat | Nước Mắt Nữ Thần | +10% sát thương chiêu; pháp sư thêm +20 mana tối đa | mana, Quick, trợ thủ |

Chỉ số mảnh **không** cộng vào món ghép (món dùng chỉ số trong bảng mục 5).

## 4. Bảng ghép 8×8
Ký hiệu: Kiếm = Kiếm Dài, Gậy = Gậy Quá Khổ, Cung = Cung Gỗ, Găng = Găng Tay, Giáp = Giáp Lưới, Áo = Áo Choàng, Đai = Đai Khổng Lồ, NM = Nước Mắt. **Đậm** = món mới hoặc đổi công thức.

| | Kiếm | Gậy | Cung | Găng | Giáp | Áo | Đai | NM |
|---|---|---|---|---|---|---|---|---|
| **Kiếm** | Kiếm Tử Thần | Súng Hextech | Lời Nhắc Tử Vong | Vô Cực Kiếm | Áo Choàng Bóng Tối | Huyết Kiếm | Móng Vuốt Sterak | Ngọn Giáo Shojin |
| **Gậy** | | Mũ Rabadon | Cuồng Đao Guinsoo | Găng Bảo Thạch | Vương Miện Bảo Hộ | Quỷ Thư Morello | Mặt Nạ Liandry | Trượng Trường Sinh |
| **Cung** | | | Đại Bác Liên Thanh | Diệt Khổng Lồ | **Tim Băng** | **Sát Thủ Kraken** | **Ý Chí Titan** | **Thần Kiếm Manamune** |
| **Găng** | | | | **Kẻ Thu Thập** | Giáp Thiên Thần | Khăn Giải Thuật | **Tim Khổng Thần** | **Bạn Đồng Hành Luden** |
| **Giáp** | | | | | Áo Choàng Gai | Giáp Gargoyle | Áo Choàng Lửa | Lời Thề Hộ Vệ |
| **Áo** | | | | | | Vuốt Rồng | Khiên Hư Vô | Mũ Thích Nghi |
| **Đai** | | | | | | | Giáp Máu Warmog | Dây Chuyền Chuộc Tội |
| **NM** | | | | | | | | Bùa Lam |

## 5. 36 món

Tướng mẫu để tính: Máu 400, Giáp/KP 30, AD 75. "AD/AP thích ứng" = AD với tướng sát thương vật lý, AP với tướng sát thương phép.

### 5.1 Đòn đánh và kết liễu (Xạ thủ, Đấu sĩ, Sát thủ)
| # | id | Tên | Ghép | Chỉ số | Hiệu ứng (1 câu) | Vai trò / hợp với |
|---|---|---|---|---|---|---|
| 1 | kiem_tu_than | Kiếm Tử Thần | Kiếm+Kiếm | **+75 AD** | Không (thuần chỉ số). | Mọi tướng đánh; Ornn E (Kiệt Tác ×2) |
| 2 | vo_cuc_kiem | Vô Cực Kiếm | Kiếm+Găng | +30 AD, +25% chí mạng | Chí mạng của tướng đeo gây ×2,25 thay vì ×1,5. | Zed (E mọi đòn chí mạng), Jinx, Vayne |
| 3 | sat_thu_kraken | Sát Thủ Kraken *(mới)* | Cung+Áo | +30 AD, +20 KP | Mỗi đòn đánh của tướng đeo trong cùng lượt gây thêm 25% so với đòn trước (đòn 2 +25%, đòn 3 +50%). | Xạ thủ ăn trọn 3 đòn; Vayne, Nami Q |
| 4 | huyet_kiem | Huyết Kiếm | Kiếm+Áo | +35 AD, +20 KP | Đòn đánh của tướng đeo hút 35% sát thương gây ra; máu hồi dư thành Khiên (tối đa 25% máu tối đa). | Xạ thủ đứng lâu, Aatrox |
| 5 | loi_nhac_tu_vong | Lời Nhắc Tử Vong | Kiếm+Cung | +50 AD | Địch nhận sát thương từ tướng đeo không được hồi máu hay nhận Khiên đến hết lượt kế tiếp của nó. | Khắc Soraka, Janna, Aatrox, Nami R |
| 6 | diet_khong_lo | Diệt Khổng Lồ | Cung+Găng | +35 AD, +20% chí mạng | Tướng đeo gây thêm 40% sát thương lên địch có máu tối đa cao hơn nó. | Khắc đỡ đòn; Kog'Maw, Vayne |
| 7 | dai_bac | Đại Bác Liên Thanh | Cung+Cung | +60% sát thương đòn đánh | Đòn đánh của tướng đeo chọn được mọi tướng địch, kể cả ô phụ (như Xạ thủ). | Xạ thủ: thuần chỉ số; đấu sĩ/sát thủ: bắn hàng sau, đánh Thùng/Tibbers |
| 8 | ke_thu_thap | Kẻ Thu Thập *(mới)* | Găng+Găng | +40 AD, +25% chí mạng | Đòn đánh hoặc chiêu của tướng đeo để 1 địch còn dưới 15% máu tối đa thì hạ luôn địch đó. | Kết liễu: Jinx (Điên), Katarina (chuỗi), Darius R |
| 9 | ao_choang_bong_toi | Áo Choàng Bóng Tối | Kiếm+Giáp | +45 AD, +30 Giáp | Khi tướng đeo hạ gục 1 địch: nó không thể bị chọn làm mục tiêu đến hết lượt kế tiếp của địch. | Sát thủ lao vào rồi sống: Katarina, Zed, Qiyana |
| 10 | sung_hextech | Súng Hextech | Kiếm+Gậy | +45 AD | Mỗi lá chiêu gây sát thương của tướng đeo gây thêm sát thương vật lý bằng 80% AD lên mỗi mục tiêu (1 lần mỗi mục tiêu mỗi lá). | Tướng đánh bằng chiêu AD: Garen Q/R, Zed Q, Darius Q, Qiyana, Gangplank |

### 5.2 Đấu sĩ và lối chơi Quick
| # | id | Tên | Ghép | Chỉ số | Hiệu ứng | Vai trò / hợp với |
|---|---|---|---|---|---|---|
| 11 | sterak | Móng Vuốt Sterak | Kiếm+Đai | +20 AD, +150 Máu | Lần đầu mỗi lượt máu tướng đeo xuống dưới 40%: nó nhận Khiên bằng 35% máu tối đa. | Đấu sĩ chịu dồn: Darius, Garen, Aatrox |
| 12 | giao_shojin | Ngọn Giáo Shojin | Kiếm+NM | +40 AD | Đòn đánh và chiêu tướng đeo dùng trong **lượt địch** (Quick) gây gấp đôi sát thương. | Đòn Quick 66% của đấu sĩ (→132%), Aatrox E, Braum, Renata E |
| 13 | y_chi_titan | Ý Chí Titan *(đổi công thức)* | Cung+Đai | +150 Máu | Đòn đánh của tướng đeo gây thêm sát thương vật lý bằng 5% máu tối đa của nó. | Đấu sĩ/đỡ đòn máu trâu: Yorick (máu theo mộ), Garen |
| 14 | cuong_dao | Cuồng Đao Guinsoo | Gậy+Cung | +45 AD/AP thích ứng | Mỗi lần tướng đeo cộng cộng dồn riêng của nó (Chảy Máu, Bỏng, Dồn, Buốt, Tội, Đói, Điên), cộng thêm 1. | **Món cộng dồn:** Darius, Brand, Zed, Ashe, Garen, Kog'Maw, Jinx |
| 15 | tim_khong_than | Tim Khổng Thần *(mới)* | Găng+Đai | +150 Máu | Đầu mỗi lượt của bạn: tướng đeo +40 máu tối đa vĩnh viễn (tối đa +400, giữ qua chết). | Lớn theo trận: Kog'Maw, đỡ đòn, Yorick |

### 5.3 Pháp sư và mana
| # | id | Tên | Ghép | Chỉ số | Hiệu ứng | Vai trò / hợp với |
|---|---|---|---|---|---|---|
| 16 | mu_rabadon | Mũ Phù Thủy Rabadon | Gậy+Gậy | **+70 AP** | Tổng AP của tướng đeo +30%. | Mọi pháp sư (thuần sức mạnh) |
| 17 | bua_lam | Bùa Lam | NM+NM | +20 AP | Tướng đeo hồi thêm 10 mana mỗi lượt (gấp đôi) và +20 mana tối đa. | **Hồi mana:** Brand spam, Viktor, Lissandra |
| 18 | truong_truong_sinh | Trượng Trường Sinh | Gậy+NM | +40 mana tối đa | Tướng đeo +1 AP cho mỗi 2 mana tối đa (100+40 → +70 AP). | **Kho mana:** Lux (nội tại theo mana, R xả hết) |
| 19 | ban_dong_hanh_luden | Bạn Đồng Hành Luden *(mới)* | Găng+NM | +30 AP | Chiêu của tướng đeo tốn ít hơn 30% mana (làm tròn xuống bội 5). | **Giảm giá:** Ahri, Annie, TF, Brand |
| 20 | than_kiem_manamune | Thần Kiếm Manamune *(mới)* | Cung+NM | +40 AP | Đòn đánh của tướng đeo gây thêm sát thương phép bằng 60% AP và hồi 15 mana. | **Pháp sư đánh tay:** dùng lá Đánh Thường để nạp mana |
| 21 | mat_na_liandry | Mặt Nạ Liandry | Gậy+Đai | +40 AP, +150 Máu | Chiêu của tướng đeo gây thêm sát thương phép bằng 6% máu tối đa của mỗi mục tiêu. | Pháp sư khắc đỡ đòn; chiêu "mọi địch" (Brand E, Viktor E) |
| 22 | quy_thu | Quỷ Thư Morello | Gậy+Áo | +50 AP, +30 KP | Lần đầu mỗi lượt chiêu của tướng đeo gây sát thương lên 1 địch: địch đó bị Câm Lặng đến hết lượt kế tiếp của nó. | Khống chế bằng chiêu; khắc Lux, Soraka, pháp sư địch |
| 23 | gang_bao_thach | Găng Bảo Thạch | Gậy+Găng | +40 AP, +30% chí mạng | Chiêu của tướng đeo chí mạng được theo tỉ lệ chí mạng của nó (×1,75). | Pháp sư bạo kích; Zed E (mọi đòn chí mạng) không tính chiêu |
| 24 | vuong_mien | Vương Miện Bảo Hộ | Gậy+Giáp | +50 AP, +45 Giáp | Một lần mỗi mạng: khi máu tướng đeo xuống dưới 30%, nó không nhận sát thương đến hết lượt đó. | Pháp sư sống sót qua lượt bị dồn |

### 5.4 Đỡ đòn
| # | id | Tên | Ghép | Chỉ số | Hiệu ứng | Vai trò / hợp với |
|---|---|---|---|---|---|---|
| 25 | giap_warmog | Giáp Máu Warmog | Đai+Đai | **+400 Máu** | Không (thuần chỉ số). | Mọi tướng; Ornn E |
| 26 | giap_gargoyle | Giáp Gargoyle | Giáp+Áo | **+100 Máu, +55 Giáp, +55 KP** | Không (thuần chỉ số). | Đỡ đòn đa năng |
| 27 | ao_choang_gai | Áo Choàng Gai | Giáp+Giáp | +80 Giáp | Địch đánh trúng tướng đeo nhận sát thương phép bằng 20 + 40% Giáp của tướng đeo. | Phạt đòn đánh: Malphite, Braum, Renata E |
| 28 | tim_bang | Tim Băng *(đổi công thức)* | Cung+Giáp | +60 Giáp, +100 Máu | Mọi tướng địch gây ít hơn 20% sát thương bằng đòn đánh. | Hào quang chống Xạ thủ; cộng với Buốt của Ashe |
| 29 | ao_choang_lua | Áo Choàng Lửa | Giáp+Đai | +200 Máu, +30 Giáp | Đầu lượt của bạn: mọi tướng địch nhận sát thương phép bằng 5% máu tối đa của tướng đeo. | Đỡ đòn gây sát thương đều không cần lá |
| 30 | khien_hu_vo | Khiên Hư Vô | Áo+Đai | +250 Máu, +40 KP | Tướng địch đối diện tướng đeo nhận thêm 30% sát thương từ mọi nguồn. | Đỡ đòn mở đường cho đồng đội (đối diện chết: không có tác dụng) |
| 31 | khan_giai_thuat | Khăn Giải Thuật | Găng+Áo | +55 KP, +150 Máu | Hiệu ứng khống chế đầu tiên mỗi lượt lên tướng đeo (Choáng, Câm Lặng, Mê, Đóng Băng) bị huỷ. | Khắc Leona, Lissandra, Ahri, Blitzcrank R, Braum |
| 32 | giap_thien_than | Giáp Thiên Thần | Găng+Giáp | +35 Giáp, +35 KP | Lần đầu tướng đeo bị hạ trong trận: nó đứng dậy ngay tại đường với 50% máu và đối thủ không nhận mạng. Bộ đếm 1/1. | Giữ mạng cho tướng gánh; dùng luật "chết nằm lại đường" |

### 5.5 Trợ thủ và bảo vệ
| # | id | Tên | Ghép | Chỉ số | Hiệu ứng | Vai trò / hợp với |
|---|---|---|---|---|---|---|
| 33 | day_chuyen_chuoc_toi | Dây Chuyền Chuộc Tội | Đai+NM | +200 Máu | Hồi máu, Khiên và Giáp mà tướng đeo ban ra mạnh hơn 60%. | Soraka, Janna, Nami R, Renata Q |
| 34 | vuot_rong | Vuốt Rồng | Áo+Áo | +55 KP, +150 Máu | Hồi máu và Khiên tướng đeo nhận mạnh hơn 60%. | Aatrox (hút máu), Huyết Kiếm, đội có trợ thủ hồi |
| 35 | loi_the_ho_ve | Lời Thề Hộ Vệ | Giáp+NM | +40 Giáp, +150 Máu | Tướng đeo gánh thay 25% sát thương mọi đồng minh khác nhận. | Đỡ đòn bảo kê carry; hợp Soraka, Braum |
| 36 | mu_thich_nghi | Mũ Thích Nghi | Áo+NM | +40 AP, +50 KP | Chiêu địch đầu tiên mỗi lượt có tướng đeo là mục tiêu không ảnh hưởng tướng đeo (lá địch vẫn bị tiêu). | Bảo kê pháp sư/trợ thủ mỏng; khắc Ahri E, Leona Q |

## 6. Phủ vai trò và cơ chế
| Vai trò / cơ chế | Món chính |
|---|---|
| Xạ thủ | Vô Cực Kiếm, Sát Thủ Kraken, Huyết Kiếm, Đại Bác, Diệt Khổng Lồ, Lời Nhắc Tử Vong |
| Đấu sĩ | Sterak, Ngọn Giáo Shojin, Ý Chí Titan, Súng Hextech, Cuồng Đao |
| Sát thủ | Kẻ Thu Thập, Áo Choàng Bóng Tối, Súng Hextech, Vô Cực Kiếm |
| Pháp sư | Rabadon, Bùa Lam, Trượng Trường Sinh, Luden, Manamune, Liandry, Morello, Găng Bảo Thạch, Vương Miện |
| Đỡ đòn | Warmog, Gargoyle, Áo Choàng Gai, Tim Băng, Áo Choàng Lửa, Khiên Hư Vô, Khăn Giải Thuật, Tim Khổng Thần |
| Trợ thủ | Chuộc Tội, Vuốt Rồng, Lời Thề Hộ Vệ, Mũ Thích Nghi |
| Cộng dồn riêng (Chảy Máu, Bỏng, Dồn, Buốt, Tội, Đói, Điên) | Cuồng Đao Guinsoo |
| Quick (đòn Quick 66%, chiêu Quick) | Ngọn Giáo Shojin |
| Mana | Bùa Lam (hồi/lượt), Trượng Trường Sinh (tối đa), Luden (giảm giá), Manamune (nạp bằng đòn), Nước Mắt (mảnh) |
| Hạ gục / mạng | Kẻ Thu Thập, Áo Choàng Bóng Tối, Giáp Thiên Thần |
| Khống chế / chống khống chế | Quỷ Thư Morello (Câm Lặng) · Khăn Giải Thuật, Mũ Thích Nghi |
| Chống hồi | Lời Nhắc Tử Vong |
| Đồ của Ornn (Kiệt Tác ×2 chỉ số) | Món thuần chỉ số lợi nhất: Kiếm Tử Thần, Rabadon, Warmog, Gargoyle |

## 7. Kiểm tra sức mạnh (power check)
Mô hình thô: **Sức mạnh = Máu hiệu dụng × Sát thương mỗi lượt**, so với tướng trắng (= ×1). Máu hiệu dụng = Máu × (1 + kháng/100). Sát thương = 3 đòn/lượt (đấu sĩ 2 đòn + 1 Quick), pháp sư = số lần dùng chiêu trong 6 lượt × (80 + AP).

**Vì sao ngưỡng là ×4:** giới hạn 3 đòn tính theo người chơi, nên 4 tướng trắng vẫn chỉ đánh 3 đòn/lượt như 1 tướng; lợi thế của họ là tổng máu ×4 và nhiều lá chiêu sống hơn. Vậy 1 tướng đủ đồ thắng khi sức mạnh > ×4; mục tiêu **×5–7** để bù phần chiêu của 4 tướng.

| Build (theo thứ tự lên đồ) | 0 đồ | 1 món | 2 món | 3 món | Mỗi món |
|---|---|---|---|---|---|
| Xạ thủ: Vô Cực → Kraken → Huyết Kiếm | ×1 | ×1,8 | ×3,2 | **×5,6** | +84% / +73% / +75% |
| Đấu sĩ: Sterak → Ý Chí Titan → Shojin | ×1 | ×2,1 | ×3,6 | **×5,5** | +109% / +74% / +52% |
| Sát thủ: Kiếm Tử Thần → Hextech → Bóng Tối | ×1 | ×2,0 | ×3,4 | **×5,8** | +100% / +69% / +71% |
| Đỡ đòn: Gargoyle → Áo Choàng Gai → Áo Choàng Lửa | ×1 | ×1,8 | ×3,4 | **×7,1** | +78% / +91% / +108% |
| Pháp sư: Rabadon → Bùa Lam → Liandry | ×1 | ×2,0 | ×3,5 | **×7,2** | +98% / +75% / +108% |
| Pháp sư mana: Bùa Lam → Luden → Trượng Trường Sinh | ×1 | ×1,9 | ×3,5 | **×6,3** | +88% / +86% / +79% |
| 3× Kiếm Tử Thần (cùng trục) | ×1 | ×2,0 | ×3,0 | ×4,0 (hoà) | +100% / +50% / +33% |
| 3× Warmog (cùng trục) | ×1 | ×2,0 | ×3,0 | ×4,0 (hoà) | +100% / +50% / +33% |
| Tham chiếu: 1 mảnh | ×1 | ×1,2 | | | ~+20% |

Đọc bảng:
- Mọi món đầu tiên ≥ ×1,8; mọi món sau ≥ +50% so với sức mạnh hiện tại.
- Build phối hợp 3 món ≈ ×5–7 > ×4: thắng 4 tướng trắng. Đỡ đòn và pháp sư cao nhất vì sát thương của họ đi ngoài 3 đòn (hào quang, phản đòn, chiêu), là chỗ đầu tiên cần mô phỏng để hạ số.
- Build một trục chỉ chạm ×4 (nguyên tắc 4).
- Giá: 1 món = 2 mảnh + 1 Vàng (3 lá) + 1 lần đeo. Bộ 40 lá chung mặc định có ~10 mảnh, 8 Vàng, nên mỗi trận thường ra 2–3 món. Đắt và hiếm nên được phép to.

Số trong bảng tính từ script thô (tướng mẫu ở mục 5). Khi code, chạy `card_selfplay` và chỉnh để: tỉ lệ thắng theo tướng lệch không quá ±5% so với không đồ; 1 tướng 3 món vs 4 tướng trắng thắng ≥ 60%.

## 8. Thay đổi so với ITEMS_CARD.md
| Món | Thay đổi |
|---|---|
| Bỏ: gang_dao_tac (Găng Đạo Tặc), cung_runaan (Cuồng Cung Runaan), nanh_nashor (Nanh Nashor), dao_dien (Dao Điện Statikk), ban_tay_cong_ly (Bàn Tay Công Lý) | Hiệu ứng nhỏ, bắn lan, hoặc trùng việc. Icon vẫn để đó, không dùng. |
| Mới: sat_thu_kraken (Kraken Slayer), ke_thu_thap (The Collector), than_kiem_manamune (Manamune), ban_dong_hanh_luden (Luden's), tim_khong_than | Icon đã có ở `public/card_items/` và `public/items/`. `tim_khong_than` chưa có tên EN trong `i18n/lol_en.ts`: đề xuất thêm "Heartsteel" (cần xác nhận icon). `ban_dong_hanh_luden` EN hiện là "Luden's Echo". |
| Đổi công thức: y_chi_titan (Cung+Giáp → Cung+Đai), tim_bang (Găng+Đai → Cung+Giáp) | Titan theo máu nên đi với Đai; Tim Băng là món Giáp. |
| Viết lại hiệu ứng: mọi món còn lại | Theo mục 5 (một việc, số to). Bỏ Thiêu Đốt, Vết Thương Sâu, Rã Giáp, Tàng Hình, Khiêu Khích, Buốt khỏi đồ (trạng thái riêng của tướng hoặc không còn trong V2). |
| Mảnh | Đeo riêng được; ghép tại chỗ (mục 3). Nước Mắt: bỏ +10 AP, thành +10% sát thương chiêu / +20 mana tối đa cho pháp sư. |

## 9. Việc cho engine (khi code đồ, ngoài phần A đang làm)
| Cần | Dùng cho |
|---|---|
| `maxMana`, `manaRegen`, `manaCostMod` (đã có trong `CardItemDef` V2) | Bùa Lam, Trượng Trường Sinh, Luden, Nước Mắt |
| Chỉ số thích ứng (`adaptive`: AD nếu tướng vật lý, AP nếu tướng phép) | Cuồng Đao Guinsoo |
| Hook khi tướng cộng cộng dồn riêng (vd `onHeroStack {src, target, key, n}`), cho phép đồ sửa `n` | Cuồng Đao Guinsoo |
| Đếm đòn đánh của từng tướng trong lượt | Sát Thủ Kraken |
| Biết hành động diễn ra trong lượt địch (`g.s.active !== me.side`) cho sát thương nhân 2 | Ngọn Giáo Shojin |
| Cờ "không thể bị chọn làm mục tiêu" có thời hạn | Áo Choàng Bóng Tối |
| Huỷ hiệu ứng khống chế đầu tiên mỗi lượt; huỷ chiêu đầu tiên nhắm vào tướng | Khăn Giải Thuật, Mũ Thích Nghi |
| `onLethal` đứng dậy tại đường, không trao mạng | Giáp Thiên Thần |
| Chặn hồi máu/Khiên có thời hạn | Lời Nhắc Tử Vong |
| Chia sát thương sang tướng đeo | Lời Thề Hộ Vệ |
| Hệ số hồi/Khiên/Giáp **ban ra** (`healGivenMult`) bên cạnh `healMult` (nhận vào) | Dây Chuyền Chuộc Tội / Vuốt Rồng |
| Hào quang giảm sát thương đòn đánh của mọi địch; tăng sát thương nhận của địch đối diện | Tim Băng, Khiên Hư Vô |
| Chiêu chí mạng; hạ ngay dưới ngưỡng | Găng Bảo Thạch, Kẻ Thu Thập |
| Đeo mảnh vào ô và ghép tại chỗ (mảnh + Vàng lên tướng đang mang mảnh) | Mục 3 |
