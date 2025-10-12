import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingActionButtonProps {
  label: string;
  onClick?: () => void;
}

export function FloatingActionButton({ label, onClick }: FloatingActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="h-11 w-11 rounded-full bg-accent text-accent-foreground border-2 border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={label}
        >
          <Plus className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
