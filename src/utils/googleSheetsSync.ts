import { Student } from '../db/studentsList';
import { Offense } from '../types';
import { Teacher } from '../db/teachersList';

export interface GSheetSyncResult {
  students?: Student[];
  offenses?: Offense[];
  teachers?: Teacher[];
  rawCount: number;
  columnsDetected: string[];
}

/**
 * Extracts spreadsheet ID from Google Sheet URL
 */
export function extractSpreadsheetId(url: string): string | null {
  const regExp = /\/d\/([a-zA-Z0-9-_]+)/;
  const matches = url.match(regExp);
  return matches ? matches[1] : null;
}

/**
 * Fetches sheet data as JSON using Google Visualization API (does not require OAuth if sheet is "Anyone with link can view")
 */
export async function fetchGoogleSheetRows(url: string, gid?: string): Promise<{ headers: string[]; rows: any[][] }> {
  const id = extractSpreadsheetId(url);
  if (!id) {
    throw new Error('ลิงก์ Google Sheets ไม่ถูกต้อง กรุณาอ้างอิงรูปแบบที่มี /d/SPREADSHEET_ID');
  }

  const gidParam = gid ? `&gid=${gid}` : '';
  const fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json${gidParam}`;

  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`ไม่สามารถเชื่อมต่อชีตได้ (HTTP Status: ${res.status}). กรุณาตรวจสอบว่าตั้งค่าสิทธิ์แชร์เป็น "ผู้มีลิงก์ทุกคนมีสิทธิ์อ่าน" แล้วหรือไม่`);
  }

  const text = await res.text();
  
  // Extract JSON string from JSONP response like google.visualization.Query.setResponse({...});
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('ไม่สามารถแยกวิเคราะห์ฐานข้อมูล (JSONP Parse Error) - กรุณาตรวจสอบสิทธิ์การแชร์ชีต');
  }

  const jsonStr = text.substring(startIdx, endIdx + 1);
  const data = JSON.parse(jsonStr);

  if (data.status === 'error') {
    const errorDetails = data.errors && data.errors[0] ? data.errors[0].detailed_message : 'การดึงข้อมูลปฏิเสธสิทธิ์';
    throw new Error(`Google Sheets ส่งคืนข้อผิดพลาด: ${errorDetails}`);
  }

  const cols = data.table.cols || [];
  const rows = data.table.rows || [];

  const headers = cols.map((c: any, index: number) => {
    return (c.label || `คอลัมน์_${index + 1}`).trim();
  });

  const parsedRows = rows.map((r: any) => {
    if (!r || !r.c) return [];
    return r.c.map((cell: any) => {
      if (!cell) return '';
      // cell.f is the formatted value, cell.v is the raw value
      if (cell.v !== undefined && cell.v !== null) {
        // Handle JS Date object representation / JSON milliseconds representation
        if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
          return cell.f || cell.v;
        }
        return String(cell.v).trim();
      }
      return '';
    });
  });

  return { headers, rows: parsedRows };
}

/**
 * Intelligent detector to map the column headers to Student/Offense/Teacher schemas
 */
export function mapSheetToEntities(headers: string[], rows: any[][]): GSheetSyncResult {
  const normHeaders = headers.map(h => h.toLowerCase());

  // Detect which kind of entity is mostly represented in this sheet
  // 1. Check for Students markers: "studentid", "studentname", "class", "ห้อง", "เลขประจำตัว", "ชั้น", "ชื่อ"
  const studentIdIdx = normHeaders.findIndex(h => h.includes('id') || h.includes('เลขประจำตัว') || h.includes('รหัส'));
  const nameIdx = normHeaders.findIndex(h => h.includes('name') || h.includes('ชื่อ') || h.includes('นามสกุล'));
  const classIdx = normHeaders.findIndex(h => h.includes('class') || h.includes('ชั้น') || h.includes('ห้อง'));

  // 2. Check for Offenses markers: "code", "points", "คะแนน", "ความผิด", "โทษ", "เกณฑ์"
  const offenseCodeIdx = normHeaders.findIndex(h => h.includes('code') || h.includes('รหัสความผิด') || h.includes('ข้อ'));
  const offenseTitleIdx = normHeaders.findIndex(h => h.includes('title') || h.includes('ความผิด') || h.includes('พฤติกรรม'));
  const demeritPointsIdx = normHeaders.findIndex(h => h.includes('points') || h.includes('คะแนน') || h.includes('หัก') || h.includes('แต้ม'));

  // 3. Check for Teachers markers: "advisor", "role", "คุณครู", "ครู", "จำลอง"
  const teacherIdIdx = normHeaders.findIndex(h => h.includes('teacherid') || h.includes('รหัสครู'));
  const teacherNameIdx = normHeaders.findIndex(h => h.includes('teachername') || h.includes('ชื่อครู') || h.includes('ชื่อ-นามสกุลครู'));
  const teacherClassIdx = normHeaders.findIndex(h => h.includes('classroom') || h.includes('ครูประจำชั้น') || h.includes('ประจำชั้น'));

  const result: GSheetSyncResult = {
    rawCount: rows.length,
    columnsDetected: headers
  };

  // Try to parse as Students if Student IDs or Names are found
  if (studentIdIdx !== -1 && nameIdx !== -1) {
    const students: Student[] = [];
    rows.forEach(row => {
      const id = row[studentIdIdx]?.trim();
      let name = row[nameIdx]?.trim();
      let rawClass = classIdx !== -1 ? row[classIdx]?.trim() : 'ม.1/1';

      if (!id || !name) return;

      // Clean prefix if any
      name = name.replace(/^\d+\s+/, '').trim();

      // Normalize class format (e.g., 1.1 or 1/1 -> ม.1/1)
      let studentClass = rawClass;
      if (rawClass) {
        const cleanClass = rawClass.replace('/', '.');
        const classMatch = cleanClass.match(/^(\d+)\.(\d+)$/);
        if (classMatch) {
          studentClass = `ม.${classMatch[1]}/${classMatch[2]}`;
        } else if (!rawClass.startsWith('ม.')) {
          studentClass = `ม.${rawClass}`;
        }
      }

      students.push({ id, name, studentClass });
    });
    result.students = students;
  }

  // Try to parse as Offenses
  if (offenseTitleIdx !== -1 && demeritPointsIdx !== -1) {
    const offenses: Offense[] = [];
    rows.forEach(row => {
      const code = offenseCodeIdx !== -1 ? row[offenseCodeIdx]?.trim() : String(Math.floor(Math.random() * 900) + 100);
      const title = row[offenseTitleIdx]?.trim();
      const pointsVal = demeritPointsIdx !== -1 ? parseInt(row[demeritPointsIdx]) : 5;

      if (!title || isNaN(pointsVal)) return;

      offenses.push({
        code,
        category: pointsVal >= 10 ? 'medium' : 'light',
        title,
        points: pointsVal
      });
    });
    result.offenses = offenses;
  }

  // Try to parse as Teachers
  if (teacherNameIdx !== -1) {
    const teachers: Teacher[] = [];
    rows.forEach((row, idx) => {
      const id = (teacherIdIdx !== -1 ? row[teacherIdIdx]?.trim() : `phws-sheet-${idx + 1}`).toLowerCase();
      const name = row[teacherNameIdx]?.trim();
      const classRoom = teacherClassIdx !== -1 ? row[teacherClassIdx]?.trim() : 'ม.1/1';

      if (!name) return;

      const email = `teacher.${id}@phws.ac.th`;

      teachers.push({
        id,
        name,
        email,
        classRoom: classRoom.startsWith('ม.') ? classRoom : `ม.${classRoom}`,
        advisorRole: idx % 2 === 0 ? 'ครูที่ปรึกษา 1' : 'ครูที่ปรึกษา 2',
        password: id // Default password matches ID
      });
    });
    result.teachers = teachers;
  }

  return result;
}

/**
 * Saves synced values to localStorage
 */
export function saveSyncedData(type: 'students' | 'offenses' | 'teachers', data: any[]) {
  localStorage.setItem(`gsheet_${type}`, JSON.stringify(data));
}

/**
 * Clears synced values from localStorage to revert to factory standards
 */
export function clearSyncedData(type: 'students' | 'offenses' | 'teachers') {
  localStorage.removeItem(`gsheet_${type}`);
}
