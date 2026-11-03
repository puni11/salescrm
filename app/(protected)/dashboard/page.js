import DashboardPage from "@/component/Dashboard";
import PageLoader from "@/component/NewComp/PageLoader";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";

export default async function Page(){
  const session = await getServerSession(authOptions)
  return(
    <>
    <PageLoader>
    {session.user.role !=='admin' ? <DashboardPage id={session.user.id} />
  :  
  <DashboardPage />
  }
  </PageLoader>
    </>
  )
}