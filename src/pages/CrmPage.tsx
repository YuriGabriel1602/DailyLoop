import { useEffect, useState } from "react";
import {
  DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { Instagram, Kanban, MessageCircle, Phone, Plus, Rows3, Tag as TagIcon, Users } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TagItem {
  id: number;
  name: string;
  color: string;
}

interface Contact {
  id: number;
  name: string;
  phone_number: string | null;
  channel: "whatsapp" | "instagram" | "facebook";
  external_id: string;
  stage: string;
  created_at: string;
  tags: TagItem[];
}

const STAGES = [
  { id: "novo", label: "Novo" },
  { id: "qualificado", label: "Qualificado" },
  { id: "convertido", label: "Convertido" },
  { id: "perdido", label: "Perdido" },
];

const CHANNEL_ICONS = { whatsapp: Phone, instagram: Instagram, facebook: MessageCircle };

function TagPicker({ contact, allTags, onToggleTag }: { contact: Contact; allTags: TagItem[]; onToggleTag: (contact: Contact, tagId: number) => void }) {
  if (allTags.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger
        onPointerDown={(e) => e.stopPropagation()}
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
      >
        <TagIcon size={12} />
      </PopoverTrigger>
      <PopoverContent onPointerDown={(e) => e.stopPropagation()} className="w-56 space-y-1">
        {allTags.map((tag) => {
          const active = contact.tags.some((t) => t.id === tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggleTag(contact, tag.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                active ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: tag.color }} />
              <span className="flex-1">{tag.name}</span>
              {active && <span className="text-primary">✓</span>}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function ContactCard({ contact, allTags, onToggleTag }: { contact: Contact; allTags: TagItem[]; onToggleTag: (contact: Contact, tagId: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contact.id });
  const Icon = CHANNEL_ICONS[contact.channel];
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="cursor-grab touch-none rounded-lg border bg-card p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-medium">{contact.name}</p>
        <TagPicker contact={contact} allTags={allTags} onToggleTag={onToggleTag} />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon size={12} />
        {contact.phone_number || contact.external_id}
      </div>
      {contact.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {contact.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: `color-mix(in oklch, ${tag.color} 18%, transparent)`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StageColumn({ stage, contacts, allTags, onToggleTag }: {
  stage: (typeof STAGES)[number]; contacts: Contact[]; allTags: TagItem[]; onToggleTag: (contact: Contact, tagId: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[240px] flex-1 flex-col gap-2 rounded-xl border bg-muted/20 p-2.5 transition-colors",
        isOver && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{stage.label}</p>
        <span className="text-xs text-muted-foreground">{contacts.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {contacts.map((c) => <ContactCard key={c.id} contact={c} allTags={allTags} onToggleTag={onToggleTag} />)}
        {contacts.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhum contato aqui
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({ contacts, onStageChange, allTags, onToggleTag }: {
  contacts: Contact[]; onStageChange: (id: number, stage: string) => void; allTags: TagItem[]; onToggleTag: (contact: Contact, tagId: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">Canal</th>
            <th className="px-3 py-2 font-medium">Contato</th>
            <th className="px-3 py-2 font-medium">Tags</th>
            <th className="px-3 py-2 font-medium">Etapa</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const Icon = CHANNEL_ICONS[c.channel];
            return (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Icon size={13} /> {c.channel}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.phone_number || c.external_id}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {c.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: `color-mix(in oklch, ${tag.color} 18%, transparent)`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    <TagPicker contact={c} allTags={allTags} onToggleTag={onToggleTag} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Select value={c.stage} onValueChange={(v) => onStageChange(c.id, v)}>
                    <SelectTrigger size="sm" className="w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newChannel, setNewChannel] = useState<Contact["channel"]>("whatsapp");
  const [newPhone, setNewPhone] = useState("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [allTags, setAllTags] = useState<TagItem[]>([]);

  const loadContacts = () => {
    api.get<Contact[]>("/api/crm/contacts").then(setContacts).finally(() => setLoading(false));
  };

  useEffect(loadContacts, []);
  useEffect(() => {
    api.get<TagItem[]>("/api/tags").then(setAllTags);
  }, []);

  const toggleTag = async (contact: Contact, tagId: number) => {
    const hasTag = contact.tags.some((t) => t.id === tagId);
    const nextIds = hasTag ? contact.tags.filter((t) => t.id !== tagId).map((t) => t.id) : [...contact.tags.map((t) => t.id), tagId];
    try {
      const updatedTags = await api.put<TagItem[]>(`/api/crm/contacts/${contact.id}/tags`, { tag_ids: nextIds });
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, tags: updatedTags } : c)));
    } catch {
      // sem toast aqui pra não poluir — a tag simplesmente não muda visualmente
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addContact = async () => {
    if (!newName.trim()) return;
    const created = await api.post<Omit<Contact, "tags">>("/api/crm/contacts", {
      name: newName,
      channel: newChannel,
      phone_number: newPhone || null,
      external_id: newPhone || newName,
    });
    setContacts((prev) => [{ ...created, tags: [] }, ...prev]);
    setNewName("");
    setNewPhone("");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const contactId = active.id as number;
    const newStage = over.id as string;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.stage === newStage) return;

    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c)));
    try {
      await api.patch(`/api/crm/contacts/${contactId}/stage`, { stage: newStage });
    } catch {
      loadContacts(); // reverte em caso de falha
    }
  };

  const changeStage = async (contactId: number, newStage: string) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c)));
    try {
      await api.patch(`/api/crm/contacts/${contactId}/stage`, { stage: newStage });
    } catch {
      loadContacts();
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <PageHeader
        title="CRM"
        description="Pipeline de leads e contatos."
        help={
          <>
            <p>Pipeline dos seus leads — de WhatsApp, Instagram, Facebook ou cadastrados manualmente.</p>
            <ul>
              <li>Modo <strong className="text-foreground">Kanban</strong>: arraste o card entre as etapas (Novo, Qualificado, Convertido, Perdido).</li>
              <li>Modo <strong className="text-foreground">Lista</strong>: mesma coisa, em tabela — troque a etapa pelo seletor.</li>
            </ul>
            <p>Toda mudança de etapa fica registrada nos <strong className="text-foreground">Logs</strong>.</p>
          </>
        }
        actions={
          <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
            <button
              title="Modo Kanban"
              onClick={() => setView("kanban")}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Kanban size={14} />
            </button>
            <button
              title="Modo Lista"
              onClick={() => setView("list")}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Rows3 size={14} />
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <Card className="mb-4 gap-2 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addContact()}
              placeholder="Nome do lead"
              className="min-w-[160px] flex-1 border-none shadow-none focus-visible:ring-0"
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addContact()}
              placeholder="Telefone (opcional)"
              className="w-40 border-none shadow-none focus-visible:ring-0"
            />
            <Select value={newChannel} onValueChange={(v) => setNewChannel(v as Contact["channel"])}>
              <SelectTrigger size="sm" className="w-32 border-none text-xs shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" onClick={addContact} className="shrink-0"><Plus size={16} /></Button>
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-4 gap-3">
            {STAGES.map((s) => <Skeleton key={s.id} className="h-64 w-full rounded-xl" />)}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users size={24} className="opacity-40" />
            <p className="text-sm">Nenhum contato ainda.</p>
          </div>
        ) : view === "kanban" ? (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-3 overflow-x-auto pb-4">
              {STAGES.map((stage) => (
                <StageColumn key={stage.id} stage={stage} contacts={contacts.filter((c) => c.stage === stage.id)} allTags={allTags} onToggleTag={toggleTag} />
              ))}
            </div>
          </DndContext>
        ) : (
          <ListView contacts={contacts} onStageChange={changeStage} allTags={allTags} onToggleTag={toggleTag} />
        )}
      </div>
    </div>
  );
}
