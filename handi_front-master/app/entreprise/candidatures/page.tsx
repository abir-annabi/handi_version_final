"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { authenticatedFetch } from "@/lib/auth-utils";
import { construireUrlApi } from "@/lib/config";

type StatusCandidature = "pending" | "shortlisted" | "interview_scheduled" | "rejected" | "accepted";

type CandidatureRecue = {
  id: string;
  statut: StatusCandidature;
  date_postulation: string;
  score_test?: number | null;
  lettre_motivation?: string | null;
  motif_refus?: string | null;
  cv_url?: string | null;
  candidat: {
    id?: string;
    id_utilisateur?: string;
    nom: string;
    email: string;
    telephone?: string;
    cv_url?: string | null;
    competences?: string[];
    experience?: string | null;
    handicap?: string | null;
  };
  offre: {
    id?: string;
    titre: string;
  };
};

type CandidatureDetail = {
  candidature: {
    id: string;
    statut: StatusCandidature;
    date_postulation: string;
    score_test?: number | null;
    lettre_motivation?: string | null;
    motif_refus?: string | null;
    cv_url?: string | null;
  };
  candidat: {
    nom: string;
    email: string;
    telephone?: string | null;
    competences?: string[];
    experience?: string | null;
    handicap?: string | null;
    cv_url?: string | null;
  };
  offre: {
    id?: string;
    titre: string;
    description?: string | null;
  };
  entreprise: {
    nom: string;
    contact_rh_nom?: string | null;
    contact_rh_email?: string | null;
    contact_rh_telephone?: string | null;
  };
};

type OffreOption = {
  id: string;
  titre: string;
};

type FormPlanification = {
  date_heure: string;
  type: "visio" | "presentiel" | "telephonique";
  lieu_visio: string;
  lieu: string;
  duree_prevue: string;
  contact_entreprise: string;
  notes: string;
};

type CandidatureRecueApiItem = {
  candidature?: Partial<
    Pick<
      CandidatureRecue,
      "id" | "statut" | "date_postulation" | "score_test" | "lettre_motivation" | "motif_refus" | "cv_url"
    >
  > & { created_at?: string };
  candidat?: Partial<CandidatureRecue["candidat"]>;
  offre?: Partial<CandidatureRecue["offre"]>;
};

type CandidatureRecuePayload = {
  message?: string;
  donnees?: CandidatureRecueApiItem[];
};

type CandidatureDetailApiItem = {
  candidature?: Partial<CandidatureDetail["candidature"]> & { created_at?: string };
  candidat?: Partial<CandidatureDetail["candidat"]>;
  offre?: Partial<CandidatureDetail["offre"]>;
  entreprise?: Partial<CandidatureDetail["entreprise"]>;
};

type CandidatureDetailPayload = {
  message?: string;
  donnees?: CandidatureDetailApiItem;
};

type OffreApiItem = {
  id?: string;
  id_offre?: string;
  titre?: string;
};

type OffresCompanyPayload = {
  message?: string;
  donnees?: {
    offres?: OffreApiItem[];
  } | OffreApiItem[];
};

function resolveBackendFileUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return construireUrlApi(url.startsWith("/") ? url : `/${url}`);
}

type StatistiquesItem = {
  statut?: string | null;
  count?: number | string | null;
};

type StatistiquesPayload = {
  message?: string;
  donnees?: StatistiquesItem[];
};

type StatistiquesCandidatures = {
  total: number;
  pending: number;
  shortlisted: number;
  interview_scheduled: number;
  rejected: number;
  accepted: number;
};

type RejectionOuvert = {
  id: string;
  candidatNom: string;
  offreTitre: string;
} | null;

const PAGE_SIZE = 12;
const PAGE_FETCH_LIMIT = PAGE_SIZE + 1;
const STATS_BATCH_SIZE = 100;

const formulaireInitial: FormPlanification = {
  date_heure: "",
  type: "visio",
  lieu_visio: "",
  lieu: "",
  duree_prevue: "60 minutes",
  contact_entreprise: "",
  notes: "",
};

function normaliserStatus(statut?: string): StatusCandidature {
  switch (statut) {
    case "shortlisted":
    case "interview_scheduled":
    case "rejected":
    case "accepted":
      return statut;
    case "pending":
    default:
      return "pending";
  }
}

function normaliserCandidatures(payload: CandidatureRecuePayload): CandidatureRecue[] {
  const brut = Array.isArray(payload?.donnees) ? payload.donnees : [];

  return brut.map((item, index) => ({
    id: item?.candidature?.id ?? `candidature-${index}`,
    statut: normaliserStatus(item?.candidature?.statut),
    date_postulation: item?.candidature?.date_postulation ?? item?.candidature?.created_at ?? new Date().toISOString(),
    score_test: item?.candidature?.score_test ?? null,
    lettre_motivation: item?.candidature?.lettre_motivation ?? null,
    motif_refus: item?.candidature?.motif_refus ?? null,
    cv_url: item?.candidature?.cv_url ?? item?.candidat?.cv_url ?? null,
    candidat: {
      id: item?.candidat?.id,
      id_utilisateur: item?.candidat?.id_utilisateur,
      nom: item?.candidat?.nom ?? "Candidate",
      email: item?.candidat?.email ?? "",
      telephone: item?.candidat?.telephone ?? "",
      cv_url: item?.candidat?.cv_url ?? null,
      competences: Array.isArray(item?.candidat?.competences) ? item.candidat.competences : [],
      experience: item?.candidat?.experience ?? null,
      handicap: item?.candidat?.handicap ?? null,
    },
    offre: {
      id: item?.offre?.id,
      titre: item?.offre?.titre ?? "Role",
    },
  }));
}

function normaliserCandidatureDetail(payload: CandidatureDetailPayload): CandidatureDetail | null {
  const item = payload?.donnees;
  if (!item) {
    return null;
  }

  return {
    candidature: {
      id: item.candidature?.id ?? "candidature",
      statut: normaliserStatus(item.candidature?.statut),
      date_postulation: item.candidature?.date_postulation ?? item.candidature?.created_at ?? new Date().toISOString(),
      score_test: item.candidature?.score_test ?? null,
      lettre_motivation: item.candidature?.lettre_motivation ?? null,
      motif_refus: item.candidature?.motif_refus ?? null,
      cv_url: item.candidature?.cv_url ?? null,
    },
    candidat: {
      nom: item.candidat?.nom ?? "Candidate",
      email: item.candidat?.email ?? "",
      telephone: item.candidat?.telephone ?? null,
      competences: Array.isArray(item.candidat?.competences) ? item.candidat?.competences : [],
      experience: item.candidat?.experience ?? null,
      handicap: item.candidat?.handicap ?? null,
      cv_url: item.candidat?.cv_url ?? null,
    },
    offre: {
      id: item.offre?.id,
      titre: item.offre?.titre ?? "Role",
      description: item.offre?.description ?? null,
    },
    entreprise: {
      nom: item.entreprise?.nom ?? "Company",
      contact_rh_nom: item.entreprise?.contact_rh_nom ?? null,
      contact_rh_email: item.entreprise?.contact_rh_email ?? null,
      contact_rh_telephone: item.entreprise?.contact_rh_telephone ?? null,
    },
  };
}

function normaliserOffres(payload: OffresCompanyPayload): OffreOption[] {
  const brut = Array.isArray(payload.donnees)
    ? payload.donnees
    : Array.isArray(payload.donnees?.offres)
      ? payload.donnees.offres
      : [];

  return brut
    .map((item) => ({
      id: item.id_offre ?? item.id ?? "",
      titre: item.titre ?? "Role",
    }))
    .filter((item) => item.id.length > 0);
}

function getStatusLabel(statut: StatusCandidature) {
  switch (statut) {
    case "shortlisted":
      return { label: "Shortlisted", className: "message-neutre" };
    case "interview_scheduled":
      return { label: "Interview scheduled", className: "message-info" };
    case "rejected":
      return { label: "Rejected", className: "message-erreur" };
    case "accepted":
      return { label: "Accepted", className: "message-info" };
    case "pending":
    default:
      return { label: "Pending", className: "message-neutre" };
  }
}

function formaterDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("en-US");
}

function creerStatistiquesVides(): StatistiquesCandidatures {
  return {
    total: 0,
    pending: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    rejected: 0,
    accepted: 0,
  };
}

function calculerStatistiquesDepuisCandidatures(candidatures: CandidatureRecue[]): StatistiquesCandidatures {
  const statistiques = creerStatistiquesVides();

  for (const candidature of candidatures) {
    statistiques.total += 1;
    statistiques[candidature.statut] += 1;
  }

  return statistiques;
}

function normaliserStatistiques(payload: StatistiquesPayload): StatistiquesCandidatures {
  const statistiques = creerStatistiquesVides();
  const brut = Array.isArray(payload?.donnees) ? payload.donnees : [];

  for (const item of brut) {
    const statut = normaliserStatus(typeof item?.statut === "string" ? item.statut : undefined);
    const count = Number(item?.count ?? 0);
    const valeur = Number.isFinite(count) ? count : 0;

    statistiques.total += valeur;
    statistiques[statut] += valeur;
  }

  return statistiques;
}

export default function CandidaturesCompanyPage() {
  const [candidatures, setCandidatures] = useState<CandidatureRecue[]>([]);
  const [offresAvailables, setOffresAvailables] = useState<OffreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filtreStatus, setFiltreStatus] = useState("");
  const [filtreOffre, setFiltreOffre] = useState("");
  const [offreSelectionnee, setOffreSelectionnee] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [statistiques, setStatistiques] = useState<StatistiquesCandidatures>(creerStatistiquesVides);
  const [candidatureEnAction, setCandidatureEnAction] = useState<string | null>(null);
  const [candidatureEnPlanification, setCandidatureEnPlanification] = useState<string | null>(null);
  const [candidatureEnDetails, setCandidatureEnDetails] = useState<string | null>(null);
  const [detailsCandidature, setDetailsCandidature] = useState<CandidatureDetail | null>(null);
  const [candidatureEnRejection, setCandidatureEnRejection] = useState<RejectionOuvert>(null);
  const [motifRejection, setMotifRejection] = useState("");
  const [formulaire, setFormulaire] = useState<FormPlanification>(formulaireInitial);

  const chargerOffres = async () => {
    try {
      const response = await authenticatedFetch(construireUrlApi("/api/entreprise/offres"));
      const data: OffresCompanyPayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return;
      }

      setOffresAvailables(normaliserOffres(data));
    } catch {}
  };

  const construireEndpointCandidatures = (pageCourante: number, limit: number, statut?: string) => {
    const params = new URLSearchParams({
      page: String(pageCourante),
      limit: String(limit),
    });

    if (statut) {
      params.set("statut", statut);
    }

    return offreSelectionnee
      ? `/api/candidatures/offre/${offreSelectionnee}?${params.toString()}`
      : `/api/candidatures/entreprise?${params.toString()}`;
  };

  const chargerStatistiques = async () => {
    try {
      if (!offreSelectionnee) {
        const response = await authenticatedFetch(construireUrlApi("/api/candidatures/statistiques"));
        const data: StatistiquesPayload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Unable to load statistics.");
        }

        setStatistiques(normaliserStatistiques(data));
        return;
      }

      const candidaturesToutesPages: CandidatureRecue[] = [];
      let pageStatistiques = 1;

      while (true) {
        const response = await authenticatedFetch(
          construireUrlApi(construireEndpointCandidatures(pageStatistiques, STATS_BATCH_SIZE)),
        );
        const data: CandidatureRecuePayload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Unable to load statistics.");
        }

        const lot = normaliserCandidatures(data);
        candidaturesToutesPages.push(...lot);

        if (lot.length < STATS_BATCH_SIZE) {
          break;
        }

        pageStatistiques += 1;
      }

      setStatistiques(calculerStatistiquesDepuisCandidatures(candidaturesToutesPages));
    } catch (error: unknown) {
      setStatistiques(creerStatistiquesVides());
      setErreur((courant) => courant ?? (error instanceof Error ? error.message : "Unable to load statistics."));
    }
  };

  const chargerCandidatures = async () => {
    try {
      setLoading(true);
      setErreur(null);

      const response = await authenticatedFetch(
        construireUrlApi(construireEndpointCandidatures(page, PAGE_FETCH_LIMIT, filtreStatus || undefined)),
      );
      const data: CandidatureRecuePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load applications.");
      }

      const candidaturesNormalisees = normaliserCandidatures(data);

      if (page > 1 && candidaturesNormalisees.length === 0) {
        setPage((courant) => Math.max(1, courant - 1));
        return;
      }

      setHasNextPage(candidaturesNormalisees.length > PAGE_SIZE);
      setCandidatures(candidaturesNormalisees.slice(0, PAGE_SIZE));
    } catch (error: unknown) {
      setHasNextPage(false);
      setErreur(error instanceof Error ? error.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void chargerOffres();
  }, []);

  useEffect(() => {
    void chargerCandidatures();
  }, [filtreStatus, offreSelectionnee, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void chargerStatistiques();
  }, [offreSelectionnee]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidaturesFiltrees = useMemo(
    () =>
      candidatures.filter((candidature) => {
        if (!filtreOffre) {
          return true;
        }

        const recherche = filtreOffre.toLowerCase();
        return (
          candidature.offre.titre.toLowerCase().includes(recherche) ||
          candidature.candidat.nom.toLowerCase().includes(recherche) ||
          candidature.candidat.email.toLowerCase().includes(recherche)
        );
      }),
    [candidatures, filtreOffre],
  );

  const offresPourFiltre = useMemo(() => {
    if (offresAvailables.length > 0) {
      return offresAvailables;
    }

    const map = new Map<string, OffreOption>();
    for (const candidature of candidatures) {
      if (candidature.offre.id) {
        map.set(candidature.offre.id, {
          id: candidature.offre.id,
          titre: candidature.offre.titre,
        });
      }
    }
    return Array.from(map.values());
  }, [candidatures, offresAvailables]);

  const offreSelectionneeLabel =
    offresPourFiltre.find((offre) => offre.id === offreSelectionnee)?.titre ?? "Selected role";

  const lancerActionCandidature = async (
    id: string,
    endpoint: string,
    successMessage: string,
    body?: Record<string, unknown>,
  ): Promise<boolean> => {
    try {
      setCandidatureEnAction(id);
      setErreur(null);
      setInfo(null);

      const response = await authenticatedFetch(construireUrlApi(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data: { message?: string } = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "This action could not be completed.");
      }

      setInfo(data.message || successMessage);
      await Promise.all([chargerCandidatures(), chargerStatistiques()]);
      return true;
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "This action could not be completed.");
      return false;
    } finally {
      setCandidatureEnAction(null);
    }
  };

  const ouvrirRejection = (candidature: CandidatureRecue) => {
    setErreur(null);
    setInfo(null);
    setMotifRejection("");
    setCandidatureEnRejection({
      id: candidature.id,
      candidatNom: candidature.candidat.nom,
      offreTitre: candidature.offre.titre,
    });
  };

  const fermerRejection = () => {
    if (candidatureEnRejection && candidatureEnAction === candidatureEnRejection.id) {
      return;
    }

    setCandidatureEnRejection(null);
    setMotifRejection("");
  };

  const confirmerRejection = async () => {
    if (!candidatureEnRejection) {
      return;
    }

    const succes = await lancerActionCandidature(
      candidatureEnRejection.id,
      `/api/candidatures/${candidatureEnRejection.id}/refuser`,
      "Application rejected.",
      motifRejection.trim() ? { motif_refus: motifRejection.trim() } : undefined,
    );

    if (succes) {
      fermerRejection();
    }
  };

  const ouvrirPlanification = (candidature: CandidatureRecue) => {
    setCandidatureEnPlanification(candidature.id);
    setFormulaire({
      ...formulaireInitial,
      notes: candidature.lettre_motivation ? `Application context: ${candidature.lettre_motivation}` : "",
    });
    setErreur(null);
    setInfo(null);
  };

  const fermerPlanification = () => {
    setCandidatureEnPlanification(null);
    setFormulaire(formulaireInitial);
  };

  const ouvrirDetailsCandidature = async (id: string) => {
    try {
      setCandidatureEnDetails(id);
      setErreur(null);

      const response = await authenticatedFetch(construireUrlApi(`/api/candidatures/${id}/details`));
      const data: CandidatureDetailPayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load application details.");
      }

      const candidature = normaliserCandidatureDetail(data);
      if (!candidature) {
        throw new Error("Application details are unavailable.");
      }

      setDetailsCandidature(candidature);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to load application details.");
    } finally {
      setCandidatureEnDetails(null);
    }
  };

  const fermerDetailsCandidature = () => {
    setDetailsCandidature(null);
  };

  const planifierEntretien = async (idCandidature: string) => {
    try {
      setCandidatureEnAction(idCandidature);
      setErreur(null);
      setInfo(null);

      if (!formulaire.date_heure) {
        throw new Error("The interview date and time are required.");
      }

      if (formulaire.type === "visio" && !formulaire.lieu_visio.trim()) {
        throw new Error("A video link is required for a video interview.");
      }

      if (formulaire.type === "presentiel" && !formulaire.lieu.trim()) {
        throw new Error("A location is required for an in-person interview.");
      }

      const response = await authenticatedFetch(construireUrlApi("/api/entretiens/planifier"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_candidature: idCandidature,
          date_heure: new Date(formulaire.date_heure).toISOString(),
          type: formulaire.type,
          lieu_visio: formulaire.type === "visio" ? formulaire.lieu_visio : undefined,
          lieu: formulaire.type === "presentiel" ? formulaire.lieu : undefined,
          duree_prevue: formulaire.duree_prevue || undefined,
          contact_entreprise: formulaire.contact_entreprise || undefined,
          notes: formulaire.notes || undefined,
        }),
      });
      const data: { message?: string } = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to schedule the interview.");
      }

      setInfo(data.message || "Interview scheduled avec succes.");
      fermerPlanification();
      await Promise.all([chargerCandidatures(), chargerStatistiques()]);
    } catch (error: unknown) {
      setErreur(error instanceof Error ? error.message : "Unable to schedule the interview.");
    } finally {
      setCandidatureEnAction(null);
    }
  };

  const planificationValide =
    Boolean(formulaire.date_heure) &&
    (formulaire.type !== "visio" || Boolean(formulaire.lieu_visio.trim())) &&
    (formulaire.type !== "presentiel" || Boolean(formulaire.lieu.trim()));

  return (
    <div className="app-page">
      <PageHeader
        badge="Applicants"
        title="Manage applicants, filter by role, and open live application details."
        description="This page keeps the existing hiring actions and now adds a per-role view plus a detail panel connected to the new backend routes."
        actions={
          <>
            <Button variant="secondary" onClick={() => void chargerCandidatures()}>
              Refresh
            </Button>
            <ButtonLink href="/entreprise/entretiens">Open interviews</ButtonLink>
          </>
        }
      />

      <section className="stat-grid">
        <StatCard
          label="Total"
          value={statistiques.total}
          hint={offreSelectionnee ? `All applications for ${offreSelectionneeLabel}` : "Applications received on your roles"}
        />
        <StatCard label="Pending" value={statistiques.pending} hint="Waiting for review" />
        <StatCard label="Shortlisted" value={statistiques.shortlisted} hint="Ready for interviews" />
        <StatCard
          label="Interviews"
          value={statistiques.interview_scheduled}
          hint="Applications already converted into meetings"
        />
      </section>

      <Card padding="lg">
        <div className="filters-grid">
          <div className="groupe-champ">
            <label htmlFor="filtre-offre-id">Role view</label>
            <select
              id="filtre-offre-id"
              className="champ-select"
              value={offreSelectionnee}
              onChange={(event) => {
                setPage(1);
                setOffreSelectionnee(event.target.value);
              }}
            >
              <option value="">All roles</option>
              {offresPourFiltre.map((offre) => (
                <option key={offre.id} value={offre.id}>
                  {offre.titre}
                </option>
              ))}
            </select>
          </div>

          <div className="groupe-champ">
            <label htmlFor="filtre-statut">Status</label>
            <select
              id="filtre-statut"
              className="champ-select"
              value={filtreStatus}
              onChange={(event) => {
                setPage(1);
                setFiltreStatus(event.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview scheduled</option>
              <option value="rejected">Rejected</option>
              <option value="accepted">Accepted</option>
            </select>
          </div>

          <div className="groupe-champ" style={{ gridColumn: "span 2" }}>
            <label htmlFor="filtre-offre">Local search</label>
            <input
              id="filtre-offre"
              className="champ"
              placeholder="Search by candidate, email, or role title"
              value={filtreOffre}
              onChange={(event) => setFiltreOffre(event.target.value)}
            />
          </div>
        </div>
      </Card>

      {erreur ? <div className="message message-erreur">{erreur}</div> : null}
      {info ? <div className="message message-info">{info}</div> : null}

      {loading ? (
        <Card padding="lg">
          <div className="loading-state">
            <div className="spinner" aria-hidden="true" />
            <strong>Loading applicants</strong>
            <p>We are preparing your hiring pipeline.</p>
          </div>
        </Card>
      ) : candidaturesFiltrees.length === 0 ? (
        <EmptyState
          title="No applications to display"
          description={
            offreSelectionnee
              ? `No applications match the ${offreSelectionneeLabel}.`
              : candidatures.length === 0
                ? "You have not received any applications on your roles yet."
                : "No applications match the current filters."
          }
          action={
            <Button variant="secondary" onClick={() => void chargerCandidatures()}>
              Reload
            </Button>
          }
        />
      ) : (
        <div className="list-stack">
          {candidaturesFiltrees.map((candidature) => {
            const badge = getStatusLabel(candidature.statut);
            const actionEnCours = candidatureEnAction === candidature.id;
            const detailsEnCours = candidatureEnDetails === candidature.id;

            return (
              <Card key={candidature.id} padding="lg">
                <div className="stack-lg">
                  <div className="notification-meta">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "1.2rem" }}>{candidature.candidat.nom}</strong>
                        <span className={`status-pill ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                        {candidature.offre.titre} - applied on {formaterDate(candidature.date_postulation)}
                      </p>
                    </div>
                    {typeof candidature.score_test === "number" ? (
                      <strong>Assessment score: {candidature.score_test}/100</strong>
                    ) : null}
                  </div>

                  <div className="details-grid">
                    <div className="detail-box">
                      <strong>Email</strong>
                      <p>{candidature.candidat.email || "-"}</p>
                    </div>
                    <div className="detail-box">
                      <strong>Phone</strong>
                      <p>{candidature.candidat.telephone || "-"}</p>
                    </div>
                    <div className="detail-box">
                      <strong>CV</strong>
                      <p>{candidature.cv_url ? "Available" : "Not provided"}</p>
                    </div>
                    <div className="detail-box">
                      <strong>Skills</strong>
                      <p>
                        {candidature.candidat.competences?.length
                          ? candidature.candidat.competences.join(", ")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {candidature.candidat.experience ? (
                    <div className="detail-box">
                      <strong>Experience</strong>
                      <p>{candidature.candidat.experience}</p>
                    </div>
                  ) : null}

                  {candidature.lettre_motivation ? (
                    <div className="detail-box">
                      <strong>Motivation letter</strong>
                      <p>{candidature.lettre_motivation}</p>
                    </div>
                  ) : null}

                  <div className="page-header-actions">
                    {candidature.offre.id ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setPage(1);
                          setOffreSelectionnee(candidature.offre.id ?? "");
                        }}
                        disabled={actionEnCours}
                      >
                        View this role
                      </Button>
                    ) : null}

                    <Button
                      variant="secondary"
                      onClick={() => void ouvrirDetailsCandidature(candidature.id)}
                      disabled={detailsEnCours}
                    >
                      {detailsEnCours ? "Loading..." : "Full details"}
                    </Button>

                    {resolveBackendFileUrl(candidature.cv_url) ? (
                      <a
                        className="ui-button ui-button-secondary"
                        href={resolveBackendFileUrl(candidature.cv_url) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View CV
                      </a>
                    ) : null}

                    {candidature.statut === "pending" ? (
                      <>
                        <Button
                          onClick={() =>
                            lancerActionCandidature(
                              candidature.id,
                              `/api/candidatures/${candidature.id}/shortlist`,
                              "Candidate shortlisted.",
                            )
                          }
                          disabled={actionEnCours}
                        >
                          Shortlist
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => ouvrirRejection(candidature)}
                          disabled={actionEnCours}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}

                    {candidature.statut === "shortlisted" ? (
                      <>
                        <Button onClick={() => ouvrirPlanification(candidature)} disabled={actionEnCours}>
                          Schedule interview
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            lancerActionCandidature(
                              candidature.id,
                              `/api/candidatures/${candidature.id}/accepter`,
                              "Candidate accepted.",
                            )
                          }
                          disabled={actionEnCours}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => ouvrirRejection(candidature)}
                          disabled={actionEnCours}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}

                    {candidature.statut === "interview_scheduled" ? (
                      <ButtonLink href="/entreprise/entretiens" variant="secondary">
                        View scheduled meeting
                      </ButtonLink>
                    ) : null}
                  </div>

                  {candidatureEnPlanification === candidature.id ? (
                    <Card tone="accent" padding="lg">
                      <div className="form-section">
                        <div>
                          <strong style={{ fontSize: "1.1rem" }}>Schedule interview</strong>
                          <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                            This action creates the interview, updates the application, and notifies the candidate.
                          </p>
                        </div>

                        <div className="form-grid">
                          <div className="groupe-champ">
                            <label htmlFor={`date-${candidature.id}`}>Date and time</label>
                            <input
                              id={`date-${candidature.id}`}
                              className="champ"
                              type="datetime-local"
                              value={formulaire.date_heure}
                              onChange={(event) =>
                                setFormulaire((courant) => ({ ...courant, date_heure: event.target.value }))
                              }
                            />
                          </div>

                          <div className="groupe-champ">
                            <label htmlFor={`type-${candidature.id}`}>Type</label>
                            <select
                              id={`type-${candidature.id}`}
                              className="champ-select"
                              value={formulaire.type}
                              onChange={(event) =>
                                setFormulaire((courant) => ({
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
                            <label htmlFor={`duree-${candidature.id}`}>Planned duration</label>
                            <input
                              id={`duree-${candidature.id}`}
                              className="champ"
                              placeholder="e.g. 60 minutes"
                              value={formulaire.duree_prevue}
                              onChange={(event) =>
                                setFormulaire((courant) => ({ ...courant, duree_prevue: event.target.value }))
                              }
                            />
                          </div>

                          <div className="groupe-champ">
                            <label htmlFor={`contact-${candidature.id}`}>Company contact</label>
                            <input
                              id={`contact-${candidature.id}`}
                              className="champ"
                              placeholder="HR email or phone number"
                              value={formulaire.contact_entreprise}
                              onChange={(event) =>
                                setFormulaire((courant) => ({ ...courant, contact_entreprise: event.target.value }))
                              }
                            />
                          </div>
                        </div>

                        {formulaire.type === "visio" ? (
                          <div className="groupe-champ">
                            <label htmlFor={`visio-${candidature.id}`}>Video link</label>
                            <input
                              id={`visio-${candidature.id}`}
                              className="champ"
                              placeholder="https://meet.google.com/..."
                              value={formulaire.lieu_visio}
                              onChange={(event) =>
                                setFormulaire((courant) => ({ ...courant, lieu_visio: event.target.value }))
                              }
                            />
                          </div>
                        ) : null}

                        {formulaire.type === "presentiel" ? (
                          <div className="groupe-champ">
                            <label htmlFor={`lieu-${candidature.id}`}>Location</label>
                            <input
                              id={`lieu-${candidature.id}`}
                              className="champ"
                              placeholder="Full address"
                              value={formulaire.lieu}
                              onChange={(event) =>
                                setFormulaire((courant) => ({ ...courant, lieu: event.target.value }))
                              }
                            />
                          </div>
                        ) : null}

                        <div className="groupe-champ">
                          <label htmlFor={`notes-${candidature.id}`}>Preparation notes</label>
                          <textarea
                            id={`notes-${candidature.id}`}
                            className="champ-zone"
                            value={formulaire.notes}
                            onChange={(event) =>
                              setFormulaire((courant) => ({ ...courant, notes: event.target.value }))
                            }
                          />
                        </div>

                        <div className="page-header-actions">
                          <Button
                            onClick={() => void planifierEntretien(candidature.id)}
                            disabled={actionEnCours || !planificationValide}
                          >
                            Confirm schedule
                          </Button>
                          <Button variant="ghost" onClick={fermerPlanification} disabled={actionEnCours}>
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

          <Card padding="md">
            <div className="page-header-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <p className="texte-secondaire" style={{ margin: 0 }}>
                Page {page} - {candidaturesFiltrees.length} application(s) shown on this page.
              </p>
              <div className="page-header-actions">
                <Button variant="ghost" onClick={() => setPage((courant) => Math.max(1, courant - 1))} disabled={page === 1}>
                  Previous page
                </Button>
                <Button variant="secondary" onClick={() => setPage((courant) => courant + 1)} disabled={!hasNextPage}>
                  Next page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {candidatureEnRejection ? (
        <div
          aria-labelledby="refus-candidature-title"
          aria-modal="true"
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "rgba(15, 23, 42, 0.52)",
            backdropFilter: "blur(6px)",
          }}
          onClick={fermerRejection}
        >
          <Card
            padding="lg"
            style={{ width: "min(100%, 720px)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="stack-lg">
              <div className="page-header-actions" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p className="badge" style={{ marginBottom: "12px" }}>
                    Rejection
                  </p>
                  <h2 id="refus-candidature-title" style={{ margin: 0, fontSize: "1.35rem", fontFamily: "var(--app-heading)" }}>
                    Reject the application of {candidatureEnRejection.candidatNom}
                  </h2>
                  <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                    The reason will be saved on the application for {candidatureEnRejection.offreTitre} and remain visible in the detail view.
                  </p>
                </div>
                <Button variant="ghost" onClick={fermerRejection} disabled={candidatureEnAction === candidatureEnRejection.id}>
                  Close
                </Button>
              </div>

              <div className="groupe-champ">
                <label htmlFor="motif-refus">Reason for rejection</label>
                <textarea
                  id="motif-refus"
                  className="champ-zone"
                  value={motifRejection}
                  onChange={(event) => setMotifRejection(event.target.value)}
                  placeholder="Add brief context for the team and for the application details."
                  rows={6}
                  maxLength={1000}
                  disabled={candidatureEnAction === candidatureEnRejection.id}
                />
                <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                  Optional. {motifRejection.length}/1000 characters.
                </p>
              </div>

              <div className="page-header-actions" style={{ justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={fermerRejection} disabled={candidatureEnAction === candidatureEnRejection.id}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => void confirmerRejection()} disabled={candidatureEnAction === candidatureEnRejection.id}>
                  {candidatureEnAction === candidatureEnRejection.id ? "Sending..." : "Confirm rejection"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {detailsCandidature ? (
        <div
          aria-labelledby="detail-candidature-title"
          aria-modal="true"
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "rgba(15, 23, 42, 0.52)",
            backdropFilter: "blur(6px)",
          }}
          onClick={fermerDetailsCandidature}
        >
          <Card
            padding="lg"
            style={{ width: "min(100%, 900px)", maxHeight: "min(90vh, 860px)", overflowY: "auto" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="stack-lg">
              <div className="notification-meta">
                <div>
                  <p className="badge" style={{ marginBottom: "12px" }}>
                    Detailed application
                  </p>
                  <h2 id="detail-candidature-title" style={{ margin: 0, fontSize: "1.45rem", fontFamily: "var(--app-heading)" }}>
                    {detailsCandidature.candidat.nom} - {detailsCandidature.offre.titre}
                  </h2>
                  <p className="texte-secondaire" style={{ margin: "10px 0 0" }}>
                    Details loaded from the `/api/candidatures/:id/details` route.
                  </p>
                </div>
                <Button variant="ghost" onClick={fermerDetailsCandidature}>
                  Close
                </Button>
              </div>

              <div className="details-grid">
                <div className="detail-box">
                  <strong>Status</strong>
                  <p>{getStatusLabel(detailsCandidature.candidature.statut).label}</p>
                </div>
                <div className="detail-box">
                  <strong>Application date</strong>
                  <p>{formaterDate(detailsCandidature.candidature.date_postulation)}</p>
                </div>
                <div className="detail-box">
                  <strong>Assessment score</strong>
                  <p>
                    {typeof detailsCandidature.candidature.score_test === "number"
                      ? `${detailsCandidature.candidature.score_test}/100`
                      : "Not available"}
                  </p>
                </div>
                <div className="detail-box">
                  <strong>CV</strong>
                  <p>{detailsCandidature.candidature.cv_url || detailsCandidature.candidat.cv_url ? "Available" : "Not provided"}</p>
                </div>
              </div>

              <div className="details-grid">
                <div className="detail-box">
                  <strong>Email</strong>
                  <p>{detailsCandidature.candidat.email || "-"}</p>
                </div>
                <div className="detail-box">
                  <strong>Phone</strong>
                  <p>{detailsCandidature.candidat.telephone || "-"}</p>
                </div>
                <div className="detail-box">
                  <strong>Experience</strong>
                  <p>{detailsCandidature.candidat.experience || "-"}</p>
                </div>
                <div className="detail-box">
                  <strong>Handicap</strong>
                  <p>{detailsCandidature.candidat.handicap || "-"}</p>
                </div>
              </div>

              <div className="detail-box">
                <strong>Skills</strong>
                <p>
                  {detailsCandidature.candidat.competences?.length
                    ? detailsCandidature.candidat.competences.join(", ")
                    : "-"}
                </p>
              </div>

              {detailsCandidature.offre.description ? (
                <div className="detail-box">
                  <strong>Role description</strong>
                  <p>{detailsCandidature.offre.description}</p>
                </div>
              ) : null}

              {detailsCandidature.candidature.lettre_motivation ? (
                <div className="detail-box">
                  <strong>Motivation letter</strong>
                  <p>{detailsCandidature.candidature.lettre_motivation}</p>
                </div>
              ) : null}

              {detailsCandidature.candidature.motif_refus ? (
                <div className="detail-box">
                  <strong>Reason for rejection</strong>
                  <p>{detailsCandidature.candidature.motif_refus}</p>
                </div>
              ) : null}

              <div className="details-grid">
                <div className="detail-box">
                  <strong>Company</strong>
                  <p>{detailsCandidature.entreprise.nom}</p>
                </div>
                <div className="detail-box">
                  <strong>HR contact</strong>
                  <p>{detailsCandidature.entreprise.contact_rh_nom || "-"}</p>
                </div>
                <div className="detail-box">
                  <strong>HR email</strong>
                  <p>{detailsCandidature.entreprise.contact_rh_email || "-"}</p>
                </div>
                <div className="detail-box">
                  <strong>HR phone</strong>
                  <p>{detailsCandidature.entreprise.contact_rh_telephone || "-"}</p>
                </div>
              </div>

              <div className="page-header-actions">
                {resolveBackendFileUrl(detailsCandidature.candidature.cv_url || detailsCandidature.candidat.cv_url) ? (
                  <a
                    className="ui-button ui-button-secondary"
                    href={resolveBackendFileUrl(detailsCandidature.candidature.cv_url || detailsCandidature.candidat.cv_url) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open CV
                  </a>
                ) : null}
                <Button variant="ghost" onClick={fermerDetailsCandidature}>
                  Close details
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
