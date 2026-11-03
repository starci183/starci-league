// DNA giao diện StarCi (thầy chốt 2026-11-03), bản Cocos. Cùng bộ màu với docs/UI_DNA.md và mockup docs/mockups/cocos/:
// 1. nền xanh than gần đen, 2. khung vàng kim mảnh vát góc có ngọc (phe mình xanh, phe địch đỏ),
// 3. xanh ngọc phát sáng cho chọn / hover / focus / nút chính, 4. tiêu đề serif in hoa (Alegreya SC).
import {
    Color
} from "cc"

const hex = (h: string) => new Color().fromHEX(h)

export const C = {
    /** Nền màn, gần đen */
    bg: hex("#010a13"),
    /** Nền panel (vẽ hơi trong để thấy nền menu ở rìa) */
    panel: hex("#081627"),
    /** Nền panel nổi (hàng, ô, nút) */
    panelRaised: hex("#0a1626"),
    /** Khung vàng kim chính */
    gold: hex("#c8aa6e"),
    /** Đường viền trong, vàng tối */
    goldDark: hex("#785a28"),
    /** Chữ tiêu đề, vàng sáng */
    goldLight: hex("#f0e6d2"),
    /** Xanh ngọc: chọn, hover, focus, nút chính */
    teal: hex("#0ac8b9"),
    tealDark: hex("#0397ab"),
    /** Nền nút chính */
    tealDeep: hex("#0b4a4f"),
    tealMid: hex("#127a7a"),
    /** Chữ thường và chữ phụ */
    text: hex("#d8cfb8"),
    textMuted: hex("#a09b8c"),
    /** Phe mình / phe địch */
    ally: hex("#3c8ce6"),
    enemy: hex("#d2463c"),
    /** Lỗi */
    danger: hex("#e84057"),
    dangerDeep: hex("#3a0d16"),
    /** Tắt */
    disabled: hex("#161b22"),
    disabledText: hex("#5b5a56"),
}

/** Khung lá theo nhóm (card-anatomy.png): viền ngoài, viền trong */
export const GROUP_FRAME: Record<string, { edge: Color; inner: Color }> = {
    basic: {
        edge: hex("#d08a3a"), inner: hex("#6b3f14")
    },
    spell: {
        edge: C.teal, inner: hex("#036b66")
    },
    gold: {
        edge: hex("#f0c050"), inner: hex("#8a6a1e")
    },
    item: {
        edge: hex("#9db8e0"), inner: hex("#3c5a82")
    },
}

export const GROUP_NAME: Record<string, string> = {
    basic: "Đánh thường",
    spell: "Bổ trợ",
    gold: "Vàng",
    item: "Đồ",
}

/** Font hệ thống dự phòng khi font TTF chưa nạp được */
export const FONT = {
    title: "'Times New Roman', serif",
    text: "Arial, 'Segoe UI', sans-serif",
}

/** Sân khấu tham chiếu 1920 × 1080, cùng quy chuẩn canvas của bản web */
export const STAGE = {
    w: 1920,
    h: 1080,
}

export const withAlpha = (c: Color, a: number) => new Color(c.r,
    c.g,
    c.b,
    a)

/** Đổi toạ độ mockup 1920 × 1080 (gốc trên-trái) sang toạ độ sân khấu (gốc giữa) */
export const at = (x: number, y: number) => ({
    x: x - STAGE.w / 2, y: STAGE.h / 2 - y
})
