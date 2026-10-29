// Tạo tài khoản thử "StarCi" trên Supabase LOCAL và nạp 4 bộ bài mẫu (Xạ Thủ, Sát Thủ, Pháp Sư, Đỡ Đòn & Trợ Thủ).
// Chỉ dùng khi dev. Chạy: npx tsx --env-file=packages/server/.env scripts/seed_starci.ts
import {
    createClient
} from "@supabase/supabase-js"
import {
    PRESET_DECKS, deckError
} from "@starci/shared"

const EMAIL = "starci@starci.local", PASSWORD = "StarCi#Local2026", NAME = "StarCi"
const admin = createClient(process.env.SUPABASE_URL!,
process.env.SUPABASE_SECRET_KEY!,
{
    auth: {
        persistSession: false
    }
})

const { data: list } = await admin.auth.admin.listUsers()
let user = list?.users.find((u) => u.email === EMAIL)
if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
        email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: {
            display_name: NAME
        }
    })
    if (error) throw error
    user = data.user
}
const uid = user!.id
await admin.from("profiles").update({
    display_name: NAME
}).eq("id",
    uid)
await admin.from("decks").delete().eq("owner_id",
    uid)
const rows = PRESET_DECKS.map((p, i) => {
    const err = deckError(p.cards)
    if (err) throw new Error(`${p.name}: ${err}`)
    return {
        owner_id: uid, name: p.name, cards: [...p.cards].sort(), is_active: i === 0
    }
})
const { error } = await admin.from("decks").insert(rows)
if (error) throw error
console.log(`Tài khoản ${NAME} (${EMAIL}): đã lưu ${rows.length} bộ bài, đang dùng "${rows[0].name}"`)
