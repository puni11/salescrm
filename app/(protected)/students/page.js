import { getServerSession } from "next-auth";
import StudentBatchAssignmentsPage from "./StudentAssignement";
import { authOptions } from "@/lib/authOptions";

export default async function Page(){
  const session =  await getServerSession(authOptions)
  return(
    <StudentBatchAssignmentsPage session={session} />
  )
}