// Hiệu ứng ĐỔI CHỖ chung cho mọi tướng (Tốc Biến, Sylas Q, Ahri E, Malphite E...): tướng chủ động BAY LÊN theo vòng cung
// (bóng đổ trên đất nhỏ dần, hậu ảnh theo sau) rồi DẬM ĐẤT xuống ô của tướng kia (sóng bụi, đá vỡ, loé sáng); tướng bị đổi
// chỗ TRƯỢT NGANG sang ô của người bay (vệt bụi kéo dài ở chân, bụi cuộn khi tới nơi). Dùng bóng tướng (tranh tướng) phủ lên
// ô, nên khi ô vẫn còn tranh gốc phía dưới thì bóng vẫn đọc rõ.
import {
    Node, UIOpacity
} from "cc"
import {
    image
} from "../ui/assets"
import {
    angleOf, burst, ease, emit, mix, over, wait, type Pt
} from "./particles"

export interface SwapSide { hero: string; pos: Pt }

const DUST = [0xe8d7b0,
    0xc9b48a,
    0xffffff]
const ROCK = [0x6b5a44,
    0x4a3d2e,
    0x8a7458]
const SECS = 0.5
const APEX = 170

function ghostOf(layer: Node, hero: string, at: Pt): { node: Node; op: UIOpacity } {
    const node = new Node("SwapGhost")
    node.layer = layer.layer
    layer.addChild(node)
    node.setPosition(at.x,
        at.y)
    image(node,
        `art/heroes/${hero}`,
        98,
        98)
    const op = node.addComponent(UIOpacity)
    op.opacity = 245
    return {
        node, op
    }
}

/** Dậm đất tại `at`: loé sáng, vòng sóng bụi, đá vỡ văng ra, bụi cuộn lên */
function slam(layer: Node, at: Pt, strength: number) {
    void burst(layer,
        at,
        1,
        {
            color: [0xffffff], kind: "glow", life: [0.14,
                0.14], size: [40,
                170 * strength], alpha: 0.9
        })
    void burst(layer,
        at,
        1,
        {
            color: DUST, kind: "ring", life: [0.38,
                0.38], size: [30,
                260 * strength], alpha: 0.85
        })
    void burst(layer,
        at,
        Math.round(14 * strength),
        {
            color: ROCK, kind: "blade", additive: false, life: [0.3,
                0.6], size: [22,
                8], alpha: 1, speed: [150,
                420], angle: [Math.PI * 0.1,
                Math.PI * 0.9], drag: 2.2, gravity: -520, align: true, stretch: 1.4, spread: 30
        })
    void burst(layer,
        at,
        Math.round(30 * strength),
        {
            color: DUST, kind: "dot", life: [0.4,
                0.8], size: [10,
                2], alpha: 0.85, speed: [60,
                300], angle: [0,
                Math.PI], drag: 1.8, gravity: -80, spread: 40
        })
}

/**
 * `a` (người chủ động) bay vòng cung lên cao rồi dậm xuống ô của `b`; `b` trượt ngang sang ô của `a`.
 * Xong (kể cả hiệu ứng dậm đất) thì resolve; bóng tự mờ dần và huỷ.
 */
export async function swapUnits(layer: Node, a: SwapSide, b: SwapSide) {
    const ga = ghostOf(layer,
        a.hero,
        a.pos)
    const gb = ghostOf(layer,
        b.hero,
        b.pos)
    const dir = angleOf(a.pos,
        b.pos)
    // tướng kia nhún nhẹ rồi trượt đi: bụi bốc ở chân báo hiệu
    void burst(layer,
        {
            x: b.pos.x, y: b.pos.y - 42
        },
        8,
        {
            color: DUST, kind: "dot", life: [0.2,
                0.4], size: [8,
                2], alpha: 0.8, speed: [30,
                120], drag: 2, spread: 24
        })
    await over(layer,
        SECS,
        (t) => {
            const e = ease.inOut(t)
            const lift = Math.sin(t * Math.PI) * APEX
            const ground = mix(a.pos,
                b.pos,
                e)
            ga.node.setPosition(ground.x,
                ground.y + lift)
            const s = 1 + 0.22 * Math.sin(t * Math.PI)
            ga.node.setScale(s,
                s,
                1)
            // bóng đổ trên đất: nhỏ và mờ dần khi bay cao
            emit(layer,
                {
                    x: ground.x, y: ground.y - 44
                },
                {
                    color: [0x000000], kind: "glow", additive: false, life: [0.05,
                        0.07], size: [96 - 40 * Math.sin(t * Math.PI),
                        90], alpha: 0.5 - 0.25 * Math.sin(t * Math.PI)
                })
            // hậu ảnh của người bay
            emit(layer,
                {
                    x: ground.x, y: ground.y + lift
                },
                {
                    color: [0xfff0c0,
                        0xffffff], kind: "blade", life: [0.14,
                        0.24], size: [60,
                        8], alpha: 0.7, rotation: dir + Math.PI / 2 * (lift > 0 ? 0 : 0), stretch: 2.2
                })
            // người bị đổi chỗ trượt ngang thẳng sang ô của `a`
            const p = mix(b.pos,
                a.pos,
                e)
            gb.node.setPosition(p.x,
                p.y)
            emit(layer,
                {
                    x: p.x, y: p.y - 40
                },
                {
                    color: DUST, kind: "blade", life: [0.16,
                        0.3], size: [70,
                        10], alpha: 0.7, rotation: angleOf(b.pos,
                        a.pos), stretch: 2.6
                })
            emit(layer,
                {
                    x: p.x, y: p.y - 44
                },
                {
                    color: DUST, kind: "dot", life: [0.25,
                        0.5], size: [8,
                        2], alpha: 0.7, speed: [10,
                        60], drag: 2, spread: 16
                })
        })
    // chạm đất: người bay dậm xuống ô của `b`, người trượt tới ô của `a` cuộn bụi nhẹ
    ga.node.setScale(1,
        1,
        1)
    slam(layer,
        {
            x: b.pos.x, y: b.pos.y - 40
        },
        1.15)
    slam(layer,
        {
            x: a.pos.x, y: a.pos.y - 40
        },
        0.55)
    await wait(layer,
        0.12)
    await over(layer,
        0.2,
        (t) => {
            ga.op.opacity = Math.round(245 * (1 - t))
            gb.op.opacity = Math.round(245 * (1 - t))
        })
    ga.node.destroy()
    gb.node.destroy()
}
