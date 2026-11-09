import { submissionPeriodId } from "../model/filters";
import { Input, Space, Select } from "antd";
import {
  buildSemesterFilterOptions,
  submissionSemesterKey,
  buildPeriodFilterOptions,
} from "../model/filters.js";
import { useI18n } from "../../../i18n/I18nProvider";
export default function SubmissionFilters({
  search,
  onSearch,
  semester,
  onSemester,
  period,
  onPeriod,
  items,
}) {
  const { t } = useI18n();
  return (
    <>
      <Input
        allowClear
        placeholder={t(
          "Search by title, author, reviewer list, abstract, submitter...",
        )}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
      <Space wrap>
        <Select
          allowClear
          placeholder={t("Semester")}
          style={{ minWidth: 200 }}
          value={semester}
          options={buildSemesterFilterOptions(items)}
          onChange={(value) => {
            onSemester(value);
            onPeriod((current) => {
              if (!current || !value) {
                return current;
              }
              const stillValid = (items || []).some(
                (item) =>
                  submissionPeriodId(item) === current &&
                  submissionSemesterKey(item) === value,
              );
              return stillValid ? current : undefined;
            });
          }}
        />
        <Select
          allowClear
          placeholder={t("Submission period")}
          style={{ minWidth: 260 }}
          value={period}
          options={buildPeriodFilterOptions(items, semester)}
          onChange={onPeriod}
        />
      </Space>
    </>
  );
}
