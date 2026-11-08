// Demo VFX đủ bộ chiêu Soraka theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất.
import {
    unitPt
} from "../../anim/helpers"
import {
    getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
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
    closeHits, landDamage, landHeal, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("soraka",
    "q")
const E = skillVfx("soraka",
    "e")
const R = skillVfx("soraka",
    "r")
const P = skillVfx("soraka",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const SORAKA = "A:soraka"
const TEAM = ["A:ashe",
    "A:darius",
    SORAKA,
    "A:viktor",
    "A:ornn"]
/** Đồng minh dưới [F]% Máu lúc tung R: hồi gấp đôi, tia sáng hơn */
const LOW = ["A:ashe",
    "A:ornn"]
const WISH_HEAL = 90

/** Đưa tướng về % Máu định sẵn, không hiện số nổi */
function woundTo(id: string, percent: number) {
    const unit = getCard().view?.units[id]
    if (!unit) return
    const lost = unit.hp - Math.round(unit.maxHp * percent / 100)
    if (lost > 0) presetWound(id,
        lost)
}

/** Một lần E: dấu Quick, sợi sinh lực tới nơi là hai bên đổi Máu cùng lúc */
async function lifeThread(to: string, cost: number, heal: number) {
    await playVfx(E.cast ?? "none",
        unitPt(SORAKA),
        [],
        TONE)
    await strike(E.travel,
        SORAKA,
        [to],
        TONE,
        () => {
            landDamage(SORAKA,
                cost,
                "true")
            landHeal(to,
                heal)
            void playVfx(E.impact,
                unitPt(to),
                [],
                TONE)
        })
}

export async function runSorakaShowcase(say: (text: string) => void) {
    openHits()
    woundTo("A:ashe",
        26)
    woundTo("A:ornn",
        30)
    woundTo("A:darius",
        55)
    woundTo("A:viktor",
        62)
    woundTo(SORAKA,
        64)
    woundTo("B:jinx",
        58)
    try {
        await play(say)
    } finally {
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Soraka: hạt sao")
    await basicAttack(SORAKA,
        "B:jinx",
        60)
    await sleep(480)

    say("Nội tại · Cứu Rỗi: đội nhận đủ [X] Máu hồi, Soraka tụ 1 Thánh Quang")
    await strike(P.cast ?? "none",
        SORAKA,
        TEAM.filter(id => id !== SORAKA),
        TONE,
        () => {})
    await sleep(480)

    say("Nội tại · Thánh Quang: Darius nhiều Máu hơn Jinx, đòn đánh thêm sát thương ánh sao")
    const axe = heroBasicVfx("darius")
    await strike(axe.travel,
        "A:darius",
        ["B:jinx"],
        {
            color: axe.color, color2: axe.color2
        },
        () => {
            landDamage("B:jinx",
                70,
                "physical")
            landDamage("B:jinx",
                45,
                "physical")
            void playVfx(axe.impact,
                unitPt("B:jinx"),
                [],
                {
                    color: axe.color, color2: axe.color2
                })
            void playVfx(P.impact,
                unitPt("B:jinx"),
                [],
                TONE)
        })
    await sleep(640)

    say("Q · Sao Băng: chạm Garen là sát thương phép và Soraka hồi Máu cùng lúc")
    await strike(Q.travel,
        SORAKA,
        ["B:garen"],
        TONE,
        () => {
            landDamage("B:garen",
                140,
                "magic")
            landHeal(SORAKA,
                75)
            void playVfx(Q.impact,
                unitPt("B:garen"),
                [],
                TONE)
            void playVfx(Q.extra ?? "none",
                unitPt(SORAKA),
                [],
                TONE)
        })
    await sleep(760)

    say("E · Truyền Sinh Lực: Soraka mất [C] Máu, Darius hồi Máu cùng lúc")
    await lifeThread("A:darius",
        45,
        95)
    await sleep(640)

    say("E · Truyền Sinh Lực (nối chuỗi): Jinx nhắm Viktor, Viktor được hồi trước khi đạn tới")
    // Jinx đang gồng đòn; mắt xích sau giải quyết trước nên sợi sinh lực tới Viktor trước đạn
    void playVfx(E.cast ?? "none",
        unitPt("B:jinx"),
        [],
        {
            color: 0xff4aa0, color2: 0x40c8ff
        })
    await sleep(420)
    await lifeThread("A:viktor",
        45,
        95)
    await sleep(320)
    await basicAttack("B:jinx",
        "A:viktor",
        80)
    await sleep(640)

    say("R · Điều Ước: cả đội hồi cùng một nhịp, Ashe và Ornn dưới [F]% Máu hồi gấp đôi")
    await playVfx(R.cast ?? "none",
        unitPt(SORAKA),
        TEAM.map(id => unitPt(id)),
        {
            ...TONE, intensity: R.intensity,
            onBeat() {
                for (const id of TEAM) {
                    const low = LOW.includes(id)
                    landHeal(id,
                        low ? WISH_HEAL * 2 : WISH_HEAL)
                    void playVfx(low ? R.extra ?? R.impact : R.impact,
                        unitPt(id),
                        [],
                        {
                            ...TONE, intensity: R.intensity
                        })
                }
            }
        })
    await sleep(1100)
}
