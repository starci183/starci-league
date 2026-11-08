# Cách sửa số cân bằng

Mọi con số của tướng và đồ nằm trong JSON. Sửa JSON là đổi cả hành vi lẫn chữ trên lá, không phải sửa code. Thư mục: `packages/shared/src/cardgame/balance/`.

## Tướng: `balance/heroes/<id>.json`

```json
{
  "id": "garen",
  "stats": { "hp": 450, "atk": 71, "armor": 33, "mr": 31 },
  "params": { "p1": 3, "q0": 20, "q1": 40, "e2": 0.08 },
  "flags": {}
}
```

- `stats`: chỉ số gốc (Máu, AD, Giáp, Kháng phép).
- `params`: số theo tên của `KITS.md`. `p1, p2...` là nội tại, `q1...` `e1...` `r1...` là số trong chiêu, `q0 / e0 / r0` là mana. Số tỉ lệ viết dạng thập phân: `0.08` là 8%, hệ số `q2` của `q2·AD` là `1` thì tính 100% AD.
- `limits`: số lần tung Q, E, R mỗi lượt của một team (Draw tới End), đếm theo tướng dùng và lá; `0` là không giới hạn. Chữ "Mỗi lượt N lần" tự thêm vào cuối lá.
- `flags`: quyết định tạm chờ chốt, bật tắt bằng `true / false` hoặc một số. Đọc thiếu cờ sẽ báo lỗi ngay khi nạp.
- Đọc tên tham số không có trong JSON sẽ báo lỗi, nên thêm tham số mới vào JSON trước khi dùng trong code.

### Cách viết công thức

Công thức là chuỗi các số hạng nối bằng `+`, mỗi số hạng là một trong:

| Viết | Nghĩa |
|---|---|
| `q1` hoặc `12` | số phẳng |
| `q2·AD` | hệ số nhân chỉ số (`q2 = 0.5` là 50% AD) |
| `r3% Máu đã mất` | `r3` là số phần trăm viết thẳng |

Chỉ số dùng được: `AD`, `AP`, `Giáp`, `Kháng`, `Tốc Đánh`, `máu tối đa`, `máu đã mất`, và bản của mục tiêu (`máu tối đa mục tiêu`, `máu đã mất mục tiêu`, `Giáp mục tiêu`). Ví dụ `q1 + q2·AP`. Cùng một công thức sinh ra chữ VI (`k.x`) và EN (`k.xe`) nên chữ trên lá luôn khớp số.

## Đồ: `balance/items.json`

```json
"sung_hextech": { "stats": { "atk": 35, "ap": 40 }, "params": { "c": 15 } }
```

- `stats`: chỉ số món cho người đeo: `atk, ap, hp, armor, mr, attackSpeed, crit`. Chí mạng là chỉ số (`0.5` là 50%), món chí mạng nào cũng cho `0.5`. Bùa Xanh có `manaRegen` (mana đội hồi thêm mỗi lượt).
- `params`: tham số nội tại, đặt tên đúng chữ cái của `ITEMS.md` (`b, c, d`; chữ `a` là chỉ số nên nằm trong `stats`). Số kiểu phần trăm viết số nguyên: `15` là 15%, `d` của Móc Diệt Thủy Quái là `30` nghĩa là 30% AD.
- Tham số có hai nghĩa đặc biệt: `Quỷ Thư c` là thời hạn theo đơn vị, `Trái Tim Khổng Thần c` là số lần cộng dồn tối đa.
- Tỉ lệ nhận lá miễn phí (đồ mana): tỉ lệ lá Q, E luôn cao hơn tỉ lệ lá R. Lá miễn phí là lá chiêu tạm của người đeo, không tốn mana, tồn tại tới hết lượt đối phương.
- Chữ VI và EN của món dựng từ đúng các giá trị này, test `scripts/card_tests_items.ts` tính số mong đợi từ `cg.itemBalance`, nên sửa JSON không làm vỡ test.

## Sau khi sửa

1. `npx tsc -p packages/server --noEmit` để bắt tên tham số sai.
2. `npx tsx scripts/card_tests_items.ts` (đồ) và `scripts/card_tests_kits_<nhóm>.ts` (tướng).

## Luật trận: `balance/rules.json`

`RULES` trong `types.ts` đọc từ file này, chỉ riêng `laneOpenRound` được tính từ `laneOrder` và `summonRounds`.

| Khoá | Nghĩa |
|---|---|
| `lives`, `prizeCount` | Số mạng để thua; số lá thưởng úp đầu trận |
| `maxChain` | Số mắt xích tối đa của Chuỗi |
| `handMax`, `startHand`, `drawPerTurn` | Trần tay bài, tay đầu, số lá rút mỗi lượt |
| `secondPlayerBonus`, `firstTurnNoAttack`, `secondFirstBasic` | Bù bên đi sau: thêm lá tay đầu; 1 = bên đi trước không đánh lượt đầu; 1 = bên đi sau nhận quà Đánh Thường lượt đầu |
| `respawnRounds`, `itemSlots` | Số vòng chờ hồi sinh; số ô đồ |
| `laneOrder`, `summonRounds`, `fullBoard` | Thứ tự mở đường, các vòng gọi tướng; `true` là xếp đủ 5 tướng ngay vòng 1 |
| `freeBasicEvery`, `freeLootEvery`, `freeLootItemChance` | Quà Đánh Thường; quà đồ hoặc Vàng và xác suất ra đồ |
| `freeItemEvery`, `freeGoldEvery`, `freeSkillEvery`, `freeSkillOffset`, `freeSkillOdds` | Quà cũ, `0` là tắt |
| `skillCopies`, `sharedDeckSize` | Số lá mỗi chiêu của mỗi tướng; số lá bộ gốc |
| `fighterCardlessMult` | Hệ số đòn không cần lá của Đấu sĩ |
| `teamManaMax`, `teamManaStart`, `teamManaRegen`, `itemManaToRegen` | Bể mana đội: trần, đầu trận, hồi mỗi lượt, phần đồ cộng vào hồi |
| `baseAttackSpeed` | Tốc Đánh nền: 100 là 1 đòn mỗi hành động |
| `lethalOrder` | Thứ tự thử các nguồn cứu chết (Renata, biến hình, đồ) |
| `mage` | Cấu hình mana cũ; `defaultCost` là giá khi lá thiếu mana, `restoreCard` là mana lá hồi |
| `supportSummonKeys` | Lá chiêu Trợ thủ lấy lên tay khi ra sân lần đầu |
| `roleAttack` | Hệ số lá Đánh thường theo vai |
| `mageSkillBonus`, `mageTempSkill` | Thưởng chiêu cũ, `0`; Pháp sư nhận lá chiêu tạm đầu lượt |
| `grievous`, `chillBonus`, `shredMult` | Số của Vết Thương Sâu, Lạnh, Xé Giáp |
| `potion`, `buffCard` | Số của lá cũ |
| `itemScale`, `manaRegenToAp`, `critBase` | Hệ số đồ riêng thẻ bài, quy đổi hồi mana ra AP, hệ số chí mạng gốc |
| `maxActionsPerTurn` | Trần hành động mỗi lượt |

## Phép bổ trợ: `balance/spells.json`

Số của Hồi Máu, Thiêu Đốt, Kiệt Sức, Lá Chắn, Trừng Phạt, Dịch Chuyển. Chữ trên lá dựng từ đúng các giá trị này.

## Điểm bot: khoá `bot` trong `balance/heroes/<id>.json`

Giá trị bộ đếm, dấu, buff và token khi bot chấm thế cờ. Tham số `b1, b2...` trong `params` là điểm dùng trong hàm chấm của Jayce và Jinx.
