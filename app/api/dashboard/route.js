import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req) {
  try {
    const client = await clientPromise;

    const salesDB = client.db("sales");
    const internalDB = client.db("internal");

    const dm = salesDB.collection("dm");
    const callLogs = salesDB.collection("call_logs");
    const engagement = salesDB.collection("engagement");
    const whatsapp = salesDB.collection("whatsapp_logs");
    const users = internalDB.collection("users");

    const now = new Date();

    const today = new Date();
    today.setHours(0,0,0,0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      todayLeads,
      monthLeads,
      totalCalls,
      todayCalls,
      totalWhatsapp,
      activeCounsellors,
      engagementScoreAgg,
      avgLeadScoreAgg,
      leadStatus,
      monthlyLeads,
      courseDistribution,
      callAnalytics,
      engagementAnalytics,
      topCounsellors,
      recentLeads,
      recentCalls,
      recentWhatsapp,
      recentComments,
      topEngagedLeads,
      conversion
    ] = await Promise.all([

      dm.countDocuments(),
      dm.countDocuments({createdAt:{$gte:today}}),
      dm.countDocuments({createdAt:{$gte:monthStart}}),

      callLogs.countDocuments(),
      callLogs.countDocuments({createdAt:{$gte:today}}),

      whatsapp.countDocuments(),

      users.countDocuments({
        role:"counsellor",
        isBlocked:false
      }),

      engagement.aggregate([
        {$group:{_id:null,score:{$sum:"$score"}}}
      ]).toArray(),

      engagement.aggregate([
        {$group:{_id:"$leadId",score:{$sum:"$score"}}},
        {$group:{_id:null,avg:{$avg:"$score"}}}
      ]).toArray(),

      dm.aggregate([
        {$group:{_id:"$status",count:{$sum:1}}},
        {$project:{_id:0,status:"$_id",count:1}},
        {$sort:{count:-1}}
      ]).toArray(),

      dm.aggregate([
        {$group:{
          _id:{
            year:{$year:"$createdAt"},
            month:{$month:"$createdAt"}
          },
          leads:{$sum:1}
        }},
        {$sort:{"_id.year":1,"_id.month":1}}
      ]).toArray(),

      dm.aggregate([
        {$group:{_id:"$course",count:{$sum:1}}},
        {$project:{_id:0,course:"$_id",count:1}},
        {$sort:{count:-1}}
      ]).toArray(),

      callLogs.aggregate([
        {$group:{
          _id:"$call_type",
          total:{$sum:1},
          avgDuration:{$avg:"$duration_seconds"}
        }}
      ]).toArray(),

      engagement.aggregate([
        {$group:{
          _id:"$type",
          count:{$sum:1},
          score:{$sum:"$score"}
        }},
        {$project:{_id:0,type:"$_id",count:1,score:1}}
      ]).toArray(),

      dm.aggregate([
        {$group:{
          _id:"$assignedTo.name",
          assignedLeads:{$sum:1}
        }},
        {$project:{_id:0,name:"$_id",assignedLeads:1}},
        {$sort:{assignedLeads:-1}}
      ]).toArray(),

      dm.find({},{
        projection:{
          name:1,phone:1,status:1,course:1,assignedTo:1,createdAt:1
        }
      }).sort({createdAt:-1}).limit(10).toArray(),

      callLogs.find({}).sort({call_time:-1}).limit(10).toArray(),

      whatsapp.find({}).sort({sentAt:-1}).limit(10).toArray(),

      dm.aggregate([
        {$unwind:"$comments"},
        {$project:{
          leadName:"$name",
          phone:"$phone",
          comment:"$comments.text",
          createdAt:"$comments.createdAt",
          createdBy:"$comments.createdBy.name"
        }},
        {$sort:{createdAt:-1}},
        {$limit:10}
      ]).toArray(),

      engagement.aggregate([
        {$group:{_id:"$leadId",score:{$sum:"$score"}}},
        {$sort:{score:-1}},
        {$limit:10},
        {$lookup:{
          from:"dm",
          localField:"_id",
          foreignField:"_id",
          as:"lead"
        }},
        {$unwind:"$lead"},
        {$project:{
          _id:0,
          score:1,
          name:"$lead.name",
          phone:"$lead.phone",
          status:"$lead.status",
          course:"$lead.course"
        }}
      ]).toArray(),

      Promise.all([
        dm.countDocuments(),
        dm.countDocuments({
          status:{$in:["Admission Done","Converted","Closed Won"]}
        })
      ])
    ]);

    const months=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

   const monthlyLeadChart = [];

for (let i = 1; i <= 12; i++) {
  const found = monthlyLeads.find(
    (m) => m._id.month === i
  );

  monthlyLeadChart.push({
    month: months[i],
    year: now.getFullYear(),
    leads: found ? found.leads : 0,
  });
}

    const callSummary={
      incoming:0,
      outgoing:0,
      missed:0,
      rejected:0,
      averageDuration:0
    };

    let totalAvg=0;

    callAnalytics.forEach(c=>{
      const t=(c._id||"").toUpperCase();
      if(t==="INCOMING") callSummary.incoming=c.total;
      if(t==="OUTGOING") callSummary.outgoing=c.total;
      if(t==="MISSED") callSummary.missed=c.total;
      if(t==="REJECTED") callSummary.rejected=c.total;
      totalAvg+=c.avgDuration||0;
    });

    if(callAnalytics.length){
      callSummary.averageDuration=Math.round(totalAvg/callAnalytics.length);
    }

    const recentActivities=[
      ...recentCalls.map(x=>({
        type:"CALL",
        phone:x.phone,
        time:x.call_time
      })),
      ...recentWhatsapp.map(x=>({
        type:"WHATSAPP",
        phone:x.phone,
        time:x.sentAt,
        message:x.message
      })),
      ...recentComments.map(x=>({
        type:"COMMENT",
        lead:x.leadName,
        phone:x.phone,
        comment:x.comment,
        time:x.createdAt
      }))
    ].sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,20);

    return NextResponse.json({
      success:true,
      summary:{
        totalLeads,
        todayLeads,
        monthLeads,
        totalCalls,
        todayCalls,
        totalWhatsapp,
        activeCounsellors,
        totalEngagementScore:engagementScoreAgg[0]?.score||0,
        averageLeadScore:Math.round(avgLeadScoreAgg[0]?.avg||0),
        conversionRate:conversion[0]?Number(((conversion[1]/conversion[0])*100).toFixed(2)):0
      },
      leadStatus,
      monthlyLeadChart,
      callSummary,
      engagementAnalytics,
      courseDistribution,
      topCounsellors,
      recentLeads,
      recentActivities,
      topEngagedLeads
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {success:false,error:err.message},
      {status:500}
    );
  }
}