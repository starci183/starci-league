// Widget dùng Rex UI (phaser3-rex-plugins): khung chữ cuộn được, thông báo nổi.
import Phaser from "phaser"
import type UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js"
import {
    FONT, hasArt, hbar, nine
} from "./art"
import {
    addKeywordImages
} from "./keywordText"

export type RexScene = Phaser.Scene & { rexUI: UIPlugin };

const GOLD = 0xc8a050

/** Khung chữ cuộn được bằng con lăn chuột (nhật ký, mô tả đồ) */
export function scrollText(scene: RexScene, x: number, y: number, w: number, h: number, size = 11, color = "#ececf0", bbcode = false) {
    // bbcode: chữ Rex BBCode để in đậm từ khóa và chèn icon hiệu ứng
    const text = bbcode
        ? scene.rexUI.add.BBCodeText(0,
            0,
            "",
            {
                fontFamily: FONT, fontSize: `${size}px`, color, wrap: {
                    mode: "word", width: w - 26
                }, lineSpacing: 3
            })
        : scene.add.text(0,
            0,
            "",
            {
                fontFamily: FONT, fontSize: `${size}px`, color, wordWrap: {
                    width: w - 26
                }, lineSpacing: 2
            })
    if (bbcode) addKeywordImages(text as never,
        size,
        scene)
    return scene.rexUI.add.textArea({
        x: x + w / 2, y: y + h / 2, width: w, height: h,
        background: scene.rexUI.add.roundRectangle(0,
            0,
            2,
            2,
            8,
            0x0d0b12,
            0.85).setStrokeStyle(1,
            GOLD,
            0.35),
        text,
        slider: {
            track: scene.rexUI.add.roundRectangle(0,
                0,
                5,
                10,
                2,
                0x2a2a32),
            thumb: scene.rexUI.add.roundRectangle(0,
                0,
                5,
                26,
                2,
                GOLD),
        },
        mouseWheelScroller: {
            focus: true, speed: 0.4
        },
        space: {
            left: 8, right: 4, top: 6, bottom: 6, text: 6
        },
    }).layout()
}

/** Thông báo nổi (lỗi, nhắc nhở) */
export function toast(scene: RexScene, x: number, y: number) {
    return scene.rexUI.add.toast({
        x, y,
        background: scene.rexUI.add.roundRectangle(0,
            0,
            2,
            2,
            10,
            0x8a2a24,
            0.95).setStrokeStyle(2,
            0xf5b942,
            0.8),
        text: scene.add.text(0,
            0,
            "",
            {
                fontFamily: FONT, fontSize: "17px", color: "#fff", fontStyle: "bold"
            }),
        space: {
            left: 16, right: 16, top: 8, bottom: 8
        },
        duration: {
            in: 150, hold: 1300, out: 300
        },
    })
}

/** Nền nút: ảnh nút Hextech do Codex vẽ (vàng / xanh / tắt), thiếu ảnh thì vẽ tay */
export function buttonBg(scene: Phaser.Scene, x: number, y: number, w: number, h: number, enabled: boolean, color = 0x2f6fde) {
    const gold = color === 0xb8862b || color === 0x7a4f25
    const key = !enabled ? "ui-button_disabled" : gold ? "ui-button_gold" : "ui-button_blue"
    if (hasArt(scene,
        key)) return hbar(scene,
        key,
        x,
        y,
        w,
        h)
    const g = scene.add.graphics()
    g.fillStyle(enabled ? color : 0x23232b,
        1); g.fillRoundedRect(x,
        y,
        w,
        h,
        6)
    g.fillStyle(0xffffff,
        enabled ? 0.12 : 0); g.fillRoundedRect(x,
        y,
        w,
        h / 2,
        {
            tl: 6, tr: 6, bl: 0, br: 0
        })
    g.lineStyle(1,
        enabled ? 0xf5d27a : 0x3a3a44,
        enabled ? 0.7 : 1); g.strokeRoundedRect(x,
        y,
        w,
        h,
        6)
    return g
}

/** Ảnh UI đơn (ngọc, đồng vàng, ô kho, mặt sau lá bài) vừa khung w×h; không có ảnh thì trả undefined */
export function uiImage(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number) {
    return hasArt(scene,
        key) ? scene.add.image(x,
            y,
            key).setDisplaySize(w,
            h) : undefined
}

/** Khung Hextech 9 mảnh nếu có ảnh (bảng ghép đồ, khung tướng) */
export function frameBg(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number, cornerDst = 18) {
    return hasArt(scene,
        key) ? nine(scene,
            key,
            x,
            y,
            w,
            h,
            0.11,
            cornerDst) : undefined
}
