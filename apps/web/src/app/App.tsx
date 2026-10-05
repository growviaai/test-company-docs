import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../lib/auth";
import { AppShell } from "./AppShell";
import { ProtectedRoute } from "./ProtectedRoute";
import { SignInPage } from "../features/auth/SignInPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { AcceptInvitePage } from "../features/auth/AcceptInvitePage";
import { SpacesPage } from "../features/spaces/SpacesPage";
import { SpaceView } from "../features/spaces/SpaceView";
import { SearchPage } from "../features/search/SearchPage";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import { AdminInvitesPage } from "../features/admin/AdminInvitesPage";
import { SettingsPage } from "../features/settings/SettingsPage";

// Lazy-loaded: TipTap + lowlight + table/list extensions are the single
// largest chunk of the bundle, and most visits (browsing the tree, search,
// admin) never open a page in edit view. Phase 12's performance checklist
// in docs/14-build-plan.md calls this out by name ("lazy-load the editor").
const PageView = lazy(() => import("../features/pages/PageView").then((m) => ({ default: m.PageView })));

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH ?? "/"}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/invite/:token" element={<AcceptInvitePage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<SpacesPage />} />
                <Route path="/spaces/:spaceId" element={<SpaceView />} />
                <Route
                  path="/pages/:pageId"
                  element={
                    <Suspense fallback={<p className="text-muted">Loading…</p>}>
                      <PageView />
                    </Suspense>
                  }
                />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/admin" element={<AdminUsersPage />} />
                  <Route path="/admin/invites" element={<AdminInvitesPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<div className="p-10 text-center">404 — Not found</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
