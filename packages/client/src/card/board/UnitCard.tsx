// Thẻ một tướng / vật triệu hồi trên sân và khung chú giải khi rê chuột.
import {
    useState, type CSSProperties, type MouseEvent
} from "react"
import {
    cg
} from "@starci/shared"
import {
    itemEmoji, itemIcon, itemName, passiveOf, portrait, roleName, statusIcon, statusInfo, tr, turnsLeft, unitName
} from "./helpers"
import {
    StatusFx, StatusRow, StatusTags
} from "./StatusFx"

export interface Float { id: number; kind: "dmg" | "crit" | "heal" | "shield" | "kill" | "block"; text: string }

export function Img(p: { src: string; alt?: string; className?: string; fallback?: string }) {
    const [bad,
        setBad] = useState(false)
    if (bad) return p.fallback ? <span className={`${p.className ?? ""} bd-fb`}>{p.fallback}</span> : null
    return <img src={p.src} alt={p.alt ?? ""} className={p.className} draggable={false} onError={() => setBad(true)} />
}

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

export interface UnitCardProps {
    u: cg.Unit
    g: cg.Game
    turnNo: number
    mine: boolean
    cls: string
    floats: Float[]
    ownerName?: string
    soaked: boolean
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
    const stacks = Object.entries(u.stacks).filter(([, v]) => v > 0)
    return (
        <div
            data-unit-id={u.id}
            className={`bd-unit ${p.mine ? "mine" : "foe"} role-${role} ${u.token ? "token" : ""} ${stunned ? "stunned" : ""} ${silenced ? "silenced" : ""} ${u.statuses.stealth ? "stealthed" : ""} ${p.cls}`}
            onMouseEnter={p.onEnter}
            onMouseMove={p.onMove}
            onMouseLeave={p.onLeave}
            onClick={p.onClick}
        >
            <StatusRow
                u={u}
                turnNo={p.turnNo}
                unitOf={(id) => {
                    const x = g.unit(id)
                    return x ? unitName(x) : undefined
                }}
            />
            <div className="bd-art">
                <Img src={portrait(u)} className="bd-img" fallback={unitName(u).slice(0,
                    1)} />
                <span className={`bd-role r-${role}`}>{roleName(role)}</span>
                {stunned ? <span className="bd-banner">{t.stunned}</span> : silenced ? <span className="bd-banner sil">{t.silenced}</span> : null}
                {p.soaked ? <span className="bd-soak" title={t.soakFor} /> : null}
                {stacks.length ? (
                    <span className="bd-stacks">
                        {stacks.map(([k,
                            v]) => <b key={k} title={k}>{v}</b>)}
                    </span>
                ) : null}
                {u.nextAttack.length ? <span className="bd-next" title={t.next}>{u.nextAttack.length}</span> : null}
                <StatusTags u={u} />
                <div className="bd-name">{unitName(u)}</div>
            </div>
            <HpBar u={u} />
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
                    <span key={f.id} className={`bd-float ${f.kind}`} style={{
                        "--dx": `${(f.id % 5) * 8 - 16}px`
                    } as CSSProperties}>{f.text}</span>
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
    const st = Object.entries(u.statuses)
    const stacks = Object.entries(u.stacks).filter(([, v]) => v !== 0)
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
            {passive ? (
                <p className="bd-tip-p">
                    <b>{`${t.passive}: ${passive.name}`}</b>
                    {" "}
                    {passive.desc}
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
            {st.length ? (
                <ul className="bd-tip-list">
                    {st.map(([id,
                        s]) => (
                        <li key={id}>
                            <Img src={statusIcon(id)} fallback={statusInfo(id).name.slice(0,
                                2)} />
                            <span>
                                <b>{statusInfo(id).name}</b>
                                {` (${t.turnsLeft} ${turnsLeft(s.until,
                                    p.turnNo)} ${t.turnsUnit}${s.v ? `, ${s.v}` : ""})`}
                                {statusInfo(id).desc ? <small>{statusInfo(id).desc}</small> : null}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {stacks.length ? (
                <p className="bd-tip-p">
                    <b>{`${t.stacks}: `}</b>
                    {stacks.map(([k,
                        v]) => `${k} ${v}`).join(", ")}
                </p>
            ) : null}
            {u.nextAttack.length ? (
                <p className="bd-tip-p">
                    <b>{`${t.next}: `}</b>
                    {u.nextAttack.map((n) => `${n.id}${n.free ? ` (${t.free})` : ""}${n.mult ? ` x${n.mult}` : ""}${n.bonusRaw ? ` +${n.bonusRaw}` : ""}`).join(", ")}
                </p>
            ) : null}
        </div>
    )
}
