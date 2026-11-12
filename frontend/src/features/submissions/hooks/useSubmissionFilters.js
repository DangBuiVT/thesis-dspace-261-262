import { useMemo } from "react";
import { filterBySearchAndArchive } from "../model/filters.js";
import { message } from "antd";
import { downloadCsv } from "../../../shared/files/csv.js";
import { statusText, formatDateTime } from "../../../i18n/labels.js";

export function useSubmissionFilters({
  reviewerQueue,
  reviewerSearch,
  reviewerSemesterFilter,
  reviewerPeriodFilter,
  staffSubmissions,
  libraryQueue,
  directorQueue,
  staffSearch,
  staffSemesterFilter,
  staffPeriodFilter,
  t,
  lang,
}) {
  const reviewerFiltered = useMemo(
    () =>
      filterBySearchAndArchive(
        reviewerQueue,
        reviewerSearch,
        reviewerSemesterFilter,
        reviewerPeriodFilter,
      ),
    [
      reviewerQueue,
      reviewerSearch,
      reviewerSemesterFilter,
      reviewerPeriodFilter,
    ],
  );

  const staffFilterSource = useMemo(() => {
    const byId = new Map();
    for (const item of [
      ...staffSubmissions,
      ...libraryQueue,
      ...directorQueue,
    ]) {
      if (item?.id && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
    return [...byId.values()];
  }, [staffSubmissions, libraryQueue, directorQueue]);

  const staffFilteredSubmissions = useMemo(
    () =>
      filterBySearchAndArchive(
        staffSubmissions,
        staffSearch,
        staffSemesterFilter,
        staffPeriodFilter,
      ),
    [staffSubmissions, staffSearch, staffSemesterFilter, staffPeriodFilter],
  );

  const exportAllSubmissions = () => {
    if (!staffFilteredSubmissions.length) {
      message.info(t("No submissions to export"));
      return;
    }
    downloadCsv(
      "submissions.csv",
      [
        t("Title"),
        t("Submitter"),
        t("Authors"),
        t("Reviewers"),
        t("Abstract"),
        t("DSpace"),
        t("Status"),
        t("Submitted At"),
      ],
      staffFilteredSubmissions.map((record) => [
        record.title || "",
        [
          record.submitter,
          record.submitter_username ? `(${record.submitter_username})` : "",
        ]
          .filter(Boolean)
          .join(" "),
        record.author || "",
        record.reviewer || "",
        record.abstract || "",
        record.dspace_item_id || "",
        statusText(record.status, t),
        formatDateTime(record.created_at, lang),
      ]),
    );
  };

  const libraryFilteredQueue = useMemo(
    () =>
      filterBySearchAndArchive(
        libraryQueue,
        staffSearch,
        staffSemesterFilter,
        staffPeriodFilter,
      ),
    [libraryQueue, staffSearch, staffSemesterFilter, staffPeriodFilter],
  );

  const directorFilteredQueue = useMemo(
    () =>
      filterBySearchAndArchive(
        directorQueue,
        staffSearch,
        staffSemesterFilter,
        staffPeriodFilter,
      ),
    [directorQueue, staffSearch, staffSemesterFilter, staffPeriodFilter],
  );

  const reviewerNeedMyDecision = useMemo(
    () => reviewerFiltered.filter((item) => item.my_decision === "pending"),
    [reviewerFiltered],
  );

  const reviewerApproved = useMemo(
    () => reviewerFiltered.filter((item) => item.my_decision === "approved"),
    [reviewerFiltered],
  );

  const reviewerRejected = useMemo(
    () => reviewerFiltered.filter((item) => item.my_decision === "reject"),
    [reviewerFiltered],
  );
  return {
    reviewerFiltered,
    staffFilterSource,
    staffFilteredSubmissions,
    exportAllSubmissions,
    libraryFilteredQueue,
    directorFilteredQueue,
    reviewerNeedMyDecision,
    reviewerApproved,
    reviewerRejected,
  };
}
