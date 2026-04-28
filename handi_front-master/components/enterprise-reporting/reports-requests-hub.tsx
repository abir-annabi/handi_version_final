"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState, PageHeader } from "@/components/ui/layout";
import {
  EnterpriseDraftRecord,
  deleteEnterpriseDraft,
  listEnterpriseDrafts,
  listEnterpriseGeneratedReports,
  EnterpriseGeneratedReportSummary,
} from "@/lib/enterprise-reports";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("fr-FR");
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "En attente de revue",
  validated: "Valide",
  rejected: "Rejete",
};

const STATUS_CLASSES: Record<string, string> = {
  submitted: "message-neutre",
  validated: "message-info",
  rejected: "message-erreur",
};

export function EnterpriseReportsRequestsHub() {
  const [reports, setReports] = useState<EnterpriseGeneratedReportSummary[]>([]);
  const [drafts, setDrafts] = useState<EnterpriseDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      setError(null);
      const reportsResult = await listEnterpriseGeneratedReports();
      setReports(reportsResult);
      setDrafts(listEnterpriseDrafts());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les rapports de l'entreprise.");
      setDrafts(listEnterpriseDrafts());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const removeDraft = (draftId: string) => {
    deleteEnterpriseDraft(draftId);
    setDrafts(listEnterpriseDrafts());
  };

  if (loading) {
    return (
      <main className="app-page">
        <LoadingState
          title="Loading reports and requests"
          description="Preparing the company reporting workspace and your saved drafts."
        />
      </main>
    );
  }

  return (
    <main className="app-page">
      <PageHeader
        badge="Reports & Requests"
        title="Generate compliance documents and manage your company drafts."
        description="Create the compliance report for law n°41-2016, prepare a transfer request, and reopen your saved work whenever needed."
        actions={<Button onClick={() => void reload()} variant="secondary">Refresh</Button>}
      />

      {error ? <div className="message message-erreur">{error}</div> : null}

      <section className="surface-grid surface-grid-2">
        <Card padding="lg" className="stack-lg">
          <div>
            <p className="badge">Generate the compliance report</p>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontFamily: "var(--app-heading)" }}>
              Build the law n°41-2016 report from your live hiring data.
            </h2>
            <p className="texte-secondaire" style={{ margin: "12px 0 0" }}>
              Pre-fill legal company data, offers, applications, interviews, and current disability hiring metrics before publishing the report.
            </p>
          </div>
          <ButtonLink href="/entreprise/reports-requests/compliance">Open compliance report builder</ButtonLink>
        </Card>

        <Card padding="lg" className="stack-lg">
          <div>
            <p className="badge">Generate a transfer request</p>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontFamily: "var(--app-heading)" }}>
              Prepare a structured transfer request for your inclusion follow-up.
            </h2>
            <p className="texte-secondaire" style={{ margin: "12px 0 0" }}>
              Draft the request, link it to a compliance report if needed, and export the final text for follow-up with your partners.
            </p>
          </div>
          <ButtonLink href="/entreprise/reports-requests/transfer" variant="secondary">Open transfer request builder</ButtonLink>
        </Card>
      </section>

      <section className="surface-grid surface-grid-2">
        <Card padding="lg" className="stack-lg">
          <div>
            <p className="badge">Generated Reports</p>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontFamily: "var(--app-heading)" }}>
              Published compliance reports
            </h2>
          </div>

          {reports.length === 0 ? (
            <EmptyState title="No reports generated yet." description="Your company has not published a compliance report yet." />
          ) : (
            <div className="list-stack">
              {reports.map((report) => (
                <Card key={report.id} padding="md">
                  <div className="stack-lg">
                    <div className="notification-meta">
                      <div>
                        <strong style={{ display: "block", fontSize: "1.05rem" }}>{report.summary}</strong>
                        <p className="texte-secondaire" style={{ margin: "8px 0 0" }}>
                          {formatDate(report.reporting_period_start)} - {formatDate(report.reporting_period_end)}
                        </p>
                      </div>
                      <span className={`status-pill ${STATUS_CLASSES[report.status] || "message-neutre"}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </div>

                    <div className="details-grid">
                      <div className="detail-box">
                        <strong>Applications</strong>
                        <p>{report.applications_count}</p>
                      </div>
                      <div className="detail-box">
                        <strong>Shortlisted</strong>
                        <p>{report.shortlisted_count}</p>
                      </div>
                      <div className="detail-box">
                        <strong>Hired</strong>
                        <p>{report.hired_count}</p>
                      </div>
                      <div className="detail-box">
                        <strong>Submitted</strong>
                        <p>{formatDate(report.submitted_at)}</p>
                      </div>
                    </div>

                    <div className="page-header-actions">
                      <ButtonLink href={`/entreprise/reports-requests/reports/${report.id}`} variant="secondary">
                        Open report
                      </ButtonLink>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <Card padding="lg" className="stack-lg">
          <div>
            <p className="badge">Saved drafts</p>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontFamily: "var(--app-heading)" }}>
              Local drafts for reports and requests
            </h2>
          </div>

          {drafts.length === 0 ? (
            <EmptyState title="No saved drafts yet." description="Save your compliance report or transfer request draft and it will appear here." />
          ) : (
            <div className="list-stack">
              {drafts.map((draft) => {
                const href =
                  draft.type === "compliance"
                    ? `/entreprise/reports-requests/compliance?draft=${draft.id}`
                    : `/entreprise/reports-requests/transfer?draft=${draft.id}`;

                return (
                  <Card key={draft.id} padding="md">
                    <div className="notification-meta">
                      <div>
                        <strong style={{ display: "block", fontSize: "1rem" }}>{draft.title}</strong>
                        <p className="texte-secondaire" style={{ margin: "8px 0 0" }}>
                          {draft.type === "compliance" ? "Compliance report draft" : "Transfer request draft"} - updated {formatDate(draft.updated_at)}
                        </p>
                      </div>
                      <div className="page-header-actions">
                        <ButtonLink href={href} variant="secondary" size="sm">
                          Reopen draft
                        </ButtonLink>
                        <Button onClick={() => removeDraft(draft.id)} variant="ghost" size="sm">
                          Delete draft
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}

