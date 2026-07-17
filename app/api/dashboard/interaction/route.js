import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function getLast7DaysTemplate() {
  const map = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    map[key] = { date: key, CALL: 0, WHATSAPP: 0, NOTE: 0 };
  }
  return map;
}

function pct(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const counsellorId = searchParams.get("counsellorId");

    const client = await clientPromise;
    const salesDb = client.db("sales");
    const internalDb = client.db("internal");

    const callMatch = {};
    const whatsappMatch = {};
    const dmMatch = {};

    if (counsellorId) {
      callMatch.userId = counsellorId;
      dmMatch["assignedTo._id"] = new ObjectId(counsellorId);
    }

    const today = new Date();
    today.setHours(23,59,59,999);

    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate()-6);
    currentStart.setHours(0,0,0,0);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate()-7);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);

    const [
      callLogs,
      whatsappLogs,
      leadComments,

      totalCalls,
      totalWhatsapp,
      totalNotesAgg,

      callTrend,
      whatsappTrend,
      noteTrend,

      currentCalls,
      previousCalls,

      currentWhatsapp,
      previousWhatsapp,

      currentNotesAgg,
      previousNotesAgg
    ] = await Promise.all([
      salesDb.collection("call_logs").aggregate([
        {$match:callMatch},
        {$sort:{createdAt:-1}},
        {$limit:limit},
        {$lookup:{from:"dm",localField:"phone",foreignField:"phone",as:"leadData"}}
      ]).toArray(),

      salesDb.collection("whatsapp_logs").aggregate([
        {$match:whatsappMatch},
        {$sort:{createdAt:-1}},
        {$limit:limit},
        {$lookup:{
          from:"dm",
          let:{leadId:{$toObjectId:"$leadId"}},
          pipeline:[{$match:{$expr:{$eq:["$_id","$$leadId"]}}}],
          as:"leadData"
        }}
      ]).toArray(),

      salesDb.collection("dm").aggregate([
        {$match:dmMatch},
        {$unwind:"$comments"},
        {$sort:{"comments.createdAt":-1}},
        {$limit:limit}
      ]).toArray(),

      salesDb.collection("call_logs").countDocuments(callMatch),
      salesDb.collection("whatsapp_logs").countDocuments(whatsappMatch),
      salesDb.collection("dm").aggregate([
        {$match:dmMatch},
        {$unwind:"$comments"},
        {$count:"total"}
      ]).toArray(),

      salesDb.collection("call_logs").aggregate([
        {$match:{...callMatch,createdAt:{$gte:currentStart,$lte:today}}},
        {$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt"}},count:{$sum:1}}}
      ]).toArray(),

      salesDb.collection("whatsapp_logs").aggregate([
        {$match:{...whatsappMatch,createdAt:{$gte:currentStart,$lte:today}}},
        {$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt"}},count:{$sum:1}}}
      ]).toArray(),

      salesDb.collection("dm").aggregate([
        {$match:dmMatch},
        {$unwind:"$comments"},
        {$match:{"comments.createdAt":{$gte:currentStart,$lte:today}}},
        {$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$comments.createdAt"}},count:{$sum:1}}}
      ]).toArray(),

      salesDb.collection("call_logs").countDocuments({...callMatch,createdAt:{$gte:currentStart,$lte:today}}),
      salesDb.collection("call_logs").countDocuments({...callMatch,createdAt:{$gte:previousStart,$lte:previousEnd}}),

      salesDb.collection("whatsapp_logs").countDocuments({...whatsappMatch,createdAt:{$gte:currentStart,$lte:today}}),
      salesDb.collection("whatsapp_logs").countDocuments({...whatsappMatch,createdAt:{$gte:previousStart,$lte:previousEnd}}),

      salesDb.collection("dm").aggregate([
        {$match:dmMatch},{$unwind:"$comments"},
        {$match:{"comments.createdAt":{$gte:currentStart,$lte:today}}},
        {$count:"total"}
      ]).toArray(),

      salesDb.collection("dm").aggregate([
        {$match:dmMatch},{$unwind:"$comments"},
        {$match:{"comments.createdAt":{$gte:previousStart,$lte:previousEnd}}},
        {$count:"total"}
      ]).toArray()
    ]);

    const trends = getLast7DaysTemplate();
    callTrend.forEach(x=>trends[x._id]&&(trends[x._id].CALL=x.count));
    whatsappTrend.forEach(x=>trends[x._id]&&(trends[x._id].WHATSAPP=x.count));
    noteTrend.forEach(x=>trends[x._id]&&(trends[x._id].NOTE=x.count));

    const noteTotal = totalNotesAgg[0]?.total || 0;
    const currentNotes = currentNotesAgg[0]?.total || 0;
    const previousNotes = previousNotesAgg[0]?.total || 0;

    const ids=new Set();
    callLogs.forEach(c=>c.userId&&ids.add(c.userId));
    whatsappLogs.forEach(w=>{
      const id=w.leadData?.[0]?.assignedTo?._id;
      if(id) ids.add(id.toString());
    });

    const users=await internalDb.collection("users")
      .find({_id:{$in:[...ids].map(i=>new ObjectId(i))}})
      .project({name:1}).toArray();

    const userMap={};
    users.forEach(u=>userMap[u._id.toString()]=u.name);

    const calls=callLogs.map(c=>({
      id:c._id.toString(),
      interactionType:"CALL",
      details:`${c.call_type} Call - ${c.status}`,
      leadName:c.leadData?.[0]?.name||"Unknown Lead",
      phone:c.phone,
      counsellorName:userMap[c.userId]||"Unknown",
      timestamp:c.createdAt
    }));

    const wa=whatsappLogs.map(w=>({
      id:w._id.toString(),
      interactionType:"WHATSAPP",
      details:w.message,
      leadName:w.leadData?.[0]?.name||"Unknown Lead",
      phone:w.phone,
      counsellorName:userMap[w.leadData?.[0]?.assignedTo?._id?.toString()]||"System",
      timestamp:w.createdAt
    }));

    const notes=leadComments.map(n=>({
      id:n._id.toString()+String(n.comments.createdAt),
      interactionType:"NOTE",
      details:n.comments.text,
      leadName:n.name,
      phone:n.phone,
      counsellorName:n.comments.createdBy?.name||"Unknown",
      timestamp:n.comments.createdAt
    }));

    const data=[...calls,...wa,...notes]
      .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
      .slice(0,limit);

    return NextResponse.json({
      success:true,
      stats:{
        total:totalCalls+totalWhatsapp+noteTotal,
        byType:{
          CALL:totalCalls,
          WHATSAPP:totalWhatsapp,
          NOTE:noteTotal
        },
        last7Days:{
          CALL:currentCalls,
          WHATSAPP:currentWhatsapp,
          NOTE:currentNotes,
          TOTAL:currentCalls+currentWhatsapp+currentNotes
        },
        comparison:{
          CALL:{current:currentCalls,previous:previousCalls,change:pct(currentCalls,previousCalls)},
          WHATSAPP:{current:currentWhatsapp,previous:previousWhatsapp,change:pct(currentWhatsapp,previousWhatsapp)},
          NOTE:{current:currentNotes,previous:previousNotes,change:pct(currentNotes,previousNotes)},
          TOTAL:{
            current:currentCalls+currentWhatsapp+currentNotes,
            previous:previousCalls+previousWhatsapp+previousNotes,
            change:pct(currentCalls+currentWhatsapp+currentNotes,previousCalls+previousWhatsapp+previousNotes)
          }
        },
        trends:Object.values(trends)
      },
      data
    });

  } catch(error){
    console.error(error);
    return NextResponse.json({success:false,error:"Failed to fetch interactions"},{status:500});
  }
}