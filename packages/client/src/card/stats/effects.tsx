// Mô hình hiệu ứng dùng chung cho bảng chỉ số bên phải (UnitPanel) và khung chú giải trên sân (UnitTip).
// Mỗi ô là NGUỒN gây hiệu ứng (chiêu, phép bổ trợ, đồ, nội tại) + số lượt còn lại; bấm ô để xem giải thích.
// Hiệu ứng chung (choáng, câm lặng...) không giải thích ở đây: trên sân đã có hình ảnh (sao quay, bong bóng...).
import {
    useState, type CSSProperties
} from "react"
import {
    cg, getItem
} from "@starci/shared"
import {
    RichText
} from "../RichText"
import {
    cardIcon, cardLabel, elapsedPct, formName, groupBySource, heroName, isEn, markInfo, stackIcon, stackInfoV2, stackValueText, statusIcon, statusInfo, statusKind, turnsLeft, unitName, type StatusSrc
} from "../board/helpers"

export type FxKind = "buff" | "debuff" | "neutral"

/** Hiệu ứng chung dùng chung cho mọi tướng: hiện thành hàng chữ */
const GENERAL = new Set(["stun",
    "silence",
    "grievous",
    "chill",
    "blind",
    "taunt",
    "stealth",
    "shred",
    "root",
    "knockup",
    "freeze",
    "poison",
    "reveal"])

/** Tên ngắn gọn riêng cho bảng hiệu ứng (còn lại lấy từ statusInfo: trạng thái chung + cg.STATUS_V2) */
const NAME_VI: Record<string, string> = {
    see_hand: "Lộ bài",
}
const DESC_VI: Record<string, string> = {
    stealth: "Không bị chọn làm mục tiêu đơn lẻ hay bởi lá Đánh thường.",
}
const BUFFS = new Set(["empower",
    "stealth"])
const DEBUFFS = new Set(["grievous",
    "exhaust",
    "ignite",
    "noheal"])
/** Trạng thái mất máu mỗi lượt: giá trị là sát thương mỗi lượt */
const PER_TURN = new Set(["ignite"])

export function effectInfo(id: string): { name: string; desc: string } {
    if (isEn()) {
        const e = cg.STATUS_EN[id]
        const base = statusInfo(id)
        return {
            name: e?.name ?? base.name, desc: e?.desc ?? base.desc
        }
    }
    const base = statusInfo(id)
    return {
        name: NAME_VI[id] ?? (base.name === id ? id.replace(/_/g,
            " ") : base.name),
        desc: DESC_VI[id] ?? base.desc,
    }
}
export const kindOf = (id: string): FxKind => (BUFFS.has(id) ? "buff" : DEBUFFS.has(id) ? "debuff" : statusKind(id))

// ---------------- Điểm tích ----------------
/** Khóa nội bộ của engine, không phải thứ người chơi cần thấy */
const HIDDEN_STACKS = new Set(["lissFrozen",
    "frenzyLow"])
/** Tiền tố khoá kỹ thuật của engine/đồ (cờ "một lần", hào quang, bộ đếm lượt, bộ đếm ẩn của đồ) */
const HIDDEN_PREFIX = ["once:",
    "aura:",
    "tc:",
    "itemT:"]
const isHiddenStack = (key: string) => HIDDEN_STACKS.has(key) || HIDDEN_PREFIX.some((p) => key.startsWith(p))
const STACK_BUFF = new Set(["bonusRes",
    "itemAmp",
    "power"])
const STACK_MAX: Record<string, number> = {
    "malphite:bonusRes": 60,
}

interface StackText { name: string; value: string; desc: string }

function stackText(hero: string, key: string, v: number, unitOf: (id: string) => cg.Unit | undefined): StackText {
    const en = isEn()
    const pas = (en ? cg.HERO_EN[hero]?.passive?.name : undefined) ?? cg.getHero(hero)?.passive.name ?? heroName(hero)
    const v2 = stackInfoV2(key)
    if (v2) {
        return {
            name: v2.name,
            value: stackValueText(key,
                v),
            desc: v2.desc,
        }
    }
    const burn = /^burnAt:(.+)$/.exec(key)
    if (burn) {
        const tgt = unitOf(burn[1])
        return {
            name: en ? "Burn mark" : "Dấu thiêu",
            value: tgt ? unitName(tgt) : "",
            desc: en ? "Burn stacks tracked on this enemy." : "Số lần thiêu đã ghi trên kẻ địch này.",
        }
    }
    const known: Record<string, StackText> = {
        bonusRes: {
            name: pas,
            value: en ? `+${v} armor/MR` : `+${v} giáp/KP`,
            desc: en ? "Permanent bonus Armor and Magic Resist." : "Giáp và kháng phép cộng thêm vĩnh viễn.",
        },
        itemAmp: {
            name: en ? "Masterwork" : "Kiệt Tác",
            value: `+${v}%`,
            desc: en ? "Bonus % of item stats." : "Tăng % chỉ số từ trang bị.",
        },
        power: {
            name: en ? "Growth" : "Lớn dần",
            value: `+${v} AD`,
            desc: en ? "Attack gained from souls." : "Sức đánh cộng thêm từ Linh Hồn.",
        },
        turns: {
            name: en ? "Time left" : "Tan dần",
            value: en ? `${v} turns` : `${v} lượt`,
            desc: en ? "Turns until this summon fades." : "Số lượt còn lại trước khi tan biến.",
        },
    }
    const k = known[key]
    if (k) return k
    const item = /^item:(.+)$/.exec(key)
    if (item) {
        const it = getItem(item[1])
        const ct = cg.itemText(item[1],
            en ? "en" : "vi")
        return {
            name: ct?.counter?.name ?? ct?.name ?? it?.name ?? item[1],
            value: `${v}`,
            desc: ct ? `${ct.name}: ${ct.desc}` : en ? "Item stacks." : "Điểm tích của trang bị.",
        }
    }
    const label = en ? cg.STACK_EN[key] : undefined
    return {
        name: label ?? pas,
        value: `${v}`,
        desc: label ?? (en ? `${pas} stacks.` : `Điểm tích nội tại ${pas}.`),
    }
}

function stackIcons(hero: string, key: string): string[] {
    const item = /^item:(.+)$/.exec(key)
    if (item) {
        return [`/card_items/${item[1]}.png`,
            `/items/${item[1]}.png`]
    }
    return [stackIcon(key,
        hero)]
}

// ---------------- Mô hình ----------------
export interface FxCell {
    key: string
    icons: string[]
    letter: string
    name: string
    value: string
    badge: string
    kind: FxKind
    /** Thời gian đã trôi 0..100 (lớp tối quét tròn); không có = không phải hiệu ứng có hạn */
    elapsed?: number
    /** Các dòng của chú giải: tên, hiệu ứng, nguồn, số lượt */
    tip: string[]
}
export interface FxModel { cells: FxCell[] }

const ORDER: Record<FxKind, number> = {
    debuff: 0, buff: 1, neutral: 2
}

const turnWord = () => (isEn() ? "turns" : "lượt")
const leftWord = () => (isEn() ? "left" : "còn")

export function buildEffects(u: cg.Unit, turnNo: number, unitOf: (id: string) => cg.Unit | undefined): FxModel {
    const cells: FxCell[] = []
    // một ô cho mỗi nguồn: các trạng thái cùng lá/nội tại gộp lại (vd Thiêu Đốt = đốt + vết thương sâu)
    for (const g of groupBySource(u.statuses)) {
        const left = turnsLeft(g.until,
            turnNo)
        const parts = g.ids.map((id) => {
            const s: StatusSrc = u.statuses[id]
            const v = s.v ? Math.round(s.v * 100) / 100 : 0
            const value = v ? (PER_TURN.has(id) ? `${v}/${isEn() ? "turn" : "lượt"}` : `${v}`) : ""
            const info = effectInfo(id)
            return {
                id, info, text: `${info.name}${value ? ` ${value}` : ""}`
            }
        })
        const who = g.src ? unitOf(g.src) : undefined
        // không ghi lá gây ra = do nội tại sinh ra (vd Phấn Khích của Jinx): nguồn là nội tại của tướng gây ra, hoặc của chính tướng này
        const srcHero = (who ?? u).hero
        const source = cardLabel(g.card) ?? `${heroName(srcHero)} (${isEn() ? "Passive" : "Nội tại"})`
        // thử lần lượt: icon lá gây ra -> icon nội tại tướng gây ra -> icon trạng thái chung -> chữ cái
        const icons = [cardIcon(g.card),
            `/card_skills/${srcHero}_p.png`,
            statusIcon(g.ids[0])].filter((x): x is string => !!x)
        const effect = parts.map((x) => x.text).join(" + ")
        const kinds = g.ids.map(kindOf)
        cells.push({
            key: `st:${g.key}`,
            icons,
            letter: source.slice(0,
                1),
            name: source,
            value: effect,
            badge: g.v > 1 ? `${Math.round(g.v)}` : "",
            elapsed: elapsedPct(g.until,
                g.at,
                turnNo),
            kind: kinds.includes("debuff") ? "debuff" : kinds.includes("buff") ? "buff" : "neutral",
            tip: [source,
                isEn() ? `Applies ${effect} to ${unitName(u)}.` : `Gây ${effect} lên ${unitName(u)}.`,
                ...parts.filter((x) => !GENERAL.has(x.id)).map((x) => x.info.desc),
                who && who.id !== u.id ? `${isEn() ? "Cast by" : "Do"}: ${unitName(who)}` : "",
                `${leftWord()} ${left} ${turnWord()}`].filter(Boolean),
        })
    }
    for (const [key,
        v] of Object.entries(u.stacks)) {
        const itemId = /^item:(.+)$/.exec(key)?.[1]
        const itemMax = itemId ? cg.CARD_ITEMS[itemId]?.stack?.max : undefined
        if (isHiddenStack(key) || (itemId && !itemMax)) continue // cờ kỹ thuật của engine/đồ, không phải bộ đếm
        if (v === 0 && !itemMax) continue
        const tx = stackText(u.hero,
            key,
            v,
            unitOf)
        const max = itemMax ?? STACK_MAX[`${u.hero}:${key}`]
        cells.push({
            key: `sk:${key}`,
            icons: stackIcons(u.hero,
                key),
            letter: tx.name.slice(0,
                1),
            name: tx.name,
            value: tx.value,
            badge: max ? `${v}/${max}` : key === "element" ? tx.value.slice(0,
                1) : `${v}`,
            kind: STACK_BUFF.has(key) ? "buff" : "neutral",
            tip: [`${tx.name} · ${tx.value}`,
                tx.desc,
                max ? `${isEn() ? "Max" : "Tối đa"} ${max}` : ""].filter(Boolean),
        })
    }
    // dấu trúng đòn (Nami Q, Braum Q...): số nấc còn lại
    for (const [i,
        m] of (u.marks ?? []).entries()) {
        if (m.hits <= 0) continue
        const info = markInfo(m.id)
        const who = unitOf(m.src)
        const srcHero = who?.hero ?? m.src.split(":")[1] ?? u.hero
        cells.push({
            key: `mk:${i}`,
            icons: [`/card_skills/${m.id}.png`,
                `/card_skills/${srcHero}_p.png`],
            letter: info.name.slice(0,
                1),
            name: info.name,
            value: `${m.hits}`,
            badge: `${m.hits}`,
            elapsed: undefined,
            kind: who && who.side === u.side ? "buff" : "debuff",
            tip: [`${info.name} · ${m.hits}`,
                info.desc,
                who ? `${isEn() ? "Cast by" : "Do"}: ${unitName(who)}` : "",
                `${leftWord()} ${turnsLeft(m.until,
                    turnNo)} ${turnWord()}`].filter(Boolean),
        })
    }
    // biến hình (Aatrox R)
    if (u.transform) {
        const name = formName(u.transform.id)
        cells.push({
            key: "tf",
            icons: [`/card_skills/${u.transform.id}.png`],
            letter: name.slice(0,
                1),
            name,
            value: isEn() ? "transformed" : "biến hình",
            badge: "",
            elapsed: elapsedPct(u.transform.until,
                u.transform.at,
                turnNo),
            kind: "buff",
            tip: [name,
                isEn() ? "Transformed: different stats and frame." : "Đang biến hình: chỉ số và khung thẻ thay đổi.",
                `${leftWord()} ${turnsLeft(u.transform.until,
                    turnNo)} ${turnWord()}`],
        })
    }
    u.nextAttack.forEach((n, i) => {
        const srcHero = unitOf(n.source)?.hero ?? u.hero
        const isSkill = /^[a-z0-9]+_[qer]$/.test(n.id)
        const name = (isSkill ? cardLabel(n.id) : undefined) ?? n.id.replace(/_/g,
            " ")
        const bits = [n.mult ? `x${n.mult}` : "",
            n.bonusRaw ? `+${n.bonusRaw}` : ""].filter(Boolean)
        const value = bits.join(" ")
        cells.push({
            key: `na:${i}`,
            icons: [isSkill ? cardIcon(n.id) : undefined,
                `/card_skills/${srcHero}_p.png`].filter((x): x is string => !!x),
            letter: name.slice(0,
                1),
            name,
            value,
            badge: "1",
            kind: "buff",
            tip: [`${isEn() ? "Next attack" : "Đòn đánh kế tiếp"}: ${name}`,
                value].filter(Boolean),
        })
    })
    cells.sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
    return {
        cells
    }
}

// ---------------- Thành phần ----------------
/** Ảnh thử lần lượt các nguồn, hết thì hiện chữ */
function Pic(p: { srcs: string[]; letter: string }) {
    const [i,
        setI] = useState(0)
    if (i >= p.srcs.length) return <span className="fxm-ic fxm-letter">{p.letter}</span>
    return (
        <img
            className="fxm-ic"
            src={p.srcs[i]}
            alt=""
            draggable={false}
            onError={() => setI(i + 1)}
        />
    )
}

export function FxCellView(p: { cell: FxCell; popover?: boolean; open?: boolean; onToggle?: () => void }) {
    const { cell } = p
    return (
        <div
            className={`fxm-cell ${cell.kind}${p.open ? " open" : ""}`}
            title={p.popover ? undefined : cell.tip.join("\n")}
            onClick={p.onToggle}
            role={p.onToggle ? "button" : undefined}
        >
            <div className="fxm-box">
                <Pic srcs={cell.icons} letter={cell.letter} />
                {cell.elapsed !== undefined ? <i className="cd-sweep" style={{
                    "--p": cell.elapsed
                } as CSSProperties} /> : null}
                {cell.badge ? <i className="fxm-badge">{cell.badge}</i> : null}
            </div>
            <span className="fxm-label">
                {cell.name}
                {cell.value ? <b>{` · ${cell.value}`}</b> : null}
            </span>
            {p.popover ? (
                <div className="fxm-tip">
                    {cell.tip.map((line, i) => (i === 0 ? <b key={i}>{line}</b> : <p key={i}><RichText text={line} /></p>))}
                </div>
            ) : null}
        </div>
    )
}
