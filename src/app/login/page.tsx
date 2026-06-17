"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, LockKeyhole, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackURL") ?? "/";
  const callbackURL =
    requestedCallback.startsWith("/") && !requestedCallback.startsWith("//")
      ? requestedCallback
      : "/";
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);

    const { error } = await authClient.signIn.email({
      email,
      password: pass,
      callbackURL,
    });

    if (error) {
      setError(traducirError(error.code));
      setLoading(false);
      return;
    }

    window.location.assign(callbackURL);
  }

  async function handleGoogle() {
    setLoadingGoogle(true);
    setError(null);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });

    if (error) {
      setError("No se pudo iniciar sesión con Google. Inténtalo nuevamente.");
      setLoadingGoogle(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F5F7FA] px-5 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-md flex-col">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#073FEA]">
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>

        <div className="mt-10">
          <div className="relative h-24 w-full overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-slate-200/70">
            <Image
              src="/brand/exviass-logo.png"
              alt="EXVIASS S.A."
              fill
              priority
              sizes="(max-width: 480px) 100vw, 420px"
              className="object-contain p-3"
            />
          </div>
          <h1 className="mt-2 text-3xl font-black">Ingresa a tu cuenta</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Reserva tus viajes entre Cusco y Colquepata, revisa pagos y consulta tu punto de subida.
          </p>
        </div>

        <div className="mt-8 rounded-[14px] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.10)]">
          <div className="mb-5 flex items-center gap-2 rounded-[12px] bg-[#1E5BFF]/8 px-3 py-3 text-sm font-bold text-[#073FEA]">
            <ShieldCheck className="size-4" />
            Tu cuenta se usa para proteger tus reservas.
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Correo electrónico</span>
              <div className="flex h-12 items-center gap-2 rounded-[10px] bg-slate-50 px-3 ring-1 ring-slate-200">
                <Mail className="size-4 text-slate-400" />
                <input
                  placeholder="tu.correo@ejemplo.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                  className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Contraseña</span>
              <div className="flex h-12 items-center gap-2 rounded-[10px] bg-slate-50 px-3 ring-1 ring-slate-200">
                <LockKeyhole className="size-4 text-slate-400" />
                <input
                  placeholder="Ingresa tu contraseña"
                  type="password"
                  value={pass}
                  onChange={(event) => setPass(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                  className="h-full flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-3 rounded-[10px] bg-[#E53935]/10 px-3 py-2 text-center text-sm font-bold text-[#E53935]">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || loadingGoogle || !email || !pass}
            className="mt-5 h-12 w-full rounded-[10px] bg-[#073FEA] text-base font-black text-white disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">o</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading || loadingGoogle}
            className="h-12 w-full rounded-[10px] border border-slate-200 bg-white text-sm font-black text-slate-800 disabled:opacity-50"
          >
            {loadingGoogle ? "Conectando..." : "Continuar con Google"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-slate-600">
          ¿Aún no tienes cuenta?{" "}
          <Link href={`/signup?callbackURL=${encodeURIComponent(callbackURL)}`} className="font-black text-[#073FEA]">
            Regístrate
          </Link>
        </p>
      </section>
    </main>
  );
}

function traducirError(code?: string): string {
  const errores: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
    USER_NOT_FOUND: "No existe una cuenta con ese correo.",
    INVALID_PASSWORD: "Contraseña incorrecta.",
    EMAIL_NOT_VERIFIED: "Verifica tu correo antes de ingresar.",
    TOO_MANY_REQUESTS: "Demasiados intentos. Espera un momento.",
    USER_BANNED: "Esta cuenta ha sido suspendida.",
  };

  return errores[code ?? ""] ?? "No se pudo iniciar sesión. Inténtalo nuevamente.";
}
