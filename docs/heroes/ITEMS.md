# Bảng đồ 36 món (bản chốt với thầy, 01/11/2026)

Luật ở `law.md` mục 11d. Mỗi món 1 nội tại, sức mạnh ở chỉ số. `a, b, c, d` là tham số của từng món, số thật nằm trong JSON cân bằng. Không món nào giảm mana chiêu.

Món chí mạng cho **50%** chí mạng, mặc 2 món là đủ 100%.

Lá miễn phí của đồ mana: lá chiêu tạm của tướng đeo, không tốn mana, tồn tại tới hết lượt đối phương. Tỉ lệ nhận lá R thấp hơn Q, E.

`RULES.lethalOrder` mới: Renata P, Aatrox R, Giáp Thiên Thần, Áo Choàng Bóng Tối. Bỏ `hero:soraka` và `item:truong_truong_sinh`.

| Món (id) | Ghép | Chỉ số | Nội tại | Mang cho |
|---|---|---|---|---|
| Kiếm Tử Thần (`kiem_tu_than`) | Kiếm + Kiếm | `a` AD lớn nhất | Không có | Mọi tướng AD |
| Kiếm Súng Hextech (`sung_hextech`) | Kiếm + Gậy | `a` AD, `b` AP | Hồi `c`% sát thương thực gây ra | Xạ thủ, Pháp sư, Đấu sĩ cần hút Máu |
| Cuồng Đao (`cuong_dao`) | Kiếm + Cung | `a` AD, `b` Tốc Đánh | Mỗi đòn trúng +`c` Tốc Đánh vĩnh viễn, tối đa `d` | Xạ thủ đánh lâu |
| Vô Cực Kiếm (`vo_cuc_kiem`) | Kiếm + Găng | `a` AD, 50% chí mạng | Đòn chí mạng bỏ qua `b` Giáp | Xạ thủ, Sát thủ đánh thường |
| Áo Choàng Bóng Tối (`ao_choang_bong_toi`) | Kiếm + Giáp | `a` AD, `b` Giáp | Sắp bị hạ: giữ 1 Máu, 1 lần mỗi trận | Sát thủ nhảy vào |
| Đao Tím (`dao_tim`) | Kiếm + Áo Choàng | `a` AD, `b` Kháng | Máu tụt qua 50%: nhận `c` Khiên phép, hồi `d` lượt | Đấu sĩ đối đầu Pháp sư |
| Móng Vuốt Sterak (`sterak`) | Kiếm + Đai | `a` AD, `b` Máu | Mỗi 10% Máu đã mất: +`c` AD | Đấu sĩ thấp Máu |
| Giáo Shojin (`giao_shojin`) | Kiếm + Nước Mắt | `a` AD | Đòn trúng: đội hồi `b` mana; `c`% nhận lá chiêu, `d`% lá R | Xạ thủ, Đấu sĩ cần chiêu |
| Mũ Rabadon (`mu_rabadon`) | Gậy + Gậy | `a` AP lớn nhất | Tổng AP tăng `b`% | Pháp sư dồn chiêu |
| Nanh Nashor (`nanh_nashor`) | Gậy + Cung | `a` AP, `b` Tốc Đánh | Đòn đánh thêm `c`·AP sát thương phép | Ahri |
| Găng Bảo Thạch (`gang_bao_thach`) | Gậy + Găng | `a` AP, 50% chí mạng | Lá chiêu chí mạng được | Pháp sư xả chiêu |
| Vương Miện Hoàng Gia (`vuong_mien`) | Gậy + Giáp | `a` AP, `b` Giáp | Lá chiêu đầu mỗi lượt: nhận `c` Khiên vật lý | Pháp sư đứng đầu, Trợ thủ bị dồn |
| Quỷ Thư Morello (`quy_thu`) | Gậy + Áo Choàng | `a` AP, `b` Kháng | Chiêu gây sát thương gắn Vết Thương Sâu | Khắc tướng hồi Máu |
| Mặt Nạ Liandry (`mat_na_liandry`) | Gậy + Đai | `a` AP, `b` Máu | Chiêu gắn Tro Tàn: đốt `c`% Máu tối đa trong `d` đơn vị | Pháp sư đánh Tank |
| Quyền Trượng Thiên Thần (`truong_truong_sinh`) | Gậy + Nước Mắt | `a` AP | Dùng chiêu: `b`% nhận lá chiêu, `c`% lá R | Pháp sư xả chiêu |
| Đại Bác Liên Thanh (`dai_bac`) | Cung + Cung | `a` Tốc Đánh lớn nhất | Đòn đánh chọn được mọi tướng địch | Đấu sĩ, Tank bị kẹt đường |
| Diệt Khổng Lồ (`diet_khong_lo`) | Cung + Găng | `a` Tốc Đánh, 50% chí mạng | Thêm `b`% lên tướng nhiều Máu hơn mình | Đánh Tank |
| Tim Băng (`tim_bang`) | Cung + Giáp | `a` Giáp, `b` Tốc Đánh | Địch đối diện và 2 đường kề gây ít hơn `c`% sát thương đòn đánh | Tank đứng giữa |
| Móc Diệt Thuỷ Quái (`sat_thu_kraken`) | Cung + Áo Choàng | `a` Tốc Đánh, `b` Kháng | Đòn thứ 3 liên tiếp cùng tướng thêm `c + d·AD` chuẩn | Xạ thủ dồn |
| Rìu Đại Mãng Xà (`y_chi_titan`) | Cung + Đai | `a` Máu, `b` Tốc Đánh | Đòn đánh thêm `c`% Máu tối đa của người đeo | Đấu sĩ |
| Kiếm Manamune (`than_kiem_manamune`) | Cung + Nước Mắt | `a` AD, `b` Tốc Đánh | Dùng chiêu: đòn kế hồi `c` mana; `d`% nhận lá chiêu | Xạ thủ có chiêu tăng đòn |
| Súng Hải Tặc (`ke_thu_thap`) | Găng + Găng | `a` AD, 50% chí mạng | Mục tiêu càng ít Máu, đòn càng đau: thêm `b`% theo Máu đã mất | Tướng kết liễu |
| Giáp Thiên Thần (`giap_thien_than`) | Găng + Giáp | `a` Giáp, 50% chí mạng | Lần đầu bị hạ: đứng dậy với `b`% Máu | Carry cần sống |
| Khăn Giải Thuật (`khan_giai_thuat`) | Găng + Áo Choàng | `a` Kháng, 50% chí mạng | Huỷ lần khống chế đầu, hồi `b` lượt | Sát thủ, carry sợ Choáng |
| Trái Tim Khổng Thần (`tim_khong_than`) | Găng + Đai | `a` Máu, 50% chí mạng | Lần đầu mỗi lượt chí mạng: +`b` Máu tối đa vĩnh viễn | Đấu sĩ |
| Vọng Âm Luden (`ban_dong_hanh_luden`) | Găng + Nước Mắt | `a` AP, 50% chí mạng | Đòn chí mạng: `b`% nhận lá chiêu miễn phí, hồi `c` mana | Ahri |
| Giáp Gai (`ao_choang_gai`) | Giáp + Giáp | `a` Giáp lớn nhất | Bị đánh: kẻ đánh nhận `b + c·Giáp` phép | Tank |
| Thú Tượng Thạch Giáp (`giap_gargoyle`) | Giáp + Áo Choàng | `a` Giáp, `b` Kháng | Mỗi tướng địch khác gây sát thương: +`c` Giáp và Kháng theo đơn vị | Tank bị dồn |
| Áo Choàng Lửa (`ao_choang_lua`) | Giáp + Đai | `a` Máu, `b` Giáp | Đầu lượt: địch đối diện và 2 đường kề nhận `c`% Máu tối đa của người đeo | Đấu sĩ, Tank đứng lâu |
| Lời Thề Hiệp Sĩ (`loi_the_ho_ve`) | Giáp + Nước Mắt | `a` Giáp | Đầu lượt: +`b` mana; `c`% nhận lá chiêu | Tank chiêu nhiều |
| Vuốt Rồng (`vuot_rong`) | Áo Choàng + Áo Choàng | `a` Kháng lớn nhất | Cuối lượt: hồi `b`% Máu tối đa | Khắc đội Pháp sư |
| Giáp Vai Nguyệt Thần (`khien_hu_vo`) | Áo Choàng + Đai | `a` Máu, `b` Kháng | Địch đối diện nhận thêm `c`% sát thương từ đồng minh khác | Tank mở đường |
| Mũ Thích Nghi (`mu_thich_nghi`) | Áo Choàng + Nước Mắt | `a` Kháng | Chịu chiêu địch: hồi `b` mana; `c`% nhận lá Quick của tướng đeo | Tướng có Quick |
| Giáp Máu Warmog (`giap_warmog`) | Đai + Đai | `a` Máu lớn nhất | Đầu lượt nếu không mất Máu lượt địch vừa rồi: hồi `b`% Máu tối đa | Tướng scale theo Máu |
| Dây Chuyền Chuộc Tội (`day_chuyen_chuoc_toi`) | Đai + Nước Mắt | `a` Máu | Hồi Máu hoặc Khiên đồng minh: hồi `b` mana; `c`% nhận lá chiêu | Trợ thủ |
| Bùa Xanh (`bua_lam`) | Nước Mắt + Nước Mắt | `a` hồi mana mỗi lượt | Đầu lượt: `b`% nhận lá Q hoặc E, `c`% lá R | Trợ thủ, Pháp sư thiếu mana |
