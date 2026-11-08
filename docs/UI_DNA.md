# Starci interface DNA

The approved visual direction (2026-11-03) is an original MOBA fantasy family: midnight navy, thin antique gold frames and luminous teal interaction states. The current match at `/vfx/examples/jinx-summon` and its Standby weapon picker remain the layout baseline. The old forest board is no longer the color or material standard; its layout remains the standard. Its previous specification is archived in [UI_DNA.forest.md](UI_DNA.forest.md).

## Bố cục

- Preserve the current layout exactly: positions, dimensions, region counts and order. Change color, material, frame treatment, typography and background artwork within those existing bounds. Do not redesign the layout or reuse the rejected mockup's layout.
- The template is [current-board.jpg](briefs/current-board.jpg), with detail in [current-board-zoom.png](briefs/current-board-zoom.png). Keep the two player HUDs at the top corners of the central region, all seven phases (Draw / Reward / Standby / Main 1 / Battle / Main 2 / End), round and turn below them; the selected champion inspector at left; battlefield and slim four-stack deck rail in the middle; chain, log, square reserve grid and existing actions at right; horizontal hand below. Preserve the inspector tabs, four skill rows and effect area. The reference state retains five reserve champions in a 3+2 grid and five hand cards.
- The board has five vertical lanes and ten empty champion slots, with enemy slots above and allied slots below a horizontal river. Keep the existing forest/rock dividers and outer frame. The two auxiliary summon platforms sit in the river, aligned with lanes 2 and 4. They are ancient stone daises with dark, flat, empty centers, subtle recessed teal runes/moss and water around the bases; no gold UI medallions or four-direction jewels on the platforms.
- The map artwork contains no text, champions, towers or monsters. Lane labels, summon labels and empty-state labels are live DOM overlays. Only the ground is dimmed; all labels remain readable above it.
- Preserve the locked 16:9 play surface; excess viewport is background. The mockups below are review artifacts. Keep the current `board5.jpg` path in game code until the approved phase-2 integration.

## Color, material and typography

1. Panel and page backgrounds use near-black midnight navy: `#010a13`, `#0a1428`, `#091428`. Replace the old forest emerald material. Quiet text uses cool slate `#879aa9`; important text uses warm ivory `#f0e6d2`.
2. Frames use thin antique gold `#c8aa6e`, shadow gold `#785a28` and highlights `#f0e6d2`, with chamfered corners and an inner rail. Allied outlines are blue; enemy outlines are red. Keep framing quieter than the portraits.
3. Selection, hover, focus and primary actions use luminous teal `#0ac8b9` / `#0397ab`. Disabled controls use subdued charcoal/navy. Keep state meanings consistent across buttons, tabs, cards and champion choices.
4. Headings use an uppercase serif with letter spacing and Vietnamese diacritics. Preserve the existing `--font-game-title` and `--font-game-text` font contracts (Alegreya, Vietnamese support). Body copy stays readable; all game labels remain live DOM text.

Create original artwork with the feel of the genre. Do not copy or trace Riot maps, frames, icons, logos or illustrations, and do not use Riot artwork as image-generation input. Illustrative champions in new mockups are original characters.

## Technical and component rules

- CanvasScaler foundation: `ui/GameCanvas.tsx` owns one **1920 × 1080 reference stage**. Physical viewports only apply a uniform `min(width / 1920, height / 1080)` scale and centered letterboxing. Never add physical viewport reflow to a game component. Use reference pixels or reference-stage container units. Size breakpoints use named `@container game-canvas`; gallery/example developer tooling remains physical-viewport UI.
- Game dialogs portal through `useGameOverlay()` into the reference-stage overlay. Body-portal flight sprites and Pixi VFX remain in physical viewport space. Convert measured viewport deltas by `gameCanvasScale(element)` before applying staged DOM transforms; convert tooltip anchor points with `viewportToCanvasPoint()`.
- New panels/cards assemble separate native PNG modules from `/ui/modular-mask-v1/` through `ArtFrame` and its alpha-derived manifest. Do not stretch a complete painted column or introduce new nine-slice layouts. Legacy forest rails retain their original art until individually migrated into the approved navy/gold/teal family; their old colors are not a reference for new assets.
- Buttons/tabs/nameplates use shared modular plaques with live DOM labels inside the actual painted safe area. Teal active/selected glow, charcoal disabled state, gold/teal focus outline. No browser-style pills or generic flat buttons.
- Shared icons: `ForestIcon` for switch/standby/lock, existing `GameIcon` for semantic actions. Avoid emoji and arbitrary Unicode symbols for game controls.
- Scroll: reuse `ui/ScrollArea.tsx`; custom DOM rail/thumb/arrows, no exposed browser scrollbar. Preserve wheel, touch, keyboard and screen-reader support.
- Shared dialogs: `ui/ActionDialog.tsx` for focus trap, Escape/close, fixed header/footer; scroll content, keep decisive actions visible.
- Treat the visible artwork as the frame boundary, not the full PNG bounds. Transparent pixels in a crest are not usable content space. Center title glyphs within the painted plaque and keep subtitles below its gold rail.
- Frame complete controls: an ingredient, champion choice or card tile contains its icon/art, name, count and selection state inside the same visible frame. Do not frame only an icon and leave its label outside.
- Use stable row sizes and explicit safe insets. Scroll content must not expose a title beneath a fixed footer or distort a portrait when a list gains another row.
- Visual acceptance requires screenshot → inspect → fix → screenshot on the running UI at 1920×1080 and the narrow desktop panel (1504×1190). DOM bounds checks supplement this review; they cannot approve the painted frame alignment.
- Read actual rules, prices and conditions from engine. Switching weapon is passive; do not label it `0 mana`. Skill mana costs still display.
- Show current, preview, unavailable, hover, pressed and focused states consistently; preview does not perform an action until confirmation.
- No engine/gameplay/balance changes for presentation tasks. Do not overwrite other agents' files.

Primary frame assets are already generated; only generate missing assets when the existing family cannot express a required control.

## Current visual and effect rules

- Champion and item artwork wells are square; default champion tiles live in `/heroes-square/`. Separate names, HP, stats and equipment are allowed below the square art. `flex:1` must not stretch reserve artwork vertically.
- The battlefield ground alone uses `brightness(.65) saturate(.70)`. Champions, HP, state overlays and VFX stay bright. Thin rails and modal perimeters must not compete with the portraits.
- Dialogs share a thin continuous antique gold perimeter, chamfered corners, an inner rail and midnight navy material beneath all content. Teal indicates interaction states. The material meets the frame; avoid inset blocks that leave a mismatched empty rim.
- Current form is a spell icon at the portrait lower-left: Jayce R and Jinx Q. Official source images are kept at native resolution; CSS scales them at render time.
- Unit effects sit above the portrait; slot effects sit below the three equipment sockets and belong to the slot. Each row shows at most three cells: N <= 3 shows all, N > 3 shows two icons and `+(N-2)`. There are no permanent text captions. Hover/focus opens a scrollable detail panel at the reference canvas bottom-right.
- Sand Soldiers are stored in `laneStacks[side][lane].azir_soldiers`; moving or killing the occupant does not move/remove them. Azir death keeps floor(total/2), distributed deterministically across slots. Brush and Sand Soldier icons can coexist in one slot row.
- Rengar and Ivern remain proposals until their unresolved timing/trigger choices are reviewed. Their evolving specification is `docs/heroes/rengar-ivern-proposal.json`; it does not register playable heroes.
- Review inventory: 59 screenshots in the workspace `outputs/ux-ui-complete/MANIFEST.json`, with gallery served at `/ux-review/index.html`. Connection and permission-restricted dialog fixtures are explicitly labelled; screenshots are not evidence of working server reconnection.
- Playing cards use `ui/GameCardVisual.tsx` and shared `game-card.css` everywhere: chain, hand, travelling sprites, Viktor discard, archives, inspectors, and vanilla lobby deck tiles. Preserve the approved chain 190/250 aspect, gold frame and live actor/title typography; migrate the old jade art shade to navy with teal interaction accents. Contexts only supply size and contextual badges; never revive the old purple cv-in/cv-icon face.

## Hình mẫu

- [Battlefield — map-v2/board.jpg](../packages/client/public/map-v2/board.jpg), **2560×1707**: the existing approved board with only the two river medallions repainted as natural stone daises. Original medallions are archived at [rejected/board-medallion.jpg](../packages/client/public/map-v2/rejected/board-medallion.jpg). This is the artwork reference; do not copy labels into it.
- [Match screen — moba-v1/reference/match-hud.png](../packages/client/public/ui/moba-v1/reference/match-hud.png), **1920×1080**: the current match layout with the approved navy/gold/teal DNA and new map inside the existing battlefield region. Character and item illustrations are original mockup art; they do not change the roster, rules or balance.
- The forest archive remains a layout/technical history, not the color standard. Review every image at its actual dimensions against the current layout template. Runtime changes still require the screenshot → inspect → fix → screenshot process above, including both reference and narrow desktop viewports.
