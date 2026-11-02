import { Loader2, MapPin } from "@/components/ui/icons";

interface ServiceMapLoadingPlaceholderProps {
  locale?: string;
}

export default function ServiceMapLoadingPlaceholder({
  locale = "th",
}: ServiceMapLoadingPlaceholderProps) {
  const isTh = locale === "th";

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-72 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[#F0EBE5] p-6 text-center shadow-inner"
    >
      {/* Illustrated map vector background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 300"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M0 60 Q 150 40 300 80 T 600 60"
          stroke="#5089bf"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M-40 180 Q 200 120 400 220 T 640 160"
          stroke="#B7D1EA"
          strokeWidth="32"
          strokeLinecap="round"
        />
        <path
          d="M120 -20 Q 180 150 160 320"
          stroke="#5089bf"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M450 -20 Q 420 160 480 320"
          stroke="#8E8B83"
          strokeWidth="12"
          strokeDasharray="6 6"
        />
        {/* Subtle map blocks */}
        <rect x="60" y="90" width="80" height="60" rx="8" fill="#CBC7BE" opacity="0.4" />
        <rect x="220" y="40" width="100" height="70" rx="8" fill="#B7D1EA" opacity="0.4" />
        <rect x="360" y="110" width="120" height="80" rx="8" fill="#CBC7BE" opacity="0.4" />
        <rect x="200" y="180" width="140" height="60" rx="8" fill="#DCE8F5" opacity="0.4" />
      </svg>

      {/* Pulsing radar ring */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-3 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute h-16 w-16 animate-ping rounded-full bg-[#5089bf]/20"
          />
          <span
            aria-hidden="true"
            className="absolute h-12 w-12 rounded-full bg-[#B7D1EA]/50 backdrop-blur-xs"
          />
          <div className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-[#5089bf] text-white shadow-md">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#5089bf]" aria-hidden="true" />
          <p className="text-sm font-bold text-[#1C1C1A]">
            {isTh
              ? "กำลังตรวจสอบพื้นที่ให้บริการในเขตของคุณ…"
              : "Checking service availability in your area…"}
          </p>
        </div>

        <p className="mt-1 text-xs font-medium text-[#4E4B44]/80">
          {isTh
            ? "กรุณารอสักครู่ ระบบกำลังโหลดข้อมูลพิกัดดาวเทียม"
            : "Please wait, loading precision satellite map coordinates…"}
        </p>
      </div>
    </div>
  );
}
