export function submissionSemesterKey(item) {
  return (
    item?.semester_id ||
    item?.semesterId ||
    item?.semester_name ||
    item?.semesterName ||
    ""
  );
}

export function submissionPeriodId(item) {
  return item?.submission_period_id || item?.submissionPeriodId || "";
}

export function buildSemesterFilterOptions(items) {
  const map = new Map();
  for (const item of items || []) {
    const value = submissionSemesterKey(item);
    if (!value) {
      continue;
    }
    if (!map.has(value)) {
      map.set(value, {
        value,
        label: item.semester_name || item.semesterName || value,
      });
    }
  }
  return [...map.values()];
}

export function buildPeriodFilterOptions(items, semesterFilter) {
  const map = new Map();
  for (const item of items || []) {
    if (semesterFilter && submissionSemesterKey(item) !== semesterFilter) {
      continue;
    }
    const value = submissionPeriodId(item);
    if (!value) {
      continue;
    }
    if (!map.has(value)) {
      const faculty = item.faculty_name || item.facultyName;
      map.set(value, {
        value,
        label: `${faculty ? `${faculty} / ` : ""}${item.period_name || item.periodName || value}`,
      });
    }
  }
  return [...map.values()];
}

export function filterBySearchAndArchive(
  items,
  search,
  semesterFilter,
  periodFilter,
) {
  const q = (search || "").trim().toLowerCase();
  return (items || []).filter((item) => {
    if (semesterFilter && submissionSemesterKey(item) !== semesterFilter) {
      return false;
    }
    if (periodFilter && submissionPeriodId(item) !== periodFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    const text = [
      item.title,
      item.title_vi,
      item.title_en,
      item.student_email,
      item.thesis_advisors,
      item.major,
      item.thesis_year,
      item.author,
      item.reviewer,
      item.abstract,
      item.submitter,
      item.submitter_username,
      item.faculty_name,
      item.semester_name,
      item.period_name,
      item.status,
      item.submission_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(q);
  });
}
