import { useEffect, useState } from "react";
import { RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [logs, setLogs] = useState<string[] | null>(null);

  const loadUsers = () => api.get<AdminUser[]>("/api/admin/users").then(setUsers);
  const loadLogs = () => api.get<{ lines: string[] }>("/api/admin/logs?lines=200").then((r) => setLogs(r.lines));

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, []);

  const toggleActive = async (u: AdminUser) => {
    const updated = await api.patch<AdminUser>(`/api/admin/users/${u.id}`, { is_active: !u.is_active });
    setUsers((prev) => (prev ?? []).map((x) => (x.id === u.id ? updated : x)));
  };

  const changeRole = async (u: AdminUser, role: "user" | "admin") => {
    const updated = await api.patch<AdminUser>(`/api/admin/users/${u.id}`, { role });
    setUsers((prev) => (prev ?? []).map((x) => (x.id === u.id ? updated : x)));
  };

  const deleteUser = async (u: AdminUser) => {
    if (!confirm(`Excluir a conta de ${u.username}?`)) return;
    await api.delete(`/api/admin/users/${u.id}`);
    setUsers((prev) => (prev ?? []).filter((x) => x.id !== u.id));
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Administração"
        description="Usuários e logs do sistema."
        help={
          <p>
            Visível só pra contas com papel de administrador (o primeiro usuário criado no sistema). Gerencie
            usuários — ative, desative, force reset de senha — e acompanhe o log de arquivo do servidor.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 md:space-y-6 md:px-6">
        <Card>
          <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Usuários</CardTitle></CardHeader>
          <CardContent>
            {!users ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "secondary" : "destructive"}>{u.is_active ? "ativo" : "desativado"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => changeRole(u, v as "user" | "admin")}>
                        <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">user</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(u)} title={u.is_active ? "Desativar" : "Ativar"}>
                        <ShieldOff size={14} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => deleteUser(u)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Logs do sistema</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={loadLogs}><RefreshCw size={14} /></Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 rounded-lg border bg-muted/30 p-3">
              {!logs ? (
                <div className="space-y-1.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-full" />)}</div>
              ) : (
                <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                  {logs.length === 0 ? <p>Sem logs ainda.</p> : logs.map((line, i) => <p key={i} className="break-all whitespace-pre-wrap">{line}</p>)}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
