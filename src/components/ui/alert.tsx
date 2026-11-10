import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
}

export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const iconMap = {
    info: <Info className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />,
    success: (
      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
    ),
    warning: (
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
    ),
    destructive: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />,
  };

  const variantStyles = {
    info: "border-slate-200/90 bg-slate-50/80 text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200",
    success:
      "border-emerald-200/80 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
    warning:
      "border-amber-200/80 bg-amber-50/50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
    destructive:
      "border-red-200/80 bg-red-50/50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border p-3.5 text-xs sm:text-sm leading-relaxed transition-all",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {iconMap[variant]}
      <div className="space-y-0.5 flex-1 min-w-0">
        {title && <h5 className="font-semibold text-xs sm:text-sm tracking-tight">{title}</h5>}
        <div className="text-xs opacity-90 leading-normal">{children}</div>
      </div>
    </div>
  );
}
