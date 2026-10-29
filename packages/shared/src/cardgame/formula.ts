// Công thức {…} trong mô tả chiêu cho chế độ thẻ bài. Cùng cú pháp với ../formula.ts nhưng tính theo chỉ số cardgame.
// Số hạng: số phẳng, n% AD, n% AP, n% máu tối đa, n% máu cộng thêm, n% Giáp, n% Kháng phép.
import type {
    Game
} from "./game"
import type {
    Unit
} from "./types"

// Thứ tự liệt kê: cụm dài trước cụm ngắn ("máu tối đa mục tiêu" trước "máu tối đa")
const STAT = "AD|AP|máu tối đa mục tiêu|target max HP|máu đã mất mục tiêu|target missing HP|Giáp mục tiêu|target armor|máu tối đa|max HP|máu đã mất|missing HP|máu cộng thêm|bonus HP|Giáp|Armor|Kháng phép|MR"
const TERM = new RegExp(String.raw`^([+-]?\d+(?:[.,]\d+)?)\s*(%)?\s*(${STAT})?$`,
    "i")
/** Số hạng tỉ lệ (công thức xác suất): "1% mỗi 100 AD", "0.05% mỗi điểm AP", "1% per 10 Armor", "0.05% per point of AD" */
const PER_TERM = new RegExp(String.raw`^([+-]?\d+(?:[.,]\d+)?)\s*%\s*(?:mỗi|per)\s+(\d+|điểm|point of)\s*(${STAT})$`,
    "i")
const TARGET_STATS = ["máu tối đa mục tiêu",
    "target max hp",
    "máu đã mất mục tiêu",
    "target missing hp",
    "giáp mục tiêu",
    "target armor"]

/** Chỉ số `stat` (đã viết thường) của u / mục tiêu; undefined nếu cần mục tiêu mà không có */
function statOf(g: Game, u: Unit, stat: string, target?: Unit): number | undefined {
    if (TARGET_STATS.includes(stat) && !target) return undefined
    return stat === "ad" ? g.atk(u) : stat === "ap" ? g.ap(u) : stat === "máu tối đa" || stat === "max hp" ? u.maxHp
        : stat === "máu đã mất" || stat === "missing hp" ? Math.max(0,
            u.maxHp - u.hp)
            : stat === "máu tối đa mục tiêu" || stat === "target max hp" ? target!.maxHp
                : stat === "máu đã mất mục tiêu" || stat === "target missing hp" ? Math.max(0,
                    target!.maxHp - target!.hp)
                    : stat === "giáp mục tiêu" || stat === "target armor" ? g.armor(target!)
                        : stat === "máu cộng thêm" || stat === "bonus hp" ? g.bonusHp(u)
                            : stat === "giáp" || stat === "armor" ? g.armor(u) : g.mr(u)
}

/** Công thức xác suất/tỉ lệ (có số hạng "mỗi"/"per"): giá trị tính bằng % */
export const isPercentExpr = (expr: string) => expr.split("+").some((t) => PER_TERM.test(t.trim()))

export function evalExpr(g: Game, u: Unit, expr: string, target?: Unit): number {
    const v = tryEvalExpr(g,
        u,
        expr,
        target)
    if (v === undefined) throw new Error(`Công thức không đọc được: ${expr}`)
    return v
}
/**
 * Tính công thức. Công thức thường: số phẳng + n% chỉ số. Công thức tỉ lệ (isPercentExpr): kết quả theo đơn vị %,
 * "n%" phẳng = n, "n% mỗi K chỉ số" = n · chỉ số / K ("mỗi điểm" = K 1).
 * o.partial: bỏ qua số hạng cần mục tiêu khi không có mục tiêu (trả phần tính được, kèm danh sách số hạng bỏ qua).
 */
export function tryEvalExpr(g: Game, u: Unit, expr: string, target?: Unit, o: { partial?: string[] } = {
}): number | undefined {
    let sum = 0
    for (const raw of expr.split("+")) {
        const term = raw.trim()
        const per = PER_TERM.exec(term)
        if (per) {
            const n = Number(per[1].replace(",",
                "."))
            const k = /^\d+$/.test(per[2]) ? Number(per[2]) : 1
            const base = statOf(g,
                u,
                per[3].toLowerCase(),
                target)
            if (base === undefined) {
                if (!o.partial) return undefined
                o.partial.push(term)
                continue
            }
            sum += n * base / k
            continue
        }
        const m = TERM.exec(term)
        if (!m) return undefined
        const n = Number(m[1].replace(",",
                ".")), stat = m[3]?.toLowerCase()
        if (!stat) { sum += n; continue }
        const base = statOf(g,
            u,
            stat,
            target)
        if (base === undefined) {
            if (!o.partial) return undefined
            o.partial.push(term)
            continue
        }
        sum += m[2] ? (n / 100) * base : n * base
    }
    return sum
}

/** Số hiển thị: tối đa 1 chữ số thập phân, bỏ ".0" (44.5, 120) */
export const fmtNum = (v: number) => {
    const r = Math.round(v * 10) / 10
    return Number.isInteger(r) ? `${r}` : r.toFixed(1)
}

export type FormulaPart = string | { expr: string; value?: number; pct?: boolean; rest?: string[] };
/**
 * Tách mô tả thành chữ thường và công thức {…} (đã tính nếu có `g` và `u`). value làm tròn 1 chữ số thập phân;
 * pct = công thức tỉ lệ (hiện kèm %); rest = số hạng cần mục tiêu chưa biết (value chỉ là phần tính được).
 */
export function formulaParts(text: string, g?: Game, u?: Unit, target?: Unit): FormulaPart[] {
    const out: FormulaPart[] = []
    let last = 0
    for (const m of text.matchAll(/\{([^{}]+)\}/g)) {
        if (m.index! > last) out.push(text.slice(last,
            m.index))
        const rest: string[] = []
        const v = g && u ? tryEvalExpr(g,
            u,
            m[1],
            target,
            {
                partial: rest
            }) : undefined
        const pct = isPercentExpr(m[1])
        out.push({
            expr: m[1].trim(), value: v === undefined || (rest.length && rest.length === m[1].split("+").length) ? undefined : Math.round(v * 10) / 10, ...(pct ? {
                pct
            } : {
            }), ...(rest.length ? {
                rest
            } : {
            })
        })
        last = m.index! + m[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
}
/** Chữ hiển thị của 1 công thức: "44.5 (20 + 10% AD)", "18.4% (5% + 1% mỗi 10 Giáp)", "120 + 8% máu tối đa mục tiêu (…)" */
export function formulaPartText(p: Exclude<FormulaPart, string>): string {
    if (p.value === undefined) return p.expr
    const head = `${fmtNum(p.value)}${p.pct ? "%" : ""}${p.rest?.length ? ` + ${p.rest.join(" + ")}` : ""}`
    return `${head} (${p.expr})`
}
/** Bản chữ: "222 (100 + 50% AD)" hoặc "100 + 50% AD" nếu chưa có tướng */
export const formulaText = (text: string, g?: Game, u?: Unit, target?: Unit) =>
    formulaParts(text,
        g,
        u,
        target).map((p) => (typeof p === "string" ? p : formulaPartText(p))).join("")

/** Tỉ lệ (0.026) thành số phần trăm gọn để in vào chữ (2.6), tránh lỗi số thực kiểu 2.5999999999999996 */
export const pct = (x: number) => Math.round(x * 1000) / 10
