import { useState } from "react";
import { MessageSquare, Send, ThumbsUp, TrendingDown, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function HivePage() {
  const [posts, setPosts] = useState([
    { id: 1, author: "Prometheus", handle: "@sistema", content: "Sincronização concluída — a latência média caiu 12% esta semana. Bom momento para um bloco de foco.", tag: "Atualização", likes: 342, comments: 15, time: "Há 1h" },
    { id: 2, author: "Elena", handle: "@elena", content: "Resultados ótimos categorizando gastos automaticamente com o novo modelo. Alguém mais testando?", tag: "Conquista", likes: 89, comments: 12, time: "Há 2h" },
  ]);
  const [newPost, setNewPost] = useState("");

  const handlePost = () => {
    if (!newPost.trim()) return;
    setPosts([{ id: Date.now(), author: "Você", handle: "@voce", content: newPost, tag: "Novo", likes: 0, comments: 0, time: "Agora" }, ...posts]);
    setNewPost("");
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader title="The Hive" description="Comunidade de quem usa o DailyLoop — em construção." />
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 md:grid-cols-3 md:gap-6 md:px-6">
        <div className="space-y-4 md:col-span-2">
          <Card>
            <CardContent className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Users size={14} /> Compartilhar com a comunidade</div>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Compartilhe um progresso, uma ideia ou inicie uma discussão..."
                className="min-h-[60px] w-full resize-none border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <div className="flex justify-end border-t pt-3">
                <Button onClick={handlePost} disabled={!newPost.trim()} className="gap-1.5">
                  Publicar <Send size={13} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {posts.map((post) => (
            <Card key={post.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        {post.author} <span className="text-xs font-normal text-muted-foreground">{post.handle}</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{post.time}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{post.tag}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
                <div className="flex gap-6 text-muted-foreground">
                  <button className="flex items-center gap-1.5 text-xs hover:text-foreground"><ThumbsUp size={13} /> {post.likes}</button>
                  <button className="flex items-center gap-1.5 text-xs hover:text-foreground"><MessageSquare size={13} /> {post.comments}</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-6 text-center">
              <Users size={28} className="mb-2 text-primary" />
              <h3 className="text-2xl font-semibold tabular-nums">1.284</h3>
              <p className="text-xs text-muted-foreground">Pessoas ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Em alta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { tag: "#FocoProfundo", volume: "842", trend: "up" },
                { tag: "#Produtividade", volume: "320", trend: "up" },
                { tag: "#Burnout", volume: "156", trend: "down" },
              ].map((topic) => (
                <div key={topic.tag} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{topic.tag}</p>
                    <p className="text-xs text-muted-foreground">{topic.volume} publicações</p>
                  </div>
                  {topic.trend === "up" ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-destructive" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
