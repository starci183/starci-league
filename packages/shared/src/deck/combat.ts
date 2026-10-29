// BÀI ĐÁNH THƯỜNG: cường hoá đòn đánh thường của 1 tướng mình (đánh thêm, chí mạng, kết liễu, xuyên...).
// Mô phỏng đồ / ngọc / chiêu tấn công của LoL. Đánh ngửa từ tay.
import type {
    Effect
} from "../types"
import * as K from "./conds"
import {
    defineCard
} from "./registry"

defineCard({
    kind: "stat", id: "cuong_no", name: "Cuồng Nộ", mana: 2, target: "ally", lol: "Cuồng Đao Guinsoo",
    desc: "Chọn 1 tướng mình đã đánh thường lượt này. Tướng đó được đánh thường thêm 1 lần.",
    canTarget: ({ target }) => target.attacked,
    boosts: [{
        when: K.hpBelow(0.5), bonus: "tướng đó hồi thêm 80 máu"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "refresh", unitId: target.id
        },
        ...(met[0] ? [{
            type: "heal", unitId: target.id, amount: 80
        } as Effect] : []),
    ] : [])
})

defineCard({
    kind: "stat", id: "chi_mang", name: "Chí Mạng", mana: 1, target: "ally", lol: "Vô Cực Kiếm",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Chí Mạng trong 1 vòng.",
    boosts: [{
        when: K.role("marksman",
            "assassin"), bonus: "kéo dài 2 vòng thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "buff", unitId: target.id, buffId: "crit", turns: met[0] ? 2 : 1
    }] : [])
})

defineCard({
    kind: "stat", id: "ket_lieu", name: "Đòn Kết Liễu", mana: 1, target: "ally", lol: "Darius R · Máy Chém Noxus",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Đòn Kết Liễu trong 1 vòng.",
    boosts: [{
        when: K.role("assassin",
            "fighter"), bonus: "tướng đó còn +25% AD lượt này"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "buff", unitId: target.id, buffId: "execute", turns: 1
        },
        ...(met[0] ? [{
            type: "buff", unitId: target.id, buffId: "wrath", turns: 1
        } as Effect] : []),
    ] : [])
})

defineCard({
    kind: "stat", id: "nhip_do", name: "Nhịp Độ Chết Người", mana: 2, target: "ally", lol: "Ngọc Nhịp Độ Chết Người",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Nhịp Độ Chết Người trong 2 vòng.",
    boosts: [{
        when: K.role("marksman"), bonus: "kéo dài 3 vòng thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "buff", unitId: target.id, buffId: "tempo", turns: met[0] ? 3 : 2
    }] : [])
})

defineCard({
    kind: "stat", id: "dam_xuyen", name: "Đâm Xuyên", mana: 1, target: "ally", lol: "Kalista Q · Xuyên Phá",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Đâm Xuyên trong 1 vòng.",
    boosts: [{
        when: K.role("marksman",
            "fighter"), bonus: "kéo dài 2 vòng thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "buff", unitId: target.id, buffId: "pierce", turns: met[0] ? 2 : 1
    }] : [])
})
