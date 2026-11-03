# Quy ước chung cho các agent code client Cocos (đợt 2026-11-04)

Repo: `D:/Repositories/starci-league`. Client Cocos Creator 3.8.8 ở `cocos/`, mã ở `cocos/assets/scripts/`.
Lead (Claude) giao mỗi agent **một hoặc hai file riêng**; agent **chỉ được tạo / sửa đúng file của mình**. Lead tự nối
các file vào màn trận.

## Đọc trước

- `cocos/README.md`; `cocos/assets/scripts/ui/kit.ts` (box, text, Frame, Button, TextField, Notice, rule, drawGem, panel,
  clear, setOpacity), `ui/slot.ts` (ô vuông ảnh tướng / đồ / chiêu), `ui/matchCard.ts` (lá bài trong trận),
  `ui/assets.ts` (font, image), `dna/theme.ts` (màu C, GROUP_FRAME, at() đổi toạ độ mockup), `net/game.ts` (trạng thái
  phòng, CardView, gameActions, heroName, cardText, manaCostOf, targetsOf), `screens/match/MatchScreen.ts` và
  `screens/match/dialogs.ts` (chỉ đọc, để theo cùng kiểu).
- Mockup đã duyệt: `docs/mockups/match/*.png`, `docs/mockups/cocos/card-anatomy.png`. DNA: `docs/UI_DNA.md`.
- Hành vi gốc ở bản web (React): `packages/client/src/card/` (store.ts, Screens.tsx, Board.tsx, ChainPanel.tsx, hand/,
  board/, ui/). Giao thức: `docs/CARDGAME_PROTOCOL.md`. Luật và dữ liệu: `cocos/assets/scripts/shared` (import
  `{ cg } from "<đường tương đối>/shared"`), là bản chép của `packages/shared/src`, **không sửa**.

## Bẫy của Cocos 3.8 (đã gặp, phải tránh)

- Gắn `Label` làm node tự co về cỡ chữ mặc định: luôn dùng `text()` trong kit (nó đặt lại cỡ khung), không tự addComponent(Label).
- Một node chỉ giữ **một** renderer (Graphics / Label / Sprite): mỗi lớp vẽ là một node con riêng (`box()`).
- Trong một Graphics, `fill()` sau `stroke()` có thể nuốt nét: nét mảnh vẽ bằng `rect` + `fill`, ngọc vẽ trên node riêng.
- EditBox phải dựng khi node còn tách cây (xem `TextField`).
- Toạ độ: sân khấu 1920×1080, gốc ở giữa; `at(x, y)` đổi toạ độ mockup (gốc trên-trái) sang sân khấu.
- Font: `text(..., { font: "title" | "titleMedium" | "text" | "textMedium" | "number" })`.
- Ô tướng / đồ / chiêu luôn là ô vuông `slot()` (ảnh do thầy tự thêm). Không vẽ hay nhúng tranh của game có thật nào.

## Kiểu code

4 dấu cách, nháy kép, không chấm phẩy, mỗi tham số một dòng như code xung quanh, không `any`. Đầu file có 1–3 dòng chú
thích tiếng Việt nói file làm gì và bóc từ mockup nào.

## Kiểm

```bash
cd D:/Repositories/starci-league/cocos && npx -p typescript@5.8.3 tsc -p tsconfig.json --noEmit --skipLibCheck 2>&1 | grep -v ProgramData
```

Không được còn lỗi trong file của mình. **Không** mở / tắt Cocos Creator, **không** commit, **không** sửa file khác.

## Báo cáo cho lead (ngắn)

1. File đã tạo. 2. Hàm / lớp export (chữ ký đầy đủ). 3. Cách nối vào `MatchScreen.ts` (gọi ở đâu, truyền gì).
4. Điều chưa kiểm được.
