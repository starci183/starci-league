// BẢNG BÊN PHẢI (React + shadcn) nằm đè đúng vùng bảng cũ của Phaser: lượt, nút hành động, kho đồ, Đội Hình,
// chi tiết lựa chọn (tướng + chiêu, lá bài, mốc triệu hồi), ô giải thích và nhật ký. Mọi nút gọi ngược BoardScene qua ui.actions.
import type {
    ReactNode
} from "react"
import {
    CARDS, RESOURCES, ROLE_INFO, SKILLS, boardCapAt, boardCount, canCast, formatMsg, getHero, getPlay, heroOf,
    other, skillCost, t, type UnitLike,
} from "@starci/shared"
import {
    Button
} from "./components/button"
import {
    ScrollArea
} from "./components/scroll-area"
import {
    Tooltip, TooltipContent, TooltipTrigger
} from "./components/tooltip"
import {
    Glossary, Rich
} from "./Rich"
import {
    CardTip, EffectChips, HpBar, RolePerk, ItemIcon, ItemTip, SkillTip, StatGrid, UnitTip, unitItems
} from "./tips"
import {
    ui, useUi
} from "./store"

/** Dòng sát thương trong nhật ký tô theo loại: vật lý đỏ, phép xanh, chuẩn trắng */
function dmgClass(line: string) {
    if (!line.startsWith("L|log.damage")) return ""
    try {
        const kind = JSON.parse(line.slice(line.indexOf("|",
            2) + 1)).kind
        return kind === "physical" ? "text-[#ff8f7a]" : kind === "magic" ? "text-[#7ab8ff]" : kind === "true" ? "text-white" : ""
    } catch { return "" }
}

/** Tooltip shadcn với thẻ Hextech */
export function HexTip({ content, children, side = "left" }: { content: ReactNode; children: ReactNode; side?: "left" | "right" | "top" | "bottom" }) {
    return (
        <Tooltip delayDuration={120}>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side={side} className="hex-tip p-3">{content}</TooltipContent>
        </Tooltip>
    )
}

export function Panel() {
    const snap = useUi()
    const { s, side, rect } = snap
    if (!snap.inMatch || !s || !side || !rect || s.phase === "draft" || s.phase === "waiting") return null
    const act = ui.actions!
    const p = s.players.get(side)!, o = s.players.get(other(side))
    const myTurn = s.activeSide === side && s.phase === "playing"
    const smiteOk = myTurn && (p.smiteRound ?? 0) <= s.round
    const roster = [...s.units.values()].filter((u) => u.owner === side)
    // tướng đang chọn: tooltip đồ / lá đồ tính số theo tướng này
    const focusUnit = (snap.sel?.kind === "unit" || snap.sel?.kind === "roster") ? s.units.get(snap.sel.id) : undefined
    const sel = snap.sel
    return (
        <div className="fixed flex flex-col gap-2 overflow-hidden p-2 text-[13px]" style={{
            left: rect.x, top: rect.y, width: rect.w, height: rect.h
        }}>
            <div className="flex items-baseline justify-between">
                <span className="font-bold text-hex-muted">{t("g.round",
                    {
                        r: s.round, t: s.turn
                    })}</span>
                <span className={`font-extrabold ${myTurn ? "text-emerald-400" : "text-hex-gold-hi"}`}>{s.phase === "summon" ? t("g.reveal_phase") : myTurn ? t("g.your_turn") : t("g.opp_moving")}</span>
            </div>
            <div className="font-bold text-hex-gold-hi"><Rich text={t("g.mana_line",
                {
                    m: p.mana, max: p.maxMana, g: p.gold, d: p.deckCount, b: boardCount(s,
                        side), cap: boardCapAt(s.round)
                })} /></div>
            <div className="text-hex-muted">{t("g.opp_line",
                {
                    name: o?.name ?? "?", h: o?.handCount ?? 0, m: o?.maxMana ?? 0, g: o?.gold ?? 0
                })}</div>
            <div className="flex gap-2">
                <Button variant="gold" className="flex-[3]" disabled={!myTurn} onClick={() => act.endTurn()}>{t("g.end_turn")}</Button>
                <HexTip content={<Rich text={t("g.smite_tip")} />}>
                    <Button className="flex-[2]" disabled={!smiteOk} onClick={() => act.toggleSmite()}>
                        {snap.smiteMode ? `${t("g.smite")} ✕` : smiteOk ? t("g.smite") : t("g.smite_cd",
                            {
                                n: p.smiteRound
                            })}
                    </Button>
                </HexTip>
            </div>
            {/* kho mảnh + chợ */}
            <div className="flex items-center gap-1">
                {[...p.bench].map((id: string, i: number) => (
                    <HexTip key={i} content={<ItemTip id={id} unit={focusUnit} />}><span><ItemIcon id={id} size={28} /></span></HexTip>
                ))}
                <Button size="sm" className="ml-auto" disabled={s.phase !== "playing"} onClick={() => act.toggleShop()}>
                    {snap.shopOpen ? t("g.shop_close") : t("g.shop",
                        {
                            g: p.gold
                        })}
                </Button>
            </div>
            {/* Đội Hình */}
            <div className="flex gap-1.5">
                {roster.map((u) => {
                    const on = (sel?.kind === "unit" || sel?.kind === "roster") && sel.id === u.id
                    const wait = Math.max(0,
                        u.readyTurn - s.turn)
                    return (
                        <HexTip key={u.id} content={<UnitTip u={u} />}>
                            <button className={`relative h-11 w-11 overflow-hidden rounded border-2 ${on ? "border-violet-400" : u.status === "board" ? "border-emerald-400" : "border-hex-gold/70"}`}
                                onClick={() => act.select(on ? null : {
                                    kind: u.status === "board" ? "unit" : "roster", id: u.id
                                })}>
                                <img src={`/heroes/${u.defId}.jpg`} alt="" className={`h-full w-full object-cover object-top ${u.status !== "board" && wait ? "grayscale brightness-50" : ""}`} />
                                {u.status !== "board" && wait > 0 && <b className="absolute inset-0 flex items-center justify-center text-white [text-shadow:0_0_3px_#000]">{wait}</b>}
                            </button>
                        </HexTip>
                    )
                })}
            </div>
            {/* chi tiết lựa chọn */}
            <ScrollArea className="min-h-0 flex-1 rounded border border-hex-line/60 bg-black/25 p-2">
                <Selection />
            </ScrollArea>
            {/* nhật ký */}
            <div className="text-[12px] font-bold text-hex-gold">{t("g.log")}</div>
            <ScrollArea className="h-[22%] rounded border border-hex-line/60 bg-black/25 p-2 text-[11.5px] leading-snug text-hex-muted">
                {[...s.log].slice(-60).map((l: string, i: number) => <div key={i} className={dmgClass(l)}><Rich text={formatMsg(l)} /></div>)}
            </ScrollArea>
        </div>
    )
}

function Selection() {
    const snap = useUi(), { side, sel } = snap, s = snap.s!, act = ui.actions!
    const myTurn = s.activeSide === side && s.phase === "playing"
    const p = s.players.get(side!)!
    if (s.phase === "summon") {
        return (
            <div>
                <div className="font-extrabold text-hex-gold-hi">{t("g.summon_title",
                    {
                        r: s.round
                    })}</div>
                {p.summonReady ? <p className="mt-1 text-hex-muted">{t("g.summon_wait")}</p> : (
                    <>
                        <p className="mt-1 text-hex-muted">{t("g.summon_help",
                            {
                                k: snap.picks, n: snap.summonNeed
                            })}</p>
                        <Button variant="gold" size="wide" className="mt-2" disabled={snap.picks !== snap.summonNeed} onClick={() => act.confirmSummon()}>
                            {t("g.summon_ok",
                                {
                                    k: snap.picks, n: snap.summonNeed
                                })}
                        </Button>
                    </>
                )}
            </div>
        )
    }
    if (snap.pending) {
        const sk = SKILLS[snap.pending.skillId]
        return (
            <div>
                <div className="font-extrabold text-hex-gold-hi">{t(sk.target === "cell" ? "g.pick_cell" : "g.pick_target",
                    {
                        key: sk.key, name: sk.name
                    })}</div>
                <p className="mt-1 text-hex-muted">{t("g.valid_targets")}</p>
                <Button size="sm" className="mt-2" onClick={() => act.cancelPending()}>{t("g.cancel")}</Button>
            </div>
        )
    }
    if (sel?.kind === "set") return <div><div className="font-extrabold text-hex-gold-hi">{t("g.flip_title",
        {
            name: CARDS[sel.defId].name
        })}</div><p className="text-hex-muted">{t("g.click_target")}</p><CardTip defId={sel.defId} /></div>
    if (sel?.kind === "hand") {
        const play = getPlay(sel.defId)
        return (
            <div>
                {play && (play.target === "none"
                    ? <Button variant="gold" size="wide" disabled={!myTurn} onClick={() => act.useCard(sel.uid)}>{t("g.use_card",
                        {
                            name: play.name
                        })}</Button>
                    : <p className="font-bold text-hex-gold-hi">{play.target === "allyRoster" ? t("g.click_roster") : t("g.click_target")}</p>)}
                <div className="mt-2">{CARDS[sel.defId]?.kind === "item" ? <ItemTip id={(CARDS[sel.defId] as { itemId: string }).itemId} /> : <CardTip defId={sel.defId} />}</div>
            </div>
        )
    }
    if (sel?.kind === "unit" || sel?.kind === "roster") {
        const u = s.units.get(sel.id)
        return u ? <UnitDetail u={u} myTurn={myTurn} /> : null
    }
    if (snap.tip) return <div className="text-[12.5px] leading-snug"><Rich text={snap.tip} /><Glossary texts={[snap.tip]} /></div>
    return <p className="text-[12px] text-hex-muted">{t("g.help")}</p>
}

function UnitDetail({ u, myTurn }: { u: UnitLike & { status: string; owner: string }; myTurn: boolean }) {
    const snap = useUi(), act = ui.actions!, mine = u.owner === snap.side
    const hero = heroOf(u), adapter = getHero(u.defId), res = RESOURCES[hero.resource ?? "mana"]
    return (
        <div>
            <div className="flex gap-2">
                <img src={`/heroes/${u.defId}.jpg`} alt="" className="h-14 w-14 rounded border border-hex-gold object-cover object-top" />
                <div className="min-w-0">
                    <div className="font-extrabold">{hero.name} · <span className="text-hex-muted">{ROLE_INFO[hero.role].name}</span></div>
                    <div className="mt-1"><HpBar u={u} /></div>
                    <div className="text-[12px]"><b className="num">{u.hp}/{u.maxHp}</b>{u.shield > 0 && <> · <span className="font-bold text-white">{t("g.shield",
                        {
                            n: u.shield
                        })}</span></>}</div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-black/70"><div className="h-full" style={{
                        width: `${Math.min(100,
                            (u.mana / res.max) * 100)}%`, background: `#${res.color.toString(16).padStart(6,
                            "0")}`
                    }} /></div>
                    <div className="text-[11.5px] text-hex-muted">{res.name} {u.mana}/{res.max}</div>
                </div>
            </div>
            <RolePerk u={u} />
            <EffectChips u={u} />
            <StatGrid u={u} />
            {u.items.length > 0 && (
                <div className="mt-2 flex gap-1">
                    {unitItems(u).map((id, i) => (
                        <HexTip key={i} content={<div><ItemTip id={id} unit={u} />{mine && <p className="mt-2 text-hex-muted">{t("g.unequip_tip")}</p>}</div>}>
                            <button disabled={!mine || !myTurn} onClick={() => act.unequip(u.id,
                                i)}><ItemIcon id={id} size={26} /></button>
                        </HexTip>
                    ))}
                </div>
            )}
            {adapter?.passive && (
                <p className="mt-2 text-[12px] leading-snug">
                    <img src={`/icons/${u.defId}_p.png`} alt="" className="mr-1 inline h-5 w-5 rounded-sm align-middle" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <b className="text-hex-gold-hi">{adapter.passive.name}</b>: <Rich text={adapter.passive.desc} unit={u} />
                </p>
            )}
            <div className="mt-2 flex flex-col gap-1">
                {hero.skills.map((id) => {
                    const sk = SKILLS[id], cd = u.cooldowns.get(id) ?? 0
                    const usable = mine && myTurn && u.status === "board" && canCast(snap.s!,
                        u,
                        id)
                    return (
                        <HexTip key={id} content={<SkillTip u={u} skillId={id} />}>
                            <Button size="sm" variant={sk.key === "R" ? "gold" : "blue"} className="w-full justify-start" disabled={!usable} onClick={() => act.cast(u.id,
                                id)}>
                                <img src={`/icons/${id}.png`} alt="" className="h-5 w-5 rounded-sm" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                                <b>{sk.key}</b><span className="truncate">{sk.name}</span>
                                <span className="ml-auto font-normal opacity-80">{cd ? t("g.cd",
                                    {
                                        n: cd
                                    }) : `${skillCost(u,
                                    id)} ${res.name}`}</span>
                            </Button>
                        </HexTip>
                    )
                })}
            </div>
        </div>
    )
}
