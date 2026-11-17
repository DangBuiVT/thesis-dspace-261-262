import ArchiveWorkspace from "./ArchiveWorkspace";
export { default as ArchiveWorkspace } from "./ArchiveWorkspace";
export function ArchiveManager({ auth }) {
  return <ArchiveWorkspace auth={auth} mode="manage" />;
}
export function ArchiveBrowser({ auth }) {
  return <ArchiveWorkspace auth={auth} mode="browse" />;
}
