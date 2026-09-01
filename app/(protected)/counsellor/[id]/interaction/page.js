import { getServerSession } from "next-auth";
import CustomerInteractions from "./Interaction";
import { authOptions } from "@/lib/authOptions";

export default async function Page() {
    const session  = await getServerSession(authOptions)
    return (
        <CustomerInteractions id={session.user.id} />
    )
}