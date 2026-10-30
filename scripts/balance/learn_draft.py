# Học mô hình cấm/chọn từ các đợt run_batch: hồi quy logistic sức mạnh tướng (+ lợi thế đi trước),
# rồi phần dư theo cặp cùng đội (syn) và cặp đối đầu (ctr), co về 0 theo số mẫu. Ghi ra draftModel.ts.
# Chạy: python -I scripts/balance/learn_draft.py <out.ts> <thư mục đợt> [thư mục đợt ...]
import glob
import json
import math
import os
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
out_ts, runs = sys.argv[1], sys.argv[2:]
rows = []
for run in runs:
    for f in glob.glob(os.path.join(run, "part-*.ndjson")):
        with open(f, encoding="utf8") as fh:
            rows += [json.loads(l) for l in fh if l.strip()]
games = [r for r in rows if r["winner"] in ("A", "B")]
heroes = sorted({h for r in games for h in r["A"] + r["B"]})
idx = {h: i for i, h in enumerate(heroes)}

sig = lambda x: 1 / (1 + math.exp(-x))
# hồi quy logistic: y = [A thắng], x = chỉ báo tướng (+1 phe A, -1 phe B), có hệ số chặn (lợi thế đi trước)
w = [0.0] * len(heroes)
b = 0.0
lr, l2 = 0.5, 0.002
for epoch in range(300):
    gw = [0.0] * len(heroes)
    gb = 0.0
    for r in games:
        z = b + sum(w[idx[h]] for h in r["A"]) - sum(w[idx[h]] for h in r["B"])
        e = (1.0 if r["winner"] == "A" else 0.0) - sig(z)
        gb += e
        for h in r["A"]:
            gw[idx[h]] += e
        for h in r["B"]:
            gw[idx[h]] -= e
    n = len(games)
    b += lr * gb / n
    for i in range(len(w)):
        w[i] += lr * (gw[i] / n * 10 - l2 * w[i])

# phần dư theo cặp
K = 150  # số mẫu "ảo" kéo về 0
syn_e, syn_n = defaultdict(float), defaultdict(int)
ctr_e, ctr_n = defaultdict(float), defaultdict(int)
for r in games:
    z = b + sum(w[idx[h]] for h in r["A"]) - sum(w[idx[h]] for h in r["B"])
    p = sig(z)
    yA = 1.0 if r["winner"] == "A" else 0.0
    for side, mine, theirs, y, q in (("A", r["A"], r["B"], yA, p), ("B", r["B"], r["A"], 1 - yA, 1 - p)):
        e = (y - q) / max(0.05, q * (1 - q))  # phần dư quy về thang logit
        for a in mine:
            for c in mine:
                if a < c:
                    syn_e[(a, c)] += e
                    syn_n[(a, c)] += 1
            for t in theirs:
                ctr_e[(a, t)] += e
                ctr_n[(a, t)] += 1

syn = defaultdict(dict)
for (a, c), s in syn_e.items():
    v = round(s / (syn_n[(a, c)] + K) / 4, 4)  # mỗi cặp chia cho 4 đồng đội còn lại cùng gánh phần dư
    syn[a][c] = v
    syn[c][a] = v
ctr = defaultdict(dict)
for (a, t), s in ctr_e.items():
    ctr[a][t] = round(s / (ctr_n[(a, t)] + K) / 5, 4)

model = {"strength": {h: round(w[idx[h]], 4) for h in heroes}, "syn": syn, "ctr": ctr}
with open(out_ts, "w", encoding="utf8") as fh:
    fh.write("// Sinh tự động bởi scripts/balance/learn_draft.py từ %d trận selfplay. Đừng sửa tay.\n" % len(games))
    fh.write('import type {\n    DraftModel\n} from "./botDraft"\n\n')
    fh.write("export const DRAFT_MODEL: DraftModel = " + json.dumps(model, ensure_ascii=False) + "\n")
print(f"{len(games)} trận, lợi thế đi trước (logit) {b:.3f}")
top = sorted(heroes, key=lambda h: -w[idx[h]])
print("mạnh nhất:", ", ".join(f"{h} {w[idx[h]]:+.2f}" for h in top[:6]))
print("yếu nhất:", ", ".join(f"{h} {w[idx[h]]:+.2f}" for h in top[-6:]))
best_syn = sorted(((v, a, c) for a in syn for c, v in syn[a].items() if a < c), reverse=True)[:5]
print("cặp combo:", ", ".join(f"{a}+{c} {v:+.3f}" for v, a, c in best_syn))
best_ctr = sorted(((v, a, t) for a in ctr for t, v in ctr[a].items()), reverse=True)[:5]
print("khắc chế:", ", ".join(f"{a}>{t} {v:+.3f}" for v, a, t in best_ctr))
