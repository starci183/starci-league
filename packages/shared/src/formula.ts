// Công thức trong mô tả chiêu/nội tại, viết trong ngoặc nhọn: "Gây {100 + 50% AD + 60% AP} sát thương phép".
// Khi hiện tooltip cho một tướng cụ thể: tính ra số theo chỉ số hiện tại -> "222 (100 + 50% AD + 60% AP)".
// Số hạng hỗ trợ: số phẳng, n% AD, n% AP, n% máu tối đa / max HP, n% máu cộng thêm / bonus HP, n% Giáp / Armor, n% Kháng phép / MR (của tướng dùng chiêu).
import {
    apOf, armorOf, atkOf, bonusHpOf, mrOf
} from "./helpers"
import type {
    UnitLike
} from "./types"

const TERM = /^([+-]?\d+(?:[.,]\d+)?)\s*(%)?\s*(AD|AP|máu tối đa|max HP|máu cộng thêm|bonus HP|Giáp|Armor|Kháng phép|MR)?$/i

/** Giá trị của công thức theo chỉ số tướng `u` (undefined nếu không đọc được) */
export function evalFormula(expr: string, u: UnitLike): number | undefined {
    let sum = 0
    for (const raw of expr.split("+")) {
        const m = TERM.exec(raw.trim())
        if (!m) return undefined
        const n = Number(m[1].replace(",",
                ".")), stat = m[3]?.toLowerCase()
        if (!stat) { sum += n; continue }
        const base = stat === "ad" ? atkOf(u) : stat === "ap" ? apOf(u) : stat === "máu tối đa" || stat === "max hp" ? u.maxHp
            : stat === "máu cộng thêm" || stat === "bonus hp" ? bonusHpOf(u)
                : stat === "giáp" || stat === "armor" ? armorOf(u) : mrOf(u)
        sum += m[2] ? (n / 100) * base : n * base
    }
    return Math.round(sum)
}

export type FormulaPart = string | { expr: string; value?: number };
/** Tách câu thành chữ thường và công thức {…} (đã tính nếu có tướng) */
export function formulaParts(text: string, u?: UnitLike): FormulaPart[] {
    const out: FormulaPart[] = []
    let last = 0
    for (const m of text.matchAll(/\{([^{}]+)\}/g)) {
        if (m.index! > last) out.push(text.slice(last,
            m.index))
        out.push({
            expr: m[1].trim(), value: u ? evalFormula(m[1],
                u) : undefined
        })
        last = m.index! + m[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
}
/** Bản chữ thường (cho chỗ không vẽ được định dạng): "222 (100 + 50% AD)" hoặc "100 + 50% AD" */
export const formulaText = (text: string, u?: UnitLike) =>
    formulaParts(text,
        u).map((p) => (typeof p === "string" ? p : p.value !== undefined ? `${p.value} (${p.expr})` : p.expr)).join("")
