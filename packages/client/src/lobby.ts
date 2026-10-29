// Ngoài trận: đăng nhập (Supabase Auth) → Sảnh (đấu nhanh, phòng riêng, vào bằng mã) → Xây bộ bài kiểu DuelingBook.
// Bộ bài đọc/ghi thẳng từ client, được RLS trên Supabase bảo vệ (mỗi người chỉ thấy bộ của mình).
// Mọi chữ qua t() (i18n), không dùng icon; khung panel dùng 9-slice chung (nine.ts).
import {
    createClient, type Session
} from "@supabase/supabase-js"
import {
    CARDS, DECK, DECK_COPIES, DECK_KINDS, DECK_KIND_NAME, DECK_MAX, DECK_MIN, DeckKind, LANGS, Lang, ItemCard, PRESET_DECKS, PlayCard, TrapCard,
    KIND_LIMIT, copyLimit, deckError, deckPool, getLang, keywordParts, keywordsIn, t,
} from "@starci/shared"
import "./lobby.css"

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

/** Cách vào phòng: đấu nhanh (ghép ngẫu nhiên), tạo phòng riêng (có mã), vào phòng bằng mã */
export type JoinMode = { kind: "quick" } | { kind: "create" } | { kind: "join"; roomId: string } | { kind: "bot"; level: "easy" | "hard" }
  /** Chế độ thẻ bài (phòng "card"): đấu máy, vào phòng bằng mã, hoặc ghép ngẫu nhiên */
  | { kind: "card"; bot?: "easy" | "hard"; roomId?: string };
/** Thông tin mang vào trận: token để server xác thực, tên, cách vào phòng */
export interface Entry { token?: string; name: string; mode: JoinMode }
/** Người chơi đã chọn ở sảnh (BoardScene đọc khi vào phòng) */
export const entry: Entry = {
    name: "", mode: {
        kind: "quick"
    }
}

interface Deck { id: string | null; name: string; cards: string[]; is_active: boolean }
interface Me { session: Session | null; name: string }

const root = () => document.getElementById("lobby")!
const esc = (s: string) => s.replace(/[&<>"']/g,
    (c) => `&#${c.charCodeAt(0)};`)
/** Mô tả kiểu tooltip LoL: từ khóa hiệu ứng in đậm, icon đứng trước */
const kwHtml = (text: string) => keywordParts(text).map((part) => typeof part === "string" ? esc(part)
    : "num" in part ? `<b class="num">${esc(part.text)}</b>`
        : `<b class="kw ${part.kw.good ? "good" : "bad"}"><img src="/${part.kw.icon}" alt="">${esc(part.text)}</b>`).join("")
/** Chú giải các hiệu ứng có trong mô tả */
const kwGloss = (texts: (string | undefined)[]) => {
    const kws = keywordsIn(texts)
    return kws.length ? `<div class="kw-gloss">${kws.map((k) => `<p><b class="kw ${k.good ? "good" : "bad"}"><img src="/${k.icon}" alt="">${esc(k.name)}</b> ${kwHtml(k.desc)}</p>`).join("")}</div>` : ""
}
const card = (id: string) => CARDS[id] as PlayCard | TrapCard | ItemCard
/** Tranh lá: thẻ mảnh đồ dùng tranh món đồ */
const cardArt = (id: string) => { const c = card(id); return c.kind === "item" ? `items_art/${c.itemId}.jpg` : `cards/${id}.jpg` }
const KIND = DECK_KIND_NAME
/** Cách dùng từng loại bài (gọi lúc vẽ để theo ngôn ngữ đã chọn) */

/** Chọn ngôn ngữ: lưu lại rồi tải lại trang (dữ liệu game được đổi tên lúc khởi động) */
const langSelect = () => `<select class="lb-lang" id="lb-lang" title="${t("lang")}">${LANGS.map((l) =>
    `<option value="${l.id}" ${l.id === getLang() ? "selected" : ""}>${l.name}</option>`).join("")}</select>`
function wireLang() {
    const sel = root().querySelector<HTMLSelectElement>("#lb-lang")
    if (sel) sel.onchange = () => { try { localStorage.setItem("lang",
sel.value as Lang) } catch { /* chế độ riêng tư */ } location.reload() }
}

/** Lá bài gọn: icon vuông + tên + viên mana, viền màu theo loại (cùng bố cục với art.ts drawIconCard). Mô tả nằm ở ô chi tiết. */
function cardHtml(id: string, attrs = "") {
    const c = card(id)
    return `<div class="cv ${c.kind}" ${attrs} title="${esc(c.name)}"><div class="cv-in">
    <img class="cv-badge" src="ui/badge/${c.kind}.png" alt="" draggable="false" onerror="this.remove()">
    <div class="cv-icon"><img class="cv-art" src="${cardArt(id)}" alt="" draggable="false" onerror="this.style.visibility='hidden'">
      <img class="cv-frame" src="ui/iconframe-${c.kind}.png" alt="" draggable="false" onerror="this.remove()"></div>
    <b class="cv-name">${esc(c.name)}</b>
  </div></div>`
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

async function homeView(me: Me, msg = "") {
    let active: Deck | null = null
    if (me.session) {
        const { data } = await supabase.from("decks").select("id, name, cards, is_active").eq("owner_id",
            me.session.user.id).eq("is_active",
            true).maybeSingle()
        active = data
    }
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
          <h2>${t("home.deck")}</h2>
          <p class="lb-hint">${t("home.deck_hint",
        {
            min: DECK_MIN, max: DECK_MAX, copies: DECK_COPIES
        })}</p>
          <div class="lb-mini nine-tray">${(active?.cards ?? DECK).slice(0,
        20).map((id) => cardHtml(id)).join("")}</div>
          <button class="lb-tile" id="lb-deck" ${me.session ? "" : "disabled"}><b>${t("home.builder")}</b><small>${me.session ? t("home.builder_sub") : t("home.need_login")}</small></button>
        </section>
      </main>
    </div>`
    wireLang()
    const $ = <T extends HTMLElement>(s: string) => root().querySelector<T>(s)!
    $("#lb-out").onclick = async () => { if (me.session) await supabase.auth.signOut(); loginView() }
    $("#lb-deck").onclick = () => deckBuilder(me)
    $("#lb-cg-quick").onclick = () => play(me,
        {
            kind: "card"
        })
    $("#lb-cg-easy").onclick = () => play(me,
        {
            kind: "card", bot: "easy"
        })
    $("#lb-cg-hard").onclick = () => play(me,
        {
            kind: "card", bot: "hard"
        })
    $<HTMLFormElement>("#lb-cg-join").onsubmit = (ev) => {
        ev.preventDefault()
        const code = String(new FormData(ev.target as HTMLFormElement).get("code")).trim()
        if (code) play(me,
            {
                kind: "card", roomId: code
            })
    }
}

// ================= XÂY BỘ BÀI (kiểu DuelingBook) =================
// Trái: xem lá bài · Giữa: bộ bài đang xếp · Phải: kho bài (tìm, lọc). Kéo thả hoặc bấm đúp để thêm/bớt.

async function deckBuilder(me: Me) {
    root().innerHTML = `<div class="lb-center"><p class="lb-hint">${t("db.loading")}</p></div>`
    const uid = me.session!.user.id
    const { data } = await supabase.from("decks").select("id, name, cards, is_active").eq("owner_id",
        uid).order("created_at")
    const decks: Deck[] = data?.length ? data : [{
        id: null, name: t("db.first_name"), cards: [...DECK], is_active: true
    }]
    let cur = Math.max(0,
        decks.findIndex((d) => d.is_active))
    let view = decks[cur].cards[0] ?? deckPool()[0]
    let query = "", kind: "all" | DeckKind = "all", dirty = !data?.length, msg = "", msgOk = false
    const say = (text: string, ok = false) => { msg = text; msgOk = ok; render() }

    const deck = () => decks[cur]
    const add = (id: string) => {
        const n = deck().cards.filter((c) => c === id).length
        if (n >= copyLimit(id)) return say(t("db.copies_max",
            {
                name: card(id).name, n: copyLimit(id)
            }))
        const k = card(id).kind as DeckKind
        if (deck().cards.filter((c) => card(c).kind === k).length >= KIND_LIMIT[k]) return say(t("err.kind_max",
            {
                kind: KIND[k], n: KIND_LIMIT[k]
            }))
        if (deck().cards.length >= DECK_MAX) return say(t("db.deck_max",
            {
                n: DECK_MAX
            }))
        deck().cards.push(id); deck().cards.sort(); dirty = true; view = id; say("")
    }
    const remove = (id: string) => {
        const i = deck().cards.indexOf(id)
        if (i >= 0) { deck().cards.splice(i,
            1); dirty = true; say("") }
    }

    /** Lưu bộ đang chọn (tạo mới nếu chưa có id) */
    const save = async () => {
        const d = deck(), err = deckError(d.cards)
        if (err) return say(err)
        const body = {
            name: d.name, cards: d.cards, updated_at: new Date().toISOString()
        }
        const res = d.id
            ? await supabase.from("decks").update(body).eq("id",
                d.id).select("id").single()
            : await supabase.from("decks").insert({
                ...body, owner_id: uid, is_active: !decks.some((x) => x.id && x.is_active)
            }).select("id, is_active").single()
        if (res.error) return say(t("db.save_fail",
            {
                e: res.error.message
            }))
        d.id = res.data.id
        if ("is_active" in res.data) d.is_active = !!res.data.is_active
        dirty = false; say(t("db.saved"),
            true)
    }
    /** Chọn bộ đang xem làm bộ dùng khi vào trận */
    const activate = async () => {
        if (dirty || !deck().id) await save()
        if (!deck().id) return
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
        say(t("db.activated"),
            true)
    }

    const render = () => {
        const d = deck(), err = deckError(d.cards), c = card(view)
        const counts = new Map<string, number>()
        d.cards.forEach((id) => counts.set(id,
            (counts.get(id) ?? 0) + 1))
        const pool = deckPool().filter((id) => (kind === "all" || card(id).kind === kind)
      && (!query || `${card(id).name} ${card(id).desc}`.toLowerCase().includes(query.toLowerCase())))
        const byKind = DECK_KINDS.map((k) => `<span class="db-chip ${k}">${KIND[k]} <b>${d.cards.filter((id) => card(id).kind === k).length}/${KIND_LIMIT[k]}</b></span>`).join("")
        root().innerHTML = `
      <div class="db">
        <header class="lb-bar nine-header">
          <button class="lb-btn" id="db-back">${t("db.back")}</button>
          <select id="db-pick">${decks.map((x, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${esc(x.name)}${x.is_active ? ` · ${t("db.active")}` : ""}${x.id ? "" : ` ${t("db.unsaved")}`}</option>`).join("")}</select>
          <button class="lb-btn" id="db-new">${t("db.new")}</button>
          <select id="db-preset"><option value="">${t("db.preset")}</option>${PRESET_DECKS.map((p, i) => `<option value="${i}">${esc(p.name)}: ${esc(p.desc)}</option>`).join("")}</select>
          <button class="lb-btn" id="db-rename">${t("db.rename")}</button>
          <button class="lb-btn" id="db-del" ${decks.length > 1 && d.id ? "" : "disabled"}>${t("db.delete")}</button>
          <span class="db-gap"></span>
          <span class="lb-msg ${msgOk ? "ok" : ""}">${esc(msg || (dirty ? t("db.dirty") : ""))}</span>
          ${langSelect()}
          <button class="lb-btn" id="db-save">${t("db.save")}</button>
          <button class="lb-btn gold" id="db-use" ${err ? "disabled" : ""}>${d.is_active ? t("db.active") : t("db.use")}</button>
        </header>
        <div class="db-body">
          <aside class="db-view lb-panel nine-tooltip">
            ${cardHtml(view)}
            <h3>${esc(c.name)}</h3>
            <p class="db-type ${c.kind}"><img src="ui/badge/${c.kind}.png" alt="" onerror="this.remove()">${KIND[c.kind]}</p>
            <p class="db-desc">${[c.desc,
        ...(("bonus" in c && c.bonus) || [])].map(kwHtml).join("<br>")}</p>
            ${kwGloss([c.desc,
        ...(("bonus" in c && c.bonus) || [])])}
            <div class="db-actions"><button class="lb-btn" data-add="${view}">${t("db.add")}</button><button class="lb-btn" data-rem="${view}">${t("db.rem")}</button><b>${counts.get(view) ?? 0}/${copyLimit(view)}</b></div>
          </aside>
          <section class="db-deck lb-panel nine-tray" id="db-drop">
            <h2>${esc(d.name)} <span class="${err ? "bad" : "ok"}">${t("db.cards",
    {
        n: d.cards.length, max: DECK_MAX
    })}</span></h2>
            <div class="db-stats"><div class="db-chips">${byKind}</div></div>
            <p class="lb-hint">${err ? esc(err) : t("db.remove_hint")}</p>
            <div class="db-grid">${d.cards.map((id) => cardHtml(id,
        `draggable="true" data-card="${id}" data-from="deck"`)).join("")}
              ${Array.from({
        length: Math.max(0,
            DECK_MIN - d.cards.length)
    },
    () => "<div class=\"db-slot nine-slot\"></div>").join("")}</div>
          </section>
          <aside class="db-search lb-panel nine-panel" id="db-pool">
            <input id="db-q" placeholder="${t("db.search")}" value="${esc(query)}">
            <div class="lb-tabs">${(["all",
        ...DECK_KINDS] as const).map((k) => `<button data-k="${k}" class="${kind === k ? "on" : ""}">${k === "all" ? t("db.all") : KIND[k]}</button>`).join("")}</div>
            <div class="db-list">${pool.map((id) => `
              <div class="db-row ${view === id ? "on" : ""}" draggable="true" data-card="${id}" data-from="pool">
                ${cardHtml(id)}<div><b>${esc(card(id).name)}</b><small>${KIND[card(id).kind]}</small></div><span>${counts.get(id) ?? 0}</span>
              </div>`).join("") || `<p class="lb-hint">${t("db.none")}</p>`}</div>
            <p class="lb-hint">${t("db.pool_hint")}</p>
          </aside>
        </div>
      </div>`
        wire()
    }

    const wire = () => {
        const r = root(), $ = <T extends HTMLElement>(s: string) => r.querySelector<T>(s)!
        wireLang()
        $("#db-back").onclick = () => (!dirty || confirm(t("db.discard_confirm"))) && homeView(me)
        $<HTMLSelectElement>("#db-pick").onchange = (e) => { cur = Number((e.target as HTMLSelectElement).value); dirty = !deck().id; say("") }
        $("#db-new").onclick = () => {
            const name = prompt(t("db.new_prompt"),
                t("db.default_name",
                    {
                        n: decks.length + 1
                    }))?.trim()
            if (!name) return
            decks.push({
                id: null, name: name.slice(0,
                    32), cards: [], is_active: false
            })
            cur = decks.length - 1; dirty = true; say("")
        }
        $<HTMLSelectElement>("#db-preset").onchange = (e) => {
            const p = PRESET_DECKS[Number((e.target as HTMLSelectElement).value)]
            if (!p) return
            decks.push({
                id: null, name: p.name, cards: [...p.cards].sort(), is_active: false
            })
            cur = decks.length - 1; dirty = true; view = p.cards[0]; say("")
        }
        $("#db-rename").onclick = () => {
            const name = prompt(t("db.rename_prompt"),
                deck().name)?.trim()
            if (name) { deck().name = name.slice(0,
                32); dirty = true; render() }
        }
        $("#db-del").onclick = async () => {
            if (!deck().id || !confirm(t("db.del_confirm",
                {
                    name: deck().name
                }))) return
            const { error } = await supabase.from("decks").delete().eq("id",
deck().id!)
            if (error) return say(error.message)
            decks.splice(cur,
                1); cur = 0; say(t("db.deleted"),
                true)
        }
        $("#db-save").onclick = save
        $("#db-use").onclick = activate
        const q = $<HTMLInputElement>("#db-q")
        q.oninput = () => { query = q.value; render(); const n = root().querySelector<HTMLInputElement>("#db-q")!; n.focus(); n.setSelectionRange(query.length,
            query.length) }
        r.querySelectorAll<HTMLButtonElement>("#db-pool .lb-tabs button").forEach((b) => b.onclick = () => { kind = b.dataset.k as typeof kind; render() })
        r.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((b) => b.onclick = () => add(b.dataset.add!))
        r.querySelectorAll<HTMLButtonElement>("[data-rem]").forEach((b) => b.onclick = () => remove(b.dataset.rem!))
        // bấm để xem, bấm đúp để thêm/bớt, kéo thả giữa kho và bộ bài
        r.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
            const id = el.dataset.card!, from = el.dataset.from!
            el.onclick = () => { view = id; render() }
            el.ondblclick = () => (from === "pool" ? add(id) : remove(id))
            el.ondragstart = (e) => e.dataTransfer!.setData("text/plain",
                `${from}:${id}`)
        })
        const zone = (el: HTMLElement, accept: string, act: (id: string) => void) => {
            el.ondragover = (e) => { e.preventDefault(); el.classList.add("drop") }
            el.ondragleave = () => el.classList.remove("drop")
            el.ondrop = (e) => {
                e.preventDefault(); el.classList.remove("drop")
                const [from,
                    id] = (e.dataTransfer!.getData("text/plain") || ":").split(":")
                if (from === accept && id) act(id)
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
