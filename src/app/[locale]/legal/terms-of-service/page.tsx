import { ShieldCheck, Calendar } from "@/components/ui/icons";
import { sanitizeHtml } from "@/lib/htmlSanitizer";
import { getCachedComplianceSettings } from "@/lib/layout-data";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";


interface PageProps {
  params: Promise<{ locale: string }>;
}


export default async function TermsOfServicePage({ params }: PageProps) {
  const { locale } = await params;
  const config = await getCachedComplianceSettings();

  const defaultContent = locale === "th"
    ? `
      <h2>เงื่อนไขการให้บริการ (Terms of Service)</h2>
      <p>อัปเดตล่าสุดเมื่อ: 18 กรกฎาคม 2026</p>
      <p>การเข้าถึงและใช้งานแพลตฟอร์ม SolarDream ("เรา", "แพลตฟอร์ม") ถือว่าคุณ ("ผู้ใช้งาน") ได้อ่าน เข้าใจ และตกลงยอมรับเงื่อนไขการให้บริการฉบับนี้อย่างครบถ้วน</p>
      
      <h3>1. คำอธิบายบริการ (Description of Service)</h3>
      <p>SolarDream เป็นแพลตฟอร์มซอฟต์แวร์ประเมินและวางแผนระบบโซลาร์เซลล์สำหรับที่พักอาศัย บริการของเรารวมถึงการประเมินแสงแดด การคำนวณขนาดระบบ การออกใบเสนอราคาดิจิทัล และการติดตามความคืบหน้าของโครงการ</p>
      
      <h3>2. การสร้างบัญชีผู้ใช้งาน (User Accounts)</h3>
      <ul>
        <li>ผู้ใช้งานสามารถสร้างบัญชีผ่านผู้ให้บริการยืนยันตัวตนบุคคลที่สาม (Google หรือ LINE)</li>
        <li>ผู้ใช้งานต้องรับผิดชอบในการรักษาความปลอดภัยของบัญชีตนเอง หากพบการใช้งานที่ผิดปกติ กรุณาแจ้งให้เราทราบทันที</li>
        <li>เราขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ใช้งาน หากพบว่ามีการละเมิดเงื่อนไข หรือใช้แพลตฟอร์มในทางที่ผิดกฎหมาย</li>
      </ul>
      
      <h3>3. ข้อจำกัดความรับผิดชอบด้านการประเมิน (Disclaimer of Estimates)</h3>
      <ul>
        <li><strong>ข้อมูลเชิงประมาณการ:</strong> ตัวเลขการคำนวณแสงแดด (Dynamic Weather), การประหยัดค่าไฟรายเดือน, และระยะเวลาคืนทุน เป็นเพียง "การประมาณการเชิงสถิติและซอฟต์แวร์" เท่านั้น</li>
        <li><strong>การออกแบบขั้นสุดท้ายและราคาที่แท้จริง:</strong> จะต้องผ่านการประเมินและยืนยันโดยวิศวกรผู้เชี่ยวชาญจากการสำรวจหน้างานจริงอีกครั้ง แพลตฟอร์มจะไม่รับผิดชอบต่อความคลาดเคลื่อนของตัวเลขทางการเงินใดๆ ที่เกิดจากปัจจัยภายนอกที่ไม่สามารถควบคุมได้</li>
      </ul>
      
      <h3>4. ทรัพย์สินทางปัญญา (Intellectual Property)</h3>
      <ul>
        <li>โค้ดซอฟต์แวร์, การออกแบบ User Interface (UI), กราฟิก, มาสคอต (Solia) และเนื้อหาทั้งหมดบนแพลตฟอร์ม SolarDream เป็นทรัพย์สินทางปัญญาของเรา ได้รับการคุ้มครองตามกฎหมายลิขสิทธิ์</li>
        <li>ห้ามมิให้ผู้ใดคัดลอก ดัดแปลง หรือนำส่วนหนึ่งส่วนใดของแพลตฟอร์มไปใช้เพื่อการค้าโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</li>
      </ul>
      
      <h3>5. การปฏิบัติตามกฎหมายความเป็นส่วนตัว</h3>
      <p>การใช้งานแพลตฟอร์มนี้อยู่ภายใต้ นโยบายความเป็นส่วนตัว (Privacy Policy) ของเรา ซึ่งครอบคลุมถึงวิธีการที่เราดูแลรักษาข้อมูลส่วนบุคคลของคุณ</p>
      
      <h3>6. การปรับปรุงเงื่อนไข</h3>
      <p>เราอาจทำการปรับปรุงหรือแก้ไขเงื่อนไขการให้บริการนี้เป็นระยะ เราจะแจ้งให้คุณทราบเมื่อมีการเปลี่ยนแปลงที่สำคัญผ่านทางอีเมลหรือการแจ้งเตือนบนแพลตฟอร์ม การที่คุณยังคงใช้งานแพลตฟอร์มต่อไปหลังจากการอัปเดต ถือว่าคุณยอมรับเงื่อนไขใหม่นั้นแล้ว</p>
    `
    : `
      <h2>Terms of Service</h2>
      <p>Last updated: July 18, 2026</p>
      <p>By accessing and using the SolarDream platform ("we", "us", "our", the "Platform"), you ("User") acknowledge that you have read, understood, and agree to be bound by these Terms of Service in their entirety.</p>
      
      <h3>1. Description of Service</h3>
      <p>SolarDream is a software platform for residential solar system estimation and planning. Our services include solar potential estimation, system sizing calculations, digital quotation generation, and project progress tracking.</p>
      
      <h3>2. User Accounts</h3>
      <ul>
        <li>Users can create an account through third-party authentication providers (Google or LINE).</li>
        <li>Users are responsible for maintaining the security of their own accounts. If you detect any unauthorized activity, please notify us immediately.</li>
        <li>We reserve the right to suspend or terminate user accounts if we find violations of these terms or misuse of the platform in an illegal manner.</li>
      </ul>
      
      <h3>3. Disclaimer of Estimates</h3>
      <ul>
        <li><strong>Estimated Information:</strong> Sunlight calculations (Dynamic Weather), monthly electricity bill savings, and payback period are strictly "statistical and software estimates" only.</li>
        <li><strong>Final Design and Actual Pricing:</strong> Must be evaluated and verified by qualified engineers through an actual site survey. The platform is not responsible for any financial discrepancy resulting from uncontrollable external factors.</li>
      </ul>
      
      <h3>4. Intellectual Property</h3>
      <ul>
        <li>Software code, User Interface (UI) design, graphics, mascot (Solia), and all contents on the SolarDream platform are our intellectual property and protected by copyright laws.</li>
        <li>No part of the platform may be copied, modified, or commercially distributed without our express written permission.</li>
      </ul>
      
      <h3>5. Compliance with Privacy Law</h3>
      <p>The usage of this platform is subject to our Privacy Policy, which details how we handle and protect your personal data.</p>
      
      <h3>6. Updates to Terms</h3>
      <p>We may update or modify these Terms of Service from time to time. We will notify you of any significant changes via email or platform notifications. Your continued use of the platform after updates indicates your acceptance of the revised terms.</p>
    `;

  const content = config?.termsAndConditions || defaultContent;
  
  const lastUpdated = config?.updatedAt ? new Date(config.updatedAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }) : "ล่าสุด";

  return (
    <PageShell className="bg-background px-6 py-12 md:py-20">
      <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#B7D1EA]/25 bg-[#B7D1EA]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800">
          <ShieldCheck className="w-4 h-4 text-[#4A86C4]" />
          <span>E-Commerce Compliant</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight font-sans">
          {locale === "th" ? "เงื่อนไขการให้บริการ" : "Terms of Service"}
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
