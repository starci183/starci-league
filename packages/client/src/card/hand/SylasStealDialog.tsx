import {
    useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    gameOf, manaCostOf, type CardView
} from "../store"
import {
    ActionDialog
} from "../ui/ActionDialog"
import {
    GameIcon
} from "../ui/GameIcon"
import {
    ArtFrame
} from "../ui/ArtFrame"
import "./sylas-dialog.css"

export function SylasStealDialog(p: { view: CardView; source: string; options: cg.Action[]; onClose(): void; onConfirm(a: cg.Action): void }) {
    const g = gameOf(p.view)
    const side = p.view.you!
    const hand = p.view.players[side].hand ?? []
    const source = hand.find((c) => c.uid === p.source)
    const theftCost = source ? manaCostOf(g,
        source) : undefined
    const stealToHand = cg.kit("sylas").flag("stealToHand")
    const choices = p.options.flatMap((action) => {
        if (action.t !== "play" && action.t !== "chain") return []
        const target = action.args?.target, pick = action.args?.pick
        const unit = target ? p.view.units[target] : undefined
        if (!unit || !pick?.startsWith("steal:")) return []
        const [, hero,
            key] = pick.split(":")
        if (key !== "R") return []
        const def = cg.getHero(hero)?.skills[key as cg.SkillKey]
        if (!def) return []
        const card: cg.Card = {
            uid: "preview", kind: "skill", id: `${hero}_${key.toLowerCase()}`, hero: "sylas", side, data: {
                recycled: hero, stolen: 1, apPerAd: cg.kit("sylas").p.p4, keepCC: cg.kit("sylas").num("keepCC"), ...def.stealData?.(unit)
            }
        }
        const info = cg.cardInfoL(g,
            card)
        return [{
            action, target: unit.id, hero, key, name: info.name, desc: info.desc, mana: manaCostOf(g,
                card), quick: !!def.quick
        }]
    })
    const enemies = [...new Set(choices.map((c) => c.target))]
    const [enemy,
        setEnemy] = useState(enemies[0] ?? "")
    const [selection,
        setSelection] = useState<string | null>("R")
    const offered = choices.filter((c) => c.target === enemy)
    const selected = offered.find((c) => c.key === selection)
    const totalCost = selected?.mana !== undefined && theftCost !== undefined ? selected.mana + theftCost : undefined
    return <ActionDialog className="sylas-dialog" title="Sylas · Đoạt chiêu R" subtitle="Chọn chiêu cuối của một tướng địch" onClose={p.onClose} footer={<>
        <span className="sylas-team-mana"><GameIcon name="diamond" />Mana đội <b>{p.view.teamMana[side]}/{p.view.rules.teamManaMax ?? 200}</b></span>
        <button className="action-primary" disabled={!selected} onClick={() => selected && p.onConfirm(selected.action)}><GameIcon name="chain" />{stealToHand ? "Cướp chiêu" : "Đoạt và tung R"}{(stealToHand ? theftCost : totalCost) !== undefined ? ` · ${stealToHand ? theftCost : totalCost} mana` : ""}</button>
    </>}>
        <div className="sylas-stage"><div className="sylas-portrait-column"><ArtFrame kind="icon" width={320} height={320} image="/heroes-square/sylas.jpg" className="sylas-portrait-art" label="Sylas" /><ArtFrame kind="name" width={320} height={110} className="sylas-nameplate"><span>Sylas</span></ArtFrame></div><div className="sylas-spell-choice">
            <div className="action-enemies" aria-label="Tướng địch có thể cướp chiêu">{enemies.map((id) => {
                const u = p.view.units[id]
                return <button key={id} aria-label={`Chọn R của ${cg.getHero(u.hero)?.name ?? u.hero}`} aria-pressed={enemy === id} onClick={() => { setEnemy(id); setSelection("R") }}><ArtFrame kind="icon" width={100} height={100} image={`/heroes-square/${u.hero}.jpg`} className="sylas-enemy-portrait"><span className="sylas-enemy-name">{cg.getHero(u.hero)?.name}</span></ArtFrame></button>
            })}</div>
            <div className="action-grid single">{offered.map((c) => <button className={`action-option${selection === c.key ? " selected" : ""}`} key={c.key} aria-pressed={selection === c.key} onClick={() => setSelection(c.key)}>
                <div className="sylas-spell-heading"><ArtFrame kind="icon" width={128} height={128} image={`/card_skills/${c.hero}_${c.key.toLowerCase()}.png`} /><ArtFrame kind="name" width="100%" height={128}><b>R · {c.name.replace(/^Chiêu Đoạt:\s*/,
                    "")}</b></ArtFrame></div>
                <ArtFrame kind="panel" width="100%" height={400} className="sylas-desc-frame" contentClassName="sylas-spell-copy"><span className="action-cost">Mana gốc: {c.mana ?? "Theo chiêu"}{c.mana !== undefined ? " mana" : ""}</span>
                    <span className={`sylas-cast-mode ${stealToHand ? "temporary" : "immediate"}`}>{stealToHand ? "LÁ TẠM" : "THI TRIỂN NGAY"}</span>{c.quick ? <span className="sylas-cast-mode">Quick · giữ điều kiện phản ứng</span> : null}<span className="action-copy">{c.desc}</span></ArtFrame>
            </button>)}</div>
        </div><aside className="sylas-rule-stack"><ArtFrame kind="panel" width={280} height={190} contentClassName="sylas-rule-content"><GameIcon name="wand" /><b>Chỉ cướp R</b><span>Chọn chiêu cuối của một tướng địch.</span></ArtFrame><ArtFrame kind="panel" width={280} height={190} contentClassName="sylas-rule-content"><GameIcon name={stealToHand ? "cards" : "chain"} /><b>{stealToHand ? "Lá chiêu tạm" : "Đoạt và thi triển"}</b><span>{stealToHand ? "Hết hạn cuối lượt đối phương. Dùng xong biến mất." : "Sylas tung ngay chiêu đã đoạt. Không thêm lá vào tay."}</span></ArtFrame><ArtFrame kind="panel" width={280} height={190} contentClassName="sylas-rule-content"><GameIcon name="diamond" /><b>{stealToHand ? "Mana chiêu đoạt" : "Mana lần dùng này"}</b><span>{stealToHand ? `Cướp chiêu tiêu hao ${theftCost ?? "theo lá"} mana. Khi dùng lá vừa cướp, trả mana gốc của chiêu đó.` : `${theftCost ?? "Theo lá"} mana đoạt chiêu + ${selected?.mana ?? "mana gốc"}${selected?.mana !== undefined ? " mana gốc" : ""}.`}</span>{!stealToHand && totalCost !== undefined ? <strong>{totalCost} mana</strong> : null}</ArtFrame></aside></div>
        <p className="sylas-picked" role="status">{selected ? `Đã chọn R của ${cg.getHero(selected.hero)?.name ?? selected.hero}` : "Chọn một tướng địch để đoạt chiêu R."}</p>
    </ActionDialog>
}

