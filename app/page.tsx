import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerSupabase } from "@/lib/supabaseServer";
import SignInButton from "@/components/SignInButton";
import Navbar from "@/components/Navbar";

export default async function LandingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navUser: { email: string | null } | null = user
    ? { email: user.email ?? null }
    : null;

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <Navbar user={navUser} />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-block mb-5 text-xs uppercase tracking-widest text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 py-1">
            Personal legal document intelligence
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Read your legal documents.
            <br />
            Ask anything about them.
          </h1>
          <p className="mt-5 text-zinc-400 text-lg">
            Upload a contract, agreement, or any legal PDF. Get instant,
            cited answers grounded in your own files.
          </p>
          <div className="mt-8 flex justify-center">
            <Suspense
              fallback={
                <div className="h-11 w-48 rounded-md bg-zinc-800 animate-pulse" />
              }
            >
              <SignInButton />
            </Suspense>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          <FeatureCard
            step="01"
            title="Upload"
            body="Drop a PDF or image. We extract the text right in your browser — no server upload of raw content."
          />
          <FeatureCard
            step="02"
            title="Index"
            body="Documents are chunked and embedded with a free, open-source model and stored securely in your private vector database."
          />
          <FeatureCard
            step="03"
            title="Ask"
            body="Ask plain-English questions. Get streamed answers with citations pointing back to the exact source document."
          />
        </section>
      </main>
    </>
  );
}

function FeatureCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur p-5">
      <div className="text-xs text-brand-300 font-mono">{step}</div>
      <div className="mt-2 text-lg font-medium">{title}</div>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}
