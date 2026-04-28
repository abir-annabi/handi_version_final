"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthenticatedWorkspace } from "@/components/authenticated-workspace";
import { useI18n } from "@/components/i18n-provider";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState, PageHeader, StatCard } from "@/components/ui/layout";
import { EntrepriseHome } from "@/components/entreprise-home";
import { useAuth } from "@/hooks/useAuth";
import { authenticatedFetch } from "@/lib/auth-utils";
import { construireUrlApi } from "@/lib/config";
import { fetchSupervisionResource, type SupervisionOverview } from "@/lib/supervision";

type CandidateStatItem = {
  statut: string;
  count: number;
};

type AdminUserStatistics = {
  total_utilisateurs?: number;
  utilisateurs_actifs_periode?: number;
  actifs?: number;
};

type PendingRequestsPayload = {
  demandes?: unknown[];
};

type StatParStatut = { statut: string; count: number };
type EntrepriseActive = { entreprise_nom: string; nombre_offres: number; nombre_candidatures: number };

type StatistiquesAdmin = {
  stats_par_statut: StatParStatut[];
  taux_recrutement: number;
  temps_moyen_traitement_jours: number;
  total_candidatures: number;
  entreprises_actives: EntrepriseActive[];
};

type WorkflowPoint = {
  date: string;
  nouvelles: number;
  shortlistees: number;
  entretiens: number;
  acceptees: number;
  refusees: number;
};

type WorkspaceStatCard = {
  label: string;
  value: number | string;
  hint?: string;
};

type WorkspaceAction = {
  title: string;
  text: string;
  href: string;
};

type WorkspaceContent = {
  badge: string;
  title: string;
  description: string;
  actions: WorkspaceAction[];
};

function isShowcaseWorkspaceRole(role: string) {
  return role === "admin" || role === "inspecteur" || role === "aneti";
}

async function fetchApiData<T>(path: string): Promise<T> {
  const response = await authenticatedFetch(construireUrlApi(path));
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to load workspace data.");
  }

  return (payload?.donnees ?? payload) as T;
}

function buildWorkspaceContent(
  role: string,
  t: (key: string, replacements?: Record<string, string | number>) => string,
): WorkspaceContent {
  if (role === "entreprise") {
    return {
      badge: t("home.workspace.entreprise.badge"),
      title: t("home.workspace.entreprise.title"),
      description: t("home.workspace.entreprise.description"),
      actions: [
        {
          title: t("home.workspace.entreprise.actions.rolesTitle"),
          text: t("home.workspace.entreprise.actions.rolesText"),
          href: "/entreprise/offres",
        },
        {
          title: t("home.workspace.entreprise.actions.applicantsTitle"),
          text: t("home.workspace.entreprise.actions.applicantsText"),
          href: "/entreprise/candidatures",
        },
        {
          title: t("home.workspace.entreprise.actions.profileTitle"),
          text: t("home.workspace.entreprise.actions.profileText"),
          href: "/entreprise/profil",
        },
      ],
    };
  }

  if (role === "admin") {
    return {
      badge: t("home.workspace.admin.badge"),
      title: t("home.workspace.admin.title"),
      description: t("home.workspace.admin.description"),
      actions: [
        {
          title: t("home.workspace.admin.actions.accountsTitle"),
          text: t("home.workspace.admin.actions.accountsText"),
          href: "/admin/comptes",
        },
        {
          title: t("home.workspace.admin.actions.usersTitle"),
          text: t("home.workspace.admin.actions.usersText"),
          href: "/admin/utilisateurs",
        },
        {
          title: t("home.workspace.admin.actions.statsTitle"),
          text: t("home.workspace.admin.actions.statsText"),
          href: "#admin-stats",
        },
      ],
    };
  }

  if (role === "inspecteur") {
    return {
      badge: t("home.workspace.inspecteur.badge"),
      title: t("home.workspace.inspecteur.title"),
      description: t("home.workspace.inspecteur.description"),
      actions: [
        {
          title: t("home.workspace.inspecteur.actions.statsTitle"),
          text: t("home.workspace.inspecteur.actions.statsText"),
          href: "/admin/supervision",
        },
        {
          title: t("home.workspace.inspecteur.actions.profileTitle"),
          text: t("home.workspace.inspecteur.actions.profileText"),
          href: "/profil",
        },
        {
          title: t("home.workspace.inspecteur.actions.messagesTitle"),
          text: t("home.workspace.inspecteur.actions.messagesText"),
          href: "/messages",
        },
      ],
    };
  }

  return {
    badge: t("home.workspace.aneti.badge"),
    title: t("home.workspace.aneti.title"),
    description: t("home.workspace.aneti.description"),
    actions: [
      {
        title: t("home.workspace.aneti.actions.statsTitle"),
        text: t("home.workspace.aneti.actions.statsText"),
        href: "/admin/supervision",
      },
      {
        title: t("home.workspace.aneti.actions.profileTitle"),
        text: t("home.workspace.aneti.actions.profileText"),
        href: "/profil",
      },
      {
        title: t("home.workspace.aneti.actions.messagesTitle"),
        text: t("home.workspace.aneti.actions.messagesText"),
        href: "/messages",
      },
    ],
  };
}

export default function HomePage() {
  return (
    <AuthenticatedWorkspace>
      <HomeContent />
    </AuthenticatedWorkspace>
  );
}

function HomeContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { utilisateur } = useAuth();
  const [candidateStats, setCandidateStats] = useState<CandidateStatItem[]>([]);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStatCard[]>([]);
  const [adminStats, setAdminStats] = useState<StatistiquesAdmin | null>(null);
  const [adminWorkflow, setAdminWorkflow] = useState<WorkflowPoint[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [erreurStats, setErreurStats] = useState<string | null>(null);

  useEffect(() => {
    if (!utilisateur) {
      return;
    }

    let active = true;

    const charger = async () => {
      setLoadingStats(true);
      setErreurStats(null);

      try {
        if (utilisateur.role === "candidat") {
          const data = await fetchApiData<CandidateStatItem[]>("/api/candidatures/mes-statistiques");
          if (active) {
            setCandidateStats(Array.isArray(data) ? data : []);
            setWorkspaceStats([]);
            setAdminStats(null);
            setAdminWorkflow([]);
          }
          return;
        }

        if (utilisateur.role === "admin") {
          const [pendingResult, userStatsResult, applicationsResult, workflowResult, overviewResult] =
            await Promise.allSettled([
              fetchApiData<PendingRequestsPayload>("/api/admin/demandes-en-attente"),
              fetchApiData<AdminUserStatistics>("/api/admin/utilisateurs/statistiques?periode=mois"),
              fetchApiData<StatistiquesAdmin>("/api/admin/candidatures/statistiques-globales"),
              fetchApiData<WorkflowPoint[]>("/api/admin/workflow-recrutement?periode=30"),
              fetchSupervisionResource<SupervisionOverview>("/statistics/overview"),
            ]);

          const cards: WorkspaceStatCard[] = [];

          if (pendingResult.status === "fulfilled") {
            const pendingCount = Array.isArray(pendingResult.value)
              ? pendingResult.value.length
              : Array.isArray(pendingResult.value?.demandes)
                ? pendingResult.value.demandes.length
                : 0;
            cards.push({
              label: t("home.workspace.admin.stats.pendingRequests"),
              value: pendingCount,
              hint: t("home.workspace.admin.stats.realDataHint"),
            });
          }

          if (userStatsResult.status === "fulfilled") {
            cards.push({
              label: t("home.workspace.admin.stats.activeUsers"),
              value:
                userStatsResult.value.utilisateurs_actifs_periode ??
                userStatsResult.value.actifs ??
                0,
              hint: t("home.workspace.admin.stats.realDataHint"),
            });
          }

          if (applicationsResult.status === "fulfilled") {
            cards.push({
              label: t("home.workspace.admin.stats.totalApplications"),
              value: applicationsResult.value.total_candidatures ?? 0,
              hint: t("home.workspace.admin.stats.realDataHint"),
            });
          }

          if (overviewResult.status === "fulfilled") {
            cards.push({
              label: t("home.workspace.admin.stats.complianceReports"),
              value: overviewResult.value.totals.total_reports,
              hint: t("home.workspace.admin.stats.realDataHint"),
            });
          }

          if (active) {
            setWorkspaceStats(cards);
            setCandidateStats([]);
            setAdminStats(applicationsResult.status === "fulfilled" ? applicationsResult.value : null);
            setAdminWorkflow(
              workflowResult.status === "fulfilled" && Array.isArray(workflowResult.value)
                ? workflowResult.value
                : [],
            );
          }
          return;
        }

        if (utilisateur.role === "entreprise") {
          const [candidaturesResult, offresResult] = await Promise.allSettled([
            fetchApiData<{ donnees: CandidateStatItem[] }>("/api/candidatures/statistiques"),
            fetchApiData<{ donnees: { offres: any[] } }>("/api/entreprise/offres"),
          ]);

          const cards: WorkspaceStatCard[] = [];

          // Process candidatures statistics
          if (candidaturesResult.status === "fulfilled") {
            const candidaturesData = candidaturesResult.value;
            const stats = Array.isArray(candidaturesData.donnees) ? candidaturesData.donnees : 
                         Array.isArray(candidaturesData) ? candidaturesData : [];
            
            const getStatValue = (statut: string) => {
              const stat = stats.find(s => s.statut === statut);
              return stat ? stat.count : 0;
            };

            const total = stats.reduce((sum, stat) => sum + (Number(stat.count) || 0), 0);
            
            cards.push(
              {
                label: "Total des candidatures",
                value: total,
                hint: "Données réelles - Candidatures reçues",
              },
              {
                label: "Candidatures en attente",
                value: getStatValue("pending"),
                hint: "Données réelles - En cours d'examen",
              },
              {
                label: "Candidats présélectionnés",
                value: getStatValue("shortlisted"),
                hint: "Données réelles - Retenus pour entretien",
              },
              {
                label: "Candidats acceptés",
                value: getStatValue("accepted"),
                hint: "Données réelles - Embauchés avec succès",
              }
            );
          }

          // Process offers statistics
          if (offresResult.status === "fulfilled") {
            const offresData = offresResult.value;
            const offres = offresData.donnees?.offres || [];
            const activeOffers = offres.filter((offre: any) => offre.statut === "active" || offre.statut === "ouverte").length;
            
            cards.push({
              label: "Offres actives",
              value: activeOffers,
              hint: `Données réelles - ${offres.length} offres au total`,
            });
          }

          if (active) {
            setWorkspaceStats(cards);
            setCandidateStats([]);
            setAdminStats(null);
            setAdminWorkflow([]);
          }
          return;
        }

        if (utilisateur.role === "inspecteur" || utilisateur.role === "aneti") {
          const overview = await fetchSupervisionResource<SupervisionOverview>("/statistics/overview");
          const cards: WorkspaceStatCard[] = [
            {
              label: t("supervision.dashboard.companiesInScope"),
              value: overview.totals.total_companies,
              hint: t("supervision.dashboard.activeCompanies", {
                count: overview.totals.active_companies,
              }),
            },
            {
              label: t("supervision.dashboard.openRoles"),
              value: overview.totals.total_offers,
              hint: t("supervision.dashboard.applicationsTracked", {
                count: overview.totals.total_applications,
              }),
            },
            {
              label: t("supervision.dashboard.shortlistedCandidates"),
              value: overview.totals.shortlisted_candidates,
              hint: t("supervision.dashboard.applicationsRate", {
                rate: overview.rates.shortlist_rate,
              }),
            },
            {
              label: t("supervision.dashboard.hiredCandidates"),
              value: overview.totals.hired_candidates,
              hint: t("supervision.dashboard.hiringRate", {
                rate: overview.rates.hiring_rate,
              }),
            },
          ];

          if (active) {
            setWorkspaceStats(cards);
            setCandidateStats([]);
            setAdminStats(null);
            setAdminWorkflow([]);
          }
          return;
        }

        if (active) {
          setWorkspaceStats([]);
          setCandidateStats([]);
          setAdminStats(null);
          setAdminWorkflow([]);
        }
      } catch (error: unknown) {
        if (active) {
          setWorkspaceStats([]);
          setCandidateStats([]);
          setAdminStats(null);
          setAdminWorkflow([]);
          setErreurStats(
            error instanceof Error
              ? error.message
              : utilisateur.role === "candidat"
                ? t("home.candidate.loadStatsError")
                : t("home.workspace.noRealDataDescription"),
          );
        }
      } finally {
        if (active) {
          setLoadingStats(false);
        }
      }
    };

    void charger();

    return () => {
      active = false;
    };
  }, [t, utilisateur]);

  if (!utilisateur) {
    return null;
  }

  if (utilisateur.role === "candidat") {
    return (
      <CandidateHome
        utilisateurNom={utilisateur.nom}
        stats={candidateStats}
        loadingStats={loadingStats}
        erreurStats={erreurStats}
        t={t}
      />
    );
  }

  if (utilisateur.role === "entreprise") {
    return (
      <EntrepriseHome
        utilisateurNom={utilisateur.nom}
        stats={workspaceStats}
        loadingStats={loadingStats}
        erreurStats={erreurStats}
      />
    );
  }

  const contenu = buildWorkspaceContent(utilisateur.role, t);

  if (isShowcaseWorkspaceRole(utilisateur.role)) {
    return (
      <RoleWorkspaceHome
        role={utilisateur.role}
        utilisateurNom={utilisateur.nom}
        content={contenu}
        stats={workspaceStats}
        adminStats={adminStats}
        adminWorkflow={adminWorkflow}
        loadingStats={loadingStats}
        erreurStats={erreurStats}
        t={t}
      />
    );
  }

  return (
    <div className="app-page">
      <PageHeader
        badge={contenu.badge}
        title={contenu.title}
        description={contenu.description}
        tone="dark"
        actions={
          <ButtonLink href={contenu.actions[0].href} variant="secondary">
            {t("home.workspace.openNextStep")}
          </ButtonLink>
        }
      />

      {loadingStats && (utilisateur.role === "admin" || utilisateur.role === "inspecteur" || utilisateur.role === "aneti") ? (
        <LoadingState
          title={t("common.loadingWorkspaceTitle")}
          description={t("common.loadingWorkspaceDescription")}
        />
      ) : null}

      {workspaceStats.length > 0 ? (
        <section className="stat-grid">
          {workspaceStats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </section>
      ) : null}

      {erreurStats && workspaceStats.length === 0 && utilisateur.role === "entreprise" ? (
        <div className="message message-erreur">{erreurStats}</div>
      ) : null}

      <section className="surface-grid surface-grid-3">
        {contenu.actions.map((action) => (
          <Card key={action.href} interactive padding="lg">
            <div className="stack-lg">
              <div>
                <p className="badge">{action.title}</p>
                <h2 style={{ margin: 0, fontSize: "1.35rem", fontFamily: "var(--app-heading)" }}>
                  {action.title}
                </h2>
                <p className="texte-secondaire" style={{ margin: "12px 0 0" }}>
                  {action.text}
                </p>
              </div>
              <button
                className="ui-button ui-button-secondary"
                onClick={() => router.push(action.href)}
                type="button"
              >
                {t("home.workspace.openSection")}
              </button>
            </div>
          </Card>
        ))}
      </section>

      <Card tone="accent" padding="lg">
        <div className="split-grid">
          <div>
            <p className="badge">{t("home.workspace.oneSystemBadge")}</p>
            <h2 style={{ margin: 0, fontSize: "2rem", fontFamily: "var(--app-heading)" }}>
              {t("home.workspace.oneSystemTitle")}
            </h2>
          </div>
          <p className="texte-secondaire" style={{ margin: 0 }}>
            {t("home.workspace.oneSystemDescription")}
          </p>
        </div>
      </Card>
    </div>
  );
}

function RoleWorkspaceHome({
  role,
  utilisateurNom,
  content,
  stats,
  adminStats,
  adminWorkflow,
  loadingStats,
  erreurStats,
  t,
}: {
  role: string;
  utilisateurNom: string;
  content: WorkspaceContent;
  stats: WorkspaceStatCard[];
  adminStats: StatistiquesAdmin | null;
  adminWorkflow: WorkflowPoint[];
  loadingStats: boolean;
  erreurStats: string | null;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}) {
  const firstName = utilisateurNom.split(" ")[0] || utilisateurNom || "HandiTalents";
  const primaryAction = content.actions[0];
  const secondaryAction = content.actions[1] ?? content.actions[0];
  const highlightedStats =
    stats.length > 0
      ? stats.slice(0, 2)
      : content.actions.slice(0, 2).map((action) => ({
          label: action.title,
          value: "—",
          hint: action.text,
        }));
  const insightItems =
    stats.length > 0
      ? stats.slice(0, 3).map((item) => ({
          title: item.label,
          text: item.hint || t("home.workspace.showcase.realDataText"),
        }))
      : content.actions.slice(0, 3).map((action) => ({
          title: action.title,
          text: action.text,
        }));
  const stripItems = Array.from(
    new Set(
      (stats.length > 0 ? stats.map((item) => item.label) : content.actions.map((action) => action.title)).slice(0, 5),
    ),
  );

  if (loadingStats && stats.length === 0) {
    return (
      <main className="page-centree section-page app-theme">
        <LoadingState
          title={t("common.loadingWorkspaceTitle")}
          description={t("common.loadingWorkspaceDescription")}
        />
      </main>
    );
  }

  return (
    <div className="candidate-showcase">
      <section className="candidate-showcase-hero">
        <div className="candidate-showcase-copy">
          <p className="candidate-showcase-tag">{content.badge}</p>
          <h1>{content.title}</h1>
          <p>{t("home.workspace.showcase.welcome", { name: firstName, description: content.description })}</p>
          <div className="candidate-showcase-actions">
            <ButtonLink href={primaryAction.href}>{primaryAction.title}</ButtonLink>
            {secondaryAction ? (
              <ButtonLink href={secondaryAction.href} variant="secondary">
                {secondaryAction.title}
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="candidate-showcase-visual">
          <div className="candidate-showcase-image-wrap">
            <div className="candidate-showcase-image" aria-hidden="true" />
          </div>
          {highlightedStats[0] ? (
            <div className="candidate-showcase-pill candidate-showcase-pill-top">
              <strong>{highlightedStats[0].value}</strong>
              <span>{highlightedStats[0].label}</span>
            </div>
          ) : null}
          {highlightedStats[1] ? (
            <div className="candidate-showcase-pill candidate-showcase-pill-right">
              <strong>{highlightedStats[1].value}</strong>
              <span>{highlightedStats[1].label}</span>
            </div>
          ) : null}
        </div>
      </section>

      {stripItems.length > 0 ? (
        <section className="candidate-showcase-strip">
          {stripItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </section>
      ) : null}

      {erreurStats ? <div className="message message-erreur">{erreurStats}</div> : null}

      {role === "admin" && adminStats ? (
        <section id="admin-stats" className="stack-lg">
          <div className="surface-grid surface-grid-4">
            <StatCard
              label={t("adminStats.totalApplications")}
              value={adminStats.total_candidatures ?? 0}
            />
            <StatCard
              label={t("adminStats.hiringRate")}
              value={`${formatPercent(adminStats.taux_recrutement)} %`}
            />
            <StatCard
              label={t("adminStats.averageTime")}
              value={formatPercent(adminStats.temps_moyen_traitement_jours)}
            />
            <StatCard
              label={t("adminStats.pending")}
              value={sumStatuses(adminStats.stats_par_statut, ["pending", "en_attente"])}
            />
          </div>

          <Card className="profile-surface">
            <div className="profile-surface-head">
              <div>
                <strong>{t("adminStats.statusBreakdown")}</strong>
              </div>
            </div>

            <div className="surface-grid surface-grid-3">
              {adminStats.stats_par_statut.map((item) => (
                <div key={`${item.statut}-${item.count}`} className="detail-box">
                  <strong>{translateStatusLabel(item.statut, t)}</strong>
                  <span>{item.count ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="profile-surface">
            <div className="profile-surface-head">
              <div>
                <strong>{t("adminStats.workflowTitle")}</strong>
                <p className="texte-secondaire" style={{ margin: "6px 0 0" }}>
                  {t("adminStats.workflowDescription")}
                </p>
              </div>
            </div>

            {adminWorkflow.length === 0 ? (
              <p className="texte-secondaire" style={{ margin: 0 }}>
                {t("adminStats.noRecentData")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>{t("adminStats.columns.date")}</th>
                      <th>{t("adminStats.columns.new")}</th>
                      <th>{t("adminStats.columns.shortlisted")}</th>
                      <th>{t("adminStats.columns.interviews")}</th>
                      <th>{t("adminStats.columns.accepted")}</th>
                      <th>{t("adminStats.columns.rejected")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminWorkflow.map((point) => (
                      <tr key={point.date}>
                        <td>{formatDate(point.date)}</td>
                        <td>{point.nouvelles ?? 0}</td>
                        <td>{point.shortlistees ?? 0}</td>
                        <td>{point.entretiens ?? 0}</td>
                        <td>{point.acceptees ?? 0}</td>
                        <td>{point.refusees ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="profile-surface">
            <div className="profile-surface-head">
              <div>
                <strong>{t("adminStats.topCompaniesTitle")}</strong>
              </div>
            </div>

            {adminStats.entreprises_actives.length === 0 ? (
              <p className="texte-secondaire" style={{ margin: 0 }}>
                {t("adminStats.noCompanyActivity")}
              </p>
            ) : (
              <div className="space-y-3">
                {adminStats.entreprises_actives.map((entreprise) => (
                  <div key={entreprise.entreprise_nom} className="profile-preference-row">
                    <div className="profile-preference-copy">
                      <strong>{entreprise.entreprise_nom}</strong>
                      <p>
                        {t("adminStats.companySummary", {
                          offers: entreprise.nombre_offres ?? 0,
                          applications: entreprise.nombre_candidatures ?? 0,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      ) : null}

      <section className="candidate-showcase-learning">
        <div className="candidate-showcase-collage">
          <div className="candidate-showcase-collage-image" aria-hidden="true" />
        </div>
        <div className="candidate-showcase-learning-copy">
          <p className="candidate-showcase-tag">{t("home.workspace.showcase.focusTag")}</p>
          <h2>{t("home.workspace.showcase.focusTitle")}</h2>
          <div className="candidate-showcase-benefits">
            {insightItems.map((item) => (
              <div key={item.title} className="candidate-showcase-benefit">
                <div className="candidate-showcase-benefit-icon" aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="candidate-showcase-courses">
        <div className="candidate-showcase-courses-head">
          <p className="candidate-showcase-tag">{t("home.workspace.showcase.sectionsTag")}</p>
          <h2>{t("home.workspace.showcase.sectionsTitle")}</h2>
        </div>
        <div className="candidate-showcase-cards">
          {content.actions.map((action, index) => (
            <article key={action.href} className="candidate-showcase-card">
              <div
                className={`candidate-showcase-card-image candidate-showcase-card-image-${(index % 3) + 1}`}
                aria-hidden="true"
              />
              <strong>{action.title}</strong>
              <p>{action.text}</p>
              <ButtonLink href={action.href} variant="secondary">
                {t("home.workspace.openSection")}
              </ButtonLink>
            </article>
          ))}
        </div>
      </section>

      {stats.length > 0 ? (
        <section className="candidate-showcase-stats">
          {stats.slice(0, 4).map((stat) => (
            <div key={stat.label} className="candidate-showcase-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>
      ) : (
        <section className="candidate-showcase-search">
          <p className="candidate-showcase-tag">{t("home.workspace.oneSystemBadge")}</p>
          <h2>{t("home.workspace.noRealDataTitle")}</h2>
          <p className="texte-secondaire" style={{ margin: "12px auto 0", maxWidth: 680 }}>
            {t("home.workspace.noRealDataDescription")}
          </p>
        </section>
      )}

      <section className="candidate-showcase-final">
        <div className="candidate-showcase-final-copy">
          <p className="candidate-showcase-tag">{t("home.workspace.oneSystemBadge")}</p>
          <h2>{t("home.workspace.oneSystemTitle")}</h2>
          <p>{t("home.workspace.oneSystemDescription")}</p>
          <div className="candidate-showcase-actions">
            {content.actions.map((action) => (
              <ButtonLink key={action.href} href={action.href} variant="secondary">
                {action.title}
              </ButtonLink>
            ))}
          </div>
        </div>
        <div className="candidate-showcase-final-visual">
          <div className="candidate-showcase-final-image" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}

function CandidateHome({
  utilisateurNom,
  stats,
  loadingStats,
  erreurStats,
  t,
}: {
  utilisateurNom: string;
  stats: CandidateStatItem[];
  loadingStats: boolean;
  erreurStats: string | null;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}) {
  const statsMap = useMemo(
    () =>
      stats.reduce<Record<string, number>>((acc, item) => {
        acc[item.statut] = Number(item.count) || 0;
        return acc;
      }, {}),
    [stats],
  );

  const featureCards = useMemo(
    () => [
      {
        title: t("home.candidate.features.onlineTitle"),
        text: t("home.candidate.features.onlineText"),
      },
      {
        title: t("home.candidate.features.courseTitle"),
        text: t("home.candidate.features.courseText"),
      },
      {
        title: t("home.candidate.features.supportTitle"),
        text: t("home.candidate.features.supportText"),
      },
    ],
    [t],
  );

  const quickLinks = useMemo(
    () => [
      {
        title: t("home.candidate.quickLinks.jobsTitle"),
        text: t("home.candidate.quickLinks.jobsText"),
        href: "/offres",
      },
      {
        title: t("home.candidate.quickLinks.applicationsTitle"),
        text: t("home.candidate.quickLinks.applicationsText"),
        href: "/candidat/candidatures",
      },
      {
        title: t("home.candidate.quickLinks.cvTitle"),
        text: t("home.candidate.quickLinks.cvText"),
        href: "/candidat/cv",
      },
      {
        title: t("home.candidate.quickLinks.messagesTitle"),
        text: t("home.candidate.quickLinks.messagesText"),
        href: "/messages",
      },
    ],
    [t],
  );

  const popularCards = useMemo(
    () => [
      {
        title: t("home.candidate.popularCards.designTitle"),
        text: t("home.candidate.popularCards.designText"),
        href: "/offres",
      },
      {
        title: t("home.candidate.popularCards.cvTitle"),
        text: t("home.candidate.popularCards.cvText"),
        href: "/candidat/cv",
      },
      {
        title: t("home.candidate.popularCards.interviewTitle"),
        text: t("home.candidate.popularCards.interviewText"),
        href: "/candidat/entretiens",
      },
    ],
    [t],
  );

  const total = Object.values(statsMap).reduce((sum, count) => sum + count, 0);
  const pending = statsMap.pending || 0;
  const shortlisted = statsMap.shortlisted || 0;
  const accepted = statsMap.accepted || 0;
  const firstName = utilisateurNom.split(" ")[0] || utilisateurNom || "HandiTalents";

  if (loadingStats && stats.length === 0) {
    return (
      <main className="page-centree section-page app-theme">
        <LoadingState
          title={t("common.loadingWorkspaceTitle")}
          description={t("common.loadingWorkspaceDescription")}
        />
      </main>
    );
  }

  return (
    <div className="candidate-showcase">
      <section className="candidate-showcase-hero">
        <div className="candidate-showcase-copy">
          <p className="candidate-showcase-tag">{t("home.candidate.tag")}</p>
          <h1 style={{ whiteSpace: "pre-line" }}>{t("home.candidate.heroTitle")}</h1>
          <p>{t("home.candidate.heroDescription", { name: firstName })}</p>
          <div className="candidate-showcase-actions">
            <ButtonLink href="/offres">{t("home.candidate.exploreJobs")}</ButtonLink>
            <ButtonLink href="/candidat/cv" variant="secondary">
              {t("home.candidate.buildCv")}
            </ButtonLink>
          </div>
        </div>

        <div className="candidate-showcase-visual">
          <div className="candidate-showcase-image-wrap">
            <div className="candidate-showcase-image" aria-hidden="true" />
          </div>
          <div className="candidate-showcase-pill candidate-showcase-pill-top">
            <strong>{shortlisted}</strong>
            <span>{t("home.candidate.shortlistedLabel")}</span>
          </div>
          <div className="candidate-showcase-pill candidate-showcase-pill-right">
            <strong>{accepted}</strong>
            <span>{t("home.candidate.acceptedLabel")}</span>
          </div>
        </div>
      </section>

      <section className="candidate-showcase-learning">
        <div className="candidate-showcase-collage">
          <div className="candidate-showcase-collage-image" aria-hidden="true" />
        </div>
        <div className="candidate-showcase-learning-copy">
          <p className="candidate-showcase-tag">{t("home.candidate.learningTag")}</p>
          <h2>{t("home.candidate.learningTitle")}</h2>
          <div className="candidate-showcase-benefits">
            {featureCards.map((item) => (
              <div key={item.title} className="candidate-showcase-benefit">
                <div className="candidate-showcase-benefit-icon" aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {erreurStats ? <div className="message message-erreur">{erreurStats}</div> : null}

      <section className="candidate-showcase-courses">
        <div className="candidate-showcase-courses-head">
          <p className="candidate-showcase-tag">{t("home.candidate.sectionsTag")}</p>
          <h2>{t("home.candidate.sectionsTitle")}</h2>
        </div>
        <div className="candidate-showcase-cards">
          {popularCards.map((item, index) => (
            <article key={item.title} className="candidate-showcase-card">
              <div
                className={`candidate-showcase-card-image candidate-showcase-card-image-${index + 1}`}
                aria-hidden="true"
              />
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <ButtonLink href={item.href} variant="secondary">
                {t("home.candidate.open")}
              </ButtonLink>
            </article>
          ))}
        </div>
      </section>

      <section className="candidate-showcase-stats">
        <div className="candidate-showcase-stat">
          <strong>{total}</strong>
          <span>{t("home.candidate.stats.total")}</span>
        </div>
        <div className="candidate-showcase-stat">
          <strong>{pending}</strong>
          <span>{t("home.candidate.stats.pending")}</span>
        </div>
        <div className="candidate-showcase-stat">
          <strong>{shortlisted}</strong>
          <span>{t("home.candidate.stats.shortlisted")}</span>
        </div>
        <div className="candidate-showcase-stat">
          <strong>{accepted}</strong>
          <span>{t("home.candidate.stats.accepted")}</span>
        </div>
      </section>

      <section className="candidate-showcase-final">
        <div className="candidate-showcase-final-copy">
          <p className="candidate-showcase-tag">{t("home.candidate.finalTag")}</p>
          <h2>{t("home.candidate.finalTitle")}</h2>
          <p>{t("home.candidate.finalDescription")}</p>
          <div className="candidate-showcase-actions">
            {quickLinks.slice(0, 3).map((item) => (
              <ButtonLink key={item.href} href={item.href} variant="secondary">
                {item.title}
              </ButtonLink>
            ))}
          </div>
        </div>
        <div className="candidate-showcase-final-visual">
          <div className="candidate-showcase-final-image" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}

function sumStatuses(items: StatParStatut[] | undefined, statuses: string[]) {
  if (!items) {
    return 0;
  }

  const normalized = new Set(statuses.map(normalizeStatus));
  return items.reduce((total, item) => {
    return total + (normalized.has(normalizeStatus(item.statut)) ? item.count : 0);
  }, 0);
}

function translateStatusLabel(status: string, t: (key: string) => string) {
  switch (normalizeStatus(status)) {
    case "pending":
    case "en_attente":
      return t("adminStats.statuses.pending");
    case "new":
    case "nouvelles":
    case "nouvelle":
      return t("adminStats.statuses.new");
    case "shortlisted":
    case "shortlistees":
    case "shortlistee":
      return t("adminStats.statuses.shortlisted");
    case "interviews":
    case "interview":
    case "entretiens":
    case "entretien":
      return t("adminStats.statuses.interviews");
    case "accepted":
    case "acceptees":
    case "acceptee":
      return t("adminStats.statuses.accepted");
    case "rejected":
    case "refusees":
    case "refusee":
      return t("adminStats.statuses.rejected");
    default:
      return humanizeStatus(status);
  }
}

function normalizeStatus(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function humanizeStatus(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatPercent(value: number | undefined) {
  return Number(value ?? 0).toFixed(1);
}
