import { getServerSession } from "next-auth";
import RegisterPage from "./RegisterPage";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import AccessDenied from "@/component/AccessDenied";

export default async function Page() {
  const session =  await getServerSession(authOptions)
  if(!session){
    redirect("/login")
  }
  if (session.user.role !== "admin") {
    return (
      <AccessDenied />
    )
  }
  return(
    <RegisterPage />
  )
}