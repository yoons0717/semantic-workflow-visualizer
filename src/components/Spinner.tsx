"use client";

interface SpinnerProps {
  size?: "sm" | "md";
}

const SIZE_CLASSES: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
};

export function Spinner({ size = "sm" }: SpinnerProps) {
  return (
    <span
      className={`inline-block border border-current border-t-transparent rounded-full animate-spin ${SIZE_CLASSES[size]}`}
    />
  );
}
