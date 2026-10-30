import {
    useSyncExternalStore, type CSSProperties
} from "react"
import {
    hiddenArrivalSnapshot, subscribePending
} from "../anim/pending"
import type {
    CardView
} from "../store"
import {
    isEn
} from "./helpers"

/** Slots are public positions, never secret hand UIDs or identities. */
export function OpponentHand({ view }: { view: CardView }) {
    const pending = useSyncExternalStore(subscribePending,
        hiddenArrivalSnapshot)
    const side = view.you === "B" ? "A" : "B"
    const count = view.players[side].handCount
    const total = count + pending[side]
    return <div className="opponent-hand" data-opponent-hand={side} aria-label={`${isEn() ? "Opponent hand" : "Tay đối thủ"}: ${count}`}>
        <div className="opponent-hand-fan" style={{
            "--back-count": Math.max(1,
                total)
        } as CSSProperties}>
            {Array.from({
                length: total
            },
            (_, index) => <div key={index} data-opponent-card={side} data-back-slot={index} data-arriving={index >= count || undefined} className={`opponent-hand-tip${index >= count ? " arriving" : ""}`} style={{
                "--back-index": index, "--back-angle": `${(index - (total - 1) / 2) * 1.4}deg`
            } as CSSProperties}>
                <img src="/ui/card_back.png" alt="" draggable={false} />
            </div>)}
        </div>
        <span className="opponent-hand-count">{isEn() ? "Opponent hand" : "Tay đối thủ"} · <b>{count}</b> {isEn() ? "cards" : "lá"}</span>
    </div>
}
