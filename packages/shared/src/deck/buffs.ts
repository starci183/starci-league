// Buff có hạn từ bài: mỗi buff là một bộ IProp gắn tạm lên tướng (cùng engine với đồ).
import * as C from "../items/conditions"
import {
    hit, laneEnemies, other
} from "../helpers"
import {
    mainDamageOf
} from "../heroes/kit"
import {
    rowIndex
} from "../cards"
import {
    defineBuff
} from "./registry"

defineBuff({
    id: "exhaust", name: "Kiệt Sức", short: "Kiệt", desc: "Gây ít hơn 40% sát thương.", props: [{
        name: "Kiệt Sức", desc: "−40% sát thương gây ra.", damageMult: () => 0.6
    }]
})
defineBuff({
    id: "wrath", name: "Thuốc Cuồng Nộ", short: "Cuồng nộ", desc: "+25% AD.", props: [{
        name: "Thuốc Cuồng Nộ", desc: "+25% AD.", stats: {
            atkMult: 0.25
        }
    }]
})
defineBuff({
    id: "sorcery", name: "Thuốc Phù Thủy", short: "Phù thủy", desc: "+40 AP.", props: [{
        name: "Thuốc Phù Thủy", desc: "+40 AP.", stats: {
            ap: 40
        }
    }]
})
defineBuff({
    id: "baron", name: "Bùa Baron", short: "Baron", desc: "+15% AD, +20 AP, đánh trụ/Nhà +50%.", props: [{
        name: "Bùa Baron", desc: "+15% AD, +20 AP, đánh trụ/Nhà +50%.", stats: {
            atkMult: 0.15, ap: 20
        }
    }]
})
defineBuff({
    id: "regen", name: "Bình Máu", short: "Hồi máu", desc: "Đầu mỗi lượt của bạn hồi 80 máu.", props: [{
        name: "Bình Máu", desc: "Đầu lượt hồi 80 máu.", onTurnStart: (c) => [{
            type: "heal", unitId: c.self.id, amount: 80
        }]
    }]
})
defineBuff({
    id: "crit", name: "Chí Mạng", short: "Chí mạng", desc: "Mọi đòn đánh thường đều chí mạng.", props: [{
        name: "Chí Mạng", desc: "100% chí mạng.", stats: {
            crit: 1
        }
    }]
})
defineBuff({
    id: "execute", name: "Đòn Kết Liễu", short: "Kết liễu", desc: "Gây thêm 50% sát thương lên tướng địch còn dưới 40% máu.",
    props: [{
        name: "Đòn Kết Liễu", desc: "+50% lên tướng dưới 40% máu.", condition: C.targetHpBelow(0.4), damageMult: () => 1.5
    }]
})
defineBuff({
    id: "tempo", name: "Nhịp Độ Chết Người", short: "Nhịp độ", desc: "+40% Tốc đánh.", props: [{
        name: "Nhịp Độ Chết Người", desc: "+40% Tốc đánh.", stats: {
            extraAtk: 0.4
        }
    }]
})
defineBuff({
    id: "pierce", name: "Đâm Xuyên", short: "Xuyên", desc: "Đòn đánh thường xuyên qua mục tiêu, trúng cả tướng đứng ngay sau với 60% sát thương.",
    props: [{
        name: "Đâm Xuyên", desc: "Xuyên 60% sang tướng đứng sau.", onAttack: (c) => {
            if (!c.state || !c.target) return []
            const behind = laneEnemies(c.state,
                other(c.self.owner),
                c.target.lane).find((u) => rowIndex(u.row) === rowIndex(c.target!.row) + 1)
            return behind ? [hit(behind,
                mainDamageOf(c.effects,
                    c.target) * 0.6,
                "Đâm Xuyên")] : []
        }
    }]
})
