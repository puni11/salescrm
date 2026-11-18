import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "sales";
const TIME_ZONE = "Asia/Kolkata";

function getIndianDateTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const date = `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}-${parts.find((p) => p.type === "day").value}`;

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return {
    date,
    time,
    now,
  };
}

function getDurationInMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return {
    minutes,
    hours,
    remainingMinutes,
    formatted:
      hours > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${remainingMinutes}m`,
  };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid trainer ID",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const trainerId = id;

    const trainer = await db.collection("trainers").findOne({
      _id: new ObjectId(id),
    });

    if (!trainer) {
      return NextResponse.json(
        {
          success: false,
          message: "Trainer not found",
        },
        { status: 404 }
      );
    }

    const { date: today, time: currentTime, now } =
      getIndianDateTime();

    // Fetch all active batches assigned to trainer
    const batches = await db
      .collection("batches")
      .find({
        status: "active",
        $or: [
          {
            trainers: trainerId,
          },
          {
            "toolTrainerAssignments.trainerId": trainerId,
          },
        ],
      })
      .toArray();

    // Normalize and calculate durations
    const schedules = batches
      .filter(
        (batch) =>
          batch.startingDate &&
          batch.startingTime &&
          batch.endingTime
      )
      .map((batch) => {
        const durationMinutes = getDurationInMinutes(
          batch.startingTime,
          batch.endingTime
        );

        return {
          batchId: batch._id,
          batchName: batch.name,
          courseId: batch.courseId,
          batchType: batch.batchType || "regular",
          status: batch.status,
          startingDate: batch.startingDate,
          startingTime: batch.startingTime,
          endingTime: batch.endingTime,
          duration: formatDuration(durationMinutes),
          studentCount: batch.studentIds?.length || 0,
        };
      })
      .sort((a, b) => {
        const dateA = `${a.startingDate} ${a.startingTime}`;
        const dateB = `${b.startingDate} ${b.startingTime}`;

        return dateA.localeCompare(dateB);
      });

    // Today's batches
    const todaySchedules = schedules.filter(
      (batch) => batch.startingDate === today
    );

    // Currently ongoing batch
    const currentBatch = todaySchedules.find(
      (batch) =>
        currentTime >= batch.startingTime &&
        currentTime < batch.endingTime
    );

    // Upcoming batches
    const upcomingSchedules = schedules.filter((batch) => {
      const batchDateTime = `${batch.startingDate} ${batch.startingTime}`;
      const currentDateTime = `${today} ${currentTime}`;

      return batchDateTime > currentDateTime;
    });

    const nextBatch = upcomingSchedules[0] || null;

    // Today's total scheduled duration
    const todayTotalMinutes = todaySchedules.reduce(
      (total, batch) => total + batch.duration.minutes,
      0
    );

    // Currently occupied until
    let occupiedUntil = null;

    if (currentBatch) {
      occupiedUntil = {
        date: currentBatch.startingDate,
        time: currentBatch.endingTime,
        batchName: currentBatch.batchName,
      };
    }

    // Trainer availability
    let availabilityStatus = "available";
    let availabilityMessage = "Trainer is currently available";

    if (currentBatch) {
      availabilityStatus = "occupied";
      availabilityMessage = `Trainer is occupied until ${currentBatch.endingTime}`;
    } else if (nextBatch) {
      availabilityStatus = "available";
      availabilityMessage = `Trainer is available until ${nextBatch.startingTime} today`;
    }

    // Calculate next availability
    let nextAvailableAt = null;

    if (currentBatch) {
      nextAvailableAt = {
        date: currentBatch.startingDate,
        time: currentBatch.endingTime,
      };
    }

    return NextResponse.json({
      success: true,

      trainer: {
        _id: trainer._id,
        name: trainer.name,
      },

      currentTime: {
        date: today,
        time: currentTime,
        timezone: TIME_ZONE,
      },

      availability: {
        status: availabilityStatus,
        message: availabilityMessage,

        isOccupied: !!currentBatch,

        occupiedTill: occupiedUntil,

        nextAvailableAt,

        currentBatch: currentBatch || null,

        nextBatch: nextBatch || null,
      },

      summary: {
        totalActiveBatches: schedules.length,

        totalBatchesToday: todaySchedules.length,

        occupiedMinutesToday: todayTotalMinutes,

        occupiedHoursToday: formatDuration(todayTotalMinutes),

        upcomingBatches: upcomingSchedules.length,
      },

      todaySchedule: todaySchedules,

      upcomingSchedule: upcomingSchedules,

      allSchedules: schedules,
    });
  } catch (error) {
    console.error("Trainer occupancy API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch trainer occupancy",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}