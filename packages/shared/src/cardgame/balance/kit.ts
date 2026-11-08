// Đọc số cân bằng từ JSON. Tướng lấy mọi con số qua kit(id): sửa JSON là đổi cả hành vi lẫn chữ trên lá, không sửa code.
// Tham số đặt tên theo docs/heroes/KITS.md: p1.. nội tại, q0/e0/r0 mana, q1.. e1.. r1.. số trong chiêu.
import type {
    Game
} from "../game"
import type {
    HeroBotHint, OptCtx, PlayArgs, SkillKey, Trigger
} from "../types"

export interface HeroBalance {
    id: string;
    stats: { hp: number; atk: number; armor: number; mr: number };
    params: Record<string, number>;
    flags: Record<string, boolean | number>;
    /** Số lần tung Q, E, R mỗi lượt; 0 là không giới hạn */
    limits?: Record<SkillKey, number>;
    /** Điểm chấm thế cờ của bot: giá trị bộ đếm, dấu, buff, token */
    bot?: HeroBotHint;
}

/** Số thường dùng trong công thức: tránh lỗi số thực kiểu 35.00000000000001 */
const tidy = (v: number) => Math.round(v * 1e6) / 1e6

/** Stat trong KITS.md -> token mà formula.ts đọc được (VI và EN) */
const STATS: [RegExp, string, string][] = [
    [/^máu tối đa mục tiêu$/i,
        "máu tối đa mục tiêu",
        "target max HP"],
    [/^máu đã mất mục tiêu$/i,
        "máu đã mất mục tiêu",
        "target missing HP"],
    [/^máu tối đa$/i,
        "máu tối đa",
        "max HP"],
    [/^máu đã mất$/i,
        "máu đã mất",
        "missing HP"],
    [/^giáp mục tiêu$/i,
        "Giáp mục tiêu",
        "target armor"],
    [/^giáp$/i,
        "Giáp",
        "Armor"],
    [/^kháng(?: phép)?$/i,
        "Kháng phép",
        "MR"],
    [/^tốc đánh$/i,
        "Tốc Đánh",
        "attack speed"],
    [/^ad$/i,
        "AD",
        "AD"],
    [/^ap$/i,
        "AP",
        "AP"],
]
const statToken = (name: string): [string, string] => {
    const hit = STATS.find(([re]) => re.test(name.trim()))
    if (!hit) throw new Error(`Không biết chỉ số "${name}" trong công thức cân bằng`)
    return [hit[1],
        hit[2]]
}
/** Một số hạng: `q1`, `12`, `q2·AD` (hệ số, 0.5 = 50%), `r3% Máu đã mất` (số %) */
const TERM = /^([\p{L}\p{N}_.]+)\s*(%)?\s*(?:[·*]?\s*(.+))?$/u

export class Kit {
    readonly id: string
    readonly raw: HeroBalance
    /** Tham số số. Đọc tên không có trong JSON sẽ ném lỗi ngay lúc nạp module. */
    readonly p: Record<string, number>
    constructor(raw: HeroBalance) {
        this.id = raw.id
        this.raw = raw
        const params = raw.params
        const id = raw.id
        this.p = new Proxy(params,
            {
                get(t, key) {
                    if (typeof key !== "string") return undefined
                    const v = t[key]
                    if (typeof v !== "number") throw new Error(`Thiếu tham số ${key} trong balance/heroes/${id}.json`)
                    return v
                },
            })
    }
    /** Chỉ số gốc để trải vào defineHero */
    get base() { return this.raw.stats }
    /** Số lần tung chiêu `key` mỗi lượt; 0 là không giới hạn */
    limit(key: SkillKey): number { return this.raw.limits?.[key] ?? 0 }
    /** Điểm bot để gán vào HeroDef.bot */
    get bot(): HeroBotHint { return this.raw.bot ?? {
    } }
    /** Cờ tạm/quyết định chờ chốt trong JSON (flags). Thiếu cờ là lỗi cấu hình. */
    flag(name: string): boolean { return !!this.num(name) }
    num(name: string): number {
        const v = this.raw.flags[name]
        if (v === undefined) throw new Error(`Thiếu cờ ${name} trong balance/heroes/${this.id}.json`)
        return Number(v)
    }
    private build(expr: string, en: boolean): string {
        const out: string[] = []
        for (const raw of expr.split("+")) {
            const m = TERM.exec(raw.trim())
            if (!m) throw new Error(`Công thức cân bằng sai: ${expr}`)
            const v = /^\d/.test(m[1]) ? Number(m[1]) : this.p[m[1]]
            if (!m[3]) { out.push(`${tidy(v)}${m[2] ? "%" : ""}`); continue }
            const [vi,
                eng] = statToken(m[3])
            out.push(`${tidy(m[2] ? v : v * 100)}% ${en ? eng : vi}`)
        }
        return out.join(" + ")
    }
    /**
     * Dựng công thức cho formula.ts từ ký hiệu KITS.md: x("q1 + q2·AP") -> "80 + 50% AP".
     * Cùng chuỗi dùng cho g.f(...) và mô tả "{...}" nên số trên lá luôn khớp hành vi.
     */
    x(expr: string): string { return this.build(expr,
        false) }
    /** Như x() với tên chỉ số tiếng Anh, dùng trong chữ EN: {80 + 50% AP}, {10% max HP} */
    xe(expr: string): string { return this.build(expr,
        true) }
}

// ---------------- Điều kiện nối Chuỗi (law.md 1.2), dùng làm SkillDef.quickWhen ----------------
type QC = OptCtx & { trigger: Trigger }
const singleAlly = (c: QC) => !!c.trigger.single && c.g.unit(c.trigger.target)?.side === c.side
export const when = {
    /** Khi địch nhắm đúng tướng này */
    targetsSelf: (c: QC) => !!c.trigger.single && c.trigger.target === c.self.id,
    /** Khi địch nhắm đúng 1 tướng mình */
    targetsAlly: singleAlly,
    /** Khi địch nhắm đúng 1 tướng mình khác */
    targetsOtherAlly: (c: QC) => singleAlly(c) && c.trigger.target !== c.self.id,
    /** Khi địch đánh tướng này */
    attacksSelf: (c: QC) => c.trigger.kind === "attack" && c.trigger.target === c.self.id,
    /** Khi địch đánh đúng 1 tướng mình */
    attacksAlly: (c: QC) => c.trigger.kind === "attack" && singleAlly(c),
    /** Khi địch tấn công */
    attack: (c: QC) => c.trigger.kind === "attack",
    /** Khi địch dùng lá chiêu */
    skill: (c: QC) => c.trigger.kind === "skill",
    /** Khi địch đánh hoặc dùng chiêu */
    attackOrSkill: (c: QC) => c.trigger.kind === "attack" || c.trigger.kind === "skill",
    /** Khi địch dùng lá chiêu nhắm nhiều tướng mình hoặc cả phe */
    multi: (c: QC) => c.trigger.kind === "skill" && !!c.trigger.multi,
}

// ---------------- Chọn mục tiêu của Quick ----------------
/** "Mục tiêu là kẻ đó": nối Chuỗi thì khoá kẻ đang hành động; dùng chủ động thì chọn địch. */
export function actorOrEnemy(c: OptCtx): PlayArgs[] {
    if (c.trigger) {
        const a = c.g.unit(c.trigger.actor)
        return a && c.g.targetable(a) ? [{
            target: a.id
        }] : []
    }
    return c.g.targetableEnemies(c.self).filter((u) => !u.token).map((u) => ({
        target: u.id
    }))
}
/** "Mục tiêu là tướng đó": nối Chuỗi thì khoá tướng mình đang bị nhắm; dùng chủ động thì chọn tướng mình. */
export function lockedAlly(c: OptCtx, other = false): PlayArgs[] {
    if (c.trigger) return [{
        target: c.trigger.target
    }]
    return c.g.allies(c.self,
        !other).filter((u) => !u.token).map((u) => ({
        target: u.id
    }))
}

/** Sát thương tăng vọt của KITS.md: p·n·(1 + n/k) */
export const spike = (p: number, n: number, k: number) => p * n * (1 + n / k)

/** Khống chế/hiệu ứng theo đơn vị của lá: tiện cho công thức thời hạn có hệ số */
export const unitsOf = (g: Game, src: Parameters<Game["f"]>[0], expr: string) => Math.max(0,
    g.f(src,
        expr))
