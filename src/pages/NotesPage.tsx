import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Send, StickyNote, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/InputWithIcon";
import { Skeleton } from "@/components/ui/skeleton";

interface Note {
  id: number;
  content: string;
  created_at: string;
  is_archived: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const loadNotes = () => {
    api.get<Note[]>("/api/notes").then(setNotes);
  };

  useEffect(loadNotes, []);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const created = await api.post<Note>("/api/notes", { content: newNote });
      setNotes((prev) => [created, ...(prev ?? [])]);
      setNewNote("");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: number) => {
    await api.delete(`/api/notes/${id}`);
    setNotes((prev) => (prev ?? []).filter((n) => n.id !== id));
  };

  const filtered = useMemo(() => {
    if (!notes) return null;
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.content.toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Notas"
        description="Tudo que você descarregou na Captura Rápida, num só lugar."
        help={
          <p>
            Notas soltas e rápidas — sem categoria, sem prazo. Um lugar pra descarregar uma ideia sem
            precisar decidir na hora se vira tarefa ou não. Use <kbd className="rounded border px-1 font-mono text-[10px]">Ctrl+Enter</kbd> pra salvar.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-2 p-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && addNote()}
            placeholder="Escreva uma nota rápida..."
            className="min-h-[60px] w-full resize-none border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={addNote} disabled={saving || !newNote.trim()} className="gap-1.5">
              Salvar <Send size={13} />
            </Button>
          </div>
        </Card>

        {notes && notes.length > 0 && (
          <InputWithIcon
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nas notas..."
          />
        )}

        {!filtered ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <StickyNote size={24} className="opacity-40" />
            <p className="text-sm">{query ? "Nenhuma nota encontrada." : "Nenhuma nota ainda."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filtered.map((note, i) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.03, duration: 0.2 }}
                >
                  <Card className="group gap-2 p-4 transition-shadow hover:shadow-md">
                    <CardContent className="flex items-start justify-between gap-3 p-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(note.created_at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteNote(note.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
