import { useState } from "react";
import { SprintManager } from "@/components/SprintManager";
import { DeveloperManager } from "@/components/DeveloperManager";
import { UserStoryManager } from "@/components/UserStoryManager";
import { ActivityManager } from "@/components/ActivityManager";
import { KanbanBoard } from "@/components/KanbanBoard";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, BookOpen, ListTodo, Columns3, BarChart3, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sprint Manager</h1>
            <p className="text-xs text-muted-foreground">Gestão ágil de sprints e equipe</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">
        <Tabs defaultValue="backlog" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="backlog" className="gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Backlog</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Time</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5 text-xs sm:text-sm">
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-1.5 text-xs sm:text-sm">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Atividades</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="backlog" className="space-y-8">
            <SprintManager />
            <UserStoryManager />
          </TabsContent>

          <TabsContent value="team">
            <DeveloperManager />
          </TabsContent>

          <TabsContent value="kanban">
            <KanbanBoard />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsDashboard />
          </TabsContent>

          <TabsContent value="activities">
            <ActivityManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
