// Thanh trên của các màn sau đăng nhập (bóc từ decks.png / builder.png): huy hiệu + chữ STARCI LEAGUE, vạch đứng,
// tiêu đề màn; bên phải huy hiệu nhỏ, tên người chơi, nút Đăng xuất; đường vàng mảnh ở đáy.
import {
    Graphics, Node
} from "cc"
import {
    C, STAGE, at
} from "../dna/theme"
import {
    image
} from "../ui/assets"
import {
    Button, box, rule, text
} from "../ui/kit"
import type {
    Nav
} from "./nav"

/** `top`: tâm thanh theo mockup (decks.png 83, builder.png 62), `line`: đường vàng đáy thanh */
export function header(root: Node, nav: Nav, title: string, logout = true, top = 83, line = 134) {
    const y = at(0,
        top).y
    const bar = box("Header",
        root,
        STAGE.w,
        110,
        0,
        y)
    image(bar,
        "art/logo/crest",
        86,
        86,
        at(235,
            0).x,
        0)
    text(bar,
        "StarCi League",
        at(440,
            0).x,
        0,
        {
            font: "title", size: 30, width: 240, align: "left"
        })
    const divider = box("Divider",
        bar,
        2,
        64,
        at(475,
            0).x,
        0).addComponent(Graphics)
    divider.fillColor = C.goldDark
    divider.rect(-1,
        -32,
        2,
        64)
    divider.fill()
    text(bar,
        title,
        at(520,
            0).x + 260,
        0,
        {
            font: "title", size: 56, width: 520, align: "left"
        })
    image(bar,
        "art/logo/crest",
        56,
        56,
        at(1323,
            0).x,
        0)
    text(bar,
        nav.session?.user.name ?? "",
        at(1440,
            0).x,
        0,
        {
            size: 32, color: C.goldLight, width: 200
        })
    if (logout) new Button(bar,
        "Đăng xuất",
        196,
        52,
        at(1645,
            0).x,
        0,
        () => nav.signOut())
    rule(root,
        STAGE.w - 280,
        0,
        at(0,
            line).y,
        false,
        C.goldDark)
}
