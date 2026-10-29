// Kiểm tra bot: người chơi thụ động (chỉ úp tướng + hết lượt) đấu bot của server, xem bot có tự đánh và thắng không.
// Chạy server trước, rồi: npx tsx scripts/bot_test.ts [easy|hard]
import {
    Client
} from "colyseus.js"
import {
    ROLE_INFO, allHeroes, draftTaken, draftTurn, boardCapAt, boardCount, canSummonAt, formatMsg, heroOf, type ClientMessages, type RoomState,
} from "@starci/shared"

const level = process.argv[2] ?? "hard"
const wait = (ms: number) => new Promise((r) => setTimeout(r,
    ms))
const room = await new Client(process.env.SERVER ?? "ws://localhost:2567").create<RoomState>("duel",
    {
        name: "Người thử", bot: level, fast: true
    })
const errors: string[] = []
room.onMessage("hand",
    () => {}); room.onMessage("sets",
    () => {})
room.onMessage("error",
    ({ msg }) => errors.push(formatMsg(msg)))
room.send("ready")
await new Promise<void>((r) => room.onStateChange.once(() => r()))
const s = room.state
const t0 = Date.now()
const all: string[] = [], seen = new Set<string>()
const collect = () => { for (const l of [...s.log] as string[]) { const k = `${s.turn}|${l}`; if (!seen.has(k)) { seen.add(k); all.push(formatMsg(l)) } } }
while (s.phase !== "ended" && Date.now() - t0 < 240_000 && s.round < 4) {
    await wait(200)
    collect()
    if (s.phase === "draft" && draftTurn(s)?.side === "A") {
        const hero = allHeroes().find((h) => !draftTaken(s,
            h.id))
        if (hero) room.send("draft",
            {
                heroId: hero.id
            })
        await wait(300)
    }
    if (s.phase === "summon" && !s.players.get("A")?.summonReady) {
    // úp đủ số tướng được phép, mỗi tướng 1 ô hợp lệ đầu tiên
        const free = [...s.units.values()].filter((u) => u.owner === "A" && u.status !== "board" && u.readyTurn <= s.turn + 1)
        const need = Math.max(0,
            Math.min(s.summonCount,
                free.length,
                boardCapAt(s.round) - boardCount(s,
                    "A")))
        const taken = new Set<string>(), placements: ClientMessages["summonPick"]["placements"] = []
        for (const u of free) {
            if (placements.length >= need) break
            for (const lane of [2,
                1,
                3,
                0,
                4]) for (const row of ROLE_INFO[heroOf(u).role].rows) {
                if (placements.some((p) => p.unitId === u.id) || taken.has(`${lane}-${row}`) || !canSummonAt(s,
                    "A",
                    u.defId,
                    lane,
                    row)) continue
                taken.add(`${lane}-${row}`); placements.push({
                    unitId: u.id, lane, row
                })
            }
        }
        room.send("summonPick",
            {
                placements
            }); await wait(300)
    }
    if (s.phase === "playing" && s.activeSide === "A") { room.send("endTurn",
        {
        }); await wait(300) }
}
collect()
const log = all
const count = (re: RegExp) => log.filter((l) => re.test(l)).length
console.log(`bot=${level} · vòng ${s.round} · phase=${s.phase} · thắng=${s.winner || "chưa"} · Nhà A ${s.players.get("A")!.nexus} / B ${s.players.get("B")!.nexus}`)
console.log(`bot hạ tướng ${count(/bị hạ gục/)} · đánh trụ ${count(/^Trụ .*−/)} · bot dùng bài ${count(/Máy .* dùng /)} · đánh quái ${count(/ đánh (Bùa|Bầy|Baron|Chim)/)} · Trừng Phạt ${count(/Trừng Phạt lên/)} · hạ quái ${count(/ hạ (Bùa|Bầy|Baron|Chim)/)}`)
console.log("lỗi gửi về người thử:",
    errors.length)
console.log(log.slice(-8).join("\n"))
room.leave()
process.exit(0)
