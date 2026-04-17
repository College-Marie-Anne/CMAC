"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format-date";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  User,
  FileText,
} from "lucide-react";
import {
  reviewReportAction,
  deletePostAction,
  deleteCommentAction,
} from "@/actions/admin";

type ProfileRef = { id: string; first_name: string; last_name: string; username: string } | null;
type ContentRef = { id: string; content: string } | null;

type Report = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  admin_note: string | null;
  reporter: ProfileRef | ProfileRef[];
  reported_user: ProfileRef | ProfileRef[];
  reported_post: ContentRef | ContentRef[];
  reported_comment: ContentRef | ContentRef[];
};

function unwrap<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

export function ModerationList({ reports }: { reports: Report[] }) {
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "dismissed">("all");
  const [note, setNote] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  const handleReview = (reportId: string, status: "reviewed" | "dismissed") => {
    startTransition(async () => {
      await reviewReportAction(reportId, status, note[reportId]);
    });
  };

  const handleDeletePost = (postId: string) => {
    startTransition(async () => {
      await deletePostAction(postId);
    });
  };

  const handleDeleteComment = (commentId: string) => {
    startTransition(async () => {
      await deleteCommentAction(commentId);
    });
  };

  const statusColors: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50",
    reviewed: "text-green-600 bg-green-50",
    dismissed: "text-gray-500 bg-gray-100",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "reviewed", "dismissed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-cma-bordeaux text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "Tous" : f === "pending" ? "En attente" : f === "reviewed" ? "Traités" : "Rejetés"}
          </button>
        ))}
      </div>

      {/* Reports */}
      <div className="space-y-3">
        {filtered.map((report) => {
          const reporter = unwrap(report.reporter);
          const reportedUser = unwrap(report.reported_user);
          const reportedPost = unwrap(report.reported_post);
          const reportedComment = unwrap(report.reported_comment);

          return (
            <Card key={report.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-sm font-medium text-gray-900">
                      Signalé par{" "}
                      {reporter
                        ? `@${reporter.username}`
                        : "Anonyme"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[report.status] ?? ""}`}
                    >
                      {report.status}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                </div>

                {/* Target */}
                {reportedUser && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <User size={12} /> Utilisatrice : @{reportedUser.username}
                  </div>
                )}
                {reportedPost && (
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText size={12} /> Post signalé :
                    </div>
                    <p className="bg-gray-50 rounded-lg p-2 text-gray-600 line-clamp-2">
                      {reportedPost.content}
                    </p>
                  </div>
                )}
                {reportedComment && (
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageSquare size={12} /> Commentaire signalé :
                    </div>
                    <p className="bg-gray-50 rounded-lg p-2 text-gray-600 line-clamp-2">
                      {reportedComment.content}
                    </p>
                  </div>
                )}

                {/* Reason */}
                <p className="text-sm text-gray-700">
                  <span className="text-gray-400 text-xs">Motif :</span>{" "}
                  {report.reason}
                </p>

                {/* Actions for pending */}
                {report.status === "pending" && (
                  <div className="space-y-2 pt-1">
                    <Input
                      placeholder="Note admin (optionnel)"
                      value={note[report.id] ?? ""}
                      onChange={(e) =>
                        setNote((prev) => ({ ...prev, [report.id]: e.target.value }))
                      }
                      className="rounded-xl h-8 text-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReview(report.id, "reviewed")}
                        disabled={isPending}
                        className="rounded-lg text-xs gap-1 bg-cma-vert text-white"
                      >
                        {isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Traiter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(report.id, "dismissed")}
                        disabled={isPending}
                        className="rounded-lg text-xs gap-1"
                      >
                        <XCircle size={12} /> Rejeter
                      </Button>
                      {reportedPost && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePost(reportedPost.id)}
                          disabled={isPending}
                          className="rounded-lg text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                        >
                          Supprimer le post
                        </Button>
                      )}
                      {reportedComment && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteComment(reportedComment.id)}
                          disabled={isPending}
                          className="rounded-lg text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                        >
                          Supprimer le commentaire
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {report.admin_note && report.status !== "pending" && (
                  <p className="text-xs text-gray-400 italic">
                    Note : {report.admin_note}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucun signalement dans cette catégorie
          </p>
        )}
      </div>
    </div>
  );
}
