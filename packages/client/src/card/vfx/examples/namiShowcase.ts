// Demo VFX đủ bộ chiêu Nami theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
import {
    unitPt
} from "../../anim/helpers"
import {
    playVfx
} from "../VfxCanvas"
import {
    sleep
} from "../particles"
import {
    closeHits, landDamage, landHeal, landShield, openHits, presetWound
} from "./showcaseHits"

const WATER = {
    color: 0x35b8ee, color2: 0xd8fbff
}
const HEAL = {
    color: 0x4fe0b0, color2: 0xd8fff0
}
const BLESS = {
    color: 0x46d6d0, color2: 0xdcfff6
}
const ALLIES = ["A:darius",
    "A:viktor",
    "A:ashe",
    "A:ornn"]
const ENEMIES = ["B:garen",
    "B:leona",
    "B:renata",
    "B:jinx",
    "B:lux"]
const NAMI = "A:nami"
/** Thời gian giọt Phước Lành rơi tới mục tiêu */
const PROC_DROP_MS = 240

/** Đạn bay tới nơi là kết quả và hiệu ứng trúng ra cùng lúc; trả về ngay khi chạm, không chờ đuôi hạt tan */
function strike(travel: string, from: string, to: string, tone: typeof WATER, land: () => void) {
    return new Promise<void>((resolve) => {
        void playVfx(travel,
            unitPt(from),
            [unitPt(to)],
            {
                ...tone,
                onBeat() {
                    land()
                    resolve()
                }
            }).finally(resolve)
    })
}

/** Một lần nảy của Q: chạm là ra kết quả, nảy tiếp ngay */
function hop(from: string, to: string, impact: string, tone: typeof WATER, result: () => void) {
    return strike("namiTideHop",
        from,
        to,
        tone,
        () => {
            result()
            void playVfx(impact,
                unitPt(to),
                [],
                tone)
        })
}

export async function runNamiShowcase(say: (text: string) => void) {
    openHits()
    presetWound("A:darius",
        170)
    presetWound("A:viktor",
        130)
    try {
        await play(say)
    } finally {
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    const nami = unitPt(NAMI)
    say("Đánh thường")
    await strike("namiOrb",
        NAMI,
        "B:jinx",
        WATER,
        () => {
            landDamage("B:jinx",
                67,
                "magic")
            void playVfx("namiSplash",
                unitPt("B:jinx"),
                [],
                WATER)
            void playVfx("namiSurgeGain",
                nami,
                [],
                WATER)
        })
    await sleep(900)

    say("Q · Thuỷ Triều: Chỉ định Darius, nảy 4 lần")
    await hop(NAMI,
        "A:darius",
        "namiTideHeal",
        HEAL,
        () => landHeal("A:darius",
            110))
    await hop("A:darius",
        "B:jinx",
        "namiTideHit",
        WATER,
        () => landDamage("B:jinx",
            90,
            "magic"))
    await hop("B:jinx",
        "A:viktor",
        "namiTideHeal",
        HEAL,
        () => landHeal("A:viktor",
            110))
    await hop("A:viktor",
        "B:garen",
        "namiTideHit",
        WATER,
        () => landDamage("B:garen",
            90,
            "magic"))
    await sleep(500)

    say("E · Phước Lành Thuỷ Triều: Darius nhận Khiên và 3 Phước Lành")
    await strike("namiBlessFlow",
        NAMI,
        "A:darius",
        BLESS,
        () => {
            landShield("A:darius",
                120)
            void playVfx("namiTideShield",
                unitPt("A:darius"),
                [],
                BLESS)
            void playVfx("namiBlessGain",
                unitPt("A:darius"),
                [],
                BLESS)
        })
    await sleep(1300)

    say("Nội tại · Dậy Sóng: đạt mốc 20, cả đội tăng AP, rút 1 lá")
    await playVfx("namiSurgeCrest",
        nami,
        ALLIES.map(id => unitPt(id)),
        WATER)
    await sleep(500)

    say("R · Sóng Thần")
    // một nhịp: sóng chạm hàng địch thì nổ nước, Choáng, trừ máu cùng lúc
    let crash: Promise<unknown> = Promise.resolve()
    await playVfx("namiTsunami",
        nami,
        ENEMIES.map(id => unitPt(id)),
        {
            ...WATER, intensity: 2,
            onBeat() {
                ENEMIES.forEach(id => landDamage(id,
                    110,
                    "magic"))
                crash = Promise.all(ENEMIES.flatMap(id => [playVfx("namiTsunamiHit",
                    unitPt(id),
                    [],
                    {
                        ...WATER, intensity: 2
                    }),
                playVfx("stunHit",
                    unitPt(id),
                    [],
                    {
                        color: 0xf2ce69, color2: 0xfff1b3
                    })]))
            }
        })
    await crash
    await sleep(400)

    say("Phước Lành kích hoạt: chiêu của Darius trúng địch")
    await Promise.all([
        playVfx("namiBlessProc",
            unitPt("B:jinx"),
            [],
            BLESS),
        sleep(PROC_DROP_MS).then(() => {
            landDamage("B:jinx",
                95,
                "physical")
            landDamage("B:jinx",
                60,
                "physical")
        })
    ])
    await sleep(600)
}
