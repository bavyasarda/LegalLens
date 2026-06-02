import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import Navbar from "@/components/Navbar";
import DocumentCard from "@/components/DocumentCard";
import UploadModal from "@/components/UploadModal";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  const navUser = user ? { email: user.email ?? null } : null;

  return (
    <>
      <Navbar user={navUser} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your documents
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Upload contracts, agreements, and notes. Ask questions about them in chat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="hidden sm:inline-flex items-center px-3 py-2 text-sm rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40"
            >
              Ask a question
            </Link>
            <UploadModal />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
            Failed to load documents: {error.message}
          </div>
        )}

        {!documents || documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((d) => (
              <DocumentCard key={d.id} document={d} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
      <div className="text-zinc-300 text-lg font-medium">No documents yet</div>
      <p className="mt-1 text-sm text-zinc-500">
        Click <span className="text-zinc-300">Upload Document</span> to add your first file.
      </p>
    </div>
  );
}
