// Loại sát thương chiêu của từng tướng: mỗi chiêu ra MỘT loại, công thức cộng cả AD và AP.
// Tướng không có trong bảng: sát thương phép.
export const PHYSICAL_HEROES = new Set(["aatrox",
    "darius",
    "zed",
    "khazix",
    "vayne",
    "ashe",
    "jinx",
    "kogmaw",
    "qiyana"])
export const heroDamageKind = (defId: string): "physical" | "magic" => (PHYSICAL_HEROES.has(defId) ? "physical" : "magic")
