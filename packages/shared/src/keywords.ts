// Từ khóa hiệu ứng trong mô tả (kiểu tooltip LoL): in đậm + icon phía trước, chú giải bên dưới.
// Hiệu ứng chung (Choáng, Buốt...) dùng icon chung public/ui/status/<id>.png;
// hiệu ứng riêng của tướng (Xuất Huyết của Darius...) dùng icon nội tại public/icons/<tướng>_p.png.
// Hiệu ứng có tên do lá bài / quái rừng trao (Đâm Xuyên, Bùa Đỏ...): icon là art của lá (hoặc quái), tên/mô tả lấy từ buff.
// Con số trong mô tả ("60% sát thương", "50 + 40% AP", "3 vòng") in đậm màu vàng.
import {
    getLang
} from "./i18n"
import {
    allBuffs
} from "./deck/registry"

interface KeywordText { name: string; desc: string; terms: string[] }
interface KeywordDef { id: string; icon: string; vi: KeywordText; en: KeywordText; buff?: string }
/** good: hiệu ứng có lợi (hiện màu xanh trên tướng), còn lại bất lợi (đỏ) */
export interface Keyword { id: string; icon: string; name: string; desc: string; good: boolean }

const s = (id: string) => `ui/status/${id}.png`
const p = (hero: string) => `icons/${hero}_p.png`

const DEFS: KeywordDef[] = [
    {
        id: "stun", icon: s("stun"),
        vi: {
            name: "Choáng", desc: "Không thể đánh thường hay tung chiêu cho tới hết thời gian.", terms: ["Choáng"]
        },
        en: {
            name: "Stun", desc: "Can't basic attack or cast abilities until it wears off.", terms: ["Stun",
                "Stuns",
                "Stunned",
                "Stunning"]
        }
    },
    {
        id: "freeze", icon: s("freeze"),
        vi: {
            name: "Đóng băng", desc: "Bị bọc trong băng: như Choáng, không thể đánh thường hay tung chiêu.", terms: ["Đóng băng"]
        },
        en: {
            name: "Frozen", desc: "Encased in ice: like Stun, can't basic attack or cast abilities.", terms: ["Frozen",
                "Freeze",
                "Freezes"]
        }
    },
    {
        id: "chill", icon: s("chill"),
        vi: {
            name: "Buốt", desc: "Nhận thêm 25% sát thương từ mọi nguồn.", terms: ["Buốt"]
        },
        en: {
            name: "Chill", desc: "Takes 25% more damage from all sources.", terms: ["Chill",
                "Chills",
                "Chilled"]
        }
    },
    {
        id: "shred", icon: s("shred"),
        vi: {
            name: "Rã giáp", desc: "Giáp và Kháng phép giảm 40%.", terms: ["Rã giáp"]
        },
        en: {
            name: "Armor Shred", desc: "Armor and Magic Resist reduced by 40%.", terms: ["Armor Shred",
                "Shred",
                "Shreds",
                "Shredded"]
        }
    },
    {
        id: "wounds", icon: s("wounds"),
        vi: {
            name: "Vết Thương Sâu", desc: "Lượng máu được hồi giảm 50%.", terms: ["Vết Thương Sâu"]
        },
        en: {
            name: "Grievous Wounds", desc: "Healing received is reduced by 50%.", terms: ["Grievous Wounds"]
        }
    },
    {
        id: "burn", icon: s("burn"),
        vi: {
            name: "Thiêu Đốt", desc: "Mất máu vào mỗi lượt cho tới hết thời gian.", terms: ["Thiêu Đốt",
                "Đốt"]
        },
        en: {
            name: "Burn", desc: "Loses HP every turn until it wears off.", terms: ["Burn",
                "Burns",
                "Burning"]
        }
    },
    {
        id: "poison", icon: s("poison"),
        vi: {
            name: "Độc", desc: "Trúng độc: mất máu vào mỗi lượt cho tới hết thời gian.", terms: ["Độc"]
        },
        en: {
            name: "Poison", desc: "Poisoned: loses HP every turn until it wears off.", terms: ["Poison",
                "Poisons",
                "Poisoned"]
        }
    },
    {
        id: "invuln", icon: s("invuln"),
        vi: {
            name: "Bất Tử", desc: "Không nhận sát thương.", terms: ["Bất Tử"]
        },
        en: {
            name: "Invulnerable", desc: "Takes no damage.", terms: ["Invulnerable",
                "Invulnerability"]
        }
    },
    {
        id: "unstoppable", icon: s("unstoppable"),
        vi: {
            name: "Không Cản Phá", desc: "Miễn mọi hiệu ứng khống chế: Choáng, Đóng băng, Hất tung, Trói, Câm lặng.", terms: ["Không Cản Phá",
                "Miễn KC"]
        },
        en: {
            name: "Unstoppable", desc: "Immune to crowd control: Stun, Frozen, Knock-up, Root, Silence.", terms: ["Unstoppable"]
        }
    },
    {
        id: "guard", icon: s("guard"),
        vi: {
            name: "Kiên Cường", desc: "Nhận ít hơn 30% sát thương.", terms: ["Kiên Cường"]
        },
        en: {
            name: "Guard", desc: "Takes 30% less damage.", terms: ["Guard",
                "Guarded"]
        }
    },
    {
        id: "knockup", icon: s("knockup"),
        vi: {
            name: "Hất tung", desc: "Bị hất lên không trung: tính như Choáng, không thể đánh thường hay tung chiêu.", terms: ["Hất tung"]
        },
        en: {
            name: "Knock-up", desc: "Launched into the air: counts as Stun, can't basic attack or cast abilities.", terms: ["Knock-up",
                "Knock up",
                "Knocks up",
                "Knocked up",
                "Knock-ups",
                "Airborne"]
        }
    },
    {
        id: "silence", icon: s("silence"),
        vi: {
            name: "Câm lặng", desc: "Không thể tung chiêu (chiêu đang tung bị huỷ), nhưng vẫn đánh thường và di chuyển được.", terms: ["Câm lặng"]
        },
        en: {
            name: "Silence", desc: "Can't cast abilities (a cast in progress is cancelled), but can still basic attack and move.", terms: ["Silence",
                "Silences",
                "Silenced"]
        }
    },
    {
        id: "true", icon: s("true"),
        vi: {
            name: "Sát thương chuẩn", desc: "Bỏ qua Giáp, Kháng phép và mọi hiệu ứng giảm sát thương.", terms: ["Sát thương chuẩn"]
        },
        en: {
            name: "True damage", desc: "Ignores Armor, Magic Resist and all damage reduction.", terms: ["True damage"]
        }
    },
    {
        id: "shield", icon: s("shield"),
        vi: {
            name: "Khiên", desc: "Hấp thụ sát thương trước; hết khiên mới bắt đầu mất máu.", terms: ["Khiên"]
        },
        en: {
            name: "Shield", desc: "Absorbs damage first; HP is lost only after the shield breaks.", terms: ["Shield",
                "Shields",
                "Shielded"]
        }
    },
    {
        id: "root", icon: s("root"),
        vi: {
            name: "Trói", desc: "Bị trói chân tại chỗ: tính như Choáng 1 vòng.", terms: ["Trói"]
        },
        en: {
            name: "Root", desc: "Held in place: counts as Stun for 1 round.", terms: ["Root",
                "Roots",
                "Rooted",
                "Snare",
                "Snared"]
        }
    },
    {
        id: "lifesteal", icon: s("lifesteal"),
        vi: {
            name: "Hút máu", desc: "Hồi máu bằng một phần sát thương gây ra.", terms: ["Hút máu"]
        },
        en: {
            name: "Lifesteal", desc: "Heals for a portion of the damage dealt.", terms: ["Lifesteal",
                "Life steal",
                "Omnivamp"]
        }
    },
    {
        id: "taunt", icon: s("taunt"),
        vi: {
            name: "Khiêu khích", desc: "Kẻ bị khiêu khích buộc phải đánh vào tướng đã khiêu khích.", terms: ["Khiêu khích"]
        },
        en: {
            name: "Taunt", desc: "Taunted enemies are forced to attack the taunting champion.", terms: ["Taunt",
                "Taunts",
                "Taunted"]
        }
    },
    {
        id: "reveal", icon: s("reveal"),
        vi: {
            name: "Lộ diện", desc: "Bài úp hoặc tướng đang ẩn bị lộ cho đối thủ thấy.", terms: ["Lộ diện"]
        },
        en: {
            name: "Reveal", desc: "Face-down cards or hidden champions become visible to the opponent.", terms: ["Reveal",
                "Reveals",
                "Revealed"]
        }
    },
    {
        id: "empower", icon: s("empower"),
        vi: {
            name: "Cường Hoá", desc: "Được tăng sức mạnh, mức tăng ghi ở chiêu hoặc lá bài gây ra nó.", terms: ["Cường Hoá",
                "Cường hóa"]
        },
        en: {
            name: "Empowered", desc: "Powered up; the bonus is listed on the ability or card that grants it.", terms: ["Empowered",
                "Empower",
                "Empowers"]
        }
    },
    // hiệu ứng riêng của tướng: icon nội tại
    {
        id: "hemorrhage", icon: p("darius"),
        vi: {
            name: "Xuất Huyết", desc: "Nội tại Darius: mỗi dấu (tối đa 5) gây sát thương mỗi lượt; đủ 5 dấu Darius được Sức Mạnh Noxus (+30% AD).", terms: ["Xuất Huyết"]
        },
        en: {
            name: "Hemorrhage", desc: "Darius passive: each stack (max 5) deals damage every turn; at 5 stacks Darius gains Noxian Might (+30% AD).", terms: ["Hemorrhage"]
        }
    },
    {
        id: "illumination", icon: p("lux"),
        vi: {
            name: "Soi Rọi", desc: "Nội tại Lux: đòn đánh của Lux vào mục tiêu bị Soi Rọi nổ thêm sát thương phép rồi xoá dấu.", terms: ["Soi Rọi"]
        },
        en: {
            name: "Illumination", desc: "Lux passive: Lux's basic attack on an Illuminated target detonates it for bonus magic damage.", terms: ["Illumination",
                "Illuminated",
                "Illuminates"]
        }
    },
    {
        id: "pyromania", icon: p("annie"),
        vi: {
            name: "Hỏa Cuồng", desc: "Nội tại Annie: mỗi lần tung chiêu +1 dấu; đủ 4 dấu thì chiêu gây sát thương kế tiếp làm Choáng.", terms: ["Hỏa Cuồng"]
        },
        en: {
            name: "Pyromania", desc: "Annie passive: each cast adds a stack; at 4 stacks her next damaging ability Stuns.", terms: ["Pyromania"]
        }
    },
    {
        id: "concussive", icon: p("braum"),
        vi: {
            name: "Đánh Ngất Ngư", desc: "Nội tại Braum: đòn đánh và Q cộng 1 dấu; đủ 3 dấu thì mục tiêu bị Choáng.", terms: ["Đánh Ngất Ngư"]
        },
        en: {
            name: "Concussive Blows", desc: "Braum passive: attacks and Q add a stack; at 3 stacks the target is Stunned.", terms: ["Concussive Blows"]
        }
    },
    {
        id: "damnation", icon: p("thresh"),
        vi: {
            name: "Đọa Đày", desc: "Nội tại Thresh: mỗi linh hồn thu được cho +3 Giáp và +3 AP vĩnh viễn (tối đa 20).", terms: ["Đọa Đày",
                "linh hồn"]
        },
        en: {
            name: "Damnation", desc: "Thresh passive: each soul collected grants +3 Armor and +3 AP permanently (max 20).", terms: ["Damnation",
                "soul",
                "souls"]
        }
    },
]

/** Hiệu ứng có tên do lá bài / quái trao: icon = art của lá (hoặc quái) */
const BUFF_ICON: Record<string, string> = {
    exhaust: "cards/kiet_suc.jpg", wrath: "cards/thuoc_cuong_no.jpg", sorcery: "cards/thuoc_phu_thuy.jpg", baron: "jungle/baron.png",
    regen: "cards/binh_mau.jpg", crit: "cards/chi_mang.jpg", execute: "cards/ket_lieu.jpg", tempo: "cards/nhip_do.jpg",
    pierce: "cards/dam_xuyen.jpg", red_buff: "jungle/red.png", blue_buff: "jungle/blue.png",
}
/** Hiệu ứng bất lợi (đỏ); còn lại có lợi (xanh) */
const BAD = new Set(["stun",
    "freeze",
    "chill",
    "shred",
    "wounds",
    "burn",
    "poison",
    "knockup",
    "silence",
    "root",
    "taunt",
    "reveal",
    "buff:exhaust"])
const buffOf = (id: string) => allBuffs().find((b) => b.id === id)
/** Buff đã đổi tên theo ngôn ngữ ngay trong allBuffs (applyLocale), nên vi/en dùng chung */
const buffDefs = (): KeywordDef[] => allBuffs().filter((b) => BUFF_ICON[b.id]).map((b) => {
    const x = {
        name: b.name, desc: b.desc, terms: [b.name]
    }
    return {
        id: `buff:${b.id}`, icon: BUFF_ICON[b.id], vi: x, en: x, buff: b.id
    }
})
const defs = () => [...DEFS,
    ...buffDefs()]

const view = (d: KeywordDef): Keyword => {
    const b = d.buff ? buffOf(d.buff) : undefined
    const x = b ? {
        name: b.name, desc: b.desc
    } : getLang() === "en" ? d.en : d.vi
    return {
        id: d.id, icon: d.icon, name: x.name, desc: x.desc, good: !BAD.has(d.id)
    }
}
export const keywordById = (id: string) => { const d = defs().find((k) => k.id === id); return d && view(d) }

let cache: { lang: string; re: RegExp; byTerm: Map<string, KeywordDef>; exact: Map<string, string> } | undefined
function matcher() {
    const lang = getLang()
    if (cache?.lang === lang) return cache
    // exact: tên hiệu ứng có tên (vd. "Chí Mạng") chỉ khớp đúng chữ hoa, để "chí mạng" thường không bị tô
    const byTerm = new Map<string, KeywordDef>(), exact = new Map<string, string>()
    for (const d of defs()) {
        const terms = d.buff ? [buffOf(d.buff)!.name] : (lang === "en" ? d.en : d.vi).terms
        for (const term of terms) { byTerm.set(term.toLowerCase(),
            d); if (d.buff) exact.set(term.toLowerCase(),
            term) }
    }
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g,
        "\\$&")
    // dài trước để "Thiêu Đốt" thắng "Đốt"; chặn hai bên là chữ cái (\b không hiểu tiếng Việt)
    const alts = [...byTerm.keys()].sort((a, b) => b.length - a.length).map(esc).join("|")
    cache = {
        lang, re: new RegExp(`(?<![\\p{L}\\p{M}])(${alts})(?![\\p{L}\\p{M}])`,
            "giu"), byTerm, exact
    }
    return cache
}

/** Con số trong mô tả, kèm đơn vị ngay sau: "180", "60% sát thương", "50 + 40% AP", "3 vòng", "+25% AD" */
const UNIT = "sát thương phép|sát thương chuẩn|sát thương|magic damage|true damage|damage|máu tối đa|max HP|máu|HP|AD|AP|Mana|Nộ|Rage|vàng|gold|vòng|rounds?|lượt|turns?|lá|cards?|ô|tiles?|Giáp|Armor|Kháng phép|MR|Tốc đánh|Attack speed"
const NUM = new RegExp(`(?<![\\p{L}\\d])[+−-]?\\d+(?:[.,]\\d+)?%?(?:\\s*\\+\\s*\\d+(?:[.,]\\d+)?%?\\s*(?:AD|AP|máu tối đa|max HP|máu|HP))*(?:\\s+(?:${UNIT})(?![\\p{L}]))?`,
    "gu")

export type KeywordPart = string | { text: string; kw: Keyword } | { text: string; num: true };
/** Tách đoạn chữ thường thành chữ và con số */
function numberParts(text: string): KeywordPart[] {
    const out: KeywordPart[] = []
    let last = 0
    for (const m of text.matchAll(NUM)) {
    // số trơ không đơn vị ("Chọn 1 tướng") để nguyên
        if (m.index === undefined || /^\d+$/.test(m[0])) continue
        if (m.index > last) out.push(text.slice(last,
            m.index))
        out.push({
            text: m[0], num: true
        })
        last = m.index + m[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
}
/** Tách câu thành: chữ thường, từ khóa hiệu ứng (đậm + icon), con số (đậm vàng) */
export function keywordParts(text: string): KeywordPart[] {
    const { re, byTerm, exact } = matcher()
    const out: KeywordPart[] = []
    let last = 0
    for (const m of text.matchAll(re)) {
        const key = m[0].toLowerCase(), d = byTerm.get(key)
        if (!d || m.index === undefined || (exact.has(key) && exact.get(key) !== m[0])) continue
        if (m.index > last) out.push(...numberParts(text.slice(last,
            m.index)))
        out.push({
            text: m[0], kw: view(d)
        })
        last = m.index + m[0].length
    }
    if (last < text.length) out.push(...numberParts(text.slice(last)))
    return out
}
/** Các từ khóa xuất hiện trong những câu này, mỗi cái một lần, theo thứ tự gặp */
export function keywordsIn(texts: (string | undefined)[]): Keyword[] {
    const seen = new Map<string, Keyword>()
    for (const t of texts) if (t) for (const part of keywordParts(t)) if (typeof part !== "string" && "kw" in part) seen.set(part.kw.id,
        part.kw)
    return [...seen.values()]
}
/** Icon mọi từ khóa (gọi khi đã nạp đủ buff) */
export const keywordIcons = () => defs().map((d) => ({
    id: d.id, icon: d.icon
}))
