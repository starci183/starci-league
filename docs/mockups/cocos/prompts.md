# Prompt set — StarCi mockup Cocos

Công cụ: imagegen tích hợp; không dùng CLI/API. Thứ tự: auth → decks → builder → card-anatomy (một lượt hiệu chỉnh) → menu.

Mọi trang được imagegen vẽ toàn trang. Sau đó chỉ nội suy tới 1920×1080 bằng bicubic chất lượng cao; mockup lưu PNG, nền lưu JPG quality 90. Không ghép chữ/khung bằng code. Không tạo 9-slice.

## auth

```text
Use case: ui-mockup
Asset type: first finished full-page painted game UI screenshot, auth.png, exact 16:9 landscape composition for 1920×1080. Create ONE single page, edge-to-edge, no device mockup, no contact sheet.
Primary request: design and paint a polished original StarCi League authentication screen, displaying the ĐĂNG KÝ state. This is production art direction for a Vietnamese fantasy strategy card game. Prioritize crisp, correctly accented Vietnamese text, beautifully restrained antique gold chamfered frames, impeccable spacing and usable hierarchy.

Shared world/background, to remain IDENTICAL in the next two screenshots: original ancient stone summoning academy hall at night, seen straight ahead in wide cinematic perspective; a tall pointed arch precisely at the horizontal center opens on distant stars and a faint cloudy teal nebula. Slender carved dark stone pillars near both extreme edges, small antique gold lanterns at the far left and right, a low stone balustrade at the back. A faint recessed nonlinguistic teal rune on the left stone floor and subtle right-edge shelves. Floor is deep midnight navy, central 65% quiet dark empty negative space. The background is an atmospheric architectural painting, not a battlefield, not an arena, not a map. Recognizable architectural landmarks visible around the UI; do not surround the page with a UI border. No characters.

Composition: generous safe margins around all UI, balanced 44% left brand area and 40% right form. Left brand block at x≈270, y≈310: a small original geometric compass/star crest, below it the large refined serif title on two lines “STARCI” / “LEAGUE”, thin gold dividers, exact small subtitle “Game bài chiến thuật 1v1, 5 đường”. The painted world remains prominent below the brand. Right form panel at x≈1110–1680, y≈180–900: near-black navy lacquer, fine continuous antique gold chamfered perimeter and inner rail, sober ornamental top crest. A two-tab bar “ĐĂNG NHẬP” and “ĐĂNG KÝ”, registration tab active with a crisp teal underline. Three tall labelled form fields, each fully framed within panel and no clipping: “Tên hiển thị”, value “Lữ Khách”; “Email”, value “lukhach@example.com”; “Mật khẩu”, masked round dots and a small eye icon. Display name belongs to registration, correct. Under fields a reserved slim muted red error row with a tiny warning icon and exact text “Email này đã được sử dụng.”. Below a large luminous teal main action with fine gold rim, label “TẠO TÀI KHOẢN”. At panel bottom a quiet text link “Đã có tài khoản? ĐĂNG NHẬP”. No extra form fields, no social login, no real-world brands.
All typography clear and large at 1920×1080; headings elegant uppercase Vietnamese-supporting serif, field labels readable refined text; text warm ivory #f0e6d2, quiet text #879aa9. Palette midnight navy #010a13 #0a1428, antique gold #c8aa6e #785a28, restrained teal #0ac8b9 for active/focus/action. Cinematic fantasy painting, intricate but THIN frames, no excessive filigree, no muddy type, no bloom over text. All UI front-on and perfectly legible.
Constraints: original StarCi design. Do not imitate any existing game's logos, locations, characters, frame silhouettes or interface. No Riot or League of Legends imagery. No code. No 9-slice asset sheet. This is one full page AUTH screenshot, not a wireframe. Render every quoted text exactly with Vietnamese diacritics.
```

## decks

```text
Use case: ui-mockup
Asset type: decks.png — ONE finished full-page 1920×1080 landscape game UI screenshot, 16:9, front-on, edge-to-edge; no device framing or multiple screenshots.
Input image 1: AUTH screenshot, exact shared background and material/style reference. Replace all its foreground brand/form UI with a new deck collection page, retaining the SAME architecture, camera, proportions, floor, arch, pillars, nebula, banners, lanterns, shelves, left floor rune and lighting at exactly the same locations. Do not draw a different room. A small masthead replaces the huge auth logo. UI is crisp original StarCi design.

Page structure:
Top masthead y≈30–132, dark translucent navy band, fine gold bottom rail: small original star-compass crest and “STARCI LEAGUE” at left; page title “BỘ BÀI” prominent center-left; right a small abstract star avatar, player name “Lữ Khách”, and framed “ĐĂNG XUẤT” action.
Below, generous collection heading “BỘ BÀI CỦA BẠN” and small “Chọn bộ bài cho trận đấu tiếp theo.”. A subtle gold separator. Main collection as a spacious single horizontal row of 3 large collectible deck cases and one empty-create case; consistent outer sizes and level baselines around y≈270–845. Keep case art top 58%, title/info and all actions integrated in its base, not detached text boxes. Each deck case physically resembles a stack of REAL portrait fantasy playing cards with 5:7 faces, fine antique gold chamfered frames, large painted art window, ivory serif title ribbon, category line and small count badge. Elegant crafted collector objects, absolutely not plain placeholder rectangles.
Case 1: title “Bình Minh”, “80 lá”. Original art: a warm golden sword cutting a red ember arc, with small teal support cards fanned behind, no character. This is the selected case, restrained teal outline and exactly one slim glowing “ĐANG DÙNG” badge at its top. Below include 3 separate visible actions “SỬA”, “DÙNG”, “XOÁ”; DÙNG in this active case is subdued to show already using. All text correct.
Case 2: title “Thủy Triều”, “80 lá”. Original art: silver wave crest and a hovering aquamarine healing pearl, teal rune frame. Actions “SỬA”, “DÙNG”, “XOÁ”.
Case 3: title “Tinh Tú”, “80 lá”. Original art: blue steel equipment cards with a celestial staff and coin motifs, sapphire frame accents. Actions “SỬA”, “DÙNG”, “XOÁ”.
Case 4: quieter empty dark case, fine broken/etched gold border, a centered plus sign, exact label “+ BỘ MỚI”. Small text “Tạo bộ bài của riêng bạn”. No character or copied game artwork.
No other active/use badge anywhere. Below row place tasteful pagination centered at y≈950: left chevron, “1”, “2”, “3”, right chevron, with 1 selected teal. Small exact text “Trang 1 / 3” beneath. Enough negative space between case frames; all actions within safe areas. Environmental painting visible at edges and around collection, same as reference.
Palette midnight navy #010a13 #0a1428; thin antique gold #c8aa6e #785a28; ivory #f0e6d2; quiet slate #879aa9; luminous teal #0ac8b9 active/focus. Elegant uppercase Vietnamese-capable serif headings, highly readable secondary text. Cinematic painted fantasy with disciplined UI hierarchy, intricate fine frames, no noisy giant ornaments, no blur, no watermark. Every Vietnamese word and accent exactly as quoted.
Constraints: original StarCi artwork, no Riot/League of Legends logos, frames, icons, locations or characters, do not imitate another game's UI. Do not use battlefield artwork. No 9-slice assets. Retain identical menu backdrop from input.
```

## builder

```text
Use case: ui-mockup
Asset type: builder.png, ONE polished full-page 16:9 game screenshot for exact 1920×1080 stage. Front-on, no monitor, no collage. This is a dense but legible original Vietnamese trading-card deck builder. Paint the whole page at the highest text fidelity.

Input 1 = auth screenshot: EDIT TARGET for exact shared background; input 2 = decks screenshot: reference for same background, thin antique gold frames, palette, title typography and original StarCi art. Replace all foreground UI with the builder below. Keep the same camera, central stone pointed arch, navy starfield/teal nebula, far-left and far-right stone pillars, gold lanterns, hanging banners, right library, back balustrade, dark stone floor and teal rune at lower left. Do not relocate or repaint architecture. Keep the menu world dark behind the UI, no battlefield.

Layout at 1920×1080: disciplined 2-column workspace. Left library x≈42–1280, right current-deck panel x≈1320–1878. Top bar y≈28–105: small star-compass and “STARCI LEAGUE” at left; center title “XẾP BỘ BÀI”; “Lữ Khách” at right. Below y≈120–190 is a full-width toolbar: labelled inset editable field “Tên bộ bài” with value “Bình Minh”; large correct count “80 / 80”; four compact group totals “Đánh thường 16”, “Bổ trợ 18”, “Vàng 16”, “Đồ 30”. Valid deck count accented teal.
Left panel heading “KHO LÁ” and small “19 lá”. Immediately below one compact five-tab filter bar, exact labels: “TẤT CẢ” selected teal, “ĐÁNH THƯỜNG”, “BỔ TRỢ”, “VÀNG”, “ĐỒ”.
Library below is EXACTLY 19 separate real portrait playing cards in a neatly aligned 7-column × 3-row grid: seven in row 1, seven in row 2, five in row 3. Cards approx 160×224 reference pixels, 5:7 ratio, 16px gaps; rows approximately y=256–480, y=494–718, y=732–956. Do not turn them into square icons or text tiles. Every card has its own beautifully painted illustration filling top ~60%, fine chamfered themed frame, name ribbon in uppercase serif (wrap long names to 2 lines), readable small category label, a short description, and a small bottom-right n/max count badge. ALL content integrated inside card frame. No overlapping. Names must be correctly accented and visibly different, at least 13px at reference stage. Four differentiated frame materials: Đánh thường antique bronze/gold; Bổ trợ etched teal runes; Vàng pure gold with small embossed coin motifs; Đồ blue steel with small rivets and gold inner rail.
All 19 cards exactly in this order, no omission and no repetition:
1. "Đánh thường" — category "Đánh thường", badge "16/20", short description "Đòn đánh cơ bản."
2. "Rút Bài" — category "Bổ trợ", badge "2/6", short description "Rút thêm bài."
3. "Hồi Máu" — category "Bổ trợ", badge "3/6", short description "Hồi phục sinh lực."
4. "Tốc Biến" — category "Bổ trợ", badge "3/6", short description "Dịch chuyển chớp nhoáng."
5. "Thiêu Đốt" — category "Bổ trợ", badge "3/6", short description "Gây sát thương thiêu đốt."
6. "Kiệt Sức" — category "Bổ trợ", badge "2/6", short description "Làm suy yếu mục tiêu."
7. "Lá Chắn" — category "Bổ trợ", badge "3/6", short description "Tạo lá chắn bảo vệ."
8. "Thanh Tẩy" — category "Bổ trợ", badge "2/6", short description "Thanh tẩy hiệu ứng."
9. "Trừng Phạt" — category "Bổ trợ", badge "0/6", short description "Trừng phạt mục tiêu."
10. "Dịch Chuyển" — category "Bổ trợ", badge "0/6", short description "Dịch chuyển chiến thuật."
11. "Vàng" — category "Vàng", badge "16/16", short description "Tài nguyên vàng."
12. "Kiếm Dài" — category "Đồ", badge "4/6", short description "Mảnh trang bị."
13. "Gậy Quá Khổ" — category "Đồ", badge "4/6", short description "Mảnh trang bị."
14. "Cung Gỗ" — category "Đồ", badge "4/6", short description "Mảnh trang bị."
15. "Găng Đấu Tập" — category "Đồ", badge "4/6", short description "Mảnh trang bị."
16. "Giáp Lưới" — category "Đồ", badge "4/6", short description "Mảnh trang bị."
17. "Áo Choàng Bạc" — category "Đồ", badge "4/6", short description "Mảnh trang bị."
18. "Đai Khổng Lồ" — category "Đồ", badge "3/6", short description "Mảnh trang bị."
19. "Nước Mắt Nữ Thần" — category "Đồ", badge "3/6", short description "Mảnh trang bị."
Use original StarCi illustrations matching each concept: red-gold weapon strike; three fanning magical cards; healing pearl in an open metal chalice (NOT hands from existing game icons); a crack of lightning between two standing stones; small flame encircling dark crystal; violet draining wisps around a stone; translucent teal shield; cleansing silver droplets; a jagged beam into bare rock; two linked glowing doorways; stack of compass-stamped gold coins; distinct long sword with split diamond guard; angular oversized staff; simple wooden bow; leather sparring gauntlet; steel chain mesh; silver-blue folded cloak; broad rune belt; suspended blue teardrop gemstone. Original designs, never copy existing game's iconography.
States within grid: Hồi Máu slightly raised with restrained teal hover halo and bright 3/6 badge; Vàng at max has a small translucent “ĐỦ” ribbon, artwork/name remain readable; Trừng Phạt and Dịch Chuyển darkened because 80 slots already filled. Other existing counts visibly bright. Do not obscure names or numbers.

RIGHT current deck panel: dark navy, fine gold chamfered perimeter, heading “BỘ ĐANG XẾP”; small label “Bình Minh”. At upper part a compact elegant smooth distribution curve over four labelled ticks with values “16”, “18”, “16”, “30”, short captions “Đánh thường”, “Bổ trợ”, “Vàng”, “Đồ”. No invented mana curve. Under curve, four clearly separated gold group headers and slim horizontal miniature-card rows. Each row has small matching art thumbnail, exact name and right-aligned ×n. Use ~29px per row, align counts. This is an actual deck list, not plain unframed text. Include all seventeen positive-count entries (zero-count cards absent):
“ĐÁNH THƯỜNG · 16”: Đánh thường ×16.
“BỔ TRỢ · 18”: Rút Bài ×2; Hồi Máu ×3; Tốc Biến ×3; Thiêu Đốt ×3; Kiệt Sức ×2; Lá Chắn ×3; Thanh Tẩy ×2.
“VÀNG · 16”: Vàng ×16.
“ĐỒ · 30”: Kiếm Dài ×4; Gậy Quá Khổ ×4; Cung Gỗ ×4; Găng Đấu Tập ×4; Giáp Lưới ×4; Áo Choàng Bạc ×4; Đai Khổng Lồ ×3; Nước Mắt Nữ Thần ×3.
All 17 rows visible, no scroll clipping. Keep right list compact enough to end before y=970. Long names fit.
Bottom fixed bar y≈996–1056: left framed “QUAY LẠI”; adjacent quiet framed “BỘ MẶC ĐỊNH”; right prominent gold-edged “LƯU” then primary glowing teal “DÙNG”. All four visible.

Palette #010a13 #0a1428, thin #c8aa6e #785a28 gold, warm ivory #f0e6d2, teal #0ac8b9 for active actions/states. Cinematic painterly fantasy art, elegant uppercase serif headings with Vietnamese accents, readable refined body type. Sharp accurate typography takes priority over ornament. No bloom obscuring words. No decorative English labels. No game logo imitation, no Riot artwork, no real game characters, no 9-slice sheet, no code. This is the finished game screen, not annotated design. Keep the SAME shared menu background as both reference images.
```

## anatomy

```text
Use case: infographic-diagram
Asset type: card-anatomy.png — ONE polished painted 16:9 Vietnamese card anatomy and interaction sheet, intended 1920×1080. This is a finished visual reference sheet, not a 9-slice/sprite asset sheet.
Input image 1 = finished StarCi builder screenshot. Use its exact playing-card design language, ORIGINAL artwork, palette and typography as reference. We are creating a new diagram page, not editing the builder UI. Do not bring the room or header/navigation into this sheet.
Background: quiet near-black midnight navy #010a13 with extremely subtle engraved nonlinguistic lines, no environmental scene. Elegant thin gold separators. Generous margins, no clipped text.
Title across top left: “CẤU TRÚC LÁ BÀI”; small subtitle “STARCI LEAGUE”. Top right small note “TỶ LỆ 5:7”. All uppercase serif headings with correct Vietnamese diacritics, ivory #f0e6d2, body text clear.

Composition has three clear regions:
LEFT about 48% width: ONE large complete 5:7 HỒI MÁU card, ~340×476 pixels, positioned around x=330–670, y=240–716, with lavishly crisp teal/gold chamfered runic frame. Large art takes top ~60%: original luminous healing pearl floating over an ornate golden chalice, matching builder reference. Lower section has separate name ribbon “HỒI MÁU”, category line “Bổ trợ”, short description “Hồi phục sinh lực.” and bottom-right luminous copy badge “3/6”. This must be a proper full card; no diagram lines cross the card body.
Surround it with 6 fine gold leader lines and readable concise Vietnamese callouts, staggered left and right with comfortable separation:
“KHUNG VÁT GÓC” (points to chamfered gold/teal edge)
“Ô TRANH ~60%” (points to upper illustration)
“DẢI TÊN” (points to HỒI MÁU nameplate)
“LOẠI LÁ” (points to Bổ trợ line)
“MÔ TẢ NGẮN” (points to description area)
“SỐ BẢN n/max” (points to 3/6 badge).
Under the enlarged card a small exact caption “Lá đứng · Tỉ lệ 5:7”. Callouts use short labels only, no extra paragraphs.

UPPER RIGHT about x=990–1860,y=180–545: heading “BỐN KIỂU KHUNG”. A row of FOUR beautiful complete miniature portrait cards, exactly 5:7, same construction as the large card, approximately 185×259 each with space between:
1 “ĐÁNH THƯỜNG”, own red-gold blade illustration, antique bronze/gold frame, category “Đánh thường”, badge “16/20”; caption beneath “Vàng đồng”.
2 “HỒI MÁU”, same pearl/chalice art, teal engraved rune frame, category “Bổ trợ”, badge “3/6”; caption beneath “Xanh ngọc · Rune”.
3 “VÀNG”, own compass-stamped gold coin pile illustration, pure gold frame with coin ornaments, category “Vàng”, badge “16/16”; caption beneath “Vàng ròng · Đồng xu”.
4 “KIẾM DÀI”, own silver blade with original split diamond guard, blue steel frame with rivets and gold inner rail, category “Đồ”, badge “4/6”; caption beneath “Thép lam · Đinh tán”.
Above each small card the corresponding group heading, exact “Đánh thường”, “Bổ trợ”, “Vàng”, “Đồ”. Do not truncate group labels. Each is a full playing card with image + name + type + short description + count. No naked empty frame assets.

LOWER RIGHT x≈990–1860,y≈610–990: heading “TRẠNG THÁI TƯƠNG TÁC”. A row of FIVE complete small copies of the HỒI MÁU card, each 5:7, about144×202, with distinct labelled states and same art for fair comparison:
1 “THƯỜNG”: standard quiet frame, badge 3/6;
2 “RÊ CHUỘT”: raised slightly with restrained teal halo around outer frame, badge 3/6;
3 “ĐỦ TỐI ĐA”: slim translucent ribbon “ĐỦ” across card but title remains readable, badge 6/6;
4 “CÓ TRONG BỘ”: especially bright luminous copy badge 3/6, rest of frame quieter;
5 “KHÔNG THÊM ĐƯỢC”: whole card visibly dimmed, title readable, badge 0/6.
State labels under the card, two lines for longer labels, entirely within safe margins. No cards overlap.
No annotations in English, no fake paragraphs, no illegible tiny copy. Every quoted Vietnamese phrase rendered verbatim with correct accents. Clear visual hierarchy, thin antique gold #c8aa6e #785a28 frames, navy material, teal #0ac8b9 interaction, cinematic painted collectible-card art. This is the same StarCi playing-card system as the input. Original imagery only, no existing game icon/character/logo, no Riot artwork. Do not create 9-slice assets, loose UI corners or export diagrams. Paint one complete anatomy sheet.
```

## anatomy_refine

```text
Use case: precise-object-edit
Asset type: final card-anatomy.png technical illustration.
Input image is the edit target. Make ONE narrow geometry correction: the SINGLE ENLARGED HỒI MÁU CARD at LEFT is currently too tall/thin for its stated 5:7 ratio. Preserve its WIDTH and TOP position, and shorten ONLY its lower text-body section so its outer card silhouette has exact width:height = 5:7. In the input's 1672×941 coordinate system the main card outer body is approximately x=280–615; set its body top at y=214 and bottom at about y=683, width335 and height469. Keep its original upper pearl/chalice painting and name ribbon, do not crop the illustration. Compact and reposition the category, short description, badge and bottom ornament within the reduced lower section. The art window should fill ~60% of full card height. Preserve legible exact text “HỒI MÁU”, “Bổ trợ”, “Hồi phục sinh lực.”, “3/6”. Reconnect the nearby leader lines to the new type/description/badge positions and move the caption “Lá đứng · Tỉ lệ 5:7” beneath the corrected card with safe space.
INVARIANTS: preserve the page title, top-right ratio label, all callout words, original art design/palette, background, the entire four-frame panel at upper right, and the entire five-state panel at lower right exactly as in input. Do not change the right-hand mini cards or any text/numbers. Do not add any graphics or content. This is a precise correction to the large left card proportions, not a redesign. Every Vietnamese accent must remain unchanged. No 9-slice assets.
```

## menu

```text
Use case: precise-object-edit
Asset type: FINAL clean full-screen menu background artwork for StarCi League. Landscape 16:9, intended 1920×1080. One edge-to-edge painting.
Input image 1 is the AUTH screenshot, the edit target. Input image 2 is the DECKS screenshot, input image 3 is the BUILDER screenshot, supporting references showing the EXACT SAME shared menu hall. Remove ALL foreground interface elements from image 1 and reconstruct the hidden architecture/floor naturally. This is the LAST deliverable after the completed full-page mockups and card-anatomy sheet.

Remove completely: the large left StarCi crest/title/subtitle/dividers, the entire right login-registration panel, every frame, button, input field, icon, form label, letter, number, text or UI glow. No cards. No overlay. No artificial blank rectangle where the panel was.
PRESERVE the exact same straight-on wide camera, original StarCi ancient academy hall at night, architecture, stone textures, color grading and lighting. The tall pointed arch stays centered; distant starfield and the soft teal nebula stay in the same position and pattern. Keep the far left and far right carved dark pillars, hanging dark blue architectural banners with abstract nonlinguistic gold motifs, the two warm gold lanterns, right-side library/shelves and small brass armillary sphere, back stone balustrade, quiet midnight-blue stone floor with subtle reflections, and the partially visible glowing teal nonlinguistic compass/rune in the lower-left foreground. Do not add more props or characters. Reconstruct hidden right-side balustrade and stone floor consistently behind where the auth panel stood. Preserve the recognizable landmarks shared with the other screenshots.
Dark calm central 65%, uncluttered negative space suited to future UI panels. Atmospheric depth, architectural detail concentrated on extreme edges and distance, restrained gold lantern warmth and teal night light, original painterly fantasy concept art with cinematic finish. Near-black navy #010a13 #0a1428 dominates. No gameplay lanes, no arena/battlefield, no central platform or focal object, no new door or new viewpoint.
CRITICAL: absolutely NO TEXT, no letters, no numbers, no logo, no StarCi crest floating in space, no UI frame or border, no buttons, no panels, no cards, no watermark. The gold edging on physical architecture is allowed, but do not draw a surrounding rectangular UI frame. This must look like the identical underlying painting used in all three input screens, now clean and complete, with all UI removed. Original StarCi location, never copied from an existing game's scene.
```

