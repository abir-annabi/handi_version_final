import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const routeur = Router();
const controleur = new AuthController();

const uploadDirCandidat = path.join(__dirname, "..", "..", "public", "uploads", "candidats");
if (!fs.existsSync(uploadDirCandidat)) {
  fs.mkdirSync(uploadDirCandidat, { recursive: true });
}

const stockageCandidat = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirCandidat),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

const uploadCandidat = multer({ storage: stockageCandidat });

routeur.post("/inscription/candidat", uploadCandidat.single("carte_handicap"), controleur.inscriptionCandidat);
routeur.post("/inscription/entreprise", controleur.inscriptionEntreprise);
routeur.post("/connexion", controleur.connexion);
routeur.get("/activer/:token", controleur.activation);
routeur.post("/demander-reset", controleur.demanderReset);
routeur.post("/reset", controleur.resetMotDePasse);
routeur.post("/changer-mdp", authMiddleware, controleur.changerMotDePasse);
routeur.post("/logout", authMiddleware, controleur.logout);
routeur.delete("/supprimer", authMiddleware, controleur.supprimerCompte);
routeur.post("/2fa/activer", authMiddleware, controleur.activer2FA);
routeur.post("/2fa/verifier", authMiddleware, controleur.verifier2FA);

export const authRoutes = routeur;
