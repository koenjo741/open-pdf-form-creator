import { describe, it, expect } from 'vitest';
import { webToPdf, pdfToWeb, scaleToPdf, scaleToWeb } from '../utils/coordinateMapper';

// ── Standard A4 page dimensions ─────────────────────────────────────────────
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;

// ── Rendered canvas at 1:1 scale (1pt == 1px) ────────────────────────────────
describe('webToPdf — identity scale (1pt = 1px)', () => {
  it('maps top-left corner (0,0) to bottom-left PDF origin shifted', () => {
    const { pdfX, pdfY } = webToPdf(0, 0, A4_W_PT, A4_H_PT, A4_W_PT, A4_H_PT);
    expect(pdfX).toBeCloseTo(0);
    expect(pdfY).toBeCloseTo(A4_H_PT); // web Y=0 → PDF Y=pageHeight
  });

  it('maps bottom-left corner to PDF origin (0,0)', () => {
    const { pdfX, pdfY } = webToPdf(0, A4_H_PT, A4_W_PT, A4_H_PT, A4_W_PT, A4_H_PT);
    expect(pdfX).toBeCloseTo(0);
    expect(pdfY).toBeCloseTo(0);
  });

  it('maps bottom-right corner to PDF bottom-right', () => {
    const { pdfX, pdfY } = webToPdf(A4_W_PT, A4_H_PT, A4_W_PT, A4_H_PT, A4_W_PT, A4_H_PT);
    expect(pdfX).toBeCloseTo(A4_W_PT);
    expect(pdfY).toBeCloseTo(0);
  });

  it('maps top-right corner to PDF top-right', () => {
    const { pdfX, pdfY } = webToPdf(A4_W_PT, 0, A4_W_PT, A4_H_PT, A4_W_PT, A4_H_PT);
    expect(pdfX).toBeCloseTo(A4_W_PT);
    expect(pdfY).toBeCloseTo(A4_H_PT);
  });

  it('maps center correctly', () => {
    const cx = A4_W_PT / 2;
    const cy = A4_H_PT / 2;
    const { pdfX, pdfY } = webToPdf(cx, cy, A4_W_PT, A4_H_PT, A4_W_PT, A4_H_PT);
    expect(pdfX).toBeCloseTo(cx);
    expect(pdfY).toBeCloseTo(cy); // center stays center after Y-inversion of full height
  });
});

// ── Zoom: canvas is 2× the PDF point dimensions ──────────────────────────────
describe('webToPdf — 2× zoom (canvas = 2 × PDF pt)', () => {
  const CANVAS_W = A4_W_PT * 2;
  const CANVAS_H = A4_H_PT * 2;

  it('maps top-left (0,0) web to PDF top-left', () => {
    const { pdfX, pdfY } = webToPdf(0, 0, A4_W_PT, A4_H_PT, CANVAS_W, CANVAS_H);
    expect(pdfX).toBeCloseTo(0);
    expect(pdfY).toBeCloseTo(A4_H_PT);
  });

  it('maps bottom-right canvas pixel to PDF bottom-right point', () => {
    const { pdfX, pdfY } = webToPdf(CANVAS_W, CANVAS_H, A4_W_PT, A4_H_PT, CANVAS_W, CANVAS_H);
    expect(pdfX).toBeCloseTo(A4_W_PT);
    expect(pdfY).toBeCloseTo(0);
  });

  it('click at canvas (200, 400) maps to half the PDF position', () => {
    const { pdfX, pdfY } = webToPdf(200, 400, A4_W_PT, A4_H_PT, CANVAS_W, CANVAS_H);
    expect(pdfX).toBeCloseTo(100); // 200 / 2
    // pdfY = A4_H_PT - (400 / 2) = A4_H_PT - 200
    expect(pdfY).toBeCloseTo(A4_H_PT - 200);
  });
});

// ── 0.5× zoom (canvas = 0.5 × PDF pt) ───────────────────────────────────────
describe('webToPdf — 0.5× zoom (canvas = 0.5 × PDF pt)', () => {
  const CANVAS_W = A4_W_PT * 0.5;
  const CANVAS_H = A4_H_PT * 0.5;

  it('maps bottom-right canvas pixel to PDF bottom-right point', () => {
    const { pdfX, pdfY } = webToPdf(CANVAS_W, CANVAS_H, A4_W_PT, A4_H_PT, CANVAS_W, CANVAS_H);
    expect(pdfX).toBeCloseTo(A4_W_PT);
    expect(pdfY).toBeCloseTo(0);
  });
});

// ── Round-trip fidelity (webToPdf ∘ pdfToWeb = identity) ────────────────────
describe('Round-trip: pdfToWeb → webToPdf', () => {
  const cases = [
    { pdfX: 72, pdfY: 720 },   // typical field near top-left
    { pdfX: 400, pdfY: 100 },  // near bottom-right
    { pdfX: 0, pdfY: 0 },      // origin
    { pdfX: A4_W_PT, pdfY: A4_H_PT }, // far corner
  ];

  const scales = [
    { cw: A4_W_PT, ch: A4_H_PT },         // 1×
    { cw: A4_W_PT * 2, ch: A4_H_PT * 2 }, // 2×
    { cw: A4_W_PT * 0.75, ch: A4_H_PT * 0.75 }, // 0.75×
  ];

  for (const { pdfX: origX, pdfY: origY } of cases) {
    for (const { cw, ch } of scales) {
      it(`(${origX.toFixed(0)},${origY.toFixed(0)}) round-trips at canvas ${cw.toFixed(0)}×${ch.toFixed(0)}`, () => {
        const { webX, webY } = pdfToWeb(origX, origY, A4_W_PT, A4_H_PT, cw, ch);
        const { pdfX, pdfY } = webToPdf(webX, webY, A4_W_PT, A4_H_PT, cw, ch);
        expect(pdfX).toBeCloseTo(origX, 5);
        expect(pdfY).toBeCloseTo(origY, 5);
      });
    }
  }
});

// ── Dimension scaling helpers ─────────────────────────────────────────────────
describe('scaleToPdf / scaleToWeb', () => {
  it('scaleToPdf: 100px wide at 2× zoom → 50pt', () => {
    expect(scaleToPdf(100, A4_W_PT, A4_W_PT * 2)).toBeCloseTo(50);
  });

  it('scaleToWeb: 50pt wide at 2× zoom → 100px', () => {
    expect(scaleToWeb(50, A4_W_PT, A4_W_PT * 2)).toBeCloseTo(100);
  });

  it('dimension round-trip', () => {
    const ptWidth = 150;
    const canvas = A4_W_PT * 1.5;
    const px = scaleToWeb(ptWidth, A4_W_PT, canvas);
    expect(scaleToPdf(px, A4_W_PT, canvas)).toBeCloseTo(ptWidth, 5);
  });
});
