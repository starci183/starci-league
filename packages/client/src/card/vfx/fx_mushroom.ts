import {
    Graphics, type Ticker
} from "pixi.js"
import {
    registerVfx, type Pt
} from "./types"

/** An actual mushroom silhouette, travelling from the champion/deck to its public destination. */
for (const name of ["mushroomPlant",
    "mushroomBurst"]) registerVfx(name,
    c => new Promise<void>(resolve => {
        const ink = new Graphics()
        c.layer.addChild(ink)
        const target = c.to[0] ?? c.from
        const planting = name === "mushroomPlant"
        const flight = planting ? 620 : 480
        const duration = flight + (planting ? 260 : 700)
        const size = Math.max(15,
            Math.min(27,
                window.innerHeight * .025))
        let elapsed = 0, ended = false
        const finish = () => {
            if (ended) return
            ended = true
            c.app.ticker.remove(tick)
            resolve()
        }
        const point = (t: number): Pt => ({
            x: c.from.x + (target.x - c.from.x) * t,
            y: c.from.y + (target.y - c.from.y) * t - Math.sin(t * Math.PI) * (planting ? 100 : 60)
        })
        const tick = (ticker: Ticker) => {
            if (c.layer.destroyed) return finish()
            elapsed += ticker.deltaMS
            if (elapsed >= duration) return finish()
            ink.clear()
            const travel = Math.min(1,
                    elapsed / flight), p = point(travel)
            if (travel < 1) {
                for (let i = 1; i <= 9; i++) {
                    const q = point(Math.max(0,
                        travel - i * .018))
                    ink.circle(q.x,
                        q.y,
                        size * (1 - i / 11) * .45).fill({
                        color: 0x9de956, alpha: (1 - i / 10) * .35
                    })
                }
                ink.circle(p.x,
                    p.y,
                    size * 1.6).fill({
                    color: 0x86d546, alpha: .12
                })
                ink.roundRect(p.x - size * .22,
                    p.y,
                    size * .44,
                    size * .7,
                    4).fill(0xffe8ad)
                ink.ellipse(p.x,
                    p.y,
                    size,
                    size * .65).fill(0x86ce47).stroke({
                    color: 0xdfff98, width: 2
                })
                for (const [x,
                    y,
                    r] of [[-.45,
                        -.15,
                        .17],
                    [.25,
                        -.25,
                        .22],
                    [.6,
                        .1,
                        .13]]) ink.circle(p.x + size * x,
                    p.y + size * y,
                    size * r).fill(0xa16cce)
            } else {
                const t = (elapsed - flight) / (duration - flight), fade = 1 - t
                ink.ellipse(target.x,
                    target.y + size,
                    size * (1 + t * 3),
                    size * (.4 + t)).stroke({
                    color: 0xc4ff72, width: 3 * fade, alpha: fade
                })
                const count = planting ? 8 : 22
                for (let i = 0; i < count; i++) {
                    const a = i * 2.39996, radius = size * (planting ? 1.5 : 3.4) * t
                    const x = target.x + Math.cos(a) * radius, y = target.y + Math.sin(a) * radius * .6 - t * size * 1.5
                    ink.circle(x,
                        y,
                        size * (planting ? .15 : .45) * fade).fill({
                        color: i % 3 ? 0x93db43 : 0xb28ad9, alpha: fade * .6
                    })
                }
            }
        }
        c.app.ticker.add(tick)
        c.layer.once("destroyed",
            finish)
    }))
