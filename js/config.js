// ── ตั้งค่าการเชื่อมต่อ ──
// นำ URL ที่ได้จากการ Deploy Apps Script (...  /exec) มาใส่ตรงนี้
// และ API_KEY ให้ตรงกับค่าที่ตั้งใน Script Properties ของ Apps Script
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwQqj5WZTmM6fEIyD79qG5J-svfTIJt8JlE63oBVmLEuYhq_nHavsnPs3EaCGQl_9L82Q/exec',
  API_KEY: 'script',
  MAX_IMAGE_MB: 1 // ขนาดรูปสูงสุดหลังบีบอัด (MB)
};

// ── รายชื่อหน่วยงาน (ล็อกไว้ตายตัว ไม่ดึงจาก Sheet เพื่อให้หน้าแรกโหลดเร็วขึ้น) ──
// ถ้ามีหน่วยงานเพิ่มในชีท PEA_Master ในอนาคต ให้เพิ่มชื่อในลิสต์นี้ด้วยตนเอง
const DEPARTMENTS = [
  'กฟจ.นครพนม (L)'
];
