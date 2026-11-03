// Font và tranh nạp từ assets/resources. Font nạp một lần lúc khởi động; tranh nạp theo yêu cầu và giữ trong bộ nhớ đệm.
import {
    ImageAsset, Node, Sprite, SpriteFrame, TTFFont, UITransform, resources
} from "cc"

export type FontRole = "title" | "titleMedium" | "text" | "textMedium" | "number"

const FONT_FILES: Record<FontRole, string> = {
    title: "fonts/AlegreyaSC-Bold",
    titleMedium: "fonts/AlegreyaSC-Medium",
    // Thân chữ và số theo mockup: serif Alegreya (cùng họ với tiêu đề), có đủ dấu tiếng Việt
    text: "fonts/Alegreya-Variable",
    textMedium: "fonts/Alegreya-Variable",
    number: "fonts/AlegreyaSC-Bold",
}

const fonts: Partial<Record<FontRole, TTFFont>> = {
}

export const fontOf = (role: FontRole): TTFFont | null => fonts[role] ?? null

/** Nạp cả bộ font; font nào lỗi thì nhãn dùng font hệ thống */
export function loadFonts(): Promise<void> {
    return Promise.all((Object.keys(FONT_FILES) as FontRole[]).map((role) => new Promise<void>((resolve) => {
        resources.load(FONT_FILES[role],
            TTFFont,
            (err, font) => {
                if (!err) fonts[role] = font
                resolve()
            })
    }))).then(() => undefined)
}

const frames = new Map<string, Promise<SpriteFrame | null>>()

/** SpriteFrame từ ảnh trong resources (đường dẫn không đuôi), null nếu chưa có file */
export function frameOf(path: string): Promise<SpriteFrame | null> {
    let p = frames.get(path)
    if (!p) {
        p = new Promise((resolve) => resources.load(path,
            ImageAsset,
            (err, image) => resolve(err ? null : SpriteFrame.createWithImage(image))))
        frames.set(path,
            p)
    }
    return p
}

/** Node ảnh kích thước cố định; ảnh hiện khi nạp xong, không có file thì để trống */
export function image(parent: Node, path: string, w: number, h: number, x = 0, y = 0): Node {
    const n = new Node(`Image ${path}`)
    n.layer = parent.layer
    n.addComponent(UITransform).setContentSize(w,
        h)
    parent.addChild(n)
    n.setPosition(x,
        y)
    void frameOf(path).then((frame) => {
        if (!frame || !n.isValid) return
        const s = n.addComponent(Sprite)
        s.sizeMode = Sprite.SizeMode.CUSTOM
        s.spriteFrame = frame
    })
    return n
}
