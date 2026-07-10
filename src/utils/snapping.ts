export interface Rect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  position: number; // The x or y coordinate of the line in web pixels
}

export interface SnapResult {
  snappedX: number | null;
  snappedY: number | null;
  guides: GuideLine[];
}

/**
 * Calculates snapping coordinates and active guide lines when dragging a field.
 *
 * @param movingRect The rectangle currently being dragged (in web pixels)
 * @param otherRects All other rectangles on the same page
 * @param threshold Snap distance threshold in web pixels (default: 5)
 */
export function calculateSnaps(
  movingRect: Rect,
  otherRects: Rect[],
  threshold = 5,
  gridX?: number,
  gridY?: number
): SnapResult {
  const result: SnapResult = {
    snappedX: null,
    snappedY: null,
    guides: [],
  };

  const movingEdges = {
    left: movingRect.x,
    right: movingRect.x + movingRect.w,
    centerX: movingRect.x + movingRect.w / 2,
    top: movingRect.y,
    bottom: movingRect.y + movingRect.h,
    centerY: movingRect.y + movingRect.h / 2,
  };

  let minDiffX = threshold + 1;
  let minDiffY = threshold + 1;

  for (const other of otherRects) {
    if (other.id === movingRect.id) continue;

    const otherEdges = {
      left: other.x,
      right: other.x + other.w,
      centerX: other.x + other.w / 2,
      top: other.y,
      bottom: other.y + other.h,
      centerY: other.y + other.h / 2,
    };

    // --- Vertical Snapping (X coordinates) ---
    // Compare Lefts
    if (Math.abs(movingEdges.left - otherEdges.left) < minDiffX) {
      minDiffX = Math.abs(movingEdges.left - otherEdges.left);
      result.snappedX = otherEdges.left;
    }
    // Compare Rights
    if (Math.abs(movingEdges.right - otherEdges.right) < minDiffX) {
      minDiffX = Math.abs(movingEdges.right - otherEdges.right);
      result.snappedX = otherEdges.right - movingRect.w;
    }
    // Compare Centers
    if (Math.abs(movingEdges.centerX - otherEdges.centerX) < minDiffX) {
      minDiffX = Math.abs(movingEdges.centerX - otherEdges.centerX);
      result.snappedX = otherEdges.centerX - movingRect.w / 2;
    }
    // Compare Left-to-Right
    if (Math.abs(movingEdges.left - otherEdges.right) < minDiffX) {
      minDiffX = Math.abs(movingEdges.left - otherEdges.right);
      result.snappedX = otherEdges.right;
    }
    // Compare Right-to-Left
    if (Math.abs(movingEdges.right - otherEdges.left) < minDiffX) {
      minDiffX = Math.abs(movingEdges.right - otherEdges.left);
      result.snappedX = otherEdges.left - movingRect.w;
    }

    // --- Horizontal Snapping (Y coordinates) ---
    // Compare Tops
    if (Math.abs(movingEdges.top - otherEdges.top) < minDiffY) {
      minDiffY = Math.abs(movingEdges.top - otherEdges.top);
      result.snappedY = otherEdges.top;
    }
    // Compare Bottoms
    if (Math.abs(movingEdges.bottom - otherEdges.bottom) < minDiffY) {
      minDiffY = Math.abs(movingEdges.bottom - otherEdges.bottom);
      result.snappedY = otherEdges.bottom - movingRect.h;
    }
    // Compare Centers
    if (Math.abs(movingEdges.centerY - otherEdges.centerY) < minDiffY) {
      minDiffY = Math.abs(movingEdges.centerY - otherEdges.centerY);
      result.snappedY = otherEdges.centerY - movingRect.h / 2;
    }
    // Compare Top-to-Bottom
    if (Math.abs(movingEdges.top - otherEdges.bottom) < minDiffY) {
      minDiffY = Math.abs(movingEdges.top - otherEdges.bottom);
      result.snappedY = otherEdges.bottom;
    }
    // Compare Bottom-to-Top
    if (Math.abs(movingEdges.bottom - otherEdges.top) < minDiffY) {
      minDiffY = Math.abs(movingEdges.bottom - otherEdges.top);
      result.snappedY = otherEdges.top - movingRect.h;
    }
  }

  // --- Grid Snapping (Fallback if no guide is close enough) ---
  if (result.snappedX === null && gridX && gridX > 0) {
    const snappedLeft = Math.round(movingRect.x / gridX) * gridX;
    if (Math.abs(movingRect.x - snappedLeft) < gridX) { // Always snap if grid is enabled and no guides
      result.snappedX = snappedLeft;
    }
  }

  if (result.snappedY === null && gridY && gridY > 0) {
    const snappedTop = Math.round(movingRect.y / gridY) * gridY;
    if (Math.abs(movingRect.y - snappedTop) < gridY) {
      result.snappedY = snappedTop;
    }
  }

  // After finding the closest snapped coordinates, rebuild the guides
  if (result.snappedX !== null) {
    const snappedEdges = {
      left: result.snappedX,
      right: result.snappedX + movingRect.w,
      centerX: result.snappedX + movingRect.w / 2,
    };
    // Add a guide line if the snapped coordinate matches ANY other field's edge
    for (const other of otherRects) {
      if (other.id === movingRect.id) continue;
      if (Math.abs(snappedEdges.left - other.x) < 0.1 || Math.abs(snappedEdges.left - (other.x + other.w)) < 0.1 || Math.abs(snappedEdges.left - (other.x + other.w / 2)) < 0.1) {
        if (!result.guides.some(g => g.type === 'vertical' && Math.abs(g.position - snappedEdges.left) < 0.1)) {
          result.guides.push({ type: 'vertical', position: snappedEdges.left });
        }
      }
      if (Math.abs(snappedEdges.right - other.x) < 0.1 || Math.abs(snappedEdges.right - (other.x + other.w)) < 0.1 || Math.abs(snappedEdges.right - (other.x + other.w / 2)) < 0.1) {
        if (!result.guides.some(g => g.type === 'vertical' && Math.abs(g.position - snappedEdges.right) < 0.1)) {
          result.guides.push({ type: 'vertical', position: snappedEdges.right });
        }
      }
      if (Math.abs(snappedEdges.centerX - (other.x + other.w / 2)) < 0.1 || Math.abs(snappedEdges.centerX - other.x) < 0.1 || Math.abs(snappedEdges.centerX - (other.x + other.w)) < 0.1) {
        if (!result.guides.some(g => g.type === 'vertical' && Math.abs(g.position - snappedEdges.centerX) < 0.1)) {
          result.guides.push({ type: 'vertical', position: snappedEdges.centerX });
        }
      }
    }
  }

  if (result.snappedY !== null) {
    const snappedEdges = {
      top: result.snappedY,
      bottom: result.snappedY + movingRect.h,
      centerY: result.snappedY + movingRect.h / 2,
    };
    for (const other of otherRects) {
      if (other.id === movingRect.id) continue;
      if (Math.abs(snappedEdges.top - other.y) < 0.1 || Math.abs(snappedEdges.top - (other.y + other.h)) < 0.1 || Math.abs(snappedEdges.top - (other.y + other.h / 2)) < 0.1) {
        if (!result.guides.some(g => g.type === 'horizontal' && Math.abs(g.position - snappedEdges.top) < 0.1)) {
          result.guides.push({ type: 'horizontal', position: snappedEdges.top });
        }
      }
      if (Math.abs(snappedEdges.bottom - other.y) < 0.1 || Math.abs(snappedEdges.bottom - (other.y + other.h)) < 0.1 || Math.abs(snappedEdges.bottom - (other.y + other.h / 2)) < 0.1) {
        if (!result.guides.some(g => g.type === 'horizontal' && Math.abs(g.position - snappedEdges.bottom) < 0.1)) {
          result.guides.push({ type: 'horizontal', position: snappedEdges.bottom });
        }
      }
      if (Math.abs(snappedEdges.centerY - (other.y + other.h / 2)) < 0.1 || Math.abs(snappedEdges.centerY - other.y) < 0.1 || Math.abs(snappedEdges.centerY - (other.y + other.h)) < 0.1) {
        if (!result.guides.some(g => g.type === 'horizontal' && Math.abs(g.position - snappedEdges.centerY) < 0.1)) {
          result.guides.push({ type: 'horizontal', position: snappedEdges.centerY });
        }
      }
    }
  }

  return result;
}

export function calculateResizeSnaps(
  baseX: number, baseY: number, baseW: number, baseH: number,
  rx: number, ry: number, rw: number, rh: number,
  handle: string,
  otherRects: Rect[],
  ignoreId: string,
  threshold = 5,
  gridX?: number,
  gridY?: number
) {
  const result = { rx, ry, rw, rh, guides: [] as GuideLine[] };

  let minDiffX = threshold + 1;
  let minDiffY = threshold + 1;

  const currentRight = baseX + baseW + rw;
  const currentLeft = baseX + rx;
  const currentTop = baseY + ry;
  const currentBottom = baseY + baseH + rh;

  let snappedEdgeX: number | null = null;
  let snappedEdgeY: number | null = null;

  for (const other of otherRects) {
    if (other.id === ignoreId) continue;

    const oLeft = other.x;
    const oRight = other.x + other.w;
    const oCenterX = other.x + other.w / 2;
    const oTop = other.y;
    const oBottom = other.y + other.h;
    const oCenterY = other.y + other.h / 2;

    const checkX = (movingEdge: number, targetEdge: number) => {
      const diff = Math.abs(movingEdge - targetEdge);
      if (diff < minDiffX) {
        minDiffX = diff;
        snappedEdgeX = targetEdge;
      }
    };

    const checkY = (movingEdge: number, targetEdge: number) => {
      const diff = Math.abs(movingEdge - targetEdge);
      if (diff < minDiffY) {
        minDiffY = diff;
        snappedEdgeY = targetEdge;
      }
    };

    if (handle.includes('e')) {
      checkX(currentRight, oLeft);
      checkX(currentRight, oRight);
      checkX(currentRight, oCenterX);
    }
    if (handle.includes('w')) {
      checkX(currentLeft, oLeft);
      checkX(currentLeft, oRight);
      checkX(currentLeft, oCenterX);
    }
    if (handle.includes('s')) {
      checkY(currentBottom, oTop);
      checkY(currentBottom, oBottom);
      checkY(currentBottom, oCenterY);
    }
    if (handle.includes('n')) {
      checkY(currentTop, oTop);
      checkY(currentTop, oBottom);
      checkY(currentTop, oCenterY);
    }
  }

  if (snappedEdgeX !== null) {
    if (handle.includes('e')) {
      result.rw = snappedEdgeX - (baseX + baseW);
    }
    if (handle.includes('w')) {
      result.rx = snappedEdgeX - baseX;
      result.rw = -(snappedEdgeX - baseX);
    }
    result.guides.push({ type: 'vertical', position: snappedEdgeX });
  }

  if (snappedEdgeY !== null) {
    if (handle.includes('s')) {
      result.rh = snappedEdgeY - (baseY + baseH);
    }
    if (handle.includes('n')) {
      result.ry = snappedEdgeY - baseY;
      result.rh = -(snappedEdgeY - baseY);
    }
    result.guides.push({ type: 'horizontal', position: snappedEdgeY });
  } else if (gridY && gridY > 0) {
    if (handle.includes('s')) {
      const snappedBottom = Math.round(currentBottom / gridY) * gridY;
      result.rh = snappedBottom - (baseY + baseH);
    }
    if (handle.includes('n')) {
      const snappedTop = Math.round(currentTop / gridY) * gridY;
      result.ry = snappedTop - baseY;
      result.rh = -(snappedTop - baseY);
    }
  }

  // Fallback to Grid Snapping X
  if (snappedEdgeX === null && gridX && gridX > 0) {
    if (handle.includes('e')) {
      const snappedRight = Math.round(currentRight / gridX) * gridX;
      result.rw = snappedRight - (baseX + baseW);
    }
    if (handle.includes('w')) {
      const snappedLeft = Math.round(currentLeft / gridX) * gridX;
      result.rx = snappedLeft - baseX;
      result.rw = -(snappedLeft - baseX);
    }
  }

  return result;
}
