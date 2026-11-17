import { Space } from "antd";
import ArchiveProvider from "./ArchiveProvider";
import ArchiveHeading from "./components/ArchiveHeading";
import ArchiveToolbar from "./components/ArchiveToolbar";
import ArchiveTabs from "./components/ArchiveTabs";
import FacultyDialog from "./components/FacultyDialog";
import SemesterDialog from "./components/SemesterDialog";
import PeriodDialog from "./components/PeriodDialog";
import ArchiveDetailDialog from "./components/ArchiveDetailDialog";
import ArchiveEditDialog from "./components/ArchiveEditDialog";
import DspaceSyncDialog from "./components/DspaceSyncDialog";
export default function ArchiveWorkspace({ auth, mode = "manage" }) {
  return (
    <ArchiveProvider auth={auth} mode={mode}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <ArchiveHeading />
        <ArchiveToolbar />
        <ArchiveTabs />
        <FacultyDialog />
        <SemesterDialog />
        <PeriodDialog />
        <ArchiveDetailDialog />
        <ArchiveEditDialog />
        <DspaceSyncDialog />
      </Space>
    </ArchiveProvider>
  );
}
