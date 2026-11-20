BEGIN;
SELECT pg_advisory_xact_lock(261262003);
CREATE TABLE IF NOT EXISTS portal_schema_migrations (
  key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM portal_schema_migrations WHERE key = '003_submission_form') THEN
    RETURN;
  END IF;

  CREATE TABLE submission_form_sections (
    key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL UNIQUE
  );
  INSERT INTO submission_form_sections (key, title, description, sort_order) VALUES
    ('checklist', 'Submission checklist', 'Người nộp luận văn/luận án thực hiện quy trình sau:
1. Kiểm tra các thành phần luận văn/luận án theo biểu mẫu 10.
2. Điền đầy đủ các thông tin.
3. Đính kèm file PDF.
4. Thư viện tiếp nhận và kiểm tra File — Phản hồi.
ĐẠT: Thông báo cho Học viên/Nghiên cứu sinh nộp bản in và cấp giấy biên nhận đã nộp lưu chiểu.
CHƯA ĐẠT: Người nộp thực hiện chỉnh sửa và nộp lại.
Thư viện chỉ kiểm tra về hình thức trình bày. Tác giả chịu trách nhiệm về bản quyền đối với nội dung luận văn/luận án.', 1),
    ('metadata', 'Thesis information', 'Học viên điền đầy đủ các thông tin sau:', 2);

  ALTER TABLE submission_form_fields
    ADD COLUMN section_key TEXT NOT NULL DEFAULT 'metadata' REFERENCES submission_form_sections(key),
    ADD COLUMN question_number INT,
    ADD COLUMN help_text TEXT NOT NULL DEFAULT '',
    ADD COLUMN validation JSONB NOT NULL DEFAULT '{}'::jsonb;

  ALTER TABLE submission_form_fields DROP CONSTRAINT submission_form_fields_input_type_check;
  ALTER TABLE submission_form_fields ADD CONSTRAINT submission_form_fields_input_type_check
    CHECK (input_type IN ('text', 'textarea', 'select', 'checkboxes', 'year', 'file'));

  UPDATE submission_form_fields SET section_key = 'checklist', question_number = 1, sort_order = 10,
    required = TRUE WHERE field_key = 'email';
  UPDATE submission_form_fields SET question_number = 4, sort_order = 40, input_type = 'textarea' WHERE field_key = 'titleVi';
  UPDATE submission_form_fields SET question_number = 5, sort_order = 50, input_type = 'textarea' WHERE field_key = 'titleEn';
  UPDATE submission_form_fields SET question_number = 6, sort_order = 60, label = 'Author (full name)' WHERE field_key = 'authorIds';
  UPDATE submission_form_fields SET question_number = 7, sort_order = 70, label = 'Advisor 1 (full name only)' WHERE field_key = 'thesisAdvisors';
  UPDATE submission_form_fields SET question_number = 14, sort_order = 140 WHERE field_key = 'major';
  UPDATE submission_form_fields SET question_number = 15, sort_order = 150, label = 'Defense year' WHERE field_key = 'thesisYear';
  UPDATE submission_form_fields SET question_number = 16, sort_order = 160 WHERE field_key = 'archiveFacultyId';
  UPDATE submission_form_fields SET question_number = 17, sort_order = 170,
    help_text = 'Đặt tên file: MSHV-HovaTen.pdf. TÁC GIẢ ĐỒNG Ý CHO THƯ VIỆN SỬ DỤNG LUẬN VĂN ĐỂ PHỤC VỤ BẠN ĐỌC.'
    WHERE field_key = 'thesisFile';

  -- Keep portal routing and DSpace mappings, outside the numbered Google Form questions.
  UPDATE submission_form_fields SET sort_order = 200, label = 'Review assignments' WHERE field_key = 'reviewerIds';
  UPDATE submission_form_fields SET sort_order = 210 WHERE field_key = 'archiveSemesterId';
  UPDATE submission_form_fields SET sort_order = 220 WHERE field_key = 'submissionPeriodId';
  UPDATE submission_form_fields SET required = FALSE, enabled = FALSE, sort_order = sort_order + 300
    WHERE field_key IN ('abstract', 'dateIssued', 'publisher', 'documentType', 'language', 'description');

  INSERT INTO submission_form_fields (
    id, field_key, label, input_type, required, enabled, sort_order, section_key, question_number, options, validation
  ) VALUES
    ('b2000001-0001-4000-8000-000000000002', 'submissionAttempt', 'Submission attempt', 'checkboxes', TRUE, TRUE, 20, 'checklist', 2,
     '[{"value":"1","label":"Lần 1"},{"value":"2","label":"Lần 2"},{"value":"3","label":"Lần 3"}]', '{}'),
    ('b2000001-0001-4000-8000-000000000003', 'components', 'Thesis components', 'checkboxes', TRUE, TRUE, 30, 'checklist', 3,
     '[{"value":"cover","label":"Trang bìa"},{"value":"approval","label":"Trang công trình (yêu cầu: file scan đã ký)"},{"value":"assignment","label":"Nhiệm vụ luận văn (yêu cầu: file scan đã ký)"},{"value":"acknowledgements","label":"Lời cảm ơn (yêu cầu: file scan học viên đã ký)"},{"value":"abstracts","label":"Tóm tắt + Abstract (tách ra 2 trang riêng)"},{"value":"declaration","label":"Lời cam đoan (yêu cầu: file scan học viên đã ký)"},{"value":"contents","label":"Mục lục"},{"value":"lists","label":"Danh mục bảng biểu, hình ảnh, viết tắt... (mỗi danh mục bắt đầu trang mới)"},{"value":"fulltext","label":"Toàn văn luận văn"},{"value":"publications","label":"Danh mục công trình khoa học (nếu có, không có vẫn check)"},{"value":"references","label":"Tài liệu tham khảo"},{"value":"appendices","label":"Phụ lục (nếu có, không có vẫn check)"},{"value":"biography","label":"Lý lịch trích ngang"}]', '{"allOptions":true}'),
    ('b2000001-0001-4000-8000-000000000008', 'advisor2', 'Advisor 2 (full name only)', 'text', FALSE, TRUE, 80, 'metadata', 8, '[]', '{}'),
    ('b2000001-0001-4000-8000-000000000009', 'reviewer1', 'Reviewer 1 (full name only)', 'text', TRUE, TRUE, 90, 'metadata', 9, '[]', '{}'),
    ('b2000001-0001-4000-8000-000000000010', 'reviewer2', 'Reviewer 2 (full name only)', 'text', FALSE, TRUE, 100, 'metadata', 10, '[]', '{}'),
    ('b2000001-0001-4000-8000-000000000011', 'reviewer3', 'Reviewer 3 (full name only)', 'text', FALSE, TRUE, 110, 'metadata', 11, '[]', '{}'),
    ('b2000001-0001-4000-8000-000000000012', 'reviewer4', 'Reviewer 4 (full name only)', 'text', FALSE, TRUE, 120, 'metadata', 12, '[]', '{}'),
    ('b2000001-0001-4000-8000-000000000013', 'reviewer5', 'Reviewer 5 (full name only)', 'text', FALSE, TRUE, 130, 'metadata', 13, '[]', '{}')
    ON CONFLICT (field_key) DO NOTHING;

  INSERT INTO portal_schema_migrations (key) VALUES ('003_submission_form');
END
$migration$;
COMMIT;
