// Tự bỏ qua cửa sổ Chuỗi chỉ có đòn Quick không cần lá (Đấu sĩ 66%): không chặn người chơi sau mỗi lá đối thủ đánh.
// ChainStage gọi useCardlessAutoPass() (chạy hẹn giờ); các nơi khác chỉ đọc hạn chót qua useAutoPassDeadline() để vẽ đếm ngược.
// Cửa sổ có lá Quick thật thì giữ nguyên như cũ (chờ người chơi bấm).
import {
    useEffect, useState, useSyncExternalStore
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard
} from "../store"

/** Thời gian chờ trước khi tự bỏ qua (ms) */
export const AUTO_PASS_MS = 2500

let deadline: number | null = null
const listeners = new Set<() => void>()
const setDeadline = (d: number | null) => {
    if (d === deadline) return
    deadline = d
    for (const f of listeners) f()
}
const subscribe = (f: () => void) => {
    listeners.add(f)
    return () => {
        listeners.delete(f)
    }
}

/** Hạn chót (Date.now()) của lần tự bỏ qua đang chờ, null nếu không có */
export function useAutoPassDeadline(): number | null {
    return useSyncExternalStore(subscribe,
        () => deadline)
}

/**
 * Chạy hẹn giờ tự bỏ qua. `active` = đang tới lượt mình nối chuỗi và không có hoạt hình chuỗi.
 * Dừng hẳn khi người chơi bắt đầu chọn mục tiêu (đã bấm nút đánh nhanh) hoặc cửa sổ đổi.
 */
export function useCardlessAutoPass(active: boolean) {
    const { view, legal, targeting } = useCard()
    const me = view?.you ?? null
    const on = active && !!view && !!me && !targeting && cg.isCardlessOnlyWindow(view.phase,
        legal)
    useEffect(() => {
        if (!on || !me) {
            setDeadline(null)
            return
        }
        setDeadline(Date.now() + AUTO_PASS_MS)
        const t = window.setTimeout(() => {
            setDeadline(null)
            const pass = legal.find((a) => a.t === "pass") ?? {
                t: "pass", side: me
            } as cg.Action
            cardActions.act(pass)
        },
        AUTO_PASS_MS)
        return () => {
            window.clearTimeout(t)
            setDeadline(null)
        }
    },
    [on,
        legal,
        me])
}

/** Số giây còn lại (1 chữ số thập phân) tới hạn chót, cập nhật mỗi 100ms */
export function useSecondsLeft(until: number | null): number {
    const [now,
        setNow] = useState(() => Date.now())
    useEffect(() => {
        if (until === null) return
        setNow(Date.now())
        const t = window.setInterval(() => setNow(Date.now()),
            100)
        return () => window.clearInterval(t)
    },
    [until])
    return until === null ? 0 : Math.max(0,
        Math.round((until - now) / 100) / 10)
}
