// shadcn/ui HoverCard (Radix)
import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import {
    cn
} from "@/ui/lib/utils"

const HoverCard = HoverCardPrimitive.Root
const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
    <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn("z-[100] w-72 rounded-md p-3 shadow-xl outline-none",
                className)}
            {...props}
        />
    </HoverCardPrimitive.Portal>
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
