import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function Home() {
   const session = await getServerSession(authOptions)
    if(!session){
      redirect('/login')
    } else {
      redirect('leads')
    }
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans font-bold dark:bg-black">
   
    </div>
  );
}
