# StarCi League

Game bài chiến thuật triệu hồi 1v1, 5 lane. Tướng có giai đoạn mạnh riêng và phải "nuôi".
Monorepo TypeScript chung một source:

| Gói | Công nghệ | Vai trò |
|---|---|---|
| `packages/shared` | TypeScript thuần | Luật game, thẻ bài, **adapter tướng**. Server và client cùng dùng |
| `packages/server` | Colyseus 0.16 | Server quyết định mọi luật, giữ bài trên tay và bài úp bí mật |
| `packages/client` | React + Vite + PixiJS | Bàn thẻ bài React, lá bài, VFX (chế độ bàn cũ tải riêng) |

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5180 ở **2 tab**, mỗi tab là một người chơi. Thêm `?name=Tên` vào cuối link để đặt tên.

```bash
npm run smoke
```

Lệnh này cho 2 bot đánh nhau qua server thật để kiểm tra luật. Cần chạy `npm run dev` trước.

## Chế độ thẻ bài (phòng `card`)

Luật: [docs/LUAT_THE_BAI.md](docs/LUAT_THE_BAI.md). API engine: [docs/CARDGAME_API.md](docs/CARDGAME_API.md). Giao thức client/server: [docs/CARDGAME_PROTOCOL.md](docs/CARDGAME_PROTOCOL.md).

```bash
npm test                  # test luật thẻ bài
npm run selfplay -- 1000  # bot tự đánh 1000 trận, in tỉ lệ thắng theo tướng
```

## Thư viện VFX

Chạy `npm run dev:client`, mở **http://localhost:5180/vfx**. Trang độc lập, không cần đăng nhập hoặc server trận đấu; giữ nền bàn `map/board5.jpg`.

- Xem toàn bộ hiệu ứng theo nhóm vũ khí, nguyên tố, phép, khống chế, hỗ trợ và bài/trận đấu.
- Tab Tướng có đòn thường và P/Q/E/R của đủ 33 tướng; tab Bổ trợ có các phép chung.
- Đổi hướng, 1/3 mục tiêu, cường độ, chí mạng; phát lại, phát lần lượt hoặc dừng ngay.
- Trang dùng cùng registry và chuỗi niệm → bay → trúng với game. Kiểm tra mapping: `npx tsx scripts/vfx_tests.ts`.

## Chuẩn code

Cùng bộ quy tắc định dạng với starci-academy-backend: thụt 4 dấu cách, nháy kép, không chấm phẩy, mỗi phần tử / thuộc tính / tham số một dòng, cấm `any`.

```bash
npm run lint        # tự sửa
npm run lint:check  # chỉ kiểm tra (0 cảnh báo)
npm run typecheck
```

Husky chạy `lint-staged` (ESLint `--fix` trên file `.ts/.tsx` được stage) trước mỗi commit.

## Thêm tướng mới (adapter)

1. Tạo `packages/shared/src/heroes/<id>.ts` gọi `defineHero({...})`. Interface `HeroAdapter` nằm trong `shared/src/types.ts`:
   - chỉ số theo cấp (`atk`, `hp`, `armor`, `cost`, `role`)
   - `strength` (điểm mạnh), cộng thêm `counter` (khắc chế ai) **hoặc** `concept` (lối chơi mới)
   - `skills`: mỗi chiêu có `def`, `targets?()` và `resolve()`; `resolve()` trả về danh sách `Effect`
   - các hook tuỳ chọn: `attack()` (ghi đè đòn đánh thường), `extraTargets()`, `onKill()`, `onDeath()`, `passive`
2. Thêm `import` vào `heroes/index.ts` và id vào `DECK` trong `cards.ts`.
3. Tuỳ chọn: thêm hiệu ứng chiêu vào `client/src/skillFx.ts`. Tranh nằm ở `client/public/heroes/<id>.jpg`, icon chiêu ở `client/public/icons/<skillId>.png`.

Server, client và bot không cần sửa gì: chúng chỉ gọi qua interface.

Các `Effect` có sẵn: `damage`, `shield`, `heal`, `mark`, `status` (choáng / đóng băng / buốt), `pull`, `refresh`.

## Tranh và icon LMHT

```bash
python scripts/fetch_lol.py .dl packages/client/public
```

Lệnh này tải tranh dọc, icon nội tại và icon Q/W/E/R từ Riot Data Dragon vào `client/public/heroes` và `client/public/icons`. Thêm tướng mới thì thêm tên vào `CHAMPS` trong script.
Ảnh nền bàn đấu và khung lá bài là tuỳ chọn: thả `client/public/ui/board.png` (1280×800) hoặc `ui/frame-hero.png` (130×190, ô tranh trong suốt) là game tự dùng. Chưa có thì game tự vẽ bản đồ rừng.

## Tài liệu
- [docs/HEROES.md](docs/HEROES.md): 10 tướng, điểm mạnh và khắc chế

