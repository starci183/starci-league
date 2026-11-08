// Màn đăng nhập / đăng ký, bóc từ docs/mockups/cocos/auth.png: bên trái huy hiệu + chữ StarCi League + dòng phụ,
// bên phải panel vát góc có ngọc: hai tab gạch chân xanh ngọc, ô nhập, nút hiện mật khẩu, khung báo lỗi đỏ,
// nút chính xanh ngọc, dòng chuyển tab ở đáy. Gọi API server (PostgreSQL).
import {
    EditBox, Graphics, Node, Sprite
} from "cc"
import {
    C, at
} from "../dna/theme"
import {
    signIn, signUp
} from "../net/api"
import {
    frameOf, image
} from "../ui/assets"
import {
    Button, Notice, TextField, box, clear, panel, rule, text
} from "../ui/kit"
import type {
    Nav
} from "./nav"

type Mode = "in" | "up"

const PANEL = {
    ...at(1443,
        528), w: 625, h: 780
}
const FIELD_W = 517

export function buildAuth(root: Node, nav: Nav, message = "") {
    brand(root)
    const card = panel(root,
        PANEL.w,
        PANEL.h,
        PANEL.x,
        PANEL.y)
    const body = box("Body",
        card,
        PANEL.w,
        PANEL.h)
    const values = {
        name: "", email: "", password: ""
    }
    let busy = false
    build("in",
        message)

    function build(mode: Mode, notice = "") {
        clear(body)
        // Toạ độ trong panel: mockup y -> sân khấu, trừ tâm panel
        const py = (y: number) => at(0,
            y).y - PANEL.y
        const tabW = 290
        const tabIn = new Button(body,
            "Đăng nhập",
            tabW,
            62,
            -150,
            py(199),
            () => switchTo("in"),
            "tab",
            34)
        const tabUp = new Button(body,
            "Đăng ký",
            tabW,
            62,
            150,
            py(199),
            () => switchTo("up"),
            "tab",
            34)
        tabIn.setSelected(mode === "in")
        tabUp.setSelected(mode === "up")

        const rows = mode === "up" ? [335,
            457,
            582] : [300,
            430]
        let name: TextField | null = null
        if (mode === "up") {
            name = new TextField(body,
                "Tên hiển thị trong trận",
                FIELD_W,
                0,
                py(rows[0]),
                {
                    label: "Tên hiển thị", maxLength: 24
                })
            name.value = values.name
        }
        const email = new TextField(body,
            "ban@gmail.com",
            FIELD_W,
            0,
            py(rows[rows.length - 2]),
            {
                label: "Email", maxLength: 254
            })
        email.value = values.email
        const password = new TextField(body,
            "Ít nhất 6 ký tự",
            FIELD_W,
            0,
            py(rows[rows.length - 1]),
            {
                label: "Mật khẩu", password: true
            })
        password.value = values.password
        eyeToggle(password)

        const lastY = rows[rows.length - 1]
        const status = new Notice(body,
            0,
            py(lastY + 82),
            FIELD_W + 6,
            54)
        if (notice) status.say(notice)
        const submit = new Button(body,
            mode === "in" ? "Đăng nhập" : "Tạo tài khoản",
            FIELD_W + 6,
            84,
            0,
            py(lastY + 183),
            () => { void send() },
            "primary",
            40)

        const footY = py(lastY + 273)
        text(body,
            mode === "in" ? "Chưa có tài khoản?" : "Đã có tài khoản?",
            -95,
            footY,
            {
                size: 26, color: C.textMuted, width: 260, align: "right"
            })
        link(body,
            mode === "in" ? "Đăng ký" : "Đăng nhập",
            150,
            footY,
            () => switchTo(mode === "in" ? "up" : "in"))

        function keep() {
            if (name) values.name = name.value
            values.email = email.value
            values.password = password.edit.string
        }

        function switchTo(m: Mode) {
            if (busy || m === mode) return
            keep()
            build(m)
        }

        async function send() {
            keep()
            if (!values.email || !values.password) return status.say("Nhập email và mật khẩu")
            if (mode === "up" && !values.name) return status.say("Nhập tên hiển thị")
            busy = true
            submit.setEnabled(false)
            status.say("Đang gửi…",
                true)
            try {
                const session = mode === "in"
                    ? await signIn(values.email,
                        values.password)
                    : await signUp(values.email,
                        values.password,
                        values.name)
                nav.signedIn(session)
            } catch (e) {
                busy = false
                status.say((e as Error).message)
                submit.setEnabled(true)
            }
        }
    }
}

/** Huy hiệu, chữ STARCI LEAGUE (ảnh wordmark nếu có, không thì chữ font tiêu đề), vạch có ngọc, dòng phụ */
function brand(root: Node) {
    const crest = at(540,
        287), mark = at(540,
        448)
    image(root,
        "art/logo/crest",
        220,
        220,
        crest.x,
        crest.y)
    const markNode = box("Wordmark",
        root,
        500,
        180,
        mark.x,
        mark.y)
    void frameOf("art/logo/wordmark").then((frame) => {
        if (!markNode.isValid) return
        if (frame) {
            const s = markNode.addComponent(Sprite)
            s.sizeMode = Sprite.SizeMode.CUSTOM
            s.spriteFrame = frame
        } else text(markNode,
            "StarCi\nLeague",
            0,
            0,
            {
                font: "title", size: 96, width: 500, height: 180, wrap: true
            })
    })
    rule(root,
        480,
        mark.x,
        at(0,
            570).y,
        true,
        C.gold)
    text(root,
        "Game bài chiến thuật 1v1, 5 đường",
        mark.x,
        at(0,
            607).y,
        {
            size: 30, color: C.goldLight, width: 560
        })
    rule(root,
        430,
        mark.x,
        at(0,
            642).y,
        false,
        C.goldDark)
}

/** Nút con mắt ở mép phải ô mật khẩu: bấm để hiện / ẩn mật khẩu */
function eyeToggle(field: TextField) {
    const node = box("Eye",
        field.node,
        44,
        44,
        FIELD_W / 2 - 34,
        0)
    const g = node.addComponent(Graphics)
    let shown = false
    const paint = () => {
        g.clear()
        g.lineWidth = 2
        g.strokeColor = shown ? C.teal : C.gold
        g.ellipse(0,
            0,
            15,
            9)
        g.stroke()
        g.fillColor = shown ? C.teal : C.gold
        g.circle(0,
            0,
            4.5)
        g.fill()
        if (!shown) {
            g.moveTo(-14,
                -11)
            g.lineTo(14,
                11)
            g.stroke()
        }
    }
    node.on(Node.EventType.TOUCH_END,
        () => {
            shown = !shown
            field.edit.inputFlag = shown ? EditBox.InputFlag.DEFAULT : EditBox.InputFlag.PASSWORD
            paint()
        })
    paint()
}

/** Chữ liên kết in hoa xanh ngọc có gạch chân */
function link(parent: Node, caption: string, x: number, y: number, onClick: () => void) {
    const n = box("Link",
        parent,
        200,
        40,
        x,
        y)
    text(n,
        caption,
        0,
        2,
        {
            font: "title", size: 26, color: C.teal, width: 200, height: 36
        })
    const g = box("Underline",
        n,
        150,
        2,
        0,
        -14).addComponent(Graphics)
    g.fillColor = C.teal
    g.rect(-70,
        -1,
        140,
        2)
    g.fill()
    n.on(Node.EventType.TOUCH_END,
        onClick)
}
