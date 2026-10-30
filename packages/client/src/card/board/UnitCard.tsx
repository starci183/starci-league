// Thẻ một tướng / vật triệu hồi trên sân và khung chú giải khi rê chuột.
import {
    useState, type CSSProperties, type MouseEvent
} from "react"
import {
    cg
} from "@starci/shared"
import {
    ELEMENT_CLS, elementName, formName, isEn, itemEmoji, itemIcon, itemName, markInfo, passiveOf, portrait, roleName, stackIcon, stackInfoV2, stackValueText, statusIcon, tr, unitName
} from "./helpers"
import {
    RichText
} from "../RichText"
import {
    buildEffects, FxCellView
} from "../stats/effects"
import {
    StatusFx, StatusRow, StatusTags, type ExtraCell
} from "./StatusFx"
import {
    GameIcon
} from "../ui/GameIcon"

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

/** Dấu do đồ của tướng khác đặt lên `u` (lưu trong stacks kỹ thuật `itemT:<khoá>:<id mục tiêu>` của người đeo): hiện thành ô icon có giải thích */
const ITEM_MARKS: { key: string; item: string; vi: string; en: string; letter: string }[] = [
    {
        key: "ash", item: "mat_na_liandry", vi: "Tro Tàn (Liandry): đầu lượt mất 3% máu tối đa", en: "Ashes (Liandry): loses 3% max HP at turn start", letter: "Tr"
    },
    {
        key: "hex", item: "sung_hextech", vi: "Dấu Hextech: đòn đánh đầu tiên lên tướng này lượt này gây thêm sát thương phép", en: "Hextech mark: the first attack on it this turn deals bonus magic damage", letter: "Hx"
    },
    {
        key: "abyss", item: "khien_hu_vo", vi: "Khai Thác Điểm Yếu: lá chiêu kế tiếp của đồng minh người đeo bỏ qua 15 Kháng phép", en: "Exploit Weakness: the next skill card of the wearer's ally ignores 15 MR", letter: "Kp"
    },
]
function itemMarkCells(u: cg.Unit, g: cg.Game): ExtraCell[] {
    const en = isEn()
    const out: ExtraCell[] = []
    for (const w of Object.values(g.s.units)) {
        if (w.id === u.id) continue
        for (const m of ITEM_MARKS) {
            const v = w.stacks[`itemT:${m.key}:${u.id}`] ?? 0
            // ash: số lượt còn lại; hex: lượt đặt (chỉ hiệu lực trong lượt đó); abyss: mốc hết hạn
            if (m.key === "ash" ? v <= 0 : m.key === "hex" ? v !== g.s.turnNo : v < g.s.turnNo) continue
            out.push({
                key: `im:${m.key}:${w.id}`, icons: [itemIcon(m.item)], num: "", tip: `${en ? m.en : m.vi} · ${unitName(w)}`, letter: m.letter
            })
        }
    }
    return out
}

/** Icon Khiên trong hàng hiệu ứng: mỗi loại Khiên đang có 1 ô (trắng: mọi sát thương, vàng: vật lý, xanh dương: phép) */
function shieldCells(u: cg.Unit): ExtraCell[] {
    const en = isEn()
    const rows: [string, number, string, string][] = [["sh-all",
        u.shield,
        en ? "Shield: blocks all damage, including true damage" : "Khiên trắng: chặn mọi loại sát thương, kể cả sát thương chuẩn",
        "K"],
    ["sh-phys",
        u.shieldPhys ?? 0,
        en ? "Physical shield: blocks physical damage only" : "Khiên vật lý: chỉ chặn sát thương vật lý",
        "KV"],
    ["sh-magic",
        u.shieldMagic ?? 0,
        en ? "Magic shield: blocks magic damage only" : "Khiên phép: chỉ chặn sát thương phép",
        "KP"]]
    return rows.filter(([, v]) => v > 0).map(([cls,
        v,
        tip,
        letter]) => ({
        key: cls, cls, icons: [statusIcon("shield")], num: `${Math.ceil(v)}`, tip: `${tip}: ${Math.ceil(v)}`, letter
    }))
}

export function HpBar(p: { u: cg.Unit; big?: boolean }) {
    const { u } = p
    // 3 loại Khiên nối sau phần máu: trắng (mọi sát thương), vàng (vật lý), xanh dương (phép)
    const parts = [["sh",
        u.shield],
    ["sh-phys",
        u.shieldPhys ?? 0],
    ["sh-magic",
        u.shieldMagic ?? 0]] as const
    const shieldTotal = parts.reduce((n, [, v]) => n + v,
        0)
    const total = Math.max(u.maxHp,
        u.hp + shieldTotal,
        1)
    let left = u.hp / total
    return (
        <div className={`bd-hp ${p.big ? "big" : ""} ${u.hp / u.maxHp < 0.3 ? "low" : ""}`}>
            <i className="hp" style={{
                width: clampPct(u.hp / total)
            }} />
            {parts.map(([cls,
                v]) => {
                if (v <= 0) return null
                const at = left
                left += v / total
                return <i key={cls} className={cls} style={{
                    left: clampPct(at), width: clampPct(v / total)
                }} />
            })}
            <span>
                {Math.ceil(u.hp)}
                /
                {u.maxHp}
                {parts.map(([cls,
                    v]) => (v > 0 ? <b key={cls} className={`t-${cls}`}>{` +${Math.ceil(v)}`}</b> : null))}
            </span>
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
                <small>{left > 0 ? `${t.respawnIn} ${left} ${t.roundUnit}` : isEn() ? "Reviving soon" : "Sắp hồi sinh"}</small>
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
                extra={[...shieldCells(u),
                    ...itemMarkCells(u,
                        g),
                    ...stacks.map(([k,
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
            <div className="bd-stats">
                <span className="ad" title={t.ad}><GameIcon name="sword" />{g.atk(u)}</span>
                <span className="ap" title={t.ap}><GameIcon name="wand" />{g.ap(u)}</span>
                <span className="ar" title={t.armor}><GameIcon name="shield" />{g.armor(u)}</span>
                <span className="mr" title={t.mr}><GameIcon name="diamond" />{g.mr(u)}</span>
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
            {!u.token ? <p className="bd-tip-p">{isEn() ? "Skills spend the team's shared mana pool." : "Các chiêu dùng chung quỹ mana của đội."}</p> : null}
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
