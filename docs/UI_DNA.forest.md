# Starci interface DNA

The approved baseline is the current forest board at `/vfx/examples/jinx-summon` and its Standby weapon picker. All UI work must extend this single visual family.

- Preserve the forest board and locked 16:9 play surface; excess viewport is background.
- CanvasScaler foundation: `ui/GameCanvas.tsx` owns one **1920 × 1080 reference stage**. Physical viewports only apply a uniform `min(width / 1920, height / 1080)` scale and centered letterboxing. Never add physical viewport reflow to a game component. Use reference pixels or reference-stage container units. Size breakpoints use named `@container game-canvas`; gallery/example developer tooling remains physical-viewport UI.
- Game dialogs portal through `useGameOverlay()` into the reference-stage overlay. Body-portal flight sprites and Pixi VFX remain in physical viewport space. Convert measured viewport deltas by `gameCanvasScale(element)` before applying staged DOM transforms; convert tooltip anchor points with `viewportToCanvasPoint()`.
- Typography: existing `--font-game-title` and `--font-game-text` (Alegreya, Vietnamese support). All labels remain live DOM text.
- Panel material: dark emerald `#061b14` / `#123b2e`, warm gold lettering `#ffe4a1`, quiet text `#c6d3bf`.
- New panels/cards assemble separate native PNG modules from `/ui/modular-mask-v1/` through `ArtFrame` and its alpha-derived manifest. Do not stretch a complete painted column or introduce new nine-slice layouts. Legacy forest rails retain their original art until individually migrated.
- Buttons/tabs/nameplates use shared modular plaques with live DOM labels inside the actual painted safe area. Emerald active/selected glow, charcoal disabled state, gold/emerald focus outline. No browser-style pills or blue generic buttons.
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
- Dialogs share a thin continuous gold perimeter with corner emeralds and an emerald material beneath all content. The material meets the frame; avoid inset blocks that leave a mismatched empty rim.
- Current form is a spell icon at the portrait lower-left: Jayce R and Jinx Q. Official source images are kept at native resolution; CSS scales them at render time.
- Unit effects sit above the portrait; slot effects sit below the three equipment sockets and belong to the slot. Each row shows at most three cells: N <= 3 shows all, N > 3 shows two icons and `+(N-2)`. There are no permanent text captions. Hover/focus opens a scrollable detail panel at the reference canvas bottom-right.
- Sand Soldiers are stored in `laneStacks[side][lane].azir_soldiers`; moving or killing the occupant does not move/remove them. Azir death keeps floor(total/2), distributed deterministically across slots. Brush and Sand Soldier icons can coexist in one slot row.
- Rengar and Ivern remain proposals until their unresolved timing/trigger choices are reviewed. Their evolving specification is `docs/heroes/rengar-ivern-proposal.json`; it does not register playable heroes.
- Review inventory: 59 screenshots in the workspace `outputs/ux-ui-complete/MANIFEST.json`, with gallery served at `/ux-review/index.html`. Connection and permission-restricted dialog fixtures are explicitly labelled; screenshots are not evidence of working server reconnection.
- Playing cards use `ui/GameCardVisual.tsx` and shared `game-card.css` everywhere: chain, hand, travelling sprites, Viktor discard, archives, inspectors, and vanilla lobby deck tiles. Preserve the approved chain 190/250 aspect, gold frame, jade art shade and live actor/title typography. Contexts only supply size and contextual badges; never revive the old purple cv-in/cv-icon face.
