import { ShieldCheck, Calendar } from "@/components/ui/icons";
import { sanitizeHtml } from "@/lib/htmlSanitizer";
import { getCachedComplianceSettings } from "@/lib/layout-data";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";


interface PageProps {
  params: Promise<{ locale: string }>;
}

export const instant = false;

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  const config = await getCachedComplianceSettings();

  const defaultContent = locale === "th"
    ? `
      <h2>นโยบายความเป็นส่วนตัว (Privacy Policy)</h2>
      <p>อัปเดตล่าสุดเมื่อ: 18 กรกฎาคม 2026</p>
      <p>แพลตฟอร์ม SolarDream ให้ความสำคัญกับความเป็นส่วนตัวของคุณ นโยบายนี้อธิบายถึงวิธีการที่เรารวบรวม ใช้งาน และปกป้องข้อมูลส่วนบุคคลของคุณเมื่อคุณเข้าใช้งานเว็บไซต์และบริการประเมินระบบโซลาร์เซลล์ของเรา</p>
      
      <h3>1. ข้อมูลที่เรารวบรวม</h3>
      <p>เราจะเก็บรวบรวมข้อมูลส่วนบุคคลเท่าที่จำเป็นต่อการให้บริการเท่านั้น ได้แก่:</p>
      <ul>
        <li><strong>ข้อมูลบัญชีผู้ใช้งาน (Account Data):</strong> เมื่อคุณเข้าสู่ระบบผ่าน Google หรือ LINE ระบบจะรวบรวมข้อมูลพื้นฐานที่ได้รับความยินยอมจากแพลตฟอร์มนั้นๆ เช่น ชื่อ-นามสกุล, ที่อยู่อีเมล และรูปโปรไฟล์</li>
        <li><strong>ข้อมูลการประเมินและการออกแบบ (Service Data):</strong> ข้อมูลค่าไฟฟ้า, พฤติกรรมการใช้ไฟ, ตำแหน่งที่ตั้ง (เพื่อประเมินแสงแดด) และรายละเอียดที่เกี่ยวข้องเพื่อใช้ในการออกใบเสนอราคา</li>
        <li><strong>ข้อมูลการใช้งานและสถิติ (Analytics Data):</strong> ข้อมูลการใช้งานเว็บไซต์ เบราว์เซอร์ และอุปกรณ์ที่ใช้เข้าถึง</li>
      </ul>
      
      <h3>2. การใช้คุกกี้ (Cookies) และเครื่องมือวิเคราะห์ (Analytics)</h3>
      <p>เราใช้งานคุกกี้และเทคโนโลยีการติดตามที่คล้ายคลึงกันเพื่อปรับปรุงประสบการณ์การใช้งานของคุณ:</p>
      <ul>
        <li><strong>คุกกี้ที่จำเป็น (Strictly Necessary Cookies):</strong> ใช้สำหรับการจดจำสถานะการเข้าสู่ระบบ (Session) และความปลอดภัยของบัญชี ไม่สามารถปิดการใช้งานได้</li>
        <li><strong>เครื่องมือวิเคราะห์เชิงสถิติ (Umami Analytics):</strong> เราใช้ Umami ในการเก็บสถิติการเข้าชมเว็บไซต์แบบไม่ระบุตัวตน (Privacy-focused analytics) เพื่อวิเคราะห์ประสิทธิภาพของแพลตฟอร์ม</li>
        <li><strong>สิทธิในการจัดการคุกกี้ของคุณ:</strong> คุณมีสิทธิเต็มที่ในการเลือก "ยอมรับ" หรือ "ปฏิเสธ" การใช้งานคุกกี้ที่ไม่จำเป็นและการเก็บข้อมูลสถิติ (Analytics) ได้ตลอดเวลาผ่านแบนเนอร์คุกกี้ หรือเมนู "การตั้งค่าความเป็นส่วนตัว" (Privacy Settings) ในหน้าโปรไฟล์ของคุณ</li>
      </ul>
      
      <h3>3. การใช้งานและการเปิดเผยข้อมูล</h3>
      <p>ข้อมูลของคุณจะถูกนำไปใช้เพื่อ:</p>
      <ul>
        <li>สร้างโปรไฟล์ ออกใบเสนอราคา และติดตามความคืบหน้างานติดตั้งโซลาร์เซลล์</li>
        <li>ติดต่อสื่อสาร แจ้งเตือนสถานะเอกสาร หรือส่งข่าวสาร (ในกรณีที่คุณกดยินยอมรับข่าวสาร)</li>
      </ul>
      <p>เราไม่มีนโยบายขายหรือให้เช่าข้อมูลส่วนบุคคลของคุณแก่บุคคลที่สาม ข้อมูลอาจถูกแชร์กับทีมวิศวกรหรือพาร์ทเนอร์ที่เกี่ยวข้องกับการติดตั้งระบบของคุณเท่านั้น</p>
      
      <h3>4. สิทธิของเจ้าของข้อมูล (Data Subject Rights)</h3>
      <p>ภายใต้กฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิในการดำเนินการดังต่อไปนี้ผ่านเมนูการตั้งค่าในระบบ:</p>
      <ul>
        <li><strong>สิทธิในการเข้าถึง:</strong> คุณสามารถขอดาวน์โหลดข้อมูลที่ระบบบันทึกไว้ได้</li>
        <li><strong>สิทธิในการลบข้อมูล (Right to be Forgotten):</strong> คุณสามารถขอลบบัญชีผู้ใช้ได้ โดยระบบจะทำการปิดบังข้อมูลระบุตัวตน (Anonymization) แต่ยังคงเก็บข้อมูลเชิงสถิติของระบบโซลาร์เซลล์ไว้เพื่อความสมบูรณ์ของระบบบัญชีตามกฎหมาย</li>
      </ul>
      
      <h3>5. การติดต่อเรา</h3>
      <p>หากคุณมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อเราได้ทางช่องทางสนับสนุน (Support Desk) บนแพลตฟอร์ม SolarDream</p>
    `
    : `
      <h2>Privacy Policy</h2>
      <p>Last updated: July 18, 2026</p>
      <p>SolarDream Platform prioritizes your privacy. This policy explains how we collect, use, and protect your personal information when you access our website and solar system estimation services.</p>
      
      <h3>1. Information We Collect</h3>
      <p>We collect personal information only to the extent necessary to provide our services, including:</p>
      <ul>
        <li><strong>Account Data:</strong> When you log in via Google or LINE, the system collects basic information with your consent from that platform, such as your first and last name, email address, and profile picture.</li>
        <li><strong>Service Data:</strong> Electricity bill information, electricity consumption behavior, location coordinates (to evaluate sunlight potential), and related details used to generate quotations.</li>
        <li><strong>Analytics Data:</strong> Website usage statistics, browser type, and device information used to access the site.</li>
      </ul>
      
      <h3>2. Use of Cookies and Analytics</h3>
      <p>We use cookies and similar tracking technologies to improve your user experience:</p>
      <ul>
        <li><strong>Strictly Necessary Cookies:</strong> Used for remembering login status (session) and account security. These cannot be disabled.</li>
        <li><strong>Umami Analytics:</strong> We use Umami to collect anonymous website traffic statistics (privacy-focused analytics) to analyze platform performance.</li>
        <li><strong>Your Right to Manage Cookies:</strong> You have the full right to accept or decline the use of non-essential cookies and analytics tracking at any time via the cookie banner or the "Privacy Settings" menu on your profile page.</li>
      </ul>
      
      <h3>3. Use and Disclosure of Information</h3>
      <p>Your information will be used to:</p>
      <ul>
        <li>Create profiles, generate quotations, and track the progress of your solar installation project.</li>
        <li>Communicate, send document status notifications, or send newsletters (in case you opt-in to receive news).</li>
      </ul>
      <p>We do not sell or rent your personal information to third parties. Information may only be shared with engineers or partners involved in your system installation.</p>
      
      <h3>4. Data Subject Rights</h3>
      <p>Under the Personal Data Protection Act (PDPA), you have the right to take the following actions through the system settings menu:</p>
      <ul>
        <li><strong>Right to Access:</strong> You can request to download the information recorded in the system.</li>
        <li><strong>Right to be Forgotten (Deletion):</strong> You can request to delete your account. The system will anonymize your identity data but will retain the statistical solar system data for system bookkeeping completeness as required by law.</li>
      </ul>
      
      <h3>5. Contact Us</h3>
      <p>If you have any questions regarding this Privacy Policy, you can contact us via the Support Desk channel on the SolarDream platform.</p>
    `;

  const content = config?.privacyPolicy || defaultContent;
  
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
          <span>PDPA / GDPR Compliant</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight font-sans">
          {locale === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
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
