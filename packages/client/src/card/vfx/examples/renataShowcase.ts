// Demo VFX đủ bộ chiêu Renata theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: mọi hiệu ứng lấy từ cùng tên trong heroMap, trận thật gọi được y hệt. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất nơi VFX, trừ máu, trạng thái cùng đáp.
import {
    cg
} from "@starci/shared"
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
    heroBasicVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    closeHits, landDamage, landHeal, landShield, openHits, presetWound
} from "./showcaseHits"

const CHEM = {
    color: 0xb44bff, color2: 0xa6ff2e
}
const FRENZY = {
    color: 0xff2f6e, color2: 0xa6ff2e
}
const RENATA = "A:renata"
const ALLIES = ["A:ashe",
    "A:darius",
    "A:viktor",
    "A:ornn"]
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** % Máu đã mất của cả đội trong beat Cấp Vốn: tổng 170, chia 500 */
const TEAM_LOSS: Record<string, number> = {
    "A:ashe": 20, "A:darius": 30, "A:renata": 40, "A:viktor": 50, "A:ornn": 30
}
const Q_ALLY = "A:ashe"
const E_ALLY = "A:darius"
const SAVED_ALLY = "A:viktor"
/** Rocket E xen kẽ trái, phải: Ashe và Renata được Khiên, Garen và Annie trúng đòn, nổ tại Leona */
const E_PATH = ["A:ashe",
    "A:renata",
    "B:garen",
    "B:annie"]
const E_BLAST = "B:leona"
const LABEL: Record<string, string> = {
    ashe: "Ashe: tên băng", darius: "Darius: rìu", renata: "Renata: bình hoá chất", viktor: "Viktor: tia lục giác", ornn: "Ornn: búa rèn",
    garen: "Garen: đại kiếm", leona: "Leona: kiếm mặt trời", annie: "Annie: cầu lửa", jinx: "Jinx: súng máy", lux: "Lux: cầu sáng"
}

const heroOf = (id: string) => id.split(":")[1]
const unitOf = (id: string) => getCard().view?.units[id]

/** Đạn chạm là ra kết quả và hiệu ứng trúng cùng lúc; trả về ngay khi chạm, không chờ đuôi hạt tan */
export function strike(travel: string, from: string, to: string[], tone: Parameters<typeof playVfx>[3], land: () => void) {
    return new Promise<void>((resolve) => {
        void playVfx(travel,
            unitPt(from),
            to.map(id => unitPt(id)),
            {
                ...tone,
                onBeat() {
                    land()
                    resolve()
                }
            }).finally(resolve)
    })
}

/** Đòn đánh thường thật của tướng theo heroMap, như trận gọi qua dispatch */
export function basicAttack(attacker: string, target: string, amount: number) {
    const hero = heroOf(attacker)
    const style = heroBasicVfx(hero)
    const tone = {
        color: style.color, color2: style.color2
    }
    return strike(style.travel,
        attacker,
        [target],
        tone,
        () => {
            landDamage(target,
                amount,
                cg.getHero(hero)?.damage ?? "physical")
            void playVfx(style.impact,
                unitPt(target),
                [],
                tone)
        })
}

/** Đưa tướng về đúng % Máu đã mất, không hiện số nổi */
function woundTo(id: string, percent: number) {
    const unit = unitOf(id)
    if (!unit) return
    const lost = unit.hp - Math.round(unit.maxHp * (1 - percent / 100))
    if (lost > 0) presetWound(id,
        lost)
}

export async function runRenataShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    const pairs = [...["A:ashe",
        "A:darius",
        RENATA,
        "A:viktor",
        "A:ornn"].map((id, i): [string, string] => [id,
        ENEMIES[i]]),
    ...ENEMIES.map((id, i): [string, string] => [id,
        ["A:ashe",
            "A:darius",
            RENATA,
            "A:viktor",
            "A:ornn"][i]])]
    for (const [attacker,
        target] of pairs) {
        say(`Đánh thường · ${LABEL[heroOf(attacker)]}`)
        await basicAttack(attacker,
            target,
            60)
        await sleep(620)
    }

    say("Nội tại · Cấp Vốn: % Máu mất cả đội 170/500 thành sức mạnh cả đội")
    for (const [id,
        percent] of Object.entries(TEAM_LOSS)) woundTo(id,
        percent)
    await playVfx("renataFundLink",
        unitPt(RENATA),
        ALLIES.map(id => unitPt(id)),
        {
            ...CHEM, amount: 170
        })
    await sleep(300)

    say("Q · Cứu Cánh: Ashe hiến [X]% Máu, mạnh lên trong 2 lượt")
    await strike("renataOrder",
        RENATA,
        [Q_ALLY],
        CHEM,
        () => {})
    await playVfx("renataSacrifice",
        unitPt(Q_ALLY),
        [],
        {
            ...CHEM,
            onBeat() {
                landDamage(Q_ALLY,
                    40,
                    "true")
            }
        })
    await sleep(300)

    say("E · Hoả Lực Yểm Trợ: đồng minh nhận Khiên, địch trúng đòn")
    await strike("renataOrder",
        RENATA,
        [E_ALLY],
        CHEM,
        () => {})
    await strike("renataVolley",
        E_ALLY,
        [...E_PATH,
            E_BLAST],
        CHEM,
        () => {
            landDamage(E_BLAST,
                150,
                "magic")
            landDamage("B:garen",
                90,
                "magic")
            landDamage("B:annie",
                90,
                "magic")
            landShield("A:ashe",
                110)
            landShield(RENATA,
                110)
            void playVfx("renataVolleyHit",
                unitPt(E_BLAST),
                [],
                {
                    ...CHEM, intensity: 2
                })
            for (const id of ["B:garen",
                "B:annie"]) void playVfx("renataVolleyHit",
                unitPt(id),
                [],
                CHEM)
            for (const id of ["A:ashe",
                RENATA]) void playVfx("renataShield",
                unitPt(id),
                [],
                CHEM)
        })
    await sleep(1800)

    say("R · Hợp Chất Điên Loạn: địch Cuồng Loạn, đánh đồng đội")
    // mây quét hết hàng là một nhịp: Cuồng Loạn đáp và địch đánh nhau bằng đòn thường của chính mình
    let brawl: Promise<unknown> = Promise.resolve()
    await playVfx("renataBerserkWave",
        unitPt(RENATA),
        ENEMIES.map(id => unitPt(id)),
        {
            ...CHEM, intensity: 2,
            onBeat() {
                brawl = Promise.all(ENEMIES.flatMap((id, i) => [
                    playVfx("renataBerserkMark",
                        unitPt(id),
                        [],
                        FRENZY),
                    basicAttack(id,
                        ENEMIES[(i + 1) % ENEMIES.length],
                        80)
                ]))
            }
        })
    await brawl
    await sleep(900)

    say("Nội tại · Cấp Vốn: cứu Viktor về 40% Máu, mỗi đồng minh 1 lần")
    const saved = unitOf(SAVED_ALLY)
    if (saved) presetWound(SAVED_ALLY,
        saved.hp - 1)
    await playVfx("renataRevive",
        unitPt(SAVED_ALLY),
        [unitPt(RENATA)],
        {
            ...CHEM,
            onBeat() {
                const unit = unitOf(SAVED_ALLY)
                if (unit) landHeal(SAVED_ALLY,
                    Math.round(unit.maxHp * .4))
            }
        })
    await sleep(600)
}
