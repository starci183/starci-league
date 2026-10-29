# Art lá Bổ trợ / Đồ / Vàng cho bản thẻ bài: dùng icon gốc LMHT (Data Dragon + icon mảnh Đồ có sẵn),
# phóng ×16 bằng Real-ESRGAN trên GPU (2 lượt ×4) rồi thu về 512px.
# Ra: packages/client/public/card_support/spell_<phép>.png, card_items/<mảnh hoặc đồ ghép>.png
# Dùng: python scripts/card_support_art.py [--size 512]
import argparse, json, pathlib, subprocess, sys, tempfile, urllib.request
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXE = ROOT / ".work/tools/realesrgan/realesrgan-ncnn-vulkan.exe"
PUB = ROOT / "packages/client/public"
BASE = "https://ddragon.leagueoflegends.com"

# phép bổ trợ trong game -> id phép LMHT trên Data Dragon
SPELLS = {
    "heal": "SummonerHeal",
    "flash": "SummonerFlash",
    "ignite": "SummonerDot",
    "exhaust": "SummonerExhaust",
    "barrier": "SummonerBarrier",
    "cleanse": "SummonerBoost",
    "smite": "SummonerSmite",
    "teleport": "SummonerTeleport",
}
# 8 mảnh Đồ: icon LMHT đã có sẵn ở public/items
COMPONENTS = ["kiem_dai", "gay_qua_kho", "cung_go", "gang_tay", "giap_luoi", "ao_choang", "dai_khong_lo", "nuoc_mat"]

ap = argparse.ArgumentParser()
ap.add_argument("--size", type=int, default=512)
ap.add_argument("--only", choices=["spells", "items", "legendary"], help="chỉ làm một phần")
args = ap.parse_args()


def get(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


def x4(src: pathlib.Path, dst: pathlib.Path):
    # Vulkan thỉnh thoảng sập ngẫu nhiên: thử lại vài lần
    for attempt in range(3):
        if subprocess.run([str(EXE), "-i", str(src), "-o", str(dst), "-n", "realesrgan-x4plus"], capture_output=True).returncode == 0:
            return
    raise RuntimeError(f"Real-ESRGAN lỗi với {src}")


def upscale(png: bytes, dst: pathlib.Path):
    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        # icon gốc có thể lớn hơn 64px: đưa về 64px để 2 lượt ×4 không vượt bộ nhớ GPU
        Image.open(__import__("io").BytesIO(png)).convert("RGB").resize((64, 64), Image.LANCZOS).save(t / "a.png")
        x4(t / "a.png", t / "b.png")
        Image.open(t / "b.png").convert("RGB").resize((args.size, args.size), Image.LANCZOS).save(dst)
    print(f"{dst.relative_to(ROOT)} {args.size}px")


version = json.loads(get(f"{BASE}/api/versions.json"))[0]
(PUB / "card_support").mkdir(parents=True, exist_ok=True)
(PUB / "card_items").mkdir(parents=True, exist_ok=True)
summ = json.loads(get(f"{BASE}/cdn/{version}/data/en_US/summoner.json"))["data"]
for gid, key in (SPELLS.items() if args.only != "items" else []):
    upscale(get(f"{BASE}/cdn/{version}/img/spell/{summ[key]['image']['full']}"), PUB / "card_support" / f"spell_{gid}.png")
for c in (COMPONENTS if args.only in (None, "items") else []):
    upscale((PUB / "items" / f"{c}.png").read_bytes(), PUB / "card_items" / f"{c}.png")
# đồ ghép (huyền thoại) và mọi icon đồ LMHT khác có trong public/items -> card_items/<id>.png
if args.only in (None, "legendary"):
    for f in sorted((PUB / "items").glob("*.png")):
        if f.stem not in COMPONENTS and not (PUB / "card_items" / f"{f.stem}.png").exists():
            upscale(f.read_bytes(), PUB / "card_items" / f"{f.stem}.png")
print("xong, phiên bản Data Dragon", version)
