export const THESIS_MAX_FILE_SIZE_MB = 30;

// Admin-only faculty option: a faculty that is not in the archive tree, typed by hand.
export const OTHER_FACULTY_VALUE = "__other__";

// Students may keep several theses (the one-active-submission rule was removed
// together with idx_submissions_one_active_per_student).
export const ALLOW_MULTIPLE_STUDENT_SUBMISSIONS = true;

// Review steps an admin can switch off for a single submission, in workflow order.
export const WORKFLOW_STEP_FIELDS = [
  { name: "workflowReviewer", role: "reviewer", label: "Reviewer" },
  { name: "workflowLibrary", role: "library_staff", label: "Library" },
  { name: "workflowDirector", role: "director", label: "Director" },
];

export const THESIS_YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const year = new Date().getFullYear() + 1 - index;
  return { value: String(year), label: String(year) };
});

export const STRUCTURAL_FORM_KEYS = new Set([
  "archiveFacultyId",
  "archiveSemesterId",
  "submissionPeriodId",
  "email",
  "titleVi",
  "titleEn",
  "thesisAdvisors",
  "major",
  "thesisYear",
  "authorIds",
  "reviewerIds",
  "thesisFile",
]);

export const STRUCTURAL_NATIVE_TYPE = {
  archiveFacultyId: "select",
  archiveSemesterId: "select",
  submissionPeriodId: "select",
  email: "text",
  titleVi: "textarea",
  titleEn: "textarea",
  thesisAdvisors: "text",
  major: "text",
  thesisYear: "year",
  authorIds: "select",
  reviewerIds: "select",
  thesisFile: "file",
};

export const DEFAULT_PUBLISHER = "Ho Chi Minh City University of Technology";

export const LANGUAGE_OPTIONS = [
  { value: "vie", label: "Vietnamese (vie)" },
  { value: "eng", label: "English (eng)" },
];

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "Thesis", label: "Thesis" },
  { value: "Dissertation", label: "Dissertation" },
  { value: "Graduation thesis", label: "Graduation thesis" },
];

export const defaultArchiveMetadata = (
  year = String(new Date().getFullYear()),
) => ({
  dateIssued: year,
  publisher: DEFAULT_PUBLISHER,
  documentType: "Thesis",
  language: "vie",
  description: "",
});

export function decodeFormAnswer(field, value) {
  if (field.inputType !== "checkboxes" || Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function configuredFieldRules(field, t) {
  const label = t(field.label);
  const arrayAnswer = field.inputType === "checkboxes" || ["authorIds", "reviewerIds"].includes(field.fieldKey) && field.inputType === "select";
  const rules = field.required
    ? [{ required: true, ...(arrayAnswer ? { type: "array", min: 1 } : { whitespace: true }), message: t("{{label}} is required", { label }) }]
    : [];
  if (field.fieldKey === "email") rules.push({ type: "email", message: t("Please enter a valid email address") });
  if (field.fieldKey === "thesisYear") rules.push({ pattern: /^\d{4}$/, message: t("Year must be a four-digit number") });
  if (field.inputType === "checkboxes" && field.validation?.allOptions) {
    rules.push({ validator: (_, value) => !value?.length || value.length === field.options.length
      ? Promise.resolve()
      : Promise.reject(new Error(t("Select all {{count}} components", { count: field.options.length }))) });
  }
  return rules;
}

export function displayFormAnswer(field, value, t) {
  if (field?.inputType !== "checkboxes") return value;
  return (decodeFormAnswer(field, value) || [])
    .map(selected => t(field.options?.find(option => option.value === selected)?.label || selected))
    .join("; ");
}
