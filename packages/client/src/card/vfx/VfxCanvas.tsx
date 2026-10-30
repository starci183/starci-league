// Lớp Pixi trong suốt do React quản lý; không dùng Phaser và không chiếm Ticker.shared.
import {
    useEffect
} from "react"
import {
    Application, Container
} from "pixi.js"
import {
    clearParticles
} from "./particles"
import {
    bindGameOverlayClip
} from "./gameClip"
import {
    getVfx, type Pt, type VfxCtx
} from "./types"
import "./fx_projectiles"
import "./fx_aoe"
import "./fx_meta"
import "./fx_elements"
import "./fx_weapons"
import "./fx_defense"
import "./fx_card_hook"
import "./fx_mushroom"
import "./fx_actions"
import "./fx_mana"

let app: Application | null = null
let ready: Promise<Application | null> | null = null
let generation = 0
let epoch = 0
let error: string | null = null
let completed = 0
let failed = 0
let shakeAnim: Animation | null = null
const running = new Map<Container, () => void>()
const MAX_ACTIVE = 32
export const vfxEpoch = () => epoch

function reduced(): boolean {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

export function vfxStats() {
    return {
        ready: app !== null,
        active: running.size,
        particles: app?.stage.children.reduce((sum, child) => sum + descendants(child),
            0) ?? 0,
        reducedMotion: reduced(),
        error,
        completed,
        failed
    }
}

function descendants(c: Container): number {
    return c.children.reduce((sum, child) => sum + 1 + descendants(child),
        0)
}

export async function whenVfxReady(): Promise<boolean> {
    return !!(ready && await ready)
}

export function shakeScreen(power: number, ms: number) {
    const el = document.querySelector<HTMLElement>(".cg-root, .vfx-stage")
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
    shakeAnim = el.animate(frames,
        {
            duration: ms, easing: "linear"
        })
}

/** Dừng mọi hiệu ứng; Promise đang chờ đều kết thúc, sprite/ticker được dọn ngay. */
export function clearVfx() {
    epoch++
    for (const cancel of [...running.values()]) cancel()
    clearParticles()
    shakeAnim?.cancel()
    shakeAnim = null
    if (app) {
        app.stop()
        app.render()
    }
}

export async function playVfx(name: string, from: Pt, to: Pt[], opts: Partial<VfxCtx> = {
}): Promise<void> {
    if (reduced() || !ready) return
    const fx = getVfx(name)
    if (!fx) {
        error = `Chưa đăng ký VFX: ${name}`
        failed++
        return
    }
    const launchEpoch = epoch
    const a = await ready
    if (launchEpoch !== epoch || !a || a !== app || running.size >= MAX_ACTIVE) return
    const layer = new Container()
    a.stage.addChild(layer)
    let finish = () => {}
    let stopped = false
    const cancelled = new Promise<void>((resolve) => { finish = resolve })
    const cancel = () => {
        stopped = true
        if (!layer.destroyed) layer.destroy({
            children: true
        })
        finish()
    }
    running.set(layer,
        cancel)
    a.start()
    const timer = window.setTimeout(() => {
        error = `VFX vượt thời gian: ${name}`
        failed++
        cancel()
    },
    15000)
    try {
        await Promise.race([
            Promise.resolve().then(() => stopped ? undefined : fx({
                ...opts,
                app: a,
                layer,
                from,
                to,
                color: opts.color ?? 0xffffff,
                intensity: Math.max(.25,
                    Math.min(3,
                        opts.intensity ?? 1)),
                shake: opts.shake ?? shakeScreen
            })),
            cancelled
        ])
        if (!stopped) completed++
    } catch (cause) {
        if (!stopped) {
            error = `${name}: ${cause instanceof Error ? cause.message : String(cause)}`
            failed++
        }
    } finally {
        window.clearTimeout(timer)
        if (!layer.destroyed) layer.destroy({
            children: true
        })
        running.delete(layer)
        if (a === app && running.size === 0) {
            a.stop()
            a.render()
        }
    }
}

export const vfxReady = (): boolean => app !== null && !reduced()

export function VfxCanvas() {
    useEffect(() => {
        const id = ++generation
        let dead = false
        let unclip: (() => void) | undefined
        const a = new Application()
        error = null
        const p = a.init({
            resizeTo: window,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: Math.min(2,
                window.devicePixelRatio || 1),
            sharedTicker: false,
            autoStart: false
        }).then(() => {
            if (dead || id !== generation) {
                a.destroy(true,
                    {
                        children: true
                    })
                return null
            }
            const c = a.canvas
            c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:55"
            c.dataset.vfxCanvas = "true"
            c.setAttribute("aria-hidden",
                "true")
            document.body.appendChild(c)
            unclip = bindGameOverlayClip(c)
            app = a
            return a
        }).catch((cause: unknown) => {
            if (!dead && id === generation) error = cause instanceof Error ? cause.message : String(cause)
            return null
        })
        ready = p
        return () => {
            dead = true
            unclip?.()
            if (ready === p) ready = null
            if (app === a) {
                clearVfx()
                app = null
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
