import { requestUploadLimit, requestSubmissionFields } from "../api.js";
import { Form, Input, Select } from "antd";
import { useMemo } from "react";
import {
  STRUCTURAL_FORM_KEYS,
  STRUCTURAL_NATIVE_TYPE,
  THESIS_YEAR_OPTIONS,
  OTHER_FACULTY_VALUE,
  WORKFLOW_STEP_FIELDS,
} from "../model/formConfig.js";
import { fieldDisplayLabel, optionDisplayLabel } from "../../../i18n/labels.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
const { TextArea } = Input;

export function useSubmissionSchema({
  submissionForm,
  auth,
  studentOptions,
  archiveFaculties,
  submissionFormFields,
  formFieldsLoaded,
  t,
  setThesisMaxFileSizeMb,
  setFormFieldsLoaded,
  setSubmissionFormFields,
}) {
  const submissionPeriodId = Form.useWatch(
    "submissionPeriodId",
    submissionForm,
  );

  const archiveFacultyId = Form.useWatch("archiveFacultyId", submissionForm);

  const archiveSemesterId = Form.useWatch("archiveSemesterId", submissionForm);

  const watchedStudentId = Form.useWatch("studentId", submissionForm);

  const isAdminActor = auth?.user?.role === "admin";

  // Admin-only overrides for one submission: a hand-typed faculty and the review steps to keep.
  const isOtherFaculty = isAdminActor && archiveFacultyId === OTHER_FACULTY_VALUE;

  const workflowReviewer = Form.useWatch("workflowReviewer", submissionForm);

  const workflowLibrary = Form.useWatch("workflowLibrary", submissionForm);

  const workflowDirector = Form.useWatch("workflowDirector", submissionForm);

  const reviewerStepOff = isAdminActor && workflowReviewer === false;

  const noReviewStepsSelected =
    isAdminActor &&
    workflowReviewer === false &&
    workflowLibrary === false &&
    workflowDirector === false;

  const workflowStepFields = WORKFLOW_STEP_FIELDS;

  const facultySelectOptions = useMemo(() => {
    const withOther = (list) =>
      isAdminActor
        ? [
            ...list,
            { value: OTHER_FACULTY_VALUE, label: t("Other (enter faculty name)") },
          ]
        : list;
    const locked = isAdminActor
      ? studentOptions.find((item) => item.value === watchedStudentId)
      : auth?.user?.facultyId
        ? { facultyId: auth.user.facultyId, facultyName: auth.user.facultyName }
        : null;
    if (!locked?.facultyId) {
      return withOther(archiveFaculties);
    }
    if (archiveFaculties.some((item) => item.value === locked.facultyId)) {
      return withOther(archiveFaculties);
    }
    return withOther([
      {
        value: locked.facultyId,
        label: locked.facultyName || locked.facultyId,
      },
      ...archiveFaculties,
    ]);
  }, [
    t,
    archiveFaculties,
    auth?.user?.facultyId,
    auth?.user?.facultyName,
    isAdminActor,
    studentOptions,
    watchedStudentId,
  ]);

  const actingStudentId = isAdminActor ? watchedStudentId : auth?.user?.id;

  const configurableFormFields = useMemo(
    () =>
      (Array.isArray(submissionFormFields) ? submissionFormFields : []).filter(
        (field) =>
          field.fieldKey !== "author" &&
          field.fieldKey !== "title" &&
          !STRUCTURAL_FORM_KEYS.has(field.fieldKey),
      ),
    [submissionFormFields],
  );

  const structuralField = (key) =>
    (Array.isArray(submissionFormFields) ? submissionFormFields : []).find(
      (field) => field.fieldKey === key,
    );

  const showNative = (key) => {
    if (!formFieldsLoaded) {
      return true;
    }
    const field = structuralField(key);
    return Boolean(field && field.inputType === STRUCTURAL_NATIVE_TYPE[key]);
  };

  const structuralRequired = (key, fallback = true) => {
    if (!formFieldsLoaded) {
      return fallback;
    }
    const field = structuralField(key);
    return Boolean(field?.required);
  };

  const renderAlternateField = (key) => {
    if (!formFieldsLoaded) {
      return null;
    }
    const field = structuralField(key);
    if (
      !field ||
      field.inputType === STRUCTURAL_NATIVE_TYPE[key] ||
      field.inputType === "file"
    ) {
      return null;
    }
    const label = fieldDisplayLabel(field, t);
    const rules = field.required
      ? [{ required: true, message: t("{{label}} is required", { label }) }]
      : [];
    let control = <Input placeholder={field.defaultValue || label} />;
    if (field.inputType === "textarea") {
      control = <TextArea rows={3} />;
    } else if (field.inputType === "select" || field.inputType === "year") {
      control = (
        <Select
          options={
            field.inputType === "year"
              ? THESIS_YEAR_OPTIONS
              : (field.options || []).map((option) => ({
                  value: option.value,
                  label: optionDisplayLabel(option, t),
                }))
          }
          placeholder={label}
        />
      );
    }
    return (
      <Form.Item key={field.id || key} label={label} name={key} rules={rules}>
        {control}
      </Form.Item>
    );
  };

  const loadSubmissionFormFields = async (token) => {
    try {
      const limitResponse = await requestUploadLimit({
        headers: { ...authHeaders(token) },
      });
      const limitPayload = await parseResponse(limitResponse);
      const maxMb = Number(limitPayload?.maxFileSizeMb);
      if (limitResponse.ok && Number.isFinite(maxMb) && maxMb > 0) {
        setThesisMaxFileSizeMb(maxMb);
      }
    } catch {
      // Keep the fallback size already shown in the upload area.
    }
    try {
      const response = await requestSubmissionFields({
        headers: { ...authHeaders(token) },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        setFormFieldsLoaded(true);
        return [];
      }
      setSubmissionFormFields(payload);
      setFormFieldsLoaded(true);
      return payload;
    } catch {
      setFormFieldsLoaded(true);
      return [];
    }
  };

  const applyFormFieldDefaults = (fields, currentValues = {}) => {
    const patch = {};
    for (const field of fields || []) {
      if (field.fieldKey === "author" || field.fieldKey === "title") {
        continue;
      }
      if (
        currentValues[field.fieldKey] != null &&
        String(currentValues[field.fieldKey]).trim() !== ""
      ) {
        continue;
      }
      if (field.defaultValue) {
        patch[field.fieldKey] = field.defaultValue;
      }
    }
    if (Object.keys(patch).length > 0) {
      submissionForm.setFieldsValue(patch);
    }
  };
  return {
    submissionPeriodId,
    archiveFacultyId,
    archiveSemesterId,
    watchedStudentId,
    isAdminActor,
    isOtherFaculty,
    reviewerStepOff,
    noReviewStepsSelected,
    workflowStepFields,
    facultySelectOptions,
    actingStudentId,
    configurableFormFields,
    structuralField,
    showNative,
    structuralRequired,
    renderAlternateField,
    loadSubmissionFormFields,
    applyFormFieldDefaults,
  };
}
