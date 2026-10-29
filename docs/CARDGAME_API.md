# CARDGAME API: lõi luật chế độ thẻ bài thuần

Code: `packages/shared/src/cardgame/**`, export dưới namespace `cg` (`import { cg } from "@starci/shared"`).
Luật gốc: `docs/LUAT_THE_BAI.md` (CHỐT MỚI), tướng: `docs/TUONG_THE_BAI.md`. Mô phỏng: `npx tsx scripts/card_selfplay.ts [số trận] [cỡ đội] [seed] [--heroes=a,b] [--verbose]`.
Engine thuần: không Colyseus, state là JSON (clone bằng `structuredClone`), RNG có seed (mulberry32 lưu trong `state.rng`) nên tái lập được.

## 1. Hàm chính

```ts
cg.newGame(seed, teamA: string[], teamB: string[]): GameState          // newGameEx trả thêm events của lượt đầu
cg.legalActions(state, side): Action[]                                  // rỗng nếu chưa tới side
cg.applyAction(state, action): { state, events }                        // không sửa state cũ; hành động sai thì throw
cg.whoseMove(state): Side        // bên phải quyết định (lượt hiện tại, hoặc bên có quyền nối chuỗi khi phase="chain")
cg.chooseAction(state, side): Action   // bot tham lam
cg.cardInfo(new cg.Game(state), card, unit?) // {name, desc đã tính công thức, type} cho UI
cg.formulaText(desc, game, unit)         // "222 (100 + 50% AD)"; cg.formulaParts cho UI tự vẽ
cg.getHero(id) / allHeroes() / implementedHeroes()
```

## 2. State (`GameState`)
- `round` (1..), `turnNo` (tăng mỗi lượt của mỗi bên), `active: "A"|"B"` (A đi trước), `phase: "main"|"chain"|"over"`, `winner`, `endReason: "lives"|"deck"`.
- `players[side]`: `heroes` (5 tướng đội), `deck` (**deck[0] là lá trên cùng**), `hand` (tối đa 10, thừa vào mộ), `grave`, `lives` (mạng còn, từ 7).
- `units[`${side}:${hero}`]`: `status` (`reserve` chưa gọi · `board` · `dead` chờ hồi sinh sau 3 vòng), `lane` (0..4 = đường 1..5, -1 nếu không trên sân), `homeLane`, `hp/maxHp/shield`, `items` (id đồ huyền thoại, tối đa 3), `statuses` (`{id: {until, v}}`), `stacks` (bộ đếm tự do, giữ qua chết), `nextAttack` (buff đòn đánh kế tiếp), `deaths`.
- `lanes[side][0..4]`: id tướng hoặc null. Hai tướng cùng chỉ số đường đứng đối diện. Mở đường: `RULES.laneOpenRound = [8,4,1,4,8]` (vòng 1: đường 3; vòng 4: +2,4; vòng 8: +1,5).
- `chain`: Chuỗi đang mở (xem mục 5). `extra`: id token ở Ô triệu hồi phụ mỗi bên. `prizes`: số lá thưởng còn úp mỗi bên (công khai); `prizeCards`: các lá thưởng (bí mật, server không gửi).
- Lá chết: lá chiêu của tướng không trên sân (`Game.isDeadCard`), không đánh được nhưng vẫn chiếm tay/bộ.

### Lá (`Card`)
`kind`: `skill` (lá chiêu, id `darius_q`) · `wild` (thẻ chiêu chung `wild_q|e|r`) · `support` (id `basic|gold|item|potion|draw|buff`, lá Đồ có `item`) · `special` (Nấm, Bóng...). Lá Bóng: `kind:"special"`, `copyOf:"zed_q"`, `hero`, `temp:true`.

### Luật nhịp lượt (đã tự chốt, xem mục 8)
Đầu lượt: hồi sinh tướng đủ 3 vòng → hook `onTurnStart` → **rút 2 (+1 mỗi Trợ thủ sống)** (bộ hết thì thua ngay) → rồi mới gọi tướng/đánh lá tuỳ ý → `end`. Lúc `end`: đấu sĩ (hoặc `HeroDef.autoAttack`) tự đánh → `onTurnEnd` → lá `temp` trên tay biến mất → trạng thái hết hạn.
Tay đầu: 5 lá từ bộ gốc (10 Đánh thường, 6 Vàng, 6 Đồ) + 3 thẻ chiêu chung `wild_q/e/r` = 8 lá. Đánh thẻ chiêu chung: `args.actor` = tướng mình trên sân, tung đúng chiêu Q/E/R của tướng đó (cùng hiệu ứng/điều kiện; ctx.card là lá wild, đi vào mộ như lá chiêu, Soraka R xáo lại như lá thường). Tướng gọi ra: xáo 34 lá của nó vào bộ (6Q 6E 2R + 6 Đánh thường, 4 Vàng, 4 Đồ, 2 Bình Máu, 2 Rút Bài, 2 Bổ Trợ). **Lá Đồ: mảnh ngẫu nhiên (theo seed) trong 8 mảnh** `COMPONENTS` (kiem_dai, gay_qua_kho, cung_go, gang_tay, giap_luoi, ao_choang, dai_khong_lo, nuoc_mat), chọn lúc tạo lá. Bảng ghép 8×8 = 36 món qua `combine(a,b)`; Pha Lê Lam/Cuốc Chim không bao giờ xuất hiện.

## 3. Action
```ts
{ t:"summon", side, hero, lane }                       // gọi tướng (HeroDef.summonLanes ghi đè, mặc định ô trống đang mở)
{ t:"play", side, uid, args? }                         // đánh 1 lá trên tay
{ t:"attack", side, actor, target }                    // đòn đánh MIỄN PHÍ nhờ buff (Nami E...) — chỉ khi nextAttack có free
{ t:"craft", side, items:[uidĐồ, uidĐồ], gold:uidVàng, unit }   // 2 Đồ + 1 Vàng -> món đồ, cộng chỉ số vào tướng
{ t:"chain", side, uid, args? } | { t:"pass", side }   // khi đang có Chuỗi: nối lá Quick hoặc bỏ qua
{ t:"end", side }
```
`PlayArgs`: `actor` (Đánh thường: tướng ra đòn; wild: tướng tung chiêu), `target`, `targets[]`, `lane`, `color`, `discard[]` (uid lá bỏ), `pick`.
`legalActions` liệt kê sẵn mọi tổ hợp hợp lệ (gộp lá trùng loại thành 1 lá đại diện). Vai và đánh thường: đấu sĩ không dùng lá Đánh thường (tự đánh cuối lượt); đỡ đòn/pháp sư/trợ thủ → tướng đối diện; sát thủ → cùng đường (350% AD); xạ thủ → bất kỳ (200% AD) nhưng lá Đánh thường phải đánh đỡ đòn nếu có trên sân (khiêu khích).

### Kiểu mục tiêu chiêu (`SkillDef.target`, kiểu Yu-Gi-Oh, không theo đường)
`opposite` (đấu sĩ cận chiến: tướng đối diện, không cần chọn, `ctx.target` = `g.opposite(self)`; không có tướng đối diện thì không đánh được) · `enemy` (1 địch, `args.target`) · `enemies_upto` + `max` (1..N địch, `args.targets`) · `all_enemies` · `ally` · `ally_other` · `allies_upto` · `all_allies` · `self` · `none` · `lane` (chọn đường mở, cho dời chỗ). Có thể là mảng để ghép (vd `["ally","lane"]`). Với `*_upto/enemy/ally`: `ctx.target` / `ctx.targets` là Unit còn sống; `all_*`/`self` thì tự lấy `g.enemies(self)` / `g.allies(self)`. `extra: "color"|"discard"` thêm lựa chọn màu / lá bỏ (chọn trước khi đánh). Cần liệt kê tuỳ ý (Soraka E): viết `options(c)` trả `PlayArgs[]`.
Đường chỉ dùng cho đánh thường và hiệu ứng kéo/đổi chỗ: `g.moveTo(unit, lane)` (đổi chỗ với đồng đội đang ở đó).

## 4. Event (`GameEvent`, trường `t`)
`roundStart turnStart turnEnd summon respawn play cast attack damage{src,target,amount,hpLost,absorbed,kind,tag,crit,hp} heal shield status statusEnd stack move kill lives draw drawAuto discard burn create steal returnToHand shuffle craft chainAdd chainWindow chainResolve chainEnd summonToken tokenEnd prize pass log end`. Client chơi hiệu ứng theo thứ tự mảng `events`. Định nghĩa đầy đủ trong `types.ts`.

## 5. Phản ứng
**Chuỗi kiểu Yu-Gi-Oh.** Mỗi lá đánh ra (hoặc đòn miễn phí) là mắt xích 1. Nếu có bên nào nối được lá Quick (`SkillDef.quick`, điều kiện `quickWhen(trigger)` của mắt xích trên cùng), engine dừng: `state.phase="chain"`, `state.chain={links, priority, passes}`, sự kiện `chainAdd` (mắt xích 1) + `chainWindow`. Bên đang có quyền (`chain.priority`, đối thủ được trước) gửi `chain` (thêm 1 mắt xích, quyền sang bên kia) hoặc `pass`. Hai lần bỏ qua liên tiếp thì giải quyết từ mắt xích CUỐI về ĐẦU (`chainResolve` từng mắt xích, rồi `chainEnd`). Bên không có lá Quick nào thì engine tự bỏ qua giúp. Không ai nối được thì lá giải quyết ngay, không phát sự kiện chuỗi. Tối đa `RULES.maxChain` mắt xích. Đòn tự đánh cuối lượt không mở chuỗi. Lá Quick thường đánh được chủ động trong lượt mình như lá chiêu; `chainOnly: true` thì chỉ dùng để nối chuỗi (khi giải quyết `ctx.target` = tướng mà mắt xích bên dưới nhắm). Thẻ chiêu chung mượn được chiêu Quick thường để nối chuỗi, không mượn chiêu `chainOnly`.
**Trigger** (`chain.links[i].trigger`, truyền vào `quickWhen`; `trigger.side` = bên đánh mắt xích đó): `single` (chiêu/đòn nhắm đúng 1 tướng bên phản ứng), `multi` (chiêu `enemies_upto`/`all_enemies`), `ult` (là chiêu R), `redirectable` (id tướng bên phản ứng có thể thay làm mục tiêu mới, đã tính khiêu khích và luật vai của đòn đánh).
**Hiệu ứng tạm của lá Quick** (`ReactFx`; lá Quick ghi bằng `c.g.chainFx()`, áp lên mắt xích NGAY DƯỚI nó trong lúc mắt xích đó giải quyết, đọc qua `state.fx`, rồi xoá): `redirect` (đổi mục tiêu lá gốc/đòn gốc sang tướng đó, kể cả chiêu `opposite`), `cut`+`cutSide` (phe đó nhận ít hơn x% sát thương từ địch), `cutNoCc` (phe `cutSide` miễn stun/silence/chill/shred/blind), `reflectUnit`+`reflectPct` (tướng đó phản lại x% sát thương skill/attack nhận từ kẻ tấn công, dạng chuẩn). Mẫu: `heroes/braum.ts`. Mẫu lá chỉ-nối-chuỗi: Braum Q/E. Khiêu khích kiểu Braum R: `g.status(braum, "taunt", ...)` — mọi chiêu `enemy`/`enemies_upto` và đòn đánh của bên địch bị lọc phải nhắm tướng có `taunt`.

## 6. Viết một tướng (`heroes/<id>.ts`, đăng ký ở `heroes/index.ts`)
Mẫu: `darius.ts` (hook, dấu, kéo, lá về tay), `nami.ts` (rút bài, buff, discard). Khung chưa viết: `stubHero({...})` (cờ `todo`, bot bỏ qua); thay bằng `defineHero`.
```ts
defineHero({ id, name, role, damage:"physical"|"magic", hp, atk, armor, mr,
  passive:{name,desc}, hooks:{...}, summonLanes?, autoAttack?,
  skills:{ Q:{key,name,desc,target,max?,extra?,canPlay?,options?,quick?,quickWhen?,chainOnly?,resolve(c)}, E:{...}, R:{...} } })
```
- **Mô tả** viết Việt có `{công thức}`; dùng cùng hằng với code: `const F = "40 + 60% AD + 30% AP"; desc: \`{${F}}...\`; ... c.f(F)`. Số hạng: số, `n% AD|AP|máu tối đa|máu cộng thêm|Giáp|Kháng phép`.
- **Ctx** (`resolve(c)`): `c.g` (Game), `c.self`, `c.side`, `c.card`, `c.args`, `c.target`, `c.targets`, `c.lane`, `c.f(expr)`, `c.toHand()` (lá về tay), `c.vanish()`.
- **Game (`c.g`)**: tra cứu `unit board enemies(u) allies(u) opposite(u) lowestHp isOpen openLanes emptyLanes`; chỉ số `atk ap armor mr stats f`; sát thương `damage(src,tgt,raw,"physical"|"magic"|"true",{tag:"skill"|"attack"|"dot"|"effect"})` (raw trước giáp; tự áp dmgAmp, pháp sư +25% chiêu, Buốt +25%, Bổ Trợ +20%), `heal shield attack(a,t,{free,mult,bonusRaw})`; trạng thái `status(u,id,turns,{v,add,max,of}) has statusV removeStatus` (turns = lượt của CHỦ tướng, `of` đổi phe đếm; dùng id `stun silence chill shred taunt empower blind`: engine hiểu sẵn), `stack/setStack/stackOf` (bộ đếm vĩnh viễn), `u.nextAttack.push({id,source,free,bonusRaw,bonusKind,mult})`; vị trí `moveTo`; bài `draw(side,n,{reason,by})`, `discard(side,uid)`, `burn(side,n)` (đốt bộ vào mộ), `shuffleIn(side,cards)`, `shuffleGraveIntoDeck(side)`, `tutor(side,pred)` (lục bộ), `stealRandom(from,pred)` + `giveCard(side,card,zone)`, `stealCard(to,from)` (cướp 1 lá ngẫu nhiên; lá chiêu/Bóng của địch thành thẻ chiêu chung wild cùng chữ; phát hook onSteal; trả về lá gốc), stack `bonusRes` của tướng cộng thẳng vào giáp và kháng (Blitzcrank), `createCard(side,{kind,id,...},zone)`, `lastGrave(side,pred)`, `supportCard(id) skillCard(hero,side,key) cardType(card)`; RNG `rand randInt pick shuffle`.
- **Hook** (`hooks:{ onX(g, me, data) }`, gọi cho MỌI tướng trên sân, tự lọc theo `data`): `onSummon onRespawn onTurnStart{side} onTurnEnd onRoundStart onDraw{side,card,reason,by} onDiscard onBurn onPlay onCast onAttack{info: sửa raw/mult/miss} onAttackHit onCrit{info.buffs} onDamage{src,target,amount,hpLost,kind,tag} onShieldBreak onKill onDeath onCraft onLifeLost onSteal{side,from,card}`. `onDeath` còn gọi cho chính tướng vừa chết.
- **Lá đặc biệt**: `cg.defineSpecialCard({id,name,desc,onDraw})` — `onDraw` tự bật khi bị rút (Nấm: lá chiếm lượt rút rồi biến mất). Lá Bóng: `g.createCard(side,{kind:"special",id:"shadow",hero,side,copyOf:"zed_q",temp:true})`; engine tung đúng chiêu `copyOf`, dùng xong biến mất.
- Trạng thái/đòn kế tiếp có thể đọc trong hook; `onAttack` + `info.miss=true` làm trượt (engine cũng tự xử lý status `blind` có `v` = số đòn trượt).

## 7. Bot và selfplay
`cg.chooseAction` thử từng hành động trên bản sao, chấm điểm theo events: hạ gục (400) > sát thương > hồi máu/khiên > rút bài/đốt bài; ưu tiên gọi tướng (đường giữa trước, đỡ đòn/đấu sĩ trước) và ghép đồ; điểm ≤ 0.5 thì kết thúc lượt/bỏ phản ứng. `scripts/card_selfplay.ts` chạy headless, in lý do kết thúc, số vòng, tỉ lệ thắng theo tướng.

## 8. Chỗ luật chưa rõ, đã tự quyết
- Đồ: chỉ cộng **chỉ số gốc** (AD, AP, máu, giáp, kháng, chí mạng, % AD, tốc đánh→+% sát thương đòn đánh, sát lực, xuyên phép, hút máu, +% sát thương); bỏ nội tại/điều kiện riêng của món. Nước Mắt (hồi mana) đổi thành AP (1 điểm = 1,2 AP) vì không có mana.
- Chí mạng chỉ áp cho đòn đánh (ra ×1,5 + critDmg). Pháp sư: sát thương chiêu +25% (không áp heal/khiên). Đòn đánh theo vai nhân AD: đấu sĩ/đỡ đòn/pháp sư/trợ thủ ×1, sát thủ ×3,5, xạ thủ ×2.
- Trạng thái: "N lượt" tính theo lượt của chủ tướng (hết hạn ở cuối lượt thứ N của chủ kể từ lúc gắn); Choáng chặn mọi lá chiêu, Đánh thường và tự đánh; Câm Lặng chỉ chặn lá chiêu.
- Gọi tướng miễn phí, không giới hạn số lần mỗi lượt; chết thì rời đường (nhớ đường cũ), hồi sinh đầu lượt của chủ khi `round >= vòng chết + 3`, đường cũ bị chiếm thì ra đường trống khác, đầy thì chờ; hồi sinh đầy máu, mất trạng thái/khiên nhưng giữ đồ và stacks.
- Bộ hết: chỉ thua khi rút đầu lượt; hiệu ứng rút thừa khi bộ hết chỉ dừng. Hiệu ứng rút khi tay đầy: lá thừa vào mộ. Lá đặc biệt/lá tạm rời bộ hay tay thì biến mất (không vào mộ). Thẻ hỗ trợ đã dùng biến mất; bị bỏ (Soraka, tràn tay) thì vào mộ.
- Bên đi trước (A) rút 2 như bình thường, không bù. Giới hạn 120 hành động/lượt để chống lặp vô hạn.
- Dấu Xuất Huyết của Darius: giữ 2 lượt của mục tiêu kể từ lần cộng cuối (doc không nêu thời hạn); sát thương nổ là chuẩn. Nami Q: lá bỏ chọn trước khi đánh (`extra:"discard"`), chỉ dùng nếu 2 lá rút khác loại.

## 9. Tướng đợt 2 (Nami, Twisted Fate, Soraka, Teemo, Kog'Maw): cơ chế engine/quy ước
- Event `{t:"reveal", side, to, cards}`: tay của `side` được lộ cho `to` (TF R). Server gửi `hand` của `side` cho `to` ở state kế tiếp (một lần). Đồng thời TF có status `see_hand` tới hết lượt (client có thể dùng để hiện nút/biểu tượng).
- Quy ước rút bài: `g.draw(side, n, {reason:"skill", by: heroId})` cho mọi rút nhờ lá chiêu (Nami nội tại bắt `reason==="skill"` của cả đội). TF nội tại dùng reason `"passive"`, tutor dùng `"tutor"`.
- `PlayArgs.pick`: TF E = uid lá trong bộ cần lục; TF R = uid lá phản ứng của địch muốn bỏ. `options(c)` liệt kê sẵn các lựa chọn.
- Status mới: `see_hand`, `kog_arty` (Kog E, bật `autoAttack`), `mushroom_season` (Teemo R). Event `status` id `nami_bless` báo tướng được Phước Lành.
- Lá đặc biệt `mushroom` (Nấm, `card.hero:"teemo"`, `card.side` = phe Teemo): `onDraw` nổ, đốt 2 lá (3 nếu Teemo có `mushroom_season`). Lá `special` không vào mộ.
- Kog Stack = `unit.stacks.kog`; TF nhớ màu Q trước ở `unit.stacks.tfColor` (1 xanh, 2 đỏ, 3 vàng).
- Soraka E: `options` chỉ gợi ý các tiền tố của thứ tự bỏ (lá chết, Vàng/Đồ, Đánh thường, Q/E, R) để tránh bùng nổ tổ hợp; UI có thể tự gửi `discard` tuỳ ý (engine chấp nhận chỉ khi khớp options, nên UI chọn trong gợi ý).
