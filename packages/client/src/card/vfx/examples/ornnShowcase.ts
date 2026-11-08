// Demo VFX đủ bộ chiêu Ornn theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất nơi VFX, số, Khiên và món mới cùng đáp.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    handPt, unitEl, unitPt
} from "../../anim/helpers"
import {
    itemIcon
} from "../../board/helpers"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    ORNN_FORGED_ITEM, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import type {
    Pt
} from "../types"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landShield, openHits
} from "./showcaseHits"

const Q = skillVfx("ornn",
    "q")
const E = skillVfx("ornn",
    "e")
const R = skillVfx("ornn",
    "r")
const P = skillVfx("ornn",
    "p")
const toneOf = (v: { color: number; color2?: number; intensity?: number }) => ({
    color: v.color, color2: v.color2, intensity: v.intensity
})
const ORNN = "A:ornn"
const ALLIES = ["A:ashe",
    "A:darius",
    "A:viktor"]
const SHIELD_PER_ITEM = 60
/** Mảnh ghép Q rèn ra */
const COMPONENT = "kiem_dai"
const NAMES: Record<string, string> = {
    kiem_dai: "Kiếm Dài", nanh_nashor: "Nanh Nashor", giao_shojin: "Giáo Shojin", gang_bao_thach: "Găng Bảo Thạch", quy_thu: "Quỷ Thư"
}

const slotEls = (id: string) => [...unitEl(id)?.querySelectorAll<HTMLElement>(".bd-item") ?? []]
const centerOf = (el: Element): Pt => {
    const r = el.getBoundingClientRect()
    return {
        x: r.left + r.width / 2, y: r.top + r.height / 2
    }
}
/** Tâm các ô đang đeo đồ của tướng */
const wornSlots = (id: string) => slotEls(id).filter(el => el.classList.contains("full"))

/** Phần DOM demo thêm vào bàn; dọn hết khi kết thúc để trả bàn về trạng thái thật */
const cleanup = new Set<() => void>()

/** Đặt món vào ô trống bằng DOM: engine của demo không đổi nên display không có món này */
function placeItem(slot: HTMLElement, item: string) {
    const img = document.createElement("img")
    img.src = itemIcon(item)
    img.alt = ""
    slot.append(img)
    slot.classList.add("full")
    cleanup.add(() => {
        img.remove()
        slot.classList.remove("full")
    })
    slot.animate([{
        filter: "brightness(3.4) saturate(.5)"
    },
    {
        filter: "brightness(1)"
    }],
    {
        duration: 900, easing: "ease-out"
    })
}

/** Dấu Kiệt Tác: ô đồ sáng vàng kim tới hết demo */
function markMasterwork(slots: HTMLElement[]) {
    for (const slot of slots) {
        slot.style.boxShadow = "0 0 9px 2px #ffc040"
        slot.style.borderColor = "#fff0b8"
        slot.animate([{
            filter: "brightness(3.2)"
        },
        {
            filter: "brightness(1)"
        }],
        {
            duration: 800, easing: "ease-out"
        })
        cleanup.add(() => {
            slot.style.boxShadow = ""
            slot.style.borderColor = ""
        })
    }
}

/** Giữ chỗ một lá trên tay: nhân bản ô lá có sẵn, ẩn tới khi lá bay tới. Lá này chỉ là DOM của demo */
function stageCard(item: string) {
    const slot = document.querySelector<HTMLElement>(".hd-fan .hd-slot")
    if (!slot?.parentElement) return null
    const c = slot.cloneNode(true) as HTMLElement
    c.removeAttribute("data-hand-uid")
    c.style.visibility = "hidden"
    const art = c.querySelector<HTMLImageElement>(".game-card-image")
    if (art) art.src = itemIcon(item)
    const badge = c.querySelector<HTMLImageElement>(".cv-badge")
    if (badge) badge.src = "/ui/badge/item.png"
    const face = c.querySelector(".cv")
    if (face) face.className = "game-card cv item"
    const label = c.querySelector(".game-card-name")
    if (label) label.textContent = NAMES[item] ?? item
    c.querySelector(".hd-gem")?.remove()
    slot.parentElement.append(c)
    cleanup.add(() => c.remove())
    return c
}

/** Lá nung đỏ bay từ `from` lên tay; tới nơi là lá hiện trên tay */
function flyToHand(from: Pt, item: string) {
    const c = stageCard(item)
    return new Promise<void>((resolve) => {
        void playVfx(R.extra ?? "none",
            from,
            [c ? centerOf(c) : handPt("A",
                "A")],
            {
                ...toneOf(R), intensity: 1, icon: itemIcon(item),
                onBeat() {
                    if (c) c.style.visibility = ""
                    resolve()
                }
            }).finally(resolve)
    })
}

/** Đòn trúng Khiên: số nổi và Khiên giảm, Máu giữ nguyên */
function landBlocked(id: string, amount: number, kind: cg.DamageKind) {
    const u = getCard().view?.units[id]
    if (!u) return
    const e: cg.GameEvent = {
        t: "damage", target: id, amount, hpLost: 0, absorbed: amount, kind, tag: "skill", hp: u.hp
    }
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Tướng địch gồng đòn nhắm `target`: mở Chuỗi, chưa bắn */
async function foeWindup(foe: string) {
    const style = heroBasicVfx(foe.split(":")[1])
    void playVfx("spellCast",
        unitPt(foe),
        [],
        {
            color: style.color, color2: style.color2
        })
    await sleep(520)
}

/** Một lần E: lửa Quick, thép nóng chảy sang, búa chạm là Kiệt Tác, Khiên, tia búa trên ô đồ cùng đáp */
async function refine(id: string) {
    const tone = toneOf(E)
    const slots = wornSlots(id)
    void playVfx(E.cast ?? "none",
        unitPt(ORNN),
        [],
        tone)
    await strike(E.travel,
        ORNN,
        [id],
        tone,
        () => {
            landShield(id,
                SHIELD_PER_ITEM * slots.length)
            markMasterwork(slots)
            void playVfx(E.impact,
                unitPt(id),
                slots.map(centerOf),
                tone)
            void playVfx(E.shield ?? "none",
                unitPt(id),
                [],
                {
                    ...tone, amount: slots.length
                })
        })
}

/** Một lần R: lửa Quick, búa Thần Rèn nện xuống đồng minh; chạm là món rơi vào ô và món khác bay lên tay. Ô đầy thì món đeo cũng lên tay */
async function forge(id: string, worn: string, spare: string) {
    const tone = toneOf(R)
    const empty = slotEls(id).find(el => !el.classList.contains("full"))
    void playVfx(R.cast ?? "none",
        unitPt(ORNN),
        [],
        tone)
    await sleep(160)
    let flights: Promise<unknown> = Promise.resolve()
    await strike(R.travel,
        ORNN,
        [id],
        tone,
        () => {
            const at = unitPt(id)
            void playVfx(R.impact,
                at,
                [],
                tone)
            const toHand = (item: string) => flyToHand({
                x: at.x, y: at.y - 40
            },
            item)
            if (empty) {
                void playVfx(ORNN_FORGED_ITEM,
                    {
                        x: at.x, y: at.y + 26
                    },
                    [centerOf(empty)],
                    {
                        ...tone, intensity: 1, icon: itemIcon(worn),
                        onBeat() {
                            placeItem(empty,
                                worn)
                        }
                    })
                flights = toHand(spare)
            } else {
                flights = Promise.all([
                    toHand(worn),
                    sleep(180).then(() => toHand(spare))
                ])
            }
        })
    await flights
}

export async function runOrnnShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        for (const undo of cleanup) undo()
        cleanup.clear()
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Ornn: búa rèn nện vào đối diện")
    await basicAttack(ORNN,
        "B:annie",
        60)
    await sleep(760)

    say("Nội tại · Lò Rèn Sống: vòng mới, đồ của đồng minh mạnh thêm, ô đồ loé dung nham")
    await playVfx(P.impact,
        unitPt(ORNN),
        ALLIES.flatMap(id => wornSlots(id).map(centerOf)),
        toneOf(P))
    await sleep(320)

    say("Q · Núi Lửa Trồi: khe nứt tới Jinx, cột dung nham gây sát thương phép, mảnh ghép nung đỏ bay lên tay")
    const q = toneOf(Q)
    void playVfx(Q.cast ?? "none",
        unitPt(ORNN),
        [],
        q)
    await sleep(220)
    let forged: Promise<unknown> = Promise.resolve()
    await strike(Q.travel,
        ORNN,
        ["B:jinx"],
        q,
        () => {
            landDamage("B:jinx",
                150,
                "magic")
            void playVfx(Q.impact,
                unitPt("B:jinx"),
                [],
                q)
            forged = flyToHand(unitPt("B:jinx"),
                COMPONENT)
        })
    await forged
    await sleep(900)

    say("E · Rèn Lửa (Quick): đồ của Ashe thành Kiệt Tác, Ashe nhận Khiên theo số món")
    await refine("A:ashe")
    await sleep(1200)

    say("E · Rèn Lửa (nối chuỗi): Jinx nhắm Darius, đồ thành Kiệt Tác và Khiên dựng trước, đạn tới bị đỡ")
    // Jinx đang gồng đòn; mắt xích sau giải quyết trước nên Khiên dựng trước khi đạn tới
    await foeWindup("B:jinx")
    await refine("A:darius")
    await sleep(520)
    const jinx = heroBasicVfx("jinx")
    await strike(jinx.travel,
        "B:jinx",
        ["A:darius"],
        toneOf(jinx),
        () => {
            landBlocked("A:darius",
                80,
                "physical")
            void playVfx(E.block ?? "none",
                unitPt("A:darius"),
                [unitPt("B:jinx")],
                toneOf(E))
        })
    await sleep(1100)

    say("R · Tiếng Gọi Thần Rèn (Quick): búa nện xuống Viktor, món mới vào ô đồ, món thứ hai bay lên tay")
    await forge("A:viktor",
        "nanh_nashor",
        "giao_shojin")
    await sleep(1000)

    say("R · Tiếng Gọi Thần Rèn (nối chuỗi): Leona đánh Janna, Janna nhận món trước khi đòn tới")
    await foeWindup("B:leona")
    await forge("A:janna",
        "gang_bao_thach",
        "quy_thu")
    await sleep(320)
    await basicAttack("B:leona",
        "A:janna",
        70)
    await sleep(1000)

    say("R · Tiếng Gọi Thần Rèn: ô đồ Darius đã đầy, món rèn lên tay thay vì đeo")
    await forge("A:darius",
        "nanh_nashor",
        "quy_thu")
    await sleep(1200)
}
