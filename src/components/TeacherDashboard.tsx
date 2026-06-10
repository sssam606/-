import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, UserCheck, AlertTriangle, FileText, CheckCircle, 
  Clock, LogOut, ShieldAlert, Sparkles, SlidersHorizontal, Info, Share2, Camera
} from 'lucide-react';
import { OFFENSES_LIST, DemeritRecord, TeacherUser, Offense } from '../types';
import { createDemeritRecord, subscribeToDemeritRecords, submitParentAckInDb, subscribeToStudents, saveStudentRosterToDb } from '../db/dbManager';
import { STUDENTS_LIST, Student } from '../db/studentsList';
import { TEACHERS_LIST, Teacher, getInitialTeachers } from '../db/teachersList';
import SignaturePad from './SignaturePad';
import EvidenceSelector from './EvidenceSelector';
import { auth, isRealFirebase } from '../firebase';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile 
} from 'firebase/auth';

import { 
  googleSignIn, 
  initGoogleAuth, 
  logoutGoogle, 
  getAccessToken 
} from '../utils/googleAuthHelper';
import { 
  getSpreadsheetMetadata, 
  appendDemeritRecordToSheet, 
  exportAllRecordsToSheet,
  syncEntityFromSheetTab,
  extractSpreadsheetId
} from '../utils/googleSheetsAPI';

const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower === 'chalermpol.s@phws.ac.th' || lower === 'snsam606@gmail.com';
};

export default function TeacherDashboard() {
  // Dynamic lists that can be synced from Google Sheets and stored in LocalStorage
  const [teachersList, setTeachersList] = useState<Teacher[]>(() => getInitialTeachers());
  const [studentsListState, setStudentsListState] = useState<Student[]>(() => STUDENTS_LIST);
  const [offensesListState, setOffensesListState] = useState<Offense[]>(() => OFFENSES_LIST);

  // Google Sheets state integration
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [targetSpreadsheetUrl, setTargetSpreadsheetUrl] = useState(() => {
    return localStorage.getItem('target_spreadsheet_url') || 'https://docs.google.com/spreadsheets/d/12lUSQttFq9YtwYq5YtCKV23vWDkfO9B03INtWVKhf5s/edit?usp=sharing';
  });
  const [spreadsheetTabs, setSpreadsheetTabs] = useState<string[]>([]);
  const [isReadingTabs, setIsReadingTabs] = useState(false);
  const [isSyncingDatabase, setIsSyncingDatabase] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [syncTabTeachers, setSyncTabTeachers] = useState('');
  const [syncTabStudents, setSyncTabStudents] = useState('');
  const [syncTabOffenses, setSyncTabOffenses] = useState('');

  // Persist spreadsheet URL
  useEffect(() => {
    localStorage.setItem('target_spreadsheet_url', targetSpreadsheetUrl);
  }, [targetSpreadsheetUrl]);

  // Current logged in teacher state
  const [teacher, setTeacher] = useState<TeacherUser | null>(() => {
    const saved = localStorage.getItem('teacher_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Automatically sync Firebase Auth state if we are in real Firebase mode
  useEffect(() => {
    if (isRealFirebase && auth) {
      const unsubAuth = auth.onAuthStateChanged(async (firebaseUser: any) => {
        if (firebaseUser) {
          const email = firebaseUser.email?.toLowerCase() || '';
          const isAdmin = email === 'chalermpol.s@phws.ac.th' || email === 'snsam606@gmail.com';
          const isTeacherWithDomain = email.endsWith('@phws.ac.th');

          if (!isAdmin && !isTeacherWithDomain) {
            // Reject non-conforming email
            setLoginError('❌ บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน! สำหรับคุณครูที่ปรึกษากรุณาใช้บัญชี Google ของสถาบัน (@phws.ac.th) เท่านั้น และสำหรับแอดมินกรุณาใช้บัญชีที่ลงทะเบียนไว้');
            localStorage.removeItem('teacher_session');
            setTeacher(null);
            try {
              await signOut(auth);
            } catch (signOutErr) {
              console.error(signOutErr);
            }
            return;
          }

          const matchedByEmail = getInitialTeachers().find(
            t => t.email.toLowerCase() === email
          );

          const user: TeacherUser = {
            uid: firebaseUser.uid,
            name: matchedByEmail ? matchedByEmail.name : (firebaseUser.displayName || email.split('@')[0] || 'คุณครูระบุตัวตน'),
            email: email,
            isSimulated: false,
            classRoom: matchedByEmail?.classRoom || 'ทั่วไป',
            advisorRole: matchedByEmail?.advisorRole || 'ครูที่ปรึกษา 1',
            isAdmin: isAdmin
          };
          localStorage.setItem('teacher_session', JSON.stringify(user));
          setTeacher(user);
        } else {
          // Clear session only if it was not humanly simulated
          const saved = localStorage.getItem('teacher_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (!parsed.isSimulated) {
              setTeacher(null);
            }
          }
        }
      });
      return unsubAuth;
    }
  }, []);

  // Auth form state
  const [loginMethod, setLoginMethod] = useState<'teacher' | 'admin'>('teacher');
  const [teacherIdInput, setTeacherIdInput] = useState('');
  const [teacherPasswordInput, setTeacherPasswordInput] = useState('');
  const [classFilterLogin, setClassFilterLogin] = useState('all');
  const [loginError, setLoginError] = useState('');
  const [showCredentialsHelp, setShowCredentialsHelp] = useState(false);
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [teacherEmailInput, setTeacherEmailInput] = useState('');

  // Demerit Records State
  const [records, setRecords] = useState<DemeritRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, acknowledged

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('ม.1/1');

  // Set studentClass defaults to advisor's classroom when form opens
  useEffect(() => {
    if (isFormOpen && teacher?.classRoom && !teacher?.isAdmin) {
      setStudentClass(teacher.classRoom);
    }
  }, [isFormOpen, teacher]);
  const [suggestedStudents, setSuggestedStudents] = useState<Student[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<'id' | 'name' | null>(null);

  // Quick Student Finder States
  const [quickStudentSearch, setQuickStudentSearch] = useState('');
  const [quickStudentClass, setQuickStudentClass] = useState<string>('all');
  const [quickPage, setQuickPage] = useState(1);
  const itemsPerPage = 6;

  // We should initialize the quickStudentClass filter to the teacher's classroom (if available) so they see their class first
  useEffect(() => {
    if (teacher?.classRoom) {
      setQuickStudentClass(teacher.classRoom);
    } else {
      setQuickStudentClass('all');
    }
  }, [teacher]);

  const filteredQuickStudents = useMemo(() => {
    return studentsListState.filter(s => {
      // Filter by class (Automatic global search if typing and using teacher's default class as filter)
      const isDefaultClassFilter = teacher?.classRoom && quickStudentClass === teacher.classRoom;
      const matchesClass = quickStudentClass === 'all' || s.studentClass === quickStudentClass || (quickStudentSearch.trim() !== '' && isDefaultClassFilter);
      if (!matchesClass) return false;

      // Filter by query (Name or ID)
      if (!quickStudentSearch.trim()) return true;
      const q = quickStudentSearch.toLowerCase().trim();
      return s.id.includes(q) || s.name.toLowerCase().includes(q);
    });
  }, [studentsListState, quickStudentSearch, quickStudentClass, teacher]);

  const paginatedQuickStudents = useMemo(() => {
    const startIndex = (quickPage - 1) * itemsPerPage;
    return filteredQuickStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuickStudents, quickPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredQuickStudents.length / itemsPerPage) || 1;
  }, [filteredQuickStudents]);

  // reset page on search query or class filter change
  useEffect(() => {
    setQuickPage(1);
  }, [quickStudentSearch, quickStudentClass]);

  const resetForm = () => {
    setStudentId('');
    setStudentName('');
    setStudentClass(teacher?.classRoom || 'ม.1/1');
    setParentPhone('');
    setParentEmail('');
    setSelectedOffenseCodes([]);
    setEvidenceBase64('');
    setStudentSignature('');
    setTeacherSignature('');
    setNotes('');
    setFormError('');
    setSuccessAnimation(false);
  };

  const handleQuickRecord = (student: Student) => {
    resetForm();
    setStudentId(student.id);
    setStudentName(student.name);
    setStudentClass(student.studentClass);
    setIsFormOpen(true);
  };

  // Search for students matching input ID
  const handleStudentIdChange = (idVal: string) => {
    setStudentId(idVal);
    if (idVal.trim() === '') {
      setSuggestedStudents([]);
      setActiveSuggestionField(null);
      return;
    }
    const matches = studentsListState.filter(s => {
      const isIdMatch = s.id.includes(idVal.trim());
      // Teachers can select and search any student from 6/1 through 6/6 or any other class
      return isIdMatch;
    });
    setSuggestedStudents(matches.slice(0, 10)); // Limit to top 10 suggestions
    setActiveSuggestionField('id');

    // Auto-fill student name and class if they type or paste an exact matching ID
    const exactMatch = studentsListState.find(s => s.id === idVal.trim());
    if (exactMatch) {
      setStudentName(exactMatch.name);
      setStudentClass(exactMatch.studentClass);
    }
  };

  // Search for students matching input Name
  const handleStudentNameChange = (nameVal: string) => {
    setStudentName(nameVal);
    if (nameVal.trim() === '') {
      setSuggestedStudents([]);
      setActiveSuggestionField(null);
      return;
    }
    const matches = studentsListState.filter(s => {
      const isNameMatch = s.name.toLowerCase().includes(nameVal.toLowerCase());
      // Teachers can select and search any student from 6/1 through 6/6 or any other class
      return isNameMatch;
    });
    setSuggestedStudents(matches.slice(0, 10)); // Limit to top 10 suggestions
    setActiveSuggestionField('name');
  };

  const handleSelectStudent = (student: Student) => {
    setStudentId(student.id);
    setStudentName(student.name);
    setStudentClass(student.studentClass);
    setSuggestedStudents([]);
    setActiveSuggestionField(null);
  };
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [selectedOffenseCodes, setSelectedOffenseCodes] = useState<string[]>([]);
  const [evidenceBase64, setEvidenceBase64] = useState('');
  const [studentSignature, setStudentSignature] = useState('');
  const [teacherSignature, setTeacherSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState('');

  // Selected Record details modal
  const [selectedRecord, setSelectedRecord] = useState<DemeritRecord | null>(null);

  // Admin approval states
  const [adminApprovalSignature, setAdminApprovalSignature] = useState('');
  const [adminApprovalName, setAdminApprovalName] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Subscribe to real-time student updates
  useEffect(() => {
    const unsub = subscribeToStudents((data) => {
      setStudentsListState(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Subscribe to real-time records
  useEffect(() => {
    const unsub = subscribeToDemeritRecords((data) => {
      // Correct any mismatched or incorrect student names and classes based on master Students List (studentsListState)
      const correctedData = data.map(record => {
        const matchedStudent = studentsListState.find(s => s.id === record.studentId) || STUDENTS_LIST.find(s => s.id === record.studentId);
        if (matchedStudent) {
          return {
            ...record,
            studentName: matchedStudent.name,
            studentClass: matchedStudent.studentClass
          };
        }
        return record;
      });
      setRecords(correctedData);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [studentsListState]);

  // Listen for Google authentication state changes to set token
  useEffect(() => {
    const unsubGoogle = initGoogleAuth((user, token) => {
      setGoogleToken(token);
    }, () => {
      setGoogleToken(null);
    });
    // Check if we already have non-null token in session on load
    getAccessToken().then(tok => {
      if (tok) setGoogleToken(tok);
    });
    return () => {
      if (typeof unsubGoogle === 'function') unsubGoogle();
    };
  }, []);

  const handleGoogleSheetsConnect = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleToken(result.accessToken);
        alert('เชื่อมต่อ Google Sheets และสิทธิ์พฤติกรรมเรียบร้อยแล้ว!');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Google: ' + err.message);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await logoutGoogle();
      setGoogleToken(null);
      setSpreadsheetTabs([]);
      alert('ตัดการเชื่อมต่อบัญชี Google เรียบร้อยแล้ว');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการยกเลิกเชื่อมต่อ: ' + err.message);
    }
  };

  const loadSpreadsheetTabs = async () => {
    if (!googleToken) {
      alert('กรุณาเชื่อมโยงบัญชี Google ก่อน');
      return;
    }
    const id = extractSpreadsheetId(targetSpreadsheetUrl);
    if (!id) {
      alert('ที่อยู่ Google Sheets ไม่ถูกต้อง กรุณาป้อนลิงก์ที่มีรูปแบบที่มี /d/SPREADSHEET_ID');
      return;
    }

    setIsReadingTabs(true);
    try {
      const meta = await getSpreadsheetMetadata(id, googleToken);
      const tabNames = meta.sheets.map(s => s.title);
      setSpreadsheetTabs(tabNames);
      alert(`ดึงโครงสร้างสเปรดชีตสำเร็จ! พบทั้งหมด ${tabNames.length} แท็บ`);
    } catch (err: any) {
      alert('ข้อผิดพลาดในการอ่านชีต: ' + err.message);
    } finally {
      setIsReadingTabs(false);
    }
  };

  const handleExecuteSync = async (type: 'teachers' | 'students' | 'offenses', tabName: string) => {
    if (!googleToken) return;
    const id = extractSpreadsheetId(targetSpreadsheetUrl);
    if (!id) {
      alert('รหัสสเปรดชีตไม่ถูกต้อง');
      return;
    }

    setIsSyncingDatabase(true);
    try {
      const syncRes = await syncEntityFromSheetTab(id, googleToken, tabName, type);
      alert(`ประสานฐานข้อมูลสำเร็จ! นำเข้าข้อมูลชนิด ${type} สำเร็จรวม ${syncRes.count} แถว เรียบร้อยแล้ว`);
      
      // Update local states immediately
      if (type === 'teachers') {
        const updated = getInitialTeachers();
        setTeachersList(updated);
      } else if (type === 'students') {
        const saved = localStorage.getItem('gsheet_students');
        if (saved) {
          const parsed = JSON.parse(saved);
          setStudentsListState(parsed);
          await saveStudentRosterToDb(parsed); // Upload the synced roster to standard Cloud Firestore
        }
      } else if (type === 'offenses') {
        const saved = localStorage.getItem('gsheet_offenses');
        if (saved) setOffensesListState(JSON.parse(saved));
      }
    } catch (err: any) {
      alert(`ไม่สามารถประสานข้อมูลได้: ${err.message}`);
    } finally {
      setIsSyncingDatabase(false);
    }
  };

  const handleBulkSyncToSheet = async () => {
    if (!googleToken) {
      alert('กรุณาคลิกเชื่อมต่อบัญชี Google Sheets ในแดชบอร์ดก่อนดำเนินการจัดเก็บ');
      return;
    }
    const id = extractSpreadsheetId(targetSpreadsheetUrl);
    if (!id) {
      alert('ที่อยู่ Google Sheets ไม่ถูกต้อง กรุณาป้อนลิงก์ที่มีรูปแบบ /d/SPREADSHEET_ID');
      return;
    }

    setIsExportingAll(true);
    try {
      await exportAllRecordsToSheet(id, googleToken, records, 'บันทึกการหักคะแนน');
      alert('ซิงค์และบันทึกประวัติการถูกหักคะแนนพฤติกรรมทั้งหมดลง Google Sheets (แท็บ: บันทึกการหักคะแนน) สำเร็จเรียบร้อยแล้ว!');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการนำส่งข้อมูลลงกูเกิลชีต: ' + err.message);
    } finally {
      setIsExportingAll(false);
    }
  };

  // Handle login by ID or Manual setup
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginMethod === 'teacher') {
      setLoginError('คณะครูที่ปรึกษากรุณาลงชื่อเข้าใช้งานด้วยปุ่ม "ลงชื่อเข้าใช้ด้วยบัญชี Google (@phws.ac.th)" ด้านล่างเท่านั้น');
      return;
    }

    // Admin login with Password
    const trimmedInput = teacherIdInput.trim().toLowerCase();
    const isAdmin = trimmedInput === 'chalermpol.s@phws.ac.th' || trimmedInput === 'snsam606@gmail.com';

    if (!isAdmin) {
      setLoginError('❌ ไม่พบบัญชีผู้ดูแลระบบ (Admin) นี้ หรืออีเมลของคุณไม่มีสิทธิ์เข้าใช้ในฝั่งผู้ดูแลระบบ');
      return;
    }

    if (teacherPasswordInput !== '595130') {
      setLoginError('❌ รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
      return;
    }

    const correctEmail = trimmedInput;
    const correctName = trimmedInput === 'chalermpol.s@phws.ac.th' ? 'นายเฉลิมพล สโมรินทร์' : 'แอดมิน (snsam606)';

    if (isRealFirebase && auth) {
      try {
        await signInWithEmailAndPassword(auth, correctEmail, teacherPasswordInput);
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed') {
          setLoginError('⚠️ (auth/operation-not-allowed): โปรดยังไม่ได้เปิดใช้งานผู้ให้บริการ "อีเมล/รหัสผ่าน" บน Firebase');
          return;
        }
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            const userCred = await createUserWithEmailAndPassword(auth, correctEmail, teacherPasswordInput);
            await updateProfile(userCred.user, { displayName: correctName });
          } catch (regErr: any) {
            if (regErr.code === 'auth/operation-not-allowed') {
              setLoginError('⚠️ (auth/operation-not-allowed): โปรดยังไม่ได้เปิดใช้งานผู้ให้บริการ "อีเมล/รหัสผ่าน" บน Firebase');
            } else {
              setLoginError('รหัสเข้าใช้งานแบบผู้เขียนสิทธิ์ล้มเหลว: ' + regErr.message);
            }
            return;
          }
        } else {
          setLoginError('ระบบพบปัญหาการตรวจสอบสิทธิ์: ' + err.message);
          return;
        }
      }
    }

    const user: TeacherUser = {
      uid: trimmedInput === 'chalermpol.s@phws.ac.th' ? 'phws501-2' : 'admin-snsam',
      name: correctName,
      email: correctEmail,
      classRoom: trimmedInput === 'chalermpol.s@phws.ac.th' ? 'ม.5/1' : 'ทั่วไป',
      advisorRole: 'ครูที่ปรึกษา' as any,
      isSimulated: !isRealFirebase,
      isAdmin: true
    };
    localStorage.setItem('teacher_session', JSON.stringify(user));
    setTeacher(user);
  };

  const handleGoogleSignIn = async () => {
    if (isRealFirebase && auth) {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google: ' + err.message);
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('teacher_session');
    setTeacher(null);
    if (isRealFirebase && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Firebase sign out error:', err);
      }
    }
  };

  // Toggle infraction selection
  const handleOffenseToggle = (code: string) => {
    setSelectedOffenseCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Calculate current point total
  const calculatedPoints = selectedOffenseCodes.reduce((sum, code) => {
    const item = offensesListState.find(o => o.code === code);
    return sum + (item?.points || 0);
  }, 0);

  // Submit Demerit point
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!teacher) return;
    if (!studentId || !studentName) {
      setFormError('กรุณากรอกข้อมูลพื้นฐานของนักเรียนให้ครบถ้วน');
      return;
    }
    if (selectedOffenseCodes.length === 0) {
      setFormError('กรุณาเลือกความผิดกฎระเบียบอย่างน้อย 1 รายการ');
      return;
    }
    if (!studentSignature) {
      setFormError('กรุณาให้นักเรียนลงลายเซ็นยืนยันพฤติกรรม');
      return;
    }
    if (!teacherSignature) {
      setFormError('กรุณาให้ครูลงลายเซ็นผู้รายงาน');
      return;
    }

    // Prepare demerit items
    const recordOffenses = selectedOffenseCodes.map(code => {
      const item = offensesListState.find(o => o.code === code)!;
      return { code: item.code, title: item.title, points: item.points };
    });

    const newRecordId = 'dem_' + Date.now();

    const finalStudentId = studentId.trim();
    const matchedStudent = STUDENTS_LIST.find(s => s.id === finalStudentId);
    const finalStudentName = matchedStudent ? matchedStudent.name : studentName.trim();
    const finalStudentClass = matchedStudent ? matchedStudent.studentClass : studentClass;

    const record: DemeritRecord = {
      id: newRecordId,
      studentId: finalStudentId,
      studentName: finalStudentName,
      studentClass: finalStudentClass,
      offenses: recordOffenses,
      totalPoints: calculatedPoints,
      teacherId: teacher.uid,
      teacherName: teacher.name,
      studentSignature,
      teacherSignature,
      parentPhone: '-',
      parentEmail: '-',
      parentAck: false,
      evidenceBase64,
      createdAt: new Date().toISOString(),
      notes: notes.trim()
    };

    try {
      await createDemeritRecord(record);

      // Auto success feedback
      setLastSubmittedId(newRecordId);
      setSuccessAnimation(true);
      
      // Reset form variables
      setStudentId('');
      setStudentName('');
      setStudentClass('ม.1/1');
      setParentPhone('');
      setParentEmail('');
      setSelectedOffenseCodes([]);
      setEvidenceBase64('');
      setStudentSignature('');
      setTeacherSignature('');
      setNotes('');
      
      setTimeout(() => {
        setSuccessAnimation(false);
        setIsFormOpen(false);
      }, 5500);

    } catch (err) {
      setFormError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Segment records based on role-based access permissions
  const visibleRecords = React.useMemo(() => {
    if (!teacher) return [];
    // Allow teachers to select any student from 1/1 through 6/6 and view their full history.
    return records;
  }, [records, teacher]);

  // Filter records
  const filteredRecords = visibleRecords.filter(r => {
    const matchesSearch = 
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentId.includes(searchQuery) ||
      r.id.includes(searchQuery);

    const matchesClass = filterClass === 'all' || r.studentClass === filterClass;
    
    let matchesStatus = true;
    if (filterStatus === 'pending') {
      matchesStatus = !r.parentAck;
    } else if (filterStatus === 'acknowledged') {
      matchesStatus = r.parentAck;
    }

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Calculate high-level stats
  const stats = {
    total: visibleRecords.length,
    pending: visibleRecords.filter(r => !r.parentAck).length,
    acknowledged: visibleRecords.filter(r => r.parentAck).length,
    totalPointsDeducted: visibleRecords.reduce((sum, r) => sum + r.totalPoints, 0)
  };

  // Group classes represented
  const generatedSchoolsRooms: string[] = [];
  for (let grade = 1; grade <= 6; grade++) {
    const maxRoom = grade === 6 ? 6 : 7;
    for (let room = 1; room <= maxRoom; room++) {
      generatedSchoolsRooms.push(`ม.${grade}/${room}`);
    }
  }

  const classesList = Array.from(new Set([
    ...STUDENTS_LIST.map(s => s.studentClass),
    ...generatedSchoolsRooms
  ])).sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

  if (!teacher) {
    return (
      <div className="max-w-xl mx-auto my-12 space-y-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200" id="teacher-login-card">
          <div className="bg-slate-900 p-8 text-center text-white relative">
            <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-mono">
              Authentication Portal
            </div>
            <ShieldAlert className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-pulse" />
            <h2 className="text-2xl font-bold font-sans tracking-tight">ระบบลงทะเบียนและเข้าใช้งานคุณครูที่ปรึกษา</h2>
            <p className="text-slate-400 text-xs mt-1 font-mono uppercase tracking-widest">Phromphiram Wittaya School</p>
          </div>

          <div className="border-b border-slate-100 flex" id="login-tabs">
            <button
              type="button"
              onClick={() => { setLoginMethod('teacher'); setLoginError(''); }}
              className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
                loginMethod === 'teacher'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/10'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🔐 สำหรับครูที่ปรึกษา (บัญชี Google)
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('admin'); setLoginError(''); }}
              className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
                loginMethod === 'admin'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/10'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🛠️ สำหรับผู้ดูแลระบบ/แอดมิน
            </button>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && (
              <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {loginMethod === 'teacher' ? (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-3 bg-blue-50/20 p-5 rounded-2xl border border-blue-100/50">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">ลงชื่อเข้าใช้งานด้วยบัญชีองค์กรทางกูเกิล</h4>
                    <p className="text-xs text-slate-500 mt-1">เฉพาะอีเมลสถาบันรูปแบบใหม่ <strong>@phws.ac.th</strong> เท่านั้นที่มีสิทธิ์เข้าใช้งานระบบคุณครู</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  id="btn-teacher-google-auth"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center space-x-2.5"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M12 5.04c1.67 0 3.19.57 4.37 1.71l3.27-3.27C17.65 1.57 15.02 1 12 1 7.21 1 3.16 3.69 1 7.65l3.83 2.97c1.02-3.04 3.87-5.58 7.17-5.58z"
                    />
                    <path
                      fill="#ffffff"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.43-4.92 3.43-8.61z"
                    />
                    <path
                      fill="#ffffff"
                      d="M4.83 10.62c-.25-.76-.39-1.57-.39-2.42s.14-1.66.39-2.42L1 7.65c-.83 1.66-1.3 3.52-1.3 5.47s.47 3.81 1.3 5.47l3.83-2.97z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.17.78-2.67 1.25-4.26 1.25-3.3 0-6.15-2.54-7.17-5.58L1 15.86C3.16 19.81 7.21 23 12 23z"
                    />
                  </svg>
                  <span>ลงชื่อเข้าใช้งานด้วยบัญชี Google ของสถาบัน (@phws.ac.th) 🟢</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50/45 p-4 rounded-xl border border-amber-100 text-amber-850 text-xs font-medium space-y-1">
                  <strong>ℹ️ ส่วนควบคุมระบบสำหรับแอดมิน (Admin Authorization)</strong>
                  <p>กรุณาระบุอีเมลผู้ดูแลระบบ (เช่น chalermpol.s@phws.ac.th หรือ snsam606@gmail.com) และรหัสผ่านที่กำหนดเพื่อเข้าสู่ระบบ</p>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">อีเมลแอดมินระบบ (Admin Email)</label>
                    <input
                      id="txt-teacher-id"
                      type="text"
                      required
                      value={teacherIdInput}
                      onChange={(e) => setTeacherIdInput(e.target.value)}
                      placeholder="เช่น chalermpol.s@phws.ac.th"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">รหัสผ่านสำหรับแอดมิน (Password)</label>
                    <input
                      id="txt-teacher-pass"
                      type="password"
                      required
                      value={teacherPasswordInput}
                      onChange={(e) => setTeacherPasswordInput(e.target.value)}
                      placeholder="ป้อนรหัสแอดมิน"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-teacher-signin"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>ตรวจสอบสิทธิ์แอดมินระบบ</span>
                </button>

                {isRealFirebase && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2">
                    <div className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider my-1">
                      หรือ ล็อกอินแอดมินโดยตรงผ่าน Google Account
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      id="btn-google-signin"
                      className="w-full py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.44 14.99 1 12 1 7.35 1 3.39 3.65 1.39 7.5l3.85 2.99C6.18 7.07 8.87 5.04 12 5.04z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.46c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.37-4.88 3.37-8.5z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.24 14.51c-.24-.71-.38-1.47-.38-2.51s.14-1.8.38-2.51L1.39 6.5C.5 8.29 0 10.09 0 12s.5 3.71 1.39 5.5l3.85-2.99z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.52 1.18-4.3 1.18-3.13 0-5.82-2.03-6.76-4.96l-3.85 2.99C3.39 20.35 7.35 23 12 23z"
                        />
                      </svg>
                      <span>เข้าสู่ระบบด้วย Google (บัญชีแอดมินที่ได้รับอนุญาต)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick-select helper catalog of classroom advisors */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mt-4 shadow-sm">
              <button
                type="button"
                onClick={() => setShowCredentialsHelp(!showCredentialsHelp)}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-150 text-left flex items-center justify-between text-xs font-extrabold text-slate-700 cursor-pointer transition"
              >
                <span className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-pink-500 animate-bounce" />
                  <span>ค้นหาข้อมูลบัญชีอีเมลสถาบันคุณครูที่ปรึกษา (รวม {teachersList.length} ท่าน)</span>
                </span>
                <span className="bg-white border text-slate-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold font-sans">
                  {showCredentialsHelp ? 'ปิดแถบ' : 'ค้นหาด่วน 🔍'}
                </span>
              </button>

              {showCredentialsHelp && (
                <div className="p-4 bg-white space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="พิมพ์ค้นหา ด่วนด้วย ชื่อครู หรือ ชั้นเรียน (เช่น ม.1/3, ม.5, วาสนา)..."
                      value={classFilterLogin === 'all' ? '' : classFilterLogin}
                      onChange={(e) => setClassFilterLogin(e.target.value || 'all')}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-sans"
                    />
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                    {teachersList.filter(t => {
                      if (classFilterLogin === 'all' || !classFilterLogin) return true;
                      const queryStr = classFilterLogin.toLowerCase();
                      return (
                        t.name.toLowerCase().includes(queryStr) || 
                        t.classRoom.toLowerCase().includes(queryStr) ||
                        t.id.toLowerCase().includes(queryStr) ||
                        t.email.toLowerCase().includes(queryStr)
                      );
                    }).map((t) => (
                      <div 
                        key={t.id} 
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 hover:bg-slate-50 px-2 rounded-lg transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <strong className="text-slate-800 text-[13px]">{t.name}</strong>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 font-sans">
                              ชั้น {t.classRoom} ({t.advisorRole})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans flex items-center space-x-2 pt-0.5">
                            <span>รหัสประจำตัวครู: <code className="text-blue-600 font-bold bg-slate-100 px-1 py-0.5 rounded font-mono">{t.id}</code></span>
                          </div>
                        </div>
                        
                        <div className="text-[11px] text-slate-600 font-bold bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-xl font-mono">
                          📧 {t.email}
                        </div>
                      </div>
                    ))}
                    {teachersList.filter(t => {
                      if (classFilterLogin === 'all' || !classFilterLogin) return true;
                      const queryStr = classFilterLogin.toLowerCase();
                      return (
                        t.name.toLowerCase().includes(queryStr) || 
                        t.classRoom.toLowerCase().includes(queryStr) ||
                        t.id.toLowerCase().includes(queryStr) ||
                        t.email.toLowerCase().includes(queryStr)
                      );
                    }).length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        ไม่พบข้อมูลคุณครูตามคำค้นที่ระบุ
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Teacher dashboard render
  return (
    <div className="space-y-6" id="teacher-dashboard-main">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm" id="teacher-profile-bar">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold">
            {teacher.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-800">{teacher.name}</span>
              <span className="bg-blue-50 text-blue-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                ผู้รายงานพฤติกรรม
              </span>
            </div>
            <span className="text-xs text-slate-500">{teacher.email}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => {
              const element = document.getElementById('quick-student-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                const searchInput = document.getElementById('quick-search-input');
                if (searchInput) {
                  setTimeout(() => {
                    searchInput.focus();
                  }, 400);
                }
              }
            }}
            id="btn-open-form"
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow hover:shadow-md cursor-pointer transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>ค้นหาเพื่อบันทึกพฤติกรรม</span>
          </button>
          <button
            onClick={handleLogout}
            id="btn-teacher-logout"
            className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg hover:bg-rose-50 cursor-pointer transition border border-slate-200"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row - Visible ONLY to Admin */}
      {teacher?.isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3.5">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">รายงานทั้งหมด</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{stats.total} เคส</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">รอแอดมินอนุมัติผล</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{stats.pending} เคส</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">อนุมัติเรียบร้อยประพฤติ</span>
              <span className="text-lg font-bold text-slate-900 font-mono text-emerald-650">{stats.acknowledged} เคส</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">คะแนนความเดือดร้อนสะสมรวม</span>
              <span className="text-lg font-bold text-slate-900 font-mono text-rose-600">+{stats.totalPointsDeducted} คะแนน</span>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Synchronization Control Panel */}
      {teacher?.isAdmin && (
        <div className="bg-gradient-to-r from-blue-50/50 to-teal-50/50 border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5 font-sans">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>การเชื่อมโยงระบบพฤติกรรมกับ Google Sheets 2569</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-sans">
                บันทึกคะแนนสะสมความประพฤติอัตโนมัติลงชีตของท่านโดยตรง พร้อมดึงฐานข้อมูลคุณครู แหล่งรหัสเข้าใช้ รายชื่อนักเรียน และเกณฑ์การหักเงินคะแนนจากคลาวด์ได้แบบเรียลไทม์
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {googleToken ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-md flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    เชื่อมต่อกูเกิลชีตเรียบร้อย 🟢
                  </span>
                  <button
                    onClick={handleGoogleDisconnect}
                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    ยกเลิกเชื่อมต่อ ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleSheetsConnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <span>Google Sheets OAuth</span>
                  <span>คลิกเชื่อมต่อเพื่อซิงค์ข้อมูลชีต 🔑</span>
                </button>
              )}
            </div>
          </div>

          {googleToken && (
            <div className="pt-4 border-t border-slate-200/60 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left side: Spreadsheet Settings */}
              <div className="lg:col-span-5 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">ลิงก์ Google Spreadsheet สำหรับอ่าน-เขียนข้อมูล</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={targetSpreadsheetUrl}
                      onChange={(e) => setTargetSpreadsheetUrl(e.target.value)}
                      placeholder="วางลิงก์ Google Sheet ของคุณที่ต้องการเชื่อมโยง..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <button
                      onClick={loadSpreadsheetTabs}
                      disabled={isReadingTabs}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      {isReadingTabs ? 'กำลังดึง...' : 'ดึงรายชื่อแท็บ'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    สเปรดชีตปัจจุบัน: <code className="text-slate-600 select-all font-mono">1aNGH5JY8OC1b2VC2hKW3-Nv9vXATZSbRwXFtZKMNHAs</code> (หน้าหลักพฤติกรรม)
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    ระบบบันทึกพฤติกรรมลงชีตอัตโนมัติ:
                  </span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    เมื่อคุณครูทำการอนุมัติผล ความประพฤติจะถูกส่งและเก็บบันทึกไปยังสเปรดชีต แท็บ <strong>"บันทึกการหักคะแนน"</strong> โดยอัตโนมัติทันที
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 block font-sans">หากต้องการซิงค์ย้อนหลัง หรือล้างชีตเขียนใหม่เพื่อจัดระเบียบให้ตรงกับคลาวด์:</span>
                    <button
                      onClick={handleBulkSyncToSheet}
                      disabled={isExportingAll}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold hover:shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>{isExportingAll ? '🔄 กำลังซิงค์ข้อมูล...' : '⚡ ซิงค์และเขียนประวัติทั้งหมดลง Google Sheet'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right side: Dynamic Entity Sync Tools */}
              <div className="lg:col-span-7 bg-white/70 border border-slate-200 p-4 rounded-xl space-y-3 shadow-2xs">
                <h4 className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>ซิงก์ประสานข้อมูลองค์กรจากกูเกิลสเปรดชีต</span>
                </h4>

                {spreadsheetTabs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Sync Teachers */}
                    <div className="p-2.5 border border-slate-150 bg-slate-50 rounded-lg space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block">1. บัญชีคุณครูที่ปรึกษา</span>
                        <p className="text-[10px] text-slate-500 leading-snug">ดึงข้อมูลชั้นที่ปรึกษา, ชื่อครู และรหัสผ่านเข้าใช้งาน</p>
                      </div>
                      <div className="space-y-1.5">
                        <select
                          value={syncTabTeachers}
                          onChange={(e) => setSyncTabTeachers(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] border border-slate-250 rounded bg-white font-sans focus:outline-none"
                        >
                          <option value="">-- เลือกแท็บ --</option>
                          {spreadsheetTabs.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleExecuteSync('teachers', syncTabTeachers)}
                          disabled={isSyncingDatabase || !syncTabTeachers}
                          className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 disabled:cursor-not-allowed text-white rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          {isSyncingDatabase ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูลคุณครู ⚡'}
                        </button>
                      </div>
                    </div>

                    {/* Sync Students */}
                    <div className="p-2.5 border border-slate-150 bg-slate-50 rounded-lg space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block">2. รายชื่อทะเบียนนักเรียน</span>
                        <p className="text-[10px] text-slate-500 leading-snug">ดึงเลขประจำตัวเด็ก ชื่อ และชั้นหลักเพื่อเติมข้อเสนอแนะ</p>
                      </div>
                      <div className="space-y-1.5">
                        <select
                          value={syncTabStudents}
                          onChange={(e) => setSyncTabStudents(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] border border-slate-250 rounded bg-white font-sans focus:outline-none"
                        >
                          <option value="">-- เลือกแท็บ --</option>
                          {spreadsheetTabs.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleExecuteSync('students', syncTabStudents)}
                          disabled={isSyncingDatabase || !syncTabStudents}
                          className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-355 disabled:cursor-not-allowed text-white rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          {isSyncingDatabase ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูลนักเรียน ⚡'}
                        </button>
                      </div>
                    </div>

                    {/* Sync Offenses */}
                    <div className="p-2.5 border border-slate-150 bg-slate-50 rounded-lg space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block">3. เกณฑ์หักคะแนนพฤติกรรม</span>
                        <p className="text-[10px] text-slate-500 leading-snug">ดึงหมวดหมู่พฤติกรรมและอัตราคะแนนโทษสะสม</p>
                      </div>
                      <div className="space-y-1.5">
                        <select
                          value={syncTabOffenses}
                          onChange={(e) => setSyncTabOffenses(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] border border-slate-250 rounded bg-white font-sans focus:outline-none"
                        >
                          <option value="">-- เลือกแท็บ --</option>
                          {spreadsheetTabs.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleExecuteSync('offenses', syncTabOffenses)}
                          disabled={isSyncingDatabase || !syncTabOffenses}
                          className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-355 disabled:cursor-not-allowed text-white rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          {isSyncingDatabase ? 'กำลังซิงก์...' : 'ซิงก์เกณฑ์ตัดแต้ม ⚡'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-lg p-5 text-center text-xs text-slate-400 font-medium">
                    กรุณากดปุ่ม <strong className="text-blue-600 font-bold">"ดึงรายชื่อแท็บ"</strong> ด้านซ้ายมือเพื่อเปิดใช้งานระบบแยกสเปรดชีต
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Student Search Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="quick-student-section">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-1 font-sans">
                <span>ระบบค้นหารายชื่อนักเรียนแบบ Real-time ด่วน</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-black">
                  พิมพ์ค้นหา
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5 leading-relaxed">
                พิมพ์ชื่อ นามสกุล หรือเลขประจำตัวนักเรียน เพื่อกรองและคลิกบันทึกพฤติกรรมความผิดวินัยส่งไปยังระบบคลาวด์ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input field */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="quick-search-input"
                type="text"
                value={quickStudentSearch}
                onChange={(e) => setQuickStudentSearch(e.target.value)}
                placeholder="ค้นหาด้วยชื่อ-นามสกุล หรือ รหัสนักเรียน..."
                className="pl-9 pr-8 py-1.5 border border-slate-300 text-xs rounded-lg w-64 bg-slate-50 hover:bg-slate-50 focus:bg-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium font-sans shadow-inner placeholder-slate-400"
              />
              {quickStudentSearch && (
                <button
                  type="button"
                  onClick={() => setQuickStudentSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 opacity-60 hover:opacity-100 text-xs font-extrabold cursor-pointer py-0.5 px-1 rounded font-sans"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Class filter dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-400 font-sans">ระดับชั้น:</span>
              <select
                value={quickStudentClass}
                onChange={(e) => setQuickStudentClass(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 text-xs rounded-lg bg-white text-slate-700 font-medium font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">ทุกชั้นปีการศึกษา</option>
                {classesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic results table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/10 shadow-3xs">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                  <th className="py-2.5 px-4 w-32 font-bold text-slate-400">เลขประจำตัวนักเรียน</th>
                  <th className="py-2.5 px-4 font-bold text-slate-400">ชื่อ - นามสกุล นักเรียน (Full Name)</th>
                  <th className="py-2.5 px-4 w-36 font-bold text-slate-400">ห้องเรียน (Class)</th>
                  <th className="py-2.5 px-4 w-48 text-right font-bold text-slate-400">การดำเนินการ (Action)</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-150 text-slate-700 bg-white">
                {paginatedQuickStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-sans font-medium">
                      {quickStudentSearch.trim() 
                        ? '❌ ไม่พบข้อมูลนักเรียนคนใดที่ตรงกับข้อความที่ท่านระบุ' 
                        : '📋 ยินดีต้อนรับ! รายชื่อนักเรียนจะแสดงผลตามตัวกรองระดับชั้น หรือกรอกค้นหาด้านบน'}
                    </td>
                  </tr>
                ) : (
                  paginatedQuickStudents.map((s) => {
                    const isYourStudent = teacher?.classRoom && s.studentClass === teacher.classRoom;
                    return (
                      <tr 
                        key={s.id} 
                        className={`hover:bg-blue-50/25 transition-all ${isYourStudent ? 'bg-amber-50/20 hover:bg-amber-50/45' : ''}`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-600 align-middle">
                          {s.id}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800 font-sans text-sm">{s.name}</span>
                            {isYourStudent && (
                              <span className="bg-amber-100 text-amber-800 font-sans text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center shadow-3xs uppercase">
                                นักเรียนที่ปรึกษาของคุณครู ✨
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                            {s.studentClass}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => handleQuickRecord(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-md cursor-pointer transition-all border border-blue-500"
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                            <span>บันทึกความประพฤติ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {filteredQuickStudents.length > itemsPerPage && (
            <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500 font-sans">
              <div>
                กำลังแสดงนักเรียนลำดับที่ <strong>{(quickPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(quickPage * itemsPerPage, filteredQuickStudents.length)}</strong> จากทั้งหมด <strong>{filteredQuickStudents.length}</strong> คน
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={quickPage === 1}
                  onClick={() => setQuickPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-slate-350 rounded bg-white font-bold hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer select-none transition"
                >
                  ย้อนกลับ
                </button>
                <div className="px-2 py-1 select-none font-medium">
                  หน้า <strong>{quickPage}</strong> จาก {totalPages}
                </div>
                <button
                  type="button"
                  disabled={quickPage >= totalPages}
                  onClick={() => setQuickPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-slate-350 rounded bg-white font-bold hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer select-none transition"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Demerit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4" id="form-overlay">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 my-8 overflow-hidden relative" id="form-container">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-blue-400" />
                <span className="font-bold font-sans">แบบฟอร์มบันทึกพฤติกรรมและการหักคะแนน</span>
              </div>
              <button 
                onClick={() => {
                  if(!successAnimation) setIsFormOpen(false);
                }} 
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
                disabled={successAnimation}
              >
                ✕
              </button>
            </div>

            {successAnimation ? (
              <div className="p-12 text-center space-y-6 flex flex-col items-center justify-center bg-teal-50/70" id="submission-success-view">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center animate-bounce shadow">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-teal-900">บันทึกข้อมูลพฤติกรรมสำเร็จแล้ว!</h3>
                  <p className="text-slate-600 text-sm max-w-md">ระบบบันทึกฐานความผิดของนักเรียนคนดังกล่าวเข้าสู่ระบบตรวจสอบคลาวด์เสร็จสมบูรณ์เรียบร้อยแล้ว รอการอนุมัติตัดแต้มสะสมโดยแอดมินหรือเจ้าของระบบต่อไป</p>
                </div>

                <div className="bg-white border border-teal-200 rounded-lg p-4 shadow-sm w-full max-w-md divide-y divide-slate-100 space-y-2.5">
                  <div className="flex justify-between text-xs pb-1.5 text-slate-500">
                    <span>รหัสเคสตรวจสอบ (Case ID)</span>
                    <span className="font-mono font-bold text-slate-800">{lastSubmittedId}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 text-slate-500">
                    <span>สถานะการบันทึกฐานข้อมูล</span>
                    <span className="bg-amber-50 border border-amber-150 text-amber-700 px-1.5 py-0.5 rounded font-black">
                      รอการพิจารณาตรวจสอบ/เซ็นอนุมัติโดยแอดมิน
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-850 cursor-pointer"
                >
                  กลับไปหน้าแดชบอร์ด
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: ข้อมูลนักเรียน */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/60 space-y-3 shadow-3xs">
                  <h4 className="text-sm font-bold text-blue-900 flex items-center space-x-1.5 pb-2 border-b border-blue-200/50">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>ข้อมูลนักเรียนที่เลือกทำโทษพฤติกรรม</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-3xs">
                      <span className="text-[10.5px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">เลขประจำตัวนักเรียน (Student ID)</span>
                      <strong className="text-sm font-mono text-slate-700 font-bold">{studentId}</strong>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-3xs">
                      <span className="text-[10.5px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">ชื่อ - นามสกุล นักเรียน (Full Name)</span>
                      <strong className="text-sm text-slate-800 font-bold">{studentName}</strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-3xs">
                      <span className="text-[10.5px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider font-sans">ชั้นเรียน (Classroom)</span>
                      <div>
                        <span className="inline-block bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded border border-blue-200 font-sans">
                          {studentClass}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: รายการความผิด */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-sans">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 font-sans">
                      <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm"></span>
                      <span>2. เลือกข้อหาพฤติกรรมผิดวินัย</span>
                    </h4>
                    <span className="bg-rose-50 text-rose-700 text-xs font-bold font-mono px-2.5 py-1 rounded border border-rose-200 shadow-sm font-sans">
                      คะแนนความผิดที่จะเพิ่ม: +{calculatedPoints} คะแนน
                    </span>
                  </div>

                  {/* หมวด 100 */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1.5 rounded flex items-center justify-between border border-blue-100 font-sans">
                      <span>หมวด 100 ความผิดสถานเบา (ครั้งละ 5 คะแนน)</span>
                      <span className="font-mono text-[10px]">101 - 120</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {offensesListState.filter(o => o.category === 'light').map(item => (
                        <label 
                          key={item.code} 
                          className={`flex items-start space-x-2 p-2 rounded-lg border transition cursor-pointer ${
                            selectedOffenseCodes.includes(item.code)
                              ? 'border-blue-400 bg-blue-50/50 text-blue-900 font-medium'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOffenseCodes.includes(item.code)}
                            onChange={() => handleOffenseToggle(item.code)}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="font-bold text-blue-600 font-mono">[{item.code}]</span>{' '}
                            <span>{item.title}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* หมวด 200 */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1.5 rounded flex items-center justify-between border border-amber-100 font-sans">
                      <span>หมวด 200 ความผิดสถานกลาง (ครั้งละ 10 คะแนน)</span>
                      <span className="font-mono text-[10px]">201 - 208</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
                      {offensesListState.filter(o => o.category === 'medium').map(item => (
                        <label 
                          key={item.code} 
                          className={`flex items-start space-x-2 p-2 rounded-lg border transition cursor-pointer ${
                            selectedOffenseCodes.includes(item.code)
                              ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-medium'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOffenseCodes.includes(item.code)}
                            onChange={() => handleOffenseToggle(item.code)}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="flex-1 col-span-3">
                            <span className="font-bold text-amber-600 font-mono">[{item.code}]</span>{' '}
                            <span>{item.title}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: รายละเอียดเพิ่มเติมและหลักฐาน */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-1.5 font-sans">
                      <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm font-sans"></span>
                      <span>3. บันทึกเพิ่มเติมเและแนบหลักฐาน</span>
                    </h4>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 block">รายละเอียดและคำอธิบายเหตุการณ์ (Notes)</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="กรุณากรอกข้อมูลบริบทเพิ่มเติม เช่น พฤติกรรมที่สังเกตพบ การตักเตือนขั้นต้น สถานที่เกิดเหตุ ฯลฯ"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        id="form-notes-input"
                      />
                    </div>

                    <EvidenceSelector onChange={(b64) => setEvidenceBase64(b64)} />
                  </div>

                  {/* Section 4: ลายเซ็นครูและนักเรียนประพฤติ */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                      <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm"></span>
                      <span>4. ลงนามลายเซ็นตักเตือน (Sign-off)</span>
                    </h4>

                    <div className="space-y-4">
                      <SignaturePad 
                        label="ลายเซ็นนักเรียนที่ตระหนักในความประพฤติผิดกฎ (Student Signature)" 
                        onChange={(b64) => setStudentSignature(b64)}
                        placeholderText="ผู้กระทำผิดเซ็นยืนยันรับทราบที่นี่"
                      />

                      <SignaturePad 
                        label="ลายเซ็นครูผู้ตักเตือน/รายงานความพฤติ (Teacher Signature)" 
                        onChange={(b64) => setTeacherSignature(b64)}
                        placeholderText="ครูผู้หักคะแนนเซ็นที่นี่"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 font-bold text-white rounded-lg text-sm shadow hover:shadow-md cursor-pointer transition"
                    id="btn-submit-demerit"
                  >
                    บันทึกรายงานพฤติกรรม (Save Report)
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Filters & Records Feed */}
      {teacher?.isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="history-section">
        {/* Fiters & Action bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="filters-toolbar">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm">รายการประวัติและคัดกรอง</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาตามชื่อ /รหัส..."
                className="pl-9 pr-3 py-1.5 border border-slate-200 text-xs rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="search-input"
              />
            </div>

            {/* Class filter */}
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 text-xs rounded-lg bg-white"
              id="filter-class"
            >
              <option value="all">ทุกชั้นปี</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 text-xs rounded-lg bg-white"
              id="filter-status"
            >
              <option value="all">ทุกสถานะการอนุมัติ</option>
              <option value="pending">รอแอดมินอนุมัติผล</option>
              <option value="acknowledged">อนุมัติเรียบร้อยประพฤติ</option>
            </select>
          </div>
        </div>

        {/* List Feed */}
        <div className="overflow-x-auto min-w-full" id="records-table-container">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">วัน-เวลา</th>
                <th className="py-2.5 px-3">นักเรียน / ชั้น</th>
                <th className="py-2.5 px-3">ข้อหาที่ทำวินัยผิดและคะแนน</th>
                <th className="py-2.5 px-3">คะแนนรวม</th>
                <th className="py-2.5 px-3">ผู้บันทึก</th>
                <th className="py-2.5 px-3 text-center">การอนุมัติ</th>
                <th className="py-2.5 px-3 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    ไม่พบรายการบันทึกประวัติความประพฤติที่ตรงกับเงื่อนไขสะสม
                  </td>
                </tr>
              ) : (
                filteredRecords.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50" id={`row-${item.id}`}>
                    <td className="py-3 px-3 tabular-nums text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('th-TH', { 
                        day: 'numeric', month: 'short', year: '2-digit' 
                      })}{' • '}{new Date(item.createdAt).toLocaleTimeString('th-TH', { 
                        hour: '2-digit', minute: '2-digit' 
                      })} น.
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{item.studentName}</div>
                      <div className="text-slate-400 text-[10px] font-mono">รหัส {item.studentId} • ชั้น {item.studentClass}</div>
                    </td>
                    <td className="py-3 px-3 max-w-[240px] truncate">
                      <span className="space-x-1">
                        {item.offenses.map(o => (
                          <span 
                            key={o.code} 
                            className="inline-block bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200"
                            title={o.title}
                          >
                            {o.code} (+{o.points})
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-rose-600 font-bold font-mono">+{item.totalPoints} คะแนน</td>
                    <td className="py-3 px-3 text-slate-500">{item.teacherName}</td>
                    <td className="py-3 px-3 text-center">
                      {item.parentAck ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 text-[10px] font-semibold inline-flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>อนุมัติแล้ว</span>
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-semibold inline-flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>รออนุมัติ</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        id={`btn-view-${item.id}`}
                        className="px-3 py-1 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 rounded text-[10px] font-semibold cursor-pointer transition"
                      >
                        ตรวจสอบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Record Inspect Slip Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 shadow-2xl" id="inspect-modal">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 my-8 overflow-hidden relative shadow-2xl" id="inspect-card">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm tracking-tight font-sans">บัตรบันทึกและสะสมคะแนนพฤติกรรมวินัย</h4>
                <p className="text-[10px] text-slate-300 font-mono">ID: {selectedRecord.id}</p>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)} 
                className="text-slate-200 hover:text-white font-bold cursor-pointer"
                id="btn-close-inspect"
              >
                ✕
              </button>
            </div>

            {/* Slip content */}
            <div className="p-6 space-y-6">
              {/* Grid 1: Basic Student metadata */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Demerits Accumulated</span>
                  <span className="text-2xl font-bold font-mono text-rose-600">+{selectedRecord.totalPoints}</span>
                </div>

                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">ข้อมูลผู้ประพฤติผิดกฎระเบียบ</h5>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600">
                  <div><span className="text-slate-400">ชื่อนักเรียน:</span> <strong className="text-slate-800">{selectedRecord.studentName}</strong></div>
                  <div><span className="text-slate-400">เลขประจำตัว:</span> <strong className="text-slate-800 font-mono">{selectedRecord.studentId}</strong></div>
                  <div><span className="text-slate-400">ระดับชั้น:</span> <strong className="text-slate-800 font-mono">{selectedRecord.studentClass}</strong></div>
                  <div><span className="text-slate-400">วันที่บันทึกคะแนน:</span> <strong className="text-slate-800 tabular-nums">
                    {new Date(selectedRecord.createdAt).toLocaleDateString('th-TH', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })}
                  </strong></div>
                </div>
              </div>

              {/* Grid 2: Infractions Details */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ฐานความผิดกฎวินัยสะสม</h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedRecord.offenses.map(o => (
                    <div key={o.code} className="p-3 bg-white text-xs flex justify-between items-center">
                      <div>
                        <span className="font-mono bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2 font-bold">{o.code}</span>
                        <span className="text-slate-700">{o.title}</span>
                      </div>
                      <span className="font-mono text-rose-600 font-bold">+{o.points} คะแนน</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra notes & Evidence image */}
              {(selectedRecord.notes || selectedRecord.evidenceBase64) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRecord.notes && (
                    <div className="p-3.5 border border-slate-250 bg-amber-50/20 text-xs rounded-lg space-y-1 text-slate-700">
                      <span className="font-bold text-amber-800 block text-[10px] uppercase">บันทึกช่วยจำ / ข้อสังเกตเพิ่มเติม</span>
                      <p className="italic">{selectedRecord.notes}</p>
                    </div>
                  )}

                  {selectedRecord.evidenceBase64 && (
                    <div className="border border-slate-200 rounded-lg p-2 bg-slate-100 text-center flex flex-col justify-center items-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">ภาพหลักฐานวัตถุพยานพฤติกรรม</span>
                      <img 
                        src={selectedRecord.evidenceBase64} 
                        alt="Infraction Evidence Proof" 
                        className="max-h-24 rounded object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Signatures Panel */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ลายเซ็นอิเล็กทรอนิกส์ยืนยันพฤติกรรม</h5>
                <div className="grid grid-cols-3 gap-3">
                  {/* Student Sig */}
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 block mb-1">นักเรียนที่กระทำความผิด</span>
                    {selectedRecord.studentSignature.includes('mock_stub') ? (
                      <div className="h-10 text-xs italic text-slate-400 flex items-center">เซ็นชื่อเข้าระบบแล้ว (Staged)</div>
                    ) : (
                      <img src={selectedRecord.studentSignature} alt="Student Signature" className="h-10 object-contain" referrerPolicy="no-referrer" />
                    )}
                    <span className="text-[9px] text-slate-500 block border-t border-slate-150 w-full pt-1 mt-1 font-semibold truncate">{selectedRecord.studentName}</span>
                  </div>

                  {/* Teacher Sig */}
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 block mb-1">ครูผู้สอบสืบและลงนาม</span>
                    {selectedRecord.teacherSignature.includes('mock_stub') ? (
                      <div className="h-10 text-xs italic text-slate-400 flex items-center">เซ็นชื่อเข้าระบบแล้ว (Staged)</div>
                    ) : (
                      <img src={selectedRecord.teacherSignature} alt="Teacher Signature" className="h-10 object-contain" referrerPolicy="no-referrer" />
                    )}
                    <span className="text-[9px] text-slate-500 block border-t border-slate-150 w-full pt-1 mt-1 font-semibold truncate">{selectedRecord.teacherName}</span>
                  </div>

                  {/* Admin Approval Sig */}
                  <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50 flex flex-col items-center justify-between col-span-1">
                    <span className="text-[10px] text-slate-450 block mb-1 font-bold">ผู้อนุมัติประพฤติ (แอดมิน)</span>
                    
                    {selectedRecord.parentAck && selectedRecord.parentSignature ? (
                      <div className="flex flex-col items-center w-full">
                        {selectedRecord.parentSignature.startsWith('data:image') ? (
                          <img src={selectedRecord.parentSignature} alt="Admin Signature" className="h-10 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-10 text-xs italic text-emerald-600 flex items-center font-semibold">อนุมัติแล้ว (ระบบระบบคลาวด์)</div>
                        )}
                        <span className="text-[9px] text-emerald-700 block border-t border-slate-150 w-full pt-1 mt-1 font-bold truncate">แอดมิน: {selectedRecord.parentName}</span>
                      </div>
                    ) : (
                      <div className="py-2 w-full flex flex-col items-center justify-center h-full">
                        <div className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold">รอแอดมินอนุมัติ</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Interactive Approval Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-slate-200 px-6 py-4 flex flex-col space-y-4">
              {!selectedRecord.parentAck ? (
                !showApprovalForm ? (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
                    <div className="flex items-center space-x-2 text-blue-700 text-xs">
                      <Info className="w-4 h-4 shrink-0" />
                      <span className="font-sans font-semibold">เคสบันทึกพฤติกรรมนี้ รอการตรวจทานและเซ็นอนุมัติโดยเจ้าของระบบ/ผู้ดูแลระบบ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowApprovalForm(true);
                        setAdminApprovalName(teacher?.name || '');
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-xs font-black shadow hover:shadow-md transition cursor-pointer"
                      id="btn-trigger-approve"
                    >
                      <span>ดำเนินการอนุมัติความถูกต้อง ✍️</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800">แผงควบคุมการเซ็นอนุมัติ (แอดมิน/เจ้าของระบบ)</span>
                      <button
                        type="button"
                        className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer underline"
                        onClick={() => setShowApprovalForm(false)}
                      >
                        ยกเลิก
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[11px] font-bold text-slate-600 block">ชื่อผู้อนุมัติสะสม (เจ้าของระบบ/แอดมิน)</label>
                        <input
                          type="text"
                          value={adminApprovalName}
                          onChange={(e) => setAdminApprovalName(e.target.value)}
                          placeholder="เช่น นายแอดมิน แสนใจดี"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <SignaturePad
                          label="ลายเซ็นผู้อนุมัติประพฤติ (Admin Signature)"
                          onChange={(b64) => setAdminApprovalSignature(b64)}
                          placeholderText="เซ็นชื่ออนุมัติที่นี่"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-3 border-t border-slate-100/80">
                      <div className="max-w-[280px]">
                        {googleToken ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-150">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                            ระบบพร้อม: จะซิงค์ประวัติลง Google Sheet อัตโนมัติทันทีหลังจากกดอนุมัติ ⚡
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-[10px] text-amber-700 bg-amber-50/70 p-2 rounded-md border border-amber-200/60 leading-tight">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                              แจ้งเตือน: ยังไม่ได้เชื่อมต่อ Google Sheets ⚠️
                            </div>
                            <span>กรุณากดเชื่อมต่อปุ่มสีน้ำเงินด้านขวาบนของระบบก่อน เพื่อให้โปรแกรมซิงค์ลงชีตได้โดยอัตโนมัติ</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!adminApprovalSignature}
                        onClick={async () => {
                          if (!adminApprovalSignature) return;
                          setIsSubmittingApproval(true);
                          try {
                            const nowStr = new Date().toISOString();
                            const approvalName = adminApprovalName.trim() || teacher?.name || 'แอดมินระบบวินัย';
                            
                             await submitParentAckInDb(
                              selectedRecord.id,
                              approvalName,
                              adminApprovalSignature,
                              nowStr
                            );

                            const approvedRecord: DemeritRecord = {
                              ...selectedRecord,
                              parentAck: true,
                              parentName: approvalName,
                              parentSignature: adminApprovalSignature,
                              parentAckAt: nowStr
                            };

                            // If connected to Google Sheets (via OAuth), append as an official approved row!
                            if (googleToken) {
                              const spreadId = extractSpreadsheetId(targetSpreadsheetUrl);
                              if (spreadId) {
                                try {
                                  console.log('Appending officially approved demerit record to Google Sheets...');
                                  await appendDemeritRecordToSheet(spreadId, googleToken, approvedRecord, 'บันทึกการหักคะแนน');
                                  console.log('Appended approved record to Google Sheets successfully.');
                                } catch (sheetErr) {
                                  console.error('Failed to save approved record to Google Sheets:', sheetErr);
                                  alert('อนุมัติในระบบคลาวด์สำเร็จแล้ว แต่พบปัญหาการเขียนข้อมูลลง Google Sheets: ' + (sheetErr instanceof Error ? sheetErr.message : String(sheetErr)));
                                }
                              }
                            }

                            // Update local state directly so it feels synchronous and lightning-fast
                            setSelectedRecord(approvedRecord);

                            // Synchronize locally list state if subscription takes 3 seconds
                            setRecords(prev => prev.map(r => r.id === selectedRecord.id ? approvedRecord : r));

                            setIsSubmittingApproval(false);
                            setShowApprovalForm(false);
                            setAdminApprovalSignature('');
                            alert('อนุมัติบันทึกความผิดนักเรียนเรียบร้อยแล้ว!');
                          } catch (e) {
                            console.error(e);
                            alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + (e instanceof Error ? e.message : String(e)));
                            setIsSubmittingApproval(false);
                          }
                        }}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow transition cursor-pointer shrink-0 ${
                          adminApprovalSignature 
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' 
                            : 'bg-slate-300 cursor-not-allowed text-slate-500'
                        }`}
                      >
                        {isSubmittingApproval ? 'กำลังบันทึกการอนุมัติ...' : 'อนุมัติการหักคะแนนพฤติกรรมเรียบร้อย 🟢'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center space-x-2 text-emerald-700 text-xs">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>เคสบันทึกนี้ได้รับการเซ็นชื่อตรวจสอบและอนุมัติอย่างเป็นทางการแล้ว โดยแอดมิน <strong className="text-slate-800 font-bold">{selectedRecord.parentName}</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">อนุมัติเมื่อ: {new Date(selectedRecord.parentAckAt || '').toLocaleString('th-TH')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
