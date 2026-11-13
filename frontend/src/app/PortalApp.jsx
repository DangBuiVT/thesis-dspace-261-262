import { lazy, Suspense } from "react";
import { Spin } from "antd";
import {
  SessionProvider,
  useSession,
  LoginPanel,
  PasswordDialog,
} from "../features/auth";
import {
  SubmissionProvider,
  SubmissionsDashboard,
} from "../features/submissions";
import PortalShell from "./PortalShell";
import { isVerifyPath } from "../features/verify/index.js";
const SignatureVerifyPage = lazy(() =>
  import("../features/verify/index.js").then((module) => ({
    default: module.SignatureVerifyPage,
  })),
);
const AdministrationPanel = lazy(() =>
  import("../features/admin/index.jsx").then((module) => ({
    default: module.AdministrationPanel,
  })),
);
const SubmissionFieldsPanel = lazy(() =>
  import("../features/admin/index.jsx").then((module) => ({
    default: module.SubmissionFieldsPanel,
  })),
);
const ArchiveWorkspace = lazy(() =>
  import("../features/archive/index.jsx").then((module) => ({
    default: module.ArchiveWorkspace,
  })),
);
function PortalContent() {
  const { auth } = useSession();
  // Trang kiểm tra chữ ký là công khai: không cần đăng nhập.
  if (isVerifyPath(window.location.pathname)) {
    return (
      <Suspense fallback={<Spin />}>
        <SignatureVerifyPage />
      </Suspense>
    );
  }
  if (!auth) return <LoginPanel />;
  return (
    <SubmissionProvider
      key={auth.user.username + ":" + auth.user.role}
      auth={auth}
    >
      <Suspense fallback={<Spin />}>
        <SubmissionsDashboard
          administration={<AdministrationPanel auth={auth} />}
          formFieldsPanel={<SubmissionFieldsPanel auth={auth} />}
          archivePanel={
            <ArchiveWorkspace
              auth={auth}
              mode={auth.user.role === "director" ? "browse" : "manage"}
            />
          }
        />
      </Suspense>
    </SubmissionProvider>
  );
}
export default function PortalApp() {
  return (
    <SessionProvider>
      <PortalShell>
        <PortalContent />
      </PortalShell>
      <PasswordDialog />
    </SessionProvider>
  );
}
