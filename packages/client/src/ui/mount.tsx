// Gắn React lên trang: bảng bên phải + tooltip khi rê chuột vào tướng/quái trên bàn Phaser (mở đúng chỗ con trỏ).
import {
    createRoot
} from "react-dom/client"
import {
    monsterAt, monsterName, t
} from "@starci/shared"
import {
    TooltipProvider, Tooltip, TooltipContent, TooltipTrigger
} from "./components/tooltip"
import {
    Panel
} from "./Panel"
import {
    UnitTip
} from "./tips"
import {
    useUi
} from "./store"
import "./ui.css"

/** Tooltip theo con trỏ: một điểm neo vô hình đặt tại toạ độ chuột, shadcn Tooltip mở cạnh nó */
function BoardHover() {
    const { hover, s } = useUi()
    if (!hover || !s) return null
    let body: JSX.Element | null = null
    if (hover.kind === "unit") {
        const u = s.units.get(hover.id)
        if (u) body = <UnitTip u={u} />
    } else {
        const m = [...(s.monsters ?? [])].find((x: { lane: number }) => x.lane === hover.lane), def = monsterAt(hover.lane)
        if (m && def) body = (
            <div className="w-[260px] text-[13px] leading-snug">
                <div className="flex items-center gap-2"><img src={`/jungle/${def.id}.png`} alt="" className="h-12 w-12 object-contain" />
                    <div><div className="font-extrabold text-hex-gold-hi">{monsterName(def.id)}</div><b className="num">{m.hp}/{m.maxHp}</b></div></div>
                <p className="mt-2">{t(`g.reward_${def.id}` as never)}</p>
            </div>
        )
    }
    if (!body) return null
    return (
        <Tooltip open key={`${hover.kind}-${hover.x}-${hover.y}`}>
            <TooltipTrigger asChild><span className="pointer-events-none fixed h-px w-px" style={{
                left: hover.x, top: hover.y
            }} /></TooltipTrigger>
            <TooltipContent side="right" sideOffset={18} className="hex-tip pointer-events-none p-3">{body}</TooltipContent>
        </Tooltip>
    )
}

function App() {
    return (
        <TooltipProvider>
            <Panel />
            <BoardHover />
        </TooltipProvider>
    )
}

export function mountUi() {
    let el = document.getElementById("ui-root")
    if (!el) { el = document.createElement("div"); el.id = "ui-root"; document.body.appendChild(el) }
    createRoot(el).render(<App />)
}
