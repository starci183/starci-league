# Hành động → N VFX

Một hành động ánh xạ đến **danh sách VFX**, kể cả khi hiện chỉ có một phần tử. N là số hiệu ứng trình diễn, không phải số lần gây sát thương. Chỉ engine được quyết định sát thương, trạng thái, mục tiêu và kết quả.

## Các tầng ánh xạ

1. Code tướng/chiêu phát các sự kiện gameplay theo thứ tự thật.
2. Mỗi sự kiện có thể chọn `visuals: string[]` từ kho VFX. Brand chọn cháy cho Bỏng; hiệu ứng độc chọn mẫu độc. Cùng kiểu sát thương duy trì không bắt buộc dùng cùng hình ảnh.
3. Nếu không chọn riêng, bộ ánh xạ dùng ý nghĩa sự kiện: hồi máu → hồi máu; khiên → khiên; Choáng → Choáng. Không suy diễn hiệu ứng từ chữ mô tả chiêu.
4. Renderer chạy đủ danh sách, tại đúng mục tiêu. Nhiều hiệu ứng lên cùng một tướng vẫn giữ từng nhịp; không gộp theo ID mục tiêu. Cập nhật máu/khiên/trạng thái một lần theo sự kiện gameplay, không lặp theo số VFX.

`visuals` vắng mặt dùng mặc định; `visuals: []` chủ động tắt VFX của sự kiện. Metadata chỉ phục vụ trình diễn, không cấp quyền phản ứng hay thay luật.

## Đánh thường theo vai — chốt mới nhất

| Hành động | Danh sách VFX hiện tại |
|---|---|
| Sát thủ đánh thường | Một hiệu ứng chém chém |
| Đấu sĩ đánh thường | Một hiệu ứng đâm thẳng |
| Pháp sư đánh thường | Cầu phép |
| Trợ thủ đánh thường | Cầu phép có quỹ đạo, hình khác pháp sư |
| Xạ thủ đánh thường | Mũi tên bắn vào mục tiêu |
| Đỡ đòn đánh thường | Va đập nặng |

Tướng có cơ chế đặc thù được khai báo ngoại lệ rõ ràng. Blitz móc vào lá bài rồi kéo; Teemo gài nấm vào bộ và nấm nổ từ bộ vào đúng tướng. Các chiêu chọn riêng hình thức bay/đâm/chém/phép mà không ghi đè ý nghĩa các hiệu ứng theo sau.

## Trình diễn tổ hợp

- Q Brand vào mục tiêu đủ Bỏng: cầu lửa tới → sát thương → thêm Bỏng → Choáng. Không thay ba hiệu ứng bằng một vụ nổ chung.
- Hồi máu và khiên trên cùng tướng: chạy cả hai VFX, cập nhật riêng từng chỉ số.
- Sát thương duy trì: cháy/độc/chảy máu xuất hiện tại nạn nhân, không bắn một đạn phép mới từ người gây hiệu ứng.
- Diện rộng: từng nạn nhân có VFX trúng và nhịp kết quả của mình.
- Đổi chỗ: hai lá cùng di chuyển theo hai đường nhường nhau, rồi chốt vị trí engine; không để một lá đứng im rồi bật sang ô khác.
- Chuỗi vẫn tối đa bốn mắt xích theo luật hiện hành, giải quyết ngược; mắt xích bị vô hiệu không phát VFX gây sát thương.
- Mana chung là tài nguyên riêng: VFX xanh lam khi chi/hồi, số và thanh HUD cập nhật theo sự kiện `teamManaChange`. Không dùng VFX hồi máu hoặc khiên để biểu diễn mana. Hai phe có hai bể độc lập, tối đa 200, khởi đầu 80.

## Xem và kiểm tra

Kho dùng chung: `/vfx`.

Các tình huống engine thật: `/vfx/examples/basic-assassin`, `/basic-fighter`, `/basic-mage`, `/basic-support`, `/basic-marksman`, `/basic-tank`, `/brand-effects`, `/brand-area`, `/swap-allies` (cùng tiền tố `/vfx/examples`).

`/vfx/examples/khazix-jump`: E nhảy đổi chỗ với đồng minh sống đang đối diện con mồi, đồng minh nhường về ô cũ, đáp xuống rồi mới đánh dấu và gây sát thương; Q chỉ đâm đối diện. Không có nhánh nhảy vào ô trống. Điều kiện được kiểm tra lại khi giải quyết.

`/vfx/examples/mana-spend`: Brand và Lux dùng chung bể 80→60→30; bể phe đối phương giữ nguyên.

Mỗi VFX phải hoàn tất hoặc hủy sạch khi rời trận/reset; danh sách không được làm kẹt hàng đợi. Không đưa UID hay thứ tự bộ bài bí mật vào metadata công khai.
