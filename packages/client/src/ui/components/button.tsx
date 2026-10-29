// shadcn/ui Button, tuỳ biến Hextech: viền/ruột là ảnh 9-slice Codex vẽ (class lb-btn sinh trong nine.ts),
// nên nút React trùng khớp nút ở Sảnh và Xây bộ bài.
import * as React from "react"
import {
    cva, type VariantProps
} from "class-variance-authority"
import {
    cn
} from "@/ui/lib/utils"

const buttonVariants = cva("lb-btn inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-bold transition-[filter] disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                blue: "",
                gold: "gold",
            },
            size: {
                default: "h-9 px-3",
                sm: "h-7 px-2 text-[12px]",
                wide: "h-9 w-full px-3",
            },
        },
        defaultVariants: {
            variant: "blue", size: "default"
        },
    })

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({
        variant, size
    }),
    className)} {...props} />
))
Button.displayName = "Button"

export { Button, buttonVariants }
