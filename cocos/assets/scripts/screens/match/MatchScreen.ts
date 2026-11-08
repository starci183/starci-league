// Màn trận, bóc từ docs/mockups/match/ (match-hud, chain, targeting): thanh pha trên cùng, cột chi tiết tướng bên trái,
// bàn 10 ô ở giữa (bg/board), cột chồng bài, cột phải (chuỗi kỹ năng, nhật ký trận, đội dự bị, nút), tay bài ở đáy.
// Mọi thao tác dựng từ cg:legal của server: gọi tướng, đánh lá, chọn mục tiêu, đòn không cần lá, ghép đồ, nối chuỗi.
// VFX: mỗi chiêu một ô hiệu ứng riêng (vfx/registry.ts), tạm thời là một hạt.
import {
    Graphics, Node, Sprite, Tween, UIOpacity, Vec3, tween
} from "cc"
import {
    C, at, withAlpha
} from "../../dna/theme"
import {
    actionsForHandCard, gameActions, gameOf, getGame, heroName, onGame, onGameEvents, targetsOf, type CardView
} from "../../net/game"
import {
    settings
} from "../../net/settings"
import {
    swapUnits
} from "../../vfx/swap"
import {
    cg
} from "../../shared"
import {
    frameOf
} from "../../ui/assets"
import {
    Button, Frame, box, clear, drawGem, panel, rule, text
} from "../../ui/kit"
import {
    cardBack, matchCard
} from "../../ui/matchCard"
import {
    skillArt, slot
} from "../../ui/slot"
import {
    mfWaves
} from "../../vfx/missfortune"
import {
    namiGroups, namiPrimary
} from "../../vfx/nami"
import {
    rayBeats, riftBeats
} from "../../vfx/velkoz"
import {
    playSkill, skillKey, spellStyle, styleOf, type Pt
} from "../../vfx/registry"
import {
    AimLine, trackMouse
} from "./aim"
import {
    CardZoom
} from "./cardZoom"
import {
    ReactionWindow, renderChainLinks
} from "./chainWindow"
import {
    presentEvent
} from "./eventFx"
import {
    renderBlindPicks, renderLaneLocks, renderLaneMarkers, renderRespawn
} from "./boardOverlays"
import {
    renderEffectsTab, renderItemsTab
} from "./inspectorPanels"
import {
    pickDialogFor
} from "./specialDialogs"
import {
    UnitTooltip
} from "./unitTooltip"
import {
    choiceDialog, craftDialog, modeDialog, modeName, stealDialog
} from "./dialogs"
import type {
    Nav
} from "../nav"

type Side = cg.Side
const other = (s: Side): Side => s === "A" ? "B" : "A"

const BOARD = {
    x: -33, y: 45, w: 1095, h: 730
}
const LANE_X = [-430,
    -214,
    0,
    211,
    425]
const ROW_Y = {
    foe: 207, mine: -169
}
const PAD_X = [-214,
    211]
const STEPS: [cg.TurnStep, string][] = [["draw",
    "Draw"],
["reward",
    "Reward"],
["standby",
    "Standby"],
["main1",
    "Main 1"],
["battle",
    "Battle"],
["main2",
    "Main 2"],
["end",
    "End"]]
const ROLE: Record<string, string> = {
    fighter: "Đấu sĩ", tank: "Đỡ đòn", assassin: "Sát thủ", marksman: "Xạ thủ", mage: "Pháp sư", support: "Hỗ trợ"
}

interface Targeting { options: cg.Action[]; source: string; title: string; step?: "actor" | "target" }

/** Tướng thực hiện của một hành động đánh (đòn đánh thường, đòn không cần lá, lá có args.actor) */
const actorOfAction = (a: cg.Action): string | undefined => a.t === "attack" ? a.actor : a.t === "play" || a.t === "chain" ? a.args?.actor : undefined

export function buildMatch(root: Node, nav: Nav): () => void {
    // ---- khung tĩnh ----
    const inspectorPanel = panel(root,
        330,
        800,
        at(177,
            0).x,
        at(0,
            410).y)
    const sidePanel = panel(root,
        330,
        240,
        at(177,
            0).x,
        at(0,
            948).y,
        "none")
    const rightPanel = panel(root,
        320,
        1060,
        at(1745,
            0).x,
        at(0,
            537).y,
        "none")
    rule(root,
        1205,
        at(962,
            0).x,
        at(0,
            128).y,
        false,
        C.goldDark)
    const boardNode = box("Board",
        root,
        BOARD.w,
        BOARD.h,
        BOARD.x,
        BOARD.y)
    void frameOf("bg/board-flat").then((f) => {
        if (!f || !boardNode.isValid) return
        const s = boardNode.addComponent(Sprite)
        s.sizeMode = Sprite.SizeMode.CUSTOM
        s.spriteFrame = f
    })
    new Frame(boardNode,
        BOARD.w,
        BOARD.h,
        0,
        0,
        {
            fill: null, stroke: C.gold
        })
    const units = box("Units",
        boardNode,
        BOARD.w,
        BOARD.h)
    const boardOverlays = box("Overlays",
        boardNode,
        BOARD.w,
        BOARD.h)
    const vfxLayer = box("Vfx",
        root,
        1920,
        1080)

    // ---- vùng động ----
    const top = box("Top",
        root,
        1920,
        120,
        0,
        at(0,
            55).y)
    const inspector = box("Inspector",
        inspectorPanel,
        330,
        800)
    const sideInfo = box("SideInfo",
        sidePanel,
        330,
        240)
    const rail = box("Rail",
        root,
        120,
        800,
        at(1521,
            0).x,
        at(0,
            460).y)
    const chainBox = box("Chain",
        rightPanel,
        320,
        1060)
    const hand = box("Hand",
        root,
        1180,
        220,
        at(970,
            0).x,
        at(0,
            975).y)
    const hoverLayer = box("Hover",
        root,
        1920,
        1080)
    const overlay = box("Overlay",
        root,
        1920,
        1080)
    const zoom = new CardZoom(hoverLayer)
    const tip = new UnitTooltip(hoverLayer)
    const aim = new AimLine(hoverLayer)
    let stopAim: (() => void) | null = null
    const HAND = {
        x: at(970,
            0).x, y: at(0,
            975).y
    }
    const cardPos = new Map<string, Pt>()

    let selectedUnit: string | null = null
    /** Tướng phe mình vừa ra chiêu / đánh gần nhất: cột chi tiết ưu tiên hiện tướng này khi chưa chọn tay */
    let lastActor: string | null = null
    let targeting: Targeting | null = null
    let inspectorTab: "items" | "skills" | "effects" = "skills"
    let message = ""
    let lastView: CardView | null = null

    const view = () => getGame().view
    const legal = () => getGame().legal

    /** Toạ độ sân khấu của một tướng (để bay hiệu ứng) */
    function posOf(v: CardView, unitId: string): Pt {
        const u = v.units[unitId]
        const you = v.you ?? "A"
        if (u) {
            const mineSide = u.side === you
            const lane = v.lanes[u.side].indexOf(unitId)
            if (lane >= 0) return {
                x: BOARD.x + LANE_X[lane], y: BOARD.y + (mineSide ? ROW_Y.mine : ROW_Y.foe)
            }
            if (v.extra[u.side] === unitId) return {
                x: BOARD.x + PAD_X[mineSide ? 0 : 1], y: BOARD.y
            }
            return mineSide ? {
                x: at(1743,
                    0).x, y: at(0,
                    650).y
            } : {
                x: at(405,
                    0).x, y: at(0,
                    50).y
            }
        }
        return {
            x: BOARD.x, y: BOARD.y
        }
    }

    // ---- hành động ----
    function endAim() {
        stopAim?.()
        stopAim = null
        aim.hide()
    }

    function act(a: cg.Action) {
        endAim()
        zoom.hide()
        targeting = null
        message = ""
        gameActions.act(a)
    }

    const modeOf = (a: cg.Action) => a.t === "summon" ? a.mode : a.t === "play" || a.t === "chain" || a.t === "ability" ? a.args?.mode : undefined

    function describe(a: cg.Action, i: number): string {
        const m = modeOf(a)
        if (m) return modeName(m)
        if ((a.t === "play" || a.t === "chain") && a.args) {
            if (a.args.pick) return a.args.pick
            if (a.args.discard?.length) return `Bỏ ${a.args.discard.length} lá`
            if (a.args.lane !== undefined) return `Đường ${a.args.lane + 1}`
            if (a.args.amount !== undefined) return `Mức ${a.args.amount}`
            if (a.args.color) return a.args.color
        }
        return `Cách ${i + 1}`
    }

    /** Một nhóm hành động cho cùng mục tiêu: 1 thì gửi, nhiều thì hỏi */
    function resolve(options: cg.Action[], hero?: string) {
        if (!options.length) return
        if (options.length === 1) return act(options[0])
        const modes = options.map(modeOf)
        if (hero && modes.every((m) => !!m)) {
            const u = view()?.units[`${view()?.you ?? "A"}:${hero}`]
            return modeDialog(overlay,
                hero,
                options.map((a) => ({
                    mode: modeOf(a)!, action: a
                })),
                options[0].t === "summon" ? "weapon" : "form",
                u?.transform?.id,
                act)
        }
        const v = view()
        if (v && pickDialogFor(overlay,
            v,
            options,
            act)) return
        choiceDialog(overlay,
            "Chọn cách đánh",
            options.map((a, i) => ({
                label: describe(a,
                    i), action: a
            })),
            act)
    }

    function startTargeting(options: cg.Action[], source: string, title: string, hero?: string) {
        const withTarget = options.filter((a) => {
            const t = targetsOf(a)
            return t.units.length || t.lanes.length
        })
        if (!withTarget.length) return resolve(options,
            hero)
        // Lá cần chọn người đánh trước (đòn đánh thường: nhiều tướng có thể đánh) rồi mới chọn mục tiêu
        const actors = [...new Set(options.map(actorOfAction).filter((x): x is string => !!x))]
        const step = actors.length > 1 ? "actor" : "target"
        targeting = {
            options, source, title: step === "actor" ? "Chọn tướng thực hiện" : title, step
        }
        startAim(options,
            source,
            step)
        render()
    }

    /** Đường ngắm từ lá / tướng nguồn tới chuột; hút vào mục tiêu hợp lệ gần nhất trong 70px */
    function startAim(options: cg.Action[], source: string, step: "actor" | "target" = "target") {
        const v = view()
        if (!v) return
        endAim()
        const from = cardPos.get(source) ?? (v.units[source] ? posOf(v,
            source) : v.units[`${v.you ?? "A"}:${source}`] ? posOf(v,
            `${v.you ?? "A"}:${source}`) : null)
        if (!from) return
        const points: Pt[] = []
        const you = v.you ?? "A"
        for (const a of options) {
            if (step === "actor") {
                const actor = actorOfAction(a)
                if (actor) points.push(posOf(v,
                    actor))
                continue
            }
            const t = targetsOf(a)
            t.units.forEach((u) => points.push(posOf(v,
                u)))
            t.lanes.forEach((l) => points.push({
                x: BOARD.x + LANE_X[l], y: BOARD.y + (a.t === "summon" && a.side === you ? ROW_Y.mine : a.t === "summon" ? ROW_Y.foe : ROW_Y.mine)
            }))
        }
        aim.show(from)
        stopAim = trackMouse(root,
            (p) => {
                const hit = points.find((q) => Math.hypot(q.x - p.x,
                    q.y - p.y) < 70)
                aim.moveTo(hit ?? p,
                    !!hit)
            })
    }

    function pickTarget(unitId: string | null, lane: number | null, side: Side | null) {
        if (!targeting) return
        if (targeting.step === "actor") {
            const sub = unitId ? targeting.options.filter((a) => actorOfAction(a) === unitId) : []
            if (!unitId || !sub.length) return
            targeting = {
                options: sub, source: targeting.source, title: "Chọn mục tiêu hợp lệ", step: "target"
            }
            selectedUnit = unitId
            startAim(sub,
                unitId)
            render()
            return
        }
        const opts = targeting.options.filter((a) => {
            const t = targetsOf(a)
            if (unitId && t.units.includes(unitId)) return true
            if (lane !== null && t.lanes.includes(lane) && (a.t !== "summon" || side === a.side)) return true
            return false
        })
        if (!opts.length) return
        const src = targeting.source
        endAim()
        targeting = null
        const hero = opts[0].t === "summon" ? opts[0].hero : view()?.players[view()?.you ?? "A"].hand?.find((c) => c.uid === src)?.hero
        resolve(opts,
            hero)
        render()
    }

    function onHandCard(card: cg.Card) {
        const v = view()
        if (!v) return
        // bấm lá chiêu thì cột chi tiết chuyển sang tướng của lá đó
        if (card.hero && v.units[`${v.you ?? "A"}:${card.hero}`]) selectedUnit = `${v.you ?? "A"}:${card.hero}`
        const mine = v.players[v.you ?? "A"].hand ?? []
        const discards = legal().filter((a) => a.t === "discard")
        if (discards.length && discards.length === legal().length) {
            if (!pickDialogFor(overlay,
                v,
                discards,
                act)) act(discards.find((a) => a.t === "discard" && a.uid === card.uid) ?? discards[0])
            return
        }
        const opts = actionsForHandCard(legal(),
            mine,
            card)
        if (!opts.length) {
            message = card.id === "basic" && v.step !== "battle" ? "Đánh thường chỉ dùng ở bước Battle: bấm Bước tiếp" : "Lá này chưa đánh được lúc này"
            return render()
        }
        if (opts.every((a) => (a.t === "play" || a.t === "chain") && a.args?.pick?.startsWith("steal:"))) return stealDialog(overlay,
            v,
            opts,
            act)
        startTargeting(opts,
            card.uid,
            "Chọn mục tiêu hợp lệ",
            card.hero)
    }

    function onUnit(unitId: string, lane: number | null, side: Side) {
        if (targeting) return pickTarget(unitId,
            lane,
            side)
        selectedUnit = unitId
        const v = view()
        if (v && v.units[unitId]?.side === (v.you ?? "A")) {
            const abilities = legal().filter((a) => a.t === "ability" && a.unit === unitId)
            if (abilities.length) {
                render()
                return resolve(abilities,
                    v.units[unitId].hero)
            }
        }
        render()
    }

    function onReserve(hero: string) {
        const v = view()
        if (!v) return
        selectedUnit = `${v.you ?? "A"}:${hero}`
        const summons = legal().filter((a) => a.t === "summon" && a.hero === hero)
        if (summons.length) return startTargeting(summons,
            hero,
            `Chọn đường gọi ${heroName(hero)}`,
            hero)
        render()
    }

    function attackWithSelected() {
        const opts = legal().filter((a) => a.t === "attack" && a.actor === selectedUnit)
        if (opts.length) startTargeting(opts,
            selectedUnit ?? "",
            "Chọn tướng địch để đánh")
    }

    // ---- vẽ ----
    function renderTop(v: CardView) {
        clear(top)
        const you = v.you ?? "A", them = other(you)
        const teamMax = v.rules.teamManaMax ?? 200
        const sideBlock = (side: Side, left: boolean) => {
            const pX = left ? at(405,
                0).x : at(1515,
                0).x
            const heroes = v.players[side].heroes
            slot(top,
                "heroes",
                heroes[0] ?? "",
                64,
                pX,
                -5,
                {
                    edge: side === you ? C.ally : C.enemy
                })
            text(top,
                `${v.names[side] ?? side}${v.bots[side] ? "  BOT" : ""}`,
                left ? at(600,
                    0).x : at(1320,
                    0).x,
                24,
                {
                    size: 22, width: 300, align: left ? "left" : "right", color: C.goldLight
                })
            const lives = v.players[side].lives
            const g = box("Lives",
                top,
                200,
                20,
                left ? at(530,
                    0).x : at(1390,
                    0).x,
                -2).addComponent(Graphics)
            for (let i = 0; i < v.rules.lives; i++) {
                g.fillColor = i < lives ? side === you ? C.ally : C.enemy : withAlpha(C.disabledText,
                    180)
                g.circle((left ? -80 : 80) + (left ? 1 : -1) * i * 15,
                    0,
                    5.5)
                g.fill()
            }
            const mana = v.teamMana?.[side] ?? 0
            const bar = box("Mana",
                top,
                196,
                16,
                left ? at(541,
                    0).x : at(1399,
                    0).x,
                -25).addComponent(Graphics)
            bar.fillColor = C.goldDark
            bar.rect(-98,
                -8,
                196,
                16)
            bar.fill()
            bar.fillColor = C.bg
            bar.rect(-96,
                -6,
                192,
                12)
            bar.fill()
            const fillW = 192 * Math.min(1,
                mana / teamMax)
            bar.fillColor = C.tealDark
            bar.rect(-96,
                -6,
                fillW,
                12)
            bar.fill()
            bar.fillColor = withAlpha(C.goldLight,
                70)
            bar.rect(-96,
                1,
                fillW,
                4)
            bar.fill()
            text(top,
                `Mana ${mana}/${teamMax}`,
                left ? at(600,
                    0).x : at(1336,
                    0).x,
                -2,
                {
                    font: "number", size: 15, width: 100, height: 18, color: C.goldLight, align: left ? "right" : "left"
                })
        }
        sideBlock(them,
            true)
        sideBlock(you,
            false)
        const foeHand = v.players[them].handCount
        const fan = Math.min(foeHand,
            6)
        for (let i = 0; i < fan; i++) {
            const back = cardBack(top,
                34,
                48,
                at(930,
                    0).x + (i - (fan - 1) / 2) * 15,
                41)
            back.angle = (fan - 1) / 2 * 4 - i * 4
        }
        text(top,
            `Tay đối thủ · ${foeHand} lá`,
            at(1055,
                0).x,
            44,
            {
                size: 14, width: 160, height: 18, color: C.textMuted
            })
        STEPS.forEach(([step, label], i) => {
            const on = v.step === step && v.phase !== "blind"
            const x = at(699 + i * 85.2,
                0).x
            text(top,
                label,
                x,
                2,
                {
                    font: "textMedium", bold: true, size: 19, width: 82, upper: false, color: on ? C.goldLight : C.textMuted
                })
            const u = box("Underline",
                top,
                80,
                3,
                x,
                -14).addComponent(Graphics)
            u.fillColor = on ? C.teal : withAlpha(C.goldDark,
                160)
            u.rect(-40,
                -1,
                80,
                on ? 3 : 1)
            u.fill()
        })
        text(top,
            `Vòng ${v.round}`,
            at(860,
                0).x,
            -37,
            {
                font: "textMedium", bold: true, size: 26, width: 140, upper: false
            })
        const chip = new Frame(top,
            180,
            30,
            at(1020,
                0).x,
            -37,
            {
                fill: withAlpha(C.tealDeep,
                    220), stroke: C.teal, inner: null, chamfer: 8
            })
        text(chip.node,
            v.phase === "blind" ? "Gọi tướng úp" : v.active === you ? "Lượt của bạn" : "Lượt đối thủ",
            0,
            0,
            {
                font: "title", size: 18, width: 170, height: 28
            })
    }

    function renderInspector(v: CardView) {
        clear(inspector)
        const you = v.you ?? "A"
        const id = selectedUnit && v.units[selectedUnit] ? selectedUnit : lastActor && v.units[lastActor] ? lastActor : v.lanes[you].find((x) => !!x) ?? `${you}:${v.players[you].heroes[0]}`
        const u = v.units[id]
        if (!u) return
        const g = gameOf(v)
        const def = cg.getHero(u.hero)
        const rel = (x: number, y: number) => ({
            x: x - 177, y: 410 - y
        })
        const chip = new Frame(inspector,
            265,
            32,
            0,
            rel(0,
                96).y,
            {
                fill: withAlpha(C.bg,
                    240), chamfer: 10, inner: null
            })
        text(chip.node,
            heroName(u.hero),
            0,
            0,
            {
                font: "title", size: 22, width: 250, height: 30
            })
        slot(inspector,
            "heroes",
            u.hero,
            80,
            rel(83,
                0).x,
            rel(0,
                160).y,
            {
                edge: u.side === you ? C.ally : C.enemy
            })
        const line = (s: string, y: number, size: number, color = C.text) => text(inspector,
            s,
            rel(227,
                0).x,
            rel(0,
                y).y,
            {
                size, width: 170, color
            })
        line(heroName(u.hero),
            135,
            26,
            C.goldLight)
        line(ROLE[g.role(u)] ?? "",
            160,
            18,
            C.teal)
        line(def?.damage === "magic" ? "Sát thương phép" : "Sát thương vật lý",
            183,
            16)
        line(u.side === you ? "Phe ta" : "Phe địch",
            205,
            16,
            u.side === you ? C.ally : C.enemy)
        text(inspector,
            `${u.hp} / ${u.maxHp}${u.shield ? `  (+${u.shield})` : ""}`,
            0,
            rel(0,
                228).y,
            {
                font: "number", size: 20, width: 260, color: C.goldLight
            })
        const hp = box("Hp",
            inspector,
            285,
            12,
            0,
            rel(0,
                249).y).addComponent(Graphics)
        hp.fillColor = withAlpha(C.bg,
            240)
        hp.rect(-142,
            -6,
            285,
            12)
        hp.fill()
        hp.fillColor = u.side === you ? C.teal : C.enemy
        hp.rect(-142,
            -6,
            285 * Math.max(0,
                u.hp / Math.max(1,
                    u.maxHp)),
            12)
        hp.fill()
        const stats: [string, number][] = [["AD",
            g.atk(u)],
        ["AP",
            g.ap(u)],
        ["Giáp",
            g.armor(u)],
        ["KPhép",
            g.mr(u)]]
        new Frame(inspector,
            285,
            56,
            0,
            rel(0,
                285).y,
            {
                fill: withAlpha(C.bg,
                    220), inner: null, stroke: C.goldDark, chamfer: 6
            })
        stats.forEach(([k, val], i) => {
            const x = -107 + i * 69
            text(inspector,
                k,
                x,
                rel(0,
                    273).y,
                {
                    size: 15, width: 66, color: C.textMuted
                })
            text(inspector,
                String(Math.round(val)),
                x,
                rel(0,
                    297).y,
                {
                    font: "number", size: 22, width: 66, color: C.goldLight
                })
        })
        const tabs: ["items" | "skills" | "effects", string, number][] = [["items",
            "Đồ",
            -97],
        ["skills",
            "Chiêu",
            -3],
        ["effects",
            "Bổ trợ",
            94]]
        for (const [key, label, x] of tabs) {
            const b = new Button(inspector,
                label,
                90,
                34,
                x,
                rel(0,
                    340).y,
                () => { inspectorTab = key; render() },
                "gold",
                20)
            b.setSelected(inspectorTab === key)
        }
        const list: { art: string; kind: "skills" | "items"; title: string; sub: string }[] = []
        if (inspectorTab === "skills" && def) {
            list.push({
                art: skillArt(u.hero,
                    "p"), kind: "skills", title: def.passive.name, sub: "Nội tại"
            })
            for (const k of ["Q",
                "E",
                "R"] as const) {
                const s = def.skills[k]
                let cost = ""
                try { cost = `${g.manaCost(u, s, { uid: "x", kind: "skill", id: k, hero: u.hero, side: u.side } as cg.Card)} mana` } catch { /* chiêu tốn mana theo lựa chọn */ }
                list.push({
                    art: skillArt(u.hero,
                        k), kind: "skills", title: `${k} · ${s.name}`, sub: cost
                })
            }
        }
        text(inspector,
            inspectorTab === "skills" ? "Kỹ năng" : inspectorTab === "items" ? "Đồ đã đeo" : "Hiệu ứng",
            -48,
            rel(0,
                385).y,
            {
                font: "title", size: 26, width: 160, align: "left"
            })
        if (inspectorTab === "items") return renderItemsTab(inspector,
            v,
            u,
            rel(0,
                420).y)
        if (inspectorTab === "effects") return renderEffectsTab(inspector,
            v,
            u,
            rel(0,
                420).y)
        list.slice(0,
            5).forEach((row, i) => {
            const y = rel(0,
                482 + i * 70).y
            slot(inspector,
                row.kind,
                row.art,
                50,
                -117,
                y)
            text(inspector,
                row.title,
                30,
                y + 11,
                {
                    font: "textMedium", bold: true, size: 22, width: 200, align: "left", upper: false
                })
            text(inspector,
                row.sub,
                30,
                y - 15,
                {
                    size: 16, width: 200, align: "left", color: C.textMuted
                })
        })
    }

    function renderBoard(v: CardView) {
        clear(units)
        const you = v.you ?? "A"
        const tg = targeting ? targetable(targeting) : null
        for (const side of [you,
            other(you)] as Side[]) {
            const mineSide = side === you
            const y = mineSide ? ROW_Y.mine : ROW_Y.foe
            for (let lane = 0; lane < 5; lane++) {
                const x = LANE_X[lane]
                const id = v.lanes[side][lane]
                const open = v.openLanes.includes(lane)
                const laneTag = new Frame(units,
                    92,
                    24,
                    x,
                    y - 116,
                    {
                        fill: withAlpha(C.bg,
                            220), stroke: C.goldDark, inner: null, chamfer: 6
                    })
                text(laneTag.node,
                    `Đường ${lane + 1}`,
                    0,
                    0,
                    {
                        size: 15, width: 88, height: 22, color: C.goldLight
                    })
                const laneHit = !!tg?.lanes.has(lane) && (!targeting || targeting.options.some((a) => a.t !== "summon" || a.side === side))
                if (!id) {
                    const ph = box("Empty",
                        units,
                        150,
                        150,
                        x,
                        y)
                    if (laneHit) {
                        const g = ph.addComponent(Graphics)
                        g.strokeColor = C.teal
                        g.lineWidth = 3
                        g.roundRect(-60,
                            -60,
                            120,
                            120,
                            12)
                        g.stroke()
                    }
                    ph.on(Node.EventType.TOUCH_END,
                        () => pickTarget(null,
                            lane,
                            side))
                    continue
                }
                drawUnit(v,
                    id,
                    x,
                    y,
                    lane,
                    side,
                    tg?.units.has(id) ?? false)
            }
            const extra = v.extra[side]
            if (extra) drawUnit(v,
                extra,
                PAD_X[mineSide ? 0 : 1],
                mineSide ? -10 : 10,
                null,
                side,
                tg?.units.has(extra) ?? false,
                84)
        }
    }

    function renderOverlays(v: CardView) {
        clear(boardOverlays)
        renderLaneLocks(boardOverlays,
            v)
        renderRespawn(boardOverlays,
            v)
        renderLaneMarkers(boardOverlays,
            v)
        renderBlindPicks(boardOverlays,
            v)
    }

    function targetable(tg: Targeting) {
        const unitsSet = new Set<string>(), lanes = new Set<number>()
        for (const a of tg.options) {
            if (tg.step === "actor") {
                const actor = actorOfAction(a)
                if (actor) unitsSet.add(actor)
                continue
            }
            const t = targetsOf(a)
            t.units.forEach((u) => unitsSet.add(u))
            t.lanes.forEach((l) => lanes.add(l))
        }
        return {
            units: unitsSet, lanes
        }
    }

    function drawUnit(v: CardView, id: string, x: number, y: number, lane: number | null, side: Side, hit: boolean, S = 124) {
        const half = S / 2
        const u = v.units[id]
        if (!u) return
        const you = v.you ?? "A"
        const dead = u.status === "dead"
        const isSel = selectedUnit === id
        text(units,
            u.token ? u.token.name : heroName(u.hero),
            x,
            y + half + 14,
            {
                font: "textMedium", bold: true, size: 18, width: 170, upper: false
            })
        const ground = box("Ground",
            units,
            170,
            40,
            x,
            y - half + 2).addComponent(Graphics)
        ground.fillColor = withAlpha(side === you ? C.teal : C.enemy,
            hit || isSel ? 90 : 48)
        ground.ellipse(0,
            0,
            S * 0.62,
            13)
        ground.fill()
        ground.fillColor = withAlpha(side === you ? C.teal : C.enemy,
            30)
        ground.ellipse(0,
            0,
            S * 0.78,
            17)
        ground.fill()
        const s = slot(units,
            "heroes",
            u.token ? "" : u.hero,
            S,
            x,
            y,
            {
                edge: hit ? C.teal : side === you ? C.ally : C.enemy, glow: hit ? C.teal : isSel ? C.gold : null, dim: dead || (!!targeting && !hit)
            })
        text(units,
            dead ? "" : `${u.hp} / ${u.maxHp}`,
            x,
            y - half - 10,
            {
                font: "number", size: 18, width: 160, color: C.goldLight
            })
        const bar = box("Hp",
            units,
            112,
            12,
            x,
            y - half - 26).addComponent(Graphics)
        bar.fillColor = C.goldDark
        bar.rect(-56,
            -6,
            112,
            12)
        bar.fill()
        bar.fillColor = C.bg
        bar.rect(-54,
            -4,
            108,
            8)
        bar.fill()
        const hpW = 108 * Math.max(0,
            u.hp / Math.max(1,
                u.maxHp))
        bar.fillColor = side === you ? C.teal : C.enemy
        bar.rect(-54,
            -4,
            hpW,
            8)
        bar.fill()
        bar.fillColor = withAlpha(C.goldLight,
            90)
        bar.rect(-54,
            0,
            hpW,
            3)
        bar.fill()
        if (u.shield > 0) {
            bar.fillColor = withAlpha(C.goldLight,
                230)
            bar.rect(-54,
                -5,
                108 * Math.min(1,
                    u.shield / Math.max(1,
                        u.maxHp)),
                2)
            bar.fill()
        }
        s.node.on(Node.EventType.TOUCH_END,
            () => onUnit(id,
                lane,
                side))
        s.node.on(Node.EventType.MOUSE_ENTER,
            () => tip.show(v,
                id,
                posOf(v,
                    id)))
        s.node.on(Node.EventType.MOUSE_LEAVE,
            () => tip.hide())
    }

    function renderRail(v: CardView) {
        clear(rail)
        const you = v.you ?? "A", them = other(you)
        const cell = (y: number, n: number, label: string) => {
            const f = new Frame(rail,
                46,
                60,
                0,
                y,
                {
                    fill: C.tealDeep, inner: C.goldDark, chamfer: 5
                })
            const g = box("Gem",
                f.node,
                46,
                60).addComponent(Graphics)
            drawGem(g,
                0,
                6,
                9)
            text(rail,
                String(n),
                0,
                y - 22,
                {
                    font: "number", size: 18, width: 60, color: C.goldLight
                })
            text(rail,
                label,
                0,
                y - 50,
                {
                    size: 13, width: 110, color: C.text
                })
        }
        cell(460 - 170,
            v.players[them].deckCount,
            "Bộ bài địch")
        cell(460 - 295,
            v.players[them].grave.length,
            "Mộ địch")
        cell(460 - 630,
            v.players[you].deckCount,
            "Bộ bài bạn")
        cell(460 - 750,
            v.players[you].grave.length,
            "Mộ bạn")
    }

    function renderRight(v: CardView) {
        clear(chainBox)
        const you = v.you ?? "A"
        const rel = (y: number) => 537 - y
        text(chainBox,
            "Chuỗi kỹ năng hiện tại",
            10,
            rel(55),
            {
                font: "title", size: 22, width: 290, align: "left"
            })
        renderChainLinks(chainBox,
            v,
            rel(75))
        text(chainBox,
            "Nhật ký trận",
            -30,
            rel(434),
            {
                font: "title", size: 24, width: 200, align: "left"
            })
        const lines = getGame().log.map(describeEvent).filter(Boolean).slice(-4) as string[]
        lines.forEach((s, i) => text(chainBox,
            `◆ ${s}`,
            0,
            rel(463 + i * 24),
            {
                size: 15, width: 290, height: 22, align: "left", color: C.text
            }))
        // đội dự bị: tướng của bạn chưa ra sân
        const reserve = v.players[you].heroes.filter((h) => v.units[`${you}:${h}`]?.status === "reserve")
        text(chainBox,
            "Đội dự bị",
            -35,
            rel(566),
            {
                font: "title", size: 24, width: 180, align: "left"
            })
        text(chainBox,
            String(reserve.length),
            135,
            rel(566),
            {
                font: "number", size: 20, width: 30
            })
        const summonable = new Set(legal().filter((a) => a.t === "summon").map((a) => (a as { hero: string }).hero))
        reserve.slice(0,
            6).forEach((h, i) => {
            const x = [-98,
                -2,
                94][i % 3], y = rel(i < 3 ? 650 : 778)
            const can = summonable.has(h)
            const sl = slot(chainBox,
                "heroes",
                h,
                78,
                x,
                y,
                {
                    edge: can ? C.teal : C.gold, glow: selectedUnit === `${you}:${h}` ? C.teal : null
                })
            text(chainBox,
                heroName(h),
                x,
                y - 48,
                {
                    font: "textMedium", bold: true, size: 15, width: 92, upper: false
                })
            text(chainBox,
                can ? "Gọi được" : "Chưa gọi",
                x,
                y - 64,
                {
                    size: 12, width: 92, color: can ? C.teal : C.textMuted
                })
            sl.node.on(Node.EventType.TOUCH_END,
                () => onReserve(h))
        })
        text(chainBox,
            message || (targeting ? targeting.title : "Chọn tướng để triệu hồi hoặc nâng cấp"),
            0,
            rel(870),
            {
                size: 16, width: 290, height: 40, wrap: true, color: message ? C.danger : C.text
            })
        const l = legal()
        const attack = new Button(chainBox,
            "Đánh",
            145,
            46,
            -80,
            rel(975),
            attackWithSelected,
            "gold",
            22)
        attack.setEnabled(l.some((a) => a.t === "attack" && a.actor === selectedUnit))
        const crafts = l.filter((a) => a.t === "craft")
        const craft = new Button(chainBox,
            "Ghép đồ",
            160,
            46,
            78,
            rel(975),
            () => craftDialog(overlay,
                v,
                crafts,
                act),
            "primary",
            22)
        craft.setEnabled(crafts.length > 0)
        const ready = l.find((a) => a.t === "ready"), pass = l.find((a) => a.t === "pass"), end = l.find((a) => a.t === "end"), step = l.find((a) => a.t === "step")
        const main = ready ?? pass ?? step ?? end
        const label = ready ? "Sẵn sàng" : pass ? "Bỏ qua" : step ? "Bước tiếp" : end ? "Kết thúc lượt" : v.toMove === you ? "Đang chờ…" : "Chờ đối thủ"
        const big = new Button(chainBox,
            label,
            300,
            54,
            0,
            rel(1031),
            () => { if (main) act(main) },
            main ? "primary" : "gold",
            26)
        big.setEnabled(!!main)
        if (end && main !== end) {
            const endBtn = new Button(chainBox,
                "Kết thúc lượt",
                300,
                40,
                0,
                rel(925),
                () => act(end),
                "gold",
                20)
            endBtn.node.name = "EndTurn"
        }
    }

    function renderHand(v: CardView) {
        clear(hand)
        const you = v.you ?? "A"
        const cards = v.players[you].hand ?? []
        text(hand,
            `Tay ${cards.length}/${v.rules.handMax}`,
            -557,
            66,
            {
                font: "textMedium", bold: true, size: 22, width: 120, align: "left", upper: false, color: C.goldLight
            })
        text(hand,
            `Bộ bài ${v.players[you].deckCount}`,
            -440,
            66,
            {
                size: 18, width: 120, align: "left"
            })
        const usable = new Set<string>()
        for (const a of legal()) if (a.t === "play" || a.t === "chain" || a.t === "discard") usable.add(a.uid)
        const sigUsable = (c: cg.Card) => actionsForHandCard(legal(),
            cards,
            c).length > 0 || usable.has(c.uid)
        const w = 130, h = 186
        const step = Math.min(128,
            820 / Math.max(1,
                cards.length))
        cards.forEach((c, i) => {
            const x = (i - (cards.length - 1) / 2) * step + 60
            cardPos.set(c.uid,
                {
                    x: HAND.x + x, y: HAND.y - 10
                })
            matchCard(hand,
                v,
                c,
                w,
                h,
                x,
                -10,
                {
                    usable: sigUsable(c),
                    selected: targeting?.source === c.uid,
                    dim: !sigUsable(c) && v.toMove === you,
                    badge: cg.skillOfCard(c)?.quick && sigUsable(c) ? "Quick play" : undefined,
                    onPick: () => { zoom.hide(); onHandCard(c) },
                    onHover: (on) => (on && !targeting ? zoom.show(v,
                        c,
                        cardPos.get(c.uid) ?? HAND) : zoom.hide()),
                })
        })
        if (targeting) new Button(hand,
            "Huỷ",
            195,
            46,
            60,
            -95,
            () => { endAim(); targeting = null; render() },
            "primary",
            26)
    }

    function renderSide(v: CardView) {
        clear(sideInfo)
        const them = other(v.you ?? "A")
        text(sideInfo,
            "Đối thủ",
            0,
            80,
            {
                font: "title", size: 26, width: 280
            })
        const rows = [`Tay: ${v.players[them].handCount} lá`,
            `Bộ bài: ${v.players[them].deckCount} lá`,
            `Mộ: ${v.players[them].grave.length} lá`,
            `Lá thưởng còn úp: ${v.prizes[them]}`]
        rows.forEach((s, i) => text(sideInfo,
            s,
            0,
            35 - i * 34,
            {
                size: 20, width: 280, color: C.text
            }))
    }

    const reaction = new ReactionWindow(root)
    function renderReaction(v: CardView) {
        const you = v.you ?? "A"
        const pass = legal().find((a) => a.t === "pass")
        if (v.phase !== "chain" || v.chain?.priority !== you || !pass || targeting) return reaction.hide()
        reaction.show({
            title: v.chain?.links.length ? "Đối thủ nối chuỗi, bạn có muốn phản ứng?" : "Mở chuỗi: bạn có muốn phản ứng?",
            seconds: null,
            onPass: () => act(pass),
        })
    }

    let banner: Node | null = null
    function renderBanner() {
        banner?.destroy()
        banner = null
        if (!targeting) return
        const f = new Frame(root,
            340,
            42,
            0,
            at(0,
                120).y,
            {
                fill: withAlpha(C.bg,
                    240), chamfer: 10, inner: null
            })
        banner = f.node
        text(f.node,
            targeting.title,
            0,
            0,
            {
                font: "textMedium", bold: true, size: 24, width: 330, height: 40, upper: false
            })
    }

    function render() {
        const v = view()
        if (!v) return
        lastView = v
        renderTop(v)
        renderInspector(v)
        tip.hide()
        renderBoard(v)
        renderOverlays(v)
        renderRail(v)
        renderRight(v)
        renderHand(v)
        renderSide(v)
        renderReaction(v)
        renderBanner()
        if (getGame().error && !message) {
            message = getGame().error ?? ""
        }
    }

    // ---- VFX theo sự kiện: mỗi chiêu một ô hiệu ứng (tạm một hạt), số sát thương / hồi máu bay lên ----
    let vfxQueue: Promise<void> = Promise.resolve()
    function floatNumber(p: Pt, s: string, color = C.danger) {
        const n = box("Float",
            vfxLayer,
            200,
            40,
            p.x,
            p.y + 30)
        text(n,
            s,
            0,
            0,
            {
                font: "number", size: 30, width: 200, color
            })
        const op = n.addComponent(UIOpacity)
        tween(n).by(0.9,
            {
                position: new Vec3(0,
                    60,
                    0)
            }).start()
        tween(op).delay(0.45).to(0.45,
            {
                opacity: 0
            }).call(() => n.destroy()).start()
    }
    let skipMoves = 0
    function playEvents(events: cg.GameEvent[], before: CardView | null) {
        const v = before ?? lastView
        if (!v) return
        const you = v.you ?? "A"
        const railX = at(1521,
            0).x, railY = at(0,
            460).y
        const deckPos = {
            [you]: {
                x: railX, y: railY - 170
            },
            [other(you)]: {
                x: railX, y: railY + 290
            },
        } as Record<Side, Pt>
        // Sự kiện sát thương đã hiện số theo nhịp VFX (Vel'Koz E): bỏ qua khi tới lượt chúng trong hàng
        const beatShown = new Set<cg.GameEvent>()
        for (const e of events) {
            // trình diễn chung (ra sân, hạ gục, rút bài, dải vòng / lượt / chuỗi) rồi tới hiệu ứng chiêu
            vfxQueue = vfxQueue.then(() => vfxLayer.isValid ? presentEvent(vfxLayer,
                root,
                e,
                (id) => posOf(lastView ?? v,
                    id),
                {
                    you, deckPos, handPos: HAND
                }).catch(() => undefined) : undefined)
            vfxQueue = vfxQueue.then(async () => {
                if (!vfxLayer.isValid) return
                const cur = lastView ?? v
                if (e.t === "cast" || e.t === "attack") {
                    const actorId = e.t === "cast" ? e.unit : e.attacker
                    if (cur.units[actorId]?.side === (cur.you ?? "A")) {
                        lastActor = actorId
                        if (!targeting) selectedUnit = actorId
                        render()
                    }
                }
                if (e.t === "cast") {
                    const u = cur.units[e.unit]
                    if (!u) return
                    // Chiêu không chọn mục tiêu (Q của Sylas) đánh thẳng mặt: hiệu ứng nhắm tướng địch cùng đường
                    const lane = cur.lanes[u.side].indexOf(e.unit)
                    const foeId = lane >= 0 ? cur.lanes[u.side === "A" ? "B" : "A"][lane] : undefined
                    // Chiêu nhiều mục tiêu ngẫu nhiên (Vel'Koz Q/E/R) lấy đích thật từ các sự kiện sát thương ngay sau lá cast
                    const rest = events.slice(events.indexOf(e) + 1)
                    const nextCast = rest.findIndex((x) => x.t === "cast")
                    const hits = (nextCast < 0 ? rest : rest.slice(0,
                        nextCast)).filter((x): x is Extract<cg.GameEvent, { t: "damage" }> => x.t === "damage" && x.src === e.unit && x.tag === "skill").map((x) => x.target)
                    const multi = u.hero === "velkoz" && hits.length > 0
                    const ids = !multi ? [] : e.skill === "R" ? hits : [...new Set([e.target ?? hits[0], ...hits])]
                    const swapQ = u.hero === "sylas" && e.skill === "Q" && !!e.target
                    const allyLane = swapQ ? cur.lanes[u.side].indexOf(e.target!) : -1
                    const foeOfAlly = swapQ && allyLane >= 0 ? cur.lanes[u.side === "A" ? "B" : "A"][allyLane] : undefined
                    if (swapQ) skipMoves++
                    // Vel'Koz E: số sát thương bật đúng lúc khe mở (nhịp 0) và lúc khe nổ (nhịp 1), không chờ hiệu ứng chạy xong
                    // Vel'Koz R: mỗi tia một nhịp, số của tia đó bật đúng lúc tia chạm
                    const riftE = u.hero === "velkoz" && e.skill === "E"
                    const raysR = u.hero === "velkoz" && e.skill === "R"
                    const riftDmg = riftE || raysR ? (nextCast < 0 ? rest : rest.slice(0,
                        nextCast)).filter((x): x is Extract<cg.GameEvent, { t: "damage" }> => x.t === "damage" && x.src === e.unit) : []
                    const beats = raysR ? rayBeats(riftDmg) : riftBeats(riftDmg)
                    for (const d of riftDmg) beatShown.add(d)
                    // Nami Q/E/R: VFX đi đúng các chặng engine báo (via) và hiện số hồi máu / khiên / sát thương theo từng nhịp
                    type HitEv = Extract<cg.GameEvent, { t: "damage" | "heal" | "shield" }>
                    const namiSkill = u.hero === "nami" && (e.skill === "Q" || e.skill === "E" || e.skill === "R")
                    const namiEv = namiSkill ? (nextCast < 0 ? rest : rest.slice(0,
                        nextCast)).filter((x): x is HitEv => (x.t === "damage" || x.t === "heal" || x.t === "shield") && x.src === e.unit && (x.t !== "damage" || x.amount > 0)) : []
                    for (const x of namiEv) beatShown.add(x)
                    const namiG = namiGroups(e.skill,
                        namiEv.map((x) => ({
                            kind: x.t, tag: x.t === "damage" ? x.tag : undefined, ev: x
                        })))
                    const namiHops = namiPrimary(e.skill,
                        namiG).map((h) => {
                        const x = h.ev
                        return {
                            from: posOf(cur,
                                (x.t !== "shield" && x.via) || e.unit), to: posOf(cur,
                                x.target), kind: x.t
                        }
                    })
                    const floatHit = (x: HitEv) => x.amount > 0 && floatNumber(posOf(lastView ?? cur,
                        x.target),
                    x.t === "damage" ? `-${x.amount}` : x.t === "heal" ? `+${x.amount}` : `+${x.amount} khiên`,
                    x.t === "damage" ? undefined : x.t === "heal" ? C.teal : C.goldLight)
                    // Miss Fortune Q/E/R: mỗi phát đúng tướng engine báo, kèm chí mạng; số bật theo đợt / loạt (chí mạng màu vàng)
                    const mfSkill = u.hero === "missfortune" && (e.skill === "Q" || e.skill === "E" || e.skill === "R")
                    const mfEv = mfSkill ? (nextCast < 0 ? rest : rest.slice(0,
                        nextCast)).filter((x): x is Extract<cg.GameEvent, { t: "damage" }> => x.t === "damage" && x.src === e.unit && x.tag === "skill") : []
                    for (const x of mfEv) beatShown.add(x)
                    const mfG = mfWaves(mfEv)
                    const mfHops = mfEv.map((x) => ({
                        from: posOf(cur,
                            e.unit), to: posOf(cur,
                            x.target), kind: "damage" as const, crit: !!x.crit
                    }))
                    const targets = mfSkill && mfHops.length ? mfHops.map((h) => h.to) : namiSkill && namiHops.length ? namiHops.map((h) => h.to) : swapQ ? [posOf(cur,
                        e.target!),
                    ...(foeOfAlly ? [posOf(cur,
                        foeOfAlly)] : [])] : multi ? ids.map((id) => posOf(cur,
                        id)) : e.target ? [posOf(cur,
                        e.target)] : foeId ? [posOf(cur,
                        foeId)] : []
                    if (settings().vfx) await playSkill(vfxLayer,
                        skillKey(u.hero,
                            e.skill),
                        styleOf(u.hero,
                            e.skill),
                        posOf(cur,
                            e.unit),
                        targets,
                        swapQ ? {
                            allyHero: cur.units[e.target!]?.hero
                        } : mfSkill ? {
                            hops: mfHops,
                            onBeat: (i) => {
                                for (const x of mfG[i] ?? []) floatNumber(posOf(lastView ?? cur,
                                    x.target),
                                `-${x.amount}`,
                                x.crit ? C.goldLight : undefined)
                            }
                        } : namiSkill ? {
                            hops: namiHops,
                            onBeat: (i) => { for (const h of namiG[i] ?? []) floatHit(h.ev) }
                        } : riftE || raysR ? {
                            onBeat: (i) => {
                                for (const d of beats[i] ?? []) floatNumber(posOf(lastView ?? cur,
                                    d.target),
                                `-${d.amount}`)
                            }
                        } : {
                        })
                } else if (e.t === "move") {
                    // Mọi lần đổi chỗ: người chủ động bay lên dậm xuống ô kia, người kia trượt ngang sang ô của họ.
                    // Sylas Q đã tự diễn đổi chỗ trong hiệu ứng chiêu nên bỏ qua một sự kiện move.
                    if (skipMoves > 0) { skipMoves--; return }
                    const mover = cur.units[e.unit]
                    if (!mover || !settings().vfx) return
                    const you2 = cur.you ?? "A"
                    const rowY = BOARD.y + (mover.side === you2 ? ROW_Y.mine : ROW_Y.foe)
                    const slotPos = (lane: number) => ({
                        x: BOARD.x + LANE_X[lane], y: rowY
                    })
                    await swapUnits(vfxLayer,
                        {
                            hero: mover.hero, pos: slotPos(e.from)
                        },
                        {
                            hero: (e.with ? cur.units[e.with]?.hero : undefined) ?? mover.hero, pos: slotPos(e.to)
                        })
                } else if (e.t === "attack") {
                    const u = cur.units[e.attacker]
                    if (!u) return
                    if (settings().vfx) await playSkill(vfxLayer,
                        `basic_${u.hero}`,
                        {
                            ...styleOf(u.hero,
                                "q"), intensity: 1
                        },
                        posOf(cur,
                            e.attacker),
                        [posOf(cur,
                            e.target)])
                } else if (e.t === "play" && e.card.kind === "support" && e.card.id.startsWith("spell") && e.args?.target) {
                    const spell = e.card.id.replace(/^spell[_:]/,
                        "")
                    if (settings().vfx) await playSkill(vfxLayer,
                        `spell_${spell}`,
                        spellStyle(spell),
                        {
                            x: BOARD.x, y: BOARD.y + (e.side === (cur.you ?? "A") ? -330 : 330)
                        },
                        [posOf(cur,
                            e.args.target)])
                } else if (e.t === "damage") {
                    if (beatShown.has(e)) return
                    // Phước Lành của Nami được tiêu: giọt vàng bay từ tướng mang tới địch, số bật lúc giọt vỡ
                    if (e.visuals?.includes("nami_bless") && e.src && settings().vfx) {
                        await playSkill(vfxLayer,
                            "nami_bless",
                            styleOf("nami",
                                "e"),
                            posOf(cur,
                                e.src),
                            [posOf(cur,
                                e.target)],
                            {
                                onBeat: () => floatNumber(posOf(lastView ?? cur,
                                    e.target),
                                `-${e.amount}`)
                            })
                        return
                    }
                    floatNumber(posOf(cur,
                        e.target),
                    `-${e.amount}`)
                } else if (e.t === "heal") {
                    if (beatShown.has(e)) return
                    floatNumber(posOf(cur,
                        e.target),
                    `+${e.amount}`,
                    C.teal)
                } else if (e.t === "shield") {
                    if (beatShown.has(e)) return
                    floatNumber(posOf(cur,
                        e.target),
                    `+${e.amount} khiên`,
                    C.goldLight)
                }
            })
        }
    }

    // Móc gỡ lỗi cho kiểm thử tự động: trạng thái giao diện (đang chọn mục tiêu, tướng đang xem)
    const dbg = (globalThis as unknown as { starciDebug?: Record<string, unknown> }).starciDebug
    if (dbg) dbg.ui = () => ({
        targeting: targeting ? {
            source: targeting.source, options: targeting.options.length
        } : null,
        selectedUnit,
    })
    const offState = onGame(() => render())
    const offEvents = onGameEvents(playEvents)
    render()
    return () => {
        reaction.hide()
        tip.hide()
        endAim()
        aim.destroy()
        zoom.hide()
        offState()
        offEvents()
        Tween.stopAllByTarget(vfxLayer)
        void nav
    }
}

/** Một dòng nhật ký ngắn cho sự kiện engine (bỏ qua sự kiện không cần hiện) */
function describeEvent(e: cg.GameEvent): string | null {
    const hero = (id?: string) => heroName((id ?? "").split(":")[1] ?? id ?? "")
    switch (e.t) {
    case "roundStart": return `Vòng ${e.round} bắt đầu`
    case "turnStart": return `Lượt của ${e.side === "A" ? "phe A" : "phe B"}`
    case "summon": return `${hero(e.unit)} ra sân đường ${e.lane + 1}`
    case "cast": {
        const sk = cg.getHero((e.unit.split(":")[1] ?? ""))?.skills[e.skill as "Q" | "E" | "R"]
        return `${hero(e.unit)} dùng ${sk?.name ? sk.name : `chiêu ${e.skill}`}`
    }
    case "attack": return `${hero(e.attacker)} đánh ${hero(e.target)}`
    case "kill": return `${hero(e.target)} bị hạ gục`
    case "craft": return `Ghép xong món đồ`
    case "chainAdd": return `Nối chuỗi mắt xích ${e.n}`
    case "chainEnd": return `Giải xong chuỗi ${e.length} mắt xích`
    case "lives": return `Phe ${e.side} còn ${e.lives} mạng`
    case "log": return e.text.replace(/steal:([a-z]+):([QER])/g,
        (_m, h: string, k: string) => `chiêu ${k} của ${heroName(h)}`)
    default: return null
    }
}
