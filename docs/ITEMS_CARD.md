# ITEMS_CARD: đồ trong chế độ thẻ bài (bản thiết kế để code theo)

> **ĐÃ THAY THẾ bởi `docs/ITEMS_V2.md`** (nguồn chính cho 8 mảnh, 36 món, bảng ghép 8×8). Code nằm ở `packages/shared/src/cardgame/items.ts` (`CARD_ITEMS`, `CARD_RECIPES`, `cardCombine`), test ở `scripts/card_tests_items.ts`.
> Mọi nội dung bên dưới là bản V1 cũ, chỉ giữ để tham khảo lịch sử; số liệu, công thức ghép và hiệu ứng đã đổi. Phần hợp đồng kỹ thuật (mục 1) vẫn đúng ở dạng cơ bản, các trường mới (`adaptive`, `mult`, `modifyDamage`, `shareDamage`, `healGivenMult`, `spellCritMult`, `maxMana`, `manaRegen`, `manaCostMod`, hook `onHeroStack`, `onBeforeStatus`, `onTargeted`) xem `docs/ENGINE_V2_SPEC.md` mục "Item primitives".

Bản chốt cho 8 mảnh Đồ và **36 món huyền thoại** của bảng ghép 8×8 (`combine()` trong `packages/shared/src/items/registry.ts`).
Chữ nội tại (VI/EN) trong file này là bản **chép nguyên văn** vào code. Văn phong theo `docs/heroes/TEXT_STYLE.md`
(điều kiện/mục tiêu trước, rồi dấu `;` hoặc `:`, rồi hiệu ứng; từ khoá viết đúng tên trong glossary).

## 0. Luật chủ dự án áp dụng
- Không có mana, hồi chiêu, tốc đánh, di chuyển (trừ hiệu ứng đường). Mọi chỉ số/nội tại cũ về mana, hồi chiêu, tốc đánh bị bỏ hoặc đổi.
- Ghép: 2 lá Đồ + 1 lá Vàng trên tay → 1 lá đồ huyền thoại lên tay (`legend`). Đeo là 1 lượt đánh riêng lên 1 tướng mình còn ô (tối đa 3).
- Đồ đã đeo **không bao giờ tháo hay chuyển**; ở lại qua chết và hồi sinh. Bộ đếm của đồ cũng ở lại (trừ khi chữ nói "về 0").
- Nội tại chỉ dùng thứ có trên bàn: lá (rút/bỏ/đốt/tìm), đòn đánh, lá chiêu, Khiên, hồi máu, sát thương, trạng thái chung
  (Choáng, Câm Lặng, Buốt, Rã Giáp, Mù, Khiêu Khích, Vết Thương Sâu, Tàng Hình, Thiêu Đốt), mạng/lá thưởng, đường, Chuỗi Quick.
- Nội tại cộng dồn = **bộ đếm hiện trên tướng**: stack key `item:<itemId>`, có tối đa, client vẽ `n/max` trên icon món đồ.

## 1. Hợp đồng kỹ thuật (cho agent code đồ)
File mới đề xuất: `packages/shared/src/cardgame/items.ts` (đăng ký `CARD_ITEMS: Record<string, CardItemDef>`).

```ts
export interface CardItemDef {
  id: string                                   // id món (trùng packages/shared/src/items)
  stats: Partial<UnitStats>                    // chỉ số chế độ thẻ (THAY baseStats(item) trong Game.stats)
  passive: { vi: string; en: string; descVi: string; descEn: string }   // tên + chữ nội tại (mục 3)
  stack?: { max: number; start?: number; vi: string; en: string }       // bộ đếm hiện: key `item:${id}`
  /** chỉ số cộng thêm theo bộ đếm (đọc u.stacks, KHÔNG gọi g.stats bên trong) */
  bonus?(g: Game, u: Unit): Partial<UnitStats>
  /** nhân sát thương ĐI RA của tướng đeo (Game.damage, sau dmgAmp/spellAmp) */
  dmgMult?(g: Game, me: Unit, d: { target: Unit; kind: DamageKind; tag: string }): number
  /** nhân sát thương NHẬN VÀO của tướng đeo (chỉ khi src là địch) — được tiêu bộ đếm bên trong */
  takenMult?(g: Game, me: Unit, d: { src: Unit; kind: DamageKind; tag: string }): number
  /** nhân hồi máu và Khiên tướng đeo nhận (áp TRƯỚC Vết Thương Sâu) */
  healMult?: number
  /** đòn đánh của tướng đeo chọn được mọi tướng địch + vật triệu hồi (Đại Bác Liên Thanh) */
  anyTarget?: boolean
  hooks?: HeroHooks                            // cùng chữ ký hook tướng: (g, me = tướng đeo, d)
}
```
Thay đổi engine (`game.ts` / `engine.ts`), tương thích ngược:
1. `Game.stats(u)`: với mỗi id trong `u.items` cộng `CARD_ITEMS[id]?.stats ?? baseStats(getItem(id))` (mỗi bản sao cộng riêng); rồi với mỗi **id khác nhau** cộng `bonus(g,u)`; sau cùng mới nhân `itemAmp` (Kiệt Tác của Ornn nhân cả chỉ số từ bộ đếm, **không** nhân số liệu trong chữ nội tại). Bỏ dòng `manaRegen * manaRegenToAp`.
2. `Game.hook(name, d)`: sau hook tướng của unit `u`, gọi `CARD_ITEMS[id].hooks?.[name]?.(g, u, d)` cho mỗi **id khác nhau** trong `u.items` (cùng bộ lọc: unit trên sân; `onDeath` chạy cả cho nạn nhân).
3. `Game.damage`: `m *= Π dmgMult` (đồ của src) và, nếu `src` là địch, `m *= Π takenMult` (đồ của tgt); bỏ qua khi `tag === "blood"`/tự gây.
4. `Game.heal` và `Game.shield`: `amount *= Π healMult` của tướng nhận, trước Vết Thương Sâu.
5. `attackTargets(g, a, viaCard)`: tướng đeo đồ `anyTarget` lấy `g.enemies(a)` (không ép đánh Đỡ Đòn), rồi vẫn qua `tauntFilter` (Khiêu Khích, Tàng Hình).
6. **Độc nhất:** nội tại chỉ chạy 1 lần cho mỗi id dù đeo 2 bản; 2 bản chỉ cộng chỉ số.
7. **Một lần mỗi lượt:** lưu `u.stacks["itemT:<id>"] = g.s.turnNo` khi dùng; đã bằng turnNo hiện tại thì bỏ qua. Client chỉ vẽ key bắt đầu bằng `item:` (key `itemT:` là cờ kỹ thuật, không phải bộ đếm).
8. Rút bài do đồ: `g.draw(side, n, { reason: "item", by: me.id })`. Lá tạo ra: `g.giveCard(side, g.supportCard(...), "hand")`.
9. Bộ đếm có `start`: đặt bằng `start` trong `onEquip` (nếu chữ nói "hồi lại khi hồi sinh" thì đặt lại trong `onRespawn`).
10. Lá `legend` trên tay và tooltip icon món: dòng chỉ số (mục 2) + tên nội tại + chữ nội tại; có bộ đếm thì thêm `n/max`.
11. Công thức `{…}` trong chữ nội tại tính theo **tướng đeo** (`g.f(me, expr)`); phần theo mục tiêu viết bằng chữ. EN dùng token `max HP`, `bonus HP`, `Armor`, `MR`, `AD`, `AP`.

Tên chỉ số hiển thị chế độ thẻ: `extraAtk` = "% sát thương đòn đánh" / "% attack damage" (không còn là tốc đánh: engine đã nhân thẳng vào đòn đánh).

## 2. Tám mảnh Đồ (chỉ là nguyên liệu ghép, không đeo riêng)
Chỉ số mảnh chỉ dùng để cộng ra chỉ số món huyền thoại. Lá Đồ trên tay có chữ: VI "Nguyên liệu: 2 Đồ + 1 Vàng ghép thành 1 lá đồ huyền thoại." EN "Component: 2 Components + 1 Gold craft 1 legendary item card."

| id | VI | EN | Góp chỉ số (chế độ thẻ) | Bản sắc khi ghép | Thay đổi so với bản cũ |
|---|---|---|---|---|---|
| kiem_dai | Kiếm Dài | Long Sword | +20 AD (`atk: 20`) | đòn đánh, kết liễu | giữ |
| gay_qua_kho | Gậy Quá Khổ | Needlessly Large Rod | +25 AP (`ap: 25`) | chiêu | giữ |
| cung_go | Cung Gỗ | Recurve Bow | +15% sát thương đòn đánh (`extraAtk: 0.15`) | hiệu ứng khi đánh trúng | đổi tên: hết là tốc đánh |
| gang_tay | Găng Tay Đấu Tập | Cloak of Agility | chí mạng; món ghép có chí mạng = 33,3% (`crit: 1/3`) | chí mạng → giá trị bài | giữ |
| giap_luoi | Giáp Lưới | Chain Vest | +20 Giáp (`armor: 20`) | phản đòn, Khiên | giữ |
| ao_choang | Áo Choàng Phủ Phép | Negatron Cloak | +20 Kháng phép (`mr: 20`) | chống chiêu, giải khống chế | giữ |
| dai_khong_lo | Đai Khổng Lồ | Giant's Belt | +150 máu (`hp: 150`) | trụ, đường, hồi | giữ |
| nuoc_mat | Nước Mắt Nữ Thần | Tear of the Goddess | +10 AP (`ap: 10`) | **động cơ bài**: rút, lật, đếm lá đánh | bỏ `manaRegen: 5` (=6 AP ẩn), thay +10 AP |

## 3. 36 món huyền thoại

### 3.1 Bảng tổng
Cột "Chỉ số" là object `stats` chép thẳng vào `CardItemDef`. "Bộ đếm" = key `item:<id>` / max.

| # | id | VI | EN | Công thức | Chỉ số (`stats`) | Bộ đếm | Hook | Engine | Hợp với |
|---|---|---|---|---|---|---|---|---|---|
| 1 | kiem_tu_than | Kiếm Tử Thần | Death's Dance | Kiếm+Kiếm | `atk:40, atkMult:0.05` | Thu Hoạch /4 | onKill, bonus | scaling | darius, katarina, jinx, khazix |
| 2 | sung_hextech | Súng Hextech | Hextech Gunblade | Kiếm+Gậy | `atk:20, ap:25, omnivamp:0.1` | – | onDamage (1/lượt) | marks (Buốt) | lissandra, ashe, katarina, ahri |
| 3 | loi_nhac_tu_vong | Lời Nhắc Tử Vong | Mortal Reminder | Kiếm+Cung | `atk:20, lethality:10, extraAtk:0.15` | – | onAttackHit | marks (chống hồi) | vayne, ashe, darius, garen (vs soraka, aatrox, nami) |
| 4 | vo_cuc_kiem | Vô Cực Kiếm | Infinity Edge | Kiếm+Găng | `atk:20, crit:1/3, critDmg:0.5` | – | onCrit (1/lượt) | draw | nami, jinx, vayne, kogmaw |
| 5 | ao_choang_bong_toi | Áo Choàng Bóng Tối | Edge of Night | Kiếm+Giáp | `atk:20, armor:20, lethality:8` | Màn Đêm /1 | onDamage, onEquip, onRespawn | lanes (Tàng Hình) | zed, khazix, katarina, qiyana |
| 6 | huyet_kiem | Huyết Kiếm | Bloodthirster | Kiếm+Áo | `atk:20, atkMult:0.1, mr:20, lifesteal:0.2` | – | onAttackHit | scaling (máu) | jinx, vayne, kogmaw, darius |
| 7 | sterak | Móng Vuốt Sterak | Sterak's Gage | Kiếm+Đai | `atk:20, hp:150, armor:10` | Thịnh Nộ /1 | onDamage, bonus | scaling | darius, garen, yorick, gangplank, aatrox |
| 8 | giao_shojin | Ngọn Giáo Shojin | Spear of Shojin | Kiếm+Nước Mắt | `atk:20, ap:10, spellAmp:0.1` | – | onAttackHit (1/lượt) | draw | darius, garen, yorick, aatrox, gangplank |
| 9 | mu_rabadon | Mũ Phù Thủy Rabadon | Rabadon's Deathcap | Gậy+Gậy | `ap:50, spellAmp:0.15` | Ma Lực /5 | onCast, bonus | scaling | viktor, lux, brand, annie, ahri |
| 10 | cuong_dao | Cuồng Đao Guinsoo | Guinsoo's Rageblade | Gậy+Cung | `ap:25, extraAtk:0.15` | Cuồng Nộ /5 | onAttackHit, bonus | scaling | teemo, kogmaw, vayne, jinx |
| 11 | gang_bao_thach | Găng Bảo Thạch | Stormsurge | Gậy+Găng | `ap:25, crit:1/3, critDmg:0.25` | – | dmgMult | – | twistedfate, annie, lux, gangplank |
| 12 | vuong_mien | Vương Miện Bảo Hộ | Zhonya's Hourglass | Gậy+Giáp | `ap:25, armor:20` | – | onTurnStart | – | malphite, braum, lissandra, annie |
| 13 | quy_thu | Quỷ Thư Morello | Morellonomicon | Gậy+Áo | `ap:25, mr:20, magicPen:10, spellAmp:0.1` | – | onDamage | marks (chống hồi) | brand, lux, viktor (vs soraka, aatrox, nami) |
| 14 | mat_na_liandry | Mặt Nạ Liandry | Liandry's Torment | Gậy+Đai | `ap:25, hp:150, spellAmp:0.05` | – | onDamage | marks (Thiêu Đốt) | brand, viktor, lux, ahri |
| 15 | truong_truong_sinh | Trượng Trường Sinh | Archangel's Staff | Gậy+Nước Mắt | `ap:35, spellAmp:0.1` | Tích Tụ /10 | onDraw, bonus | draw, scaling | nami, twistedfate, viktor, ornn, soraka |
| 16 | dai_bac | Đại Bác Liên Thanh | Rapid Firecannon | Cung+Cung | `extraAtk:0.3` | – | anyTarget | tokens, lanes | garen, darius, zed, blitzcrank (vs annie, yorick, gangplank) |
| 17 | diet_khong_lo | Diệt Khổng Lồ | Lord Dominik's Regards | Cung+Găng | `lethality:10, crit:1/3, extraAtk:0.15, dmgAmp:0.05` | – | dmgMult | – | vayne, kogmaw, jinx, khazix |
| 18 | y_chi_titan | Ý Chí Titan | Titanic Hydra | Cung+Giáp | `armor:20, extraAtk:0.15` | – | onAttackHit | lanes | garen, darius, leona, aatrox |
| 19 | cung_runaan | Cuồng Cung Runaan | Runaan's Hurricane | Cung+Áo | `mr:20, extraAtk:0.15` | – | onAttackHit | – | jinx, ashe, kogmaw, vayne |
| 20 | nanh_nashor | Nanh Nashor | Nashor's Tooth | Cung+Đai | `hp:150, extraAtk:0.15` | – | onCast | – | kogmaw, teemo, katarina, annie |
| 21 | dao_dien | Dao Điện Statikk | Statikk Shiv | Cung+Nước Mắt | `ap:10, extraAtk:0.15` | Tích Điện /5 | onPlay, onAttackHit | draw | nami, twistedfate, jinx, kogmaw |
| 22 | gang_dao_tac | Găng Đạo Tặc | Essence Reaver | Găng+Găng | `crit:1/3, dmgAmp:0.1` | – | onCrit (1/lượt) | items | ornn, gangplank, jinx, garen |
| 23 | giap_thien_than | Giáp Thiên Thần | Guardian Angel | Găng+Giáp | `armor:20, crit:1/3` | Thiên Hộ /1 | onLethal, onEquip | prizes (giữ mạng) | jinx, vayne, zed, khazix |
| 24 | khan_giai_thuat | Khăn Giải Thuật | Quicksilver Sash | Găng+Áo | `mr:40, crit:1/3` | Kháng Cự /2 | onTurnStart, onEquip | chain (chống khoá) | jinx, vayne, viktor, darius |
| 25 | tim_bang | Tim Băng | Frozen Heart | Găng+Đai | `hp:150, armor:15, crit:1/3` | – | onAttackHit (bị đánh) | marks (Buốt) | lissandra, ashe, braum, leona |
| 26 | ban_tay_cong_ly | Bàn Tay Công Lý | Blade of The Ruined King | Găng+Nước Mắt | `ap:10, crit:1/3, lifesteal:0.1, dmgAmp:0.12` | – | onAttack | – | vayne, kogmaw, jinx, zed |
| 27 | ao_choang_gai | Áo Choàng Gai | Thornmail | Giáp+Giáp | `armor:55` | – | onAttackHit (bị đánh) | marks (chống hồi) | malphite, leona, braum, blitzcrank |
| 28 | giap_gargoyle | Giáp Gargoyle | Jak'Sho, The Protean | Giáp+Áo | `armor:30, mr:30` | Thạch Giáp /5 | onDamage, onDeath, bonus | scaling | braum, blitzcrank, leona, ornn |
| 29 | ao_choang_lua | Áo Choàng Lửa | Sunfire Aegis | Giáp+Đai | `hp:150, armor:20` | – | onTurnStart | lanes | leona, malphite, garen, ornn |
| 30 | loi_the_ho_ve | Lời Thề Hộ Vệ | Knight's Vow | Giáp+Nước Mắt | `armor:20, ap:10` | – | onTurnStart | lanes (Khiêu Khích) | braum, leona, blitzcrank, malphite |
| 31 | vuot_rong | Vuốt Rồng | Spirit Visage | Áo+Áo | `mr:55` | – | healMult | recycle | aatrox, soraka, nami, janna, renata |
| 32 | khien_hu_vo | Khiên Hư Vô | Abyssal Mask | Áo+Đai | `hp:150, mr:35` | – | onTurnStart | marks (Rã Giáp) | kogmaw, leona, malphite, braum |
| 33 | mu_thich_nghi | Mũ Thích Nghi | Banshee's Veil | Áo+Nước Mắt | `armor:15, mr:35, ap:10` | Màn Chắn /1 | takenMult, onTurnStart, onEquip | chain | viktor, lux, twistedfate, jinx |
| 34 | giap_warmog | Giáp Máu Warmog | Warmog's Armor | Đai+Đai | `hp:300` | – | onTurnStart | scaling (máu) | aatrox, garen, yorick, braum |
| 35 | day_chuyen_chuoc_toi | Dây Chuyền Chuộc Tội | Redemption | Đai+Nước Mắt | `hp:150, ap:10` | – | onDeath | recycle | soraka, kogmaw, renata, janna |
| 36 | bua_lam | Bùa Lam | Winter's Approach | Nước Mắt+Nước Mắt | `ap:20, spellAmp:0.1` | Liên Hoàn /2 | onCast, onTurnEnd | draw | viktor, lux, brand, ahri, braum |

(`crit:1/3` = `CRIT_PER_ITEM`, đúng như `recipeStats` hiện tại: 3 món chí mạng = 100%.)

### 3.2 Chi tiết từng món (chữ chép nguyên văn)
Mỗi mục: tên nội tại VI / EN · chữ VI · chữ EN · số liệu và cách code · ý cân bằng.

**1. Kiếm Tử Thần (kiem_tu_than)** · nội tại **Thu Hoạch / Harvest**
- VI: `Khi tướng đeo hạ gục 1 tướng địch: +1 Thu Hoạch (tối đa 4). Tướng đeo +5 AD mỗi Thu Hoạch.`
- EN: `When the equipped champion takes down an enemy champion: +1 Harvest (max 4). The equipped champion gains +5 AD per Harvest.`
- Code: `onKill` (killer = me, victim là tướng địch, không phải token) → `g.stack(me,"item:kiem_tu_than",1,4)`; `bonus = { atk: 5 * n }`. Bộ đếm giữ qua chết.
- Cân bằng: thưởng chuỗi hạ gục, tối đa +20 AD; mạnh muộn, vô dụng nếu không giết được ai.

**2. Súng Hextech (sung_hextech)** · nội tại **Đạn Hextech / Hextech Shot**
- VI: `Một lần mỗi lượt: khi chiêu của tướng đeo gây sát thương lên 1 tướng địch, tướng đó bị Buốt tới hết lượt kế tiếp.`
- EN: `Once per turn: when a skill of the equipped champion damages an enemy champion, that champion is Chilled until the end of the next turn.`
- Code: `onDamage` (src = me, `tag === "skill"`, target là tướng địch còn trên sân, amount > 0), cờ `itemT:` 1/lượt → `g.status(t, "chill", 1, { until: g.s.turnNo + 1 })`.
- Cân bằng: tướng lai (AD+AP + hút máu mọi nguồn) mở khoá điều kiện Buốt cho Lissandra E/R, Ashe nội tại; chỉ 1 mục tiêu mỗi lượt.

**3. Lời Nhắc Tử Vong (loi_nhac_tu_vong)** · nội tại **Vết Thương / Mortal Wound**
- VI: `Khi đòn đánh của tướng đeo trúng 1 tướng địch: tướng đó bị Vết Thương Sâu 2 lượt.`
- EN: `When an attack of the equipped champion hits an enemy champion: that champion suffers Grievous Wounds for 2 turns.`
- Code: `onAttackHit` (attacker = me, `!info.miss`, target không phải token) → `g.status(t, "grievous", 2)`.
- Cân bằng: lời đáp cho hồi máu (Soraka, Aatrox E, Nami) bằng đòn đánh; không tự tăng sát thương ngoài chỉ số.

**4. Vô Cực Kiếm (vo_cuc_kiem)** · nội tại **Vô Cực / Infinity**
- VI: `Một lần mỗi lượt: khi đòn đánh của tướng đeo chí mạng, bạn rút 1 lá.`
- EN: `Once per turn: when an attack of the equipped champion crits, draw 1 card.`
- Code: `onCrit` (attacker = me), cờ `itemT:` → `g.draw(me.side, 1, { reason: "item", by: me.id })`.
- Cân bằng: biến chí mạng thành bài (động cơ draw), 1 lá/lượt; cộng với Phước Lành của Nami (chí mạng rút thêm) là combo rõ ràng.

**5. Áo Choàng Bóng Tối (ao_choang_bong_toi)** · nội tại **Màn Đêm / Nightfall** · bộ đếm `item:ao_choang_bong_toi` /1, start 1
- VI: `Khi tướng đeo nhận sát thương từ địch khiến máu xuống dưới 50% và có Màn Đêm: tiêu Màn Đêm; tướng đeo Tàng Hình tới hết lượt kế tiếp của đối thủ và nhận Khiên {15% máu tối đa}. Màn Đêm hồi lại khi tướng đeo hồi sinh.`
- EN: `When enemy damage drops the equipped champion below 50% HP while it has Nightfall: spend Nightfall; the equipped champion gains Stealth until the end of the opponent's next turn and a Shield of {15% max HP}. Nightfall is restored when the equipped champion respawns.`
- Code: `onDamage` (target = me, src địch, hp > 0, hp < 50% maxHp, bộ đếm = 1) → set 0, `g.status(me,"stealth",1,{of: otherSide(me.side)})`, `g.shield(me, me, g.f(me,"15% máu tối đa"))`. `onEquip`/`onRespawn` → set 1.
- Cân bằng: sát thủ sống sót sau khi lao vào; 1 lần mỗi mạng, chiêu "mọi tướng địch" vẫn trúng.

**6. Huyết Kiếm (huyet_kiem)** · nội tại **Lá Chắn Máu / Blood Shield**
- VI: `Khi đòn đánh của tướng đeo trúng 1 tướng mà tướng đeo đang đầy máu: tướng đeo nhận Khiên bằng 25% sát thương vừa gây (Khiên của nó không vượt quá {20% máu tối đa} theo cách này).`
- EN: `When an attack of the equipped champion hits while the equipped champion is at full HP: it gains a Shield equal to 25% of the damage dealt (its Shield can't exceed {20% max HP} this way).`
- Code: `onAttackHit` (attacker = me, `!info.miss`, `me.hp >= me.maxHp` sau hút máu) → `add = min(0.25*dealt, cap - me.shield)`, `cap = g.f(me,"20% máu tối đa")`; add > 0 thì `g.shield(me, me, add)`.
- Cân bằng: hút máu đầy thì thành Khiên, xạ thủ đứng xa thêm 1 lớp đệm; trần Khiên chặn cộng dồn vô hạn.

**7. Móng Vuốt Sterak (sterak)** · nội tại **Thịnh Nộ / Fury** · bộ đếm `item:sterak` /1, start 0
- VI: `Khi máu tướng đeo xuống dưới 50% lần đầu: +1 Thịnh Nộ và tướng đeo nhận Khiên {20% máu tối đa}. Khi có Thịnh Nộ: tướng đeo +20% AD.`
- EN: `The first time the equipped champion drops below 50% HP: +1 Fury and it gains a Shield of {20% max HP}. While it has Fury: the equipped champion gains +20% AD.`
- Code: `onDamage` (target = me, hp > 0, hp < 50%, bộ đếm 0) → set 1 + Khiên; `bonus = { atkMult: 0.2 * n }`. Chỉ 1 lần mỗi trận (Thịnh Nộ ở lại vĩnh viễn). Máu tự trả (`payHp` của Aatrox) không phát hook nên không kích hoạt.
- Cân bằng: đấu sĩ lật ngược khi bị dồn; tối đa +20% AD một lần trong trận.

**8. Ngọn Giáo Shojin (giao_shojin)** · nội tại **Nhịp Giáo / Spear Rhythm**
- VI: `Một lần mỗi lượt: khi đòn đánh của tướng đeo trúng 1 tướng địch, lật lá trên cùng bộ bài của bạn; nếu đó là lá chiêu của tướng đeo, rút lá đó.`
- EN: `Once per turn: when an attack of the equipped champion hits an enemy champion, reveal the top card of your deck; if it is a skill card of the equipped champion, draw it.`
- Code: `onAttackHit` (attacker = me, `!info.miss`, target tướng địch), cờ `itemT:`. `top = deck[0]`; emit `{t:"reveal", side, to: otherSide(side), cards:[top]}`; `top.kind==="skill" && top.hero===me.hero` → `g.draw(side,1,{reason:"item",by:me.id})`. Bộ trống: không gì.
- Cân bằng: đấu sĩ tự đánh cuối lượt thành nguồn lá chiêu; thông tin công khai cho đối thủ (lá trên cùng bị lộ).

**9. Mũ Phù Thủy Rabadon (mu_rabadon)** · nội tại **Ma Lực / Overflow** · bộ đếm `item:mu_rabadon` /5
- VI: `Khi tướng đeo dùng 1 lá chiêu: +1 Ma Lực (tối đa 5). Chiêu của tướng đeo +4% sát thương mỗi Ma Lực.`
- EN: `When the equipped champion uses a skill card: +1 Overflow (max 5). The equipped champion's skills deal +4% damage per Overflow.`
- Code: `onCast` (caster = me) → stack +1 max 5; `bonus = { spellAmp: 0.04 * n }`. Giữ qua chết.
- Cân bằng: pháp sư nhiều lá chiêu (Viktor 8 Q, Lux, Brand) lớn dần tới +35% chiêu tổng; đã hạ chiêu gốc từ 25% xuống 15%.

**10. Cuồng Đao Guinsoo (cuong_dao)** · nội tại **Cuồng Nộ / Rage** · bộ đếm `item:cuong_dao` /5
- VI: `Khi đòn đánh của tướng đeo trúng: +1 Cuồng Nộ (tối đa 5). Đòn đánh của tướng đeo +6% sát thương mỗi Cuồng Nộ.`
- EN: `When an attack of the equipped champion hits: +1 Rage (max 5). The equipped champion's attacks deal +6% damage per Rage.`
- Code: `onAttackHit` (attacker = me, `!info.miss`) → stack +1 max 5; `bonus = { extraAtk: 0.06 * n }`. Giữ qua chết.
- Cân bằng: tướng đánh nhiều lần bằng chiêu hoặc đòn không cần lá của Đấu sĩ lớn dần tới +30%; vô nghĩa với tướng chỉ dùng chiêu.

**11. Găng Bảo Thạch (gang_bao_thach)** · nội tại **Bảo Thạch / Jeweled Strike**
- VI: `Chiêu của tướng đeo có thể chí mạng: mỗi lần chiêu của nó gây sát thương, có tỉ lệ chí mạng của tướng đeo để gây ×(1,5 + sát thương chí mạng cộng thêm).`
- EN: `The equipped champion's skills can crit: each time one of its skills deals damage, it has the equipped champion's crit chance to deal ×(1.5 + bonus crit damage).`
- Code: `dmgMult` khi `tag === "skill"`: `rand < crit` → trả `RULES.critBase + stats.critDmg` và đánh `crit: true` lên sự kiện damage (không gọi onCrit: onCrit chỉ cho đòn đánh). Lá Q của Gangplank đã tự chí mạng: bỏ qua món này cho `gangplank_q` để không chí mạng 2 lần.
- Cân bằng: biến 33% chí mạng thành bạo kích chiêu; ngẫu nhiên nên không dựng combo chắc chắn.

**12. Vương Miện Bảo Hộ (vuong_mien)** · nội tại **Hộ Giá / Royal Guard**
- VI: `Đầu lượt của bạn: nếu tướng đeo không có Khiên, nó nhận Khiên {40 + 30% AP}.`
- EN: `At the start of your turn: if the equipped champion has no Shield, it gains a Shield of {40 + 30% AP}.`
- Code: `onTurnStart` (side = me.side, me.shield <= 0) → `g.shield(me, me, g.f(me,"40 + 30% AP"))`. Hook tướng chạy trước hook đồ (Malphite nội tại cho Khiên trước thì món này không chạy).
- Cân bằng: pháp sư mỏng có 1 lớp Khiên làm mới; nuôi điều kiện "đang có Khiên" của Braum Q và Malphite R.

**13. Quỷ Thư Morello (quy_thu)** · nội tại **Nguyền Rủa / Cursed Strike**
- VI: `Khi chiêu của tướng đeo gây sát thương lên 1 tướng địch: tướng đó bị Vết Thương Sâu 2 lượt.`
- EN: `When a skill of the equipped champion damages an enemy champion: that champion suffers Grievous Wounds for 2 turns.`
- Code: `onDamage` (src = me, `tag === "skill"`, target tướng địch trên sân, amount > 0) → `g.status(t,"grievous",2)`.
- Cân bằng: bản chiêu của Lời Nhắc Tử Vong; chiêu nhiều mục tiêu (Brand R, Lux E) phủ chống hồi cả đội địch.

**14. Mặt Nạ Liandry (mat_na_liandry)** · nội tại **Hoả Ngục / Torment**
- VI: `Khi chiêu của tướng đeo gây sát thương lên 1 tướng địch: tướng đó bị Thiêu Đốt 2 lượt (đầu mỗi lượt của nó mất 3% máu tối đa của nó).`
- EN: `When a skill of the equipped champion damages an enemy champion: that champion is Ignited for 2 turns (at the start of each of its turns it loses 3% of its max HP).`
- Code: `onDamage` (src = me, `tag === "skill"`, target tướng địch) → `g.status(t,"ignite",2,{ v: max(statusV(t,"ignite"), round(0.03*t.maxHp)) })` (không hạ số Thiêu Đốt mạnh hơn đang có). Không kèm Vết Thương Sâu.
- Cân bằng: khắc tướng trâu (Braum 1750, Lissandra 2010, Blitzcrank 1800); đồng bộ dấu với Brand.

**15. Trượng Trường Sinh (truong_truong_sinh)** · nội tại **Tích Tụ / Awe** · bộ đếm `item:truong_truong_sinh` /10
- VI: `Khi bạn rút 1 lá ngoài bước rút đầu lượt: +1 Tích Tụ (tối đa 10). Tướng đeo +3 AP mỗi Tích Tụ.`
- EN: `When you draw a card outside your turn's draw step: +1 Awe (max 10). The equipped champion gains +3 AP per Awe.`
- Code: `onDraw` (`d.side === me.side`, `reason` khác `"turn"` và `"opening"`) → stack +1 max 10; `bonus = { ap: 3 * n }`. Nấm (lá tự bật) không phát onDraw vào tay nên không tính.
- Cân bằng: tướng rút nhiều (Nami, TF, Viktor Q bậc 3, Ornn) biến lá thành AP, tối đa +30 AP.

**16. Đại Bác Liên Thanh (dai_bac)** · nội tại **Tầm Xa / Long Range**
- VI: `Đòn đánh của tướng đeo (lá Đánh thường hoặc đòn do chiêu kích hoạt) chọn được bất kỳ tướng địch nào, kể cả vật triệu hồi ở ô phụ (Khiêu Khích và Tàng Hình vẫn áp dụng).`
- EN: `Attacks of the equipped champion (Strike cards or skill-triggered attacks) can target any enemy champion, including the summon in the extra slot (Taunt and Stealth still apply).`
- Code: cờ `anyTarget: true` trong `attackTargets` (mục 1.5). Tự đánh cuối lượt của đấu sĩ vẫn đánh tướng đối diện (không đổi).
- Cân bằng: đội không có xạ thủ có câu trả lời cho Tibbers, Thây Ma Sương Mù, Thùng Thuốc Súng; sát thủ đeo vào thành "xạ thủ 350%" nên chỉ số đi kèm thấp (chỉ +30% sát thương đòn đánh).

**17. Diệt Khổng Lồ (diet_khong_lo)** · nội tại **Hạ Gục Khổng Lồ / Giant Slayer**
- VI: `Tướng đeo gây thêm 15% sát thương lên tướng có máu tối đa cao hơn nó.`
- EN: `The equipped champion deals 15% more damage to champions with higher max HP than it.`
- Code: `dmgMult` → `target.maxHp > me.maxHp ? 1.15 : 1` (mọi tag trừ `dot`).
- Cân bằng: khắc đội đỡ đòn; tướng mỏng máu được lợi nhiều nhất.

**18. Ý Chí Titan (y_chi_titan)** · nội tại **Sóng Chấn / Cleave**
- VI: `Khi đòn đánh của tướng đeo trúng 1 tướng địch: tướng địch ở 2 đường kề nó nhận {10 + 5% máu tối đa} sát thương vật lý.`
- EN: `When an attack of the equipped champion hits an enemy champion: enemy champions in the 2 adjacent lanes take {10 + 5% max HP} physical damage.`
- Code: `onAttackHit` (attacker = me, `!info.miss`, target không phải token) → với `l = t.lane ± 1` (0..4), `g.at(t.side,l)` trên sân: `g.damage(me, o, g.f(me,"10 + 5% máu tối đa"), "physical", {tag:"effect"})` (tag effect: không kích nổ dấu, không lặp hook).
- Cân bằng: đấu sĩ/đỡ đòn máu trâu đánh lan theo đường; phạt đội đứng thành cụm (ngược với Kha'Zix).

**19. Cuồng Cung Runaan (cung_runaan)** · nội tại **Mũi Tên Nảy / Bolts**
- VI: `Khi đòn đánh của tướng đeo trúng 1 tướng địch: 1 tướng địch khác máu thấp nhất nhận 40% sát thương đòn đó.`
- EN: `When an attack of the equipped champion hits an enemy champion: the lowest-HP other enemy champion takes 40% of that attack's damage.`
- Code: `onAttackHit` → `o = g.lowestHp(g.heroes(t.side).filter(x => x.id !== t.id))`; `g.damage(me, o, 0.4 * dealt, "true", {tag:"effect"})` (`dealt` đã qua giáp nên dùng sát thương chuẩn để không trừ giáp 2 lần).
- Cân bằng: xạ thủ dọn tướng yếu phía sau; 40% của sát thương thực, không kích hiệu ứng đánh trúng.

**20. Nanh Nashor (nanh_nashor)** · nội tại **Phép Đánh / Spellstrike**
- VI: `Khi tướng đeo dùng 1 lá chiêu: đòn đánh kế tiếp của nó gây thêm {20 + 25% AP} sát thương phép (không cộng dồn).`
- EN: `When the equipped champion uses a skill card: its next attack deals {20 + 25% AP} bonus magic damage (doesn't stack).`
- Code: `onCast` (caster = me) → bỏ buff `id: "item:nanh_nashor"` cũ trong `me.nextAttack`, push `{ id:"item:nanh_nashor", source: me.id, bonusRaw: g.f(me,"20 + 25% AP"), bonusKind:"magic" }`. onCast chạy SAU resolve nên đòn đánh nằm trong chính lá chiêu (Vayne Q, Leona Q) không ăn buff của chính nó.
- Cân bằng: xen kẽ chiêu → đòn đánh; Kog'Maw E/Teemo được lợi.

**21. Dao Điện Statikk (dao_dien)** · nội tại **Tích Điện / Energized** · bộ đếm `item:dao_dien` /5
- VI: `Khi bạn đánh 1 lá từ tay trong lượt của bạn: +1 Tích Điện (tối đa 5). Khi đòn đánh của tướng đeo trúng lúc có đủ 5 Tích Điện: tiêu hết; mục tiêu và tối đa 2 tướng địch khác máu thấp nhất nhận {40 + 30% AP} sát thương phép.`
- EN: `When you play a card from your hand during your turn: +1 Energize (max 5). When an attack of the equipped champion hits with 5 Energize: spend them all; the target and up to 2 other lowest-HP enemy champions take {40 + 30% AP} magic damage.`
- Code: `onPlay` (`d.side === me.side && g.s.active === me.side`) → stack +1 max 5. `onAttackHit` (attacker = me, `!info.miss`, n = 5) → set 0, đánh `tag:"effect"`.
- Cân bằng: thưởng lượt đánh nhiều lá (động cơ draw); không thể nổ 2 lần mỗi lượt nếu không đánh thêm lá.

**22. Găng Đạo Tặc (gang_dao_tac)** · nội tại **Móc Túi / Pickpocket**
- VI: `Một lần mỗi lượt: khi đòn đánh của tướng đeo chí mạng, tạo 1 lá Đồ (mảnh ngẫu nhiên) lên tay bạn.`
- EN: `Once per turn: when an attack of the equipped champion crits, create 1 Component card (random) in your hand.`
- Code: `onCrit` (attacker = me), cờ `itemT:` → `g.giveCard(me.side, g.supportCard("item"), "hand")`.
- Cân bằng: chí mạng nuôi lò rèn (Ornn Q/E, Gangplank đồ, Jinx tên lửa theo đồ); vẫn cần Vàng để ghép.

**23. Giáp Thiên Thần (giap_thien_than)** · nội tại **Thiên Hộ / Rebirth** · bộ đếm `item:giap_thien_than` /1, start 1
- VI: `Khi tướng đeo sắp bị hạ và có Thiên Hộ: tiêu Thiên Hộ; nó không bị hạ mà còn {30% máu tối đa} máu.`
- EN: `When the equipped champion would be taken down while it has Rebirth: spend Rebirth; it is not taken down and is left at {30% max HP} HP instead.`
- Code: `onLethal` (target = me, `me.hp <= 0` sau hook tướng: Cứu Trợ của Renata chạy trước và giữ máu 1 thì món này không tiêu), bộ đếm 1 → set 0, `me.hp = max(1, round(g.f(me,"30% máu tối đa")))`. `onEquip` → set 1. Một lần mỗi trận (không hồi khi hồi sinh).
- Cân bằng: giữ 1 mạng cho tướng gánh (giữ lá thưởng của đối thủ úp); đắt 1 ô đồ, lộ rõ trên icon (1/1) để đối thủ tính.

**24. Khăn Giải Thuật (khan_giai_thuat)** · nội tại **Kháng Cự / Resolve** · bộ đếm `item:khan_giai_thuat` /2, start 1
- VI: `Đầu lượt của bạn: +1 Kháng Cự (tối đa 2). Rồi nếu có đủ 2 Kháng Cự và tướng đeo đang bị Choáng, Câm Lặng, Buốt hoặc Mù: tiêu hết Kháng Cự; gỡ các trạng thái đó khỏi tướng đeo.`
- EN: `At the start of your turn: +1 Resolve (max 2). Then if it has 2 Resolve and the equipped champion is Stunned, Silenced, Chilled or Blinded: spend all Resolve; remove those statuses from the equipped champion.`
- Code: `onTurnStart` (side = me.side) → stack +1 max 2; n = 2 và có `stun|silence|chill|blind` → set 0, `g.removeStatus` từng cái. `onEquip` → set 1.
- Cân bằng: gỡ khống chế tối đa mỗi 2 lượt của bạn; khắc Leona/Malphite/Lissandra nhưng khoá lại được nếu bị Choáng liên tục.

**25. Tim Băng (tim_bang)** · nội tại **Băng Giá / Frost Aura**
- VI: `Khi tướng đeo bị đòn đánh của địch trúng: kẻ đánh bị Buốt tới hết lượt kế tiếp.`
- EN: `When the equipped champion is hit by an enemy attack: the attacker is Chilled until the end of the next turn.`
- Code: `onAttackHit` (target = me, attacker địch, `!info.miss`, attacker không phải token) → `g.status(a,"chill",1,{ until: g.s.turnNo + 1 })` (Buốt kéo sang lượt của bạn).
- Cân bằng: đỡ đòn/đấu sĩ phạt kẻ đánh tay, mở điều kiện Buốt cho Lissandra và Ashe.

**26. Bàn Tay Công Lý (ban_tay_cong_ly)** · nội tại **Vết Cắt Hắc Hoá / Mist's Edge**
- VI: `Đòn đánh của tướng đeo gây thêm sát thương vật lý bằng 6% máu hiện tại của mục tiêu.`
- EN: `Attacks of the equipped champion deal bonus physical damage equal to 6% of the target's current HP.`
- Code: `onAttack` (attacker = me) → `info.bonus.push({ raw: 0.06 * target.hp, kind: "physical" })` (đòn trượt thì engine bỏ qua; chí mạng nhân cả phần này như mọi bonus).
- Cân bằng: mạnh đầu giao tranh với mục tiêu đầy máu; cùng nhóm "săn tank" với Vayne, Kog'Maw.

**27. Áo Choàng Gai (ao_choang_gai)** · nội tại **Gai Nhọn / Thorns**
- VI: `Khi tướng đeo bị đòn đánh của địch trúng: kẻ đánh nhận {20 + 25% Giáp} sát thương phép và bị Vết Thương Sâu 1 lượt.`
- EN: `When the equipped champion is hit by an enemy attack: the attacker takes {20 + 25% Armor} magic damage and suffers Grievous Wounds for 1 turn.`
- Code: `onAttackHit` (target = me, attacker địch, `!info.miss`) → `g.damage(me, a, g.f(me,"20 + 25% Giáp"), "magic", {tag:"effect"})`, `g.status(a,"grievous",1)`.
- Cân bằng: đỡ đòn khắc xạ thủ hút máu và đấu sĩ tự đánh; số liệu theo Giáp nên Malphite dùng tốt nhất.

**28. Giáp Gargoyle (giap_gargoyle)** · nội tại **Thạch Giáp / Stoneplate** · bộ đếm `item:giap_gargoyle` /5
- VI: `Khi tướng đeo nhận sát thương từ chiêu hoặc đòn đánh của địch: +1 Thạch Giáp (tối đa 5). Tướng đeo +4 giáp và kháng phép mỗi Thạch Giáp. Khi tướng đeo bị hạ: Thạch Giáp về 0.`
- EN: `When the equipped champion takes damage from an enemy skill or attack: +1 Stoneplate (max 5). The equipped champion gains +4 Armor and MR per Stoneplate. When the equipped champion is taken down: Stoneplate resets to 0.`
- Code: `onDamage` (target = me, src địch, tag `skill|attack`, amount > 0) → +1 max 5; `onDeath` (victim = me) → set 0; `bonus = { armor: 4n, mr: 4n }`. Chỉ số gốc hạ từ 40/40 xuống 30/30.
- Cân bằng: đỡ đòn càng bị đánh càng cứng (tối đa 50/50); đối thủ trả lời bằng sát thương chuẩn hoặc hạ gục để xoá.

**29. Áo Choàng Lửa (ao_choang_lua)** · nội tại **Hoả Lan / Immolate**
- VI: `Đầu lượt của bạn: tướng địch đối diện tướng đeo và tướng địch ở 2 đường kề đó nhận {25 + 10% máu cộng thêm} sát thương phép.`
- EN: `At the start of your turn: the enemy champion opposite the equipped champion and the enemy champions in the 2 adjacent lanes take {25 + 10% bonus HP} magic damage.`
- Code: `onTurnStart` (side = me.side, me trên sân) → lane `me.lane - 1..me.lane + 1`, `g.at(otherSide(me.side), l)` → `g.damage(me, o, g.f(me,"25 + 10% máu cộng thêm"), "magic", {tag:"dot"})`.
- Cân bằng: đỡ đòn đứng giữa gây sát thương đều theo đường; tag dot nên không kích dấu.

**30. Lời Thề Hộ Vệ (loi_the_ho_ve)** · nội tại **Thề Bảo Vệ / Sworn Guard**
- VI: `Đầu lượt của bạn: nếu 1 tướng mình khác dưới 40% máu, tướng đeo Khiêu Khích tới hết lượt kế tiếp của đối thủ và nhận Khiên {40 + 5% máu tối đa}.`
- EN: `At the start of your turn: if another allied champion is below 40% HP, the equipped champion Taunts until the end of the opponent's next turn and gains a Shield of {40 + 5% max HP}.`
- Code: `onTurnStart` (side = me.side) → `g.heroes(me.side).some(u => u.id !== me.id && hpPct(u) < 0.4)` → `g.status(me,"taunt",1,{of: otherSide(me.side)})`, Khiên.
- Cân bằng: đỡ đòn hút mọi lá đơn mục tiêu khỏi đồng đội sắp chết; đối thủ trả lời bằng chiêu "mọi tướng địch" hoặc đợi Khiêu Khích hết.

**31. Vuốt Rồng (vuot_rong)** · nội tại **Sinh Lực Rồng / Boundless Vitality**
- VI: `Hồi máu và Khiên tướng đeo nhận +25%.`
- EN: `Healing and Shields the equipped champion receives are increased by 25%.`
- Code: `healMult: 1.25` (áp trong `heal` và `shield`, trước Vết Thương Sâu).
- Cân bằng: tăng giá trị mọi nguồn hồi (Soraka, Nami, Janna, Aatrox E, phép bổ trợ); vô dụng nếu đội không có hồi.

**32. Khiên Hư Vô (khien_hu_vo)** · nội tại **Vực Thẳm / Abyss**
- VI: `Đầu lượt của bạn: tướng địch đối diện tướng đeo bị Rã Giáp tới hết lượt kế tiếp của nó.`
- EN: `At the start of your turn: the enemy champion opposite the equipped champion is Armor Shredded until the end of its next turn.`
- Code: `onTurnStart` (side = me.side) → `o = g.opposite(me)` → `g.status(o, "shred", 1)` (thời hạn theo phe của o: hết lượt kế tiếp của nó).
- Cân bằng: đỡ đòn dọn đường cho đồng đội (Kog'Maw ưu tiên tướng Rã Giáp); phụ thuộc vị trí đường.

**33. Mũ Thích Nghi (mu_thich_nghi)** · nội tại **Màn Chắn / Spell Shield** · bộ đếm `item:mu_thich_nghi` /1, start 1
- VI: `Khi chiêu của địch sắp gây sát thương lên tướng đeo lúc nó có Màn Chắn: tiêu Màn Chắn; lần sát thương đó thành 0. Đầu lượt của bạn: Màn Chắn hồi về 1.`
- EN: `When an enemy skill would damage the equipped champion while it has Spell Shield: spend Spell Shield; that damage becomes 0. At the start of your turn: Spell Shield is restored to 1.`
- Code: `takenMult` (src địch, `tag === "skill"`, n = 1) → set 0, trả 0. `onTurnStart` (side = me.side) và `onEquip` → set 1. Chỉ chặn sát thương, không chặn khống chế; chiêu đánh nhiều lần chỉ chặn lần đầu.
- Cân bằng: mỗi vòng đối thủ phải "tiêu" 1 lá chiêu rẻ trước đòn lớn; Lux R, Brand R trúng nhiều tướng vẫn chỉ mất 1 phần.

**34. Giáp Máu Warmog (giap_warmog)** · nội tại **Tái Sinh / Regeneration**
- VI: `Đầu lượt của bạn: tướng đeo hồi {5% máu tối đa}; nếu nó dưới 50% máu, hồi {10% máu tối đa} thay vào đó.`
- EN: `At the start of your turn: the equipped champion heals {5% max HP}; if it is below 50% HP, it heals {10% max HP} instead.`
- Code: `onTurnStart` (side = me.side, me trên sân) → `g.heal(me, me, ...)`.
- Cân bằng: máu là tài nguyên (Aatrox trả máu, Garen dồn), +300 máu thô; bị Vết Thương Sâu khắc.

**35. Dây Chuyền Chuộc Tội (day_chuyen_chuoc_toi)** · nội tại **Chuộc Tội / Redemption**
- VI: `Khi 1 tướng mình bị hạ (kể cả tướng đeo): xáo 2 lá trên cùng mộ bài của bạn vào bộ bài, rồi mọi tướng mình trên sân hồi {40 + 5% máu tối đa}.`
- EN: `When an allied champion is taken down (including the equipped champion): shuffle the top 2 cards of your graveyard into your deck, then every allied champion on the board heals {40 + 5% max HP}.`
- Code: `onDeath` (victim.side === me.side, victim không phải token; chạy cả khi me là nạn nhân) → `cards = grave.splice(-2)`, `g.shuffleIn(side, cards)`, rồi hồi `g.heroes(me.side)`.
- Cân bằng: chống cạn bài và giữ đội đứng sau mỗi lần mất mạng (Kog'Maw muốn chết, Soraka tái chế); ngược hướng với Viktor/Yorick (lấy lá khỏi mộ).

**36. Bùa Lam (bua_lam)** · nội tại **Liên Hoàn / Flow** · bộ đếm `item:bua_lam` /2
- VI: `Khi tướng đeo dùng 1 lá chiêu: +1 Liên Hoàn (tối đa 2); vừa đạt 2 thì bạn rút 1 lá. Cuối mỗi lượt: Liên Hoàn về 0.`
- EN: `When the equipped champion uses a skill card: +1 Flow (max 2); when it reaches 2, draw 1 card. At the end of each turn: Flow resets to 0.`
- Code: `onCast` (caster = me) → n < 2 thì +1, vừa thành 2 thì `g.draw(side,1,{reason:"item",by:me.id})`; `onTurnEnd` (mọi phe) → set 0. Tối đa 1 lá mỗi lượt (Braum nối chuỗi trong lượt địch cũng tính lượt đó).
- Cân bằng: thưởng lượt dùng 2 chiêu cùng tướng; pháp sư nhiều lá chiêu hoàn vốn 1 lá.

## 4. Phân bố bản sắc (kiểm tra độ phủ engine)
| Engine | Món |
|---|---|
| draw | Vô Cực Kiếm, Ngọn Giáo Shojin, Trượng Trường Sinh, Dao Điện Statikk, Bùa Lam |
| items / rèn | Găng Đạo Tặc (+ mọi món là "đạn" cho Jinx Q/R, Gangplank, Garen) |
| marks / trạng thái | Súng Hextech, Tim Băng (Buốt) · Lời Nhắc Tử Vong, Quỷ Thư, Áo Choàng Gai (Vết Thương Sâu) · Mặt Nạ Liandry (Thiêu Đốt) · Khiên Hư Vô (Rã Giáp) |
| tokens | Đại Bác Liên Thanh |
| chain | Mũ Thích Nghi, Khăn Giải Thuật |
| lanes | Áo Choàng Bóng Tối (Tàng Hình), Ý Chí Titan, Áo Choàng Lửa, Lời Thề Hộ Vệ (Khiêu Khích) |
| prizes / mạng | Giáp Thiên Thần |
| recycle | Dây Chuyền Chuộc Tội, Vuốt Rồng |
| scaling | Kiếm Tử Thần, Móng Vuốt Sterak, Mũ Rabadon, Cuồng Đao, Trượng Trường Sinh, Giáp Gargoyle, Giáp Máu Warmog |
| thuần chỉ số + 1 điều kiện | Diệt Khổng Lồ, Bàn Tay Công Lý, Cuồng Cung Runaan, Nanh Nashor, Găng Bảo Thạch, Vương Miện, Huyết Kiếm |

Bộ đếm hiện trên icon (12 món): Kiếm Tử Thần 4, Áo Choàng Bóng Tối 1, Sterak 1, Rabadon 5, Cuồng Đao 5, Trượng Trường Sinh 10, Dao Điện 5, Giáp Thiên Thần 1, Khăn Giải Thuật 2, Gargoyle 5, Mũ Thích Nghi 1, Bùa Lam 2 (Áo Choàng Bóng Tối, Giáp Thiên Thần, Mũ Thích Nghi là bộ đếm "sẵn sàng" 1/1).

## 5. Việc cho agent code đồ (checklist)
1. Tạo `cardgame/items.ts` + đăng ký 36 `CardItemDef` theo mục 3 (stats, chữ VI/EN, bộ đếm, hook).
2. Sửa `Game.stats / hook / damage / heal / shield` và `attackTargets` theo mục 1.
3. `cardInfo`/`cardInfoL` của lá `legend` và tooltip icon: chỉ số + nội tại + `n/max`; EN tên món lấy `LOL_EN`, tên nội tại lấy `passive.en`.
4. `STAT_NAMES`/`STAT_EN` chế độ thẻ: `extraAtk` hiển thị "% sát thương đòn đánh" / "% attack damage"; bỏ dòng mana.
5. Selfplay `npx tsx scripts/card_selfplay.ts 1000 5 1 --jobs=25` trước/sau để chắc không món nào làm lệch tỉ lệ thắng tướng quá ±5%.
