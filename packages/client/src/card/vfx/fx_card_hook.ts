import {
    Graphics, type Ticker
} from "pixi.js"
import {
    registerVfx, type Pt
} from "./types"

let current: { phase: string; head: Pt; target: Pt } | null = null
export const cardHookStats = () => current

registerVfx("cardHook",
    (c) => new Promise<void>((resolve) => {
        const ink = new Graphics()
        c.layer.addChild(ink)
        const destination = c.to[0] ?? c.from
        let elapsed = 0
        let retractAt = -1
        let last = destination
        let contacted = false
        let ended = false
        const finish = () => {
            if (ended) return
            ended = true
            c.app.ticker.remove(tick)
            current = null
            resolve()
        }
        const tick = (ticker: Ticker) => {
            if (c.layer.destroyed) return finish()
            elapsed += ticker.deltaMS
            const target = c.tether?.target() ?? destination
            if (!contacted && elapsed >= 240) {
                contacted = true
                c.tether?.contact()
            }
            if (retractAt < 0 && (c.tether ? c.tether.released() : elapsed > 700)) {
                retractAt = elapsed
                last = target
            }
            let phase = "attached"
            let head = target
            if (elapsed < 240) {
                phase = "cast"
                const t = Math.min(1,
                    elapsed / 240)
                head = {
                    x: c.from.x + (destination.x - c.from.x) * t, y: c.from.y + (destination.y - c.from.y) * t
                }
            } else if (retractAt >= 0) {
                phase = "retract"
                const t = Math.min(1,
                    (elapsed - retractAt) / 180)
                head = {
                    x: last.x + (c.from.x - last.x) * t, y: last.y + (c.from.y - last.y) * t
                }
                if (t >= 1) return finish()
            }
            current = {
                phase, head, target
            }
            ink.clear()
            const dx = head.x - c.from.x, dy = head.y - c.from.y
            const length = Math.max(1,
                    Math.hypot(dx,
                        dy)), ux = dx / length, uy = dy / length
            const nx = -uy, ny = ux
            ink.moveTo(c.from.x,
                c.from.y).lineTo(head.x,
                head.y).stroke({
                color: 0xe9b647, width: 9, alpha: .13
            })
            ink.moveTo(c.from.x,
                c.from.y).lineTo(head.x,
                head.y).stroke({
                color: 0x36260e, width: 4.5
            })
            const links = Math.min(64,
                Math.floor(length / 12))
            for (let i = 0; i < links; i++) {
                const t = (i + .5) / Math.max(1,
                    links)
                const x = c.from.x + dx * t, y = c.from.y + dy * t
                const w = i % 2 ? 2 : 3.8
                ink.moveTo(x - ux * 5,
                    y - uy * 5).lineTo(x + nx * w,
                    y + ny * w).lineTo(x + ux * 5,
                    y + uy * 5).lineTo(x - nx * w,
                    y - ny * w).closePath().stroke({
                    color: 0xe7be61, width: 1.5
                })
            }
            ink.circle(head.x,
                head.y,
                5).fill({
                color: 0xffd66f, alpha: .9
            })
            for (const sign of [-1,
                1]) {
                ink.moveTo(head.x - ux * 9 + nx * sign * 10,
                    head.y - uy * 9 + ny * sign * 10).lineTo(head.x + ux * 5 + nx * sign * 8,
                    head.y + uy * 5 + ny * sign * 8).lineTo(head.x + ux * 10 + nx * sign * 2,
                    head.y + uy * 10 + ny * sign * 2).stroke({
                    color: 0xffe5a0, width: 3
                })
            }
            if (elapsed > 6000) finish()
        }
        c.layer.on("destroyed",
            finish)
        c.app.ticker.add(tick)
    }))
