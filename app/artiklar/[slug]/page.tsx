import { getSanityClient } from "@/lib/sanity/client";
import { PortableText } from "@portabletext/react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ArtikelPage({ params }: Props) {
  const { slug } = await params;
  const client = getSanityClient();
  if (!client) return notFound();

  const artikel = await client.fetch(
    `*[_type == "post" && slug.current == $slug][0]{
      title,
      publishedAt,
      body
    }`,
    { slug }
  );

  if (!artikel) return notFound();

  return (
    <main style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem" }}>
      <h1>{artikel.title}</h1>
      {artikel.publishedAt && (
        <p>{new Date(artikel.publishedAt).toLocaleDateString("sv-SE")}</p>
      )}
      {artikel.body && <PortableText value={artikel.body} />}
    </main>
  );
}