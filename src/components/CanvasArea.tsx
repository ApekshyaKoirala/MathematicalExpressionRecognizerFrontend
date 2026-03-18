"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import type { CanvasSettings } from "./CanvasControl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PredictResponse {
  latex: string;
  is_equation: boolean;
  result: string | null;
}

function dataURLtoBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)![1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

const TIPS = [
  { icon: "✍️", text: "Write clearly with enough spacing between symbols" },
  { icon: "➗", text: "Draw a horizontal line for fractions" },
  { icon: "√", text: "Sketch the radical symbol fully for square roots" },
  { icon: "⌨️", text: "Use Ctrl+Z or the Undo button to fix mistakes" },
  { icon: "🔢", text: "Exponents go above and to the right of the base" },
  { icon: "🧹", text: "Use the eraser for small corrections" },
];

// Declare katex on window for TypeScript
declare global {
  interface Window {
    katex: {
      render: (
        latex: string,
        element: HTMLElement,
        options?: { throwOnError?: boolean; displayMode?: boolean },
      ) => void;
    };
  }
}

function KaTeXSpan({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.katex) {
      try {
        window.katex.render(latex, el, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        el.textContent = latex;
      }
    } else {
      el.textContent = latex;
    }
  }, [latex]);

  return (
    <span ref={ref} className="ms-result-chip-val ms-result-chip-val--katex" />
  );
}

export default function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotsRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);

  const [settings, setSettings] = useState<CanvasSettings>({
    brushSize: 4,
    brushColor: "#1a1a2e",
    isEraser: false,
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [katexLoaded, setKatexLoaded] = useState(false);

  const bounds = useRef({
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  });

  // Load KaTeX dynamically
  useEffect(() => {
    if (window.katex) {
      setKatexLoaded(true);
      return;
    }
    // Load KaTeX CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);

    // Load KaTeX JS
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => setKatexLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") handleUndo();
      if (e.key === "Escape") setTipsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const updateBounds = (x: number, y: number) => {
    bounds.current.minX = Math.min(bounds.current.minX, x);
    bounds.current.minY = Math.min(bounds.current.minY, y);
    bounds.current.maxX = Math.max(bounds.current.maxX, x);
    bounds.current.maxY = Math.max(bounds.current.maxY, y);
  };

  const saveSnapshot = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    snapshotsRef.current.push(
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    );
    if (snapshotsRef.current.length > 40) snapshotsRef.current.shift();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    saveSnapshot();
    isDrawingRef.current = true;
    setHasDrawn(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    updateBounds(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getCoords(e);
    ctx.lineWidth = settings.isEraser
      ? settings.brushSize * 4
      : settings.brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (settings.isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = settings.brushColor;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!settings.isEraser) updateBounds(x, y);
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.closePath();
    ctx.globalCompositeOperation = "source-over";
  };

  const handleUndo = useCallback(() => {
    if (snapshotsRef.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(snapshotsRef.current.pop()!, 0, 0);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bounds.current = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    snapshotsRef.current = [];
    setPrediction(null);
    setStatus("idle");
    setErrorMsg("");
    setHasDrawn(false);
  }, []);

  const exportCroppedImage = (): string | null => {
    const canvas = canvasRef.current!;
    const pad = 12;
    const { minX, minY, maxX, maxY } = bounds.current;
    if (minX === Infinity) return null;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext("2d")!;
    tctx.fillStyle = "#ffffff";
    tctx.fillRect(0, 0, w, h);
    tctx.drawImage(canvas, minX - pad, minY - pad, w, h, 0, 0, w, h);
    return tmp.toDataURL("image/png");
  };

  const handleSubmit = async () => {
    const imageData = exportCroppedImage();
    if (!imageData) {
      setErrorMsg("Draw something first!");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    setPrediction(null);
    try {
      const form = new FormData();
      form.append("file", dataURLtoBlob(imageData), "expression.png");
      const res = await fetch(`${API_URL}/api/v1/predict/`, {
        method: "POST",
        body: form,
      });
      if (!res.ok)
        throw new Error(`Server error ${res.status}: ${await res.text()}`);
      const data: PredictResponse = await res.json();
      setPrediction(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  return (
    <div className="ms-root">
      {/* ── Header ── */}
      <header className="ms-header">
        <div className="ms-logo">
          <span className="ms-logo-sigma">&#x2211;</span>
          <div>
            <h1 className="ms-title">MathScript</h1>
            <p className="ms-tagline">Handwritten Expression Recognition</p>
          </div>
        </div>
        <div className="ms-header-right">
          <button
            className="ms-tips-toggle"
            onClick={() => setTipsOpen((o) => !o)}
            aria-label="Show tips"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Tips
          </button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div className="ms-workspace">
        {/* Tips panel */}
        <aside className={"ms-tips" + (tipsOpen ? " ms-tips--open" : "")}>
          <div className="ms-tips-header">
            <h2 className="ms-tips-title">
              <span className="ms-tips-icon">&#x1F4A1;</span> Tips
            </h2>
            <button
              className="ms-tips-close"
              onClick={() => setTipsOpen(false)}
              aria-label="Close tips"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <ul className="ms-tips-list">
            {TIPS.map((tip, i) => (
              <li key={i} className="ms-tip-item">
                <span className="ms-tip-emoji">{tip.icon}</span>
                <span className="ms-tip-text">{tip.text}</span>
              </li>
            ))}
          </ul>
          <div className="ms-shortcuts">
            <p className="ms-shortcuts-title">Shortcuts</p>
            <div className="ms-shortcut-row">
              <kbd>Ctrl Z</kbd>
              <span>Undo</span>
            </div>
            <div className="ms-shortcut-row">
              <kbd>Esc</kbd>
              <span>Close tips</span>
            </div>
          </div>
        </aside>

        {/* Canvas area */}
        <div className="ms-center">
          {/* Toolbar */}
          <div className="ms-toolbar">
            <div className="ms-tool-group">
              <label className="ms-label">Brush</label>
              <input
                type="range"
                min={2}
                max={16}
                value={settings.brushSize}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, brushSize: +e.target.value }))
                }
                className="ms-slider"
              />
              <span className="ms-val">{settings.brushSize}px</span>
            </div>
            <div className="ms-tool-group">
              <label className="ms-label">Color</label>
              <input
                type="color"
                value={settings.brushColor}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    brushColor: e.target.value,
                    isEraser: false,
                  }))
                }
                className="ms-color-pick"
              />
            </div>
            <button
              className={
                "ms-tool-btn" +
                (settings.isEraser ? " ms-tool-btn--active" : "")
              }
              onClick={() =>
                setSettings((s) => ({ ...s, isEraser: !s.isEraser }))
              }
              title="Toggle eraser"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
                <path d="M6.5 17.5l3-3" />
              </svg>
              Eraser
            </button>
            <button
              className="ms-tool-btn"
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 7v6h6" />
                <path d="M3 13C5 7 11 3 17 5s8 8 5 13-9 7-14 4" />
              </svg>
              Undo
            </button>
            <button
              className="ms-tool-btn ms-tool-btn--danger"
              onClick={handleClear}
              title="Clear canvas"
            >
              <svg
                width="13"
                height="13"
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

          {/* Canvas */}
          <div className="ms-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={750}
              height={460}
              className="ms-canvas"
              style={{ cursor: settings.isEraser ? "cell" : "crosshair" }}
              onMouseDown={startDrawing}
              onMouseUp={endDrawing}
              onMouseMove={draw}
              onMouseLeave={endDrawing}
            />
            {!hasDrawn && (
              <div className="ms-placeholder">
                <span className="ms-placeholder-eq">&#x222B; f(x) dx</span>
                <span className="ms-placeholder-hint">
                  start drawing your expression&#x2026;
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="ms-submit-row">
            <button
              className="ms-submit-btn"
              onClick={handleSubmit}
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <span className="ms-spin" /> Recognizing&#x2026;
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="22 2 11 13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Recognize Expression
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {status === "success" && prediction && (
            <div className="ms-result">
              
              <div className="ms-result-chip ms-result-chip--blue">
                <span className="ms-result-chip-label">Expression</span>
                {katexLoaded ? (
                  <KaTeXSpan key={prediction.latex} latex={prediction.latex} />
                ) : (
                  <span className="ms-result-chip-val">{prediction.latex}</span>
                )}
              </div>

              
              {prediction.result !== null && (
                <>
                  <span className="ms-result-eq-sign">=</span>
                  <div className="ms-result-chip ms-result-chip--gold">
                    
                    <span className="ms-result-chip-label">
                      {prediction.is_equation ? "Solution" : "Result"}
                    </span>
                    <span className="ms-result-chip-val">
                      {prediction.result}
                    </span>
                  </div>
                </>
              )}

              {prediction.is_equation && prediction.result === null && (
                <span className="ms-result-unsolvable">Could not solve</span>
              )}

              {!prediction.is_equation && prediction.result === null && (
                <span className="ms-result-tag">
                  Expression &#xB7; not an equation
                </span>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="ms-error">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMsg}
            </div>
          )}
        </div>
      </div>

      
      {tipsOpen && (
        <div className="ms-tips-backdrop" onClick={() => setTipsOpen(false)} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ms-root {
          min-height: 100vh;
          background: #f7f6f2;
          background-image:
            radial-gradient(circle at 15% 85%, rgba(99,102,241,0.04) 0%, transparent 50%),
            radial-gradient(circle at 85% 15%, rgba(245,158,11,0.05) 0%, transparent 50%);
          font-family: 'IBM Plex Mono', monospace;
          display: flex; flex-direction: column; align-items: center;
          padding: 28px 20px 60px; gap: 28px;
        }

        /* Header */
        .ms-header {
          width: 100%; max-width: 1060px;
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 20px; border-bottom: 1.5px solid #e5e2d8; gap: 12px;
        }
        .ms-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .ms-logo { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .ms-logo-sigma {
          width: 44px; height: 44px; flex-shrink: 0;
          background: #1a1a2e; color: #f5c518; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-family: 'Lora', serif;
          box-shadow: 0 2px 12px rgba(26,26,46,0.15);
        }
        .ms-title { font-family: 'Lora', serif; font-size: 24px; color: #1a1a2e; letter-spacing: -0.02em; line-height: 1; }
        .ms-tagline { font-size: 10px; letter-spacing: 0.14em; color: #9b9480; text-transform: uppercase; margin-top: 4px; }
        .ms-header-badge {
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #6366f1; border: 1.5px solid #c7c9f4; background: #eeeffe;
          padding: 5px 12px; border-radius: 99px; white-space: nowrap;
        }
        .ms-tips-toggle {
          display: none; align-items: center; gap: 6px;
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.06em;
          color: #4a4438; background: #fff; border: 1.5px solid #e5e2d8; border-radius: 9px;
          padding: 7px 13px; cursor: pointer; transition: background 0.15s, border-color 0.15s; white-space: nowrap;
        }
        .ms-tips-toggle:hover { background: #f0ede6; border-color: #ccc7ba; }

        /* Workspace */
        .ms-workspace { width: 100%; max-width: 1060px; display: flex; gap: 20px; align-items: flex-start; }

        /* Tips sidebar */
        .ms-tips {
          flex-shrink: 0; width: 192px;
          background: #fff; border: 1.5px solid #e5e2d8; border-radius: 18px;
          padding: 18px 16px; box-shadow: 0 2px 12px rgba(26,26,46,0.05);
          position: sticky; top: 24px;
        }
        .ms-tips-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f0ede6;
        }
        .ms-tips-title { font-family: 'Lora', serif; font-size: 14px; color: #1a1a2e; display: flex; align-items: center; gap: 6px; }
        .ms-tips-close {
          display: none; background: none; border: none; color: #9b9480;
          cursor: pointer; padding: 3px; border-radius: 5px; line-height: 1;
          transition: color 0.15s, background 0.15s; align-items: center; justify-content: center;
        }
        .ms-tips-close:hover { color: #1a1a2e; background: #f0ede6; }
        .ms-tips-icon { font-size: 14px; }
        .ms-tips-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .ms-tip-item { display: flex; align-items: flex-start; gap: 8px; }
        .ms-tip-emoji { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
        .ms-tip-text { font-size: 11px; color: #6b6455; line-height: 1.55; }
        .ms-shortcuts { margin-top: 18px; padding-top: 14px; border-top: 1px solid #f0ede6; }
        .ms-shortcuts-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: #b8b0a0; margin-bottom: 8px; }
        .ms-shortcut-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        kbd { font-family: 'IBM Plex Mono', monospace; font-size: 9px; background: #f0ede6; color: #4a4438; border: 1px solid #d8d3c8; border-radius: 5px; padding: 2px 7px; }
        .ms-shortcut-row span { font-size: 10px; color: #9b9480; }

        /* Backdrop */
        .ms-tips-backdrop {
          display: none; position: fixed; inset: 0;
          background: rgba(26,26,46,0.4); z-index: 49;
          animation: ms-bd-in 0.2s ease;
        }
        @keyframes ms-bd-in { from { opacity: 0; } to { opacity: 1; } }

        /* Center */
        .ms-center { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }

        /* Toolbar */
        .ms-toolbar {
          background: #fff; border: 1.5px solid #e5e2d8; border-radius: 14px;
          padding: 10px 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          box-shadow: 0 1px 6px rgba(26,26,46,0.04);
        }
        .ms-tool-group { display: flex; align-items: center; gap: 8px; }
        .ms-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #9b9480; }
        .ms-slider { -webkit-appearance: none; height: 3px; width: 80px; background: #e5e2d8; border-radius: 99px; outline: none; cursor: pointer; }
        .ms-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #1a1a2e; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .ms-val { font-size: 11px; color: #4a4438; min-width: 28px; }
        .ms-color-pick { width: 28px; height: 28px; border: 1.5px solid #d8d3c8; border-radius: 8px; cursor: pointer; padding: 2px; background: none; }
        .ms-tool-btn {
          display: flex; align-items: center; gap: 5px;
          font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.04em;
          color: #4a4438; background: #f7f6f2; border: 1.5px solid #e5e2d8; border-radius: 9px;
          padding: 6px 12px; cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .ms-tool-btn:hover { background: #f0ede6; border-color: #ccc7ba; }
        .ms-tool-btn--active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
        .ms-tool-btn--active svg { stroke: #f5c518; }
        .ms-tool-btn--danger:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }

        /* Canvas */
        .ms-canvas-wrap {
          position: relative; border-radius: 16px; overflow: hidden;
          border: 1.5px solid #e5e2d8;
          box-shadow: 0 2px 0 #e5e2d8, 0 8px 32px rgba(26,26,46,0.08), inset 0 0 0 1px rgba(255,255,255,0.6);
          background: #fff;
        }
        .ms-canvas { display: block; width: 100%; height: auto; touch-action: none; }
        .ms-placeholder {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          pointer-events: none; user-select: none; gap: 8px;
          animation: ms-fade-in 0.4s ease;
        }
        @keyframes ms-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .ms-placeholder-eq { font-family: 'Lora', serif; font-style: italic; font-size: 36px; color: #e8e4db; letter-spacing: 0.05em; }
        .ms-placeholder-hint { font-size: 11px; letter-spacing: 0.1em; color: #c8c3b8; text-transform: uppercase; }

        /* Submit */
        .ms-submit-row { display: flex; justify-content: flex-end; }
        .ms-submit-btn {
          display: flex; align-items: center; gap: 8px;
          background: #1a1a2e; color: #fff; font-family: 'IBM Plex Mono', monospace;
          font-size: 12px; letter-spacing: 0.08em; border: none; border-radius: 12px;
          padding: 12px 26px; cursor: pointer; transition: all 0.15s;
          box-shadow: 0 2px 0 #0d0d1a, 0 4px 16px rgba(26,26,46,0.2);
        }
        .ms-submit-btn:hover:not(:disabled) { background: #2d2d4e; transform: translateY(-1px); box-shadow: 0 3px 0 #0d0d1a, 0 6px 20px rgba(26,26,46,0.25); }
        .ms-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ms-submit-btn svg { stroke: #f5c518; }
        .ms-spin { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Result */
        .ms-result {
          background: #fff; border: 1.5px solid #e5e2d8; border-radius: 16px;
          padding: 16px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          animation: ms-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 12px rgba(26,26,46,0.06);
        }
        @keyframes ms-pop { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ms-result-chip { display: flex; flex-direction: column; gap: 3px; padding: 10px 16px; border-radius: 12px; min-width: 0; }
        .ms-result-chip--blue { background: #eef2ff; border: 1.5px solid #c7c9f4; }
        .ms-result-chip--gold { background: #fffbeb; border: 1.5px solid #fcd34d; }
        .ms-result-chip-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.16em; color: #9b9480; }
        .ms-result-chip-val { font-family: 'Lora', serif; font-size: 22px; color: #1a1a2e; line-height: 1.2; word-break: break-all; }
        /* KaTeX rendered span — let KaTeX control font, just set size/color */
        .ms-result-chip-val--katex { font-size: 20px; color: #1a1a2e; line-height: 1.4; }
        .ms-result-chip-val--katex .katex { font-size: 1em; }
        .ms-result-chip--gold .ms-result-chip-val { color: #92400e; }
        .ms-result-eq-sign { font-family: 'Lora', serif; font-size: 26px; color: #c8c3b8; }
        .ms-result-tag { font-size: 10px; color: #9b9480; letter-spacing: 0.06em; }
        .ms-result-unsolvable { font-size: 11px; color: #dc2626; letter-spacing: 0.06em; background: #fef2f2; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 8px; }

        /* Error */
        .ms-error { display: flex; align-items: center; gap: 8px; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #dc2626; letter-spacing: 0.02em; }

        /* ── Responsive: Mobile ≤ 680px ── */
        @media (max-width: 680px) {
          .ms-root { padding: 14px 12px 48px; gap: 16px; }
          .ms-tagline { display: none; }
          .ms-header-badge { display: none; }
          .ms-tips-toggle { display: flex; }
          .ms-workspace { flex-direction: column; }

          /* Tips become fixed right drawer */
          .ms-tips {
            position: fixed !important;
            top: 0; right: 0; bottom: 0;
            width: min(290px, 82vw);
            border-radius: 20px 0 0 20px;
            border-right: none;
            z-index: 50;
            overflow-y: auto;
            transform: translateX(105%);
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: -8px 0 40px rgba(26,26,46,0.15);
          }
          .ms-tips--open { transform: translateX(0) !important; }
          .ms-tips-close { display: flex; }
          .ms-tips-backdrop { display: block; }

          .ms-toolbar { gap: 8px; padding: 8px 10px; }
          .ms-slider { width: 55px; }
          .ms-tool-btn { padding: 6px 8px; font-size: 10px; gap: 4px; }
          .ms-label { display: none; }
          .ms-val { min-width: 22px; font-size: 10px; }
          .ms-submit-row { justify-content: stretch; }
          .ms-submit-btn { width: 100%; justify-content: center; }
          .ms-placeholder-eq { font-size: 24px; }
          .ms-placeholder-hint { font-size: 9px; }
        }

        /* Tablet 681–900px */
        @media (min-width: 681px) and (max-width: 900px) {
          .ms-tips { width: 168px; }
          .ms-tips-toggle { display: none !important; }
        }

        @media (min-width: 901px) {
          .ms-tips-toggle { display: none !important; }
        }
      `}</style>
    </div>
  );
}
