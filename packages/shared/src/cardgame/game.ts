// Game: bộ công cụ nguyên thủy trên một GameState có thể đổi (engine clone state trước khi tạo Game).
// Mọi hàm đổi state đều phát sự kiện vào `events`. Tướng viết chiêu/hook bằng các hàm này.
import {
    baseStats, getItem
} from "../items"
import {
    evalExpr
} from "./formula"
import {
    CARD_ITEMS, distinctItems, itemHealMult
} from "./items"
import {
    getHero, getSpecialCard
} from "./registry"
import {
    EXTRA_LANE, RULES, SIDES, otherSide,
    type AttackInfo, type Card, type DamageKind, type GameEvent, type GameState, type HeroDef, type HookData, type HookName,
    type NextAttackBuff, type PlayArgs, type Role, type Side, type SkillDef, type SkillKey, type TokenDef, type TurnAttacks, type Unit,
} from "./types"

export interface UnitStats {
  atk: number; ap: number; hp: number; armor: number; mr: number; crit: number; critDmg: number; atkMult: number;
  lethality: number; magicPen: number; spellAmp: number; dmgAmp: number; lifesteal: number; omnivamp: number; extraAtk: number;
}
const ZERO: UnitStats = {
    atk: 0, ap: 0, hp: 0, armor: 0, mr: 0, crit: 0, critDmg: 0, atkMult: 0, lethality: 0, magicPen: 0, spellAmp: 0, dmgAmp: 0, lifesteal: 0, omnivamp: 0, extraAtk: 0
}

/** Chỉ số gốc của món đồ trong chế độ thẻ bài: baseStats của gói items nhân RULES.itemScale (máu, AD) */
export function cardItemStats(it: NonNullable<ReturnType<typeof getItem>>): Record<string, number> {
    const b = {
        ...(baseStats(it) as unknown as Record<string, number>)
    }
    for (const [k,
        m] of Object.entries(RULES.itemScale)) if (b[k]) b[k] = Math.round(b[k] * m)
    return b
}

export class Game {
    events: GameEvent[] = []
    private hookDepth = 0
    /** Nguồn ghi lên trạng thái khi đang chạy hook nội tại (xem withSource) */
    srcOverride: { src?: string; card?: string } | null = null
    /** Lá/tướng đang giải quyết (engine đặt quanh resolve) để g.status tự ghi nguồn */
    cur: { src?: string; card?: string; uid?: string } = {
    }
    constructor(public s: GameState) {}
    emit(e: GameEvent) { this.events.push(e) }
    log(text: string) { this.emit({
        t: "log", text
    }) }

    // ---------------- RNG ----------------
    rand(): number {
        this.s.rng = (this.s.rng + 0x6d2b79f5) >>> 0
        let t = this.s.rng
        t = Math.imul(t ^ (t >>> 15),
            t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7),
            t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    randInt(n: number) { return Math.floor(this.rand() * n) }
    pick<T>(arr: T[]): T | undefined { return arr.length ? arr[this.randInt(arr.length)] : undefined }
    shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) { const j = this.randInt(i + 1); [arr[i],
            arr[j]] = [arr[j],
            arr[i]] }
        return arr
    }

    // ---------------- Tra cứu ----------------
    unit(id: string | undefined): Unit | undefined { return id ? this.s.units[id] : undefined }
    player(side: Side) { return this.s.players[side] }
    hero(u: Unit): HeroDef {
        if (u.token) { // vật triệu hồi: dựng khung tướng từ chỉ số riêng
            const k = u.token, noSkill = (key: SkillKey) => ({
                key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
            })
            return {
                id: u.hero, name: k.name, role: k.role, damage: k.damage, hp: u.maxHp, atk: k.atk, armor: k.armor, mr: k.mr, passive: {
                    name: "-", desc: "-"
                }, skills: {
                    Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
                }
            }
        }
        const h = getHero(u.hero); if (!h) throw new Error(`Không có tướng ${u.hero}`); return h }
    role(u: Unit): Role { return this.hero(u).role }
    /** Tướng đang trên sân (theo thứ tự đường) */
    /** Tướng (không tính vật triệu hồi) đang trên sân */
    heroes(side?: Side): Unit[] { return this.board(side).filter((u) => !u.token) }
    /** Vật triệu hồi đang đứng ở ô phụ của side */
    tokenOf(side: Side): Unit | undefined { const u = this.unit(this.s.extra?.[side] ?? undefined); return u && u.status === "board" ? u : undefined }
    /** Token "máu ảo" đang che cho tướng u (nếu có) */
    soakOf(u: Unit): Unit | undefined {
        if (u.token) return undefined
        const t = this.tokenOf(u.side)
        return t?.token?.ownerId === u.id && t.token.soak ? t : undefined
    }
    board(side?: Side): Unit[] {
        return Object.values(this.s.units).filter((u) => u.status === "board" && (!side || u.side === side)).sort((a, b) => a.side.localeCompare(b.side) || a.lane - b.lane)
    }
    /** Tướng ĐANG SỐNG trên sân ở đường đó (tướng chết giữ đường nhưng tính là trống khi nhắm mục tiêu). Dùng g.laneHolder để thấy cả tướng chết. */
    at(side: Side, lane: number): Unit | undefined { const o = this.laneHolder(side,
        lane); return o && o.status === "board" ? o : undefined }
    /** Đơn vị đang giữ chỗ ở đường (kể cả tướng chết đang chờ hồi sinh: đường vẫn bị giữ, không gọi tướng khác vào được) */
    laneHolder(side: Side, lane: number): Unit | undefined { return this.unit(this.s.lanes[side][lane] ?? undefined) }
    opposite(u: Unit): Unit | undefined { return this.at(otherSide(u.side),
        u.lane) }
    enemies(u: Unit | Side): Unit[] { return this.board(otherSide(typeof u === "string" ? u : u.side)) }
    allies(u: Unit, includeSelf = true): Unit[] { return this.board(u.side).filter((x) => includeSelf || x.id !== u.id) }
    lowestHp(units: Unit[]): Unit | undefined { return [...units].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.hp - b.hp)[0] }
    isOpen(lane: number) { return RULES.laneOpenRound[lane] <= this.s.round }
    openLanes(): number[] { return [0,
        1,
        2,
        3,
        4].filter((l) => this.isOpen(l)) }
    emptyLanes(side: Side): number[] { return this.openLanes().filter((l) => !this.s.lanes[side][l]) }
    hpPct(u: Unit) { return u.hp / u.maxHp }

    // ---------------- Chỉ số ----------------
    stats(u: Unit): UnitStats {
        const out = {
            ...ZERO
        }
        for (const id of u.items) { // mỗi bản sao cộng chỉ số riêng
            const def = CARD_ITEMS[id]
            const it = def ? undefined : getItem(id)
            const b: Record<string, number | undefined> = def ? def.stats : it ? cardItemStats(it) : {
            }
            for (const k of Object.keys(ZERO) as (keyof UnitStats)[]) out[k] += b[k] ?? 0
            if (def?.adaptive) out[this.hero(u).damage === "magic" ? "ap" : "atk"] += def.adaptive // chỉ số thích ứng: AD nếu tướng đánh vật lý, AP nếu phép
        }
        for (const id of distinctItems(u)) { // chỉ số theo bộ đếm: mỗi id khác nhau 1 lần
            const bo = CARD_ITEMS[id]?.bonus?.(this,
                u)
            if (bo) for (const k of Object.keys(bo) as (keyof UnitStats)[]) out[k] += bo[k] ?? 0
        }
        for (const id of distinctItems(u)) { // hệ số nhân tổng (Rabadon: AP +30%)
            const mu = CARD_ITEMS[id]?.mult
            if (mu) for (const k of Object.keys(mu) as (keyof UnitStats)[]) out[k] += (out[k] > 0 ? out[k] : 0) * (mu[k] ?? 0)
        }
        const hb = u.token ? undefined : getHero(u.hero)?.bonusStats?.(this,
            u) // chỉ số riêng của tướng (Lux AP theo mana, Yorick ATK theo mộ, Ornn Rèn)
        if (hb) for (const k of Object.keys(hb) as (keyof UnitStats)[]) out[k] += hb[k] ?? 0
        // stack "itemAmp" (%): đồ của tướng mạnh thêm (Ornn rèn đồ Kiệt Tác)
        const amp = (u.stacks?.itemAmp ?? 0) / 100
        if (amp) for (const k of Object.keys(out) as (keyof UnitStats)[]) out[k] *= 1 + amp
        return out
    }
    atk(u: Unit) { const st = this.stats(u); return Math.round((this.hero(u).atk + st.atk) * (1 + st.atkMult)) }
    ap(u: Unit) { return Math.round(this.stats(u).ap) }
    bonusHp(u: Unit) { return this.stats(u).hp }
    armor(u: Unit) { return Math.round((this.hero(u).armor + this.stats(u).armor + (u.stacks.bonusRes ?? 0)) * (this.has(u,
        "shred") ? RULES.shredMult : 1)) }
    mr(u: Unit) { return Math.round((this.hero(u).mr + this.stats(u).mr + (u.stacks.bonusRes ?? 0)) * (this.has(u,
        "shred") ? RULES.shredMult : 1)) }
    /** Công thức {…} theo chỉ số của u */
    f(u: Unit, expr: string) { return evalExpr(this,
        u,
        expr) }

    // ---------------- Trạng thái ----------------
    /** Lượt (turnNo) mà trạng thái hết hạn: cuối lượt thứ n của `side` kể từ bây giờ (lượt đang chạy tính nếu là của side) */
    turnsUntil(side: Side, n: number) {
        const first = this.s.active === side ? this.s.turnNo : this.s.turnNo + 1
        return first + 2 * (Math.max(1,
            n) - 1)
    }
    has(u: Unit, id: string) { return !!u.statuses[id] }
    statusV(u: Unit, id: string) { return u.statuses[id]?.v ?? 0 }
    /** Gắn trạng thái `turns` lượt của CHỦ tướng (o.of đổi sang phe khác: vd "tới hết lượt đối thủ" = of: phe đối thủ). o.v: giá trị; o.add: cộng dồn v (tối đa o.max). */
    status(u: Unit, id: string, turns: number, o: { v?: number; add?: boolean; max?: number; of?: Side; until?: number; src?: string; card?: string; decay?: number } = {
    }) {
        if (u.status !== "board") return
        const fx = this.s.fx
        if (fx?.cutNoCc && u.side === fx.cutSide && ["stun",
            "silence",
            "chill",
            "shred",
            "blind"].includes(id)) return // Braum E trên chiêu cuối: miễn khống chế
        const by = this.srcOverride ?? this.cur
        const src = o.src ?? by.src, card = o.card ?? by.card
        const srcUnit = this.unit(src)
        if (this.s.immune?.includes(u.id) && srcUnit && srcUnit.side !== u.side) return // Mũ Thích Nghi: miễn hiệu ứng của lá địch này
        const until = o.until ?? this.turnsUntil(o.of ?? u.side,
            turns)
        const cur = u.statuses[id]
        let v = o.v ?? 1
        const pre = {
            unit: u, id, turns, v, cancel: false
        }
        this.hook("onBeforeStatus",
            pre)
        if (pre.cancel) return
        if (o.add) {
            const d = {
                unit: u, key: id, n: v, src
            }
            this.hook("onHeroStack",
                d)
            v = Math.min(o.max ?? Infinity,
                (cur?.v ?? 0) + d.n)
        }
        const keep = !!cur && cur.until >= until // không gia hạn thì giữ mốc bắt đầu cũ
        u.statuses[id] = {
            until: keep ? cur.until : until, v, at: keep ? cur.at ?? this.s.turnNo : this.s.turnNo, ...(o.decay ? {
                decay: o.decay
            } : cur?.decay ? {
                decay: cur.decay
            } : {
            }), ...(src ? {
                src
            } : {
            }), ...(card ? {
                card
            } : {
            })
        }
        this.emit({
            t: "status", target: u.id, id, turns, v, src, card
        })
    }
    removeStatus(u: Unit, id: string) { if (u.statuses[id]) { delete u.statuses[id]; this.emit({
        t: "statusEnd", target: u.id, id
    }) } }
    /** Bộ đếm riêng (không hết hạn) */
    stack(u: Unit, key: string, delta: number, max = Infinity) {
        if (delta > 0 && u.status === "board" && !/^(item:|itemT|once:|aura:)/.test(key)) {
            const d = {
                unit: u, key, n: delta, src: (this.srcOverride ?? this.cur).src
            }
            this.hook("onHeroStack",
                d)
            delta = d.n
        }
        return this.setStack(u,
            key,
            Math.min(max,
                (u.stacks[key] ?? 0) + delta))
    }
    setStack(u: Unit, key: string, value: number) { u.stacks[key] = value; this.emit({
        t: "stack", unit: u.id, key, value
    }); return value }
    stackOf(u: Unit, key: string) { return u.stacks[key] ?? 0 }
    canAct(u: Unit) { return u.status === "board" && !this.has(u,
        "stun") }
    /** Đánh được không: còn hành động được và không bị "disarm" (trạng thái cấm đánh, vd Say Mê của Ahri; dùng g.status(u, "disarm", n, { v, decay })). Mọi chỗ đánh thường/đánh không cần lá/đánh miễn phí đều kiểm tra. */
    canAttack(u: Unit) { return this.canAct(u) && !this.has(u,
        "disarm") }
    /** Có lá chiêu dùng được không (Choáng/Câm Lặng chặn) */
    canCast(u: Unit) { return this.canAct(u) && !this.has(u,
        "silence") }

    // ---------------- Sát thương, hồi, khiên, chết ----------------
    /** Gây sát thương. `raw` là con số trước giáp. Trả về tổng đã gây (khiên + máu). */
    damage(src: Unit | undefined, tgt: Unit, raw: number, kind: DamageKind, o: { tag?: "attack" | "skill" | "dot" | "effect"; crit?: boolean; noShare?: boolean } = {
    }): number {
        if (tgt.status !== "board" || this.s.phase === "over") return 0
        if (this.has(tgt,
            "invulnerable")) return 0 // trạng thái bất khả xâm phạm (Vương Miện Bảo Hộ)
        if (this.s.immune?.includes(tgt.id) && src && src.side !== tgt.side) return 0 // Mũ Thích Nghi
        const tag = o.tag ?? "effect"
        // Hộ vệ (Lời Thề Hộ Vệ): đồng minh đeo đồ shareDamage gánh một phần sát thương thay tgt
        if (!o.noShare && !tgt.token) {
            for (const w of this.heroes(tgt.side)) {
                if (w.id === tgt.id) continue
                const f = Math.max(0,
                    ...distinctItems(w).map((id) => CARD_ITEMS[id]?.shareDamage ?? 0))
                if (f > 0) {
                    this.damage(src,
                        w,
                        raw * f,
                        kind,
                        {
                            ...o, noShare: true
                        })
                    raw *= 1 - f
                    break
                }
            }
        }
        // Máu ảo: sát thương nhắm tướng chủ đánh vào token trước (bỏ qua nếu chính chủ tự gây)
        const soak = src?.id === tgt.id ? undefined : this.soakOf(tgt)
        if (soak) {
            const dealt = this.damage(src,
                soak,
                raw,
                kind,
                o)
            if (soak.status !== "board" && soak.token?.overflow) {
                // phần thừa sau giáp của token chảy sang chủ (sát thương chuẩn)
                const ev = [...this.events].reverse().find((e) => e.t === "damage" && e.target === soak.id) as Extract<GameEvent, { t: "damage" }> | undefined
                const over = ev ? ev.amount - dealt : 0
                if (over > 0) this.damage(src,
                    tgt,
                    over,
                    "true",
                    o)
            }
            return dealt
        }
        let m = 1
        const dd = {
            target: tgt, kind, tag, crit: o.crit
        }
        if (src) {
            const st = this.stats(src)
            m *= 1 + st.dmgAmp
            if (tag === "skill") {
                m *= 1 + st.spellAmp
                if (this.role(src) === "mage") m *= 1 + RULES.mageSkillBonus
            }
            if (tag !== "dot" && this.has(src,
                "empower")) m *= 1 + RULES.buffCard.dmg
            if (this.has(src,
                "exhaust")) m *= 0.6 // Kiệt Sức (phép bổ trợ)
            if (src.id !== tgt.id) for (const id of distinctItems(src)) m *= CARD_ITEMS[id]?.dmgMult?.(this,
                src,
                dd) ?? 1 // đồ của tướng gây sát thương
        }
        if (this.has(tgt,
            "chill")) m *= 1 + RULES.chillBonus
        if (src && src.side !== tgt.side) for (const id of distinctItems(tgt)) m *= CARD_ITEMS[id]?.takenMult?.(this,
            tgt,
            {
                src, kind, tag
            }) ?? 1 // đồ của tướng nhận sát thương từ địch
        if (src && tag === "skill" && !dd.crit) { // chiêu chí mạng theo tỉ lệ chí mạng (Găng Bảo Thạch)
            const sc = Math.max(0,
                ...distinctItems(src).map((id) => CARD_ITEMS[id]?.spellCritMult ?? 0))
            if (sc > 0 && this.rand() < Math.min(1,
                this.stats(src).crit)) { dd.crit = true; m *= sc }
        }
        // nội tại "nhân sát thương" của mọi tướng đang trên sân (HeroDef.modifyDamage)
        for (const hu of Object.values(this.s.units)) {
            if (hu.status !== "board" || hu.token) continue
            const dm = {
                src, target: tgt, kind, tag, crit: o.crit
            }
            const f = getHero(hu.hero)?.modifyDamage
            if (f) m *= f(this,
                hu,
                dm)
            for (const id of distinctItems(hu)) m *= CARD_ITEMS[id]?.modifyDamage?.(this,
                hu,
                dm) ?? 1
        }
        const crit = dd.crit
        const fx = this.s.fx
        if (fx?.cut && src && src.side !== tgt.side && tgt.side === fx.cutSide) m *= 1 - fx.cut // Braum E: giảm sát thương nhận
        let armor = 0
        if (kind === "physical") armor = Math.max(0,
            this.armor(tgt) - (src ? this.stats(src).lethality : 0))
        else if (kind === "magic") armor = Math.max(0,
            this.mr(tgt) - (src ? this.stats(src).magicPen : 0))
        const amount = Math.max(0,
            Math.round(raw * m * (100 / (100 + armor))))
        const absorbed = Math.min(tgt.shield,
            amount)
        tgt.shield -= absorbed
        const hpLost = Math.min(tgt.hp,
            amount - absorbed)
        tgt.hp -= hpLost
        this.emit({
            t: "damage", src: src?.id, target: tgt.id, amount, hpLost, absorbed, kind, tag, crit, hp: tgt.hp
        })
        if (src) this.s.stats[src.side].damage += hpLost + absorbed
        if (absorbed > 0 && tgt.shield === 0) this.hook("onShieldBreak",
            {
                target: tgt
            })
        this.hook("onDamage",
            {
                src, target: tgt, amount, hpLost, kind, tag, crit
            })
        if (fx?.reflectUnit === tgt.id && src && src.side !== tgt.side && (tag === "skill" || tag === "attack") && amount > 0) {
            this.damage(tgt,
                src,
                Math.round(amount * (fx.reflectPct ?? 0)),
                "true",
                {
                    tag: "effect"
                }) // Braum Q: phản sát thương
        }
        if (src && tag !== "dot") {
            const st = this.stats(src)
            const vamp = (tag === "attack" ? st.lifesteal : 0) + st.omnivamp
            if (vamp > 0 && hpLost > 0) this.heal(src,
                src,
                Math.round(hpLost * vamp))
        }
        // hook onLethal: tướng có thể "không chết" (đặt lại hp > 0) trước khi bị hạ (Renata nội tại)
        if (tgt.hp <= 0 && tgt.status === "board" && !tgt.token) this.hook("onLethal",
            {
                target: tgt, src, hpLost, over: Math.max(0,
                    amount - absorbed - hpLost), kind, tag
            })
        if (tgt.hp <= 0 && tgt.status === "board") this.kill(tgt,
            src)
        return absorbed + hpLost
    }
    heal(src: Unit | undefined, tgt: Unit, amount: number): number {
        if (tgt.status !== "board" || amount <= 0 || this.has(tgt,
            "noheal")) return 0 // "noheal": không hồi máu, không nhận Khiên (Lời Nhắc Tử Vong)
        if (src) amount *= this.givenMult(src)
        amount *= itemHealMult(tgt) // đồ (Vuốt Rồng) nhân hồi máu trước Vết Thương Sâu
        if (this.has(tgt,
            "grievous")) amount *= 1 - RULES.grievous // Vết Thương Sâu: hồi máu giảm
        const real = Math.max(0,
            Math.min(Math.round(amount),
                tgt.maxHp - tgt.hp))
        tgt.hp += real
        this.emit({
            t: "heal", src: src?.id, target: tgt.id, amount: real, hp: tgt.hp
        })
        return real
    }
    shield(src: Unit | undefined, tgt: Unit, amount: number) {
        if (tgt.status !== "board" || amount <= 0 || this.has(tgt,
            "noheal")) return
        if (src) amount *= this.givenMult(src)
        amount *= itemHealMult(tgt) // đồ (Vuốt Rồng) nhân Khiên nhận trước Vết Thương Sâu
        if (this.has(tgt,
            "grievous")) amount *= 1 - RULES.grievous // Vết Thương Sâu: Khiên nhận giảm
        tgt.shield += Math.round(amount)
        this.emit({
            t: "shield", src: src?.id, target: tgt.id, amount: Math.round(amount), shield: tgt.shield
        })
    }
    kill(victim: Unit, killer?: Unit) {
        if (victim.status !== "board") return
        if (victim.token) { this.killToken(victim,
            killer); return }
        victim.hp = 0
        this.emit({
            t: "kill", src: killer?.id, target: victim.id
        })
        this.thawCards(otherSide(victim.side),
            victim.id) // băng của tướng chết tan
        if (killer) this.s.stats[killer.side].kills++
        victim.homeLane = victim.lane // tướng chết GIỮ đường (lanes[...] vẫn trỏ tới nó) tới khi hồi sinh
        victim.status = "dead"
        victim.deaths++
        victim.respawnRound = this.s.round + RULES.respawnRounds
        victim.shield = 0; victim.statuses = {
        }; victim.nextAttack = []
        const p = this.s.players[victim.side]
        p.lives--
        this.emit({
            t: "lives", side: victim.side, lives: p.lives
        })
        for (const tk of Object.values(this.s.units)) if (tk.token?.ownerId === victim.id && tk.status === "board") this.removeToken(tk,
            "owner")
        if (p.lives > 0) this.flipPrize(otherSide(victim.side))
        this.hook("onDeath",
            {
                victim, killer
            })
        if (killer) this.hook("onKill",
            {
                killer, victim
            })
        this.hook("onLifeLost",
            {
                side: victim.side, lives: p.lives
            })
        if (p.lives <= 0) this.endGame(otherSide(victim.side),
            "lives")
    }
    /** Vật triệu hồi bị hạ: không tính mạng, không hồi sinh, biến mất */
    private killToken(tok: Unit, killer?: Unit) {
        tok.hp = 0
        this.emit({
            t: "kill", src: killer?.id, target: tok.id
        })
        this.removeToken(tok,
            "dead")
        this.hook("onDeath",
            {
                victim: tok, killer
            })
        if (killer) this.hook("onKill",
            {
                killer, victim: tok
            })
    }
    /** Gỡ token khỏi ô phụ và khỏi state */
    removeToken(tok: Unit, reason: "dead" | "owner" | "replaced" | "expired") {
        this.flipToken(tok) // token úp rời sân thì lộ mặt
        if (this.s.extra[tok.side] === tok.id) this.s.extra[tok.side] = null
        tok.status = "dead"; tok.lane = -1
        this.emit({
            t: "tokenEnd", unit: tok.id, reason
        })
        delete this.s.units[tok.id]
    }
    /** Triệu hồi vật triệu hồi vào Ô TRIỆU HỒI PHỤ của side (ô đang có token thì token cũ bị thay). */
    summonToken(side: Side, def: TokenDef): Unit {
        const old = this.tokenOf(side)
        if (old) this.removeToken(old,
            "replaced")
        const id = `${side}:tok${this.s.nextUid++}`
        const owner = def.ownerId ? this.unit(def.ownerId) : undefined
        if (def.ownerId && (!owner || owner.status !== "board" || owner.side !== side)) throw new Error("Chủ của vật triệu hồi phải là tướng mình đang trên sân")
        const u: Unit = {
            id, hero: `token:${def.id}`, side, status: "board", lane: EXTRA_LANE, homeLane: EXTRA_LANE,
            hp: def.hp, maxHp: def.hp, shield: def.shield ?? 0, items: [], statuses: {
            }, stacks: {
            }, nextAttack: [], respawnRound: 0, deaths: 0,
            token: {
                id: def.id, name: def.name, atk: def.atk ?? 0, armor: def.armor ?? 0, mr: def.mr ?? 0, damage: def.damage ?? "physical",
                role: def.role ?? "fighter", soak: def.soak ?? !!def.ownerId, overflow: def.overflow ?? false, ownerId: def.ownerId,
                hidden: def.hidden || undefined, secret: def.secret, card: def.card, expires: def.turns ? this.turnsUntil(side,
                    def.turns) : undefined,
            },
        }
        this.s.units[id] = u
        this.s.extra[side] = id
        this.emit({
            t: "summonToken", side, unit: id, name: def.name, owner: def.ownerId
        })
        return u
    }
    /** Lật token úp: lộ secret/card cho cả hai bên (không làm gì nếu token đã ngửa) */
    flipToken(tok: Unit) {
        if (!tok.token?.hidden) return
        tok.token.hidden = false
        this.emit({
            t: "tokenFlip", unit: tok.id, card: tok.token.card, secret: tok.token.secret
        })
    }
    /** Gỡ các token đã hết hạn (gọi cuối mỗi lượt) */
    expireTokens() {
        for (const u of Object.values(this.s.units)) if (u.token && u.status === "board" && u.token.expires !== undefined && u.token.expires <= this.s.turnNo) this.removeToken(u,
            "expired")
    }
    /** Hiệu ứng tạm (đổi mục tiêu, giảm sát thương...) mà lá Quick đang giải quyết áp lên mắt xích ngay dưới nó */
    chainFx() { return (this.s.fxNext ??= {
    }) }
    /** Lật 1 lá thưởng của side lên tay (tay đầy thì vào mộ) */
    flipPrize(side: Side) {
        const pile = this.s.prizeCards[side]
        const card = pile.shift()
        if (!card) return
        this.s.prizes[side] = pile.length
        this.emit({
            t: "prize", side, card, left: pile.length
        })
        const p = this.player(side)
        if (p.hand.length >= RULES.handMax) this.burnOverflow(side,
            card)
        else p.hand.push(card)
    }
    endGame(winner: Side, reason: "lives" | "deck") {
        if (this.s.phase === "over") return
        this.s.phase = "over"; this.s.winner = winner; this.s.endReason = reason; this.s.chain = null
        this.emit({
            t: "end", winner, reason
        })
    }

    // ---------------- Vị trí ----------------
    /** Đưa u sang đường `lane` (cùng phe); nếu có đồng đội ở đó thì đổi chỗ */
    moveTo(u: Unit, lane: number) {
        if (u.status !== "board" || u.token || u.lane === lane) return
        const lanes = this.s.lanes[u.side]
        const old = u.lane, occ = this.unit(lanes[lane] ?? undefined)
        if (occ && occ.status !== "board") return // đường đang giữ cho tướng chết: không chen vào được
        lanes[old] = occ?.id ?? null
        if (occ) occ.lane = old
        lanes[lane] = u.id; u.lane = lane
        this.emit({
            t: "move", unit: u.id, from: old, to: lane, with: occ?.id
        })
    }

    /** Đeo món `item` lên tướng u (máu tối đa/hiện tại tăng theo máu của món), phát "equip" + hook onEquip. Trả false nếu hết ô. */
    equip(u: Unit, item: string): boolean {
        if (u.items.length >= RULES.itemSlots || u.token) return false
        const before = this.stats(u).hp
        u.items.push(item)
        const dh = this.stats(u).hp - before
        u.maxHp += dh; if (u.status === "board") u.hp += dh
        this.emit({
            t: "equip", side: u.side, unit: u.id, item
        })
        this.hook("onEquip",
            {
                side: u.side, unit: u, item
            })
        return true
    }

    // ---------------- Dấu mốc trên đường (lane markers) ----------------
    /** Danh sách id dấu đang nằm ở đường `lane` phía `side` */
    markersAt(side: Side, lane: number): string[] { return this.s.markers?.[side]?.[lane] ?? [] }
    /** Đặt 1 dấu `id` lên đường `lane` phía `side` (một đường có thể có nhiều dấu) */
    addMarker(side: Side, lane: number, id: string) {
        this.s.markers ??= {
            A: [[],
                [],
                [],
                [],
                []], B: [[],
                [],
                [],
                [],
                []]
        }
        this.s.markers[side][lane].push(id)
        this.emit({
            t: "marker", side, lane, id, on: true
        })
    }
    /** Gỡ 1 dấu `id` ở đường `lane` phía `side`; trả về true nếu có dấu để gỡ */
    removeMarker(side: Side, lane: number, id: string): boolean {
        const list = this.s.markers?.[side]?.[lane]
        const i = list ? list.indexOf(id) : -1
        if (!list || i < 0) return false
        list.splice(i,
            1)
        this.emit({
            t: "marker", side, lane, id, on: false
        })
        return true
    }

    // ---------------- Đòn đánh ----------------
    /** Đòn đánh thường của a lên t (theo luật vai). Tự áp buff đòn kế tiếp, trượt (blind), chí mạng, hook. */
    attack(a: Unit, t: Unit, o: { mult?: number; bonusRaw?: number; free?: boolean; cardless?: boolean } = {
    }): AttackInfo | undefined {
        if (a.status !== "board" || t.status !== "board" || this.s.phase === "over") return undefined
        const st = this.stats(a)
        const info: AttackInfo = {
            attacker: a, target: t, raw: this.atk(a) * RULES.roleAttack[this.role(a)] + (o.bonusRaw ?? 0), mult: o.mult ?? 1,
            kind: this.hero(a).damage, crit: false, miss: false, free: !!o.free, bonus: [], buffs: a.nextAttack, nth: 0,
        }
        if (o.cardless) info.cardless = true
        const ac = (this.s.attackCounts ??= {
        })
        ac[a.id] = (ac[a.id] ?? 0) + 1
        info.nth = ac[a.id]
        a.nextAttack = []
        for (const b of info.buffs) {
            if (b.mult) info.mult *= b.mult
            if (b.bonusRaw) info.bonus.push({
                raw: b.bonusRaw, kind: b.bonusKind ?? info.kind
            })
        }
        if (this.statusV(a,
            "blind") > 0) {
            info.miss = true
            const v = this.statusV(a,
                "blind") - 1
            if (v <= 0) this.removeStatus(a,
                "blind"); else a.statuses.blind.v = v
        }
        this.hook("onAttack",
            {
                attacker: a, target: t, info
            })
        if (info.miss) { this.emit({
            t: "attack", attacker: a.id, target: t.id, crit: false, miss: true, free: info.free, cardless: info.cardless
        }); return info }
        if (this.statusV(a,
            "alwaysCrit") > 0 || (st.crit > 0 && this.rand() < Math.min(1,
            st.crit))) info.crit = true
        const critM = info.crit ? RULES.critBase + st.critDmg : 1
        this.emit({
            t: "attack", attacker: a.id, target: t.id, crit: info.crit, miss: false, free: info.free, cardless: info.cardless
        })
        const dealt = this.damage(a,
            t,
            info.raw * info.mult * (1 + st.extraAtk) * critM,
            info.kind,
            {
                tag: "attack", crit: info.crit
            })
        for (const b of info.bonus) this.damage(a,
            t,
            b.raw * critM,
            b.kind,
            {
                tag: "attack", crit: info.crit
            })
        if (info.crit) this.hook("onCrit",
            {
                attacker: a, target: t, info
            })
        this.hook("onAttackHit",
            {
                attacker: a, target: t, info, dealt
            })
        return info
    }

    // ---------------- Bài ----------------
    newCard(c: Omit<Card, "uid">): Card { return {
        ...c, uid: `c${this.s.nextUid++}`
    } }
    cardType(c: Card) { return c.kind === "support" || c.kind === "special" ? c.id : c.kind }
    randomComponent() { return ["kiem_dai",
        "gay_qua_kho",
        "cung_go",
        "gang_tay",
        "giap_luoi",
        "ao_choang",
        "dai_khong_lo",
        "nuoc_mat"][this.randInt(8)] }
    /** Thẻ hỗ trợ `id`; lá Đồ: mảnh `item` chỉ định, hoặc ngẫu nhiên nếu không ghi. Nhận cả mã bộ gốc "item:<mảnh>". */
    supportCard(id: string, item?: string): Card {
        if (id.startsWith("item:")) { item = id.slice(5); id = "item" }
        return this.newCard({
            kind: "support", id, item: id === "item" ? item ?? this.randomComponent() : undefined
        })
    }
    /** Lá chiêu của tướng hero thuộc phe side */
    skillCard(hero: string, side: Side, key: SkillKey): Card { return this.newCard({
        kind: "skill", id: `${hero}_${key.toLowerCase()}`, hero, side
    }) }
    /** Lá chết = lá chiêu của tướng đang chết (hoặc chưa/không trên sân) */
    isDeadCard(c: Card): boolean {
        if (c.kind !== "skill" && !(c.kind === "special" && c.hero)) return false
        const u = this.unit(`${c.side}:${c.hero}`)
        return !u || u.status !== "board"
    }
    /** 9 lá chiêu của một tướng (RULES.skillCopies: 4 Q + 4 E + 1 R). Vào bộ từ đầu trận (engine.newGameEx), không xáo thêm khi gọi tướng. */
    heroCards(hero: string, side: Side): Card[] {
        const out: Card[] = []
        for (const k of ["Q",
            "E",
            "R"] as SkillKey[]) for (let i = 0; i < RULES.skillCopies[k]; i++) out.push(this.skillCard(hero,
            side,
            k))
        return out
    }

    /** Rút 1 lá cho `side`. Trả về lá lên tay (undefined nếu bộ hết, lá tự bật, hoặc tay đầy thì lá vào mộ). */
    drawOne(side: Side, reason = "effect", by?: string): Card | undefined {
        const p = this.player(side)
        const card = p.deck.shift()
        if (!card) return undefined
        const sp = card.kind === "special" ? getSpecialCard(card.id) : undefined
        if (sp?.onDraw) { this.emit({
            t: "drawAuto", side, card
        }); sp.onDraw(this,
            card,
            side); return undefined }
        if (p.hand.length >= RULES.handMax) {
            this.burnOverflow(side,
                card)
            return undefined
        }
        p.hand.push(card)
        this.emit({
            t: "draw", side, card, reason, by
        })
        this.hook("onDraw",
            {
                side, card, reason, by
            })
        return card
    }
    /** Rút n lá (hiệu ứng). Bộ hết thì dừng, không thua (chỉ thua khi rút đầu lượt). */
    draw(side: Side, n: number, o: { reason?: string; by?: string } = {
    }): Card[] {
        const got: Card[] = []
        for (let i = 0; i < n && this.s.phase !== "over"; i++) {
            if (!this.player(side).deck.length) break
            const c = this.drawOne(side,
                o.reason ?? "effect",
                o.by)
            if (c) got.push(c)
        }
        return got
    }
    /** Đưa lá vào mộ (lá đặc biệt/tạm thì biến mất) */
    toGrave(side: Side, card: Card, reason: string) {
        this.emit({
            t: "discard", side, card, reason
        })
        delete card.frozen
        if (card.kind === "special" || card.temp) { /* biến mất */ } else this.player(side).grave.push(card)
        this.hook("onDiscard",
            {
                side, card, reason
            })
    }
    /** Tay đầy: lá thừa bị ĐỐT vào mộ (lá đặc biệt/tạm thì biến mất). Phát cardBurned (không phát discard), hook onDiscard vẫn chạy với reason "overflow". */
    burnOverflow(side: Side, card: Card) {
        this.emit({
            t: "cardBurned", side, card, reason: "handFull"
        })
        delete card.frozen
        if (card.kind !== "special" && !card.temp) this.player(side).grave.push(card)
        this.hook("onDiscard",
            {
                side, card, reason: "overflow"
            })
    }
    /** Lấy lá chiêu `key` của `hero` từ bộ lên tay (thiếu trong bộ thì tạo mới). Tay đầy thì đốt. Phát draw{reason} + hook onDraw. */
    giveSkillToHand(side: Side, hero: string, key: SkillKey, reason: string): Card {
        const p = this.player(side)
        const id = `${hero}_${key.toLowerCase()}`
        const i = p.deck.findIndex((c) => c.kind === "skill" && c.id === id && c.side === side)
        const card = i >= 0 ? p.deck.splice(i,
            1)[0] : this.skillCard(hero,
            side,
            key)
        if (i < 0) this.emit({
            t: "create", side, card, zone: "hand"
        })
        if (p.hand.length >= RULES.handMax) {
            this.burnOverflow(side,
                card)
            return card
        }
        p.hand.push(card)
        this.emit({
            t: "draw", side, card, reason, by: `${side}:${hero}`
        })
        this.hook("onDraw",
            {
                side, card, reason, by: `${side}:${hero}`
            })
        return card
    }
    /** Gỡ mọi lá tạm khỏi tay `side` (cuối lượt của người cầm): phát tempExpired + hook onTempExpired, không vào mộ */
    expireTemps(side: Side) {
        const p = this.player(side)
        const gone = p.hand.filter((c) => c.temp)
        if (!gone.length) return
        p.hand = p.hand.filter((c) => !c.temp)
        for (const card of gone) {
            this.emit({
                t: "tempExpired", side, card
            })
            this.hook("onTempExpired",
                {
                    side, card
                })
        }
    }
    /** Bỏ 1 lá trên tay vào mộ */
    discard(side: Side, uid: string, reason = "effect"): Card | undefined {
        const p = this.player(side)
        const i = p.hand.findIndex((c) => c.uid === uid)
        if (i < 0) return undefined
        const [card] = p.hand.splice(i,
            1)
        this.toGrave(side,
            card,
            reason)
        return card
    }
    /** Đốt n lá trên cùng bộ bài của side vào mộ */
    burn(side: Side, n: number): Card[] {
        const out: Card[] = []
        for (let i = 0; i < n; i++) {
            const c = this.player(side).deck.shift()
            if (!c) break
            this.emit({
                t: "burn", side, card: c
            })
            if (c.kind !== "special" && !c.temp) this.player(side).grave.push(c)
            out.push(c)
            this.hook("onBurn",
                {
                    side, card: c
                })
        }
        return out
    }
    /** Xáo các lá vào bộ bài của side */
    shuffleIn(side: Side, cards: Card[]) {
        const p = this.player(side)
        for (const c of cards) this.emit({
            t: "create", side, card: c, zone: "deck"
        })
        p.deck.push(...cards)
        this.shuffle(p.deck)
        this.emit({
            t: "shuffle", side, what: "deck", count: cards.length
        })
    }
    /** Xáo toàn bộ mộ bài vào lại bộ bài (Soraka R) */
    shuffleGraveIntoDeck(side: Side): number {
        const p = this.player(side)
        const n = p.grave.length
        p.deck.push(...p.grave); p.grave = []
        this.shuffle(p.deck)
        this.emit({
            t: "shuffle", side, what: "graveIntoDeck", count: n
        })
        return n
    }
    /** Tạo lá mới vào tay / mộ / bộ. Tay đầy thì vào mộ. */
    createCard(side: Side, c: Omit<Card, "uid">, zone: "hand" | "deck" | "grave" = "hand"): Card {
        const card = this.newCard(c)
        this.giveCard(side,
            card,
            zone)
        return card
    }
    giveCard(side: Side, card: Card, zone: "hand" | "deck" | "grave" = "hand") {
        const p = this.player(side)
        if (zone === "hand") {
            if (p.hand.length >= RULES.handMax) { this.burnOverflow(side,
                card); return }
            p.hand.push(card)
        } else if (zone === "grave") { if (card.kind !== "special") p.grave.push(card) }
        else { p.deck.push(card); this.shuffle(p.deck) }
        this.emit({
            t: "create", side, card, zone
        })
    }
    /** Tìm 1 lá trong bộ bài (lục bộ) lên tay rồi xáo bộ */
    tutor(side: Side, pred: (c: Card) => boolean): Card | undefined {
        const p = this.player(side)
        const i = p.deck.findIndex(pred)
        if (i < 0) return undefined
        const [card] = p.deck.splice(i,
            1)
        this.shuffle(p.deck)
        this.emit({
            t: "shuffle", side, what: "deck", count: 0
        })
        this.giveCard(side,
            card,
            "hand")
        this.emit({
            t: "draw", side, card, reason: "tutor"
        })
        return card
    }
    /** Lấy ngẫu nhiên 1 lá trên tay `from` ra khỏi tay (cướp). Người gọi tự đưa lá đi đâu bằng giveCard. */
    stealRandom(from: Side, pred: (c: Card) => boolean = () => true): Card | undefined {
        const p = this.player(from)
        const idx = p.hand.map((c, i) => (pred(c) ? i : -1)).filter((i) => i >= 0)
        if (!idx.length) return undefined
        const [card] = p.hand.splice(idx[this.randInt(idx.length)],
            1)
        return card
    }
    /** Cướp 1 lá trên tay `from` về tay `to` (ngẫu nhiên, hoặc đích danh o.uid: Blitz Q khi tay địch đang lộ).
   *  Lá chiêu (hoặc Bóng) của đối thủ: mặc định (o.skill = "basic") thành 1 lá Đánh thường của người cướp; "burn" = lá bị đốt vào mộ chủ, người cướp không nhận gì.
   *  Lá chung thì về tay người cướp. Luôn bắn hook onSteal (card = lá gốc). Trả về lá gốc đã bị cướp hoặc undefined nếu không có. */
    stealCard(to: Side, from: Side, o: { uid?: string; skill?: "basic" | "burn" } = {
    }): Card | undefined {
        const card = o.uid ? this.stealByUid(from,
            o.uid) : this.stealRandom(from)
        if (!card) return undefined
        this.takeStolen(to,
            from,
            card,
            o.skill ?? "basic")
        return card
    }
    /** Lấy đích danh lá uid khỏi tay `from` (không đưa đi đâu; người gọi tự xử lý). */
    stealByUid(from: Side, uid: string): Card | undefined {
        const p = this.player(from)
        const i = p.hand.findIndex((c) => c.uid === uid)
        return i < 0 ? undefined : p.hand.splice(i,
            1)[0]
    }
    private takeStolen(to: Side, from: Side, card: Card, skill: "basic" | "burn") {
        delete card.frozen
        this.emit({
            t: "steal", from, to, card
        })
        const isSkill = card.kind === "skill" || !!card.copyOf || card.kind === "wild"
        if (isSkill && skill === "burn") {
            if (!card.temp && card.kind !== "special") this.player(card.side ?? from).grave.push(card)
        } else {
            const gained = isSkill ? {
                ...this.supportCard("basic"), ...(card.temp ? {
                    temp: true
                } : {
                })
            } : card
            this.giveCard(to,
                gained,
                "hand")
        }
        this.hook("onSteal",
            {
                side: to, from, card
            })
    }
    /** Giật lá đang nằm trong Chuỗi (lá bị huỷ bằng g.chainFx().cancel + stealBy): xử lý như lá bị cướp từ tay `from`. Engine tự gọi; hero chỉ cần đặt fx.stealBy. */
    stealFromChain(by: Side, from: Side, card: Card, skill: "basic" | "burn" = "burn") {
        this.takeStolen(by,
            from,
            card,
            skill)
    }

    // ---------------- Hoá Băng lá trên tay (Lissandra) ----------------
    /** Lá đang Hoá Băng trên tay `side` (by: chỉ của tướng đó) */
    frozenCards(side: Side, by?: string): Card[] { return this.player(side).hand.filter((c) => c.frozen && (!by || c.frozen === by)) }
    /** Hoá Băng lá `card` trên tay `side`: không đánh/ghép/nối chuỗi được (vẫn bỏ/đốt/cướp được). Phát cardFrozen. */
    freezeCard(side: Side, card: Card, by: string) {
        if (card.frozen || !this.player(side).hand.some((c) => c.uid === card.uid)) return
        card.frozen = by
        this.emit({
            t: "cardFrozen", side, card, by
        })
    }
    /** Hoá Băng n lá ngẫu nhiên chưa băng trên tay `side` (loại pred). Trả các lá đã băng. */
    freezeRandom(side: Side, n: number, by: string, pred: (c: Card) => boolean = () => true): Card[] {
        const pool = this.player(side).hand.filter((c) => !c.frozen && pred(c))
        const out: Card[] = []
        while (out.length < n && pool.length) {
            const c = pool.splice(this.randInt(pool.length),
                1)[0]
            this.freezeCard(side,
                c,
                by)
            out.push(c)
        }
        return out
    }
    /** Tan băng mọi lá băng trên tay `side` (by: chỉ băng của tướng đó). Engine tự gọi khi tướng đóng băng chết. Trả số lá tan. */
    thawCards(side: Side, by?: string): number {
        let n = 0
        for (const c of this.player(side).hand) if (c.frozen && (!by || c.frozen === by)) {
            delete c.frozen
            n++
            this.emit({
                t: "cardThawed", side, card: c
            })
        }
        return n
    }

    // ---------------- Lộ tay ----------------
    /** Tay của `side` lộ cho đối thủ tới hết lượt hiện tại (hoặc tới hết turnNo `until`). Phát reveal + lưu vào state.handReveal. */
    revealHand(side: Side, until = this.s.turnNo) {
        (this.s.handReveal ??= {
        })[side] = until
        this.emit({
            t: "reveal", side, to: otherSide(side), cards: [...this.player(side).hand]
        })
    }
    handRevealed(side: Side): boolean { return (this.s.handReveal?.[side] ?? -1) >= this.s.turnNo }
    /** Engine gọi cuối lượt: gỡ lộ tay đã hết hạn */
    expireReveals() {
        for (const sd of SIDES) {
            const u = this.s.handReveal?.[sd]
            if (u !== undefined && u <= this.s.turnNo) {
                delete this.s.handReveal![sd]
                this.emit({
                    t: "revealEnd", side: sd
                })
            }
        }
    }

    // ---------------- Bộ bài / mộ ----------------
    /** Các lá trong bộ bài `side` thoả pred (mặc định mọi lá), theo thứ tự từ trên xuống. Chỉ đọc (server không gửi bộ cho đối thủ nhưng engine thì thấy). */
    deckCards(side: Side, pred: (c: Card) => boolean = () => true): Card[] { return this.player(side).deck.filter(pred) }
    /** n lá trên cùng bộ bài (xem, chưa lấy) */
    peekDeck(side: Side, n: number): Card[] { return this.player(side).deck.slice(0,
        n) }
    /** Lấy lá uid ra khỏi bộ bài (không xáo, không đưa đi đâu) */
    takeFromDeck(side: Side, uid: string): Card | undefined {
        const d = this.player(side).deck
        const i = d.findIndex((c) => c.uid === uid)
        return i < 0 ? undefined : d.splice(i,
            1)[0]
    }
    /** Đặt lá xuống đáy bộ bài (Twisted Fate Q: lá còn lại xuống đáy; đẩy Nấm xuống đáy) */
    putOnBottom(side: Side, card: Card) { this.player(side).deck.push(card) }
    /** Dời mọi lá thoả pred lên ĐỈNH bộ bài `side` (giữ thứ tự tương đối): Teemo R dồn Nấm lên đỉnh bộ địch. Trả số lá dời. Không phát sự kiện. */
    moveToTop(side: Side, pred: (c: Card) => boolean): number {
        const p = this.player(side)
        const hit = p.deck.filter(pred)
        if (hit.length) p.deck = [...hit,
            ...p.deck.filter((c) => !pred(c))]
        return hit.length
    }
    /** Dời mọi lá thoả pred xuống ĐÁY bộ bài `side` (giữ thứ tự tương đối). Trả số lá dời. */
    moveToBottom(side: Side, pred: (c: Card) => boolean): number {
        const p = this.player(side)
        const hit = p.deck.filter(pred)
        if (hit.length) p.deck = [...p.deck.filter((c) => !pred(c)),
            ...hit]
        return hit.length
    }
    /** Lá trong mộ `side` thoả pred, từ cũ tới mới */
    graveCards(side: Side, pred: (c: Card) => boolean = () => true): Card[] { return this.player(side).grave.filter(pred) }
    /** Lấy lá uid từ mộ về tay (Yorick E, Katarina): phát returnToHand; tay đầy thì đốt. Trả lá hoặc undefined nếu không có trong mộ. */
    fromGrave(side: Side, uid: string): Card | undefined {
        const gr = this.player(side).grave
        const i = gr.findIndex((c) => c.uid === uid)
        if (i < 0) return undefined
        const [card] = gr.splice(i,
            1)
        this.emit({
            t: "returnToHand", side, card
        })
        this.giveCard(side,
            card,
            "hand")
        return card
    }
    /** Số lá rút đầu lượt của side: RULES.drawPerTurn + Σ HeroDef.drawBonus của tướng side đang trên sân */
    drawCount(side: Side): number {
        let n = RULES.drawPerTurn
        for (const u of this.heroes(side)) n += getHero(u.hero)?.drawBonus?.(this,
            u) ?? 0
        return Math.max(0,
            n)
    }

    // ---------------- Trợ giúp tướng ----------------
    /** Các tướng SỐNG ở đường kề (trái/phải) của u cùng phe; tướng chết/đường trống không tính */
    neighbors(u: Unit): Unit[] {
        if (u.token || u.lane < 0 || u.lane > 4) return []
        return [u.lane - 1,
            u.lane + 1].filter((l) => l >= 0 && l <= 4).map((l) => this.at(u.side,
            l)).filter((x): x is Unit => !!x && !x.token)
    }
    /** Cô Lập (Kha'Zix): tướng sống không có đồng minh sống nào ở đường kề, hoặc đang có trạng thái "isolated" (Kha'Zix E/R gắn) */
    isolated(u: Unit): boolean {
        return u.status === "board" && !u.token && (this.has(u,
            "isolated") || this.neighbors(u).length === 0)
    }
    /** Trả máu (không phải sát thương): trừ `n` máu, còn tối thiểu `min` (mặc định 1 = không tự giết). Phát damage kind "true" tag "effect" không nguồn, KHÔNG bắn hook onDamage. Trả lượng đã trừ. */
    payHp(u: Unit, n: number, min = 1): number {
        if (u.status !== "board") return 0
        const lost = Math.max(0,
            Math.min(Math.round(n),
                u.hp - min))
        if (!lost) return 0
        u.hp -= lost
        this.emit({
            t: "damage", target: u.id, amount: lost, hpLost: lost, absorbed: 0, kind: "true", tag: "effect", hp: u.hp
        })
        return lost
    }
    /** true đúng 1 lần trong mỗi lượt (turnNo) cho cặp (u, key); lần sau cùng lượt trả false. Không phát sự kiện. Qiyana: key = `first:${mụcTiêu.id}`. */
    oncePerTurn(u: Unit, key: string): boolean {
        const k = `once:${key}`
        if (u.stacks[k] === this.s.turnNo) return false
        u.stacks[k] = this.s.turnNo
        return true
    }
    /** Đặt phần máu tối đa cộng thêm "kiểu aura" của nguồn `key` lên u (Yorick theo mộ): maxHp đổi đúng chênh lệch so với lần trước; hp tăng cùng chiều, giảm thì kẹp về maxHp. */
    setAuraMaxHp(u: Unit, key: string, value: number) {
        const k = `aura:${key}`
        const cur = u.stacks[k] ?? 0
        const d = Math.round(value) - cur
        if (!d) return
        u.stacks[k] = Math.round(value)
        u.maxHp += d
        if (u.status === "board" && d > 0) u.hp += d
        u.hp = Math.min(u.hp,
            u.maxHp)
    }
    /** Chuyển sát thương chí mạng sang người khác (Soraka nội tại): trong hook onLethal, trả lại máu đã mất cho d.target rồi `to` nhận hpLost + over (cùng loại sát thương, tag "effect"). Trả true nếu chuyển được (to còn sống, khác mục tiêu). */
    redirectLethal(d: HookData["onLethal"], to: Unit): boolean {
        if (to.status !== "board" || to.id === d.target.id || d.target.hp > 0) return false
        d.target.hp += d.hpLost
        this.damage(d.src,
            to,
            d.hpLost + d.over,
            d.kind,
            {
                tag: "effect"
            })
        return true
    }

    /** Lá chiêu gần nhất vừa vào mộ thoả pred */
    lastGrave(side: Side, pred: (c: Card) => boolean): Card | undefined {
        const g = this.player(side).grave
        for (let i = g.length - 1; i >= 0; i--) if (pred(g[i])) return g[i]
        return undefined
    }

    // ---------------- Gọi tướng ----------------
    /** Gọi tướng từ dự bị ra sân: đặt vào đường. Lá chiêu đã nằm sẵn trong bộ từ đầu trận (không xáo thêm). */
    summon(side: Side, hero: string, lane: number) {
        const u = this.s.units[`${side}:${hero}`]
        const lanes = this.s.lanes[side]
        let swapped: string | undefined
        const occ = this.unit(lanes[lane] ?? undefined)
        if (occ) {
            const free = this.emptyLanes(side)[0]
            if (free === undefined) throw new Error("Không còn đường trống để đổi chỗ")
            lanes[free] = occ.id; occ.lane = free; swapped = occ.id
        }
        lanes[lane] = u.id; u.lane = lane; u.homeLane = lane; u.status = "board"
        u.hp = u.maxHp
        this.emit({
            t: "summon", unit: u.id, lane, swapped
        })
        if (this.isMage(u)) {
            u.mana = this.startMana(u)
            this.emit({
                t: "manaChange", unit: u.id, mana: u.mana, max: this.maxMana(u), delta: u.mana, reason: "summon"
            })
        }
        // đặc quyền Trợ thủ: được gọi ra sân lần đầu thì chủ lấy Q và E của nó từ bộ lên tay (hồi sinh không tính)
        if (this.role(u) === "support") for (const k of RULES.supportSummonKeys) this.giveSkillToHand(side,
            hero,
            k,
            "support")
        this.hook("onSummon",
            {
                unit: u
            })
    }
    /** Hồi sinh các tướng đã hết 3 vòng (đầu lượt của chủ) ngay TẠI đường cũ (đường được giữ cho nó) */
    respawnDue(side: Side) {
        for (const u of Object.values(this.s.units)) {
            if (u.side !== side || u.status !== "dead" || u.respawnRound > this.s.round) continue
            const lane = u.homeLane
            const holder = this.s.lanes[side][lane]
            if (lane < 0 || (holder && holder !== u.id)) continue
            this.s.lanes[side][lane] = u.id; u.lane = lane; u.status = "board"; u.hp = u.maxHp; u.shield = 0
            this.emit({
                t: "respawn", unit: u.id, lane
            })
            if (this.isMage(u)) {
                u.mana = this.startMana(u)
                this.emit({
                    t: "manaChange", unit: u.id, mana: u.mana, max: this.maxMana(u), delta: u.mana, reason: "respawn"
                })
            }
            this.hook("onRespawn",
                {
                    unit: u
                })
        }
    }

    // ---------------- Mana (pháp sư) ----------------
    isMage(u: Unit): boolean { return !u.token && this.role(u) === "mage" }
    /** Mana tối đa: HeroDef.mana.max (mặc định RULES.mage.manaMax) + đồ */
    maxMana(u: Unit): number {
        if (!this.isMage(u)) return 0
        let m = this.hero(u).mana?.max ?? RULES.mage.manaMax
        for (const id of distinctItems(u)) m += CARD_ITEMS[id]?.maxMana ?? 0
        return m
    }
    startMana(u: Unit): number { return Math.min(this.maxMana(u),
        this.hero(u).mana?.start ?? RULES.mage.manaStart) }
    /** Hồi mana mỗi đầu lượt: HeroDef.mana.regen (mặc định RULES.mage.manaRegen) + đồ */
    manaRegen(u: Unit): number {
        if (!this.isMage(u)) return 0
        let m = this.hero(u).mana?.regen ?? RULES.mage.manaRegen
        for (const id of distinctItems(u)) m += CARD_ITEMS[id]?.manaRegen ?? 0
        return m
    }
    manaOf(u: Unit): number { return u.mana ?? 0 }
    /** Cộng/trừ mana, kẹp trong [0, max]; phát manaChange nếu đổi. Trả về lượng thật sự đổi. Không làm gì với tướng không phải pháp sư. */
    gainMana(u: Unit, n: number, reason: "summon" | "respawn" | "turn" | "spend" | "restore" | "effect" = "effect"): number {
        if (!this.isMage(u)) return 0
        const cur = this.manaOf(u), max = this.maxMana(u)
        const next = Math.max(0,
            Math.min(max,
                cur + n))
        u.mana = next
        if (next !== cur) this.emit({
            t: "manaChange", unit: u.id, mana: next, max, delta: next - cur, reason
        })
        return next - cur
    }
    /** Trả mana để tung lá. Thiếu mana thì không làm gì và trả false. */
    spendMana(u: Unit, n: number, card: Card): boolean {
        if (n <= 0) return true
        if (this.manaOf(u) < n) return false
        u.mana = this.manaOf(u) - n
        this.emit({
            t: "manaChange", unit: u.id, mana: u.mana, max: this.maxMana(u), delta: -n, reason: "spend"
        })
        this.hook("onManaSpent",
            {
                unit: u, amount: n, card
            })
        return true
    }
    /** Chi phí mana để tung chiêu `def` bằng lá `card`: SkillDef.mana (số/hàm) hoặc RULES.mage.defaultCost, cộng manaCostMod của đồ, tối thiểu 0. 0 với tướng không phải pháp sư. */
    manaCost(u: Unit, def: SkillDef, card: Card): number {
        if (!this.isMage(u)) return 0
        if (def.mana === "all") return this.manaOf(u) // Lux R: tiêu toàn bộ mana
        let c = typeof def.mana === "function" ? def.mana({
            g: this, side: u.side, self: u, card
        }) : def.mana ?? RULES.mage.defaultCost[def.key]
        for (const id of distinctItems(u)) c += CARD_ITEMS[id]?.manaCostMod?.(this,
            u,
            def,
            card) ?? 0
        return Math.max(0,
            Math.round(c))
    }

    // ---------------- Trợ giúp thêm (đồ & tướng) ----------------
    /** Số lá trong bộ bài `side` thoả pred (Teemo E/R đếm Nấm trong bộ địch) */
    countInDeck(side: Side, pred: (c: Card) => boolean = () => true): number { return this.player(side).deck.filter(pred).length }
    /** Số đòn đánh u đã ra trong lượt hiện tại */
    attacksMadeBy(u: Unit): number { return this.s.attackCounts?.[u.id] ?? 0 }
    /** Đang là lượt của đối thủ u (u hành động bằng Quick): g.s.active !== u.side */
    isOffTurn(u: Unit): boolean { return this.s.active !== u.side }
    /** Hệ số hồi máu/Khiên BAN RA của u (CardItemDef.healGivenMult); heroes cho Giáp cũng nhân hệ số này */
    givenMult(u: Unit): number {
        let m = 1
        for (const id of distinctItems(u)) m *= CARD_ITEMS[id]?.healGivenMult ?? 1
        return m
    }
    /** Hạ gục ngay (Kẻ Thu Thập: dưới 15% máu tối đa). Giống g.kill nhưng tên rõ nghĩa; phát log. */
    execute(killer: Unit | undefined, victim: Unit) {
        if (victim.status !== "board") return
        victim.hp = 0
        this.kill(victim,
            killer)
    }
    /** Giữ tướng sống ngay tại chỗ với `hp` máu (trong hook onLethal): không mất mạng, không rời đường. Xoá Khiên/khống chế xấu nếu clear. */
    surviveWith(u: Unit, hp: number) {
        u.hp = Math.max(1,
            Math.min(u.maxHp,
                Math.round(hp)))
        this.emit({
            t: "heal", src: u.id, target: u.id, amount: u.hp, hp: u.hp
        })
    }
    /** Ghép tại chỗ: thay mảnh `from` trong ô của u bằng món `to` (máu tối đa đổi theo chênh lệch máu từ đồ). Phát upgrade + hook onEquip. Trả false nếu u không mang `from`. */
    upgradeItem(u: Unit, from: string, to: string): boolean {
        const i = u.items.indexOf(from)
        if (i < 0 || u.token) return false
        const before = this.stats(u).hp
        u.items[i] = to
        const dh = this.stats(u).hp - before
        u.maxHp += dh
        if (u.status === "board") u.hp = Math.max(1,
            u.hp + dh)
        u.hp = Math.min(u.hp,
            u.maxHp)
        this.emit({
            t: "upgrade", side: u.side, unit: u.id, from, item: to
        })
        this.hook("onEquip",
            {
                side: u.side, unit: u, item: to
            })
        return true
    }

    // ---------------- Giới hạn đòn đánh ----------------
    /** Bộ đếm đòn của `side` trong lượt hiện tại (mặc định phe đang có lượt). Khởi tạo lười để state dựng tay vẫn chạy. */
    turnAttacks(side: Side = this.s.active): TurnAttacks {
        if (side === this.s.active) return (this.s.turnAttacks ??= {
            used: 0, cardless: []
        })
        return (this.s.offTurnAttacks ??= {
            used: 0, cardless: []
        })
    }
    /** Giới hạn CỨNG: RULES.attackLimit đòn mỗi người mỗi lượt (không có cách tăng) */
    attackLimit(_side?: Side): number { return RULES.attackLimit }
    attacksLeft(side: Side): number { return Math.max(0,
        this.attackLimit(side) - this.turnAttacks(side).used) }
    /** Tính 1 đòn vào giới hạn (lá Đánh thường, đòn không cần lá, đòn miễn phí do buff). g.attack gọi trong chiêu/hook KHÔNG tính. */
    countAttack(side: Side) {
        const ta = this.turnAttacks(side)
        ta.used++
        this.emit({
            t: "attackCount", side, used: ta.used, limit: this.attackLimit(side)
        })
    }
    /** Đấu sĩ (tướng, không phải token) dùng được đòn không cần lá: còn sống/không Choáng, chưa dùng, không có buff đòn miễn phí, còn đòn trong giới hạn */
    canCardless(u: Unit): boolean {
        return !u.token && this.role(u) === "fighter" && this.canAttack(u) && this.s.phase !== "over"
            && !this.turnAttacks(u.side).cardless.includes(u.id) && !u.nextAttack.some((b) => b.free) && this.attacksLeft(u.side) > 0
    }
    /** Cho Đấu sĩ đánh không cần lá thêm 1 lần trong lượt này */
    allowCardless(u: Unit) {
        const ta = this.turnAttacks(u.side)
        ta.cardless = ta.cardless.filter((id) => id !== u.id)
    }
    /** Cho u một đòn đánh miễn phí (không cần lá; vẫn tính vào giới hạn 3 khi đánh) */
    grantFreeAttack(u: Unit, buff: Partial<NextAttackBuff> = {
    }) {
        u.nextAttack.push({
            id: buff.id ?? "free", source: buff.source ?? u.id, ...buff, free: true
        })
    }

    // ---------------- Hook ----------------
    /** Gọi hook `name` của mọi tướng đang trên sân (và tướng vừa chết với onDeath). Tướng tự lọc theo dữ liệu. */
    hook<K extends HookName>(name: K, data: HookData[K]) {
        if (this.hookDepth > 40) return
        this.hookDepth++
        try {
            const victim = (data as { victim?: Unit }).victim
            for (const u of Object.values(this.s.units)) {
                if (name === "onTurnStartAway") { if (u.status === "board" || u.token) continue } else if (u.status !== "board" && !(name === "onDeath" && victim === u)) continue
                const h = getHero(u.hero)?.hooks?.[name] as ((g: Game, me: Unit, d: HookData[K]) => void) | undefined
                // hook của tướng khác người đang ra đòn = nội tại của tướng đó: trạng thái nó gây ghi nguồn là nội tại, không phải lá đang đánh
                if (h) {
                    this.withSource(u,
                        `${u.hero}_p`,
                        () => h(this,
                            u,
                            data))
                }
                if (u.items.length) for (const id of distinctItems(u)) { // nội tại đồ: mỗi id khác nhau 1 lần
                    const ih = CARD_ITEMS[id]?.hooks?.[name] as ((g: Game, me: Unit, d: HookData[K]) => void) | undefined
                    if (ih) {
                        this.withSource(u,
                            `item:${id}`,
                            () => ih(this,
                                u,
                                data))
                    }
                }
            }
        } finally { this.hookDepth-- }
    }

    /**
     * Chạy hook với nguồn trạng thái là `card` của `u` (nội tại tướng / nội tại đồ). Chỉ đổi nguồn ghi lên trạng thái,
     * không đổi `cur` (hook còn đọc cur.card). Ngoại lệ: hook tướng chạy trong chính chiêu của tướng đó thì giữ chiêu.
     */
    private withSource(u: Unit, card: string, fn: () => void) {
        const ownSkill = this.cur.src === u.id && !!this.cur.card?.startsWith(`${u.hero}_`) && !card.startsWith("item:")
        if (ownSkill) {
            fn()
            return
        }
        const prev = this.srcOverride
        this.srcOverride = {
            src: u.id, card
        }
        try { fn() } finally { this.srcOverride = prev }
    }

    sides() { return SIDES }
    /** Trợ giúp: chuẩn hoá khoá của PlayArgs để so sánh */
    static argsKey(a: PlayArgs | undefined): string {
        const x = a ?? {
        }
        return JSON.stringify([x.actor ?? null,
            x.target ?? null,
            x.targets ? [...x.targets].sort() : null,
            x.lane ?? null,
            x.color ?? null,
            x.discard ?? null,
            x.pick ?? null])
    }
}
