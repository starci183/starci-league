# Luật VFX chung cho mọi tướng (Cocos)

Áp dụng cho mọi hiệu ứng trong `cocos/assets/scripts/vfx/<tướng>.ts`, gồm cả chiêu P/Q/E/R, đánh thường và phép bổ trợ.
Mục tiêu: nhìn hiệu ứng là biết engine vừa làm gì. Không có hiệu ứng "giả", tức là hình ảnh nói một đằng mà luật làm
một nẻo, hoặc số sát thương bật lệch lúc hình chạm. Cách ánh xạ sự kiện sang hiệu ứng xem thêm
[VFX_ACTION_MAPPING.md](VFX_ACTION_MAPPING.md).

## 0. Nghiên cứu trước khi vẽ

- Trước khi vẽ một tướng: xem icon từng chiêu (`cocos/assets/resources/art/skills/<tướng>_<p|q|e|r>.png`) và tra chiêu gốc
  trên mạng (hình dạng, chất liệu, màu, chuyển động). VFX phải bám sát icon và chiêu gốc: icon vòi lửa thì là lửa phun, icon
  khiên đồng điện xanh thì là khiên đồng có điện.
- Ghi ngắn trong đầu file VFX: mỗi ô lấy ý từ icon / chiêu gốc nào.

### 0.1 Vẽ hiệu ứng, không vẽ vũ khí (thầy chốt 2026-11-16)

- **Không vẽ hình vũ khí hay đồ vật**: không vẽ cây kiếm, cây rìu, khẩu súng, viên đạn có hình đầu đạn, cây cung, mũi tên,
  cây trượng, chiếc khiên... Chân dung trên lá đã có vũ khí của tướng; vẽ thêm hình vũ khí chỉ rối và trông như hình cắt dán.
- **Chỉ vẽ dấu vết chuyển động của vũ khí / phép**: cái mắt thấy khi vũ khí lướt qua quá nhanh.
  - Chém (kiếm, rìu, móng): **vệt chém** cong sáng, đầu vệt lõi trắng, đuôi mờ dần; chạm thì loé, tia lửa, vết chém đọng
    lại trên mục tiêu rồi nguội. Hướng chém đúng chiêu gốc (ví dụ bổ từ trên xuống, quét ngang).
  - Bắn (súng, cung, nỏ): **vệt đạn** (vệt sáng dài, đầu sáng), chớp nòng ở nguồn; chạm thì loé và văng tia. Không vẽ
    khẩu súng, không vẽ viên đạn có hình dạng.
  - Đâm, đấm, đập: **vệt lao** thẳng + sóng xung kích hình vòng / nứt đất ở điểm chạm.
  - Nước, lửa, gió, băng, điện: vẽ **chất liệu đang chuyển động**: nước chảy, sóng tràn, bọt bắn; lửa phun, tàn bay; gió
    xoáy thành vệt; băng kết tinh lan; điện nhảy thành tia gấp khúc.
- Được phép vẽ vật thể **do chính phép tạo ra** khi nó là trọng tâm chiêu (quả cầu năng lượng, tường băng, khe nứt, cột
  sáng), nhưng vẫn ưu tiên chất liệu (ánh sáng, khói, hạt) hơn hình khối cứng, và không vẽ hình người / sinh vật nhận ra được.
- **Không dùng hình khối cứng** (thầy chốt 2026-11-16): không mảnh tam giác, không ô vuông đất vụn, không vết nứt màu tối vẽ
  bằng đường gấp khúc. Chúng trông như "hình học" chứ không phải chất liệu. Thay bằng ánh sáng, tia lửa mảnh, bụi sáng, khói,
  sóng sáng trên mặt đất.
- Ví dụ Garen: đánh thường là vệt chém chéo nhỏ; Q một vệt chém lớn từ trên xuống qua mục tiêu; R một vệt chém dọc khổng lồ
  bổ từ trời xuống. Không vẽ hình thanh kiếm ở cả ba.

## 1. Hình ảnh diễn đúng luật

- Diễn đúng điều engine làm: đúng số mục tiêu, đúng đường, đúng thứ tự, đúng số nhịp. Chiêu đánh 3 đường thì hình phủ
  đúng 3 ô; chiêu 10 tia thì đúng 10 tia, mỗi tia vào đúng tướng engine chọn.
- Mục tiêu lấy từ sự kiện của engine (các sự kiện `damage`, `heal`, `move` ngay sau lá `cast`), không tự bịa, không chọn
  ngẫu nhiên trong VFX khi engine đã chọn.
- Không vẽ trúng tướng không mất máu, không vẽ nhịp engine không có, không bỏ nhịp engine có.
- Đổi luật chiêu thì đổi VFX trong cùng commit. Câu chữ trên màn Hướng dẫn (chọn tướng) cũng đổi theo.
- Hiệu ứng chỉ để trình diễn: không đọc hay sửa trạng thái trận, không quyết định sát thương.

## 2. Số sát thương bật đúng lúc hình chạm

- Mỗi cú trúng gọi `ctx.onBeat(i)` đúng khung hình nó chạm (i = 0, 1, 2...). Màn trận (cả trận thật lẫn Hướng dẫn) hiện số của nhịp i
  ngay trong callback đó.
- Cấm hẹn giờ đoán (`sleep(0.6)` rồi mới hiện số) để "khớp" với hiệu ứng. Đổi nhịp VFX là số lệch ngay.
- Chia sự kiện sát thương thành nhịp bằng một hàm thuần đặt cạnh VFX (ví dụ `riftBeats`, `rayBeats` trong `velkoz.ts`),
  dùng chung cho mọi nơi phát VFX, để không lệch nhau.
- Chiêu một nhịp không cần `onBeat` nhưng promise phải xong ngay lúc chạm: phần tan, khói, bụi chạy nền (`void`), không
  giữ hàng sự kiện.
- Phần đuôi sau nhịp cuối không giữ hàng quá 0,3 giây.

## 3. Đúng cỡ sân thật

- Kiểm trên màn Hướng dẫn (`?tutorial=<tướng>:<ô>`): trận thật chạy trong máy, sân 5 đường, mục tiêu lấy từ engine. Thư viện tướng cũ đã bỏ (2026-11-16). Màn `?vfx` chỉ để thử nhanh,
  không đủ để duyệt.
- Lá tướng trên sân khoảng 110 px, các đường cách nhau khoảng 130 px. Hiệu ứng không che chân dung quá 0,3 giây, không
  đè thanh máu hay số sát thương, không vượt khung bàn hay đè chữ hướng dẫn phía trên.
- Tia, cột, khe nằm gọn trong ô của mục tiêu. Cái gì dày hơn nửa lá là quá dày.
- Toạ độ Cocos có y hướng lên. Nguồn là tướng dùng chiêu, đích là vị trí engine báo.

## 4. Mỗi tướng một phong cách, mỗi chiêu nhận ra được

- Mỗi tướng có bảng màu và ngôn ngữ hình khối riêng, lấy cảm hứng từ chất tướng. Ví dụ Vel'Koz dùng plasma tím hồng lõi
  trắng và hình tam giác.
- Đánh thường luôn có hiệu ứng riêng, khác các chiêu. Nhìn là biết đó là đòn thường hay Q.
- Chiêu đổi chỗ, hồi máu, khiên, khống chế phải nhìn ra đúng loại: hồi máu không dùng màu hay hình của sát thương.
- VFX chỉ vẽ cho **chiêu**. Trạng thái kéo dài như Dễ Tổn Thương, Phước Lành, cộng chỉ số dùng **icon hiệu ứng** trên lá,
  không vẽ VFX riêng. Khống chế (Choáng, Câm Lặng...) dùng **VFX khống chế chung** cho mọi tướng (Choáng: `stunStars`),
  không tự chế hình riêng cho từng tướng.
- Chiêu có nhiều chặng (nảy, hồi rồi đánh) phải đi đúng đường engine báo qua `ctx.hops` (nguồn `via` của từng cú),
  không tự chọn ngẫu nhiên.

## 5. Hợp lý, chân thực, sáng tạo

Hiệu ứng là chất liệu thật đang xảy ra trên sân, không phải hình vẽ kỹ thuật. Sáng tạo được, nhưng phải tin được.

- **Có vòng đời, không bật/tắt cụt:** mọi thứ hình thành, phát triển rồi kết thúc theo cách của nó. Vết nứt bắt đầu
  là đường chân tóc, lan ra, toạc rộng, rồi khép lại hoặc hàn kín để lại vết; lửa bén rồi bùng rồi tàn thành than; băng
  kết tinh dần rồi vỡ. Không có hình hiện ra đã to đủ rồi biến mất trong một khung.
- **Theo vật lý của chất liệu:** đá nứt gãy góc, có đá vụn rơi xuống theo trọng lực; plasma toả sáng và nhấp nháy; nước
  bắn rồi rơi; khói bay lên và loang. Mảnh vỡ văng ngược hướng lực đánh, không văng đều mọi hướng như pháo hoa.
- **Không hình học công nghiệp:** tránh đường sin đều, hình thấu kính trơn, đối xứng hoàn hảo, nét đều tăm tắp. Dùng độ
  bất thường có kiểm soát: gãy khúc ngẫu nhiên, chỗ dày chỗ mỏng, nhánh tẽ, mép lởm chởm. Ngẫu nhiên phải có hạt giống
  (`seeded`) để hình đứng yên giữa các khung, không rung giật.
- **Có chiều sâu và ánh sáng:** biết nguồn sáng ở đâu. Lòng khe tối, ánh hắt từ đáy; vách hướng về nguồn sáng thì sáng,
  vách kia tối; vật ở gần có quầng, vật ở xa mờ hơn. Chồng nhiều lớp (bóng tối, thân, viền sáng, lõi) thay vì một màu
  phẳng.
- **Dày chi tiết như vật thật:** nhiều chi tiết nhỏ chồng lên nhau thay vì vài mảng trơn: đường nứt đoạn ngắn vài px có
  nhánh, nhánh con và nứt chân tóc; mặt nước nhiều vân, hàng trăm đốm bọt, bụi nước mịn; giọt bắn là nhiều hạt nhỏ, ít hạt
  lớn. Không dùng vài hạt to vón cục.
- **Có nguyên nhân rõ:** hiệu ứng xuất phát từ đâu thì nhìn thấy được (tia cắm xuống rồi đất mới nứt; mắt tụ năng lượng
  rồi mới bắn). Không có gì tự dưng xuất hiện tại mục tiêu khi luật nói nó đến từ người dùng chiêu.
- **Sáng tạo trong chất tướng:** lấy cảm hứng từ tướng gốc, nhưng được thêm chi tiết riêng hợp với bàn cờ thẻ bài, miễn
  là vẫn đọc ra đúng chiêu và đúng cơ chế.

## 6. Nhịp hình

- Mỗi cú gồm: tụ (≤ 0,25 s), bay (≤ 0,35 s), chạm (loé, mảnh, rung nhẹ), dư âm (chạy nền).
- Cả chiêu tối đa khoảng 1,5 s; chiêu nhiều tia tối đa khoảng 2,5 s.
- Rung màn hình chỉ cho cú nặng; cú nhẹ không rung.

## 7. Kỹ thuật

- Hạt dùng `particles.ts` (tối đa 1500 hạt sống). Hình khối vẽ bằng `Graphics` mỗi khung hình và phải gọi `done()` khi
  xong, không để node rò.
- **Viền mảnh cho MỌI chiêu và đánh thường** (P, Q, E, R, đánh thường, phép bổ trợ): nét lõi 1 đến 2 px, quầng ≤ 8 px,
  mềm bằng nhiều lớp chồng mờ dần, không dùng một nét dày cứng. Tia và cột trên sân không rộng quá khoảng 40 px kể cả
  quầng; đánh thường mảnh hơn chiêu.
- Không tải ảnh hay âm thanh từ ngoài trong VFX.

## 8. Kiểm trước khi xong

1. Mở preview `http://localhost:7456/?scene=5133e233-b17b-433a-82a9-b545d7f555cc&heroes=<mã tướng>` (Creator đang mở).
2. Phát từng ô (Nội tại, Q, E, R, Đánh thường). Hoặc tự động: `window.__heroPlay("q", 2)` (chiêu, đường mục tiêu).
3. Chụp ở tốc độ thật. Đặt `window.__vfxScale = 0.2` chỉ để soi hình, không dùng để duyệt nhịp số.
4. Kiểm lại từng mục trên: số bật đúng lúc chạm, không che, không vượt bàn, đúng số mục tiêu, có vòng đời và không trông như hình học máy móc.
5. Nếu sửa luật: `npm test`, rồi `node scripts/sync-cocos.mjs` để Cocos nhận bản engine mới.

## 9. Một chuẩn cho mọi tướng (chủ chốt 2026-11-16)

Mọi tướng cùng một độ đậm và độ chi tiết, **mẫu là Vel'Koz** (`velkoz.ts`). Không tướng nào được "nhạt" hơn mẫu.

- **Cường độ chung:** mọi hạt phát qua `vfx/tone.ts` (`VFX_STD`): cùng mật độ, độ sáng, trần kích thước và hệ số chiêu
  cuối. Không file tướng hay bộ helper nào được tự tiết chế riêng (bớt hạt, thu quầng). Muốn chỉnh độ đậm của cả game thì
  chỉnh một chỗ `VFX_STD`.
- **Bộ công cụ chung:** `vfx/kit.ts` tách từ Vel'Koz, tham số theo bảng màu tướng (`Palette`: lõi, chính, sâu, nhấn, bụi):
  lớp vẽ cộng sáng, tia mềm nhiều lớp, đốm sáng nhiều lớp, loé chạm có sóng xung kích, mảnh vỡ văng ngược hướng đánh, bụi tan,
  tụ năng lượng, đạn bay có đuôi, sóng loang mặt đất, ngẫu nhiên có hạt giống. Phần sáng / chạm / vỡ / bụi / tia dùng kit;
  hình riêng của tướng (kiếm, thùng, nấm, búa...) tự vẽ nhưng chồng lớp như Vel'Koz (tối, thân, viền sáng, lõi).
- **Mức tối thiểu mỗi ô (Nội tại, Q, E, R, Đánh thường):** có tụ → bay/chém → chạm (loé + sóng + mảnh + bụi) → dư âm chạy
  nền; R rõ ràng to nhất nhưng vẫn trong khung bàn. Đặt ô cạnh Vel'Koz trên màn Hướng dẫn mà thấy nhạt hơn là chưa đạt.
