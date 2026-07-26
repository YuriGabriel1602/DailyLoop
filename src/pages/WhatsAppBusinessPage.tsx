import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WhatsAppTemplate {
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  category: string;
  language: string;
  components: { type: string; text?: string }[];
}

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  APPROVED: "secondary",
  PENDING: "outline",
  REJECTED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
};

const CATEGORY_OPTIONS = ["MARKETING", "UTILITY", "AUTHENTICATION"];

export default function WhatsAppBusinessPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("UTILITY");
  const [newLanguage, setNewLanguage] = useState("pt_BR");
  const [newBody, setNewBody] = useState("");

  const [context, setContext] = useState("");
  const [contextLoaded, setContextLoaded] = useState(false);
  const [savingContext, setSavingContext] = useState(false);

  const loadTemplates = () => {
    api
      .get<WhatsAppTemplate[]>("/api/whatsapp-templates")
      .then(setTemplates)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os templates.");
        setTemplates([]);
      });
  };

  useEffect(() => {
    loadTemplates();
    api.get<{ channel: string; custom_context: string | null }[]>("/api/integrations").then((list) => {
      const whatsapp = list.find((i) => i.channel === "whatsapp");
      setContext(whatsapp?.custom_context ?? "");
      setContextLoaded(true);
    });
  }, []);

  const createTemplate = async () => {
    if (!newName.trim() || !newBody.trim()) {
      toast.error("Preencha o nome e o corpo do template.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/api/whatsapp-templates", {
        name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
        category: newCategory,
        language: newLanguage,
        body_text: newBody,
      });
      toast.success("Template enviado pra aprovação da Meta.");
      setNewName("");
      setNewBody("");
      loadTemplates();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar o template.");
    } finally {
      setCreating(false);
    }
  };

  const deleteTemplate = async (name: string) => {
    try {
      await api.delete(`/api/whatsapp-templates/${name}`);
      toast.success("Template apagado.");
      loadTemplates();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível apagar o template.");
    }
  };

  const saveContext = async () => {
    setSavingContext(true);
    try {
      await api.patch("/api/integrations/whatsapp/ai-config", { custom_context: context || null });
      toast.success("Contexto de IA salvo.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar o contexto.");
    } finally {
      setSavingContext(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto pb-28">
      <PageHeader
        title="WhatsApp Business (WABA)"
        description="Templates aprovados pela Meta e contexto de IA específico dessa WABA."
        help={
          <>
            <p>Templates são obrigatórios pra iniciar conversa fora da janela de 24h — a Meta precisa
            aprovar cada um antes de ser usado (leva de minutos a alguns dias).</p>
            <p>O contexto de IA aqui é somado ao contexto do provedor (OpenAI/Anthropic/Gemini)
            configurado em Configurações — use pra instruções específicas desse número.</p>
          </>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 md:px-6">
        <Link to="/integrations" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={13} /> Voltar pra Integrações
        </Link>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contexto de IA desta WABA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Instrução extra só pra esse número (somada ao contexto geral do provedor de IA)</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                className="text-sm"
                placeholder="Ex: Esse número atende só a região Sul, sempre mencione o prazo de entrega de 48h."
                disabled={!contextLoaded}
              />
            </div>
            <Button size="sm" variant="outline" onClick={saveContext} disabled={savingContext || !contextLoaded}>
              Salvar contexto
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Templates aprovados pela Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates === null ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum template ainda — crie um abaixo.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs font-medium">{t.name}</span>
                        <Badge variant={STATUS_VARIANT[t.status] ?? "outline"} className="text-[10px]">
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t.category} · {t.language}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => deleteTemplate(t.name)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2.5 border-t pt-3">
              <p className="text-xs font-medium">Criar template novo</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="confirmacao_pedido" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Idioma</Label>
                <Input value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} placeholder="pt_BR" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Corpo (use {"{{1}}"}, {"{{2}}"}... pra variáveis)</Label>
                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={3}
                  className="text-sm"
                  placeholder="Olá {{1}}, seu pedido foi confirmado!"
                />
              </div>
              <Button size="sm" onClick={createTemplate} disabled={creating} className="gap-1.5">
                <Plus size={13} /> Enviar pra aprovação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
