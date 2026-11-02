export type SalesHomeStep = Readonly<{
  index: string;
  title: string;
  description: string;
  detail: string;
}>;

export type SalesHomeSystem = Readonly<{
  index: string;
  tag: string;
  title: string;
  description: string;
  features: readonly string[];
}>;

export type SalesHomeCopy = Readonly<{
  hero: Readonly<{
    eyebrow: string;
    titleLineOne: string;
    titleLineTwo: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    visualLabel: string;
    visualStatus: string;
    visualTitle: string;
    visualNote: string;
    visualRows: readonly Readonly<{ label: string; value: string }>[];
    mascotAlt: string;
  }>;
  trust: Readonly<{
    label: string;
    items: readonly string[];
  }>;
  why: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    cards: readonly Readonly<{
      index: string;
      label: string;
      title: string;
      description: string;
    }>[];
  }>;
  assessment: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    steps: readonly SalesHomeStep[];
    cardLabel: string;
    cardTitle: string;
    cardDescription: string;
    cardRows: readonly Readonly<{ label: string; value: string }>[];
    cardCta: string;
    cardNote: string;
  }>;
  systems: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    cards: readonly SalesHomeSystem[];
    equipmentLabel: string;
    equipment: readonly string[];
    cta: string;
  }>;
  economics: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    rows: readonly Readonly<{
      label: string;
      value: string;
      detail: string;
    }>[];
    formulaTitle: string;
    formula: string;
    disclaimer: string;
  }>;
  journey: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    steps: readonly SalesHomeStep[];
    linksLabel: string;
    links: readonly Readonly<{ label: string; description: string }>[];
  }>;
  proof: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
  ownership: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    cards: readonly Readonly<{
      index: string;
      title: string;
      description: string;
      cta: string;
    }>[];
  }>;
  faq: Readonly<{
    eyebrow: string;
    title: string;
    items: readonly Readonly<{ question: string; answer: string }>[];
  }>;
  closing: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    visualLabel: string;
    mascotAlt: string;
  }>;
}>;

const TH_COPY: SalesHomeCopy = {
  hero: {
    eyebrow: "วางแผนระบบโซลาร์จากบ้านจริง",
    titleLineOne: "ลดค่าไฟ",
    titleLineTwo: "ด้วยระบบที่พอดี",
    description:
      "ไม่เริ่มจากแพ็กเกจสำเร็จรูป เริ่มจากค่าไฟ เวลาที่ใช้ไฟ และพื้นที่หลังคาของคุณ แล้วค่อยเลือกโซลาร์ที่อธิบายได้ว่าทำไมจึงเหมาะ",
    primaryCta: "ประเมินระบบของฉัน",
    secondaryCta: "เลือกสเปกเอง",
    visualLabel: "ภาพรวมแผนระบบ",
    visualStatus: "พร้อมเริ่มประเมิน",
    visualTitle: "จากค่าไฟ สู่แผนที่คุยต่อได้",
    visualNote: "ตัวเลขจริงจะคำนวณจากข้อมูลบ้านของคุณ",
    visualRows: [
      { label: "จุดเริ่มต้น", value: "ค่าไฟและเวลาที่ใช้ไฟ" },
      { label: "สิ่งที่ตรวจสอบ", value: "หลังคา แดด และโหลดบ้าน" },
      { label: "สิ่งที่จะได้", value: "ระบบและข้อเสนอที่ชัดเจน" },
    ],
    mascotAlt: "โซเลียกำลังช่วยวางแผนระบบโซลาร์สำหรับบ้าน",
  },
  trust: {
    label: "แผนระบบที่ตรวจสอบได้",
    items: ["ค่าไฟจริง", "เวลาที่ใช้ไฟ", "พื้นที่หลังคา", "การติดตามโครงการ"],
  },
  why: {
    eyebrow: "ก่อนเลือกแผง ต้องรู้ว่าบ้านต้องการอะไร",
    title: "โซลาร์ที่ขายง่ายที่สุด คือโซลาร์ที่ลูกค้าอธิบายต่อได้",
    description:
      "เจ้าของบ้านไม่ได้ต้องการแค่จำนวนแผง แต่ต้องการรู้ว่าระบบนี้ช่วยอะไร ลงทุนกับอะไร และจะมีใครดูแลเมื่อเริ่มใช้งานแล้ว",
    cards: [
      {
        index: "01",
        label: "ความเข้าใจ",
        title: "รู้ว่ากำลังซื้ออะไร",
        description: "แยกให้เห็นขนาดระบบ อุปกรณ์ และบทบาทของแต่ละชิ้นก่อนตัดสินใจ",
      },
      {
        index: "02",
        label: "ตัวเลข",
        title: "เห็นวิธีคิดก่อนเห็นราคา",
        description: "เชื่อมค่าไฟ การผลิต และรูปแบบการใช้ไฟ เพื่อให้ประมาณการมีที่มา",
      },
      {
        index: "03",
        label: "ความมั่นใจ",
        title: "รู้ว่าหลังซื้อจะไปต่ออย่างไร",
        description: "ข้อเสนอ เอกสาร สถานะโครงการ และบริการหลังติดตั้งอยู่ในเส้นทางเดียวกัน",
      },
    ],
  },
  assessment: {
    eyebrow: "01 / ประเมินก่อนซื้อ",
    title: "เริ่มจากสิ่งที่คุณรู้ดีที่สุด: บ้านและค่าไฟ",
    description:
      "ตอบคำถามสั้น ๆ เพื่อสร้างจุดเริ่มต้นของระบบ ไม่ต้องรู้ศัพท์โซลาร์ และยังไม่ต้องตัดสินใจซื้อ",
    steps: [
      {
        index: "01",
        title: "บอกค่าไฟ",
        description: "ใช้บิลหรือค่าไฟเฉลี่ยเป็นจุดตั้งต้น",
        detail: "ตัวเลขที่คุณมีอยู่แล้ว",
      },
      {
        index: "02",
        title: "เล่าการใช้ไฟ",
        description: "บอกช่วงเวลาที่บ้านใช้ไฟและเป้าหมายของคุณ",
        detail: "กลางวัน กลางคืน หรือทั้งวัน",
      },
      {
        index: "03",
        title: "ดูบริบทหลังคา",
        description: "พิจารณาพื้นที่ ทิศทาง และข้อจำกัดหน้างาน",
        detail: "ข้อมูลเพื่อคุยกับทีมวิศวกร",
      },
      {
        index: "04",
        title: "รับแนวทาง",
        description: "เห็นขนาดและทางเลือกที่เหมาะเป็นจุดเริ่มต้น",
        detail: "ไม่ใช่คำรับรองจนกว่าจะสำรวจจริง",
      },
    ],
    cardLabel: "ระบบประเมินเบื้องต้น",
    cardTitle: "ใช้เวลาไม่กี่นาที เพื่อรู้ว่าควรถามอะไรต่อ",
    cardDescription: "ผลลัพธ์เป็นข้อมูลวางแผนเบื้องต้น และส่งต่อให้ทีมช่วยตรวจสอบได้",
    cardRows: [
      { label: "ข้อมูลที่ใช้", value: "บิล · บ้าน · พฤติกรรม" },
      { label: "ผลลัพธ์", value: "ขนาดระบบ · แนวทาง" },
      { label: "ขั้นต่อไป", value: "คุยข้อเสนอ · สำรวจหน้างาน" },
    ],
    cardCta: "เริ่มประเมินระบบ",
    cardNote: "ยังไม่ผูกมัดการซื้อ",
  },
  systems: {
    eyebrow: "02 / ระบบที่เลือกได้",
    title: "เลือกระบบจากวิธีที่บ้านคุณใช้พลังงาน",
    description:
      "ไม่มีระบบเดียวที่ดีที่สุดสำหรับทุกบ้าน เริ่มจากเป้าหมาย แล้วค่อยเลือกระดับความซับซ้อนและอุปกรณ์ที่เหมาะ",
    cards: [
      {
        index: "01",
        tag: "ใช้ไฟกลางวัน",
        title: "On-grid",
        description: "ผลิตไฟใช้ในบ้านในช่วงที่มีแดด เหมาะกับบ้านที่มีการใช้ไฟช่วงกลางวัน",
        features: ["ไม่เริ่มจากแบตเตอรี่", "เน้นการใช้ไฟที่ผลิตได้ทันที", "ดูผลจากพฤติกรรมการใช้ไฟ"],
      },
      {
        index: "02",
        tag: "ต้องการความยืดหยุ่น",
        title: "Hybrid / Backup",
        description: "เพิ่มทางเลือกเรื่องการเก็บพลังงานและไฟสำรอง เมื่อบ้านมีเป้าหมายที่ซับซ้อนขึ้น",
        features: ["พิจารณาแบตเตอรี่ตามการใช้งาน", "วางแผนโหลดสำคัญ", "ดูต้นทุนและประโยชน์ร่วมกัน"],
      },
      {
        index: "03",
        tag: "ทุกระบบต้องติดตามได้",
        title: "Monitoring & care",
        description: "เห็นข้อมูลระบบและเส้นทางบริการหลังติดตั้ง เพื่อให้การเป็นเจ้าของไม่จบวันที่ติดตั้ง",
        features: ["ติดตามสถานะโครงการ", "เก็บข้อมูลอุปกรณ์และเอกสาร", "ขอความช่วยเหลือเมื่อจำเป็น"],
      },
    ],
    equipmentLabel: "องค์ประกอบที่ควรคุยให้ครบ",
    equipment: ["แผงโซลาร์", "อินเวอร์เตอร์", "โครงสร้างและระบบป้องกัน", "มอนิเตอร์และบริการ"],
    cta: "เปิดตัวเลือกอุปกรณ์",
  },
  economics: {
    eyebrow: "03 / ตัวเลขที่คุยกันได้",
    title: "ก่อนถามว่าคุ้มไหม ให้เห็นว่าคำนวณจากอะไร",
    description:
      "เราแยกสมมติฐานออกจากผลลัพธ์ เพื่อให้คุณรู้ว่าตัวเลขไหนเป็นประมาณการ ตัวเลขไหนต้องยืนยันจากการสำรวจหน้างาน",
    rows: [
      { label: "ขนาดระบบ", value: "จากการใช้ไฟและพื้นที่", detail: "ไม่ใช่ตัวเลขเดียวสำหรับทุกบ้าน" },
      { label: "พลังงานที่ผลิตได้", value: "จากแดดและหลังคา", detail: "ขึ้นกับทิศทาง เงาบัง และสภาพหน้างาน" },
      { label: "ค่าไฟที่ลดได้", value: "จากเวลาที่ใช้ไฟ", detail: "ใช้ไฟเองกับส่งกลับระบบให้ผลต่างกัน" },
      { label: "คืนทุนโดยประมาณ", value: "จากราคาและผลประหยัด", detail: "ปรับใหม่เมื่อได้ข้อมูลจริงและข้อเสนอ" },
    ],
    formulaTitle: "ภาพที่ควรได้จากข้อเสนอ",
    formula: "ข้อมูลบ้าน + ข้อมูลแดด + สเปกอุปกรณ์ + ราคาจริง = การตัดสินใจที่มีเหตุผล",
    disclaimer: "ทุกตัวเลขบนแพลตฟอร์มเป็นการวางแผนเบื้องต้น ผลลัพธ์สุดท้ายต้องยืนยันจากการสำรวจหน้างานและข้อเสนอจริง",
  },
  journey: {
    eyebrow: "04 / เส้นทางตั้งแต่คลิกแรก",
    title: "การซื้อระบบไม่ควรหายไปหลังส่งฟอร์ม",
    description:
      "ทุกขั้นต่อจากหน้าเว็บควรทำให้คุณเห็นสิ่งที่เกิดขึ้น เอกสารที่ต้องอ่าน และคนที่รับช่วงต่อ",
    steps: [
      { index: "01", title: "ประเมิน", description: "เริ่มจากข้อมูลบ้านและค่าไฟ", detail: "Wizard" },
      { index: "02", title: "ออกแบบ", description: "เลือกขนาดและอุปกรณ์", detail: "Builder" },
      { index: "03", title: "พิจารณาข้อเสนอ", description: "อ่านรายละเอียดและเงื่อนไข", detail: "Proposal" },
      { index: "04", title: "ยืนยันและติดตั้ง", description: "เดินหน้าเอกสารและกำหนดการ", detail: "Project" },
      { index: "05", title: "ดูแลต่อเนื่อง", description: "ติดตามสถานะและบริการหลังติดตั้ง", detail: "Profile" },
    ],
    linksLabel: "พื้นที่ที่คุณกลับมาใช้ได้ทุกเมื่อ",
    links: [
      { label: "ดูข้อเสนอ", description: "อ่านราคา สเปก เอกสาร และการแก้ไข" },
      { label: "ติดตามคำขอ", description: "เช็กขั้นตอนล่าสุดโดยไม่ต้องเริ่มเรื่องใหม่" },
      { label: "โปรไฟล์ระบบ", description: "เก็บข้อมูลระบบเพื่อใช้งานหลังติดตั้ง" },
    ],
  },
  proof: {
    eyebrow: "05 / ผลงานติดตั้งจริง",
    title: "ดูระบบที่อยู่บนหลังคาจริง ก่อนเริ่มจากบ้านคุณ",
    description:
      "เปิดดูภาพ รายละเอียดระบบ และข้อมูลของแต่ละโครงการจาก portfolio ที่เผยแพร่จริง ใช้เป็นแรงบันดาลใจ ไม่ใช่การรับรองว่าสเปกจะเหมือนกัน",
  },
  ownership: {
    eyebrow: "06 / หลังติดตั้งก็ยังสำคัญ",
    title: "ขายระบบหนึ่งครั้ง แต่ดูแลความมั่นใจตลอดอายุการใช้งาน",
    description:
      "เมื่อระบบขึ้นหลังคาแล้ว ลูกค้าควรเข้าถึงข้อมูลสำคัญได้ง่าย และรู้ว่าจะติดต่อใครเมื่อมีคำถาม",
    cards: [
      { index: "01", title: "ติดตามโครงการ", description: "เห็น milestone เอกสาร และขั้นต่อไปของงาน", cta: "เปิดหน้าติดตาม" },
      { index: "02", title: "เก็บข้อเสนอและเอกสาร", description: "กลับมาอ่านสเปก การชำระเงิน และประวัติการคุยได้", cta: "ดูข้อเสนอ" },
      { index: "03", title: "ดูแลระบบของคุณ", description: "เก็บรายละเอียดอุปกรณ์และขอความช่วยเหลือหลังติดตั้ง", cta: "ไปที่โปรไฟล์" },
    ],
  },
  faq: {
    eyebrow: "คำถามก่อนเริ่ม",
    title: "เรื่องที่ควรรู้ก่อนขอใบเสนอราคา",
    items: [
      { question: "ต้องรู้ขนาดระบบก่อนเริ่มไหม?", answer: "ไม่ต้อง คุณเริ่มจากค่าไฟและลักษณะการใช้ไฟได้ ระบบจะช่วยสร้างแนวทางเบื้องต้นให้ก่อน" },
      { question: "ผลประเมินจากหน้าเว็บเป็นราคาจริงหรือไม่?", answer: "ไม่ใช่ ราคาจริงและสเปกสุดท้ายต้องยืนยันหลังตรวจสอบข้อมูลและสำรวจหน้างาน ผลประเมินมีไว้ช่วยให้คุยกันตรงประเด็นขึ้น" },
      { question: "ถ้าบ้านใช้ไฟกลางคืน ระบบแบบไหนเหมาะ?", answer: "ต้องดูสัดส่วนการใช้ไฟและเป้าหมายของบ้าน อาจพิจารณาแบตเตอรี่หรือปรับขนาดระบบให้เหมาะ แทนการเพิ่มแผงโดยอัตโนมัติ" },
      { question: "หลังติดตั้งแล้วดูข้อมูลจากที่ไหน?", answer: "คุณสามารถติดตามโครงการ ข้อเสนอ เอกสาร และข้อมูลระบบผ่านพื้นที่ลูกค้าของ SolarDream ตามสิทธิ์ของบัญชี" },
    ],
  },
  closing: {
    eyebrow: "พร้อมเริ่มจากบ้านคุณหรือยัง",
    title: "เริ่มจากข้อมูลที่คุณมี แล้วค่อยตัดสินใจด้วยข้อมูลที่ชัดขึ้น",
    description: "ให้ SolarDream ช่วยเปลี่ยนค่าไฟและคำถามของคุณให้เป็นแผนระบบที่คุยต่อได้",
    primaryCta: "ประเมินระบบฟรี",
    secondaryCta: "คุยกับตัวเลือกของระบบ",
    visualLabel: "ขั้นต่อไปของแผนพลังงาน",
    mascotAlt: "โซเลียชี้ไปยังขั้นตอนถัดไปของการวางแผนระบบโซลาร์",
  },
};

const EN_COPY: SalesHomeCopy = {
  hero: {
    eyebrow: "Plan a solar system around your real home",
    titleLineOne: "LOWER THE BILL",
    titleLineTwo: "WITH THE RIGHT FIT",
    description:
      "Do not begin with a package. Begin with your bill, the hours you use power, and the roof you have—then choose a system you can explain.",
    primaryCta: "Assess my system",
    secondaryCta: "Choose my own spec",
    visualLabel: "System plan overview",
    visualStatus: "READY TO ASSESS",
    visualTitle: "From your bill to a plan you can discuss",
    visualNote: "Your real numbers come from your home's information.",
    visualRows: [
      { label: "Start with", value: "Bill and energy hours" },
      { label: "Review", value: "Roof, sun, and home loads" },
      { label: "Take away", value: "A clearer system and quote" },
    ],
    mascotAlt: "Solia helping plan a residential solar system",
  },
  trust: {
    label: "A plan you can inspect",
    items: ["Real bill", "Energy hours", "Roof context", "Project tracking"],
  },
  why: {
    eyebrow: "Before the panels, understand the home",
    title: "The easiest solar system to sell is the one a homeowner can explain",
    description:
      "Homeowners need more than a panel count. They need to understand what they are buying, why it fits, and who stays with them after installation.",
    cards: [
      { index: "01", label: "CLARITY", title: "Know what you are buying", description: "See the system size, equipment, and role of each part before you decide." },
      { index: "02", label: "NUMBERS", title: "See the reasoning before the price", description: "Connect usage, production, and timing so the estimate has a visible basis." },
      { index: "03", label: "CONFIDENCE", title: "Know what happens after", description: "Keep the quote, documents, project status, and support on one connected path." },
    ],
  },
  assessment: {
    eyebrow: "01 / Assess before you buy",
    title: "Start with what you know best: your home and your bill",
    description: "Answer a few questions to create a first system direction. You do not need solar vocabulary or a purchase decision.",
    steps: [
      { index: "01", title: "Share the bill", description: "Use a recent bill or monthly average", detail: "A number you already have" },
      { index: "02", title: "Describe your use", description: "Tell us when the home uses power", detail: "Day, night, or both" },
      { index: "03", title: "Read the roof", description: "Consider space, direction, and constraints", detail: "Context for the engineering chat" },
      { index: "04", title: "Get a direction", description: "See a size and approach to discuss", detail: "Not final until the site review" },
    ],
    cardLabel: "First system assessment",
    cardTitle: "Spend a few minutes knowing what to ask next",
    cardDescription: "The result is a planning starting point you can take into a conversation with the team.",
    cardRows: [
      { label: "Uses", value: "Bill · home · habits" },
      { label: "Returns", value: "System size · direction" },
      { label: "Next", value: "Quote · site review" },
    ],
    cardCta: "Start the assessment",
    cardNote: "No purchase commitment",
  },
  systems: {
    eyebrow: "02 / System choices",
    title: "Choose a system around how your home uses energy",
    description: "There is no single best system for every home. Start with the goal, then choose the right level of complexity and equipment.",
    cards: [
      { index: "01", tag: "DAYTIME USE", title: "On-grid", description: "Generate power for the home while the sun is available—a fit for homes with daytime demand.", features: ["Start without a battery", "Prioritize immediate self-use", "Read the result through usage" ] },
      { index: "02", tag: "MORE FLEXIBILITY", title: "Hybrid / Backup", description: "Add storage and backup considerations when the home has a more complex energy goal.", features: ["Consider a battery by use", "Plan critical loads", "Balance cost and benefit" ] },
      { index: "03", tag: "EVERY SYSTEM", title: "Monitoring & care", description: "Keep system information and the after-installation path close, so ownership does not end on installation day.", features: ["Track project status", "Keep equipment and documents", "Ask for help when needed" ] },
    ],
    equipmentLabel: "The conversation should cover",
    equipment: ["Solar panels", "Inverter", "Mounting and protection", "Monitoring and care"],
    cta: "Open equipment choices",
  },
  economics: {
    eyebrow: "03 / Numbers you can discuss",
    title: "Before asking if it pays back, see what the estimate uses",
    description: "Separate assumptions from results so you know which numbers are illustrative and which need a site review.",
    rows: [
      { label: "System size", value: "Usage and roof space", detail: "Not one number for every home" },
      { label: "Energy produced", value: "Sun and roof context", detail: "Direction, shade, and site condition matter" },
      { label: "Bill reduction", value: "When you use power", detail: "Self-use and export are different" },
      { label: "Illustrative payback", value: "Price and savings", detail: "Revised when real inputs are confirmed" },
    ],
    formulaTitle: "What a useful quote should connect",
    formula: "Home data + sunlight + equipment spec + real price = a reasoned decision",
    disclaimer: "All platform figures are planning estimates. The final result must be confirmed by a site review and a real proposal.",
  },
  journey: {
    eyebrow: "04 / The path after the click",
    title: "Buying a system should not disappear after the form",
    description: "Every next step should show what is happening, what you need to read, and who takes the work forward.",
    steps: [
      { index: "01", title: "Assess", description: "Start with home and bill data", detail: "Wizard" },
      { index: "02", title: "Design", description: "Choose size and equipment", detail: "Builder" },
      { index: "03", title: "Review the quote", description: "Read price, spec, and terms", detail: "Proposal" },
      { index: "04", title: "Confirm and install", description: "Move through documents and schedule", detail: "Project" },
      { index: "05", title: "Keep ownership clear", description: "Track status and after-care", detail: "Profile" },
    ],
    linksLabel: "Customer spaces you can return to",
    links: [
      { label: "Your proposal", description: "Read price, specs, documents, and revisions" },
      { label: "Track a request", description: "Check the latest step without starting again" },
      { label: "Your system profile", description: "Keep equipment details for after installation" },
    ],
  },
  proof: {
    eyebrow: "05 / Real installation work",
    title: "See systems already living on real roofs",
    description: "Open published portfolio records to see images, system details, and project context. Use them as inspiration—not a promise that your spec will match.",
  },
  ownership: {
    eyebrow: "06 / After installation matters",
    title: "Sell the system once. Keep confidence supported for the life of ownership.",
    description: "Once the system is on the roof, customers should still know where their information lives and who to contact when a question comes up.",
    cards: [
      { index: "01", title: "Track the project", description: "See milestones, documents, and the next handoff", cta: "Open tracking" },
      { index: "02", title: "Keep the proposal", description: "Return to specs, payment details, and conversation history", cta: "View proposals" },
      { index: "03", title: "Own the system record", description: "Keep equipment details and request support after installation", cta: "Go to profile" },
    ],
  },
  faq: {
    eyebrow: "Questions before you start",
    title: "What to know before requesting a quote",
    items: [
      { question: "Do I need to know the system size first?", answer: "No. Start with your bill and usage pattern. The system can create a first direction before you choose a size." },
      { question: "Is the website estimate the final price?", answer: "No. Final pricing and specifications need confirmed information and a site review. The estimate helps make the next conversation more precise." },
      { question: "What if my home uses most power at night?", answer: "The right answer depends on the usage pattern and goal. A battery or a different system size may be worth considering instead of automatically adding panels." },
      { question: "Where do I see information after installation?", answer: "Your SolarDream customer areas can hold project tracking, proposals, documents, and system information according to your account access." },
    ],
  },
  closing: {
    eyebrow: "Ready to start with your home?",
    title: "Begin with the information you have. Decide with a clearer picture.",
    description: "Let SolarDream turn your bill and questions into a system plan you can take forward.",
    primaryCta: "Start a free assessment",
    secondaryCta: "Explore system choices",
    visualLabel: "The next step in your energy plan",
    mascotAlt: "Solia pointing toward the next step in planning a solar system",
  },
};

export function getSalesHomeCopy(locale: string): SalesHomeCopy {
  return locale === "th" ? TH_COPY : EN_COPY;
}
