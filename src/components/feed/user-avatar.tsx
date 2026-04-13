import Image from "next/image";

interface UserAvatarProps {
  firstName: string | null;
  lastName: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-24 h-24 text-2xl" };
const pxSizes = { sm: 32, md: 40, lg: 48, xl: 96 };

export function UserAvatar({ firstName, lastName, avatarUrl, size = "md" }: UserAvatarProps) {
  const initials = `${(firstName || "?")[0]}${(lastName || "?")[0]}`;

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        width={pxSizes[size]}
        height={pxSizes[size]}
        className={`${sizes[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-cma-bordeaux flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {initials}
    </div>
  );
}
