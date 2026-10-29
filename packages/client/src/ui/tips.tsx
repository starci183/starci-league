// Nội dung tooltip kiểu LoL cho tướng, chiêu, đồ, lá bài (đặt trong TooltipContent của shadcn).
import {
    CARDS, RESOURCES, ROLE_INFO, SKILLS, STATUS_INFO, allBuffs, apOf, armorOf, atkOf, getHero, getItem, heroOf, keywordById, mrOf,
    areaCells, rangeOf, skillCost, statsOf, t, type AreaShape, type StatusId, type UnitLike,
} from "@starci/shared"
import {
    Glossary, Rich
} from "./Rich"

/** Đồ của tướng thành mảng (state chỉ có forEach) */
export const unitItems = (u: UnitLike) => { const out: string[] = []; u.items.forEach((id) => out.push(id)); return out }
const pct = (a: number, b: number) => `${Math.max(0,
    Math.min(100,
        (a / Math.max(1,
            b)) * 100))}%`

/** Thanh máu kiểu LoL: máu (xanh/vàng/đỏ) + khiên trắng nối sau; tổng vượt máu tối đa thì cả thanh co lại */
export function HpBar({ u }: { u: UnitLike }) {
    const total = Math.max(u.maxHp,
            u.hp + u.shield), pct = u.hp / Math.max(1,
            u.maxHp)
    const color = pct > 0.5 ? "bg-emerald-500" : pct > 0.25 ? "bg-amber-400" : "bg-red-500"
    return (
        <div className="flex h-2.5 overflow-hidden rounded-sm bg-black/70 ring-1 ring-black">
            <div className={color} style={{
                width: `${(u.hp / total) * 100}%`
            }} />
            {u.shield > 0 && <div className="bg-[#f4f4f8]" style={{
                width: `${(u.shield / total) * 100}%`
            }} />}
        </div>
    )
}

/** Hiệu ứng đang chịu (buff + trạng thái): icon, tên, số vòng; xanh có lợi, đỏ bất lợi. Rê chuột xem mô tả. */
export function unitEffects(u: UnitLike) {
    return [
        ...allBuffs().map((b) => ({
            id: `buff:${b.id}`, name: b.name, left: u.stacks.get(`buff:${b.id}`) ?? 0, desc: b.desc
        })),
        ...(Object.keys(STATUS_INFO) as StatusId[]).map((st) => ({
            id: st, name: STATUS_INFO[st].name, left: u.statuses.get(st) ?? 0, desc: STATUS_INFO[st].desc
        })),
    ].filter((e) => e.left > 0)
}
/** Luật riêng của vai (Đỡ đòn Kiên Cố, Sát thủ Lướt...): nhãn vai + câu luật, hiện cạnh tên vai */
export function RolePerk({ u }: { u: UnitLike }) {
    const info = ROLE_INFO[heroOf(u).role] as { name: string; perk?: string }
    if (!info.perk) return null
    return <p className="mt-1.5 rounded border border-hex-gold/30 bg-hex-gold/5 px-2 py-1 text-[12px] leading-snug"><b className="text-hex-gold-hi">{info.name}</b>: <Rich text={info.perk} unit={u} /></p>
}

export function EffectChips({ u }: { u: UnitLike }) {
    const effects = unitEffects(u)
    if (!effects.length) return null
    return (
        <div className="mt-2 flex flex-wrap gap-1">
            {effects.map((e) => {
                const kw = keywordById(e.id), good = kw?.good !== false
                return (
                    <span key={e.id} title={`${e.name}: ${e.desc}`} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${good ? "border-emerald-400/70 bg-emerald-900/40" : "border-red-400/70 bg-red-900/40"}`}>
                        {kw && <img src={`/${kw.icon}`} alt="" className="h-3.5 w-3.5 rounded-sm" />}{e.name} <b>{e.left}</b>
                    </span>
                )
            })}
        </div>
    )
}

/** Bảng chỉ số đầy đủ: AD, AP, Giáp, Kháng phép, Tầm, Tốc đánh, Chí mạng, Hút máu, Sát lực, Xuyên phép */
export function StatGrid({ u }: { u: UnitLike }) {
    const st = statsOf(u), pctOf = (v: number) => `${Math.round(v * 100)}%`
    const rows: [string, string | number][] = [
        ["AD",
            atkOf(u)],
        ["AP",
            apOf(u)],
        [t("g.stat_armor"),
            armorOf(u)],
        [t("g.stat_mr"),
            mrOf(u)],
        [t("g.stat_range"),
            rangeOf(u)],
        [t("g.stat_as"),
            pctOf(1 + st.extraAtk)],
        [t("g.stat_crit"),
            pctOf(st.crit)],
        [t("g.stat_ls"),
            pctOf(st.lifesteal + st.omnivamp)],
        [t("g.stat_leth"),
            st.lethality],
        [t("g.stat_mpen"),
            st.magicPen],
    ]
    return (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 rounded border border-hex-line/60 bg-black/30 px-2 py-1 text-[12px]">
            {rows.map(([k,
                v]) => <div key={k} className="flex justify-between"><span className="text-hex-muted">{k}</span><b className="num">{v}</b></div>)}
        </div>
    )
}

/** Tướng: chân dung, máu/khiên, Mana/Nộ, chỉ số, hiệu ứng đang dính, nội tại, chiêu, đồ */
export function UnitTip({ u }: { u: UnitLike & { status?: string } }) {
    const hero = heroOf(u), adapter = getHero(u.defId), res = RESOURCES[hero.resource ?? "mana"]
    const effects = unitEffects(u)
    return (
        <div className="w-[300px] text-[13px] leading-snug">
            <div className="flex gap-3">
                <img src={`/heroes/${u.defId}.jpg`} alt="" className="h-14 w-14 rounded border border-hex-gold object-cover object-top" />
                <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-hex-gold-hi">{hero.name}</div>
                    <div className="text-[12px] text-hex-muted">{ROLE_INFO[hero.role].name} · {t("g.unit_stats2",
                        {
                            ar: armorOf(u), mr: mrOf(u), range: rangeOf(u), res: res.name, m: u.mana, rmax: res.max
                        })}</div>
                    <div className="mt-1"><HpBar u={u} /></div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded bg-black/60"><div className="h-full" style={{
                        width: pct(u.mana,
                            res.max), background: `#${res.color.toString(16).padStart(6,
                            "0")}`
                    }} /></div>
                    <div className="mt-0.5 text-[12px]"><b className="num">{u.hp}/{u.maxHp}</b>{u.shield ? <> · <b className="num">+{u.shield}</b> khiên</> : null} · AD <b className="num">{atkOf(u)}</b> · AP <b className="num">{apOf(u)}</b></div>
                </div>
            </div>
            <RolePerk u={u} />
            <EffectChips u={u} />
            {adapter?.passive && (
                <p className="mt-2"><b className="text-hex-gold-hi">{adapter.passive.name}</b>: <Rich text={adapter.passive.desc} unit={u} /></p>
            )}
            <div className="mt-2 space-y-0.5">
                {hero.skills.map((id) => {
                    const sk = SKILLS[id], cd = u.cooldowns.get(id) ?? 0
                    return (
                        <div key={id} className="flex items-center gap-2 text-[12px]">
                            <img src={`/icons/${id}.png`} alt="" className="h-5 w-5 rounded-sm" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                            <b className="w-4 text-hex-gold-hi">{sk.key}</b><span className="flex-1 truncate">{sk.name}</span>
                            <span className="text-hex-muted">{cd ? t("g.cd",
                                {
                                    n: cd
                                }) : `${skillCost(u,
                                id)} ${res.name}`}</span>
                        </div>
                    )
                })}
            </div>
            {u.items.length > 0 && (
                <div className="mt-2 flex gap-1">{unitItems(u).map((id, i) => <ItemIcon key={i} id={id} size={22} />)}</div>
            )}
            <Glossary texts={[adapter?.passive?.desc,
                ...effects.map((e) => e.desc)]} />
        </div>
    )
}

/** Hình vùng của chiêu trên lưới 5 đường × 3 hàng (tâm ở giữa; front3 tính theo tiền tuyến) */
export function AreaGrid({ shape }: { shape: AreaShape }) {
    const hit = new Set(areaCells(shape,
        {
            lane: 2, row: shape === "front3" ? 0 : 1
        }).map((c) => `${c.lane}-${c.row}`))
    return (
        <div className="mt-2 inline-grid grid-cols-5 gap-0.5 rounded border border-hex-line/60 bg-black/40 p-1">
            {[2,
                1,
                0].flatMap((row) => [0,
                1,
                2,
                3,
                4].map((lane) => (
                <span key={`${lane}-${row}`} className={`h-3 w-4 rounded-[2px] ${hit.has(`${lane}-${row}`) ? "bg-orange-400" : "bg-white/10"}`} />
            )))}
        </div>
    )
}

/** Chiêu: phím, tên, chi phí, hồi chiêu, công thức, mô tả, cường hoá, chú giải */
export function SkillTip({ u, skillId }: { u: UnitLike; skillId: string }) {
    const sk = SKILLS[skillId], res = RESOURCES[heroOf(u).resource ?? "mana"], ult = sk.key === "R"
    const lines = [sk.formula,
        sk.desc,
        ...(sk.boosts ?? [])].filter(Boolean) as string[]
    return (
        <div className="w-[300px] text-[13px] leading-snug">
            <div className="flex items-center gap-2">
                <img src={`/icons/${skillId}.png`} alt="" className="h-10 w-10 rounded border border-hex-gold" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                <div>
                    <div className="font-extrabold text-hex-gold-hi">{sk.key} · {sk.name}{ult ? t("g.ult") : ""}</div>
                    <div className="text-[12px] text-hex-muted"><b className="num">{skillCost(u,
                        skillId)} {res.name}</b> · {t("g.cd",
                        {
                            n: sk.cooldown
                        })}</div>
                </div>
            </div>
            {lines.map((l, i) => <p key={i} className={i === 0 && sk.formula ? "mt-2 font-semibold" : "mt-1"}><Rich text={l} unit={u} /></p>)}
            {sk.area && <div className="flex items-center gap-2 text-[11px] text-hex-muted"><AreaGrid shape={sk.area as AreaShape} /><span>{t("g.area")}</span></div>}
            <Glossary texts={lines} />
        </div>
    )
}

/** Đồ: tên, chỉ số, nội tại (kèm điều kiện). Có `unit` (tướng đang đeo / đang chọn) thì công thức {…} tính ra số
 *  theo tướng đó, ví dụ "188 (20% máu tối đa)", và hiện máu hiện tại của tướng. */
export function ItemTip({ id, unit }: { id: string; unit?: UnitLike }) {
    const it = getItem(id)
    if (!it) return null
    return (
        <div className="w-[280px] text-[13px] leading-snug">
            <div className="flex items-center gap-2">
                <img src={`/items/${id}.png`} alt="" className="h-9 w-9 rounded border border-hex-gold" />
                <div className="font-extrabold text-hex-gold-hi">{it.name}</div>
            </div>
            {unit && (
                <div className="mt-1.5">
                    <div className="text-[12px] text-hex-muted">{heroOf(unit).name} · <b className="num">{unit.hp}/{unit.maxHp}</b>{unit.shield > 0 && <b className="text-white"> +{unit.shield}</b>}</div>
                    <div className="mt-0.5"><HpBar u={unit} /></div>
                </div>
            )}
            {it.props.map((p, i) => (
                <p key={i} className="mt-1">
                    <b className={i === 0 ? "text-hex-muted" : "text-hex-gold-hi"}>{p.name}</b>
                    {p.condition.kind !== "none" && <span className="text-hex-muted"> ({p.condition.desc})</span>}: <Rich text={p.desc} unit={unit} />
                </p>
            ))}
            <Glossary texts={it.props.map((p) => p.desc)} />
        </div>
    )
}

export function ItemIcon({ id, size = 26 }: { id: string; size?: number }) {
    return <img src={`/items/${id}.png`} alt="" className="rounded-sm border border-hex-gold/70" style={{
        width: size, height: size
    }} />
}

/** Lá bài: tên, loại, mô tả + cường hoá, chú giải */
export function CardTip({ defId }: { defId: string }) {
    const c = CARDS[defId] as { name: string; kind: string; desc?: string; bonus?: string[] }
    const lines = [c.desc,
        ...(c.bonus ?? [])].filter(Boolean) as string[]
    return (
        <div className="w-[300px] text-[13px] leading-snug">
            <div className="font-extrabold text-hex-gold-hi">{c.name}</div>
            {lines.map((l, i) => <p key={i} className="mt-1"><Rich text={l} /></p>)}
            <Glossary texts={lines} />
        </div>
    )
}
