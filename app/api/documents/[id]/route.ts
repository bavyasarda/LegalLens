import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  // 1. Find the doc + verify ownership (RLS would also enforce this)
  const { data: doc, error: docErr } = await admin
    .from("documents")
    .select("id, user_id, storage_path")
    .eq("id", id)
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Delete chunks (CASCADE would also handle, but do it explicitly for clarity)
  await admin.from("document_chunks").delete().eq("document_id", id);

  // 3. Delete the document row
  const { error: delErr } = await admin.from("documents").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 4. Delete from storage (best-effort; if file already gone, that's fine)
  await admin.storage.from("legal-docs").remove([doc.storage_path]);

  return NextResponse.json({ ok: true });
}
