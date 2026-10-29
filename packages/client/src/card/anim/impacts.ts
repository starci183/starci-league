// Số nổi (sát thương/hồi máu/khiên) chỉ hiện khi hoạt ảnh tới nhịp trúng đích.
// Máu/khiên trên sân do khung hình hiển thị của store lo (store.applyToDisplay); file này chỉ còn phát số nổi.
// Khi nhận lô: AnimLayer gọi queueImpacts (đánh dấu). Nhịp trúng (playGroup) gọi landImpacts -> phát số nổi. Lô bị bỏ qua cũng land ngay.
import type {
    cg
} from "@starci/shared"

type GameEvent = cg.GameEvent

const queued = new WeakSet<GameEvent>()
const floatSubs = new Set<(events: GameEvent[]) => void>()

const isImpact = (e: GameEvent): boolean => e.t === "damage" || e.t === "heal" || e.t === "shield"

/** Lô vừa tới: đánh dấu các sự kiện sẽ nổi số khi hoạt ảnh trúng */
export function queueImpacts(events: GameEvent[]) {
    events.filter((e) => isImpact(e)).forEach((e) => queued.add(e))
}

/** Hoạt ảnh trúng (hoặc lô bị bỏ qua): nổi số */
export function landImpacts(events: GameEvent[]) {
    const list = events.filter((e) => queued.has(e))
    list.forEach((e) => queued.delete(e))
    if (list.length) floatSubs.forEach((f) => f(list))
}

/** Nghe các sự kiện vừa trúng để vẽ số nổi */
export function onImpactFloats(f: (events: GameEvent[]) => void): () => void {
    floatSubs.add(f)
    return () => {
        floatSubs.delete(f)
    }
}
