# Xử lý ảnh Codex vẽ thành tài nguyên game.
#   --frame  <frame.png>   khung bài: magenta -> trong suốt, đo ô tranh, xuất bản gốc 1280×1960 + bản game 640,
#                          4 màu khung theo loại bài, và client/src/frameMeta.ts
#   --map    <thư mục>     thành phần bản đồ: sprite (nền magenta) -> PNG trong suốt 256 px, tile lặp -> 512 px
#   --cards  <thư mục>     tranh phép/bẫy <id>.png -> JPG 768×1152
import argparse, colorsys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "packages/client/public"
SPRITES = ["tree_a", "tree_b", "bush", "rock", "tower_blue", "tower_red", "dragon_pit"]
TILES = ["grass_tile", "dirt_tile", "stone_tile", "water_tile"]


def key_magenta(img: Image.Image) -> Image.Image:
    """Magenta #FF00FF -> trong suốt, viền mềm và khử ám hồng"""
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            d = ((255 - r) + g + (255 - b)) / 3          # 0 = đúng magenta
            m = max(0.0, min(1.0, 1 - (d - 40) / 60))
            if m > 0:
                px[x, y] = (min(r, g + 60), g, min(b, g + 60), int(a * (1 - m)))
    return img


def process_frame(src: pathlib.Path):
    img = key_magenta(Image.open(src))
    img = img.crop(img.getbbox())
    w, h = img.size
    a = img.getchannel("A").load()
    # ô tranh: dò theo cột giữa từ trên xuống, đoạn trong suốt đầu tiên sau mép trên
    cx, y = w // 2, 0
    while y < h and a[cx, y] < 128: y += 1
    while y < h and a[cx, y] >= 128: y += 1
    top = y
    while y < h and a[cx, y] < 128: y += 1
    bottom = y
    cy = (top + bottom) // 2
    x = cx
    while x > 0 and a[x, cy] < 128: x -= 1
    left = x + 1
    x = cx
    while x < w - 1 and a[x, cy] < 128: x += 1
    right = x
    if bottom - top < h * 0.2 or right - left < w * 0.4:
        raise SystemExit(f"Không tìm thấy ô tranh hợp lý: {left},{top},{right},{bottom} trong {w}x{h}")
    meta = {"x": left / w, "y": top / h, "w": (right - left) / w, "h": (bottom - top) / h}
    ui = PUBLIC / "ui"
    (ui / "src").mkdir(parents=True, exist_ok=True)
    master = img.resize((1280, 1960), Image.LANCZOS)          # bản gốc theo yêu cầu: 1280×1960
    master.save(ui / "src/frame-hero-1280x1960.png")
    game = master.resize((640, 980), Image.LANCZOS)          # bản game: đủ nét ở 4K, nhẹ
    game.save(ui / "frame-hero.png")
    recolor(game, 0.0, 0.75, 0.85).save(ui / "frame-item.png")   # đồng
    recolor(game, 0.52).save(ui / "frame-spell.png")             # xanh
    recolor(game, 0.75).save(ui / "frame-trap.png")              # tím
    (ROOT / "packages/client/src/frameMeta.ts").write_text(
        "// Sinh bởi scripts/process_art.py: vị trí ô tranh trong khung (tỉ lệ 0..1). null = chưa có khung vẽ sẵn.\n"
        f"export const FRAME = {{ x: {meta['x']:.4f}, y: {meta['y']:.4f}, w: {meta['w']:.4f}, h: {meta['h']:.4f}, aspect: {1280 / 1960:.4f} }}"
        " as null | { x: number; y: number; w: number; h: number; aspect: number };\n", encoding="utf-8")
    print("frame", meta)


def recolor(img: Image.Image, hue_shift: float, sat: float = 1.0, val: float = 1.0):
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss > 0.15: hh = (hh + hue_shift) % 1   # chỉ đổi phần kim loại có màu
            r2, g2, b2 = colorsys.hsv_to_rgb(hh, min(1, ss * sat), min(1, vv * val))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out


def process_map(folder: pathlib.Path):
    out = PUBLIC / "map"
    out.mkdir(parents=True, exist_ok=True)
    for name in SPRITES:
        f = folder / f"{name}.png"
        if not f.exists(): print("thiếu", f.name); continue
        img = key_magenta(Image.open(f))
        img = img.crop(img.getbbox())
        img.thumbnail((256, 256), Image.LANCZOS)
        img.save(out / f"{name}.png")
        print("sprite", name, img.size)
    for name in TILES:
        f = folder / f"{name}.png"
        if not f.exists(): print("thiếu", f.name); continue
        Image.open(f).convert("RGB").resize((512, 512), Image.LANCZOS).save(out / f"{name}.jpg", quality=90)
        print("tile", name)


def process_cards(folder: pathlib.Path):
    out = PUBLIC / "cards"
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted(folder.glob("*.png")):
        img = Image.open(f).convert("RGB")
        img.thumbnail((768, 1152), Image.LANCZOS)
        img.save(out / f"{f.stem}.jpg", quality=90)
        print("card", f.stem, img.size)


def process_ui(folder: pathlib.Path):
    """Bộ UI Hextech: tách magenta, cắt sát, giới hạn 1024 px"""
    out = PUBLIC / "ui"
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted(folder.glob("*.png")):
        img = key_magenta(Image.open(f))
        img = img.crop(img.getbbox())
        img.thumbnail((1024, 1024), Image.LANCZOS)
        img.save(out / f"{f.stem}.png")
        print("ui", f.stem, img.size)


def process_item_art(folder: pathlib.Path):
    """Tranh lớn của đồ (Codex vẽ lại từ icon) -> items_art/<id>.jpg"""
    out = PUBLIC / "items_art"
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted(folder.glob("*.png")):
        if f.stem.startswith("ref_"): continue
        img = Image.open(f).convert("RGB")
        img.thumbnail((768, 1152), Image.LANCZOS)
        img.save(out / f"{f.stem}.jpg", quality=90)
        print("item art", f.stem, img.size)


ap = argparse.ArgumentParser()
ap.add_argument("--ui", type=pathlib.Path)
ap.add_argument("--items", type=pathlib.Path)
ap.add_argument("--frame", type=pathlib.Path)
ap.add_argument("--map", type=pathlib.Path)
ap.add_argument("--cards", type=pathlib.Path)
args = ap.parse_args()
if args.frame: process_frame(args.frame)
if args.map: process_map(args.map)
if args.cards: process_cards(args.cards)
if args.ui: process_ui(args.ui)
if args.items: process_item_art(args.items)
