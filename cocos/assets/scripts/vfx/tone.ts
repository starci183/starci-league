// CHUẨN CƯỜNG ĐỘ VFX CHUNG cho mọi tướng (chủ chốt 2026-11-16: "mọi tướng một bản, đủ nét để wow", mẫu là Vel'Koz).
// Trước đây nhóm 1, 2, 3 mỗi nhóm tự tiết chế một kiểu (bớt nửa hạt, quầng còn 70%...) nên tướng đậm tướng nhạt. Giờ mọi bộ
// helper (g1/g2/g3) phát hạt qua đây: cùng mật độ, cùng độ sáng, cùng trần kích thước, cùng hệ số chiêu cuối như Vel'Koz.
// Muốn chỉnh độ đậm của cả game thì chỉnh MỘT chỗ này.
import type {
    EmitOpts
} from "./particles"
import type {
    VfxCtx
} from "./registry"

export const VFX_STD = {
    /** Hệ số số hạt của burst / stream (1 = đủ như thiết kế) */
    count: 1,
    /** Cỡ và độ đục của quầng sáng (glow) */
    glow: 1, glowAlpha: 1,
    /** Cỡ và độ đục của vòng sóng (ring) */
    ring: 1, ringAlpha: 1,
    /** Hệ số thời gian của các nhịp chờ / lướt */
    time: 1,
    /** Trần kích thước theo loại hạt (px): không có sprite khổng lồ che chân dung (VFX_RULES mục 3) */
    cap: {
        glow: 230, ring: 340, blade: 140, dot: 30
    } as Record<string, number>,
    /** Chiêu cuối (intensity 2) to bằng chừng này lần chiêu thường; Vel'Koz dùng thẳng intensity nên là 1 */
    ultimate: 1,
}

/** Cường độ chiêu theo chuẩn chung: thường 1, chiêu cuối theo VFX_STD.ultimate */
export const stdPower = (ctx: VfxCtx) => 1 + ((ctx.style.intensity ?? 1) - 1) * VFX_STD.ultimate

/** Tuỳ chọn hạt theo chuẩn chung (giữ getter của tuỳ chọn gốc bằng Object.create) */
export function stdOpts(o: EmitOpts): EmitOpts {
    const kind = o.kind ?? "glow"
    const scale = kind === "glow" ? VFX_STD.glow : kind === "ring" ? VFX_STD.ring : 1
    const alpha = kind === "glow" ? VFX_STD.glowAlpha : kind === "ring" ? VFX_STD.ringAlpha : 1
    const cap = VFX_STD.cap[kind] ?? 220
    const t = Object.create(o) as EmitOpts
    const sz = o.size ?? [8,
        2]
    t.size = [Math.min(cap,
        sz[0] * scale),
    Math.min(cap,
        sz[1] * scale)]
    t.alpha = (o.alpha ?? 1) * alpha
    return t
}
