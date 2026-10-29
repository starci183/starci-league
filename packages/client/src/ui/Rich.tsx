// Chữ mô tả kiểu tooltip LoL (rich text):
//  · {100 + 50% AD}  -> công thức: có tướng thì tính ra số "222" đậm vàng + công thức mờ trong ngoặc
//  · **cụm chữ**     -> phần cần nhấn mạnh, in đậm sáng
//  · từ khóa hiệu ứng (Choáng, Buốt...) -> đậm + icon (xanh có lợi / đỏ bất lợi), con số + đơn vị -> đậm vàng
// Cuối tooltip là chú giải các hiệu ứng có mặt. Dùng chung cho tướng / chiêu / đồ / lá bài.
import {
    Fragment
} from "react"
import {
    formulaParts, keywordParts, keywordsIn, type UnitLike
} from "@starci/shared"

/** Đoạn chữ thường: từ khóa + con số */
function Plain({ text }: { text: string }) {
    return (
        <>
            {keywordParts(text).map((p, i) =>
                typeof p === "string" ? <Fragment key={i}>{p}</Fragment>
                    : "num" in p ? <b key={i} className="num">{p.text}</b>
                        : <b key={i} className={`kw ${p.kw.good ? "good" : "bad"}`}><img src={`/${p.kw.icon}`} alt="" />{p.text}</b>)}
        </>
    )
}

/** Một dòng: tách **nhấn mạnh** rồi tới công thức {…} rồi tới chữ thường */
function Line({ text, unit }: { text: string; unit?: UnitLike }) {
    return (
        <>
            {text.split(/(\*\*[^*]+\*\*)/g).map((seg, si) => {
                const strong = seg.startsWith("**") && seg.endsWith("**") && seg.length > 4
                const body = strong ? seg.slice(2,
                    -2) : seg
                const inner = formulaParts(body,
                    unit).map((f, fi) => typeof f === "string" ? <Plain key={fi} text={f} />
                    : f.value !== undefined
                        ? <Fragment key={fi}><b className="num">{f.value}</b> <span className="text-hex-muted">({f.expr})</span></Fragment>
                        : <b key={fi} className="num">{f.expr}</b>)
                return strong ? <b key={si} className="font-extrabold text-[#fff3cf]">{inner}</b> : <Fragment key={si}>{inner}</Fragment>
            })}
        </>
    )
}

/** `unit`: tướng đang xem, để tính công thức {…} ra số */
export function Rich({ text, className, unit }: { text: string; className?: string; unit?: UnitLike }) {
    return (
        <span className={className}>
            {text.split("\n").map((line, li) => (
                <Fragment key={li}>
                    {li > 0 && <br />}
                    <Line text={line} unit={unit} />
                </Fragment>
            ))}
        </span>
    )
}

/** Chú giải các hiệu ứng xuất hiện trong những câu này */
export function Glossary({ texts }: { texts: (string | undefined)[] }) {
    const kws = keywordsIn(texts.map((x) => x?.replace(/\*\*/g,
        "")))
    if (!kws.length) return null
    return (
        <div className="mt-2 border-t border-hex-gold/30 pt-2 text-[12px] leading-snug text-hex-muted">
            {kws.map((k) => (
                <p key={k.id} className="mb-1">
                    <b className={`kw ${k.good ? "good" : "bad"} mr-1`}><img src={`/${k.icon}`} alt="" />{k.name}</b>
                    <Rich text={k.desc} />
                </p>
            ))}
        </div>
    )
}
