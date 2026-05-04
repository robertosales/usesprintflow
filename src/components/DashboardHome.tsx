import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardHome() {
  const { profile } = useAuth();
  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo{profile?.display_name ? `, ${profile.display_name}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione uma opção no menu lateral para começar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardHome;
