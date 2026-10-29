// Thẻ một tướng / vật triệu hồi trên sân và khung chú giải khi rê chuột.
import {
    useState, type CSSProperties, type MouseEvent
} from "react"
import {
    cg
} from "@starci/shared"
import {
    ELEMENT_CLS, elementName, formName, itemEmoji, itemIcon, itemName, markInfo, passiveOf, portrait, roleName, stackIcon, stackInfoV2, stackValueText, tr, unitName
} from "./helpers"
import {
    RichText
} from "../RichText"
import {
    buildEffects, FxCellView
} from "../stats/effects"
import {
    StatusFx, StatusRow, StatusTags
} from "./StatusFx"

/** Số nổi: dmg kèm loại sát thương (vật lý đỏ, phép xanh dương, chuẩn trắng), crit thêm biểu tượng chí mạng */
export interface Float { id: number; kind: "dmg" | "crit" | "heal" | "shield" | "kill" | "block" | "mana" | "tag"; text: string; dmg?: "physical" | "magic" | "true" }

/** Biểu tượng chí mạng: dấu nổ 8 cánh */
export function CritIcon() {
    return (
        <svg className="bd-crit-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 1 14.2 8.2 21.5 5 17.6 11.6 23 15 15.6 15.6 16 23 12 17 8 23 8.4 15.6 1 15 6.4 11.6 2.5 5 9.8 8.2Z" />
        </svg>
    )
}

export function Img(p: { src: string; alt?: string; className?: string; fallback?: string }) {
    const [bad,
        setBad] = useState(false)
    if (bad) return p.fallback ? <span className={`${p.className ?? ""} bd-fb`}>{p.fallback}</span> : null
    return <img src={p.src} alt={p.alt ?? ""} className={p.className} draggable={false} onError={() => setBad(true)} />
}

/** Khoá kỹ thuật của engine/đồ, không phải bộ đếm cho người chơi */
const HIDDEN_STACK = /^(once:|aura:|tc:|item:|itemT|lissFrozen$|frenzyLow$)/
/** Chữ viết tắt của tên bộ đếm/dấu: chữ đầu mỗi từ, tối đa 2 (Song Giáp -> SG) */
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0,
    2).toUpperCase()

const clampPct = (n: number) => `${Math.max(0,
    Math.min(100,
        n * 100))}%`

export function HpBar(p: { u: cg.Unit; big?: boolean }) {
    const { u } = p
    const total = Math.max(u.maxHp,
        u.hp + u.shield,
        1)
    return (
        <div className={`bd-hp ${p.big ? "big" : ""} ${u.hp / u.maxHp < 0.3 ? "low" : ""}`}>
            <i className="hp" style={{
                width: clampPct(u.hp / total)
            }} />
            {u.shield > 0 ? <i className="sh" style={{
                left: clampPct(u.hp / total), width: clampPct(u.shield / total)
            }} /> : null}
            <span>
                {Math.ceil(u.hp)}
                /
                {u.maxHp}
                {u.shield > 0 ? <b>{` +${Math.ceil(u.shield)}`}</b> : null}
            </span>
        </div>
    )
}

/** Thanh mana (pháp sư): xanh dương, vạch chia mỗi 10 mana; ẩn khi tướng không có mana */
export function ManaBar(p: { u: cg.Unit; g: cg.Game; big?: boolean }) {
    const { u, g } = p
    if (u.mana === undefined) return null
    const max = Math.max(g.maxMana(u),
        1)
    return (
        <div className={`bd-mana ${p.big ? "big" : ""}`} title={`Mana ${Math.floor(u.mana)}/${max}`}>
            <i style={{
                width: clampPct(u.mana / max)
            }} />
            <span>{`${Math.floor(u.mana)}/${max}`}</span>
        </div>
    )
}

/** Biểu tượng kiếm (CSS/SVG) cho nút đánh không cần lá của Đấu sĩ */
function SwordIcon() {
    return (
        <svg className="bd-sword-ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 3H21v6.5l-9.2 9.2-2.5-2.5zM6 14l4 4-2.2 2.2-1.3-1.3-2.4 2.4-1.5-1.5 2.4-2.4-1.3-1.3z" />
        </svg>
    )
}

/** Đòn Quick không cần lá của Đấu sĩ: nút nhỏ trên thẻ, mờ khi đã dùng trong lượt */
export interface CardlessBtn { used: boolean; ready: boolean; pct: number; onClick(): void }

/** Tướng đã chết nằm lại đường: thẻ xám, đầu lâu và đếm ngược hồi sinh; không chọn được làm mục tiêu */
export function DeadCard(p: { u: cg.Unit; round: number; onClick(): void }) {
    const { u } = p
    const t = tr()
    const left = Math.max(0,
        u.respawnRound - p.round)
    return (
        <div data-unit-id={u.id} className="bd-unit dead" onClick={p.onClick}>
            <div className="bd-art">
                <Img src={portrait(u)} className="bd-img" fallback={unitName(u).slice(0,
                    1)} />
                <span className="bd-skull" aria-hidden="true">☠</span>
                <div className="bd-name">{unitName(u)}</div>
            </div>
            <div className="bd-dead-l">
                <b>{t.deadLabel}</b>
                <small>{`${t.respawnIn} ${left} ${t.roundUnit}`}</small>
            </div>
        </div>
    )
}

export interface UnitCardProps {
    u: cg.Unit
    g: cg.Game
    turnNo: number
    mine: boolean
    cls: string
    floats: Float[]
    ownerName?: string
    soaked: boolean
    cardless?: CardlessBtn
    onEnter(e: MouseEvent): void
    onMove(e: MouseEvent): void
    onLeave(): void
    onClick(): void
}

export function UnitCard(p: UnitCardProps) {
    const { u, g } = p
    const t = tr()
    const stunned = !!u.statuses.stun
    const silenced = !!u.statuses.silence
    const role = g.role(u)
    const stacks = Object.entries(u.stacks).filter(([k,
        v]) => v > 0 && k !== "element" && !HIDDEN_STACK.test(k)) // khoá kỹ thuật không hiện; nguyên tố có huy hiệu riêng
    const element = u.stacks.element ?? 0
    const marks = (u.marks ?? []).filter((m) => m.hits > 0)
    return (
        <div
            data-unit-id={u.id}
            className={`bd-unit ${p.mine ? "mine" : "foe"} role-${role} ${u.token ? "token" : ""} ${stunned ? "stunned" : ""} ${silenced ? "silenced" : ""} ${u.statuses.stealth ? "stealthed" : ""} ${u.statuses.stasis ? "stasis" : ""} ${u.transform ? `transformed tf-${u.transform.id}` : ""} ${p.cls}`}
            onMouseEnter={p.onEnter}
            onMouseMove={p.onMove}
            onMouseLeave={p.onLeave}
            onClick={p.onClick}
        >
            <StatusRow
                u={u}
                turnNo={p.turnNo}
                extra={[...stacks.map(([k,
                    v]) => {
                    const info = stackInfoV2(k)
                    const name = info?.name ?? k
                    return {
                        key: `sk:${k}`,
                        icons: [stackIcon(k,
                            u.hero)],
                        num: stackValueText(k,
                            v),
                        tip: `${name}: ${stackValueText(k,
                            v)}${info ? `
${info.desc}` : ""}`,
                        letter: initials(name),
                    }
                }),
                ...marks.map((m, i) => {
                    const info = markInfo(m.id)
                    return {
                        key: `mk${i}`,
                        icons: [`/card_skills/${m.id.split("_")[0]}_q.png`,
                            `/card_skills/${m.id.split("_")[0]}_p.png`],
                        num: `${m.hits}`,
                        tip: `${info.name}: ${m.hits}
${info.desc}`,
                        letter: initials(info.name),
                    }
                })]}
                unitOf={(id) => {
                    const x = g.unit(id)
                    return x ? unitName(x) : undefined
                }}
            />
            <div className="bd-art">
                <Img src={portrait(u)} className="bd-img" fallback={unitName(u).slice(0,
                    1)} />
                <span className={`bd-role r-${role}`}>{roleName(role)}</span>
                {u.transform ? <span className="bd-form" title={formName(u.transform.id)}>{formName(u.transform.id)}</span> : null}
                {element > 0 ? (
                    <span className={`bd-elem el-${ELEMENT_CLS[element - 1] ?? "red"}`} title={stackInfoV2("element")?.desc}>{elementName(element)}</span>
                ) : null}
                {p.soaked ? <span className="bd-soak" title={t.soakFor} /> : null}
                {u.nextAttack.length ? <span className="bd-next" title={t.next}>{u.nextAttack.length}</span> : null}
                <StatusTags u={u} />
                <div className="bd-name">{unitName(u)}</div>
                {p.cardless ? (
                    <button
                        className={`bd-cardless ${p.cardless.used ? "used" : ""} ${p.cardless.ready ? "ready" : ""}`}
                        title={p.cardless.used ? t.cardlessUsed : t.cardlessTip}
                        disabled={!p.cardless.ready}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (p.cardless?.ready) p.cardless.onClick()
                        }}
                    >
                        <SwordIcon />
                        {`${p.cardless.pct}%`}
                    </button>
                ) : null}
            </div>
            <HpBar u={u} />
            <ManaBar u={u} g={g} />
            <div className="bd-stats">
                <span className="ad" title={t.ad}>{g.atk(u)}</span>
                <span className="ap" title={t.ap}>{g.ap(u)}</span>
                <span className="ar" title={t.armor}>{g.armor(u)}</span>
                <span className="mr" title={t.mr}>{g.mr(u)}</span>
            </div>
            {u.token ? (
                <div className="bd-owner">
                    {t.soakFor}
                    {" "}
                    <b>{p.ownerName ?? "?"}</b>
                </div>
            ) : (
                <div className="bd-items">
                    {[0,
                        1,
                        2].map((i) => {
                        const id = u.items[i]
                        return (
                            <span key={i} className={`bd-item ${id ? "full" : ""}`}>
                                {id ? <Img src={itemIcon(id)} fallback={itemEmoji(id)} /> : null}
                            </span>
                        )
                    })}
                </div>
            )}
            <StatusFx u={u} />
            <div className="bd-floats">
                {p.floats.map((f) => (
                    <span key={f.id} className={`bd-float ${f.kind}${f.dmg ? ` ${f.dmg}` : ""}`} style={{
                        "--dx": `${(f.id % 5) * 8 - 16}px`
                    } as CSSProperties}>{f.kind === "crit" ? <CritIcon /> : null}{f.text}</span>
                ))}
            </div>
        </div>
    )
}

export function UnitTip(p: { u: cg.Unit; g: cg.Game; turnNo: number; x: number; y: number }) {
    const { u, g } = p
    const t = tr()
    const role = g.role(u)
    const passive = passiveOf(u,
        g)
    const W = 280
    const left = p.x + 18 + W > window.innerWidth ? p.x - 18 - W : p.x + 18
    const top = Math.max(8,
        Math.min(p.y - 20,
            window.innerHeight - 380))
    const fx = buildEffects(u,
        p.turnNo,
        (id) => g.unit(id))
    return (
        <div className="bd-tip" style={{
            left, top, width: W
        }}>
            <div className="bd-tip-h">
                <Img src={portrait(u)} className="bd-tip-img" fallback={unitName(u).slice(0,
                    1)} />
                <div>
                    <b>{unitName(u)}</b>
                    <small>
                        {roleName(role)}
                        {u.token ? ` · ${t.token}` : ""}
                    </small>
                </div>
            </div>
            <HpBar u={u} big />
            <ManaBar u={u} g={g} big />
            <div className="bd-tip-stats">
                <span>
                    {t.ad}
                    <b>{g.atk(u)}</b>
                </span>
                <span>
                    {t.ap}
                    <b>{g.ap(u)}</b>
                </span>
                <span>
                    {t.armor}
                    <b>{g.armor(u)}</b>
                </span>
                <span>
                    {t.mr}
                    <b>{g.mr(u)}</b>
                </span>
            </div>
            {role === "fighter" && !u.token ? <p className="bd-tip-p">{t.fighterLine}</p> : null}
            {u.mana !== undefined ? <p className="bd-tip-p">{t.mageLine}</p> : null}
            {passive ? (
                <p className="bd-tip-p">
                    <b>{`${t.passive}: ${passive.name}`}</b>
                    {" "}
                    <RichText text={passive.desc} />
                </p>
            ) : null}
            {u.items.length ? (
                <ul className="bd-tip-list">
                    {u.items.map((id, i) => (
                        <li key={i}>
                            <Img src={itemIcon(id)} fallback={itemEmoji(id)} />
                            {itemName(id)}
                        </li>
                    ))}
                </ul>
            ) : null}
            {fx.cells.length ? (
                <div className="fxm-grid">
                    {fx.cells.map((c) => <FxCellView key={c.key} cell={c} />)}
                </div>
            ) : null}
        </div>
    )
}
