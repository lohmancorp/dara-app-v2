import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-[24px] w-[44px] flex-shrink-0 cursor-pointer items-center rounded-full border-0 transition-[background-color,box-shadow] duration-[180ms] ease-out data-[state=checked]:bg-[hsl(var(--switch-track-on))] data-[state=unchecked]:bg-[hsl(var(--switch-track-off))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
    role="switch"
    aria-checked={props.checked}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute top-[2px] left-[2px] block h-[20px] w-[20px] rounded-full bg-[hsl(var(--switch-thumb))] shadow-sm ring-0 transition-transform duration-[180ms] ease-out will-change-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
