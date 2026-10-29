# Art lá chiêu cho bản thẻ bài: tải icon chiêu (64px) của 10 tướng từ Riot Data Dragon,
# rồi phóng ×16 bằng Real-ESRGAN trên card đồ hoạ (2 lượt ×4) và thu về 512px.
# Ra: packages/client/public/card_skills/<tướng>_<q|e|r|p>.png
# Dùng: python scripts/card_skill_art.py [--size 512]
import argparse, json, pathlib, subprocess, sys, tempfile, urllib.request
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXE = ROOT / ".work/tools/realesrgan/realesrgan-ncnn-vulkan.exe"
OUT = ROOT / "packages/client/public/card_skills"
BASE = "https://ddragon.leagueoflegends.com"

# chiêu Q/E/R của bản thẻ bài lấy icon từ ô chiêu nào của tướng gốc (theo ý nghĩa chiêu)
HEROES = {
    "darius": ("Darius", {"q": "Q", "e": "E", "r": "R"}),
    "braum": ("Braum", {"q": "W", "e": "E", "r": "R"}),
    "blitzcrank": ("Blitzcrank", {"q": "Q", "e": "E", "r": "R"}),
    "zed": ("Zed", {"q": "Q", "e": "W", "r": "R"}),
    "viktor": ("Viktor", {"q": "Q", "e": "E", "r": "R"}),
    "twistedfate": ("TwistedFate", {"q": "W", "e": "E", "r": "R"}),
    "nami": ("Nami", {"q": "Q", "e": "E", "r": "R"}),
    "soraka": ("Soraka", {"q": "Q", "e": "W", "r": "R"}),
    "teemo": ("Teemo", {"q": "R", "e": "R", "r": "E"}),
    "kogmaw": ("KogMaw", {"q": "Q", "e": "W", "r": "R"}),
    "brand": ("Brand", {"q": "Q", "e": "E", "r": "R"}),
    "renata": ("Renata", {"q": "Q", "e": "W", "r": "R"}),
    "aatrox": ("Aatrox", {"q": "Q", "e": "W", "r": "R"}),
    "garen": ("Garen", {"q": "Q", "e": "E", "r": "R"}),
    "yorick": ("Yorick", {"q": "Q", "e": "E", "r": "R"}),
    "gangplank": ("Gangplank", {"q": "Q", "e": "E", "r": "R"}),
    "leona": ("Leona", {"q": "Q", "e": "E", "r": "R"}),
    "malphite": ("Malphite", {"q": "Q", "e": "W", "r": "R"}),
    "ornn": ("Ornn", {"q": "W", "e": "P", "r": "R"}),
    "katarina": ("Katarina", {"q": "Q", "e": "E", "r": "R"}),
    "khazix": ("Khazix", {"q": "Q", "e": "E", "r": "R"}),
    "qiyana": ("Qiyana", {"q": "Q", "e": "W", "r": "R"}),
    "ahri": ("Ahri", {"q": "Q", "e": "E", "r": "R"}),
    "annie": ("Annie", {"q": "Q", "e": "E", "r": "R"}),
    "lissandra": ("Lissandra", {"q": "Q", "e": "W", "r": "R"}),
    "lux": ("Lux", {"q": "Q", "e": "E", "r": "R"}),
    "ashe": ("Ashe", {"q": "W", "e": "E", "r": "R"}),
    "jinx": ("Jinx", {"q": "Q", "e": "W", "r": "R"}),
    "vayne": ("Vayne", {"q": "Q", "e": "E", "r": "R"}),
    "janna": ("Janna", {"q": "Q", "e": "E", "r": "R"}),
}

# vật triệu hồi ở ô phụ: tranh = icon của chiêu triệu hồi ra nó (tướng LMHT, ô chiêu)
TOKENS = {
    "tibbers": ("Annie", "R"),
    "keg": ("Gangplank", "E"),
    "mist_walker": ("Yorick", "R"),
}
TOKEN_OUT = ROOT / "packages/client/public/card_tokens"

ap = argparse.ArgumentParser()
ap.add_argument("--size", type=int, default=512)
ap.add_argument("--only", choices=["skills", "tokens"], help="chỉ làm một phần")
ap.add_argument("--force", action="store_true", help="vẽ lại cả file đã có")
ap.add_argument("--heroes", help="chỉ làm các tướng này (phẩy ngăn cách)")
args = ap.parse_args()

def get(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()

def x4(src: pathlib.Path, dst: pathlib.Path):
    # Vulkan thỉnh thoảng sập ngẫu nhiên: thử lại vài lần
    for _ in range(3):
        if subprocess.run([str(EXE), "-i", str(src), "-o", str(dst), "-n", "realesrgan-x4plus"], capture_output=True).returncode == 0:
            return
    raise RuntimeError(f"Real-ESRGAN lỗi với {src}")

version = json.loads(get(f"{BASE}/api/versions.json"))[0]
OUT.mkdir(parents=True, exist_ok=True)
pick = set(args.heroes.split(",")) if args.heroes else None
for gid, (key, slots) in (HEROES.items() if args.only != "tokens" else []):
    if pick and gid not in pick:
        continue
    data = json.loads(get(f"{BASE}/cdn/{version}/data/en_US/champion/{key}.json"))["data"][key]
    spells = dict(zip("QWER", data["spells"]))
    # "P" = dùng icon nội tại cho ô lá đó
    urls = {s: (f"{BASE}/cdn/{version}/img/passive/{data['passive']['image']['full']}" if src == "P" else f"{BASE}/cdn/{version}/img/spell/{spells[src]['image']['full']}") for s, src in slots.items()}
    urls["p"] = f"{BASE}/cdn/{version}/img/passive/{data['passive']['image']['full']}"
    for slot, url in urls.items():
        if not args.force and (OUT / f"{gid}_{slot}.png").exists():
            continue
        with tempfile.TemporaryDirectory() as tmp:
            t = pathlib.Path(tmp)
            (t / "a.png").write_bytes(get(url))
            x4(t / "a.png", t / "b.png")   # 64 -> 256, rồi nội suy lên cỡ đích (1 lượt: nhanh, ít bịa nét)
            img = Image.open(t / "b.png").convert("RGB").resize((args.size, args.size), Image.LANCZOS)
            dst = OUT / f"{gid}_{slot}.png"
            img.save(dst)
            print(f"{gid}_{slot}: {url.rsplit('/', 1)[1]} -> {dst.relative_to(ROOT)} {args.size}px")
TOKEN_OUT.mkdir(parents=True, exist_ok=True)
for tid, (key, slot) in (TOKENS.items() if args.only != "skills" else []):
    data = json.loads(get(f"{BASE}/cdn/{version}/data/en_US/champion/{key}.json"))["data"][key]
    url = f"{BASE}/cdn/{version}/img/spell/{dict(zip('QWER', data['spells']))[slot]['image']['full']}"
    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        (t / "a.png").write_bytes(get(url))
        x4(t / "a.png", t / "b.png")
        Image.open(t / "b.png").convert("RGB").resize((args.size, args.size), Image.LANCZOS).save(TOKEN_OUT / f"{tid}.png")
    print(f"token {tid}: {url.rsplit('/', 1)[1]}")
print("xong, phiên bản Data Dragon", version)
