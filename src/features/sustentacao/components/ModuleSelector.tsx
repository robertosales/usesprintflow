import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ModuleSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="space-y-6 w-full max-w-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">SprintFlow</h1>
          <p className="text-muted-foreground">Selecione o módulo</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate('/sala-agil')}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Sala Ágil</CardTitle>
              <CardDescription>Gestão de Sprints, Backlog, Kanban e Métricas</CardDescription>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate('/sustentacao')}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Sustentação</CardTitle>
              <CardDescription>Demandas Corretivas, Evolutivas e Controle de SLA</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
