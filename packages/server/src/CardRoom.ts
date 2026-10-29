// Phòng "card": đấu chế độ thẻ bài. Engine (cg) trong packages/shared là nguồn sự thật; phòng chỉ lo ghép người,
// chọn đội, kiểm tra hành động, ẩn thông tin bí mật khi gửi xuống client, và chạy bot. Giao thức: docs/CARDGAME_PROTOCOL.md.
import {
    Client, Room
} from "@colyseus/core"
import {
    Schema, type
} from "@colyseus/schema"
import {
    cg
} from "@starci/shared"
import {
    Player, authenticate
} from "./auth"

type Side = cg.Side;
type BotLevel = "easy" | "hard";
const SIDES: Side[] = ["A",
    "B"]
const other = (s: Side): Side => (s === "A" ? "B" : "A")

/** Schema tối thiểu để lobby/UI đơn giản đọc được; mọi chi tiết còn lại đi qua message JSON */
export class CardRoomState extends Schema {
  /** waiting (chờ đối thủ) · draft (chọn tướng) · playing · ended */
  @type("string") phase = "waiting"
  @type("string") nameA = ""
  @type("string") nameB = ""
  @type("uint16") round = 0
  @type("uint16") turnNo = 0
  /** Bên đang trong lượt ("A"/"B") */
  @type("string") active = ""
  /** Bên cần ra quyết định lúc này (khác active khi cửa sổ phản ứng mở) */
  @type("string") toMove = ""
  @type("string") reaction = ""
  @type("uint8") livesA = 0
  @type("uint8") livesB = 0
  @type("boolean") pickedA = false
  @type("boolean") pickedB = false
  @type("string") winner = ""
  /** lives · deck · left · resign · timeout · error */
  @type("string") endReason = ""
  @type("boolean") sim = false
}

type Hidden = { uid: string; hidden: true; temp?: true };
/** Lá úp: chỉ lộ uid; lá tạm (hiệu ứng tướng) vẫn lộ cờ temp để client biết nó sẽ tan biến cuối lượt */
const hidden = (c: cg.Card): Hidden => ({
    uid: c.uid, hidden: true, ...(c.temp ? {
        temp: true as const
    } : {
    })
})

const pickRand = <T,>(a: T[], rnd = Math.random) => a[Math.floor(rnd() * a.length)]

/** Số tướng tối đa mỗi bên được cấm */
const DRAFT_BANS = 2
/** Thời gian cho mỗi lượt cấm/chọn của người chơi */
const DRAFT_TURN_MS = 30_000
interface DraftTurn { side: Side; action: "ban" | "pick" }
/** Cấm xen kẽ A B A B..., rồi chọn kiểu rắn A · B B · A A · ... tới khi mỗi bên đủ `size` tướng */
function draftOrderOf(bans: number, size: number): DraftTurn[] {
    const out: DraftTurn[] = []
    for (let i = 0; i < bans * 2; i++) out.push({
        side: i % 2 === 0 ? "A" : "B", action: "ban"
    })
    for (let i = 0; i < size * 2; i++) out.push({
        side: Math.floor((i + 1) / 2) % 2 === 0 ? "A" : "B", action: "pick"
    })
    return out
}
const shuffled = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i],
    r[j]] = [r[j],
    r[i]] } return r }

const sigCard = (c: cg.Card | undefined) => (c ? `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}` : "?")

/** Hai hành động coi là một nếu khác nhau chỉ ở uid của các lá cùng loại (engine gộp lá trùng thành 1 lá đại diện) */
/** Token úp mặt của đối thủ: bỏ dữ liệu bí mật (secret, card) khỏi bản gửi cho `viewer` tới khi lật */
function unitsFor(s: cg.GameState, viewer: Side | null): cg.GameState["units"] {
    if (viewer === null) return s.units
    const out: cg.GameState["units"] = {
    }
    for (const [id,
        u] of Object.entries(s.units)) {
        out[id] = u.token?.hidden && u.side !== viewer ? {
            ...u, token: {
                ...u.token, secret: undefined, card: undefined
            }
        } : u
    }
    return out
}

/** Lá có args.pick bí mật với đối thủ (hiện không có: Gangplank úp Thùng giả qua HeroDef.handUse, không phát sự kiện play/chuỗi nên không lộ lá; secret của token Thùng đã bị lọc ở maskUnits) */
const SECRET_PICK_CARDS = new Set<string>()
const secretArgs = (card: cg.Card | undefined, args: cg.PlayArgs | undefined, owner: Side, viewer: Side | null): cg.PlayArgs | undefined => {
    if (!args || viewer === null || viewer === owner || !card || !SECRET_PICK_CARDS.has(card.id) || args.pick === undefined) return args
    const rest = {
        ...args
    }
    delete rest.pick
    return rest
}
/** Chuỗi đang mở theo người xem: che args.pick của lá bí mật bên kia */
function chainFor(chain: cg.Chain | null, viewer: Side | null): cg.Chain | null {
    if (!chain || viewer === null) return chain
    return {
        ...chain, links: chain.links.map((L) => {
            const args = secretArgs(L.card,
                L.args,
                L.side,
                viewer)
            return args === L.args ? L : {
                ...L, args: args ?? {
                }
            }
        })
    }
}
/** Lá trên cùng bộ của `side` mà hành động hợp lệ nhắc tới qua args.pick (Twisted Fate Q xem 3 lá): gửi riêng cho chủ bộ */
function peekFor(s: cg.GameState, side: Side, legal: cg.Action[]): cg.Card[] {
    const want = new Set<string>()
    for (const a of legal) if ((a.t === "play" || a.t === "chain") && a.args?.pick) want.add(a.args.pick)
    return want.size ? s.players[side].deck.filter((c) => want.has(c.uid)) : []
}

function actionKey(state: cg.GameState, a: cg.Action): string {
    const side = a.side
    const find = (uid: string) => state.players[side].hand.find((c) => c.uid === uid) ?? state.players[side].grave.find((c) => c.uid === uid)
    const cardsig = (uid: string) => sigCard(find(uid))
    const out: Record<string, unknown> = {
        ...a
    }
    if (a.t === "play" || a.t === "chain") {
        out.uid = cardsig(a.uid)
        if (a.args) {
            const args: Record<string, unknown> = {
                ...a.args
            }
            if (a.args.discard) args.discard = a.args.discard.map(cardsig).sort()
            if (a.args.pick && find(a.args.pick)) args.pick = cardsig(a.args.pick)
            if (a.args.targets) args.targets = [...a.args.targets].sort()
            out.args = args
        }
    } else if (a.t === "craft") {
        out.items = a.items.map(cardsig).sort()
        out.gold = cardsig(a.gold)
    }
    return JSON.stringify(out,
        Object.keys(out).sort())
}

export class CardRoom extends Room<CardRoomState> {
    maxClients = 2
    private gs: cg.GameState | null = null
    private sides = new Map<string, Side>() // sessionId -> phe (người chơi)
    private names: Record<Side, string> = {
        A: "", B: ""
    }
    private bots: Partial<Record<Side, BotLevel>> = {
    }
    private picks: Partial<Record<Side, string[]>> = {
    }
    private preset: Partial<Record<Side, string[]>> = {
    }
    private pool: string[] = []
    private teamSize = 5
    private fast = false
    private sim = false
    private seed = 0
    /** Nhịp mỗi hành động của máy (ms): đủ chậm để người xem kịp theo dõi hoạt cảnh */
    private pace = 2500
    private stepping = false
    private disposed = false
    private botTimer: { clear(): void } | null = null
    private draftTimer: { clear(): void } | null = null
    /** Cấm/chọn kiểu LMHT: thứ tự lượt, lượt hiện tại, tướng bị cấm, tướng đã chọn từng bên */
    private draftOrder: DraftTurn[] = []
    private draftStep = 0
    private banCount = 0
    private bans: string[] = []
    private chosen: Record<Side, string[]> = {
        A: [], B: []
    }
    /** Bộ gốc 40 lá mỗi bên (người chơi tự xếp; thiếu/sai thì DEFAULT_DECK, máy và sim luôn DEFAULT_DECK); engine thêm 45 lá chiêu của 5 tướng => 85 */
    private decks: Partial<Record<Side, cg.DeckCardId[]>> = {
    }
    /** Số hành động bot trong trận (chống vòng lặp vô hạn ở phòng sim) */
    private steps = 0
    /** Tay đối phương đang được lộ cho người xem (hiệu ứng kiểu TF R): viewer -> các phe bị lộ, xoá sau message state kế */
    private revealed: Record<Side, Set<Side>> = {
        A: new Set(), B: new Set()
    }

    onCreate(options: { private?: boolean; bot?: BotLevel; fast?: boolean; sim?: boolean; seed?: number }) {
        this.setState(new CardRoomState())
        this.fast = !!options?.fast
        this.pace = this.fast ? 0 : 2500
        this.sim = !!options?.sim
        this.state.sim = this.sim
        this.seed = Number.isFinite(options?.seed) ? Number(options!.seed) >>> 0 : Math.floor(Math.random() * 2 ** 31)
        if (options?.private || options?.bot || options?.sim) this.setPrivate(true)
        this.pool = cg.implementedHeroes().map((h) => h.id)
        this.teamSize = Math.min(5,
            Math.floor(this.pool.length / 2))
        // mỗi bên cấm tối đa DRAFT_BANS tướng, miễn còn đủ tướng cho cả hai đội
        this.banCount = Math.max(0,
            Math.min(DRAFT_BANS,
                Math.floor((this.pool.length - 2 * this.teamSize) / 2)))

        if (options?.bot) {
            this.bots.B = options.bot === "easy" ? "easy" : "hard"
            this.names.B = this.bots.B === "easy" ? "Máy (Dễ)" : "Máy (Khó)"
            this.state.nameB = this.names.B
            this.maxClients = 1
        }
        if (this.sim) {
            this.bots = {
                A: "hard", B: "hard"
            }
            this.names = {
                A: "Máy A", B: "Máy B"
            }
            this.state.nameA = "Máy A"; this.state.nameB = "Máy B"
            this.maxClients = 4 // khách chỉ xem
            this.picks = {
                A: this.randomTeam(), B: this.randomTeam()
            }
            this.state.pickedA = this.state.pickedB = true
            // chờ 1 nhịp để khách (script) kịp đăng ký handler rồi mới chạy
            this.clock.setTimeout(() => this.startGame(),
                this.fast ? 50 : 1500)
        }

        this.onMessage("cg:sync",
            (client) => this.sendFull(client))
        this.onMessage("cg:draftAct",
            (client, msg: { hero?: string }) => {
                const side = this.sides.get(client.sessionId)
                if (!side) return
                const err = this.draftAct(side,
                    String(msg?.hero ?? ""))
                if (err) client.send("cg:error",
                    {
                        code: "bad_team", msg: err
                    })
            })
        this.onMessage("cg:action",
            (client, msg: { action?: cg.Action }) => {
                const side = this.sides.get(client.sessionId)
                if (!side) return
                try {
                    if (this.state.phase !== "playing" || !this.gs) throw new Error("Trận chưa bắt đầu hoặc đã kết thúc")
                    if (!msg?.action) throw new Error("Thiếu action")
                    this.humanAction(side,
                        msg.action)
                } catch (e) {
                    client.send("cg:error",
                        {
                            code: "illegal", msg: (e as Error).message
                        })
                    this.sendState(client) // đồng bộ lại cho chắc
                }
            })
        this.onMessage("cg:resign",
            (client) => {
                const side = this.sides.get(client.sessionId)
                if (side && this.state.phase === "playing") this.finish(other(side),
                    "resign")
            })
    }

    async onAuth(_client: Client, options: { name?: string; token?: string }) {
        return authenticate(options?.token,
            (options?.name || "Khách").slice(0,
                20))
    }

    onJoin(client: Client, options: { team?: string[]; deck?: string[] }, player: Player) {
        if (this.sim) return this.sendFull(client) // khách xem
        const side: Side = this.sides.size === 0 ? "A" : "B"
        this.sides.set(client.sessionId,
            side)
        this.names[side] = player.name.slice(0,
            20)
        if (side === "A") this.state.nameA = this.names.A; else this.state.nameB = this.names.B
        if (options?.team && !this.checkTeam(options.team)) this.preset[side] = options.team
        // bộ gốc tự xếp: hợp lệ thì dùng, không thì bộ mặc định
        this.decks[side] = options?.deck && cg.validateDeck(options.deck) === null ? options.deck as cg.DeckCardId[] : [...cg.DEFAULT_DECK]
        const full = this.sides.size + Object.keys(this.bots).length >= 2
        if (full) this.startDraft(); else client.send("cg:waiting",
            {
            })
    }

    onLeave(client: Client) {
        const side = this.sides.get(client.sessionId)
        if (!side) return
        this.sides.delete(client.sessionId)
        if (this.state.phase === "playing") this.finish(other(side),
            "left")
        else if (this.state.phase === "draft") { this.state.phase = "ended"; this.state.winner = other(side); this.state.endReason = "left"; this.broadcast("cg:end",
            {
                winner: other(side), reason: "left"
            }) }
        else if (this.state.phase === "waiting") { delete this.preset[side]; this.state.nameA = "" }
    }

    onDispose() {
        this.disposed = true
        this.botTimer?.clear()
        this.draftTimer?.clear()
    }

    // ================= Chọn đội =================

    private randomTeam() { return shuffled(this.pool).slice(0,
        this.teamSize) }

    private checkTeam(h: unknown): string | null {
        if (!Array.isArray(h) || h.length !== this.teamSize) return `Cần chọn đúng ${this.teamSize} tướng`
        if (new Set(h).size !== h.length) return "Không được chọn trùng tướng"
        for (const id of h) if (typeof id !== "string" || !this.pool.includes(id)) return `Tướng không hợp lệ: ${String(id)}`
        return null
    }

    private startDraft() {
        this.lock()
        this.state.phase = "draft"
        // cả hai bên mang đội chọn sẵn (test/script): bỏ qua cấm/chọn
        if (this.preset.A && this.preset.B) {
            this.picks = {
                A: this.preset.A, B: this.preset.B
            }
            this.finishDraft()
            return
        }
        this.draftOrder = draftOrderOf(this.banCount,
            this.teamSize)
        this.draftStep = 0
        this.bans = []
        this.chosen = {
            A: [], B: []
        }
        this.nextDraftTurn()
    }

    private draftTaken(id: string) { return this.bans.includes(id) || this.chosen.A.includes(id) || this.chosen.B.includes(id) }

    /** Gửi trạng thái cấm/chọn cho từng người (mỗi người biết phe mình) */
    private draftPayload(you: Side | null) {
        const turn = this.draftOrder[this.draftStep] ?? null
        return {
            pool: this.pool.map((id) => { const d = cg.getHero(id)!; return {
                id, name: d.name, role: d.role, hp: d.hp, atk: d.atk, armor: d.armor, mr: d.mr, damage: d.damage
            } }),
            size: this.teamSize,
            order: this.draftOrder,
            step: this.draftStep,
            turn,
            bans: this.bans,
            picks: this.chosen,
            you,
            deadlineMs: turn && !this.fast && !this.bots[turn.side] ? DRAFT_TURN_MS : 0,
        }
    }
    private broadcastDraft() {
        for (const c of this.clients) c.send("cg:draft",
            this.draftPayload(this.sides.get(c.sessionId) ?? null))
    }

    /** Sang lượt cấm/chọn kế tiếp: máy tự chọn, người có DRAFT_TURN_MS giây (hết giờ chọn ngẫu nhiên) */
    private nextDraftTurn() {
        this.draftTimer?.clear()
        this.draftTimer = null
        const turn = this.draftOrder[this.draftStep]
        if (!turn) { this.finishDraft(); return }
        this.broadcastDraft()
        const auto = () => {
            const all = this.pool.filter((id) => !this.draftTaken(id))
            // máy chọn: tránh lấy 2 tướng cùng dùng Ô triệu hồi phụ
            const mine = this.chosen[turn.side] ?? []
            const ok = turn.action === "pick" && this.bots[turn.side] ? all.filter((id) => !cg.clashesExtraZone([...mine,
                id])) : all
            const free = ok.length ? ok : all
            // máy "hard": cấm/chọn theo bản đồ đội hình (combo với tướng mình, khắc tướng địch; botDraft.ts)
            const smart = this.bots[turn.side] === "hard" ? cg.draftChoice({
                available: free, mine, theirs: this.chosen[other(turn.side)] ?? [], action: turn.action, noise: 0.8
            }) : undefined
            if (free.length) this.draftAct(turn.side,
                smart ?? pickRand(free))
        }
        if (this.bots[turn.side]) this.draftTimer = this.clock.setTimeout(auto,
            this.fast ? 0 : 700)
        else if (!this.fast) this.draftTimer = this.clock.setTimeout(auto,
            DRAFT_TURN_MS)
    }

    /** Một lượt cấm/chọn của `side`. Trả về lỗi (chuỗi) nếu không hợp lệ */
    private draftAct(side: Side, hero: string): string | null {
        const turn = this.draftOrder[this.draftStep]
        if (this.state.phase !== "draft" || !turn) return "Không phải lúc cấm/chọn"
        if (turn.side !== side) return "Chưa tới lượt bạn"
        if (!this.pool.includes(hero)) return `Tướng không hợp lệ: ${hero}`
        if (this.draftTaken(hero)) return "Tướng này đã bị cấm hoặc đã được chọn"
        if (turn.action === "ban") this.bans.push(hero)
        else this.chosen[side].push(hero)
        this.draftStep++
        this.nextDraftTurn()
        return null
    }

    private finishDraft() {
        this.draftTimer?.clear()
        this.draftTimer = null
        if (!this.picks.A || !this.picks.B) this.picks = {
            A: [...this.chosen.A], B: [...this.chosen.B]
        }
        this.state.pickedA = this.state.pickedB = true
        for (const side of SIDES) this.broadcast("cg:picked",
            {
                side
            })
        this.startGame()
    }

    // ================= Vào trận =================

    private startGame() {
        if (this.disposed || this.gs) return
        if (this.teamSize < 1) { this.finish(null,
            "error"); return }
        const { state, events } = cg.newGameEx(this.seed,
            this.picks.A!,
            this.picks.B!,
            this.decks)
        this.gs = state
        this.state.phase = "playing"
        this.broadcastEvents(events)
        this.sync()
        this.pump()
    }

    private humanAction(side: Side, raw: cg.Action) {
        const gs = this.gs!
        // bước gọi tướng úp (phase "blind"): cả hai bên cùng hành động, không có "lượt"
        if (gs.phase !== "blind" && cg.whoseMove(gs) !== side) throw new Error("Chưa tới lượt bạn")
        const action = {
            ...raw, side
        } as cg.Action
        const key = actionKey(gs,
            action)
        const ok = cg.legalActions(gs,
            side).some((a) => actionKey(gs,
            a) === key)
        if (!ok) throw new Error("Hành động không hợp lệ")
        this.apply(action)
    }

    /** Áp hành động vào engine rồi cập nhật Schema + gửi message. Throw nếu engine từ chối. */
    private apply(action: cg.Action) {
        const res = cg.applyAction(this.gs!,
            action)
        this.gs = res.state
        for (const e of res.events) {
            const r = e as unknown as { t: string; side?: Side; to?: Side }
            if (r.t === "reveal" && r.side) this.revealed[r.to ?? other(r.side)].add(r.side) // tương thích nếu engine thêm sự kiện "reveal"
        }
        if (!(this.sim && this.fast)) this.broadcastEvents(res.events)
        if (res.state.phase === "over") { this.finish(res.state.winner,
            res.state.endReason ?? "lives"); return }
        this.sync()
        this.pump()
    }

    // ================= Bot =================

    /** Các phe đang phải quyết định: phase "blind" là mọi phe chưa chốt (đồng thời), còn lại đúng một phe */
    private movers(gs: cg.GameState): Side[] {
        return cg.actorsOf(gs)
    }

    /** Phe máy đang cần ra quyết định (undefined = đang chờ người) */
    private botMover(): Side | undefined {
        const gs = this.gs
        return gs ? this.movers(gs).find((s) => !!this.bots[s]) : undefined
    }

    private pump() {
        if (this.disposed || this.stepping || this.state.phase !== "playing" || !this.gs) return
        if (!this.botMover()) return
        if (this.fast) {
            // chạy liên tục theo từng mẻ nhỏ để không chặn vòng lặp sự kiện
            this.stepping = true
            const batch = () => {
                this.stepping = false
                if (this.disposed) return
                for (let i = 0; i < 100 && this.state.phase === "playing" && this.gs && this.botMover(); i++) {
                    if (!this.botStep(true)) return
                }
                if (this.state.phase === "playing" && this.gs && this.botMover()) { this.stepping = true; setImmediate(batch) }
            }
            setImmediate(batch)
        } else {
            this.stepping = true
            // cửa sổ Chuỗi chỉ có đòn Quick không cần lá: bot quyết định ngay, không bắt người chờ nhịp bot
            const side = this.botMover()!
            const instant = cg.isCardlessOnlyWindow(this.gs.phase,
                cg.legalActions(this.gs,
                    side))
            this.botTimer = this.clock.setTimeout(() => { this.stepping = false; if (!this.disposed) this.botStep(false) },
                instant ? 0 : this.pace)
        }
    }

    /** Một bước của bot. Trả false nếu trận đã kết thúc/lỗi. */
    private botStep(inBatch: boolean): boolean {
        const gs = this.gs!
        const side = this.botMover()
        if (!side) return false
        if (++this.steps > 40_000 || gs.round > 150) { this.finish(null,
            "timeout"); return false }
        try {
            let action = cg.chooseAction(gs,
                side,
                this.bots[side] ?? "hard")
            if (this.bots[side] === "easy") {
                const legal = cg.legalActions(gs,
                    side)
                if (Math.random() < 0.35) action = pickRand(legal)
                else if (gs.phase === "chain" && Math.random() < 0.5) action = {
                    t: "pass", side
                }
            }
            if (!inBatch) { this.apply(action); return true }
            // trong mẻ: áp dụng nhưng chỉ pump lại qua vòng ngoài
            const was = this.stepping
            this.stepping = true
            this.apply(action)
            this.stepping = was
            return this.state.phase === "playing"
        } catch (e) {
            console.error("[card] lỗi bot/engine:",
                e)
            this.finish(null,
                "error")
            return false
        }
    }

    // ================= Kết thúc =================

    private finish(winner: Side | null, reason: string) {
        if (this.state.phase === "ended") return
        this.botTimer?.clear()
        this.state.phase = "ended"
        this.state.winner = winner ?? ""
        this.state.endReason = reason
        if (this.gs) { this.state.toMove = ""; this.state.active = "" }
        this.sync(false)
        if (this.gs) for (const c of this.clients) this.sendState(c)
        this.broadcast("cg:end",
            {
                winner, reason
            })
        if (this.sim) {
            const gs = this.gs
            this.broadcast("cg:simStats",
                {
                    winner, reason, round: gs?.round ?? 0, turnNo: gs?.turnNo ?? 0,
                    teams: this.picks, lives: gs ? {
                        A: gs.players.A.lives, B: gs.players.B.lives
                    } : null,
                    stats: gs?.stats ?? null,
                    deaths: gs ? Object.fromEntries(Object.values(gs.units).map((u) => [u.id,
                        u.deaths])) : null,
                })
        }
    }

    // ================= Gửi dữ liệu (ẩn thông tin bí mật) =================

    private viewerSide(client: Client): Side | null { return this.sides.get(client.sessionId) ?? null }

    /** Trạng thái dành cho `viewer`: tay đối thủ chỉ có số lá, thứ tự bộ bài ẩn. viewer = null (khách xem phòng sim) thấy hết. */
    private viewOf(viewer: Side | null) {
        const s = this.gs!
        const g = new cg.Game(s)
        const players: Record<string, unknown> = {
        }
        for (const side of SIDES) {
            const p = s.players[side]
            const showHand = viewer === null || viewer === side || this.revealed[viewer].has(side) || g.handRevealed(side)
            players[side] = {
                side, heroes: p.heroes, lives: p.lives, grave: p.grave, handCount: p.hand.length, deckCount: p.deck.length,
                hand: showHand ? p.hand : undefined,
                // bộ bài của khách xem trong phòng sim không cần; người chơi không được biết thứ tự
                deck: viewer === null ? p.deck : undefined,
            }
        }
        return {
            you: viewer, round: s.round, turnNo: s.turnNo, active: s.active, phase: s.phase,
            // phase "blind": ai chưa chốt thì tới lượt người đó (cả hai có thể cùng "tới lượt")
            toMove: s.phase === "blind" && viewer && !s.blind?.ready[viewer] ? viewer : cg.whoseMove(s),
            blind: s.phase === "blind" ? this.blindFor(s,
                viewer) : undefined,
            actionsThisTurn: s.actionsThisTurn, openLanes: g.openLanes(), players, units: unitsFor(s,
                viewer), lanes: s.lanes, markers: s.markers,
            chain: chainFor(s.chain,
                viewer), extra: s.extra, prizes: s.prizes, winner: s.winner, endReason: s.endReason, stats: s.stats,
            // V2: số đòn đã đánh (công khai) của phe có lượt và phe kia (đòn Quick ngoài lượt), cùng giới hạn cứng
            turnAttacks: g.turnAttacks(s.active),
            offTurnAttacks: g.turnAttacks(other(s.active)),
            attackLimit: g.attackLimit(s.active),
            names: this.names, bots: this.bots, rules: {
                lives: cg.RULES.lives, handMax: cg.RULES.handMax, laneOpenRound: cg.RULES.laneOpenRound, summonRounds: cg.RULES.summonRounds,
                attackLimit: cg.RULES.attackLimit, drawPerTurn: cg.RULES.drawPerTurn, fighterCardlessMult: cg.RULES.fighterCardlessMult,
                mage: {
                    manaMax: cg.RULES.mage.manaMax
                },
                skillCopies: cg.RULES.skillCopies,
            },
        }
    }

    /**
     * Gọi tướng úp: mỗi người chỉ thấy lựa chọn của chính mình. Lựa chọn của phe kia bị xoá hẳn (cả SỐ lượng),
     * nếu không người chốt sau sẽ biết đối thủ gọi mấy tướng và đáp lại. `ready` công khai. Khách xem phòng sim (viewer = null) thấy hết.
     */
    private blindFor(s: cg.GameState, viewer: Side | null) {
        const b = s.blind
        if (!b || viewer === null) return b
        return {
            cap: b.cap, ready: b.ready, picks: {
                A: viewer === "A" ? b.picks.A : [], B: viewer === "B" ? b.picks.B : []
            }
        }
    }

    private sendState(client: Client) {
        if (!this.gs) return
        const viewer = this.viewerSide(client)
        const view: ReturnType<CardRoom["viewOf"]> & { peek?: cg.Card[] } = this.viewOf(this.sim ? null : viewer)
        const legal = viewer && this.state.phase === "playing" && this.movers(this.gs).includes(viewer) ? cg.legalActions(this.gs,
            viewer) : null
        // lá trên cùng bộ mà lựa chọn của bạn cần thấy (Twisted Fate Q: chọn 1 trong 3 lá xuống đáy)
        if (legal && viewer) {
            const peek = peekFor(this.gs,
                viewer,
                legal)
            if (peek.length) view.peek = peek
        }
        client.send("cg:state",
            view)
        if (legal) client.send("cg:legal",
            legal)
    }

    private sendFull(client: Client) {
        if (this.state.phase === "draft" && this.draftOrder.length) {
            client.send("cg:draft",
                this.draftPayload(this.sides.get(client.sessionId) ?? null))
        } else if (this.state.phase === "waiting") client.send("cg:waiting",
            {
            })
        this.sendState(client)
        if (this.state.phase === "ended") client.send("cg:end",
            {
                winner: this.state.winner || null, reason: this.state.endReason
            })
    }

    /** Cập nhật Schema và gửi state cho từng client */
    private sync(send = true) {
        const s = this.gs
        if (!s) return
        this.state.round = s.round; this.state.turnNo = s.turnNo
        this.state.livesA = s.players.A.lives; this.state.livesB = s.players.B.lives
        if (this.state.phase === "playing") {
            this.state.active = s.active
            this.state.toMove = cg.whoseMove(s)
            this.state.reaction = s.phase === "chain" && s.chain ? s.chain.priority : ""
        }
        if (send && !(this.sim && this.fast)) for (const c of this.clients) this.sendState(c)
        this.revealed = {
            A: new Set(), B: new Set()
        }
    }

    /** Lọc sự kiện theo người xem: lá rút/tạo vào tay đối thủ chỉ có uid */
    private eventsFor(events: cg.GameEvent[], viewer: Side | null): unknown[] {
        if (viewer === null) return events
        return events.map((e) => {
            switch (e.t) {
            case "draw": case "drawAuto": case "prize":
                return e.side === viewer ? e : {
                    ...e, card: hidden(e.card)
                }
            case "create":
                return e.side === viewer || e.zone === "grave" ? e : {
                    ...e, card: hidden(e.card)
                }
            case "cardBurned":
                // mộ bài công khai nên lá bị đốt lộ mặt; riêng lá tạm của đối thủ vẫn úp
                return e.card.temp && e.side !== viewer ? {
                    ...e, card: hidden(e.card)
                } : e
            case "freeCard":
                return e.side === viewer ? e : {
                    ...e, card: hidden(e.card)
                }
            case "tempExpired":
                return e.side === viewer ? e : {
                    ...e, card: hidden(e.card)
                }
            case "play": {
                // Gangplank: Thùng thật/giả là bí mật với đối thủ
                const args = secretArgs(e.card,
                    e.args,
                    e.side,
                    viewer)
                return args === e.args ? e : {
                    ...e, args
                }
            }
            default: return e
            }
        })
    }

    private broadcastEvents(events: cg.GameEvent[]) {
        if (!events.length) return
        for (const c of this.clients) c.send("cg:events",
            this.eventsFor(events,
                this.sim ? null : this.viewerSide(c)))
    }
}
