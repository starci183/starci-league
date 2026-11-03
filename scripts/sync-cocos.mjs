// Đồng bộ mã dùng chung sang client Cocos (chạy lại mỗi khi packages/shared hoặc bản đồ VFX của web đổi):
// 1. packages/shared/src -> cocos/assets/scripts/shared (luật, tướng, bộ chiêu, đồ, bài: một nguồn sự thật với server)
// 2. colyseus.js bản dành cho Cocos Creator -> cocos/assets/scripts/vendor (nạp dạng plugin, biến toàn cục Colyseus)
// 3. bảng VFX theo chiêu của web (heroMap.ts) -> cocos/assets/scripts/vfx/heroMap.gen.ts
import {
    cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync
} from "node:fs"
import {
    dirname, join, relative
} from "node:path"
import {
    randomUUID
} from "node:crypto"
import {
    fileURLToPath
} from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)),
    "..")
const SCRIPTS = join(ROOT,
    "cocos/assets/scripts")

/** Mọi file dưới `dir` (đường dẫn tương đối) */
function walk(dir) {
    if (!existsSync(dir)) return []
    return readdirSync(dir,
        {
            withFileTypes: true, recursive: true
        })
        .filter((e) => e.isFile())
        .map((e) => relative(dir,
            join(e.parentPath ?? e.path,
                e.name)))
}

// 1. shared: chép đè, giữ các file .meta Creator đã sinh để uuid không đổi giữa các lần đồng bộ
const sharedOut = join(SCRIPTS,
    "shared")
const metas = new Map(walk(sharedOut).filter((f) => f.endsWith(".meta")).map((f) => [f,
    readFileSync(join(sharedOut,
        f))]))
rmSync(sharedOut,
    {
        recursive: true, force: true
    })
cpSync(join(ROOT,
    "packages/shared/src"),
sharedOut,
{
    recursive: true
})
// Cocos không nạp được `import x from "./x.json"` trong script: đổi mỗi file JSON thành module TS `x.data.ts`
const jsonFiles = walk(sharedOut).filter((f) => f.endsWith(".json"))
for (const rel of jsonFiles) {
    const src = join(sharedOut,
        rel)
    writeFileSync(src.replace(/\.json$/,
        ".data.ts"),
    `// TỰ SINH từ ${rel.replace(/\\/g,
        "/")}\nconst data = ${readFileSync(src,
        "utf8").trim()}\nexport default data\n`)
    rmSync(src)
}
for (const rel of walk(sharedOut).filter((f) => f.endsWith(".ts"))) {
    const file = join(sharedOut,
        rel)
    const code = readFileSync(file,
        "utf8")
    const next = code.replace(/(from\s+["'][^"']+)\.json(["'])/g,
        "$1.data$2")
    if (next !== code) writeFileSync(file,
        next)
}
for (const [rel, data] of metas) if (existsSync(join(sharedOut,
    rel.slice(0,
        -".meta".length)))) writeFileSync(join(sharedOut,
    rel),
data)

// 2. colyseus cho Cocos: plugin script (Creator nạp trước mọi script, gắn Colyseus vào globalThis)
const vendor = join(SCRIPTS,
    "vendor")
mkdirSync(vendor,
    {
        recursive: true
    })
cpSync(join(ROOT,
    "node_modules/colyseus.js/dist/colyseus-cocos-creator.js"),
join(vendor,
    "colyseus.js"))
if (!existsSync(join(vendor,
    "colyseus.js.meta"))) writeFileSync(join(vendor,
    "colyseus.js.meta"),
`${JSON.stringify({
    ver: "4.0.24",
    importer: "javascript",
    imported: true,
    uuid: randomUUID(),
    files: [".js"],
    subMetas: {
    },
    userData: {
        isPlugin: true, loadPluginInEditor: false, loadPluginInWeb: true, loadPluginInNativeScene: true, loadPluginInMiniGame: true
    },
},
null,
2)}\n`)

// 3. bảng VFX theo chiêu: kiểu SkillVfx lấy từ vfx/types.ts của Cocos, cg lấy từ bản shared đã chép
const heroMap = readFileSync(join(ROOT,
    "packages/client/src/card/vfx/heroMap.ts"),
"utf8").replace(/from "@starci\/shared"/g,
    "from \"../shared\"")
writeFileSync(join(SCRIPTS,
    "vfx/heroMap.gen.ts"),
`// TỰ SINH bởi scripts/sync-cocos.mjs từ packages/client/src/card/vfx/heroMap.ts. Đừng sửa tay.\n${heroMap}`)

console.log("Đã đồng bộ shared, colyseus và heroMap sang cocos/")
