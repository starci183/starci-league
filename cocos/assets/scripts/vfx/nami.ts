// VFX Nami trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_nami.ts): NƯỚC thật, giọt li ti, bụi nước, bọt trắng,
// ánh sáng mềm, không nét hình học. Phước Lành là giọt nước xoay quanh đồng minh; Dễ Tổn Thương là bụi tím lẫn trong nước.
// Ô đăng ký: basic_nami, nami_p (Dậy Sóng), nami_q (Thuỷ Triều nảy), nami_e (Phước Lành Thuỷ Triều), nami_r (Sóng Thần).
import {
    Node
} from "cc"
import {
    dist, ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    bent, drops, flash, fly, mainOf, motes, nearestIn, power, ring, rise, rowsOf, shift, stunStars, UP, type Path, emit, over, wait
} from "./g1_helpers"

const FOAM = 0xe6fdff
const AQUA = 0x4fd8ff
const TEAL = 0x2fe0c8
const DEEP = 0x1778c4
const NAVY = 0x0b3f7a
const VIOLET = 0xb06cff
const GOLD = 0xffe08a
const MINT = 0x8dffd0
const WATER = [AQUA,
    TEAL,
    FOAM]

/** Khối nước bay: lõi bọt trắng, thân lam, đuôi giọt rơi và bụi nước */
function waterBlob(layer: Node, path: Path, secs: number, size: number): Promise<void> {
    return fly(layer,
        path,
        secs,
        (p) => {
            emit(layer,
                p,
                {
                    color: [FOAM], kind: "glow", life: [0.08,
                        0.12], size: [size * 1.1,
                        size * 0.6], alpha: 1
                })
            emit(layer,
                p,
                {
                    color: [AQUA,
                        TEAL], kind: "glow", life: [0.18,
                        0.26], size: [size * 1.8,
                        size * 0.5], alpha: 0.6
                })
            for (let i = 0; i < 2; i++) emit(layer,
                p,
                {
                    color: WATER, kind: "dot", life: [0.25,
                        0.5], size: [7,
                        2], alpha: 1, speed: [20,
                        90], gravity: -400, spread: size * 0.3
                })
            emit(layer,
                p,
                {
                    color: [DEEP], kind: "dot", additive: false, life: [0.3,
                        0.5], size: [6,
                        2], alpha: 0.8, speed: [10,
                        40], gravity: -600
                })
        },
        ease.inOut)
}

/** Nước đập: vương miện giọt bắn lên rồi rơi, vòng bọt, bụi nước */
function splash(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [FOAM],
        30 * k,
        120 * k,
        0.2)
    flash(layer,
        at,
        [AQUA,
            DEEP],
        60 * k,
        170 * k,
        0.4,
        0.45)
    ring(layer,
        at,
        [FOAM,
            AQUA],
        20,
        170 * k,
        0.35,
        0.8)
    drops(layer,
        at,
        Math.round(20 * k),
        [AQUA,
            DEEP,
            0x5fa8e8],
        {
            speed: [180,
                420]
        })
    motes(layer,
        at,
        Math.round(24 * k),
        WATER,
        {
            speed: [80,
                340]
        })
}

/** Hồi Máu bằng nước: bụi nước mát nổi lên, vòng bọt mỏng */
function soothe(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [MINT,
            AQUA],
        40 * k,
        140 * k,
        0.45,
        0.6)
    ring(layer,
        at,
        [MINT],
        30,
        130 * k,
        0.4,
        0.6)
    void rise(layer,
        at,
        90,
        0.4,
        60,
        [MINT,
            FOAM,
            AQUA])
}

/** Đánh thường: quả cầu nước bay cong, toé nhỏ */
registerSkillVfx("basic_nami",
    async (ctx) => {
        const to = mainOf(ctx)
        flash(ctx.layer,
            ctx.from,
            [AQUA],
            20,
            60,
            0.2,
            0.7)
        await waterBlob(ctx.layer,
            bent(ctx.from,
                to,
                50),
            0.3,
            22)
        splash(ctx.layer,
            to,
            0.6)
        await wait(ctx.layer,
            0.3)
    })

/** P Dậy Sóng: ba dòng bụi nước từ tướng địch vừa trúng đòn bị hút về Nami, cột nước xoáy dâng quanh Nami, ánh AP tím loé */
registerSkillVfx("nami_p",
    async (ctx) => {
        const src = mainOf(ctx)
        flash(ctx.layer,
            src,
            [AQUA],
            30,
            90,
            0.3,
            0.5)
        await Promise.all([-70,
            0,
            70].map((h, i) => fly(ctx.layer,
            bent(src,
                ctx.from,
                h),
            0.5 + i * 0.06,
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: WATER, kind: "dot", life: [0.2,
                            0.35], size: [8,
                            2], alpha: 1, spread: 6
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [AQUA], kind: "glow", life: [0.12,
                            0.18], size: [24,
                            8], alpha: 0.5
                    })
            },
            ease.inOut)))
        // xoáy nước quanh Nami dâng lên
        await over(ctx.layer,
            0.5,
            (t) => {
                for (let i = 0; i < 3; i++) {
                    const a = t * Math.PI * 5 + (i * Math.PI * 2) / 3
                    emit(ctx.layer,
                        {
                            x: ctx.from.x + Math.cos(a) * 46, y: ctx.from.y - 30 + t * 90 + Math.sin(a) * 12
                        },
                        {
                            color: WATER, kind: "dot", life: [0.25,
                                0.4], size: [9,
                                2], alpha: 1
                        })
                }
            })
        flash(ctx.layer,
            ctx.from,
            [VIOLET,
                FOAM],
            40,
            130,
            0.35,
            0.7)
        motes(ctx.layer,
            shift(ctx.from,
                0,
                40),
            14,
            [VIOLET,
                0xe0c8ff],
            {
                angle: [UP - 0.6,
                    UP + 0.6]
            })
        await wait(ctx.layer,
            0.3)
    })

/** Q Thuỷ Triều: dòng nước nảy đồng minh (hồi) -> địch (sát thương) -> đồng minh khác -> địch khác */
registerSkillVfx("nami_q",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const ally1 = mainOf(ctx)
        // mục tiêu đầu là địch (bị gọi lệch) thì vẫn nảy theo thứ tự địch -> đồng minh
        const firstFoe = Math.abs(ally1.y - rows.foe[0].y) < 40
        const foe1 = firstFoe ? ally1 : nearestIn(rows.foe,
            ally1)
        const allyPool = rows.ally.filter((p) => Math.abs(p.x - ally1.x) > 20)
        const ally2 = allyPool[Math.floor(rand(0,
            allyPool.length))] ?? ally1
        const foePool = rows.foe.filter((p) => Math.abs(p.x - foe1.x) > 20)
        const foe2 = foePool[Math.floor(rand(0,
            foePool.length))] ?? foe1
        const hops: [Pt, boolean][] = firstFoe ? [[foe1,
            false],
        [ally2,
            true],
        [foe2,
            false]] : [[ally1,
            true],
        [foe1,
            false],
        [ally2,
            true],
        [foe2,
            false]]
        flash(ctx.layer,
            ctx.from,
            [AQUA,
                FOAM],
            30,
            100,
            0.25,
            0.8)
        let at = ctx.from
        for (const [p, heal] of hops) {
            const same = dist(at,
                p) < 10
            if (!same) await waterBlob(ctx.layer,
                bent(at,
                    p,
                    rand(-80,
                        80)),
                0.26,
                24 * k)
            if (heal) soothe(ctx.layer,
                p,
                k)
            else splash(ctx.layer,
                p,
                0.9 * k)
            at = p
            await wait(ctx.layer,
                0.06)
        }
        await wait(ctx.layer,
            0.35)
    })

/** E Phước Lành Thuỷ Triều: hai dòng nước xoắn chảy sang đồng minh, màn nước bọc thành Khiên, 3 giọt Phước Lành xoay quanh rồi thấm vào */
registerSkillVfx("nami_e",
    async (ctx) => {
        const to = mainOf(ctx)
        flash(ctx.layer,
            ctx.from,
            [AQUA],
            30,
            90,
            0.25,
            0.6)
        if (dist(ctx.from,
            to) > 10) {
            await Promise.all([1,
                -1].map((s) => fly(ctx.layer,
                (t) => {
                    const p = bent(ctx.from,
                        to,
                        s * 60)(t)
                    return shift(p,
                        0,
                        Math.sin(t * Math.PI * 3) * 20 * s)
                },
                0.42,
                (p) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [FOAM,
                                AQUA], kind: "glow", life: [0.12,
                                0.2], size: [22,
                                8], alpha: 0.9
                        })
                    emit(ctx.layer,
                        p,
                        {
                            color: WATER, kind: "dot", life: [0.25,
                                0.4], size: [7,
                                2], alpha: 1, speed: [10,
                                50]
                        })
                },
                ease.inOut)))
        }
        // màn nước bọc lá: vòng giữ lâu + quầng trong
        ring(ctx.layer,
            to,
            [AQUA],
            150,
            165,
            1.1,
            0.7)
        flash(ctx.layer,
            to,
            [TEAL,
                AQUA],
            120,
            150,
            1.0,
            0.3)
        flash(ctx.layer,
            to,
            [FOAM],
            40,
            150,
            0.25,
            0.8)
        // 3 giọt Phước Lành xoay quanh rồi thấm vào
        await over(ctx.layer,
            0.75,
            (t) => {
                const r = 70 * (1 - ease.in(t) * 0.8)
                for (let i = 0; i < 3; i++) {
                    const a = t * Math.PI * 4 + (i * Math.PI * 2) / 3
                    const p = {
                        x: to.x + Math.cos(a) * r, y: to.y + Math.sin(a) * r * 0.6
                    }
                    emit(ctx.layer,
                        p,
                        {
                            color: [FOAM], kind: "glow", life: [0.08,
                                0.12], size: [22,
                                12], alpha: 1
                        })
                    emit(ctx.layer,
                        p,
                        {
                            color: [AQUA,
                                GOLD], kind: "dot", life: [0.2,
                                0.3], size: [8,
                                2], alpha: 1
                        })
                }
            })
        flash(ctx.layer,
            to,
            [GOLD,
                FOAM],
            30,
            110,
            0.3,
            0.8)
        await wait(ctx.layer,
            0.25)
    })

/** R Sóng Thần: con sóng lớn dâng từ phía Nami, mép bọt trắng cuộn tới hàng địch; chạm thì mỗi tướng địch bị nước đổ sập, Choáng, bụi tím Dễ Tổn Thương */
registerSkillVfx("nami_r",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const foes = ctx.to.length > 1 ? ctx.to : rows.foe
        const x0 = Math.min(...foes.map((p) => p.x)) - 110
        const x1 = Math.max(...foes.map((p) => p.x)) + 110
        const y0 = ctx.from.y + rows.up * 30
        const y1 = foes[0].y
        // gom nước: Nami giơ gậy
        flash(ctx.layer,
            ctx.from,
            [AQUA,
                DEEP],
            50,
            180,
            0.45,
            0.6)
        await rise(ctx.layer,
            ctx.from,
            120,
            0.3,
            120,
            WATER,
            {
                speed: [150,
                    300]
            })
        // sóng tiến
        await over(ctx.layer,
            0.75,
            (t) => {
                const y = y0 + (y1 - y0) * ease.inOut(t)
                const n = 6
                for (let i = 0; i < n; i++) {
                    const x = x0 + (x1 - x0) * ((i + Math.random()) / n)
                    const crest = y + Math.sin(x * 0.02 + t * 12) * 10
                    // thân nước lam đậm phía sau mép
                    emit(ctx.layer,
                        {
                            x, y: crest - rows.up * rand(20,
                                60)
                        },
                        {
                            color: [DEEP,
                                NAVY,
                                TEAL], kind: "glow", additive: false, life: [0.25,
                                0.4], size: [70 * k,
                                40], alpha: 0.5
                        })
                    // mép bọt trắng
                    emit(ctx.layer,
                        {
                            x, y: crest
                        },
                        {
                            color: [FOAM,
                                AQUA], kind: "glow", life: [0.12,
                                0.2], size: [46,
                                20], alpha: 0.9
                        })
                    if (Math.random() < 0.6) emit(ctx.layer,
                        {
                            x, y: crest
                        },
                        {
                            color: WATER, kind: "dot", life: [0.3,
                                0.6], size: [7,
                                2], alpha: 1, speed: [120,
                                300], angle: [UP - 0.5,
                                UP + 0.5], gravity: -700
                        })
                }
            })
        // nước đổ sập lên từng tướng địch
        for (const f of foes) {
            splash(ctx.layer,
                f,
                1.2 * k)
            void vulnerable(ctx.layer,
                f)
            void stunStars(ctx.layer,
                f,
                0.7)
        }
        await wait(ctx.layer,
            0.7)
    })

/** Dễ Tổn Thương: bụi tím bám quanh tướng, trôi chậm */
async function vulnerable(layer: Node, at: Pt) {
    await over(layer,
        0.6,
        () => {
            emit(layer,
                {
                    x: at.x + rand(-50,
                        50), y: at.y + rand(-50,
                        40)
                },
                {
                    color: [VIOLET,
                        0xd9b8ff], kind: "dot", life: [0.4,
                        0.7], size: [9,
                        2], alpha: 0.9, speed: [10,
                        40], angle: [UP - 0.6,
                        UP + 0.6]
                })
        })
}
