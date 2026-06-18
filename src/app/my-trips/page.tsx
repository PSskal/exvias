import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { listBookingsForUser } from "@/lib/exvias/trips";
import { getCurrentUser } from "@/lib/session";
import {
  formatDate,
  formatTime,
  passengerReservationStatus,
  routeDirectionLabels,
} from "@/lib/exvias/constants";
import {
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
  AppCard,
} from "@/components/exvias/mobile-shell";
import { StatusBadge } from "@/components/exvias/status-badge";

export const dynamic = "force-dynamic";

export default async function MyTripsPage() {
  const user = await getCurrentUser();
  const bookings = user ? await listBookingsForUser(user.id) : [];
  const nextBookings = bookings.filter((booking) =>
    ["RESERVED", "CONFIRMED", "PAID_PARTIAL", "BOARDED"].includes(booking.status),
  );
  const pastBookings = bookings.filter((booking) =>
    ["NO_SHOW", "CANCELLED"].includes(booking.status),
  );

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader title="Mis viajes" subtitle="Reservas y estado" />
      <ContentArea withBottomNav className="space-y-5">
        <div className="grid grid-cols-2 rounded-[14px] bg-white p-1 text-center text-sm font-black shadow-sm ring-1 ring-slate-200/70">
          <span className="border-b-2 border-[#073FEA] py-3 text-[#073FEA]">Próximos</span>
          <span className="py-3 text-slate-400">Historial</span>
        </div>

        <section className="space-y-3">
          <h2 className="font-black">Próximo viaje</h2>
          {!user ? (
            <AppCard className="text-center">
              <p className="font-black">Inicia sesión para ver tus viajes</p>
              <Link href="/login" className="mt-3 inline-block text-sm font-black text-[#073FEA]">
                Entrar a mi cuenta
              </Link>
            </AppCard>
          ) : nextBookings.length > 0 ? (
            nextBookings.map((booking) => {
              const reservationStatus = passengerReservationStatus({
                bookingStatus: booking.status,
                paymentStatus: booking.payment?.status,
              });

              return (
                <Link
                  key={booking.id}
                  href={`/tracking/${booking.id}`}
                  className="block rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#073FEA]">
                        {routeDirectionLabels[booking.trip.direction]}
                      </p>
                      <p className="mt-1 text-xs font-black text-[#B37B00]">
                        {reservationStatus.label}
                      </p>
                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <TripFact icon={<CalendarDays className="size-4" />}>
                          {formatDate(booking.trip.plannedDepartureAt)}
                        </TripFact>
                        <TripFact icon={<Clock className="size-4" />}>
                          {formatTime(booking.trip.plannedDepartureAt)}
                        </TripFact>
                        <TripFact icon={<MapPin className="size-4" />}>
                          {booking.boardingPoint.name}
                        </TripFact>
                        <TripFact icon={<Users className="size-4" />}>
                          1 pasajero
                        </TripFact>
                      </div>
                    </div>
                    <StatusBadge value={booking.payment?.status ?? booking.status} />
                  </div>
                  <div className="mt-4 rounded-[10px] border border-[#073FEA]/25 py-2 text-center text-sm font-black text-[#073FEA]">
                    Ver detalle
                  </div>
                </Link>
              );
            })
          ) : (
            <AppCard className="text-center">
              <p className="font-black">No tienes viajes reservados</p>
              <Link href="/trips" className="mt-3 inline-block text-sm font-black text-[#073FEA]">
                Buscar turno
              </Link>
            </AppCard>
          )}
        </section>

        {pastBookings.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-black">Viajes anteriores</h2>
            {pastBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/tracking/${booking.id}`}
                className="flex items-center justify-between rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
              >
                <div>
                  <p className="font-black">{routeDirectionLabels[booking.trip.direction]}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(booking.trip.plannedDepartureAt)}
                  </p>
                </div>
                <StatusBadge value={booking.status} />
              </Link>
            ))}
          </section>
        )}
      </ContentArea>
      <BottomNav active="my" />
    </PhoneShell>
  );
}

function TripFact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
