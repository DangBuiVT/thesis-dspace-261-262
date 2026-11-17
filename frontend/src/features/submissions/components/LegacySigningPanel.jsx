import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { thesisStatusColor } from "../model/presentation.js";
import { statusText } from "../../../i18n/labels.js";
import {
  setStoredSignatureStyle,
  setStoredWatermarkPages,
  signatureStyleLabel,
  signatureStyleOptions,
} from "../../../shared/signature.js";
import { useSubmissions } from "../SubmissionContext.jsx";

const { Paragraph, Text } = Typography;

// Sign theses that were archived before PAdES signing existed, in one batch.
export default function LegacySigningPanel() {
  const {
    t,
    legacyBatchList,
    isLoadingLegacyBatch,
    loadLegacyBatchList,
    selectedLegacyKeys,
    setSelectedLegacyKeys,
    batchSigningLoading,
    handleBatchSignLegacy,
    legacyBatchStyle,
    setLegacyBatchStyle,
    legacyBatchPages,
    setLegacyBatchPages,
    setStaffDetailRecord,
    openProtectedSubmissionFile,
    fileOpenLoadingKey,
  } = useSubmissions();

  const columns = [
    {
      title: t("Submission"),
      dataIndex: "title",
      key: "title",
      render: (title, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{title || t("(untitled)")}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {[record.student_id, record.author].filter(Boolean).join(" · ")}
          </Text>
          <div style={{ fontSize: 12 }}>
            {[record.faculty_name, record.semester_name]
              .filter(Boolean)
              .join(" • ")}
          </div>
        </div>
      ),
    },
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => (
        <Tag color={thesisStatusColor(status)}>{statusText(status, t)}</Tag>
      ),
    },
    {
      title: t("Digital signature"),
      key: "is_signed",
      width: 190,
      render: (_, record) =>
        record.is_signed ? (
          <div>
            <Tag color="cyan">{t("Signed")}</Tag>
            <div style={{ fontSize: 12 }}>
              {signatureStyleLabel(record.signature_style, t)}
              {record.watermark_pages
                ? ` · ${t("Watermark pages")}: ${record.watermark_pages}`
                : ""}
            </div>
          </div>
        ) : (
          <Tag>{t("Not signed")}</Tag>
        ),
    },
    {
      title: t("PDF"),
      key: "files",
      width: 200,
      render: (_, record) => {
        const pdf = (record.files || []).find((f) =>
          /\.pdf$/i.test(f.fileName || ""),
        );
        if (!pdf) {
          return <Text type="secondary">{t("No PDF")}</Text>;
        }
        return (
          <Button
            size="small"
            type="link"
            loading={fileOpenLoadingKey === `${record.id}:${pdf.id}`}
            onClick={() => void openProtectedSubmissionFile(record.id, pdf.id)}
          >
            {pdf.fileName.length > 24
              ? `${pdf.fileName.slice(0, 24)}…`
              : pdf.fileName}
          </Button>
        );
      },
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 110,
      render: (_, record) => (
        <Button size="small" onClick={() => setStaffDetailRecord(record)}>
          {t("Detail")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Sign several existing theses at once. Each one is stamped, signed (PAdES) and time-stamped, then kept as a fixed signed copy.",
        )}
      </Paragraph>
      <Card
        size="small"
        title={t("Batch signing settings")}
        style={{ marginBottom: 14 }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={7}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              {t("Signature style")}
            </Text>
            <Select
              style={{ width: "100%" }}
              value={legacyBatchStyle}
              onChange={(value) => {
                setLegacyBatchStyle(value);
                setStoredSignatureStyle(value);
              }}
              options={signatureStyleOptions(t)}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              {t("Watermark pages")}
            </Text>
            <Input
              placeholder="10 / 10, 15 / 10-12"
              value={legacyBatchPages}
              onChange={(event) => {
                setLegacyBatchPages(event.target.value);
                setStoredWatermarkPages(event.target.value);
              }}
            />
          </Col>
          <Col xs={24} md={9} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button
                onClick={() => loadLegacyBatchList()}
                loading={isLoadingLegacyBatch}
              >
                {t("Refresh")}
              </Button>
              <Button
                type="primary"
                disabled={selectedLegacyKeys.length === 0}
                loading={batchSigningLoading}
                onClick={() => void handleBatchSignLegacy()}
              >
                {t("Sign selected ({{count}})", {
                  count: selectedLegacyKeys.length,
                })}
              </Button>
            </Space>
          </Col>
        </Row>
        <Paragraph type="secondary" style={{ fontSize: 12, margin: "8px 0 0" }}>
          {t(
            "If a PDF has fewer pages than the configured watermark pages, those pages are skipped and reported as a warning.",
          )}
        </Paragraph>
      </Card>
      <Table
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedLegacyKeys,
          onChange: (keys) => setSelectedLegacyKeys(keys),
        }}
        dataSource={legacyBatchList}
        loading={isLoadingLegacyBatch}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        columns={columns}
      />
    </>
  );
}
