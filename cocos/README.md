# StarCi League · client Cocos Creator

Client Cocos Creator 3.8.8 cho các màn ngoài trận: **đăng nhập / đăng ký**, **danh sách bộ bài**, **xếp bộ bài**.
Giao diện theo DNA đã chốt ([docs/UI_DNA.md](../docs/UI_DNA.md)), dựng hoàn toàn bằng code trong `assets/scripts/`
(không prefab), nên chữ là chữ thật và đổi màu chỉ cần sửa [`dna/theme.ts`](assets/scripts/dna/theme.ts).

Dữ liệu đi qua API của server (`packages/server/src/api.ts`, PostgreSQL), cùng API với bản web.

## Chạy lần đầu

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

## Chưa có

- Màn sảnh / trận đấu (chưa nối Colyseus trong Cocos).
- Tranh lá bài: màn xếp bộ đang dùng ô chữ có dải màu nhóm; tranh sẽ lấy từ `ART_BASE` như nền bản đồ.
- Thư mục `library/`, `temp/`, file `.meta` và scene: Creator tự sinh khi mở project.
