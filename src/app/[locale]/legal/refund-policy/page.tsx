import { Calendar, RefreshCw } from "@/components/ui/icons";
import { sanitizeHtml } from "@/lib/htmlSanitizer";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const instant = false;

export default async function RefundPolicyPage({ params }: PageProps) {
  const { locale } = await params;

  const content = locale === "th"
    ? `
      <h2>นโยบายการคืนเงินและการรับประกัน (Refund & Warranty Policy)</h2>
      <p>บริษัท โซลาร์ ดรีม จำกัด มุ่งมั่นที่จะมอบการบริการและผลิตภัณฑ์ระบบโซล่าเซลล์ที่มีคุณภาพสูงสุด นโยบายการคืนเงินและการรับประกันนี้ครอบคลุมถึงระบบ อุปกรณ์ และการยกเลิกสัญญา</p>
      
      <h3>1. การยกเลิกสัญญาและการคืนเงิน</h3>
      <ul>
        <li><strong>ก่อนการติดตั้ง:</strong> หากผู้ใช้บริการขอยกเลิกสัญญาก่อนการเข้าหน้างานติดตั้งของทีมช่างอย่างน้อย 7 วันทำการ บริษัทฯ จะทำการคืนเงินมัดจำเต็มจำนวน (หักค่าใช้จ่ายในการยื่นขออนุญาตกับทางราชการและค่าดำเนินงานจริง ถ้ามี)</li>
        <li><strong>หลังเริ่มงานติดตั้ง:</strong> หากมีการเริ่มจัดส่งอุปกรณ์หรือเริ่มงานประกอบติดตั้งโครงสร้างแล้ว จะไม่สามารถขอยกเลิกและขอคืนเงินในส่วนที่ดำเนินการแล้วได้</li>
        <li><strong>ระยะเวลาการคืนเงิน:</strong> ดำเนินการคืนเงินผ่านช่องทางโอนเข้าบัญชีผู้จองภายใน 15-30 วันทำการหลังการอนุมัติการยกเลิก</li>
      </ul>

      <h3>2. การรับประกันอุปกรณ์ระบบโซล่าเซลล์</h3>
      <p>อุปกรณ์หลักในระบบทั้งหมดได้รับการคุ้มครองภายใต้เงื่อนไขการรับประกันของผู้ผลิต (Manufacturer Warranty):</p>
      <ul>
        <li><strong>แผงโซล่าเซลล์ (Solar Panels):</strong> รับประกันประสิทธิภาพการผลิตไฟฟ้า (Linear Power Output Warranty) 25 ปี และรับประกันตัวสินค้า (Product Warranty) 12-15 ปี (ตามรุ่นที่เลือก)</li>
        <li><strong>อินเวอร์เตอร์ (Inverters):</strong> รับประกันตัวสินค้า 5-10 ปี (สามารถซื้อประกันเพิ่มได้สูงสุด 20 ปี)</li>
        <li><strong>การรับประกันงานติดตั้ง (Workmanship Warranty):</strong> รับประกันคุณภาพการติดตั้งและการกันซึมหลังคาโดยทีมงานช่างผู้เชี่ยวชาญของบริษัทฯ เป็นระยะเวลา 2 ปี นับจากวันที่ส่งมอบงาน</li>
      </ul>

      <h3>3. เงื่อนไขและข้อยกเว้นการรับประกัน</h3>
      <p>การรับประกันจะไม่ครอบคลุมในกรณีดังต่อไปนี้:</p>
      <ul>
        <li>ความเสียหายจากการดัดแปลง แก้ไข หรือซ่อมแซมระบบโดยบุคคลอื่นที่ไม่ใช่ทีมงานที่ได้รับอนุญาตจากบริษัทฯ</li>
        <li>ความเสียหายจากอุบัติเหตุ ภัยธรรมชาติ (เช่น ฟ้าผ่า พายุ พายุลูกเห็บ) หรือจากสัตว์/แมลง</li>
        <li>การใช้งานระบบผิดประเภท ผิดสเปค หรือไม่เป็นไปตามคู่มือการดูแลรักษา</li>
      </ul>
      <p>หากต้องการยื่นเคลมประกันหรือขอความช่วยเหลือกรุณาแจ้งข้อมูลผ่านเมนู Support ในหน้าระบบ หรือติดต่อสายด่วนบริการลูกค้าของเรา</p>
    `
    : `
      <h2>Refund & Warranty Policy</h2>
      <p>Solar Dream Co., Ltd. is committed to providing top-quality solar PV system installations and equipment. This policy details our cancellation, refund, and equipment warranty terms.</p>
      
      <h3>1. Contract Cancellation & Refunds</h3>
      <ul>
        <li><strong>Pre-installation:</strong> Cancellations made at least 7 business days prior to scheduled installation will receive a full refund of the deposit (minus actual government permitting fees and handling costs already incurred).</li>
        <li><strong>Post-commencement:</strong> Once equipment has been shipped or installation work has commenced, cancellations are no longer eligible for a refund on completed stages.</li>
        <li><strong>Refund Processing:</strong> Refunds are processed via bank transfer within 15-30 business days following cancellation approval.</li>
      </ul>

      <h3>2. System Equipment Warranties</h3>
      <p>All core equipment is covered under official manufacturer warranties:</p>
      <ul>
        <li><strong>Solar Panels:</strong> 25-year linear power output warranty, and 12-15 year product warranty depending on the chosen tier.</li>
        <li><strong>Inverters:</strong> 5-10 year product warranty (extendable up to 20 years).</li>
        <li><strong>Workmanship Warranty:</strong> We provide a 2-year warranty on roof waterproofing and installation quality from the date of final system handover.</li>
      </ul>

      <h3>3. Warranty Exclusions</h3>
      <p>Warranties do not cover damages caused by:</p>
      <ul>
        <li>Modifications, repairs, or maintenance carried out by unauthorized personnel.</li>
        <li>Accidents, force majeure (e.g., lightning strikes, storm damage, hail), or pests.</li>
        <li>Improper usage or negligence contrary to standard operations manual guidelines.</li>
      </ul>
      <p>To initiate a warranty claim or service request, please submit a ticket in the Support center or reach out to our service hotline.</p>
    `;

  const lastUpdated = locale === "th" ? "18 กรกฎาคม 2026" : "July 18, 2026";

  return (
    <PageShell className="bg-background px-6 py-12 md:py-20">
      <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#B7D1EA]/25 bg-[#B7D1EA]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800">
          <RefreshCw className="w-4 h-4 text-[#4A86C4]" />
          <span>Warranty & Return</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight font-sans">
          {locale === "th" ? "นโยบายการคืนเงินและการรับประกัน" : "Refund & Warranty Policy"}
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">
          <Calendar className="w-4 h-4" />
          <span>{locale === "th" ? "อัปเดตล่าสุด" : "Last updated"}: {lastUpdated}</span>
        </div>
      </div>

      <Card asChild className="bg-[#F5F2EB] p-8 shadow-sm md:p-12">
        <section>
        <div 
          className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-sans prose-headings:font-black prose-headings:text-slate-900 prose-a:text-[#4A86C4] prose-a:underline hover:prose-a:text-[#3B6FA6]"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
        </section>
      </Card>
      </div>
    </PageShell>
  );
}
