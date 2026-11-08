import {
    Children, cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode
} from "react"
import {
    createPortal
} from "react-dom"
import "./action-dialog.css"
import {
    ScrollArea
} from "./ScrollArea"
import {
    useGameOverlay
} from "./GameCanvas"
import {
    ArtFrame
} from "./ArtFrame"

function framedActions(children: ReactNode): ReactNode {
    return Children.map(children,
        (child) => {
            if (!isValidElement(child)) return child
            const element = child as ReactElement<{ children?: ReactNode; className?: string }>
            if (element.type === "button" && /action-(primary|secondary)/.test(element.props.className ?? "")) {
                return cloneElement(element,
                    {
                        className: `${element.props.className} action-art-button`
                    },
                    <ArtFrame kind="name" width="100%" height="100%">{element.props.children}</ArtFrame>)
            }
            return element.props.children ? cloneElement(element,
                {
                },
                framedActions(element.props.children)) : element
        })
}

/** Hộp hành động dùng bàn phím được, không bị cắt bởi khung bàn/tay bài. */
export function ActionDialog(p: { title: string; subtitle?: string; className?: string; hideCancel?: boolean; onClose(): void; children: ReactNode; footer?: ReactNode }) {
    const overlay = useGameOverlay()
    const title = useId()
    const panel = useRef<HTMLDivElement>(null)
    const close = useRef(p.onClose)
    close.current = p.onClose
    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
        panel.current?.focus()
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close.current(); return }
            if (e.key !== "Tab") return
            const nodes = [...(panel.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [tabindex=\"0\"]") ?? [])]
            const first = nodes[0], last = nodes[nodes.length - 1]
            if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last?.focus() }
            else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { e.preventDefault(); first?.focus() }
        }
        window.addEventListener("keydown",
            key,
            true)
        return () => { window.removeEventListener("keydown",
            key,
            true); if (previous?.isConnected) previous.focus() }
    },
    [])
    return createPortal(<div className={`action-veil${p.className === "mode-dialog" ? " mode-veil" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) p.onClose() }}>
        <div className={`action-dialog ${p.className ?? ""}`} role="dialog" aria-modal="true" aria-labelledby={title} ref={panel} tabIndex={-1}>
            <div className="action-perimeter" aria-hidden="true"><i /><i /><i /><i /></div>
            <header><div className="action-heading"><ArtFrame kind="title" width="100%" height={160}><h2 id={title}>{p.title}</h2></ArtFrame>{p.subtitle ? <p>{p.subtitle}</p> : null}</div><button className="action-close action-art-close" aria-label="Đóng" onClick={p.onClose}><ArtFrame kind="icon" width={50} height={50}>×</ArtFrame></button></header>
            <ScrollArea className="action-body" label={`Cuộn ${p.title}`}>{p.children}</ScrollArea>
            <footer>{framedActions(p.footer)}{p.hideCancel ? null : framedActions(<button className="action-secondary" onClick={p.onClose}>Huỷ</button>)}</footer>
        </div>
    </div>,
    overlay ?? document.body)
}
