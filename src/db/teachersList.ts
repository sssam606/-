export interface Teacher {
  id: string; // Login ID, e.g. phws101-1
  name: string;
  email: string;
  classRoom: string;
  advisorRole: 'ครูที่ปรึกษา 1' | 'ครูที่ปรึกษา 2';
  password: string; // Password, e.g. phws101-1
}

const DEFAULT_TEACHERS_LIST: Teacher[] = [
  // ม.1
  { id: 'phws101-1', name: 'นางธนวรรณ สนกล้า', email: 'thanawan.s@pmw.ac.th', classRoom: 'ม.1/1', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws101-1' },
  { id: 'phws101-2', name: 'Mr. Randy A. Camfuli', email: 'randy.c@pmw.ac.th', classRoom: 'ม.1/1', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws101-2' },
  { id: 'phws102-1', name: 'นางสาวมิ่งกมล เคียงข้าง', email: 'mingkamon.k@pmw.ac.th', classRoom: 'ม.1/2', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws102-1' },
  { id: 'phws102-2', name: 'นางสาวกรรณิการ์ สีม่วง', email: 'kannika.s@pmw.ac.th', classRoom: 'ม.1/2', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws102-2' },
  { id: 'phws103-1', name: 'นางสาวธิรดา สระทองอยู่', email: 'thirada.s@pmw.ac.th', classRoom: 'ม.1/3', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws103-1' },
  { id: 'phws103-2', name: 'นางสาวหนึ่งฤทัย จันทร์ชุ่ม', email: 'nuengruthai.j@pmw.ac.th', classRoom: 'ม.1/3', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws103-2' },
  { id: 'phws104-1', name: 'นางสาวกนกวรรณ มีบุญล้ำ', email: 'kanokwan.m@pmw.ac.th', classRoom: 'ม.1/4', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws104-1' },
  { id: 'phws104-2', name: 'นางภัทราพร รัตนสากล', email: 'phattraporn.r@pmw.ac.th', classRoom: 'ม.1/4', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws104-2' },
  { id: 'phws105-1', name: 'นางจิรพรภัทร์ ศศิณัฏธาฐ์', email: 'jirapornphat.s@pmw.ac.th', classRoom: 'ม.1/5', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws105-1' },
  { id: 'phws105-2', name: 'นางนัชชนา พรหมพร', email: 'natchana.p@pmw.ac.th', classRoom: 'ม.1/5', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws105-2' },
  { id: 'phws106-1', name: 'นายขวัญชัย ศรีทอง', email: 'kwanchai.s@pmw.ac.th', classRoom: 'ม.1/6', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws106-1' },
  { id: 'phws106-2', name: 'นางสาวจิตทิวา วุฒิทา', email: 'chittiwa.w@pmw.ac.th', classRoom: 'ม.1/6', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws106-2' },
  { id: 'phws107-1', name: 'นางสาวรทิกร พรพุฒิโชติ', email: 'rathikon.p@pmw.ac.th', classRoom: 'ม.1/7', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws107-1' },
  { id: 'phws107-2', name: 'นายรัฐสรรค์ ภูมิพัฒนาโสภณ', email: 'ratthasan.p@pmw.ac.th', classRoom: 'ม.1/7', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws107-2' },

  // ม.2
  { id: 'phws201-1', name: 'นายทศพล สุดดี', email: 'todsapon.s@pmw.ac.th', classRoom: 'ม.2/1', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws201-1' },
  { id: 'phws201-2', name: 'นางอานุช จูเมฆา', email: 'anuch.j@pmw.ac.th', classRoom: 'ม.2/1', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws201-2' },
  { id: 'phws202-1', name: 'นางสาวจุรีรัตน์ ปงผาบ', email: 'jureerat.p@pmw.ac.th', classRoom: 'ม.2/2', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws202-1' },
  { id: 'phws202-2', name: 'นายณัฐพล คงเปี่ยม', email: 'nattapon.k@pmw.ac.th', classRoom: 'ม.2/2', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws202-2' },
  { id: 'phws203-1', name: 'นางสาวศวิตา พร้าโมต', email: 'sawita.p@pmw.ac.th', classRoom: 'ม.2/3', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws203-1' },
  { id: 'phws203-2', name: 'นายธนายุทธ เรือนก้อน', email: 'thanayut.r@pmw.ac.th', classRoom: 'ม.2/3', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws203-2' },
  { id: 'phws204-1', name: 'นางสาวสุวรรณภัค เพียจันทร์', email: 'suwanpak.p@pmw.ac.th', classRoom: 'ม.2/4', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws204-1' },
  { id: 'phws204-2', name: 'นายณัฐฤทธิ์ ศรีโสภา', email: 'nattarith.s@pmw.ac.th', classRoom: 'ม.2/4', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws204-2' },
  { id: 'phws205-1', name: 'นางสาวสรารัตน์ สอนสุกอง', email: 'sararat.s@pmw.ac.th', classRoom: 'ม.2/5', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws205-1' },
  { id: 'phws205-2', name: 'นายกฤติบุญ คุณประทุม', email: 'krittiboon.k@pmw.ac.th', classRoom: 'ม.2/5', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws205-2' },
  { id: 'phws206-1', name: 'นางลาวัลย์ แสงขำ', email: 'lawan.s@pmw.ac.th', classRoom: 'ม.2/6', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws206-1' },
  { id: 'phws206-2', name: 'นางสาวสุดารัตน์ แดงน้ำคู้', email: 'sudarat.d@pmw.ac.th', classRoom: 'ม.2/6', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws206-2' },
  { id: 'phws207-1', name: 'นางรัตนา วงศ์สอน', email: 'rattana.w@pmw.ac.th', classRoom: 'ม.2/7', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws207-1' },
  { id: 'phws207-2', name: 'นางสาวมณีวรรณ อินเกิด', email: 'maneewan.i@pmw.ac.th', classRoom: 'ม.2/7', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws207-2' },

  // ม.3
  { id: 'phws301-1', name: 'นายอุดร ภูสมสี', email: 'udon.p@pmw.ac.th', classRoom: 'ม.3/1', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws301-1' },
  { id: 'phws301-2', name: 'นางสาวพชรพรรณ สุวรรณโณ', email: 'phacharaphan.s@pmw.ac.th', classRoom: 'ม.3/1', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws301-2' },
  { id: 'phws302-1', name: 'นางสาวธนาภรณ์ แสงทอง', email: 'thanaporn.s@pmw.ac.th', classRoom: 'ม.3/2', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws302-1' },
  { id: 'phws302-2', name: 'นางสาวศศิประภา ลอกทอง', email: 'sasiprapha.l@pmw.ac.th', classRoom: 'ม.3/2', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws302-2' },
  { id: 'phws303-1', name: 'นางสุภาพร สวัสดิเทพ', email: 'supaporn.s@pmw.ac.th', classRoom: 'ม.3/3', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws303-1' },
  { id: 'phws303-2', name: 'นายภคพนธ์ ศิรินันทยา', email: 'phakaphon.s@pmw.ac.th', classRoom: 'ม.3/3', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws303-2' },
  { id: 'phws304-1', name: 'นางภควรรณ นาคสิงห์', email: 'phakawan.n@pmw.ac.th', classRoom: 'ม.3/4', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws304-1' },
  { id: 'phws304-2', name: 'นางสาวsุนันทา มูลน้ำอ่าง', email: 'sunantha.m@pmw.ac.th', classRoom: 'ม.3/4', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws304-2' },
  { id: 'phws305-1', name: 'นายอนุวัฒน์ อ่อนคำภา', email: 'anuwat.o@pmw.ac.th', classRoom: 'ม.3/5', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws305-1' },
  { id: 'phws305-2', name: 'นางสาวปรางค์ปรารมภ์ เทียนงาม', email: 'prangprarom.t@pmw.ac.th', classRoom: 'ม.3/5', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws305-2' },
  { id: 'phws306-1', name: 'นายภาคภูมิ ใจสุดา', email: 'phakphoom.j@pmw.ac.th', classRoom: 'ม.3/6', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws306-1' },
  { id: 'phws306-2', name: 'นางศิริโสภา พรหมมี', email: 'sirisopa.p@pmw.ac.th', classRoom: 'ม.3/6', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws306-2' },
  { id: 'phws307-1', name: 'นายสายชล เพชรกระจาด', email: 'saichon.p@pmw.ac.th', classRoom: 'ม.3/7', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws307-1' },
  { id: 'phws307-2', name: 'นางสาววิภาวี สิงห์รักษ์', email: 'wipawee.s@pmw.ac.th', classRoom: 'ม.3/7', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws307-2' },

  // ม.4
  { id: 'phws401-1', name: 'นางสาวเอมอัชนา เพ็ชรสะอาด', email: 'aimachana.p@pmw.ac.th', classRoom: 'ม.4/1', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws401-1' },
  { id: 'phws401-2', name: 'นางสาวแพรวดาว พรหมเอาะ', email: 'praewdao.p@pmw.ac.th', classRoom: 'ม.4/1', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws401-2' },
  { id: 'phws402-1', name: 'นางสาวสุภาวดี ขุนเณรพานิช', email: 'supawadee.k@pmw.ac.th', classRoom: 'ม.4/2', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws402-1' },
  { id: 'phws402-2', name: 'นางสาวกานต์ระวี พันธุ์ศิริ', email: 'kanrawee.p@pmw.ac.th', classRoom: 'ม.4/2', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws402-2' },
  { id: 'phws403-1', name: 'นางรัชนีวรรณ เฮงทรัพย์', email: 'rachaneewan.h@pmw.ac.th', classRoom: 'ม.4/3', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws403-1' },
  { id: 'phws403-2', name: 'นางสาวผกายดาว มั่นคง', email: 'phakaidao.m@pmw.ac.th', classRoom: 'ม.4/3', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws403-2' },
  { id: 'phws404-1', name: 'นางสาวรุ่งอรุณ พินิจผล', email: 'rungaroon.p@pmw.ac.th', classRoom: 'ม.4/4', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws404-1' },
  { id: 'phws404-2', name: 'นายวชิร กลีบลำดวน', email: 'wachira.k@pmw.ac.th', classRoom: 'ม.4/4', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws404-2' },
  { id: 'phws405-1', name: 'นางสาวกุสาวดี คงจำเนียร', email: 'kusawadee.k@pmw.ac.th', classRoom: 'ม.4/5', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws405-1' },
  { id: 'phws405-2', name: 'นายธีรพงศ์ สถาน', email: 'theerapong.s@pmw.ac.th', classRoom: 'ม.4/5', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws405-2' },
  { id: 'phws406-1', name: 'นายสานิตย์ ทองจันทร์', email: 'sanit.t@pmw.ac.th', classRoom: 'ม.4/6', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws406-1' },
  { id: 'phws406-2', name: 'นางสาวนาถอนงค์ กางถัน', email: 'nathanong.k@pmw.ac.th', classRoom: 'ม.4/6', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws406-2' },
  { id: 'phws407-1', name: 'นายภาณุพงศ์ สุดใจ', email: 'panupong.s@pmw.ac.th', classRoom: 'ม.4/7', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws407-1' },
  { id: 'phws407-2', name: 'นางสาวสุทธิดา เสียงเสนาะ', email: 'sutthida.s@pmw.ac.th', classRoom: 'ม.4/7', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws407-2' },

  // ม.5
  { id: 'phws501-1', name: 'นางวัฒนา อินทอำภา', email: 'wattana.i@pmw.ac.th', classRoom: 'ม.5/1', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws501-1' },
  { id: 'phws501-2', name: 'นายเฉลิมพล สโมรินทร์', email: 'chalermpol.s@phws.ac.th', classRoom: 'ม.5/1', advisorRole: 'ครูที่ปรึกษา 2', password: '595130' },
  { id: 'admin-snsam', name: 'แอดมิน (snsam606)', email: 'snsam606@gmail.com', classRoom: 'ทั่วไป', advisorRole: 'ครูที่ปรึกษา 1', password: '595130' },
  { id: 'phws502-1', name: 'นางสาวสวรส ปานเกิด', email: 'saworos.p@pmw.ac.th', classRoom: 'ม.5/2', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws502-1' },
  { id: 'phws502-2', name: 'นางพรทิพย์ สุขเต็มดี', email: 'porntip.s@pmw.ac.th', classRoom: 'ม.5/2', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws502-2' },
  { id: 'phws503-1', name: 'นางสาวลลิตา บุญเต็ม', email: 'lalita.b@pmw.ac.th', classRoom: 'ม.5/3', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws503-1' },
  { id: 'phws503-2', name: 'นายรชานนท์ สุขมามอญ', email: 'rachanon.s@pmw.ac.th', classRoom: 'ม.5/3', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws503-2' },
  { id: 'phws504-1', name: 'นางบุษรินทร์ ปั้นทอง', email: 'butsarin.p@pmw.ac.th', classRoom: 'ม.5/4', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws504-1' },
  { id: 'phws504-2', name: 'นายมาโนช พรามพิทักษ์', email: 'manoch.p@pmw.ac.th', classRoom: 'ม.5/4', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws504-2' },
  { id: 'phws505-1', name: 'นางรุจี พีระพันธ์', email: 'rujee.p@pmw.ac.th', classRoom: 'ม.5/5', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws505-1' },
  { id: 'phws505-2', name: 'นางสาวสมสุวรรณ เผือกสกุล', email: 'somsuwan.p@pmw.ac.th', classRoom: 'ม.5/5', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws505-2' },
  { id: 'phws506-1', name: 'นางสาวธันยาภรณ์ พุกเพชร', email: 'thanyaporn.p@pmw.ac.th', classRoom: 'ม.5/6', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws506-1' },
  { id: 'phws506-2', name: 'นายวีรวัฒน์ เทศทิม', email: 'weerawat.t@pmw.ac.th', classRoom: 'ม.5/6', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws506-2' },
  { id: 'phws507-1', name: 'นางสาวนฤมล อยู่สุข', email: 'narumon.y@pmw.ac.th', classRoom: 'ม.5/7', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws507-1' },
  { id: 'phws507-2', name: 'นายนราธิป กระจง', email: 'narathip.k@pmw.ac.th', classRoom: 'ม.5/7', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws507-2' },

  // ม.6
  { id: 'phws601-1', name: 'นางสาวเนตรนภา สุขชวดมี', email: 'netnapa.s@pmw.ac.th', classRoom: 'ม.6/1', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws601-1' },
  { id: 'phws601-2', name: 'นางสาวอรุณวดี ปาอาภรณ์', email: 'arunwadee.p@pmw.ac.th', classRoom: 'ม.6/1', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws601-2' },
  { id: 'phws602-1', name: 'นางรัตนา เงินแจ้ง', email: 'rattana.n@pmw.ac.th', classRoom: 'ม.6/2', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws602-1' },
  { id: 'phws602-2', name: 'นางสาววาสนา บางแบ่ง', email: 'wasana.b@pmw.ac.th', classRoom: 'ม.6/2', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws602-2' },
  { id: 'phws603-1', name: 'นางสาวภรณ์พรรณ จันทร์แย้มสงค์', email: 'pornpan.j@pmw.ac.th', classRoom: 'ม.6/3', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws603-1' },
  { id: 'phws603-2', name: 'นางสาวชนาพร เมฆดี', email: 'chanaporn.m@pmw.ac.th', classRoom: 'ม.6/3', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws603-2' },
  { id: 'phws604-1', name: 'นางสาวพวงเพชร ภู่ธูป', email: 'poungpetch.p@pmw.ac.th', classRoom: 'ม.6/4', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws604-1' },
  { id: 'phws604-2', name: 'นายณัฐชนนท์ ปั้นแสง', email: 'nattachanon.p@pmw.ac.th', classRoom: 'ม.6/4', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws604-2' },
  { id: 'phws605-1', name: 'นายวรวุฒิ มะลิวงษ์', email: 'worawut.m@pmw.ac.th', classRoom: 'ม.6/5', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws605-1' },
  { id: 'phws605-2', name: 'นางทัศน์มิรา จักกภูมิ', email: 'tatsamira.j@pmw.ac.th', classRoom: 'ม.6/5', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws605-2' },
  { id: 'phws606-1', name: 'นางสาววิลาวัลย์ จันทร์พร', email: 'wilawan.j@pmw.ac.th', classRoom: 'ม.6/6', advisorRole: 'ครูที่ปรึกษา 1', password: 'phws606-1' },
  { id: 'phws606-2', name: 'นางสาวพลอยชมพู เพ็ญสุภา', email: 'ploychampoo.p@pmw.ac.th', classRoom: 'ม.6/6', advisorRole: 'ครูที่ปรึกษา 2', password: 'phws606-2' }
];

export const getInitialTeachers = (): Teacher[] => {
  let list = DEFAULT_TEACHERS_LIST;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('gsheet_teachers');
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse gsheet_teachers', e);
      }
    }
  }
  // Standardize domains to @phws.ac.th
  return list.map(t => ({
    ...t,
    email: t.email.replace(/@pmw\.ac\.th$/i, '@phws.ac.th')
  }));
};

export const TEACHERS_LIST: Teacher[] = getInitialTeachers();
