# StarCi · game sandbox và tình huống VFX

Mở **http://localhost:5180/vfx/examples**. Đây là bản game chơi được, dùng cùng engine, store, FIFO trình diễn, Board, Hand, ChainStage, bảng chỉ số và Pixi VFX với trận mạng. Không cần đăng nhập hoặc server trận đấu.

- Mặc định bạn chơi Xanh, máy chơi Đỏ. Có thể đánh bài, chọn mục tiêu, nối/bỏ qua chuỗi, gọi tướng, ghép/đeo/tháo đồ và tiếp tục tới kết quả thật.
- **Máy tự đấu cả trận** dùng các hành động hợp lệ của engine cho cả hai phe. **Bạn chơi tiếp** trả quyền Xanh cho người dùng.
- **Dừng máy** dừng quyết định tiếp theo, để hiệu ứng đang giải quyết hoàn tất. **2 phe** cho điều khiển cả hai bên và xem tay của bên đang có quyền hành động.
- Mốc cuối màn hình cho phép mở nhánh từ một snapshot đã chơi thật, xoá phần tương lai và tự quyết định tiếp.
- Reset bằng **Chơi lại**. Không ghi vào tài khoản, bảng xếp hạng hay phòng mạng.

## Các URL

| Nhánh | Cơ chế được kiểm tra từ source |
|---|---|
| `/vfx/examples/basic-assassin` → `/basic-tank` | Sáu mẫu đòn thường theo vai: sát thủ chém, đấu sĩ đâm, pháp sư cầu phép, trợ thủ phép quỹ đạo, xạ thủ cung, đỡ đòn va đập |
| `/vfx/examples/brand-effects` | Một Q gây sát thương, gắn Bỏng, rồi Choáng; giữ đủ ba nhịp trên cùng mục tiêu |
| `/vfx/examples/brand-area` | E/R diện rộng có từng mục tiêu, Bỏng và sát thương duy trì |
| `/vfx/examples/swap-allies` | Ahri R và đồng minh đổi chỗ cùng lúc, đánh vào đối diện vị trí mới |
| `/vfx/examples/teemo-mushrooms` | Q gài ba nấm vào bộ đối thủ rồi R kích nổ lần lượt |
| `/vfx/examples/teemo-draw-mushroom` | Rút trúng nấm, nổ tại tướng ít máu nhất, rút bù, không đưa nấm lên tay |
| `/vfx/examples/full-match?seed=710` | Tay đầu, gọi tướng, quà, bài/chiêu, ghép đồ, chuỗi, sát thương, chết/hồi sinh và game-over thật |
| `/vfx/examples/summon-champions` | Checkpoint sau chia tay đầu: chọn/chốt tướng úp, hai bên lật cùng lúc tại ô lane |
| `/vfx/examples/viktor-e-jinx` | Viktor E đánh mọi tướng địch gồm Jinx, Leona, Lux; không chỉ một mục tiêu |
| `/vfx/examples/victor-e-jinx` | Alias cho URL trên |
| `/vfx/examples/draw-cards` | Rút 2 lá, bộ/tay cập nhật theo hoạt ảnh tới nơi |
| `/vfx/examples/blitz-steal` | Blitz Q cướp Vàng từ tay địch về tay mình đúng một lần, nhận Khiên nội tại |
| `/vfx/examples/blitz-steal-skill` | Blitz Q cướp chiêu Jinx, lá gốc vào mộ, đổi thành Q/E của đồng minh; Jinx chịu sát thương |
| `/vfx/examples/darius-e-pull` | Đối diện trống, Darius E kéo Jinx sang đường đối diện rồi mới gây sát thương |
| `/vfx/examples/chain-shield` | Darius đánh Annie → Annie E → Khiên xong mới xử lý đòn gốc |
| `/vfx/examples/chain-counter` | Đòn đánh → Renata E; trúng trước, phản sát thương chuẩn trở lại sau |
| `/vfx/examples/chain-four` | Annie Q → Blitz E → Leona E → Blitz E bản thứ hai; engine giải quyết 4→3→2→1, giật/vô hiệu lá 3 và 1 |
| `/vfx/examples/armor-and-mr` | Leona E +60 Giáp và Kháng Phép; Renata Q cộng Giáp; không biến chúng thành Khiên HP |
| `/vfx/examples/spell-shield-mana` | Checkpoint sau Lux E hợp lệ còn 70 mana; Q hồi mana và tạo Khiên, không gây sát thương |

Checkpoint khai báo một bàn đã có tướng bằng `Game.summon`, lấy lá có thật từ bộ bằng `tutor`, và dùng `applyAction` cho phần chuẩn bị có tiêu mana/sát thương. Sau đó mọi quyết định của người dùng/máy đều được kiểm tra `legalActions` và chạy qua `applyAction`; không tự sửa HP để dựng cảnh.

## Điều kiện phản ứng

`law.md` là luật được chốt. `maxChain=4`, luân phiên hai phe và xét mắt xích ngay trước. Quick chỉ có quyền phản ứng khi predicate `quickWhen` và điều kiện riêng của lá cho phép; thiếu điều kiện thì chỉ dùng chủ động nếu không phải lá Chỉ Nối Chuỗi. Sandbox dùng thẳng `cg.legalActions`, cùng nguồn luật với trận mạng.

Nhánh `chain-four` dùng Annie Q → Blitz E → Leona E → Blitz E thứ hai. Leona E có điều kiện rõ địch đánh thường hoặc dùng lá chiêu; Blitz E chỉ đáp lại lá chiêu. Lá bị vô hiệu vẫn giữ vị trí nhưng không tung hiệu ứng. Nhánh `chain-shield` dùng Annie E khi địch chỉ định Annie, với số Lửa ban đầu chưa đủ để kích bẫy; không gán quyền phản ứng mới cho Janna E.

## Ngữ pháp hình ảnh dùng chung

- Giáp: tấm thép; Kháng Phép: vòng rune. Khiên HP là đoạn trắng trên thanh máu, chỉ xuất hiện khi có sự kiện `shield` thật.
- Giảm sát thương dùng các vòng đệm mở; miễn sát thương dùng vòng kín sáng. Không dùng chung tín hiệu để tránh hiểu nhầm giảm là bất tử.
- Phản sát thương: đòn gốc tới nơi, cập nhật kết quả, rồi năng lượng bay ngược về người đánh. Không phát thêm một đòn đánh thường giả.
- Kéo/đẩy: thay đổi vị trí trước nhịp sát thương, dùng sự kiện `move` của engine.
- Tướng giữ motif riêng trong mapping; khung niệm → bay → trúng dùng chung. Hiệu ứng biểu trưng không thay đổi luật hay mục tiêu thực.

## Kiểm tra và quay

```bash
npm run test:examples
npm run test:vfx
npm run test:presentation
npm run typecheck
npm run build -w @starci/client
```

Test checkpoint kiểm tra mục tiêu, thứ tự move/damage, rút bài, chuỗi, phản đòn, Giáp/Kháng và mana/Khiên bằng event/state thật. Test adapter kiểm tra khóa thao tác khi trình diễn, chuỗi 4, chơi từ đầu tới kết quả thật, rồi mở nhánh trước/sau game-over để kiểm tra xóa kết quả tương lai. Test trận seed 710 chạy hợp lệ tới game-over, kiểm tra coverage gọi/rút/quà/chiêu/đánh/chuỗi/ghép/đeo/trạng thái/hạ gục/hồi sinh/kết thúc.

Video được quay trực tiếp bằng Playwright, 1600×900, từ bản production snapshot tách khỏi HMR để việc chỉnh code trong lúc quay không làm trận reload. Các clip không phải hoạt ảnh minh hoạ ghép từ ảnh.

Công cụ QA trong trang: `window.starciExamples.snapshot(true)` trả lại state, event và lịch sử thật; `setAuto(true)`, `setPaused(true)` và `fork(n)` phục vụ kiểm tra và quay. API này chỉ được route sandbox gắn lên window.
