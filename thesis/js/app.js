/**
 * BKLIB THESIS SUBMISSION & WORKFLOW SYSTEM
 * Tác giả: Senior Dev Thư viện ĐH Bách Khoa (BKlib / HCMUT)
 * Điều khiển toàn bộ Giao diện, Phân quyền DSpace và Luồng nghiệp vụ
 */

import { DSPACE_COLLECTION, USER_ROLES, WorkflowState } from './state.js';
import { DigitalSignatureService } from './digitalSign.js';
import { MailService } from './mailService.js';

let currentUser = WorkflowState.getCurrentUser();
let currentTab = 'tasks'; // 'my-submissions' | 'submit-new' | 'tasks' | 'public-archive' | 'admin' | 'email-box'
let activeModalSubmissionId = null;

// Khởi chạy khi tài liệu tải xong
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Đồng bộ role mặc định
  if (currentUser.id === 'submitter') {
    currentTab = 'my-submissions';
  } else if (currentUser.id === 'admin') {
    currentTab = 'admin';
  } else {
    currentTab = 'tasks';
  }

  renderHeaderUser();
  renderSidebar();
  renderRoleSwitcher();
  renderMainContent();
  setupEventListeners();
}

/**
 * Hiển thị thông tin người dùng trên Header
 */
function renderHeaderUser() {
  const container = document.getElementById('headerUserStatus');
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <button id="btnOpenPublicKey" class="btn btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:5px; font-size:12px; padding:5px 12px; background:#eff6ff; border-color:#93c5fd; color:#00529c; font-weight:600; border-radius:6px; cursor:pointer;">
        🔑 Khóa Công Khai (Public Key)
      </button>
      <div class="user-pill">
        <span><strong>${currentUser.name}</strong> (${currentUser.email})</span>
        <span class="role-tag">${currentUser.roleTitle}</span>
      </div>
    </div>
  `;

  document.getElementById('btnOpenPublicKey')?.addEventListener('click', () => {
    showPublicKeyModal();
  });
}

/**
 * Hiển thị thanh chuyển đổi vai trò (Role Switcher)
 */
function renderRoleSwitcher() {
  const container = document.getElementById('roleSwitcherContainer');
  if (!container) return;

  const roleKeys = Object.keys(USER_ROLES);
  const chipsHtml = roleKeys.map(k => {
    const r = USER_ROLES[k];
    const isActive = r.id === currentUser.id ? 'active' : '';
    return `<button class="btn-chip ${isActive}" data-role-key="${k}">${r.name.split(' (')[0]}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="role-switcher-inner">
      <div class="switch-label">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7.5" r="4"></circle>
          <polyline points="17 11 19 13 23 9"></polyline>
        </svg>
        <span>Chuyển đổi vai trò thử nghiệm (Role Switcher):</span>
        <select id="selectRoleSwitcher" class="user-selector-select">
          ${roleKeys.map(k => {
            const r = USER_ROLES[k];
            return `<option value="${k}" ${r.id === currentUser.id ? 'selected' : ''}>${r.display}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="quick-switch-buttons">
        ${chipsHtml}
      </div>
    </div>
  `;

  // Gắn sự kiện chuyển vai
  document.getElementById('selectRoleSwitcher').addEventListener('change', (e) => {
    switchUser(e.target.value);
  });

  document.querySelectorAll('.btn-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const rKey = btn.getAttribute('data-role-key');
      switchUser(rKey);
    });
  });
}

function switchUser(roleKey) {
  WorkflowState.setCurrentUser(roleKey);
  currentUser = USER_ROLES[roleKey];
  
  // Tự động chuyển tab phù hợp với vai trò
  if (currentUser.id === 'submitter') {
    currentTab = 'my-submissions';
  } else if (currentUser.id === 'admin') {
    currentTab = 'admin';
  } else {
    currentTab = 'tasks';
  }

  renderHeaderUser();
  renderRoleSwitcher();
  renderSidebar();
  renderMainContent();
}

/**
 * Hiển thị Sidebar bên trái (Collection Info & Navigation)
 */
function renderSidebar() {
  const container = document.getElementById('sidebarContainer');
  if (!container) return;

  const submissions = WorkflowState.getSubmissions();
  const myCount = submissions.filter(s => s.submitterEmail === 'nthieu@hcmut.edu.vn').length;
  
  // Đếm nhiệm vụ chờ duyệt theo vai trò
  let pendingCount = 0;
  if (currentUser.id === 'reviewer') {
    pendingCount = submissions.filter(s => s.status === 'step1').length;
  } else if (currentUser.id === 'editor') {
    pendingCount = submissions.filter(s => s.status === 'step2').length;
  } else if (currentUser.id === 'final_editor') {
    pendingCount = submissions.filter(s => s.status === 'step3').length;
  } else if (currentUser.id === 'admin') {
    pendingCount = submissions.filter(s => ['step1', 'step2', 'step3'].includes(s.status)).length;
  }

  const archiveCount = submissions.filter(s => s.status === 'archived').length;
  const emails = MailService.getInbox();

  container.innerHTML = `
    <!-- Thông tin Bộ sưu tập DSpace -->
    <div class="panel-box">
      <div class="panel-title">
        <span>Bộ sưu tập DSpace</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
      </div>
      <div class="collection-card">
        <div class="collection-name">${DSPACE_COLLECTION.name}</div>
        <div style="font-size:0.75rem; color:#4b5563;">${DSPACE_COLLECTION.community}</div>
        <div class="collection-id-field" title="Collection UUID">
          UUID: ${DSPACE_COLLECTION.id}
        </div>
      </div>
    </div>

    <!-- Menu điều hướng -->
    <div class="panel-box">
      <div class="panel-title">Chức năng</div>
      <ul class="nav-menu">
        ${currentUser.id === 'submitter' || currentUser.id === 'admin' ? `
          <li class="nav-item ${currentTab === 'my-submissions' ? 'active' : ''}">
            <button data-tab="my-submissions">
              <span>📄 Luận văn của tôi</span>
              <span class="nav-count">${myCount}</span>
            </button>
          </li>
          <li class="nav-item ${currentTab === 'submit-new' ? 'active' : ''}">
            <button data-tab="submit-new">
              <span>➕ Nộp Luận văn mới</span>
            </button>
          </li>
        ` : ''}

        ${currentUser.id !== 'submitter' ? `
          <li class="nav-item ${currentTab === 'tasks' ? 'active' : ''}">
            <button data-tab="tasks">
              <span>⏳ Hàng đợi kiểm duyệt</span>
              <span class="nav-count" style="background:#fde68a; color:#92400e;">${pendingCount}</span>
            </button>
          </li>
        ` : ''}

        <li class="nav-item ${currentTab === 'public-archive' ? 'active' : ''}">
          <button data-tab="public-archive">
            <span>🌐 Kho lưu chiểu (DSpace)</span>
            <span class="nav-count">${archiveCount}</span>
          </button>
        </li>

        <li class="nav-item ${currentTab === 'email-box' ? 'active' : ''}">
          <button data-tab="email-box">
            <span>📧 Hộp thư DSpace (nthieu)</span>
            <span class="nav-count" style="background:#bbf7d0; color:#166534;">${emails.length}</span>
          </button>
        </li>

        ${currentUser.id === 'admin' ? `
          <li class="nav-item ${currentTab === 'admin' ? 'active' : ''}">
            <button data-tab="admin">
              <span>⚙️ Quản trị Bộ sưu tập</span>
            </button>
          </li>
        ` : ''}
      </ul>
    </div>

    <!-- Hướng dẫn Quy trình 3 bước DSpace -->
    <div class="panel-box">
      <div class="panel-title">Quy trình kiểm duyệt</div>
      <div class="workflow-stages-list">
        <div class="stage-step ${currentUser.id === 'submitter' ? 'active-role' : ''}">
          <div class="stage-step-title">0. Học viên nộp bài</div>
          <div class="stage-step-actor">nthieu@hcmut.edu.vn</div>
        </div>
        <div class="stage-step ${currentUser.id === 'reviewer' ? 'active-role' : ''}">
          <div class="stage-step-title">Bước 1: Sơ duyệt (Reviewer)</div>
          <div class="stage-step-actor">nth309@gmail.com (CBHD)</div>
        </div>
        <div class="stage-step ${currentUser.id === 'editor' ? 'active-role' : ''}">
          <div class="stage-step-title">Bước 2: Biên tập (Editor)</div>
          <div class="stage-step-actor">hieugalaxya07@gmail.com (Chủ tịch HĐ)</div>
        </div>
        <div class="stage-step ${currentUser.id === 'final_editor' ? 'active-role' : ''}">
          <div class="stage-step-title">Bước 3: Biên mục & Ký số</div>
          <div class="stage-step-actor">lehoang.13291@gmail.com (Thư viện)</div>
        </div>
        <div class="stage-step">
          <div class="stage-step-title">Xuất bản DSpace (Archived)</div>
          <div class="stage-step-actor">Cấp mã Handle & Gửi email</div>
        </div>
      </div>
    </div>
  `;

  // Gắn sự kiện chuyển tab
  container.querySelectorAll('.nav-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.getAttribute('data-tab');
      renderSidebar();
      renderMainContent();
    });
  });
}

/**
 * Hiển thị Nội dung chính tùy thuộc Tab hiện tại
 */
function renderMainContent() {
  const container = document.getElementById('mainContentArea');
  if (!container) return;

  switch (currentTab) {
    case 'my-submissions':
      renderMySubmissionsTab(container);
      break;
    case 'submit-new':
      renderSubmitNewTab(container);
      break;
    case 'tasks':
      renderReviewTasksTab(container);
      break;
    case 'public-archive':
      renderPublicArchiveTab(container);
      break;
    case 'email-box':
      renderEmailBoxTab(container);
      break;
    case 'admin':
      renderAdminTab(container);
      break;
    default:
      renderPublicArchiveTab(container);
  }
}

/**
 * TAB 1: Danh sách luận văn của học viên
 */
function renderMySubmissionsTab(container) {
  const submissions = WorkflowState.getSubmissions().filter(s => s.submitterEmail === 'nthieu@hcmut.edu.vn');

  container.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <div class="box-title">
          <h2>Danh sách Luận văn của Tôi</h2>
          <p>Tài khoản: <strong>${currentUser.email}</strong> | Bộ sưu tập: <strong>${DSPACE_COLLECTION.name}</strong></p>
        </div>
        <button class="btn btn-primary" id="btnGoSubmitNew">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nộp luận văn mới
        </button>
      </div>

      ${submissions.length === 0 ? `
        <div class="alert alert-info">Bạn chưa có bài nộp nào trong bộ sưu tập này. Hãy nhấn <strong>Nộp luận văn mới</strong> để bắt đầu.</div>
      ` : `
        <div class="table-responsive">
          <table class="dspace-table">
            <thead>
              <tr>
                <th style="width: 70px;">Mã</th>
                <th>Tiêu đề Luận văn</th>
                <th>Tệp đính kèm</th>
                <th>Trạng thái hiện tại</th>
                <th style="width: 170px;">Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${submissions.map(s => `
                <tr>
                  <td><code>${s.id}</code></td>
                  <td>
                    <strong>${s.title}</strong>
                    <div style="font-size:0.75rem; color:#64748b;">
                      CBHD: ${s.advisor} | Ngành: ${s.major} (${s.defenseYear})
                    </div>
                    ${s.rejectionReason ? `
                      <div class="alert alert-danger" style="margin-top:6px; padding:6px 10px; font-size:0.75rem;">
                        <strong>Lý do trả về chỉnh sửa:</strong> ${s.rejectionReason}
                      </div>
                    ` : ''}
                  </td>
                  <td>
                    <span style="font-size:0.8rem;">📎 ${s.fileName}</span>
                    <div style="font-size:0.7rem; color:#94a3b8;">${s.fileSize}</div>
                  </td>
                  <td>${getStatusBadge(s.status)}</td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-outline btn-sm btn-view-sub" data-id="${s.id}">Xem</button>
                      ${s.status === 'draft' ? `
                        <button class="btn btn-primary btn-sm btn-edit-draft" data-id="${s.id}">Sửa & Nộp</button>
                      ` : ''}
                      ${s.status === 'archived' ? `
                        <button class="btn btn-success btn-sm btn-view-email" data-id="${s.id}">Xem Email</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  document.getElementById('btnGoSubmitNew')?.addEventListener('click', () => {
    currentTab = 'submit-new';
    renderSidebar();
    renderMainContent();
  });

  attachTableActionListeners();
}

/**
 * TAB 2: Form Nộp Luận văn mới hoặc Chỉnh sửa Bản nháp
 */
function renderSubmitNewTab(container, editingId = null) {
  let existing = null;
  if (editingId) {
    existing = WorkflowState.getSubmissions().find(s => s.id === editingId);
  }

  container.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <div class="box-title">
          <h2>${existing ? 'Chỉnh sửa Bản nháp & Nộp lại Luận văn' : 'Nộp Luận văn Thạc sĩ Mới'}</h2>
          <p>Bộ sưu tập: <strong>${DSPACE_COLLECTION.name}</strong> (Mã: <code>${DSPACE_COLLECTION.id}</code>)</p>
        </div>
      </div>

      ${existing && existing.rejectionReason ? `
        <div class="alert alert-warning">
          <strong>Lưu ý từ Ban kiểm duyệt:</strong> Bài nộp của bạn đã bị từ chối với lý do: <em>"${existing.rejectionReason}"</em>. Vui lòng rà soát metadata và tải lại tệp PDF chuẩn hóa trước khi nhấn Nộp bài.
        </div>
      ` : ''}

      <form id="submissionForm">
        <input type="hidden" id="formSubmissionId" value="${existing ? existing.id : ''}">
        
        <div class="form-grid">
          <div class="form-group col-full">
            <label class="form-label">Tiêu đề Luận văn (dc.title) <span class="req">*</span></label>
            <input type="text" id="fTitle" class="form-control" required placeholder="Nhập tên đề tài luận văn thạc sĩ chính thức..." value="${existing ? escapeHtml(existing.title) : ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Tác giả / Học viên (dc.contributor.author) <span class="req">*</span></label>
            <input type="text" id="fAuthor" class="form-control" required value="${existing ? escapeHtml(existing.author) : 'Nguyễn Trung Hiếu'}">
          </div>

          <div class="form-group">
            <label class="form-label">Email học viên (DSpace Submitter) <span class="req">*</span></label>
            <input type="email" id="fSubmitterEmail" class="form-control" readonly value="nthieu@hcmut.edu.vn">
          </div>

          <div class="form-group">
            <label class="form-label">Cán bộ Hướng dẫn (dc.contributor.advisor) <span class="req">*</span></label>
            <input type="text" id="fAdvisor" class="form-control" required value="${existing ? escapeHtml(existing.advisor) : 'PGS. TS. Nguyễn Thế Hưng'}">
          </div>

          <div class="form-group">
            <label class="form-label">Email Cán bộ Hướng dẫn (Reviewer Step 1) <span class="req">*</span></label>
            <input type="email" id="fAdvisorEmail" class="form-control" readonly value="nth309@gmail.com">
          </div>

          <div class="form-group">
            <label class="form-label">Chuyên ngành đào tạo</label>
            <input type="text" id="fMajor" class="form-control" value="${existing ? escapeHtml(existing.major) : 'Khoa học Máy tính'}">
          </div>

          <div class="form-group">
            <label class="form-label">Năm bảo vệ tốt nghiệp (dc.date.issued)</label>
            <input type="text" id="fDefenseYear" class="form-control" value="${existing ? escapeHtml(existing.defenseYear) : '2026'}">
          </div>

          <div class="form-group col-full">
            <label class="form-label">Từ khóa (dc.subject) — phân cách bằng dấu chấm phẩy</label>
            <input type="text" id="fKeywords" class="form-control" placeholder="Ví dụ: DSpace; Luận văn Thạc sĩ; Chữ ký số; HCMUT" value="${existing ? escapeHtml(existing.keywords) : 'DSpace; Luận văn Thạc sĩ; Chữ ký số; Đại học Bách khoa'}">
          </div>

          <div class="form-group col-full">
            <label class="form-label">Tóm tắt luận văn (dc.description.abstract) <span class="req">*</span></label>
            <textarea id="fAbstract" class="form-control" rows="4" required placeholder="Nhập tóm tắt nội dung nghiên cứu, phương pháp và kết quả đóng góp của luận văn...">${existing ? escapeHtml(existing.abstract) : 'Nghiên cứu kiến trúc phân quyền và tự động hóa quy trình nộp, thẩm định 3 bước độc lập đối với luận văn sau đại học. Ứng dụng công nghệ chữ ký số điện tử và định danh Handle vĩnh viễn nhằm đảm bảo tính toàn vẹn và bản quyền tài liệu khoa học tại Trường Đại học Bách khoa - ĐHQG-HCM.'}</textarea>
          </div>

          <!-- File Upload -->
          <div class="form-group col-full">
            <label class="form-label">Tệp đính kèm toàn văn PDF (dc.format.mimetype: application/pdf) <span class="req">*</span></label>
            <div class="file-upload-card" id="dropPdfZone">
              <input type="file" id="fPdfInput" accept=".pdf" style="display:none;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00529c" stroke-width="2" style="margin-bottom:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <div style="font-weight:600; color:#003366;">Nhấp chuột để chọn tệp PDF hoặc kéo thả file vào đây</div>
              <div style="font-size:0.75rem; color:#64748b;">Định dạng PDF chuẩn lưu trữ DSpace (Tối đa 30MB)</div>
            </div>
            <div id="fileUploadDisplay" class="file-preview-bar">
              <span id="fileNameText">📎 ${existing ? existing.fileName : 'LuanVan_ThacSi_HCMUT.pdf'}</span>
              <span id="fileSizeText" style="color:#64748b; font-size:0.78rem;">${existing ? existing.fileSize : '4.2 MB'}</span>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px solid #e5e7eb; padding-top:16px;">
          <button type="button" class="btn btn-outline" id="btnSaveDraft">Lưu Bản nháp (Draft)</button>
          <button type="submit" class="btn btn-primary" id="btnSubmitOfficial">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"></path><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            Tải lên / Nộp bài chính thức
          </button>
        </div>
      </form>
    </div>
  `;

  // Xử lý upload file giả lập
  const dropZone = document.getElementById('dropPdfZone');
  const fileInput = document.getElementById('fPdfInput');
  const fileNameText = document.getElementById('fileNameText');
  const fileSizeText = document.getElementById('fileSizeText');

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      fileNameText.textContent = '📎 ' + file.name;
      fileSizeText.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    }
  });

  // Lưu nháp
  document.getElementById('btnSaveDraft').addEventListener('click', () => {
    const formData = collectFormData();
    WorkflowState.saveDraft(formData, !existing);
    alert('Đã lưu bản nháp thành công!');
    currentTab = 'my-submissions';
    renderSidebar();
    renderMainContent();
  });

  // Nộp chính thức
  document.getElementById('submissionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = collectFormData();
    const saved = WorkflowState.saveDraft(formData, !existing);
    try {
      WorkflowState.submitOfficial(saved.id);
      alert('Đã nộp luận văn thành công vào Bộ sưu tập! Bài nộp đã chuyển sang Bước 1 (Sơ duyệt - CBHD).');
      currentTab = 'my-submissions';
      renderSidebar();
      renderMainContent();
    } catch (err) {
      alert(err.message);
    }
  });

  function collectFormData() {
    return {
      id: document.getElementById('formSubmissionId').value,
      title: document.getElementById('fTitle').value.trim(),
      author: document.getElementById('fAuthor').value.trim(),
      advisor: document.getElementById('fAdvisor').value.trim(),
      advisorEmail: document.getElementById('fAdvisorEmail').value.trim(),
      major: document.getElementById('fMajor').value.trim(),
      defenseYear: document.getElementById('fDefenseYear').value.trim(),
      keywords: document.getElementById('fKeywords').value.trim(),
      abstract: document.getElementById('fAbstract').value.trim(),
      fileName: fileNameText.textContent.replace('📎 ', ''),
      fileSize: fileSizeText.textContent
    };
  }
}

/**
 * TAB 3: Hàng đợi Kiểm duyệt (Dành cho Reviewer, Editor, Final Editor, Admin)
 */
function renderReviewTasksTab(container) {
  const allSubmissions = WorkflowState.getSubmissions();
  let tasks = [];
  let roleTitle = '';
  let roleDesc = '';

  if (currentUser.id === 'reviewer') {
    tasks = allSubmissions.filter(s => s.status === 'step1');
    roleTitle = 'Bước 1: Người kiểm duyệt (Reviewer - Cán bộ hướng dẫn)';
    roleDesc = 'Nhiệm vụ: Lớp phòng thủ đầu tiên — Đánh giá sơ bộ chất lượng, kiểm tra định dạng file PDF. Quyền hạn: Chấp nhận (Accept) để chuyển sang Bước 2, hoặc Từ chối (Reject) về Bản nháp. (Không thể sửa metadata).';
  } else if (currentUser.id === 'editor') {
    tasks = allSubmissions.filter(s => s.status === 'step2');
    roleTitle = 'Bước 2: Người biên tập (Editor - Chủ tịch hội đồng)';
    roleDesc = 'Nhiệm vụ: Kiểm tra tính chính xác và chuẩn hóa thông tin trích dẫn/metadata. Quyền hạn: Chỉnh sửa Metadata, Chấp nhận (Accept) sang Bước 3, hoặc Từ chối (Reject) về Bản nháp. (Không thể sửa file PDF).';
  } else if (currentUser.id === 'final_editor') {
    tasks = allSubmissions.filter(s => s.status === 'step3');
    roleTitle = 'Bước 3: Người biên tập cuối (Final Editor - Cán bộ thư viện)';
    roleDesc = 'Nhiệm vụ: Người gác cổng cuối cùng — Rà soát tổng thể tính pháp lý, bản quyền và metadata. Quyền hạn: Chỉnh sửa Metadata, KÝ SỐ ĐIỆN TỬ & Duyệt xuất bản (Commit to Archive). (Theo chuẩn DSpace: Không thể từ chối về Submitter ban đầu).';
  } else if (currentUser.id === 'admin') {
    tasks = allSubmissions.filter(s => ['step1', 'step2', 'step3'].includes(s.status));
    roleTitle = 'Bộ sưu tập Quản trị viên: Toàn bộ danh sách chờ duyệt';
    roleDesc = 'Tài khoản BKlib Admin có toàn quyền can thiệp, phân quyền, chỉnh sửa metadata và duyệt bài ở bất kỳ bước nào.';
  }

  container.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <div class="box-title">
          <h2>${roleTitle}</h2>
          <p>${roleDesc}</p>
        </div>
      </div>

      <div class="alert alert-info">
        <strong>Tài khoản đang thao tác:</strong> <code>${currentUser.email}</code> | <strong>Nhóm DSpace:</strong> <code>${currentUser.dspaceGroup}</code>
      </div>

      ${tasks.length === 0 ? `
        <div class="alert alert-success">
          Hiện tại không có bài nộp nào đang chờ duyệt ở bước của bạn.
        </div>
      ` : `
        <div class="table-responsive">
          <table class="dspace-table">
            <thead>
              <tr>
                <th style="width: 70px;">Mã</th>
                <th>Tiêu đề & Tác giả</th>
                <th>Bước kiểm duyệt</th>
                <th>Tệp đính kèm</th>
                <th style="width: 220px;">Thao tác kiểm duyệt</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(s => `
                <tr>
                  <td><code>${s.id}</code></td>
                  <td>
                    <strong>${s.title}</strong>
                    <div style="font-size:0.75rem; color:#4b5563;">
                      Học viên: ${s.author} (${s.submitterEmail}) | CBHD: ${s.advisor}
                    </div>
                  </td>
                  <td>${getStatusBadge(s.status)}</td>
                  <td>
                    <span style="font-size:0.8rem;">📄 ${s.fileName}</span>
                    <div style="font-size:0.7rem; color:#64748b;">${s.fileSize}</div>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-outline btn-sm btn-view-sub" data-id="${s.id}">Xem</button>
                      <button class="btn btn-primary btn-sm btn-process-workflow" data-id="${s.id}" data-status="${s.status}">
                        ${getWorkflowButtonText(s.status)}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  attachTableActionListeners();
}

function getWorkflowButtonText(status) {
  if (status === 'step1') return '🔍 Sơ duyệt (B1)';
  if (status === 'step2') return '✏️ Biên tập (B2)';
  if (status === 'step3') return '🔏 Ký số & Xuất bản (B3)';
  return 'Xử lý';
}

/**
 * TAB 4: Kho Lưu Chiểu Công Khai DSpace (Đã duyệt xuất bản)
 */
function renderPublicArchiveTab(container) {
  const list = WorkflowState.getSubmissions().filter(s => s.status === 'archived');

  container.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <div class="box-title">
          <h2>Kho Lưu Chiểu Luận văn Điện tử (BKlib DSpace Archive)</h2>
          <p>Các tài liệu đã vượt qua quy trình kiểm duyệt 3 bước độc lập, được ký số điện tử và gán mã định danh Handle vĩnh viễn.</p>
        </div>
      </div>

      ${list.length === 0 ? `
        <div class="alert alert-info">Chưa có luận văn nào được công bố trong kho lưu chiểu.</div>
      ` : `
        <div class="table-responsive">
          <table class="dspace-table">
            <thead>
              <tr>
                <th>Mã Handle DSpace</th>
                <th>Tiêu đề Luận văn Thạc sĩ</th>
                <th>Tác giả & CBHD</th>
                <th>Chứng thực Ký số</th>
                <th style="width: 140px;">Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td>
                    <a href="${s.handleUrl}" target="_blank" style="color:#0072bc; font-weight:600; text-decoration:none;">
                      <code>${s.handleId}</code>
                    </a>
                  </td>
                  <td>
                    <strong>${s.title}</strong>
                    <div style="font-size:0.75rem; color:#64748b;">
                      Chuyên ngành: ${s.major} | Năm bảo vệ: ${s.defenseYear}
                    </div>
                  </td>
                  <td>
                    <div style="font-size:0.82rem;"><strong>${s.author}</strong></div>
                    <div style="font-size:0.75rem; color:#64748b;">CBHD: ${s.advisor}</div>
                  </td>
                  <td>
                    <span style="color:#166534; font-weight:600; font-size:0.78rem; display:flex; align-items:center; gap:4px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Đã ký số BKlib CA
                    </span>
                    <div style="font-size:0.7rem; color:#64748b;">${s.digitalSignature?.certificateSerial || 'BK-VN-2026-X509'}</div>
                  </td>
                  <td>
                    <button class="btn btn-primary btn-sm btn-view-sub" data-id="${s.id}">Xem biểu ghi</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  attachTableActionListeners();
}

/**
 * TAB 5: Hộp thư Email thông báo DSpace của học viên nthieu@hcmut.edu.vn
 */
function renderEmailBoxTab(container) {
  const emails = MailService.getInbox();

  container.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <div class="box-title">
          <h2>Hộp thư Thông báo Tự động DSpace</h2>
          <p>Mô phỏng hộp thư đến của học viên <strong>nthieu@hcmut.edu.vn</strong> nhận email xác nhận xuất bản kèm mã định danh Handle vĩnh viễn.</p>
        </div>
      </div>

      ${emails.length === 0 ? `
        <div class="alert alert-info">
          Hộp thư hiện đang trống. Khi Cán bộ thư viện (Bước 3) duyệt xuất bản (Commit to Archive) luận văn, hệ thống sẽ tự động gửi email thông báo về đây.
        </div>
      ` : `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <div>
            <h4 style="font-size:0.9rem; color:#003366; margin-bottom:10px;">Danh sách thư đã nhận:</h4>
            ${emails.map((m, idx) => `
              <div class="panel-box" style="margin-bottom:10px; cursor:pointer; border-left:3px solid #00529c;" onclick="window.viewEmailDetail(${idx})">
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#64748b;">
                  <span><strong>${m.sender}</strong></span>
                  <span>${m.sentAtFormatted}</span>
                </div>
                <div style="font-weight:700; color:#003366; margin:4px 0;">${m.subject}</div>
                <div style="font-size:0.8rem; color:#4b5563; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  Bạn đã gửi: ${m.submissionTitle}
                </div>
              </div>
            `).join('')}
          </div>

          <div>
            <h4 style="font-size:0.9rem; color:#003366; margin-bottom:10px;">Giao diện hiển thị trên điện thoại của học viên:</h4>
            ${MailService.renderPhoneEmailModal(emails[0])}
          </div>
        </div>
      `}
    </div>
  `;

  window.viewEmailDetail = (idx) => {
    const email = emails[idx];
    openModal('Nội dung Email thông báo DSpace', MailService.renderPhoneEmailModal(email));
  };
}

/**
 * TAB 6: Màn hình Quản trị Bộ sưu tập (BKlib Admin)
 */
function renderAdminTab(container) {
  const allSubmissions = WorkflowState.getSubmissions();

  container.innerHTML = `
    <div class="content-box">
      <div class="box-header">
        <div class="box-title">
          <h2>Bảng Điều Khiển Quản Trị Viên (BKlib Admin)</h2>
          <p>Quản lý Bộ sưu tập DSpace, Phân quyền vai trò (Role Mapping) và Điều phối quy trình nộp luận văn.</p>
        </div>
        <button class="btn btn-outline btn-sm" id="btnResetSeedData" style="color:#b91c1c; border-color:#fca5a5;">
          Khôi phục dữ liệu mẫu chuẩn
        </button>
      </div>

      <!-- Thống kê nhanh -->
      <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; margin-bottom:20px;">
        <div class="panel-box" style="text-align:center;">
          <div style="font-size:1.4rem; font-weight:700; color:#64748b;">${allSubmissions.filter(s=>s.status==='draft').length}</div>
          <div style="font-size:0.75rem; color:#64748b;">Bản nháp (Draft)</div>
        </div>
        <div class="panel-box" style="text-align:center;">
          <div style="font-size:1.4rem; font-weight:700; color:#d97706;">${allSubmissions.filter(s=>s.status==='step1').length}</div>
          <div style="font-size:0.75rem; color:#d97706;">Bước 1 (Reviewer)</div>
        </div>
        <div class="panel-box" style="text-align:center;">
          <div style="font-size:1.4rem; font-weight:700; color:#2563eb;">${allSubmissions.filter(s=>s.status==='step2').length}</div>
          <div style="font-size:0.75rem; color:#2563eb;">Bước 2 (Editor)</div>
        </div>
        <div class="panel-box" style="text-align:center;">
          <div style="font-size:1.4rem; font-weight:700; color:#7c3aed;">${allSubmissions.filter(s=>s.status==='step3').length}</div>
          <div style="font-size:0.75rem; color:#7c3aed;">Bước 3 (Final Editor)</div>
        </div>
        <div class="panel-box" style="text-align:center;">
          <div style="font-size:1.4rem; font-weight:700; color:#059669;">${allSubmissions.filter(s=>s.status==='archived').length}</div>
          <div style="font-size:0.75rem; color:#059669;">Đã xuất bản (Archive)</div>
        </div>
      </div>

      <!-- Cấu hình Phân quyền DSpace Roles -->
      <div class="panel-box" style="margin-bottom:20px;">
        <div class="panel-title">Phân quyền vai trò DSpace Collection (Role Mapping)</div>
        <table class="dspace-table">
          <thead>
            <tr>
              <th>Nhóm quyền DSpace (EPersonGroup)</th>
              <th>Vai trò nghiệp vụ</th>
              <th>Tài khoản được gán</th>
              <th>Quyền hạn cốt lõi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>COLLECTION_99c8f87a..._ADMIN</code></td>
              <td><strong>Quản trị Bộ sưu tập</strong></td>
              <td><code>BKlib Admin</code></td>
              <td>Quản lý toàn diện, chỉnh sửa thông tin, phân quyền, di chuyển, xuất bản.</td>
            </tr>
            <tr>
              <td><code>COLLECTION_99c8f87a..._SUBMIT</code></td>
              <td><strong>Người tải lên (Submitter)</strong></td>
              <td><code>nthieu@hcmut.edu.vn</code></td>
              <td>Nhập metadata, đính kèm PDF luận văn, nộp bài, chỉnh sửa bản nháp khi bị từ chối.</td>
            </tr>
            <tr>
              <td><code>COLLECTION_99c8f87a..._WORKFLOW_ROLE_reviewer</code></td>
              <td><strong>Bước 1: Reviewer</strong></td>
              <td><code>nth309@gmail.com</code> (CBHD)</td>
              <td>Sơ duyệt chất lượng, kiểm tra file PDF. Chấp nhận sang B2 hoặc Từ chối về Nháp. (Không sửa metadata).</td>
            </tr>
            <tr>
              <td><code>COLLECTION_99c8f87a..._WORKFLOW_ROLE_editor</code></td>
              <td><strong>Bước 2: Editor</strong></td>
              <td><code>hieugalaxya07@gmail.com</code> / <code>BKlib Admin</code></td>
              <td>Chuẩn hóa và chỉnh sửa metadata. Chấp nhận sang B3 hoặc Từ chối về Nháp. (Không sửa PDF).</td>
            </tr>
            <tr>
              <td><code>COLLECTION_99c8f87a..._WORKFLOW_ROLE_finaleditor</code></td>
              <td><strong>Bước 3: Final Editor</strong></td>
              <td><code>lehoang.13291@gmail.com</code> / <code>BKlib Admin</code></td>
              <td>Rà soát pháp lý & bản quyền, chỉnh sửa metadata, KÝ SỐ ĐIỆN TỬ, Duyệt xuất bản. (Không thể từ chối về Submitter).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Cấu hình Kiểu Hiển thị Chữ ký số Lưu chiểu (Admin Options) -->
      <div class="panel-box" style="margin-bottom:20px; border:2px solid #93c5fd; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
          <div>
            <h3 style="margin:0; color:#003366; font-size:1.05rem;">⚙️ Cấu Hình Hiển Thị Chữ Ký Số Lưu Chiểu (Admin Settings)</h3>
            <p style="margin:4px 0 0 0; font-size:0.8rem; color:#64748b;">
              Chọn 1 trong 3 tùy chọn kiểu hiển thị chữ ký số. Chữ ký được đóng lên <strong>TẤT CẢ CÁC TRANG</strong> của luận văn.
            </p>
          </div>
          <span class="badge" style="background:#00529c; color:#fff; font-size:11px; padding:4px 10px; border-radius:4px; font-weight:bold;">
            CƠ QUAN KÝ: ĐH BÁCH KHOA TP.HCM
          </span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:14px;">
          <label class="signature-style-option" style="cursor:pointer; padding:12px; border:2px solid ${WorkflowState.getSignatureStyle()==='margin_strips'?'#00529c':'#cbd5e1'}; border-radius:6px; background:#fff; display:block;">
            <input type="radio" name="adminSignStyle" value="margin_strips" ${WorkflowState.getSignatureStyle()==='margin_strips'?'checked':''} style="margin-right:6px;">
            <strong style="color:#003366;">1. Chữ ký số 2 bên lề</strong>
            <p style="margin:6px 0 0 0; font-size:0.75rem; color:#64748b; line-height:1.4;">
              Dải chữ ký chạy dọc hai bên mép lề trái và phải của trang giấy trên <strong>tất cả các trang</strong>.
            </p>
          </label>

          <label class="signature-style-option" style="cursor:pointer; padding:12px; border:2px solid ${WorkflowState.getSignatureStyle()==='diagonal'?'#00529c':'#cbd5e1'}; border-radius:6px; background:#fff; display:block;">
            <input type="radio" name="adminSignStyle" value="diagonal" ${WorkflowState.getSignatureStyle()==='diagonal'?'checked':''} style="margin-right:6px;">
            <strong style="color:#003366;">2. Chữ ký số chéo trang</strong>
            <p style="margin:6px 0 0 0; font-size:0.75rem; color:#64748b; line-height:1.4;">
              Dải chữ ký chạy nghiêng chéo góc 45 độ ở trung tâm <strong>tất cả các trang</strong>.
            </p>
          </label>

          <label class="signature-style-option" style="cursor:pointer; padding:12px; border:2px solid ${WorkflowState.getSignatureStyle()==='invisible'?'#00529c':'#cbd5e1'}; border-radius:6px; background:#fff; display:block;">
            <input type="radio" name="adminSignStyle" value="invisible" ${WorkflowState.getSignatureStyle()==='invisible'?'checked':''} style="margin-right:6px;">
            <strong style="color:#003366;">3. Không chữ ký số (Vô hình)</strong>
            <p style="margin:6px 0 0 0; font-size:0.75rem; color:#64748b; line-height:1.4;">
              Ký số bảo toàn mật mã học, không in hình con dấu lên các trang tài liệu.
            </p>
          </label>
        </div>

        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:10px 14px; border-radius:6px; margin-bottom:14px; font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:6px;">
            <span style="font-weight:600; color:#1e3a8a;">Nội dung con dấu đóng trên các trang:</span>
            <span style="color:#003366; font-weight:700; background:#fff; padding:2px 8px; border-radius:4px; border:1px solid #93c5fd;">
              "ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT"
            </span>
          </div>
          <div style="color:#475569; font-size:0.76rem;">
            * Lưu ý: Hiện tại chưa yêu cầu chữ ký của cá nhân hay mã hóa vào file; con dấu áp dụng đồng nhất chuỗi tên trường trên tất cả các trang.
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <div style="font-size:0.82rem; font-weight:600; color:#003366; margin-bottom:8px;">
            Mô phỏng hiển thị trên các trang tài liệu (Ký tất cả các trang - All pages preview):
          </div>
          <div id="adminLivePagesPreview">
            ${DigitalSignatureService.renderPagesPreviewHtml(WorkflowState.getSignatureStyle(), 4)}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end;">
          <button id="btnSaveSignStyleConfig" class="btn btn-primary btn-sm" style="padding:6px 16px;">
            💾 Lưu Cấu Hình Kiểu Ký Số
          </button>
        </div>
      </div>

      <!-- Quản lý tất cả bài nộp -->
      <div class="panel-box">
        <div class="panel-title">Quản lý toàn bộ Luận văn trong Hệ thống</div>
        <div class="table-responsive">
          <table class="dspace-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tiêu đề Luận văn</th>
                <th>Người nộp</th>
                <th>Trạng thái</th>
                <th>Hành động Admin</th>
              </tr>
            </thead>
            <tbody>
              ${allSubmissions.map(s => `
                <tr>
                  <td><code>${s.id}</code></td>
                  <td><strong>${s.title}</strong></td>
                  <td>${s.author} (${s.submitterEmail})</td>
                  <td>${getStatusBadge(s.status)}</td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-outline btn-sm btn-view-sub" data-id="${s.id}">Chi tiết</button>
                      <button class="btn btn-primary btn-sm btn-edit-metadata" data-id="${s.id}">Sửa Metadata</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnResetSeedData')?.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục lại dữ liệu mẫu ban đầu?')) {
      WorkflowState.resetDefaultData();
      alert('Đã khôi phục dữ liệu mẫu thành công!');
      renderAdminTab(container);
      renderSidebar();
    }
  });

  // Sự kiện thay đổi kiểu ký và xem trước
  document.querySelectorAll('input[name="adminSignStyle"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedStyle = e.target.value;
      const previewBox = document.getElementById('adminLivePagesPreview');
      if (previewBox) {
        previewBox.innerHTML = DigitalSignatureService.renderPagesPreviewHtml(selectedStyle, 4);
      }
      document.querySelectorAll('.signature-style-option').forEach(card => {
        const input = card.querySelector('input');
        card.style.borderColor = input.checked ? '#00529c' : '#cbd5e1';
      });
    });
  });

  document.getElementById('btnSaveSignStyleConfig')?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="adminSignStyle"]:checked')?.value || 'margin_strips';
    WorkflowState.setSignatureStyle(selected);
    alert('Đã lưu cấu hình kiểu hiển thị chữ ký số: ' + selected + '! Mọi bài nộp khi được ký số sẽ tự động áp dụng kiểu này lên tất cả các trang.');
  });

  attachTableActionListeners();
}

/**
 * Gắn các sự kiện xem, sửa, xử lý bài nộp trên bảng dữ liệu
 */
function attachTableActionListeners() {
  // 1. Nút Xem chi tiết
  document.querySelectorAll('.btn-view-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      showSubmissionDetailModal(id);
    });
  });

  // 2. Nút Chỉnh sửa bản nháp
  document.querySelectorAll('.btn-edit-draft').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      currentTab = 'submit-new';
      renderSidebar();
      renderSubmitNewTab(document.getElementById('mainContentArea'), id);
    });
  });

  // 3. Nút Xử lý kiểm duyệt (Reviewer, Editor, Final Editor)
  document.querySelectorAll('.btn-process-workflow').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const status = btn.getAttribute('data-status');
      showWorkflowProcessModal(id, status);
    });
  });

  // 4. Nút Sửa Metadata cho Admin / Editor
  document.querySelectorAll('.btn-edit-metadata').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      showEditMetadataModal(id);
    });
  });

  // 5. Nút Xem Email
  document.querySelectorAll('.btn-view-email').forEach(btn => {
    btn.addEventListener('click', () => {
      const emails = MailService.getInbox();
      if (emails.length > 0) {
        openModal('Nội dung Email thông báo DSpace', MailService.renderPhoneEmailModal(emails[0]));
      } else {
        alert('Chưa có email nào trong hộp thư!');
      }
    });
  });
}

/**
 * Hiển thị Modal Xem Chi tiết Luận văn & Chữ ký số
 */
function showSubmissionDetailModal(id) {
  const item = WorkflowState.getSubmissions().find(s => s.id === id);
  if (!item) return;

  const historyHtml = item.history ? item.history.map(h => `
    <li style="margin-bottom:8px;">
      <span style="font-weight:600; color:#003366;">[${h.step}]</span> ${h.action}
      <div style="font-size:0.72rem; color:#64748b;">Thực hiện bởi: ${h.by} &bull; ${h.time}</div>
    </li>
  `).join('') : '';

  const modalHtml = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div class="panel-box">
        <h3 style="color:#003366; font-size:1.15rem; margin-bottom:8px;">${item.title}</h3>
        <table class="dspace-table" style="font-size:0.84rem;">
          <tr>
            <td style="width:140px; font-weight:600;">Mã bài nộp:</td>
            <td><code>${item.id}</code></td>
          </tr>
          <tr>
            <td style="font-weight:600;">Bộ sưu tập:</td>
            <td>${DSPACE_COLLECTION.name} (<code>${item.collectionId}</code>)</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Tác giả (Học viên):</td>
            <td><strong>${item.author}</strong> (${item.submitterEmail})</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Cán bộ Hướng dẫn:</td>
            <td>${item.advisor} (${item.advisorEmail || 'nth309@gmail.com'})</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Chuyên ngành / Năm:</td>
            <td>${item.major} (Năm bảo vệ: ${item.defenseYear})</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Trạng thái:</td>
            <td>${getStatusBadge(item.status)}</td>
          </tr>
          ${item.handleUrl ? `
            <tr>
              <td style="font-weight:600; color:#0072bc;">Handle URL:</td>
              <td><a href="${item.handleUrl}" target="_blank" style="color:#0072bc; font-weight:700;">${item.handleUrl}</a></td>
            </tr>
          ` : ''}
          <tr>
            <td style="font-weight:600;">Tệp toàn văn PDF:</td>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <span>📎 <strong>${item.fileName}</strong> (${item.fileSize})</span>
                <button class="btn btn-outline btn-sm" onclick="alert('Đang mở file PDF giả lập: ${item.fileName}')">Mở xem PDF</button>
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-weight:600;">Từ khóa:</td>
            <td>${item.keywords || 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Tóm tắt (Abstract):</td>
            <td style="line-height:1.6; color:#374151;">${item.abstract || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <!-- Chứng nhận Ký số điện tử Thư viện -->
      <div>
        <h4 style="font-size:0.9rem; color:#003366; margin-bottom:6px;">Chứng thực Ký số Điện tử Thư viện</h4>
        ${DigitalSignatureService.renderSignatureSealHtml(item.digitalSignature)}
      </div>

      <!-- Xem trước trang đã ký trên tất cả các trang -->
      ${item.digitalSignature ? `
        <div class="panel-box" style="margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px; flex-wrap:wrap; gap:6px;">
            <h4 style="font-size:0.85rem; color:#003366; margin:0;">📄 Mô phỏng các trang tài liệu đã ký số (Ký tất cả các trang):</h4>
            <span style="font-size:0.75rem; color:#059669; font-weight:700;">Áp dụng cho 100% số trang &bull; "${item.digitalSignature.institutionText || 'ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT'}"</span>
          </div>
          ${DigitalSignatureService.renderPagesPreviewHtml(item.digitalSignature.signatureStyle || WorkflowState.getSignatureStyle(), 3)}
        </div>
      ` : ''}

      <!-- Nhật ký xử lý Workflow -->
      <div class="panel-box">
        <h4 style="font-size:0.9rem; color:#003366; margin-bottom:8px;">Lịch sử Luồng kiểm duyệt (Audit Trail)</h4>
        <ul style="padding-left:18px; font-size:0.8rem;">
          ${historyHtml}
        </ul>
      </div>
    </div>
  `;

  openModal('Chi tiết Biểu ghi Luận văn Thạc sĩ', modalHtml);

  document.getElementById('btnToggleCryptoDetails')?.addEventListener('click', () => {
    const box = document.getElementById('cryptoDetailsContainer');
    if (box) {
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
  });
}

/**
 * Hiển thị Modal Xử lý kiểm duyệt theo từng Bước
 */
function showWorkflowProcessModal(id, status) {
  const item = WorkflowState.getSubmissions().find(s => s.id === id);
  if (!item) return;

  activeModalSubmissionId = id;

  if (status === 'step1') {
    // Bước 1: Người kiểm duyệt (Reviewer)
    renderStep1Modal(item);
  } else if (status === 'step2') {
    // Bước 2: Người biên tập (Editor)
    renderStep2Modal(item);
  } else if (status === 'step3') {
    // Bước 3: Người biên tập cuối (Final Editor)
    renderStep3Modal(item);
  }
}

/**
 * Modal Bước 1: Reviewer
 */
function renderStep1Modal(item) {
  const html = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div class="alert alert-info">
        <strong>Bước 1: Sơ duyệt chất lượng & định dạng file (Reviewer)</strong><br>
        Tài khoản thực hiện: <code>nth309@gmail.com</code> (PGS. TS. Nguyễn Thế Hưng - Cán bộ hướng dẫn)<br>
        <em>* Lưu ý nghiệp vụ: Reviewer không thể chỉnh sửa metadata, chỉ đánh giá chất lượng và file đính kèm.</em>
      </div>

      <div class="panel-box">
        <table class="dspace-table">
          <tr><td style="width:130px; font-weight:600;">Tiêu đề:</td><td><strong>${item.title}</strong></td></tr>
          <tr><td style="font-weight:600;">Học viên nộp:</td><td>${item.author} (${item.submitterEmail})</td></tr>
          <tr><td style="font-weight:600;">Tệp PDF:</td><td>📎 ${item.fileName} (${item.fileSize})</td></tr>
          <tr><td style="font-weight:600;">Tóm tắt:</td><td style="font-size:0.82rem;">${item.abstract}</td></tr>
        </table>
      </div>

      <div class="form-group">
        <label class="form-label">Lý do từ chối (bắt buộc nếu chọn Từ chối trả bài về học viên):</label>
        <textarea id="modalRejectionReason" class="form-control" rows="3" placeholder="Nhập lý do chi tiết để học viên chỉnh sửa bản nháp..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn btn-danger" id="btnStep1Reject">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Từ chối (Reject về Bản nháp)
        </button>
        <button class="btn btn-success" id="btnStep1Accept">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Chấp nhận (Accept sang Bước 2)
        </button>
      </div>
    </div>
  `;

  openModal('Kiểm duyệt Bước 1 - Cán bộ Hướng dẫn (Reviewer)', html);

  document.getElementById('btnStep1Accept').addEventListener('click', () => {
    WorkflowState.processReviewer(item.id, 'accept');
    alert('Đã chấp nhận sơ duyệt! Luận văn đã chuyển sang Bước 2 (Chủ tịch Hội đồng biên tập).');
    closeModal();
    renderMainContent();
    renderSidebar();
  });

  document.getElementById('btnStep1Reject').addEventListener('click', () => {
    const reason = document.getElementById('modalRejectionReason').value.trim();
    if (!reason) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }
    WorkflowState.processReviewer(item.id, 'reject', reason);
    alert('Đã từ chối bài nộp! Tài liệu đã quay về trạng thái Bản nháp để học viên chỉnh sửa.');
    closeModal();
    renderMainContent();
    renderSidebar();
  });
}

/**
 * Modal Bước 2: Editor (Chủ tịch Hội đồng / Cán bộ nhận luận văn tổ phục vụ)
 */
function renderStep2Modal(item) {
  const html = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div class="alert alert-info">
        <strong>Bước 2: Kiểm tra & Chuẩn hóa Metadata (Editor)</strong><br>
        Tài khoản thực hiện: <code>hieugalaxya07@gmail.com</code> / <code>BKlib Admin</code><br>
        <em>* Quyền hạn: Kiểm tra và chỉnh sửa Metadata (tiêu đề, tác giả, tóm tắt, từ khóa). Không thể sửa tệp PDF đính kèm.</em>
      </div>

      <div class="panel-box">
        <div class="form-grid">
          <div class="form-group col-full">
            <label class="form-label">Tiêu đề luận văn (dc.title):</label>
            <input type="text" id="edTitle" class="form-control" value="${escapeHtml(item.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">Tác giả (dc.contributor.author):</label>
            <input type="text" id="edAuthor" class="form-control" value="${escapeHtml(item.author)}">
          </div>
          <div class="form-group">
            <label class="form-label">Cán bộ Hướng dẫn:</label>
            <input type="text" id="edAdvisor" class="form-control" value="${escapeHtml(item.advisor)}">
          </div>
          <div class="form-group col-full">
            <label class="form-label">Từ khóa (dc.subject):</label>
            <input type="text" id="edKeywords" class="form-control" value="${escapeHtml(item.keywords || '')}">
          </div>
          <div class="form-group col-full">
            <label class="form-label">Tóm tắt (dc.description.abstract):</label>
            <textarea id="edAbstract" class="form-control" rows="3">${escapeHtml(item.abstract || '')}</textarea>
          </div>
          <div class="form-group col-full">
            <label class="form-label">Tệp PDF đính kèm (Chỉ xem, không được thay thế file):</label>
            <div class="file-preview-bar">
              <span>📎 ${item.fileName} (${item.fileSize})</span>
              <span style="color:#059669; font-weight:600; font-size:0.75rem;">Định dạng PDF hợp lệ</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Lý do từ chối (nếu từ chối trả về học viên):</label>
        <textarea id="modalEditorRejectionReason" class="form-control" rows="2" placeholder="Nhập lý do nếu nội dung hoặc metadata không đạt chuẩn..."></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn btn-danger" id="btnStep2Reject">
          Từ chối (Reject về Bản nháp)
        </button>
        <button class="btn btn-success" id="btnStep2Accept">
          Lưu Metadata & Chấp nhận (Accept sang Bước 3)
        </button>
      </div>
    </div>
  `;

  openModal('Kiểm duyệt Bước 2 - Người biên tập (Editor)', html);

  document.getElementById('btnStep2Accept').addEventListener('click', () => {
    const updatedMeta = {
      title: document.getElementById('edTitle').value.trim(),
      author: document.getElementById('edAuthor').value.trim(),
      advisor: document.getElementById('edAdvisor').value.trim(),
      keywords: document.getElementById('edKeywords').value.trim(),
      abstract: document.getElementById('edAbstract').value.trim()
    };
    WorkflowState.processEditor(item.id, 'accept', updatedMeta);
    alert('Đã chuẩn hóa metadata và Chấp nhận bài nộp! Chuyển sang Bước 3 (Cán bộ Thư viện).');
    closeModal();
    renderMainContent();
    renderSidebar();
  });

  document.getElementById('btnStep2Reject').addEventListener('click', () => {
    const reason = document.getElementById('modalEditorRejectionReason').value.trim();
    if (!reason) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }
    WorkflowState.processEditor(item.id, 'reject', null, reason);
    alert('Đã từ chối bài nộp về bản nháp để học viên hoàn thiện lại!');
    closeModal();
    renderMainContent();
    renderSidebar();
  });
}

/**
 * Modal Bước 3: Final Editor (Cán bộ Thư viện - Tổ Nghiệp vụ)
 * TÍCH HỢP CHỮ KÝ SỐ & DUYỆT XUẤT BẢN (COMMIT TO ARCHIVE)
 */
function renderStep3Modal(item) {
  const html = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div class="alert alert-info">
        <strong>Bước 3: Người gác cổng cuối cùng — Rà soát & Duyệt xuất bản (Final Editor)</strong><br>
        Tài khoản thực hiện: <code>lehoang.13291@gmail.com</code> / <code>BKlib Admin</code> (ThS. Lê Hoàng - Thư viện Bách Khoa)<br>
        <em>* Quy định nghiêm ngặt của DSpace: Final Editor KHÔNG THỂ từ chối bài về cho Submitter ban đầu!</em>
      </div>

      <div class="panel-box">
        <h4 style="color:#003366; font-size:0.9rem; margin-bottom:8px;">Rà soát thông tin trích dẫn lần cuối:</h4>
        <div class="form-grid">
          <div class="form-group col-full">
            <label class="form-label">Tiêu đề hoàn thiện (dc.title):</label>
            <input type="text" id="feTitle" class="form-control" value="${escapeHtml(item.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">Tác giả:</label>
            <input type="text" id="feAuthor" class="form-control" value="${escapeHtml(item.author)}">
          </div>
          <div class="form-group">
            <label class="form-label">Cán bộ Hướng dẫn:</label>
            <input type="text" id="feAdvisor" class="form-control" value="${escapeHtml(item.advisor)}">
          </div>
          <div class="form-group col-full">
            <label class="form-label">Từ khóa DSpace (dc.subject):</label>
            <input type="text" id="feKeywords" class="form-control" value="${escapeHtml(item.keywords || '')}">
          </div>
        </div>
      </div>

      <!-- Khung kích hoạt Ký số điện tử & Tự động sinh Handle -->
      <div class="digital-stamp-container">
        <h4 style="color:#003366; margin-bottom:6px;">🔏 Tích hợp Chữ ký số điện tử & Cấp định danh vĩnh viễn (Handle URL)</h4>
        <p style="font-size:0.82rem; color:#4b5563;">
          Khi nhấn <strong>Duyệt xuất bản (Commit to Archive)</strong>, hệ thống sẽ tự động:
        </p>
        <ul style="font-size:0.82rem; padding-left:18px; color:#1e40af; margin-top:4px;">
          <li>Tính toán hàm băm toàn vẹn SHA-256 từ nội dung luận văn và tệp bitstream.</li>
          <li>Đóng dấu chứng thực số của Thư viện Trường ĐH Bách Khoa (BKlib CA).</li>
          <li>Tự động cấp mã Handle URL vĩnh viễn: <code>https://dspace.tv.hcmut.edu.vn/handle/123456789/[MÃ_MỚI]</code>.</li>
          <li>Tự động gửi email thông báo chính thức đến học viên: <code>nthieu@hcmut.edu.vn</code>.</li>
        </ul>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn btn-outline" onclick="window.closeCurrentModal()">Hủy thao tác</button>
        <button class="btn btn-success" id="btnFinalEditorCommit" style="padding:8px 20px; font-size:0.9rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Ký số & Duyệt xuất bản (Commit to Archive)
        </button>
      </div>
    </div>
  `;

  openModal('Kiểm duyệt Bước 3 - Người biên tập cuối (Final Editor)', html);

  document.getElementById('btnFinalEditorCommit').addEventListener('click', async () => {
    const updatedMeta = {
      title: document.getElementById('feTitle').value.trim(),
      author: document.getElementById('feAuthor').value.trim(),
      advisor: document.getElementById('feAdvisor').value.trim(),
      keywords: document.getElementById('feKeywords').value.trim()
    };

    const res = await WorkflowState.processFinalEditorCommit(item.id, updatedMeta);
    if (res) {
      alert(`ĐÃ DUYỆT XUẤT BẢN THÀNH CÔNG!\n- Đã ký số điện tử Thư viện Bách Khoa.\n- Đã cấp mã định danh: ${res.item.handleUrl}\n- Đã tự động gửi email thông báo tới học viên nthieu@hcmut.edu.vn!`);
      closeModal();
      currentTab = 'public-archive';
      renderMainContent();
      renderSidebar();

      // Tự động mở xem email thông báo
      setTimeout(() => {
        openModal('Email thông báo tự động vừa gửi đến nthieu@hcmut.edu.vn', MailService.renderPhoneEmailModal(res.sentEmail));
      }, 500);
    }
  });
}

/**
 * Modal Sửa Metadata dành cho Admin
 */
function showEditMetadataModal(id) {
  const item = WorkflowState.getSubmissions().find(s => s.id === id);
  if (!item) return;

  const html = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div class="form-group">
        <label class="form-label">Tiêu đề luận văn (dc.title):</label>
        <input type="text" id="admTitle" class="form-control" value="${escapeHtml(item.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tác giả (dc.contributor.author):</label>
        <input type="text" id="admAuthor" class="form-control" value="${escapeHtml(item.author)}">
      </div>
      <div class="form-group">
        <label class="form-label">Cán bộ Hướng dẫn:</label>
        <input type="text" id="admAdvisor" class="form-control" value="${escapeHtml(item.advisor)}">
      </div>
      <div class="form-group">
        <label class="form-label">Từ khóa:</label>
        <input type="text" id="admKeywords" class="form-control" value="${escapeHtml(item.keywords || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Tóm tắt:</label>
        <textarea id="admAbstract" class="form-control" rows="4">${escapeHtml(item.abstract || '')}</textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button class="btn btn-outline" onclick="window.closeCurrentModal()">Hủy</button>
        <button class="btn btn-primary" id="btnAdminSaveMeta">Lưu Metadata</button>
      </div>
    </div>
  `;

  openModal('Chỉnh sửa Metadata (Admin)', html);

  document.getElementById('btnAdminSaveMeta').addEventListener('click', () => {
    item.title = document.getElementById('admTitle').value.trim();
    item.author = document.getElementById('admAuthor').value.trim();
    item.advisor = document.getElementById('admAdvisor').value.trim();
    item.keywords = document.getElementById('admKeywords').value.trim();
    item.abstract = document.getElementById('admAbstract').value.trim();

    const list = WorkflowState.getSubmissions();
    const idx = list.findIndex(s => s.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
      WorkflowState.saveSubmissions(list);
    }
    alert('Đã cập nhật Metadata thành công!');
    closeModal();
    renderMainContent();
  });
}

/**
 * Trợ giúp hiển thị Badge trạng thái
 */
function getStatusBadge(status) {
  switch (status) {
    case 'draft':
      return `<span class="status-badge badge-draft">Bản nháp (Draft)</span>`;
    case 'step1':
      return `<span class="status-badge badge-step1">Bước 1: Chờ CBHD sơ duyệt</span>`;
    case 'step2':
      return `<span class="status-badge badge-step2">Bước 2: Chờ Chủ tịch HĐ duyệt</span>`;
    case 'step3':
      return `<span class="status-badge badge-step3">Bước 3: Chờ Thư viện duyệt & Ký số</span>`;
    case 'archived':
      return `<span class="status-badge badge-archived">Đã công bố (Archived)</span>`;
    default:
      return `<span class="status-badge">${status}</span>`;
  }
}

/**
 * Quản lý Modal chung
 */
function openModal(title, contentHtml) {
  const overlay = document.getElementById('appModalOverlay');
  const titleEl = document.getElementById('appModalTitle');
  const bodyEl = document.getElementById('appModalBody');

  if (!overlay || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = contentHtml;
  overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('appModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

window.closeCurrentModal = closeModal;

function setupEventListeners() {
  document.getElementById('appModalClose')?.addEventListener('click', closeModal);
  document.getElementById('appModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'appModalOverlay') {
      closeModal();
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/**
 * Hiển thị Modal Khóa Công Khai Thư Viện (Công khai cho tất cả người dùng)
 */
function showPublicKeyModal() {
  const info = DigitalSignatureService.getKeypairInfo();
  const html = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div class="alert alert-info" style="margin-bottom:0;">
        <strong>Khóa Công Khai Thư Viện (BKlib Public Key / X.509 Certificate Profile)</strong><br>
        Khóa này được công khai cho tất cả người dùng (Học viên, Cán bộ hướng dẫn, Hội đồng, Thư viện, Quản trị viên) để kiểm tra, đối chiếu và xác thực tính toàn vẹn của file luận văn lưu chiểu.
      </div>

      <div class="panel-box">
        <table class="dspace-table" style="font-size:0.83rem;">
          <tr>
            <td style="width:160px; font-weight:600;">Cơ quan cấp chứng thực:</td>
            <td><strong>${info.issuer}</strong></td>
          </tr>
          <tr>
            <td style="font-weight:600;">Tên trường trên con dấu:</td>
            <td><strong style="color:#003366;">${info.institution}</strong></td>
          </tr>
          <tr>
            <td style="font-weight:600;">Mã định danh khóa:</td>
            <td><code>${info.keyId}</code></td>
          </tr>
          <tr>
            <td style="font-weight:600;">Thuật toán & Tiêu chuẩn:</td>
            <td>${info.algorithm}</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Dấu vân tay (Fingerprint):</td>
            <td><code>${info.fingerprint}</code></td>
          </tr>
          <tr>
            <td style="font-weight:600;">Thời hạn chứng thư:</td>
            <td>${info.validity}</td>
          </tr>
        </table>
      </div>

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="font-size:0.85rem; color:#003366;">Chuỗi Public Key (Định dạng PEM X.509 RSA-2048):</strong>
          <button id="btnCopyPublicKey" class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 10px; background:#eff6ff;">
            📋 Sao chép Public Key
          </button>
        </div>
        <textarea id="txtPublicKey" readonly style="width:100%; height:130px; font-family:monospace; font-size:11px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:8px; resize:none;">${info.publicKey}</textarea>
      </div>
    </div>
  `;

  openModal('Khóa Công Khai Thư Viện (BKlib Public Key)', html);

  document.getElementById('btnCopyPublicKey')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(info.publicKey);
    alert('Đã sao chép Public Key vào bộ nhớ tạm (Clipboard)!');
  });
}
