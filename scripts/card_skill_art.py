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
    "nami": ("Nami", {"q": "W", "e": "E", "r": "R"}),
    "soraka": ("Soraka", {"q": "Q", "e": "W", "r": "R"}),
    "teemo": ("Teemo", {"q": "R", "e": "Q", "r": "E"}),
    "kogmaw": ("KogMaw", {"q": "Q", "e": "W", "r": "R"}),
}

ap = argparse.ArgumentParser()
ap.add_argument("--size", type=int, default=512)
args = ap.parse_args()

def get(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()

def x4(src: pathlib.Path, dst: pathlib.Path):
    subprocess.run([str(EXE), "-i", str(src), "-o", str(dst), "-n", "realesrgan-x4plus"], check=True, capture_output=True)

version = json.loads(get(f"{BASE}/api/versions.json"))[0]
OUT.mkdir(parents=True, exist_ok=True)
for gid, (key, slots) in HEROES.items():
    data = json.loads(get(f"{BASE}/cdn/{version}/data/en_US/champion/{key}.json"))["data"][key]
    spells = dict(zip("QWER", data["spells"]))
    urls = {s: f"{BASE}/cdn/{version}/img/spell/{spells[src]['image']['full']}" for s, src in slots.items()}
    urls["p"] = f"{BASE}/cdn/{version}/img/passive/{data['passive']['image']['full']}"
    for slot, url in urls.items():
        with tempfile.TemporaryDirectory() as tmp:
            t = pathlib.Path(tmp)
            (t / "a.png").write_bytes(get(url))
            x4(t / "a.png", t / "b.png")   # 64 -> 256
            x4(t / "b.png", t / "c.png")   # 256 -> 1024
            img = Image.open(t / "c.png").convert("RGB").resize((args.size, args.size), Image.LANCZOS)
            dst = OUT / f"{gid}_{slot}.png"
            img.save(dst)
            print(f"{gid}_{slot}: {url.rsplit('/', 1)[1]} -> {dst.relative_to(ROOT)} {args.size}px")
print("xong, phiên bản Data Dragon", version)
