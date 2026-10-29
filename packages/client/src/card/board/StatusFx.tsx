// Hai lớp trạng thái kiểu LoL: hàng biểu tượng trên đầu thẻ và hiệu ứng nổi quanh thẻ.
import "./fx.css"
import {
    useState, type CSSProperties, type ReactNode
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardIcon, cardLabel, statusIcon, statusInfo, statusKind, TAG_STATUSES, tr, turnsLeft, type StatusSrc
} from "./helpers"

function Img(p: { src: string; fallback: string }) {
    const [bad,
        setBad] = useState(false)
    if (bad) return <span>{p.fallback}</span>
    return <img src={p.src} alt="" draggable={false} onError={() => setBad(true)} />
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

export function StatusRow(p: { u: cg.Unit; turnNo: number; unitOf?(id: string): string | undefined }) {
    const { u } = p
    const t = tr()
    const entries = Object.entries(u.statuses)
    if (!entries.length) return null
    const shown = entries.slice(0,
        MAX_CELLS)
    const more = entries.slice(MAX_CELLS)
    return (
        <div className="bd-srow">
            {shown.map(([id,
                raw]) => {
                const s: StatusSrc = raw
                const info = statusInfo(id)
                const left = turnsLeft(s.until,
                    p.turnNo)
                const from = cardLabel(s.card)
                const who = s.src ? p.unitOf?.(s.src) : undefined
                const tip = [`${info.name} - ${left} ${t.turnsUnit}${s.v ? ` (${s.v})` : ""}`,
                    info.desc,
                    from ? `${who ? `${who}: ` : ""}${from}` : ""].filter(Boolean).join("\n")
                return (
                    <span key={id} className={`bd-sc ${statusKind(id)} st-${id}`} title={tip}>
                        <Img src={cardIcon(s.card) ?? statusIcon(id)} fallback={info.name.slice(0,
                            2)} />
                        <em>{left}</em>
                        {s.v > 1 ? <b>{s.v}</b> : null}
                    </span>
                )
            })}
            {more.length ? <span className="bd-sc more" title={more.map(([id]) => statusInfo(id).name).join(", ")}>{`+${more.length}`}</span> : null}
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
