// Demo VFX đủ bộ chiêu Yorick theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Ma Sương là vật triệu hồi thật trong bản dựng riêng của demo, nên lá hiện ở ô Triệu hồi phụ. Bài bị Đốt lấy đúng từ bộ đối thủ của bản dựng. Tên hiệu ứng lấy từ heroMap.
import {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    deckPt, gravePt, handPt, laneRect, lunge, ptOf, unitEl, unitPt
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
    YORICK_RELAY_MS
} from "../fx_yorick"
import {
    YORICK_VFX as V, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import type {
    Pt
} from "../types"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("yorick",
    "q")
const E = skillVfx("yorick",
    "e")
const R = skillVfx("yorick",
    "r")
const P = skillVfx("yorick",
    "p")
const TONE = {
    color: P.color, color2: P.color2
}
const MIST_TONE = {
    color: E.color, color2: E.color2
}
const YORICK = "A:yorick"
const FACING = "B:annie"
const ENEMIES = ["B:garen",
    "B:leona",
    FACING,
    "B:jinx",
    "B:lux"]
/** Ô Triệu hồi phụ nằm sau 5 đường */
const EXTRA_LANE = 5
const SOUL_KEY = "Hồn Ma"
const EVOLVE_KEY = "Tiến Hoá"
/** Số demo của nội tại: mỗi tầng, mỗi bội số */
const HP_PER_SOUL = 9
const ARMOR_PER_SOUL = 2
const SOUL_STEP = 20
/** Số demo của Tiến Hoá: r8, r9, r10 */
const EVOLVE_HP = 260
const EVOLVE_ARMOR = 30
const EVOLVE_DAMAGE = 30
const MAIDEN_HP = 520
const MAIDEN_ARMOR = 40
const MAIDEN_DAMAGE = 44
const YORICK_DAMAGE = 62
const SHRED = 25
/** Tua Hồn Ma qua nhiều lượt */
const FAST_SOUL_MS = 95
const MIST: cg.TokenDef = {
    id: "mist_walker", name: "Ma Sương", hp: MAIDEN_HP, atk: MAIDEN_DAMAGE, armor: MAIDEN_ARMOR, mr: 30, ownerId: YORICK, soak: false
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

let nextCard = 0
const rCard = (): cg.Card => ({
    uid: `yorick-demo-${++nextCard}`, kind: "skill", id: "yorick_r", hero: "yorick", side: "A"
})
const R_ART = "/card_skills/yorick_r.png"

export async function runYorickShowcase(say: (text: string) => void) {
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
    /** Bản dựng riêng của demo: engine thật không biết Ma Sương hay Hồn Ma, chỉ store nhìn thấy */
    private staged: cg.GameState
    private souls = 0
    private tier = 0
    private maiden = ""
    private auraRun = 0
    private maidenRun = 0
    private stopped = false
    private held: Animation[] = []
    private growth?: Animation
    private bigger?: Animation

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        this.stopped = true
        this.auraRun++
        this.maidenRun++
        this.growth?.cancel()
        this.bigger?.cancel()
        for (const anim of this.held) anim.cancel()
    }

    private slot(): Pt {
        const rect = laneRect(YORICK,
            EXTRA_LANE,
            "A")
        return rect ? ptOf(rect) : unitPt(this.maiden)
    }

    /** Đổi chỉ số trên lá: giữ đúng Máu, Khiên, trạng thái đang hiện rồi nạp bản dựng vào bàn */
    private restat(id: string, fn: (u: cg.Unit) => void) {
        const shown = getCard().view?.units[id]
        const u = this.staged.units[id]
        if (!shown || !u) return
        u.hp = shown.hp
        u.shield = shown.shield
        u.statuses = copy(shown.statuses)
        u.stacks = copy(shown.stacks)
        fn(u)
        receiveCardState(this.game.view(this.staged))
        // sự kiện nội bộ để nạp lại lá, không phải việc xảy ra trong trận nên không ghi nhật ký
        flushSync(() => {
            applyToDisplay([{
                t: "transform", unit: id, id: "demo", on: true
            }])
            const shownNow = getCard()
            shownNow.log = shownNow.log.slice(0,
                -1)
        })
    }

    /** Đặt số Hồn Ma trên lá: Máu tối đa, Giáp, lá to thêm, giáp hồn dày thêm */
    private setSouls(next: number, number = true) {
        const step = next - this.souls
        this.souls = next
        this.restat(YORICK,
            (u) => {
                u.maxHp += step * HP_PER_SOUL
                u.hp = Math.min(u.maxHp,
                    u.hp)
                u.stacks[SOUL_KEY] = next
                if (next > 0) u.statuses.armor_up = {
                    ...(u.statuses.armor_up ?? {
                        until: this.staged.turnNo + 99, at: this.staged.turnNo
                    }),
                    v: next * ARMOR_PER_SOUL, src: YORICK, card: "yorick_p"
                }
            })
        if (number && step > 0) landHeal(YORICK,
            step * HP_PER_SOUL)
        this.growth?.cancel()
        this.growth = unitEl(YORICK)?.animate([{
            scale: `${1 + Math.min(.1,
                next * .0026)}`
        },
        {
            scale: `${1 + Math.min(.1,
                next * .0026)}`
        }],
        {
            duration: 1, fill: "forwards"
        })
        void this.showAura()
    }

    /** Giáp hồn bám lá tới hết demo */
    private async showAura() {
        const run = ++this.auraRun
        const amount = this.souls
        if (amount <= 0) return
        const tether = {
            target: () => unitPt(YORICK), released: () => run !== this.auraRun, contact() {}
        }
        while (run === this.auraRun && !this.stopped) {
            void playVfx(V.aura,
                unitPt(YORICK),
                [],
                {
                    ...TONE, amount, tether
                })
            for (let waited = 0; run === this.auraRun && waited < YORICK_RELAY_MS; waited += 200) await sleep(200)
        }
    }

    /** Ma Sương đứng trên ô phụ tới hết demo; đổi bậc là thân lớn hơn */
    private async showMaiden() {
        const run = ++this.maidenRun
        const id = this.maiden
        const amount = this.tier
        const tether = {
            target: () => unitPt(id), released: () => run !== this.maidenRun, contact() {}
        }
        while (run === this.maidenRun && !this.stopped) {
            void playVfx(V.maidenAura,
                unitPt(id),
                [],
                {
                    ...TONE, amount, tether
                })
            for (let waited = 0; run === this.maidenRun && waited < YORICK_RELAY_MS; waited += 200) await sleep(200)
        }
    }

    /** Lấy lá trên đỉnh bộ đối thủ của bản dựng */
    private topCard() {
        return this.staged.players.B.deck.shift()
    }

    /** Đốt n lá: mỗi lá rời bộ, tới ô Mộ là số Mộ nhảy */
    private mill(count: number) {
        for (let i = 0; i < count; i++) {
            const card = this.topCard()
            if (!card) return
            window.setTimeout(() => {
                if (this.stopped) return
                flushSync(() => applyToDisplay([{
                    t: "drawAuto", side: "B", card
                }]))
                void playVfx(V.mill,
                    deckPt("B",
                        "A"),
                    [gravePt("B",
                        "A")],
                    {
                        ...TONE,
                        onBeat: () => {
                            if (!this.stopped) flushSync(() => applyToDisplay([{
                                t: "discard", side: "B", card, reason: "effect"
                            }]))
                        }
                    })
            },
            i * 130)
        }
    }

    private gainSoul() {
        const next = this.souls + 1
        this.setSouls(next)
        void playVfx(V.gain,
            unitPt(YORICK),
            [],
            {
                ...TONE, amount: next
            })
        return next
    }

    /** Ma Sương đánh tại mục tiêu; chạm là mất Máu và Đốt 1 lá cùng lúc */
    private claw(target: string) {
        const amount = MAIDEN_DAMAGE + this.tier * EVOLVE_DAMAGE
        void lunge(unitEl(this.maiden),
            unitPt(this.maiden),
            unitPt(target),
            380)
        return new Promise<void>((resolve) => {
            void playVfx(V.claw,
                unitPt(target),
                [],
                {
                    ...TONE, amount: this.tier,
                    onBeat: () => {
                        landDamage(target,
                            amount,
                            "physical")
                        this.mill(1)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Đòn Yorick: xẻng bổ ngay tại mục tiêu; trúng là Đốt, Hồn Ma và đòn Ma Sương cùng nhịp */
    private async attack(target: string, burn = 1) {
        void lunge(unitEl(YORICK),
            unitPt(YORICK),
            unitPt(target),
            380)
        await basicAttack(YORICK,
            target,
            YORICK_DAMAGE)
        this.mill(burn)
        const count = this.gainSoul()
        if (this.maiden) void this.claw(target)
        return count
    }

    /** Tua nhiều lượt: số Hồn Ma tăng nhanh tới `to`, bàn địch hồi lại như qua nhiều vòng */
    private async rush(to: number) {
        for (const id of ENEMIES) {
            const unit = getCard().view?.units[id]
            if (unit && unit.hp < unit.maxHp) presetWound(id,
                unit.hp - unit.maxHp)
        }
        while (this.souls < to) {
            this.setSouls(this.souls + 1,
                false)
            if (this.souls % 6 === 0) void playVfx(V.gain,
                unitPt(YORICK),
                [],
                {
                    ...TONE, amount: this.souls
                })
            await sleep(FAST_SOUL_MS)
        }
    }

    /** Mốc bội số: lá R bay lên tay, tới tay là lá thật xuất hiện */
    private milestone() {
        const card = rCard()
        return new Promise<cg.Card>((resolve) => {
            void playVfx(V.milestone,
                unitPt(YORICK),
                [handPt("A",
                    "A")],
                {
                    ...TONE, icon: R_ART,
                    onBeat: () => {
                        flushSync(() => applyToDisplay([{
                            t: "create", side: "A", card, zone: "hand"
                        }]))
                        resolve(card)
                    }
                }).finally(() => resolve(card))
        })
    }

    /** Lá rời tay: lá nhấc lên một nhịp rồi biến khỏi tay */
    private async playCard(card: cg.Card) {
        const el = document.querySelector<HTMLElement>(`[data-hand-uid="${CSS.escape(card.uid)}"]`)
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
    }

    private async q(target: string, amount: number, heal: number) {
        void lunge(unitEl(YORICK),
            unitPt(YORICK),
            unitPt(target),
            420)
        await strike(Q.travel,
            YORICK,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                landHeal(YORICK,
                    heal)
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TONE)
                void playVfx(Q.extra ?? "none",
                    unitPt(YORICK),
                    [],
                    TONE)
            })
    }

    /** E: khối sương đen rơi xuống; chạm là sát thương, Rã Giáp, Đốt bài cùng nhịp, có Ma Sương thì bà đánh luôn tướng đó */
    private async e(target: string, amount: number, burn: number) {
        await strike(E.travel,
            YORICK,
            [target],
            MIST_TONE,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                land({
                    t: "status", target, id: "shred", turns: 2, v: SHRED, src: YORICK, card: "yorick_e"
                })
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    MIST_TONE)
                void playVfx(E.extra ?? "none",
                    unitPt(target),
                    [],
                    MIST_TONE)
                this.mill(burn)
                if (this.maiden) void this.claw(target)
            })
    }

    private placeMaiden() {
        const g = new cg.Game(this.staged)
        const token = g.summonToken("A",
            MIST)
        this.maiden = token.id
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([{
            t: "summonToken", side: "A", unit: token.id, name: MIST.name, owner: YORICK
        }]))
        void this.showMaiden()
    }

    /** R lần đầu: Yorick gọi, sương dâng ở ô phụ, thân bà đứng dậy; thành hình là lá Ma Sương hiện */
    private async summon(card: cg.Card) {
        await this.playCard(card)
        const slot = this.slot()
        await new Promise<void>((resolve) => {
            void playVfx(R.cast ?? "none",
                unitPt(YORICK),
                [slot],
                {
                    ...TONE, onBeat: resolve
                }).finally(resolve)
        })
        await new Promise<void>((resolve) => {
            void playVfx(R.impact,
                slot,
                [],
                {
                    ...TONE, intensity: R.intensity, amount: 0,
                    onBeat: () => {
                        this.placeMaiden()
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** R khi đã có Ma Sương: lốc hồn, thân bà lớn dần; đỉnh là hồi đầy, +Máu, +Giáp, +sát thương và lá to ra cùng đáp */
    private async evolve(card: cg.Card) {
        await this.playCard(card)
        const id = this.maiden
        const next = this.tier + 1
        this.maidenRun++
        await new Promise<void>((resolve) => {
            void playVfx(V.evolve,
                unitPt(id),
                [],
                {
                    ...TONE, intensity: R.intensity, amount: next,
                    onBeat: () => {
                        this.tier = next
                        this.restat(id,
                            (u) => {
                                u.maxHp += EVOLVE_HP
                                u.stacks[EVOLVE_KEY] = next
                                if (u.token) {
                                    u.token.armor += EVOLVE_ARMOR
                                    u.token.atk += EVOLVE_DAMAGE
                                }
                            })
                        const shown = getCard().view?.units[id]
                        if (shown) landHeal(id,
                            shown.maxHp - shown.hp)
                        this.bigger?.cancel()
                        const big = `${1 + next * .1}`
                        this.bigger = unitEl(id)?.animate([{
                            scale: "1", filter: "none"
                        },
                        {
                            scale: big, filter: "brightness(1.28) saturate(1.3)"
                        }],
                        {
                            duration: 320, fill: "forwards", easing: "ease-out"
                        })
                        void this.showMaiden()
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Yorick gục: mất nửa Hồn Ma, Ma Sương biến mất; lá xám xuống, trả lại khi hết demo */
    private async die() {
        const unit = getCard().view?.units[YORICK]
        if (!unit) return
        const id = this.maiden
        const at = this.slot()
        land({
            t: "damage", target: YORICK, amount: unit.hp, hpLost: unit.hp, absorbed: 0, kind: "physical", tag: "attack", hp: 0
        })
        land({
            t: "kill", src: "B:garen", target: YORICK
        })
        const anim = unitEl(YORICK)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        })
        if (anim) this.held.push(anim)
        this.maidenRun++
        void playVfx(V.shed,
            unitPt(YORICK),
            [],
            TONE)
        void playVfx(V.fade,
            at,
            [],
            {
                ...TONE, amount: this.tier
            })
        this.bigger?.cancel()
        const tok = this.staged.units[id]
        if (tok) new cg.Game(this.staged).removeToken(tok,
            "owner")
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([{
            t: "tokenEnd", unit: id, reason: "owner"
        }]))
        this.maiden = ""
        this.setSouls(Math.floor(this.souls / 2),
            false)
        this.auraRun++
    }

    async play() {
        const say = this.say
        say("Đánh thường · Xẻng đào mộ tại mục tiêu. Trúng: Đốt 1 lá bộ đối thủ vào Mộ, Hồn Ma 1")
        await this.attack(FACING)
        await sleep(1500)

        say("Nội tại · Người Đào Mộ: mỗi Hồn Ma thêm Máu tối đa và Giáp, giáp hồn dày dần. Hồn Ma 2")
        await this.attack("B:leona")
        await sleep(1300)

        say("Nội tại · Người Đào Mộ: Hồn Ma 3, bộ đối thủ mòn dần, Mộ đầy lên")
        await this.attack("B:jinx")
        await sleep(1400)

        say("Qua nhiều lượt · Hồn Ma chồng lên 19: Máu tối đa, Giáp tăng, lá Yorick to dần")
        await this.rush(SOUL_STEP - 1)
        await sleep(1200)

        say("Mốc 20 Hồn Ma: đòn này tạo 1 lá R, lá bay lên tay")
        await this.attack(FACING)
        const firstR = await this.milestone()
        await sleep(1200)

        say("Q · Nghi Thức Cuối: xẻng lớn bổ tại đối diện, sát thương theo Máu tối đa, hồi Máu cùng nhịp")
        await this.q(FACING,
            180,
            120)
        await sleep(1600)

        say("R · Khúc Ai Ca: gọi Ma Sương vào ô Triệu hồi phụ")
        await this.summon(firstR)
        await sleep(2100)

        say("Đầu lượt · Ma Sương đánh đối diện, Đốt 1 lá")
        await this.claw(FACING)
        await sleep(1500)

        say("Ma Sương đánh cùng Yorick: mỗi đòn của Yorick, bà đánh theo, thêm 1 lá vào Mộ")
        await this.attack(FACING)
        await sleep(1700)

        say("E · Sương Sầu: khối sương đen, Đốt 3 lá, Rã Giáp Jinx. Có Ma Sương: bà đánh luôn tướng đó")
        await this.e("B:jinx",
            150,
            3)
        await sleep(2000)

        say("Địch đánh Ma Sương: Garen chém bà, Máu tụt")
        await basicAttack("B:garen",
            this.maiden,
            280)
        await sleep(1400)

        say("Qua nhiều lượt · Hồn Ma lên 39")
        await this.rush(SOUL_STEP * 2 - 1)
        await sleep(900)

        say("Mốc 40 Hồn Ma: thêm 1 lá R")
        await this.attack(FACING)
        const secondR = await this.milestone()
        await sleep(1200)

        say("R · Khúc Ai Ca khi đã có Ma Sương: hồi đầy, Tiến Hoá 1, thân bà lớn hơn, thêm Máu, Giáp, sát thương")
        await this.evolve(secondR)
        await sleep(2300)

        say("Ma Sương Tiến Hoá đánh mạnh hơn cùng Yorick")
        await this.attack(FACING)
        await sleep(1900)

        say("Yorick chết: mất một nửa Hồn Ma, Ma Sương biến mất")
        await this.die()
        await sleep(2400)
    }
}
