// app/(app)/ayuda/[[...slug]]/page.tsx
//
// Página principal de Ayuda. Maneja todos los slugs:
// - /ayuda → renderiza inicio.md
// - /ayuda/audiencias/vendedor → renderiza audiencias/vendedor.md
// - /ayuda/flujos/cargar-nomina-xml → renderiza flujos/cargar-nomina-xml.md
// - etc.
//
// Requiere instalar:
//   npm install react-markdown remark-gfm rehype-slug rehype-autolink-headings
//
// Estructura esperada:
//   content/ayuda/
//     ├── inicio.md
//     ├── glosario.md
//     ├── faq.md
//     ├── audiencias/
//     │   ├── vendedor.md
//     │   ├── pm-operativo.md
//     │   ├── empleado-campo.md
//     │   ├── director.md
//     │   ├── ceo-contralor.md
//     │   └── rh.md
//     └── flujos/
//         ├── capturar-presupuesto-proyecto.md
//         ├── cargar-nomina-xml.md
//         ├── solicitar-prestamo-activo.md
//         ├── aprobar-oc.md
//         └── registrar-horas.md

import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import Link from "next/link";

import { AyudaSidebar } from "./ayuda-sidebar";
import { AyudaSearch } from "./ayuda-search";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hora

const CONTENT_DIR = path.join(process.cwd(), "content", "ayuda");

async function getMarkdownContent(slug: string[]): Promise<string | null> {
  // Si no hay slug, devolver inicio
  const filePath =
    slug.length === 0
      ? path.join(CONTENT_DIR, "inicio.md")
      : path.join(CONTENT_DIR, `${slug.join("/")}.md`);

  // Validar que el path está dentro de CONTENT_DIR (seguridad)
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(CONTENT_DIR))) {
    return null;
  }

  try {
    return await fs.readFile(resolved, "utf-8");
  } catch {
    return null;
  }
}

// Mapa de slugs → títulos legibles para breadcrumbs
const TITLES: Record<string, string> = {
  inicio: "Inicio",
  audiencias: "Por audiencia",
  flujos: "Flujos comunes",
  glosario: "Glosario",
  faq: "Preguntas frecuentes",
  vendedor: "Para Vendedores",
  "pm-operativo": "Para Líderes de Proyecto",
  "empleado-campo": "Para Empleados de Campo",
  director: "Para Directores",
  "ceo-contralor": "Para CEO y Contralor",
  rh: "Para Recursos Humanos",
  "capturar-presupuesto-proyecto": "Capturar presupuesto",
  "cargar-nomina-xml": "Cargar XMLs de nómina",
  "solicitar-prestamo-activo": "Solicitar préstamo de activo",
  "aprobar-oc": "Aprobar OC",
  "registrar-horas": "Registrar horas",
};

export default async function AyudaPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const slug = params.slug ?? [];
  const content = await getMarkdownContent(slug);

  if (content === null) {
    notFound();
  }

  // Breadcrumb
  const breadcrumb = [
    { href: "/ayuda", label: "Ayuda" },
    ...slug.map((s, i) => ({
      href: `/ayuda/${slug.slice(0, i + 1).join("/")}`,
      label: TITLES[s] ?? s,
    })),
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-muted/30 sticky top-0 h-screen overflow-y-auto">
        <div className="p-4">
          <AyudaSearch />
        </div>
        <AyudaSidebar currentSlug={slug.join("/")} />
      </aside>

      {/* Contenido */}
      <main className="flex-1 mx-auto max-w-4xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <span key={b.href}>
              {i > 0 && <span className="mx-2">/</span>}
              {i === breadcrumb.length - 1 ? (
                <span className="text-foreground font-medium">{b.label}</span>
              ) : (
                <Link href={b.href} className="hover:text-foreground">
                  {b.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Contenido markdown */}
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeSlug,
              [
                rehypeAutolinkHeadings,
                { behavior: "wrap", properties: { className: "no-underline" } },
              ],
            ]}
            components={{
              // Links internos del manual usan Next.js Link
              a: ({ href, children, ...props }) => {
                if (href?.startsWith("/")) {
                  return (
                    <Link href={href} {...(props as any)}>
                      {children}
                    </Link>
                  );
                }
                return (
                  <a
                    href={href}
                    target={href?.startsWith("http") ? "_blank" : undefined}
                    rel={
                      href?.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </article>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t text-sm text-muted-foreground">
          <p>
            ¿Información desactualizada o incompleta?{" "}
            <Link href="/admin/sugerencias" className="underline">
              Sugiere una mejora
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
