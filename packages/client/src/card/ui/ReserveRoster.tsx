import {
    useEffect, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard
} from "../store"
import {
    heroName, isEn
} from "../board/helpers"
import {
    inspectionActions
} from "./inspection"
import {
    GameIcon
} from "./GameIcon"
import {
    ChampionModeDialog
} from "./ChampionModeDialog"

export function ReserveRoster() {
    const { view, legal, presenting, targeting } = useCard()
    // tướng có nhiều chế độ gọi (Jinx: súng): hỏi chế độ trước khi chọn đường
    const [modePick,
        setModePick] = useState<string | null>(null)
    useEffect(() => { setModePick(null) },
        [view,
            legal])
    if (!view?.you) return null
    const side = view.you
    const heroes = view.players[side].heroes.map((id) => view.units[`${side}:${id}`]).filter((u) => u && u.status !== "board")
    // chỉ lựa chọn gọi tướng của chính phe mình (sandbox 2 phe có thể đang công bố lựa chọn của phe kia; tướng có thể trùng tên)
    const summons = view.phase === "blind" ? legal.filter((a): a is cg.Action & { t: "summon" } => a.t === "summon" && a.side === side) : []
    return <section className="reserve-roster" data-count={heroes.length} aria-label={isEn() ? "Reserve champions" : "Đội dự bị"}>
        <h3><GameIcon name="roster" />{isEn() ? "Reserve champions" : "Đội dự bị"}<small>{heroes.length}</small></h3>
        <div className="reserve-grid">{heroes.map((unit) => {
            const options = summons.filter((a) => a.hero === unit.hero)
            const picked = view.blind?.picks[side].some((pick) => pick.hero === unit.hero)
            const status = unit.status === "dead" ? `${isEn() ? "Revives round" : "Hồi vòng"} ${unit.respawnRound}` : picked ? (isEn() ? "Selected" : "Đã chọn") : options.length ? (isEn() ? "Summon" : "Có thể gọi") : (isEn() ? "Not summoned" : "Chưa gọi")
            return <button type="button" key={unit.id} data-reserve-hero={unit.hero} className={`reserve-hero ${unit.status}${targeting?.source === unit.hero || picked ? " selected" : ""}`} aria-pressed={!!picked} title={`${heroName(unit.hero)} · ${status}`} onMouseEnter={() => inspectionActions.unit(unit.id)} onFocus={() => inspectionActions.unit(unit.id)} onClick={() => {
                inspectionActions.unit(unit.id)
                if (!presenting && options.length) {
                    cardActions.cancelTargeting()
                    const modes = [...new Set(options.map((a) => a.mode).filter((m): m is string => !!m))]
                    if (modes.length > 1) {
                        setModePick(unit.hero)
                        return
                    }
                    setModePick(null)
                    cardActions.beginTargeting(unit.hero,
                        options)
                }
            }}><img src={`/heroes-square/${unit.hero}.jpg`} alt="" /><b>{heroName(unit.hero)}</b><span>{status}</span></button>
        })}</div>
        {modePick ? (() => {
            const opts = summons.filter((a) => a.hero === modePick)
            const modes = [...new Set(opts.map((a) => a.mode).filter((m): m is string => !!m))]
            if (modes.length < 2) return null
            const unit = view.units[`${side}:${modePick}`]
            return <ChampionModeDialog unit={unit} modes={modes} onClose={() => setModePick(null)} onConfirm={(mode) => {
                setModePick(null)
                cardActions.beginTargeting(modePick,
                    opts.filter((a) => a.mode === mode))
            }} />
        })() : null}
        {!heroes.length ? <p>{isEn() ? "All champions deployed" : "Tất cả tướng đã ra sân"}</p> : null}
        {view.phase === "blind" ? <p>{view.blind?.ready[side] ? (isEn() ? "Locked · waiting for opponent" : "Đã chốt · chờ đối thủ") : (isEn() ? "Choose a champion, then its lane" : "Chọn tướng rồi chọn đường")}</p> : null}
    </section>
}
