"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableDungeonItemProps {
  id: string;
  children: React.ReactNode;
}

/**
 * Wraps a dungeon card so it can be reordered via long-press + drag.
 *
 * Activation is delay-gated by the parent's PointerSensor (250ms hold
 * before drag starts), so quick taps on buttons inside the card go to
 * the buttons, not to the drag handler — without the delay, every tap
 * would race with drag detection and break the +Log Exposure / +Quest
 * tap targets.
 */
export default function SortableDungeonItem({
  id,
  children,
}: SortableDungeonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
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
    cursor: isDragging ? "grabbing" : undefined,
    touchAction: "manipulation" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`dungeon-${id}`}
      className="scroll-mt-32 sm:scroll-mt-24"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
