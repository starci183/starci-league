// Mặt lá bài theo khung Hextech (.cv) cho lớp hoạt ảnh. Bảng ánh xạ tranh giống Hand.tsx.
import {
    useMemo
} from "react"
import {
    cg
} from "@starci/shared"

import {
    GameCardVisual
} from "../ui/GameCardVisual"
import {
    useCard
} from "../store"

type Card = cg.Card
import {
    artInfo, type ArtInfo
} from "./cardArt"
export { artInfo, skillIcon, formSkillIcon, type ArtInfo } from "./cardArt"

function Frame({ info, name, status }: { info: ArtInfo; name: string; status?: string }) {
    const separator = name.indexOf(":")
    return <GameCardVisual name={separator > 0 ? name.slice(separator + 1).trim() : name} actor={separator > 0 ? name.slice(0,
        separator).trim() : undefined} srcs={info.srcs} kind={info.kind} letter={info.letter} detail={status ? <span className="game-card-status">{status}</span> : undefined} />
}
export function CardFace({ card, name, status, unit }: { card: Card; name: string; status?: string; unit?: cg.Unit }) {
    const { view } = useCard()
    const side = card.side ?? view?.you
    const actor = unit ?? (side && card.hero ? view?.units[`${side}:${card.hero}`] : undefined)
    const info = artInfo(card,
        actor)
    return <Frame info={info} name={name} status={status} />
}

/** Lá tướng (thả xuống đường khi triệu hồi) */
export function HeroFace({ hero, name }: { hero: string; name: string }) {
    const info = useMemo<ArtInfo>(() => ({
        kind: "trap", srcs: [`/heroes-square/${hero}.jpg`]
    }),
    [hero])
    return <Frame info={info} name={name} />
}
