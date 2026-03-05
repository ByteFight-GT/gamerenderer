import { MapLoc, Symmetry_t } from "./types";

export function make2DArray<T>(width: number, height: number, defaultValue: T): T[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => defaultValue)
  );
}

export function oob(loc: MapLoc, mapSize: MapLoc): boolean {
  return loc.r < 0 || loc.r >= mapSize.r || loc.c < 0 || loc.c >= mapSize.c;
}

export function applySymmetry(mapLoc: MapLoc, symmetry: Symmetry_t, mapWidth: number, mapHeight: number): MapLoc {
  const { r, c } = mapLoc;
  switch (symmetry) {
    case 'X': // x (c) values are symmetric
      return { r, c: mapWidth - 1 - c };
    case 'Y': // y (r) values are symmetric
      return { r: mapHeight - 1 - r, c };
    case 'XY': // both
      return { r: mapHeight - 1 - r, c: mapWidth - 1 - c };
  }
}

export function mergeArrays<T>(arr1: T[], arr2: T[]): T[] {
  return [...arr1, ...arr2];
}
