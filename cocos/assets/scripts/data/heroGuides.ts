// Lối chơi từng tướng cho Thư viện tướng (tab "Lối chơi"): vai trò, cách chơi, điểm mạnh, điểm yếu, chiến thuật hợp và cách khắc chế.
// Nội dung đọc theo bộ chiêu thật (packages/shared/src/cardgame/heroes/*.ts), số lấy từ balance/heroes/<id>.json và luật trong law.md
// (bể mana chung 200 khởi đầu 80 hồi 20/lượt, gọi tướng dần vòng 1/4/8/13/19, Xạ thủ chọn mọi địch nhưng lá Đánh Thường buộc đánh
// Đỡ đòn, Đấu sĩ có đòn không cần lá 50%, Pháp sư nhận lá tạm Q/E mỗi lượt, Trợ thủ ra sân lần đầu nhận Q và E lên tay).
// Gợi ý đội hình tham khảo thêm bảng SYNERGY (packages/shared/src/cardgame/synergy.ts). Sửa bộ chiêu thì phải sửa lại mục tương ứng ở đây.

export interface HeroGuide {
    /** Vai trò, một dòng ngắn */
    role: string;
    /** Vòng lặp chính: 2-3 câu ngắn */
    howToPlay: string;
    /** Mạnh ở đâu */
    strengths: string[];
    /** Yếu ở đâu */
    weaknesses: string[];
    /** Hợp chiến thuật / đội hình / đồ nào */
    strategies: string[];
    /** Bị khắc chế bởi / cách đối phó */
    counters: string[];
}

export const HERO_GUIDES: Record<string, HeroGuide> = {
    // ---------------- Đấu sĩ ----------------
    darius: {
        role: "Đấu sĩ càng chém càng thốn, kết liễu bằng sát thương chuẩn",
        howToPlay: "Cả 3 chiêu 0 mana. Mỗi đòn trúng cắm 1 Chảy Máu; đánh thường gây thêm 3 mỗi tầng trên mục tiêu. Q đốt dấu thành sát thương và cắm thêm 2 tầng, Darius hồi Máu theo số tầng. E kéo địch ở đường khác về đối diện rồi Giữ Chân nó 1 đơn vị. R sát thương chuẩn (40 + 80% Công + 6% Máu tối đa + 15 mỗi tầng), mục tiêu càng ít Máu càng đau; hạ được thì lá về tay, không hạ thì nằm trong 5 lá trên cùng bộ bài.",
        strengths: [
            "Không tốn mana: chém suốt trận.",
            "Càng giao tranh lâu càng đau: dấu Chảy Máu tăng sát thương mọi đòn.",
            "E kéo và Giữ Chân: con mồi không thoát khỏi đường của Darius.",
            "R kết liễu kẻ thấp Máu, hạ được thì dùng tiếp ngay.",
        ],
        weaknesses: [
            "Cần vài đòn mới đủ dấu; đầu giao tranh sát thương thường.",
            "Hồi máu, Khiên của địch làm phí dấu.",
            "R trượt thì phải chờ rút lại từ bộ bài.",
        ],
        strategies: [
            "Đánh thường và Q lên cùng một mục tiêu để chồng dấu nhanh.",
            "Dùng E kéo pháp sư, xạ thủ yếu về trước mặt rồi Giữ Chân.",
            "Giữ R cho mục tiêu đã thấp Máu để chắc hạ và lấy lại lá.",
        ],
        counters: [
            "Choáng, Câm Lặng cắt nhịp chồng dấu.",
            "Tướng hồi máu, Khiên dày làm R khó hạ.",
        ],
    },
    garen: {
        role: "Đấu sĩ trơn, mạnh nhất khi đấu tay đôi đầu trận",
        howToPlay: "Cả 3 chiêu 0 mana (giới hạn Q 2 lần, E và R 1 lần mỗi lượt). Kiên Cường: +3% Máu tối đa, thêm 2% cho mỗi ô đồ trống; Q và E gây thêm 3% cho mỗi đường địch không có tướng. Q chém đối diện (25 + 100% AD + 6% Máu tối đa) và Câm Lặng 1 đơn vị. E Quick khi bị nhắm: chém đối diện (15 + 80% AD + 5% Máu tối đa), 2 đường kề nhận 30%, hồi 40% tổng sát thương. R sát thương chuẩn 60 + 12% Máu tối đa mục tiêu, gấp đôi nếu mục tiêu cùng đường.",
        strengths: [
            "Đầu trận (1 đường mở) Garen trội nhất: Q, E được cộng tới 12% sát thương, Máu thêm 9% khi chưa đồ.",
            "Không tốn mana: để dành mana đội cho chủ lực.",
            "Không cần đồ: nhường suất đồ cho xạ thủ, pháp sư.",
            "R theo % Máu tối đa, gấp đôi khi cùng đường: hạ tướng đỡ đòn đứng trước mặt.",
        ],
        weaknesses: [
            "Địch đủ 5 đường thì mất phần cộng sát thương.",
            "Chỉ chạm kẻ đối diện (E thêm 2 đường kề), không có chiêu đổi đường.",
            "Giảm hồi máu cắt mất phần hồi của E.",
        ],
        strategies: [
            "Ra sân sớm ở đường đầu tiên để thắng tay đôi.",
            "Dồn đồ cho chủ lực, để Garen trơn giữ đường.",
            "Giữ E để phản ứng khi địch nhắm Garen; dùng R khi mục tiêu đứng cùng đường.",
        ],
        counters: [
            "Khống chế cứng (Choáng) huỷ cả chiêu lẫn đòn đánh của Garen.",
            "Chiêu đổi chỗ đẩy mục tiêu ra khỏi đường của Garen, R mất phần gấp đôi.",
            "Gọi đủ tướng lấp các đường để Garen không được cộng sát thương.",
        ],
    },
    aatrox: {
        role: "Đấu sĩ đổi máu lấy máu: Máu càng thấp Công càng cao, hút máu càng nhiều",
        howToPlay: "Chiêu không tốn mana, trả bằng Máu hiện tại. Nội tại: Máu càng thấp Công càng cao (tới +100% Công gốc); mỗi đòn đánh thường trả 10% Máu hiện tại rồi hút 10% → 100% sát thương tuỳ Máu đã mất. Q trả 20% Máu hiện tại, chém đối diện (20 + 90% Công + 8% Máu tối đa) và hút máu như nội tại. E (Quick khi bị nhắm) trả 20% Máu hiện tại, chém đối diện (30 + 100% Công + 5% Máu tối đa), nhận Khiên bằng 50% sát thương. R trả 50% Máu hiện tại, hoá quỷ 2 đơn vị +50% Công; bị hạ lúc đang là quỷ thì hồi sinh với 30% Máu.",
        strengths: [
            "Càng thấp Máu càng đau và hút càng nhiều: tự cân ở vùng Máu thấp.",
            "Không tốn mana: chém suốt trận.",
            "R tăng mạnh Công và cho một mạng phụ.",
            "E là Quick: phản đòn và tạo Khiên khi bị nhắm.",
        ],
        weaknesses: [
            "Mọi đòn đều tự trừ Máu: bị dồn sát thương lớn một lúc là chết.",
            "Giảm hồi máu (Quỷ Thư Morello) phá cơ chế hút máu.",
            "Chỉ chém tướng đối diện: mục tiêu đổi đường là hụt.",
        ],
        strategies: [
            "Dùng Q, đánh thường để hạ Máu mình xuống vùng thấp, rồi sống bằng hút máu.",
            "Giữ E làm Khiên khi địch dồn chiêu vào Aatrox.",
            "Bật R khi đã thấp Máu để Công cao nhất và có mạng phụ.",
            "Lên đồ Công: vừa đánh đau vừa hút nhiều (Kiếm Tử Thần, Móng Vuốt Sterak).",
        ],
        counters: [
            "Khống chế cứng và giảm hồi máu.",
            "Dồn sát thương lớn một lúc trước khi Aatrox kịp hút lại.",
        ],
    },
    yorick: {
        role: "Đấu sĩ đào mộ: đốt bộ bài đối thủ để mạnh lên",
        howToPlay: "Mọi đòn chỉ nhắm tướng đối diện. Đòn trúng đốt 1 lá trên cùng bộ đối thủ; mỗi lá Yorick đốt thành 1 Hồn (lá chiêu thêm 1): +2 Công, +10 Máu tối đa vĩnh viễn. Q chém và đốt 1 lá, hồi Máu theo Hồn nhận được. E (Quick khi bị nhắm) chém, Rã Giáp, đốt 2 lá và nhận Khiên. R đốt 3 lá rồi chém kèm sát thương chuẩn theo số Hồn. Mốc 25/50/75 Hồn mỗi mốc cho thêm 1 lá R.",
        strengths: [
            "Hai đường thắng: đối thủ cạn bộ bài là thua, hoặc nuôi Hồn rồi R chém kết liễu.",
            "Càng đánh lâu càng to: Hồn cộng Công và Máu không giới hạn.",
            "Cả 3 chiêu 0 mana; E là Quick để đỡ đòn bằng Khiên.",
            "Đốt trúng lá chiêu của đối thủ vừa cắt bài vừa thêm Hồn.",
        ],
        weaknesses: [
            "Chỉ đánh tướng đối diện: đối thủ đổi đường là Yorick hụt nhịp.",
            "Đầu trận ít Hồn nên sát thương thấp.",
            "Yorick chết mất một nửa số Hồn.",
        ],
        strategies: [
            "Đội kéo dài trận: Đỡ đòn và hồi máu (Braum, Soraka) giữ Yorick sống để nuôi Hồn.",
            "Đồ tăng số đòn: thêm đòn là thêm lá bị đốt, thêm Hồn.",
        ],
        counters: [
            "Dồn Yorick sớm trước khi Hồn lớn.",
            "Né đường đối diện Yorick, hoặc khoá Yorick bằng Choáng, Giữ Chân.",
        ],
    },
    gangplank: {
        role: "Đấu sĩ trụ đường bằng Cam và Thùng Thuốc Súng",
        howToPlay: "Úp lá thành Thùng ở ô phụ bằng E hoặc nút Úp Lá (15 mana); Thùng thêm 1 Thuốc Súng mỗi đầu lượt. Thùng chứa lá chiêu: địch phá thì kẻ phá ăn nổ, Gangplank tự đánh Thùng thì nổ vào mọi địch. R Lệnh Truy Nã kích nổ Thùng dồn vào một địch bất kỳ đường; Q hồi Máu, Giáp và tìm lá E.",
        strengths: [
            "Thùng úp nên địch phải đoán: phá nhầm Thùng lá chiêu là ăn nổ.",
            "Sát thương nổ tăng vọt theo Thuốc Súng, không trần.",
            "R làm lá gì trong Thùng cũng nổ, 120% vào một mục tiêu; hạ được nhận 2 lá Vàng.",
            "Q hồi Máu, cộng Giáp và tìm lá E: trụ đường bền.",
        ],
        weaknesses: [
            "Chỉ có tối đa 1 Thùng, cần ô phụ trống để úp.",
            "Thùng 1 Máu, mọi vai địch đánh được; bị phá sớm thì nổ nhỏ.",
            "Cần thời gian cho Thuốc Súng lớn; trận dồn nhanh thì thiếu sát thương.",
        ],
        strategies: [
            "Úp lá chiêu thừa làm bẫy; úp lá đồ hoặc Vàng khi muốn lấy lại tài nguyên.",
            "Ornn tăng chỉ số đồ; Twisted Fate xếp bài (gợi ý combo của game).",
            "Đồ: Móng Vuốt Sterak, Giáp Máu Warmog để đứng lâu chờ Thùng to.",
        ],
        counters: [
            "Đánh vỡ Thùng khi còn ít Thuốc Súng, bằng tướng chịu được một cú nổ nhỏ.",
            "Sát thủ cơ động (Katarina) hoặc Vayne dồn Gangplank trước khi Thùng to.",
        ],
    },
    jayce: {
        role: "Đấu sĩ hai dạng: Búa cận chiến và Pháo tầm xa",
        howToPlay: "Chọn Búa hoặc Pháo khi gọi, đổi dạng bằng nút ở Standby (miễn phí, 1 lần/lượt); sau mỗi lần đổi, đòn đánh kế thêm sát thương. Búa là Đấu sĩ: đánh đối diện, hồi máu, E Choáng. Pháo là Xạ thủ: đánh mọi đường, E tích Gia Tốc vô hạn làm Q, R Pháo mạnh dần.",
        strengths: [
            "Linh hoạt: Búa để trụ và khống chế, Pháo để bắn bất kỳ đường.",
            "Búa hồi máu mỗi đòn đánh, Q, E, R đều hút máu; E Choáng 1 đơn vị.",
            "Gia Tốc của Pháo không trần, không hết hạn: cuối trận Q, R Pháo rất đau.",
            "Chỉ số đồ tự đổi theo dạng (Tốc Đánh thành Máu ở Búa, Máu/Giáp thành AD ở Pháo).",
        ],
        weaknesses: [
            "Chỉ đổi dạng được ở Standby, không đổi giữa lượt để phản ứng.",
            "Pháo không có đòn không cần lá; Búa không với tới địch ngoài đường đối diện (trừ Q).",
            "Gia Tốc mất một nửa khi chết, ở dạng Búa không có tác dụng.",
        ],
        strategies: [
            "Nami, Janna (gợi ý combo của game): Khiên và AP/AD cộng thêm cho dạng Pháo.",
            "Tích Gia Tốc lúc an toàn ở Pháo, đổi sang Búa khi cần trụ đường.",
            "Đồ đa dụng vì tự quy đổi: Móng Vuốt Sterak, Rìu Đại Mãng Xà.",
        ],
        counters: [
            "Khoá Jayce bằng Choáng (Leona) đúng lượt nó vừa đổi dạng.",
            "Malphite giảm hiệu quả đòn vật lý bằng Giáp cả đội.",
        ],
    },

    // ---------------- Đỡ đòn ----------------
    braum: {
        role: "Đỡ đòn hứng thay đồng đội, khống chế cả hàng",
        howToPlay: "Q đặt Dấu Băng lên một địch, đồng minh khác đánh trúng thì nó bị Choáng. Luôn chừa 25 mana cho E Quick: khi địch đánh hoặc dùng chiêu nhắm đúng một đồng minh khác, Braum huỷ tác động lên người đó và nhận thay 60% sát thương kèm Khiên. R Choáng mọi địch, kẻ đối diện bị lâu nhất.",
        strengths: [
            "E huỷ mọi tác động lên đồng minh, kể cả khống chế; Braum chỉ chịu 60% và có Khiên.",
            "Song Giáp cộng dồn vô hạn mỗi lần bị đánh thường: càng bị đánh càng cứng.",
            "R Choáng cả bàn địch; Q cộng đồng đội đánh trúng là thêm một Choáng.",
            "Là Đỡ đòn: lá Đánh Thường của Xạ thủ địch buộc phải đánh Braum.",
        ],
        weaknesses: [
            "E không đỡ được chiêu trúng cả phe (Viktor E, Brand R...).",
            "Sát thương thấp; chiêu scale theo Máu tối đa và Giáp, cần đồ phòng thủ.",
            "Dấu Băng phải do đồng minh khác đánh trúng mới kích, Braum tự đánh thì không.",
        ],
        strategies: [
            "Bảo kê carry dễ vỡ: Kog'Maw, Jinx, Viktor (gợi ý combo của game).",
            "Đội đánh thường nhiều (Ashe, Jinx Bằng Chíu) kích Dấu Băng dễ.",
            "Đồ: Giáp Máu Warmog, Thú Tượng Thạch Giáp, Tim Băng.",
        ],
        counters: [
            "Dùng chiêu trúng cả phe hoặc mục tiêu ngẫu nhiên thay vì chiêu đơn mục tiêu.",
            "Câm Lặng Braum (Garen Q, Blitzcrank R) để E không nối Chuỗi được.",
        ],
    },
    leona: {
        role: "Đỡ đòn khoá chân bằng Choáng",
        howToPlay: "Q Choáng kẻ đối diện, E Quick Choáng kẻ đang đánh hoặc dùng chiêu và tự tăng Giáp, R gây sát thương và Choáng mọi địch. Mọi chiêu scale theo Giáp: lên đồ Giáp vừa trâu vừa Choáng lâu hơn.",
        strengths: [
            "Cả Q, E, R đều Choáng; Choáng huỷ cả chiêu lẫn đòn đánh trong Chuỗi.",
            "E Quick cắt ngang hành động địch ngay trong lượt của chúng.",
            "Nội tại +25% tổng Giáp; Xạ thủ địch dùng lá Đánh Thường phải đánh Đỡ đòn.",
        ],
        weaknesses: [
            "Thiếu Giáp thì sát thương và thời gian Choáng đều thấp.",
            "Q chỉ nhắm đối diện, không có cách đổi đường.",
            "Sát thương phép và Khăn Giải Thuật (huỷ khống chế đầu tiên) làm Leona kém hẳn.",
        ],
        strategies: [
            "Mở giao tranh cho đội dồn: Darius, Jinx, Aatrox (gợi ý combo của game).",
            "Đồ: Giáp Gai, Tim Băng, Thú Tượng Thạch Giáp.",
        ],
        counters: [
            "Sát thương phép hoặc theo % Máu (Kog'Maw); Khăn Giải Thuật chặn Choáng.",
            "Malphite R giảm Giáp của Leona, kéo tụt cả sát thương lẫn Choáng.",
        ],
    },
    malphite: {
        role: "Đỡ đòn biến cả đội thành đá, không có khống chế",
        howToPlay: "Khi Malphite trên sân, mọi tướng mình thêm 20% Giáp và 10% Máu tối đa của Malphite. Q gây sát thương và cho cả đội Giáp tạm; E Quick nối Liên Kết Đá để sát thương đơn mục tiêu chia đều cho các tướng liên kết. R gây sát thương mọi địch và cắt Giáp của chúng 1 đơn vị.",
        strengths: [
            "Hào quang Giáp và Máu cho cả đội ngay khi ra sân.",
            "Liên Kết Đá không hết hạn, nối nhiều tướng: chia nhỏ sát thương dồn một người.",
            "R giảm Giáp cả bàn địch, mở đường cho đội sát thương vật lý.",
        ],
        weaknesses: [
            "Không có khống chế nào.",
            "Liên Kết Đá không chia sát thương cả phe; Malphite chết là mất hết liên kết.",
            "Chiêu scale theo Giáp: thiếu đồ Giáp thì sát thương thấp.",
        ],
        strategies: [
            "Đội vật lý (Darius, Jinx, Ashe) tận dụng R giảm Giáp.",
            "Leona, Ornn chồng Giáp cho cả đội (gợi ý combo của game).",
            "Đồ: Giáp Gai, Thú Tượng Thạch Giáp, Áo Choàng Lửa.",
        ],
        counters: [
            "Sát thương phép hoặc theo % Máu (Kog'Maw, Vel'Koz) bỏ qua lợi thế Giáp.",
            "Hạ Malphite trước để phá mọi Liên Kết Đá và tắt hào quang.",
        ],
    },
    blitzcrank: {
        role: "Đỡ đòn cướp bài, vô hiệu chiêu giữa Chuỗi",
        howToPlay: "Q cướp 1 lá ngẫu nhiên trên tay đối thủ (lá chiêu của địch thành Q/E của tướng mình); nếu lá đó là của chính mục tiêu thì kéo nó về đối diện. Chừa 30 mana cho E Quick: cướp và vô hiệu một lá chiêu địch, kể cả R, rồi Choáng kẻ dùng. R Câm Lặng cả bàn và bắt đối thủ bỏ 2 lá.",
        strengths: [
            "E là phản ứng mạnh nhất với R địch: vô hiệu, cướp và Choáng kẻ dùng.",
            "Mỗi lá cướp được cho 1 Phụ Tùng (+2 Giáp, +2 Kháng phép), vô hạn.",
            "R Câm Lặng mọi địch và phá 2 lá tay: rất mạnh trước lượt địch định xả chiêu.",
            "Lá chiêu cướp được đổi thành Q/E của tướng mình: vừa phá địch vừa thêm bài.",
        ],
        weaknesses: [
            "Q cần đối thủ còn bài trên tay; lá cướp là ngẫu nhiên.",
            "E chỉ 1 lần mỗi lượt và phải giữ 30 mana trong bể chung.",
            "E không phản ứng được đòn đánh thường: ít tác dụng với đội sống bằng đòn đánh.",
        ],
        strategies: [
            "Khoá đội dựa vào chiêu lớn (Lux R, Nami R, Brand R): luôn chừa mana cho E.",
            "Teemo, Renata, Darius (gợi ý combo của game).",
            "Đồ: Mũ Thích Nghi, Giáp Gai, Thú Tượng Thạch Giáp.",
        ],
        counters: [
            "Mồi E bằng chiêu rẻ trước rồi mới tung R; ra đòn khi bể mana Blitzcrank cạn.",
            "Đội đánh thường (Xạ thủ, Đấu sĩ) gần như không bị E ảnh hưởng.",
        ],
    },
    ornn: {
        role: "Đỡ đòn rèn đồ, tăng chỉ số đồ cả đội",
        howToPlay: "Khi Ornn trên sân, chỉ số đồ cả đội (trừ Máu) tăng 12% và thêm 1% mỗi vòng món đó đã mặc. Q tạo mảnh đồ lên tay; E Quick gắn Kiệt Tác (+5% chỉ số mỗi tầng) lên mọi món của một đồng minh và cho Khiên theo số món. R Quick rèn ngay một món hoàn chỉnh cho đồng minh và thêm một món lên tay.",
        strengths: [
            "Tạo tài nguyên: Q ra mảnh đồ, R ra 2 món hoàn chỉnh.",
            "Kiệt Tác không mất khi tướng giữ đồ bị hạ (theo quyết định tạm hiện tại).",
            "E và R đều Quick: dùng ngay trong lượt địch.",
        ],
        weaknesses: [
            "Sát thương thấp; R không gây sát thương.",
            "E cần đồng minh đã mang đồ; đồ R rèn ngẫu nhiên, có thể không hợp người nhận.",
            "Hào quang tăng đồ tắt khi Ornn rời sân.",
        ],
        strategies: [
            "Đội sống bằng đồ: Jinx, Garen, Gangplank, Malphite (gợi ý combo của game).",
            "Dồn đồ vào một carry rồi chồng Kiệt Tác lên carry đó.",
        ],
        counters: [
            "Blitzcrank cướp lá đồ trên tay; Sylas đoạt R Ornn.",
            "Hạ Ornn để tắt phần tăng chỉ số đồ của cả đội.",
        ],
    },

    // ---------------- Sát thủ ----------------
    zed: {
        role: "Sát thủ dồn combo trong một lượt",
        howToPlay: "Mỗi chiêu hoặc đòn trong lượt cho 1 Liên Hoàn, chiêu sau đau thêm theo số tầng; hết lượt thì mất. Mở bằng E dịch tới mục tiêu bất kỳ đường, Q để đòn đánh mạnh lên, đánh thường, rồi kết bằng R: cuối lượt Dấu Ấn nổ sát thương chuẩn, thêm 14 mỗi Liên Hoàn.",
        strengths: [
            "E chọn địch bất kỳ đường rồi dịch tới đối diện nó: với tới carry đứng xa.",
            "Đủ bài và mana thì một lượt hạ gọn tướng mỏng; Dấu Ấn nổ cả khi Zed đã chết.",
            "E Quick khi bị nhắm: phản đòn ngay kẻ vừa nhắm Zed.",
            "Sát thủ đánh thường mạnh hơn vai khác (×1.25).",
        ],
        weaknesses: [
            "Liên Hoàn mất khi hết lượt: cần nhiều lá và mana trong cùng một lượt.",
            "Máu 330, Giáp thấp: lao vào xong dễ bị dồn lại.",
            "Lá R biến mất sau khi dùng, chỉ có lại khi rút được lá R khác.",
        ],
        strategies: [
            "Nami: Phước Lành và Dễ Tổn Thương khuếch đại cả chuỗi combo.",
            "Đội hồi mana (Sona) để có đủ mana cho lượt dồn.",
            "Đồ: Kiếm Tử Thần, Súng Hải Tặc, Kiếm Manamune.",
        ],
        counters: [
            "Braum E đỡ thay, Lissandra R tự Đóng Băng khi bị nhắm làm hỏng lượt dồn.",
            "Che Khiên Quick cho mục tiêu, hoặc Choáng Zed trước lượt của nó.",
        ],
    },
    katarina: {
        role: "Sát thủ nhặt Dao, nhảy đường liên tục",
        howToPlay: "Đầu mỗi lượt một Dao rơi ngẫu nhiên vào một đường đã mở phía mình; vào đường có Dao là nhặt và chém kẻ đối diện. Q dịch tới đối diện một địch bất kỳ rồi rơi thêm Dao, E dịch tới đường có Dao. Đã nhặt Dao trong lượt thì R chém 3 đường, kẻ đối diện chịu 150%.",
        strengths: [
            "Cơ động nhất: Q chọn địch bất kỳ đường, E không giới hạn số lần mỗi lượt.",
            "R gây sát thương phép lớn lên 3 đường cùng lúc.",
            "E Quick khi bị nhắm: nhảy sang đường có Dao để thoát thế.",
        ],
        weaknesses: [
            "R chỉ dùng được khi lượt này đã nhặt Dao.",
            "Dao rơi ngẫu nhiên; đầu trận ít đường mở thì ít lựa chọn.",
            "Máu 320, Giáp 26: rất mỏng.",
        ],
        strategies: [
            "Leona, Lux khoá mục tiêu để Katarina dồn (gợi ý combo của game).",
            "Đồ: Kiếm Súng Hextech (AD, AP, hút máu), Súng Hải Tặc.",
        ],
        counters: [
            "Garen Q Câm Lặng, Lissandra Hoá Băng lá chiêu trên tay.",
            "Choáng Katarina trước lượt cô nhảy vào, hoặc che Khiên cho tướng mỏng.",
        ],
    },
    khazix: {
        role: "Sát thủ săn mục tiêu bị Cô Lập",
        howToPlay: "Đầu lượt và mỗi lần đổi đường, kẻ đối diện có tỉ lệ bị Cô Lập (cao hơn nếu nó không có buff, Khiên hoặc đang dính hiệu ứng bất lợi). E nhảy tới đối diện địch bất kỳ để thử Cô Lập lần nữa, Q đánh thêm nhiều lên mục tiêu Cô Lập. R Quick: Tàng Hình, né đòn đang nhắm và nhận một Q miễn phí.",
        strengths: [
            "Mỗi lần đổi đường bằng E là thêm một lần thử Cô Lập; Q lên mục tiêu Cô Lập rất đau.",
            "R né đòn đang nhắm, Tàng Hình 1 đơn vị và cho Q miễn phí.",
            "Địch Tàng Hình đối diện bị lộ và luôn bị Cô Lập.",
        ],
        weaknesses: [
            "Cô Lập là xác suất; mục tiêu có Khiên hoặc buff thì tỉ lệ thấp.",
            "E chỉ 1 lần mỗi lượt; Q và đòn đánh chỉ chạm kẻ đối diện.",
            "Máu 320, mỏng.",
        ],
        strategies: [
            "Đi với tướng gây khống chế hoặc Rã Giáp (Leona, Kog'Maw Q, Yorick E) để tăng tỉ lệ Cô Lập.",
            "Đồ: Kiếm Tử Thần, Súng Hải Tặc, Áo Choàng Bóng Tối.",
        ],
        counters: [
            "Che Khiên cho đồng đội (Janna, Lux) để giảm tỉ lệ Cô Lập.",
            "Leona Choáng hoặc Garen Câm Lặng Kha'Zix ngay sau khi nó nhảy vào.",
        ],
    },
    qiyana: {
        role: "Sát thủ nguyên tố theo đường đang đứng",
        howToPlay: "Đầu trận 5 đường mang nguyên tố công khai (2 Đất, 2 Nước, 1 Cỏ); chiêu kế của Qiyana mang nguyên tố đường cô đứng. Đất thêm sát thương theo Máu đã mất, Nước Choáng, Cỏ Tàng Hình. E đổi tới đối diện địch bất kỳ, mang nguyên tố đường cũ rồi đổi theo đường mới; R chém 3 đường kèm hiệu ứng nguyên tố.",
        strengths: [
            "Linh hoạt: Đất để dồn, Nước để Choáng, Cỏ để ẩn thân.",
            "Đứng đường Cỏ thì E thành Quick: huỷ hành động địch nhắm vào cô.",
            "R Nước Choáng 3 đường; R Cỏ cho đồng minh 3 đường Tàng Hình.",
        ],
        weaknesses: [
            "Nguyên tố công khai: đối thủ biết trước chiêu kế sẽ làm gì.",
            "Phụ thuộc đường được đặt và đường đã mở; chỉ có 1 đường Cỏ.",
            "Máu 320, mỏng.",
        ],
        strategies: [
            "Đặt Qiyana ở đường Nước để có Choáng chắc, đường Đất khi cần kết liễu.",
            "Teemo, Malphite (gợi ý combo của game).",
            "Đồ: Kiếm Tử Thần, Súng Hải Tặc.",
        ],
        counters: [
            "Braum E đỡ thay và Khiên của Lux làm lượt dồn mất tác dụng.",
            "Khống chế Qiyana ngay sau khi cô đổi sang đường mới.",
        ],
    },
    vayne: {
        role: "Sát thủ đánh thường, gọi muộn để lật kèo",
        howToPlay: "Mỗi đầu lượt Vayne nhận Bóng Đêm (+1 AD, +1.5% Tốc Đánh): 2 tầng khi chưa ra sân hoặc chờ hồi sinh, 1 khi trên sân. Nên gọi muộn, giữ lá Đánh Thường; Q dịch sang đường kề để chọn kẻ đối diện mới (hoặc né đòn), rồi R: mỗi đòn đánh thêm sát thương, mỗi đòn thứ 3 nổ chuẩn theo Máu tối đa.",
        strengths: [
            "Ở ngoài sân vẫn tích Bóng Đêm nhanh gấp đôi: ra sân muộn là mạnh ngay.",
            "R xé tướng trâu: mỗi đòn thứ 3 gây 30 + 6% Máu tối đa sát thương chuẩn.",
            "Q Quick khi bị nhắm: né và huỷ đòn đang nhắm Vayne.",
        ],
        weaknesses: [
            "Là Sát thủ (không phải Xạ thủ): đòn đánh chỉ chạm kẻ đối diện, phải dùng Q để đổi đường.",
            "Cần nhiều lá Đánh Thường trong lượt R; ít lá thì R phí.",
            "Mất một nửa Bóng Đêm khi bị hạ.",
        ],
        strategies: [
            "Gọi Vayne ở mốc gọi tướng muộn để tích Bóng Đêm.",
            "Janna (Khiên tăng Tốc Đánh), Ornn (đồ mạnh hơn) theo gợi ý combo của game.",
            "Đồ: Cuồng Đao Guinsoo, Móc Diệt Thủy Quái, Diệt Khổng Lồ.",
        ],
        counters: [
            "Mù (Teemo E, Jinx E) hoặc Choáng đúng lượt Vayne bật R.",
            "Dồn Vayne ngay lượt nó ra sân: Máu 340, Giáp 26 (Kha'Zix, Zed).",
        ],
    },

    // ---------------- Xạ thủ ----------------
    ashe: {
        role: "Xạ thủ chồng Buốt, khuếch đại sát thương cả đội",
        howToPlay: "Mỗi đòn trúng gắn 1 Buốt; mỗi Buốt làm mục tiêu chịu thêm 2% sát thương từ cả phe Ashe, đủ 6 Buốt thì Choáng. Q tăng Tốc Đánh và gắn thêm Buốt mỗi đòn, E bắn thêm 2 Buốt. R chọn địch bất kỳ đường, gắn 4 Buốt và Choáng.",
        strengths: [
            "Buốt tăng sát thương cho cả đội lên mục tiêu, không chỉ cho Ashe.",
            "Đủ 6 Buốt là Choáng: đánh đều tay là khống chế đều.",
            "Xạ thủ chọn mọi địch; R Choáng được kẻ ở bất kỳ đường.",
        ],
        weaknesses: [
            "Lá Đánh Thường buộc đánh Đỡ đòn địch nếu có.",
            "Phần tăng sát thương của Buốt tắt khi Ashe không còn trên sân.",
            "Máu 360, cần đồng đội che chắn.",
        ],
        strategies: [
            "Lissandra, Teemo (gợi ý combo của game).",
            "Dồn Buốt lên một mục tiêu rồi cả đội cùng đánh.",
            "Đồ: Cuồng Đao Guinsoo, Đại Bác Liên Thanh, Vô Cực Kiếm.",
        ],
        counters: [
            "Sát thủ lao vào (Zed, Kha'Zix) hạ Ashe trước.",
            "Mù (Teemo E, Jinx E) chặn đòn đánh, Buốt không lên được.",
        ],
    },
    jinx: {
        role: "Xạ thủ nhặt mạng, mạnh dần theo Điên",
        howToPlay: "Chọn súng khi gọi (đổi ở Standby): Bằng Chíu +60% Tốc Đánh, Xương Cá đòn đánh lan 2 đường kề. Đánh vào địch đã mất máu để có cơ hội nhận Điên, hạ gục được thêm 3 Điên. Q bắn một đòn cường hoá vào địch bất kỳ đường, R kết liễu theo Máu đã mất.",
        strengths: [
            "Điên vô hạn, mỗi tầng làm mọi đòn trúng đau thêm.",
            "Q và R chọn địch bất kỳ đường; Q chắc chắn cho thêm Điên.",
            "E Quick làm Mù kẻ đánh đồng minh, huỷ đòn đánh đó.",
        ],
        weaknesses: [
            "Cần địch đã mất máu thì mới tích Điên hiệu quả.",
            "Máu 330, mỏng nhất nhóm Xạ thủ.",
            "Mất một nửa Điên khi bị hạ.",
        ],
        strategies: [
            "Ornn, Nami, Leona (gợi ý combo của game).",
            "Xương Cá khi địch đứng sát nhau, Bằng Chíu khi cần đánh một mục tiêu.",
            "Đồ: Cuồng Đao Guinsoo, Vô Cực Kiếm, Súng Hải Tặc.",
        ],
        counters: [
            "Sát thủ dồn sớm (Zed) trước khi Điên lớn.",
            "Janna Khiên và Soraka hồi máu làm Jinx khó tìm mục tiêu yếu máu.",
        ],
    },
    kogmaw: {
        role: "Xạ thủ lớn dần, bắn theo % Máu tối đa",
        howToPlay: "Mỗi đầu lượt trên sân và mỗi khi tướng khác chết, Kog'Maw nhận Đói; mỗi Đói làm đòn trúng thêm 0.4% Máu tối đa mục tiêu. Chí mạng không tăng sát thương mà nhân lượng Đói nhận. E bật 2 đơn vị đánh mọi đường thêm 5% Máu tối đa; R kết liễu theo Máu đã mất.",
        strengths: [
            "Đói không mất khi chết, bị hạ còn được thêm 3 Đói: cuối trận cực mạnh.",
            "Sát thương theo % Máu tối đa: khắc chế Đỡ đòn trâu.",
            "E cho đòn đánh tới mọi đường, bỏ qua ép đánh Đỡ đòn.",
            "Q không giới hạn số lần mỗi lượt và Rã Giáp mục tiêu.",
        ],
        weaknesses: [
            "Đầu trận yếu, cần thời gian trên sân để tích Đói.",
            "Không chí mạng: đồ Chí mạng chỉ có giá trị qua hệ số nhân Đói.",
            "Máu 340, mỏng; cần đồng đội bảo kê.",
        ],
        strategies: [
            "Braum, Soraka, Nami giữ Kog'Maw sống lâu để tích Đói (gợi ý combo của game).",
            "Đồ: Cuồng Đao Guinsoo, Diệt Khổng Lồ, Rìu Đại Mãng Xà.",
        ],
        counters: [
            "Dồn sớm bằng chiêu bất kỳ đường (Ashe R, Jinx R) trước khi Đói lớn.",
            "Mù (Teemo E, Jinx E) chặn đòn đánh.",
        ],
    },
    teemo: {
        role: "Xạ thủ gài Nấm vào bộ bài địch",
        howToPlay: "Mỗi đòn trúng xáo 1 Nấm, Q xáo thêm 2 Nấm vào bộ đối thủ. Địch rút trúng Nấm thì tướng có tỉ lệ Máu thấp nhất của họ ăn đòn. R kích nổ tới 4 Nấm còn trong bộ, mỗi Nấm đánh tướng yếu máu nhất lúc đó; E Quick làm Mù kẻ đánh Teemo.",
        strengths: [
            "Sát thương tự rơi vào tướng tỉ lệ Máu thấp nhất, không phụ thuộc đường.",
            "Nấm không trần, nằm trong bộ địch tới khi bị rút hoặc nổ.",
            "E Mù kẻ đánh Teemo, đau thêm 12 mỗi Nấm trong bộ đối thủ.",
        ],
        weaknesses: [
            "Sát thương chậm, phụ thuộc lượt rút bài của đối thủ.",
            "R cần bộ địch còn Nấm; lá Đánh Thường buộc đánh Đỡ đòn địch nếu có.",
            "Máu 340, mỏng.",
        ],
        strategies: [
            "Đi với tướng làm địch tụt Máu đều (Brand, Darius) để Nấm kết liễu đúng người.",
            "Blitzcrank, Ashe, Qiyana (gợi ý combo của game).",
            "Đồ Tốc Đánh, AD: Cuồng Đao Guinsoo, Đại Bác Liên Thanh.",
        ],
        counters: [
            "Giữ Máu các tướng đều nhau, hồi cho tướng yếu nhất (Soraka R).",
            "Đừng đánh thường Teemo khi Teemo còn mana cho E.",
        ],
    },
    tristana: {
        role: "Xạ thủ gắn Bom, nổ tăng vọt theo số Bom",
        howToPlay: "Mỗi đòn trúng gắn 1 Bom, E gắn thêm 3 Bom. Mỗi lượt được kích nổ Bom trên 1 địch miễn phí; Bom tự nổ khi đủ sát thương hạ mục tiêu. R chọn địch bất kỳ đường: kích nổ Bom, địch khác nhận 50% vụ nổ, rồi bắn thêm nếu nó còn sống.",
        strengths: [
            "Sát thương nổ tăng vọt theo số Bom (12·n·(1 + n/4)).",
            "Kích nổ không tốn lá, không tốn mana, 1 lần mỗi lượt.",
            "R lan 50% vụ nổ sang mọi địch khác.",
        ],
        weaknesses: [
            "Không chí mạng: Chí mạng chỉ đổi thành Tốc Đánh.",
            "Bom mất một nửa khi tướng mang chết; dồn Bom chậm thì bị hồi máu bù.",
            "Lá Đánh Thường buộc đánh Đỡ đòn địch nếu có.",
        ],
        strategies: [
            "Dồn Bom lên một mục tiêu rồi nổ một lần.",
            "Braum, Leona khoá mục tiêu (gợi ý combo của game).",
            "Đồ: Cuồng Đao Guinsoo, Kiếm Tử Thần.",
        ],
        counters: [
            "Hồi máu và Khiên (Janna) để Bom không đủ hạ.",
            "Sát thủ dồn Tristana sớm (Zed).",
        ],
    },
    missfortune: {
        role: "Xạ thủ dồn sát thương bằng chiêu, đạn có thể chí mạng",
        howToPlay: "Mọi phát đạn của Q, E, R đều có thể chí mạng theo Chí mạng của Miss Fortune. Q một phát lớn vào địch bất kỳ, E 3 phát lên mục tiêu và 2 đường kề, R 5 loạt vào mọi địch. Lên Chí mạng là chiêu nào cũng nhân sát thương.",
        strengths: [
            "R trúng mọi địch 5 loạt, mỗi phát chí mạng riêng.",
            "Q, E chọn được mục tiêu bất kỳ, không cần đường đối diện.",
            "Không phụ thuộc lá Đánh Thường: chiêu là nguồn sát thương chính.",
        ],
        weaknesses: [
            "Tốn mana: E 30, R 65 trong bể chung.",
            "Thiếu đồ Chí mạng thì mỗi phát khá nhẹ.",
            "Máu 340, mỏng.",
        ],
        strategies: [
            "Đồ: Vô Cực Kiếm, Súng Hải Tặc, Kiếm Tử Thần.",
            "Brand, Leona (gợi ý combo của game): khoá địch rồi xả R.",
            "Nami Phước Lành: mỗi địch trúng chiêu đều chịu thêm sát thương.",
        ],
        counters: [
            "Khiên cả đội (Janna R) hấp thụ nhiều phát nhỏ.",
            "Blitzcrank E cướp R; Braum đỡ Q đơn mục tiêu.",
        ],
    },

    // ---------------- Pháp sư ----------------
    viktor: {
        role: "Pháp sư xả phép cả bàn, lớn dần theo lá bỏ",
        howToPlay: "Mỗi lá bỏ khỏi tay phe mình cho 1 Tiến Hoá, mỗi tầng thêm 3 sát thương cho mọi chiêu lên mỗi mục tiêu. Q rẻ (15 mana), bỏ tới 3 lá thừa để lấy Khiên; E và R trúng mọi tướng địch. Pháp sư nhận 1 lá tạm Q/E mỗi lượt nên luôn có lá để đốt.",
        strengths: [
            "E (2 lần mỗi lượt) và R trúng mọi tướng địch.",
            "Tiến Hoá vô hạn, cộng vào từng mục tiêu: cuối trận rất nặng.",
            "Q Quick khi bị nhắm: bỏ lá thừa lấy Khiên ngay trong lượt địch.",
            "R Choáng địch nhiều Máu hiện tại nhất.",
        ],
        weaknesses: [
            "Máu 330, mỏng; Khiên Q phụ thuộc số lá bỏ đi.",
            "Bỏ lá lấy Khiên làm tay bài mỏng đi.",
            "Mất nửa Tiến Hoá khi bị hạ.",
        ],
        strategies: [
            "Nami: Phước Lành cộng sát thương cho mỗi địch trúng E, R.",
            "Twisted Fate, Braum (gợi ý combo của game).",
            "Đồ: Mũ Phù Thủy Rabadon, Mặt Nạ Đọa Đày Liandry, Quỷ Thư Morello.",
        ],
        counters: [
            "Sát thủ lao vào (Zed) hoặc Blitzcrank E vô hiệu R.",
            "Hạ Viktor để cắt nửa Tiến Hoá.",
        ],
    },
    twistedfate: {
        role: "Pháp sư điều khiển bộ bài",
        howToPlay: "Đầu mỗi lượt xem lá trên cùng và có thể đẩy xuống đáy. E gây sát thương rồi xếp 1 trong 3 lá trên cùng lên đỉnh, để Q lật đúng lá muốn: lá chiêu thì trúng thêm 2 đường kề, Vàng hoặc đồ thì Choáng, lá khác thì rút luôn. R lật 4 lá ném vào địch ngẫu nhiên, lá chiêu gấp đôi.",
        strengths: [
            "Kiểm soát lá rút: ít rút lá xấu, Q chọn được hiệu ứng nhờ E xếp đỉnh.",
            "Q, E rẻ (20 mana), mỗi lượt 2 lần.",
            "Q lật trúng lá thường là rút thêm bài.",
        ],
        weaknesses: [
            "Q, R phụ thuộc lá trên cùng; không chuẩn bị bằng E thì may rủi.",
            "R đánh địch ngẫu nhiên, 4 lá lật vào mộ.",
            "Máu 320, mỏng.",
        ],
        strategies: [
            "Bộ nhiều lá chiêu thì Q hay trúng 3 đường, R gây gấp đôi.",
            "Darius, Zed, Viktor (gợi ý combo của game).",
            "Đồ: Quyền Trượng Thiên Thần, Bùa Xanh.",
        ],
        counters: [
            "Blitzcrank cướp bài trên tay, Qiyana dồn nhanh.",
            "Dồn sát thương sớm: Máu 320 dễ bị sát thủ hạ.",
        ],
    },
    ahri: {
        role: "Pháp sư cơ động, tích Tinh Hoa",
        howToPlay: "Mỗi đánh thường, mỗi chiêu và mỗi lần đổi chỗ cho 1 Tinh Hoa vô hạn: chiêu +6 sát thương, đòn thường thêm phép và Tốc Đánh. E đổi chỗ với đồng minh để chọn kẻ đối diện mới; R gắn Say Mê vĩnh viễn, sau đó Q nhắm được kẻ Say Mê ở bất kỳ đường.",
        strengths: [
            "Tinh Hoa vô hạn từ cả đòn, chiêu lẫn đổi chỗ.",
            "Say Mê không hết hạn: Ahri gây thêm 25%, nó gây ít hơn 25% lên Ahri.",
            "Q thêm sát thương chuẩn theo Máu đã mất.",
        ],
        weaknesses: [
            "Chưa R thì Q chỉ nhắm được kẻ đối diện.",
            "E đổi chỗ có thể đẩy đồng minh vào thế xấu.",
            "Máu 340, mất nửa Tinh Hoa khi bị hạ.",
        ],
        strategies: [
            "R lên carry địch nguy hiểm nhất để Q với tới nó mọi lượt.",
            "Lux, Leona khoá mục tiêu (gợi ý combo của game).",
            "Đồ: Nanh Nashor, Mũ Phù Thủy Rabadon, Găng Bảo Thạch.",
        ],
        counters: [
            "Braum đỡ thay chiêu đơn mục tiêu.",
            "Dồn Ahri bằng chiêu chọn bất kỳ đường trước khi Tinh Hoa lớn.",
        ],
    },
    annie: {
        role: "Pháp sư dồn Choáng theo nhịp và gọi Tibbers",
        howToPlay: "Mỗi chiêu cho 1 Lửa, đủ 4 thì chiêu kế Choáng mọi địch trúng; địch đang Choáng chịu thêm 25% từ Annie và Tibbers. Đếm Lửa để chiêu đủ Lửa là R (Choáng cả bàn). R gọi Tibbers đánh cuối mỗi lượt Annie; Q hạ được mục tiêu thì về tay.",
        strengths: [
            "Choáng chắc chắn theo nhịp; R đủ Lửa là Choáng cả bàn.",
            "Q kết liễu thì về tay: dọn liên tiếp tướng yếu máu.",
            "E Quick khi bị nhắm: Khiên cho Annie và phản sát thương.",
            "Chiêu scale thêm Máu tối đa: lên đồ Máu vẫn có sát thương.",
        ],
        weaknesses: [
            "Nhịp Lửa dễ đoán: đối thủ biết lúc nào Choáng tới.",
            "R tốn 65 mana; Tibbers biến mất khi Annie bị hạ.",
            "Máu 350, mỏng.",
        ],
        strategies: [
            "Braum, Janna giữ Annie sống (gợi ý combo của game).",
            "Đồ: Mặt Nạ Đọa Đày Liandry, Quỷ Thư Morello, Mũ Phù Thủy Rabadon.",
        ],
        counters: [
            "Khăn Giải Thuật huỷ lần Choáng đầu tiên.",
            "Blitzcrank E cướp R; Katarina dồn Annie trước.",
        ],
    },
    lissandra: {
        role: "Pháp sư khoá bài địch bằng Hoá Băng",
        howToPlay: "Q chắc chắn Hoá Băng 1 lá trên tay đối thủ, chiêu khác có tỉ lệ; lá băng không dùng được trong 2 đơn vị. E Choáng nếu lá chiêu của mục tiêu đang bị băng. R Quick khi bị nhắm: sát thương cả bàn, thêm 30 mỗi lá băng, rồi Lissandra tự Đóng Băng.",
        strengths: [
            "Khoá lá trên tay đối thủ, kể cả lá phản ứng.",
            "R Quick khi bị nhắm: dồn cả bàn rồi Đóng Băng, không thể bị chọn hay nhận sát thương.",
            "Q, E rẻ; Q 2 lần mỗi lượt.",
        ],
        weaknesses: [
            "Lá bị băng là ngẫu nhiên; E chỉ Choáng khi đúng lá chiêu của mục tiêu bị băng.",
            "Lissandra bị hạ thì mọi lá băng tan.",
            "Đóng Băng sau R: Lissandra không hành động được 1 đơn vị.",
        ],
        strategies: [
            "Ashe, Brand (gợi ý combo của game).",
            "Đóng băng nhiều lá trước rồi R để cộng sát thương theo số lá băng.",
            "Đồ: Quyền Trượng Thiên Thần, Mũ Phù Thủy Rabadon.",
        ],
        counters: [
            "Hạ Lissandra để tan hết băng.",
            "Dùng đòn đánh thường thay vì nhắm chiêu vào cô để không kích R Quick.",
        ],
    },
    lux: {
        role: "Pháp sư tích Ánh Sáng theo mana cả đội tiêu",
        howToPlay: "Mỗi 5 mana phe mình tiêu cho 1 Ánh Sáng; mọi chiêu của Lux thêm 0.5 sát thương mỗi Ánh Sáng. Q Quick cho Khiên khi bị nhắm, E Choáng khi đã có từ 40 Ánh Sáng. R tự chọn chi 40 đến 120 mana: chi càng nhiều càng đau.",
        strengths: [
            "Ánh Sáng vô hạn, tích từ mana của cả đội chứ không riêng Lux.",
            "R bắn một mục tiêu với sát thương rất cao khi chi nhiều mana.",
            "Q Quick khi bị nhắm: gây sát thương một địch và có Khiên ngay trong lượt địch.",
        ],
        weaknesses: [
            "R chi nhiều mana làm cạn bể chung của cả đội.",
            "E chỉ Choáng khi đủ 40 Ánh Sáng; đầu trận yếu.",
            "Máu 320, mỏng; mất nửa Ánh Sáng khi bị hạ.",
        ],
        strategies: [
            "Sona hồi mana đội để Lux chi R lớn mà đồng đội vẫn còn mana.",
            "Leona, Ahri, Nami (gợi ý combo của game).",
            "Đồ: Mũ Phù Thủy Rabadon, Lời Thề Hiệp Sĩ, Bùa Xanh.",
        ],
        counters: [
            "Sát thủ (Katarina, Kha'Zix) dồn Lux sớm.",
            "Blitzcrank E vô hiệu R đã chi mana lớn.",
        ],
    },
    brand: {
        role: "Pháp sư đốt Bỏng cộng dồn cả bàn",
        howToPlay: "Mỗi chiêu trúng gắn Bỏng không trần; đầu lượt kẻ mang, mỗi Bỏng đốt 1% Máu hiện tại + 1% Máu tối đa, kể cả khi Brand đã ngã. Q Choáng kẻ có từ 3 Bỏng, E rải Bỏng cả bàn. R gây sát thương cả bàn, nhân đôi Bỏng và đốt ngay.",
        strengths: [
            "Bỏng không hết hạn, cháy cả khi Brand đã bị hạ.",
            "E và R trúng mọi địch; R nhân đôi số Bỏng.",
            "Sát thương theo % Máu: tốt lên tướng trâu.",
        ],
        weaknesses: [
            "Cần vài lượt để Bỏng đủ nhiều.",
            "Tướng mang Bỏng chết thì mất một nửa Bỏng.",
            "Máu 320, mỏng.",
        ],
        strategies: [
            "Kha'Zix, Lissandra, Lux (gợi ý combo của game).",
            "Đồ: Mặt Nạ Đọa Đày Liandry, Quỷ Thư Morello (giảm hồi máu đối thủ).",
        ],
        counters: [
            "Hồi máu (Soraka) và Khiên (Janna) bù sát thương Bỏng.",
            "Blitzcrank E cướp R Bão Lửa.",
        ],
    },
    velkoz: {
        role: "Pháp sư phân rã, sát thương ngẫu nhiên",
        howToPlay: "Mỗi tia chiêu trúng cho 1 Phân Rã, đủ 3 thì nổ sát thương chuẩn theo Máu tối đa. Q đánh nhẹ mục tiêu rồi tách sang tối đa 2 địch ngẫu nhiên với sát thương nặng hơn nhiều; E cắt 3 đường rồi nổ theo Máu đã mất; R bắn 10 tia ngẫu nhiên.",
        strengths: [
            "Phân Rã nổ chuẩn theo % Máu tối đa: tốt với tướng trâu.",
            "R 10 tia và Q tách tia: nhiều lần trúng, nhiều Phân Rã.",
            "Q không giới hạn số lần mỗi lượt.",
        ],
        weaknesses: [
            "Q và R rơi vào địch ngẫu nhiên, khó dồn một mục tiêu.",
            "Đòn thường yếu (Công 60).",
            "Máu 330, mỏng.",
        ],
        strategies: [
            "Đánh khi bàn địch ít tướng: tia ngẫu nhiên dồn vào ít mục tiêu hơn.",
            "Janna, Braum bảo kê; Brand cùng đánh theo % Máu.",
            "Đồ: Mũ Phù Thủy Rabadon, Mặt Nạ Đọa Đày Liandry.",
        ],
        counters: [
            "Sát thủ dồn (Zed, Kha'Zix).",
            "Khiên cả đội (Janna) hấp thụ nhiều tia nhỏ.",
        ],
    },
    rumble: {
        role: "Pháp sư tái chế lá chiêu từ mộ",
        howToPlay: "Một lần mỗi lượt vứt 1 lá chiêu của đồng minh khác để lấy 1 lá chiêu trong mộ phe mình; Rumble dùng lá đó như chiêu của mình, rẻ hơn 15 mana nhưng không có khống chế. Q phun lửa 3 đường, E Quick cho Khiên, R sát thương mọi địch.",
        strengths: [
            "Tái sử dụng chiêu mạnh của đồng đội từ mộ, rẻ hơn 15 mana.",
            "Q 3 đường và R mọi địch, hệ số AP cao.",
            "E Quick khi bị nhắm: phản sát thương và có Khiên.",
        ],
        weaknesses: [
            "Lá Tái Chế không áp khống chế, AD đổi sang AP theo 2 AP = 1 AD.",
            "Cần lá chiêu đồng minh trên tay để vứt và lá chiêu trong mộ để lấy.",
            "Máu 330, mỏng.",
        ],
        strategies: [
            "Viktor, Lux (gợi ý combo của game).",
            "Đội có R sát thương lớn để tái chế từ mộ.",
            "Đồ: Mũ Phù Thủy Rabadon, Mặt Nạ Đọa Đày Liandry.",
        ],
        counters: [
            "Teemo, Zed (bảng khắc chế của game).",
            "Câm Lặng Rumble (Garen Q, Blitzcrank R) để huỷ cả chiêu lẫn Lá Tái Chế.",
        ],
    },
    azir: {
        role: "Pháp sư gọi Lính Cát lên ô đồng minh",
        howToPlay: "E gọi Lính Cát lên ô của một tướng mình (tối đa 5); Lính ở lại ô dù tướng di chuyển. Mỗi đòn đánh Azir trúng, mọi Lính đâm địch đối diện ô của mình. Q dồn mọi Lính vào một kẻ theo Tốc Đánh, R mỗi Lính đâm 110 + 90% AP. Cứ 3 phát đồng đội đánh trúng, Azir nhận E miễn phí.",
        strengths: [
            "R với đủ Lính là một đòn sát thương phép cực lớn.",
            "E không giới hạn số lần mỗi lượt, có thêm E miễn phí từ đòn của đồng đội.",
            "Mỗi Lính cho Azir 8% Tốc Đánh, Q càng nhiều nhát.",
        ],
        weaknesses: [
            "Q, R không dùng được khi chưa có Lính; ô không có địch đối diện thì Lính không đâm.",
            "Azir bị hạ thì cả phe mất một nửa Lính.",
            "Tốn mana dựng Lính trước khi gây sát thương.",
        ],
        strategies: [
            "Đội đánh thường nhiều để nhận E miễn phí; Janna, Nami (gợi ý combo của game).",
            "Đặt Lính ở ô có địch đối diện.",
            "Đồ: Nanh Nashor, Cuồng Đao Guinsoo, Mũ Phù Thủy Rabadon.",
        ],
        counters: [
            "Sát thủ (Zed, Kha'Zix) hạ Azir để cắt nửa Lính.",
            "Đổi chỗ để ô đối diện Lính bị trống: Lính không có ai để đâm.",
        ],
    },
    sylas: {
        role: "Pháp sư đoạt chiêu cuối của địch",
        howToPlay: "Mỗi lá chiêu Sylas dùng cho 1 Xiềng Nổ (tối đa 3); đòn đánh tiêu 1 Xiềng Nổ gây thêm phép lên mục tiêu và 2 đường kề. Q đổi chỗ với đồng minh rồi quất kẻ trước mặt, E Quick hồi Máu. R đoạt R của một địch trên sân và tung ngay như của mình, giữ khống chế.",
        strengths: [
            "R dùng được chiêu cuối mạnh nhất bàn địch, giữ nguyên khống chế.",
            "E Quick khi bị nhắm: phản sát thương và hồi Máu theo Máu đã mất.",
            "Đòn đánh với Xiềng Nổ lan 3 đường.",
        ],
        weaknesses: [
            "R tốn 35 mana cộng mana gốc của chiêu đoạt: rất đắt.",
            "Phụ thuộc R của đội địch; một số chiêu không đoạt được.",
            "Máu 345, mỏng.",
        ],
        strategies: [
            "Đánh với đội địch có R mạnh (Nami, Leona, Malphite).",
            "Lux, Viktor (gợi ý combo của game).",
            "Đồ: Mũ Phù Thủy Rabadon, Nanh Nashor.",
        ],
        counters: [
            "Blitzcrank E vô hiệu chiêu đoạt; Lissandra Hoá Băng lá trên tay.",
            "Đội có R không đoạt được (Vayne, Kha'Zix, Gangplank, Teemo) làm R của Sylas mất giá trị.",
        ],
    },
    mel: {
        role: "Pháp sư tích Chói Lọi và kết liễu theo ngưỡng",
        howToPlay: "Chiêu của Mel gắn Chói Lọi lên địch; Q, E, R đau thêm theo số Chói Lọi, và sau khi Mel gây sát thương, địch có Máu không quá 20 + 12 mỗi Chói Lọi bị hạ ngay. Q bắn 2 tia mục tiêu và 1 tia mỗi đường kề để tích dấu; E phản lại chiêu đơn mục tiêu; R thu hoạch cả bàn.",
        strengths: [
            "Hạ ngay theo ngưỡng: kết liễu mà không cần hết Máu.",
            "E phản lại chiêu địch nhắm một đồng minh, kể cả khống chế.",
            "R trúng mọi địch, cộng theo Chói Lọi.",
        ],
        weaknesses: [
            "E rất đắt (80 mana) và chỉ phản ứng chiêu nhắm đúng 1 tướng.",
            "Chói Lọi mỗi chiêu ít, cần nhiều chiêu để tích.",
            "Máu 325, mỏng.",
        ],
        strategies: [
            "Brand, Soraka (gợi ý combo của game).",
            "Dùng Q nhiều lần trước khi R.",
            "Đồ: Mũ Phù Thủy Rabadon, Mặt Nạ Đọa Đày Liandry.",
        ],
        counters: [
            "Blitzcrank E nối Chuỗi lên lá E của Mel: vô hiệu phần phản chiêu.",
            "Dùng chiêu trúng cả phe để E không phản được.",
        ],
    },

    // ---------------- Trợ thủ ----------------
    nami: {
        role: "Trợ thủ hồi máu, khuếch đại sát thương cả đội",
        howToPlay: "Ra sân lần đầu nhận ngay Q và E lên tay. Q nảy hồi Máu đồng minh rồi đánh địch ngẫu nhiên; E Quick che Khiên cho tướng bị nhắm và gắn Phước Lành để chiêu của nó đau thêm. Giữ R Sóng Thần (60 mana) để Choáng cả bàn và gây Dễ Tổn Thương trước lượt dồn.",
        strengths: [
            "Dậy Sóng: mỗi 150 sát thương của phe cho mọi đồng minh +4 AP, mỗi 20 tầng rút 1 lá.",
            "R Choáng mọi địch và làm chúng chịu thêm 30% + AP sát thương trong 1 đơn vị.",
            "Phước Lành không hết hạn, không mất khi tướng mang chết.",
            "E Quick: phản ứng khi địch nhắm đúng một tướng mình.",
        ],
        weaknesses: [
            "Máu 360, mỏng; Nami chết thì AP từ Dậy Sóng tắt và mất nửa tầng.",
            "Q đánh địch ngẫu nhiên, không chọn được mục tiêu sát thương.",
            "Choáng của R gốc chỉ 0.4 đơn vị: thiếu AP thì phần lớn là xác suất.",
        ],
        strategies: [
            "Phước Lành lên tướng có chiêu trúng nhiều địch (Viktor E, Miss Fortune R).",
            "Viktor, Zed, Jinx (gợi ý combo của game).",
            "Đồ: Dây Chuyền Chuộc Tội, Lời Thề Hiệp Sĩ.",
        ],
        counters: [
            "Sát thủ dồn Nami trước; Blitzcrank E cướp R.",
            "Teemo, Renata (bảng khắc chế của game).",
        ],
    },
    soraka: {
        role: "Trợ thủ hồi máu cả đội",
        howToPlay: "Ra sân lần đầu nhận Q và E lên tay. E Quick đổi 40 Máu của Soraka lấy lượng hồi lớn cho đồng minh bị nhắm; Q đánh địch rồi tự hồi. Mỗi 150 Máu phe được hồi cho 1 Thánh Quang (+3% hồi máu nhận vào); R hồi cả đội, gấp đôi cho tướng dưới 40% Máu.",
        strengths: [
            "Thánh Quang vô hạn: hồi càng nhiều thì về sau càng mạnh.",
            "R gấp đôi cho tướng sắp gục: cứu nhiều người một lúc.",
            "Đòn thường của đồng minh đau thêm khi nó còn nhiều Máu hơn mục tiêu.",
            "E Quick 2 lần mỗi lượt, chỉ 20 mana.",
        ],
        weaknesses: [
            "Không cứu khỏi bị hạ: sát thương dồn một lần vẫn giết được.",
            "E tốn Máu của chính Soraka.",
            "Vết Thương Sâu (Quỷ Thư Morello) giảm 50% hồi máu.",
        ],
        strategies: [
            "Đội trâu đánh lâu: Garen, Kog'Maw, Aatrox.",
            "Đồ: Dây Chuyền Chuộc Tội, Vuốt Rồng, Lời Thề Hiệp Sĩ.",
        ],
        counters: [
            "Quỷ Thư Morello giảm hồi; sát thủ dồn một lượt (Zed, Katarina).",
            "Miss Fortune R trúng cả bàn trước khi kịp hồi.",
        ],
    },
    janna: {
        role: "Trợ thủ che Khiên, tăng Tốc Đánh cả đội",
        howToPlay: "Ra sân lần đầu nhận Q và E lên tay. E Quick cho Khiên và Mắt Bão (tăng AD/AP bằng 30% Khiên đang có); mỗi 150 Khiên phe nhận cho 1 Gió Thuận, làm Khiên dày hơn và tướng còn Khiên đánh nhanh hơn. Q biến tổng Khiên phe thành sát thương và Choáng; R Quick che Khiên và hồi cả đội.",
        strengths: [
            "Gió Thuận vô hạn: Khiên dày dần, tướng còn Khiên được thêm Tốc Đánh.",
            "E Quick 2 lần mỗi lượt, cho cả sức mạnh lẫn Khiên.",
            "R Quick khi địch tung chiêu cả phe.",
        ],
        weaknesses: [
            "Sát thương thấp ngoài Q.",
            "Mất nửa Gió Thuận khi bị hạ.",
            "Vết Thương Sâu giảm Khiên nhận vào.",
        ],
        strategies: [
            "Jinx, Vayne, Kog'Maw (gợi ý combo của game).",
            "Đồ: Dây Chuyền Chuộc Tội, Vương Miện Hoàng Gia.",
        ],
        counters: [
            "Quỷ Thư Morello giảm Khiên; Blitzcrank cướp R.",
            "Malphite, Blitzcrank (bảng khắc chế của game).",
        ],
    },
    renata: {
        role: "Trợ thủ cứu đồng minh, biến Máu mất thành sức mạnh",
        howToPlay: "Ra sân lần đầu nhận Q và E lên tay. Cả đội càng mất Máu thì càng có Tốc Đánh, Chí mạng và AD; mỗi đồng minh bị hạ được hồi sinh tại chỗ với 40% Máu một lần mỗi trận. Q đổi 20% Máu hiện tại lấy sức đánh, E Quick phản đòn và cho Khiên, R bắt địch tự đánh nhau.",
        strengths: [
            "Mỗi đồng minh được hồi sinh 1 lần mỗi trận.",
            "Cấp Vốn cho cả đội Tốc Đánh, Chí mạng, AD theo Máu đã mất.",
            "R Cuồng Loạn bắt địch đánh đồng minh của chính nó.",
        ],
        weaknesses: [
            "Renata không tự hồi sinh mình.",
            "Q tự trừ Máu của đồng minh.",
            "Sát thương bản thân thấp.",
        ],
        strategies: [
            "Đội đánh thường: Jinx, Vayne, Darius.",
            "Blitzcrank, Lux (gợi ý combo của game).",
            "Đồ: Dây Chuyền Chuộc Tội, Lời Thề Hiệp Sĩ.",
        ],
        counters: [
            "Hạ Renata trước vì cô không tự cứu mình.",
            "Twisted Fate, Malphite (bảng khắc chế của game).",
        ],
    },
    sona: {
        role: "Trợ thủ hồi mana cả đội, buff vĩnh viễn",
        howToPlay: "Ra sân lần đầu nhận Q và E lên tay. Mỗi lá chiêu phe mình trả mana thì đội hồi 25% lượng đó, phe mất Máu cũng hồi mana. Q buff vĩnh viễn AD và AP cho một tướng (lan 50% sang tướng kề), E Quick buff Giáp và Kháng phép, R Quick hồi Máu cả đội và mana.",
        strengths: [
            "Hồi mana bể chung: cả đội tung chiêu nhiều hơn.",
            "Buff Q, E vĩnh viễn, cộng dồn vô hạn, còn lại khi Sona ngã.",
            "E và R đều Quick.",
        ],
        weaknesses: [
            "Sát thương thấp (Công 60).",
            "Buff mất một nửa khi tướng mang bị hạ.",
            "Máu 345, mỏng.",
        ],
        strategies: [
            "Lux, Viktor (gợi ý combo của game): đội tiêu mana nhiều.",
            "Dồn Q lên một carry.",
            "Đồ: Lời Thề Hiệp Sĩ, Bùa Xanh, Dây Chuyền Chuộc Tội.",
        ],
        counters: [
            "Sát thủ (Zed, Kha'Zix) dồn Sona sớm.",
            "Hạ tướng đã nhận nhiều buff để cắt nửa.",
        ],
    },
}

/** Lối chơi của một tướng; không có thì trả undefined */
export const heroGuide = (id: string): HeroGuide | undefined => HERO_GUIDES[id]
