import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function ModuleSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="space-y-6 w-full max-w-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-muted-foreground">Selecionar Módulo</p>
          <p className="text-xs text-muted-foreground">Escolha o módulo que deseja acessar nesta sessão.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-success" onClick={() => navigate('/sala-agil')}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-xl bg-success/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-success" />
              </div>
              <CardTitle className="text-lg">Sala Ágil</CardTitle>
              <CardDescription>Gestão de sprints, backlog e atividades ágeis</CardDescription>
              <Button className="w-full bg-success hover:bg-success/90 text-success-foreground">Acessar Sala Ágil</Button>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-info" onClick={() => navigate('/sustentacao')}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-xl bg-info/10 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-info" />
              </div>
              <CardTitle className="text-lg">Sustentação</CardTitle>
              <CardDescription>Gestão de demandas corretivas e evolutivas</CardDescription>
              <Button className="w-full bg-info hover:bg-info/90 text-info-foreground">Acessar Sustentação</Button>
            </CardContent>
          </Card>
        </div>
        <p className="text-center text-[10px] text-muted-foreground">ⓘ O módulo de acesso é definido pelo administrador conforme seu perfil.</p>
      </div>
    </div>
  );
}
