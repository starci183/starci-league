// Giao diện chế độ thẻ bài (phòng "card"), thuần React/DOM, không dùng Phaser.
// Bố cục cố định; mỗi vùng là một file riêng:
//   Screens.tsx  : chờ đối thủ, chọn tướng, kết thúc trận          (screens.css)
//   Board.tsx    : sân 5 đường x 2 phe, ô triệu hồi phụ, mạng, bộ bài, mộ, lá thưởng (board.css)
//   Hand.tsx     : tay bài, thanh hành động, gọi tướng, ghép đồ, kết thúc lượt (hand.css)
//   ChainPanel.tsx: chuỗi Quick play, nhật ký trận, hiệu ứng sự kiện (chain.css)
import {
    createRoot
} from "react-dom/client"
import {
    cardActions, useCard, type CardJoin
} from "./store"
import {
    DraftScreen, EndScreen, WaitingScreen
} from "./Screens"
import {
    Board
} from "./Board"
import {
    Hand
} from "./Hand"
import {
    ChainPanel
} from "./ChainPanel"
import "./card.css"
import "./screens.css"
import "./board.css"
import "./hand.css"
import "./chain.css"

function CardApp() {
    const { stage, error } = useCard()
    if (stage === "idle" || stage === "connecting") return <div className="cg-center">…</div>
    if (stage === "error") return <div className="cg-center cg-error">{error}</div>
    if (stage === "waiting") return <WaitingScreen />
    if (stage === "draft") return <DraftScreen />
    return (
        <div className="cg-root">
            <main className="cg-main">
                <Board />
                <Hand />
            </main>
            <aside className="cg-side">
                <ChainPanel />
            </aside>
            {stage === "ended" ? <EndScreen /> : null}
        </div>
    )
}

/** Gắn giao diện thẻ bài vào #app và vào phòng */
export function startCardGame(join: CardJoin) {
    const host = document.getElementById("app")!
    host.innerHTML = ""
    const el = document.createElement("div")
    el.className = "cg-host"
    host.appendChild(el)
    createRoot(el).render(<CardApp />)
    void cardActions.connect(join)
}
