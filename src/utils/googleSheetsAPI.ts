import { extractSpreadsheetId, mapSheetToEntities, saveSyncedData } from './googleSheetsSync';
import { DemeritRecord } from '../types';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: { title: string; sheetId: number }[];
}

/**
 * Extracts spreadsheet ID from Google Sheet URL
 */
export { extractSpreadsheetId };

/**
 * Fetches spreadsheet metadata (listing available sheets/tabs) using OAuth
 */
export async function getSpreadsheetMetadata(spreadsheetId: string, accessToken: string): Promise<SpreadsheetInfo> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Error fetching spreadsheet metadata:', errText);
    throw new Error('ไม่สามารถเข้าถึงข้อมูลโครงสร้างชีตได้ กรุณาตรวจสอบลิงก์สเปรดชีตหรือความเข้าใจในสิทธิ์ของผู้ใช้');
  }

  const data = await res.json();
  return {
    spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId
    }))
  };
}

/**
 * Ensures a sheet/tab exists in the spreadsheet. If not, creates it and inserts default headers.
 */
export async function ensureSheetTabExists(
  spreadsheetId: string,
  accessToken: string,
  tabName: string,
  headers: string[]
): Promise<boolean> {
  try {
    const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
    const exists = meta.sheets.some(s => s.title === tabName);
    
    if (exists) {
      return false; // Already existed
    }

    // Create the sheet
    const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
                gridProperties: {
                  rowCount: 2000,
                  columnCount: headers.length + 5,
                  frozenRowCount: 1
                }
              }
            }
          }
        ]
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.warn('Failed to auto-create sheet tab:', err);
      return false;
    }

    // Set headers
    const range = `'${tabName}'!A1`;
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    await fetch(appendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [headers]
      })
    });

    return true; // Newly created
  } catch (error) {
    console.error('Error in ensureSheetTabExists:', error);
    return false;
  }
}

/**
 * Appends a demerit record as a new row to the specified Google Sheet tab
 */
export async function appendDemeritRecordToSheet(
  spreadsheetId: string,
  accessToken: string,
  record: DemeritRecord,
  tabName: string = 'บันทึกการหักคะแนน'
): Promise<void> {
  const headers = [
    'รหัสบันทึก (Record ID)',
    'วัน-เวลาที่อนุมัติ',
    'รหัสนักเรียน',
    'ชื่อนักเรียน',
    'ชั้นเรียน',
    'ความผิดที่ถูกหัก',
    'คะแนนสะสมที่โดนหัก',
    'คุณครูผู้รายงาน',
    'รหัสประจำตัวครู',
    'หมายเหตุเพิ่มเติม',
    'พยานหลักฐาน',
    'ลายเซ็นนักเรียน',
    'ลายเซ็นคุณครู',
    'ผู้อนุมัติประพฤติ (แอดมิน)',
    'สถานะการอนุมัติ (Status)'
  ];

  // Make sure sheet exists
  await ensureSheetTabExists(spreadsheetId, accessToken, tabName, headers);

  // Formulate row values
  const offensesStr = record.offenses.map(o => `${o.code}: ${o.title} (-${o.points} คะแนน)`).join('\n');
  const dateStr = new Date(record.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const approvalDateStr = record.parentAckAt ? new Date(record.parentAckAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : dateStr;
  
  const rowValue = [
    record.id,
    approvalDateStr,
    record.studentId,
    record.studentName,
    record.studentClass,
    offensesStr,
    record.totalPoints,
    record.teacherName,
    record.teacherId,
    record.notes || '',
    record.evidenceBase64 ? (record.evidenceBase64.startsWith('data:') ? 'มีภาพหลักฐาน (Base64)' : record.evidenceBase64) : '',
    record.studentSignature ? 'ลงชื่อแล้ว' : 'ยังไม่ได้ลงชื่อ',
    record.teacherSignature ? 'ลงชื่อแล้ว' : 'ยังไม่ได้ลงชื่อ',
    record.parentName || 'ยังไม่ได้อนุมัติ',
    record.parentAck ? 'อนุมัติเรียบร้อยประพฤติ 🟢' : 'รอแอดมินอนุมัติ 🟡'
  ];

  const range = `'${tabName}'!A:A`;
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowValue]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to append demerit record to spreadsheet', errText);
    throw new Error('ไม่สามารถบันทึกข้อมูลการหักคะแนนลงสเปรดชีตได้ กรุณาตรวจสอบสิทธิ์การเขียนในชีตนี้');
  }
}

/**
 * Sync data (Teachers, Students, Offenses) from specific tab in user spreadsheet using OAuth access token
 */
export async function syncEntityFromSheetTab(
  spreadsheetId: string,
  accessToken: string,
  sheetTitle: string,
  entityType: 'teachers' | 'students' | 'offenses'
): Promise<{ count: number; columns: string[] }> {
  const range = `'${sheetTitle}'`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Error reading tab ${sheetTitle}:`, err);
    throw new Error(`ไม่สามารถดึงข้อมูลในแท็บ "${sheetTitle}" ได้`);
  }

  const data = await res.json();
  const values: any[][] = data.values || [];
  if (values.length === 0) {
    throw new Error(`แท็บ "${sheetTitle}" ไม่มีข้อมูลใดๆ`);
  }

  // Row 0 is the headers
  const headers = values[0].map(h => String(h || '').trim());
  const rows = values.slice(1);

  const parsed = mapSheetToEntities(headers, rows);
  
  if (entityType === 'teachers') {
    if (!parsed.teachers || parsed.teachers.length === 0) {
      throw new Error('ระบบตรวจสอบไม่พบคอลัมน์คุณครูในชีตนี้ กรุณาตรวจสอบว่ามีคอลัมน์ "ชื่อครู" หรือ "ประจำชั้น" หรือมีข้อมูลพนักงานต้อนรับครูประจำชั้นหรือไม่');
    }
    saveSyncedData('teachers', parsed.teachers);
    return { count: parsed.teachers.length, columns: headers };
  } else if (entityType === 'students') {
    if (!parsed.students || parsed.students.length === 0) {
      throw new Error('ระบบตรวจสอบไม่พบคอลัมน์รายชื่อนักเรียนในชีตนี้ กรุณาตรวจสอบว่ามีคอลัมน์ "ID" และ "ชื่อ" ตลอดจน "ชั้น" หรือไม่');
    }
    saveSyncedData('students', parsed.students);
    return { count: parsed.students.length, columns: headers };
  } else {
    if (!parsed.offenses || parsed.offenses.length === 0) {
      throw new Error('ระบบตรวจสอบไม่พบคอลัมน์เกณฑ์พฤติกรรมในชีตนี้ กรุณาตรวจสอบว่ามีคอลัมน์ "ความผิด" และ "คะแนน" หรือไม่');
    }
    saveSyncedData('offenses', parsed.offenses);
    return { count: parsed.offenses.length, columns: headers };
  }
}

/**
 * Overwrites or populates the sheet/tab with a list of demerit records
 */
export async function exportAllRecordsToSheet(
  spreadsheetId: string,
  accessToken: string,
  records: DemeritRecord[],
  tabName: string = 'บันทึกการหักคะแนน'
): Promise<void> {
  const headers = [
    'รหัสบันทึก (Record ID)',
    'วัน-เวลาที่อนุมัติ',
    'รหัสนักเรียน',
    'ชื่อนักเรียน',
    'ชั้นเรียน',
    'ความผิดที่ถูกหัก',
    'คะแนนสะสมที่โดนหัก',
    'คุณครูผู้รายงาน',
    'รหัสประจำตัวครู',
    'หมายเหตุเพิ่มเติม',
    'พยานหลักฐาน',
    'ลายเซ็นนักเรียน',
    'ลายเซ็นคุณครู',
    'ผู้อนุมัติประพฤติ (แอดมิน)',
    'สถานะการอนุมัติ (Status)'
  ];

  // Ensure sheet exists
  await ensureSheetTabExists(spreadsheetId, accessToken, tabName, headers);

  // Clear previous values first to avoid leaving orphaned rows if the database has fewer records
  const rangeClear = `'${tabName}'!A:O`;
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeClear)}:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  // Prepare values (headers + rows)
  const rows = records.map(record => {
    const offensesStr = record.offenses.map(o => `${o.code}: ${o.title} (-${o.points} คะแนน)`).join('\n');
    const dateStr = new Date(record.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const approvalDateStr = record.parentAckAt ? new Date(record.parentAckAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : dateStr;

    return [
      record.id,
      approvalDateStr,
      record.studentId,
      record.studentName,
      record.studentClass,
      offensesStr,
      record.totalPoints,
      record.teacherName,
      record.teacherId,
      record.notes || '',
      record.evidenceBase64 ? (record.evidenceBase64.startsWith('data:') ? 'มีภาพหลักฐาน (Base64)' : record.evidenceBase64) : '',
      record.studentSignature ? 'ลงชื่อแล้ว' : 'ยังไม่ได้ลงชื่อ',
      record.teacherSignature ? 'ลงชื่อแล้ว' : 'ยังไม่ได้ลงชื่อ',
      record.parentName || 'ยังไม่ได้อนุมัติ',
      record.parentAck ? 'อนุมัติเรียบร้อยประพฤติ 🟢' : 'รอแอดมินอนุมัติ 🟡'
    ];
  });

  const rangeUpdate = `'${tabName}'!A1`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeUpdate)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [headers, ...rows]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to update spreadsheet with all records', errText);
    throw new Error('ไม่สามารถบันทึกข้อมูลทั้งหมดลงสเปรดชีตได้');
  }
}
