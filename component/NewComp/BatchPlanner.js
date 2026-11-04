"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  MarkerType,
  addEdge,
  reconnectEdge,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowDownToLine, Check, CheckSquare, ChevronDown, ChevronUp, Download, FileJson,
  FileText, Hand, Heading, ListChecks, Loader2, Magnet, Map as MapIcon, Maximize,
  MousePointer2, Plus, Redo2, Search, Shapes, StickyNote, Type, Undo2, X,
} from "lucide-react";
import PlannerNode, { PlannerActionsContext, SWATCH } from "./PlannerNode";

const nodeTypes = { planner: PlannerNode };
const NOTE_COLORS = ["yellow", "pink", "blue", "green", "purple"];
const SIZES = {
  note: { width: 230, height: 180 },
  text: { width: 260, height: 110 },
  heading: { width: 340, height: 64 },
  task: { width: 270, height: 220 },
  checklist: { width: 260, height: 230 },
  shape: { width: 200, height: 130 },
};
const LINK_STYLES = [
  { id: "smoothstep", label: "Rounded" },
  { id: "default", label: "Curved" },
  { id: "straight", label: "Straight" },
  { id: "step", label: "Elbow" },
];
const GRID = 22;
const SYNC_MS = 5 * 60 * 1000; // push to the API at most once every 5 minutes

// Local draft: written on every edit (debounced), so nothing is lost between API syncs.
const draftKey = (batchId) => `batch-planner:draft:${batchId}`;
function readDraft(batchId) {
  try {
    const raw = localStorage.getItem(draftKey(batchId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(batchId, draft) {
  try {
    localStorage.setItem(draftKey(batchId), JSON.stringify(draft));
  } catch {
    /* storage full or unavailable – API sync still works */
  }
}
function clearDraft(batchId) {
  try { localStorage.removeItem(draftKey(batchId)); } catch { /* ignore */ }
}

/* ----------------------------- helpers ----------------------------- */

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function extractBatches(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.batches)) return payload.batches;
  if (Array.isArray(payload?.data?.batches)) return payload.data.batches;
  return [];
}

// Strip runtime-only fields so only durable data is saved / snapshotted.
const cleanNode = ({ selected, dragging, resizing, measured, positionAbsolute, internals, ...rest }) => ({
  ...rest,
  data: Object.fromEntries(Object.entries(rest.data || {}).filter(([, value]) => typeof value !== "function")),
});
const cleanEdge = ({ selected, ...rest }) => rest;

function makeNode(kind, index, position) {
  const defaults = {
    note: { title: "New note", text: "", color: NOTE_COLORS[index % NOTE_COLORS.length] },
    text: { text: "", color: "white" },
    heading: { text: "Heading", color: "white" },
    task: { title: "New task", text: "", color: "white", status: "todo", priority: "medium", dueDate: "" },
    checklist: { title: "Checklist", color: "white", items: [{ id: uid(), text: "", done: false }] },
    shape: { text: "", color: "white", shape: "rectangle" },
  };
  return {
    id: uid(),
    type: "planner",
    position,
    width: SIZES[kind].width,
    height: SIZES[kind].height,
    data: { kind, ...defaults[kind] },
  };
}

function nodeSearchText(node) {
  const d = node.data || {};
  const items = Array.isArray(d.items) ? d.items.map((item) => item.text).join(" ") : "";
  return `${d.title || ""} ${d.text || ""} ${items}`.toLowerCase();
}

const safeName = (name) => (name || "batch").replace(/[^a-z0-9-_]/gi, "-");

function download(url, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
}

function isEditing(target) {
  const tag = target?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
}

function ToolBtn({ onClick, active, disabled, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------ canvas ------------------------------ */

function PlannerCanvasInner({ batchId, batchName }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(-1);
  const [saveState, setSaveState] = useState("loading");
  const [lastSaved, setLastSaved] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [initialView, setInitialView] = useState({ viewport: { x: 0, y: 0, zoom: 1 }, fit: false });
  const [histState, setHistState] = useState({ undo: 0, redo: 0 });
  const [tool, setTool] = useState("select");
  const [snap, setSnap] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [linkStyle, setLinkStyle] = useState("smoothstep");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Refs always hold the latest state so callbacks can stay stable (no stale closures).
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
  const initialized = useRef(false);
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const saveTimer = useRef(null);
  const localTimer = useRef(null);
  const syncTimer = useRef(null);
  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const coalesceRef = useRef({ key: null, t: 0 });
  const clipboardRef = useRef(null);
  const pasteCount = useRef(0);
  const flowRef = useRef(null);
  const exportMenuRef = useRef(null);

  const { screenToFlowPosition, fitView } = useReactFlow();

  /* ------------------------------ saving ------------------------------ */

  const sendSave = useCallback(
    async (keepalive = false) => {
      const response = await fetch("/api/batch-planner", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        keepalive,
        body: JSON.stringify({
          batchId,
          nodes: nodesRef.current.map(cleanNode),
          edges: edgesRef.current.map(cleanEdge),
          viewport: viewportRef.current,
        }),
      });
      let payload = {};
      try { payload = await response.json(); } catch { /* empty body */ }
      if (!response.ok) throw new Error(payload.message || "Save failed.");
      return payload;
    },
    [batchId]
  );

  // Pushes the board to the API. Runs every 5 minutes (if there are changes),
  // on "Sync now" / Ctrl+S, and when you leave the page.
  const saveNow = useCallback(
    async function run() {
      if (!initialized.current) return;
      clearTimeout(saveTimer.current);
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
      if (savingRef.current) {
        saveTimer.current = setTimeout(run, 400);
        return;
      }
      savingRef.current = true;
      setSaveState("saving");
      const version = versionRef.current;
      try {
        const payload = await sendSave();
        setLastSaved(payload.savedAt || new Date().toISOString());
        setError("");
        if (versionRef.current === version) {
          dirtyRef.current = false;
          clearDraft(batchId);
          setSaveState("saved");
        } else {
          setSaveState("local"); // edited during the request; next 5-minute sync will pick it up
          if (!syncTimer.current) {
            syncTimer.current = setTimeout(() => { syncTimer.current = null; run(); }, SYNC_MS);
          }
        }
      } catch (err) {
        setSaveState("error");
        setError(`${err.message || "Sync failed."} Your changes are kept on this device and will retry.`);
        saveTimer.current = setTimeout(run, 30000);
      } finally {
        savingRef.current = false;
      }
    },
    [sendSave, batchId]
  );

  const persistLocal = useCallback(() => {
    writeDraft(batchId, {
      nodes: nodesRef.current.map(cleanNode),
      edges: edgesRef.current.map(cleanEdge),
      viewport: viewportRef.current,
      updatedAt: new Date().toISOString(),
      dirty: dirtyRef.current,
    });
  }, [batchId]);

  const markDirty = useCallback(() => {
    if (!initialized.current) return;
    versionRef.current += 1;
    dirtyRef.current = true;
    setSaveState((state) => (state === "saving" || state === "error" ? state : "local"));
    // 1) save to this device shortly after the last edit
    clearTimeout(localTimer.current);
    localTimer.current = setTimeout(persistLocal, 300);
    // 2) schedule ONE API sync 5 minutes after the first unsynced edit (not reset by later edits)
    if (!syncTimer.current) {
      syncTimer.current = setTimeout(() => {
        syncTimer.current = null;
        saveNow();
      }, SYNC_MS);
    }
  }, [persistLocal, saveNow]);

  // When leaving the page or switching batch: keep the local draft and make a best-effort sync.
  useEffect(() => {
    const flush = () => {
      if (!initialized.current || !dirtyRef.current) return;
      persistLocal();
      sendSave(true).catch(() => {}); // if this fails, the local draft syncs next visit
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      clearTimeout(saveTimer.current);
      clearTimeout(localTimer.current);
      clearTimeout(syncTimer.current);
      flush();
    };
  }, [sendSave, persistLocal]);

  /* ------------------------------ loading ------------------------------ */

  useEffect(() => {
    let active = true;
    initialized.current = false;
    dirtyRef.current = false;
    setLoaded(false);
    setLoadError("");
    setError("");
    setSaveState("loading");
    const draft = readDraft(batchId);
    const useDraft = !!(draft && draft.dirty && Array.isArray(draft.nodes));

    const apply = (plan, fromDraft) => {
      const loadedNodes = (plan?.nodes || []).map((node) => ({ ...node, selected: false, data: { ...node.data } }));
      // Older boards had only top/bottom handles with no ids – map them to the new ids.
      const loadedEdges = (plan?.edges || []).map((edge) => ({
        ...edge,
        sourceHandle: edge.sourceHandle ?? "b",
        targetHandle: edge.targetHandle ?? "t",
      }));
      const vp = plan?.viewport && Number.isFinite(plan.viewport.zoom) ? plan.viewport : null;
      viewportRef.current = vp || { x: 0, y: 0, zoom: 1 };
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setInitialView({ viewport: viewportRef.current, fit: !vp && loadedNodes.length > 0 });
      historyRef.current = [];
      futureRef.current = [];
      setHistState({ undo: 0, redo: 0 });
      initialized.current = true;
      setLoaded(true);
      if (fromDraft) {
        markDirty(); // unsynced local edits found → queue the 5-minute sync
      } else {
        setSaveState("saved");
        clearDraft(batchId);
      }
    };

    fetch(`/api/batch-planner?batchId=${encodeURIComponent(batchId)}`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Could not load this canvas.");
        return payload.data;
      })
      .then((plan) => {
        if (!active) return;
        setLastSaved(plan?.updatedAt || null);
        apply(useDraft ? draft : plan, useDraft);
      })
      .catch((err) => {
        if (!active) return;
        if (useDraft) {
          apply(draft, true);
          setError("Couldn't reach the server – showing the copy saved on this device. It will sync when the server is back.");
        } else {
          setLoadError(err.message || "Could not load this canvas.");
          setSaveState("error");
        }
      });

    return () => { active = false; };
  }, [batchId, reloadKey, setNodes, setEdges, markDirty]);

  /* ------------------------------ history ------------------------------ */

  const snapshot = () => ({
    nodes: nodesRef.current.map(cleanNode),
    edges: edgesRef.current.map(cleanEdge),
  });
  const syncHist = () => setHistState({ undo: historyRef.current.length, redo: futureRef.current.length });

  // Call BEFORE a change. A `key` merges rapid repeats (e.g. typing) into one undo step.
  const pushHistory = useCallback((key) => {
    const now = Date.now();
    if (key && coalesceRef.current.key === key && now - coalesceRef.current.t < 1200) {
      coalesceRef.current.t = now;
      return;
    }
    coalesceRef.current = { key: key || null, t: now };
    historyRef.current = [...historyRef.current.slice(-79), snapshot()];
    futureRef.current = [];
    syncHist();
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    futureRef.current.push(snapshot());
    coalesceRef.current = { key: null, t: 0 };
    setNodes(previous.nodes);
    setEdges(previous.edges);
    syncHist();
    markDirty();
  }, [setNodes, setEdges, markDirty]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(snapshot());
    coalesceRef.current = { key: null, t: 0 };
    setNodes(next.nodes);
    setEdges(next.edges);
    syncHist();
    markDirty();
  }, [setNodes, setEdges, markDirty]);

  /* ------------------------------ node actions ------------------------------ */

  const updateNodeData = useCallback(
    (id, patch, discrete = false) => {
      pushHistory(discrete ? undefined : `${id}:${Object.keys(patch).join(",")}`);
      setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
      markDirty();
    },
    [pushHistory, setNodes, markDirty]
  );

  const removeNode = useCallback(
    (id) => {
      pushHistory();
      setNodes((current) => current.filter((node) => node.id !== id));
      setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
      markDirty();
    },
    [pushHistory, setNodes, setEdges, markDirty]
  );

  const cloneNodes = useCallback(
    (sourceNodes, sourceEdges, offset) => {
      if (!sourceNodes.length) return;
      pushHistory();
      const idMap = new Map();
      const newNodes = sourceNodes.map((node) => {
        const id = uid();
        idMap.set(node.id, id);
        const copy = JSON.parse(JSON.stringify(cleanNode(node)));
        if (Array.isArray(copy.data?.items)) copy.data.items = copy.data.items.map((item) => ({ ...item, id: uid() }));
        return { ...copy, id, selected: true, position: { x: node.position.x + offset, y: node.position.y + offset } };
      });
      const newEdges = sourceEdges
        .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
        .map((edge) => ({ ...cleanEdge(edge), id: uid(), source: idMap.get(edge.source), target: idMap.get(edge.target) }));
      setNodes((current) => [...current.map((node) => (node.selected ? { ...node, selected: false } : node)), ...newNodes]);
      setEdges((current) => [...current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)), ...newEdges]);
      markDirty();
    },
    [pushHistory, setNodes, setEdges, markDirty]
  );

  const duplicateNode = useCallback(
    (id) => {
      const node = nodesRef.current.find((item) => item.id === id);
      if (node) cloneNodes([node], [], 36);
    },
    [cloneNodes]
  );

  const copySelection = useCallback(() => {
    const selected = nodesRef.current.filter((node) => node.selected);
    if (!selected.length) return false;
    const ids = new Set(selected.map((node) => node.id));
    clipboardRef.current = {
      nodes: JSON.parse(JSON.stringify(selected.map(cleanNode))),
      edges: JSON.parse(JSON.stringify(edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target)).map(cleanEdge))),
    };
    pasteCount.current = 0;
    return true;
  }, []);

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip?.nodes?.length) return;
    pasteCount.current += 1;
    cloneNodes(clip.nodes, clip.edges, 36 * pasteCount.current);
  }, [cloneNodes]);

  const duplicateSelection = useCallback(() => {
    const selected = nodesRef.current.filter((node) => node.selected);
    const ids = new Set(selected.map((node) => node.id));
    cloneNodes(selected, edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target)), 36);
  }, [cloneNodes]);

  const addItem = useCallback(
    (kind, center) => {
      pushHistory();
      const size = SIZES[kind];
      let point = center;
      if (!point) {
        const rect = flowRef.current?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const base = screenToFlowPosition({ x: cx, y: cy });
        const jitter = (nodesRef.current.length % 6) * 26;
        point = { x: base.x + jitter, y: base.y + jitter };
      }
      const node = makeNode(kind, nodesRef.current.length, { x: point.x - size.width / 2, y: point.y - size.height / 2 });
      setNodes((current) => [...current.map((item) => (item.selected ? { ...item, selected: false } : item)), { ...node, selected: true }]);
      markDirty();
    },
    [pushHistory, screenToFlowPosition, setNodes, markDirty]
  );

  const actions = useMemo(
    () => ({ update: updateNodeData, duplicate: duplicateNode, remove: removeNode, beginEdit: () => pushHistory() }),
    [updateNodeData, duplicateNode, removeNode, pushHistory]
  );

  /* ------------------------------ flow handlers ------------------------------ */

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      const meaningful = changes.some(
        (change) =>
          change.type === "add" ||
          change.type === "remove" ||
          change.type === "reset" ||
          change.type === "position" ||
          (change.type === "dimensions" && (change.setAttributes || change.resizing !== undefined))
      );
      if (meaningful) markDirty(); // selection / auto-measure changes no longer trigger saves
    },
    [onNodesChange, markDirty]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      if (changes.some((change) => change.type === "add" || change.type === "remove" || change.type === "replace")) markDirty();
    },
    [onEdgesChange, markDirty]
  );

  const onConnect = useCallback(
    (connection) => {
      pushHistory();
      setEdges((current) =>
        addEdge(
          { ...connection, type: linkStyle, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
          current
        )
      );
      markDirty();
    },
    [pushHistory, setEdges, linkStyle, markDirty]
  );

  const onReconnect = useCallback(
    (oldEdge, connection) => {
      pushHistory();
      setEdges((current) => reconnectEdge(oldEdge, connection, current));
      markDirty();
    },
    [pushHistory, setEdges, markDirty]
  );

  const onBeforeDelete = useCallback(async () => {
    pushHistory();
    return true;
  }, [pushHistory]);

  const changeLinkStyle = (type) => {
    setLinkStyle(type);
    if (!edgesRef.current.length) return;
    pushHistory();
    setEdges((current) => current.map((edge) => ({ ...edge, type })));
    markDirty();
  };

  const onMoveEnd = useCallback(
    (event, nextViewport) => {
      viewportRef.current = nextViewport;
      if (event) markDirty(); // only user-driven pans/zooms, not programmatic fitView
    },
    [markDirty]
  );

  /* ------------------------------ keyboard ------------------------------ */

  useEffect(() => {
    const handler = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      const editing = isEditing(event.target);

      if (key === "s") {
        event.preventDefault();
        saveNow();
        return;
      }
      if (editing) return; // let inputs keep native undo / copy / paste
      if (key === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "d") {
        event.preventDefault();
        duplicateSelection();
      } else if (key === "c") {
        if (!window.getSelection()?.toString()) copySelection();
      } else if (key === "v") {
        pasteClipboard();
      } else if (key === "a") {
        event.preventDefault();
        setNodes((current) => current.map((node) => ({ ...node, selected: true })));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, saveNow, duplicateSelection, copySelection, pasteClipboard, setNodes]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) setExportOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setExportOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [exportOpen]);

  /* ------------------------------ search ------------------------------ */

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return nodes.filter((node) => nodeSearchText(node).includes(needle)).map((node) => node.id);
  }, [nodes, query]);

  const displayNodes = useMemo(() => {
    if (!matches) return nodes;
    const set = new Set(matches);
    return nodes.map((node) => (set.has(node.id) ? node : { ...node, style: { ...node.style, opacity: 0.18 } }));
  }, [nodes, matches]);

  const goToMatch = (direction) => {
    if (!matches?.length) return;
    let next;
    if (matchIndex < 0) next = direction > 0 ? 0 : matches.length - 1;
    else next = (matchIndex + direction + matches.length) % matches.length;
    setMatchIndex(next);
    fitView({ nodes: [{ id: matches[next] }], padding: 0.6, duration: 450, maxZoom: 1.2 });
  };

  /* ------------------------------ export ------------------------------ */

  const renderImage = async (background) => {
    const list = nodesRef.current;
    if (!list.length) throw new Error("Add something to the canvas before exporting.");
    const { toPng } = await import("html-to-image");
    const bounds = getNodesBounds(list);
    const width = Math.min(4000, Math.max(800, Math.round(bounds.width + 160)));
    const height = Math.min(4000, Math.max(500, Math.round(bounds.height + 160)));
    const vp = getViewportForBounds(bounds, width, height, 0.05, 2, 0.08);
    const element = flowRef.current?.querySelector(".react-flow__viewport");
    if (!element) throw new Error("Canvas is not ready to export.");
    const dataUrl = await toPng(element, {
      backgroundColor: background,
      width,
      height,
      pixelRatio: 1.5,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
      filter: (node) => !node?.classList?.contains?.("react-flow__handle") && !node?.classList?.contains?.("react-flow__resize-control"),
    });
    return { dataUrl, width, height };
  };

  const runExport = async (type) => {
    setExportOpen(false);
    setExporting(true);
    try {
      const name = safeName(batchName);
      if (type === "json") {
        const blob = new Blob(
          [JSON.stringify({ name: batchName, nodes: nodesRef.current.map(cleanNode), edges: edgesRef.current.map(cleanEdge) }, null, 2)],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        download(url, `${name}-planner.json`);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else if (type === "png") {
        const { dataUrl } = await renderImage("#f8fafc");
        download(dataUrl, `${name}-planner.png`);
      } else {
        const { dataUrl, width, height } = await renderImage("#ffffff");
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: width >= height ? "landscape" : "portrait", unit: "pt", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const scale = Math.min((pageW - 40) / width, (pageH - 40) / height);
        const w = width * scale;
        const h = height * scale;
        pdf.addImage(dataUrl, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
        pdf.save(`${name}-planner.pdf`);
      }
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  /* ------------------------------ derived ------------------------------ */

  const taskStats = useMemo(() => {
    const tasks = nodes.filter((node) => node.data?.kind === "task");
    return { total: tasks.length, done: tasks.filter((node) => node.data?.status === "done").length };
  }, [nodes]);

  const onWrapperDoubleClick = (event) => {
    if (!event.target?.classList?.contains("react-flow__pane")) return;
    addItem("note", screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  /* ------------------------------ render ------------------------------ */

  if (loadError) {
    return (
      <div className="m-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <span>{loadError}</span>
        <button onClick={() => setReloadKey((key) => key + 1)} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-red-100">
          Try again
        </button>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Loading your canvas…
      </div>
    );
  }

  const saveLabel = { loading: "Loading", saving: "Syncing…", local: "Saved on this device · syncs every 5 min", error: "Sync failed · kept on this device", saved: "Synced to server" }[saveState];

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[650px] flex-col overflow-hidden bg-white">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">Personal workspace</div>
          <h1 className="truncate text-lg font-semibold text-slate-900">{batchName || "Batch planner"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500" role="status">
            {saveState === "saving" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saveState === "error" ? (
              <X size={14} className="text-red-500" />
            ) : (
              <Check size={14} className={saveState === "local" ? "text-amber-500" : "text-green-600"} />
            )}
            {saveLabel}
          </div>
          <ToolBtn onClick={undo} disabled={!histState.undo} title="Undo (Ctrl+Z)"><Undo2 size={15} /></ToolBtn>
          <ToolBtn onClick={redo} disabled={!histState.redo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></ToolBtn>
          <button onClick={() => saveNow()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700">
            Sync now
          </button>
          <div className="relative" ref={exportMenuRef}>
            <ToolBtn onClick={() => setExportOpen((open) => !open)} disabled={exporting} title="Export">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
            </ToolBtn>
            {exportOpen && (
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-lg border bg-white p-1 shadow-xl">
                <button onClick={() => runExport("png")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50"><ArrowDownToLine size={14} /> Image (PNG)</button>
                <button onClick={() => runExport("pdf")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50"><FileText size={14} /> Document (PDF)</button>
                <button onClick={() => runExport("json")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50"><FileJson size={14} /> Backup (JSON)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="mr-1 text-xs font-medium text-slate-400">Add</span>
        <ToolBtn onClick={() => addItem("note")} title="Sticky note" className="!border-amber-200 !bg-amber-50 !text-amber-900 hover:!bg-amber-100"><StickyNote size={14} /> Note</ToolBtn>
        <ToolBtn onClick={() => addItem("task")} title="Task" className="!border-blue-200 !bg-blue-50 !text-blue-900 hover:!bg-blue-100"><CheckSquare size={14} /> Task</ToolBtn>
        <ToolBtn onClick={() => addItem("checklist")} title="Checklist" className="!border-green-200 !bg-green-50 !text-green-900 hover:!bg-green-100"><ListChecks size={14} /> Checklist</ToolBtn>
        <ToolBtn onClick={() => addItem("text")} title="Text block"><Type size={14} /> Text</ToolBtn>
        <ToolBtn onClick={() => addItem("heading")} title="Heading"><Heading size={14} /> Heading</ToolBtn>
        <ToolBtn onClick={() => addItem("shape")} title="Shape"><Shapes size={14} /> Shape</ToolBtn>

        <span className="mx-1 h-6 w-px bg-slate-200" />

        <ToolBtn onClick={() => setTool("select")} active={tool === "select"} title="Select tool (drag to box-select)"><MousePointer2 size={14} /></ToolBtn>
        <ToolBtn onClick={() => setTool("hand")} active={tool === "hand"} title="Hand tool (drag to pan)"><Hand size={14} /></ToolBtn>
        <ToolBtn onClick={() => setSnap((value) => !value)} active={snap} title="Snap to grid"><Magnet size={14} /></ToolBtn>
        <ToolBtn onClick={() => setShowMap((value) => !value)} active={showMap} title="Minimap"><MapIcon size={14} /></ToolBtn>
        <ToolBtn onClick={() => fitView({ padding: 0.25, duration: 400 })} title="Fit everything in view"><Maximize size={14} /></ToolBtn>
        <select
          value={linkStyle}
          onChange={(event) => changeLinkStyle(event.target.value)}
          aria-label="Link style"
          title="Link style"
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"
        >
          {LINK_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label} links</option>)}
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setMatchIndex(-1); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") goToMatch(event.shiftKey ? -1 : 1);
                if (event.key === "Escape") { setQuery(""); event.target.blur(); }
              }}
              placeholder="Find on board…"
              className="w-44 rounded-lg border bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-slate-400"
            />
          </div>
          {matches && (
            <>
              <span className="min-w-[44px] text-center text-[11px] text-slate-500">
                {matches.length ? `${matchIndex < 0 ? 0 : matchIndex + 1}/${matches.length}` : "No match"}
              </span>
              <ToolBtn onClick={() => goToMatch(-1)} disabled={!matches.length} title="Previous match"><ChevronUp size={14} /></ToolBtn>
              <ToolBtn onClick={() => goToMatch(1)} disabled={!matches.length} title="Next match"><ChevronDown size={14} /></ToolBtn>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* canvas */}
      <div className="relative min-h-0 flex-1" ref={flowRef} onDoubleClick={onWrapperDoubleClick}>
        <PlannerActionsContext.Provider value={actions}>
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onNodeDragStart={() => pushHistory()}
            onSelectionDragStart={() => pushHistory()}
            onBeforeDelete={onBeforeDelete}
            onMoveEnd={onMoveEnd}
            onPaneContextMenu={(event) => event.preventDefault()}
            isValidConnection={(connection) => connection.source !== connection.target}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            defaultViewport={initialView.viewport}
            fitView={initialView.fit}
            fitViewOptions={{ padding: 0.25 }}
            defaultEdgeOptions={{ type: linkStyle, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } }}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionOnDrag={tool === "select"}
            panOnDrag={tool === "hand" ? true : [1, 2]}
            snapToGrid={snap}
            snapGrid={[GRID, GRID]}
            zoomOnDoubleClick={false}
            onlyRenderVisibleElements
            minZoom={0.1}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            className="bg-[#F8FAFC]"
          >
            <Background color="#CBD5E1" gap={GRID} size={1} />
            <Controls position="bottom-left" showInteractive={false} />
            {showMap && (
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                nodeColor={(node) => SWATCH[node.data?.color] || "#CBD5E1"}
                nodeStrokeColor="#94A3B8"
                nodeStrokeWidth={2}
              />
            )}
          </ReactFlow>
        </PlannerActionsContext.Provider>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm"><Plus className="text-slate-500" /></div>
            <div className="text-sm font-semibold text-slate-700">Start planning your batch</div>
            <p className="mt-1 text-xs text-slate-500">Add a note, task, checklist or shape from the toolbar, or double-click the canvas.</p>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-4 py-2 text-[11px] text-slate-400">
        <span className="hidden md:inline">
          Double-click to add a note · Drag from a dot to link · Ctrl+D duplicate · Ctrl+C/V copy & paste · Delete removes selection
        </span>
        <span className="flex items-center gap-3">
          <span>{nodes.length} items</span>
          {taskStats.total > 0 && <span>{taskStats.done}/{taskStats.total} tasks done</span>}
          <span>{lastSaved ? `Last synced ${new Date(lastSaved).toLocaleTimeString()}` : "Not synced yet"}</span>
        </span>
      </div>
    </div>
  );
}

function PlannerCanvas(props) {
  return (
    <ReactFlowProvider>
      <PlannerCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

/* --------------------------- batch selector --------------------------- */

const LAST_BATCH_KEY = "batch-planner:last-batch";

export default function BatchPlanner() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchError, setBatchError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/batch-planner/batches", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Could not load batches.");
        return extractBatches(payload);
      })
      .then((items) => {
        if (!active) return;
        setBatches(items);
        let remembered = "";
        try { remembered = localStorage.getItem(LAST_BATCH_KEY) || ""; } catch { /* storage unavailable */ }
        const pick = items.find((batch) => String(batch._id) === remembered) || items[0];
        if (pick) setBatchId(String(pick._id));
      })
      .catch((error) => active && setBatchError(error.message))
      .finally(() => active && setLoadingBatches(false));
    return () => { active = false; };
  }, []);

  const selectBatch = (id) => {
    setBatchId(id);
    try { localStorage.setItem(LAST_BATCH_KEY, id); } catch { /* ignore */ }
  };

  const selectedBatch = batches.find((batch) => String(batch._id) === batchId);

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Batch planner</h1>
          <p className="mt-0.5 text-xs text-slate-500">Your private visual workspace for batch planning</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="planner-batch" className="text-xs font-medium text-slate-500">Batch</label>
          <select
            id="planner-batch"
            value={batchId}
            onChange={(event) => selectBatch(event.target.value)}
            disabled={loadingBatches || !batches.length}
            className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-50"
          >
            {loadingBatches && <option value="">Loading batches…</option>}
            {!loadingBatches && !batches.length && <option value="">No batches found</option>}
            {batches.map((batch) => (
              <option key={batch._id} value={String(batch._id)}>{batch.name || "Untitled batch"}</option>
            ))}
          </select>
        </div>
      </div>
      {batchError ? (
        <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{batchError}</div>
      ) : loadingBatches ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading batches…</div>
      ) : !batchId ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">No batches available.</div>
      ) : (
        <PlannerCanvas key={batchId} batchId={batchId} batchName={selectedBatch?.name} />
      )}
    </div>
  );
}