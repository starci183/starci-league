import {
    unitSkillIcon
} from "../anim/cardArt"
import {
    useMemo, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    heroName
} from "../board/helpers"
import {
    ActionDialog
} from "./ActionDialog"

import {
    gameOf, useCard
} from "../store"
import {
    ForestIcon
} from "./ForestIcon"
import "./mode-dialog.css"
import {
    GameIcon
} from "./GameIcon"
import {
    ArtFrame
} from "./ArtFrame"

const NAMES: Record<string, string> = {
    minigun: "Bằng Chíu", rocket: "Xương Cá", hammer: "Búa Thủy Ngân", cannon: "Pháo Thủy Ngân"
}

// Comparison copy stays concise; the complete current engine description is the hover text.
const HINTS: Record<string, Record<string, string>> = {
    hammer: {
        Q: "Đổi sang đối diện mục tiêu, gây sát thương và hồi Máu.", E: "Đánh kẻ địch đối diện, gây Choáng và hồi Máu.", R: "Đánh đối diện và hai đường kề; hồi Máu theo sát thương."
    },
    cannon: {
        Q: "Bắn mục tiêu bất kỳ; sát thương lan hai đường kề.", E: "Tích Gia Tốc, tăng Tốc Đánh và sức mạnh Q, R.", R: "Bắn một mục tiêu, xuyên Giáp; mạnh hơn khi địch mất Máu."
    },
    minigun: {
        Q: "Bắn theo súng đang cầm; tích Điên khi trúng.", E: "Gây sát thương và Mù. Có thể phản ứng khi đồng minh bị đánh.", R: "Tên lửa gây sát thương lan; hạ gục kích Phấn Khích."
    },
    rocket: {
        Q: "Bắn theo súng đang cầm; tích Điên khi trúng.", E: "Gây sát thương và Mù. Có thể phản ứng khi đồng minh bị đánh.", R: "Tên lửa gây sát thương lan; hạ gục kích Phấn Khích."
    }
}

const PHASES: Record<cg.TurnStep, [string, string]> = {
    draw: ["Rút bài",
        "Draw"], reward: ["Nhận thưởng",
        "Reward"], standby: ["Chờ",
        "Standby"], main1: ["Chính 1",
        "Main 1"], battle: ["Giao tranh",
        "Battle"], main2: ["Chính 2",
        "Main 2"], end: ["Kết thúc",
        "End"]
}

/** Art chỉ là minh hoạ; giá, tên chiêu và trạng thái vẫn đọc từ engine. */
export function ChampionModeDialog(p: { unit: cg.Unit; modes: string[]; standby?: boolean; currentMode?: string; onClose(): void; onConfirm(mode: string): void }) {
    const { view } = useCard()
    const g = useMemo(() => view ? gameOf(view) : null,
        [view])
    const hero = p.unit.hero
    const def = cg.getHero(hero)
    const jinx = hero === "jinx", jayce = hero === "jayce"
    const [chosen,
        setChosen] = useState<string | null>(p.currentMode ?? null)
    const keeping = p.standby && chosen === p.currentMode
    const title = `${heroName(hero)} · ${jinx ? "Chọn súng" : "Đổi dạng"}`
    const confirm = keeping ? `Giữ ${NAMES[chosen!] ?? chosen}` : p.standby ? `Đổi sang ${NAMES[chosen!] ?? chosen ?? "…"}` : `Chọn ${NAMES[chosen!] ?? chosen ?? "…"} · Tiếp tục`
    return <ActionDialog className="mode-dialog" hideCancel title={title} subtitle={p.standby ? "Nội tại · Đổi vũ khí" : "TRIỆU HỒI · Chọn vũ khí khởi đầu"} onClose={p.onClose} footer={<>
        <nav className="mode-phases" aria-label="Bảy bước lượt">{cg.TURN_STEPS.map((step, i) => <ArtFrame kind="name" width="100%" height={58} key={step} className={`mode-phase${view?.step === step ? " active" : ""}`}><b title={PHASES[step][0]} aria-current={view?.step === step ? "step" : undefined}>{i + 1} · {PHASES[step][1]}</b></ArtFrame>)}</nav>
    </>}>
        <div className={`mode-comparison mode-${hero}`} aria-label="So sánh hai lựa chọn">
            <div className="mode-cards">{p.modes.map((mode) => {
                const preview = {
                    ...p.unit, stacks: {
                        ...p.unit.stacks, jayce_form: mode === "cannon" ? 1 : 0, jinx_gun: mode === "rocket" ? 1 : 0
                    }
                }
                const maxHp = Math.max(1,
                    p.unit.maxHp + (g ? g.stats(preview).hp - g.stats(p.unit).hp : 0))
                const hp = Math.min(maxHp,
                    Math.max(1,
                        p.unit.hp + maxHp - p.unit.maxHp))
                const desc = jayce ? mode === "hammer" ? "Cận chiến · Đòn trúng hồi Máu" : "Tầm xa · Tích Gia Tốc" : jinx ? mode === "minigun" ? `+${cg.kit("jinx").p.q1} Tốc Đánh` : "Đòn trúng nổ lan 2 đường kề" : "Vũ khí khởi đầu"
                const passive = jayce ? "Đổi dạng cường hoá đòn đánh kế tiếp." : "Đòn trúng và hạ gục tích Điên. Đổi súng giữ Điên."
                const art = `/ui/forest-v2/${hero}-${mode}-lol${mode === "cannon" ? "-v5" : mode === "rocket" ? "-v3" : "-v2"}.png`
                return <button type="button" className={`mode-card${chosen === mode ? " selected" : ""}${mode === p.currentMode ? " current" : ""}`} key={mode} data-champion-mode={mode} aria-label={`${NAMES[mode] ?? mode}${mode === p.currentMode ? " · Đang dùng" : ""}`} aria-pressed={chosen === mode} onClick={() => setChosen(mode)}>
                    <ArtFrame kind="icon" className={`mode-art mode-art-${mode}`} width="100%" height={260} image={art} label={`${heroName(hero)} cầm ${NAMES[mode] ?? mode}`} />{mode === p.currentMode ? <ArtFrame kind="name" width={160} height={42} className="mode-current">ĐANG DÙNG</ArtFrame> : chosen === mode ? <ArtFrame kind="name" width={160} height={42} className="mode-current mode-preview">ĐANG CHỌN</ArtFrame> : null}
                    <ArtFrame kind="name" className="mode-name" width="100%" height={92}><GameIcon name={mode === "hammer" ? "sword" : "target"} /><span><b>{NAMES[mode] ?? mode}</b><small>{jayce ? mode === "hammer" ? "ĐẤU SĨ" : "XẠ THỦ" : mode === "minigun" ? "SÚNG MÁY" : "TÊN LỬA"}</small></span></ArtFrame>
                    <span className="mode-health"><ArtFrame kind="meter" fitLabel={false} className="mode-hp" width={300} height={44}><span className="mode-hp-track"><i style={{
                        width: `${hp / maxHp * 100}%`
                    }} /></span></ArtFrame><ArtFrame kind="name" className="mode-hp-counter" width={300} height={72}><strong>{Math.round(hp)} / {Math.round(maxHp)}</strong></ArtFrame></span>
                    <span className="mode-trait">{desc}</span>
                    <span className="mode-skill" title={passive}><i className="mode-key">P</i><ArtFrame kind="icon" width={54} height={54} image={`/icons/${hero}_p.png`} /><span><strong>{def?.passive?.name}</strong><small>{passive}</small></span></span>
                    {(["Q",
                        "E",
                        "R"] as const).map((key) => {
                        const skill = def?.skills[key]
                        if (!skill) return null
                        const card: cg.Card = {
                            uid: "preview", side: p.unit.side, hero, id: `${hero}_${key.toLowerCase()}`, kind: "skill", data: {
                                form: mode === "cannon" ? 1 : 0
                            }
                        }
                        const name = skill.variant?.(preview,
                            card)?.vi.name ?? skill.name
                        const info = g ? cg.cardInfoL(g,
                            card) : undefined
                        const cost = g ? g.manaCost(preview,
                            skill,
                            card) : typeof skill.mana === "number" ? skill.mana : undefined
                        return <span className="mode-skill" key={key} title={info?.desc}><i className="mode-key">{key}</i><ArtFrame kind="icon" width={54} height={54} image={unitSkillIcon(preview,
                            key)} /><span><strong>{name}{cost !== undefined ? <em> · {cost} mana</em> : null}</strong><small>{HINTS[mode]?.[key] ?? info?.desc}</small></span></span>
                    })}
                </button>
            })}</div>
            <div className="mode-switch-emblem"><ForestIcon name="switch" /><button className="action-primary mode-confirm" aria-label={confirm} disabled={!chosen} onClick={() => chosen && p.onConfirm(chosen)}><ArtFrame kind="name" width={250} height={66}><b>{p.standby ? keeping ? "Giữ vũ khí" : jayce ? "Đổi dạng" : "Đổi súng" : "Chọn vũ khí"}</b></ArtFrame></button><ArtFrame kind="name" width={250} height={54} className="mode-confirm-choice"><small>{chosen ? NAMES[chosen] : "Chọn một bên"}</small></ArtFrame></div>
        </div>
        <p className="mode-selection" role="status" aria-live="polite">{chosen ? keeping ? `Đang dùng ${NAMES[chosen]}. Chọn vũ khí còn lại để xem trước.` : `Đang chọn ${NAMES[chosen]}. Xác nhận để ${p.standby ? "đổi vũ khí" : "tiếp tục triệu hồi"}.` : "Chọn một vũ khí để xem trước và xác nhận."}</p>
        <section className="mode-passive" aria-label="Điều kiện đổi vũ khí"><h3>HÀNH ĐỘNG NỘI TẠI</h3><div className="mode-passive-options"><ArtFrame kind="name" width="100%" height={86} className={`mode-standby ${p.standby ? "ready" : "locked"}`}><ForestIcon name={p.standby ? "standby" : "lock"} /><span><strong>{p.standby ? "1 lần mỗi lượt · Chỉ ở Standby" : "Chọn vũ khí khi triệu hồi"}</strong><small>{p.standby ? jayce ? "Đổi dạng: cường hoá đòn đánh kế." : "Đổi súng giữ nguyên Điên." : "Không dùng lần đổi nội tại ở Standby."}</small></span></ArtFrame><ArtFrame kind="name" width="100%" height={86} className="mode-standby locked"><ForestIcon name="lock" /><span><strong>Ngoài Standby</strong><small>Không thể đổi vũ khí</small></span></ArtFrame></div></section>
    </ActionDialog>
}
