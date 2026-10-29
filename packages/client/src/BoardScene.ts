import Phaser from "phaser"
import {
    Client, Room
} from "colyseus.js"
import {
    CARDS, Effect, HandCard, MAX_ITEMS, NEXUS_HP, NEXUS_PROTECT_UNTIL_ROUND, RESOURCES, ROLE_INFO, ROWS, Row, SKILLS,
    STATUS_INFO, Side, StatusId, TOWER_HP, Target, UnitLike, allBuffs, cardTargets, getPlay, moveTargets, playMet, rangeOf, towerAlive,
    attackTargets, boardCapAt, boardCount, canSummonAt, computeAttack, computeSkill, getHero,
    hasStatus, heroOf, nexusProtected, other, previewOn, sameTarget, skillTargets,
} from "@starci/shared"
import {
    CARD_H, CARD_W, FONT, HERO_COLORS, PANEL_W, PANEL_X, SLOT_W, UNIT_H, Y, artKey, boardTexture, drawCard,
    laneX, portrait, preloadArt, preloadUi, skillIconKey, tokenKey,
} from "./art"
import {
    Fx, Pos
} from "./fx"
import {
    ItemUi
} from "./itemUi"
import type UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js"
import {
    buttonBg, frameBg, scrollText, toast, uiImage
} from "./ui"
import {
    VIEW_H, VIEW_W, fitZoom, texRes, view
} from "./res"
import {
    attackFx
} from "./skillFx"
import {
    preloadKeywords
} from "./keywordText"
import {
    hideDraft, renderDraft
} from "./draftUi"
import {
    ui, type Hover
} from "./ui/store"
import {
    entry
} from "./lobby"
import type {
    RoomState
} from "@starci/shared"
import {
    DECK_KIND_NAME, JUNGLE, SUMMON_PHASES, areaCells, isWallCell, tauntZoneOf, skillCellSide, skillCells, rowIndex, type AreaShape, openLanes, allHeroes, canAct, keywordById, formatMsg, monsterAlive, monsterAt, monsterName, monsterTargets, t, type UiKey, type Role
} from "@starci/shared"

type Selection =
  | { kind: "hand"; uid: string; defId: string }
  | { kind: "unit"; id: string }
  /** tướng trong Đội Hình (chưa ra sân) */
  | { kind: "roster"; id: string }
  /** lá phép mình đang úp ở lane */
  | { kind: "set"; lane: number; defId: string }
  | null;
/** Sự kiện hiệu ứng server gửi qua state.fx (JSON, xem emitFx trong DuelRoom) */
type FxEvent =
  | { kind: "move"; unitId: string }
  | { kind: "attack"; unitId: string; target: Target }
  | { kind: "monster"; unitId: string; lane: number }
  | { kind: "smite"; lane: number; side: Side }
  | {
      kind: "skill"; unitId: string; skillId: string; targetId?: string; hits: string[];
      cell?: { lane: number; row: number | Row }; cellSide?: Side;
    }
  | { kind: "craft"; side: Side; itemId: string }
  | { kind: "summonPhase"; count: number; round: number }
  | { kind: "reveal" }
  | { kind: "equip"; unitId: string; itemId: string }
  | { kind: "spell"; cardId: string; targetId?: string }
  | { kind: "trap"; cardId: string; side: Side; lane: number; unitId: string };
type Highlights = ReturnType<BoardScene["highlights"]>;
type Placement = { unitId: string; lane: number; row: Row };

const C = {
    me: 0x16294d, meLine: 0x6c9cf5, opp: 0x3d171c, oppLine: 0xf07468,
    sel: 0xa585f0, hit: 0xf5b942, ok: 0x5cc08a,
    text: "#ececf0", muted: "#9a9aa3", gold: "#f5d27a", mana: "#7ab8f5", red: "#f07468", green: "#5cc08a",
}
/** Màu hiệu ứng khi đánh bài theo loại */
/** Màu vòng dưới chân theo loại vùng (key), không có thì theo tướng đặt */
const ZONE_RING: Record<string, string> = {
    tibbers: "fire", chomper: "acid"
}
const HERO_RING: Record<string, string> = {
    lux: "holy", leona: "holy", ashe: "frost", lissandra: "frost", braum: "frost", soraka: "holy", janna: "frost"
}
const RING_KINDS = ["fire",
    "acid",
    "arcane",
    "frost",
    "holy"]
/** Tên vùng có máu hiện trên thanh máu */
const ZONE_NAME: Record<string, string> = {
    tibbers: "Tibbers"
}
const KIND_TINT: Record<string, number> = {
    spell: 0x7ab8f5, trap: 0xc07af5, stat: 0x5cc08a
}
const NEXUS_X0 = laneX(0) - SLOT_W / 2, NEXUS_W = laneX(4) + SLOT_W / 2 - NEXUS_X0

export class BoardScene extends Phaser.Scene {
    private room?: Room
    private side: Side | null = null
    private hand: HandCard[] = []
    /** Bài mình đã úp theo lane (server chỉ gửi cho chủ nhân) */
    private sets: (string | null)[] = [null,
        null,
        null,
        null,
        null]
    /** Bài úp của đối thủ đã bị soi (Mắt Kiểm Soát); null = chưa soi */
    private oppSets: (string | null)[] | null = null
    private sel: Selection = null
    /** Mốc triệu hồi: các tướng đã chọn úp (chưa gửi) */
    private picks: Placement[] = []
    /** Đang mở khung Ghép đồ */
    shopOpen = false
    private items!: ItemUi
    private pending: { unitId: string; skillId: string } | null = null
    /** Đang chọn bãi quái để Trừng Phạt */
    private smiteMode = false
    private bg!: Phaser.GameObjects.Image
    private dyn!: Phaser.GameObjects.Container
    private fxLayer!: Phaser.GameObjects.Container
    private fx!: Fx
    /** Rex UI (đăng ký trong main.ts) */
    rexUI!: UIPlugin
    private tip!: ReturnType<typeof scrollText>
    private logArea!: ReturnType<typeof scrollText>
    private toast!: ReturnType<typeof toast>
    private preview?: Phaser.GameObjects.Container
    // để chơi hiệu ứng cho cả tướng vừa rời sân
    private posCache = new Map<string, Pos>()
    private roleCache = new Map<string, Role>()
    private prevHp = new Map<string, number>()
    private prevStatus = new Map<string, string>()
    private prevNexus = new Map<string, number>()
    private lastFxSeq = -1
    private lastTurn = 0

    constructor() { super("board") }

    preload() {
        preloadArt(this); preloadUi(this); preloadKeywords(this)
        for (const m of JUNGLE) this.load.image(`jungle-${m.id}`,
            `jungle/${m.id}.png`)
        for (const r of RING_KINDS) this.load.image(`ring-${r}`,
            `ui/rings/${r}.png`)
        this.load.image("ice-pillar",
            "ui/fx/ice_pillar.png")
        this.load.image("ice-shards",
            "ui/fx/ice_shards.png")
        for (const h of allHeroes()) this.load.image(`cutout-${h.id}`,
            `heroes_cut/${h.id}.png`)
    }

    /** Ô giải thích giờ nằm ở bảng React bên phải */
    private setTip(text: string) { ui.set({
        tip: text
    }) }

    async create() {
        this.bg = this.add.image(VIEW_W / 2,
            VIEW_H / 2,
            "__DEFAULT")
        this.fitScreen()
        this.scale.on("resize",
            () => { this.fitScreen(); this.render() })
        this.dyn = this.add.container()
        this.fxLayer = this.add.container().setDepth(20)
        this.fx = new Fx(this,
            this.fxLayer)
        this.items = new ItemUi({
            scene: this,
            state: () => this.s,
            send: (type, msg) => this.send(type,
                msg),
            tip: (text) => this.setTip(text),
            render: () => this.render(),
            closeShop: () => { this.shopOpen = false; this.render() },
            openShop: () => { this.shopOpen = true; this.render() },
        })
        // ô mô tả khi rê chuột và nhật ký: khung chữ cuộn được của Rex UI
        // ô giải thích + nhật ký cũ (Phaser) ẩn đi: bảng React bên phải đã thay
        this.tip = scrollText(this,
            PANEL_X,
            506,
            PANEL_W,
            80,
            11,
            C.muted,
            true).setDepth(5).setVisible(false)
        this.logArea = scrollText(this,
            PANEL_X,
            606,
            PANEL_W,
            162,
            11,
            C.text).setDepth(5).setVisible(false)
        this.registerUiActions()
        // chuột rời canvas (sang bảng React): đóng tooltip trên bàn
        this.input.on("gameout",
            () => ui.set({
                hover: null
            }))
        this.toast = toast(this,
            545,
            250).setDepth(30)
        this.input.on("pointerdown",
            (_p: unknown, objs: unknown[]) => {
                if (objs.length === 0 && (this.sel || this.pending)) { this.sel = null; this.pending = null; this.render() }
            })

        this.centerText(t("g.connecting"))
        const name = entry.name || new URLSearchParams(location.search).get("name") || `${t("guest")} ${Math.floor(Math.random() * 900 + 100)}`
        const proto = location.protocol === "https:" ? "wss" : "ws"
        try {
            const client = new Client(`${proto}://${location.hostname}:2567`), opts = {
                name, token: entry.token
            }
            const mode = entry.mode
            this.room = mode.kind === "bot" ? await client.create("duel",
                {
                    ...opts, bot: mode.level
                })
                : mode.kind === "create" ? await client.create("duel",
                    {
                        ...opts, private: true
                    })
                    : mode.kind === "join" ? await client.joinById(mode.roomId,
                        opts)
                        : await client.joinOrCreate("duel",
                            opts)
        } catch (e) {
            this.clear()
            this.centerText(`${t("g.join_fail")}\n${(e as Error)?.message || t("g.run_dev")}`)
            return
        }
        // mất phòng giữa trận (server khởi động lại, rớt mạng): báo rõ thay vì đứng hình, cho về sảnh
        this.room.onLeave((code: number) => {
            if (this.s?.phase === "ended") return
            hideDraft()
            ui.set({
                inMatch: false, hover: null
            })
            this.room = undefined
            this.clear()
            this.centerText(t("g.disconnected",
                {
                    code
                }))
            this.button(545 - 80,
                340,
                160,
                36,
                t("g.back_lobby"),
                true,
                () => location.reload(),
                undefined,
                0xb8862b)
        })
        this.room.onMessage("hand",
            (h: HandCard[]) => { this.hand = h; this.render() })
        this.room.onMessage("sets",
            (sets: (string | null)[]) => { this.sets = sets; this.render() })
        this.room.onMessage("oppSets",
            (sets: (string | null)[]) => { this.oppSets = sets; this.flash(t("g.sets_revealed")); this.render() })
        this.room.onMessage("error",
            ({ msg }: { msg: string }) => this.flash(formatMsg(msg)))
        this.room.onStateChange(() => this.render())
        this.room.send("ready")
    }

    private get s(): RoomState { return this.room!.state }

    /** Camera zoom cho bố cục 1280×800 vừa màn hình; nền vẽ lại nếu cần độ phân giải cao hơn */
    private fitScreen() {
        const { width, height } = this.scale.gameSize
        view.zoom = fitZoom(width,
            height)
        this.cameras.main.setSize(width,
            height).setZoom(view.zoom).centerOn(VIEW_W / 2,
            VIEW_H / 2)
        const res = texRes()
        this.bg.setTexture(boardTexture(this,
            res)).setScale(1 / res)
    }

    // ================= VẼ =================

    private clear() {
        this.tweens.killTweensOf(this.dyn.list)
        this.dyn.removeAll(true)
        this.preview?.destroy()
        this.preview = undefined
    }

    private render() {
        if (!this.room) return
        const s = this.s
        const me = [...(s.players?.values?.() ?? [])].find((p) => p.sessionId === this.room!.sessionId)
        this.side = me?.side ?? null
        if (!this.side || s.phase === "waiting") {
            this.clear()
            this.centerText(entry.mode.kind === "create"
                ? t("g.private_wait",
                    {
                        code: this.room.roomId
                    })
                : t("g.waiting"))
            return
        }
        // cấm/chọn: màn DOM riêng phủ lên bàn đấu
        if (s.phase === "draft") {
            this.clear()
            renderDraft(s,
this.side!,
(heroId) => this.send("draft",
    {
        heroId
    }))
            return
        }
        hideDraft()
        this.playEvents()
        this.clear()
        if (s.phase !== "summon" || me!.summonReady) this.picks = []
        const sel = this.sel
        if (sel?.kind === "unit" && s.units.get(sel.id)?.status !== "board") this.sel = null
        if (sel?.kind === "roster" && s.units.get(sel.id)?.status === "board") this.sel = null
        if (sel?.kind === "hand" && !this.hand.some((h) => h.uid === sel.uid)) this.sel = null
        if (sel?.kind === "set" && this.sets[sel.lane] !== sel.defId) this.sel = null
        if (this.pending && s.units.get(this.pending.unitId)?.status !== "board") this.pending = null

        const hl = this.highlights()
        this.drawBoard(hl)
        this.drawHand()
        this.drawPanel()
        if (this.shopOpen && s.phase === "playing") this.items.drawShop(this.dyn,
this.side!)
        if (s.phase === "ended") this.drawEnd()
    }

    /** Chơi hiệu ứng cho sự kiện mới và hiện số sát thương/hồi máu theo chênh lệch máu */
    private playEvents() {
        const s = this.s
        if (this.lastTurn && s.turn !== this.lastTurn && s.phase === "playing") {
            this.fx.banner(s.activeSide === this.side ? t("g.your_turn") : t("g.opp_turn"),
                s.activeSide === this.side ? C.green : C.red)
        }
        this.lastTurn = s.turn

        if (this.lastFxSeq >= 0 && s.fxSeq !== this.lastFxSeq && s.fx) {
            try { this.playFx(JSON.parse(s.fx)) } catch (e) { console.warn(e) }
        }
        this.lastFxSeq = s.fxSeq

        s.units.forEach((u: UnitLike & { status: string }) => {
            const before = this.prevStatus.get(u.id)
            this.prevStatus.set(u.id,
                u.status)
            if (u.status !== "board") {
                const p = this.posCache.get(u.id)
                if (before === "board" && u.status === "dead" && p) {
                    this.fx.floatText(p,
                        t("g.slain"),
                        "#ffffff",
                        380,
                        true)
                    this.fx.burst(p,
                        0x888888,
                        30,
                        160)
                }
                this.prevHp.delete(u.id)
                return
            }
            const p = this.prevHp.get(u.id)
            if (p !== undefined && p !== u.hp) {
                const d = u.hp - p
                this.fx.floatText(this.unitPos(u),
                    d > 0 ? `+${d}` : `${d}`,
                    d > 0 ? C.green : "#ff5a4a",
                    320,
                    Math.abs(d) >= 300)
            }
            this.prevHp.set(u.id,
                u.hp)
        })
        for (const side of ["A",
            "B"]) {
            const hp = s.players.get(side)?.nexus
            if (hp === undefined) continue
            const p = this.prevNexus.get(side)
            if (p !== undefined && hp < p) {
                const pos = {
                    x: laneX(2), y: Y.tower[side === this.side ? "me" : "opp"]
                }
                this.fx.floatText(pos,
                    `${hp - p}`,
                    "#ffb04a",
                    320,
                    true)
                this.cameras.main.shake(200,
                    hp === 0 ? 0.012 : 0.004)
            }
            this.prevNexus.set(side,
                hp)
        }
    }

    /** Hiệu ứng gọn: chiêu = icon chiêu bay lên + đạn/chớp sáng vào mục tiêu; số máu hiện theo chênh lệch */
    private playFx(ev: FxEvent) {
        const s = this.s
        const pos = (id: string): Pos | undefined => {
            const u = s.units.get(id)
            return u?.status === "board" ? this.unitPos(u) : this.posCache.get(id)
        }
        if (ev.kind === "attack") {
            const from = pos(ev.unitId)
            const to = ev.target.kind === "unit" ? pos(ev.target.id) : this.towerPos(ev.target.side,
                ev.target.lane)
            const u = s.units.get(ev.unitId)
            if (from && to) attackFx(this.roleCache.get(ev.unitId) ?? "fighter",
                this.fx,
                from,
                to,
                !!u && hasStatus(u,
                    "barrage"))
        } else if (ev.kind === "skill") {
            const from = pos(ev.unitId)
            if (!from) return
            const sk = SKILLS[ev.skillId]
            const tint = HERO_COLORS[s.units.get(ev.unitId)?.defId ?? ""]?.[1] ?? (sk?.key === "R" ? 0xffd27a : 0xffffff)
            this.fx.floatText({
                x: from.x, y: from.y - 30
            },
            `${sk?.key ?? ""} ${sk?.name ?? ""}`,
            C.gold,
            0,
            sk?.key === "R")
            this.castIcon(ev.skillId,
                from)
            this.fx.ring(from,
                tint,
                sk?.key === "R" ? 80 : 50,
                450)
            const hits = ev.hits.map(pos).filter((p): p is Pos => !!p && (p.x !== from.x || p.y !== from.y))
            hits.forEach((h) => this.fx.projectile(from,
                h,
                tint,
                {
                    duration: 260
                }).then(() => this.fx.burst(h,
                tint,
                sk?.key === "R" ? 34 : 18)))
            if (ev.cell && ev.cellSide) {
                const shape = (sk?.area ?? "1x1") as AreaShape, center = {
                    lane: ev.cell.lane, row: typeof ev.cell.row === "number" ? ev.cell.row : rowIndex(ev.cell.row)
                }
                for (const c of areaCells(shape,
                    center)) {
                    const q = this.cellPos(ev.cellSide,
                        c.lane,
                        c.row)
                    this.fx.projectile(from,
                        q,
                        tint,
                        {
                            duration: 260
                        }).then(() => { this.fx.ring(q,
                        tint,
                        46,
                        420); this.fx.burst(q,
                        tint,
                        16) })
                }
            }
            if (sk?.key === "R") this.cameras.main.shake(180,
                0.005)
        } else if (ev.kind === "craft") {
            this.fx.banner(this.items.name(ev.itemId),
                C.gold)
        } else if (ev.kind === "equip") {
            const p = pos(ev.unitId)
            if (p) { this.fx.ring(p,
                0xffb347,
                60,
                700); this.fx.floatText(p,
                this.items.name(ev.itemId),
                C.gold,
                0,
                true) }
        } else if (ev.kind === "spell") {
            const target = ev.targetId ? pos(ev.targetId) : undefined
            const card = CARDS[ev.cardId], tint = KIND_TINT[card?.kind] ?? 0xff8a3d
            this.fx.banner(card?.name ?? "",
                C.gold)
            if (target) { this.fx.ring(target,
                tint,
                60,
                500); this.fx.burst(target,
                tint,
                26) }
        } else if (ev.kind === "trap") {
            const p = pos(ev.unitId)
            this.fx.banner(t("g.trap",
                {
                    name: CARDS[ev.cardId]?.name ?? ""
                }),
            "#c9a8f0")
            if (p) { this.fx.ring(p,
                0xc07af5,
                70,
                600); this.fx.burst(p,
                0xc07af5,
                30) }
            if (ev.side !== this.side && this.oppSets) this.oppSets[ev.lane] = null
        } else if (ev.kind === "summonPhase") {
            this.fx.banner(t("g.summon_phase",
                {
                    n: ev.count
                }),
            C.gold)
        } else if (ev.kind === "reveal") {
            this.fx.banner(t("g.reveal"),
                C.gold)
        }
    }

    /** Số tướng phải chọn úp ở mốc triệu hồi hiện tại (khớp server) */
    private summonNeed() {
        const s = this.s, me = this.side!
        const free = this.myRoster().filter((u) => u.status !== "board" && u.readyTurn <= s.turn + 1).length
        return Math.max(0,
            Math.min(s.summonCount,
                free,
                boardCapAt(s.round) - boardCount(s,
                    me)))
    }

    private myRoster(): (UnitLike & { status: string })[] {
        return [...this.s.units.values()].filter((u) => u.owner === this.side)
    }

    private highlights() {
        const s = this.s, me = this.side!
        const player = s.players.get(me)!
        const myTurn = s.phase === "playing" && s.activeSide === me
        const slots = new Set<string>(), sets = new Set<number>(), moves = new Set<string>()
        const clickUnits = new Set<string>(), clickTowers = new Set<string>()
        const labels = new Map<string, string>() // id hoặc "tower-side-lane" -> nhãn

        /** Nhãn trên mục tiêu: "", thêm "" khi lá được cường hóa lên mục tiêu này */
        const boostLabel = (cardId: string, id: string) => {
            const card = getPlay(cardId)!
            return playMet(card,
                {
                    state: s, side: me, target: s.units.get(id)
                }).some(Boolean) ? t("g.stronger") : "+"
        }
        const addPreview = (effects: Effect[]) => {
            for (const fx of effects) {
                if (fx.type !== "damage") continue
                const key = fx.target.kind === "unit" ? fx.target.id : `tower-${fx.target.side}-${fx.target.lane}`
                if (!labels.has(key)) labels.set(key,
                    `−${previewOn(s,
                        effects,
                        fx.target)}`)
            }
        }
        const sel = this.sel

        if (s.phase === "summon" && sel?.kind === "roster" && !player.summonReady && this.picks.length < this.summonNeed()) {
            const u = s.units.get(sel.id)
            const taken = new Set(this.picks.map((p) => `${p.lane}-${p.row}`))
            if (u && u.readyTurn <= s.turn + 1 && !this.picks.some((p) => p.unitId === u.id)) {
                for (let l = 0; l < 5; l++) for (const row of ROWS) {
                    if (!taken.has(`${l}-${row}`) && canSummonAt(s,
                        me,
                        u.defId,
                        l,
                        row)) slots.add(`${l}-${row}`)
                }
            }
        } else if (myTurn && sel?.kind === "roster") {
            const u = s.units.get(sel.id)
            if (u && u.readyTurn <= s.turn && boardCount(s,
                me) < boardCapAt(s.round)) {
                for (let l = 0; l < 5; l++) for (const row of ROWS) if (canSummonAt(s,
                    me,
                    u.defId,
                    l,
                    row)) slots.add(`${l}-${row}`)
            }
        } else if (myTurn && this.pending) {
            const u = s.units.get(this.pending.unitId)!
            for (const id of skillTargets(s,
                u,
                this.pending.skillId)) {
                clickUnits.add(id)
                const fx = computeSkill(s,
                    u,
                    this.pending.skillId,
                    id)
                const dmg = previewOn(s,
                    fx,
                    {
                        kind: "unit", id
                    })
                const shield = fx.find((f) => f.type === "shield")
                labels.set(id,
                    dmg ? `−${dmg}` : shield && shield.type === "shield" ? t("g.shield",
                        {
                            n: shield.amount
                        }) : "+")
            }
        } else if (myTurn && sel?.kind === "set") {
            const card = getPlay(sel.defId)
            if (card) for (const id of cardTargets(s,
                me,
                card.id)) { clickUnits.add(id); labels.set(id,
                boostLabel(card.id,
                    id)) }
        } else if (myTurn && sel?.kind === "hand") {
            const card = CARDS[sel.defId]
            if (card.kind === "spell" || card.kind === "trap") {
                for (let l = 0; l < 5; l++) if (!player.traps[l]) sets.add(l)
            }
            const play = getPlay(card.id)
            if (play) {
                for (const id of cardTargets(s,
                    me,
                    play.id)) { clickUnits.add(id); labels.set(id,
                    boostLabel(play.id,
                        id)) }
            } else if (card.kind === "item") {
                s.units.forEach((u: UnitLike & { status: string }) => {
                    if (u.owner === me && u.status === "board" && u.items.length < MAX_ITEMS) { clickUnits.add(u.id); labels.set(u.id,
                        t("g.item")) }
                })
            }
        } else if (myTurn && sel?.kind === "unit") {
            const a = s.units.get(sel.id)!
            if (a.owner === me) {
                for (const c of moveTargets(s,
                    a)) moves.add(`${c.lane}-${c.row}`)
                for (const t of attackTargets(s,
                    a)) {
                    if (t.kind === "unit") clickUnits.add(t.id); else clickTowers.add(`${t.side}-${t.lane}`)
                    addPreview(computeAttack(s,
                        a,
                        t))
                }
            }
        }
        return {
            slots, sets, moves, clickUnits, clickTowers, labels
        }
    }

    private drawBoard(hl: Highlights) {
        const me = this.side!, opp = other(me)
        for (const side of [opp,
            me] as Side[]) this.drawNexus(side,
            hl)
        this.drawZones()
        const open = openLanes(Math.max(1,
            this.s.round))
        for (let l = 0; l < 5; l++) {
            // đường còn khoá: phủ tối 2 nửa sân, ghi vòng mở
            if (!open.includes(l)) {
                const unlock = SUMMON_PHASES.find((p) => openLanes(p.round).includes(l))
                for (const yy of [(Y.back.opp + Y.front.opp) / 2,
                    (Y.back.me + Y.front.me) / 2]) {
                    this.dyn.add(this.add.rectangle(laneX(l),
                        yy,
                        SLOT_W + 16,
                        Math.abs(Y.back.me - Y.front.me) + UNIT_H + 20,
                        0x000000,
                        0.55))
                    this.label(laneX(l),
                        yy,
                        t("g.lane_locked",
                            {
                                r: unlock?.round ?? "?"
                            }),
                        11,
                        C.muted)
                }
            }
            this.drawMonsterCell(l)
            for (const side of [opp,
                me] as Side[]) {
                const view = side === me ? "me" : "opp"
                this.drawTower(side,
                    l,
                    hl)
                this.drawSetZone(side,
                    l,
                    Y.trap[view],
                    hl)
                for (const row of ROWS) {
                    const u = this.unitAt(side,
                        l,
                        row)
                    const y = Y[row][view]
                    if (u) this.drawUnit(u,
                        laneX(l),
                        y,
                        hl)
                    else this.drawSlot(side,
                        l,
                        row,
                        y,
                        hl)
                }
            }
        }
        this.drawCellPick()
    }

    /** Tâm ô (lane, hàng 0 tiền tuyến..2 hậu tuyến) của phe `side` trên màn */
    private cellPos(side: string, lane: number, row: number) {
        return {
            x: laneX(lane), y: Y[ROWS[row]][side === this.side ? "me" : "opp"]
        }
    }

    /** Vùng tồn tại nhiều lượt (Tibbers đốt 3×3, bẫy Jinx...): VÒNG DƯỚI CHÂN kiểu LMHT trên từng ô (ảnh Codex vẽ,
   *  viền mảnh, lõi gần trong suốt, mờ + nhịp sáng nhẹ), viền ô xanh của mình / đỏ của địch, chân dung tướng đặt + số lượt còn. */
    private drawZones() {
        const zones = [...(this.s.zones ?? [])] as { id: string; key: string; owner: string; defId: string; side: string; lane: number; row: number; shape: AreaShape; turns: number; hp?: number; maxHp?: number }[]
        this.zoneBreaks(zones)
        for (const z of zones) {
            const mine = z.owner === this.side, edge = mine ? 0x4a8ef0 : 0xe0563a, ring = `ring-${ZONE_RING[z.key] ?? HERO_RING[z.defId] ?? "arcane"}`
            const wall = z.key.startsWith("wall")
            for (const c of areaCells(z.shape,
                {
                    lane: z.lane, row: z.row
                })) {
                const p = this.cellPos(z.side,
                    c.lane,
                    c.row)
                if (wall) {
                    // Tường Băng: khối băng chặn ô (không đi vào / không bị đẩy vào được)
                    this.dyn.add(this.add.rectangle(p.x,
                        p.y,
                        SLOT_W + 6,
                        UNIT_H + 6,
                        0xbfe9ff,
                        0.28).setStrokeStyle(2,
                        0x9fe0ff,
                        0.9))
                    const shard = this.add.graphics()
                    shard.lineStyle(1.5,
                        0xe8f8ff,
                        0.7)
                    for (let k = -2; k <= 2; k++) shard.lineBetween(p.x + k * 22 - 8,
                        p.y + UNIT_H / 2,
                        p.x + k * 22 + 8,
                        p.y - UNIT_H / 2)
                    this.dyn.add(shard)
                    // cột băng dựng đứng: chân ở đáy ô, nhô cao hơn ô để thấy rõ là vật cản
                    if (this.textures.exists("ice-pillar")) {
                        const pillar = this.add.image(p.x,
                            p.y + UNIT_H / 2 + 2,
                            "ice-pillar").setOrigin(0.5,
                            1)
                        const h = UNIT_H * 1.55
                        pillar.setScale(h / pillar.height)
                        this.dyn.add(pillar)
                        const key = `${z.id}:${c.lane}-${c.row}`
                        if (!this.risenPillars.has(key)) {
                            // mọc lên từ mặt sàn
                            this.risenPillars.add(key)
                            const sy = pillar.scaleY
                            pillar.setScale(pillar.scaleX,
                                0.05)
                            this.tweens.add({
                                targets: pillar, scaleY: sy, duration: 380, ease: "Back.easeOut"
                            })
                            this.fx.burst({
                                x: p.x, y: p.y + UNIT_H / 2
                            },
                            0xbfe9ff,
                            10)
                        }
                    }
                    continue
                }
                this.dyn.add(this.add.rectangle(p.x,
                    p.y,
                    SLOT_W + 6,
                    UNIT_H + 6,
                    edge,
                    0.06).setStrokeStyle(1,
                    edge,
                    0.45))
                if (this.textures.exists(ring)) {
                    // vòng dẹt như nằm trên sàn, rộng gần bằng ô
                    const img = this.add.image(p.x,
                        p.y + 4,
                        ring).setDisplaySize(SLOT_W * 0.95,
                        UNIT_H * 1.05).setAlpha(0.5)
                    this.dyn.add(img)
                    this.tweens.add({
                        targets: img, alpha: {
                            from: 0.35, to: 0.6
                        }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                    })
                }
            }
            const ctr = this.cellPos(z.side,
                z.lane,
                z.row)
            // vùng có máu (Tibbers): thanh máu nổi trên ô tâm, kẻ địch đứng trong vùng bị khiêu khích đánh vào đây
            if ((z.maxHp ?? 0) > 0) {
                const bw = SLOT_W - 20, by = ctr.y - UNIT_H / 2 - 10, pct = Math.max(0,
                    (z.hp ?? 0) / z.maxHp!)
                this.dyn.add(this.add.rectangle(ctr.x,
                    by,
                    bw + 4,
                    9,
                    0x000000,
                    0.8).setStrokeStyle(1,
                    edge,
                    0.9))
                this.dyn.add(this.add.rectangle(ctr.x - bw / 2,
                    by,
                    bw * pct,
                    6,
                    mine ? 0x4cc07a : 0xf0584a).setOrigin(0,
                    0.5))
                this.dyn.add(this.add.text(ctr.x,
                    by - 9,
                    `${ZONE_NAME[z.key] ?? ""} ${z.hp}/${z.maxHp}`,
                    {
                        fontFamily: FONT, fontSize: "10px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3
                    }).setOrigin(0.5))
            }
            this.dyn.add(portrait(this,
                tokenKey(this,
                    z.defId),
                ctr.x + SLOT_W / 2 - 12,
                ctr.y - UNIT_H / 2 + 12,
                18,
                18))
            this.dyn.add(this.add.text(ctr.x + SLOT_W / 2 - 24,
                ctr.y - UNIT_H / 2 + 4,
                `${z.turns}`,
                {
                    fontFamily: FONT, fontSize: "11px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3
                }).setOrigin(1,
                0))
        }
    }

    /** Ô của từng tướng ở lần vẽ trước (để nhận ra bị đổi chỗ / kéo / đẩy) */
    private lastCell = new Map<string, { cell: string; x: number; y: number }>()
    /** Cột băng đã chạy hiệu ứng mọc (theo vùng + ô) */
    private risenPillars = new Set<string>()

    /** Vùng có máu biến mất: vừa bị đánh vỡ (log.zone_down) thì nổ lớn + rung màn, hết giờ thì chỉ tan nhẹ */
    private lastZones = new Map<string, { side: string; lane: number; row: number; shape: AreaShape; maxHp: number; key: string }>()
    private zoneBreaks(zones: { id: string; key: string; side: string; lane: number; row: number; shape: AreaShape; maxHp?: number }[]) {
        const now = new Set(zones.map((z) => z.id))
        const broke = [...this.s.log].slice(-12).some((l: string) => l.startsWith("L|log.zone_down"))
        for (const [id,
            z] of this.lastZones) {
            if (now.has(id)) continue
            const ctr = this.cellPos(z.side,
                z.lane,
                z.row)
            if (z.key.startsWith("wall")) {
                // Tường Băng tan: mảnh băng văng ra trên từng ô
                for (const c of areaCells(z.shape,
                    {
                        lane: z.lane, row: z.row
                    })) {
                    const q = this.cellPos(z.side,
                        c.lane,
                        c.row)
                    if (this.textures.exists("ice-shards")) {
                        const img = this.add.image(q.x,
                            q.y,
                            "ice-shards").setDisplaySize(40,
                            40).setDepth(15)
                        this.tweens.add({
                            targets: img, scale: img.scale * 2.4, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: () => img.destroy()
                        })
                    }
                    this.fx.burst(q,
                        0xbfe9ff,
                        14)
                    for (const k of [...this.risenPillars]) if (k.startsWith(`${id}:`)) this.risenPillars.delete(k)
                }
                continue
            }
            if (z.maxHp > 0 && broke) {
                for (const c of areaCells(z.shape,
                    {
                        lane: z.lane, row: z.row
                    })) this.fx.burst(this.cellPos(z.side,
                    c.lane,
                    c.row),
                0xff7a3a,
                14)
                this.fx.ring(ctr,
                    0xffb070,
                    90,
                    600)
                this.cameras.main.shake(160,
                    0.004)
            } else this.fx.ring(ctr,
                0xffffff,
                50,
                400)
        }
        this.lastZones = new Map(zones.map((z) => [z.id,
            {
                side: z.side, lane: z.lane, row: z.row, shape: z.shape, maxHp: z.maxHp ?? 0, key: z.key
            }]))
    }

    /** Chiêu chọn ô (`target: "cell"`): ô hợp lệ sáng lên; rê chuột tô vùng trúng; bấm để tung */
    private drawCellPick() {
        const pend = this.pending, s = this.s
        if (!pend || SKILLS[pend.skillId]?.target !== "cell") return
        const u = s.units.get(pend.unitId)
        if (!u) return
        const side = skillCellSide(u,
                pend.skillId), shape = (SKILLS[pend.skillId].area ?? "1x1") as AreaShape
        const preview = this.add.graphics().setDepth(4)
        this.dyn.add(preview)
        for (const cell of skillCells(s,
            u,
            pend.skillId)) {
            const row = rowIndex(cell.row), p = this.cellPos(side,
                cell.lane,
                row)
            const zone = this.add.rectangle(p.x,
                p.y,
                SLOT_W,
                UNIT_H,
                0xf5b942,
                0.08).setStrokeStyle(1.5,
                0xf5b942,
                0.6)
            this.dyn.add(zone)
            zone.setInteractive({
                useHandCursor: true
            })
                .on("pointerover",
                    () => {
                        preview.clear()
                        for (const c of areaCells(shape,
                            {
                                lane: cell.lane, row
                            })) {
                            const q = this.cellPos(side,
                                c.lane,
                                c.row)
                            preview.fillStyle(0xff7a3a,
                                0.35).fillRect(q.x - SLOT_W / 2,
                                q.y - UNIT_H / 2,
                                SLOT_W,
                                UNIT_H)
                            preview.lineStyle(2,
                                0xffb070,
                                1).strokeRect(q.x - SLOT_W / 2,
                                q.y - UNIT_H / 2,
                                SLOT_W,
                                UNIT_H)
                        }
                    })
                .on("pointerout",
                    () => preview.clear())
                .on("pointerdown",
                    (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
                        ev.stopPropagation()
                        this.send("skill",
                            {
                                unitId: pend.unitId, skillId: pend.skillId, cell: {
                                    lane: cell.lane, row: cell.row
                                }
                            })
                        this.pending = null
                    })
        }
    }

    /** Quái đứng trên đáy ô và trồi lên khỏi mép trên (Baron to hơn) */
    private monsterSprite(id: string, x: number, bottom: number) {
        const img = this.add.image(x,
            bottom,
            `jungle-${id}`).setOrigin(0.5,
            1)
        return img.setScale((id === "baron" ? 66 : 54) / img.height)
    }

    /** Ô hàng rừng: quái (tranh Codex vẽ) + thanh máu. Tướng mình đang chọn đánh tới thì viền vàng, bấm để đánh;
   *  đang ở chế độ Trừng Phạt thì bấm để Trừng Phạt. Quái đã bị hạ: hiện vòng xuất hiện lại. */
    private drawMonsterCell(lane: number) {
        const s = this.s, me = this.side!, x = laneX(lane), y = Y.monster
        const m = [...(s.monsters ?? [])].find((q: { lane: number }) => q.lane === lane)
        const def = monsterAt(lane)
        if (!m || !def) return
        const alive = monsterAlive(m), myTurn = s.activeSide === me && s.phase === "playing"
        const a = this.sel?.kind === "unit" ? s.units.get(this.sel.id) : undefined
        const canHit = alive && myTurn && a?.owner === me && !a.attacked && canAct(s,
            a) && monsterTargets(s,
            a,
            rangeOf(a)).includes(lane)
        const canSmite = alive && myTurn && this.smiteMode
        const w = SLOT_W, h = 40
        this.dyn.add(this.add.rectangle(x,
            y,
            w,
            h,
            0x0a1a24,
            0.55).setStrokeStyle(canHit || canSmite ? 2 : 1,
            canSmite ? 0x7ad0ff : canHit ? C.hit : 0x9fe08a,
            canHit || canSmite ? 1 : 0.3))
        if (!alive) {
            this.dyn.add(this.monsterSprite(def.id,
                x - w / 2 + 22,
                y + h / 2 - 2).setAlpha(0.25))
            this.label(x + 14,
                y,
                t("g.monster_respawn",
                    {
                        n: m.respawnRound
                    }),
                10,
                C.muted)
        } else {
            this.dyn.add(this.monsterSprite(def.id,
                x - w / 2 + 22,
                y + h / 2 - 2))
            const bx = x - w / 2 + 44, bw = w - 50
            this.dyn.add(this.add.rectangle(bx,
                y + 6,
                bw,
                7,
                0x000000,
                0.7).setOrigin(0,
                0.5))
            this.dyn.add(this.add.rectangle(bx,
                y + 6,
                bw * (m.hp / m.maxHp),
                7,
                def.id === "baron" ? 0xa060e0 : 0xe0a030).setOrigin(0,
                0.5))
            this.dyn.add(this.add.text(bx,
                y - 8,
                `${monsterName(def.id)}`,
                {
                    fontFamily: FONT, fontSize: "10px", color: "#f0e6d2", fontStyle: "bold"
                }).setOrigin(0,
                0.5))
            this.dyn.add(this.add.text(bx + bw,
                y + 16,
                `${m.hp}`,
                {
                    fontFamily: FONT, fontSize: "9px", color: C.muted
                }).setOrigin(1,
                0.5))
        }
        const zone = this.add.rectangle(x,
            y,
            w,
            h,
            0xffffff,
            0.001)
        this.dyn.add(zone)
        const tip = () => this.setTip(`${monsterName(def.id)} · ${alive ? `${m.hp}/${m.maxHp}` : t("g.monster_respawn",
            {
                n: m.respawnRound
            })}
${t(`g.reward_${def.id}` as UiKey)}`)
        this.clickable(zone,
            () => {
                if (canSmite) { this.smiteMode = false; return this.send("smite",
                    {
                        lane
                    }) }
                if (canHit) return this.send("attackMonster",
                    {
                        unitId: a!.id, lane
                    })
                tip()
            })
        this.hoverTip(zone,
            (px, py) => ({
                kind: "monster", lane, x: px, y: py
            }))
    }

    /** Trụ trước Nhà ở mỗi đường: thanh máu nhỏ; địch đánh được thì nhấp nháy */
    private drawTower(side: Side, lane: number, hl: Highlights) {
        const s = this.s, hp = (s.players.get(side)!.towers?.[lane] ?? 0) as number
        const mine = side === this.side, x = laneX(lane) - 40, y = Y.tower[mine ? "me" : "opp"]
        const g = this.add.graphics()
        this.dyn.add(g)
        if (hp > 0) {
            const w = 72
            g.fillStyle(0x000000,
                0.65); g.fillRoundedRect(x - w / 2,
                y - 6,
                w,
                12,
                3)
            g.fillStyle(mine ? 0x4a86e8 : 0xe0564a,
                1); g.fillRoundedRect(x - w / 2,
                y - 6,
                Math.max(3,
                    w * hp / TOWER_HP),
                12,
                3)
            g.lineStyle(1,
                mine ? C.meLine : C.oppLine,
                1); g.strokeRoundedRect(x - w / 2,
                y - 6,
                w,
                12,
                3)
            this.dyn.add(this.add.text(x,
                y,
                t("g.tower",
                    {
                        hp
                    }),
                {
                    fontFamily: FONT, fontSize: "9.5px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3
                }).setOrigin(0.5))
        } else {
            this.dyn.add(this.add.text(x,
                y,
                t("g.tower_down"),
                {
                    fontFamily: FONT, fontSize: "10px", color: C.muted
                }).setOrigin(0.5))
        }
        if (!hl.clickTowers.has(`${side}-${lane}`)) return
        const alive = towerAlive(s,
            side,
            lane)
        const zone = this.add.rectangle(x,
            y,
            80,
            22,
            0xf5b942,
            0.18)
        this.dyn.add(zone)
        this.pulse(x,
            y,
            80,
            22)
        this.badge(x - 10,
            y + 16,
            hl.labels.get(`tower-${side}-${lane}`) ?? (alive ? t("g.hit_tower") : t("g.hit_nexus")))
        this.clickable(zone,
            () => this.send("attack",
                {
                    unitId: (this.sel as { id?: string }).id, target: {
                        kind: "tower", side, lane
                    }
                }))
    }

    /** Thanh máu Nhà trải ngang 5 đường */
    private drawNexus(side: Side, _hl: Highlights) {
        const s = this.s, hp = s.players.get(side)!.nexus as number
        const mine = side === this.side, y = Y.nexus[mine ? "me" : "opp"]
        const g = this.add.graphics()
        this.dyn.add(g)
        const pct = Math.max(0,
                hp / NEXUS_HP), h = 14
        g.fillStyle(0x000000,
            0.6); g.fillRoundedRect(NEXUS_X0,
            y - h / 2,
            NEXUS_W,
            h,
            6)
        g.fillStyle(mine ? 0x4a86e8 : 0xe0564a,
            1); g.fillRoundedRect(NEXUS_X0,
            y - h / 2,
            Math.max(6,
                NEXUS_W * pct),
            h,
            6)
        g.lineStyle(1.5,
            mine ? C.meLine : C.oppLine,
            1); g.strokeRoundedRect(NEXUS_X0,
            y - h / 2,
            NEXUS_W,
            h,
            6)
        const shielded = nexusProtected(s)
        const label = `${mine ? t("g.nexus_me") : t("g.nexus_opp")}  ${hp}/${NEXUS_HP}${shielded ? `  ·  ${t("g.protected",
            {
                r: NEXUS_PROTECT_UNTIL_ROUND
            })}` : ""}`
        this.dyn.add(this.add.text(laneX(2),
            y,
            label,
            {
                fontFamily: FONT, fontSize: "10.5px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3
            }).setOrigin(0.5))
    }

    /** Ô bài úp kiểu Yu-Gi-Oh: địch chỉ thấy mặt sau; bài của mình hiện mờ để biết lá gì */
    private drawSetZone(side: Side, lane: number, y: number, hl: Highlights) {
        const s = this.s, mine = side === this.side
        const set = s.players.get(side)!.traps[lane]
        const x = laneX(lane)
        const myTurn = s.phase === "playing" && s.activeSide === this.side
        if (set) {
            const own = mine ? this.sets[lane] : null
            const selected = this.sel?.kind === "set" && this.sel.lane === lane
            const back = uiImage(this,
                "ui-card_back",
                x + 16,
                y,
                17,
                24)
            if (back) this.dyn.add(back.setAngle(mine ? -6 : 6))
            else {
                const g = this.add.graphics()
                g.fillStyle(0x3a1f52,
                    1); g.fillRoundedRect(x + 6,
                    y - 11,
                    20,
                    22,
                    3)
                g.lineStyle(1.5,
                    0xc07af5,
                    1); g.strokeRoundedRect(x + 6,
                    y - 11,
                    20,
                    22,
                    3)
                this.dyn.add(g)
            }
            const seen = own ?? (!mine ? this.oppSets?.[lane] ?? null : null)
            const name = seen ? CARDS[seen].name : t("g.set_unknown")
            this.dyn.add(this.add.text(x + 28,
                y,
                name,
                {
                    fontFamily: FONT, fontSize: "9px", color: selected ? "#f5d27a" : "#c9a8f0", fontStyle: selected ? "bold" : "normal"
                }).setOrigin(0,
                0.5))
            if (own) {
                const zone = this.add.rectangle(x + 46,
                    y,
                    70,
                    24,
                    0xffffff,
                    0.001)
                this.dyn.add(zone)
                const card = CARDS[own]
                this.clickable(zone,
                    () => {
                        if (card.kind !== "spell") return this.flash(t("g.trap_auto"))
                        if (!myTurn) return this.flash(t("g.flip_my_turn"))
                        if (getPlay(own)?.target === "none") return this.send("flip",
                            {
                                lane
                            })
                        this.pending = null
                        this.sel = selected ? null : {
                            kind: "set", lane, defId: own
                        }
                        this.render()
                    },
                    () => this.setTip(`${t("g.set_info",
                        {
                            name: card.name, how: card.kind === "spell" ? t("g.flip_free") : t("g.auto")
                        })}\n${card.desc}`))
            }
        }
        if (mine && hl.sets.has(lane) && this.sel?.kind === "hand") {
            const r = this.add.rectangle(x + 40,
                y,
                80,
                22,
                0xc07af5,
                0.15).setStrokeStyle(2,
                0xc07af5)
            this.dyn.add(r)
            this.dyn.add(this.add.text(x + 40,
                y,
                t("g.set_here"),
                {
                    fontFamily: FONT, fontSize: "10px", color: "#e0c8ff"
                }).setOrigin(0.5))
            const uid = this.sel.uid
            this.clickable(r,
                () => this.send("set",
                    {
                        uid, lane
                    }))
        }
    }

    private drawSlot(side: Side, lane: number, row: Row, y: number, hl: Highlights) {
        const x = laneX(lane)
        const pick = side === this.side ? this.picks.find((p) => p.lane === lane && p.row === row) : undefined
        if (pick) return this.drawPick(pick,
            x,
            y)
        const click = side === this.side && hl.slots.has(`${lane}-${row}`)
        const move = side === this.side && hl.moves.has(`${lane}-${row}`)
        const r = this.add.rectangle(x,
            y,
            SLOT_W,
            UNIT_H,
            click ? 0x5cc08a : move ? 0x4ad8c8 : 0xffffff,
            click || move ? 0.12 : 0.025)
            .setStrokeStyle(click || move ? 2 : 1,
                click ? C.ok : move ? 0x4ad8c8 : 0xffffff,
                click || move ? 1 : 0.07)
        this.dyn.add(r)
        if (move && this.sel?.kind === "unit") {
            this.dyn.add(this.add.text(x,
                y,
                t("g.move_here"),
                {
                    fontFamily: FONT, fontSize: "12px", color: "#9ff5ea", fontStyle: "bold"
                }).setOrigin(0.5))
            const unitId = this.sel.id
            this.clickable(r,
                () => this.send("move",
                    {
                        unitId, lane, row
                    },
                    true))
            return
        }
        if (click && this.sel?.kind === "roster") {
            const summonPhase = this.s.phase === "summon"
            this.dyn.add(this.add.text(x,
                y,
                summonPhase ? t("g.summon_here") : t("g.deploy"),
                {
                    fontFamily: FONT, fontSize: "13px", color: C.green, fontStyle: "bold"
                }).setOrigin(0.5))
            const unitId = this.sel.id
            this.clickable(r,
                () => {
                    if (!summonPhase) return this.send("summon",
                        {
                            unitId, lane, row
                        })
                    this.picks.push({
                        unitId, lane, row
                    })
                    this.sel = null
                    this.render()
                })
        }
    }

    /** Tướng đã chọn úp ở mốc triệu hồi (chưa lật): bấm để bỏ chọn */
    private drawPick(p: Placement, x: number, y: number) {
        const u = this.s.units.get(p.unitId)!
        const c = this.add.container(x,
            y).setAlpha(0.6)
        this.dyn.add(c)
        c.add(this.add.rectangle(0,
            0,
            SLOT_W,
            UNIT_H,
            0x2a1f3a,
            1).setStrokeStyle(2,
            0xc07af5))
        c.add(portrait(this,
            tokenKey(this,
                u.defId),
            -SLOT_W / 2 + 34,
            0,
            62,
            UNIT_H - 8))
        c.add(this.add.text(-SLOT_W / 2 + 70,
            -12,
            t("g.picked",
                {
                    name: heroOf(u).name
                }),
            {
                fontFamily: FONT, fontSize: "11px", color: "#e0c8ff"
            }))
        const zone = this.add.rectangle(x,
            y,
            SLOT_W,
            UNIT_H,
            0xffffff,
            0.001)
        this.dyn.add(zone)
        this.clickable(zone,
            () => { this.picks = this.picks.filter((q) => q !== p); this.render() },
            () => this.setTip(t("g.unpick")))
    }

    private drawUnit(u: UnitLike, x: number, y: number, hl: Highlights) {
        const s = this.s, mine = u.owner === this.side, hero = heroOf(u)
        const was = this.lastCell.get(u.id), here = `${u.lane}-${u.row}`
        if (was && was.cell !== here && !u.moved) {
            this.fx.ring({
                x: was.x, y: was.y
            },
            0x7ad0ff,
            46,
            380)
            this.fx.ring({
                x, y
            },
            0x7ad0ff,
            60,
            520)
            this.fx.burst({
                x, y
            },
            0x7ad0ff,
            12)
        }
        this.lastCell.set(u.id,
            {
                cell: here, x, y
            })
        this.posCache.set(u.id,
            {
                x, y
            })
        this.roleCache.set(u.id,
            hero.role)
        const selected = this.sel?.kind === "unit" && this.sel.id === u.id
        const click = hl.clickUnits.has(u.id)

        // Khung tướng: tranh tướng phủ kín khung chữ nhật nằm ngang; dải thông số ở viền dưới
        // (tên · máu + khiên · Mana/Nộ); hàng icon hiệu ứng ở mép trên; đồ ở góc trên phải.
        const W = SLOT_W, H = UNIT_H, c = this.add.container(x,
            y)
        this.dyn.add(c)
        const g = this.add.graphics()
        c.add(g)
        g.fillStyle(0x000000,
            0.5); g.fillRoundedRect(-W / 2 + 2,
            -H / 2 + 4,
            W,
            H,
            6)
        g.fillStyle(mine ? C.me : C.opp,
            1); g.fillRoundedRect(-W / 2,
            -H / 2,
            W,
            H,
            6)
        const cut = `cutout-${u.defId}`
        if (this.textures.exists(cut) && this.textures.get(cut).getSourceImage().width > 1) {
            // tướng cắt nền đứng trên đáy khung, đầu và vai trồi lên khỏi mép trên (POP px)
            const POP = 22, img = this.add.image(0,
                H / 2 - 2,
                cut).setOrigin(0.5,
                1)
            img.setScale((H + POP) / img.height)
            g.fillStyle(0x000000,
                0.35); g.fillRoundedRect(-W / 2 + 2,
                -H / 2 + 2,
                W - 4,
                H - 4,
                5)
            c.add(img)
        } else c.add(portrait(this,
            artKey(this,
                u.defId),
            0,
            0,
            W - 4,
            H - 4))
        const g2 = this.add.graphics()
        c.add(g2)
        // dải tối dưới đáy để chữ và thanh đọc được trên nền tranh
        const stripH = 24, sy = H / 2 - stripH - 2
        g2.fillGradientStyle(0x000000,
            0x000000,
            0x000000,
            0x000000,
            0,
            0,
            0.85,
            0.85); g2.fillRect(-W / 2 + 2,
            sy - 10,
            W - 4,
            10)
        g2.fillStyle(0x000000,
            0.85); g2.fillRect(-W / 2 + 2,
            sy,
            W - 4,
            stripH)
        const left = -W / 2 + 6, bw = W - 12
        c.add(this.add.text(left,
            sy - 1,
            hero.name,
            {
                fontFamily: FONT, fontSize: "10px", color: "#f0e6d2", fontStyle: "bold", stroke: "#000", strokeThickness: 2
            }))
        c.add(this.add.text(W / 2 - 6,
            sy,
            `${u.hp}${u.shield ? `+${u.shield}` : ""}`,
            {
                fontFamily: FONT, fontSize: "9px", color: C.text
            }).setOrigin(1,
            0))
        // thanh máu + khiên
        // như LoL: khiên là đoạn trắng nối sau máu; máu + khiên vượt máu tối đa thì cả thanh co lại theo tổng
        const total = Math.max(u.maxHp,
                u.hp + u.shield), pct = Math.max(0,
                u.hp / u.maxHp)
        const hpW = bw * (u.hp / total), shW = bw * (u.shield / total)
        g2.fillStyle(0x222222,
            1); g2.fillRect(left,
            sy + 12,
            bw,
            6)
        g2.fillStyle(pct > 0.5 ? 0x4cc07a : pct > 0.25 ? 0xf5b942 : 0xf0584a,
            1); g2.fillRect(left,
            sy + 12,
            Math.max(2,
                hpW),
            6)
        if (shW > 0) { g2.fillStyle(0xf4f4f8,
            1); g2.fillRect(left + hpW,
            sy + 12,
            shW,
            6) }
        // thanh Mana / Nộ
        const res = RESOURCES[hero.resource ?? "mana"]
        g2.fillStyle(0x222222,
            1); g2.fillRect(left,
            sy + 19,
            bw,
            3)
        g2.fillStyle(res.color,
            1); g2.fillRect(left,
            sy + 19,
            Math.max(1,
                bw * Math.min(1,
                    u.mana / res.max)),
            3)
        this.items.drawUnitItems(c,
            u,
            W / 2 - 8 - u.items.length * 17,
            -H / 2 + 10)
        this.drawStatusTokens(c,
            u)
        // lượt đi được cấp (Tốc Biến, chiêu "đi thêm 1 ô"): dấu nhỏ góc dưới trái = tranh Tốc Biến + số lượt
        const moves = u.stacks.get("t:move") ?? 0
        if (moves > 0 && mine) {
            const bx = -W / 2 + 4, by = H / 2 - 40
            c.add(this.add.rectangle(bx,
                by,
                30,
                15,
                0x0a2a3a,
                0.9).setOrigin(0).setStrokeStyle(1,
                0x7ad0ff,
                1))
            if (this.textures.exists("art-toc_bien")) c.add(portrait(this,
                "art-toc_bien",
                bx + 7.5,
                by + 7.5,
                13,
                13))
            c.add(this.add.text(bx + 16,
                by + 1,
                `+${moves}`,
                {
                    fontFamily: FONT, fontSize: "10px", color: "#bfe9ff", fontStyle: "bold"
                }))
        }
        // đứng trong Tường Băng: bị giam (phủ băng + nhãn)
        if (isWallCell(s,
            u.owner,
            u.lane,
            u.row)) {
            c.add(this.add.rectangle(0,
                0,
                W,
                H,
                0x9ff0ff,
                0.25).setStrokeStyle(2,
                0xbfe9ff,
                1))
            c.add(this.add.text(0,
                -H / 2 + 2,
                t("g.jailed"),
                {
                    fontFamily: FONT, fontSize: "10px", color: "#e8f8ff", fontStyle: "bold", backgroundColor: "#1a4a6acc", padding: {
                        x: 4, y: 1
                    }
                }).setOrigin(0.5,
                0))
        }
        // bị khiêu khích bởi vùng có máu (Tibbers): viền đỏ nhấp nháy + icon Khiêu khích, đòn đánh tự đánh vào vùng
        if (tauntZoneOf(s,
            u)) {
            const tg = this.add.graphics()
            tg.lineStyle(2,
                0xff4a3a,
                1).strokeRoundedRect(-W / 2 - 2,
                -H / 2 - 2,
                W + 4,
                H + 4,
                7)
            c.add(tg)
            this.tweens.add({
                targets: tg, alpha: {
                    from: 1, to: 0.3
                }, duration: 500, yoyo: true, repeat: -1
            })
            if (this.textures.exists("kw-taunt")) c.add(this.add.image(W / 2 - 10,
                H / 2 - 32,
                "kw-taunt").setDisplaySize(16,
                16))
        }
        const flags = [
            u.hidden ? t("g.flags_hidden") : "",
            mine && u.summonedTurn === s.turn ? t("g.flags_new") : "",
            mine && u.attacked ? t("g.flags_attacked") : "",
            mine && u.moved ? t("g.flags_moved") : "",
            u.markedTargetId ? t("g.flags_marked") : "",
        ].filter(Boolean).join(" · ")
        if (flags) c.add(this.add.text(-W / 2 + 4,
            -H / 2 + 3,
            flags,
            {
                fontFamily: FONT, fontSize: "8px", color: "#f0e6d2", backgroundColor: "#000000a0", padding: {
                    x: 2, y: 0
                }
            }))
        if (hasStatus(u,
            "freeze")) { g2.fillStyle(0x9ff0ff,
            0.22); g2.fillRoundedRect(-SLOT_W / 2,
            -UNIT_H / 2,
            SLOT_W,
            UNIT_H,
            8) }
        if (u.hidden) c.setAlpha(0.55)

        const line = selected ? C.sel : click ? C.hit : mine ? C.meLine : C.oppLine
        const frame = frameBg(this,
            mine ? "ui-unit_frame_blue" : "ui-unit_frame_red",
            -SLOT_W / 2 - 3,
            -UNIT_H / 2 - 3,
            SLOT_W + 6,
            UNIT_H + 6,
            14)
        if (frame) c.add(frame)
        if (!frame || selected || click) { g2.lineStyle(selected || click ? 3 : 1.5,
            line,
            1); g2.strokeRoundedRect(-SLOT_W / 2,
            -UNIT_H / 2,
            SLOT_W,
            UNIT_H,
            8) }
        if (click) this.pulse(x,
            y,
            SLOT_W,
            UNIT_H)
        if (selected) this.tweens.add({
            targets: c, scale: 1.04, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        })

        this.badge(x + 40,
            y - 34,
            hl.labels.get(u.id))
        const zone = this.add.rectangle(x,
            y,
            SLOT_W,
            UNIT_H,
            0xffffff,
            0.001)
        this.dyn.add(zone)
        this.clickable(zone,
            () => this.onUnit(u))
        this.hoverTip(zone,
            (px, py) => ({
                kind: "unit", id: u.id, x: px, y: py
            }))
    }

    /** Hàng icon hiệu ứng kiểu thanh buff LoL, nằm ngang dọc mép trên chân dung: icon + số vòng còn lại ở góc.
   *  Viền xanh = có lợi, viền đỏ = bất lợi. Tối đa 6 icon. */
    private drawStatusTokens(c: Phaser.GameObjects.Container, u: UnitLike) {
        const tokens: [kwId: string, label: string, left: number][] = [
            ...allBuffs().map((b): [string, string, number] => [`buff:${b.id}`,
                b.short,
                u.stacks.get(`buff:${b.id}`) ?? 0]),
            ...(Object.keys(STATUS_INFO) as StatusId[]).map((st): [string, string, number] => [st,
                STATUS_INFO[st].short,
                u.statuses.get(st) ?? 0]),
        ].filter(([, , left]) => left > 0).slice(0,
            6)
        const size = 15, gap = 2, y = -UNIT_H / 2 - size + 3
        tokens.forEach(([id,
            label,
            left], i) => {
            const x = -SLOT_W / 2 + 4 + i * (size + gap)
            const kw = keywordById(id), good = kw ? kw.good : true
            c.add(this.add.rectangle(x,
                y,
                size,
                size,
                0x000000,
                0.85).setOrigin(0).setStrokeStyle(1.5,
                good ? 0x8fe0a0 : 0xff6a5a,
                1))
            if (this.textures.exists(`kw-${id}`)) c.add(this.add.image(x + 1,
                y + 1,
                `kw-${id}`).setOrigin(0).setDisplaySize(size - 2,
                size - 2))
            else c.add(this.add.text(x + size / 2,
                y + size / 2,
                label.slice(0,
                    2),
                {
                    fontFamily: FONT, fontSize: "8px", color: "#fff", fontStyle: "bold"
                }).setOrigin(0.5))
            c.add(this.add.text(x + size,
                y + size,
                `${left}`,
                {
                    fontFamily: FONT, fontSize: "9px", color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3
                }).setOrigin(1,
                1))
        })
    }



    private drawHand() {
        const n = this.hand.length
        const step = n > 1 ? Math.min(CARD_W + 8,
            (960 - CARD_W) / (n - 1)) : 0
        const x0 = 494 - (step * (n - 1)) / 2
        this.hand.forEach((h, i) => {
            const card = CARDS[h.defId]
            const x = x0 + i * step, selected = this.sel?.kind === "hand" && this.sel.uid === h.uid
            const y = selected ? 668 : 690
            const afford = card.kind !== "hero"
            const view = drawCard(this,
                card,
                x,
                y,
                1,
                {
                    selected, dim: !afford
                })
            view.setAngle((i - (n - 1) / 2) * 1.5)
            this.dyn.add(view)
            const zone = this.add.rectangle(x,
                y,
                step < CARD_W ? step : CARD_W,
                CARD_H,
                0xffffff,
                0.001)
            this.dyn.add(zone)
            this.clickable(zone,
                () => {
                    if (this.s.activeSide !== this.side || this.s.phase !== "playing") return this.flash(t("g.not_your_turn"))
                    this.pending = null
                    this.sel = selected ? null : {
                        kind: "hand", uid: h.uid, defId: h.defId
                    }
                    this.render()
                },
                () => {
                    this.preview?.destroy()
                    this.preview = drawCard(this,
                        card,
                        Phaser.Math.Clamp(x,
                            120,
                            860),
                        400,
                        1.65).setDepth(15)
                    this.setTip(this.cardDetail(h.defId))
                },
                () => { this.preview?.destroy(); this.preview = undefined })
        })
    }

    private cardDetail(defId: string) {
        const card = CARDS[defId]
        if (card.kind === "item") return this.items.detail(card.itemId)
        const bonus = card.kind !== "hero" && card.bonus?.length ? `\n${card.bonus.join("\n")}` : ""
        if (card.kind === "spell") return `${t("g.card_spell",
            {
                name: card.name
            })}\n${card.desc}${bonus}`
        if (card.kind === "trap") return `${t("g.card_trap",
            {
                name: card.name
            })}\n${card.desc}${bonus}`
        if (card.kind !== "hero") return `${t("g.card_other",
            {
                name: card.name, kind: DECK_KIND_NAME[card.kind]
            })}\n${card.desc}${bonus}`
        const hero = getHero(defId)!
        const res = RESOURCES[card.resource ?? "mana"]
        const lines = [t("g.hero_line",
            {
                name: card.name, role: ROLE_INFO[card.role].name, res: res.name
            }),
        t("g.hero_stats",
            {
                ad: card.atk, ap: card.ap, hp: card.hp, ar: card.armor, mr: card.mr
            }),
        card.strength]
        if (card.counter) lines.push(t("g.counter",
            {
                v: card.counter
            }))
        if (card.concept) lines.push(t("g.concept",
            {
                v: card.concept
            }))
        if (hero.passive) lines.push(` ${hero.passive.name}: ${hero.passive.desc}`)
        for (const id of card.skills) lines.push(`${SKILLS[id].key} ${SKILLS[id].name}: ${SKILLS[id].formula ?? SKILLS[id].desc}`)
        return lines.join("\n")
    }

    /** Bảng bên phải do React vẽ (ui/Panel.tsx): ở đây chỉ đẩy trạng thái + vị trí vùng bảng trên màn hình */
    private drawPanel() {
        ui.set({
            s: this.s, side: this.side, hand: this.hand, sel: this.sel, pending: this.pending, picks: this.picks.length,
            summonNeed: this.s.phase === "summon" ? this.summonNeed() : 0, smiteMode: this.smiteMode, shopOpen: this.shopOpen,
            rect: this.panelRect(), inMatch: true,
        })
    }

    /** Vùng bảng (toạ độ thế giới PANEL_X..) đổi ra px CSS trên màn hình, theo camera và cỡ canvas */
    private panelRect() {
        const cam = this.cameras.main, box = this.game.canvas.getBoundingClientRect(), k = box.width / this.scale.width
        const toX = (wx: number) => box.left + (cam.x + (wx - cam.worldView.x) * cam.zoom) * k
        const toY = (wy: number) => box.top + (cam.y + (wy - cam.worldView.y) * cam.zoom) * k
        // cửa sổ hẹp: vùng bảng có thể lọt ra ngoài màn hình, nên ép bảng (tối thiểu 280px) nằm sát mép phải trong màn hình
        const w = Math.max(280,
            toX(PANEL_X + PANEL_W + 6) - toX(PANEL_X - 6))
        const x = Math.min(toX(PANEL_X - 6),
            window.innerWidth - w)
        const y = Math.max(0,
                box.top,
                toY(0)), h = Math.min(window.innerHeight,
                box.bottom,
                toY(VIEW_H)) - y
        return {
            x, y, w, h
        }
    }

    /** Hành động bảng React gọi ngược vào đây */
    private registerUiActions() {
        ui.actions = {
            endTurn: () => this.send("endTurn",
                {
                }),
            toggleSmite: () => { this.smiteMode = !this.smiteMode; this.render() },
            toggleShop: () => { this.shopOpen = !this.shopOpen; this.render() },
            select: (sel) => {
                const hs = this.sel
                if (sel?.kind === "roster" || sel?.kind === "unit") {
                    // đang cầm lá cần chọn tướng mình (vd. Dịch Chuyển): bấm tướng trong Đội Hình là dùng lá lên tướng đó
                    if (hs?.kind === "hand" && cardTargets(this.s,
this.side!,
hs.defId).includes(sel.id)) return this.send("play",
                        {
                            uid: hs.uid, targetId: sel.id
                        })
                }
                this.pending = null; this.sel = sel as Selection; this.render()
            },
            cast: (unitId, skillId) => { const u = this.s.units.get(unitId); if (u) this.cast(u,
                skillId) },
            cancelPending: () => { this.pending = null; this.render() },
            confirmSummon: () => { this.room!.send("summonPick",
                {
                    placements: this.picks
                }); this.picks = []; this.sel = null; this.render() },
            useCard: (uid) => this.send("play",
                {
                    uid
                }),
            unequip: (unitId, index) => this.send("unequip",
                {
                    unitId, index
                }),
        }
    }

    private drawEnd() {
        const win = this.s.winner === this.side
        this.dyn.add(this.add.rectangle(640,
            400,
            1280,
            800,
            0x000000,
            0.65).setInteractive())
        const title = this.add.text(545,
            360,
            win ? t("g.win") : t("g.lose"),
            {
                fontFamily: FONT, fontSize: "56px", color: win ? "#f5d27a" : C.red, fontStyle: "bold", stroke: "#000", strokeThickness: 8,
            }).setOrigin(0.5)
        this.dyn.add(title)
        this.label(545,
            425,
            t("g.reload"),
            16,
            C.muted)
    }

    // ================= TƯƠNG TÁC =================

    private onUnit(u: UnitLike) {
        const s = this.s, me = this.side!
        const myTurn = s.activeSide === me && s.phase === "playing"
        const sel = this.sel
        if (myTurn && this.pending) {
            if (skillTargets(s,
                s.units.get(this.pending.unitId)!,
                this.pending.skillId).includes(u.id)) {
                return this.send("skill",
                    {
                        ...this.pending, targetId: u.id
                    })
            }
            return this.flash(t("g.bad_target"))
        }
        if (myTurn && sel?.kind === "set") {
            if (cardTargets(s,
                me,
                sel.defId).includes(u.id)) return this.send("flip",
                {
                    lane: sel.lane, targetId: u.id
                })
        }
        if (myTurn && sel?.kind === "hand") {
            const card = CARDS[sel.defId]
            if (card.kind === "item" && u.owner === me) return this.send("equip",
                {
                    uid: sel.uid, unitId: u.id
                })
            if (getPlay(card.id) && cardTargets(s,
                me,
                card.id).includes(u.id)) return this.send("play",
                {
                    uid: sel.uid, targetId: u.id
                })
        }
        if (myTurn && sel?.kind === "unit") {
            const a = s.units.get(sel.id)
            const t: Target = {
                kind: "unit", id: u.id
            }
            if (a?.owner === me && attackTargets(s,
                a).some((x) => sameTarget(x,
                t))) return this.send("attack",
                {
                    unitId: a.id, target: t
                })
        }
        this.pending = null
        this.sel = sel?.kind === "unit" && sel.id === u.id ? null : {
            kind: "unit", id: u.id
        }
        this.render()
    }

    /** Bấm chiêu: chiêu không cần mục tiêu thì tung luôn, còn lại chờ chọn mục tiêu. Tướng vẫn được chọn để combo tiếp. */
    private cast(u: UnitLike, skillId: string) {
        if (SKILLS[skillId].target === "none") {
      this.room!.send("skill",
          {
              unitId: u.id, skillId
          })
      return
        }
        this.pending = {
            unitId: u.id, skillId
        }
        this.render()
    }

    private send(type: string, msg: object, keepSel = false) {
    this.room!.send(type,
        msg)
    // sau khi tung chiêu có mục tiêu hoặc vừa đi: giữ tướng đang chọn để làm tiếp
    const keep = type === "skill" && this.pending ? {
        kind: "unit" as const, id: this.pending.unitId
    } : keepSel ? this.sel : null
    this.sel = keep
    this.pending = null
    this.render()
    }

    // ================= TIỆN ÍCH =================

    private unitAt(side: string, lane: number, row: string): UnitLike | undefined {
        let found: UnitLike | undefined
        this.s.units.forEach((u: UnitLike & { status: string }) => { if (u.owner === side && u.status === "board" && u.lane === lane && u.row === row) found = u })
        return found
    }

    private unitPos(u: UnitLike): Pos {
        return {
            x: laneX(u.lane), y: Y[u.row as Row][u.owner === this.side ? "me" : "opp"]
        }
    }

    private towerPos(side: string, lane: number): Pos {
        return {
            x: laneX(lane), y: Y.tower[side === this.side ? "me" : "opp"]
        }
    }

    /** Vẽ icon chiêu/nội tại đã tải */
    private icon(key: string, x: number, y: number, size: number, dim = false) {
        const img = this.add.image(x,
            y,
            key).setDisplaySize(size,
            size)
        if (dim) img.setTint(0x555555)
        const g = this.add.graphics()
        g.lineStyle(1.5,
            dim ? 0x3a3a44 : 0xf5d27a,
            1); g.strokeRect(x - size / 2,
            y - size / 2,
            size,
            size)
        this.dyn.add([img,
            g])
    }

    /** Icon chiêu bay lên trên đầu người tung */
    private castIcon(skillId: string, p: Pos) {
        const key = skillIconKey(this,
            skillId)
        if (!key) return
        const img = this.add.image(p.x,
            p.y - 20,
            key).setDisplaySize(44,
            44).setDepth(25).setAlpha(0)
        this.tweens.chain({
            targets: img,
            tweens: [
                {
                    alpha: 1, y: p.y - 60, duration: 200, ease: "Back.easeOut"
                },
                {
                    alpha: 0, y: p.y - 80, duration: 500, delay: 500
                },
            ],
            onComplete: () => img.destroy(),
        })
    }

    private pulse(x: number, y: number, w: number, h: number) {
        const r = this.add.rectangle(x,
            y,
            w + 8,
            h + 8).setStrokeStyle(3,
            C.hit,
            1)
        this.dyn.add(r)
        this.tweens.add({
            targets: r, alpha: 0.2, duration: 550, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        })
    }

    private label(x: number, y: number, str: string, size: number, color: string, bold = false) {
        const t = this.add.text(x,
            y,
            str,
            {
                fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal", align: "center"
            }).setOrigin(0.5)
        this.dyn.add(t)
        return t
    }

    private text(x: number, y: number, str: string, size: number, color: string, bold = false, wrap?: number) {
        const t = this.add.text(x,
            y,
            str,
            {
                fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal",
                wordWrap: wrap ? {
                    width: wrap
                } : undefined,
            })
        this.dyn.add(t)
        return t
    }

    private badge(x: number, y: number, str?: string) {
        if (!str) return
        const t = this.add.text(x + 30,
            y,
            str,
            {
                fontFamily: FONT, fontSize: "13px", color: "#1d1d1f", fontStyle: "bold", backgroundColor: "#f5b942", padding: {
                    x: 6, y: 2
                }
            }).setOrigin(0.5)
        this.dyn.add(t)
    }

    private button(x: number, y: number, w: number, h: number, str: string, enabled: boolean, onClick: () => void, onHover?: () => void, color = 0x2f6fde) {
        this.dyn.add(buttonBg(this,
            x,
            y,
            w,
            h,
            enabled,
            color))
        this.dyn.add(this.add.text(x + w / 2,
            y + h / 2,
            str,
            {
                fontFamily: FONT, fontSize: "12px", color: enabled ? "#fff" : C.muted, fontStyle: "bold"
            }).setOrigin(0.5))
        const zone = this.add.rectangle(x + w / 2,
            y + h / 2,
            w,
            h,
            0xffffff,
            0.001)
        this.dyn.add(zone)
        if (enabled) this.clickable(zone,
            onClick,
            onHover)
        else if (onHover) zone.setInteractive().on("pointerover",
            onHover)
    }

    /** Rê chuột vào vùng: báo React mở tooltip shadcn tại toạ độ con trỏ (px CSS); rời ra thì đóng */
    private hoverTip(zone: Phaser.GameObjects.Rectangle, make: (x: number, y: number) => NonNullable<Hover>) {
        zone.on("pointerover",
            (p: Phaser.Input.Pointer) => ui.set({
                hover: make((p.event as MouseEvent).clientX,
                    (p.event as MouseEvent).clientY)
            }))
        zone.on("pointerout",
            () => ui.set({
                hover: null
            }))
        zone.on("destroy",
            () => { if (ui.get().hover) ui.set({
                hover: null
            }) })
    }

    private clickable(obj: Phaser.GameObjects.Rectangle, onClick: () => void, onHover?: () => void, onOut?: () => void) {
        obj.setInteractive({
            useHandCursor: true
        }).on("pointerdown",
            (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
                ev.stopPropagation()
                onClick()
            })
        if (onHover) obj.on("pointerover",
            onHover)
        if (onOut) obj.on("pointerout",
            onOut)
    }

    private centerText(str: string) {
        this.label(545,
            300,
            str,
            20,
            C.text)
    }

    private flash(msg: string) {
        this.toast.showMessage(msg)
    }
}
