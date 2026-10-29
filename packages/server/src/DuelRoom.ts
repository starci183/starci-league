import {
    Client, Room
} from "@colyseus/core"
import {
    BENCH_SIZE, CARDS, attackHits, ClientMessages, DECK, TrapTrigger, cardTargets, getPlay, getTrap, playMet, trapMet, Effect, HAND_LIMIT, HandCard, HeroCard, KILL_GOLD, LANES,
    MAX_ITEMS, MAX_MANA, NEXUS_HP, OVERTIME_DAMAGE, OVERTIME_ROUND, RESOURCES, RESPAWN_TURNS,
    ROSTER_SIZE, ROWS, Row, SKILLS, START_HAND, STRUCTURE_DAMAGE, TOWER_GOLD, TOWER_SHOT, TOWER_SHOT_RAMP, rowIndex, moveTargets, SUMMON_PHASES,
    Side, allHeroes, attackTargets, baseStats, blocksCC, boardCapAt, boardCount, canCast, canSummonAt, combine,
    computeAttack, computeSkill, damageTakenMult, getHero, getItem, hasStatus, heroOf, interestOf, itemDamageTaken,
    itemsOfTier, legendCardId, nexusProtected, other, roleOf, roundOf, runHook, sameTarget, skillCost, skillTargets,
    statsOf, unitAt, isWallCell, encodeMsg, type UiKey, PRESET_DECKS, CRAFT_PRICE, draftTaken, draftTurn, JUNGLE, monsterAt, monsterAlive, monsterDistance, monsterTargets, atkOf, apOf, rangeOf, canAct,
    SMITE_DAMAGE, SMITE_COOLDOWN, SMITE_RANGE, CAMP_GOLD, BUFF_ROUNDS, BARON_ROUNDS, BARON_GOLD,
    skillCells, skillCellSide, unitsInArea, outgoing, type AreaShape, LANE_PUSH, openLanes, tauntZoneOf, adjacent, laneEnemies, MOVE_TOKEN,
} from "@starci/shared"
import {
    DuelState, MonsterState, PlayerState, UnitState, ZoneState
} from "./schema"
import {
    DuelBot, type BotLevel
} from "./bot"
import {
    Player, authenticate
} from "./auth"

/** Phần bí mật mỗi bên: bộ bài, bài trên tay, bài úp, lựa chọn lật bài chưa công bố. Không đưa vào state đồng bộ. */
interface Placement { unitId: string; lane: number; row: Row }
/** towerHeat: số lượt liên tiếp mỗi trụ bị đánh (trụ bắn càng đau) · towerHitTurn: lượt gần nhất bị đánh */
interface Secret { deckList: string[]; deck: string[]; hand: HandCard[]; traps: (string | null)[]; picks: Placement[]; swappedTurn: number; towerHeat: number[]; towerHitTurn: number[] }
const newSecret = (): Secret => ({
    deckList: DECK, deck: [], hand: [], traps: [null,
        null,
        null,
        null,
        null], picks: [], swappedTurn: -1, towerHeat: [0,
        0,
        0,
        0,
        0], towerHitTurn: [-9,
        -9,
        -9,
        -9,
        -9]
})

class Rule extends Error {}
/** Lỗi luật gửi về client dạng khóa i18n */
const fail = (key: UiKey, params: Record<string, string | number> = {
}): never => { throw new Rule(encodeMsg(key,
    params)) }

const shuffle = <T>(arr: T[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i],
        a[j]] = [a[j],
        a[i]] }
    return a
}
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const resourceOf = (u: UnitState) => RESOURCES[heroOf(u).resource ?? "mana"]

export class DuelRoom extends Room<DuelState> {
    maxClients = 2
    private secrets: Record<Side, Secret> = {
        A: newSecret(), B: newSecret()
    }
    private sides = new Map<string, Side>()
    private seq = 0
    /** Hành động hiện tại có phải chiêu không (để hook onKill biết hạ gục bằng chiêu) */
    private bySkill = false
    /** Handler của từng loại hành động (bot gọi thẳng vào đây) */
    private handlers = new Map<string, (side: Side, msg: unknown) => void>()
    private bots: DuelBot[] = []
    private botOf(side: string) { return this.bots.find((b) => b.side === side) }
    /** Phòng mô phỏng (scripts/sim.ts): 2 bot đánh nhau, khách vào chỉ để xem; hết trận gửi "simStats" */
    private sim = false
    private simStats = new Map<string, { dmg: number; taken: number; kills: number; deaths: number; structure: number; assists: number; support: number; cc: number }>()
    /** Ai đã gây sát thương lên ai, ở lượt nào (để tính hỗ trợ hạ gục) */
    private simHits = new Map<string, Map<string, number>>()
    private stat(u: { id: string }) {
        let st = this.simStats.get(u.id)
        if (!st) this.simStats.set(u.id,
            st = {
                dmg: 0, taken: 0, kills: 0, deaths: 0, structure: 0, assists: 0, support: 0, cc: 0
            })
        return st
    }
    /** Nhịp trận: mỗi hành động xong phải chờ bấy nhiêu ms mới tới hành động tiếp (0 khi test) */
    private pace = 1000
    private nextFree: Record<Side, number> = {
        A: 0, B: 0
    }

    onCreate(options: { private?: boolean; bot?: BotLevel; fast?: boolean; sim?: boolean }) {
        this.setState(new DuelState())
        // test (smoke, bot_test) tạo phòng với fast: bỏ nhịp chờ giữa các hành động
        if (options?.fast) this.pace = 0
        // phòng riêng: không ghép ngẫu nhiên, chỉ vào được bằng mã phòng
        if (options?.private || options?.bot || options?.sim) this.setPrivate(true)
        this.onMessage("ready",
            (client) => this.sendHand(client))

        // mỗi hành động chạy qua cùng một chỗ kiểm tra luật, dù đến từ người chơi hay bot
        const on = <K extends keyof ClientMessages>(type: K, fn: (side: Side, msg: ClientMessages[K]) => void, anyTurn = false) => {
            const run = (side: Side, msg: ClientMessages[K]) => {
                if (!anyTurn && this.state.phase !== "playing") fail("fail.summon_pending")
                if (!anyTurn && side !== this.state.activeSide) fail("fail.not_turn")
                fn(side,
                    msg ?? ({
                    } as ClientMessages[K]))
            }
            this.handlers.set(type,
run as (side: Side, msg: unknown) => void)
            this.onMessage(type,
                (client, msg: ClientMessages[K]) => {
                    const side = this.sides.get(client.sessionId)
                    if (!side) return
                    const exec = () => {
                        try { run(side,
                            msg) } catch (e) {
                            if (!(e instanceof Rule)) console.error(e)
                            client.send("error",
                                {
                                    msg: (e as Error).message
                                })
                        }
                        this.bySkill = false
                        this.syncHands()
                    }
                    // nhịp trận: hành động trong trận cách nhau ít nhất `pace` ms; tới sớm thì xếp hàng chạy sau, không từ chối
                    if (anyTurn || !this.pace) return exec()
                    const now = Date.now(), at = Math.max(now,
                        this.nextFree[side])
                    this.nextFree[side] = at + this.pace
                    if (at <= now) exec(); else this.clock.setTimeout(exec,
                        at - now)
                })
        }
        if (options?.bot) this.addBot(options.bot === "easy" ? "easy" : "hard")
        if (options?.sim) {
            this.sim = true
            this.addBot("hard",
                "A")
            this.addBot("hard",
                "B")
            // đội hình ngẫu nhiên (bỏ cấm/chọn) để thống kê công bằng theo tướng
            this.clock.setTimeout(() => { this.createRoster("A"); this.createRoster("B"); this.startGame() },
                0)
        }

        // ================= TRIỆU HỒI =================

        // mốc triệu hồi: hai bên chọn úp, đủ cả hai thì lật cùng lúc
        on("summonPick",
            (side, { placements }) => {
                if (this.state.phase !== "summon") fail("fail.not_summon")
                const p = this.player(side)
                if (p.summonReady) fail("fail.already_picked")
                const need = this.summonNeed(side)
                if ((placements ?? []).length !== need) fail("fail.pick_n",
                    {
                        n: need
                    })
                const used = new Set<string>()
                for (const pl of placements) {
                    const u = this.state.units.get(pl.unitId)
                    if (!u || u.owner !== side || u.status === "board" || used.has(pl.unitId)) fail("fail.bad_unit")
                    if (u!.readyTurn > this.state.turn + 1) fail("fail.not_respawned",
                        {
                            hero: u!.defId
                        })
                    if (!canSummonAt(this.state,
                        side,
u!.defId,
pl.lane,
pl.row) || placements.some((o) => o !== pl && o.lane === pl.lane && o.row === pl.row)) fail("fail.bad_tile")
                    used.add(pl.unitId)
                }
                this.secrets[side].picks = placements
                p.summonReady = true
                this.log("log.picked",
                    {
                        p: p.name
                    })
                if (this.state.players.get(other(side))?.summonReady) this.revealSummons()
            },
            true)

        // hồi sinh / đưa tướng ra trong lượt (khi sân chưa đủ số tướng cho phép)
        on("summon",
            (side, { unitId, lane, row }) => {
                const u = this.state.units.get(unitId)
                if (!u || u.owner !== side || u.status === "board") fail("fail.bad_unit")
                if (u!.readyTurn > this.state.turn) fail("fail.waiting",
                    {
                        hero: u!.defId, n: u!.readyTurn - this.state.turn
                    })
                if (boardCount(this.state,
                    side) >= boardCapAt(this.state.round)) fail("fail.board_full")
                if (!canSummonAt(this.state,
                    side,
u!.defId,
lane,
row)) fail("fail.cant_place")
                this.placeUnit(u!,
                    lane,
                    row)
                this.log("log.deploy",
                    {
                        p: this.player(side).name, hero: u!.defId, lane
                    })
            })

        // đi 1 ô (8 hướng) trong nửa sân mình; đi xong vẫn đánh và tung chiêu được
        on("move",
            (side, { unitId, lane, row }) => {
                const u = this.ownUnit(side,
                    unitId)
                if (!moveTargets(this.state,
                    u).some((c) => c.lane === lane && c.row === row)) fail("fail.cant_move")
                u.lane = lane
                u.row = row
                // sát thủ dùng lượt đi miễn phí trước; còn lại tiêu 1 lượt đi được cấp (Tốc Biến, chiêu)
                if (roleOf(u) === "assassin" && !u.moved) u.moved = true
                else { u.stacks.set(MOVE_TOKEN,
                    Math.max(0,
                        (u.stacks.get(MOVE_TOKEN) ?? 0) - 1)); u.moved = true }
                this.emitFx({
                    kind: "move", unitId: u.id
                })
            })

        // tháo đồ: mảnh về kho, đồ huyền thoại về tay thành thẻ trang bị (để ghép / đeo lại)
        on("unequip",
            (side, { unitId, index }) => {
                const u = this.state.units.get(unitId)
                if (!u || u.owner !== side) fail("fail.not_yours")
                const id = u!.items[index], item = id ? getItem(id) : undefined
                if (!item) fail("fail.no_item")
                const p = this.player(side), hand = this.secrets[side].hand
                if (item!.tier === "component" ? p.bench.length >= BENCH_SIZE : hand.length >= HAND_LIMIT) fail(item!.tier === "component" ? "fail.bench_full" : "fail.hand_full")
      u!.items.splice(index,
          1)
      const hp = baseStats(item!).hp
      u!.maxHp = Math.max(1,
u!.maxHp - hp)
      u!.hp = Math.min(u!.hp,
u!.maxHp)
      if (item!.tier === "component") p.bench.push(item!.id)
      else hand.push({
          uid: `c${++this.seq}`, defId: legendCardId(item!.id)
      })
      this.log("log.unequip",
          {
              hero: u!.defId, item: item!.id
          })
            })

        // ================= BÀI =================

        on("equip",
            (side, { uid, unitId }) => {
                const card = this.handCard(side,
                    uid,
                    "item")
                if (card.kind !== "item") return
                const u = this.ownUnit(side,
                    unitId)
                if (u.items.length >= MAX_ITEMS) fail("fail.items_full",
                    {
                        n: MAX_ITEMS
                    })
                this.discard(side,
                    uid)
                this.equipItem(u,
                    card.itemId)
            })

        // đánh 1 lá phép / chỉ số / đánh thường từ tay
        on("play",
            (side, { uid, targetId }) => {
                const card = getPlay(this.handCard(side,
                    uid).id)
                if (!card) return fail("fail.not_playable")
                this.checkCardTarget(side,
                    card.id,
                    targetId)
                this.discard(side,
                    uid)
                this.log("log.play",
                    {
                        p: this.player(side).name, card: card.id
                    })
                this.playCard(side,
                    card.id,
                    targetId)
            })

        // úp phép hoặc bẫy kiểu Yu-Gi-Oh: đối thủ chỉ thấy mặt sau lá bài
        on("set",
            (side, { uid, lane }) => {
                const card = this.handCard(side,
                    uid)
                if (card.kind !== "trap" && card.kind !== "spell") fail("fail.set_only")
                if (lane < 0 || lane > 4 || this.secrets[side].traps[lane]) fail("fail.set_taken")
                this.secrets[side].traps[lane] = card.id
                this.player(side).traps[lane] = true
                this.discard(side,
                    uid)
                this.log("log.set",
                    {
                        p: this.player(side).name, lane
                    })
            })

        // lật phép đang úp (không tốn mana)
        on("flip",
            (side, { lane, targetId }) => {
                const id = this.secrets[side].traps[lane]
                const card = id ? CARDS[id] : undefined
                if (!card || card.kind !== "spell") return fail("fail.no_set_spell")
                this.checkCardTarget(side,
                    card.id,
                    targetId)
                this.secrets[side].traps[lane] = null
                this.player(side).traps[lane] = false
                this.log("log.flip",
                    {
                        p: this.player(side).name, card: card.id
                    })
                this.playCard(side,
                    card.id,
                    targetId)
            })

        // ================= GIAO TRANH =================

        on("attack",
            (side, { unitId, target }) => {
                const a = this.ownUnit(side,
                    unitId)
                if (!target || !attackTargets(this.state,
                    a).some((t) => sameTarget(t,
                    target))) fail("fail.bad_attack")
                a.attacked = true
                this.gainResource(a,
                    resourceOf(a).onAttack)
                if (target.kind === "tower") this.state.nexusHit = true
                this.emitFx({
                    kind: "attack", unitId: a.id, target
                })
                if (this.springTraps(other(side),
                    a,
                    target.kind === "tower" ? ["attack",
                        "structure"] : ["attack"])) return
                if (a.status !== "board") return
                // Tốc đánh: mỗi 100% là 1 đòn chắc chắn, phần lẻ là tỉ lệ ra thêm 1 đòn (dưới 100% có thể trượt hẳn)
                const hits = attackHits(statsOf(a,
                    this.state).extraAtk)
                if (!hits) return this.log("log.attack_miss",
                    {
                        hero: a.defId
                    })
                // bị khiêu khích (đứng trong vùng có máu của địch, vd Tibbers): mọi đòn đánh thường trúng vùng đó
                const taunt = tauntZoneOf(this.state,
                    a) as ZoneState | undefined
                if (taunt) {
                    for (let i = 0; i < hits && taunt.hp > 0; i++) {
                        const n = Math.max(1,
                            Math.round(atkOf(a) * (1 + statsOf(a,
                                this.state).dmgAmp)))
                        taunt.hp = Math.max(0,
                            taunt.hp - n)
                        this.log("log.zone_hit",
                            {
                                hero: a.defId, src: taunt.defId, n, hp: taunt.hp
                            })
                    }
                    if (taunt.hp <= 0) {
                        const i = this.state.zones.indexOf(taunt)
                        if (i >= 0) this.state.zones.splice(i,
                            1)
                        this.log("log.zone_down",
                            {
                                src: taunt.defId
                            })
                    }
                    return
                }
                const stillThere = () => target.kind === "tower" || this.state.units.get(target.id)?.status === "board"
                for (let i = 0; i < hits && a.status === "board" && stillThere(); i++) {
                    if (i > 0) { this.log("log.extra_hit",
                        {
                            hero: a.defId
                        }); this.emitFx({
                        kind: "attack", unitId: a.id, target
                    }) }
                    this.apply(computeAttack(this.state,
                        a,
                        target,
                        true),
                    a)
                }
            })

        // ================= CẤM / CHỌN =================

        on("draft",
            (side, { heroId }) => {
                const turn = draftTurn(this.state)
                if (this.state.phase !== "draft" || !turn) fail("fail.not_draft")
                if (turn.side !== side) fail("fail.not_turn")
                if (!allHeroes().some((h) => h.id === heroId) || draftTaken(this.state,
                    heroId)) fail("fail.draft_taken");
                (turn.action === "ban" ? this.state.bans : side === "A" ? this.state.picksA : this.state.picksB).push(heroId)
                this.log(turn.action === "ban" ? "log.draft_ban" : "log.draft_pick",
                    {
                        p: this.player(side).name, hero: heroId
                    })
                this.state.draftStep++
                if (!draftTurn(this.state)) this.finishDraft()
                else this.botDraft()
            },
            true)

        // ================= QUÁI RỪNG =================

        on("attackMonster",
            (side, { unitId, lane }) => {
                const a = this.ownUnit(side,
                    unitId)
                if (a.attacked || !canAct(this.state,
                    a) || !monsterTargets(this.state,
                    a,
                    rangeOf(a)).includes(lane)) fail("fail.bad_attack")
                const m = this.monster(lane)
                a.attacked = true
                this.gainResource(a,
                    resourceOf(a).onAttack)
                const hits = attackHits(statsOf(a,
                    this.state).extraAtk)
                if (!hits) return this.log("log.attack_miss",
                    {
                        hero: a.defId
                    })
                // pháp sư đánh bằng phép: lấy chỉ số cao hơn giữa AD và AP
                const dmg = Math.max(atkOf(a),
                    apOf(a))
                for (let i = 0; i < hits && monsterAlive(m); i++) {
                    this.emitFx({
                        kind: "monster", unitId: a.id, lane
                    })
                    this.damageMonster(side,
                        lane,
                        dmg,
                        a)
                }
                // quái còn sống thì đánh trả kẻ vừa đánh nó
                if (monsterAlive(m) && a.status === "board") {
                    this.apply([{
                        type: "damage", target: {
                            kind: "unit", id: a.id
                        }, amount: monsterAt(lane)!.retaliate, label: monsterAt(lane)!.name
                    }])
                }
            })

        on("smite",
            (side, { lane }) => {
                const p = this.player(side), m = this.monster(lane)
                if (p.smiteRound > this.state.round) fail("fail.smite_cd",
                    {
                        n: p.smiteRound
                    })
                if (!monsterAlive(m)) fail("fail.no_monster")
                const near = this.boardUnits(side).filter((u) => monsterDistance(u,
                    lane) <= SMITE_RANGE)
                    .sort((x, y) => monsterDistance(x,
                        lane) - monsterDistance(y,
                        lane))[0]
                if (!near) fail("fail.smite_far",
                    {
                        n: SMITE_RANGE
                    })
                p.smiteRound = this.state.round + SMITE_COOLDOWN
                this.log("log.smite",
                    {
                        p: p.name, monster: m.id
                    })
                this.emitFx({
                    kind: "smite", lane, side
                })
                this.damageMonster(side,
                    lane,
                    SMITE_DAMAGE,
                    near,
                    true)
            })

        on("skill",
            (side, { unitId, skillId, targetId, cell }) => {
                const u = this.ownUnit(side,
                    unitId)
                const s = SKILLS[skillId]
                if (hasStatus(u,
                    "silence")) fail("fail.silenced",
                    {
                        hero: u.defId
                    })
                if (!canCast(this.state,
                    u,
                    skillId)) fail("fail.cant_cast",
                    {
                        n: skillCost(u,
                            skillId), res: heroOf(u).resource ?? "mana"
                    })
                if (s.target === "cell") {
                    if (!cell || !skillCells(this.state,
                        u,
                        skillId).some((c) => c.lane === cell.lane && c.row === cell.row)) fail("fail.bad_target")
                } else if (s.target !== "none" && (!targetId || !skillTargets(this.state,
                    u,
                    skillId).includes(targetId))) fail("fail.bad_target")
                u.mana -= skillCost(u,
                    skillId)
                u.castThisTurn = true
                u.cooldowns.set(skillId,
                    s.cooldown)
                if (this.springTraps(other(side),
                    u,
                    ["cast"]) || u.status !== "board") return
                this.log("log.cast",
                    {
                        hero: u.defId, key: s.key, skill: s.id
                    })
                this.bySkill = true
                const fx = computeSkill(this.state,
                    u,
                    skillId,
                    targetId,
                    true,
                    s.target === "cell" ? cell : undefined)
                this.emitFx({
                    kind: "skill", unitId: u.id, skillId, targetId, ...(s.target === "cell" && cell ? {
                        cell, cellSide: skillCellSide(u,
                            skillId)
                    } : {
                    }), hits: this.hitIds(fx)
                })
                u.empowered = true
                this.apply(fx,
                    u)
                this.apply(runHook(u,
                    "onCast",
                    {
                        state: this.state, skillId, preview: false
                    }),
                u)
            })

        on("endTurn",
            (side) => {
                for (const u of this.boardUnits(side)) {
                // Đốt: mất máu khi chủ tướng kết thúc lượt
                    if (hasStatus(u,
                        "burn")) {
                        this.apply([{
                            type: "damage", target: {
                                kind: "unit", id: u.id
                            }, amount: u.stacks.get("burn") ?? 0, label: "Đốt", tag: "item"
                        }])
                        if (u.status !== "board") continue
                    }
                    u.statuses.forEach((v, k) => (v <= 1 ? u.statuses.delete(k) : u.statuses.set(k,
                        v - 1)))
                    if (!hasStatus(u,
                        "burn")) u.stacks.delete("burn")
                    u.stacks.forEach((v, k) => {
                        if (k.startsWith("t:")) u.stacks.delete(k)
                        else if (k.startsWith("buff:")) { if (v <= 1) u.stacks.delete(k); else u.stacks.set(k,
                            v - 1) }
                    })
                    // Nộ tụt nếu cả lượt không đánh
                    if (!u.attacked) this.gainResource(u,
                        -resourceOf(u).decay)
                }
                this.startTurn(other(side))
            })

        // ================= GHÉP ĐỒ =================

        // ghép 2 thẻ mảnh trong kho -> thẻ đồ huyền thoại
        on("craft",
            (side, { a, b }) => {
                const p = this.player(side)
                const ia = p.bench[a], ib = p.bench[b]
                if (a === b || !ia || !ib) fail("fail.pick_two")
                const result = combine(ia,
                    ib)
                if (!result) fail("fail.no_recipe")
                if (this.secrets[side].hand.length >= HAND_LIMIT) fail("fail.hand_full")
                if (p.gold < CRAFT_PRICE) fail("fail.no_gold",
                    {
                        n: CRAFT_PRICE
                    })
                p.gold -= CRAFT_PRICE
                for (const i of [a,
                    b].sort((x, y) => y - x)) p.bench.splice(i,
                    1)
                this.secrets[side].hand.push({
                    uid: `c${++this.seq}`, defId: legendCardId(result!)
                })
                this.log("log.craft",
                    {
                        p: p.name, item: ia, item2: ib, item3: result!
                    })
                this.emitFx({
                    kind: "craft", side, itemId: result
                })
            })
    }

    /** Có token Supabase thì xác thực và lấy tên + bộ bài; không có thì vào dạng khách (nếu server cho phép) */
    async onAuth(_client: Client, options: { name?: string; token?: string }) {
        return authenticate(options?.token,
            (options?.name || "Khách").slice(0,
                20))
    }

    onJoin(client: Client, options: { roster?: string[] }, player: Player) {
        if (this.sim) return // khách xem
        const side: Side = this.state.players.has("A") ? "B" : "A"
        const p = new PlayerState()
        p.sessionId = client.sessionId
        p.side = side
        p.name = player.name.slice(0,
            20)
        if (player.deck) this.secrets[side].deckList = player.deck
        this.state.players.set(side,
            p)
        this.sides.set(client.sessionId,
            side)
        if (this.state.players.size === 2) this.startDraft()
    }

    onLeave(client: Client) {
        const side = this.sides.get(client.sessionId)
        if (!side) return
        if (this.state.phase === "playing" || this.state.phase === "summon" || this.state.phase === "draft") {
            this.state.phase = "ended"
            this.state.winner = other(side)
            this.log("log.left",
                {
                    p: this.player(side).name
                })
        } else if (this.state.phase === "waiting") {
            this.state.players.delete(side)
            this.state.units.forEach((u, id) => { if (u.owner === side) this.state.units.delete(id) })
        }
        this.sides.delete(client.sessionId)
    }

    // ---------- Cấm / chọn ----------

    private startDraft() {
        this.lock()
        this.state.phase = "draft"
        this.state.draftStep = 0
        this.log("log.draft_start")
        this.botDraft()
    }

    /** Bot cấm/chọn khi tới lượt (chờ chút cho người chơi kịp thấy) */
    private botDraft() {
        const turn = draftTurn(this.state)
        const bot = turn && this.botOf(turn.side)
        if (bot) this.clock.setTimeout(() => bot.draft(),
            700)
    }

    /** Cấm/chọn xong: đội tướng đã chọn thành Đội Hình, vào trận */
    private finishDraft() {
        this.createRoster("A",
            [...this.state.picksA])
        this.createRoster("B",
            [...this.state.picksB])
        this.startGame()
    }

    /** Đấu với máy: bot giữ phe B, người chơi vào phe A (mô phỏng: bot giữ cả hai phe) */
    private addBot(level: BotLevel, side: Side = "B") {
        this.maxClients = this.sim ? 4 : 1
        const p = new PlayerState()
        p.sessionId = "bot"; p.side = side; p.name = level === "easy" ? "Máy (Dễ)" : "Máy (Khó)"
        this.secrets[side].deckList = PRESET_DECKS[Math.floor(Math.random() * PRESET_DECKS.length)].cards
        this.state.players.set(side,
            p)
        this.bots.push(new DuelBot({
            state: this.state,
            hand: (s) => this.secrets[s].hand,
            pace: () => this.pace,
            wait: (ms) => new Promise((r) => this.clock.setTimeout(r,
                ms)),
            act: (s, type, msg) => {
                try { this.handlers.get(type)!(s,
                    msg); return true } catch (e) {
                    if (!(e instanceof Rule)) console.error(e)
                    else if (process.env.BOT_DEBUG) console.log("[bot]",
                        type,
                        (e as Error).message)
                    return false
                } finally { this.bySkill = false; this.syncHands() }
            },
        },
        side,
        level))
    }

    // ---------- Đội Hình & triệu hồi ----------

    /** Đội Hình 7 tướng (tạm: ngẫu nhiên nếu chưa có màn pick) */
    private createRoster(side: Side, wanted?: string[]) {
        const pool = allHeroes().map((h) => h.id)
        const ids = (wanted?.filter((id) => pool.includes(id)) ?? []).slice(0,
            ROSTER_SIZE)
        for (const id of shuffle(pool)) if (ids.length < ROSTER_SIZE && !ids.includes(id)) ids.push(id)
        for (const defId of ids) {
            const hero = CARDS[defId] as HeroCard
            const u = new UnitState()
            Object.assign(u,
                {
                    id: `u${++this.seq}`, owner: side, defId, hp: hero.hp, maxHp: hero.hp, mana: RESOURCES[hero.resource ?? "mana"].start
                })
            this.state.units.set(u.id,
                u)
        }
    }

    /** Mốc triệu hồi hiện tại bên này phải lật bao nhiêu tướng */
    private summonNeed(side: Side) {
        const free = [...this.state.units.values()].filter((u) => u.owner === side && u.status !== "board" && u.readyTurn <= this.state.turn + 1).length
        return Math.max(0,
            Math.min(this.state.summonCount,
                free,
                boardCapAt(this.state.round) - boardCount(this.state,
                    side)))
    }

    private openSummonPhase(count: number) {
        this.state.phase = "summon"
        this.state.summonCount = count
        this.state.players.forEach((p) => { p.summonReady = false })
        for (const side of ["A",
            "B"] as Side[]) {
            this.secrets[side].picks = []
            if (this.summonNeed(side) <= 0) this.player(side).summonReady = true
        }
        for (const b of this.bots) b.summonPick()
        this.log("log.summon_phase",
            {
                r: this.state.round, n: count
            })
        this.emitFx({
            kind: "summonPhase", count, round: this.state.round
        })
        if ([...this.state.players.values()].every((p) => p.summonReady)) this.revealSummons()
    }

    private revealSummons() {
        for (const side of ["A",
            "B"] as Side[]) {
            const names: string[] = []
            for (const pl of this.secrets[side].picks) {
                const u = this.state.units.get(pl.unitId)
                if (u && u.status !== "board" && canSummonAt(this.state,
                    side,
                    u.defId,
                    pl.lane,
                    pl.row)) {
                    this.placeUnit(u,
                        pl.lane,
                        pl.row)
                    names.push(u.defId)
                }
            }
            if (names.length) this.log("log.revealed",
                {
                    p: this.player(side).name, heroes: names.join(",")
                })
            this.secrets[side].picks = []
        }
        this.emitFx({
            kind: "reveal"
        })
        this.state.phase = "playing"
        this.state.summonCount = 0
        if (this.state.turn === 0) this.startTurn("A")
    }

    private placeUnit(u: UnitState, lane: number, row: Row) {
        u.lane = lane
        u.row = row
        u.status = "board"
        u.summonedTurn = this.state.turn
        u.hidden = false
        u.attacked = false
        u.moved = false
        u.castThisTurn = false
    }

    /** Đưa tướng ra khỏi sân (chết hoặc rút về): giữ đồ và stack, hồi đầy máu khi quay lại */
    private takeOff(u: UnitState, status: "dead" | "rest", lockTurns: number) {
        u.lane = -1
        u.status = status
        u.readyTurn = this.state.turn + lockTurns
        u.hp = u.maxHp
        u.shield = 0
        u.hidden = false
        u.markedTargetId = ""
        u.statuses.clear()
        u.stacks.forEach((_v, k) => { if (k.startsWith("buff:")) u.stacks.delete(k) }) // rời sân thì mất buff
        if (status === "dead") u.mana = resourceOf(u).start
        this.state.units.forEach((x) => { if (x.markedTargetId === u.id) x.markedTargetId = "" })
    }

    // ---------- Diễn tiến ván ----------

    private startGame() {
        this.lock()
        for (const side of ["A",
            "B"] as Side[]) {
            this.secrets[side].deck = shuffle(this.secrets[side].deckList)
            this.draw(side,
                START_HAND) // mỗi bên 3 lá, rồi mỗi lượt rút 1 (tối đa giữ HAND_LIMIT)
        }
        this.log("log.start")
        this.state.round = 1
        for (const def of JUNGLE) {
            const m = new MonsterState()
            m.id = def.id; m.lane = def.lane; m.maxHp = def.hp; m.hp = def.hp
            m.respawnRound = def.firstRound > 1 ? def.firstRound : 0
            this.state.monsters.push(m)
        }
        this.openSummonPhase(SUMMON_PHASES[0].count)
    }

    private monster(lane: number) {
        const m = this.state.monsters.find((x) => x.lane === lane)
        if (!m) fail("fail.no_monster")
        return m!
    }

    /** Gây sát thương lên quái; hết máu thì phe ra đòn kết liễu (hoặc phe đóng góp nhiều hơn với Baron) nhận thưởng */
    private damageMonster(side: Side, lane: number, amount: number, by: UnitState | undefined, bySmite = false) {
        const m = this.monster(lane), def = monsterAt(lane)!
        const dealt = Math.min(m.hp,
            Math.round(amount))
        m.hp -= dealt
        if (side === "A") m.dmgA += dealt; else m.dmgB += dealt
        if (!bySmite && by) this.log("log.monster_hit",
            {
                monster: m.id, n: dealt, hero: by.defId
            })
        if (m.hp > 0) return
        m.respawnRound = this.state.round + def.respawn
        const p = this.player(side)
        if (def.id === "wolves" || def.id === "raptors") {
            this.apply([{
                type: "gold", side, amount: CAMP_GOLD
            }])
        } else if (def.id === "red" || def.id === "blue") {
            if (by && by.status === "board") this.apply([{
                type: "buff", unitId: by.id, buffId: `${def.id}_buff`, turns: BUFF_ROUNDS
            }])
        } else {
            // Baron: phe gây nhiều sát thương hơn nhận bùa; Trừng Phạt kết liễu thì cướp luôn
            const more: Side = m.dmgA === m.dmgB ? side : m.dmgA > m.dmgB ? "A" : "B"
            const winner = bySmite ? side : more
            this.log(bySmite && winner !== more ? "log.baron_stolen" : "log.baron",
                {
                    p: this.player(winner).name, a: m.dmgA, b: m.dmgB
                })
            this.apply(this.boardUnits(winner).map((u) => ({
                type: "buff", unitId: u.id, buffId: "baron", turns: BARON_ROUNDS
            }) as Effect))
            this.apply([{
                type: "gold", side: winner, amount: BARON_GOLD
            }])
        }
        this.log("log.monster_kill",
            {
                p: p.name, monster: m.id
            })
    }

    private startTurn(side: Side) {
        if (this.state.phase === "ended") return
        const p = this.player(side), foe = this.player(other(side))
        this.state.turn++
        this.state.round = roundOf(this.state.turn)
        this.state.activeSide = side
        this.state.nexusHit = false
        p.maxMana = Math.min(MAX_MANA,
            Math.max(3,
                p.maxMana + 1)) // lượt đầu đã có 3 mana
        p.mana = p.maxMana
        const units = this.boardUnits(side)
        const interest = interestOf(p.gold)
        const comeback = p.nexus < foe.nexus - 500 ? 1 : 0 // vàng bù cho bên đang thua
        p.gold += 1 + interest + comeback
        if (interest) this.log("log.interest",
            {
                p: p.name, n: interest
            })
        for (const u of units) {
            u.attacked = false; u.moved = false; u.castThisTurn = false; u.empowered = false; u.hidden = false; u.markedTargetId = ""
            u.cooldowns.forEach((v, k) => u.cooldowns.set(k,
                Math.max(0,
                    v - 1)))
            this.gainResource(u,
                resourceOf(u).regen + statsOf(u).manaRegen)
        }
        // quái rừng xuất hiện lại đầu vòng
        if (side === "A") this.state.monsters.forEach((m) => {
            if (m.respawnRound && this.state.round >= m.respawnRound) {
                m.hp = m.maxHp; m.dmgA = 0; m.dmgB = 0; m.respawnRound = 0
                this.log("log.monster_spawn",
                    {
                        monster: m.id
                    })
            }
        })
        // kéo dài: Nhà hai bên tự mất máu mỗi vòng
        // lính đẩy đường (đầu vòng): đường bỏ trống thì trụ/Nhà bị đẩy
        if (side === "A" && !nexusProtected(this.state)) {
            for (const lane of openLanes(this.state.round)) {
                const n = (s: Side) => [...this.state.units.values()].filter((u) => u.owner === s && u.status === "board" && u.lane === lane).length
                const a = n("A"), b = n("B")
                if (a && !b) this.hitStructure("B",
                    lane,
                    LANE_PUSH * a,
                    "Lính đẩy đường")
                else if (b && !a) this.hitStructure("A",
                    lane,
                    LANE_PUSH * b,
                    "Lính đẩy đường")
                if (this.state.phase === "ended") return
            }
        }
        // mỗi vòng thêm 50; trừ cả hai Nhà cùng lúc rồi mới xét thắng (trước đây Xanh bị trừ trước nên luôn thua)
        if (this.state.round >= OVERTIME_ROUND && side === "A") {
            const n = OVERTIME_DAMAGE + 50 * (this.state.round - OVERTIME_ROUND)
            const [a,
                b] = (["A",
                "B"] as Side[]).map((s) => this.player(s))
            for (const p of [a,
                b]) {
                p.nexus = Math.max(0,
                    p.nexus - n)
                this.log("log.nexus_hit",
                    {
                        p: p.name, n, label: "Kéo dài", hp: p.nexus, max: NEXUS_HP
                    })
            }
            if (!a.nexus || !b.nexus) {
                const towers = (p: PlayerState) => [...p.towers].reduce((s, x) => s + x,
                    0)
                const score = (p: PlayerState) => p.nexus * 10 + towers(p)
                this.endGame(score(a) === score(b) ? (Math.random() < 0.5 ? "A" : "B") : score(a) > score(b) ? "A" : "B")
                return
            }
        }
        this.draw(side,
            1)
        this.log("log.round",
            {
                r: this.state.round, p: p.name
            })
        for (const u of units) if (u.status === "board") this.apply(runHook(u,
            "onTurnStart",
            {
                state: this.state, preview: false
            }),
        u)
        this.tickZones(side)
        // mở mốc triệu hồi đầu vòng (lượt của Xanh)
        const phase = SUMMON_PHASES.find((ph) => ph.round === this.state.round && ph.round > 1)
        if (phase && side === "A") this.openSummonPhase(phase.count)
        this.syncHands()
        void this.botOf(side)?.takeTurn()
    }

    /** Hỗ Trợ (luật vai trợ thủ): khiên/hồi từ trợ thủ lên đồng minh đứng kề mạnh hơn 15% */
    private helpingHand(source: UnitState | undefined, to: UnitState) {
        return source && source.id !== to.id && source.owner === to.owner && roleOf(source) === "support" && adjacent(source,
            to) ? 1.15 : 1
    }

    /** Vùng của phe `side`: chạy zoneTick của tướng đặt vùng, rồi trừ 1 lượt (hết thì gỡ) */
    private tickZones(side: Side) {
        for (const z of [...this.state.zones].filter((x) => x.owner === side)) {
            const src = this.state.units.get(z.srcId), hero = getHero(z.defId)
            if (src && hero?.zoneTick) {
                const targets = unitsInArea(this.state,
                    z.side,
z.shape as AreaShape,
{
    lane: z.lane, row: z.row
})
                this.bySkill = true
                this.apply(outgoing(this.state,
                    src,
                    hero.zoneTick({
                        state: this.state, unit: src, zone: z, targets
                    }),
                    {
                        isSkill: true, live: true
                    }),
                src)
                this.bySkill = false
            }
            z.turns--
            if (z.turns <= 0) { const i = this.state.zones.indexOf(z); if (i >= 0) this.state.zones.splice(i,
                1) }
            if (this.state.phase === "ended") return
        }
    }

    private draw(side: Side, n: number) {
        const s = this.secrets[side]
        for (let i = 0; i < n; i++) {
            const defId = s.deck.pop()
            if (!defId) return
            if (s.hand.length >= HAND_LIMIT) { this.log("log.burned_card",
                {
                    card: defId
                }); continue }
            s.hand.push({
                uid: `c${++this.seq}`, defId
            })
        }
    }

    /** Đeo đồ huyền thoại lên tướng */
    private equipItem(u: UnitState, id: string) {
        const item = getItem(id)!
        const hp = baseStats(item).hp
        u.items.push(item.id)
        u.maxHp += hp
        u.hp += hp
        this.log("log.equip",
            {
                hero: u.defId, item: item.id
            })
        this.emitFx({
            kind: "equip", unitId: u.id, itemId: item.id
        })
        this.apply(runHook(u,
            "onEquip",
            {
                state: this.state, preview: false
            },
            item),
        u)
    }

    private gainResource(u: UnitState, amount: number) {
        u.mana = Math.max(0,
            Math.min(resourceOf(u).max,
                u.mana + amount))
    }

    // ---------- Áp dụng hiệu ứng ----------

    private apply(effects: Effect[], source?: UnitState) {
        for (const fx of effects) {
            if (this.state.phase === "ended") return
            const unit = "unitId" in fx ? this.state.units.get(fx.unitId) : undefined
            const live = unit && unit.status === "board" ? unit : undefined
            switch (fx.type) {
            case "mark": if (live) live.markedTargetId = fx.targetId; break
            case "status": {
                if (!live) break
                if ((fx.status === "stun" || fx.status === "freeze" || fx.status === "silence") && (hasStatus(live,
                    "unstoppable") || blocksCC(live))) {
                    this.log("log.cc_immune",
                        {
                            hero: live.defId
                        })
                    break
                }
                live.statuses.set(fx.status,
                    Math.max(fx.turns,
                        live.statuses.get(fx.status) ?? 0))
                if (this.sim && source && source.owner !== live.owner && ["stun",
                    "freeze",
                    "silence"].includes(fx.status)) this.stat(source).cc += fx.turns
                this.log("log.status",
                    {
                        hero: live.defId, status: fx.status
                    })
                break
            }
            case "pull": {
                // kéo lên 1 hàng (về phía hàng quái), đổi chỗ với tướng đang đứng ở ô đó
                if (live && rowIndex(live.row) > 0) {
                    const to = ROWS[rowIndex(live.row) - 1]
                    const ahead = unitAt(this.state,
                        live.owner,
                        live.lane,
                        to) as UnitState | undefined
                    if (ahead) ahead.row = live.row
                    live.row = to
                    this.log("log.pulled",
                        {
                            hero: live.defId
                        })
                }
                break
            }
            case "displace": {
                if (!live) break
                const ri = rowIndex(live.row) + (fx.dRow ?? 0), lane = live.lane + (fx.dLane ?? 0)
                if (ri < 0 || ri >= ROWS.length || lane < 0 || lane >= LANES.length) break
                if (unitAt(this.state,
                    live.owner,
                    lane,
                    ROWS[ri]) || isWallCell(this.state,
                    live.owner,
                    lane,
                    ri)) break
                live.row = ROWS[ri]
                live.lane = lane
                this.log("log.displaced",
                    {
                        hero: live.defId
                    })
                break
            }
            case "swap": {
                // hai tướng cùng phe đổi chỗ (Đèn Lồng của Thresh)
                const o = this.state.units.get(fx.otherId)
                if (!live || !o || o.status !== "board" || o.owner !== live.owner || o.id === live.id) break
                const [lane,
                    row] = [live.lane,
                    live.row]
                live.lane = o.lane; live.row = o.row
                o.lane = lane; o.row = row
                this.log("log.displaced",
                    {
                        hero: live.defId
                    })
                this.log("log.displaced",
                    {
                        hero: o.defId
                    })
                break
            }
            case "dispel": if (live) fx.statuses.forEach((s) => live.statuses.delete(s)); break
            case "refresh": if (live) { live.attacked = false; this.log("log.refresh",
                {
                    hero: live.defId
                }) } break
            case "shield": if (live) {
                const amt = Math.round(fx.amount * this.helpingHand(source,
                    live))
                live.shield += amt
                if (this.sim && source && source.owner === live.owner) this.stat(source).support += amt
                this.log("log.shield",
                    {
                        hero: live.defId, n: amt
                    })
            } break
            case "heal": {
                if (!live) break
                const amount = Math.round(fx.amount * (hasStatus(live,
                    "wounds") ? 0.5 : 1) * this.helpingHand(source,
                    live))
                const before = live.hp
                live.hp = Math.min(live.maxHp,
                    live.hp + amount)
                if (live.hp > before) this.log("log.heal",
                    {
                        hero: live.defId, n: live.hp - before
                    })
                if (this.sim && source && source.owner === live.owner && source.id !== live.id) this.stat(source).support += live.hp - before
                break
            }
            case "stack": {
                if (!unit) break
                const cur = unit.stacks.get(fx.key) ?? 0
                let next = fx.set ?? cur + (fx.add ?? 0)
                if (fx.max !== undefined) next = Math.min(fx.max,
                    next)
                if (next === 0) unit.stacks.delete(fx.key); else unit.stacks.set(fx.key,
                    next)
                break
            }
            case "gold": this.player(fx.side).gold += fx.amount; this.log("log.gold",
                {
                    p: this.player(fx.side).name, n: fx.amount
                }); break
            case "mana": { const p = this.player(fx.side); p.mana = Math.min(MAX_MANA,
                p.mana + fx.amount); break }
            case "heroMana": if (unit) this.gainResource(unit,
                fx.amount); break
            case "cooldown": {
                if (!unit) break
                unit.cooldowns.forEach((v, k) => unit.cooldowns.set(k,
                    fx.reset ? 0 : Math.max(0,
                        v + (fx.delta ?? 0))))
                break
            }
            case "hide": if (live) { live.hidden = true; this.log("log.hide",
                {
                    hero: live.defId
                }) } break
            case "reveal": this.state.units.forEach((u) => { if (u.owner === fx.side && u.hidden) { u.hidden = false; this.log("log.revealed_unit",
                {
                    hero: u.defId
                }) } }); break
            case "cleanse": if (live) { ["stun",
                "freeze",
                "chill",
                "silence"].forEach((s) => live.statuses.delete(s)); this.log("log.cleanse",
                {
                    hero: live.defId
                }) } break
            case "burn": {
                if (!live) break
                live.statuses.set("burn",
                    Math.max(fx.turns,
                        live.statuses.get("burn") ?? 0))
                live.stacks.set("burn",
                    Math.max(fx.amount,
                        live.stacks.get("burn") ?? 0))
                break
            }
            case "maxhp": if (unit) { unit.maxHp += fx.amount; unit.hp += fx.amount } break
            case "breakShield": if (live && live.shield > 0) { live.shield = 0; this.log("log.shield_break",
                {
                    hero: live.defId
                }) } break
            case "damage": this.applyDamage(fx,
                source); break
            case "zone": {
                const z = new ZoneState()
                const src = this.state.units.get(fx.srcId)
                Object.assign(z,
                    {
                        id: `z${++this.seq}`, key: fx.key, owner: src?.owner ?? "", defId: src?.defId ?? "", srcId: fx.srcId,
                        side: fx.side, lane: fx.lane, row: fx.row, shape: fx.shape, turns: fx.turns, hp: fx.hp ?? 0, maxHp: fx.hp ?? 0
                    })
                if (z.owner) this.state.zones.push(z)
                break
            }
            case "buff": if (live) { live.stacks.set(`buff:${fx.buffId}`,
                Math.max(fx.turns,
                    live.stacks.get(`buff:${fx.buffId}`) ?? 0)); this.log("log.buff",
                {
                    hero: live.defId, buff: fx.buffId
                }) } break
            case "ready": if (unit && unit.status !== "board") { unit.readyTurn = this.state.turn; this.log("log.ready",
                {
                    hero: unit.defId
                }) } break
            case "freeMove": if (live) live.stacks.set(MOVE_TOKEN,
                (live.stacks.get(MOVE_TOKEN) ?? 0) + 1); break
            case "draw": this.draw(fx.side as Side,
                fx.n); this.log("log.draw",
                    {
                        p: this.player(fx.side).name, n: fx.n
                    }); break
            case "maxMana": { const p = this.player(fx.side); p.maxMana = Math.min(MAX_MANA,
                p.maxMana + fx.amount); p.mana = Math.min(p.maxMana,
                p.mana + fx.amount); this.log("log.max_mana",
                {
                    p: p.name, n: fx.amount
                }); break }
            case "revealSets": {
                // chỉ người xem biết bài úp của đối thủ là gì
                const viewer = this.clients.find((c) => this.sides.get(c.sessionId) === fx.side)
                viewer?.send("oppSets",
                    this.secrets[other(fx.side as Side)].traps)
                this.log("log.reveal_sets",
                    {
                        p: this.player(fx.side).name
                    })
                break
            }
            }
        }
    }

    private hitNexus(side: string, amount: number, label: string) {
        const p = this.player(side)
        p.nexus = Math.max(0,
            p.nexus - amount)
        this.log("log.nexus_hit",
            {
                p: p.name, n: amount, label, hp: p.nexus, max: NEXUS_HP
            })
        if (p.nexus === 0) this.endGame(other(side))
    }

    /** Đánh vào trụ đường `lane` (còn trụ) hoặc Nhà (trụ đã sập). Trụ bắn trả kẻ đánh nó. */
    private hitStructure(side: Side, lane: number, raw: number, label: string, attacker?: UnitState) {
        const p = this.player(side)
        // Bùa Baron: đánh công trình +50%
        const siege = attacker && (attacker.stacks.get("buff:baron") ?? 0) > 0 ? 1.5 : 1
        const amount = Math.max(1,
            Math.round(raw * STRUCTURE_DAMAGE * siege))
        if (this.sim && attacker) this.stat(attacker).structure += amount
        if (p.towers[lane] <= 0) return this.hitNexus(side,
            amount,
            label)
        p.towers[lane] = Math.max(0,
            p.towers[lane] - amount)
        this.log("log.tower_hit",
            {
                lane, p: p.name, n: amount, hp: p.towers[lane]
            })
        if (p.towers[lane] === 0) {
            const foe = this.player(other(side))
            foe.gold += TOWER_GOLD
            this.log("log.tower_down",
                {
                    lane, p: p.name, foe: foe.name, n: TOWER_GOLD
                })
            return
        }
        if (!attacker || attacker.status !== "board") return
        // trụ bắn trả: mỗi lượt liên tiếp bị đánh thì bắn đau hơn
        const sec = this.secrets[side]
        if (sec.towerHitTurn[lane] !== this.state.turn) {
            sec.towerHeat[lane] = sec.towerHitTurn[lane] >= this.state.turn - 2 ? sec.towerHeat[lane] + 1 : 0
            sec.towerHitTurn[lane] = this.state.turn
        }
        const shot = TOWER_SHOT + TOWER_SHOT_RAMP * sec.towerHeat[lane]
        this.apply([{
            type: "damage", target: {
                kind: "unit", id: attacker.id
            }, amount: shot, label: "trụ bắn trả"
        }])
    }

    private applyDamage(fx: Extract<Effect, { type: "damage" }>, source?: UnitState) {
        if (fx.target.kind === "tower") {
            if (nexusProtected(this.state)) return // trụ và Nhà còn bảo hộ
            this.hitStructure(fx.target.side,
                fx.target.lane,
                fx.amount,
                fx.label,
                (fx.src ? this.state.units.get(fx.src) : undefined) ?? source)
            return
        }
        const u = this.state.units.get(fx.target.id)
        if (!u || u.status !== "board") return
        const attacker = (fx.src ? this.state.units.get(fx.src) : undefined) ?? source
        const base = {
            state: this.state, source: attacker, isAttack: fx.tag === "attack", isSkill: fx.tag === "skill", preview: false
        }
        // Tay Đôi (luật vai đấu sĩ): không đồng minh nào cùng đường thì nhận ít hơn 10%
        const lone = roleOf(u) === "fighter" && laneEnemies(this.state,
            u.owner,
            u.lane).length === 1 ? 0.9 : 1
        let amount = Math.round(fx.amount * damageTakenMult(u) * itemDamageTaken(u,
            base) * lone)
        const shown = amount
        const hadShield = u.shield > 0
        const absorbed = Math.min(u.shield,
            amount)
        u.shield -= absorbed
        amount -= absorbed
        u.hp -= amount
        if (this.sim) {
            this.stat(u).taken += shown
            if (attacker && attacker.owner !== u.owner) {
                this.stat(attacker).dmg += shown
                if (!this.simHits.has(u.id)) this.simHits.set(u.id,
                    new Map())
        this.simHits.get(u.id)!.set(attacker.id,
            this.state.turn)
            }
        }
        if (fx.tag === "attack") this.gainResource(u,
            resourceOf(u).onHit)
        this.log(fx.crit ? "log.damage_crit" : "log.damage",
            {
                hero: u.defId, n: shown, label: fx.label, ...(fx.kind ? {
                    kind: fx.kind
                } : {
                })
            })
        if (hadShield && u.shield === 0) this.apply(runHook(u,
            "onShieldBreak",
            {
                ...base
            }),
        u)
        if (u.hp > 0) {
            this.apply(runHook(u,
                "onDamaged",
                {
                    ...base, amount: shown
                }),
            u)
            return
        }
        // sắp chết: đồ/nội tại có thể cứu (Giáp Thiên Thần)
        const save = runHook(u,
            "preventDeath",
            {
                ...base
            })
        if (save.length) {
            u.hp = 1
            this.log("log.revive",
                {
                    hero: u.defId
                })
            this.apply(save,
                u)
            return
        }
        if (u.status === "board") this.kill(u,
            attacker)
    }

    /** Hạ gục: tướng bị treo RESPAWN_TURNS lượt (giữ đồ), bên hạ được vàng + 1 thẻ mảnh */
    private kill(u: UnitState, killer?: UnitState) {
        const deathFx = getHero(u.defId)?.onDeath?.({
            state: this.state, unit: u
        }) ?? []
        let killFx: Effect[] = []
        const rewarded = !!killer && killer.owner !== u.owner && killer.status === "board"
        if (rewarded) {
            killFx = [
                ...(getHero(killer!.defId)?.onKill?.({
                    state: this.state, unit: killer!, victim: u
                }) ?? []),
                ...runHook(killer!,
                    "onKill",
                    {
                        state: this.state, target: u, isSkill: this.bySkill, isAttack: !this.bySkill, preview: false
                    }),
            ]
        }
        if (this.sim) {
            this.stat(u).deaths++
            if (rewarded) this.stat(killer!).kills++
            // hỗ trợ: đã gây sát thương lên nạn nhân trong 4 lượt gần nhất
            for (const [id,
                t] of this.simHits.get(u.id) ?? []) if (id !== killer?.id && t >= this.state.turn - 4) this.stat({
                id
            }).assists++
            this.simHits.delete(u.id)
        }
        const victimOwner = this.player(u.owner)
        this.takeOff(u,
            "dead",
            RESPAWN_TURNS)
        this.log("log.slain",
            {
                hero: u.defId, n: RESPAWN_TURNS / 2
            })
        if (deathFx.length) this.apply(deathFx)
        if (rewarded) {
            const p = this.player(killer!.owner)
            const bounty = KILL_GOLD + victimOwner.streak // hạ bên đang có chuỗi thì được thêm vàng
            p.gold += bounty
            p.streak++
            victimOwner.streak = 0
            const comp = pick(itemsOfTier("component").map((i) => i.id))
            if (p.bench.length < BENCH_SIZE) p.bench.push(comp)
            this.log("log.bounty",
                {
                    p: p.name, n: bounty, item: comp
                })
            if (killFx.length) this.apply(killFx,
                killer)
        }
    }

    private checkCardTarget(side: Side, cardId: string, targetId?: string) {
        const card = getPlay(cardId)!
        if (card.target !== "none" && (!targetId || !cardTargets(this.state,
            side,
            cardId).includes(targetId))) fail("fail.bad_target")
    }

    /** Chạy adapter của lá bài (phép / chỉ số / đánh thường) */
    private playCard(side: Side, cardId: string, targetId?: string) {
        const card = getPlay(cardId)!
        const target = targetId ? this.state.units.get(targetId) : undefined
        const ctx = {
            state: this.state, side, target
        }
        const met = playMet(card,
            ctx)
        met.forEach((ok, i) => ok && this.log("log.boost",
            {
                card: card.id, boost: i
            }))
        this.apply(card.resolve({
            ...ctx, met
        }))
        this.emitFx({
            kind: "spell", cardId, targetId
        })
    }

    /** Tướng `actor` vừa ra tay: bẫy úp của `side` ở đường đó kích hoạt nếu đúng kiểu. Trả về true nếu hành động bị huỷ. */
    private springTraps(side: Side, actor: UnitState, kinds: TrapTrigger[]) {
        const lane = actor.lane
        const id = this.secrets[side].traps[lane]
        const trap = id ? getTrap(id) : undefined
        if (!trap) return false
        const hit = trap.trigger === "any" ? kinds.includes("attack") || kinds.includes("cast") : kinds.includes(trap.trigger)
        if (!hit) return false
        this.secrets[side].traps[lane] = null
        this.player(side).traps[lane] = false
        this.log("log.trap",
            {
                card: trap.id, p: this.player(side).name, lane
            })
        const tctx = {
            state: this.state, side, lane, actor
        }
        const met = trapMet(trap,
            tctx)
        met.forEach((ok, i) => ok && this.log("log.boost",
            {
                card: trap.id, boost: i
            }))
        const { effects, cancel } = trap.resolve({
            ...tctx, met
        })
        this.emitFx({
            kind: "trap", cardId: trap.id, side, lane, unitId: actor.id
        })
        this.apply(effects)
        if (cancel) this.log("log.canceled",
            {
                hero: actor.defId
            })
        return !!cancel
    }

    private endGame(winner: Side) {
        this.state.phase = "ended"
        this.state.winner = winner
        this.log("log.win",
            {
                p: this.player(winner).name
            })
        if (this.sim) this.sendSimStats()
    }

    private sendSimStats() {
        const units = [...this.state.units.values()].map((u) => ({
            side: u.owner, defId: u.defId, items: [...u.items], ...this.stat(u)
        }))
        this.broadcast("simStats",
            {
                winner: this.state.winner, turn: this.state.turn, round: this.state.round, units,
                towers: Object.fromEntries([...this.state.players.entries()].map(([k,
                    p]) => [k,
                    {
                        towers: [...p.towers], nexus: p.nexus
                    }]))
            })
    }

    // ---------- Tiện ích ----------

    private player(side: Side | string) { return this.state.players.get(side)! }
    private boardUnits(side: Side) { return [...this.state.units.values()].filter((u) => u.owner === side && u.status === "board") }

    private ownUnit(side: Side, id: string) {
        const u = this.state.units.get(id)
        if (!u || u.owner !== side || u.status !== "board") fail("fail.not_yours")
        return u!
    }

    private handCard(side: Side, uid: string, kind?: string) {
        const c = this.secrets[side].hand.find((h) => h.uid === uid)
        const card = c && CARDS[c.defId]
        if (!card || (kind && card.kind !== kind)) fail("fail.no_card")
        return card!
    }

    private discard(side: Side, uid: string) {
        const hand = this.secrets[side].hand
        hand.splice(hand.findIndex((h) => h.uid === uid),
            1)
    }

    private spendMana(p: PlayerState, mana: number) {
        if (p.mana < mana) fail("fail.no_mana")
        p.mana -= mana
    }

    private emitFx(event: object) {
        this.state.fx = JSON.stringify(event)
        this.state.fxSeq++
    }

    private hitIds(effects: Effect[]) {
        return effects.flatMap((fx) => (fx.type === "damage" ? [fx.target.kind === "unit" ? fx.target.id : `tower-${fx.target.side}-${fx.target.lane}`]
            : "unitId" in fx ? [fx.unitId] : []))
    }

    /** Ghi nhật ký theo khóa i18n: client tự dịch tên/nhãn theo ngôn ngữ người xem */
    private log(key: UiKey, params: Record<string, string | number> = {
    }) {
        this.state.log.push(encodeMsg(key,
            params))
        while (this.state.log.length > 60) this.state.log.shift()
    }

    private sendHand(client: Client) {
        const side = this.sides.get(client.sessionId)
        if (!side) return
        client.send("hand",
            this.secrets[side].hand)
        // bài mình đã úp (chỉ chủ nhân biết là lá gì)
        client.send("sets",
            this.secrets[side].traps)
    }

    private syncHands() {
        for (const side of ["A",
            "B"] as Side[]) {
            const p = this.state.players.get(side)
            if (!p) continue
            p.handCount = this.secrets[side].hand.length
            p.deckCount = this.secrets[side].deck.length
        }
        for (const client of this.clients) this.sendHand(client)
    }
}
