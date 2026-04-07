import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LancamentosPageClient from "@/components/LancamentosPageClient";

export default async function LancamentosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  // Fetch all lancamentos for the user
    const { data: lancamentos } = await supabase
      .from("lancamentos")
      .select("*")
      .eq("user_id", activeUser.id)
      .or("origem.eq.Manual,origem.is.null")
      .order("data", { ascending: true });

  return (
    <LancamentosPageClient 
      initialData={lancamentos || []} 
      user_id={activeUser.id} 
    />
  );
}
