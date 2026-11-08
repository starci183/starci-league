// Chữ cho nhóm Pháp sư theo bộ chiêu mới (docs/heroes/KITS.md): Lux, Viktor, Lissandra, Twisted Fate, Vel'Koz, Rumble.
// Gộp vào i18n_en.ts (STATUS_V2 / STACK_V2 / SPECIAL_EN) và keywords/index.ts SAU các bảng cũ để ghi đè cùng id.
import type {
    Keyword
} from "../keywords/types"

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái mới của nhóm (hiện chưa có: Đóng Băng, Choáng dùng trạng thái chung) */
export const STATUS_KITS_MAGE: Record<string, Bi> = {
}

/** Bộ đếm của nhóm (khoá = key stack); ghi đè bản cũ cùng khoá */
export const STACK_KITS_MAGE: Record<string, Bi> = {
    sylas_shackle: {
        vi: {
            name: "Xiềng Nổ", desc: "Mỗi lá chiêu Sylas dùng cho 1, có trần. Mỗi đòn đánh tiêu 1 để nổ phép lên mục tiêu và 2 đường kề. Mất một nửa khi Sylas bị hạ."
        },
        en: {
            name: "Shackle Burst", desc: "Each skill card Sylas casts gives 1, up to a cap. Each attack spends 1 to burst magic damage on the target and the 2 adjacent lanes. Half is lost when Sylas is taken down."
        },
    },
    mel_glow: {
        vi: {
            name: "Chói Lọi", desc: "Dấu của Mel trên địch, vô hạn, không tự cháy. Mel gây sát thương lên kẻ có Máu không quá ngưỡng theo số dấu thì nó bị hạ ngay. Tướng mang chết mất một nửa; Mel chết không đổi."
        },
        en: {
            name: "Radiance", desc: "Mel's mark on an enemy, unlimited, it never burns on its own. When Mel damages a bearer at or under the HP line set by its marks, it is taken down at once. The bearer dying halves it; Mel dying changes nothing."
        },
    },
    azir_call: {
        vi: {
            name: "Hiệu Triệu", desc: "Số phát đồng đội đã đánh trúng. Đủ mốc thì Azir nhận 1 lá Trỗi Dậy tạm miễn phí."
        },
        en: {
            name: "Rally", desc: "Hits your allies have landed. At the threshold Azir gains 1 temporary free Arise! card."
        },
    },
    buff_atk: {
        vi: {
            name: "AD Sona", desc: "AD vĩnh viễn từ Sona Q. Tướng mang bị hạ thì mất một nửa."
        },
        en: {
            name: "Sona AD", desc: "Permanent AD from Sona Q. Halved when the bearer is taken down."
        },
    },
    buff_ap: {
        vi: {
            name: "AP Sona", desc: "AP vĩnh viễn từ Sona Q. Tướng mang bị hạ thì mất một nửa."
        },
        en: {
            name: "Sona AP", desc: "Permanent AP from Sona Q. Halved when the bearer is taken down."
        },
    },
    buff_armor: {
        vi: {
            name: "Giáp Sona", desc: "Giáp vĩnh viễn từ Sona E. Tướng mang bị hạ thì mất một nửa."
        },
        en: {
            name: "Sona Armor", desc: "Permanent Armor from Sona E. Halved when the bearer is taken down."
        },
    },
    buff_mr: {
        vi: {
            name: "Kháng Sona", desc: "Kháng phép vĩnh viễn từ Sona E. Tướng mang bị hạ thì mất một nửa."
        },
        en: {
            name: "Sona MR", desc: "Permanent MR from Sona E. Halved when the bearer is taken down."
        },
    },
    azir_soldiers: {
        vi: {
            name: "Lính Cát", desc: "Hiệu ứng thuộc ô sân, không phải đơn vị. Toàn đội tối đa 5 Lính. Đòn đánh trúng của chủ Lính khiến Lính đâm địch đối diện ô. Tướng rời ô hoặc chết không làm mất Lính. Khi Azir bị hạ, cả phe giữ một nửa tổng Lính, làm tròn xuống; Lính dư ưu tiên đường số nhỏ."
        },
        en: {
            name: "Sand Soldiers", desc: "Persistent slot effects, not units. Team cap: 5. Each hit by their master makes them thrust at the enemy across their slot. Occupant movement/death leaves them unchanged. Azir dying halves the team total rounded down, with odd survivors favoring lower-numbered lanes."
        },
    },
    jayce_form: {
        vi: {
            name: "Dạng", desc: "Búa: vai Đấu sĩ, đánh đối diện, có đòn không cần lá. Pháo: vai Xạ thủ, đánh mọi đường."
        },
        en: {
            name: "Form", desc: "Hammer: Fighter role, attacks the opposite lane, has the cardless attack. Cannon: Marksman role, attacks any lane."
        },
    },
    jayce_gate: {
        vi: {
            name: "Gia Tốc", desc: "Mỗi Gia Tốc cho Jayce Tốc Đánh và cộng sát thương Q, R Pháo. Chỉ tính ở dạng Pháo, ở Búa vẫn giữ nhưng không có tác dụng, bị hạ thì mất một nửa."
        },
        en: {
            name: "Gate", desc: "Each Gate gives Jayce attack speed and adds damage to Cannon Q and R. Only counts in Cannon form, Hammer keeps it without effect, halved when taken down."
        },
    },
    jayce_charge: {
        vi: {
            name: "Tăng Lực", desc: "Đòn đánh kế tiếp của Jayce gây thêm sát thương vật lý. Mất khi chết."
        },
        en: {
            name: "Charge", desc: "Jayce's next attack deals extra physical damage. Lost on death."
        },
    },
    lux_pool: {
        vi: {
            name: "Ánh Sáng", desc: "Mỗi vài mana cả đội tiêu cho 1 Ánh Sáng, vô hạn. Mỗi chiêu của Lux gây thêm sát thương phép theo Ánh Sáng; E Choáng khi đủ Ánh Sáng. Mất một nửa khi Lux bị hạ."
        },
        en: {
            name: "Light", desc: "Every few mana paid for a Lux skill gives 1 Light, unlimited. Each Lux skill deals extra magic damage per Light; E Stuns once she has enough. Half is lost when Lux is taken down."
        },
    },
    evolve: {
        vi: {
            name: "Tiến Hoá", desc: "Mỗi lá bỏ khỏi tay phe Viktor cho 1 Tiến Hoá, vô hạn. Mỗi Tiến Hoá thêm sát thương phép cho mọi chiêu của Viktor. Mất một nửa khi Viktor bị hạ."
        },
        en: {
            name: "Evolution", desc: "Every card your side discards from hand gives Viktor 1 Evolution, unlimited. Each Evolution adds magic damage to all of Viktor's skills. Half is lost when Viktor is taken down."
        },
    },
    velkoz_decay: {
        vi: {
            name: "Phân Rã", desc: "Dấu của Vel'Koz trên địch: mỗi tia chiêu trúng +1; đủ số thì tiêu và nổ sát thương chuẩn. Tướng mang chết mất một nửa; Vel'Koz chết không đổi."
        },
        en: {
            name: "Decay", desc: "Vel'Koz's mark on an enemy: +1 per skill beam that hits; at the threshold it is spent and blows up for true damage. The bearer dying halves it; Vel'Koz dying changes nothing."
        },
    },
}

/** Lá đặc biệt của nhóm, chữ tiếng Anh (khoá = id lá) */
export const SPECIAL_KITS_MAGE: Record<string, Txt> = {
    tf_fate: {
        name: "Destiny", desc: "The top card of your deck: play this card to put that card on the bottom of the deck. Temporary."
    },
    rumble_pick: {
        name: "Recycle", desc: "Take this skill card out of the graveyard; Rumble receives a Recycled card of it. When the picks run out, the remaining pick cards vanish. Temporary."
    },
}

/** Từ khoá của nhóm (khoá = id), ghi đè bản cũ cùng id để tên hiển thị không trùng */
export const KEYWORDS_KITS_MAGE: Record<string, Keyword> = {
    lux_pool: {
        vi: "Ánh Sáng",
        en: "Light",
        descVi: "Bộ đếm của Lux: mỗi vài mana cả đội tiêu cho 1, vô hạn, mất một nửa khi Lux bị hạ; mỗi chiêu của Lux gây thêm sát thương theo Ánh Sáng (xem Lux).",
        descEn: "Lux's counter: every few mana paid for her skills gives 1, unlimited, half lost when Lux is taken down; each Lux skill deals extra damage per Light (see Lux).",
    },
    evolve: {
        vi: "Tiến Hoá",
        en: "Evolution",
        descVi: "Bộ đếm của Viktor: mỗi lá bỏ khỏi tay phe mình cho 1, vô hạn, mất một nửa khi Viktor bị hạ; mỗi nấc thêm sát thương cho chiêu của Viktor (xem Viktor).",
        descEn: "Viktor's counter: every card your side discards from hand gives 1, unlimited, half lost when Viktor is taken down; each level adds damage to Viktor's skills (see Viktor).",
    },
    decay: {
        vi: "Phân Rã",
        en: "Decay",
        descVi: "Dấu của Vel'Koz trên địch: mỗi tia chiêu của Vel'Koz trúng +1; đủ số thì tiêu và nổ sát thương chuẩn. Tướng mang chết mất một nửa.",
        descEn: "Vel'Koz's mark on an enemy: +1 per Vel'Koz skill beam that hits; at the threshold it is spent and blows up for true damage. The bearer dying halves it.",
    },
    frozen: {
        vi: "Hoá Băng",
        en: "Frozen",
        descVi: "Lá trên tay không đánh, ghép hay nối Chuỗi được nhưng vẫn chiếm chỗ; tan sau một số đơn vị hoặc khi Lissandra bị hạ. Đối thủ chỉ thấy số lá băng và tướng chủ của lá.",
        descEn: "A card in hand that cannot be played, crafted or chained but still takes space; thaws after a number of units or when Lissandra is taken down. The opponent only sees the frozen count and the card's champion.",
    },
    stolen: {
        vi: "Chiêu Đoạt",
        en: "Hijacked skill",
        descVi: "Lá Sylas đoạt từ tướng địch trên sân: Sylas dùng như chiêu của mình, trả mana gốc, AD đổi từ AP, giữ nguyên khống chế và Quick, tồn tại tới hết lượt đối phương, dùng xong biến mất (xem Sylas).",
        descEn: "A skill Sylas hijacks from an enemy on the board: he casts it as his own at its original mana, AD comes from AP, crowd control and Quick are kept, it lasts until the end of the opponent's turn and vanishes after use (see Sylas).",
    },
    recycled: {
        vi: "Lá Tái Chế",
        en: "Recycled card",
        descVi: "Lá của Rumble làm từ lá chiêu trong mộ: Rumble dùng như chiêu của mình, AD đổi từ AP, không áp khống chế, giảm mana, tồn tại tới hết lượt đối phương, dùng xong biến mất (xem Rumble).",
        descEn: "A card Rumble makes from a skill card in the graveyard: Rumble casts it as his own skill, AD comes from AP, no crowd control, costs less mana, lasts until the end of the opponent's turn and vanishes after use (see Rumble).",
    },
}
