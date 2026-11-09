import { Typography } from "antd";
const { Title, Paragraph } = Typography;
import { useArchive } from "../ArchiveContext";
export default function ArchiveHeading() {
  const { t } = useArchive();
  return (
    <div>
      <Title level={5} style={{ margin: 0 }}>
        {t("Faculty archive configuration")}
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        {t(
          "The portal already has the 11 HCMUT faculties. After the workflow, a submission is archived into a period (not yet on DSpace). Admin and library staff use the Push to DSpace tab to send it to a synced collection.",
        )}
      </Paragraph>
    </div>
  );
}
