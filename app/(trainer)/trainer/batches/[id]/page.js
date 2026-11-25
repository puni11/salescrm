import BatchDetails from "@/component/NewComp/BatchDetails";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
export default async function BatchPage({ params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions)
      if(!session){
        redirect('/login')
      }

  return <BatchDetails batchId={id} session={session} />;
}