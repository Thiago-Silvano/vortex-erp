import { useRef, useCallback, useState } from "react";
import type { ElementStyle, CanvasElementId } from "./types";

interface Props {
  id: CanvasElementId;
  style: ElementStyle;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  children: React.ReactNode;
}

export default function CanvasElement({ id, style, selected, onSelect, onMove, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  if (!style.visible) return null;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    dragging.current = true;
    offset.current = { x: e.clientX - style.x, y: e.clientY - style.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [style.x, style.y, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const nx = e.clientX - offset.current.x;
    const ny = e.clientY - offset.current.y;
    // Live move via DOM for smoothness
    if (ref.current) {
      ref.current.style.left = `${nx}px`;
      ref.current.style.top = `${ny}px`;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const nx = e.clientX - offset.current.x;
    const ny = e.clientY - offset.current.y;
    onMove(Math.round(nx), Math.round(ny));
  }, [onMove]);

  const elStyle: React.CSSProperties = {
    position: "absolute",
    left: style.x,
    top: style.y,
    color: style.color || undefined,
    fontSize: style.fontSize || undefined,
    fontFamily: style.fontFamily || undefined,
    fontWeight: style.fontWeight || undefined,
    background: style.background || undefined,
    borderRadius: style.borderRadius || undefined,
    opacity: style.opacity < 100 ? style.opacity / 100 : undefined,
    padding: style.padding || undefined,
    width: style.width !== "auto" ? style.width : undefined,
    cursor: "move",
    userSelect: "none",
    whiteSpace: "nowrap",
    zIndex: selected ? 50 : 10,
    outline: selected ? "2px solid #3b82f6" : undefined,
    outlineOffset: selected ? "2px" : undefined,
    touchAction: "none",
  };

  return (
    <div
      ref={ref}
      style={elStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-element-id={id}
    >
      {children}
    </div>
  );
}
