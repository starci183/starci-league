// Demo VFX đủ bộ chiêu Mel trên bàn 5 tướng. Chỉ là nơi xem: tên hiệu ứng lấy từ heroMap, không gọi engine.
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
    closeHits, landDamage, openHits, presetWound
} from "./showcaseHits"

const MEL = "A:mel"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]

export async function runMelShowcase(say: (text: string) => void) {
    openHits()
    presetWound("B:lux",
        220)
    try { await play(say) } finally { closeHits() }
}

async function play(say: (text: string) => void) {
    const q = skillVfx("mel",
            "q"), e = skillVfx("mel",
            "e"), r = skillVfx("mel",
            "r"), p = skillVfx("mel",
            "p")
    const tone = {
        color: q.color, color2: q.color2
    }
    say("Đánh thường: tia vàng")
    await basicAttack(MEL,
        "B:annie",
        66)
    await sleep(800)

    say("Q · Loạt Bắn Rực Rỡ: mục tiêu nhận 2 tia, 2 đường kề mỗi tướng 1 tia, gắn Chói Lọi")
    await playVfx(q.cast!,
        unitPt(MEL),
        [],
        tone)
    await Promise.all([["B:jinx",
        "B:jinx",
        "B:annie",
        "B:lux"]].flat().map((id, i) => sleep(i * 40).then(() => strike(q.travel,
        MEL,
        [id],
        tone,
        () => {
            landDamage(id,
                44,
                "magic")
            void playVfx(q.impact,
                unitPt(id),
                [],
                tone)
            void playVfx(p.cast!,
                unitPt(id),
                [],
                {
                    ...tone, amount: 2
                })
        }))))
    await sleep(900)

    say("E · Phản Quang Chiết Kính: Leona dùng chiêu Choáng lên Darius, Darius chịu giảm 40%")
    await playVfx(e.cast!,
        unitPt("A:mel"),
        [unitPt("A:darius")],
        tone)
    landDamage("A:darius",
        54,
        "physical")
    void playVfx("stunHit",
        unitPt("A:darius"),
        [],
        {
            color: 0xf2ce69, color2: 0xfff1b3
        })
    await sleep(420)
    say("Leona nhận lại 60% sát thương và Choáng, rồi 3 Chói Lọi")
    landDamage("B:leona",
        32,
        "physical")
    void playVfx(e.impact,
        unitPt("B:leona"),
        [],
        tone)
    void playVfx("stunHit",
        unitPt("B:leona"),
        [],
        {
            color: 0xf2ce69, color2: 0xfff1b3
        })
    void playVfx(p.cast!,
        unitPt("B:leona"),
        [],
        {
            ...tone, amount: 3
        })
    await sleep(1000)

    say("Nội tại: Máu dưới ngưỡng thì bị hạ ngay")
    await playVfx(p.cast!,
        unitPt("B:lux"),
        [],
        {
            ...tone, amount: 6
        })
    await strike(q.travel,
        MEL,
        ["B:lux"],
        tone,
        () => {
            landDamage("B:lux",
                90,
                "magic")
            void playVfx(p.impact,
                unitPt("B:lux"),
                [],
                tone)
        })
    await sleep(1100)

    say("R · Nhật Thực Vàng: mọi địch trên sân nhận phép theo Chói Lọi, tiêu hết dấu")
    await new Promise<void>((resolve) => {
        void playVfx(r.cast!,
            unitPt(MEL),
            ENEMIES.map((id) => unitPt(id)),
            {
                ...tone, intensity: 2,
                onBeat() {
                    for (const id of ENEMIES) {
                        landDamage(id,
                            110,
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
    await sleep(1200)
}
