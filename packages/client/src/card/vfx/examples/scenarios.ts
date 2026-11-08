// Các nhánh chơi được: trạng thái đến từ engine thật, không có renderer/luật giả.
import {
    cg
} from "@starci/shared"

export interface ExampleSpec {
    slug: string;
    title: string;
    caption: string;
    recommended: string[];
    focus?: string;
}

export const EXAMPLES: ExampleSpec[] = [
    {
        slug: "jinx-summon", title: "Jinx · Chọn súng triệu hồi", caption: "Bấm Jinx ở Đội dự bị, so sánh Súng Máy với Tên Lửa, xác nhận rồi triệu hồi.", recommended: [], focus: "A:jinx"
    },
    {
        slug: "jayce-summon", title: "Jayce · Chọn dạng triệu hồi", caption: "Bấm Jayce ở Đội dự bị để chọn Búa hoặc Pháo, rồi xác nhận triệu hồi.", recommended: [], focus: "A:jayce"
    },
    {
        slug: "full-match", title: "Một trận hoàn chỉnh", caption: "Bạn điều khiển phe Xanh, máy điều khiển phe Đỏ. Chọn bài, gọi tướng, ghép đồ và nối chuỗi; mọi hành động đi qua engine thật.", recommended: [], focus: "A:darius"
    },
    {
        slug: "basic-attacks", title: "Đánh thường · Đủ 33 tướng", caption: "Mỗi trang 5 tướng mỗi bên. Phát lần lượt đòn đánh thường riêng của cả 33 tướng theo LMHT, trừ máu đúng lúc chạm; hết trang tự đổi đội trên bàn.", recommended: []
    },
    {
        slug: "nami-kit", title: "Nami · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Dậy Sóng, Q Thuỷ Triều, E Phước Lành, R Sóng Thần. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:nami"
    },
    {
        slug: "renata-kit", title: "Renata · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Cấp Vốn, Q Cứu Cánh, E Hoả Lực Yểm Trợ, R Hợp Chất Điên Loạn và hồi sinh đồng minh. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:renata"
    },
    {
        slug: "janna-kit", title: "Janna · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Gió Lốc, E Mắt Bão chủ động và nối chuỗi, R Gió Mùa, Hộ Phong. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:janna"
    },
    {
        slug: "soraka-kit", title: "Soraka · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Cứu Rỗi, Q Sao Băng, E Truyền Sinh Lực chủ động và nối chuỗi, R Điều Ước. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:soraka"
    },
    {
        slug: "qiyana-kit", title: "Qiyana · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. 5 đường mang Nguyên Tố công khai có dấu trên bàn; Qiyana hấp thụ theo đường đang đứng, màu đòn đổi theo. Phát Q và E với Đất, Nước, Cỏ, E Quick chỉ từ đường Cỏ, R 3 đường đủ ba biến thể. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:qiyana"
    },
    {
        slug: "ahri-kit", title: "Ahri · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Hút Tinh Hoa, Q Quả Cầu Ma Lực, R Mê Hoặc, E Phi Hồ đổi chỗ thật trên bàn, Q xuyên đường vào tướng Say Mê và combo cuối. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:ahri"
    },
    {
        slug: "blitzcrank-kit", title: "Blitzcrank · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Bàn Tay Hoả Tiễn cả khi kéo tướng, E Tay Giật cướp lá ngay trong Chuỗi kể cả lá R, R Trường Điện Từ, nội tại Thu Gom. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:blitzcrank"
    },
    {
        slug: "katarina-kit", title: "Katarina · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Dao rơi đầu lượt, Q Phi Dao, nhặt Dao, R Bông Sen Tử Thần sau khi nhặt, E Thuấn Bộ nối Chuỗi và combo cuối. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:katarina"
    },
    {
        slug: "khazix-kit", title: "Kha'Zix · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt địch Tàng Hình bị lộ và tự Cô Lập, đánh thường và Q có Cô Lập, R Quick né đòn, lá Q miễn phí, xáo R vào 5 lá trên cùng, gieo Cô Lập trượt, đánh thường và Q không Cô Lập, E Vồ Mồi đổi đường, gieo Cô Lập trúng. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:khazix"
    },
    {
        slug: "twistedfate-kit", title: "Twisted Fate · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Thần Bài, Q Chọn Bài đủ ba loại lá, E Xào Bài, R Định Mệnh. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:twistedfate"
    },
    {
        slug: "lux-kit", title: "Lux · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Chiếu Sáng, Q Lăng Kính chủ động và nối chuỗi, E Khoá Ánh Sáng có và không Choáng, R Cầu Vồng Tối Thượng bản nhỏ và đầy mana, luật chết. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:lux"
    },
    {
        slug: "viktor-kit", title: "Viktor · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Tiến Hoá Vinh Quang, Q Tháo Rời chủ động và nối chuỗi, E Tia Tử Thần, R Trường Trọng Lực. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:viktor"
    },
    {
        slug: "lissandra-kit", title: "Lissandra · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Băng Sâu Hoá Băng lá trên tay đối thủ, Q Mảnh Băng, E Vòng Băng gây Choáng, R Hầm Mộ Băng nối chuỗi với đòn của Jinx, tan băng. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:lissandra"
    },
    {
        slug: "brand-kit", title: "Brand · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Thiêu Rụi, E Rải Lửa, Q gây Choáng, Hoả Lực cháy đầu lượt, R Bão Lửa và luật chết mất nửa Bỏng. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:brand"
    },
    {
        slug: "annie-kit", title: "Annie · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Phi Tiêu Lửa, E Lá Chắn Cháy chủ động và nối chuỗi, R Tibbers, vuốt Tibbers, địch đánh Tibbers, R đủ 4 Lửa Choáng cả hàng, Q và Tibbers đánh tướng Choáng, Q kết liễu về tay. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:annie"
    },
    {
        slug: "tristana-kit", title: "Tristana · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường gắn Bom, bấm kích nổ không tốn lá, Q Bắn Nhanh, E Gắn Bom, vụ nổ 2, 6 và 12 Bom, R Đại Bác lan cả đội địch, Bom tự nổ khi đủ hạ, tướng mang chết mất nửa Bom. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:tristana"
    },
    {
        slug: "gangplank-kit", title: "Gangplank · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, nút Úp Lá đặt Thùng úp ở ô phụ, Thuốc Súng lớn dần mỗi lượt, địch phá Thùng đủ 4 kết quả, Gangplank tự kích nổ to dần, Q Ăn Cam, E Thùng 3 Thuốc Súng, R Lệnh Truy Nã có Vàng khi hạ. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:gangplank"
    },
    {
        slug: "yorick-kit", title: "Yorick · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường Đốt bài đối thủ vào Mộ, Hồn Ma tăng Máu tối đa và Giáp, mốc 20 tạo lá R, Q Nghi Thức Cuối, R Khúc Ai Ca gọi Ma Sương ở ô phụ, Ma Sương đánh cùng Yorick, E Sương Sầu Rã Giáp, gọi lại R hồi đầy và Tiến Hoá, Yorick chết thì Ma Sương biến mất. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:yorick"
    },
    {
        slug: "zed-kit", title: "Zed · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Một lượt combo liền mạch: Liên Hoàn tăng theo từng chiêu và đòn, Q Phi Tiêu, E Quick dịch chuyển tới địch bất kỳ, R Dấu Ấn cú sốc đầu, đánh tiếp, cuối lượt Dấu Ấn nổ số trắng lớn, Liên Hoàn tan, lá R mất. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:zed"
    },
    {
        slug: "rumble-kit", title: "Rumble · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Rumble chưa có trong engine nên đứng tạm ở ô Annie, chỉ đổi ảnh và tên trong demo này. Phát lần lượt đánh thường, Q Súng Phun Lửa, Tái Chế, Lá Tái Chế, E Khiên Phế Liệu chủ động và nối chuỗi, R Mưa Tên Lửa.", recommended: []
    },
    {
        slug: "garen-kit", title: "Garen · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường kèm nội tại Kiên Cường hồi Máu và cộng Giáp, Q Đòn Quyết Định Câm Lặng, E Phán Xét chủ động và nối chuỗi với Khiên, trúng ba đường, R Công Lý Demacia, luật chết mất nửa Giáp. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:garen"
    },
    {
        slug: "malphite-kit", title: "Malphite · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Thân Đá, Q Mảnh Vỡ Địa Chấn, E Mạch Đá chủ động và nối chuỗi, đòn địch chia đều qua mạch, đòn cả đội không chia, R Không Thể Cản Phá, đồng minh gục đứt một nhánh, Malphite gục vỡ cả mạch. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:malphite"
    },
    {
        slug: "kogmaw-kit", title: "Kog'Maw · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Đói đầu lượt và khi tướng khác chết, đòn đánh mạnh dần theo Đói, Q Phun Axít Rã Giáp, E Cao Xạ Ma Pháp tới mọi đường, R Pháo Sinh Học cả khi hạ gục, bị hạ không mất Đói. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:kogmaw"
    },
    {
        slug: "leona-kit", title: "Leona · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt Giáp Mặt Trời khi vào bàn, đánh thường, Q Khiên Bình Minh, E Nhật Thực chủ động và nối chuỗi huỷ đòn địch, R Thái Dương Giáng Thế. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:leona"
    },
    {
        slug: "sylas-kit", title: "Sylas · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Roi Xích, E Thợ Săn Vua, R Đoạt Chiêu và Chiêu Đoạt bằng chính VFX của tướng bị đoạt.", recommended: []
    },
    {
        slug: "mel-kit", title: "Mel · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Loạt Bắn Rực Rỡ, E Phản Quang Chiết Kính, ngưỡng hạ của nội tại, R Nhật Thực Vàng.", recommended: []
    },
    {
        slug: "azir-kit", title: "Azir · Stack trên đồng minh", caption: "Lính Cát là stack trên lá tướng, không chiếm đường. Ashe có 1, Azir có 2; dùng E để cộng thêm stack. VFX đâm chỉ phát khi gây sát thương.", recommended: ["azir_e"], focus: "A:azir"
    },
    {
        slug: "jayce-kit", title: "Jayce · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Búa và Pháo: đánh thường, Q Chỉ Thiên!, Q Cầu Sấm, E Lôi Phạt, E Cổng Tăng Tốc, R Biến Hình.", recommended: []
    },
    {
        slug: "velkoz-kit", title: "Vel'Koz · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Q Phân Hạch Plasma, dấu Phân Rã tăng theo tầng, E Khe Nứt Hư Không hai nhịp, R Tia Phân Rã Sự Sống và luật chết mất nửa Phân Rã. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:velkoz"
    },
    {
        slug: "missfortune-kit", title: "Miss Fortune · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường nảy sang 1 địch, Q Bắn Nảy sang 2 địch cả khi chí mạng, E Mưa Đạn phủ toàn hàng địch, R Đạn Tử Thần nhiều loạt. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:missfortune"
    },
    {
        slug: "vayne-kit", title: "Vayne · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên, tay giữ sáu lá Đánh Thường. Phát lần lượt Bóng Đêm khi chưa ra sân và khi trên sân, đánh thường, E Kết Án, Q Nhào Lộn né đòn sang đường kề, mất nửa Bóng Đêm khi gục, R Giờ Cuối xả cả tay lật kèo. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:vayne"
    },
    {
        slug: "darius-kit", title: "Darius · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường và Xuất Huyết cộng dồn, Chảy Máu đầu lượt, Q Tàn Sát tự hồi, E Bắt Giữ đổi chỗ thật, R Máy Chém Noxus cả khi không hạ lẫn khi hạ, luật chết và hết hạn. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:darius"
    },
    {
        slug: "braum-kit", title: "Braum · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Song Giáp, Q Cú Đấm Băng, Dấu Băng kích hoạt trên đòn đồng minh, E Đứng Sau Tôi nối chuỗi đỡ kỹ năng và đòn đánh, R Khe Băng, luật chết mất nửa Song Giáp. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:braum"
    },
    {
        slug: "ashe-kit", title: "Ashe · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên, Ashe đứng đường đầu để R bay chéo cả bàn. Phát lần lượt đánh thường gắn Buốt, Buốt tăng sát thương phe Ashe, Q Tập Trung, đủ Buốt gây Choáng, E Tên Băng, R Đại Băng Tiễn xuyên bàn và luật chết mất nửa Buốt. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:ashe"
    },
    {
        slug: "teemo-kit", title: "Teemo · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường xáo Nấm, Q Gài Nấm, rút trúng Nấm nổ chí mạng rồi rút bù, E Phi Tiêu Mù nối chuỗi huỷ đòn địch, R Kích Nổ chuỗi Nấm. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:teemo"
    },
    {
        slug: "ornn-kit", title: "Ornn · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên, đồng minh đeo sẵn đồ. Phát lần lượt đánh thường, Lò Rèn Sống, Q Núi Lửa Trồi, E Rèn Lửa chủ động và nối chuỗi, R Tiếng Gọi Thần Rèn chủ động, nối chuỗi và khi ô đồ đã đầy. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:ornn"
    },
    {
        slug: "aatrox-kit", title: "Aatrox · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt đánh thường, Cái Giá Bằng Máu theo Máu đã mất và hút máu, E Xiềng Xích Hút Máu, Q Lưỡi Gươm Darkin trên 3 đường, R Kẻ Diệt Thế, lần đầu về 0. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:aatrox"
    },
    {
        slug: "jinx-kit", title: "Jinx · VFX đủ bộ chiêu", caption: "Mốc 5 tướng mỗi bên. Phát lần lượt Súng Máy, Phấn Khích nhận Điên theo Máu đã mất, Hạ gục thêm Điên, Q đổi Bệ Phóng nổ lan 2 đường kề, Q đổi lại, E Lựu Đạn Ma Hỏa! nối chuỗi gây Mù huỷ đòn địch, R Tên Lửa Đạn Đạo Siêu Khủng Khiếp!, luật chết mất nửa Điên. Đây là demo hình ảnh theo đặc tả mới, chưa nối vào engine.", recommended: [], focus: "A:jinx"
    },
    {
        slug: "mana-spend", title: "Mana đội · Hai tướng chung một quỹ", caption: "Brand E tiêu 20 mana, rồi Lux E tiêu 30 mana từ cùng quỹ đội: 80 → 60 → 30 / 200. Mana đội đối phương không đổi.", recommended: ["brand_e",
            "lux_e"], focus: "A:brand"
    },
    ...([
        ["assassin",
            "zed",
            "Sát thủ · Chém chém"],
        ["fighter",
            "darius",
            "Đấu sĩ · Đâm thẳng"],
        ["mage",
            "lux",
            "Pháp sư · Cầu phép"],
        ["support",
            "janna",
            "Trợ thủ · Cầu phép quỹ đạo"],
        ["marksman",
            "ashe",
            "Xạ thủ · Mũi tên"],
        ["tank",
            "leona",
            "Đỡ đòn · Va đập nặng"]
    ].map(([role,
        hero,
        title]) => ({
        slug: `basic-${role}`, title, caption: "Một đòn đánh thật ánh xạ đến danh sách VFX theo vai. Các VFX trình diễn không tự tăng số lần gây sát thương.", recommended: ["basic"], focus: `A:${hero}`
    }))),
    {
        slug: "brand-effects", title: "Brand · Một chiêu, nhiều hiệu ứng", caption: "Jinx đang đủ Bỏng để Choáng. Q gây sát thương → thêm Bỏng → Choáng, mỗi hiệu ứng có VFX và nhịp cập nhật riêng.", recommended: ["brand_q"], focus: "A:brand"
    },
    {
        slug: "brand-area", title: "Brand · Diện rộng và Bỏng", caption: "E đánh từng mục tiêu và gắn Bỏng. R đánh diện rộng, nhân đôi Bỏng rồi kích hoạt sát thương duy trì tại từng tướng.", recommended: ["brand_e",
            "brand_r"], focus: "A:brand"
    },
    {
        slug: "swap-allies", title: "Ahri · Đổi chỗ đồng minh", caption: "E Phi Hồ đổi chỗ Ahri và Darius. Hai lá di chuyển cùng lúc, nhường đường nhau; sát thương đánh vào tướng đối diện vị trí mới.", recommended: ["ahri_e"], focus: "A:ahri"
    },
    {
        slug: "khazix-jump", title: "Kha’Zix · Nhảy tới con mồi", caption: "E nhảy sang ô đối diện Jinx; Darius nhường sang ô cũ của Kha’Zix. Đáp xuống rồi mới gắn Cô Lập và gây sát thương; Q đánh đối diện ở vị trí mới.", recommended: ["khazix_e",
            "khazix_q"], focus: "A:khazix"
    },
    {
        slug: "teemo-mushrooms", title: "Teemo · Gài nấm và kích nổ", caption: "Q gài Nấm vào bộ đối thủ (số Nấm theo kit); R kích nổ lần lượt vào tướng ít máu nhất. Nấm không lên tay và không tạo thêm trạng thái Độc.", recommended: ["teemo_q",
            "teemo_r"], focus: "A:teemo"
    },
    {
        slug: "teemo-draw-mushroom", title: "Teemo · Rút trúng nấm", caption: "Dùng Rút Bài: lá đầu là Nấm của Teemo đối thủ. Nấm bật khỏi bộ, nổ vào tướng ít máu nhất rồi rút bù; không chiếm chỗ trên tay.", recommended: ["draw"], focus: "B:teemo"
    },
    {
        slug: "summon-champions", title: "Triệu hồi tướng", caption: "Checkpoint sau chia tay đầu: chọn tướng và đường rồi chốt. Hai phe lật tướng cùng lúc tại đúng ô trên bản đồ.", recommended: [], focus: "A:darius"
    },
    {
        slug: "viktor-e-jinx", title: "Viktor · Tia Tử Thần", caption: "E của Viktor đánh mọi tướng địch: Jinx và các đồng đội cùng nhận sát thương phép. Chọn E hoặc chơi tiếp theo ý bạn.", recommended: ["viktor_e"], focus: "A:viktor"
    },
    {
        slug: "draw-cards", title: "Rút hai lá bài", caption: "Đánh Rút Bài: từng lá bay từ bộ lên tay. Số lá trong bộ và trên tay thay đổi đúng lúc lá tới nơi.", recommended: ["draw"], focus: "A:ashe"
    },
    {
        slug: "blitz-steal", title: "Blitzcrank · Cướp bài", caption: "Q cướp lá Vàng từ tay đối phương về tay bạn. Lá giữ nguyên danh tính; Q còn gây sát thương phép và Blitzcrank nhận 1 Phụ Tùng từ nội tại.", recommended: ["blitzcrank_q"], focus: "A:blitzcrank"
    },
    {
        slug: "blitz-steal-skill", title: "Blitzcrank · Cướp và đổi chiêu", caption: "Q cướp chiêu Jinx: lá gốc vào mộ đối phương, bạn nhận Q/E của tướng đồng minh đang trên sân. Jinx chịu sát thương và Blitzcrank nhận 1 Phụ Tùng.", recommended: ["blitzcrank_q"], focus: "A:blitzcrank"
    },
    {
        slug: "darius-e-pull", title: "Darius · Bắt Giữ", caption: "Bàn luôn đầy: E chọn Jinx ở đường khác, hoán đổi Jinx với Garen đang đối diện Darius, rồi gắn Chảy Máu và gây sát thương.", recommended: ["darius_e"], focus: "A:darius"
    },
    {
        slug: "chain-shield", title: "Chuỗi · Khiên trước đòn đánh", caption: "Darius đánh thường Annie. Annie E được phản ứng khi địch chỉ định Annie: mắt xích 2 gây phép lên Darius và tạo Khiên trước, rồi mắt xích 1 mới đánh trúng.", recommended: ["basic"], focus: "A:darius"
    },
    {
        slug: "chain-counter", title: "Chuỗi · Phản sát thương", caption: "Ashe bắn Jinx; Renata E nối chuỗi: Jinx bắn trả Ashe bằng AD của chính nó rồi nhận Khiên trước khi đòn gốc trúng.", recommended: ["basic"], focus: "B:renata"
    },
    {
        slug: "chain-four", title: "Chuỗi 4 · Giật chiêu và phản chiếu", caption: "1 Annie Q → 2 Blitz E → 3 Leona E → 4 Mel E. Leona đáp lại chiêu địch; Mel phản ứng khi chiêu nhắm một đồng minh. Giải quyết 4→3→2→1 theo engine. Checkpoint phe Đỏ có 200 mana; mỗi chiêu chỉ dùng một lần.", recommended: ["annie_q",
            "leona_e"], focus: "A:annie"
    },
    {
        slug: "armor-and-mr", title: "Giáp, Kháng Phép và Khiên", caption: "Leona E gây phép, Choáng địch và cộng Giáp cho Leona bằng trạng thái armor_up (không phải Khiên máu). Hãy so sánh Giáp bằng bảng chỉ số bên trái.", recommended: ["leona_e",
            "renata_q"], focus: "A:leona"
    },
    {
        slug: "spell-shield-mana", title: "Lux · Mana đội và Khiên", caption: "Checkpoint sau một E hợp lệ: đội đã tiêu mana của E. Q Lăng Kính chi tiếp từ quỹ chung, gây phép lên địch và tạo Khiên cho Lux.", recommended: ["lux_q"], focus: "A:lux"
    }
]

export const TEAM_A = ["darius",
    "viktor",
    "janna",
    "ornn",
    "ashe"]
/** Đội demo Nami, theo thứ tự đường: Nami đứng giữa */
const TEAM_NAMI = ["ashe",
    "darius",
    "nami",
    "viktor",
    "ornn"]
/** Đội demo Renata, theo thứ tự đường: Renata đứng giữa */
const TEAM_RENATA = ["ashe",
    "darius",
    "renata",
    "viktor",
    "ornn"]
/** Đội demo Janna, theo thứ tự đường: Janna đứng giữa */
const TEAM_JANNA = ["ashe",
    "darius",
    "janna",
    "viktor",
    "ornn"]
/** Đội demo Soraka, theo thứ tự đường: Soraka đứng giữa */
const TEAM_SORAKA = ["ashe",
    "darius",
    "soraka",
    "viktor",
    "ornn"]
/** Đội demo Ahri, theo thứ tự đường: Ahri đứng giữa */
const TEAM_AHRI = ["ashe",
    "darius",
    "ahri",
    "viktor",
    "ornn"]
/** Đội demo Jinx, theo thứ tự đường: Jinx đứng giữa */
const TEAM_JINX = ["ashe",
    "darius",
    "jinx",
    "viktor",
    "ornn"]
/** Đội địch của demo Jinx: TEAM_RENATA_FOES có Jinx nên đổi thành Gangplank */
const TEAM_JINX_FOES = ["garen",
    "leona",
    "annie",
    "gangplank",
    "lux"]
/** Đội demo Blitzcrank, theo thứ tự đường: Blitzcrank đứng giữa */
const TEAM_BLITZ = ["ashe",
    "darius",
    "blitzcrank",
    "viktor",
    "ornn"]
/** Lá tay đối thủ cho demo Blitzcrank: nguồn của mọi lá bị cướp và bị bỏ */
export const BLITZ_FOE_HAND = ["garen_q",
    "jinx_q",
    "annie_q",
    "lux_r",
    "leona_q",
    "garen_e",
    "jinx_e",
    "lux_q"]
/** Đội demo Teemo, theo thứ tự đường: Teemo đứng giữa */
const TEAM_TEEMO = ["ashe",
    "darius",
    "teemo",
    "viktor",
    "ornn"]
/** Đội demo Kog'Maw, theo thứ tự đường: Kog'Maw đứng giữa */
const TEAM_KOGMAW = ["ashe",
    "darius",
    "kogmaw",
    "viktor",
    "ornn"]
/** Đội demo Qiyana, theo thứ tự đường: Qiyana đứng giữa đường Cỏ */
const TEAM_QIYANA = ["ashe",
    "darius",
    "qiyana",
    "viktor",
    "ornn"]
/** Đội demo Katarina, theo thứ tự đường: Katarina đứng giữa */
const TEAM_KATARINA = ["ashe",
    "darius",
    "katarina",
    "viktor",
    "ornn"]
/** Đội demo Kha'Zix, theo thứ tự đường: Kha'Zix đứng giữa */
const TEAM_KHAZIX = ["ashe",
    "darius",
    "khazix",
    "viktor",
    "ornn"]
/** Đội địch của demo Kha'Zix: Qiyana đứng đối diện để có địch Tàng Hình bị lộ */
const TEAM_KHAZIX_FOES = ["garen",
    "leona",
    "qiyana",
    "jinx",
    "lux"]
/** Đội demo Twisted Fate, theo thứ tự đường: Twisted Fate đứng giữa */
const TEAM_TF = ["ashe",
    "darius",
    "twistedfate",
    "viktor",
    "ornn"]
/** Đội demo Lux, theo thứ tự đường: Lux đứng giữa */
const TEAM_LUX = ["ashe",
    "darius",
    "lux",
    "viktor",
    "ornn"]
/** Đội địch của demo Lux: TEAM_RENATA_FOES có Lux nên đổi thành Gangplank */
const TEAM_LUX_FOES = ["garen",
    "leona",
    "annie",
    "jinx",
    "gangplank"]
/** Đội demo Lissandra, theo thứ tự đường: Lissandra đứng giữa */
const TEAM_LISSANDRA = ["ashe",
    "darius",
    "lissandra",
    "viktor",
    "ornn"]
/** Tay đối thủ của demo Lissandra: ô 1 là lá chiêu Garen, ô 3 là lá chiêu Leona, khớp lissandraShowcase.ts */
const LISSANDRA_FOE_HAND = ["jinx_q",
    "garen_q",
    "lux_q",
    "leona_q",
    "annie_q",
    "jinx_e"]
/** Đội demo Brand, theo thứ tự đường: Brand đứng giữa */
const TEAM_BRAND = ["ashe",
    "darius",
    "brand",
    "viktor",
    "ornn"]
/** Đội demo Tristana, theo thứ tự đường: Tristana đứng giữa */
const TEAM_TRISTANA = ["ashe",
    "darius",
    "tristana",
    "viktor",
    "ornn"]
/** Đội demo Annie, theo thứ tự đường: Annie đứng giữa */
const TEAM_ANNIE = ["ashe",
    "darius",
    "annie",
    "viktor",
    "ornn"]
/** Đội demo Rumble: Rumble chưa có trong engine nên Annie đứng thế ở giữa, chỉ đổi ảnh và tên trong DOM */
const TEAM_RUMBLE = ["ashe",
    "darius",
    "annie",
    "viktor",
    "ornn"]
/** Đội demo Viktor, theo thứ tự đường: Viktor đứng giữa */
const TEAM_VIKTOR = ["ashe",
    "darius",
    "viktor",
    "janna",
    "ornn"]
/** Đội demo Garen, theo thứ tự đường: Garen đứng giữa để E trúng đủ ba đường */
const TEAM_GAREN = ["ashe",
    "darius",
    "garen",
    "viktor",
    "ornn"]
/** Đội địch của demo Garen: TEAM_LEONA_FOES có Garen nên đổi thành Leona */
const TEAM_GAREN_FOES = ["gangplank",
    "leona",
    "annie",
    "jinx",
    "lux"]
/** Đội demo Leona, theo thứ tự đường: Leona đứng giữa */
const TEAM_LEONA = ["ashe",
    "darius",
    "leona",
    "viktor",
    "ornn"]
/** Đội địch của demo Leona: TEAM_RENATA_FOES có Leona nên đổi thành Gangplank */
const TEAM_LEONA_FOES = ["garen",
    "gangplank",
    "annie",
    "jinx",
    "lux"]
/** Đội demo Vel'Koz, theo thứ tự đường: Vel'Koz đứng giữa */
const TEAM_MALPHITE = ["ashe",
    "darius",
    "malphite",
    "viktor",
    "ornn"]
const TEAM_SYLAS = ["ashe",
    "darius",
    "sylas",
    "viktor",
    "ornn"]
const TEAM_MEL = ["ashe",
    "darius",
    "mel",
    "viktor",
    "ornn"]
const TEAM_AZIR = ["ashe",
    "darius",
    "azir",
    "viktor",
    "ornn"]
const TEAM_JAYCE = ["ashe",
    "darius",
    "jayce",
    "viktor",
    "ornn"]
const TEAM_VELKOZ = ["ashe",
    "darius",
    "velkoz",
    "viktor",
    "ornn"]
/** Đội demo Miss Fortune, theo thứ tự đường: Miss Fortune đứng giữa */
const TEAM_MF = ["ashe",
    "darius",
    "missfortune",
    "viktor",
    "ornn"]
/** Đội demo Braum, theo thứ tự đường: Braum đứng giữa */
/** Đội demo Darius, theo thứ tự đường: Darius đứng giữa */
const TEAM_DARIUS = ["ashe",
    "viktor",
    "darius",
    "janna",
    "ornn"]
/** Đội demo Zed: Zed giữa đối diện Annie, Ashe đường đầu nhường ô đối diện Garen cho E */
const TEAM_ZED = ["ashe",
    "darius",
    "zed",
    "viktor",
    "ornn"]
/** Đội demo Gangplank: Gangplank giữa, đối diện Annie */
/** Đội demo Vayne: Vayne đứng giữa, Q sang đường Darius để R đối diện Garen */
const TEAM_VAYNE = ["ashe",
    "darius",
    "vayne",
    "viktor",
    "ornn"]
const TEAM_VAYNE_FOES = ["lux",
    "garen",
    "jinx",
    "leona",
    "annie"]
/** Đội demo Yorick, theo thứ tự đường: Yorick đứng giữa */
const TEAM_YORICK = ["ashe",
    "ornn",
    "yorick",
    "soraka",
    "zed"]
const TEAM_GANGPLANK = ["ashe",
    "ornn",
    "gangplank",
    "soraka",
    "zed"]
const TEAM_BRAUM = ["ashe",
    "darius",
    "braum",
    "viktor",
    "ornn"]
/** Đội demo Ashe: Ashe đứng đường đầu để R bay chéo cả bàn tới đường cuối */
const TEAM_ASHE = ["ashe",
    "darius",
    "janna",
    "viktor",
    "ornn"]
/** Đội demo Aatrox, theo thứ tự đường: Aatrox đứng giữa */
const TEAM_AATROX = ["ashe",
    "darius",
    "aatrox",
    "viktor",
    "ornn"]
/** Đội demo Ornn, theo thứ tự đường: Ornn đứng giữa */
const TEAM_ORNN = ["ashe",
    "darius",
    "ornn",
    "viktor",
    "janna"]
/** Đồ đeo sẵn của demo Ornn: Darius đầy ô, Janna trống, khớp ornnShowcase.ts */
const ORNN_WORN: Record<string, string[]> = {
    "A:ashe": ["cuong_dao",
        "vo_cuc_kiem"],
    "A:darius": ["sterak",
        "ao_choang_bong_toi",
        "kiem_tu_than"],
    "A:viktor": ["mu_rabadon"]
}
/** Đội địch của demo Renata và Janna: TEAM_B có Renata nên đổi vị trí đó thành Annie */
const TEAM_RENATA_FOES = ["garen",
    "leona",
    "annie",
    "jinx",
    "lux"]
export const TEAM_B = ["garen",
    "leona",
    "renata",
    "jinx",
    "lux"]
/** Đủ 33 tướng theo thứ tự chữ cái; mỗi trang 10 tướng, hai đội đánh xen kẽ */
const basicRoster = () => cg.implementedHeroes().map((hero) => hero.id).sort()
export const BASIC_ATTACK_PAGES = 4
export function basicAttackTeams(page: number) {
    const roster = basicRoster()
    const heroes = roster.slice(page * 10,
        page * 10 + 10)
    const lineup = [...heroes,
        ...roster.filter((hero) => !heroes.includes(hero))].slice(0,
        10)
    const attackers = heroes.map((_, i) => ({
        side: (i % 2 ? "B" : "A") as cg.Side, lane: Math.floor(i / 2)
    }))
    const a: string[] = [], b: string[] = []
    lineup.forEach((hero, i) => (i % 2 ? b : a).push(hero))
    return {
        a, b, attackers
    }
}
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export interface Scenario {
    spec: ExampleSpec;
    state: cg.GameState;
    opening: cg.GameEvent[];
}

export function scenarioSlug(path: string): string {
    const last = path.replace(/\/$/,
        "").split("/").at(-1) ?? "full-match"
    return last === "examples" ? "full-match" : last === "victor-e-jinx" ? "viktor-e-jinx" : last
}

function tutor(g: cg.Game, side: cg.Side, id: string) {
    g.tutor(side,
        (c) => c.id === id)
}

/** Checkpoint khai báo điều kiện bắt đầu; sát thương/hiệu ứng luôn do engine tính. */
export function createScenario(slug: string, seed = 710, page = 0): Scenario {
    const spec = EXAMPLES.find((x) => x.slug === slug) ?? EXAMPLES[0]
    if (spec.slug === "full-match" || spec.slug === "summon-champions" || spec.slug === "jayce-summon" || spec.slug === "jinx-summon") {
        const start = cg.newGameEx(seed,
            spec.slug === "jayce-summon" ? TEAM_JAYCE : spec.slug === "jinx-summon" ? TEAM_JINX : TEAM_A,
            TEAM_B)
        return {
            spec, state: start.state, opening: spec.slug === "full-match" ? start.events : []
        }
    }
    const roleHero = spec.slug.startsWith("basic-") ? spec.focus?.split(":")[1] : undefined
    const basics = spec.slug === "basic-attacks" ? basicAttackTeams(page) : undefined
    const teamA = basics ? basics.a : spec.slug === "sylas-kit" ? TEAM_SYLAS : spec.slug === "mel-kit" ? TEAM_MEL : spec.slug === "azir-kit" ? TEAM_AZIR : spec.slug === "jayce-kit" ? TEAM_JAYCE : spec.slug === "vayne-kit" ? TEAM_VAYNE :spec.slug === "qiyana-kit" ? TEAM_QIYANA : spec.slug === "yorick-kit" ? TEAM_YORICK : spec.slug === "zed-kit" ? TEAM_ZED : spec.slug === "darius-kit" ? TEAM_DARIUS : spec.slug === "gangplank-kit" ? TEAM_GANGPLANK : spec.slug === "jinx-kit" ? TEAM_JINX : spec.slug === "aatrox-kit" ? TEAM_AATROX : spec.slug === "tristana-kit" ? TEAM_TRISTANA : spec.slug === "kogmaw-kit" ? TEAM_KOGMAW : spec.slug ==="ashe-kit" ? TEAM_ASHE : spec.slug === "garen-kit" ? TEAM_GAREN : spec.slug === "leona-kit" ? TEAM_LEONA :spec.slug === "ornn-kit" ? TEAM_ORNN : spec.slug === "missfortune-kit" ? TEAM_MF : spec.slug === "braum-kit" ? TEAM_BRAUM :spec.slug === "lissandra-kit" ? TEAM_LISSANDRA : spec.slug === "viktor-kit" ? TEAM_VIKTOR :spec.slug === "lux-kit" ? TEAM_LUX : spec.slug === "brand-kit" ? TEAM_BRAND : spec.slug === "nami-kit" ? TEAM_NAMI : spec.slug === "renata-kit" ? TEAM_RENATA : spec.slug === "janna-kit" ? TEAM_JANNA : spec.slug === "soraka-kit" ? TEAM_SORAKA : spec.slug === "ahri-kit" ? TEAM_AHRI : spec.slug === "khazix-kit" ? TEAM_KHAZIX : spec.slug === "twistedfate-kit" ? TEAM_TF : spec.slug === "katarina-kit" ? TEAM_KATARINA : spec.slug === "teemo-kit" ? TEAM_TEEMO : spec.slug === "annie-kit" ? TEAM_ANNIE : spec.slug === "rumble-kit" ? TEAM_RUMBLE : spec.slug === "blitzcrank-kit" ? TEAM_BLITZ : spec.slug === "velkoz-kit" ? TEAM_VELKOZ : spec.slug === "malphite-kit" ? TEAM_MALPHITE : spec.slug === "mana-spend" ? ["brand",
        "lux",
        "janna",
        "ornn",
        "ashe"] : roleHero ? [roleHero,
        ...TEAM_A.filter(hero => hero !== roleHero)].slice(0,
        5) : spec.slug === "khazix-jump" ? ["khazix",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug.startsWith("brand-") ? ["brand",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug === "swap-allies" ? ["ahri",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug === "teemo-mushrooms" ? ["teemo",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug.startsWith("blitz-steal") ? ["blitzcrank",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug === "chain-four" ? ["annie",
        "leona",
        "darius",
        "ashe",
        "lux"] : spec.slug === "viktor-e-jinx" ? ["viktor",
        "darius",
        "janna",
        "ornn",
        "ashe"]
        : spec.slug === "armor-and-mr" ? ["leona",
            "renata",
            "viktor",
            "ashe",
            "darius"]
            : spec.slug === "spell-shield-mana" ? ["lux",
                "darius",
                "janna",
                "ornn",
                "ashe"]
                : spec.slug === "chain-counter" || spec.slug === "draw-cards" ? ["ashe",
                    "darius",
                    "janna",
                    "ornn",
                    "viktor"] : TEAM_A
    const teamB = basics ? basics.b : spec.slug === "sylas-kit" ? TEAM_RENATA_FOES : spec.slug === "mel-kit" ? TEAM_RENATA_FOES : spec.slug === "azir-kit" ? TEAM_RENATA_FOES : spec.slug === "jayce-kit" ? TEAM_RENATA_FOES : spec.slug === "khazix-kit" ? TEAM_KHAZIX_FOES : spec.slug === "vayne-kit" ? TEAM_VAYNE_FOES :spec.slug === "qiyana-kit" ? TEAM_RENATA_FOES : spec.slug === "yorick-kit" ? TEAM_RENATA_FOES : spec.slug === "zed-kit" ? TEAM_RENATA_FOES : spec.slug === "darius-kit" ? TEAM_RENATA_FOES : spec.slug === "gangplank-kit" ? TEAM_RENATA_FOES : spec.slug === "jinx-kit" ? TEAM_JINX_FOES : spec.slug === "aatrox-kit" ? TEAM_RENATA_FOES : spec.slug === "tristana-kit" ? TEAM_RENATA_FOES : spec.slug === "kogmaw-kit" ? TEAM_RENATA_FOES : spec.slug ==="ashe-kit" ? TEAM_RENATA_FOES : spec.slug === "garen-kit" ? TEAM_GAREN_FOES : spec.slug === "leona-kit" ? TEAM_LEONA_FOES :spec.slug === "ornn-kit" ? TEAM_RENATA_FOES : spec.slug === "missfortune-kit" ? TEAM_RENATA_FOES : spec.slug === "braum-kit" ? TEAM_RENATA_FOES :spec.slug === "malphite-kit" ? TEAM_RENATA_FOES : spec.slug === "velkoz-kit" ? TEAM_RENATA_FOES : spec.slug === "lissandra-kit" ? TEAM_RENATA_FOES : spec.slug === "viktor-kit" ? TEAM_RENATA_FOES :spec.slug === "lux-kit" ? TEAM_LUX_FOES : spec.slug === "renata-kit" || spec.slug === "janna-kit" || spec.slug === "ahri-kit" || spec.slug === "twistedfate-kit" || spec.slug === "katarina-kit" || spec.slug === "teemo-kit" || spec.slug === "blitzcrank-kit" ? TEAM_RENATA_FOES : spec.slug === "teemo-draw-mushroom" ? ["teemo",
        "garen",
        "jinx",
        "lux",
        "leona"] : spec.slug === "chain-four" ? ["blitzcrank",
        "renata",
        "jinx",
        "viktor",
        "mel"] : spec.slug === "chain-shield" ? ["annie",
        "jinx",
        "renata",
        "lux",
        "gangplank"]
        : spec.slug === "armor-and-mr" ? ["viktor",
            "garen",
            "jinx",
            "lux",
            "gangplank"] : TEAM_B
    let state = cg.newGame(seed,
        teamA,
        teamB)
    const g = new cg.Game(state)
    // Nhánh có bàn đã mở: không giả sát thương hoặc số HP, mọi tướng được gọi bằng Game.summon.
    state.round = 8
    state.turnNo = 15
    state.active = "A"
    state.phase = "main"
    delete state.blind
    state.actionsThisTurn = 0
    state.ownTurns = {
        A: 8, B: 7
    }
    for (const side of cg.SIDES) {
        const hand = state.players[side].hand.splice(0)
        for (const c of hand) g.toGrave(side,
            c,
            "checkpoint")
    }
    if (basics || spec.slug === "sylas-kit" || spec.slug === "mel-kit" || spec.slug === "azir-kit" || spec.slug === "jayce-kit" || spec.slug === "khazix-kit" || spec.slug === "vayne-kit" || spec.slug === "qiyana-kit" || spec.slug === "yorick-kit" || spec.slug === "zed-kit" || spec.slug === "gangplank-kit" || spec.slug === "darius-kit" || spec.slug === "jinx-kit" || spec.slug === "aatrox-kit" || spec.slug === "tristana-kit" || spec.slug === "kogmaw-kit" || spec.slug ==="ashe-kit" || spec.slug === "garen-kit" || spec.slug === "leona-kit" || spec.slug === "ornn-kit" || spec.slug === "missfortune-kit" || spec.slug === "braum-kit" || spec.slug ==="malphite-kit" || spec.slug === "velkoz-kit" || spec.slug === "lissandra-kit" || spec.slug === "viktor-kit" || spec.slug === "lux-kit" || spec.slug === "brand-kit" || spec.slug === "nami-kit" || spec.slug === "renata-kit" || spec.slug === "janna-kit" || spec.slug === "soraka-kit" || spec.slug === "ahri-kit" || spec.slug === "twistedfate-kit" || spec.slug === "katarina-kit" || spec.slug === "teemo-kit" || spec.slug === "annie-kit" || spec.slug === "rumble-kit" || spec.slug === "blitzcrank-kit") {
        // mốc 5 tướng: vòng 19, mở đủ 5 đường
        state.round = 19
        state.turnNo = 37
        state.ownTurns = {
            A: 19, B: 18
        }
        teamA.forEach((hero, lane) => g.summon("A",
            hero,
            lane))
        teamB.forEach((hero, lane) => g.summon("B",
            hero,
            lane))
        if (spec.slug === "azir-kit") {
            // Thế cờ kiểm tra từ engine: Lính Cát thuộc ô, không tạo unit.
            g.stackLane("A",
                state.units["A:ashe"].lane,
                "azir_soldiers",
                1)
            g.stackLane("A",
                state.units["A:azir"].lane,
                "azir_soldiers",
                2)
            for (const id of ["azir_e",
                "azir_q",
                "azir_r",
                "basic"]) tutor(g,
                "A",
                id)
        }
        if (spec.slug === "sylas-kit") for (const id of ["sylas_r",
            "sylas_q",
            "sylas_e",
            "basic"]) tutor(g,
            "A",
            id)
        // lá R phải có thật trên tay để demo đánh ra rồi cho về
        if (spec.slug === "zed-kit") for (const id of ["zed_q",
            "zed_e",
            "zed_r"]) tutor(g,
            "A",
            id)
        if (spec.slug === "darius-kit") for (const id of ["darius_q",
            "darius_e",
            "darius_r"]) tutor(g,
            "A",
            id)
        if (spec.slug === "lissandra-kit") for (const id of LISSANDRA_FOE_HAND) tutor(g,
            "B",
            id)
        // Q và nội tại bỏ tổng 6 lá thật trên tay
        if (spec.slug === "viktor-kit") for (const id of ["viktor_q",
            "viktor_e",
            "viktor_r",
            "viktor_q"]) tutor(g,
            "A",
            id)
        if (spec.slug === "blitzcrank-kit") {
            for (const id of BLITZ_FOE_HAND) tutor(g,
                "B",
                id)
            for (const id of ["blitzcrank_q",
                "blitzcrank_e",
                "blitzcrank_e",
                "blitzcrank_r"]) tutor(g,
                "A",
                id)
        }
        if (spec.slug === "ornn-kit") {
            for (const [id,
                items] of Object.entries(ORNN_WORN)) for (const item of items) g.equip(state.units[id],
                item)
            for (const id of ["ornn_q",
                "ornn_e",
                "ornn_r"]) tutor(g,
                "A",
                id)
        }
        // R xả sáu lá Đánh Thường giữ trên tay, các lá chiêu cũng đánh ra thật
        if (spec.slug === "vayne-kit") for (const id of ["vayne_q",
            "vayne_e",
            "vayne_r",
            "basic",
            "basic",
            "basic",
            "basic",
            "basic",
            "basic"]) tutor(g,
            "A",
            id)
        if (spec.slug === "rumble-kit") {
            tutor(g,
                "A",
                "annie_q")
            tutor(g,
                "A",
                "annie_e")
        }
    } else if (spec.slug === "mana-spend") {
        g.summon("A",
            "brand",
            2)
        g.summon("A",
            "lux",
            1)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "garen",
            3)
        tutor(g,
            "A",
            "brand_e")
        tutor(g,
            "A",
            "lux_e")
    } else if (roleHero) {
        g.summon("A",
            roleHero,
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "basic")
    } else if (spec.slug === "khazix-jump") {
        g.summon("A",
            "ornn",
            3)
        g.summon("A",
            "khazix",
            2)
        g.summon("A",
            "darius",
            1)
        g.summon("B",
            "jinx",
            1)
        g.summon("B",
            "garen",
            3)
        tutor(g,
            "A",
            "khazix_e")
        tutor(g,
            "A",
            "khazix_q")
    } else if (spec.slug.startsWith("brand-")) {
        g.summon("A",
            "brand",
            2)
        g.summon("B",
            "jinx",
            2)
        if (spec.slug === "brand-effects") {
            // Bỏng là bộ đếm đặt trên tướng mang (stack "burn"), không còn là trạng thái có hạn
            g.setStack(g.unit("B:jinx")!,
                "burn",
                cg.kit("brand").p.q3)
            tutor(g,
                "A",
                "brand_q")
        } else {
            g.summon("B",
                "garen",
                1)
            g.summon("B",
                "lux",
                3)
            tutor(g,
                "A",
                "brand_e")
            tutor(g,
                "A",
                "brand_r")
        }
    } else if (spec.slug === "swap-allies") {
        g.summon("A",
            "ahri",
            2)
        g.summon("A",
            "darius",
            1)
        g.summon("B",
            "jinx",
            1)
        tutor(g,
            "A",
            "ahri_e")
    } else if (spec.slug === "teemo-mushrooms") {
        g.summon("A",
            "teemo",
            2)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "garen",
            1)
        tutor(g,
            "A",
            "teemo_q")
        tutor(g,
            "A",
            "teemo_r")
    } else if (spec.slug === "teemo-draw-mushroom") {
        g.summon("A",
            "darius",
            2)
        g.summon("B",
            "teemo",
            2)
        tutor(g,
            "A",
            "draw")
        g.shuffleIn("A",
            [g.newCard({
                kind: "special", id: "mushroom", hero: "teemo", side: "B"
            })])
        g.moveToTop("A",
            c => c.id === "mushroom")
    } else if (spec.slug.startsWith("blitz-steal")) {
        g.summon("A",
            "blitzcrank",
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "blitzcrank_q")
        tutor(g,
            "B",
            spec.slug === "blitz-steal" ? "gold" : "jinx_q")
        // Six physical backs make the 6 → 5 transfer visible in the playable demo.
        for (let i = 0; i < 5; i++) g.giveCard("B",
            spec.slug === "blitz-steal" ? g.supportCard("gold") : g.skillCard("jinx",
                "B",
                "Q"),
            "hand")
    } else if (spec.slug === "chain-four") {
        g.summon("A",
            "annie",
            2)
        g.summon("A",
            "leona",
            1)
        g.summon("B",
            "blitzcrank",
            2)
        g.summon("B",
            "mel",
            1)
        g.s.teamMana.B = cg.RULES.teamManaMax ?? 200
        tutor(g,
            "A",
            "annie_q")
        tutor(g,
            "A",
            "leona_e")
        tutor(g,
            "B",
            "mel_e")
        tutor(g,
            "B",
            "blitzcrank_e")
    } else if (spec.slug === "viktor-e-jinx") {
        g.summon("A",
            "viktor",
            2)
        g.summon("A",
            "darius",
            1)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "leona",
            1)
        g.summon("B",
            "lux",
            3)
        tutor(g,
            "A",
            "viktor_e")
    } else if (spec.slug === "darius-e-pull") {
        g.summon("A",
            "darius",
            2)
        g.summon("B",
            "garen",
            2)
        g.summon("B",
            "jinx",
            1)
        g.summon("B",
            "lux",
            3)
        tutor(g,
            "A",
            "darius_e")
    } else if (spec.slug === "chain-shield") {
        g.summon("A",
            "darius",
            2)
        g.summon("B",
            "annie",
            2)
        tutor(g,
            "A",
            "basic")
        tutor(g,
            "B",
            "annie_e")
    } else if (spec.slug === "chain-counter") {
        g.summon("A",
            "ashe",
            2)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "renata",
            1)
        tutor(g,
            "A",
            "basic")
    } else if (spec.slug === "armor-and-mr") {
        g.summon("A",
            "leona",
            2)
        g.summon("A",
            "renata",
            1)
        g.summon("B",
            "garen",
            2)
        g.summon("B",
            "viktor",
            1)
        tutor(g,
            "A",
            "leona_e")
        tutor(g,
            "B",
            "viktor_e")
        tutor(g,
            "B",
            "basic")
    } else if (spec.slug === "spell-shield-mana") {
        g.summon("A",
            "lux",
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "lux_e")
        tutor(g,
            "A",
            "lux_q")
        const action = cg.legalActions(state,
            "A").find((a) => a.t === "play" && state.players.A.hand.find((c) => c.uid === a.uid)?.id === "lux_e")
        if (!action) throw new Error("Lux checkpoint: không có E hợp lệ")
        state = cg.applyAction(state,
            action).state
    } else {
        g.summon("A",
            "ashe",
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "draw")
    }
    state.phase = "main"
    state.chain = null
    return {
        spec, state, opening: []
    }
}

/** Bản trước hoạt ảnh mở tay: đảo đúng những lần rút opening đã được engine phát ra. */
export function beforeOpening(state: cg.GameState, events: cg.GameEvent[]): cg.GameState {
    const before = copy(state)
    for (const side of cg.SIDES) {
        const draws = events.filter((e): e is Extract<cg.GameEvent, { t: "draw" }> => e.t === "draw" && e.side === side && e.reason === "opening")
        const ids = new Set(draws.map((e) => e.card.uid))
        before.players[side].hand = before.players[side].hand.filter((c) => !ids.has(c.uid))
        before.players[side].deck.unshift(...draws.map((e) => e.card))
    }
    return before
}

export function recommendedAction(scenario: Scenario, state: cg.GameState, side: cg.Side): cg.Action | undefined {
    const legal = exampleLegalActions(state,
        side)
    if (scenario.spec.slug === "chain-four" && state.phase === "chain") {
        for (const id of side === "A" ? ["leona_e"] : ["blitzcrank_e",
            "mel_e"]) {
            const action = legal.find((a) => a.t === "chain" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === id)
            if (action) return action
        }
        return undefined
    }
    for (const id of scenario.spec.recommended) {
        const options = legal.filter((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === id && (scenario.spec.slug !== "chain-counter" || a.args?.target === "B:jinx"))
        // chiêu chọn số lượng (Teemo R: số Nấm) trình diễn với mức lớn nhất
        const amountOf = (a: cg.Action) => (a.t === "play" ? a.args?.amount ?? 0 : 0)
        const action = options.reduce<cg.Action | undefined>((best, a) => (!best || amountOf(a) > amountOf(best) ? a : best),
            undefined)
        if (action) return action
    }
    return undefined
}

/** Cùng điều kiện phản ứng canonical với trận mạng, không cấp quyền Quick riêng cho sandbox. */
export function exampleLegalActions(state: cg.GameState, side: cg.Side): cg.Action[] {
    return cg.legalActions(state,
        side)
}

/** Bot trình diễn chỉ chọn hành động hợp lệ; ưu tiên ghép đồ/rút bài rồi bot dễ của game. */
export function chooseExampleAction(state: cg.GameState, side: cg.Side): cg.Action {
    const legal = exampleLegalActions(state,
        side)
    if (!legal.length) throw new Error("Sandbox không có hành động hợp lệ")
    if (state.phase === "blind") {
        const chosen = state.players[side].heroes.find((id) => legal.some((a) => a.t === "summon" && a.hero === id))
        const summon = legal.find((a) => a.t === "summon" && a.hero === chosen)
        return summon ?? legal.find((a) => a.t === "ready") ?? legal[0]
    }
    if (state.phase === "chain") {
        const replies = legal.filter((a) => a.t === "chain")
        const priority = ["annie_e",
            "renata_e",
            "janna_e",
            "leona_e",
            "braum_q"]
        return replies.sort((a, b) => priority.indexOf(state.players[side].hand.find((c) => c.uid === (a as Extract<cg.Action, { t: "chain" }>).uid)?.id ?? "") - priority.indexOf(state.players[side].hand.find((c) => c.uid === (b as Extract<cg.Action, { t: "chain" }>).uid)?.id ?? ""))[0] ?? legal.find((a) => a.t === "pass") ?? legal[0]
    }
    const special = legal.find((a) => a.t === "upgrade") ?? legal.find((a) => a.t === "craft")
        ?? legal.find((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === "legend")
        ?? legal.find((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === "draw")
    if (special) return special
    const best = cg.chooseAction(state,
        side,
        "easy")
    if (best.t === "play" && state.players[side].hand.find((c) => c.uid === best.uid)?.id === "item") {
        // Giữ mảnh trên tay để có một lần ghép thật, thay vì lắp ngay từng mảnh lẻ.
        return legal.find((a) => a.t === "attack")
            ?? legal.find((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.kind === "skill")
            ?? legal.find((a) => a.t === "end") ?? best
    }
    return best.t === "unequip" ? legal.find((a) => a.t === "end") ?? best : best
}

export function actionCaption(state: cg.GameState, action: cg.Action): string {
    const side = action.side === "A" ? "Xanh" : "Đỏ"
    if (action.t === "play" || action.t === "chain") {
        const card = state.players[action.side].hand.find((c) => c.uid === action.uid)
        const name = card ? cg.cardInfo(new cg.Game(state),
            card).name : action.uid
        return `${side} · ${action.t === "chain" ? "Nối chuỗi: " : ""}${name}`
    }
    if (action.t === "summon") return `${side} · gọi ${cg.getHero(action.hero)?.name ?? action.hero}`
    if (action.t === "attack") return `${side} · ${cg.getHero(state.units[action.actor].hero)?.name} đánh không cần lá`
    const labels: Partial<Record<cg.Action["t"], string>> = {
        end: "Kết thúc lượt", pass: "Bỏ qua nối chuỗi", ready: "Chốt gọi tướng", craft: "Ghép trang bị", upgrade: "Nâng cấp trang bị", discard: "Bỏ bài", unequip: "Tháo trang bị"
    }
    return `${side} · ${labels[action.t] ?? action.t}`
}
