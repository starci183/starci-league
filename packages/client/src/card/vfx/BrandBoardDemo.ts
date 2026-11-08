import {
    attachFireStreamRenderer
} from "./FireStreamLab"
import type {
    LocalExampleGame
} from "./examples/localGame"
import "./brand-board-demo.css"

/** Visual review on the actual game board. No fake damage/status receipts. */
export function mountBrandBoardDemo(game: LocalExampleGame) {
    const observer = new MutationObserver(ready)
    observer.observe(document.getElementById("app")!,
        {
            childList: true, subtree: true
        })
    ready()
    function ready() {
        const stage = document.querySelector<HTMLElement>(".game-canvas-stage")
        if (!stage?.querySelector("[data-unit-id=\"A:brand\"] .bd-art")) return
        observer.disconnect()
        game.setPaused(true)
        document.title = "Brand · VFX trên sân đấu"
        const layer = document.createElement("div")
        layer.className = "brand-board-demo"
        layer.innerHTML = "<canvas aria-label=\"VFX Brand trên sân đấu\"></canvas><section class=\"brand-demo-controls\"><b>THỬ VFX BRAND</b><button data-skill=\"Q\">Q · Cầu lửa</button><button data-skill=\"E\">E · Nổ 3 mục tiêu</button><button data-skill=\"R\">R · Nảy lửa</button><button data-fire=\"hold\" hidden>Giữ lửa</button><button data-fire=\"stop\">Dừng</button><span role=\"status\">Chọn Q/R rồi bấm tướng địch · E nổ đồng thời</span></section>"
        stage.append(layer)
        let selected = "B:renata", skill: "Q" | "R" | null = null
        const foes = ["B:garen",
            "B:renata",
            "B:lux"]
        const geometry = () => {
            const r = stage.getBoundingClientRect()
            const center = (id: string) => {
                const art = stage.querySelector(`[data-unit-id="${id}"] .bd-art`)!.getBoundingClientRect()
                return [(art.x + art.width / 2 - r.x) / r.height,
                    1 - (art.y + art.height / 2 - r.y) / r.height]
            }
            const order = [selected,
                ...foes.filter(id => id !== selected)].slice(0,
                3)
            // Q uses target index 1, R starts at index 0.
            if (stage.dataset.activeSkill === "Q") [order[0],
                order[1]] = [order[1],
                order[0]]
            return {
                source: center("A:brand"), targets: order.map(center)
            }
        }
        const renderer = attachFireStreamRenderer(stage,
layer.querySelector("canvas")!,
layer.querySelector("[role=status]")!,
geometry)
        const info = layer.querySelector<HTMLElement>("[role=status]")!
        const preview = (key: "Q" | "E" | "R") => {
            skill = key === "E" ? null : key
            renderer?.play(key)
            stage.dataset.brandPreview = key
        }
        const click = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            const hand = target.closest<HTMLElement>("[data-hand-uid]")
            const card = hand && game.state.players.A.hand.find(c => c.uid === hand.dataset.handUid)
            if (card?.hero === "brand" && ["brand_q",
                "brand_e",
                "brand_r"].includes(card.id)) {
                event.preventDefault(); event.stopImmediatePropagation()
                const key = card.id.slice(-1).toUpperCase() as "Q" | "E" | "R"
                if (key === "E") preview(key)
                else { skill = key; info.textContent = `${key} · Chọn tướng địch để thử VFX`; stage.dataset.brandSelected = key }
                return
            }
            const unit = target.closest<HTMLElement>("[data-unit-id]")
            if (skill && unit?.dataset.unitId?.startsWith("B:")) {
                event.preventDefault(); event.stopImmediatePropagation()
                selected = unit.dataset.unitId
                // Include arbitrary enemy lanes, not just the default three.
                const others = Object.values(game.state.units).filter(u => u.side === "B" && u.status === "board" && u.id !== selected).slice(0,
                    2).map(u => u.id)
                foes.splice(0,
                    foes.length,
                    selected,
                    ...others)
                preview(skill)
            }
        }
        document.addEventListener("click",
            click,
            true)
        window.addEventListener("pagehide",
            () => { document.removeEventListener("click",
                click,
                true); renderer?.destroy(); layer.remove() },
            {
                once: true
            })
    }
}
