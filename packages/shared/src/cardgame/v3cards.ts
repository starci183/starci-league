// Lá đặc biệt dùng chung của V3 (không thuộc tướng nào). Import có tác dụng phụ (đăng ký) từ game.ts.
import {
    defineSpecialCard
} from "./registry"

/** Lá tạm "chọn lá" (g.offerPick): đánh 1 lá = lấy lá tương ứng từ mộ về tay, các lá chọn cùng nhóm biến mất. */
defineSpecialCard({
    id: "pick_card",
    name: "Chọn lá",
    desc: "Lấy lá này từ mộ về tay; các lá chọn còn lại biến mất. Lá tạm: biến mất cuối lượt nếu không dùng.",
    skill: {
        key: "E", name: "Chọn lá", desc: "Lấy lá này từ mộ về tay.", target: "none", uncounterable: true,
        resolve(ctx) {
            const {
                g, side, card
            } = ctx
            const uid = String(card.data?.uid ?? ""), group = String(card.data?.group ?? "")
            g.fromGrave(side,
                uid)
            for (const c of [...g.player(side).hand]) if (c.kind === "special" && c.id === "pick_card" && String(c.data?.group ?? "") === group) g.discard(side,
                c.uid,
                "pick")
        },
    },
})
