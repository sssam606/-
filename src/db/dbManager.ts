import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, isRealFirebase, handleFirestoreError, OperationType } from '../firebase';
import { DemeritRecord } from '../types';
import { Student, STUDENTS_LIST } from './studentsList';

const LOCAL_STORAGE_KEY = 'demerit_records_local_sim';

// Mock/Initial sample data so the app looks professional on first boot
const DEFAULT_RECORDS: DemeritRecord[] = [
  {
    id: 'rec_1',
    studentId: '10042',
    studentName: 'ณภัทร สมบูรณ์สกุล',
    studentClass: 'ม.5/2',
    offenses: [
      { code: '103', title: 'ไม่ส่งการบ้านหรืองานที่ได้รับมอบหมาย', points: 5 },
      { code: '107', title: 'มาโรงเรียนสาย โดยไม่มีเหตุอันสมควร', points: 5 }
    ],
    totalPoints: 10,
    teacherId: 'teacher_01',
    teacherName: 'ครูสมเจตน์ ใจงาม',
    studentSignature: 'data:image/png;base64,mock_stub_signature_student',
    teacherSignature: 'data:image/png;base64,mock_stub_signature_teacher',
    parentAck: false,
    parentPhone: '0812345678',
    parentEmail: 'parent_napat@example.com',
    evidenceBase64: '',
    createdAt: '2026-06-08T07:15:00.000Z',
    notes: 'ตักเตือนครั้งที่ 1 มอบหมายงานซ่อมเสริมให้ทำ'
  },
  {
    id: 'rec_2',
    studentId: '10198',
    studentName: 'พิมพ์ชนก ชัยชนะ',
    studentClass: 'ม.6/1',
    offenses: [
      { code: '206', title: 'เล่นโทรศัพท์ในเวลาเรียนหรือขณะทำกิจกรรม โดยไม่ได้รับอนุญาต', points: 10 }
    ],
    totalPoints: 10,
    teacherId: 'teacher_02',
    teacherName: 'ครูวิชิต ศิริวรรณ',
    studentSignature: 'data:image/png;base64,mock_stub_signature_student2',
    teacherSignature: 'data:image/png;base64,mock_stub_signature_teacher2',
    parentSignature: 'data:image/png;base64,mock_stub_signature_parent2',
    parentName: 'วิทยา ชัยชนะ (บิดา)',
    parentAck: true,
    parentAckAt: '2026-06-08T08:05:00.000Z',
    evidenceBase64: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=60',
    parentPhone: '0898765432',
    parentEmail: 'parent_pim@example.com',
    createdAt: '2026-06-08T07:45:00.000Z',
    notes: 'แอบเล่นเกมใต้โต๊ะในวิชาคณิตศาสตร์'
  }
];

// Initialize LocalStorage with default samples if empty
function initializeLocalData() {
  const local = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!local) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_RECORDS));
    return DEFAULT_RECORDS;
  }
  return JSON.parse(local);
}

// Global data operations router
export async function getDemeritRecords(): Promise<DemeritRecord[]> {
  if (isRealFirebase && db) {
    const colName = 'demeritRecords';
    try {
      const q = query(collection(db, colName));
      const querySnapshot = await getDocs(q);
      const records: DemeritRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        records.push(docSnap.data() as DemeritRecord);
      });
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, colName);
    }
  }
  
  // Fallback to local simulation
  return initializeLocalData();
}

export async function createDemeritRecord(record: DemeritRecord): Promise<void> {
  if (isRealFirebase && db) {
    const colName = 'demeritRecords';
    try {
      await setDoc(doc(db, colName, record.id), record);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${colName}/${record.id}`);
    }
  }

  // Local storage save
  const data = initializeLocalData();
  data.unshift(record);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

export async function submitParentAckInDb(
  recordId: string, 
  parentName: string, 
  parentSignature: string,
  parentAckAt: string
): Promise<void> {
  if (isRealFirebase && db) {
    const path = `demeritRecords/${recordId}`;
    try {
      const docRef = doc(db, 'demeritRecords', recordId);
      await updateDoc(docRef, {
        parentAck: true,
        parentName,
        parentSignature,
        parentAckAt
      });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // Local Storage update
  const data = initializeLocalData();
  const index = data.findIndex((r: DemeritRecord) => r.id === recordId);
  if (index !== -1) {
    data[index] = {
      ...data[index],
      parentAck: true,
      parentName,
      parentSignature,
      parentAckAt
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }
}

// Sync updates in real-time
export function subscribeToDemeritRecords(callback: (records: DemeritRecord[]) => void) {
  if (isRealFirebase && db) {
    const colName = 'demeritRecords';
    const unsub = onSnapshot(collection(db, colName), async (snapshot) => {
      let records: DemeritRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as DemeritRecord);
      });
      
      // Seed default sample records if Firestore is completely empty
      if (snapshot.empty) {
        const canWrite = auth?.currentUser != null;
        if (canWrite) {
          console.log('Firestore is empty. Seeding default records for preview...');
          for (const record of DEFAULT_RECORDS) {
            try {
              await setDoc(doc(db, colName, record.id), record);
            } catch (e) {
              console.warn('Seeding demo record skipped or unauthorized:', e);
            }
          }
        } else {
          console.log('Firestore is empty, but no user is signed in. Using offline fallback records.');
        }
        // Return defaults immediately while the cloud DB finishes writing
        records = [...DEFAULT_RECORDS];
      }

      // Sort by newest
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, colName);
    });
    return unsub;
  }

  // LocalStorage subscription polling simulation
  callback(initializeLocalData());
  const interval = setInterval(() => {
    callback(initializeLocalData());
  }, 3000);

  return () => clearInterval(interval);
}

// Sync student roster in real-time from Firestore
export function subscribeToStudents(callback: (students: Student[]) => void) {
  if (isRealFirebase && db) {
    const colName = 'students';
    const unsub = onSnapshot(collection(db, colName), async (snapshot) => {
      let roster: Student[] = [];
      snapshot.forEach((docSnap) => {
        roster.push(docSnap.data() as Student);
      });
      
      // Fallback to default student roster if Firestore is completely empty
      if (snapshot.empty) {
        console.log('Firestore student roster is empty. Using default loaded roster containing ม.6/1 - ม.6/6.');
        roster = [...STUDENTS_LIST];
      }
      
      // Sort roster by class and ID
      roster.sort((a, b) => {
        const classComp = a.studentClass.localeCompare(b.studentClass, 'th', { numeric: true });
        if (classComp !== 0) return classComp;
        return a.id.localeCompare(b.id);
      });
      
      callback(roster);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, colName);
    });
    return unsub;
  }

  // LocalStorage subscription polling simulation
  const getLocalStudents = (): Student[] => {
    const saved = localStorage.getItem('gsheet_students');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return STUDENTS_LIST;
  };
  
  callback(getLocalStudents());
  const interval = setInterval(() => {
    callback(getLocalStudents());
  }, 3000);

  return () => clearInterval(interval);
}

// Bulk save students to Cloud Firestore and LocalStorage
export async function saveStudentRosterToDb(roster: Student[]): Promise<void> {
  // Save to localStorage immediately
  localStorage.setItem('gsheet_students', JSON.stringify(roster));
  
  if (isRealFirebase && db) {
    const colName = 'students';
    try {
      for (const student of roster) {
        await setDoc(doc(db, colName, student.id), student);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, colName);
    }
  }
}

