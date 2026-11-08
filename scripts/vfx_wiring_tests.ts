// Kiểm tra dây nối giữa sự kiện engine và cue riêng của từng tướng (vfx/heroCues.ts, vfx/dispatch.ts, anim/plan.ts).
// Không DOM, không GPU: heroCues thuần dữ liệu. Chạy: npx tsx scripts/vfx_wiring_tests.ts
import {
    strict as assert
} from "node:assert"
import {
    readFileSync
} from "node:fs"
import {
    cg
} from "@starci/shared"
import {
    annotate, cuesFor, handFlight, mayCue, playCues, resetCueState, tfKind, type CueEnv, type CueSet
} from "../packages/client/src/card/vfx/heroCues"
import * as map from "../packages/client/src/card/vfx/heroMap"
import {
    styleFor
} from "../packages/client/src/card/vfx/dispatch"
import {
    TF_CARD
} from "../packages/client/src/card/vfx/fx_twistedfate"
import {
    vfxNames
} from "../packages/client/src/card/vfx/types"
import "../packages/client/src/card/vfx/catalog"
import {
    cast, endTurn, mk, sup, u, act, type St
} from "./kit_test_util"

type Ev = cg.GameEvent
let passed = 0
function test(name: string, fn: () => void) {
    resetCueState()
    fn()
    passed++
    console.log(`PASS ${name}`)
}
const env = (s: St): CueEnv => ({
    units: s.units, me: "A"
})
/** Chạy heroCues đúng như plan.ts: annotate cả lô rồi hỏi từng sự kiện kèm lá và tướng ra chiêu */
function sets(s: St, events: Ev[]): { e: Ev; set: CueSet }[] {
    annotate(events,
        s.units)
    let card: cg.Card | undefined
    let caster: string | undefined
    return events.map((e, index) => {
        if (e.t === "play") { card = e.card; caster = e.args?.actor ?? `${e.side}:${e.card.hero}` }
        return {
            e, set: cuesFor(e,
                {
                    env: env(s), card, caster, span: events, index
                })
        }
    })
}
const registered = new Set(vfxNames())

test("Rumble nằm trong HEROES và BASIC, Lá Tái Chế dùng cast của Rumble với đạn rỉ sét màu chiêu gốc",
    () => {
        assert.ok(map.hasHeroVfx("rumble"))
        assert.equal(map.heroBasicVfx("rumble").travel,
            map.RUMBLE_VFX.basic.travel)
        assert.equal(map.skillVfx("rumble",
            "e").block,
        "rumbleScrapBlock")
        const darius: cg.Card = {
            uid: "r1", kind: "skill", id: "darius_q", hero: "rumble", side: "A", data: {
                recycled: "darius"
            }
        }
        const style = styleFor(darius,
            "magic",
            false,
            "rumble")
        assert.equal(style.cast,
            map.skillVfx("rumble",
                "p").impact,
            "cast = cue Tái Chế của Rumble")
        assert.equal(style.travel,
            map.RUMBLE_VFX.recycle.cleave.travel,
            "Darius là cận chiến nên dùng nhát chém sắt vụn")
        assert.equal(style.color,
            map.skillVfx("darius",
                "q").color,
            "màu lấy từ chiêu gốc")
        assert.ok(style.recycled)
        const lux: cg.Card = {
            ...darius, id: "lux_e", data: {
                recycled: "lux"
            }
        }
        assert.equal(styleFor(lux,
            "magic",
            false,
            "rumble").travel,
        map.RUMBLE_VFX.recycle.bolt.travel)
        // Chọn lá từ Mộ: lá bay lên tay bằng cue P.cast của Rumble, mang ảnh chiêu gốc
        const flight = handFlight({
            t: "create", side: "A", zone: "hand", card: darius
        },
        {
            units: {
            }, me: "A"
        })
        assert.equal(flight?.name,
            map.skillVfx("rumble",
                "p").cast)
        assert.equal(flight?.icon,
            map.skillIcon("darius",
                "q"))
    })

test("Khiên đỡ đòn dùng block của tướng đã cho Khiên, không có block thì rơi về cú trúng mặc định",
    () => {
        const s = mk({
            A: {
                lux: 2, braum: 1
            }, B: {
                jinx: 2
            }
        })
        const g = new cg.Game(s)
        const lux = u(s,
                "A",
                "lux"), braum = u(s,
                "A",
                "braum"), jinx = u(s,
                "B",
                "jinx")
        g.shield(lux,
            lux,
            100)
        g.shield(braum,
            braum,
            100)
        g.damage(jinx,
            lux,
            40,
            "physical",
            {
                tag: "attack"
            })
        g.damage(jinx,
            braum,
            40,
            "physical",
            {
                tag: "attack"
            })
        const out = sets(s,
            g.events)
        const hits = out.filter((x) => x.e.t === "damage")
        const onLux = hits.find((x) => x.e.t === "damage" && x.e.target === lux.id)!
        assert.ok(onLux.e.t === "damage" && onLux.e.absorbed > 0)
        const prism = onLux.set.cues.filter((c) => c.name === map.skillVfx("lux",
            "q").block)
        assert.equal(prism.length,
            1,
            "Lux Q cho Khiên nên luxPrismBlock")
        assert.ok(onLux.set.block)
        assert.deepEqual(prism[0].to,
            [{
                unit: jinx.id
            }],
            "mảnh văng về phía kẻ đánh")
        const onBraum = hits.find((x) => x.e.t === "damage" && x.e.target === braum.id)!
        assert.ok(!onBraum.set.cues.some((c) => c.name === map.skillVfx("lux",
            "q").block),
        "Braum không khai báo block: dùng cú trúng mặc định")
        assert.ok(!onBraum.set.block)
    })

test("Mọi tướng có block: Khiên của chính tướng đó đỡ đòn thì phát đúng block của nó",
    () => {
        let checked = 0
        for (const [hero,
            v] of map.heroVfxEntries()) {
            const key = (["q",
                "e",
                "r"] as const).find((k) => v[k].block)
            if (!key || hero === "lissandra") continue
            const attacker = hero === "jinx" ? "garen" : "jinx"
            const s = mk({
                A: {
                    [hero]: 2
                }, B: {
                    [attacker]: 2
                }
            })
            const g = new cg.Game(s)
            const self = u(s,
                "A",
                hero)
            g.shield(self,
                self,
                200)
            g.damage(u(s,
                "B",
                attacker),
            self,
            30,
            "physical",
            {
                tag: "attack"
            })
            const hit = sets(s,
                g.events).find((x) => x.e.t === "damage")!
            assert.ok(hit.set.cues.some((c) => c.name === v[key].block),
                `${hero}: ${v[key].block}`)
            assert.ok(hit.set.block)
            checked++
            resetCueState()
        }
        assert.ok(checked >= 6,
            `đã kiểm ${checked} tướng có block`)
        // Lissandra R: đòn nhắm vào Lissandra đang đóng băng bản thân bị huỷ, lực tản theo khối băng
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                jinx: 2
            }
        })
        s.units["A:lissandra"].statuses.stasis = {
            until: 99, at: 0, v: 1
        } as cg.StatusInst
        const events: Ev[] = [{
            t: "chainAdd", side: "B", n: 1, kind: "attack", actor: "B:jinx", targets: ["A:lissandra"]
        },
        {
            t: "chainCancel", n: 1, side: "B"
        }]
        const out = sets(s,
            events)
        assert.equal(out[1].set.cues[0].name,
            map.skillVfx("lissandra",
                "r").block)
    })

test("via: Nami Q đi từ bước nảy trước, nguồn của bước N là đích của bước N-1",
    () => {
        const s = mk({
            A: {
                nami: 2, janna: 1, soraka: 3
            }, B: {
                jinx: 2, garen: 1, lux: 3
            }
        })
        const q = cast(s,
            "A",
            new cg.Game(s).skillCard("nami",
                "A",
                "Q"),
            {
                target: "A:janna"
            })
        const out = sets(s,
            q.ev)
        const hops = out.filter((x) => (x.e.t === "heal" || x.e.t === "damage") && x.e.via)
        assert.ok(hops.length >= 2,
            "Q có ít nhất hai bước nảy")
        for (const hop of hops) {
            const lead = hop.set.cues.find((c) => c.kind === "lead")
            assert.ok(lead,
                "mỗi bước nảy là một cue lead")
            assert.deepEqual(lead.from,
                {
                    unit: (hop.e as { via: string }).via
                })
            assert.deepEqual(lead.to,
                [{
                    unit: (hop.e as { target: string }).target
                }])
            assert.equal(lead.name,
                map.skillVfx("nami",
                    "q").travel)
        }
        // chuỗi nảy nối đuôi: nguồn bước sau là đích của một bước trước (hoặc Nami ở bước đầu)
        const seen = new Set(["A:nami"])
        for (const hop of hops) {
            const via = (hop.e as { via: string }).via
            assert.ok(seen.has(via),
                `bước nảy phải bắt đầu từ ${via}`)
            seen.add((hop.e as { target: string }).target)
        }
    })

test("ability: Tristana kích nổ chạy ngòi cháy tới Bom, cú nổ mang số Bom; Gangplank Úp Lá không lộ lá",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                jinx: 2, garen: 1
            }
        })
        const g = new cg.Game(s)
        g.stack(s.units["B:jinx"],
            "tri_bomb",
            3)
        const r = act(s,
            {
                t: "ability", side: "A", unit: "A:tristana", id: "tri_detonate", args: {
                    target: "B:jinx"
                }
            })
        const out = sets(s,
            r.ev)
        const ability = out.find((x) => x.e.t === "ability")!
        const fuse = ability.set.cues[0]
        assert.equal(fuse.name,
            map.skillVfx("tristana",
                "p").travel)
        assert.equal(fuse.kind,
            "lead")
        assert.equal(fuse.amount,
            3)
        assert.deepEqual(fuse.to,
            [{
                unit: "B:jinx"
            }])
        const blast = out.find((x) => x.e.t === "damage")!
        assert.equal(blast.set.impact?.name,
            map.skillVfx("tristana",
                "p").impact)
        assert.equal(blast.set.impact?.amount,
            3,
            "ctx.amount = số Bom trước khi nổ")

        const t = mk({
            A: {
                gangplank: 2
            }, B: {
                jinx: 2
            }
        })
        const stash = sup(t,
            "basic")
        t.players.A.hand.push(stash)
        const w = act(t,
            {
                t: "ability", side: "A", unit: "A:gangplank", id: "gp_stash", args: {
                    pick: stash.uid
                }
            })
        const placed = sets(t,
            w.ev)
        const place = placed.find((x) => x.e.t === "ability")!.set.cues[0]
        assert.equal(place.name,
            map.GANGPLANK_VFX.place)
        assert.deepEqual(place.to,
            [{
                unit: "A:gangplank", lane: 5
            }],
            "cắm xuống ô phụ")
        assert.equal(place.icon,
            undefined,
            "không có ảnh lá")
        assert.ok(!JSON.stringify(placed.map((x) => x.set)).includes(stash.uid),
            "không rò UID lá úp")
        const token = placed.find((x) => x.e.t === "summonToken")
        assert.ok(token)
        assert.ok(!token.set.cues.some((c) => c.name === map.GANGPLANK_VFX.place),
            "Thùng vừa úp không bay lá thêm lần nữa")
        assert.ok(token.set.cues.some((c) => c.name === map.GANGPLANK_VFX.fuse && c.hold),
            "ngòi cháy bám Thùng tới khi nhả")
    })

test("ctx.amount: loại lá TF, số Bom, Đói, Hồn Ma và nửa số tầng rụng khi tướng gục",
    () => {
        const card = (kind: string, id: string): cg.Card => ({
            uid: id, kind: kind as cg.Card["kind"], id, side: "A"
        })
        assert.equal(tfKind(card("skill",
            "zed_q")),
        TF_CARD.red)
        assert.equal(tfKind(card("support",
            "gold")),
        TF_CARD.gold)
        assert.equal(tfKind(card("support",
            "item")),
        TF_CARD.gold)
        assert.equal(tfKind(card("support",
            "draw")),
        TF_CARD.blue)

        const s = mk({
            A: {
                twistedfate: 2, tristana: 1, kogmaw: 3, yorick: 4
            }, B: {
                jinx: 2, garen: 1
            }
        })
        s.players.A.deck.unshift(card("skill",
            "zed_q"))
        const q = cast(s,
            "A",
            new cg.Game(s).skillCard("twistedfate",
                "A",
                "Q"),
            {
                target: "B:jinx"
            })
        const tf = sets(s,
            q.ev)
        const hit = tf.find((x) => x.e.t === "damage" && x.e.target === "B:jinx")!
        assert.equal(hit.set.impact?.amount,
            TF_CARD.red,
            "lá kỹ năng lật được là lá đỏ")

        const units = s.units
        const stack = (unit: string, key: string, value: number): Ev => ({
            t: "stack", unit, key, value
        })
        // Bom: nhận thêm mang số mới; carrier gục thì nửa Bom rơi, amount là số rơi
        units["B:jinx"].stacks.tri_bomb = 4
        let out = sets(s,
            [stack("B:jinx",
                "tri_bomb",
                5)])
        assert.equal(out[0].set.cues.find((c) => c.name === map.TRISTANA_BOMB_ADD)?.amount,
            5)
        resetCueState()
        out = sets(s,
            [stack("B:jinx",
                "tri_bomb",
                2),
            {
                t: "kill", target: "B:jinx"
            }])
        const shed = out[0].set.cues.find((c) => c.name === map.TRISTANA_BOMB_SHED)
        assert.equal(shed?.amount,
            2,
            "4 Bom gục còn 2 = rơi 2")
        // Đói của Kog'Maw, Hồn Ma của Yorick
        out = sets(s,
            [stack("A:kogmaw",
                "hunger",
                3)])
        assert.equal(out[0].set.cues[0].amount,
            3)
        out = sets(s,
            [stack("A:yorick",
                "yorick_soul",
                7)])
        assert.equal(out[0].set.cues.find((c) => c.name === map.YORICK_VFX.gain)?.amount,
            7)
        assert.ok(out[0].set.cues.some((c) => c.name === map.YORICK_VFX.aura && c.hold),
            "aura Hồn Ma bám lá qua hold")
        // Đòn đánh của Kog'Maw mang số Đói lúc đầu lô
        units["A:kogmaw"].stacks.hunger = 4
        const bite = sets(s,
            [{
                t: "damage", src: "A:kogmaw", target: "B:jinx", amount: 10, hpLost: 10, absorbed: 0, kind: "physical", tag: "attack", hp: 100
            }])
        assert.equal(bite[0].set.cues.find((c) => c.name === map.skillVfx("kogmaw",
            "p").extra)?.amount,
        4)
    })

test("Status: cue riêng của tướng thay cue Choáng/Câm Lặng/Mù chung, statusEnd nhả hold",
    () => {
        const s = mk({
            A: {
                leona: 2, jinx: 1, garen: 3, ashe: 4
            }, B: {
                lux: 2
            }
        })
        const status = (id: string, src: string, target = "B:lux"): Ev => ({
            t: "status", target, id, turns: 1, v: 1, src
        })
        const first = (events: Ev[]) => sets(s,
            events)[0].set
        assert.equal(first([status("stun",
            "A:leona")]).cues[0].name,
        map.skillVfx("leona",
            "q").extra)
        assert.equal(first([status("silence",
            "A:garen")]).cues[0].name,
        map.skillVfx("garen",
            "q").extra)
        const blind = first([status("blind",
            "A:jinx")]).cues[0]
        assert.equal(blind.name,
            map.skillVfx("jinx",
                "e").extra)
        assert.ok(blind.hold)
        const end = sets(s,
            [{
                t: "statusEnd", target: "B:lux", id: "blind"
            }])[0].set
        assert.deepEqual(end.release,
            [blind.hold],
            "hold nhả đúng khoá")
        assert.deepEqual(first([status("stun",
            "A:ashe")]).cues.map((c) => c.name),
        [map.skillVfx("ashe",
            "r").extra])
        // trạng thái mới đổi tên: ashe_q, mf_exposed, tri_q, vulnerable
        assert.equal(first([status("ashe_q",
            "A:ashe",
            "A:ashe")]).cues[0].name,
        map.skillVfx("ashe",
            "q").extra)
        assert.equal(first([status("mf_exposed",
            "A:garen")]).cues[0].name,
        map.skillVfx("missfortune",
            "e").extra)
        assert.equal(first([status("tri_q",
            "A:garen",
            "A:garen")]).cues[0].name,
        map.skillVfx("tristana",
            "q").extra)
        assert.equal(first([status("vulnerable",
            "A:garen")]).cues[0].name,
        "namiExpose")
        // Hết Tàng Hình của Kha'Zix, hết giờ Chảy Máu
        const ends = sets(s,
            [{
                t: "statusEnd", target: "B:lux", id: "bleed_t"
            }])[0].set
        assert.equal(ends.cues[0].name,
            map.DARIUS_VFX.fade)
    })

test("Cue hiếm bằng sự kiện tổng hợp: Say Mê, Cô Lập lộ diện, Tàng Hình rã, Choáng huỷ đòn, né đòn, Phi Hồ nhường chỗ, Lissandra E nối băng",
    () => {
        const s = mk({
            A: {
                ahri: 2, lissandra: 1, leona: 3, braum: 4
            }, B: {
                khazix: 2, vayne: 1, jinx: 3
            }
        })
        const status = (id: string, src: string, target: string, card?: string): Ev => ({
            t: "status", target, id, turns: 1, v: 1, src, card
        })
        const one = (e: Ev) => sets(s,
            [e]).map((x) => x.set)[0]
        const withCard = (e: Ev, id: string, hero: string, caster: string): CueSet => {
            const card: cg.Card = {
                uid: "t", kind: "skill", id, hero, side: "A"
            }
            annotate([e],
                s.units)
            return cuesFor(e,
                {
                    env: env(s), card, caster
                })
        }
        assert.equal(one(status("ahri_charm",
            "A:ahri",
            "B:jinx")).cues[0].name,
        map.skillVfx("ahri",
            "r").extra)
        assert.ok(one(status("ahri_charm",
            "A:ahri",
            "B:jinx")).cues[0].hold)
        s.units["B:vayne"].statuses.stealth = {
            until: 99, at: 0, v: 1
        } as cg.StatusInst
        const isolated = one(status("isolated",
            "A:ahri",
            "B:vayne")).cues.map((c) => c.name)
        assert.ok(isolated.includes(map.KHAZIX_VFX.reveal),
            "Cô Lập lên địch đang Tàng Hình: màn che rách")
        assert.ok(isolated.includes(map.KHAZIX_VFX.aura))
        assert.ok(sets(s,
            [{
                t: "statusEnd", target: "B:khazix", id: "stealth"
            }])[0].set.cues.some((c) => c.name === map.KHAZIX_VFX.unveil))
        // Braum: Choáng từ Dấu Băng trên đòn đồng minh vỡ dấu; Choáng của chính R là Khe Băng đè lên lá
        assert.ok(withCard(status("stun",
            "A:braum",
            "B:jinx"),
        "leona_q",
        "leona",
        "A:leona").cues.some((c) => c.name === map.BRAUM_VFX.markBreak))
        assert.ok(withCard(status("stun",
            "A:braum",
            "B:jinx"),
        "braum_r",
        "braum",
        "A:braum").cues.some((c) => c.name === map.skillVfx("braum",
            "r").extra))
        // Lissandra E: tia băng nối lá bị băng trên tay đối thủ với tướng bị Choáng
        const link = withCard(status("stun",
            "A:lissandra",
            "B:jinx"),
        "lissandra_e",
        "lissandra",
        "A:lissandra").cues[0]
        assert.equal(link.name,
            map.skillVfx("lissandra",
                "e").extra)
        assert.deepEqual(link.from,
            {
                hand: "B"
            })
        // Đòn nhắm Kha'Zix bị né: cue Né Đòn hướng về kẻ đánh; Vayne Q: đòn xuyên ô trống
        const link1: Ev = {
            t: "chainAdd", side: "B", n: 1, kind: "card", actor: "B:jinx", targets: ["A:ahri"]
        }
        annotate([link1],
            s.units)
        const play: Extract<Ev, { t: "play" }> = {
            t: "play", side: "A", card: {
                uid: "k", kind: "skill", id: "ahri_e", hero: "ahri", side: "A"
            }
        }
        const dodge = playCues({
            ...play, card: {
                ...play.card, id: "ahri_r", hero: "ahri"
            }
        },
        {
            env: env(s), caster: "A:ahri"
        })
        assert.deepEqual(dodge.cues,
            [],
            "R của Ahri không có cue né")
        const khazixLink: Ev = {
            t: "chainAdd", side: "A", n: 2, kind: "card", actor: "A:ahri", targets: ["B:khazix"]
        }
        annotate([khazixLink],
            s.units)
        const evade = playCues({
            ...play, side: "B", card: {
                uid: "k2", kind: "skill", id: "khazix_r", hero: "khazix", side: "B"
            }
        },
        {
            env: env(s), caster: "B:khazix"
        })
        assert.ok(evade.cues.some((c) => c.name === map.skillVfx("khazix",
            "r").extra && c.to?.[0] && "unit" in c.to[0] && c.to[0].unit === "A:ahri"))
        assert.ok(evade.cues.some((c) => c.name === map.KHAZIX_VFX.shuffle && c.amount === cg.kit("khazix").p.r2),
            "R xáo vào bộ r2 lá trên cùng")
        const vayneLink: Ev = {
            t: "chainAdd", side: "A", n: 3, kind: "attack", actor: "A:ahri", targets: ["B:vayne"]
        }
        annotate([vayneLink],
            s.units)
        const whiff = withCard({
            t: "move", unit: "B:vayne", from: 1, to: 0
        },
        "vayne_q",
        "vayne",
        "B:vayne").cues[0]
        assert.equal(whiff.name,
            map.skillVfx("vayne",
                "q").extra)
        assert.deepEqual(whiff.to,
            [{
                lane: 1, side: "B"
            }],
            "đòn đi xuyên ô cũ")
        // Choáng huỷ đòn: mắt xích bị huỷ phát vụn mũi đòn; hold gồng đòn được nhả
        const attackLink: Ev = {
            t: "chainAdd", side: "B", n: 4, kind: "attack", actor: "B:jinx", targets: ["A:ahri"]
        }
        const cancelled: Ev[] = [attackLink,
            status("stun",
                "A:leona",
                "B:jinx"),
            {
                t: "chainCancel", n: 4, side: "B"
            }]
        const out = sets(s,
            cancelled)
        assert.ok(out[2].set.cues.some((c) => c.name === map.LEONA_VFX.fizzle))
        assert.deepEqual(out[2].set.release,
            ["chain|4"])
        assert.ok(out[0].set.cues.some((c) => c.name === map.LEONA_VFX.windup && c.hold === "chain|4"),
            "Leona phe địch: đòn gồng có mũi đòn bám tới khi giải quyết")
    })

test("Lissandra cardFrozen/cardThawed, Teemo nấm, nửa Buốt: sự kiện nào cũng có cue đã đăng ký",
    () => {
        const s = mk({
            A: {
                lissandra: 2, ashe: 1
            }, B: {
                jinx: 2
            }
        })
        const card: cg.Card = {
            uid: "f1", kind: "skill", id: "jinx_q", hero: "jinx", side: "B"
        }
        const frozen = sets(s,
            [{
                t: "cardFrozen", side: "B", card, by: "A:lissandra"
            }])[0].set
        assert.equal(frozen.cues[0].name,
            map.skillVfx("lissandra",
                "p").cast)
        assert.equal(frozen.cues[0].kind,
            "lead")
        assert.ok(frozen.cues.some((c) => c.name === map.skillVfx("lissandra",
            "p").impact && c.hold),
        "băng giữ tới khi tan")
        const thawed = sets(s,
            [{
                t: "cardThawed", side: "B", card
            }])[0].set
        assert.deepEqual(thawed.release,
            ["f1|freeze"])
        assert.ok(mayCue({
            t: "cardFrozen", side: "B", card, by: "A:lissandra"
        }))
    })

test("Mọi cue extra/block khai báo trong heroMap và mọi hằng *_VFX đều có chỗ phát",
    () => {
        const sources = ["../packages/client/src/card/vfx/heroCues.ts",
            "../packages/client/src/card/vfx/dispatch.ts",
            "../packages/client/src/card/anim/plan.ts"].map((p) => readFileSync(new URL(p,
            import.meta.url),
        "utf8")).join("\n")
        const missing: string[] = []
        for (const [hero,
            v] of map.heroVfxEntries()) {
            for (const key of ["q",
                "e",
                "r",
                "p"] as const) {
            // `block` đi qua đường chung của Khiên (X(owner, k, "block")): được kiểm bằng ván thật ở test riêng
                for (const field of ["extra"] as const) {
                    if (!v[key][field]) continue
                    // X("hero", "k", "field"), add("hero", "k", "field"), skillVfx("hero", "k").field hoặc nhánh `case "hero:k"` của skillExtra
                    const accessor = new RegExp(String.raw`\("${hero}",\s*"${key}",\s*"${field}"\)|skillVfx\("${hero}",\s*"${key}"\)\.${field}|case "${hero}:${key}"`)
                    if (!accessor.test(sources)) missing.push(`${hero}.${key}.${field} = ${v[key][field]}`)
                }
            }
        }
        const constants = Object.entries(map).filter(([k,
            v]) => /^[A-Z_]+$/.test(k) && typeof v === "string")
        for (const [k] of constants) if (!new RegExp(`\\b${k}\\b`).test(sources.replace(/import[^;]*?from/g,
            ""))) missing.push(k)
        for (const [k,
            v] of Object.entries(map)) {
            if (!/_VFX$/.test(k) || typeof v !== "object" || k === "DEFAULT_VFX") continue
            for (const field of Object.keys(v as object)) {
                if (typeof (v as Record<string, unknown>)[field] !== "string") continue
                if (!new RegExp(`\\b${k}\\.${field}\\b`).test(sources)) missing.push(`${k}.${field}`)
            }
        }
        // Không có sự kiện engine có cấu trúc để nối (xem báo cáo): vắng mặt có chủ ý
        // KHAZIX_VFX.fail: Cô Lập trượt chỉ có dòng log (g.rollLog), không có sự kiện có cấu trúc để nối
        const unwired = new Set(["KHAZIX_VFX.fail"])
        assert.deepEqual(missing.filter((m) => !unwired.has(m)),
            [],
            "cue khai báo mà không nơi nào phát")
    })

test("Mọi cue các sự kiện thật của các ván mô phỏng đều đã đăng ký và không ném lỗi",
    () => {
        const ids = cg.implementedHeroes().map((h) => h.id)
        const unknown = new Set<string>()
        let produced = 0
        for (let seed = 1; seed <= 40; seed++) {
            const A = ids.slice((seed * 5) % ids.length).concat(ids).slice(0,
                5)
            const B = ids.slice((seed * 11 + 3) % ids.length).concat(ids).slice(0,
                5)
            let s: St
            try { s = cg.newGame(seed,
                A,
                B) } catch { continue }
            resetCueState()
            for (let n = 0; s.phase !== "over" && n < 500; n++) {
                const side = cg.whoseMove(s)
                let result
                try { result = cg.applyAction(s,
                    cg.chooseAction(s,
                        side,
                        n % 3 ? "easy" : "normal")) } catch { break }
                for (const { e, set } of sets(s,
                    result.events)) {
                    for (const cue of [...set.cues,
                        ...(set.impact?.name ? [{
                            name: set.impact.name
                        }] : [])]) {
                        produced++
                        if (!registered.has(cue.name)) unknown.add(`${cue.name} (${e.t})`)
                    }
                    if (e.t === "play") for (const cue of playCues(e,
                        {
                            env: env(s), card: e.card, caster: e.args?.actor ?? `${e.side}:${e.card.hero}`
                        }).cues) if (!registered.has(cue.name)) unknown.add(cue.name)
                    if (e.t === "create" || e.t === "freeCard" || e.t === "returnToHand" || e.t === "draw") {
                        const flight = handFlight(e,
                            env(s))
                        if (flight && !registered.has(flight.name)) unknown.add(flight.name)
                    }
                }
                s = result.state
            }
        }
        assert.deepEqual([...unknown],
            [],
            "cue chưa đăng ký")
        assert.ok(produced > 200,
            `ván mô phỏng phát ${produced} cue`)
    })

console.log(`VFX wiring: ${passed}/${passed} PASS`)
void endTurn
