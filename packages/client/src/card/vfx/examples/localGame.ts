import {
    cg
} from "@starci/shared"
import {
    bindLocalCardGame, cardActions, getCard, receiveCardEnd, receiveCardEvents, receiveCardLegal, receiveCardState, setDisplayLag, subscribeCard, type CardView
} from "../../store"
import {
    actionCaption, beforeOpening, chooseExampleAction, createScenario, exampleLegalActions, recommendedAction, type Scenario
} from "./scenarios"

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
/** Same hidden-card wire shape as CardRoom.eventsFor; raw engine history stays intact. */
const hiddenCard = (card: cg.Card): cg.Card => ({
    uid: card.uid, hidden: true, ...(card.temp ? {
        temp: true
    } : {
    })
}) as unknown as cg.Card

export function presentationEvents(events: cg.GameEvent[], viewer: cg.Side): cg.GameEvent[] {
    return events.map((event) => {
        switch (event.t) {
        case "draw":
        case "drawAuto":
        case "prize":
        case "freeCard":
        case "tempExpired":
            return event.side === viewer ? event : {
                ...event, card: hiddenCard(event.card)
            }
        case "create":
            return event.side === viewer || event.zone === "grave" ? event : {
                ...event, card: hiddenCard(event.card)
            }
        case "cardBurned":
            return event.side !== viewer && event.card.temp ? {
                ...event, card: hiddenCard(event.card)
            } : event
        default:
            return event
        }
    })
}

export interface HistoryFrame {
    n: number;
    title: string;
    action?: cg.Action;
    actions?: cg.Action[];
    events: cg.GameEvent[];
    state: cg.GameState;
    at: number;
}

/** Engine local phát cg:events → cg:state → cg:legal; dùng đúng store/queue của trận mạng. */
export class LocalExampleGame {
    readonly scenario: Scenario
    state: cg.GameState
    readonly history: HistoryFrame[] = []
    auto = false
    paused = false
    bothSides = false
    label = "Bạn được chơi tự do"
    private timer = 0
    private started = 0
    private closed = false
    private detach: (() => void) | null = null
    private unbind: (() => void) | null = null
    private listeners = new Set<() => void>()
    private settleVersion = 0

    constructor(slug: string, seed: number) {
        this.scenario = createScenario(slug,
            seed)
        this.state = this.scenario.state
    }

    subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f) } }
    version = () => this.settleVersion
    private notify() { this.settleVersion++; for (const f of this.listeners) f() }

    view(state = this.state): CardView {
        const you = this.bothSides ? cg.whoseMove(state) : "A"
        const g = new cg.Game(state)
        const players = Object.fromEntries(cg.SIDES.map((side) => {
            const p = state.players[side]
            const deckSummary = cg.deckSummaryFor(p.deck,
                side,
                you)
            return [side,
                {
                    side, heroes: p.heroes, lives: p.lives, grave: copy(p.grave), handCount: p.hand.length, deckCount: p.deck.length,
                    hand: side === you || g.handRevealed(side) ? copy(p.hand) : undefined, deckSummary
                }]
        })) as CardView["players"]
        const units = copy(state.units)
        for (const unit of Object.values(units)) if (unit.token?.hidden && unit.side !== you) unit.token = {
            ...unit.token, secret: undefined, card: undefined
        }
        const picks = new Set(cg.legalActions(state,
            you).flatMap((action) => (action.t === "play" || action.t === "chain") && action.args?.pick ? [action.args.pick] : []))
        const peek = picks.size ? copy(state.players[you].deck.filter((card) => picks.has(card.uid))) : undefined
        return {
            ...copy(state), you, players, units, peek, teamMana: copy(state.teamMana), toMove: cg.whoseMove(state), openLanes: g.openLanes(),
            blind: state.blind ? {
                ...copy(state.blind), picks: {
                    A: you === "A" ? copy(state.blind.picks.A) : [], B: you === "B" ? copy(state.blind.picks.B) : []
                }
            } : undefined,
            turnAttacks: state.turnAttacks ?? {
                used: 0, cardless: []
            }, offTurnAttacks: state.offTurnAttacks ?? {
                used: 0, cardless: []
            },
            attackLimit: cg.RULES.attackLimit, names: {
                A: "Bạn · Xanh", B: "Máy · Đỏ"
            }, bots: this.bothSides ? {
            } : {
                B: "easy"
            }, rules: cg.RULES
        }
    }

    /** Hiện tay trống trước khi phát những lá opening do engine rút thật. */
    prepare() {
        this.unbind = bindLocalCardGame((action) => this.perform(action))
        const opening = this.scenario.opening
        receiveCardState(this.view(opening.length ? beforeOpening(this.state,
            opening) : this.state))
        receiveCardLegal([])
    }

    start() {
        this.started = performance.now()
        this.detach = subscribeCard(() => this.schedule())
        const events = this.scenario.opening
        this.history.push({
            n: 0, title: events.length ? "Mở trận · rút tay đầu" : "Checkpoint · chơi tiếp từ đây", events: copy(events), state: copy(this.state), at: 0
        })
        if (events.length) {
            receiveCardEvents(presentationEvents(copy(events),
                this.bothSides ? cg.whoseMove(this.state) : "A"))
            receiveCardState(this.view())
        }
        if (this.scenario.spec.focus) cardActions.inspect(this.scenario.spec.focus)
        this.publishLegal()
        this.schedule()
        this.notify()
    }

    private publishLegal() {
        const side = cg.whoseMove(this.state)
        receiveCardLegal(this.state.phase === "over" || (!this.bothSides && side !== "A") ? [] : exampleLegalActions(this.state,
            side))
    }

    private schedule() {
        if (this.closed || this.timer || getCard().presenting || this.paused || this.state.phase === "over") return
        const side = cg.whoseMove(this.state)
        if (this.bothSides || side === "A" && !this.auto) return
        this.timer = window.setTimeout(() => {
            this.timer = 0
            if (this.closed || this.paused || getCard().presenting || this.state.phase === "over") return
            this.perform(chooseExampleAction(this.state,
                cg.whoseMove(this.state)))
        },
        this.state.phase === "chain" ? 1000 : 650)
    }

    perform(action: cg.Action) {
        if (this.closed || this.state.phase === "over" || getCard().presenting) return
        const legal = exampleLegalActions(this.state,
            action.side)
        if (!legal.some((a) => JSON.stringify(a) === JSON.stringify(action))) throw new Error("Sandbox từ chối hành động không hợp lệ")
        window.clearTimeout(this.timer)
        this.timer = 0
        const title = actionCaption(this.state,
            action)
        const result = cg.applyAction(this.state,
            action)
        const actions = [action]
        this.state = result.state
        this.label = title
        this.history.push({
            n: this.history.length, title, action: copy(action), actions: copy(actions), events: copy(result.events), state: copy(this.state), at: (performance.now() - this.started) / 1000
        })
        receiveCardEvents(presentationEvents(result.events,
            this.bothSides ? cg.whoseMove(this.state) : "A"))
        receiveCardState(this.view())
        if (this.state.phase === "over") receiveCardEnd({
            winner: this.state.winner, reason: this.state.endReason ?? "over"
        })
        this.publishLegal()
        this.notify()
        this.schedule()
    }

    recommended() { return recommendedAction(this.scenario,
        this.state,
        cg.whoseMove(this.state)) }
    playRecommended() {
        const action = this.recommended()
        if (action) cardActions.act(action)
    }
    setAuto(auto: boolean) { this.auto = auto; this.paused = false; this.schedule(); this.notify() }
    setPaused(paused: boolean) {
        this.paused = paused
        if (paused) { window.clearTimeout(this.timer); this.timer = 0 }
        else this.schedule()
        this.notify()
    }
    setBothSides(both: boolean) {
        if (getCard().presenting) return
        this.bothSides = both
        this.auto = false
        window.clearTimeout(this.timer)
        this.timer = 0
        receiveCardState(this.view())
        this.publishLegal()
        this.schedule()
        this.notify()
    }

    /** Chơi nhánh từ trạng thái đã diễn ra thật; người chơi tự quyết định phần tiếp theo. */
    fork(n: number) {
        if (getCard().presenting || !this.history[n]) return
        window.clearTimeout(this.timer)
        this.timer = 0
        this.auto = false
        this.paused = true
        this.state = copy(this.history[n].state)
        this.history.splice(n + 1)
        this.unbind?.()
        this.unbind = bindLocalCardGame((action) => this.perform(action))
        setDisplayLag(false)
        receiveCardState(this.view())
        if (this.state.phase === "over") receiveCardEnd({
            winner: this.state.winner, reason: this.state.endReason ?? "over"
        })
        setDisplayLag(true)
        this.publishLegal()
        this.label = `Chơi nhánh từ #${n}`
        this.notify()
    }

    snapshot(full = false) {
        return {
            elapsed: (performance.now() - this.started) / 1000, state: copy(this.state), presenting: getCard().presenting, legal: exampleLegalActions(this.state,
                cg.whoseMove(this.state)), label: this.label, history: full ? copy(this.history) : this.history.map((frame) => ({
                n: frame.n, title: frame.title, at: frame.at
            })), auto: this.auto, paused: this.paused, slug: this.scenario.spec.slug
        }
    }
    stop() {
        this.closed = true
        window.clearTimeout(this.timer)
        this.detach?.()
        this.unbind?.()
        this.listeners.clear()
    }
}
