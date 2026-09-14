"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Search,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  X,
  type IconType,
} from "@/components/ui/icons";

import type { ServiceLocation } from "@/components/services/ServiceLocationPicker";
import TurnstileWrapper from "@/components/security/TurnstileWrapper";
import MobileActionBar from "@/components/layout/MobileActionBar";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import TrackRequestModal from "@/components/tracking/TrackRequestModal";
import ConfirmationDetailsCard from "@/components/feedback/ConfirmationDetailsCard";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/productAnalytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/ui/page-shell";

const ServiceLocationPicker = dynamic(
  () => import("@/components/services/ServiceLocationPicker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 rounded-xl" />,
  },
);

type LocalizedText = { en: string; th: string };
type Offering = {
  id: string;
  slug: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  externalPrice: number;
  solarDreamCustomerPrice: number;
  basePrice: string;
  ratePerKwp: string;
  minimumPrice: string;
  loyaltyDiscount: string;
  durationMinutes: number;
  currency: "THB";
};
type Asset = {
  id: string;
  productName: string;
  serialNumber: string;
  systemSizeKw: number;
};
type Option = {
  kind: "INVERTER_BRAND" | "ROOF_TYPE";
  code: string;
  label: LocalizedText;
};
type Quote = {
  quoteRef: string;
  expiresAt: string;
  items: Array<{
    slug: string;
    name: LocalizedText;
    unitSatang: number | null;
    discountSatang: number | null;
    totalSatang: number | null;
  }>;
  adjustments: Array<{ type: "BUNDLE" | "PROMOTION"; amountSatang: number }>;
  subtotalSatang: number | null;
  discountSatang: number | null;
  totalSatang: number | null;
  currency: "THB";
  checkoutDisposition: "CUSTOM_QUOTE" | "PAY_NOW";
  pricingStatus: "CUSTOM_REQUIRED" | "FINAL";
};
type Confirmation = {
  orderId: string;
  serviceRequestId: string | null;
  trackingId: string;
  orderReference: string;
  price: number | null;
  currency: string;
  checkoutDisposition: "CUSTOM_QUOTE" | "PAY_NOW";
  paymentRequirement: "NOT_REQUIRED" | "REQUIRED";
  trackingUrl?: string | null;
};
type Errors = Partial<
  Record<
    | "services"
    | "asset"
    | "system"
    | "date"
    | "name"
    | "phone"
    | "email"
    | "address"
    | "location"
    | "consent"
    | "form",
    string
  >
>;

const STORAGE_KEY = "solardream.service-cart.v1";
const premiumControlClass =
  "mt-2 min-h-12 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 font-medium text-[#1C1C1A] outline-none transition placeholder:text-[#4E4B44]/50 focus:border-[#7CA8D0] focus:bg-[#F0EEE9] focus:ring-0";
const premiumControlErrorClass =
  "border-b-2 border-rose-500 bg-rose-50/70 focus:border-rose-600 focus:bg-rose-50";

const copy = {
  en: {
    eyebrow: "Solar care, made simple",
    title: "Choose the care your solar system needs.",
    intro:
      "Combine services in one visit, configure your system, and send the request to our team for a formal quotation and site visit.",
    select: "Select services",
    selected: "Selected",
    selectedServices: "Selected services",
    selectOption: "Select an option",
    duration: "min",
    from: "From",
    cart: "Service cart",
    empty: "Choose at least one service to continue.",
    cartEmpty: "No services selected yet.",
    noOfferingsTitle: "No services are available to book right now.",
    noOfferingsBody:
      "Please try again later or contact the SolarDream team for help.",
    missingServices: "Select at least one service.",
    missingSystem: "Complete your solar system details.",
    configure: "Configure",
    review: "Review",
    system: "Your solar system",
    member: "SolarDream system",
    external: "Another installer",
    asset: "Installed system",
    size: "System size",
    customSize: "20+ kW: custom quotation",
    inverter: "Inverter brand",
    roof: "Roof type",
    promo: "Promotion code",
    promoHint: "Applied only after the server validates it.",
    appointment: "Preferred service date",
    details: "Contact and service address",
    fullName: "Full name",
    phone: "Phone",
    email: "Email",
    address: "Service address",
    notes: "Notes (optional)",
    pin: "Pin location",
    confirmPin: "I confirm this pin matches the service address",
    mismatch:
      "The map label and typed address differ. Please check both, then confirm the pin.",
    consent:
      "I agree to the necessary processing required to arrange and deliver these services.",
    getQuote: "Proceed to details",
    back: "Back to configure",
    confirm: "Request quotation & consultation",
    request: "Request custom quotation",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total estimated price",
    estimate: "Estimated now",
    customTitle: "Custom quotation required",
    customBody:
      "Systems above 20 kW need an engineering review. No estimate or payment is shown.",
    trackPrompt: "Already requested a service?",
    trackAction: "Track your status here",
    requested: "Request received",
    requestedBody:
      "Your request has been received. Our staff will contact you shortly to confirm the appointment and finalize the quotation. (Please remember your reference code or keep link to track your request)",
    reference: "Reference",
    done: "Done",
    sheetTitle: "Your service cart",
    noAssets:
      "No eligible SolarDream systems were found. Choose another installer.",
    errors: {
      services: "Choose at least one service.",
      asset: "Choose an installed system.",
      system: "Complete all system details.",
      date: "Choose a future service date.",
      name: "Enter your full name.",
      phone: "Enter a valid phone number.",
      email: "Enter a valid email address.",
      address: "Enter the complete service address.",
      location:
        "Confirm the pinned service location or continue with the typed address.",
      consent: "Necessary consent is required.",
      form: "Please review the highlighted fields.",
    },
  },
  th: {
    eyebrow: "ดูแลโซลาร์ให้ง่ายขึ้น",
    title: "เลือกบริการที่ระบบโซลาร์ของคุณต้องการ",
    intro:
      "รวมหลายบริการในนัดเดียว ระบุข้อมูลระบบ และส่งคำขอให้ทีมงานจัดทำใบเสนอราคาและนัดหมายเข้าหน้างาน",
    select: "เลือกบริการ",
    selected: "เลือกแล้ว",
    selectedServices: "บริการที่เลือก",
    selectOption: "เลือกตัวเลือก",
    duration: "นาที",
    from: "เริ่มต้น",
    cart: "ตะกร้าบริการ",
    empty: "เลือกอย่างน้อยหนึ่งบริการเพื่อดำเนินการต่อ",
    cartEmpty: "ยังไม่ได้เลือกบริการ",
    noOfferingsTitle: "ยังไม่มีบริการที่เปิดให้จองในขณะนี้",
    noOfferingsBody:
      "โปรดลองใหม่ภายหลัง หรือติดต่อทีม SolarDream เพื่อขอความช่วยเหลือ",
    missingServices: "กรุณาเลือกอย่างน้อยหนึ่งบริการ",
    missingSystem: "กรุณาระบุข้อมูลระบบโซลาร์ให้ครบ",
    configure: "กำหนดรายละเอียด",
    review: "ตรวจสอบ",
    system: "ระบบโซลาร์ของคุณ",
    member: "ระบบ SolarDream",
    external: "ติดตั้งโดยบริษัทอื่น",
    asset: "ระบบที่ติดตั้งแล้ว",
    size: "ขนาดระบบ",
    customSize: "20+ kW: ขอใบเสนอราคา",
    inverter: "ยี่ห้ออินเวอร์เตอร์",
    roof: "ประเภทหลังคา",
    promo: "รหัสโปรโมชัน",
    promoHint: "ใช้ส่วนลดเมื่อเซิร์ฟเวอร์ตรวจสอบแล้วเท่านั้น",
    appointment: "วันที่สะดวกรับบริการ",
    details: "ข้อมูลติดต่อและสถานที่บริการ",
    fullName: "ชื่อ-นามสกุล",
    phone: "โทรศัพท์",
    email: "อีเมล",
    address: "ที่อยู่รับบริการ",
    notes: "หมายเหตุ (ไม่บังคับ)",
    pin: "ปักหมุดตำแหน่ง",
    confirmPin: "ฉันยืนยันว่าหมุดตรงกับที่อยู่รับบริการ",
    mismatch:
      "ชื่อสถานที่บนแผนที่และที่อยู่ที่พิมพ์แตกต่างกัน โปรดตรวจสอบทั้งสองรายการแล้วจึงยืนยันหมุด",
    consent: "ฉันยินยอมให้ประมวลผลข้อมูลที่จำเป็นเพื่อจัดนัดหมายและให้บริการ",
    getQuote: "ดำเนินการต่อ",
    back: "กลับไปแก้ไข",
    confirm: "ขอใบเสนอราคาและปรึกษาทีมงาน",
    request: "ส่งคำขอใบเสนอราคา",
    subtotal: "ยอดรวม",
    discount: "ส่วนลด",
    total: "ราคารวมโดยประมาณ",
    estimate: "ราคาประเมินตอนนี้",
    customTitle: "ต้องจัดทำใบเสนอราคาเฉพาะ",
    customBody:
      "ระบบขนาดเกิน 20 kW ต้องให้วิศวกรตรวจสอบ จึงไม่แสดงราคาประเมินหรือปุ่มชำระเงิน",
    trackPrompt: "เคยส่งคำขอบริการแล้ว?",
    trackAction: "ติดตามสถานะที่นี่",
    requested: "รับคำขอเรียบร้อยแล้ว",
    requestedBody:
      "เราได้รับคำขอของคุณแล้ว ทีมงานจะติดต่อกลับเร็ว ๆ นี้เพื่อยืนยันนัดหมายและสรุปใบเสนอราคา (กรุณาเก็บเลขอ้างอิงหรือลิงค์นี้ไว้เพื่อติดตามสถานะ)",
    reference: "เลขอ้างอิง",
    done: "เสร็จสิ้น",
    sheetTitle: "ตะกร้าบริการ",
    noAssets: "ไม่พบระบบ SolarDream ที่ใช้ได้ กรุณาเลือกติดตั้งโดยบริษัทอื่น",
    errors: {
      services: "กรุณาเลือกอย่างน้อยหนึ่งบริการ",
      asset: "กรุณาเลือกระบบที่ติดตั้งแล้ว",
      system: "กรุณาระบุข้อมูลระบบให้ครบ",
      date: "กรุณาเลือกวันที่ในอนาคต",
      name: "กรุณาระบุชื่อ-นามสกุล",
      phone: "กรุณาระบุหมายเลขโทรศัพท์ที่ถูกต้อง",
      email: "กรุณาระบุอีเมลที่ถูกต้อง",
      address: "กรุณาระบุที่อยู่รับบริการให้ครบ",
      location: "ยืนยันหมุดตำแหน่ง หรือดำเนินการต่อด้วยที่อยู่ที่พิมพ์ไว้",
      consent: "จำเป็นต้องให้ความยินยอม",
      form: "กรุณาตรวจสอบข้อมูลที่ไฮไลต์",
    },
  },
} as const;

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
}

type ServiceCategory = "assessment" | "cleaning" | "maintenance";

const serviceCategoryMeta: Record<
  ServiceCategory,
  { en: string; th: string; icon: IconType }
> = {
  assessment: { en: "Assessments", th: "ตรวจประเมิน", icon: ClipboardCheck },
  cleaning: { en: "Cleaning", th: "ทำความสะอาด", icon: Sparkles },
  maintenance: { en: "Maintenance", th: "บำรุงรักษา", icon: ShieldCheck },
};

function serviceCategory(offering: Offering): ServiceCategory {
  const haystack =
    `${offering.slug} ${offering.code} ${offering.name.en} ${offering.name.th} ${offering.description.en} ${offering.description.th}`.toLocaleLowerCase();
  if (/clean|wash|ล้าง|ทำความสะอาด/.test(haystack)) return "cleaning";
  if (
    /maint|pm|protect|warranty|repair|shield|บำรุง|ซ่อม|ประกัน/.test(haystack)
  ) {
    return "maintenance";
  }
  return "assessment";
}

export default function ServicesHubClient({
  locale,
  offerings,
  options,
  assets,
  isMember,
}: {
  locale: string;
  offerings: Offering[];
  options: Option[];
  assets: Asset[];
  isMember: boolean;
}) {
  const lang = locale === "en" ? "en" : "th";
  const c = copy[lang];
  const text = useCallback((value: LocalizedText) => value[lang], [lang]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [step, setStep] = useState<"CONFIGURE" | "REVIEW" | "SUCCESS">(
    "CONFIGURE",
  );
  const [source, setSource] = useState<"SOLARDREAM" | "EXTERNAL">(
    assets.length ? "SOLARDREAM" : "EXTERNAL",
  );
  const [assetId, setAssetId] = useState(assets[0]?.id || "");
  const [systemSizeKw, setSystemSizeKw] = useState(5);
  const [systemSizeInput, setSystemSizeInput] = useState("5");
  const [inverterBrandCode, setInverterBrandCode] = useState("");
  const [roofTypeCode, setRoofTypeCode] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [contact, setContact] = useState({
    fullName: "",
    phone: "",
    email: "",
    serviceAddress: "",
  });
  const [location, setLocation] = useState<ServiceLocation | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [retainManualAddress, setRetainManualAddress] = useState(false);
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [necessaryConsent, setNecessaryConsent] = useState(false);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [retryable, setRetryable] = useState(false);
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useRef("");
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const cartOpenerRef = useRef<HTMLButtonElement>(null);
  const systemSectionRef = useRef<HTMLElement>(null);
  const [systemHighlight, setSystemHighlight] = useState(false);
  const [quoteTurnstileToken, setQuoteTurnstileToken] = useState<string | null>(
    null,
  );
  const [confirmTurnstileToken, setConfirmTurnstileToken] = useState<
    string | null
  >(null);
  const [isLargeViewport, setIsLargeViewport] = useState(false);

  const selected = useMemo(
    () => offerings.filter((item) => selectedSlugs.includes(item.slug)),
    [offerings, selectedSlugs],
  );
  const inverters = options.filter((item) => item.kind === "INVERTER_BRAND");
  const roofs = options.filter((item) => item.kind === "ROOF_TYPE");
  const custom = source === "EXTERNAL" && systemSizeKw > 20;
  const addressMismatch = Boolean(
    location &&
    contact.serviceAddress.trim().length >= 10 &&
    !normalize(location.displayName).includes(
      normalize(contact.serviceAddress).slice(0, 12),
    ) &&
    !normalize(contact.serviceAddress).includes(
      normalize(location.displayName).slice(0, 12),
    ),
  );
  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const money = useCallback(
    (satang: number) =>
      new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(satang / 100),
    [lang],
  );
  const decimalToSatang = (value: string) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  };
  const localLinePrice = useCallback(
    (offering: Offering) => {
      if (source === "SOLARDREAM") {
        return Math.round(Number(offering.solarDreamCustomerPrice) * 100);
      }
      if (systemSizeKw > 20) return null;
      const subtotal =
        decimalToSatang(offering.basePrice) +
        Math.round(
          (decimalToSatang(offering.ratePerKwp) *
            Math.round(systemSizeKw * 1000)) /
            1000,
        );
      return Math.max(subtotal, decimalToSatang(offering.minimumPrice));
    },
    [source, systemSizeKw],
  );
  const visibleCartItems = useMemo(
    () =>
      selected.map((item) => {
        const quoted = quote?.items.find((line) => line.slug === item.slug);
        return {
          slug: item.slug,
          name: text(item.name),
          totalSatang: quoted ? quoted.totalSatang : localLinePrice(item),
        };
      }),
    [localLinePrice, quote, selected, text],
  );
  const visibleCartTotal = visibleCartItems.some(
    (item) => item.totalSatang === null,
  )
    ? null
    : visibleCartItems.reduce((sum, item) => sum + (item.totalSatang || 0), 0);
  const systemSizeNumber = Number(systemSizeInput);
  const systemSizeComplete =
    systemSizeInput.trim().length > 0 &&
    Number.isFinite(systemSizeNumber) &&
    systemSizeNumber >= 3;
  const systemComplete =
    source === "SOLARDREAM"
      ? Boolean(assetId)
      : Boolean(inverterBrandCode && roofTypeCode && systemSizeComplete);
  const canProceedToDetails =
    selected.length > 0 && systemComplete && Boolean(quoteTurnstileToken);
  const proceedDisabledReason = !selected.length
    ? c.missingServices
    : !systemComplete
      ? c.missingSystem
      : !quoteTurnstileToken
        ? "Complete the security check."
        : "";
  const groupedOfferings = useMemo(() => {
    const groups = new Map<ServiceCategory, Offering[]>();
    offerings.forEach((offering) => {
      const category = serviceCategory(offering);
      groups.set(category, [...(groups.get(category) || []), offering]);
    });
    return (Object.keys(serviceCategoryMeta) as ServiceCategory[])
      .map((category) => ({
        category,
        items: groups.get(category) || [],
      }))
      .filter((group) => group.items.length);
  }, [offerings]);
  const friendlyError = (code: string | undefined, fallback?: string) => {
    const messages: Record<string, readonly [string, string]> = {
      SERVICE_CONFIGURATION_ERROR: [
        "Service pricing is being configured. Please try again shortly.",
        "กำลังตั้งค่าราคาบริการ กรุณาลองใหม่อีกครั้งในอีกสักครู่",
      ],
      SERVICE_UNAVAILABLE: [
        "Service booking is temporarily unavailable.",
        "ระบบจองบริการไม่พร้อมใช้งานชั่วคราว",
      ],
      RATE_LIMITED: [
        "Too many attempts. Please wait a moment and retry.",
        "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      ],
      OFFERING_UNAVAILABLE: [
        "One of the selected services is no longer available. Your other choices are preserved.",
        "บริการที่เลือกบางรายการไม่พร้อมใช้งาน ตัวเลือกอื่นของคุณยังคงอยู่",
      ],
      SYSTEM_OPTION_UNAVAILABLE: [
        "A selected system option is no longer available. Please review the system details.",
        "ตัวเลือกระบบบางรายการไม่พร้อมใช้งาน กรุณาตรวจสอบข้อมูลระบบ",
      ],
      PROMOTION_UNAVAILABLE: [
        "This promotion is unavailable or not eligible for this cart.",
        "โปรโมชันนี้ไม่พร้อมใช้งานหรือไม่ตรงเงื่อนไขของตะกร้า",
      ],
    };
    return (
      messages[code || ""]?.[lang === "th" ? 1 : 0] || fallback || c.errors.form
    );
  };
  useEffect(() => {
    if (errors.form) errorSummaryRef.current?.focus();
  }, [errors.form]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setIsLargeViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    void trackProductEvent("service_catalog_viewed", {
      service_count: offerings.length,
      surface: "services_hub",
    });
  }, [lang, offerings.length]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const parsed = JSON.parse(
          sessionStorage.getItem(STORAGE_KEY) || "null",
        ) as {
          v?: number;
          offeringSlugs?: string[];
          systemSource?: "SOLARDREAM" | "EXTERNAL";
          systemSizeKw?: number;
          inverterBrandCode?: string;
          roofTypeCode?: string;
        } | null;
        if (!parsed || parsed.v !== 1) return;
        setSelectedSlugs(
          (parsed.offeringSlugs || []).filter((slug) =>
            offerings.some((item) => item.slug === slug),
          ),
        );
        if (
          parsed.systemSource === "EXTERNAL" ||
          (parsed.systemSource === "SOLARDREAM" && assets.length)
        )
          setSource(parsed.systemSource);
        if (typeof parsed.systemSizeKw === "number") {
          const restoredSize = Math.min(1000, Math.max(3, parsed.systemSizeKw));
          setSystemSizeKw(restoredSize);
          setSystemSizeInput(
            Number.isInteger(restoredSize)
              ? restoredSize.toString()
              : restoredSize.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""),
          );
        }
        setInverterBrandCode(parsed.inverterBrandCode || "");
        setRoofTypeCode(parsed.roofTypeCode || "");
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [assets.length, offerings]);
  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        offeringSlugs: selectedSlugs,
        systemSource: source,
        systemSizeKw,
        inverterBrandCode,
        roofTypeCode,
      }),
    );
  }, [selectedSlugs, source, systemSizeKw, inverterBrandCode, roofTypeCode]);
  const invalidate = () => {
    setQuote(null);
    setStep("CONFIGURE");
    idempotencyKey.current = "";
  };
  const setSystemSizeValue = (value: number) => {
    const bounded = Math.min(1000, Math.max(3, value));
    const next = Number.isInteger(bounded)
      ? bounded.toString()
      : bounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    setSystemSizeKw(bounded);
    setSystemSizeInput(next);
    setErrors((current) => ({ ...current, system: undefined }));
    invalidate();
  };
  const updateSystemSizeText = (rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setSystemSizeInput(cleaned);
    const parsed = Number(cleaned);
    if (cleaned && Number.isFinite(parsed)) {
      setSystemSizeKw(Math.min(1000, Math.max(0, parsed)));
    }
    setErrors((current) => ({ ...current, system: undefined }));
    invalidate();
  };
  const focusSystemSection = () => {
    setSystemHighlight(true);
    systemSectionRef.current?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    window.setTimeout(() => setSystemHighlight(false), 700);
  };
  const toggle = (slug: string, serviceSku?: string) => {
    const selecting = !selectedSlugs.includes(slug);
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
    if (selecting && serviceSku) {
      void trackProductEvent("service_viewed", {
        service_sku: serviceSku,
        service_count: selectedSlugs.length + 1,
        system_class: source,
      });
    }
    invalidate();
  };
  const systemPayload = () =>
    source === "SOLARDREAM"
      ? { systemSource: "SOLARDREAM" as const, assetId }
      : {
          systemSource: "EXTERNAL" as const,
          systemDetails: { systemSizeKw, inverterBrandCode, roofTypeCode },
        };
  const validateConfigure = () => {
    const next: Errors = {};
    if (!selectedSlugs.length) next.services = c.errors.services;
    if (source === "SOLARDREAM" && !assetId) next.asset = c.errors.asset;
    if (
      source === "EXTERNAL" &&
      (!inverterBrandCode || !roofTypeCode || !systemSizeComplete)
    )
      next.system = c.errors.system;
    setErrors(next);
    return !Object.keys(next).length;
  };
  const proceedToDetails = () => {
    if (!selected.length) {
      setErrors((current) => ({ ...current, services: c.errors.services }));
      return;
    }
    if (!systemComplete) {
      setErrors((current) => ({
        ...current,
        asset: source === "SOLARDREAM" ? c.errors.asset : current.asset,
        system: source === "EXTERNAL" ? c.errors.system : current.system,
      }));
      focusSystemSection();
      return;
    }
    if (!quoteTurnstileToken) {
      setErrors((current) => ({
        ...current,
        form: "Complete the security check before continuing.",
      }));
      return;
    }
    void requestQuote();
  };
  const validateConfirmation = () => {
    const next: Errors = {};
    if (!appointmentDate || appointmentDate < minDate)
      next.date = c.errors.date;
    if (contact.fullName.trim().length < 2) next.name = c.errors.name;
    if (contact.phone.trim().length < 8) next.phone = c.errors.phone;
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) next.email = c.errors.email;
    if (contact.serviceAddress.trim().length < 10)
      next.address = c.errors.address;
    if (!necessaryConsent) next.consent = c.errors.consent;
    setErrors(next);
    return !Object.keys(next).length;
  };
  const requestQuote = async () => {
    if (!validateConfigure()) return;
    setBusy(true);
    setRetryable(false);
    setErrors({});
    try {
      const response = await fetch("/api/services/multi-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringSlugs: selectedSlugs,
          system: systemPayload(),
          promoCode: promoCode.trim() || undefined,
          website: "",
          turnstileToken: quoteTurnstileToken,
        }),
      });
      setQuoteTurnstileToken(null);
      const data = (await response.json()) as {
        success?: boolean;
        quote?: Quote;
        code?: string;
        error?: string;
      };
      if (!response.ok || !data.success || !data.quote) {
        setRetryable(response.status === 429 || response.status >= 500);
        throw new Error(friendlyError(data.code, data.error));
      }
      setQuote(data.quote);
      setStep("REVIEW");
      void trackProductEvent("service_quote_created", {
        service_count: selectedSlugs.length,
        system_class: custom ? "OVER_20KW" : source,
      });
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    } catch (caught) {
      setQuoteTurnstileToken(null);
      setErrors({
        form: caught instanceof Error ? caught.message : c.errors.form,
      });
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!quote || !validateConfirmation()) return;
    if (!confirmTurnstileToken) {
      setErrors({ form: "Complete the security check before submitting." });
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setBusy(true);
    setRetryable(false);
    setErrors({});
    try {
      const response = await fetch("/api/services/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          quoteRef: quote.quoteRef,
          action: "REQUEST_QUOTE",
          locale: lang,
          appointmentDate: `${appointmentDate}T12:00:00+07:00`,
          contact,
          location: pinConfirmed ? (location ?? undefined) : undefined,
          necessaryConsent,
          customerNotes: notes.trim() || undefined,
          turnstileToken: confirmTurnstileToken,
        }),
      });
      setConfirmTurnstileToken(null);
      const data = (await response.json()) as {
        success?: boolean;
        confirmation?: Confirmation;
        code?: string;
        error?: string;
      };
      if (!response.ok || !data.success || !data.confirmation) {
        setRetryable(response.status === 429 || response.status >= 500);
        throw new Error(friendlyError(data.code, data.error));
      }
      setConfirmation(data.confirmation);
      setStep("SUCCESS");
      void trackProductEvent("service_quotation_requested", {
        service_count: selectedSlugs.length,
        system_class: custom ? "OVER_20KW" : source,
      });
    } catch (caught) {
      setConfirmTurnstileToken(null);
      setErrors({
        form: caught instanceof Error ? caught.message : c.errors.form,
      });
    } finally {
      setBusy(false);
    }
  };

  if (step === "SUCCESS" && confirmation)
    return (
      <PageShell className="grid min-h-dvh place-items-center bg-background px-4 py-16">
        <Card asChild className="w-full max-w-xl bg-white p-8 text-center">
          <section>
            <PackageCheck className="mx-auto h-14 w-14 text-[#0D9488]" />
            <h1 className="mt-5 text-3xl font-black text-slate-950">
              {c.requested}
            </h1>
            <p className="mt-3 font-semibold leading-7 text-slate-600">
              {c.requestedBody}
            </p>
            <div className="mt-6">
              <ConfirmationDetailsCard
                referenceId={confirmation.orderReference}
                source="services"
                locale={lang}
              />
            </div>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                setConfirmation(null);
                setQuote(null);
                setStep("CONFIGURE");
                setSelectedSlugs([]);
              }}
              className="mt-6 rounded-xl px-6 font-black"
            >
              {c.done}
            </Button>
          </section>
        </Card>
      </PageShell>
    );

  const renderCart = (mobile = false) => (
    <Card
      className={cn(
        "rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm",
        !mobile &&
          "sticky top-24 max-h-[calc(100dvh-7rem)] self-start overflow-y-auto",
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1C1C1A]">
          <ShoppingCart className="h-5 w-5 text-[#4F7FA8]" />
          {c.cart}
        </h2>
        <span className="rounded-full bg-[#DCE8F5] px-3 py-1 text-xs font-bold text-[#2E2C27]">
          {selected.length}
        </span>
      </div>
      {selected.length ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-[#4E4B44]">
            {c.selectedServices}
          </p>
          <ul className="mt-3 space-y-2">
            {visibleCartItems.map((item) => (
              <li
                key={item.slug}
                className="flex items-start justify-between gap-3 border-b border-[#8E8B83]/15 py-3 text-sm font-medium text-[#1C1C1A]"
              >
                <span className="min-w-0">
                  <span className="block font-bold">{item.name}</span>
                  <span className="mt-1 block text-xs text-[#4E4B44]">
                    {item.totalSatang === null
                      ? c.customTitle
                      : money(item.totalSatang)}
                  </span>
                </span>
                <Button
                  type="button"
                  onClick={() => toggle(item.slug)}
                  variant="quiet"
                  size="icon"
                  className="-mr-2 -mt-2 shrink-0 rounded-full hover:bg-[#A5C2DE]/10 text-[#4E4B44]"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm font-normal leading-6 text-[#4E4B44]">
          {c.cartEmpty}
        </p>
      )}
      <label className="mt-5 block text-sm font-medium text-[#1C1C1A]">
        {c.promo}
        <Input
          value={promoCode}
          onChange={(event) => {
            setPromoCode(event.target.value);
            invalidate();
          }}
          className={cn(premiumControlClass, "uppercase")}
        />
      </label>
      <p className="mt-2 text-xs font-normal text-[#4E4B44]">{c.promoHint}</p>
      {selected.length ? (
        <div className="mt-5 rounded-2xl border border-[#8E8B83]/15 bg-[#DCE8F5]/50 px-4 py-4">
          <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#1C1C1A]">
            <span>{c.total}</span>
            <span>
              {visibleCartTotal === null ? (
                c.customTitle
              ) : (
                <AnimatedNumber
                  value={visibleCartTotal / 100}
                  formatter={(amount) => money(Math.round(amount * 100))}
                />
              )}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-[#4E4B44]">
            {c.estimate}
          </p>
        </div>
      ) : null}
      {step === "CONFIGURE" ? (
        <>
          <TurnstileWrapper
            action="service_quote"
            className="mt-5"
            onTokenChange={setQuoteTurnstileToken}
          />
          <Button
            variant="primary"
            size="default"
            ref={cartOpenerRef}
            type="button"
            onClick={proceedToDetails}
            disabled={busy || !quoteTurnstileToken}
            data-incomplete={!canProceedToDetails}
            title={proceedDisabledReason || undefined}
            aria-describedby={
              !canProceedToDetails ? "service-cart-disabled-reason" : undefined
            }
            className={cn(
              "mt-5 w-full rounded-full bg-[#B7D1EA] px-6 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95",
              !canProceedToDetails && "opacity-70",
            )}
          >
            {busy ? "…" : c.getQuote}
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!canProceedToDetails ? (
            <p
              id="service-cart-disabled-reason"
              className="mt-2 text-xs font-medium leading-5 text-[#4E4B44]"
            >
              {proceedDisabledReason}
            </p>
          ) : null}
        </>
      ) : step === "REVIEW" ? (
        <>
          <TurnstileWrapper
            action="service_confirm"
            className="mt-5"
            onTokenChange={setConfirmTurnstileToken}
          />
          <Button
            variant="primary"
            size="lg"
            type="button"
            onClick={() => void confirm()}
            disabled={busy || !confirmTurnstileToken}
            className="mt-5 w-full rounded-full bg-[#B7D1EA] px-6 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95"
          >
            {busy ? "…" : c.confirm}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      ) : null}
    </Card>
  );

  return (
    <PageShell className="bg-[#F0EEE9] pb-28 lg:pb-16">
      <header className="border-b border-[#8E8B83]/15 bg-[#F0EEE9] px-4 py-10 text-[#1C1C1A] sm:py-12">
        <div className="mx-auto max-w-7xl">
          <div
            className="mb-7 flex flex-col gap-3 rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2 text-sm font-medium text-[#1C1C1A]">
              <Search className="h-4 w-4 text-[#4F7FA8]" />
              {c.trackPrompt}
            </p>
            <TrackRequestModal
              surface="services"
              trigger={
                <Button type="button" className="rounded-full bg-[#B7D1EA] text-white hover:bg-[#A5C2DE]/90 active:scale-95 text-sm font-medium shadow-sm">
                  {c.trackAction}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              }
            />
          </div>
          <p className="text-sm font-medium text-[#4F7FA8]">{c.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-[#1C1C1A] sm:text-4xl">
            {c.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#4E4B44]">
            {c.intro}
          </p>
        </div>
      </header>
      <nav
        aria-label={lang === "th" ? "ขั้นตอนการจอง" : "Booking progress"}
        className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-8"
      >
        {[
          { id: "CONFIGURE", label: c.configure },
          { id: "REVIEW", label: c.review },
        ].map((item, index) => {
          const active =
            step === item.id || (item.id === "REVIEW" && step === "SUCCESS");
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span
                aria-current={step === item.id ? "step" : undefined}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition-colors",
                  active
                    ? "bg-[#B7D1EA] text-white shadow-sm"
                    : "bg-[#F7F6F3] text-[#4E4B44]",
                )}
              >
                {active && step !== item.id ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-[#1C1C1A]" : "text-[#4E4B44]",
                )}
              >
                {item.label}
              </span>
              {index === 0 ? (
                <span className="h-px w-8 bg-[#8E8B83]/20 sm:w-16" />
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 border-t border-slate-200 px-4 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] lg:px-0 lg:py-0">
        <div className="min-w-0 space-y-8 lg:border-r lg:border-slate-200 lg:py-8 lg:pr-8">
          {step === "CONFIGURE" ? (
            <>
              <section
                ref={systemSectionRef}
                className={cn(
                  "border-b border-slate-200/80 pb-8 transition-[border-color,box-shadow] duration-200",
                  (errors.system || errors.asset || systemHighlight) &&
                    "ring-2 ring-red-500/70 animate-[service-field-shake_420ms_ease-in-out]",
                )}
              >
                <div className="flex items-center gap-3 border-b border-[#8E8B83]/15 pb-5">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#DCE8F5] text-[#4F7FA8]">
                    <SlidersHorizontal className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-bold text-[#1C1C1A]">
                    {c.system}
                  </h2>
                </div>
                <div
                  className="mt-5 grid grid-cols-1 gap-2 rounded-full border border-[#8E8B83]/20 bg-[#E6E3DC] p-1.5 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label={c.system}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={source === "SOLARDREAM"}
                    disabled={!isMember || !assets.length}
                    onClick={() => {
                      setSource("SOLARDREAM");
                      invalidate();
                    }}
                    className={cn(
                      "w-full rounded-full py-2.5 px-4 text-xs font-medium transition-all duration-300",
                      source === "SOLARDREAM"
                        ? "bg-[#B7D1EA] text-white shadow-sm"
                        : "bg-transparent text-[#4E4B44] hover:bg-[#A5C2DE]/10",
                      (!isMember || !assets.length) && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {c.member}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={source === "EXTERNAL"}
                    onClick={() => {
                      setSource("EXTERNAL");
                      invalidate();
                    }}
                    className={cn(
                      "w-full rounded-full py-2.5 px-4 text-xs font-medium transition-all duration-300",
                      source === "EXTERNAL"
                        ? "bg-[#B7D1EA] text-white shadow-sm"
                        : "bg-transparent text-[#4E4B44] hover:bg-[#A5C2DE]/10",
                    )}
                  >
                    {c.external}
                  </button>
                </div>
                {!assets.length ? (
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {c.noAssets}
                  </p>
                ) : null}
                {source === "SOLARDREAM" ? (
                  <label className="mt-5 block text-sm font-black text-slate-800">
                    {c.asset}
                    <select
                      value={assetId}
                      onChange={(event) => {
                        setAssetId(event.target.value);
                        invalidate();
                      }}
                      className={premiumControlClass}
                    >
                      <option value="">{c.selectOption}</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.productName} · {asset.serialNumber} ·{" "}
                          {asset.systemSizeKw} kW
                        </option>
                      ))}
                    </select>
                    {errors.asset ? (
                      <span className="mt-2 block text-sm text-rose-700">
                        {errors.asset}
                      </span>
                    ) : null}
                  </label>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className="sm:col-span-2 text-sm font-black text-slate-800">
                      {c.size}
                      <div
                        className={cn(
                          "mt-2 flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 transition-[border-color,box-shadow] focus-within:border-[#2C486A] focus-within:ring-2 focus-within:ring-[#B7D1EA]",
                          errors.system &&
                            !systemSizeComplete &&
                            "ring-2 ring-red-500/70",
                        )}
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          value={systemSizeInput}
                          onChange={(event) =>
                            updateSystemSizeText(event.target.value)
                          }
                          onBlur={() => {
                            if (systemSizeComplete)
                              setSystemSizeValue(systemSizeNumber);
                          }}
                          aria-invalid={Boolean(
                            errors.system && !systemSizeComplete,
                          )}
                          className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-black tabular-nums text-slate-950 outline-none"
                        />
                        <span className="pl-3 text-sm font-black text-[#2C486A]">
                          kW
                        </span>
                      </div>
                      {systemSizeKw > 20 ? (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {c.customSize}
                        </p>
                      ) : null}
                      <input
                        type="range"
                        min="3"
                        max="20"
                        step="0.5"
                        value={Math.min(systemSizeKw, 20)}
                        onChange={(event) => {
                          setSystemSizeValue(Number(event.target.value));
                        }}
                        className="mt-3 block min-h-11 w-full accent-[#B7D1EA]"
                      />
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          type="button"
                          onClick={() => {
                            setSystemSizeValue(21);
                          }}
                          variant="outline"
                          className={cn(
                            "rounded-lg",
                            systemSizeKw > 20
                              ? "border-[#2C486A] bg-[#B7D1EA]/20 text-[#0F172A]"
                              : "bg-white",
                          )}
                        >
                          20+ kW
                        </Button>
                      </div>
                    </label>
                    <label className="text-sm font-black text-slate-800">
                      {c.inverter}
                      <select
                        value={inverterBrandCode}
                        onChange={(event) => {
                          setInverterBrandCode(event.target.value);
                          setErrors((current) => ({
                            ...current,
                            system: undefined,
                          }));
                          invalidate();
                        }}
                        className={cn(
                          premiumControlClass,
                          errors.system &&
                            !inverterBrandCode &&
                            "ring-2 ring-red-500/70",
                        )}
                      >
                        <option value="">{c.selectOption}</option>
                        {inverters.map((item) => (
                          <option key={item.code} value={item.code}>
                            {text(item.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-black text-slate-800">
                      {c.roof}
                      <select
                        value={roofTypeCode}
                        onChange={(event) => {
                          setRoofTypeCode(event.target.value);
                          setErrors((current) => ({
                            ...current,
                            system: undefined,
                          }));
                          invalidate();
                        }}
                        className={cn(
                          premiumControlClass,
                          errors.system &&
                            !roofTypeCode &&
                            "ring-2 ring-red-500/70",
                        )}
                      >
                        <option value="">{c.selectOption}</option>
                        {roofs.map((item) => (
                          <option key={item.code} value={item.code}>
                            {text(item.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {errors.system ? (
                      <p
                        role="alert"
                        className="sm:col-span-2 text-sm font-bold text-rose-700"
                      >
                        {errors.system}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-950">
                    {c.select}
                  </h2>
                  <span className="font-bold text-slate-500">
                    {selected.length} {c.selected}
                  </span>
                </div>
                <div className="border-t border-gray-200">
                  {!groupedOfferings.length ? (
                    <Card tone="subtle" className="mt-5 p-5">
                      <h3 className="text-base font-bold text-slate-950">
                        {c.noOfferingsTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {c.noOfferingsBody}
                      </p>
                    </Card>
                  ) : null}
                  {groupedOfferings.map((group) => {
                    const meta = serviceCategoryMeta[group.category];
                    const CategoryIcon = meta.icon;
                    const showCategoryHeaders = offerings.length > 6;
                    return (
                      <div key={group.category}>
                        {showCategoryHeaders ? (
                          <div className="flex items-center gap-2 border-b border-gray-100 py-3 text-sm font-black text-slate-700">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[#0F172A]">
                              <CategoryIcon className="h-4 w-4" />
                            </span>
                            {meta[lang]}
                          </div>
                        ) : null}
                        <div>
                          {group.items.map((item) => {
                            const active = selectedSlugs.includes(item.slug);
                            const category = serviceCategory(item);
                            const Icon = serviceCategoryMeta[category].icon;
                            return (
                              <button
                                type="button"
                                key={item.slug}
                                aria-pressed={active}
                                onClick={() => toggle(item.slug, item.code)}
                                className={cn(
                                  "mb-2.5 flex min-h-16 w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-[20px] p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D1EA]",
                                  active
                                    ? "border border-[#7CA8D0]/40 bg-[#DCE8F5] text-[#2E2C27] shadow-sm"
                                    : "border border-[#8E8B83]/15 bg-[#E6E3DC] hover:bg-[#F0EEE9] text-[#1C1C1A]",
                                )}
                              >
                                <span className="flex min-w-0 flex-1 items-center gap-3">
                                  <span
                                    className={cn(
                                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                                      active
                                        ? "border-[#7CA8D0] bg-[#B7D1EA] text-white shadow-sm"
                                        : "border-[#8E8B83]/40 bg-[#F0EEE9] text-transparent",
                                    )}
                                    aria-hidden="true"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#DCE8F5] text-[#4F7FA8]">
                                    <Icon className="h-5 w-5" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-base font-bold text-[#1C1C1A]">
                                      {text(item.name)}
                                    </span>
                                    <span className="mt-1 line-clamp-1 block text-sm font-normal leading-5 text-[#4E4B44]">
                                      {text(item.description)}
                                    </span>
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-[#F0EEE9] px-3 py-1 text-xs font-medium text-[#4E4B44] shadow-sm">
                                  {item.durationMinutes} {c.duration}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {errors.services ? (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-bold text-rose-700"
                  >
                    {errors.services}
                  </p>
                ) : null}
              </section>
              {!isLargeViewport ? (
                <div className="border-t border-gray-200 pt-6">
                  <TurnstileWrapper
                    action="service_quote"
                    className="mx-auto max-w-2xl"
                    onTokenChange={setQuoteTurnstileToken}
                  />
                </div>
              ) : null}
            </>
          ) : quote ? (
            <section className="space-y-6">
              <Card className="bg-white p-5 sm:p-7">
                <Button
                  type="button"
                  onClick={() => setStep("CONFIGURE")}
                  variant="outline"
                  className="mb-5 bg-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {lang === "th" ? "ย้อนกลับ" : "Back"}
                </Button>
                <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                  <CalendarDays className="h-6 w-6 text-[#2C486A]" />
                  {c.details}
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label={c.fullName}
                    value={contact.fullName}
                    error={errors.name}
                    onChange={(value) =>
                      setContact((old) => ({ ...old, fullName: value }))
                    }
                  />
                  <Field
                    label={c.phone}
                    value={contact.phone}
                    error={errors.phone}
                    onChange={(value) =>
                      setContact((old) => ({ ...old, phone: value }))
                    }
                  />
                  <Field
                    label={c.email}
                    value={contact.email}
                    error={errors.email}
                    type="email"
                    onChange={(value) =>
                      setContact((old) => ({ ...old, email: value }))
                    }
                  />
                  <Field
                    label={c.appointment}
                    value={appointmentDate}
                    error={errors.date}
                    type="date"
                    min={minDate}
                    onChange={setAppointmentDate}
                  />
                  <label className="sm:col-span-2 text-sm font-black text-slate-800">
                    {c.address} <Required />
                    <Textarea
                      value={contact.serviceAddress}
                      onChange={(event) => {
                        setContact((old) => ({
                          ...old,
                          serviceAddress: event.target.value,
                        }));
                        setRetainManualAddress(true);
                        setPinConfirmed(false);
                      }}
                      rows={3}
                      className={cn(
                        premiumControlClass,
                        "min-h-28 py-3",
                        errors.address && premiumControlErrorClass,
                      )}
                    />
                    {errors.address ? (
                      <span className="mt-2 block text-sm text-rose-700">
                        {errors.address}
                      </span>
                    ) : null}
                  </label>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      onClick={() => setLocationOpen((open) => !open)}
                      variant="secondary"
                      className="rounded-lg border-[#2C486A]/30 bg-[#B7D1EA]/40 text-[#16243A]"
                      aria-expanded={locationOpen}
                    >
                      <MapPin className="h-4 w-4" />
                      {c.pin}
                      <span className="text-xs font-bold text-[#16243A]/65">
                        {lang === "th" ? "ไม่บังคับ" : "Optional"}
                      </span>
                    </Button>
                    {locationOpen ? (
                      <div className="mt-3">
                        <ServiceLocationPicker
                          locale={lang}
                          value={location}
                          onChange={(next) => {
                            setLocation(next);
                            if (!retainManualAddress)
                              setContact((old) => ({
                                ...old,
                                serviceAddress: next.displayName,
                              }));
                            setPinConfirmed(false);
                          }}
                        />
                      </div>
                    ) : null}
                    {addressMismatch ? (
                      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
                        {c.mismatch}
                      </p>
                    ) : null}
                    <label className="mt-3 flex min-h-12 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={pinConfirmed}
                        onChange={(event) =>
                          setPinConfirmed(event.target.checked)
                        }
                        disabled={!location}
                        className="mt-0.5 h-5 w-5 accent-[#B7D1EA]"
                      />
                      {c.confirmPin}
                    </label>
                    {errors.location ? (
                      <p className="mt-2 text-sm font-bold text-rose-700">
                        {errors.location}
                      </p>
                    ) : null}
                  </div>
                  <label className="sm:col-span-2 text-sm font-black text-slate-800">
                    {c.notes}
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      className={cn(premiumControlClass, "min-h-28 py-3")}
                    />
                  </label>
                  <label className="sm:col-span-2 flex min-h-12 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      checked={necessaryConsent}
                      onChange={(event) =>
                        setNecessaryConsent(event.target.checked)
                      }
                      className="mt-0.5 h-5 w-5 accent-[#B7D1EA]"
                    />
                    {c.consent}
                  </label>
                  {errors.consent ? (
                    <p className="sm:col-span-2 text-sm font-bold text-rose-700">
                      {errors.consent}
                    </p>
                  ) : null}
                </div>
                {errors.form ? (
                  <div
                    ref={errorSummaryRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
                  >
                    {errors.form}
                    {retryable ? (
                      <Button
                        type="button"
                        onClick={() => void confirm()}
                        variant="outline"
                        className="ml-3 border-rose-300 bg-white"
                      >
                        {lang === "th" ? "ลองอีกครั้ง" : "Retry"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {!isLargeViewport ? (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <TurnstileWrapper
                      action="service_confirm"
                      className="mx-auto max-w-2xl"
                      onTokenChange={setConfirmTurnstileToken}
                    />
                  </div>
                ) : null}
              </Card>
            </section>
          ) : null}
          {errors.form && step === "CONFIGURE" ? (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
            >
              {errors.form}
              {retryable ? (
                <Button
                  type="button"
                  onClick={() => void requestQuote()}
                  variant="outline"
                  className="ml-3 border-rose-300 bg-white"
                >
                  {lang === "th" ? "ลองอีกครั้ง" : "Retry"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {isLargeViewport ? (
          <aside className="hidden lg:block lg:py-8 lg:pl-8">
            {renderCart()}
          </aside>
        ) : null}
      </div>
      {!isLargeViewport ? (
        <MobileActionBar
          label={c.total}
          value={
            selected.length ? (
              visibleCartTotal === null ? (
                c.customTitle
              ) : (
                <AnimatedNumber
                  value={visibleCartTotal / 100}
                  formatter={(amount) => money(Math.round(amount * 100))}
                />
              )
            ) : (
              c.cartEmpty
            )
          }
          valueClassName={
            selected.length ? undefined : "text-sm text-slate-500"
          }
          helperText={
            step === "CONFIGURE" && !canProceedToDetails
              ? proceedDisabledReason
              : undefined
          }
          actionLabel={busy ? "…" : step === "REVIEW" ? c.confirm : c.getQuote}
          actionIcon={<ChevronRight className="h-4 w-4" />}
          onClick={step === "REVIEW" ? () => void confirm() : proceedToDetails}
          disabled={
            busy ||
            (step === "CONFIGURE" && !quoteTurnstileToken) ||
            (step === "REVIEW" && !confirmTurnstileToken)
          }
          data-incomplete={!canProceedToDetails}
          buttonClassName={!canProceedToDetails ? "opacity-70" : undefined}
        />
      ) : null}
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  min?: string;
}) {
  return (
    <label className="text-sm font-black text-slate-800">
      {label} <Required />
      <Input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(premiumControlClass, error && premiumControlErrorClass)}
      />
      {error ? (
        <span className="mt-2 block text-sm text-rose-700">{error}</span>
      ) : null}
    </label>
  );
}

function Required() {
  return (
    <span className="text-rose-600" aria-label="required">
      *
    </span>
  );
}
