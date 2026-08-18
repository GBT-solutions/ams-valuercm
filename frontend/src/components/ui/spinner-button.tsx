import React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SpinnerButtonProps {
    children: React.ReactNode;
    loading?: boolean;
    loadingText?: string;
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

const SpinnerButton: React.FC<SpinnerButtonProps> = ({
    children,
    loading = false,
    loadingText = "Loading...",
    disabled = false,
    className,
    onClick,
    type = "button",
    variant = "default",
    size = "default",
}) => {
    return (
        <Button
            type={type}
            variant={variant}
            size={size}
            disabled={disabled || loading}
            className={cn("relative", className)}
            onClick={onClick}
        >
            {loading && (
                <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
            )}
            {loading ? loadingText : children}
        </Button>
    );
};

export default SpinnerButton; 