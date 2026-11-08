// Demo VFX đủ bộ chiêu Jinx theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: chạm là VFX, trừ Máu, số nổi, Điên và trạng thái cùng đáp.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    unitEl, unitPt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    JINX_VFX, LEONA_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("jinx",
    "q")
const E = skillVfx("jinx",
    "e")
const R = skillVfx("jinx",
    "r")
const P = skillVfx("jinx",
    "p")
const BASIC = heroBasicVfx("jinx")
const GUN = {
    color: BASIC.color, color2: BASIC.color2
}
const ROCKET = {
    color: Q.color, color2: Q.color2
}
const CHOMP = {
    color: E.color, color2: E.color2
}
const MEGA = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const CRAZE = {
    color: P.color, color2: P.color2
}
const FOE_STRIKE = {
    color: 0xff4a32, color2: 0xffc9a8
}
const JINX = "A:jinx"
/** Theo thứ tự đường: tên lửa lan sang 2 ô kề trong mảng này */
const ROW = ["B:garen",
    "B:leona",
    "B:annie",
    "B:gangplank",
    "B:lux"]
const FACING = "B:annie"
/** VFX bị cắt ở 15s nên cue dài được nối bằng lần phát mới trước khi lần cũ hết */
const CUE_RELAY_MS = 9500
/** Khoảng cách các loạt đạn: Bằng Chíu có Tốc Đánh nên bắn sát nhau */
const MINIGUN_GAP_MS = 240

const unit = (id: string) => getCard().view?.units[id]

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Đưa tướng về đúng % Máu đã mất, không hiện số nổi */
function woundTo(id: string, percent: number) {
    const u = unit(id)
    if (!u) return
    const lost = u.hp - Math.round(u.maxHp * (1 - percent / 100))
    if (lost > 0) presetWound(id,
        lost)
}

const neighbours = (id: string) => {
    const i = ROW.indexOf(id)
    return [ROW[i - 1],
        ROW[i + 1]].filter(Boolean)
}

/** Hiệu ứng mở màn rồi đi tiếp ngay ở ctx.onBeat, không chờ đuôi hạt tan */
const opener = (name: string, from: string, to: string[], tone: Parameters<typeof playVfx>[3]) => new Promise<void>((resolve) => {
    void playVfx(name,
        unitPt(from),
        to.map(id => unitPt(id)),
        {
            ...tone, onBeat: resolve
        }).finally(resolve)
})

export async function runJinxShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run(say)
    try {
        await run.play()
    } finally {
        run.stop()
        closeHits()
    }
}

class Run {
    private frenzy = 0
    /** Lá đang nhuộm xám vì gục, huỷ khi xong demo */
    private fallen: (Animation | undefined)[] = []
    private endGun = () => {}
    private endAura = () => {}
    private cues = new Set<() => void>()

    constructor(private say: (text: string) => void) {}

    stop() {
        this.endGun()
        this.endAura()
        for (const end of this.cues) end()
        this.cues.clear()
        for (const a of this.fallen) a?.cancel()
    }

    /** Hiệu ứng bám lá kéo dài: nối lần phát mới trước khi lần cũ hết; trả về hàm thả */
    private cue(name: string, id: string, to: string[], tone: Parameters<typeof playVfx>[3]) {
        let ended = false
        const tether = {
            target: () => unitPt(id), released: () => ended, contact() {}
        }
        const relay = async () => {
            while (!ended) {
                void playVfx(name,
                    unitPt(id),
                    to.map(t => unitPt(t)),
                    {
                        ...tone, tether
                    })
                for (let waited = 0; !ended && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
            }
        }
        void relay()
        const end = () => {
            ended = true
            this.cues.delete(end)
        }
        this.cues.add(end)
        return end
    }

    /** Súng đang cầm hiện ở đầu lá Jinx */
    private hold(rocket: boolean) {
        this.endGun()
        this.endGun = this.cue(JINX_VFX.stance,
            JINX,
            [FACING],
            {
                ...(rocket ? ROCKET : GUN), amount: rocket ? 1 : 0
            })
    }

    /** Cơn Phấn Khích dữ theo số Điên: đổi số là nối bản mới */
    private fume() {
        this.endAura()
        if (this.frenzy > 0) this.endAura = this.cue(P.extra ?? "none",
            JINX,
            [],
            {
                ...CRAZE, amount: this.frenzy
            })
    }

    private setFrenzy(value: number) {
        this.frenzy = value
        applyToDisplay([{
            t: "stack", unit: JINX, key: "frenzy", value
        }])
        this.fume()
    }

    /** Nhận Điên đúng nhịp đòn đáp: tia điện chạy về Jinx, số trên lá và cơn Phấn Khích đổi ngay */
    private gain(amount: number, sources: string[]) {
        this.setFrenzy(this.frenzy + amount)
        void playVfx(P.cast ?? "none",
            unitPt(JINX),
            sources.map(id => unitPt(id)),
            {
                ...CRAZE, amount
            })
    }

    private crazeHit(target: string) {
        void playVfx(P.impact,
            unitPt(target),
            [],
            {
                ...CRAZE, amount: this.frenzy
            })
    }

    /** Hạ gục: Máu về 0 cùng nhịp cú trúng, lá ngả xám */
    private fell(id: string, killer: string) {
        const u = unit(id)
        if (!u) return
        land({
            t: "damage", target: id, amount: u.hp, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src: killer, target: id
        }
        queueImpacts([ko])
        landImpacts([ko])
        this.fallen.push(unitEl(id)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        }))
    }

    /** Phấn Khích: thêm Điên và pháo hoa quanh Jinx, cùng nhịp cú hạ */
    private excited(victim: string, amount: number) {
        this.setFrenzy(this.frenzy + amount)
        void playVfx(JINX_VFX.kill,
            unitPt(JINX),
            [unitPt(victim)],
            CRAZE)
    }

    /** Nòng quay, mưa đạn lam, vỏ đạn văng: chạy kèm đòn đánh gốc */
    private spin(target: string) {
        void playVfx(JINX_VFX.spin,
            unitPt(JINX),
            [unitPt(target)],
            GUN)
    }

    /** Một loạt Bằng Chíu: đòn đánh gốc, chạm là trừ Máu; lấy `after` để thêm Điên cùng nhịp */
    private burst(target: string, amount: number, after?: () => void) {
        this.spin(target)
        return strike(BASIC.travel,
            JINX,
            [target],
            GUN,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                this.crazeHit(target)
                after?.()
            })
    }

    /** Nhiều loạt sát nhau: Tốc Đánh của Bằng Chíu */
    private spray(target: string, amount: number, hits: number, gained: number) {
        return Promise.all(Array.from({
            length: hits
        },
        (_, i) => sleep(i * MINIGUN_GAP_MS).then(() => this.burst(target,
            amount,
            () => this.gain(gained,
                [target])))))
    }

    /** Đòn hạ gục của Bằng Chíu: Máu về 0, Phấn Khích nổ cùng lúc */
    private finish(target: string) {
        this.spin(target)
        return strike(BASIC.travel,
            JINX,
            [target],
            GUN,
            () => {
                this.fell(target,
                    JINX)
                this.crazeHit(target)
                this.excited(target,
                    10)
            })
    }

    /** Một quả Bệ Phóng: mục tiêu và 2 đường kề cùng nổ, chung một nhịp */
    private rocket(target: string, amount: number, splash: number, gained: number) {
        const side = neighbours(target)
        const tone = {
            ...ROCKET, amount: this.frenzy
        }
        return strike(Q.travel,
            JINX,
            [target],
            tone,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                for (const id of side) landDamage(id,
                    splash,
                    "physical")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    tone)
                void playVfx(JINX_VFX.splash,
                    unitPt(target),
                    side.map(id => unitPt(id)),
                    tone)
                this.crazeHit(target)
                if (gained) this.gain(gained,
                    [target])
            })
    }

    /** Q: súng cũ cất đi, súng mới bung ra từ lá. Bằng Chíu mới có dấu Tốc Đánh */
    private async swap(rocket: boolean) {
        this.endGun()
        if (rocket) applyToDisplay([{
            t: "statusEnd", target: JINX, id: "jinx_q"
        }])
        await opener(rocket ? Q.cast ?? "none" : Q.extra ?? "none",
            JINX,
            [FACING],
            rocket ? ROCKET : GUN)
        this.hold(rocket)
        if (!rocket) land({
            t: "status", target: JINX, id: "jinx_q", turns: 9, v: 1, src: JINX, card: "jinx_q"
        })
    }

    /** E nối chuỗi: địch gồng đòn vào đúng 1 tướng mình, bom bay trước, sát thương và Mù đáp cùng lúc nên đòn tan */
    private async chomp(attacker: string, victim: string, amount: number) {
        const from = unitPt(attacker), to = unitPt(victim)
        let cancelled = false
        void playVfx(LEONA_VFX.windup,
            from,
            [to],
            {
                ...FOE_STRIKE,
                tether: {
                    target: () => unitPt(attacker), released: () => cancelled, contact() {}
                }
            })
        await sleep(1000)
        this.say("E · Lựu Đạn Ma Hỏa! (nối chuỗi): Quick, Jinx ném bom vào Garen trước khi đòn đáp")
        let endCloud = () => {}
        await strike(E.travel,
            JINX,
            [attacker],
            CHOMP,
            () => {
                landDamage(attacker,
                    amount,
                    "physical")
                land({
                    t: "status", target: attacker, id: "blind", turns: 1, v: 1, src: JINX, card: "jinx_e"
                })
                void playVfx(E.impact,
                    unitPt(attacker),
                    [],
                    CHOMP)
                endCloud = this.cue(E.extra ?? "none",
                    attacker,
                    [],
                    CHOMP)
                cancelled = true
                void playVfx(LEONA_VFX.fizzle,
                    from,
                    [to],
                    FOE_STRIKE)
                this.say("Mù huỷ đòn: đòn của Garen tan biến, Ashe không mất Máu")
            })
        await sleep(2300)
        endCloud()
        applyToDisplay([{
            t: "statusEnd", target: attacker, id: "blind"
        }])
    }

    /** R: nạp đạn, tên lửa khổng lồ, mục tiêu và 2 bên nổ một nhịp; đòn hạ thì Phấn Khích cùng lúc */
    private async mega(target: string, splash: number) {
        const side = neighbours(target)
        const tone = {
            ...MEGA, amount: this.frenzy
        }
        await opener(R.cast ?? "none",
            JINX,
            [target],
            tone)
        await strike(R.travel,
            JINX,
            [target],
            tone,
            () => {
                this.fell(target,
                    JINX)
                for (const id of side) landDamage(id,
                    splash,
                    "physical")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    tone)
                void playVfx(JINX_VFX.splash,
                    unitPt(target),
                    side.map(id => unitPt(id)),
                    tone)
                this.excited(target,
                    10)
            })
    }

    /** Jinx gục: nửa số Điên văng ra, cơn Phấn Khích dịu lại */
    private async fall(attacker: string) {
        const style = heroBasicVfx(attacker.split(":")[1])
        const tone = {
            color: style.color, color2: style.color2
        }
        await strike(style.travel,
            attacker,
            [JINX],
            tone,
            () => {
                const lost = Math.floor(this.frenzy / 2)
                this.endGun()
                this.fell(JINX,
                    attacker)
                void playVfx(style.impact,
                    unitPt(JINX),
                    [],
                    tone)
                void playVfx(JINX_VFX.shed,
                    unitPt(JINX),
                    [],
                    {
                        ...CRAZE, amount: lost
                    })
                this.setFrenzy(this.frenzy - lost)
                this.endAura()
            })
    }

    async play() {
        const say = this.say
        say("Q · Đổi Súng: ra sân chọn Bằng Chíu, nhận Tốc Đánh")
        await this.swap(false)
        await sleep(1150)

        say("Đánh thường · Bằng Chíu: loạt đạn lam dày, Garen đầy Máu nên không có cơ hội nhận Điên")
        await this.spray("B:garen",
            38,
            2,
            0)
        await sleep(1300)

        woundTo(FACING,
            70)
        say("Nội tại · Phấn Khích: Annie mất 70% Máu, đòn trúng dễ nhận Điên")
        await sleep(900)
        await this.spray(FACING,
            42,
            3,
            2)
        await sleep(1300)

        say(`Điên · ${this.frenzy}: đòn thêm sát thương, cơn Phấn Khích bùng trên lá`)
        await this.spray(FACING,
            58,
            3,
            2)
        await sleep(1450)

        woundTo("B:lux",
            97)
        say("Hạ gục · Lux còn chút Máu: đòn kết liễu")
        await sleep(900)
        await this.finish("B:lux")
        say(`Hạ gục · Phấn Khích: thêm 10 Điên, ${this.frenzy} Điên`)
        await sleep(2200)

        say("Q · Đổi Súng: dùng lá, đổi sang Bệ Phóng Cá Mập")
        await this.swap(true)
        await sleep(1050)

        say("Đánh thường · Bệ Phóng: một quả tên lửa cá mập, Leona và Gangplank ở 2 đường kề cùng dính nổ")
        await this.rocket(FACING,
            96,
            44,
            2)
        await sleep(1950)

        say(`Bệ Phóng · ${this.frenzy} Điên: tên lửa to hơn, nổ rộng hơn`)
        await this.rocket("B:leona",
            120,
            52,
            0)
        await sleep(1950)

        say("Q · Đổi Súng: quay lại Bằng Chíu, Tốc Đánh trở lại")
        await this.swap(false)
        await sleep(800)
        await this.spray(FACING,
            62,
            3,
            0)
        await sleep(1450)

        say("Chuỗi · Garen gồng đòn đánh đúng 1 tướng: Ashe")
        await this.chomp("B:garen",
            "A:ashe",
            72)
        await sleep(650)

        woundTo("B:leona",
            90)
        say("R · Tên Lửa Đạn Đạo Siêu Khủng Khiếp!: Leona mất 90% Máu, thêm sát thương theo Máu đã mất")
        await this.mega("B:leona",
            90)
        say(`R hạ gục: Phấn Khích, ${this.frenzy} Điên; Garen và Annie hai bên nhận một phần`)
        await sleep(2850)

        say("Luật chết · Jinx gục: mất một nửa Điên")
        await this.fall("B:gangplank")
        await sleep(2850)
    }
}
