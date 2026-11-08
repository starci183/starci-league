// Trừ máu, hồi máu, Khiên cho demo VFX: dùng đúng đường hiển thị của trận (số nổi, thanh máu), chỉ đổi bản hiển thị, không đụng engine.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    applyToDisplay, getCard, holdDisplay, snapDisplay
} from "../../store"

const unit = (id: string) => getCard().view?.units[id]

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Bắt đầu demo: giữ bản hiển thị để các cú trúng cập nhật máu lên bàn */
export const openHits = () => holdDisplay()
/** Kết thúc demo: trả bàn về trạng thái thật */
export const closeHits = () => snapDisplay()

export function landDamage(id: string, amount: number, kind: cg.DamageKind) {
    const u = unit(id)
    if (!u) return
    const hpLost = Math.min(amount,
        u.hp - 1)
    land({
        t: "damage", target: id, amount, hpLost, absorbed: 0, kind, tag: "skill", hp: u.hp - hpLost
    })
}

export function landHeal(id: string, amount: number) {
    const u = unit(id)
    if (!u) return
    const real = Math.min(amount,
        u.maxHp - u.hp)
    land({
        t: "heal", target: id, amount: real, hp: u.hp + real
    })
}

export function landShield(id: string, amount: number) {
    const u = unit(id)
    if (!u) return
    land({
        t: "shield", target: id, amount, shield: u.shield + amount
    })
}

/** Dựng sẵn tướng đã mất máu, không hiện số nổi */
export function presetWound(id: string, amount: number) {
    const u = unit(id)
    if (!u) return
    applyToDisplay([{
        t: "damage", target: id, amount, hpLost: amount, absorbed: 0, kind: "physical", tag: "skill", hp: u.hp - amount
    }])
}
