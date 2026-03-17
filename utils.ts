import type { MapLoc } from "./types";

export function make2DArray<T>(width: number, height: number, defaultValue: T): T[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => structuredClone(defaultValue))
  );
}

export function oob(loc: MapLoc, mapSize: MapLoc): boolean {
  return loc[0] < 0 || loc[0] >= mapSize[0] || loc[1] < 0 || loc[1] >= mapSize[1];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
