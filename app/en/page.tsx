import Link from "next/link";

export default function EnIndex() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-4">
      <h1 className="text-3xl font-bold">ClearTerms (EN)</h1>
      <p className="text-gray-700">
        Programmatic SEO prototype. Pick a page:
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>
          <Link className="underline" href="/en/termination-notice-period-calculator">
            Termination notice period calculator
          </Link>
        </li>
        <li>
          <Link className="underline" href="/en/what-to-do-if-fired">
            What to do if fired (checklist)
          </Link>
        </li>
      </ul>

      <Link className="inline-block bg-black text-white px-4 py-2 rounded" href="/tool">
        Open tool
      </Link>
    </main>
  );
}
