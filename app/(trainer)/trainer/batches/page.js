import BatchManager from "@/component/BatchManager";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";


export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
    if(!session){
      redirect('/login')
    }
  return (
    <div className="p-6">
      <BatchManager session={session} />
    </div>
  );
}