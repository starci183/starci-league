// Gọi API của server bằng XMLHttpRequest (chạy được cả web preview lẫn bản native của Cocos).
// Phiên đăng nhập giữ ở sys.localStorage "sc.session", cùng khoá với bản web.
import {
    sys
} from "cc"
import {
    API_BASE
} from "./config"

const SESSION_KEY = "sc.session"

export interface User { id: string; email: string; name: string }
export interface Session { token: string; user: User }
export interface DeckRow { id: string; name: string; cards: string[]; is_active: boolean }
export interface PoolCard { id: string; group: string; max: number; name: string; desc: string }
export interface CardCatalog { size: number; pool: PoolCard[]; defaultDeck: string[]; prefix: string }

function call<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {
}): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(init.method ?? "GET",
            API_BASE + path)
        xhr.timeout = 15000
        if (init.body !== undefined) xhr.setRequestHeader("content-type",
            "application/json")
        if (init.token) xhr.setRequestHeader("authorization",
            `Bearer ${init.token}`)
        xhr.onload = () => {
            let data: (T & { error?: string }) | null = null
            try { data = JSON.parse(xhr.responseText) as T & { error?: string } } catch { /* thân rỗng */ }
            if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data)
            else reject(new Error(data?.error ?? `Lỗi máy chủ (${xhr.status})`))
        }
        xhr.onerror = () => reject(new Error("Không kết nối được máy chủ"))
        xhr.ontimeout = () => reject(new Error("Máy chủ phản hồi quá lâu"))
        xhr.send(init.body === undefined ? null : JSON.stringify(init.body))
    })
}

function keep(s: Session): Session {
    sys.localStorage.setItem(SESSION_KEY,
        JSON.stringify(s))
    return s
}

export function signOut() {
    sys.localStorage.removeItem(SESSION_KEY)
}

/** Phiên đã lưu còn hiệu lực không; hỏi lại server để lấy tên mới nhất */
export async function restoreSession(): Promise<Session | null> {
    let saved: Session | null = null
    try { saved = JSON.parse(sys.localStorage.getItem(SESSION_KEY) ?? "null") as Session | null } catch { /* dữ liệu hỏng */ }
    if (!saved?.token) return null
    try {
        return keep({
            token: saved.token, user: await call<User>("/me",
                {
                    token: saved.token
                })
        })
    } catch {
        signOut()
        return null
    }
}

export const signIn = async (email: string, password: string) => keep(await call<Session>("/auth/login",
    {
        method: "POST", body: {
            email, password
        }
    }))

export const signUp = async (email: string, password: string, displayName: string) => keep(await call<Session>("/auth/register",
    {
        method: "POST", body: {
            email, password, displayName
        }
    }))

export const cardCatalog = () => call<CardCatalog>("/cards")

export const listDecks = (s: Session) => call<DeckRow[]>("/decks",
    {
        token: s.token
    })

export const createDeck = (s: Session, name: string, cards: string[]) => call<DeckRow>("/decks",
    {
        method: "POST", token: s.token, body: {
            name, cards
        }
    })

export const updateDeck = (s: Session, id: string, patch: { name?: string; cards?: string[] }) => call<DeckRow>(`/decks/${id}`,
    {
        method: "PATCH", token: s.token, body: patch
    })

export const activateDeck = (s: Session, id: string) => call<DeckRow>(`/decks/${id}/activate`,
    {
        method: "POST", token: s.token
    })

export const deleteDeck = (s: Session, id: string) => call<{ ok: true }>(`/decks/${id}`,
    {
        method: "DELETE", token: s.token
    })
