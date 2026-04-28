"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/layout";

type WorkspaceStatCard = {
  label: string;
  value: number | string;
  hint?: string;
};

interface EntrepriseHomeProps {
  utilisateurNom: string;
  stats: WorkspaceStatCard[];
  loadingStats: boolean;
  erreurStats: string | null;
}

export function EntrepriseHome({ utilisateurNom, stats, loadingStats, erreurStats }: EntrepriseHomeProps) {
  const { t } = useI18n();
  const firstName = utilisateurNom.split(" ")[0] || utilisateurNom || "HandiTalents";

  // Extract real metrics from stats or use defaults
  const dashboardMetrics = useMemo(() => {
    const getStatValue = (label: string) => {
      const stat = stats.find(s => s.label.toLowerCase().includes(label.toLowerCase()));
      return stat ? stat.value : 0;
    };

    return [
      {
        title: "Offres actives",
        value: getStatValue("offres") || getStatValue("active") || "0",
        change: stats.length > 0 ? "Données en temps réel" : "Aucune donnée",
        icon: "•",
        color: "blue"
      },
      {
        title: "Candidatures reçues", 
        value: getStatValue("total") || getStatValue("candidatures") || "0",
        change: stats.length > 0 ? "Données en temps réel" : "Aucune donnée",
        icon: "•",
        color: "green"
      },
      {
        title: "Candidats présélectionnés",
        value: getStatValue("présélectionnés") || getStatValue("shortlisted") || "0", 
        change: stats.length > 0 ? "Données en temps réel" : "Aucune donnée",
        icon: "•",
        color: "purple"
      },
      {
        title: "Candidats acceptés",
        value: getStatValue("acceptés") || getStatValue("accepted") || "0",
        change: stats.length > 0 ? "Données en temps réel" : "Aucune donnée",
        icon: "•", 
        color: "orange"
      }
    ];
  }, [stats]);

  const quickActions = useMemo(
    () => [
      {
        title: "Publier une nouvelle offre",
        description: "Créez et publiez une offre d'emploi en quelques minutes",
        href: "/entreprise/offres",
        icon: "+",
        primary: true
      },
      {
        title: "Examiner les candidatures",
        description: "Consultez les nouveaux profils et gérez vos candidats",
        href: "/entreprise/candidatures",
        icon: "•",
        primary: false
      },
      {
        title: "Planifier des entretiens",
        description: "Organisez vos entretiens et coordonnez votre équipe",
        href: "/entreprise/entretiens",
        icon: "•",
        primary: false
      }
    ],
    []
  );

  if (loadingStats) {
    return (
      <div className="entreprise-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de vos statistiques réelles...</p>
      </div>
    );
  }

  return (
    <div className="entreprise-dashboard">
      {/* Welcome Header */}
      <section className="entreprise-welcome">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1>Bonjour {firstName}</h1>
            <p>
              {stats.length > 0 
                ? "Voici vos statistiques de recrutement en temps réel basées sur vos données actuelles" 
                : "Commencez à publier des offres pour voir vos statistiques en temps réel ici"
              }
            </p>
          </div>
          <div className="welcome-actions">
            <ButtonLink href="/entreprise/offres" variant="primary" size="lg">
              Nouvelle offre
            </ButtonLink>
            <ButtonLink href="/entreprise/candidatures" variant="secondary" size="lg">
              Voir les candidats
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {erreurStats && (
        <div className="message message-erreur">
          <strong>Erreur de chargement:</strong> {erreurStats}
        </div>
      )}

      {/* Real Statistics Dashboard */}
      <section className="entreprise-metrics">
        <div className="metrics-grid">
          {dashboardMetrics.map((metric) => (
            <Card key={metric.title} className={`metric-card metric-${metric.color}`}>
              <div className="metric-header">
                <span className="metric-icon">{metric.icon}</span>
                <span className="metric-value">{metric.value}</span>
              </div>
              <div className="metric-info">
                <h3>{metric.title}</h3>
                <p className="metric-change">{metric.change}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Real Stats Section - Show actual backend data */}
      {stats.length > 0 && (
        <section className="entreprise-real-stats">
          <Card className="real-stats-card">
            <div className="card-header">
              <h2>Statistiques détaillées</h2>
              <p>Données en temps réel de votre activité de recrutement</p>
            </div>
            <div className="real-stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="real-stat-item">
                  <div className="real-stat-value">{stat.value}</div>
                  <div className="real-stat-label">{stat.label}</div>
                  {stat.hint && <div className="real-stat-hint">{stat.hint}</div>}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* No Data State */}
      {stats.length === 0 && !loadingStats && !erreurStats && (
        <section className="entreprise-no-data">
          <Card className="no-data-card">
            <div className="no-data-content">
              <div className="no-data-icon">Statistiques</div>
              <h2>Aucune donnée disponible</h2>
              <p>Commencez par publier votre première offre d'emploi pour voir vos statistiques apparaître ici.</p>
              <ButtonLink href="/entreprise/offres" variant="primary" size="lg">
                Publier ma première offre
              </ButtonLink>
            </div>
          </Card>
        </section>
      )}

      {/* Main Content Grid */}
      <section className="entreprise-content">
        <div className="content-grid">
          {/* Quick Actions */}
          <Card className="quick-actions-card">
            <div className="card-header">
              <h2>Actions rapides</h2>
              <p>Gérez efficacement vos processus de recrutement</p>
            </div>
            <div className="quick-actions-list">
              {quickActions.map((action) => (
                <div key={action.href} className={`quick-action ${action.primary ? 'primary' : ''}`}>
                  <div className="action-icon">{action.icon}</div>
                  <div className="action-content">
                    <h3>{action.title}</h3>
                    <p>{action.description}</p>
                  </div>
                  <ButtonLink 
                    href={action.href} 
                    variant={action.primary ? "primary" : "ghost"} 
                    size="sm"
                  >
                    {action.primary ? "Commencer" : "Ouvrir"}
                  </ButtonLink>
                </div>
              ))}
            </div>
          </Card>

          {/* Data Status Card */}
          <Card className="data-status-card">
            <div className="card-header">
              <h2>État des données</h2>
              <p>Informations sur vos statistiques</p>
            </div>
            <div className="data-status-content">
              {stats.length > 0 ? (
                <div className="data-available">
                  <div className="status-icon success">✓</div>
                  <div className="status-info">
                    <h3>Données en temps réel disponibles</h3>
                    <p>{stats.length} statistiques chargées depuis votre base de données</p>
                    <small>Dernière mise à jour: maintenant • Données authentiques</small>
                  </div>
                </div>
              ) : (
                <div className="data-empty">
                  <div className="status-icon warning">!</div>
                  <div className="status-info">
                    <h3>Aucune donnée</h3>
                    <p>Commencez à utiliser la plateforme pour générer des statistiques</p>
                    <ButtonLink href="/entreprise/offres" variant="ghost" size="sm">
                      Créer une offre
                    </ButtonLink>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Performance Insights */}
      <section className="entreprise-insights">
        <Card className="insights-card" tone="accent">
          <div className="insights-content">
            <div className="insights-text">
              <h2>Optimisez votre recrutement</h2>
              <p>
                {stats.length > 0 
                  ? "Analysez vos performances avec nos rapports détaillés basés sur vos données réelles"
                  : "Une fois que vous aurez des données, vous pourrez analyser vos performances ici"
                }
              </p>
            </div>
            <div className="insights-actions">
              <ButtonLink href="/entreprise/reports-requests" variant="primary">
                Voir les rapports
              </ButtonLink>
              <ButtonLink href="/entreprise/profil" variant="secondary">
                Compléter le profil
              </ButtonLink>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}