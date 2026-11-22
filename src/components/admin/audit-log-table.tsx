"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/admin-nav";

type AuditRow = {
  id: string;
  createdAt: string;
  actorEmail: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
};

export function AuditLogTable({
  initialLogs,
  initialFilters,
}: {
  initialLogs: AuditRow[];
  initialFilters: { action?: string; actor?: string; entity?: string; q?: string };
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [action, setAction] = useState(initialFilters.action ?? "");
  const [actor, setActor] = useState(initialFilters.actor ?? "");
  const [entity, setEntity] = useState(initialFilters.entity ?? "");
  const [q, setQ] = useState(initialFilters.q ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  function applyFilters() {
    startTransition(async () => {
      const params = new URLSearchParams();
      if (action.trim()) params.set("action", action.trim());
      if (actor.trim()) params.set("actor", actor.trim());
      if (entity.trim()) params.set("entity", entity.trim());
      if (q.trim()) params.set("q", q.trim());
      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = (await response.json()) as { logs?: AuditRow[]; error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not load audit log.");
        return;
      }
      setLogs(data.logs ?? []);
      const url = params.toString() ? `/admin/audit?${params}` : "/admin/audit";
      window.history.replaceState(null, "", url);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <Input placeholder="Action contains…" value={action} onChange={(e) => setAction(e.target.value)} />
        <Input placeholder="Actor email…" value={actor} onChange={(e) => setActor(e.target.value)} />
        <Input placeholder="Entity…" value={entity} onChange={(e) => setEntity(e.target.value)} />
        <Input placeholder="Search summary…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="md:col-span-4">
          <Button type="button" onClick={applyFilters} disabled={pending}>
            {pending ? "Filtering…" : "Apply filters"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Entity</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No audit events yet. Admin mutations will appear here.
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="py-3">
                    <div>{row.actorEmail}</div>
                    {row.actorRole ? (
                      <div className="text-xs capitalize text-muted-foreground">{row.actorRole}</div>
                    ) : null}
                  </td>
                  <td className="font-mono text-xs">{row.action}</td>
                  <td className="text-xs">
                    {row.entity}
                    {row.entityId ? (
                      <div className="font-mono text-muted-foreground">{row.entityId}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{row.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
