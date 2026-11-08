// Demo VFX đủ bộ chiêu Gangplank theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Thùng là vật triệu hồi thật trong bản dựng riêng của demo, nên lá Thùng hiện ở ô Triệu hồi phụ. Nút Úp Lá chỉ có trong demo vì engine chưa nối. Tên hiệu ứng lấy từ heroMap.
import {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    deckPt, handPt, laneRect, ptOf, unitEl, unitPt, unitRect
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
    GANGPLANK_VFX as G, heroBasicVfx, skillIcon, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import type {
    Pt
} from "../types"
import {
    strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("gangplank",
    "q")
const E = skillVfx("gangplank",
    "e")
const R = skillVfx("gangplank",
    "r")
const TONE = {
    color: E.color, color2: E.color2
}
const CUTLASS = heroBasicVfx("gangplank")
const GP = "A:gangplank"
const OPPOSITE = "B:annie"
const ENEMIES = ["B:garen",
    "B:leona",
    OPPOSITE,
    "B:jinx",
    "B:lux"]
/** Ô Triệu hồi phụ nằm sau 5 đường */
const EXTRA_LANE = 5
const KEG: cg.TokenDef = {
    id: "keg", name: "Thùng Thuốc Súng", hp: 1, armor: 0, mr: 0, ownerId: GP, soak: false, hidden: true
}
/** VFX bị cắt ở 15s nên cue dài được nối bằng lần phát mới */
const CUE_RELAY_MS = 9500
/** Mỗi lượt khi tua Thuốc Súng cho nhanh */
const FAST_TURN_MS = 340
const TURN_MS = 1000
const GOLD_ART = "/card_support/gold.png"

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}
/** Sát thương tăng vọt theo công thức p·n·(1 + n/k), số demo */
const blastDamage = (n: number) => Math.round(34 * n * (1 + n / 6))

let nextCard = 0
const makeCard = (card: Omit<cg.Card, "uid">): cg.Card => ({
    ...card, uid: `gp-demo-${++nextCard}`
})
const skillCard = (key: "q" | "e" | "r") => makeCard({
    kind: "skill", id: `gangplank_${key}`, hero: "gangplank", side: "A"
})
const goldCard = () => makeCard({
    kind: "support", id: "gold"
})
const itemCard = () => makeCard({
    kind: "support", id: "item", item: "kiem_dai"
})
const basicCard = () => makeCard({
    kind: "support", id: "basic"
})

function artOf(card: cg.Card) {
    if (card.kind === "skill") return `/card_skills/${card.id}.png`
    if (card.id === "gold") return GOLD_ART
    if (card.item) return `/card_items/${card.item}.png`
    return "/card_support/basic.png"
}

export async function runGangplankShowcase(say: (text: string) => void) {
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
    /** Bản dựng riêng của demo: engine thật không biết Thùng mới, chỉ store nhìn thấy */
    private staged: cg.GameState
    private keg = ""
    private powder = 0
    /** Đổi thế hệ là thả ngòi cũ */
    private fuseRun = 0
    private wantedRun = 0
    private stopped = false
    private fallen: Animation[] = []
    private button: HTMLButtonElement | null = null

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        this.stopped = true
        this.fuseRun++
        this.wantedRun++
        this.button?.remove()
        for (const anim of this.fallen) anim.cancel()
    }

    private slot(): Pt {
        const rect = laneRect(GP,
            EXTRA_LANE,
            "A")
        return rect ? ptOf(rect) : unitPt(this.keg)
    }

    private give(card: cg.Card) {
        flushSync(() => applyToDisplay([{
            t: "create", side: "A", card, zone: "hand"
        }]))
    }

    /** Lá rời tay: lá nhấc lên một nhịp rồi biến khỏi tay, trả về điểm bay */
    private async lift(card: cg.Card): Promise<Pt> {
        if (!getCard().view?.players.A.hand?.some(c => c.uid === card.uid)) this.give(card)
        const el = document.querySelector<HTMLElement>(`[data-hand-uid="${CSS.escape(card.uid)}"]`)
        const rect = el?.getBoundingClientRect()
        el?.animate([{
            transform: "translateY(0)"
        },
        {
            transform: "translateY(-34px)"
        }],
        {
            duration: 240, fill: "forwards", easing: "ease-out"
        })
        await sleep(280)
        flushSync(() => applyToDisplay([{
            t: "play", side: "A", card
        }]))
        return rect ? {
            x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 - 34
        } : handPt("A",
            "A")
    }

    /** Nút Úp Lá nằm trên lá Gangplank; chỉ sáng khi ô phụ trống */
    private showButton() {
        const rect = unitRect(GP)
        if (!rect) return
        const b = document.createElement("button")
        b.textContent = "Úp Lá"
        b.dataset.gangplankFacedown = "true"
        b.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height * .56}px;transform:translate(-50%,-50%);z-index:60;pointer-events:none;padding:5px 14px;border:1px solid #f0c060;border-radius:6px;background:linear-gradient(#7a4a20,#3a2010);color:#ffe9b0;font:800 18px/1.2 system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.6)`
        document.body.append(b)
        this.button = b
    }

    private async press() {
        const b = this.button
        if (!b) return
        b.style.opacity = "1"
        b.animate([{
            transform: "translate(-50%,-50%) scale(1)", filter: "brightness(1)"
        },
        {
            transform: "translate(-50%,-50%) scale(1.28)", filter: "brightness(1.7)"
        },
        {
            transform: "translate(-50%,-50%) scale(.9)", filter: "brightness(1.2)"
        },
        {
            transform: "translate(-50%,-50%) scale(1)", filter: "brightness(1)"
        }],
        {
            duration: 420
        })
        await sleep(440)
        b.style.opacity = ".38"
    }

    private fuse() {
        const run = ++this.fuseRun
        const slot = this.slot()
        const amount = this.powder
        const tether = {
            target: () => slot, released: () => run !== this.fuseRun, contact() {}
        }
        void (async () => {
            while (run === this.fuseRun && !this.stopped) {
                void playVfx(G.fuse,
                    this.slot(),
                    [],
                    {
                        ...TONE, amount, tether
                    })
                for (let waited = 0; run === this.fuseRun && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
            }
        })()
    }

    /** Đặt lá Thùng thật vào ô phụ của bản dựng */
    private putKeg(powder: number) {
        const g = new cg.Game(this.staged)
        const token = g.summonToken("A",
            KEG)
        this.keg = token.id
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([{
            t: "summonToken", side: "A", unit: token.id, name: KEG.name, owner: GP
        }]))
        this.setPowder(powder)
    }

    private setPowder(powder: number) {
        this.powder = powder
        flushSync(() => applyToDisplay([{
            t: "stack", unit: this.keg, key: "kegs", value: powder
        }]))
        this.fuse()
    }

    /** Thùng rời ô phụ, ngòi tắt cùng lúc */
    private dropKeg() {
        this.fuseRun++
        const id = this.keg
        const tok = this.staged.units[id]
        if (tok) new cg.Game(this.staged).removeToken(tok,
            "dead")
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([{
            t: "tokenEnd", unit: id, reason: "dead"
        }]))
        this.keg = ""
        this.powder = 0
    }

    /** Lá rơi xuống ô phụ thành Thùng, chạm là lá Thùng hiện */
    private async place(card: cg.Card, powder: number) {
        const from = await this.lift(card)
        await new Promise<void>((resolve) => {
            void playVfx(G.place,
                from,
                [this.slot()],
                {
                    ...TONE, icon: artOf(card), amount: powder,
                    onBeat: () => {
                        this.putKeg(powder)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Nút Úp Lá: bấm nút, chọn lá trên tay, Thùng úp 0 Thuốc Súng */
    private async faceDown(card: cg.Card) {
        await this.press()
        await this.place(card,
            0)
    }

    /** Đầu lượt: +1 Thuốc Súng, bột trút xuống, chạm là số đổi và ngòi lớn thêm */
    private gain() {
        const next = this.powder + 1
        return new Promise<void>((resolve) => {
            void playVfx(G.gain,
                unitPt(this.keg),
                [],
                {
                    ...TONE, amount: next,
                    onBeat: () => {
                        this.setPowder(next)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    private async turns(count: number, gap: number) {
        for (let i = 0; i < count; i++) {
            await this.gain()
            await sleep(gap)
        }
    }

    /** Thùng lật ra lá gì; ngửa mặt là báo */
    private flip(card: cg.Card, at: Pt) {
        return new Promise<void>((resolve) => {
            void playVfx(G.flip,
                at,
                [],
                {
                    ...TONE, icon: artOf(card), onBeat: resolve
                }).finally(resolve)
        })
    }

    /** Đòn vào Thùng: chạm là thùng vỡ, lá trong đó lật */
    private async smash(attacker: string, card: cg.Card) {
        const hero = attacker.split(":")[1]
        const style = heroBasicVfx(hero)
        const tone = {
            color: style.color, color2: style.color2
        }
        const at = this.slot()
        await strike(style.travel,
            attacker,
            [this.keg],
            tone,
            () => {
                void playVfx(style.impact,
                    at,
                    [],
                    tone)
                void playVfx(G.shatter,
                    at,
                    [],
                    TONE)
                this.dropKeg()
            })
        await this.flip(card,
            at)
        return at
    }

    /** Lửa từ ô phụ tới mục tiêu; chạm là mọi nạn nhân mất máu cùng nhịp */
    private blast(at: Pt, targets: string[], powder: number) {
        return new Promise<void>((resolve) => {
            void playVfx(G.detonate,
                at,
                targets.map(id => unitPt(id)),
                {
                    ...TONE, amount: powder,
                    onBeat: () => {
                        for (const id of targets) {
                            landDamage(id,
                                blastDamage(powder),
                                "physical")
                            void playVfx(G.hit,
                                unitPt(id),
                                [],
                                {
                                    ...TONE, amount: powder
                                })
                        }
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    private flyHome(name: string, from: Pt, icon: string, amount: number, cards: cg.Card[]) {
        return new Promise<void>((resolve) => {
            void playVfx(name,
                from,
                [handPt("A",
                    "A")],
                {
                    ...TONE, icon, amount,
                    onBeat: () => {
                        for (const card of cards) this.give(card)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Lá thường: luồng hồi về Gangplank, chạm là hồi */
    private healFrom(at: Pt, amount: number) {
        return new Promise<void>((resolve) => {
            void playVfx(G.heal,
                at,
                [unitPt(GP)],
                {
                    ...TONE,
                    onBeat: () => {
                        landHeal(GP,
                            amount)
                        void playVfx(Q.impact,
                            unitPt(GP),
                            [],
                            Q)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Gangplank tự chém Thùng: lá chiêu nổ theo Thuốc Súng, mọi địch nhận */
    private async detonate() {
        const powder = this.powder
        const at = this.slot()
        const tone = {
            color: CUTLASS.color, color2: CUTLASS.color2
        }
        await strike(CUTLASS.travel,
            GP,
            [this.keg],
            tone,
            () => this.dropKeg())
        await this.blast(at,
            ENEMIES,
            powder)
    }

    /** Q: ba quả cam vào miệng; cắn là hồi, Giáp, lá E bay về tay cùng nhịp */
    private async oranges() {
        const card = skillCard("q")
        await this.lift(card)
        await new Promise<void>((resolve) => {
            void playVfx(Q.cast ?? "none",
                unitPt(GP),
                [],
                {
                    ...Q,
                    onBeat: () => {
                        landHeal(GP,
                            150)
                        land({
                            t: "status", target: GP, id: "armor_up", turns: 2, v: 40, src: GP, card: "gangplank_q"
                        })
                        void playVfx(Q.impact,
                            unitPt(GP),
                            [],
                            Q)
                        resolve()
                    }
                }).finally(resolve)
        })
        const found = skillCard("e")
        await this.flyHome(G.card,
            deckPt("A",
                "A"),
            skillIcon("gangplank",
                "e"),
            1,
            [found])
        return found
    }

    /** R, phần mở màn: lệnh truy nã đóng lên mục tiêu, [Truy Nã] cùng nhịp. Trả về hàm thả lệnh */
    private async wanted(target: string) {
        const card = skillCard("r")
        await this.lift(card)
        const run = ++this.wantedRun
        const portrait = getCard().view?.units[target]?.hero
        let burnt = false
        const tether = {
            target: () => unitPt(target), released: () => burnt || run !== this.wantedRun, contact() {}
        }
        await new Promise<void>((resolve) => {
            void playVfx(R.cast ?? "none",
                unitPt(GP),
                [unitPt(target)],
                {
                    ...TONE, tether, icon: portrait ? `/heroes/${portrait}.jpg` : undefined,
                    onBeat: () => {
                        land({
                            t: "status", target, id: "wanted", turns: 2, v: 1, src: GP, card: "gangplank_r"
                        })
                        resolve()
                    }
                }).finally(resolve)
        })
        return () => { burnt = true }
    }

    /** R, phần nổ: Thùng bung, đạn lửa chỉ tới kẻ bị truy nã; chạm là lệnh cháy rụi, số và lửa cùng đáp */
    private shot(target: string, land_: () => void) {
        const powder = this.powder
        const at = this.slot()
        void playVfx(G.shatter,
            at,
            [],
            TONE)
        this.dropKeg()
        return new Promise<void>((resolve) => {
            void playVfx(R.travel,
                at,
                [unitPt(target)],
                {
                    ...TONE, amount: powder,
                    onBeat: () => {
                        land_()
                        void playVfx(R.impact,
                            unitPt(target),
                            [],
                            {
                                ...TONE, amount: powder
                            })
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Tướng gục: KO nổi, lá xám xuống; trả lại khi hết demo */
    private fall(id: string, amount: number) {
        const unit = getCard().view?.units[id]
        const staged = this.staged.units[id]
        if (!unit || !staged) return
        staged.hp = 0
        receiveCardState(this.game.view(this.staged))
        land({
            t: "damage", target: id, amount, hpLost: unit.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        })
        land({
            t: "kill", src: GP, target: id
        })
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
        const tone = {
            color: CUTLASS.color, color2: CUTLASS.color2
        }
        const skill = skillCard("q")
        const gold = goldCard()
        const item = itemCard()
        const other = basicCard()
        for (const card of [skill,
            gold,
            item,
            other]) this.give(card)
        presetWound(GP,
            260)

        say("Đánh thường · Gangplank: gươm chém ngay trên mục tiêu, sát thương vật lý")
        await strike(CUTLASS.travel,
            GP,
            [OPPOSITE],
            tone,
            () => landDamage(OPPOSITE,
                73,
                "physical"))
        await sleep(800)

        this.showButton()
        say("Nút Úp Lá: ô phụ trống, Gangplank úp 1 lá trên tay thành Thùng 0 Thuốc Súng, đối thủ không thấy là lá gì")
        await sleep(700)
        await this.faceDown(skill)
        await sleep(1300)

        say("Nội tại · Thuốc Súng: đầu lượt +1, không trần. Thuốc Súng 1")
        await this.gain()
        await sleep(TURN_MS)
        say("Nội tại · Thuốc Súng: lượt sau +1. Thuốc Súng 2, ngòi cháy lớn thêm")
        await this.gain()
        await sleep(TURN_MS)
        say("Nội tại · Thuốc Súng: lượt sau +1. Thuốc Súng 3, mỗi đốm lửa trên ngòi là 1 Thuốc Súng")
        await this.gain()
        await sleep(TURN_MS + 300)

        say("Garen chém vỡ Thùng: Thùng lật ra lá chiêu, nổ theo Thuốc Súng, chỉ kẻ phá nhận")
        const skillAt = await this.smash("B:garen",
            skill)
        await this.blast(skillAt,
            ["B:garen"],
            3)
        await sleep(1500)

        say("Úp Lá: úp lá Vàng, 2 Thuốc Súng")
        await this.faceDown(gold)
        await this.turns(2,
            FAST_TURN_MS)
        await sleep(500)
        say("Jinx bắn vỡ Thùng: Thùng lật ra lá Vàng, 2 lá Vàng về tay Gangplank")
        const goldAt = await this.smash("B:jinx",
            gold)
        await this.flyHome(G.gold,
            goldAt,
            GOLD_ART,
            2,
            [goldCard(),
                goldCard()])
        await sleep(1100)

        say("Úp Lá: úp lá Đồ, 1 Thuốc Súng")
        await this.faceDown(item)
        await this.turns(1,
            FAST_TURN_MS)
        await sleep(500)
        say("Leona chém vỡ Thùng: Thùng lật ra lá Đồ, lá về tay")
        const itemAt = await this.smash("B:leona",
            item)
        await this.flyHome(G.card,
            itemAt,
            artOf(item),
            1,
            [item])
        await sleep(1100)

        say("Úp Lá: úp lá khác, 1 Thuốc Súng")
        await this.faceDown(other)
        await this.turns(1,
            FAST_TURN_MS)
        await sleep(500)
        say("Lux bắn vỡ Thùng: Thùng lật ra lá khác, Gangplank hồi Máu theo Máu tối đa")
        const otherAt = await this.smash("B:lux",
            other)
        await this.healFrom(otherAt,
            120)
        await sleep(1300)

        say("Tự kích nổ · Thuốc Súng 1: gươm chém Thùng, mọi địch nhận, nổ nhỏ")
        await this.faceDown(skillCard("q"))
        await this.turns(1,
            FAST_TURN_MS)
        await sleep(300)
        await this.detonate()
        await sleep(1500)

        say("Tự kích nổ · Thuốc Súng 3: nổ lớn hơn, sát thương tăng vọt")
        await this.faceDown(skillCard("q"))
        await this.turns(3,
            FAST_TURN_MS)
        await sleep(300)
        await this.detonate()
        await sleep(1700)

        say("Tự kích nổ · Thuốc Súng 6: Thùng để lâu, nổ phủ cả hàng địch")
        await this.faceDown(skillCard("q"))
        await this.turns(6,
            FAST_TURN_MS)
        await sleep(300)
        await this.detonate()
        await sleep(2200)
        this.button?.remove()
        this.button = null

        say("Q · Ăn Cam: cam vào miệng, hồi Máu, thêm Giáp, nước cam văng. Tìm 1 lá E về tay")
        const kegCard = await this.oranges()
        await sleep(1300)

        say("E · Thùng Thuốc Súng: lá E úp thẳng thành Thùng 3 Thuốc Súng, đối thủ không thấy")
        await this.place(kegCard,
            3)
        await sleep(1500)

        say("R · Lệnh Truy Nã: lệnh truy nã đóng lên Leona, kích nổ Thùng, lá gì cũng nổ theo Thuốc Súng")
        const freeLeona = await this.wanted("B:leona")
        await sleep(420)
        await this.shot("B:leona",
            () => {
                freeLeona()
                landDamage("B:leona",
                    blastDamage(3) * 2,
                    "physical")
            })
        await sleep(1700)

        say("R · Lệnh Truy Nã lần nữa: Thùng 4 Thuốc Súng, chỉ đánh Jinx, Jinx bị hạ, Gangplank nhận 3 Vàng")
        await this.place(skillCard("e"),
            3)
        await this.turns(1,
            FAST_TURN_MS)
        await sleep(300)
        const freeJinx = await this.wanted("B:jinx")
        await sleep(420)
        await this.shot("B:jinx",
            () => {
                freeJinx()
                this.fall("B:jinx",
                    blastDamage(4) * 2)
                void this.flyHome(G.gold,
                    unitPt("B:jinx"),
                    GOLD_ART,
                    3,
                    [goldCard(),
                        goldCard(),
                        goldCard()])
            })
        await sleep(2200)
    }
}
