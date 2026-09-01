import DashboardPage from "@/component/Dashboard";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";

export default async function Page(){
  const session = await getServerSession(authOptions)
  return(
    <>
    {session.user.role !=='admin' ? <DashboardPage id={session.user.id} />
  :  
  <DashboardPage />
  }
    </>
  )
}