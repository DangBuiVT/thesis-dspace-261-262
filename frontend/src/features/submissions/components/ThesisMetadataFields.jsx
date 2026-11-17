import SubmissionFormActions from "./SubmissionFormActions";
import ThesisFileField from "./ThesisFileField";
import AdditionalMetadataFields from "./AdditionalMetadataFields";

import { Form, Input, Select } from "antd";

import { personOptionFilter } from "../model/people.js";
import { THESIS_YEAR_OPTIONS } from "../model/formConfig.js";

import { useSubmissions } from "../SubmissionContext.jsx";

export default function ThesisMetadataFields() {
  const {
    isAdminActor,
    t,
    submissionForm,
    showNative,
    structuralRequired,
    renderAlternateField,
    isFormReadOnly,
    isLoadingStudents,
    studentOptions,
    isLoadingReviewers,
    reviewerOptions,
    reviewerStepOff,
  } = useSubmissions();
  return (
    <fieldset
      disabled={isFormReadOnly}
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
    >
      {showNative("email") ? (
        <Form.Item label={t("Email")} name="email">
          <Input disabled placeholder="username@hcmut.edu.vn" />
        </Form.Item>
      ) : (
        renderAlternateField("email")
      )}
      {showNative("titleVi") ? (
        <Form.Item
          label={t("Thesis title (Vietnamese)")}
          name="titleVi"
          rules={
            structuralRequired("titleVi")
              ? [
                  {
                    required: true,
                    message: t("Vietnamese title is required"),
                  },
                ]
              : []
          }
        >
          <Input placeholder={t("Tên luận văn / luận án (tiếng Việt)")} />
        </Form.Item>
      ) : (
        renderAlternateField("titleVi")
      )}
      {showNative("titleEn") ? (
        <Form.Item
          label={t("Thesis title (English)")}
          name="titleEn"
          rules={
            structuralRequired("titleEn")
              ? [
                  {
                    required: true,
                    message: t("English title is required"),
                  },
                ]
              : []
          }
        >
          <Input placeholder={t("Thesis title in English")} />
        </Form.Item>
      ) : (
        renderAlternateField("titleEn")
      )}
      {showNative("thesisAdvisors") ? (
        <Form.Item
          label={t("Advisor(s)")}
          name="thesisAdvisors"
          rules={
            structuralRequired("thesisAdvisors")
              ? [
                  {
                    required: true,
                    message: t("Advisor(s) is required"),
                  },
                ]
              : []
          }
        >
          <Input
            placeholder={t("e.g. Assoc. Prof. Nguyen Van A; Dr. Tran Van B")}
          />
        </Form.Item>
      ) : (
        renderAlternateField("thesisAdvisors")
      )}
      {showNative("major") ? (
        <Form.Item
          label={t("Major")}
          name="major"
          rules={
            structuralRequired("major")
              ? [{ required: true, message: t("Major is required") }]
              : []
          }
        >
          <Input placeholder={t("e.g. Computer Science")} />
        </Form.Item>
      ) : (
        renderAlternateField("major")
      )}
      {showNative("thesisYear") ? (
        <Form.Item
          label={t("Year")}
          name="thesisYear"
          rules={
            structuralRequired("thesisYear")
              ? [{ required: true, message: t("Year is required") }]
              : []
          }
        >
          <Select
            options={THESIS_YEAR_OPTIONS}
            placeholder={t("Graduation / submission year")}
            onChange={(year) => {
              const current = submissionForm.getFieldValue("dateIssued");
              if (!current || /^\d{4}$/.test(String(current))) {
                submissionForm.setFieldsValue({ dateIssued: year });
              }
            }}
          />
        </Form.Item>
      ) : (
        renderAlternateField("thesisYear")
      )}
      {!isAdminActor && showNative("authorIds") ? (
        <Form.Item
          label={t("Authors")}
          name="authorIds"
          rules={
            structuralRequired("authorIds")
              ? [
                  {
                    required: true,
                    message: t("Please select at least one author"),
                  },
                ]
              : []
          }
        >
          <Select
            mode="multiple"
            showSearch
            allowClear
            placeholder={t("Search by name or username")}
            filterOption={personOptionFilter}
            loading={isLoadingStudents}
            options={studentOptions}
            maxTagCount="responsive"
            notFoundContent={
              isLoadingStudents ? t("Loading...") : t("No students found")
            }
          />
        </Form.Item>
      ) : !isAdminActor ? (
        renderAlternateField("authorIds")
      ) : null}
      {showNative("reviewerIds") ? (
        <Form.Item
          label={t("Reviewers")}
          name="reviewerIds"
          extra={
            reviewerStepOff
              ? t(
                  "Reviewer step is off: reviewer accounts are optional and will not be asked to approve.",
                )
              : undefined
          }
          rules={
            structuralRequired("reviewerIds") && !reviewerStepOff
              ? [
                  {
                    required: true,
                    message: t("Please select at least one reviewer"),
                  },
                ]
              : []
          }
        >
          <Select
            mode="multiple"
            showSearch
            allowClear
            placeholder={t("Search by name or username")}
            filterOption={personOptionFilter}
            loading={isLoadingReviewers}
            options={reviewerOptions}
            maxTagCount="responsive"
            notFoundContent={
              isLoadingReviewers ? t("Loading...") : t("No reviewers found")
            }
          />
        </Form.Item>
      ) : (
        renderAlternateField("reviewerIds")
      )}
      <AdditionalMetadataFields />
      <ThesisFileField />

      <SubmissionFormActions />
    </fieldset>
  );
}
