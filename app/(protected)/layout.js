import ClientLayout from "@/component/ClientLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
export default async function ProtectedLayout({children}) {
 const session = await getServerSession(authOptions)
  if(!session){
    redirect('/login')
  }
    return(
        <main>
            <ClientLayout session={session}>
          {children}
          </ClientLayout>
        </main>
    )
}