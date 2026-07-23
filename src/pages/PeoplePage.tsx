import { useEffect, useState } from "react";
import { AlertTriangle, MessageCircle, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Relationship = "familia" | "amigo" | "mentor" | "outro";

interface PersonalContact {
  id: number;
  name: string;
  relationship: Relationship;
  last_contact_at: string | null;
  important_date: string | null;
  notes: string | null;
  cold: boolean;
}

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  familia: "Família",
  amigo: "Amigo",
  mentor: "Mentor",
  outro: "Outro",
};

function daysSince(iso: string): number {
  // O backend serializa datetime UTC sem sufixo "Z" — sem isso o JS interpreta a
  // string como horário local, o que pode dar diferença negativa em fusos atrás de UTC.
  const utcIso = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  return Math.max(0, Math.floor((Date.now() - new Date(utcIso).getTime()) / 86_400_000));
}

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState<Relationship>("amigo");

  const load = () => {
    api.get<PersonalContact[]>("/api/people").then(setPeople).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addPerson = async () => {
    if (!newName.trim()) return;
    const created = await api.post<PersonalContact>("/api/people", { name: newName, relationship: newRelationship });
    setPeople((prev) => [created, ...prev]);
    setNewName("");
  };

  const markContacted = async (id: number) => {
    const updated = await api.post<PersonalContact>(`/api/people/${id}/mark-contacted`);
    setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const deletePerson = async (id: number) => {
    await api.delete(`/api/people/${id}`);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Pessoas"
        description="As pessoas que importam pra você — o CRM da sua vida pessoal."
        help={
          <p>
            Família, amigos e mentores — não leads. Registre quando falou com cada pessoa pela última vez;
            passando <strong className="text-foreground">14 dias sem contato</strong>, a pessoa aparece marcada como "esfriando",
            um lembrete de que vale mandar uma mensagem.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-2 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
              placeholder="Nome"
              className="border-none shadow-none focus-visible:ring-0"
            />
            <Select value={newRelationship} onValueChange={(v) => setNewRelationship(v as Relationship)}>
              <SelectTrigger size="sm" className="w-32 border-none text-xs shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RELATIONSHIP_LABELS) as Relationship[]).map((r) => (
                  <SelectItem key={r} value={r}>{RELATIONSHIP_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" onClick={addPerson} className="shrink-0"><Plus size={16} /></Button>
          </div>
        </Card>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users size={24} className="opacity-40" />
            <p className="text-sm">Nenhuma pessoa cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {people.map((person) => (
              <Card key={person.id} className={cn("gap-2 p-3.5", person.cold && "border-[var(--warning)]/40")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{RELATIONSHIP_LABELS[person.relationship]}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => deletePerson(person.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </Button>
                </div>
                {person.cold ? (
                  <div className="flex items-center gap-1.5 rounded-md bg-[var(--warning)]/10 px-2 py-1 text-xs text-[var(--warning)]">
                    <AlertTriangle size={12} />
                    {person.last_contact_at ? `sem contato há ${daysSince(person.last_contact_at)} dias` : "sem contato registrado"}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-md bg-[var(--success)]/10 px-2 py-1 text-xs text-[var(--success)]">
                    ✓ falaram há {person.last_contact_at ? daysSince(person.last_contact_at) : 0} dias
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => markContacted(person.id)} className="mt-1 w-full gap-1.5 text-xs">
                  <MessageCircle size={12} /> Marcar como "falei agora"
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
