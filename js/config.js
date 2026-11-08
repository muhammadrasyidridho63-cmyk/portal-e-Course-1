/**
 * config.js - Konfigurasi Endpoint Frontend EduPath Digital
 * Sesuai panduan /gas-pro-api & /gas-rahasia-script-properties
 * 
 * PENTING: Masukkan Web App URL hasil Deploy Google Apps Script di bawah ini.
 * Contoh: https://script.google.com/macros/s/AKfycbyoOHFTEC8aNRjxW8_aceuOGW1lXdkG5xNSvb_CzcOvzdWW2cbw6UCMrOwamGcrGU1Z/exec
 */

window.CONFIG = {
  // Masukkan URL Google Apps Script Anda setelah di-deploy:
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyoOHFTEC8aNRjxW8_aceuOGW1lXdkG5xNSvb_CzcOvzdWW2cbw6UCMrOwamGcrGU1Z/exec',

  APP_NAME: 'EduPath Digital',
  SLOGAN: 'Platform Belajar & Marketplace Digital Mandiri',
  VERSION: '1.0.0',
  CACHE_TTL_MS: 60 * 1000 // 60 Detik SWR Cache
};
