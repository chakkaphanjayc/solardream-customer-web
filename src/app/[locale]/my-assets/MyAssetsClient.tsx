"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { 
  Cpu, 
  PackageCheck, 
  Search, 
  ShieldCheck, 
  Copy, 
  Check, 
  Wrench,
  ArrowLeft,
  Calendar,
  Camera,
  FileText,
  Phone,
  Trash2,
  User,
  CheckCircle2,
  Download,
  ExternalLink,
  X,
  AlertCircle
} from "@/components/ui/icons";
import { getWarrantyState } from "@/lib/warranty";
import { isLocale, toIntlLocale } from "@/i18n/locales";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  createServiceRequestAction, 
  getMyReturnRefundsAction,
  uploadServiceRequestPhotoAction,
} from "@/app/actions/afterSales";
import { GsapPulse, GsapReveal, GsapSpinner } from "@/components/ui/GsapMotion";

interface AssetProduct {
  id: string;
  brand: string;
  model: string;
  imageUrl: string;
  description: string | null;
  category?: { id: string; name: string } | null;
}

interface CustomerAsset {
  id: string;
  serialNumber: string;
  purchaseDate: Date | string;
  warrantyDays: number;
  product: AssetProduct;
}

interface InstalledAsset {
  id: string;
  proposalId: string;
  customerId: string;
  productName: string;
  serialNumber: string;
  installedDate: Date | string;
  warrantyExpiryDate: Date | string;
}

interface MyAssetsClientProps {
  initialAssets: CustomerAsset[];
  initialInstalledAssets: InstalledAsset[];
  initialError?: string;
  serviceRequestPrefill?: ServiceRequestPrefill;
}

interface ServiceRequestPrefill {
  assetId: string;
  type: "REPAIR" | "MAINTENANCE";
  systemId: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ReturnRefund {
  id: string;
  proposalId: string;
  status: string;
  reason: string;
  amount: number;
  createdAt: Date | string;
  pickupDate?: Date | string | null;
  inspectionDate?: Date | string | null;
  refundedAt?: Date | string | null;
  refundSlipUrl?: string | null;
}

type SelectedAsset = InstalledAsset | CustomerAsset;

function productLabel(product: AssetProduct) {
  return `${product.brand} ${product.model}`.trim();
}

function selectedAssetLabel(asset: SelectedAsset) {
  return "productName" in asset ? asset.productName : productLabel(asset.product);
}

function getCategoryIconPath(categoryName?: string | null) {
  const name = (categoryName || "").toLowerCase();
  if (name.includes("panel") || name.includes("แผง")) return "/asset/solarcell-icon.webp";
  if (name.includes("inverter") || name.includes("อินเวอร์เตอร์")) return "/asset/plug-icon.webp";
  if (name.includes("battery") || name.includes("แบตเตอรี่")) return "/asset/battery-icon.webp";
  if (name.includes("mount") || name.includes("mounting") || name.includes("โครงสร้าง") || name.includes("ยึด")) return "/asset/tools-icon.webp";
  return "/asset/protech-icon.webp";
}

function getRemainingTimeText(expiryDate: Date, now: Date = new Date(), locale: string = "th") {
  if (expiryDate.getTime() <= now.getTime()) {
    return locale === "th" ? "หมดประกันแล้ว" : "Warranty expired";
  }

  let years = expiryDate.getFullYear() - now.getFullYear();
  let months = expiryDate.getMonth() - now.getMonth();
  let days = expiryDate.getDate() - now.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (locale === "th") {
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ปี`);
    if (months > 0) parts.push(`${months} เดือน`);
    
    if (parts.length === 0) {
      const diffTime = expiryDate.getTime() - now.getTime();
      const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return `เหลือระยะเวลาประกันอีก ${remainingDays} วัน`;
    }
    return `เหลือระยะเวลาประกันอีก ${parts.join(" ")}`;
  } else {
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${years > 1 ? "years" : "year"}`);
    if (months > 0) parts.push(`${months} ${months > 1 ? "months" : "month"}`);
    
    if (parts.length === 0) {
      const diffTime = expiryDate.getTime() - now.getTime();
      const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return `Remaining warranty: ${remainingDays} ${remainingDays > 1 ? "days" : "day"}`;
    }
    return `Remaining: ${parts.join(" ")}`;
  }
}

function getInstalledWarrantyState(installedDate: Date | string, expiryDate: Date | string) {
  const installedAt = new Date(installedDate);
  const expiresAt = new Date(expiryDate);
  const now = new Date();
  const totalDays = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - installedAt.getTime()) / 86_400_000),
  );
  const remainingDays = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000),
  );

  return {
    expiryDate: expiresAt,
    isExpired: remainingDays === 0,
    remainingDays,
    totalDays,
    remainingPct: Math.max(0, Math.min(100, (remainingDays / totalDays) * 100)),
  };
}

export default function MyAssetsClient({
  initialAssets,
  initialInstalledAssets,
  initialError = "",
  serviceRequestPrefill,
}: MyAssetsClientProps) {
  const t = useTranslations("MyAssets");
  const locale = useLocale();
  const intlLocale = toIntlLocale(isLocale(locale) ? locale : "th");
  const initialServiceAsset = serviceRequestPrefill?.assetId
    ? initialInstalledAssets.find((asset) => asset.id === serviceRequestPrefill.assetId) || null
    : null;
  const [activeTab, setActiveTab] = useState<"assets" | "returns">("assets");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lists and loading state
  const [refunds, setRefunds] = useState<ReturnRefund[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);

  // Service Request Modal States
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(initialServiceAsset);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(Boolean(initialServiceAsset));
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [issueType, setIssueType] = useState<"REPAIR" | "CLAIM" | "MAINTENANCE">(serviceRequestPrefill?.type || "REPAIR");
  const [description, setDescription] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [serviceSystemId, setServiceSystemId] = useState(serviceRequestPrefill?.systemId || initialServiceAsset?.proposalId || "");
  const [serviceLocation, setServiceLocation] = useState<{ latitude: number; longitude: number } | null>(
    serviceRequestPrefill?.latitude !== null && serviceRequestPrefill?.latitude !== undefined
      && serviceRequestPrefill.longitude !== null && serviceRequestPrefill.longitude !== undefined
      ? { latitude: serviceRequestPrefill.latitude, longitude: serviceRequestPrefill.longitude }
      : null,
  );
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [newRequestId, setNewRequestId] = useState("");

  // Slip Preview Modal
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  // Dropzone Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Return/Refund requests & Service requests
  const loadRefunds = async () => {
    setLoadingRefunds(true);
    try {
      const res = await getMyReturnRefundsAction();
      if (res.success && res.returnRefunds) {
        setRefunds(res.returnRefunds);
      }
    } catch (err) {
      console.error("Failed to load return refunds:", err);
    } finally {
      setLoadingRefunds(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRefunds();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredAssets = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return initialAssets;
    return initialAssets.filter((asset) => [
      asset.serialNumber,
      productLabel(asset.product),
      asset.product.category?.name,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [initialAssets, query]);

  const filteredInstalledAssets = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return initialInstalledAssets;
    return initialInstalledAssets.filter((asset) =>
      [asset.serialNumber, asset.productName, asset.proposalId].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [initialInstalledAssets, query]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(t("warranty.copied"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Service Request Modal pre-filled
  const triggerServiceRequest = (asset: InstalledAsset | CustomerAsset, prefill?: ServiceRequestPrefill) => {
    setSelectedAsset(asset);
    setIssueType(prefill?.type || "REPAIR");
    setDescription("");
    setUploadedPhotos([]);
    setContactName("");
    setContactPhone("");
    setServiceSystemId(prefill?.systemId || ("proposalId" in asset ? asset.proposalId : ""));
    setServiceLocation(
      prefill?.latitude !== null && prefill?.latitude !== undefined && prefill?.longitude !== null && prefill?.longitude !== undefined
        ? { latitude: prefill.latitude, longitude: prefill.longitude }
        : null,
    );
    // Default appointment to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split("T")[0]);
    setNewRequestId("");
    setModalStep(1);
    setIsServiceModalOpen(true);
  };

  // Upload photos to Supabase Storage Proposals bucket
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!selectedAsset) return;

    const fileList = Array.from(files);
    if (uploadedPhotos.length + fileList.length > 5) {
      toast.error(locale === "th" ? "สามารถอัปโหลดรูปภาพได้ไม่เกิน 5 รูป" : "You can upload up to 5 photos.");
      return;
    }

    setIsUploading(true);
    try {
      const urls = [...uploadedPhotos];
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadServiceRequestPhotoAction(selectedAsset.id, formData);
        if (!result.success || !result.url) {
          throw new Error(result.error || "Upload failed.");
        }

        urls.push(result.url);
      }
      setUploadedPhotos(urls);
      toast.success(locale === "th" ? "อัปโหลดรูปภาพสำเร็จ" : "Photos uploaded successfully.");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown upload error";
      toast.error(locale === "th" ? `อัปโหลดล้มเหลว: ${message}` : `Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (idxToRemove: number) => {
    setUploadedPhotos((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRequest) return;
    if (!selectedAsset) return;

    if (!description.trim() || description.trim().length < 5) {
      toast.error(t("serviceRequestModal.errDescription"));
      return;
    }
    if (uploadedPhotos.length < 3 || uploadedPhotos.length > 5) {
      toast.error(t("serviceRequestModal.errPhotosCount"));
      return;
    }
    if (!contactName.trim()) {
      toast.error(t("serviceRequestModal.errContactName"));
      return;
    }
    if (!contactPhone.trim()) {
      toast.error(t("serviceRequestModal.errContactPhone"));
      return;
    }
    if (!appointmentDate) {
      toast.error(t("serviceRequestModal.errAppointmentDate"));
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await createServiceRequestAction({
        assetId: selectedAsset.id,
        type: issueType,
        description,
        images: uploadedPhotos,
        contactName,
        contactPhone,
        appointmentDate,
        systemId: serviceSystemId || undefined,
        latitude: serviceLocation?.latitude,
        longitude: serviceLocation?.longitude,
      });

      if (res.success && res.requestId) {
        setNewRequestId(String(res.requestId));
        setModalStep(4);
        toast.success(locale === "th" ? "ยื่นคำขอแจ้งซ่อมสำเร็จ" : "Service request submitted successfully.");
      } else {
        toast.error(res.error || "Failed to submit request.");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("An error occurred during submission.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const formatDateString = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Title & Search bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#B7D1EA]/30 bg-[#B7D1EA]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-[#B7D1EA]" />
            {t("badge")}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {activeTab === "assets" ? t("title") : t("refundTracker.title")}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {activeTab === "assets" ? t("description") : t("refundTracker.empty")}
          </p>
        </div>
        {activeTab === "assets" && (
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
              placeholder={t("searchPlaceholder")} 
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#B7D1EA] transition-colors" 
            />
          </div>
        )}
      </div>

      {initialError && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {initialError}
        </div>
      )}

      {/* Tabs Menu Switcher */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("assets")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "assets"
              ? "border-[#B7D1EA] text-slate-950 font-black"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          {t("tabs.assets")}
        </button>
        <button
          onClick={() => setActiveTab("returns")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "returns"
              ? "border-[#B7D1EA] text-slate-950 font-black"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          {t("tabs.returns")}
        </button>
      </div>

      {/* Active Tab Content Rendering */}
      {activeTab === "assets" ? (
        <>
          {filteredAssets.length === 0 && filteredInstalledAssets.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <PackageCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">{t("empty.title")}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{t("empty.description")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {/* Installed Assets */}
              {filteredInstalledAssets.map((asset) => {
                const warranty = getInstalledWarrantyState(
                  asset.installedDate,
                  asset.warrantyExpiryDate,
                );
                return (
                  <article
                    key={asset.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex aspect-[16/9] items-center justify-center border-b border-slate-100 bg-[#B7D1EA]/10">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-sm border border-slate-150">
                        <Wrench className="h-8 w-8 text-[#B7D1EA]" />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between space-y-6 p-5 md:p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                              {t("installedBadge")}
                            </span>
                            <h2 className="mt-1 text-base font-black leading-snug text-slate-900">
                              {asset.productName}
                            </h2>
                            <p className="mt-1 font-mono text-[10px] font-semibold text-slate-400">
                              Proposal #{asset.proposalId.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                              warranty.isExpired
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            )}
                          >
                            {warranty.isExpired ? t("warranty.expired") : t("warranty.inWarranty")}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                        <div className="min-w-0 space-y-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {t("fields.serialId")}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="block truncate font-mono text-xs font-black text-slate-800">
                              {asset.serialNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(asset.id, asset.serialNumber)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors shrink-0 cursor-pointer"
                              title="Copy serial number"
                            >
                              {copiedId === asset.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {t("fields.installed")}
                          </span>
                          <span className="block text-xs font-black text-slate-800">
                            {new Date(asset.installedDate).toLocaleDateString(intlLocale)}
                          </span>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {t("fields.warrantyExpiry")}
                          </span>
                          <span className="block text-xs font-black text-slate-800">
                            {warranty.expiryDate.toLocaleDateString(intlLocale)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-700">
                            {warranty.isExpired
                              ? t("warranty.expired")
                              : t("warranty.remainingDays", { count: warranty.remainingDays })}
                          </span>
                          <span className="shrink-0 text-[10px] font-bold text-slate-400">
                            {t("warranty.durationDays", { count: warranty.totalDays })}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full border border-slate-200/30 bg-slate-200/50">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              warranty.isExpired ? "bg-rose-400" : "bg-[#B7D1EA]",
                            )}
                            style={{ width: `${warranty.remainingPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => triggerServiceRequest(asset)}
                          className="w-full flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-800 transition-all hover:bg-slate-50 hover:border-slate-350 cursor-pointer"
                        >
                          <Wrench className="h-4 w-4 text-slate-600" />
                          <span>{t("warranty.requestService")}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Purchased Assets */}
              {filteredAssets.map((asset) => {
                const warranty = getWarrantyState(asset.purchaseDate, asset.warrantyDays);
                const purchaseDate = new Date(asset.purchaseDate);
                const iconPath = getCategoryIconPath(asset.product.category?.name);
                const remainingPct = 100 - warranty.progressPct;

                return (
                  <article 
                    key={asset.id} 
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/9] w-full bg-slate-50 border-b border-slate-100 overflow-hidden shrink-0">
                      {asset.product.imageUrl ? (
                        <div
                          role="img"
                          aria-label={productLabel(asset.product)}
                          className="h-full w-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                          style={{ backgroundImage: `url(${asset.product.imageUrl})` }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Cpu className="h-12 w-12 text-slate-350" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between p-5 md:p-6 space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                              <NextImage
                                src={iconPath}
                                alt="Category icon"
                                width={24}
                                height={24}
                                className="h-6 w-6 object-contain"
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                                {asset.product.category?.name || t("defaultCategory")}
                              </span>
                              <h2 className="text-base font-black text-slate-900 leading-snug">
                                {productLabel(asset.product)}
                              </h2>
                            </div>
                          </div>
                          
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0",
                            warranty.isExpired
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          )}>
                            {warranty.isExpired ? t("warranty.expired") : t("warranty.inWarranty")}
                          </span>
                        </div>
                        
                        {asset.product.description && (
                          <p className="text-xs font-semibold text-slate-500 line-clamp-2 leading-relaxed">
                            {asset.product.description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                        <div className="space-y-1 min-w-0">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {t("fields.serialId")}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs font-black text-slate-800 truncate select-all">
                              {asset.serialNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(asset.id, asset.serialNumber)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors shrink-0 cursor-pointer"
                              title="Copy serial number"
                            >
                              {copiedId === asset.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {t("fields.purchased")}
                          </span>
                          <span className="block text-xs font-black text-slate-800">
                            {purchaseDate.toLocaleDateString(intlLocale)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-bold",
                            warranty.isExpired ? "text-slate-400" : "text-[#0F172A]"
                          )}>
                            {getRemainingTimeText(warranty.expiryDate, new Date(), locale)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {t("warranty.durationDays", { count: asset.warrantyDays })}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/50 border border-slate-200/30">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              warranty.isExpired 
                                ? "bg-rose-400" 
                                : "bg-[#B7D1EA]"
                            )}
                            style={{ width: `${warranty.isExpired ? 0 : remainingPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => triggerServiceRequest(asset)}
                          className="w-full flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-800 transition-all hover:bg-slate-50 hover:border-slate-350 cursor-pointer"
                        >
                          <Wrench className="h-4 w-4 text-slate-600" />
                          <span>{t("warranty.requestService")}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Returns & Refunds Tab View */
        <div className="space-y-6">
          {loadingRefunds ? (
            <div className="flex items-center justify-center py-16">
              <GsapSpinner className="h-8 w-8 text-slate-400" />
            </div>
          ) : refunds.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t("refundTracker.empty")}
              </h2>
            </div>
          ) : (
            <div className="space-y-6">
              {refunds.map((refund) => {
                const isRequested = ["REQUESTED", "PICKUP", "INSPECTION", "REFUNDED"].includes(refund.status);
                const isPickup = ["PICKUP", "INSPECTION", "REFUNDED"].includes(refund.status);
                const isInspection = ["INSPECTION", "REFUNDED"].includes(refund.status);
                const isRefunded = refund.status === "REFUNDED";

                return (
                  <div 
                    key={refund.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    {/* Refund Card Header info */}
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {t("refundTracker.proposalRef")}
                        </span>
                        <h3 className="font-mono text-base font-black text-slate-900">
                          #{refund.proposalId.toUpperCase()}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {t("refundTracker.reason")}: {refund.reason}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {t("refundTracker.amount")}
                        </span>
                        <span className="font-urbanist text-2xl font-black tracking-tight text-slate-950">
                          ฿{refund.amount.toLocaleString(intlLocale, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Logistics-style vertical stepper */}
                    <div className="mt-6 space-y-6 pl-4 relative before:absolute before:left-[11px] before:top-[12px] before:bottom-[12px] before:w-[2px] before:bg-slate-150">
                      {/* Step 1: Request Received */}
                      <div className="relative pl-8 flex items-start gap-4">
                        <div className={cn(
                          "absolute left-0 top-1 h-[24px] w-[24px] rounded-full border-2 flex items-center justify-center z-10 bg-white transition-all duration-300",
                          isRequested ? "border-emerald-500 bg-emerald-50" : "border-slate-250 bg-slate-100"
                        )}>
                          {isRequested ? (
                            <GsapPulse className="h-[8px] w-[8px] rounded-full bg-emerald-500" scale={1.16}>
                              <span className="sr-only">{t("refundTracker.status.requested")}</span>
                            </GsapPulse>
                          ) : (
                            <div className="h-[8px] w-[8px] rounded-full bg-slate-350" />
                          )}
                        </div>
                        <div>
                          <h4 className={cn("text-xs font-black uppercase tracking-wider", isRequested ? "text-slate-950" : "text-slate-400")}>
                            {t("refundTracker.status.requested")}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {t("refundTracker.statusDesc.requested", { date: formatDateString(refund.createdAt) })}
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Item Pickup Arranged */}
                      <div className="relative pl-8 flex items-start gap-4">
                        <div className={cn(
                          "absolute left-0 top-1 h-[24px] w-[24px] rounded-full border-2 flex items-center justify-center z-10 bg-white transition-all duration-300",
                          isPickup ? "border-amber-500 bg-amber-50" : "border-slate-250 bg-slate-100"
                        )}>
                          <div className={cn("h-[8px] w-[8px] rounded-full", isPickup ? "bg-amber-500" : "bg-slate-350")} />
                        </div>
                        <div>
                          <h4 className={cn("text-xs font-black uppercase tracking-wider", isPickup ? "text-slate-950" : "text-slate-400")}>
                            {t("refundTracker.status.pickup")}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {refund.pickupDate 
                              ? t("refundTracker.statusDesc.pickup", { date: formatDateString(refund.pickupDate) })
                              : isPickup 
                                ? t("refundTracker.statusDesc.pickupPending") 
                                : t("refundTracker.statusDesc.pickupPending")
                            }
                          </p>
                        </div>
                      </div>

                      {/* Step 3: Inspection in Progress */}
                      <div className="relative pl-8 flex items-start gap-4">
                        <div className={cn(
                          "absolute left-0 top-1 h-[24px] w-[24px] rounded-full border-2 flex items-center justify-center z-10 bg-white transition-all duration-300",
                          isInspection ? "border-blue-500 bg-blue-50" : "border-slate-250 bg-slate-100"
                        )}>
                          <div className={cn("h-[8px] w-[8px] rounded-full", isInspection ? "bg-blue-500" : "bg-slate-350")} />
                        </div>
                        <div>
                          <h4 className={cn("text-xs font-black uppercase tracking-wider", isInspection ? "text-slate-950" : "text-slate-400")}>
                            {t("refundTracker.status.inspection")}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {refund.inspectionDate 
                              ? t("refundTracker.statusDesc.inspection", { date: formatDateString(refund.inspectionDate) })
                              : isInspection 
                                ? t("refundTracker.statusDesc.inspectionPending") 
                                : t("refundTracker.statusDesc.inspectionPending")
                            }
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Refund Processed */}
                      <div className="relative pl-8 flex items-start gap-4">
                        <div className={cn(
                          "absolute left-0 top-1 h-[24px] w-[24px] rounded-full border-2 flex items-center justify-center z-10 bg-white transition-all duration-300",
                          isRefunded ? "border-emerald-600 bg-emerald-50" : "border-slate-250 bg-slate-100"
                        )}>
                          <div className={cn("h-[8px] w-[8px] rounded-full", isRefunded ? "bg-emerald-600" : "bg-slate-350")} />
                        </div>
                        <div className="flex-1">
                          <h4 className={cn("text-xs font-black uppercase tracking-wider", isRefunded ? "text-slate-950" : "text-slate-400")}>
                            {t("refundTracker.status.refunded")}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {refund.refundedAt 
                              ? t("refundTracker.statusDesc.refunded", { date: formatDateString(refund.refundedAt) })
                              : isRefunded 
                                ? t("refundTracker.statusDesc.refundedPending") 
                                : t("refundTracker.statusDesc.refundedPending")
                            }
                          </p>

                          {/* Extra elements when Refund is completed */}
                          {isRefunded && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {/* Download Credit Note button */}
                              <a
                                href={`/api/refunds/${refund.id}/credit-note`}
                                download
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5 text-slate-600" />
                                {t("refundTracker.downloadCreditNote")}
                              </a>

                              {/* View Transfer Slip button */}
                              {refund.refundSlipUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (refund.refundSlipUrl) setPreviewSlipUrl(refund.refundSlipUrl);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                                  {t("refundTracker.viewRefundSlip")}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Smart Service Request Modal Form */}
      {isServiceModalOpen && selectedAsset && (
        <GsapReveal className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
            
            {/* Modal Header */}
            <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {t("serviceRequestModal.title")}
                </h3>
                <span className="block mt-0.5 text-xs text-slate-500 font-semibold">
                  {selectedAssetLabel(selectedAsset)} (S/N: {selectedAsset.serialNumber})
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Stepper Progress Bar (only steps 1-3) */}
            {modalStep <= 3 && (
              <div className="px-6 pt-4 flex items-center justify-between gap-4">
                <div className="flex-1 h-1 rounded-full bg-slate-100 relative">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full bg-[#B7D1EA] transition-all duration-300"
                    style={{ width: modalStep === 1 ? "33.3%" : modalStep === 2 ? "66.6%" : "100%" }}
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">
                  Step {modalStep} of 3
                </span>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <main className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleServiceSubmit} className="space-y-6">
                
                {/* STEP 1: Select Issue Type */}
                {modalStep === 1 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      {t("serviceRequestModal.step1Title")}
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* REPAIR CARD */}
                      <button
                        type="button"
                        onClick={() => setIssueType("REPAIR")}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer",
                          issueType === "REPAIR" 
                            ? "border-[#B7D1EA] bg-[#B7D1EA]/5 shadow-xs" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                          <Wrench className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <span className="block text-sm font-black text-slate-900">
                            {t("serviceRequestModal.repair")}
                          </span>
                          <span className="block mt-0.5 text-xs text-slate-500 font-semibold leading-relaxed">
                            {t("serviceRequestModal.repairDesc")}
                          </span>
                        </div>
                      </button>

                      {/* CLAIM CARD */}
                      <button
                        type="button"
                        onClick={() => setIssueType("CLAIM")}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer",
                          issueType === "CLAIM" 
                            ? "border-[#B7D1EA] bg-[#B7D1EA]/5 shadow-xs" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                          <ShieldCheck className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <span className="block text-sm font-black text-slate-900">
                            {t("serviceRequestModal.claim")}
                          </span>
                          <span className="block mt-0.5 text-xs text-slate-500 font-semibold leading-relaxed">
                            {t("serviceRequestModal.claimDesc")}
                          </span>
                        </div>
                      </button>

                      {/* MAINTENANCE CARD */}
                      <button
                        type="button"
                        onClick={() => setIssueType("MAINTENANCE")}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer",
                          issueType === "MAINTENANCE" 
                            ? "border-[#B7D1EA] bg-[#B7D1EA]/5 shadow-xs" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                          <Cpu className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <span className="block text-sm font-black text-slate-900">
                            {t("serviceRequestModal.maintenance")}
                          </span>
                          <span className="block mt-0.5 text-xs text-slate-500 font-semibold leading-relaxed">
                            {t("serviceRequestModal.maintenanceDesc")}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Description and Photo Uploads */}
                {modalStep === 2 && (
                  <div className="space-y-5">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      {t("serviceRequestModal.step2Title")}
                    </h4>
                    
                    {/* Description input */}
                    <div className="space-y-2">
                      <label htmlFor="description" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                        {t("serviceRequestModal.description")}
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("serviceRequestModal.descriptionPlaceholder")}
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium outline-none focus:border-[#B7D1EA] transition-colors"
                        required
                      />
                    </div>

                    {/* Photo upload dropzone */}
                    <div className="space-y-3">
                      <span className="block text-xs font-black uppercase tracking-wider text-slate-500">
                        {t("serviceRequestModal.uploadPhotos")}
                      </span>
                      
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-slate-300 transition-all cursor-pointer bg-slate-50/50 flex flex-col items-center justify-center gap-2 group"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          multiple
                          accept="image/png, image/jpeg"
                          className="hidden"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <GsapSpinner className="h-8 w-8 text-slate-400" />
                        ) : (
                          <Camera className="h-8 w-8 text-slate-400 group-hover:text-slate-650 transition-colors" />
                        )}
                        <span className="block text-sm font-bold text-slate-700">
                          {t("serviceRequestModal.uploadPhotosDesc")}
                        </span>
                        <span className="block text-xs text-slate-400 font-semibold">
                          {locale === "th" ? "(ภาพอัปโหลดแล้ว: " : "(Uploaded: "}
                          {uploadedPhotos.length} / 5)
                        </span>
                      </div>

                      {/* Display thumbnail list */}
	                      {uploadedPhotos.length > 0 && (
	                        <div className="grid grid-cols-5 gap-3 pt-2">
	                          {uploadedPhotos.map((url, index) => (
	                            <div key={`${url}-${index}`} className="relative aspect-square rounded-xl border border-slate-150 overflow-hidden bg-slate-50">
	                              <NextImage
	                                src={url}
	                                alt="Problem preview"
	                                fill
	                                sizes="96px"
	                                className="object-cover"
	                                unoptimized
	                              />
	                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(index)}
                                className="absolute top-1 right-1 p-1 rounded-md bg-rose-50/90 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warnings / count restrictions */}
                      {uploadedPhotos.length < 3 && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200/50 px-3.5 py-2.5 text-xs font-semibold text-amber-700 mt-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>{t("serviceRequestModal.errPhotosCount")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirm Contacts & Appointment Date */}
                  {modalStep === 3 && (
                  <div className="space-y-5">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      {t("serviceRequestModal.step3Title")}
                    </h4>

                    {(serviceSystemId || serviceLocation) && (
                      <div className="rounded-xl border border-[#B7D1EA]/40 bg-[#B7D1EA]/10 px-4 py-3 text-xs font-semibold text-slate-700">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {t("serviceRequestModal.siteContext")}
                        </span>
                        {serviceSystemId && <span className="mt-1 block">{t("serviceRequestModal.systemId")}: <span className="font-mono">{serviceSystemId}</span></span>}
                        {serviceLocation && <span className="mt-1 block">{t("serviceRequestModal.gpsCaptured")}: <span className="font-mono">{serviceLocation.latitude.toFixed(6)}, {serviceLocation.longitude.toFixed(6)}</span></span>}
                      </div>
                    )}

                    {/* Contact Name */}
                    <div className="space-y-2">
                      <label htmlFor="contactName" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                        {t("serviceRequestModal.contactName")}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="contactName"
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. สมชาย รักดี"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#B7D1EA] transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-2">
                      <label htmlFor="contactPhone" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                        {t("serviceRequestModal.contactPhone")}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="contactPhone"
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="e.g. 0812345678"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#B7D1EA] transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Appointment Date Preference */}
                    <div className="space-y-2">
                      <label htmlFor="appointmentDate" className="block text-xs font-black uppercase tracking-wider text-slate-500">
                        {t("serviceRequestModal.appointmentDate")}
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          id="appointmentDate"
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#B7D1EA] transition-colors cursor-pointer"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Success State */}
                {modalStep === 4 && (
                  <GsapReveal className="text-center py-8 space-y-5">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-100">
                      <GsapPulse scale={1.1}>
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                      </GsapPulse>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-slate-900">
                        {t("serviceRequestModal.successTitle")}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                        {t("serviceRequestModal.successDesc")}
                      </p>
                    </div>

                    <div className="inline-block rounded-2xl border border-slate-150 bg-slate-50 p-4 text-left max-w-sm w-full mx-auto space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-400 uppercase tracking-wider">
                          {t("serviceRequestModal.requestId")}
                        </span>
                        <span className="font-mono font-black text-slate-800">
                          #{newRequestId.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="border-t border-slate-150 my-1 pt-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">{t("serviceRequestModal.contactLabel")}:</span>
                        <span className="font-bold text-slate-800">{contactName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">{t("serviceRequestModal.appointmentLabel")}:</span>
                        <span className="font-bold text-slate-800">{appointmentDate}</span>
                      </div>
                    </div>
                  </GsapReveal>
                )}

              </form>
            </main>

            {/* Modal Footer Controls */}
            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              {modalStep === 4 ? (
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="rounded-full bg-[#B7D1EA] text-slate-950 font-black px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-[#a5c2de] cursor-pointer"
                >
                  {t("serviceRequestModal.backToAssets")}
                </button>
              ) : (
                <>
                  {/* Prev button */}
                  {modalStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setModalStep((s) => (s - 1) as 1 | 2 | 3)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-800 hover:bg-slate-100 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {t("serviceRequestModal.btnPrev")}
                    </button>
                  )}

                  {/* Next / Submit buttons */}
                  {modalStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setModalStep((s) => (s + 1) as 1 | 2 | 3)}
                      disabled={modalStep === 2 && (uploadedPhotos.length < 3 || description.trim().length < 5 || isUploading)}
                      className="rounded-full bg-slate-950 text-white font-black px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-slate-850 disabled:opacity-50 cursor-pointer"
                    >
                      {t("serviceRequestModal.btnNext")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleServiceSubmit}
                      disabled={submittingRequest || !contactName.trim() || !contactPhone.trim() || !appointmentDate}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 text-white font-black px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-slate-850 disabled:opacity-50 cursor-pointer"
                    >
                      {submittingRequest && <GsapSpinner className="h-4 w-4" />}
                      {t("serviceRequestModal.btnSubmit")}
                    </button>
                  )}
                </>
              )}
            </footer>

          </div>
        </GsapReveal>
      )}

      {/* Refund Slip Image Preview Modal */}
      {previewSlipUrl && (
        <GsapReveal className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-xl">
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {t("refundTracker.viewRefundSlip")}
              </h4>
              <button 
                type="button"
                onClick={() => setPreviewSlipUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
	            <main className="p-6 flex items-center justify-center bg-slate-50">
	              <div className="relative h-[60vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200">
	                <NextImage
	                  src={previewSlipUrl}
	                  alt="Refund slip"
	                  fill
	                  sizes="(max-width: 768px) 100vw, 768px"
	                  className="object-contain"
	                  unoptimized
	                />
	              </div>
	            </main>
          </div>
        </GsapReveal>
      )}
    </div>
  );
}
