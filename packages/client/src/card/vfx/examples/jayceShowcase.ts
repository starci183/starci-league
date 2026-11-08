// Demo VFX đủ bộ chiêu Jayce cả hai dạng trên bàn 5 tướng. Chỉ là nơi xem: tên hiệu ứng lấy từ heroMap, không gọi engine.
import {
    unitPt
} from "../../anim/helpers"
import {
    playVfx
} from "../VfxCanvas"
import {
    JAYCE_CANNON, heroBasicVfx, skillVfx
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

const JAYCE = "A:jayce"
const ALLIES = ["A:darius",
    "A:jayce",
    "A:viktor"]
const STUN = {
    color: 0xf2ce69, color2: 0xfff1b3
}

export async function runJayceShowcase(say: (text: string) => void) {
    openHits()
    try { await play(say) } finally { closeHits() }
}

async function play(say: (text: string) => void) {
    const q = skillVfx("jayce",
            "q"), e = skillVfx("jayce",
            "e"), r = skillVfx("jayce",
            "r"), p = skillVfx("jayce",
            "p")
    const qc = JAYCE_CANNON.q, ec = JAYCE_CANNON.e, rc = JAYCE_CANNON.r
    const shot = heroBasicVfx("jayce_cannon")
    const tone = {
        color: q.color, color2: q.color2
    }
    say("Búa · Đánh thường: búa nện thẳng từ trên xuống")
    await basicAttack(JAYCE,
        "B:annie",
        72)
    await sleep(800)

    say("Búa · Q Chỉ Thiên!: hoán đổi sang đối diện, búa dội xuống")
    await playVfx(q.cast!,
        unitPt(JAYCE),
        [],
        tone)
    await strike(q.travel,
        JAYCE,
        ["B:jinx"],
        tone,
        () => {
            landDamage("B:jinx",
                128,
                "physical")
            void playVfx(q.impact,
                unitPt("B:jinx"),
                [],
                tone)
        })
    await sleep(1000)

    say("Búa · E Lôi Phạt: đối diện nhận sát thương, Choáng")
    await strike(e.travel,
        JAYCE,
        ["B:annie"],
        tone,
        () => {
            landDamage("B:annie",
                116,
                "physical")
            void playVfx(e.impact,
                unitPt("B:annie"),
                [],
                tone)
            void playVfx("stunHit",
                unitPt("B:annie"),
                [],
                STUN)
        })
    await sleep(1000)

    say("Búa · R Sấm Chớp Rền Vang: búa dội xuống 3 đường cùng nhịp")
    await Promise.all(["B:leona",
        "B:annie",
        "B:jinx"].map((id) => strike(r.travel,
        JAYCE,
        [id],
        {
            ...tone, intensity: 2
        },
        () => {
            landDamage(id,
                id === "B:annie" ? 170 : 130,
                "physical")
            void playVfx(r.impact,
                unitPt(id),
                [],
                {
                    ...tone, intensity: 2
                })
        })))
    await sleep(1000)

    say("Standby · Đổi Dạng: sang Pháo, nhận Tăng Lực")
    await playVfx(p.cast!,
        unitPt(JAYCE),
        [],
        tone)
    await sleep(600)

    say("Pháo · Đánh thường: đòn kế có Tăng Lực, đánh được mọi đường")
    await strike(shot.travel,
        JAYCE,
        ["B:lux"],
        tone,
        () => {
            landDamage("B:lux",
                110,
                "physical")
            void playVfx(shot.impact,
                unitPt("B:lux"),
                [],
                tone)
        })
    await sleep(1000)

    say("Pháo · Q Cầu Sấm: 1 địch bất kỳ đường, 2 đường kề nhận một nửa")
    await playVfx(qc.cast!,
        unitPt(JAYCE),
        [],
        tone)
    await strike(qc.travel,
        JAYCE,
        ["B:leona"],
        tone,
        () => {
            landDamage("B:leona",
                124,
                "physical")
            void playVfx(qc.impact,
                unitPt("B:leona"),
                [],
                tone)
            for (const id of ["B:garen",
                "B:annie"]) {
                landDamage(id,
                    62,
                    "physical")
                void playVfx(qc.impact,
                    unitPt(id),
                    [],
                    tone)
            }
        })
    await sleep(1000)

    say("Pháo · R Tích Tụ: 1 địch bất kỳ đường, xuyên Giáp")
    await strike(rc.travel,
        JAYCE,
        ["B:garen"],
        {
            ...tone, intensity: 2
        },
        () => {
            landDamage("B:garen",
                180,
                "physical")
            void playVfx(rc.impact,
                unitPt("B:garen"),
                [],
                tone)
        })
    await sleep(1000)

    say("Pháo · E Cổng Tăng Tốc: Jayce tích 1 Gia Tốc")
    await playVfx(ec.cast!,
        unitPt(JAYCE),
        ALLIES.map((id) => unitPt(id)),
        tone)
    await sleep(900)
}
