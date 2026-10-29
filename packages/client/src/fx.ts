// Hiệu ứng hình ảnh: đạn bay, tia, nổ hạt, khiên, mưa tên, xích, số sát thương.
import Phaser from "phaser"
import {
    FONT
} from "./art"

export interface Pos { x: number; y: number }

export class Fx {
    constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Container) {
        this.textures()
    }

    private textures() {
        const t = this.scene.textures
        if (!t.exists("fx-dot")) {
            const c = t.createCanvas("fx-dot",
                32,
                32)!, ctx = c.getContext()
            const g = ctx.createRadialGradient(16,
                16,
                0,
                16,
                16,
                16)
            g.addColorStop(0,
                "rgba(255,255,255,1)"); g.addColorStop(0.4,
                "rgba(255,255,255,0.6)"); g.addColorStop(1,
                "rgba(255,255,255,0)")
            ctx.fillStyle = g; ctx.fillRect(0,
                0,
                32,
                32); c.refresh()
        }
        if (!t.exists("fx-shard")) {
            const c = t.createCanvas("fx-shard",
                16,
                32)!, ctx = c.getContext()
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(8,
                0); ctx.lineTo(16,
                16); ctx.lineTo(8,
                32); ctx.lineTo(0,
                16); ctx.fill(); c.refresh()
        }
        if (!t.exists("fx-arrow")) {
            const c = t.createCanvas("fx-arrow",
                64,
                12)!, ctx = c.getContext()
            const g = ctx.createLinearGradient(0,
                0,
                64,
                0)
            g.addColorStop(0,
                "rgba(255,255,255,0)"); g.addColorStop(0.7,
                "rgba(255,255,255,0.9)"); g.addColorStop(1,
                "#fff")
            ctx.fillStyle = g; ctx.fillRect(0,
                4,
                54,
                4)
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(64,
                6); ctx.lineTo(50,
                0); ctx.lineTo(50,
                12); ctx.fill(); c.refresh()
        }
    }

    private add<T extends Phaser.GameObjects.GameObject>(obj: T) { this.layer.add(obj); return obj }
    private wait(ms: number) { return new Promise<void>((r) => this.scene.time.delayedCall(ms,
        r)) }

    burst(p: Pos, tint: number, count = 20, speed = 200, tex = "fx-dot", life = 550) {
        const e = this.add(this.scene.add.particles(p.x,
            p.y,
            tex,
            {
                speed: {
                    min: speed * 0.3, max: speed
                }, angle: {
                    min: 0, max: 360
                },
                scale: {
                    start: tex === "fx-dot" ? 0.9 : 0.6, end: 0
                }, alpha: {
                    start: 1, end: 0
                },
                rotate: {
                    min: 0, max: 360
                }, lifespan: life, tint, blendMode: "ADD", emitting: false,
            }))
        e.explode(count)
        this.scene.time.delayedCall(life + 150,
            () => e.destroy())
    }

    /** Đạn bay từ A tới B, có vệt sáng. Xong thì resolve. */
    projectile(from: Pos, to: Pos, tint: number, opt: { tex?: string; scale?: number; duration?: number; arc?: number } = {
    }) {
        const tex = opt.tex ?? "fx-arrow"
        const img = this.add(this.scene.add.image(from.x,
            from.y,
            tex).setTint(tint).setBlendMode("ADD").setScale(opt.scale ?? 1))
        img.setRotation(Math.atan2(to.y - from.y,
            to.x - from.x))
        const trail = this.add(this.scene.add.particles(0,
            0,
            "fx-dot",
            {
                follow: img, speed: 10, scale: {
                    start: 0.5 * (opt.scale ?? 1), end: 0
                }, alpha: {
                    start: 0.7, end: 0
                },
                lifespan: 300, frequency: 16, tint, blendMode: "ADD",
            }))
        const dur = opt.duration ?? Math.min(450,
            140 + Phaser.Math.Distance.BetweenPoints(from,
                to) * 0.6)
        return new Promise<void>((resolve) => {
            const arc = opt.arc ?? 0
            this.scene.tweens.addCounter({
                from: 0, to: 1, duration: dur, ease: "Quad.easeIn",
                onUpdate: (tw) => {
                    const k = tw.getValue() ?? 0
                    const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * arc
                    if (arc) img.setRotation(Math.atan2(y - img.y,
                        x - img.x))
                    img.setPosition(x,
                        y)
                },
                onComplete: () => {
                    img.destroy()
                    trail.stop()
                    this.scene.time.delayedCall(320,
                        () => trail.destroy())
                    resolve()
                },
            })
        })
    }

    beam(from: Pos, to: Pos, tint: number, width = 12, duration = 420) {
        const g = this.add(this.scene.add.graphics().setBlendMode("ADD"))
        const draw = (w: number) => {
            g.clear()
            g.lineStyle(w * 2.2,
                tint,
                0.25); g.lineBetween(from.x,
                from.y,
                to.x,
                to.y)
            g.lineStyle(w,
                tint,
                0.85); g.lineBetween(from.x,
                from.y,
                to.x,
                to.y)
            g.lineStyle(Math.max(2,
                w / 3),
            0xffffff,
            1); g.lineBetween(from.x,
                from.y,
                to.x,
                to.y)
        }
        this.scene.tweens.addCounter({
            from: 1, to: 0, duration, ease: "Cubic.easeIn",
            onUpdate: (tw) => draw(width * (tw.getValue() ?? 0) + 1),
            onComplete: () => g.destroy(),
        })
    }

    ring(p: Pos, tint: number, radius = 50, duration = 500) {
        const g = this.add(this.scene.add.graphics({
            x: p.x, y: p.y
        }).setBlendMode("ADD"))
        g.lineStyle(5,
            tint,
            1); g.strokeCircle(0,
            0,
            radius)
        g.setScale(0.2)
        this.scene.tweens.add({
            targets: g, scale: 1.3, alpha: 0, duration, ease: "Cubic.easeOut", onComplete: () => g.destroy()
        })
    }

    shield(p: Pos, tint: number) {
        const g = this.add(this.scene.add.graphics({
            x: p.x, y: p.y
        }).setBlendMode("ADD"))
        g.fillStyle(tint,
            0.22); g.fillEllipse(0,
            0,
            150,
            96)
        g.lineStyle(3,
            tint,
            1); g.strokeEllipse(0,
            0,
            150,
            96)
        g.lineStyle(1,
            0xffffff,
            0.8); g.strokeEllipse(0,
            -6,
            110,
            60)
        g.setScale(0.3).setAlpha(0)
        this.scene.tweens.chain({
            targets: g,
            tweens: [
                {
                    scale: 1.05, alpha: 1, duration: 260, ease: "Back.easeOut"
                },
                {
                    alpha: 0, scale: 1.15, duration: 500, delay: 400
                },
            ],
            onComplete: () => g.destroy(),
        })
        this.burst(p,
            tint,
            14,
            120)
    }

    async rain(p: Pos, tint: number, count = 10) {
        for (let i = 0; i < count; i++) {
            const x = p.x + Phaser.Math.Between(-60,
                60)
            this.projectile({
                x: x - 30, y: p.y - 160
            },
            {
                x, y: p.y + Phaser.Math.Between(-20,
                    20)
            },
            tint,
            {
                duration: 260, scale: 0.8
            })
            await this.wait(45)
        }
        await this.wait(260)
        this.burst(p,
            tint,
            26,
            220)
    }

    async chain(from: Pos, to: Pos, tint = 0xb0c4a0) {
        const g = this.add(this.scene.add.graphics())
        const draw = (k: number) => {
            g.clear()
            const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k
            g.lineStyle(4,
                0x222222,
                1); g.lineBetween(from.x,
                from.y,
                x,
                y)
            g.lineStyle(2,
                tint,
                1); g.lineBetween(from.x,
                from.y,
                x,
                y)
            const n = Math.floor(10 * k)
            for (let i = 0; i <= n; i++) {
                const t = n ? i / n : 0
                g.strokeCircle(from.x + (x - from.x) * t,
                    from.y + (y - from.y) * t,
                    4)
            }
            g.fillStyle(0xdddddd,
                1); g.fillTriangle(x - 7,
                y - 7,
                x + 7,
                y - 7,
                x,
                y + 8)
        }
        await new Promise<void>((r) => this.scene.tweens.addCounter({
            from: 0, to: 1, duration: 260, onUpdate: (t) => draw(t.getValue() ?? 0), onComplete: () => r()
        }))
        this.burst(to,
            0xffffff,
            12,
            140)
        this.scene.cameras.main.shake(120,
            0.004)
        await new Promise<void>((r) => this.scene.tweens.addCounter({
            from: 1, to: 0, duration: 320, delay: 120, onUpdate: (t) => draw(t.getValue() ?? 0), onComplete: () => r()
        }))
        g.destroy()
    }

    slash(p: Pos, tint: number) {
        const g = this.add(this.scene.add.graphics({
            x: p.x, y: p.y
        }).setBlendMode("ADD"))
        g.lineStyle(7,
            tint,
            0.9); g.beginPath(); g.arc(0,
            0,
            38,
            -2.4,
            -0.2); g.strokePath()
        g.lineStyle(2,
            0xffffff,
            1); g.beginPath(); g.arc(0,
            0,
            38,
            -2.3,
            -0.3); g.strokePath()
        g.setRotation(Phaser.Math.FloatBetween(-0.6,
            0.6)).setScale(0.6)
        this.scene.tweens.add({
            targets: g, scale: 1.25, alpha: 0, duration: 300, onComplete: () => g.destroy()
        })
        this.burst(p,
            tint,
            10,
            160)
    }

    stars(p: Pos, tint = 0xffe066) {
        for (let i = 0; i < 3; i++) {
            const s = this.add(this.scene.add.text(p.x,
                p.y - 30,
                "",
                {
                    fontFamily: FONT, fontSize: "18px", color: "#ffe066"
                }).setOrigin(0.5).setTint(tint))
            this.scene.tweens.addCounter({
                from: 0, to: 1, duration: 1000,
                onUpdate: (t) => {
                    const k = t.getValue() ?? 0, a = k * Math.PI * 4 + (i * Math.PI * 2) / 3
                    s.setPosition(p.x + Math.cos(a) * 28,
                        p.y - 34 + Math.sin(a) * 9).setAlpha(1 - k * 0.6)
                },
                onComplete: () => s.destroy(),
            })
        }
    }

    floatText(p: Pos, text: string, color: string, delay = 0, big = false) {
        const t = this.add(this.scene.add.text(p.x + Phaser.Math.Between(-12,
            12),
        p.y - 10,
        text,
        {
            fontFamily: FONT, fontSize: big ? "26px" : "20px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 5,
        }).setOrigin(0.5).setAlpha(0).setScale(0.6))
        this.scene.tweens.chain({
            targets: t,
            tweens: [
                {
                    alpha: 1, scale: 1.1, duration: 140, delay, ease: "Back.easeOut"
                },
                {
                    y: p.y - 56, alpha: 0, duration: 800, ease: "Cubic.easeIn"
                },
            ],
            onComplete: () => t.destroy(),
        })
    }

    banner(text: string, color: string) {
        const t = this.add(this.scene.add.text(545,
            290,
            text,
            {
                fontFamily: FONT, fontSize: "30px", color, fontStyle: "bold", stroke: "#000", strokeThickness: 6,
            }).setOrigin(0.5).setAlpha(0).setScale(1.6))
        this.scene.tweens.chain({
            targets: t,
            tweens: [{
                alpha: 1, scale: 1, duration: 220, ease: "Back.easeOut"
            },
            {
                alpha: 0, duration: 400, delay: 650
            }],
            onComplete: () => t.destroy(),
        })
    }
}
