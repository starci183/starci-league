// Skin vẽ sẵn (khung, nút, họa tiết do Codex imagegen, xem docs/briefs/codex-ui-skin.md) ghép vào game bằng Sprite 9-slice.
// File ở assets/resources/skin/<tên>.png, biên 9-slice ở skin/slices.json. Thiếu file (hoặc chưa có slices.json) thì hàm
// trả null và khung quay về bản code tự vẽ, nên game vẫn chạy khi chưa có ảnh.
import {
    ImageAsset, JsonAsset, Node, Sprite, SpriteFrame, UITransform, resources
} from "cc"

export interface SliceInsets { top: number; right: number; bottom: number; left: number }

type State = "loading" | "ok" | "missing"

let slices: Record<string, SliceInsets> = {
}
const frames = new Map<string, SpriteFrame>()
const state = new Map<string, State>()
const waiting = new Map<string, Promise<void>>()

/** Nạp bảng biên 9-slice; gọi một lần lúc khởi động (không có file thì bỏ qua) */
export function loadSkin(): Promise<void> {
    return new Promise((resolve) => {
        resources.load("skin/slices",
            JsonAsset,
            (err, asset) => {
                if (!err && asset?.json) slices = asset.json as Record<string, SliceInsets>
                resolve()
            })
    })
}

/** Khoá bảng biên theo tên file: "panel" -> "panel.png" */
const keyOf = (name: string) => `${name.split("/").pop()}.png`

/** Yêu cầu nạp một mảnh skin (idempotent); xong thì SpriteFrame có sẵn trong cache */
export function skinRequest(name: string): Promise<void> {
    const have = waiting.get(name)
    if (have) return have
    state.set(name,
        "loading")
    const p = new Promise<void>((resolve) => {
        resources.load(`skin/${name}`,
            ImageAsset,
            (err, image) => {
                if (err || !image) {
                    state.set(name,
                        "missing")
                    return resolve()
                }
                const frame = SpriteFrame.createWithImage(image)
                const ins = slices[keyOf(name)]
                if (ins) {
                    frame.insetTop = ins.top
                    frame.insetBottom = ins.bottom
                    frame.insetLeft = ins.left
                    frame.insetRight = ins.right
                }
                frames.set(name,
                    frame)
                state.set(name,
                    "ok")
                resolve()
            })
    })
    waiting.set(name,
        p)
    return p
}

export const skinReady = (name: string): SpriteFrame | null => frames.get(name) ?? null
export const skinMissing = (name: string): boolean => state.get(name) === "missing"
export const skinHasSlices = (name: string): boolean => !!slices[keyOf(name)]

/** Gắn Sprite lên `node`: 9-slice nếu mảnh có biên trong slices.json, không thì kéo đều; ẩn node cho tới khi có ảnh */
export function paintSkin(node: Node, name: string, w: number, h: number): boolean {
    const frame = skinReady(name)
    const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite)
    if (!frame) {
        node.active = false
        return false
    }
    node.getComponent(UITransform)?.setContentSize(w,
        h)
    // 9-slice chỉ khi ô đủ lớn cho cả bốn góc; ô nhỏ hơn thì kéo đều cả ảnh (không méo họa tiết góc)
    const ins = slices[keyOf(name)]
    sprite.type = ins && w >= ins.left + ins.right && h >= ins.top + ins.bottom ? Sprite.Type.SLICED : Sprite.Type.SIMPLE
    sprite.sizeMode = Sprite.SizeMode.CUSTOM
    sprite.spriteFrame = frame
    node.active = true
    return true
}
