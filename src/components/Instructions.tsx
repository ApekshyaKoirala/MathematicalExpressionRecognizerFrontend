"use client";
import React, { useState } from "react";

const steps = [
  {
    icon: "✍️",
    title: "Write Your Expression",
    desc: "Draw any math expression clearly on the canvas. Works with +, −, ×, ÷, exponents, fractions and more.",
  },
  {
    icon: "🎨",
    title: "Adjust Your Tools",
    desc: "Use the panel on the left to change brush size, color, or switch to the eraser to fix mistakes.",
  },
  {
    icon: "⚡",
    title: "Submit & Recognize",
    desc: "Hit Submit. The canvas is cropped tightly around your writing and sent to the AI model for recognition.",
  },
  {
    icon: "✅",
    title: "See the Result",
    desc: "The recognized expression and computed result appear below. Clear the canvas to try another one.",
  },
];

const tips = [
  "Write digits and operators with clear spacing",
  "Use the eraser instead of rewriting",
  "Bigger brush = cleaner strokes",
  "Press Clear to reset everything",
];

export default function Instructions() {
  const [open, setOpen] = useState(true);

  return (
    <div className="ins-root">
      <button className="ins-toggle" onClick={() => setOpen((o) => !o)}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        How to use
        <span
          className="ins-chevron"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="ins-body">
          <ol className="ins-steps">
            {steps.map((s, i) => (
              <li key={i} className="ins-step">
                <span className="ins-icon">{s.icon}</span>
                <div>
                  <p className="ins-step-title">{s.title}</p>
                  <p className="ins-step-desc">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="ins-tips">
            <p className="ins-tips-label">QUICK TIPS</p>
            <ul className="ins-tip-list">
              {tips.map((t, i) => (
                <li key={i} className="ins-tip">
                  <span className="ins-bullet" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style>{`
        .ins-root {
          font-family: 'DM Mono', 'Fira Mono', monospace;
          background: #0f1117;
          border: 1px solid #2a2d3a;
          border-radius: 14px;
          overflow: hidden;
          width: 100%;
        }
        .ins-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #9aa0b0;
          font-family: 'DM Mono', 'Fira Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 14px 18px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: color 0.15s;
        }
        .ins-toggle:hover { color: #e0e4f0; }
        .ins-chevron { margin-left: auto; transition: transform 0.25s; display: flex; }
        .ins-body {
          border-top: 1px solid #2a2d3a;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: ins-fade 0.2s ease;
        }
        @keyframes ins-fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .ins-steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          counter-reset: steps;
        }
        .ins-step {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .ins-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .ins-step-title {
          margin: 0 0 3px;
          font-size: 12px;
          color: #e0e4f0;
          font-weight: 600;
          letter-spacing: 0.03em;
        }
        .ins-step-desc {
          margin: 0;
          font-size: 11px;
          color: #5b6070;
          line-height: 1.6;
        }
        .ins-tips {
          background: #1a1d27;
          border-radius: 8px;
          padding: 12px 14px;
        }
        .ins-tips-label {
          margin: 0 0 10px;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: #facc15;
          font-weight: 700;
        }
        .ins-tip-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .ins-tip {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #7a8090;
          line-height: 1.4;
        }
        .ins-bullet {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #facc15;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
