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
    /** Mô hình học từ selfplay (draftModel.ts): khi có thì thay bảng synergy viết tay */
    model?: DraftModel;
    /** Đối thủ còn lượt chọn sau lượt này (để tính rủi ro bị khắc ngược) */
    theirPicksLeft?: number;
    /** Nhiễu ngẫu nhiên để đa dạng (0 = tất định) */
    noise?: number;
    rnd?: () => number;
}

const combos = (a: string, b: string) => !!SYNERGY[a]?.combos.includes(b) || !!SYNERGY[b]?.combos.includes(a)
/** a khắc b */
const counters = (a: string, b: string) => !!SYNERGY[b]?.counteredBy.includes(a)

/** Mô hình cấm/chọn học từ selfplay, đơn vị logit tỉ lệ thắng: strength[h], syn[a][b] (cùng đội), ctr[a][b] (a đấu b) */
export interface DraftModel {
    strength: Record<string, number>;
    syn: Record<string, Record<string, number>>;
    ctr: Record<string, Record<string, number>>;
}

/** Giá trị của `h` với đội `mine` khi đối đầu `theirs` theo mô hình */
function modelValue(m: DraftModel, h: string, mine: string[], theirs: string[]): number {
    let v = m.strength[h] ?? 0
    for (const a of mine) v += m.syn[h]?.[a] ?? 0
    for (const t of theirs) v += m.ctr[h]?.[t] ?? 0
    return v
}

function modelPick(m: DraftModel, h: string, v: DraftView): number {
    if (clashesExtraZone([...v.mine,
        h])) return -100
    let sc = modelValue(m,
        h,
        v.mine,
        v.theirs)
    // rủi ro bị khắc ngược: kẻ khắc h mạnh nhất còn trong pool mà đối thủ còn lượt chọn
    if ((v.theirPicksLeft ?? 1) > 0) {
        let worst = 0
        for (const c of v.available) if (c !== h) worst = Math.max(worst,
            m.ctr[c]?.[h] ?? 0)
        sc -= 0.5 * worst
    }
    const role = getHero(h)?.role
    const same = v.mine.filter((x) => getHero(x)?.role === role).length
    if (same >= 2) sc -= 0.05 * (same - 1)
    return sc
}

/** Cấm: tướng có giá trị cao nhất với đối thủ (theo đội họ đã chọn và đội mình) */
const modelBan = (m: DraftModel, h: string, v: DraftView) => modelValue(m,
    h,
    v.theirs,
    v.mine)

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
        const base = v.model
            ? (v.action === "ban" ? modelBan(v.model,
                h,
                v) : modelPick(v.model,
                h,
                v))
            : (v.action === "ban" ? banScore(h,
                v) : pickScore(h,
                v))
        const sc = base + (v.noise ? v.noise * rnd() : 0)
        if (sc > bestSc) { bestSc = sc; best = h }
    }
    return best
}
