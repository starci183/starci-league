// Tranh tướng, khung lá bài và nền bàn đấu.
// Tranh thật: public/heroes/<id>.jpg, icon chiêu: public/icons/<skillId>.png (tải bằng .work/fetch_lol.py).
// Chưa có tranh thì tự vẽ ảnh thay thế theo màu và biểu tượng của tướng.
import Phaser from "phaser"
import {
    CARDS, Card, ROLE_INFO, SKILLS, allHeroes, allItems
} from "@starci/shared"
import {
    FRAME
} from "./frameMeta"
import {
    drawNineCanvas, preloadNine
} from "./nine"

export const FONT = "Nunito, Segoe UI, system-ui, sans-serif"

/** Màu chủ đạo [tối, sáng] của từng tướng */
export const HERO_COLORS: Record<string, [number, number]> = {
    kogmaw: [0x1e1430,
        0x9be05a], ashe: [0x16204a,
        0xb8d4ff], lux: [0x2a2450,
        0xfff0a0],
    lissandra: [0x0e2c44,
        0x9ff0ff], blitzcrank: [0x2c2410,
        0xf5c542], braum: [0x16304a,
        0xbfe4ff],
    khazix: [0x1e1036,
        0xb070ff], aatrox: [0x3a0f0f,
        0xff5040], janna: [0x123a30,
        0x8affd0],
    katarina: [0x3a0f18,
        0xff4d6d],
}
export const KIND_COLORS: Record<Card["kind"], [number, number]> = {
    hero: [0xa8782a,
        0xf5d27a], item: [0x9a5a10,
        0xffb347], spell: [0x245080,
        0x7ab8f5], trap: [0x5e2680,
        0xc07af5],
    stat: [0x1f6a3a,
        0x7ee08a],
}
export const KIND_NAME: Record<Card["kind"], string> = {
    hero: "Tướng", item: "Đồ huyền thoại", spell: "Phép", trap: "Bẫy", stat: "Cường hoá"
}
/** Khung Codex vẽ cho từng loại thẻ (bài chỉ số dùng khung đồ, bài đánh thường dùng khung tướng) */
export const FRAME_OF: Record<Card["kind"], string> = {
    hero: "hero", item: "item", spell: "spell", trap: "trap", stat: "item"
}

const hex = (n: number) => "#" + n.toString(16).padStart(6,
    "0")
const mix = (a: number, b: number, t: number) => {
    const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
    return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

export function preloadArt(scene: Phaser.Scene) {
    scene.load.on("loaderror",
        () => { /* chưa có tranh thì dùng ảnh tự vẽ */ })
    for (const h of allHeroes()) {
        scene.load.image(`art-${h.id}`,
            `heroes/${h.id}.jpg`)
        scene.load.image(`icon-${h.id}_p`,
            `icons/${h.id}_p.png`)
        // asset Codex vẽ (scripts/collect_hero_art.py): chân dung token + icon nội tại
        scene.load.image(`token-${h.id}`,
            `heroes_art/${h.id}.jpg`)
        scene.load.image(`sicon-${h.id}_p`,
            `skills_art/${h.id}_p.jpg`)
    }
    for (const id of Object.keys(SKILLS)) {
        scene.load.image(`icon-${id}`,
            `icons/${id}.png`)
        scene.load.image(`sicon-${id}`,
            `skills_art/${id}.jpg`)
    }
    // tranh trang bị (icon LMHT phóng to), phép, bẫy (Codex vẽ): cùng một khổ artboard, phủ kín ô tranh
    for (const card of Object.values(CARDS)) {
        if (card.kind === "spell" || card.kind === "trap" || card.kind === "stat") scene.load.image(`art-${card.id}`,
            `cards/${card.id}.jpg`)
    }
    // icon đồ LMHT (Data Dragon) cho khung ghép đồ, kho mảnh, ô đồ trên tướng và thẻ huyền thoại
    for (const item of allItems()) scene.load.image(`item-${item.id}`,
        `items/${item.id}.png`)
    // art lớn của đồ do Codex vẽ lại từ icon (scripts/collect_item_art.py) -> tranh cho thẻ huyền thoại
    for (const item of allItems()) scene.load.image(`itemart-${item.id}`,
        `items_art/${item.id}.jpg`)
}

/** Chân dung token trên bàn: tranh LoL gốc cho đồng bộ (asset Codex chỉ dùng khi thiếu tranh gốc) */
export const tokenKey = (scene: Phaser.Scene, heroId: string) =>
    hasArt(scene,
        `art-${heroId}`) ? artKey(scene,
            heroId) : hasArt(scene,
            `token-${heroId}`) ? `token-${heroId}` : artKey(scene,
                heroId)
/** Icon chiêu/nội tại (id dạng "<tướng>_q", "<tướng>_p"): icon LoL gốc đã phóng HD bằng Real-ESRGAN (256px),
 *  thiếu thì dùng icon Codex vẽ; undefined nếu chưa có gì */
export const skillIconKey = (scene: Phaser.Scene, id: string) =>
    hasArt(scene,
        `icon-${id}`) ? `icon-${id}` : hasArt(scene,
            `sicon-${id}`) ? `sicon-${id}` : undefined

/** Texture tranh của một thẻ: tranh thật nếu có, không thì tự vẽ */
export function artKey(scene: Phaser.Scene, cardId: string) {
    const card = CARDS[cardId]
    if (card?.kind === "item" && hasArt(scene,
        `itemart-${card.itemId}`)) return `itemart-${card.itemId}`
    const real = `art-${cardId}`
    if (scene.textures.exists(real) && scene.textures.get(real).getSourceImage().width > 1) return real
    const key = `gen-${cardId}`
    if (!scene.textures.exists(key)) generateArt(scene,
        key,
        CARDS[cardId])
    return key
}

function generateArt(scene: Phaser.Scene, key: string, card: Card) {
    const W = 256, H = 300
    const tex = scene.textures.createCanvas(key,
        W,
        H)!
    const ctx = tex.getContext()
    const [c1,
        c2] = card.kind === "hero" ? HERO_COLORS[card.id] ?? [0x222233,
        0x8888aa] : KIND_COLORS[card.kind]
    const g = ctx.createRadialGradient(W / 2,
        H * 0.4,
        8,
        W / 2,
        H * 0.5,
        H * 0.8)
    g.addColorStop(0,
        hex(c2))
    g.addColorStop(0.4,
        hex(mix(c2,
            c1,
            0.6)))
    g.addColorStop(1,
        hex(c1))
    ctx.fillStyle = g
    ctx.fillRect(0,
        0,
        W,
        H)
    // tia sáng
    ctx.save()
    ctx.translate(W / 2,
        H * 0.42)
    ctx.globalAlpha = 0.1
    ctx.fillStyle = "#fff"
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6)
        ctx.beginPath(); ctx.moveTo(0,
            0); ctx.lineTo(-16,
            -H); ctx.lineTo(16,
            -H); ctx.fill()
    }
    ctx.restore()
    // đốm sáng (cố định theo id)
    let seed = [...card.id].reduce((s, c) => s * 31 + c.charCodeAt(0),
        7)
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    ctx.fillStyle = hex(c2)
    for (let i = 0; i < 26; i++) {
        ctx.globalAlpha = 0.15 + rnd() * 0.5
        ctx.beginPath(); ctx.arc(rnd() * W,
            rnd() * H,
            1 + rnd() * 3,
            0,
            Math.PI * 2); ctx.fill()
    }
    // bóng nền + biểu tượng
    ctx.globalAlpha = 0.45
    ctx.fillStyle = "#000"
    ctx.beginPath(); ctx.ellipse(W / 2,
        H * 0.82,
        W * 0.32,
        18,
        0,
        0,
        Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
    // thẻ đồ huyền thoại: icon món đồ đặt trong ô khung vàng như ô đồ trong game
    const itemKey = card.kind === "item" ? `item-${card.itemId}` : ""
    if (itemKey && scene.textures.exists(itemKey)) {
        const s = 150, x0 = W / 2 - s / 2, y0 = H * 0.46 - s / 2
        ctx.shadowColor = hex(c2); ctx.shadowBlur = 60
        ctx.fillStyle = "#000"; ctx.fillRect(x0 - 6,
            y0 - 6,
            s + 12,
            s + 12)
        ctx.shadowBlur = 0
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"
        ctx.drawImage(scene.textures.get(itemKey).getSourceImage() as CanvasImageSource,
            x0,
            y0,
            s,
            s)
        ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 5; ctx.strokeRect(x0 - 4,
            y0 - 4,
            s + 8,
            s + 8)
        ctx.strokeStyle = "#6a3f0a"; ctx.lineWidth = 2; ctx.strokeRect(x0 - 9,
            y0 - 9,
            s + 18,
            s + 18)
        tex.refresh()
        return
    }
    ctx.font = `${card.kind === "hero" ? 128 : 112}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = hex(c2)
    ctx.shadowBlur = 30
    ctx.fillText(card.name.slice(0,
        1).toUpperCase(),
    W / 2,
    H * 0.5) // tranh thay thế: chữ cái đầu
    tex.refresh()
}

/** Ảnh cắt vừa khung w×h (kiểu object-fit: cover, lệch lên trên để thấy mặt) */
export function portrait(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number) {
    const img = scene.add.image(x,
        y,
        key)
    const tw = img.width, th = img.height
    const scale = Math.max(w / tw,
        h / th)
    const cw = w / scale, ch = h / scale
    const cx = (tw - cw) / 2, cy = Math.max(0,
        (th - ch) * 0.25)
    img.setCrop(cx,
        cy,
        cw,
        ch).setScale(scale).setOrigin((cx + cw / 2) / tw,
        (cy + ch / 2) / th)
    return img
}

export const CARD_W = 130, CARD_H = 190

/** Màu viền lá bài theo loại: phép xanh dương, bẫy tím, chỉ số xanh lá, đánh thường đỏ, trang bị vàng */
export const ICON_TINT: Record<Exclude<Card["kind"], "hero">, number> = {
    spell: 0x4a8ef0, trap: 0xa060e0, stat: 0x4cc07a, item: 0xf5b942
}

/** Lá bài gọn: icon vuông như icon chiêu LoL + tên + viên mana. Mô tả nằm ở ô chi tiết (rê chuột / bấm). */
function drawIconCard(scene: Phaser.Scene, card: Exclude<Card, { kind: "hero" }>, x: number, y: number, s: number, opt: { selected?: boolean; dim?: boolean }) {
    // cùng thiết kế với lá bài ở Sảnh (lobby.css .cv): khung ngoài vàng kim + chỉ màu loại bài, khung tranh mảnh, bảng tên
    const W = CARD_W * s, A = W - 16 * s, H = A + 46 * s, tint = ICON_TINT[card.kind], r = 8 * s
    const c = scene.add.container(x,
        y)
    const g = scene.add.graphics()
    c.add(g)
    if (opt.selected) { g.fillStyle(0xa585f0,
        0.45); g.fillRoundedRect(-W / 2 - 7,
        -H / 2 - 7,
        W + 14,
        H + 14,
        14 * s) }
    g.fillStyle(0x000000,
        0.5); g.fillRoundedRect(-W / 2 + 3,
        -H / 2 + 5,
        W,
        H,
        r)
    // khung ngoài: vàng sáng ở trên, sẫm dần xuống dưới (giả vát kim loại)
    g.fillGradientStyle(0xf8e3a0,
        0xd9b45e,
        0x7a5a20,
        0x5e4316,
        1); g.fillRoundedRect(-W / 2,
        -H / 2,
        W,
        H,
        r)
    const b = 3.5 * s
    g.fillStyle(0x07090e,
        1); g.fillRoundedRect(-W / 2 + b,
        -H / 2 + b,
        W - 2 * b,
        H - 2 * b,
        r - 2)
    g.lineStyle(1.5 * s,
        tint,
        1); g.strokeRoundedRect(-W / 2 + b + 1.5 * s,
        -H / 2 + b + 1.5 * s,
        W - 2 * b - 3 * s,
        H - 2 * b - 3 * s,
        r - 3)
    g.fillStyle(0x0d121b,
        1); g.fillRoundedRect(-W / 2 + b + 3 * s,
        -H / 2 + b + 3 * s,
        W - 2 * b - 6 * s,
        H - 2 * b - 6 * s,
        r - 4)
    // đinh góc trên
    for (const sx of [-1,
        1]) {
        const cx = sx * (W / 2 - 6 * s), cy = -H / 2 + 6 * s, d = 3 * s
        g.fillStyle(0xf5d27a,
            1); g.fillTriangle(cx,
            cy - d,
            cx + d,
            cy,
            cx,
            cy + d); g.fillTriangle(cx,
            cy - d,
            cx - d,
            cy,
            cx,
            cy + d)
    }
    const ay = -H / 2 + 8 * s + A / 2
    c.add(portrait(scene,
        artKey(scene,
            card.id),
        0,
        ay,
        A,
        A))
    // khung trong (ô tranh): viền vàng mảnh + chỉ màu loại bài
    const g2 = scene.add.graphics()
    c.add(g2)
    g2.lineStyle(1.2 * s,
        0xd9b45e,
        1); g2.strokeRect(-A / 2,
        ay - A / 2,
        A,
        A)
    g2.lineStyle(1 * s,
        tint,
        0.9); g2.strokeRect(-A / 2 - 2.5 * s,
        ay - A / 2 - 2.5 * s,
        A + 5 * s,
        A + 5 * s)
    // bảng tên: gạch vàng phía trên, nền ánh màu loại bài
    const py = ay + A / 2 + 5 * s, ph = H / 2 - b - 3 * s - py
    g2.fillGradientStyle(tint,
        tint,
        0x0d121b,
        0x0d121b,
        0.35,
        0.35,
        0,
        0); g2.fillRect(-W / 2 + b + 3 * s,
        py,
        W - 2 * b - 6 * s,
        ph)
    g2.fillStyle(0xb8862b,
        1); g2.fillRect(-W / 2 + b + 3 * s,
        py,
        W - 2 * b - 6 * s,
        1.2 * s)
    c.add(scene.add.text(0,
        py + ph / 2 + 1 * s,
        card.name,
        {
            fontFamily: FONT, fontSize: `${12.5 * s}px`, color: "#f0e6d2", fontStyle: "bold", align: "center", stroke: "#000", strokeThickness: 3 * s,
            wordWrap: {
                width: W - 14 * s
            }, maxLines: 2,
        }).setOrigin(0.5))
    if (opt.dim) c.setAlpha(0.55)
    return c
}

/** Vẽ một lá bài. Trả về container; (0,0) là tâm lá bài. */
export function drawCard(scene: Phaser.Scene, card: Card, x: number, y: number, s = 1, opt: { selected?: boolean; dim?: boolean } = {
}) {
    if (card.kind !== "hero") return drawIconCard(scene,
        card,
        x,
        y,
        s,
        opt)
    const W = CARD_W * s, H = CARD_H * s
    const [frame,
        glow] = KIND_COLORS[card.kind]
    const frameKey = `ui-frame-${FRAME_OF[card.kind]}`
    const framed = !!FRAME && hasArt(scene,
        frameKey)
    const c = scene.add.container(x,
        y)
    const g = scene.add.graphics()
    c.add(g)
    if (opt.selected) { g.fillStyle(0xa585f0,
        0.45); g.fillRoundedRect(-W / 2 - 7,
        -H / 2 - 7,
        W + 14,
        H + 14,
        14 * s) }
    g.fillStyle(0x000000,
        0.5); g.fillRoundedRect(-W / 2 + 3,
        -H / 2 + 5,
        W,
        H,
        10 * s) // bóng

    // ô tranh: theo khung vẽ sẵn (Codex) nếu có, không thì khung tự vẽ
    let aw: number, ah: number, ay: number, ry: number
    if (framed) {
        aw = FRAME!.w * W; ah = FRAME!.h * H
        const ax = -W / 2 + FRAME!.x * W + aw / 2
        ay = -H / 2 + FRAME!.y * H + ah / 2
        g.fillStyle(0x14111b,
            1); g.fillRect(ax - aw / 2 - 2,
            ay - ah / 2 - 2,
            aw + 4,
            ah + 4)
        c.add(portrait(scene,
            artKey(scene,
                card.id),
            ax,
            ay,
            aw + 2,
            ah + 2))
        c.add(scene.add.image(0,
            0,
            frameKey).setDisplaySize(W,
            H))
        ry = ay + ah / 2 + (H / 2 - (ay + ah / 2)) * 0.2
    } else {
        g.fillStyle(frame,
            1); g.fillRoundedRect(-W / 2,
            -H / 2,
            W,
            H,
            10 * s)
        g.lineStyle(1.5 * s,
            glow,
            1); g.strokeRoundedRect(-W / 2 + 2 * s,
            -H / 2 + 2 * s,
            W - 4 * s,
            H - 4 * s,
            9 * s)
        g.fillStyle(0x14111b,
            1); g.fillRoundedRect(-W / 2 + 5 * s,
            -H / 2 + 5 * s,
            W - 10 * s,
            H - 10 * s,
            7 * s)
        aw = W - 14 * s; ah = H * 0.5; ay = -H / 2 + 7 * s + ah / 2
        c.add(portrait(scene,
            artKey(scene,
                card.id),
            0,
            ay,
            aw,
            ah))
        const g2 = scene.add.graphics()
        c.add(g2)
        g2.lineStyle(2 * s,
            glow,
            0.9); g2.strokeRect(-aw / 2,
            ay - ah / 2,
            aw,
            ah)
        ry = ay + ah / 2 + 10 * s
        g2.fillStyle(frame,
            1); g2.fillRoundedRect(-W / 2 + 3 * s,
            ry - 10 * s,
            W - 6 * s,
            20 * s,
            4 * s)
        g2.lineStyle(1 * s,
            glow,
            1); g2.strokeRoundedRect(-W / 2 + 3 * s,
            ry - 10 * s,
            W - 6 * s,
            20 * s,
            4 * s)
    }
    // tên, vai trò, mô tả
    c.add(scene.add.text(0,
        ry,
        card.name,
        {
            fontFamily: FONT, fontSize: `${12.5 * s}px`, color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3 * s
        }).setOrigin(0.5))
    const sub = ROLE_INFO[card.role].name
    c.add(scene.add.text(0,
        ry + 16 * s,
        sub,
        {
            fontFamily: FONT, fontSize: `${10 * s}px`, color: hex(glow), stroke: "#000", strokeThickness: 2 * s
        }).setOrigin(0.5))
    const desc = card.strength
    const dh = H / 2 - (ry + 26 * s) - 22 * s
    c.add(scene.add.text(0,
        ry + 26 * s,
        desc,
        {
            fontFamily: FONT, fontSize: `${9.5 * s}px`, color: "#e4e0ec", align: "center", wordWrap: {
                width: W - 22 * s
            },
            stroke: "#000", strokeThickness: framed ? 2 * s : 0, maxLines: Math.max(1,
                Math.floor(dh / (9.5 * s * 1.25))),
        }).setOrigin(0.5,
        0))

    // AD và máu của tướng
    gem(scene,
        c,
        -W / 2 + 15 * s,
        H / 2 - 14 * s,
        13 * s,
        0xc0392b,
        String(card.atk),
        s * 0.85)
    gem(scene,
        c,
        W / 2 - 15 * s,
        H / 2 - 14 * s,
        13 * s,
        0x27ae60,
        String(card.hp),
        s * 0.7)
    if (opt.dim) c.setAlpha(0.55)
    return c
}

function gem(scene: Phaser.Scene, c: Phaser.GameObjects.Container, x: number, y: number, r: number, color: number, label: string, s: number) {
    const g = scene.add.graphics()
    g.fillStyle(0x000000,
        0.5); g.fillCircle(x + 1,
        y + 2,
        r + 2)
    g.fillStyle(0xf5d27a,
        1); g.fillCircle(x,
        y,
        r + 2)
    g.fillStyle(color,
        1); g.fillCircle(x,
        y,
        r)
    g.fillStyle(0xffffff,
        0.25); g.fillCircle(x - r * 0.3,
        y - r * 0.35,
        r * 0.4)
    c.add(g)
    c.add(scene.add.text(x,
        y,
        label,
        {
            fontFamily: FONT, fontSize: `${12 * s}px`, color: "#fff", fontStyle: "bold", stroke: "#000", strokeThickness: 3
        }).setOrigin(0.5))
}

// ================= BÀN ĐẤU =================

export const laneX = (l: number) => 110 + l * 172 + 86
/** Khung tướng trên bàn: chữ nhật nằm ngang, tranh phủ kín (ô nhỏ gọn hơn bản cũ 160×62) */
export const SLOT_W = 132, UNIT_H = 54
/** Lưới 7x5: Nhà, hàng trụ + bài úp, 3 hàng tướng mỗi bên, hàng quái ở giữa (toạ độ tâm theo trục y) */
export const Y = {
    nexus: {
        opp: 12, me: 524
    },
    tower: {
        opp: 36, me: 498
    }, trap: {
        opp: 36, me: 498
    },
    back: {
        opp: 80, me: 450
    }, mid: {
        opp: 146, me: 384
    }, front: {
        opp: 212, me: 318
    },
    monster: 265, river: 265,
}
/** Vùng bản đồ (ảnh nền phủ kín) */
export const BOARD_RECT = {
    x: 100, y: 0, w: 870, h: 540
}
export const PANEL_X = 990, PANEL_W = 275

/** Ảnh nền/khung bài (vd. do Codex vẽ), đặt trong public/ui/. Thiếu file nào thì phần đó tự vẽ. */
export const UI_ART = {
    board: "ui/board.jpg",
    "frame-hero": "ui/frame-hero.png",
    "frame-item": "ui/frame-item.png",
    "frame-spell": "ui/frame-spell.png",
    "frame-trap": "ui/frame-trap.png",
    // bộ UI Hextech do Codex vẽ (scripts/process_art.py --ui)
    panel: "ui/panel.png",
    "button_gold": "ui/button_gold.png",
    "button_blue": "ui/button_blue.png",
    "button_disabled": "ui/button_disabled.png",
    "unit_frame_blue": "ui/unit_frame_blue.png",
    "unit_frame_red": "ui/unit_frame_red.png",
    "bar_frame": "ui/bar_frame.png",
    "lane_plaque": "ui/lane_plaque.png",
    slot: "ui/slot.png",
    "gem_mana": "ui/gem_mana.png",
    "gem_mana_empty": "ui/gem_mana_empty.png",
    coin: "ui/coin.png",
    "card_back": "ui/card_back.png",
}
/** Thành phần bản đồ do Codex vẽ (scripts/process_art.py --map) */
const MAP_SPRITES = ["tree_a",
    "tree_b",
    "bush",
    "rock",
    "tower_blue",
    "tower_red",
    "dragon_pit"]
const MAP_TILES = ["grass_tile",
    "dirt_tile",
    "stone_tile",
    "water_tile"]

export function preloadUi(scene: Phaser.Scene) {
    for (const [key,
        url] of Object.entries(UI_ART)) scene.load.image(`ui-${key}`,
        url)
    preloadNine(scene)
    for (const k of ["spell",
        "trap",
        "stat"]) scene.load.image(`ui-iconframe-${k}`,
        `ui/iconframe-${k}.png`)
    for (const k of MAP_SPRITES) scene.load.image(`map-${k}`,
        `map/${k}.png`)
    for (const k of MAP_TILES) scene.load.image(`map-${k}`,
        `map/${k}.jpg`)
    // bản đồ 5 đường + hàng quái do Codex vẽ, phóng 2K bằng Real-ESRGAN (scripts/upscale.py)
    scene.load.image("map-board5",
        "map/board5.jpg")
}
export const hasArt = (scene: Phaser.Scene, key: string) =>
    scene.textures.exists(key) && scene.textures.get(key).getSourceImage().width > 1

/** Vẽ nền tĩnh của bàn đấu một lần: bản đồ (ảnh có sẵn hoặc rừng tự vẽ) + khung giao diện */
export function boardTexture(scene: Phaser.Scene, res: number) {
    const key = `board-bg-${res}`
    if (scene.textures.exists(key)) return key
    const W = 1280, H = 800
    const tex = scene.textures.createCanvas(key,
        W * res,
        H * res)!
    const ctx = tex.getContext()
    ctx.scale(res,
        res)
    if ([...MAP_SPRITES,
        ...MAP_TILES].every((k) => hasArt(scene,
        `map-${k}`))) composeMap(scene,
        ctx,
        W,
        H)
    else drawForest(ctx,
        W,
        H)
    if (hasArt(scene,
        "map-board5")) {
    // phủ kín vùng bàn đấu kiểu object-fit: cover
        const img = scene.textures.get("map-board5").getSourceImage() as HTMLImageElement, R = BOARD_RECT
        const sc = Math.max(R.w / img.width,
                R.h / img.height), sw = R.w / sc, sh = R.h / sc
        ctx.drawImage(img,
            (img.width - sw) / 2,
            (img.height - sh) / 2,
            sw,
            sh,
            R.x,
            R.y,
            R.w,
            R.h)
    } else if (hasArt(scene,
        "ui-board")) {
    // bản đồ vẽ sẵn phủ đúng vùng bàn đấu, viền mờ hoà vào rừng tự vẽ xung quanh
        ctx.save()
        ctx.beginPath(); ctx.rect(100,
            30,
            870,
            532); ctx.clip()
        ctx.drawImage(scene.textures.get("ui-board").getSourceImage() as CanvasImageSource,
            100,
            30,
            870,
            532)
        ctx.restore()
        ctx.strokeStyle = "rgba(10,20,8,0.9)"; ctx.lineWidth = 6; ctx.strokeRect(100,
            30,
            870,
            532)
    }
    drawOverlay(scene,
        ctx,
        W,
        H)
    tex.refresh()
    return key
}

/** Ghép bản đồ từ tile + sprite kiểu Summoner's Rift, khớp đúng 5 lane của bàn đấu */
function composeMap(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, W: number, H: number) {
    let seed = 4242
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const between = (a: number, b: number) => a + rnd() * (b - a)
    const src = (k: string) => scene.textures.get(`map-${k}`).getSourceImage() as CanvasImageSource
    const pattern = (k: string, scale: number) => {
        const p = ctx.createPattern(src(k),
            "repeat")!
        p.setTransform(new DOMMatrix().scale(scale))
        return p
    }
    const sprite = (k: string, x: number, y: number, size: number, rot = between(-0.4,
        0.4)) => {
        const img = scene.textures.get(`map-${k}`).getSourceImage() as HTMLImageElement
        const s = size / Math.max(img.width,
            img.height)
        ctx.save()
        ctx.translate(x,
            y); ctx.rotate(rot)
        ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 8; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4
        ctx.drawImage(img,
            (-img.width * s) / 2,
            (-img.height * s) / 2,
            img.width * s,
            img.height * s)
        ctx.restore()
    }

    // nền cỏ
    ctx.fillStyle = pattern("grass_tile",
        0.3); ctx.fillRect(0,
        0,
        W,
        H)
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(0,
        0,
        W,
        H)
    // màu trại hai bên
    const camp = (y0: number, y1: number, col: string) => {
        const g = ctx.createLinearGradient(0,
            y0,
            0,
            y1)
        g.addColorStop(0,
            col); g.addColorStop(1,
            "rgba(0,0,0,0)")
        ctx.fillStyle = g; ctx.fillRect(100,
            y0,
            870,
            y1 - y0)
    }
    camp(30,
        190,
        "rgba(170,40,30,0.28)")
    camp(560,
        390,
        "rgba(30,80,190,0.28)")

    // đường lane: đất, Trung Lộ lát đá
    for (let l = 0; l < 5; l++) {
        const cx = laneX(l), w = 130
        ctx.save()
        ctx.beginPath()
        for (let y = 30; y <= 556; y += 8) ctx.lineTo(cx - w / 2 + Math.sin(y / 37 + l) * 5,
            y)
        for (let y = 556; y >= 30; y -= 8) ctx.lineTo(cx + w / 2 + Math.sin(y / 41 + l * 2) * 5,
            y)
        ctx.closePath()
        ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 14
        ctx.fillStyle = pattern(l === 2 ? "stone_tile" : "dirt_tile",
            l === 2 ? 0.22 : 0.3)
        ctx.fill()
        ctx.restore()
    }

    // sông
    ctx.save()
    ctx.beginPath()
    for (let x = 96; x <= 974; x += 6) ctx.lineTo(x,
        270 + Math.sin(x / 23) * 3)
    for (let x = 974; x >= 96; x -= 6) ctx.lineTo(x,
        310 + Math.cos(x / 19) * 3)
    ctx.closePath()
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 10
    ctx.fillStyle = pattern("water_tile",
        0.25); ctx.fill()
    ctx.restore()
    const shine = ctx.createLinearGradient(0,
        268,
        0,
        312)
    shine.addColorStop(0,
        "rgba(10,30,40,0.5)"); shine.addColorStop(0.5,
        "rgba(120,200,255,0.12)"); shine.addColorStop(1,
        "rgba(10,30,40,0.5)")
    ctx.fillStyle = shine; ctx.fillRect(96,
        266,
        878,
        48)
    sprite("dragon_pit",
        laneX(3),
        290,
        66,
        0)

    // rìa rừng và dải rừng giữa các lane
    const trees = ["tree_a",
        "tree_b"]
    const tree = (x: number, y: number, s: number) => sprite(trees[Math.floor(rnd() * 2)],
        x,
        y,
        s,
        between(0,
            Math.PI * 2))
    for (let y = 10; y < 590; y += 26) { tree(between(62,
        92),
    y,
    between(46,
        60)); tree(between(976,
        990),
    y,
    between(34,
        44)) }
    for (let x = 110; x < 970; x += 34) tree(x + between(-6,
        6),
    between(-10,
        2),
    between(36,
        46))
    for (let x = 110; x < 970; x += 40) sprite("bush",
        x + between(-6,
            6),
        between(562,
            574),
        between(26,
            32))
    for (let l = 0; l < 4; l++) {
        const gx = (laneX(l) + laneX(l + 1)) / 2
        for (let y = 44; y < 552; y += between(30,
            42)) {
            if (Math.abs(y - 290) < 26) continue
            const pick = rnd()
            if (pick < 0.55) tree(gx + between(-4,
                4),
            y,
            between(30,
                38))
            else if (pick < 0.85) sprite("bush",
                gx,
                y,
                between(24,
                    30))
            else sprite("rock",
                gx,
                y,
                between(18,
                    24))
        }
    }
    // Rừng Bóng: bụi cỏ dọc hai mép đường
    for (let y = 46; y < 552; y += 30) {
        if (Math.abs(y - 290) < 26) continue
        sprite("bush",
            laneX(1) - 58,
            y,
            between(22,
                28))
        sprite("bush",
            laneX(1) + 58,
            y + 15,
            between(22,
                28))
    }
    // đá ven sông
    for (let l = 0; l < 4; l++) {
        const gx = (laneX(l) + laneX(l + 1)) / 2
        sprite("rock",
            gx,
            290,
            22)
    }
}

function drawForest(ctx: CanvasRenderingContext2D, W: number, H: number) {
    let seed = 1337
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const between = (a: number, b: number) => a + rnd() * (b - a)

    // cỏ nền
    const bg = ctx.createLinearGradient(0,
        0,
        0,
        H)
    bg.addColorStop(0,
        "#14240f"); bg.addColorStop(0.5,
        "#1b3214"); bg.addColorStop(1,
        "#0f1d0b")
    ctx.fillStyle = bg; ctx.fillRect(0,
        0,
        W,
        H)
    for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rnd() > 0.5 ? "rgba(90,140,60,0.18)" : "rgba(10,30,8,0.25)"
        ctx.fillRect(rnd() * W,
            rnd() * H,
            1.5,
            between(2,
                5))
    }
    // đất trại hai bên
    const camp = (y0: number, y1: number, col: string) => {
        const g = ctx.createLinearGradient(0,
            y0,
            0,
            y1)
        g.addColorStop(0,
            col); g.addColorStop(1,
            "rgba(0,0,0,0)")
        ctx.fillStyle = g; ctx.fillRect(100,
            y0,
            870,
            y1 - y0)
    }
    camp(30,
        200,
        "rgba(150,50,40,0.22)")
    camp(550,
        380,
        "rgba(40,80,160,0.22)")

    // đường đất mỗi lane (Trung Lộ lát đá)
    for (let l = 0; l < 5; l++) {
        const cx = laneX(l), w = 128
        const path = ctx.createLinearGradient(cx - w / 2,
            0,
            cx + w / 2,
            0)
        const base = l === 2 ? ["#4a4438",
            "#6a6250"] : ["#3b2d1c",
            "#5a4429"]
        path.addColorStop(0,
            base[0]); path.addColorStop(0.5,
            base[1]); path.addColorStop(1,
            base[0])
        ctx.fillStyle = path
        ctx.beginPath()
        for (let y = 30; y <= 552; y += 8) ctx.lineTo(cx - w / 2 + Math.sin(y / 37 + l) * 5,
            y)
        for (let y = 552; y >= 30; y -= 8) ctx.lineTo(cx + w / 2 + Math.sin(y / 41 + l * 2) * 5,
            y)
        ctx.closePath(); ctx.fill()
        for (let i = 0; i < 70; i++) {
            ctx.fillStyle = l === 2 ? "rgba(160,150,130,0.35)" : "rgba(20,14,8,0.35)"
            const x = cx + between(-w / 2 + 6,
                    w / 2 - 6), y = between(34,
                    548)
            if (l === 2) ctx.fillRect(x,
                y,
                between(8,
                    16),
                between(5,
                    9))
            else { ctx.beginPath(); ctx.arc(x,
                y,
                between(1,
                    2.5),
                0,
                Math.PI * 2); ctx.fill() }
        }
    }

    // sông
    const rv = ctx.createLinearGradient(0,
        270,
        0,
        310)
    rv.addColorStop(0,
        "#1a3a4a"); rv.addColorStop(0.5,
        "#2a6a8a"); rv.addColorStop(1,
        "#1a3a4a")
    ctx.fillStyle = rv; ctx.fillRect(100,
        272,
        870,
        36)
    ctx.strokeStyle = "rgba(200,235,255,0.35)"; ctx.lineWidth = 1.5
    for (const dy of [-8,
        0,
        8]) {
        ctx.beginPath()
        for (let x = 100; x <= 970; x += 4) ctx.lineTo(x,
            290 + dy + Math.sin(x / 20 + dy) * 2.5)
        ctx.stroke()
    }
    ctx.fillStyle = "rgba(60,50,30,0.8)"
    for (let x = 100; x < 970; x += 6) { ctx.fillRect(x,
        270 + Math.sin(x / 9) * 1.5,
        6,
        3); ctx.fillRect(x,
        307 + Math.cos(x / 11) * 1.5,
        6,
        3) }

    // Hang Rồng: hố đá giữa sông ở lane 4
    const dx = laneX(3)
    ctx.fillStyle = "#2a2622"; ctx.beginPath(); ctx.ellipse(dx,
        290,
        30,
        14,
        0,
        0,
        Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#0a0806"; ctx.beginPath(); ctx.ellipse(dx,
        291,
        20,
        8,
        0,
        0,
        Math.PI * 2); ctx.fill()
    ctx.fillStyle = "rgba(255,120,40,0.35)"; ctx.beginPath(); ctx.ellipse(dx,
        291,
        12,
        4,
        0,
        0,
        Math.PI * 2); ctx.fill()

    const tree = (x: number, y: number, r: number) => {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x + r * 0.3,
            y + r * 0.6,
            r,
            r * 0.45,
            0,
            0,
            Math.PI * 2); ctx.fill();
        ["#14361a",
            "#1d4a22",
            "#27602b",
            "#337a34"].forEach((c, i) => {
            ctx.fillStyle = c
            for (let k = 0; k < 4; k++) {
                ctx.beginPath()
                ctx.arc(x + between(-r * 0.5,
                    r * 0.5) * (1 - i * 0.2),
                y + between(-r * 0.5,
                    r * 0.3) - i * r * 0.12,
                r * (0.75 - i * 0.12),
                0,
                Math.PI * 2)
                ctx.fill()
            }
        })
        ctx.fillStyle = "rgba(180,230,140,0.18)"; ctx.beginPath(); ctx.arc(x - r * 0.25,
            y - r * 0.45,
            r * 0.3,
            0,
            Math.PI * 2); ctx.fill()
    }
    const bush = (x: number, y: number, r: number) => {
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x,
            y + r * 0.5,
            r,
            r * 0.4,
            0,
            0,
            Math.PI * 2); ctx.fill()
        for (let k = 0; k < 5; k++) {
            ctx.fillStyle = k % 2 ? "#2e6b2c" : "#3d8a36"
            ctx.beginPath(); ctx.arc(x + between(-r,
                r) * 0.7,
            y + between(-r,
                r) * 0.4,
            r * between(0.45,
                0.7),
            0,
            Math.PI * 2); ctx.fill()
        }
    }
    const rock = (x: number, y: number, r: number) => {
        ctx.fillStyle = "#4a4a50"; ctx.beginPath(); ctx.ellipse(x,
            y,
            r,
            r * 0.7,
            between(-0.5,
                0.5),
            0,
            Math.PI * 2); ctx.fill()
        ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.ellipse(x - r * 0.3,
            y - r * 0.3,
            r * 0.4,
            r * 0.25,
            0,
            0,
            Math.PI * 2); ctx.fill()
    }
    // rìa rừng hai bên, phía trên và phía dưới
    for (let y = 20; y < 570; y += 22) { tree(between(66,
        100),
    y + between(-6,
        6),
    between(16,
        24)); tree(between(972,
        984),
    y,
    between(12,
        18)) }
    for (let x = 110; x < 970; x += 26) tree(x + between(-6,
        6),
    between(-6,
        4),
    between(14,
        20))
    for (let x = 110; x < 970; x += 30) bush(x + between(-6,
        6),
    between(556,
        572),
    between(8,
        12))
    // giữa các đường đất
    for (let l = 0; l < 4; l++) {
        const gx = (laneX(l) + laneX(l + 1)) / 2
        for (let y = 40; y < 550; y += between(26,
            44)) {
            if (Math.abs(y - 290) < 22) continue
            const pick = rnd()
            if (pick < 0.45) bush(gx + between(-6,
                6),
            y,
            between(9,
                13))
            else if (pick < 0.85) tree(gx + between(-5,
                5),
            y,
            between(13,
                18))
            else rock(gx,
                y,
                between(5,
                    8))
        }
    }
    // Rừng Bóng: cỏ cao dọc mép đường
    const jx = laneX(1)
    for (let y = 40; y < 550; y += 14) {
        if (Math.abs(y - 290) < 22) continue
        for (const side of [-1,
            1]) {
            ctx.strokeStyle = rnd() > 0.5 ? "#4f9a3c" : "#3a7a2e"; ctx.lineWidth = 2
            const bx = jx + side * between(52,
                66)
            for (let k = 0; k < 4; k++) {
                ctx.beginPath(); ctx.moveTo(bx + k * 3,
                    y + 10)
                ctx.quadraticCurveTo(bx + k * 3 + side * 4,
                    y,
                    bx + k * 3 + side * 6,
                    y - between(6,
                        12)); ctx.stroke()
            }
        }
    }
    // đom đóm
    for (let i = 0; i < 60; i++) {
        const x = between(100,
                970), y = between(30,
                560), g = ctx.createRadialGradient(x,
                y,
                0,
                x,
                y,
                6)
        g.addColorStop(0,
            "rgba(230,255,160,0.7)"); g.addColorStop(1,
            "rgba(230,255,160,0)")
        ctx.fillStyle = g; ctx.fillRect(x - 6,
            y - 6,
            12,
            12)
    }
}

/** Giao diện vẽ đè lên bản đồ: bảng tên lane, nhãn hàng, khay bài, bảng bên phải */
function drawOverlay(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, W: number, H: number) {
    const img = (k: string) => {
        const key = k.startsWith("nine-") ? k : `ui-${k}`
        return hasArt(scene,
            key) ? scene.textures.get(key).getSourceImage() as HTMLImageElement : undefined
    }
    const panel = img("panel")
    ctx.font = `bold 11px ${FONT}`; ctx.textAlign = "center"
    const rows: [number, string, string][] = [
        [Y.tower.opp,
            "Trụ · bài úp",
            "#ff8a7a"],
        [Y.back.opp,
            "Hậu tuyến",
            "#ff8a7a"],
        [Y.mid.opp,
            "Hàng giữa",
            "#ff8a7a"],
        [Y.front.opp,
            "Tiền tuyến",
            "#ff8a7a"],
        [Y.monster,
            "HÀNG QUÁI",
            "#9fe08a"],
        [Y.front.me,
            "Tiền tuyến",
            "#8ab8ff"],
        [Y.mid.me,
            "Hàng giữa",
            "#8ab8ff"],
        [Y.back.me,
            "Hậu tuyến",
            "#8ab8ff"],
        [Y.tower.me,
            "Trụ · bài úp",
            "#8ab8ff"],
    ]
    for (const [y,
        t,
        c] of rows) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; roundRect(ctx,
            14,
            y - 9,
            80,
            18,
            5); ctx.fill()
        ctx.fillStyle = c; ctx.fillText(t,
            54,
            y)
    }
    if (panel) {
    // khay bài và bảng bên phải: khung Hextech do Codex vẽ, co giãn kiểu 9-slice
    // khay bài và bảng bên phải: 9-slice dùng chung với Sảnh (nine.ts), có ảnh mới thì dùng ảnh mới
        const tray = img("nine-deck_tray") ?? undefined, side = img("nine-tooltip") ?? undefined
        if (tray) drawNineCanvas(ctx,
            tray,
            "tray",
            6,
            576,
            970,
            220); else drawNine(ctx,
            panel,
            6,
            576,
            970,
            220,
            0.11,
            26)
        if (side) drawNineCanvas(ctx,
            side,
            "panel",
            PANEL_X - 10,
            2,
            PANEL_W + 20,
            796); else drawNine(ctx,
            panel,
            PANEL_X - 10,
            2,
            PANEL_W + 20,
            796,
            0.11,
            26)
    } else {
        const tray = ctx.createLinearGradient(0,
            572,
            0,
            H)
        tray.addColorStop(0,
            "rgba(29,23,18,0.94)"); tray.addColorStop(1,
            "rgba(11,9,7,0.98)")
        ctx.fillStyle = tray; roundRect(ctx,
            8,
            578,
            966,
            216,
            12); ctx.fill()
        ctx.strokeStyle = "rgba(245,210,122,0.4)"; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.fillStyle = "rgba(14,12,20,0.94)"; roundRect(ctx,
            PANEL_X - 8,
            4,
            PANEL_W + 16,
            792,
            12); ctx.fill()
        ctx.strokeStyle = "rgba(245,210,122,0.35)"; ctx.stroke()
    }
    // ghi chú bản quyền (chính sách fan content của Riot)
    ctx.fillStyle = "rgba(200,200,210,0.45)"; ctx.font = `9px ${FONT}`; ctx.textAlign = "left"
    ctx.fillText("Dự án fan phi thương mại, không được Riot Games bảo trợ.",
        PANEL_X,
        778)
    ctx.fillText("Tranh, icon, tên tướng LMHT © Riot Games.",
        PANEL_X,
        790)
    const vg = ctx.createRadialGradient(W / 2,
        H / 2,
        320,
        W / 2,
        H / 2,
        860)
    vg.addColorStop(0,
        "rgba(0,0,0,0)"); vg.addColorStop(1,
        "rgba(0,0,0,0.5)")
    ctx.fillStyle = vg; ctx.fillRect(0,
        0,
        W,
        H)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r,
        y)
    ctx.arcTo(x + w,
        y,
        x + w,
        y + h,
        r); ctx.arcTo(x + w,
        y + h,
        x,
        y + h,
        r)
    ctx.arcTo(x,
        y + h,
        x,
        y,
        r); ctx.arcTo(x,
        y,
        x + w,
        y,
        r)
    ctx.closePath()
}

// ================= 9-SLICE =================

/** Vẽ ảnh khung 9 mảnh lên canvas: góc giữ nguyên tỉ lệ (cạnh góc = cornerFrac × chiều rộng ảnh, hiển thị cornerDst px) */
export function drawNine(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, cornerFrac: number, cornerDst: number) {
    const c = Math.round(img.width * cornerFrac), d = Math.min(cornerDst,
        w / 2,
        h / 2)
    const sx = [0,
            c,
            img.width - c,
            img.width], sy = [0,
            c,
            img.height - c,
            img.height]
    const dx = [x,
            x + d,
            x + w - d,
            x + w], dy = [y,
            y + d,
            y + h - d,
            y + h]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        ctx.drawImage(img,
            sx[i],
            sy[j],
            sx[i + 1] - sx[i],
            sy[j + 1] - sy[j],
            dx[i],
            dy[j],
            dx[i + 1] - dx[i],
            dy[j + 1] - dy[j])
    }
}

/** Vẽ thanh ngang 3 mảnh (nút, bảng tên): hai đầu giữ tỉ lệ theo chiều cao, giữa kéo giãn */
export function drawHBar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const cap = Math.round(img.height * 0.9), capD = Math.min((cap * h) / img.height,
        w / 2)
    ctx.drawImage(img,
        0,
        0,
        cap,
        img.height,
        x,
        y,
        capD,
        h)
    ctx.drawImage(img,
        cap,
        0,
        img.width - 2 * cap,
        img.height,
        x + capD,
        y,
        w - 2 * capD,
        h)
    ctx.drawImage(img,
        img.width - cap,
        0,
        cap,
        img.height,
        x + w - capD,
        y,
        capD,
        h)
}

/** Thanh ngang 3 mảnh dạng game object (nút bấm, thanh máu) */
export function hbar(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number) {
    const tex = scene.textures.get(key).getSourceImage() as HTMLImageElement
    const k = tex.height / h, cap = Math.min(Math.round(tex.height * 0.9),
        Math.floor((w * k) / 2) - 1)
    return scene.add.nineslice(x,
        y,
        key,
        undefined,
        w * k,
        tex.height,
        cap,
        cap,
        0,
        0).setOrigin(0).setScale(1 / k)
}

/** Khung 9 mảnh dạng game object (bảng, khung tướng) */
export function nine(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number, cornerFrac = 0.11, cornerDst = 18) {
    const tex = scene.textures.get(key).getSourceImage() as HTMLImageElement
    const c = Math.round(tex.width * cornerFrac), k = c / cornerDst
    return scene.add.nineslice(x,
        y,
        key,
        undefined,
        w * k,
        h * k,
        c,
        c,
        c,
        c).setOrigin(0).setScale(1 / k)
}
