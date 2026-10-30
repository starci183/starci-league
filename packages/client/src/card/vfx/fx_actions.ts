import {
    Graphics, type Ticker
} from "pixi.js"
import {
    registerVfx, type VfxCtx, type VfxEffect
} from "./types"

function registerAction(name: string, effect: VfxEffect) {
    registerVfx(name,
        c => Promise.all((c.to.length ? c.to : [c.from]).map(to => effect({
            ...c, to: [to]
        }))).then(() => {}))
}

/** Each action owns its ticker callback and resolves immediately if its layer is cancelled. */
function animate(c: VfxCtx, ms: number, draw: (t: number) => void): Promise<void> {
    return new Promise(resolve => {
        let elapsed = 0, ended = false
        const finish = () => {
            if (ended) return
            ended = true
            c.app.ticker.remove(tick)
            c.layer.off("destroyed",
                finish)
            resolve()
        }
        const tick = (ticker: Ticker) => {
            if (c.layer.destroyed) return finish()
            elapsed += ticker.deltaMS
            draw(Math.min(1,
                elapsed / ms))
            if (elapsed >= ms) finish()
        }
        if (c.layer.destroyed) return finish()
        c.app.ticker.add(tick)
        c.layer.once("destroyed",
            finish)
    })
}

registerAction("assassinSlashes",
    async c => {
        const ink = new Graphics(), to = c.to[0] ?? c.from
        c.layer.addChild(ink)
        const k = Math.sqrt(c.intensity)
        await animate(c,
            460,
            t => {
                ink.clear()
                const travel = Math.min(1,
                        t / .45), eased = 1 - (1 - travel) ** 3
                ink.position.set(c.from.x + (to.x - c.from.x) * eased,
                    c.from.y + (to.y - c.from.y) * eased)
                // Two crossing crescent cuts: one cosmetic attack beat, never two damage events.
                for (let cut = 0; cut < 2; cut++) {
                    const phase = Math.max(0,
                        Math.min(1,
                            (t - cut * .15) / .8))
                    const alpha = Math.sin(phase * Math.PI)
                    const sign = cut ? -1 : 1, extent = 43 * k
                    for (let trail = 0; trail < 3; trail++) {
                        const offset = trail * 4
                        ink.moveTo(-extent,
                            -extent * sign + offset)
                            .bezierCurveTo(-8 * k,
                                -52 * sign * k + offset,
                                38 * k,
                                -15 * sign * k + offset,
                                extent,
                                extent * sign + offset)
                            .stroke({
                                color: trail ? c.color : c.color2 ?? 0xffffff, width: (7 - trail * 2) * k, alpha: alpha * (1 - trail * .25)
                            })
                    }
                }
            })
    })

registerAction("daggerStab",
    async c => {
        const ink = new Graphics(), to = c.to[0] ?? c.from
        c.layer.addChild(ink)
        ink.rotation = Math.atan2(to.y - c.from.y,
            to.x - c.from.x)
        const k = Math.sqrt(c.intensity)
        await animate(c,
            340,
            t => {
                const progress = 1 - (1 - t) ** 3, fade = Math.min(1,
                    (1 - t) * 5)
                ink.position.set(c.from.x + (to.x - c.from.x) * progress,
                    c.from.y + (to.y - c.from.y) * progress)
                ink.clear().poly([-58 * k,
                    -7 * k,
                    20 * k,
                    0,
                    -58 * k,
                    7 * k,
                    -41 * k,
                    0])
                    .fill({
                        color: c.color2 ?? 0xfff1d4, alpha: fade
                    }).stroke({
                        color: c.color, width: 2 * k, alpha: fade
                    })
                ink.moveTo(-110 * k,
                    0).lineTo(-43 * k,
                    0).stroke({
                    color: c.color, width: 5 * k, alpha: (1 - t) * .7
                })
            })
    })

registerAction("mageOrb",
    async c => {
        const ink = new Graphics(), to = c.to[0] ?? c.from
        c.layer.addChild(ink)
        const k = Math.sqrt(c.intensity)
        await animate(c,
            440,
            t => {
                ink.clear()
                const x = c.from.x + (to.x - c.from.x) * t, y = c.from.y + (to.y - c.from.y) * t
                for (let trail = 8; trail >= 0; trail--) {
                    const p = Math.max(0,
                            t - trail * .018), size = (15 - trail * 1.2) * k
                    ink.circle(c.from.x + (to.x - c.from.x) * p,
                        c.from.y + (to.y - c.from.y) * p,
                        size)
                        .fill({
                            color: c.color, alpha: (1 - trail / 10) * .3
                        })
                }
                ink.circle(x,
                    y,
                    12 * k).fill({
                    color: c.color, alpha: .95
                })
                ink.circle(x - 2 * k,
                    y - 2 * k,
                    5 * k).fill(c.color2 ?? 0xf0ddff)
                ink.arc(x,
                    y,
                    18 * k,
                    t * 9,
                    t * 9 + Math.PI * 1.4).stroke({
                    color: c.color2 ?? 0xe8d8ff, width: 2 * k, alpha: .8
                })
            })
    })

registerAction("supportOrb",
    async c => {
        const ink = new Graphics(), to = c.to[0] ?? c.from
        c.layer.addChild(ink)
        const k = Math.sqrt(c.intensity)
        await animate(c,
            480,
            t => {
                ink.position.set(c.from.x + (to.x - c.from.x) * t,
                    c.from.y + (to.y - c.from.y) * t)
                ink.clear().circle(0,
                    0,
                    8 * k).fill({
                    color: c.color, alpha: .85
                })
                ink.ellipse(0,
                    0,
                    22 * k,
                    9 * k).stroke({
                    color: c.color2 ?? 0xeaffef, width: 2 * k
                })
                ink.rotation = t * Math.PI * 2
                for (let i = 0; i < 3; i++) {
                    const a = i * Math.PI * 2 / 3
                    ink.circle(Math.cos(a) * 19 * k,
                        Math.sin(a) * 19 * k,
                        3 * k).fill(0xf4ffe9)
                }
            })
    })

registerAction("heavyImpact",
    async c => {
        const ink = new Graphics(), to = c.to[0] ?? c.from
        c.layer.addChild(ink)
        const k = Math.sqrt(c.intensity), angle = Math.atan2(to.y - c.from.y,
            to.x - c.from.x)
        ink.rotation = angle
        await animate(c,
            410,
            t => {
                const progress = 1 - (1 - t) ** 2, alpha = Math.min(1,
                    (1 - t) * 5)
                ink.position.set(c.from.x + (to.x - c.from.x) * progress,
                    c.from.y + (to.y - c.from.y) * progress)
                ink.clear().circle(0,
                    0,
                    34 * k).fill({
                    color: c.color, alpha: alpha * .13
                })
                ink.roundRect(-30 * k,
                    -15 * k,
                    43 * k,
                    30 * k,
                    6 * k)
                    .fill({
                        color: c.color, alpha
                    }).stroke({
                        color: c.color2 ?? 0xffe6a4, width: 2 * k, alpha
                    })
                for (let i = 0; i < 3; i++) ink.roundRect((3 - i * 10) * k,
                    -17 * k,
                    9 * k,
                    15 * k,
                    3 * k)
                    .fill({
                        color: 0xddc68c, alpha
                    }).stroke({
                        color: c.color2 ?? 0xffefba, width: k, alpha
                    })
                ink.poly([-25 * k,
                    2 * k,
                    10 * k,
                    2 * k,
                    5 * k,
                    12 * k,
                    -25 * k,
                    12 * k]).fill({
                    color: 0x6d644d, alpha: alpha * .65
                })
                ink.moveTo(-14 * k,
                    -9 * k).lineTo(-10 * k,
                    0).lineTo(-15 * k,
                    7 * k).stroke({
                    color: 0xffe8a9, width: k, alpha
                })
                for (let i = 0; i < 3; i++) ink.moveTo(-70 * k - i * 8,
                    (i - 1) * 13 * k).lineTo(-33 * k,
                    (i - 1) * 10 * k)
                    .stroke({
                        color: c.color, width: 4 * k, alpha: alpha * .45
                    })
            })
    })

registerAction("bleedTick",
    async c => {
        const ink = new Graphics()
        c.layer.addChild(ink)
        await animate(c,
            560,
            t => {
                ink.clear()
                for (let i = 0; i < 7; i++) {
                    const x = c.from.x + Math.sin(i * 2.4) * 27, y = c.from.y - 25 + t * 58 + i % 3 * 8
                    ink.ellipse(x,
                        y,
                        3,
                        6).fill({
                        color: 0xdb3755, alpha: 1 - t
                    })
                }
            })
    })
