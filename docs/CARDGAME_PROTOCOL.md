# CARDGAME PROTOCOL: client <-> server phòng "card"

Code server: `packages/server/src/CardRoom.ts` (đăng ký ở `index.ts`, tên phòng `"card"`). Engine là nguồn sự thật: `docs/CARDGAME_API.md`. Kiểu `Action`, `GameEvent`, `Card`, `Unit`... lấy từ `cg` trong `@starci/shared`.

## 1. Tạo / vào phòng
```ts
client.create("card", { name, token?, bot?: "easy"|"hard", private?: boolean, fast?: boolean, sim?: boolean, team?: string[], seed?: number })
client.joinById(roomId, { name, token?, team? })     // phòng thường: tối đa 2 người
client.joinOrCreate("card", { name })                // ghép ngẫu nhiên
```
- `bot`: đấu máy (người = phe A đi trước, máy = phe B; phòng tự private). `easy` đôi khi đánh bậy/bỏ phản ứng.
- `sim: true`: 2 bot Khó đánh nhau, khách chỉ xem (nhận state đầy đủ, `you: null`). `fast: true` bỏ nhịp chờ (test); không có `fast` thì bot mỗi hành động cách 1 giây.
- `team`: 5 tướng chọn sẵn (bỏ qua màn chọn nếu hợp lệ). `seed`: cố định xáo bài (test).
- Auth như phòng duel (`token` Supabase hoặc khách).
- Người vào trước là phe **A** (đi trước), người sau là **B**. `room.sessionId` ↔ phe: dùng `you` trong `cg:state`.

## 2. Schema (`room.state`, đồng bộ tự động, chỉ để lobby/HUD)
`phase` ("waiting"|"draft"|"playing"|"ended") · `nameA` `nameB` · `round` `turnNo` · `active` (bên đang trong lượt) · `toMove` (bên phải quyết định lúc này) · `reaction` (bên đang có quyền nối chuỗi, hoặc "") · `livesA` `livesB` · `pickedA` `pickedB` · `winner` ("A"|"B"|"") · `endReason` · `sim`.
Mọi thứ còn lại qua message JSON bên dưới. **Đăng ký handler `onMessage` ngay sau khi join**, rồi gửi `cg:sync` nếu cần lấy lại trạng thái.

## 3. Message server -> client
| Tên | Payload | Khi nào |
|---|---|---|
| `cg:waiting` | `{}` | phòng chờ đối thủ |
| `cg:draft` | `{ pool: {id,name,role,hp,atk,armor,mr,damage}[], size: 5, deadlineMs, picked? }` | bắt đầu chọn tướng (`size` = min(5, số tướng đã viết xong)); `deadlineMs` 90000 (0 = không giới hạn); hết giờ server tự chọn ngẫu nhiên cho bên chưa chọn |
| `cg:picked` | `{ side }` | một bên đã chọn xong (không lộ đội) |
| `cg:events` | `GameEvent[]` | sau mỗi hành động, **gửi trước `cg:state`**; chơi hiệu ứng/log theo thứ tự mảng |
| `cg:state` | xem 3.1 | sau mỗi hành động, và khi `cg:sync` |
| `cg:legal` | `Action[]` | chỉ gửi cho bên đang phải đi (`toMove`), ngay sau `cg:state`. Dùng để bật/tắt nút, liệt kê mục tiêu hợp lệ |
| `cg:error` | `{ code: "bad_team"\|"illegal", msg }` | hành động/đội bị từ chối (server kèm gửi lại `cg:state`) |
| `cg:end` | `{ winner: "A"\|"B"\|null, reason }` | hết trận. `reason`: `lives` (hết mạng) · `deck` (bộ bài hết khi rút) · `left` (đối thủ thoát) · `resign` · `timeout` · `error` |
| `cg:simStats` | thống kê | chỉ phòng sim, cho `scripts/card_sim.ts` |

### 3.1 `cg:state` (đã ẩn thông tin bí mật cho người nhận)
```ts
{
  you: "A"|"B"|null,            // phe của bạn (null = khách xem phòng sim, thấy tất cả)
  round, turnNo, active, phase: "main"|"chain"|"over", toMove, actionsThisTurn,
  openLanes: number[],           // các đường (0..4) đang mở
  players: { A: PlayerView, B: PlayerView },
  units: Record<string, Unit>,   // công khai hoàn toàn
  lanes: { A: (string|null)[5], B: (string|null)[5] },
  chain: Chain | null,           // Chuỗi đang mở: { links, priority, passes } (mọi mắt xích công khai)
  extra: { A, B },               // id token ở Ô triệu hồi phụ (hoặc null)
  prizes: { A, B },              // số lá thưởng còn úp (lá thưởng không gửi)
  winner, endReason, stats,
  names: {A,B}, bots: {A?,B?}, rules: { lives, handMax, laneOpenRound }
}
PlayerView = {
  side, heroes: string[], lives, grave: Card[],      // mộ công khai, thứ tự cũ -> mới
  handCount: number, deckCount: number,               // luôn có
  hand?: Card[],                                      // CHỈ có cho bản thân (hoặc bên bị lộ tay, xem dưới)
  deck?: Card[]                                       // CHỈ khách xem phòng sim; người chơi không bao giờ nhận
}
```
- Tay đối thủ: chỉ `handCount`. Thứ tự bộ bài: không bao giờ lộ.
- Hiệu ứng cho xem tay (TF R...): khi engine phát event `{t:"reveal", side, to?}` thì `cg:state` kế tiếp gửi cho người xem có kèm `hand` của `side` đó (một lần). Hiện engine chưa có event này, server đã sẵn sàng.
- Trong `cg:events`: `draw`/`drawAuto`/`create` vào tay/bộ của **đối thủ** có `card` dạng `{ uid, hidden: true }` (UI vẽ lưng bài). Các sự kiện khác (play, discard, burn, steal...) công khai. Khách xem phòng sim thấy hết.
- Mô tả lá / công thức: client tự gọi `cg.cardInfo(new cg.Game(state), card, unit)` trên state nhận được (tay đối thủ không có thì không cần).

## 4. Message client -> server
| Tên | Payload | Ghi chú |
|---|---|---|
| `cg:sync` | `{}` | xin gửi lại `cg:draft`/`cg:state`/`cg:legal` (sau khi mới vào, hoặc nghi lệch) |
| `cg:pick` | `{ heroes: string[] }` | trong `draft`: đúng `size` tướng trong `pool`, không trùng. Mỗi bên chọn một lần, chọn kín. Hai bên có thể trùng tướng |
| `cg:action` | `{ action: Action }` | hành động engine (`summon/play/attack/craft/chain/pass/end`); server ép `side` đúng phe của bạn |
| `cg:resign` | `{}` | đầu hàng |

### Quy tắc `cg:action`
- Chỉ nhận khi `toMove === bạn`. Khi có Chuỗi (`phase:"chain"`) chỉ bên `chain.priority` được gửi `chain` hoặc `pass`; bên kia phải chờ. Sự kiện `prize` (lật lá thưởng) chỉ lộ lá với chủ.
- Hành động phải nằm trong `cg:legal` (so sánh theo nội dung; lá trùng loại thì uid nào của cùng loại cũng được, kể cả lá `discard` và `pick`). Sai thì nhận `cg:error {code:"illegal"}`.
- Nên dựng hành động bằng cách chọn trong danh sách `cg:legal` (nhóm theo `t` và lá `uid` để UI hiện nút/mục tiêu).
- Hết lượt: gửi `{ t:"end", side }`. Bot/đối thủ đi xong sẽ có `cg:state` mới với `toMove` về bạn.

## 5. Luồng điển hình
1. `create("card", {bot:"hard", name})` -> nhận `cg:draft` -> UI chọn 5 -> `cg:pick`.
2. Đủ hai bên chọn -> `cg:events` (roundStart, turnStart, draw...) -> `cg:state` (+ `cg:legal` nếu tới lượt bạn).
3. Người chơi: `cg:action` -> `cg:events` + `cg:state` (+ `cg:legal`) cho cả hai bên; bot tự đi sau nhịp 1s (`fast` thì ngay).
4. `cg:end`; phòng đóng khi mọi người rời.

## 6. Mô phỏng
`npx tsx scripts/card_sim.ts [số trận=40] [song song=4] [file.json]` (cần server đang chạy): tỉ lệ thắng theo tướng, lý do thắng, số vòng, tỉ lệ bên đi trước thắng. Trận quá 150 vòng hoặc 40000 bước bot -> `timeout`.
