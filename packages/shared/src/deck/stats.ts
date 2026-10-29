// BÀI CHỈ SỐ: tăng vàng, mana, máu, AD/AP... Đánh ngửa từ tay, không úp được. Mô phỏng bình thuốc, đồ và bùa lợi của LoL.
import type {
    Effect, UnitLike
} from "../types"
import * as K from "./conds"
import {
    defineCard
} from "./registry"

const missing = (u: UnitLike) => Math.max(0,
    u.maxHp - u.hp)

defineCard({
    kind: "stat", id: "binh_mau", name: "Bình Máu", mana: 1, target: "ally", lol: "Bình Máu",
    desc: "Chọn 1 tướng mình. Hồi cho tướng đó 80 máu, cộng thêm 20% số máu đã mất, rồi tướng đó nhận Bình Máu trong 2 vòng.",
    boosts: [{
        when: K.hpBelow(0.5), bonus: "hồi đầu lượt kéo dài 3 vòng thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "heal", unitId: target.id, amount: Math.round(80 + 0.2 * missing(target))
        },
        {
            type: "buff", unitId: target.id, buffId: "regen", turns: met[0] ? 3 : 2
        },
    ] : [])
})

defineCard({
    kind: "stat", id: "binh_nang_luong", name: "Bình Năng Lượng", mana: 1, target: "ally", lol: "Bình Tái Sử Dụng",
    desc: "Chọn 1 tướng mình. Tướng đó nhận 30 Mana hoặc Nộ.",
    boosts: [{
        when: K.usesRage(), bonus: "nhận 50 Nộ thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "heroMana", unitId: target.id, amount: met[0] ? 50 : 30
    }] : [])
})

defineCard({
    kind: "stat", id: "thuoc_cuong_no", name: "Thuốc Cuồng Nộ", mana: 2, target: "ally", lol: "Thuốc Cuồng Nộ",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Thuốc Cuồng Nộ trong 3 vòng.",
    boosts: [{
        when: K.role("marksman",
            "fighter",
            "assassin"), bonus: "kéo dài 4 vòng thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "buff", unitId: target.id, buffId: "wrath", turns: met[0] ? 4 : 3
    }] : [])
})

defineCard({
    kind: "stat", id: "thuoc_phu_thuy", name: "Thuốc Phù Thủy", mana: 2, target: "ally", lol: "Thuốc Phù Thủy",
    desc: "Chọn 1 tướng mình. Tướng đó nhận Thuốc Phù Thủy trong 3 vòng.",
    boosts: [{
        when: K.role("mage",
            "support"), bonus: "kéo dài 4 vòng thay vào đó, và tướng đó nhận 20 Mana"
    }],
    resolve: ({ target, met }) => (target ? [
        {
            type: "buff", unitId: target.id, buffId: "sorcery", turns: met[0] ? 4 : 3
        },
        ...(met[0] ? [{
            type: "heroMana", unitId: target.id, amount: 20
        } as Effect] : []),
    ] : [])
})

defineCard({
    kind: "stat", id: "tui_vang", name: "Túi Vàng", mana: 1, target: "none", lol: "Đồ hỗ trợ kiếm vàng",
    desc: "Bạn nhận 2 vàng.",
    boosts: [{
        when: K.behindOnNexus(), bonus: "nhận 4 vàng thay vào đó"
    }],
    resolve: ({ side, met }) => [{
        type: "gold", side, amount: met[0] ? 4 : 2
    }]
})

defineCard({
    kind: "stat", id: "pha_le_mana", name: "Pha Lê Mana", mana: 2, target: "none", lol: "Nước Mắt Nữ Thần",
    desc: "Mana tối đa của bạn tăng vĩnh viễn 1, và bạn nhận ngay 1 mana.",
    boosts: [{
        when: K.maxManaBelow(6), bonus: "tăng 2 thay vào đó"
    }],
    resolve: ({ side, met }) => [{
        type: "maxMana", side, amount: met[0] ? 2 : 1
    }]
})

defineCard({
    kind: "stat", id: "bua_baron", name: "Bùa Baron", mana: 4, target: "none", lol: "Bùa Baron Nashor",
    desc: "Mọi tướng mình trên sân nhận Bùa Baron trong 2 vòng.",
    boosts: [{
        when: K.alliesAtLeast(4), bonus: "kéo dài 3 vòng thay vào đó"
    }],
    resolve: ({ state, side, met }) => {
        const fx: Effect[] = []
        state.units.forEach((u) => { if (u.owner === side && u.lane >= 0) fx.push({
            type: "buff", unitId: u.id, buffId: "baron", turns: met[0] ? 3 : 2
        }) })
        return fx
    }
})

defineCard({
    kind: "stat", id: "linh_hon_rong", name: "Linh Hồn Rồng", mana: 3, target: "ally", lol: "Shyvana R · Linh Hồn Rồng",
    desc: "Chọn 1 tướng mình. Tướng đó tăng vĩnh viễn 150 máu tối đa.",
    boosts: [{
        when: K.role("tank",
            "fighter"), bonus: "tăng 250 thay vào đó"
    }],
    resolve: ({ target, met }) => (target ? [{
        type: "maxhp", unitId: target.id, amount: met[0] ? 250 : 150
    }] : [])
})
