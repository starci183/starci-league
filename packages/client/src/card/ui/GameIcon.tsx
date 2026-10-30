export type GameIconName = "cards" | "anvil" | "arrow" | "chain" | "roster" | "spark" | "target" | "sword" | "shield" | "diamond" | "wand"

const paths: Record<GameIconName, string> = {
    sword: "M5 20l5-5 M4 12l8 8 M8 14L18 3h3v3L10 17",
    shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z",
    diamond: "M12 2l8 10-8 10-8-10z M12 7v10",
    wand: "M4 20L17 7 M12 5h7v7 M6 3v4 M4 5h4 M19 16v5 M17 18h4",
    cards: "M7 3h12v15H7z M4 7v14h12 M10 7h6 M10 11h6",
    anvil: "M3 7h18l-4 5h-5v4l4 3H6l4-3v-4H6z M15 4v3",
    arrow: "M4 12h15 M13 5l7 7-7 7",
    chain: "M10 14l4-4 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
    roster: "M4 4h6v7H4z M14 4h6v7h-6z M4 15h6v5H4z M14 15h6v5h-6z",
    spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
    target: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"
}

export function GameIcon({ name }: { name: GameIconName }) {
    return <svg className="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
