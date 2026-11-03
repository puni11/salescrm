import LeadTimelinePage from "@/component/LeadFurther";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";

export default async function page(){
  const session  =  await getServerSession(authOptions)
    return(
      <>
      <LeadTimelinePage session={session} />
      </>
    )
}