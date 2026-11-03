// Bộ thành phần giao diện dựng bằng code, bóc từ mockup docs/mockups/cocos/: khung vát góc vàng kim có ngọc, nút, ô nhập,
// nhãn. Mỗi lớp vẽ là một node Graphics riêng, vì một node chỉ giữ được một renderer.
import {
    Color, EditBox, Graphics, Label, Node, Sprite, UIOpacity, UITransform
} from "cc"
import {
    C, FONT, withAlpha
} from "../dna/theme"
import {
    fontOf, type FontRole
} from "./assets"
import {
    paintSkin, skinMissing, skinReady, skinRequest
} from "./skin"

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
    /** Chữ đậm giả: vẽ thêm một lớp lệch 0.9 px (font biến thiên không chọn được độ đậm) */
    bold?: boolean;
}

/**
 * BẢNG TYPOGRAPHY (thầy chốt): 5 cỡ nhỏ gọn, mọi `size` được kéo về cỡ gần nhất.
 *   34 Tiêu đề màn      · AlegreyaSC Bold, IN HOA
 *   22 Đề mục / nút     · AlegreyaSC Bold, IN HOA (nút, tên panel, tab)
 *   18 Thân             · Alegreya thường (nội dung, tên tướng, tên chiêu, số liệu)
 *   14 Chữ phụ          · Alegreya NGHIÊNG (mô tả, gợi ý, chú thích, chữ xám, "Chưa chọn")
 *   12 Vi mô            · Alegreya NGHIÊNG (chi tiết trên lá bài)
 * Đậm chỉ dùng cho tiêu đề, đề mục, nút và con số; nghiêng chỉ dùng cho chữ phụ và vi mô. Thân luôn thường.
 */
export const TYPE_SCALE = [12,
    14,
    18,
    22,
    34] as const
export function snapSize(size: number): number {
    let best: number = TYPE_SCALE[0]
    for (const t of TYPE_SCALE) if (Math.abs(t - size) < Math.abs(best - size)) best = t
    return best
}

/** Nhãn chữ thật. Font title / titleMedium tự in hoa. */
export function text(parent: Node, value: string, x = 0, y = 0, o: TextOpts = {
}): Label {
    // `bold` không còn vẽ lớp chữ thứ hai lệch 0.9 px (gây bóng chữ / "echo"): chữ chỉ vẽ một lần
    const size = snapSize(o.size ?? 18)
    let role: FontRole = o.font === "titleMedium" ? "text" : o.font ?? "text"
    // Nghiêng cho chữ phụ / vi mô (cỡ <= 14) và chữ xám; đậm (SC Bold) cho title, number
    if ((role === "text" || role === "textMedium") && (size <= 14 || o.color === C.textMuted || o.color === C.disabledText)) role = "italic"

    const isTitle = (o.font ?? "text") === "title" || o.font === "titleMedium"
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
    /** Mảnh skin vẽ sẵn (resources/skin/<tên>.png) thay cho viền tự vẽ; thiếu file thì tự quay về viền tự vẽ */
    skin?: string;
    /** Khung skin vẽ rộng ra ngoài ô bao nhiêu px mỗi phía (viền vẽ sẵn dày hơn viền tự vẽ nên cần chừa chỗ cho chữ) */
    skinBleed?: number;
    /** Dải sáng mép trên + vignette đáy (mặc định bật cho khung ≥ 50 px) */
    sheen?: boolean;
    /** Độ mạnh dải sáng (1 = khung thường; nút chính dùng ~2.4 cho vẻ phát sáng) */
    sheenStrength?: number;
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
    private readonly skinNode: Node
    private readonly gemNodes: Node[]
    private lastStyle: FrameStyle = {
    }

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
        this.skinNode = box("Skin",
            this.node,
            w,
            h)
        this.gemNodes = [box("GemTop",
            this.node,
            1,
            1),
        box("GemBottom",
            this.node,
            1,
            1)]
        this.draw(style)
    }

    draw(s: FrameStyle) {
        this.lastStyle = s
        const { w, h } = sizeOf(this.node)
        // Skin vẽ sẵn: có ảnh thì dùng, chưa có thì xin nạp (xong vẽ lại một lần), không có file thì giữ viền tự vẽ
        // MỘT bộ viền cho cả game, theo mẫu viền bàn đấu: vạch vàng mảnh + vạch trong mờ + ngọc ngọc nhỏ ở bốn góc vát.
        // Skin vẽ sẵn (resources/skin) đã tắt để mọi khung cùng một kiểu.
        const skinned = false
        if (!skinned) this.skinNode.active = false
        // Kiểu viền D (thầy chốt): khung vuông, một vạch vàng 1 px mờ + thanh góc vàng; không góc vát, không ngọc
        const ch = 0
        const { glow, fill, outer, inner, gems } = this.layers
        for (const g of [glow,
            fill,
            outer,
            inner,
            gems]) g.clear()
        // Không quầng sáng / blur ở bất kỳ khung nào (thầy chốt): trạng thái chọn thể hiện bằng màu vạch viền
        if (s.fill !== null) {
            // Nền một màu phẳng, không gradient, không texture
            fill.fillColor = s.fill ?? withAlpha(C.panel,
                246)
            chamferPath(fill,
                w,
                h,
                0,
                ch)
            fill.fill()
            // Chiều sâu: dải sáng xanh ngọc mờ dần từ mép trên và vignette tối ở đáy (chỉ trong vùng giữa hai góc vát)
            if (false) {
                const top = h / 2 - ch, span = Math.min(h * (s.sheenStrength ? 0.55 : 0.4),
                    130), bands = 10
                for (let i = 0; i < bands; i++) {
                    fill.fillColor = new Color(60,
                        190,
                        200,
                        Math.min(255,
                            Math.round(34 * (s.sheenStrength ?? 1) * (1 - i / bands) ** 2)))
                    fill.rect(-w / 2 + 1,
                        top - (i + 1) * span / bands,
                        w - 2,
                        span / bands + 0.5)
                    fill.fill()
                }
                const bottom = -h / 2 + ch, vspan = Math.min(h * 0.3,
                    90)
                for (let i = 0; i < 6; i++) {
                    fill.fillColor = new Color(0,
                        4,
                        10,
                        Math.round(70 * (1 - i / 6) ** 2))
                    fill.rect(-w / 2 + 1,
                        bottom + i * vspan / 6,
                        w - 2,
                        vspan / 6 + 0.5)
                    fill.fill()
                }
            }
        }
        const small0 = Math.min(w,
            h)
        const edge = s.stroke ?? C.gold
        outer.lineWidth = 1
        outer.strokeColor = withAlpha(edge,
            90)
        outer.rect(-w / 2 + 0.5,
            -h / 2 + 0.5,
            w - 1,
            h - 1)
        outer.stroke()
        // Thanh góc: dài 16 (khung lớn) / 11 (vừa) / 7 (nút, ô nhỏ), dày 3 / 2; khung quá thấp (hàng, nhãn) chỉ còn vạch mờ
        if (small0 >= 44) {
            const len = small0 >= 110 ? 16 : small0 >= 56 ? 11 : 7
            const th = small0 >= 56 ? 3 : 2
            gems.fillColor = edge
            for (const sx of [-1,
                1]) for (const sy of [-1,
                1]) {
                const x0 = sx < 0 ? -w / 2 : w / 2 - len, y0 = sy < 0 ? -h / 2 : h / 2 - th
                gems.rect(x0,
                    y0,
                    len,
                    th)
                const x1 = sx < 0 ? -w / 2 : w / 2 - th, y1 = sy < 0 ? -h / 2 : h / 2 - len
                gems.rect(x1,
                    y1,
                    th,
                    len)
            }
            gems.fill()
        }
        this.gemNodes.forEach((n) => { n.active = false })
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
            chamfer: 18, gems, line: 4, inner: C.gold, glow: C.goldDark, gemSize: 20, skin: "panel-soft", skinBleed: 6
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
    private readonly underSprite: Node
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
        this.underSprite = box("UnderSkin",
            this.node,
            w,
            22,
            0,
            -h / 2)
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
            // Gạch chân tab: mảnh skin (vạch ngọc hai mũi nhọn) khi tab đang chọn, có ảnh; không thì tự vẽ
            const { h: th } = sizeOf(this.node)
            this.underSprite.active = false
            if (this.selected && skinReady("tab-underline")) {
                this.underSprite.getComponent(UITransform)?.setContentSize(w,
                    22)
                const sp = this.underSprite.getComponent(Sprite) ?? this.underSprite.addComponent(Sprite)
                sp.type = Sprite.Type.SLICED
                sp.sizeMode = Sprite.SizeMode.CUSTOM
                sp.spriteFrame = skinReady("tab-underline")
                this.underSprite.setPosition(0,
                    -th / 2 + 4)
                this.underSprite.active = true
            } else {
                if (this.selected && !skinMissing("tab-underline")) void skinRequest("tab-underline").then(() => { if (this.node.isValid) this.paint() })
                this.underline.fillColor = this.selected ? C.teal : withAlpha(C.goldDark,
                    active ? 255 : 120)
                this.underline.rect(-w / 2,
                    -1,
                    w,
                    this.selected ? 4 : 1)
                this.underline.fill()
            }
            return
        }
        if (!this.enabled) {
            this.frame.draw({
                fill: C.disabled, stroke: C.disabledText, inner: null, chamfer: 8, skin: sizeOf(this.node).h >= 56 ? "btn-disabled" : sizeOf(this.node).h >= 34 ? "btn-pill" : undefined
            })
            this.label.color = C.disabledText
            return
        }
        const primary = this.kind === "primary", danger = this.kind === "danger"
        const on = this.selected || active
        const { h: bh } = sizeOf(this.node)
        // Skin nút vẽ sẵn: nút cao dùng khung dài, nút thấp dùng viên thuốc (biên nhỏ), quá thấp thì giữ bản tự vẽ
        const skin = bh < 34 ? undefined : bh < 56 ? "btn-pill" : primary ? (active ? "btn-primary-hover" : "btn-primary") : danger ? "btn-danger" : (active ? "btn-gold-hover" : "btn-gold")
        this.frame.draw({
            fill: this.pressed ? C.bg : primary ? (active ? C.tealDark : C.tealDeep) : this.kind === "ghost" ? null : withAlpha(C.panelRaised,
                235),
            stroke: on && !primary ? C.teal : primary ? C.gold : danger ? C.danger : C.gold,
            line: 2,
            inner: this.kind === "ghost" ? null : C.goldDark,
            // Nút chính chỉ khác nền ngọc đậm: không quầng sáng, không dải sáng; glow nhẹ chỉ khi rê chuột / đang chọn
            glow: on && !primary ? C.teal : null,
            chamfer: 10,
            sheen: primary ? false : undefined,
            skin,
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
                    235), inner: null, chamfer: 6, skin: "field"
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
                235), inner: null, chamfer: 6, stroke: on ? C.teal : C.gold, glow: on ? C.teal : null, skin: on ? "field-focus" : "field"
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
            skin: ok ? "notice-ok" : "notice-error",
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
