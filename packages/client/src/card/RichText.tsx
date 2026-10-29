// Hiển thị mô tả lá/chiêu/đồ: **đậm**, *nghiêng*, xuống dòng, và từ khoá (gạch chấm, rê chuột xem định nghĩa).
// Dùng chung cho tay bài, màn cấm/chọn, bảng chỉ số và khung rê chuột trên sân.
import type {
    ReactNode
} from "react"
import {
    KEYWORDS
} from "@starci/shared/src/cardgame/keywords"

const isEn = (): boolean => {
    try { return localStorage.getItem("lang") === "en" } catch { return false }
}

/** Bảng tên từ khoá -> định nghĩa theo ngôn ngữ đang chọn (tên dài khớp trước) */
function keywordIndex(): { name: string; desc: string }[] {
    const en = isEn()
    return Object.values(KEYWORDS)
        .map((k) => ({
            name: en ? k.en : k.vi, desc: en ? k.descEn : k.descVi
        }))
        .filter((k) => k.name.length > 1)
        .sort((a, b) => b.name.length - a.name.length)
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g,
    "\\$&")

/** Tách đoạn chữ thường thành chữ + từ khoá */
function withKeywords(text: string, keyBase: string): ReactNode[] {
    const kws = keywordIndex()
    if (!kws.length) return [text]
    const re = new RegExp(`(${kws.map((k) => escapeRe(k.name)).join("|")})`,
        "g")
    const byName = new Map(kws.map((k) => [k.name,
        k.desc]))
    return text.split(re).map((part, i) => {
        const desc = byName.get(part)
        return desc
            ? <span key={`${keyBase}k${i}`} className="cg-kw" title={desc}>{part}</span>
            : part
    })
}

/** Một dòng: xử lý **đậm** và *nghiêng*, phần còn lại tìm từ khoá */
function line(text: string, keyBase: string): ReactNode[] {
    const out: ReactNode[] = []
    const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let last = 0
    let m: RegExpExecArray | null
    let i = 0
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(...withKeywords(text.slice(last,
            m.index),
        `${keyBase}t${i}`))
        if (m[1] !== undefined) out.push(<b key={`${keyBase}b${i}`}>{withKeywords(m[1],
            `${keyBase}bb${i}`)}</b>)
        else out.push(<i key={`${keyBase}i${i}`}>{withKeywords(m[2],
            `${keyBase}ii${i}`)}</i>)
        last = m.index + m[0].length
        i++
    }
    if (last < text.length) out.push(...withKeywords(text.slice(last),
        `${keyBase}end`))
    return out
}

/** Hiển thị mô tả có markdown nhẹ + từ khoá */
export function RichText({ text, className }: { text: string; className?: string }) {
    const lines = text.split(/\n/)
    return (
        <span className={className ? `cg-rich ${className}` : "cg-rich"}>
            {lines.map((l, i) => (
                <span key={i}>
                    {i > 0 ? <br /> : null}
                    {line(l,
                        `l${i}`)}
                </span>
            ))}
        </span>
    )
}
