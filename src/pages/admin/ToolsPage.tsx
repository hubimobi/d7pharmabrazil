import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Video, Megaphone, MessageSquareQuote, BarChart3, UserCog, Settings2 } from "lucide-react";
import TestimonialGenerator from "@/components/admin/tools/TestimonialGenerator";
import ImageGenerator from "@/components/admin/tools/ImageGenerator";
import VideoGenerator from "@/components/admin/tools/VideoGenerator";
import AdsGenerator from "@/components/admin/tools/AdsGenerator";
import CopyScoreAnalyzer from "@/components/admin/tools/CopyScoreAnalyzer";
import ProfileCopyGenerator from "@/components/admin/tools/ProfileCopyGenerator";
import CampaignConfigTool from "@/components/admin/tools/CampaignConfigTool";

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--admin-title)" }}>
          Ferramentas
        </h1>
        <p className="text-sm" style={{ color: "var(--admin-subtitle)" }}>
          Ferramentas de criação com IA para marketing e vendas
        </p>
      </div>

      <Tabs defaultValue="testimonials" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-auto gap-2 bg-transparent p-0">
          {[
            { value: "testimonials", label: "Testemunhos", icon: MessageSquareQuote },
            { value: "images", label: "Imagens", icon: ImageIcon },
            { value: "videos", label: "Vídeos", icon: Video },
            { value: "ads", label: "ADS / Copy", icon: Megaphone },
            { value: "copy-score", label: "Score Copy", icon: BarChart3 },
            { value: "profile-copy", label: "Copy Perfil", icon: UserCog },
            { value: "campaign-config", label: "Campanha", icon: Settings2 },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 px-3 py-3 rounded-xl border data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="testimonials" className="mt-6">
          <TestimonialGenerator />
        </TabsContent>
        <TabsContent value="images" className="mt-6">
          <ImageGenerator />
        </TabsContent>
        <TabsContent value="videos" className="mt-6">
          <VideoGenerator />
        </TabsContent>
        <TabsContent value="ads" className="mt-6">
          <AdsGenerator />
        </TabsContent>
        <TabsContent value="copy-score" className="mt-6">
          <CopyScoreAnalyzer />
        </TabsContent>
        <TabsContent value="profile-copy" className="mt-6">
          <ProfileCopyGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
