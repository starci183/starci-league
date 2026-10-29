// Game: bộ công cụ nguyên thủy trên một GameState có thể đổi (engine clone state trước khi tạo Game).
// Mọi hàm đổi state đều phát sự kiện vào `events`. Tướng viết chiêu/hook bằng các hàm này.
import {
    baseStats, getItem
} from "../items"
import {
    evalExpr
} from "./formula"
import {
    getHero, getSpecialCard
} from "./registry"
import {
    EXTRA_LANE, RULES, SIDES, otherSide,
    type AttackInfo, type Card, type DamageKind, type GameEvent, type GameState, type HeroDef, type HookData, type HookName,
    type PlayArgs, type Role, type Side, type SkillKey, type TokenDef, type Unit,
} from "./types"

export interface UnitStats {
  atk: number; ap: number; hp: number; armor: number; mr: number; crit: number; critDmg: number; atkMult: number;
  lethality: number; magicPen: number; spellAmp: number; dmgAmp: number; lifesteal: number; omnivamp: number; extraAtk: number;
}
const ZERO: UnitStats = {
    atk: 0, ap: 0, hp: 0, armor: 0, mr: 0, crit: 0, critDmg: 0, atkMult: 0, lethality: 0, magicPen: 0, spellAmp: 0, dmgAmp: 0, lifesteal: 0, omnivamp: 0, extraAtk: 0
}

export class Game {
    events: GameEvent[] = []
    private hookDepth = 0
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
    at(side: Side, lane: number): Unit | undefined { return this.unit(this.s.lanes[side][lane] ?? undefined) }
    opposite(u: Unit): Unit | undefined { const o = this.at(otherSide(u.side),
        u.lane); return o && o.status === "board" ? o : undefined }
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
        for (const id of u.items) {
            const it = getItem(id)
            if (!it) continue
            const b = baseStats(it) as unknown as Record<string, number>
            for (const k of Object.keys(ZERO) as (keyof UnitStats)[]) out[k] += b[k] ?? 0
            out.ap += (b.manaRegen ?? 0) * RULES.manaRegenToAp
        }
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
    status(u: Unit, id: string, turns: number, o: { v?: number; add?: boolean; max?: number; of?: Side; until?: number } = {
    }) {
        if (u.status !== "board") return
        const fx = this.s.fx
        if (fx?.cutNoCc && u.side === fx.cutSide && ["stun",
            "silence",
            "chill",
            "shred",
            "blind"].includes(id)) return // Braum E trên chiêu cuối: miễn khống chế
        const until = o.until ?? this.turnsUntil(o.of ?? u.side,
            turns)
        const cur = u.statuses[id]
        let v = o.v ?? 1
        if (cur && o.add) v = Math.min(o.max ?? Infinity,
            cur.v + v)
        u.statuses[id] = {
            until: cur ? Math.max(cur.until,
                until) : until, v
        }
        this.emit({
            t: "status", target: u.id, id, turns, v
        })
    }
    removeStatus(u: Unit, id: string) { if (u.statuses[id]) { delete u.statuses[id]; this.emit({
        t: "statusEnd", target: u.id, id
    }) } }
    /** Bộ đếm riêng (không hết hạn) */
    stack(u: Unit, key: string, delta: number, max = Infinity) { return this.setStack(u,
        key,
        Math.min(max,
            (u.stacks[key] ?? 0) + delta)) }
    setStack(u: Unit, key: string, value: number) { u.stacks[key] = value; this.emit({
        t: "stack", unit: u.id, key, value
    }); return value }
    stackOf(u: Unit, key: string) { return u.stacks[key] ?? 0 }
    canAct(u: Unit) { return u.status === "board" && !this.has(u,
        "stun") }
    /** Có lá chiêu dùng được không (Choáng/Câm Lặng chặn) */
    canCast(u: Unit) { return this.canAct(u) && !this.has(u,
        "silence") }

    // ---------------- Sát thương, hồi, khiên, chết ----------------
    /** Gây sát thương. `raw` là con số trước giáp. Trả về tổng đã gây (khiên + máu). */
    damage(src: Unit | undefined, tgt: Unit, raw: number, kind: DamageKind, o: { tag?: "attack" | "skill" | "dot" | "effect"; crit?: boolean } = {
    }): number {
        if (tgt.status !== "board" || this.s.phase === "over") return 0
        const tag = o.tag ?? "effect"
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
        if (src) {
            const st = this.stats(src)
            m *= 1 + st.dmgAmp
            if (tag === "skill") {
                m *= 1 + st.spellAmp
                if (this.role(src) === "mage") m *= 1 + RULES.mageSkillBonus
            }
            if (tag !== "dot" && this.has(src,
                "empower")) m *= 1 + RULES.buffCard.dmg
        }
        if (this.has(tgt,
            "chill")) m *= 1 + RULES.chillBonus
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
            t: "damage", src: src?.id, target: tgt.id, amount, hpLost, absorbed, kind, tag, crit: o.crit, hp: tgt.hp
        })
        if (src) this.s.stats[src.side].damage += hpLost + absorbed
        if (absorbed > 0 && tgt.shield === 0) this.hook("onShieldBreak",
            {
                target: tgt
            })
        this.hook("onDamage",
            {
                src, target: tgt, amount, hpLost, kind, tag, crit: o.crit
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
        if (tgt.hp <= 0 && tgt.status === "board") this.kill(tgt,
            src)
        return absorbed + hpLost
    }
    heal(src: Unit | undefined, tgt: Unit, amount: number): number {
        if (tgt.status !== "board" || amount <= 0) return 0
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
        if (tgt.status !== "board" || amount <= 0) return
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
        if (killer) this.s.stats[killer.side].kills++
        this.s.lanes[victim.side][victim.lane] = null
        victim.homeLane = victim.lane
        victim.lane = -1
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
    removeToken(tok: Unit, reason: "dead" | "owner" | "replaced") {
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
            },
        }
        this.s.units[id] = u
        this.s.extra[side] = id
        this.emit({
            t: "summonToken", side, unit: id, name: def.name, owner: def.ownerId
        })
        return u
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
        if (p.hand.length >= RULES.handMax) this.toGrave(side,
            card,
            "overflow")
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
        lanes[old] = occ?.id ?? null
        if (occ) occ.lane = old
        lanes[lane] = u.id; u.lane = lane
        this.emit({
            t: "move", unit: u.id, from: old, to: lane, with: occ?.id
        })
    }

    // ---------------- Đòn đánh ----------------
    /** Đòn đánh thường của a lên t (theo luật vai). Tự áp buff đòn kế tiếp, trượt (blind), chí mạng, hook. */
    attack(a: Unit, t: Unit, o: { mult?: number; bonusRaw?: number; free?: boolean } = {
    }): AttackInfo | undefined {
        if (a.status !== "board" || t.status !== "board" || this.s.phase === "over") return undefined
        const st = this.stats(a)
        const info: AttackInfo = {
            attacker: a, target: t, raw: this.atk(a) * RULES.roleAttack[this.role(a)] + (o.bonusRaw ?? 0), mult: o.mult ?? 1,
            kind: this.hero(a).damage, crit: false, miss: false, free: !!o.free, bonus: [], buffs: a.nextAttack,
        }
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
            t: "attack", attacker: a.id, target: t.id, crit: false, miss: true, free: info.free
        }); return info }
        if (st.crit > 0 && this.rand() < Math.min(1,
            st.crit)) info.crit = true
        const critM = info.crit ? RULES.critBase + st.critDmg : 1
        this.emit({
            t: "attack", attacker: a.id, target: t.id, crit: info.crit, miss: false, free: info.free
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
    supportCard(id: string): Card { return this.newCard({
        kind: "support", id, item: id === "item" ? this.randomComponent() : undefined
    }) }
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
    /** 34 lá khi một tướng ra sân */
    heroCards(hero: string, side: Side): Card[] {
        const out: Card[] = []
        for (const k of ["Q",
            "E",
            "R"] as SkillKey[]) for (let i = 0; i < RULES.skillCopies[k]; i++) out.push(this.skillCard(hero,
            side,
            k))
        for (const [id,
            n] of Object.entries(RULES.heroSupport)) for (let i = 0; i < n; i++) out.push(this.supportCard(id))
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
            this.toGrave(side,
                card,
                "overflow")
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
        if (card.kind === "special" || card.temp) { /* biến mất */ } else this.player(side).grave.push(card)
        this.hook("onDiscard",
            {
                side, card, reason
            })
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
            if (p.hand.length >= RULES.handMax) { this.toGrave(side,
                card,
                "overflow"); return }
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
    /** Cướp 1 lá ngẫu nhiên trên tay `from` về tay `to`. Lá chiêu (hoặc Bóng) của đối thủ thành thẻ chiêu chung cùng chữ Q/E/R.
   *  Trả về lá gốc đã bị cướp (để xét chủ gốc) hoặc undefined nếu tay trống. */
    stealCard(to: Side, from: Side): Card | undefined {
        const card = this.stealRandom(from)
        if (!card) return undefined
        this.emit({
            t: "steal", from, to, card
        })
        const gained = card.kind === "skill" || card.copyOf ? this.newCard({
            kind: "wild", id: `wild_${(card.copyOf ?? card.id).slice(-1)}`
        }) : card
        this.giveCard(to,
            gained,
            "hand")
        this.hook("onSteal",
            {
                side: to, from, card
            })
        return card
    }
    /** Lá chiêu gần nhất vừa vào mộ thoả pred */
    lastGrave(side: Side, pred: (c: Card) => boolean): Card | undefined {
        const g = this.player(side).grave
        for (let i = g.length - 1; i >= 0; i--) if (pred(g[i])) return g[i]
        return undefined
    }

    // ---------------- Gọi tướng ----------------
    /** Gọi tướng từ dự bị ra sân: đặt vào đường, xáo 34 lá vào bộ */
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
        this.shuffleIn(side,
            this.heroCards(hero,
                side))
        this.hook("onSummon",
            {
                unit: u
            })
    }
    /** Hồi sinh các tướng đã hết 3 vòng (đầu lượt của chủ) */
    respawnDue(side: Side) {
        for (const u of Object.values(this.s.units)) {
            if (u.side !== side || u.status !== "dead" || u.respawnRound > this.s.round) continue
            const empties = this.emptyLanes(side)
            const lane = empties.includes(u.homeLane) ? u.homeLane : empties[0]
            if (lane === undefined) continue
            this.s.lanes[side][lane] = u.id; u.lane = lane; u.status = "board"; u.hp = u.maxHp; u.shield = 0
            this.emit({
                t: "respawn", unit: u.id, lane
            })
            this.hook("onRespawn",
                {
                    unit: u
                })
        }
    }

    // ---------------- Hook ----------------
    /** Gọi hook `name` của mọi tướng đang trên sân (và tướng vừa chết với onDeath). Tướng tự lọc theo dữ liệu. */
    hook<K extends HookName>(name: K, data: HookData[K]) {
        if (this.hookDepth > 40) return
        this.hookDepth++
        try {
            const victim = (data as { victim?: Unit }).victim
            for (const u of Object.values(this.s.units)) {
                if (u.status !== "board" && !(name === "onDeath" && victim === u)) continue
                const h = getHero(u.hero)?.hooks?.[name] as ((g: Game, me: Unit, d: HookData[K]) => void) | undefined
                h?.(this,
                    u,
                    data)
            }
        } finally { this.hookDepth-- }
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
