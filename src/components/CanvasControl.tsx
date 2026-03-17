"use client";
import React from "react";

export interface CanvasSettings {
  brushSize: number;
  brushColor: string;
  isEraser: boolean;
}

interface CanvasControlsProps {
  settings: CanvasSettings;
  onSettingsChange: (s: CanvasSettings) => void;
  onClear: () => void;
  onUndo: () => void;
}

const BRUSH_SIZES = [2, 4, 8, 14];
const COLORS = [
  "#ffffff",
  "#facc15",
  "#86efac",
  "#93c5fd",
  "#f9a8d4",
  "#000000",
];

export default function CanvasControls({
  settings,
  onSettingsChange,
  onClear,
  onUndo,
}: CanvasControlsProps) {
  const set = (patch: Partial<CanvasSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  return (
    <aside className="cc-root">
      {/* Brush size */}
      <section className="cc-section">
        <span className="cc-label">SIZE</span>
        <div className="cc-row">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              className={`cc-size-btn ${settings.brushSize === s && !settings.isEraser ? "active" : ""}`}
              onClick={() => set({ brushSize: s, isEraser: false })}
              title={`${s}px`}
            >
              <span
                className="cc-dot"
                style={{
                  width: s + 4,
                  height: s + 4,
                  background: settings.brushColor,
                }}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Color */}
      <section className="cc-section">
        <span className="cc-label">COLOR</span>
        <div className="cc-row cc-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`cc-color-btn ${settings.brushColor === c && !settings.isEraser ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => set({ brushColor: c, isEraser: false })}
              title={c}
            />
          ))}
        </div>
      </section>

      {/* Custom color */}
      <section className="cc-section">
        <span className="cc-label">CUSTOM</span>
        <input
          type="color"
          className="cc-color-picker"
          value={settings.brushColor}
          onChange={(e) => set({ brushColor: e.target.value, isEraser: false })}
        />
      </section>

      <div className="cc-divider" />

      {/* Tools */}
      <section className="cc-section">
        <span className="cc-label">TOOLS</span>
        <div className="cc-col">
          <button
            className={`cc-tool-btn ${settings.isEraser ? "active" : ""}`}
            onClick={() => set({ isEraser: !settings.isEraser })}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
              <path d="M6 17l3-3" />
            </svg>
            Eraser
          </button>
          <button className="cc-tool-btn" onClick={onUndo}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            Undo
          </button>
          <button className="cc-tool-btn cc-clear-btn" onClick={onClear}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Clear
          </button>
        </div>
      </section>

      <style>{`
        .cc-root {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #0f1117;
          border: 1px solid #2a2d3a;
          border-radius: 14px;
          padding: 20px 16px;
          width: 160px;
          font-family: 'DM Mono', 'Fira Mono', monospace;
        }
        .cc-section {
          margin-bottom: 18px;
        }
        .cc-label {
          display: block;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: #4b5060;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .cc-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .cc-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cc-size-btn {
          background: #1a1d27;
          border: 1px solid #2a2d3a;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .cc-size-btn:hover { border-color: #5b6070; }
        .cc-size-btn.active { border-color: #facc15; background: #1f2030; }
        .cc-dot {
          border-radius: 50%;
          display: block;
          min-width: 6px;
          min-height: 6px;
        }
        .cc-colors { gap: 7px; }
        .cc-color-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
        }
        .cc-color-btn:hover { transform: scale(1.15); }
        .cc-color-btn.active { border-color: #facc15; transform: scale(1.15); }
        .cc-color-picker {
          width: 100%;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #2a2d3a;
          background: #1a1d27;
          cursor: pointer;
          padding: 2px;
        }
        .cc-divider {
          height: 1px;
          background: #2a2d3a;
          margin: 4px 0 18px;
        }
        .cc-tool-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1a1d27;
          border: 1px solid #2a2d3a;
          border-radius: 8px;
          color: #9aa0b0;
          font-family: 'DM Mono', 'Fira Mono', monospace;
          font-size: 11px;
          padding: 8px 10px;
          cursor: pointer;
          transition: all 0.15s;
          width: 100%;
          letter-spacing: 0.05em;
        }
        .cc-tool-btn:hover { border-color: #5b6070; color: #e0e4f0; background: #1f2030; }
        .cc-tool-btn.active { border-color: #facc15; color: #facc15; background: #1f2030; }
        .cc-clear-btn:hover { border-color: #f87171; color: #f87171; }
      `}</style>
    </aside>
  );
}
