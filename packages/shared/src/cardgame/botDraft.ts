// Cấm/chọn tướng cho bot dựa trên bản đồ đội hình synergy.ts:
// - chọn: combo với tướng đã chọn của mình, khắc tướng địch đã chọn, tránh tướng bị địch đã chọn khắc,
//   tránh tướng mà kẻ khắc nó còn trong pool (địch có thể lấy), cân bằng vai, không trùng Ô triệu hồi phụ.
// - cấm: tướng khắc mạnh nhất các tướng mình đã chọn, tướng combo với tướng địch đã chọn; chưa ai chọn thì cấm
//   tướng "mạnh" (bảng strength truyền vào, mặc định suy từ số tướng khắc/bị khắc).
import {
    getHero
} from "./registry"
import {
    SYNERGY, clashesExtraZone, countersOf
} from "./synergy"

export interface DraftView {
    /** Tướng còn có thể cấm/chọn (chưa bị cấm/chọn) */
    available: string[];
    /** Tướng đã chọn của bên đang chọn */
    mine: string[];
    /** Tướng đã chọn của đối thủ */
    theirs: string[];
    action: "ban" | "pick";
    /** Sức mạnh riêng của từng tướng (vd tỉ lệ thắng selfplay − 0.5, nhân 10), cộng vào điểm */
    strength?: Record<string, number>;
    /** Nhiễu ngẫu nhiên để đa dạng (0 = tất định) */
    noise?: number;
    rnd?: () => number;
}

const combos = (a: string, b: string) => !!SYNERGY[a]?.combos.includes(b) || !!SYNERGY[b]?.combos.includes(a)
/** a khắc b */
const counters = (a: string, b: string) => !!SYNERGY[b]?.counteredBy.includes(a)

/** Sức mạnh mặc định: khắc được nhiều tướng, ít bị khắc */
const defaultStrength = (h: string) => 0.4 * countersOf(h).length - 0.3 * (SYNERGY[h]?.counteredBy.length ?? 0)

export function pickScore(h: string, v: DraftView): number {
    if (clashesExtraZone([...v.mine,
        h])) return -100
    let sc = (v.strength?.[h] ?? 0) + defaultStrength(h)
    for (const m of v.mine) if (combos(h,
        m)) sc += 3
    for (const t of v.theirs) {
        if (counters(h,
            t)) sc += 2.2
        if (counters(t,
            h)) sc -= 2.5
    }
    // kẻ khắc h còn trong pool: địch có thể lấy về
    for (const c of SYNERGY[h]?.counteredBy ?? []) if (v.available.includes(c)) sc -= 0.5
    // cân bằng vai: vai thứ 3 trở đi bị trừ, vai còn thiếu được cộng nhẹ
    const role = getHero(h)?.role
    const same = v.mine.filter((m) => getHero(m)?.role === role).length
    if (same >= 2) sc -= 1.5 * (same - 1)
    else if (same === 0) sc += 0.6
    return sc
}

export function banScore(h: string, v: DraftView): number {
    let sc = (v.strength?.[h] ?? 0) + defaultStrength(h)
    for (const m of v.mine) if (counters(h,
        m)) sc += 3
    for (const t of v.theirs) if (combos(h,
        t)) sc += 2
    return sc
}

/** Tướng bot cấm/chọn ở lượt này (undefined nếu không còn tướng nào) */
export function draftChoice(v: DraftView): string | undefined {
    const rnd = v.rnd ?? Math.random
    let best: string | undefined
    let bestSc = -Infinity
    for (const h of v.available) {
        const sc = (v.action === "ban" ? banScore(h,
            v) : pickScore(h,
            v)) + (v.noise ? v.noise * rnd() : 0)
        if (sc > bestSc) { bestSc = sc; best = h }
    }
    return best
}
