"use client";

import { memo, createContext, useContext, useRef } from "react";
import { Handle, Position, NodeResizer, NodeToolbar } from "@xyflow/react";
import {
  CheckSquare, Copy, Heading, ListChecks, Plus, Shapes, StickyNote, Trash2, Type, X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared actions (replaces the old `data.onChange` function).         */
/* Keeping functions out of node data means data stays serialisable,   */
/* nodes don't get re-created every render, and memo() actually works. */
/* ------------------------------------------------------------------ */
const noop = () => {};
export const PlannerActionsContext = createContext({
  update: noop,
  duplicate: noop,
  remove: noop,
  beginEdit: noop,
});

export const COLOR_KEYS = ["yellow", "pink", "blue", "green", "purple", "white"];
export const SWATCH = {
  yellow: "#FDE68A", pink: "#FBCFE8", blue: "#BFDBFE",
  green: "#BBF7D0", purple: "#DDD6FE", white: "#FFFFFF",
};
const FILL = {
  yellow: "#FFF2B3", pink: "#FCE1E8", blue: "#DDEBFF",
  green: "#DDF2DF", purple: "#EDE2FF", white: "#FFFFFF",
};
const STROKE = {
  yellow: "#E8D58A", pink: "#EABBC8", blue: "#B9D2F5",
  green: "#B8DDBD", purple: "#D4C0F3", white: "#D6DCE5",
};
const SHAPES = [
  { id: "rectangle", label: "Box" },
  { id: "rounded", label: "Rounded" },
  { id: "circle", label: "Oval" },
  { id: "diamond", label: "Diamond" },
];

const STATUS_STYLE = {
  todo: "border-slate-200 bg-white text-slate-700",
  doing: "border-blue-200 bg-blue-50 text-blue-700",
  done: "border-green-200 bg-green-50 text-green-700",
};
const PRIORITY_DOT = { low: "bg-slate-400", medium: "bg-amber-400", high: "bg-red-500" };

const todayStr = () => new Date().toLocaleDateString("en-CA");
const itemId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `i_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const handleClass = (selected) =>
  `!h-2.5 !w-2.5 !border !border-white !bg-slate-500 transition-opacity ${
    selected ? "!opacity-100" : "!opacity-0 group-hover:!opacity-100"
  }`;

function PlannerNode({ id, data, selected }) {
  const actions = useContext(PlannerActionsContext);
  const focusItem = useRef(null);

  const kind = data?.kind || "note";
  const color = FILL[data?.color] ? data.color : kind === "note" ? "yellow" : "white";
  // discrete=true → always its own undo step (dropdowns, buttons); false → typing, coalesced
  const update = (patch, discrete = false) => actions.update(id, patch, discrete);

  const header = {
    note: { icon: <StickyNote size={13} />, label: "Note" },
    task: { icon: <CheckSquare size={13} />, label: "Task" },
    checklist: { icon: <ListChecks size={13} />, label: "Checklist" },
  }[kind];

  /* ---------------- floating toolbar ---------------- */
  const toolbar = (
    <NodeToolbar position={Position.Top} offset={10}>
      <div className="nodrag nopan flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        {COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            title={`Color: ${key}`}
            onClick={() => update({ color: key }, true)}
            className={`h-5 w-5 rounded-full border ${color === key ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
            style={{ backgroundColor: SWATCH[key], borderColor: STROKE[key] }}
          />
        ))}
        {kind === "shape" && (
          <>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            {SHAPES.map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => update({ shape: shape.id }, true)}
                className={`rounded px-1.5 py-1 text-[11px] ${(data.shape || "rectangle") === shape.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {shape.label}
              </button>
            ))}
          </>
        )}
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button type="button" title="Duplicate (Ctrl+D)" onClick={() => actions.duplicate(id)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100">
          <Copy size={14} />
        </button>
        <button type="button" title="Delete" onClick={() => actions.remove(id)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      </div>
    </NodeToolbar>
  );

  /* ---------------- body per kind ---------------- */
  let body = null;

  if (kind === "note" || kind === "task" || kind === "checklist") {
    const isDone = kind === "task" && data.status === "done";
    const overdue = kind === "task" && data.dueDate && data.status !== "done" && data.dueDate < todayStr();
    const items = Array.isArray(data.items) ? data.items : [];
    const doneCount = items.filter((item) => item.done).length;

    const setItems = (next, discrete = false) => update({ items: next }, discrete);

    body = (
      <div
        className={`flex h-full w-full flex-col overflow-hidden rounded-xl border shadow-sm ${selected ? "ring-2 ring-blue-500" : ""}`}
        style={{ backgroundColor: FILL[color], borderColor: STROKE[color] }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-black/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600">
          {header.icon}
          {header.label}
          {kind === "task" && (
            <select
              className={`nodrag ml-auto rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[data.status || "todo"]}`}
              value={data.status || "todo"}
              onChange={(event) => update({ status: event.target.value }, true)}
              aria-label="Task status"
            >
              <option value="todo">To do</option>
              <option value="doing">In progress</option>
              <option value="done">Done</option>
            </select>
          )}
          {kind === "checklist" && items.length > 0 && (
            <span className="ml-auto text-[11px] font-medium text-slate-500">{doneCount}/{items.length}</span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
          <input
            className={`nodrag w-full shrink-0 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 ${isDone ? "text-slate-400 line-through" : "text-slate-900"}`}
            value={data.title || ""}
            onChange={(event) => update({ title: event.target.value })}
            placeholder={kind === "task" ? "Task title" : kind === "checklist" ? "Checklist title" : "Add a title"}
          />

          {kind !== "checklist" && (
            <textarea
              className="nodrag nowheel min-h-[44px] w-full flex-1 resize-none bg-transparent text-sm leading-5 text-slate-700 outline-none placeholder:text-slate-400"
              value={data.text || ""}
              onChange={(event) => update({ text: event.target.value })}
              placeholder={kind === "task" ? "Add task details…" : "Write your thoughts…"}
            />
          )}

          {kind === "checklist" && (
            <>
              {items.length > 0 && (
                <div className="h-1 w-full shrink-0 overflow-hidden rounded-full bg-black/10">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
                </div>
              )}
              <div className="nodrag nowheel min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                {items.map((item, index) => (
                  <div key={item.id} className="group/item flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!item.done}
                      onChange={(event) =>
                        setItems(items.map((it) => (it.id === item.id ? { ...it, done: event.target.checked } : it)), true)
                      }
                      className="h-4 w-4 shrink-0 accent-green-600"
                    />
                    <input
                      autoFocus={focusItem.current === item.id}
                      onFocus={() => { focusItem.current = null; }}
                      value={item.text || ""}
                      placeholder="List item"
                      onChange={(event) =>
                        setItems(items.map((it) => (it.id === item.id ? { ...it, text: event.target.value } : it)))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const fresh = { id: itemId(), text: "", done: false };
                          focusItem.current = fresh.id;
                          const next = [...items];
                          next.splice(index + 1, 0, fresh);
                          setItems(next, true);
                        } else if (event.key === "Backspace" && !item.text && items.length > 1) {
                          event.preventDefault();
                          setItems(items.filter((it) => it.id !== item.id), true);
                        }
                      }}
                      className={`w-full bg-transparent text-sm outline-none placeholder:text-slate-400 ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}
                    />
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => setItems(items.filter((it) => it.id !== item.id), true)}
                      className="shrink-0 text-slate-400 opacity-0 hover:text-red-500 group-hover/item:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const fresh = { id: itemId(), text: "", done: false };
                  focusItem.current = fresh.id;
                  setItems([...items, fresh], true);
                }}
                className="nodrag flex shrink-0 items-center gap-1 self-start rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 hover:bg-black/5"
              >
                <Plus size={13} /> Add item
              </button>
            </>
          )}

          {kind === "task" && (
            <div className="flex shrink-0 items-center gap-2 border-t border-black/10 pt-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[data.priority || "medium"]}`} />
              <select
                className="nodrag rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
                value={data.priority || "medium"}
                onChange={(event) => update({ priority: event.target.value }, true)}
                aria-label="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input
                aria-label="Due date"
                type="date"
                className={`nodrag ml-auto max-w-[130px] rounded-md border bg-white px-1 py-1 text-[11px] ${overdue ? "border-red-300 font-medium text-red-600" : "border-slate-200"}`}
                value={data.dueDate || ""}
                onChange={(event) => update({ dueDate: event.target.value }, true)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (kind === "text" || kind === "heading") {
    const tinted = color !== "white";
    const common = `h-full w-full rounded-lg border border-dashed px-3 py-2 ${selected ? "border-blue-400" : "border-transparent group-hover:border-slate-300"}`;
    body = (
      <div className={common} style={{ backgroundColor: tinted ? FILL[color] : "transparent" }}>
        {kind === "heading" ? (
          <input
            className="nodrag h-full w-full bg-transparent text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
            value={data.text || ""}
            onChange={(event) => update({ text: event.target.value })}
            placeholder="Heading"
          />
        ) : (
          <textarea
            className="nodrag nowheel h-full w-full resize-none bg-transparent text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400"
            value={data.text || ""}
            onChange={(event) => update({ text: event.target.value })}
            placeholder="Write something here…"
          />
        )}
      </div>
    );
  }

  if (kind === "shape") {
    const shape = data.shape || "rectangle";
    const lines = Math.min(6, Math.max(1, String(data.text || "").split("\n").length));
    const radius = shape === "circle" ? "50%" : shape === "rounded" ? "24px" : "6px";
    body = (
      <div className="relative h-full w-full">
        {shape === "diamond" ? (
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polygon
              points="50,0 100,50 50,100 0,50"
              fill={FILL[color]}
              stroke={selected ? "#3B82F6" : "#64748B"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <div
            className="absolute inset-0 border-2"
            style={{
              backgroundColor: FILL[color],
              borderColor: selected ? "#3B82F6" : "#64748B",
              borderRadius: radius,
            }}
          />
        )}
        <div className={`absolute inset-0 flex items-center justify-center ${shape === "rectangle" ? "px-3" : "px-[16%]"}`}>
          <textarea
            rows={lines}
            className="nodrag nowheel w-full resize-none bg-transparent text-center text-sm font-medium leading-5 text-slate-800 outline-none placeholder:text-slate-400"
            value={data.text || ""}
            onChange={(event) => update({ text: event.target.value })}
            placeholder="Label"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative h-full w-full" style={{ minWidth: 150, minHeight: 56 }}>
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={56}
        onResizeStart={() => actions.beginEdit()}
        lineClassName="!border-blue-400"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-blue-500 !bg-white"
      />
      {toolbar}
      <Handle id="t" type="source" position={Position.Top} className={handleClass(selected)} />
      <Handle id="r" type="source" position={Position.Right} className={handleClass(selected)} />
      <Handle id="b" type="source" position={Position.Bottom} className={handleClass(selected)} />
      <Handle id="l" type="source" position={Position.Left} className={handleClass(selected)} />
      {body}
    </div>
  );
}

export default memo(PlannerNode);