// 10 mảnh: chỉ có chỉ số, mua ở chợ (hoặc rút từ bộ bài), ghép 2 mảnh thành đồ hoàn chỉnh.
import {
    defineItem
} from "./registry"

export const K = "kiem_dai", G = "gay_qua_kho", C = "cung_go", T = "gang_tay",
    GI = "giap_luoi", A = "ao_choang", D = "dai_khong_lo", N = "nuoc_mat", S = "pha_le_lam", P = "cuoc_chim"

defineItem({
    id: K, name: "Kiếm Dài", tier: "component", emoji: "🗡️", stats: {
        atk: 20
    }, lolIds: [1036]
})
defineItem({
    id: G, name: "Gậy Quá Khổ", tier: "component", emoji: "🪄", stats: {
        ap: 25
    }, lolIds: [1058]
})
defineItem({
    id: C, name: "Cung Gỗ", tier: "component", emoji: "🏹", stats: {
        extraAtk: 0.15
    }, lolIds: [1043]
})
defineItem({
    id: T, name: "Găng Tay Đấu Tập", tier: "component", emoji: "🧤", stats: {
        crit: 0.15
    }, lolIds: [1018]
})
defineItem({
    id: GI, name: "Giáp Lưới", tier: "component", emoji: "🦺", stats: {
        armor: 20
    }, lolIds: [1031]
})
defineItem({
    id: A, name: "Áo Choàng Phủ Phép", tier: "component", emoji: "🧥", stats: {
        mr: 20
    }, lolIds: [1057]
})
defineItem({
    id: D, name: "Đai Khổng Lồ", tier: "component", emoji: "🎗️", stats: {
        hp: 150
    }, lolIds: [1011]
})
defineItem({
    id: N, name: "Nước Mắt Nữ Thần", tier: "component", emoji: "💧", stats: {
        manaRegen: 5
    }, lolIds: [3070]
})
defineItem({
    id: S, name: "Pha Lê Lam Ngọc", tier: "component", emoji: "", stats: {
        manaDiscount: 5
    }, lolIds: [1027]
})
defineItem({
    id: P, name: "Cuốc Chim", tier: "component", emoji: "", stats: {
        atkMult: 0.1
    }, lolIds: [1037]
})
