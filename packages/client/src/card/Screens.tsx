// Màn ngoài bàn của chế độ thẻ bài: chờ đối thủ, chọn tướng (draft), kết thúc trận.
import {
    useEffect, useRef, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard, type DraftHero
} from "./store"
import {
    RichText
} from "./RichText"
import {
    GameIcon
} from "./ui/GameIcon"
import {
    ArtFrame
} from "./ui/ArtFrame"
import {
    ScrollArea
} from "./ui/ScrollArea"
import {
    viewportToCanvasPoint
} from "./ui/GameCanvas"
import "./ui/screens-dna.css"
import "./ui/results-dna.css"
import "./ui/connection-dna.css"

const EN = (() => {
    try { return localStorage.getItem("lang") === "en" } catch { return false }
})()

const TXT = {
    vi: {
        waiting: "Đang chờ đối thủ…", waitingSub: "Phòng sẽ tự bắt đầu khi có người vào.", back: "Về sảnh",
        draftTitle: "Cấm / Chọn tướng", draftSub: "Mỗi đội {n} tướng. Tướng đã bị cấm hoặc đã được chọn thì không ai lấy được nữa.",
        yourBan: "Lượt bạn: CẤM 1 tướng", yourPick: "Lượt bạn: CHỌN 1 tướng", foeBan: "Đối thủ đang cấm…", foePick: "Đối thủ đang chọn…",
        doBan: "Cấm", doPick: "Chọn", pickHero: "Chọn 1 tướng", banned: "Đã cấm", taken: "Đã chọn", bans: "Cấm", foeTeam: "Đội địch", done: "Xong, đang vào trận…",
        yourTeam: "Đội của bạn", confirm: "Xác nhận đội hình", confirmN: "Chọn đủ {n} tướng",
        clear: "Bỏ chọn hết", sent: "Đã chọn, chờ đối thủ…", sentSub: "Đội hình của bạn đã được gửi.",
        you: "Bạn", foe: "Đối thủ", ready: "Sẵn sàng", choosing: "Đang chọn", timeLeft: "Còn lại",
        hp: "Máu", ad: "Công", armor: "Giáp", mr: "Kháng phép", phys: "Vật lý", magic: "Phép",
        victory: "CHIẾN THẮNG", defeat: "THẤT BẠI", draw: "HÒA", over: "TRẬN ĐẤU KẾT THÚC",
        reason: {
            lives: "Hạ đủ mạng đối thủ", deck: "Đối thủ hết bài trong bộ", left: "Đối thủ đã thoát", resign: "Đối thủ đầu hàng",
            timeout: "Quá thời gian", error: "Lỗi hệ thống",
        } as Record<string, string>,
        reasonYouLose: {
            lives: "Bạn đã mất hết mạng", deck: "Bạn hết bài trong bộ", left: "Bạn đã thoát", resign: "Bạn đã đầu hàng",
            timeout: "Quá thời gian", error: "Lỗi hệ thống",
        } as Record<string, string>,
        round: "Vòng", turn: "Lượt", lives: "Mạng còn lại (bạn - địch)", deck: "Bài còn trong bộ (bạn - địch)",
        briefPurpose: "Mục đích / cách thắng", briefEngines: "Động cơ", briefCopies: "lá", quick: "Quick", chainOnly: "Chỉ nối chuỗi",
        combos: "Combo tốt với", counteredBy: "Bị khắc chế bởi", counters: "Khắc chế", cx: {
            "Đơn giản": "Đơn giản", "Vừa": "Vừa", "Phức tạp": "Phức tạp"
        } as Record<string, string>,
        scout: "Phân tích đối thủ", weakTo: "Yếu trước", strongVs: "Khắc chế", warnYou: "Khắc đồng đội của bạn!", beat: "Cách đánh bại", beatUse: "Chọn {x}", beatNone: "Hết tướng khắc chế: chơi theo mục đích của đội mình",
        bCounter: "Khắc chế địch", bCombo: "Combo", bCountered: "Bị địch khắc", bBan: "Nên cấm",
        roles: {
            fighter: "Đấu sĩ", tank: "Đỡ đòn", assassin: "Sát thủ", marksman: "Xạ thủ", mage: "Pháp sư", support: "Hỗ trợ",
        } as Record<string, string>,
    },
    en: {
        waiting: "Waiting for an opponent…", waitingSub: "The match starts as soon as someone joins.", back: "Back to lobby",
        draftTitle: "Ban / Pick", draftSub: "{n} champions per team. Banned or picked champions can't be taken again.",
        yourBan: "Your turn: BAN a champion", yourPick: "Your turn: PICK a champion", foeBan: "Opponent is banning…", foePick: "Opponent is picking…",
        doBan: "Ban", doPick: "Pick", pickHero: "Choose a champion", banned: "Banned", taken: "Picked", bans: "Bans", foeTeam: "Enemy team", done: "Done, starting the match…",
        yourTeam: "Your team", confirm: "Confirm team", confirmN: "Pick {n} champions",
        clear: "Clear", sent: "Locked in, waiting for opponent…", sentSub: "Your team has been sent.",
        you: "You", foe: "Opponent", ready: "Ready", choosing: "Choosing", timeLeft: "Time left",
        hp: "HP", ad: "AD", armor: "Armor", mr: "MR", phys: "Physical", magic: "Magic",
        victory: "VICTORY", defeat: "DEFEAT", draw: "DRAW", over: "MATCH OVER",
        reason: {
            lives: "All enemy lives taken", deck: "Opponent ran out of cards", left: "Opponent left", resign: "Opponent resigned",
            timeout: "Timed out", error: "System error",
        } as Record<string, string>,
        reasonYouLose: {
            lives: "You lost all your lives", deck: "You ran out of cards", left: "You left", resign: "You resigned",
            timeout: "Timed out", error: "System error",
        } as Record<string, string>,
        round: "Round", turn: "Turn", lives: "Lives left (you - foe)", deck: "Cards in deck (you - foe)",
        briefPurpose: "Purpose / how it wins", briefEngines: "Engines", briefCopies: "cards", quick: "Quick", chainOnly: "Chain only",
        combos: "Good with", counteredBy: "Countered by", counters: "Counters", cx: {
            "Đơn giản": "Simple", "Vừa": "Medium", "Phức tạp": "Complex"
        } as Record<string, string>,
        scout: "Opponent scouting", weakTo: "Weak to", strongVs: "Counters", warnYou: "Counters one of your picks!", beat: "How to beat", beatUse: "Pick {x}", beatNone: "No counters left: win with your own plan",
        bCounter: "Counters foe", bCombo: "Combo", bCountered: "Foe counters", bBan: "Suggest ban",
        roles: {
            fighter: "Fighter", tank: "Tank", assassin: "Assassin", marksman: "Marksman", mage: "Mage", support: "Support",
        } as Record<string, string>,
    },
}
const L = EN ? TXT.en : TXT.vi
const fmt = (s: string, n: number) => s.replace("{n}",
    String(n))

const heroName = (h: DraftHero) => (EN ? cg.HERO_EN[h.id]?.name : undefined) ?? h.name
const portrait = (id: string) => `/heroes-square/${id}.jpg`
const hideBroken = (e: { currentTarget: HTMLImageElement }) => { e.currentTarget.style.visibility = "hidden" }

/** Mục đích + độ khó từng tướng (nguồn: docs/heroes/KITS.md) */
const BRIEF: Record<string, [string, string]> = {
    darius: ["Đơn giản",
        "Rải Chảy Máu cộng dồn vô hạn, rồi Máy Chém dồn chuẩn lên kẻ chảy máu nặng nhất"],
    zed: ["Vừa",
        "Combo một lượt: càng nhiều chiêu và đòn, Dấu Ấn cuối lượt nổ càng đau"],
    katarina: ["Vừa",
        "Sát thủ cơ hội: Dao rơi ngẫu nhiên, nhặt Dao gây sát thương và mở khoá Bông Sen Tử Thần"],
    khazix: ["Vừa",
        "Bắt tướng thiếu buff: Cô Lập kẻ đối diện, R tàng hình né đòn và Q miễn phí"],
    qiyana: ["Phức tạp",
        "Mỗi đường một Nguyên Tố: Đất dồn sát thương, Nước khống chế, Cỏ lạng lách né chiêu"],
    aatrox: ["Đơn giản",
        "Càng mất Máu càng đau, hồi Máu theo sát thương; R biến hình và sống lại một lần"],
    garen: ["Đơn giản",
        "Đấu sĩ phổ thông, không cần đồ: đánh là hồi Máu, tăng Giáp; R sát thương chuẩn"],
    vayne: ["Vừa",
        "Giam trong dự bị để tích Bóng Đêm, giữ lá Đánh Thường rồi gọi ra xả R lật kèo"],
    braum: ["Vừa",
        "Bảo kê đồng đội: E đỡ thay đòn đơn mục tiêu, Song Giáp dày lên mỗi lần bị đánh"],
    blitzcrank: ["Phức tạp",
        "Cướp bài: kéo lá của đối thủ về tay, E huỷ và cướp luôn chiêu địch đang tung"],
    leona: ["Vừa",
        "Giáp càng dày, khống chế càng lâu: cả ba chiêu đều Choáng và scale theo Giáp"],
    malphite: ["Đơn giản",
        "Buff Giáp, Máu cho cả đội, Liên Kết Đá chia đều sát thương; không có khống chế"],
    ornn: ["Phức tạp",
        "Lò rèn của đội: tạo đồ, rèn Kiệt Tác, buff chỉ số đồ của mọi tướng"],
    janna: ["Vừa",
        "Khiên là tất cả: tích Gió Thuận từ Khiên, Q gây sát thương theo tổng Khiên phe bạn"],
    soraka: ["Đơn giản",
        "Hồi Máu của phe thành Thánh Quang làm mọi lần hồi mạnh lên; E đổi Máu lấy hồi đồng minh, R hồi cả đội"],
    yorick: ["Phức tạp",
        "Câu giờ đốt bài: mỗi đòn đốt bộ địch, tích Hồn Ma lấy R, Ma Sương đánh phụ"],
    kogmaw: ["Đơn giản",
        "Đói tăng vô hạn, chết không mất: đòn đánh ăn % Máu tối đa mục tiêu"],
    jinx: ["Đơn giản",
        "Chọn súng khi ra sân; Q bắn phát cường hoá theo Điên, đánh kẻ yếu Máu để nhận Điên"],
    ashe: ["Đơn giản",
        "Mỗi đòn gắn Buốt, cả đội đánh mục tiêu đó đau hơn, đủ Buốt thì Choáng"],
    lux: ["Vừa",
        "Cả đội tiêu mana thành Ánh Sáng, tăng mọi chiêu của Lux, R chi mana tuỳ ý"],
    ahri: ["Vừa",
        "Pháp sư cơ động: Tinh Hoa tăng đòn và chiêu, đổi chỗ để dồn, Say Mê khoá mục tiêu"],
    annie: ["Đơn giản",
        "Bốn Lửa thì Choáng; scale AP và Máu, R gọi Tibbers ở ô phụ"],
    lissandra: ["Vừa",
        "Hoá Băng lá trên tay đối thủ, càng nhiều lá băng R càng đau"],
    gangplank: ["Phức tạp",
        "Úp lá thành Thùng ô phụ, Thuốc Súng tăng mỗi lượt, nổ càng lâu càng đau"],
    renata: ["Phức tạp",
        "Đồng đội mất Máu càng nhiều càng mạnh; hồi sinh mỗi đồng minh một lần"],
    brand: ["Phức tạp",
        "Rải Bỏng cộng dồn cháy theo % Máu từ đầu tới cuối trận, R nhân đôi Bỏng"],
    nami: ["Đơn giản",
        "Phe bạn gây sát thương thì tích Dậy Sóng: tăng AP cả đội và rút bài"],
    viktor: ["Phức tạp",
        "Mỗi lá bỏ khỏi tay là một Tiến Hoá, chiêu nào cũng đau thêm vĩnh viễn"],
    twistedfate: ["Phức tạp",
        "Chơi với bộ bài: xem, xếp lá trên cùng; lá lật ra quyết định hiệu ứng chiêu"],
    teemo: ["Phức tạp",
        "Xáo Nấm vào bộ địch, rút trúng là nổ; R kích nổ hàng loạt"],
    tristana: ["Vừa",
        "Gắn Bom bằng đòn đánh, sát thương tăng vọt theo số Bom, tự chọn lúc kích nổ"],
    missfortune: ["Đơn giản",
        "Xạ thủ diện rộng: đòn nảy sang địch khác, R quét cả bàn"],
    velkoz: ["Vừa",
        "Mỗi tia trúng tích Phân Rã, đủ tầng nổ sát thương chuẩn"],
    rumble: ["Phức tạp",
        "Tái Chế: lấy lá chiêu trong mộ lên tay, dùng như chiêu của mình theo AP"],
    sylas: ["Phức tạp",
        "Đoạt 1 chiêu của địch trên sân rồi tung như của mình, AD đổi thành AP, giữ khống chế"],
    mel: ["Vừa",
        "Q, E tích Chói Lọi rồi R thu hoạch cả bàn; E trả chiêu nhắm đồng minh về kẻ dùng"],
    sona: ["Đơn giản",
        "Đội tung chiêu hay mất Máu đều hồi mana; Q, E buff vĩnh viễn một tướng rồi lan sang tướng kề"],
    azir: ["Phức tạp",
        "Gọi Lính Cát lên đồng minh, mỗi đòn đánh của Azir cả đội Lính cùng đâm"],
    jayce: ["Phức tạp",
        "Búa là đấu sĩ hồi Máu, Pháo tích Gia Tốc và mặc đồ để bắn, đồ đổi chỉ số theo dạng"],
}
const syn = (id: string) => cg.SYNERGY[id] as cg.HeroSynergy | undefined
const nameOf = (id: string) => (EN ? cg.HERO_EN[id]?.name : undefined) ?? cg.getHero(id)?.name ?? id
const skillIcon = (id: string, k: string) => `/card_skills/${id}_${k.toLowerCase()}.png`

const leave = () => { cardActions.leave(); location.reload() }

function Back() {
    return <button className="sc-btn" onClick={leave}><GameIcon name="arrow" />{L.back}</button>
}

export function WaitingScreen() {
    return <GameConnectionScreen kind="waiting" />
}

/** Real connection states only: never promises a reconnect/resume the server cannot perform. */
export function GameConnectionScreen(p: { kind: "idle" | "connecting" | "waiting" | "error"; message?: string }) {
    const error = p.kind === "error"
    const title = p.kind === "waiting" ? L.waiting : error ? (EN ? "Connection interrupted" : "Kết nối bị gián đoạn") : EN ? "Connecting to the match" : "Đang kết nối trận đấu"
    const description = p.kind === "waiting" ? L.waitingSub : error ? (EN ? "The connection to your match was interrupted. Return to the lobby to continue." : "Không thể duy trì kết nối với phòng đấu. Hãy trở về sảnh để tiếp tục.") : EN ? "Preparing your seat at the table…" : "Đang chuẩn bị vị trí của bạn trên bàn đấu…"
    const details = error && p.message ? p.message.replace(/(?:https?|wss?):\/\/\S+/g,
        EN ? "the server" : "máy chủ") : undefined
    return (
        <div className={`sc-stage dna-screen sc-connection${error ? " is-error" : ""}`} data-connection-state={p.kind}>
            <div className="connection-scene">
                <ArtFrame kind="title" className="connection-title" width={1200} height={240}><h1>STARCI LEAGUE</h1></ArtFrame>
                <small className="connection-kicker">{EN ? "CARD BATTLE" : "ĐẤU TRƯỜNG THẺ BÀI"}</small>
                <div className="connection-emblem" aria-hidden="true"><ArtFrame kind="icon" width={180} height={180}><GameIcon name={error ? "chain" : "diamond"} /></ArtFrame>{error ? null : <span className="connection-orbit" />}</div>
                <ArtFrame kind="name" className="connection-status" width={1080} height={200}><h2 role={error ? "alert" : "status"}>{title}</h2></ArtFrame>
                <div className="connection-copy"><p>{description}</p>{details ? <ScrollArea className="connection-error-details" label={EN ? "Connection details" : "Chi tiết kết nối"}><small className="connection-detail">{details}</small></ScrollArea> : null}</div>
                <div className="connection-actions"><button type="button" className="connection-back" onClick={leave}><ArtFrame kind="name" width={480} height={112}><GameIcon name="arrow" /><span>{L.back}</span></ArtFrame></button></div>
            </div>
        </div>
    )
}

function useCountdown(deadlineMs: number, key: unknown): number | null {
    const [end,
        setEnd] = useState(0)
    const [now,
        setNow] = useState(Date.now())
    useEffect(() => {
        setNow(Date.now())
        setEnd(deadlineMs > 0 ? Date.now() + deadlineMs : 0)
    },
    [deadlineMs,
        key])
    useEffect(() => {
        if (!end) return
        const id = window.setInterval(() => setNow(Date.now()),
            250)
        return () => window.clearInterval(id)
    },
    [end])
    return end ? Math.max(0,
        Math.ceil((end - now) / 1000)) : null
}

type HeroState = "free" | "banned" | "mine" | "theirs"

interface Mark { counter: boolean; combo: boolean; countered: boolean; ban: boolean }
type Avail = (id: string) => "free" | "out" | "mine"

function HeroTile({ h, state, selected, canAct, mark, onClick, onHover }: {
    h: DraftHero; state: HeroState; selected: boolean; canAct: boolean; mark: Mark; onClick: () => void; onHover: (el: HTMLElement | null) => void
}) {
    const taken = state !== "free"
    const timer = useRef(0)
    const dis = taken || !canAct
    return (
        <button
            className={`sc-hero role-${h.role} st-${state}${selected ? " on" : ""}${dis ? " dis" : ""}`}
            aria-label={`${heroName(h)} · ${L.roles[h.role] ?? h.role}${taken ? ` · ${state === "banned" ? L.banned : L.taken}` : ""}`}
            aria-disabled={dis}
            aria-pressed={selected}
            onClick={() => { if (!dis) onClick() }}
            onFocus={(e) => onHover(e.currentTarget)}
            onBlur={() => onHover(null)}
            onMouseEnter={(e) => onHover(e.currentTarget)}
            onMouseLeave={() => onHover(null)}
            onTouchStart={(e) => {
                const el = e.currentTarget
                window.clearTimeout(timer.current)
                timer.current = window.setTimeout(() => onHover(el),
                    450)
            }}
            onTouchEnd={() => window.clearTimeout(timer.current)}
            onTouchMove={() => window.clearTimeout(timer.current)}
            onContextMenu={(e) => e.preventDefault()}
        >
            <ArtFrame kind="icon" className="sc-art" image={portrait(h.id)}>
                <span className="sc-role">{L.roles[h.role] ?? h.role}</span>
                {selected ? <span className="sc-preview-mark"><GameIcon name="target" />{EN ? "Selected" : "Đang chọn"}</span> : null}
                {taken ? <span className="sc-taken">{state === "banned" ? L.banned : L.taken}</span> : null}
            </ArtFrame>
            {!taken ? (
                <div className="sc-badges">
                    {mark.ban ? <span className="bd ban">{L.bBan}</span> : null}
                    {mark.counter ? <span className="bd ctr">{L.bCounter}</span> : null}
                    {mark.countered ? <span className="bd cntd">{L.bCountered}</span> : null}
                    {mark.combo ? <span className="bd cmb">{L.bCombo}</span> : null}
                </div>
            ) : null}
            <ArtFrame kind="name" className="sc-hero-name"><b className="sc-name">{heroName(h)}</b></ArtFrame>
            <div className="sc-stats">
                <span title={L.hp}><i className="hp" />{h.hp}</span>
                <span title={L.ad}><i className="ad" />{h.atk}</span>
                <span title={L.armor}><i className="ar" />{h.armor}</span>
                <span title={L.mr}><i className="mr" />{h.mr}</span>
            </div>
            <small className={`sc-dmg ${h.damage}`}>{h.damage === "magic" ? L.magic : L.phys}</small>
        </button>
    )
}

function Chip({ id, cls }: { id: string; cls: string }) {
    return (
        <span className={`sc-chip ${cls}`} title={nameOf(id)}>
            <img src={portrait(id)} alt="" draggable={false} onError={hideBroken} />
        </span>
    )
}

function ChipRow({ ids, avail, label, warn }: { ids: string[]; avail: Avail; label: string; warn?: string[] }) {
    if (!ids.length) return null
    return (
        <div className="sc-chiprow">
            <em>{label}</em>
            {ids.map((id) => <Chip key={id} id={id} cls={`${avail(id)}${warn?.includes(id) ? " warn" : ""}`} />)}
        </div>
    )
}

/** Popover thông tin tướng khi rê chuột / nhấn giữ */
function HeroBrief({ id, rect, avail }: { id: string; rect: DOMRect; avail: Avail }) {
    const def = cg.getHero(id)
    if (!def) return null
    const en = EN ? cg.HERO_EN[id] : undefined
    const sy = syn(id)
    const [cx,
        purpose] = BRIEF[id] ?? ["",
        ""]
    const W = 400
    const anchor = viewportToCanvasPoint({
        x: rect.right, y: rect.top
    })
    const start = viewportToCanvasPoint({
        x: rect.left, y: rect.top
    })
    const left = anchor.x + 10 + W < 1920 ? anchor.x + 10 : Math.max(8,
        start.x - 10 - W)
    const top = Math.max(8,
        Math.min(anchor.y - 20,
            1080 - 320))
    // tính công thức theo chỉ số gốc của tướng (chưa vào trận, chưa đồ)
    const pv = cg.previewUnit(id)
    const txt = (raw: string) => cg.formulaText(raw,
        pv?.g,
        pv?.u)
    const keys = ["Q",
        "E",
        "R"] as const
    const rows: { k: string; name: string; desc: string; tags: string[]; copies?: number }[] = [
        {
            k: "P", name: en?.passive.name ?? def.passive.name, desc: txt(en?.passive.desc ?? def.passive.desc), tags: []
        },
        ...keys.map((k) => ({
            k,
            name: en?.skills[k].name ?? def.skills[k].name,
            desc: txt(en?.skills[k].desc ?? def.skills[k].desc),
            tags: [def.skills[k].quick ? L.quick : "",
                def.skills[k].chainOnly ? L.chainOnly : ""].filter(Boolean),
            copies: def.skillCopies?.[k] ?? cg.RULES.skillCopies[k],
        })),
    ]
    const heroDesc = en?.desc ?? def.desc
    return (
        <div className="sc-brief" style={{
            left, top, width: W, maxHeight: 1080 - top - 8
        }}>
            <div className="bf-head">
                <img src={portrait(id)} alt="" onError={hideBroken} />
                <div>
                    <b>{en?.name ?? def.name}</b>
                    <div className="bf-tags">
                        <span className={`role-${def.role}`}>{L.roles[def.role] ?? def.role}</span>
                        <span className={`sc-dmg ${def.damage}`}>{def.damage === "magic" ? L.magic : L.phys}</span>
                        {cx ? <span className={`cx cx-${cx === "Đơn giản" ? 1 : cx === "Vừa" ? 2 : 3}`}>{L.cx[cx]}</span> : null}
                    </div>
                    <div className="bf-stats">
                        <span>{L.hp} {def.hp}</span>
                        <span>{L.ad} {def.atk}</span>
                        <span>{L.armor} {def.armor}</span>
                        <span>{L.mr} {def.mr}</span>
                    </div>
                </div>
            </div>
            {purpose ? <p className="bf-purpose"><em>{L.briefPurpose}</em>{purpose}</p> : null}
            {sy ? <p className="bf-eng"><em>{L.briefEngines}</em>{sy.engines.map((e) => cg.ENGINE_NAME[e][EN ? "en" : "vi"]).join(" · ")}</p> : null}
            {heroDesc ? <p className="bf-desc">{txt(heroDesc)}</p> : null}
            <div className="bf-skills">
                {rows.map((r) => (
                    <div key={r.k} className="bf-skill">
                        <img src={skillIcon(id,
                            r.k)} alt="" onError={hideBroken} />
                        <div>
                            <b>
                                <i>{r.k}</i>
                                {r.name}
                                {r.tags.map((t) => <u key={t}>{t}</u>)}
                                {r.copies !== undefined ? <s>{r.copies} {L.briefCopies}</s> : null}
                            </b>
                            <span><RichText text={r.desc} /></span>
                        </div>
                    </div>
                ))}
            </div>
            {sy ? (
                <div className="bf-rel">
                    <ChipRow ids={sy.combos} avail={avail} label={L.combos} />
                    <ChipRow ids={sy.counteredBy} avail={avail} label={L.counteredBy} />
                    <ChipRow ids={cg.countersOf(id)} avail={avail} label={L.counters} />
                </div>
            ) : null}
        </div>
    )
}

/** Ghi chú trinh sát một tướng địch: yếu trước ai, khắc ai, cách đánh bại */
function scoutOf(foeId: string, mine: string[], avail: Avail) {
    const weak = syn(foeId)?.counteredBy ?? []
    const strong = cg.countersOf(foeId)
    const warn = strong.filter((x) => mine.includes(x))
    const usable = weak.filter((x) => avail(x) === "free").map(nameOf)
    const have = weak.filter((x) => mine.includes(x))
    const beat = usable.length ? L.beatUse.replace("{x}",
        usable.slice(0,
            3).join(", ")) : have.length ? `✓ ${have.map(nameOf).join(", ")}` : L.beatNone
    return {
        weak, strong, warn, beat
    }
}

function ScoutBlock({ foeId, mine, avail, compact }: { foeId: string; mine: string[]; avail: Avail; compact?: boolean }) {
    const s = scoutOf(foeId,
        mine,
        avail)
    return (
        <div className={`sc-scout${compact ? " compact" : ""}${s.warn.length ? " danger" : ""}`}>
            <div className="sc-scout-h">
                <Chip id={foeId} cls="free" />
                <b>{nameOf(foeId)}</b>
                <small>{BRIEF[foeId]?.[1] ?? ""}</small>
            </div>
            <ChipRow ids={s.weak} avail={avail} label={L.weakTo} />
            <ChipRow ids={s.strong} avail={avail} label={L.strongVs} warn={s.warn} />
            {s.warn.length ? <div className="sc-warn"><GameIcon name="target" />{L.warnYou} ({s.warn.map(nameOf).join(", ")})</div> : null}
            <div className="sc-beat"><em>{L.beat}</em>{s.beat}</div>
        </div>
    )
}

/** Cột đội: các ô chọn (portrait) + các ô cấm (gạch chéo); cột địch thêm ghi chú trinh sát */
function TeamColumn({ title, mine, picks, bans, size, banSlots, byId, active, scout }: {
    title: string; mine: boolean; picks: string[]; bans: string[]; size: number; banSlots: number; byId: Map<string, DraftHero>; active: "ban" | "pick" | null
    scout?: { mine: string[]; avail: Avail }
}) {
    return (
        <aside className={`sc-col${mine ? " mine" : " foe"}${active ? " active" : ""}`}>
            <ArtFrame kind="name" className="sc-team-title"><h3>{title}</h3></ArtFrame>
            {banSlots > 0 ? <section className="sc-ban-tray" aria-label={`${title} · ${L.bans}`}>
                <h4><span>{L.bans}</span><b>{bans.length} / {banSlots}</b></h4>
                <div className="sc-bans">{Array.from({
                    length: banSlots
                },
                (_, i) => {
                    const h = bans[i] ? byId.get(bans[i]) : undefined
                    const next = active === "ban" && i === bans.length
                    return <div key={i} role="img" aria-label={h ? `${L.banned}: ${heroName(h)}` : `${L.bans} ${i + 1}`} className={`sc-banslot${h ? " full" : ""}${next ? " next" : ""}`} title={h ? heroName(h) : `${L.bans} ${i + 1}`}>
                        <ArtFrame kind="icon" image={h ? portrait(h.id) : undefined}>{h ? null : <GameIcon name="shield" />}</ArtFrame>
                    </div>
                })}</div>
            </section> : null}
            <ScrollArea className="sc-col-scroll" label={title}>
                <div className="sc-picks">
                    {Array.from({
                        length: size
                    },
                    (_, i) => {
                        const h = picks[i] ? byId.get(picks[i]) : undefined
                        const next = active === "pick" && i === picks.length
                        return (
                            <div key={i} className={`sc-pickslot${h ? " full" : ""}${next ? " next" : ""}`}>
                                <ArtFrame kind="icon" className="sc-picked-art" image={h ? portrait(h.id) : undefined}>{h ? null : <span>{i + 1}</span>}</ArtFrame>
                                <ArtFrame kind="name" className="sc-picked-name"><b>{h ? heroName(h) : `${EN ? "PICK" : "CHỌN"} ${i + 1}`}</b></ArtFrame>
                            </div>
                        )
                    })}
                </div>
                {scout && picks.length ? (
                    <>
                        <h4>{L.scout}</h4>
                        {picks.map((id) => <ScoutBlock key={id} foeId={id} mine={scout.mine} avail={scout.avail} />)}
                    </>
                ) : null}
            </ScrollArea>
        </aside>
    )
}

export function DraftScreen() {
    const { draft } = useCard()
    const [sel,
        setSel] = useState<string | null>(null)
    const [hover,
        setHover] = useState<{ id: string; rect: DOMRect } | null>(null)
    const secs = useCountdown(draft?.deadlineMs ?? 0,
        draft?.step)
    useEffect(() => { setSel(null) },
        [draft?.step])
    useEffect(() => {
        // chạm ra ngoài thì đóng popover (nhấn giữ trên cảm ứng)
        const close = () => setHover(null)
        document.addEventListener("touchstart",
            close)
        return () => document.removeEventListener("touchstart",
            close)
    },
    [])
    if (!draft) return <div className="cg-center">…</div>
    const me = draft.you ?? "A"
    const foe = me === "A" ? "B" : "A"
    const byId = new Map(draft.pool.map((h) => [h.id,
        h]))
    const turn = draft.turn
    const myTurn = !!turn && turn.side === me && draft.you !== null
    // cấm của mỗi bên: lượt cấm thứ i trong order thuộc về bên nào
    const banTurns = draft.order.filter((t) => t.action === "ban")
    const bansOf = (side: "A" | "B") => draft.bans.filter((_, i) => banTurns[i]?.side === side)
    const banSlots = banTurns.filter((t) => t.side === me).length
    const stateOf = (id: string): HeroState => draft.bans.includes(id) ? "banned" : draft.picks[me].includes(id) ? "mine" : draft.picks[foe].includes(id) ? "theirs" : "free"
    const status = !turn ? L.done : myTurn ? (turn.action === "ban" ? L.yourBan : L.yourPick) : (turn.action === "ban" ? L.foeBan : L.foePick)
    const confirm = () => { if (sel && myTurn) { cardActions.draftAct(sel); setSel(null) } }
    const mine = draft.picks[me]
    const theirs = draft.picks[foe]
    const avail: Avail = (id) => {
        const st = stateOf(id)
        return st === "free" ? "free" : st === "mine" ? "mine" : "out"
    }
    const banning = myTurn && turn?.action === "ban"
    const markOf = (id: string): Mark => {
        const s = syn(id)
        return {
            counter: theirs.some((e) => syn(e)?.counteredBy.includes(id)),
            countered: theirs.some((e) => !!s?.counteredBy.includes(e)),
            combo: mine.some((a) => !!s?.combos.includes(a) || !!syn(a)?.combos.includes(id)),
            ban: banning && mine.some((a) => !!syn(a)?.counteredBy.includes(id)),
        }
    }
    const onHover = (id: string) => (el: HTMLElement | null) => setHover(el ? {
        id, rect: el.getBoundingClientRect()
    } : null)
    return (
        <div className="sc-stage dna-screen">
            <div className={`sc-draft bp sc-modular-draft ${turn?.action === "ban" ? "is-banning" : "is-picking"}`}>
                <header className="sc-head">
                    <div className="sc-draft-title">
                        <small className="sc-kicker">STARCI LEAGUE</small>
                        <ArtFrame kind="title" className="sc-main-title"><h1>{L.draftTitle}</h1></ArtFrame>
                        <p>{fmt(L.draftSub,
                            draft.size)}</p>
                    </div>
                    <div className="sc-status">
                        <span role="status" aria-live="polite" className={`sc-pill turn${myTurn ? " mine" : ""}${turn?.action === "ban" ? " ban" : ""}`}><GameIcon name={turn?.action === "ban" ? "shield" : "roster"} />{status}</span>
                        {secs !== null ? <span className={`sc-timer${secs <= 10 ? " low" : ""}`}>{L.timeLeft} {secs}s</span> : null}
                    </div>
                </header>
                <div className="sc-order-strip">
                    <span className="sc-order-caption">{EN ? "TURN" : "LƯỢT"} <b>{Math.min(draft.step + 1,
                        draft.order.length)} / {draft.order.length}</b></span>
                    {draft.order.map((t, i) => (
                        <span key={i} title={`${i + 1} · ${t.side === me ? L.you : L.foe} · ${t.action === "ban" ? L.doBan : L.doPick}`} aria-current={i === draft.step ? "step" : undefined} className={`sc-step ${t.action}${t.side === me ? " me" : " foe"}${i === draft.step ? " now" : ""}${i < draft.step ? " past" : ""}`}>
                            <GameIcon name={t.action === "ban" ? "shield" : "roster"} />
                        </span>
                    ))}
                </div>
                <div className="sc-bp-body">
                    <TeamColumn title={L.yourTeam} mine picks={mine} bans={bansOf(me)} size={draft.size} banSlots={banSlots} byId={byId} active={turn && turn.side === me ? turn.action : null} />
                    <div className="sc-center">
                        {theirs.length ? (
                            <div className="sc-analysis">
                                <h4>{L.scout}</h4>
                                <ScrollArea className="sc-analysis-scroll" label={L.scout}><div className="sc-analysis-row">
                                    {theirs.map((id) => <ScoutBlock key={id} foeId={id} mine={mine} avail={avail} compact />)}
                                </div></ScrollArea>
                            </div>
                        ) : null}
                        <div className="sc-roster-label"><GameIcon name="roster" /><b>{EN ? "CHAMPIONS" : "DANH SÁCH TƯỚNG"}</b><span>{draft.pool.filter((h) => stateOf(h.id) === "free").length} / {draft.pool.length}</span></div>
                        <ScrollArea className="sc-roster-scroll" label={EN ? "Champions" : "Danh sách tướng"}><div className="sc-grid">
                            {draft.pool.map((h) => (
                                <HeroTile key={h.id} h={h} state={stateOf(h.id)} selected={sel === h.id} canAct={myTurn} mark={markOf(h.id)} onClick={() => setSel(h.id)} onHover={onHover(h.id)} />
                            ))}
                        </div></ScrollArea>
                    </div>
                    <TeamColumn title={L.foeTeam} mine={false} picks={theirs} bans={bansOf(foe)} size={draft.size} banSlots={banSlots} byId={byId} active={turn && turn.side === foe ? turn.action : null} scout={{
                        mine, avail
                    }} />
                </div>
                <footer className="sc-foot">
                    <div className="sc-team">
                        {sel ? <div className="sc-selected-preview"><ArtFrame kind="icon" className="sc-selected-art" image={portrait(sel)} /><div><b>{heroName(byId.get(sel)!)}</b><small>{L.roles[byId.get(sel)!.role]}</small><span>{["p",
                            "q",
                            "e",
                            "r"].map((key) => <img key={key} src={`/icons/${sel}_${key}.png`} alt={key.toUpperCase()} onError={hideBroken} />)}</span></div></div> : <GameIcon name="target" />}
                        <span className="sc-team-label">{sel ? heroName(byId.get(sel)!) : myTurn ? L.pickHero : status}</span>
                    </div>
                    <div className="sc-actions">
                        {myTurn ? (
                            <ArtFrame kind="name" className="sc-action-frame"><button className={`sc-btn ${turn!.action === "ban" ? "red" : "gold"}`} onClick={confirm} disabled={!sel}>
                                <GameIcon name={turn!.action === "ban" ? "shield" : "roster"} />{turn!.action === "ban" ? L.doBan : L.doPick}{sel ? ` · ${heroName(byId.get(sel)!)}` : ""}
                            </button></ArtFrame>
                        ) : null}
                        <ArtFrame kind="name" className="sc-action-frame"><Back /></ArtFrame>
                    </div>
                </footer>
            </div>
            {hover ? <HeroBrief id={hover.id} rect={hover.rect} avail={avail} /> : null}
        </div>
    )
}

export function EndScreen() {
    const { end, view } = useCard()
    if (!end) return null
    const you = view?.you ?? null
    const won = end.winner !== null && you !== null && end.winner === you
    const kind = end.winner === null ? "draw" : you === null ? "over" : won ? "win" : "lose"
    const title = kind === "win" ? L.victory : kind === "lose" ? L.defeat : kind === "draw" ? L.draw : L.over
    const reason = (kind === "lose" ? L.reasonYouLose : L.reason)[end.reason] ?? end.reason
    const rows: { k: string; v: string }[] = []
    const lineupSide = you ?? end.winner ?? "A"
    const lineup = view?.players[lineupSide].heroes ?? []
    if (view) {
        rows.push({
            k: L.round, v: String(view.round)
        },
        {
            k: L.turn, v: String(view.turnNo)
        })
        if (you) {
            const other = you === "A" ? "B" : "A"
            rows.push({
                k: L.lives, v: `${view.players[you].lives} - ${view.players[other].lives}`
            })
            rows.push({
                k: L.deck, v: `${view.players[you].deckCount} - ${view.players[other].deckCount}`
            })
        }
    }
    return (
        <div className="sc-overlay dna-screen result-screen">
            <section className={`sc-end ${kind}`} aria-label={title}>
                <header className="sc-result-header">
                    <small className="sc-kicker">STARCI LEAGUE · {L.over}</small>
                    <ArtFrame kind="title" width={1080} height={150} className="sc-result-title"><h1>{title}</h1></ArtFrame>
                    <ArtFrame kind="name" width={780} height={72} className="sc-result-reason"><p className="sc-reason">{reason}</p></ArtFrame>
                </header>
                {lineup.length ? <ArtFrame kind="name" width={780} height={64} className="sc-result-lineup-title"><h2><GameIcon name="roster" />{you ? L.yourTeam : EN ? "TEAM LINEUP" : "ĐỘI HÌNH"}<span> · {view?.names[lineupSide]}</span></h2></ArtFrame> : null}
                {lineup.length ? <section className="sc-result-team" aria-label={you ? L.yourTeam : lineupSide === "A" ? "A" : "B"}>{lineup.map((hero) => {
                    const def = cg.getHero(hero)
                    return <article className="sc-result-hero" key={hero}>
                        <ArtFrame kind="icon" width={228} height={228} className="sc-result-portrait" image={`/heroes-square/${hero}.jpg`} label={nameOf(hero)} />
                        <ArtFrame kind="name" width={250} height={58} className="sc-result-hero-name"><b>{nameOf(hero)}</b></ArtFrame>
                        <ArtFrame kind="name" width={200} height={44} className="sc-result-hero-role"><small>{def ? L.roles[def.role] : ""}</small></ArtFrame>
                    </article>
                })}</section> : null}
                {rows.length ? (
                    <dl className="sc-result-scores">
                        {rows.map((r, index) => (
                            <div className="sc-result-stat" key={r.k}><ArtFrame kind="name" width={300} height={64}><dt><GameIcon name={index === 0 ? "diamond" : index === 1 ? "arrow" : index === 2 ? "shield" : "cards"} />{index === 2 ? (EN ? "Lives · You / Rival" : "Mạng · Bạn / Địch") : index === 3 ? (EN ? "Deck · You / Rival" : "Bộ bài · Bạn / Địch") : r.k}</dt></ArtFrame><ArtFrame kind="name" width={300} height={82}><dd>{r.v}</dd></ArtFrame></div>
                        ))}
                    </dl>
                ) : null}
                <ArtFrame kind="name" width={420} height={92} className="sc-result-back"><button className="sc-btn gold" onClick={leave}><GameIcon name="arrow" />{L.back}</button></ArtFrame>
            </section>
        </div>
    )
}

