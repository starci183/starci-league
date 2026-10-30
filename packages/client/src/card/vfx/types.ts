// Hợp đồng chung của lớp hiệu ứng canvas (PixiJS) cho chế độ thẻ bài.
// VfxCanvas.tsx dựng Application + lớp vẽ; các file fx_*.ts đăng ký hiệu ứng theo tên bằng registerVfx;
// heroMap.ts nói chiêu nào của tướng nào dùng hiệu ứng nào; dispatch.ts biến GameEvent thành lời gọi playVfx.
import type {
    Application, Container
} from "pixi.js"

/** Điểm trên màn hình (toạ độ client, px) */
export interface Pt { x: number; y: number }

/** Ngữ cảnh truyền cho một hiệu ứng */
export interface VfxCtx {
    app: Application;
    /** Lớp vẽ riêng cho lần chạy này; hiệu ứng tự dọn con của nó khi xong */
    layer: Container;
    /** Điểm xuất phát (tướng tung chiêu, bộ bài, tay bài...) */
    from: Pt;
    /** Các mục tiêu (rỗng = hiệu ứng tại chỗ ở `from`) */
    to: Pt[];
    /** Màu chủ đạo 0xRRGGBB */
    color: number;
    /** Màu phụ (viền, tia) */
    color2?: number;
    /** Ảnh icon chiêu để gắn lên đạn/hiệu ứng (đường dẫn trong public) */
    icon?: string;
    /** 1 = bình thường, 2+ = chiêu cuối / chí mạng */
    intensity: number;
    /** Resource amount displayed by a resource-specific effect. */
    amount?: number;
    /** Optional authoritative receipt beat, called once by the effect. */
    onBeat?(): void;
    /** A card-grabbing effect follows the actual moving DOM card, not a fixed beam. */
    tether?: { target(): Pt; released(): boolean; contact(): void };
    /** Rung màn hình (gọi từ hiệu ứng khi trúng) */
    shake(power: number, ms: number): void;
}

/** Một hiệu ứng: chạy xong thì resolve */
export type VfxEffect = (ctx: VfxCtx) => Promise<void>

const REGISTRY = new Map<string, VfxEffect>()

/** Đăng ký hiệu ứng theo tên (gọi ở mức module trong fx_*.ts) */
export function registerVfx(name: string, fx: VfxEffect) {
    REGISTRY.set(name,
        fx)
}

/** Lấy hiệu ứng theo tên (undefined nếu chưa có) */
export const getVfx = (name: string): VfxEffect | undefined => REGISTRY.get(name)

/** Tên các hiệu ứng đã đăng ký (để kiểm tra / gỡ lỗi) */
export const vfxNames = (): string[] => [...REGISTRY.keys()]

/** Cách một chiêu được vẽ: kiểu đạn bay, kiểu trúng, màu, độ hoành tráng */
export interface SkillVfx {
    /** Tên hiệu ứng bay từ caster tới mục tiêu (vd "bolt", "slash", "arrow", "fireball", "iceShard", "beam", "none") */
    travel: string;
    /** Tên hiệu ứng khi trúng mỗi mục tiêu (vd "burst", "slashHit", "frostBurst", "explosion", "heal", "shield") */
    impact: string;
    /** Hiệu ứng tại chỗ caster trước khi bay (vd "charge", "none") */
    cast?: string;
    color: number;
    color2?: number;
    /** 1 thường, 2 chiêu cuối */
    intensity?: number;
}
