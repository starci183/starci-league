// Demo VFX đủ bộ chiêu Aatrox theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: sát thương, số nổi và hồi máu của nội tại cùng đáp; dải máu hiện cùng lúc trên toàn đường nên không có nhịp thứ hai.
import type {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    unitPt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    AATROX_BLOOD_RAGE, AATROX_FORM_AURA, AATROX_REBIRTH, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, openHits
} from "./showcaseHits"

const Q = skillVfx("aatrox",
    "q")
const E = skillVfx("aatrox",
    "e")
const R = skillVfx("aatrox",
    "r")
const P = skillVfx("aatrox",
    "p")
const BASIC = heroBasicVfx("aatrox")
const toneOf = (style: typeof Q) => ({
    color: style.color, color2: style.color2, intensity: style.intensity
})
const AATROX = "A:aatrox"
/** Đối diện và 2 đường kề của Aatrox ở đường giữa */
const CLEAVE = ["B:leona",
    "B:annie",
    "B:jinx"]
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Số minh hoạ cho demo, số thật nằm trong JSON cân bằng */
const LIFESTEAL = .2
const PAY = .25
const FORM_AD = 28
const FORM_HP = .3
const SURVIVE = .3
/** VFX bị cắt ở 15s nên cue dài được nối bằng lần phát mới trước khi lần cũ hết */
const CUE_RELAY_MS = 9500

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export async function runAatroxShowcase(say: (text: string) => void) {
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
        // trả bàn về đúng trạng thái engine, không giữ dạng biến hình của demo
        game.showState(game.state)
    }
}

class Run {
    private staged: cg.GameState
    private form = false
    private endRage: (() => void) | null = null
    private endForm: (() => void) | null = null

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        this.endRage?.()
        this.endForm?.()
    }

    private me() {
        const unit = getCard().view?.units[AATROX]
        if (!unit) throw new Error("Demo Aatrox: bàn chưa sẵn sàng")
        return unit
    }

    /** % Máu đã mất, nội tại gấp đôi trong dạng Kẻ Diệt Thế */
    private lost() {
        const unit = this.me()
        return Math.round((1 - unit.hp / unit.maxHp) * 100)
    }

    private power() {
        return this.lost() * (this.form ? 2 : 1)
    }

    /** Sát thương đã cộng nội tại */
    private scaled(base: number) {
        return Math.round(base * (1 + this.power() / 100))
    }

    /** Cue chạy nối đuôi trên lá Aatrox tới khi gọi hàm trả về */
    private cue(name: string, amount: number) {
        let ended = false
        const tether = {
            target: () => unitPt(AATROX), released: () => ended, contact() {}
        }
        const relay = async () => {
            while (!ended) {
                void playVfx(name,
                    unitPt(AATROX),
                    [],
                    {
                        ...toneOf(P), amount, tether
                    })
                for (let waited = 0; !ended && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
            }
        }
        void relay()
        return () => { ended = true }
    }

    /** Khí huyết quanh lá đọc đúng Máu đang mất */
    private rage() {
        this.endRage?.()
        // trong dạng Kẻ Diệt Thế đã có cánh, khí huyết nhẹ lại để không che lá tướng
        this.endRage = this.cue(AATROX_BLOOD_RAGE,
            this.lost() * (this.form ? .5 : 1))
    }

    /** Hồi máu nội tại ngay trong nhịp trúng: dải máu từ các nạn nhân về Aatrox cùng số xanh lá */
    private drain(sources: string[], damage: number) {
        const amount = this.power()
        for (const id of sources) void playVfx(P.extra ?? "none",
            unitPt(id),
            [unitPt(AATROX)],
            {
                ...toneOf(P), amount
            })
        landHeal(AATROX,
            Math.round(damage * LIFESTEAL * (this.form ? 2 : 1)))
    }

    /** Đòn đánh: nhát kiếm fx_basics tại mục tiêu, phần nội tại và hút máu đáp cùng lúc */
    private attack(target: string, base: number) {
        const damage = this.scaled(base)
        const amount = this.power()
        const tone = {
            color: BASIC.color, color2: BASIC.color2
        }
        return strike(BASIC.travel,
            AATROX,
            [target],
            tone,
            () => {
                landDamage(target,
                    damage,
                    "physical")
                void playVfx(P.impact,
                    unitPt(target),
                    [],
                    {
                        ...toneOf(P), amount
                    })
                this.drain([target],
                    damage)
                this.rage()
            })
    }

    /** E: xích bay, chạm là sát thương, hút máu cùng nhịp */
    private chains(target: string, base: number) {
        const damage = this.scaled(base)
        return strike(E.travel,
            AATROX,
            [target],
            toneOf(E),
            () => {
                landDamage(target,
                    damage,
                    "physical")
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    toneOf(E))
                this.drain([target],
                    damage)
                this.rage()
            })
    }

    /** Q: hiến Máu là mở màn, kiếm đọng lại, rồi một nhát duy nhất xuống cả ba đường */
    private async blade(base: number, sayCut: string) {
        landDamage(AATROX,
            Math.round(this.me().hp * PAY),
            "true")
        this.rage()
        await strike(Q.cast ?? "none",
            AATROX,
            [],
            toneOf(Q),
            () => {})
        const each = this.scaled(base)
        await strike(Q.travel,
            AATROX,
            CLEAVE,
            toneOf(Q),
            () => {
                this.say(sayCut)
                for (const id of CLEAVE) {
                    landDamage(id,
                        each,
                        "physical")
                    void playVfx(Q.impact,
                        unitPt(id),
                        [],
                        toneOf(Q))
                }
                this.drain(CLEAVE,
                    each * CLEAVE.length)
                this.rage()
            })
    }

    /** Dựng dạng Kẻ Diệt Thế vào bản demo để lá tướng hiện khung đỏ, AD và Máu tối đa mới, giữ Máu đang hiển thị */
    private enter() {
        const shown = copy(this.me())
        const gain = Math.round(shown.maxHp * FORM_HP)
        this.staged.units[AATROX] = {
            ...shown,
            maxHp: shown.maxHp + gain,
            transform: {
                id: "aatrox_r", until: this.game.state.turnNo + 4, at: this.game.state.turnNo, bonus: {
                    atk: FORM_AD
                }, hpBonus: gain, healMult: 1.5
            }
        } as cg.GameState["units"][string]
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([{
            t: "transform", unit: AATROX, id: "aatrox_r", on: true
        }]))
        landHeal(AATROX,
            gain)
        this.form = true
    }

    /** R: tụ máu, rồi cùng một nhịp cánh bung, chỉ số tăng, mọi địch trúng */
    private async worldEnder(base: number) {
        await strike(R.cast ?? "none",
            AATROX,
            [],
            toneOf(R),
            () => {
                this.enter()
                void playVfx(R.extra ?? "none",
                    unitPt(AATROX),
                    [],
                    toneOf(R))
                const damage = this.scaled(base)
                for (const id of ENEMIES) {
                    landDamage(id,
                        damage,
                        "physical")
                    void playVfx(R.impact,
                        unitPt(id),
                        [],
                        toneOf(R))
                }
                this.drain(ENEMIES,
                    damage)
                this.rage()
                this.endForm = this.cue(AATROX_FORM_AURA,
                    0)
            })
    }

    /** Đòn chí mạng đưa Máu về đáy, máu rút vào lõi rồi bùng dậy đúng lúc Máu lên */
    private async survive(killer: string) {
        const lethal = this.me().hp + 60
        await basicAttack(killer,
            AATROX,
            lethal)
        this.rage()
        await strike(AATROX_REBIRTH,
            AATROX,
            [],
            toneOf(R),
            () => {
                const unit = this.me()
                landHeal(AATROX,
                    Math.round(unit.maxHp * SURVIVE))
                this.rage()
            })
    }

    async play() {
        const say = this.say
        say("Đánh thường · Aatrox gần đầy Máu: đại kiếm chém ngay trên mục tiêu, sát thương còn thấp")
        await basicAttack("B:annie",
            AATROX,
            40)
        await this.attack("B:annie",
            46)
        await sleep(950)

        say("Nội tại · Cái Giá Bằng Máu: Annie đánh trả, Máu tụt, khí huyết bốc dày quanh Aatrox")
        await basicAttack("B:annie",
            AATROX,
            Math.round(this.me().maxHp * .42))
        this.rage()
        await sleep(800)
        say(`Nội tại · mất ${this.lost()}% Máu: cùng một đòn, sát thương cao hơn, máu văng nhiều hơn và hút lại`)
        await this.attack("B:annie",
            46)
        await sleep(950)

        await basicAttack("B:annie",
            AATROX,
            Math.round(this.me().hp * .62))
        this.rage()
        say(`Nội tại · mất ${this.lost()}% Máu: Máu càng cạn đòn càng nặng`)
        await sleep(800)
        await this.attack("B:annie",
            46)
        await sleep(1000)

        say("E · Xiềng Xích Hút Máu: xích xoắn đôi quấn 1 địch bất kỳ đường, sát thương và hồi Máu cùng nhịp")
        await this.chains("B:lux",
            52)
        await sleep(1200)

        say("Q · Lưỡi Gươm Darkin: hiến Máu hiện tại, máu đọng thành đại kiếm")
        await this.blade(40,
            "Q · một nhát bổ xuống đối diện và 2 đường kề, máu đã mất càng nhiều càng đau, hút máu từ cả ba")
        await sleep(1400)

        say("R · Kẻ Diệt Thế: máu cả bàn bị hút về Aatrox")
        await this.worldEnder(30)
        say("R · Cánh quỷ bung, mọi địch trúng; thêm AD, Máu tối đa, Tốc Đánh, nội tại gấp đôi")
        await sleep(2000)

        say("R · Dạng Kẻ Diệt Thế: AD cao hơn, đánh nhanh, hút máu gấp đôi")
        await this.attack("B:annie",
            32)
        await sleep(260)
        await this.attack("B:annie",
            32)
        await sleep(1000)

        say("R · Lần đầu về 0: Jinx bắn đòn kết liễu")
        await this.survive("B:jinx")
        say("R · Không chết: Aatrox bùng dậy, giữ lại một phần Máu")
        await sleep(1500)

        say("Q · Lưỡi Gươm Darkin trong dạng Kẻ Diệt Thế: nhát chém mạnh nhất")
        await this.blade(40,
            "Q · nội tại gấp đôi, cánh quỷ vẫn giương")
        await sleep(1800)
    }
}
