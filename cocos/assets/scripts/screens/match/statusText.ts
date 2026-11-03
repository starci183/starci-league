// Tên tiếng Việt, mô tả ngắn và màu (có lợi / có hại) của trạng thái, dấu, bộ đếm trên tướng. Dữ liệu lấy từ shared
// (cg.STATUS_V2, cg.STACK_V2) cộng bảng trạng thái chung của engine, đúng như bản web (card/board/helpers.ts).
import {
    cg
} from "../../shared"
import type {
    CardView
} from "../../net/game"

interface Txt { name: string; desc: string }

/** Trạng thái chung của engine; trạng thái riêng của tướng (STATUS_V2) ghi đè cùng id */
const BASE: Record<string, Txt> = {
    stun: {
        name: "Choáng", desc: "Không dùng chiêu, không đánh, không bị lá Đánh thường nhắm tới."
    },
    silence: {
        name: "Câm lặng", desc: "Không tung được chiêu (vẫn đánh thường)."
    },
    chill: {
        name: "Giá Lạnh", desc: "Nhận thêm 25% sát thương."
    },
    shred: {
        name: "Rã giáp", desc: "Giáp và kháng phép giảm."
    },
    taunt: {
        name: "Khiêu khích", desc: "Chiêu và đòn đơn mục tiêu của địch phải nhắm tướng này."
    },
    empower: {
        name: "Cường hóa", desc: "Gây thêm 20% sát thương."
    },
    blind: {
        name: "Mù", desc: "Các đòn đánh kế tiếp trượt."
    },
    grievous: {
        name: "Vết thương sâu", desc: "Giảm hiệu quả hồi máu và khiên nhận được."
    },
    stealth: {
        name: "Tàng hình", desc: "Không bị chọn làm mục tiêu, nhưng vẫn nhận sát thương diện rộng, nổ và theo thời gian."
    },
    stasis: {
        name: "Đóng băng thân", desc: "Miễn mọi sát thương, không bị chọn, không hành động được tới hết lượt."
    },
    guard: {
        name: "Hộ vệ", desc: "Hứng mọi sát thương địch định gây cho đồng minh."
    },
    dmgCut: {
        name: "Giảm sát thương", desc: "Nhận ít sát thương hơn."
    },
    attackCut: {
        name: "Giảm sát thương đòn đánh", desc: "Nhận ít sát thương từ đòn đánh hơn."
    },
    ignite: {
        name: "Thiêu Đốt", desc: "Mất máu (sát thương chuẩn) đầu lượt của chủ."
    },
    exhaust: {
        name: "Kiệt sức", desc: "Gây ít hơn 40% sát thương."
    },
    noheal: {
        name: "Không Hồi Phục", desc: "Không được hồi máu hay nhận Khiên."
    },
    berserk: {
        name: "Nổi Điên", desc: "Bị buộc đánh đồng đội của chính mình."
    },
    see_hand: {
        name: "Thấy Bài", desc: "Đang xem tay bài đối thủ."
    },
    armor_up: {
        name: "Tăng Giáp", desc: "Giáp cộng thêm tạm thời trong thời hạn của trạng thái."
    },
    armor_down: {
        name: "Giảm Giáp", desc: "Giáp bị trừ phẳng trong thời hạn của trạng thái."
    },
    mr_up: {
        name: "Tăng Kháng Phép", desc: "Kháng phép cộng thêm trong thời hạn của trạng thái."
    },
    mr_down: {
        name: "Giảm Kháng Phép", desc: "Kháng phép bị trừ phẳng trong thời hạn của trạng thái."
    },
    ad_up: {
        name: "Tăng AD", desc: "Sát thương vật lý (AD) cộng thêm trong thời hạn của trạng thái."
    },
    ad_down: {
        name: "Giảm AD", desc: "AD bị trừ phẳng trong thời hạn của trạng thái."
    },
    ap_up: {
        name: "Tăng AP", desc: "Sức mạnh phép (AP) cộng thêm trong thời hạn của trạng thái."
    },
    crit_up: {
        name: "Tăng Chí Mạng", desc: "Tỉ lệ Chí mạng cộng thêm (%) trong thời hạn của trạng thái."
    },
    attack_speed: {
        name: "Tốc Đánh", desc: "Đòn đánh nhanh hơn, thêm đòn trong lượt."
    },
    disarm: {
        name: "Tước Vũ Khí", desc: "Không đánh thường được (vẫn dùng chiêu)."
    },
    invulnerable: {
        name: "Bất Khả Xâm Phạm", desc: "Không nhận sát thương trong thời hạn của trạng thái."
    },
}

/** Dấu trúng đòn (marks) */
const MARKS: Record<string, Txt> = {
    nami_q: {
        name: "Dấu Bong Bóng", desc: "Mỗi đòn đánh của đồng minh Nami lên tướng này tiêu 1 nấc và gây thêm sát thương phép."
    },
}

/** Có hại (đỏ) và có lợi (xanh ngọc); id lạ coi là có hại để người chơi để ý */
const BAD = new Set(["stun", "silence", "chill", "shred", "blind", "taunt", "ignite", "exhaust", "grievous", "noheal", "berserk",
    "bleed", "guilt", "sun", "isolated", "burn", "frost", "ornn_shred", "braum_mark", "malphite_stolen", "zed_mark", "kat_dagger",
    "qiyana_mark", "ahri_charm", "tri_bomb", "mf_exposed", "armor_down", "mr_down", "ad_down", "disarm", "vulnerable", "madness",
    "gp_wanted", "zed_q", "bleed_t", "nami_q"])
const GOOD = new Set(["empower", "stealth", "stasis", "guard", "dmgCut", "attackCut", "armor_up", "see_hand", "aatrox_e",
    "yorick_mist", "frenzy", "janna_ward", "janna_gale", "malphite_loot", "malphite_e", "zed_chain", "alwaysCrit", "ashe_e",
    "jinx_q", "kog_e", "vayne_e", "vayne_r", "tri_q", "ashe_q", "mr_up", "ad_up", "ap_up", "crit_up", "attack_speed",
    "invulnerable", "shield_power", "renata_q"])

function statusText(id: string): Txt | undefined {
    return cg.STATUS_V2[id]?.vi ?? BASE[id] ?? MARKS[id]
}

/** Tên + mô tả + có lợi hay không của một id trạng thái / dấu / bộ đếm */
export function statusLabel(id: string): { name: string; desc: string; good: boolean } {
    const stack = cg.STACK_V2[id]?.vi
    const t = statusText(id) ?? stack
    const good = GOOD.has(id) ? true : BAD.has(id) ? false : !!stack && !statusText(id)
    return {
        name: t?.name ?? id, desc: t?.desc ?? "", good
    }
}

const SCALED = new Set(["armor_up", "armor_down", "mr_up", "mr_down", "ad_up", "ad_down", "ap_up", "crit_up", "attack_speed"])

/** Mọi hiệu ứng đang có trên tướng: trạng thái, dấu, bộ đếm có tên. turns = số lượt còn lại, 0 là không hết hạn */
export function unitEffects(view: CardView, unit: cg.Unit): { id: string; name: string; desc: string; good: boolean; turns: number }[] {
    const out: { id: string; name: string; desc: string; good: boolean; turns: number }[] = []
    const left = (until: number) => Math.max(0, until - view.turnNo)
    for (const [id, s] of Object.entries(unit.statuses ?? {})) {
        const l = statusLabel(id)
        out.push({
            id, name: SCALED.has(id) && s.v ? `${l.name} ${Math.round(s.v * 100) / 100}` : l.name, desc: l.desc, good: l.good, turns: left(s.until)
        })
    }
    for (const m of unit.marks ?? []) {
        const l = statusLabel(m.id)
        out.push({
            id: `mark:${m.id}`, name: `${l.name} ×${m.hits}`, desc: l.desc, good: l.good, turns: left(m.until)
        })
    }
    for (const [key, v] of Object.entries(unit.stacks ?? {})) {
        if (!v || !cg.STACK_V2[key]) continue
        const l = statusLabel(key)
        out.push({
            id: `stack:${key}`, name: `${l.name} ×${Math.round(v * 100) / 100}`, desc: l.desc, good: true, turns: 0
        })
    }
    return out
}
