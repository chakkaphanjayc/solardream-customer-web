"use client";

import React, { useState } from "react";
import {
  Download,
  CheckCircle2,
  Clock,
  FileText,
} from "@/components/ui/icons";
import { GsapSpinner } from "@/components/ui/GsapMotion";
import { useLocale, useTranslations } from "next-intl";

interface ProjectPhase {
  id: string;
  nameEn: string;
  nameTh: string;
  position: number;
  documents: Array<{
    code: number;
    title: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    url?: string;
  }>;
}

interface ProjectProgressionCanvasProps {
  phases: ProjectPhase[];
  currentPhase: string;
  onPhaseSelect: (phase: string) => void;
}

export default function ProjectProgressionCanvas({
  phases,
  currentPhase,
  onPhaseSelect,
}: ProjectProgressionCanvasProps) {
  const locale = useLocale();
  const t = useTranslations("ProjectProgressionCanvas");
  const [expandedPhase, setExpandedPhase] = useState<string>(currentPhase);

  const getPhaseStatus = (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return "pending";
    const allCompleted = phase.documents.every((d) => d.status === "COMPLETED");
    const anyInProgress = phase.documents.some((d) => d.status === "IN_PROGRESS");
    if (allCompleted) return "completed";
    if (anyInProgress) return "in-progress";
    return "pending";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("status.complete")}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#7CA8D0]/30 bg-[#DCE8F5] px-3 py-1 text-xs font-semibold text-[#4F7FA8]">
            <GsapSpinner className="h-3.5 w-3.5" />
            {t("status.inProgress")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            {t("status.pending")}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#F7F6F3] bg-[#F0EEE9] shadow-lg">
      {/* Header */}
      <div className="border-b border-[#F7F6F3] bg-[#E6E3DC] px-6 py-5 text-[#2E2C27] sm:px-8 sm:py-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#2E2C27]">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm font-medium text-[#4E4B44]">
          {t("description")}
        </p>
      </div>

      {/* Vertical Stepper */}
      <div className="space-y-4 p-4 sm:p-6">
        {phases.map((phase, index) => {
          const isActive = phase.id === expandedPhase;
          const status = getPhaseStatus(phase.id);
          const statusColors = {
            completed: "rounded-[20px] border border-emerald-200 bg-emerald-50/50",
            "in-progress": "rounded-[20px] border border-[#7CA8D0]/30 bg-[#E6E3DC]",
            pending: "rounded-[20px] border border-[#F7F6F3] bg-[#F0EEE9]",
          };

          return (
            <div
              key={phase.id}
              className={`transition-all ${statusColors[status as keyof typeof statusColors]}`}
            >
              {/* Phase Header */}
              <button
                onClick={() => {
                  setExpandedPhase(isActive ? "" : phase.id);
                  onPhaseSelect(phase.id);
                }}
                className={`w-full px-6 py-4 rounded-[20px] transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-[#DCE8F5] border border-[#7CA8D0]/30 shadow-sm"
                    : "bg-[#F0EEE9] border border-[#F7F6F3] hover:bg-[#E6E3DC]"
                }`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      status === "completed"
                        ? "bg-emerald-500 text-white"
                        : status === "in-progress"
                          ? "bg-[#B7D1EA] text-white"
                          : "bg-[#F7F6F3] text-[#4E4B44]"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#2E2C27]">
                      {locale === "th" ? phase.nameTh : phase.nameEn}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#4E4B44]">
                      {locale === "th" ? phase.nameEn : phase.nameTh}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {getStatusBadge(status === "completed" ? "COMPLETED" : status === "in-progress" ? "IN_PROGRESS" : "PENDING")}
                </div>
              </button>

              {/* Documents Hub */}
              {isActive && (
                <div className="ml-2 mt-3 rounded-[20px] border border-[#F7F6F3] bg-[#E6E3DC] p-4 sm:ml-6 sm:p-5">
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-tight text-[#2E2C27]">
                    {t("requiredDocuments")}
                  </h4>

                  <div className="space-y-3">
                    {phase.documents.map((doc) => (
                      <div
                        key={doc.code}
                        className="flex items-center justify-between rounded-2xl border border-[#F7F6F3] bg-[#F0EEE9] p-4 transition-all hover:border-[#CBC7BE]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCE8F5] text-[#4F7FA8]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#2E2C27]">
                              {doc.title}
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-[#4E4B44]">
                              {t("documentNumber", { code: doc.code })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {doc.status === "COMPLETED" && doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-[#B7D1EA] hover:bg-[#A5C2DE] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                              {t("download")}
                            </a>
                          ) : doc.status === "IN_PROGRESS" ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#7CA8D0]/30 bg-[#DCE8F5] px-3.5 py-1.5 text-xs font-semibold text-[#4F7FA8]">
                              <GsapSpinner className="h-3.5 w-3.5" />
                              {t("status.processing")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3.5 py-1.5 text-xs font-semibold text-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              {t("status.pending")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
