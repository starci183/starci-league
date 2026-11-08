// Demo VFX đủ bộ chiêu Malphite theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp. Malphite không có khống chế nên R không gây Choáng; đòn chia qua mạch là một cú trúng, mọi số rơi cùng lúc.
import type {
    cg
} from "@starci/shared"
import {
    unitEl, unitPt
} from "../../anim/helpers"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    MALPHITE_VEIN_MS
} from "../fx_malphite"
import {
    MALPHITE_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("malphite",
    "q")
const E = skillVfx("malphite",
    "e")
const R = skillVfx("malphite",
    "r")
const P = skillVfx("malphite",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const SLAM = {
    ...TONE, intensity: R.intensity
}
const MALPHITE = "A:malphite"
const TEAM = ["A:ashe",
    "A:darius",
    MALPHITE,
    "A:viktor",
    "A:ornn"]
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Lần mạch mới nối vào trước khi lần cũ tan để mạch đá không hở */
const VEIN_RELAY_MS = MALPHITE_VEIN_MS - 120

/** Mở màn xong là lao đi, không chờ đuôi bụi của mở màn tan */
const OPENER_Q_MS = 280
const OPENER_R_MS = 560

const heroOf = (id: string) => id.split(":")[1]
const unitOf = (id: string) => getCard().view?.units[id]

/** Bản hiển thị của demo: gắn trạng thái lên lá, không qua engine */
function landStatus(id: string, status: string, card: string) {
    applyToDisplay([{
        t: "status", target: id, id: status, turns: 2, v: 20, src: MALPHITE, card
    }])
}

class Run {
    /** Hàm cắt mạch của từng đồng minh đang nối */
    private links = new Map<string, () => void>()
    private falls: Animation[] = []

    stop() {
        for (const end of this.links.values()) end()
        this.links.clear()
        for (const anim of this.falls) anim.cancel()
        this.falls = []
    }

    /** Tất cả tướng trong mạch, Malphite đầu tiên */
    private linked() {
        return [MALPHITE,
            ...this.links.keys()]
    }

    /** Mạch đá sống tới khi đứt: nối lần mới trước khi lần cũ tan; mọc tới nơi là ra nhịp */
    private link(ally: string) {
        return new Promise<void>((resolve) => {
            let ended = false
            const tether = {
                target: () => unitPt(ally), released: () => ended, contact() {}
            }
            const relay = async () => {
                for (let first = true; !ended; first = false) {
                    void playVfx(E.travel,
                        unitPt(MALPHITE),
                        [unitPt(ally)],
                        {
                            ...TONE, tether, amount: first ? 0 : 1,
                            onBeat: () => {
                                if (!first) return
                                void playVfx(E.impact,
                                    unitPt(ally),
                                    [],
                                    TONE)
                                void playVfx(E.impact,
                                    unitPt(MALPHITE),
                                    [],
                                    TONE)
                                resolve()
                            }
                        })
                    for (let waited = 0; !ended && waited < VEIN_RELAY_MS; waited += 100) await sleep(100)
                }
            }
            this.links.set(ally,
                () => { ended = true })
            void relay()
        })
    }

    /** Một đòn địch vào tướng trong mạch: chia đều, cả mạch sáng và mọi số rơi đúng lúc chạm */
    private splitHit(attacker: string, victim: string, total: number) {
        const style = heroBasicVfx(heroOf(attacker))
        const tone = {
            color: style.color, color2: style.color2
        }
        const group = this.linked()
        const share = Math.round(total / group.length)
        return strike(style.travel,
            attacker,
            [victim],
            tone,
            () => {
                void playVfx(style.impact,
                    unitPt(victim),
                    [],
                    tone)
                this.surge(victim)
                for (const id of group) {
                    landDamage(id,
                        share,
                        "physical")
                    void playVfx(MALPHITE_VFX.crack,
                        unitPt(id),
                        [],
                        {
                            ...TONE, intensity: id === victim ? 2 : 1
                        })
                }
            })
    }

    private surge(victim: string) {
        void playVfx(MALPHITE_VFX.surge,
            unitPt(victim),
            this.linked().map(id => unitPt(id)),
            TONE)
    }

    /** Tướng gục: máu về 0, KO nổi, lá xám xuống. Bản hiển thị của demo không có đường chết thật nên làm tối lá ngay trên DOM và trả lại khi hết demo */
    private fall(id: string, amount: number) {
        const u = unitOf(id)
        if (!u) return
        const hit: cg.GameEvent = {
            t: "damage", target: id, amount, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        }
        queueImpacts([hit])
        landImpacts([hit])
        applyToDisplay([hit])
        const ko: cg.GameEvent = {
            t: "kill", src: "B:jinx", target: id
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
        if (anim) this.falls.push(anim)
    }

    /** Đưa tướng về đúng số Máu, không hiện số nổi */
    private woundTo(id: string, hp: number) {
        const u = unitOf(id)
        if (u && u.hp > hp) presetWound(id,
            u.hp - hp)
    }

    /** Đòn chí tử vào một tướng trong mạch: phần chia của người khác trừ bình thường, tướng hết máu gục đúng nhịp đó */
    private lethalHit(attacker: string, victim: string, total: number, dying: () => void) {
        const style = heroBasicVfx(heroOf(attacker))
        const tone = {
            color: style.color, color2: style.color2
        }
        const group = this.linked()
        const share = Math.round(total / group.length)
        return strike(style.travel,
            attacker,
            [victim],
            tone,
            () => {
                void playVfx(style.impact,
                    unitPt(victim),
                    [],
                    tone)
                this.surge(victim)
                for (const id of group) {
                    if (id === victim) this.fall(id,
                        share)
                    else landDamage(id,
                        share,
                        "physical")
                }
                dying()
            })
    }

    /** Lux: một đòn đánh cả đội, mạch không sáng vì sát thương cả đội không chia */
    private async teamBlast(amount: number) {
        const lux = skillVfx("lux",
            "q")
        const tone = {
            color: lux.color, color2: lux.color2
        }
        for (const id of TEAM) {
            landDamage(id,
                amount,
                "magic")
            void playVfx(lux.impact,
                unitPt(id),
                [],
                tone)
        }
        await sleep(1100)
    }

    /** Q: mảnh đá chạm là sát thương, cả đội nhận Giáp cùng nhịp */
    private async shard(target: string, amount: number) {
        void playVfx(Q.cast ?? "none",
            unitPt(MALPHITE),
            [],
            TONE)
        await sleep(OPENER_Q_MS)
        await strike(Q.travel,
            MALPHITE,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TONE)
                for (const id of TEAM) {
                    landStatus(id,
                        "armor_up",
                        "malphite_q")
                    void playVfx(Q.extra ?? "none",
                        unitPt(id),
                        [],
                        TONE)
                }
            })
    }

    /** R: tụ, lao, đáp. Sóng đá, sát thương, mất Giáp của cả hàng địch cùng một nhịp */
    private async slam(amount: number) {
        void playVfx(R.cast ?? "none",
            unitPt(MALPHITE),
            [],
            SLAM)
        await sleep(OPENER_R_MS)
        await strike(R.travel,
            MALPHITE,
            ENEMIES,
            SLAM,
            () => {
                void playVfx(R.extra ?? "none",
                    unitPt("B:annie"),
                    ENEMIES.map(id => unitPt(id)),
                    SLAM)
                for (const id of ENEMIES) {
                    landDamage(id,
                        amount,
                        "magic")
                    landStatus(id,
                        "armor_down",
                        "malphite_r")
                    void playVfx(R.impact,
                        unitPt(id),
                        [],
                        SLAM)
                }
            })
    }

    async play(say: (text: string) => void) {
        say("Đánh thường · Malphite: nắm đấm đá")
        await basicAttack(MALPHITE,
            "B:annie",
            63)
        await sleep(800)

        say("Nội tại · Thân Đá: Malphite còn trên bàn, cả đội thêm Giáp và Máu tối đa")
        await Promise.all(TEAM.map(id => playVfx(P.impact,
            unitPt(id),
            [],
            TONE)))
        await sleep(300)

        say("Q · Mảnh Vỡ Địa Chấn: sát thương phép lên Leona, cả đội thêm Giáp")
        await this.shard("B:leona",
            120)
        await sleep(1500)

        say("E · Mạch Đá: nối Darius với Malphite, Liên Kết Đá vĩnh viễn")
        await this.link("A:darius")
        await sleep(1000)

        say("E · Mạch Đá: nối thêm Viktor, nhiều đồng minh cùng nối được")
        await this.link("A:viktor")
        await sleep(1000)

        say("E · Nhanh: Garen vừa đánh Ashe, Malphite nối chuỗi E vào Ashe")
        await this.link("A:ashe")
        await sleep(300)
        say("Garen đánh Ashe 200: chia đều 4 tướng trong mạch, mỗi tướng 50")
        await this.splitHit("B:garen",
            "A:ashe",
            200)
        await sleep(1500)

        say("Jinx bắn Viktor 160: chia đều 4 tướng, mỗi tướng 40")
        await this.splitHit("B:jinx",
            "A:viktor",
            160)
        await sleep(1400)

        say("Lux đánh cả đội: sát thương cả đội không chia, mạch đá không sáng")
        await this.teamBlast(70)
        await sleep(400)

        say("R · Không Thể Cản Phá: Malphite lao vào, đập nát cả hàng địch, địch mất Giáp")
        await this.slam(130)
        await sleep(1900)

        say("Ashe gục: chỉ nhánh mạch của Ashe đứt, các mạch khác còn nguyên")
        this.woundTo("A:ashe",
            40)
        await this.lethalHit("B:jinx",
            "A:ashe",
            160,
            () => {
                this.links.get("A:ashe")?.()
                this.links.delete("A:ashe")
                void playVfx(MALPHITE_VFX.breakLink,
                    unitPt(MALPHITE),
                    [unitPt("A:ashe")],
                    TONE)
            })
        await sleep(1700)

        say("Malphite gục: toàn bộ Liên Kết Đá vỡ tan")
        this.woundTo(MALPHITE,
            40)
        const allies = [...this.links.keys()]
        await this.lethalHit("B:garen",
            MALPHITE,
            120,
            () => {
                this.stopLinks()
                void playVfx(MALPHITE_VFX.shatter,
                    unitPt(MALPHITE),
                    allies.map(id => unitPt(id)),
                    TONE)
            })
        await sleep(2000)
    }

    private stopLinks() {
        for (const end of this.links.values()) end()
        this.links.clear()
    }
}

export async function runMalphiteShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run()
    try {
        await run.play(say)
    } finally {
        run.stop()
        closeHits()
    }
}
