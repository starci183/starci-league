// Hai lớp trạng thái kiểu LoL: hàng biểu tượng trên đầu thẻ và hiệu ứng nổi quanh thẻ.
import "./fx.css"
import {
    useState, type CSSProperties, type ReactNode
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardIcon, cardLabel, groupBySource, isEn, statusIcon, statusInfo, TAG_STATUSES, tr, turnsLeft
} from "./helpers"

import {
    EffectIconRow, type EffectIconEntry
} from "../ui/EffectIconRow"

const MAX_TAGS = 2

/** Nhãn chữ ngắn cho các trạng thái chung, đặt cạnh tên tướng */
export function StatusTags(p: { u: cg.Unit }) {
    const ids = TAG_STATUSES.filter((id) => !!p.u.statuses[id])
    if (!ids.length) return null
    const more = ids.slice(MAX_TAGS)
    return (
        <div className="bd-tags">
            {ids.slice(0,
                MAX_TAGS).map((id) => (
                <span key={id} className={`bd-tag ${id === "stealth" ? "stealth" : "cc"}`}>{statusInfo(id).name}</span>
            ))}
            {more.length ? <span className="bd-tag more" title={more.map((id) => statusInfo(id).name).join(", ")}>{`+${more.length}`}</span> : null}
        </div>
    )
}

/** Trạng thái không ghi lá gây ra = do nội tại sinh ra: icon nội tại của tướng gây ra (id "A:jinx"); token thì không có */
const passiveIconOf = (unitId: string): string | undefined => {
    const hero = unitId.split(":")[1]
    return hero && !hero.startsWith("tok") ? `/card_skills/${hero}_p.png` : undefined
}

/** Ô phụ cùng hàng icon: điểm tích (Điên, Đói, Song Giáp...) và dấu (Dấu Băng...) */
export interface ExtraCell { key: string; icons: string[]; num: string; tip: string; letter: string; cls?: string }

export function StatusRow(p: { u: cg.Unit; turnNo: number; unitOf?(id: string): string | undefined; extra?: ExtraCell[] }) {
    const t = tr()
    const effects: EffectIconEntry[] = groupBySource(p.u.statuses).map((group) => {
        const name = group.ids.map((id) => statusInfo(id).name).join(" + ")
        const from = cardLabel(group.card)
        const who = group.src ? p.unitOf?.(group.src) : undefined
        const source = from ?? (who ? `${who} (${isEn() ? "Passive" : "Nội tại"})` : name)
        const duration = `${turnsLeft(group.until,
            p.turnNo)} ${t.turnsUnit}`
        return {
            id: group.key, name,
            icon: cardIcon(group.card) ?? passiveIconOf(group.src ?? p.u.id) ?? statusIcon(group.ids[0]),
            count: group.v > 1 ? Math.round(group.v) : undefined,
            description: `${source} · ${duration}${from && who ? ` · ${who}` : ""}`,
            details: <>{group.ids.map((id) => <p key={id}><b>{statusInfo(id).name}</b>: {statusInfo(id).desc}</p>)}</>
        }
    })
    effects.push(...(p.extra ?? []).map((cell) => ({
        id: cell.key, icon: cell.icons[0] ?? statusIcon("shield"),
        name: cell.tip.split(/[:\n]/)[0], count: cell.num || undefined, description: cell.tip
    })))
    return <EffectIconRow className="bd-srow" effects={effects} />
}
const STARS = [0,
    1,
    2,
    3]
const FLAKES = [0,
    1,
    2]

/** Sprite /fx/status/<id>.png; tải lỗi thì chuyển sang bản vẽ bằng CSS (class "draw") */
function Sprite(p: { id: string; cls: string; i?: number; children?: ReactNode }) {
    const [bad,
        setBad] = useState(false)
    const style = p.i === undefined ? undefined : {
        "--i": p.i
    } as CSSProperties
    return (
        <i className={`${p.cls} ${bad ? "draw" : "spr"}`} style={style}>
            {bad ? p.children : <img src={`/fx/status/${p.id}.png`} alt="" draggable={false} onError={() => setBad(true)} />}
        </i>
    )
}

/** Cụm hiệu ứng chung ngay trên đầu tướng; không bắt chuột, chỉ dùng transform/opacity */
export function StatusFx(p: { u: cg.Unit }) {
    const { u } = p
    const has = (id: string) => !!u.statuses[id]
    const glyphs = ["blind",
        "silence",
        "grievous",
        "taunt",
        "stealth"].filter(has)
    if (!has("stun") && !has("chill") && !glyphs.length) return null
    return (
        <div className="bd-fx" aria-hidden="true">
            <div className="fx-cluster">
                {has("stun") ? (
                    <Sprite id="stun" cls="fx-stun">
                        {STARS.map((n) => <i key={n} style={{
                            "--i": n
                        } as CSSProperties}>*</i>)}
                    </Sprite>
                ) : null}
                {has("chill") ? FLAKES.map((n) => (
                    <Sprite key={n} id="chill_flake" cls="fx-flake" i={n}>*</Sprite>
                )) : null}
                <div className="fx-row">
                    {has("blind") ? <Sprite id="blind" cls="fx-g fx-blind" /> : null}
                    {has("silence") ? <Sprite id="silence" cls="fx-g fx-mute">&#x1F5E8;</Sprite> : null}
                    {has("grievous") ? <Sprite id="grievous" cls="fx-g fx-grievous">&#x1F494;</Sprite> : null}
                    {has("taunt") ? <Sprite id="taunt" cls="fx-g fx-taunt">!</Sprite> : null}
                    {has("stealth") ? <i className="fx-g fx-eye draw">&#x1F441;</i> : null}
                </div>
            </div>
        </div>
    )
}
