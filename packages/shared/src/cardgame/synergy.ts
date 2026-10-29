// Bản đồ đội hình cho cấm/chọn: động cơ (engine) của từng tướng, tướng combo cùng đội, tướng khắc chế.
// "counters" (tướng này khắc ai) suy ra tự động từ "counteredBy" để hai chiều luôn khớp. Selfplay --pairs đo tỉ lệ thắng các cặp này.

export type Engine = "draw" | "grave" | "items" | "tokens" | "chain" | "marks" | "lanes" | "mill" | "hand" | "recycle" | "prizes" | "scaling";
export const ENGINE_NAME: Record<Engine, { vi: string; en: string }> = {
    draw: {
        vi: "Rút bài", en: "Card draw"
    },
    grave: {
        vi: "Mộ bài", en: "Graveyard"
    },
    items: {
        vi: "Đồ / rèn đồ", en: "Items / forging"
    },
    tokens: {
        vi: "Ô triệu hồi phụ", en: "Extra zone tokens"
    },
    chain: {
        vi: "Chuỗi Quick", en: "Quick chain"
    },
    marks: {
        vi: "Dấu / kích nổ", en: "Marks / detonation"
    },
    lanes: {
        vi: "Vị trí đường", en: "Lane positioning"
    },
    mill: {
        vi: "Ép cạn bài", en: "Deck pressure"
    },
    hand: {
        vi: "Phá tay đối thủ", en: "Hand disruption"
    },
    recycle: {
        vi: "Tái chế bài", en: "Recycling"
    },
    prizes: {
        vi: "Lá thưởng / mạng", en: "Prizes / lives"
    },
    scaling: {
        vi: "Lớn dần", en: "Scaling"
    },
}

export interface HeroSynergy { engines: Engine[]; combos: string[]; counteredBy: string[] }

export const SYNERGY: Record<string, HeroSynergy> = {
    darius: {
        engines: ["marks",
            "lanes"], combos: ["blitzcrank",
            "leona",
            "nami"], counteredBy: ["soraka",
            "braum"]
    },
    nami: {
        engines: ["draw"], combos: ["viktor",
            "zed",
            "jinx"], counteredBy: ["teemo",
            "renata"]
    },
    braum: {
        engines: ["chain"], combos: ["kogmaw",
            "viktor",
            "jinx"], counteredBy: ["twistedfate",
            "malphite"]
    },
    blitzcrank: {
        engines: ["hand",
            "lanes"], combos: ["darius",
            "teemo",
            "renata"], counteredBy: ["nami",
            "soraka"]
    },
    zed: {
        engines: ["grave"], combos: ["nami",
            "blitzcrank"], counteredBy: ["braum",
            "lissandra"]
    },
    viktor: {
        engines: ["grave",
            "draw"], combos: ["nami",
            "twistedfate",
            "braum"], counteredBy: ["zed",
            "blitzcrank"]
    },
    twistedfate: {
        engines: ["draw",
            "hand"], combos: ["darius",
            "zed",
            "viktor"], counteredBy: ["blitzcrank",
            "qiyana"]
    },
    soraka: {
        engines: ["recycle"], combos: ["kogmaw",
            "nami",
            "garen"], counteredBy: ["zed",
            "katarina"]
    },
    teemo: {
        engines: ["mill"], combos: ["ashe",
            "blitzcrank",
            "qiyana"], counteredBy: ["twistedfate",
            "soraka"]
    },
    kogmaw: {
        engines: ["scaling"], combos: ["braum",
            "soraka",
            "nami"], counteredBy: ["teemo",
            "darius",
            "ashe"]
    },
    aatrox: {
        engines: ["prizes",
            "scaling"], combos: ["soraka",
            "janna",
            "leona"], counteredBy: ["lissandra",
            "vayne"]
    },
    garen: {
        engines: ["items"], combos: ["ornn",
            "janna",
            "soraka"], counteredBy: ["kogmaw",
            "vayne",
            "aatrox"]
    },
    yorick: {
        engines: ["grave",
            "tokens"], combos: ["zed",
            "viktor"], counteredBy: ["lux",
            "gangplank",
            "brand"]
    },
    gangplank: {
        engines: ["items",
            "tokens",
            "prizes"], combos: ["ornn",
            "twistedfate"], counteredBy: ["vayne",
            "katarina"]
    },
    leona: {
        engines: ["marks",
            "lanes"], combos: ["darius",
            "jinx",
            "aatrox"], counteredBy: ["malphite",
            "kogmaw"]
    },
    malphite: {
        engines: ["items"], combos: ["ornn",
            "leona"], counteredBy: ["kogmaw",
            "vayne",
            "jinx"]
    },
    ornn: {
        engines: ["items"], combos: ["gangplank",
            "garen",
            "jinx",
            "malphite"], counteredBy: ["blitzcrank",
            "renata"]
    },
    katarina: {
        engines: ["grave",
            "lanes"], combos: ["leona",
            "lux"], counteredBy: ["garen",
            "lissandra",
            "ornn"]
    },
    khazix: {
        engines: ["lanes",
            "prizes"], combos: ["brand",
            "blitzcrank"], counteredBy: ["garen",
            "leona",
            "annie"]
    },
    qiyana: {
        engines: ["grave",
            "mill"], combos: ["teemo",
            "malphite"], counteredBy: ["lux",
            "braum"]
    },
    ahri: {
        engines: ["lanes"], combos: ["lux",
            "leona"], counteredBy: ["yorick",
            "braum"]
    },
    annie: {
        engines: ["tokens",
            "grave"], combos: ["braum",
            "janna"], counteredBy: ["gangplank",
            "katarina",
            "viktor"]
    },
    lissandra: {
        engines: ["chain",
            "prizes"], combos: ["ashe",
            "brand"], counteredBy: ["malphite",
            "twistedfate"]
    },
    lux: {
        engines: ["marks"], combos: ["leona",
            "ahri",
            "nami"], counteredBy: ["katarina",
            "khazix"]
    },
    ashe: {
        engines: ["mill",
            "marks"], combos: ["teemo",
            "lissandra"], counteredBy: ["zed",
            "khazix"]
    },
    jinx: {
        engines: ["items",
            "draw"], combos: ["ornn",
            "nami",
            "leona"], counteredBy: ["zed",
            "janna"]
    },
    vayne: {
        engines: ["marks",
            "lanes"], combos: ["janna",
            "ornn"], counteredBy: ["ahri",
            "khazix"]
    },
    janna: {
        engines: ["marks"], combos: ["jinx",
            "vayne",
            "kogmaw"], counteredBy: ["malphite",
            "blitzcrank"]
    },
    brand: {
        engines: ["marks"], combos: ["khazix",
            "lissandra",
            "lux"], counteredBy: ["soraka",
            "janna"]
    },
    renata: {
        engines: ["hand",
            "chain"], combos: ["blitzcrank",
            "lux"], counteredBy: ["twistedfate",
            "malphite"]
    },
}

/** Tướng mà `hero` khắc chế (suy ra từ counteredBy của các tướng khác) */
export const countersOf = (hero: string) => Object.entries(SYNERGY).filter(([, s]) => s.counteredBy.includes(hero)).map(([id]) => id)
/** Các cặp combo không trùng (a < b) */
export const comboPairs = () => {
    const out = new Set<string>()
    for (const [a,
        s] of Object.entries(SYNERGY)) for (const b of s.combos) out.add([a,
        b].sort().join("+"))
    return [...out].map((k) => k.split("+") as [string, string])
}
/** Các cặp khắc chế [kẻ khắc, kẻ bị khắc] */
export const counterPairs = () => Object.entries(SYNERGY).flatMap(([victim,
    s]) => s.counteredBy.map((c) => [c,
        victim] as [string, string]))

/** Tướng dùng Ô triệu hồi phụ (mỗi phe chỉ 1 ô: hai tướng này cùng đội sẽ tranh ô; bot/selfplay tránh chọn chung) */
export const EXTRA_ZONE_HEROES = ["annie",
    "gangplank",
    "yorick"]
/** Đội có quá 1 tướng dùng ô phụ không */
export const clashesExtraZone = (team: string[]) => team.filter((h) => EXTRA_ZONE_HEROES.includes(h)).length > 1
