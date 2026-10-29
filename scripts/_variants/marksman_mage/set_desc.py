# Ghi lại desc tiếng Việt của 32 chiêu theo khuôn "câu mục tiêu trước". Chạy 1 lần từ thư mục dự án.
import re

H = 'packages/shared/src/heroes/'
D = {
 'kogmaw': {
  'kogmaw_q': "Chọn 1 tướng địch cùng đường. Gây {40 + 80% AD} sát thương vật lý và {40% AP} sát thương phép cho tướng đó và gây **Rã giáp** 2 vòng.",
  'kogmaw_w': "Bản thân. Trong 2 vòng, đòn đánh của Kog'Maw **với tới mọi tướng địch ở 3 đường quanh mình** và gây thêm {10 + 15% AD} sát thương vật lý cùng {15% AP} + **3% máu tối đa của mục tiêu** + 2 × số Kog stack sát thương phép. Đánh tướng đỡ đòn: Kog'Maw nhận **+1 Kog stack** (vĩnh viễn).",
  'kogmaw_e': "Không chọn: mọi tướng địch ở **cột dọc** đường của Kog'Maw. Gây {20% AD} sát thương vật lý và {60 + 60% AP} sát thương phép cho các tướng đó và gây **Buốt** 2 vòng.",
  'kogmaw_r': "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {50% AD} sát thương vật lý và {80 + 70% AP} sát thương phép cho tướng đó.",
 },
 'vayne': {
  'vayne_q': "Bản thân. Vayne được **đi thêm 1 ô** lượt này; lượt này, đòn đánh của Vayne gây **thêm 50% sát thương** và thêm {25% AP} sát thương phép.",
  'vayne_w': "Bản thân. Vayne nhận **Chú Tâm** 2 vòng: **+40% Tốc đánh** và **hút máu 15%** từ đòn đánh.",
  'vayne_e': "Chọn 1 tướng địch cùng đường. Gây {50 + 50% AD} sát thương vật lý và {60% AP} sát thương phép cho tướng đó và **đẩy lùi** nó 1 ô.",
  'vayne_r': "Bản thân. Vayne được **Cường Hoá** 3 vòng: nhận **+25% AD** và **+30 AP**, và Nhào Lộn (Q) khiến Vayne **hóa ẩn**.",
 },
 'ashe': {
  'ashe_q': "Bản thân. Trong 1 vòng, mỗi đòn đánh của Ashe **bắn thêm 2 mũi tên** vào cùng mục tiêu, mỗi mũi gây 25% sát thương của đòn đánh đó và {10% AP} sát thương phép.",
  'ashe_w': "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình** (đường này và 2 đường kề). Gây {30 + 50% AD} sát thương vật lý và {40% AP} sát thương phép cho các tướng đó và gây **Buốt** 2 vòng.",
  'ashe_e': "Chọn 1 tướng địch **bất kỳ trên sân, kể cả đang ẩn**. Lộ diện **mọi tướng địch đang ẩn**, gây {20 + 40% AD} sát thương vật lý và {50% AP} sát thương phép cho tướng đó và **đánh dấu** nó: Buốt 2 vòng.",
  'ashe_r': "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {60% AD} sát thương vật lý và {100 + 60% AP} sát thương phép cho tướng đó và gây **Choáng** 1 vòng; mọi tướng địch khác trong **vùng 3×3** quanh tướng đó bị **Buốt** 2 vòng.",
 },
 'jinx': {
  'jinx_q': "Bản thân. Lượt này, đòn đánh của Jinx gây thêm 10% sát thương và **nổ lan** sang mọi tướng địch khác trong **vùng 3×3** quanh mục tiêu: 50% sát thương đòn đánh và thêm {25% AP} sát thương phép.",
  'jinx_w': "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {30 + 100% AD} sát thương vật lý và {30% AP} sát thương phép cho tướng đó và gây **Buốt** 2 vòng.",
  'jinx_e': "Không chọn: tướng địch đứng đầu đường của Jinx. Gây {30% AD} sát thương vật lý và {40 + 45% AP} sát thương phép cho tướng đó và gây **Choáng 1 vòng**.",
  'jinx_r': "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {60 + 80% AD} sát thương vật lý cộng **15% máu đã mất** của tướng đó, và {30% AP} sát thương phép; mọi tướng địch khác trong **vùng 3×3** quanh tướng đó nhận **50%** sát thương này.",
 },
 'ahri': {
  'ahri_q': "Không chọn: mọi tướng địch ở **cột dọc** đường của Ahri. Gây {20% AD} sát thương vật lý và {45 + 40% AP} sát thương phép cho các tướng đó; tướng đứng đầu nhận thêm **{20 + 15% AP} sát thương chuẩn** khi quả cầu quay về.",
  'ahri_w': "Không chọn: **3 ngọn lửa** tự bay vào tướng địch ở **3 đường quanh mình**, mỗi ngọn vào tướng còn ít máu nhất (theo %) chưa bị ngọn nào trúng (hết người thì quay lại từ đầu). Mỗi ngọn gây {10% AD} sát thương vật lý và {15 + 15% AP} sát thương phép; ngọn trúng lại tướng đã trúng chỉ gây **50%**.",
  'ahri_e': "Chọn 1 tướng địch ở **3 đường quanh mình**. Gây {20% AD} sát thương vật lý và {50 + 50% AP} sát thương phép cho tướng đó, gây **Choáng 1 vòng** và **kéo nó về phía Ahri** 1 ô (sang đường của Ahri, hoặc lên 1 hàng nếu đã cùng đường; ô đích phải trống).",
  'ahri_r': "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình**. Gây {20% AD} sát thương vật lý và {40 + 35% AP} sát thương phép cho các tướng đó; rồi Ahri **ẩn thân**, được **đi thêm 1 ô** và nhận Cường Hoá 2 vòng. Khi đang Cường Hoá, chiêu của Ahri gây **thêm 20% sát thương**.",
 },
 'annie': {
  'annie_q': "Chọn 1 tướng địch cùng đường. Gây {20% AD} sát thương vật lý và **{50 + 55% AP} sát thương phép** cho tướng đó.",
  'annie_w': "Chọn 1 tướng địch cùng đường. Gây {20% AD} sát thương vật lý và {50 + 50% AP} sát thương phép cho mọi tướng địch trong **vùng thập tự** quanh tướng đó (tướng đó, trước, sau, trái, phải).",
  'annie_e': "Chọn 1 đồng minh cùng đường (kể cả Annie). Tướng đó nhận Khiên {60 + 20% AD + 40% AP}; nếu tướng đó dưới 50% máu, Khiên **tăng thêm 50%**.",
  'annie_r': "Chọn 1 tướng địch ở **3 đường quanh mình**: Tibbers rơi xuống đó. Gây {30% AD} sát thương vật lý và {100 + 60% AP} sát thương phép cho mọi tướng địch trong **vùng 3×3** quanh tướng đó, rồi Annie nhận Cường Hoá 3 vòng. Khi đang Cường Hoá, đầu mỗi lượt **Tibbers** gây {20% AD} sát thương vật lý và {30 + 20% AP} sát thương phép cho mọi tướng địch ở **cột dọc** đường của Annie (**+50%** nếu Annie có đồng minh đứng kề).",
 },
 'lissandra': {
  'lissandra_q': "Không chọn: tướng địch đứng đầu đường của Lissandra và tướng đứng ngay sau nó (**cột dọc**). Tướng đứng đầu nhận {20% AD} sát thương vật lý và {60 + 55% AP} sát thương phép và bị **Buốt** 2 vòng; tướng đứng sau nhận **50%** lượng đó.",
  'lissandra_w': "Không chọn: mọi tướng địch trong **vùng 3×3** quanh tướng địch đứng đầu đường của Lissandra. Gây {20% AD} sát thương vật lý và {30 + 30% AP} sát thương phép cho các tướng đó và gây Buốt 2 vòng; tướng đứng đầu bị **Đóng băng** 1 vòng.",
  'lissandra_e': "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình**. Gây {20% AD} sát thương vật lý và {35 + 35% AP} sát thương phép cho các tướng đó và gây **Buốt** 2 vòng; Lissandra trượt theo con đường băng, được **đi thêm 1 ô**.",
  'lissandra_r': "Chọn 1 tướng địch cùng đường. Gây {30% AD} sát thương vật lý và {80 + 60% AP} sát thương phép cho tướng đó, gây **Đóng băng** 1 vòng và Buốt 2 vòng; mọi tướng địch khác trong **vùng 3×3** quanh tướng đó nhận {40 + 30% AP} sát thương phép và bị Buốt 2 vòng.",
 },
 'lux': {
  'lux_q': "Chọn 1 tướng địch ở **3 đường quanh mình**. Gây {20% AD} sát thương vật lý và {40 + 45% AP} sát thương phép cho tướng đó và gây **Choáng** 1 vòng; tướng đứng ngay sau nó (**cột dọc**) cũng bị trói: nhận **50%** lượng đó và bị Choáng 1 vòng. Cả hai bị **Soi Rọi**.",
  'lux_w': "Chọn 1 đồng minh ở **3 đường quanh mình** (kể cả Lux). Tướng đó nhận **Khiên** {60 + 15% AD + 45% AP}; lăng kính quay về, Lux nhận Khiên bằng **50%** lượng đó (khi chọn đồng minh khác).",
  'lux_e': "Chọn 1 tướng địch ở **3 đường quanh mình**: quả cầu rơi xuống đó. Gây {20% AD} sát thương vật lý và {50 + 40% AP} sát thương phép cho mọi tướng địch trong **vùng 2×2** chứa tướng đó (tướng đó, ô bên cạnh và hàng sau), gây Buốt 1 vòng và **Soi Rọi**.",
  'lux_r': "Không chọn: mọi tướng địch ở **cột dọc** đường của Lux (xuyên cả 3 hàng) và trụ địch đường này. Gây {20% AD} sát thương vật lý và {80 + 50% AP} sát thương phép cho các tướng đó; trụ nhận {75 + 50% AP} sát thương.",
 },
}
for hero, skills in D.items():
    p = H + hero + '.ts'
    s = open(p, encoding='utf-8').read()
    for sid, desc in skills.items():
        pat = re.compile(r'(id: "' + sid + r'",[^\n]*?(?:\n[^\n]*?)??desc: )"(?:[^"\\]|\\.)*"', re.S)
        s, n = pat.subn(lambda m: m.group(1) + '"' + desc.replace('"', '\\"') + '"', s, count=1)
        assert n == 1, sid
    open(p, 'w', encoding='utf-8').write(s)
print('ok')
