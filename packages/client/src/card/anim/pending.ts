// Các lá vừa vào tay mình nhưng hoạt ảnh rút/trộm chưa bay tới: tay bài ẩn ô đó cho tới khi lá đáp xuống.
// AnimLayer thêm uid ngay khi nhận lô sự kiện; drawsStep gỡ từng uid khi lá bay tới ô của nó.

let pending: ReadonlySet<string> = new Set()
const subs = new Set<() => void>()

function emit(next: Set<string>) {
    pending = next
    subs.forEach((f) => f())
}

/** Đánh dấu các lá đang chờ hoạt ảnh */
export function holdCards(uids: string[]) {
    if (!uids.length) return
    emit(new Set([...pending,
        ...uids]))
}

/** Lá đã bay tới tay: hiện lại ô của nó */
export function releaseCard(uid: string) {
    if (!pending.has(uid)) return
    const next = new Set(pending)
    next.delete(uid)
    emit(next)
}

/** Gỡ hết (lô bị bỏ qua, tắt hoạt ảnh, rời trận) */
export function releaseAll() {
    if (pending.size) emit(new Set())
}

export function subscribePending(f: () => void): () => void {
    subs.add(f)
    return () => {
        subs.delete(f)
    }
}

export const pendingSnapshot = (): ReadonlySet<string> => pending
