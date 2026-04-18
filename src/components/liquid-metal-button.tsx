"use client";

interface Props {
  disabled?: boolean;
  sending?: boolean;
}

export function LiquidMetalButton({ disabled, sending }: Props) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`send-btn relative h-9 w-9 shrink-0 rounded-full bg-white/15 transition-all duration-200 hover:bg-white/25 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 disabled:animate-none ${
        sending ? "scale-90 opacity-60" : ""
      }`}
    >
      <svg
        viewBox="0 0 1024 1024"
        className="absolute inset-0 m-auto w-[38%]"
        style={{ fill: "#ffffff", stroke: "#ffffff", strokeWidth: 30, transform: "rotate(-45deg)" }}
        aria-hidden="true"
      >
        <path d="M843.968 896a51.072 51.072 0 0 1-51.968-52.032V232H180.032A51.072 51.072 0 0 1 128 180.032c0-29.44 22.528-52.032 52.032-52.032h663.936c29.44 0 52.032 22.528 52.032 52.032v663.936c0 29.44-22.528 52.032-52.032 52.032z" />
        <path d="M180.032 896a49.92 49.92 0 0 1-36.48-15.616c-20.736-20.8-20.736-53.76 0-72.832L807.616 143.616c20.864-20.8 53.76-20.8 72.832 0 20.8 20.8 20.8 53.76 0 72.768L216.384 880.384a47.232 47.232 0 0 1-36.352 15.616z" />
      </svg>
    </button>
  );
}
