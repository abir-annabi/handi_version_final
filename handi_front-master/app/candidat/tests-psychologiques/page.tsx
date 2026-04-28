"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { PassageTest } from "@/components/passage-test";
import { RouteProtegee } from "@/components/route-protegee";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState, PageHeader } from "@/components/ui/layout";
import { authenticatedFetch } from "@/lib/auth-utils";
import { construireUrlApi } from "@/lib/config";

type TestDisponible = {
  id_test: string;
  titre: string;
  description?: string;
  type_test?: string;
  duree_minutes?: number;
  instructions?: string;
  deja_passe?: boolean;
  peut_passer?: boolean;
};

type Resultat = {
  id_resultat: string;
  score_obtenu?: number | string;
  pourcentage?: number | string;
  est_visible?: boolean;
  date_passage?: string;
  temps_passe_minutes?: number;
  peut_modifier_visibilite?: boolean;
  test?: {
    id_test?: string;
    titre?: string;
    type_test?: string;
  };
};

type TestEnCours = {
  id_test: string;
  titre: string;
  description: string;
  duree_minutes: number;
  instructions: string;
  questions: Array<{
    id_question: string;
    contenu_question: string;
    type_question: "choix_multiple" | "vrai_faux" | "echelle_likert" | "texte_libre";
    ordre: number;
    obligatoire: boolean;
    options: Array<{
      id_option: string;
      texte_option: string;
      ordre: number;
    }>;
  }>;
};

const RESULTAT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TestsPsychologiquesCandidatPage() {
  return (
    <RouteProtegee rolesAutorises={["candidat"]}>
      <CandidateAssessmentsPage />
    </RouteProtegee>
  );
}

function CandidateAssessmentsPage() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [testsDisponibles, setTestsDisponibles] = useState<TestDisponible[]>([]);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [testEnCours, setTestEnCours] = useState<TestEnCours | null>(null);
  const [testDemarrageId, setTestDemarrageId] = useState<string | null>(null);
  const [visibiliteResultatId, setVisibiliteResultatId] = useState<string | null>(null);

  const localeCode = locale === "ar" ? "ar-TN" : locale === "en" ? "en-US" : "fr-FR";
  const assessmentLabels = useMemo(
    () => ({
      starting: locale === "ar" ? "جارٍ البدء..." : locale === "en" ? "Starting..." : "Démarrage...",
      startError:
        locale === "ar"
          ? "تعذر بدء الاختبار."
          : locale === "en"
            ? "Unable to start the assessment."
            : "Impossible de démarrer le test.",
      testPassed:
        locale === "ar" ? "تم اجتياز الاختبار" : locale === "en" ? "Test passed" : "Test passé",
      unavailable: locale === "ar" ? "غير متاح" : locale === "en" ? "Unavailable" : "Indisponible",
      testCompleted:
        locale === "ar"
          ? "تم إكمال الاختبار بنجاح."
          : locale === "en"
            ? "Test completed successfully."
            : "Test terminé avec succès.",
    }),
    [locale],
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeCode, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [localeCode],
  );

  const charger = async () => {
    try {
      setLoading(true);
      setErreur(null);

      const [testsRes, resultsRes] = await Promise.all([
        authenticatedFetch(construireUrlApi("/api/tests-psychologiques/candidat/tests-disponibles")),
        authenticatedFetch(construireUrlApi("/api/tests-psychologiques/candidat/mes-resultats")),
      ]);

      const testsData = await testsRes.json().catch(() => ({}));
      const resultsData = await resultsRes.json().catch(() => ({}));

      if (!testsRes.ok && !resultsRes.ok) {
        throw new Error(
          testsData.message || resultsData.message || t("assessments.candidate.loadError"),
        );
      }

      const tests = Array.isArray(testsData?.donnees?.tests) ? testsData.donnees.tests : [];
      const rawResults = Array.isArray(resultsData?.donnees?.resultats)
        ? resultsData.donnees.resultats
        : [];

      setTestsDisponibles(tests);
      setResultats(rawResults);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : t("assessments.candidate.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const chargerInitial = useEffectEvent(() => {
    void charger();
  });

  useEffect(() => {
    chargerInitial();
  }, []);

  const commencerTest = async (idTest: string) => {
    try {
      setErreur(null);
      setMessage(null);
      setTestDemarrageId(idTest);

      const response = await authenticatedFetch(
        construireUrlApi(`/api/tests-psychologiques/candidat/tests/${idTest}/commencer`),
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || assessmentLabels.startError);
      }

      const donnees = data?.donnees;
      if (!donnees?.id_test) {
        throw new Error(assessmentLabels.startError);
      }

      setTestEnCours({
        id_test: donnees.id_test,
        titre: donnees.titre || "",
        description: donnees.description || "",
        duree_minutes: Number(donnees.duree_minutes || 0),
        instructions: donnees.instructions || "",
        questions: Array.isArray(donnees.questions) ? donnees.questions : [],
      });
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : assessmentLabels.startError);
    } finally {
      setTestDemarrageId(null);
    }
  };

  const toggleVisibilite = async (id: string, actuel?: boolean) => {
    if (!RESULTAT_UUID_REGEX.test(id)) {
      setErreur(t("assessments.candidate.updateVisibilityError"));
      return;
    }

    try {
      setMessage(null);
      setErreur(null);
      setVisibiliteResultatId(id);

      const res = await authenticatedFetch(
        construireUrlApi(`/api/tests-psychologiques/candidat/resultats/${id}/visibilite`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ est_visible: !actuel }),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || t("assessments.candidate.updateVisibilityError"));
      }

      setResultats((current) =>
        current.map((item) =>
          item.id_resultat === id ? { ...item, est_visible: !actuel } : item,
        ),
      );
      setMessage(t("assessments.candidate.updatedVisibility"));
    } catch (error: unknown) {
      setErreur(
        error instanceof Error ? error.message : t("assessments.candidate.updateVisibilityError"),
      );
    } finally {
      setVisibiliteResultatId(null);
    }
  };

  if (loading) {
    return (
      <main className="page-centree section-page app-theme">
        <LoadingState
          title={t("assessments.candidate.loadingTitle")}
          description={t("assessments.candidate.loadingDescription")}
        />
      </main>
    );
  }

  if (testEnCours) {
    return (
      <PassageTest
        test={testEnCours}
        onTerminer={() => {
          setTestEnCours(null);
          setMessage(assessmentLabels.testCompleted);
          void charger();
        }}
        onAnnuler={() => {
          setTestEnCours(null);
        }}
      />
    );
  }

  return (
    <div className="app-page">
      <PageHeader
        badge={t("assessments.candidate.badge")}
        title={t("assessments.candidate.title")}
        description={t("assessments.candidate.description")}
        actions={
          <Button variant="secondary" size="sm" onClick={charger}>
            {t("common.actions.refresh")}
          </Button>
        }
      />

      {erreur ? <div className="message message-erreur">{erreur}</div> : null}
      {message ? <div className="message message-info">{message}</div> : null}

      <div className="assessments-layout">
        {/* Tests Disponibles Section */}
        <div className="assessments-section">
          <div className="section-header">
            <div className="section-badge">{t("assessments.candidate.passBadge")}</div>
            <h2 className="section-title">{t("assessments.candidate.availableTitle")}</h2>
          </div>

          {testsDisponibles.length === 0 ? (
            <div className="empty-state-compact">
              <div className="empty-icon">📝</div>
              <h3>{t("assessments.candidate.availableEmptyTitle")}</h3>
              <p>{t("assessments.candidate.availableEmptyDescription")}</p>
            </div>
          ) : (
            <div className="tests-grid">
              {testsDisponibles.map((test) => (
                <div key={test.id_test} className="test-card">
                  <div className="test-card-header">
                    <h3 className="test-title">{test.titre}</h3>
                    <div className="test-meta">
                      <span className="test-type">{test.type_test || "Évaluation"}</span>
                      <span className="test-duration">{test.duree_minutes ? `${test.duree_minutes} min` : "Variable"}</span>
                    </div>
                  </div>
                  
                  <p className="test-description">
                    {test.description || t("assessments.candidate.availableFallbackDescription")}
                  </p>

                  <div className="test-card-footer">
                    {test.deja_passe ? (
                      <div className="test-status completed">
                        <span className="status-icon">✓</span>
                        {assessmentLabels.testPassed}
                      </div>
                    ) : test.peut_passer ? (
                      <Button
                        className="test-action-btn"
                        onClick={() => void commencerTest(test.id_test)}
                        disabled={testDemarrageId === test.id_test}
                      >
                        {testDemarrageId === test.id_test
                          ? assessmentLabels.starting
                          : t("assessments.candidate.readyToPass")}
                      </Button>
                    ) : (
                      <div className="test-status unavailable">
                        <span className="status-icon">⏳</span>
                        {assessmentLabels.unavailable}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Résultats Section */}
        <div className="assessments-section">
          <div className="section-header">
            <div className="section-badge">{t("assessments.candidate.resultsBadge")}</div>
            <h2 className="section-title">{t("assessments.candidate.resultsTitle")}</h2>
          </div>

          {resultats.length === 0 ? (
            <div className="empty-state-compact">
              <div className="empty-icon">📊</div>
              <h3>{t("assessments.candidate.resultsEmptyTitle")}</h3>
              <p>{t("assessments.candidate.resultsEmptyDescription")}</p>
            </div>
          ) : (
            <div className="results-list">
              {resultats.map((resultat) => (
                <div key={resultat.id_resultat} className="result-card">
                  <div className="result-header">
                    <div className="result-info">
                      <h3 className="result-title">{resultat.test?.titre || t("navbar.assessments")}</h3>
                      <div className="result-date">
                        {resultat.date_passage
                          ? dateFormatter.format(new Date(resultat.date_passage))
                          : t("assessments.candidate.resultAvailable")}
                      </div>
                    </div>
                    <div className={`visibility-badge ${resultat.est_visible ? "visible" : "private"}`}>
                      <span className="visibility-icon">{resultat.est_visible ? "👁️" : "🔒"}</span>
                      {resultat.est_visible
                        ? t("assessments.candidate.visible")
                        : t("assessments.candidate.private")}
                    </div>
                  </div>

                  <div className="result-stats">
                    <div className="stat-item">
                      <span className="stat-label">{t("assessments.candidate.fields.score")}</span>
                      <span className="stat-value">
                        {resultat.pourcentage
                          ? `${resultat.pourcentage}%`
                          : resultat.score_obtenu || "-"}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t("assessments.candidate.fields.timeSpent")}</span>
                      <span className="stat-value">
                        {resultat.temps_passe_minutes ? `${resultat.temps_passe_minutes} min` : "-"}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t("assessments.candidate.fields.type")}</span>
                      <span className="stat-value">{resultat.test?.type_test || "-"}</span>
                    </div>
                  </div>

                  {resultat.peut_modifier_visibilite !== false ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="visibility-toggle"
                      disabled={
                        visibiliteResultatId === resultat.id_resultat ||
                        !RESULTAT_UUID_REGEX.test(resultat.id_resultat)
                      }
                      onClick={() =>
                        void toggleVisibilite(resultat.id_resultat, resultat.est_visible)
                      }
                    >
                      {visibiliteResultatId === resultat.id_resultat
                        ? assessmentLabels.starting
                        : resultat.est_visible
                          ? t("assessments.candidate.hideFromRecruiters")
                          : t("assessments.candidate.showToRecruiters")}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .assessments-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-height: calc(100vh - 200px);
          overflow: hidden;
        }

        .assessments-section {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .section-header {
          margin-bottom: 1.5rem;
          flex-shrink: 0;
        }

        .section-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, var(--app-secondary), rgba(var(--app-secondary-rgb), 0.7));
          color: var(--app-primary);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .section-title {
          margin: 0;
          font-size: 1.5rem;
          font-family: var(--app-heading);
          color: var(--app-primary);
          font-weight: 700;
        }

        .tests-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
          padding-right: 0.5rem;
          max-height: calc(100vh - 300px);
        }

        .test-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(var(--app-secondary-rgb), 0.1));
          border: 1px solid rgba(var(--app-primary-rgb), 0.1);
          border-radius: var(--app-radius-md);
          padding: 1.25rem;
          box-shadow: var(--app-shadow-soft);
          transition: all 0.2s ease;
        }

        .test-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--app-shadow);
          border-color: rgba(var(--app-primary-rgb), 0.2);
        }

        .test-card-header {
          margin-bottom: 0.75rem;
        }

        .test-title {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--app-primary);
          line-height: 1.3;
        }

        .test-meta {
          display: flex;
          gap: 0.75rem;
          font-size: 0.8rem;
        }

        .test-type, .test-duration {
          padding: 0.2rem 0.5rem;
          background: rgba(var(--app-accent-rgb), 0.15);
          color: var(--app-primary);
          border-radius: 8px;
          font-weight: 500;
        }

        .test-description {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
          color: var(--app-text-soft);
          line-height: 1.4;
        }

        .test-card-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .test-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .test-status.completed {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
          color: #059669;
        }

        .test-status.unavailable {
          background: rgba(var(--app-muted), 0.1);
          color: var(--app-muted);
        }

        .status-icon {
          font-size: 0.9rem;
        }

        .test-action-btn {
          background: linear-gradient(135deg, var(--app-primary), var(--app-primary-hover)) !important;
          border: none !important;
          color: white !important;
          font-weight: 600 !important;
          padding: 0.6rem 1.2rem !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }

        .test-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(var(--app-primary-rgb), 0.3);
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
          padding-right: 0.5rem;
          max-height: calc(100vh - 300px);
        }

        .result-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(var(--app-secondary-rgb), 0.08));
          border: 1px solid rgba(var(--app-primary-rgb), 0.1);
          border-radius: var(--app-radius-md);
          padding: 1.25rem;
          box-shadow: var(--app-shadow-soft);
          transition: all 0.2s ease;
        }

        .result-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--app-shadow);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .result-title {
          margin: 0 0 0.25rem 0;
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--app-primary);
        }

        .result-date {
          font-size: 0.8rem;
          color: var(--app-muted);
        }

        .visibility-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.6rem;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .visibility-badge.visible {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
          color: #059669;
        }

        .visibility-badge.private {
          background: rgba(var(--app-muted), 0.1);
          color: var(--app-muted);
        }

        .visibility-icon {
          font-size: 0.8rem;
        }

        .result-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: rgba(var(--app-secondary-rgb), 0.1);
          border-radius: 12px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.7rem;
          color: var(--app-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--app-primary);
        }

        .visibility-toggle {
          width: 100%;
          background: rgba(var(--app-secondary-rgb), 0.3) !important;
          color: var(--app-primary) !important;
          border: 1px solid rgba(var(--app-primary-rgb), 0.2) !important;
          font-size: 0.8rem !important;
          padding: 0.5rem !important;
        }

        .empty-state-compact {
          text-align: center;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(var(--app-secondary-rgb), 0.1));
          border: 1px solid rgba(var(--app-primary-rgb), 0.1);
          border-radius: var(--app-radius-md);
          margin-top: 1rem;
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .empty-state-compact h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: var(--app-primary);
          font-weight: 600;
        }

        .empty-state-compact p {
          margin: 0;
          font-size: 0.9rem;
          color: var(--app-text-soft);
          line-height: 1.4;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .assessments-layout {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            max-height: none;
            overflow: visible;
          }

          .tests-grid, .results-list {
            max-height: none;
            overflow-y: visible;
          }

          .result-stats {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }
        }

        @media (max-width: 640px) {
          .assessments-layout {
            gap: 1rem;
          }

          .test-card, .result-card {
            padding: 1rem;
          }

          .result-stats {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .result-header {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}