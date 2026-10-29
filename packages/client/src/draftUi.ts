// Màn CẤM / CHỌN tướng trước trận: lớp DOM phủ lên canvas (cùng bộ 9-slice với Sảnh).
// Trên: hàng tướng bị cấm. Giữa: lưới mọi tướng (bấm chọn rồi Xác nhận). Hai bên: đội bạn / đội địch theo thứ tự chọn.
import {
    CARDS, DRAFT_ORDER, ROLE_INFO, allHeroes, draftTaken, draftTurn, heroOf, t, type DraftLike, type Side, type UnitLike
} from "@starci/shared"

const esc = (s: string) => s.replace(/[&<>"']/g,
    (c) => `&#${c.charCodeAt(0)};`)
let picked: string | null = null

const portrait = (id: string, cls = "") =>
    `<div class="dr-hero ${cls}" data-hero="${id}"><img src="heroes/${id}.jpg" alt="" draggable="false"><b>${esc(CARDS[id].name)}</b></div>`

/** Vẽ (hoặc cập nhật) màn cấm/chọn. `send` gửi lựa chọn lên server. */
export function renderDraft(state: DraftLike, me: Side, send: (heroId: string) => void) {
    let root = document.getElementById("draft")
    if (!root) {
        root = document.createElement("div")
        root.id = "draft"
        document.body.appendChild(root)
    }
    const turn = draftTurn(state), mine = turn?.side === me
    const myPicks = Array.from(me === "A" ? state.picksA : state.picksB), oppPicks = Array.from(me === "A" ? state.picksB : state.picksA)
    const slots = (ids: string[], cls: string) => Array.from({
        length: DRAFT_ORDER.filter((d) => d.action === "pick").length / 2
    },
    (_, i) => (ids[i] ? portrait(ids[i],
        cls) : `<div class="dr-hero empty ${cls}"></div>`)).join("")
    if (picked && draftTaken(state,
        picked)) picked = null
    const status = !turn ? "" : mine ? t(turn.action === "ban" ? "g.draft_your_ban" : "g.draft_your_pick")
        : t("g.draft_wait",
            {
                action: t(turn.action === "ban" ? "g.draft_ban" : "g.draft_pick")
            })
    root.innerHTML = `
    <div class="dr nine-panel">
      <header class="dr-head nine-header"><h2>${t("g.draft_title")}</h2><span class="dr-status ${mine ? (turn?.action ?? "") : ""}">${esc(status)}</span>
        <button class="lb-btn gold" id="dr-ok" ${mine && picked ? "" : "disabled"}>${t("g.draft_confirm")}</button></header>
      <div class="dr-bans"><small>${t("g.draft_bans")}</small>${Array.from(state.bans).map((id) => portrait(id,
    "banned")).join("")}</div>
      <div class="dr-body">
        <aside class="dr-team me"><h3>${t("g.draft_you")}</h3>${slots(myPicks,
    "me")}</aside>
        <section class="dr-pool">${allHeroes().map((h) => {
        const taken = draftTaken(state,
                h.id), role = ROLE_INFO[heroOf({
                    defId: h.id
                } as UnitLike).role].name
        return `<div class="dr-hero ${taken ? "taken" : ""} ${picked === h.id ? "on" : ""} ${mine && !taken ? "can" : ""}" data-hero="${h.id}">
            <img src="heroes/${h.id}.jpg" alt="" draggable="false"><b>${esc(CARDS[h.id].name)}</b><small>${esc(role)}</small></div>`
    }).join("")}</section>
        <aside class="dr-team opp"><h3>${t("g.draft_opp")}</h3>${slots(oppPicks,
    "opp")}</aside>
      </div>
    </div>`
    root.querySelectorAll<HTMLElement>(".dr-pool .dr-hero.can").forEach((el) => {
        el.onclick = () => { picked = el.dataset.hero!; renderDraft(state,
            me,
            send) }
        el.ondblclick = () => { send(el.dataset.hero!); picked = null }
    })
    const ok = root.querySelector<HTMLButtonElement>("#dr-ok")
    if (ok) ok.onclick = () => { if (picked) { send(picked); picked = null } }
}

export function hideDraft() {
    document.getElementById("draft")?.remove()
    picked = null
}
