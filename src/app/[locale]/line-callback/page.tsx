"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, User } from "@/components/ui/icons";
import { getLineBotBasicId, checkLineLinkStatusByNonce, linkLineAccountViaLiff, checkLineLinkedStatus } from "@/app/actions/profile";
import { createClient } from "@/utils/supabase/client";
import LoginForm from "@/components/auth/LoginForm";
import { toast } from "sonner";
import HypotrochoidLoader from "@/components/ui/HypotrochoidLoader";
import { GsapPulse, GsapReveal, GsapSpinner } from "@/components/ui/GsapMotion";
import { useTranslations } from "next-intl";

// Dynamically load the LINE LIFF SDK script from CDN
const loadLiffScript = (): Promise<any> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if ((window as any).liff) return resolve((window as any).liff);

    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = () => {
      resolve((window as any).liff);
    };
    script.onerror = () => {
      resolve(null);
    };
    document.body.appendChild(script);
  });
};

function LineCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("LineCallback");

  const linkResult = searchParams.get("link"); // "ok" or "failed"
  const nonce = searchParams.get("nonce");

  const [status, setStatus] = useState<"loading" | "success" | "failed" | "timeout">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [dbSynced, setDbSynced] = useState(false);
  const [menuSwapped, setMenuSwapped] = useState(false);
  
  const [botBasicId, setBotBasicId] = useState("");
  const [isLineWebView, setIsLineWebView] = useState(false);

  // LIFF specific states
  const [isLiffMode, setIsLiffMode] = useState(false);
  const [liffLoaded, setLiffLoaded] = useState(false);
  const [liffProfile, setLiffProfile] = useState<any>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [liffId, setLiffId] = useState<string>("");
  const [liffObj, setLiffObj] = useState<any>(null);
  const [isDbLinked, setIsDbLinked] = useState(false);

  // Supabase auth state
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [lineLoading, setLineLoading] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttempts = useRef(0);

  // 1. Fetch user session and listen to changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        checkDatabaseLinkState();
      } else {
        setCheckingUser(false);
      }
    }).catch(() => {
      setCheckingUser(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        checkDatabaseLinkState();
      } else {
        setCurrentUser(null);
        setIsDbLinked(false);
        setCheckingUser(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Check database linking state
  const checkDatabaseLinkState = async () => {
    try {
      const result = await checkLineLinkedStatus();
      if (result.linked) {
        setIsDbLinked(true);
      } else {
        setIsDbLinked(false);
      }
    } catch (err) {
      console.error("Failed to check DB link status:", err);
    } finally {
      setCheckingUser(false);
    }
  };

  // 2. LIFF SDK Load & Initialization
  useEffect(() => {
    setIsLineWebView(/Line/i.test(navigator.userAgent));
    
    getLineBotBasicId().then((id) => {
      if (id) setBotBasicId(id);
    });

    const activeLiffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || "";
    setLiffId(activeLiffId);

    if (activeLiffId) {
      loadLiffScript().then((liff) => {
        if (liff) {
          setLiffObj(liff);
          setLiffLoaded(true);
          
          liff.init({ liffId: activeLiffId }).then(() => {
            // Check if we are running inside the LINE app WebView
            if (liff.isInClient()) {
              setIsLiffMode(true);
              setStatus("loading"); // Start in loading state
              
              if (!liff.isLoggedIn()) {
                liff.login();
              } else {
                liff.getProfile().then((profile: any) => {
                  setLiffProfile(profile);
                  // Stop loading once LIFF profile is resolved
                  setStatus("success"); 
                }).catch((err: any) => {
                  console.error("LIFF getProfile error:", err);
                  setLiffError("Failed to fetch LINE profile details.");
                  setStatus("failed");
                });
              }
            } else {
              // Not in LINE client, use standard flow
              initializeStandardFlow();
            }
          }).catch((err: any) => {
            console.error("LIFF init error:", err);
            // Fall back to standard flow if LIFF fails
            initializeStandardFlow();
          });
        } else {
          initializeStandardFlow();
        }
      });
    } else {
      initializeStandardFlow();
    }
  }, []);

  const initializeStandardFlow = () => {
    if (linkResult === "failed") {
      setStatus("failed");
      setErrorMessage(t("errors.cancelled"));
      return;
    }

    if (!linkResult || linkResult !== "ok") {
      setStatus("failed");
      setErrorMessage(t("errors.invalidRedirect"));
      return;
    }

    // Start polling DB status
    setStatus("loading");
    startDbPolling();
  };

  // 3. Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Standard Nonce Polling Flow
  const startDbPolling = () => {
    checkUserLinkStatus();

    pollIntervalRef.current = setInterval(() => {
      pollAttempts.current += 1;
      checkUserLinkStatus();

      if (pollAttempts.current >= 6) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStatus("timeout");
      }
    }, 1500);
  };

  const retryVerification = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttempts.current = 0;
    setErrorMessage(null);
    setDbSynced(false);
    setMenuSwapped(false);
    setCountdown(3);
    initializeStandardFlow();
  };

  const checkUserLinkStatus = async () => {
    if (!nonce) {
      setStatus("failed");
      setErrorMessage(t("errors.missingNonce"));
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    try {
      const result = await checkLineLinkStatusByNonce(nonce);
      
      if (result.success) {
        setDbSynced(true);
        
        setTimeout(() => {
          setMenuSwapped(true);
          setStatus("success");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }, 800);
      } else if (!result.pending) {
        setStatus("failed");
        setErrorMessage(result.error || t("errors.verificationFailed"));
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    } catch (err: any) {
      console.error("Error checking LINE link status:", err);
    }
  };

  // Success countdown to redirect / close window
  useEffect(() => {
    if (status !== "success" && status !== "timeout") return;
    
    // For LIFF mode, do not run standard redirect countdown unless already successfully linked
    if (isLiffMode && !dbSynced) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, isLiffMode, dbSynced]);

  const handleRedirect = () => {
    if (isLiffMode && liffObj) {
      liffObj.closeWindow();
    } else if (isLineWebView) {
      window.location.href = `https://line.me/R/ti/p/${botBasicId || "@solardream"}`;
    } else {
      router.push(`/${locale}/profile`);
    }
  };

  const handleLiffAccountLink = async () => {
    if (!liffProfile || !liffProfile.userId) {
      toast.error("Unable to resolve LINE profile ID.");
      return;
    }

    setLineLoading(true);
    try {
      const res = await linkLineAccountViaLiff(liffProfile.userId);
      if (res.error) {
        toast.error(res.error);
        setLiffError(res.error);
      } else {
        toast.success("Successfully linked your LINE account!");
        setDbSynced(true);
        setIsDbLinked(true);
        
        // Wait 2 seconds and close the LIFF WebView automatically
        setTimeout(() => {
          if (liffObj) {
            liffObj.closeWindow();
          }
        }, 2000);
      }
    } catch (err) {
      console.error("LIFF Account linking error:", err);
      toast.error("Connection error during account linking.");
    } finally {
      setLineLoading(false);
    }
  };

  // --- RENDER STATES ---

  // Loading page container at start or when checking user session
  if (checkingUser) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F0EEE9] px-4 py-12 relative overflow-hidden select-none">
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-10 max-w-md w-full shadow-lg shadow-slate-900/5 flex flex-col items-center text-center space-y-6">
          <HypotrochoidLoader size={96} color="#B7D1EA" className="text-[#B7D1EA]" />
          <GsapPulse className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {t("loadingCredentials")}
          </GsapPulse>
        </div>
      </div>
    );
  }

  // LIFF FLOW - Render login form if user is not authenticated on SolarDream
  if (isLiffMode && !currentUser) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F0EEE9] px-4 py-12 relative overflow-hidden">
        <GsapReveal className="bg-white border border-slate-200/60 rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-lg shadow-slate-900/5 flex flex-col items-center space-y-6">
          <div className="space-y-1 text-center">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#B7D1EA] uppercase">
              {t("accountLinking")}
            </span>
            <h1 className="text-xl font-black text-[#0F172A] tracking-tight">
              {t("signInTitle")}
            </h1>
            <p className="text-xs text-slate-500">
              {t("signInDescription")}
            </p>
          </div>
          <div className="w-full">
            <LoginForm />
          </div>
        </GsapReveal>
      </div>
    );
  }

  // LIFF FLOW - Authenticated confirmation card
  if (isLiffMode && currentUser && !dbSynced) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F0EEE9] px-4 py-12 relative overflow-hidden">
        <GsapReveal className="bg-white border border-slate-200/60 rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-lg shadow-slate-900/5 flex flex-col items-center text-center space-y-8">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              {t("confirmIntegration")}
            </span>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
              {t("linkTitle")}
            </h1>
          </div>

          {liffError && (
            <div className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-left text-rose-600 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{liffError}</span>
            </div>
          )}

          {/* LINE Profile Widget */}
          {liffProfile && (
            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex items-center gap-4 text-left">
              {liffProfile.pictureUrl ? (
                <img
                  src={liffProfile.pictureUrl}
                  alt={liffProfile.displayName}
                  className="w-14 h-14 rounded-full border border-slate-200 shrink-0 object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("lineProfile")}</span>
                <h4 className="text-sm font-extrabold text-slate-900">{liffProfile.displayName}</h4>
                <p className="text-[10px] text-slate-400 truncate max-w-[180px]">ID: {liffProfile.userId.slice(0, 8)}...</p>
              </div>
            </div>
          )}

          {/* Web App Profile Widget */}
          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("solardreamProfile")}</span>
            <h4 className="text-sm font-extrabold text-slate-900">{currentUser.email}</h4>
            <p className="text-[10px] text-slate-400">{t("signedIn")}</p>
          </div>

          <div className="w-full pt-4 space-y-3">
            <button
              type="button"
              disabled={lineLoading}
              onClick={handleLiffAccountLink}
              className="w-full py-4 bg-[#B7D1EA] hover:bg-[#B7D1EA]/85 text-slate-900 font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-sm cursor-pointer"
            >
              {lineLoading && <GsapSpinner className="w-4 h-4" />}
              เชื่อมต่อบัญชีสมาชิก (Link Account Now)
            </button>
            <button
              type="button"
              onClick={async () => {
                setCheckingUser(true);
                await supabase.auth.signOut();
                setCurrentUser(null);
                setCheckingUser(false);
              }}
              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-2xl transition-all"
            >
              สลับบัญชีใช้งาน (Switch Account)
            </button>
          </div>
        </GsapReveal>
      </div>
    );
  }

  // STANDARD WEB WEBVIEW REDIRECT FLOWS
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F0EEE9] px-4 py-12 relative overflow-hidden select-none">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#B7D1EA]/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F1D6B8]/20 rounded-full blur-3xl -z-10" />

      {/* Main Container Card */}
      <GsapReveal className="bg-white border border-slate-200/60 rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-lg shadow-slate-900/5 flex flex-col items-center text-center space-y-8">
        
        {/* Header Branding */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            {t("accountLinking")}
          </span>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            {t("integration")}
          </h1>
        </div>

        {/* LOADING STATE */}
        {status === "loading" && (
          <div className="w-full flex flex-col items-center space-y-8">
            <HypotrochoidLoader size={96} color="#B7D1EA" className="text-[#B7D1EA]" />

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-800">{t("finalizing")}</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t("finalizingDescription")}
              </p>
            </div>

            {/* Checklist */}
            <div className="w-full bg-[#F0EEE9]/40 border border-slate-200/50 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">1. LINE Platform Authorization</span>
              </div>
              
              <div className="flex items-center gap-3">
                {dbSynced ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <GsapSpinner className="w-5 h-5 text-[#B7D1EA] shrink-0" />
                )}
                <span className={`text-xs font-semibold ${dbSynced ? "text-slate-700" : "text-slate-500"}`}>
                  2. Webhook Profile Sync
                </span>
              </div>

              <div className="flex items-center gap-3">
                {menuSwapped ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className={`w-5 h-5 rounded-full border border-dashed flex items-center justify-center shrink-0 ${dbSynced ? "border-[#B7D1EA]" : "border-slate-300"}`}>
                    {dbSynced && <GsapSpinner className="w-3 h-3 text-[#B7D1EA]" />}
                  </div>
                )}
                <span className={`text-xs font-semibold ${menuSwapped ? "text-slate-700" : "text-slate-400"}`}>
                  3. Premium Rich Menu Setup
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === "success" && (
          <GsapReveal className="w-full flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-inner relative">
              <GsapPulse className="absolute inset-0 bg-emerald-100 rounded-full opacity-30" scale={1.16}>
                <span className="sr-only">Connection confirmed</span>
              </GsapPulse>
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">{t("successTitle")}</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t("successDescription")}
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200/50 px-4 py-2.5 rounded-xl">
              {isLiffMode
                ? "สำเร็จแล้ว! หน้าจอนี้จะปิดการใช้งานลงใน 2 วิ..."
                : isLineWebView 
                  ? `กำลังนำคุณกลับไปยังห้องแชท LINE ใน ${countdown} วิ...`
                  : `Redirecting to your profile in ${countdown}s...`
              }
            </div>

            <button
              onClick={handleRedirect}
              className="w-full py-4 bg-[#B7D1EA] hover:bg-[#B7D1EA]/85 text-slate-900 font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-[#B7D1EA]/25"
            >
              {isLiffMode 
                ? "ปิดหน้านี้ (Close Window)" 
                : isLineWebView ? "กลับไปยังแชท LINE (Open Chat)" : "Go to Profile"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </GsapReveal>
        )}

        {/* ERROR STATE */}
        {status === "failed" && (
          <GsapReveal className="w-full flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">{t("failedTitle")}</h3>
              <p className="text-xs text-rose-600 max-w-xs mx-auto">
                {errorMessage || t("errors.unexpected")}
              </p>
            </div>

            <div className="w-full pt-4 space-y-3">
              <button
                onClick={handleRedirect}
                className="w-full py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLiffMode 
                  ? "ปิดหน้าต่างนี้ (Close Window)"
                  : isLineWebView ? "กลับไปยังหน้าโปรไฟล์" : "Back to Profile"}
              </button>
              
              <button
                onClick={retryVerification}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("retry")}
              </button>
            </div>
          </GsapReveal>
        )}

        {/* TIMEOUT STATE */}
        {status === "timeout" && (
          <GsapReveal className="w-full flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">{t("pendingTitle")}</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t("pendingDescription")}
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200/50 px-4 py-2.5 rounded-xl">
              {isLineWebView 
                ? `กลับไปยังห้องแชท LINE ใน ${countdown} วิ...`
                : `Redirecting in ${countdown}s`
              }
            </div>

            <button
              onClick={handleRedirect}
              className="w-full py-4 bg-[#B7D1EA] hover:bg-[#B7D1EA]/85 text-slate-900 font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isLineWebView ? "กลับไปยังแชท LINE (Open Chat)" : "Check Profile Card"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </GsapReveal>
        )}

      </GsapReveal>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] bg-[#F0EEE9]" aria-hidden="true" />}>
      <LineCallbackContent />
    </Suspense>
  );
}
