# ENGINE V2: global rules spec (85-card deck, draw 2, attack limit, fighter cardless attack, support Q/E, mage mana)

> **Ghi chú đối chiếu (E, 30/10):** các điểm "Owner decisions" ở cuối file ghi đè các dòng sau của phần trên: R2 (đòn free từ buff NAY ĐƯỢC tính; `g.attack()` trong chiêu/hook và `autoAttack` vẫn không tính), R3/1.1 (cardless 66% chứ không 67%, là hành động Quick), R5/1.1 (mana ×10: max/start 100, +10 mỗi lượt, chi phí theo từng chiêu), 1.1/1.4/2.1 (xoá `attackLimitCap`, `addAttackLimit`, và `attackLimitMod` vì trần cứng 3 cho mọi tướng), 2.5 (bước `summon` + `draw` thay bằng phase `blind` úp đồng thời; lượt đầu bắt buộc gọi vẫn giữ), mục 8.2 (thua khi phải rút mà bộ rỗng; bộ còn 1 lá thì rút 1 và không thua), R4/R7 giữ nguyên. Điểm 8-9 (mở đường từng đường một; tướng chết giữ đường) thay lịch 1-2-2 và `respawnDue` cũ. Test: `scripts/card_tests_v2.ts`.

Status: final implementation spec (deck model decided by the owner). No code written yet. Hero skill rewrites live in `docs/heroes/REDESIGN_V2.md` (separate job); this file only defines the engine API those heroes will use.

Paths are relative to the repo root. `cardgame/` = `packages/shared/src/cardgame/`.

---

## 0. Rule summary (owner decisions)

| # | Rule | Current behavior | V2 |
|---|---|---|---|
| R0 | Deck | 20-card base deck; each hero adds 34 cards (skills + 20 support) when summoned | **85 cards from game start**: 40 shared cards (basic, spells, gold, items, player-built) + for each of the 5 heroes exactly **4 Q, 4 E, 1 R** (9 × 5 = 45). Same counts for every hero (per-hero `skillCopies`/`supportCopies` removed). Nothing is shuffled in on summon. |
| R1 | Draw per turn | `RULES.drawPerTurn = 1` | **2**. Hand max stays 10. Overflow cards are **burned** to the grave and emit `cardBurned`. |
| R2 | Basic attack limit | none | **3 per player per turn**. Counts: basic attack cards + fighter cardless attacks. Does NOT count: free attacks from `nextAttack` buffs, `g.attack()` calls inside skills/hooks, `autoAttack` (Kog). |
| R3 | Fighter cardless attack | fighters cannot play basic cards; auto-attack the opposite unit at end of turn | Each fighter (hero, not token) may attack **without a card once per turn at 67%** (counts toward the limit). Fighters may now play basic cards at 100%. End-of-turn fighter auto-attack is **removed** (`HeroDef.autoAttack` still runs). |
| R4 | Support on summon | owner draws 1 random card | Owner takes the support's **Q and E from the deck** into hand (created if none left in the deck). First summon only (respawn does not trigger). |
| R5 | Mage mana | mages are like everyone else | Mage skill cards are in the deck like everyone else's, but **playing one costs that mage's mana**. Per-mage mana: max 10, start 10, +1 at the start of the owner's turn. No random temporary skill mechanic. |
| R6 | `StatusInst.at` | already exists | No change. |
| R7 | Opening hand timing (follows from R0 + design intent) | opening hand drawn after the first summon | Opening hand (`startHand`) is drawn **before** the first summon step, so the hand decides which hero to summon. First turn still draws nothing extra. |

**Design intent (owner): the hand decides the summon.** Skill cards of a hero not on board are dead cards in hand, so players plan summons around their hand. Example: hand = Basic, Basic, Basic, Blitz E, Renata E. Turn-1 options: summon Renata (her E is Quick/defensive, and the support summon also brings her Q), summon Blitz to open fights with his E, or summon a fighter who spends the 3 basics (plus its cardless attack) while holding Blitz E / Renata E for later. Engine, bot and UI must support this planning.

Used skill cards keep current behavior (go to the grave, or vanish/return per `ctx.vanish()/toHand()`). See open question 8.1.

---

## 1. Data model (`cardgame/types.ts`)

### 1.1 RULES
```ts
drawPerTurn: 2,                 // was 1
handMax: 10,                    // unchanged
startHand: 5,                   // unchanged (owner may revisit with an 85-card deck)
skillCopies: { Q: 4, E: 4, R: 1 } as Record<SkillKey, number>,   // was 6/6/2; now fixed for every hero
sharedDeckSize: 40,
attackLimit: 3,                 // basic attacks per player per turn
attackLimitCap: 6,              // hard cap after all modifiers (REDESIGN_V2 "Phá giới hạn 3 đòn" risk)
fighterCardlessMult: 0.67,
mage: {
  manaMax: 10, manaStart: 10, manaRegen: 1,
  defaultCost: { Q: 2, E: 2, R: 5 } as Record<SkillKey, number>,  // used when SkillDef.mana is missing
  restoreCard: 3,                              // mana given by the "mana" support card (placeholder)
},
supportSummonKeys: ["Q", "E"] as SkillKey[],
```
Remove `heroSupport` and `baseDeck` (dead: per-hero support cards no longer exist). `mageSkillBonus` stays 0.

### 1.2 Unit
```ts
/** Mages only (undefined for other roles and tokens). Public information. */
mana?: number;
```
Max mana is computed (`g.maxMana(u)`), not stored.

### 1.3 GameState
```ts
/** Reset in beginTurn. Belongs to the active side. */
turnAttacks?: {
  used: number;        // counted basic attacks this turn
  bonus: number;       // this-turn limit increase from skills (g.addAttackLimit)
  cardless: string[];  // unit ids that already used their cardless attack this turn
};
```
Optional; always read through `g.turnAttacks()` (lazy init) so hand-built test states keep working.

### 1.4 SkillDef / HeroDef / Ctx / CardItemDef / SupportId
```ts
// SkillDef
/** Mana cost (mages only). Number or dynamic. Missing => RULES.mage.defaultCost[key]. */
mana?: number | ((c: OptCtx) => number);

// HeroDef
mana?: { max?: number; start?: number; regen?: number };          // mage overrides
attackLimitMod?(g: Game, me: Unit, side: Side): number;            // passive limit change while on board (Nami: +1)
// REMOVE: skillCopies, supportCopies (engine ignores them; hero job deletes the fields from hero files)

// Ctx
manaPaid: number;   // mana paid to cast this card (0 for non-mages)

// CardItemDef (cardgame/items.ts) — API only, item content later
maxMana?: number;                                                  // + to g.maxMana
manaRegen?: number;                                                // + to per-turn regen (not stats.manaRegen, which stays -> AP)
manaCostMod?(g: Game, me: Unit, def: SkillDef, card: Card): number;  // delta, result clamped >= 0

// SupportId
| "mana"   // restore-mana support card; engine support only, added to DECK_POOL when the owner sets numbers
```
`Card.temp` is unchanged (still used by hero effects such as Katarina daggers). `NextAttackBuff.free` is unchanged and remains the way skills grant uncounted attacks.

### 1.5 AttackInfo, Action, ChainLink
```ts
// AttackInfo
cardless?: boolean;   // `free` stays false for cardless attacks (Kog ARTY reads info.free)

// Action: extend the existing attack action
| { t: "attack"; side: Side; actor: string; target: string; cardless?: true }
//   no cardless => free attack from a nextAttack buff (unchanged)
//   cardless    => fighter cardless attack (counted, 67%)

// ChainLink
mode?: "free" | "cardless";   // kind = "attack" only
manaPaid?: number;            // kind = "card", mage skills
```

### 1.6 Events (GameEvent)
```ts
| { t: "cardBurned"; side: Side; card: Card; reason: "handFull" }   // overflow: card to grave (vanishes if temp/special)
| { t: "tempExpired"; side: Side; card: Card }                      // temp card removed at end of holder's turn
| { t: "manaChange"; unit: string; mana: number; max: number; delta: number;
    reason: "summon" | "respawn" | "turn" | "spend" | "restore" | "effect" }
| { t: "attackCount"; side: Side; used: number; limit: number }    // after each counted attack or limit change
// changed:
| { t: "attack"; ...; free: boolean; cardless?: boolean }
| { t: "draw"; ...; reason: "support" }   // new reason value for support Q/E on summon
```
Overflow no longer emits `discard{reason:"overflow"}`; it emits `cardBurned`. The `onDiscard` hook still fires with `reason: "overflow"` (Soraka filters on it).

### 1.7 Hooks (HookData)
```ts
onManaSpent: { unit: Unit; amount: number; card: Card };
onTempExpired: { side: Side; card: Card };
```

---

## 2. Engine changes

### 2.1 Game API (`cardgame/game.ts`)
New primitives (all emit events):

| Function | Behavior |
|---|---|
| `isMage(u)` | `!u.token && role(u) === "mage"` |
| `maxMana(u)` | `HeroDef.mana?.max ?? RULES.mage.manaMax` + Σ `CARD_ITEMS[id].maxMana` over `distinctItems(u)` |
| `manaOf(u)` | `u.mana ?? 0` |
| `gainMana(u, n, reason = "effect")` | clamp to `[0, maxMana]`, emit `manaChange` if changed, return gained. No-op for non-mages. |
| `spendMana(u, n, card)` | requires `mana >= n`; subtract; emit `manaChange{reason:"spend", delta:-n}`; fire `onManaSpent`. Returns boolean. |
| `manaCost(u, def, card)` | `def.mana` (number or fn) `?? RULES.mage.defaultCost[def.key]` + item `manaCostMod` deltas, `max(0, round)`. 0 for non-mages. |
| `turnAttacks()` | lazy-init and return `s.turnAttacks` |
| `attackLimit(side)` | `min(RULES.attackLimitCap, RULES.attackLimit + bonus + Σ attackLimitMod of side's heroes on board)` |
| `attacksLeft(side)` | `attackLimit(side) - turnAttacks().used` (meaningful for `s.active`) |
| `countAttack(side)` | `used++`, emit `attackCount` |
| `addAttackLimit(side, n)` | `bonus += n`, emit `attackCount` (skill API, e.g. Jinx Q) |
| `canCardless(u)` | hero fighter, `canAct`, not in `cardless`, no `free` buff in `u.nextAttack`, `attacksLeft > 0` |
| `allowCardless(u)` | remove `u.id` from `cardless` (skill API: "may attack without a card again") |
| `grantFreeAttack(u, buff?)` | push `{ id: buff?.id ?? "free", source, free: true, ...buff }` to `u.nextAttack` (uncounted) |
| `burnOverflow(side, card)` | emit `cardBurned{reason:"handFull"}`; push to grave unless `special`/`temp`; fire `onDiscard{reason:"overflow"}` |
| `giveSkillToHand(side, hero, key, reason)` | take the first matching skill card (`kind:"skill"`, `hero`, `side`, key) out of the deck (no reshuffle needed, deck order is hidden anyway), emit `draw{reason}`, fire `onDraw`; if none in deck, `createCard(side, skillCard)`; hand full -> `burnOverflow` |
| `expireTemps(side)` | remove all `temp` cards from `side`'s hand; per card emit `tempExpired`, fire `onTempExpired` |

Changes to existing functions:
- `drawOne`, `flipPrize`, `giveCard` (hand-full branches): call `burnOverflow` instead of `toGrave(..., "overflow")`.
- `attack(a, t, o)`: accept `o.cardless`; set `info.cardless`; include it in the `attack` event. 67% comes in via `o.mult` (already supported; `bonusRaw` buffs are not scaled).
- `heroCards(hero, side)`: returns exactly `RULES.skillCopies` skill cards (4Q 4E 1R), ignoring `HeroDef.skillCopies`; no support cards.
- `summon()`:
  - remove `this.shuffleIn(side, this.heroCards(hero, side))` (skills are already in the deck);
  - remove the "support draws 1" block;
  - role `support`: `for (const k of RULES.supportSummonKeys) this.giveSkillToHand(side, hero, k, "support")`;
  - role `mage`: `u.mana = HeroDef.mana?.start ?? RULES.mage.manaStart`, emit `manaChange{reason:"summon"}`;
  - then `onSummon` as today.
- `respawnDue()`: mages reset to start mana, emit `manaChange{reason:"respawn"}`.
- `stealCard()`: if the stolen card is `temp`, the gained basic is also `temp`.
- Unchanged: `isDeadCard` (skill cards of reserve/dead heroes are dead cards; this is now common since all 45 skill cards are in the deck from turn 1).

### 2.2 Game setup (`cardgame/engine.ts` `newGameEx`, `cardgame/deck.ts`)
- `newGameEx`: after building the 40 shared cards from the player deck list, push `g.heroCards(h, side)` for each of the 5 team heroes, then shuffle once. Deck = 85.
- `deck.ts`: `DECK_SIZE = 40` (= `RULES.sharedDeckSize`); raise `DECK_POOL` maxima and rebuild `DEFAULT_DECK` to 40. Proposal (owner may tune): pool max basic 14, draw 3, each spell 3, gold 8, each item component 3; default deck = 12 basic, 2 draw, 8 spells (2× heal/flash/ignite/barrier), 8 gold, 10 items (2× first 5 components). `validateDeck` unchanged in logic.
- Client deck builder reads `DECK_SIZE`/`DECK_POOL` (`packages/client/src/card/deckStore.ts`, `Screens.tsx`): saved 20-card decks become invalid -> engine falls back to `DEFAULT_DECK` (existing behavior); C shows **"Bộ bài cần 40 lá, hãy xếp lại"** in the deck builder.

### 2.3 Legal actions (`engine.ts`)
- `playOptions`, case `"basic"`: drop the `g.role(a) === "fighter"` exclusion for heroes (tokens with role fighter stay excluded, preserving current token behavior). Return `[]` if `g.attacksLeft(side) <= 0`.
- `playOptions`, skill branch: if `g.isMage(u)` and `g.manaOf(u) < g.manaCost(u, def, card)` return `[]`.
- `playOptions`, support `"mana"`: targets = own mages on board with `mana < maxMana`.
- `chainOptions.add`: same mana check for mage Quick skills (can now happen in the opponent's turn too).
- `legalActions` main phase, after the free-attack block:
  ```ts
  for (const a of g.heroes(side)) if (g.canCardless(a))
    for (const t of attackTargets(g, a, false)) out.push({ t: "attack", side, actor: a.id, target: t.id, cardless: true })
  ```
  Free-buff attacks are listed unchanged and are not limited.

### 2.4 applyAction
- `play`: after validation and `removeFromHand`:
  - basic card: `g.countAttack(side)`;
  - mage skill: `cost = g.manaCost(...)`; `g.spendMana(u, cost, card)`; store `manaPaid` on the chain link.
- `chain` (`addQuickLink`): same mana spend for mage Quick skills.
- `attack`:
  - `cardless`: validate `canCardless(a)` and target in `attackTargets(g, a, false)`; push to `cardless`; `countAttack`; `startChain(..., "attack", undefined, {actor, target}, "cardless")`.
  - otherwise: existing free-buff validation, mode `"free"`.
- `startChain` gets an optional `mode` param stored on link 1.
- `resolveLink` attack branch:
  ```ts
  const cardless = L.mode === "cardless"
  g.attack(a, t, cardless ? { cardless: true, mult: RULES.fighterCardlessMult } : { free: true })
  ```
- `resolveCardInner` skill branch: `ctx.manaPaid = link.manaPaid ?? 0` (pass through `resolveCard`).
- Mana and attack count are paid at activation; a fizzled (stunned caster) or redirected link does not refund them.

### 2.5 Turn sequencing
`beginTurn(g)`:
1. `actionsThisTurn = 0`; `s.turnAttacks = { used: 0, bonus: 0, cardless: [] }`
2. emit `turnStart`
3. `respawnDue(side)` (mages reset mana)
4. mana regen: each mage of `side` on board: `gainMana(u, regen, "turn")`, regen = `HeroDef.mana?.regen ?? RULES.mage.manaRegen` + Σ item `manaRegen`
5. `onTurnStart` hooks
6. ignite
7. **opening hand (R7)**: if `!s.opened[side]`, set `opened[side] = true` and `g.draw(side, RULES.startHand, { reason: "opening" })` now, before the summon step
8. `phase = "summon"`; auto `drawStep` if nothing to summon. `mustSummon` keeps forcing at least one summon on the first turn (it no longer relies on `opened`; use `!g.heroes(side).length && summonActions(...).length && first turn of side`, e.g. a new `s.firstTurnDone?: Partial<Record<Side, boolean>>` set at the end of drawStep).

`drawStep(g)`:
1. opening turn (hand already drawn in `beginTurn`): draw nothing, just `phase = "main"`
2. later turns: if the deck is empty when the draw step starts, lose (`endReason: "deck"`); otherwise draw up to `drawPerTurn`, stopping silently if the deck runs out after the first card (open question 8.2).

`endTurn(g)`:
1. auto-attacks: only `def.autoAttack` (remove the `def.role === "fighter" ? g.opposite(u)` default). Uncounted, `free: true` as today.
2. `onTurnEnd` hooks
3. `g.expireTemps(side)` (replaces the silent `hand.filter(c => !c.temp)`)
4. tokens/statuses expire, `turnEnd`, round advance, `beginTurn` (unchanged)

### 2.6 i18n
- `cardgame/i18n_en.ts`: English log lines for `cardBurned`, `tempExpired`, `manaChange`, `attackCount`, cardless `attack` ("attacks without a card (67%)"), support card `"mana"`.
- `engine.ts` `SUPPORT_NAME/SUPPORT_DESC`: `mana: "Hồi Mana"`, `"1 pháp sư mình hồi {3} mana."` (from `RULES.mage.restoreCard`).

### 2.7 Hero API recap (for REDESIGN_V2 implementers)
| Need (REDESIGN_V2) | API |
|---|---|
| Skill mana cost | `SkillDef.mana: number` or `(c) => number` |
| Refund / gain mana (Ahri +2 on kill, Viktor refund 1) | `g.gainMana(me, n, "effect")` |
| Read unused mana at end of turn (Lux) | `onTurnEnd` + `g.manaOf(me)` |
| Mana paid this cast | `ctx.manaPaid`; hook `onManaSpent` |
| Mage overrides | `HeroDef.mana = { max, start, regen }` |
| Next attack needs no card (Nami Q) | `g.grantFreeAttack(u, { mult, bonusRaw })` (uncounted) |
| Attacks inside a skill (Garen E 3×40%) | `g.attack(self, t, { mult: 0.4 })` in `resolve` (never counted) |
| "+N attacks this turn beyond the limit" (Jinx) | `g.addAttackLimit(side, n)` (allowance; still needs cards/cardless) or N × `grantFreeAttack` (truly free) |
| Passive limit change (Nami: 4) | `HeroDef.attackLimitMod = () => 1` |
| Second cardless swing | `g.allowCardless(u)` |
| Temp cards (Katarina daggers) | `createCard(side, { ..., temp: true })` (now emits `tempExpired`) |
| Card counts | fixed 4Q/4E/1R; hero files must drop `skillCopies`/`supportCopies` |

---

## 3. Bot (`cardgame/bot*.ts`)

| File | Change |
|---|---|
| `botView.ts` | `fingerprint`: add `u.mana`, `turnAttacks.used/bonus/cardless`. `determinize` unchanged (opponent hand+deck re-deal still valid; all skill cards are in the pool from turn 1). |
| `botEval.ts` | `cardValue`: remove the fighter exclusion for `basic`; mage skill value minus `cost * EVAL.manaPoint` and ~0.5× if currently unaffordable. New `EVAL.manaPoint` (~8; ×0.5 for mana above `max - regen`, since regen at cap is wasted). `sideValue`: `+ manaPoint * mana` for mages. `threatOn`: opposite fighter hit = `hit * (fighterCardlessMult + 0.6)` instead of `* 1.6` (no auto-attack). `burst`: cap counted attacks at `attackLimit`. Recheck `card.skillReserve/skillDead` weights: reserve heroes' skill cards are now in hand early. `deckSafe/deckPenalty`: retune for an 85-card deck with 2 draws/turn. |
| `botGreedy.ts` | `scoreEvents`: `cardBurned` own −10 / foe +6; `manaChange` `spend` `sc += delta * 3`, `restore` own `+delta * 4`; `tempExpired` own −2. Discard-value table: `temp` = 0, dead skill card (`isDeadCard`) = 1. |
| `botSearch.ts` | `cardCost`: temp = 0, dead skill = 1. `candidateActions`: keep `attack` actions with and without `cardless` as distinct. `quickResponseProb`: mage Quick cards only count if that mage has mana for them. `closestLegal` already compares all keys incl. `cardless`. `finish()` no longer gets fighter auto-attacks for free, so the plan must include cardless attacks explicitly (automatic, they are legal actions). |
| `bot.ts`, `botDraft.ts` | No required change. |

### 3.1 Summon choice must read the hand (design intent R7)
The current easy bot picks summons by a fixed `ROLE_PRIORITY` + `LANE_ORDER` (`botGreedy.ts` ~line 140). Replace with a hand-aware score, shared by both bots:

- New pure helper in `botEval.ts`: `summonValue(s: GameState, side: Side, hero: string): number`, using only own hand + public board:
  - **live cards unlocked**: Σ `cardValue` of hand skill cards of `hero` as if it were on board (`EVAL.card.skillBoard` + R bonus) minus their current dead value; Quick cards get `+EVAL.quickDefense` (~25) when the foe board threatens (≥1 enemy hero on board or foe has more heroes);
  - **support bonus**: role `support` adds the value of its Q and E that `giveSkillToHand` will bring (count copies still in deck; 0 if hand is at `handMax` - 1);
  - **basic usage**: fighters/other attackers: `min(basicsInHand, attacksLeft) * value of a basic swing by this hero` (+ cardless swing for fighters: `0.67 * atk`), compared with what the current board can already spend; only the marginal gain counts (if the board already spends 3 attacks, basics add nothing);
  - **mage**: value of its hand skills is reduced by mana cost, but a fresh mage has 10 mana so most are live;
  - **board fit**: existing presence value (`EVAL.presence[role]`), opposite matchup (`threatOn` both ways for the chosen lane), lane availability.
- `botGreedy.chooseActionGreedy`: score summon actions as `1000 + summonValue(...)` (+ small lane term) instead of `ROLE_PRIORITY`. Keep summoning at highest priority when the board is empty.
- `botSearch`: summons are already searched; make sure `evaluate` reflects the intent: `cardValue` for skill cards of reserve heroes (`skillReserve`) must stay clearly below `skillBoard`, so summoning the hero whose cards are in hand raises the leaf score; add the support Q/E tutor effect naturally (it happens in `applyAction`). In the summon phase, do not prune summon candidates by `maxChildren` (there are at most 5 heroes × open lanes).
- Bot test (E, `card_tests_bot.ts`): with the owner's example hand (3 Basic, Blitz E, Renata E) and a team containing Blitz, Renata and a fighter, both bots must pick one of {Renata, Blitz, fighter} and the chosen hero's `summonValue` must be the max; with a hand of only fighter-irrelevant skills of hero X, the bot summons X over a hero with no cards in hand.

---

## 4. Server (`packages/server/src/CardRoom.ts`)
- `hidden(c)` -> `{ uid, hidden: true, ...(c.temp ? { temp: true } : {}) }`.
- `eventsFor`: add
  - `cardBurned`: public (grave is public) unless `card.temp` and `side !== viewer` -> hide card;
  - `tempExpired`: `side === viewer ? e : { ...e, card: hidden(e.card) }`;
  - `draw{reason:"support"}`: already hidden for the opponent by the existing `draw` case. Note: which cards are taken is deducible (support's Q+E) — acceptable, it is the rule.
  - `manaChange`, `attackCount`: public.
- `viewOf`: add `turnAttacks: s.turnAttacks ?? { used: 0, bonus: 0, cardless: [] }`, `attackLimit: g.attackLimit(s.active)`; `rules` add `attackLimit`, `drawPerTurn`, `fighterCardlessMult`, `mage: { manaMax }`, `skillCopies`. `u.mana` is public via `units`.
- `actionKey`/`sigCard`: no change (generic over action fields; `cardless` included).
- Deck validation on join (if the room validates `deck`): uses `validateDeck` -> 40 cards automatically.

---

## 5. Client

### 5.1 Store (`packages/client/src/card/store.ts`) — owner C
- `CardView`: add `turnAttacks`, `attackLimit`; `rules` gains `attackLimit, drawPerTurn, fighterCardlessMult, mage, skillCopies`.
- New exported helpers (D uses them):
  ```ts
  export function cardlessOptions(legal: Action[], unitId: string): Action[]  // attack && cardless && actor === unitId
  export function freeAttackOptions(legal: Action[], unitId: string): Action[] // attack && !cardless && actor === unitId
  export function manaCostOf(g: cg.Game, card: Card): number | undefined     // mage skill cards only
  ```

### 5.2 Hand (`Hand.tsx`, `hand.css`) — owner C
- Mage skill cards: mana gem with the cost; if unaffordable add class `nomana` and state line **"Thiếu mana (cần X, còn Y)"**.
- Temp cards (hero effects): class `temp`, badge **"Tạm"**, zoom tag **"Lá tạm: biến mất cuối lượt nếu không dùng"**.
- Attack counter in `hd-count`: **"Đánh {used}/{limit}"** (red at 0 left), tooltip **"Đánh thường mỗi lượt: lá Đánh thường và đòn không cần lá của Đấu sĩ. Đòn miễn phí từ chiêu không tính."**
- Action group **"Đánh không cần lá (67%)"**: one button per fighter from `cardlessOptions`. Existing **"Đánh miễn phí"** group filters `!cardless`.
- Burned-card toast: **"Tay đầy: {tên lá} bị đốt vào mộ"**; opponent: **"Đối thủ tay đầy: {tên lá} bị đốt"**.
- Deck builder (`deckStore.ts`, `Screens.tsx`): 40-card deck, message **"Bộ bài cần 40 lá, hãy xếp lại"** for old 20-card decks; info line **"Mỗi tướng thêm 4 Q, 4 E, 1 R vào bộ (tổng 85 lá)"**.

### 5.3 Animation and log (`anim/plan.ts`, `anim/AnimLayer.tsx`, `anim/anim.css`, `chain/text.ts`) — owner C
- `cardBurned`: card flies deck -> grave with a burn tint.
- `tempExpired`: hand card dissolves in place (~400 ms).
- `draw{reason:"support"}`: deck -> hand (existing draw animation), source highlight on the support unit.
- Vietnamese log (`chain/text.ts`): `cardBurned` **"{phe} tay đầy, đốt {lá}"**; `tempExpired` **"{lá} (tạm) tan biến"**; `manaChange` **"{tướng} {+n/−n} mana ({mana}/{max})"**; cardless attack **"{tướng} đánh không cần lá {mục tiêu} (67%)"**; support summon **"{tướng} gọi ra: lấy Q và E lên tay"**.

### 5.4 Board and panel (`Board.tsx`, `board/*`, `board.css`, `stats/*`) — owner D
- Mana bar on mage `UnitCard` under `HpBar` (class `bd-mana`, 10 pips, text `mana/max`); same in `UnitTip` and `UnitPanel` (`ManaRow` next to `HpRow`, label **"Mana"**).
- `UnitPanel.Skills`: totals from `view.rules.skillCopies` (4/4/1) in `copiesLine`; mages additionally show **"Tốn {cost} mana"** per skill (via `g.manaCost`). Supports: note **"Gọi ra sân: lấy Q và E từ bộ lên tay."** Mages: **"Pháp sư: mỗi chiêu tốn mana (tối đa 10, +1 mỗi lượt)."**
- Fighter `UnitCard`: cardless badge (CSS sword icon + "67%") when `cardlessOptions(legal, u.id).length > 0`; click -> `cardActions.beginTargeting(u.id, cardlessOptions(...))`; dimmed when `turnAttacks.cardless` contains the id.
- Floats (`Board.tsx floatsOf`): `manaChange` -> blue `+n`/`−n` (kind `mana`); cardless `attack` -> "67%" tag on the attacker.
- Summon buttons (C, `Hand.tsx` "Triệu hồi" group): show per hero how many of its cards are in hand (**"{n} lá trên tay"**) so the player plans summons from the hand; dead skill cards in hand already show **"ĐÃ CHẾT"**, change that label to **"Chưa gọi"** for reserve heroes (keep "ĐÃ CHẾT" for dead ones).
- Fighter tooltip line: **"Đấu sĩ: mỗi lượt đánh không cần lá 1 lần (67% sát thương)."**

---

## 6. Tests (owner E)

New file `scripts/card_tests_v2.ts` (same harness as `card_tests.ts`), wired into the root `test` script.

Deck:
1. New game: each deck has 85 cards = 40 shared + 9 per hero (exactly 4Q/4E/1R per hero, even if a hero def still has `skillCopies`); no cards added on summon.
2. `validateDeck` requires 40; `DEFAULT_DECK` has 40 and is valid; 20-card list falls back to default.
2b. Opening hand (5) is in hand at the start of each side's first turn, before any summon; the first turn still requires one summon and draws nothing extra.

Draw/hand:
3. Later turns draw exactly 2.
4. Hand 9 + draw 2: 1 in hand, 1 `cardBurned{reason:"handFull"}` in grave, no `discard` event, `onDiscard{reason:"overflow"}` still fires.
5. Deck with 1 card at draw step: draws 1, no loss; deck 0 at draw step: loss.
6. Prize flip with full hand -> `cardBurned`.

Attack limit:
7. Three basic cards -> 4th not in `legalActions`; `attackCount` 1..3.
8. Free-buff attack after the limit is still legal and not counted.
9. `g.attack` inside a skill is not counted.
10. `addAttackLimit` allows a 4th; stub `attackLimitMod` raises the limit; capped at `attackLimitCap`.
11. Limit resets on the next own turn.

Fighter:
12. Fighter can play a basic card (100%).
13. Cardless attack: legal once, 67% of the basic damage, counted, not legal twice; `allowCardless` re-enables.
14. Cardless not offered with a `free` buff, when stunned, or at 0 attacks left.
15. No fighter auto-attack at end of turn; Kog `autoAttack` still fires and ARTY still reads `info.free`.
16. Tokens with role fighter cannot play basic nor cardless-attack.
17. Cardless attack opens a chain; stunned attacker fizzles without refund.

Support:
18. Summoning a support moves 1 Q and 1 E from deck to hand (deck −2, `draw{reason:"support"}`), no random draw; with none left in deck they are created. Respawn gives nothing. Full hand -> `cardBurned`.

Mage:
19. Summon sets `mana = 10`; turn start +1 capped at max; reserve/dead mages unchanged; respawn resets to start.
20. Mage skill play spends mana (`manaChange{spend}`, `onManaSpent`, `ctx.manaPaid`), card goes to grave as today; unaffordable -> not legal (also as Quick in the opponent's turn); dynamic `mana` fn honored; `defaultCost` used when missing.
21. Item stub with `maxMana`/`manaRegen`/`manaCostMod` honored.
22. `"mana"` support card restores mana (clamped), targets only mages below max.

Misc:
23. Temp card (hero effect) unused at end of turn -> `tempExpired`, not in grave; stolen temp becomes a temp basic.
24. `card_tests_bot.ts`: both bots finish 20 seeded games without exceptions or illegal actions; they use cardless attacks and mage skills.
25. Server view: opponent sees hidden temp cards with `temp:true`; `u.mana`, `turnAttacks`, `attackLimit` present for both.

Existing tests to update (V1 rules): `card_tests.ts` ~285/313/397 (opening + deck composition), ~407 (overflow event), ~435 (drawPerTurn 1), ~453/474 (support draw on summon), ~510 (34 cards shuffled on summon -> now 85 from start), ~1395 and ~2158 (fighter auto-attack / no basic), `card_tests_items.ts` ~445 (Đại Bác via cardless/basic), and any g2/g3/g4 hero test relying on `skillCopies` counts or summon shuffle. `scripts/card_selfplay.ts`/`card_sim.ts`: report deck-out rate, attacks/turn, mana wasted at cap, burned cards/game.

---

## 7. Work split (5 parallel implementers, disjoint files)

Contract first: A lands `types.ts` (section 1) as the first commit so B-E compile against it. If a name must change, A updates sections 1-2 of this file and notifies.

| Owner | Scope | Files (exclusive) |
|---|---|---|
| **A** Engine/rules core | Sections 1, 2 | `cardgame/types.ts`, `cardgame/game.ts`, `cardgame/engine.ts`, `cardgame/deck.ts`, `cardgame/items.ts` (only `CardItemDef` fields + their use; no item content), `cardgame/spells.ts`, `cardgame/i18n_en.ts`, `cardgame/index.ts`, `cardgame/registry.ts` |
| **B** Bot | Section 3 | `cardgame/bot.ts`, `botGreedy.ts`, `botSearch.ts`, `botEval.ts`, `botView.ts`, `botDraft.ts` |
| **C** Server + client store/hand | Sections 4, 5.1-5.3 | `packages/server/src/CardRoom.ts`, `packages/client/src/card/store.ts`, `Hand.tsx`, `hand.css`, `card.css`, `hand/*`, `anim/*`, `chain/*`, `CardApp.tsx`, `deckStore.ts`, `Screens.tsx`, `screens.css` |
| **D** Client board/panel UI | Section 5.4 | `packages/client/src/card/Board.tsx`, `board.css`, `board/*`, `stats/*`, `vfx/*` |
| **E** Tests + docs | Section 6, docs | `scripts/card_tests*.ts` (+ new `card_tests_v2.ts`), `scripts/card_selfplay.ts`, `scripts/card_sim.ts`, root `package.json` test script, `docs/CARDGAME_API.md`, `docs/CARDGAME_PROTOCOL.md`, `docs/LUAT_MOI.md`, `docs/LUAT_THE_BAI.md`, this file |

Not in this job: `cardgame/heroes/*`, `docs/heroes/*` (hero rewrite job). V2 works without hero edits: engine ignores `skillCopies`/`supportCopies`, mages fall back to `RULES.mage.defaultCost`.

Cross-owner dependencies: D imports `cardlessOptions`/`freeAttackOptions`/`manaCostOf` from `store.ts` (C ships the signatures in 5.1 first). C and D read `Game.manaCost/maxMana/attackLimit` (A). E writes tests against this spec immediately and expects them red until A/B land.

Done: all `card_tests*` green; selfplay 200 games without exception; deck-out rate, attacks/turn and mana stats reported; client checked manually (mana bar, mana gem/`nomana`, "Đánh x/3", cardless button/badge, burn toast, 40-card deck builder).

---

## 8. Open questions for the owner
1. **Used skill cards** keep current behavior (grave). With 45 skill cards in the deck from turn 1, graves fill faster with skills, which strengthens grave-scaling heroes (Viktor tiers, Zed shadows, Yorick, Katarina recall, `graveCardValue`), and Soraka R reshuffles them back. Not broken, but the hero job should re-check those numbers. Mage skills going to the grave after paying mana is also kept as is.
2. **Deck-out**: lose only if the deck is empty when the draw step starts (current code would lose on the 2nd draw with 1 card left). With 85 cards this is rare.
3. **Dead cards** are intended (the hand decides the summon, R7). Remaining question: dead cards of heroes that are *dead* (respawning) clog the hand for 3 rounds; keep as is, or allow cycling them?
4. Default mage costs `Q2/E2/R5` until heroes set `SkillDef.mana`; `attackLimitCap = 6`.
5. Shared 40-card pool maxima and `DEFAULT_DECK` (2.2) are a proposal.
6. Fighter end-of-turn auto-attack is removed entirely (replaced by the cardless attack).

## Owner decisions (2026-10-30) — override anything above
1. Used skill cards go to the grave.
2. Loss conditions: a player loses when they must draw from an empty deck, or when all 7 lives are gone.
3. Mana is scaled ×10 and set per mage: +10 mana per turn (max/start per mage, default 100), skill costs are per skill and can be odd values (15, 25, ...). Costs live on each mage skill def.
4. Hard cap of 3 attacks per player per turn for ALL heroes, counting every attack (basic cards, fighter cardless attacks AND free attacks granted by skills). Remove the cap-6 / addAttackLimit idea. Fighters: the cardless attack is optional (never automatic), deals 66%, the player may stop after it.
5. Fighter cardless attack is a special button: a **Quick** action (usable in the opponent's turn / in a chain like other Quick cards), 66% damage, once per turn per fighter, counts toward the 3-attack cap. Otherwise fighters attack normally with basic attack cards (100%).
6. **Simultaneous blind summon:** in the summon phase both players pick their summons face-down at the same time, then both are revealed and placed together. Both sides summon the same number of heroes in a summon phase (no seeing the opponent summon 1 and answering with 2). Bot and server must support the hidden-then-reveal step.
7. Blind summon cap: each summon phase has one cap N for both sides (e.g. the number of lanes opened that phase). Each side may summon up to N, chosen face-down at the same time, revealed together. If one side has fewer heroes available (all on board or waiting to respawn), the other side may still summon up to N — the rule is a shared cap, not forced equality.
8. Lanes open ONE at a time: every summon phase opens exactly one new lane, so each side summons at most 1 hero per summon phase, until 5 (replaces the old 1-2-2 schedule). Put the cadence in RULES (e.g. `laneOpenEvery` rounds) so balance can tune it. Target tempo: most games end when about 4 heroes per side are on board.
9. Dead heroes STAY in their lane, shown as dead (greyed card with a respawn countdown), instead of leaving the lane. The lane stays reserved (no other hero can be summoned there). A dead hero can't be targeted, attacked, buffed or moved. After RULES.respawnRounds it respawns in that same lane with full HP. Today game.ts kill() sets lanes[side][lane] = null and respawnDue() picks homeLane or the first empty lane — change both so the slot keeps the dead unit. Anything that treats "lane occupied" must check status === "board" (e.g. "enemy in front", empty-lane checks, Darius E "if the front is empty"); a lane holding a dead hero counts as empty for targeting purposes.

## Engine implementation notes (A, final names)
- Blind summon: `phase: "blind"`, `GameState.blind = { cap, picks, ready }`; actions `{t:"summon"}` (a hidden pick) and `{t:"ready"}`; events `blindStart`, `blindLocked`; `cg.actorsOf(state)` lists who may act. Server must hide `blind.picks` of the other side.
- `GameState.turnAttacks` (active side) and `offTurnAttacks` (other side), shape `{used, cardless}`; no `bonus`, no `addAttackLimit`, no `attackLimitMod`.
- Cardless attack: `{t:"attack", cardless:true}` in own main phase, or as a chain response for the non-active side (offered by legalActions in phase "chain"). Mult 0.66.
- Free-buff attacks now count toward the 3 cap; `g.attack` inside skills and `autoAttack` do not.
- Mana x10: `RULES.mage` {manaMax 100, manaStart 100, manaRegen 10, defaultCost 20/20/50, restoreCard 30}.
- Lanes: `RULES.laneOrder` [2,1,3,0,4], `RULES.laneOpenEvery`; dead heroes keep their lane (`g.at` returns living units only, `g.laneHolder` also dead ones).

## Hero primitives (V2)
All in `packages/shared/src/cardgame/` (`types.ts` types, `game.ts` = `Game` methods, `engine.ts` rules). Hero files may use these without touching the engine.

### Statuses and stats
- `FOREVER` (types.ts, 1_000_000): pass as `g.status(u, id, 1, { until: FOREVER })` for a status that never ends (Brand Bỏng). Never use `Infinity` (JSON).
- `g.status(u, id, turns, { v, add, max, of, until, decay })`: new `decay` = at the end of the OWNER's turn `v -= decay`, removed at <= 0 (Ahri Say Mê). `StatusInst.decay`.
- Engine-known generic status ids: `"disarm"` (cannot attack: basic card, cardless, free attack, autoAttack; `g.canAttack(u)`), `"alwaysCrit"` (every attack of the holder crits, v > 0), `"noheal"` (no heal and no shield received), `"invulnerable"` (takes no damage), `"isolated"` (counts as Cô Lập), `"stealth"` (existing: not choosable by single targets / attacks), plus existing `stun silence chill shred taunt empower blind exhaust grievous ignite`.
- `g.canAttack(u): boolean` = `canAct && !disarm`.
- `g.payHp(u, n, min = 1): number` pay HP (not damage: no `onDamage`, cannot kill; emits `damage` true) (Aatrox Q).
- `g.oncePerTurn(u, key): boolean` true once per `turnNo` for (u, key) (Qiyana: key `first:<target id>`; Sterak).
- `g.setAuraMaxHp(u, key, value)` aura-style max HP bonus (Yorick, Tim Khổng Thần): adjusts `maxHp` by the change since the last call.
- `g.attacksMadeBy(u)`, `AttackInfo.nth` (1-based attack index of the attacker this turn), `g.isOffTurn(u)`.
- `g.neighbors(u): Unit[]` living adjacent allies; `g.isolated(u)`; `g.at()` returns living units only, `g.laneHolder()` also dead ones.
- Deck: `g.countInDeck(side, pred)`, `g.deckCards(side, pred?)`, `g.peekDeck(side, n)`, `g.takeFromDeck(side, uid)`, `g.putOnBottom(side, card)`, `g.moveToTop(side, pred)`, `g.moveToBottom(side, pred)` (Teemo, Twisted Fate). Mushrooms: `defineSpecialCard({ onDraw })` + `g.shuffleIn(enemySide, cards)` (existing) replace the draw.
- Grave: `g.graveCards(side, pred?)`, `g.fromGrave(side, uid)` (grave to hand, burns if hand full) (Yorick E, Katarina).
- `g.drawCount(side)` = `RULES.drawPerTurn + Σ HeroDef.drawBonus` (used by the draw step).

### HeroDef fields (all optional)
- `modifyDamage(g, me, d: { src?, target, kind, tag, crit? }): number`: damage multiplier applied to EVERY damage event while `me` is on board (filter on `d.target`/`d.src` yourself). Covers Braum Vững, Malphite hand-size reduction, Garen, Qiyana "first hit x2" (use `g.oncePerTurn`), Janna R, Braum R aura. Must not call `g.damage`. Items have the same field.
- `bonusStats(g, me): Partial<UnitStats>`: added to `g.stats(me)` (Lux AP by mana, Yorick ATK by grave, Ornn Rèn). Must not call `g.stats/atk/ap` inside.
- `drawBonus(g, me): number` extra cards at the draw step (Twisted Fate: 1).
- `extraAttackTargets(g, me): Unit[]` extra legal attack targets, e.g. own keg token for Gangplank.
- `mana?: { max, start, regen }` (existing). `SkillDef.mana` may now be `"all"` (spend all current mana; `ctx.manaPaid` holds the amount) (Lux R). `SkillDef.discardMax` with `extra: "discard"`: discard 1..N cards (`args.discard` = uids) (Viktor Q: 3).
- `SpecialCardDef.skill?: SkillDef`: a special card that is playable like a skill (needs `card.hero` and `card.side`; create it with `temp: true` via `g.createCard`). Use it for turn-start choices: e.g. Gangplank/Ornn `onTurnStart` creates a temp "choose" card; the player plays it.

### Hooks (`HeroHooks`, items too)
- `onTurnStartAway { side }`: fired at the start of `side`'s turn for that side's heroes NOT on board (reserve or dead) (Vayne Đêm). Filter `d.side === me.side`.
- `onLethal { target, src, hpLost, over, kind, tag }`: set `target.hp > 0` (or `g.surviveWith(u, hp)`) to survive without losing a life (Renata, Giáp Thiên Thần); `g.redirectLethal(d, otherUnit): boolean` moves the lethal damage to another unit (Soraka).
- `onManaSpent`, `onTempExpired` (existing V2). `onSteal { side, from, card }` also fires for Blitz-style steals.

### Chain
- `g.chainFx().cancel = true` (Quick): the link directly below is cancelled: no effect, card still counts as used (goes to grave); event `chainCancel`. Works for cards and attacks (Janna Q, Soraka E).
- `g.chainFx().stealBy = side` together with `cancel`: the cancelled card is stolen by `side` (support card to its hand, skill card burned to its owner's grave; `onSteal` fires) (Blitz E). Existing `redirect`, `cut/cutSide`, `cutNoCc`, `reflectUnit/reflectPct` unchanged.

### Hand control
- `card.frozen = unitId`: `g.freezeCard(side, card, by)`, `g.freezeRandom(side, n, by, pred?)`, `g.thawCards(side, by?)`, `g.frozenCards(side, by?)`. Frozen cards cannot be played, chained or crafted (still burnable/stealable/discardable) and thaw automatically when the freezer dies. Events `cardFrozen`, `cardThawed`. Server must expose `frozen` on cards.
- `g.revealHand(side, until?)` (default: end of the current turn), `g.handRevealed(side)`, state `handReveal`; events `reveal` (cards), `revealEnd`. Server must send the real hand to the opponent while revealed.
- `g.stealCard(to, from, { uid?, skill?: "basic" | "burn" })`: `uid` picks the exact card (Blitz Q after a reveal), `skill: "burn"` burns a stolen skill card instead of giving a Strike card. `g.stealByUid(from, uid)`.

### Misc
- `g.execute(killer, victim)` kill now (Kẻ Thu Thập). `g.surviveWith(u, hp)`, `g.redirectLethal(d, to)` (see onLethal).
- `g.cur.uid` = uid of the card being resolved (Súng Hextech "once per target per card": `g.oncePerTurn(me, "hex:" + g.cur.uid + ":" + t.id)`).
- Reflect / damage reduction: use `HeroDef.modifyDamage` and `g.chainFx()`.

### Item primitives (ITEMS_V2 section 9)
`CardItemDef` fields (items.ts): `maxMana`, `manaRegen`, `manaCostMod` (existing V2), plus
- `adaptive: number` AD if the wearer's damage is physical, AP if magic (Guinsoo).
- `mult: Partial<UnitStats>` percent bonus on the total stat after summing (Rabadon `{ ap: 0.3 }`).
- `modifyDamage(g, me, d)` global damage multiplier while worn (Tim Băng: enemy `tag === "attack"` x0.8; Khiên Hư Vô: x1.3 on the enemy opposite the wearer).
- `shareDamage: number` (0..1): the wearer takes that share of any damage its allies receive (Lời Thề Hộ Vệ 0.25).
- `healGivenMult: number`: multiplies heal and shield given by the wearer (`g.heal/g.shield` with `src`); for armor grants call `g.givenMult(unit)`.
- `spellCritMult: number`: skill damage of the wearer crits using its crit chance, with this multiplier (Găng Bảo Thạch 1.75).
- Hooks: `onHeroStack { unit, key, n, src }` fired before `g.stack` / `g.status(..., { add })`, items may change `d.n` (Guinsoo: `d.src === me.id` then `d.n += 1`); `onBeforeStatus { unit, id, turns, v, cancel }` set `cancel = true` (Khăn Giải Thuật with `g.oncePerTurn`); `onTargeted { src, card, skill, affected, immune }` push ids to `immune` so those units ignore all damage/status from that enemy card (Mũ Thích Nghi); `onLethal` as above (Giáp Thiên Thần: `g.surviveWith(me, maxHp * 0.5)`, no life lost, counter in `u.stacks`).
- Helpers: `g.attacksMadeBy(u)` / `info.nth` (Kraken), `g.isOffTurn(u)` (Shojin), statuses `noheal` (Lời Nhắc Tử Vong), `stealth` (Áo Choàng Bóng Tối), `invulnerable` (Vương Miện), `g.execute`.
- Equip a single component and upgrade in place: playing a component card ("item") on a hero with a free slot equips it (`g.equip`, item id = component id); new action `{ t: "upgrade", side, unit, item: <uid of 2nd component>, gold: <uid> }` replaces the worn component in place by `combine(worn, card.item)` (`g.upgradeItem(u, from, to)`, event `upgrade`, hook `onEquip`). `legalActions` lists it. Hand crafting (2 Đồ + Vàng -> legend card) is unchanged.

### Not generic (hero side)
Interactive choices at turn start (Ornn ally, Gangplank real/fake keg) use a temp special card with `SpecialCardDef.skill`. Jinx E trap: a lane marker (`g.addMarker`) checked in `onSummon`.
