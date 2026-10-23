/**
 * BKLIB THESIS WORKFLOW STATE MANAGEMENT
 * Quản lý Bộ sưu tập, Phân quyền DSpace, Danh sách bài nộp và chuyển trạng thái
 */

import { DigitalSignatureService } from './digitalSign.js';
import { MailService } from './mailService.js';

export const DSPACE_COLLECTION = {
  id: '99c8f87a-a3a8-45bb-9ee7-1992d0ece528',
  name: 'Bài luận văn Thạc sĩ',
  community: 'Khoa Khoa học và Kỹ thuật Máy tính - ĐH Bách Khoa',
  handlePrefix: '123456789',
  description: 'Kho lưu chiểu luận văn Thạc sĩ chính thức của Trường Đại học Bách khoa - ĐHQG-HCM'
};

// Cấu hình tài khoản và nhóm phân quyền theo chuẩn DSpace Collection Roles
export const USER_ROLES = {
  ADMIN: {
    id: 'admin',
    name: 'BKlib Admin',
    email: 'admin@bklib.hcmut.edu.vn',
    display: 'BKlib Admin (Quản trị viên bộ sưu tập)',
    dspaceGroup: 'COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_ADMIN',
    roleTitle: 'Quản trị viên Bộ sưu tập (Admin)',
    description: 'Toàn quyền cấu hình bộ sưu tập, phân quyền tài khoản, chỉnh sửa thông tin và xuất bản.'
  },
  SUBMITTER: {
    id: 'submitter',
    name: 'Nguyễn Trung Hiếu (Học viên)',
    email: 'nthieu@hcmut.edu.vn',
    display: 'nthieu@hcmut.edu.vn (Học viên nộp bài)',
    dspaceGroup: 'COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_SUBMIT',
    roleTitle: 'Người nộp bài (Submitter)',
    description: 'Nhập thông tin mô tả, tải file PDF và nộp bài. Chỉnh sửa bản nháp khi bị trả về.'
  },
  REVIEWER: {
    id: 'reviewer',
    name: 'PGS. TS. Nguyễn Thế Hưng (CB Hướng dẫn)',
    email: 'nth309@gmail.com',
    display: 'nth309@gmail.com (Reviewer - CBHD)',
    dspaceGroup: 'COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_WORKFLOW_ROLE_reviewer',
    roleTitle: 'Người kiểm duyệt (Bước 1 - Reviewer)',
    description: 'Lớp phòng thủ đầu tiên: Sơ duyệt chất lượng và định dạng file. Accept sang Bước 2 / Reject về Bản nháp. Không sửa metadata.'
  },
  EDITOR: {
    id: 'editor',
    name: 'GS. TS. Trần Văn Hiếu (Chủ tịch Hội đồng)',
    email: 'hieugalaxya07@gmail.com',
    display: 'hieugalaxya07@gmail.com (Editor - Chủ tịch HĐ)',
    dspaceGroup: 'COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_WORKFLOW_ROLE_editor',
    roleTitle: 'Người biên tập (Bước 2 - Editor)',
    description: 'Kiểm tra và chuẩn hóa metadata. Có quyền sửa Metadata. Accept sang Bước 3 / Reject về Bản nháp. Không sửa PDF.'
  },
  FINAL_EDITOR: {
    id: 'final_editor',
    name: 'ThS. Lê Hoàng (Cán bộ Thư viện)',
    email: 'lehoang.13291@gmail.com',
    display: 'lehoang.13291@gmail.com (Final Editor - Thủ thư)',
    dspaceGroup: 'COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_WORKFLOW_ROLE_finaleditor',
    roleTitle: 'Người biên tập cuối (Bước 3 - Final Editor)',
    description: 'Người gác cổng cuối cùng: Rà soát pháp lý, bản quyền, chuẩn hóa DSpace, ký số điện tử & Commit to Archive. Không thể từ chối về Submitter ban đầu.'
  }
};

const STORAGE_SUBMISSIONS_KEY = 'bklib_submissions_v2';
const STORAGE_CURRENT_USER_KEY = 'bklib_current_user_v2';

export const WorkflowState = {
  // Trả về tài khoản đang đăng nhập hiện tại
  getCurrentUser() {
    const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (saved && USER_ROLES[saved]) {
      return USER_ROLES[saved];
    }
    return USER_ROLES.SUBMITTER; // Mặc định là học viên
  },

  setCurrentUser(roleKey) {
    if (USER_ROLES[roleKey]) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, roleKey);
    }
  },

  // Lấy danh sách luận văn
  getSubmissions() {
    try {
      const data = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Lỗi nạp submissions:', e);
    }
    // Dữ liệu mẫu chuẩn mực ban đầu
    const initial = this.getDefaultSubmissions();
    this.saveSubmissions(initial);
    return initial;
  },

  saveSubmissions(submissions) {
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
  },

  resetDefaultData() {
    const initial = this.getDefaultSubmissions();
    this.saveSubmissions(initial);
    localStorage.removeItem('bklib_thesis_mailbox');
    return initial;
  },

  getDefaultSubmissions() {
    return [
      {
        id: 'sub_001',
        collectionId: DSPACE_COLLECTION.id,
        title: 'Quy trình chuyển luận văn và tích hợp kiểm duyệt đa cấp trên nền tảng DSpace',
        author: 'Nguyễn Trung Hiếu',
        submitterEmail: 'nthieu@hcmut.edu.vn',
        studentId: '2170123',
        advisor: 'PGS. TS. Nguyễn Thế Hưng',
        advisorEmail: 'nth309@gmail.com',
        major: 'Khoa học Máy tính',
        degree: 'Thạc sĩ Khoa học Kỹ thuật',
        defenseYear: '2026',
        abstract: 'Nghiên cứu kiến trúc phân quyền và tự động hóa quy trình nộp, thẩm định 3 bước độc lập đối với luận văn sau đại học. Ứng dụng công nghệ chữ ký số điện tử và định danh Handle vĩnh viễn nhằm đảm bảo tính toàn vẹn và bản quyền tài liệu khoa học tại Trường Đại học Bách khoa - ĐHQG-HCM.',
        keywords: 'DSpace; Luận văn Thạc sĩ; Chữ ký số; Quy trình nộp lưu chiểu; Đại học Bách khoa',
        fileName: 'LuanVan_ThacSi_NguyenTrungHieu_2170123.pdf',
        fileSize: '4.8 MB',
        fileHash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b8c7d6e5f4a3b2c1d0e9f8a7b',
        uploadedAt: '2026-10-10 09:30:00',
        status: 'archived', // Đã duyệt mẫu
        currentStep: 4,
        handleId: '123456789/8811',
        handleUrl: 'https://dspace.tv.hcmut.edu.vn/handle/123456789/8811',
        history: [
          {
            step: 'Draft',
            action: 'Tạo bản nháp và tải tệp PDF',
            by: 'nthieu@hcmut.edu.vn',
            time: '2026-10-10 09:30:00'
          },
          {
            step: 'Nộp bài',
            action: 'Chuyển bài sang Bước 1 (Sơ duyệt CBHD)',
            by: 'nthieu@hcmut.edu.vn',
            time: '2026-10-10 09:45:00'
          },
          {
            step: 'Bước 1: Reviewer',
            action: 'Chấp nhận (Accept) - Đạt yêu cầu sơ bộ & tệp hợp lệ',
            by: 'nth309@gmail.com (PGS. TS. Nguyễn Thế Hưng)',
            time: '2026-10-11 14:15:00'
          },
          {
            step: 'Bước 2: Editor',
            action: 'Chuẩn hóa Metadata và Chấp nhận (Accept)',
            by: 'hieugalaxya07@gmail.com (GS. TS. Trần Văn Hiếu)',
            time: '2026-10-12 10:20:00'
          },
          {
            step: 'Bước 3: Final Editor',
            action: 'Ký số điện tử & Duyệt xuất bản (Commit to Archive)',
            by: 'lehoang.13291@gmail.com (ThS. Lê Hoàng - Thư viện)',
            time: '2026-10-14 16:00:00'
          }
        ],
        digitalSignature: {
          isSigned: true,
          signatureHash: 'e7a1b490f23cd8192a54b68e9102c7f5491a62d083bc9571fa08d27341ea2bc1',
          certificateSerial: 'BK-VN-2026-08811',
          algorithm: 'SHA-256 with RSA (2048 bits)',
          signedAt: '2026-10-14T16:00:00.000Z',
          signedAtFormatted: 'Thứ Tư, ngày 14 tháng 10 năm 2026, 16:00:00',
          issuer: 'TRƯỜNG ĐẠI HỌC BÁCH KHOA - ĐHQG-HCM / BKLIB CA ROOT',
          signerName: 'ThS. Lê Hoàng',
          signerEmail: 'lehoang.13291@gmail.com',
          signerDepartment: 'Tổ Nghiệp vụ Thư viện',
          validity: 'Vĩnh viễn'
        }
      },
      {
        id: 'sub_002',
        collectionId: DSPACE_COLLECTION.id,
        title: 'Phát triển mô hình bảo mật dữ liệu phân tán trong điện toán đám mây thế hệ mới',
        author: 'Nguyễn Trung Hiếu',
        submitterEmail: 'nthieu@hcmut.edu.vn',
        studentId: '2170123',
        advisor: 'PGS. TS. Nguyễn Thế Hưng',
        advisorEmail: 'nth309@gmail.com',
        major: 'Kỹ thuật Phần mềm',
        degree: 'Thạc sĩ Kỹ thuật',
        defenseYear: '2026',
        abstract: 'Đề tài đề xuất giải pháp mã hóa đồng hình và bảo vệ dữ liệu phi tập trung dành cho các hệ thống ứng dụng ngân hàng và tài chính.',
        keywords: 'Bảo mật đám mây; Mã hóa dữ liệu; Distributed System; HCMUT',
        fileName: 'BaoMatDuLieu_DamMay_HCMUT.pdf',
        fileSize: '3.2 MB',
        fileHash: '4f5e6d7c8b9a0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
        uploadedAt: '2026-10-15 08:20:00',
        status: 'step1', // Đang ở Bước 1 chờ Reviewer
        currentStep: 1,
        history: [
          {
            step: 'Draft',
            action: 'Tạo bản nháp',
            by: 'nthieu@hcmut.edu.vn',
            time: '2026-10-15 08:00:00'
          },
          {
            step: 'Nộp bài',
            action: 'Học viên nộp bài chính thức vào bộ sưu tập',
            by: 'nthieu@hcmut.edu.vn',
            time: '2026-10-15 08:20:00'
          }
        ]
      }
    ];
  },

  // 1. Tạo hoặc Lưu nháp (Submitter)
  saveDraft(data, isNew = false) {
    const list = this.getSubmissions();
    const nowStr = new Date().toLocaleString('vi-VN');
    if (isNew) {
      const newSub = {
        id: 'sub_' + Date.now(),
        collectionId: DSPACE_COLLECTION.id,
        title: data.title || 'Bản nháp luận văn chưa đặt tên',
        author: data.author || 'Nguyễn Trung Hiếu',
        submitterEmail: 'nthieu@hcmut.edu.vn',
        studentId: data.studentId || '2170123',
        advisor: data.advisor || 'PGS. TS. Nguyễn Thế Hưng',
        advisorEmail: data.advisorEmail || 'nth309@gmail.com',
        major: data.major || 'Khoa học Máy tính',
        degree: data.degree || 'Thạc sĩ Khoa học Kỹ thuật',
        defenseYear: data.defenseYear || '2026',
        abstract: data.abstract || '',
        keywords: data.keywords || '',
        fileName: data.fileName || 'Chua_dinh_kem.pdf',
        fileSize: data.fileSize || '0 KB',
        fileHash: 'c4ca4238a0b923820dcc509a6f75849b',
        uploadedAt: nowStr,
        status: 'draft',
        currentStep: 0,
        history: [
          {
            step: 'Draft',
            action: 'Tạo bản nháp mới',
            by: 'nthieu@hcmut.edu.vn',
            time: nowStr
          }
        ]
      };
      list.unshift(newSub);
      this.saveSubmissions(list);
      return newSub;
    } else {
      const idx = list.findIndex(s => s.id === data.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, status: 'draft' };
        list[idx].history.push({
          step: 'Draft',
          action: 'Chỉnh sửa và cập nhật bản nháp',
          by: 'nthieu@hcmut.edu.vn',
          time: nowStr
        });
        this.saveSubmissions(list);
        return list[idx];
      }
    }
  },

  // 2. Học viên Nộp bài chính thức -> Chuyển sang Bước 1 (Reviewer)
  submitOfficial(id) {
    const list = this.getSubmissions();
    const item = list.find(s => s.id === id);
    if (!item) return false;

    if (!item.fileName || item.fileName === 'Chua_dinh_kem.pdf') {
      throw new Error('Vui lòng đính kèm tệp PDF luận văn trước khi nộp!');
    }

    item.status = 'step1';
    item.currentStep = 1;
    item.rejectionReason = null;
    item.history.push({
      step: 'Bước 1: Reviewer',
      action: 'Nộp bài thành công - Chờ Cán bộ hướng dẫn sơ duyệt',
      by: 'nthieu@hcmut.edu.vn',
      time: new Date().toLocaleString('vi-VN')
    });

    this.saveSubmissions(list);
    return item;
  },

  // 3. Bước 1: Người kiểm duyệt (Reviewer) xử lý
  processReviewer(id, action, reason = '') {
    const list = this.getSubmissions();
    const item = list.find(s => s.id === id);
    if (!item) return false;

    const nowStr = new Date().toLocaleString('vi-VN');
    if (action === 'accept') {
      item.status = 'step2';
      item.currentStep = 2;
      item.history.push({
        step: 'Bước 1: Reviewer',
        action: 'Chấp nhận (Accept) - Đạt yêu cầu sơ bộ, chuyển sang Bước 2 (Chủ tịch HĐ)',
        by: 'nth309@gmail.com',
        time: nowStr
      });
    } else if (action === 'reject') {
      item.status = 'draft';
      item.currentStep = 0;
      item.rejectionReason = reason || 'File tệp chưa đúng định dạng hoặc thiếu trang bìa chuẩn mẫu.';
      item.history.push({
        step: 'Bước 1: Reviewer',
        action: `Từ chối (Reject) về bản nháp. Lý do: ${item.rejectionReason}`,
        by: 'nth309@gmail.com',
        time: nowStr
      });
    }
    this.saveSubmissions(list);
    return item;
  },

  // 4. Bước 2: Người biên tập (Editor) xử lý
  processEditor(id, action, updatedMetadata = null, reason = '') {
    const list = this.getSubmissions();
    const item = list.find(s => s.id === id);
    if (!item) return false;

    const nowStr = new Date().toLocaleString('vi-VN');

    // Cập nhật metadata nếu có
    if (updatedMetadata) {
      if (updatedMetadata.title) item.title = updatedMetadata.title;
      if (updatedMetadata.author) item.author = updatedMetadata.author;
      if (updatedMetadata.advisor) item.advisor = updatedMetadata.advisor;
      if (updatedMetadata.abstract) item.abstract = updatedMetadata.abstract;
      if (updatedMetadata.keywords) item.keywords = updatedMetadata.keywords;
    }

    if (action === 'accept') {
      item.status = 'step3';
      item.currentStep = 3;
      item.history.push({
        step: 'Bước 2: Editor',
        action: 'Chuẩn hóa Metadata và Chấp nhận (Accept) - Chuyển sang Bước 3 (Cán bộ Thư viện)',
        by: 'hieugalaxya07@gmail.com',
        time: nowStr
      });
    } else if (action === 'reject') {
      item.status = 'draft';
      item.currentStep = 0;
      item.rejectionReason = reason || 'Thông tin trích dẫn và phần tóm tắt chưa đạt chuẩn khoa học.';
      item.history.push({
        step: 'Bước 2: Editor',
        action: `Từ chối (Reject) về bản nháp. Lý do: ${item.rejectionReason}`,
        by: 'hieugalaxya07@gmail.com',
        time: nowStr
      });
    }
    this.saveSubmissions(list);
    return item;
  },

  // 5. Bước 3: Người biên tập cuối (Final Editor) Duyệt xuất bản & Ký số
  async processFinalEditorCommit(id, updatedMetadata = null) {
    const list = this.getSubmissions();
    const item = list.find(s => s.id === id);
    if (!item) return false;

    // Cập nhật metadata nếu Final Editor có chỉnh sửa
    if (updatedMetadata) {
      if (updatedMetadata.title) item.title = updatedMetadata.title;
      if (updatedMetadata.author) item.author = updatedMetadata.author;
      if (updatedMetadata.advisor) item.advisor = updatedMetadata.advisor;
      if (updatedMetadata.abstract) item.abstract = updatedMetadata.abstract;
      if (updatedMetadata.keywords) item.keywords = updatedMetadata.keywords;
    }

    const nowStr = new Date().toLocaleString('vi-VN');

    // Tích hợp chữ ký số điện tử của Thư viện
    const signature = await DigitalSignatureService.signSubmission(item, {
      name: 'ThS. Lê Hoàng',
      email: 'lehoang.13291@gmail.com',
      department: 'Tổ Nghiệp vụ Thư viện Bách Khoa'
    });
    item.digitalSignature = signature;

    // Tự động sinh mã Handle ID vĩnh viễn trên DSpace
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    item.handleId = `123456789/${randomSuffix}`;
    item.handleUrl = `https://dspace.tv.hcmut.edu.vn/handle/${item.handleId}`;
    item.status = 'archived';
    item.currentStep = 4;

    item.history.push({
      step: 'Bước 3: Final Editor',
      action: `Chứng thực Ký số điện tử & Duyệt xuất bản (Commit to Archive). Handle: ${item.handleUrl}`,
      by: 'lehoang.13291@gmail.com (BKlib Admin / Final Editor)',
      time: nowStr
    });

    this.saveSubmissions(list);

    // Tự động gửi Email thông báo tới học viên nthieu@hcmut.edu.vn
    const sentEmail = MailService.sendArchiveSuccessEmail(item);

    return { item, sentEmail };
  }
};
