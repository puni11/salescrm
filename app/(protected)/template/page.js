;
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import UnAuthorised from "@/component/Unauthorised";
import YourTemplates from "@/component/Template";


export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
    if(!session){
      redirect('/login')
    }
    if (session.user.role!=='admin' && session.user.role!=='counsellor'){
        return (
            <UnAuthorised />
        )
    }
  return (
    <div className="p-6">
      <YourTemplates session={session} />
    </div>
  );
}