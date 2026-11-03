// Nội dung hai tab "Đồ" và "Bổ trợ" của cột chi tiết tướng bên trái, bóc từ docs/mockups/match/targeting.png.
// Vẽ từ toạ độ y = top đi xuống, rộng 300, vào node cha của cột (gốc ở giữa cột).
import {
    Node
} from "cc"
import {
    cg
} from "../../shared"
import {
    C
} from "../../dna/theme"
import {
    slot
} from "../../ui/slot"
import {
    text
} from "../../ui/kit"
import type {
    CardView
} from "../../net/game"
import {
    unitEffects
} from "./statusText"

const W = 300
const ROW = 70

/** Một dòng thông báo khi danh sách trống */
function empty(parent: Node, s: string, top: number) {
    text(parent, s, 0, top - 24, {
        size: 18, width: W, color: C.textMuted
    })
}

/** Tab Đồ: mỗi món một hàng, ô vuông + tên + chỉ số */
export function renderItemsTab(parent: Node, view: CardView, unit: cg.Unit, top: number): void {
    void view
    if (!unit.items.length) {
        empty(parent, "Chưa đeo đồ", top)
        return
    }
    unit.items.slice(0, 6).forEach((id, i) => {
        const y = top - 30 - i * ROW
        const t = cg.itemText(id, "vi")
        slot(parent, "items", id, 52, -W / 2 + 36, y)
        text(parent, t?.name ?? id, 30, y + 13, {
            font: "titleMedium", size: 20, width: 220, align: "left", upper: false
        })
        text(parent, t?.stats ?? "", 30, y - 13, {
            size: 15, width: 220, align: "left", color: C.textMuted
        })
    })
}

/** Tab Bổ trợ: mỗi hiệu ứng một hàng, tên theo màu có lợi / có hại, số vòng còn lại, mô tả ngắn */
export function renderEffectsTab(parent: Node, view: CardView, unit: cg.Unit, top: number): void {
    const fx = unitEffects(view, unit)
    if (!fx.length) {
        empty(parent, "Không có hiệu ứng", top)
        return
    }
    fx.slice(0, 6).forEach((e, i) => {
        const y = top - 32 - i * ROW
        text(parent, e.name, -W / 2 + 100, y + 14, {
            font: "titleMedium", size: 19, width: 190, align: "left", upper: false, color: e.good ? C.teal : C.danger
        })
        text(parent, e.turns ? `Còn ${e.turns} vòng` : "Liên tục", W / 2 - 56, y + 14, {
            size: 15, width: 100, align: "right", color: C.textMuted
        })
        text(parent, e.desc, 0, y - 12, {
            size: 14, width: W - 12, height: 34, align: "left", wrap: true, color: C.text
        })
    })
}
