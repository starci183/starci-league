// Demo VFX đủ bộ chiêu Lissandra theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất nơi VFX, trừ máu, số nổi, Hoá Băng, Choáng cùng đáp.
import type {
    cg
} from "@starci/shared"
import {
    ptOf, unitEl, unitPt
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
    LISS_HOLD_MAX_MS
} from "../fx_lissandra"
import {
    heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits
} from "./showcaseHits"

const Q = skillVfx("lissandra",
    "q")
const E = skillVfx("lissandra",
    "e")
const R = skillVfx("lissandra",
    "r")
const P = skillVfx("lissandra",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const TOMB = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const LISS = "A:lissandra"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Ô lá bài trên tay đối thủ; lá chiêu của tướng nào do scenarios.ts chia sẵn */
const SLOT_GAREN = 1
const SLOT_LEONA = 3
/** Nối lần phát băng trên lá trước khi lần cũ tự hết */
const RELAY_MS = LISS_HOLD_MAX_MS - 600

const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}
const slotEl = (slot: number) => document.querySelector<HTMLElement>(`[data-opponent-card="B"][data-back-slot="${slot}"]`)

/** Góc dưới phải của lá: lissCardFreeze dựa vào đây để viền hạt ôm đúng cỡ lá */
function slotCorner(slot: number) {
    const r = slotEl(slot)?.getBoundingClientRect()
    return r ? [{
        x: r.right, y: r.bottom
    }] : []
}

function slotPt(slot: number) {
    const el = slotEl(slot)
    if (!el) throw new Error("Demo Lissandra: tay đối thủ thiếu lá")
    return ptOf(el.getBoundingClientRect())
}

interface FrozenCard { owner: string; thaw: () => void }

class Run {
    private frozen = new Map<number, FrozenCard>()
    private dims: Animation[] = []

    stop() {
        for (const card of this.frozen.values()) card.thaw()
        this.frozen.clear()
        for (const anim of this.dims) anim.cancel()
        this.dims = []
    }

    /** Lá bị Hoá Băng: cụm băng giữ tới lúc tan, lá ngả lam */
    private freeze(slot: number, owner: string) {
        const at = slotPt(slot)
        const corner = slotCorner(slot)
        let ended = false
        const tether = {
            target: () => at, released: () => ended, contact() {}
        }
        const relay = async () => {
            void playVfx(P.impact,
                at,
                corner,
                {
                    ...TONE, tether
                })
            while (!ended) {
                for (let waited = 0; !ended && waited < RELAY_MS; waited += 200) await sleep(200)
                if (!ended) void playVfx(P.impact,
                    at,
                    corner,
                    {
                        ...TONE, tether, amount: 0
                    })
            }
        }
        void relay()
        const tint = slotEl(slot)?.animate([{
            filter: "none"
        },
        {
            filter: "brightness(1.18) saturate(.72)"
        }],
        {
            duration: 200, fill: "forwards"
        })
        this.frozen.set(slot,
            {
                owner,
                thaw() {
                    ended = true
                    tint?.cancel()
                }
            })
    }

    private thaw(slot: number) {
        this.frozen.get(slot)?.thaw()
        this.frozen.delete(slot)
    }

    /** Băng bò từ cú trúng lên lá; chạm lá là Hoá Băng đáp */
    private creep(from: string, slot: number, owner: string) {
        void playVfx(P.cast ?? "none",
            unitPt(from),
            [slotPt(slot)],
            {
                ...TONE,
                onBeat: () => this.freeze(slot,
                    owner)
            })
    }

    /** Q: giáo băng chạm là sát thương phép và băng bò lên tay đối thủ, cùng một nhịp */
    private async shard(target: string, amount: number, slot: number, owner: string) {
        await playVfx(Q.cast ?? "none",
            unitPt(LISS),
            [],
            TONE)
        await strike(Q.travel,
            LISS,
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
                this.creep(target,
                    slot,
                    owner)
            })
    }

    /** E: có lá chiêu của mục tiêu đang Hoá Băng thì tia băng nối lá với mục tiêu, vòng băng bật lên là Choáng cùng nhịp */
    private async ring(target: string, amount: number, hit: () => void = () => {}) {
        const link = [...this.frozen.entries()].find(([,
            card]) => card.owner === target)
        void playVfx(E.cast ?? "none",
            unitPt(LISS),
            [],
            TONE)
        if (link) void playVfx(E.extra ?? "none",
            slotPt(link[0]),
            [unitPt(target)],
            TONE)
        await strike(E.travel,
            LISS,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                if (link) land({
                    t: "status", target, id: "stun", turns: 1, v: 1, src: LISS, card: "lissandra_e"
                })
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    {
                        ...TONE, amount: link ? 1 : 0
                    })
                hit()
            })
    }

    /** R: băng tràn sang hàng địch, tại nhịp chạm cả hàng trúng phép theo số lá băng và Lissandra tự đóng băng. Trả về hàm phá băng */
    private async tomb() {
        const frozen = this.frozen.size
        let ended = false
        const tether = {
            target: () => unitPt(LISS), released: () => ended, contact() {}
        }
        await playVfx(R.cast ?? "none",
            unitPt(LISS),
            [],
            TOMB)
        for (const [slot,
            card] of this.frozen) void playVfx(E.extra ?? "none",
            slotPt(slot),
            [unitPt(card.owner)],
            TONE)
        await new Promise<void>((closed) => {
            void playVfx(R.travel,
                unitPt(LISS),
                ENEMIES.map(id => unitPt(id)),
                {
                    ...TOMB,
                    onBeat: () => {
                        for (const id of ENEMIES) {
                            landDamage(id,
                                90 + 45 * frozen,
                                "magic")
                            void playVfx(R.impact,
                                unitPt(id),
                                [],
                                {
                                    ...TOMB, amount: frozen
                                })
                        }
                        void playVfx(R.extra ?? "none",
                            unitPt(LISS),
                            [],
                            {
                                ...TOMB, tether, onBeat: closed
                            }).finally(closed)
                    }
                }).catch(closed)
        })
        const dim = unitEl(LISS)?.animate([{
            filter: "none"
        },
        {
            filter: "brightness(.96) saturate(.82)"
        }],
        {
            duration: 200, fill: "forwards"
        })
        return () => {
            ended = true
            dim?.cancel()
        }
    }

    /** Lissandra gục: máu về 0, KO nổi, lá xám xuống như demo Brand */
    private fall() {
        const u = getCard().view?.units[LISS]
        if (!u) return
        land({
            t: "damage", target: LISS, amount: 140, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src: "B:garen", target: LISS
        }
        queueImpacts([ko])
        landImpacts([ko])
        const anim = unitEl(LISS)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        })
        if (anim) this.dims.push(anim)
    }

    async play(say: (text: string) => void) {
        say("Đánh thường · Lissandra: mảnh băng")
        await basicAttack(LISS,
            "B:jinx",
            60)
        await sleep(800)

        say("Nội tại · Băng Sâu: E trúng Jinx, băng bò lên Hoá Băng 1 lá trên tay đối thủ")
        await this.ring("B:jinx",
            120,
            () => this.creep("B:jinx",
                SLOT_GAREN,
                "B:garen"))
        await sleep(1500)

        say("Q · Mảnh Băng: giáo băng trúng Leona, sát thương phép, Hoá Băng 1 lá cùng một nhịp")
        await this.shard("B:leona",
            150,
            SLOT_LEONA,
            "B:leona")
        await sleep(1500)

        say("E · Vòng Băng: lá chiêu của Garen đang Hoá Băng, tia băng nối lá với Garen, sát thương và Choáng cùng nhịp")
        await this.ring("B:garen",
            130)
        await sleep(1700)

        say("Nối chuỗi: Jinx nhắm Lissandra")
        const gun = heroBasicVfx("jinx")
        const gunTone = {
            color: gun.color, color2: gun.color2
        }
        void playVfx("charge",
            unitPt("B:jinx"),
            [],
            gunTone)
        await sleep(620)

        say(`R · Hầm Mộ Băng (Nhanh): băng phun khắp hàng địch, thêm sát thương theo ${this.frozen.size} lá băng, Lissandra tự đóng băng`)
        const breakTomb = await this.tomb()
        await sleep(1000)

        say("R · Đòn của Jinx không còn mục tiêu: Lissandra không bị chọn, không mất Máu")
        await strike(gun.travel,
            "B:jinx",
            [LISS],
            gunTone,
            () => {
                void playVfx(R.block ?? "none",
                    unitPt(LISS),
                    [],
                    TOMB)
            })
        await sleep(1500)

        say("R · Trong băng: Lissandra không hành động được tới hết lượt đối thủ")
        await sleep(1600)

        say("R · Hết lượt đối thủ: khối băng vỡ")
        breakTomb()
        await sleep(1300)

        say("Nội tại · Hết thời gian: lá của Leona tan băng")
        this.thaw(SLOT_LEONA)
        await sleep(1300)

        say("Nội tại · Lissandra gục: mọi lá còn băng tan ngay")
        this.fall()
        this.thaw(SLOT_GAREN)
        await sleep(1700)
    }
}

export async function runLissandraShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run()
    try {
        await run.play(say)
    } finally {
        run.stop()
        closeHits()
    }
}
