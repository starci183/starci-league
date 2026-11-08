// Bản đồ vũ khí/chiêu thức -> hiệu ứng canvas cho chế độ thẻ bài (33 tướng).
import type {
    SkillVfx
} from "./types"
import {
    cg
} from "@starci/shared"

export type SkillKey = "q" | "e" | "r" | "p"

/** Đường dẫn icon chiêu để dispatcher truyền vào ctx.icon */
export const skillIcon = (hero: string, key: SkillKey): string => `/card_skills/${hero}_${key}.png`

export const DEFAULT_VFX: SkillVfx = {
    travel: "bolt",
    impact: "burst",
    color: 0xffffff,
    color2: 0x9ad0ff
}

const fx = (
    travel: string,
    impact: string,
    color: number,
    color2: number,
    cast?: string,
    intensity?: number
): SkillVfx => ({
    travel,
    impact,
    color,
    color2,
    cast,
    intensity
})

/** Chiêu cuối: cường độ 2 */
const ult = (
    travel: string,
    impact: string,
    color: number,
    color2: number,
    cast?: string
): SkillVfx => fx(travel,
    impact,
    color,
    color2,
    cast,
    2)

/** Nội tại: hiệu ứng tại chỗ nhẹ */
const passive = (
    impact: string,
    color: number,
    color2: number
): SkillVfx => fx("none",
    impact,
    color,
    color2)

type HeroVfx = Record<SkillKey, SkillVfx>

const HEROES: Record<string, HeroVfx> = {
    darius: {
        q: fx("slash",
            "slashHit",
            0xc0262d,
            0xffd0c0),
        e: fx("chain",
            "grievousHit",
            0x9a1c22,
            0xe0e0e0),
        r: ult("dash",
            "crit",
            0xff2a2a,
            0xffffff,
            "charge"),
        p: passive("grievousHit",
            0xc0262d,
            0x601015)
    },
    nami: {
        q: fx("none",
            "frostNova",
            0x3fb8ff,
            0x9ef0ff,
            "charge"),
        e: fx("bolt",
            "heal",
            0x40d0ff,
            0xb8fff4),
        r: ult("none",
            "storm",
            0x1e90ff,
            0x9ef0ff,
            "charge"),
        p: passive("buff",
            0x40d0ff,
            0xb8fff4)
    },
    braum: {
        q: fx("none",
            "shield",
            0x9fd8ff,
            0xffffff),
        e: fx("none",
            "shield",
            0x6bb6ff,
            0xffffff),
        r: ult("none",
            "frostNova",
            0xbfe8ff,
            0x4aa8ff,
            "groundSlam"),
        p: passive("frostBurst",
            0xbfe8ff,
            0x4aa8ff)
    },
    blitzcrank: {
        q: fx("chain",
            "stunHit",
            0xe8a020,
            0xfff2a0),
        e: fx("dash",
            "stunHit",
            0xd0d0d0,
            0xffe070),
        r: ult("none",
            "nova",
            0x4fc3ff,
            0xfff2a0,
            "charge"),
        p: passive("buff",
            0xe8a020,
            0x4fc3ff)
    },
    zed: {
        q: fx("slash",
            "shadowStrike",
            0x5a2a8a,
            0xd0d0ff),
        e: fx("dash",
            "shadowStrike",
            0x2a1a4a,
            0x8a5ad0,
            "shadowStrike"),
        r: ult("dash",
            "shadowStrike",
            0x7a1a3a,
            0xff3a5a,
            "shadowStrike"),
        p: passive("shadowStrike",
            0x2a1a4a,
            0x8a5ad0)
    },
    viktor: {
        q: fx("beam",
            "drain",
            0xb04aff,
            0x4af0ff),
        e: fx("beam",
            "lightningHit",
            0xc060ff,
            0x60f0ff),
        r: ult("fireball",
            "storm",
            0x9a30ff,
            0x40e0ff,
            "charge"),
        p: passive("buff",
            0xb04aff,
            0x4af0ff)
    },
    twistedfate: {
        q: fx("slash",
            "magicHit",
            0xffd23a,
            0x3a8aff),
        e: fx("none",
            "buff",
            0xffd23a,
            0xff4a4a,
            "charge"),
        r: ult("none",
            "nova",
            0xffd23a,
            0x9a4aff,
            "charge"),
        p: passive("buff",
            0xffd23a,
            0x3a8aff)
    },
    soraka: {
        q: fx("none",
            "heal",
            0xfff2a0,
            0xb0d0ff,
            "buff"),
        e: fx("bolt",
            "heal",
            0xff8ac0,
            0xfff2a0),
        r: ult("none",
            "heal",
            0xfff6b0,
            0xb0e0ff,
            "heal"),
        p: passive("heal",
            0xfff2a0,
            0xb0d0ff)
    },
    teemo: {
        q: fx("none",
            "summonToken",
            0x7ad03a,
            0xc8ff70),
        e: fx("arrow",
            "magicHit",
            0x5ac030,
            0xd8ff80),
        r: ult("none",
            "summonToken",
            0x4ab020,
            0xb0ff50,
            "charge"),
        p: passive("buff",
            0x7ad03a,
            0xc8ff70)
    },
    kogmaw: {
        q: fx("fireball",
            "magicHit",
            0x7ae030,
            0xd8ff60),
        e: fx("none",
            "buff",
            0xb060ff,
            0x60ff90),
        r: ult("fireball",
            "explosion",
            0x70e040,
            0xffe060,
            "charge"),
        p: passive("buff",
            0x7ae030,
            0xd8ff60)
    },
    aatrox: {
        q: fx("slash",
            "slashHit",
            0xc01030,
            0xff7060),
        e: fx("chain",
            "drain",
            0xb01030,
            0xff90a0),
        r: ult("none",
            "storm",
            0xd01030,
            0x300008,
            "charge"),
        p: passive("grievousHit",
            0xc01030,
            0xff7060)
    },
    garen: {
        q: fx("slash",
            "silenceHit",
            0xffd860,
            0xffffff),
        e: fx("slash",
            "slashHit",
            0xe8e8f0,
            0xffd860,
            "charge"),
        r: ult("beam",
            "meteor",
            0xffe070,
            0xffffff,
            "charge"),
        p: passive("heal",
            0x60e090,
            0xffd860)
    },
    yorick: {
        q: fx("slash",
            "physicalHit",
            0x60e0a0,
            0xd0ffe8),
        e: fx("bolt",
            "drain",
            0x40d090,
            0xb0ffd8),
        r: ult("none",
            "summonToken",
            0x30e0a0,
            0xc0fff0,
            "charge"),
        p: passive("summonToken",
            0x40d090,
            0xb0ffd8)
    },
    gangplank: {
        q: fx("bolt",
            "physicalHit",
            0xffb030,
            0xfff0b0),
        e: fx("none",
            "explosion",
            0xff7a20,
            0xffd060),
        r: ult("none",
            "meteor",
            0xff6a10,
            0xffe070,
            "charge"),
        p: passive("buff",
            0xffb030,
            0xfff0b0)
    },
    leona: {
        q: fx("dash",
            "stunHit",
            0xffd040,
            0xfff6c0),
        e: fx("beam",
            "magicHit",
            0xffc830,
            0xffffff),
        r: ult("beam",
            "nova",
            0xffb820,
            0xfff6c0,
            "charge"),
        p: passive("buff",
            0xffd040,
            0xfff6c0)
    },
    malphite: {
        q: fx("fireball",
            "physicalHit",
            0x9a8a78,
            0xe0d0b8),
        e: fx("none",
            "shield",
            0x8a7a68,
            0xd0c0a8),
        r: ult("dash",
            "groundSlam",
            0xa09080,
            0xffc060,
            "charge"),
        p: passive("shield",
            0x8a7a68,
            0xd0c0a8)
    },
    ornn: {
        q: {
            ...fx("ornnRupture",
                "ornnMagmaPillar",
                0xff5a10,
                0xffc040,
                "ornnRuptureSlam"), extra: "ornnForgedCard"
        },
        e: {
            ...fx("ornnRefine",
                "ornnMasterwork",
                0xffa52a,
                0xfff0b8,
                "ornnForgeFlare"), shield: "ornnMoltenShield", block: "ornnShieldBlock"
        },
        r: {
            ...ult("ornnGodHammer",
                "ornnForgeBurst",
                0xff5a10,
                0xfff0b8,
                "ornnForgeFlare"), extra: "ornnForgedCard"
        },
        p: passive("ornnForgeGlint",
            0xff9a40,
            0xffe0a0)
    },
    katarina: {
        q: fx("slash",
            "slashHit",
            0xe03050,
            0xe8e8f0),
        e: fx("dash",
            "slashHit",
            0xc02040,
            0xffffff),
        r: ult("slash",
            "storm",
            0xff2a50,
            0xe8e8f0,
            "charge"),
        p: passive("slashHit",
            0xe03050,
            0xe8e8f0)
    },
    khazix: {
        q: fx("slash",
            "grievousHit",
            0xa040e0,
            0xe0b0ff),
        e: fx("dash",
            "slashHit",
            0x8a30c0,
            0xd090ff),
        r: ult("dash",
            "shadowStrike",
            0x9a30e0,
            0xff60c0,
            "shadowStrike"),
        p: passive("grievousHit",
            0xa040e0,
            0xe0b0ff)
    },
    qiyana: {
        q: fx("slash",
            "magicHit",
            0xe0a040,
            0x40c0ff),
        e: fx("dash",
            "groundSlam",
            0xc09060,
            0x60e060),
        r: ult("fireball",
            "frostNova",
            0x40d0ff,
            0xe0a040,
            "charge"),
        p: passive("buff",
            0xe0a040,
            0x40c0ff)
    },
    ahri: {
        q: fx("fireball",
            "magicHit",
            0xff7ac0,
            0xffd0f0),
        e: fx("bolt",
            "tauntHit",
            0xff90c8,
            0xffffff),
        r: ult("dash",
            "magicHit",
            0xff5aa8,
            0x80d0ff,
            "charge"),
        p: passive("heal",
            0xff7ac0,
            0xffd0f0)
    },
    annie: {
        q: fx("fireball",
            "fireHit",
            0xff5a20,
            0xffc060),
        e: fx("none",
            "summonToken",
            0xff4a30,
            0xffa040,
            "charge"),
        r: ult("none",
            "explosion",
            0xff3a10,
            0xffd060,
            "charge"),
        p: passive("fireHit",
            0xff5a20,
            0xffc060)
    },
    lissandra: {
        q: fx("iceShard",
            "frostBurst",
            0x80d8ff,
            0xffffff),
        e: fx("iceShard",
            "frostBurst",
            0x60c0ff,
            0xe0f8ff),
        r: ult("none",
            "frostNova",
            0xa0e8ff,
            0x3a8aff,
            "charge"),
        p: passive("frostBurst",
            0x80d8ff,
            0xffffff)
    },
    lux: {
        q: fx("beam",
            "stunHit",
            0xfff0a0,
            0xffffff),
        e: fx("fireball",
            "burst",
            0xffe880,
            0xa0e0ff),
        r: ult("beam",
            "nova",
            0xfff6c0,
            0xffffff,
            "charge"),
        p: passive("buff",
            0xfff0a0,
            0xffffff)
    },
    ashe: {
        q: fx("arrow",
            "frostBurst",
            0x90e0ff,
            0xffffff),
        e: fx("arrow",
            "magicHit",
            0x7ad0ff,
            0xffffff),
        r: ult("arrow",
            "frostNova",
            0x60c8ff,
            0xffffff,
            "charge"),
        p: passive("frostBurst",
            0x90e0ff,
            0xffffff)
    },
    jinx: {
        q: fx("bolt",
            "physicalHit",
            0xff4aa0,
            0x40c8ff),
        e: fx("none",
            "buff",
            0xff4aa0,
            0xffe040),
        r: ult("fireball",
            "explosion",
            0xff3a8a,
            0x40d0ff,
            "charge"),
        p: passive("buff",
            0xff4aa0,
            0x40c8ff)
    },
    vayne: {
        q: {
            ...fx("none",
                "vayneTumbleLand",
                0x4f7dff,
                0xdfe6ff,
                "vayneTumble"),
            extra: "vayneWhiff"
        },
        e: fx("vayneCondemnBolt",
            "vayneCondemnHit",
            0xffcf6e,
            0xffffff,
            "vayneCondemnCast"),
        r: {
            ...ult("vayneHourBolt",
                "vayneHourHit",
                0x7c4dff,
                0xff2b4e,
                "vayneFinalHourCast"),
            extra: "vayneFinalHourAura"
        },
        p: {
            ...passive("vayneSilverBurst",
                0xffffff,
                0xdfe6ff),
            cast: "vayneNightGain",
            extra: "vayneNightShed"
        }
    },
    janna: {
        q: fx("bolt",
            "stunHit",
            0xb0f0ff,
            0xffffff),
        e: fx("bolt",
            "shield",
            0xa0e8ff,
            0xffffff),
        r: ult("none",
            "heal",
            0xc0f8ff,
            0xffffff,
            "charge"),
        p: passive("buff",
            0xb0f0ff,
            0xffffff)
    },
    brand: {
        q: fx("fireball",
            "fireHit",
            0xff6a20,
            0xffd060),
        e: fx("none",
            "explosion",
            0xff5a10,
            0xffe070),
        r: ult("fireball",
            "storm",
            0xff4a00,
            0xffe060,
            "charge"),
        p: passive("fireHit",
            0xff6a20,
            0xffd060)
    },
    renata: {
        q: fx("chain",
            "tauntHit",
            0xb050e0,
            0x70e060),
        e: fx("bolt",
            "shield",
            0x80e070,
            0xc080ff),
        r: ult("none",
            "tauntHit",
            0xa040d0,
            0x70e060,
            "charge"),
        p: passive("buff",
            0xb050e0,
            0x70e060)
    },
    tristana: {
        q: {
            ...passive("tristanaRapidFire",
                0xff7a20,
                0xffd060), extra: "tristanaRapidAura"
        },
        e: fx("tristanaBombThrow",
            "tristanaBombAdd",
            0xff7a20,
            0xffe070),
        r: {
            ...ult("tristanaBusterShot",
                "tristanaBusterHit",
                0xff5a10,
                0xffe070,
                "tristanaCannonCharge"), extra: "tristanaBlastSpread"
        },
        // cast: dấu Bom; impact: Bom nổ; travel: ngòi kích nổ không tốn lá; extra: tự nổ khi đủ hạ
        p: {
            ...fx("tristanaFuse",
                "tristanaBombBlast",
                0xff7a20,
                0xffd060,
                "tristanaBombMark"), extra: "tristanaBombFuseUp"
        }
    },
    missfortune: {
        q: fx("bolt",
            "fireHit",
            0xff4060,
            0xffd0a0),
        e: fx("none",
            "storm",
            0xff5080,
            0xffe0c0),
        r: ult("none",
            "storm",
            0xff3060,
            0xffd060,
            "charge"),
        p: passive("buff",
            0xff4060,
            0xffd0a0)
    },
    velkoz: {
        q: fx("bolt",
            "explosion",
            0xb060ff,
            0x60e0ff),
        e: fx("none",
            "explosion",
            0x9040ff,
            0xe0a0ff),
        r: ult("bolt",
            "storm",
            0xa050ff,
            0x70f0ff,
            "charge"),
        p: passive("buff",
            0xb060ff,
            0x60e0ff)
    }
}

// Dùng lại từ vựng nguyên tố/vũ khí, vẫn giữ sắc thái và hệ số riêng từng tướng.
Object.assign(HEROES.blitzcrank,
    {
        q: fx("blitzRocketFist",
            "blitzFistHit",
            0xf0b83a,
            0x6fdcff,
            "blitzSteamVent"),
        e: {
            ...fx("blitzRocketFist",
                "blitzSpellFizzle",
                0xf0b83a,
                0x6fdcff,
                "blitzSteamVent"), extra: "blitzStunSpark"
        },
        r: {
            ...ult("none",
                "blitzStaticHit",
                0x56cfff,
                0xfff2a0,
                "blitzStaticCharge"), extra: "blitzStaticField"
        },
        p: {
            ...passive("blitzScrapBolt",
                0xf0b83a,
                0x6fdcff), extra: "blitzScrapShed"
        }
    })
Object.assign(HEROES.annie,
    {
        q: {
            ...fx("annieFireBolt",
                "annieFireHit",
                0xffa428,
                0xffe9a0,
                "annieQCast"), extra: "annieReturnSpark"
        },
        e: {
            ...fx("annieFireLash",
                "annieLashHit",
                0xff8418,
                0xffe27a,
                "annieShieldForm"), shield: "annieShieldLock", block: "annieShieldBlock"
        },
        r: {
            ...ult("none",
                "annieInfernoHit",
                0xff8418,
                0xffc23a,
                "annieTibbersCrash"), extra: "annieTibbersAura"
        },
        p: {
            ...passive("annieFireGain",
                0xffa428,
                0xffe9a0), cast: "annieFireMotes"
        }
    })
Object.assign(HEROES.gangplank,
    {
        r: ult("none",
            "buff",
            0xe5bd72,
            0xffefb5,
            "spellCast")
    })
Object.assign(HEROES.garen,
    {
        q: {
            ...fx("garenDecisiveStrike",
                "garenDecisiveHit",
                0xffd23a,
                0xfff3b8,
                "garenDecisiveCharge"), extra: "garenSilence"
        },
        e: {
            ...fx("garenJudgmentSweep",
                "garenJudgmentHit",
                0xffd23a,
                0xfff3b8,
                "garenJudgmentSpin"), extra: "garenJudgmentShield"
        },
        r: ult("garenJusticeSword",
            "garenJusticeHit",
            0xffd23a,
            0xffffff,
            "garenJusticeCall"),
        p: {
            ...passive("garenPerseverance",
                0x35e6b4,
                0xa6ff5a), extra: "garenArmorShed"
        }
    })
Object.assign(HEROES.leona,
    {
        q: {
            ...fx("leonaShieldBash",
                "leonaShieldHit",
                0xffc83a,
                0xfff3b8,
                "leonaShieldFlare"), extra: "leonaStun"
        },
        e: {
            ...fx("leonaSunBlade",
                "leonaEclipseHit",
                0xffc83a,
                0xfff3b8,
                "leonaEclipseGuard"), extra: "leonaStun"
        },
        r: {
            ...ult("leonaSolarFlare",
                "leonaFlareHit",
                0xffc83a,
                0xfff3b8,
                "leonaSolarCall"), extra: "leonaStun"
        },
        p: passive("leonaSunPlate",
            0xffc83a,
            0xfff3b8)
    })
Object.assign(HEROES.renata,
    {
        q: fx("renataOrder",
            "renataSacrifice",
            0xb44bff,
            0xa6ff2e),
        e: {
            ...fx("renataVolley",
                "renataVolleyHit",
                0xb44bff,
                0xa6ff2e), shield: "renataShield"
        },
        r: ult("none",
            "renataBerserkMark",
            0xb44bff,
            0xa6ff2e,
            "renataBerserkWave"),
        p: fx("none",
            "renataRevive",
            0xb44bff,
            0xa6ff2e,
            "renataFundLink")
    })
Object.assign(HEROES.lux,
    {
        q: {
            ...fx("luxShard",
                "luxShardHit",
                0xffdc6e,
                0xffffff,
                "luxLightGain"), shield: "luxPrism", block: "luxPrismBlock", extra: "luxPrismFlare"
        },
        e: {
            ...fx("luxBinding",
                "luxBindingHit",
                0xffdc6e,
                0xffffff,
                "luxLightGain"), extra: "luxBindingStun"
        },
        r: ult("luxSpark",
            "luxSparkHit",
            0xfff4c4,
            0xffffff,
            "luxSparkCharge"),
        p: {
            ...fx("none",
                "luxIlluminate",
                0xffdc6e,
                0xffffff,
                "luxLightGain"), extra: "luxLightShed"
        }
    })
Object.assign(HEROES.yorick,
    {
        q: {
            ...fx("yorickLastRites",
                "yorickLastRitesHit",
                0x4dffd2,
                0xd2fff2), extra: "yorickLastRitesHeal"
        },
        e: {
            ...fx("yorickMistLob",
                "yorickMistSplash",
                0x2f86c4,
                0x4dffd2), extra: "yorickShred"
        },
        r: ult("none",
            "yorickMaidenRise",
            0x4dffd2,
            0xd2fff2,
            "yorickEulogyCast"),
        p: passive("yorickSoulGain",
            0x4dffd2,
            0xd2fff2)
    })
/** Phần Yorick không gắn với lá nào: Đốt bài, Hồn Ma, mốc lá R, Ma Sương */
export const YORICK_VFX = {
    /** Lá rời bộ tới ô Mộ; `to[0]` = ô Mộ, chạm là báo */
    mill: "yorickMillCard",
    /** Hồn Ma: gain tại Yorick (ctx.amount = số mới), aura bám qua ctx.tether, shed khi chết */
    gain: "yorickSoulGain",
    aura: "yorickSoulAura",
    shed: "yorickSoulShed",
    /** Mốc bội số Hồn Ma: lá R bay lên tay; `to[0]` = tay, ctx.icon = ảnh lá */
    milestone: "yorickMilestone",
    /** Ma Sương; ctx.amount = bậc Tiến Hoá */
    maidenAura: "yorickMaidenAura",
    claw: "yorickMaidenClaw",
    evolve: "yorickMaidenEvolve",
    fade: "yorickMaidenFade"
}
Object.assign(HEROES.teemo,
    {
        q: fx("teemoTrapToss",
            "teemoTrapHit",
            0x9bea2e,
            0x9a3fd6,
            "teemoTrapCast"),
        e: fx("teemoBlindDart",
            "teemoBlindHit",
            0x9bea2e,
            0x9a3fd6),
        r: ult("none",
            "teemoTrapHit",
            0x9a3fd6,
            0x9bea2e,
            "teemoDetonateCast"),
        p: passive("mushroomPlant",
            0x9bea2e,
            0x9a3fd6)
    })
Object.assign(HEROES.kogmaw,
    {
        q: fx("kogSpit",
            "kogSpitHit",
            0xa8e822,
            0xd6ff3c,
            "kogSpitCast"),
        e: fx("none",
            "kogBarrageAura",
            0xd02ae0,
            0xa8e822,
            "kogBarrageCast"),
        r: ult("kogArtillery",
            "kogArtilleryHit",
            0xa8e822,
            0xf6ffa8,
            "kogArtilleryCast"),
        p: {
            ...passive("kogHungerGain",
                0xff4fd2,
                0xd6ff3c), cast: "kogHungerCharge", extra: "kogHungerBite"
        }
    })
Object.assign(HEROES.janna,
    {
        q: fx("jannaTornado",
            "jannaTornadoHit",
            0xa8e4ff,
            0xe8f3fb),
        e: {
            ...fx("jannaBreeze",
                "jannaEyeShield",
                0xa8e4ff,
                0xe8f3fb), shield: "jannaEyeShield", block: "jannaBlock"
        },
        r: ult("none",
            "jannaMonsoonHit",
            0xa8e4ff,
            0xe8f3fb,
            "jannaMonsoon"),
        p: passive("jannaWindStack",
            0xa8e4ff,
            0xe8f3fb)
    })
Object.assign(HEROES.soraka,
    {
        q: {
            ...fx("sorakaStarfall",
                "sorakaStarImpact",
                0xffd76a,
                0xb48cff), extra: "sorakaHeal"
        },
        e: fx("sorakaLifeThread",
            "sorakaLifeHeal",
            0xffd76a,
            0xb48cff,
            "sorakaQuickGather"),
        r: {
            ...ult("none",
                "sorakaWishHeal",
                0xffd76a,
                0xb48cff,
                "sorakaWish"), extra: "sorakaWishHealBright"
        },
        p: fx("none",
            "sorakaBonusStrike",
            0xffd76a,
            0xb48cff,
            "sorakaMoteGain")
    })
Object.assign(HEROES.nami,
    {
        q: fx("namiTideHop",
            "namiTideHit",
            0x35b8ee,
            0xd8fbff),
        e: fx("namiBlessFlow",
            "namiTideShield",
            0x46d6d0,
            0xdcfff6),
        r: ult("none",
            "namiTsunamiHit",
            0x249cdd,
            0xd8fbff,
            "namiTsunami"),
        p: passive("namiSurgeGain",
            0x35b8ee,
            0xd8fbff)
    })
Object.assign(HEROES.ahri,
    {
        q: {
            ...fx("ahriOrbOut",
                "ahriOrbHit",
                0xff5fb4,
                0xffc2e8), extra: "ahriOrbReturn"
        },
        e: {
            ...fx("ahriFoxLash",
                "ahriFoxHit",
                0xff5fb4,
                0xd8b8ff,
                "ahriDash"), extra: "ahriDashYield"
        },
        r: {
            ...ult("ahriCharmHeart",
                "ahriCharmHit",
                0xff6fc0,
                0xffc2e8,
                "ahriCharmCast"), extra: "ahriCharmAura"
        },
        p: fx("ahriEssenceBolt",
            "ahriEssenceHit",
            0xff5fb4,
            0xb98cff,
            "ahriEssenceGain")
    })
Object.assign(HEROES.aatrox,
    {
        q: fx("aatroxBladeSlam",
            "aatroxBladeHit",
            0xd0142c,
            0xffb43a,
            "aatroxBladeRaise"),
        e: {
            ...fx("aatroxChainThrow",
                "aatroxChainHit",
                0xd0142c,
                0xff4a1e), extra: "aatroxBloodDrain"
        },
        r: {
            ...ult("none",
                "aatroxWorldEnderHit",
                0xd0142c,
                0xff4a1e,
                "aatroxWorldEnderCast"), extra: "aatroxWorldEnderWings"
        },
        p: {
            ...passive("aatroxBloodSurge",
                0xd0142c,
                0xff4a1e), extra: "aatroxBloodDrain"
        }
    })
Object.assign(HEROES.khazix,
    {
        q: fx("khazixQRend",
            "khazixQHit",
            0xff3fb4,
            0xf6e8ff),
        e: {
            ...fx("none",
                "khazixLeapHit",
                0xa64bff,
                0xff3fb4,
                "khazixLeap"), extra: "khazixLeapYield"
        },
        r: {
            ...ult("none",
                "khazixVanish",
                0x7a2be2,
                0xff3fb4,
                "khazixVoidCharge"), extra: "khazixDodge"
        },
        p: {
            ...passive("khazixIsolateLand",
                0xa64bff,
                0xff3fb4), travel: "khazixIsolateRoll", extra: "khazixIsolateRend"
        }
    })
/** Phần nội tại và R của Kha'Zix không gắn với một lá: gieo trượt, lộ diện, cue bám lá, lá Q miễn phí, lá R xáo vào bộ */
export const KHAZIX_VFX = {
    /** Cô Lập trượt; thành công là p.impact, mở màn là p.travel với ctx.amount = % tỉ lệ */
    fail: "khazixIsolateFail",
    /** Địch Tàng Hình bị lộ, đi cùng p.impact */
    reveal: "khazixReveal",
    /** Cô Lập bám lá qua ctx.tether */
    aura: "khazixIsolateAura",
    /** Tàng Hình bám lá qua ctx.tether */
    stealth: "khazixStealthShimmer",
    unveil: "khazixUnveil",
    /** Lá Q bay vào tay; ctx.icon = ảnh lá, chạm báo ctx.onBeat */
    freeCard: "khazixFreeCard",
    /** Lá R xáo vào bộ; ctx.icon = ảnh lá, ctx.amount = số lá trên cùng */
    shuffle: "khazixShuffleIn"
}
Object.assign(HEROES.qiyana,
    {
        q: {
            ...fx("qiyanaBlade",
                "qiyanaWrathHit",
                0xffcf6a,
                0xf0621e,
                "qiyanaDraw"), extra: "qiyanaVeil"
        },
        e: {
            ...fx("qiyanaDanceTrail",
                "qiyanaDanceHit",
                0xffcf6a,
                0xf0621e,
                "qiyanaDanceCast"), extra: "qiyanaVeil"
        },
        r: {
            ...ult("qiyanaSupremeWave",
                "qiyanaSupremeHit",
                0xffcf6a,
                0xf0621e,
                "qiyanaSupremeCast"), extra: "qiyanaVeil"
        },
        p: {
            ...passive("qiyanaAbsorb",
                0xffcf6a,
                0x2fd24a), extra: "qiyanaLaneMark"
        }
    })
Object.assign(HEROES.twistedfate,
    {
        q: fx("tfPickThrow",
            "tfCardHit",
            0xffc23a,
            0x4a3cf0,
            "tfPickCycle"),
        e: fx("none",
            "tfShardHit",
            0xffc23a,
            0x4a3cf0,
            "tfRiffle"),
        r: ult("tfDestinyCard",
            "tfDestinyHit",
            0xff8a1e,
            0xffc23a,
            "tfDestinyCast"),
        p: passive("tfDeckPeek",
            0xffc23a,
            0x4a3cf0)
    })
Object.assign(HEROES,
    {
        sylas: {
            q: fx("sylasLash",
                "sylasLashHit",
                0x6f8cff,
                0xa77bff,
                "sylasChainCharge"),
            e: fx("sylasKingslayer",
                "sylasDrainHit",
                0x8a7cff,
                0xd6dcff,
                "sylasChainCharge"),
            r: ult("sylasHijack",
                "sylasHijackHit",
                0x7a6cff,
                0xe6ecff,
                "sylasChainCharge"),
            p: {
                ...fx("none",
                    "sylasBurst",
                    0x6f8cff,
                    0xe6ecff,
                    "sylasShackleGain"), extra: "sylasHijackFlight"
            }
        },
        mel: {
            q: fx("melVolley",
                "melVolleyHit",
                0xffc94d,
                0xfff1c0,
                "melCharge"),
            e: fx("none",
                "melReflect",
                0xffd266,
                0xffffff,
                "melMirror"),
            r: ult("none",
                "melEclipseHit",
                0xffc94d,
                0xfff1c0,
                "melEclipse"),
            p: {
                ...fx("none",
                    "melExecute",
                    0xffd266,
                    0xffffff,
                    "melGlowMark")
            }
        },
        sona: {
            q: fx("bolt",
                "heal",
                0x6fb6ff,
                0xd6f0ff,
                "charge"),
            e: fx("bolt",
                "heal",
                0x7fe3c8,
                0xe6fff6,
                "charge"),
            r: ult("none",
                "heal",
                0x9a7dff,
                0xe6dcff,
                "charge"),
            p: passive("buff",
                0x7fe3c8,
                0xe6fff6)
        },
        azir: {
            q: fx("azirConquer",
                "azirConquerHit",
                0xe2b45c,
                0xf7e4ac,
                "azirSandRise"),
            // E chỉ cộng stack trên lá đồng minh, không lướt hay dựng lính ở đường.
            e: fx("none",
                "none",
                0xe2b45c,
                0xf7e4ac),
            r: ult("none",
                "azirPhalanxHit",
                0xe2b45c,
                0xf7e4ac,
                "azirPhalanx"),
            p: fx("azirStab",
                "azirStab",
                0xe2b45c,
                0xf7e4ac)
        },
        jayce: {
            q: fx("jayceLeap",
                "jayceSlam",
                0x4fc8ff,
                0xd6f6ff,
                "jayceCharge"),
            e: fx("jayceThunderBlow",
                "jayceThunderHit",
                0x4fc8ff,
                0xffffff,
                "jayceCharge"),
            r: ult("jayceThunderfall",
                "jayceSlam",
                0x4fc8ff,
                0xffffff,
                "jayceCharge"),
            p: fx("none",
                "jayceChargeReady",
                0x4fc8ff,
                0xd6f6ff,
                "jayceTransform")
        }
    })
/** Bản Pháo của Jayce (lá Q, E một loại, dạng ở card.data.form) */
export const JAYCE_CANNON: Record<"q" | "e" | "r", SkillVfx> = {
    q: fx("jayceShockBlast",
        "jayceBlastHit",
        0x4fc8ff,
        0xd6f6ff,
        "jayceCharge"),
    e: fx("none",
        "none",
        0x4fc8ff,
        0xffffff,
        "jayceGate"),
    r: ult("jayceGateShot",
        "jayceBlastHit",
        0x4fc8ff,
        0xffffff,
        "jayceCharge")
}
Object.assign(HEROES.velkoz,
    {
        q: {
            ...fx("velkozPlasmaBolt",
                "velkozPlasmaHit",
                0xff2fa8,
                0xd86bff,
                "velkozEyeCharge"), extra: "velkozFission"
        },
        e: {
            ...fx("velkozRiftTear",
                "velkozRiftHit",
                0xff2fa8,
                0x8b3dff), extra: "velkozRiftPulse"
        },
        r: {
            ...ult("velkozRay",
                "velkozRayHit",
                0xff2fa8,
                0xffd9f4,
                "velkozEyeCharge"), extra: "velkozRayBeam"
        },
        p: {
            ...fx("none",
                "velkozDecayBurst",
                0xff2fa8,
                0xffffff,
                "velkozDecayMark"), extra: "velkozDecayShed"
        }
    })
Object.assign(HEROES.lissandra,
    {
        q: {
            ...fx("lissShardSpear",
                "lissShardHit",
                0x1ab8fd,
                0x55e5fc,
                "lissShardCast"), extra: "lissFrostCreep"
        },
        e: {
            ...fx("lissRingRush",
                "lissRingHit",
                0x1ab8fd,
                0x55e5fc,
                "lissRingCast"), extra: "lissFrostLink"
        },
        r: {
            ...ult("lissTombField",
                "lissTombErupt",
                0x0c65df,
                0x55e5fc,
                "lissTombCast"), extra: "lissTomb", block: "lissTombRepel"
        },
        p: fx("none",
            "lissCardFreeze",
            0x1ab8fd,
            0x55e5fc,
            "lissFrostCreep")
    })
Object.assign(HEROES.viktor,
    {
        q: {
            ...fx("viktorShardBurst",
                "viktorShardHit",
                0x2f9bff,
                0xc8f9ff,
                "viktorCardShatter"), shield: "viktorPlasmaShield", block: "viktorShieldBlock"
        },
        e: fx("viktorDeathRay",
            "viktorRayHit",
            0x41c8ff,
            0xfff0c8,
            "viktorRayCharge"),
        r: {
            ...ult("none",
                "viktorGravityHit",
                0x2f7dff,
                0xc8f9ff,
                "viktorGravityField"), extra: "viktorGravityStun"
        },
        p: fx("none",
            "viktorEvolveGain",
            0x41aef6,
            0xffc860,
            "viktorCardShatter")
    })
Object.assign(HEROES.ashe,
    {
        q: {
            ...fx("asheFlurry",
                "asheFlurryHit",
                0x1e9bff,
                0xbef3ff,
                "asheFocusCast"), extra: "asheFocusAura"
        },
        e: fx("asheVolley",
            "asheVolleyHit",
            0x1e9bff,
            0xbef3ff),
        r: {
            ...ult("asheCrystalArrow",
                "asheCrystalHit",
                0x1e9bff,
                0xf4fdff,
                "asheCrystalDraw"), extra: "asheStunHold"
        },
        p: fx("none",
            "asheFrostShatter",
            0x1e9bff,
            0xbef3ff,
            "asheFrostMark")
    })
/** Băng bám lá theo số Buốt và tuyết rơi khi tướng mang Buốt gục: hai cue của nội tại Ashe, không nằm trong khe chiêu nào */
export const ASHE_FROST_CLING = "asheFrostCling"
export const ASHE_FROST_SHED = "asheFrostShed"
Object.assign(HEROES.brand,
    {
        q: {
            ...fx("brandFireball",
                "brandSear",
                0xff6a20,
                0xffd060,
                "brandIgnite"), extra: "brandStunFlare"
        },
        e: fx("none",
            "brandWashHit",
            0xff681e,
            0xffd375,
            "brandFireWash"),
        r: ult("none",
            "brandStormHit",
            0xff521c,
            0xffdb6b,
            "brandFirestorm"),
        // engine và test vẫn ghim impact "burn" của lá P; aura (cast) và cú cháy đầu lượt (extra) nhận số tầng qua ctx.amount
        p: {
            ...passive("burn",
                0xff681e,
                0xffd375), cast: "brandBurnAura", extra: "brandBurnTick"
        }
    })
Object.assign(HEROES.malphite,
    {
        q: {
            ...fx("malphiteShard",
                "malphiteShardHit",
                0xffb52a,
                0xffe27a,
                "malphiteShardRip"), extra: "malphiteArmorUp"
        },
        e: fx("malphiteVein",
            "malphiteVeinSeat",
            0xffb52a,
            0xffe27a),
        r: {
            ...ult("malphiteCharge",
                "malphiteSlamHit",
                0xffb52a,
                0xffe27a,
                "malphiteChargeUp"), extra: "malphiteSlamWave"
        },
        p: {
            ...passive("malphiteStoneRim",
                0xffb52a,
                0xffe27a), shield: "malphiteStoneRim"
        }
    })
Object.assign(HEROES.katarina,
    {
        q: {
            ...fx("katarinaStrike",
                "katarinaStrikeHit",
                0xdb355b,
                0xf1e9ff,
                "katarinaBlink"), extra: "katarinaDaggerFall"
        },
        e: fx("katarinaShunpoCut",
            "katarinaShunpoHit",
            0xdb1f3c,
            0xf1e9ff,
            "katarinaShunpo"),
        r: ult("katarinaLotus",
            "katarinaLotusHit",
            0xe0123a,
            0xf1e9ff,
            "katarinaLotusSpin"),
        p: {
            ...fx("katarinaPickup",
                "katarinaPickupHit",
                0xdb355b,
                0xf1e9ff,
                "katarinaDaggerFall"), extra: "katarinaDaggerRest"
        }
    })
Object.assign(HEROES.zed,
    {
        q: {
            ...fx("zedShuriken",
                "zedShurikenHit",
                0xff2447,
                0xeef3f8), extra: "zedBladeCharge"
        },
        e: fx("none",
            "zedShadowSlash",
            0xe3123f,
            0xeef3f8,
            "zedShadowStep"),
        r: {
            ...ult("zedDeathDash",
                "zedDeathMarkHit",
                0xe3123f,
                0xeef3f8,
                "zedDeathVanish"), extra: "zedDeathMarkCue"
        },
        p: {
            ...passive("zedChainSurge",
                0xe3123f,
                0xeef3f8), cast: "zedShadowAura", extra: "zedEdgeCut"
        }
    })
/** Zed: Dấu Ấn nổ cuối lượt, Liên Hoàn tan, lá R biến mất */
export const ZED_VFX = {
    burst: "zedDeathMarkBurst", chainFade: "zedChainFade", cardVanish: "zedCardVanish"
}
Object.assign(HEROES.gangplank,
    {
        q: fx("gunshot",
            "bulletHit",
            0xffb030,
            0xfff0b0)
    })
Object.assign(HEROES.jinx,
    {
        q: {
            ...fx("jinxRocketShot",
                "jinxRocketHit",
                0xff2f8e,
                0xffb43a), extra: "jinxSwapMinigun"
        },
        e: {
            ...fx("jinxChomperToss",
                "jinxChomperHit",
                0xff7a1a,
                0xffd24a), extra: "jinxBlindCloud"
        },
        r: ult("jinxMegaRocket",
            "jinxMegaRocketHit",
            0xff2a6e,
            0xffc040,
            "jinxMegaRocketCharge"),
        p: {
            ...fx("none",
                "jinxFrenzyHit",
                0xff3fa0,
                0x3fd0ff,
                "jinxFrenzyGain"), extra: "jinxFrenzyAura"
        }
    })
Object.assign(HEROES.missfortune,
    {
        q: {
            ...fx("mfRicochetShot",
                "mfRicochetHit",
                0xffa726,
                0xfff0b8,
                "mfRicochetCast"), extra: "mfRicochetFork"
        },
        e: {
            ...fx("mfBulletRain",
                "mfRainHit",
                0xff4a1c,
                0xffc94a,
                "mfRainCast"), extra: "mfRainScorch"
        },
        r: ult("mfBulletVolley",
            "mfBulletTimeHit",
            0xff2f1a,
            0xffcf4a,
            "mfBulletTimeCast"),
        p: fx("mfBounceShot",
            "mfBounceHit",
            0xff4f7a,
            0xffd36a)
    })
Object.assign(HEROES.darius,
    {
        q: {
            ...fx("dariusDecimate",
                "dariusCleaveHit",
                0xd80f26,
                0xffd0c0,
                "dariusAxeRaise"), extra: "dariusBloodDrain"
        },
        e: fx("dariusApprehend",
            "dariusApprehendHit",
            0xd80f26,
            0xffd0c0,
            "dariusAxeRaise"),
        r: {
            ...ult("dariusGuillotine",
                "dariusGuillotineHit",
                0xff2a36,
                0xffffff,
                "dariusGuillotineLeap"), extra: "dariusRecall"
        },
        p: {
            ...passive("dariusBleedMark",
                0xd80f26,
                0x6c0410), cast: "dariusBleedAura", extra: "dariusBleedTick"
        }
    })
Object.assign(HEROES.braum,
    {
        q: {
            ...fx("braumIceBlock",
                "braumBiteHit",
                0x4fd4ff,
                0xeefcff,
                "braumShieldLift"), extra: "braumFrostMark"
        },
        e: {
            ...fx("braumInterpose",
                "braumDoorBlock",
                0x4fd4ff,
                0xeefcff,
                "braumQuick"), shield: "braumDoorShield", extra: "braumStatusBreak"
        },
        r: {
            ...ult("none",
                "braumFissureHit",
                0xbff0ff,
                0x1e7fe0,
                "braumFissure"), extra: "braumFissureCrush"
        },
        p: {
            ...passive("braumStackGain",
                0x4fd4ff,
                0xeefcff), extra: "braumStackShed"
        }
    })

/** Jinx: súng đang cầm, nổ lan đường kề, Phấn Khích khi hạ gục, mất nửa Điên khi gục không nằm trong ô cast/travel/impact của lá nào nên đứng riêng; trận thật và Chuỗi gọi cùng các tên này */
export const JINX_VFX = {
    stance: "jinxGunStance", spin: "jinxMinigunSpin", splash: "jinxRocketSplash", kill: "jinxExcited", shed: "jinxFrenzyShed"
}

/** Luật chết của Brand: người mang Bỏng gục, nửa số tầng tản đi; ctx.amount là số tầng mất. Không gắn với lá bài nào nên đứng riêng */
export const BRAND_BURN_SHED = "brandBurnShed"
/** Annie: Lửa và Tibbers không gắn với một ô cast/travel/impact của lá nào nên đứng riêng; trận thật và Chuỗi gọi cùng các tên này */
export const ANNIE_VFX = {
    motes: "annieFireMotes", gain: "annieFireGain", spend: "annieFireSpend", stun: "annieStunFlare",
    leap: "annieTibbersLeap", claw: "annieClawHit", hurt: "annieTibbersHurt"
}

/** Liên Kết Đá của Malphite sống ngoài từng lá nên đứng riêng: dòng chia đòn, cú nứt tại lá, đứt một nhánh và vỡ cả sao đá */
export const MALPHITE_VFX = {
    surge: "malphiteVeinSurge", crack: "malphiteVeinCrack", breakLink: "malphiteVeinBreak", shatter: "malphiteVeinShatter"
}

/** Kog'Maw: đòn tăng tầm của E và cú nổ khi bị hạ không nằm trong ô cast/travel/impact của lá nào nên đứng riêng; trận thật và Chuỗi gọi cùng các tên này */
export const KOGMAW_VFX = {
    barrage: "kogBarrageShot", barrageHit: "kogBarrageHit", death: "kogDeathBurst"
}

/** Vayne: lá Đánh Thường bay vào nỏ và dấu Mũi Tên Bạc đi theo từng đòn nên không gắn với ô nào của lá; trận thật và Chuỗi gọi cùng các tên này */
export const VAYNE_VFX = {
    card: "vayneStrikeCard", mark: "vayneSilverMark"
}

/** Braum: Dấu Băng kích hoạt trên đòn của đồng minh nên không gắn với ô nào của lá; trận thật và Chuỗi gọi cùng các tên này */
export const BRAUM_VFX = {
    markBreak: "braumMarkBreak", stackFlow: "braumStackFlow"
}

/** Darius: các nhịp không nằm trong ô của lá nào nên đứng riêng; trận thật và Chuỗi gọi cùng các tên này */
export const DARIUS_VFX = {
    execute: "dariusExecute", wait: "dariusRecallWait", shed: "dariusBleedShed", fade: "dariusBleedFade"
}

/** Leona: Giáp của E và cú gồng, cú huỷ đòn địch không nằm trong ô cast/travel/impact của lá nào nên đứng riêng; trận thật và Chuỗi gọi cùng các tên này */
/** Nấm của Teemo nổ và rút bù: đi theo sự kiện bộ bài, không gắn với lá bài nào nên đứng riêng */
export const TEEMO_VFX = {
    burst: "mushroomBurst", redraw: "teemoRedraw"
}

export const LEONA_VFX = {
    armor: "leonaEclipseArmor", windup: "leonaStrikeWindup", fizzle: "leonaStrikeFizzle"
}

/** Khe Nứt của Vel'Koz nằm trên lá chờ tới cuối lượt, dùng ctx.tether để thả. Không gắn với lá bài nào nên đứng riêng */
export const VELKOZ_RIFT_LINGER = "velkozRiftLinger"
/** Đủ bấy nhiêu Phân Rã thì nổ, khớp DECAY_MAX của engine */
export const VELKOZ_DECAY_MAX = 3

/** R của Blitzcrank: bài văng khỏi tay đối thủ; từ tay tới Mộ, ctx.amount là số lá */
export const BLITZ_HAND_DISCARD = "blitzHandDiscard"

/** Món Ornn R rèn rơi vào ô đồ: `from` điểm búa nện, `to[0]` tâm ô. Ô đầy thì món lên tay bằng `extra` của R, không gọi hiệu ứng này */
export const ORNN_FORGED_ITEM = "ornnForgedItem"

/** Bom gắn thêm trên mục tiêu; ctx.amount là số Bom sau khi gắn */
export const TRISTANA_BOMB_ADD = "tristanaBombAdd"
/** Tướng mang Bom chết: nửa số Bom rơi khỏi lá; ctx.amount là số Bom rơi */
export const TRISTANA_BOMB_SHED = "tristanaBombShed"

/** Nội tại Aatrox: khí huyết bám lá tướng theo Máu đã mất; ctx.amount là %, ctx.tether để bám và thả */
export const AATROX_BLOOD_RAGE = "aatroxBloodRage"
/** Dạng Kẻ Diệt Thế duy trì: đôi cánh nhỏ bám lá tướng tới khi hết dạng */
export const AATROX_FORM_AURA = "aatroxWorldEnderAura"
/** Lần đầu về 0 trong dạng Kẻ Diệt Thế: ctx.onBeat đúng lúc Máu lên */
export const AATROX_REBIRTH = "aatroxRebirth"

/** Bộ đầy đủ của Rumble. q/e/r/p nằm trong HEROES, basic trong BASIC (cùng đối tượng, không sao chép); `recycle` là bản rỉ sét cho Lá Tái Chế, plan.ts đổi màu theo chiêu gốc */
export const RUMBLE_VFX = {
    basic: fx("rumbleSparkShot",
        "rumbleSparkHit",
        0x4fc8ff,
        0xffb030),
    p: fx("none",
        "rumbleRecycleCast",
        0xc96a2a,
        0xffd060,
        "rumbleRecycleCard"),
    q: fx("rumbleFlamethrower",
        "rumbleFlameHit",
        0xff8a24,
        0xffd060,
        "rumbleIgnite"),
    e: {
        ...fx("rumbleShardBurst",
            "rumbleShardHit",
            0xc98a4a,
            0x4fc8ff,
            "rumbleScrapOrbit"), shield: "rumbleScrapGain", block: "rumbleScrapBlock"
    },
    r: ult("none",
        "rumbleRocketHit",
        0xff6a1c,
        0xffd060,
        "rumbleRocketRain"),
    recycle: {
        bolt: fx("rumbleScrapBolt",
            "rumbleScrapBoltHit",
            0xffe984,
            0xffffff,
            "rumbleRecycleCast"),
        cleave: fx("rumbleScrapCleave",
            "rumbleScrapCleaveHit",
            0xc0262d,
            0xffd0c0,
            "rumbleRecycleCast")
    }
}
HEROES.rumble = {
    p: RUMBLE_VFX.p, q: RUMBLE_VFX.q, e: RUMBLE_VFX.e, r: RUMBLE_VFX.r
}

/** Bộ đầy đủ của Gangplank: q/e/r/p nằm trong HEROES; phần Thùng và Truy Nã không gắn với lá nào gom ở GANGPLANK_VFX */
Object.assign(HEROES.gangplank,
    {
        q: fx("none",
            "gangplankOrangeHeal",
            0xff9a1e,
            0xffe07a,
            "gangplankOrangeEat"),
        e: fx("gangplankKegPlace",
            "gangplankPowderGain",
            0xff8a24,
            0xffd060),
        r: ult("gangplankWantedBlast",
            "gangplankWantedHit",
            0xff6a14,
            0xffd060,
            "gangplankWantedMark"),
        p: passive("gangplankPowderGain",
            0xff8a24,
            0xffd060)
    })
export const GANGPLANK_VFX = {
    /** Úp Lá và E: lá bay vào ô phụ; ctx.amount = Thuốc Súng lúc đặt, ctx.icon = ảnh lá */
    place: "gangplankKegPlace",
    /** Đầu lượt +1 Thuốc Súng; ctx.amount = số mới */
    gain: "gangplankPowderGain",
    /** Ngòi cháy bám Thùng qua ctx.tether; ctx.amount = Thuốc Súng */
    fuse: "gangplankKegFuse",
    shatter: "gangplankKegShatter",
    /** Vỡ hoặc nổ thì lật; ctx.icon = ảnh lá, ngửa xong báo ctx.onBeat */
    flip: "gangplankKegFlip",
    /** Thùng nổ từ ô phụ tới `to`; ctx.amount = Thuốc Súng */
    detonate: "gangplankKegDetonate",
    hit: "gangplankKegHit",
    card: "gangplankCardFly",
    gold: "gangplankGoldFly",
    heal: "gangplankKegHeal"
}

export const heroVfxEntries = (): [string, HeroVfx][] => Object.entries(HEROES)
export const hasHeroVfx = (hero: string): boolean => Object.hasOwn(HEROES,
    hero)

const mixColor = (a: number, b: number, t: number) => [16,
    8,
    0].reduce((out, sh) => out | (Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) << sh),
    0)
/** Chiêu Đoạt của Sylas: đúng VFX của tướng gốc, ánh thêm xanh tím cổ thạch */
export function stolenVfx(origin: string, key: SkillKey): SkillVfx {
    const s = skillVfx(origin,
        key)
    return {
        ...s, color: mixColor(s.color,
            0x6f8cff,
            .3), color2: mixColor(s.color2 ?? s.color,
            0xa77bff,
            .3)
    }
}

/** Hiệu ứng của một chiêu (q/e/r/p) của một tướng; không có thì DEFAULT_VFX */
export function skillVfx(hero: string, key: SkillKey): SkillVfx {
    return HEROES[hero]?.[key] ?? DEFAULT_VFX
}

const SPELLS: Record<string, SkillVfx> = {
    heal: fx("none",
        "heal",
        0x60e090,
        0xe0ffe8),
    flash: fx("dash",
        "burst",
        0xffe060,
        0xffffff),
    ignite: fx("fireball",
        "fireHit",
        0xff5a20,
        0xffc060),
    exhaust: fx("bolt",
        "silenceHit",
        0x9a70c0,
        0xd8c0f0),
    barrier: fx("none",
        "shield",
        0xffd060,
        0xffffff),
    cleanse: fx("none",
        "cleanse",
        0x70d0ff,
        0xffffff),
    smite: fx("bolt",
        "trueHit",
        0x40b0ff,
        0xffe070),
    teleport: fx("none",
        "nova",
        0xb070ff,
        0xe0d0ff,
        "charge"),
    draw: fx("none",
        "buff",
        0xffe090,
        0xffffff)
}

/** Hiệu ứng thẻ phép bổ trợ */
export const spellVfx = (spell: string): SkillVfx => SPELLS[spell] ?? DEFAULT_VFX
export const spellVfxEntries = (): [string, SkillVfx][] => Object.entries(SPELLS)

/** Đòn thuộc fx_basics tự nổ bụi đúng lúc chạm nên không cần cue trúng thứ hai */
const BASIC: Record<string, SkillVfx> = {
    ashe: fx("basicFrostArrow",
        "none",
        0x8adaff,
        0xf0ffff),
    vayne: fx("basicSilverBolt",
        "none",
        0xb0b5ed,
        0xffffff),
    jinx: fx("basicMinigun",
        "none",
        0xf570be,
        0x80d8ff),
    tristana: fx("basicCannonball",
        "none",
        0xffa848,
        0xffe8a8),
    missfortune: fx("basicTwinPistols",
        "none",
        0xff7858,
        0xffe5c2),
    gangplank: fx("basicCutlass",
        "none",
        0xffb952,
        0xffecca),
    teemo: fx("basicBlowdart",
        "none",
        0x77ca3b,
        0xddffa2),
    kogmaw: fx("basicAcidSpit",
        "none",
        0xa4cd39,
        0xf5ff95),
    annie: fx("basicFlameBolt",
        "none",
        0xff732e,
        0xffd273),
    brand: fx("basicBlazeBolt",
        "none",
        0xff5329,
        0xffc357),
    lissandra: fx("basicIceClaw",
        "none",
        0x76d2ff,
        0xd8f7ff),
    lux: fx("basicLightOrb",
        "none",
        0xffeda3,
        0xffffff),
    ahri: fx("basicFoxOrb",
        "none",
        0xff85cb,
        0xffd8f1),
    sylas: fx("sylasChainLash",
        "sylasChainHit",
        0x6f8cff,
        0xa77bff),
    mel: fx("melRay",
        "melRayHit",
        0xffc94d,
        0xfff1c0),
    sona: fx("bolt",
        "storm",
        0x6fb6ff,
        0xd6f0ff),
    azir: fx("azirSandBolt",
        "azirSandHit",
        0xe2b45c,
        0xf7e4ac),
    jayce: fx("jayceHammerSwing",
        "jayceHit",
        0x4fc8ff,
        0xd6f6ff),
    jayce_cannon: fx("jayceCannonShot",
        "jayceHit",
        0x4fc8ff,
        0xd6f6ff),
    velkoz: fx("basicPlasmaBolt",
        "none",
        0xb083f8,
        0xdce7ff),
    viktor: fx("basicHexBolt",
        "none",
        0xbc76f1,
        0x73dff7),
    janna: fx("jannaGust",
        "jannaGustHit",
        0xa8e4ff,
        0xe8f3fb),
    nami: fx("namiOrb",
        "namiSplash",
        0x35b8ee,
        0xd8fbff),
    soraka: fx("sorakaStarBolt",
        "sorakaStarBoltHit",
        0xffd76a,
        0xb48cff),
    renata: fx("renataOrb",
        "renataOrbHit",
        0xb44bff,
        0xa6ff2e),
    twistedfate: fx("basicThrownCard",
        "none",
        0xf1cc6c,
        0x8bbdff),
    darius: fx("basicAxeChop",
        "none",
        0xb4323e,
        0xe5d7cd),
    aatrox: fx("basicDarkinCleave",
        "none",
        0xd3304b,
        0xffb1a8),
    garen: fx("basicSwordSwing",
        "none",
        0xe7c26e,
        0xffffff),
    yorick: fx("basicGraveShovel",
        "none",
        0x6fbc9c,
        0xe3f8e9),
    ornn: fx("basicForgeHammer",
        "none",
        0xb67f55,
        0xffc88c),
    malphite: fx("basicRockFist",
        "none",
        0xa3947d,
        0xddccb1),
    blitzcrank: fx("basicSteamFist",
        "none",
        0xd3b057,
        0xb5ddff),
    braum: fx("basicShieldBash",
        "none",
        0xa3cde8,
        0xffffff),
    leona: fx("basicSunBlade",
        "none",
        0xefc56a,
        0xfff4c6),
    katarina: fx("basicDaggerFlurry",
        "none",
        0xda4567,
        0xe9e7f2),
    khazix: fx("basicVoidClaw",
        "none",
        0xb377dd,
        0xeed2ff),
    zed: fx("basicShadowBlades",
        "none",
        0xd8344a,
        0xe8e4f0),
    qiyana: fx("basicElementRing",
        "qiyanaBasicHit",
        0xcba25e,
        0xa6e7de),
    rumble: RUMBLE_VFX.basic
}

/** Shared role actions; unusual mechanics opt in to an explicit champion override. */
export const BASIC_ACTION_VFX: Record<string, SkillVfx[]> = {
    assassin: [basicVfx("assassin",
        "physical")],
    fighter: [basicVfx("fighter",
        "physical")],
    mage: [basicVfx("mage",
        "magic")],
    support: [basicVfx("support",
        "magic")],
    marksman: [basicVfx("marksman",
        "physical")],
    tank: [basicVfx("tank",
        "physical")]
}
/** Mọi tướng có đòn riêng trong BASIC; công thức theo vai chỉ dùng cho tướng chưa khai báo */
export const heroBasicVfxSequence = (hero: string, damage?: "physical" | "magic", role?: string): SkillVfx[] => {
    const definition = cg.getHero(hero)
    if (Object.hasOwn(BASIC,
        hero)) return [{
        ...BASIC[hero]
    }]
    const key = role ?? definition?.role ?? "fighter"
    const tint = damage ?? definition?.damage ?? "physical"
    return (BASIC_ACTION_VFX[key] ?? [basicVfx(key,
        tint)]).map(style => ({
        ...style, impact: tint === "magic" ? "magicHit" : style.impact
    }))
}
export const heroBasicVfx = (hero: string, damage?: "physical" | "magic", role?: string): SkillVfx => heroBasicVfxSequence(hero,
    damage,
    role)[0]

/** Hiệu ứng đòn đánh thường theo vai trò + loại sát thương */
export function basicVfx(role: string, damage: "physical" | "magic"): SkillVfx {
    const magic = damage === "magic"
    switch (role) {
    case "marksman":
        return magic
            ? fx("bowShot",
                "magicHit",
                0x8ad0ff,
                0xffffff)
            : fx("bowShot",
                "physicalHit",
                0xe8e0c0,
                0xffffff)
    case "mage":
        return fx("mageOrb",
            "magicHit",
            0xb08aff,
            0xe8d8ff)
    case "support":
        return fx("supportOrb",
            "magicHit",
            0x90e0ff,
            0xffffff)
    case "assassin":
        return magic
            ? fx("assassinSlashes",
                "magicHit",
                0xe03050,
                0xffffff)
            : fx("assassinSlashes",
                "slashHit",
                0xd8d8e8,
                0xffffff)
    case "tank":
        return magic
            ? fx("heavyImpact",
                "magicHit",
                0xffd060,
                0xffffff)
            : fx("heavyImpact",
                "physicalHit",
                0xb0a090,
                0xffffff)
    case "fighter":
        return magic
            ? fx("daggerStab",
                "magicHit",
                0xffa060,
                0xffffff)
            : fx("daggerStab",
                "physicalHit",
                0xe0d0c0,
                0xffffff)
    default:
        return magic
            ? fx("bolt",
                "magicHit",
                0xb08aff,
                0xffffff)
            : fx("slash",
                "physicalHit",
                0xe0d0c0,
                0xffffff)
    }
}
