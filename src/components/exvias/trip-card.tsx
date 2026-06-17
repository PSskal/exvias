import Link from "next/link";
import { ArrowRight, BusFront, Clock3, UsersRound } from "lucide-react";
import { TripStatus } from "@/lib/generated/prisma/client";
import { formatTime } from "@/lib/exvias/constants";
import { cn } from "@/lib/utils";

const toneByStatus: Record<TripStatus, string> = {
  QUEUED: "text-slate-500 bg-slate-100",
  ACTIVE: "text-[#10A957] bg-[#2ECC71]/15",
  BOARDING: "text-[#1E5BFF] bg-[#1E5BFF]/10",
  DEPARTED: "text-slate-500 bg-slate-100",
  COMPLETED: "text-[#10A957] bg-[#2ECC71]/15",
  CANCELLED: "text-[#E53935] bg-[#E53935]/10",
};

export function PassengerTripCard({
  id,
  status,
  label,
  departure,
  bookedSeats,
  capacity,
  minimumToStart,
  plate,
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

  return (
    <div className="rounded-[16px] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", toneByStatus[status])}>
            {badge}
          </span>
          <p className="mt-4 text-lg font-black">
            {status === "ACTIVE" || index === 0
              ? "Sale en breve"
              : departure
                ? `Sale ${formatTime(departure)}`
                : label}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <UsersRound className="size-4 text-slate-400" />
            {bookedSeats} / {capacity} pasajeros
          </p>
          <div className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
            <Clock3 className="size-3" />
            {plate ?? "EXV-02"}
          </div>
        </div>
        <div className="flex w-28 flex-col items-end justify-between">
          <div className="mt-5 grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <BusFront className="size-10" />
          </div>
          {canReserve ? (
            <Link
              href={`/trip/${id}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-black text-white",
                index === 0 ? "bg-[#12B85F]" : "bg-[#F4B400] text-slate-950",
              )}
            >
              {cta}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <span className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500">
              Próximamente
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            bookedSeats >= minimumToStart ? "bg-[#12B85F]" : "bg-[#F4B400]",
          )}
          style={{ width: `${Math.min(100, (bookedSeats / capacity) * 100)}%` }}
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
