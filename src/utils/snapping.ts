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
