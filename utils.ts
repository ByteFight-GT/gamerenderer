import { GamePGN, MapLoc, Symmetry_t } from "./types";

export function make2DArray<T>(width: number, height: number, defaultValue: T): T[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => structuredClone(defaultValue))
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

/**
 * THIS IS TEMPORARY - we should refactor the engine game output asap.
 * 
 * right now the game pgns outputted by the python engine define coords as arrays
 * of [r, c], but in typescript we have explicit {r, c} keys to prevent confusion.
 * 
 * This just takes in data thats ALMOST the correct type (GamePGN), but just with
 * the following keys as [r, c] arrays that need to be converted:
 * - p1_loc[:] and p2_loc[:]
 * - actions[:][:].location
 * - actions[:][:].beacon_target
 */
export function TEMP_convertRCArraysToObjects(dataFromPython: any): GamePGN {
  const ret = { ...dataFromPython };
  
  // convert all elements of p1_loc and p2_loc from [r, c] to {r, c}
  ret.p1_loc = dataFromPython.p1_loc.map((loc: number[]) => ({ r: loc[0], c: loc[1] }));
  ret.p2_loc = dataFromPython.p2_loc.map((loc: number[]) => ({ r: loc[0], c: loc[1] }));

  // for all actions[i] that are arrays:
  for (const turnActions of ret.actions) {
    // for all action objects in each of these arrays
    for (const actionObj of turnActions) {
      // change .location or .beacon_target if it exists
      if (actionObj.location) {
        actionObj.location = { r: actionObj.location[0], c: actionObj.location[1] };
      }
      if (actionObj.beacon_target) {
        actionObj.beacon_target = { r: actionObj.beacon_target[0], c: actionObj.beacon_target[1] };
      }
    }
  }

  return ret;
}
