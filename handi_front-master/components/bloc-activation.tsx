"use client";

import { useEffect, useState } from "react";
import { construireUrlApi } from "@/lib/config";

export function BlocActivation({ token }: { token: string | null }) {
  const [etat, setEtat] = useState<"chargement" | "succes" | "erreur">("chargement");
  const [message, setMessage] = useState("Activating your account...");

  useEffect(() => {
    if (!token) {
      setEtat("erreur");
      setMessage("The activation token is missing.");
      return;
    }

    const activer = async () => {
      try {
        const reponse = await fetch(construireUrlApi(`/api/auth/activer/${token}`));
        const resultat = await reponse.json();

        if (!reponse.ok) {
          throw new Error(resultat.message ?? "We could not activate your account.");
        }

        setEtat("succes");
        setMessage("Your account has been activated successfully.");
      } catch (cause) {
        setEtat("erreur");
        setMessage(
          cause instanceof Error ? cause.message : "Something went wrong while activating your account.",
        );
      }
    };

    void activer();
  }, [token]);

  return (
    <p
      className={`message ${
        etat === "erreur" ? "message-erreur" : etat === "succes" ? "message-info" : "message-neutre"
      }`}
    >
      {message}
    </p>
  );
}
