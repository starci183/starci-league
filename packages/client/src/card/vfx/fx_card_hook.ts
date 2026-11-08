// Cú cướp lá trong trận (plan.ts qua vfxCardHook) dùng đúng Nắm Đấm Tên Lửa của Blitzcrank: giữ hợp đồng tether, lá bay thật bám theo nắm đấm.
import {
    rocketFist
} from "./fx_blitzcrank"
import {
    registerVfx
} from "./types"

registerVfx("cardHook",
    rocketFist)
