// Nạp JSON cân bằng của 39 tướng và 36 món. Xem docs/heroes/BALANCE.md.
import {
    Kit, type HeroBalance
} from "./kit"
import itemsJson from "./items.json"
import aatrox from "./heroes/aatrox.json"
import ahri from "./heroes/ahri.json"
import annie from "./heroes/annie.json"
import ashe from "./heroes/ashe.json"
import azir from "./heroes/azir.json"
import blitzcrank from "./heroes/blitzcrank.json"
import brand from "./heroes/brand.json"
import braum from "./heroes/braum.json"
import darius from "./heroes/darius.json"
import gangplank from "./heroes/gangplank.json"
import garen from "./heroes/garen.json"
import janna from "./heroes/janna.json"
import jayce from "./heroes/jayce.json"
import jinx from "./heroes/jinx.json"
import katarina from "./heroes/katarina.json"
import khazix from "./heroes/khazix.json"
import kogmaw from "./heroes/kogmaw.json"
import leona from "./heroes/leona.json"
import lissandra from "./heroes/lissandra.json"
import lux from "./heroes/lux.json"
import malphite from "./heroes/malphite.json"
import missfortune from "./heroes/missfortune.json"
import nami from "./heroes/nami.json"
import ornn from "./heroes/ornn.json"
import qiyana from "./heroes/qiyana.json"
import renata from "./heroes/renata.json"
import rumble from "./heroes/rumble.json"
import mel from "./heroes/mel.json"
import sona from "./heroes/sona.json"
import soraka from "./heroes/soraka.json"
import sylas from "./heroes/sylas.json"
import teemo from "./heroes/teemo.json"
import tristana from "./heroes/tristana.json"
import twistedfate from "./heroes/twistedfate.json"
import vayne from "./heroes/vayne.json"
import velkoz from "./heroes/velkoz.json"
import viktor from "./heroes/viktor.json"
import yorick from "./heroes/yorick.json"
import zed from "./heroes/zed.json"

const HERO_BALANCE: Record<string, unknown> = {
    aatrox, ahri, annie, ashe, azir, blitzcrank, brand, braum, darius, gangplank, garen, janna, jayce, jinx, katarina, khazix, kogmaw, leona, lissandra, lux, malphite, mel, missfortune, nami, ornn, qiyana, renata, rumble, sona, soraka, sylas, teemo, tristana, twistedfate, vayne, velkoz, viktor, yorick, zed
}

const cache = new Map<string, Kit>()
/** Kit số liệu của tướng `id`, đọc từ balance/heroes/<id>.json */
export function kit(id: string): Kit {
    const hit = cache.get(id)
    if (hit) return hit
    const raw = HERO_BALANCE[id] as HeroBalance | undefined
    if (!raw) throw new Error(`Thiếu balance/heroes/${id}.json`)
    const k = new Kit(raw)
    cache.set(id,
        k)
    return k
}
export const balanceHeroIds = () => Object.keys(HERO_BALANCE)

export interface ItemBalance { stats: Record<string, number>; params: Record<string, number> }
const ITEMS = itemsJson as Record<string, ItemBalance>
/** Số của món `id` trong balance/items.json; đọc tên tham số không có sẽ ném lỗi */
export function itemBalance(id: string): { stats: Record<string, number>; p: Record<string, number> } {
    const raw = ITEMS[id]
    if (!raw) throw new Error(`Thiếu món ${id} trong balance/items.json`)
    return {
        stats: raw.stats,
        p: new Proxy(raw.params,
            {
                get(t, key) {
                    if (typeof key !== "string") return undefined
                    const v = t[key]
                    if (typeof v !== "number") throw new Error(`Thiếu tham số ${key} của món ${id} trong balance/items.json`)
                    return v
                },
            }),
    }
}
export * from "./kit"
