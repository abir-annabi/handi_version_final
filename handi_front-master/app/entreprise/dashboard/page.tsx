"use client";

import { useEffect, useState } from "react";
import { RouteProtegee } from "@/components/route-protegee";
import { authenticatedFetch } from "@/lib/auth-utils";
import { construireUrlApi } from "@/lib/config";

type StatItem = { statut: string; count: number };

function Page() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void charger();
  }, []);

  const charger = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(construireUrlApi("/api/candidatures/statistiques"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load your dashboard.");
      setStats(data.donnees || []);
      setErreur(null);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  };

  const total = stats.reduce((sum, stat) => sum + (Number(stat.count) || 0), 0);
  const get = (statut: string) => stats.find((stat) => stat.statut === statut)?.count || 0;

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company dashboard</h1>
          <p className="text-gray-600">Track the performance of your roles and applications.</p>
        </div>
        <button onClick={charger} className="text-sm text-blue-600 hover:underline">
          Refresh
        </button>
      </div>

      {erreur && <div className="bg-red-50 text-red-800 px-3 py-2 rounded">{erreur}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total applications" value={total} />
        <Card title="Pending" value={get("pending")} />
        <Card title="Shortlisted" value={get("shortlisted")} />
        <Card title="Accepted" value={get("accepted")} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function Protegee() {
  return (
    <RouteProtegee rolesAutorises={["entreprise"]}>
      <Page />
    </RouteProtegee>
  );
}
