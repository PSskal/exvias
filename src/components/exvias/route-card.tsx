import Link from "next/link";
import { ArrowRight, BusFront, MapPin } from "lucide-react";
import { RouteDirection } from "@/lib/generated/prisma/client";
import {
  formatPen,
  routeDirectionDestinationLabels,
  routeDirectionShortLabels,
} from "@/lib/exvias/constants";
import { cn } from "@/lib/utils";

export function RouteCard({
  direction,
  activeTrips,
  fare,
  variant,
}: {
  direction: RouteDirection;
  activeTrips: number;
  fare: number | string | { toString(): string };
  variant: "blue" | "red";
}) {
  const origin = routeDirectionShortLabels[direction];
  const destination = routeDirectionDestinationLabels[direction];

  return (
    <Link
      href={`/trips?direction=${direction}`}
      className="group block overflow-hidden rounded-[16px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(15,23,42,0.16)]"
    >
      <div
        className={cn(
          "relative h-28 bg-[#073FEA]",
          variant === "red" && "bg-[#C91F2F]",
        )}
      >
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(135deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative flex h-full items-center justify-between p-4 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white/75">
              Ruta disponible
            </p>
            <p className="mt-2 flex items-center gap-2 text-xl font-black">
              {origin}
              <ArrowRight className="size-4" />
              {destination}
            </p>
          </div>
          <div className="grid size-16 place-items-center rounded-2xl bg-white/15">
            <BusFront className="size-9" />
          </div>
        </div>
      </div>
      <div
        className={cn(
          "p-4",
        )}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <MapPin className={cn("size-4 text-[#073FEA]", variant === "red" && "text-[#C91F2F]")} />
            {activeTrips} viajes activos
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Desde</p>
            <p className={cn("text-2xl font-black text-[#073FEA]", variant === "red" && "text-[#C91F2F]")}>
              {formatPen(fare).replace(".00", "")}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
