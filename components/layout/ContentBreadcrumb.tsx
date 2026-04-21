import Link from "next/link";

export type ContentBreadcrumbItem = {
  label: string;
  /** Sista steget ska sakna href (nuvarande sida). */
  href?: string;
};

export function ContentBreadcrumb({ items }: { items: ContentBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Du är här">
      <ol className="content-breadcrumb">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`}>
              {isLast ? (
                <span
                  className="content-breadcrumb-current"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href != null ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
