"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { UtilisateurConnecte } from "@/types/api";

export function AppShell({ utilisateur, children }: { utilisateur: UtilisateurConnecte; children: ReactNode }) {
  const roleClassName = `app-shell-${utilisateur.role}`;
  const pathname = usePathname();
  const isAdmin = utilisateur.role === "admin";
  const [candidateSidebarExpandedPath, setCandidateSidebarExpandedPath] = useState<string | null>(null);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const hasCollapsibleSidebar = utilisateur.role === "candidat" || isAdmin;
  const candidateSidebarCollapsed = hasCollapsibleSidebar
    ? isAdmin
      ? adminSidebarCollapsed
      : candidateSidebarExpandedPath !== pathname
    : false;
  const collapsedClassName =
    hasCollapsibleSidebar && candidateSidebarCollapsed
      ? isAdmin
        ? "app-shell-admin-collapsed"
        : "app-shell-candidat-collapsed"
      : "";

  return (
    <div
      className={`app-shell app-theme ${roleClassName} ${
        collapsedClassName
      }`}
    >
      <Navbar
        utilisateur={utilisateur}
        candidateSidebarCollapsed={candidateSidebarCollapsed}
        onToggleCandidateSidebar={() => {
          if (isAdmin) {
            setAdminSidebarCollapsed((current) => !current);
            return;
          }
          setCandidateSidebarExpandedPath((current) => (current === pathname ? null : pathname));
        }}
      />
      <main className={`app-main ${roleClassName}-main`}>{children}</main>
    </div>
  );
}
