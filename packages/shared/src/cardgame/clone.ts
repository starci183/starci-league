// Sao chép sâu GameState (JSON thuần) nhanh hơn structuredClone ~8 lần: applyAction clone state mỗi lần gọi,
// bot tìm kiếm gọi applyAction hàng trăm lần mỗi lượt nên đây là chi phí chính.
// Giá trị không phải object/array thuần (Map, Set, Date...) rơi về structuredClone cho an toàn.

export function cloneDeep<T>(x: T): T {
    if (typeof x !== "object" || x === null) return x
    if (Array.isArray(x)) {
        const n = x.length
        const out = new Array(n)
        for (let i = 0; i < n; i++) {
            const v = x[i]
            out[i] = typeof v === "object" && v !== null ? cloneDeep(v) : v
        }
        return out as T
    }
    if ((x as object).constructor !== Object) return structuredClone(x)
    const out: Record<string, unknown> = {
        ...(x as Record<string, unknown>)
    }
    for (const k in out) {
        const v = out[k]
        if (typeof v === "object" && v !== null) out[k] = cloneDeep(v)
    }
    return out as T
}
