// Ngoài trận: đăng nhập (Supabase Auth) → Sảnh (đấu nhanh, phòng riêng, vào bằng mã) → Xây bộ bài kiểu DuelingBook.
// Bộ bài đọc/ghi thẳng từ client, được RLS trên Supabase bảo vệ (mỗi người chỉ thấy bộ của mình).
// Mọi chữ qua t() (i18n), không dùng icon; khung panel dùng 9-slice chung (nine.ts).
import {
    createClient, type Session
} from "@supabase/supabase-js"
import {
    LANGS, Lang, getLang, t,
} from "@starci/shared"
import {
    DECK_POOL, DECK_SIZE, DEFAULT_DECK, cardMeta, deckError, fromDb, groupCounts, groupName, isEn, loadLocalDeck, maxOf, saveLocalDeck, sortDeck, toDb,
    type DeckCardGroup, type DeckCardId,
} from "./card/deckStore"
import "./lobby.css"

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

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
const esc = (s: string) => s.replace(/[&<>"']/g,
    (c) => `&#${c.charCodeAt(0)};`)
/** Chọn ngôn ngữ: lưu lại rồi tải lại trang (dữ liệu game được đổi tên lúc khởi động) */
const langSelect = () => `<select class="lb-lang" id="lb-lang" title="${t("lang")}">${LANGS.map((l) =>
    `<option value="${l.id}" ${l.id === getLang() ? "selected" : ""}>${l.name}</option>`).join("")}</select>`
function wireLang() {
    const sel = root().querySelector<HTMLSelectElement>("#lb-lang")
    if (sel) sel.onchange = () => { try { localStorage.setItem("lang",
sel.value as Lang) } catch { /* chế độ riêng tư */ } location.reload() }
}

let finish: (e: Entry) => void = () => {}

/** Hiện màn ngoài trận, trả về khi người chơi vào trận */
export function showLobby(): Promise<Entry> {
    return new Promise((resolve) => {
        finish = (e) => { Object.assign(entry,
            e); root().remove(); resolve(e) }
        supabase.auth.getSession().then(async ({ data }) => (data.session ? homeView(await meOf(data.session)) : loginView()))
    })
}

async function meOf(session: Session): Promise<Me> {
    const { data } = await supabase.from("profiles").select("display_name").eq("id",
        session.user.id).maybeSingle()
    return {
        session, name: data?.display_name ?? session.user.email ?? t("player")
    }
}

async function play(me: Me, mode: JoinMode) {
    const { data } = await supabase.auth.getSession() // token mới nhất (có thể đã tự làm mới)
    finish({
        token: data.session?.access_token, name: me.name, mode
    })
}

// ================= ĐĂNG NHẬP =================

function loginView(mode: "in" | "up" = "in", msg = "") {
    root().innerHTML = `
    <div class="lb-center"><div class="lb-card nine-panel">
      <div class="lb-head"><h1 class="lb-logo">StarCi League</h1>${langSelect()}</div>
      <div class="lb-tabs">
        <button data-m="in" class="${mode === "in" ? "on" : ""}">${t("login.tab_in")}</button>
        <button data-m="up" class="${mode === "up" ? "on" : ""}">${t("login.tab_up")}</button>
      </div>
      <form id="lb-form">
        ${mode === "up" ? `<label>${t("login.name")}<input name="name" required maxlength="24" placeholder="${t("login.name_ph")}"></label>` : ""}
        <label>${t("login.email")}<input name="email" type="email" required placeholder="you@gmail.com" autocomplete="email"></label>
        <label>${t("login.password")}<input name="password" type="password" required minlength="6" autocomplete="${mode === "up" ? "new-password" : "current-password"}"></label>
        <p class="lb-msg">${esc(msg)}</p>
        <button class="lb-btn gold wide" type="submit">${mode === "in" ? t("login.submit_in") : t("login.submit_up")}</button>
      </form>
      <button class="lb-link" id="lb-guest">${t("login.guest")}</button>
    </div></div>`
    wireLang()
    root().querySelectorAll<HTMLButtonElement>(".lb-tabs button").forEach((b) => b.onclick = () => loginView(b.dataset.m as "in" | "up"))
  root().querySelector<HTMLButtonElement>("#lb-guest")!.onclick = () => homeView({
      session: null, name: `${t("guest")} ${Math.floor(Math.random() * 900 + 100)}`
  })
  root().querySelector<HTMLFormElement>("#lb-form")!.onsubmit = async (ev) => {
      ev.preventDefault()
      const f = new FormData(ev.target as HTMLFormElement)
      const email = String(f.get("email")), password = String(f.get("password"))
      const res = mode === "in"
          ? await supabase.auth.signInWithPassword({
              email, password
          })
          : await supabase.auth.signUp({
              email, password, options: {
                  data: {
                      display_name: String(f.get("name"))
                  }
              }
          })
      if (res.error) return loginView(mode,
          res.error.message)
      if (!res.data.session) return loginView("in",
          t("login.check_email"))
      homeView(await meOf(res.data.session))
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
        title: "Base deck", hint: "20 cards: support, Gold and item components. Each champion adds its own 20 support cards and skills when summoned.",
        open: "Build deck", openSub: "Edit and choose your active deck", active: "Active", unsaved: "(unsaved)", back: "Back",
        newDeck: "New", sample: "Sample deck", rename: "Rename", del: "Delete", save: "Save", use: "Use this deck", dirty: "Unsaved changes",
        add: "Add", rem: "Remove", all: "All", loading: "Loading…", firstName: "My deck", newPrompt: "New deck name", renamePrompt: "Deck name",
        delConfirm: "Delete this deck?", discard: "Discard unsaved changes?", saved: "Saved", activated: "Deck selected for matches", deleted: "Deleted",
        full: `The deck already has ${DECK_SIZE} cards`, maxCopies: "Max copies reached", saveFail: "Save failed: ", removeHint: "Double-click or Remove to take a card out; drag cards from the right.",
        poolHint: "Click to view, double-click or drag to add.", guest: "Guest deck is stored on this device only.", cards: "cards", count: (n: number) => `${n}/${DECK_SIZE}`,
        summary: (b: number, s: number, g: number, i: number) => `Basic ${b} · Spells ${s} · Gold ${g} · Items ${i}`,
    }
    : {
        title: "Bộ bài", hint: "20 lá: hỗ trợ, Vàng và mảnh Đồ. Mỗi tướng khi ra sân thêm 20 lá hỗ trợ riêng và các chiêu của mình.",
        open: "Xếp bộ bài", openSub: "Chỉnh sửa và chọn bộ đang dùng", active: "Đang dùng", unsaved: "(chưa lưu)", back: "Quay lại",
        newDeck: "Bộ mới", sample: "Bộ mẫu", rename: "Đổi tên", del: "Xoá", save: "Lưu", use: "Dùng bộ này", dirty: "Có thay đổi chưa lưu",
        add: "Thêm", rem: "Bớt", all: "Tất cả", loading: "Đang tải…", firstName: "Bộ của tôi", newPrompt: "Tên bộ mới", renamePrompt: "Tên bộ bài",
        delConfirm: "Xoá bộ này?", discard: "Bỏ các thay đổi chưa lưu?", saved: "Đã lưu", activated: "Đã chọn bộ này cho trận đấu", deleted: "Đã xoá",
        full: `Bộ đã đủ ${DECK_SIZE} lá`, maxCopies: "Đã đủ số bản tối đa", saveFail: "Lưu thất bại: ", removeHint: "Bấm đúp hoặc Bớt để bỏ lá; kéo lá từ kho bên phải vào.",
        poolHint: "Bấm để xem, bấm đúp hoặc kéo để thêm.", guest: "Bộ của khách chỉ lưu trên máy này.", cards: "lá", count: (n: number) => `${n}/${DECK_SIZE}`,
        summary: (b: number, s: number, g: number, i: number) => `Đánh thường ${b} · Bổ trợ ${s} · Vàng ${g} · Đồ ${i}`,
    }

/** Ô lá bài gọn: tranh + tên (+ số bản) */
/** Khung + badge theo loại lá: Đánh thường = combat, Bổ trợ = spell, Vàng = stat, Đồ = item */
const FRAME_KIND: Record<string, string> = {
    basic: "combat", spell: "spell", gold: "stat", item: "item",
}
function tile(id: DeckCardId, attrs = "", n = 0) {
    const m = cardMeta(id)
    const kind = FRAME_KIND[m.group] ?? "spell"
    return `<div class="cgc ${m.group}" ${attrs} title="${esc(m.name)}"><div class="cv ${kind}"><div class="cv-in">
    <img class="cv-badge" src="/ui/badge/${kind}.png" alt="" draggable="false" onerror="this.remove()">
    <div class="cv-icon"><img class="cv-art" src="${m.art}" alt="" draggable="false" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='${m.fallback}'}else{this.style.visibility='hidden'}"></div>
    <b class="cv-name">${esc(m.name)}</b>
  </div></div>${n > 0 ? `<i class="cgc-n">×${n}</i>` : ""}</div>`
}

/** Các bộ thẻ bài của người chơi (chỉ bộ có mọi lá bắt đầu bằng "cg:") */
async function loadCgDecks(uid: string): Promise<CgDeck[]> {
    const { data } = await supabase.from("decks").select("id, name, cards, is_active").eq("owner_id",
        uid).order("created_at")
    const out: CgDeck[] = []
    for (const d of (data ?? []) as { id: string; name: string; cards: string[]; is_active: boolean }[]) {
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
        const decks = await loadCgDecks(me.session.user.id)
        active = decks.find((d) => d.is_active)?.cards ?? DEFAULT_DECK
    }
    if (deckError(active)) active = DEFAULT_DECK
    const counts = groupCounts(active)
    const mini = [...new Set(sortDeck(active))].map((id) => tile(id,
        "",
        active.filter((x) => x === id).length)).join("")
    root().innerHTML = `
    <div class="lb-home">
      <header class="lb-bar nine-header">
        <span class="lb-logo">StarCi League</span>
        <div class="lb-user">${langSelect()}<span class="lb-avatar">${esc(me.name.slice(0,
    1).toUpperCase())}</span>
          <div><b>${esc(me.name)}</b><small>${me.session ? esc(me.session.user.email ?? "") : t("guest")}</small></div>
          <button class="lb-btn" id="lb-out">${me.session ? t("home.signout") : t("home.signin")}</button></div>
      </header>
      <main class="lb-menu">
        <section class="lb-panel nine-panel lb-card-mode">
          <h2>${CG.title}<span class="lb-new">${CG.badge}</span></h2>
          <p class="lb-hint">${CG.hint}</p>
          <button class="lb-tile gold" id="lb-cg-quick"><b>${CG.quick}</b><small>${CG.quickSub}</small></button>
          <div class="lb-bots">
            <button class="lb-tile" id="lb-cg-easy"><b>${CG.easy}</b><small>${CG.easySub}</small></button>
            <button class="lb-tile" id="lb-cg-hard"><b>${CG.hard}</b><small>${CG.hardSub}</small></button>
          </div>
          <form class="lb-code" id="lb-cg-join"><input name="code" required placeholder="${CG.codePh}" autocomplete="off"><button class="lb-btn">${CG.join}</button></form>
          <p class="lb-msg">${esc(msg)}</p>
        </section>
        <section class="lb-panel nine-panel">
          <h2>${D.title}<small>${D.count(active.length)}</small></h2>
          <p class="lb-hint">${D.hint}</p>
          <p class="lb-hint"><b>${D.summary(counts.basic,
        counts.spell,
        counts.gold,
        counts.item)}</b></p>
          <div class="lb-mini nine-tray">${mini}</div>
          <button class="lb-tile" id="lb-deck"><b>${D.open}</b><small>${me.session ? D.openSub : D.guest}</small></button>
        </section>
      </main>
    </div>`
    wireLang()
    const $ = <T extends HTMLElement>(s: string) => root().querySelector<T>(s)!
    $("#lb-out").onclick = async () => { if (me.session) await supabase.auth.signOut(); loginView() }
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
// Trái: chi tiết lá · Giữa: bộ đang xếp (20 lá) · Phải: kho DECK_POOL. Bấm để xem, bấm đúp hoặc kéo thả để thêm/bớt.

async function cardDeckBuilder(me: Me) {
    root().innerHTML = `<div class="lb-center"><p class="lb-hint">${D.loading}</p></div>`
    const uid = me.session?.user.id ?? null
    let decks: CgDeck[] = uid ? await loadCgDecks(uid) : []
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
        if (!uid) {
            if (!saveLocalDeck(d.cards)) { say(D.saveFail); return false }
            dirty = false; say(D.saved,
                true)
            return true
        }
        const body = {
            name: d.name, cards: toDb(d.cards), updated_at: new Date().toISOString()
        }
        const res = d.id
            ? await supabase.from("decks").update(body).eq("id",
                d.id).select("id").single()
            : await supabase.from("decks").insert({
                ...body, owner_id: uid, is_active: !decks.some((x) => x.id && x.is_active)
            }).select("id, is_active").single()
        if (res.error) { say(D.saveFail + res.error.message); return false }
        d.id = res.data.id
        if ("is_active" in res.data) d.is_active = !!res.data.is_active
        dirty = false; say(D.saved,
            true)
        return true
    }
    /** Chọn bộ đang xem làm bộ dùng khi vào trận */
    const activate = async () => {
        if (!uid) return
        if ((dirty || !deck().id) && !await save()) return
        await supabase.from("decks").update({
            is_active: false
        }).eq("owner_id",
            uid).eq("is_active",
            true)
        const { error } = await supabase.from("decks").update({
            is_active: true
        }).eq("id",
            deck().id!)
        if (error) return say(error.message)
        decks.forEach((d) => (d.is_active = d === deck()))
        say(D.activated,
            true)
    }

    const render = () => {
        const d = deck(), err = deckError(d.cards), m = cardMeta(view)
        const gc = groupCounts(d.cards)
        const pool = DECK_POOL.filter((p) => group === "all" || p.group === group)
        const slots = Math.max(0,
            DECK_SIZE - d.cards.length)
        root().innerHTML = `
      <div class="db">
        <header class="lb-bar nine-header">
          <button class="lb-btn" id="db-back">${D.back}</button>
          <select id="db-pick" ${uid ? "" : "disabled"}>${decks.map((x, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${esc(x.name)}${x.is_active ? ` · ${D.active}` : ""}${x.id ? "" : ` ${D.unsaved}`}</option>`).join("")}</select>
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
            <div class="db-actions"><button class="lb-btn" id="db-add">${D.add}</button><button class="lb-btn" id="db-rem">${D.rem}</button><b>${countOf(view)}/${maxOf(view)}</b></div>
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
      </div>`
        wire()
    }

    const wire = () => {
        const r = root(), $ = <T extends HTMLElement>(s: string) => r.querySelector<T>(s)!
        wireLang()
        $("#db-back").onclick = () => (!dirty || confirm(D.discard)) && homeView(me)
        $<HTMLSelectElement>("#db-pick").onchange = (e) => {
            cur = Number((e.target as HTMLSelectElement).value); dirty = !deck().id; view = deck().cards[0] ?? view; say("")
        }
        $("#db-new").onclick = () => {
            const name = prompt(D.newPrompt,
                `${D.firstName} ${decks.length + 1}`)?.trim()
            if (!name) return
            decks.push({
                id: null, name: name.slice(0,
                    32), cards: [], is_active: false
            })
            cur = decks.length - 1; dirty = true; say("")
        }
        $("#db-sample").onclick = () => { deck().cards = sortDeck(DEFAULT_DECK); dirty = true; say("") }
        $("#db-rename").onclick = () => {
            const name = prompt(D.renamePrompt,
                deck().name)?.trim()
            if (name) { deck().name = name.slice(0,
                32); dirty = true; render() }
        }
        $("#db-del").onclick = async () => {
            if (!deck().id || !confirm(D.delConfirm)) return
            const { error } = await supabase.from("decks").delete().eq("id",
                deck().id!)
            if (error) return say(error.message)
            decks.splice(cur,
                1); cur = 0; dirty = false; say(D.deleted,
                true)
        }
        $("#db-save").onclick = () => { void save() }
        $("#db-use").onclick = () => { void activate() }
        $("#db-add").onclick = () => add(view)
        $("#db-rem").onclick = () => remove(view)
        r.querySelectorAll<HTMLButtonElement>("#db-pool .lb-tabs button").forEach((b) => b.onclick = () => { group = b.dataset.g as typeof group; render() })
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
