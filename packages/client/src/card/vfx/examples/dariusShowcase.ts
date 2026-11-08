// Demo VFX đủ bộ chiêu Darius theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; đổi chỗ là hai lá thật cùng chạy rồi chốt vào bản dựng riêng của demo.
import type {
    cg
} from "@starci/shared"
import {
    createElement
} from "react"
import {
    flushSync
} from "react-dom"
import {
    createRoot
} from "react-dom/client"
import {
    CardFace
} from "../../anim/CardFace"
import {
    handPt, laneRect, ptOf, unitEl, unitPt, unitRect
} from "../../anim/helpers"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    cardName
} from "../../chain/text"
import {
    applyToDisplay, gameOf, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    DARIUS_BLEED_MS, DARIUS_LEAP_MS, DARIUS_RECALL_MS, DARIUS_WAIT_MS
} from "../fx_darius"
import {
    DARIUS_VFX, heroBasicVfx, skillVfx
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
    strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("darius",
    "q")
const E = skillVfx("darius",
    "e")
const R = skillVfx("darius",
    "r")
const P = skillVfx("darius",
    "p")
const BASIC = heroBasicVfx("darius")
const ASHE_SHOT = heroBasicVfx("ashe")
const tone = (v: typeof Q) => ({
    color: v.color, color2: v.color2, intensity: v.intensity
})
const DARIUS = "A:darius"
const ANNIE = "B:annie"
const JINX = "B:jinx"
const LEONA = "B:leona"
/** Số tầng Q cắm thêm, E và đòn đánh cắm 1 */
const Q_STACKS = 2
/** Darius đã mất Máu từ đầu demo để cú hồi Q đọc được */
const OPENING_WOUND = 170
/** Hai lá cùng chạy khi E kéo địch */
const PULL_MS = 520
/** Đổi chỗ Darius lúc lấy đà R, khớp thời gian niệm */
const LEAP_SWAP_MS = DARIUS_LEAP_MS
const CARD_W = 104
const CARD_Z = 50
/** Một đơn vị thời gian trong demo cho cú về tay chậm */
const UNIT_MS = 1300
const R_RETURN_UNITS = 2
const RAPID_GAP_MS = 420
/** Lá nằm ngay cạnh tay trong lúc chờ */
const PARK_X = 300

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

interface Flyer { el: HTMLElement; at: Pt; badge?: HTMLElement; drop(): void }

export async function runDariusShowcase(say: (text: string) => void) {
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
    /** Bản dựng riêng của demo: engine không biết các lần đổi chỗ, chỉ store nhìn thấy */
    private staged: cg.GameState
    private bleeds = new Map<string, number>()
    private alive = true
    private fallen: Animation[] = []
    private props = new Set<Flyer>()

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        this.alive = false
        this.bleeds.clear()
        for (const anim of this.fallen) anim.cancel()
        for (const prop of [...this.props]) prop.drop()
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Darius: bàn chưa sẵn sàng")
        return view
    }

    /** Một lượt máu rỉ theo đúng lá, cue ngưng ngay khi tướng hết Chảy Máu */
    private flare(id: string) {
        const tether = {
            target: () => unitPt(id), released: () => !this.alive || !this.bleeds.get(id), contact() {}
        }
        void playVfx(P.cast ?? "none",
            unitPt(id),
            [],
            {
                ...tone(P), amount: this.bleeds.get(id), tether
            })
    }

    private async auraLoop() {
        while (this.alive) {
            for (const id of this.bleeds.keys()) this.flare(id)
            await sleep(DARIUS_BLEED_MS)
        }
    }

    /** Đặt số Chảy Máu đúng nhịp đang đáp: số trên lá và lớp máu đổi cùng lúc */
    private setBleed(id: string, stacks: number) {
        const had = this.bleeds.get(id) ?? 0
        if (stacks <= 0) {
            this.bleeds.delete(id)
            land({
                t: "statusEnd", target: id, id: "bleed"
            })
            return
        }
        this.bleeds.set(id,
            stacks)
        land({
            t: "status", target: id, id: "bleed", turns: 2, v: stacks, src: DARIUS, card: "darius_p"
        })
        if (!had) this.flare(id)
    }

    private addBleed(id: string, gain: number) {
        const stacks = (this.bleeds.get(id) ?? 0) + gain
        this.setBleed(id,
            stacks)
        void playVfx(P.impact,
            unitPt(id),
            [],
            {
                ...tone(P), amount: stacks
            })
    }

    /** Nhát rìu thường thật của Darius, chém tại mục tiêu: sát thương và 1 tầng cùng đáp */
    private chop(target: string, amount: number) {
        const shape = tone(BASIC)
        return strike(BASIC.travel,
            DARIUS,
            [target],
            shape,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                this.addBleed(target,
                    1)
                void playVfx(BASIC.impact,
                    unitPt(target),
                    [],
                    shape)
            })
    }

    /** Đầu lượt tướng mang: mỗi tầng một vết phun máu ngay trên nó */
    private tick(id: string, perStack: number) {
        const stacks = this.bleeds.get(id) ?? 0
        landDamage(id,
            stacks * perStack,
            "physical")
        void playVfx(P.extra ?? "none",
            unitPt(id),
            [],
            {
                ...tone(P), amount: stacks
            })
    }

    /** Q: nhấc rìu, rồi một cung quét rộng tại đối diện. Sát thương, 2 tầng và hồi máu cùng một nhịp */
    private async decimate(target: string, amount: number, healPerStack: number) {
        await strike(Q.cast ?? "none",
            DARIUS,
            [],
            tone(Q),
            () => {})
        await strike(Q.travel,
            DARIUS,
            [target],
            tone(Q),
            () => {
                landDamage(target,
                    amount,
                    "physical")
                this.addBleed(target,
                    Q_STACKS)
                const stacks = this.bleeds.get(target) ?? 0
                landHeal(DARIUS,
                    stacks * healPerStack)
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    tone(Q))
                void playVfx(Q.extra ?? "none",
                    unitPt(target),
                    [unitPt(DARIUS)],
                    {
                        ...tone(Q), amount: stacks
                    })
            })
    }

    /** Dựng đổi chỗ vào bản demo, giữ nguyên Máu và trạng thái đang hiển thị của cả bàn, rồi cho store chốt đúng đường */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const view = this.view()
        const other = move.with ?? ""
        const lanes = this.staged.lanes[move.unit.startsWith("A:") ? "A" : "B"]
        lanes[move.from] = other
        lanes[move.to] = move.unit
        for (const [id,
            unit] of Object.entries(view.units)) this.staged.units[id] = {
                ...copy(unit), lane: id === move.unit ? move.to : id === other ? move.from : unit.lane
            } as cg.GameState["units"][string]
        receiveCardState({
            ...this.game.view(this.staged), players: view.players
        })
        flushSync(() => applyToDisplay([move]))
    }

    /** Hai lá cùng chạy theo hai đường nhường nhau như move thật, tới nơi mới chốt vị trí */
    private async swap(unit: string, other: string, ms: number) {
        const view = this.view()
        const from = view.units[unit].lane
        const to = view.units[other].lane
        const move = {
            t: "move" as const, unit, from, to, with: other
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

    /** E: rìu quét nón, móc lá, kéo về đối diện Darius; lá cũ đổi sang đường kia. Tới nơi là sát thương và 1 tầng cùng đáp */
    private async apprehend(target: string, amount: number) {
        await strike(E.cast ?? "none",
            DARIUS,
            [],
            tone(E),
            () => {})
        const view = this.view()
        const facing = view.lanes.B[view.units[DARIUS].lane]
        if (!facing) throw new Error("Demo Darius: không có địch đối diện")
        let moving = true
        let contact = () => {}
        const hooked = new Promise<void>((resolve) => { contact = resolve })
        const tether = {
            target: () => unitPt(target), released: () => !moving, contact: () => contact()
        }
        void playVfx(E.travel,
            unitPt(DARIUS),
            [unitPt(target)],
            {
                ...tone(E), tether
            }).finally(() => contact())
        await hooked
        await this.swap(target,
            facing,
            PULL_MS)
        moving = false
        landDamage(target,
            amount,
            "physical")
        this.addBleed(target,
            1)
        void playVfx(E.impact,
            unitPt(target),
            [],
            tone(E))
    }

    /** Lá R thật dựng bằng CardFace, đặt theo tâm */
    private spawn(card: cg.Card, at: Pt, badge?: string): Flyer {
        const host = document.createElement("div")
        host.style.cssText = `position:fixed;left:0;top:0;width:${CARD_W}px;pointer-events:none;z-index:${CARD_Z};will-change:transform`
        const shell = document.createElement("div")
        shell.className = "cs-link me"
        shell.style.cssText = "position:relative;left:0;top:0;width:100%;animation:none"
        const face = document.createElement("div")
        face.className = "cs-face"
        shell.append(face)
        const num = badge ? document.createElement("span") : undefined
        if (num) {
            num.className = "cs-num"
            num.textContent = badge ?? ""
            shell.append(num)
        }
        host.append(shell)
        document.body.append(host)
        const root = createRoot(face)
        flushSync(() => root.render(createElement(CardFace,
            {
                card, name: cardName(gameOf(this.view()),
                    card,
                    "vi")
            })))
        const prop: Flyer = {
            el: host, at: {
                ...at
            }, badge: num,
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
        return prop
    }

    /** Lá về đúng ô trên tay, kéo vệt máu: ô thật giữ chỗ và hiện lúc lá chạm */
    private async recall(prop: Flyer, card: cg.Card) {
        flushSync(() => applyToDisplay([{
            t: "create", side: "A", zone: "hand", card
        } as cg.GameEvent]))
        const slot = document.querySelector<HTMLElement>(`[data-hand-uid="${CSS.escape(card.uid)}"]`)
        if (slot) slot.style.visibility = "hidden"
        const box = slot?.querySelector(".cv")?.getBoundingClientRect() ?? slot?.getBoundingClientRect()
        const end = box ? ptOf(box) : handPt("A",
            "A")
        void playVfx(R.extra ?? "none",
            prop.at,
            [end],
            {
                ...tone(R), tether: {
                    target: () => prop.at, released: () => false, contact() {}
                }
            })
        await glide(prop,
            end,
            DARIUS_RECALL_MS,
            ease.inOut)
        if (slot) slot.style.visibility = ""
        prop.drop()
    }

    /** R: đổi chỗ sang đối diện nếu cần, rìu rơi từ trên xuống. Sát thương chuẩn và tiêu tầng cùng một nhịp; hạ được thì lá về tay ngay, không thì chờ đủ đơn vị */
    private async guillotine(target: string, amount: number, kills: boolean) {
        const view = this.view()
        const card = this.game.state.players.A.hand.find(c => c.id === "darius_r")
        if (!card) throw new Error("Demo Darius: thiếu lá R trên tay")
        applyToDisplay([{
            t: "play", side: "A", card
        } as cg.GameEvent])
        const lane = view.units[target].lane
        const ally = view.lanes.A[lane]
        const swapping = ally && ally !== DARIUS ? this.swap(DARIUS,
            ally,
            LEAP_SWAP_MS) : Promise.resolve()
        let leaping = true
        const follow = {
            target: () => unitPt(DARIUS), released: () => !leaping, contact() {}
        }
        await Promise.all([strike(R.cast ?? "none",
            DARIUS,
            [],
            {
                ...tone(R), tether: follow
            },
            () => {}),
        swapping])
        leaping = false
        const stacks = this.bleeds.get(target) ?? 0
        await strike(R.travel,
            DARIUS,
            [target],
            tone(R),
            () => {
                this.setBleed(target,
                    0)
                if (kills) this.fall(target,
                    amount,
                    "true")
                else landDamage(target,
                    amount,
                    "true")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    {
                        ...tone(R), amount: stacks
                    })
                if (kills) void playVfx(DARIUS_VFX.execute,
                    unitPt(target),
                    [],
                    tone(R))
            })
        return card
    }

    /** Không hạ: lá nằm cạnh tay, khói đỏ quanh lá, đếm đủ đơn vị rồi mới bay về */
    private async recallLater(card: cg.Card) {
        const home = handPt("A",
            "A")
        const spot = {
            x: home.x + PARK_X, y: home.y
        }
        const prop = this.spawn(card,
            unitPt(DARIUS),
            String(R_RETURN_UNITS))
        prop.el.style.filter = "grayscale(.5) brightness(.8)"
        let waiting = true
        const tether = {
            target: () => prop.at, released: () => !waiting || !this.alive, contact() {}
        }
        const smoke = async () => {
            while (waiting && this.alive) {
                void playVfx(DARIUS_VFX.wait,
                    prop.at,
                    [],
                    {
                        ...tone(R), amount: R_RETURN_UNITS, tether
                    })
                await sleep(DARIUS_WAIT_MS)
            }
        }
        void smoke()
        await glide(prop,
            spot,
            DARIUS_RECALL_MS,
            ease.inOut)
        for (let left = R_RETURN_UNITS; left > 0; left--) {
            await sleep(UNIT_MS)
            if (prop.badge) prop.badge.textContent = String(left - 1)
        }
        await sleep(360)
        waiting = false
        prop.el.style.filter = ""
        await this.recall(prop,
            card)
    }

    /** Tướng gục: máu về 0, KO nổi, lá xám xuống và trả lại khi hết demo. Không gọi applyToDisplay cho kill vì nó đọc lại bản dựng */
    private fall(id: string, amount: number, kind: cg.DamageKind) {
        const unit = getCard().view?.units[id]
        if (!unit) return
        land({
            t: "damage", target: id, amount, hpLost: unit.hp, absorbed: 0, kind, tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src: DARIUS, target: id
        }
        queueImpacts([ko])
        landImpacts([ko])
        const anim = unitEl(id)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        })
        if (anim) this.fallen.push(anim)
    }

    async play() {
        const say = this.say
        void this.auraLoop()
        presetWound(DARIUS,
            OPENING_WOUND)

        say("Đánh thường · Darius: nhát rìu bổ ngay tại mục tiêu, nội tại Xuất Huyết cắm 1 Chảy Máu")
        await this.chop(ANNIE,
            38)
        await sleep(1000)

        say("Nội tại · Xuất Huyết: mỗi đòn trúng thêm 1 Chảy Máu, không giới hạn, máu chảy dày dần")
        await this.chop(ANNIE,
            38)
        await sleep(RAPID_GAP_MS)
        await this.chop(ANNIE,
            38)
        await sleep(1300)

        say("Nội tại · Đầu lượt của tướng mang: mỗi tầng Chảy Máu gây sát thương vật lý ngay trên nó")
        this.tick(ANNIE,
            10)
        await sleep(1500)

        say("Q · Tàn Sát: nhấc rìu, quét một cung rộng qua tướng đối diện, gắn 2 Chảy Máu, hồi Máu theo số tầng")
        await this.decimate(ANNIE,
            70,
            16)
        await sleep(1700)

        say("E · Bắt Giữ: rìu móc Jinx khác đường, hoán đổi với Annie sang đúng đối diện Darius")
        await this.apprehend(JINX,
            64)
        await sleep(1500)

        say("Q · Tàn Sát vào Jinx vừa kéo tới: thêm 2 Chảy Máu, cú hồi nhỏ hơn vì ít tầng hơn")
        await this.decimate(JINX,
            96,
            16)
        await sleep(1600)

        say("R · Máy Chém Noxus: rìu rơi từ trên xuống, Jinx 3 tầng, sát thương chuẩn và tiêu hết Chảy Máu")
        const kept = await this.guillotine(JINX,
            90,
            false)
        await sleep(700)
        say("R · Không hạ được: lá chờ cạnh tay, 2 đơn vị sau mới về")
        await this.recallLater(kept)
        await sleep(1000)

        say("R · Máy Chém Noxus: Annie khác đường, Darius đổi chỗ sang đối diện, rìu rơi, Annie 5 tầng")
        const back = await this.guillotine(ANNIE,
            170,
            true)
        await sleep(520)
        say("R · Hạ gục: lá về tay ngay lập tức, không phải chờ")
        await this.recall(this.spawn(back,
            unitPt(ANNIE)),
        back)
        await sleep(1500)

        say("Luật chết · Leona mang 6 Chảy Máu")
        this.setBleed(LEONA,
            6)
        await sleep(1200)
        say("Luật chết · Leona gục: mất một nửa Chảy Máu, nửa còn lại vẫn bám")
        await strike(ASHE_SHOT.travel,
            "A:ashe",
            [LEONA],
            tone(ASHE_SHOT),
            () => {
                this.fall(LEONA,
                    490,
                    "physical")
                this.setBleed(LEONA,
                    3)
                void playVfx(DARIUS_VFX.shed,
                    unitPt(LEONA),
                    [],
                    {
                        ...tone(P), amount: 3
                    })
            })
        await sleep(1900)

        say("Nội tại · Hết thời hạn từ lần cộng cuối: Chảy Máu khô lại rồi tan")
        this.setBleed(LEONA,
            0)
        void playVfx(DARIUS_VFX.fade,
            unitPt(LEONA),
            [],
            tone(P))
        await sleep(1800)
    }
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
