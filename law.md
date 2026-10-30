# Luật StarCi League

Các luật được chốt trong quá trình phát triển được ghi tại đây. Khi sửa luật, engine, bot, mô tả lá bài, giao diện và các tình huống `/vfx/examples` phải thống nhất với tài liệu này.

## 1. Chuỗi phản ứng (Chain)

Chốt ngày 30/10/2026.

### 1.1. Tối đa 4 mắt xích

- Mắt xích **1**: một người tung một lá chiêu hoặc thực hiện một đòn đánh thường.
- Đối phương có thể dùng **một lá phản ứng có điều kiện phù hợp** để đáp lại mắt xích đang ở trên cùng.
- Có thể phản ứng tiếp lên lá phản ứng, luân phiên hai bên: **A → B → A → B**. Ví dụ, A có thể dùng lá huỷ chiêu để đáp lại lá huỷ chiêu của B nếu điều kiện của lá A phù hợp.
- Tổng cộng tối đa **4 mắt xích**, tính cả hành động gốc; không phải 4 phản ứng cộng thêm. Không mở mắt xích 5.
- Mỗi lần nối phải kiểm tra lại điều kiện với **mắt xích trên cùng ngay lúc đó**, không lấy điều kiện của hành động gốc áp cho cả chuỗi. Không tự phản ứng lên mắt xích của chính mình.
- Khi đủ 4 mắt xích, hoặc bên đang có quyền phản ứng không có lá hợp lệ/chọn **Bỏ qua**, chuỗi bắt đầu giải quyết. Không nối thêm trong lúc giải quyết.
- Giải quyết từ cuối về đầu: **4 → 3 → 2 → 1** (chuỗi ngắn hơn thì bắt đầu từ mắt xích cuối thực có).
- Lá bị vô hiệu vẫn giữ vị trí trong chuỗi để người chơi theo dõi, nhưng khi tới lượt nó thì hiện **Bị vô hiệu** và bỏ qua hiệu ứng. Lá huỷ đã bị vô hiệu không thể tiếp tục huỷ lá mà nó định huỷ. Hiệu ứng phụ và nơi đến của lá tuân theo luật của chính lá đó.
- Sau mỗi mắt xích, cập nhật kết quả rồi kiểm tra mắt xích kế tiếp theo trạng thái hiện tại.

### 1.2. Chỉ phản ứng đúng điều kiện trên lá

Không được nối chuỗi tuỳ ý. Nhãn **Quick** chỉ thể hiện lá có khả năng phản ứng; bản thân nhãn này không cho phép dùng lá đó để đáp lại mọi hành động.

Mỗi lá phản ứng phải ghi rõ **sự kiện kích hoạt** và mọi giới hạn liên quan. Engine chỉ cho dùng lá khi toàn bộ điều kiện đều đúng với mắt xích trên cùng; giao diện chỉ đưa ra những lựa chọn hợp lệ đó. Một lá phản ứng không chỉ định tướng sẽ không thoả điều kiện “địch chỉ định 1 tướng”, dù hành động gốc trước đó có chỉ định tướng.

Các mẫu điều kiện:

| Câu trên lá | Điều kiện được phản ứng |
|---|---|
| **Nếu địch chỉ định 1 tướng, bạn có thể dùng lá này.** | Hành động gốc của địch thực sự chỉ định đúng một tướng. Nếu lá ghi thêm “tướng mình”, “đồng minh khác” hoặc tên tướng cụ thể thì phải đúng đối tượng đó. |
| **Khi địch tấn công, bạn có thể dùng lá này.** | Hành động gốc là một đòn đánh thường của địch. Sát thương từ chiêu, nội tại hoặc sát thương theo thời gian không tự được tính là đòn đánh thường. |
| **Khi địch đánh tướng này, bạn có thể dùng lá này.** | Hành động gốc là đòn đánh thường và mục tiêu chính xác là tướng được lá chỉ ra. |
| **Khi địch dùng một lá chiêu, bạn có thể dùng lá này.** | Hành động gốc là lá chiêu của địch; không áp dụng cho đòn đánh thường hoặc một hiệu ứng nội tại tự kích hoạt. |

Quy tắc xác định điều kiện:

- **Chỉ định** khác với **chịu ảnh hưởng**. Chiêu trúng mọi tướng không thành chiêu chỉ định một tướng chỉ vì trên sân hiện có một tướng.
- Một chiêu gây sát thương không mặc nhiên là một đòn đánh thường. Chiêu có tạo đòn đánh phải được xác định rõ trong luật của chiêu và dữ liệu sự kiện.
- Việc rút bài, nhận thưởng, ghép/đeo đồ, hồi máu hoặc tăng chỉ số không tự mở quyền phản ứng. Chỉ phản ứng khi có điều kiện trên lá cho phép đáp lại chính sự kiện đó.
- Đúng sự kiện vẫn phải đủ các điều kiện dùng lá: tướng đã ra sân và có thể hành động, đủ mana nếu có, lá không bị khoá, mục tiêu hợp lệ và các điều kiện riêng khác.
- Kiểm tra điều kiện khi đề nghị phản ứng và kiểm tra lại trên engine khi nhận hành động; không chỉ ẩn/hiện nút ở client.
- Không có điều kiện phản ứng rõ ràng thì không được mặc định cho nối chuỗi tự do. Các lá Quick hiện hữu phải được rà soát và chốt điều kiện cụ thể.

### 1.3. Ví dụ

**Đúng — đỡ đòn cho đồng minh:** địch đánh một đồng minh khác Braum → Braum dùng E Đứng Sau Tôi nếu thoả điều kiện Đỡ Thay → E giải quyết trước, rồi đòn gốc xử lý theo mục tiêu đã đổi.

**Đúng — vô hiệu lá chiêu:** địch dùng một lá chiêu → Blitzcrank dùng E Tay Giật nếu thoả điều kiện → vô hiệu/cướp lá và xử lý Choáng theo chiêu → lá gốc bị huỷ, không vẫn tung thêm một lần.

**Sai — phản ứng không đúng sự kiện:** địch tung chiêu gây sát thương → dùng một lá chỉ cho phép “Khi địch tấn công” mặc dù hành động đó không phải đòn đánh thường.

**Đúng — huỷ lá huỷ (ví dụ lá minh hoạ, không phải thêm chiêu cho tướng):**

1. A tung Hoả Cầu, chỉ định một tướng của B.
2. B dùng Huỷ Chiêu, điều kiện “Khi địch dùng một lá chiêu”, định huỷ mắt xích 1.
3. A dùng Phản Huỷ, điều kiện “Khi địch dùng một lá huỷ chiêu”, định huỷ mắt xích 2.
4. B dùng Chặn Phản Huỷ với cùng điều kiện phù hợp, định huỷ mắt xích 3. Đủ 4, bắt đầu giải quyết.

Kết quả: 4 huỷ 3 → 3 bị bỏ qua → 2 vẫn huỷ 1 → 1 bị bỏ qua. Hoả Cầu không gây sát thương.

**Sai — dùng lại điều kiện cũ:** mắt xích 1 chỉ định một tướng, mắt xích 2 là lá huỷ chiêu không chỉ định tướng; A không được dùng lá chỉ phản ứng khi “địch chỉ định 1 tướng” để nối lên mắt xích 2.

**Sai — vượt trần:** nối thêm mắt xích 5, dù trên tay còn lá có điều kiện phù hợp.

### 1.4. Trình diễn trên giao diện

1. Hiện lá hoặc đòn gốc và mục tiêu, chờ đối phương quyết định phản ứng; chưa cho hành động gốc gây sát thương.
2. Chỉ hiện các lá phản ứng đáp ứng điều kiện, kèm lý do ngắn, ví dụ “Địch đang đánh Braum”. Có nút **Bỏ qua**.
3. Hiện rõ số và chủ của từng mắt xích, quan hệ “đáp lại mắt xích nào”, điều kiện phù hợp và thứ tự giải quyết ngược. Hiện bộ đếm **1/4 → 4/4**.
4. Mỗi lần nối lại chuyển quyền cho đối phương; khi chuỗi đóng thì bắt đầu từ mắt xích cuối.
5. Giải quyết trọn từng mắt xích: hiện lá → tung hiệu ứng → cập nhật kết quả. Lá bị vô hiệu thì hiện **Bị vô hiệu**, không phát đòn đánh/chiêu giả.
6. Hoàn tất toàn bộ chuỗi rồi mới cho hành động kế tiếp chạy. Các mắt xích không phát hiệu ứng và sát thương chồng lên nhau.

## 2. Trạng thái áp dụng

- Đã triển khai `maxChain = 4`, quyền phản ứng luân phiên theo chủ mắt xích trên cùng, phân loại trigger `attack` / `skill` / `support` và trình diễn từng mắt xích riêng. Kiểm tra hồi quy đã xác nhận huỷ lá huỷ và giải quyết 4 → 3 → 2 → 1.
- Đã rà soát toàn bộ lá Quick hiện có: engine yêu cầu `quickWhen` rõ ràng và loại trigger xác định; thiếu điều kiện thì không được nối, kể cả client gửi hành động trực tiếp. Các lá “khi địch đánh” chỉ đáp `attack`, không đáp chiêu gây sát thương. Điều kiện chỉ định đơn không nhận chiêu trúng mọi tướng dù trên sân chỉ có một tướng.
- Leona E được nối khi địch tấn công hoặc dùng một lá chiêu; Janna R được nối khi địch tấn công. Điều kiện này hiện ngay trên mô tả VI/EN. Annie E được nối khi một lá hoặc đòn đánh địch chỉ định Annie làm mục tiêu đơn; cần đủ 4 Lửa mới có phần huỷ/phản công.
- Aatrox E, Braum R, Janna Q/E, Kha'Zix R, Lissandra R, Miss Fortune E và Vayne Q giữ nguyên hiệu ứng chủ động nhưng bỏ quyền Quick vì chưa có điều kiện phản ứng được chốt. Không tự suy diễn một trigger mới cho các lá này.

## 3. Đòn Miễn Phí và cách ghi thời hạn

Chốt ngày 30/10/2026.

- Bỏ cơ chế **Đòn Miễn Phí** khỏi game. Chiêu, nội tại và trang bị không cấp tài nguyên hoặc hiệu ứng mang tên này; mô tả và giao diện không còn đưa nó ra làm một quyền đánh bổ sung.
- Các đòn đánh trực tiếp do một chiêu thực hiện vẫn theo nội dung chiêu đó; ví dụ R của Renata vẫn khiến tướng địch đánh đồng đội. Đây không phải việc cấp một Đòn Miễn Phí để người chơi dùng sau.
- Đòn không cần lá của Đấu sĩ thuộc luật vai riêng, không đồng nhất với hiệu ứng Đòn Miễn Phí bị bỏ ở trên.
- Thời hạn phải ghi ngay trong câu cấp hiệu ứng, không chỉ giấu ở tooltip giải thích trạng thái. Nội tại Cứu Trợ của Renata ghi: **“nhận Cuồng Bạo tới hết lượt sau”**; bỏ phần cấp Đòn Miễn Phí.
- Giữ giới hạn nội tại Cứu Trợ: **1 lần mỗi đồng minh mỗi trận**.

## 4. Đơn vị thời gian và phần lẻ của khống chế

Chốt ngày 30/10/2026 trong chat cân bằng tướng; người dùng xác nhận chấp nhận random ở phần lẻ.

- Thời hạn khống chế, ví dụ Choáng, được biểu diễn bằng số thực không âm `d` đơn vị thời gian và có thể có hệ số theo AD/AP của chiêu.
- `floor(d)` đơn vị được bảo đảm; phần lẻ `d - floor(d)` là xác suất được thêm **1 đơn vị**, không phải một đoạn lượt bị cắt ngắn. `1,5` là 1 đơn vị chắc chắn và 50% thêm 1; `2,25` là 2 chắc chắn và 25% thêm 1; `0,75` là 75% được 1 đơn vị, 25% được 0.
- Một đơn vị lượt được tính từ Draw Phase của bên tung hiệu ứng tới hết lượt đối phương. Nếu hiệu ứng được tung trong lượt đối phương, phần còn lại tới hết chính lượt đối phương đó đã tính là 1 đơn vị.
- Ví dụ: A dùng Choáng 1 đơn vị trong lượt A → hết lượt B kế tiếp thì hết. A dùng Choáng 1 đơn vị ngay trong lượt B → hết chính lượt B đang diễn ra thì hết; không tự kéo qua lượt B tiếp theo nữa.
- Sau khi xác định số đơn vị nguyên thực tế, các đơn vị tiếp theo tiếp tục theo các mốc lượt của cùng bên tung hiệu ứng. Khi triển khai phải kiểm tra cả tình huống chủ động và nối chuỗi ngoài lượt.
- Công thức AD/AP và các giới hạn thời hạn thuộc từng chiêu, phải ghi rõ trong mô tả. Các công thức minh họa trong thảo luận chưa tự trở thành chỉ số chính thức của tướng.

**Trạng thái:** đã ghi nhận luật. Engine, bot, giao thức, mô tả và giao diện cần được đồng bộ riêng; không suy ra chúng đã áp dụng chỉ vì mục này tồn tại. Chưa chốt cách cộng/gia hạn khi nhiều khống chế cùng áp dụng, kháng hiệu ứng và thời điểm roll khi một hiệu ứng bị chặn.

## 5. Bể mana chung của mỗi bên

Chốt ngày 30/10/2026; người dùng xác nhận **mỗi bên có một bể 200 mana, cả đội cùng sử dụng**.

- Hai bên có hai bể độc lập. Mọi tướng cùng một bên chi mana từ bể chung của bên đó khi sử dụng chiêu.
- Chốt bổ sung ngày 31/10/2026: mỗi bể khởi đầu **80/200 mana**, theo trả lời trực tiếp “80 đi ok”.
- Ví dụ: bể đang có 200; một tướng dùng chiêu tốn 30, rồi một tướng khác dùng chiêu tốn 50 → cả đội còn 120 mana trong cùng bể.
- Trợ thủ có thể có hệ số theo mana; hệ số và đại lượng được dùng (ví dụ mana thực chi của lá) phải được ghi rõ theo từng chiêu. Chưa mặc định mọi SP dùng cùng một công thức mana.
- Chưa chốt cách hồi bể, tương tác của mana tối đa/hồi/hoàn mana từ trang bị, thời điểm trừ/hoàn khi lá bị vô hiệu và công thức chi phí cho từng tướng. Không tự suy diễn những phần này từ con số 200.

**Trạng thái triển khai 31/10/2026:** engine/UI/bot dùng hai bể mana chung 80/200, mọi vai cùng chi trả; triệu hồi/hồi sinh không đặt lại bể. Bản thử giữ chi phí có sẵn, hồi cơ bản 10 một lần mỗi lượt đội sau lượt đầu và giữ thời điểm chi trả khi kích hoạt; không bổ sung hoàn mana khi lá bị hủy. Các chi tiết hồi/hoàn và tương tác trang bị ở trên vẫn cần chốt cân bằng riêng, không coi thông số bản thử là luật người dùng đã duyệt toàn bộ.

## 6. Đánh đơn vị trong ô Triệu hồi phụ

Chốt ngày 30/10/2026: **mọi vai tướng đều được đánh thường đơn vị trong ô Triệu hồi phụ của đối phương**, không phụ thuộc lane của người đánh và không cần có tướng đối diện.

- Áp dụng cho Đấu sĩ, Đỡ đòn, Sát thủ, Xạ thủ, Pháp sư và Trợ thủ. Ô phụ là một lựa chọn mục tiêu riêng, không phải lane thứ sáu.
- Người đánh vẫn phải đủ điều kiện thực hiện đòn đánh: có thể hành động, có lá/quyền đánh tương ứng và còn giới hạn đòn. Mục tiêu vẫn phải chọn được; Tàng Hình hoặc Đóng Băng bản thân không tự bị bỏ qua.
- Quyền này không tự cho mọi tướng đánh đơn vị cùng phe. Ngoại lệ như Gangplank tự đánh Thùng của mình tuân theo chiêu/nội tại riêng.
- Đây là luật **đòn đánh thường**. Chiêu chỉ định vẫn cần quyền chọn vật triệu hồi được ghi trong dữ liệu chiêu (`targetsTokens`) hoặc cơ chế riêng của lá.

Đã áp dụng vào `attackTargets`: danh sách hành động hợp lệ dùng chung cho server, bot, UI và sandbox. Có kiểm thử đòn thật của đủ sáu vai, đường đối diện trống, mục tiêu không thể chọn và phân biệt hai phe.

## 7. Giới hạn chọn mục tiêu để giữ UX gọn

Chốt ngày 30/10/2026 trong lúc duyệt cơ chế Trợ thủ.

- Mỗi hành động/lá chỉ yêu cầu người chơi chọn thủ công **tối đa một tướng**. Không có bước chọn lần lượt một nhóm hai tướng trở lên hoặc chọn đủ cả nguồn lẫn đích chuyển hiệu ứng.
- Khi một chiêu tác động nhiều tướng, dùng một trong hai mẫu: **toàn bộ bàn của phe được mô tả** (ví dụ mọi tướng mình hoặc mọi tướng địch), hoặc **một tướng được chọn và một tướng khác ngẫu nhiên**.
- Mục tiêu ngẫu nhiên do engine chọn trong tập hợp hợp lệ, khác mục tiêu đầu; người chơi không phải chọn lần nữa. Không có người thứ hai hợp lệ thì chỉ xử lý người đầu.
- Hồi/buff chính người tung hoặc nội tại tự kích hoạt không thêm một bước chọn mục tiêu thủ công. Với phản ứng có mục tiêu đã khóa bởi mắt xích trên cùng, không mở thêm bước chọn lại người được bảo vệ.
- Các chiêu chuyển Khiên/bảo vệ phải tự xác định nguồn từ trạng thái hiện có để chỉ cần chọn người nhận, hoặc được thiết kế lại theo một trong hai mẫu trên.
- Giữ phân biệt **chỉ định** và **chịu ảnh hưởng** ở mục 1.2: tác động toàn bàn không thành chỉ định đơn chỉ vì hiện có một tướng.

**Trạng thái:** đã ghi nhận quy tắc thiết kế/UX. Cần rà lại cơ chế đề xuất của từng tướng và dữ liệu chọn mục tiêu; chưa coi các hộp chọn nhiều mục tiêu ở source hiện tại là đã được thay thế.

## 8. Gọi tướng, đổi chỗ, Tốc Đánh, cứu chết và mana trên trang bị

Phần dưới là mốc tích hợp do chat chính chọn theo quyền tự cân bằng, chưa phải từng con số người dùng đã duyệt.

- **Gọi tướng dần (giữ luật cũ, chốt lại 31/10/2026):** tướng được gọi úp theo các mốc `RULES.summonRounds` = **vòng 1, 4, 8, 13, 19**, mỗi mốc mở thêm 1 đường; các đường chưa tới mốc vẫn khóa. Chế độ xếp đủ 5 tướng ngay vòng 1 có sẵn trong engine (`RULES.fullBoard`) nhưng đang tắt.
- **Đổi chỗ vào ô đã có người là hoán đổi hai người giữ ô,** kể cả ô đang giữ chỗ cho tướng chết: tướng chết dời theo ô giữ chỗ, không hồi sinh, không mất thêm mạng, rồi hồi sinh tại ô mới. Ô trống đã mở thì vào thẳng. Tướng chết không thể bị chọn làm mục tiêu sống.
- **Tốc Đánh:** nền 100 (`RULES.baseAttackSpeed`). Một hành động đánh chốt Tốc Đánh một lần lúc bắt đầu, ra `floor(TĐ/100)` đòn thật cộng 1 đòn với xác suất `(TĐ mod 100)%`. 250 Tốc Đánh là 2 đòn chắc chắn và 50% thêm đòn thứ 3. Tốc Đánh kiếm được giữa hành động không sinh thêm đòn. Nguồn Tốc Đánh gồm chỉ số đồ, trạng thái `attack_speed` và hào quang `HeroDef.attackSpeedAura`.
- **Chí mạng:** hệ số mặc định ×2,25. Sát thương cộng thêm (nội tại, proc đồ, buff đòn kế) không tự chí mạng.
- **Khống chế lẻ (mục 4):** engine tung một lần mỗi lần áp, sau khi đã qua kiểm tra miễn/chặn. Lần áp bị chặn không tung lại. Áp lại cùng trạng thái giữ mốc hết hạn muộn hơn, không cộng dồn thời hạn.
- **Thứ tự cứu chết** (`RULES.lethalOrder`): Soraka P → Renata P → Aatrox R → Giáp Thiên Thần → Áo Choàng Bóng Tối → các nguồn khác. Nguồn đầu tiên cứu được thì dừng; chỉ nguồn đó bị tiêu.
- **Mana trên trang bị (chốt 31/10/2026):** đồ không nới trần bể 200 và không có công thức quy đổi chung. Tùy món, đồ liên quan mana mang một trong hai kiểu: (1) giảm mana chiêu của chính tướng đeo, hoặc (2) hồi bể mana chung của đội (mỗi lượt hoặc theo điều kiện). Manamune: +15 Tốc Đánh, AD = min(40, 20 + 20% điểm mana trên đồ của chính người đeo); sau một chiêu người đeo thực trả ≥ 20 mana, đòn trúng kế tiếp trong lượt mình hồi 15 mana, 1 lần/lượt. Trượng Trường Sinh: +20 AP; cứ 20 mana người đeo thực trả cho chiêu thì +5 AP vĩnh viễn, tối đa +40; không còn đọc bể đội thành AP. Vô Cực Kiếm: không tăng hệ số chí mạng; chí mạng bỏ qua 15 Giáp; sau 2 đòn liên tiếp không chí mạng thì đòn kế chắc chắn chí mạng.

**Trạng thái triển khai 31/10/2026:** đã có trong engine kèm test (`scripts/card_tests_v2.ts`, `card_tests_v3.ts`, `card_tests_items.ts`). Chưa làm: lá chắn cứu nguy của Trượng (v4), các món đồ v4 khác, hiệu ứng đã đặt (bom, dấu) tiếp tục chạy khi người tung chết, và việc chuyển chiêu tướng sang `g.attackAction`.

## 9. Ranh giới khi cân bằng (buff/nerf)

Chốt ngày 31/10/2026: **luật do chat chính giữ; chat cân bằng buff/nerf phải tuân thủ luật.**

**Chat cân bằng được tự chỉnh, không cần hỏi:**
- Chỉ số gốc của tướng trong khung đã chốt: Máu 300–500, Công 60–80.
- Hệ số AD/AP/Máu trong công thức chiêu, chi phí mana từng chiêu, thời hạn khống chế, tốc độ tích tầng của từng tướng.
- Con số trên trang bị (chỉ số, phần trăm, mức giảm hoặc hồi mana), giữ nguyên kiểu tác dụng của món.
- Remake kit tướng khi số không cứu được, nhưng kit mới vẫn phải theo đủ các mục luật bên dưới.

**Phải xin chat chính (và thầy duyệt) trước khi đổi:**
- Mọi giá trị trong `RULES` (packages/shared/src/cardgame/types.ts): mana đội (khởi đầu, trần, hồi), mốc gọi tướng và mở đường, số mạng, tay tối đa, quà tặng, hệ số chí mạng, Tốc Đánh nền, đòn không cần lá của Đấu sĩ, thứ tự cứu chết...
- Các luật đã chốt ở mục 1–8: chuỗi tối đa 4 và Quick đúng điều kiện, khống chế X.Y, bể mana chung, chọn tay tối đa 1 tướng, đổi chỗ là hoán đổi, Tốc Đánh chụp 1 lần, sát thương cộng thêm không chí mạng, 3 loại Khiên, tăng trưởng vô hạn, pháp sư nhận lá tạm, mana trên đồ theo 2 kiểu.
- Engine, giao thức, giao diện.

Muốn đổi luật vì lý do cân bằng: gửi chat chính đề xuất kèm số liệu trận; chưa duyệt thì không dùng làm kết quả cân bằng.

**Luật chung đã chốt thêm ngày 31/10/2026 (thầy duyệt):** hồi bể mana đội **20** mỗi lượt của mình từ lượt thứ 2 (`RULES.teamManaRegen`); đòn không cần lá của Đấu sĩ gây **50%** sát thương (`RULES.fighterCardlessMult`).
