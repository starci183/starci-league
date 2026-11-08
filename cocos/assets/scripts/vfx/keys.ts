// Danh sách mọi khoá VFX: mỗi tướng P/Q/E/R + đòn đánh thường, mỗi phép bổ trợ, kèm tên tiếng Việt và màu theo chiêu.
// Dùng cho màn xem thử VFX (screens/VfxGalleryScreen.ts); hasCustom cho biết khoá đã có hiệu ứng riêng hay còn một hạt.
import {
    cg
} from "../shared"
import {
    SPELLS
} from "../shared/cardgame/deck"
import {
    SPELL_VI
} from "../shared/cardgame/spells"
import {
    heroBasicVfx
} from "./heroMap.gen"
import {
    effectOf, oneParticle, skillKey, spellStyle, styleOf
} from "./registry"
import type {
    SkillVfx
} from "./types"

export interface VfxKeyInfo {
    key: string;
    /** Mã tướng; thiếu với phép bổ trợ */
    hero?: string;
    label: string;
    style: SkillVfx;
}

const SLOTS = ["p", "q", "e", "r"] as const

/** Mọi khoá: tướng (P, Q, E, R, đánh thường) rồi các phép bổ trợ */
export function allSkillKeys(): VfxKeyInfo[] {
    const out: VfxKeyInfo[] = []
    for (const h of cg.allHeroes()) {
        for (const k of SLOTS) {
            const name = k === "p" ? h.passive.name : h.skills[k.toUpperCase() as "Q" | "E" | "R"].name
            out.push({
                key: skillKey(h.id,
                    k),
                hero: h.id,
                label: `${h.name} ${k.toUpperCase()}: ${name}`,
                style: styleOf(h.id,
                    k),
            })
        }
        out.push({
            key: `basic_${h.id}`,
            hero: h.id,
            label: `${h.name}: Đánh thường`,
            style: heroBasicVfx(h.id,
                h.damage,
                h.role),
        })
    }
    for (const sp of SPELLS) {
        out.push({
            key: `spell_${sp}`,
            label: `Phép ${SPELL_VI[sp].name}`,
            style: spellStyle(sp),
        })
    }
    return out
}

/** Khoá đã đăng ký hiệu ứng riêng (khác hiệu ứng một hạt mặc định) */
export const hasCustom = (key: string): boolean => effectOf(key) !== oneParticle
