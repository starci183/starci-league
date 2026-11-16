// Màn trận của Hướng dẫn: MatchScreen thật (bàn 5 đường, tay bài, bộ, mộ, mana đội, chuỗi, nhật ký) chạy trên phòng trong máy
// (net/localRoom.ts) với thế cờ dựng sẵn của tutorial/scenarios.ts. Thêm một khung nhỏ ở cột phải (đè lên mục "Đội dự bị", không che
// bàn và tay bài): tướng · chiêu, hàng ô (Nội tại/Q/E/R/Đánh), hàng biến thể khi ô có nhiều tình huống, mô tả chiêu chuẩn,
// Chiêu trước / Làm lại / Chiêu sau (đi qua mọi biến thể của mọi ô), Chọn tướng khác / Thoát. Lá cần thử được làm nổi trên tay.
import {
    BlockInputEvents, Node
} from "cc"
import {
    C, withAlpha
} from "../dna/theme"
import {
    gameActions
} from "../net/game"
import {
    LocalRoom
} from "../net/localRoom"
import {
    buildMatch
} from "../screens/match/MatchScreen"
import type {
    Nav
} from "../screens/nav"
import {
    cg
} from "../shared"
import {
    Button, Frame, text
} from "../ui/kit"
import {
    SLOT_KEYS, SLOT_TAG, allScenarios, buildScenarioState, scenarioOf, slotDesc, slotName, variantsOf, type SlotKey
} from "./scenarios"

/** Khung Hướng dẫn: cột phải của MatchScreen (x 1585..1905), vùng "Đội dự bị" (y 549..849 tính từ mép trên).
 *  Không nới cao: ngay trên là nhật ký (tới y 546), ngay dưới là dòng nhắc của trận (y 850..890) rồi nút Kết thúc lượt. */
const PANEL = {
    x: 785, y: -159, w: 316, h: 300
}

export function buildTutorialMatch(root: Node, nav: Nav, hero: string, slot: SlotKey, variant = 0): () => void {
    const sc = scenarioOf(hero,
        slot,
        variant) ?? scenarioOf(hero,
        slot)
    if (!sc) {
        nav.showTutorial(hero)
        return () => undefined
    }
    const room = new LocalRoom({
        state: buildScenarioState(sc),
        enemyPlan: sc.enemyPlan,
        names: {
            A: nav.session?.user.name ?? "Bạn", B: "Người nộm"
        },
    })
    void gameActions.connectLocal(room)
    const disposeMatch = buildMatch(root,
        nav,
        {
            highlightCard: (c) => sc.focus.includes(c.id), highlightBadge: "Thử lá này"
        })

    // Móc dev: window.__tut cho kiểm thử tự động bằng trình duyệt (đọc trạng thái, đánh lá, bước, kết thúc lượt, đổi tình huống)
    type Act = ReturnType<typeof cg.legalActions>[number]
    const legal = (): Act[] => cg.legalActions(room.state,
        "A")
    const send = (a: Act | undefined) => { if (a) room.send("cg:action",
        {
            action: a
        }); return !!a }
    const cardOf = (uid?: string) => room.state.players.A.hand.find((c) => c.uid === uid)?.id
    ;(globalThis as unknown as { __tut?: unknown }).__tut = {
        hero, slot, variant, scenario: sc, room,
        state: () => room.state,
        legal: () => legal().map((a) => ({
            t: a.t, card: "uid" in a ? cardOf(a.uid as string) : undefined, args: "args" in a ? a.args : undefined
        })),
        play: (id: string, target?: string) => send(legal().find((a) => (a.t === "play" || a.t === "chain") && cardOf((a as { uid?: string }).uid) === id
            && (!target || (a as { args?: { target?: string } }).args?.target === target))),
        attack: (target?: string) => send(legal().find((a) => a.t === "attack" && (!target || (a as { target?: string }).target === target))),
        step: () => send(legal().find((a) => a.t === "step")),
        end: () => send(legal().find((a) => a.t === "end")),
        pass: () => send(legal().find((a) => a.t === "pass")),
        go: (h: string, sl: SlotKey, v = 0) => nav.startTutorial(h,
            sl,
            v),
    }
    ;(globalThis as unknown as { __goTut?: unknown }).__goTut = (h: string, sl: SlotKey, v = 0) => nav.startTutorial(h,
        sl,
        v)

    // Trận kết thúc trong tình huống (vd Yorick làm đối thủ cạn bài): hiện bảng kết quả giữa bàn, Làm lại hoặc Chiêu sau
    room.onMessage("cg:end",
        ((end: { winner: cg.Side | null; reason: string }) => {
            const win = end.winner === "A"
            const why = end.reason === "deck" ? (win ? "Đối thủ cạn bộ bài: đầu lượt không còn lá để rút" : "Bạn cạn bộ bài")
                : (win ? "Đối thủ hết mạng" : "Bạn hết mạng")
            const box = new Frame(root,
                560,
                170,
                -60,
                60,
                {
                    fill: withAlpha(C.panel,
                        245), stroke: win ? C.goldLight : C.teal, glow: C.tealDark, inner: null, chamfer: 10,
                })
            box.node.name = "TutorialEnd"
            box.node.addComponent(BlockInputEvents)
            text(box.node,
                win ? "THẮNG" : "THUA",
                0,
                48,
                {
                    font: "title", size: 34, width: 520, color: win ? C.goldLight : C.text
                })
            text(box.node,
                why,
                0,
                8,
                {
                    size: 15, width: 520, upper: false, color: C.text
                })
            new Button(box.node,
                "Làm lại",
                160,
                34,
                -90,
                -48,
                () => nav.startTutorial(hero,
                    slot,
                    sc.variant),
                "primary",
                15)
            new Button(box.node,
                "Chiêu sau ›",
                160,
                34,
                90,
                -48,
                () => {
                    const order = allScenarios()
                    const i = order.findIndex((o) => o.hero === hero && o.slot === slot && o.variant === sc.variant)
                    const o = order[(i + 1) % order.length]
                    nav.startTutorial(o.hero,
                        o.slot,
                        o.variant)
                },
                "gold",
                15)
        }) as never)

    // ---- khung Hướng dẫn ----
    const f = new Frame(root,
        PANEL.w,
        PANEL.h,
        PANEL.x,
        PANEL.y,
        {
            fill: withAlpha(C.panel,
                250), stroke: C.teal, glow: C.tealDark, inner: null, chamfer: 8,
        })
    f.node.name = "TutorialPanel"
    f.node.addComponent(BlockInputEvents)
    const top = PANEL.h / 2
    const inner = PANEL.w - 24
    const name = cg.getHero(hero)?.name ?? hero
    text(f.node,
        `${name} · ${SLOT_TAG[slot]}`,
        0,
        top - 18,
        {
            font: "title", size: 20, width: PANEL.w - 20
        })
    text(f.node,
        slotName(hero,
            slot),
        0,
        top - 40,
        {
            font: "textMedium", bold: true, size: 13, width: PANEL.w - 20, upper: false, color: C.goldLight
        })
    // Hàng nút chọn thẳng ô (thầy chốt 2026-11-16): bấm là vào tình huống đầu của ô đó, ô đang xem nổi bật
    const SLOT_W: Record<SlotKey, number> = {
        p: 70, q: 44, e: 44, r: 44, basic: 66
    }
    const SLOT_LABEL: Record<SlotKey, string> = {
        p: "Nội tại", q: "Q", e: "E", r: "R", basic: "Đánh"
    }
    const gap = 6
    const rowW = SLOT_KEYS.reduce((n, k) => n + SLOT_W[k],
        0) + gap * (SLOT_KEYS.length - 1)
    let x = -rowW / 2
    for (const k of SLOT_KEYS) {
        new Button(f.node,
            SLOT_LABEL[k],
            SLOT_W[k],
            26,
            x + SLOT_W[k] / 2,
            top - 64,
            () => { if (k !== slot) nav.startTutorial(hero,
                k) },
            k === slot ? "primary" : "ghost",
            13)
        x += SLOT_W[k] + gap
    }
    // Hàng biến thể (chỉ khi ô có hơn 1 tình huống): "1 · Nối chuỗi (Quick)", "2 · Dùng chủ động"; nhiều hơn 3 thì chỉ ghi số
    const variants = variantsOf(hero,
        slot)
    let descTop = top - 80
    if (variants.length > 1) {
        const n = variants.length
        const vw = (inner - gap * (n - 1)) / n
        variants.forEach((v, i) => {
            new Button(f.node,
                n <= 3 ? `${i + 1} · ${v.title}` : String(i + 1),
                vw,
                24,
                -inner / 2 + vw / 2 + i * (vw + gap),
                top - 94,
                () => { if (i !== sc.variant) nav.startTutorial(hero,
                    slot,
                    i) },
                i === sc.variant ? "primary" : "ghost",
                11)
        })
        descTop = top - 110
        if (n > 3) {
            text(f.node,
                sc.title,
                0,
                top - 118,
                {
                    size: 12, width: inner, upper: false, color: C.teal
                })
            descTop = top - 128
        }
    }
    // Thầy chốt 2026-11-16: khung trong trận ghi mô tả chiêu chuẩn (như trên lá), không ghi kiểu hướng dẫn
    const descBottom = -72
    text(f.node,
        slotDesc(hero,
            slot),
        0,
        (descTop + descBottom) / 2,
        {
            size: 12, width: inner, height: descTop - descBottom, wrap: true, align: "left", upper: false, color: C.text
        })
    // Chiêu trước / sau đi qua mọi biến thể của mọi ô, của mọi tướng
    const order = allScenarios()
    const idx = Math.max(0,
        order.findIndex((o) => o.hero === hero && o.slot === slot && o.variant === sc.variant))
    const go = (d: number) => {
        const o = order[(idx + d + order.length) % order.length]
        nav.startTutorial(o.hero,
            o.slot,
            o.variant)
    }
    const bw = (inner - 2 * 8) / 3
    new Button(f.node,
        "‹ Chiêu trước",
        bw,
        30,
        -bw - 8,
        -88,
        () => go(-1),
        "gold",
        12)
    new Button(f.node,
        "Làm lại",
        bw,
        30,
        0,
        -88,
        () => nav.startTutorial(hero,
            slot,
            sc.variant),
        "primary",
        15)
    new Button(f.node,
        "Chiêu sau ›",
        bw,
        30,
        bw + 8,
        -88,
        () => go(1),
        "gold",
        12)
    const hw = (inner - 8) / 2
    new Button(f.node,
        "Chọn tướng khác",
        hw,
        28,
        -hw / 2 - 4,
        -121,
        () => nav.showTutorial(hero,
            slot),
        "gold",
        13)
    new Button(f.node,
        "Thoát",
        hw,
        28,
        hw / 2 + 4,
        -121,
        () => nav.leaveMatch(),
        "ghost",
        13)
    text(f.node,
        `Hướng dẫn ${idx + 1}/${order.length}`,
        0,
        -142,
        {
            size: 11, width: PANEL.w - 20, color: C.textMuted
        })

    return () => {
        disposeMatch()
        room.dispose()
    }
}
