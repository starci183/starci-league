// Hiệu ứng trình diễn theo sự kiện engine (không thuộc chiêu): tướng ra sân / hồi sinh / bị hạ, mất mạng, rút bài, dải chữ lớn
// giữa màn, rung màn hình. Chỉ dùng tween của cc và Graphics vẽ bằng code; mọi node tạm tự huỷ khi xong.
import {
    Color, Graphics, Node, UIOpacity, Vec3, tween
} from "cc"
import {
    C, withAlpha
} from "../../dna/theme"
import {
    cg
} from "../../shared"
import {
    Frame, box, text
} from "../../ui/kit"
import {
    cardBack
} from "../../ui/matchCard"

interface Pt {
    x: number;
    y: number
}

type Ease = "sineOut" | "quadOut" | "sineIn" | "linear"

/** Đợi `sec` giây trên một node (tween chạy theo node nên dừng khi node bị huỷ) */
function wait(n: Node, sec: number): Promise<void> {
    return new Promise<void>((resolve) => {
        tween(n).delay(sec).call(() => resolve()).start()
    })
}

/** Chạy một tween trên node, xong thì resolve */
function run(n: Node, sec: number, props: Record<string, unknown>, easing: Ease = "sineOut"): Promise<void> {
    return new Promise<void>((resolve) => {
        tween(n).to(sec,
            props,
            {
                easing
            }).call(() => resolve()).start()
    })
}

function fade(op: UIOpacity, sec: number, to: number, delay = 0): Promise<void> {
    return new Promise<void>((resolve) => {
        tween(op).delay(delay).to(sec,
            {
                opacity: to
            }).call(() => resolve()).start()
    })
}

/** Node Graphics riêng đặt tại (x, y) của layer, kèm UIOpacity */
function gfx(layer: Node, name: string, at: Pt): {
    node: Node; g: Graphics; op: UIOpacity
} {
    const node = box(name,
        layer,
        10,
        10,
        at.x,
        at.y)
    const g = node.addComponent(Graphics)
    const op = node.addComponent(UIOpacity)
    return {
        node, g, op
    }
}

/** Vòng sáng nở ra rồi mờ dần */
async function ring(layer: Node, at: Pt, color: Color, from: number, to: number, sec: number, width = 6): Promise<void> {
    const { node, g, op } = gfx(layer,
        "Ring",
        at)
    g.lineWidth = width
    g.strokeColor = color
    g.circle(0,
        0,
        60)
    g.stroke()
    node.setScale(from,
        from,
        1)
    await Promise.all([run(node,
        sec,
        {
            scale: new Vec3(to,
                to,
                1)
        }),
    fade(op,
        sec,
        0)])
    node.destroy()
}

/** Tướng ra sân: vòng xanh ngọc nở ra + chớp nhẹ */
export async function summonPop(layer: Node, at: Pt): Promise<void> {
    const flash = gfx(layer,
        "Flash",
        at)
    flash.g.fillColor = withAlpha(C.teal,
        120)
    flash.g.circle(0,
        0,
        70)
    flash.g.fill()
    flash.op.opacity = 0
    const flashDone = (async () => {
        await fade(flash.op,
            0.08,
            255)
        await fade(flash.op,
            0.28,
            0)
        flash.node.destroy()
    })()
    await Promise.all([ring(layer,
        at,
        C.teal,
        0.3,
        1.7,
        0.5),
    ring(layer,
        at,
        withAlpha(C.teal,
            160),
        0.2,
        1.2,
        0.4,
        3),
        flashDone])
}

/** Tướng bị hạ: lắc nhẹ + vòng đỏ + mảnh vỡ tối */
export async function killFx(layer: Node, at: Pt): Promise<void> {
    const jobs: Promise<void>[] = [ring(layer,
        at,
        C.enemy,
        0.4,
        1.9,
        0.5,
        8)]
    const shake = gfx(layer,
        "Shake",
        at)
    shake.g.fillColor = withAlpha(C.dangerDeep,
        150)
    shake.g.circle(0,
        0,
        56)
    shake.g.fill()
    jobs.push((async () => {
        for (const dx of [-8,
            8,
            -6,
            6,
            0]) {
            await run(shake.node,
                0.04,
                {
                    position: new Vec3(at.x + dx,
                        at.y,
                        0)
                },
                "linear")
        }
        await fade(shake.op,
            0.2,
            0)
        shake.node.destroy()
    })())
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + (i % 3) * 0.2
        const d = 50 + (i % 4) * 22
        const s = 7 + (i % 3) * 4
        const shard = gfx(layer,
            "Shard",
            at)
        shard.g.fillColor = i % 2 ? new Color(20,
            12,
            24,
            255) : withAlpha(C.enemy,
            230)
        shard.g.moveTo(-s,
            -s / 2)
        shard.g.lineTo(s,
            0)
        shard.g.lineTo(-s / 2,
            s)
        shard.g.close()
        shard.g.fill()
        shard.node.angle = i * 37
        const spin = i * 37 + 180
        jobs.push((async () => {
            await Promise.all([run(shard.node,
                0.6,
                {
                    position: new Vec3(at.x + Math.cos(a) * d,
                        at.y + Math.sin(a) * d - 24,
                        0),
                    angle: spin
                },
                "quadOut"),
            fade(shard.op,
                0.35,
                0,
                0.25)])
            shard.node.destroy()
        })())
    }
    await Promise.all(jobs)
}

/** Tướng hồi sinh: cột sáng xanh ngọc dâng lên + vòng nở */
export async function respawnFx(layer: Node, at: Pt): Promise<void> {
    const { node, g, op } = gfx(layer,
        "Beam",
        at)
    g.fillColor = withAlpha(C.teal,
        110)
    g.rect(-34,
        -60,
        68,
        170)
    g.fill()
    node.setScale(1,
        0.1,
        1)
    await Promise.all([run(node,
        0.35,
        {
            scale: new Vec3(1,
                1,
                1)
        }),
    ring(layer,
        at,
        C.tealDark,
        0.3,
        1.5,
        0.55),
    fade(op,
        0.35,
        0,
        0.3)])
    node.destroy()
}

/** Mất mạng: chấm mạng nhấp nháy đỏ */
export async function livesLost(layer: Node, at: Pt, side: cg.Side): Promise<void> {
    const { node, g, op } = gfx(layer,
        "LifeDot",
        at)
    g.fillColor = side === "A" ? C.enemy : C.danger
    g.circle(0,
        0,
        14)
    g.fill()
    for (let i = 0; i < 3; i++) {
        await fade(op,
            0.1,
            60)
        await fade(op,
            0.1,
            255)
    }
    await Promise.all([run(node,
        0.3,
        {
            scale: new Vec3(2.2,
                2.2,
                1)
        }),
    fade(op,
        0.3,
        0)])
    node.destroy()
}

/** Lưng bài bay từ cột bộ bài vào tay */
export async function drawFly(layer: Node, from: Pt, to: Pt): Promise<void> {
    const back = cardBack(layer,
        70,
        98,
        from.x,
        from.y)
    back.setScale(0.7,
        0.7,
        1)
    await run(back,
        0.4,
        {
            position: new Vec3(to.x,
                to.y,
                0),
            scale: new Vec3(1,
                1,
                1)
        },
        "quadOut")
    const op = back.addComponent(UIOpacity)
    await fade(op,
        0.12,
        0)
    back.destroy()
}

/** Dải lớn giữa màn: trượt vào, giữ 0.8s, mờ đi */
export async function bigBanner(layer: Node, title: string, sub?: string): Promise<void> {
    const w = 900
    const h = sub ? 190 : 140
    const holder = box("Banner",
        layer,
        w,
        h,
        -260,
        60)
    const op = holder.addComponent(UIOpacity)
    op.opacity = 0
    new Frame(holder,
        w,
        h,
        0,
        0,
        {
            fill: withAlpha(C.panel,
                238), stroke: C.gold, inner: C.goldDark, glow: C.teal, chamfer: 22, gems: "both", gemSize: 14
        })
    text(holder,
        title,
        0,
        sub ? 28 : 0,
        {
            font: "title", size: 64, width: w - 80, height: 90, color: C.goldLight
        })
    if (sub) {
        text(holder,
            sub,
            0,
            -44,
            {
                font: "textMedium", size: 26, width: w - 80, color: C.text
            })
    }
    await Promise.all([run(holder,
        0.3,
        {
            position: new Vec3(0,
                60,
                0)
        }),
    fade(op,
        0.25,
        255)])
    await wait(holder,
        0.8)
    await Promise.all([run(holder,
        0.3,
        {
            position: new Vec3(220,
                60,
                0)
        },
        "sineIn"),
    fade(op,
        0.3,
        0)])
    holder.destroy()
}

/** Rung nhẹ cả màn hình quanh vị trí gốc */
export async function screenShake(root: Node, strength = 8): Promise<void> {
    const home = root.position.clone()
    for (const f of [1,
        -1,
        0.7,
        -0.7,
        0.35,
        0]) {
        await run(root,
            0.04,
            {
                position: new Vec3(home.x + f * strength,
                    home.y + f * strength * 0.6,
                    home.z)
            },
            "linear")
    }
    root.setPosition(home)
}

/** Chọn hiệu ứng theo sự kiện; sự kiện không có hiệu ứng trả ngay */
export async function presentEvent(layer: Node, root: Node, e: cg.GameEvent, posOf: (unitId: string) => Pt, ctx: {
    you: cg.Side; deckPos: Record<cg.Side, Pt>; handPos: Pt
}): Promise<void> {
    switch (e.t) {
        case "summon":
            return summonPop(layer,
                posOf(e.unit))
        case "respawn":
            return respawnFx(layer,
                posOf(e.unit))
        case "kill": {
            await Promise.all([killFx(layer,
                posOf(e.target)),
            screenShake(root,
                6)])
            return
        }
        case "lives": {
            const p = ctx.deckPos[e.side]
            return livesLost(layer,
                {
                    x: p.x, y: p.y + 90
                },
                e.side)
        }
        case "draw":
        case "drawAuto":
            if (e.side !== ctx.you) return
            return drawFly(layer,
                ctx.deckPos[e.side],
                ctx.handPos)
        case "roundStart":
            return bigBanner(layer,
                `Vòng ${e.round}`)
        case "turnStart":
            return bigBanner(layer,
                e.side === ctx.you ? "Lượt của bạn" : "Lượt đối thủ",
                `Vòng ${e.round}`)
        case "chainWindow":
            return bigBanner(layer,
                e.priority === ctx.you ? "Bạn nối chuỗi" : "Đối thủ nối chuỗi",
                `Chuỗi ${e.length} lá`)
        default:
            return
    }
}
