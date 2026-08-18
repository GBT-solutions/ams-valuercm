import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ChipVariant = "primary" | "success" | "warning" | "danger";

interface ChipProps {
    variant?: ChipVariant;
    className?: string;
    children: ReactNode;
}

const variantClasses: Record<ChipVariant, string> = {
    primary: "bg-blue-100 text-blue-800 border border-blue-300",
    success: "bg-green-100 text-green-800 border border-green-300",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    danger: "bg-red-100 text-red-800 border border-red-300",
};

export function Chip({ variant = "primary", className, children }: ChipProps) {
    return (
        <span
            className={cn(
                "px-2.5 py-0.5 rounded-full text-sm font-medium flex items-center justify-center",
                variantClasses[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
