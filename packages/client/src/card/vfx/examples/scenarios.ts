// Các nhánh chơi được: trạng thái đến từ engine thật, không có renderer/luật giả.
import {
    cg
} from "@starci/shared"

export interface ExampleSpec {
    slug: string;
    title: string;
    caption: string;
    recommended: string[];
    focus?: string;
}

export const EXAMPLES: ExampleSpec[] = [
    {
        slug: "full-match", title: "Một trận hoàn chỉnh", caption: "Bạn điều khiển phe Xanh, máy điều khiển phe Đỏ. Chọn bài, gọi tướng, ghép đồ và nối chuỗi; mọi hành động đi qua engine thật.", recommended: [], focus: "A:darius"
    },
    {
        slug: "mana-spend", title: "Mana đội · Hai tướng chung một quỹ", caption: "Brand E tiêu 20 mana, rồi Lux E tiêu 30 mana từ cùng quỹ đội: 80 → 60 → 30 / 200. Mana đội đối phương không đổi.", recommended: ["brand_e",
            "lux_e"], focus: "A:brand"
    },
    ...([
        ["assassin",
            "zed",
            "Sát thủ · Chém chém"],
        ["fighter",
            "darius",
            "Đấu sĩ · Đâm thẳng"],
        ["mage",
            "lux",
            "Pháp sư · Cầu phép"],
        ["support",
            "janna",
            "Trợ thủ · Cầu phép quỹ đạo"],
        ["marksman",
            "ashe",
            "Xạ thủ · Mũi tên"],
        ["tank",
            "leona",
            "Đỡ đòn · Va đập nặng"]
    ].map(([role,
        hero,
        title]) => ({
        slug: `basic-${role}`, title, caption: "Một đòn đánh thật ánh xạ đến danh sách VFX theo vai. Các VFX trình diễn không tự tăng số lần gây sát thương.", recommended: ["basic"], focus: `A:${hero}`
    }))),
    {
        slug: "brand-effects", title: "Brand · Một chiêu, nhiều hiệu ứng", caption: "Jinx đang có ba Bỏng. Q gây sát thương → thêm Bỏng → Choáng, mỗi hiệu ứng có VFX và nhịp cập nhật riêng.", recommended: ["brand_q"], focus: "A:brand"
    },
    {
        slug: "brand-area", title: "Brand · Diện rộng và Bỏng", caption: "E đánh từng mục tiêu và gắn Bỏng. R đánh diện rộng, nhân đôi Bỏng rồi kích hoạt sát thương duy trì tại từng tướng.", recommended: ["brand_e",
            "brand_r"], focus: "A:brand"
    },
    {
        slug: "swap-allies", title: "Ahri · Đổi chỗ đồng minh", caption: "R đổi chỗ Ahri và Darius. Hai lá di chuyển cùng lúc, nhường đường nhau; sát thương đánh vào tướng đối diện vị trí mới.", recommended: ["ahri_r"], focus: "A:ahri"
    },
    {
        slug: "khazix-jump", title: "Kha’Zix · Nhảy tới con mồi", caption: "E nhảy sang ô đối diện Jinx; Darius nhường sang ô cũ của Kha’Zix. Đáp xuống rồi mới gắn Cô Lập và gây sát thương; Q đánh đối diện ở vị trí mới.", recommended: ["khazix_e",
            "khazix_q"], focus: "A:khazix"
    },
    {
        slug: "teemo-mushrooms", title: "Teemo · Gài nấm và kích nổ", caption: "Q gài ba Nấm vào bộ đối thủ; R kích nổ lần lượt vào tướng ít máu nhất. Nấm không lên tay và không tạo thêm trạng thái Độc.", recommended: ["teemo_q",
            "teemo_r"], focus: "A:teemo"
    },
    {
        slug: "teemo-draw-mushroom", title: "Teemo · Rút trúng nấm", caption: "Dùng Rút Bài: lá đầu là Nấm của Teemo đối thủ. Nấm bật khỏi bộ, nổ vào tướng ít máu nhất rồi rút bù; không chiếm chỗ trên tay.", recommended: ["draw"], focus: "B:teemo"
    },
    {
        slug: "summon-champions", title: "Triệu hồi tướng", caption: "Checkpoint sau chia tay đầu: chọn tướng và đường rồi chốt. Hai phe lật tướng cùng lúc tại đúng ô trên bản đồ.", recommended: [], focus: "A:darius"
    },
    {
        slug: "viktor-e-jinx", title: "Viktor · Tia Tử Thần", caption: "E của Viktor đánh mọi tướng địch: Jinx và các đồng đội cùng nhận sát thương phép. Chọn E hoặc chơi tiếp theo ý bạn.", recommended: ["viktor_e"], focus: "A:viktor"
    },
    {
        slug: "draw-cards", title: "Rút hai lá bài", caption: "Đánh Rút Bài: từng lá bay từ bộ lên tay. Số lá trong bộ và trên tay thay đổi đúng lúc lá tới nơi.", recommended: ["draw"], focus: "A:ashe"
    },
    {
        slug: "blitz-steal", title: "Blitzcrank · Cướp bài", caption: "Q cướp lá Vàng từ tay đối phương về tay bạn. Lá giữ nguyên danh tính; Blitzcrank nhận Khiên từ nội tại.", recommended: ["blitzcrank_q"], focus: "A:blitzcrank"
    },
    {
        slug: "blitz-steal-skill", title: "Blitzcrank · Cướp và đổi chiêu", caption: "Q cướp chiêu Jinx: lá gốc vào mộ đối phương, bạn nhận Q/E của tướng đồng minh đang trên sân. Jinx chịu sát thương và Blitzcrank nhận Khiên.", recommended: ["blitzcrank_q"], focus: "A:blitzcrank"
    },
    {
        slug: "darius-e-pull", title: "Darius · Bắt Giữ", caption: "Bàn luôn đầy: E chọn Jinx ở đường khác, hoán đổi Jinx với Garen đang đối diện Darius, rồi gắn Chảy Máu và gây sát thương.", recommended: ["darius_e"], focus: "A:darius"
    },
    {
        slug: "chain-shield", title: "Chuỗi · Khiên trước đòn đánh", caption: "Darius đánh thường Annie. Annie E được phản ứng khi địch chỉ định Annie: mắt xích 2 tạo Khiên trước, rồi mắt xích 1 mới đánh trúng.", recommended: ["basic"], focus: "A:darius"
    },
    {
        slug: "chain-counter", title: "Chuỗi · Phản sát thương", caption: "Ashe bắn Jinx; Renata E có thể nối chuỗi để phản 40% sát thương nhận + sát thương chuẩn cố định. Đây là phản lại đòn gốc, không phải một đòn đánh mới.", recommended: ["basic"], focus: "B:renata"
    },
    {
        slug: "chain-four", title: "Chuỗi 4 · Giật chiêu và đáp lại", caption: "1 Annie Q → 2 Blitz E → 3 Leona E → 4 Blitz E (bản thứ hai). Giải quyết 4→3→2→1: giật lá 3 và 1, lá bị vô hiệu không tung hiệu ứng. Leona E được phản ứng khi địch đánh thường hoặc dùng một lá chiêu. Bạn được đổi quyết định hoặc bỏ qua.", recommended: ["annie_q",
            "leona_e"], focus: "A:annie"
    },
    {
        slug: "armor-and-mr", title: "Giáp, Kháng Phép và Khiên", caption: "Leona E cộng 60 Giáp + 60 Kháng Phép và hứng đòn hộ. Renata Q cộng Giáp cả đội, không tạo Khiên máu. Hãy so sánh bằng bảng chỉ số bên trái.", recommended: ["leona_e",
            "renata_q"], focus: "A:leona"
    },
    {
        slug: "spell-shield-mana", title: "Lux · Mana đội và Khiên", caption: "Checkpoint sau một E hợp lệ: đội đã tiêu 30 mana. Q hồi mana vào quỹ chung và tạo Khiên cho Lux; không bắn tia hay làm choáng địch.", recommended: ["lux_q"], focus: "A:lux"
    }
]

export const TEAM_A = ["darius",
    "viktor",
    "janna",
    "ornn",
    "ashe"]
export const TEAM_B = ["garen",
    "leona",
    "renata",
    "jinx",
    "lux"]
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export interface Scenario {
    spec: ExampleSpec;
    state: cg.GameState;
    opening: cg.GameEvent[];
}

export function scenarioSlug(path: string): string {
    const last = path.replace(/\/$/,
        "").split("/").at(-1) ?? "full-match"
    return last === "examples" ? "full-match" : last === "victor-e-jinx" ? "viktor-e-jinx" : last
}

function tutor(g: cg.Game, side: cg.Side, id: string) {
    g.tutor(side,
        (c) => c.id === id)
}

/** Checkpoint khai báo điều kiện bắt đầu; sát thương/hiệu ứng luôn do engine tính. */
export function createScenario(slug: string, seed = 710): Scenario {
    const spec = EXAMPLES.find((x) => x.slug === slug) ?? EXAMPLES[0]
    if (spec.slug === "full-match" || spec.slug === "summon-champions") {
        const start = cg.newGameEx(seed,
            TEAM_A,
            TEAM_B)
        return {
            spec, state: start.state, opening: spec.slug === "full-match" ? start.events : []
        }
    }
    const roleHero = spec.slug.startsWith("basic-") ? spec.focus?.split(":")[1] : undefined
    const teamA = spec.slug === "mana-spend" ? ["brand",
        "lux",
        "janna",
        "ornn",
        "ashe"] : roleHero ? [roleHero,
        ...TEAM_A.filter(hero => hero !== roleHero)].slice(0,
        5) : spec.slug === "khazix-jump" ? ["khazix",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug.startsWith("brand-") ? ["brand",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug === "swap-allies" ? ["ahri",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug === "teemo-mushrooms" ? ["teemo",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug.startsWith("blitz-steal") ? ["blitzcrank",
        "darius",
        "janna",
        "ornn",
        "ashe"] : spec.slug === "chain-four" ? ["annie",
        "leona",
        "darius",
        "ashe",
        "lux"] : spec.slug === "viktor-e-jinx" ? ["viktor",
        "darius",
        "janna",
        "ornn",
        "ashe"]
        : spec.slug === "armor-and-mr" ? ["leona",
            "renata",
            "viktor",
            "ashe",
            "darius"]
            : spec.slug === "spell-shield-mana" ? ["lux",
                "darius",
                "janna",
                "ornn",
                "ashe"]
                : spec.slug === "chain-counter" || spec.slug === "draw-cards" ? ["ashe",
                    "darius",
                    "janna",
                    "ornn",
                    "viktor"] : TEAM_A
    const teamB = spec.slug === "teemo-draw-mushroom" ? ["teemo",
        "garen",
        "jinx",
        "lux",
        "leona"] : spec.slug === "chain-four" ? ["blitzcrank",
        "renata",
        "jinx",
        "viktor",
        "garen"] : spec.slug === "chain-shield" ? ["annie",
        "jinx",
        "renata",
        "lux",
        "gangplank"]
        : spec.slug === "armor-and-mr" ? ["viktor",
            "garen",
            "jinx",
            "lux",
            "gangplank"] : TEAM_B
    let state = cg.newGame(seed,
        teamA,
        teamB)
    const g = new cg.Game(state)
    // Nhánh có bàn đã mở: không giả sát thương hoặc số HP, mọi tướng được gọi bằng Game.summon.
    state.round = 8
    state.turnNo = 15
    state.active = "A"
    state.phase = "main"
    delete state.blind
    state.actionsThisTurn = 0
    state.ownTurns = {
        A: 8, B: 7
    }
    for (const side of cg.SIDES) {
        const hand = state.players[side].hand.splice(0)
        for (const c of hand) g.toGrave(side,
            c,
            "checkpoint")
    }
    if (spec.slug === "mana-spend") {
        g.summon("A",
            "brand",
            2)
        g.summon("A",
            "lux",
            1)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "garen",
            3)
        tutor(g,
            "A",
            "brand_e")
        tutor(g,
            "A",
            "lux_e")
    } else if (roleHero) {
        g.summon("A",
            roleHero,
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "basic")
    } else if (spec.slug === "khazix-jump") {
        g.summon("A",
            "ornn",
            3)
        g.summon("A",
            "khazix",
            2)
        g.summon("A",
            "darius",
            1)
        g.summon("B",
            "jinx",
            1)
        g.summon("B",
            "garen",
            3)
        tutor(g,
            "A",
            "khazix_e")
        tutor(g,
            "A",
            "khazix_q")
    } else if (spec.slug.startsWith("brand-")) {
        g.summon("A",
            "brand",
            2)
        g.summon("B",
            "jinx",
            2)
        if (spec.slug === "brand-effects") {
            g.status(g.unit("B:jinx")!,
                "burn",
                1,
                {
                    v: 3, until: cg.FOREVER
                })
            tutor(g,
                "A",
                "brand_q")
        } else {
            g.summon("B",
                "garen",
                1)
            g.summon("B",
                "lux",
                3)
            tutor(g,
                "A",
                "brand_e")
            tutor(g,
                "A",
                "brand_r")
        }
    } else if (spec.slug === "swap-allies") {
        g.summon("A",
            "ahri",
            2)
        g.summon("A",
            "darius",
            1)
        g.summon("B",
            "jinx",
            1)
        tutor(g,
            "A",
            "ahri_r")
    } else if (spec.slug === "teemo-mushrooms") {
        g.summon("A",
            "teemo",
            2)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "garen",
            1)
        tutor(g,
            "A",
            "teemo_q")
        tutor(g,
            "A",
            "teemo_r")
    } else if (spec.slug === "teemo-draw-mushroom") {
        g.summon("A",
            "darius",
            2)
        g.summon("B",
            "teemo",
            2)
        tutor(g,
            "A",
            "draw")
        g.shuffleIn("A",
            [g.newCard({
                kind: "special", id: "mushroom", hero: "teemo", side: "B"
            })])
        g.moveToTop("A",
            c => c.id === "mushroom")
    } else if (spec.slug.startsWith("blitz-steal")) {
        g.summon("A",
            "blitzcrank",
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "blitzcrank_q")
        tutor(g,
            "B",
            spec.slug === "blitz-steal" ? "gold" : "jinx_q")
        // Six physical backs make the 6 → 5 transfer visible in the playable demo.
        for (let i = 0; i < 5; i++) g.giveCard("B",
            spec.slug === "blitz-steal" ? g.supportCard("gold") : g.skillCard("jinx",
                "B",
                "Q"),
            "hand")
    } else if (spec.slug === "chain-four") {
        g.summon("A",
            "annie",
            2)
        g.summon("A",
            "leona",
            1)
        g.summon("B",
            "blitzcrank",
            2)
        g.summon("B",
            "garen",
            1)
        tutor(g,
            "A",
            "annie_q")
        tutor(g,
            "A",
            "leona_e")
        tutor(g,
            "B",
            "blitzcrank_e")
        tutor(g,
            "B",
            "blitzcrank_e")
    } else if (spec.slug === "viktor-e-jinx") {
        g.summon("A",
            "viktor",
            2)
        g.summon("A",
            "darius",
            1)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "leona",
            1)
        g.summon("B",
            "lux",
            3)
        tutor(g,
            "A",
            "viktor_e")
    } else if (spec.slug === "darius-e-pull") {
        g.summon("A",
            "darius",
            2)
        g.summon("B",
            "garen",
            2)
        g.summon("B",
            "jinx",
            1)
        g.summon("B",
            "lux",
            3)
        tutor(g,
            "A",
            "darius_e")
    } else if (spec.slug === "chain-shield") {
        g.summon("A",
            "darius",
            2)
        g.summon("B",
            "annie",
            2)
        tutor(g,
            "A",
            "basic")
        tutor(g,
            "B",
            "annie_e")
    } else if (spec.slug === "chain-counter") {
        g.summon("A",
            "ashe",
            2)
        g.summon("B",
            "jinx",
            2)
        g.summon("B",
            "renata",
            1)
        tutor(g,
            "A",
            "basic")
    } else if (spec.slug === "armor-and-mr") {
        g.summon("A",
            "leona",
            2)
        g.summon("A",
            "renata",
            1)
        g.summon("B",
            "garen",
            2)
        g.summon("B",
            "viktor",
            1)
        tutor(g,
            "A",
            "leona_e")
        tutor(g,
            "B",
            "viktor_e")
        tutor(g,
            "B",
            "basic")
    } else if (spec.slug === "spell-shield-mana") {
        g.summon("A",
            "lux",
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "lux_e")
        tutor(g,
            "A",
            "lux_q")
        const action = cg.legalActions(state,
            "A").find((a) => a.t === "play" && state.players.A.hand.find((c) => c.uid === a.uid)?.id === "lux_e")
        if (!action) throw new Error("Lux checkpoint: không có E hợp lệ")
        state = cg.applyAction(state,
            action).state
    } else {
        g.summon("A",
            "ashe",
            2)
        g.summon("B",
            "jinx",
            2)
        tutor(g,
            "A",
            "draw")
    }
    state.phase = "main"
    state.chain = null
    return {
        spec, state, opening: []
    }
}

/** Bản trước hoạt ảnh mở tay: đảo đúng những lần rút opening đã được engine phát ra. */
export function beforeOpening(state: cg.GameState, events: cg.GameEvent[]): cg.GameState {
    const before = copy(state)
    for (const side of cg.SIDES) {
        const draws = events.filter((e): e is Extract<cg.GameEvent, { t: "draw" }> => e.t === "draw" && e.side === side && e.reason === "opening")
        const ids = new Set(draws.map((e) => e.card.uid))
        before.players[side].hand = before.players[side].hand.filter((c) => !ids.has(c.uid))
        before.players[side].deck.unshift(...draws.map((e) => e.card))
    }
    return before
}

export function recommendedAction(scenario: Scenario, state: cg.GameState, side: cg.Side): cg.Action | undefined {
    const legal = exampleLegalActions(state,
        side)
    if (scenario.spec.slug === "chain-four" && state.phase === "chain") return legal.find((a) => a.t === "chain" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === (side === "A" ? "leona_e" : "blitzcrank_e"))
    for (const id of scenario.spec.recommended) {
        const options = legal.filter((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === id && (scenario.spec.slug !== "chain-counter" || a.args?.target === "B:jinx"))
        // chiêu chọn số lượng (Teemo R: số Nấm) trình diễn với mức lớn nhất
        const amountOf = (a: cg.Action) => (a.t === "play" ? a.args?.amount ?? 0 : 0)
        const action = options.reduce<cg.Action | undefined>((best, a) => (!best || amountOf(a) > amountOf(best) ? a : best),
            undefined)
        if (action) return action
    }
    return undefined
}

/** Cùng điều kiện phản ứng canonical với trận mạng, không cấp quyền Quick riêng cho sandbox. */
export function exampleLegalActions(state: cg.GameState, side: cg.Side): cg.Action[] {
    return cg.legalActions(state,
        side)
}

/** Bot trình diễn chỉ chọn hành động hợp lệ; ưu tiên ghép đồ/rút bài rồi bot dễ của game. */
export function chooseExampleAction(state: cg.GameState, side: cg.Side): cg.Action {
    const legal = exampleLegalActions(state,
        side)
    if (!legal.length) throw new Error("Sandbox không có hành động hợp lệ")
    if (state.phase === "blind") {
        const chosen = state.players[side].heroes.find((id) => legal.some((a) => a.t === "summon" && a.hero === id))
        const summon = legal.find((a) => a.t === "summon" && a.hero === chosen)
        return summon ?? legal.find((a) => a.t === "ready") ?? legal[0]
    }
    if (state.phase === "chain") {
        const replies = legal.filter((a) => a.t === "chain")
        const priority = ["annie_e",
            "renata_e",
            "janna_e",
            "leona_e",
            "braum_q"]
        return replies.sort((a, b) => priority.indexOf(state.players[side].hand.find((c) => c.uid === (a as Extract<cg.Action, { t: "chain" }>).uid)?.id ?? "") - priority.indexOf(state.players[side].hand.find((c) => c.uid === (b as Extract<cg.Action, { t: "chain" }>).uid)?.id ?? ""))[0] ?? legal.find((a) => a.t === "pass") ?? legal[0]
    }
    const special = legal.find((a) => a.t === "upgrade") ?? legal.find((a) => a.t === "craft")
        ?? legal.find((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === "legend")
        ?? legal.find((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.id === "draw")
    if (special) return special
    const best = cg.chooseAction(state,
        side,
        "easy")
    if (best.t === "play" && state.players[side].hand.find((c) => c.uid === best.uid)?.id === "item") {
        // Giữ mảnh trên tay để có một lần ghép thật, thay vì lắp ngay từng mảnh lẻ.
        return legal.find((a) => a.t === "attack")
            ?? legal.find((a) => a.t === "play" && state.players[side].hand.find((c) => c.uid === a.uid)?.kind === "skill")
            ?? legal.find((a) => a.t === "end") ?? best
    }
    return best.t === "unequip" ? legal.find((a) => a.t === "end") ?? best : best
}

export function actionCaption(state: cg.GameState, action: cg.Action): string {
    const side = action.side === "A" ? "Xanh" : "Đỏ"
    if (action.t === "play" || action.t === "chain") {
        const card = state.players[action.side].hand.find((c) => c.uid === action.uid)
        const name = card ? cg.cardInfo(new cg.Game(state),
            card).name : action.uid
        return `${side} · ${action.t === "chain" ? "Nối chuỗi: " : ""}${name}`
    }
    if (action.t === "summon") return `${side} · gọi ${cg.getHero(action.hero)?.name ?? action.hero}`
    if (action.t === "attack") return `${side} · ${cg.getHero(state.units[action.actor].hero)?.name} đánh không cần lá`
    const labels: Partial<Record<cg.Action["t"], string>> = {
        end: "Kết thúc lượt", pass: "Bỏ qua nối chuỗi", ready: "Chốt gọi tướng", craft: "Ghép trang bị", upgrade: "Nâng cấp trang bị", discard: "Bỏ bài", unequip: "Tháo trang bị"
    }
    return `${side} · ${labels[action.t] ?? action.t}`
}
