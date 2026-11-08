// Kiểu mô tả hiệu ứng của một chiêu, cùng hình với bản web (packages/client/src/card/vfx/types.ts) để dùng chung bảng
// heroMap.gen.ts. Bản Cocos hiện chỉ đọc màu (color, color2) và cường độ để vẽ hiệu ứng một hạt.
export interface SkillVfx {
    travel: string;
    impact: string;
    shield?: string;
    block?: string;
    extra?: string;
    cast?: string;
    color: number;
    color2?: number;
    intensity?: number;
}
