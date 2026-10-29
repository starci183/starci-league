# Desc tiếng Việt cho 3 chiêu chọn ô (Annie R, Lux E, Jinx E). Chạy 1 lần từ thư mục dự án.
import re

H = 'packages/shared/src/heroes/'
D = {
 'annie': {'annie_r': "Chọn 1 ô bất kỳ bên địch ở **3 đường quanh mình** (**vùng 3×3**): triệu hồi Tibbers ở đó. Gây {30% AD} sát thương vật lý và {100 + 60% AP} sát thương phép cho mọi tướng địch trong vùng 3×3 quanh ô đó. Tibbers **đứng lại 2 lượt**: đầu mỗi lượt của Annie, đốt {20% AD} sát thương vật lý và {30 + 20% AP} sát thương phép cho mọi tướng địch trong vùng 3×3 quanh nó (**+50%** nếu Annie có đồng minh đứng kề)."},
 'lux': {'lux_e': "Chọn 1 ô bất kỳ bên địch ở **3 đường quanh mình** (**vùng 2×2**: ô đó, ô bên cạnh và hàng sau). Gây {20% AD} sát thương vật lý và {50 + 40% AP} sát thương phép cho mọi tướng địch trong vùng, gây Buốt 1 vòng và **Soi Rọi**."},
 'jinx': {'jinx_e': "Chọn 1 ô bất kỳ bên địch ở **3 đường quanh mình** (**vùng thập tự**: ô đó, trước, sau, trái, phải): đặt bẫy. Mọi tướng địch trong vùng nhận {30% AD} sát thương vật lý và {40 + 45% AP} sát thương phép và bị **Choáng 1 vòng**. Bãi bẫy **cháy thêm 1 lượt**: đầu lượt kế của Jinx, tướng địch còn trong vùng nhận {20% AD} sát thương vật lý và {20 + 20% AP} sát thương phép và bị Buốt 2 vòng."},
}
for hero, skills in D.items():
    p = H + hero + '.ts'
    s = open(p, encoding='utf-8').read()
    for sid, desc in skills.items():
        pat = re.compile(r'(id: "' + sid + r'",[^\n]*?(?:\n[^\n]*?)??desc: )"(?:[^"\\]|\\.)*"', re.S)
        s, n = pat.subn(lambda m: m.group(1) + '"' + desc + '"', s, count=1)
        assert n == 1, sid
    open(p, 'w', encoding='utf-8').write(s)
print('ok')
