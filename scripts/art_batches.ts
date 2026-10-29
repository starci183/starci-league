// Chuẩn bị các lệnh Codex vẽ art lớn cho đồ: chép icon gốc làm mẫu + viết prompt cho từng lô.
// Chạy: npx tsx scripts/art_batches.ts <thư mục làm việc> <số lô>
import {
    copyFileSync, existsSync, mkdirSync, writeFileSync
} from "node:fs"
import {
    join
} from "node:path"
import {
    allItems
} from "@starci/shared"

const [outDir = ".work/codex_itemart",
    n = "4"] = process.argv.slice(2)
// chỉ vẽ món chưa có art lớn
const items = allItems().filter((it) => !existsSync(`packages/client/public/items_art/${it.id}.jpg`))
const size = Math.ceil(items.length / Number(n))
for (let b = 0; b < Number(n); b++) {
    const batch = items.slice(b * size,
        (b + 1) * size)
    const dir = join(outDir,
        `batch${b + 1}`)
    mkdirSync(dir,
        {
            recursive: true
        })
    for (const it of batch) copyFileSync(`packages/client/public/items/${it.id}.png`,
        join(dir,
            `ref_${it.id}.png`))
    const list = batch.map((it, i) => `${i + 1}. ${it.id}.png (reference: ref_${it.id}.png) — "${it.name}"`).join("\n")
    writeFileSync(join(dir,
        "prompt.txt"),
    `The attached images are small 64x64 reference icons of fantasy game items. For EACH item below, use your image generation tool to repaint that same item as a separate high-resolution trading-card illustration, keeping its exact object design, colors and silhouette from its reference icon. One generation per item, in this exact order. Save each into the current directory with exactly the given file name if you can (if saving fails, just keep generating the rest). Do not create or modify any other files.

Style for all: premium trading-card item illustration, painterly splash-art quality like League of Legends / Legends of Runeterra, the item as the hero subject filling most of the frame, dramatic rim lighting, magical glow and particles matching the item colors, softly blurred themed background. Portrait 2:3 (1024x1536), full-bleed, no border, no frame, no text, no letters, no UI.

${list}
`,
    "utf8")
    writeFileSync(join(dir,
        "refs.txt"),
    batch.map((it) => `ref_${it.id}.png`).join("\n"),
    "utf8")
    console.log(`batch${b + 1}: ${batch.map((it) => it.id).join(", ")}`)
}
