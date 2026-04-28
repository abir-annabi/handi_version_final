import { DemandeEnAttenteDto } from "../dto/admin.dto";
import { UtilisateurRepository } from "../repositories/utilisateur.repository";
import { RoleUtilisateur, StatutUtilisateur } from "../types/enums";
import { ErreurApi } from "../utils/erreur-api";
import { genererTokenActivation } from "../utils/token";
import { CourrielService } from "./courriel.service";

export class AdminService {
  constructor(
    private readonly utilisateurRepository = new UtilisateurRepository(),
    private readonly courrielService = new CourrielService(),
  ) {}

  async listerDemandesEnAttente(): Promise<DemandeEnAttenteDto[]> {
    const lignes = await this.utilisateurRepository.listerDemandesEnAttente();

    return lignes.map(({ utilisateur, candidat, entreprise }) => ({
      id_utilisateur: utilisateur.id_utilisateur,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role as RoleUtilisateur,
      statut: utilisateur.statut as StatutUtilisateur,
      telephone: utilisateur.telephone,
      addresse: utilisateur.addresse,
      created_at: utilisateur.created_at,
      profil_candidat: candidat ? { ...candidat } : null,
      profil_entreprise: entreprise ? { ...entreprise } : null,
    }));
  }

  async approuverDemande(id_utilisateur: string) {
    const utilisateur = await this.utilisateurRepository.verifierStatut(id_utilisateur, StatutUtilisateur.EN_ATTENTE);

    if (!utilisateur) {
      throw new ErreurApi("Aucune demande en attente n'a ete trouvee pour cet utilisateur.", 404);
    }

    const token_activation = genererTokenActivation();
    const utilisateurMisAJour = await this.utilisateurRepository.mettreAJourStatut(
      id_utilisateur,
      StatutUtilisateur.APPROUVE,
      token_activation,
    );

    if (!utilisateurMisAJour) {
      throw new ErreurApi("Impossible d'approuver cette demande.", 500);
    }

    const courriel = await this.courrielService.envoyerCourrielActivation(
      utilisateurMisAJour.email,
      utilisateurMisAJour.nom,
      token_activation,
    );

    return {
      message: "La demande a ete approuvee et l'email d'activation a ete envoye.",
      courriel,
    };
  }

  async refuserDemande(id_utilisateur: string) {
    const utilisateur = await this.utilisateurRepository.verifierStatut(id_utilisateur, StatutUtilisateur.EN_ATTENTE);

    if (!utilisateur) {
      throw new ErreurApi("Aucune demande en attente n'a ete trouvee pour cet utilisateur.", 404);
    }

    await this.utilisateurRepository.mettreAJourStatut(id_utilisateur, StatutUtilisateur.REFUSE, null);

    return {
      message: "La demande a ete refusee.",
    };
  }
}
