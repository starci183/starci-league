// Demo VFX đủ bộ chiêu Twisted Fate theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; riêng R là loạt lá, mỗi lá trúng đúng lúc chạm.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    handPt, unitPt
} from "../../anim/helpers"
import {
    applyToDisplay
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    TF_CARD
} from "../fx_twistedfate"
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

const Q = skillVfx("twistedfate",
    "q")
const E = skillVfx("twistedfate",
    "e")
const R = skillVfx("twistedfate",
    "r")
const P = skillVfx("twistedfate",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const FATE = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const TF = "A:twistedfate"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Thứ tự lá R: lá kỹ năng (đỏ) gấp đôi */
const VOLLEY: { card: number; target: string }[] = [
    {
        card: TF_CARD.gold, target: "B:garen"
    },
    {
        card: TF_CARD.red, target: "B:jinx"
    },
    {
        card: TF_CARD.blue, target: "B:leona"
    },
    {
        card: TF_CARD.gold, target: "B:lux"
    },
    {
        card: TF_CARD.red, target: "B:annie"
    },
    {
        card: TF_CARD.blue, target: "B:garen"
    },
    {
        card: TF_CARD.red, target: "B:leona"
    }
]
const VOLLEY_GAP_MS = 210
const VOLLEY_HIT = 36

function landStun(id: string) {
    const e: cg.GameEvent = {
        t: "status", target: id, id: "stun", turns: 1, v: 1, src: TF, card: "twistedfate_q"
    }
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Q một loại lá: lá nổi trên đầu Twisted Fate chọn xong, lá lật bay từ Bộ bài, chạm là số, trạng thái và hiệu ứng cùng đáp */
async function pick(card: number, target: string, amount: number, near: string[], land: () => void, after: () => { x: number; y: number }[]) {
    const tone = {
        ...TONE, amount: card
    }
    await playVfx(Q.cast ?? "none",
        unitPt(TF),
        [],
        tone)
    await strike(Q.travel,
        TF,
        [target],
        tone,
        () => {
            landDamage(target,
                amount,
                "magic")
            for (const id of near) landDamage(id,
                amount,
                "magic")
            land()
            void playVfx(Q.impact,
                unitPt(target),
                after(),
                tone)
        })
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Twisted Fate: lá bài xoay, sát thương phép")
    await basicAttack(TF,
        "B:annie",
        40)
    await sleep(760)

    say("Nội tại · Thần Bài: đầu lượt xem lá trên cùng, lá nhấc lên loé vàng rồi trượt xuống đáy")
    await playVfx(P.impact,
        unitPt(TF),
        [],
        {
            color: P.color, color2: P.color2
        })
    await sleep(500)

    say("Q · Chọn Bài, lá đỏ (lá kỹ năng): trúng Annie và 2 đường kề, Leona và Jinx")
    await pick(TF_CARD.red,
        "B:annie",
        52,
        ["B:leona",
            "B:jinx"],
        () => {},
        () => [unitPt("B:leona"),
            unitPt("B:jinx")])
    await sleep(1000)

    say("Q · Chọn Bài, lá vàng (Vàng hoặc Trang bị): trúng Garen, gây Choáng")
    await pick(TF_CARD.gold,
        "B:garen",
        52,
        [],
        () => landStun("B:garen"),
        () => [])
    await sleep(1000)

    say("Q · Chọn Bài, lá xanh (lá khác): trúng Jinx, rút lá đó về tay")
    await pick(TF_CARD.blue,
        "B:jinx",
        52,
        [],
        () => {},
        () => [handPt("A",
            "A")])
    await sleep(1000)

    say("E · Xào Bài: bộ bài xào trên không, mảnh bài găm vào Lux cùng một nhịp")
    let landed = false
    await playVfx(E.cast ?? "none",
        unitPt(TF),
        [],
        {
            ...TONE,
            onBeat() {
                if (landed) return
                landed = true
                landDamage("B:lux",
                    48,
                    "magic")
                void playVfx(E.impact,
                    unitPt("B:lux"),
                    [],
                    TONE)
            }
        })
    await sleep(800)

    say("R · Định Mệnh: mắt hổ phách hiện trên tướng địch, bộ bài lật mở")
    await playVfx(R.cast ?? "none",
        unitPt(TF),
        ENEMIES.map(id => unitPt(id)),
        FATE)
    say("R · Định Mệnh: loạt lá lật, mỗi lá một cú trúng, lá kỹ năng to hơn và gấp đôi sát thương, rồi vào mộ")
    await Promise.all(VOLLEY.map(({ card, target }, i) => sleep(i * VOLLEY_GAP_MS).then(() => {
        const tone = {
            ...FATE, intensity: 1, amount: card
        }
        return strike(R.travel,
            TF,
            [target],
            tone,
            () => {
                landDamage(target,
                    card === TF_CARD.red ? VOLLEY_HIT * 2 : VOLLEY_HIT,
                    "magic")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    tone)
            })
    })))
    await sleep(1600)
}

export async function runTwistedFateShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        closeHits()
    }
}
