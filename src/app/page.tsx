import Link from "next/link";
import { CalendarClock, Send, ShieldCheck } from "lucide-react";
import { RouteDirection } from "@/lib/generated/prisma/client";
import { getRoutesOverview } from "@/lib/exvias/routes";
import { getCurrentUser } from "@/lib/session";
import {
  BottomNav,
  ContentArea,
  HomeTopBar,
  PhoneShell,
  StatusBar,
  AppCard,
} from "@/components/exvias/mobile-shell";
import { RouteCard } from "@/components/exvias/route-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [routes, user] = await Promise.all([getRoutesOverview(), getCurrentUser()]);
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
        <section>
          <p className="text-2xl font-black tracking-tight">
            ¡Hola, {user?.name?.split(" ")[0] ?? "viajero"}!
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            ¿A dónde quieres ir hoy?
          </p>
        </section>

        <AppCard className="bg-[#073FEA] text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/70">
                Salidas compartidas
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight">
                Reserva tu asiento en pocos pasos
              </h1>
              <p className="mt-2 text-sm font-semibold text-white/75">
                Adelanta el 50% por Yape y paga el resto al subir.
              </p>
            </div>
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/15">
              <ShieldCheck className="size-9" />
            </div>
          </div>
        </AppCard>

        {route ? (
          <section className="space-y-4">
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
          <section className="rounded-[10px] bg-white p-5 text-center shadow-sm">
            <p className="text-lg font-black">Aún no hay rutas activas</p>
            <p className="mt-2 text-sm text-slate-500">
              Crea la ruta y sus puntos desde la base de datos o ejecuta el seed.
            </p>
          </section>
        )}

        <section className="grid gap-3">
          <Link
            href="/trips"
            className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#073FEA] text-sm font-black text-white shadow-[0_12px_28px_rgba(30,91,255,0.28)]"
          >
            Viajar ahora <Send className="size-4" />
          </Link>
          <Link
            href="/my-trips"
            className="flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#073FEA]/25 bg-white text-sm font-black text-[#073FEA]"
          >
            Mis viajes <CalendarClock className="size-4" />
          </Link>
        </section>

        <div className="grid grid-cols-3 gap-2 text-center">
          {["Seguro", "Puntual", "Confiable"].map((item) => (
            <div key={item} className="rounded-[12px] bg-white px-2 py-3 text-xs font-black text-slate-700 shadow-sm">
              {item}
            </div>
          ))}
        </div>
      </ContentArea>
      <BottomNav active="home" />
    </PhoneShell>
  );
}
