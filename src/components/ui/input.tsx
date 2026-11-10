"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = "text", label, error, helperText, icon, endAdornment, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-300 transition-colors">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus-visible:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 shadow-2xs",
              icon ? "pl-10" : "pl-3",
              endAdornment ? "pr-10" : "pr-3",
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/80 dark:focus:ring-red-500/30"
                : "border-slate-200/90 hover:border-slate-300 focus:border-slate-900 focus:ring-slate-900/10 dark:border-slate-800 dark:hover:border-slate-700 dark:focus:border-slate-300 dark:focus:ring-slate-100/10",
              className
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">{endAdornment}</div>
          )}
        </div>
        {error ? (
          <p
            id={errorId}
            className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 animate-in fade-in duration-150"
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
