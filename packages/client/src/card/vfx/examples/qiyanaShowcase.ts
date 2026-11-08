// Demo VFX đủ bộ chiêu Qiyana theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; đổi chỗ E là hai lá thật cùng chạy rồi chốt vào bản dựng riêng của demo. Dấu đường là lớp DOM phụ của demo, đặt bằng dress.
import type {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    laneRect, ptOf, unitEl, unitPt, unitRect, type Pt
} from "../../anim/helpers"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    QIYANA_DANCE_MS, QIYANA_ELEMENT
} from "../fx_qiyana"
import {
    heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    movementTracks
} from "../sequence"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("qiyana",
    "q")
const E = skillVfx("qiyana",
    "e")
const R = skillVfx("qiyana",
    "r")
const P = skillVfx("qiyana",
    "p")
const QIYANA = "A:qiyana"
const { earth: EARTH, water: WATER, grass: GRASS } = QIYANA_ELEMENT
/** 5 đường công khai: 2 Đất, 2 Nước, 1 Cỏ */
const LANES = [EARTH,
    WATER,
    GRASS,
    EARTH,
    WATER]
const ELEMENT_NAME = ["Đất",
    "Nước",
    "Cỏ"]
const ELEMENT_RGB = ["240, 98, 30",
    "31, 140, 255",
    "47, 210, 74"]
/** Hình vẽ nhỏ trên dấu đường: tảng đá, giọt nước, chiếc lá */
const ELEMENT_ICON = [
    "<path d=\"M2 15 6 6l6-3 6 5 4 7-5 5H7z\" fill=\"#c9783a\"/><path d=\"M6 6l6-3 1 8-7 4z\" fill=\"#f0b070\"/>",
    "<path d=\"M12 2c5 7 7 10 7 13a7 7 0 0 1-14 0c0-3 2-6 7-13z\" fill=\"#38b0ff\"/><path d=\"M9 15a3 3 0 0 0 3 3\" stroke=\"#d8f4ff\" stroke-width=\"1.6\" fill=\"none\"/>",
    "<path d=\"M3 21C3 10 10 3 21 3c0 11-7 18-18 18z\" fill=\"#3ccf55\"/><path d=\"M4 20 17 7\" stroke=\"#d8ffb0\" stroke-width=\"1.4\"/>"
]
const JINX = "B:jinx"
const LUX = "B:lux"
const ANNIE = "B:annie"
const LEONA = "B:leona"
const BASIC = heroBasicVfx("qiyana")
const AIM_MS = 950
const GAP_MS = 760

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const tone = (skill: typeof Q, element: number) => ({
    color: skill.color, color2: skill.color2, intensity: skill.intensity, amount: element
})

/** Dải đường, dấu nguyên tố: dựng lại vị trí định kỳ vì bàn dựng xong sau khi dress chạy */
const laneMarks: HTMLElement[] = []

function placeMarks() {
    LANES.forEach((_, lane) => {
        const mark = laneMarks[lane]
        const mine = laneRect(QIYANA,
            lane,
            "A")
        const foe = laneRect("B:x",
            lane,
            "A")
        if (!mark || !mine || !foe) return
        const top = foe.bottom, height = mine.top - foe.bottom
        mark.style.left = `${mine.left + mine.width / 2 - 62}px`
        mark.style.top = `${top}px`
        mark.style.height = `${height}px`
        mark.style.display = "block"
    })
    // huy hiệu nguyên tố có sẵn của thẻ dùng tên cũ Đỏ/Xanh/Lục; đặc tả mới gọi là Đất/Nước/Cỏ
    const badge = unitEl(QIYANA)?.querySelector(".bd-elem")
    const name = badge ? ["el-red",
        "el-blue",
        "el-green"].findIndex(cls => badge.classList.contains(cls)) : -1
    if (badge && name >= 0 && badge.textContent !== ELEMENT_NAME[name]) badge.textContent = ELEMENT_NAME[name]
}

/** Dấu đường nhẹ: dải màu mờ băng qua sông và nhãn nhỏ ở đầu đường, không che bài */
export function dressQiyana() {
    for (const [lane,
        element] of LANES.entries()) {
        const rgb = ELEMENT_RGB[element]
        const mark = document.createElement("div")
        mark.dataset.qiyanaLane = String(lane)
        mark.style.cssText = `display:none;position:fixed;width:124px;z-index:4;pointer-events:none;opacity:.62;transition:opacity .3s;background:linear-gradient(rgba(${rgb},.08),rgba(${rgb},.42) 50%,rgba(${rgb},.08));-webkit-mask-image:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent)`
        const chip = document.createElement("div")
        chip.style.cssText = `position:absolute;left:50%;bottom:6px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;padding:2px 9px 2px 5px;border-radius:11px;font:800 12px/18px sans-serif;color:#fff;white-space:nowrap;background:rgba(10,20,14,.72);box-shadow:0 0 9px rgba(${rgb},.9);text-shadow:0 1px 2px #000`
        chip.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24">${ELEMENT_ICON[element]}</svg>${ELEMENT_NAME[element]}`
        mark.append(chip)
        document.body.append(mark)
        laneMarks[lane] = mark
    }
    placeMarks()
    const timer = window.setInterval(placeMarks,
        250)
    return () => {
        window.clearInterval(timer)
        for (const mark of laneMarks.splice(0)) mark.remove()
    }
}

function markOf(lane: number): Pt {
    const box = laneMarks[lane]?.getBoundingClientRect()
    return box ? ptOf(box) : unitPt(QIYANA)
}

function landStatus(id: string, status: string, card: string) {
    const e: cg.GameEvent = {
        t: "status", target: id, id: status, turns: 1, v: 1, src: QIYANA, card
    }
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

export async function runQiyanaShowcase(say: (text: string) => void) {
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
    private element: number = GRASS
    private hidden = false
    private fallen?: HTMLElement

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        const el = unitEl(QIYANA)
        if (el) el.style.boxShadow = ""
        if (this.fallen) this.fallen.style.filter = ""
        for (const mark of laneMarks) mark.style.opacity = ".62"
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Qiyana: bàn chưa sẵn sàng")
        return view
    }

    private lane() {
        return this.view().units[QIYANA].lane
    }

    /** Hấp thụ nguyên tố của đường đang đứng: vật liệu bay về, huy hiệu, quầng thẻ và dấu đường cùng đổi */
    private async absorb() {
        const lane = this.lane()
        const element = LANES[lane]
        this.element = element
        await new Promise<void>((resolve) => {
            void playVfx(P.impact,
                markOf(lane),
                [unitPt(QIYANA)],
                {
                    color: P.color, color2: P.color2, amount: element,
                    onBeat: () => {
                        applyToDisplay([{
                            t: "stack", unit: QIYANA, key: "element", value: element + 1
                        }])
                        this.tint()
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    private tint() {
        const el = unitEl(QIYANA)
        const rgb = ELEMENT_RGB[this.element]
        if (el) el.style.boxShadow = `0 0 0 2px rgba(${rgb},.85), 0 0 22px 4px rgba(${rgb},.85)`
        const lane = this.lane()
        laneMarks.forEach((mark, i) => { mark.style.opacity = i === lane ? "1" : ".62" })
    }

    /** Chiêu nào cũng lộ Qiyana khỏi Tàng Hình */
    private reveal() {
        if (!this.hidden) return
        this.hidden = false
        const e: cg.GameEvent = {
            t: "statusEnd", target: QIYANA, id: "stealth"
        }
        applyToDisplay([e])
    }

    private conceal(card: string) {
        landStatus(QIYANA,
            "stealth",
            card)
        this.hidden = true
    }

    /** Thẻ lao tới mục tiêu rồi về: cận chiến chém ngay tại mục tiêu, không bắn đạn */
    private lunge(target: string) {
        const a = unitPt(QIYANA), b = unitPt(target)
        const dx = (b.x - a.x) * .34, dy = (b.y - a.y) * .34
        unitEl(QIYANA)?.animate([
            {
                transform: "translate(0, 0)"
            },
            {
                transform: `translate(${dx}px, ${dy}px)`, offset: .3
            },
            {
                transform: `translate(${dx}px, ${dy}px)`, offset: .55
            },
            {
                transform: "translate(0, 0)"
            }
        ],
        {
            duration: 520, easing: "ease-out"
        })
    }

    private basic(target: string, amount: number) {
        const shape = {
            color: BASIC.color, color2: BASIC.color2, amount: this.element
        }
        this.lunge(target)
        return strike(BASIC.travel,
            QIYANA,
            [target],
            shape,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(BASIC.impact,
                    unitPt(target),
                    [],
                    shape)
            })
    }

    /** Q: lưỡi rút ra, rồi chém tại đối diện. Sát thương, nguyên tố và trạng thái cùng một nhịp */
    private async wrath(target: string, amount: number, land: () => void) {
        this.reveal()
        const shape = tone(Q,
            this.element)
        await strike(Q.cast ?? "none",
            QIYANA,
            [],
            shape,
            () => {})
        this.lunge(target)
        await strike(Q.travel,
            QIYANA,
            [target],
            shape,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                land()
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    shape)
            })
    }

    /** Dựng đổi chỗ vào bản demo, giữ nguyên Máu và trạng thái đang hiển thị, rồi cho store chốt đúng đường */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const view = this.view()
        const other = move.with ?? ""
        const lanes = this.staged.lanes.A
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

    /** Hai lá cùng chạy theo hai đường nhường nhau như move thật */
    private async swap(to: number) {
        const view = this.view()
        const from = view.units[QIYANA].lane
        const move = {
            t: "move" as const, unit: QIYANA, from, to, with: view.lanes.A[to] ?? undefined
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
                duration: QIYANA_DANCE_MS, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards"
            })]
        })
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        try {
            this.commitSwap(move)
        } finally {
            for (const a of animations) a.cancel()
        }
    }

    /** E: lướt tới ô đối diện mục tiêu, đổi chỗ đồng minh, tới nơi là chém. Giải quyết xong mới đổi nguyên tố theo đường mới */
    private async dance(target: string, amount: number, land: () => void) {
        this.reveal()
        const shape = tone(E,
            this.element)
        const lane = this.view().units[target].lane
        const home = unitPt(QIYANA)
        const end = laneRect(QIYANA,
            lane,
            "A")
        void playVfx(E.cast ?? "none",
            home,
            [],
            shape)
        void playVfx(E.travel,
            home,
            [end ? ptOf(end) : home],
            shape)
        await this.swap(lane)
        this.tint()
        this.lunge(target)
        await strike(E.impact,
            target,
            [],
            shape,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                land()
            })
    }

    /** R: gió quạt 3 đường, đối diện nổ to và mất máu nặng nhất. Mọi thứ đáp cùng một nhịp */
    private async display(front: number, side: number, land: (front: string, lanes: string[]) => void) {
        this.reveal()
        const shape = tone(R,
            this.element)
        const view = this.view()
        const lane = this.lane()
        const facing = view.lanes.B[lane] ?? ""
        const lanes = [lane - 1,
            lane,
            lane + 1].flatMap(i => view.lanes.B[i] ?? [])
        await strike(R.cast ?? "none",
            QIYANA,
            [],
            shape,
            () => {})
        await strike(R.travel,
            QIYANA,
            lanes,
            shape,
            () => {
                for (const id of lanes) {
                    landDamage(id,
                        id === facing ? front : side,
                        "physical")
                    void playVfx(R.impact,
                        unitPt(id),
                        [],
                        {
                            ...shape, intensity: id === facing ? 2.6 : 1
                        })
                }
                land(facing,
                    lanes)
            })
    }

    /** Địch nhắm đúng Qiyana: khung đỏ như Chuỗi thật */
    private async aim(foe: string) {
        const me = unitEl(QIYANA), them = unitEl(foe)
        me?.classList.add("ctarget")
        them?.classList.add("cactor")
        await sleep(AIM_MS)
        me?.classList.remove("ctarget")
        them?.classList.remove("cactor")
    }

    /** Hồi đầy Máu địch trên bàn demo, không số nổi, để mỗi chiêu hiện đúng số thay vì bị kẹp ở 1 Máu */
    private refresh() {
        const view = this.view()
        for (const id of view.lanes.B.flatMap(i => i ?? [])) {
            const unit = view.units[id]
            applyToDisplay([{
                t: "heal", target: id, amount: unit.maxHp - unit.hp, hp: unit.maxHp
            }])
        }
    }

    private floatDodge() {
        const host = unitEl(QIYANA)?.querySelector(".bd-floats")
        if (!host) return
        const float = document.createElement("span")
        float.className = "bd-float block"
        float.textContent = "Né"
        host.append(float)
        window.setTimeout(() => float.remove(),
            1050)
    }

    async play() {
        const say = this.say
        say("Nội tại · Thần Khí Ixtal: đầu trận 5 đường lộ Nguyên Tố công khai, 2 Đất, 2 Nước, 1 Cỏ")
        await Promise.all(LANES.map(async (element, lane) => {
            await sleep(lane * 170)
            void playVfx(P.extra ?? "none",
                markOf(lane),
                [],
                {
                    color: P.color, color2: P.color2, amount: element
                })
        }))
        await sleep(1100)

        say("Nội tại · Qiyana đứng đường Cỏ: hấp thụ Cỏ, đòn và chiêu kế mang màu xanh lá")
        await this.absorb()
        await sleep(GAP_MS)

        say("Đánh thường · Lưỡi Ixtal: chém tại Annie, tia mang màu nguyên tố đang giữ")
        await this.basic(ANNIE,
            60)
        await sleep(GAP_MS)

        say("Q · Cỏ: chém Annie đối diện, lá cuốn quanh Qiyana, Tàng Hình")
        await this.wrath(ANNIE,
            110,
            () => {
                this.conceal("qiyana_q")
                void playVfx(Q.extra ?? "none",
                    unitPt(QIYANA),
                    [],
                    tone(Q,
                        GRASS))
            })
        await sleep(1300)

        say("Jinx nhắm đúng Qiyana: đứng đường Cỏ nên E được Quick")
        await this.aim(JINX)
        say("E Quick · Cỏ: lướt sang đối diện Jinx, đổi chỗ Viktor, Tàng Hình né đòn nhắm đúng")
        await this.dance(JINX,
            100,
            () => {
                this.conceal("qiyana_e")
                void playVfx(E.extra ?? "none",
                    unitPt(QIYANA),
                    [],
                    tone(E,
                        GRASS))
            })
        const shot = heroBasicVfx("jinx")
        await strike(shot.travel,
            JINX,
            [QIYANA],
            {
                color: shot.color, color2: shot.color2
            },
            () => {
                this.floatDodge()
                void playVfx(E.extra ?? "none",
                    unitPt(QIYANA),
                    [],
                    tone(E,
                        GRASS))
            })
        await sleep(GAP_MS)
        say("Giải quyết xong: đường mới là Đất, Nguyên Tố đổi sang Đất")
        await this.absorb()
        await sleep(GAP_MS)

        say("Q · Đất: Jinx đã mất Máu nên thêm sát thương theo Máu đã mất, số lớn hơn")
        this.refresh()
        presetWound(JINX,
            90)
        await this.wrath(JINX,
            210,
            () => {})
        await sleep(1200)

        say("Lux nhắm đúng Qiyana: đường Đất không phải Cỏ, E không có Quick, đòn trúng")
        await this.aim(LUX)
        await basicAttack(LUX,
            QIYANA,
            70)
        await sleep(GAP_MS)

        this.refresh()
        say("R · Đất: gió vàng 3 đường, đá nổ thêm theo Máu đã mất, Jinx đối diện chịu nặng nhất")
        await this.display(190,
            90,
            () => {})
        await sleep(1500)

        say("E · Đất: lướt sang đối diện Leona, đổi chỗ Darius, thêm sát thương. Đường Nước: không Quick")
        await this.dance(LEONA,
            150,
            () => {})
        await sleep(1000)
        say("Giải quyết xong: Nguyên Tố đổi sang Nước")
        await this.absorb()
        await sleep(GAP_MS)

        this.refresh()
        say("Q · Nước: chém Leona đối diện, nước phun lên, Choáng")
        await this.wrath(LEONA,
            110,
            () => landStatus(LEONA,
                "stun",
                "qiyana_q"))
        await sleep(1300)

        this.refresh()
        say("R · Nước: 3 đường, nước dâng, cả ba bị Choáng, Leona đối diện Choáng lâu hơn và mất Máu nặng nhất")
        await this.display(170,
            80,
            (_, lanes) => {
                for (const id of lanes) landStatus(id,
                    "stun",
                    "qiyana_r")
            })
        await sleep(1500)

        this.refresh()
        say("E · Nước: lướt sang đối diện Annie, đổi chỗ Viktor, Choáng")
        await this.dance(ANNIE,
            100,
            () => landStatus(ANNIE,
                "stun",
                "qiyana_e"))
        await sleep(1000)
        say("Giải quyết xong: đường giữa là Cỏ, Nguyên Tố đổi sang Cỏ")
        await this.absorb()
        await sleep(GAP_MS)

        this.refresh()
        say("R · Cỏ: 3 đường, lá bão, tướng mình ở 3 đường đó cùng Tàng Hình")
        await this.display(170,
            80,
            () => {
                const view = this.view()
                const lane = this.lane()
                const allies = [lane - 1,
                    lane,
                    lane + 1].flatMap(i => view.lanes.A[i] ?? [])
                for (const id of allies) if (id !== QIYANA) landStatus(id,
                    "stealth",
                    "qiyana_r")
                this.conceal("qiyana_r")
                void playVfx(R.extra ?? "none",
                    unitPt(allies[0]),
                    allies.map(id => unitPt(id)),
                    tone(R,
                        GRASS))
            })
        await sleep(1700)

        say("E · Cỏ: về đối diện Jinx, đổi chỗ Darius, rồi đường Đất lại hấp thụ Đất")
        await this.dance(JINX,
            100,
            () => {
                this.conceal("qiyana_e")
                void playVfx(E.extra ?? "none",
                    unitPt(QIYANA),
                    [],
                    tone(E,
                        GRASS))
            })
        await sleep(900)
        await this.absorb()
        await sleep(600)

        this.refresh()
        say("Q · Đất: hạ gục Jinx, Qiyana hồi Máu ngay trong nhát chém")
        presetWound(JINX,
            this.view().units[JINX].hp - 211)
        await this.wrath(JINX,
            210,
            () => {
                landHeal(QIYANA,
                    70)
                const el = unitEl(JINX)
                if (el) {
                    el.style.filter = "grayscale(1) brightness(.5)"
                    this.fallen = el
                }
            })
        await sleep(1700)
    }
}
