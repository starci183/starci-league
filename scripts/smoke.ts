// Cho 2 bot đánh với nhau qua server thật để kiểm tra luật chạy trơn tru.
// Chạy server trước (npm run dev:server), rồi: npm run smoke
import {
    Client, Room
} from "colyseus.js"
import {
    CARDS, HandCard, ROLE_INFO, SKILLS, SOLO_PHASE_LANE, attackTargets, boardCapAt, boardCount,
    allHeroes, canAct, canCast, canSummonAt, draftTaken, draftTurn, cardTargets, distance, formatMsg, monsterAlive, monsterTargets, rangeOf, SMITE_DAMAGE, getPlay, heroOf, moveTargets, skillTargets,
    type ClientMessages, type RoomState, type UnitLike,
} from "@starci/shared"

const URL = process.env.SERVER ?? "ws://localhost:2567"
const MAX_TURNS = 120
const errors: string[] = []
const wait = (ms: number) => new Promise((r) => setTimeout(r,
    ms))

// bot A tạo phòng riêng (fast: bỏ nhịp chờ), bot B vào đúng phòng đó: không lẫn với người đang chờ Đấu nhanh
async function bot(name: string, roomId?: string) {
    const client = new Client(URL)
    const room: Room<RoomState> = roomId ? await client.joinById<RoomState>(roomId,
        {
            name
        }) : await client.create<RoomState>("duel",
            {
                name, fast: true, private: true
            })
    let hand: HandCard[] = []
    room.onMessage("hand",
        (h) => { hand = h })
    room.onMessage("sets",
        () => {})
    room.onMessage("error",
        ({ msg }) => errors.push(`${name}: ${formatMsg(msg)}`))
    room.send("ready")
    return {
        room, name, get hand() { return hand }
    }
}
type Bot = Awaited<ReturnType<typeof bot>>;

const mySide = (b: Bot) => [...b.room.state.players.values()].find((p) => p.sessionId === b.room.sessionId)!.side
const units = (s: RoomState) => [...s.units.values()]

/** Ô trống hợp lệ cho tướng (đấu đơn chỉ Trung Lộ) */
function freeSlot(s: RoomState, side: string, defId: string, taken: Set<string>, soloOnly: boolean) {
    for (const lane of soloOnly ? [SOLO_PHASE_LANE] : [2,
        1,
        3,
        0,
        4]) {
        for (const row of ROLE_INFO[heroOf({
            defId
        } as UnitLike).role].rows) {
            if (!taken.has(`${lane}-${row}`) && canSummonAt(s,
                side,
                defId,
                lane,
                row)) return {
                lane, row
            }
        }
    }
    return undefined
}

/** Mốc triệu hồi: chọn úp N tướng chưa ra sân */
async function summonPick(b: Bot) {
    const s = b.room.state, side = mySide(b), me = s.players.get(side)!
    if (me.summonReady) return
    const free = units(s).filter((u) => u.owner === side && u.status !== "board" && u.readyTurn <= s.turn + 1)
    const need = Math.max(0,
        Math.min(s.summonCount,
            free.length,
            boardCapAt(s.round) - boardCount(s,
                side)))
    const taken = new Set<string>()
    const placements: ClientMessages["summonPick"]["placements"] = []
    for (const u of free) {
        if (placements.length >= need) break
        const slot = freeSlot(s,
            side,
            u.defId,
            taken,
            s.round === 1)
        if (!slot) continue
        taken.add(`${slot.lane}-${slot.row}`)
        placements.push({
            unitId: u.id, ...slot
        })
    }
    b.room.send("summonPick",
        {
            placements
        })
    await wait(60)
}

async function act(b: Bot) {
    const s = b.room.state, side = mySide(b), me = s.players.get(side)!
    const send = async (type: string, msg: object) => { b.room.send(type,
        msg); await wait(70) }

    // hồi sinh / đưa tướng ra nếu sân còn chỗ
    for (const u of units(s).filter((x) => x.owner === side && x.status !== "board" && x.readyTurn <= s.turn)) {
        if (boardCount(s,
            side) >= boardCapAt(s.round)) break
        const slot = freeSlot(s,
            side,
            u.defId,
            new Set(),
            false)
        if (slot) await send("summon",
            {
                unitId: u.id, ...slot
            })
    }
    // bài trên tay
    for (const c of [...b.hand]) {
        const card = CARDS[c.defId]
        if (card.kind === "item" && me.mana >= card.mana) {
            const u = units(s).find((x) => x.owner === side && x.status === "board" && x.items.length < 5)
            if (u) await send("equip",
                {
                    uid: c.uid, unitId: u.id
                })
        } else if (card.kind === "spell" && me.mana >= 1 && Math.random() < 0.3) {
            // hù: úp phép xuống, lượt sau mới lật
            const lane = [0,
                1,
                2,
                3,
                4].find((l) => !me.traps[l])
            if (lane !== undefined) await send("set",
                {
                    uid: c.uid, lane
                })
        } else if (getPlay(card.id) && "mana" in card && me.mana >= card.mana) {
            // phép / chỉ số / đánh thường: lá cần mục tiêu thì chọn mục tiêu hợp lệ đầu tiên
            const play = getPlay(card.id)!
            const t = play.target === "none" ? undefined : cardTargets(s,
                side,
                card.id)[0]
            if (play.target === "none" || t) await send("play",
                {
                    uid: c.uid, targetId: t
                })
        } else if (card.kind === "trap" && me.mana >= 1) {
            const lane = [0,
                1,
                2,
                3,
                4].find((l) => !me.traps[l])
            if (lane !== undefined) await send("set",
                {
                    uid: c.uid, lane
                })
        }
    }
    // ghép 2 thẻ mảnh trong kho thành thẻ huyền thoại (không có chợ)
    while (me.bench.length >= 2 && b.hand.length < 8) {
        const before = me.bench.length
        await send("craft",
            {
                a: 0, b: 1
            })
        if (me.bench.length === before) break
    }
    // tướng: tung chiêu rồi đánh
    for (const u of units(s)) {
        if (u.owner !== side || u.status !== "board") continue
        for (const skillId of heroOf(u).skills) {
            if (!canCast(s,
                u,
                skillId)) continue
            const sk = SKILLS[skillId]
            const targetId = sk.target === "none" ? undefined : skillTargets(s,
                u,
                skillId)[0]
            if (sk.target !== "none" && !targetId) continue
            await send("skill",
                {
                    unitId: u.id, skillId, targetId
                }) // combo: dùng mọi chiêu có thể
        }
        // chưa ai trong tầm: đi 1 ô lại gần tướng địch gần nhất
        if (u.status === "board" && !attackTargets(s,
            u).length) {
            const foes = units(s).filter((x) => x.owner !== side && x.status === "board")
            const score = (c: { lane: number; row: string }) => Math.min(99,
                ...foes.map((f) => distance({
                    owner: side, ...c
                },
                f)))
            const best = moveTargets(s,
                u).sort((a, b) => score(a) - score(b))[0]
            if (best && score(best) < score(u)) await send("move",
                {
                    unitId: u.id, ...best
                })
        }
        const t = u.status === "board" ? attackTargets(s,
            u)[0] : undefined
        if (t) await send("attack",
            {
                unitId: u.id, target: t
            })
        // không ai để đánh: đánh quái rừng trong tầm
        else if (u.status === "board" && !u.attacked && canAct(s,
            u)) {
            const lane = monsterTargets(s,
                u,
                rangeOf(u))[0]
            if (lane !== undefined) await send("attackMonster",
                {
                    unitId: u.id, lane
                })
        }
    }
    // Trừng Phạt quái sắp chết (cướp Baron, bùa)
    const mine = s.players.get(side)!
    for (const m of [...s.monsters]) {
        if (monsterAlive(m) && m.hp <= SMITE_DAMAGE && mine.smiteRound <= s.round) { await send("smite",
            {
                lane: m.lane
            }); break }
    }
    await send("endTurn",
        {
        })
}

const a = await bot("Bot A")
const b = await bot("Bot B",
    a.room.roomId)
await wait(300)
const s = a.room.state
let loops = 0
const seen = new Set<string>()
const counts: Record<string, number> = {
}
const KEYS: [string, RegExp][] = [["lật bài",
    /lật:/],
["hạ gục",
    /bị hạ gục/],
["thưởng mảnh",
    /vàng và thẻ/],
["đánh Nhà",
    /^Nhà của .*−/],
["đánh trụ",
    /^Trụ .*−/],
["trụ sập",
    /đã sập/],
["bẫy nổ",
    /kích hoạt ở/],
["dùng bài",
    / dùng /],
["buff",
    / nhận (Kiệt|Cuồng|Phù|Bùa|Hồi|Chí|Kết|Nhịp|Xuyên|Baron)/],
["soi bài",
    /soi bài úp/],
["cường hóa",
    /^Cường hóa /],
["đánh quái",
    / đánh (Bùa|Bầy|Baron|Chim)/],
["hạ quái",
    / hạ (Bùa|Bầy|Baron|Chim)/],
["Trừng Phạt",
    /Trừng Phạt lên/],
["Baron",
    /Bùa Baron \(|CƯỚP Baron/],
["ghép đồ",
    /ghép/],
["đeo đồ",
    /đeo /],
["chí mạng",
    /CHÍ MẠNG/],
["hồi sinh/đưa ra",
    /đưa .* ra/]]
while (s.phase !== "ended" && s.turn < MAX_TURNS && loops < 600) {
    loops++
    // cấm/chọn: bên tới lượt chọn tướng đầu tiên còn trống
    if (s.phase === "draft") {
        const turn = draftTurn(s)
        const who = turn && (mySide(a) === turn.side ? a : b)
        const hero = allHeroes().find((h) => !draftTaken(s,
            h.id))
        if (who && hero) who.room.send("draft",
            {
                heroId: hero.id
            })
        await wait(80); continue
    }
    if (s.phase === "summon") { await summonPick(a); await summonPick(b); await wait(150); continue }
    if (s.phase !== "playing") { await wait(100); continue }
    const active = s.activeSide === mySide(a) ? a : b
    const before = s.turn
    await act(active)
    for (let i = 0; i < 60 && s.turn === before && s.phase === "playing"; i++) await wait(10)
    for (const line of ([...s.log] as string[]).map(formatMsg)) {
        const key = `${before}|${line}`
        if (seen.has(key)) continue
        seen.add(key)
        for (const [k,
            re] of KEYS) if (re.test(line)) counts[k] = (counts[k] ?? 0) + 1
    }
}
const nexus = (side: string) => s.players.get(side)!.nexus
console.log(`Kết thúc ở vòng ${s.round} (lượt ${s.turn}) · phase=${s.phase} · thắng=${s.winner || "chưa"}`)
console.log(`Nhà A: ${nexus("A")} · Nhà B: ${nexus("B")} · trên sân: ${units(s).filter((u) => u.status === "board").length}`)
console.log("Sự kiện:",
    JSON.stringify(counts))
console.log("Log cuối:\n  " + ([...s.log] as string[]).slice(-10).map(formatMsg).join("\n  "))
const unexpected = errors.filter((e) => !/Không đủ|Chưa dùng|đủ số tướng|Tay đã đầy|Đang chờ lật bài|Không phải lúc lật bài|đã chọn rồi|Trừng Phạt hồi|Cần 1 tướng mình cách|Không có quái|Chưa tới lượt|Không phải lúc cấm\/chọn/.test(e))
console.log(`Lỗi từ server: ${errors.length} (bất thường: ${unexpected.length})`)
unexpected.slice(0,
    10).forEach((e) => console.log("  " + e))
await a.room.leave(); await b.room.leave()
process.exit(unexpected.length ? 1 : 0)
