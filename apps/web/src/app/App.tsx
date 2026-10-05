import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../lib/auth";
import { AppShell } from "./AppShell";
import { ProtectedRoute } from "./ProtectedRoute";
import { SignInPage } from "../features/auth/SignInPage";
import { SpacesPage } from "../features/spaces/SpacesPage";
import { SpaceView } from "../features/spaces/SpaceView";
import { PageView } from "../features/pages/PageView";
import { SearchPage } from "../features/search/SearchPage";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH ?? "/"}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<SpacesPage />} />
                <Route path="/spaces/:spaceId" element={<SpaceView />} />
                <Route path="/pages/:pageId" element={<PageView />} />
                <Route path="/search" element={<SearchPage />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/admin" element={<AdminUsersPage />} />
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
