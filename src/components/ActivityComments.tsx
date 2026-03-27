import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export function ActivityComments({ activityId, teamId }: { activityId: string; teamId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("activity_comments")
      .select("*")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (data) {
      // Fetch user names from profiles
      const userIds = [...new Set((data as any[]).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      setComments(
        (data as any[]).map((c) => ({
          ...c,
          user_name: profileMap.get(c.user_id) || "Usuário",
        }))
      );
    }
  };

  useEffect(() => {
    fetchComments();
  }, [activityId]);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    const { error } = await supabase.from("activity_comments").insert({
      activity_id: activityId,
      team_id: teamId,
      user_id: user.id,
      content: content.trim(),
    });
    if (error) {
      toast.error("Erro ao adicionar comentário");
    } else {
      setContent("");
      await fetchComments();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    await supabase.from("activity_comments").update({ content: editContent.trim() }).eq("id", id);
    setEditId(null);
    setEditContent("");
    await fetchComments();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("activity_comments").delete().eq("id", id);
    await fetchComments();
    toast.info("Comentário removido");
  };

  return (
    <div className="space-y-3 mt-3 border-t pt-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        Comentários ({comments.length})
      </div>

      {comments.map((c) => (
        <div key={c.id} className="bg-muted/50 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{c.user_name}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              {user?.id === c.user_id && (
                <>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditId(c.id); setEditContent(c.content); }}>
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {editId === c.id ? (
            <div className="flex gap-2">
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-xs min-h-[60px]" />
              <div className="flex flex-col gap-1">
                <Button size="sm" className="text-xs h-7" onClick={() => handleUpdate(c.id)}>Salvar</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditId(null)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-foreground whitespace-pre-wrap">{c.content}</p>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Adicionar comentário..."
          className="text-xs min-h-[50px]"
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
        />
        <Button size="icon" className="h-[50px] w-10 shrink-0" onClick={handleSubmit} disabled={!content.trim() || loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
