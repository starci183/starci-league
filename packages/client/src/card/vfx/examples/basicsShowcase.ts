// Demo đòn đánh thường của 33 tướng trên bàn 5 tướng mỗi bên, đổi đội ngay trên bàn sau mỗi trang. Chỉ là hình ảnh: đòn chạy đúng đường dispatch của trận thật, không đổi engine.
import {
    cg
} from "@starci/shared"
import {
    unitPt
} from "../../anim/helpers"
import {
    styleFor, vfxImpact, vfxTravel
} from "../dispatch"
import {
    sleep
} from "../particles"
import {
    createScenario, BASIC_ATTACK_PAGES, basicAttackTeams
} from "./scenarios"
import {
    closeHits, landDamage, openHits
} from "./showcaseHits"

/** Tên đòn hiện cạnh tên tướng */
const WEAPON: Record<string, string> = {
    aatrox: "Đại kiếm Darkin", ahri: "Cầu hồ ly", annie: "Giọt lửa", ashe: "Tên băng", blitzcrank: "Nắm đấm thép", brand: "Cầu lửa", braum: "Khiên cửa hầm",
    darius: "Rìu lớn", gangplank: "Gươm hải tặc", garen: "Đại kiếm", janna: "Cầu gió", jinx: "Súng máy", katarina: "Dao găm", khazix: "Móng vuốt", kogmaw: "Nước bọt axit",
    leona: "Kiếm mặt trời", lissandra: "Mảnh băng", lux: "Cầu sáng", malphite: "Nắm đấm đá", missfortune: "Súng đôi", nami: "Cầu nước", ornn: "Búa rèn", qiyana: "Lưỡi Ixtal",
    renata: "Bình hoá chất", soraka: "Sao sáng", teemo: "Phi tiêu thổi", tristana: "Đại bác", twistedfate: "Lá bài", vayne: "Nỏ bạc", velkoz: "Xung plasma", viktor: "Tia hextech",
    yorick: "Xẻng đào mộ", zed: "Phi tiêu lưỡi"
}

/** Một đòn: bay tới, chạm là trừ máu và nổ trúng cùng lúc; chờ tới lúc chạm, không chờ đuôi hạt */
async function attack(side: cg.Side, hero: string, foe: string) {
    const from = `${side}:${hero}`
    const to = `${side === "A" ? "B" : "A"}:${foe}`
    const def = cg.getHero(hero)
    const kind = def?.damage ?? "physical"
    const style = styleFor(undefined,
        kind,
        false,
        hero)
    await vfxTravel(style,
        unitPt(from),
        unitPt(to))
    landDamage(to,
        def?.atk ?? 70,
        kind)
    await Promise.race([vfxImpact(style,
        unitPt(to)),
    sleep(450)])
}

export async function runBasicsShowcase(say: (text: string) => void) {
    const game = window.starciExamples
    if (!game) return
    openHits()
    try {
        for (let page = 0; page < BASIC_ATTACK_PAGES; page++) {
            if (page) {
                closeHits()
                game.showState(createScenario("basic-attacks",
                    game.state.seed,
                    page).state)
                // chờ React vẽ đội mới để lấy đúng toạ độ lá tướng
                await sleep(450)
                openHits()
            }
            const { a, b, attackers } = basicAttackTeams(page)
            for (const { side, lane } of attackers) {
                const hero = (side === "A" ? a : b)[lane]
                say(`${cg.getHero(hero)?.name ?? hero} · ${WEAPON[hero] ?? "Đánh thường"}`)
                await attack(side,
                    hero,
                    (side === "A" ? b : a)[lane])
                await sleep(620)
            }
        }
    } finally {
        closeHits()
    }
}
