// Bảng số 8 tướng (không đồ + 3 build) trên các bia. Chạy: npx tsx scripts/_variants/marksman_mage/report.ts [heroId ...]
import { SCEN, line } from "./sim";

type B = { label: string; items: string; vs: string[] };
const H: Record<string, { order: string[]; builds: B[] }> = {
  kogmaw: { order: ["W", "Q", "E", "R"], builds: [
    { label: "Center xay tank: Guinsoo + Diệt Khổng Lồ + Nashor", items: "cuong_dao,diet_khong_lo,nanh_nashor", vs: ["tank", "pack"] },
    { label: "Counter pháo AP: Rabadon + Quỷ Thư + Bùa Lam", items: "mu_rabadon,quy_thu,bua_lam", vs: ["mage", "spread"] },
    { label: "Dị: Đại Bác + Statikk + Ý Chí Titan", items: "dai_bac,dao_dien,y_chi_titan", vs: ["pack", "tank"] },
  ] },
  vayne: { order: ["R", "W", "Q", "E"], builds: [
    { label: "Center tay đôi: Vô Cực + Huyết Kiếm + Diệt Khổng Lồ", items: "vo_cuc_kiem,huyet_kiem,diet_khong_lo", vs: ["tank", "fighter"] },
    { label: "Counter lao vào: Huyết Kiếm + Thiên Thần + Khăn Giải Thuật", items: "huyet_kiem,giap_thien_than,khan_giai_thuat", vs: ["fighter", "mage"] },
    { label: "Dị AP: Bảo Thạch + Rabadon + Guinsoo", items: "gang_bao_thach,mu_rabadon,cuong_dao", vs: ["tank", "mage"] },
  ] },
  ashe: { order: ["E", "Q", "W", "R"], builds: [
    { label: "Center băng diện rộng: Đại Bác + Runaan + Vô Cực", items: "dai_bac,cung_runaan,vo_cuc_kiem", vs: ["pack", "spread"] },
    { label: "Counter sát thủ ẩn: Nhắc Tử Vong + Thiên Thần + Khăn Giải Thuật", items: "loi_nhac_tu_vong,giap_thien_than,khan_giai_thuat", vs: ["assassin", "mage"] },
    { label: "Dị AP: Rabadon + Liandry + Bùa Lam", items: "mu_rabadon,mat_na_liandry,bua_lam", vs: ["mage", "pack"] },
  ] },
  jinx: { order: ["Q", "E", "W", "R"], builds: [
    { label: "Center dọn giao tranh: Runaan + Guinsoo + Vô Cực", items: "cung_runaan,cuong_dao,vo_cuc_kiem", vs: ["pack", "mage"] },
    { label: "Counter tiền tuyến: Diệt Khổng Lồ + Kiếm Tử Thần + Vô Cực", items: "diet_khong_lo,kiem_tu_than,vo_cuc_kiem", vs: ["tank", "fighter"] },
    { label: "Dị AP: Rabadon + Luden + Quỷ Thư", items: "mu_rabadon,ban_dong_hanh_luden,quy_thu", vs: ["pack", "mage"] },
  ] },
  ahri: { order: ["E", "W", "Q", "R"], builds: [
    { label: "Center săn lẻ: Rabadon + Quỷ Thư + Bùa Lam", items: "mu_rabadon,quy_thu,bua_lam", vs: ["spread", "mage"] },
    { label: "Counter sát thủ: Vương Miện + Khăn Giải Thuật + Rabadon", items: "vuong_mien,khan_giai_thuat,mu_rabadon", vs: ["fighter", "mage"] },
    { label: "Dị AD: Súng Hextech + Kiếm Tử Thần + Áo Choàng Bóng Tối", items: "sung_hextech,kiem_tu_than,ao_choang_bong_toi", vs: ["spread", "tank"] },
  ] },
  annie: { order: ["R", "W", "Q", "E"], builds: [
    { label: "Center nổ một lượt: Rabadon + Liandry + Bùa Lam", items: "mu_rabadon,mat_na_liandry,bua_lam", vs: ["pack", "mage"] },
    { label: "Counter lao vào: Khiên Hư Vô + Vương Miện + Rabadon", items: "khien_hu_vo,vuong_mien,mu_rabadon", vs: ["fighter", "pack"] },
    { label: "Dị Annie trâu: Warmog + Áo Choàng Lửa + Vương Miện", items: "giap_warmog,ao_choang_lua,vuong_mien", vs: ["pack", "tank"] },
  ] },
  lissandra: { order: ["R", "Q", "W", "E"], builds: [
    { label: "Center khóa tiền tuyến: Mũ Thích Nghi + Vương Miện + Rabadon", items: "mu_thich_nghi,vuong_mien,mu_rabadon", vs: ["pack", "tank"] },
    { label: "Counter lao vào: Tim Băng + Khiên Hư Vô + Rabadon", items: "tim_bang,khien_hu_vo,mu_rabadon", vs: ["fighter", "pack"] },
    { label: "Dị băng trâu: Warmog + Tim Băng + Liandry", items: "giap_warmog,tim_bang,mat_na_liandry", vs: ["tank", "pack"] },
  ] },
  lux: { order: ["Q", "R", "E", "W"], builds: [
    { label: "Center xuyên đường: Rabadon + Luden + Bùa Lam", items: "mu_rabadon,ban_dong_hanh_luden,bua_lam", vs: ["pack", "mage"] },
    { label: "Counter bảo kê (khiên): Vương Miện + Lời Thề Hộ Vệ + Mũ Thích Nghi", items: "vuong_mien,loi_the_ho_ve,mu_thich_nghi", vs: ["pack", "fighter"] },
    { label: "Dị đánh thường kích dấu: Nashor + Guinsoo + Statikk", items: "nanh_nashor,cuong_dao,dao_dien", vs: ["mage", "tank"] },
  ] },
};

const pick = process.argv.slice(2);
for (const [id, cfg] of Object.entries(H)) {
  if (pick.length && !pick.includes(id)) continue;
  const rows: Record<string, unknown>[] = [];
  for (const k of ["tank", "mage", "pack"]) rows.push(line(id, "(không đồ)", [], cfg.order, SCEN[k]));
  for (const b of cfg.builds) for (const k of b.vs) rows.push(line(id, b.label, b.items.split(","), cfg.order, SCEN[k]));
  console.log(`\n=== ${id} ===`);
  console.table(rows);
}
