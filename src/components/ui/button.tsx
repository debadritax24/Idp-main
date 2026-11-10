"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "brand" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 dark:focus-visible:ring-slate-100 dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.985]";

    const variantStyles = {
      primary:
        "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-xs dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:active:bg-slate-300",
      brand:
        "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-xs dark:bg-brand-500 dark:hover:bg-brand-600",
      secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200/80 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
      outline:
        "border border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50/80 hover:border-slate-300 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 shadow-xs",
      ghost:
        "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-100",
      danger:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs dark:bg-red-600 dark:hover:bg-red-700",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-sm sm:text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
