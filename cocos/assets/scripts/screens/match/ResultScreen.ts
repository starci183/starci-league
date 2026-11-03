// Kết thúc trận, bóc từ docs/mockups/match/result.png: THẮNG LỢI / THẤT BẠI, tên người chơi, hai đội 5 ô tướng có VS,
// bảng thống kê (từ state cuối trận), bảng kết quả (lý do kết thúc), nút Về sảnh / Đấu lại.
import {
    Node
} from "cc"
import {
    C, at
} from "../../dna/theme"
import {
    getGame, heroName
} from "../../net/game"
import {
    image
} from "../../ui/assets"
import {
    Button, Frame, panel, rule, text
} from "../../ui/kit"
import {
    slot
} from "../../ui/slot"

const REASON: Record<string, string> = {
    lives: "Đối thủ hết mạng", deck: "Bộ bài cạn khi rút", left: "Đối thủ đã rời trận", resign: "Có người đầu hàng", timeout: "Hết giờ", error: "Lỗi trận đấu"
}

export function buildResult(root: Node, onLobby: () => void, onAgain: () => void) {
    const s = getGame()
    const v = s.view
    const you = v?.you ?? "A", them = you === "A" ? "B" : "A"
    const win = s.end?.winner ? s.end.winner === you : null
    text(root,
        "Kết thúc trận",
        0,
        at(0,
            32).y,
        {
            font: "title", size: 36, width: 600
        })
    image(root,
        "art/logo/crest",
        150,
        150,
        0,
        at(0,
            112).y)
    text(root,
        win === null ? "Hoà" : win ? "Thắng lợi" : "Thất bại",
        0,
        at(0,
            205).y,
        {
            font: "title", size: 104, width: 1000, height: 130, color: win === false ? C.danger : C.goldLight
        })
    text(root,
        `${v?.names[you] ?? "Bạn"} · ${REASON[s.end?.reason ?? ""] ?? ""}`,
        0,
        at(0,
            290).y,
        {
            font: "titleMedium", size: 32, width: 900, upper: false
        })

    const team = (side: "A" | "B", cx: number, label: string, enemy: boolean) => {
        const p = panel(root,
            785,
            270,
            at(cx,
                0).x,
            at(0,
                470).y)
        const tag = new Frame(p,
            290,
            48,
            0,
            100,
            {
                fill: enemy ? C.dangerDeep : C.tealDeep, stroke: enemy ? C.enemy : C.teal, inner: null, chamfer: 14
            })
        text(tag.node,
            label,
            0,
            0,
            {
                font: "titleMedium", size: 32, width: 280, height: 46, upper: false
            })
        const heroes = v?.players[side].heroes ?? []
        for (let i = 0; i < 5; i++) {
            const x = -287 + i * 145.5
            slot(p,
                "heroes",
                heroes[i] ?? "",
                118,
                x,
                2,
                {
                    edge: enemy ? C.enemy : C.gold
                })
            text(p,
                heroes[i] ? heroName(heroes[i]) : "",
                x,
                -90,
                {
                    size: 22, width: 140, height: 50, wrap: true
                })
        }
    }
    team(you,
        537,
        "Đội của bạn",
        false)
    team(them,
        1382,
        "Đội địch",
        true)
    text(root,
        "VS",
        0,
        at(0,
            477).y,
        {
            font: "title", size: 54, width: 120
        })

    const stats = panel(root,
        655,
        290,
        at(707,
            0).x,
        at(0,
            775).y,
        "none")
    text(stats,
        "Thống kê trận",
        0,
        112,
        {
            font: "titleMedium", size: 36, width: 500, upper: false
        })
    rule(stats,
        420,
        0,
        84,
        true,
        C.gold)
    // stats thật từ cg:state: { A|B: { kills, damage, cardsPlayed } }; thiếu thì dùng bảng dự phòng cũ
    const st = v?.stats as Record<string, { kills?: number; damage?: number; cardsPlayed?: number } | undefined> | undefined
    const mine = st?.[you], theirs = st?.[them]
    const num = (n: number | undefined) => n === undefined ? "-" : String(Math.round(n))
    const rows: [string, string, string][] = !v ? [] : mine && theirs ? [["Sát thương gây ra",
        num(mine.damage),
        num(theirs.damage)],
    ["Hạ gục",
        num(mine.kills),
        num(theirs.kills)],
    ["Lá đã đánh",
        num(mine.cardsPlayed),
        num(theirs.cardsPlayed)],
    ["Mạng còn lại",
        String(v.players[you].lives),
        String(v.players[them].lives)],
    ["Vòng · lượt",
        `${v.round} · ${v.turnNo}`,
        `${v.round} · ${v.turnNo}`]] : [["Mạng còn lại",
        String(v.players[you].lives),
        String(v.players[them].lives)],
    ["Lá trong mộ",
        String(v.players[you].grave.length),
        String(v.players[them].grave.length)],
    ["Bộ bài còn",
        String(v.players[you].deckCount),
        String(v.players[them].deckCount)],
    ["Vòng",
        String(v.round),
        String(v.round)]]
    text(stats,
        "Bạn",
        -200,
        56,
        {
            font: "titleMedium", size: 26, width: 160, upper: false, color: C.teal
        })
    text(stats,
        "Đối thủ",
        200,
        56,
        {
            font: "titleMedium", size: 26, width: 160, upper: false, color: C.enemy
        })
    rows.forEach(([k, a, b], i) => {
        const y = 20 - i * 34
        text(stats,
            a,
            -200,
            y,
            {
                font: "number", size: 30, width: 160, color: C.goldLight
            })
        text(stats,
            k,
            0,
            y,
            {
                size: 24, width: 220, color: C.text
            })
        text(stats,
            b,
            200,
            y,
            {
                font: "number", size: 30, width: 160, color: C.goldLight
            })
    })

    const result = panel(root,
        468,
        290,
        at(1306,
            0).x,
        at(0,
            775).y,
        "none")
    text(result,
        "Kết quả",
        0,
        112,
        {
            font: "titleMedium", size: 36, width: 400, upper: false
        })
    rule(result,
        320,
        0,
        84,
        true,
        C.gold)
    const r1 = new Frame(result,
        370,
        56,
        0,
        30,
        {
            chamfer: 10
        })
    text(r1.node,
        win === null ? "Hoà" : win ? "Bạn thắng" : "Bạn thua",
        0,
        0,
        {
            font: "titleMedium", size: 30, width: 350, upper: false
        })
    const r2 = new Frame(result,
        370,
        56,
        0,
        -48,
        {
            chamfer: 10
        })
    text(r2.node,
        REASON[s.end?.reason ?? ""] ?? s.end?.reason ?? "",
        0,
        0,
        {
            size: 24, width: 350, color: C.goldLight
        })

    new Button(root,
        "Về sảnh",
        395,
        80,
        at(710,
            0).x,
        at(0,
            995).y,
        onLobby,
        "gold",
        40)
    new Button(root,
        "Đấu lại",
        445,
        90,
        at(1185,
            0).x,
        at(0,
            995).y,
        onAgain,
        "primary",
        48)
}
