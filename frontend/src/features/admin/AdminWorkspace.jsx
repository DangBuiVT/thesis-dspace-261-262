import { Tabs, Typography } from "antd";
import { useAdmin } from "./AdminContext";
import AdminProvider from "./AdminProvider";
import UsersPanel from "./components/UsersPanel";
import RolesPanel from "./components/RolesPanel";
import FormFieldsPanel from "./components/FormFieldsPanel";
import WorkflowPanel from "./components/WorkflowPanel";
import GroupsPanel from "./components/GroupsPanel";
import SettingsPanel from "./components/SettingsPanel";
import EmailSettingsPanel from "./components/EmailSettingsPanel";
import FormFieldDialog from "./components/FormFieldDialog";
import UserEditorDialog from "./components/UserEditorDialog";
import UserImportDialog from "./components/UserImportDialog";
function AdminView({ mode, hiddenTabs, archivePanel }) {
  const { t, activeTab, setActiveTab } = useAdmin();
  if (mode === "email") return <EmailSettingsPanel />;
  if (mode === "fields")
    return (
      <>
        <FormFieldsPanel />
        <FormFieldDialog />
      </>
    );
  const items = [
    { key: "users", label: t("Manage users"), children: <UsersPanel /> },
    { key: "roles", label: t("Manage roles"), children: <RolesPanel /> },
    {
      key: "form-fields",
      label: t("Submission fields"),
      children: <FormFieldsPanel />,
    },
    {
      key: "workflow",
      label: t("Approval workflow"),
      children: <WorkflowPanel />,
    },
    { key: "groups", label: t("User groups"), children: <GroupsPanel /> },
    {
      key: "settings",
      label: t("System settings"),
      children: <SettingsPanel />,
    },
    {
      key: "email",
      label: t("Email configuration"),
      children: <EmailSettingsPanel />,
    },
    {
      key: "archive",
      label: t("Archive configuration"),
      children: archivePanel,
    },
  ].filter((item) => !hiddenTabs.includes(item.key));
  return (
    <>
      <Typography.Paragraph type="secondary">
        {t(
          "Administrator workspace: user accounts, role permissions, system and email configuration. Administrators do not approve or reject theses; they can create and submit on behalf of a student from the Submissions tab. Submission form fields are configured under Submissions.",
        )}
      </Typography.Paragraph>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      <UserEditorDialog />
      <UserImportDialog />
      <FormFieldDialog />
    </>
  );
}
export default function AdminWorkspace({
  auth,
  mode = "administration",
  hiddenTabs = [],
  archivePanel = null,
}) {
  return (
    <AdminProvider auth={auth} mode={mode}>
      <AdminView
        mode={mode}
        hiddenTabs={hiddenTabs}
        archivePanel={archivePanel}
      />
    </AdminProvider>
  );
}
