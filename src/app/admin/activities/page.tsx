import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { ActivitiesManager } from "@/components/admin/activities-manager";
import { QueryError } from "@/components/admin/query-error";

export default async function ActivitiesPage() {
  try {
    const supabase = await createClient();

    const { data: activities, error } = await supabase
      .from("activities")
      .select("id, name")
      .order("name");

    if (error) throw error;

    const activitiesWithCount = await Promise.all(
      activities.map(async (a) => {
        const { count } = await supabase
          .from("profile_activities")
          .select("profile_id", { count: "exact", head: true })
          .eq("activity_id", a.id);
        return { ...a, member_count: count ?? 0 };
      })
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activités parascolaires</h1>
          <p className="text-sm text-gray-500 mt-1">{activities.length} activité(s)</p>
        </div>

        {activities.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Activity size={24} className="text-gray-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune activité</h2>
              <p className="text-sm text-gray-400">Créez des activités pour le formulaire d&apos;inscription</p>
            </CardContent>
          </Card>
        ) : null}

        <ActivitiesManager activities={activitiesWithCount} />
      </div>
    );
  } catch (err) {
    console.error("[admin/activities]", err);
    return <QueryError />;
  }
}
