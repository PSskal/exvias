import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ReceiptText,
  Route,
} from "lucide-react";
import { BookingStatus, TripStatus } from "@/lib/generated/prisma/client";
import {
  formatDate,
  formatPen,
  formatTime,
  getVehicleOption,
  passengerReservationStatus,
  routeDirectionLabels,
} from "@/lib/exvias/constants";
import { listBookingsForUser } from "@/lib/exvias/trips";
import { getCurrentUser } from "@/lib/session";
import {
  AppCard,
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
} from "@/components/exvias/mobile-shell";
import { StatusBadge } from "@/components/exvias/status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type BookingItem = Awaited<ReturnType<typeof listBookingsForUser>>[number];

const closedBookingStatuses: BookingStatus[] = [
  BookingStatus.BOARDED,
  BookingStatus.NO_SHOW,
  BookingStatus.CANCELLED,
];
const closedTripStatuses: TripStatus[] = [
  TripStatus.COMPLETED,
  TripStatus.CANCELLED,
];

function isPastBooking(booking: BookingItem) {
  return (
    closedBookingStatuses.includes(booking.status) ||
    closedTripStatuses.includes(booking.trip.status)
  );
}

export default async function MyTripsPage() {
  const user = await getCurrentUser();
  const bookings = user ? await listBookingsForUser(user.id) : [];
  const nextBookings = bookings.filter((booking) => !isPastBooking(booking));
  const pastBookings = bookings.filter(isPastBooking);

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader title="Mis viajes" subtitle="Reservas y seguimiento" />
      <ContentArea withBottomNav className="space-y-5">
        <section className="grid grid-cols-3 gap-2">
          <SummaryBox label="Próximos" value={String(nextBookings.length)} />
          <SummaryBox label="Historial" value={String(pastBookings.length)} />
          <SummaryBox label="Total" value={String(bookings.length)} />
        </section>

        {!user ? (
          <AppCard className="text-center">
            <p className="font-black">Inicia sesión para ver tus viajes</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Tus reservas y pagos aparecerán en esta pantalla.
            </p>
            <Button asChild className="mt-4 h-11 rounded-[12px] bg-[#1E5BFF] font-black">
              <Link href="/login?callbackURL=/my-trips">Entrar a mi cuenta</Link>
            </Button>
          </AppCard>
        ) : null}

        {user ? (
          <section className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  En curso
                </p>
                <h2 className="text-lg font-black">Próximos viajes</h2>
              </div>
              <Link href="/trips" className="text-xs font-black text-[#1E5BFF]">
                Reservar
              </Link>
            </div>

            {nextBookings.length > 0 ? (
              nextBookings.map((booking) => (
                <TripBookingCard key={booking.id} booking={booking} />
              ))
            ) : (
              <AppCard className="text-center">
                <p className="font-black">No tienes viajes reservados</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Elige una ruta para ver turnos disponibles.
                </p>
                <Button asChild className="mt-4 h-11 rounded-[12px] bg-[#1E5BFF] font-black">
                  <Link href="/trips">Buscar turno</Link>
                </Button>
              </AppCard>
            )}
          </section>
        ) : null}

        {pastBookings.length > 0 ? (
          <section className="space-y-3">
            <div className="px-1">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Cerrados
              </p>
              <h2 className="text-lg font-black">Historial</h2>
            </div>
            {pastBookings.map((booking) => (
              <HistoryRow key={booking.id} booking={booking} />
            ))}
          </section>
        ) : null}
      </ContentArea>
      <BottomNav active="my" />
    </PhoneShell>
  );
}

function TripBookingCard({ booking }: { booking: BookingItem }) {
  const status = passengerReservationStatus({
    bookingStatus: booking.status,
    paymentStatus: booking.payment?.status,
  });
  const driver = booking.trip.driver;
  const vehicle = getVehicleOption(driver?.vehicleName);
  const pickupTime = booking.trip.plannedDepartureAt
    ? new Date(
        booking.trip.plannedDepartureAt.getTime() +
          booking.boardingPoint.minuteOffset * 60_000,
      )
    : null;
  const paidAmount = Number(booking.payment?.amountPen ?? 0);
  const dueOnBoarding = Math.max(0, Number(booking.trip.route.farePen) - paidAmount);

  return (
    <AppCard className="overflow-hidden p-0">
      <div className="relative h-28 bg-gradient-to-b from-slate-100 to-white">
        <Image
          src={vehicle.image}
          alt={vehicle.name}
          fill
          sizes="420px"
          className="object-contain p-2"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge value={booking.payment?.status ?? booking.status} />
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-[#073FEA]">
              {routeDirectionLabels[booking.trip.direction]}
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {status.label}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500">
              {status.description}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F5F7FA] px-3 py-1 text-xs font-black text-slate-500">
            Asiento {booking.seatNumber}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TripFact icon={<CalendarDays className="size-4" />} label="Fecha">
            {formatDate(booking.trip.plannedDepartureAt)}
          </TripFact>
          <TripFact icon={<Clock3 className="size-4" />} label="Paso aprox.">
            {formatTime(pickupTime)}
          </TripFact>
          <TripFact icon={<MapPin className="size-4" />} label="Subida">
            {booking.boardingPoint.name}
          </TripFact>
          <TripFact icon={<ReceiptText className="size-4" />} label="Al abordar">
            {formatPen(dueOnBoarding)}
          </TripFact>
        </div>

        <div className="rounded-[14px] bg-[#F5F7FA] p-3">
          <p className="text-xs font-bold text-slate-500">Conductor</p>
          <p className="mt-1 truncate text-sm font-black">
            {driver?.user.name ?? "Por asignar"}
          </p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {driver
              ? `${vehicle.shortName} · ${driver.licensePlate ?? "Placa pendiente"}`
              : "EXVIASS asignará el vehículo"}
          </p>
        </div>

        <Button asChild className="h-11 w-full rounded-[13px] bg-[#1E5BFF] font-black">
          <Link href={`/tracking/${booking.id}`}>Ver seguimiento</Link>
        </Button>
      </div>
    </AppCard>
  );
}

function HistoryRow({ booking }: { booking: BookingItem }) {
  const status = passengerReservationStatus({
    bookingStatus: booking.status,
    paymentStatus: booking.payment?.status,
  });

  return (
    <Link
      href={`/tracking/${booking.id}`}
      className="flex items-center justify-between gap-3 rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
    >
      <div className="min-w-0">
        <p className="truncate font-black">
          {routeDirectionLabels[booking.trip.direction]}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Route className="size-3.5" />
          {formatDate(booking.trip.plannedDepartureAt)} · {status.label}
        </p>
      </div>
      <CheckCircle2 className="size-5 shrink-0 text-slate-300" />
    </Link>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white p-3 text-center shadow-sm ring-1 ring-slate-200/70">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function TripFact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[14px] bg-[#F5F7FA] p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">
        {children}
      </p>
    </div>
  );
}
