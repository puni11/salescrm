import { getServerSession } from "next-auth";
import App from "./Leads";
import { authOptions } from "@/lib/authOptions";

export default async function Page() {
  const session =  await getServerSession(authOptions)

  return (
    <>
    <App session={session} />
    </>
  )
}