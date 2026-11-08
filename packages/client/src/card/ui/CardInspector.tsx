import {
    cg
} from "@starci/shared"
import {
    CardFace
} from "../anim/CardFace"
import {
    actionsForHandCard, gameOf, manaCostOf, useCard, type CardView
} from "../store"
import {
    RichText
} from "../RichText"
import {
    isEn, unitName
} from "../board/helpers"
import {
    inspectionActions, type CardInspectionContext
} from "./inspection"
import {
    GameIcon
} from "./GameIcon"
import "./inspector-dna.css"

export function CardInspector(p: { card: cg.Card; context: CardInspectionContext; view: CardView; dismissible?: boolean }) {
    const { card, context, view } = p
    const { legal, log } = useCard()
    const en = isEn()
    const g = gameOf(view)
    const side = context.side ?? card.side ?? (context.actor ? view.units[context.actor]?.side : undefined) ?? view.you ?? "A"
    const actor = context.actor ? view.units[context.actor] : card.hero ? view.units[`${card.side ?? side}:${card.hero}`] : undefined
    let info = {
        name: card.id, desc: "", type: card.kind as string
    }
    try { info = cg.cardInfoL(g,
        card,
        actor) } catch { /* Unknown cards still show their public identity. */ }
    const cost = manaCostOf(g,
        {
            ...card, side
        })
    const def = cg.skillOfCard(card,
        actor?.hero)
    const trigger = context.source === "reaction" ? view.chain?.links.at(-1)?.trigger ?? context.trigger : context.trigger
    const start = [...log].reverse().find((entry) => entry.e.t === "chainAdd" && entry.e.n === 1)?.n ?? 0
    const cancelled = context.cancelled || (context.source === "chain" && log.some((entry) => entry.n > start && entry.e.t === "chainCancel" && entry.e.n === context.link && entry.e.card?.uid === card.uid))
    const valid = context.source === "reaction" && actionsForHandCard(legal,
        view.players[side].hand ?? [],
        card).some((a) => a.t === "chain")
    const countIn = (cards: cg.Card[]) => cards.filter((c) => c.id === card.id && c.hero === card.hero && c.item === card.item && c.copyOf === card.copyOf && !c.temp).length
    const hand = view.players[side].hand
    const deck = view.you === side ? view.players[side].deckSummary?.filter((e) => e.card.id === card.id && e.card.hero === card.hero && e.card.item === card.item && e.card.copyOf === card.copyOf).reduce((n, e) => n + e.count,
        0) : undefined
    const owner = view.names[side]
    const availableMana = g.teamManaOf(side)
    const manaShortfall = Math.max(0,
        (cost ?? 0) - availableMana)
    const titleSeparator = info.name.indexOf(": ")
    const titleOwner = titleSeparator > 0 ? info.name.slice(0,
        titleSeparator) : undefined
    const titleName = titleSeparator > 0 ? info.name.slice(titleSeparator + 2) : info.name
    const description = info.desc.replace(/\{(-?\d+(?:\.\d+)?)\}/g,
        "$1")
    const targetLabels: Record<cg.TargetKind, string> = en ? {
        none: "No target", self: "Self", all_enemies: "All enemies", all_allies: "All allies", opposite: "Opposite enemy", enemy: "Enemy", ally: "Ally", ally_other: "Other ally", enemies_upto: "Select enemies", allies_upto: "Select allies", lane: "Lane"
    } : {
        none: "Không chọn mục tiêu", self: "Bản thân", all_enemies: "Mọi tướng địch", all_allies: "Mọi đồng minh", opposite: "Địch đối diện", enemy: "Tướng địch", ally: "Đồng minh", ally_other: "Đồng minh khác", enemies_upto: "Chọn các tướng địch", allies_upto: "Chọn các đồng minh", lane: "Đường"
    }
    const targeting = def && !def.options ? (Array.isArray(def.target) ? def.target : [def.target]).map((target) => targetLabels[target]).join(" / ") : undefined
    const nameOf = (id: string) => view.units[id] ? unitName(view.units[id]) : id
    const labels: Record<CardInspectionContext["source"], string> = en ? {
        hand: "Hand", chain: "Chain link", reaction: "Response", deck: "Deck", grave: "Graveyard"
    } : {
        hand: "Trên tay", chain: "Mắt xích", reaction: "Phản ứng", deck: "Bộ bài", grave: "Mộ bài"
    }
    const collection = context.source === "deck" || context.source === "grave"
    const contextInfo = <dl className="ci-context">
        {def ? <div className="ci-activation"><dt>{en ? "Activation" : "Kích hoạt"}</dt><dd>{def.chainOnly ? (en ? "Response only" : "Chỉ nối chuỗi") : def.quick ? (en ? "Skill / valid response" : "Tung chiêu / Phản ứng hợp lệ") : (en ? "Cast skill" : "Tung chiêu")}</dd></div> : null}
        {targeting ? <div className="ci-target"><dt>{en ? "Target" : "Mục tiêu"}</dt><dd>{targeting}</dd></div> : null}
        <div><dt>{en ? "Owner" : "Chủ lá"}</dt><dd>{owner}</dd></div>
        {actor ? <div><dt>{en ? "Caster" : "Người dùng"}</dt><dd>{unitName(actor)}{actor.status !== "board" ? ` · ${actor.status === "reserve" ? (en ? "not summoned" : "chưa gọi") : (en ? "fallen" : "đã bị hạ")}` : ""}</dd></div> : null}
        {context.targets?.length ? <div><dt>{en ? "Targets" : "Mục tiêu"}</dt><dd>{context.targets.map(nameOf).join(", ")}</dd></div> : null}
        {cancelled ? <div><dt>{en ? "State" : "Trạng thái"}</dt><dd>{en ? "Cancelled — no effect" : "Vô hiệu — không phát hiệu ứng"}</dd></div> : null}
        {context.count !== undefined ? <div><dt>{en ? "Copies here" : "Số lá tại đây"}</dt><dd>{context.count}</dd></div> : null}
    </dl>
    return <section className="ci-root" aria-label={en ? "Card details" : "Thông tin lá bài"} data-inspector-card={card.id}>
        <header className="ci-head"><span>{labels[context.source]}{context.link ? ` · #${context.link}` : ""}</span>{p.dismissible === false ? null : <button type="button" onClick={inspectionActions.clear} aria-label={en ? "Back to champion" : "Trở lại tướng"}>×</button>}</header>
        <div className="ci-identity">
            <div className="ci-art ci-playing-card"><CardFace card={card} name={info.name} /></div>
            <div className="ci-identity-copy">
                {titleOwner ? <p className="ci-title-owner">{titleOwner}</p> : null}
                <h3 className="ci-card-title" title={info.name}>{titleName}</h3>
                <div className="ci-meta"><span>{({
                    skill: en ? "Skill" : "Chiêu", support: en ? "Support" : "Hỗ trợ", wild: en ? "Wild" : "Chiêu chung", special: en ? "Special" : "Đặc biệt"
                } as Record<string, string>)[info.type] ?? info.type}</span>{def?.quick ? <span>Quick</span> : null}{def?.chainOnly ? <span>{en ? "Chain only" : "Chỉ nối chuỗi"}</span> : null}{card.temp ? <span>{en ? "Temporary" : "Lá tạm"}</span> : null}</div>
            </div>
        </div>
        {cost !== undefined ? <div className={`ci-mana${manaShortfall ? " insufficient" : ""}`}>
            <GameIcon name="diamond" /><strong>{cost}<small> MANA</small></strong>
            <span>{en ? "Team pool" : "Quỹ mana đội"}<b>{availableMana} / {cg.RULES.teamManaMax}</b></span>
            {manaShortfall ? <em>{en ? `Missing ${manaShortfall} mana` : `Thiếu ${manaShortfall} mana`}</em> : null}
        </div> : null}
        {!collection ? contextInfo : null}
        <h4 className="ci-effect-title"><GameIcon name="spark" />{en ? "Effect" : "Hiệu ứng"}</h4>
        <RichText className="ci-description" text={description} />
        {collection ? contextInfo : null}
        {actor?.status === "reserve" ? <p className="ci-unavailable">{unitName(actor)} {en ? "has not been summoned" : "chưa được triệu hồi"}</p> : null}
        {trigger ? <section className="ci-condition"><h4>{en ? "Response context" : "Ngữ cảnh phản ứng"}</h4><p>{trigger.kind === "attack" ? (en ? "Responding to an attack" : "Phản ứng trước đòn đánh") : trigger.kind === "support" ? (en ? "Responding to a support card" : "Phản ứng trước lá hỗ trợ") : (en ? "Responding to a skill" : "Phản ứng trước chiêu")}{trigger.actor ? ` · ${nameOf(trigger.actor)}` : ""}{trigger.target ? ` → ${nameOf(trigger.target)}` : ""}</p>{valid ? <p>{en ? "This card meets the response conditions in the current situation." : "Lá này đáp ứng điều kiện phản ứng trong tình huống hiện tại."}</p> : null}</section> : null}
        <div className="ci-copies">{hand ? <span>{en ? "Hand" : "Tay"}: {countIn(hand)}</span> : null}<span>{en ? "Grave" : "Mộ"}: {countIn(view.players[side].grave)}</span>{deck !== undefined ? <span>{en ? "Deck" : "Bộ"}: {deck}</span> : null}</div>
        {card.frozen ? <p>{en ? "Frozen: cannot be played until thawed." : "Hoá Băng: không đánh được tới khi tan băng."}</p> : null}
        {card.temp ? <p>{en ? "Disappears at the end of the turn if unused." : "Biến mất cuối lượt nếu chưa dùng."}</p> : null}
    </section>
}
