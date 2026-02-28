import Link from "next/link";
import { notFound } from "next/navigation";
import seo from "@/data/seo.en.json";
import EmailCapture from "@/app/components/EmailCapture";

type Params = { locale: string; slug: string };

function pickRelatedSlugs(current: string, all: string[], count = 6) {
  const others = all.filter((s) => s !== current);
  // simpele shuffle
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, count);
}

export default async function SeoPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;

  if (locale !== "en") return notFound();

  const dict = seo as Record<string, { title: string; intro: string; bullets: string[] }>;
  const page = dict[slug];
  if (!page) return notFound();

  const allSlugs = Object.keys(dict);
  const related = pickRelatedSlugs(slug, allSlugs, 6);

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-gray-500">ClearTerms</p>
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="text-gray-700">{page.intro}</p>
      </header>

      <section className="border rounded p-4 space-y-2">
        <p className="font-semibold">What you’ll get</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          {page.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <p className="text-sm text-gray-600">
          This tool provides an informational simulation. It is not legal advice.
        </p>
        <Link
          href="/tool"
          className="inline-block bg-black text-white px-4 py-2 rounded"
        >
          Open the calculator
        </Link>
      </section>

      <section className="border rounded p-4 space-y-3">
        <EmailCapture />
        <h2 className="font-semibold">Related pages</h2>
        <div className="grid gap-2">
          {related.map((s) => (
            <Link key={s} className="underline" href={`/en/${s}`}>
              {dict[s].title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
