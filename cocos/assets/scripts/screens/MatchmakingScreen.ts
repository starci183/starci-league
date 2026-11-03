// Đang ghép trận, bóc từ docs/mockups/match/matchmaking.png: panel giữa có tiêu đề, vòng rune xanh ngọc xoay,
// chế độ đã chọn, thời gian chờ, bộ mang vào, nút Huỷ; phòng riêng hiện mã phòng để gửi bạn; mất kết nối hiện thẻ đỏ
// góc phải có nút Thử lại.
import {
    Graphics, Node, Tween, tween
} from "cc"
import {
    C, at, withAlpha
} from "../dna/theme"
import {
    getGame, onGame
} from "../net/game"
import {
    Button, Frame, box, drawGem, panel, rule, text
} from "../ui/kit"
import {
    topBar
} from "./LobbyScreen"
import type {
    MatchMode, Nav
} from "./nav"

const MODE_NAME = (m: MatchMode) => m.kind === "quick" ? "Đấu nhanh" : m.kind === "bot" ? m.level === "easy" ? "Đấu máy dễ" : "Đấu máy khó" : m.kind === "create" ? "Phòng riêng" : "Vào phòng"

export function buildMatchmaking(root: Node, nav: Nav, mode: MatchMode, deckName: string, retry: () => void): () => void {
    topBar(root,
        nav,
        deckName)
    const card = panel(root,
        890,
        850,
        0,
        at(0,
            575).y)
    const py = (y: number) => 575 - y
    text(card,
        "Đang ghép trận",
        0,
        py(240),
        {
            font: "title", size: 66, width: 820
        })
    rule(card,
        580,
        0,
        py(293),
        true,
        C.gold)
    const sub = text(card,
        "Đang tìm đối thủ phù hợp",
        0,
        py(333),
        {
            size: 34, color: C.goldLight, width: 760
        })

    // vòng rune: hai vòng tròn, các hạt ngọc quanh vòng, xoay chậm
    const ring = box("Ring",
        card,
        560,
        560,
        0,
        py(585))
    const g = ring.addComponent(Graphics)
    g.lineWidth = 3
    g.strokeColor = withAlpha(C.teal,
        230)
    g.circle(0,
        0,
        215)
    g.stroke()
    g.lineWidth = 1.5
    g.strokeColor = withAlpha(C.tealDark,
        200)
    g.circle(0,
        0,
        245)
    g.stroke()
    g.circle(0,
        0,
        185)
    g.stroke()
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.fillColor = withAlpha(C.teal,
            i % 3 === 0 ? 255 : 140)
        g.circle(Math.cos(a) * 230,
            Math.sin(a) * 230,
            i % 3 === 0 ? 6 : 3)
        g.fill()
    }
    const spin = tween(ring).by(12,
        {
            angle: -360
        }).repeatForever().start()
    const star = box("Star",
        card,
        120,
        120,
        0,
        py(475)).addComponent(Graphics)
    drawGem(star,
        0,
        0,
        48)
    const chip = new Frame(card,
        440,
        72,
        0,
        py(563),
        {
            fill: withAlpha(C.bg,
                245), chamfer: 14
        })
    text(chip.node,
        MODE_NAME(mode),
        0,
        0,
        {
            font: "title", size: 40, width: 400, height: 70
        })
    text(card,
        "Thời gian chờ",
        0,
        py(640),
        {
            size: 30, color: C.text, width: 400
        })
    const clock = text(card,
        "00:00",
        0,
        py(693),
        {
            font: "number", size: 76, width: 400, height: 96, color: C.goldLight
        })
    text(card,
        `Bộ bài: ${deckName} · ${nav.catalog?.size ?? 80}/${nav.catalog?.size ?? 80} lá`,
        0,
        py(830),
        {
            size: 28, color: C.text, width: 760
        })
    new Button(card,
        "Huỷ",
        470,
        80,
        0,
        py(913),
        () => nav.leaveMatch(),
        "primary",
        44)

    // thẻ mất kết nối (ẩn tới khi lỗi)
    const lost = new Frame(root,
        400,
        232,
        at(1680,
            0).x,
        at(0,
            887).y,
        {
            stroke: C.danger, inner: C.dangerDeep, fill: withAlpha(C.dangerDeep,
                235), gems: "top", chamfer: 14
        })
    text(lost.node,
        "Mất kết nối",
        0,
        70,
        {
            font: "titleMedium", size: 38, width: 360, upper: false
        })
    rule(lost.node,
        300,
        0,
        36,
        true,
        C.danger)
    const lostMsg = text(lost.node,
        "",
        0,
        0,
        {
            size: 24, width: 360, color: C.goldLight
        })
    new Button(lost.node,
        "Thử lại",
        236,
        52,
        0,
        -62,
        retry,
        "primary",
        28)
    lost.node.active = false

    const tick = () => {
        const s = getGame()
        const sec = Math.max(0,
            Math.floor((Date.now() - (s.startedAt || Date.now())) / 1000))
        clock.string = `${String(Math.floor(sec / 60)).padStart(2,
            "0")}:${String(sec % 60).padStart(2,
            "0")}`
    }
    const timer = setInterval(tick,
        250)
    const render = () => {
        const s = getGame()
        lost.node.active = s.stage === "error"
        lostMsg.string = s.error ?? "Không thể kết nối máy chủ."
        if (s.stage === "waiting" && s.roomId && (mode.kind === "create" || mode.kind === "join")) sub.string = `Mã phòng: ${s.roomId} (gửi cho bạn để vào)`
        else if (s.stage === "connecting") sub.string = "Đang kết nối máy chủ…"
        else sub.string = "Đang tìm đối thủ phù hợp"
    }
    const off = onGame(render)
    render()
    tick()
    return () => {
        off()
        clearInterval(timer)
        spin.stop()
        Tween.stopAllByTarget(ring)
    }
}
