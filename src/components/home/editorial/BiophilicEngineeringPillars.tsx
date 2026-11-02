import { FiFileText, FiHome, FiMessageCircle, FiSun } from "react-icons/fi";

interface BiophilicEngineeringPillarsProps {
  locale: string;
}

export default function BiophilicEngineeringPillars({
  locale,
}: BiophilicEngineeringPillarsProps) {
  const isTh = locale === "th";
  const principles = isTh
    ? [
        {
          index: "01",
          icon: FiHome,
          title: "เริ่มจากหลังคาและหน้างาน",
          body: "วัสดุ สภาพหลังคา ทิศทาง และเงาบังช่วยกำหนดรูปแบบติดตั้งและพลังงานที่คาดการณ์ได้",
        },
        {
          index: "02",
          icon: FiSun,
          title: "ออกแบบตามการใช้ไฟ",
          body: "ค่าไฟและช่วงเวลาที่ใช้พลังงานช่วยกำหนดขนาดระบบ แบตเตอรี่เป็นอีกทางเลือกตามอุปกรณ์ที่รองรับ",
        },
        {
          index: "03",
          icon: FiFileText,
          title: "เห็นรายละเอียดก่อนตัดสินใจ",
          body: "ใบเสนอราคาควรแสดงรายการอุปกรณ์ ขอบเขตติดตั้ง สมมติฐาน และเงื่อนไขรับประกันของระบบที่เลือก",
        },
        {
          index: "04",
          icon: FiMessageCircle,
          title: "ติดตามข้อมูลได้ต่อเนื่อง",
          body: "โปรไฟล์ลูกค้ารวบรวมใบเสนอราคา เอกสารโครงการ และข้อมูลความคืบหน้าที่พร้อมใช้งานไว้ด้วยกัน",
        },
      ]
    : [
        {
          index: "01",
          icon: FiHome,
          title: "Start with the roof and site",
          body: "Roof material, condition, orientation, and shade shape the installation plan and expected output.",
        },
        {
          index: "02",
          icon: FiSun,
          title: "Plan around energy use",
          body: "Your bill and when you use power help determine system size. Battery storage depends on equipment compatibility.",
        },
        {
          index: "03",
          icon: FiFileText,
          title: "See the details before deciding",
          body: "A quotation should show selected equipment, installation scope, estimate assumptions, and applicable warranty terms.",
        },
        {
          index: "04",
          icon: FiMessageCircle,
          title: "Keep project information close",
          body: "Your customer profile brings together the quotation, project documents, and available progress updates.",
        },
      ];

  return (
    <section
      className="bg-[var(--background)] py-16 sm:py-20 lg:py-24"
      aria-labelledby="pillars-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-foreground)]">
            {isTh ? "แนวทางการวางแผน" : "How We Plan"}
          </p>
          <h2
            id="pillars-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-[var(--sd-ink)] sm:text-4xl"
          >
            {isTh
              ? "ระบบโซลาร์ที่เริ่มจากบ้านของคุณ"
              : "A solar plan shaped around your home"}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--sd-text-secondary)]">
            {isTh
              ? "เริ่มจากข้อมูลหน้างานและการใช้ไฟ แล้วค่อยเปรียบเทียบอุปกรณ์ ราคา และขอบเขตงาน"
              : "Start with the site and your energy use, then compare equipment, pricing, and project scope."}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {principles.map(({ index, icon: Icon, title, body }) => (
            <article
              key={index}
              className="flex min-h-64 flex-col rounded-2xl border border-[rgba(60,86,122,0.14)] bg-white p-6 shadow-sm sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-[#B7D1EA]/55 text-[#0F172A]">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="font-mono text-xs font-semibold tracking-widest text-[var(--muted-foreground)]">
                  {index}
                </span>
              </div>
              <h3 className="mt-7 text-lg font-semibold leading-6 text-[var(--sd-ink)]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--sd-text-secondary)]">
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
