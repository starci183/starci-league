import {
    Graphics, Text, type Ticker
} from "pixi.js"
import {
    registerVfx
} from "./types"

/** A team-resource cue, not a shield or healing effect. Owns no shared ticker. */
for (const name of ["manaSpend",
    "manaRestore"]) registerVfx(name,
    c => new Promise<void>(resolve => {
        const ink = new Graphics()
        const restoring = name === "manaRestore"
        const text = new Text({
            text: `${restoring ? "+" : "−"}${Math.abs(c.amount ?? 10)}`, style: {
                fontFamily: "Alegreya Sans", fontSize: 28, fontWeight: "bold", fill: 0xbdeaff, stroke: {
                    color: 0x082e50, width: 4
                }
            }
        })
        text.anchor.set(.5)
        text.visible = false
        c.layer.addChild(ink,
            text)
        const to = c.to[0] ?? c.from
        const numberAt = restoring ? to : c.from
        let elapsed = 0, beat = false, ended = false
        const finish = () => {
            if (ended) return
            ended = true
            c.app.ticker.remove(tick)
            resolve()
        }
        const at = (t: number) => ({
            x: c.from.x + (to.x - c.from.x) * t + Math.sin(t * Math.PI) * 45, y: c.from.y + (to.y - c.from.y) * t
        })
        const tick = (ticker: Ticker) => {
            if (c.layer.destroyed) return finish()
            elapsed += ticker.deltaMS
            const travel = Math.max(0,
                Math.min(1,
                    (elapsed - 140) / 520))
            if (!beat && elapsed >= (restoring ? 660 : 140)) { beat = true; c.onBeat?.() }
            if (elapsed >= 1000) return finish()
            ink.clear()
            const p = at(travel), fade = elapsed < 660 ? 1 : (1000 - elapsed) / 340
            ink.circle(c.from.x,
                c.from.y,
                15 + Math.min(1,
                    elapsed / 160) * 13).stroke({
                color: 0x61c3ff, width: 2, alpha: Math.max(0,
                    1 - elapsed / 400)
            })
            if (elapsed > 140 && elapsed < 660) {
                for (let i = 9; i >= 1; i--) {
                    const trail = at(Math.max(0,
                        travel - i * .018))
                    ink.circle(trail.x,
                        trail.y,
                        2 + (10 - i) * .5).fill({
                        color: 0x4aafff, alpha: (1 - i / 11) * .35
                    })
                }
                ink.circle(p.x,
                    p.y,
                    15).fill({
                    color: 0x2d9cfa, alpha: .18
                })
                ink.poly([p.x,
                    p.y - 10,
                    p.x + 6,
                    p.y,
                    p.x,
                    p.y + 10,
                    p.x - 6,
                    p.y]).fill(0xbceaff).stroke({
                    color: 0x42b2ff, width: 2
                })
            }
            if (elapsed >= 660) {
                const t = (elapsed - 660) / 340
                ink.circle(to.x,
                    to.y,
                    14 + t * 24).stroke({
                    color: 0x8ed5ff, width: 2 * fade, alpha: fade
                })
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4, radius = 12 + t * 32
                    ink.circle(to.x + Math.cos(angle) * radius,
                        to.y + Math.sin(angle) * radius,
                        2.5 * fade).fill({
                        color: 0x90d9ff, alpha: fade
                    })
                }
            }
            const numberElapsed = elapsed - (restoring ? 660 : 140)
            text.visible = numberElapsed >= 0
            text.position.set(numberAt.x,
                numberAt.y - 16 - Math.max(0,
                    numberElapsed) * .035)
            text.alpha = Math.max(0,
                1 - Math.max(0,
                    numberElapsed - 300) / 500)
        }
        c.app.ticker.add(tick)
        c.layer.once("destroyed",
            finish)
    }))
