import { useState } from 'react';
import { ShieldCheck, UserCheck, Flame, Scale, BookOpen, GraduationCap } from 'lucide-react';
import TeacherDashboard from './components/TeacherDashboard';
import { isRealFirebase } from './firebase';

export default function App() {
  return (
    <div id="school-demerit-system-root" className="min-h-screen bg-[#F1F5F9] text-[#1E293B] font-sans flex flex-col antialiased selection:bg-pink-100">
      
      {/* Principal School Header banner */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 sticky top-0 z-30 shadow-sm" id="main-school-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-pink-500 text-white flex items-center justify-center shadow-md animate-pulse">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-sans font-black text-lg tracking-tight text-slate-800">โรงเรียนพรหมพิรามวิทยา (Phromphiram Wittaya)</span>
              </div>
              <h1 className="text-xs text-slate-500 font-medium tracking-wider uppercase">ระบบดิจิทัลเพื่อการส่งเสริมวินัยสร้างสรรค์</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Database Sync Indicator status */}
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] text-slate-500 font-mono font-bold col-span-1 shadow-inner">
              {isRealFirebase ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping mr-1"></span>
                  <span className="text-emerald-700 font-sans">คลาวด์ไลฟ์ (Connected to cloud)</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block mr-1"></span>
                  <span className="text-blue-700 font-sans">ระบบจำลองแบบออฟไลน์ (Local Safe mode)</span>
                </>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Primary body view content area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6" id="main-content-canvas animate-fade-in">
        
        {/* Warning rules helper banner */}
        <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4" id="intro-banner-box">
          <div className="space-y-2.5 md:max-w-3xl text-center md:text-left">
            <h2 className="font-extrabold text-base tracking-tight text-slate-800 flex items-center justify-center md:justify-start space-x-2">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>ระบบดิจิทัลเพื่อการส่งเสริมวินัยสร้างสรรค์ (ตามระเบียบ ศธ. พ.ศ. 2569)</span>
            </h2>
            <div className="text-xs text-slate-500 leading-relaxed font-sans space-y-2">
              <p>แอปพลิเคชันนี้พัฒนาขึ้นเพื่อสนับสนุนนโยบายสมานฉันท์และสร้างวินัยเชิงบวกในสถานศึกษา โดยระบบจะทำการบันทึกและประมวลผลคะแนนพฤติกรรมอย่างโปร่งใสแบบเรียลไทม์ ดังนี้:</p>
              <div className="space-y-1.5 pl-3 border-l-2 border-blue-400 bg-slate-50/50 py-1.5 px-2 rounded-lg text-slate-600">
                <p>• <strong>หมวด 100 ความผิดสถานเบา:</strong> บันทึกคะแนนสะสมความผิด +5 คะแนน</p>
                <p>• <strong>หมวด 200 ความผิดสถานกลาง:</strong> บันทึกคะแนนสะสมความผิด +10 คะแนน</p>
              </div>
              <p>มุ่งเน้นการจัดเก็บข้อมูลที่ถูกต้อง แม่นยำ และตรวจสอบได้ เพื่อร่วมมือกันปรับเปลี่ยนพฤติกรรมของนักเรียนในทางสร้างสรรค์</p>
            </div>
          </div>

          <div className="bg-pink-50/75 px-5 py-3 rounded-xl border border-pink-100 text-center shrink-0 w-full md:w-auto">
            <span className="text-[10px] uppercase font-bold text-pink-600 font-mono tracking-wider block">เกณฑ์เริ่มต้นความผิด</span>
            <span className="text-3xl font-black text-pink-600 font-mono leading-none tracking-tight">0</span>
            <span className="text-[10px] text-pink-500 block font-medium">คะแนนสะสมวินัยเสีย</span>
          </div>
        </div>

        {/* View switching panel wrapper */}
        <div className="transition-all duration-300">
          <TeacherDashboard />
        </div>

      </main>

      {/* Noble School status footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400 rounded-t-xl mt-auto" id="main-school-footer">
        <p>© 2026 ฝ่ายควบคุมความประพฤติและวิชาการ โรงเรียนพรหมพิรามวิทยา • มุ่งมั่นคุณธรรม นำวิชาการ สืบสานวินัยสรรค์</p>
        <p className="text-[10px] text-slate-350 mt-1 font-mono">Student Demerit Electronic Notification Core • Supported by AI Studio sandboxed cloud</p>
      </footer>

    </div>
  );
}
