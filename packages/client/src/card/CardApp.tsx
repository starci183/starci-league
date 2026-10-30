// Giao diện chế độ thẻ bài (phòng "card"), thuần React/DOM, không dùng Phaser.
// Bố cục cố định; mỗi vùng là một file riêng:
//   Screens.tsx  : chờ đối thủ, chọn tướng, kết thúc trận          (screens.css)
//   Board.tsx    : sân 5 đường x 2 phe, ô triệu hồi phụ, mạng, bộ bài, mộ, lá thưởng (board.css)
//   Hand.tsx     : tay bài, thanh hành động, gọi tướng, ghép đồ, kết thúc lượt (hand.css)
//   ChainPanel.tsx: chuỗi Quick play, nhật ký trận, hiệu ứng sự kiện (chain.css)
//   stats/UnitPanel.tsx: bảng chỉ số tướng đang chọn, trên ChainPanel (stats/stats.css)
import {
    createRoot
} from "react-dom/client"
import {
    createPortal
} from "react-dom"
import {
    useState
} from "react"
import {
    cardActions, setDisplayLag, useCard, type CardJoin
} from "./store"
import {
    DraftScreen, EndScreen, WaitingScreen
} from "./Screens"
import {
    Board, TurnBar
} from "./Board"
import {
    Hand
} from "./Hand"
import {
    ChainPanel
} from "./ChainPanel"
import {
    ChainStage
} from "./chain/ChainStage"
import {
    UnitPanel
} from "./stats/UnitPanel"
import {
    AnimLayer
} from "./anim/AnimLayer"
import {
    VfxCanvas
} from "./vfx/VfxCanvas"
import {
    noFx, reducedMotion, setNoFx
} from "./anim/helpers"
import "../cardFrame.css"
import "./card.css"
import "./screens.css"
import "./board.css"
import "./hand.css"
import "./chain.css"
import "./stats/stats.css"
import "./forest.css"
import "./forest-concept.css"
import "./forest-polish.css"

export function CardApp() {
    const { stage, error, view, targeting, presenting } = useCard()
    const [logOpen,
        setLogOpen] = useState(true)
    const [infoOpen,
        setInfoOpen] = useState(false)
    const [fxOff,
        setFxOff] = useState(noFx)
    if (stage === "idle" || stage === "connecting") return <div className="cg-center">…</div>
    if (stage === "error") return <div className="cg-center cg-error">{error}</div>
    if (stage === "waiting") return <WaitingScreen />
    if (stage === "draft") return <DraftScreen />
    return (
        <div className="cg-viewport"><div className={`cg-root forest-game${logOpen ? " log-open" : ""}${infoOpen ? " info-open" : ""}`}>
            <aside className="cg-inspector" aria-label="Thông tin lá bài và tướng">
                <UnitPanel />
            </aside>
            {view ? <aside className="cg-phase-panel" aria-label="Pha và lượt"><TurnBar view={view} me={view.you ?? "A"} hint={!!targeting} busy={presenting} /></aside> : null}
            <main className="cg-main">
                <div className="cg-panel-controls">
                    <button className="cg-info-toggle" aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)}>Thông tin</button>
                    <button className="cg-log-toggle" aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}>{logOpen ? "Ẩn nhật ký" : "Nhật ký"}</button>
                </div>
                <Board />
                <Hand />
            </main>
            <aside className="cg-side">
                <div className="cg-chainwrap">
                    <ChainPanel />
                </div>
            </aside>
            <button className="cg-fx-toggle" aria-pressed={fxOff} title="No effect: tắt hoạt ảnh và VFX, kết quả hiện ngay" onClick={() => {
                const off = !fxOff
                setNoFx(off)
                setFxOff(off)
                setDisplayLag(!reducedMotion())
            }}>{fxOff ? "Hiệu ứng: tắt" : "Hiệu ứng: bật"}</button>
            <ChainStage />
            {createPortal(<AnimLayer />,
                document.body)}
            {fxOff ? null : <VfxCanvas />}
            {stage === "ended" ? <EndScreen /> : null}
        </div></div>
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
