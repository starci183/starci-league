// Mặt lá bài theo khung Hextech (.cv) cho lớp hoạt ảnh. Bảng ánh xạ tranh giống Hand.tsx.
import {
    useEffect, useMemo, useState
} from "react"
import {
    cg
} from "@starci/shared"

type Card = cg.Card
type FrameKind = "spell" | "trap" | "stat" | "item" | "combat"

export interface ArtInfo { kind: FrameKind; srcs: string[]; letter?: string }

function spellIdOf(card: Card): string | undefined {
    if (card.id.startsWith("spell_")) return card.id.slice(6)
    if (card.id.startsWith("spell:")) return card.id.slice(6)
    if (card.id === "spell") {
        const v = card.data?.spell ?? card.data?.id ?? card.item
        return v === undefined ? undefined : String(v)
    }
    return undefined
}

export function artInfo(card: Card): ArtInfo {
    const key = (card.copyOf ?? card.id).slice(-1).toLowerCase()
    const hero = card.hero
    if (card.kind === "skill" || card.copyOf) {
        return {
            kind: "trap",
            srcs: hero ? [`/card_skills/${hero}_${key}.png`,
                `/icons/${hero}_${key}.png`,
                `/skills_art/${hero}_${key}.jpg`,
                `/heroes/${hero}.jpg`] : []
        }
    }
    if (card.kind === "wild") {
        return {
            kind: "trap", srcs: [`/card_support/wild_${key}.png`], letter: key.toUpperCase()
        }
    }
    if (card.kind === "support") {
        const spell = spellIdOf(card)
        if (spell) {
            return {
                kind: "spell", srcs: [`/card_support/spell_${spell}.png`,
                    "/ui/badge/spell.png"]
            }
        }
        switch (card.id) {
        case "gold": return {
            kind: "stat", srcs: ["/card_support/gold.png",
                "/ui/coin.png"]
        }
        case "item":
        case "legend": return {
            kind: "item", srcs: card.item ? [`/card_items/${card.item}.png`,
                `/items/${card.item}.png`] : ["/ui/badge/item.png"]
        }
        case "potion": return {
            kind: "spell", srcs: ["/cards/binh_mau.jpg"]
        }
        case "draw": return {
            kind: "spell", srcs: ["/card_support/draw.png",
                "/cards/bai_moi.jpg"]
        }
        case "buff": return {
            kind: "spell", srcs: ["/cards/cuong_no.jpg"]
        }
        default: return {
            kind: "combat", srcs: ["/card_support/basic.png",
                "/ui/badge/combat.png"]
        }
        }
    }
    return {
        kind: "trap", srcs: card.id === "mushroom" ? ["/cards/nam_teemo.jpg"] : ["/ui/badge/spell.png"]
    }
}

/** Biểu tượng chiêu (tròn) cho đạn bay; undefined nếu lá không có biểu tượng riêng */
export function skillIcon(card: Card | undefined): string | undefined {
    if (!card || !card.hero || (card.kind !== "skill" && !card.copyOf)) return undefined
    const key = (card.copyOf ?? card.id).slice(-1).toLowerCase()
    return `/card_skills/${card.hero}_${key}.png`
}

function Frame({ info, name }: { info: ArtInfo; name: string }) {
    const [i,
        setI] = useState(0)
    useEffect(() => setI(0),
        [info])
    const failed = i >= info.srcs.length
    return (
        <div className={`cv ${info.kind}`}>
            <div className="cv-in">
                <img className="cv-badge" src={`/ui/badge/${info.kind}.png`} alt="" draggable={false} onError={(e) => e.currentTarget.remove()} />
                <div className="cv-icon">
                    {failed ? (
                        <div className="hd-letter"><b>{info.letter ?? "?"}</b></div>
                    ) : (
                        <img className="cv-art" src={info.srcs[i]} alt="" draggable={false} onError={() => setI(i + 1)} />
                    )}
                </div>
                <b className="cv-name">{name}</b>
            </div>
        </div>
    )
}

export function CardFace({ card, name }: { card: Card; name: string }) {
    const info = useMemo(() => artInfo(card),
        [card.id,
            card.hero,
            card.item,
            card.copyOf,
            card.kind,
            card.data])
    return <Frame info={info} name={name} />
}

/** Lá tướng (thả xuống đường khi triệu hồi) */
export function HeroFace({ hero, name }: { hero: string; name: string }) {
    const info = useMemo<ArtInfo>(() => ({
        kind: "trap", srcs: [`/heroes/${hero}.jpg`]
    }),
    [hero])
    return <Frame info={info} name={name} />
}
