import FacebookFormMapping from "@/component/FacebookFormMapping"

export default async function Page({params}){
    const {formId} =  await params

    return<>
    <FacebookFormMapping formId={formId}/>
    </>
}