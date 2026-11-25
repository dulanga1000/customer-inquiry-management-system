import { Suspense } from "react";
import { LoadingState } from "@/components/common/LoadingState";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
