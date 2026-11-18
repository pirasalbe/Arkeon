// Arkeon: Authentic 5 Advanced Units (Triple Striker, CW Rotator, CCW Rotator, Pacifier, Repulsor)
// Based on Dominique Breton's official rules on Tric Trac (https://trictrac.net/jeu-de-societe/arkeon)

const HEX_SIZE = 31;
const SQRT3 = Math.sqrt(3);
const MAX_PASSIVE_SWAPS = 6;

// 6 Cube Directions (0 = North, clockwise around the hex)
const DIRECTIONS = [
  { dx: 0, dy: 1, dz: -1, angleDeg: -90, Compass: "N" }, // 0: North (Up)
  { dx: 1, dy: 0, dz: -1, angleDeg: -30, Compass: "NE" }, // 1: North-East
  { dx: 1, dy: -1, dz: 0, angleDeg: 30, Compass: "SE" }, // 2: South-East
  { dx: 0, dy: -1, dz: 1, angleDeg: 90, Compass: "S" }, // 3: South (Down)
  { dx: -1, dy: 0, dz: 1, angleDeg: 150, Compass: "SW" }, // 4: South-West
  { dx: -1, dy: 1, dz: 0, angleDeg: -150, Compass: "NW" }, // 5: North-West
];

// Authentic Unit Definitions from Tric Trac Rulebook
const UNIT_TYPES = {
  basic: {
    id: "basic",
    name: "Basic Striker",
    short: "1 Laser",
    isAdvanced: false,
    isAggressive: true,
    rotatable: true,
    lasers: [0],
    special: null,
  },
  triple: {
    id: "triple",
    name: "Triple Striker",
    short: "3-Way Laser",
    isAdvanced: true,
    isAggressive: true,
    rotatable: true,
    lasers: [5, 0, 1],
    special: null,
  },
  rot_cw: {
    id: "rot_cw",
    name: "CW Rotator",
    short: "Pivot Adj ⟳",
    isAdvanced: true,
    isAggressive: false,
    rotatable: false,
    lasers: [],
    special: "cw",
  },
  rot_ccw: {
    id: "rot_ccw",
    name: "CCW Rotator",
    short: "Pivot Adj ⟲",
    isAdvanced: true,
    isAggressive: false,
    rotatable: false,
    lasers: [],
    special: "ccw",
  },
  pacifier: {
    id: "pacifier",
    name: "Pacifier",
    short: "Turn Away",
    isAdvanced: true,
    isAggressive: false,
    rotatable: false,
    lasers: [],
    special: "pacify",
  },
  repulsor: {
    id: "repulsor",
    name: "Repulsor",
    short: "Push 6 Axes",
    isAdvanced: true,
    isAggressive: false,
    rotatable: false,
    lasers: [],
    special: "repulse",
  },
};

const ADVANCED_IDS = ["triple", "rot_cw", "rot_ccw", "pacifier", "repulsor"];
const INITIAL_RED_BASE_KEY = "0,3,-3";
const INITIAL_BLUE_BASE_KEY = "0,-3,3";

function generateBoardCoords() {
  const coords = [];
  for (let x = -2; x <= 2; x++) {
    for (let y = -3; y <= 3; y++) {
      const z = -x - y;
      if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 3) {
        coords.push({ x, y, z });
      }
    }
  }
  return coords;
}

const BOARD_COORDS = generateBoardCoords();

function keyOf(x, y, z) {
  return `${x},${y},${z}`;
}

const COORD_LABELS = new Map();
(function buildCoordLabels() {
  const cols = { "-2": "A", "-1": "B", 0: "C", 1: "D", 2: "E" };
  for (let x = -2; x <= 2; x++) {
    const colCells = BOARD_COORDS.filter((c) => c.x === x).sort(
      (a, b) => a.z - a.y - (b.z - b.y),
    );
    colCells.forEach((c, idx) => {
      COORD_LABELS.set(keyOf(c.x, c.y, c.z), `${cols[String(x)]}${idx + 1}`);
    });
  }
})();

function labelOf(key) {
  return COORD_LABELS.get(key) || key;
}

function cubeToPixel(x, y, z) {
  const px = HEX_SIZE * 1.5 * x;
  const py = HEX_SIZE * (SQRT3 / 2) * (z - y);
  return { x: px, y: py };
}

function hexPolygonPoints(cx, cy, radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push(
      `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

let aiStartTimer = null;
let aiCommitTimer = null;

function clearAiTimers() {
  if (aiStartTimer) {
    clearTimeout(aiStartTimer);
    aiStartTimer = null;
  }
  if (aiCommitTimer) {
    clearTimeout(aiCommitTimer);
    aiCommitTimer = null;
  }
}

let state = {
  mode: "ai",
  turn: "blue",
  turnNumber: 1,
  passiveSwapStreak: 0,
  showCoords: true,
  winner: null,
  isAnimatingAi: false,
  aiPreview: null,
  cells: new Map(),
  reserves: {
    blue: { available: [...ADVANCED_IDS], spent: [] },
    red: { available: [...ADVANCED_IDS], spent: [] },
  },
  moveHistory: [],
  selectedUnitType: "basic",
  selectedRotation: 0,
  stagedHexKey: null,
  hoverHexKey: null,
};

function initGame() {
  clearAiTimers();
  state.turn = "blue";
  state.turnNumber = 1;
  state.passiveSwapStreak = 0;
  state.winner = null;
  state.isAnimatingAi = false;
  state.aiPreview = null;
  state.cells = new Map();
  state.moveHistory = [];

  for (const { x, y, z } of BOARD_COORDS) {
    state.cells.set(keyOf(x, y, z), { x, y, z, occupant: null });
  }

  state.cells.get(INITIAL_RED_BASE_KEY).occupant = {
    faction: "red",
    type: "base",
    isBase: true,
    rot: 3,
  };
  state.cells.get(INITIAL_BLUE_BASE_KEY).occupant = {
    faction: "blue",
    type: "base",
    isBase: true,
    rot: 0,
  };

  [
    { x: -1, y: 3, z: -2, rot: 3 },
    { x: 0, y: 2, z: -2, rot: 3 },
    { x: 1, y: 2, z: -3, rot: 3 },
  ].forEach((u) => {
    state.cells.get(keyOf(u.x, u.y, u.z)).occupant = {
      faction: "red",
      type: "basic",
      isBase: false,
      rot: u.rot,
    };
  });

  [
    { x: -1, y: -2, z: 3, rot: 0 },
    { x: 0, y: -2, z: 2, rot: 0 },
    { x: 1, y: -3, z: 2, rot: 0 },
  ].forEach((u) => {
    state.cells.get(keyOf(u.x, u.y, u.z)).occupant = {
      faction: "blue",
      type: "basic",
      isBase: false,
      rot: u.rot,
    };
  });

  state.reserves = {
    blue: { available: [...ADVANCED_IDS], spent: [] },
    red: { available: [...ADVANCED_IDS], spent: [] },
  };

  state.selectedUnitType = "basic";
  state.selectedRotation = 0;
  state.stagedHexKey = null;
  state.hoverHexKey = null;

  setLog(
    "Match initialized with authentic Tric Trac rules: Triple Striker, CW/CCW Rotators, Pacifier, and Repulsor!",
  );
  renderAll();
}

function cloneCells(cellsMap) {
  const copy = new Map();
  for (const [k, v] of cellsMap.entries()) {
    copy.set(k, {
      x: v.x,
      y: v.y,
      z: v.z,
      occupant: v.occupant ? { ...v.occupant } : null,
    });
  }
  return copy;
}

// Find current coordinate key of a faction's Home Base (since Repulsor can push bases!)
function findBaseKey(cellsMap, faction) {
  for (const [k, cell] of cellsMap.entries()) {
    if (
      cell.occupant &&
      cell.occupant.isBase &&
      cell.occupant.faction === faction
    ) {
      return k;
    }
  }
  return null;
}

function getNeighbors(x, y, z, cellsMap = state.cells) {
  const list = [];
  for (let dir = 0; dir < 6; dir++) {
    const nx = x + DIRECTIONS[dir].dx;
    const ny = y + DIRECTIONS[dir].dy;
    const nz = z + DIRECTIONS[dir].dz;
    const k = keyOf(nx, ny, nz);
    const cell = cellsMap.get(k);
    if (cell) list.push({ dir, key: k, cell });
  }
  return list;
}

function getActiveLaserDirs(unitType, rot) {
  const spec = UNIT_TYPES[unitType];
  if (!spec || !spec.isAggressive) return [];
  return spec.lasers.map((d) => (d + rot) % 6);
}

// Returns the key of any unit of `attackerFaction` on `cellsMap` currently aiming a laser at `targetKey`
function findTargetingUnitKey(cellsMap, targetKey, attackerFaction) {
  for (const [k, cell] of cellsMap.entries()) {
    const occ = cell.occupant;
    if (!occ || occ.isBase || occ.faction !== attackerFaction) continue;
    const dirs = getActiveLaserDirs(occ.type, occ.rot);
    for (const d of dirs) {
      const aimedKey = keyOf(
        cell.x + DIRECTIONS[d].dx,
        cell.y + DIRECTIONS[d].dy,
        cell.z + DIRECTIONS[d].dz,
      );
      if (aimedKey === targetKey) {
        return k;
      }
    }
  }
  return null;
}

function findConnectedKeys(cellsMap, faction) {
  const baseKey = findBaseKey(cellsMap, faction);
  if (!baseKey) return new Set();
  const baseCell = cellsMap.get(baseKey);
  const visited = new Set();
  if (!baseCell || !baseCell.occupant || baseCell.occupant.faction !== faction)
    return visited;

  const queue = [baseKey];
  visited.add(baseKey);

  while (queue.length > 0) {
    const currKey = queue.shift();
    const curr = cellsMap.get(currKey);
    for (const { key, cell } of getNeighbors(
      curr.x,
      curr.y,
      curr.z,
      cellsMap,
    )) {
      if (
        !visited.has(key) &&
        cell.occupant &&
        cell.occupant.faction === faction
      ) {
        visited.add(key);
        queue.push(key);
      }
    }
  }
  return visited;
}

// Execute 5-Step Official Chain-Reaction Simulation
function simulateMove(faction, unitType, rot, targetKey) {
  const targetCell = state.cells.get(targetKey);
  if (!targetCell) {
    return {
      valid: false,
      reason: "Invalid hex.",
      laserDirs: [],
      laserTargetKeys: [],
      directHits: [],
      cutUnits: [],
      manipulatedKeys: [],
    };
  }

  const spec = UNIT_TYPES[unitType];
  const effectiveRot = spec.rotatable ? rot : 0;
  const laserDirs = getActiveLaserDirs(unitType, effectiveRot);
  const laserTargetKeys = laserDirs
    .map((d) =>
      keyOf(
        targetCell.x + DIRECTIONS[d].dx,
        targetCell.y + DIRECTIONS[d].dy,
        targetCell.z + DIRECTIONS[d].dz,
      ),
    )
    .filter((k) => state.cells.has(k));

  const fail = (reason) => ({
    valid: false,
    reason,
    laserDirs,
    laserTargetKeys,
    directHits: [],
    cutUnits: [],
    manipulatedKeys: [],
  });

  const existing = targetCell.occupant;
  if (existing && existing.isBase) return fail("Cannot place on a Home Base.");

  const isSwap = Boolean(existing && existing.faction === faction);
  if (existing && existing.faction !== faction) {
    return fail("Hex is occupied by an enemy unit.");
  }

  if (isSwap && existing.type === unitType) {
    return fail(
      "Cannot rotate an existing unit in place: pick a different unit card in your Arsenal to upgrade or downgrade it.",
    );
  }

  if (
    unitType !== "basic" &&
    !state.reserves[faction].available.includes(unitType)
  ) {
    return fail("That Advanced unit is not currently available.");
  }

  const hasFriendlyNeighbor = getNeighbors(
    targetCell.x,
    targetCell.y,
    targetCell.z,
  ).some((n) => n.cell.occupant && n.cell.occupant.faction === faction);
  if (!hasFriendlyNeighbor) {
    return fail("Must be adjacent to your connected supply chain.");
  }

  const enemyFaction = faction === "blue" ? "red" : "blue";
  const initialEnemyBaseKey = findBaseKey(state.cells, enemyFaction);

  // Rule: You cannot place a unit adjacent to the Enemy Base unless it attacks the Enemy Base
  // (or is a Repulsor that pushes the Enemy Base away).
  const isAdjacentToEnemyBase = getNeighbors(
    targetCell.x,
    targetCell.y,
    targetCell.z,
  ).some((n) => n.key === initialEnemyBaseKey);
  if (
    isAdjacentToEnemyBase &&
    spec.special !== "repulse" &&
    !laserTargetKeys.includes(initialEnemyBaseKey)
  ) {
    return fail(
      "Units next to Enemy HQ must aim a laser directly at Enemy HQ.",
    );
  }

  // Rule: For Aggressive units (Basic & Triple Striker), you CANNOT step into an active enemy laser.
  // For Non-Aggressive Manipulators (Rotators, Pacifier, Repulsor), Step 1 resolves their rotation/push FIRST,
  // so they CAN step in front of an enemy laser if their Step 1 effect turns or pushes that laser away!
  if (spec.isAggressive) {
    const guardingEnemyKey = findTargetingUnitKey(
      state.cells,
      targetKey,
      enemyFaction,
    );
    if (guardingEnemyKey) {
      return fail(
        `Blocked: ${labelOf(targetKey)} is guarded by enemy laser at ${labelOf(guardingEnemyKey)}. Use a Manipulator (Rotator, Pacifier, or Repulsor) or flank it!`,
      );
    }
  }

  const simCells = cloneCells(state.cells);
  simCells.get(targetKey).occupant = {
    faction,
    type: unitType,
    isBase: false,
    rot: effectiveRot,
  };

  const manipulatedKeys = [];
  const activeAttackerKeys = new Set();
  const enemyAttackerKeys = new Set();

  if (spec.isAggressive) {
    activeAttackerKeys.add(targetKey);
  }

  // =========================================================================
  // STEP 1: Resolve Special Manipulator Action (CW, CCW, Pacifier, Repulsor)
  // =========================================================================
  if (
    spec.special === "cw" ||
    spec.special === "ccw" ||
    spec.special === "pacify"
  ) {
    for (const { dir, key: nKey, cell: nCell } of getNeighbors(
      targetCell.x,
      targetCell.y,
      targetCell.z,
      simCells,
    )) {
      const occ = nCell.occupant;
      if (!occ || occ.isBase || !UNIT_TYPES[occ.type]?.isAggressive) continue;

      if (spec.special === "cw") {
        occ.rot = (occ.rot + 1) % 6;
      } else if (spec.special === "ccw") {
        occ.rot = (occ.rot + 5) % 6;
      } else if (spec.special === "pacify") {
        // Turn the unit's back toward the Pacifier (face outward in direction `dir`)
        occ.rot = dir;
      }

      manipulatedKeys.push({
        key: nKey,
        tag: spec.special === "pacify" ? "PAC!" : "ROT!",
      });
      if (occ.faction === faction) {
        activeAttackerKeys.add(nKey);
      } else {
        enemyAttackerKeys.add(nKey);
      }
    }
  } else if (spec.special === "repulse") {
    // Push all units (including bases) along the 6 axes away from targetCell until hitting an immovable obstacle
    for (let dir = 0; dir < 6; dir++) {
      const rayKeys = [];
      let cx = targetCell.x + DIRECTIONS[dir].dx;
      let cy = targetCell.y + DIRECTIONS[dir].dy;
      let cz = targetCell.z + DIRECTIONS[dir].dz;

      while (simCells.has(keyOf(cx, cy, cz))) {
        rayKeys.push(keyOf(cx, cy, cz));
        cx += DIRECTIONS[dir].dx;
        cy += DIRECTIONS[dir].dy;
        cz += DIRECTIONS[dir].dz;
      }

      // Work from the farthest hex on the ray inward toward the Repulsor:
      // any unit with an empty hex immediately behind it on the ray shifts 1 hex outward
      for (let i = rayKeys.length - 1; i >= 1; i--) {
        const destKey = rayKeys[i];
        const srcKey = rayKeys[i - 1];
        const destCell = simCells.get(destKey);
        const srcCell = simCells.get(srcKey);

        if (!destCell.occupant && srcCell.occupant) {
          destCell.occupant = srcCell.occupant;
          srcCell.occupant = null;
          manipulatedKeys.push({ key: destKey, tag: "PUSH!" });

          if (
            !destCell.occupant.isBase &&
            UNIT_TYPES[destCell.occupant.type]?.isAggressive
          ) {
            if (destCell.occupant.faction === faction) {
              activeAttackerKeys.add(destKey);
            } else {
              enemyAttackerKeys.add(destKey);
            }
          }
        }
      }
    }
  }

  // If a Manipulator was placed in front of an enemy laser and DID NOT turn/push that laser away, it is illegal
  const postManipGuardKey = findTargetingUnitKey(
    simCells,
    targetKey,
    enemyFaction,
  );
  if (postManipGuardKey && !activeAttackerKeys.has(targetKey)) {
    // Check if our own Step 2 attacks will kill that guard before Step 4
    // (Wait: Step 2 happens before Step 4, so let Step 2 run first, then check if targetKey survives Step 4!)
  }

  const directHits = [];
  const cutUnits = [];
  let hitsEnemyBase = false;
  let hitsOwnBase = false;

  // Helper to fire lasers from a set of attacker keys belonging to `firingFaction`
  function resolveFactionAttacks(attackerKeySet, firingFaction) {
    const oppFaction = firingFaction === "blue" ? "red" : "blue";
    const oppBaseKey = findBaseKey(simCells, oppFaction);
    const myBaseKey = findBaseKey(simCells, firingFaction);

    const victimsToDestroy = [];

    for (const atkKey of attackerKeySet) {
      const atkCell = simCells.get(atkKey);
      const occ = atkCell?.occupant;
      if (!occ || occ.isBase || occ.faction !== firingFaction) continue;

      const dirs = getActiveLaserDirs(occ.type, occ.rot);
      for (const d of dirs) {
        const hitKey = keyOf(
          atkCell.x + DIRECTIONS[d].dx,
          atkCell.y + DIRECTIONS[d].dy,
          atkCell.z + DIRECTIONS[d].dz,
        );
        if (!simCells.has(hitKey)) continue;

        if (hitKey === myBaseKey) {
          hitsOwnBase = true;
        } else if (hitKey === oppBaseKey) {
          if (firingFaction === faction) {
            hitsEnemyBase = true;
          } else {
            hitsOwnBase = true;
          }
        } else {
          const targetOcc = simCells.get(hitKey)?.occupant;
          if (targetOcc && !targetOcc.isBase) {
            victimsToDestroy.push(hitKey);
          }
        }
      }
    }

    for (const vKey of victimsToDestroy) {
      const occ = simCells.get(vKey)?.occupant;
      if (occ && !occ.isBase) {
        directHits.push({ key: vKey, occupant: { ...occ } });
        simCells.get(vKey).occupant = null;
      }
    }
  }

  // Helper to remove disconnected units of `checkFaction`
  function removeDisconnectedFactionUnits(checkFaction) {
    const connected = findConnectedKeys(simCells, checkFaction);
    for (const [k, cell] of simCells.entries()) {
      if (!cell.occupant || cell.occupant.isBase) continue;
      if (cell.occupant.faction === checkFaction && !connected.has(k)) {
        cutUnits.push({ key: k, occupant: { ...cell.occupant } });
        cell.occupant = null;
      }
    }
  }

  // =========================================================================
  // STEP 2: Resolve Active Player's Attacks
  // =========================================================================
  resolveFactionAttacks(activeAttackerKeys, faction);
  if (hitsOwnBase) {
    return fail(
      "Illegal move: this action would fire a laser at your own Home Base!",
    );
  }

  // =========================================================================
  // STEP 3: Remove Isolated Enemy Units
  // =========================================================================
  removeDisconnectedFactionUnits(enemyFaction);

  // If the Enemy Base was already hit in Step 2, the active player wins before Step 4!
  if (!hitsEnemyBase) {
    // =======================================================================
    // STEP 4: Resolve Opponent's Triggered Attacks (from rotated/pushed units)
    // =======================================================================
    resolveFactionAttacks(enemyAttackerKeys, enemyFaction);
    if (hitsOwnBase) {
      return fail(
        "Illegal move: rotated/pushed unit would strike your own Home Base!",
      );
    }

    // =======================================================================
    // STEP 5: Remove Isolated Active Player Units
    // =======================================================================
    removeDisconnectedFactionUnits(faction);
  } else {
    // Still verify active player's own supply line in case of friendly fire during base strike
    removeDisconnectedFactionUnits(faction);
  }

  // Verify the newly placed unit at `targetKey` survived all 5 steps and is still connected!
  const finalPlacedOcc = simCells.get(targetKey)?.occupant;
  if (!finalPlacedOcc || finalPlacedOcc.faction !== faction) {
    return {
      valid: false,
      reason:
        "Illegal move: unit would be destroyed or disconnected from your Home Base!",
      laserDirs,
      laserTargetKeys,
      directHits,
      cutUnits,
      manipulatedKeys,
    };
  }

  // Also ensure no surviving enemy unit is still aiming at `targetKey` at the end of the turn
  const finalGuardKey = findTargetingUnitKey(simCells, targetKey, enemyFaction);
  if (finalGuardKey) {
    return {
      valid: false,
      reason: `Illegal move: ${labelOf(targetKey)} remains in the line of fire of enemy at ${labelOf(finalGuardKey)}!`,
      laserDirs,
      laserTargetKeys,
      directHits,
      cutUnits,
      manipulatedKeys,
    };
  }

  return {
    valid: true,
    isSwap,
    previousOccupant: existing ? { ...existing } : null,
    laserDirs,
    laserTargetKeys,
    directHits,
    cutUnits,
    manipulatedKeys,
    hitsEnemyBase,
    simCells,
  };
}

function getHexAvailability(
  targetKey,
  faction = state.turn,
  unitType = state.selectedUnitType,
) {
  const spec = UNIT_TYPES[unitType];
  if (!spec.rotatable) {
    const sim = simulateMove(faction, unitType, 0, targetKey);
    return sim.valid
      ? { canPlace: true, defaultRot: 0, sim }
      : { canPlace: false, reason: sim.reason };
  }

  const preferredRot = state.selectedRotation;
  const currentSim = simulateMove(faction, unitType, preferredRot, targetKey);
  if (currentSim.valid) {
    return { canPlace: true, defaultRot: preferredRot, sim: currentSim };
  }
  for (let offset = 1; offset < 6; offset++) {
    const r = (preferredRot + offset) % 6;
    const trySim = simulateMove(faction, unitType, r, targetKey);
    if (trySim.valid) {
      return { canPlace: true, defaultRot: r, sim: trySim };
    }
  }
  return { canPlace: false, reason: currentSim.reason };
}

function canUnitTypeBeUsed(faction, unitType) {
  if (
    unitType !== "basic" &&
    !state.reserves[faction].available.includes(unitType)
  ) {
    return false;
  }
  const maxRot = UNIT_TYPES[unitType].rotatable ? 6 : 1;
  for (const [k] of state.cells.entries()) {
    for (let rot = 0; rot < maxRot; rot++) {
      if (simulateMove(faction, unitType, rot, k).valid) {
        return true;
      }
    }
  }
  return false;
}

function findFirstPlayableUnitType(faction) {
  const order = ["basic", ...ADVANCED_IDS];
  for (const uId of order) {
    if (canUnitTypeBeUsed(faction, uId)) {
      return uId;
    }
  }
  return null;
}

function handleDestroyedUnit(faction, unitType) {
  if (!UNIT_TYPES[unitType]?.isAdvanced) return null;
  const pool = state.reserves[faction];
  if (!pool.spent.includes(unitType)) pool.spent.push(unitType);
  if (pool.spent.length >= 5) {
    pool.available = [...ADVANCED_IDS];
    pool.spent = [];
    return `${faction.toUpperCase()} refreshed all 5 Advanced units!`;
  }
  return null;
}

function recordMoveHistory(
  faction,
  unitType,
  rot,
  targetKey,
  sim,
  refreshEvents,
) {
  const coord = labelOf(targetKey);
  const spec = UNIT_TYPES[unitType];
  const compassDirs = spec.rotatable
    ? `aim ${sim.laserDirs.map((d) => DIRECTIONS[d].Compass).join(",")} to ${sim.laserTargetKeys.map((k) => labelOf(k)).join(",")}`
    : `effect: ${spec.short}`;

  const fxCoords = sim.manipulatedKeys.map(
    (m) => `${labelOf(m.key)}(${m.tag.replace("!", "")})`,
  );
  const hitCoords = sim.directHits.map(
    (h) => `${labelOf(h.key)}(${h.occupant.faction[0].toUpperCase()})`,
  );
  const cutCoords = sim.cutUnits.map(
    (c) => `${labelOf(c.key)}(${c.occupant.faction[0].toUpperCase()})`,
  );

  const actionVerb = sim.isSwap
    ? `Swapped (${UNIT_TYPES[sim.previousOccupant.type].name} to)`
    : "Deployed";

  const refreshNote = refreshEvents.length
    ? ` | REFRESH: ${refreshEvents.join(" ")}`
    : "";

  const entry = {
    turn: state.turnNumber,
    faction,
    coord,
    actionVerb,
    unitName: spec.name,
    compassDirs,
    fxCoords,
    hitCoords,
    cutCoords,
    textSummary:
      `#${state.turnNumber} [${faction.toUpperCase()}] ${actionVerb} ${spec.name} at ${coord} (${compassDirs})` +
      (fxCoords.length ? ` | FX: ${fxCoords.join(", ")}` : "") +
      (hitCoords.length ? ` | HIT: ${hitCoords.join(", ")}` : "") +
      (cutCoords.length ? ` | CUT: ${cutCoords.join(", ")}` : "") +
      refreshNote,
  };

  state.moveHistory.push(entry);
  state.turnNumber++;
}

function commitMove(targetKey, rot, explicitUnitType = null) {
  if (state.winner) return;
  const faction = state.turn;
  const unitType = explicitUnitType || state.selectedUnitType;
  const sim = simulateMove(faction, unitType, rot, targetKey);

  if (!sim.valid) {
    state.isAnimatingAi = false;
    state.aiPreview = null;
    setLog(sim.reason);
    renderAll();
    return;
  }

  const pool = state.reserves[faction];
  if (unitType !== "basic") {
    pool.available = pool.available.filter((id) => id !== unitType);
  }

  if (
    sim.isSwap &&
    sim.previousOccupant &&
    sim.previousOccupant.type !== "basic" &&
    sim.previousOccupant.type !== unitType
  ) {
    if (!pool.available.includes(sim.previousOccupant.type)) {
      pool.available.push(sim.previousOccupant.type);
    }
  }

  const refreshEvents = [];
  for (const hit of sim.directHits) {
    const msg = handleDestroyedUnit(hit.occupant.faction, hit.occupant.type);
    if (msg) refreshEvents.push(msg);
  }
  for (const cut of sim.cutUnits) {
    const msg = handleDestroyedUnit(cut.occupant.faction, cut.occupant.type);
    if (msg) refreshEvents.push(msg);
  }

  const totalCasualties = sim.directHits.length + sim.cutUnits.length;
  if (
    sim.isSwap &&
    totalCasualties === 0 &&
    sim.manipulatedKeys.length === 0 &&
    !sim.hitsEnemyBase
  ) {
    state.passiveSwapStreak++;
  } else {
    state.passiveSwapStreak = 0;
  }

  recordMoveHistory(faction, unitType, rot, targetKey, sim, refreshEvents);

  state.cells = sim.simCells;
  state.stagedHexKey = null;
  state.hoverHexKey = null;
  state.aiPreview = null;
  state.isAnimatingAi = false;

  const enemyFaction = faction === "blue" ? "red" : "blue";
  const lastLog = state.moveHistory[state.moveHistory.length - 1].textSummary;

  if (sim.hitsEnemyBase) {
    state.winner = faction;
    setLog(
      `${lastLog}. 🏆 ${faction.toUpperCase()} WINS by striking ${enemyFaction.toUpperCase()} HQ.`,
    );
    renderAll();
    return;
  }

  const remainingEnemyUnits = Array.from(state.cells.values()).filter(
    (c) =>
      c.occupant && c.occupant.faction === enemyFaction && !c.occupant.isBase,
  ).length;

  if (remainingEnemyUnits === 0) {
    state.winner = faction;
    setLog(
      `${lastLog}. 🏆 ${faction.toUpperCase()} WINS by total elimination.`,
    );
    renderAll();
    return;
  }

  if (state.passiveSwapStreak >= MAX_PASSIVE_SWAPS) {
    const blueUnits = Array.from(state.cells.values()).filter(
      (c) => c.occupant && c.occupant.faction === "blue" && !c.occupant.isBase,
    ).length;
    const redUnits = Array.from(state.cells.values()).filter(
      (c) => c.occupant && c.occupant.faction === "red" && !c.occupant.isBase,
    ).length;

    if (blueUnits === redUnits) {
      state.winner = "draw";
      setLog(
        `${lastLog}. Stalemate limit reached (${MAX_PASSIVE_SWAPS} passive swaps) with equal territory (${blueUnits} vs ${redUnits}). Match ends in a DRAW.`,
      );
    } else {
      state.winner = blueUnits > redUnits ? "blue" : "red";
      setLog(
        `${lastLog}. Stalemate limit reached (${MAX_PASSIVE_SWAPS} passive swaps). 🏆 ${state.winner.toUpperCase()} WINS on territory control (${blueUnits} Blue vs ${redUnits} Red units).`,
      );
    }
    renderAll();
    return;
  }

  state.turn = enemyFaction;
  state.selectedRotation = state.turn === "blue" ? 0 : 3;

  const firstPlayable = findFirstPlayableUnitType(state.turn);
  if (!firstPlayable) {
    state.winner = faction;
    setLog(
      `${lastLog}. 🏆 ${faction.toUpperCase()} WINS because ${enemyFaction.toUpperCase()} has no legal moves remaining.`,
    );
    renderAll();
    return;
  }

  state.selectedUnitType = firstPlayable;

  if (
    firstPlayable !== "basic" &&
    (state.mode === "pvp" || state.turn === "blue")
  ) {
    setLog(
      `${lastLog}. Basic Striker has no valid moves for ${state.turn.toUpperCase()}: auto-selected ${UNIT_TYPES[firstPlayable].name}.`,
    );
  } else {
    setLog(lastLog);
  }

  if (state.mode === "ai" && state.turn === "red" && !state.winner) {
    state.isAnimatingAi = true;
    renderAll();
    aiStartTimer = setTimeout(runAiTurn, 400);
  } else {
    renderAll();
  }
}

function runAiTurn() {
  if (state.winner || state.turn !== "red") {
    state.isAnimatingAi = false;
    renderAll();
    return;
  }

  const candidateTypes = ["basic", ...state.reserves.red.available];
  let bestMove = null;
  let bestScore = -9999;

  for (const uType of candidateTypes) {
    const maxRot = UNIT_TYPES[uType].rotatable ? 6 : 1;
    for (const [k, cell] of state.cells.entries()) {
      for (let rot = 0; rot < maxRot; rot++) {
        const sim = simulateMove("red", uType, rot, k);
        if (!sim.valid) continue;

        let score = 0;
        if (sim.hitsEnemyBase) score += 10000;

        for (const h of sim.directHits)
          score += h.occupant.faction === "blue" ? 45 : -40;
        for (const c of sim.cutUnits)
          score += c.occupant.faction === "blue" ? 65 : -55;
        score += sim.manipulatedKeys.length * 6;

        score += (cell.z - cell.y) * 3;

        if (
          sim.isSwap &&
          sim.directHits.length === 0 &&
          sim.cutUnits.length === 0 &&
          !sim.hitsEnemyBase
        ) {
          score -= 35;
        }
        if (
          uType !== "basic" &&
          sim.directHits.length === 0 &&
          sim.cutUnits.length === 0 &&
          sim.manipulatedKeys.length === 0 &&
          !sim.hitsEnemyBase
        ) {
          score -= 18;
        }

        score += Math.random() * 3;

        if (score > bestScore) {
          bestScore = score;
          bestMove = { key: k, unitType: uType, rot, sim };
        }
      }
    }
  }

  if (!bestMove) {
    state.isAnimatingAi = false;
    state.winner = "blue";
    setLog("BLUE WINS. Red AI is completely encircled and has no legal moves.");
    renderAll();
    return;
  }

  state.selectedUnitType = bestMove.unitType;
  state.selectedRotation = bestMove.rot;
  state.aiPreview = bestMove;
  setLog(
    `Red AI is deploying ${UNIT_TYPES[bestMove.unitType].name} at ${labelOf(bestMove.key)}...`,
  );
  renderAll();

  aiCommitTimer = setTimeout(() => {
    commitMove(bestMove.key, bestMove.rot, bestMove.unitType);
  }, 950);
}

function setLog(msg) {
  const el = document.getElementById("combatLog");
  if (el) el.textContent = msg;
}

function renderAll() {
  renderTurnBanner();
  renderScoreboard();
  renderMoveHistory();
  renderUnitDock();
  renderBoard();
  renderToolbar();
}

function renderMoveHistory() {
  const container = document.getElementById("moveHistoryList");
  if (!container) return;

  if (state.moveHistory.length === 0) {
    container.innerHTML = `<div class="history-empty">No moves recorded yet.</div>`;
    return;
  }

  container.innerHTML = state.moveHistory
    .slice()
    .reverse()
    .map((m) => {
      const fxHtml = m.fxCoords?.length
        ? ` <span class="fx-pill">FX:${m.fxCoords.join(",")}</span>`
        : "";
      const hitHtml = m.hitCoords.length
        ? ` <span class="hit-pill">HIT:${m.hitCoords.join(",")}</span>`
        : "";
      const cutHtml = m.cutCoords.length
        ? ` <span class="cut-pill">CUT:${m.cutCoords.join(",")}</span>`
        : "";
      return `
        <div class="history-item ${m.faction}">
          <span class="turn-num">#${m.turn} ${m.faction.toUpperCase()}</span>
          ${m.actionVerb} <strong>${m.unitName}</strong> @
          <span class="coord-pill">${m.coord}</span>
          (${m.compassDirs})${fxHtml}${hitHtml}${cutHtml}
        </div>
      `;
    })
    .join("");
}

function renderTurnBanner() {
  const banner = document.getElementById("turnBanner");
  const title = document.getElementById("turnTitle");
  const hint = document.getElementById("turnStepHint");

  banner.className = `turn-banner ${state.turn === "red" ? "red-turn" : "blue-turn"}`;

  if (state.winner) {
    title.textContent =
      state.winner === "draw"
        ? "🤝 STALEMATE DRAW!"
        : `🏆 ${state.winner.toUpperCase()} VICTORY!`;
    hint.textContent = "Click 'New Match' in the top bar to play again.";
    return;
  }

  if (state.mode === "ai" && state.turn === "red") {
    title.textContent = "RED AI EXECUTING MOVE...";
    hint.textContent =
      "Watch the board for Red's chain reactions and laser fire.";
    return;
  }

  title.textContent = `${state.turn.toUpperCase()} COMMANDER'S TURN`;
  hint.textContent = !state.stagedHexKey
    ? "Step 1: Pick an enabled unit card. Step 2: Click or tap any green dashed hex on the board."
    : `Locked on ${labelOf(state.stagedHexKey)}. Click 'Confirm Move ✓' (or tap hex again).`;
}

function renderScoreboard() {
  let blueCount = 0;
  let redCount = 0;
  for (const cell of state.cells.values()) {
    if (cell.occupant && !cell.occupant.isBase) {
      if (cell.occupant.faction === "blue") blueCount++;
      if (cell.occupant.faction === "red") redCount++;
    }
  }

  document.getElementById("blueBoardCount").textContent = blueCount;
  document.getElementById("redBoardCount").textContent = redCount;
  document.getElementById("blueAdvCount").textContent =
    `${state.reserves.blue.available.length}/5`;
  document.getElementById("redAdvCount").textContent =
    `${state.reserves.red.available.length}/5`;

  const blueSpent = state.reserves.blue.spent
    .map((id) => UNIT_TYPES[id].name)
    .join(", ");
  const redSpent = state.reserves.red.spent
    .map((id) => UNIT_TYPES[id].name)
    .join(", ");
  document.getElementById("blueGraveyard").textContent =
    `Spent Adv (${state.reserves.blue.spent.length}/5): ${blueSpent || "None"}`;
  document.getElementById("redGraveyard").textContent =
    `Spent Adv (${state.reserves.red.spent.length}/5): ${redSpent || "None"}`;
  document.getElementById("redFactionLabel").textContent =
    state.mode === "ai" ? "Red Faction (AI)" : "Red Faction (Player 2)";

  const swapEl = document.getElementById("passiveSwapCount");
  const stalemateBox = document.getElementById("stalemateBox");
  if (swapEl && stalemateBox) {
    swapEl.textContent = `${state.passiveSwapStreak} / ${MAX_PASSIVE_SWAPS}`;
    stalemateBox.classList.toggle("warning", state.passiveSwapStreak >= 4);
  }
}

function createMiniUnitSvg(unitId, faction) {
  const spec = UNIT_TYPES[unitId];
  const color = faction === "red" ? "#f43f5e" : "#38bdf8";
  const rot = faction === "red" ? 3 : 0;

  let innerGlyph = "";
  if (spec.isAggressive) {
    const dirs = getActiveLaserDirs(unitId, rot);
    let rays = "";
    for (const d of dirs) {
      const angle = (Math.PI / 180) * DIRECTIONS[d].angleDeg;
      const x2 = (27 + 20 * Math.cos(angle)).toFixed(1);
      const y2 = (27 + 20 * Math.sin(angle)).toFixed(1);
      rays += `<line x1="27" y1="27" x2="${x2}" y2="${y2}" stroke="#facc15" stroke-width="3" stroke-linecap="round" />`;
    }
    innerGlyph = `${rays}<circle cx="27" cy="27" r="7" fill="${color}" />`;
  } else {
    const symbolMap = {
      cw: "⟳",
      ccw: "⟲",
      pacify: "☮",
      repulse: "❖",
    };
    const sym = symbolMap[spec.special] || "★";
    innerGlyph = `
      <circle cx="27" cy="27" r="13" fill="#0f172a" stroke="#a78bfa" stroke-width="2" />
      <text x="27" y="32" text-anchor="middle" fill="#facc15" font-size="15" font-weight="800">${sym}</text>
    `;
  }

  return `
    <svg class="unit-mini-svg" viewBox="0 0 54 54">
      <polygon points="${hexPolygonPoints(27, 27, 22)}" fill="#0f172a" stroke="${color}" stroke-width="2" />
      ${innerGlyph}
    </svg>
  `;
}

function renderUnitDock() {
  const dock = document.getElementById("unitDock");
  dock.innerHTML = "";

  const isAiTurn = state.mode === "ai" && state.turn === "red";
  const displayFaction = isAiTurn ? "blue" : state.turn;
  const availableAdv = state.reserves[displayFaction].available;

  Object.values(UNIT_TYPES).forEach((u) => {
    const inReserve = !u.isAdvanced || availableAdv.includes(u.id);
    const hasLegalMove =
      inReserve && !isAiTurn
        ? canUnitTypeBeUsed(displayFaction, u.id)
        : inReserve;
    const isUsable =
      inReserve &&
      hasLegalMove &&
      !state.winner &&
      !isAiTurn &&
      !state.isAnimatingAi;
    const isSelected = state.selectedUnitType === u.id && isUsable;

    const card = document.createElement("button");
    card.type = "button";
    card.className = `unit-card ${isSelected ? "selected" : ""} ${!isUsable ? "disabled" : ""}`;
    card.disabled = !isUsable;

    let statusLabel = "Ready";
    if (!inReserve) {
      statusLabel = "Spent";
    } else if (!hasLegalMove && !isAiTurn) {
      statusLabel = "No Valid Moves";
    } else if (!u.isAdvanced) {
      statusLabel = "∞ Supply";
    }

    card.innerHTML = `
      ${createMiniUnitSvg(u.id, displayFaction)}
      <div class="unit-name">${u.name}</div>
      <span class="unit-tag">${u.short} • ${statusLabel}</span>
    `;

    card.addEventListener("click", () => {
      if (!isUsable) return;
      state.selectedUnitType = u.id;
      if (state.stagedHexKey) {
        const check = getHexAvailability(state.stagedHexKey);
        if (!check.canPlace) {
          state.stagedHexKey = null;
        } else {
          state.selectedRotation = check.defaultRot;
        }
      }
      renderAll();
    });

    dock.appendChild(card);
  });
}

function renderToolbar() {
  const unitBadge = document.getElementById("selectedUnitBadge");
  const hexBadge = document.getElementById("targetHexBadge");
  const rotL = document.getElementById("rotateLeftBtn");
  const rotR = document.getElementById("rotateRightBtn");
  const confirmBtn = document.getElementById("confirmMoveBtn");
  const cancelBtn = document.getElementById("cancelHexBtn");

  const spec = UNIT_TYPES[state.selectedUnitType] || UNIT_TYPES.basic;
  unitBadge.textContent = `Selected: ${spec.name}`;

  const canRotate =
    spec.rotatable &&
    !state.isAnimatingAi &&
    (state.mode === "pvp" || state.turn === "blue");
  rotL.disabled = !canRotate;
  rotR.disabled = !canRotate;

  if (state.isAnimatingAi || (state.mode === "ai" && state.turn === "red")) {
    hexBadge.textContent = "Red AI is executing move...";
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    return;
  }

  if (!state.stagedHexKey) {
    hexBadge.textContent = "Click or tap any green hex on the board to lock";
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    return;
  }

  const sim = simulateMove(
    state.turn,
    state.selectedUnitType,
    state.selectedRotation,
    state.stagedHexKey,
  );
  const coord = labelOf(state.stagedHexKey);
  if (sim.valid) {
    const detail = spec.rotatable
      ? `Aim: ${sim.laserDirs.map((d) => DIRECTIONS[d].Compass).join(",")}`
      : spec.short;
    const actionWord = sim.isSwap ? "Swap" : "Deploy";
    hexBadge.textContent = `${actionWord} @ ${coord} (${detail}): Ready.`;
    confirmBtn.disabled = false;
  } else {
    hexBadge.textContent = `${coord}: ${sim.reason}`;
    confirmBtn.disabled = true;
  }
  cancelBtn.disabled = false;
}

function renderBoard() {
  const svg = document.getElementById("hexBoard");
  svg.innerHTML = "";

  const isHumanTurn =
    !state.winner &&
    !state.isAnimatingAi &&
    (state.mode === "pvp" || state.turn === "blue");

  const previewKey = state.aiPreview
    ? state.aiPreview.key
    : isHumanTurn
      ? state.stagedHexKey || state.hoverHexKey
      : null;

  let activeSim = null;
  if (state.aiPreview) {
    activeSim = state.aiPreview.sim;
  } else if (isHumanTurn && previewKey) {
    activeSim = simulateMove(
      state.turn,
      state.selectedUnitType,
      state.selectedRotation,
      previewKey,
    );
  }

  const cutKeySet = new Set(
    activeSim ? activeSim.cutUnits.map((c) => c.key) : [],
  );
  const hitKeySet = new Set(
    activeSim ? activeSim.directHits.map((h) => h.key) : [],
  );
  const manipMap = new Map(
    activeSim ? activeSim.manipulatedKeys.map((m) => [m.key, m.tag]) : [],
  );

  // When previewing a valid move (especially Rotators, Pacifiers, or Repulsors),
  // show the resulting post-Step-1 positions/orientations on the board so the player can see the chain reaction!
  const displayCells =
    activeSim && activeSim.valid ? activeSim.simCells : state.cells;

  for (const [key, baseCell] of state.cells.entries()) {
    const cell = displayCells.get(key) || baseCell;
    const { x, y } = cubeToPixel(cell.x, cell.y, cell.z);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const availability = isHumanTurn
      ? getHexAvailability(key, state.turn, state.selectedUnitType)
      : { canPlace: false };
    const isStaged =
      (isHumanTurn && state.stagedHexKey === key) ||
      state.aiPreview?.key === key;

    const poly = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    poly.setAttribute("points", hexPolygonPoints(x, y, HEX_SIZE - 2));

    let fill = "#162033";
    if (cell.occupant?.isBase) {
      fill = cell.occupant.faction === "blue" ? "#0c2d48" : "#3b0d1e";
    } else if (availability.canPlace) {
      fill = "rgba(34, 197, 94, 0.15)";
    }

    poly.setAttribute("fill", fill);
    poly.setAttribute("stroke", "#2c3e5a");
    poly.setAttribute("stroke-width", "1.5");
    poly.setAttribute(
      "class",
      `hex-cell ${availability.canPlace ? "hex-valid" : ""} ${isStaged ? "hex-selected" : ""}`,
    );

    g.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!isHumanTurn) return;

      if (state.stagedHexKey === key) {
        const checkNow = simulateMove(
          state.turn,
          state.selectedUnitType,
          state.selectedRotation,
          key,
        );
        if (checkNow.valid) {
          commitMove(key, state.selectedRotation, state.selectedUnitType);
          return;
        }
      }

      const check = getHexAvailability(key, state.turn, state.selectedUnitType);
      if (check.canPlace) {
        state.stagedHexKey = key;
        state.hoverHexKey = null;
        state.selectedRotation = check.defaultRot;
        setLog(
          `Locked on ${labelOf(key)}. Click 'Confirm Move ✓' (or tap hex again).`,
        );
        renderAll();
      } else {
        setLog(
          `${labelOf(key)}: ${check.reason || "Not a valid connected hex."}`,
        );
      }
    });

    g.addEventListener("mouseenter", () => {
      if (!isHumanTurn || state.stagedHexKey || state.hoverHexKey === key)
        return;
      const check = getHexAvailability(key, state.turn, state.selectedUnitType);
      if (check.canPlace) {
        state.hoverHexKey = key;
        state.selectedRotation = check.defaultRot;
        renderBoard();
      }
    });

    g.appendChild(poly);

    if (state.showCoords && !cell.occupant?.isBase) {
      const coordText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      coordText.setAttribute("x", x);
      coordText.setAttribute("y", y + 21);
      coordText.setAttribute("text-anchor", "middle");
      coordText.setAttribute("fill", "rgba(148, 163, 184, 0.55)");
      coordText.setAttribute("font-size", "8");
      coordText.setAttribute("font-weight", "700");
      coordText.setAttribute("pointer-events", "none");
      coordText.textContent = labelOf(key);
      g.appendChild(coordText);
    }

    const previewUnitType = state.aiPreview
      ? state.aiPreview.unitType
      : state.selectedUnitType;
    const previewRot = state.aiPreview
      ? state.aiPreview.rot
      : state.selectedRotation;
    const previewFaction = state.aiPreview ? "red" : state.turn;

    let occToDraw = cell.occupant;
    if (previewKey === key && activeSim) {
      occToDraw = {
        faction: previewFaction,
        type: previewUnitType,
        isBase: false,
        rot: previewRot,
        isGhost: true,
        isInvalidGhost: !activeSim.valid,
      };
    } else if (
      (hitKeySet.has(key) || cutKeySet.has(key)) &&
      state.cells.get(key)?.occupant
    ) {
      // Keep destroyed unit visible underneath the HIT! / CUT! badge during preview
      occToDraw = state.cells.get(key).occupant;
    }

    if (occToDraw) drawOccupant(g, x, y, occToDraw);

    if (hitKeySet.has(key)) {
      drawBadge(g, x, y - 15, "HIT!", "#ef4444");
    } else if (cutKeySet.has(key)) {
      drawBadge(g, x, y - 15, "CUT!", "#f97316");
    } else if (manipMap.has(key)) {
      drawBadge(g, x, y - 15, manipMap.get(key), "#8b5cf6");
    }

    svg.appendChild(g);
  }

  for (const [, cell] of displayCells.entries()) {
    const occ = cell.occupant;
    if (!occ || occ.isBase) continue;
    const { x: sx, y: sy } = cubeToPixel(cell.x, cell.y, cell.z);
    const dirs = getActiveLaserDirs(occ.type, occ.rot);
    const guardColor =
      occ.faction === "blue"
        ? "rgba(56, 189, 248, 0.35)"
        : "rgba(244, 63, 94, 0.35)";

    for (const d of dirs) {
      const tKey = keyOf(
        cell.x + DIRECTIONS[d].dx,
        cell.y + DIRECTIONS[d].dy,
        cell.z + DIRECTIONS[d].dz,
      );
      const tCell = displayCells.get(tKey);
      if (!tCell) continue;
      const { x: tx, y: ty } = cubeToPixel(tCell.x, tCell.y, tCell.z);

      const sight = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      sight.setAttribute("x1", sx);
      sight.setAttribute("y1", sy);
      sight.setAttribute("x2", tx);
      sight.setAttribute("y2", ty);
      sight.setAttribute("stroke", guardColor);
      sight.setAttribute("stroke-width", "2");
      sight.setAttribute("stroke-dasharray", "2 5");
      sight.setAttribute("pointer-events", "none");
      svg.appendChild(sight);
    }
  }

  if (activeSim && previewKey) {
    const srcCell = state.cells.get(previewKey);
    const { x: sx, y: sy } = cubeToPixel(srcCell.x, srcCell.y, srcCell.z);
    const beamColor = activeSim.valid ? "#facc15" : "#ef4444";
    for (const targetKey of activeSim.laserTargetKeys) {
      const tCell = state.cells.get(targetKey);
      const { x: tx, y: ty } = cubeToPixel(tCell.x, tCell.y, tCell.z);

      const beam = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      beam.setAttribute("x1", sx);
      beam.setAttribute("y1", sy);
      beam.setAttribute("x2", tx);
      beam.setAttribute("y2", ty);
      beam.setAttribute("stroke", beamColor);
      beam.setAttribute("stroke-width", "4");
      beam.setAttribute("stroke-dasharray", "6 4");
      beam.setAttribute("pointer-events", "none");
      svg.appendChild(beam);
    }
  }
}

function drawOccupant(group, cx, cy, occ) {
  const baseColor = occ.faction === "blue" ? "#38bdf8" : "#f43f5e";
  const pieceColor = occ.isGhost
    ? occ.isInvalidGhost
      ? "#ef4444"
      : "#facc15"
    : baseColor;

  if (occ.isBase) {
    const baseRing = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    baseRing.setAttribute("cx", cx);
    baseRing.setAttribute("cy", cy);
    baseRing.setAttribute("r", 18);
    baseRing.setAttribute("fill", baseColor);
    baseRing.setAttribute("opacity", "0.28");
    baseRing.setAttribute("pointer-events", "none");
    group.appendChild(baseRing);

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", cx);
    label.setAttribute("y", cy + 4);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#ffffff");
    label.setAttribute("font-size", "9.5");
    label.setAttribute("font-weight", "800");
    label.setAttribute("pointer-events", "none");
    label.textContent = occ.faction === "blue" ? "BLUE HQ" : "RED HQ";
    group.appendChild(label);
    return;
  }

  const spec = UNIT_TYPES[occ.type];
  if (spec?.isAggressive) {
    const dirs = getActiveLaserDirs(occ.type, occ.rot);
    for (const d of dirs) {
      const angle = (Math.PI / 180) * DIRECTIONS[d].angleDeg;
      const x2 = cx + 21 * Math.cos(angle);
      const y2 = cy + 21 * Math.sin(angle);

      const ray = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      ray.setAttribute("x1", cx);
      ray.setAttribute("y1", cy);
      ray.setAttribute("x2", x2);
      ray.setAttribute("y2", y2);
      ray.setAttribute("stroke", pieceColor);
      ray.setAttribute("stroke-width", "3.5");
      ray.setAttribute("stroke-linecap", "round");
      ray.setAttribute("pointer-events", "none");
      group.appendChild(ray);
    }

    const body = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    body.setAttribute("cx", cx);
    body.setAttribute("cy", cy);
    body.setAttribute("r", occ.type === "basic" ? 9.5 : 12.5);
    body.setAttribute("fill", pieceColor);
    body.setAttribute("stroke", "#0b101b");
    body.setAttribute("stroke-width", "2.5");
    body.setAttribute("pointer-events", "none");
    group.appendChild(body);
  } else {
    // Non-Aggressive Manipulator Unit (CW, CCW, Pacifier, Repulsor)
    const body = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    body.setAttribute("cx", cx);
    body.setAttribute("cy", cy);
    body.setAttribute("r", 13);
    body.setAttribute("fill", "#0f172a");
    body.setAttribute("stroke", pieceColor);
    body.setAttribute("stroke-width", "3");
    body.setAttribute("pointer-events", "none");
    group.appendChild(body);

    const symbolMap = {
      cw: "⟳",
      ccw: "⟲",
      pacify: "☮",
      repulse: "❖",
    };
    const sym = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sym.setAttribute("x", cx);
    sym.setAttribute("y", cy + 5);
    sym.setAttribute("text-anchor", "middle");
    sym.setAttribute("fill", "#facc15");
    sym.setAttribute("font-size", "14");
    sym.setAttribute("font-weight", "800");
    sym.setAttribute("pointer-events", "none");
    sym.textContent = symbolMap[spec?.special] || "★";
    group.appendChild(sym);
  }
}

function drawBadge(group, x, y, text, bgColor) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x - 19);
  rect.setAttribute("y", y - 8);
  rect.setAttribute("width", 38);
  rect.setAttribute("height", 15);
  rect.setAttribute("rx", 4);
  rect.setAttribute("fill", bgColor);
  rect.setAttribute("pointer-events", "none");
  group.appendChild(rect);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", x);
  label.setAttribute("y", y + 3);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("fill", "#ffffff");
  label.setAttribute("font-size", "8.5");
  label.setAttribute("font-weight", "800");
  label.setAttribute("pointer-events", "none");
  label.textContent = text;
  group.appendChild(label);
}

function rotateSelected(delta) {
  if (state.isAnimatingAi || (state.mode === "ai" && state.turn === "red"))
    return;
  if (!UNIT_TYPES[state.selectedUnitType]?.rotatable) return;
  state.selectedRotation = (state.selectedRotation + delta + 6) % 6;
  renderAll();
}

document
  .getElementById("rotateLeftBtn")
  .addEventListener("click", () => rotateSelected(-1));
document
  .getElementById("rotateRightBtn")
  .addEventListener("click", () => rotateSelected(1));

document.getElementById("confirmMoveBtn").addEventListener("click", () => {
  if (
    state.stagedHexKey &&
    !state.isAnimatingAi &&
    (state.mode === "pvp" || state.turn === "blue")
  ) {
    commitMove(
      state.stagedHexKey,
      state.selectedRotation,
      state.selectedUnitType,
    );
  }
});

document.getElementById("cancelHexBtn").addEventListener("click", () => {
  if (state.isAnimatingAi) return;
  state.stagedHexKey = null;
  renderAll();
});

document.getElementById("toggleCoordsBtn").addEventListener("click", (e) => {
  state.showCoords = !state.showCoords;
  e.target.textContent = `Coords: ${state.showCoords ? "ON" : "OFF"}`;
  renderBoard();
});

document.getElementById("copyLogBtn").addEventListener("click", (e) => {
  const text = state.moveHistory.length
    ? state.moveHistory.map((m) => m.textSummary).join("\n")
    : "No moves recorded yet.";
  navigator.clipboard.writeText(text).then(() => {
    const old = e.target.textContent;
    e.target.textContent = "Copied! ✓";
    setTimeout(() => {
      e.target.textContent = old;
    }, 1500);
  });
});

document.getElementById("hexBoard").addEventListener("mouseleave", () => {
  if (state.hoverHexKey) {
    state.hoverHexKey = null;
    renderBoard();
  }
});

document.getElementById("resetGameBtn").addEventListener("click", initGame);

document.getElementById("modeAiBtn").addEventListener("click", (e) => {
  state.mode = "ai";
  e.target.classList.add("active");
  document.getElementById("modePvpBtn").classList.remove("active");
  initGame();
});

document.getElementById("modePvpBtn").addEventListener("click", (e) => {
  state.mode = "pvp";
  e.target.classList.add("active");
  document.getElementById("modeAiBtn").classList.remove("active");
  initGame();
});

const rulesModal = document.getElementById("rulesModal");
document.getElementById("howToPlayBtn").addEventListener("click", () => {
  rulesModal.style.display = "flex";
  rulesModal.classList.remove("hidden");
});
document.getElementById("closeRulesBtn").addEventListener("click", () => {
  rulesModal.style.display = "none";
  rulesModal.classList.add("hidden");
});
rulesModal.addEventListener("click", (e) => {
  if (e.target === rulesModal) {
    rulesModal.style.display = "none";
    rulesModal.classList.add("hidden");
  }
});

window.addEventListener("keydown", (e) => {
  if (state.isAnimatingAi || (state.mode === "ai" && state.turn === "red"))
    return;
  if (e.key === "q" || e.key === "Q") rotateSelected(-1);
  if (e.key === "e" || e.key === "E") rotateSelected(1);
  if (e.key === "Enter" && state.stagedHexKey) {
    commitMove(
      state.stagedHexKey,
      state.selectedRotation,
      state.selectedUnitType,
    );
  }
  if (e.key === "Escape" && state.stagedHexKey) {
    state.stagedHexKey = null;
    renderAll();
  }
});

initGame();
