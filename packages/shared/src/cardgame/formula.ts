// Công thức {…} trong mô tả chiêu cho chế độ thẻ bài. Cùng cú pháp với ../formula.ts nhưng tính theo chỉ số cardgame.
// Số hạng: số phẳng, n% AD, n% AP, n% máu tối đa, n% máu cộng thêm, n% Giáp, n% Kháng phép.
import type {
    Game
} from "./game"
import type {
    Unit
} from "./types"

const TERM = /^([+-]?\d+(?:[.,]\d+)?)\s*(%)?\s*(AD|AP|máu tối đa|max HP|máu cộng thêm|bonus HP|Giáp|Armor|Kháng phép|MR)?$/i

export function evalExpr(g: Game, u: Unit, expr: string): number {
    const v = tryEvalExpr(g,
        u,
        expr)
    if (v === undefined) throw new Error(`Công thức không đọc được: ${expr}`)
    return v
}
export function tryEvalExpr(g: Game, u: Unit, expr: string): number | undefined {
    let sum = 0
    for (const raw of expr.split("+")) {
        const m = TERM.exec(raw.trim())
        if (!m) return undefined
        const n = Number(m[1].replace(",",
                ".")), stat = m[3]?.toLowerCase()
        if (!stat) { sum += n; continue }
        const base = stat === "ad" ? g.atk(u) : stat === "ap" ? g.ap(u) : stat === "máu tối đa" || stat === "max hp" ? u.maxHp
            : stat === "máu cộng thêm" || stat === "bonus hp" ? g.bonusHp(u)
                : stat === "giáp" || stat === "armor" ? g.armor(u) : g.mr(u)
        sum += m[2] ? (n / 100) * base : n * base
    }
    return sum
}

export type FormulaPart = string | { expr: string; value?: number };
/** Tách mô tả thành chữ thường và công thức {…} (đã tính nếu có `g` và `u`) */
export function formulaParts(text: string, g?: Game, u?: Unit): FormulaPart[] {
    const out: FormulaPart[] = []
    let last = 0
    for (const m of text.matchAll(/\{([^{}]+)\}/g)) {
        if (m.index! > last) out.push(text.slice(last,
            m.index))
        const v = g && u ? tryEvalExpr(g,
            u,
            m[1]) : undefined
        out.push({
            expr: m[1].trim(), value: v === undefined ? undefined : Math.round(v)
        })
        last = m.index! + m[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
}
/** Bản chữ: "222 (100 + 50% AD)" hoặc "100 + 50% AD" nếu chưa có tướng */
export const formulaText = (text: string, g?: Game, u?: Unit) =>
    formulaParts(text,
        g,
        u).map((p) => (typeof p === "string" ? p : p.value !== undefined ? `${p.value} (${p.expr})` : p.expr)).join("")

/** Tỉ lệ (0.026) thành số phần trăm gọn để in vào chữ (2.6), tránh lỗi số thực kiểu 2.5999999999999996 */
export const pct = (x: number) => Math.round(x * 1000) / 10
