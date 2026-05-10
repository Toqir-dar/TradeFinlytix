import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-brand-subtle bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand-primary",
        props.className
      )}
    />
  );
}
