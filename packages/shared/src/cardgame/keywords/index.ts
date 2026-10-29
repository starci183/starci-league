// Gộp từ khoá chung + 4 nhóm tướng cũ + từ khoá V2 của 5 nhóm tướng mới (V2 ghi đè id cũ trùng tên).
// RichText khớp theo TÊN nên không được có 2 từ khoá cùng tên hiển thị (scripts/card_tests_v2.ts kiểm tra).
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
import {
    KEYWORDS_V2_G1
} from "../i18n/v2_g1"
import {
    KEYWORDS_V2_G2V
} from "../i18n/v2_g2v"
import {
    KEYWORDS_V2_G3V
} from "../i18n/v2_g3v"
import {
    KEYWORDS_V2_G4V
} from "../i18n/v2_g4v"
import {
    KEYWORDS_V2_G5V
} from "../i18n/v2_g5v"

export type {
    Keyword
}
/** Toàn bộ từ khoá, khoá = id */
export const KEYWORDS: Record<string, Keyword> = {
    ...KEYWORDS_GENERAL,
    ...KEYWORDS_A,
    ...KEYWORDS_B,
    ...KEYWORDS_C,
    ...KEYWORDS_D,
    ...KEYWORDS_V2_G1,
    ...KEYWORDS_V2_G2V,
    ...KEYWORDS_V2_G3V,
    ...KEYWORDS_V2_G4V,
    ...KEYWORDS_V2_G5V,
}
