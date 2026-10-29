import Phaser from "phaser"
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js"
import {
    BoardScene
} from "./BoardScene"
import {
    fitZoom, screenSize, view
} from "./res"
import {
    showLobby
} from "./lobby"
import {
    startCardGame
} from "./card/CardApp"
import {
    injectNineCss
} from "./nine"
import {
    mountUi
} from "./ui/mount"
import {
    applyLocale, type Lang
} from "@starci/shared"
// font Nunito (tự host, không phụ thuộc mạng)
import "@fontsource/nunito/400.css"
import "@fontsource/nunito/600.css"
import "@fontsource/nunito/700.css"
import "@fontsource/nunito/800.css"

// ngôn ngữ đã chọn (mặc định tiếng Việt): đổi tên/mô tả trong dữ liệu game trước khi vẽ bất cứ gì
let saved: string | null = null
try { saved = localStorage.getItem("lang") } catch { /* chế độ riêng tư */ }
applyLocale(saved === "en" ? "en" : ("vi" as Lang))
injectNineCss()

// Sảnh đăng nhập + xếp bộ bài trước, xong mới tạo game
const picked = await showLobby()
if (picked.mode.kind === "card") {
    // chế độ thẻ bài: giao diện React riêng, không dựng Phaser
    startCardGame({
        name: picked.name, token: picked.token, bot: picked.mode.bot, roomId: picked.mode.roomId
    })
} else await startBoard()

async function startBoard() {
// Phaser vẽ chữ lên canvas: chờ font Nunito nạp xong để chữ không bị font dự phòng
    await Promise.all(["400 16px Nunito",
        "700 16px Nunito",
        "800 16px Nunito"].map((f) => document.fonts.load(f)))

    const { w, h } = screenSize()
    view.zoom = fitZoom(w,
        h)

    // Mọi chữ vẽ đúng độ phân giải màn hình để không nhòe khi camera zoom
    const factory: Phaser.GameObjects.GameObjectFactory = Phaser.GameObjects.GameObjectFactory.prototype
    const addText = factory.text
    factory.text = function (this: Phaser.GameObjects.GameObjectFactory, x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) {
        return addText.call(this,
            x,
            y,
            text,
            {
                resolution: Math.ceil(view.zoom * 100) / 100, ...style
            })
    }

    // Canvas = pixel vật lý của cửa sổ; CSS kéo nó về đúng kích thước cửa sổ (xem index.html)
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "app",
        width: w,
        height: h,
        backgroundColor: "#0b130a",
        antialias: true,
        scale: {
            mode: Phaser.Scale.NONE
        },
        scene: [BoardScene],
        // Rex UI: widget mã nguồn mở cho Phaser (textArea, toast, sizer, ninePatch...) -> this.rexUI trong scene
        plugins: {
            scene: [{
                key: "rexUI", plugin: UIPlugin, mapping: "rexUI"
            }]
        },
    })

    window.addEventListener("resize",
        () => {
            const s = screenSize()
            game.scale.resize(s.w,
                s.h)
        })
    // bảng bên phải + tooltip (React/shadcn) đè lên canvas
    mountUi()
}
