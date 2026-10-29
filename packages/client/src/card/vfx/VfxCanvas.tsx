// Canvas PixiJS toàn màn hình (trong suốt, không bắt chuột) cho hiệu ứng chiêu thức.
// Dùng: playVfx("fireball", from, [target], { color, intensity }) -> Promise resolve khi hiệu ứng xong.
// Nếu canvas chưa gắn, người dùng bật giảm chuyển động, hoặc hiệu ứng chưa đăng ký thì resolve ngay.
import {
    useEffect
} from "react"
import {
    Application, Container, Ticker
} from "pixi.js"
import {
    getVfx, type Pt, type VfxCtx
} from "./types"
import "./fx_projectiles"
import "./fx_aoe"
import "./fx_meta"

let app: Application | null = null
let ready: Promise<Application | null> | null = null
let active = 0
let shakeAnim: Animation | null = null

function reduced(): boolean {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch {
        return false
    }
}

/** Rung .cg-root bằng CSS transform trong `ms` mili giây */
export function shakeScreen(power: number, ms: number) {
    const el = document.querySelector<HTMLElement>(".cg-root")
    if (!el || reduced()) return
    shakeAnim?.cancel()
    const n = Math.max(4,
        Math.round(ms / 28))
    const frames: Keyframe[] = []
    for (let i = 0; i < n; i++) {
        const k = 1 - i / n
        frames.push({
            transform: `translate(${((Math.random() - .5) * 2 * power * k).toFixed(1)}px, ${((Math.random() - .5) * 2 * power * k).toFixed(1)}px)`
        })
    }
    frames.push({
        transform: "translate(0, 0)"
    })
    try {
        shakeAnim = el.animate(frames,
            {
                duration: ms, easing: "linear"
            })
    } catch {
        /* trình duyệt không hỗ trợ */
    }
}

function wake() {
    active++
    if (!Ticker.shared.started) Ticker.shared.start()
}

function rest(a: Application) {
    active = Math.max(0,
        active - 1)
    if (active === 0) {
        try {
            a.render()
        } catch {
            /* đã huỷ */
        }
        Ticker.shared.stop()
    }
}

export async function playVfx(name: string, from: Pt, to: Pt[], opts: Partial<VfxCtx> = {
}): Promise<void> {
    if (reduced() || !ready) return
    const fx = getVfx(name)
    if (!fx) return
    const a = await ready
    if (!a || a !== app) return
    const layer = new Container()
    a.stage.addChild(layer)
    wake()
    const ctx: VfxCtx = {
        app: a,
        layer,
        from,
        to,
        color: 0xffffff,
        intensity: 1,
        shake: shakeScreen,
        ...opts
    }
    try {
        await fx(ctx)
    } catch {
        /* một hiệu ứng lỗi không được chặn trận đấu */
    } finally {
        if (!layer.destroyed) layer.destroy({
            children: true
        })
        rest(a)
    }
}

/** Có canvas VFX đang chạy không (để dispatch quyết định dùng hoạt ảnh DOM dự phòng) */
export const vfxReady = (): boolean => app !== null && !reduced()

export function VfxCanvas() {
    useEffect(() => {
        if (reduced()) return undefined
        let dead = false
        const a = new Application()
        const p = a.init({
            resizeTo: window,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: Math.min(2,
                window.devicePixelRatio || 1),
            sharedTicker: true,
            autoStart: false
        }).then(() => {
            if (dead) {
                a.destroy(true,
                    {
                        children: true
                    })
                return null
            }
            const c = a.canvas
            c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:55"
            c.setAttribute("aria-hidden",
                "true")
            document.body.appendChild(c)
            app = a
            Ticker.shared.stop()
            return a
        }).catch(() => null)
        ready = p
        return () => {
            dead = true
            ready = null
            if (app === a) {
                app = null
                active = 0
                a.canvas.remove()
                a.destroy(true,
                    {
                        children: true
                    })
            }
        }
    },
    [])
    return null
}
