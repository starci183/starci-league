// Giao diện đồ: kho thẻ mảnh, ô đồ trên tướng, khung Ghép đồ (ghép 2 mảnh -> thẻ huyền thoại, bảng 8×8), tooltip.
import Phaser from "phaser"
import {
    BENCH_SIZE, CRAFT_PRICE, UnitLike, baseStats, combine, conditionalProps,
    describeStats, getItem, itemsOfTier, normalProps,
} from "@starci/shared"
import {
    FONT, hasArt
} from "./art"
import {
    t
} from "@starci/shared"
import {
    buttonBg, frameBg, uiImage
} from "./ui"
import type {
    PlayerView, RoomState
} from "@starci/shared"

/** Những gì giao diện đồ cần từ màn chơi */
export interface ItemHost {
  scene: Phaser.Scene;
  state(): RoomState;
  send(type: string, msg: object): void;
  tip(text: string): void;
  render(): void;
  closeShop(): void;
  openShop(): void;
}

const TIER_NAME = () => ({
    component: t("tier.component"), legendary: t("tier.legendary")
})
const GOLD = "#f5d27a", MUTED = "#9a9aa3", TEXT = "#ececf0"

export class ItemUi {
    /** Vị trí 2 thẻ mảnh trong kho đang chọn để ghép */
    private picks: number[] = []
    constructor(private host: ItemHost) {}
    private get scene() { return this.host.scene }

    name = (id: string) => getItem(id)?.name ?? id

    /** Chọn / bỏ chọn một thẻ mảnh để ghép (tối đa 2) */
    togglePick(i: number) {
        this.picks = this.picks.includes(i) ? this.picks.filter((x) => x !== i) : [...this.picks.slice(-1),
            i]
    }
    private validPicks(bench: string[]) {
        this.picks = this.picks.filter((i) => i < bench.length)
        return this.picks
    }

    /** Mô tả đầy đủ một món: chỉ số, nội tại thường, nội tại điều kiện */
    detail(id: string) {
        const it = getItem(id)
        if (!it) return id
        const lines = [`${it.name} · ${TIER_NAME()[it.tier]}`]
        if (it.recipe) lines.push(t("shop.recipe",
            {
                v: it.recipe.map(this.name).join(" + ")
            }))
        lines.push(t("shop.stats",
            {
                v: describeStats(baseStats(it))
            }))
        for (const p of normalProps(it)) lines.push(` ${p.name}: ${p.desc}`)
        for (const p of conditionalProps(it)) lines.push(` ${p.name} [khi ${p.condition.desc}]: ${p.desc}`)
        return lines.join("\n")
    }

    /** Icon món đồ (Data Dragon) hoặc biểu tượng dự phòng */
    icon(parent: Phaser.GameObjects.Container, id: string, x: number, y: number, size: number, opt: { dim?: boolean; frame?: number } = {
    }) {
        const key = `item-${id}`
        if (hasArt(this.scene,
            key)) {
            const img = this.scene.add.image(x,
                y,
                key).setDisplaySize(size,
                size)
            if (opt.dim) img.setTint(0x555555)
            parent.add(img)
        } else {
            parent.add(this.scene.add.text(x,
                y,
                getItem(id)?.name.slice(0,
                    1) ?? "?",
                {
                    fontFamily: FONT, fontSize: `${size * 0.7}px`
                }).setOrigin(0.5))
        }
        const g = this.scene.add.graphics()
        g.lineStyle(Math.max(1,
            size / 24),
        opt.frame ?? (getItem(id)?.tier === "legendary" ? 0xff9f1a : 0xc8a050),
        1)
        g.strokeRect(x - size / 2,
            y - size / 2,
            size,
            size)
        parent.add(g)
    }

    /** Vùng bắt chuột vô hình */
    private zone(parent: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, onClick?: () => void, onHover?: () => void) {
        const z = this.scene.add.rectangle(x,
            y,
            w,
            h,
            0xffffff,
            0.001)
        parent.add(z)
        z.setInteractive({
            useHandCursor: !!onClick
        })
        if (onClick) z.on("pointerdown",
            (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); onClick() })
        if (onHover) z.on("pointerover",
            onHover)
        return z
    }

    /** Ô đồ nhỏ dưới tên tướng */
    drawUnitItems(c: Phaser.GameObjects.Container, u: UnitLike, x: number, y: number) {
        let i = 0
        u.items.forEach((id) => { this.icon(c,
            id,
            x + 8 + i * 17,
            y,
            15); i++ })
    }

    /** Kho thẻ mảnh trong bảng bên phải: bấm để chọn ghép (mở khung Ghép đồ) */
    drawBench(dyn: Phaser.GameObjects.Container, x: number, y: number, me: PlayerView, myTurn: boolean) {
        const size = 30, gap = 4
        const bench: string[] = [...(me.bench ?? [])]
        const picks = this.validPicks(bench)
        for (let i = 0; i < BENCH_SIZE; i++) {
            const cx = x + size / 2 + i * (size + gap), cy = y + size / 2
            const picked = picks.includes(i)
            const g = this.scene.add.graphics()
            const slot = uiImage(this.scene,
                "ui-slot",
                cx,
                cy,
                size,
                size)
            if (slot) dyn.add(slot)
            else { g.fillStyle(0x0c0a10,
                1); g.fillRect(cx - size / 2,
                cy - size / 2,
                size,
                size) }
            g.lineStyle(picked ? 3 : 1,
                picked ? 0xffb347 : 0x3a3328,
                1); g.strokeRect(cx - size / 2,
                cy - size / 2,
                size,
                size)
            dyn.add(g)
            const id = bench[i]
            if (!id) continue
            this.icon(dyn,
                id,
                cx,
                cy,
                size - 4)
            this.zone(dyn,
                cx,
                cy,
                size,
                size,
                myTurn ? () => { this.togglePick(i); this.host.openShop() } : undefined,
                () => this.host.tip(`${this.detail(id)}

Chọn 2 thẻ mảnh rồi bấm GHÉP trong khung Ghép đồ để ra thẻ đồ huyền thoại.`))
        }
    }

    /** Khung Ghép đồ phủ lên bàn đấu (không có chợ: mảnh chỉ đến từ bộ bài và phần thưởng hạ gục) */
    drawShop(dyn: Phaser.GameObjects.Container, side: string) {
        const s = this.host.state(), me = s.players.get(side)!
        const myTurn = s.activeSide === side
        const X0 = 104, Y0 = 34, W = 866, H = 530
        const g = this.scene.add.graphics()
        const bg = frameBg(this.scene,
            "ui-panel",
            X0,
            Y0,
            W,
            H,
            30)
        if (bg) dyn.add(bg)
        else { g.fillStyle(0x07060a,
            0.94); g.fillRoundedRect(X0,
            Y0,
            W,
            H,
            12); g.lineStyle(2,
            0xc8a050,
            1); g.strokeRoundedRect(X0,
            Y0,
            W,
            H,
            12) }
        g.lineStyle(1,
            0xc8a050,
            0.3); g.lineBetween(X0 + 470,
            Y0 + 50,
            X0 + 470,
            Y0 + H - 16)
        dyn.add(g)
        this.zone(dyn,
            X0 + W / 2,
            Y0 + H / 2,
            W,
            H) // nuốt click
        const text = (x: number, y: number, str: string, size: number, color = TEXT, bold = false, wrap?: number) => {
            const txt = this.scene.add.text(x,
                y,
                str,
                {
                    fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal", wordWrap: wrap ? {
                        width: wrap
                    } : undefined
                })
            dyn.add(txt)
            return txt
        }
        text(X0 + 20,
            Y0 + 14,
            t("shop.title"),
            20,
            GOLD,
            true)
        text(X0 + 160,
            Y0 + 20,
            t("shop.info",
                {
                    g: me.gold, b: me.bench?.length ?? 0, bmax: BENCH_SIZE
                }),
            12,
            MUTED)
        this.button(dyn,
            X0 + W - 46,
            Y0 + 12,
            34,
            28,
            "",
            true,
            () => this.host.closeShop())

        // ---- ghép đồ: chọn 2 thẻ mảnh trong kho -> thẻ huyền thoại ----
        text(X0 + 20,
            Y0 + 54,
            t("shop.craft"),
            12,
            GOLD,
            true)
        const bench: string[] = [...(me.bench ?? [])]
        const picks = this.validPicks(bench)
        for (let i = 0; i < BENCH_SIZE; i++) {
            const cx = X0 + 50 + (i % 4) * 66, cy = Y0 + 112 + Math.floor(i / 4) * 86
            const id = bench[i], picked = picks.includes(i)
            const box = this.scene.add.graphics()
            const slot = uiImage(this.scene,
                "ui-slot",
                cx,
                cy,
                60,
                78)
            if (slot) { dyn.add(slot); if (picked) slot.setTint(0xffd9a0) }
            else { box.fillStyle(picked ? 0x3a2410 : 0x16131c,
                1); box.fillRoundedRect(cx - 30,
                cy - 38,
                60,
                78,
                6) }
            box.lineStyle(picked ? 3 : 1,
                picked ? 0xffb347 : id ? 0x6b5b3a : 0x2a2a32,
                1); box.strokeRoundedRect(cx - 30,
                cy - 38,
                60,
                78,
                6)
            dyn.add(box)
            if (!id) continue
            this.icon(dyn,
                id,
                cx,
                cy - 12,
                40)
            dyn.add(this.scene.add.text(cx,
                cy + 14,
                this.name(id),
                {
                    fontFamily: FONT, fontSize: "9px", color: TEXT, align: "center", wordWrap: {
                        width: 56
                    }
                }).setOrigin(0.5,
                0))
            this.zone(dyn,
                cx,
                cy,
                60,
                78,
                myTurn ? () => { this.togglePick(i); this.host.render() } : undefined,
                () => this.host.tip(this.detail(id)))
        }
        // xem trước kết quả
        const px = X0 + 370, py = Y0 + 156
        const result = picks.length === 2 ? combine(bench[picks[0]],
            bench[picks[1]]) : undefined
        const pg = this.scene.add.graphics()
        pg.fillStyle(0x16131c,
            1); pg.fillRoundedRect(px - 60,
            py - 76,
            120,
            152,
            8)
        pg.lineStyle(2,
            result ? 0xffb347 : 0x2a2a32,
            1); pg.strokeRoundedRect(px - 60,
            py - 76,
            120,
            152,
            8)
        dyn.add(pg)
        text(px - 52,
            py - 70,
            picks.length === 2 ? t("shop.result") : t("shop.pick_more",
                {
                    n: 2 - picks.length
                }),
            10,
            MUTED)
        if (result) {
            this.icon(dyn,
                result,
                px,
                py - 16,
                64)
            dyn.add(this.scene.add.text(px,
                py + 22,
                this.name(result),
                {
                    fontFamily: FONT, fontSize: "11px", color: GOLD, fontStyle: "bold", align: "center", wordWrap: {
                        width: 110
                    }
                }).setOrigin(0.5,
                0))
            this.zone(dyn,
                px,
                py - 16,
                64,
                64,
                undefined,
                () => this.host.tip(this.detail(result)))
        }
        this.button(dyn,
            px - 50,
            py + 84,
            100,
            30,
            t("shop.combine_cost",
                {
                    n: CRAFT_PRICE
                }),
            myTurn && !!result && me.gold >= CRAFT_PRICE,
            () => {
                const [a,
                    b] = picks
                this.picks = []
                this.host.send("craft",
                    {
                        a, b
                    })
            },
            0xb8862b)

        // ---- bảng công thức 8×8: 36 món huyền thoại ----
        const comps = itemsOfTier("component").map((i) => i.id)
        const gx = X0 + 500, gy = Y0 + 60, cell = 38
        text(gx,
            Y0 + 30,
            t("shop.table"),
            12,
            GOLD,
            true)
        comps.forEach((a, i) => {
            this.icon(dyn,
                a,
                gx + cell * (i + 1) + cell / 2,
                gy + cell / 2,
                cell - 8,
                {
                    frame: 0x6b5b3a
                })
            this.zone(dyn,
                gx + cell * (i + 1) + cell / 2,
                gy + cell / 2,
                cell,
                cell,
                undefined,
                () => this.host.tip(this.detail(a)))
            this.icon(dyn,
                a,
                gx + cell / 2,
                gy + cell * (i + 1) + cell / 2,
                cell - 8,
                {
                    frame: 0x6b5b3a
                })
            this.zone(dyn,
                gx + cell / 2,
                gy + cell * (i + 1) + cell / 2,
                cell,
                cell,
                undefined,
                () => this.host.tip(this.detail(a)))
            comps.forEach((b, j) => {
                const r = combine(a,
                    b)
                if (!r) return
                const cx = gx + cell * (j + 1) + cell / 2, cy = gy + cell * (i + 1) + cell / 2
                this.icon(dyn,
                    r,
                    cx,
                    cy,
                    cell - 6)
                this.zone(dyn,
                    cx,
                    cy,
                    cell,
                    cell,
                    undefined,
                    () => this.host.tip(this.detail(r)))
            })
        })
    }

    private button(dyn: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, label: string, enabled: boolean,
        onClick: () => void, color = 0x2f6fde) {
        dyn.add(buttonBg(this.scene,
            x,
            y,
            w,
            h,
            enabled,
            color))
        dyn.add(this.scene.add.text(x + w / 2,
            y + h / 2,
            label,
            {
                fontFamily: FONT, fontSize: "12.5px", color: enabled ? "#fff" : MUTED, fontStyle: "bold"
            }).setOrigin(0.5))
        this.zone(dyn,
            x + w / 2,
            y + h / 2,
            w,
            h,
            enabled ? onClick : undefined)
    }
}
