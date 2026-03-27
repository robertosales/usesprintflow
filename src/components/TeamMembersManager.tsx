import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Users, UserPlus, Shield } from "lucide-react";
import { getRoleLabel, ALL_ROLES, type AppRole } from "@/hooks/usePermissions";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { display_name: string; email: string };
  user_roles?: AppRole[];
}

export function TeamMembersManager() {
  const { currentTeamId, hasPermission, isAdmin } = useAuth();
  const canManage = hasPermission("manage_teams");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; display_name: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState("developer");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    if (!currentTeamId) return;
    setLoading(true);
    const { data: tmData } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", currentTeamId);

    const memberList = tmData || [];
    const userIds = memberList.map((m: any) => m.user_id);

    // Fetch profiles for these users
    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data: pData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);
      profiles = pData || [];
    }

    // Fetch roles for these users
    let userRoles: any[] = [];
    if (userIds.length > 0 && isAdmin) {
      const { data: rData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      userRoles = rData || [];
    }

    setMembers(
      memberList.map((m: any) => ({
        ...m,
        profile: profiles.find((p: any) => p.user_id === m.user_id),
        user_roles: userRoles
          .filter((r: any) => r.user_id === m.user_id)
          .map((r: any) => r.role as AppRole),
      }))
    );
    setLoading(false);
  };

  const fetchAllProfiles = async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, email");
    setAllProfiles(data || []);
  };

  useEffect(() => {
    fetchMembers();
    fetchAllProfiles();
  }, [currentTeamId]);

  const handleAddMember = async () => {
    if (!currentTeamId || !selectedUserId) {
      toast.error("Selecione um usuário");
      return;
    }
    const exists = members.find((m) => m.user_id === selectedUserId);
    if (exists) {
      toast.error("Usuário já é membro deste time");
      return;
    }
    const { error } = await supabase.from("team_members").insert({
      team_id: currentTeamId,
      user_id: selectedUserId,
      role: memberRole,
    });
    if (error) {
      toast.error("Erro ao adicionar membro");
      return;
    }
    toast.success("Membro adicionado ao time!");
    setSelectedUserId("");
    setOpen(false);
    await fetchMembers();
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Remover este membro do time?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    toast.success("Membro removido");
    await fetchMembers();
  };

  const availableProfiles = allProfiles.filter(
    (p) => !members.find((m) => m.user_id === p.user_id)
  );

  if (!currentTeamId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um time para gerenciar membros</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Membros do Time
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os membros associados a este time
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" /> Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro ao Time</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Usuário *</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.display_name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Função no Time</Label>
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin do Time</SelectItem>
                      <SelectItem value="developer">Desenvolvedor</SelectItem>
                      <SelectItem value="analyst">Analista</SelectItem>
                      <SelectItem value="architect">Arquiteto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMember} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold">
                  {member.profile?.display_name || "Usuário"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {member.profile?.email}
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {member.role}
                </Badge>
                {member.user_roles?.map((role) => (
                  <Badge key={role} variant="outline" className="text-[10px]">
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleLabel(role)}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Desde {new Date(member.joined_at).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {members.length === 0 && !loading && (
        <Card className="border-dashed p-8 text-center">
          <p className="text-muted-foreground">Nenhum membro neste time ainda.</p>
        </Card>
      )}
    </div>
  );
}
