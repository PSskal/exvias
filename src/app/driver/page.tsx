import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Minus,
  Phone,
  Plus,
  Route,
  UserCheck,
  UserX,
  UsersRound,
} from "lucide-react";
import {
  approvePaymentAction,
  enterOwnDriverQueueAction,
  joinOwnDriverQueueAction,
  rejectPaymentAction,
  updateDriverBookingStatusAction,
  updateDriverTripStatusAction,
  updateManualSeatsAction,
} from "@/app/actions";
import {
  BookingStatus,
  PaymentStatus,
  RouteDirection,
  TripStatus,
} from "@/lib/generated/prisma/client";
import {
  formatPen,
  formatTime,
  getVehicleOption,
  routeDirectionLabels,
} from "@/lib/exvias/constants";
import { getDriverDashboard } from "@/lib/exvias/trips";
import { getCurrentUser } from "@/lib/session";
import {
  AppCard,
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
} from "@/components/exvias/mobile-shell";
import { PageToast } from "@/components/exvias/page-toast";
import { StatusBadge } from "@/components/exvias/status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type DriverDashboard = NonNullable<Awaited<ReturnType<typeof getDriverDashboard>>>;
type DriverTrip = DriverDashboard["trips"][number];
type DriverBooking = DriverTrip["bookings"][number];

function oppositeDirection(direction: RouteDirection) {
  return direction === RouteDirection.CUSCO_TO_COLQUEPATA
    ? RouteDirection.COLQUEPATA_TO_CUSCO
    : RouteDirection.CUSCO_TO_COLQUEPATA;
}

function DriverInfoRow({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-[#F5F7FA] p-2.5">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1E5BFF]/10 text-[#073FEA]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-xs font-black text-slate-950">{primary}</p>
        <p className="truncate text-xs font-semibold text-slate-500">
          {secondary}
        </p>
      </div>
    </div>
  );
}

export default async function DriverPage({
  searchParams,
}: {
  searchParams: Promise<{ settings?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/driver");

  const dashboard = await getDriverDashboard(user.id);

  if (!dashboard) {
    return (
      <PhoneShell>
        <StatusBar />
        <BlueHeader title="Conductor" subtitle="Panel EXVIASS" />
        <ContentArea className="space-y-4">
          <AppCard className="text-center">
            <p className="text-lg font-black">No tienes perfil de conductor</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Pide al administrador que active tu perfil para ver pasajeros y pagos.
            </p>
            <Link
              href="/account"
              className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-[#1E5BFF] px-5 text-sm font-black text-white"
            >
              Volver a mi cuenta
            </Link>
          </AppCard>
        </ContentArea>
      </PhoneShell>
    );
  }

  const { driver, trips } = dashboard;
  const waitingQueue = dashboard.queueEntries[0];
  const currentTrip =
    trips.find((trip) => trip.status !== TripStatus.QUEUED) ?? trips[0];
  const nextTrips = currentTrip
    ? trips.filter((trip) => trip.id !== currentTrip.id)
    : [];
  const selectedVehicle = getVehicleOption(driver.vehicleName);

  return (
    <PhoneShell>
      <StatusBar />
      <PageToast type={params.settings === "saved" ? "settingsSaved" : null} />
      <BlueHeader title="Conductor" subtitle="Operación del día" href="/account" />
      <ContentArea withBottomNav className="space-y-4">
        <AppCard className="overflow-hidden bg-white p-0">
          <div className="relative bg-[#073FEA] px-4 pb-12 pt-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-white/70">
                  Conductor activo
                </p>
                <h1 className="mt-0.5 truncate text-xl font-black">
                  {driver.user.name}
                </h1>
                <p className="mt-0.5 truncate text-xs font-bold text-white/70">
                  {selectedVehicle.shortName} · Placa{" "}
                  {driver.licensePlate ?? "pendiente"}
                </p>
              </div>
              <span className="rounded-full bg-white/14 px-2.5 py-1 text-[11px] font-black text-white ring-1 ring-white/20">
                En línea
              </span>
            </div>
            <div className="absolute -bottom-6 right-1 h-20 w-36">
              <Image
                src={selectedVehicle.image}
                alt={selectedVehicle.name}
                fill
                sizes="144px"
                className="object-contain drop-shadow-[0_18px_24px_rgba(2,6,23,0.22)]"
                priority
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-8">
            <DriverInfoRow
              icon={<CreditCard className="size-4" />}
              label="Yape de cobro"
              primary={driver.yapePhone ?? "Pendiente"}
              secondary={driver.yapeName ?? "Titular pendiente"}
            />
            <DriverInfoRow
              icon={<Phone className="size-4" />}
              label="Llamadas"
              primary={driver.phone ?? driver.yapePhone ?? "Pendiente"}
              secondary="Contacto visible para pasajeros"
            />
          </div>
        </AppCard>

        {!currentTrip ? (
          waitingQueue ? (
            <QueueStatusCard queueEntry={waitingQueue} />
          ) : (
            <JoinQueueCard
              routes={dashboard.routes}
              driverActive={driver.isActive}
              preferredDirection={
                dashboard.lastClosedTrip
                  ? oppositeDirection(dashboard.lastClosedTrip.direction)
                  : undefined
              }
            />
          )
        ) : (
          <>
            <CurrentTripCard trip={currentTrip} />
            <PassengerList trip={currentTrip} />
          </>
        )}

        {nextTrips.length > 0 ? (
          <section className="space-y-3">
            <p className="px-1 text-sm font-black text-slate-950">
              Otros turnos asignados
            </p>
            {nextTrips.map((trip) => (
              <AppCard key={trip.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black">
                      {routeDirectionLabels[trip.direction]}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatTime(trip.plannedDepartureAt)} ·{" "}
                      {trip.bookedSeats + trip.manualSeats}/{trip.route.capacity}{" "}
                      pasajeros
                    </p>
                  </div>
                  <StatusBadge value={trip.status} />
                </div>
              </AppCard>
            ))}
          </section>
        ) : null}
      </ContentArea>
      <BottomNav active="my" />
    </PhoneShell>
  );
}

function QueueStatusCard({
  queueEntry,
}: {
  queueEntry: DriverDashboard["queueEntries"][number];
}) {
  const canPublish = queueEntry.position === 1;

  return (
    <AppCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#1E5BFF]">
            Estoy en rampa
          </p>
          <h2 className="mt-1 text-lg font-black">
            {routeDirectionLabels[queueEntry.direction]}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Publica tu turno cuando estés listo para recibir pasajeros.
          </p>
        </div>
        <span className="grid size-11 place-items-center rounded-full bg-[#F4B400]/15 text-sm font-black text-[#8a6500]">
          #{queueEntry.position}
        </span>
      </div>
      <p className="rounded-[12px] bg-[#F5F7FA] p-3 text-xs font-semibold text-slate-500">
        {canPublish
          ? "Estás primero en la rampa. Publica tu turno para que aparezca a los pasajeros."
          : "Ya estás en la rampa. Espera a que salgan los conductores que están delante."}
      </p>
      <form action={joinOwnDriverQueueAction}>
        <input type="hidden" name="routeId" value={queueEntry.routeId} />
        <input type="hidden" name="direction" value={queueEntry.direction} />
        <Button
          disabled={!canPublish}
          className="h-12 w-full rounded-[14px] bg-[#1E5BFF] font-black hover:bg-[#174de0]"
        >
          {canPublish ? "Publicar mi turno" : "Esperando mi turno"}
        </Button>
      </form>
    </AppCard>
  );
}

function JoinQueueCard({
  routes,
  driverActive,
  preferredDirection,
}: {
  routes: DriverDashboard["routes"];
  driverActive: boolean;
  preferredDirection?: RouteDirection;
}) {
  const route = routes[0];
  const directions = Object.values(RouteDirection).sort((direction) =>
    direction === preferredDirection ? -1 : 1,
  );

  return (
    <AppCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#1E5BFF]">
          Sin turno ni rampa
        </p>
        <h2 className="mt-1 text-lg font-black">Entrar a rampa</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Elige la rampa donde estás físicamente. El regreso se muestra primero.
        </p>
      </div>

      {!driverActive ? (
        <p className="rounded-[12px] bg-[#E53935]/10 p-3 text-sm font-bold text-[#E53935]">
          Tu perfil no está habilitado. Pide al admin que lo active.
        </p>
      ) : route ? (
        <div className="grid gap-2">
          {directions.map((direction) => {
            const isPreferred = direction === preferredDirection;

            return (
              <form key={direction} action={enterOwnDriverQueueAction}>
                <input type="hidden" name="routeId" value={route.id} />
                <input type="hidden" name="direction" value={direction} />
                <Button
                  className={
                    isPreferred
                      ? "h-14 w-full flex-col rounded-[14px] bg-[#2ECC71] font-black text-white hover:bg-[#29b866]"
                      : "h-14 w-full flex-col rounded-[14px] bg-[#1E5BFF]/10 font-black text-[#1E5BFF] hover:bg-[#1E5BFF]/15"
                  }
                >
                  <span>
                    {isPreferred ? "Entrar a rampa de regreso" : "Entrar a esta rampa"}
                  </span>
                  <span className="text-[11px] font-bold opacity-80">
                    {routeDirectionLabels[direction]}
                  </span>
                </Button>
              </form>
            );
          })}
        </div>
      ) : (
        <p className="rounded-[12px] bg-[#F5F7FA] p-3 text-sm font-semibold text-slate-500">
          No hay ruta activa para entrar a cola.
        </p>
      )}
    </AppCard>
  );
}

function CurrentTripCard({ trip }: { trip: DriverTrip }) {
  const occupied = trip.bookedSeats + trip.manualSeats;
  const remainingSeats = Math.max(0, trip.route.capacity - occupied);
  const missingPassengers = Math.max(
    0,
    trip.route.minimumToStart - occupied,
  );
  const canDepart = missingPassengers === 0 || trip.adminOverride;
  const isQueued = trip.status === TripStatus.QUEUED;
  const canAdjustManualSeats =
    trip.status === TripStatus.ACTIVE || trip.status === TripStatus.BOARDING;

  return (
    <AppCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[#1E5BFF]">
            {isQueued ? "Mi turno en cola" : "Mi turno actual"}
          </p>
          <h2 className="mt-1 truncate text-xl font-black">
            {routeDirectionLabels[trip.direction]}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <Clock3 className="size-4" />
            Salida {formatTime(trip.plannedDepartureAt)}
          </p>
        </div>
        <StatusBadge value={trip.status} />
      </div>

      {isQueued ? (
        <div className="rounded-[14px] bg-[#F4B400]/12 p-3">
          <p className="text-sm font-black text-[#8a6500]">
            Espera tu turno en rampa.
          </p>
          <p className="mt-1 text-xs font-semibold text-[#8a6500]/80">
            El viaje ya está publicado para pasajeros, pero aún no está en
            embarque.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Metric icon={<UsersRound className="size-4" />} label="Pasajeros">
          {occupied}/{trip.route.capacity}
        </Metric>
        <Metric icon={<Route className="size-4" />} label="Mínimo">
          {trip.route.minimumToStart} pasajeros
        </Metric>
      </div>

      <div className="rounded-[16px] bg-[#F5F7FA] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">
              Pasajeros en terminal
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              No usan la app, pero ocupan asiento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ManualSeatsButton
              tripId={trip.id}
              delta={-1}
              disabled={!canAdjustManualSeats || trip.manualSeats <= 0}
              label="Reducir pasajero en terminal"
            >
              <Minus className="size-4" />
            </ManualSeatsButton>
            <span className="grid h-10 min-w-10 place-items-center rounded-full bg-white px-3 text-base font-black text-slate-950 shadow-sm ring-1 ring-slate-200">
              {trip.manualSeats}
            </span>
            <ManualSeatsButton
              tripId={trip.id}
              delta={1}
              disabled={!canAdjustManualSeats || remainingSeats <= 0}
              label="Agregar pasajero en terminal"
            >
              <Plus className="size-4" />
            </ManualSeatsButton>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Reservas por app: {trip.bookedSeats}. Libres: {remainingSeats}.
        </p>
      </div>

      <div className="grid gap-2">
        {trip.status === TripStatus.ACTIVE ? (
          <TripStatusButton
            tripId={trip.id}
            status={TripStatus.BOARDING}
            className="bg-[#1E5BFF] hover:bg-[#174de0]"
          >
            Iniciar embarque
          </TripStatusButton>
        ) : null}

        {trip.status === TripStatus.ACTIVE ||
        trip.status === TripStatus.BOARDING ? (
          <>
            <TripStatusButton
              tripId={trip.id}
              status={TripStatus.DEPARTED}
              disabled={!canDepart}
              className="bg-[#2ECC71] text-white hover:bg-[#29b866]"
            >
              Salir ahora
            </TripStatusButton>
            {!canDepart ? (
              <p className="text-center text-xs font-semibold text-[#E53935]">
                Faltan {missingPassengers} pasajeros para salir sin autorización.
              </p>
            ) : null}
          </>
        ) : null}

        {trip.status === TripStatus.DEPARTED ? (
          <TripStatusButton
            tripId={trip.id}
            status={TripStatus.COMPLETED}
            className="bg-[#1E5BFF] hover:bg-[#174de0]"
          >
            Finalizar viaje
          </TripStatusButton>
        ) : null}
      </div>
    </AppCard>
  );
}

function PassengerList({ trip }: { trip: DriverTrip }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-black text-slate-950">Reservas por app</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          {trip.bookings.length}
        </span>
      </div>

      {trip.bookings.length === 0 ? (
        <AppCard>
          <p className="text-sm font-semibold text-slate-500">
            Aún no hay pasajeros en este turno.
          </p>
        </AppCard>
      ) : (
        trip.bookings.map((booking) => (
          <PassengerCard
            key={booking.id}
            booking={booking}
            dueOnBoarding={Number(trip.route.farePen) - Number(trip.route.depositPen)}
          />
        ))
      )}
    </section>
  );
}

function PassengerCard({
  booking,
  dueOnBoarding,
}: {
  booking: DriverBooking;
  dueOnBoarding: number;
}) {
  const paymentApproved = booking.payment?.status === PaymentStatus.APPROVED;
  const bookingClosed =
    booking.status === BookingStatus.BOARDED ||
    booking.status === BookingStatus.NO_SHOW;
  const canMarkBoarded = paymentApproved && !bookingClosed;

  return (
    <AppCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">{booking.passengerName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <MapPin className="size-3.5" />
            {booking.boardingPoint.name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Phone className="size-3.5" />
            {booking.passengerPhone}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#1E5BFF]/10 text-sm font-black text-[#1E5BFF]">
            {booking.seatNumber}
          </span>
          <StatusBadge value={booking.status} className="mt-2" />
        </div>
      </div>

      <div className="rounded-[14px] bg-[#F5F7FA] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-black">
            <CreditCard className="size-4 text-[#F4B400]" />
            Adelanto {booking.payment ? formatPen(booking.payment.amountPen) : "--"}
          </p>
          {booking.payment ? <StatusBadge value={booking.payment.status} /> : null}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Captura: {booking.payment?.proofUrl ?? "Pendiente"}
        </p>

        {booking.payment?.status === PaymentStatus.SUBMITTED ? (
          <div className="mt-3 grid gap-2">
            <form action={approvePaymentAction}>
              <input type="hidden" name="paymentId" value={booking.payment.id} />
              <Button className="h-10 w-full rounded-[12px] bg-[#2ECC71] font-black hover:bg-[#29b866]">
                <CheckCircle2 className="size-4" />
                Confirmar Yape recibido
              </Button>
            </form>
            <form action={rejectPaymentAction}>
              <input type="hidden" name="paymentId" value={booking.payment.id} />
              <input
                type="hidden"
                name="reason"
                value="Comprobante no válido o pago no recibido"
              />
              <Button
                variant="outline"
                className="h-10 w-full rounded-[12px] border-[#E53935]/40 font-black text-[#E53935] hover:bg-[#E53935]/10 hover:text-[#E53935]"
              >
                <UserX className="size-4" />
                Rechazar comprobante
              </Button>
            </form>
          </div>
        ) : null}

        {paymentApproved ? (
          <p className="mt-3 rounded-[10px] bg-white p-2 text-xs font-bold text-slate-600">
            Cobra al abordar: {formatPen(dueOnBoarding)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <BookingStatusButton
          bookingId={booking.id}
          status={BookingStatus.BOARDED}
          disabled={!canMarkBoarded}
          className="bg-[#1E5BFF] hover:bg-[#174de0]"
        >
          <UserCheck className="size-4" />
          Abordó
        </BookingStatusButton>
        <BookingStatusButton
          bookingId={booking.id}
          status={BookingStatus.NO_SHOW}
          disabled={bookingClosed}
          className="bg-[#E53935] hover:bg-[#d12f2f]"
        >
          <UserX className="size-4" />
          No vino
        </BookingStatusButton>
      </div>

      {!paymentApproved && booking.status !== BookingStatus.NO_SHOW ? (
        <p className="text-center text-xs font-semibold text-slate-500">
          Para marcar abordó, primero confirma el Yape.
        </p>
      ) : null}
    </AppCard>
  );
}

function TripStatusButton({
  tripId,
  status,
  children,
  className,
  disabled,
}: {
  tripId: string;
  status: TripStatus;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <form action={updateDriverTripStatusAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="status" value={status} />
      <Button
        disabled={disabled}
        className={`h-12 w-full rounded-[14px] font-black ${className ?? ""}`}
      >
        {children}
      </Button>
    </form>
  );
}

function ManualSeatsButton({
  tripId,
  delta,
  children,
  disabled,
  label,
}: {
  tripId: string;
  delta: -1 | 1;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
}) {
  return (
    <form action={updateManualSeatsAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="delta" value={delta} />
      <Button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="size-10 rounded-full bg-white p-0 text-slate-950 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
      >
        {children}
      </Button>
    </form>
  );
}

function BookingStatusButton({
  bookingId,
  status,
  children,
  className,
  disabled,
}: {
  bookingId: string;
  status: BookingStatus;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <form action={updateDriverBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="status" value={status} />
      <Button
        disabled={disabled}
        className={`h-11 w-full rounded-[13px] font-black ${className ?? ""}`}
      >
        {children}
      </Button>
    </form>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] bg-[#F5F7FA] p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-black">{children}</p>
    </div>
  );
}
