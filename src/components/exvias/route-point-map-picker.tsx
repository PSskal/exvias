import { MapPin } from "lucide-react";
import { formatTime } from "@/lib/exvias/constants";
import { cn } from "@/lib/utils";

type RouteMapPoint = {
  id: string;
  name: string;
  minuteOffset: number;
  latitude: number | null;
  longitude: number | null;
  isTerminal: boolean;
};

function pointTime(point: RouteMapPoint, plannedDepartureAtIso?: string | null) {
  if (!plannedDepartureAtIso) return `+${point.minuteOffset} min`;

  return formatTime(
    new Date(
      new Date(plannedDepartureAtIso).getTime() + point.minuteOffset * 60_000,
    ),
  );
}

export function RoutePointMapPicker({
  points,
  plannedDepartureAtIso,
}: {
  points: RouteMapPoint[];
  plannedDepartureAtIso?: string | null;
}) {
  const defaultPoint =
    points.find((point) => !point.isTerminal)?.id ?? points[0]?.id ?? "";

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#f8fafc,#eef4f6)] p-4 shadow-inner ring-1 ring-slate-200/70">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          Paso 1
        </p>
        <h2 className="font-black text-slate-950">Selecciona dónde subirás</h2>
      </div>

      <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#EAF1FF,#F8FAFC)] p-4 ring-1 ring-white">
        <div className="absolute bottom-8 left-8 top-8 w-1 rounded-full bg-[#1E5BFF]/20" />
        <div className="space-y-3">
          {points.map((point, index) => (
            <label key={point.id} className="relative flex cursor-pointer gap-3">
              <input
                className="peer sr-only"
                type="radio"
                name="boardingPointId"
                value={point.id}
                defaultChecked={point.id === defaultPoint || (!defaultPoint && index === 0)}
                required
              />
              <span
                className={cn(
                  "relative z-10 mt-4 grid size-8 shrink-0 place-items-center rounded-full border-4 border-white text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]",
                  point.isTerminal ? "bg-[#E53935]" : "bg-[#1E5BFF]",
                  "peer-checked:bg-[#2ECC71]",
                )}
              >
                <MapPin className="size-4" />
              </span>
              <span className="block min-w-0 flex-1 rounded-[18px] bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-transparent transition peer-checked:ring-2 peer-checked:ring-[#1E5BFF]">
                <span className="block truncate text-sm font-black text-slate-950">
                  {point.name}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                  Paso aprox: {pointTime(point, plannedDepartureAtIso)}
                </span>
                <span className="mt-3 hidden rounded-full bg-[#1E5BFF] px-3 py-1.5 text-center text-[11px] font-black text-white peer-checked:block">
                  Elegido
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
