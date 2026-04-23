import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApfGenerateTab } from "./ApfGenerateTab";
import { ApfTemplatesTab } from "./ApfTemplatesTab";

export function ApfGeneratorPage() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">Gerar Documento</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <ApfGenerateTab />
        </TabsContent>

        <TabsContent value="templates">
          <ApfTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}