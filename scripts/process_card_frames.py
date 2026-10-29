# Khung lá bài 9-slice do Codex vẽ (.work/codex_frame9) -> public/ui/nine/card_<loại>.png + card_art.png, ghi số cắt vào nineMeta.ts.
# Số cắt tự dò: viền + hoa văn góc lấn vào trong bao nhiêu thì cắt bấy nhiêu.
# Chạy: python scripts/process_card_frames.py  (từ thư mục starci-league)
import json, pathlib, re, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from process_ui2 import GEN, META, PUB, crop, key_out  # noqa: E402
import process_ui2

sys.stdout.reconfigure(encoding="utf-8")
WORK = process_ui2.ROOT / ".work/codex_frame9"
WIDTH = 256


def edge_depth(inside: np.ndarray) -> list[int]:
    """[trên, phải, dưới, trái]: khoảng cách xa nhất từ mép tới vùng ruột phẳng"""
    h, w = inside.shape
    def first(arr):  # vị trí ô ruột đầu tiên trên mỗi hàng (bỏ hàng không có ruột)
        idx = np.argmax(arr, axis=1)
        return idx[arr.any(axis=1)]
    left, right = first(inside), first(inside[:, ::-1])
    top, bottom = first(inside.T), first(inside.T[:, ::-1])
    # bỏ 8% hàng sát mép (góc bo) rồi lấy phân vị cao: bao trọn hoa văn góc
    q = lambda a: int(np.percentile(a, 97)) + 2
    return [q(top), q(right), q(bottom), q(left)]


def main():
    meta = json.loads(re.search(r"= (\{.*\}) as const", META.read_text(encoding="utf-8"), re.S).group(1))
    for batch in ("a", "b"):
        names = (WORK / batch / "order.txt").read_text().split()
        files = find(batch)
        print(batch, f"{len(files)}/{len(names)}")
        for f, name in zip(files, names):
            im = crop(key_out(Image.open(f)))
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
            a = np.asarray(im).astype(np.int32)
            if name == "art":
                inside = a[..., 3] < 40  # ruột trong suốt
            else:
                c = a[a.shape[0] // 2, a.shape[1] // 2, :3]
                inside = (np.abs(a[..., :3] - c).sum(-1) < 30) & (a[..., 3] > 200)
            sl = edge_depth(inside)
            out = f"card_{name}"
            im.save(PUB / "nine" / f"{out}.png", optimize=True)
            meta[out] = {"w": im.width, "h": im.height, "slice": sl}
            print(" ", out, im.size, sl)
    META.write_text("// Sinh tự động từ ảnh 9-slice Codex vẽ (public/ui/nine). slice = [trên, phải, dưới, trái] px trong ảnh gốc.\n"
                    f"export const NINE_META = {json.dumps(meta, indent=2)} as const;\n", encoding="utf-8")


def find(batch):
    want = f"/codex_frame9/{batch}"
    for f in sorted((pathlib.Path.home() / ".codex/sessions").rglob("rollout-*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            m = json.loads(f.open(encoding="utf-8", errors="ignore").readline()).get("payload", {})
        except json.JSONDecodeError:
            continue
        if str(m.get("cwd", "")).replace("\\", "/").lower().endswith(want):
            for sid in (m.get("id"), m.get("session_id")):
                d = GEN / str(sid)
                if sid and d.is_dir():
                    return sorted(d.glob("*.png"), key=lambda p: p.stat().st_mtime)
    return []


if __name__ == "__main__":
    main()
