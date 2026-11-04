import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const COLLECTION = "batch_plans";
const MAX_NODES = 1500;
const MAX_EDGES = 3000;
const MAX_JSON_BYTES = 4 * 1024 * 1024;

function validBatchId(value) {
  return typeof value === "string" && ObjectId.isValid(value);
}

function cleanGraph(nodes, edges, viewport) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error("Nodes and edges must be arrays.");
  }
  if (nodes.length > MAX_NODES) throw new Error(`Maximum ${MAX_NODES} canvas elements allowed.`);
  if (edges.length > MAX_EDGES) throw new Error(`Maximum ${MAX_EDGES} connections allowed.`);

  const safeNodes = nodes.map((node) => {
    if (!node || typeof node.id !== "string" || typeof node.type !== "string") {
      throw new Error("Invalid canvas element.");
    }
    const position = node.position || {};
    const data = node.data || {};
    return {
      id: node.id.slice(0, 120),
      type: ["planner"].includes(node.type) ? node.type : "planner",
      position: {
        x: Number.isFinite(Number(position.x)) ? Number(position.x) : 0,
        y: Number.isFinite(Number(position.y)) ? Number(position.y) : 0,
      },
      width: Number.isFinite(Number(node.width)) ? Number(node.width) : undefined,
      height: Number.isFinite(Number(node.height)) ? Number(node.height) : undefined,
      style: node.style && typeof node.style === "object" ? node.style : undefined,
      data: {
        kind: ["note", "text", "task", "shape"].includes(data.kind) ? data.kind : "note",
        title: typeof data.title === "string" ? data.title.slice(0, 300) : "",
        text: typeof data.text === "string" ? data.text.slice(0, 12000) : "",
        color: typeof data.color === "string" ? data.color.slice(0, 30) : "yellow",
        status: ["todo", "doing", "done"].includes(data.status) ? data.status : "todo",
        priority: ["low", "medium", "high"].includes(data.priority) ? data.priority : "medium",
        dueDate: typeof data.dueDate === "string" ? data.dueDate.slice(0, 30) : "",
        shape: ["rectangle", "circle", "diamond"].includes(data.shape) ? data.shape : "rectangle",
      },
      draggable: node.draggable !== false,
      selectable: node.selectable !== false,
      connectable: node.connectable !== false,
    };
  });

  const safeIds = new Set(safeNodes.map((node) => node.id));
  const safeEdges = edges
    .filter((edge) => edge && safeIds.has(edge.source) && safeIds.has(edge.target))
    .map((edge) => ({
      id: String(edge.id || `${edge.source}-${edge.target}`).slice(0, 160),
      source: String(edge.source),
      target: String(edge.target),
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      type: "smoothstep",
      animated: Boolean(edge.animated),
      label: typeof edge.label === "string" ? edge.label.slice(0, 100) : undefined,
      markerEnd: edge.markerEnd ? { type: "arrowclosed" } : undefined,
      style: { strokeWidth: 2 },
    }));

  const safeViewport = viewport && typeof viewport === "object"
    ? {
        x: Number.isFinite(Number(viewport.x)) ? Number(viewport.x) : 0,
        y: Number.isFinite(Number(viewport.y)) ? Number(viewport.y) : 0,
        zoom: Math.min(2.5, Math.max(0.2, Number(viewport.zoom) || 1)),
      }
    : { x: 0, y: 0, zoom: 1 };

  const bytes = Buffer.byteLength(JSON.stringify({ nodes: safeNodes, edges: safeEdges }));
  if (bytes > MAX_JSON_BYTES) throw new Error("Canvas is too large to save (4 MB limit).");

  return { nodes: safeNodes, edges: safeEdges, viewport: safeViewport };
}

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

async function ensureIndexes(collection) {
  await collection.createIndex({ userId: 1, batchId: 1 }, { unique: true, name: "user_batch_unique" });
  await collection.createIndex({ updatedAt: -1 }, { name: "updated_at_desc" });
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if(!session){
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  if (!validBatchId(batchId)) {
    return NextResponse.json({ success: false, message: "Valid batchId is required." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);
    await ensureIndexes(collection);

    const batch = await db.collection("batches").findOne(
      { _id: new ObjectId(batchId) },
      { projection: { _id: 1, name: 1 } }
    );
    if (!batch) return NextResponse.json({ success: false, message: "Batch not found." }, { status: 404 });

    const plan = await collection.findOne({ userId: session.user.id, batchId: new ObjectId(batchId) });
    return NextResponse.json({
      success: true,
      data: plan || {
        batchId,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        updatedAt: null,
      },
    });
  } catch (error) {
    console.error("GET /api/batch-planner:", error);
    return NextResponse.json({ success: false, message: "Unable to load planner." }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if(!session){
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }


  try {
    const body = await request.json();
    const { batchId } = body || {};
    if (!validBatchId(batchId)) {
      return NextResponse.json({ success: false, message: "Valid batchId is required." }, { status: 400 });
    }

    const db = await getDb();
    const batchObjectId = new ObjectId(batchId);
    const batch = await db.collection("batches").findOne(
      { _id: batchObjectId },
      { projection: { _id: 1 } }
    );
    if (!batch) return NextResponse.json({ success: false, message: "Batch not found." }, { status: 404 });

    const graph = cleanGraph(body.nodes, body.edges, body.viewport);
    const now = new Date();
    const collection = db.collection(COLLECTION);
    await ensureIndexes(collection);

    await collection.updateOne(
      { userId: session.user.id, batchId: batchObjectId },
      {
        $set: { ...graph, updatedAt: now },
        $setOnInsert: { userId: session.user.id, batchId: batchObjectId, createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, savedAt: now.toISOString() });
  } catch (error) {
    console.error("PUT /api/batch-planner:", error);
    const status = error.message?.includes("must") || error.message?.includes("Maximum") ||
      error.message?.includes("too large") || error.message?.includes("Invalid") ? 400 : 500;
    return NextResponse.json(
      { success: false, message: status === 400 ? error.message : "Unable to save planner." },
      { status }
    );
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if(!session){
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  if (!validBatchId(batchId)) {
    return NextResponse.json({ success: false, message: "Valid batchId is required." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({
        userId: session.user.id,
      batchId: new ObjectId(batchId),
    });
    return NextResponse.json({ success: true, deleted: result.deletedCount > 0 });
  } catch (error) {
    console.error("DELETE /api/batch-planner:", error);
    return NextResponse.json({ success: false, message: "Unable to delete planner." }, { status: 500 });
  }
}
