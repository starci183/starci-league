// PHÉP: dùng ngay từ tay, hoặc úp xuống (1 mana) để hù rồi lật sau (trả nốt phần mana còn lại).
// Mô phỏng phép bổ trợ và chiêu LoL. Mỗi lá có hiệu ứng gốc + điều kiện cường hóa (dùng đúng lúc thì mạnh hơn).
import {
    hit, magic, other, status
} from "../helpers"
import type {
    Effect, UnitLike
} from "../types"
import * as K from "./conds"
import {
    defineCard
} from "./registry"

/** Máu đã mất: hồi máu/khiên theo lượng này thì máu càng thấp hồi càng nhiều */
const missing = (u: UnitLike) => Math.max(0,
    u.maxHp - u.hp)

defineCard({
    kind: "spell", id: "cau_lua", name: "Cầu Lửa", mana: 2, target: "enemy", lol: "Annie Q · Hỏa Cầu",
    desc: "Chọn 1 tướng địch. Gây 180 sát thương phép cho tướng đó.",
    boosts: [
        {
            when: K.has("burn"), bonus: "gây thêm 50% sát thương"
        },
        {
            when: K.hpBelow(0.4), bonus: "gây thêm 30% sát thương"
        },
    ],
    resolve: ({ target, met }) => {
        if (!target) return []
        const m = (met[0] ? 1.5 : 1) * (met[1] ? 1.3 : 1)
        return [hit(target,
            magic(180 * m,
                target),
            "Cầu Lửa")]
    }
})

defineCard({
    kind: "spell", id: "hoi_phuc", name: "Hồi Phục", mana: 1, target: "ally", lol: "Phép bổ trợ Hồi Máu",
    desc: "Chọn 1 tướng mình. Hồi cho tướng đó 120 máu, cộng thêm 40% số máu đã mất.",
    boosts: [{
        when: K.hpBelow(0.3), bonus: "tướng đó nhận thêm Khiên 120"
    }],
    resolve: ({ target, met }) => (target
        ? [{
            type: "heal", unitId: target.id, amount: Math.round(120 + 0.4 * missing(target))
        },
        ...(met[0] ? [{
            type: "shield", unitId: target.id, amount: 120
        } as Effect] : [])]
        : [])
})

defineCard({
    kind: "spell", id: "thieu_dot", name: "Thiêu Đốt", mana: 1, target: "enemy", lol: "Phép bổ trợ Thiêu Đốt",
    desc: "Chọn 1 tướng địch. Tướng đó bị Thiêu Đốt 50 máu mỗi vòng và Vết Thương Sâu, trong 3 vòng.",
    boosts: [
        {
            when: K.hpBelow(0.5), bonus: "Thiêu Đốt 80 máu mỗi vòng thay vào đó"
        },
        {
            when: K.role("fighter",
                "tank",
                "support"), bonus: "Vết Thương Sâu kéo dài 5 vòng thay vào đó"
        },
    ],
    resolve: ({ target, met }) => (target ? [
        {
            type: "burn", unitId: target.id, amount: met[0] ? 80 : 50, turns: 3
        },
        status(target,
            "wounds",
            met[1] ? 5 : 3),
    ] : [])
})

defineCard({
    kind: "spell", id: "kiet_suc", name: "Kiệt Sức", mana: 1, target: "enemy", lol: "Phép bổ trợ Kiệt Sức",
    desc: "Chọn 1 tướng địch. Tướng đó nhận Kiệt Sức và bị Buốt trong 1 vòng.",
    boosts: [{
        when: K.role("assassin",
            "marksman",
            "fighter"), bonus: "tướng đó còn bị Rã giáp 2 vòng"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "buff", unitId: target.id, buffId: "exhaust", turns: 1
        },
        status(target,
            "chill",
            1),
        ...(met[0] ? [status(target,
            "shred",
            2)] : []),
    ] : [])
})

defineCard({
    kind: "spell", id: "toc_bien", name: "Tốc Biến", mana: 1, target: "ally", lol: "Phép bổ trợ Tốc Biến",
    desc: "Chọn 1 tướng mình. Lượt này tướng đó được **đi 1 ô** (chỉ sát thủ tự đi được, tướng khác cần Tốc Biến hoặc chiêu), và Không Cản Phá trong 1 vòng.",
    boosts: [{
        when: K.hpBelow(0.35), bonus: "tướng đó nhận thêm Khiên 150"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "freeMove", unitId: target.id
        },
        status(target,
            "unstoppable",
            1),
        ...(met[0] ? [{
            type: "shield", unitId: target.id, amount: 150
        } as Effect] : []),
    ] : [])
})

defineCard({
    kind: "spell", id: "trung_phat", name: "Trừng Phạt", mana: 1, target: "enemy", lol: "Phép bổ trợ Trừng Phạt",
    desc: "Chọn 1 tướng địch. Gây 220 sát thương chuẩn cho tướng đó.",
    boosts: [{
        when: K.hpBelow(0.3), bonus: "gây 420 sát thương chuẩn thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [hit(target,
        met[0] ? 420 : 220,
        "Trừng Phạt")] : [])
})

defineCard({
    kind: "spell", id: "la_chan", name: "Lá Chắn", mana: 1, target: "ally", lol: "Phép bổ trợ Lá Chắn",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Khiên 150, cộng thêm 30% số máu đã mất.",
    boosts: [{
        when: K.has("stun",
            "freeze",
            "chill"), bonus: "Khiên lớn hơn 50%"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "shield", unitId: target.id, amount: Math.round((150 + 0.3 * missing(target)) * (met[0] ? 1.5 : 1))
    }] : [])
})

defineCard({
    kind: "spell", id: "thanh_tay", name: "Thanh Tẩy", mana: 1, target: "ally", lol: "Phép bổ trợ Thanh Tẩy",
    desc: "Chọn 1 tướng mình. Xoá mọi khống chế trên tướng đó, rồi tướng đó Không Cản Phá trong 1 vòng.",
    boosts: [{
        when: K.has("stun",
            "freeze"), bonus: "tướng đó hồi thêm 150 máu và được đánh thường lại lượt này"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "cleanse", unitId: target.id
        },
        status(target,
            "unstoppable",
            1),
        ...(met[0] ? [{
            type: "heal", unitId: target.id, amount: 150
        } as Effect,
{
    type: "refresh", unitId: target.id
} as Effect] : []),
    ] : [])
})

defineCard({
    kind: "spell", id: "dich_chuyen", name: "Dịch Chuyển", mana: 2, target: "allyRoster", lol: "Phép bổ trợ Dịch Chuyển",
    desc: "Chọn 1 tướng mình đang chờ hồi sinh hoặc vừa rút về. Tướng đó được ra sân ngay lượt này.",
    boosts: [{
        when: K.isDead(), bonus: "tướng đó nhận thêm 40 Mana/Nộ"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "ready", unitId: target.id
        },
        ...(met[0] ? [{
            type: "heroMana", unitId: target.id, amount: 40
        } as Effect] : []),
    ] : [])
})

defineCard({
    kind: "spell", id: "mat_kiem_soat", name: "Mắt Kiểm Soát", mana: 1, target: "none", lol: "Mắt Kiểm Soát",
    desc: "Lật xem mọi bài úp của đối thủ. Mọi tướng địch đang ẩn bị Lộ diện.",
    boosts: [{
        when: K.oppSetsAtLeast(2), bonus: "bạn rút thêm 1 lá"
    }],
    resolve: ({ side, met }) => [
        {
            type: "revealSets", side
        },
        {
            type: "reveal", side: other(side)
        },
        ...(met[0] ? [{
            type: "draw", side, n: 1
        } as Effect] : []),
    ]
})
