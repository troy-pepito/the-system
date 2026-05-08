"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableDungeonItemProps {
  id: string;
  children: React.ReactNode;
}

/**
 * Wraps a dungeon card so it can be reordered.
 *
 * The drag listeners live on a dedicated handle (the grip icon in the
 * top-right corner), not the whole card. Whole-card drag works on
 * desktop but mobile browsers preempt custom gestures with scrolling —
 * the browser starts scrolling before dnd-kit's activation delay can
 * fire, so the drag never lifts. A handle with touch-action:none gives
 * dnd-kit unambiguous ownership of touches that start there, leaving
 * the rest of the card free to scroll + handle taps normally.
 */
export default function SortableDungeonItem({
  id,
  children,
}: SortableDungeonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging
      ? "0 0 40px rgba(34, 211, 238, 0.5), 0 0 80px rgba(34, 211, 238, 0.25)"
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`dungeon-${id}`}
      className="scroll-mt-32 sm:scroll-mt-24 relative"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label="Drag to reorder"
        style={{ touchAction: "none" }}
        className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 active:bg-cyan-500/20 active:text-cyan-200 transition-colors cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span className="text-base leading-none select-none" aria-hidden>
          ⋮⋮
        </span>
      </button>
      {children}
    </div>
  );
}
