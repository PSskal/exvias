import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin } from "lucide-react";
import { RouteDirection } from "@/lib/generated/prisma/client";
import {
  formatPen,
  routeDirectionDestinationLabels,
  routeDirectionShortLabels,
} from "@/lib/exvias/constants";
import { cn } from "@/lib/utils";

const carByVariant = {
  blue: "/cars/transparent/avanzanegro-transparent.png",
  red: "/cars/transparent/avanzarojo-transparent.png",
} as const;

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
  const carImage = carByVariant[variant];

  return (
    <Link
      href={`/trips?direction=${direction}`}
      className="group block overflow-hidden rounded-[24px] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5"
    >
      <div
        className={cn(
          "relative min-h-40 bg-[linear-gradient(135deg,#EEF4FF,#FFFFFF)] p-4",
          variant === "red" && "bg-[linear-gradient(135deg,#FFF1F2,#FFFFFF)]",
        )}
      >
        <div className="absolute -right-10 -top-10 size-36 rounded-full bg-[#1E5BFF]/10 blur-2xl" />
        <div className="relative z-10 max-w-[56%]">
            <p className={cn("text-xs font-black uppercase tracking-wide text-[#1E5BFF]", variant === "red" && "text-[#E53935]")}>
              Ruta disponible
            </p>
            <p className="mt-2 flex items-center gap-2 text-xl font-black text-slate-950">
              {origin}
              <ArrowRight className="size-4" />
              {destination}
            </p>
        </div>
        <div className="absolute bottom-0 right-0 h-28 w-52">
          <Image
            src={carImage}
            alt="Carro EXVIASS"
            fill
            sizes="208px"
            className="object-contain object-right-bottom drop-shadow-[0_14px_18px_rgba(15,23,42,0.18)]"
          />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <MapPin className={cn("size-4 text-[#1E5BFF]", variant === "red" && "text-[#E53935]")} />
            {activeTrips} viajes activos
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">Desde</p>
            <p className={cn("text-2xl font-black text-[#1E5BFF]", variant === "red" && "text-[#E53935]")}>
              {formatPen(fare).replace(".00", "")}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
