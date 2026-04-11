import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CandidateCard } from "./components/CandidateCard";
import { QueueStats } from "./components/QueueStats";
import { useAdminToken } from "./hooks/useAdminToken";

type Tab = "pending" | "approved" | "rejected";

const TAB_LABELS: Record<Tab, string> = {
  pending: "En attente",
  approved: "Approuvés",
  rejected: "Rejetés",
};

export function AdminPage() {
  const [token, setToken, clearToken] = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const candidates = useQuery(
    api.grids.getCandidates,
    token
      ? {
          status: activeTab,
          limit: 20,
          sortBy: activeTab === "pending" ? "score" : "date",
        }
      : "skip",
  );

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center">Admin Geodoku</h1>
          <Input
            type="password"
            placeholder="Token d'administration"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tokenInput) setToken(tokenInput);
            }}
          />
          <Button onClick={() => setToken(tokenInput)} disabled={!tokenInput}>
            Connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Geodoku</h1>
        <Button variant="outline" size="sm" onClick={clearToken}>
          Déconnexion
        </Button>
      </div>

      <QueueStats />

      <Separator />

      {/* Tabs */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </Button>
        ))}
      </div>

      {/* Candidate list */}
      {candidates === undefined ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : candidates.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune grille dans l'onglet «{TAB_LABELS[activeTab]}».
        </p>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate._id}
              candidate={candidate}
              adminToken={token}
              onUnauthorized={clearToken}
            />
          ))}
        </div>
      )}
    </div>
  );
}
