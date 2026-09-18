"use client";

import { SolarProgressStepper } from "@/components/ui/solar-system";

type BuildStep = "design" | "contact";

interface BuildStepperProps {
  currentStep: BuildStep;
  onStepClick: (step: BuildStep) => void;
  locale: string;
}

export default function BuildStepper({
  currentStep,
  onStepClick,
  locale,
}: BuildStepperProps) {
  const isThai = locale === "th";

  return (
    <SolarProgressStepper
      ariaLabel={isThai ? "ขั้นตอนการสร้างระบบ" : "Build steps"}
      className="solar-build-stepper"
      items={[
        {
          id: "design",
          label: isThai ? "เลือกระบบ & อุปกรณ์" : "System design & options",
          description: isThai
            ? "เลือกขนาดและสเปกที่ต้องการ"
            : "Configure capacity & tiers",
          status: currentStep === "contact" ? "complete" : "current",
          statusLabel:
            currentStep === "contact"
              ? isThai
                ? "เสร็จแล้ว"
                : "Done"
              : undefined,
        },
        {
          id: "contact",
          label: isThai
            ? "ข้อมูลผู้ติดต่อ & นัดหมาย"
            : "Contact details & review",
          description: isThai
            ? "ส่งข้อมูลให้วิศวกรประเมินจริง"
            : "Submit for engineering review",
          status: currentStep === "contact" ? "current" : "locked",
          statusLabel:
            currentStep === "contact"
              ? isThai
                ? "ขั้นตอนถัดไป"
                : "Up next"
              : isThai
                ? "ยังไม่เปิด"
                : "Locked",
        },
      ]}
      onSelect={(id) => {
        if (id === "design" || id === "contact") {
          onStepClick(id);
        }
      }}
    />
  );
}
