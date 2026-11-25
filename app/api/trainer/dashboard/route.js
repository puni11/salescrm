
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const TIMEZONE = "Asia/Kolkata";

function getLocalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekStart(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;

  return addDays(dateString, difference);
}

function getMonthStart(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

function getMonthEnd(dateString) {
  const date = new Date(
    `${dateString.slice(0, 7)}-01T00:00:00.000Z`
  );

  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);

  return date.toISOString().slice(0, 10);
}

function getDuration(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  if (
    !Number.isFinite(sh) ||
    !Number.isFinite(sm) ||
    !Number.isFinite(eh) ||
    !Number.isFinite(em) ||
    sh > 23 ||
    eh > 23 ||
    sm > 59 ||
    em > 59
  ) {
    return 0;
  }

  let minutes = (eh * 60 + em) - (sh * 60 + sm);

  if (minutes <= 0) minutes += 24 * 60;

  return minutes / 60;
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function calculateOverlap(items) {
  if (!items.length) return 0;

  const intervals = items
    .filter(item => item.startTime && item.endTime)
    .map(item => ({
      start: toMinutes(item.startTime),
      end: toMinutes(item.endTime)
    }))
    .sort((a, b) => a.start - b.start);

  if (!intervals.length) return 0;

  let total = 0;
  let currentStart = intervals[0].start;
  let currentEnd = intervals[0].end;

  for (let i = 1; i < intervals.length; i++) {
    const interval = intervals[i];

    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      total += currentEnd - currentStart;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }

  total += currentEnd - currentStart;

  return total / 60;
}

function getBatchSessionDuration(batch) {
  return getDuration(batch.startingTime, batch.endingTime);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "trainer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const trainerId = session.user.id;

    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json(
        { success: false, message: "Invalid trainer ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const trainerObjectId = new ObjectId(trainerId);

    const trainerProfile = await db.collection("trainers").findOne({
      _id: trainerObjectId
    });

    if (!trainerProfile) {
      return NextResponse.json(
        { success: false, message: "Trainer profile not found" },
        { status: 404 }
      );
    }

    const today = getLocalDate();
    const weekStart = getWeekStart(today);
    const weekEnd = addDays(weekStart, 6);
    const monthStart = getMonthStart(today);
    const monthEnd = getMonthEnd(today);

    // --------------------------------------------------
    // 1. Trainer batches
    // --------------------------------------------------

    const batches = await db.collection("batches")
      .find({
        $or: [
          { trainers: trainerId },
          { "toolTrainerAssignments.trainerId": trainerId }
        ],
        status: "active"
      })
      .sort({ startingDate: -1 })
      .toArray();

    const batchIds = batches.map(batch => batch._id);

    // --------------------------------------------------
    // 2. Trainer sessions
    // --------------------------------------------------

    const allSessions = batchIds.length
      ? await db.collection("sessions")
          .find({
            batchId: { $in: batchIds },
            status: { $ne: "cancelled" }
          })
          .sort({ date: 1 })
          .toArray()
      : [];

    const batchMap = new Map(
      batches.map(batch => [batch._id.toString(), batch])
    );

    const trainerSessions = [];

    for (const item of allSessions) {
      const batch = batchMap.get(item.batchId.toString());

      if (!batch) continue;

      const assignments = batch.toolTrainerAssignments || [];

      const hasToolAssignments = assignments.length > 0;

      const trainerAssigned = assignments.some(
        assignment =>
          assignment.trainerId?.toString() === trainerId
      );

      const directlyAssigned = (batch.trainers || []).some(
        id => id.toString() === trainerId
      );

      if (!trainerAssigned && !directlyAssigned) continue;

      const assignedTools = assignments
        .filter(
          assignment =>
            assignment.trainerId?.toString() === trainerId
        )
        .map(assignment => assignment.toolId.toString());

      const toolId = item.toolId?.toString();

      if (
        hasToolAssignments &&
        (!toolId || !assignedTools.includes(toolId))
      ) {
        continue;
      }

      const startDate = item.date;
      const endDate = item.endDate || item.date;

      if (
        !startDate ||
        !endDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
        endDate < startDate
      ) {
        continue;
      }

      trainerSessions.push({
        _id: item._id,
        batchId: batch._id.toString(),
        batchName: batch.name,
        courseId: batch.courseId,
        startingDate: batch.startingDate,
        startDate,
        endDate,
        startTime: batch.startingTime || null,
        endTime: batch.endingTime || null,
        duration: getBatchSessionDuration(batch),
        toolId: toolId || null,
        status: item.status || "scheduled",
        notes: item.notes || ""
      });
    }

    // --------------------------------------------------
    // 3. Tools
    // --------------------------------------------------

    const trainerToolIds = new Set();

    (trainerProfile.tools || []).forEach(id => {
      trainerToolIds.add(id.toString());
    });

    trainerSessions.forEach(item => {
      if (item.toolId) trainerToolIds.add(item.toolId);
    });

    const toolIds = [...trainerToolIds]
      .filter(ObjectId.isValid)
      .map(id => new ObjectId(id));

    const tools = toolIds.length
      ? await db.collection("tools")
          .find({
            _id: { $in: toolIds },
            status: "active"
          })
          .project({
            name: 1,
            shortName: 1,
            status: 1
          })
          .toArray()
      : [];

    const toolMap = new Map(
      tools.map(tool => [tool._id.toString(), tool])
    );

    // --------------------------------------------------
    // 4. Courses
    // --------------------------------------------------

    const courseIds = [
      ...new Set(
        batches
          .map(batch => batch.courseId?.toString())
          .filter(id => id && ObjectId.isValid(id))
      )
    ];

    const courses = courseIds.length
      ? await db.collection("offeringCourses")
          .find({
            _id: {
              $in: courseIds.map(id => new ObjectId(id))
            }
          })
          .toArray()
      : [];

    const courseMap = new Map(
      courses.map(course => [course._id.toString(), course])
    );

    // --------------------------------------------------
    // 5. Expand session date ranges into daily schedules
    // --------------------------------------------------

    const dailyMap = new Map();

    for (const item of trainerSessions) {
      let currentDate = item.startDate;

      // Protect against unexpectedly large date ranges.
      let count = 0;

      while (currentDate <= item.endDate && count < 370) {
        const key = `${item.batchId}_${currentDate}`;

        if (!dailyMap.has(key)) {
          dailyMap.set(key, {
            date: currentDate,
            batchId: item.batchId,
            batchName: item.batchName,
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration,
            tools: new Set(),
            sessionIds: [],
            statuses: []
          });
        }

        const day = dailyMap.get(key);

        if (item.toolId) day.tools.add(item.toolId);

        day.sessionIds.push(item._id.toString());
        day.statuses.push(item.status);

        currentDate = addDays(currentDate, 1);
        count++;
      }
    }

    const dailySchedule = [...dailyMap.values()]
      .map(day => ({
        ...day,
        tools: [...day.tools].map(id => ({
          _id: id,
          name: toolMap.get(id)?.name || "Unknown Tool",
          shortName: toolMap.get(id)?.shortName || ""
        }))
      }))
      .sort((a, b) => {
        return (
          a.date.localeCompare(b.date) ||
          (a.startTime || "").localeCompare(b.startTime || "")
        );
      });

    const getDays = (start, end) =>
      dailySchedule.filter(day =>
        day.date >= start && day.date <= end
      );

    const todaySchedule = getDays(today, today);

    const weekSchedule = getDays(weekStart, weekEnd);

    const monthSchedule = getDays(monthStart, monthEnd);

    const getHours = days =>
      days.reduce((sum, day) => sum + day.duration, 0);

    const todayHours = getHours(todaySchedule);
    const weeklyHours = getHours(weekSchedule);
    const monthlyHours = getHours(monthSchedule);

    // Unique occupied time on the calendar today.
    const uniqueTodayHours = calculateOverlap(todaySchedule);

    // --------------------------------------------------
    // 6. Batch-wise workload
    // --------------------------------------------------

    const batchData = batches.map(batch => {
      const batchSessions = trainerSessions.filter(
        item => item.batchId === batch._id.toString()
      );

      const batchDays = dailySchedule.filter(
        day => day.batchId === batch._id.toString()
      );

      const upcoming = batchSessions
        .filter(item => item.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));

      const assignedToolIds = [
        ...new Set(
          (batch.toolTrainerAssignments || [])
            .filter(
              item => item.trainerId?.toString() === trainerId
            )
            .map(item => item.toolId.toString())
        )
      ];

      return {
        _id: batch._id,
        name: batch.name,
        startingDate: batch.startingDate || null,
        startingTime: batch.startingTime || null,
        endingTime: batch.endingTime || null,
        status: batch.status,
        batchType: batch.batchType || "regular",
        course: courseMap.get(batch.courseId?.toString()) || null,
        tools: assignedToolIds.map(id => ({
          _id: id,
          name: toolMap.get(id)?.name || "Unknown Tool",
          shortName: toolMap.get(id)?.shortName || ""
        })),
        sessionCount: batchSessions.length,
        upcomingSessionCount: upcoming.length,
        scheduledHours: batchDays.reduce(
          (sum, day) => sum + day.duration, 0
        ),
        todayHours: getHours(
          batchDays.filter(day => day.date === today)
        ),
        nextSession: upcoming[0] || null
      };
    });

    // --------------------------------------------------
    // 7. Workload by tool
    // --------------------------------------------------

    const toolWorkload = tools.map(tool => {
      const related = trainerSessions.filter(
        item => item.toolId === tool._id.toString()
      );

      const relatedDays = dailySchedule.filter(day =>
        day.tools.some(t => t._id === tool._id.toString())
      );

      return {
        _id: tool._id,
        name: tool.name,
        shortName: tool.shortName || "",
        sessionCount: related.length,
        batchCount: new Set(related.map(item => item.batchId)).size,
        scheduledHours: relatedDays.reduce(
          (sum, day) => sum + day.duration, 0
        )
      };
    });

    // --------------------------------------------------
    // 8. Students
    // --------------------------------------------------

    const assignments = batchIds.length
      ? await db.collection("student_batch_assignments")
          .find({ batchId: { $in: batchIds } })
          .toArray()
      : [];

    const studentMap = new Map();

    for (const assignment of assignments) {
      const batchId = assignment.batchId.toString();

      const batch = batchMap.get(batchId);

      if (!batch) continue;

      const assignedTools = (batch.toolTrainerAssignments || [])
        .filter(
          item => item.trainerId?.toString() === trainerId
        )
        .map(item => item.toolId.toString());

      const hasToolAssignments =
        (batch.toolTrainerAssignments || []).length > 0;

      const studentTools = (assignment.toolIds || [])
        .map(id => id.toString());

      const belongsToTrainer = hasToolAssignments
        ? studentTools.some(id => assignedTools.includes(id))
        : (batch.trainers || []).some(
            id => id.toString() === trainerId
          );

      if (!belongsToTrainer) continue;

      const studentId = assignment.studentId?.toString();

      if (!studentId) continue;

      const key = `${studentId}_${batchId}`;

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId,
          batchId,
          batchName: batch.name,
          courseName:
            courseMap.get(batch.courseId?.toString())?.name || "N/A",
          paymentStatus: assignment.paymentStatus || "N/A",
          totalFee: assignment.totalFee || 0,
          paidFee: assignment.paidFee || 0,
          balanceDue: assignment.balanceDue || 0,
          toolIds: studentTools.filter(id =>
            assignedTools.includes(id)
          )
        });
      }
    }

    const studentIds = [
      ...new Set([...studentMap.values()].map(s => s.studentId))
    ]
      .filter(ObjectId.isValid)
      .map(id => new ObjectId(id));

    const studentRecords = studentIds.length
      ? await db.collection("dm")
          .find({ _id: { $in: studentIds } })
          .project({
            name: 1,
            email: 1,
            phone: 1,
            phone10: 1,
            status: 1
          })
          .toArray()
      : [];

    const dmMap = new Map(
      studentRecords.map(student => [
        student._id.toString(),
        student
      ])
    );

    const students = [...studentMap.values()].map(item => {
      const student = dmMap.get(item.studentId);

      return {
        ...item,
        name: student?.name || "Student",
        email: student?.email || "",
        phone: student?.phone10 || student?.phone || "",
        leadStatus: student?.status || "N/A"
      };
    });

    // --------------------------------------------------
    // 9. Schedule conflicts
    // --------------------------------------------------

    const conflicts = [];

    for (const day of todaySchedule) {
      if (!day.startTime || !day.endTime) continue;

      const overlapping = todaySchedule.filter(other => {
        if (other.batchId === day.batchId) return false;
        if (!other.startTime || !other.endTime) return false;

        return (
          toMinutes(day.startTime) < toMinutes(other.endTime) &&
          toMinutes(other.startTime) < toMinutes(day.endTime)
        );
      });

      if (overlapping.length) {
        const exists = conflicts.some(conflict =>
          conflict.batchIds.includes(day.batchId)
        );

        if (!exists) {
          conflicts.push({
            date: today,
            batchIds: [
              day.batchId,
              ...overlapping.map(item => item.batchId)
            ],
            batchNames: [
              day.batchName,
              ...overlapping.map(item => item.batchName)
            ]
          });
        }
      }
    }

    // --------------------------------------------------
    // 10. Upcoming sessions
    // --------------------------------------------------

    const upcomingSessions = trainerSessions
      .filter(item => item.endDate >= today)
      .sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      )
      .slice(0, 10)
      .map(item => ({
        ...item,
        tool: toolMap.get(item.toolId) || null,
        course: courseMap.get(item.courseId?.toString()) || null
      }));

    // --------------------------------------------------
    // 11. Final response
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      timezone: TIMEZONE,

      trainer: {
        id: trainerId,
        name: session.user.name || trainerProfile.name,
        email: session.user.email || ""
      },

      summary: {
        totalBatches: batchData.length,
        totalStudents: students.length,
        totalTools: tools.length,
        totalCourses: new Set(
          batchData
            .map(batch => batch.course?._id?.toString())
            .filter(Boolean)
        ).size,

        todayHours,
        uniqueTodayHours,
        weeklyHours,
        monthlyHours,

        todayClasses: todaySchedule.length,
        weeklyClasses: weekSchedule.length,
        monthlyClasses: monthSchedule.length,

        upcomingSessions: trainerSessions.filter(
          item => item.endDate >= today
        ).length,

        activeBatches: batchData.filter(
          batch => batch.status === "active"
        ).length,

        scheduleConflicts: conflicts.length
      },

      periods: {
        today,
        weekStart,
        weekEnd,
        monthStart,
        monthEnd
      },

      batches: batchData,
      tools,
      courses,
      students,

      sessions: trainerSessions,
      upcomingSessions,
      dailySchedule,
      todaySchedule,
      toolWorkload,
      conflicts
    });

  } catch (error) {
    console.error("Trainer Dashboard API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load trainer dashboard",
        error: process.env.NODE_ENV === "development"
          ? error.message
          : undefined
      },
      { status: 500 }
    );
  }
}
