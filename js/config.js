// ── ตั้งค่าการเชื่อมต่อ ──
// นำ URL ที่ได้จากการ Deploy Apps Script (...  /exec) มาใส่ตรงนี้
// และ API_KEY ให้ตรงกับค่าที่ตั้งใน Script Properties ของ Apps Script
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwQqj5WZTmM6fEIyD79qG5J-svfTIJt8JlE63oBVmLEuYhq_nHavsnPs3EaCGQl_9L82Q/exec',
  API_KEY: 'script',
  MAX_IMAGE_MB: 1 // ขนาดรูปสูงสุดหลังบีบอัด (MB)
};

// ── รายชื่อหน่วยงาน (ล็อกไว้ตายตัวจากคอลัมน์ A ของ PEA_Master เพื่อให้หน้าแรกโหลดเร็ว ไม่ต้องเรียก API) ──
// ประกาศที่ไฟล์นี้ที่เดียวเท่านั้น (อย่าไปประกาศซ้ำใน app.js อีก จะเกิด SyntaxError: already been declared)
// ถ้ามีหน่วยงานเพิ่ม/เปลี่ยนชื่อในชีท PEA_Master ในอนาคต ต้องมาแก้ไขลิสต์นี้เอง ต้องสะกดตรงกับคอลัมน์ A เป๊ะๆ
const DEPARTMENTS = [
  'กฟจ.นครพนม (L)',
  'กฟส.ท่าอุเทน (XS)',
  'กฟส.ธาตุพนม (S)',
  'กฟส.นาแก (S)',
  'กฟส.นาทม (XS)',
  'กฟส.นาหว้า (XS)',
  'กฟส.บ้านแพง (S)',
  'กฟส.ปลาปาก (XS)',
  'กฟส.โพนสวรรค์ (XS)',
  'กฟส.เรณูนคร (XS)',
  'กฟส.วังยาง (XS)',
  'กฟส.ศรีสงคราม (XS)'
];
