# Học trọng số từng thành phần chấm điểm (botEval.TERM_KEYS) từ dữ liệu --dump của run_batch:
# hồi quy logistic P(A thắng) theo hiệu thành phần ở mỗi đầu lượt. Trọng số được chuẩn hoá để giá trị
# có cùng độ lệch chuẩn với bộ chấm viết tay (giữ thang điểm cho beam search).
# Chạy: python -I scripts/balance/learn_value.py <model.json> <thư mục đợt> [...]
import glob
import json
import os
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
KEYS = ["life", "mana", "lastLives", "token", "items", "reserve", "deadStack", "respawn", "presence", "hp", "shield", "risk",
        "status", "stack", "grave", "hand", "foeHand", "deck", "marker"]
out, runs = sys.argv[1], sys.argv[2:]
X, Y, G = [], [], []
for run in runs:
    for f in glob.glob(os.path.join(run, "part-*.ndjson")):
        with open(f, encoding="utf8") as fh:
            for line in fh:
                r = json.loads(line)
                if r.get("winner") not in ("A", "B") or not r.get("dump"):
                    continue
                y = 1.0 if r["winner"] == "A" else 0.0
                for row in r["dump"]:
                    X.append(row["d"] + [1.0 if row["a"] == "A" else -1.0])
                    Y.append(y)
                    G.append(r["i"])
X = np.array(X)
Y = np.array(Y)
G = np.array(G)
names = KEYS + ["activeA"]
print(f"{len(set(G.tolist()))} trận, {len(Y)} thế cờ")

# tách train/test theo trận
test = (G % 5) == 0
sd = X.std(axis=0) + 1e-9
Z = X / sd


def fit(Z, Y, l2=1e-3, iters=3000, lr=0.5):
    w = np.zeros(Z.shape[1])
    b = 0.0
    for _ in range(iters):
        p = 1 / (1 + np.exp(-(Z @ w + b)))
        e = Y - p
        w += lr * (Z.T @ e / len(Y) - l2 * w)
        b += lr * e.mean()
    return w, b


def logloss(Z, Y, w, b):
    p = np.clip(1 / (1 + np.exp(-(Z @ w + b))), 1e-6, 1 - 1e-6)
    return float(-(Y * np.log(p) + (1 - Y) * np.log(1 - p)).mean())


w, b = fit(Z[~test], Y[~test])
# mốc so sánh: bộ chấm viết tay (tổng các thành phần, trọng số 1) + 1 hệ số tỉ lệ
hand = X[:, :len(KEYS)].sum(axis=1, keepdims=True)
hs = hand.std() + 1e-9
wh, bh = fit(hand / hs, Y, iters=2000)
wh2, bh2 = fit(hand[~test] / hs, Y[~test], iters=2000)
print(f"log-loss tập kiểm tra: học được {logloss(Z[test], Y[test], w, b):.4f} | viết tay {logloss(hand[test] / hs, Y[test], wh2, bh2):.4f} | đoán 50% {np.log(2):.4f}")

beta = w / sd  # hệ số trên thang gốc
beta_terms = beta[:len(KEYS)]
learned_val = X[:, :len(KEYS)] @ beta_terms
scale = hand.std() / (learned_val.std() + 1e-9)
model = {k: round(float(beta_terms[i] * scale), 4) for i, k in enumerate(KEYS)}
with open(out, "w", encoding="utf8") as fh:
    json.dump(model, fh, indent=1)
print("trọng số (1 = như viết tay):")
for k in KEYS:
    print(f"  {k:<10} {model[k]:+.3f}")
