
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

const TZ = "Asia/Kolkata";

function getIndiaDateTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = String(time).split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatTime(time) {
  if (!time) return null;

  const minutes = timeToMinutes(time);

  if (minutes === null) return time;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const date = new Date();
  date.setHours(hours, mins, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function isDateWithinRange(date, endDate, today) {
  if (!date) return false;

  const start = String(date).slice(0, 10);
  const end = String(endDate || date).slice(0, 10);

  return today >= start && today <= end;
}

function getDateStatus(session, today) {
  const start = String(session.date || "").slice(0, 10);
  const end = String(session.endDate || session.date || "").slice(0, 10);

  if (today >= start && today <= end) return "ongoing";
  if (start > today) return "upcoming";
  return "completed";
}

function getSessionDuration(startingTime, endingTime) {
  const start = timeToMinutes(startingTime);
  const end = timeToMinutes(endingTime);

  if (start === null || end === null) return 0;

  // Support sessions ending after midnight
  return end >= start ? end - start : 24 * 60 - start + end;
}

/**
 * Calculates total daily teaching time without double counting overlaps.
 */
function calculateUnionDuration(intervals) {
  if (!intervals.length) return 0;

  const sorted = intervals
    .filter((i) => i.start !== null && i.end !== null && i.end > i.start)
    .sort((a, b) => a.start - b.start);

  if (!sorted.length) return 0;

  let total = 0;
  let currentStart = sorted[0].start;
  let currentEnd = sorted[0].end;

  for (let i = 1; i < sorted.length; i++) {
    const interval = sorted[i];

    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      total += currentEnd - currentStart;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }

  total += currentEnd - currentStart;

  return total;
}

function attachSchedule(session, batch, tool) {
  const startingTime = batch?.startingTime || null;
  const endingTime = batch?.endingTime || null;

  const durationMinutes = getSessionDuration(
    startingTime,
    endingTime
  );

  return {
    ...session,

    batchId: String(session.batchId),
    toolId: String(session.toolId),

    startingTime,
    endingTime,

    startingTimeFormatted: formatTime(startingTime),
    endingTimeFormatted: formatTime(endingTime),

    timeRange:
      startingTime && endingTime
        ? `${formatTime(startingTime)} - ${formatTime(endingTime)}`
        : "Time not configured",

    durationMinutes,
    durationFormatted: formatDuration(durationMinutes),

    tool: tool
      ? {
          _id: String(tool._id),
          name: tool.name,
          shortName: tool.shortName,
        }
      : null,
  };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid trainer ID" },
        { status: 400 }
      );
    }

    const trainerObjectId = new ObjectId(id);
    const trainerId = String(id);

    const client = await clientPromise;
    const db = client.db("sales");

    const todayInfo = getIndiaDateTime();
    const today = todayInfo.date;
    const currentTime = todayInfo.time;
    const currentMinutes =
      todayInfo.hour * 60 + todayInfo.minute;

    const trainer = await db.collection("trainers").findOne({
      _id: trainerObjectId,
    });

    if (!trainer) {
      return NextResponse.json(
        { success: false, message: "Trainer not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // Trainer batches
    // --------------------------------------------------

    const batches = await db.collection("batches").find({
      trainers: trainerId,
    }).toArray();

    const batchIds = batches.map((batch) => batch._id);

    const batchMap = new Map(
      batches.map((batch) => [String(batch._id), batch])
    );

    // --------------------------------------------------
    // Sessions for trainer batches
    // --------------------------------------------------

    const sessions = batchIds.length
      ? await db.collection("sessions").find({
          batchId: { $in: batchIds },
          status: "ongoing",
        }).toArray()
      : [];

    // --------------------------------------------------
    // Related courses and tools
    // --------------------------------------------------

    const courseIds = [
      ...new Set(
        batches
          .map((batch) => batch.courseId)
          .filter(Boolean)
      ),
    ];

    const toolIds = [
      ...new Set(
        [
          ...(trainer.tools || []),
          ...batches.flatMap((batch) => batch.tools || []),
          ...sessions.map((session) => session.toolId),
        ].filter(Boolean)
      ),
    ];

    const courses = courseIds.length
      ? await db.collection("offeringCourses").find({
          _id: {
            $in: courseIds.map((courseId) =>
              ObjectId.isValid(courseId)
                ? new ObjectId(courseId)
                : courseId
            ),
          },
        }).toArray()
      : [];

    const tools = toolIds.length
      ? await db.collection("tools").find({
          _id: {
            $in: toolIds.map((toolId) =>
              ObjectId.isValid(toolId)
                ? new ObjectId(toolId)
                : toolId
            ),
          },
        }).toArray()
      : [];

    const courseMap = new Map(
      courses.map((course) => [String(course._id), course])
    );

    const toolMap = new Map(
      tools.map((tool) => [String(tool._id), tool])
    );

    // --------------------------------------------------
    // Trainer assigned tools
    // --------------------------------------------------

    const trainerTools = (trainer.tools || [])
      .map((toolId) => {
        const tool = toolMap.get(String(toolId));

        if (!tool) return null;

        return {
          toolId: String(tool._id),
          tool: {
            _id: String(tool._id),
            name: tool.name,
            shortName: tool.shortName,
          },
        };
      })
      .filter(Boolean);

    const trainerToolIds = new Set(
      (trainer.tools || []).map(String)
    );

    // --------------------------------------------------
    // Process sessions assigned to trainer's tools
    // --------------------------------------------------

    const processedSessions = [];

    for (const session of sessions) {
      const batch = batchMap.get(String(session.batchId));

      if (!batch) continue;

      const toolId = String(session.toolId || "");

      // Session must be for a tool assigned to trainer
      if (!trainerToolIds.has(toolId)) continue;

      // Tool must be assigned to this trainer in the batch
      const toolAssignment = (
        batch.toolTrainerAssignments || []
      ).find(
        (assignment) =>
          String(assignment.toolId) === toolId &&
          String(assignment.trainerId) === trainerId
      );

      if (!toolAssignment) continue;

      const processed = attachSchedule(
        session,
        batch,
        toolMap.get(toolId)
      );

      processed.dateStatus = getDateStatus(session, today);

      processed.isActiveToday = isDateWithinRange(
        session.date,
        session.endDate,
        today
      );

      processed.isUpcoming =
        String(session.date || "").slice(0, 10) > today;

      processed.batch = {
        _id: String(batch._id),
        name: batch.name,
        startingTime: batch.startingTime || null,
        endingTime: batch.endingTime || null,
        startingTimeFormatted: formatTime(batch.startingTime),
        endingTimeFormatted: formatTime(batch.endingTime),
        course: courseMap.get(String(batch.courseId))
          ? {
              _id: String(
                courseMap.get(String(batch.courseId))._id
              ),
              name: courseMap.get(String(batch.courseId)).name,
            }
          : null,
      };

      const startMinutes = timeToMinutes(
        processed.startingTime
      );

      const endMinutes = timeToMinutes(
        processed.endingTime
      );

      processed.isBusyNow =
        processed.isActiveToday &&
        startMinutes !== null &&
        endMinutes !== null &&
        currentMinutes >= startMinutes &&
        currentMinutes < endMinutes;

      processed.busyUntil = processed.isBusyNow
        ? processed.endingTimeFormatted
        : null;

      processed.busyFrom = processed.isBusyNow
        ? processed.startingTimeFormatted
        : null;

      processed.remainingBusyMinutes =
        processed.isBusyNow && endMinutes !== null
          ? Math.max(0, endMinutes - currentMinutes)
          : 0;

      processed.remainingBusyFormatted = formatDuration(
        processed.remainingBusyMinutes
      );

      processed.isUpcomingToday =
        processed.isActiveToday &&
        startMinutes !== null &&
        currentMinutes < startMinutes;

      processed.durationMinutes = getSessionDuration(
        processed.startingTime,
        processed.endingTime
      );

      processed.durationFormatted = formatDuration(
        processed.durationMinutes
      );

      processedSessions.push(processed);
    }

    // --------------------------------------------------
    // Today's sessions
    // --------------------------------------------------

    const todaySessions = processedSessions.filter(
      (session) => session.isActiveToday
    );

    const currentSessions = todaySessions.filter(
      (session) => session.isBusyNow
    );

    const upcomingSessions = processedSessions
      .filter((session) => {
        if (session.isActiveToday) {
          const start = timeToMinutes(session.startingTime);

          return (
            start !== null &&
            currentMinutes < start
          );
        }

        return session.isUpcoming;
      })
      .sort((a, b) => {
        const aDate = String(a.date || "");
        const bDate = String(b.date || "");

        if (aDate !== bDate) return aDate.localeCompare(bDate);

        return (
          (timeToMinutes(a.startingTime) || 0) -
          (timeToMinutes(b.startingTime) || 0)
        );
      });

    // --------------------------------------------------
    // Total teaching time today
    // --------------------------------------------------

    const todayIntervals = todaySessions
      .map((session) => ({
        start: timeToMinutes(session.startingTime),
        end: timeToMinutes(session.endingTime),
      }))
      .filter((interval) => {
        return (
          interval.start !== null &&
          interval.end !== null &&
          interval.end > interval.start
        );
      });

    const todayTeachingMinutes = calculateUnionDuration(
      todayIntervals
    );

    // --------------------------------------------------
    // Current busy status
    // --------------------------------------------------

    const isOccupied = currentSessions.length > 0;

    const currentSession = currentSessions[0] || null;

    const busyUntil = currentSessions.length
      ? currentSessions.reduce((latest, session) => {
          const latestMinutes = timeToMinutes(latest.endingTime);
          const sessionMinutes = timeToMinutes(
            session.endingTime
          );

          return sessionMinutes > latestMinutes
            ? session
            : latest;
        })
      : null;

    // --------------------------------------------------
    // Process batches
    // --------------------------------------------------

    const processedBatches = batches.map((batch) => {
      const batchSessions = processedSessions.filter(
        (session) =>
          String(session.batchId) === String(batch._id)
      );

      const activeSessions = batchSessions.filter(
        (session) => session.isBusyNow
      );

      const upcomingBatchSessions = batchSessions.filter(
        (session) =>
          session.isUpcomingToday ||
          session.isUpcoming
      );

      const batchTrainerTools = (
        batch.toolTrainerAssignments || []
      )
        .filter(
          (assignment) =>
            String(assignment.trainerId) === trainerId
        )
        .map((assignment) => {
          const tool = toolMap.get(
            String(assignment.toolId)
          );

          return {
            toolId: String(assignment.toolId),
            tool: tool
              ? {
                  _id: String(tool._id),
                  name: tool.name,
                  shortName: tool.shortName,
                }
              : null,
          };
        })
        .filter((item) => item.tool);

      return {
        ...batch,
        _id: String(batch._id),

        course: courseMap.get(String(batch.courseId))
          ? {
              _id: String(
                courseMap.get(String(batch.courseId))._id
              ),
              name: courseMap.get(String(batch.courseId)).name,
            }
          : null,

        trainerTools: batchTrainerTools,

        sessions: batchSessions,

        activeSessions,
        upcomingSessions: upcomingBatchSessions,

        isCurrentlyTeaching: activeSessions.length > 0,
        activeSessionCount: activeSessions.length,
        upcomingSessionCount: upcomingBatchSessions.length,
      };
    });

    // --------------------------------------------------
    // Stats
    // --------------------------------------------------

    const totalTrainerSessions = processedSessions.length;

    const activeSessionsCount = currentSessions.length;

    const upcomingSessionsCount = upcomingSessions.length;

    const activeBatches = processedBatches.filter(
      (batch) => batch.isCurrentlyTeaching
    ).length;

    const upcomingBatches = processedBatches.filter(
      (batch) => batch.upcomingSessionCount > 0
    ).length;

    return NextResponse.json({
      success: true,

      today,
      currentTime,
      currentMinutes,

      trainer,

      stats: {
        totalBatches: processedBatches.length,
        activeBatches,
        upcomingBatches,

        totalTrainerSessions,
        activeSessions: activeSessionsCount,
        upcomingSessions: upcomingSessionsCount,

        totalTools: trainerTools.length,

        todayTeachingMinutes,
        todayTeachingTime: formatDuration(
          todayTeachingMinutes
        ),
      },

      occupancy: {
        isOccupied,
        status: isOccupied ? "busy" : "available",

        currentSessions,
        currentSession,

        busyFrom: currentSession?.startingTimeFormatted || null,
        busyUntil: busyUntil?.endingTimeFormatted || null,
        busyUntilTime: busyUntil?.endingTime || null,

        remainingBusyMinutes: busyUntil
          ? Math.max(
              0,
              (timeToMinutes(busyUntil.endingTime) || 0) -
                currentMinutes
            )
          : 0,

        totalActiveSessions: currentSessions.length,

        upcomingSessions,
        totalUpcomingSessions: upcomingSessions.length,

        todayTeachingMinutes,
        todayTeachingTime: formatDuration(
          todayTeachingMinutes
        ),
      },

      currentSessions,
      upcomingSessions,

      batches: processedBatches,
      tools: trainerTools,
    });
  } catch (error) {
    console.error("Trainer detail API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch trainer details",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
