import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  CarFront,
  ChevronLeft,
  Home,
  Menu,
  UserRound,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export function PhoneShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F5F7FA] px-0 py-0 text-slate-950 sm:grid sm:place-items-start sm:bg-[#E9EEF6] sm:px-6 sm:py-8 lg:py-10">
      <div
        className={cn(
          "relative mx-auto min-h-screen w-full overflow-hidden bg-[#F5F7FA] sm:max-w-[460px] sm:rounded-[18px] sm:shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:ring-1 sm:ring-black/10",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(30,91,255,0.14),transparent_62%)]" />
        {children}
      </div>
    </main>
  );
}

export function StatusBar() {
  return null;
}

export function BrandMark() {
  return (
    <div className="relative h-12 w-36 overflow-visible">
      <Image
        src="/brand/exviass-logo-transparent.png"
        alt="EXVIASS S.A."
        fill
        priority
        sizes="144px"
        className="object-contain"
      />
    </div>
  );
}

export function HomeTopBar() {
  return (
    <div className="relative z-10 flex items-center justify-between px-5 pt-5">
      <Link
        href="/trips"
        className="grid size-11 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/70"
        aria-label="Menu"
      >
        <Menu className="size-5" />
      </Link>
      <BrandMark />
      <Link
        href="/account"
        className="relative grid size-11 place-items-center rounded-full bg-white text-[#0B2E86] shadow-sm ring-1 ring-slate-200/70"
        aria-label="Mi cuenta"
      >
        <UserRound className="size-5" />
        <span className="absolute right-1 top-1 size-3 rounded-full border-2 border-white bg-[#2ECC71]" />
      </Link>
    </div>
  );
}

export function BlueHeader({
  title,
  href = "/",
  action,
  subtitle,
}: {
  title: string;
  href?: string;
  action?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="relative z-10 bg-[#F5F7FA]/92 text-slate-950 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between px-5 py-3">
        <Link href={href} className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/70">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-sm font-black">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="grid size-9 place-items-center">{action}</div>
      </div>
    </div>
  );
}

export async function BottomNav({
  active,
}: {
  active: "home" | "trips" | "my" | "account";
}) {
  const user = await getCurrentUser();
  const driverProfile = user
    ? await prisma.driverProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
    : null;
  const middleItem = driverProfile
    ? { id: "my", label: "Panel", href: "/driver", icon: CarFront }
    : { id: "my", label: "Mis viajes", href: "/my-trips", icon: CalendarDays };
  const items = [
    { id: "home", label: "Inicio", href: "/", icon: Home },
    middleItem,
    { id: "account", label: "Mi cuenta", href: "/account", icon: UserRound },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full px-5 pb-4 sm:absolute sm:max-w-[460px]">
      <div className="grid grid-cols-3 gap-1 rounded-full border border-white/80 bg-white/92 p-1.5 shadow-[0_18px_44px_rgba(30,91,255,0.16)] ring-1 ring-slate-200/70 backdrop-blur">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-full px-2 text-[11px] font-black transition",
                isActive
                  ? "bg-[#1E5BFF] text-white shadow-[0_10px_24px_rgba(30,91,255,0.24)]"
                  : "text-slate-400 hover:bg-[#1E5BFF]/8 hover:text-[#1E5BFF]",
              )}
            >
              <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ContentArea({
  children,
  withBottomNav = false,
  className,
}: {
  children: React.ReactNode;
  withBottomNav?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative z-10 px-5 pt-5", withBottomNav ? "pb-28" : "pb-8", className)}>
      {children}
    </div>
  );
}

export function AppCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-white/80 bg-white p-4 text-slate-950 shadow-[0_14px_36px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
