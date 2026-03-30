import { Card } from "@/components/ui/card";
import { Video, Construction } from "lucide-react";

export default function VideoGenerator() {
  return (
    <Card className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Video className="h-12 w-12 text-gray-300" />
        <Construction className="h-8 w-8 text-amber-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-600 mb-2">Criador de Vídeos</h3>
      <p className="text-sm text-gray-400 max-w-md mx-auto">
        Em breve: Geração de vídeos de prova social e campanhas com IA. 
        Crie vídeos curtos com testemunhos, antes/depois e demonstrações de produtos.
      </p>
    </Card>
  );
}
