// BẪY: úp ở 1 đường (1 mana), đối thủ chỉ thấy mặt sau. Tướng địch trong đường đó ra tay đúng kiểu thì bẫy tự lật.
// Mô phỏng chiêu đặt bẫy / khống chế của LoL. Điều kiện cường hóa xét trên tướng địch dính bẫy.
import {
    hit, status
} from "../helpers"
import type {
    Effect
} from "../types"
import * as K from "./conds"
import {
    defineTrap
} from "./registry"

defineTrap({
    kind: "trap", id: "cam_lang", name: "Bẫy Câm Lặng", mana: 1, trigger: "cast", lol: "Soraka E · Điểm Phân Cực",
    desc: "Khi 1 tướng địch ở đường này tung chiêu: huỷ chiêu đó.",
    boosts: [{
        when: K.role("mage",
            "support"), bonus: "tướng đó còn bị Choáng 1 vòng"
    }],
    resolve: ({ actor, met }) => ({
        effects: met[0] ? [status(actor,
            "stun",
            1)] : [], cancel: true
    })
})

defineTrap({
    kind: "trap", id: "bay_gai", name: "Bẫy Gai", mana: 1, trigger: "attack", lol: "Zyra W · Hạt Giống Gai",
    desc: "Khi 1 tướng địch ở đường này đánh thường: trước đòn đánh đó, tướng đó mất 100 máu.",
    boosts: [{
        when: K.role("fighter",
            "assassin",
            "tank"), bonus: "mất 180 máu thay vào đó, và bị Buốt 1 vòng"
    }],
    resolve: ({ actor, met }) => ({
        effects: met[0] ? [hit(actor,
            180,
            "Bẫy Gai"),
        status(actor,
            "chill",
            1)] : [hit(actor,
            100,
            "Bẫy Gai")]
    })
})

defineTrap({
    kind: "trap", id: "nam_teemo", name: "Nấm Độc", mana: 1, trigger: "any", lol: "Teemo R · Bẫy Độc",
    desc: "Khi 1 tướng địch ở đường này đánh thường hoặc tung chiêu: tướng đó trúng Độc 40 máu mỗi vòng trong 3 vòng, và bị Buốt 2 vòng.",
    boosts: [{
        when: K.hpBelow(0.5), bonus: "Độc 70 máu mỗi vòng thay vào đó"
    }],
    resolve: ({ actor, met }) => ({
        effects: [{
            type: "burn", unitId: actor.id, amount: met[0] ? 70 : 40, turns: 3
        },
        status(actor,
            "chill",
            2)]
    })
})

defineTrap({
    kind: "trap", id: "bay_yordle", name: "Bẫy Yordle", mana: 1, trigger: "attack", lol: "Caitlyn W · Bẫy Yordle",
    desc: "Khi 1 tướng địch ở đường này đánh thường: huỷ đòn đánh đó, và tướng đó bị Trói 1 vòng.",
    boosts: [{
        when: K.role("marksman"), bonus: "tướng đó còn mất 120 máu"
    }],
    resolve: ({ actor, met }) => ({
        effects: [status(actor,
            "stun",
            1),
        ...(met[0] ? [hit(actor,
            120,
            "Bẫy Yordle")] : [])], cancel: true
    })
})

defineTrap({
    kind: "trap", id: "hop_he", name: "Hộp Hề", mana: 1, trigger: "cast", lol: "Shaco W · Hộp Hề Ma Quái",
    desc: "Khi 1 tướng địch ở đường này tung chiêu: huỷ chiêu đó, và tướng đó bị Choáng 1 vòng.",
    boosts: [{
        when: K.rowIs("back"), bonus: "Choáng 2 vòng thay vào đó"
    }],
    resolve: ({ actor, met }) => ({
        effects: [status(actor,
            "stun",
            met[0] ? 2 : 1)], cancel: true
    })
})

defineTrap({
    kind: "trap", id: "tuong_bang", name: "Tường Băng", mana: 1, trigger: "structure", lol: "Anivia W · Tường Băng",
    desc: "Khi 1 tướng địch đánh trụ hoặc Nhà ở đường này: chặn đòn đánh đó, và tướng đó bị Buốt 1 vòng.",
    boosts: [{
        when: K.role("tank",
            "fighter"), bonus: "tướng đó bị Đóng băng 1 vòng thay vào đó"
    }],
    resolve: ({ actor, met }) => ({
        effects: [status(actor,
            met[0] ? "freeze" : "chill",
            1)], cancel: true
    })
})

defineTrap({
    kind: "trap", id: "hat_tung", name: "Hất Tung", mana: 1, trigger: "attack", lol: "Alistar Q · Nghiền Nát",
    desc: "Khi 1 tướng địch ở đường này đánh thường: tướng đó bị Hất tung 1 vòng và mất 90 máu.",
    boosts: [{
        when: K.rowIs("front"), bonus: "mất 150 máu thay vào đó, và đòn đánh bị huỷ"
    }],
    resolve: ({ actor, met }) => ({
        effects: [hit(actor,
            met[0] ? 150 : 90,
            "Hất Tung"),
        status(actor,
            "stun",
            1)], cancel: met[0]
    })
})

defineTrap({
    kind: "trap", id: "moc_xich", name: "Móc Xích", mana: 1, trigger: "cast", lol: "Blitzcrank Q · Bàn Tay Hỏa Tiễn",
    desc: "Khi 1 tướng địch ở đường này tung chiêu: kéo tướng đó lên 1 hàng, và tướng đó mất 80 máu.",
    boosts: [{
        when: K.rowIs("back"), bonus: "mất 150 máu thay vào đó, và bị Choáng 1 vòng"
    }],
    resolve: ({ actor, met }) => ({
        effects: [{
            type: "pull", unitId: actor.id
        },
        hit(actor,
            met[0] ? 150 : 80,
            "Móc Xích"),
        ...(met[0] ? [status(actor,
            "stun",
            1)] : [])]
    })
})

defineTrap({
    kind: "trap", id: "bai_moi", name: "Bài Mồi", mana: 0, trigger: "any", lol: "Shaco R · Phân Thân",
    desc: "Khi 1 tướng địch ở đường này đánh thường hoặc tung chiêu: tướng đó mất 80 máu và bị Buốt 1 vòng, rồi bạn rút 1 lá.",
    boosts: [{
        when: K.hpBelow(0.5), bonus: "mất 160 máu thay vào đó"
    }],
    resolve: ({ side, actor, met }) => ({
        effects: [hit(actor,
            met[0] ? 160 : 80,
            "Bài Mồi"),
        status(actor,
            "chill",
            1),
{
    type: "draw", side, n: 1
} as Effect]
    })
})
