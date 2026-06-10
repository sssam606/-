export interface Offense {
  code: string;
  category: 'light' | 'medium';
  title: string;
  points: number;
}

export interface DemeritRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  offenses: { code: string; title: string; points: number }[];
  totalPoints: number;
  teacherId: string;
  teacherName: string;
  studentSignature: string; // Base64 signature
  teacherSignature: string; // Base64 signature
  parentSignature?: string; // Base64 signature (signed later)
  parentName?: string;
  parentAck: boolean;
  parentAckAt?: string;
  evidenceBase64: string; // Base64 image
  parentPhone: string;
  parentEmail: string;
  createdAt: string;
  notes?: string;
}

export interface TeacherUser {
  uid: string;
  email: string;
  name: string;
  isSimulated?: boolean;
  classRoom?: string;
  advisorRole?: string;
  isAdmin?: boolean;
}

const DEFAULT_OFFENSES_LIST: Offense[] = [
  // หมวด 100 ความผิดสถานเบา - 5 คะแนน
  { code: '101', category: 'light', title: 'ไม่ตั้งใจ หรือไม่เข้าร่วมกิจกรรมขณะมีการเรียนการสอน', points: 5 },
  { code: '102', category: 'light', title: 'ไม่มีหนังสือหรือเอกสารการเรียน', points: 5 },
  { code: '103', category: 'light', title: 'ไม่ส่งการบ้านหรืองานที่ได้รับมอบหมาย', points: 5 },
  { code: '104', category: 'light', title: 'ใส่คอนแทคเลนส์แฟชั่น', points: 5 },
  { code: '105', category: 'light', title: 'ไว้เล็บยาวหรือทำสีเล็บ', points: 5 },
  { code: '106', category: 'light', title: 'ใช้เครื่องสำอางแต่งหน้า หรืออุปกรณ์แต่งหน้าอื่น ๆ เช่น ติดขนตาปลอม', points: 5 },
  { code: '107', category: 'light', title: 'มาโรงเรียนสาย โดยไม่มีเหตุอันสมควร', points: 5 },
  { code: '108', category: 'light', title: 'ไม่ทิ้งขยะในบริเวณที่กำหนด/ ถังขยะ', points: 5 },
  { code: '109', category: 'light', title: 'ซื้อ/รับประทานอาหาร นอกเวลาที่กำหนด', points: 5 },
  { code: '110', category: 'light', title: 'ไม่ปักอักษรย่อโรงเรียน/ ชื่อ-นามสกุล/ เลขประจำตัว/ ชั้น/ เครื่องหมายอื่น ๆ ตามที่โรงเรียนกำหนด', points: 5 },
  { code: '111', category: 'light', title: 'ใส่เสื้อผิดระเบียบ หรือปล่อยชายเสื้อออกนอกกางเกง/กระโปรง ทั้งในและนอกโรงเรียน', points: 5 },
  { code: '112', category: 'light', title: 'สวมใส่กางเกง/ กระโปรง/ ถุงเท้า/ รองเท้า/ เข็มขัด ผิดระเบียบ', points: 5 },
  { code: '113', category: 'light', title: 'สวมใส่เครื่องประดับที่ไม่เกี่ยวข้องกับเครื่องแบบนักเรียน', points: 5 },
  { code: '114', category: 'light', title: 'ใส่ชุดพละศึกษาไม่ตรงตามวันเรียนที่กำหนด', points: 5 },
  { code: '115', category: 'light', title: 'ไม่สวมใส่เครื่องแบบลูกเสือ/ เนตรนารี/ ยุวกาชาด/ นศท. ตามวันเรียนที่กำหนด', points: 5 },
  { code: '116', category: 'light', title: 'แต่งเครื่องแบบ นศท. ไม่ถูกต้องตามแบบวินัยทหาร', points: 5 },
  { code: '117', category: 'light', title: 'ใช้กระเป๋านักเรียนผิดระเบียบ', points: 5 },
  { code: '118', category: 'light', title: 'ทรงผมผิดระเบียบหรือย้อมสีผม', points: 5 },
  { code: '119', category: 'light', title: 'เล่นหรือส่งเสียงอึกทึก ก่อความรำคาญ ขณะมีการเรียนการสอน หรือมีกิจกรรมส่วนร่วม', points: 5 },
  { code: '120', category: 'light', title: 'เล่นในบริเวณพื้นที่ห้ามเล่น/ เล่นกีฬาในห้องเรียน หรือบนอาคารเรียน', points: 5 },

  // หมวด 200 ความผิดสถานกลาง - 10 คะแนน
  { code: '201', category: 'medium', title: 'ไม่ส่งจดหมายจากทางโรงเรียนให้ผู้ปกครองรับทราบ', points: 10 },
  { code: '202', category: 'medium', title: 'ไม่เข้าร่วมกิจกรรมหน้าเสาธง/ กิจกรรมต่าง ๆ ของโรงเรียนโดยไม่มีเหตุอันสมควร', points: 10 },
  { code: '203', category: 'medium', title: 'หลบหนีการเรียน', points: 10 },
  { code: '204', category: 'medium', title: 'ขับขี่รถยนต์ รถจักรยานยนต์ในบริเวณโรงเรียน โดยไม่ได้รับอนุญาต', points: 10 },
  { code: '205', category: 'medium', title: 'กระทำการใด ๆ ที่ก่อให้เกิดความสกปรกตามผนังตึก/ อาคาร/ สถานที่ต่าง ๆ ในโรงเรียน', points: 10 },
  { code: '206', category: 'medium', title: 'เล่นโทรศัพท์ในเวลาเรียนหรือขณะทำกิจกรรม โดยไม่ได้รับอนุญาต', points: 10 },
  { code: '207', category: 'medium', title: 'ขาดเรียน โดยไม่มีเหตุอันสมควร', points: 10 },
  { code: '208', category: 'medium', title: 'ยุยง ให้ผู้อื่นกระทำความผิด', points: 10 }
];

const getInitialOffenses = (): Offense[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('gsheet_offenses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse gsheet_offenses', e);
      }
    }
  }
  return DEFAULT_OFFENSES_LIST;
};

export const OFFENSES_LIST: Offense[] = getInitialOffenses();
