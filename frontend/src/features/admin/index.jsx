import AdminWorkspace from "./AdminWorkspace";
export { default as AdminWorkspace } from "./AdminWorkspace";
export function AdministrationPanel({ auth }) {
  return <AdminWorkspace auth={auth} hiddenTabs={["archive", "form-fields"]} />;
}
export function SubmissionFieldsPanel({ auth }) {
  return <AdminWorkspace auth={auth} mode="fields" />;
}
export function EmailConfigurationPanel({ auth }) {
  return <AdminWorkspace auth={auth} mode="email" />;
}
