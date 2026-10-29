import {
    clsx, type ClassValue
} from "clsx"
import {
    twMerge
} from "tailwind-merge"

/** shadcn: ghép class Tailwind, class sau đè class trước */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
