// Demo VFX đủ bộ chiêu Janna theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: hiệu ứng lấy từ cùng tên trong heroMap. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất.
import type {
    cg
} from "@starci/shared"
import {
    unitPt
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
    heroBasicVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, landShield, openHits, presetWound
} from "./showcaseHits"

const WIND = {
    color: 0xa8e4ff, color2: 0xe8f3fb
}
const JANNA = "A:janna"
const TEAM = ["A:ashe",
    "A:darius",
    JANNA,
    "A:viktor",
    "A:ornn"]
const ALLIES = TEAM.filter(id => id !== JANNA)
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Chờ số Khiên (nổi 1050ms) tan trước khi số đỡ hiện, tính cả đường đạn 180ms và loạt đạn */
const SHIELD_NUMBER_CLEAR_MS = 650
/** Viên thứ 7 của Jinx chạm sau viên đầu 6 x 55ms, cộng biên một khung hình */
const MINIGUN_LAST_BULLET_MS = 345
const LABEL: Record<string, string> = {
    ashe: "Ashe: tên băng", darius: "Darius: rìu", janna: "Janna: cầu gió", viktor: "Viktor: tia lục giác", ornn: "Ornn: búa rèn",
    garen: "Garen: đại kiếm", leona: "Leona: kiếm mặt trời", annie: "Annie: cầu lửa", jinx: "Jinx: súng máy", lux: "Lux: cầu sáng"
}

/** Khiên đỡ trọn đòn: số đỡ màu Khiên, không mất Máu */
function landBlocked(id: string, amount: number, kind: cg.DamageKind) {
    const unit = getCard().view?.units[id]
    if (!unit) return
    const event: cg.GameEvent = {
        t: "damage", target: id, amount, hpLost: 0, absorbed: amount, kind, tag: "attack", hp: unit.hp
    }
    queueImpacts([event])
    landImpacts([event])
    applyToDisplay([event])
}

export async function runJannaShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    const pairs = [...TEAM.map((id, i): [string, string] => [id,
        ENEMIES[i]]),
    ...ENEMIES.map((id, i): [string, string] => [id,
        TEAM[i]])]
    for (const [attacker,
        target] of pairs) {
        say(`Đánh thường · ${LABEL[attacker.split(":")[1]]}`)
        await basicAttack(attacker,
            target,
            60)
        await sleep(520)
    }

    say("Q · Gió Lốc: lốc chạm Jinx, sát thương phép và Choáng cùng lúc")
    await strike("jannaTornado",
        JANNA,
        ["B:jinx"],
        WIND,
        () => {
            landDamage("B:jinx",
                140,
                "magic")
            void playVfx("jannaTornadoHit",
                unitPt("B:jinx"),
                [],
                WIND)
        })
    await sleep(1450)

    say("E · Mắt Bão: Darius nhận Khiên và luồng gió Mắt Bão")
    await strike("jannaBreeze",
        JANNA,
        ["A:darius"],
        WIND,
        () => {
            landShield("A:darius",
                130)
            void playVfx("jannaEyeShield",
                unitPt("A:darius"),
                [],
                WIND)
        })
    await sleep(2000)

    say("E · Mắt Bão (nối chuỗi): Jinx nhắm Viktor, Khiên dựng trước, đỡ trọn đòn")
    await strike("jannaBreeze",
        JANNA,
        ["A:viktor"],
        WIND,
        () => {
            landShield("A:viktor",
                130)
            void playVfx("jannaEyeShield",
                unitPt("A:viktor"),
                [],
                WIND)
        })
    await sleep(SHIELD_NUMBER_CLEAR_MS)
    const shot = heroBasicVfx("jinx")
    // cả loạt đạn là một cú đánh: viên cuối chạm mới ra số đỡ và gợn khiên, không còn đạn bay sau nhịp đỡ
    await strike(shot.travel,
        "B:jinx",
        ["A:viktor"],
        {
            color: shot.color, color2: shot.color2
        },
        () => undefined)
    await sleep(MINIGUN_LAST_BULLET_MS)
    landBlocked("A:viktor",
        80,
        "physical")
    void playVfx("jannaBlock",
        unitPt("A:viktor"),
        [],
        WIND)
    await sleep(1100)

    say("R · Gió Mùa: cả đội nhận Khiên và hồi Máu cùng lúc")
    for (const id of TEAM) presetWound(id,
        70)
    await playVfx("jannaMonsoon",
        unitPt(JANNA),
        TEAM.map(id => unitPt(id)),
        {
            ...WIND, intensity: 2,
            onBeat() {
                for (const id of TEAM) {
                    landShield(id,
                        90)
                    landHeal(id,
                        80)
                    void playVfx("jannaMonsoonHit",
                        unitPt(id),
                        [],
                        WIND)
                }
            }
        })
    await sleep(450)

    say("Nội tại · Hộ Phong: nhận 1 Gió Thuận, đội đánh nhanh hơn")
    await playVfx("jannaWindStack",
        unitPt(JANNA),
        ALLIES.map(id => unitPt(id)),
        WIND)
    await sleep(200)
}
