/**
 * BKLIB DSPACE EMAIL NOTIFICATION SERVICE
 * Dịch vụ thông báo email tự động khi Luận văn được Commit to Archive
 */

export const MailService = {
  STORAGE_KEY: 'bklib_thesis_mailbox',

  /**
   * Lấy danh sách hộp thư từ localStorage
   */
  getInbox() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Lỗi đọc hộp thư:', e);
      return [];
    }
  },

  /**
   * Gửi email tự động khi đồ án hoàn tất duyệt xuất bản
   * @param {Object} submission - Bản ghi luận văn vừa được Archive
   * @returns {Object} Email object đã gửi
   */
  sendArchiveSuccessEmail(submission) {
    const handleId = submission.handleId || '123456789/8811';
    const handleUrl = `https://dspace.tv.hcmut.edu.vn/handle/${handleId}`;
    const studentEmail = submission.submitterEmail || 'nthieu@hcmut.edu.vn';

    const emailItem = {
      id: 'mail_' + Date.now(),
      recipient: studentEmail,
      sender: 'Nhóm DSpace tại HCMUT <dspace@tv.hcmut.edu.vn>',
      subject: 'Quy trình chuyển luận văn - Bài nộp đã được chấp nhận',
      submissionTitle: submission.title,
      collectionName: 'Bài luận văn Thạc sĩ',
      handleId: handleId,
      handleUrl: handleUrl,
      sentAt: new Date().toISOString(),
      sentAtFormatted: new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(new Date()),
      body: `Bạn đã gửi: ${submission.title}

Về bộ sưu tập: Bài luận văn Thạc sĩ

Bài nộp của bạn đã được chấp nhận và lưu trữ trong DSpace tại HCMUT.
và nó đã được gán mã định danh sau:
${handleUrl}

Vui lòng sử dụng mã định danh này khi trích dẫn bài nộp của bạn.

Cảm ơn rất nhiều!

Nhóm DSpace tại HCMUT`
    };

    // Lưu vào localStorage
    const inbox = this.getInbox();
    inbox.unshift(emailItem);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(inbox));

    return emailItem;
  },

  /**
   * Render giao diện mô phỏng Email trên màn hình điện thoại (khớp với ảnh người dùng cung cấp)
   */
  renderPhoneEmailModal(email) {
    return `
      <div class="email-phone-frame">
        <div class="phone-header">
          <span>&larr; Hộp thư đến (Gmail)</span>
          <span>${email.sentAtFormatted}</span>
        </div>
        <div class="email-content-view">
          <div class="email-translate-banner">
            <div style="font-size: 1.2rem;">🌐</div>
            <div>
              <div class="title">Đã dịch: Tiếng Anh &rarr; Tiếng Việt</div>
              <div class="sub">Tính năng dịch có thể mắc sai sót, vì vậy, hãy kiểm tra bản dịch. <u>Hiển thị bản gốc</u></div>
            </div>
          </div>

          <div class="email-body-text">
Bạn đã gửi: <strong>${email.submissionTitle}</strong>

Về bộ sưu tập: <strong>${email.collectionName}</strong>

Bài nộp của bạn đã được chấp nhận và lưu trữ trong DSpace tại HCMUT.
và nó đã được gán mã định danh sau:
<a href="${email.handleUrl}" target="_blank" id="mailHandleLink">${email.handleUrl}</a>

Vui lòng sử dụng mã định danh này khi trích dẫn bài nộp của bạn.

Cảm ơn rất nhiều!

<strong>Nhóm DSpace tại HCMUT</strong>
          </div>

          <div class="email-action-bar">
            <button class="email-pill-btn">&larr; Trả lời</button>
            <button class="email-pill-btn">&rarr; Chuyển tiếp</button>
            <button class="email-pill-btn">😊</button>
          </div>
        </div>
      </div>
    `;
  }
};
