// Tài khoản và bộ bài qua API của server (PostgreSQL), thay Supabase. Phiên đăng nhập giữ ở localStorage "sc.session".
const API = import.meta.env.VITE_API_URL ?? "http://localhost:2567/api"
const SESSION_KEY = "sc.session"

export interface User { id: string; email: string; name: string }
export interface Session { token: string; user: User }
export interface DeckRow { id: string; name: string; cards: string[]; is_active: boolean }

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {
}): Promise<T> {
    const res = await fetch(API + path,
        {
            method: init.method ?? "GET",
            headers: {
                ...(init.body === undefined ? {
                } : {
                    "content-type": "application/json"
                }),
                ...(init.token ? {
                    authorization: `Bearer ${init.token}`
                } : {
                }),
            },
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
        })
    const data = await res.json().catch(() => ({
    })) as T & { error?: string }
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return data
}

export function loadSession(): Session | null {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as Session | null
        return s?.token && s.user?.id ? s : null
    } catch { return null }
}

function keep(s: Session): Session {
    try { localStorage.setItem(SESSION_KEY,
        JSON.stringify(s)) } catch { /* chế độ riêng tư: phiên chỉ sống tới khi đóng tab */ }
    return s
}

export function signOut() {
    try { localStorage.removeItem(SESSION_KEY) } catch { /* bỏ qua */ }
}

/** Phiên đã lưu còn hiệu lực không (server còn nhận token), kèm tên mới nhất */
export async function restoreSession(): Promise<Session | null> {
    const s = loadSession()
    if (!s) return null
    try {
        return keep({
            token: s.token, user: await call<User>("/me",
                {
                    token: s.token
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
