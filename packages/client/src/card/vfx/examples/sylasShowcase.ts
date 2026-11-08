// Demo VFX đủ bộ chiêu Sylas trên bàn 5 tướng. Chỉ là nơi xem: tên hiệu ứng lấy từ heroMap, không gọi engine.
import {
    unitPt
} from "../../anim/helpers"
import {
    playVfx
} from "../VfxCanvas"
import {
    heroBasicVfx, skillVfx, stolenVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, openHits, presetWound
} from "./showcaseHits"

const SYLAS = "A:sylas"
const FRONT = ["B:leona",
    "B:annie",
    "B:jinx"]

export async function runSylasShowcase(say: (text: string) => void) {
    openHits()
    presetWound(SYLAS,
        150)
    try { await play(say) } finally { closeHits() }
}

async function play(say: (text: string) => void) {
    const q = skillVfx("sylas",
            "q"), e = skillVfx("sylas",
            "e"), r = skillVfx("sylas",
            "r"), p = skillVfx("sylas",
            "p")
    const tone = {
        color: q.color, color2: q.color2
    }
    say("Đánh thường: quất xích")
    await basicAttack(SYLAS,
        "B:annie",
        68)
    await sleep(800)

    say("Nội tại: mỗi lá chiêu nạp 1 Xiềng Nổ, tối đa 3")
    await playVfx(p.cast!,
        unitPt(SYLAS),
        [],
        {
            ...tone, amount: 3
        })
    await sleep(500)

    say("Q · Roi Xích: đối diện và 2 đường kề, đối diện nặng hơn")
    await playVfx(q.cast!,
        unitPt(SYLAS),
        [],
        tone)
    await Promise.all(FRONT.map((id) => strike(q.travel,
        SYLAS,
        [id],
        tone,
        () => {
            landDamage(id,
                id === "B:annie" ? 96 : 74,
                "magic")
            void playVfx(q.impact,
                unitPt(id),
                [],
                tone)
        })))
    await sleep(900)

    say("Đòn đánh tiêu Xiềng Nổ: nổ phép lên mục tiêu và 2 đường kề")
    const basic = heroBasicVfx("sylas")
    await strike(basic.travel,
        SYLAS,
        ["B:annie"],
        tone,
        () => {
            landDamage("B:annie",
                68,
                "magic")
            for (const id of FRONT) {
                landDamage(id,
                    42,
                    "magic")
                void playVfx(p.impact,
                    unitPt(id),
                    [],
                    tone)
            }
        })
    await sleep(1000)

    say("E · Thợ Săn Vua: gây phép, Sylas hồi theo Máu đã mất")
    await playVfx(e.cast!,
        unitPt(SYLAS),
        [],
        tone)
    await strike(e.travel,
        SYLAS,
        ["B:jinx"],
        tone,
        () => {
            landDamage("B:jinx",
                88,
                "magic")
            landHeal(SYLAS,
                74)
            void playVfx(e.impact,
                unitPt("B:jinx"),
                [],
                tone)
        })
    await sleep(1000)

    say("R · Đoạt Chiêu: xích quấn Leona, chiêu của nàng rút màu bay về tay")
    await playVfx(r.cast!,
        unitPt(SYLAS),
        [],
        tone)
    const victim = skillVfx("leona",
        "q")
    await strike(r.travel,
        SYLAS,
        ["B:leona"],
        {
            ...tone, intensity: 2
        },
        () => {
            void playVfx(r.impact,
                unitPt("B:leona"),
                [],
                {
                    ...tone, intensity: 2
                })
        })
    await playVfx(p.extra!,
        unitPt("B:leona"),
        [{
            x: window.innerWidth * .5, y: window.innerHeight - 60
        }],
        {
            color: victim.color, color2: victim.color2
        })
    await sleep(700)

    say("Chiêu Đoạt: Khiên Bình Minh của Leona, ánh xanh tím, giữ nguyên Choáng")
    const stolen = stolenVfx("leona",
            "q"), st = {
            color: stolen.color, color2: stolen.color2
        }
    if (stolen.cast) void playVfx(stolen.cast,
        unitPt(SYLAS),
        [unitPt("B:jinx")],
        st)
    await strike(stolen.travel === "none" ? q.travel : stolen.travel,
        SYLAS,
        ["B:jinx"],
        st,
        () => {
            landDamage("B:jinx",
                90,
                "physical")
            void playVfx(stolen.impact,
                unitPt("B:jinx"),
                [],
                st)
            void playVfx("stunHit",
                unitPt("B:jinx"),
                [],
                {
                    color: 0xf2ce69, color2: 0xfff1b3
                })
        })
    await sleep(1100)
}
