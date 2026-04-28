import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { reponseSucces } from "../utils/reponse";
import { ErreurApi } from "../utils/erreur-api";

const extraireParametre = (valeur: string | string[] | undefined): string | null => {
  if (typeof valeur === "string") {
    return valeur;
  }

  if (Array.isArray(valeur)) {
    return valeur[0] ?? null;
  }

  return null;
};

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  inscriptionCandidat = async (requete: Request, reponse: Response, suivant: NextFunction) => {
    try {
      const carteHandicap = (requete as any).file;
      const resultat = await this.authService.inscrireCandidat({
        ...requete.body,
        carte_handicap_url: carteHandicap?.path ? carteHandicap.path.replace(/^.*public[\\/]/, "/") : undefined,
      });
      return reponseSucces(reponse, 201, resultat.message);
    } catch (erreur) {
      return suivant(erreur);
    }
  };

  inscriptionEntreprise = async (requete: Request, reponse: Response, suivant: NextFunction) => {
    try {
      const resultat = await this.authService.inscrireEntreprise(requete.body);
      return reponseSucces(reponse, 201, resultat.message);
    } catch (erreur) {
      return suivant(erreur);
    }
  };

  connexion = async (requete: Request, reponse: Response, suivant: NextFunction) => {
    try {
      const resultat = await this.authService.connecter(requete.body);
      return reponseSucces(reponse, 200, resultat.message, {
        token: resultat.token,
        utilisateur: resultat.utilisateur,
      });
    } catch (erreur) {
      return suivant(erreur);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const resultat = await this.authService.logout();
      return reponseSucces(res, 200, resultat.message);
    } catch (erreur) {
      return next(erreur);
    }
  };

  activation = async (requete: Request, reponse: Response, suivant: NextFunction) => {
    try {
      const token = extraireParametre(requete.params.token);

      if (!token) {
        throw new ErreurApi("Le token d'activation est manquant.", 400);
      }

      const resultat = await this.authService.activerCompte(token);
      return reponseSucces(reponse, 200, resultat.message);
    } catch (erreur) {
      return suivant(erreur);
    }
  };

  demanderReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultat: any = await this.authService.demanderReset(req.body);
      const payload = resultat.token ? { token: resultat.token } : undefined;
      return reponseSucces(res, 200, resultat.message, payload);
    } catch (erreur) {
      return next(erreur);
    }
  };

  resetMotDePasse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultat = await this.authService.resetMotDePasse(req.body);
      return reponseSucces(res, 200, resultat.message);
    } catch (erreur) {
      return next(erreur);
    }
  };

  changerMotDePasse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.utilisateur.id_utilisateur;
      const resultat = await this.authService.changerMotDePasse(userId, req.body);
      return reponseSucces(res, 200, resultat.message);
    } catch (erreur) {
      return next(erreur);
    }
  };

  supprimerCompte = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.utilisateur.id_utilisateur;
      const resultat = await this.authService.supprimerCompte(userId);
      return reponseSucces(res, 200, resultat.message);
    } catch (erreur) {
      return next(erreur);
    }
  };

  activer2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.utilisateur;
      const resultat = await this.authService.activer2FA(email);
      return reponseSucces(res, 200, resultat.message, { code: resultat.code, secret: resultat.secret });
    } catch (erreur) {
      return next(erreur);
    }
  };

  verifier2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.utilisateur;
      const resultat = await this.authService.verifier2FA(email, req.body);
      return reponseSucces(res, 200, resultat.message);
    } catch (erreur) {
      return next(erreur);
    }
  };
}
