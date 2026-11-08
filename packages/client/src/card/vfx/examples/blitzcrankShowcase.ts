// Demo VFX đủ bộ chiêu Blitzcrank theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Lá bị cướp đi đúng hợp đồng tether của trận thật: lá thật bay, nắm đấm bám theo lá.
import type {
    cg
} from "@starci/shared"
import {
    createElement
} from "react"
import {
    createRoot
} from "react-dom/client"
import {
    flushSync
} from "react-dom"
import {
    CardFace
} from "../../anim/CardFace"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    gravePt, handPt, laneRect, ptOf, rectOf, unitEl, unitPt, unitRect
} from "../../anim/helpers"
import {
    applyToDisplay, gameOf, getCard, receiveCardState
} from "../../store"
import {
    cardName
} from "../../chain/text"
import {
    playVfx
} from "../VfxCanvas"
import {
    BLITZ_DRAG_MS
} from "../fx_blitzcrank"
import {
    BLITZ_HAND_DISCARD, skillVfx
} from "../heroMap"
import {
    ease, sleep, tween
} from "../particles"
import {
    movementTracks
} from "../sequence"
import type {
    Pt
} from "../types"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits
} from "./showcaseHits"

const Q = skillVfx("blitzcrank",
    "q")
const E = skillVfx("blitzcrank",
    "e")
const R = skillVfx("blitzcrank",
    "r")
const P = skillVfx("blitzcrank",
    "p")
const tone = (v: typeof Q) => ({
    color: v.color, color2: v.color2, intensity: v.intensity
})
const BLITZ = "A:blitzcrank"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
const PARTS = "blitz_parts"
/** Lá bay nằm dưới canvas VFX (z 55) để nắm đấm đè lên lá */
const CARD_Z = 50
const CARD_W = 104
const HAND_LAND_MS = 280
const RISE_MS = 300

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

interface Flyer { el: HTMLElement; at: Pt; drop(): void }

export async function runBlitzcrankShowcase(say: (text: string) => void) {
    const game = window.starciExamples
    if (!game) return
    openHits()
    const run = new Run(game,
        say)
    try {
        await run.play()
    } finally {
        run.stop()
        closeHits()
        game.showState(game.state)
    }
}

class Run {
    private staged: cg.GameState
    private parts = 0
    private props = new Set<Flyer>()

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        for (const p of [...this.props]) p.drop()
    }

    private foeCard(id: string): cg.Card {
        const hand = this.game.state.players.B.hand
        const found = hand.find(c => c.id === id) ?? hand[0]
        return found
    }

    /** Lá thật dựng bằng CardFace, đặt theo tâm; `badge` là số mắt xích khi nằm trong Chuỗi */
    private spawn(card: cg.Card, at: Pt, opts: { back?: boolean; badge?: string; mine?: boolean } = {
    }): Flyer {
        const host = document.createElement("div")
        host.style.cssText = `position:fixed;left:0;top:0;width:${CARD_W}px;pointer-events:none;z-index:${CARD_Z};will-change:transform`
        const shell = document.createElement("div")
        shell.className = `cs-link ${opts.mine ? "me" : "foe"}`
        shell.style.cssText = "position:relative;left:0;top:0;width:100%;animation:none"
        const face = document.createElement("div")
        face.className = "cs-face"
        shell.append(face)
        if (opts.badge) {
            const num = document.createElement("span")
            num.className = "cs-num"
            num.textContent = opts.badge
            shell.append(num)
        }
        const back = opts.back ? document.createElement("img") : null
        if (back) {
            back.src = "/ui/card_back.png"
            back.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border-radius:9px;z-index:4"
            shell.append(back)
        }
        host.append(shell)
        document.body.append(host)
        const root = createRoot(face)
        flushSync(() => root.render(createElement(CardFace,
            {
                card, name: nameOf(card)
            })))
        const prop: Flyer = {
            el: host, at: {
                ...at
            },
            drop: () => {
                if (!this.props.delete(prop)) return
                host.remove()
                window.setTimeout(() => root.unmount(),
                    0)
            }
        }
        this.props.add(prop)
        put(prop,
            at)
        if (back) void sleep(150).then(() => {
            host.animate([{
                filter: "brightness(1)"
            },
            {
                filter: "brightness(1.8)"
            },
            {
                filter: "brightness(1)"
            }],
            300)
            back.remove()
        })
        return prop
    }

    /** Phụ Tùng găm lên thân: số trên lá tướng tăng cùng lúc */
    private scrap(gain = 1) {
        this.parts += gain
        void playVfx(P.impact,
            unitPt(BLITZ),
            [],
            {
                ...tone(P), amount: this.parts,
                onBeat: () => applyToDisplay([stackEvent(this.parts)])
            })
    }

    /** Thêm lá vào tay mình đúng lúc lá bay tới: giữ chỗ ô thật, ẩn tới khi lá chạm */
    private async toHand(prop: Flyer, card: cg.Card) {
        flushSync(() => applyToDisplay([{
            t: "create", side: "A", zone: "hand", card
        } as cg.GameEvent]))
        const slot = document.querySelector<HTMLElement>(`[data-hand-uid="${CSS.escape(card.uid)}"]`)
        if (slot) slot.style.visibility = "hidden"
        const box = slot?.querySelector(".cv")?.getBoundingClientRect() ?? slot?.getBoundingClientRect()
        const end = box ? ptOf(box) : handPt("A",
            "A")
        await glide(prop,
            end,
            HAND_LAND_MS,
            ease.inOut)
        if (slot) slot.style.visibility = ""
        prop.drop()
    }

    /** Nắm đấm tới lá, cùng khoảnh khắc chạm chạy `grip`; lá theo nắm đấm về Blitzcrank, ghé qua hơi nước rồi vào tay */
    private async grab(card: cg.Card, prop: () => Flyer, start: Pt, via: Pt | null, skill: typeof Q, land: () => void, grip: () => void) {
        let current: Flyer | null = null
        let released = false
        let contact = () => {}
        const reached = new Promise<void>((resolve) => { contact = resolve })
        const tether = {
            target: () => current?.at ?? start, released: () => released, contact: () => contact()
        }
        const done = playVfx(skill.travel,
            unitPt(BLITZ),
            [via ?? start],
            {
                ...tone(skill), tether, onBeat: land
            }).finally(() => contact())
        await reached
        current = prop()
        grip()
        await glide(current,
            unitPt(BLITZ),
            BLITZ_DRAG_MS,
            ease.inOut)
        released = true
        this.scrap()
        void done
        await this.toHand(current,
            card)
    }

    /** Dựng đổi chỗ vào bản demo, giữ Máu đang hiển thị, rồi cho store chốt đúng đường trận thật */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const shown = getCard().view?.units
        if (!shown) return
        const other = move.with ?? ""
        const lanes = this.staged.lanes.B
        lanes[move.from] = other
        lanes[move.to] = move.unit
        this.staged.units[move.unit] = {
            ...copy(shown[move.unit]), lane: move.to
        } as cg.GameState["units"][string]
        this.staged.units[other] = {
            ...copy(shown[other]), lane: move.from
        } as cg.GameState["units"][string]
        const view = getCard().view
        const next = this.game.view(this.staged)
        receiveCardState(view ? {
            ...next, players: view.players
        } : next)
        flushSync(() => applyToDisplay([move]))
    }

    /** Kéo tướng về đối diện Blitzcrank: lá trượt dọc hàng theo đường nhường nhau như move thật */
    private async pull(id: string, ms: number) {
        const view = getCard().view
        if (!view) return
        const lane = view.units[BLITZ].lane
        const from = view.units[id].lane
        const other = view.lanes.B[lane]
        if (!other || from === lane) return
        const move = {
            t: "move" as const, unit: id, from, to: lane, with: other
        }
        const animations = movementTracks(move).flatMap((track) => {
            const el = unitEl(track.unit), old = unitRect(track.unit)
            const end = laneRect(track.unit,
                track.to,
                "A")
            if (!el || !old || !end) return []
            const a = ptOf(old), b = ptOf(end), dx = b.x - a.x, dy = b.y - a.y
            return [el.animate([
                {
                    transform: "translate(0, 0)"
                },
                {
                    transform: `translate(${dx * .5}px, ${dy * .5 + track.arc}px)`, offset: .5
                },
                {
                    transform: `translate(${dx}px, ${dy}px)`
                }
            ],
            {
                duration: ms, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards"
            })]
        })
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        try {
            this.commitSwap(move)
        } finally {
            for (const a of animations) a.cancel()
        }
    }

    /** Q: nắm đấm xuyên qua tướng được chọn (số và trúng cùng lúc) rồi túm một lá trên tay đối thủ, lá trùng tướng thì kéo tướng đó */
    private async rocket(target: string, cardId: string, amount: number, pulls: boolean) {
        const card = this.foeCard(cardId)
        void playVfx(Q.cast ?? "none",
            unitPt(BLITZ),
            [],
            tone(Q))
        await sleep(200)
        const slot = rectOf("[data-opponent-card=\"B\"]:not([data-arriving])")
        const start = slot ? ptOf(slot) : handPt("B",
            "A")
        let pulling: Promise<void> = Promise.resolve()
        await this.grab(card,
            () => this.spawn(card,
                start,
                {
                    back: true
                }),
            start,
            unitPt(target),
            Q,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    tone(Q))
            },
            () => {
                applyToDisplay([stealEvent(card)])
                if (pulls) pulling = this.pull(target,
                    BLITZ_DRAG_MS)
            })
        await pulling
    }

    /** Đối thủ dùng lá kỹ năng: lá lên giữa bàn thành mắt xích 1, Blitzcrank nối E thành mắt xích 2 */
    private async opposed(caster: string, cardId: string, casting: string) {
        const card = this.foeCard(cardId)
        const center = chainPt()
        applyToDisplay([{
            t: "play", side: "B", card
        } as cg.GameEvent])
        const first = this.spawn(card,
            handPt("B",
                "A"),
            {
                badge: "1 · B"
            })
        void playVfx(casting,
            unitPt(caster),
            [],
            {
                color: 0xffffff
            })
        await glide(first,
            center,
            RISE_MS,
            ease.out)
        await sleep(420)
        return first
    }

    /** E: nắm đấm giật lá khỏi Chuỗi; lá tắt phép, người dùng Choáng, tất cả trong một nhịp */
    private async snatch(caster: string, cardId: string, casting: string, magic: number, after: string) {
        const card = this.foeCard(cardId)
        const first = await this.opposed(caster,
            cardId,
            casting)
        const mine = this.game.state.players.A.hand.find(c => c.id === "blitzcrank_e")
        const second = mine ? this.spawn(mine,
            handPt("A",
                "A"),
            {
                badge: "2 · A", mine: true
            }) : null
        if (second) await glide(second,
            {
                x: first.at.x + 112, y: first.at.y + 30
            },
            220,
            ease.out)
        void playVfx(E.cast ?? "none",
            unitPt(BLITZ),
            [],
            tone(E))
        await sleep(120)
        const at = first.at
        await this.grab(card,
            () => first,
            at,
            null,
            E,
            () => {},
            () => {
                const fizzle = {
                    ...tone(E), color2: magic
                }
                void playVfx(E.impact,
                    at,
                    [],
                    fizzle)
                void playVfx(E.extra ?? "none",
                    unitPt(caster),
                    [],
                    tone(E))
                landStatus(caster,
                    "stun",
                    "blitzcrank_e")
                second?.drop()
                this.say(after)
            })
    }

    /** R: một nhịp, sét, sát thương, Câm Lặng và lá văng khỏi tay cùng đáp */
    private async staticField(amount: number) {
        const dropped = this.game.state.players.B.hand.filter(c => ["leona_q",
            "garen_e"].includes(c.id))
        await strike(R.cast ?? "none",
            BLITZ,
            [],
            tone(R),
            () => {
                void playVfx(R.extra ?? "none",
                    unitPt(BLITZ),
                    ENEMIES.map(id => unitPt(id)),
                    {
                        ...tone(R),
                        onBeat: () => {
                            for (const id of ENEMIES) {
                                landDamage(id,
                                    amount,
                                    "magic")
                                landStatus(id,
                                    "silence",
                                    "blitzcrank_r")
                                void playVfx(R.impact,
                                    unitPt(id),
                                    [],
                                    tone(R))
                            }
                            void playVfx(BLITZ_HAND_DISCARD,
                                handPt("B",
                                    "A"),
                                [gravePt("B",
                                    "A")],
                                {
                                    ...tone(R), amount: Math.max(2,
                                        dropped.length)
                                })
                            applyToDisplay(dropped.map(card => ({
                                t: "discard", side: "B", card
                            } as cg.GameEvent)))
                        }
                    })
            })
        await sleep(1900)
    }

    async play() {
        const say = this.say
        say("Đánh thường · Blitzcrank: nắm đấm thép, sát thương vật lý")
        await basicAttack(BLITZ,
            "B:annie",
            44)
        await sleep(760)

        say("Q · Bàn Tay Hoả Tiễn: chọn Leona, nắm đấm xuyên qua, sát thương phép, túm 1 lá trên tay đối thủ")
        await this.rocket("B:leona",
            "garen_q",
            88,
            false)
        say("Nội tại · Thu Gom: cướp được lá, Phụ Tùng găm lên thân, thêm Giáp và Kháng Phép")
        await sleep(1500)

        say("Q · Trúng đúng lá kỹ năng của Jinx: kéo Jinx về đối diện Blitzcrank")
        await this.rocket("B:jinx",
            "jinx_q",
            88,
            true)
        await sleep(1500)

        say("E · Tay Giật: Annie dùng Q, Blitzcrank nối Chuỗi")
        await this.snatch("B:annie",
            "annie_q",
            skillVfx("annie",
                "q").cast ?? "none",
            0xff8418,
            "E · Giật lá khỏi Chuỗi: Cướp và Vô hiệu, chiêu tắt ngấm, Annie bị Choáng")
        await sleep(1500)

        say("E · Tay Giật giật cả chiêu cuối: Lux dùng R")
        await this.snatch("B:lux",
            "lux_r",
            skillVfx("lux",
                "r").cast ?? "none",
            0xfff0a0,
            "E · Giật luôn lá R: chiêu cuối của Lux tắt ngấm, Lux bị Choáng")
        await sleep(1500)

        say("R · Trường Điện Từ: sát thương phép, Câm Lặng toàn bộ địch, đối thủ bỏ bài")
        await this.staticField(120)

        say("Nội tại · Blitzcrank bị hạ: rơi một nửa Phụ Tùng")
        this.parts = Math.ceil(this.parts / 2)
        void playVfx(P.extra ?? "none",
            unitPt(BLITZ),
            [],
            {
                ...tone(P),
                onBeat: () => applyToDisplay([stackEvent(this.parts)])
            })
        await sleep(1500)
    }
}

const nameOf = (card: cg.Card) => {
    const view = getCard().view
    return view ? cardName(gameOf(view),
        card,
        "vi") : card.id
}

function put(prop: Flyer, at: Pt) {
    prop.at = at
    const h = prop.el.offsetHeight
    prop.el.style.transform = `translate(${at.x - CARD_W / 2}px, ${at.y - h / 2}px)`
}

const glide = (prop: Flyer, to: Pt, ms: number, curve: (t: number) => number) => {
    const from = {
        ...prop.at
    }
    return tween(ms,
        (t) => put(prop,
            {
                x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t
            }),
        curve)
}

/** Tâm Chuỗi trên sân: cùng chỗ với ChainStage (giữa bàn, 40% chiều cao) */
function chainPt(): Pt {
    const r = rectOf(".bd-playfield") ?? rectOf(".cg-board")
    return r ? {
        x: r.left + r.width / 2, y: r.top + r.height * .46
    } : {
        x: window.innerWidth / 2, y: window.innerHeight * .4
    }
}

const stealEvent = (card: cg.Card) => ({
    t: "steal", from: "B", to: "A", card
} as cg.GameEvent)
const stackEvent = (value: number) => ({
    t: "stack", unit: BLITZ, key: PARTS, value
} as cg.GameEvent)

function landStatus(id: string, status: string, card: string) {
    const e = {
        t: "status", target: id, id: status, turns: 1, v: 1, src: BLITZ, card
    } as cg.GameEvent
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}
