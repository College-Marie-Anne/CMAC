"use client";

import Image from "next/image";
import { Trash2, MoreHorizontal } from "lucide-react";
import { timeAgo } from "@/lib/time-ago";
import { deleteMessageAction } from "@/actions/messages";
import { useState } from "react";
import type { DirectMessage } from "@/lib/types/messaging";

interface MessageBubbleProps {
  message: DirectMessage;
  isMine: boolean;
  showTimestamp?: boolean;
}

export function MessageBubble({ message, isMine, showTimestamp = true }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setShowMenu(false);
    await deleteMessageAction(message.id);
    // The parent component handles the optimistic removal via Realtime
  };

  return (
    <>
      <div
        className={`group flex ${isMine ? "justify-end" : "justify-start"} mb-1 ${
          isDeleting ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        <div className={`relative max-w-[75%] ${isMine ? "order-2" : ""}`}>
          {/* Message bubble */}
          <div
            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
              isMine
                ? "bg-cma-bordeaux text-white rounded-br-md"
                : "bg-gray-100 text-gray-900 rounded-bl-md"
            }`}
          >
            {/* Image */}
            {message.image_url && (
              <button
                type="button"
                onClick={() => setImageFullscreen(true)}
                className="block mb-1.5 -mx-1 -mt-0.5 rounded-xl overflow-hidden"
              >
                <Image
                  src={message.image_url}
                  alt="Image"
                  width={300}
                  height={200}
                  className="max-w-full max-h-60 object-cover rounded-xl"
                />
              </button>
            )}

            {/* Text content */}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Timestamp + read indicator */}
          {showTimestamp && (
            <div
              className={`flex items-center gap-1 mt-0.5 px-1 ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <span className="text-[10px] text-gray-400">
                {timeAgo(message.created_at)}
              </span>
              {isMine && message.is_read && (
                <span className="text-[10px] text-cma-vert font-medium" title="Lu">
                  ✓✓
                </span>
              )}
              {isMine && !message.is_read && (
                <span className="text-[10px] text-gray-300" title="Envoyé">
                  ✓
                </span>
              )}
            </div>
          )}

          {/* Context menu trigger — visible on hover */}
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className={`absolute top-1 ${
              isMine ? "-left-7" : "-right-7"
            } p-1 rounded-full opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-100 transition-opacity`}
            aria-label="Options du message"
          >
            <MoreHorizontal size={14} />
          </button>

          {/* Context menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div
                className={`absolute top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 ${
                  isMine ? "right-0" : "left-0"
                }`}
              >
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Supprimer pour moi
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      {imageFullscreen && message.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImageFullscreen(false)}
        >
          <Image
            src={message.image_url}
            alt="Image en plein écran"
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
