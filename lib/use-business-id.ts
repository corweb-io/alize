"use client";

import { useParams } from "next/navigation";

/** Active business id from the /b/[businessId] route segment. */
export function useBusinessId(): string {
  const { businessId } = useParams<{ businessId: string }>();
  return businessId;
}
