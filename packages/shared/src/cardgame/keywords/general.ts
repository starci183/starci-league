// Từ khoá nhóm "general" (chép từ docs/heroes/TEXT_STYLE.md).
import type {
    Keyword
} from "./types"

/** Từ khoá nhóm general */
export const KEYWORDS_GENERAL: Record<string, Keyword> = {
    stun: {
        vi: "Choáng",
        en: "Stun",
        descVi: "Không thể dùng lá chiêu hay đánh thường (kể cả tự đánh của Đấu Sĩ). Mắt xích của nó đang chờ trong Chuỗi bị huỷ.",
        descEn: "Can't use skill cards or attack (including a Fighter's automatic attack). Its pending Chain Link fizzles."
    },
    silence: {
        vi: "Câm Lặng",
        en: "Silence",
        descVi: "Không thể dùng lá chiêu (vẫn đánh thường được).",
        descEn: "Can't use skill cards (can still attack)."
    },
    shred: {
        vi: "Rã Giáp",
        en: "Armor Shred",
        descVi: "Giáp và Kháng phép −40%.",
        descEn: "Armor and MR −40%."
    },
    blind: {
        vi: "Mù",
        en: "Blind",
        descVi: "Mù N: N đòn đánh kế tiếp của tướng này trượt (tối đa 3, số hiện trên tướng).",
        descEn: "Blind N: its next N attacks miss (max 3, shown on it)."
    },
    taunt: {
        vi: "Khiêu Khích",
        en: "Taunt",
        descVi: "Lá chiêu đơn mục tiêu và đòn đánh của địch phải nhắm tướng này.",
        descEn: "Enemy single-target skills and attacks must target this champion."
    },
    grievous: {
        vi: "Vết Thương Sâu",
        en: "Grievous Wounds",
        descVi: "Hồi máu và Khiên nhận vào −50%.",
        descEn: "Healing and Shields received −50%."
    },
    stealth: {
        vi: "Tàng Hình",
        en: "Stealth",
        descVi: "Không bị chọn bởi lá 1 mục tiêu, lá tối đa N hay đòn đánh; lá đánh mọi tướng địch vẫn trúng.",
        descEn: "Can't be chosen by single-target or up-to-N cards or by attacks; cards that hit every enemy still hit it."
    },
    empower: {
        vi: "Cường Hoá",
        en: "Empowered",
        descVi: "Gây thêm 20% sát thương (trừ sát thương đầu lượt).",
        descEn: "Deals 20% more damage (except start-of-turn damage)."
    },
    exhaust: {
        vi: "Kiệt Sức",
        en: "Exhaust",
        descVi: "Gây ít hơn 40% sát thương.",
        descEn: "Deals 40% less damage."
    },
    ignite: {
        vi: "Thiêu Đốt",
        en: "Ignite",
        descVi: "Đầu mỗi lượt của tướng này: mất lượng máu ghi trên trạng thái (sát thương chuẩn).",
        descEn: "At the start of each of its turns: loses the HP shown on the status (true damage)."
    },
    shield: {
        vi: "Khiên",
        en: "Shield",
        descVi: "Máu tạm hấp thụ sát thương trước máu thật; không tự mất.",
        descEn: "Temporary HP that absorbs damage before HP; doesn't decay."
    },
    quick: {
        vi: "Quick",
        en: "Quick",
        descVi: "Đánh được trong lượt bạn như thường, và nối được Chuỗi lên lá hoặc đòn đánh vừa đánh (cả trong lượt đối thủ) khi đúng điều kiện ghi trên lá.",
        descEn: "Playable on your turn as normal, and can be chained onto the card or attack just played (even on the opponent's turn) when the card's condition is met."
    },
    chain_only: {
        vi: "Chỉ Nối Chuỗi",
        en: "Chain Only",
        descVi: "Lá Quick này không đánh chủ động được; chỉ dùng để nối Chuỗi.",
        descEn: "This Quick card can't be played on its own; it can only be chained."
    },
    uncounterable: {
        vi: "Không Thể Bị Nối Chuỗi",
        en: "Unchainable",
        descVi: "Không ai được nối Chuỗi lên lá này.",
        descEn: "No one can chain onto this card."
    },
    chain: {
        vi: "Chuỗi",
        en: "Chain",
        descVi: "Lá hoặc đòn đánh vừa đánh mở Chuỗi; hai bên lần lượt nối lá Quick; Chuỗi giải quyết từ mắt xích cuối về đầu (tối đa 10 mắt xích).",
        descEn: "A played card or attack opens a Chain; players take turns adding Quick cards; the Chain resolves from the last link to the first (max 10 links)."
    },
    negate: {
        vi: "Vô Hiệu",
        en: "Negate",
        descVi: "Phe được bảo vệ không nhận sát thương và khống chế từ lá đó.",
        descEn: "The protected side takes no damage and no crowd control from that card."
    },
    free_attack: {
        vi: "Đòn Miễn Phí",
        en: "Free Attack",
        descVi: "Một đòn đánh thường không cần lá Đánh thường (theo luật vai); giữ tới khi dùng.",
        descEn: "A basic attack that needs no Strike card (following role rules); kept until used."
    },
    strike: {
        vi: "Đánh thường",
        en: "Strike",
        descVi: "Thẻ hỗ trợ: 1 tướng mình đánh thường theo luật vai (Xạ Thủ 150% AD lên tướng bất kỳ; Sát Thủ 200% AD; vai khác 100% AD lên tướng đối diện).",
        descEn: "Support card: 1 allied champion attacks by role rules (Marksman 150% AD on any enemy; Assassin 200% AD; others 100% AD on the opposing champion)."
    },
    search: {
        vi: "Tìm",
        en: "Search",
        descVi: "Lục bộ bài lấy 1 lá đúng loại lên tay, rồi xáo bộ bài.",
        descEn: "Take 1 card of the named kind from your deck into your hand, then shuffle."
    },
    mill: {
        vi: "Đốt",
        en: "Mill",
        descVi: "Đưa N lá trên cùng bộ bài thẳng vào mộ (không qua tay).",
        descEn: "Put the top N cards of a deck straight into the graveyard (not via the hand)."
    },
    steal: {
        vi: "Cướp",
        en: "Steal",
        descVi: "Lấy 1 lá trên tay đối thủ sang tay bạn; lá chiêu cướp được thành 1 lá Đánh thường.",
        descEn: "Take 1 card from the opponent's hand into yours; a stolen skill card becomes a Strike."
    },
    reveal_hand: {
        vi: "Xem Tay",
        en: "Reveal Hand",
        descVi: "Bạn thấy toàn bộ lá trên tay đối thủ tới hết lượt.",
        descEn: "You see the opponent's whole hand until the end of the turn."
    },
    dead_card: {
        vi: "Lá Chết",
        en: "Dead Card",
        descVi: "Lá chiêu của tướng đang chờ hồi sinh hoặc chưa ra sân: không dùng được nhưng vẫn chiếm chỗ.",
        descEn: "A skill card of a champion that is respawning or not yet summoned: unplayable but still takes space."
    },
    prize: {
        vi: "Lá Thưởng",
        en: "Prize Card",
        descVi: "6 lá úp mỗi bên đầu trận; mỗi lần bạn hạ 1 tướng địch, lật 1 Lá Thưởng lên tay.",
        descEn: "6 face-down cards per side; each time you take down an enemy champion, flip 1 Prize Card into your hand."
    },
    behind: {
        vi: "Thua Mạng",
        en: "Behind",
        descVi: "Đội bạn còn ít mạng hơn đội địch.",
        descEn: "Your team has fewer lives left than the enemy team."
    },
    token: {
        vi: "Vật Triệu Hồi",
        en: "Summon",
        descVi: "Đơn vị ở ô triệu hồi phụ (mỗi bên 1 ô): không phải tướng, chết không mất mạng, biến mất khi tướng chủ rời sân. Chỉ đòn đánh của Xạ Thủ (hoặc lá ghi rõ) chọn được nó.",
        descEn: "A unit in the extra summon slot (1 per side): not a champion, losing it costs no life, it vanishes when its owner leaves the board. Only Marksman attacks (or cards that say so) can target it."
    },
    soak: {
        vi: "Máu Ảo",
        en: "Soak",
        descVi: "Sát thương nhắm tướng chủ đánh vào Vật Triệu Hồi này trước.",
        descEn: "Damage aimed at its owner hits this Summon first."
    },
    face_down: {
        vi: "Úp",
        en: "Face-down",
        descVi: "Vật Triệu Hồi úp: đối thủ không thấy lá gắn với nó tới khi lật; rời sân thì tự lật.",
        descEn: "A face-down Summon: the opponent can't see its attached card until it is flipped; it flips when it leaves the board."
    },
    pull: {
        vi: "Kéo",
        en: "Pull",
        descVi: "Đưa tướng địch sang đường đối diện tướng kéo (đổi chỗ với tướng địch đang đứng đó).",
        descEn: "Move an enemy champion to the lane opposite the puller (swapping with the enemy standing there)."
    }
}
