"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, ChevronDown, Radar } from "lucide-react";
import { LocationContext, type Location } from "@/lib/location-context";

const LOCATIONS: Location[] = ["Malaysia", "Singapore"];

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
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);
  const [location, setLocation] = useState<Location>("Malaysia");
  const [locationOpen, setLocationOpen] = useState(false);

  useEffect(() => {
    async function initVanta() {
      if (!vantaRef.current || vantaEffect.current) {
        return;
      }

      const THREE = await import("three");
      const { default: FOG } = await import("vanta/dist/vanta.fog.min.js");

      vantaEffect.current = FOG({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        highlightColor: 0x0f766e,
        midtoneColor: 0x1d4ed8,
        lowlightColor: 0x020617,
        baseColor: 0x050816,
        blurFactor: 0.52,
        speed: 0.32,
        zoom: 0.9,
      });
    }

    void initVanta();

    return () => {
      vantaEffect.current?.destroy();
      vantaEffect.current = null;
    };
  }, []);

  return (
    <LocationContext.Provider value={location}>
      <div className="relative min-h-screen overflow-hidden bg-[#08090f] text-white">
        <div ref={vantaRef} className="fixed inset-0 -z-20 opacity-90" />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.16),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.14)_0%,_rgba(2,6,23,0.36)_100%)]" />

        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <nav className="rounded-[28px] border border-white/10 bg-black/25 px-4 py-3 shadow-[0_30px_80px_rgba(2,6,23,0.28)] backdrop-blur xl:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setLocationOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  <span>{location}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
                      locationOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                <div
                  className={`absolute left-0 top-full z-20 mt-2 w-40 rounded-2xl border border-white/10 bg-slate-950/88 p-2 shadow-[0_20px_40px_rgba(2,6,23,0.38)] backdrop-blur transition-all duration-200 ${
                    locationOpen
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0"
                  }`}
                >
                  {LOCATIONS.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => {
                        setLocation(entry);
                        setLocationOpen(false);
                      }}
                      className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                        entry === location
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          </nav>

          {title ? (
            <header className="mt-6 rounded-[32px] border border-white/10 bg-slate-950/46 px-5 py-5 shadow-[0_30px_80px_rgba(2,6,23,0.32)] backdrop-blur xl:px-7">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {eyebrow ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">
                      <Radar className="h-3.5 w-3.5" />
                      {eyebrow}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200/80">
                    <Activity className="h-3.5 w-3.5" />
                    Crisis-aware supplier intelligence for SMEs
                  </span>
                </div>

                <div className="max-w-3xl">
                  <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl lg:text-[2.8rem]">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
            </header>
          ) : null}

          <main className={`flex-1 ${title ? "py-6" : "py-8"}`}>{children}</main>
        </div>
      </div>
    </LocationContext.Provider>
  );
}
