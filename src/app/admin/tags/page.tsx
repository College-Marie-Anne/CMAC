import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "lucide-react";
import { TagsManager } from "@/components/admin/tags-manager";
import { QueryError } from "@/components/admin/query-error";

export default async function TagsPage() {
  try {
    const supabase = await createClient();
    const { data: tags, error } = await supabase
      .from("forum_tags")
      .select("id, name, color, is_system")
      .order("name");

    if (error) throw error;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags du forum</h1>
          <p className="text-sm text-gray-500 mt-1">{tags.length} tag(s)</p>
        </div>

        {tags.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Tag size={24} className="text-gray-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucun tag</h2>
              <p className="text-sm text-gray-400">Créez des tags pour catégoriser les posts</p>
            </CardContent>
          </Card>
        ) : null}

        <TagsManager tags={tags} />
      </div>
    );
  } catch (err) {
    console.error("[admin/tags]", err);
    return <QueryError />;
  }
}
