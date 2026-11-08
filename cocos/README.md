# StarCi League · client Cocos Creator

Client Cocos Creator 3.8.8: đăng nhập / đăng ký, danh sách bộ bài, xếp bộ bài, sảnh đấu, ghép trận, cấm / chọn tướng,
màn trận (bàn 10 ô, tay bài, chuỗi, hộp thoại) và kết thúc trận. VFX: mỗi chiêu một ô hiệu ứng (`vfx/registry.ts`), tạm
thời là một hạt; mở link Preview kèm `?vfx` để xem thử từng chiêu.
Làm VFX cho tướng nào cũng theo [docs/VFX_RULES.md](../docs/VFX_RULES.md).
Giao diện theo DNA đã chốt ([docs/UI_DNA.md](../docs/UI_DNA.md)), dựng hoàn toàn bằng code trong `assets/scripts/`
(không prefab), nên chữ là chữ thật và đổi màu chỉ cần sửa [`dna/theme.ts`](assets/scripts/dna/theme.ts).

Dữ liệu đi qua API của server (`packages/server/src/api.ts`, PostgreSQL), cùng API với bản web.

## Chạy lần đầu

0. Ở gốc repo chạy `node scripts/sync-cocos.mjs`: chép luật và dữ liệu dùng chung (`packages/shared`), client Colyseus
   và bảng màu VFX theo chiêu vào `cocos/assets/scripts/` (các thư mục này không commit). Chạy lại mỗi khi `shared` đổi.
   Màn trận dùng luật V2 của `shared` (bước lượt `TurnStep`, hành động `ability` / `step`, `mode` khi gọi tướng): cần
   bản `packages/shared` có các phần này, nếu không typecheck sẽ báo thiếu.
1. Bật database và server ở gốc repo:

   ```bash
   docker compose up -d db
   npm run dev
   ```

2. Mở Cocos Dashboard → **Add / Import** → chọn thư mục `cocos/` này. Mở bằng Cocos Creator 3.8.8.
3. Trong Creator: **Assets** → chuột phải `assets/scenes` → **Create → Scene**, đặt tên `Main`, mở nó.
4. Chọn node **Canvas** → **Add Component** → gõ `App` → thêm.
5. **Project → Project Settings → Project Data**: Start Scene = `Main`. Bấm **Preview** (chạy ở `http://localhost:7456`).

## Cấu trúc

| file | việc |
|---|---|
| `assets/scripts/App.ts` | component gắn vào Canvas: nền, phiên đăng nhập, chuyển màn |
| `assets/scripts/dna/theme.ts` | màu, font, sân khấu 1920 × 1080 theo DNA |
| `assets/scripts/ui/kit.ts` | khung vát góc, nút (thường / hover / nhấn / tắt), ô nhập, nhãn |
| `assets/scripts/net/api.ts` | gọi API bằng XMLHttpRequest, giữ phiên ở `sys.localStorage` |
| `assets/scripts/net/config.ts` | địa chỉ API và nơi lấy tranh |
| `assets/scripts/screens/*` | 3 màn: đăng nhập, danh sách bộ bài, xếp bộ bài |

## Ảnh tướng, đồ và chiêu (thầy tự thêm)

Mọi ô chân dung tướng, ô món đồ và ô chiêu đều **vuông**. Code nạp ảnh theo mã, thiếu ảnh thì ô hiện khung trống giữ chỗ.
Thả file PNG hoặc JPG vuông vào đúng thư mục, tên file là mã (chữ thường, không dấu, như mã trong `packages/shared`):

| loại | thư mục | ví dụ | cỡ nên dùng |
|---|---|---|---|
| tướng | `assets/resources/art/heroes/` | `jinx.png`, `jayce.png`, `sylas.png` | vuông, từ 380×380 |
| món đồ, mảnh đồ | `assets/resources/art/items/` | `kiem_dai.png` | vuông, từ 128×128 |
| chiêu, tuyệt chiêu | `assets/resources/art/skills/` | `jinx_q.png`, `sylas_r.png` | vuông, từ 128×128 |
| tranh lá trong bộ | `assets/resources/art/cards/` | `spell_heal.png` | vuông, 512×512 |

Bản web có sẵn ảnh vuông ở `packages/client/public/heroes-square/`, `items/`, `card_skills/` để chép sang.

## Chưa có

- Màn sảnh / trận đấu (chưa nối Colyseus trong Cocos).
- Tranh lá bài: màn xếp bộ đang dùng ô chữ có dải màu nhóm; tranh sẽ lấy từ `ART_BASE` như nền bản đồ.
- Thư mục `library/`, `temp/`, file `.meta` và scene: Creator tự sinh khi mở project.
