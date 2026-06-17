import { cn } from "@/lib/utils";
import { statusLabels } from "@/lib/exvias/constants";

const styles: Record<string, string> = {
  QUEUED: "bg-[#F4B400]/15 text-[#8a6500]",
  ACTIVE: "bg-[#2ECC71]/15 text-[#1c7c44]",
  BOARDING: "bg-[#1E5BFF]/15 text-[#1E5BFF]",
  DEPARTED: "bg-zinc-900/10 text-zinc-700",
  COMPLETED: "bg-[#2ECC71]/15 text-[#1c7c44]",
  CANCELLED: "bg-[#E53935]/15 text-[#E53935]",
  RESERVED: "bg-[#F4B400]/15 text-[#8a6500]",
  CONFIRMED: "bg-[#1E5BFF]/15 text-[#1E5BFF]",
  PAID_PARTIAL: "bg-[#2ECC71]/15 text-[#1c7c44]",
  BOARDED: "bg-zinc-900/10 text-zinc-700",
  NO_SHOW: "bg-[#E53935]/15 text-[#E53935]",
  PENDING: "bg-[#F4B400]/15 text-[#8a6500]",
  SUBMITTED: "bg-[#1E5BFF]/15 text-[#1E5BFF]",
  APPROVED: "bg-[#2ECC71]/15 text-[#1c7c44]",
  REJECTED: "bg-[#E53935]/15 text-[#E53935]",
};

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[value] ?? "bg-zinc-100 text-zinc-700",
        className,
      )}
    >
      {statusLabels[value] ?? value}
    </span>
  );
}
