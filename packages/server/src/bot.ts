// BOT ĐẤU VỚI NGƯỜI: chạy ngay trong phòng, gửi hành động qua đúng các handler của người chơi (cùng luật, cùng kiểm tra).
// Thuật toán tham lam có chấm điểm: mỗi bước liệt kê nước đi hợp lệ, chấm điểm bằng chính hàm tính sát thương của luật,
// làm nước tốt nhất rồi lặp lại tới khi hết nước có lợi. Dễ: hay chọn ngẫu nhiên và bỏ lượt; Khó: luôn chọn tối ưu.
import {
    BENCH_SIZE, CARDS, CRAFT_PRICE, HAND_LIMIT, allHeroes, draftTaken, draftTurn, ROLE_INFO, SKILLS, SMITE_DAMAGE, SMITE_RANGE, SOLO_PHASE_LANE, type ClientMessages, type HandCard, type Side,
    attackTargets, boardCapAt, boardCount, canAct, canCast, canSummonAt, cardTargets, computeAttack, distance, getPlay, heroOf,
    monsterAlive, monsterDistance, monsterTargets, moveTargets, other, rangeOf, skillTargets, type Target, type UnitLike,
    skillCells, HERO_BUILDS, getItem, combine, computeSkill, skillCost, type Effect,
} from "@starci/shared"
import type {
    DuelState
} from "./schema"

export type BotLevel = "easy" | "hard";
/** Phòng đấu cho bot dùng: đọc trạng thái + tay bài, gửi hành động như người chơi */
export interface BotHost {
  state: DuelState;
  hand(side: Side): HandCard[];
  /** Nhịp trận của phòng (ms chờ sau mỗi hành động; 0 khi test) */
  pace(): number;
  /** Chạy handler như tin nhắn của người chơi; false nếu bị luật từ chối */
  act<K extends keyof ClientMessages>(side: Side, type: K, msg: ClientMessages[K]): boolean;
  wait(ms: number): Promise<void>;
}

const units = (s: DuelState) => [...s.units.values()] as unknown as (UnitLike & { status: string; readyTurn: number; attacked: boolean; items: string[] })[]
const hpPct = (u: UnitLike) => u.hp / Math.max(1,
    u.maxHp)
/** Tổng sát thương lên 1 mục tiêu theo xem trước của luật */
const dmgTo = (s: DuelState, a: UnitLike, t: Target) =>
    computeAttack(s as never,
        a,
        t).reduce((sum, fx) => sum + (fx.type === "damage" && fx.target.kind === t.kind && (t.kind !== "unit" || (fx.target as { id?: string }).id === t.id) ? fx.amount : 0),
        0)

export class DuelBot {
    constructor(private host: BotHost, readonly side: Side, readonly level: BotLevel) {}

    private get s() { return this.host.state }
    private get me() { return this.s.players.get(this.side)! }
    /** Dễ: thỉnh thoảng bỏ qua một nước để người mới dễ thở */
    private lazy() { return this.level === "easy" && Math.random() < 0.3 }
    /** Chọn phần tử điểm cao nhất (Dễ: ngẫu nhiên trong 3 cái tốt nhất) */
    private best<T>(xs: T[], score: (x: T) => number): T | undefined {
        if (!xs.length) return undefined
        const sorted = [...xs].sort((a, b) => score(b) - score(a))
        return this.level === "easy" ? sorted[Math.floor(Math.random() * Math.min(3,
            sorted.length))] : sorted[0]
    }
    private do<K extends keyof ClientMessages>(type: K, msg: ClientMessages[K]) { return this.host.act(this.side,
        type,
        msg) }
    private alive() { return this.s.phase !== "ended" }

    /** Ô trống hợp lệ: hàng theo vai trò, ưu tiên đường giữa rồi toả ra */
    private slot(defId: string, taken: Set<string>, soloOnly: boolean) {
        for (const lane of soloOnly ? [SOLO_PHASE_LANE] : [2,
            1,
            3,
            0,
            4]) {
            for (const row of ROLE_INFO[heroOf({
                defId
            } as UnitLike).role].rows) {
                if (!taken.has(`${lane}-${row}`) && canSummonAt(this.s as never,
                    this.side,
                    defId,
                    lane,
                    row)) return {
                    lane, row
                }
            }
        }
        return undefined
    }

    /** Cấm: tướng mạnh nhất còn lại. Chọn: đủ vai trò (đỡ đòn, đấu sĩ, sát thủ, pháp sư, xạ thủ, trợ thủ) rồi tới tướng mạnh */
    draft() {
        const s = this.s, turn = draftTurn(s)
        if (s.phase !== "draft" || turn?.side !== this.side) return
        const pool = allHeroes().filter((h) => !draftTaken(s,
            h.id))
        const mine = [...(this.side === "A" ? s.picksA : s.picksB)].map((id) => heroOf({
            defId: id
        } as UnitLike).role)
        const power = (h: (typeof pool)[number]) => h.atk + h.ap + h.hp / 20
        const pick = this.best(pool,
            (h) => (turn.action === "ban" ? power(h) : (mine.includes(h.role) ? 0 : 1000) + power(h)))
        if (pick) this.do("draft",
            {
                heroId: pick.id
            })
    }

    /** Mốc triệu hồi: úp tướng (đỡ đòn/đấu sĩ trước để chắn) */
    summonPick() {
        const s = this.s, me = this.me
        if (me.summonReady) return
        const free = units(s).filter((u) => u.owner === this.side && u.status !== "board" && u.readyTurn <= s.turn + 1)
            .sort((a, b) => ROLE_INFO[heroOf(a).role].rows.length - ROLE_INFO[heroOf(b).role].rows.length)
        const need = Math.max(0,
            Math.min(s.summonCount,
                free.length,
                boardCapAt(s.round) - boardCount(s as never,
                    this.side)))
        const taken = new Set<string>(), placements: ClientMessages["summonPick"]["placements"] = []
        for (const u of free) {
            if (placements.length >= need) break
            const at = this.slot(u.defId,
                taken,
                s.round === 1)
            if (!at) continue
            taken.add(`${at.lane}-${at.row}`)
            placements.push({
                unitId: u.id, ...at
            })
        }
        this.do("summonPick",
            {
                placements
            })
    }

    /** Một lượt của bot: ra tướng, đánh bài, ghép đồ, chiêu + đánh + đi, quái rừng, Trừng Phạt, kết thúc lượt */
    /** Một lượt của bot: ra tướng, đánh bài, ghép đồ, chiêu + đánh + đi, quái rừng, Trừng Phạt, kết thúc lượt.
   *  Mỗi hành động xong chờ đúng nhịp trận của phòng, như người chơi. */
    async takeTurn() {
        await this.host.wait(this.host.pace())
        if (!this.myTurn()) return
        await this.summonFree()
        await this.playHand()
        await this.craft()
        for (const u of units(this.s).filter((x) => x.owner === this.side && x.status === "board")) {
            if (!this.myTurn()) return
            await this.castSkills(u)
            await this.moveAndAttack(u)
        }
        if (!this.myTurn()) return
        await this.smite()
        this.do("endTurn",
            {
            })
    }

    private myTurn() { return this.alive() && this.s.activeSide === this.side && this.s.phase === "playing" }
    /** Làm 1 hành động (nếu vẫn đang lượt mình); thành công thì chờ hết nhịp trận */
    private async act<K extends keyof ClientMessages>(type: K, msg: ClientMessages[K]) {
        if (!this.myTurn()) return false
        const ok = this.do(type,
            msg)
        if (ok && this.host.pace()) await this.host.wait(this.host.pace())
        return ok
    }

    private async summonFree() {
        const s = this.s
        for (const u of units(s).filter((x) => x.owner === this.side && x.status !== "board" && x.readyTurn <= s.turn)) {
            if (boardCount(s as never,
                this.side) >= boardCapAt(s.round)) break
            const at = this.slot(u.defId,
                new Set(),
                false)
            if (at) await this.act("summon",
                {
                    unitId: u.id, ...at
                })
        }
    }

    /** Điểm cho mục tiêu của lá / chiêu: địch thì máu thấp (dễ hạ), mình thì máu % thấp (cần cứu) hoặc tướng gánh team */
    private targetScore(id: string, heal: boolean) {
        const u = this.s.units.get(id) as unknown as UnitLike | undefined
        if (!u) return -1
        if (u.owner !== this.side) return 1000 - u.hp
        return heal ? 1 - hpPct(u) : heroOf(u).atk + heroOf(u).ap
    }

    private async playHand() {
        const s = this.s, me = this.me
        for (const c of [...this.host.hand(this.side)]) {
            if (this.lazy()) continue
            const card = CARDS[c.defId]
            if (card.kind === "item") {
                // đồ: đeo cho tướng có món này trong build (chưa có), không ai cần thì cho tướng còn ít đồ nhất
                const itemId = (card as { itemId: string }).itemId
                const u = this.best(units(s).filter((x) => x.owner === this.side && x.status === "board" && x.items.length < 5),
                    (x) => {
                        const i = (HERO_BUILDS[x.defId] ?? []).indexOf(itemId)
                        return (i >= 0 && !x.items.includes(itemId) ? 100 - i * 10 : 0) - x.items.length * 5
                    })
                if (u) await this.act("equip",
                    {
                        uid: c.uid, unitId: u.id
                    })
            } else if (card.kind === "trap" || (card.kind === "spell" && this.level === "hard" && Math.random() < 0.15)) {
                // bẫy (và đôi khi phép để hù): úp ở đường địch đông nhất
                const lanes = [0,
                    1,
                    2,
                    3,
                    4].filter((l) => !me.traps[l])
                const lane = this.best(lanes,
                    (l) => units(s).filter((u) => u.owner !== this.side && u.status === "board" && u.lane === l).length)
                if (lane !== undefined) await this.act("set",
                    {
                        uid: c.uid, lane
                    })
            } else {
                const play = getPlay(card.id)
                if (!play) continue
                if (play.target === "none") { await this.act("play",
                    {
                        uid: c.uid
                    }); continue }
                const heal = /hồi|khiên|heal|shield/i.test(card.desc)
                const t = this.best(cardTargets(s as never,
                    this.side,
                    card.id),
                (id) => this.targetScore(id,
                    heal))
                if (t) await this.act("play",
                    {
                        uid: c.uid, targetId: t
                    })
            }
        }
    }

    /** Đồ còn thiếu theo build của các tướng mình (tướng trên sân trước): món 1 của mọi tướng, rồi món 2... */
    private wantedItems() {
        const mine = units(this.s).filter((x) => x.owner === this.side).sort((a, b) => Number(b.status === "board") - Number(a.status === "board"))
        const inHand = this.host.hand(this.side).map((c) => (CARDS[c.defId] as { itemId?: string }).itemId).filter(Boolean)
        const out: string[] = []
        for (let k = 0; k < 5; k++) for (const u of mine) {
            const id = HERO_BUILDS[u.defId]?.[k]
            if (id && !u.items.includes(id) && !inHand.includes(id) && !out.includes(id)) out.push(id)
        }
        return out
    }
    /** Mảnh còn cần (đã trừ mảnh đang có trong kho) cho 4 món muốn có đầu tiên */
    private neededComponents() {
        const have = [...this.me.bench]
        const need: string[] = []
        for (const id of this.wantedItems().slice(0,
            4)) for (const c of getItem(id)?.recipe ?? []) {
            const i = have.indexOf(c)
            if (i >= 0) have.splice(i,
                1); else need.push(c)
        }
        return need
    }

    private async craft() {
        const me = this.me
        // ghép: ưu tiên cặp ra món trong build; kho đầy (hoặc Dễ) thì ghép cặp đầu
        for (let guard = 0; guard < 6 && me.bench.length >= 2 && me.gold >= CRAFT_PRICE && this.host.hand(this.side).length < HAND_LIMIT; guard++) {
            const wanted = this.wantedItems(), bench = [...me.bench]
            let pair: [number, number] | undefined, bestRank = 99
            for (let a = 0; a < bench.length; a++) for (let b = a + 1; b < bench.length; b++) {
                const r = wanted.indexOf(combine(bench[a],
                    bench[b]) ?? "")
                if (r >= 0 && r < bestRank) { bestRank = r; pair = [a,
                    b] }
            }
            if (!pair && (bench.length >= BENCH_SIZE || this.level === "easy")) pair = [0,
                1]
            if (!pair) break
            const before = me.bench.length
            await this.act("craft",
                {
                    a: pair[0], b: pair[1]
                })
            if (me.bench.length === before) break
        }
    }

    /** Giá trị một chiêu theo đúng hiệu ứng luật tính ra: sát thương (hạ gục thì cộng lớn), khiên/hồi phần máu thiếu, khống chế */
    private skillValue(fx: Effect[]) {
        const s = this.s
        let v = 0
        const dmg = new Map<string, number>()
        const W: Record<string, number> = {
            stun: 120, freeze: 120, silence: 70, chill: 35, shred: 35, wounds: 20
        }
        for (const f of fx) {
            if (f.type === "damage") {
                if (f.target.kind === "tower") { v += f.amount * 0.5; continue }
                const t = s.units.get(f.target.id) as unknown as UnitLike | undefined
                if (t && t.owner !== this.side) { v += f.amount; dmg.set(t.id,
                    (dmg.get(t.id) ?? 0) + f.amount) }
            } else if (f.type === "heal" || f.type === "shield") {
                const t = s.units.get(f.unitId) as unknown as UnitLike | undefined
                if (t && t.owner === this.side) v += Math.min(f.amount,
                    t.maxHp - t.hp + (f.type === "shield" ? t.maxHp * 0.15 : 0)) * 0.9
            } else if (f.type === "status") {
                const t = s.units.get(f.unitId) as unknown as UnitLike | undefined
                if (t && t.owner !== this.side) v += (W[f.status] ?? 15) * f.turns
                else if (t) v += (["guard",
                    "invuln",
                    "unstoppable"].includes(f.status) ? 60 : 30) * f.turns
            } else if (f.type === "zone") v += 150 * f.turns
            else if (f.type === "displace" || f.type === "pull") v += 40
            else v += 10
        }
        for (const [id,
            d] of dmg) {
            const t = s.units.get(id) as unknown as UnitLike
            if (d >= t.hp + t.shield) v += 400 + t.maxHp * 0.2
        }
        return v
    }

    /** Mọi cách tung một chiêu (mục tiêu / ô / không chọn) kèm giá trị */
    private skillOptions(u: UnitLike, skillId: string) {
        const s = this.s, sk = SKILLS[skillId]
        const opts: { v: number; msg: ClientMessages["skill"] }[] = []
        if (sk.target === "cell") {
            for (const c of skillCells(s as never,
                u,
                skillId))
                opts.push({
                    v: this.skillValue(computeSkill(s as never,
                        u,
                        skillId,
                        undefined,
                        false,
                        c)), msg: {
                        unitId: u.id, skillId, cell: c
                    }
                })
        } else if (sk.target === "none") {
            opts.push({
                v: this.skillValue(computeSkill(s as never,
                    u,
                    skillId)), msg: {
                    unitId: u.id, skillId
                }
            })
        } else {
            for (const t of skillTargets(s as never,
                u,
                skillId))
                opts.push({
                    v: this.skillValue(computeSkill(s as never,
                        u,
                        skillId,
                        t)), msg: {
                        unitId: u.id, skillId, targetId: t
                    }
                })
        }
        return opts
    }

    /** Khó: mỗi bước chọn cách tung chiêu có giá trị / mana cao nhất; giữ mana cho R khi R sắp hồi xong. Dễ: như cũ nhưng hay bỏ lượt */
    private async castSkills(u: UnitLike) {
        const s = this.s, hero = heroOf(u)
        const ult = hero.skills.find((id) => SKILLS[id]?.key === "R")
        for (let guard = 0; guard < 4; guard++) {
            if (u.status !== ("board" as never) || !this.myTurn() || this.lazy()) return
            const ready = hero.skills.filter((id) => canCast(s as never,
                u,
                id))
            if (!ready.length) return
            const foeNear = units(s).some((x) => x.owner !== this.side && x.status === "board" && distance(u,
                x) <= rangeOf(u) + 1)
            const ultCd = ult ? (u.cooldowns.get(ult) ?? 0) : 99
            const reserve = this.level === "hard" && ult && ultCd <= 1 && !ready.includes(ult) ? skillCost(u,
                ult) : 0
            let best: { score: number; msg: ClientMessages["skill"] } | undefined
            for (const id of ready) {
                const cost = skillCost(u,
                    id)
                for (const o of this.skillOptions(u,
                    id)) {
                    if (reserve && id !== ult && (u.mana ?? 0) - cost < reserve && o.v < 400) continue
                    // chiêu tự cường hoá (không ra hiệu ứng đo được): chỉ dùng khi có địch ở gần
                    const v = o.v <= 30 ? (foeNear ? 60 : 0) : o.v
                    const score = v / Math.max(10,
                        cost)
                    if (v > 0 && (!best || score > best.score)) best = {
                        score, msg: o.msg
                    }
                }
            }
            if (!best || !(await this.act("skill",
                best.msg))) return
        }
    }

    /** Chưa có ai trong tầm thì đi 1 ô lại gần địch (Khó: hoặc lại gần quái rừng); rồi đánh mục tiêu tốt nhất */
    private async moveAndAttack(u: UnitLike & { attacked: boolean }) {
        const s = this.s, foes = units(s).filter((x) => x.owner !== this.side && x.status === "board")
        if (!attackTargets(s as never,
            u).length && !u.moved) {
            const score = (c: { lane: number; row: string }) => {
                const at = {
                    ...u, ...c, owner: this.side
                } as UnitLike
                const toFoe = Math.min(99,
                    ...foes.map((f) => distance(at,
                        f)))
                const toCamp = this.level === "hard" ? Math.min(99,
                    ...[...s.monsters].filter(monsterAlive).map((m) => monsterDistance(at,
                        m.lane) + 1)) : 99
                return Math.min(toFoe,
                    toCamp)
            }
            const to = this.best(moveTargets(s as never,
                u),
            (c) => -score(c))
            if (to && score(to) < score(u)) await this.act("move",
                {
                    unitId: u.id, ...to
                })
        }
        const targets = attackTargets(s as never,
            u)
        if (targets.length) {
            // ưu tiên hạ được ngay, rồi máu thấp, trụ/Nhà khi không còn tướng
            const t = this.best(targets,
                (x) => {
                    if (x.kind !== "unit") return 500
                    const f = s.units.get(x.id) as unknown as UnitLike
                    return (dmgTo(s,
                        u,
                        x) >= f.hp ? 2000 : 1000) - f.hp
                })
            if (t) await this.act("attack",
                {
                    unitId: u.id, target: t
                })
            return
        }
        // không ai để đánh: đánh quái rừng (bùa trước, Baron khi đội đủ đông)
        if (!u.attacked && canAct(s as never,
            u)) {
            const lanes = monsterTargets(s as never,
                u,
                rangeOf(u))
            const lane = this.best(lanes,
                (l) => {
                    const m = [...s.monsters].find((x) => x.lane === l)!
                    if (m.id === "baron") return boardCount(s as never,
                        this.side) >= 4 ? 300 : -1
                    return (m.id === "red" || m.id === "blue" ? 200 : 100) - m.hp / 10
                })
            if (lane !== undefined) await this.act("attackMonster",
                {
                    unitId: u.id, lane
                })
        }
    }

    /** Trừng Phạt: kết liễu quái sắp chết; Khó: canh cướp Baron khi đối thủ đang đánh */
    private async smite() {
        const s = this.s, me = this.me
        if (me.smiteRound > s.round) return
        const foe = other(this.side)
        const near = (lane: number) => units(s).some((u) => u.owner === this.side && u.status === "board" && monsterDistance(u,
            lane) <= SMITE_RANGE)
        const pick = this.best([...s.monsters].filter((m) => monsterAlive(m) && m.hp <= SMITE_DAMAGE && near(m.lane)),
            (m) => {
                const enemyDmg = foe === "A" ? m.dmgA : m.dmgB, myDmg = this.side === "A" ? m.dmgA : m.dmgB
                if (m.id === "baron") return enemyDmg > myDmg ? 1000 : 500 // cướp Baron!
                return m.id === "red" || m.id === "blue" ? 300 : 100
            })
        if (pick) await this.act("smite",
            {
                lane: pick.lane
            })
    }
}
