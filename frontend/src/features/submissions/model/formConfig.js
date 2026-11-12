export const THESIS_MAX_FILE_SIZE_MB = 30;

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
