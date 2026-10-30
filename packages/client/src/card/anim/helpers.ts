// Tiện ích cho lớp hoạt ảnh thẻ bài: tìm vị trí phần tử, chạy Web Animations (chỉ transform/opacity), chờ.
import {
    cg
} from "@starci/shared"

export type Side = cg.Side

/** Bề rộng nền của lá bay (px); lá khác co giãn bằng scale */
export const CARD_W = 110

const NO_FX_KEY = "starci.noFx"
/** Chế độ "no effect": tắt hoạt ảnh/VFX/chờ trình diễn để thao tác và kiểm thử UI nhanh. Bật bằng ?fx=0 (?fx=1 tắt) hoặc nút trong trận; nhớ trong localStorage. */
export function noFx(): boolean {
    try {
        const q = new URLSearchParams(window.location.search).get("fx")
        if (q === "0" || q === "1") localStorage.setItem(NO_FX_KEY,
            q === "0" ? "1" : "0")
        return localStorage.getItem(NO_FX_KEY) === "1"
    } catch {
        return false
    }
}
export function setNoFx(on: boolean) {
    try { localStorage.setItem(NO_FX_KEY,
        on ? "1" : "0") } catch { /* trình duyệt chặn lưu: chỉ có hiệu lực trong phiên */ }
}

export function reducedMotion(): boolean {
    if (noFx()) return true
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch {
        return false
    }
}

export const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r,
    Math.max(0,
        ms)))

export interface Pt { x: number; y: number }

export function rectOf(sel: string): DOMRect | null {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return r.width === 0 && r.height === 0 ? null : r
}

export const ptOf = (r: DOMRect): Pt => ({
    x: r.left + r.width / 2, y: r.top + r.height / 2
})

/** Tâm sân (rơi về đây khi không thấy phần tử) */
export function boardCenter(): Pt {
    const r = rectOf(".bd-playfield") ?? rectOf(".cg-board")
    return r ? ptOf(r) : {
        x: window.innerWidth / 2, y: window.innerHeight / 2
    }
}

const sideOfUnit = (unit: string) => unit.split(":")[0]

export const meSide = (you: Side | null): Side => you ?? "A"

export function unitRect(unit: string): DOMRect | null {
    return rectOf(`[data-unit-id="${unit}"]`)
}

export function unitEl(unit: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-unit-id="${unit}"]`)
}

/** Ô đường: `unit` chỉ để biết phe (id dạng "A:darius") */
export function laneRect(unit: string, lane: number, me: Side): DOMRect | null {
    const row = sideOfUnit(unit) === me ? "me" : "foe"
    return rectOf(`.bd-row.${row} [data-lane="${lane + 1}"]`)
}

export function unitPt(unit: string, lane?: number, me?: Side): Pt {
    const r = unitRect(unit) ?? (lane !== undefined && me ? laneRect(unit,
        lane,
        me) : null)
    return r ? ptOf(r) : boardCenter()
}

/** Vùng tay bài của phe `side` (tay mình: thanh dưới; tay địch: dải phía trên) */
export function handRect(side: Side, me: Side): DOMRect | null {
    if (side === me) return rectOf(".hd-fan") ?? rectOf(".cg-hand")
    return rectOf(`[data-opponent-hand="${side}"] .opponent-hand-fan`) ?? rectOf(`[data-cg-hand="${side}"]`)
}

export function opponentCardRect(side: Side, arriving = false): DOMRect | null {
    const slots = document.querySelectorAll<HTMLElement>(`[data-opponent-card="${side}"]${arriving ? "[data-arriving]" : ":not([data-arriving])"}`)
    return slots.length ? slots[slots.length - 1].getBoundingClientRect() : null
}

export function handPt(side: Side, me: Side): Pt {
    const r = handRect(side,
        me)
    if (r) return ptOf(r)
    const b = rectOf(".cg-board")
    if (b) {
        return {
            x: b.left + b.width / 2, y: side === me ? b.bottom + 60 : b.top - 10
        }
    }
    return boardCenter()
}

export function deckPt(side: Side, me: Side): Pt {
    const r = rectOf(`[data-cg-deck="${side}"]`)
    return r ? ptOf(r) : handPt(side,
        me)
}

/** Nút Mộ bài của phe `side` trên dải người chơi (đích bay của lá bị đốt) */
export function gravePt(side: Side, me: Side): Pt {
    const r = rectOf(`[data-cg-grave="${side}"]`) ?? rectOf(`.bd-strip.${side === me ? "me" : "foe"} .bd-cnt.grave`)
    return r ? ptOf(r) : deckPt(side,
        me)
}

/** Chuỗi transform đặt phần tử (đã render) có tâm tại pt */
export function place(el: HTMLElement, pt: Pt, scale = 1, rot = 0): string {
    return `translate(${pt.x - el.offsetWidth / 2}px, ${pt.y - el.offsetHeight / 2}px) rotate(${rot}deg) scale(${scale})`
}

/** Chạy một animation, trả về khi xong (hoặc quá hạn, vd tab ẩn làm animation đứng) */
export function run(el: Element, frames: Keyframe[], ms: number, easing = "ease-out", fill: FillMode = "forwards"): Promise<void> {
    return new Promise<void>((resolve) => {
        let done = false
        const fin = () => {
            if (done) return
            done = true
            resolve()
        }
        try {
            const a = el.animate(frames,
                {
                    duration: Math.max(1,
                        ms), easing, fill
                })
            a.finished.then(fin,
                fin)
        } catch {
            fin()
        }
        window.setTimeout(fin,
            ms + 250)
    })
}

/** Rung nhẹ phần tử (bị đánh) */
export function shake(el: Element | null, ms: number): Promise<void> {
    if (!el) return Promise.resolve()
    return run(el,
        [{
            transform: "translateX(0)"
        },
        {
            transform: "translateX(-6px) rotate(-1deg)", offset: .2
        },
        {
            transform: "translateX(5px) rotate(1deg)", offset: .4
        },
        {
            transform: "translateX(-4px)", offset: .6
        },
        {
            transform: "translateX(3px)", offset: .8
        },
        {
            transform: "translateX(0)"
        }],
        ms,
        "ease-out",
        "none")
}

/** Nhấn tới (lao) về phía `to` rồi trở lại */
export function lunge(el: Element | null, from: Pt, to: Pt, ms: number): Promise<void> {
    if (!el) return Promise.resolve()
    const dx = to.x - from.x, dy = to.y - from.y
    const d = Math.hypot(dx,
        dy) || 1
    const k = Math.min(26,
        d * .25) / d
    return run(el,
        [{
            transform: "translate(0, 0) scale(1)"
        },
        {
            transform: `translate(${dx * k}px, ${dy * k}px) scale(1.08)`, offset: .45
        },
        {
            transform: "translate(0, 0) scale(1)"
        }],
        ms,
        "ease-in-out",
        "none")
}

/** Nhịp phát sáng (co giãn nhẹ) */
export function pulse(el: Element | null, ms: number, to = 1.1): Promise<void> {
    if (!el) return Promise.resolve()
    return run(el,
        [{
            transform: "scale(1)"
        },
        {
            transform: `scale(${to})`, offset: .4
        },
        {
            transform: "scale(1)"
        }],
        ms,
        "ease-in-out",
        "none")
}

/** Làm mờ dần một phần tử có thật trên sân (tướng bị hạ) */
export function fadeOut(el: HTMLElement | null, ms: number): void {
    if (!el) return
    try {
        const a = el.animate([{
            opacity: 1, transform: "scale(1)"
        },
        {
            opacity: .15, transform: "scale(.92)"
        }],
        {
            duration: ms, easing: "ease-in", fill: "forwards"
        })
        window.setTimeout(() => a.cancel(),
            ms + 1200)
    } catch {
        /* bỏ qua */
    }
}
