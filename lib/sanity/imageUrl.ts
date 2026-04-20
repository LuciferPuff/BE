import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

const builder =
  projectId != null && projectId !== ""
    ? createImageUrlBuilder({ projectId, dataset })
    : null;

export function urlForSanityImage(
  source: SanityImageSource | null | undefined,
  width: number,
): string | null {
  if (!builder || source == null) return null;
  try {
    return builder
      .image(source)
      .width(width)
      .auto("format")
      .quality(85)
      .url();
  } catch {
    return null;
  }
}
