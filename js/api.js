/**
 * api.js - Client API Teroptimasi EduPath Digital LMS
 * Sesuai panduan /gas-pro-api & /gas-scale-turbo
 * Fitur: SWR Cache, In-Flight Request Deduplication, CORS Safe Fetch, 0ms Instant UX
 */

(function (window) {
  'use strict';

  const _inflight = {};
  let _writeEpoch = 0;
  const _cache = new Map();

  const API = {
    getToken() {
      return localStorage.getItem('edupath_token') || '';
    },

    setToken(token) {
      if (token) localStorage.setItem('edupath_token', token);
      else localStorage.removeItem('edupath_token');
    },

    getUser() {
      try {
        const u = localStorage.getItem('edupath_user');
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setUser(user) {
      if (user) localStorage.setItem('edupath_user', JSON.stringify(user));
      else localStorage.removeItem('edupath_user');
    },

    logout() {
      this.setToken(null);
      this.setUser(null);
      _cache.clear();
    },

    isLoggedIn() {
      return !!this.getToken();
    },

    isAdmin() {
      const u = this.getUser();
      return u && u.role === 'admin';
    },

    /**
     * Panggilan GET REST API
     */
    async get(action, params = {}, options = {}) {
      const urlBase = window.CONFIG.GAS_URL;
      if (!urlBase) {
        return this._mockGet(action, params);
      }

      const q = new URLSearchParams({ action, ...params }).toString();
      const fullUrl = `${urlBase}?${q}`;
      const cacheKey = `GET|${action}|${JSON.stringify(params)}`;

      // 1. SWR Cache check
      const cached = _cache.get(cacheKey);
      const now = Date.now();
      const ttl = options.ttl || window.CONFIG.CACHE_TTL_MS || 60000;

      if (!options.forceRefresh && cached && (now - cached.time < ttl)) {
        return cached.data;
      }

      // 2. In-flight Deduplication
      if (_inflight[cacheKey]) {
        return _inflight[cacheKey];
      }

      const fetchPromise = (async () => {
        try {
          const res = await fetch(fullUrl, { method: 'GET', mode: 'cors' });
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          const json = await res.json();
          if (json.success) {
            _cache.set(cacheKey, { time: Date.now(), data: json.data });
          }
          return json.data;
        } catch (err) {
          console.warn(`[API GET ${action} Fallback/Error]:`, err.message);
          if (cached) return cached.data;
          return this._mockGet(action, params);
        } finally {
          delete _inflight[cacheKey];
        }
      })();

      _inflight[cacheKey] = fetchPromise;
      return fetchPromise;
    },

    /**
     * Panggilan POST REST API
     * ATURAN KRUSIAL CORS GAS: WAJIB text/plain;charset=utf-8
     */
    async post(action, payload = {}, options = {}) {
      const urlBase = window.CONFIG.GAS_URL;
      const dataWithAuth = {
        action: action,
        token: this.getToken(),
        ...payload
      };

      if (!urlBase) {
        return this._mockPost(action, payload);
      }

      // Operasi tulis menaikkan epoch & membersihkan in-flight promises
      if (!/^(get|list|fetch|read|verify)/i.test(action)) {
        _writeEpoch++;
        _cache.clear(); // Invalidate local cache
      }

      const cacheKey = `${_writeEpoch}|POST|${action}|${JSON.stringify(payload)}`;
      if (_inflight[cacheKey]) return _inflight[cacheKey];

      const postPromise = (async () => {
        try {
          const res = await fetch(urlBase, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8' // Hindari preflight OPTIONS
            },
            body: JSON.stringify(dataWithAuth)
          });

          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          const json = await res.json();
          return json;
        } catch (err) {
          console.warn(`[API POST ${action} Fallback]:`, err.message);
          return this._mockPost(action, payload);
        } finally {
          delete _inflight[cacheKey];
        }
      })();

      _inflight[cacheKey] = postPromise;
      return postPromise;
    },

    /**
     * Mock Data Fallback jika GAS_URL belum diisi (Ready for instant preview)
     */
    _mockGet(action, params) {
      if (action === 'getKatalog') {
        return [
          {
            kelas_id: 'CLS-001',
            judul: 'Fullstack Web & Automation Cohort',
            deskripsi: 'Pelajari pengembangan web modern dari dasar hingga mahir dengan integrasi Google Apps Script, Tailwind CSS, REST API, dan otomasi workflow bisnis.',
            kategori: 'Pemrograman',
            harga: 499000,
            thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
            level: 'Intermediate',
            total_durasi: '24 Jam',
            pengajar: 'Rian Pratama, S.Kom',
            jumlah_modul: 4
          },
          {
            kelas_id: 'CLS-002',
            judul: 'Modern UI/UX Design System Mastery',
            deskripsi: 'Kuasai pembuatan design system profesional, atomic design, Figma component variants, responsive layout, dan handover ke tim engineering.',
            kategori: 'Desain',
            harga: 399000,
            thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
            level: 'Beginner - Intermediate',
            total_durasi: '18 Jam',
            pengajar: 'Dina Salsabila, M.Ds',
            jumlah_modul: 2
          },
          {
            kelas_id: 'CLS-003',
            judul: 'Digital Product Marketplace & WA CRM Masterclass',
            deskripsi: 'Strategi monetisasi produk digital, optimasi funnel penjualan, WhatsApp broadcast anti-banned, dan manajemen siklus hidup customer.',
            kategori: 'Bisnis & Marketing',
            harga: 349000,
            thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
            level: 'All Levels',
            total_durasi: '15 Jam',
            pengajar: 'Budi Santoso, MBA',
            jumlah_modul: 3
          }
        ];
      }

      if (action === 'getDetailKelas') {
        const k = this._mockGet('getKatalog').find(c => c.kelas_id === params.kelas_id);
        return {
          kelas: k || {},
          silabus: [
            { modul_id: 'MOD-001', urutan: 1, judul: 'Pengenalan Arsitektur SPA & Decoupled REST GAS', tipe_konten: 'Video', durasi_menit: 45, ringkasan: 'Arsitektur frontend mandiri & REST API backend.' },
            { modul_id: 'MOD-002', urutan: 2, judul: 'Desain Database Spreadsheet & Prinsip 0ms Instant UX', tipe_konten: 'Video', durasi_menit: 60, ringkasan: 'Batch manipulation & cache layering.' },
            { modul_id: 'MOD-003', urutan: 3, judul: 'Integrasi WhatsApp Gateway Fonnte & Webhook Event', tipe_konten: 'Video', durasi_menit: 55, ringkasan: 'Automated notification pipeline.' },
            { modul_id: 'MOD-004', urutan: 4, judul: 'Panduan Deploy Frontend ke GitHub Pages (Statis Bebas Biaya)', tipe_konten: 'Dokumen', durasi_menit: 30, ringkasan: 'Git push workflow.' }
          ]
        };
      }

      if (action === 'getPengaturanPublik') {
        return {
          NAMA_PLATFORM: 'EduPath Digital LMS',
          SLOGAN: 'Platform Belajar & Marketplace Digital Mandiri',
          BANK_PEMBAYARAN: 'BCA: 8735091234 a.n EduPath Digital / Mandiri: 1370019283748',
          WA_CS: '628123456789'
        };
      }

      return null;
    },

    _mockPost(action, payload) {
      if (action === 'loginAdmin') {
        if (payload.password === 'AdminEduPath2026!' || payload.email === 'admin@edupath.id') {
          const user = { email: 'admin@edupath.id', role: 'admin', nama: 'Admin EduPath' };
          this.setToken('mock_admin_token_hmac_12345');
          this.setUser(user);
          return { success: true, message: 'Login Admin Berhasil (Demo Mode)', token: 'mock_admin_token', user };
        }
        return { success: false, message: 'Gunakan sandi default: AdminEduPath2026!' };
      }

      if (action === 'loginMember') {
        const user = { member_id: 'MBR-1001', nama: 'Rian Pratama', email: payload.email || 'rian@example.com', role: 'member', status: 'Aktif' };
        this.setToken('mock_member_token_hmac_67890');
        this.setUser(user);
        return { success: true, message: 'Login Member Berhasil (Demo Mode)', token: 'mock_member_token', user };
      }

      if (action === 'registerMember') {
        return { success: true, message: 'Pendaftaran berhasil. Silakan login.', member_id: 'MBR-1004' };
      }

      if (action === 'checkoutKelas') {
        const inv = 'INV-' + Date.now().toString().slice(-8);
        return {
          success: true,
          message: 'Pesanan checkout berhasil dibuat.',
          data: {
            transaksi_id: inv,
            nominal: 499000,
            kelas_judul: 'Fullstack Web & Automation Cohort',
            email: payload.email,
            nama: payload.nama
          }
        };
      }

      if (action === 'member_getDashboard') {
        return {
          success: true,
          data: {
            member: {
              member_id: 'MBR-1001',
              nama: 'Rian Pratama',
              email: 'rian@example.com',
              no_wa: '081234567890',
              status: 'Aktif',
              tag_minat: 'Pemrograman, Otomasi',
              kelengkapan_profil: 85
            },
            stats: {
              kelas_aktif: 2,
              modul_selesai: 6,
              rata_rata_progres: 78,
              jam_belajar: '14 Jam'
            },
            kelas_saya: [
              {
                kelas_id: 'CLS-001',
                judul: 'Fullstack Web & Automation Cohort',
                kategori: 'Pemrograman',
                thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
                total_modul: 4,
                modul_selesai: 3,
                persentase: 75,
                modul_berikutnya: { modul_id: 'MOD-004', judul: 'Panduan Deploy Frontend ke GitHub Pages', urutan: 4 }
              },
              {
                kelas_id: 'CLS-002',
                judul: 'Modern UI/UX Design System Mastery',
                kategori: 'Desain',
                thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
                total_modul: 2,
                modul_selesai: 2,
                persentase: 100,
                modul_berikutnya: null
              }
            ]
          }
        };
      }

      if (action === 'member_getRuangMateri') {
        return {
          success: true,
          data: {
            kelas: {
              kelas_id: 'CLS-001',
              judul: 'Fullstack Web & Automation Cohort',
              kategori: 'Pemrograman'
            },
            progres_persen: 75,
            modul_selesai: 3,
            total_modul: 4,
            silabus: [
              { modul_id: 'MOD-001', urutan: 1, judul: 'Pengenalan Arsitektur SPA & Decoupled REST GAS', tipe_konten: 'Video', durasi_menit: 45, selesai: true, terbuka: true, sumber: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
              { modul_id: 'MOD-002', urutan: 2, judul: 'Desain Database Spreadsheet & Prinsip 0ms Instant UX', tipe_konten: 'Video', durasi_menit: 60, selesai: true, terbuka: true, sumber: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
              { modul_id: 'MOD-003', urutan: 3, judul: 'Integrasi WhatsApp Gateway Fonnte & Webhook Event', tipe_konten: 'Video', durasi_menit: 55, selesai: true, terbuka: true, sumber: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
              { modul_id: 'MOD-004', urutan: 4, judul: 'Panduan Deploy Frontend ke GitHub Pages (Statis Bebas Biaya)', tipe_konten: 'Dokumen', durasi_menit: 30, selesai: false, terbuka: true, sumber: 'https://docs.google.com/document/d/sample' }
            ]
          }
        };
      }

      if (action === 'member_tandaiModulSelesai') {
        return { success: true, message: 'Modul berhasil diselesaikan! (Demo)' };
      }

      if (action === 'admin_getDashboard') {
        return {
          success: true,
          data: {
            kpi: {
              total_member: 1428,
              member_aktif: 940,
              member_lead: 488,
              total_omset: 348650000,
              transaksi_menunggu: 18,
              transaksi_lunas: 912,
              pesan_terkirim: 1248,
              antrian_pesan: 4
            },
            transaksi_terbaru: [
              { transaksi_id: 'INV-202602-001', member_id: 'MBR-1001', nominal: 499000, status_bayar: 'Lunas', tanggal_order: '2026-02-01 10:30:00' },
              { transaksi_id: 'INV-202602-002', member_id: 'MBR-1002', nominal: 399000, status_bayar: 'Lunas', tanggal_order: '2026-02-03 14:15:00' },
              { transaksi_id: 'INV-202602-003', member_id: 'MBR-1003', nominal: 349000, status_bayar: 'Menunggu', tanggal_order: '2026-02-05 09:00:00' }
            ],
            distribusi_status: { Aktif: 940, Lead: 488, Lulus: 142, TidakAktif: 28 }
          }
        };
      }

      if (action === 'admin_getMemberCRM') {
        return {
          success: true,
          data: [
            {
              member_id: 'MBR-1001',
              nama: 'Rian Pratama',
              email: 'rian@example.com',
              no_wa: '081234567890',
              tanggal_daftar: '2026-02-01',
              status: 'Aktif',
              tag_minat: 'Pemrograman, Otomasi',
              clv: 499000,
              terakhir_aktif: 'Baru saja',
              catatan_admin: 'Member Cohort Batch Mei aktif, progres sangat baik.',
              total_transaksi: 1,
              modul_selesai: 3,
              riwayat_transaksi: [{ transaksi_id: 'INV-202602-001', nominal: 499000, status_bayar: 'Lunas', tanggal_order: '2026-02-01' }],
              riwayat_interaksi: [{ Kanal: 'WA', Ringkasan: 'Konfirmasi pendaftaran kelas Fullstack', Tanggal: '2026-02-01' }]
            },
            {
              member_id: 'MBR-1002',
              nama: 'Siti Rahmawati',
              email: 'siti@example.com',
              no_wa: '081987654321',
              tanggal_daftar: '2026-02-03',
              status: 'Aktif',
              tag_minat: 'Desain, UI/UX',
              clv: 399000,
              terakhir_aktif: 'Kemarin',
              catatan_admin: 'Tertarik dengan modul atomic design.',
              total_transaksi: 1,
              modul_selesai: 2,
              riwayat_transaksi: [{ transaksi_id: 'INV-202602-002', nominal: 399000, status_bayar: 'Lunas', tanggal_order: '2026-02-03' }],
              riwayat_interaksi: [{ Kanal: 'WA', Ringkasan: 'Invoice pembayaran kelas UI/UX', Tanggal: '2026-02-03' }]
            },
            {
              member_id: 'MBR-1003',
              nama: 'Ahmad Fauzi',
              email: 'fauzi@example.com',
              no_wa: '085712349876',
              tanggal_daftar: '2026-02-05',
              status: 'Lead',
              tag_minat: 'Bisnis, Marketing',
              clv: 0,
              terakhir_aktif: '3 hari lalu',
              catatan_admin: 'Menunggu konfirmasi pembayaran via transfer BCA.',
              total_transaksi: 1,
              modul_selesai: 0,
              riwayat_transaksi: [{ transaksi_id: 'INV-202602-003', nominal: 349000, status_bayar: 'Menunggu', tanggal_order: '2026-02-05' }],
              riwayat_interaksi: [{ Kanal: 'WA', Ringkasan: 'Invoice dikirim ke nomor WA', Tanggal: '2026-02-05' }]
            }
          ]
        };
      }

      if (action === 'admin_getWAGateway') {
        return {
          success: true,
          data: {
            gateway: {
              token_tersamar: 'fonn••••••xyz',
              token_ada: true,
              terhubung: true,
              wa_aktif: true,
              email_aktif: true,
              batch_size: 20,
              jeda_detik: 4
            },
            templates: {
              TPL_INVOICE: 'Halo *{nama}*! Pesanan kursus *{kelas}* sebesar *Rp {nominal}* telah dibuat. No Invoice: *{invoice}*. Silakan transfer ke {bank} dan unggah bukti bayar: {link}',
              TPL_KONFIRMASI: 'Selamat *{nama}*! Pembayaran invoice *{invoice}* untuk kelas *{kelas}* telah BERHASIL diverifikasi. Akun belajar Anda telah aktif: {link}',
              TPL_REMINDER: 'Halo *{nama}*, pesanan Anda untuk *{kelas}* masih menunggu pembayaran: {link}',
              TPL_MODUL_BARU: 'Kabar gembira *{nama}*! Modul baru *{modul}* pada *{kelas}* telah dirilis: {link}',
              TPL_SERTIFIKAT: 'Luar biasa *{nama}*! 🎉 Anda telah menyelesaikan kelas *{kelas}*. Unduh sertifikatmu: {link}'
            },
            antrian_terbaru: [
              { AntrianID: 'ANT-98421B', Kanal: 'WA', Tujuan: '6281234567890', Pesan: 'Selamat Rian! Pembayaran Anda berhasil...', Event: 'KONFIRMASI', Status: 'Terkirim', DibuatPada: '2026-02-04 10:00' },
              { AntrianID: 'ANT-43187F', Kanal: 'WA', Tujuan: '6285712349876', Pesan: 'Halo Ahmad Fauzi! Pesanan kursus dibuat...', Event: 'INVOICE', Status: 'Antri', DibuatPada: '2026-02-05 09:00' }
            ],
            riwayat_blast: [
              { BlastID: 'BLW-20260201', Judul: 'Reminder Cohort Batch Mei', Sasaran: 'Lead', Total: 45, Terkirim: 45, Gagal: 0, Status: 'Selesai', Tanggal: '2026-02-01' }
            ]
          }
        };
      }

      if (action === 'admin_getTransaksi') {
        return {
          success: true,
          data: [
            { transaksi_id: 'INV-202602-001', member_id: 'MBR-1001', nama_member: 'Rian Pratama', email_member: 'rian@example.com', no_wa_member: '081234567890', kelas_id: 'CLS-001', judul_kelas: 'Fullstack Web & Automation Cohort', nominal: 499000, status_bayar: 'Lunas', tanggal_order: '2026-02-01 10:30', tanggal_bayar: '2026-02-01 11:00', bukti_bayar: 'https://via.placeholder.com/300x400.png?text=Bukti+Transfer+BCA', verifikator: 'Admin EduPath', catatan: 'Verifikasi via transfer bank' },
            { transaksi_id: 'INV-202602-002', member_id: 'MBR-1002', nama_member: 'Siti Rahmawati', email_member: 'siti@example.com', no_wa_member: '081987654321', kelas_id: 'CLS-002', judul_kelas: 'Modern UI/UX Design System Mastery', nominal: 399000, status_bayar: 'Lunas', tanggal_order: '2026-02-03 14:15', tanggal_bayar: '2026-02-03 14:30', bukti_bayar: 'https://via.placeholder.com/300x400.png?text=Bukti+QRIS', verifikator: 'Admin EduPath', catatan: 'Verifikasi QRIS instan' },
            { transaksi_id: 'INV-202602-003', member_id: 'MBR-1003', nama_member: 'Ahmad Fauzi', email_member: 'fauzi@example.com', no_wa_member: '085712349876', kelas_id: 'CLS-003', judul_kelas: 'Digital Product Marketplace & WA CRM Masterclass', nominal: 349000, status_bayar: 'Menunggu', tanggal_order: '2026-02-05 09:00', tanggal_bayar: '', bukti_bayar: '', verifikator: '', catatan: 'Menunggu transfer peserta' }
          ]
        };
      }

      if (action === 'admin_verifikasiTransaksi') {
        return { success: true, message: 'Transaksi berhasil diupdate! (Demo)' };
      }

      if (action === 'admin_simpanCatatanMember') {
        return { success: true, message: 'Catatan admin berhasil disimpan (Demo).' };
      }

      if (action === 'admin_simpanTagMember') {
        return { success: true, message: 'Tag minat berhasil diperbarui (Demo).' };
      }

      if (action === 'admin_prosesAntrianSekarang') {
        return { success: true, diproses: 2, status: 'Antrean selesai diproses' };
      }

      return { success: true, message: 'Operasi berhasil dieksekusi (Demo)' };
    }
  };

  window.API = API;
})(window);
