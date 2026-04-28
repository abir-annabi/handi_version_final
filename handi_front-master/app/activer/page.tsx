import Link from "next/link";
import { BlocActivation } from "@/components/bloc-activation";

export default async function ActiverPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? null;

  return (
    <main className="page-centree section-page">
      <header className="entete-page">
        <div>
          <p className="badge">Activation</p>
          <h1 style={{ margin: 0 }}>Activate your account</h1>
          <p className="texte-secondaire">
            This page sends the activation token from the URL to the backend and confirms the result.
          </p>
        </div>
        <Link className="bouton-secondaire" href="/connexion">
          Go to sign in
        </Link>
      </header>
      <div className="carte bloc-principal">
        <BlocActivation token={token} />
      </div>
    </main>
  );
}
