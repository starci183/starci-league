// Bảng chỉ số bên phải: tướng đang chọn (đồ, chỉ số, kỹ năng, hiệu ứng). Chỉ đọc từ store.
import {
    useMemo, useState, type ReactNode
} from "react"
import {
    cg, getItem
} from "@starci/shared"
import {
    gameOf, useCard, type CardView
} from "../store"
import {
    isEn, roleName, turnsLeft, unitName
} from "../board/helpers"
import {
    RichText
} from "../RichText"
import {
    buildEffects, FxCellView
} from "./effects"

type Side = cg.Side
type Unit = cg.Unit
const KEYS: cg.SkillKey[] = ["Q",
    "E",
    "R"]

/** Tướng đang xem: theo inspect, nếu không hợp lệ thì tướng đầu tiên của mình trên sân, rồi tướng đầu tiên bất kỳ */
export function inspectedUnit(view: CardView | null, inspect: string | null): Unit | undefined {
    if (!view) return undefined
    const sel = inspect ? view.units[inspect] : undefined
    if (sel && sel.status === "board") return sel
    const me: Side = view.you ?? "A"
    const onBoard = Object.values(view.units).filter((u) => u.status === "board")
    return onBoard.find((u) => u.side === me && !u.token) ?? onBoard.find((u) => !u.token) ?? onBoard[0]
}

const VI = {
    damage: "Sát thương",
    physical: "Vật lý",
    magic: "Phép",
    items: "Trang bị",
    skills: "Kỹ năng",
    passive: "Nội tại",
    effects: "Đang chịu hiệu ứng",
    none: "Không có",
    buff: "Có lợi",
    debuff: "Có hại",
    stacks: "Điểm tích",
    next: "Đòn đánh kế tiếp",
    quick: "Quick",
    chainOnly: "Chỉ nối chuỗi",
    ally: "Phe ta",
    enemy: "Phe địch",
    left: "còn",
    turns: "lượt",
    hand: "tay",
    grave: "mộ",
    deckLeft: "còn trong bộ",
    used: "đã dùng",
    owner: "Chủ",
    soak: "Che chắn cho chủ",
    overflow: "Tràn sang chủ",
    hidden: "Úp",
    token: "Vật triệu hồi",
    emptySlot: "Trống",
    free: "miễn phí",
    source: "từ",
    reserve: "Chưa có tướng trên sân",
    mana: "Mana",
    costMana: "Tốn",
    supportNote: "Gọi ra sân: lấy Q và E từ bộ lên tay.",
    mageNote: "Pháp sư: mỗi chiêu tốn mana (+10 mỗi lượt).",
    fighterNote: "Đấu sĩ: mỗi lượt đánh không cần lá 1 lần (66% sát thương).",
}
const EN: typeof VI = {
    damage: "Damage",
    physical: "Physical",
    magic: "Magic",
    items: "Items",
    skills: "Skills",
    passive: "Passive",
    effects: "Active effects",
    none: "None",
    buff: "Buff",
    debuff: "Debuff",
    stacks: "Stacks",
    next: "Next attack",
    quick: "Quick",
    chainOnly: "Chain only",
    ally: "Ally",
    enemy: "Enemy",
    left: "left",
    turns: "turns",
    hand: "hand",
    grave: "grave",
    deckLeft: "left in deck",
    used: "used",
    owner: "Owner",
    soak: "Soaks for owner",
    overflow: "Overflows to owner",
    hidden: "Face-down",
    token: "Summon",
    emptySlot: "Empty",
    free: "free",
    source: "from",
    reserve: "No champion on board",
    mana: "Mana",
    costMana: "Costs",
    supportNote: "On summon: take its Q and E from the deck into your hand.",
    mageNote: "Mage: every skill costs mana (+10 per turn).",
    fighterNote: "Fighter: one cardless attack per turn (66% damage).",
}
const T = () => (isEn() ? EN : VI)

/** Ảnh thử lần lượt các nguồn, hết thì hiện chữ */
function Pic(p: { srcs: string[]; cls: string; letter: string; pos?: string }) {
    const [i,
        setI] = useState(0)
    if (i >= p.srcs.length) return <span className={`${p.cls} us-letter`}>{p.letter}</span>
    return (
        <img
            className={p.cls}
            src={p.srcs[i]}
            alt=""
            draggable={false}
            style={p.pos ? {
                objectPosition: p.pos
            } : undefined}
            onError={() => setI(i + 1)}
        />
    )
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const clampPct = (n: number) => `${Math.max(0,
    Math.min(100,
        n * 100))}%`

function HpRow(p: { u: Unit }) {
    const { u } = p
    const total = Math.max(u.maxHp,
        u.hp + u.shield,
        1)
    return (
        <div className={`us-hp ${u.hp / u.maxHp < 0.3 ? "low" : ""}`}>
            <i className="hp" style={{
                width: clampPct(u.hp / total)
            }} />
            {u.shield > 0 ? <i className="sh" style={{
                left: clampPct(u.hp / total), width: clampPct(u.shield / total)
            }} /> : null}
            <span>
                {`${Math.ceil(u.hp)} / ${u.maxHp}`}
                {u.shield > 0 ? <b>{` +${Math.ceil(u.shield)}`}</b> : null}
            </span>
        </div>
    )
}

function ManaRow(p: { u: Unit; g: cg.Game }) {
    const { u, g } = p
    if (u.mana === undefined) return null
    const max = Math.max(g.maxMana(u),
        1)
    return (
        <div className="us-mana">
            <i style={{
                width: clampPct(u.mana / max)
            }} />
            <span>{`${T().mana} ${Math.floor(u.mana)} / ${max}`}</span>
        </div>
    )
}

function Effects(p: { u: Unit; view: CardView }) {
    const t = T()
    const { u, view } = p
    const [openKey,
        setOpenKey] = useState<string | null>(null)
    const m = buildEffects(u,
        view.turnNo,
        (id) => view.units[id])
    const en = isEn()
    return (
        <>
            <section className="us-sec">
                <h4>{en ? "Effects by source" : "Nguồn hiệu ứng đang chịu"}</h4>
                {m.cells.length ? (
                    <div className="fxm-grid">
                        {m.cells.map((c) => (
                            <FxCellView
                                key={c.key}
                                cell={c}
                                popover
                                open={openKey === c.key}
                                onToggle={() => setOpenKey(openKey === c.key ? null : c.key)}
                            />
                        ))}
                    </div>
                ) : <p className="us-none">{t.none}</p>}
            </section>
        </>
    )
}

function ItemSlots(p: { u: Unit }) {
    const t = T()
    return (
        <section className="us-sec">
            <h4>{t.items}</h4>
            <div className="us-items">
                {[0,
                    1,
                    2].map((i) => {
                    const id = p.u.items[i]
                    const it = id ? getItem(id) : undefined
                    if (!id) {
                        return (
                            <div key={i} className="us-item empty">
                                <span>{t.emptySlot}</span>
                            </div>
                        )
                    }
                    const props = (it?.props ?? []).slice(1)
                    const tx = cg.itemText(id,
                        isEn() ? "en" : "vi")
                    return (
                        <div key={i} className="us-item">
                            <Pic
                                srcs={[`/card_items/${id}.png`,
                                    `/items/${id}.png`]}
                                cls="us-item-ic"
                                letter={it?.emoji ?? "?"}
                            />
                            <span className="us-item-n">{tx?.name ?? it?.name ?? id}</span>
                            <div className="us-item-tip">
                                <b>{tx?.name ?? it?.name ?? id}</b>
                                <p>{tx ? tx.stats : it ? cg.itemStatText(it) : ""}</p>
                                {tx ? (
                                    <p>
                                        <b>{`${tx.passive}: `}</b>
                                        <RichText text={tx.desc} />
                                        {tx.counter ? ` (${p.u.stacks[`item:${id}`] ?? 0}/${tx.counter.max})` : ""}
                                    </p>
                                ) : props.map((x, k) => (
                                    <p key={k}>
                                        <b>{`${x.name}: `}</b>
                                        <RichText text={x.desc} />
                                    </p>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

/** Mana cơ bản của một chiêu (số cố định; chiêu tính động thì không hiện) */
function manaCostOfSkill(g: cg.Game, u: Unit, def: cg.SkillDef): number | "all" | undefined {
    const raw = def.mana
    if (typeof raw === "function") return undefined
    return raw ?? cg.RULES.mage.defaultCost[def.key as cg.SkillKey]
}

function copiesLine(view: CardView, u: Unit, key: cg.SkillKey, total: number): string {
    const t = T()
    const id = `${u.hero}_${key.toLowerCase()}`
    const isMine = (c: cg.Card) => c.kind === "skill" && c.id === id && (c.side ?? u.side) === u.side
    const grave = (["A",
        "B"] as Side[]).reduce((n, s) => n + view.players[s].grave.filter(isMine).length,
        0)
    if (view.you === u.side) {
        const hand = (view.players[u.side].hand ?? []).filter(isMine).length
        return `${key} ${total} · ${t.hand} ${hand} · ${t.grave} ${grave} · ${t.deckLeft} ${Math.max(0,
            total - hand - grave)}`
    }
    return `${key} ${total} · ${t.used} ${grave}`
}

function Skills(p: { u: Unit; g: cg.Game; view: CardView }) {
    const t = T()
    const { u, g, view } = p
    const h = cg.getHero(u.hero)
    if (!h) return null
    const en = isEn() ? cg.HERO_EN[u.hero] : undefined
    const text = (s: string) => {
        try {
            return cg.formulaText(s,
                g,
                u)
        } catch {
            return s
        }
    }
    const pas = en?.passive ?? h.passive
    const role = g.role(u)
    return (
        <section className="us-sec">
            <h4>{t.skills}</h4>
            {role === "support" ? <p className="us-note">{t.supportNote}</p> : null}
            {u.mana !== undefined ? <p className="us-note">{t.mageNote}</p> : null}
            {role === "fighter" ? <p className="us-note">{t.fighterNote}</p> : null}
            <div className="us-skill passive">
                <Pic srcs={[`/card_skills/${u.hero}_p.png`]} cls="us-sk-ic" letter="P" />
                <div className="us-sk-b">
                    <div className="us-sk-h">
                        <b>{`${t.passive}: ${pas.name}`}</b>
                    </div>
                    <RichText className="us-rich" text={text(pas.desc)} />
                </div>
            </div>
            {KEYS.map((k) => {
                const def = h.skills[k]
                const e = en?.skills[k]
                const total = view.rules.skillCopies[k]
                const cost = u.mana !== undefined ? manaCostOfSkill(g,
                    u,
                    def) : undefined
                return (
                    <div key={k} className="us-skill">
                        <Pic srcs={[`/card_skills/${u.hero}_${k.toLowerCase()}.png`]} cls="us-sk-ic" letter={k} />
                        <div className="us-sk-b">
                            <div className="us-sk-h">
                                <i className="us-key">{k}</i>
                                <b>{e?.name ?? def.name}</b>
                                {def.quick ? <span className="us-tag q">{t.quick}</span> : null}
                                {def.chainOnly ? <span className="us-tag c">{t.chainOnly}</span> : null}
                                {cost !== undefined ? <span className="us-tag m">{cost === "all" ? "Toàn bộ mana" : `${t.costMana} ${cost} mana`}</span> : null}
                            </div>
                            <div className="us-copies">{copiesLine(view,
                                u,
                                k,
                                total)}</div>
                            <RichText className="us-rich" text={text(e?.desc ?? def.desc)} />
                        </div>
                    </div>
                )
            })}
        </section>
    )
}

function TokenInfo(p: { u: Unit; view: CardView }) {
    const t = T()
    const { u, view } = p
    const k = u.token!
    const owner = k.ownerId ? view.units[k.ownerId] : undefined
    return (
        <section className="us-sec">
            <h4>{t.token}</h4>
            <div className="us-chips">
                {owner ? (
                    <span className="us-chip">
                        {`${t.owner}: `}
                        <b>{unitName(owner)}</b>
                    </span>
                ) : null}
                {k.soak ? <span className="us-chip">{t.soak}</span> : null}
                {k.overflow ? <span className="us-chip">{t.overflow}</span> : null}
                {k.expires ? <span className="us-chip">{`${t.left} ${turnsLeft(k.expires,
                    view.turnNo)} ${t.turns}`}</span> : null}
            </div>
        </section>
    )
}

export function UnitPanel() {
    const snap = useCard()
    const { view } = snap
    const t = T()
    const u = inspectedUnit(view,
        snap.inspect)
    const g = useMemo(() => (view ? gameOf(view) : null),
        [view])
    if (!view || !g) return <div className="us-root" />
    if (!u) {
        return (
            <div className="us-root">
                <p className="us-none">{t.reserve}</p>
            </div>
        )
    }
    const me: Side = view.you ?? "A"
    const mine = u.side === me
    const st = g.stats(u)
    const role = g.role(u)
    const tok = u.token
    const dmgKind = tok ? tok.damage : g.hero(u).damage
    const faceDown = !!tok?.hidden && !mine
    const art = tok ? [`/card_tokens/${tok.id}.png`,
        `/ui/fx/${tok.id}.png`] : [`/heroes/${u.hero}.jpg`]
    const row = (label: string, value: string | number, cls = "") => (
        <div key={label} className={`us-st ${cls}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    )
    const en = isEn()
    const grid: ReactNode[] = [
        row("AD",
            g.atk(u),
            "ad"),
        row("AP",
            g.ap(u),
            "ap"),
        row(en ? "Armor" : "Giáp",
            g.armor(u),
            "ar"),
        row(en ? "MR" : "KPhép",
            g.mr(u),
            "mr"),
    ]
    if (!tok) {
        const extra: [string, number, boolean][] = [
            [en ? "Crit" : "Chí mạng",
                st.crit,
                true],
            [en ? "Crit dmg" : "ST chí mạng",
                st.crit > 0 || st.critDmg > 0 ? cg.RULES.critBase + st.critDmg : 0,
                true],
            [en ? "Lifesteal" : "Hút máu",
                st.lifesteal,
                true],
            [en ? "Omnivamp" : "Hút máu toàn",
                st.omnivamp,
                true],
            [en ? "Lethality" : "Xuyên giáp",
                st.lethality,
                false],
            [en ? "Magic pen" : "Xuyên phép",
                st.magicPen,
                false],
            [en ? "AD mult" : "% AD",
                st.atkMult,
                true],
            [en ? "Spell amp" : "Khuếch đại phép",
                st.spellAmp,
                true],
            [en ? "Dmg amp" : "Tăng ST",
                st.dmgAmp,
                true],
            [en ? "Bonus HP" : "Máu thêm",
                st.hp,
                false],
        ]
        for (const [label,
            v,
            isPct] of extra) {
            if (v) grid.push(row(label,
                isPct ? pct(v) : Math.round(v),
                "x"))
        }
    }
    return (
        <div className={`us-root ${mine ? "mine" : "foe"}`}>
            <header className="us-head">
                {faceDown ? (
                    <span className="us-portrait us-back" />
                ) : (
                    <Pic srcs={art} cls="us-portrait" letter={unitName(u).slice(0,
                        1)} pos="50% 12%" />
                )}
                <div className="us-id">
                    <h3>{faceDown ? t.hidden : unitName(u)}</h3>
                    {faceDown ? null : (
                        <div className="us-meta">
                            <span className={`us-role r-${role}`}>{roleName(role)}</span>
                            <span>{`${t.damage}: ${dmgKind === "magic" ? t.magic : t.physical}`}</span>
                            <span className={mine ? "ally" : "enemy"}>{mine ? t.ally : t.enemy}</span>
                        </div>
                    )}
                    <HpRow u={u} />
                    <ManaRow u={u} g={g} />
                </div>
            </header>
            {faceDown ? null : (
                <div className="us-scroll">
                    <div className="us-grid">{grid}</div>
                    {tok ? (
                        <>
                            <TokenInfo u={u} view={view} />
                            <Effects u={u} view={view} />
                        </>
                    ) : (
                        <>
                            <ItemSlots u={u} />
                            <Effects u={u} view={view} />
                            <Skills u={u} g={g} view={view} />
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
