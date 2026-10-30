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
    const nameOf = (id: string) => view.units[id] ? unitName(view.units[id]) : id
    const labels: Record<CardInspectionContext["source"], string> = en ? {
        hand: "Hand", chain: "Chain link", reaction: "Response", deck: "Deck", grave: "Graveyard"
    } : {
        hand: "Trên tay", chain: "Mắt xích", reaction: "Phản ứng", deck: "Bộ bài", grave: "Mộ bài"
    }
    return <section className="ci-root" aria-label={en ? "Card details" : "Thông tin lá bài"} data-inspector-card={card.id}>
        <header className="ci-head"><span>{labels[context.source]}{context.link ? ` · #${context.link}` : ""}</span>{p.dismissible === false ? null : <button type="button" onClick={inspectionActions.clear} aria-label={en ? "Back to champion" : "Trở lại tướng"}>×</button>}</header>
        <div className="ci-art"><CardFace card={card} name={info.name} /></div>
        <h3>{info.name}</h3>
        <div className="ci-meta"><span>{({
            skill: en ? "Skill" : "Chiêu", support: en ? "Support" : "Hỗ trợ", wild: en ? "Wild" : "Chiêu chung", special: en ? "Special" : "Đặc biệt"
        } as Record<string, string>)[info.type] ?? info.type}</span>{def?.quick ? <span>Quick</span> : null}{def?.chainOnly ? <span>{en ? "Chain only" : "Chỉ nối chuỗi"}</span> : null}{card.temp ? <span>{en ? "Temporary" : "Lá tạm"}</span> : null}</div>
        <dl className="ci-context">
            <div><dt>{en ? "Owner" : "Chủ lá"}</dt><dd>{owner}</dd></div>
            {actor ? <div><dt>{en ? "Caster" : "Người dùng"}</dt><dd>{unitName(actor)}{actor.status !== "board" ? ` · ${actor.status === "reserve" ? (en ? "not summoned" : "chưa gọi") : (en ? "fallen" : "đã bị hạ")}` : ""}</dd></div> : null}
            {context.targets?.length ? <div><dt>{en ? "Targets" : "Mục tiêu"}</dt><dd>{context.targets.map(nameOf).join(", ")}</dd></div> : null}
            {cost !== undefined ? <div><dt>{en ? "Team mana" : "Mana đội"}</dt><dd>{en ? `Costs ${cost} · Available ${g.teamManaOf(side)} / ${cg.RULES.teamManaMax}` : `Tốn ${cost} · Quỹ đội ${g.teamManaOf(side)} / ${cg.RULES.teamManaMax}`}</dd></div> : null}
            {cancelled ? <div><dt>{en ? "State" : "Trạng thái"}</dt><dd>{en ? "Cancelled — no effect" : "Vô hiệu — không phát hiệu ứng"}</dd></div> : null}
            {context.count !== undefined ? <div><dt>{en ? "Copies here" : "Số lá tại đây"}</dt><dd>{context.count}</dd></div> : null}
        </dl>
        <h4 className="ci-effect-title"><GameIcon name="spark" />{en ? "Effect" : "Hiệu ứng"}</h4>
        <RichText className="ci-description" text={info.desc} />
        {actor?.status === "reserve" ? <p className="ci-unavailable">{unitName(actor)} {en ? "has not been summoned" : "chưa được triệu hồi"}</p> : null}
        {trigger ? <section className="ci-condition"><h4>{en ? "Response context" : "Ngữ cảnh phản ứng"}</h4><p>{trigger.kind === "attack" ? (en ? "Responding to an attack" : "Phản ứng trước đòn đánh") : trigger.kind === "support" ? (en ? "Responding to a support card" : "Phản ứng trước lá hỗ trợ") : (en ? "Responding to a skill" : "Phản ứng trước chiêu")}{trigger.actor ? ` · ${nameOf(trigger.actor)}` : ""}{trigger.target ? ` → ${nameOf(trigger.target)}` : ""}</p>{valid ? <p>{en ? "This card meets the response conditions in the current situation." : "Lá này đáp ứng điều kiện phản ứng trong tình huống hiện tại."}</p> : null}</section> : null}
        <div className="ci-copies">{hand ? <span>{en ? "Hand" : "Tay"}: {countIn(hand)}</span> : null}<span>{en ? "Grave" : "Mộ"}: {countIn(view.players[side].grave)}</span>{deck !== undefined ? <span>{en ? "Deck" : "Bộ"}: {deck}</span> : null}</div>
        {card.frozen ? <p>{en ? "Frozen: cannot be played until thawed." : "Hoá Băng: không đánh được tới khi tan băng."}</p> : null}
        {card.temp ? <p>{en ? "Disappears at the end of the turn if unused." : "Biến mất cuối lượt nếu chưa dùng."}</p> : null}
    </section>
}
