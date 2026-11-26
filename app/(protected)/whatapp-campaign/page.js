;
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import CampaignHistory from "@/component/CampaignHistory";
import UnAuthorised from "@/component/Unauthorised";


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
      <CampaignHistory session={session} />
    </div>
  );
}