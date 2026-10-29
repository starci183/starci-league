// Đếm ngược tự bỏ qua cửa sổ Chuỗi chỉ có đòn Quick không cần lá (xem autoPass.ts). Không có hạn chót thì không vẽ gì.
import type {
    CSSProperties
} from "react"
import {
    AUTO_PASS_MS, useAutoPassDeadline, useSecondsLeft
} from "./autoPass"
import {
    getLang
} from "./text"

export function AutoPassBar() {
    const until = useAutoPassDeadline()
    const left = useSecondsLeft(until)
    if (until === null) return null
    const en = getLang() === "en"
    const pct = Math.max(0,
        Math.min(100,
            left * 1000 / AUTO_PASS_MS * 100))
    return (
        <div className="ap-bar" title={en ? "Only a Quick attack is possible: passing automatically" : "Chỉ có đòn Đánh nhanh: tự bỏ qua"}>
            <span className="ap-text">{en ? `Auto-pass in ${left.toFixed(1)}s` : `Tự bỏ qua sau ${left.toFixed(1)}s`}</span>
            <i className="ap-track">
                <i className="ap-fill" style={{
                    width: `${pct}%`
                } as CSSProperties} />
            </i>
        </div>
    )
}
