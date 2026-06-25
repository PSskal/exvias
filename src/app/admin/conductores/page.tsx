import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import {
  ArrowLeft,
  Ban,
  CarFront,
  CheckCircle2,
  Clock3,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  activateDriverProfileAction,
  cancelDriverCurrentTripAction,
  reassignDriverCurrentTripAction,
  suspendDriverAfterTripAction,
  updateDriverActiveStateAction,
} from "@/app/actions";
import { getVehicleOption } from "@/lib/exvias/constants";
import { getAdminDashboard } from "@/lib/exvias/trips";
import { TripStatus } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageToast } from "@/components/exvias/page-toast";

export const dynamic = "force-dynamic";

type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
type AdminDriver = AdminDashboard["drivers"][number];
type AdminTrip = AdminDashboard["trips"][number];

const operativeStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  TripStatus.ACTIVE,
  TripStatus.BOARDING,
  TripStatus.DEPARTED,
];

const adminToastTypes = [
  "driverEnabled",
  "driverDisabled",
  "driverReenabled",
  "driverBusy",
  "driverSuspendAfterTrip",
  "driverTripCancelled",
  "driverTripReassigned",
  "driverReassignBlocked",
] as const;

function getAdminToastType(value?: string) {
  return adminToastTypes.find((type) => type === value) ?? null;
}

export default async function AdminDriversPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/admin/conductores");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") redirect("/account");

  const { trips, drivers, users } = await getAdminDashboard();
  const passengerUsers = users.filter((item) => !item.driverProfile);
  const activeTripByDriverId = new Map(
    trips
      .filter((trip) => trip.driverId && operativeStatuses.includes(trip.status))
      .map((trip) => [trip.driverId!, trip]),
  );
  const assignedDriverIds = new Set(activeTripByDriverId.keys());
  const replacementDrivers = drivers.filter(
    (driver) => driver.isActive && !assignedDriverIds.has(driver.id),
  );
  const activeDrivers = drivers.filter((driver) => driver.isActive);
  const suspendedDrivers = drivers.filter((driver) => driver.suspendAfterTrip);
  const incompleteDrivers = drivers.filter((driver) => !isDriverProfileComplete(driver));

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 pb-10 pt-5 text-zinc-950 sm:px-6">
      <PageToast type={getAdminToastType(params.admin)} />
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-sm font-black text-[#1E5BFF]"
              >
                <ArrowLeft className="size-4" />
                Volver a operaciones
              </Link>
              <p className="mt-4 text-sm font-semibold text-[#1E5BFF]">
                EXVIASS S.A.
              </p>
              <h1 className="text-3xl font-black tracking-tight">
                Conductores
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-500">
                Habilita cuentas, revisa datos pendientes y gestiona sanciones
                sin mezclarlo con la operación diaria de rampa.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <AdminTab href="/admin" label="Resumen" />
              <AdminTab href="/admin/schedule" label="Rampa" />
              <AdminTab href="/admin/conductores" label="Conductores" active />
            </nav>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<UsersRound className="size-4" />}
              label="Conductores"
              value={String(drivers.length)}
            />
            <MetricCard
              icon={<CheckCircle2 className="size-4" />}
              label="Activos"
              value={String(activeDrivers.length)}
            />
            <MetricCard
              icon={<Clock3 className="size-4" />}
              label="Con turno"
              value={String(assignedDriverIds.size)}
            />
            <MetricCard
              icon={<Ban className="size-4" />}
              label="Suspensión"
              value={String(suspendedDrivers.length)}
            />
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <section className="space-y-5">
            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-[#1E5BFF]" />
                  Habilitar conductor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={activateDriverProfileAction} className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-500">
                    El usuario debe haber creado cuenta antes. Luego completa
                    vehículo, placa, Yape y teléfono desde su configuración.
                  </p>
                  <select
                    name="userId"
                    disabled={passengerUsers.length === 0}
                    className="h-11 w-full rounded-[8px] border bg-white px-3 text-sm font-semibold"
                  >
                    {passengerUsers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.email}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-11 w-full rounded-[8px] bg-[#1E5BFF] font-black hover:bg-[#174de0]"
                    disabled={passengerUsers.length === 0}
                  >
                    Habilitar conductor
                  </Button>
                  {passengerUsers.length === 0 ? (
                    <p className="rounded-[8px] bg-zinc-50 p-3 text-xs font-semibold text-zinc-500">
                      No hay cuentas de pasajero disponibles para habilitar.
                    </p>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Datos pendientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incompleteDrivers.length === 0 ? (
                  <p className="rounded-[8px] bg-zinc-50 p-3 text-sm font-semibold text-zinc-500">
                    Todos los conductores tienen datos completos.
                  </p>
                ) : (
                  incompleteDrivers.map((driver) => (
                    <SmallDriverRow key={driver.id} driver={driver} />
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Lista operativa</h2>
                <p className="text-sm font-semibold text-zinc-500">
                  Los controles críticos aparecen solo cuando corresponde.
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {drivers.length === 0 ? (
                <Card className="rounded-[8px] lg:col-span-2">
                  <CardContent>
                    <p className="text-sm font-semibold text-zinc-500">
                      Todavía no hay conductores registrados.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                drivers.map((driver) => (
                  <DriverAdminCard
                    key={driver.id}
                    driver={driver}
                    activeTrip={activeTripByDriverId.get(driver.id)}
                    replacementDrivers={replacementDrivers.filter(
                      (replacement) => replacement.id !== driver.id,
                    )}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function AdminTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex h-10 items-center rounded-[8px] bg-[#1E5BFF] px-4 text-sm font-black text-white"
          : "inline-flex h-10 items-center rounded-[8px] bg-white px-4 text-sm font-black text-zinc-600 ring-1 ring-zinc-200"
      }
    >
      {label}
    </Link>
  );
}

function isDriverProfileComplete(driver: AdminDriver) {
  return Boolean(
    driver.phone &&
      driver.yapePhone &&
      driver.yapeName &&
      driver.licensePlate &&
      driver.vehicleName,
  );
}

function DriverAdminCard({
  driver,
  activeTrip,
  replacementDrivers,
}: {
  driver: AdminDriver;
  activeTrip?: AdminTrip;
  replacementDrivers: AdminDriver[];
}) {
  const vehicle = getVehicleOption(driver.vehicleName);
  const isComplete = isDriverProfileComplete(driver);
  const activeBookings =
    activeTrip?.bookings.filter((booking) => booking.status !== "CANCELLED") ??
    [];

  return (
    <Card className="rounded-[8px]" size="sm">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black">{driver.user.name}</p>
            <p className="truncate text-xs font-semibold text-zinc-500">
              {driver.user.email}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
              <CarFront className="size-3.5" />
              {driver.vehicleName
                ? `${vehicle.shortName} · ${driver.licensePlate ?? "Placa pendiente"}`
                : "Vehículo pendiente"}
            </p>
          </div>
          <DriverStatePill driver={driver} />
        </div>

        <div className="rounded-[8px] bg-[#F5F7FA] p-3 text-xs font-semibold text-zinc-500">
          {activeTrip ? (
            <>
              Turno publicado:{" "}
              <span className="font-black text-zinc-950">
                {activeTrip.turnLabel}
              </span>{" "}
              · {activeBookings.length}/{activeTrip.route.capacity} reservas
            </>
          ) : isComplete ? (
            "Datos completos. Puede entrar a rampa."
          ) : (
            "Pendiente: debe completar teléfono, Yape, vehículo y placa."
          )}
        </div>

        {!activeTrip ? (
          <form action={updateDriverActiveStateAction}>
            <input type="hidden" name="driverId" value={driver.id} />
            <input
              type="hidden"
              name="isActive"
              value={driver.isActive ? "false" : "true"}
            />
            <Button
              variant={driver.isActive ? "outline" : "default"}
              className="h-9 w-full rounded-[8px]"
            >
              {driver.isActive ? "Deshabilitar" : "Rehabilitar"}
            </Button>
          </form>
        ) : (
          <DriverTripAdminActions
            driver={driver}
            activeTrip={activeTrip}
            replacementDrivers={replacementDrivers}
          />
        )}
      </CardContent>
    </Card>
  );
}

function DriverStatePill({ driver }: { driver: AdminDriver }) {
  return (
    <span
      className={
        driver.suspendAfterTrip
          ? "rounded-full bg-[#F4B400]/20 px-2 py-1 text-[11px] font-black text-[#8a6500]"
          : driver.isActive
            ? "rounded-full bg-[#2ECC71]/15 px-2 py-1 text-[11px] font-black text-[#168a43]"
            : "rounded-full bg-zinc-200 px-2 py-1 text-[11px] font-black text-zinc-500"
      }
    >
      {driver.suspendAfterTrip
        ? "Suspensión"
        : driver.isActive
          ? "Activo"
          : "Inactivo"}
    </span>
  );
}

function DriverTripAdminActions({
  driver,
  activeTrip,
  replacementDrivers,
}: {
  driver: AdminDriver;
  activeTrip: AdminTrip;
  replacementDrivers: AdminDriver[];
}) {
  return (
    <div className="space-y-2">
      {!driver.suspendAfterTrip ? (
        <form action={suspendDriverAfterTripAction}>
          <input type="hidden" name="driverId" value={driver.id} />
          <input
            type="hidden"
            name="reason"
            value="Suspensión administrativa al finalizar turno"
          />
          <Button
            variant="outline"
            className="h-9 w-full rounded-[8px] border-[#F4B400]/50 text-[#8a6500] hover:bg-[#F4B400]/10"
          >
            Suspender al terminar
          </Button>
        </form>
      ) : (
        <p className="rounded-[8px] bg-[#F4B400]/12 p-2 text-xs font-bold text-[#8a6500]">
          Se deshabilitará al finalizar este turno.
        </p>
      )}

      <details className="rounded-[8px] bg-[#F5F7FA] p-2">
        <summary className="cursor-pointer text-xs font-black text-[#E53935]">
          Retirar del turno
        </summary>
        <div className="mt-3 space-y-2">
          <form action={cancelDriverCurrentTripAction}>
            <input type="hidden" name="driverId" value={driver.id} />
            <input
              type="hidden"
              name="reason"
              value="Turno cancelado por administración"
            />
            <Button className="h-9 w-full rounded-[8px] bg-[#E53935] text-white hover:bg-[#d12f2f]">
              Cancelar viaje y reservas
            </Button>
          </form>

          <form action={reassignDriverCurrentTripAction} className="space-y-2">
            <input type="hidden" name="driverId" value={driver.id} />
            <input
              type="hidden"
              name="reason"
              value="Conductor retirado y turno reasignado"
            />
            <select
              name="replacementDriverId"
              disabled={replacementDrivers.length === 0}
              className="h-9 w-full rounded-[8px] border bg-white px-2 text-xs"
            >
              {replacementDrivers.map((replacement) => {
                const vehicle = getVehicleOption(replacement.vehicleName);

                return (
                  <option key={replacement.id} value={replacement.id}>
                    {replacement.user.name} · {vehicle.shortName}
                  </option>
                );
              })}
            </select>
            <Button
              variant="outline"
              disabled={replacementDrivers.length === 0}
              className="h-9 w-full rounded-[8px]"
            >
              Reasignar turno
            </Button>
          </form>

          <p className="text-[11px] font-semibold text-zinc-500">
            Turno: {activeTrip.turnLabel}. Si cancelas, las reservas se marcan
            como canceladas; pagos aprobados quedan para devolución manual.
          </p>
        </div>
      </details>
    </div>
  );
}

function SmallDriverRow({ driver }: { driver: AdminDriver }) {
  const missing = [
    !driver.phone ? "teléfono" : null,
    !driver.yapePhone || !driver.yapeName ? "Yape" : null,
    !driver.vehicleName ? "vehículo" : null,
    !driver.licensePlate ? "placa" : null,
  ].filter(Boolean);

  return (
    <div className="rounded-[8px] bg-zinc-50 p-3">
      <p className="font-black">{driver.user.name}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-500">
        Falta: {missing.join(", ")}
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-[8px]" size="sm">
      <CardContent>
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
          {icon}
          {label}
        </p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
