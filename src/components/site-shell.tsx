"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowRight, Radar } from "lucide-react";

function navClass(isActive: boolean) {
  return isActive
    ? "bg-white/16 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
    : "text-slate-200/80 hover:bg-white/10 hover:text-white";
}

export function SiteShell({
  eyebrow,
  title,
  subtitle,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_30%),linear-gradient(180deg,_#07111f_0%,_#0b1727_32%,_#f4f7fb_32.1%,_#eef4f8_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-slate-950/70 px-5 py-4 shadow-[0_30px_80px_rgba(2,6,23,0.38)] backdrop-blur xl:px-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-teal-200 uppercase">
                  <Radar className="h-3.5 w-3.5" />
                  {eyebrow}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200/80">
                  <Activity className="h-3.5 w-3.5" />
                  Crisis-aware supplier intelligence for SMEs
                </span>
              </div>
              <div className="max-w-3xl">
                <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl lg:text-[2.8rem]">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:max-w-md lg:justify-end">
              <Link
                href="/"
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${navClass(
                  pathname === "/",
                )}`}
              >
                Dashboard
              </Link>
              <Link
                href="/request"
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${navClass(
                  pathname === "/request",
                )}`}
              >
                New Request
              </Link>
              <Link
                href="/request"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
              >
                Create urgent request
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
