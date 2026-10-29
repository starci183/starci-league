// Gộp từ khoá chung + 4 nhóm tướng. Mỗi agent chỉ sửa file nhóm của mình.
import type {
    Keyword
} from "./types"
import {
    KEYWORDS_GENERAL
} from "./general"
import {
    KEYWORDS_A
} from "./a"
import {
    KEYWORDS_B
} from "./b"
import {
    KEYWORDS_C
} from "./c"
import {
    KEYWORDS_D
} from "./d"

export type {
    Keyword
}
/** Toàn bộ từ khoá, khoá = id */
export const KEYWORDS: Record<string, Keyword> = {
    ...KEYWORDS_GENERAL, ...KEYWORDS_A, ...KEYWORDS_B, ...KEYWORDS_C, ...KEYWORDS_D,
}
