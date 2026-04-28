"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { authenticatedFetch } from "@/lib/auth-utils";
import { construireUrlApi } from "@/lib/config";
import {
  construireLienGoogleCalendar,
  extraireDureeMinutes,
  formaterDateEntretien,
  getEntretienStatutConfig,
  getEntretienTypeLabel,
} from "@/lib/entretiens";

type EntretienEntreprise = {
  entretien: {
    id: string;
    date_heure: string;
    type: "visio" | "presentiel" | "telephonique";
    lieu_visio?: string | null;
    lieu?: string | null;
    statut: "planifie" | "confirme" | "reporte" | "annule" | "termine";
    duree_prevue?: string | null;
    contact_entreprise?: string | null;
    notes?: string | null;
  };
  candidature?: {
    id?: string;
    statut?: string;
  };
  candidat?: {
    nom?: string;
    email?: string;
    telephone?: string;
  };
  offre?: {
    titre?: string;
  };
};

type EntretienFormulaire = {
  date_heure: string;
  type: "visio" | "presentiel" | "telephonique";
  lieu_visio: string;
  lieu: string;
  duree_prevue: string;
  contact_entreprise: string;
  notes: string;
};

type FormEdition = EntretienFormulaire;
type FormPlanification = EntretienFormulaire & { id_candidature: string };

type CandidateurePlanifiable = {
  candidature: {
    id: string;
    statut?: "pending" | "shortlisted" | "interview_scheduled" | "rejected" | "accepted";
  };
  candidat?: {
    nom?: string;
    email?: string;
    telephone?: string;
  };
  offre?: {
    titre?: string;
  };
};

type EntretiensEntreprisePayload = {
  message?: string;
  donnees?: EntretienEntreprise[];
};

type CandidateuresPlanifiablesPayload = {
  message?: string;
  donnees?: CandidateurePlanifiable[];
};

function versDateTimeLocal(dateString?: string) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const formulaireVide: EntretienFormulaire = {
  date_heure: "",
  type: "visio",
  lieu_visio: "",
  lieu: "",
  duree_prevue: "60 minutes",
  contact_entreprise: "",
  notes: "",
};

const formulairePlanificationInitial: FormPlanification = {
  id_candidature: "",
  ...formulaireVide,
};

function construirePayloadEntretien(formulaire: EntretienFormulaire) {
  return {
    date_heure: new Date(formulaire.date_heure).toISOString(),
    type: formulaire.type,
    lieu_visio: formulaire.type === "visio" ? formulaire.lieu_visio : undefined,
    lieu: formulaire.type === "presentiel" ? formulaire.lieu : undefined,
    duree_prevue: formulaire.duree_prevue || undefined,
    contact_entreprise: formulaire.contact_entreprise || undefined,
    notes: formulaire.notes || undefined,
  };
}

export default function EntretiensEntreprisePage() {
  const [entretiens, setEntretiens] = useState<EntretienEntreprise[]>([]);
  const [candidaturesPlanifiables, setCandidateuresPlanifiables] = useState<CandidateurePlanifiable[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [entretienEnAction, setEntretienEnAction] = useState<string | null>(null);
  const [entretienEnEdition, setEntretienEnEdition] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState<FormEdition>(formulaireVide);
  const [planificationOuverte, setPlanificationOuverte] = useState(false);
  const [formulairePlanification, setFormulairePlanification] = useState<FormPlanification>(formulairePlanificationInitial);

  const charger = async () => {
    try {
      setLoading(true);
      setErreur(null);
      const response = await authenticatedFetch(construireUrlApi("/api/entretiens/entreprise"));
      const data: EntretiensEntreprisePayload = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load interviews.");
      }

      setEntretiens(Array.isArray(data.donnees) ? data.donnees : []);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  const chargerCandidateuresPlanifiables = async () => {
    try {
      const response = await authenticatedFetch(construireUrlApi("/api/candidatures/entreprise?limit=100"));
      const data: CandidateuresPlanifiablesPayload = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load candidates for interviews.");
      }

      const candidatures = Array.isArray(data.donnees) ? data.donnees : [];
      setCandidateuresPlanifiables(
        candidatures.filter((item) => item.candidature?.statut === "pending" || item.candidature?.statut === "shortlisted")
      );
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to load candidates for interviews.");
    }
  };

  useEffect(() => {
    void Promise.all([charger(), chargerCandidateuresPlanifiables()]);
  }, []);

  const stats = useMemo(
    () => ({
      total: entretiens.length,
      planifies: entretiens.filter((item) => item.entretien?.statut === "planifie").length,
      confirmes: entretiens.filter((item) => item.entretien?.statut === "confirme").length,
      termines: entretiens.filter((item) => item.entretien?.statut === "termine").length,
    }),
    [entretiens]
  );

  const ouvrirEdition = (item: EntretienEntreprise) => {
    setEntretienEnEdition(item.entretien.id);
    setFormulaire({
      date_heure: versDateTimeLocal(item.entretien.date_heure),
      type: item.entretien.type,
      lieu_visio: item.entretien.lieu_visio || "",
      lieu: item.entretien.lieu || "",
      duree_prevue: item.entretien.duree_prevue || "60 minutes",
      contact_entreprise: item.entretien.contact_entreprise || "",
      notes: item.entretien.notes || "",
    });
    setErreur(null);
    setInfo(null);
  };

  const fermerEdition = () => {
    setEntretienEnEdition(null);
    setFormulaire(formulaireVide);
  };

  const ouvrirPlanification = () => {
    setPlanificationOuverte(true);
    setEntretienEnEdition(null);
    setErreur(null);
    setInfo(null);
    setFormulairePlanification((courant) => ({
      ...formulairePlanificationInitial,
      id_candidature:
        courant.id_candidature || candidaturesPlanifiables[0]?.candidature.id || "",
    }));
  };

  const fermerPlanification = () => {
    setPlanificationOuverte(false);
    setFormulairePlanification(formulairePlanificationInitial);
  };

  const planifierEntretien = async () => {
    try {
      setEntretienEnAction("creation");
      setErreur(null);
      setInfo(null);

      if (!formulairePlanification.id_candidature) {
        throw new Error("Select an application before scheduling an interview.");
      }

      if (!formulairePlanification.date_heure) {
        throw new Error("The interview date and time are required.");
      }

      if (formulairePlanification.type === "visio" && !formulairePlanification.lieu_visio.trim()) {
        throw new Error("A video link is required for a video interview.");
      }

      if (formulairePlanification.type === "presentiel" && !formulairePlanification.lieu.trim()) {
        throw new Error("A location is required for an in-person interview.");
      }

      const response = await authenticatedFetch(construireUrlApi("/api/entretiens/planifier"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_candidature: formulairePlanification.id_candidature,
          ...construirePayloadEntretien(formulairePlanification),
        }),
      });
      const data: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to schedule the interview.");
      }

      setInfo(data.message || "Interview scheduled successfully.");
      fermerPlanification();
      await Promise.all([charger(), chargerCandidateuresPlanifiables()]);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to schedule the interview.");
    } finally {
      setEntretienEnAction(null);
    }
  };

  const planificationValide =
    Boolean(formulairePlanification.id_candidature) &&
    Boolean(formulairePlanification.date_heure) &&
    (formulairePlanification.type !== "visio" || Boolean(formulairePlanification.lieu_visio.trim())) &&
    (formulairePlanification.type !== "presentiel" || Boolean(formulairePlanification.lieu.trim()));

  const modifierEntretien = async (id: string) => {
    try {
      setEntretienEnAction(id);
      setErreur(null);
      setInfo(null);

      if (!formulaire.date_heure) {
        throw new Error("The interview date and time are required.");
      }

      if (formulaire.type === "visio" && !formulaire.lieu_visio.trim()) {
        throw new Error("A video link is required.");
      }

      if (formulaire.type === "presentiel" && !formulaire.lieu.trim()) {
        throw new Error("A location is required.");
      }

      const response = await authenticatedFetch(construireUrlApi(`/api/entretiens/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirePayloadEntretien(formulaire)),
      });
      const data: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update the interview.");
      }

      setInfo(data.message || "Interview updated successfully.");
      fermerEdition();
      await Promise.all([charger(), chargerCandidateuresPlanifiables()]);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to update the interview.");
    } finally {
      setEntretienEnAction(null);
    }
  };

  const lancerAction = async (id: string, action: "annuler" | "terminer") => {
    try {
      setEntretienEnAction(id);
      setErreur(null);
      setInfo(null);

      const body =
        action === "annuler"
          ? { motif: formulaire.notes || undefined }
          : { notes: formulaire.notes || undefined };

      const response = await authenticatedFetch(construireUrlApi(`/api/entretiens/${id}/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to complete this action.");
      }

      setInfo(data.message || "Action completed successfully.");
      fermerEdition();
      await Promise.all([charger(), chargerCandidateuresPlanifiables()]);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to complete this action.");
    } finally {
      setEntretienEnAction(null);
    }
  };

  return (
    <div className="app-page">
      <PageHeader
        badge="Interviews"
        title="Track, reschedule, and close scheduled interviews."
        description="This page is now connected to the company's live interview API."
        actions={
          <>
            <Button onClick={ouvrirPlanification} disabled={candidaturesPlanifiables.length === 0}>
              Schedule interview
            </Button>
            <Button variant="secondary" onClick={charger}>
              Refresh
            </Button>
            <ButtonLink href="/entreprise/candidatures" variant="ghost">
              View applications
            </ButtonLink>
          </>
        }
      />

      <section className="stat-grid">
        <StatCard label="Total" value={stats.total} hint="Interviews shown" />
        <StatCard label="Scheduled" value={stats.planifies} hint="Waiting for confirmation" />
        <StatCard label="Confirmed" value={stats.confirmes} hint="Confirmed by the candidate" />
        <StatCard label="Completed" value={stats.termines} hint="Closed in the workspace" />
      </section>

      {erreur ? <div className="message message-erreur">{erreur}</div> : null}
      {info ? <div className="message message-info">{info}</div> : null}

      {planificationOuverte ? (
        <Card tone="accent" padding="lg">
          <div className="form-section">
            <div>
              <strong style={{ fontSize: "1.1rem" }}>Invite a candidate to an interview</strong>
              <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                Select an application, set the meeting details, and the candidate will receive the interview in
                their workspace with the link and calendar entry.
              </p>
            </div>

            {candidaturesPlanifiables.length === 0 ? (
              <div className="message message-neutre">
                No applications are ready for an interview yet. Shortlist a candidate first from the applications page.
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <div className="groupe-champ">
                    <label htmlFor="candidature-planification">Application</label>
                    <select
                      id="candidature-planification"
                      className="champ-select"
                      value={formulairePlanification.id_candidature}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({ ...courant, id_candidature: event.target.value }))
                      }
                    >
                      <option value="">Select an application</option>
                      {candidaturesPlanifiables.map((item) => (
                        <option key={item.candidature.id} value={item.candidature.id}>
                          {(item.candidat?.nom || "Candidate").trim()} - {item.offre?.titre || "Role"} (
                          {item.candidature.statut === "shortlisted" ? "shortlisted" : "new application"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="groupe-champ">
                    <label htmlFor="date-planification">Date and time</label>
                    <input
                      id="date-planification"
                      className="champ"
                      type="datetime-local"
                      value={formulairePlanification.date_heure}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({ ...courant, date_heure: event.target.value }))
                      }
                    />
                  </div>

                  <div className="groupe-champ">
                    <label htmlFor="type-planification">Type</label>
                    <select
                      id="type-planification"
                      className="champ-select"
                      value={formulairePlanification.type}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({
                          ...courant,
                          type: event.target.value as FormPlanification["type"],
                        }))
                      }
                    >
                      <option value="visio">Video</option>
                      <option value="presentiel">In person</option>
                      <option value="telephonique">Phone</option>
                    </select>
                  </div>

                  <div className="groupe-champ">
                    <label htmlFor="duree-planification">Planned duration</label>
                    <input
                      id="duree-planification"
                      className="champ"
                      value={formulairePlanification.duree_prevue}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({ ...courant, duree_prevue: event.target.value }))
                      }
                    />
                  </div>

                  <div className="groupe-champ">
                    <label htmlFor="contact-planification">Company contact</label>
                    <input
                      id="contact-planification"
                      className="champ"
                      value={formulairePlanification.contact_entreprise}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({ ...courant, contact_entreprise: event.target.value }))
                      }
                    />
                  </div>
                </div>

                {formulairePlanification.type === "visio" ? (
                  <div className="groupe-champ">
                    <label htmlFor="visio-planification">Video meeting link</label>
                    <input
                      id="visio-planification"
                      className="champ"
                      placeholder="https://meet.google.com/..."
                      value={formulairePlanification.lieu_visio}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({ ...courant, lieu_visio: event.target.value }))
                      }
                    />
                  </div>
                ) : null}

                {formulairePlanification.type === "presentiel" ? (
                  <div className="groupe-champ">
                    <label htmlFor="lieu-planification">Location</label>
                    <input
                      id="lieu-planification"
                      className="champ"
                      value={formulairePlanification.lieu}
                      onChange={(event) =>
                        setFormulairePlanification((courant) => ({ ...courant, lieu: event.target.value }))
                      }
                    />
                  </div>
                ) : null}

                <div className="groupe-champ">
                  <label htmlFor="notes-planification">Notes for the candidate</label>
                  <textarea
                    id="notes-planification"
                    className="champ-zone"
                    value={formulairePlanification.notes}
                    onChange={(event) =>
                      setFormulairePlanification((courant) => ({ ...courant, notes: event.target.value }))
                    }
                  />
                </div>
              </>
            )}

            <div className="page-header-actions">
              <Button onClick={planifierEntretien} disabled={entretienEnAction === "creation" || candidaturesPlanifiables.length === 0 || !planificationValide}>
                Create interview
              </Button>
              <Button variant="secondary" onClick={() => void chargerCandidateuresPlanifiables()}>
                Refresh applications
              </Button>
              <Button variant="ghost" onClick={fermerPlanification}>
                Close
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <Card padding="lg">
          <div className="loading-state">
            <div className="spinner" aria-hidden="true" />
            <strong>Loading interviews</strong>
            <p>We are retrieving your scheduled meetings.</p>
          </div>
        </Card>
      ) : entretiens.length === 0 ? (
        <EmptyState
          title="No interviews scheduled"
          description="Schedule your first interview from an application you want to invite."
          action={
            <Button onClick={ouvrirPlanification} disabled={candidaturesPlanifiables.length === 0}>
              Schedule now
            </Button>
          }
        />
      ) : (
        <div className="list-stack">
          {entretiens.map((item) => {
            const statut = getEntretienStatutConfig(item.entretien?.statut);
            const date = formaterDateEntretien(item.entretien?.date_heure);
            const actionEnCours = entretienEnAction === item.entretien.id;
            const lieu =
              item.entretien.type === "visio"
                ? item.entretien.lieu_visio || ""
                : item.entretien.type === "presentiel"
                  ? item.entretien.lieu || ""
                  : item.entretien.contact_entreprise || item.candidat?.telephone || "";
            const lienCalendar = construireLienGoogleCalendar({
              titre: `Interview - ${item.candidat?.nom || "Candidate"}`,
              dateHeure: item.entretien.date_heure,
              dureeMinutes: extraireDureeMinutes(item.entretien.duree_prevue || undefined),
              details: `${item.offre?.titre || "Role"} - ${item.candidat?.email || ""}`,
              location: lieu,
            });

            return (
              <Card key={item.entretien.id} padding="lg">
                <div className="stack-lg">
                  <div className="notification-meta">
                    <div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "1.2rem" }}>{item.candidat?.nom || "Candidate"}</strong>
                        <span className={`status-pill ${statut.className}`}>{statut.label}</span>
                      </div>
                      <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                        {item.offre?.titre || "Role"} - {date.date} at {date.time}
                      </p>
                    </div>
                    <div className="page-header-actions">
                      <a
                        className="ui-button ui-button-ghost"
                        href={lienCalendar}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Add to calendar
                      </a>
                      {item.entretien.type === "visio" && item.entretien.lieu_visio ? (
                        <a
                          className="ui-button ui-button-secondary"
                          href={item.entretien.lieu_visio}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open video link
                        </a>
                      ) : null}
                      {item.entretien.statut !== "annule" && item.entretien.statut !== "termine" ? (
                        <Button variant="ghost" onClick={() => ouvrirEdition(item)}>
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="details-grid">
                    <div className="detail-box">
                      <strong>Type</strong>
                      <p>{getEntretienTypeLabel(item.entretien.type)}</p>
                    </div>
                    <div className="detail-box">
                      <strong>Duration</strong>
                      <p>{item.entretien.duree_prevue || "-"}</p>
                    </div>
                    <div className="detail-box">
                      <strong>Contact</strong>
                      <p>{item.entretien.contact_entreprise || item.candidat?.email || "-"}</p>
                    </div>
                    <div className="detail-box">
                      <strong>Candidate phone</strong>
                      <p>{item.candidat?.telephone || "-"}</p>
                    </div>
                  </div>

                  {item.entretien.type === "presentiel" && item.entretien.lieu ? (
                    <div className="detail-box">
                      <strong>Location</strong>
                      <p>{item.entretien.lieu}</p>
                    </div>
                  ) : null}

                  {item.entretien.type === "visio" && item.entretien.lieu_visio ? (
                    <div className="detail-box">
                      <strong>Video link</strong>
                      <p>{item.entretien.lieu_visio}</p>
                    </div>
                  ) : null}

                  {item.entretien.notes ? (
                    <div className="detail-box">
                      <strong>Notes</strong>
                      <p>{item.entretien.notes}</p>
                    </div>
                  ) : null}

                  {entretienEnEdition === item.entretien.id ? (
                    <Card tone="accent" padding="lg">
                      <div className="form-section">
                        <div>
                          <strong style={{ fontSize: "1.1rem" }}>Edit this interview</strong>
                          <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                            Reschedule the time, update practical details, or close this interview.
                          </p>
                        </div>

                        <div className="form-grid">
                          <div className="groupe-champ">
                            <label htmlFor={`date-${item.entretien.id}`}>Date and time</label>
                            <input
                              id={`date-${item.entretien.id}`}
                              className="champ"
                              type="datetime-local"
                              value={formulaire.date_heure}
                              onChange={(event) => setFormulaire((courant) => ({ ...courant, date_heure: event.target.value }))}
                            />
                          </div>

                          <div className="groupe-champ">
                            <label htmlFor={`type-${item.entretien.id}`}>Type</label>
                            <select
                              id={`type-${item.entretien.id}`}
                              className="champ-select"
                              value={formulaire.type}
                              onChange={(event) =>
                                setFormulaire((courant) => ({
                                  ...courant,
                                  type: event.target.value as FormEdition["type"],
                                }))
                              }
                            >
                              <option value="visio">Video</option>
                              <option value="presentiel">In person</option>
                              <option value="telephonique">Phone</option>
                            </select>
                          </div>

                          <div className="groupe-champ">
                            <label htmlFor={`duree-${item.entretien.id}`}>Planned duration</label>
                            <input
                              id={`duree-${item.entretien.id}`}
                              className="champ"
                              value={formulaire.duree_prevue}
                              onChange={(event) => setFormulaire((courant) => ({ ...courant, duree_prevue: event.target.value }))}
                            />
                          </div>

                          <div className="groupe-champ">
                            <label htmlFor={`contact-${item.entretien.id}`}>Company contact</label>
                            <input
                              id={`contact-${item.entretien.id}`}
                              className="champ"
                              value={formulaire.contact_entreprise}
                              onChange={(event) =>
                                setFormulaire((courant) => ({ ...courant, contact_entreprise: event.target.value }))
                              }
                            />
                          </div>
                        </div>

                        {formulaire.type === "visio" ? (
                          <div className="groupe-champ">
                            <label htmlFor={`visio-${item.entretien.id}`}>Video link</label>
                            <input
                              id={`visio-${item.entretien.id}`}
                              className="champ"
                              value={formulaire.lieu_visio}
                              onChange={(event) => setFormulaire((courant) => ({ ...courant, lieu_visio: event.target.value }))}
                            />
                          </div>
                        ) : null}

                        {formulaire.type === "presentiel" ? (
                          <div className="groupe-champ">
                            <label htmlFor={`lieu-${item.entretien.id}`}>Location</label>
                            <input
                              id={`lieu-${item.entretien.id}`}
                              className="champ"
                              value={formulaire.lieu}
                              onChange={(event) => setFormulaire((courant) => ({ ...courant, lieu: event.target.value }))}
                            />
                          </div>
                        ) : null}

                        <div className="groupe-champ">
                          <label htmlFor={`notes-${item.entretien.id}`}>Notes or reason</label>
                          <textarea
                            id={`notes-${item.entretien.id}`}
                            className="champ-zone"
                            value={formulaire.notes}
                            onChange={(event) => setFormulaire((courant) => ({ ...courant, notes: event.target.value }))}
                          />
                        </div>

                        <div className="page-header-actions">
                          <Button onClick={() => modifierEntretien(item.entretien.id)} disabled={actionEnCours}>
                            Save
                          </Button>
                          <Button variant="secondary" onClick={() => lancerAction(item.entretien.id, "terminer")} disabled={actionEnCours}>
                            Mark as completed
                          </Button>
                          <Button variant="danger" onClick={() => lancerAction(item.entretien.id, "annuler")} disabled={actionEnCours}>
                            Cancel interview
                          </Button>
                          <Button variant="ghost" onClick={fermerEdition} disabled={actionEnCours}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

