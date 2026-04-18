"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { LocationContext, type Location } from "@/lib/location-context";

const LOCATIONS: Location[] = ["Malaysia", "Singapore"];

export function SiteShell({
  children,
  eyebrow: _eyebrow,
  title: _title,
  subtitle: _subtitle,
}: Readonly<{
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}>) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);
  const [location, setLocation] = useState<Location>("Malaysia");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function initVanta() {
      if (!vantaRef.current || vantaEffect.current) return;
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
        highlightColor: 0x595335,
        midtoneColor: 0x2f6a89,
        lowlightColor: 0x70709,
        baseColor: 0xbdbcbc,
        blurFactor: 0.55,
        speed: 0.40,
        zoom: 0.90,
      });
    }
    initVanta();
    return () => {
      vantaEffect.current?.destroy();
      vantaEffect.current = null;
    };
  }, []);

  return (
    <LocationContext.Provider value={location}>
      <div className="relative min-h-screen text-white">
        <div ref={vantaRef} className="fixed inset-0 -z-10" />
        <nav
          className="relative z-50 flex justify-center px-6 py-5"
          style={{ background: "linear-gradient(to bottom, #000000 0%, transparent 100%)" }}
        >
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-0.75 text-sm font-medium text-white/90 transition hover:text-white"
            >
              <span>{location}</span>
              <ChevronDown
                className={`h-4 w-4 text-white/70 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
              />
            </button>

            <div
              className={`absolute left-1/2 top-full mt-2 -translate-x-1/2 transition-all duration-200 ease-out ${
                open
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocation(loc);
                    setOpen(false);
                  }}
                  className={`block w-full whitespace-nowrap px-3 py-1.5 text-center text-sm transition hover:text-white ${
                    loc === location ? "font-medium text-white" : "text-white/50"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="relative z-10 flex-1">{children}</main>
      </div>
    </LocationContext.Provider>
  );
}
