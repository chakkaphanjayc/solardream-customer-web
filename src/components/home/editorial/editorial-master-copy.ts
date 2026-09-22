export type MasterPartner = Readonly<{
  name: string;
  descriptor: string;
}>;

export type MasterMetric = Readonly<{
  value: number | null;
  display: string;
  label: string;
  note: string;
}>;

export type MasterBenefit = Readonly<{
  index: string;
  label: string;
  title: string;
  description: string;
}>;

export type MasterCopy = Readonly<{
  hardware: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    status: string;
    partnersLeft: readonly MasterPartner[];
    partnersRight: readonly MasterPartner[];
  }>;
  impact: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    metrics: readonly MasterMetric[];
  }>;
  challenge: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    items: readonly string[];
    calloutLabel: string;
    callout: string;
  }>;
  benefits: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    items: readonly MasterBenefit[];
  }>;
  proof: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    projectLabel: string;
    locationLabel: string;
    sizeLabel: string;
    yearLabel: string;
    empty: string;
  }>;
  preloaderSystem: string;
  preloader: string;
  backToTop: string;
}>;

const EN_COPY: MasterCopy = {
  hardware: {
    eyebrow: "02 / HARDWARE ECOSYSTEM",
    title: "Tier-1 hardware, chosen for the system—not the sales pitch.",
    description:
      "SolarDream keeps the engineering conversation clear: proven equipment, compatible architecture, and a path that can be explained before it reaches your roof.",
    status: "CURATED HARDWARE INDEX",
    partnersLeft: [
      { name: "Huawei", descriptor: "Smart Inverter" },
      { name: "Enphase", descriptor: "IQ8 Microinverter" },
      { name: "LONGi", descriptor: "Hi-MO X6 Tier-1" },
      { name: "Tesla", descriptor: "Powerwall 3" },
      { name: "Sungrow", descriptor: "Hybrid Systems" },
      { name: "JA Solar", descriptor: "DeepBlue 4.0" },
    ],
    partnersRight: [
      { name: "Canadian Solar", descriptor: "BiHiKu7" },
      { name: "SMA Solar", descriptor: "Sunny Boy" },
      { name: "Trina Solar", descriptor: "Vertex S+" },
      { name: "Growatt", descriptor: "MIN Series" },
      { name: "Solis", descriptor: "On-Grid Gateway" },
    ],
  },
  impact: {
    eyebrow: "03 / WHO WE ARE & IMPACT",
    title: "Engineering clarity between sunlight, the grid, and everyday life.",
    description:
      "We connect solar irradiance, real electricity use, roof constraints, and MEA/PEA requirements so the first answer is useful—not just impressive.",
    metrics: [
      { value: 60, display: "060%", label: "Typical daytime bill opportunity", note: "A planning signal, not a guaranteed outcome." },
      { value: 100, display: "100%", label: "Grid-ready planning", note: "Designed around MEA / PEA connection rules." },
      { value: 25, display: "025+", label: "Year linear performance", note: "Long-term system thinking from the start." },
      { value: null, display: "24/7", label: "Monitoring mindset", note: "Keep the important system signals close." },
    ],
  },
  challenge: {
    eyebrow: "04 / THE CHALLENGE",
    title: "Solar should not be a guessing game—or a problem you inherit later.",
    description:
      "Oversized packages, daytime systems for nighttime habits, and unclear rapid-shutdown requirements can turn a good idea into an expensive compromise.",
    items: [
      "A bigger package is not automatically a better return.",
      "Daylight production must match when the home actually uses power.",
      "Safety, zero-export, and rapid-shutdown decisions belong in the plan early.",
    ],
    calloutLabel: "SOLARDREAM PRINCIPLE",
    callout:
      "We do not focus on selling the largest system. We focus on the strongest return for every square metre of your roof.",
  },
  benefits: {
    eyebrow: "06 / WHAT YOU GET",
    title: "Transparency from the first click to the day the switch turns on.",
    description:
      "A clear system plan gives you something better than more options: a reason for every option.",
    items: [
      {
        index: "01",
        label: "ACCURACY",
        title: "A closer first estimate",
        description: "Use your bill, roof context, and solar data instead of a one-size-fits-all package.",
      },
      {
        index: "02",
        label: "TRANSPARENCY",
        title: "A spec you can read",
        description: "See the equipment path, assumptions, and costs without hidden steps or mystery line items.",
      },
      {
        index: "03",
        label: "END-TO-END",
        title: "A connected handoff",
        description: "Keep engineering review, MEA/PEA coordination, and installation support on one track.",
      },
    ],
  },
  proof: {
    eyebrow: "08 / PROOF & CASE STUDIES",
    title: "Solar already living on real roofs.",
    description:
      "Browse the published project records currently available in SolarDream's showcase. Open a case to see the details behind the installation.",
    projectLabel: "CASE",
    locationLabel: "LOCATION",
    sizeLabel: "SYSTEM",
    yearLabel: "YEAR",
    empty: "No published case studies are available right now.",
  },
  preloaderSystem: "SD / SYSTEM INITIALIZE",
  preloader: "Connecting to the solar planning grid and hardware index...",
  backToTop: "Back to top",
};

const TH_COPY: MasterCopy = {
  hardware: {
    eyebrow: "02 / HARDWARE ECOSYSTEM",
    title: "อุปกรณ์ Tier-1 ที่เลือกจากความเหมาะสมของระบบ ไม่ใช่แค่คำขาย",
    description:
      "SolarDream ทำให้เรื่องวิศวกรรมเข้าใจง่ายขึ้น ด้วยอุปกรณ์ที่พิสูจน์แล้ว สถาปัตยกรรมที่เข้ากันได้ และเส้นทางที่อธิบายได้ก่อนขึ้นหลังคา",
    status: "CURATED HARDWARE INDEX",
    partnersLeft: [
      { name: "Huawei", descriptor: "Smart Inverter" },
      { name: "Enphase", descriptor: "IQ8 Microinverter" },
      { name: "LONGi", descriptor: "Hi-MO X6 Tier-1" },
      { name: "Tesla", descriptor: "Powerwall 3" },
      { name: "Sungrow", descriptor: "Hybrid Systems" },
      { name: "JA Solar", descriptor: "DeepBlue 4.0" },
    ],
    partnersRight: [
      { name: "Canadian Solar", descriptor: "BiHiKu7" },
      { name: "SMA Solar", descriptor: "Sunny Boy" },
      { name: "Trina Solar", descriptor: "Vertex S+" },
      { name: "Growatt", descriptor: "MIN Series" },
      { name: "Solis", descriptor: "On-Grid Gateway" },
    ],
  },
  impact: {
    eyebrow: "03 / WHO WE ARE & IMPACT",
    title: "เราเชื่อมแสงแดด การไฟฟ้า และชีวิตประจำวันให้เป็นแผนเดียวกัน",
    description:
      "เราเชื่อมข้อมูลแสงแดด การใช้ไฟจริง ข้อจำกัดของหลังคา และข้อกำหนด MEA/PEA เพื่อให้คำตอบแรกนำไปใช้ต่อได้ ไม่ใช่แค่ดูดี",
    metrics: [
      { value: 60, display: "060%", label: "โอกาสจากค่าไฟช่วงกลางวัน", note: "เป็นสัญญาณเพื่อวางแผน ไม่ใช่การรับประกันผลลัพธ์" },
      { value: 100, display: "100%", label: "วางแผนพร้อมเชื่อมการไฟฟ้า", note: "ออกแบบโดยคำนึงถึงกติกา MEA / PEA" },
      { value: 25, display: "025+", label: "ปีของประสิทธิภาพเชิงเส้น", note: "คิดเรื่องระบบระยะยาวตั้งแต่ต้น" },
      { value: null, display: "24/7", label: "มุมมองการมอนิเตอร์", note: "ข้อมูลสำคัญของระบบอยู่ใกล้คุณเสมอ" },
    ],
  },
  challenge: {
    eyebrow: "04 / THE CHALLENGE",
    title: "การติดโซลาร์ไม่ควรเป็นเรื่องเดาสุ่ม หรือเป็นปัญหาที่คุณต้องรับต่อภายหลัง",
    description:
      "ระบบที่ใหญ่เกินไป การใช้ไฟกลางคืนที่ไม่ตรงกับการผลิตกลางวัน และข้อกำหนด rapid shutdown ที่ไม่ชัดเจน อาจเปลี่ยนไอเดียที่ดีให้กลายเป็นต้นทุนที่ไม่จำเป็น",
    items: [
      "ระบบที่ใหญ่กว่า ไม่ได้แปลว่าคืนทุนดีกว่าเสมอไป",
      "การผลิตช่วงกลางวันต้องสอดคล้องกับเวลาที่บ้านใช้ไฟจริง",
      "เรื่องความปลอดภัย zero-export และ rapid shutdown ควรอยู่ในแผนตั้งแต่ต้น",
    ],
    calloutLabel: "SOLARDREAM PRINCIPLE",
    callout:
      "เราไม่เน้นขายระบบที่ใหญ่ที่สุด แต่เน้นระบบที่สร้างผลตอบแทนสูงสุดต่อทุกตารางเมตรของหลังคาคุณ",
  },
  benefits: {
    eyebrow: "06 / WHAT YOU GET",
    title: "โปร่งใสตั้งแต่คลิกแรกจนถึงวันที่เปิดสวิตช์ใช้งาน",
    description: "แผนระบบที่ชัดเจนให้สิ่งที่ดีกว่าตัวเลือกจำนวนมาก นั่นคือเหตุผลของทุกตัวเลือก",
    items: [
      {
        index: "01",
        label: "ACCURACY",
        title: "ประมาณการที่ใกล้เคียงขึ้น",
        description: "เริ่มจากค่าไฟ บริบทหลังคา และข้อมูลแดดจริง แทนแพ็กเกจแบบเดียวสำหรับทุกบ้าน",
      },
      {
        index: "02",
        label: "TRANSPARENCY",
        title: "สเปกที่อ่านและตรวจสอบได้",
        description: "เห็นเส้นทางอุปกรณ์ สมมติฐาน และค่าใช้จ่ายโดยไม่ต้องเดาว่ามีขั้นตอนอะไรซ่อนอยู่",
      },
      {
        index: "03",
        label: "END-TO-END",
        title: "ส่งต่องานอย่างต่อเนื่อง",
        description: "เก็บงานวิศวกรรม การประสาน MEA/PEA และการติดตั้งไว้ในเส้นทางเดียวกัน",
      },
    ],
  },
  proof: {
    eyebrow: "08 / PROOF & CASE STUDIES",
    title: "โซลาร์ที่อยู่บนหลังคาจริงแล้ววันนี้",
    description:
      "ดูข้อมูลโครงการที่เผยแพร่ใน showcase ของ SolarDream และเปิดแต่ละเคสเพื่อดูรายละเอียดการติดตั้ง",
    projectLabel: "CASE",
    locationLabel: "LOCATION",
    sizeLabel: "SYSTEM",
    yearLabel: "YEAR",
    empty: "ขณะนี้ยังไม่มีเคสที่เผยแพร่",
  },
  preloaderSystem: "SD / กำลังเริ่มระบบ",
  preloader: "กำลังเชื่อมต่อข้อมูลวางแผนโซลาร์และดัชนีอุปกรณ์...",
  backToTop: "กลับด้านบน",
};

export function getMasterCopy(locale: string): MasterCopy {
  return locale === "th" ? TH_COPY : EN_COPY;
}
