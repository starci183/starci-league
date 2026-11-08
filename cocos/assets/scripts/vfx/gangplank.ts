// VFX Gangplank trên Cocos, theo thiết kế bản web (fx_gangplank.ts): thùng thuốc súng gỗ đai đồng, ngòi cháy tàn vàng, nổ cầu lửa
// cam có khói đen và dăm gỗ; cam thật nước cam văng; lệnh truy nã giấy da. Ô: basic_gangplank, gangplank_p/q/e/r.
import {
    Node
} from "cc"
import {
    dist, mix, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeSlash
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    UP, DOWN, TAU, add, aim, debris, fireBlast, flames, fly, gather, glow, laneGap, lob, main, motes, polar, pow, pulse, ring, settle,
    slashArc, smoke, sparks
} from "./g2_helpers"

const FIRE = [0xffd060, 0xff9a30, 0xff6a10]
const GOLD = 0xffd56a
const STEEL = 0xf2ead8
const WOOD = [0x6b4424, 0x8a5a30, 0x4a2c16]
const COPPER = 0xc8803a
const POWDER = [0x1c1612, 0x2e2520]
const ORANGE = [0xff9a1a, 0xffb84a, 0xffd27a]

/** Ô phụ (chỗ đặt Thùng) nằm cạnh Gangplank trên hàng mình */
const kegSpot = (from: Pt, gap: number): Pt => add(from,
    gap * 0.62,
    -18)

/** Thùng gỗ đai đồng dựng bằng hạt: thân gỗ đặc, hai đai đồng, miệng đầy bột đen; hiện dần trong `secs` */
async function keg(layer: Node, at: Pt, secs: number, life: number) {
    await pulse(layer,
        secs,
        160,
        () => {
            // thân phình giữa: rải theo hình elip đứng
            const v = rand(-1,
                1)
            const w = 26 * (1 - v * v * 0.35)
            emit(layer,
                {
                    x: at.x + rand(-w,
                        w), y: at.y + v * 30
                },
                {
                    color: WOOD, kind: "dot", additive: false, life: [life,
                        life * 1.1], size: [16,
                        14], alpha: 1
                })
        })
    // hai đai đồng + miệng thùng bột đen
    for (const dy of [-16,
        16]) for (let i = -3; i <= 3; i++) emit(layer,
        {
            x: at.x + i * 8, y: at.y + dy
        },
        {
            color: [COPPER, 0xe6a050], kind: "blade", additive: false, life: [life * 0.9,
                life], size: [12,
                10], alpha: 1, rotation: 0, stretch: 1
        })
    for (let i = -2; i <= 2; i++) emit(layer,
        {
            x: at.x + i * 7, y: at.y + 30
        },
        {
            color: POWDER, kind: "dot", additive: false, life: [life * 0.9,
                life], size: [12,
                10], alpha: 1
        })
}

/** Ngòi cháy trên đỉnh thùng: tàn vàng xèo xèo bắn lên */
function fuse(layer: Node, at: Pt, secs: number) {
    return pulse(layer,
        secs,
        70,
        () => {
            emit(layer,
                at,
                {
                    color: [0xffffff, GOLD, 0xff9a30], kind: "dot", life: [0.15,
                        0.35], size: [7,
                        2], alpha: 1, speed: [60,
                        200], angle: [UP - 1,
                        UP + 1], gravity: -300
                })
            if (Math.random() < 0.3) emit(layer,
                at,
                {
                    color: POWDER, kind: "glow", additive: false, life: [0.4,
                        0.7], size: [10,
                        26], alpha: 0.4, speed: [10,
                        40], angle: [UP - 0.3,
                        UP + 0.3], gravity: 40
                })
        })
}

/** Nổ thùng: cầu lửa cam, dăm gỗ, khói đen, đai đồng văng */
function kegBlast(layer: Node, at: Pt, k: number) {
    fireBlast(layer,
        at,
        k,
        FIRE)
    debris(layer,
        at,
        Math.round(12 * k),
        WOOD,
        20)
    debris(layer,
        at,
        Math.round(4 * k),
        [COPPER],
        16)
    smoke(layer,
        at,
        Math.round(6 * k),
        POWDER,
        40 * k,
        110 * k)
}

/** Đánh thường: kiếm cong chém, hai vết trăng khuyết mảnh ngay trên mục tiêu */
registerSkillVfx("basic_gangplank",
    (ctx) => meleeSlash(ctx.layer,
            main(ctx),
            aim(ctx),
            [STEEL, GOLD, 0xffb952],
            2))

/**
 * Nội tại Thuốc Súng: bột đen trút xuống Thùng, ngòi loé. Có mục tiêu (đòn của Gangplank vào Thùng kích nổ) thì một tia ngòi
 * cháy chạy tới mục tiêu và thùng nổ nhỏ tại đó.
 */
registerSkillVfx("gangplank_p",
    async (ctx) => {
        const g = laneGap(ctx)
        const spot = kegSpot(ctx.from,
            g)
        // bột đen rơi như cát đổ vào miệng thùng
        void pulse(ctx.layer,
            0.45,
            90,
            () => emit(ctx.layer,
                add(spot,
                    rand(-10,
                        10),
                    120),
                {
                    color: POWDER, kind: "dot", additive: false, life: [0.3,
                        0.36], size: [8,
                        6], alpha: 1, speed: [280,
                        360], angle: [DOWN - 0.05,
                        DOWN + 0.05]
                }))
        await keg(ctx.layer,
            spot,
            0.3,
            0.9)
        await fuse(ctx.layer,
            add(spot,
                8,
                40),
            0.35)
        const to = ctx.to[0]
        if (to && dist(to,
            spot) > 60) {
            // tia ngòi cháy bò tới đích
            await fly(ctx.layer,
                0.3,
                (u) => mix(spot,
                    to,
                    u),
                (p) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [0xffffff, GOLD], kind: "glow", life: [0.1,
                                0.16], size: [26,
                                8], alpha: 1
                        })
                    motes(ctx.layer,
                        p,
                        2,
                        [GOLD, 0xff9a30],
                        [40,
                            160],
                        {
                            life: [0.2,
                                0.4], gravity: -300
                        })
                })
            kegBlast(ctx.layer,
                to,
                0.8)
        } else {
            kegBlast(ctx.layer,
                spot,
                0.5)
        }
        await settle(ctx.layer,
            0.6)
    })

/**
 * Q Ăn Cam: không có mục tiêu. Ba quả cam tròn bay vào tay Gangplank, cắn là nước cam văng, sinh lực cam vàng dâng lên (hồi
 * máu), vảy đồng xoay quanh thân rồi khép lại (Giáp tạm).
 */
registerSkillVfx("gangplank_q",
    async (ctx) => {
        const at = ctx.from
        const k = pow(ctx)
        // ba quả cam bay vòng vào
        await Promise.all([0,
            1,
            2].map(async (i) => {
            await wait(ctx.layer,
                i * 0.08)
            const s = polar(at,
                UP + (i - 1) * 0.9,
                150)
            await fly(ctx.layer,
                0.28,
                (u) => lob(s,
                    at,
                    50,
                    u),
                (p) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [0xff9a1a], kind: "dot", additive: false, life: [0.06,
                                0.08], size: [26,
                                26], alpha: 1
                        })
                    emit(ctx.layer,
                        add(p,
                            -5,
                            5),
                        {
                            color: [0xffd27a], kind: "dot", life: [0.06,
                                0.08], size: [9,
                                9], alpha: 0.9
                        })
                    emit(ctx.layer,
                        add(p,
                            0,
                            13),
                        {
                            color: [0x3e8a2a], kind: "blade", additive: false, life: [0.06,
                                0.08], size: [12,
                                12], alpha: 1, rotation: 0.5, stretch: 1
                        })
                })
        }))
        // cắn: nước cam văng, múi cam
        glow(ctx.layer,
            at,
            [0xffd27a],
            40,
            150,
            0.25)
        motes(ctx.layer,
            at,
            26,
            ORANGE,
            [140,
                380],
            {
                gravity: -700, size: [10,
                    3], additive: false
            })
        sparks(ctx.layer,
            at,
            8,
            [0xff9a1a, 0xffe0a0],
            [160,
                320],
            {
                additive: false, gravity: -600, align: false, spin: [-10,
                    10], stretch: 1.4
            })
        // hồi máu: sinh lực cam vàng dâng lên
        void pulse(ctx.layer,
            0.7,
            60,
            () => emit(ctx.layer,
                add(at,
                    rand(-50,
                        50),
                    rand(-50,
                        0)),
                {
                    color: [0xffe08a, 0xb8ff7a, 0xffc04a], kind: "glow", life: [0.5,
                        0.8], size: [22,
                        6], alpha: 0.85, speed: [50,
                        120], angle: [UP - 0.2,
                        UP + 0.2]
                }))
        ring(ctx.layer,
            at,
            [0xffc04a],
            40,
            180 * k,
            0.5,
            0.7)
        // Giáp: vảy đồng xoay quanh rồi khép lại
        await pulse(ctx.layer,
            0.7,
            70,
            (t) => {
                const a = t * TAU * 2 + rand(0,
                    TAU)
                const r = 78 - 26 * t
                emit(ctx.layer,
                    polar(at,
                        a,
                        r),
                    {
                        color: [COPPER, 0xe6a050, GOLD], kind: "blade", additive: false, life: [0.22,
                            0.32], size: [18,
                            12], alpha: 1, rotation: a + UP, stretch: 1.2
                    })
            })
        ring(ctx.layer,
            at,
            [COPPER, GOLD],
            150,
            90,
            0.3,
            0.9)
        await settle(ctx.layer,
            0.4)
    })

/**
 * E Thùng Thuốc Súng: lá rời tay lật úp thành Thùng ở ô phụ cạnh Gangplank, đối thủ không thấy bên trong. Bột đen trút 3 lần
 * (3 Thuốc Súng), ngòi châm cháy. Không gây sát thương nên không bay tới địch.
 */
registerSkillVfx("gangplank_e",
    async (ctx) => {
        const g = laneGap(ctx)
        const spot = kegSpot(ctx.from,
            g)
        // lá bay vồng từ tay sang ô phụ, xoay lật
        await fly(ctx.layer,
            0.32,
            (u) => lob(ctx.from,
                spot,
                90,
                u),
            (p, _d, t) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [0xf0dcb0, 0xc8a070], kind: "blade", additive: false, life: [0.08,
                            0.1], size: [40,
                            40], alpha: 1, rotation: t * TAU, stretch: 0.8
                    })
                motes(ctx.layer,
                    p,
                    1,
                    [GOLD],
                    [10,
                        40],
                    {
                        life: [0.2,
                            0.3]
                    })
            })
        // đáp: bụi gỗ, thùng hiện
        ring(ctx.layer,
            spot,
            [0xc8a070],
            30,
            150,
            0.35,
            0.6,
            false)
        smoke(ctx.layer,
            add(spot,
                0,
                -20),
            5,
            [0x8a7058, 0x6a5440],
            30,
            60)
        void keg(ctx.layer,
            spot,
            0.25,
            1.4)
        // ba lần bột đen trút xuống, mỗi lần đai đồng loé
        for (let i = 0; i < 3; i++) {
            await pulse(ctx.layer,
                0.16,
                120,
                () => emit(ctx.layer,
                    add(spot,
                        rand(-12,
                            12),
                        110),
                    {
                        color: POWDER, kind: "dot", additive: false, life: [0.24,
                            0.28], size: [9,
                            6], alpha: 1, speed: [300,
                            380], angle: [DOWN - 0.04,
                            DOWN + 0.04]
                    }))
            glow(ctx.layer,
                add(spot,
                    0,
                    30),
                [GOLD],
                20,
                70,
                0.2,
                0.7)
        }
        await fuse(ctx.layer,
            add(spot,
                8,
                42),
            0.55)
        await settle(ctx.layer,
            0.3)
    })

/**
 * R Lệnh Truy Nã: giấy truy nã da cũ đóng vào tướng địch (bất kỳ đường), dấu vàng khoá lên nó; rồi Thùng kích nổ: pháo kích
 * dội xuống đúng tướng bị truy nã (mọi thùng nổ chỉ vào nó), cầu lửa cuối to nhất, tiền vàng toé.
 */
registerSkillVfx("gangplank_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const g = laneGap(ctx)
        const spot = kegSpot(ctx.from,
            g)
        // pháo hiệu bắn lên trời
        await fly(ctx.layer,
            0.25,
            (u) => add(ctx.from,
                0,
                u * 220),
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [0xffffff, GOLD], kind: "glow", life: [0.1,
                            0.14], size: [26,
                            10], alpha: 1
                    })
                motes(ctx.layer,
                    p,
                    2,
                    [0xff6a10, GOLD],
                    [20,
                        80],
                    {
                        gravity: -200
                    })
            })
        // giấy truy nã: tờ da hiện trên đầu mục tiêu, dấu vàng thu vào
        const poster = add(to,
            0,
            70)
        for (let i = 0; i < 26; i++) emit(ctx.layer,
            {
                x: poster.x + rand(-34,
                    34), y: poster.y + rand(-42,
                    42)
            },
            {
                color: [0xe8d2a0, 0xd8bc84], kind: "dot", additive: false, life: [0.9,
                    1.0], size: [22,
                    20], alpha: 0.95
            })
        for (let i = -2; i <= 2; i++) emit(ctx.layer,
            add(poster,
                0,
                i * 12),
            {
                color: [0x5a3a1c], kind: "blade", additive: false, life: [0.9,
                    1.0], size: [i === -2 || i === 2 ? 14 : 20,
                    18], alpha: 0.9, rotation: 0, stretch: 2.4
            })
        ring(ctx.layer,
            to,
            [GOLD],
            180 * k,
            70,
            0.45,
            0.95)
        ring(ctx.layer,
            to,
            [0xff4020],
            180,
            100,
            0.5,
            0.6)
        await gather(ctx.layer,
            to,
            130,
            0.3,
            120,
            {
                color: [GOLD, 0xff9a30]
            })
        // ngòi từ ô phụ cháy thẳng tới tướng bị truy nã
        void fly(ctx.layer,
            0.3,
            (u) => mix(spot,
                to,
                u),
            (p) => emit(ctx.layer,
                p,
                {
                    color: [GOLD, 0xffffff], kind: "glow", life: [0.12,
                        0.2], size: [24,
                        6], alpha: 1
                }))
        kegBlast(ctx.layer,
            spot,
            0.6)
        // pháo kích: đạn đen rơi xiên từ trời xuống quanh mục tiêu
        const shots = 4
        await Promise.all(Array.from({
            length: shots
        },
        async (_v, i) => {
            await wait(ctx.layer,
                0.08 + i * 0.12)
            const last = i === shots - 1
            const hit = last ? to : add(to,
                rand(-60,
                    60),
                rand(-40,
                    40))
            const sky = add(hit,
                rand(-140,
                    -60),
                520)
            await fly(ctx.layer,
                0.26,
                (u) => mix(sky,
                    hit,
                    u),
                (p, d) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [0x1a1410], kind: "dot", additive: false, life: [0.05,
                                0.07], size: [22,
                                22], alpha: 1
                        })
                    emit(ctx.layer,
                        p,
                        {
                            color: [0xff9a30, GOLD], kind: "blade", life: [0.12,
                                0.2], size: [26,
                                8], alpha: 0.8, rotation: d, stretch: 2.4
                        })
                },
                (t) => t * t)
            if (last) {
                kegBlast(ctx.layer,
                    hit,
                    1.0 * k)
                ring(ctx.layer,
                    hit,
                    [0xffd060],
                    30,
                    220 * k,
                    0.5,
                    0.8)
                // tiền vàng toé
                motes(ctx.layer,
                    hit,
                    18,
                    [GOLD, 0xfff0a0],
                    [160,
                        420],
                    {
                        gravity: -900, size: [12,
                            9], life: [0.6,
                            1.0], angle: [0.3,
                            Math.PI - 0.3]
                    })
            } else {
                fireBlast(ctx.layer,
                    hit,
                    0.55,
                    FIRE)
                ring(ctx.layer,
                    hit,
                    [0x8a7058],
                    20,
                    130,
                    0.35,
                    0.5,
                    false)
            }
        }))
        flames(ctx.layer,
            to,
            10,
            FIRE,
            34,
            40)
        await settle(ctx.layer,
            0.7)
    })

