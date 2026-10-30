# Phân tích một đợt run_batch: tỉ lệ thắng theo tướng (khoảng tin cậy Wilson 95%), mức gánh team, lợi thế đi trước.
# Chạy: python -I scripts/balance/analyze_batch.py <thư mục đợt> [--json out.json]
import glob
import json
import math
import os
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
run = sys.argv[1]
out_json = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None

rows = []
for f in sorted(glob.glob(os.path.join(run, "part-*.ndjson"))):
    with open(f, encoding="utf8") as fh:
        rows += [json.loads(l) for l in fh if l.strip()]

valid = [r for r in rows if r["reason"] in ("lives", "deck") and r["winner"]]
errors = [r for r in rows if r["reason"] == "error"]
timeouts = [r for r in rows if r["reason"] == "timeout"]


def wilson(w, n, z=1.96):
    if n == 0:
        return (0, 0)
    p = w / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - m) / d, (c + m) / d)


def impact(s):
    # sát thương lên địch (máu + khiên) + hồi máu/khiên cho phe mình
    return s["enemyHp"] + 0.8 * (s["heal"] + s["shield"])


H = defaultdict(lambda: defaultdict(float))
for r in valid:
    for side in ("A", "B"):
        team = r[side]
        won = r["winner"] == side
        imps = {h: impact(r["stats"].get(f"{side}:{h}", {"enemyHp": 0, "heal": 0, "shield": 0})) for h in team}
        total = sum(imps.values()) or 1
        mvp = max(imps, key=imps.get)
        for h in team:
            s = r["stats"].get(f"{side}:{h}")
            if not s:
                continue
            d = H[h]
            d["n"] += 1
            d["w"] += won
            d["share"] += imps[h] / total
            d["mvp"] += mvp == h
            d["mvpWin"] += mvp == h and won
            d["enemyHp"] += s["enemyHp"]
            d["heal"] += s["heal"]
            d["shield"] += s["shield"]
            d["kills"] += s["kills"]
            d["deaths"] += s["deaths"]
            d["casts"] += s["casts"]
            d["attacks"] += s["attacks"]
            d["friendlyHp"] += s["friendlyHp"]
            for k, v in s["peakStacks"].items():
                d["peak:" + k] = max(d["peak:" + k], v)

firstA = sum(r["winner"] == "A" for r in valid) / max(1, len(valid))
# Cặp đổi bên: cùng một đội thắng cả hai trận?
bypair = defaultdict(list)
for r in valid:
    bypair[r["pair"]].append(r)
sweep = sum(1 for p in bypair.values() if len(p) == 2 and (p[0]["winner"] == "A") != (p[1]["winner"] == "A"))
full_pairs = sum(1 for p in bypair.values() if len(p) == 2)

print(f"Trận: {len(rows)} | hợp lệ {len(valid)} | lỗi {len(errors)} | quá giới hạn {len(timeouts)}")
reasons = defaultdict(int)
for r in valid:
    reasons[r["reason"]] += 1
print(f"Kết thúc: {dict(reasons)} | vòng TB {sum(r['round'] for r in valid) / max(1, len(valid)):.1f}")
print(f"Bên đi trước (A) thắng {firstA * 100:.1f}% | cặp đổi bên cùng đội thắng cả 2: {sweep}/{full_pairs}")
print()
print(f"{'tướng':<12} {'n':>5} {'thắng%':>7} {'CI95':>13} {'gánh%':>6} {'MVP%':>5} {'dmgĐịch':>8} {'hồi+khiên':>9} {'hạ':>5} {'chết':>5}")
table = []
for h, d in sorted(H.items(), key=lambda kv: -kv[1]["w"] / kv[1]["n"]):
    n = d["n"]
    lo, hi = wilson(d["w"], n)
    row = {
        "hero": h, "n": int(n), "winrate": d["w"] / n, "ci": [lo, hi], "share": d["share"] / n, "mvp": d["mvp"] / n,
        "enemyHp": d["enemyHp"] / n, "support": (d["heal"] + d["shield"]) / n, "kills": d["kills"] / n, "deaths": d["deaths"] / n,
        "casts": d["casts"] / n, "attacks": d["attacks"] / n, "friendlyHp": d["friendlyHp"] / n,
        "peaks": {k[5:]: v for k, v in d.items() if k.startswith("peak:")},
    }
    table.append(row)
    flag = " <<" if lo > 0.5 else (" >>" if hi < 0.5 else "")
    print(f"{h:<12} {int(n):>5} {row['winrate'] * 100:>6.1f}% [{lo * 100:4.1f}-{hi * 100:4.1f}] {row['share'] * 100:>5.1f} {row['mvp'] * 100:>5.1f} {row['enemyHp']:>8.0f} {row['support']:>9.0f} {row['kills']:>5.2f} {row['deaths']:>5.2f}{flag}")
print("\n<< = mạnh có ý nghĩa thống kê, >> = yếu có ý nghĩa thống kê")
for r in errors[:3]:
    print("LỖI", r["i"], r["A"], r["B"], (r.get("error") or "")[:300])

if out_json:
    with open(out_json, "w", encoding="utf8") as fh:
        json.dump({"matches": len(rows), "valid": len(valid), "errors": len(errors), "timeouts": len(timeouts),
                   "firstWin": firstA, "pairSweep": [sweep, full_pairs], "heroes": table}, fh, ensure_ascii=False, indent=1)
