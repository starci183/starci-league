// Khung dùng chung cho scripts/card_tests_kits_*.ts: dựng trận, đánh lá, bảng kết quả (định dạng card_tests.ts đọc được).
import {
    cg
} from "@starci/shared"

export type St = ReturnType<typeof cg.newGame>
export type Act = Parameters<typeof cg.applyAction>[1]
export type Ev = ReturnType<typeof cg.applyAction>["events"]
export type S = "A" | "B"
export const { Game } = cg
// Test kit dùng nhiều lá cùng chiêu trong 1 lượt; giới hạn lượt dùng có test riêng ở card_tests_limits.ts
cg.RULES.skillLimits = false

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)
const VERBOSE = process.argv.includes("--verbose")
const results: { group: string; name: string; res: "PASS" | "FAIL"; note?: string }[] = []
let group = ""
export const G = (name: string) => { group = name }
export function test(name: string, fn: () => void) {
    if (only && !`${group} ${name}`.toLowerCase().includes(only.toLowerCase())) return
    try { fn(); results.push({
        group, name, res: "PASS"
    }) } catch (e) {
        results.push({
            group, name, res: "FAIL", note: (e as Error).message.split("\n").slice(0,
                3).join(" | ") + (VERBOSE ? `\n${(e as Error).stack}` : "")
        })
    }
}
/** In bảng và thoát; gọi ở cuối file test */
export function report(): never {
    let last = ""
    for (const r of results) {
        if (r.group !== last) { console.log(`\n== ${r.group} ==`); last = r.group }
        console.log(`${r.res}  ${r.name}${r.note ? `\n        -> ${r.note}` : ""}`)
    }
    const c = (k: string) => results.filter((r) => r.res === k).length
    console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
    process.exit(c("FAIL") ? 1 : 0)
}

const FILL = ["braum",
    "zed",
    "teemo",
    "viktor",
    "soraka",
    "garen"]
export type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number; round?: number; modes?: Record<string, string> }
/** Trận dựng sẵn: mỗi bên 5 tướng, các tướng khai báo đứng thẳng vào đường, tay rỗng, đang là bước chính lượt A, mọi đường đã mở (round 19) */
export function mk(o: Setup = {
}): St {
    const a = Object.keys(o.A ?? {
        }), b = Object.keys(o.B ?? {
        })
    const fill = (x: string[]) => [...x,
        ...FILL.filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(o.seed ?? 20261101,
        fill(a),
        fill(b))
    s.round = o.round ?? 19
    s.blind = undefined
    const g = new Game(s)
    for (const [side,
        m] of [["A",
            o.A ?? {
            }],
        ["B",
            o.B ?? {
            }]] as const) for (const [h,
        lane] of Object.entries(m)) g.summon(side,
        h,
        lane,
        o.modes?.[h])
    s.players.A.hand = []; s.players.B.hand = []
    s.phase = "main"; s.active = "A"
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    s.teamMana = {
        A: 200, B: 200
    }
    return s
}
export const gm = (s: St) => new Game(s)
export const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
export const hp = (s: St, side: S, hero: string) => u(s,
    side,
    hero).hp
export const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
export const sup = (s: St, id: cg.SupportId, item?: string) => { const c = gm(s).supportCard(id); if (item) c.item = item; return c }
export function act(s: St, a: Act): { s: St; ev: Ev } {
    const r = cg.applyAction(s,
        a)
    return {
        s: r.state, ev: r.events
    }
}
/** Đặt lá lên tay rồi đánh; tự Bỏ qua cửa sổ Chuỗi của đối thủ nếu `autoPass` (mặc định có) */
export function cast(s0: St, side: S, card: cg.Card, args: cg.PlayArgs = {
}, autoPass = true): { s: St; ev: Ev } {
    s0.players[side].hand.push(card)
    let r = act(s0,
        {
            t: "play", side, uid: card.uid, args
        })
    const ev = [...r.ev]
    while (autoPass && r.s.phase === "chain" && r.s.chain) {
        r = act(r.s,
            {
                t: "pass", side: r.s.chain.priority
            })
        ev.push(...r.ev)
    }
    return {
        s: r.s, ev
    }
}
/** Lá Đánh Thường: actor đánh target, tự Bỏ qua Chuỗi */
export const basic = (s: St, side: S, actor: string, target: string) => cast(s,
    side,
    sup(s,
        "basic"),
    {
        actor, target
    })
/** Hết lượt, tự chốt bước gọi tướng nếu có */
export function endTurn(s0: St): { s: St; ev: Ev } {
    let r = act(s0,
        {
            t: "end", side: s0.active
        })
    const ev = [...r.ev]
    for (let i = 0; i < 40 && r.s.phase === "blind"; i++) {
        const side = cg.actorsOf(r.s)[0]
        const la = cg.legalActions(r.s,
            side)
        r = act(r.s,
            la.find((x) => x.t === "ready") ?? la[0])
        ev.push(...r.ev)
    }
    // Test bộ chiêu không xét bước: qua Standby rồi bỏ step để Đánh Thường và chiêu dùng xen kẽ (card_tests_kits_phase.ts test riêng bước)
    if (r.s.step === "standby") { r = act(r.s,
        {
            t: "step", side: r.s.active
        }); ev.push(...r.ev) }
    r.s.step = undefined
    return {
        s: r.s, ev
    }
}
export const dmgOn = (ev: Ev, id: string) => ev.filter((e) => e.t === "damage" && e.target === id).reduce((n, e) => n + (e as Extract<Ev[number], { t: "damage" }>).amount,
    0)
export const statusOn = (s: St, side: S, hero: string, id: string) => u(s,
    side,
    hero).statuses[id]
