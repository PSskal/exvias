import Link from "next/link";
import Image from "next/image";
import { Clock3, UserRound, UsersRound } from "lucide-react";
import { TripStatus } from "@/lib/generated/prisma/client";
import { formatTime, getVehicleOption } from "@/lib/exvias/constants";
import { cn } from "@/lib/utils";

export function PassengerTripCard({
  id,
  status,
  label,
  departure,
  bookedSeats,
  capacity,
  minimumToStart,
  plate,
  vehicleName,
  driverName,
  driverImage,
  index,
}: {
  id: string;
  status: TripStatus;
  label: string;
  departure?: Date | null;
  bookedSeats: number;
  capacity: number;
  minimumToStart: number;
  plate?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  driverImage?: string | null;
  index: number;
}) {
  const isFull = bookedSeats >= capacity;
  const canReserve = !isFull && !["DEPARTED", "COMPLETED", "CANCELLED"].includes(status);
  const cta = status === "ACTIVE" || index === 0 ? "Unirme" : "Reservar";
  const badge =
    status === "ACTIVE" || index === 0
      ? "TURNO ACTUAL"
      : index === 1
        ? "SIGUIENTE TURNO"
        : `TURNO ${index + 1}`;
  const vehicle = getVehicleOption(vehicleName);
  const seatProgress = Math.min(100, (bookedSeats / capacity) * 100);

  return (
    <div className="overflow-hidden rounded-[28px] bg-[#E8EDF0] p-3 shadow-[0_18px_44px_rgba(15,23,42,0.10)] ring-1 ring-white/70">
      <div className="relative min-h-52 rounded-[24px] bg-[linear-gradient(180deg,#F7FAFB,#E3E9EC)] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex h-9 items-center rounded-full bg-white px-3 text-xs font-black text-slate-950 shadow-sm">
            {badge}
          </span>
          <span
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-black shadow-sm",
              bookedSeats >= minimumToStart
                ? "bg-[#2ECC71] text-white"
                : "bg-[#F4B400] text-slate-950",
            )}
          >
            <UsersRound className="size-4" />
            {bookedSeats}/{capacity}
          </span>
        </div>

        <div className="relative mx-auto mt-1 h-36 w-full">
          <Image
            src={vehicle.image}
            alt={vehicle.name}
            fill
            sizes="(max-width: 480px) 100vw, 420px"
            className="scale-110 object-contain drop-shadow-[0_18px_20px_rgba(15,23,42,0.20)]"
          />
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3 rounded-[18px] bg-white/80 p-3 shadow-sm ring-1 ring-white/70">
          <div className="min-w-0">
            <p className="text-base font-black text-slate-950">
              {status === "ACTIVE" || index === 0 ? "Salida próxima" : "Turno disponible"}
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {status === "ACTIVE" || index === 0
                ? "Sale en breve"
                : departure
                  ? `Sale ${formatTime(departure)}`
                  : label}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                <Clock3 className="size-3" />
                {plate ?? "EXV-02"}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                {vehicle.shortName}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {driverImage ? (
                <Image
                  src={driverImage}
                  alt={driverName ?? "Conductor"}
                  width={24}
                  height={24}
                  className="size-6 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-[#1E5BFF]/10 text-[#1E5BFF]">
                  <UserRound className="size-3.5" />
                </span>
              )}
              <span className="truncate text-xs font-black text-slate-700">
                {driverName ?? "Conductor asignado"}
              </span>
            </div>
          </div>

          {canReserve ? (
            <Link
              href={`/trip/${id}`}
              className={cn(
                "inline-flex h-11 items-center rounded-full px-4 text-xs font-black text-white",
                index === 0 ? "bg-slate-950" : "bg-[#1E5BFF]",
              )}
            >
              {cta}
            </Link>
          ) : (
            <span className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500">
              Próximamente
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={cn(
            "h-full rounded-full",
            bookedSeats >= minimumToStart ? "bg-[#12B85F]" : "bg-[#F4B400]",
          )}
          style={{ width: `${seatProgress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {bookedSeats >= minimumToStart ? (
          <>
            Listo para confirmar salida. Quedan <strong>{capacity - bookedSeats} asientos</strong>.
          </>
        ) : (
          <>
            Faltan <strong>{minimumToStart - bookedSeats} pasajeros</strong> para confirmar.
          </>
        )}
      </p>
    </div>
  );
}
