import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export default function TrialExpiredOverlay() {
  const { isExpired, trialEndsAt } = useTrialStatus();
  const { signOut } = useAuth();

  if (!isExpired) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-destructive/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <Clock className="w-7 h-7 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Seu trial expirou</CardTitle>
          <CardDescription>
            {trialEndsAt
              ? `Trial encerrado em ${trialEndsAt.toLocaleDateString("pt-BR")}`
              : "Período de teste finalizado"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Para continuar usando sua loja, escolha um plano. Seus dados estão preservados.
          </p>
          <Button className="w-full" size="lg" onClick={() => window.open("mailto:contato@d7pharma.com?subject=Upgrade%20de%20plano", "_blank")}>
            Fazer upgrade do plano
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={signOut}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
