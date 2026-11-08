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
{ t:"summon", side, hero, lane, mode? }               // gọi tướng (HeroDef.summonLanes ghi đè, mặc định ô trống đang mở); mode = HeroDef.summonModes (Jinx: minigun | rocket)
{ t:"play", side, uid, args? }                         // đánh 1 lá trên tay
{ t:"attack", side, actor, target }                    // đòn đánh MIỄN PHÍ nhờ buff (Nami E...) — chỉ khi nextAttack có free
{ t:"craft", side, items:[uidĐồ, uidĐồ], gold:uidVàng }        // 2 Đồ + 1 Vàng -> 1 lá đồ huyền thoại lên tay ({kind:"support", id:"legend", item:<id món>}); unit cũ bị bỏ qua
{ t:"chain", side, uid, args? } | { t:"pass", side }   // khi đang có Chuỗi: nối lá Quick hoặc bỏ qua
{ t:"ability", side, unit, id, args? }                 // nút hành động của tướng không tốn lá (HeroDef.abilities): Gangplank Úp Lá, Tristana Kích Nổ Bom
{ t:"end", side }
```
`PlayArgs`: `actor` (Đánh thường: tướng ra đòn; wild: tướng tung chiêu), `target`, `targets[]`, `lane`, `color`, `discard[]` (uid lá bỏ), `pick` (uid lá hoặc id lựa chọn tự do), `mode`, `manaSpent`, `amount`. Với `ability`: `args.target` = tướng bị nhắm, `args.pick` = uid lá trên tay.
`legalActions` liệt kê sẵn mọi tổ hợp hợp lệ (gộp lá trùng loại thành 1 lá đại diện). Vai và đánh thường: đấu sĩ không dùng lá Đánh thường (tự đánh cuối lượt); đỡ đòn/pháp sư/trợ thủ → tướng đối diện; sát thủ → cùng đường (350% AD); xạ thủ → bất kỳ (200% AD) nhưng lá Đánh thường phải đánh đỡ đòn nếu có trên sân (khiêu khích).

### Kiểu mục tiêu chiêu (`SkillDef.target`, kiểu Yu-Gi-Oh, không theo đường)
`opposite` (đấu sĩ cận chiến: tướng đối diện, không cần chọn, `ctx.target` = `g.opposite(self)`; không có tướng đối diện thì không đánh được) · `enemy` (1 địch, `args.target`) · `enemies_upto` + `max` (1..N địch, `args.targets`) · `all_enemies` · `ally` · `ally_other` · `allies_upto` · `all_allies` · `self` · `none` · `lane` (chọn đường mở, cho dời chỗ). Có thể là mảng để ghép (vd `["ally","lane"]`). Với `*_upto/enemy/ally`: `ctx.target` / `ctx.targets` là Unit còn sống; `all_*`/`self` thì tự lấy `g.enemies(self)` / `g.allies(self)`. `extra: "color"|"discard"` thêm lựa chọn màu / lá bỏ (chọn trước khi đánh). Cần liệt kê tuỳ ý (Soraka E): viết `options(c)` trả `PlayArgs[]`.
Đường chỉ dùng cho đánh thường và hiệu ứng kéo/đổi chỗ: `g.moveTo(unit, lane)` (đổi chỗ với đồng đội đang ở đó).

## 4. Event (`GameEvent`, trường `t`)
`roundStart turnStart turnEnd summon respawn play cast attack damage{src,target,amount,hpLost,absorbed,kind,tag,crit,hp} heal shield status statusEnd stack move kill lives draw drawAuto discard burn create steal returnToHand shuffle craft chainAdd chainWindow chainResolve chainEnd summonToken tokenEnd prize pass log end`. Client chơi hiệu ứng theo thứ tự mảng `events`. Định nghĩa đầy đủ trong `types.ts`.

## 5. Phản ứng
**Chuỗi phản ứng có điều kiện.** Lá hoặc đòn đánh gốc là mắt xích 1. Chỉ đối thủ của mắt xích ngay trước được nối lá Quick khi đúng điều kiện của lá và mục tiêu/tài nguyên đều hợp lệ. Tối đa `RULES.maxChain = 4`, luân phiên A → B → A → B. Bỏ qua hoặc không có phản ứng hợp lệ thì giải quyết ngay từ cuối về đầu (4 → 3 → 2 → 1). Lá bị huỷ không phát hiệu ứng. `Trigger.kind` phân biệt `attack` / `skill` / `support`, kết hợp `single` / `multi` / `ult` và `quickWhen`. Không tự nối lên hành động của mình. Khi chờ, `phase="chain"`, chỉ `chain.priority` được gửi `chain`/`pass`. `chainAdd`, `chainWindow`, `chainResolve`, `chainEnd` vẫn công bố tiến trình. Lá Quick có thể đánh chủ động trong lượt mình, trừ `chainOnly: true`.
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
- **Game (`c.g`)**: tra cứu `unit board enemies(u) allies(u) opposite(u) lowestHp isOpen openLanes emptyLanes`; chỉ số `atk ap armor mr stats f`; sát thương `damage(src,tgt,raw,"physical"|"magic"|"true",{tag:"skill"|"attack"|"dot"|"effect"})` (raw trước giáp; tự áp dmgAmp, pháp sư +40% chiêu (`RULES.mageSkillBonus`), Buốt +25%, Bổ Trợ +20%), `heal shield attack(a,t,{free,mult,bonusRaw})`; trạng thái `status(u,id,turns,{v,add,max,of}) has statusV removeStatus` (turns = lượt của CHỦ tướng, `of` đổi phe đếm; dùng id `stun silence chill shred taunt empower blind`: engine hiểu sẵn), `stack/setStack/stackOf` (bộ đếm vĩnh viễn), `u.nextAttack.push({id,source,free,bonusRaw,bonusKind,mult})`; vị trí `moveTo`; bài `draw(side,n,{reason,by})`, `discard(side,uid)`, `burn(side,n)` (đốt bộ vào mộ), `shuffleIn(side,cards)`, `shuffleGraveIntoDeck(side)`, `tutor(side,pred)` (lục bộ), `stealRandom(from,pred)` + `giveCard(side,card,zone)`, `stealCard(to,from)` (cướp 1 lá ngẫu nhiên; lá chiêu/Bóng của địch thành 1 lá Đánh thường; phát hook onSteal; trả về lá gốc), stack `bonusRes` của tướng cộng thẳng vào giáp và kháng (Blitzcrank), `createCard(side,{kind,id,...},zone)`, `lastGrave(side,pred)`, `supportCard(id) skillCard(hero,side,key) cardType(card)`; RNG `rand randInt pick shuffle`.
- **Hook** (`hooks:{ onX(g, me, data) }`, gọi cho MỌI tướng trên sân, tự lọc theo `data`): `onSummon onRespawn onTurnStart{side} onTurnEnd onRoundStart onDraw{side,card,reason,by} onDiscard onBurn onPlay onCast onAttack{info: sửa raw/mult/miss} onAttackHit onCrit{info.buffs} onDamage{src,target,amount,hpLost,kind,tag} onShieldBreak onKill onDeath onCraft onLifeLost onSteal{side,from,card}`. `onDeath` còn gọi cho chính tướng vừa chết.
- **Lá đặc biệt**: `cg.defineSpecialCard({id,name,desc,onDraw})` — `onDraw` tự bật khi bị rút (Nấm: lá chiếm lượt rút rồi biến mất). Lá Bóng: `g.createCard(side,{kind:"special",id:"shadow",hero,side,copyOf:"zed_q",temp:true})`; engine tung đúng chiêu `copyOf`, dùng xong biến mất.
- Trạng thái/đòn kế tiếp có thể đọc trong hook; `onAttack` + `info.miss=true` làm trượt (engine cũng tự xử lý status `blind` có `v` = số đòn trượt).

## 7. Bot và selfplay
`cg.chooseAction` thử từng hành động trên bản sao, chấm điểm theo events: hạ gục (400) > sát thương > hồi máu/khiên > rút bài/đốt bài; ưu tiên gọi tướng (đường giữa trước, đỡ đòn/đấu sĩ trước) và ghép đồ; điểm ≤ 0.5 thì kết thúc lượt/bỏ phản ứng. `scripts/card_selfplay.ts` chạy headless, in lý do kết thúc, số vòng, tỉ lệ thắng theo tướng.

## 8. Chỗ luật chưa rõ, đã tự quyết
- Đồ: chỉ cộng **chỉ số gốc** (AD, AP, máu, giáp, kháng, chí mạng, % AD, tốc đánh→+% sát thương đòn đánh, sát lực, xuyên phép, hút máu, +% sát thương); bỏ nội tại/điều kiện riêng của món. Nước Mắt (hồi mana) đổi thành AP (1 điểm = 1,2 AP) vì không có mana.
- Chí mạng chỉ áp cho đòn đánh (ra ×1,5 + critDmg). Pháp sư: sát thương chiêu +40% (không áp heal/khiên). Đòn đánh theo vai nhân AD: đấu sĩ/đỡ đòn/pháp sư/trợ thủ ×1, sát thủ ×3,5, xạ thủ ×2.
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

## 10. Bổ sung engine đợt cân bằng 30 tướng (tương thích ngược)
- **Số lá riêng mỗi tướng:** `HeroDef.skillCopies?: Partial<Record<"Q"|"E"|"R", number>>` (ghi đè `RULES.skillCopies`) và `HeroDef.supportCopies?: Partial<Record<SupportId, number>>` (ghi đè từng khoá của `RULES.heroSupport`). `g.heroCards` đọc hai trường này.
- **Tàng hình:** status `stealth` trên tướng: engine lọc nó khỏi mục tiêu `enemy`, `enemies_upto` và đòn đánh (chiêu `all_enemies` vẫn trúng).
- **Ngắt chuỗi (fizzle):** trong một Chuỗi đã mở, mắt xích có người tung đang bị **Choáng** lúc tới lượt giải quyết thì bị huỷ (lá vẫn vào mộ). Lá Quick gây Choáng kẻ tung mắt xích bên dưới (`c.trigger.actor`) = lá ngắt. Sự kiện: `log` "Chain Link N fizzles...".
- **Không thể nối chuỗi:** `SkillDef.uncounterable: true` → không ai nối lá Quick lên mắt xích đó.
- **Kiệt Tác:** stack `itemAmp` (%) trên tướng: `g.stats(u)` nhân mọi chỉ số từ đồ thêm `itemAmp`%. Đổi stack này thì tự cập nhật `maxHp/hp` theo phần máu cộng thêm (xem `addItemAmp` trong `heroes/ornn.ts`).
- **Hook `onLethal { target, src }`:** gọi khi tướng (không phải token) về 0 máu, TRƯỚC khi bị hạ; đặt `target.hp > 0` để giữ nó sống (Renata Cứu Trợ).
- **Dấu mốc trên đường:** `g.addMarker(side, lane, id)`, `g.removeMarker(side, lane, id): boolean`, `g.markersAt(side, lane): string[]`; state `markers?: Record<Side, string[][]>` (công khai); sự kiện `{t:"marker", side, lane, id, on}`.
- **Token tự đánh:** engine không cho token tự đánh; tướng chủ dùng hook `onTurnEnd` gọi `g.attack(token, target, {free:true})` (mẫu: Yorick, Annie). Token chiếm Ô triệu hồi phụ duy nhất của phe; `g.tokenOf(side)` lấy token hiện tại.
- **Dấu tự cháy đầu lượt:** viết trong hook `onTurnStart` của tướng chủ (mẫu: Darius `bleed`, Brand `burn`); status có `v` = số stack hiện trên tướng.
- **Bản đồ đội hình:** `cg.SYNERGY` (engine, combos, counteredBy), `cg.countersOf(hero)`, `cg.comboPairs()`, `cg.counterPairs()` (`synergy.ts`). Selfplay: `--jobs=N` chạy song song, `--pairs` in tỉ lệ thắng cặp combo/khắc chế.
- **Luật nhắm token (toàn cục):** đòn đánh thường của **mọi vai tướng** nhắm được đơn vị ở ô phụ địch, bất kể lane (`attackTargets`). `targetValues` của chiêu `enemy`/`enemies_upto` bỏ token, trừ khi `SkillDef.targetsTokens: true`. Chiêu `all_enemies` vẫn trúng token (tướng tự lọc nếu muốn). `options()` tự viết thì tướng tự lọc `u.token`.
- **Token úp mặt:** `g.summonToken(side, {..., hidden: true, secret: {real: 1}, card})` → `unit.token.hidden/secret/card`. Server (`CardRoom.viewOf` → `unitsFor`) xoá `secret`/`card` khỏi token úp của đối thủ. `g.flipToken(tok)` lật (phát `{t:"tokenFlip", unit, card?, secret?}`); `g.removeToken` tự lật trước khi gỡ.
- **Token tự hết hạn:** `TokenDef.turns = N` → `unit.token.expires` = turnNo hết hạn (hiện cho UI); cuối mỗi lượt engine gọi `g.expireTokens()` → `tokenEnd` reason `"expired"`. Stack/status trên token (`g.stack(token, ...)`) dùng cho số hiện trên token (vd thuốc súng tăng mỗi lượt).
- Khiêu khích của đỡ đòn không che token: lá Đánh thường của xạ thủ luôn chọn được token ở ô phụ (cùng với đỡ đòn).
- **Số lá chiêu theo tướng:** `HeroDef.skillCopies` được kiểm ở `defineHero`: Q 3..10, E 3..10, R 1..3 (sai thì throw). Dùng trong `g.heroCards` (gọi tướng).
- **Bộ gốc tự xếp:** `cg.newGameEx(seed, teamA, teamB, decks?: Partial<Record<Side, DeckCardId[]>>)`; mỗi bên dùng danh sách 20 lá của mình (`deck.ts`: `DECK_POOL`, `DECK_SIZE`, `DEFAULT_DECK`, `validateDeck`, `parseDeckCard`), sai/thiếu thì `DEFAULT_DECK`. `g.supportCard(id, item?)` nhận mảnh chỉ định (hoặc mã `"item:<mảnh>"`). `RULES.baseDeck` không còn dùng.
- **Phép bổ trợ:** thẻ hỗ trợ id `spell_<phép>` (`heal flash ignite exhaust barrier cleanse smite teleport`), code + số liệu ở `spells.ts` (`SPELL_NUM`, `SPELL_VI`, `spellOptions`, `resolveSpell`, `spellOf`). Status mới: `ignite` (v = máu mất đầu lượt chủ, hồi máu ×0,5), `exhaust` (gây ×0,6 sát thương). EN: `SUPPORT_EN.spell_*`. `RULES.heroSupport` mặc định: basic 9, gold 2, item 4, draw 2, spell_heal 1, spell_barrier 1, spell_cleanse 1.
- **Ghép đồ ra lá:** `craft` không còn `unit` (trường cũ được chấp nhận và bỏ qua). Kết quả: lá `{kind:"support", id:"legend", item:<id món huyền thoại>}` lên tay, sự kiện `{t:"craft", side, item, card}` + hook `onCraft {side, item, gold}` (unit = undefined). Đeo: `{t:"play", uid:<lá legend>, args:{target:<tướng mình còn ô>}}` → `g.equip(u, item)` phát `{t:"equip", side, unit, item}` + hook `onEquip {side, unit, item}`. Hiệu ứng rèn thẳng (Ornn R) gọi `g.equip`. `cardInfo`/`cardInfoL` của lá legend: tên món + chỉ số gốc (`itemStatText`).
- **Nguồn trạng thái:** `StatusInst.src?` (id tướng gắn) và `StatusInst.card?` (`"<tướng>_<q|e|r>"`, `"spell_<phép>"`, `"basic"`, `"<tướng>_p"` cho nội tại...), cũng có trong sự kiện `status`. `g.status` tự điền từ lá đang giải quyết (`g.cur`, engine đặt quanh `resolveCard`); hook/nội tại có thể ghi rõ `g.status(u, id, n, {src, card})`.
- **Trạng thái chung `grievous`** (Vết Thương Sâu): `g.heal` và `g.shield` lên tướng có status này giảm `RULES.grievous` (50%). Thiêu Đốt gắn `ignite` (mất máu đầu lượt) + `grievous`. Hiệu ứng chống hồi máu của tướng nên dùng id này.
- **Gọi tướng trước, rút sau:** `GameState.phase` thêm `"summon"`: đầu mỗi lượt (sau hồi sinh + `onTurnStart` + Thiêu Đốt) engine dừng ở bước gọi tướng; `legalActions` chỉ có `summon` và `{t:"draw", side}` (kết thúc bước, rút bài). Không có tướng/đường để gọi thì tự rút. Lượt đầu của mỗi phe (`GameState.opened[side]` chưa có) bắt buộc gọi ≥1 tướng rồi mới `draw`; lúc đó chỉ rút tay đầu `RULES.startHand` (5), không rút thêm lá đầu lượt. `newGame` trả state ở bước gọi tướng của A, tay trống. Thẻ chiêu chung (`kind:"wild"`) đã bỏ: không còn ở tay đầu, lá thưởng, cướp bài (lá chiêu cướp được thành lá `basic`); nhánh wild trong `playOptions/chainOptions/resolveCard/cardInfo` đã xoá (`WILD_EN` giữ lại, đánh dấu deprecated).

## Luật V2 (30/10/2026): thay đổi API engine

Luật cho người đọc: `docs/LUAT_THE_BAI.md` mục "LUẬT V2". Spec kỹ thuật: `docs/ENGINE_V2_SPEC.md` (gồm mục "Owner decisions" ghi đè phần trên). Test: `scripts/card_tests_v2.ts`.

- **Bộ bài:** `RULES.sharedDeckSize = 40` (`cg.DECK_SIZE`), mỗi tướng `RULES.skillCopies = {Q:4, E:4, R:1}` cố định, vào bộ ngay từ `newGame` (85 lá). `HeroDef.skillCopies/supportCopies`, `RULES.heroSupport`, `RULES.baseDeck` bị bỏ qua/xoá. `g.summon` không còn xáo lá vào bộ.
- **Rút/tay:** `RULES.drawPerTurn = 2`, tay đầu `RULES.startHand = 5` rút ngay trong `newGame` (trước khi gọi tướng); `GameState.firstTurnDone` đánh dấu lượt đầu mỗi phe (không rút). Tay đầy: `g.burnOverflow` phát `cardBurned {reason:"handFull"}` (không còn `discard overflow`; hook `onDiscard` vẫn nhận `reason:"overflow"`). Bộ trống lúc bắt đầu bước rút: `endGame(..., "deck")`.
- **Gọi tướng úp đồng thời:** `GameState.phase = "blind"` đầu mỗi vòng (trước lượt A). `state.blind = {cap, picks, ready}`. `cg.actorsOf(state)` là các phe đang phải hành động (cả hai cùng lúc). Trong `blind`: `{t:"summon"}` là lựa chọn úp, `{t:"ready"}` là chốt; đủ `cap` thì tự chốt; hết lựa chọn thì tự chốt (không chặn bên kia). Khi cả hai chốt: sự kiện `blindLocked` rồi tướng lên sân cùng lúc. Sự kiện `blindStart {round, cap}`. Phase `"summon"` và action `draw` đã bỏ.
- **Đường:** `RULES.laneOrder`, `RULES.laneOpenEvery`; `RULES.laneOpenRound` được suy ra (mỗi lần mở đúng 1 đường).
- **Tướng chết giữ đường:** `kill` không xoá `lanes[side][lane]`; `u.status === "dead"` nhưng ô đường vẫn trỏ tới nó; `emptyLanes` loại đường đó; hồi sinh đúng `homeLane`. Mọi chỗ kiểm "ô có người" phải xét `status === "board"`.
- **Giới hạn đòn:** (ĐÃ BỎ ở bộ chiêu 01/11/2026, xem mục cuối) không còn trần 3 đòn; `g.attackLimit(side)` trả `Infinity` (0 ở lượt đầu của bên đi trước khi `RULES.firstTurnNoAttack`); `g.turnAttacks(side?)` (`{used, cardless[]}`) chỉ còn để đếm và hiển thị. Sự kiện `attackCount {side, used, limit}` có `limit: 0` (= không trần).
- **Đấu sĩ:** lá Đánh thường dùng được (token vai đấu sĩ thì không). Action mới `{t:"attack", side, actor, target, cardless:true}` (Quick, 1 lần/lượt/đấu sĩ, `RULES.fighterCardlessMult = 0.66`, mở/nối chuỗi như lá Quick). `g.canCardless(u)`, `g.allowCardless(u)` (cho đánh thêm lần nữa). Event `attack` có `cardless`. Không còn đòn tự đánh cuối lượt.
- **Trợ thủ:** gọi lần đầu → `g.giveSkillToHand(side, hero, "Q"|"E", "support")` lấy Q và E từ bộ (thiếu thì tạo), event `draw {reason:"support"}`.
- **Pháp sư/mana (×10):** `RULES.mage = {manaMax:100, manaStart:100, manaRegen:10, defaultCost}`, `HeroDef.mana?: {max,start,regen}`, `SkillDef.mana?: number | (c) => number`, `Unit.mana`. `g.isMage/maxMana/manaOf/gainMana/spendMana/manaCost`. Sự kiện `manaChange`, hook `onManaSpent`, `ctx.manaPaid`. Đồ: `CardItemDef.maxMana/manaRegen/manaCostMod`. Thẻ `mana` (hồi mana). Thiếu mana → lá không có trong `legalActions` (kể cả Quick ở lượt đối thủ).
- **Lá tạm:** hết lượt chủ bị gỡ khỏi tay với event `tempExpired` (không vào mộ); lá tạm bị cướp thì Đánh thường nhận được cũng tạm.
- Hằng số cũ bị bỏ: `attackLimitCap`, `addAttackLimit` (không còn cách tăng quá 3).

## Bộ chiêu 34 tướng + 36 đồ (01/11/2026): thay đổi API engine

Nguồn: `docs/heroes/KITS.md` (chiêu), `docs/heroes/ITEMS.md` (đồ), `docs/heroes/BALANCE.md` (số liệu), `law.md` mục 10, 11, 11a-11d. Test: `scripts/card_tests_kits_*.ts` (dùng `scripts/kit_test_util.ts`).

### Số liệu cân bằng (JSON)
- `balance/heroes/<id>.json`: `{ id, stats:{hp,atk,armor,mr}, params:{p1.., q0 q1.., e0 e1.., r0 r1..}, flags:{...} }`. `q0/e0/r0` là mana; `flags` là quyết định tạm (bật/tắt, số lần) để đổi mà không sửa code. Mọi số trong code và chữ đều đọc từ đây.
- `balance/items.json`: `{ <itemId>: { stats:{...}, params:{...} } }`; đọc bằng `itemBalance(id)` (`.stats`, `.p.<tên>`, tên thiếu thì ném lỗi).
- `kit(id)` (`balance/index.ts`) trả `Kit`: `k.p` (proxy ném lỗi khi thiếu tham số), `k.base` (spread vào `defineHero`: hp/atk/armor/mr), `k.flag(name)`, `k.num(name)`, `k.x("q1 + q2·AP")` ra chuỗi công thức cho `ctx.f`/`g.f` và `{...}` trong mô tả VI, `k.xe(...)` bản EN. Helper: `when.*` (điều kiện `quickWhen` dựng sẵn: `targetsSelf`, `attacksAlly`...), `actorOrEnemy`, `lockedAlly` (`options`), `spike(p, n, k)`.

### Action và PlayArgs
- `{t:"ability", side, unit, id, args?}`: nút hành động của tướng không tốn lá (`HeroDef.abilities`): Gangplank Úp Lá (`gp_stash`, `args.pick` = uid lá trên tay), Tristana Kích Nổ Bom (`tri_detonate`, `args.target` = tướng địch đang mang Bom). Chỉ ở bước chính lượt mình.
- `{t:"summon", side, hero, lane, mode?}`: `mode` là một phần tử `HeroDef.summonModes` (Jinx `"minigun" | "rocket"`); mỗi tổ hợp (đường, chế độ) là một hành động riêng.
- Ngoài ra đã có: `unequip` (tháo đồ), `upgrade` (ghép tại chỗ), `discard` (bỏ lá), `ready` (chốt gọi tướng úp).
- `PlayArgs` thêm `mode`, `manaSpent`, `amount`; `pick` là uid lá hoặc id lựa chọn tự do.

### HeroDef: trường mới (`types.ts`)
- `en`: chữ tiếng Anh dựng từ cùng JSON (cùng hình dạng `HeroTextEn`, bỏ tên).
- `deathHalf: string[]`: khoá stack TRÊN CHÍNH tướng này, engine giảm một nửa khi nó bị hạ.
- `carrierStacks: string[]`: khoá stack tướng này đặt lên ĐỊCH (nằm trong `Unit.stacks` của tướng mang): tướng mang chết mất một nửa, chủ chết không đổi (Ashe Buốt, Brand Bỏng, Darius Chảy Máu, Tristana Bom, Vel'Koz Phân Rã).
- `summonModes: string[]`: chế độ lúc gọi ra sân (Jinx `["minigun","rocket"]`, phần tử đầu mặc định). Hook `onSummon` nhận `d.mode`; sự kiện `summon` có `mode`.
- `setup(g, side)`: chạy một lần khi tạo ván, trước tay đầu (Qiyana đặt `GameState.laneElements`).
- `abilities: HeroAbility[]`: `{ id, name, nameEn, desc, descEn, options(g, me): PlayArgs[], resolve(g, me, args) }`. `options` rỗng = nút tắt; mỗi phần tử là một tổ hợp hợp lệ và thành một `Action {t:"ability"}`. Engine phát sự kiện `ability {unit, id, target?}` (KHÔNG mang lá, để giữ bí mật lá úp). Dùng `g.oncePerTurn` / `g.bumpTurnCount` để giới hạn theo lượt.
- `allyBonusStats(g, owner, target)`: chỉ số cộng cho đồng minh khi tướng này đang trên sân.
- `bot.carrierStackValue`, `bot.tokenSecretValue`, `bot.unitValue`, `bot.modeValue`: gợi ý bot (xem mục Bot bên dưới).

### Trạng thái chung engine đọc sẵn
- Chỉ số: `attack_speed`, `ad_up`, `ad_down`, `ap_up`, `crit_up`, `armor_up`, `armor_down`, `mr_up`, `mr_down`, `shred` (giá trị `v` cộng/trừ phẳng vào chỉ số, đọc bằng `g.statusV`); `invulnerable` (không nhận sát thương).
- `disarm` và `blind` (Mù) chặn đánh (`g.canAttack`) và huỷ mắt xích đòn đánh của tướng; Choáng huỷ mọi mắt xích của tướng; Câm Lặng huỷ mắt xích chiêu.
- `stone_link` (Malphite): sát thương địch lên một tướng liên kết được chia đều cho mọi tướng liên kết; sát thương `aoe` không chia.
- `vulnerable` (Nami R), `shield_power` (Janna E), `gp_wanted` (Gangplank R) có chữ riêng ở client (`board/helpers.ts`).

### Game API mới
- `g.timed(src, unit, id, d, o)`: trạng thái kéo dài `d` ĐƠN VỊ (law 4) đếm từ phía `src`; phần lẻ `X.Y` của chiêu CC là xác suất thêm 1 đơn vị. `g.unitsUntil(src, n)` cho mốc `until` tương ứng.
- Bộ bài: `g.flipTop(side, by)` (lật lá trên cùng, công khai, phát `deckFlip`), `g.insertTopN`, `g.putOnBottom`, `g.peekDeck`, `g.takeFromDeck`.
- `g.tempSkillCard(hero, side, key, data)`: lá chiêu tạm (hết cuối lượt đối thủ, có `until`). `g.freezeCard/freezeRandom(..., until)`: Hoá Băng lá trên tay; `Card.frozen` (id tướng), `Card.frozenUntil` (turnNo tan băng). Lá bị băng vẫn bỏ được.
- `g.damage/heal` nhận thêm `via` (hop trước, cho sự kiện nảy) và `aoe` (bỏ qua `stone_link`).
- Lá Tái Chế (Rumble): `card.data = {recycled: <tướng gốc>, apPerAd, manaOff}`, `kind:"skill"`, tung bằng chiêu gốc với Rumble là người dùng, không áp khống chế, biến mất khi hết hạn. Các lựa chọn Tái Chế và Thần Bài là lá đặc biệt tạm (`kind:"special"`, id `rumble_pick`, `tf_fate`) có `data.uid` trỏ lá khác; `legalActions` coi chúng khác nhau theo `data.uid` (client: `cardSig` trong `store.ts` phải khớp `sig` trong `engine.ts`).
- `ReactFx` thêm `intercept {from, by, pct}` (Braum E) và `stealMode: "basic" | "burn" | "convert"`.

### State và sự kiện mới
- `GameState.laneElements?: string[]`: 5 phần tử `"earth" | "water" | "grass"`, công khai, đặt một lần ở `HeroDef.setup` của Qiyana. Server gửi trong `cg:state` (`CardView.laneElements`); client hiện huy hiệu ở dải số đường giữa sân.
- Token úp (`token.hidden`, `secret`, `card`): server xoá `secret` và `card` khỏi bản gửi cho đối thủ (`CardRoom.unitsFor`), chủ vẫn thấy. Thùng của Gangplank: `secret.powder` (Thuốc Súng, +1 mỗi đầu lượt chủ), `card` = lá đã úp.
- Sự kiện mới: `ability {unit, id, target?}`, `deckFlip {side, card, by?}`, `cardFrozen {side, card, by}`, `cardThawed {side, card}`, `revealEnd {side}`, `tempExpired`, `teamManaChange`, `freeCard`, `transform`, `roll`, `tokenFlip`. Định nghĩa đầy đủ: `GameEvent` trong `types.ts`.
- `CardView` (client) không còn `attackLimit` và `rules.attackLimit`.

### Bot
- Nhận đủ `Action {t:"ability"}`: bot "easy" chấm theo sự kiện (Úp Lá: giá trị Thùng trừ giá lá úp, nên chỉ úp lá rẻ); bot "hard" tìm kiếm cả lượt rồi chấm thế cờ. Mọi nhánh đi qua `candidateActions` / `closestLegal`.
- `HeroBotHint` mới: `carrierStackValue` (điểm mỗi stack tướng đặt lên địch, trừ ở phe mang), `tokenSecretValue` (điểm mỗi đơn vị `secret` của token, vd Thuốc Súng), `unitValue(g, u)` (giá trị cấu hình của tướng trên sân, vd Jinx chọn súng hợp đội hình địch), `modeValue(g, side, lane, mode)` (xếp hạng chế độ lúc gọi tướng).
- `determinize` lấy mẫu lại Thuốc Súng (0..3) và lá úp trong Thùng của đối thủ. Lá Thần Bài cho chủ biết lá trên cùng bộ: bot chôn xuống đáy nếu lá đó kém (`fateBury`, `botEval.ts`). Lựa chọn Tái Chế (`rumble_pick`) đi qua tìm kiếm thông thường.
- Cấm/chọn (`botDraft.ts`, `synergy.ts`) phủ đủ 34 tướng, gồm Rumble.
