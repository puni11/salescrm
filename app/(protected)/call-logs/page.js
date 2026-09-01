import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import CallLogsPage from "./CallLogs";
import UnAuthorised from "@/component/Unauthorised";

export default async function Page() {
    const session  = await getServerSession(authOptions)
    if(session?.user?.role!=='admin'){
      return(
        <UnAuthorised />
      )
    }
    return (
        <CallLogsPage />
    )
}