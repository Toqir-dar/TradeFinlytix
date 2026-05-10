import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("card-shell p-5 transition-shadow hover:shadow-md", className)}
      {...props}
    />
  );
}
