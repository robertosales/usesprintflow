import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Trash2 } from "lucide-react";
import { formatPersonName, getInitials } from "@/lib/personName";

interface ResponsiblesTabProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  handleSearch: (q: string) => void;
  addPapel: string;
  setAddPapel: (val: string) => void;
  papeisOptions: any[];
  searchResults: any[];
  handleAddResp: (userId: string) => void;
  respLoading: boolean;
  responsaveis: any[];
  setDeleteRespId: (id: string) => void;
}

export function ResponsiblesTab({
  searchQuery,
  handleSearch,
  addPapel,
  setAddPapel,
  papeisOptions,
  searchResults,
  handleAddResp,
  respLoading,
  responsaveis,
  setDeleteRespId,
}: ResponsiblesTabProps) {
  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-muted-foreground">Vincule um ou mais responsáveis à demanda.</p>
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Label className="text-xs">Buscar usuário</Label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Adicionar Responsável..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Papel</Label>
          <Select value={addPapel} onValueChange={setAddPapel}>
            <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{papeisOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {searchResults.length > 0 && (
        <div className="border rounded-lg divide-y overflow-hidden">
          {searchResults.map((r) => (
            <button key={r.user_id} className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3" onClick={() => handleAddResp(r.user_id)}>
              <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm">{r.display_name}</span>
              <span className="text-xs text-muted-foreground">{r.email}</span>
            </button>
          ))}
        </div>
      )}
      {respLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!respLoading && responsaveis.length === 0 && <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p>}
      {responsaveis.length > 0 && (
        <div className="space-y-2">
          {responsaveis.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-card">
              <div className="h-8 w-8 rounded-full bg-info/20 flex items-center justify-center text-sm font-semibold text-info shrink-0">{getInitials(r.profile?.display_name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{formatPersonName(r.profile?.display_name) || r.user_id}</p>
                <p className="text-xs text-muted-foreground capitalize">{r.papel}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteRespId(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
