// ── ตั้งค่าการเชื่อมต่อ ──
// นำ URL ที่ได้จากการ Deploy Apps Script (...  /exec) มาใส่ตรงนี้
// และ API_KEY ให้ตรงกับค่าที่ตั้งใน Script Properties ของ Apps Script
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxl6FE_-WHetC9qBWExNWG6dQ9nsEANtceavJcIvXXf4dlZXRPstsUuK-DvVYHPOxm0/exec',
  API_KEY: 'openssl rand -hex 16',
  MAX_IMAGE_MB: 1 // ขนาดรูปสูงสุดหลังบีบอัด (MB)
};
