import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import CallLogsPage from "@/app/(protected)/call-logs/CallLogs";

export default async function Page() {
    const session  = await getServerSession(authOptions)
    return (
        <CallLogsPage id={session.user.id} />
    )
}