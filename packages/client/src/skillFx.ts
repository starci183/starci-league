// Hiệu ứng tung chiêu theo id chiêu. Tướng mới: thêm một dòng ở đây (không có thì dùng hiệu ứng mặc định).
import {
    Role
} from "@starci/shared"
import {
    Fx, Pos
} from "./fx"

export interface FxCtx {
  fx: Fx;
  /** Vị trí người tung */
  from: Pos;
  /** Mục tiêu được chọn (nếu có) */
  target?: Pos;
  /** Mọi vị trí bị trúng (tướng hoặc trụ) */
  hits: Pos[];
}

const last = (c: FxCtx) => c.hits[c.hits.length - 1] ?? c.target ?? c.from
const above = (p: Pos, dy = 40) => ({
    x: p.x, y: p.y - dy
})

export const SKILL_FX: Record<string, (c: FxCtx) => void> = {
    // Kog'Maw
    kogmaw_q: async (c) => {
        if (!c.target) return
        await c.fx.projectile(c.from,
            c.target,
            0x9be05a,
            {
                tex: "fx-dot", scale: 1.6, arc: 30
            })
        c.fx.burst(c.target,
            0x9be05a,
            28,
            200)
    },
    kogmaw_w: (c) => { c.fx.ring(c.from,
        0xb070ff,
        70,
        700); c.fx.burst(c.from,
        0xb070ff,
        30,
        140) },
    kogmaw_e: (c) => { c.fx.beam(c.from,
        last(c),
        0x7acc3a,
        22,
        600); c.hits.forEach((h) => c.fx.burst(h,
        0x9be05a,
        20)) },
    kogmaw_r: async (c) => {
        if (!c.target) return
        await c.fx.projectile(above(c.from,
            20),
        c.target,
        0xb070ff,
        {
            tex: "fx-dot", scale: 2.4, arc: 220, duration: 650
        })
        c.fx.burst(c.target,
            0xb070ff,
            40,
            260)
        c.fx.ring(c.target,
            0x9be05a,
            70)
    },
    // Ashe
    ashe_w: (c) => c.hits.forEach((h, i) => setTimeout(async () => {
        await c.fx.projectile(c.from,
            h,
            0xbfd8ff,
            {
                scale: 1.1
            })
        c.fx.burst(h,
            0xcff8ff,
            14,
            140,
            "fx-shard")
    },
    i * 70)),
    ashe_r: async (c) => {
        if (!c.target) return
        c.fx.banner("Đại Băng Tiễn",
            "#cfe0ff")
        await c.fx.projectile(c.from,
            c.target,
            0x9ff0ff,
            {
                scale: 2.6, duration: 700
            })
        c.fx.burst(c.target,
            0x9ff0ff,
            40,
            260,
            "fx-shard",
            800)
        c.fx.stars(c.target,
            0x9ff0ff)
    },
    // Lux
    lux_q: async (c) => {
        if (!c.target) return
        await c.fx.projectile(c.from,
            c.target,
            0xfff0a0,
            {
                tex: "fx-dot", scale: 1.6
            })
        c.fx.ring(c.target,
            0xfff0a0,
            40)
        c.fx.stars(c.target,
            0xfff0a0)
    },
    lux_w: (c) => c.fx.shield(c.target ?? c.from,
        0xfff0a0),
    lux_r: (c) => {
        c.fx.banner("Cầu Vồng Tối Thượng",
            "#fff0a0")
        c.fx.beam(c.from,
            last(c),
            0xffe066,
            30,
            800)
        c.fx.beam(c.from,
            last(c),
            0xff80ff,
            12,
            800)
        c.hits.forEach((h) => c.fx.burst(h,
            0xfff0a0,
            26,
            220))
    },
    // Lissandra
    lissandra_q: (c) => {
        c.hits.forEach(async (h, i) => {
            await c.fx.projectile(i ? c.hits[0] : c.from,
                h,
                0x9ff0ff,
                {
                    tex: "fx-shard", scale: 1.2
                })
            c.fx.burst(h,
                0x9ff0ff,
                18,
                180,
                "fx-shard")
        })
    },
    lissandra_r: async (c) => {
        if (!c.target) return
        await c.fx.projectile(c.from,
            c.target,
            0x9ff0ff,
            {
                tex: "fx-shard", scale: 1.6
            })
        c.fx.burst(c.target,
            0x9ff0ff,
            40,
            260,
            "fx-shard",
            900)
        c.fx.ring(c.target,
            0xcff8ff,
            70,
            800)
    },
    // Blitzcrank
    blitzcrank_q: (c) => { if (c.target) c.fx.chain(c.from,
        c.target,
        0xf5c542) },
    blitzcrank_e: (c) => { const t = c.hits[0]; if (t) { c.fx.slash(t,
        0xf5c542); c.fx.stars(t) } },
    // Braum
    braum_q: async (c) => {
        const t = c.hits[0]
        if (!t) return
        await c.fx.projectile(c.from,
            t,
            0xbfe4ff,
            {
                tex: "fx-shard", scale: 1.5
            })
        c.fx.burst(t,
            0xbfe4ff,
            20,
            160,
            "fx-shard")
    },
    braum_e: (c) => c.hits.forEach((h) => c.fx.shield(h,
        0xbfe4ff)),
    // Kha'Zix
    khazix_q: (c) => { if (c.target) { c.fx.beam(c.from,
        c.target,
        0xb070ff,
        6,
        260); c.fx.slash(c.target,
        0xb070ff) } },
    // Aatrox
    aatrox_q: (c) => c.hits.forEach((h) => { c.fx.slash(h,
        0xff5040); c.fx.burst(h,
        0xff3020,
        16) }),
    // Janna
    janna_e: (c) => c.fx.shield(c.target ?? c.from,
        0x8affd0),
    janna_r: (c) => { c.fx.ring(c.from,
        0x8affd0,
        90,
        900); c.hits.forEach((h) => c.fx.burst(h,
        0x8affd0,
        20,
        100)) },
    // Katarina
    katarina_q: async (c) => {
        if (!c.target) return
        await c.fx.projectile(c.from,
            c.target,
            0xff4d6d,
            {
                scale: 1.1, arc: 50
            })
        c.fx.slash(c.target,
            0xff4d6d)
    },
    katarina_r: (c) => c.hits.forEach((h, i) => setTimeout(() => c.fx.slash(h,
        0xff4d6d),
    i * 110)),
}

/** Hiệu ứng đánh thường theo vai trò */
export async function attackFx(role: Role, fx: Fx, from: Pos, to: Pos, empowered: boolean) {
    switch (role) {
    case "marksman":
        if (empowered) {
            for (let i = 0; i < 3; i++) { fx.projectile(from,
                to,
                0xff7a3d,
                {
                    scale: 1.1
                }); await new Promise((r) => setTimeout(r,
                90)) }
        } else await fx.projectile(from,
            to,
            0xfff0c0)
        fx.burst(to,
            0xffd080,
            12)
        break
    case "mage":
        await fx.projectile(from,
            to,
            0xb48cff,
            {
                tex: "fx-dot", scale: 1.5, arc: 30
            })
        fx.burst(to,
            0xb48cff,
            20)
        break
    default:
        fx.slash(to,
            role === "assassin" ? 0xff4d6d : role === "tank" ? 0xffd36a : 0xffffff)
    }
}

export const SPELL_FX: Record<string, (c: FxCtx) => void> = {
    cau_lua: async (c) => {
        if (!c.target) return
        await c.fx.projectile({
            x: 545, y: 760
        },
        c.target,
        0xff6a1a,
        {
            tex: "fx-dot", scale: 2.2, arc: 80
        })
        c.fx.burst(c.target,
            0xff8a3d,
            34,
            260)
        c.fx.ring(c.target,
            0xff6a1a,
            60)
    },
    hoi_phuc: (c) => { if (c.target) { c.fx.burst(c.target,
        0x5cc08a,
        26,
        90); c.fx.ring(c.target,
        0x5cc08a,
        50) } },
}
