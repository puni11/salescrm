import ClientLayout from "@/component/ClientLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import UnAuthorised from "@/component/Unauthorised";
export default async function ProtectedLayout({children}) {
 const session = await getServerSession(authOptions)
  if(!session){
    redirect('/login')
  } 
  console.log(session)
  if (session.user.role==='trainer'){
    return <UnAuthorised />
  }
    return(
        <main>
          
            <ClientLayout session={session}>
          {children}
          </ClientLayout>
        </main>
    )
}