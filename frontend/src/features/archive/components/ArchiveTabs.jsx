import DspaceSettingsPanel from "./DspaceSettingsPanel";
import DspacePublishPanel from "./DspacePublishPanel";
import ArchiveBrowsePanel from "./ArchiveBrowsePanel";
import { Tabs } from "antd";

import { useArchive } from "../ArchiveContext";
export default function ArchiveTabs() {
  const { mainTab, setMainTab, isAdmin, t, allowEdit } = useArchive();
  return (
    <Tabs
      activeKey={mainTab}
      onChange={setMainTab}
      items={[
        ...(isAdmin
          ? [
              {
                key: "dspace-settings",
                label: t("DSpace settings"),
                children: <DspaceSettingsPanel />,
              },
            ]
          : []),
        ...(allowEdit
          ? [
              {
                key: "push-dspace",
                label: t("Push to DSpace"),
                children: <DspacePublishPanel />,
              },
            ]
          : []),
        {
          key: "browse",
          label: t("Browse & periods"),
          children: <ArchiveBrowsePanel />,
        },
      ]}
    />
  );
}
