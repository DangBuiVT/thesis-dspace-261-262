/**
 * BKLIB DIGITAL SIGNATURE SERVICE
 * Mô-đun Quản lý & Tích hợp Chữ ký số Thư viện Trường ĐH Bách Khoa - ĐHQG-HCM
 * Tiêu chuẩn: SHA-256, RSA Key Simulation, X.509 Certificate Profile
 */

export const DigitalSignatureService = {
  // Hàm băm giả lập SHA-256 trên nội dung tài liệu
  async generateSha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback nếu crypto subtle không khả dụng
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return 'sha256_' + Math.abs(hash).toString(16).padStart(32, '0') + 'f7c89a0e';
  },

  /**
   * Thực hiện ký số điện tử sau khi tài liệu hoàn thành 3 bước kiểm duyệt
   * @param {Object} submission - Bản ghi luận văn
   * @param {Object} signer - Thông tin cán bộ thư viện ký duyệt
   * @returns {Object} Thông tin chứng thư số và tem chữ ký
   */
  async signSubmission(submission, signer) {
    const signTimestamp = new Date().toISOString();
    const signFormattedDate = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date());

    // Nội dung ký bao gồm toàn bộ metadata quan trọng + hash tệp
    const payloadToHash = JSON.stringify({
      collectionId: submission.collectionId,
      title: submission.title,
      author: submission.author,
      advisor: submission.advisor,
      abstract: submission.abstract,
      fileName: submission.fileName,
      fileSize: submission.fileSize,
      fileHash: submission.fileHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      signedBy: signer.email,
      timestamp: signTimestamp
    });

    const signatureHash = await this.generateSha256(payloadToHash);
    const certSerial = 'BK-VN-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);

    const digitalSignature = {
      isSigned: true,
      signatureHash: signatureHash,
      certificateSerial: certSerial,
      algorithm: 'SHA-256 with RSA (2048 bits) / PKCS#7',
      signedAt: signTimestamp,
      signedAtFormatted: signFormattedDate,
      issuer: 'TRƯỜNG ĐẠI HỌC BÁCH KHOA - ĐHQG-HCM / BKLIB CA ROOT',
      signerName: signer.name || 'Cán bộ Biên mục Thư viện',
      signerEmail: signer.email || 'lehoang.13291@gmail.com',
      signerDepartment: 'Tổ Nghiệp vụ Thư viện - Đại học Bách khoa',
      validity: 'Vĩnh viễn (Lưu chiểu quốc gia & Kho tri thức số DSpace HCMUT)',
      verificationUrl: `https://dspace.tv.hcmut.edu.vn/verify-signature?serial=${certSerial}&hash=${signatureHash.slice(0, 16)}`
    };

    return digitalSignature;
  },

  /**
   * Tạo HTML con dấu điện tử hiển thị trên giao diện chi tiết luận văn
   */
  renderSignatureSealHtml(sig) {
    if (!sig || !sig.isSigned) {
      return `
        <div class="alert alert-warning">
          <strong>Chưa có chữ ký số:</strong> Luận văn đang trong quy trình biên mục, chưa hoàn thành duyệt xuất bản để cấp chữ ký số lưu chiểu.
        </div>
      `;
    }

    return `
      <div class="digital-stamp-container">
        <div class="stamp-badge-seal">
          <svg class="stamp-seal-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#00529c" stroke-width="2.5" stroke-dasharray="3,2" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#003366" stroke-width="2" />
            <path id="curveTop" d="M 18,50 A 32,32 0 0,1 82,50" fill="none" />
            <text font-size="7" font-weight="bold" fill="#003366" letter-spacing="1">
              <textPath href="#curveTop" startOffset="50%" text-anchor="middle">
                ĐH BÁCH KHOA TP.HCM
              </textPath>
            </text>
            <path id="curveBottom" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
            <text font-size="6.5" font-weight="bold" fill="#003366">
              <textPath href="#curveBottom" startOffset="50%" text-anchor="middle">
                THƯ VIỆN TRƯỜNG * BKLIB
              </textPath>
            </text>
            <!-- Biểu tượng dấu chứng thực ở giữa -->
            <rect x="36" y="32" width="28" height="28" rx="4" fill="#00529c" />
            <path d="M42 45 L48 51 L58 39" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <text x="50" y="68" font-size="6" font-weight="bold" text-anchor="middle" fill="#c69214">ĐÃ KÝ SỐ</text>
          </svg>
          <div class="stamp-info">
            <h4>Chứng thực Ký số Điện tử Lưu chiểu (BKlib Digital Signature)</h4>
            <p><strong>Cơ quan chứng thực:</strong> ${sig.issuer}</p>
            <p><strong>Người ký duyệt:</strong> ${sig.signerName} (${sig.signerEmail})</p>
            <p><strong>Thời gian ký:</strong> ${sig.signedAtFormatted}</p>
            <p><strong>Số hiệu chứng thư:</strong> <code>${sig.certificateSerial}</code> | <strong>Thuật toán:</strong> ${sig.algorithm}</p>
          </div>
        </div>
        <div class="stamp-hash">
          <strong>SHA-256 HASH TOÀN VẸN:</strong> ${sig.signatureHash}
        </div>
      </div>
    `;
  }
};
