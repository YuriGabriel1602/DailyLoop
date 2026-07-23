import { useEffect, useState } from "react";
import { Flame, Heart, Send, Target, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useRealtimeSocket } from "@/lib/ws";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HivePost {
  id: number;
  owner_id: number;
  author: string;
  content: string;
  kind: "post" | "achievement";
  source_type: "ritual_streak" | "goal_complete" | null;
  likes_count: number;
  liked_by_me: boolean;
  created_at: string;
}

const ACHIEVEMENT_ICON = { ritual_streak: Flame, goal_complete: Target } as const;

function timeAgo(iso: string) {
  const dateStr = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

function PostCard({ post, isMe, onToggleLike, onDelete }: {
  post: HivePost;
  isMe: boolean;
  onToggleLike: (post: HivePost) => void;
  onDelete: (post: HivePost) => void;
}) {
  const isAchievement = post.kind === "achievement";
  const AchievementIcon = post.source_type ? ACHIEVEMENT_ICON[post.source_type] : null;

  return (
    <Card className={cn("transition-shadow hover:shadow-md", isAchievement && "border-primary/25 bg-primary/[0.03]")}>
      <CardContent className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {isAchievement ? (
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                {AchievementIcon && <AchievementIcon size={16} />}
              </div>
            ) : (
              <Avatar className="size-9">
                <AvatarFallback>{post.author.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                {post.author}
                {isAchievement && <Badge variant="secondary" className="text-[10px]">Conquista</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          {isMe && (
            <button onClick={() => onDelete(post)} className="text-muted-foreground hover:text-destructive">
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
        <button
          onClick={() => onToggleLike(post)}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            post.liked_by_me ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart size={13} className={post.liked_by_me ? "fill-current" : ""} /> {post.likes_count}
        </button>
      </CardContent>
    </Card>
  );
}

export default function HivePage() {
  const currentUserId = useStore((s) => s.user?.id);
  const [posts, setPosts] = useState<HivePost[] | null>(null);
  const [newPost, setNewPost] = useState("");
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.get<HivePost[]>("/api/hive/posts").then(setPosts);
  }, []);

  useRealtimeSocket("/api/hive/ws", (event) => {
    if (event.type === "post_created") {
      setPosts((prev) => (prev ?? []).some((p) => p.id === event.post.id) ? prev : [event.post, ...(prev ?? [])]);
    } else if (event.type === "post_deleted") {
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== event.post_id));
    } else if (event.type === "like_changed") {
      setPosts((prev) => (prev ?? []).map((p) => (p.id === event.post_id ? { ...p, likes_count: event.likes_count } : p)));
    } else if (event.type === "presence") {
      setOnlineCount(event.online_count);
    }
  });

  const handlePost = async () => {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    try {
      const created = await api.post<HivePost>("/api/hive/posts", { content: newPost.trim(), kind: "post" });
      setPosts((prev) => [created, ...(prev ?? [])]);
      setNewPost("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível publicar.");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: HivePost) => {
    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) } : p
      )
    );
    try {
      if (post.liked_by_me) await api.delete(`/api/hive/posts/${post.id}/like`);
      else await api.post(`/api/hive/posts/${post.id}/like`, {});
    } catch {
      // reverte otimista em caso de falha
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count } : p
        )
      );
    }
  };

  const deletePost = async (post: HivePost) => {
    setPosts((prev) => (prev ?? []).filter((p) => p.id !== post.id));
    try {
      await api.delete(`/api/hive/posts/${post.id}`);
    } catch {
      toast.error("Não foi possível apagar o post.");
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="The Hive"
        description="Comunidade de quem usa o DailyLoop."
        help={
          <>
            <p>
              Publique atualizações de verdade e veja ao vivo o que outras pessoas estão fazendo — é a única
              área do sistema em que o que você escreve fica visível a outras contas.
            </p>
            <p>
              Suas conquistas (streak de Rituais, meta 100% na Bússola) podem ser compartilhadas com um
              clique quando aparecem — <strong className="text-foreground">nunca automaticamente</strong>.
            </p>
          </>
        }
      />
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
                <Button onClick={handlePost} disabled={!newPost.trim() || posting} className="gap-1.5">
                  Publicar <Send size={13} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {!posts ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Users size={24} className="opacity-40" />
              <p className="text-sm">Ninguém publicou nada ainda — seja a primeira pessoa.</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isMe={post.owner_id === currentUserId}
                onToggleLike={toggleLike}
                onDelete={deletePost}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-6 text-center">
              <Users size={28} className="mb-2 text-primary" />
              <h3 className="text-2xl font-semibold tabular-nums">{onlineCount ?? "—"}</h3>
              <p className="text-xs text-muted-foreground">{onlineCount === 1 ? "pessoa conectada agora" : "pessoas conectadas agora"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
