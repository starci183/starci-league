// VFX Braum trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_braum.ts): BĂNG TRONG XANH và CÁNH CỬA HẦM nẹp đồng.
// Bảng màu lấy từ icon chiêu: navy, lam, lục lam, băng nhạt, trắng lạnh. Q là khối băng phóng từ khiên, E là cửa hầm dựng lên
// chắn đòn thay đồng minh, R là nện khiên xuống đất, khe băng chạy tới hàng địch, rẽ hai bên và trụ băng mọc lên Choáng cả hàng.
// Ô đăng ký: basic_braum, braum_p (Song Giáp), braum_q (Cú Đấm Băng), braum_e (Đứng Sau Tôi), braum_r (Khe Băng).
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    allFoes, flash, fly, mainOf, motes, polar, power, ring, shards, shift, smoke, straight, stunStars, UP, vortex, emit, over, wait, meleeSmash
} from "./g1_helpers"

const ABYSS = 0x061840
const NAVY = 0x0a2a6e
const AZURE = 0x1e7fe0
const ICE = 0x4fd4ff
const PALE = 0xbff0ff
const FROST = 0xeefcff
const WOOD = 0x6e4322
const BRONZE = 0xc08a3e

/** Khối băng thô: tinh thể nhọn mọc chụm từ một gốc, cao thấp lệch nhau. `life` ngắn để vẽ lại mỗi khung khi đang bay */
function iceCluster(layer: Node, at: Pt, size: number, life: number, spin = 0, alpha = 1) {
    const arms = [-1.1,
        -0.6,
        -0.15,
        0.3,
        0.75,
        1.2]
    arms.forEach((o, i) => {
        const len = size * (0.6 + 0.4 * Math.abs(Math.sin(i * 2.3)))
        const a = UP + o + spin
        emit(layer,
            polar(at,
                a,
                len * 0.35),
            {
                color: i % 2 ? [AZURE,
                    NAVY] : [ICE,
                    AZURE], kind: "blade", additive: false, life: [life,
                    life], size: [len,
                    len], alpha, rotation: a, stretch: 1.3
            })
        emit(layer,
            polar(at,
                a,
                len * 0.45),
            {
                color: [FROST,
                    PALE], kind: "blade", life: [life,
                    life], size: [len * 0.6,
                    len * 0.6], alpha: alpha * 0.9, rotation: a, stretch: 1.1
            })
    })
    emit(layer,
        at,
        {
            color: [PALE], kind: "glow", life: [life,
                life], size: [size * 1.4,
                size * 1.4], alpha: alpha * 0.45
        })
}

/** Băng vỡ: quầng trắng lạnh, mảnh sắc văng rồi rơi, bụi băng, sương lạnh */
function shatter(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [FROST],
        40 * k,
        140 * k,
        0.2)
    ring(layer,
        at,
        [ICE,
            PALE],
        20,
        180 * k,
        0.35,
        0.85)
    shards(layer,
        at,
        Math.round(16 * k),
        [FROST,
            PALE,
            ICE,
            AZURE],
        {
            additive: false, gravity: -700, speed: [150,
                420], life: [0.35,
                0.6], size: [24,
                8], stretch: 1.8
        })
    motes(layer,
        at,
        Math.round(24 * k),
        [FROST,
            ICE],
        {
            speed: [60,
                260]
        })
    smoke(layer,
        at,
        Math.round(6 * k),
        [PALE,
            ICE],
        60 * k,
        {
            alpha: 0.35
        })
}

/** Trụ băng dựng từ `base` lên cao h: mảnh băng đứng chồng, mép sáng, chân sương */
function icePillar(layer: Node, base: Pt, h: number, lean: number, life: number) {
    const n = Math.max(4,
        Math.round(h / 18))
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const w = 46 * (1 - t * 0.6)
        const p = shift(base,
            Math.sin(lean) * h * t + rand(-4,
                4),
            h * t)
        emit(layer,
            p,
            {
                color: [AZURE,
                    ICE], kind: "blade", additive: false, life: [life * 0.9,
                    life], size: [w,
                    w * 0.8], alpha: 0.95, rotation: UP + lean, stretch: 1.4
            })
        emit(layer,
            p,
            {
                color: [FROST,
                    PALE], kind: "blade", life: [life * 0.9,
                    life], size: [w * 0.6,
                    w * 0.5], alpha: 0.9, rotation: UP + lean, stretch: 1.2
            })
    }
    flash(layer,
        base,
        [PALE,
            ICE],
        60,
        110,
        life,
        0.35)
}

/** Cửa hầm: ván gỗ sắt nẹp đồng, mép phủ băng; dựng vuông góc với hướng `face`, giữ `life` giây */
function door(layer: Node, at: Pt, face: number, life: number, k = 1) {
    const side = face + UP
    const cols = 6
    for (let i = 0; i < cols; i++) {
        const u = (i - (cols - 1) / 2) * 18 * k
        const p = polar(at,
            side,
            u)
        // ván dọc
        emit(layer,
            p,
            {
                color: [WOOD,
                    0x5a361a], kind: "blade", additive: false, life: [life,
                    life], size: [70 * k,
                    70 * k], alpha: 1, rotation: face, stretch: 0.55
            })
    }
    // hai nẹp đồng ngang và bánh xoay giữa cửa
    for (const v of [-14,
        14]) {
        emit(layer,
            polar(at,
                face,
                v * k),
            {
                color: [BRONZE], kind: "blade", additive: false, life: [life,
                    life], size: [60 * k,
                    40 * k], alpha: 1, rotation: side, stretch: 2.2
            })
    }
    emit(layer,
        at,
        {
            color: [BRONZE], kind: "ring", additive: false, life: [life,
                life], size: [36 * k,
                36 * k], alpha: 1
        })
    // băng phủ mép
    for (let i = 0; i < 8; i++) {
        const u = (i / 7 - 0.5) * 120 * k
        emit(layer,
            polar(polar(at,
                side,
                u),
            face,
            rand(-30,
                30) * k),
            {
                color: [FROST,
                    PALE,
                    ICE], kind: "blade", life: [life * 0.8,
                    life], size: [22,
                    18], alpha: 0.9, rotation: rand(0,
                    Math.PI), stretch: 1.3
            })
    }
    flash(layer,
        at,
        [ICE],
        130 * k,
        150 * k,
        life,
        0.3)
}

/** Đánh thường (cận chiến, không đạn bay). Nện: nắm đấm giáng xuống mục tiêu, vòng sóng băng nhỏ sát đất, bụi băng */
registerSkillVfx("basic_braum",
    async (ctx) => {
        await meleeSmash(ctx.layer, mainOf(ctx), [PALE, ICE, FROST], ICE, [FROST, PALE, AZURE])
    })

/** P Song Giáp: đòn địch dội vào Braum, mảnh giáp băng trắng (Giáp) và lam (Kháng) bay vào khoá quanh thân thành lớp vỏ */
registerSkillVfx("braum_p",
    async (ctx) => {
        const src = mainOf(ctx)
        const me = ctx.from
        const dir = angleOf(me,
            src)
        // nhát đòn chạm
        flash(ctx.layer,
            polar(me,
                dir,
                40),
            [FROST],
            20,
            80,
            0.18)
        shards(ctx.layer,
            polar(me,
                dir,
                40),
            6,
            [PALE,
                FROST],
            {
                angle: [dir - 0.6,
                    dir + 0.6]
            })
        // mảnh giáp hút vào
        await vortex(ctx.layer,
            me,
            120,
            0.4,
            80,
            [FROST,
                PALE,
                AZURE,
                ICE],
            {
                kind: "blade", size: [18,
                    10], align: true, stretch: 1.6
            },
            0.2)
        // hai tấm giáp xoay quanh một vòng rồi khoá
        await over(ctx.layer,
            0.5,
            (t) => {
                for (let i = 0; i < 2; i++) {
                    const a = t * Math.PI * 2 + i * Math.PI
                    const p = {
                        x: me.x + Math.cos(a) * 64, y: me.y + Math.sin(a) * 26
                    }
                    emit(ctx.layer,
                        p,
                        {
                            color: i ? [AZURE,
                                ICE] : [FROST,
                                PALE], kind: "blade", life: [0.08,
                                0.12], size: [30,
                                24], alpha: 1, rotation: a + UP, stretch: 1.4
                        })
                    emit(ctx.layer,
                        p,
                        {
                            color: i ? [ICE] : [FROST], kind: "glow", life: [0.12,
                                0.2], size: [30,
                                10], alpha: 0.6
                        })
                }
            })
        ring(ctx.layer,
            me,
            [PALE,
                ICE],
            120,
            140,
            0.5,
            0.8)
        flash(ctx.layer,
            me,
            [ICE],
            60,
            150,
            0.4,
            0.4)
        await wait(ctx.layer,
            0.3)
    })

/** Q Cú Đấm Băng: băng tụ trước khiên, khối băng lăn tới mục tiêu kéo đuôi bụi lạnh, vỡ tung, rồi Dấu Băng đóng cụm trên mục tiêu */
registerSkillVfx("braum_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        const hand = polar(ctx.from,
            dir,
            50)
        await vortex(ctx.layer,
            hand,
            70,
            0.25,
            90,
            [FROST,
                ICE,
                AZURE])
        iceCluster(ctx.layer,
            hand,
            34,
            0.15)
        await fly(ctx.layer,
            straight(hand,
                to),
            0.3,
            (p, t) => {
                iceCluster(ctx.layer,
                    p,
                    38 * k,
                    0.05,
                    t * 6)
                emit(ctx.layer,
                    p,
                    {
                        color: [PALE,
                            ICE], kind: "glow", additive: false, life: [0.3,
                            0.45], size: [40,
                            18], alpha: 0.35
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [FROST,
                            ICE], kind: "dot", life: [0.3,
                            0.55], size: [7,
                            2], alpha: 1, speed: [20,
                            90], spread: 10
                    })
            })
        shatter(ctx.layer,
            to,
            1.1 * k)
        // Dấu Băng: cụm băng đóng trên mục tiêu, bụi băng rơi lả tả
        iceCluster(ctx.layer,
            shift(to,
                0,
                -10),
            42,
            1.0)
        await over(ctx.layer,
            0.8,
            () => {
                if (Math.random() < 0.5) emit(ctx.layer,
                    shift(to,
                        rand(-40,
                            40),
                        rand(10,
                            60)),
                    {
                        color: [FROST,
                            PALE], kind: "dot", life: [0.4,
                            0.6], size: [6,
                            2], alpha: 1, speed: [10,
                            40], angle: [-UP - 0.3,
                            -UP + 0.3]
                    })
            })
    })

/** E Đứng Sau Tôi (Quick, chỉ nối Chuỗi): luồng lạnh bật khỏi Braum, cửa hầm dựng chắn phía địch, đòn bay tới vỡ vụn trên cửa */
registerSkillVfx("braum_e",
    async (ctx) => {
        const k = power(ctx)
        const foe = mainOf(ctx)
        const face = dist(foe,
            ctx.from) > 10 ? angleOf(ctx.from,
                foe) : UP
        const wall = polar(ctx.from,
            face,
            85)
        // dấu Quick: luồng lạnh bung khỏi chỗ đứng
        ring(ctx.layer,
            ctx.from,
            [ICE,
                FROST],
            30,
            150,
            0.3,
            0.8)
        motes(ctx.layer,
            ctx.from,
            18,
            [FROST,
                ICE],
            {
                speed: [150,
                    320]
            })
        await wait(ctx.layer,
            0.1)
        door(ctx.layer,
            wall,
            face,
            1.2,
            k)
        flash(ctx.layer,
            ctx.from,
            [ICE,
                PALE],
            80,
            140,
            1.2,
            0.35)
        // ba đòn đánh tới vỡ trên mặt cửa
        const src = dist(foe,
            ctx.from) > 10 ? foe : polar(ctx.from,
                face,
                300)
        for (let i = 0; i < 3; i++) {
            const hit = polar(polar(wall,
                face + UP,
                rand(-40,
                    40)),
            face,
            12)
            await fly(ctx.layer,
                straight(src,
                    hit),
                0.16,
                (p, _t, d) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [0xffb27a,
                                0xff7a4a], kind: "blade", life: [0.06,
                                0.1], size: [26,
                                8], alpha: 0.9, rotation: d, stretch: 2.4
                        })
                })
            flash(ctx.layer,
                hit,
                [FROST],
                20,
                90,
                0.16)
            shards(ctx.layer,
                hit,
                6,
                [FROST,
                    PALE,
                    ICE],
                {
                    angle: [face + Math.PI - 0.9,
                        face + Math.PI + 0.9], speed: [120,
                        300]
                })
            await wait(ctx.layer,
                0.08)
        }
        await wait(ctx.layer,
            0.45)
    })

/** R Khe Băng: nhấc khiên, nện xuống đất, khe băng chạy tới hàng địch rồi rẽ hai bên; trụ băng mọc lên dưới mỗi tướng địch (Choáng) */
registerSkillVfx("braum_r",
    async (ctx) => {
        const k = power(ctx)
        const foes = allFoes(ctx)
        const front = mainOf(ctx)
        const head = {
            x: ctx.from.x, y: foes[0].y
        }
        // nhấc khiên: băng tụ quanh Braum
        await vortex(ctx.layer,
            ctx.from,
            110,
            0.35,
            120,
            [FROST,
                ICE,
                AZURE])
        // nện: chớp trắng lam, vòng sóng, mảnh băng
        flash(ctx.layer,
            ctx.from,
            [FROST],
            60,
            220,
            0.25)
        ring(ctx.layer,
            ctx.from,
            [ICE],
            40,
            300 * k,
            0.4,
            0.9)
        shatter(ctx.layer,
            ctx.from,
            1.2)
        // khe băng chạy thẳng tới hàng địch
        const crack = (a: Pt, b: Pt, secs: number) => fly(ctx.layer,
            straight(a,
                b),
            secs,
            (p, _t, d) => {
                emit(ctx.layer,
                    shift(p,
                        rand(-6,
                            6),
                        rand(-6,
                            6)),
                    {
                        color: [FROST,
                            ICE], kind: "blade", life: [0.9,
                            1.1], size: [30,
                            26], alpha: 1, rotation: d + rand(-0.5,
                            0.5), stretch: 1.6
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [NAVY,
                            ABYSS], kind: "blade", additive: false, life: [0.8,
                            1], size: [26,
                            22], alpha: 0.8, rotation: d + rand(-0.4,
                            0.4), stretch: 1.4
                    })
                if (Math.random() < 0.35) icePillar(ctx.layer,
                    shift(p,
                        rand(-14,
                            14),
                        0),
                    rand(30,
                        60),
                    rand(-0.4,
                        0.4),
                    0.7)
                emit(ctx.layer,
                    p,
                    {
                        color: [PALE], kind: "dot", life: [0.3,
                            0.6], size: [7,
                            2], alpha: 1, speed: [60,
                            200], angle: [UP - 0.8,
                            UP + 0.8]
                    })
            },
            ease.linear)
        await crack(ctx.from,
            head,
            0.32)
        // rẽ hai bên dọc hàng địch
        const left = {
            x: Math.min(...foes.map((p) => p.x)), y: head.y
        }
        const right = {
            x: Math.max(...foes.map((p) => p.x)), y: head.y
        }
        await Promise.all([crack(head,
            left,
            0.3),
        crack(head,
            right,
            0.3)])
        // trụ băng bật lên dưới mỗi tướng, tướng đối diện trụ cao nhất
        for (const f of foes) {
            const tall = dist(f,
                front) < 20
            icePillar(ctx.layer,
                shift(f,
                    -30,
                    -60),
                (tall ? 170 : 120) * k,
                -0.15,
                1.0)
            icePillar(ctx.layer,
                shift(f,
                    30,
                    -60),
                (tall ? 150 : 100) * k,
                0.18,
                1.0)
            shatter(ctx.layer,
                f,
                tall ? 1.1 : 0.8)
            void stunStars(ctx.layer,
                f,
                tall ? 0.9 : 0.6,
                [FROST,
                    ICE])
        }
        await wait(ctx.layer,
            0.9)
    })
