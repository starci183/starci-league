// Màn Hướng dẫn: mỗi tướng 5 ô (Nội tại, Q, E, R, Đánh thường), mỗi ô một hoặc vài thế cờ (biến thể, mỗi cái một mặt của chiêu:
// Quick nối chuỗi / dùng chủ động, cùng đường / khác đường...) dựng sẵn trên sân trận thật để xem chiêu và VFX.
// Thế cờ dựng bằng cg.applyStage (packages/shared/src/cardgame/stage.ts), đọc theo bộ chiêu thật trong heroes/<tướng>.ts và số ở
// balance/heroes/<tướng>.json. Phe A là người chơi; phe B là người nộm (net/localRoom.ts), chỉ làm vài hành động định sẵn
// (enemyPlan) để có đòn địch cho chiêu phản ứng. Đường ghi trong lời dặn đếm từ 1 (đường 1 = ô 0).
// Không dùng "cc" ở đây để test chạy được ngoài Cocos (scripts/card_tests_kits_tutorial.ts).
import {
    cg
} from "../shared"
import {
    applySilently, type EnemyStep
} from "../net/localRoom"

export type SlotKey = "p" | "q" | "e" | "r" | "basic"
export const SLOT_KEYS: SlotKey[] = ["p",
    "q",
    "e",
    "r",
    "basic"]
export const SLOT_TAG: Record<SlotKey, string> = {
    p: "Nội tại", q: "Q", e: "E", r: "R", basic: "Đánh thường"
}
/** 6 tướng của màn Hướng dẫn (giai đoạn đầu) */
export const TUTORIAL_HEROES = ["garen",
    "darius",
    "aatrox",
    "yorick",
    "braum",
    "blitzcrank"]

export interface Scenario {
    hero: string;
    slot: SlotKey;
    /** Chỉ số biến thể trong ô (đếm từ 0) */
    variant: number;
    /** Tên ngắn của biến thể ("Nối chuỗi (Quick)", "Dùng chủ động"...); "" khi ô chỉ có 1 kịch bản không tên */
    title: string;
    teamA: string[];
    teamB: string[];
    stage: cg.Stage;
    /** Chỉnh thêm sau applyStage (Ma Sương có sẵn, Dấu Băng...); trả state mới nếu thay cả state */
    setup?: (s: cg.GameState) => cg.GameState | void;
    /** Hành động định sẵn của phe B */
    enemyPlan?: EnemyStep[];
    /** Lời dặn 1-2 câu */
    hint: string;
    /** Id lá cần làm nổi trên tay */
    focus: string[];
    /** Mục tiêu nên chọn (id tướng trên sân, vd "B:lux"); test dùng để chơi đúng thế cờ */
    target?: string;
    /** Kịch bản không cần lá: việc người chơi cần làm (đánh không cần lá, kết thúc lượt); test dùng để chơi đúng thế cờ */
    act?: "attack" | "end";
}

// ---- tiện ích dựng thế cờ ----
const SEED = 7
const A_OF = (hero: string) => `A:${hero}`
const B_OF = (hero: string) => `B:${hero}`

/** Chảy Máu của Darius trên `hero`: tầng "bleed" + đồng hồ "bleed_t" (v = số tầng) */
const bleed = (n: number) => ({
    stacks: {
        bleed: n
    }, status: {
        bleed_t: {
            turns: 2, v: n
        }
    }
})

/** Phe A tung trước một lá chiêu (không phát sự kiện, phe B bỏ qua chuỗi), rồi trả lại mana, lượt dùng chiêu và số hành động */
function castFirst(hero: string, key: cg.SkillKey) {
    return (s: cg.GameState): cg.GameState => {
        const g = new cg.Game(s)
        const card = g.skillCard(hero,
            "A",
            key)
        s.players.A.hand.push(card)
        const play = cg.legalActions(s,
            "A").find((a) => a.t === "play" && a.uid === card.uid)
        if (!play) {
            s.players.A.hand = s.players.A.hand.filter((c) => c.uid !== card.uid)
            return s
        }
        const mana = s.teamMana.A
        const out = applySilently(s,
            play)
        out.teamMana.A = mana
        out.skillUses = {
        }
        out.actionsThisTurn = 0
        return out
    }
}

/** Phe B đánh lá `cardId` từ tay (khớp thêm mục tiêu nếu có) */
const enemyPlays = (cardId: string, target?: string): EnemyStep => (legal, s) => legal.find((a) => a.t === "play"
    && s.players.B.hand.find((c) => c.uid === a.uid)?.id === cardId
    && (!target || a.args?.target === target))
/** Phe B đánh không cần lá: `actor` đánh `target` */
const enemyAttacks = (actor: string, target: string): EnemyStep => (legal) => legal.find((a) => a.t === "attack"
    && a.actor === B_OF(actor) && a.target === A_OF(target))

const ENEMIES = ["ahri",
    "lux",
    "annie",
    "ashe",
    "viktor"]
const WITH_DARIUS = ["darius",
    "ahri",
    "lux",
    "annie",
    "ashe"]
const team = (hero: string) => [hero,
    ...["garen",
        "braum",
        "yorick",
        "aatrox",
        "blitzcrank",
        "darius"].filter((h) => h !== hero)].slice(0,
    5)
/** Đội A không có Darius (để Darius đứng phe địch) */
const teamNoDarius = (hero: string) => [hero,
    ...["garen",
        "braum",
        "yorick",
        "aatrox",
        "blitzcrank"].filter((h) => h !== hero)].slice(0,
    5)

type Def = Omit<Scenario, "hero" | "slot" | "variant" | "title">
/** Một biến thể của ô: cùng chiêu, một mặt khác của nó (Quick nối chuỗi / dùng chủ động, cùng đường / khác đường...) */
export type VariantDef = Def & { title: string }

/** Đội A có Darius và Blitzcrank (Darius E rồi Blitzcrank Q thử kéo kẻ đã bị Giữ Chân) */
const DARIUS_BLITZ = ["darius",
    "blitzcrank",
    "garen",
    "braum",
    "aatrox"]

const SCENARIOS: Record<string, Record<SlotKey, Def | VariantDef[]>> = {
    // ======================= GAREN =======================
    garen: {
        p: [
            {
                title: "Tay đôi, chưa đồ",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 2, ahri: 2
                    }, hands: {
                        garen: ["garen_q"]
                    }, first: "garen",
                },
                hint: "Đấu tay đôi, Garen chưa đeo đồ: Kiên Cường cho thêm Máu tối đa (3% + 2% mỗi ô đồ trống), và địch chỉ còn 1 tướng nên Q, E gây thêm 3% sát thương cho mỗi đường địch trống (4 đường: +12%). Kéo lá Q vào sân để thấy đòn chém mạnh hơn.",
                focus: ["garen_q"],
            },
            {
                title: "Đủ đồ, địch đủ 5",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 2, ahri: 0, lux: 1, annie: 2, ashe: 3, viktor: 4
                    }, hands: {
                        garen: ["garen_q"]
                    }, first: "garen",
                    items: {
                        garen: ["giap_warmog", "sterak", "vo_cuc_kiem"]
                    },
                },
                hint: "So sánh: Garen đã đeo đủ 3 món nên Kiên Cường chỉ còn +3% Máu tối đa (tay đôi chưa đồ là +9%), và địch đứng đủ 5 đường nên Q, E không được cộng thêm. Đồ vẫn cho chỉ số riêng, nhưng phần thưởng của nội tại gần như mất. Kéo lá Q chém Annie đối diện.",
                focus: ["garen_q"],
            },
        ],
        q: [
            {
                title: "Chém + Câm Lặng",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 2, ahri: 2, lux: 1, annie: 3
                    }, hands: {
                        garen: ["garen_q"]
                    }, first: "garen",
                },
                hint: "Kéo lá Q (Đòn Quyết Định, 0 mana) vào sân: Garen chém Ahri đối diện (theo Công và Máu tối đa) và Câm Lặng nó 1 đơn vị.",
                focus: ["garen_q"],
            },
            {
                title: "Câm Lặng chặn chiêu",
                teamA: teamNoDarius("garen"), teamB: WITH_DARIUS,
                stage: {
                    board: {
                        garen: 2, darius: 2, ahri: 1, lux: 3
                    }, hands: {
                        garen: ["garen_q"], darius: ["darius_q"]
                    }, first: "garen",
                },
                // Không có Câm Lặng thì lượt sau Darius dùng Tàn Sát; có thì lá nằm im trên tay
                enemyPlan: [enemyPlays("darius_q")],
                hint: "Darius đối diện đang cầm Tàn Sát, định dùng ở lượt sau. Kéo lá Q chém Darius (Câm Lặng 1 đơn vị) rồi bấm Kết thúc lượt: sang lượt đối thủ Darius không dùng được chiêu. Bấm Làm lại và Kết thúc lượt ngay để thấy Darius chém Garen.",
                focus: ["garen_q"],
            },
        ],
        e: [
            {
                title: "Nối chuỗi (Quick)",
                teamA: teamNoDarius("garen"), teamB: WITH_DARIUS,
                stage: {
                    board: {
                        garen: 2, darius: 2, lux: 1, annie: 3
                    }, hands: {
                        garen: ["garen_e"], darius: ["darius_q"]
                    }, first: "darius",
                },
                enemyPlan: [enemyPlays("darius_q")],
                hint: "Lượt đối thủ: Darius sắp dùng Tàn Sát nhắm Garen. Khi khung phản ứng hiện, kéo lá E (Quick): Garen chém Darius đối diện, địch ở 2 đường kề nhận 30%, rồi hồi Máu 40% tổng sát thương, trước khi đòn của Darius kịp giải quyết.",
                focus: ["garen_e"],
            },
            {
                title: "Dùng chủ động",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 2, ahri: 2, lux: 1, annie: 3, ashe: 0
                    }, hands: {
                        garen: ["garen_e"]
                    }, first: "garen",
                    hpPct: {
                        garen: 0.5
                    },
                },
                hint: "Lượt của bạn, Garen còn nửa Máu. Kéo lá E (Phán Xét) vào sân như lá thường: Ahri đối diện nhận đủ sát thương, Lux và Annie ở 2 đường kề nhận 30%, Ashe ở đường 1 không trúng. Garen hồi Máu theo tổng.",
                focus: ["garen_e"],
            },
        ],
        r: [
            {
                title: "Cùng đường (x2)",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 1, lux: 1, ahri: 2, annie: 3
                    }, hands: {
                        garen: ["garen_r"]
                    }, first: "garen",
                    hpPct: {
                        lux: 0.4
                    },
                },
                hint: "Lux đứng cùng đường với Garen và còn 40% Máu. Kéo lá R (Công Lý Demacia) rồi chọn Lux: sát thương chuẩn 60 + 12% Máu tối đa của nó, gấp đôi vì cùng đường, đủ kết liễu.",
                focus: ["garen_r"],
                target: "B:lux",
            },
            {
                title: "Khác đường",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 1, lux: 1, ahri: 2, annie: 3
                    }, hands: {
                        garen: ["garen_r"]
                    }, first: "garen",
                    hpPct: {
                        annie: 0.4
                    },
                },
                hint: "Annie ở đường 4 còn 40% Máu, không cùng đường với Garen. Kéo lá R rồi chọn Annie: R với tới mọi đường nhưng không được gấp đôi, nên Annie sống sót. Muốn kết liễu thì đưa Garen về cùng đường trước.",
                focus: ["garen_r"],
                target: "B:annie",
            },
        ],
        basic: [
            {
                title: "Lá Đánh Thường",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 2, ahri: 2, lux: 3
                    }, hands: {
                        garen: ["basic"]
                    }, first: "garen", step: "battle",
                },
                hint: "Đang ở bước Battle. Kéo lá Đánh Thường vào Ahri đối diện.",
                focus: ["basic"],
            },
            {
                title: "Không cần lá",
                teamA: team("garen"), teamB: ENEMIES,
                stage: {
                    board: {
                        garen: 2, ahri: 2, lux: 3
                    }, hands: {
                    }, first: "garen", step: "battle",
                },
                hint: "Tay trống, đang ở bước Battle. Đấu sĩ có đòn không cần lá: chọn Garen trên sân rồi bấm Đánh vào Ahri đối diện (sát thương thấp hơn lá Đánh Thường).",
                focus: [],
                act: "attack",
            },
        ],
    },
    // ======================= DARIUS =======================
    darius: {
        p: [
            {
                title: "Đánh theo tầng",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 3
                    }, hands: {
                        darius: ["basic"]
                    }, first: "darius", step: "battle",
                    stacks: {
                        ahri: bleed(2).stacks
                    }, statuses: {
                        ahri: bleed(2).status
                    },
                },
                hint: "Ahri đang có 2 Chảy Máu. Kéo lá Đánh Thường vào Ahri (hoặc chọn Darius bấm Đánh): đòn đánh gây thêm 3 sát thương mỗi tầng rồi cắm thêm 1 tầng. Càng chém càng thốn.",
                focus: ["basic"],
            },
            {
                title: "Rỉ máu đầu lượt",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 3
                    }, hands: {
                    }, first: "darius",
                    stacks: {
                        ahri: bleed(6).stacks, lux: bleed(2).stacks
                    }, statuses: {
                        ahri: bleed(6).status, lux: bleed(2).status
                    },
                },
                hint: "Ahri mang 6 Chảy Máu, Lux mang 2. Chỉ cần bấm Kết thúc lượt: đầu lượt của đối thủ, mỗi tầng trên mỗi tướng gây sát thương vật lý (Ahri đau gấp 3 Lux).",
                focus: [],
                act: "end",
            },
        ],
        q: [
            {
                title: "Đốt 3 tầng",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 3
                    }, hands: {
                        darius: ["darius_q"]
                    }, first: "darius",
                    hpPct: {
                        darius: 0.6
                    },
                    stacks: {
                        ahri: bleed(3).stacks
                    }, statuses: {
                        ahri: bleed(3).status
                    },
                },
                hint: "Ahri đối diện có 3 Chảy Máu. Kéo lá Q (Tàn Sát): mỗi tầng cộng thêm 6 sát thương, gắn thêm 2 tầng và Darius hồi 4 Máu mỗi tầng trên Ahri.",
                focus: ["darius_q"],
            },
            {
                title: "Chém 2 lần",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 3
                    }, hands: {
                        darius: ["darius_q", "darius_q"]
                    }, first: "darius",
                    hpPct: {
                        darius: 0.5
                    },
                },
                hint: "Ahri chưa có Chảy Máu, tay có 2 lá Q. Kéo Q lần 1: sát thương gốc, cắm 2 tầng. Kéo Q lần 2: thêm 12 sát thương nhờ 2 tầng, lên 4 tầng và hồi nhiều Máu hơn.",
                focus: ["darius_q"],
            },
        ],
        e: [
            {
                title: "Kéo + Giữ Chân",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 4, annie: 0
                    }, hands: {
                        darius: ["darius_e"]
                    }, first: "darius",
                    stacks: {
                        lux: bleed(2).stacks
                    }, statuses: {
                        lux: bleed(2).status
                    },
                },
                hint: "Kéo lá E (Bắt Giữ) rồi chọn Lux ở đường 5: Lux bị kéo về đối diện Darius (đổi chỗ với Ahri), nhận sát thương cộng theo 2 Chảy Máu và bị Giữ Chân (không di chuyển, không bị kéo hay đổi chỗ).",
                focus: ["darius_e"],
                target: "B:lux",
            },
            {
                title: "Giữ Chân chặn kéo",
                teamA: DARIUS_BLITZ, teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, blitzcrank: 4, ahri: 2, lux: 0, annie: 4
                    }, hands: {
                        darius: ["darius_e"], blitzcrank: ["blitzcrank_q"], lux: ["lux_q"]
                    }, first: "darius",
                },
                hint: "Tay đối thủ chỉ có lá Q của Lux. Bước 1: kéo lá E chọn Lux ở đường 1, Lux bị kéo về đối diện Darius và bị Giữ Chân. Bước 2: kéo lá Q của Blitzcrank chọn Lux: cướp trúng chiêu của Lux nhưng không kéo được nó sang đường 5 vì đang bị Giữ Chân.",
                focus: ["darius_e", "blitzcrank_q"],
                target: "B:lux",
            },
        ],
        r: [
            {
                title: "Hạ được: về tay",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 0, ahri: 0, lux: 3, annie: 2
                    }, hands: {
                        darius: ["darius_r"]
                    }, first: "darius",
                    hp: {
                        lux: 200
                    },
                    stacks: {
                        lux: bleed(4).stacks, annie: bleed(2).stacks
                    }, statuses: {
                        lux: bleed(4).status, annie: bleed(2).status
                    },
                },
                hint: "Lux (đường 4) mang 4 Chảy Máu, Máu thấp. Kéo lá R (Máy Chém Noxus) chọn Lux: Darius lao sang đối diện, xả hết dấu thành sát thương chuẩn, mục tiêu càng ít Máu càng đau. Hạ được nên lá R về tay: kéo tiếp R chọn Annie (2 Chảy Máu).",
                focus: ["darius_r"],
                target: "B:lux",
            },
            {
                title: "Không hạ: vào bộ",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 0, ahri: 0, lux: 3, annie: 2
                    }, hands: {
                        darius: ["darius_r"]
                    }, first: "darius",
                    stacks: {
                        annie: bleed(1).stacks
                    }, statuses: {
                        annie: bleed(1).status
                    },
                },
                hint: "Annie (đường 3) đầy Máu, chỉ có 1 Chảy Máu. Kéo lá R chọn Annie: Darius đổi chỗ sang đối diện, chém sát thương chuẩn nhưng không hạ được, nên lá R không về tay mà nằm ngẫu nhiên trong 5 lá trên cùng bộ bài (sẽ rút lại sớm).",
                focus: ["darius_r"],
                target: "B:annie",
            },
        ],
        basic: [
            {
                title: "Lá Đánh Thường",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 3
                    }, hands: {
                        darius: ["basic"]
                    }, first: "darius", step: "battle",
                },
                hint: "Đang ở bước Battle. Kéo lá Đánh Thường vào Ahri đối diện: mỗi đòn trúng cắm 1 Chảy Máu.",
                focus: ["basic"],
            },
            {
                title: "Không cần lá",
                teamA: team("darius"), teamB: ENEMIES,
                stage: {
                    board: {
                        darius: 2, ahri: 2, lux: 3
                    }, hands: {
                    }, first: "darius", step: "battle",
                    stacks: {
                        ahri: bleed(3).stacks
                    }, statuses: {
                        ahri: bleed(3).status
                    },
                },
                hint: "Tay trống, Ahri có 3 Chảy Máu. Chọn Darius trên sân rồi bấm Đánh (đòn không cần lá của Đấu sĩ): vẫn được cộng sát thương theo tầng và cắm thêm 1 tầng.",
                focus: [],
                act: "attack",
            },
        ],
    },
    // ======================= AATROX =======================
    aatrox: {
        p: [
            {
                title: "Máu thấp",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, ahri: 2, lux: 1
                    }, hands: {
                        aatrox: ["basic"]
                    }, first: "aatrox", step: "battle",
                    hpPct: {
                        aatrox: 0.35
                    },
                },
                hint: "Aatrox đang mất 65% Máu: mọi sát thương mạnh thêm khoảng 33% và hút lại 8%. Kéo lá Đánh Thường vào Ahri đối diện (hoặc chọn Aatrox bấm Đánh) để thấy số to và Máu hồi.",
                focus: ["basic"],
            },
            {
                title: "Gần đầy Máu",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, ahri: 2, lux: 1
                    }, hands: {
                        aatrox: ["basic"]
                    }, first: "aatrox", step: "battle",
                    hpPct: {
                        aatrox: 0.9
                    },
                },
                hint: "So sánh: Aatrox chỉ mất 10% Máu nên chỉ mạnh thêm 5%. Kéo lá Đánh Thường vào Ahri rồi so với tình huống Máu thấp: Aatrox càng bị đánh càng nguy hiểm.",
                focus: ["basic"],
            },
        ],
        q: [
            {
                title: "Đầy Máu",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, lux: 1, ahri: 2, annie: 3
                    }, hands: {
                        aatrox: ["aatrox_q", "aatrox_q"]
                    }, first: "aatrox",
                },
                hint: "Aatrox đầy Máu, tay có 2 lá Q. Kéo lá Q (Lưỡi Gươm Darkin, 0 mana): trả 10% Máu hiện tại rồi chém Ahri đối diện. Kéo Q lần 2: Máu đã thấp hơn nên nhát chém nặng hơn một chút.",
                focus: ["aatrox_q"],
            },
            {
                title: "Máu thấp",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, lux: 1, ahri: 2, annie: 3
                    }, hands: {
                        aatrox: ["aatrox_q"]
                    }, first: "aatrox",
                    hpPct: {
                        aatrox: 0.25
                    },
                },
                hint: "Aatrox chỉ còn 25% Máu. Kéo lá Q: giá 10% Máu hiện tại giờ rất rẻ, còn nhát chém mạnh thêm gần 40% và hút lại 8%. So với tình huống Đầy Máu.",
                focus: ["aatrox_q"],
            },
        ],
        e: [
            {
                title: "Nối chuỗi (Quick)",
                teamA: teamNoDarius("aatrox"), teamB: WITH_DARIUS,
                stage: {
                    board: {
                        aatrox: 2, darius: 2, lux: 1, annie: 3
                    }, hands: {
                        aatrox: ["aatrox_e"], darius: ["darius_q"]
                    }, first: "darius",
                    hpPct: {
                        aatrox: 0.5
                    },
                },
                enemyPlan: [enemyPlays("darius_q")],
                hint: "Lượt đối thủ: Darius sắp dùng Tàn Sát nhắm Aatrox. Khi khung phản ứng hiện, kéo lá E (Quick): Aatrox chém Darius đối diện (nặng nhất) và Lux, Annie ở 2 đường kề, rồi nhận Khiên 40% tổng sát thương, kịp đỡ đòn của Darius.",
                focus: ["aatrox_e"],
            },
            {
                title: "Dùng chủ động",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, ahri: 2, lux: 1, annie: 3
                    }, hands: {
                        aatrox: ["aatrox_e"]
                    }, first: "aatrox",
                    hpPct: {
                        aatrox: 0.4
                    },
                },
                hint: "Lượt của bạn, Aatrox còn 40% Máu. Kéo lá E (Huyết Thuẫn) vào sân như lá thường: chém Ahri đối diện, Lux và Annie ở 2 bên nhận 50%, hút máu từng nhát rồi nhận Khiên theo tổng.",
                focus: ["aatrox_e"],
            },
        ],
        r: [
            {
                title: "Nối chuỗi: hồi sinh",
                teamA: teamNoDarius("aatrox"), teamB: WITH_DARIUS,
                stage: {
                    board: {
                        aatrox: 2, darius: 2, lux: 1, annie: 3
                    }, hands: {
                        aatrox: ["aatrox_r"], darius: ["darius_q"]
                    }, first: "darius",
                    hpPct: {
                        aatrox: 0.12
                    },
                    // Darius đủ đồ để Tàn Sát hạ được cả Aatrox đã hoá quỷ (R cộng Máu): thấy rõ hồi sinh
                    items: {
                        darius: ["kiem_tu_than", "vo_cuc_kiem"]
                    },
                },
                enemyPlan: [enemyPlays("darius_q")],
                hint: "Aatrox chỉ còn 12% Máu. Lượt đối thủ: Darius đủ đồ sắp dùng Tàn Sát nhắm Aatrox, đủ để hạ Aatrox. Khi khung phản ứng hiện, kéo lá R (Quick): Aatrox hoá quỷ trước khi đòn kịp giải quyết; đòn hạ về 0 Máu thì Aatrox hồi sinh với 30% Máu và chơi tiếp.",
                focus: ["aatrox_r"],
            },
            {
                title: "Chủ động rồi Q",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, ahri: 2, lux: 1
                    }, hands: {
                        aatrox: ["aatrox_r", "aatrox_q"]
                    }, first: "aatrox",
                    hpPct: {
                        aatrox: 0.6
                    },
                },
                hint: "Lượt của bạn. Kéo lá R (Kẻ Diệt Thế) trước: Aatrox hoá quỷ 2 đơn vị, +20 Công và +25% Máu tối đa. Rồi kéo lá Q chém Ahri: nhát chém mang thêm Công của dạng quỷ, còn lá chắn chết vẫn giữ cho đòn của địch.",
                focus: ["aatrox_r", "aatrox_q"],
            },
        ],
        basic: [
            {
                title: "Lá Đánh Thường",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, ahri: 2, lux: 3
                    }, hands: {
                        aatrox: ["basic"]
                    }, first: "aatrox", step: "battle",
                },
                hint: "Đang ở bước Battle. Kéo lá Đánh Thường vào Ahri đối diện.",
                focus: ["basic"],
            },
            {
                title: "Không cần lá",
                teamA: team("aatrox"), teamB: ENEMIES,
                stage: {
                    board: {
                        aatrox: 2, ahri: 2, lux: 3
                    }, hands: {
                    }, first: "aatrox", step: "battle",
                    hpPct: {
                        aatrox: 0.5
                    },
                },
                hint: "Tay trống, Aatrox còn nửa Máu. Chọn Aatrox trên sân rồi bấm Đánh vào Ahri (đòn không cần lá của Đấu sĩ): vẫn được Cái Giá Bằng Máu cộng sát thương và hút máu.",
                focus: [],
                act: "attack",
            },
        ],
    },
    // ======================= YORICK =======================
    yorick: {
        p: {
            teamA: team("yorick"), teamB: ENEMIES,
            stage: {
                board: {
                    yorick: 2, ahri: 2, lux: 3
                }, hands: {
                    yorick: ["basic"]
                }, first: "yorick",
                stacks: {
                    yorick: {
                        yorick_soul: 19
                    }
                },
            },
            setup: (s0) => {
                const s = castFirst("yorick",
                    "R")(s0)
                s.step = "battle"
                return s
            },
            hint: "Yorick có 19 Hồn Ma, Ma Sương đứng ở ô phụ. Kéo lá Đánh Thường vào Ahri: đốt 1 lá bộ địch, đủ 20 Hồn Ma thì nhận 1 lá R lên tay, Ma Sương đánh theo.",
            focus: ["basic"],
        },
        q: {
            teamA: team("yorick"), teamB: ENEMIES,
            stage: {
                board: {
                    yorick: 2, ahri: 2, lux: 3
                }, hands: {
                    yorick: ["yorick_q"]
                }, first: "yorick",
                hpPct: {
                    yorick: 0.6
                },
            },
            hint: "Kéo lá Q (Nghi Thức Cuối): Yorick nện xẻng vào Ahri đối diện và hồi Máu theo Máu tối đa.",
            focus: ["yorick_q"],
        },
        e: {
            teamA: team("yorick"), teamB: ENEMIES,
            stage: {
                board: {
                    yorick: 2, ahri: 2, lux: 4
                }, hands: {
                    yorick: ["yorick_e"]
                }, first: "yorick",
            },
            setup: castFirst("yorick",
                "R"),
            hint: "Ma Sương đã ở ô phụ. Kéo lá E (Sương Sầu) chọn Lux ở đường 5: đốt 2 lá bộ địch, Lux nhận sát thương và bị Rã Giáp, Ma Sương lao tới đánh cùng.",
            focus: ["yorick_e"],
            target: "B:lux",
        },
        r: {
            teamA: team("yorick"), teamB: ENEMIES,
            stage: {
                board: {
                    yorick: 2, ahri: 2, lux: 3
                }, hands: {
                    yorick: ["yorick_r", "basic"]
                }, first: "yorick",
            },
            hint: "Ô phụ đang trống. Kéo lá R (Khúc Ai Ca): Ma Sương hiện ở ô phụ. Sau đó bấm Bước tiếp sang Battle và đánh thường để thấy Ma Sương đánh theo.",
            focus: ["yorick_r"],
        },
        basic: {
            teamA: team("yorick"), teamB: ENEMIES,
            stage: {
                board: {
                    yorick: 2, ahri: 2, lux: 3
                }, hands: {
                    yorick: ["basic"]
                }, first: "yorick", step: "battle",
            },
            hint: "Đang ở bước Battle. Kéo lá Đánh Thường vào Ahri đối diện (mỗi đòn trúng đốt 1 lá bộ địch, nuôi Hồn Ma); hoặc chọn Yorick rồi bấm Đánh.",
            focus: ["basic"],
        },
    },
    // ======================= BRAUM =======================
    braum: {
        p: {
            teamA: teamNoDarius("braum"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    braum: 2, garen: 1, darius: 2, ahri: 1, lux: 3
                }, hands: {
                }, first: "darius", step: "battle",
                stacks: {
                    braum: {
                        braum_dual: 2
                    }
                },
            },
            enemyPlan: [enemyAttacks("darius",
                "braum")],
            hint: "Chỉ cần xem: lượt đối thủ, Darius sẽ đánh Braum. Đòn trúng cho Braum thêm Song Giáp (+Giáp, +Kháng phép), cộng dồn vô hạn. Muốn xem lại thì bấm Làm lại.",
            focus: [],
        },
        q: {
            teamA: teamNoDarius("braum"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    braum: 1, garen: 2, darius: 2, ahri: 1
                }, hands: {
                    braum: ["braum_q"]
                }, first: "braum",
            },
            hint: "Kéo lá Q (Cú Đấm Băng) chọn Darius (đối diện Garen) để đặt Dấu Băng. Rồi bấm Bước tiếp sang Battle, chọn Garen bấm Đánh vào Darius: dấu vỡ, Darius bị Choáng.",
            focus: ["braum_q"],
            target: "B:darius",
        },
        e: {
            teamA: teamNoDarius("braum"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    braum: 1, garen: 2, darius: 2, ahri: 1, lux: 3
                }, hands: {
                    braum: ["braum_e"], darius: ["darius_q"]
                }, first: "darius",
            },
            enemyPlan: [enemyPlays("darius_q")],
            hint: "Lượt đối thủ: Darius dùng Tàn Sát nhắm Garen. Khi khung phản ứng hiện, kéo lá E (Đứng Sau Tôi): Braum nhảy ra đỡ thay 60% sát thương, nhận Song Giáp và Khiên.",
            focus: ["braum_e"],
        },
        r: {
            teamA: teamNoDarius("braum"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    braum: 2, darius: 2, ahri: 0, lux: 1, annie: 3, ashe: 4
                }, hands: {
                    braum: ["braum_r"]
                }, first: "braum",
            },
            hint: "Kéo lá R (Khe Băng): mọi địch nhận sát thương phép; Darius đối diện bị Choáng lâu hơn, các địch khác bị Choáng ngắn.",
            focus: ["braum_r"],
        },
        basic: {
            teamA: teamNoDarius("braum"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    braum: 2, darius: 2, ahri: 1
                }, hands: {
                    braum: ["basic"]
                }, first: "braum", step: "battle",
            },
            hint: "Đang ở bước Battle. Kéo lá Đánh Thường vào Darius đối diện (Đỡ đòn không có đòn không cần lá, phải dùng lá).",
            focus: ["basic"],
        },
    },
    // ======================= BLITZCRANK =======================
    blitzcrank: {
        p: {
            teamA: teamNoDarius("blitzcrank"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    blitzcrank: 2, ahri: 2, lux: 3
                }, hands: {
                    blitzcrank: ["blitzcrank_q"], ahri: ["gold", "basic"]
                }, first: "blitzcrank",
                stacks: {
                    blitzcrank: {
                        blitz_parts: 2
                    }
                },
            },
            hint: "Tay đối thủ chỉ có lá thường. Kéo lá Q chọn Ahri: Blitzcrank cướp 1 lá (lá thường giữ nguyên, về tay bạn) và nhận 1 Phụ Tùng (+2 Giáp, +2 Kháng phép).",
            focus: ["blitzcrank_q"],
            target: "B:ahri",
        },
        q: {
            teamA: teamNoDarius("blitzcrank"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    blitzcrank: 1, darius: 3, ahri: 1, lux: 2
                }, hands: {
                    blitzcrank: ["blitzcrank_q"], darius: ["darius_q", "darius_e"]
                }, first: "blitzcrank",
            },
            hint: "Tay đối thủ chỉ có lá chiêu của Darius. Kéo lá Q chọn Darius ở đường 4: cướp trúng chiêu của chính hắn nên kéo hắn sang đối diện Blitzcrank; lá cướp đổi thành lá Q/E phe bạn.",
            focus: ["blitzcrank_q"],
            target: "B:darius",
        },
        e: {
            teamA: teamNoDarius("blitzcrank"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    blitzcrank: 1, garen: 2, darius: 2, ahri: 1
                }, hands: {
                    blitzcrank: ["blitzcrank_e"], darius: ["darius_q"]
                }, first: "darius",
            },
            enemyPlan: [enemyPlays("darius_q")],
            hint: "Lượt đối thủ: Darius dùng Tàn Sát. Khi khung phản ứng hiện, kéo lá E (Tay Giật): cướp và vô hiệu lá đó, rồi Darius bị Choáng.",
            focus: ["blitzcrank_e"],
        },
        r: {
            teamA: teamNoDarius("blitzcrank"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    blitzcrank: 2, darius: 2, ahri: 0, lux: 1, annie: 3
                }, hands: {
                    blitzcrank: ["blitzcrank_r"], darius: ["darius_q", "darius_e", "gold", "basic"]
                }, first: "blitzcrank",
            },
            hint: "Kéo lá R (Trường Điện Từ): mọi địch nhận sát thương phép và bị Câm Lặng; đối thủ bỏ 2 lá ngẫu nhiên trên tay (tay địch đang có 4 lá).",
            focus: ["blitzcrank_r"],
        },
        basic: {
            teamA: teamNoDarius("blitzcrank"), teamB: WITH_DARIUS,
            stage: {
                board: {
                    blitzcrank: 2, darius: 2, ahri: 1
                }, hands: {
                    blitzcrank: ["basic"]
                }, first: "blitzcrank", step: "battle",
            },
            hint: "Đang ở bước Battle. Kéo lá Đánh Thường vào Darius đối diện (Đỡ đòn phải dùng lá để đánh).",
            focus: ["basic"],
        },
    },
}

/** Các biến thể của (tướng, ô): một ô ghi 1 kịch bản đơn thì coi là 1 biến thể không tên; [] nếu chưa có */
export function variantsOf(hero: string, slot: SlotKey): Scenario[] {
    const d = SCENARIOS[hero]?.[slot]
    if (!d) return []
    const list: (Def & { title?: string })[] = Array.isArray(d) ? d : [d]
    return list.map((v, variant) => ({
        ...v, hero, slot, variant, title: v.title ?? ""
    }))
}

/** Kịch bản của (tướng, ô, biến thể đếm từ 0); undefined nếu chưa có */
export function scenarioOf(hero: string, slot: SlotKey, variant = 0): Scenario | undefined {
    return variantsOf(hero,
        slot)[variant]
}

/** Mọi (tướng, ô, biến thể) theo thứ tự, để đi Chiêu trước / Chiêu sau */
export function allScenarios(): Scenario[] {
    return TUTORIAL_HEROES.flatMap((hero) => SLOT_KEYS.flatMap((slot) => variantsOf(hero,
        slot)))
}

/** Đọc số biến thể từ chữ trong URL (đếm từ 1, như ?tutorial=garen:e:2); trả chỉ số đếm từ 0, sai hoặc thiếu thì 0 */
export function parseVariant(x: string | number | undefined): number {
    const n = Math.floor(Number(x))
    return Number.isFinite(n) && n >= 1 ? n - 1 : 0
}

/** Đọc ô từ chữ (URL ?tutorial=garen:q): p, q, e, r, basic (a / aa / attack cũng là đánh thường) */
export function parseSlot(x: string | undefined): SlotKey | undefined {
    const k = (x ?? "").toLowerCase()
    if (k === "a" || k === "aa" || k === "attack") return "basic"
    return (SLOT_KEYS as string[]).includes(k) ? k as SlotKey : undefined
}

/** Dựng state của kịch bản: ván mới, áp thế cờ, chỉnh thêm */
export function buildScenarioState(sc: Scenario): cg.GameState {
    const s = cg.newGame(SEED,
        sc.teamA,
        sc.teamB)
    cg.applyStage(s,
        sc.stage)
    return sc.setup?.(s) ?? s
}

/** Tên kỹ năng của ô (Nội tại: tên nội tại) */
export function slotName(hero: string, slot: SlotKey): string {
    const h = cg.getHero(hero)
    if (!h) return SLOT_TAG[slot]
    if (slot === "p") return h.passive.name
    if (slot === "basic") return "Đánh thường"
    return h.skills[slot.toUpperCase() as "Q" | "E" | "R"]?.name ?? SLOT_TAG[slot]
}

/** Mô tả ngắn của ô (bỏ ngoặc công thức) */
export function slotDesc(hero: string, slot: SlotKey): string {
    const h = cg.getHero(hero)
    if (!h) return ""
    const raw = slot === "p" ? h.passive.desc : slot === "basic"
        ? `Đòn đánh thường gây sát thương ${h.damage === "physical" ? "vật lý" : "phép"} bằng Công (${h.atk}) lên tướng đối diện.${h.role === "fighter" ? " Đấu sĩ có thêm đòn không cần lá ở Battle." : ""}`
        : h.skills[slot.toUpperCase() as "Q" | "E" | "R"]?.desc ?? ""
    return raw.replace(/[{}]/g,
        "")
}
