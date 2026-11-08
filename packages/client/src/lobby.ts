// Ngoài trận: đăng nhập (API server, PostgreSQL) → Sảnh (đấu nhanh, phòng riêng, vào bằng mã) → Xây bộ bài kiểu DuelingBook.
// Bộ bài đọc/ghi qua API của server; server lọc theo người dùng trong token (mỗi người chỉ thấy bộ của mình).
// Cùng DNA rừng/ngọc/vàng với bàn đấu; form, xác thực và bộ bài vẫn dùng dữ liệu thật.
import {
    activateDeck, createDeck, deleteDeck, listDecks, restoreSession, signIn, signOut, signUp, updateDeck, type Session
} from "./account"
import {
    LANGS, Lang, getLang, t,
} from "@starci/shared"
import {
    DECK_POOL, DECK_SIZE, DEFAULT_DECK, cardMeta, deckError, fromDb, groupCounts, groupName, isEn, loadLocalDeck, maxOf, saveLocalDeck, sortDeck, toDb,
    type DeckCardGroup, type DeckCardId,
} from "./card/deckStore"
import "./lobby.css"
import "./card/ui/scroll-area.css"
import {
    mountHtmlArtFrames
} from "./card/ui/artFrameHtml"
import "./card/ui/game-card.css"

/** Cách vào phòng: đấu nhanh (ghép ngẫu nhiên), tạo phòng riêng (có mã), vào phòng bằng mã */
export type JoinMode = { kind: "quick" } | { kind: "create" } | { kind: "join"; roomId: string } | { kind: "bot"; level: "easy" | "hard" }
  /** Chế độ thẻ bài (phòng "card"): đấu máy, vào phòng bằng mã, hoặc ghép ngẫu nhiên */
  | { kind: "card"; bot?: "easy" | "hard"; roomId?: string; deck?: string[] };
/** Thông tin mang vào trận: token để server xác thực, tên, cách vào phòng */
export interface Entry { token?: string; name: string; mode: JoinMode }
/** Người chơi đã chọn ở sảnh (BoardScene đọc khi vào phòng) */
export const entry: Entry = {
    name: "", mode: {
        kind: "quick"
    }
}

interface CgDeck { id: string | null; name: string; cards: DeckCardId[]; is_active: boolean }
interface Me { session: Session | null; name: string }

const root = () => document.getElementById("lobby")!
const scrollCleanups: (() => void)[] = []
const lobbyScale = () => Math.min(window.innerWidth / 1920,
    window.innerHeight / 1080)
function fitLobby() {
    root()?.style.setProperty("--lobby-scale",
        String(lobbyScale()))
}
function renderLobby(markup: string) {
    scrollCleanups.splice(0).forEach((stop) => stop())
    root().innerHTML = `<div class="lb-canvas">${markup.replace(/\bnine-(?:panel|header|tray|tooltip|slot)\b/g,
        "")}</div>`
    fitLobby()
    scrollCleanups.push(mountHtmlArtFrames(root()))
}

/** Same DOM rail as the game, without replacing existing form/deck event handlers. */
function skinLobbyScrolls() {
    root().querySelectorAll<HTMLElement>(".lb-mini,.db-body > .lb-panel").forEach((area) => {
        if (area.dataset.gameScroll) return
        area.dataset.gameScroll = "true"
        area.classList.add("game-scroll",
            "lb-scroll")
        const viewport = document.createElement("div"), content = document.createElement("div"), rail = document.createElement("div")
        viewport.className = "game-scroll-viewport"; viewport.tabIndex = 0
        content.className = "game-scroll-content"
        while (area.firstChild) content.append(area.firstChild)
        viewport.append(content)
        rail.className = "game-scroll-rail"
        rail.innerHTML = "<button type=\"button\" class=\"game-scroll-arrow up\" aria-label=\"Cuộn lên\"><i></i></button><div class=\"game-scroll-track\"><div class=\"game-scroll-thumb\" role=\"scrollbar\" aria-label=\"Cuộn nội dung\" aria-orientation=\"vertical\" tabindex=\"0\"><i></i></div></div><button type=\"button\" class=\"game-scroll-arrow down\" aria-label=\"Cuộn xuống\"><i></i></button>"
        area.append(viewport,
            rail)
        // Preview commands stay anchored while its long rules scroll above them.
        if (area.matches(".db-view")) {
            const commands = content.querySelector(".db-actions")
            if (commands) area.append(commands)
        }
        if (area.matches(".db-search")) {
            const filters = content.querySelector(".lb-tabs")
            if (filters) area.prepend(filters)
        }
        const track = rail.querySelector<HTMLElement>(".game-scroll-track")!, thumb = rail.querySelector<HTMLElement>(".game-scroll-thumb")!
        const up = rail.querySelector<HTMLButtonElement>(".up")!, down = rail.querySelector<HTMLButtonElement>(".down")!
        let max = 0, travel = 0, drag: { y: number; top: number } | null = null
        const measure = () => {
            max = Math.max(0,
                viewport.scrollHeight - viewport.clientHeight)
            const fraction = Math.min(1,
                Math.max(36 / Math.max(1,
                    track.clientHeight),
                viewport.clientHeight / Math.max(1,
                    viewport.scrollHeight)))
            travel = track.clientHeight * (1 - fraction)
            thumb.style.height = `${fraction * 100}%`; thumb.style.top = `${viewport.scrollTop / Math.max(1,
                max) * (1 - fraction) * 100}%`
            thumb.setAttribute("aria-valuemin",
                "0"); thumb.setAttribute("aria-valuemax",
                String(Math.round(max))); thumb.setAttribute("aria-valuenow",
                String(Math.round(viewport.scrollTop)))
            rail.classList.toggle("scrollable",
                max > 1); rail.setAttribute("aria-hidden",
                String(max <= 1))
            thumb.tabIndex = max > 1 ? 0 : -1; up.tabIndex = down.tabIndex = max > 1 ? 0 : -1
            up.disabled = viewport.scrollTop <= 0; down.disabled = viewport.scrollTop >= max - 1
        }
        viewport.onscroll = measure
        up.onclick = () => viewport.scrollBy({
            top: -100
        }); down.onclick = () => viewport.scrollBy({
            top: 100
        })
        thumb.onpointerdown = (e) => { e.preventDefault(); drag = {
            y: e.clientY, top: viewport.scrollTop
        }; thumb.setPointerCapture(e.pointerId) }
        thumb.onpointermove = (e) => { if (drag) viewport.scrollTop = drag.top + (e.clientY - drag.y) / lobbyScale() / Math.max(1,
            travel) * max }
        thumb.onpointerup = (e) => { drag = null; thumb.releasePointerCapture(e.pointerId) }
        thumb.onlostpointercapture = () => { drag = null }
        track.onpointerdown = (e) => { if (e.target === track) viewport.scrollBy({
            top: (e.clientY < thumb.getBoundingClientRect().top ? -1 : 1) * viewport.clientHeight * .85
        }) }
        thumb.onkeydown = (e) => {
            const delta = {
                ArrowDown: 40, ArrowUp: -40, PageDown: viewport.clientHeight * .85, PageUp: -viewport.clientHeight * .85, Home: -max, End: max
            }[e.key]
            if (delta !== undefined) { e.preventDefault(); viewport.scrollBy({
                top: delta
            }) }
        }
        const observer = new ResizeObserver(measure); observer.observe(viewport); observer.observe(content); observer.observe(track)
        scrollCleanups.push(() => observer.disconnect())
        measure()
    })
}
const esc = (s: string) => s.replace(/[&<>"']/g,
    (c) => `&#${c.charCodeAt(0)};`)

/** Shared local deck decisions. Resolves only after explicit confirm; Escape and backdrop cancel. */
export function lobbyChoice(p: { title: string; description: string; confirm: string; value?: string; destructive?: boolean }): Promise<string | null> {
    return new Promise((resolve) => {
        const stage = root().querySelector<HTMLElement>(".lb-canvas")!
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const underlay = [...stage.children].filter((el): el is HTMLElement => el instanceof HTMLElement)
        const inert = underlay.map((el) => el.inert)
        underlay.forEach((el) => { el.inert = true })
        const veil = document.createElement("div")
        veil.className = "lb-choice-veil"
        veil.innerHTML = `<section class="lb-choice-dialog" data-html-art="panel" data-html-fit="false" role="dialog" aria-modal="true" aria-labelledby="lb-choice-title" tabindex="-1"><form class="lb-choice-content"><h2 id="lb-choice-title" data-html-art="title">${esc(p.title)}</h2><p>${esc(p.description)}</p>${p.value === undefined ? "" : `<label class="lb-choice-label">${isEn() ? "Deck name" : "Tên bộ bài"}<span class="lb-choice-input" data-html-art="name" data-html-fit="false"><input name="deckName" maxlength="32" required autocomplete="off" value="${esc(p.value)}"></span></label>`}<div class="lb-choice-actions"><button type="button" data-choice="cancel" data-html-art="name">${isEn() ? "Cancel" : "Huỷ"}</button><button type="submit" data-choice="confirm" data-html-art="name"${p.destructive ? " class=\"danger\"" : ""}>${esc(p.confirm)}</button></div></form></section>`
        stage.append(veil)
        const stopArt = mountHtmlArtFrames(veil)
        const dialog = veil.querySelector<HTMLElement>("[role=dialog]")!
        const input = veil.querySelector<HTMLInputElement>("input")
        let done = false
        const finishChoice = (value: string | null) => {
            if (done) return
            done = true; stopArt(); document.removeEventListener("keydown",
                key,
                true); veil.remove(); underlay.forEach((el, i) => { el.inert = inert[i] })
            if (previous?.isConnected) previous.focus()
            resolve(value)
        }
        const key = (event: KeyboardEvent) => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finishChoice(null) }
            if (event.key !== "Tab") return
            const controls = [...dialog.querySelectorAll<HTMLElement>("input,button:not(:disabled)")], first = controls[0], last = controls[controls.length - 1]
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus() }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first?.focus() }
        }
        document.addEventListener("keydown",
            key,
            true)
        veil.querySelector<HTMLFormElement>("form")!.onsubmit = (event) => {
            event.preventDefault()
            if (input && !input.value.trim()) { input.setCustomValidity(isEn() ? "Enter a deck name." : "Nhập tên bộ bài."); input.reportValidity(); return }
            finishChoice(input ? input.value.trim().slice(0,
                32) : "confirm")
        }
        if (input) input.oninput = () => input.setCustomValidity("")
        veil.querySelector<HTMLButtonElement>("[data-choice=cancel]")!.onclick = () => finishChoice(null)
        veil.onmousedown = (event) => { if (event.target === veil) finishChoice(null) }
        scrollCleanups.push(() => finishChoice(null))
        requestAnimationFrame(() => { (input ?? veil.querySelector<HTMLButtonElement>("[data-choice=cancel]")!).focus(); input?.select() })
    })
}
/** Chọn ngôn ngữ: lưu lại rồi tải lại trang (dữ liệu game được đổi tên lúc khởi động) */
const langSelect = () => `<select class="lb-lang" id="lb-lang" title="${t("lang")}">${LANGS.map((l) =>
    `<option value="${l.id}" ${l.id === getLang() ? "selected" : ""}>${l.name}</option>`).join("")}</select>`
function wireLang() {
    skinLobbyScrolls()
    const sel = root().querySelector<HTMLSelectElement>("#lb-lang")
    if (sel) sel.onchange = () => { try { localStorage.setItem("lang",
sel.value as Lang) } catch { /* chế độ riêng tư */ } location.reload() }
}

let finish: (e: Entry) => void = () => {}

/** Hiện màn ngoài trận, trả về khi người chơi vào trận */
export function showLobby(): Promise<Entry> {
    return new Promise((resolve) => {
        window.addEventListener("resize",
            fitLobby)
        window.visualViewport?.addEventListener("resize",
            fitLobby)
        finish = (e) => { Object.assign(entry,
            e); scrollCleanups.splice(0).forEach((stop) => stop()); window.removeEventListener("resize",
            fitLobby); window.visualViewport?.removeEventListener("resize",
            fitLobby); root().remove(); resolve(e) }
        renderLobby(`<div class="lb-center"><div class="lb-card"><h1 class="lb-logo">STARCI LEAGUE</h1><p class="lb-hint">${isEn() ? "Connecting…" : "Đang kết nối…"}</p></div></div>`)
        restoreSession().then((session) => (session ? homeView(meOf(session)) : loginView()))
    })
}

function meOf(session: Session): Me {
    return {
        session, name: session.user.name || session.user.email || t("player")
    }
}

async function play(me: Me, mode: JoinMode) {
    finish({
        token: me.session?.token, name: me.name, mode
    })
}

// ================= ĐĂNG NHẬP =================

function loginView(mode: "in" | "up" = "in", msg = "") {
    renderLobby(`
    <div class="lb-center lb-auth-screen">
      <h1 class="lb-auth-title" data-html-art="title">StarCi League</h1>
      <div class="lb-card lb-auth-panel" data-html-art="panel"><div class="lb-auth-grid">
      <aside class="lb-auth-illustration"><div class="lb-auth-portrait" data-html-art="portrait" data-html-image="/heroes/jayce.jpg"></div><h2>${isEn() ? "Choose your champions" : "Chọn tướng của bạn"}</h2><p>${isEn() ? "Build your deck. Command the battlefield." : "Xếp bộ bài. Làm chủ chiến trường."}</p></aside>
      <div class="lb-auth-form"><div class="lb-auth-tools"><span class="lb-lang-frame" data-html-art="name" data-html-fit="false">${langSelect()}</span></div>
      <div class="lb-tabs">
        <button data-m="in" data-html-art="name" class="${mode === "in" ? "on" : ""}">${t("login.tab_in")}</button>
        <button data-m="up" data-html-art="name" class="${mode === "up" ? "on" : ""}">${t("login.tab_up")}</button>
      </div>
      <form id="lb-form">
        ${mode === "up" ? `<label>${t("login.name")}<span class="lb-input-frame" data-html-art="name" data-html-fit="false"><input name="name" required maxlength="24" placeholder="${t("login.name_ph")}"></span></label>` : ""}
        <label>${t("login.email")}<span class="lb-input-frame" data-html-art="name" data-html-fit="false"><input name="email" type="email" required placeholder="you@gmail.com" autocomplete="email"></span></label>
        <label>${t("login.password")}<span class="lb-input-frame" data-html-art="name" data-html-fit="false"><input name="password" type="password" required minlength="6" autocomplete="${mode === "up" ? "new-password" : "current-password"}"></span></label>
        <p class="lb-msg">${esc(msg)}</p>
        <button class="lb-btn gold wide" data-html-art="name" type="submit">${mode === "in" ? t("login.submit_in") : t("login.submit_up")}</button>
      </form>
      <button class="lb-link" data-html-art="name" id="lb-guest">${t("login.guest")}</button>
    </div></div></div></div>`)
    wireLang()
    root().querySelectorAll<HTMLButtonElement>(".lb-tabs button").forEach((b) => b.onclick = () => loginView(b.dataset.m as "in" | "up"))
  root().querySelector<HTMLButtonElement>("#lb-guest")!.onclick = () => homeView({
      session: null, name: `${t("guest")} ${Math.floor(Math.random() * 900 + 100)}`
  })
  root().querySelector<HTMLFormElement>("#lb-form")!.onsubmit = async (ev) => {
      ev.preventDefault()
      const f = new FormData(ev.target as HTMLFormElement)
      const email = String(f.get("email")), password = String(f.get("password"))
      try {
          const session = mode === "in" ? await signIn(email,
              password) : await signUp(email,
              password,
              String(f.get("name")))
          homeView(meOf(session))
      } catch (e) {
          loginView(mode,
              (e as Error).message)
      }
  }
}

// ================= SẢNH =================

/** Chữ của khu "Thẻ bài" (chế độ mới), tự theo ngôn ngữ đã chọn */
const CG = getLang() === "en"
    ? {
        title: "Card game", badge: "NEW", hint: "Pure card mode: draft 5 champions, 7 lives, play cards and chain skills.",
        quick: "Quick match", quickSub: "Matchmake with a random player", easy: "Vs bot: Easy", easySub: "Relaxed practice",
        hard: "Vs bot: Hard", hardSub: "A real challenge", codePh: "Room code", join: "Join",
    }
    : {
        title: "Thẻ bài", badge: "MỚI", hint: "Chế độ thẻ bài thuần: chọn 5 tướng, giữ 7 mạng, đánh bài và nối chuỗi chiêu.",
        quick: "Đấu nhanh", quickSub: "Ghép ngẫu nhiên với người chơi khác", easy: "Đấu máy Dễ", easySub: "Luyện tập thoải mái",
        hard: "Đấu máy Khó", hardSub: "Thử thách thực sự", codePh: "Mã phòng", join: "Vào phòng",
    }

/** Chữ của màn bộ bài (Việt/Anh) */
const D = isEn()
    ? {
        title: "Base deck", hint: "80 cards: Basic Attack, Draw, spells, Gold and item components. Each champion adds 8 Q, 8 E and 2 R to the deck (170 cards in total).",
        open: "Build deck", openSub: "Edit and choose your active deck", active: "Active", unsaved: "(unsaved)", back: "Back",
        newDeck: "New", sample: "Sample deck", rename: "Rename", del: "Delete", save: "Save", use: "Use this deck", dirty: "Unsaved changes",
        add: "Add", rem: "Remove", all: "All", loading: "Loading…", firstName: "My deck", newPrompt: "New deck name", renamePrompt: "Deck name",
        delConfirm: "Delete this deck?", discard: "Discard unsaved changes?", saved: "Saved", activated: "Deck selected for matches", deleted: "Deleted",
        full: `The deck already has ${DECK_SIZE} cards`, maxCopies: "Max copies reached", saveFail: "Save failed: ", removeHint: "Double-click or Remove to take a card out; drag cards from the right.",
        poolHint: "Click to view, double-click or drag to add.", guest: "Guest deck is stored on this device only.", cards: "cards", count: (n: number) => `${n}/${DECK_SIZE}`,
        summary: (b: number, s: number, g: number, i: number) => `Basic ${b} · Spells ${s} · Gold ${g} · Items ${i}`,
    }
    : {
        title: "Bộ bài", hint: "80 lá: Đánh thường, Rút Bài, phép bổ trợ, Vàng và mảnh Đồ. Mỗi tướng thêm 8 Q, 8 E, 2 R vào bộ (tổng 170 lá).",
        open: "Xếp bộ bài", openSub: "Chỉnh sửa và chọn bộ đang dùng", active: "Đang dùng", unsaved: "(chưa lưu)", back: "Quay lại",
        newDeck: "Bộ mới", sample: "Bộ mẫu", rename: "Đổi tên", del: "Xoá", save: "Lưu", use: "Dùng bộ này", dirty: "Có thay đổi chưa lưu",
        add: "Thêm", rem: "Bớt", all: "Tất cả", loading: "Đang tải…", firstName: "Bộ của tôi", newPrompt: "Tên bộ mới", renamePrompt: "Tên bộ bài",
        delConfirm: "Xoá bộ này?", discard: "Bỏ các thay đổi chưa lưu?", saved: "Đã lưu", activated: "Đã chọn bộ này cho trận đấu", deleted: "Đã xoá",
        full: `Bộ đã đủ ${DECK_SIZE} lá`, maxCopies: "Đã đủ số bản tối đa", saveFail: "Lưu thất bại: ", removeHint: "Bấm đúp hoặc Bớt để bỏ lá; kéo lá từ kho bên phải vào.",
        poolHint: "Bấm để xem, bấm đúp hoặc kéo để thêm.", guest: "Bộ của khách chỉ lưu trên máy này.", cards: "lá", count: (n: number) => `${n}/${DECK_SIZE}`,
        summary: (b: number, s: number, g: number, i: number) => `Đánh thường ${b} · Bổ trợ ${s} · Vàng ${g} · Đồ ${i}`,
    }

/** Vanilla twin of GameCardVisual: same intact portrait frame, alpha mask, shade and live name. */
function tile(id: DeckCardId, attrs = "", n = 0) {
    const m = cardMeta(id)
    return `<div class="game-card cv cgc ${m.group}" ${attrs} title="${esc(m.name)}"><div class="game-card-frame" data-html-art="portrait" data-html-image="${esc(m.art)}" data-html-fallback="${esc(m.fallback)}" data-html-content-class="game-card-content" data-html-surface-class="game-card-surface" data-html-shade-class="game-card-shade"><div class="game-card-copy"><b class="game-card-name">${esc(m.name)}</b></div></div>${n > 0 ? `<i class="cgc-n">×${n}</i>` : ""}</div>`
}

/** Các bộ thẻ bài của người chơi (chỉ bộ có mọi lá bắt đầu bằng "cg:") */
async function loadCgDecks(session: Session): Promise<CgDeck[]> {
    const data = await listDecks(session).catch(() => [])
    const out: CgDeck[] = []
    for (const d of data) {
        const cards = fromDb(d.cards ?? [])
        if (cards) out.push({
            id: d.id, name: d.name, cards, is_active: d.is_active
        })
    }
    return out
}

async function homeView(me: Me, msg = "") {
    let active: DeckCardId[] = loadLocalDeck() ?? DEFAULT_DECK
    if (me.session) {
        const decks = await loadCgDecks(me.session)
        active = decks.find((d) => d.is_active)?.cards ?? DEFAULT_DECK
    }
    if (deckError(active)) active = DEFAULT_DECK
    const counts = groupCounts(active)
    const mini = [...new Set(sortDeck(active))].map((id) => {
        const count = active.filter((x) => x === id).length
        return tile(id,
            "data-home-card",
            count)
    }).join("")
    renderLobby(`
    <div class="lb-home lb-modular-home">
      <header class="lb-bar lb-home-header">
        <span class="lb-home-title" data-html-art="title">StarCi League</span>
        <div class="lb-user"><span class="lb-lang-frame" data-html-art="name" data-html-fit="false">${langSelect()}</span><span class="lb-avatar" data-html-art="icon">${esc(me.name.slice(0,
    1).toUpperCase())}</span>
          <div><b class="lb-home-name" data-html-art="name" title="${esc(me.name)}">${esc(me.name)}</b></div>
          <button class="lb-btn" data-html-art="name" id="lb-out">${me.session ? t("home.signout") : t("home.signin")}</button></div>
      </header>
      <main class="lb-menu">
        <section class="lb-panel lb-card-mode" data-html-art="panel">
          <h2>${CG.title}<span class="lb-new">${CG.badge}</span></h2>
          <p class="lb-hint">${CG.hint}</p>
          <button class="lb-tile gold" data-html-art="name" id="lb-cg-quick"><span class="lb-choice-art lb-choice-cards" aria-hidden="true"><img src="/ui/card_back.png" alt=""><img src="/ui/card_back.png" alt=""><img src="/ui/card_back.png" alt=""></span><b>${CG.quick}</b><small>${CG.quickSub}</small></button>
          <div class="lb-bots">
            <button class="lb-tile" data-html-art="name" id="lb-cg-easy" title="${CG.easySub}"><span class="lb-choice-art" data-html-art="portrait" data-html-image="/heroes/jayce.jpg" aria-hidden="true"></span><b>${CG.easy}</b></button>
            <button class="lb-tile" data-html-art="name" id="lb-cg-hard" title="${CG.hardSub}"><span class="lb-choice-art" data-html-art="portrait" data-html-image="/heroes/azir.jpg" aria-hidden="true"></span><b>${CG.hard}</b></button>
          </div>
          <form class="lb-code" id="lb-cg-join"><span class="lb-code-frame" data-html-art="name" data-html-fit="false"><input name="code" required placeholder="${CG.codePh}" autocomplete="off"></span><button class="lb-btn" data-html-art="name">${CG.join}</button></form>
          <p class="lb-msg">${esc(msg)}</p>
        </section>
        <section class="lb-panel lb-home-deck" data-html-art="panel">
          <h2>${D.title}<small>${D.count(active.length)}</small></h2>
          <p class="lb-hint lb-deck-description">${D.hint}</p>
          <p class="lb-hint"><b>${D.summary(counts.basic,
        counts.spell,
        counts.gold,
        counts.item)}</b></p>
          <div class="lb-mini nine-tray">${mini}</div>
          <button class="lb-tile" data-html-art="name" id="lb-deck" title="${me.session ? D.openSub : D.guest}"><b>${D.open}</b></button>
        </section>
      </main>
    </div>`)
    wireLang()
    const $ = <T extends HTMLElement>(s: string) => root().querySelector<T>(s)!
    $("#lb-out").onclick = () => { signOut(); loginView() }
    $("#lb-deck").onclick = () => cardDeckBuilder(me)
    $("#lb-cg-quick").onclick = () => play(me,
        {
            kind: "card", deck: active
        })
    $("#lb-cg-easy").onclick = () => play(me,
        {
            kind: "card", bot: "easy", deck: active
        })
    $("#lb-cg-hard").onclick = () => play(me,
        {
            kind: "card", bot: "hard", deck: active
        })
    $<HTMLFormElement>("#lb-cg-join").onsubmit = (ev) => {
        ev.preventDefault()
        const code = String(new FormData(ev.target as HTMLFormElement).get("code")).trim()
        if (code) play(me,
            {
                kind: "card", roomId: code, deck: active
            })
    }
}


// ================= XÂY BỘ BÀI (chế độ thẻ bài) =================
// Trái: chi tiết lá · Giữa: bộ đang xếp (80 lá) · Phải: kho DECK_POOL. Bấm để xem, bấm đúp hoặc kéo thả để thêm/bớt.

async function cardDeckBuilder(me: Me) {
    renderLobby(`<div class="lb-center"><p class="lb-hint">${D.loading}</p></div>`)
    const session = me.session
    const uid = session?.user.id ?? null
    let decks: CgDeck[] = session ? await loadCgDecks(session) : []
    let dirty = false
    if (!decks.length) {
        decks = [{
            id: null, name: D.firstName, cards: sortDeck(uid ? DEFAULT_DECK : loadLocalDeck() ?? DEFAULT_DECK), is_active: true
        }]
        dirty = true
    }
    let cur = Math.max(0,
        decks.findIndex((d) => d.is_active))
    let view: DeckCardId = decks[cur].cards[0] ?? DECK_POOL[0].id
    let group: "all" | DeckCardGroup = "all", msg = "", msgOk = false
    const say = (text: string, ok = false) => { msg = text; msgOk = ok; render() }
    const deck = () => decks[cur]
    const countOf = (id: string) => deck().cards.filter((c) => c === id).length

    const add = (id: DeckCardId) => {
        view = id
        if (deck().cards.length >= DECK_SIZE) return say(D.full)
        if (countOf(id) >= maxOf(id)) return say(`${D.maxCopies}: ${cardMeta(id).name} (${maxOf(id)})`)
        deck().cards = sortDeck([...deck().cards,
            id])
        dirty = true; say("")
    }
    const remove = (id: DeckCardId) => {
        const i = deck().cards.indexOf(id)
        if (i < 0) return
        deck().cards.splice(i,
            1)
        dirty = true; say("")
    }

    /** Lưu bộ đang chọn: khách -> localStorage, đã đăng nhập -> bảng decks (mã có tiền tố "cg:") */
    const save = async (): Promise<boolean> => {
        const d = deck(), err = deckError(d.cards)
        if (err) { say(err); return false }
        if (!session) {
            if (!saveLocalDeck(d.cards)) { say(D.saveFail); return false }
            dirty = false; say(D.saved,
                true)
            return true
        }
        try {
            const row = d.id
                ? await updateDeck(session,
                    d.id,
                    {
                        name: d.name, cards: toDb(d.cards)
                    })
                : await createDeck(session,
                    d.name,
                    toDb(d.cards))
            d.id = row.id
            d.is_active = row.is_active
        } catch (e) { say(D.saveFail + (e as Error).message); return false }
        dirty = false; say(D.saved,
            true)
        return true
    }
    /** Chọn bộ đang xem làm bộ dùng khi vào trận */
    const activate = async () => {
        if (!session) return
        if ((dirty || !deck().id) && !await save()) return
        try { await activateDeck(session,
            deck().id!) } catch (e) { return say((e as Error).message) }
        decks.forEach((d) => (d.is_active = d === deck()))
        say(D.activated,
            true)
    }

    const render = () => {
        const scrollPositions = [".db-view",
            ".db-deck",
            ".db-search"].map((selector) => ({
            selector, top: root().querySelector<HTMLElement>(`${selector} > .game-scroll-viewport`)?.scrollTop ?? 0
        }))
        const d = deck(), err = deckError(d.cards), m = cardMeta(view)
        const gc = groupCounts(d.cards)
        const pool = DECK_POOL.filter((p) => group === "all" || p.group === group)
        const slots = Math.max(0,
            DECK_SIZE - d.cards.length)
        renderLobby(`
      <div class="db">
        <header class="lb-bar nine-header">
          <button class="lb-btn" id="db-back">${D.back}</button>
          <select id="db-pick" ${uid ? "" : "disabled"}>${decks.map((x, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${esc(x.name)}${x.is_active ? ` · ${D.active}` : ""}${x.id ? "" : ` ${D.unsaved}`}</option>`).join("")}</select>
          <b class="db-cap ${err ? "bad" : "ok"}" aria-label="${isEn() ? "Deck size" : "Số lá trong bộ"}" aria-live="polite">${D.count(d.cards.length)}</b>
          <button class="lb-btn" id="db-new" ${uid ? "" : "disabled"}>${D.newDeck}</button>
          <button class="lb-btn" id="db-sample">${D.sample}</button>
          <button class="lb-btn" id="db-rename">${D.rename}</button>
          <button class="lb-btn" id="db-del" ${uid && decks.length > 1 && d.id ? "" : "disabled"}>${D.del}</button>
          <span class="db-gap"></span>
          <span class="lb-msg ${msgOk ? "ok" : ""}">${esc(msg || (dirty ? D.dirty : ""))}</span>
          ${langSelect()}
          <button class="lb-btn" id="db-save" ${err ? "disabled" : ""}>${D.save}</button>
          <button class="lb-btn gold" id="db-use" ${err || !uid ? "disabled" : ""}>${d.is_active ? D.active : D.use}</button>
        </header>
        <div class="db-body">
          <aside class="db-view lb-panel nine-tooltip">
            ${tile(view)}
            <h3>${esc(m.name)}</h3>
            <p class="db-type cg-${m.group}">${groupName(m.group)}</p>
            <p class="db-desc">${esc(m.desc)}</p>
            <div class="db-actions"><button class="lb-btn" id="db-add" ${d.cards.length >= DECK_SIZE || countOf(view) >= maxOf(view) ? "disabled" : ""}>${D.add}</button><button class="lb-btn" id="db-rem" ${countOf(view) ? "" : "disabled"}>${D.rem}</button><b class="db-owned"><span>${isEn() ? "In deck" : "Trong bộ"}</span><strong>${countOf(view)}/${maxOf(view)}</strong></b></div>
          </aside>
          <section class="db-deck lb-panel nine-tray" id="db-drop">
            <h2>${esc(d.name)} <span class="${err ? "bad" : "ok"}">${D.count(d.cards.length)}</span></h2>
            <div class="db-stats"><div class="db-chips">
              <span class="db-chip cg-basic">${groupName("basic")} <b>${gc.basic}</b></span>
              <span class="db-chip cg-spell">${groupName("spell")} <b>${gc.spell}</b></span>
              <span class="db-chip cg-gold">${groupName("gold")} <b>${gc.gold}</b></span>
              <span class="db-chip cg-item">${groupName("item")} <b>${gc.item}</b></span>
            </div><small class="lb-hint">${D.summary(gc.basic,
        gc.spell,
        gc.gold,
        gc.item)}</small></div>
            <p class="lb-hint ${err ? "bad" : ""}">${err ? esc(err) : D.removeHint}</p>
            <div class="db-grid">${d.cards.map((id) => tile(id,
        `draggable="true" data-card="${id}" data-from="deck"`)).join("")}
              ${Array.from({
        length: slots
    },
    () => "<div class=\"db-slot nine-slot\"></div>").join("")}</div>
          </section>
          <aside class="db-search lb-panel nine-panel" id="db-pool">
            <div class="lb-tabs">${(["all",
        "basic",
        "spell",
        "gold",
        "item"] as const).map((k) => `<button data-g="${k}" class="${group === k ? "on" : ""}">${k === "all" ? D.all : groupName(k)}</button>`).join("")}</div>
            <div class="db-list">${pool.map((p) => {
        const mm = cardMeta(p.id), n = countOf(p.id)
        return `
              <div class="db-row ${view === p.id ? "on" : ""} ${n >= p.max ? "full" : ""}" draggable="true" data-card="${p.id}" data-from="pool">
                ${tile(p.id)}<div><b>${esc(mm.name)}</b><small>${groupName(p.group)}</small></div><span>${n}/${p.max}</span>
              </div>`
    }).join("")}</div>
            <p class="lb-hint">${D.poolHint}</p>
          </aside>
        </div>
      </div>`)
        wire()
        for (const { selector, top } of scrollPositions) root().querySelector<HTMLElement>(`${selector} > .game-scroll-viewport`)?.scrollTo({
            top
        })
    }

    const wire = () => {
        const r = root(), $ = <T extends HTMLElement>(s: string) => r.querySelector<T>(s)!
        wireLang()
        $("#db-back").onclick = async () => {
            if (!dirty || await lobbyChoice({
                title: isEn() ? "Unsaved changes" : "Thay đổi chưa lưu", description: D.discard, confirm: isEn() ? "Discard changes" : "Bỏ thay đổi"
            })) homeView(me)
        }
        $<HTMLSelectElement>("#db-pick").onchange = (e) => {
            cur = Number((e.target as HTMLSelectElement).value); dirty = !deck().id; view = deck().cards[0] ?? view; say("")
        }
        $("#db-new").onclick = async () => {
            const name = await lobbyChoice({
                title: D.newDeck, description: isEn() ? "Start an empty deck, then add 80 cards before saving." : "Tạo bộ bài trống, sau đó xếp đủ 80 lá trước khi lưu.", confirm: isEn() ? "Create deck" : "Tạo bộ bài", value: `${D.firstName} ${decks.length + 1}`
            })
            if (!name) return
            decks.push({
                id: null, name: name.slice(0,
                    32), cards: [], is_active: false
            })
            cur = decks.length - 1; dirty = true; say("")
        }
        $("#db-sample").onclick = () => { deck().cards = sortDeck(DEFAULT_DECK); dirty = true; say("") }
        $("#db-rename").onclick = async () => {
            const name = await lobbyChoice({
                title: D.rename, description: isEn() ? "Choose a name for your deck. Its cards stay the same." : "Đặt tên để dễ nhận ra bộ bài của bạn.", confirm: isEn() ? "Rename" : "Đổi tên", value: deck().name
            })
            if (name) { deck().name = name.slice(0,
                32); dirty = true; render() }
        }
        $("#db-del").onclick = async () => {
            if (!deck().id || !await lobbyChoice({
                title: isEn() ? "Delete deck" : "Xoá bộ bài", description: `${deck().name} — ${D.delConfirm}`, confirm: isEn() ? "Delete deck" : "Xoá bộ bài", destructive: true
            })) return
            if (!session) return
            try { await deleteDeck(session,
                deck().id!) } catch (e) { return say((e as Error).message) }
            decks.splice(cur,
                1); cur = 0; dirty = false; say(D.deleted,
                true)
        }
        $("#db-save").onclick = () => { void save() }
        $("#db-use").onclick = () => { void activate() }
        $("#db-add").onclick = () => add(view)
        $("#db-rem").onclick = () => remove(view)
        r.querySelectorAll<HTMLButtonElement>("#db-pool .lb-tabs button").forEach((b) => b.onclick = () => { group = b.dataset.g as typeof group; r.querySelector<HTMLElement>("#db-pool > .game-scroll-viewport")?.scrollTo({
            top: 0
        }); render() })
        // bấm để xem, bấm đúp để thêm/bớt, kéo thả giữa kho và bộ bài
        r.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
            const id = el.dataset.card as DeckCardId, from = el.dataset.from!
            el.onclick = () => { view = id; render() }
            el.ondblclick = () => (from === "pool" ? add(id) : remove(id))
            el.ondragstart = (e) => e.dataTransfer!.setData("text/plain",
                `${from}|${id}`)
        })
        const zone = (el: HTMLElement, accept: string, act: (id: DeckCardId) => void) => {
            el.ondragover = (e) => { e.preventDefault(); el.classList.add("drop") }
            el.ondragleave = () => el.classList.remove("drop")
            el.ondrop = (e) => {
                e.preventDefault(); el.classList.remove("drop")
                const [from,
                    id] = (e.dataTransfer!.getData("text/plain") || "|").split("|")
                if (from === accept && id) act(id as DeckCardId)
            }
        }
        zone($("#db-drop"),
            "pool",
            add)
        zone($("#db-pool"),
            "deck",
            remove)
    }
    render()
}
