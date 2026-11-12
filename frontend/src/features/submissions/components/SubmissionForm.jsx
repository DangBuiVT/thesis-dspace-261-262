import ThesisMetadataFields from "./ThesisMetadataFields";

import { Form, Input, Select, Divider } from "antd";
import { formatDate } from "../../../i18n/labels.js";
import { personOptionFilter } from "../model/people.js";

import { useSubmissions } from "../SubmissionContext.jsx";

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
    isLoadingArchivePeriods,
    archiveSemesterId,
    handleSubmissionPeriodChange,
    archivePeriods,
    lang,
    isFormReadOnly,
    isLoadingStudents,
    studentOptions,
    handleAdminAuthorsChange,
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
            disabled
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
      {showNative("archiveSemesterId") ? (
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
      {showNative("submissionPeriodId") ? (
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
            options={archivePeriods.map((p) => ({
              value: p.id,
              label: p.closesAt
                ? t("{{name}} (closes {{date}})", {
                    name: p.name,
                    date: formatDate(p.closesAt, lang),
                  })
                : p.name,
            }))}
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
