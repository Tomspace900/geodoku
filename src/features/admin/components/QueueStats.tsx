import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function QueueStats() {
  const stats = useQuery(api.grids.getQueueStats);

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6 text-muted-foreground">
          Chargement des stats…
        </CardContent>
      </Card>
    );
  }

  const runwayColor =
    stats.daysOfRunway > 7
      ? "bg-green-500"
      : stats.daysOfRunway >= 3
        ? "bg-orange-500"
        : "bg-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">État de la queue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Badge variant="secondary">{stats.pending} en attente</Badge>
        <Badge variant="secondary">
          {stats.approvedQueued} approuvés (queue)
        </Badge>
        <Badge variant="secondary">{stats.scheduledFuture} programmés</Badge>
        <Badge className={`${runwayColor} text-white`}>
          {stats.daysOfRunway} jour{stats.daysOfRunway !== 1 ? "s" : ""} de
          contenu
        </Badge>
      </CardContent>
    </Card>
  );
}
