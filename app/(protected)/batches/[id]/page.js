import BatchDetails from "@/component/NewComp/BatchDetails";

export default async function BatchPage({ params }) {
  const { id } = await params;

  return <BatchDetails batchId={id} />;
}