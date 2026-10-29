// Hai lớp trạng thái kiểu LoL: hàng biểu tượng trên đầu thẻ và hiệu ứng nổi quanh thẻ.
import "./fx.css"
import {
    useState, type CSSProperties, type ReactNode
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardIcon, cardLabel, elapsedPct, groupBySource, isEn, statusIcon, statusInfo, statusKind, TAG_STATUSES, tr, turnsLeft, type SourceGroup
} from "./helpers"

/** Ảnh thử lần lượt các nguồn (icon lá -> icon nội tại -> icon trạng thái), hết thì hiện chữ */
function Img(p: { srcs: (string | undefined)[]; fallback: string }) {
    const [i,
        setI] = useState(0)
    const list = p.srcs.filter((x): x is string => !!x)
    if (i >= list.length) return <span>{p.fallback}</span>
    return <img src={list[i]} alt="" draggable={false} onError={() => setI(i + 1)} />
}

const MAX_CELLS = 6
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
export interface ExtraCell { key: string; icons: string[]; num: string; tip: string; letter: string }

export function StatusRow(p: { u: cg.Unit; turnNo: number; unitOf?(id: string): string | undefined; extra?: ExtraCell[] }) {
    const { u } = p
    const t = tr()
    const groups = groupBySource(u.statuses)
    const extra = p.extra ?? []
    // luôn giữ chỗ hàng icon (kể cả khi trống) để ảnh tướng không bị đẩy xuống khi có hiệu ứng
    if (!groups.length && !extra.length) return <div className="bd-srow" />
    const shown = groups.slice(0,
        Math.max(0,
            MAX_CELLS - extra.length))
    const more = groups.slice(MAX_CELLS)
    const effName = (g: SourceGroup) => g.ids.map((id) => statusInfo(id).name).join(" + ")
    return (
        <div className="bd-srow">
            {shown.map((g) => {
                const left = turnsLeft(g.until,
                    p.turnNo)
                const from = cardLabel(g.card)
                const who = g.src ? p.unitOf?.(g.src) : undefined
                const tip = [`${from ?? (who ? `${who} (${isEn() ? "Passive" : "Nội tại"})` : effName(g))}: ${effName(g)} - ${left} ${t.turnsUnit}`,
                    from && who ? who : ""].filter(Boolean).join("\n")
                const kind = g.ids.some((id) => statusKind(id) === "debuff") ? "debuff" : statusKind(g.ids[0])
                return (
                    <span key={g.key} className={`bd-sc ${kind} ${g.ids.map((id) => `st-${id}`).join(" ")}`} title={tip}>
                        <Img srcs={[cardIcon(g.card),
                            passiveIconOf(g.src ?? u.id),
                            statusIcon(g.ids[0])]} fallback={effName(g).slice(0,
                            2)} />
                        <i className="cd-sweep" style={{
                            "--p": elapsedPct(g.until,
                                g.at,
                                p.turnNo)
                        } as CSSProperties} />
                        {g.v > 1 ? <em>{Math.round(g.v)}</em> : null}
                    </span>
                )
            })}
            {extra.map((c) => (
                <span key={c.key} className="bd-sc stack" title={c.tip}>
                    <Img srcs={c.icons} fallback={c.letter} />
                    <em>{c.num}</em>
                </span>
            ))}
            {more.length ? <span className="bd-sc more" title={more.map(effName).join(", ")}>{`+${more.length}`}</span> : null}
        </div>
    )
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
