import nodemailer from "nodemailer";
import { env } from "../config/env";

export class CourrielService {
  private transporteur = env.smtpHost
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
      })
    : nodemailer.createTransport({
        jsonTransport: true,
      });

  async envoyerCourrielActivation(email: string, nom: string, token_activation: string) {
    const lienActivation = `${env.frontendUrl}/activer?token=${token_activation}`;

    const info = await this.transporteur.sendMail({
      from: env.emailFrom,
      to: email,
      subject: "Activation de votre compte HandiTalents",
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Activation de compte</h2>
          <p>Bonjour ${nom},</p>
          <p>Votre demande a ete approuvee. Veuillez activer votre compte en cliquant sur le lien ci-dessous :</p>
          <p><a href="${lienActivation}">${lienActivation}</a></p>
          <p>Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.</p>
        </div>
      `,
    });

    return {
      messageId: info.messageId,
      apercu: JSON.stringify(info, null, 2),
    };
  }

  async envoyerCourrielReset(email: string, nom: string, lien: string) {
    const info = await this.transporteur.sendMail({
      from: env.emailFrom,
      to: email,
      subject: "Réinitialisation de mot de passe HandiTalents",
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Bonjour ${nom || "utilisateur"},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
          <p><a href="${lien}">${lien}</a></p>
          <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      `,
    });
    return { messageId: info.messageId };
  }

  async envoyerCourrielDefinitionMotDePasse(email: string, nom: string, lien: string) {
    const info = await this.transporteur.sendMail({
      from: env.emailFrom,
      to: email,
      subject: "Finalisez votre compte HandiTalents",
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2>Bienvenue sur HandiTalents</h2>
          <p>Bonjour ${nom || "utilisateur"},</p>
          <p>Votre compte a ete cree par un administrateur.</p>
          <p>Cliquez sur le lien ci-dessous pour definir votre mot de passe en toute securite :</p>
          <p><a href="${lien}">${lien}</a></p>
          <p>Si vous n'etes pas a l'origine de cette creation, vous pouvez ignorer cet email.</p>
        </div>
      `,
    });

    return { messageId: info.messageId };
  }

  async envoyerCourriel2FA(email: string, code: string) {
    const info = await this.transporteur.sendMail({
      from: env.emailFrom,
      to: email,
      subject: "Code de vérification 2FA",
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <p>Votre code de vérification : <strong style="font-size:20px;">${code}</strong></p>
          <p>Ce code expire dans 10 minutes.</p>
        </div>
      `,
    });
    return { messageId: info.messageId };
  }
}
