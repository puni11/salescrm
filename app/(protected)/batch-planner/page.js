import BatchPlanner from "@/component/NewComp/BatchPlanner";
import UnAuthorised from "@/component/Unauthorised";
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";


export const metadata = {
  title: "Batch Planner",
  description: "Personal freeform planning canvas",
};

export default async function BatchPlannerPage() {
  const session = await getServerSession(authOptions)
  if(session.user.role!=='trainerManager'){
    return <UnAuthorised />
  }
  return <BatchPlanner />;
}
