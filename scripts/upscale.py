# Phóng ảnh Codex vẽ lên 2K bằng Real-ESRGAN (ncnn-vulkan, chạy trên card đồ họa).
# Phóng ×4 bằng AI rồi thu về cạnh dài `--long` (mặc định 2560) cho sắc nét.
# Dùng: python scripts/upscale.py <ảnh vào> <ảnh ra> [--long 2560] [--model realesrgan-x4plus]
import argparse, pathlib, subprocess, sys, tempfile
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

EXE = pathlib.Path(__file__).resolve().parents[1] / ".work/tools/realesrgan/realesrgan-ncnn-vulkan.exe"

ap = argparse.ArgumentParser()
ap.add_argument("src", type=pathlib.Path)
ap.add_argument("dst", type=pathlib.Path)
ap.add_argument("--long", type=int, default=2560, help="cạnh dài của ảnh ra")
ap.add_argument("--model", default="realesrgan-x4plus")
args = ap.parse_args()

with tempfile.TemporaryDirectory() as tmp:
    big = pathlib.Path(tmp) / "x4.png"
    subprocess.run([str(EXE), "-i", str(args.src), "-o", str(big), "-n", args.model], check=True, capture_output=True)
    img = Image.open(big)
    scale = args.long / max(img.size)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    args.dst.parent.mkdir(parents=True, exist_ok=True)
    if args.dst.suffix.lower() in (".jpg", ".jpeg"): img.convert("RGB").save(args.dst, quality=92)
    else: img.save(args.dst)
print(f"{args.src.name} -> {args.dst} {img.size[0]}x{img.size[1]}")
