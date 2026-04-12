import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, FieldValues } from "react-hook-form";

/**
 * Bridge between Zod v4 and @hookform/resolvers v5.
 *
 * zodResolver() returns a Resolver type that doesn't align exactly
 * with react-hook-form v7's Resolver generic due to Zod v4's type
 * inference differences. This helper performs a safe cast once in a
 * single location instead of repeating `as unknown as Resolver<T>`
 * across every form.
 *
 * Usage:
 *   const { register } = useForm<MyData>({
 *     resolver: typedResolver<MyData>(mySchema),
 *   });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typedResolver<T extends FieldValues>(schema: any): Resolver<T> {
  return zodResolver(schema) as unknown as Resolver<T>;
}
