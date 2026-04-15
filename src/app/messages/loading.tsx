export default function MessagesLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="h-14 border-b border-gray-100 flex items-center gap-3 px-4">
        <div className="w-8 h-8 rounded-full bg-gray-200/60 animate-pulse" />
        <div>
          <div className="h-3.5 w-28 rounded bg-gray-200/60 animate-pulse mb-1.5" />
          <div className="h-2.5 w-16 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {/* Received message */}
        <div className="flex justify-start">
          <div className="w-48 h-10 rounded-2xl rounded-bl-md bg-gray-100 animate-pulse" />
        </div>
        {/* Sent message */}
        <div className="flex justify-end">
          <div className="w-56 h-10 rounded-2xl rounded-br-md bg-cma-bordeaux/10 animate-pulse" />
        </div>
        {/* Received message */}
        <div className="flex justify-start">
          <div className="w-40 h-10 rounded-2xl rounded-bl-md bg-gray-100 animate-pulse" />
        </div>
        {/* Sent message */}
        <div className="flex justify-end">
          <div className="w-64 h-16 rounded-2xl rounded-br-md bg-cma-bordeaux/10 animate-pulse" />
        </div>
        {/* Received */}
        <div className="flex justify-start">
          <div className="w-52 h-10 rounded-2xl rounded-bl-md bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t border-gray-100 p-3 flex items-end gap-2">
        <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
        <div className="flex-1 h-10 rounded-2xl bg-gray-50 animate-pulse" />
        <div className="w-10 h-10 rounded-xl bg-cma-bordeaux/10 animate-pulse shrink-0" />
      </div>
    </div>
  );
}
