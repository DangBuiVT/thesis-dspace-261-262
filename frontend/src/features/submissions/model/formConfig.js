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
  titleVi: "text",
  titleEn: "text",
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
