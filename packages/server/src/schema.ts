import {
    ArraySchema, MapSchema, Schema, type
} from "@colyseus/schema"
import {
    NEXUS_HP, TOWER_HP
} from "@starci/shared"

/** Một tướng trong Đội Hình. Ngoài sân thì lane = -1 (vẫn giữ đồ, stack, Mana/Nộ). */
export class UnitState extends Schema {
  @type("string") id = ""
  @type("string") owner = "A"
  @type("string") defId = ""
  @type("int8") lane = -1
  @type("string") row = "front"
  /** roster: chưa ra sân · board: trên sân · dead: đang treo · rest: vừa rút về */
  @type("string") status = "roster"
  /** Lượt sớm nhất được triệu hồi lại (sau khi chết hoặc rút về) */
  @type("uint16") readyTurn = 0
  @type("int32") hp = 0
  @type("int32") maxHp = 0
  @type("int32") shield = 0
  @type("int16") atkBonus = 0
  /** Mana hoặc Nộ */
  @type("int16") mana = 0
  @type(["string"]) items = new ArraySchema<string>()
  @type("boolean") attacked = false
  /** Đã đi 1 ô lượt này */
  @type("boolean") moved = false
  @type("boolean") castThisTurn = false
  @type("boolean") empowered = false
  @type("boolean") hidden = false
  @type("uint16") summonedTurn = 0
  @type("string") markedTargetId = ""
  @type({
      map: "uint8"
  }) cooldowns = new MapSchema<number>()
  @type({
      map: "uint8"
  }) statuses = new MapSchema<number>()
  /** Bộ đếm của đồ và nội tại (cộng dồn, cờ, chỉ số vĩnh viễn) */
  @type({
      map: "int32"
  }) stacks = new MapSchema<number>()
}

/** Một bãi quái ở hàng rừng */
export class MonsterState extends Schema {
  @type("string") id = ""
  @type("int8") lane = 0
  @type("int32") hp = 0
  @type("int32") maxHp = 0
  /** Sát thương mỗi phe đã gây trong lần xuất hiện này (Baron: phe nhiều hơn nhận bùa) */
  @type("int32") dmgA = 0
  @type("int32") dmgB = 0
  /** 0 = đang có mặt; >0 = vòng quái xuất hiện lại */
  @type("uint16") respawnRound = 0
}

export class PlayerState extends Schema {
  @type("string") sessionId = ""
  @type("string") name = ""
  @type("string") side = "A"
  @type("uint8") mana = 0
  @type("uint8") maxMana = 0
  @type("uint8") gold = 0
  /** Nhà: phá Nhà là thắng */
  @type("int32") nexus = NEXUS_HP
  /** Máu trụ trước Nhà ở từng đường (0 = đã sập) */
  @type(["int16"]) towers = new ArraySchema<number>(TOWER_HP,
      TOWER_HP,
      TOWER_HP,
      TOWER_HP,
      TOWER_HP)
  /** Lane nào đang có bài úp (đối thủ chỉ biết có bài, không biết là bài gì) */
  @type(["boolean"]) traps = new ArraySchema<boolean>(false,
      false,
      false,
      false,
      false)
  @type("uint8") handCount = 0
  @type("uint8") deckCount = 0
  /** Kho mảnh (tối đa 8) */
  @type(["string"]) bench = new ArraySchema<string>()
  /** Đã gửi lựa chọn lật bài ở mốc triệu hồi hiện tại chưa */
  @type("boolean") summonReady = false
  /** Chuỗi hạ gục liên tiếp (để tính tiền thưởng khi bị hạ) */
  @type("uint8") streak = 0
  /** Vòng sớm nhất được dùng Trừng Phạt lần nữa */
  @type("uint16") smiteRound = 0
}

/** Vùng tồn tại nhiều lượt (Tibbers, bãi lửa...): xem ZoneLike trong shared */
export class ZoneState extends Schema {
  @type("string") id = ""
  @type("string") key = ""
  @type("string") owner = ""
  @type("string") defId = ""
  @type("string") srcId = ""
  @type("string") side = ""
  @type("int8") lane = 0
  @type("int8") row = 0
  @type("string") shape = "1x1"
  @type("uint8") turns = 0
  /** Vùng có máu (Tibbers): 0 = không có máu */
  @type("int32") hp = 0
  @type("int32") maxHp = 0
}

export class DuelState extends Schema {
  /** waiting | draft (cấm/chọn) | summon (mốc lật bài) | playing | ended */
  @type("string") phase = "waiting"
  @type("uint16") turn = 0
  @type("uint16") round = 0
  @type("string") activeSide = "A"
  @type("string") winner = ""
  /** Mốc triệu hồi đang mở: số tướng mỗi bên được lật thêm */
  @type("uint8") summonCount = 0
  /** Lượt này đã có tướng đánh Nhà chưa */
  @type("boolean") nexusHit = false
  @type({
      map: UnitState
  }) units = new MapSchema<UnitState>()
  @type({
      map: PlayerState
  }) players = new MapSchema<PlayerState>() // key: "A" | "B"
  /** Cấm/chọn: bước hiện tại trong DRAFT_ORDER, tướng bị cấm, tướng mỗi bên đã chọn */
  @type("uint8") draftStep = 0
  @type(["string"]) bans = new ArraySchema<string>()
  @type(["string"]) picksA = new ArraySchema<string>()
  @type(["string"]) picksB = new ArraySchema<string>()
  /** 5 bãi quái hàng rừng, theo đường */
  @type([MonsterState]) monsters = new ArraySchema<MonsterState>()
  @type([ZoneState]) zones = new ArraySchema<ZoneState>()
  @type(["string"]) log = new ArraySchema<string>()

  /** Sự kiện chiêu/đòn đánh gần nhất để client chơi hiệu ứng (seq tăng dần) */
  @type("uint32") fxSeq = 0
  @type("string") fx = ""
}
