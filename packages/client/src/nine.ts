// Bảng 9-slice dùng chung cho cả game (Phaser / Rex UI) lẫn Sảnh và Xây bộ bài (CSS border-image), để UI đồng bộ:
// cùng ảnh Codex vẽ, cùng số px cắt góc. Thêm tấm mới: vẽ ảnh vào public/ui/nine, cập nhật nineMeta.ts, khai báo vào NINE.
import Phaser from "phaser"
import {
    NINE_META
} from "./nineMeta"

type NineName = keyof typeof NINE_META;
/** Tấm 9-slice theo vai trò giao diện + độ dày viền khi hiển thị (px màn hình) */
export const NINE: Record<string, { img: NineName; border: number }> = {
    panel: {
        img: "tooltip", border: 18
    },     // bảng nền chung
    tooltip: {
        img: "tooltip", border: 18
    },   // ô giải thích / chi tiết lá bài
    tray: {
        img: "deck_tray", border: 24
    },    // khay chứa bài (bộ bài, bài trên tay)
    header: {
        img: "header_bar", border: 16
    }, // thanh tiêu đề
    slot: {
        img: "card_slot", border: 14
    },    // ô trống đặt lá
}

const url = (img: NineName) => `ui/nine/${img}.png`

/** CSS cho các class .nine-<vai trò>: border-image kéo giãn 9 ô (fill = lấy luôn ruột ảnh làm nền) */
export function injectNineCss() {
    if (document.getElementById("nine-css")) return
    const css = Object.entries(NINE).map(([role,
        { img, border }]) => {
        const [t,
            r,
            b,
            l] = NINE_META[img].slice
        return `.nine-${role}{border-style:solid;border-width:${border}px;border-image:url(${url(img)}) ${t} ${r} ${b} ${l} fill / ${border}px stretch;background:none!important;border-radius:0!important;box-shadow:none!important}`
    }).join("\n")
    const el = document.createElement("style")
    el.id = "nine-css"
    el.textContent = `${css}\n${controlCss()}`
    document.head.appendChild(el)
}

/** Nút, ô nhập, tab, thanh cuộn: ảnh Codex vẽ, k = tỉ lệ thu ảnh (độ dày viền = số px cắt × k) */
const CONTROLS: [selector: string, img: NineName, k: number, extra?: string][] = [
    [".lb-btn",
        "btn_blue",
        0.22,
        "padding:0 4px;min-height:34px;color:#e8e4d8"],
    [".lb-btn:hover:not(:disabled)",
        "btn_blue_hover",
        0.22],
    [".lb-btn.gold",
        "btn_gold",
        0.22,
        "color:#1a1206;font-weight:800"],
    [".lb-btn.gold:hover:not(:disabled)",
        "btn_gold_hover",
        0.22],
    [".lb-btn:disabled,.lb-btn.gold:disabled",
        "btn_disabled",
        0.22,
        "color:#8a8a8a;opacity:1"],
    [".lb-tile",
        "btn_blue",
        0.3,
        "padding:4px 8px"],
    [".lb-tile:hover:not(:disabled)",
        "btn_blue_hover",
        0.3],
    [".lb-tile.gold",
        "tab_on",
        0.3],
    ["#lobby input,#lobby select",
        "input",
        0.22,
        "padding:2px 4px;color:#f0e6d2"],
    ["#lobby input:focus,#lobby select:focus",
        "input_focus",
        0.22],
    [".lb-tabs button",
        "tab_off",
        0.2,
        "padding:2px 4px"],
    [".lb-tabs button.on",
        "tab_on",
        0.2],
]
function controlCss() {
    const rule = (sel: string, img: NineName, k: number, extra = "") => {
        const sl = NINE_META[img].slice, w = sl.map((v) => `${Math.round(v * k)}px`).join(" ")
        return `${sel}{border-style:solid;border-width:${w};border-image:url(${url(img)}) ${sl.join(" ")} fill / ${w} stretch;background:none;border-radius:0;box-shadow:none;${extra}}`
    }
    // thanh cuộn: rãnh + con trượt vàng (Chrome/Edge); Firefox chỉ đổi màu
    // (không đặt scrollbar-color cho Chrome: có nó thì Chrome bỏ qua ::-webkit-scrollbar)
    const track = NINE_META.scroll_track.slice, thumb = NINE_META.scroll_thumb.slice
    const px = (sl: readonly number[], k: number) => sl.map((v) => `${Math.round(v * k)}px`).join(" ")
    const kt = 12 / NINE_META.scroll_track.w, kh = 12 / NINE_META.scroll_thumb.w
    const scroll = [
        "@supports not selector(::-webkit-scrollbar){*{scrollbar-color:#b8862b #070b11}}",
        "::-webkit-scrollbar{width:12px;height:12px;background:transparent}",
        `::-webkit-scrollbar-track{border-style:solid;border-width:${px(track,
            kt)};border-image:url(${url("scroll_track")}) ${track.join(" ")} fill / ${px(track,
            kt)} stretch}`,
        `::-webkit-scrollbar-thumb{border-style:solid;border-width:${px(thumb,
            kh)};border-image:url(${url("scroll_thumb")}) ${thumb.join(" ")} fill / ${px(thumb,
            kh)} stretch}`,
        "::-webkit-scrollbar-corner{background:transparent}",
    ]
    // khung thẻ: viền theo % bề rộng thẻ (cqw) để mọi cỡ thẻ cùng tỉ lệ, thu 0.75 cho viền gọn
    const cq = (img: NineName, k: number) => NINE_META[img].slice.map((v) => `${((v * 100) / NINE_META[img].w * k).toFixed(2)}cqw`).join(" ")
    const cards = (["spell",
        "trap",
        "stat",
        "item"] as const).map((kind) => {
        const img = `card_${kind}` as const, w = cq(img,
            0.75)
        return `.cv.${kind} .cv-in{border-style:solid;border-width:${w};border-image:url(${url(img)}) ${NINE_META[img].slice.join(" ")} fill / ${w} stretch}`
    })
    // khung trong (ô tranh): viền vàng mảnh, ruột trong suốt
    const art = cq("card_art",
        0.32)
    cards.push(`.cv-icon::after{border-style:solid;border-width:${art};border-image:url(${url("card_art")}) ${NINE_META.card_art.slice.join(" ")} / ${art} stretch}`)
    return [...CONTROLS.map(([sel,
        img,
        k,
        extra]) => rule(sel,
        img,
        k,
        extra)),
    ...scroll,
    ...cards].join("\n")
}

/** Nạp ảnh 9-slice cho Phaser (key: nine-<tên ảnh>) */
export function preloadNine(scene: Phaser.Scene) {
    for (const img of Object.keys(NINE_META) as NineName[]) scene.load.image(`nine-${img}`,
        url(img))
}

/** Vẽ một tấm 9-slice trong Phaser (Rex UI/Phaser NineSlice), cùng thông số với bản CSS */
export function ninePanel(scene: Phaser.Scene, role: keyof typeof NINE, x: number, y: number, w: number, h: number) {
    const { img, border } = NINE[role]
    const key = `nine-${img}`
    if (!scene.textures.exists(key)) return undefined
    const [t,
        r,
        b,
        l] = NINE_META[img].slice
    // NineSlice giữ góc đúng kích thước ảnh: thu nhỏ cả tấm để góc hiện đúng `border` px như bản CSS
    const k = border / Math.max(t,
        l)
    const ns = scene.add.nineslice(x,
        y,
        key,
        undefined,
        w / k,
        h / k,
        l,
        r,
        t,
        b).setOrigin(0).setScale(k)
    return ns
}

/** Vẽ 9-slice lên canvas 2D (nền tĩnh của bàn đấu) */
export function drawNineCanvas(ctx: CanvasRenderingContext2D, image: CanvasImageSource, role: keyof typeof NINE, x: number, y: number, w: number, h: number) {
    const { img, border: d } = NINE[role]
    const { w: iw, h: ih, slice: [t,
        r,
        b,
        l] } = NINE_META[img]
    const sx = [0,
            l,
            iw - r,
            iw], sy = [0,
            t,
            ih - b,
            ih]
    const dx = [x,
            x + d,
            x + w - d,
            x + w], dy = [y,
            y + d,
            y + h - d,
            y + h]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        ctx.drawImage(image,
            sx[i],
            sy[j],
            sx[i + 1] - sx[i],
            sy[j + 1] - sy[j],
            dx[i],
            dy[j],
            dx[i + 1] - dx[i],
            dy[j + 1] - dy[j])
    }
}
