import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DividasTable from "@/components/DividasTable";

export default async function DividasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  const { data: dividas } = await supabase
    .from("dividas")
    .select("*")
    .eq("user_id", activeUser.id)
    .order("created_at", { ascending: false });

  return (
    <DividasTable 
      initialData={dividas || []} 
      user_id={activeUser.id} 
    />
  );
}
