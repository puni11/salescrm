import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const STUDENT_COLLECTION = "dm";
const BATCH_COLLECTION = "batches";
const ASSIGNMENT_COLLECTION = "student_batch_assignments";

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

const idString = (value) => (value == null ? "" : String(value));

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPositiveInt = (value, fallback, max = Infinity) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

function calculatePayment(totalFee, payments = [], legacyPaidFee = 0) {
  const total = Math.max(Number(totalFee) || 0, 0);
  const legacyPaid = Math.max(Number(legacyPaidFee) || 0, 0);

  const paymentTotal = (Array.isArray(payments) ? payments : []).reduce(
    (sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0),
    0
  );

  const paid = legacyPaid + paymentTotal;
  const balanceDue = Math.max(total - paid, 0);

  let paymentStatus = "due";
  if (total > 0 && paid >= total) paymentStatus = "paid";
  else if (paid > 0) paymentStatus = "partial";

  return { totalFee: total, paidFee: paid, balanceDue, paymentStatus, legacyPaidFee: legacyPaid };
}

const normalizePayments = (payments) =>
  (Array.isArray(payments) ? payments : []).map((payment) => ({
    id: idString(payment._id || payment.id),
    amount: Number(payment.amount) || 0,
    paidAt: payment.paidAt || null,
    createdAt: payment.createdAt || null,
  }));

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

/* ------------------------------------------------------------------ */
/* GET /api/batches/[batchId]/students                                 */
/* Students who can still be assigned to this batch (server-side       */
/* search + pagination).                                               */
/* Query params: page, pageSize, search                                */
/* ------------------------------------------------------------------ */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const batchId =  id

    if (!ObjectId.isValid(batchId)) return fail("Valid batch ID is required");

    const db = await getDb();
    const batchObjectId = new ObjectId(batchId);

    const batch = await db
      .collection(BATCH_COLLECTION)
      .findOne({ _id: batchObjectId });

    if (!batch) return fail("Batch not found", 404);

    const sp = request.nextUrl.searchParams;
    const page = toPositiveInt(sp.get("page"), 1);
    const pageSize = toPositiveInt(sp.get("pageSize"), 10, 50);
    const search = (sp.get("search") || "").trim();

    // Students already in this batch are left out of the list.
    const assignedIds = await db
      .collection(ASSIGNMENT_COLLECTION)
      .distinct("studentId", { batchId: batchObjectId });

    const stages = [
      {
        $match: {
          status: { $regex: /^(registered|converted)$/i },
          _id: { $nin: assignedIds },
        },
      },
      {
        $addFields: {
          phoneStr: {
            $convert: { input: "$phone", to: "string", onError: "", onNull: "" },
          },
          createdDate: {
            $convert: { input: "$createdAt", to: "date", onError: null, onNull: null },
          },
        },
      },
    ];

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      stages.push({
        $match: { $or: [{ name: rx }, { email: rx }, { phoneStr: rx }] },
      });
    }

    const [result] = await db
      .collection(STUDENT_COLLECTION)
      .aggregate([
        ...stages,
        {
          $facet: {
            data: [
              { $sort: { createdDate: -1, _id: -1 } },
              { $skip: (page - 1) * pageSize },
              { $limit: pageSize },
            ],
            total: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const total = result?.total?.[0]?.count || 0;

    const students = (result?.data || []).map((student) => ({
      id: idString(student._id),
      name: student.name || "",
      email: student.email || "",
      phone: student.phone ? String(student.phone) : "",
      status: student.status,
      course: student.course || "",
      createdAt: student.createdAt || null,
    }));

    // Batch info the assign form needs (default fee + tools to pick from).
    const toolIds = (batch.tools || []).map((id) => new ObjectId(idString(id)));
    const tools = toolIds.length
      ? await db.collection("tools").find({ _id: { $in: toolIds } }).toArray()
      : [];

    return NextResponse.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          page,
          pageSize,
        },
        batch: {
          id: idString(batch._id),
          name: batch.name || "Unnamed batch",
          status: batch.status || "upcoming",
          fee: Number(batch.fee) || 0,
          tools: tools.map((tool) => ({
            id: idString(tool._id),
            name: tool.name || "Unnamed tool",
          })),
        },
      },
    });
  } catch (error) {
    console.error("Fetch assignable students error:", error);
    return fail(error.message || "Failed to fetch students", 500);
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/batches/[batchId]/students                                */
/* Assign one student to this batch. The batch comes from the URL.     */
/* Body: studentId, mode?, toolIds?, totalFee?, paymentAmount?,        */
/*       paymentDate?, isOldStudent?, jobGuarantee?                    */
/* ------------------------------------------------------------------ */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const batchId  = id
    const body = await request.json();

    const studentId = idString(body.studentId);
    const mode = body.mode || "full_course";

    if (!ObjectId.isValid(batchId) || !ObjectId.isValid(studentId)) {
      return fail("Valid student and batch IDs are required");
    }

    if (!["full_course", "selected_tools"].includes(mode)) {
      return fail("Choose full course or selected tools");
    }

    const db = await getDb();
    const studentObjectId = new ObjectId(studentId);
    const batchObjectId = new ObjectId(batchId);

    const [student, batch] = await Promise.all([
      db.collection(STUDENT_COLLECTION).findOne({ _id: studentObjectId }),
      db.collection(BATCH_COLLECTION).findOne({ _id: batchObjectId }),
    ]);

    if (!student) return fail("Student not found", 404);
    if (!batch) return fail("Batch not found", 404);

    if (["inactive", "completed"].includes(String(batch.status || "").toLowerCase())) {
      return fail("Cannot assign students to an inactive or completed batch");
    }

    const collection = db.collection(ASSIGNMENT_COLLECTION);
    const filter = { studentId: studentObjectId, batchId: batchObjectId };

    if (await collection.findOne(filter)) {
      return fail("This student is already assigned to this batch", 409);
    }

    /* ---------- tools ---------- */
    const batchToolIds = (batch.tools || []).map(idString);
    let toolIds;

    if (mode === "full_course") {
      toolIds = batchToolIds;
    } else {
      const selected = body.toolIds;

      if (
        !Array.isArray(selected) ||
        selected.length === 0 ||
        !selected.every((id) => typeof id === "string" && ObjectId.isValid(id))
      ) {
        return fail("Select at least one valid tool");
      }

      toolIds = [...new Set(selected)];

      if (toolIds.some((id) => !batchToolIds.includes(id))) {
        return fail("Selected tools must belong to this batch");
      }
    }

    if (toolIds.length === 0) return fail("This batch has no tools assigned");

    const toolTrainerAssignments = (batch.toolTrainerAssignments || [])
      .filter((item) => toolIds.includes(idString(item.toolId)))
      .map((item) => ({
        toolId: idString(item.toolId),
        trainerId: idString(item.trainerId),
      }));

    /* ---------- fee + optional first payment ---------- */
    // Falls back to the batch fee when no fee is sent.
    const totalFee = Number(
      body.totalFee === undefined || body.totalFee === "" || body.totalFee === null
        ? batch.fee ?? 0
        : body.totalFee
    );

    if (!Number.isFinite(totalFee) || totalFee < 0) {
      return fail("Total fee must be a valid non-negative number");
    }

    const now = new Date();
    const payments = [];
    const paymentAmount = Number(
      body.paymentAmount === undefined || body.paymentAmount === "" || body.paymentAmount === null
        ? 0
        : body.paymentAmount
    );

    if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
      return fail("Payment amount must be a valid non-negative number");
    }

    if (paymentAmount > 0) {
      const paidAt = body.paymentDate ? new Date(body.paymentDate) : now;

      if (Number.isNaN(paidAt.getTime())) {
        return fail("Please provide a valid payment date");
      }

      payments.push({ _id: new ObjectId(), amount: paymentAmount, paidAt, createdAt: now });
    }

    const paymentInfo = calculatePayment(totalFee, payments, 0);

    if (paymentInfo.paidFee > totalFee) {
      return fail("Total payments cannot exceed the total fee");
    }

    /* ---------- save ---------- */
    const doc = {
      studentId: studentObjectId,
      batchId: batchObjectId,

      batchName: batch.name || "Unnamed batch",
      courseId: batch.courseId || null,

      mode,
      toolIds,
      toolTrainerAssignments,

      // The two extra details
      isOldStudent: Boolean(body.isOldStudent),
      jobGuarantee: Boolean(body.jobGuarantee),

      totalFee,
      legacyPaidFee: 0,
      payments,

      paidFee: paymentInfo.paidFee,
      balanceDue: paymentInfo.balanceDue,
      paymentStatus: paymentInfo.paymentStatus,

      createdAt: now,
      assignedAt: now,
      updatedAt: now,
    };

    const { insertedId } = await collection.insertOne(doc);

    await db
      .collection(BATCH_COLLECTION)
      .updateOne({ _id: batchObjectId }, { $addToSet: { studentIds: studentObjectId } });

    return NextResponse.json({
      success: true,
      message: `${student.name || "Student"} assigned to ${batch.name || "batch"}`,
      data: {
        id: idString(insertedId),
        studentId,
        batchId,
        batchName: batch.name || "Unnamed batch",
        mode,
        toolIds,
        toolTrainerAssignments,
        isOldStudent: doc.isOldStudent,
        jobGuarantee: doc.jobGuarantee,
        payments: normalizePayments(payments),
        ...calculatePayment(totalFee, payments, 0),
        assignedAt: now,
      },
    });
  } catch (error) {
    console.error("Assign student to batch error:", error);
    return fail(error.message || "Failed to assign student", 500);
  }
}