import Image from "next/image";
import { redirect } from "next/navigation";
import {
  CarFront,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { updateOwnDriverSettingsAction } from "@/app/actions";
import { getVehicleOption, vehicleCatalog } from "@/lib/exvias/constants";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  AppCard,
  BlueHeader,
  BottomNav,
  ContentArea,
  PhoneShell,
  StatusBar,
} from "@/components/exvias/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/account/settings");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { driverProfile: true },
  });

  const driver = dbUser?.driverProfile;
  const selectedVehicle = getVehicleOption(driver?.vehicleName);

  return (
    <PhoneShell>
      <StatusBar />
      <BlueHeader title="Configuración" subtitle="Datos de operación" href="/account" />
      <ContentArea withBottomNav className="space-y-4">
        <AppCard className="overflow-hidden bg-[#073FEA] text-white">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15">
              <UserRound className="size-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-white/70">
                Perfil EXVIASS
              </p>
              <h1 className="truncate text-xl font-black">
                {dbUser?.name ?? user.name ?? "Usuario"}
              </h1>
              <p className="mt-1 truncate text-sm font-semibold text-white/75">
                {dbUser?.email ?? user.email}
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard>
          <div className="space-y-3">
            <SettingsFact icon={<Mail className="size-4" />} label="Correo">
              {dbUser?.email ?? user.email}
            </SettingsFact>
            <SettingsFact icon={<ShieldCheck className="size-4" />} label="Estado">
              {driver ? "Conductor habilitado" : "Pasajero"}
            </SettingsFact>
          </div>
        </AppCard>

        {driver ? (
          <form action={updateOwnDriverSettingsAction} className="space-y-4">
            <AppCard className="space-y-4">
              <SectionTitle
                icon={<Phone className="size-4" />}
                title="Contacto"
                detail="Número para llamadas del pasajero"
              />
              <Field>
                <Label htmlFor="phone">Celular de llamadas</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={driver.phone ?? ""}
                  placeholder="Ej. 987654321"
                  className="h-12 rounded-[14px] bg-[#F5F7FA] font-bold"
                />
              </Field>
            </AppCard>

            <AppCard className="space-y-4">
              <SectionTitle
                icon={<CreditCard className="size-4" />}
                title="Yape de cobro"
                detail="Se muestra al pasajero antes de reservar"
              />
              <Field>
                <Label htmlFor="yapeName">Titular del Yape</Label>
                <Input
                  id="yapeName"
                  name="yapeName"
                  defaultValue={driver.yapeName ?? ""}
                  placeholder="Nombre del titular"
                  className="h-12 rounded-[14px] bg-[#F5F7FA] font-bold"
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="yapePhone">Número Yape</Label>
                <Input
                  id="yapePhone"
                  name="yapePhone"
                  defaultValue={driver.yapePhone ?? ""}
                  placeholder="Ej. 987654321"
                  className="h-12 rounded-[14px] bg-[#F5F7FA] font-bold"
                  required
                />
              </Field>
            </AppCard>

            <AppCard className="space-y-4">
              <SectionTitle
                icon={<CarFront className="size-4" />}
                title="Vehículo"
                detail="Datos visibles en turnos y reservas"
              />
              <div className="relative h-36 overflow-hidden rounded-[18px] bg-gradient-to-b from-slate-100 to-white">
                <Image
                  src={selectedVehicle.image}
                  alt={selectedVehicle.name}
                  fill
                  sizes="420px"
                  className="object-contain p-3"
                  priority
                />
              </div>
              <Field>
                <Label htmlFor="vehicleName">Modelo y color</Label>
                <Select
                  name="vehicleName"
                  defaultValue={selectedVehicle.id}
                >
                  <SelectTrigger
                    id="vehicleName"
                    className="h-12 w-full rounded-[14px] border-slate-200 bg-[#F5F7FA] px-3 text-sm font-bold text-slate-700 shadow-none"
                  >
                    <SelectValue placeholder="Selecciona tu vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleCatalog.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="licensePlate">Placa</Label>
                <Input
                  id="licensePlate"
                  name="licensePlate"
                  defaultValue={driver.licensePlate ?? ""}
                  placeholder="Ej. ABC-123"
                  className="h-12 rounded-[14px] bg-[#F5F7FA] font-bold uppercase"
                  required
                />
              </Field>
            </AppCard>

            <Button className="h-12 w-full rounded-[16px] bg-[#1E5BFF] text-base font-black hover:bg-[#174de0]">
              Guardar configuración
            </Button>
          </form>
        ) : (
          <AppCard className="text-center">
            <p className="text-lg font-black">No tienes perfil de conductor</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Cuando el administrador habilite tu perfil, aquí podrás editar tu
              vehículo, Yape y datos de contacto.
            </p>
          </AppCard>
        )}
      </ContentArea>
      <BottomNav active="account" />
    </PhoneShell>
  );
}

function SectionTitle({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-[#1E5BFF]/10 text-[#073FEA]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="font-black">{title}</h2>
        <p className="truncate text-xs font-semibold text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function SettingsFact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="truncate text-sm font-black">{children}</p>
      </div>
    </div>
  );
}
