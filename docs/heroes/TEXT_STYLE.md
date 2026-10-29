# TEXT_STYLE: văn phong lá bài kiểu Yu-Gi-Oh + glossary từ khoá + chữ 30 tướng

Bản chốt để chép nguyên văn vào `desc` (VI, trong `heroes/*.ts`) và bản EN (`i18n/en_g2.ts`, `en_g3.ts`, `en_g4.ts`, `i18n_en.ts`).
**Không đổi cơ chế hay con số**: chữ dưới đây mô tả đúng code hiện tại. Glossary chép vào `packages/shared/src/cardgame/keywords/{general,a,b,c,d}.ts`
(kiểu `Keyword { vi, en, descVi, descEn }`, khoá = `id`).

## 1. Luật văn phong
1. **Thứ tự Yu-Gi-Oh:** `[Nhãn.] [Kích hoạt:] [chi phí / điều kiện / mục tiêu]; [hiệu ứng]. [Nếu …: nâng cấp.]`
   - Mục tiêu: `Chọn 1 tướng địch;` · `Chọn tối đa 3 tướng địch;` · `Chọn 1 tướng mình;` · `Chọn tướng địch đối diện Darius;` · `Chọn 1 đường có Dao Găm;`. Lá không chọn gì thì vào thẳng hiệu ứng (`Mọi tướng địch nhận …`).
   - Chi phí / điều kiện đánh: `Bỏ 1 lá Vàng, chọn 1 tướng mình …;` · `Bạn có thể bỏ 1 lá Đồ;` · `Đối thủ có ít nhất 1 lá trên tay;`.
2. **Kích hoạt** viết đầu câu, kết thúc bằng dấu hai chấm: `Khi …:` · `Đầu lượt của bạn:` · `Cuối lượt của bạn:` · `Đầu lượt của đối thủ:` · `Một lần mỗi lượt:`.
3. **Điều kiện nâng cấp** (mẫu "hiệu ứng gốc + 1 điều kiện") là câu riêng `Nếu …: …` — bỏ hẳn nhãn `**Điều kiện:**`. Bậc của Viktor viết `Bậc 1: …`.
4. **Nhãn** đứng đầu lá, kết thúc bằng dấu chấm: `Quick.` · `Quick, Chỉ Nối Chuỗi.` · `Không Thể Bị Nối Chuỗi.`
5. **Từ khoá** viết đúng tên trong glossary (hoa đầu mỗi chữ, trừ lá `Đánh thường` giữ đúng tên thẻ), **không giải thích lại** trong chữ và **không in đậm** (bỏ mọi `**…**`; client tô từ khoá theo glossary, khớp **cụm dài nhất trước**: `Thiêu Đốt` trước `Đốt`, `Thùng Thuốc Súng` trước `Thuốc Súng`).
   Động từ thường (`rút`, `bỏ`, `xáo`, `hồi`, `gây`) không phải từ khoá; động từ là từ khoá (`Tìm`, `Đốt`, `Cướp`, `Kéo`, `Úp`, `Xem Tay`, `Chôn`) luôn viết hoa, kể cả giữa câu.
6. **Chủ ngữ:** gọi tên tướng (`Darius`, `Kog'Maw`); `bạn` = người chơi; `nó` = mục tiêu vừa nhắc. Không dùng `thầy`, `nàng`, `hắn`, `cô`.
7. **Con số:** giữ nguyên mọi `{công thức}`. Trong code VI, chỗ nào đang ghép `${HẰNG_SỐ}` (vd `{${F_Q}}`, `${MAX_BLEED}`, `×${R_CHARMED_MULT}`) thì **giữ phép ghép**; bản dưới đây in giá trị đã ghép để đối chiếu (số thập phân in kiểu JS: `×1.5`). EN dùng token `max HP`, `bonus HP`, `Armor`, `MR` như `checkTranslations()` đòi.
8. **Thời hạn:** `1 lượt` / `2 lượt` = lượt của tướng mang trạng thái (mặc định `g.status`); `tới hết lượt kế tiếp` = hết lượt kế tiếp bất kể của ai; `tới hết lượt kế tiếp của đối thủ` = `{ of: phe đối thủ }`.
9. **Máu:** `máu thấp nhất` = % máu thấp nhất (`g.lowestHp`); `ít máu nhất` chỉ khi so máu tuyệt đối (Jinx Q). Loại sát thương luôn ghi: `sát thương vật lý / phép / chuẩn`.
10. **Độ dài:** tối đa 4 câu; mỗi câu một ý. EN giữ cùng thứ tự: `Choose 1 enemy champion; deal …` · `When …:` · `At the start of your turn:` · `Once per turn:` · `If …:`.

## 2. Sáu ví dụ tốt / xấu
| # | Xấu (bản cũ) | Tốt (bản mới) | Vì sao |
|---|---|---|---|
| 1 | `{55 + 75% AD + 25% AP} sát thương vật lý lên tướng đối diện, +1 dấu. **Điều kiện:** tướng đối diện đang Kề Đao sau đòn này thì bị kết liễu.` | `Chọn tướng địch đối diện Darius; gây {55 + 75% AD + 25% AP} sát thương vật lý và +1 Chảy Máu. Nếu sau đó nó đang Kề Đao: Kết Liễu nó.` | mục tiêu trước `;`, điều kiện thành `Nếu …:`, "dấu" thành từ khoá Chảy Máu |
| 2 | `Mỗi khi 1 tướng địch bị hạ trong lượt của bạn, Jinx nhận Phấn Khích tới hết lượt (hiện trên tướng): bạn rút 1 lá và đòn đánh kế tiếp của Jinx không cần lá Đánh thường.` | `Khi 1 tướng địch bị hạ trong lượt của bạn: Jinx nhận Phấn Khích và 1 Đòn Miễn Phí; bạn rút 1 lá.` | kích hoạt `Khi …:`; "không cần lá Đánh thường" là từ khoá Đòn Miễn Phí; Phấn Khích định nghĩa trong glossary |
| 3 | `**Quick, chỉ nối chuỗi**, khi địch đánh/tung chiêu nhắm đúng 1 tướng mình: đổi mục tiêu sang Braum, …` | `Quick, Chỉ Nối Chuỗi. Khi lá hoặc đòn đánh của địch nhắm đúng 1 tướng mình: Đỡ Thay; Braum nhận Khiên {130 + 10% máu cộng thêm + 30% AP}. …` | nhãn đứng riêng, cơ chế "đổi mục tiêu" thành từ khoá Đỡ Thay |
| 4 | `Chọn 1 tướng mình, bỏ bao nhiêu lá trên tay tuỳ ý: mỗi lá bỏ đi hồi cho tướng đó {45 + 30% AP}. **Điều kiện:** lá bỏ là **lá chết** (lá chiêu của tướng đang chết hoặc chưa ra sân) thì hồi thêm 50%.` | `Chọn 1 tướng mình và bỏ bao nhiêu lá trên tay tuỳ ý; mỗi lá bỏ: tướng đó hồi {45 + 30% AP}, hồi thêm 50% nếu lá đó là Lá Chết.` | chi phí + mục tiêu trước `;`, không định nghĩa lại Lá Chết |
| 5 | `Bỏ 1 lá Vàng trên tay: đồ của 1 tướng mình (đang đeo đồ) được rèn lên **Kiệt Tác**: mọi chỉ số từ đồ +30% (tối đa +100% = gấp đôi, hiện trên tướng). …` | `Bỏ 1 lá Vàng, chọn 1 tướng mình đang đeo đồ; nó +30% Kiệt Tác và Ornn nhận Khiên {40 + 30% AP}. Nếu nó đeo đủ 3 món: bạn rút 1 lá.` | chi phí đầu câu; Kiệt Tác là từ khoá, không giải thích lại |
| 6 | `Nấm Độc: Lá Nấm nằm trong bộ bài đối thủ. Rút trúng thì Nấm nổ: … 3 lá trên cùng bộ bài đối thủ bị đốt vào mộ. Nấm chiếm chỗ lá rút đó, rồi bị huỷ.` | `Khi đối thủ rút trúng Nấm Độc: tướng máu thấp nhất bên đó nhận {120 + 30% AP} sát thương phép; Đốt 3 lá trên cùng bộ bài đối thủ.` | kích hoạt rõ; "lá nằm trong bộ, chiếm chỗ lá rút" chuyển vào glossary Nấm Độc; "đốt vào mộ" thành từ khoá Đốt |

## 3. Glossary từ khoá
Định dạng: `id` · VI · EN · định nghĩa VI · định nghĩa EN. Id dùng đúng id status/stack trong code khi có.

### GENERAL (`keywords/general.ts`) — 30
| id | VI | EN | Định nghĩa VI | Định nghĩa EN |
|---|---|---|---|---|
| stun | Choáng | Stun | Không thể dùng lá chiêu hay đánh thường (kể cả tự đánh của Đấu Sĩ). Mắt xích của nó đang chờ trong Chuỗi bị huỷ. | Can't use skill cards or attack (including a Fighter's automatic attack). Its pending Chain Link fizzles. |
| silence | Câm Lặng | Silence | Không thể dùng lá chiêu (vẫn đánh thường được). | Can't use skill cards (can still attack). |
| chill | Buốt | Chill | Nhận thêm 25% sát thương. | Takes 25% more damage. |
| shred | Rã Giáp | Armor Shred | Giáp và Kháng phép −40%. | Armor and MR −40%. |
| blind | Mù | Blind | Mù N: N đòn đánh kế tiếp của tướng này trượt (tối đa 3, số hiện trên tướng). | Blind N: its next N attacks miss (max 3, shown on it). |
| taunt | Khiêu Khích | Taunt | Lá chiêu đơn mục tiêu và đòn đánh của địch phải nhắm tướng này. | Enemy single-target skills and attacks must target this champion. |
| grievous | Vết Thương Sâu | Grievous Wounds | Hồi máu và Khiên nhận vào −50%. | Healing and Shields received −50%. |
| stealth | Tàng Hình | Stealth | Không bị chọn bởi lá 1 mục tiêu, lá tối đa N hay đòn đánh; lá đánh mọi tướng địch vẫn trúng. | Can't be chosen by single-target or up-to-N cards or by attacks; cards that hit every enemy still hit it. |
| empower | Cường Hoá | Empowered | Gây thêm 20% sát thương (trừ sát thương đầu lượt). | Deals 20% more damage (except start-of-turn damage). |
| exhaust | Kiệt Sức | Exhaust | Gây ít hơn 40% sát thương. | Deals 40% less damage. |
| ignite | Thiêu Đốt | Ignite | Đầu mỗi lượt của tướng này: mất lượng máu ghi trên trạng thái (sát thương chuẩn). | At the start of each of its turns: loses the HP shown on the status (true damage). |
| shield | Khiên | Shield | Máu tạm hấp thụ sát thương trước máu thật; không tự mất. | Temporary HP that absorbs damage before HP; doesn't decay. |
| quick | Quick | Quick | Đánh được trong lượt bạn như thường, và nối được Chuỗi lên lá hoặc đòn đánh vừa đánh (cả trong lượt đối thủ) khi đúng điều kiện ghi trên lá. | Playable on your turn as normal, and can be chained onto the card or attack just played (even on the opponent's turn) when the card's condition is met. |
| chain_only | Chỉ Nối Chuỗi | Chain Only | Lá Quick này không đánh chủ động được; chỉ dùng để nối Chuỗi. | This Quick card can't be played on its own; it can only be chained. |
| uncounterable | Không Thể Bị Nối Chuỗi | Unchainable | Không ai được nối Chuỗi lên lá này. | No one can chain onto this card. |
| chain | Chuỗi | Chain | Lá hoặc đòn đánh vừa đánh mở Chuỗi; hai bên lần lượt nối lá Quick; Chuỗi giải quyết từ mắt xích cuối về đầu (tối đa 10 mắt xích). | A played card or attack opens a Chain; players take turns adding Quick cards; the Chain resolves from the last link to the first (max 10 links). |
| negate | Vô Hiệu | Negate | Phe được bảo vệ không nhận sát thương và khống chế từ lá đó. | The protected side takes no damage and no crowd control from that card. |
| free_attack | Đòn Miễn Phí | Free Attack | Một đòn đánh thường không cần lá Đánh thường (theo luật vai); giữ tới khi dùng. | A basic attack that needs no Strike card (following role rules); kept until used. |
| strike | Đánh thường | Strike | Thẻ hỗ trợ: 1 tướng mình đánh thường theo luật vai (Xạ Thủ 200% AD lên tướng bất kỳ; Sát Thủ 350% AD; vai khác 100% AD lên tướng đối diện). | Support card: 1 allied champion attacks by role rules (Marksman 200% AD on any enemy; Assassin 350% AD; others 100% AD on the opposing champion). |
| search | Tìm | Search | Lục bộ bài lấy 1 lá đúng loại lên tay, rồi xáo bộ bài. | Take 1 card of the named kind from your deck into your hand, then shuffle. |
| mill | Đốt | Mill | Đưa N lá trên cùng bộ bài thẳng vào mộ (không qua tay). | Put the top N cards of a deck straight into the graveyard (not via the hand). |
| steal | Cướp | Steal | Lấy 1 lá trên tay đối thủ sang tay bạn; lá chiêu cướp được thành 1 lá Đánh thường. | Take 1 card from the opponent's hand into yours; a stolen skill card becomes a Strike. |
| reveal_hand | Xem Tay | Reveal Hand | Bạn thấy toàn bộ lá trên tay đối thủ tới hết lượt. | You see the opponent's whole hand until the end of the turn. |
| dead_card | Lá Chết | Dead Card | Lá chiêu của tướng đang chờ hồi sinh hoặc chưa ra sân: không dùng được nhưng vẫn chiếm chỗ. | A skill card of a champion that is respawning or not yet summoned: unplayable but still takes space. |
| prize | Lá Thưởng | Prize Card | 6 lá úp mỗi bên đầu trận; mỗi lần bạn hạ 1 tướng địch, lật 1 Lá Thưởng lên tay. | 6 face-down cards per side; each time you take down an enemy champion, flip 1 Prize Card into your hand. |
| behind | Thua Mạng | Behind | Đội bạn còn ít mạng hơn đội địch. | Your team has fewer lives left than the enemy team. |
| token | Vật Triệu Hồi | Summon | Đơn vị ở ô triệu hồi phụ (mỗi bên 1 ô): không phải tướng, chết không mất mạng, biến mất khi tướng chủ rời sân. Chỉ đòn đánh của Xạ Thủ (hoặc lá ghi rõ) chọn được nó. | A unit in the extra summon slot (1 per side): not a champion, losing it costs no life, it vanishes when its owner leaves the board. Only Marksman attacks (or cards that say so) can target it. |
| soak | Máu Ảo | Soak | Sát thương nhắm tướng chủ đánh vào Vật Triệu Hồi này trước. | Damage aimed at its owner hits this Summon first. |
| face_down | Úp | Face-down | Vật Triệu Hồi úp: đối thủ không thấy lá gắn với nó tới khi lật; rời sân thì tự lật. | A face-down Summon: the opponent can't see its attached card until it is flipped; it flips when it leaves the board. |
| pull | Kéo | Pull | Đưa tướng địch sang đường đối diện tướng kéo (đổi chỗ với tướng địch đang đứng đó). | Move an enemy champion to the lane opposite the puller (swapping with the enemy standing there). |

### A (`keywords/a.ts`: darius, nami, braum, blitzcrank, zed, viktor) — 9
| id | VI | EN | Định nghĩa VI | Định nghĩa EN |
|---|---|---|---|---|
| bleed | Chảy Máu | Bleed | Dấu của Darius trên tướng (tối đa 5, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). | Darius's mark (max 5, expires 2 of its turns after the last one added). |
| darius_block | Kề Đao | On the Block | Tướng có máu ≤ 10% máu tối đa × số Chảy Máu của nó. | A champion whose HP is ≤ 10% max HP × its Bleed. |
| execute | Kết Liễu | Execute | Gây sát thương chuẩn đủ hạ tướng đó ngay (Khiên không cứu được; hiệu ứng "không bị hạ" vẫn áp dụng). | Deal enough true damage to take it down at once (Shields don't save it; "can't be taken down" effects still apply). |
| nami_bless | Phước Lành | Blessing | Tướng này có 1 Đòn Miễn Phí (giữ tới khi dùng). Nếu đòn đó chí mạng khi Nami còn trên sân: bạn rút 1 lá. | This champion has a Free Attack (kept until used). If that attack crits while Nami is on the board: draw 1 card. |
| braum_cover | Đỡ Thay | Intercept | Lá hoặc đòn đánh của địch đổi mục tiêu sang Braum. | The enemy card or attack is redirected to Braum. |
| zedmark | Dấu Ấn Tử Thần | Death Mark | Dấu của Zed trên 1 tướng địch, hiện số đòn (tối đa 8); nổ cuối lượt Zed (xem Zed R). | Zed's mark on an enemy champion, showing its hit count (max 8); bursts at the end of Zed's turn (see Zed R). |
| shadow | Bóng | Shadow | Lá tạm sao chép 1 lá Q hoặc R của Zed: dùng như lá đó rồi biến mất; cuối lượt còn trên tay cũng biến mất. | A temporary copy of a Zed Q or R card: play it as that card, then it vanishes; it also vanishes at end of turn if unused. |
| viktor_tier | Bậc | Tier | Bậc chiêu của Viktor (0–3) = số lá Viktor trong mộ bài của bạn chia 2, làm tròn xuống. "Bậc N:" áp dụng khi bậc ≥ N. | Viktor's skill tier (0–3) = Viktor cards in your graveyard divided by 2, rounded down. "Tier N:" applies at tier ≥ N. |
| storm | Bão | Storm | Trạng thái Viktor R gắn lên tướng địch (hiện số lượt); đánh nó đầu mỗi lượt của Viktor (xem Viktor R). | Status Viktor R puts on an enemy (shows turns left); strikes it at the start of each of Viktor's turns (see Viktor R). |

### B (`keywords/b.ts`: twistedfate, soraka, teemo, kogmaw, aatrox, garen, yorick, gangplank) — 12
| id | VI | EN | Định nghĩa VI | Định nghĩa EN |
|---|---|---|---|---|
| mushroom | Nấm Độc | Toxic Mushroom | Lá đặc biệt của Teemo nằm trong bộ bài đối thủ. Khi bị rút: Nấm nổ (xem Teemo) rồi biến mất, chiếm chỗ lá rút đó. | Teemo's special card hidden in the opponent's deck. When drawn it explodes (see Teemo), then vanishes, taking the place of that draw. |
| mushroom_season | Mùa Nấm | Mushroom Season | Trạng thái của Teemo tới hết lượt kế tiếp của đối thủ: mỗi Nấm Độc nổ Đốt 4 lá thay vì 3. | Teemo's status until the end of the opponent's next turn: each Toxic Mushroom mills 4 cards instead of 3. |
| kog | Kog Stack | Kog Stack | Bộ đếm của Kog'Maw, hiện trên tướng, giữ qua các lần chết. | Kog'Maw's counter, shown on him, kept through deaths. |
| kog_arty | Cao Xạ | Bio-Arcane Barrage | Trạng thái của Kog'Maw: cuối lượt của bạn Kog'Maw tự đánh 1 tướng địch (Đòn Miễn Phí); Đòn Miễn Phí của Kog'Maw gây thêm 3% máu tối đa của mục tiêu. | Kog'Maw's status: at the end of your turn he attacks 1 enemy (Free Attack); his Free Attacks deal +3% of the target's max HP. |
| pay_hp | Trả Máu | Pay HP | Mất bấy nhiêu máu thẳng (không qua Khiên); không thể tự hạ mình (còn ít nhất 1 máu). | Lose that much HP directly (ignores Shields); can't take yourself down (stays at 1 HP or more). |
| aatrox_r | Kẻ Diệt Thế | World Ender | Trạng thái của Aatrox (2 lượt của Aatrox): Cái Giá Bằng Máu tối đa +100%; lần đầu về 0 máu thì không bị hạ (xem Aatrox R) và hết trạng thái. | Aatrox's status (2 of his turns): Blood Price caps at +100%; the first time he drops to 0 HP he isn't taken down (see Aatrox R) and the status ends. |
| garen_lead | Dẫn Trước | Ahead | Một hạng mục mà phe địch hơn phe bạn: mạng còn lại, tổng số đồ đang đeo, số lá trên tay. | A category where the enemy side beats yours: lives left, total items equipped, cards in hand. |
| soul | Linh Hồn | Soul | Mỗi lá chiêu của Yorick nằm trong mộ bài của bạn. | Each Yorick skill card in your graveyard. |
| mist_walker | Thây Ma Sương Mù | Mist Walker | Vật Triệu Hồi của Yorick; hiện sức đánh cộng thêm và số lượt còn lại. | Yorick's Summon; shows its bonus attack and turns left. |
| keg | Thùng Thuốc Súng | Powder Keg | Vật Triệu Hồi Úp của Gangplank (1 máu, tự xịt sau 3 lượt của bạn). Lá Úp theo nó là lá chiêu Gangplank thì là thùng thật, lá khác là thùng giả. Lá Úp vào mộ khi thùng nổ, vỡ hoặc xịt. | Gangplank's Face-down Summon (1 HP, fizzles after 3 of your turns). If its attached card is a Gangplank skill card it is real, otherwise a fake. The card goes to the graveyard when the keg explodes, breaks or fizzles. |
| powder | Thuốc Súng | Powder | Bộ đếm trên Thùng Thuốc Súng, +1 đầu mỗi lượt của bạn. | Counter on the Powder Keg, +1 at the start of each of your turns. |
| keg_detonate | Kích Nổ Thùng | Detonate Keg | Lật Thùng Thuốc Súng của bạn rồi gỡ nó: thùng thật gây sát thương lên mọi tướng địch (xem Gangplank Q), thùng giả không gây gì. | Flip your Powder Keg and remove it: a real keg damages every enemy champion (see Gangplank Q), a fake does nothing. |

### C (`keywords/c.ts`: leona, malphite, ornn, katarina, khazix, qiyana, ahri, annie) — 13
| id | VI | EN | Định nghĩa VI | Định nghĩa EN |
|---|---|---|---|---|
| sunlight | Ánh Dương | Sunlight | Dấu của Leona (tối đa 3), giữ tới hết lượt kế tiếp của tướng mang; nổ khi đồng minh khác của Leona đánh trúng (xem Leona). | Leona's mark (max 3), lasts until the end of its bearer's next turn; detonates when another ally of Leona hits it (see Leona). |
| item_amp | Kiệt Tác | Masterwork | Bộ đếm % trên tướng (tối đa +100%): mọi chỉ số từ đồ của tướng đó tăng bấy nhiêu %. Không đổi số liệu trong chữ nội tại của đồ. | A % counter on a champion (max +100%): all stats from its items increase by that %. Doesn't change numbers in item passive text. |
| forge | Rèn Ngay | Instant Forge | Đeo ngay 1 món đồ huyền thoại ghép từ 2 mảnh ngẫu nhiên, không tốn lá. | Equip at once 1 legendary item crafted from 2 random components, costing no cards. |
| dagger | Dao Găm | Dagger | Dấu của Katarina trên 1 đường (mỗi đường tối đa 1), hiện số lượt còn lại (2 lượt của bạn). | Katarina's marker on a lane (max 1 per lane), shows turns left (2 of your turns). |
| isolated | Cô Lập | Isolated | Tướng địch không có đồng đội ở 2 đường kề bên. | An enemy champion with no ally in either adjacent lane. |
| evo | Tiến Hoá | Evolution | Bậc của Kha'Zix = số Lá Thưởng phe bạn đã lật (tối đa 3), hiện trên tướng. | Kha'Zix's level = Prize Cards your side has flipped (max 3), shown on him. |
| element | Nguyên Tố | Element | Loại của lá trên cùng mộ bài của bạn: Đá, Sông hoặc Cỏ. Mộ trống thì không có Nguyên Tố. | The type of the top card of your graveyard: Rock, River or Grass. Empty graveyard means no Element. |
| rock | Đá | Rock | Nguyên Tố của lá Vàng và Đồ. Hiệu ứng: Choáng 1 lượt. | Element of Gold and Component cards. Effect: Stun for 1 turn. |
| river | Sông | River | Nguyên Tố của các thẻ hỗ trợ khác (Rút Bài, phép bổ trợ…). Hiệu ứng: Buốt 2 lượt. | Element of other support cards (Draw, summoner spells…). Effect: Chill for 2 turns. |
| grass | Cỏ | Grass | Nguyên Tố của lá Đánh thường, lá chiêu và lá đặc biệt. Hiệu ứng: +40% sát thương. | Element of Strike, skill and special cards. Effect: +40% damage. |
| charm | Quyến Rũ | Charm | Trạng thái do Ahri gắn: sát thương tướng này gây lên phe Ahri bị bẻ sang đồng đội của nó (xem Ahri). | Status from Ahri: damage this champion deals to Ahri's side is turned on its own allies (see Ahri). |
| tibbers | Tibbers | Tibbers | Vật Triệu Hồi của Annie, là Máu Ảo của Annie. | Annie's Summon; Soak for Annie. |
| blaze | Bốc Lửa | Blaze | Bộ đếm của Annie (tối đa 3), +1 khi Tibbers nhận sát thương từ địch; Q và R của Annie tiêu. | Annie's counter (max 3), +1 when Tibbers takes enemy damage; spent by Annie's Q and R. |

### D (`keywords/d.ts`: lissandra, lux, ashe, jinx, vayne, janna, brand, renata) — 7
| id | VI | EN | Định nghĩa VI | Định nghĩa EN |
|---|---|---|---|---|
| illum | Chiếu Sáng | Illumination | Dấu của Lux (2 lượt); bị tiêu khi Lux hoặc đồng minh gây sát thương bằng chiêu hay đòn đánh lên tướng mang dấu (xem Lux). | Lux's mark (2 turns); consumed when Lux or an ally damages its bearer with a skill or attack (see Lux). |
| bury | Chôn | Bury | Đặt lá đó xuống đáy bộ bài của chủ nó. | Put that card on the bottom of its owner's deck. |
| excited | Phấn Khích | Get Excited | Trạng thái của Jinx tới hết lượt; Q của Jinx rút thêm 1 lá khi Jinx đang Phấn Khích. | Jinx's status until end of turn; Jinx's Q draws 1 more card while she is Excited. |
| silver | Mũi Bạc | Silver Bolt | Dấu của Vayne (giữ 2 lượt của tướng mang); đủ 3 thì nổ (xem Vayne). | Vayne's mark (lasts 2 of its bearer's turns); bursts at 3 (see Vayne). |
| burn | Bỏng | Burn | Dấu của Brand (tối đa 5, hết sau 2 lượt của tướng mang kể từ lần cộng cuối); gây sát thương đầu mỗi lượt của nó (xem Brand). | Brand's mark (max 5, expires 2 of its bearer's turns after the last one added); deals damage at the start of each of its turns (see Brand). |
| bailout | Cứu Trợ | Bailout | Không thể bị hạ tới hết lượt kế tiếp của phe Renata. Nếu tướng này hạ gục 1 tướng địch: mất Cứu Trợ và sống tiếp; nếu không, cuối lượt đó nó bị hạ. | Can't be taken down until the end of Renata's side's next turn. If it takes down an enemy champion: Bailout ends and it lives on; otherwise it is taken down at the end of that turn. |
| berserk | Nổi Điên | Berserk | Trạng thái do Renata R gắn: tướng này vừa bị buộc đánh đồng đội của chính nó. | Status from Renata R: this champion was forced to attack its own allies. |

Tổng: **71 từ khoá** (GENERAL 30, A 9, B 12, C 13, D 7).

## 4. Chữ 30 tướng (nội tại, Q, E, R)
Tên nội tại/chiêu giữ nguyên như code (chỉ ghi để đối chiếu). Mỗi dòng: **VI** rồi **EN**.

### Nhóm A

#### Darius
- Nội tại · Xuất Huyết
  - VI: `Khi đòn đánh của Darius trúng 1 tướng: tướng đó +1 Chảy Máu. Đòn đánh và chiêu của Darius gây thêm 6% sát thương cho mỗi Chảy Máu trên mục tiêu.`
  - EN: `When Darius's attack hits a champion: it gains 1 Bleed. Darius's attacks and skills deal 6% more damage per Bleed on the target.`
- Q · Tàn Sát
  - VI: `Chọn tướng địch đối diện Darius; gây {55 + 75% AD + 25% AP} sát thương vật lý và +1 Chảy Máu. Nếu sau đó nó đang Kề Đao: Kết Liễu nó.`
  - EN: `Choose the enemy champion opposite Darius; deal {55 + 75% AD + 25% AP} physical damage and +1 Bleed. If it is then On the Block: Execute it.`
- E · Bắt Giữ
  - VI: `Chọn 1 tướng địch; Kéo nó, gây {25 + 40% AD} sát thương vật lý và +1 Chảy Máu. Nếu nó đã có Chảy Máu: +2 Chảy Máu thay vì 1.`
  - EN: `Choose 1 enemy champion; Pull it, deal {25 + 40% AD} physical damage and +1 Bleed. If it already had Bleed: +2 Bleed instead of 1.`
- R · Máy Chém Noxus
  - VI: `Chọn tướng địch đối diện Darius; nếu nó đang Kề Đao, Kết Liễu nó. Nếu không: gây {90 + 60% AD + 20% AP} sát thương chuẩn, rồi Kết Liễu nó nếu giờ nó Kề Đao. Nếu lá này hạ gục: nó quay về tay.`
  - EN: `Choose the enemy champion opposite Darius; if it is On the Block, Execute it. Otherwise: deal {90 + 60% AD + 20% AP} true damage, then Execute it if it is now On the Block. If this card scores a takedown: it returns to your hand.`

#### Nami
- Nội tại · Thuỷ Triều
  - VI: `Khi bạn rút 1 lá nhờ lá chiêu: tướng mình máu thấp nhất hồi {15 + 10% AP}.`
  - EN: `When you draw a card from a skill card: your lowest-HP champion heals {15 + 10% AP}.`
- Q · Sóng Triều
  - VI: `Rút 2 lá. Với mỗi lá chiêu vừa rút của 1 tướng mình đang trên sân: tướng đó nhận Phước Lành.`
  - EN: `Draw 2 cards. For each skill card drawn this way that belongs to one of your champions on the board: that champion gains Blessing.`
- E · Phước Lành
  - VI: `Chọn 1 tướng mình; nó nhận Phước Lành, và đòn đánh đó gây thêm {40 + 20% AP} sát thương phép.`
  - EN: `Choose 1 allied champion; it gains Blessing, and that attack deals {40 + 20% AP} bonus magic damage.`
- R · Đại Hồng Thuỷ
  - VI: `Rút 2 lá; mọi tướng mình trên sân nhận Phước Lành. Nếu bạn còn từ 3 mạng trở xuống: rút 4 lá thay vì 2.`
  - EN: `Draw 2 cards; every allied champion on the board gains Blessing. If you have 3 lives or fewer: draw 4 cards instead of 2.`

#### Braum
- Nội tại · Bức Tường Freljord
  - VI: `Mọi lá chiêu của Braum là Quick và Chỉ Nối Chuỗi. Khi 1 lá chiêu của Braum giải quyết xong: bạn rút 1 lá.`
  - EN: `All of Braum's skill cards are Quick and Chain Only. When one of Braum's skill cards resolves: draw 1 card.`
- Q · Đứng Sau Tôi
  - VI: `Quick, Chỉ Nối Chuỗi. Khi lá hoặc đòn đánh của địch nhắm đúng 1 tướng mình: Đỡ Thay; Braum nhận Khiên {130 + 10% máu cộng thêm + 30% AP}. Nếu Braum đã có Khiên từ trước: phản lại 30% sát thương đó cho kẻ tấn công (sát thương chuẩn).`
  - EN: `Quick, Chain Only. When an enemy card or attack targets exactly 1 of your champions: Intercept; Braum gains a Shield of {130 + 10% bonus HP + 30% AP}. If Braum already had a Shield: reflect 30% of that damage to the attacker (true damage).`
- E · Bất Khả Xâm Phạm
  - VI: `Quick, Chỉ Nối Chuỗi. Khi địch đánh lá chiêu nhắm nhiều tướng mình (tối đa N hoặc mọi tướng): mọi tướng mình nhận ít hơn 40% sát thương từ lá đó. Nếu lá đó là R: tướng mình còn miễn khống chế của nó.`
  - EN: `Quick, Chain Only. When an enemy skill card targets several of your champions (up to N or all): your champions take 40% less damage from it. If that card is an R: your champions are also immune to its crowd control.`
- R · Vết Nứt Băng Giá
  - VI: `Quick, Chỉ Nối Chuỗi. Khi địch đánh 1 lá chiêu nhắm tướng mình: Vô Hiệu lá đó; kẻ tung nhận {110 + 6% máu tối đa + 40% AP} sát thương phép và bị Buốt 1 lượt. Nếu trên tay bạn còn từ 2 lá chiêu của Braum: mọi tướng địch nhận sát thương và Buốt thay vì chỉ kẻ tung.`
  - EN: `Quick, Chain Only. When an enemy skill card targets your champions: Negate it; its caster takes {110 + 6% max HP + 40% AP} magic damage and is Chilled for 1 turn. If you still hold 2 or more Braum skill cards: every enemy champion takes the damage and Chill instead of only the caster.`

#### Blitzcrank
- Nội tại · Lò Phản Ứng
  - VI: `Khi bạn Cướp 1 lá: Blitzcrank +5 giáp và kháng phép vĩnh viễn (tối đa +30).`
  - EN: `When you Steal a card: Blitzcrank gains +5 Armor and MR permanently (max +30).`
- Q · Bàn Tay Hoả Tiễn
  - VI: `Đối thủ có ít nhất 1 lá trên tay; Cướp 1 lá ngẫu nhiên trên tay đối thủ, rồi gây {120 + 50% AP + 80% AD} sát thương phép lên tướng địch đối diện Blitzcrank. Nếu lá cướp được là lá chiêu của 1 tướng địch đang trên sân: Kéo tướng đó trước khi gây sát thương.`
  - EN: `The opponent has at least 1 card in hand; Steal 1 random card from their hand, then deal {120 + 50% AP + 80% AD} magic damage to the enemy champion opposite Blitzcrank. If the stolen card is a skill card of an enemy champion on the board: Pull that champion before dealing damage.`
- E · Đấm Móc
  - VI: `Chọn tướng địch đối diện Blitzcrank; Blitzcrank đánh thường nó (Đòn Miễn Phí) thêm {100 + 80% AD} sát thương, rồi Choáng nó 1 lượt. Nếu tay đối thủ còn từ 5 lá trở xuống: Choáng 2 lượt.`
  - EN: `Choose the enemy champion opposite Blitzcrank; Blitzcrank attacks it (Free Attack) for {100 + 80% AD} bonus damage, then Stuns it for 1 turn. If the opponent holds 5 cards or fewer: Stun for 2 turns.`
- R · Trường Điện Từ
  - VI: `Đối thủ bỏ 2 lá ngẫu nhiên trên tay; mọi tướng địch nhận {140 + 40% AP} sát thương phép và bị Câm Lặng 1 lượt. Nếu sau đó tay đối thủ còn từ 2 lá trở xuống: Choáng 1 lượt thay vì Câm Lặng.`
  - EN: `The opponent discards 2 random cards; every enemy champion takes {140 + 40% AP} magic damage and is Silenced for 1 turn. If the opponent then holds 2 cards or fewer: Stun for 1 turn instead of Silence.`

#### Zed
- Nội tại · Bóng Tối Trong Mộ
  - VI: `Chiêu của Zed gây thêm 3% sát thương cho mỗi lá Zed trong mộ bài của bạn (tối đa +30%). Khi Zed gây sát thương bằng đòn đánh hoặc chiêu lên tướng có Dấu Ấn Tử Thần: dấu +1 đòn (tối đa 8).`
  - EN: `Zed's skills deal 3% more damage per Zed card in your graveyard (max +30%). When Zed damages a champion with a Death Mark using an attack or skill: the mark gains +1 hit (max 8).`
- Q · Phi Tiêu Sắc Lẻm
  - VI: `Chọn 1 tướng địch; gây {40 + 55% AD + 20% AP} sát thương vật lý. Nếu nó có Dấu Ấn Tử Thần: Zed đánh thường nó thêm 1 lần (Đòn Miễn Phí, 40% sát thương).`
  - EN: `Choose 1 enemy champion; deal {40 + 55% AD + 20% AP} physical damage. If it has a Death Mark: Zed also attacks it once (Free Attack, 40% damage).`
- E · Phân Thân Bóng Tối
  - VI: `Chọn 1 đường có tướng địch; Zed chuyển sang đường đó (đổi chỗ với tướng mình nếu có), rồi tạo 1 Bóng của lá Q hoặc R của Zed vào mộ gần nhất. Nếu mộ bài có từ 4 lá Zed: tạo 2 Bóng (từ 2 lá Q/R gần nhất).`
  - EN: `Choose 1 lane with an enemy champion; Zed moves there (swapping with an ally if any), then create 1 Shadow of the Zed Q or R card most recently put into your graveyard. If your graveyard has 4 or more Zed cards: create 2 Shadows (from the 2 most recent Q/R cards).`
- R · Dấu Ấn Tử Thần
  - VI: `Chọn 1 tướng địch; đặt Dấu Ấn Tử Thần lên nó và gây {30 + 25% AD} sát thương vật lý; nếu nó đã có dấu, dấu +2 đòn thay vì gây sát thương. Cuối lượt này dấu nổ: {40 + 30% AD} + {30 + 25% AD} mỗi đòn trên dấu, sát thương chuẩn. Nếu vụ nổ hạ gục: lá R gần nhất trong mộ quay về tay.`
  - EN: `Choose 1 enemy champion; place a Death Mark on it and deal {30 + 25% AD} physical damage; if it already has one, the mark gains +2 hits instead of the damage. At the end of this turn the mark bursts: {40 + 30% AD} + {30 + 25% AD} per hit on the mark, true damage. If the burst scores a takedown: your most recent R card in the graveyard returns to your hand.`

#### Viktor
- Nội tại · Tiến Hoá Vinh Quang
  - VI: `Bậc của mọi chiêu Viktor = số lá Viktor trong mộ bài của bạn chia 2 (tối đa 3). Bộ bài Viktor có 8 Q, 7 E và chỉ 5 Đánh thường.`
  - EN: `The Tier of all Viktor's skills = Viktor cards in your graveyard divided by 2 (max 3). Viktor's deck has 8 Q, 7 E and only 5 Strikes.`
- Q · Tia Hấp Thụ
  - VI: `Chọn 1 tướng địch; gây {110 + 20% AD + 50% AP} sát thương phép, Viktor nhận Khiên {25 + 20% AP}. Bậc 1: +20% sát thương. Bậc 2: Khiên gấp đôi. Bậc 3: bạn rút 1 lá.`
  - EN: `Choose 1 enemy champion; deal {110 + 20% AD + 50% AP} magic damage, Viktor gains a Shield of {25 + 20% AP}. Tier 1: +20% damage. Tier 2: double Shield. Tier 3: draw 1 card.`
- E · Tia Huỷ Diệt
  - VI: `Chọn tối đa 2 tướng địch; gây {85 + 20% AD + 40% AP} sát thương phép. Bậc 1: +20% sát thương. Bậc 2: chúng bị Buốt 1 lượt. Bậc 3: gây thêm 50% sát thương đó nữa.`
  - EN: `Choose up to 2 enemy champions; deal {85 + 20% AD + 40% AP} magic damage. Tier 1: +20% damage. Tier 2: they are Chilled for 1 turn. Tier 3: deal 50% of that damage again.`
- R · Bão Hỗn Loạn
  - VI: `Chọn 1 tướng địch; đặt Bão lên nó 3 lượt và gây {60 + 30% AP} sát thương phép ngay; đầu mỗi lượt của bạn, tướng mang Bão nhận {60 + 30% AP} sát thương phép. Bậc 1: Bão thêm 1 lượt. Bậc 2: Câm Lặng nó 1 lượt. Bậc 3: khi Viktor dùng Q hoặc E, mọi Bão đánh thêm 1 lần.`
  - EN: `Choose 1 enemy champion; put a Storm on it for 3 turns and deal {60 + 30% AP} magic damage now; at the start of each of your turns, each Storm bearer takes {60 + 30% AP} magic damage. Tier 1: Storm lasts 1 more turn. Tier 2: Silence it for 1 turn. Tier 3: when Viktor uses Q or E, every Storm strikes once more.`

### Nhóm B

#### Twisted Fate
- Nội tại · Bàn Tay Vàng
  - VI: `Khi bạn dùng lá Vàng để ghép đồ: rút 1 lá.`
  - EN: `When you use a Gold card to craft an item: draw 1 card.`
- Q · Chọn Bài
  - VI: `Chọn 1 màu; Xanh: rút 2 lá. Đỏ: mọi tướng địch nhận {55 + 20% AD + 35% AP} sát thương phép. Vàng: chọn 1 tướng địch, gây {75 + 20% AD + 45% AP} sát thương phép, Choáng nó 1 lượt và tạo 1 lá Vàng lên tay bạn. Nếu trên tay bạn có lá Vàng: Xanh rút 3 lá, Đỏ và Vàng gây thêm 50% sát thương.`
  - EN: `Choose 1 color; Blue: draw 2 cards. Red: every enemy champion takes {55 + 20% AD + 35% AP} magic damage. Gold: choose 1 enemy champion, deal {75 + 20% AD + 45% AP} magic damage, Stun it for 1 turn and create 1 Gold card in your hand. If you hold a Gold card: Blue draws 3, Red and Gold deal 50% more damage.`
- E · Xào Bài
  - VI: `Huỷ mọi Nấm Độc trong bộ bài của bạn; rồi Tìm 1 lá bất kỳ. Nếu lá đó là lá R: bỏ 1 lá khác trên tay trước khi lấy.`
  - EN: `Destroy every Toxic Mushroom in your deck; then Search for any 1 card. If it is an R card: discard 1 other card from your hand before taking it.`
- R · Định Mệnh
  - VI: `Xem Tay đối thủ; chọn 1 lá trong đó, đối thủ bỏ lá đó. Nếu lá bị bỏ là lá Quick: bạn rút 1 lá.`
  - EN: `Reveal Hand of the opponent; choose 1 card in it, the opponent discards it. If the discarded card is a Quick card: draw 1 card.`

#### Soraka
- Nội tại · Sao Băng
  - VI: `Khi 1 lá bị bỏ khỏi tay bạn (vì bất kỳ lý do nào, trừ tràn tay): tướng mình máu thấp nhất hồi {20 + 10% AP}.`
  - EN: `When a card is discarded from your hand (for any reason except hand overflow): your lowest-HP champion heals {20 + 10% AP}.`
- Q · Gieo Sao
  - VI: `Mộ bài của bạn có ít nhất 1 lá; xáo tối đa 3 lá trên cùng mộ bài vào bộ bài, mỗi lá xáo vào: tướng mình máu thấp nhất hồi {40 + 25% AP}. Nếu bộ bài của bạn đang ít lá hơn mộ bài: rút 1 lá.`
  - EN: `Your graveyard has at least 1 card; shuffle up to 3 top cards of your graveyard into your deck; for each one: your lowest-HP champion heals {40 + 25% AP}. If your deck had fewer cards than your graveyard: draw 1 card.`
- E · Hiến Tế
  - VI: `Chọn 1 tướng mình và bỏ bao nhiêu lá trên tay tuỳ ý; mỗi lá bỏ: tướng đó hồi {45 + 30% AP}, hồi thêm 50% nếu lá đó là Lá Chết.`
  - EN: `Choose 1 allied champion and discard any number of cards; for each one: it heals {45 + 30% AP}, 50% more if that card is a Dead Card.`
- R · Nguyện Ước
  - VI: `Mọi tướng mình hồi {80 + 50% AP}; rồi xáo toàn bộ mộ bài vào bộ bài. Nếu trước đó bộ bài còn dưới 10 lá: mọi tướng mình còn nhận Khiên {100 + 30% AP}.`
  - EN: `Every allied champion heals {80 + 50% AP}; then shuffle your whole graveyard into your deck. If your deck had fewer than 10 cards before that: every allied champion also gains a Shield of {100 + 30% AP}.`

#### Teemo
- Nội tại · Nấm Độc
  - VI: `Khi đối thủ rút trúng Nấm Độc: tướng máu thấp nhất bên đó nhận {120 + 30% AP} sát thương phép; Đốt 3 lá trên cùng bộ bài đối thủ.`
  - EN: `When the opponent draws a Toxic Mushroom: their lowest-HP unit takes {120 + 30% AP} magic damage; Mill the top 3 cards of their deck.`
- Q · Trồng Nấm
  - VI: `Xáo 2 Nấm Độc vào bộ bài đối thủ. Nếu bộ bài đối thủ dưới 30 lá: xáo 3.`
  - EN: `Shuffle 2 Toxic Mushrooms into the opponent's deck. If their deck has fewer than 30 cards: shuffle 3.`
- E · Bẫy Trên Đường
  - VI: `Đặt 1 Nấm Độc lên trên cùng bộ bài đối thủ. Nếu tay đối thủ có từ 6 lá: đặt 2.`
  - EN: `Put 1 Toxic Mushroom on top of the opponent's deck. If they hold 6 or more cards: put 2.`
- R · Mùa Nấm
  - VI: `Xáo 3 Nấm Độc vào bộ bài đối thủ; Teemo nhận Mùa Nấm.`
  - EN: `Shuffle 3 Toxic Mushrooms into the opponent's deck; Teemo gains Mushroom Season.`

#### Kog'Maw
- Nội tại · Cơn Đói Hư Không
  - VI: `Khi 1 tướng mình bị hạ: Kog'Maw +1 Kog Stack (+2 nếu đó là Kog'Maw). Đòn đánh của Kog'Maw gây thêm {6 + 3% AD} sát thương mỗi Kog Stack. Khi Kog'Maw bị hạ: mọi tướng địch nhận {40 + 20% AD} + 8 mỗi Kog Stack sát thương chuẩn.`
  - EN: `When an allied champion is taken down: Kog'Maw gains +1 Kog Stack (+2 if it is Kog'Maw). Kog'Maw's attacks deal {6 + 3% AD} bonus damage per Kog Stack. When Kog'Maw is taken down: every enemy champion takes {40 + 20% AD} + 8 per Kog Stack true damage.`
- Q · Phun Axít
  - VI: `Chọn 1 tướng địch; gây {40 + 60% AD + 30% AP} sát thương vật lý và Rã Giáp nó 2 lượt. Nếu bạn đang Thua Mạng: Rã Giáp mọi tướng địch.`
  - EN: `Choose 1 enemy champion; deal {40 + 60% AD + 30% AP} physical damage and apply Armor Shred to it for 2 turns. If you are Behind: apply Armor Shred to every enemy champion.`
- E · Cao Xạ Ma Pháp
  - VI: `Kog'Maw nhận Cao Xạ 2 lượt: cuối lượt của bạn, Kog'Maw đánh 1 tướng địch (ưu tiên tướng đang Rã Giáp, rồi máu thấp nhất), thêm 3% máu tối đa của mục tiêu. Nếu bạn đang Thua Mạng: 3 lượt.`
  - EN: `Kog'Maw gains Bio-Arcane Barrage for 2 turns: at the end of your turn, he attacks 1 enemy champion (Armor Shredded first, then lowest HP) for +3% of the target's max HP. If you are Behind: 3 turns.`
- R · Pháo Sinh Học
  - VI: `Chọn 1 tướng địch; gây {70 + 40% AD + 50% AP} + 15 mỗi Kog Stack sát thương phép. Nếu nó đang Rã Giáp và bạn đang Thua Mạng: gỡ Rã Giáp của nó và lá này quay về tay.`
  - EN: `Choose 1 enemy champion; deal {70 + 40% AD + 50% AP} + 15 per Kog Stack magic damage. If it has Armor Shred and you are Behind: remove its Armor Shred and this card returns to your hand.`

#### Aatrox
- Nội tại · Cái Giá Bằng Máu
  - VI: `Aatrox gây thêm 1% sát thương cho mỗi 1% máu đã mất (tối đa +60%; +100% khi là Kẻ Diệt Thế).`
  - EN: `Aatrox deals 1% more damage per 1% HP missing (max +60%; +100% as World Ender).`
- Q · Lưỡi Gươm Darkin
  - VI: `Chọn tướng địch đối diện Aatrox; Trả Máu {8% máu tối đa}, rồi gây {60 + 80% AD + 20% AP} sát thương vật lý. Nếu sau khi Trả Máu Aatrox dưới 50% máu: gây cùng lượng đó lên tướng địch ở 2 đường kề.`
  - EN: `Choose the enemy champion opposite Aatrox; Pay HP {8% max HP}, then deal {60 + 80% AD + 20% AP} physical damage. If Aatrox is below 50% HP after paying: also hit the enemy champions in the 2 adjacent lanes.`
- E · Xiềng Xích Hút Máu
  - VI: `Chọn 1 tướng địch; gây {40 + 45% AD} sát thương vật lý, Aatrox hồi bằng lượng máu nó mất. Nếu Aatrox dưới 30% máu: hồi gấp đôi.`
  - EN: `Choose 1 enemy champion; deal {40 + 45% AD} physical damage, Aatrox heals for the HP it lost. If Aatrox is below 30% HP: double the healing.`
- R · Kẻ Diệt Thế
  - VI: `Trả Máu 30% máu hiện có; Aatrox thành Kẻ Diệt Thế 2 lượt (lần đầu về 0 máu thì còn {15% máu tối đa} máu), rồi gây {50 + 60% AD} sát thương vật lý lên mọi tướng địch.`
  - EN: `Pay HP 30% of current HP; Aatrox becomes World Ender for 2 turns (the first time he drops to 0 HP he is left at {15% max HP} HP), then deal {50 + 60% AD} physical damage to every enemy champion.`

#### Garen
- Nội tại · Công Lý
  - VI: `Đòn đánh và chiêu của Garen gây thêm 15% sát thương cho mỗi hạng mục phe địch đang Dẫn Trước (tối đa +45%).`
  - EN: `Garen's attacks and skills deal 15% more damage for each category in which the enemy side is Ahead (max +45%).`
- Q · Đòn Quyết Định
  - VI: `Chọn tướng địch đối diện Garen; gây {40 + 60% AD + 20% AP} sát thương vật lý. Nếu nó đeo nhiều đồ hơn Garen: Câm Lặng nó 1 lượt.`
  - EN: `Choose the enemy champion opposite Garen; deal {40 + 60% AD + 20% AP} physical damage. If it has more items than Garen: Silence it for 1 turn.`
- E · Phán Xét
  - VI: `Chọn tướng địch đối diện Garen; gây {35 + 50% AD} sát thương vật lý lên nó và tướng địch ở 2 đường kề. Nếu bạn đang Thua Mạng: Garen nhận Khiên {40 + 6% máu tối đa}.`
  - EN: `Choose the enemy champion opposite Garen; deal {35 + 50% AD} physical damage to it and to the enemy champions in the 2 adjacent lanes. If you are Behind: Garen gains a Shield of {40 + 6% max HP}.`
- R · Công Lý Demacia
  - VI: `Chọn 1 tướng địch; gây {90 + 60% AD} + 60 mỗi món đồ nó đeo, sát thương chuẩn. Nếu lá này hạ gục khi bạn đang Thua Mạng: lật thêm 1 Lá Thưởng.`
  - EN: `Choose 1 enemy champion; deal {90 + 60% AD} + 60 per item it has, true damage. If this card scores a takedown while you are Behind: flip 1 extra Prize Card.`

#### Yorick
- Nội tại · Người Chăn Hồn
  - VI: `Cuối lượt của bạn: nếu Thây Ma Sương Mù của Yorick đang ở ô phụ, nó +1 sức đánh vĩnh viễn mỗi Linh Hồn, đánh thường tướng địch máu thấp nhất, rồi mất 1 lượt tồn tại.`
  - EN: `At the end of your turn: if Yorick's Mist Walker is in the extra slot, it gains +1 attack permanently per Soul, attacks the lowest-HP enemy champion, then loses 1 turn of duration.`
- Q · Nghi Thức Cuối
  - VI: `Chọn tướng địch đối diện Yorick; gây {40 + 70% AD} sát thương vật lý, rồi Đốt 2 lá trên cùng bộ bài của bạn. Mỗi lá Yorick bị Đốt: Yorick hồi {20 + 4% máu cộng thêm}.`
  - EN: `Choose the enemy champion opposite Yorick; deal {40 + 70% AD} physical damage, then Mill the top 2 cards of your own deck. For each Yorick card milled: Yorick heals {20 + 4% bonus HP}.`
- E · Sương Sầu
  - VI: `Chọn 1 tướng địch; gây {30 + 50% AD} sát thương vật lý và Rã Giáp nó 1 lượt. Nếu Thây Ma Sương Mù đang ở ô phụ: nó đánh thường tướng đó ngay.`
  - EN: `Choose 1 enemy champion; deal {30 + 50% AD} physical damage and apply Armor Shred to it for 1 turn. If the Mist Walker is in the extra slot: it attacks that champion at once.`
- R · Khúc Ai Ca Quần Đảo
  - VI: `Gọi Thây Ma Sương Mù vào ô phụ (thay Vật Triệu Hồi cũ): máu 150 + 20 mỗi lá trong mộ bài của bạn, sức đánh 30 + 10 mỗi Linh Hồn; tồn tại 3 lượt của bạn. Nếu bạn có từ 4 Linh Hồn: nó là Máu Ảo của Yorick.`
  - EN: `Summon the Mist Walker to the extra slot (replacing the old Summon): HP 150 + 20 per card in your graveyard, attack 30 + 10 per Soul; it lasts 3 of your turns. If you have 4 or more Souls: it is Soak for Yorick.`

#### Gangplank
- Nội tại · Thuốc Súng Bilgewater
  - VI: `Đầu lượt của bạn: Thùng Thuốc Súng của Gangplank +1 Thuốc Súng. Khi Gangplank hạ gục 1 tướng địch: tạo 1 lá Vàng lên tay bạn. Chiêu và Thùng Thuốc Súng của Gangplank gây thêm 8% sát thương mỗi món đồ Gangplank đeo.`
  - EN: `At the start of your turn: Gangplank's Powder Keg gains +1 Powder. When Gangplank takes down an enemy champion: create 1 Gold card in your hand. Gangplank's skills and Powder Keg deal 8% more damage per item he has.`
- Q · Bắn Một Phát
  - VI: `Chọn 1 tướng địch hoặc Thùng Thuốc Súng của bạn; tướng địch: gây {40 + 80% AD} sát thương vật lý (chí mạng theo tỉ lệ chí mạng của Gangplank). Thùng: Kích Nổ Thùng; thùng thật gây {55 + 40% AD} + {35 + 20% AD} mỗi Thuốc Súng sát thương vật lý lên mọi tướng địch. Nếu lá này hạ gục 1 tướng địch: nó quay về tay.`
  - EN: `Choose 1 enemy champion or your Powder Keg; champion: deal {40 + 80% AD} physical damage (can crit with Gangplank's crit chance). Keg: Detonate Keg; a real keg deals {55 + 40% AD} + {35 + 20% AD} per Powder physical damage to every enemy champion. If this card scores a takedown: it returns to your hand.`
- E · Thùng Thuốc Súng
  - VI: `Bạn chưa có Thùng Thuốc Súng trên sân; Úp 1 lá khác trên tay thành Thùng Thuốc Súng ở ô phụ. Nếu Gangplank đeo từ 2 món đồ: Thùng ra sân với 1 Thuốc Súng.`
  - EN: `You have no Powder Keg on the board; place 1 other card from your hand Face-down as a Powder Keg in the extra slot. If Gangplank has 2 or more items: the keg enters with 1 Powder.`
- R · Mưa Đại Bác
  - VI: `Kích Nổ Thùng của bạn (nếu có); rồi bắn 1 đợt, thêm 1 đợt mỗi món đồ Gangplank đeo: mỗi đợt gây {25 + 25% AD + 30% AP} sát thương vật lý lên mọi tướng địch.`
  - EN: `Detonate Keg if you have one; then fire 1 wave, plus 1 wave per item Gangplank has: each wave deals {25 + 25% AD + 30% AP} physical damage to every enemy champion.`

### Nhóm C

#### Leona
- Nội tại · Ánh Dương
  - VI: `Khi 1 đồng minh khác của Leona (kể cả Vật Triệu Hồi) gây sát thương bằng đòn đánh hoặc chiêu lên tướng có Ánh Dương: mọi Ánh Dương trên nó nổ, mỗi dấu gây {45 + 60% Giáp + 20% AP} sát thương phép. Nếu nổ đủ 3 dấu: Choáng nó 1 lượt.`
  - EN: `When another ally of Leona (Summons included) damages a champion with Sunlight using an attack or skill: all its Sunlight detonates, each deals {45 + 60% Armor + 20% AP} magic damage. If 3 detonate: Stun it for 1 turn.`
- Q · Khiên Bình Minh
  - VI: `Chọn tướng địch đối diện Leona; Leona đánh thường nó (Đòn Miễn Phí) thêm {50 + 40% AP} sát thương phép, rồi +2 Ánh Dương. Nếu nó đã có Ánh Dương từ trước: Choáng nó 1 lượt.`
  - EN: `Choose the enemy champion opposite Leona; Leona attacks it (Free Attack) for {50 + 40% AP} bonus magic damage, then +2 Sunlight. If it already had Sunlight: Stun it for 1 turn.`
- E · Thiên Đỉnh Kiếm
  - VI: `Chọn 1 tướng địch; Leona chuyển sang đường đối diện nó, gây {60 + 40% AP} sát thương phép và +1 Ánh Dương. Nếu nó đã có Ánh Dương từ trước: Choáng nó 1 lượt.`
  - EN: `Choose 1 enemy champion; Leona moves to the lane opposite it, deals {60 + 40% AP} magic damage and +1 Sunlight. If it already had Sunlight: Stun it for 1 turn.`
- R · Thái Dương Hạ San
  - VI: `Chọn tối đa 3 tướng địch; gây {120 + 40% AP} sát thương phép và chất đầy 3 Ánh Dương. Tướng đã có Ánh Dương từ trước: Choáng 1 lượt.`
  - EN: `Choose up to 3 enemy champions; deal {120 + 40% AP} magic damage and fill them to 3 Sunlight. Those that already had Sunlight: Stun for 1 turn.`

#### Malphite
- Nội tại · Khiên Đá Granite
  - VI: `Đầu lượt của bạn: nếu Malphite không có Khiên, nó nhận Khiên {200% Giáp}.`
  - EN: `At the start of your turn: if Malphite has no Shield, he gains a Shield of {200% Armor}.`
- Q · Mảnh Chấn Địa
  - VI: `Chọn 1 tướng địch; gây {30 + 80% Giáp + 30% AP} sát thương phép và Rã Giáp nó 1 lượt. Nếu Giáp của nó thấp hơn Giáp của Malphite: +50% sát thương.`
  - EN: `Choose 1 enemy champion; deal {30 + 80% Armor + 30% AP} magic damage and apply Armor Shred to it for 1 turn. If its Armor is lower than Malphite's: +50% damage.`
- E · Hoá Đá
  - VI: `Bạn có thể bỏ 1 lá Đồ; nếu bỏ, Malphite +10 giáp và kháng phép vĩnh viễn (tối đa +60). Rồi Malphite nhận Khiên {120% Giáp}. Nếu Malphite đeo từ 2 món đồ: Khiên gấp đôi.`
  - EN: `You may discard 1 Component card; if you do, Malphite gains +10 Armor and MR permanently (max +60). Then Malphite gains a Shield of {120% Armor}. If Malphite has 2 or more items: double Shield.`
- R · Lao Thẳng
  - VI: `Không Thể Bị Nối Chuỗi. Mọi tướng địch nhận {40 + 120% Giáp + 30% AP} sát thương phép và bị Choáng 1 lượt. Nếu Malphite đang có Khiên: mỗi tướng còn nhận thêm sát thương phép bằng 50% lượng Khiên đó.`
  - EN: `Unchainable. Every enemy champion takes {40 + 120% Armor + 30% AP} magic damage and is Stunned for 1 turn. If Malphite has a Shield: each also takes bonus magic damage equal to 50% of that Shield.`

#### Ornn
- Nội tại · Lò Rèn Sống
  - VI: `Đầu lượt của bạn: nếu tay bạn có lá Vàng nhưng không có lá Đồ, tạo 1 lá Đồ (mảnh ngẫu nhiên) lên tay.`
  - EN: `At the start of your turn: if you hold a Gold card but no Component card, create 1 Component card (random) in your hand.`
- Q · Thổi Bễ
  - VI: `Tìm 1 lá Vàng (nếu tay chưa có Vàng) hoặc 1 lá Đồ (nếu đã có); Ornn nhận Khiên {40 + 8% máu cộng thêm + 30% AP}. Nếu sau đó tay bạn có ít nhất 2 Đồ và 1 Vàng: rút 1 lá.`
  - EN: `Search for 1 Gold card (if you hold no Gold) or 1 Component card (if you do); Ornn gains a Shield of {40 + 8% bonus HP + 30% AP}. If you then hold at least 2 Components and 1 Gold: draw 1 card.`
- E · Rèn Kiệt Tác
  - VI: `Bỏ 1 lá Vàng, chọn 1 tướng mình đang đeo đồ (Kiệt Tác chưa đủ +100%); nó +30% Kiệt Tác và Ornn nhận Khiên {40 + 30% AP}. Nếu nó đeo đủ 3 món: bạn rút 1 lá.`
  - EN: `Discard 1 Gold card and choose 1 allied champion with items (Masterwork below +100%); it gains +30% Masterwork and Ornn gains a Shield of {40 + 30% AP}. If it has 3 items: draw 1 card.`
- R · Lời Hiệu Triệu Thần Rèn
  - VI: `Chọn 1 tướng mình; Rèn Ngay 1 món cho nó, và nó nhận Khiên {60 + 10% máu cộng thêm + 30% AP}. Nếu nó đã đeo đủ 3 món: +30% Kiệt Tác thay vì món mới.`
  - EN: `Choose 1 allied champion; Instant Forge 1 item on it, and it gains a Shield of {60 + 10% bonus HP + 30% AP}. If it already has 3 items: +30% Masterwork instead of a new item.`

#### Katarina
- Nội tại · Tham Lam
  - VI: `Khi Katarina ra sân hoặc hồi sinh: cắm 1 Dao Găm ở đường của nó. Khi 1 tướng địch bị hạ trong lượt của bạn: lá Q hoặc E của Katarina vào mộ gần nhất quay về tay.`
  - EN: `When Katarina is summoned or respawns: place 1 Dagger in her lane. When an enemy champion is taken down during your turn: the Katarina Q or E card most recently put into your graveyard returns to your hand.`
- Q · Phi Dao
  - VI: `Chọn 1 tướng địch; gây {35 + 35% AD + 30% AP} sát thương phép và cắm 1 Dao Găm ở đường của nó. Nếu đường đó đã có Dao Găm: +50% sát thương (dao được làm mới).`
  - EN: `Choose 1 enemy champion; deal {35 + 35% AD + 30% AP} magic damage and place 1 Dagger in its lane. If that lane already had a Dagger: +50% damage (the Dagger is refreshed).`
- E · Thuấn Bộ
  - VI: `Chọn 1 đường có Dao Găm; Katarina chuyển sang đó (đổi chỗ với tướng mình nếu có), nhặt dao và gây {55 + 55% AD + 40% AP} sát thương phép lên tướng địch đối diện. Nếu Katarina vừa rời đường khác: cắm 1 Dao Găm ở đường cũ.`
  - EN: `Choose 1 lane with a Dagger; Katarina moves there (swapping with an ally if any), picks up the Dagger and deals {55 + 55% AD + 40% AP} magic damage to the opposing enemy champion. If Katarina left another lane: place 1 Dagger in the old lane.`
- R · Bông Sen Tử Thần
  - VI: `Mọi tướng địch nhận {40 + 25% AD + 25% AP} sát thương phép; tướng đứng ở đường có Dao Găm nhận thêm {60 + 40% AD + 35% AP}. Rồi nhặt mọi Dao Găm.`
  - EN: `Every enemy champion takes {40 + 25% AD + 25% AP} magic damage; those in a lane with a Dagger take {60 + 40% AD + 35% AP} more. Then pick up every Dagger.`

#### Kha'Zix
- Nội tại · Mối Đe Doạ Vô Hình
  - VI: `Đòn đánh và chiêu của Kha'Zix gây thêm 40% sát thương lên tướng Cô Lập, và thêm 12% sát thương mỗi bậc Tiến Hoá.`
  - EN: `Kha'Zix's attacks and skills deal 40% more damage to Isolated champions, and 12% more damage per Evolution level.`
- Q · Nếm Nỗi Sợ
  - VI: `Chọn 1 tướng địch; gây {30 + 55% AD + 20% AP} sát thương vật lý. Nếu nó Cô Lập: Rã Giáp nó 1 lượt.`
  - EN: `Choose 1 enemy champion; deal {30 + 55% AD + 20% AP} physical damage. If it is Isolated: apply Armor Shred to it for 1 turn.`
- E · Vồ Mồi
  - VI: `Chọn 1 tướng địch; Kha'Zix chuyển sang đường của nó (đổi chỗ với tướng mình nếu có), gây {30 + 45% AD} sát thương vật lý. Nếu nó Cô Lập: Kha'Zix Tàng Hình tới hết lượt kế tiếp của đối thủ.`
  - EN: `Choose 1 enemy champion; Kha'Zix moves to its lane (swapping with an ally if any) and deals {30 + 45% AD} physical damage. If it is Isolated: Kha'Zix gains Stealth until the end of the opponent's next turn.`
- R · Đột Kích Hư Không
  - VI: `Chọn 1 tướng địch và 1 đường trống phía nó; đẩy nó sang đường đó, gây {40 + 50% AD} sát thương vật lý, rồi Kha'Zix Tàng Hình tới hết lượt kế tiếp của đối thủ. Nếu Tiến Hoá đạt 3: Kha'Zix chuyển theo ra đối diện nó trước khi gây sát thương.`
  - EN: `Choose 1 enemy champion and 1 empty lane on its side; knock it into that lane, deal {40 + 50% AD} physical damage, then Kha'Zix gains Stealth until the end of the opponent's next turn. If Evolution is 3: Kha'Zix follows to stand opposite it before dealing damage.`

#### Qiyana
- Nội tại · Đặc Quyền Hoàng Gia
  - VI: `Nguyên Tố của Qiyana là lá trên cùng mộ bài của bạn. Khi 1 lá bị Đốt từ bộ bài của bạn: Qiyana nhận Khiên {40 + 30% AD}.`
  - EN: `Qiyana's Element is the top card of your graveyard. When a card is Milled from your deck: Qiyana gains a Shield of {40 + 30% AD}.`
- Q · Lưỡi Kiếm Nguyên Tố
  - VI: `Chọn 1 tướng địch; gây {45 + 65% AD + 20% AP} sát thương vật lý và áp Nguyên Tố hiện tại: Đá Choáng nó 1 lượt, Sông Buốt nó 2 lượt, Cỏ +40% sát thương.`
  - EN: `Choose 1 enemy champion; deal {45 + 65% AD + 20% AP} physical damage and apply your current Element: Rock Stuns it for 1 turn, River Chills it for 2 turns, Grass gives +40% damage.`
- E · Bẻ Cong Địa Hình
  - VI: `Lá này vào mộ trước; Đốt 1 lá trên cùng bộ bài của bạn (lá đó thành Nguyên Tố mới). Nếu lá bị Đốt là lá chiêu của Qiyana: nó quay về tay thay vì nằm trong mộ.`
  - EN: `This card goes to the graveyard first; Mill the top card of your deck (it becomes your new Element). If the Milled card is a Qiyana skill card: it returns to your hand instead of staying in the graveyard.`
- R · Màn Phô Diễn Tài Năng
  - VI: `Đốt 3 lá trên cùng bộ bài đối thủ; mọi tướng địch nhận {60 + 50% AD + 30% AP} sát thương vật lý và chịu hiệu ứng của mỗi Nguyên Tố khác nhau trong các lá vừa Đốt (Đá: Choáng 1 lượt, Sông: Buốt 2 lượt, Cỏ: +40% sát thương).`
  - EN: `Mill the top 3 cards of the opponent's deck; every enemy champion takes {60 + 50% AD + 30% AP} physical damage and suffers the effect of each different Element among the Milled cards (Rock: Stun 1 turn, River: Chill 2 turns, Grass: +40% damage).`

#### Ahri
- Nội tại · Mê Hoặc
  - VI: `Khi 1 tướng địch đang bị Quyến Rũ gây sát thương bằng chiêu hoặc đòn đánh lên phe bạn: phe bạn không mất máu hay Khiên; đồng đội máu thấp nhất của chính nó nhận đúng lượng đó (sát thương chuẩn), và Ahri hồi {20 + 15% AP}.`
  - EN: `When a Charmed enemy champion damages your side with a skill or attack: your side loses no HP or Shield; its own lowest-HP ally takes that amount instead (true damage), and Ahri heals {20 + 15% AP}.`
- Q · Quả Cầu Ma Thuật
  - VI: `Chọn 1 tướng địch; gây {75 + 50% AP} sát thương phép. Nếu nó đang bị Quyến Rũ: đối thủ bỏ 1 lá chiêu ngẫu nhiên trên tay.`
  - EN: `Choose 1 enemy champion; deal {75 + 50% AP} magic damage. If it is Charmed: the opponent discards 1 random skill card from their hand.`
- E · Hôn Gió
  - VI: `Chọn 1 tướng địch; gây {55 + 35% AP} sát thương phép, Quyến Rũ nó 1 lượt và Kéo nó; bạn Xem Tay đối thủ. Nếu nó vốn đứng đối diện Ahri: Quyến Rũ 2 lượt.`
  - EN: `Choose 1 enemy champion; deal {55 + 35% AP} magic damage, Charm it for 1 turn and Pull it; Reveal Hand of the opponent. If it was already opposite Ahri: Charm for 2 turns.`
- R · Phi Hồ Phi Thân
  - VI: `Chọn tối đa 3 tướng địch; gây {60 + 40% AP} sát thương phép và Quyến Rũ chúng 1 lượt; Kéo tướng được chọn đầu tiên. Tướng đang bị Quyến Rũ từ trước nhận ×1.5 sát thương.`
  - EN: `Choose up to 3 enemy champions; deal {60 + 40% AP} magic damage and Charm them for 1 turn; Pull the first one chosen. Those already Charmed take ×1.5 damage.`

#### Annie
- Nội tại · Bạn Gấu
  - VI: `Khi Tibbers nhận sát thương từ địch: Annie +1 Bốc Lửa (tối đa 3). Cuối lượt của bạn: Tibbers đánh thường tướng địch đối diện Annie (không có thì tướng địch máu thấp nhất).`
  - EN: `When Tibbers takes enemy damage: Annie gains +1 Blaze (max 3). At the end of your turn: Tibbers attacks the enemy champion opposite Annie (or the lowest-HP enemy champion if none).`
- Q · Thiêu Đốt
  - VI: `Chọn 1 tướng địch; gây {80 + 50% AP} + {25 + 15% AP} mỗi Bốc Lửa sát thương phép, rồi tiêu hết Bốc Lửa. Nếu tiêu đủ 3 Bốc Lửa: Choáng nó 1 lượt.`
  - EN: `Choose 1 enemy champion; deal {80 + 50% AP} + {25 + 15% AP} per Blaze magic damage, then spend all Blaze. If 3 Blaze were spent: Stun it for 1 turn.`
- E · Tibbers Ơi!
  - VI: `Nếu chưa có Tibbers: gọi Tibbers vào ô phụ ({300 + 60% AP} máu, sức đánh {60 + 40% AP}). Nếu Tibbers đã có mặt: Tibbers nhận Khiên {60 + 30% AP} và đánh thường ngay tướng địch đối diện Annie (không có thì máu thấp nhất).`
  - EN: `If Tibbers isn't out: summon Tibbers to the extra slot ({300 + 60% AP} HP, {60 + 40% AP} attack). If Tibbers is out: Tibbers gains a Shield of {60 + 30% AP} and attacks the enemy champion opposite Annie at once (or the lowest-HP one if none).`
- R · Tibbers Nổi Giận
  - VI: `Gọi Tibbers khổng lồ (gấp 2 máu, thay Vật Triệu Hồi cũ); Tibbers đánh thường mọi tướng địch 1 lần. Nếu Annie có đủ 3 Bốc Lửa: tiêu hết, và mỗi tướng bị đánh bị Choáng 1 lượt.`
  - EN: `Summon a giant Tibbers (2× HP, replacing the old Summon); Tibbers attacks every enemy champion once. If Annie has 3 Blaze: spend them all, and each champion hit is Stunned for 1 turn.`

### Nhóm D

#### Lissandra
- Nội tại · Băng Giá Vĩnh Cửu
  - VI: `Khi 1 tướng địch bị hạ trong lúc đang Buốt: bạn lật thêm 1 Lá Thưởng.`
  - EN: `When an enemy champion is taken down while Chilled: flip 1 extra Prize Card.`
- Q · Mảnh Băng
  - VI: `Quick (nối Chuỗi lên bất kỳ lá nào đối thủ đánh). Chọn 1 tướng địch; gây {160 + 50% AP} sát thương phép và Buốt nó tới hết lượt kế tiếp. Nếu nó đang Buốt từ trước: Câm Lặng nó 1 lượt.`
  - EN: `Quick (can chain onto any card the opponent plays). Choose 1 enemy champion; deal {160 + 50% AP} magic damage and Chill it until the end of the next turn. If it was already Chilled: Silence it for 1 turn.`
- E · Vòng Băng
  - VI: `Quick (nối Chuỗi khi 1 tướng địch đang Buốt đánh lá hoặc đòn đánh, và chỉ nhắm tướng đó). Chọn 1 tướng địch đang Buốt; gây {140 + 35% AP} sát thương phép và Choáng nó 1 lượt.`
  - EN: `Quick (can chain when a Chilled enemy champion plays a card or attacks, and then targets only that champion). Choose 1 Chilled enemy champion; deal {140 + 35% AP} magic damage and Stun it for 1 turn.`
- R · Quan Tài Băng
  - VI: `Quick, Chỉ Nối Chuỗi. Khi lá hoặc đòn đánh của địch nhắm đúng 1 tướng mình: Vô Hiệu lá đó; kẻ tung nhận {200 + 40% AP} sát thương phép và bị Buốt tới hết lượt kế tiếp. Nếu kẻ tung đang Buốt từ trước: Choáng nó.`
  - EN: `Quick, Chain Only. When an enemy card or attack targets exactly 1 of your champions: Negate it; the caster takes {200 + 40% AP} magic damage and is Chilled until the end of the next turn. If the caster was already Chilled: Stun it.`

#### Lux
- Nội tại · Chiếu Sáng
  - VI: `Khi Lux hoặc đồng minh gây sát thương bằng chiêu hoặc đòn đánh lên tướng địch có Chiếu Sáng: tiêu dấu; Lux gây thêm {30 + 35% AP} sát thương phép lên nó.`
  - EN: `When Lux or an ally damages an enemy champion with Illumination using a skill or attack: consume the mark; Lux deals {30 + 35% AP} bonus magic damage to it.`
- Q · Khoá Ánh Sáng
  - VI: `Chọn tối đa 2 tướng địch; gây {65 + 50% AP} sát thương phép, rồi Chiếu Sáng chúng. Tướng đã có Chiếu Sáng từ trước: Choáng 1 lượt.`
  - EN: `Choose up to 2 enemy champions; deal {65 + 50% AP} magic damage, then give them Illumination. Those that already had Illumination: Stun for 1 turn.`
- E · Quả Cầu Ánh Sáng
  - VI: `Chọn tối đa 3 tướng địch; gây {35 + 25% AP} sát thương phép, rồi Chiếu Sáng chúng. Nếu sau khi đánh lá này tay bạn còn từ 5 lá: trúng mọi tướng địch.`
  - EN: `Choose up to 3 enemy champions; deal {35 + 25% AP} magic damage, then give them Illumination. If you still hold 5 or more cards after playing this: hit every enemy champion.`
- R · Cầu Vồng Tối Thượng
  - VI: `Với mỗi tướng địch: tiêu Chiếu Sáng trên nó (nếu có) để gây {30 + 35% AP} ×2 sát thương phép, rồi gây {110 + 60% AP} sát thương phép. Nếu tiêu từ 3 Chiếu Sáng: bạn rút 2 lá.`
  - EN: `For each enemy champion: consume its Illumination (if any) to deal {30 + 35% AP} ×2 magic damage, then deal {110 + 60% AP} magic damage. If 3 or more Illuminations were consumed: draw 2 cards.`

#### Ashe
- Nội tại · Băng Tiễn
  - VI: `Khi đòn đánh của Ashe trúng 1 tướng: Buốt nó tới hết lượt kế tiếp. Cuối lượt của bạn: với mỗi tướng địch đang Buốt, nếu lá trên cùng bộ bài đối thủ là lá chiêu thì Chôn lá đó.`
  - EN: `When Ashe's attack hits a champion: Chill it until the end of the next turn. At the end of your turn: for each Chilled enemy champion, if the top card of the opponent's deck is a skill card, Bury it.`
- Q · Mưa Tên
  - VI: `Chọn tối đa 3 tướng địch; gây {20 + 60% AD} sát thương vật lý và Buốt chúng tới hết lượt kế tiếp. Nếu bộ bài đối thủ ít lá hơn bộ bài của bạn: trúng mọi tướng địch.`
  - EN: `Choose up to 3 enemy champions; deal {20 + 60% AD} physical damage and Chill them until the end of the next turn. If the opponent's deck has fewer cards than yours: hit every enemy champion.`
- E · Ưng Thần
  - VI: `Chọn 1 tướng địch; gây {15 + 30% AD} sát thương vật lý và Buốt nó tới hết lượt kế tiếp. Xem 3 lá trên cùng bộ bài đối thủ: Chôn mọi lá chiêu, các lá khác (kể cả Nấm Độc) giữ trên cùng. Nếu Chôn từ 2 lá: bạn rút 1 lá.`
  - EN: `Choose 1 enemy champion; deal {15 + 30% AD} physical damage and Chill it until the end of the next turn. Look at the top 3 cards of the opponent's deck: Bury every skill card, keep the others (Toxic Mushrooms included) on top. If 2 or more were Buried: draw 1 card.`
- R · Mũi Tên Pha Lê
  - VI: `Chọn 1 tướng địch; gây {100 + 80% AD + 40% AP} sát thương vật lý và Choáng nó 1 lượt. Nếu nó đang Buốt: Choáng 2 lượt, và Chôn 1 lá chiêu ngẫu nhiên trên tay đối thủ.`
  - EN: `Choose 1 enemy champion; deal {100 + 80% AD + 40% AP} physical damage and Stun it for 1 turn. If it is Chilled: Stun for 2 turns, and Bury 1 random skill card from the opponent's hand.`

#### Jinx
- Nội tại · Phấn Khích!
  - VI: `Khi 1 tướng địch bị hạ trong lượt của bạn: Jinx nhận Phấn Khích và 1 Đòn Miễn Phí; bạn rút 1 lá.`
  - EN: `When an enemy champion is taken down during your turn: Jinx gets Excited and gains 1 Free Attack; draw 1 card.`
- Q · Tráo Súng: Cá Mập
  - VI: `Chọn 1 tướng địch; gây {30 + 70% AD} sát thương vật lý. Với mỗi món đồ Jinx đeo: 1 tướng địch khác (ít máu nhất trước) nhận 50% lượng đó. Nếu Jinx đang Phấn Khích: bạn rút 1 lá.`
  - EN: `Choose 1 enemy champion; deal {30 + 70% AD} physical damage. For each item Jinx has: 1 other enemy champion (fewest HP first) takes 50% of that. If Jinx is Excited: draw 1 card.`
- E · Nạp Đạn Pow-Pow
  - VI: `Tìm 1 lá Đánh thường; đòn đánh kế tiếp của Jinx gây thêm {20 + 40% AD} sát thương vật lý. Nếu Jinx đeo từ 2 món đồ: Tìm 2 lá Đánh thường.`
  - EN: `Search for 1 Strike; Jinx's next attack deals {20 + 40% AD} bonus physical damage. If Jinx has 2 or more items: Search for 2 Strikes.`
- R · Tên Lửa Đạn Đạo Siêu Khủng Khiếp!
  - VI: `Chọn 1 tướng địch; gây {120 + 110% AD} + 20% máu đã mất của nó, sát thương vật lý; tướng địch ở 2 đường kề nhận 50% của {120 + 110% AD}. Mỗi món đồ Jinx đeo: +15% sát thương.`
  - EN: `Choose 1 enemy champion; deal {120 + 110% AD} + 20% of its missing HP as physical damage; enemy champions in the 2 adjacent lanes take 50% of {120 + 110% AD}. Each item Jinx has: +15% damage.`

#### Vayne
- Nội tại · Mũi Tên Bạc
  - VI: `Khi đòn đánh của Vayne trúng 1 tướng: +1 Mũi Bạc trên nó. Mũi thứ 3 nổ: 12% máu tối đa của nó + {30 + 20% AD} sát thương chuẩn.`
  - EN: `When Vayne's attack hits a champion: it gains 1 Silver Bolt. The 3rd bolt bursts: 12% of its max HP + {30 + 20% AD} true damage.`
- Q · Lộn Nhào
  - VI: `Chọn 1 tướng địch; Vayne đánh thường nó (Đòn Miễn Phí, 60% sát thương) thêm {40 + 50% AD + 20% AP} sát thương vật lý. Nếu nó là Đỡ Đòn: +1 Mũi Bạc.`
  - EN: `Choose 1 enemy champion; Vayne attacks it (Free Attack, 60% damage) for {40 + 50% AD + 20% AP} bonus physical damage. If it is a Tank: +1 Silver Bolt.`
- E · Kết Án
  - VI: `Chọn 1 tướng địch; gây {35 + 50% AD + 20% AP} sát thương vật lý, +1 Mũi Bạc, rồi đẩy nó 1 đường ra phía mép bàn (đường giữa đẩy sang trái; có đồng đội của nó thì đổi chỗ). Nếu phía đó là mép bàn hoặc đường chưa mở: nó bị ghim vào tường, và nếu đã mang Mũi Bạc từ trước thì Choáng 1 lượt.`
  - EN: `Choose 1 enemy champion; deal {35 + 50% AD + 20% AP} physical damage, +1 Silver Bolt, then push it 1 lane toward the board edge (the middle lane pushes left; an ally of it there swaps places). If that side is the edge or a closed lane: it is pinned to the wall, and if it already had a Silver Bolt, Stun it for 1 turn.`
- R · Giờ Khắc Cuối Cùng
  - VI: `Có ít nhất 1 tướng địch mang Mũi Bạc; mọi Mũi Bạc trên tướng địch nổ ngay (mỗi tướng nổ 1 lần dù có 1 hay 2 mũi), rồi Vayne Tàng Hình tới hết lượt kế tiếp của đối thủ.`
  - EN: `At least 1 enemy champion has a Silver Bolt; every Silver Bolt on enemy champions bursts at once (once per champion, whether it has 1 or 2), then Vayne gains Stealth until the end of the opponent's next turn.`

#### Janna
- Nội tại · Mắt Gió
  - VI: `Khi đòn đánh của địch nhắm 1 tướng mình bị trượt vì Mù: tướng đó nhận Khiên {60 + 30% AP}.`
  - EN: `When an enemy attack aimed at one of your champions misses because of Blind: that champion gains a Shield of {60 + 30% AP}.`
- Q · Gió Lốc
  - VI: `Chọn 1 tướng địch; gây {70 + 40% AP} sát thương phép và Mù 1. Nếu nó là Xạ Thủ hoặc Sát Thủ: Mù 2.`
  - EN: `Choose 1 enemy champion; deal {70 + 40% AP} magic damage and Blind 1. If it is a Marksman or Assassin: Blind 2.`
- E · Mắt Bão
  - VI: `Chọn 1 tướng mình; nó nhận Khiên {80 + 40% AP} và 1 Đòn Miễn Phí. Nếu tướng địch đối diện nó đang Mù: Khiên +50%.`
  - EN: `Choose 1 allied champion; it gains a Shield of {80 + 40% AP} and 1 Free Attack. If the enemy champion opposite it is Blinded: +50% Shield.`
- R · Gió Mùa
  - VI: `Mọi tướng mình hồi {90 + 40% AP}; mọi tướng địch bị Mù 1. Nếu bạn còn từ 3 mạng trở xuống: Mù 2.`
  - EN: `Every allied champion heals {90 + 40% AP}; every enemy champion suffers Blind 1. If you have 3 lives or fewer: Blind 2.`

#### Brand
- Nội tại · Bùng Cháy
  - VI: `Đầu lượt của đối thủ: mỗi tướng địch nhận {50 + 8% AP} sát thương phép cho mỗi Bỏng trên nó. Khi 1 tướng địch đang Bỏng bị hạ: toàn bộ Bỏng của nó lan sang tướng địch máu thấp nhất ở đường kề.`
  - EN: `At the start of the opponent's turn: each enemy champion takes {50 + 8% AP} magic damage per Burn on it. When a Burning enemy champion is taken down: all its Burn spreads to the lowest-HP enemy champion in an adjacent lane.`
- Q · Thiêu Rụi
  - VI: `Chọn 1 tướng địch; gây {100 + 40% AP} sát thương phép và +2 Bỏng. Nếu nó đang Bỏng từ trước: Choáng nó 1 lượt.`
  - EN: `Choose 1 enemy champion; deal {100 + 40% AP} magic damage and +2 Burn. If it was already Burning: Stun it for 1 turn.`
- E · Hoả Ngục
  - VI: `Chọn 1 tướng địch đang Bỏng; gỡ mọi Bỏng của nó, gây {75 + 25% AP} sát thương phép mỗi Bỏng đã gỡ. Nếu gỡ từ 3 Bỏng: mỗi tướng địch ở đường kề nó +2 Bỏng.`
  - EN: `Choose 1 Burning enemy champion; remove all its Burn, dealing {75 + 25% AP} magic damage per Burn removed. If 3 or more were removed: each enemy champion in an adjacent lane gains +2 Burn.`
- R · Bão Lửa
  - VI: `Mọi tướng địch nhận {90 + 30% AP} sát thương phép và +2 Bỏng; tướng đang Bỏng từ trước +3 Bỏng thay vì 2.`
  - EN: `Every enemy champion takes {90 + 30% AP} magic damage and +2 Burn; those already Burning gain +3 Burn instead.`

#### Renata Glasc
- Nội tại · Cứu Trợ
  - VI: `Khi 1 tướng mình khác Renata sắp bị hạ: nó còn 1 máu và nhận Cứu Trợ.`
  - EN: `When an allied champion other than Renata would be taken down: it is left at 1 HP and gains Bailout.`
- Q · Bắt Tay
  - VI: `Chọn 1 tướng địch; Kéo nó, gây {60 + 40% AP} sát thương phép và Choáng nó 1 lượt. Nếu bạn đang Thua Mạng: Cướp 1 lá ngẫu nhiên trên tay đối thủ.`
  - EN: `Choose 1 enemy champion; Pull it, deal {60 + 40% AP} magic damage and Stun it for 1 turn. If you are Behind: Steal 1 random card from the opponent's hand.`
- E · Gói Cứu Trợ
  - VI: `Chọn 1 tướng mình; nó nhận Khiên {40 + 30% AP} + 20% máu nó đã mất, và Cường Hoá tới hết lượt kế tiếp của đối thủ. Nếu nó dưới 40% máu hoặc đang Cứu Trợ: nó nhận 1 Đòn Miễn Phí.`
  - EN: `Choose 1 allied champion; it gains a Shield of {40 + 30% AP} + 20% of its missing HP, and is Empowered until the end of the opponent's next turn. If it is below 40% HP or has Bailout: it gains 1 Free Attack.`
- R · Thâu Tóm
  - VI: `Mọi tướng địch Nổi Điên: lần lượt mỗi tướng đánh thường (Đòn Miễn Phí, theo vai, đồ, chí mạng, hút máu) 1 đồng đội của chính nó (ưu tiên đường kề, rồi máu thấp nhất; không còn ai thì tự đánh mình). Nếu bạn đang Thua Mạng: mỗi tướng đánh 2 lần.`
  - EN: `Every enemy champion goes Berserk: one by one, each makes a full attack (Free Attack, with its role, items, crits and life steal) on one of its own allies (adjacent lane first, then lowest HP; if alone, it hits itself). If you are Behind: each attacks twice.`

## 5. Ghi chú cho agent code chữ
- Mỗi agent nhóm A/B/C/D: chép VI vào `desc` (giữ `${HẰNG_SỐ}` đúng như code), EN vào file `i18n/en_g*.ts` tương ứng, từ khoá vào `keywords/<nhóm>.ts`. GENERAL do agent lead/đồ chép.
- Không đổi `name` chiêu/nội tại, `target`, hay logic. Nếu thấy chữ lệch code ở chỗ nào, **sửa chữ theo code**, không sửa code theo chữ.
- Bảng trạng thái `STATUS_EN` và tên VI trạng thái nên trùng tên glossary (vd `shred` → "Rã Giáp" / "Armor Shred", `bleed` → "Chảy Máu" / "Bleed").
- Sau khi chép: chạy `checkTranslations()` (EN và VI phải có cùng tập `{công thức}`), rồi grep `\*\*` trong `heroes/*.ts` để chắc đã bỏ hết in đậm.
