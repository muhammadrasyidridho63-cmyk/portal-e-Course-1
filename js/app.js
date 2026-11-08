/**
 * app.js - Aplikasi Frontend Utama EduPath Digital LMS
 * Arsitektur: 0ms Instant UX, SPA Router, State Management, SWR Integration
 * Desain: Stitch Reference & DESIGN.md (Royal Blue #1E4FD8, Deep Navy #0B2E8A)
 */

(function () {
  'use strict';

  // State Global Aplikasi
  const AppState = {
    currentRoute: 'katalog', // katalog, dashboard, ruang-materi, admin-dashboard, admin-crm, admin-transaksi, admin-wa, admin-broadcast, admin-kelas
    user: null,
    activeCourseId: 'CLS-001',
    activeModuleId: null,
    katalogData: [],
    crmMembers: [],
    selectedCrmMember: null,
    transactions: [],
    waGatewayData: null
  };

  /**
   * Inisialisasi Aplikasi Saat Halaman Dimuat
   */
  async function initApp() {
    AppState.user = API.getUser();
    setupEventListeners();
    updateNavigationUI();

    // Route default berdasarkan login
    if (AppState.user) {
      if (AppState.user.role === 'admin') {
        navigateTo('admin-dashboard');
      } else {
        navigateTo('dashboard');
      }
    } else {
      navigateTo('katalog');
    }

    // Load Pengaturan Publik di Header
    try {
      const pubConfig = await API.get('getPengaturanPublik');
      if (pubConfig && pubConfig.NAMA_PLATFORM) {
        document.querySelectorAll('.app-brand-name').forEach(el => el.textContent = pubConfig.NAMA_PLATFORM);
      }
    } catch (e) {}
  }

  /**
   * Router SPA (0ms Instant UX)
   */
  function navigateTo(route, params = {}) {
    AppState.currentRoute = route;

    // Sembunyikan semua views
    document.querySelectorAll('.app-view').forEach(v => {
      v.classList.add('hidden');
      v.classList.remove('fade-in');
    });

    // Update active state di sidebar
    document.querySelectorAll('aside nav a').forEach(a => {
      const path = a.getAttribute('data-path');
      if (path === route) {
        a.className = 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-primary-container text-white font-bold shadow-sm transition-all';
      } else {
        a.className = 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-label-md text-label-md text-text-secondary hover:bg-surface-container-low hover:text-text-primary transition-all';
      }
    });

    const targetView = document.getElementById(`view-${route}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      targetView.classList.add('fade-in');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Render data spesifik per rute
    switch (route) {
      case 'katalog':
        renderKatalog();
        break;
      case 'dashboard':
        renderMemberDashboard();
        break;
      case 'ruang-materi':
        if (params.kelas_id) AppState.activeCourseId = params.kelas_id;
        renderRuangMateri(AppState.activeCourseId);
        break;
      case 'admin-dashboard':
        renderAdminDashboard();
        break;
      case 'admin-crm':
        renderAdminCRM();
        break;
      case 'admin-transaksi':
        renderAdminTransaksi();
        break;
      case 'admin-wa':
        renderAdminWAGateway();
        break;
      case 'admin-broadcast':
        renderAdminBroadcast();
        break;
      case 'admin-kelas':
        renderAdminKelas();
        break;
    }
  }

  /**
   * Update Sidebar & Top Header Sesuai Status Login
   */
  function updateNavigationUI() {
    const isLogged = API.isLoggedIn();
    const isAdmin = API.isAdmin();
    const user = API.getUser() || { nama: 'Tamu', role: 'guest' };

    const navMember = document.getElementById('nav-member');
    const navAdmin = document.getElementById('nav-admin');
    const navGuest = document.getElementById('nav-guest');
    const userProfileBar = document.getElementById('user-profile-bar');
    const userNamaEl = document.getElementById('header-user-nama');
    const userRoleEl = document.getElementById('header-user-role');

    if (navMember) navMember.classList.toggle('hidden', !isLogged || isAdmin);
    if (navAdmin) navAdmin.classList.toggle('hidden', !isAdmin);
    if (navGuest) navGuest.classList.toggle('hidden', isLogged);

    if (userProfileBar) {
      userProfileBar.classList.toggle('hidden', !isLogged);
    }
    if (userNamaEl) userNamaEl.textContent = user.nama || 'Pengguna';
    if (userRoleEl) userRoleEl.textContent = isAdmin ? 'Superadmin' : 'Member Aktif';
  }

  /**
   * ============================================
   * 1. KATALOG & CHECKOUT (PUBLIK)
   * ============================================
   */
  async function renderKatalog() {
    const container = document.getElementById('katalog-cards-container');
    if (!container) return;

    container.innerHTML = `
      <div class="col-span-full py-12 flex justify-center items-center">
        <div class="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;

    try {
      const data = await API.get('getKatalog');
      AppState.katalogData = data || [];

      if (AppState.katalogData.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-text-secondary">Belum ada kelas yang diterbitkan.</div>`;
        return;
      }

      container.innerHTML = AppState.katalogData.map(k => `
        <div class="card-elevation rounded-2xl overflow-hidden flex flex-col justify-between group">
          <div>
            <div class="relative h-48 w-full overflow-hidden bg-slate-200">
              <img src="${k.thumbnail}" alt="${k.judul}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
              <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md font-label-sm text-label-sm text-primary font-bold shadow-sm">
                ${k.kategori}
              </span>
              <span class="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-inverse-surface/80 text-white font-label-sm text-[11px]">
                ${k.level}
              </span>
            </div>
            <div class="p-5 flex flex-col gap-2">
              <h3 class="font-headline-sm text-headline-sm text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                ${k.judul}
              </h3>
              <p class="font-body-sm text-body-sm text-text-secondary line-clamp-3">
                ${k.deskripsi}
              </p>
              <div class="flex items-center gap-4 text-text-muted font-label-sm text-[12px] pt-2 border-t border-surface-border">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">menu_book</span> ${k.jumlah_modul} Modul</span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">schedule</span> ${k.total_durasi}</span>
              </div>
            </div>
          </div>
          <div class="p-5 pt-0 flex items-center justify-between border-t border-surface-border/50">
            <div class="flex flex-col">
              <span class="text-[11px] text-text-muted font-label-sm uppercase">Investasi</span>
              <span class="font-headline-md text-headline-md font-bold text-primary">Rp ${(k.harga || 0).toLocaleString('id-ID')}</span>
            </div>
            <button onclick="window.EduPathApp.bukaModalCheckout('${k.kelas_id}')" class="px-4 py-2 rounded-xl bg-primary-container text-white font-label-md text-label-md font-bold shadow-sm hover:bg-primary transition-all flex items-center gap-1.5">
              <span>Daftar</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="col-span-full p-4 bg-error-container text-error rounded-xl">Gagal memuat katalog: ${err.message}</div>`;
    }
  }

  function bukaModalCheckout(kelasId) {
    const k = AppState.katalogData.find(c => c.kelas_id === kelasId);
    if (!k) return;

    const modal = document.getElementById('modal-checkout');
    document.getElementById('checkout-kelas-id').value = k.kelas_id;
    document.getElementById('checkout-kelas-judul').textContent = k.judul;
    document.getElementById('checkout-kelas-harga').textContent = 'Rp ' + (k.harga || 0).toLocaleString('id-ID');

    // Auto-fill jika member sudah login
    if (AppState.user) {
      document.getElementById('checkout-nama').value = AppState.user.nama || '';
      document.getElementById('checkout-email').value = AppState.user.email || '';
      document.getElementById('checkout-wa').value = AppState.user.no_wa || '';
    }

    modal.classList.remove('hidden');
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-checkout');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Memproses...`;

    const kelasId = document.getElementById('checkout-kelas-id').value;
    const nama = document.getElementById('checkout-nama').value;
    const email = document.getElementById('checkout-email').value;
    const noWa = document.getElementById('checkout-wa').value;

    try {
      const res = await API.post('checkoutKelas', {
        kelas_id: kelasId,
        nama: nama,
        email: email,
        no_wa: noWa,
        app_url: window.location.href
      });

      if (res.success) {
        showToast('Pesanan berhasil dibuat! Tagihan telah dikirim via WhatsApp.', 'success');
        document.getElementById('modal-checkout').classList.add('hidden');

        // Buka modal instruksi pembayaran
        tampilkanInstruksiBayar(res.data);
      } else {
        showToast(res.message || 'Gagal memproses pesanan', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Lanjutkan Pembayaran</span> <span class="material-symbols-outlined text-[18px]">check_circle</span>`;
    }
  }

  function tampilkanInstruksiBayar(data) {
    const modal = document.getElementById('modal-instruksi-bayar');
    document.getElementById('instruksi-invoice').textContent = data.transaksi_id;
    document.getElementById('instruksi-nominal').textContent = 'Rp ' + Number(data.nominal).toLocaleString('id-ID');
    document.getElementById('instruksi-kelas').textContent = data.kelas_judul;
    document.getElementById('upload-trx-id').value = data.transaksi_id;
    modal.classList.remove('hidden');
  }

  async function submitUnggahBukti(e) {
    e.preventDefault();
    const fileInput = document.getElementById('upload-bukti-file');
    const trxId = document.getElementById('upload-trx-id').value;

    if (!fileInput.files || fileInput.files.length === 0) {
      showToast('Pilih foto bukti transfer terlebih dahulu', 'error');
      return;
    }

    const file = fileInput.files[0];
    const btn = document.getElementById('btn-submit-bukti');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Mengunggah...`;

    const reader = new FileReader();
    reader.onload = async function () {
      const base64Data = reader.result.split(',')[1];
      try {
        const res = await API.post('unggahBuktiBayar', {
          transaksi_id: trxId,
          file_base64: base64Data,
          file_name: file.name,
          mime_type: file.type
        });

        if (res.success) {
          showToast('Bukti transfer berhasil diunggah! Admin akan segera memverifikasi.', 'success');
          document.getElementById('modal-instruksi-bayar').classList.add('hidden');
        } else {
          showToast(res.message || 'Gagal mengunggah bukti', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Kirim Bukti Pembayaran</span>`;
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * ============================================
   * 2. MEMBER DASHBOARD (STITCH SCREEN 1)
   * ============================================
   */
  async function renderMemberDashboard() {
    if (!API.isLoggedIn()) {
      navigateTo('login');
      return;
    }

    try {
      const res = await API.post('member_getDashboard');
      if (!res.success) {
        showToast(res.message, 'error');
        return;
      }

      const d = res.data;
      const member = d.member;
      const stats = d.stats;

      // Update Salam & Profile
      document.getElementById('dash-welcome-nama').textContent = `Selamat Datang Kembali, ${member.nama}! 👋`;
      document.getElementById('dash-member-nama').textContent = member.nama;
      document.getElementById('dash-member-tag').textContent = member.tag_minat || 'Member Aktif';
      document.getElementById('dash-profile-bar').style.width = `${member.kelengkapan_profil || 85}%`;
      document.getElementById('dash-profile-pct').textContent = `${member.kelengkapan_profil || 85}%`;

      // Update KPI Cards
      document.getElementById('dash-stat-kelas').textContent = stats.kelas_aktif || 0;
      document.getElementById('dash-stat-modul').textContent = stats.modul_selesai || 0;
      document.getElementById('dash-stat-progres').textContent = `${stats.rata_rata_progres || 0}%`;
      document.getElementById('dash-stat-jam').textContent = stats.jam_belajar || '0 Jam';

      // Update List Kelas Saya di Dashboard
      const kelasContainer = document.getElementById('dash-kelas-list');
      if (kelasContainer) {
        if (!d.kelas_saya || d.kelas_saya.length === 0) {
          kelasContainer.innerHTML = `
            <div class="col-span-full p-6 text-center bg-white rounded-2xl border border-surface-border">
              <p class="text-text-secondary text-sm">Anda belum memiliki kelas aktif.</p>
              <button onclick="window.EduPathApp.navigateTo('katalog')" class="mt-3 px-4 py-2 rounded-xl bg-primary-container text-white font-bold text-xs">Jelajahi Katalog</button>
            </div>
          `;
        } else {
          kelasContainer.innerHTML = d.kelas_saya.map(c => `
            <div class="card-elevation rounded-2xl p-5 flex flex-col justify-between">
              <div class="flex items-start gap-4 mb-4">
                <img src="${c.thumbnail}" class="w-16 h-16 rounded-xl object-cover bg-slate-100" alt="${c.judul}">
                <div class="flex-1 min-w-0">
                  <span class="px-2 py-0.5 rounded bg-tint-blue-subtle text-primary font-label-sm text-[11px] font-bold">${c.kategori}</span>
                  <h4 class="font-headline-sm text-[14px] font-bold text-text-primary mt-1 line-clamp-1">${c.judul}</h4>
                  <div class="mt-2 w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div class="bg-primary-container h-full rounded-full transition-all" style="width: ${c.persentase}%"></div>
                  </div>
                  <div class="flex justify-between items-center text-[11px] text-text-secondary mt-1">
                    <span>${c.modul_selesai} dari ${c.total_modul} Modul Selesai</span>
                    <span class="font-bold text-primary">${c.persentase}%</span>
                  </div>
                </div>
              </div>
              <button onclick="window.EduPathApp.bukaRuangMateri('${c.kelas_id}')" class="w-full py-2.5 rounded-xl bg-tint-blue-subtle text-primary font-bold text-xs hover:bg-primary-container hover:text-white transition-all flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">play_circle</span>
                <span>${c.persentase === 100 ? 'Review Materi' : 'Lanjutkan Belajar'}</span>
              </button>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Dashboard Error:', err);
    }
  }

  /**
   * ============================================
   * 3. RUANG MATERI & VIDEO CLASSROOM (STITCH SCREEN 3)
   * ============================================
   */
  async function renderRuangMateri(kelasId) {
    if (!API.isLoggedIn()) {
      navigateTo('login');
      return;
    }

    const container = document.getElementById('ruang-materi-content');
    if (!container) return;

    try {
      const res = await API.post('member_getRuangMateri', { kelas_id: kelasId });
      if (!res.success) {
        showToast(res.message, 'error');
        navigateTo('dashboard');
        return;
      }

      const d = res.data;
      document.getElementById('materi-kelas-judul').textContent = d.kelas.judul;
      document.getElementById('materi-progres-pct').textContent = `${d.progres_persen}%`;
      document.getElementById('materi-progres-bar').style.width = `${d.progres_persen}%`;
      document.getElementById('materi-progres-text').textContent = `${d.modul_selesai} dari ${d.total_modul} Modul Selesai`;

      // Temukan modul aktif pertama yang terbuka & belum selesai
      let activeMod = d.silabus.find(m => m.terbuka && !m.selesai) || d.silabus[0];
      AppState.activeModuleId = activeMod ? activeMod.modul_id : null;

      // Render Player Video
      renderVideoPlayer(activeMod, d.silabus);

      // Render Silabus Checklist
      renderSilabusChecklist(d.silabus, kelasId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderVideoPlayer(modul, silabus) {
    const playerWrapper = document.getElementById('materi-player-container');
    const titleEl = document.getElementById('materi-active-judul');
    const descEl = document.getElementById('materi-active-ringkasan');
    const completeBtn = document.getElementById('btn-tandai-selesai');

    if (!modul) return;
    titleEl.textContent = `Modul ${modul.urutan}: ${modul.judul}`;
    descEl.textContent = modul.ringkasan || 'Pelajari materi video dan selesaikan latihan terkait di bawah ini.';

    if (modul.tipe_konten === 'Video' && modul.sumber) {
      let embedUrl = modul.sumber;
      if (embedUrl.includes('youtube.com/watch?v=')) {
        embedUrl = embedUrl.replace('watch?v=', 'embed/');
      }
      playerWrapper.innerHTML = `
        <div class="video-wrapper">
          <iframe src="${embedUrl}" title="${modul.judul}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    } else {
      playerWrapper.innerHTML = `
        <div class="bg-surface-container-low rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
          <span class="material-symbols-outlined text-5xl text-primary">description</span>
          <h4 class="font-bold text-lg text-text-primary">${modul.judul}</h4>
          <p class="text-sm text-text-secondary max-w-md">Dokumen panduan materi kursus.</p>
          <a href="${modul.sumber || '#'}" target="_blank" class="mt-2 px-5 py-2.5 rounded-xl bg-primary-container text-white font-bold text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>Buka Dokumen Materi</span>
          </a>
        </div>
      `;
    }

    // Tombol Tandai Selesai
    completeBtn.onclick = () => tandaiModulSelesai(modul.modul_id, AppState.activeCourseId);
    if (modul.selesai) {
      completeBtn.className = 'px-5 py-2.5 rounded-xl bg-accent-green text-white font-bold text-xs flex items-center gap-1.5 shadow-sm';
      completeBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span> <span>Modul Selesai</span>`;
    } else {
      completeBtn.className = 'px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-container transition-all';
      completeBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">task_alt</span> <span>Tandai Selesai & Lanjut</span>`;
    }
  }

  function renderSilabusChecklist(silabus, kelasId) {
    const listEl = document.getElementById('materi-silabus-list');
    if (!listEl) return;

    listEl.innerHTML = silabus.map(m => {
      const isActive = m.modul_id === AppState.activeModuleId;
      const isLocked = !m.terbuka;
      let iconColor = isLocked ? 'text-text-muted' : (m.selesai ? 'text-accent-green' : 'text-primary');
      let iconName = isLocked ? 'lock' : (m.selesai ? 'check_circle' : 'play_circle');

      return `
        <div onclick="${isLocked ? '' : `window.EduPathApp.pilihModul('${m.modul_id}')`}" class="p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isActive ? 'bg-tint-blue-subtle border-primary-container shadow-sm' : 'bg-surface border-surface-border hover:bg-surface-container-low'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}">
          <div class="flex items-center gap-3 min-w-0">
            <span class="material-symbols-outlined text-[22px] ${iconColor} flex-shrink-0">${iconName}</span>
            <div class="flex flex-col min-w-0">
              <span class="font-label-sm text-[11px] text-text-muted">Modul ${m.urutan} • ${m.durasi_menit} mnt</span>
              <span class="font-headline-sm text-[13px] font-bold text-text-primary truncate">${m.judul}</span>
            </div>
          </div>
          ${m.selesai ? `<span class="px-2 py-0.5 rounded-full bg-badge-live-bg text-badge-live-text font-bold text-[10px] flex-shrink-0">Selesai</span>` : ''}
        </div>
      `;
    }).join('');
  }

  async function tandaiModulSelesai(modulId, kelasId) {
    // 0ms Optimistic UI update
    showToast('Menyimpan progres modul...', 'info');
    try {
      const res = await API.post('member_tandaiModulSelesai', {
        modul_id: modulId,
        kelas_id: kelasId
      });
      if (res.success) {
        showToast('Modul berhasil diselesaikan! Modul berikutnya telah terbuka.', 'success');
        renderRuangMateri(kelasId);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function pilihModul(modulId) {
    AppState.activeModuleId = modulId;
    renderRuangMateri(AppState.activeCourseId);
  }

  /**
   * ============================================
   * 4. ADMIN DASHBOARD & CRM 360° (STITCH SCREEN 2)
   * ============================================
   */
  async function renderAdminDashboard() {
    if (!API.isAdmin()) return;

    try {
      const res = await API.post('admin_getDashboard');
      if (!res.success) return;

      const d = res.data;
      const kpi = d.kpi;

      document.getElementById('adm-kpi-member').textContent = Number(kpi.total_member || 0).toLocaleString('id-ID');
      document.getElementById('adm-kpi-aktif').textContent = Number(kpi.member_aktif || 0).toLocaleString('id-ID');
      document.getElementById('adm-kpi-omset').textContent = 'Rp ' + Number(kpi.total_omset || 0).toLocaleString('id-ID');
      document.getElementById('adm-kpi-pesan').textContent = Number(kpi.pesan_terkirim || 0).toLocaleString('id-ID');

      // Transaksi Menunggu Badge
      const pendingBadge = document.getElementById('adm-pending-trx-count');
      if (pendingBadge) pendingBadge.textContent = kpi.transaksi_menunggu || 0;
    } catch (err) {
      console.error('Admin Dashboard Error:', err);
    }
  }

  async function renderAdminCRM() {
    if (!API.isAdmin()) return;
    const tableBody = document.getElementById('crm-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><div class="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></td></tr>`;

    try {
      const res = await API.post('admin_getMemberCRM');
      if (!res.success) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-error">${res.message}</td></tr>`;
        return;
      }

      AppState.crmMembers = res.data || [];
      renderCRMRows(AppState.crmMembers);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-error">${err.message}</td></tr>`;
    }
  }

  function renderCRMRows(list) {
    const tableBody = document.getElementById('crm-table-body');
    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-text-secondary">Tidak ada data member yang sesuai filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(m => {
      let statusBadge = 'bg-surface-container-high text-text-secondary';
      if (m.status === 'Aktif') statusBadge = 'bg-badge-live-bg text-badge-live-text';
      if (m.status === 'Lead') statusBadge = 'bg-tint-orange-subtle text-accent-orange';

      return `
        <tr class="border-b border-surface-border hover:bg-surface-container-low transition-colors">
          <td class="py-3.5 px-4 font-label-md text-label-md font-bold text-primary">
            ${m.member_id}
          </td>
          <td class="py-3.5 px-4">
            <div class="flex flex-col">
              <span class="font-bold text-text-primary text-[13px]">${m.nama}</span>
              <span class="text-text-muted text-[11px]">${m.email}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-text-secondary text-[12px]">
            ${m.no_wa}
          </td>
          <td class="py-3.5 px-4">
            <span class="px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${statusBadge}">
              ${m.status}
            </span>
          </td>
          <td class="py-3.5 px-4 text-[12px] font-semibold text-text-primary">
            ${m.tag_minat || '-'}
          </td>
          <td class="py-3.5 px-4 font-bold text-primary text-[13px]">
            Rp ${(m.clv || 0).toLocaleString('id-ID')}
          </td>
          <td class="py-3.5 px-4 text-right">
            <button onclick="window.EduPathApp.bukaDrawerCRM('${m.member_id}')" class="px-3 py-1.5 rounded-lg bg-tint-blue-subtle text-primary font-bold text-xs hover:bg-primary-container hover:text-white transition-all">
              Profil 360°
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterCRMBySegment(segmen) {
    if (segmen === 'Semua') {
      renderCRMRows(AppState.crmMembers);
    } else {
      const filtered = AppState.crmMembers.filter(m => m.status === segmen);
      renderCRMRows(filtered);
    }
  }

  function bukaDrawerCRM(memberId) {
    const member = AppState.crmMembers.find(m => m.member_id === memberId);
    if (!member) return;
    AppState.selectedCrmMember = member;

    const drawer = document.getElementById('drawer-crm-360');
    const backdrop = document.getElementById('drawer-backdrop');

    document.getElementById('crm-drawer-nama').textContent = member.nama;
    document.getElementById('crm-drawer-id').textContent = member.member_id;
    document.getElementById('crm-drawer-email').textContent = member.email;
    document.getElementById('crm-drawer-wa').textContent = member.no_wa;
    document.getElementById('crm-drawer-clv').textContent = 'Rp ' + (member.clv || 0).toLocaleString('id-ID');
    document.getElementById('crm-drawer-status').textContent = member.status;
    document.getElementById('crm-drawer-catatan').value = member.catatan_admin || '';
    document.getElementById('crm-drawer-tag').value = member.tag_minat || '';

    // Riwayat Interaksi
    const logContainer = document.getElementById('crm-drawer-interaksi');
    if (logContainer) {
      if (!member.riwayat_interaksi || member.riwayat_interaksi.length === 0) {
        logContainer.innerHTML = `<p class="text-xs text-text-muted">Belum ada riwayat interaksi.</p>`;
      } else {
        logContainer.innerHTML = member.riwayat_interaksi.map(i => `
          <div class="p-2.5 rounded-lg bg-surface-container-low border border-surface-border text-xs flex flex-col gap-1">
            <div class="flex justify-between text-text-muted text-[10px]">
              <span>${i.Kanal || 'Interaksi'}</span>
              <span>${(i.Tanggal || '').slice(0, 10)}</span>
            </div>
            <p class="text-text-primary font-medium">${i.Ringkasan}</p>
          </div>
        `).join('');
      }
    }

    drawer.classList.add('active');
    backdrop.classList.add('active');
  }

  function tutupDrawerCRM() {
    const drawer = document.getElementById('drawer-crm-360');
    const backdrop = document.getElementById('drawer-backdrop');
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
  }

  async function simpanCatatanDrawerCRM() {
    if (!AppState.selectedCrmMember) return;
    const catatan = document.getElementById('crm-drawer-catatan').value;
    const tag = document.getElementById('crm-drawer-tag').value;

    try {
      await API.post('admin_simpanCatatanMember', {
        member_id: AppState.selectedCrmMember.member_id,
        catatan: catatan
      });
      await API.post('admin_simpanTagMember', {
        member_id: AppState.selectedCrmMember.member_id,
        tag_minat: tag
      });

      showToast('Data CRM member berhasil diperbarui!', 'success');
      tutupDrawerCRM();
      renderAdminCRM();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /**
   * ============================================
   * 5. ADMIN TRANSAKSI & VERIFIKASI (FR-10)
   * ============================================
   */
  async function renderAdminTransaksi() {
    if (!API.isAdmin()) return;
    const tbody = document.getElementById('trx-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><div class="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></td></tr>`;

    try {
      const res = await API.post('admin_getTransaksi');
      if (!res.success) return;

      AppState.transactions = res.data || [];
      renderTransaksiRows(AppState.transactions);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-error">${err.message}</td></tr>`;
    }
  }

  function renderTransaksiRows(list) {
    const tbody = document.getElementById('trx-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-text-secondary">Tidak ada transaksi ditemukan.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(t => {
      let badge = 'bg-tint-orange-subtle text-accent-orange';
      if (t.status_bayar === 'Lunas') badge = 'bg-badge-live-bg text-badge-live-text';
      if (t.status_bayar === 'Batal') badge = 'bg-error-container text-error';

      return `
        <tr class="border-b border-surface-border hover:bg-surface-container-low transition-colors">
          <td class="py-3.5 px-4 font-bold text-primary text-[12px]">${t.transaksi_id}</td>
          <td class="py-3.5 px-4">
            <div class="flex flex-col">
              <span class="font-bold text-text-primary text-[13px]">${t.nama_member}</span>
              <span class="text-text-muted text-[11px]">${t.no_wa_member || t.email_member}</span>
            </div>
          </td>
          <td class="py-3.5 px-4 text-[12px] font-medium text-text-secondary">${t.judul_kelas}</td>
          <td class="py-3.5 px-4 font-bold text-text-primary text-[13px]">Rp ${(t.nominal || 0).toLocaleString('id-ID')}</td>
          <td class="py-3.5 px-4"><span class="px-2.5 py-0.5 rounded-full font-bold text-[11px] ${badge}">${t.status_bayar}</span></td>
          <td class="py-3.5 px-4">
            ${t.bukti_bayar ? `
              <a href="${t.bukti_bayar}" target="_blank" class="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                <span class="material-symbols-outlined text-[16px]">image</span> Lihat Bukti
              </a>
            ` : '<span class="text-text-muted text-xs">Belum ada</span>'}
          </td>
          <td class="py-3.5 px-4 text-right">
            ${t.status_bayar === 'Menunggu' ? `
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="window.EduPathApp.verifikasiTrx('${t.transaksi_id}', 'Lunas')" class="px-3 py-1.5 rounded-lg bg-accent-green text-white font-bold text-xs hover:opacity-90">Verifikasi</button>
                <button onclick="window.EduPathApp.verifikasiTrx('${t.transaksi_id}', 'Batal')" class="px-2 py-1.5 rounded-lg bg-surface-container-high text-error font-bold text-xs hover:bg-error-container">Tolak</button>
              </div>
            ` : `<span class="text-text-muted text-xs font-semibold">Tuntas</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  async function verifikasiTrx(trxId, status) {
    if (!confirm(`Konfirmasi ubah status transaksi ${trxId} menjadi ${status}?`)) return;

    try {
      const res = await API.post('admin_verifikasiTransaksi', {
        transaksi_id: trxId,
        status: status
      });

      if (res.success) {
        showToast(`Transaksi ${trxId} berhasil diubah menjadi ${status}. Notifikasi otomatis telah dikirim.`, 'success');
        renderAdminTransaksi();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /**
   * ============================================
   * 6. WHATSAPP GATEWAY & BROADCAST (STITCH SCREEN 4)
   * ============================================
   */
  async function renderAdminWAGateway() {
    if (!API.isAdmin()) return;

    try {
      const res = await API.post('admin_getWAGateway');
      if (!res.success) return;

      const d = res.data;
      AppState.waGatewayData = d;

      // Status Koneksi Fonnte
      const connBadge = document.getElementById('wa-conn-badge');
      if (connBadge) {
        if (d.gateway.terhubung) {
          connBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-badge-live-bg text-badge-live-text font-bold text-xs';
          connBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span> <span>Fonnte Terhubung</span>`;
        } else {
          connBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-error font-bold text-xs';
          connBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-error"></span> <span>Fonnte Terputus</span>`;
        }
      }

      document.getElementById('wa-token-preview').textContent = d.gateway.token_tersamar || 'Belum diatur';
      document.getElementById('wa-switch-wa').checked = d.gateway.wa_aktif;
      document.getElementById('wa-switch-email').checked = d.gateway.email_aktif;

      // Antrean Terbaru
      const queueList = document.getElementById('wa-queue-list');
      if (queueList) {
        if (!d.antrian_terbaru || d.antrian_terbaru.length === 0) {
          queueList.innerHTML = `<div class="p-6 text-center text-text-muted text-xs">Antrean notifikasi kosong.</div>`;
        } else {
          queueList.innerHTML = d.antrian_terbaru.map(q => `
            <div class="p-3 rounded-xl border border-surface-border bg-white flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="material-symbols-outlined text-[20px] ${q.Kanal === 'WA' ? 'text-accent-green' : 'text-primary'}">${q.Kanal === 'WA' ? 'chat' : 'mail'}</span>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-text-primary truncate">${q.NamaPenerima || q.Tujuan}</span>
                  <span class="text-text-muted text-[11px] truncate">${q.Pesan}</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${q.Status === 'Terkirim' ? 'bg-badge-live-bg text-badge-live-text' : (q.Status === 'Gagal' ? 'bg-error-container text-error' : 'bg-tint-blue-subtle text-primary')}">
                ${q.Status}
              </span>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('WA Gateway Error:', err);
    }
  }

  async function prosesAntrianManual() {
    showToast('Memproses antrean pesan...', 'info');
    try {
      const res = await API.post('admin_prosesAntrianSekarang');
      if (res.success) {
        showToast(`Berhasil memproses antrean (${res.diproses} pesan terkirim).`, 'success');
        renderAdminWAGateway();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function bukaModalKirimManual() {
    document.getElementById('modal-wa-manual').classList.remove('hidden');
  }

  async function submitKirimManual(e) {
    e.preventDefault();
    const nomor = document.getElementById('manual-wa-nomor').value;
    const pesan = document.getElementById('manual-wa-pesan').value;

    try {
      const res = await API.post('admin_kirimPesanManual', { nomor, pesan });
      if (res.success) {
        showToast('Pesan WhatsApp berhasil dikirim!', 'success');
        document.getElementById('modal-wa-manual').classList.add('hidden');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function renderAdminBroadcast() {
    if (!API.isAdmin()) return;
    // Tampilkan form broadcast
  }

  async function submitBroadcastWA(e) {
    e.preventDefault();
    const judul = document.getElementById('bc-judul').value;
    const pesan = document.getElementById('bc-pesan').value;
    const sasaran = document.getElementById('bc-sasaran').value;

    try {
      const res = await API.post('admin_buatBroadcastWA', {
        judul, pesan, sasaran, ukuran_batch: 20, jeda_detik: 4
      });

      if (res.success) {
        showToast(`Broadcast dibuat untuk ${res.total_antrean} kontak. Mengirim bertahap...`, 'success');
        navigateTo('admin-wa');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /**
   * ============================================
   * 7. ADMIN KELAS & SILABUS
   * ============================================
   */
  async function renderAdminKelas() {
    if (!API.isAdmin()) return;
    const container = document.getElementById('admin-kelas-container');
    if (!container) return;

    try {
      const res = await API.post('admin_getKelasSilabus');
      if (!res.success) return;

      const courses = res.data || [];
      container.innerHTML = courses.map(c => `
        <div class="card-elevation rounded-2xl p-6 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-4">
              <img src="${c.thumbnail}" class="w-16 h-16 rounded-xl object-cover bg-slate-100" alt="${c.judul}">
              <div>
                <span class="px-2.5 py-0.5 rounded-full bg-tint-blue-subtle text-primary font-bold text-xs">${c.kategori}</span>
                <h3 class="font-bold text-base text-text-primary mt-1">${c.judul}</h3>
                <span class="text-xs text-text-muted">Rp ${(c.harga || 0).toLocaleString('id-ID')} • ${c.silabus.length} Modul</span>
              </div>
            </div>
            <button onclick="window.EduPathApp.bukaModalTambahModul('${c.kelas_id}')" class="px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1 shadow-sm">
              <span class="material-symbols-outlined text-[16px]">add</span> + Modul
            </button>
          </div>
          <div class="border-t border-surface-border pt-3">
            <h5 class="text-xs font-bold text-text-secondary uppercase mb-2">Daftar Modul Kurikulum:</h5>
            <div class="space-y-1.5">
              ${c.silabus.map(m => `
                <div class="p-2.5 rounded-lg bg-surface-container-low text-xs flex justify-between items-center">
                  <span>Modul ${m.urutan}: <strong>${m.judul}</strong> (${m.tipe_konten})</span>
                  <span class="text-text-muted">${m.durasi_menit} mnt</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  function bukaModalTambahModul(kelasId) {
    document.getElementById('modal-modul-kelas-id').value = kelasId;
    document.getElementById('modal-tambah-modul').classList.remove('hidden');
  }

  async function submitTambahModul(e) {
    e.preventDefault();
    const kelasId = document.getElementById('modal-modul-kelas-id').value;
    const judul = document.getElementById('modul-judul').value;
    const urutan = document.getElementById('modul-urutan').value;
    const tipe = document.getElementById('modul-tipe').value;
    const sumber = document.getElementById('modul-sumber').value;
    const durasi = document.getElementById('modul-durasi').value;
    const ringkasan = document.getElementById('modul-ringkasan').value;

    try {
      const res = await API.post('admin_simpanModul', {
        data: {
          kelas_id: kelasId,
          judul: judul,
          urutan: urutan,
          tipe_konten: tipe,
          sumber: sumber,
          durasi_menit: durasi,
          ringkasan: ringkasan
        }
      });

      if (res.success) {
        showToast('Modul kurikulum berhasil disimpan!', 'success');
        document.getElementById('modal-tambah-modul').classList.add('hidden');
        renderAdminKelas();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /**
   * ============================================
   * 8. DATABASE MIGRATION MODAL (GAS-MIGRASI-DATABASE)
   * ============================================
   */
  function bukaModalMigrasi() {
    document.getElementById('modal-migrasi-db').classList.remove('hidden');
  }

  async function jalankanSimulasiMigrasi(dryRun = true) {
    const sourceUrl = document.getElementById('migrasi-source-url').value;
    const resultBox = document.getElementById('migrasi-result-box');
    if (!sourceUrl) {
      showToast('Masukkan ID atau URL Spreadsheet Lama', 'error');
      return;
    }

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `<div class="p-4 text-center text-xs"><span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> ${dryRun ? 'Menjalankan Simulasi (Dry-Run)...' : 'Mengeksekusi Migrasi Data...'}</div>`;

    try {
      const action = dryRun ? 'admin_simulasiMigrasi' : 'admin_eksekusiMigrasi';
      const res = await API.post(action, { sourceIdOrUrl: sourceUrl });

      if (res.success) {
        const sm = res.summary;
        resultBox.innerHTML = `
          <div class="p-4 bg-tint-green-subtle text-badge-live-text rounded-xl text-xs space-y-1">
            <p class="font-bold text-sm">${res.message}</p>
            <p>• Members: +${sm.members.inserted} baru, ~${sm.members.updated} update, ${sm.members.skipped} lewati</p>
            <p>• Kelas: +${sm.kelas.inserted} baru, ~${sm.kelas.updated} update, ${sm.kelas.skipped} lewati</p>
            <p>• Modul: +${sm.modul.inserted} baru, ~${sm.modul.updated} update, ${sm.modul.skipped} lewati</p>
          </div>
        `;
      } else {
        resultBox.innerHTML = `<div class="p-4 bg-error-container text-error rounded-xl text-xs">${res.message}</div>`;
      }
    } catch (err) {
      resultBox.innerHTML = `<div class="p-4 bg-error-container text-error rounded-xl text-xs">${err.message}</div>`;
    }
  }

  /**
   * ============================================
   * 9. AUTENTIKASI: LOGIN & LOGOUT
   * ============================================
   */
  async function submitLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const roleChoice = document.querySelector('input[name="login-role"]:checked').value;

    const btn = document.getElementById('btn-submit-login');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Masuk...`;

    try {
      const action = roleChoice === 'admin' ? 'loginAdmin' : 'loginMember';
      const res = await API.post(action, { email, password });

      if (res.success) {
        API.setToken(res.token);
        API.setUser(res.user);
        AppState.user = res.user;

        showToast(res.message, 'success');
        updateNavigationUI();

        if (res.user.role === 'admin') {
          navigateTo('admin-dashboard');
        } else {
          navigateTo('dashboard');
        }
      } else {
        showToast(res.message || 'Login gagal', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Masuk ke Akun</span>`;
    }
  }

  function doLogout() {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    API.logout();
    AppState.user = null;
    updateNavigationUI();
    showToast('Anda telah berhasil keluar.', 'info');
    navigateTo('katalog');
  }

  /**
   * Helper Notifikasi Toast
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const item = document.createElement('div');
    item.className = `toast-item ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    item.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${icon}</span>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(10px)';
      item.style.transition = 'all 0.25s ease';
      setTimeout(() => item.remove(), 250);
    }, 4000);
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Navigasi data-path
    document.querySelectorAll('[data-path]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const path = el.getAttribute('data-path');
        if (path === 'keluar' || path === 'logout') {
          doLogout();
        } else {
          navigateTo(path);
        }
      });
    });

    // Forms
    const formLogin = document.getElementById('form-login');
    if (formLogin) formLogin.addEventListener('submit', submitLogin);

    const formCheckout = document.getElementById('form-checkout');
    if (formCheckout) formCheckout.addEventListener('submit', submitCheckout);

    const formBukti = document.getElementById('form-unggah-bukti');
    if (formBukti) formBukti.addEventListener('submit', submitUnggahBukti);

    const formWaManual = document.getElementById('form-wa-manual');
    if (formWaManual) formWaManual.addEventListener('submit', submitKirimManual);

    const formModul = document.getElementById('form-tambah-modul');
    if (formModul) formModul.addEventListener('submit', submitTambahModul);
  }

  // Ekspos ke global window untuk inline handlers
  window.EduPathApp = {
    navigateTo,
    bukaModalCheckout,
    bukaRuangMateri(kelasId) {
      navigateTo('ruang-materi', { kelas_id: kelasId });
    },
    pilihModul,
    tandaiModulSelesai,
    filterCRMBySegment,
    bukaDrawerCRM,
    tutupDrawerCRM,
    simpanCatatanDrawerCRM,
    verifikasiTrx,
    prosesAntrianManual,
    bukaModalKirimManual,
    bukaModalTambahModul,
    bukaModalMigrasi,
    jalankanSimulasiMigrasi,
    doLogout,
    showToast
  };

  // Jalankan inisialisasi saat DOM siap
  document.addEventListener('DOMContentLoaded', initApp);
})();
