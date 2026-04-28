"use client";

import { useState, useEffect } from "react";
import { RouteProtegee } from "@/components/route-protegee";
import { authenticatedFetch, isAuthenticated, getUtilisateurConnecte, requireAuth } from "@/lib/auth-utils";
import { construireUrlApi } from "@/lib/config";

type OffreEntreprise = {
  id_offre: string;
  titre: string;
  description: string;
  localisation: string;
  type_poste: string;
  salaire_min?: string;
  salaire_max?: string;
  statut: "active" | "inactive" | "pourvue" | "expiree";
  date_limite?: string;
  created_at: string;
  candidatures_count: number;
  vues_count: number;
};

type OffreFormulaire = {
  titre: string;
  description: string;
  localisation: string;
  type_poste: string;
  salaire_min: string;
  salaire_max: string;
  date_limite: string;
  competences_requises: string;
  experience_requise: string;
  niveau_etude: string;
};

function MesOffresPage() {
  const [offres, setOffres] = useState<OffreEntreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    // VÃ©rifier l'authentification au chargement
    if (!requireAuth('entreprise')) {
      setErreur("Unauthorized access. Sign in with a company account.");
      setLoading(false);
      return;
    }
    
    chargerOffres();
  }, []);

  const chargerOffres = async () => {
    console.log("ðŸ”„ [OFFRES] DÃ©but du chargement des offres...");
    
    try {
      setErreur(null);
      
      // VÃ©rifier l'authentification
      if (!isAuthenticated()) {
        setErreur("Your session has expired. Please sign in again.");
        setLoading(false);
        return;
      }
      
      const utilisateur = getUtilisateurConnecte();
      console.log("ðŸ‘¤ [OFFRES] Utilisateur connectÃ©:", utilisateur?.nom, utilisateur?.role);
      
      console.log("ðŸ“¡ [OFFRES] Tentative de connexion Ã :", construireUrlApi("/api/entreprise/offres"));
      
      // Utiliser la fonction d'authentification automatique
      const response = await authenticatedFetch(construireUrlApi("/api/entreprise/offres"));

      console.log("ðŸ“Š [OFFRES] RÃ©ponse reÃ§ue - Status:", response.status);

      if (response.ok) {
        console.log("âœ… [OFFRES] RÃ©ponse OK - Parsing JSON...");
        const data = await response.json();
        console.log("ðŸ“¦ [OFFRES] DonnÃ©es reÃ§ues:", data);
        console.log("ðŸ“‹ [OFFRES] Nombre d'offres:", data.donnees?.offres?.length || 0);
        
        setOffres(data.donnees.offres || []);
        console.log("âœ… [OFFRES] Offres chargÃ©es avec succÃ¨s depuis l'API");
        
      } else if (response.status === 404) {
        console.warn("âš ï¸ [OFFRES] API 404 - Endpoint non trouvÃ©, passage en mode local");
        
        // API pas encore implÃ©mentÃ©e, utiliser des donnÃ©es de test
        setErreur("The backend API is not available yet. Showing test data instead.");
        
        // Charger des donnÃ©es de test depuis localStorage ou crÃ©er des donnÃ©es par dÃ©faut
        const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
        console.log("ðŸ’¾ [OFFRES] DonnÃ©es localStorage rÃ©cupÃ©rÃ©es:", offresTest);
        
        if (offresTest.length === 0) {
          console.log("ðŸ—ï¸ [OFFRES] CrÃ©ation de donnÃ©es de test par dÃ©faut...");
          // CrÃ©er des donnÃ©es de test par dÃ©faut
          const donneesTest = [
            {
              id_offre: "1",
              titre: "Developpeur Full Stack",
              description: "Nous recherchons un developpeur passionne pour rejoindre notre equipe dynamique...",
              localisation: "Paris",
              type_poste: "CDI",
              salaire_min: "45000",
              salaire_max: "55000",
              statut: "active",
              date_limite: "2024-04-15",
              created_at: "2024-03-01",
              candidatures_count: 12,
              vues_count: 156
            },
            {
              id_offre: "2",
              titre: "Designer UX/UI",
              description: "Poste de designer pour creer des experiences utilisateur exceptionnelles...",
              localisation: "Lyon",
              type_poste: "CDI", 
              salaire_min: "40000",
              salaire_max: "50000",
              statut: "inactive",
              date_limite: "2024-03-30",
              created_at: "2024-02-15",
              candidatures_count: 8,
              vues_count: 89
            }
          ];
          localStorage.setItem("offres_test", JSON.stringify(donneesTest));
          console.log("ðŸ’¾ [OFFRES] DonnÃ©es de test sauvegardÃ©es dans localStorage");
          setOffres(donneesTest.map((o) => ({ ...o, statut: (o.statut as OffreEntreprise["statut"]) || "inactive" })));
        } else {
          setOffres(offresTest.map((o) => ({ ...o, statut: (o.statut as OffreEntreprise["statut"]) || "inactive" })));
          console.log("âœ… [OFFRES] DonnÃ©es chargÃ©es depuis localStorage");
        }
        
      } else {
        console.error("âŒ [OFFRES] Erreur HTTP:", response.status);
        
        let errorData;
        try {
          errorData = await response.json();
          console.log("ðŸ“„ [OFFRES] DÃ©tails de l'erreur:", errorData);
        } catch (parseError) {
          console.error("âŒ [OFFRES] Impossible de parser l'erreur JSON:", parseError);
          const textResponse = await response.text();
          console.log("ðŸ“„ [OFFRES] RÃ©ponse texte brute:", textResponse.substring(0, 200));
          errorData = { message: "Unknown error." };
        }
        
        setErreur(`Unable to load roles: ${errorData.message}`);
        setOffres([]);
      }
    } catch (error: unknown) {
      const erreurCourante = error instanceof Error ? error : new Error("Unknown error.");
      console.error("ðŸ’¥ [OFFRES] Erreur de connexion complÃ¨te:", erreurCourante);
      console.error("ðŸ’¥ [OFFRES] Type d'erreur:", erreurCourante.name);
      console.error("ðŸ’¥ [OFFRES] Message d'erreur:", erreurCourante.message);
      console.error("ðŸ’¥ [OFFRES] Stack trace:", erreurCourante.stack);
      
      // Si erreur de connexion, utiliser les donnÃ©es de test en local
      console.warn("âš ï¸ [OFFRES] Serveur backend inaccessible, utilisation de donnÃ©es locales");
      setErreur("The backend is unavailable. Offline mode is active.");
      
      const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
      console.log("ðŸ’¾ [OFFRES] DonnÃ©es de secours chargÃ©es:", offresTest.length, "offres");
      setOffres(offresTest);
    } finally {
      console.log("ðŸ [OFFRES] Fin du chargement des offres");
      setLoading(false);
    }
  };

  const creerNouvelleOffre = async (nouvelleOffre: OffreFormulaire) => {
    console.log("âž• [CRÃ‰ATION] DÃ©but de la crÃ©ation d'offre...");
    console.log("ðŸ“ [CRÃ‰ATION] DonnÃ©es de l'offre:", nouvelleOffre);
    
    try {
      setErreur(null);
      
      // VÃ©rifier l'authentification
      if (!isAuthenticated()) {
        setErreur("Your session has expired. Please sign in again.");
        return;
      }
      
      const typePosteNormalise =
        {
          cdi: "cdi",
          cdd: "cdd",
          stage: "stage",
          freelance: "freelance",
          alternance: "alternance",
        }[String(nouvelleOffre.type_poste || "").toLowerCase()] || String(nouvelleOffre.type_poste || "").toLowerCase();
      const payload = {
        ...nouvelleOffre,
        type_poste: typePosteNormalise,
      };

      console.log("ðŸ“¡ [CRÃ‰ATION] Envoi POST vers:", construireUrlApi("/api/entreprise/offres"));
      console.log("ðŸ“¦ [CRÃ‰ATION] Body envoyÃ©:", JSON.stringify(payload, null, 2));
      
      const response = await authenticatedFetch(construireUrlApi("/api/entreprise/offres"), {
        method: "POST",
        body: JSON.stringify(payload)
      });

      console.log("ðŸ“Š [CRÃ‰ATION] RÃ©ponse reÃ§ue - Status:", response.status);

      if (response.ok) {
        console.log("âœ… [CRÃ‰ATION] RÃ©ponse OK - Parsing JSON...");
        const data = await response.json();
        console.log("ðŸ“¦ [CRÃ‰ATION] DonnÃ©es de rÃ©ponse:", data);
        console.log("ðŸ†” [CRÃ‰ATION] ID de l'offre crÃ©Ã©e:", data.donnees?.id_offre);
        
        setShowCreateModal(false);
        setMessage("Role created successfully.");
        console.log("ðŸ”„ [CRÃ‰ATION] Rechargement des offres...");
        chargerOffres();
        
      } else if (response.status === 404) {
        console.warn("âš ï¸ [CRÃ‰ATION] API 404 - Endpoint non trouvÃ©, sauvegarde locale");
        
        // Mode local - sauvegarder dans localStorage
        const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
        console.log("ðŸ’¾ [CRÃ‰ATION] Offres existantes en local:", offresTest.length);
        
        const nouvelleOffreAvecId: OffreEntreprise = {
          id_offre: Date.now().toString(),
          titre: nouvelleOffre.titre,
          description: nouvelleOffre.description,
          localisation: nouvelleOffre.localisation,
          type_poste: nouvelleOffre.type_poste,
          salaire_min: nouvelleOffre.salaire_min || undefined,
          salaire_max: nouvelleOffre.salaire_max || undefined,
          date_limite: nouvelleOffre.date_limite || undefined,
          statut: 'active',
          created_at: new Date().toISOString(),
          candidatures_count: 0,
          vues_count: 0
        };
        
        console.log("ðŸ—ï¸ [CRÃ‰ATION] Nouvelle offre avec ID:", nouvelleOffreAvecId);
        
        offresTest.unshift(nouvelleOffreAvecId);
        localStorage.setItem("offres_test", JSON.stringify(offresTest));
        console.log("ðŸ’¾ [CRÃ‰ATION] Sauvegarde localStorage - Total:", offresTest.length, "offres");
        
        setShowCreateModal(false);
        setMessage("Role created successfully. (Local mode)");
        console.log("ðŸ”„ [CRÃ‰ATION] Rechargement des offres...");
        chargerOffres();
        
      } else {
        console.error("âŒ [CRÃ‰ATION] Erreur HTTP:", response.status);
        
        let errorData;
        try {
          errorData = await response.json();
          console.log("ðŸ“„ [CRÃ‰ATION] DÃ©tails de l'erreur:", errorData);
          
          // Gestion spÃ©cifique des erreurs de validation (400)
          if (response.status === 400 && errorData.erreurs) {
            console.log("ðŸ” [CRÃ‰ATION] Erreurs de validation dÃ©tectÃ©es:", errorData.erreurs);
            
            // Formater les erreurs de validation pour l'utilisateur
            const erreursFormatees = Array.isArray(errorData.erreurs) 
              ? errorData.erreurs.join(', ')
              : typeof errorData.erreurs === 'object'
              ? Object.values(errorData.erreurs).join(', ')
              : errorData.erreurs;
              
            setErreur(`Validation errors: ${erreursFormatees}`);
          } else {
            setErreur(`Unable to create the role: ${errorData.message}`);
          }
        } catch (parseError) {
          console.error("âŒ [CRÃ‰ATION] Impossible de parser l'erreur JSON:", parseError);
          const textResponse = await response.text();
          console.log("ðŸ“„ [CRÃ‰ATION] RÃ©ponse texte brute:", textResponse.substring(0, 200));
          setErreur("Unable to create the role.");
        }
      }
    } catch (error: unknown) {
      const erreurCourante = error instanceof Error ? error : new Error("Unknown error.");
      console.error("ðŸ’¥ [CRÃ‰ATION] Erreur de connexion complÃ¨te:", erreurCourante);
      console.error("ðŸ’¥ [CRÃ‰ATION] Type d'erreur:", erreurCourante.name);
      console.error("ðŸ’¥ [CRÃ‰ATION] Message d'erreur:", erreurCourante.message);
      
      // Mode local en cas d'erreur de connexion
      console.warn("âš ï¸ [CRÃ‰ATION] Serveur inaccessible, sauvegarde locale");
      const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
      console.log("ðŸ’¾ [CRÃ‰ATION] Offres existantes en local:", offresTest.length);
      
      const nouvelleOffreAvecId: OffreEntreprise = {
        id_offre: Date.now().toString(),
        titre: nouvelleOffre.titre,
        description: nouvelleOffre.description,
        localisation: nouvelleOffre.localisation,
        type_poste: nouvelleOffre.type_poste,
        salaire_min: nouvelleOffre.salaire_min || undefined,
        salaire_max: nouvelleOffre.salaire_max || undefined,
        date_limite: nouvelleOffre.date_limite || undefined,
        statut: 'active',
        created_at: new Date().toISOString(),
        candidatures_count: 0,
        vues_count: 0
      };
      
      console.log("ðŸ—ï¸ [CRÃ‰ATION] Nouvelle offre avec ID (mode hors ligne):", nouvelleOffreAvecId);
      
      offresTest.unshift(nouvelleOffreAvecId);
      localStorage.setItem("offres_test", JSON.stringify(offresTest));
      console.log("ðŸ’¾ [CRÃ‰ATION] Sauvegarde localStorage - Total:", offresTest.length, "offres");
      
      setShowCreateModal(false);
      setMessage("Role created successfully. (Offline mode)");
      console.log("ðŸ”„ [CRÃ‰ATION] Rechargement des offres...");
      chargerOffres();
    }
    
    console.log("ðŸ [CRÃ‰ATION] Fin du processus de crÃ©ation");
  };

  const getStatusBadge = (statut: OffreEntreprise["statut"]) => {
    const statusConfig: Record<OffreEntreprise["statut"], { label: string; class: string }> = {
      active: { label: "Active", class: "bg-green-100 text-green-800" },
      inactive: { label: "Inactive", class: "bg-gray-100 text-gray-800" },
      pourvue: { label: "Filled", class: "bg-blue-100 text-blue-800" },
      expiree: { label: "Expired", class: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[statut] || statusConfig.inactive;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const changerStatut = async (id: string, nouveauStatut: string) => {
    console.log(`ðŸ”„ [STATUT] Changement de statut pour l'offre ${id} vers ${nouveauStatut}`);
    
    try {
      setErreur(null);
      const token = localStorage.getItem("token_auth");
      console.log("ðŸ”‘ [STATUT] Token utilisÃ©:", token ? `${token.substring(0, 20)}...` : "AUCUN TOKEN");
      
      console.log("ðŸ“¡ [STATUT] Envoi PATCH vers:", `http://localhost:4000/api/entreprise/offres/${id}/statut`);
      console.log("ðŸ“¦ [STATUT] Body envoyÃ©:", JSON.stringify({ statut: nouveauStatut }));
      
      const response = await fetch(`http://localhost:4000/api/entreprise/offres/${id}/statut`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ statut: nouveauStatut })
      });

      console.log("ðŸ“Š [STATUT] RÃ©ponse reÃ§ue - Status:", response.status);

      if (response.ok) {
        console.log("âœ… [STATUT] Changement rÃ©ussi cÃ´tÃ© API");
        const data = await response.json();
        console.log("ðŸ“¦ [STATUT] DonnÃ©es de rÃ©ponse:", data);
        
        setMessage(`Role ${nouveauStatut === 'active' ? 'activated' : 'deactivated'} successfully.`);
        console.log("ðŸ”„ [STATUT] Rechargement des offres...");
        chargerOffres();
        
      } else if (response.status === 404) {
        console.warn("âš ï¸ [STATUT] API 404 - Modification locale");
        
        // Mode local
        const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
        console.log("ðŸ’¾ [STATUT] Offres avant modification:", offresTest.length);

        const offresModifiees = offresTest.map((offre) => 
          offre.id_offre === id ? { ...offre, statut: nouveauStatut } : offre
        );

        console.log("ðŸ”§ [STATUT] Offre modifiÃ©e trouvÃ©e:", offresModifiees.find((o) => o.id_offre === id));
        
        localStorage.setItem("offres_test", JSON.stringify(offresModifiees));
        console.log("ðŸ’¾ [STATUT] Sauvegarde localStorage terminÃ©e");
        
        setMessage(`Role ${nouveauStatut === 'active' ? 'activated' : 'deactivated'} successfully. (Local mode)`);
        console.log("ðŸ”„ [STATUT] Rechargement des offres...");
        chargerOffres();
        
      } else {
        console.error("âŒ [STATUT] Erreur HTTP:", response.status);
        const errorData = await response.json().catch(() => ({ message: "Unknown error." }));
        console.log("ðŸ“„ [STATUT] DÃ©tails de l'erreur:", errorData);
        setErreur(`Unable to change the role status: ${errorData.message}`);
      }
    } catch (error) {
      console.error("ðŸ’¥ [STATUT] Erreur de connexion:", error);
      
      // Mode local en cas d'erreur
      console.warn("âš ï¸ [STATUT] Serveur inaccessible, modification locale");
      const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
      const offresModifiees = offresTest.map((offre) => 
        offre.id_offre === id ? { ...offre, statut: nouveauStatut } : offre
      );
      localStorage.setItem("offres_test", JSON.stringify(offresModifiees));
      
      setMessage(`Role ${nouveauStatut === 'active' ? 'activated' : 'deactivated'} successfully. (Offline mode)`);
      chargerOffres();
    }
    
    console.log("ðŸ [STATUT] Fin du changement de statut");
  };

  const supprimerOffre = async (id: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      console.log(`ðŸ—‘ï¸ [SUPPRESSION] DÃ©but de la suppression de l'offre ${id}`);
      
      try {
        setErreur(null);
        const token = localStorage.getItem("token_auth");
        console.log("ðŸ”‘ [SUPPRESSION] Token utilisÃ©:", token ? `${token.substring(0, 20)}...` : "AUCUN TOKEN");
        
        console.log("ðŸ“¡ [SUPPRESSION] Envoi DELETE vers:", `http://localhost:4000/api/entreprise/offres/${id}`);
        
        const response = await fetch(`http://localhost:4000/api/entreprise/offres/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        console.log("ðŸ“Š [SUPPRESSION] RÃ©ponse reÃ§ue - Status:", response.status);

        if (response.ok) {
          console.log("âœ… [SUPPRESSION] Suppression rÃ©ussie cÃ´tÃ© API");
          const data = await response.json();
          console.log("ðŸ“¦ [SUPPRESSION] DonnÃ©es de rÃ©ponse:", data);
          
          setMessage("Role deleted successfully.");
          console.log("ðŸ”„ [SUPPRESSION] Rechargement des offres...");
          chargerOffres();
          
        } else if (response.status === 404) {
          console.warn("âš ï¸ [SUPPRESSION] API 404 - Suppression locale");
          
          // Mode local
          const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
          console.log("ðŸ’¾ [SUPPRESSION] Offres avant suppression:", offresTest.length);
          console.log("ðŸŽ¯ [SUPPRESSION] Recherche de l'offre Ã  supprimer:", id);

          const offreADelete = offresTest.find((offre) => offre.id_offre === id);
          console.log("ðŸŽ¯ [SUPPRESSION] Offre trouvÃ©e:", offreADelete);

          const offresFiltered = offresTest.filter((offre) => offre.id_offre !== id);
          console.log("ðŸ’¾ [SUPPRESSION] Offres aprÃ¨s suppression:", offresFiltered.length);
          
          localStorage.setItem("offres_test", JSON.stringify(offresFiltered));
          console.log("ðŸ’¾ [SUPPRESSION] Sauvegarde localStorage terminÃ©e");
          
          setMessage("Role deleted successfully. (Local mode)");
          console.log("ðŸ”„ [SUPPRESSION] Rechargement des offres...");
          chargerOffres();
          
        } else {
          console.error("âŒ [SUPPRESSION] Erreur HTTP:", response.status);
          const errorData = await response.json().catch(() => ({ message: "Unknown error." }));
          console.log("ðŸ“„ [SUPPRESSION] DÃ©tails de l'erreur:", errorData);
          setErreur(`Unable to delete the role: ${errorData.message}`);
        }
      } catch (error) {
        console.error("ðŸ’¥ [SUPPRESSION] Erreur de connexion:", error);
        
        // Mode local en cas d'erreur
        console.warn("âš ï¸ [SUPPRESSION] Serveur inaccessible, suppression locale");
        const offresTest = JSON.parse(localStorage.getItem("offres_test") || "[]") as OffreEntreprise[];
        const offresFiltered = offresTest.filter((offre) => offre.id_offre !== id);
        localStorage.setItem("offres_test", JSON.stringify(offresFiltered));
        
        setMessage("Role deleted successfully. (Offline mode)");
        chargerOffres();
      }
      
      console.log("ðŸ [SUPPRESSION] Fin du processus de suppression");
    } else {
      console.log("âŒ [SUPPRESSION] Suppression annulÃ©e par l'utilisateur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My job listings</h1>
            <p className="text-gray-600">Manage your roles and track their performance</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/entreprise/profil"
              className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-md hover:border-blue-300 hover:text-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <span>[Profile]</span>
              <span>Company profile</span>
            </a>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>[+]</span>
              <span>Create a role</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-6">
            {message}
            <button onClick={() => setMessage(null)} className="float-right text-green-600 hover:text-green-800">x</button>
          </div>
        )}
        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
            {erreur}
            <button onClick={() => setErreur(null)} className="float-right text-red-600 hover:text-red-800">x</button>
          </div>
        )}

        {/* Quick statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-600">{offres.length}</div>
            <div className="text-gray-600">Total roles</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-green-600">
              {offres.filter(o => o.statut === 'active').length}
            </div>
            <div className="text-gray-600">Active roles</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-purple-600">
              {offres.reduce((total, o) => total + o.candidatures_count, 0)}
            </div>
            <div className="text-gray-600">Applications received</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-orange-600">
              {offres.reduce((total, o) => total + o.vues_count, 0)}
            </div>
            <div className="text-gray-600">Total views</div>
          </div>
        </div>

        {offres.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">[Jobs]</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No roles created yet</h3>
            <p className="text-gray-600 mb-6">Start by creating your first job listing.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create my first role
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {offres.map((offre) => (
              <div key={offre.id_offre} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{offre.titre}</h3>
                      {getStatusBadge(offre.statut)}
                    </div>
                    <p className="text-gray-600 mb-2">Location: {offre.localisation} - Contract: {offre.type_poste}</p>
                    <p className="text-green-600 font-medium mb-3">
                      Salary: {offre.salaire_min} - {offre.salaire_max} EUR
                    </p>
                    <p className="text-gray-700 line-clamp-2">{offre.description}</p>
                  </div>
                </div>

                {/* Statistics de l'offre */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{offre.candidatures_count}</div>
                    <div className="text-xs text-gray-600">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{offre.vues_count}</div>
                    <div className="text-xs text-gray-600">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {new Date(offre.created_at).toLocaleDateString('en-US')}
                    </div>
                    <div className="text-xs text-gray-600">Created on</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {offre.date_limite ? new Date(offre.date_limite).toLocaleDateString("en-US") : "-"}
                    </div>
                    <div className="text-xs text-gray-600">Expires on</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    View applications ({offre.candidatures_count})
                  </button>
                  
                  <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                    Edit
                  </button>
                  
                  {offre.statut === 'active' ? (
                    <button 
                      onClick={() => changerStatut(offre.id_offre, 'inactive')}
                      className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      onClick={() => changerStatut(offre.id_offre, 'active')}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                    Statistics
                  </button>
                  
                  <button 
                    onClick={() => supprimerOffre(offre.id_offre)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de crÃ©ation d'offre */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create a new role</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  x
                </button>
              </div>
              
              <ModalCreationOffre 
                onSubmit={creerNouvelleOffre}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Role creation modal
function ModalCreationOffre({ onSubmit, onCancel }: { onSubmit: (offre: OffreFormulaire) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<OffreFormulaire>({
    titre: '',
    description: '',
    localisation: '',
    type_poste: 'CDI',
    salaire_min: '',
    salaire_max: '',
    date_limite: '',
    competences_requises: '',
    experience_requise: '',
    niveau_etude: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const erreurs = [];
    
    if (!formData.titre || formData.titre.length < 3) {
      erreurs.push("The title must be at least 3 characters long.");
    }
    
    if (!formData.description || formData.description.length < 50) {
      erreurs.push(`The description must be at least 50 characters long (currently: ${formData.description.length}).`);
    }
    
    if (!formData.localisation) {
      erreurs.push("Location is required.");
    }
    
    if (formData.salaire_min && formData.salaire_max && 
        parseFloat(formData.salaire_min) > parseFloat(formData.salaire_max)) {
      erreurs.push("The minimum salary cannot be higher than the maximum salary.");
    }
    
    if (erreurs.length > 0) {
      alert(`Validation errors:\n\n${erreurs.join('\n')}`);
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role title *
            <span className="text-xs text-gray-500 ml-2">
              (Minimum 3 characters)
            </span>
          </label>
          <input
            type="text"
            name="titre"
            value={formData.titre}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formData.titre.length > 0 && formData.titre.length < 3 
                ? 'border-red-300 bg-red-50' 
                : formData.titre.length >= 3 
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300'
            }`}
            placeholder="Example: Full-Stack Developer"
            required
          />
          {formData.titre.length > 0 && formData.titre.length < 3 && (
            <p className="text-xs text-red-600 mt-1">
              The title must be at least 3 characters long.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <input
            type="text"
            name="localisation"
            value={formData.localisation}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Example: Paris, Lyon, Remote"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role type
          </label>
          <select
            name="type_poste"
            value={formData.type_poste}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="Stage">Stage</option>
            <option value="Freelance">Freelance</option>
            <option value="Alternance">Alternance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum salary (EUR)
          </label>
          <input
            type="number"
            name="salaire_min"
            value={formData.salaire_min}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="35000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum salary (EUR)
          </label>
          <input
            type="number"
            name="salaire_max"
            value={formData.salaire_max}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="45000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Application deadline
          </label>
          <input
            type="date"
            name="date_limite"
            value={formData.date_limite}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role description *
            <span className="text-xs text-gray-500 ml-2">
              (Minimum 50 characters - Currently: {formData.description.length})
            </span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formData.description.length > 0 && formData.description.length < 50 
                ? 'border-red-300 bg-red-50' 
                : formData.description.length >= 50 
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300'
            }`}
            placeholder="Describe the role, responsibilities, and work environment... (minimum 50 characters)"
            required
          />
          {formData.description.length > 0 && formData.description.length < 50 && (
            <p className="text-xs text-red-600 mt-1">
              {50 - formData.description.length} more character(s) required
            </p>
          )}
          {formData.description.length >= 50 && (
            <p className="text-xs text-green-600 mt-1">
              Description looks detailed enough.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required skills
          </label>
          <input
            type="text"
            name="competences_requises"
            value={formData.competences_requises}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="JavaScript, React, Node.js..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required experience
          </label>
          <input
            type="text"
            name="experience_requise"
            value={formData.experience_requise}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2-3 years, entry level welcome..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Education level
          </label>
          <input
            type="text"
            name="niveau_etude"
            value={formData.niveau_etude}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Bachelor's degree, Master's degree, self-taught..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            !formData.titre || 
            formData.titre.length < 3 || 
            !formData.description || 
            formData.description.length < 50 || 
            !formData.localisation
          }
          className={`px-6 py-2 rounded-md transition-colors ${
            !formData.titre || 
            formData.titre.length < 3 || 
            !formData.description || 
            formData.description.length < 50 || 
            !formData.localisation
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Create role
        </button>
      </div>
    </form>
  );
}

export default function MesOffresPageProtegee() {
  return (
    <RouteProtegee rolesAutorises={["entreprise"]}>
      <MesOffresPage />
    </RouteProtegee>
  );
}
