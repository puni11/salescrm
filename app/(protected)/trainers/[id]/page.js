import TrainerDetail from "@/component/NewComp/TrainerDetail";


export default async function TrainerPage({params}) {
    const {id} = await params

  return (
    <TrainerDetail
      trainerId={id}
    />
  );
}