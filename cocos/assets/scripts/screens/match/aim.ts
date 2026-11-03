// Đường ngắm khi chọn mục tiêu: vệt bezier cong lên màu xanh ngọc phát sáng, đầu mũi tên, chấm sáng chạy dọc vệt.
// Bóc từ docs/mockups/match/targeting.png. Toạ độ là toạ độ sân khấu (gốc giữa, 1920×1080).
import {
    EventMouse, EventTouch, Graphics, Node, Tween, UITransform, Vec3, tween
} from "cc"
import {
    C, withAlpha
} from "../../dna/theme"
import {
    box
} from "../../ui/kit"

interface Point {
    x: number;
    y: number;
}

const DOTS = 5
const LOOP_SECONDS = 1.3
const SAMPLES = 28

export class AimLine {
    private readonly root: Node
    private readonly curve: Graphics
    private readonly head: Graphics
    private readonly dots: Graphics[] = []
    private readonly state = {
        p: 0
    }
    private from: Point = {
        x: 0, y: 0
    }
    private to: Point = {
        x: 0, y: 0
    }
    private locked = false
    private shown = false
    private runner: Tween<{ p: number }> | null = null

    constructor(layer: Node) {
        this.root = box("AimLine",
            layer,
            1920,
            1080)
        this.root.active = false
        this.curve = box("Curve",
            this.root,
            1920,
            1080).addComponent(Graphics)
        this.head = box("Head",
            this.root,
            1920,
            1080).addComponent(Graphics)
        for (let i = 0; i < DOTS; i++) {
            const g = box("Dot",
                this.root,
                24,
                24).addComponent(Graphics)
            g.fillColor = withAlpha(C.teal,
                70)
            g.circle(0,
                0,
                9)
            g.fill()
            g.fillColor = C.goldLight
            g.circle(0,
                0,
                3.5)
            g.fill()
            this.dots.push(g)
        }
    }

    /** Bật đường ngắm, đuôi ở `from` (lá trên tay hoặc tướng) */
    show(from: Point) {
        this.from = {
            x: from.x, y: from.y
        }
        this.to = {
            x: from.x, y: from.y
        }
        this.locked = false
        this.shown = true
        this.root.active = true
        this.redraw()
        if (!this.runner) {
            this.state.p = 0
            this.runner = tween(this.state)
                .repeatForever(tween(this.state)
                    .set({
                        p: 0
                    })
                    .to(LOOP_SECONDS,
                        {
                            p: 1
                        },
                        {
                            onUpdate: () => this.placeDots()
                        }))
                .start()
        }
    }

    /** Đầu bám `to`; `locked` = chuột đang trên mục tiêu hợp lệ, đầu hút vào tâm và vệt sáng hơn */
    moveTo(to: Point, locked = false) {
        if (!this.shown) return
        this.to = {
            x: to.x, y: to.y
        }
        this.locked = locked
        this.redraw()
    }

    hide() {
        this.shown = false
        this.root.active = false
        this.runner?.stop()
        this.runner = null
    }

    destroy() {
        this.hide()
        if (this.root.isValid) this.root.destroy()
    }

    /** Điểm điều khiển: giữa đoạn nối, nhấc lên theo độ dài để vệt cong lên */
    private control(): Point {
        const dx = this.to.x - this.from.x
        const dy = this.to.y - this.from.y
        const len = Math.sqrt(dx * dx + dy * dy)
        return {
            x: (this.from.x + this.to.x) / 2,
            y: (this.from.y + this.to.y) / 2 + Math.min(260, len * 0.32)
        }
    }

    private pointAt(t: number): Point {
        const c = this.control()
        const u = 1 - t
        return {
            x: u * u * this.from.x + 2 * u * t * c.x + t * t * this.to.x,
            y: u * u * this.from.y + 2 * u * t * c.y + t * t * this.to.y
        }
    }

    private redraw() {
        const c = this.control()
        const dx = this.to.x - c.x
        const dy = this.to.y - c.y
        const tl = Math.sqrt(dx * dx + dy * dy) || 1
        const ux = dx / tl
        const uy = dy / tl
        const headLen = this.locked ? 30 : 26
        // Vệt dừng ở gốc mũi tên để đầu mũi không bị nét chọc ra
        const end = {
            x: this.to.x - ux * headLen * 0.7,
            y: this.to.y - uy * headLen * 0.7
        }
        const layers: { width: number; color: typeof C.teal; alpha: number }[] = [
            {
                width: this.locked ? 26 : 20, color: C.teal, alpha: this.locked ? 55 : 34
            },
            {
                width: this.locked ? 12 : 9, color: C.teal, alpha: this.locked ? 130 : 90
            },
            {
                width: this.locked ? 5 : 3.5, color: this.locked ? C.goldLight : C.teal, alpha: 255
            }
        ]
        const g = this.curve
        g.clear()
        g.lineCap = Graphics.LineCap.ROUND
        g.lineJoin = Graphics.LineJoin.ROUND
        for (const layer of layers) {
            g.lineWidth = layer.width
            g.strokeColor = withAlpha(layer.color,
                layer.alpha)
            for (let i = 0; i <= SAMPLES; i++) {
                const t = i / SAMPLES
                const p = t === 1 ? end : this.pointAt(t * 0.985)
                if (i === 0) g.moveTo(p.x,
                    p.y)
                else g.lineTo(p.x,
                    p.y)
            }
            g.stroke()
        }
        this.drawHead(ux,
            uy,
            headLen)
        this.placeDots()
    }

    private drawHead(ux: number, uy: number, len: number) {
        const h = this.head
        h.clear()
        const tip = this.to
        const bx = tip.x - ux * len
        const by = tip.y - uy * len
        const wx = -uy * len * 0.5
        const wy = ux * len * 0.5
        const triangle = (grow: number) => {
            h.moveTo(tip.x + ux * grow,
                tip.y + uy * grow)
            h.lineTo(bx + wx * (1 + grow / 20) - ux * grow,
                by + wy * (1 + grow / 20) - uy * grow)
            h.lineTo(bx - wx * (1 + grow / 20) - ux * grow,
                by - wy * (1 + grow / 20) - uy * grow)
            h.close()
        }
        h.fillColor = withAlpha(C.teal,
            this.locked ? 90 : 55)
        triangle(7)
        h.fill()
        h.fillColor = this.locked ? C.goldLight : C.teal
        triangle(0)
        h.fill()
        if (this.locked) {
            // Vòng hút quanh tâm mục tiêu
            h.lineWidth = 3
            h.strokeColor = withAlpha(C.teal,
                200)
            h.circle(tip.x,
                tip.y,
                46)
            h.stroke()
        }
    }

    private placeDots() {
        const len = Math.hypot(this.to.x - this.from.x,
            this.to.y - this.from.y)
        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i].node
            if (len < 24) {
                dot.active = false
                continue
            }
            dot.active = true
            const t = (this.state.p + i / this.dots.length) % 1
            const p = this.pointAt(t * 0.97)
            dot.setPosition(p.x,
                p.y)
            const s = 0.6 + 0.6 * Math.sin(t * Math.PI)
            dot.setScale(s,
                s,
                1)
        }
    }
}

/** Nghe chuột / chạm trên `root`, đổi toạ độ màn hình sang toạ độ sân khấu; trả hàm gỡ */
export function trackMouse(root: Node, onMove: (p: Point) => void): () => void {
    const tf = root.getComponent(UITransform)
    const handler = (e: EventMouse | EventTouch) => {
        const ui = e.getUILocation()
        const local = tf
            ? tf.convertToNodeSpaceAR(new Vec3(ui.x,
                ui.y,
                0))
            : new Vec3(ui.x - 960,
                ui.y - 540,
                0)
        onMove({
            x: local.x, y: local.y
        })
    }
    root.on(Node.EventType.MOUSE_MOVE,
        handler)
    root.on(Node.EventType.TOUCH_MOVE,
        handler)
    return () => {
        if (!root.isValid) return
        root.off(Node.EventType.MOUSE_MOVE,
            handler)
        root.off(Node.EventType.TOUCH_MOVE,
            handler)
    }
}
