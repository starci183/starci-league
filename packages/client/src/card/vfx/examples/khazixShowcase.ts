// Demo VFX đủ bộ chiêu Kha'Zix theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Qiyana đứng đối diện Tàng Hình để thấy nhịp lộ diện; R là Quick nên chèn giữa đòn của Lux.
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
    KHAZIX_LEAP_MS
} from "../fx_khazix"
import {
    KHAZIX_VFX as K, heroBasicVfx, skillIcon, skillVfx
} from "../heroMap"
import {
    sleep
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

const Q = skillVfx("khazix",
    "q")
const E = skillVfx("khazix",
    "e")
const R = skillVfx("khazix",
    "r")
const P = skillVfx("khazix",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const VOID_TONE = {
    color: P.color, color2: P.color2
}
const CLAW = heroBasicVfx("khazix")
const KHA = "A:khazix"
const STEALTH_FOE = "B:qiyana"
const ATTACKER = "B:lux"
/** VFX bị cắt ở 15s nên cue dài được nối bằng lần phát mới */
const CUE_RELAY_MS = 9500
/** Số lá trên cùng của Bộ bài mà R xáo vào, đúng số (5) trong đặc tả */
const SHUFFLE_TOP = 5
const BASIC_HIT = 40
const ISOLATE_BONUS = 34
const LUNGE_PX = 34

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

let nextCard = 0
const skillCard = (key: "q" | "e" | "r"): cg.Card => ({
    kind: "skill", id: `khazix_${key}`, hero: "khazix", side: "A", uid: `kha-demo-${++nextCard}`
} as cg.Card)

export async function runKhazixShowcase(say: (text: string) => void) {
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
    /** Bản dựng riêng của demo: engine không biết lần đổi chỗ, chỉ store nhìn thấy */
    private staged: cg.GameState
    private cues = new Map<string, () => void>()

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        for (const end of this.cues.values()) end()
        this.cues.clear()
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Kha'Zix: bàn chưa sẵn sàng")
        return view
    }

    private opposite() {
        const view = this.view()
        const id = view.lanes.B[view.units[KHA].lane]
        if (!id) throw new Error("Demo Kha'Zix: không có địch đối diện")
        return id
    }

    /** Cue dài bám lá theo tether, nối lần phát mới trước mốc 15s */
    private cue(key: string, effect: string, id: string) {
        let ended = false
        const tether = {
            target: () => unitPt(id), released: () => ended, contact() {}
        }
        const relay = async () => {
            while (!ended) {
                void playVfx(effect,
                    unitPt(id),
                    [],
                    {
                        ...VOID_TONE, tether
                    })
                for (let waited = 0; !ended && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
            }
        }
        void relay()
        this.cues.set(key,
            () => { ended = true })
    }

    private endCue(key: string) {
        this.cues.get(key)?.()
        this.cues.delete(key)
    }

    private isolate(id: string) {
        land({
            t: "status", target: id, id: "isolated", turns: 1, v: 1, src: KHA, card: "khazix_p"
        })
        void playVfx(P.impact,
            unitPt(id),
            [],
            VOID_TONE)
        this.cue("isolate",
            K.aura,
            id)
    }

    /** Hết lượt: Cô Lập tan cùng lúc status rời lá */
    private unmark(id: string) {
        this.endCue("isolate")
        applyToDisplay([{
            t: "statusEnd", target: id, id: "isolated"
        }])
    }

    /** Sợi mùi bò sang địch; `resolve` là một khoảnh khắc kết quả đáp, ngay lúc xoáy xong */
    private roll(target: string, chance: number, resolved: () => void) {
        return strike(P.travel,
            KHA,
            [target],
            {
                ...VOID_TONE, amount: chance
            },
            resolved)
    }

    /** Cô Lập thành công: status, gai và cue cùng đáp */
    private rollWin(target: string, chance: number) {
        return this.roll(target,
            chance,
            () => this.isolate(target))
    }

    /** Cô Lập trượt: xoáy tím hoá tro rơi */
    private rollLose(target: string, chance: number) {
        return this.roll(target,
            chance,
            () => void playVfx(K.fail,
                unitPt(target),
                [],
                VOID_TONE))
    }

    /** Địch Tàng Hình đối diện: không gieo, màn che rách và Cô Lập cùng đáp */
    private unmask(target: string) {
        return this.roll(target,
            100,
            () => {
                applyToDisplay([{
                    t: "statusEnd", target, id: "stealth"
                }])
                void playVfx(K.reveal,
                    unitPt(target),
                    [],
                    VOID_TONE)
                this.isolate(target)
            })
    }

    /** Cận chiến: lá lao tới mục tiêu một đoạn ngắn rồi về, không có gì bay qua bàn */
    private lunge(target: string) {
        const from = unitPt(KHA), to = unitPt(target)
        const dist = Math.hypot(to.x - from.x,
            to.y - from.y) || 1
        unitEl(KHA)?.animate([
            {
                transform: "translate(0, 0)"
            },
            {
                transform: `translate(${(to.x - from.x) / dist * LUNGE_PX}px, ${(to.y - from.y) / dist * LUNGE_PX}px)`, offset: .35
            },
            {
                transform: "translate(0, 0)"
            }
        ],
        {
            duration: 300, easing: "ease-out"
        })
    }

    /** Đòn đánh: cộng phần Cô Lập vào đúng cú trúng, thêm một nhát rạch hồng cùng nhịp */
    private attack(target: string, lonely: boolean) {
        this.lunge(target)
        if (!lonely) return basicAttack(KHA,
            target,
            BASIC_HIT)
        return strike(CLAW.travel,
            KHA,
            [target],
            CLAW,
            () => {
                landDamage(target,
                    BASIC_HIT + ISOLATE_BONUS,
                    "physical")
                void playVfx(CLAW.impact,
                    unitPt(target),
                    [],
                    CLAW)
                void playVfx(P.extra ?? "none",
                    unitPt(target),
                    [],
                    VOID_TONE)
            })
    }

    private async taste(target: string, lonely: boolean, amount: number) {
        await this.lift(skillCard("q"))
        await this.tasteOnly(target,
            lonely,
            amount)
    }

    /** Q: mở lá xong, móng cào ngay tại mục tiêu */
    private tasteOnly(target: string, lonely: boolean, amount: number) {
        const tone = {
            ...TONE, amount: lonely ? 1 : 0
        }
        this.lunge(target)
        return strike(Q.travel,
            KHA,
            [target],
            tone,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    tone)
            })
    }

    private give(card: cg.Card) {
        flushSync(() => applyToDisplay([{
            t: "create", side: "A", card, zone: "hand"
        }]))
    }

    /** Lá rời tay: nhấc lên một nhịp rồi biến khỏi tay, trả về điểm bay */
    private async lift(card: cg.Card): Promise<Pt> {
        if (!this.view().players.A.hand?.some(c => c.uid === card.uid)) this.give(card)
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

    /** Địch gồng đòn nhắm Kha'Zix: lá ngả về sau. R là Quick nên chen vào đúng lúc này */
    private windup(attacker: string) {
        const from = unitPt(attacker), to = unitPt(KHA)
        const back = 26 / (Math.hypot(to.x - from.x,
            to.y - from.y) || 1)
        const lean = unitEl(attacker)?.animate([
            {
                transform: "translate(0, 0) scale(1)"
            },
            {
                transform: `translate(${(from.x - to.x) * back}px, ${(from.y - to.y) * back}px) scale(1.08)`
            }
        ],
        {
            duration: 520, easing: "ease-out", fill: "forwards"
        })
        void playVfx("charge",
            from,
            [],
            {
                color: 0xfff0a0, color2: 0xffffff
            })
        return () => lean?.cancel()
    }

    /** R: lá lên, thân vỡ vào Tàng Hình đúng nhịp; đòn địch xuyên bóng tàn */
    private async voidAssault(attacker: string) {
        const release = this.windup(attacker)
        await sleep(560)
        this.say("R · Tấn Công Hư Không: Quick khi địch nhắm đúng Kha'Zix, chen vào trước đòn của Lux")
        const card = skillCard("r")
        const from = await this.lift(card)
        await new Promise<void>((resolve) => {
            void playVfx(R.cast ?? "none",
                unitPt(KHA),
                [],
                {
                    ...VOID_TONE, intensity: R.intensity,
                    onBeat: () => {
                        applyToDisplay([{
                            t: "status", target: KHA, id: "stealth", turns: 2, v: 1, src: KHA, card: "khazix_r"
                        }])
                        void playVfx(R.impact,
                            unitPt(KHA),
                            [],
                            {
                                ...VOID_TONE, intensity: R.intensity
                            })
                        this.cue("stealth",
                            K.stealth,
                            KHA)
                        resolve()
                    }
                }).finally(resolve)
        })
        release()
        await sleep(340)
        this.say("R · Tàng Hình: đòn của Lux xuyên qua bóng tàn, không có số sát thương")
        const luxShot = heroBasicVfx(attacker.split(":")[1])
        await strike(luxShot.travel,
            attacker,
            [KHA],
            {
                color: luxShot.color, color2: luxShot.color2
            },
            () => void playVfx(R.extra ?? "none",
                unitPt(KHA),
                [unitPt(attacker)],
                {
                    ...VOID_TONE, color2: luxShot.color
                }))
        await sleep(620)
        return from
    }

    /** Lá Q miễn phí bay từ bóng Kha'Zix vào tay */
    private freeQ() {
        const card = skillCard("q")
        return new Promise<cg.Card>((resolve) => {
            void playVfx(K.freeCard,
                unitPt(KHA),
                [handPt("A",
                    "A")],
                {
                    ...VOID_TONE, icon: skillIcon("khazix",
                        "q"),
                    onBeat: () => {
                        this.give(card)
                        resolve(card)
                    }
                }).finally(() => resolve(card))
        })
    }

    /** Lá R xáo vào Bộ bài: số trên ô tăng đúng lúc xấp lá khép lại */
    private shuffle(from: Pt) {
        return new Promise<void>((resolve) => {
            void playVfx(K.shuffle,
                from,
                [deckPt("A",
                    "A")],
                {
                    ...VOID_TONE, icon: skillIcon("khazix",
                        "r"), amount: SHUFFLE_TOP,
                    onBeat: () => {
                        applyToDisplay([{
                            t: "create", side: "A", card: skillCard("r"), zone: "deck"
                        }])
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const shown = this.view().units
        const ally = move.with ?? ""
        const lanes = this.staged.lanes.A
        lanes[move.from] = ally
        lanes[move.to] = KHA
        this.staged.units[KHA] = {
            ...copy(shown[KHA]), lane: move.to
        } as cg.GameState["units"][string]
        this.staged.units[ally] = {
            ...copy(shown[ally]), lane: move.from
        } as cg.GameState["units"][string]
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([move]))
    }

    /** E: nhảy cung cao sang đối diện mục tiêu, đồng minh nhường chỗ; đáp xuống là sát thương và hiệu ứng cùng lúc */
    private async leap(target: string, amount: number) {
        const view = this.view()
        const from = view.units[KHA].lane
        const to = view.units[target].lane
        const ally = view.lanes.A[to]
        if (!ally) throw new Error("Demo Kha'Zix: không có đồng minh để đổi chỗ")
        await this.lift(skillCard("e"))
        const move = {
            t: "move" as const, unit: KHA, from, to, with: ally
        }
        let moving = true
        const follow = (id: string) => ({
            target: () => unitPt(id), released: () => !moving, contact() {}
        })
        const animations = movementTracks(move,
            "jump").flatMap((track) => {
            const el = unitEl(track.unit), old = unitRect(track.unit)
            const destination = laneRect(track.unit,
                track.to,
                "A")
            if (!el || !old || !destination) return []
            const start = ptOf(old), end = ptOf(destination), dx = end.x - start.x, dy = end.y - start.y
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
                duration: KHAZIX_LEAP_MS, easing: "cubic-bezier(.3,.1,.5,1)", fill: "forwards"
            })]
        })
        void playVfx(E.extra ?? "none",
            unitPt(ally),
            [unitPt(KHA)],
            {
                ...TONE, tether: follow(ally)
            })
        await strike(E.cast ?? "none",
            KHA,
            [ally],
            {
                ...TONE, tether: follow(KHA)
            },
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    TONE)
            })
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        moving = false
        try {
            this.commitSwap(move)
        } finally {
            for (const animation of animations) animation.cancel()
        }
    }

    async play() {
        const say = this.say
        applyToDisplay([{
            t: "status", target: STEALTH_FOE, id: "stealth", turns: 2, v: 1, src: STEALTH_FOE, card: "qiyana_q"
        }])
        applyToDisplay([{
            t: "status", target: ATTACKER, id: "burn", turns: 9, v: 1, src: ATTACKER, card: "brand_q"
        }])
        await sleep(700)

        say("Đầu lượt · Qiyana đối diện đang Tàng Hình: Kha'Zix ngửi thấy, không cần gieo")
        await this.unmask(STEALTH_FOE)
        say("Nội tại · Qiyana bị lộ, luôn Cô Lập tới hết lượt")
        await sleep(1300)

        say("Đánh thường · có Cô Lập: ba vết cào, thêm nhát rạch hồng và sát thương cộng thêm")
        await this.attack(STEALTH_FOE,
            true)
        await sleep(900)

        say("Q · Nếm Thử Nỗi Sợ, có Cô Lập: cào chữ X, gai Hư Không, sát thương cộng thêm")
        await this.taste(STEALTH_FOE,
            true,
            118)
        await sleep(1000)

        say("Hết lượt · Cô Lập tan")
        this.unmark(STEALTH_FOE)
        await sleep(800)

        say("Lượt địch · Lux nhắm đúng Kha'Zix")
        const from = await this.voidAssault(ATTACKER)

        say("R · Lá Q miễn phí bay vào tay, tồn tại tới hết lượt đối phương")
        const free = await this.freeQ()
        await sleep(500)

        say(`R · Lá R xáo vào ${SHUFFLE_TOP} lá trên cùng của Bộ bài`)
        await this.shuffle(from)
        await sleep(800)

        say("Đầu lượt · hết Tàng Hình, Kha'Zix hiện lại")
        this.endCue("stealth")
        applyToDisplay([{
            t: "statusEnd", target: KHA, id: "stealth"
        }])
        void playVfx(K.unveil,
            unitPt(KHA),
            [],
            VOID_TONE)
        await sleep(600)

        const foe = this.opposite()
        say("Đầu lượt · gieo Cô Lập lên Qiyana: chỉ 30%, nó có đồng đội buff và không có bất lợi")
        await this.rollLose(foe,
            30)
        say("Nội tại · Trượt: xoáy tím tan thành tro xám, không có Cô Lập")
        await sleep(1200)

        say("Đánh thường · không Cô Lập: chỉ ba vết cào, sát thương gốc")
        await this.attack(foe,
            false)
        await sleep(900)

        say("Q · Lá miễn phí, không Cô Lập: một lần cào, sát thương gốc")
        await this.lift(free)
        await this.tasteOnly(foe,
            false,
            62)
        await sleep(1000)

        say("E · Vồ Mồi: chọn Lux bất kỳ đường, nhảy sang đối diện, Ornn nhường chỗ")
        await this.leap("B:lux",
            84)
        await sleep(420)

        say("Đổi đường · gieo Cô Lập lên Lux: 30% + 25% không có đồng đội buff + 25% đang Bỏng = 80%")
        await this.rollWin("B:lux",
            80)
        say("Nội tại · Trúng: Lux bị Cô Lập tới hết lượt")
        await sleep(1200)

        say("Đánh thường · có Cô Lập trên Lux")
        await this.attack("B:lux",
            true)
        await sleep(1200)

        this.unmark("B:lux")
        await sleep(900)
    }
}
