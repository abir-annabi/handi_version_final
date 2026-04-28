"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { UtilisateurConnecte } from "@/types/api";

export function AppShell({ utilisateur, children }: { utilisateur: UtilisateurConnecte; children: ReactNode }) {
  const roleClassName = `app-shell-${utilisateur.role}`;
  const pathname = usePathname();
  const isAdmin = utilisateur.role === "admin";
  const isEntreprise = utilisateur.role === "entreprise";
  const [candidateSidebarExpandedPath, setCandidateSidebarExpandedPath] = useState<string | null>(null);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const [entrepriseSidebarCollapsed, setEntrepriseSidebarCollapsed] = useState(false);
  const hasCollapsibleSidebar = utilisateur.role === "candidat" || isAdmin || isEntreprise;
  const candidateSidebarCollapsed = hasCollapsibleSidebar
    ? isAdmin
      ? adminSidebarCollapsed
      : isEntreprise
      ? entrepriseSidebarCollapsed
      : candidateSidebarExpandedPath !== pathname
    : false;
  const collapsedClassName =
    hasCollapsibleSidebar && candidateSidebarCollapsed
      ? isAdmin
        ? "app-shell-admin-collapsed"
        : isEntreprise
        ? "app-shell-entreprise-collapsed"
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
          if (isEntreprise) {
            setEntrepriseSidebarCollapsed((current) => !current);
            return;
          }
          setCandidateSidebarExpandedPath((current) => (current === pathname ? null : pathname));
        }}
      />
      <main className={`app-main ${roleClassName}-main`}>{children}</main>
    </div>
  );
}
