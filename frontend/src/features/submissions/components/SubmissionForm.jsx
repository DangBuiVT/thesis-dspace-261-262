import ThesisMetadataFields from "./ThesisMetadataFields";

import {
  Alert,
  Card,
  Form,
  Input,
  Select,
  Divider,
  Space,
  Switch,
  Typography,
} from "antd";
import { formatDate } from "../../../i18n/labels.js";
import { personOptionFilter } from "../model/people.js";

import { useSubmissions } from "../SubmissionContext.jsx";

const { Paragraph } = Typography;

export default function SubmissionForm() {
  const {
    isAdminActor,
    t,
    submissionForm,
    showNative,
    structuralRequired,
    isLoadingArchiveFaculties,
    facultySelectOptions,
    renderAlternateField,
    isLoadingArchiveSemesters,
    archiveSemesters,
    archiveFacultyId,
    canChangeSubmissionPeriod,
    handleArchiveSemesterChange,
    handleAdminFacultyChange,
    isLoadingArchivePeriods,
    archiveSemesterId,
    handleSubmissionPeriodChange,
    archivePeriods,
    lang,
    isFormReadOnly,
    isLoadingStudents,
    studentOptions,
    handleAdminAuthorsChange,
    isOtherFaculty,
    noReviewStepsSelected,
    workflowStepFields,
  } = useSubmissions();
  return (
    <Form layout="vertical" form={submissionForm} autoComplete="off">
      {isAdminActor ? (
        <Form.Item name="studentId" hidden>
          <Input />
        </Form.Item>
      ) : null}
      {showNative("archiveFacultyId") ? (
        <Form.Item
          label={t("Faculty")}
          name="archiveFacultyId"
          extra={
            isAdminActor
              ? t(
                  "The faculty applies to this submission only; the student's profile keeps its faculty.",
                )
              : undefined
          }
          rules={
            structuralRequired("archiveFacultyId")
              ? [
                  {
                    required: true,
                    message: t("This student is not assigned to a faculty"),
                  },
                ]
              : []
          }
        >
          <Select
            placeholder={t("Student faculty")}
            loading={isLoadingArchiveFaculties}
            options={facultySelectOptions}
            disabled={!isAdminActor}
            showSearch={isAdminActor}
            optionFilterProp="label"
            onChange={
              isAdminActor
                ? (value) => void handleAdminFacultyChange(value)
                : undefined
            }
            notFoundContent={
              isLoadingArchiveFaculties
                ? t("Loading...")
                : t("No faculty assigned")
            }
          />
        </Form.Item>
      ) : (
        renderAlternateField("archiveFacultyId")
      )}
      {isOtherFaculty ? (
        <Form.Item
          label={t("Faculty name")}
          name="facultyOtherName"
          extra={t(
            "Not linked to a DSpace collection: choose the collection manually when pushing to DSpace.",
          )}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t("Please enter the faculty name"),
            },
          ]}
        >
          <Input placeholder={t("Enter the faculty name")} />
        </Form.Item>
      ) : null}
      {isOtherFaculty ? null : showNative("archiveSemesterId") ? (
        <Form.Item
          label={t("Semester")}
          name="archiveSemesterId"
          rules={
            structuralRequired("archiveSemesterId")
              ? [
                  {
                    required: true,
                    message: t("Please select a semester"),
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            allowClear
            placeholder={t("Select semester")}
            optionFilterProp="label"
            loading={isLoadingArchiveSemesters}
            options={archiveSemesters}
            disabled={!archiveFacultyId || !canChangeSubmissionPeriod}
            onChange={(value) => void handleArchiveSemesterChange(value)}
            notFoundContent={
              isLoadingArchiveSemesters
                ? t("Loading...")
                : t("Select a faculty first")
            }
          />
        </Form.Item>
      ) : (
        renderAlternateField("archiveSemesterId")
      )}
      {isOtherFaculty ? null : showNative("submissionPeriodId") ? (
        <Form.Item
          label={t("Submission period")}
          name="submissionPeriodId"
          rules={
            structuralRequired("submissionPeriodId")
              ? [
                  {
                    required: true,
                    message: t("Please select a submission period"),
                  },
                ]
              : []
          }
        >
          <Select
            showSearch
            allowClear
            placeholder={t("Select open submission period")}
            optionFilterProp="label"
            loading={isLoadingArchivePeriods}
            disabled={!archiveSemesterId || !canChangeSubmissionPeriod}
            onChange={handleSubmissionPeriodChange}
            options={archivePeriods.map((p) => {
              const base = p.closesAt
                ? t("{{name}} (closes {{date}})", {
                    name: p.name,
                    date: formatDate(p.closesAt, lang),
                  })
                : p.name;
              // Administrators also see closed or hidden periods, clearly marked.
              return {
                value: p.id,
                label:
                  isAdminActor && p.isOpen === false
                    ? `${base} — ${t("closed / hidden")}`
                    : base,
              };
            })}
            notFoundContent={
              isLoadingArchivePeriods
                ? t("Loading...")
                : t("No open periods for this semester")
            }
          />
        </Form.Item>
      ) : (
        renderAlternateField("submissionPeriodId")
      )}

      {isAdminActor ? (
        <Card
          size="small"
          title={t("Review steps for this submission")}
          style={{ marginBottom: 16 }}
        >
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
            {t(
              "Turn off a step to skip it. With every step off, the thesis is archived and digitally signed immediately.",
            )}
          </Paragraph>
          <Space wrap size="large">
            {workflowStepFields.map((step) => (
              <Form.Item
                key={step.name}
                name={step.name}
                valuePropName="checked"
                initialValue
                noStyle
              >
                <Switch
                  checkedChildren={t(step.label)}
                  unCheckedChildren={t(step.label)}
                />
              </Form.Item>
            ))}
          </Space>
          {noReviewStepsSelected ? (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message={t(
                "No review: the thesis will be archived and signed as soon as it is submitted.",
              )}
            />
          ) : null}
        </Card>
      ) : null}

      <Divider style={{ margin: "8px 0" }} />
      {isAdminActor && showNative("authorIds") ? (
        <Form.Item
          label={t("Authors")}
          name="authorIds"
          extra={t(
            "Search by student name or username. Not filled with the admin account.",
          )}
          rules={
            structuralRequired("authorIds")
              ? [
                  {
                    required: true,
                    message: t(
                      "Please search and select at least one student author",
                    ),
                  },
                ]
              : []
          }
        >
          <Select
            mode="multiple"
            showSearch
            allowClear
            disabled={isFormReadOnly}
            placeholder={t("Search by name or username")}
            filterOption={personOptionFilter}
            loading={isLoadingStudents}
            options={studentOptions}
            maxTagCount="responsive"
            onChange={handleAdminAuthorsChange}
            notFoundContent={
              isLoadingStudents ? t("Loading...") : t("No students found")
            }
          />
        </Form.Item>
      ) : isAdminActor ? (
        renderAlternateField("authorIds")
      ) : null}
      <ThesisMetadataFields />
    </Form>
  );
}
