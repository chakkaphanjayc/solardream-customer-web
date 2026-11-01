export type SignatureCoordinate = {
  x: number;
  y: number;
  time: number;
  color?: string;
};

export type SignaturePointGroups<TPoint extends SignatureCoordinate = SignatureCoordinate> = TPoint[][];

export function normalizeSignatureData<TPoint extends SignatureCoordinate>(
  groups: SignaturePointGroups<TPoint>,
  width: number,
  height: number,
): SignaturePointGroups<TPoint & { x: number; y: number }> {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);

  return groups.map((group) => group.map((point) => ({
    ...point,
    x: point.x / safeWidth,
    y: point.y / safeHeight,
  })));
}

export function scaleNormalizedSignatureData<TPoint extends SignatureCoordinate>(
  groups: SignaturePointGroups<TPoint>,
  width: number,
  height: number,
): SignaturePointGroups<TPoint & { x: number; y: number }> {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);

  return groups.map((group) => group.map((point) => ({
    ...point,
    x: point.x * safeWidth,
    y: point.y * safeHeight,
  })));
}
