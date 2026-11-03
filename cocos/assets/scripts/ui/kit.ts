// Bộ thành phần giao diện dựng bằng code, bóc từ mockup docs/mockups/cocos/: khung vát góc vàng kim có ngọc, nút, ô nhập,
// nhãn. Mỗi lớp vẽ là một node Graphics riêng, vì một node chỉ giữ được một renderer.
import {
    Color, EditBox, Graphics, Label, Node, UIOpacity, UITransform
} from "cc"
import {
    C, FONT, withAlpha
} from "../dna/theme"
import {
    fontOf, type FontRole
} from "./assets"

/** Node có kích thước, đặt vào cha ở (x, y) tính từ tâm cha */
export function box(name: string, parent: Node | null, w: number, h: number, x = 0, y = 0): Node {
    const n = new Node(name)
    n.layer = parent?.layer ?? n.layer
    n.addComponent(UITransform).setContentSize(w,
        h)
    if (parent) parent.addChild(n)
    n.setPosition(x,
        y)
    return n
}

export function sizeOf(n: Node) {
    const t = n.getComponent(UITransform)!
    return {
        w: t.width, h: t.height
    }
}

export function setOpacity(n: Node, value: number) {
    (n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity)).opacity = value
}

export interface TextOpts {
    size?: number;
    color?: Color;
    font?: FontRole;
    align?: "left" | "center" | "right";
    width?: number;
    height?: number;
    wrap?: boolean;
    upper?: boolean;
}

/** Nhãn chữ thật. Font title / titleMedium tự in hoa. */
export function text(parent: Node, value: string, x = 0, y = 0, o: TextOpts = {
}): Label {
    const size = o.size ?? 22
    const role = o.font ?? "text"
    const isTitle = role === "title" || role === "titleMedium"
    const n = box("Text",
        parent,
        o.width ?? 400,
        o.height ?? Math.ceil(size * 1.7),
        x,
        y)
    const l = n.addComponent(Label)
    const ttf = fontOf(role)
    if (ttf) {
        l.useSystemFont = false
        l.font = ttf
    } else {
        l.useSystemFont = true
        l.fontFamily = isTitle ? FONT.title : FONT.text
        l.isBold = isTitle
    }
    l.string = o.upper ?? isTitle ? value.toUpperCase() : value
    l.fontSize = size
    l.lineHeight = Math.ceil(size * 1.3)
    l.color = o.color ?? (isTitle ? C.goldLight : C.text)
    l.horizontalAlign = o.align === "left" ? Label.HorizontalAlign.LEFT : o.align === "right" ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER
    l.verticalAlign = Label.VerticalAlign.CENTER
    l.overflow = Label.Overflow.SHRINK
    l.enableWrapText = !!o.wrap
    // Gắn Label (overflow mặc định NONE) làm node co về cỡ chữ mặc định; đặt lại cỡ khung sau khi đã chọn SHRINK
    n.getComponent(UITransform)!.setContentSize(o.width ?? 400,
        o.height ?? Math.ceil(size * 1.7))
    return l
}

export interface FrameStyle {
    fill?: Color | null;
    stroke?: Color;
    line?: number;
    inner?: Color | null;
    glow?: Color | null;
    chamfer?: number;
    /** Ngọc hình thoi ở giữa cạnh trên / dưới */
    gems?: "none" | "top" | "both";
    /** Cỡ ngọc; mặc định tự theo cỡ khung (7–14) */
    gemSize?: number;
}

/** Đường bát giác vát góc, lùi vào `inset` so với mép */
function chamferPath(g: Graphics, w: number, h: number, inset: number, ch: number) {
    const x0 = -w / 2 + inset, y0 = -h / 2 + inset, x1 = w / 2 - inset, y1 = h / 2 - inset
    g.moveTo(x0 + ch,
        y0)
    g.lineTo(x1 - ch,
        y0)
    g.lineTo(x1,
        y0 + ch)
    g.lineTo(x1,
        y1 - ch)
    g.lineTo(x1 - ch,
        y1)
    g.lineTo(x0 + ch,
        y1)
    g.lineTo(x0,
        y1 - ch)
    g.lineTo(x0,
        y0 + ch)
    g.close()
}

/** Ngọc thoi: viền vàng, lõi xanh ngọc */
export function drawGem(g: Graphics, x: number, y: number, r: number, core: Color = C.teal) {
    const diamond = (s: number) => {
        g.moveTo(x,
            y + s)
        g.lineTo(x + s * 0.72,
            y)
        g.lineTo(x,
            y - s)
        g.lineTo(x - s * 0.72,
            y)
        g.close()
    }
    g.fillColor = C.goldDark
    diamond(r)
    g.fill()
    g.fillColor = C.gold
    diamond(r * 0.82)
    g.fill()
    g.fillColor = core
    diamond(r * 0.52)
    g.fill()
}

/** Khung DNA vẽ lại được: nền tối, viền vàng kim mảnh vát góc, viền trong, ngọc, ánh xanh ngọc khi chọn */
export class Frame {
    readonly node: Node
    private readonly layers: Record<"glow" | "fill" | "outer" | "inner" | "gems", Graphics>

    constructor(parent: Node, w: number, h: number, x = 0, y = 0, style: FrameStyle = {
    }) {
        this.node = box("Frame",
            parent,
            w,
            h,
            x,
            y)
        const layer = (name: string) => box(name,
            this.node,
            w,
            h).addComponent(Graphics)
        this.layers = {
            glow: layer("Glow"), fill: layer("Fill"), outer: layer("Outer"), inner: layer("Inner"), gems: layer("Gems")
        }
        this.draw(style)
    }

    draw(s: FrameStyle) {
        const { w, h } = sizeOf(this.node)
        const ch = s.chamfer ?? 12
        const { glow, fill, outer, inner, gems } = this.layers
        for (const g of [glow,
            fill,
            outer,
            inner,
            gems]) g.clear()
        if (s.glow) {
            for (const [width, alpha] of [[14,
                28],
            [8,
                55]]) {
                glow.lineWidth = width
                glow.strokeColor = withAlpha(s.glow,
                    alpha)
                chamferPath(glow,
                    w,
                    h,
                    -2,
                    ch + 1)
                glow.stroke()
            }
        }
        if (s.fill !== null) {
            fill.fillColor = s.fill ?? withAlpha(C.panel,
                232)
            chamferPath(fill,
                w,
                h,
                0,
                ch)
            fill.fill()
        }
        outer.lineWidth = s.line ?? 2
        outer.strokeColor = s.stroke ?? C.gold
        chamferPath(outer,
            w,
            h,
            1,
            ch)
        outer.stroke()
        if (s.inner !== null) {
            inner.lineWidth = 1
            inner.strokeColor = s.inner ?? C.goldDark
            chamferPath(inner,
                w,
                h,
                6,
                Math.max(2,
                    ch - 4))
            inner.stroke()
        }
        const gemSize = s.gemSize ?? Math.min(14,
            Math.max(7,
                Math.round(Math.min(w,
                    h) / 22)))
        if (s.gems === "top" || s.gems === "both") drawGem(gems,
            0,
            h / 2,
            gemSize)
        if (s.gems === "both") drawGem(gems,
            0,
            -h / 2,
            gemSize)
    }
}

/** Đường kẻ vàng mảnh, có ngọc nhỏ ở giữa nếu cần */
export function rule(parent: Node, w: number, x: number, y: number, gem = false, color: Color = C.goldDark) {
    const g = box("Rule",
        parent,
        w,
        12,
        x,
        y).addComponent(Graphics)
    // Vẽ đường kẻ bằng hình chữ nhật mảnh: nét stroke 1 px của đường hở không hiện
    g.fillColor = color
    g.rect(-w / 2,
        -0.75,
        w,
        1.5)
    g.fill()
    // Ngọc vẽ trên node riêng: fill() cùng Graphics với đường kẻ làm mất đường kẻ
    if (gem) drawGem(box("Gem",
        g.node,
        16,
        16).addComponent(Graphics),
    0,
    0,
    7,
    C.gold)
}

/** Panel lớn theo mockup: nền tối trong mờ, khung vàng vát góc, ngọc ở đỉnh */
export function panel(parent: Node, w: number, h: number, x = 0, y = 0, gems: FrameStyle["gems"] = "top"): Node {
    return new Frame(parent,
        w,
        h,
        x,
        y,
        {
            chamfer: 18, gems, line: 4, inner: C.gold, glow: C.goldDark, gemSize: 20
        }).node
}

export type ButtonKind = "primary" | "gold" | "ghost" | "danger" | "tab"

/**
 * Nút theo mockup: vàng = nền tối viền vàng chữ vàng sáng; chính = nền xanh ngọc viền vàng chữ sáng;
 * tab = chữ không khung, gạch chân xanh ngọc khi chọn. Đủ trạng thái thường / hover / nhấn / tắt.
 */
export class Button {
    readonly node: Node
    private readonly frame: Frame
    private readonly label: Label
    private readonly underline: Graphics
    private hover = false
    private pressed = false
    private enabled = true
    private selected = false

    constructor(parent: Node, caption: string, w: number, h: number, x: number, y: number, private onClick: () => void, private kind: ButtonKind = "gold", size?: number) {
        this.frame = new Frame(parent,
            w,
            h,
            x,
            y)
        this.node = this.frame.node
        this.node.name = `Button ${caption}`
        this.underline = box("Underline",
            this.node,
            w,
            4,
            0,
            -h / 2 + 2).addComponent(Graphics)
        this.label = text(this.node,
            caption,
            0,
            0,
            {
                font: "title", size: size ?? Math.min(30,
                    Math.round(h * 0.44)), width: w - 20, height: h
            })
        this.node.on(Node.EventType.MOUSE_ENTER,
            () => { this.hover = true; this.paint() })
        this.node.on(Node.EventType.MOUSE_LEAVE,
            () => { this.hover = false; this.pressed = false; this.paint() })
        this.node.on(Node.EventType.TOUCH_START,
            () => { this.pressed = true; this.paint() })
        this.node.on(Node.EventType.TOUCH_CANCEL,
            () => { this.pressed = false; this.paint() })
        this.node.on(Node.EventType.TOUCH_END,
            () => {
                this.pressed = false
                this.paint()
                if (this.enabled) this.onClick()
            })
        this.paint()
    }

    setEnabled(on: boolean) { this.enabled = on; this.paint() }
    setSelected(on: boolean) { this.selected = on; this.paint() }
    setText(caption: string) { this.label.string = caption.toUpperCase() }
    setKind(kind: ButtonKind) { this.kind = kind; this.paint() }

    private paint() {
        const { w } = sizeOf(this.node)
        this.underline.clear()
        const active = this.hover || this.pressed
        if (this.kind === "tab") {
            this.frame.draw({
                fill: null, stroke: withAlpha(C.gold,
                    0), inner: null
            })
            this.label.color = this.selected ? C.goldLight : active ? C.text : C.textMuted
            this.underline.fillColor = this.selected ? C.teal : withAlpha(C.goldDark,
                active ? 255 : 120)
            this.underline.rect(-w / 2,
                -1,
                w,
                this.selected ? 4 : 1)
            this.underline.fill()
            return
        }
        if (!this.enabled) {
            this.frame.draw({
                fill: C.disabled, stroke: C.disabledText, inner: null, chamfer: 8
            })
            this.label.color = C.disabledText
            return
        }
        const primary = this.kind === "primary", danger = this.kind === "danger"
        const on = this.selected || active
        this.frame.draw({
            fill: this.pressed ? C.bg : primary ? (active ? C.tealMid : C.tealDeep) : this.kind === "ghost" ? null : withAlpha(C.panelRaised,
                235),
            stroke: on && !primary ? C.teal : primary ? C.gold : danger ? C.danger : C.gold,
            line: primary ? 3 : 2,
            inner: primary ? C.teal : this.kind === "ghost" ? null : C.goldDark,
            glow: primary ? C.teal : on ? C.teal : null,
            chamfer: 10,
        })
        this.label.color = primary || on ? C.goldLight : danger ? C.danger : C.goldLight
    }
}

export interface FieldOpts { password?: boolean; maxLength?: number; label?: string }

/** Ô nhập theo mockup: nhãn phía trên, nền gần đen, viền vàng mảnh, sáng viền ngọc khi đang gõ */
export class TextField {
    readonly node: Node
    readonly edit: EditBox
    private readonly frame: Frame

    constructor(parent: Node, placeholder: string, w: number, x: number, y: number, o: FieldOpts = {
    }, h = 60) {
        this.node = box("Field",
            parent,
            w,
            h,
            x,
            y)
        if (o.label) text(this.node,
            o.label,
            0,
            h / 2 + 24,
            {
                size: 28, color: C.goldLight, align: "left", width: w
            })
        this.frame = new Frame(this.node,
            w,
            h,
            0,
            0,
            {
                fill: withAlpha(C.bg,
                    235), inner: null, chamfer: 6
            })
        // Dựng EditBox khi node còn tách khỏi cây: gắn vào scene trước thì EditBox tự sinh nhãn mặc định "label"
        // EditBox canh chữ ở mép trên vùng nhập, nên vùng nhập chỉ cao bằng một dòng để chữ nằm giữa ô
        const fontSize = Math.min(28,
            Math.round(h * 0.6))
        const lineHeight = Math.round(fontSize * 1.15)
        const editNode = box("EditBox",
            null,
            w - 40,
            lineHeight + 4)
        editNode.layer = this.frame.node.layer
        const value = this.innerLabel(editNode,
            "Text",
            C.goldLight,
            fontSize,
            lineHeight)
        const hint = this.innerLabel(editNode,
            "Placeholder",
            C.disabledText,
            fontSize,
            lineHeight)
        this.edit = editNode.addComponent(EditBox)
        this.edit.textLabel = value
        this.edit.placeholderLabel = hint
        this.edit.placeholder = placeholder
        this.edit.maxLength = o.maxLength ?? 64
        this.edit.inputMode = EditBox.InputMode.SINGLE_LINE
        if (o.password) this.edit.inputFlag = EditBox.InputFlag.PASSWORD
        this.frame.node.addChild(editNode)
        editNode.on(EditBox.EventType.EDITING_DID_BEGAN,
            () => this.focus(true))
        editNode.on(EditBox.EventType.EDITING_DID_ENDED,
            () => this.focus(false))
    }

    get value() { return this.edit.string.trim() }
    set value(v: string) { this.edit.string = v }

    private innerLabel(parent: Node, name: string, color: Color, fontSize: number, lineHeight: number): Label {
        const { w, h } = sizeOf(parent)
        const l = box(name,
            parent,
            w,
            h).addComponent(Label)
        const ttf = fontOf("text")
        if (ttf) {
            l.useSystemFont = false
            l.font = ttf
        } else {
            l.useSystemFont = true
            l.fontFamily = FONT.text
        }
        l.fontSize = fontSize
        l.lineHeight = lineHeight
        l.color = color
        l.horizontalAlign = Label.HorizontalAlign.LEFT
        l.verticalAlign = Label.VerticalAlign.CENTER
        l.overflow = Label.Overflow.CLAMP
        l.enableWrapText = false
        // EditBox đặt nhãn ở góc trên-trái ô (-w/2, h/2) và coi gốc nhãn là góc đó
        const t = l.node.getComponent(UITransform)!
        t.setAnchorPoint(0,
            1)
        t.setContentSize(w,
            h)
        return l
    }

    private focus(on: boolean) {
        this.frame.draw({
            fill: withAlpha(C.bg,
                235), inner: null, chamfer: 6, stroke: on ? C.teal : C.gold, glow: on ? C.teal : null
        })
    }
}

/** Khung báo theo mockup: viền đỏ, nền đỏ sẫm (lỗi) hoặc viền ngọc (thành công); ẩn khi không có gì để báo */
export class Notice {
    readonly node: Node
    private readonly frame: Frame
    private readonly label: Label
    private readonly icon: Graphics

    constructor(parent: Node, x: number, y: number, w: number, h = 52) {
        this.frame = new Frame(parent,
            w,
            h,
            x,
            y)
        this.node = this.frame.node
        this.label = text(this.node,
            "",
            20,
            0,
            {
                size: 25, width: w - 90, height: h, align: "left"
            })
        this.icon = box("Warn",
            this.node,
            30,
            30,
            -w / 2 + 34,
            0).addComponent(Graphics)
        this.say("")
    }

    say(message: string, ok = false) {
        this.node.active = !!message
        this.label.string = message
        this.label.color = C.goldLight
        // Biểu tượng cảnh báo theo mockup: tam giác viền, dấu chấm than; báo thành công thì vẽ dấu tích
        const g = this.icon
        g.clear()
        g.lineWidth = 2.5
        g.strokeColor = ok ? C.teal : C.danger
        if (ok) {
            g.moveTo(-10,
                0)
            g.lineTo(-3,
                -8)
            g.lineTo(11,
                9)
            g.stroke()
        } else {
            g.moveTo(0,
                13)
            g.lineTo(14,
                -11)
            g.lineTo(-14,
                -11)
            g.close()
            g.stroke()
            g.fillColor = C.danger
            g.rect(-1.5,
                -2,
                3,
                9)
            g.rect(-1.5,
                -7.5,
                3,
                3)
            g.fill()
        }
        this.frame.draw({
            fill: ok ? withAlpha(C.tealDeep,
                220) : withAlpha(C.dangerDeep,
                230),
            stroke: ok ? C.teal : C.danger,
            inner: null,
            chamfer: 6,
        })
    }
}

/** Dòng trạng thái chữ trơn: lỗi đỏ, thành công xanh ngọc */
export class StatusLine {
    readonly label: Label
    constructor(parent: Node, x: number, y: number, w: number) {
        this.label = text(parent,
            "",
            x,
            y,
            {
                size: 20, width: w
            })
    }
    say(message: string, ok = false) {
        this.label.string = message
        this.label.color = ok ? C.teal : C.danger
    }
}

/** Bỏ toàn bộ con của một node (đổi trang, vẽ lại lưới) */
export function clear(n: Node) {
    for (const c of [...n.children]) c.destroy()
}
