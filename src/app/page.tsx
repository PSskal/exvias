import Link from "next/link";
import { Send } from "lucide-react";
import { RouteDirection } from "@/lib/generated/prisma/client";
import { getRoutesOverview } from "@/lib/exvias/routes";
import { getCurrentUser } from "@/lib/session";
import {
  BottomNav,
  ContentArea,
  HomeTopBar,
  PhoneShell,
  StatusBar,
} from "@/components/exvias/mobile-shell";
import { RouteCard } from "@/components/exvias/route-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [routes, user] = await Promise.all([
    getRoutesOverview(),
    getCurrentUser(),
  ]);
  const route = routes[0];

  const tripCountByDirection = Object.fromEntries(
    Object.values(RouteDirection).map((direction) => [
      direction,
      route?.trips.filter((trip) => trip.direction === direction).length ?? 0,
    ]),
  ) as Record<RouteDirection, number>;

  return (
    <PhoneShell>
      <StatusBar />
      <HomeTopBar />
      <ContentArea withBottomNav className="space-y-5">
        <section className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-950">
              Hola, {user?.name?.split(" ")[0] ?? "viajero"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Reserva tu salida en segundos.
            </p>
          </div>
          <Link
            href="/trips"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1E5BFF] text-white shadow-[0_12px_28px_rgba(30,91,255,0.28)]"
            aria-label="Viajar ahora"
          >
            <Send className="size-5" />
          </Link>
        </section>

        {route ? (
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Rutas
                </p>
                <h2 className="text-lg font-black text-slate-950">
                  Elige tu direccion
                </h2>
              </div>
              <Link href="/trips" className="text-xs font-black text-[#1E5BFF]">
                Ver todo
              </Link>
            </div>
            <RouteCard
              direction={RouteDirection.CUSCO_TO_COLQUEPATA}
              activeTrips={tripCountByDirection.CUSCO_TO_COLQUEPATA}
              fare={route.farePen}
              variant="blue"
            />
            <RouteCard
              direction={RouteDirection.COLQUEPATA_TO_CUSCO}
              activeTrips={tripCountByDirection.COLQUEPATA_TO_CUSCO}
              fare={route.farePen}
              variant="red"
            />
          </section>
        ) : (
          <section className="rounded-[18px] bg-white p-5 text-center shadow-sm">
            <p className="text-lg font-black">Aun no hay rutas activas</p>
            <p className="mt-2 text-sm text-slate-500">
              Crea la ruta y sus puntos desde la base de datos o ejecuta el
              seed.
            </p>
          </section>
        )}
      </ContentArea>
      <BottomNav active="home" />
    </PhoneShell>
  );
}
