// Demo VFX đủ bộ chiêu Azir trên bàn 5 tướng. Chỉ là nơi xem: tên hiệu ứng lấy từ heroMap, không gọi engine.
import {
    unitPt
} from "../../anim/helpers"
import {
    playVfx
} from "../VfxCanvas"
import {
    skillVfx
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

const AZIR = "A:azir"
/** Đồng minh mang Lính và địch đối diện */
const ROW: [string, string][] = [["A:ashe",
    "B:garen"],
["A:azir",
    "B:annie"],
["A:ornn",
    "B:lux"]]

export async function runAzirShowcase(say: (text: string) => void) {
    openHits()
    try { await play(say) } finally {
        closeHits()
    }
}

/** Cả đội Lính đâm một nhịp */
function stabAll(amount: number) {
    const p = skillVfx("azir",
        "p")
    for (const [, id] of ROW) {
        landDamage(id,
            amount,
            "magic")
        void playVfx(p.impact,
            unitPt(id),
            [],
            {
                color: p.color, color2: p.color2
            })
    }
}

async function play(say: (text: string) => void) {
    const q = skillVfx("azir",
            "q"), e = skillVfx("azir",
            "e"), r = skillVfx("azir",
            "r")
    const tone = {
        color: q.color, color2: q.color2
    }
    say("E · Trỗi Dậy: gọi Lính Cát lên đồng minh, chỉ cộng bộ đếm")
    await strike(e.travel,
        AZIR,
        ["A:ashe"],
        tone,
        () => {
            void playVfx(e.impact,
                unitPt("A:ashe"),
                [],
                tone)
        })
    await sleep(1000)

    say("Nội tại: Azir đánh trúng, mọi Lính cùng đâm kẻ trước mặt tướng mang")
    await basicAttack(AZIR,
        "B:annie",
        66).then(() => stabAll(38))
    await sleep(1000)

    say("Q · Cát Càn Quét: mọi Lính đâm 1 kẻ, số nhát theo Tốc Đánh")
    await playVfx(q.cast!,
        unitPt(AZIR),
        [],
        tone)
    await strike(q.travel,
        AZIR,
        ["B:annie"],
        tone,
        () => {
            landDamage("B:annie",
                92,
                "magic")
            void playVfx(q.impact,
                unitPt("B:annie"),
                [],
                tone)
        })
    await sleep(1100)

    say("R · Phân Chia Thiên Hạ: mọi Lính đâm 1 nhát cực đau kẻ trước mặt")
    await new Promise<void>((resolve) => {
        void playVfx(r.cast!,
            unitPt(AZIR),
            ROW.map(([, foe]) => unitPt(foe)),
            {
                ...tone, intensity: 2,
                onBeat() {
                    for (const [, id] of ROW) {
                        landDamage(id,
                            196,
                            "magic")
                        void playVfx(r.impact,
                            unitPt(id),
                            [],
                            {
                                ...tone, intensity: 2
                            })
                    }
                    resolve()
                }
            }).finally(resolve)
    })
    await sleep(1400)
}
