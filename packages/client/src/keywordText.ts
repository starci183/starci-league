// Từ khóa hiệu ứng trong khung giải thích trong trận: chữ BBCode của Rex, icon chèn bằng [img=...].
import Phaser from "phaser"
import {
    keywordIcons, keywordParts, keywordsIn
} from "@starci/shared"

const key = (id: string) => `kw-${id}`

export function preloadKeywords(scene: Phaser.Scene) {
    for (const k of keywordIcons()) scene.load.image(key(k.id),
        `/${k.icon}`)
}

/** Đăng ký icon cho một ô chữ BBCode (cỡ theo cỡ chữ) */
export function addKeywordImages(text: { addImage(imgKey: string, config?: object): unknown }, size: number, scene: Phaser.Scene) {
    for (const k of keywordIcons()) {
        if (!scene.textures.exists(key(k.id))) continue
        text.addImage(key(k.id),
            {
                key: key(k.id), width: size * 1.3, height: size * 1.3, y: size * 0.25, right: 3
            })
    }
}

const plain = (s: string) => s.replace(/\[/g,
    "(").replace(/\]/g,
    ")")

/** Chữ thường -> BBCode: từ khóa in đậm có icon, cuối cùng là chú giải các hiệu ứng */
export function keywordBB(text: string) {
    const body = keywordParts(text).map((p) => typeof p === "string" ? plain(p)
        : "num" in p ? `[b][color=#f5c84a]${plain(p.text)}[/color][/b]`
            : `[img=${key(p.kw.id)}][b][color=${p.kw.good ? "#8fe0a0" : "#ff9a8a"}]${plain(p.text)}[/color][/b]`).join("")
    const kws = keywordsIn([text])
    if (!kws.length) return body
    return `${body}\n[color=#6f6a5a]────────[/color]\n` + kws.map((k) =>
        `[img=${key(k.id)}][b][color=#f5d27a]${plain(k.name)}[/color][/b]: [color=#a9b4c4]${plain(k.desc)}[/color]`).join("\n")
}
