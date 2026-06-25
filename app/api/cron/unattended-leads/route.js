import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendMail } from "@/lib/sendMail";

export async function GET(req) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("sales");

    const now = new Date();

    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    );

const fifteenDaysAgo = new Date(
  now.getTime() - 15 * 24 * 60 * 60 * 1000
);


    const level0Leads = await db.collection("dm").aggregate([
      {
  $match: {
    status: "New Lead",
     createdAt: {
      $gte: fifteenDaysAgo
    },
    $or: [
      { reminderLevel: 0 },
      { reminderLevel: { $exists: false } }
    ]
  }
},
      {
        $addFields: {
          lastCommentDate: {
            $max: "$comments.createdAt",
          },
        },
      },
      {
        $addFields: {
          lastActivity: {
            $ifNull: [
              "$lastCommentDate",
              "$createdAt",
            ],
          },
        },
      },
      {
        $match: {
          lastActivity: {
            $lte: twentyFourHoursAgo,
          },
        },
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
    ]).toArray();

    /**
     * LEVEL 1
     * Reminder already sent once
     * Wait another 24 Hours
     */

    const level1Leads = await db.collection("dm").find({
      status: "New Lead",
      createdAt: {
    $gte: fifteenDaysAgo
  },

      reminderLevel: 1,
      lastReminderSentAt: {
        $lte: twentyFourHoursAgo,
      },
    }).sort({
      createdAt: 1,
    }).toArray();

    /**
     * Merge Both Lists
     */

    const leads = [
      ...level0Leads,
      ...level1Leads,
    ];

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unattended leads found.",
      });
    }

    /**
     * Build Table Rows
     */

    const rows = leads
      .map((lead, index) => {
        const lastComment =
          lead.comments?.length > 0
            ? lead.comments[lead.comments.length - 1]
            : null;

        const reminderText =
          lead.reminderLevel === 1
            ? "SECOND REMINDER"
            : "FIRST REMINDER";

        return `
<tr>
<td style="padding:10px;border:1px solid #ddd;">${index + 1}</td>

<td style="padding:10px;border:1px solid #ddd;">
${lead.name}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${lead.phone}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${lead.email || "-"}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${lead.course || "-"}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${lead.source || "-"}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${lead.status}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${new Date(lead.createdAt).toLocaleString("en-IN")}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${
  lastComment
    ? new Date(lastComment.createdAt).toLocaleString("en-IN")
    : "-"
}
</td>

<td style="padding:10px;border:1px solid #ddd;">
${lastComment?.text || "No Comments"}
</td>

<td style="
padding:10px;
font-weight:bold;
color:${lead.reminderLevel === 1 ? "#dc2626" : "#d97706"};
">
${reminderText}
</td>

</tr>
`;
      })
      .join("");

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Unattended Leads</title>
</head>

<body style="font-family:Arial;background:#f4f4f4;padding:30px">

<div style="max-width:1200px;margin:auto;background:#fff;padding:30px;border-radius:10px">

<h2 style="margin-top:0;color:#dc2626">
🚨 Unattended Leads Report
</h2>

<p>
Total unattended leads:
<b>${leads.length}</b>
</p>

<table
width="100%"
border="1"
cellspacing="0"
cellpadding="10"
style="border-collapse:collapse"
>

<thead>

<tr style="background:#2563eb;color:#fff">

<th>#</th>
<th>Name</th>
<th>Phone</th>
<th>Email</th>
<th>Course</th>
<th>Source</th>
<th>Status</th>
<th>Created</th>
<th>Last Activity</th>
<th>Last Comment</th>
<th>Reminder</th>

</tr>

</thead>

<tbody>

${rows}

</tbody>

</table>

</div>

</body>
</html>
`;

        await sendMail({
      to: "puni199711@gmail.com",
      subject: `🚨 ${leads.length} Unattended Leads Report`,
      html,
    });

    // Update reminder level for all processed leads
    const bulkOps = leads.map((lead) => ({
      updateOne: {
        filter: {
          _id: lead._id,
        },
        update: {
          $set: {
            reminderLevel:
              lead.reminderLevel === 1
                ? 2
                : 1,

            lastReminderSentAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
    }));

    if (bulkOps.length) {
      await db.collection("dm").bulkWrite(bulkOps);
    }

    return NextResponse.json({
      success: true,
      total: leads.length,
      firstReminder: level0Leads.length,
      secondReminder: level1Leads.length,
      message: "Reminder email sent successfully.",
    });

  } catch (error) {
    console.error("Cron Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}