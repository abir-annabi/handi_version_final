// @ts-nocheck
import { db } from "../db";
import { candidatTable, entrepriseTable, utilisateurTable } from "../db/schema";
import {
  ConnexionDto,
  InscriptionCandidatDto,
  InscriptionEntrepriseDto,
  ReponseAuthentificationDto,
  DemandeResetMdpDto,
  ResetMdpDto,
  ChangerMdpDto,
  Activer2FADto,
} from "../dto/auth.dto";
import { UtilisateurRepository } from "../repositories/utilisateur.repository";
import { RoleUtilisateur, StatutUtilisateur, StatutValidationEntreprise } from "../types/enums";
import { ErreurApi } from "../utils/erreur-api";
import { comparerMotDePasse, genererJwt, hacherMotDePasse } from "../utils/securite";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { CourrielService } from "./courriel.service";
import { SmsService } from "./sms.service";
import { env } from "../config/env";

export class AuthService {
  constructor(
    private readonly utilisateurRepository = new UtilisateurRepository(),
    private readonly courrielService = new CourrielService(),
    private readonly smsService = new SmsService(),
  ) {
    this.initialiserTables();
  }

  private tentativesConnexion: Map<string, { count: number; lockedUntil?: number }> = new Map();

  private async initialiserTables() {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reset_token (
        token TEXT PRIMARY KEY,
        user_id UUID REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
        expire_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS twofa_secret (
        user_id UUID PRIMARY KEY REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
        secret TEXT NOT NULL,
        code TEXT,
        expire_at TIMESTAMP
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS login_attempt (
        email TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMP
      );
    `);
  }

  private validerCarteHandicapObligatoire(carteHandicapUrl?: string) {
    if (!carteHandicapUrl) {
      throw new ErreurApi("La carte de handicap est obligatoire lors de l'inscription.", 400);
    }
  }

  async inscrireCandidat(donnees: InscriptionCandidatDto): Promise<ReponseAuthentificationDto> {
    this.validerCarteHandicapObligatoire(donnees.carte_handicap_url);
    const emailExiste = await this.utilisateurRepository.emailExiste(donnees.email);

    if (emailExiste) {
      throw new ErreurApi("Un compte avec cet email existe deja.", 409);
    }

    const mdpHache = await hacherMotDePasse(donnees.mdp);

    await db.transaction(async (transaction) => {
      const lignesUtilisateur = await transaction
        .insert(utilisateurTable)
        .values({
          nom: donnees.nom,
          email: donnees.email,
          mdp: mdpHache,
          telephone: donnees.telephone,
          addresse: donnees.addresse,
          role: RoleUtilisateur.CANDIDAT,
          statut: StatutUtilisateur.EN_ATTENTE,
          genre: donnees.genre,
        })
        .returning();

      const utilisateur = lignesUtilisateur[0];

      if (!utilisateur) {
        throw new ErreurApi("La creation du compte candidat a echoue.", 500);
      }

      await transaction.insert(candidatTable).values({
        id_utilisateur: utilisateur.id_utilisateur,
        type_handicap: donnees.type_handicap,
        num_carte_handicap: donnees.num_carte_handicap,
        date_expiration_carte_handicap: new Date(donnees.date_expiration_carte_handicap),
        carte_handicap_url: donnees.carte_handicap_url,
        niveau_academique: donnees.niveau_academique,
        description: donnees.description,
        secteur: donnees.secteur,
        type_licence: donnees.type_licence,
        preference_communication: donnees.preference_communication,
        age: Number(donnees.age),
      });
    });

    return {
      message: "Votre demande d'inscription a ete envoyee et sera verifiee par un administrateur.",
    };
  }

  async inscrireEntreprise(donnees: InscriptionEntrepriseDto): Promise<ReponseAuthentificationDto> {
    const emailExiste = await this.utilisateurRepository.emailExiste(donnees.email);

    if (emailExiste) {
      throw new ErreurApi("Un compte avec cet email existe deja.", 409);
    }

    const mdpHache = await hacherMotDePasse(donnees.mdp);

    await db.transaction(async (transaction) => {
      const lignesUtilisateur = await transaction
        .insert(utilisateurTable)
        .values({
          nom: donnees.nom,
          email: donnees.email,
          mdp: mdpHache,
          telephone: donnees.telephone,
          addresse: donnees.addresse,
          role: RoleUtilisateur.ENTREPRISE,
          statut: StatutUtilisateur.EN_ATTENTE,
        })
        .returning();

      const utilisateur = lignesUtilisateur[0];

      if (!utilisateur) {
        throw new ErreurApi("La creation du compte entreprise a echoue.", 500);
      }

      await transaction.insert(entrepriseTable).values({
        id_utilisateur: utilisateur.id_utilisateur,
        nom_entreprise: donnees.nom_entreprise,
        patente: donnees.patente,
        rne: donnees.rne,
        statut_validation: StatutValidationEntreprise.INVALIDE,
        profil_publique: donnees.profil_publique,
        url_site: donnees.url_site || null,
        date_fondation: new Date(donnees.date_fondation),
        description: donnees.description,
        nbr_employe: donnees.nbr_employe,
        nbr_employe_handicape: donnees.nbr_employe_handicape,
      });
    });

    return {
      message: "Votre demande d'inscription a ete envoyee et sera verifiee par un administrateur.",
    };
  }

  async connecter(donnees: ConnexionDto): Promise<ReponseAuthentificationDto> {
    const utilisateur = await this.utilisateurRepository.trouverParEmail(donnees.email);

    if (!utilisateur) {
      throw new ErreurApi("Email ou mot de passe invalide.", 401);
    }

    const now = Date.now();
    const tentativeDb = await db.execute(sql`SELECT count, locked_until FROM login_attempt WHERE email = ${donnees.email}`);
    const tentativeRow = tentativeDb.rows[0];
    if (tentativeRow?.locked_until && new Date(tentativeRow.locked_until).getTime() > now) {
      throw new ErreurApi("Compte verrouillé temporairement après trop de tentatives. Réessayez plus tard.", 429);
    }

    const motDePasseValide = await comparerMotDePasse(donnees.mdp, utilisateur.mdp);

    if (!motDePasseValide) {
      const count = (tentativeRow?.count || 0) + 1;
      const lockTs = count >= 5 ? sql`NOW() + interval '15 minutes'` : null;
      await db.execute(sql`
        INSERT INTO login_attempt(email, count, locked_until)
        VALUES (${donnees.email}, ${count}, ${lockTs})
        ON CONFLICT(email) DO UPDATE SET count = ${count}, locked_until = ${lockTs};
      `);
      throw new ErreurApi("Email ou mot de passe invalide.", 401);
    }

    await db.execute(sql`DELETE FROM login_attempt WHERE email = ${donnees.email};`);

    if (utilisateur.statut === StatutUtilisateur.EN_ATTENTE) {
      throw new ErreurApi("Votre compte est en attente de validation par un administrateur.", 403);
    }

    if (utilisateur.statut === StatutUtilisateur.REFUSE) {
      throw new ErreurApi("Votre demande d'inscription a ete refusee.", 403);
    }

    if (utilisateur.statut === StatutUtilisateur.SUSPENDU) {
      throw new ErreurApi("Votre compte a ete suspendu.", 403);
    }

    if (utilisateur.statut === StatutUtilisateur.INACTIF) {
      throw new ErreurApi("Votre compte est inactif.", 403);
    }

    if (utilisateur.statut === StatutUtilisateur.APPROUVE) {
      throw new ErreurApi("Votre compte a ete approuve. Veuillez activer votre compte via le lien recu par email.", 403);
    }

    const estAutorise = utilisateur.statut === StatutUtilisateur.ACTIF;

    if (!estAutorise) {
      throw new ErreurApi("Votre compte n'est pas autorisé à se connecter.", 403);
    }

    const roleUtilisateur = utilisateur.role as RoleUtilisateur;
    const statutUtilisateur = utilisateur.statut as StatutUtilisateur;

    const twoFA = await this.obtenir2FA(utilisateur.id_utilisateur);
    if (twoFA?.secret && twoFA.code) {
      throw new ErreurApi("Code 2FA requis. Appelez /api/auth/2fa/verifier.", 401);
    }

    // Attacher les identifiants spÃ©cifiques pour certains rÃ´les
    let candidatId: string | undefined;
    let entrepriseId: string | undefined;

    if (roleUtilisateur === RoleUtilisateur.CANDIDAT) {
      const row = await db
        .select({ id: candidatTable.id })
        .from(candidatTable)
        .where(eq(candidatTable.id_utilisateur, utilisateur.id_utilisateur))
        .limit(1);
      candidatId = row[0]?.id;
    } else if (roleUtilisateur === RoleUtilisateur.ENTREPRISE) {
      const row = await db
        .select({ id: entrepriseTable.id })
        .from(entrepriseTable)
        .where(eq(entrepriseTable.id_utilisateur, utilisateur.id_utilisateur))
        .limit(1);
      entrepriseId = row[0]?.id;
    }

    const token = genererJwt({
      id_utilisateur: utilisateur.id_utilisateur,
      email: utilisateur.email,
      role: roleUtilisateur,
      ...(utilisateur.region ? { region: utilisateur.region } : {}),
      ...(candidatId ? { candidat: { id: candidatId } } : {}),
      ...(entrepriseId ? { entreprise: { id: entrepriseId } } : {}),
    });

    return {
      message: "Connexion reussie.",
      token,
      utilisateur: {
        id_utilisateur: utilisateur.id_utilisateur,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: roleUtilisateur,
        statut: statutUtilisateur,
        ...(utilisateur.region ? { region: utilisateur.region } : {}),
        ...(candidatId ? { candidat: { id: candidatId } } : {}),
        ...(entrepriseId ? { entreprise: { id: entrepriseId } } : {}),
      },
    };
  }

  async demanderReset(dto: DemandeResetMdpDto) {
    const utilisateur = await this.utilisateurRepository.trouverParEmail(dto.email);
    if (!utilisateur) {
      return { message: "Si un compte existe, un email de réinitialisation a été envoyé." };
    }
    const token = crypto.randomBytes(24).toString("hex");
    await db.execute(sql`
      INSERT INTO reset_token (token, user_id, expire_at, used)
      VALUES (${token}, ${utilisateur.id_utilisateur}, NOW() + interval '30 minutes', false)
    `);
    // Envoi email avec lien de reset
    const lien = `${env.frontendUrl}/reset?token=${token}`;
    await this.courrielService.envoyerCourrielReset(utilisateur.email, utilisateur.nom, lien);
    return { message: "Un email de réinitialisation a été envoyé." };
  }

  async resetMotDePasse(dto: ResetMdpDto) {
    const rows = await db.execute(sql`SELECT user_id, expire_at, used FROM reset_token WHERE token = ${dto.token}`);
    const info = rows.rows[0];
    if (!info || info.used || new Date(info.expire_at).getTime() < Date.now()) {
      throw new ErreurApi("Token invalide ou expiré.", 400);
    }
    const mdpHache = await hacherMotDePasse(dto.nouveau_mdp);
    const user = await this.utilisateurRepository.mettreAJourMotDePasse(info.user_id as string, mdpHache);
    await db.execute(sql`UPDATE reset_token SET used = true WHERE token = ${dto.token}`);
    if (!user) throw new ErreurApi("Utilisateur introuvable.", 404);
    return { message: "Mot de passe réinitialisé." };
  }

  async changerMotDePasse(id_utilisateur: string, dto: ChangerMdpDto) {
    const rows = await db.select().from(utilisateurTable).where(eq(utilisateurTable.id_utilisateur, id_utilisateur));
    const utilisateur = rows[0];
    if (!utilisateur) throw new ErreurApi("Utilisateur introuvable.", 404);
    const ok = await comparerMotDePasse(dto.ancien_mdp, utilisateur.mdp);
    if (!ok) throw new ErreurApi("Ancien mot de passe incorrect.", 400);
    const mdpHache = await hacherMotDePasse(dto.nouveau_mdp);
    await this.utilisateurRepository.mettreAJourMotDePasse(id_utilisateur, mdpHache);
    return { message: "Mot de passe changé." };
  }

  async supprimerCompte(id_utilisateur: string) {
    await this.utilisateurRepository.supprimerUtilisateur(id_utilisateur);
    return { message: "Compte supprimé." };
  }

  async activer2FA(email: string) {
    const code = (Math.floor(Math.random() * 900000) + 100000).toString();
    const secret = crypto.randomBytes(10).toString("hex");
    const user = await this.utilisateurRepository.trouverParEmail(email);
    if (!user) throw new ErreurApi("Utilisateur introuvable", 404);
    await db.execute(sql`
      INSERT INTO twofa_secret (user_id, secret, code, expire_at)
      VALUES (${user.id_utilisateur}, ${secret}, ${code}, NOW() + interval '10 minutes')
      ON CONFLICT (user_id) DO UPDATE SET secret = ${secret}, code = ${code}, expire_at = NOW() + interval '10 minutes';
    `);
    await this.courrielService.envoyerCourriel2FA(user.email, code);
    await this.smsService.envoyerCode(user.telephone, code);
    return { message: "Code 2FA généré (démo)", code, secret };
  }

  async verifier2FA(email: string, dto: Activer2FADto) {
    const user = await this.utilisateurRepository.trouverParEmail(email);
    if (!user) throw new ErreurApi("Utilisateur introuvable", 404);
    const rows = await db.execute(sql`SELECT secret, code, expire_at FROM twofa_secret WHERE user_id = ${user.id_utilisateur}`);
    const entry = rows.rows[0];
    if (!entry || entry.code !== dto.code || (entry.expire_at && new Date(entry.expire_at).getTime() < Date.now())) {
      throw new ErreurApi("Code 2FA invalide ou expiré", 400);
    }
    await db.execute(sql`UPDATE twofa_secret SET code = '', expire_at = NULL WHERE user_id = ${user.id_utilisateur}`);
    return { message: "2FA activée" };
  }

  async logout() {
    return { message: "Déconnexion effectuée côté client." };
  }

  private async obtenir2FA(userId: string) {
    const rows = await db.execute(sql`SELECT secret, code, expire_at FROM twofa_secret WHERE user_id = ${userId}`);
    return rows.rows[0];
  }

  async activerCompte(token_activation: string) {
    const utilisateur = await this.utilisateurRepository.trouverParTokenActivation(token_activation);

    if (!utilisateur) {
      throw new ErreurApi("Le lien d'activation est invalide ou expire.", 404);
    }

    await this.utilisateurRepository.viderTokenActivation(utilisateur.id_utilisateur);

    return {
      message: "Votre compte a ete active avec succes.",
    };
  }
}
