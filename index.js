// Arkeon — Symmetric 31-Hex Board with Strict Line-of-Fire Guarding & AI Move Animation

const HEX_SIZE = 31;
const SQRT3 = Math.sqrt(3);

// 6 Cube Directions (0 = North, clockwise around the hex)
const DIRECTIONS = [
  { dx: 0, dy: 1, dz: -1, angleDeg: -90 }, // 0: North (Straight Up)
  { dx: 1, dy: 0, dz: -1, angleDeg: -30 }, // 1: North-East
  { dx: 1, dy: -1, dz: 0, angleDeg: 30 }, // 2: South-East
  { dx: 0, dy: -1, dz: 1, angleDeg: 90 }, // 3: South (Straight Down)
  { dx: -1, dy: 0, dz: 1, angleDeg: 150 }, // 4: South-West
  { dx: -1, dy: 1, dz: 0, angleDeg: -150 }, // 5: North-West
];

const UNIT_TYPES = {
  basic: {
    id: "basic",
    name: "Basic Striker",
    short: "1 Laser",
    isAdvanced: false,
    lasers: [0],
  },
  spear: {
    id: "spear",
    name: "Spear V",
    short: "Narrow 2-Beam",
    isAdvanced: true,
    lasers: [0, 1],
  },
  fork: {
    id: "fork",
    name: "Wide Fork",
    short: "Split 2-Beam",
    isAdvanced: true,
    lasers: [5, 1],
  },
  lancer: {
    id: "lancer",
    name: "Lancer Line",
    short: "Dual Opposing",
    isAdvanced: true,
    lasers: [0, 3],
  },
  trident: {
    id: "trident",
    name: "Trident Fan",
    short: "3-Way Front",
    isAdvanced: true,
    lasers: [5, 0, 1],
  },
  aegis: {
    id: "aegis",
    name: "Tri-Star",
    short: "3-Way Radial",
    isAdvanced: true,
    lasers: [0, 2, 4],
  },
};

const ADVANCED_IDS = ["spear", "fork", "lancer", "trident", "aegis"];
const RED_BASE_KEY = "0,3,-3";
const BLUE_BASE_KEY = "0,-3,3";

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

let state = {
  mode: "ai",
  turn: "blue",
  winner: null,
  isAnimatingAi: false,
  aiPreview: null, // Holds { targetKey, unitType, rot, sim } during AI blast animation
  cells: new Map(),
  reserves: {
    blue: { available: [...ADVANCED_IDS], spent: [] },
    red: { available: [...ADVANCED_IDS], spent: [] },
  },
  selectedUnitType: "basic",
  selectedRotation: 0,
  stagedHexKey: null,
  hoverHexKey: null,
};

function initGame() {
  state.turn = "blue";
  state.winner = null;
  state.isAnimatingAi = false;
  state.aiPreview = null;
  state.cells = new Map();

  for (const { x, y, z } of BOARD_COORDS) {
    state.cells.set(keyOf(x, y, z), { x, y, z, occupant: null });
  }

  state.cells.get(RED_BASE_KEY).occupant = {
    faction: "red",
    type: "base",
    isBase: true,
    rot: 3,
  };
  state.cells.get(BLUE_BASE_KEY).occupant = {
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
    "Match ready! Hexes pointed at by an enemy laser are guarded—flank them or upgrade a unit to strike!",
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
  if (!spec) return [];
  return spec.lasers.map((d) => (d + rot) % 6);
}

// Check if any unit of `attackerFaction` on `cellsMap` is currently pointing a laser at `targetKey`
function isHexTargetedByFaction(cellsMap, targetKey, attackerFaction) {
  const targetCell = cellsMap.get(targetKey);
  if (!targetCell) return false;

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
        return true;
      }
    }
  }
  return false;
}

function findConnectedKeys(cellsMap, faction) {
  const baseKey = faction === "blue" ? BLUE_BASE_KEY : RED_BASE_KEY;
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

function simulateMove(faction, unitType, rot, targetKey) {
  const targetCell = state.cells.get(targetKey);
  if (!targetCell) return { valid: false, reason: "Invalid hex." };

  const existing = targetCell.occupant;
  if (existing && existing.isBase)
    return { valid: false, reason: "Cannot place on a Home Base." };

  const isSwap = Boolean(existing && existing.faction === faction);
  if (existing && existing.faction !== faction) {
    return { valid: false, reason: "Hex is occupied by an enemy unit." };
  }

  if (isSwap && existing.type === unitType && existing.rot === rot) {
    return {
      valid: false,
      reason:
        "Use Rotate ⟲ / ⟳ or pick a different unit card to modify this unit.",
    };
  }

  if (
    unitType !== "basic" &&
    !state.reserves[faction].available.includes(unitType)
  ) {
    return {
      valid: false,
      reason: "That Advanced unit is not currently available.",
    };
  }

  const enemyFaction = faction === "blue" ? "red" : "blue";

  // STRICT LINE-OF-FIRE RULE:
  // You cannot deploy a unit onto a hex that is currently in the line of fire of an active enemy laser!
  if (isHexTargetedByFaction(state.cells, targetKey, enemyFaction)) {
    return {
      valid: false,
      reason:
        "Blocked! That hex is in the line of fire of an enemy laser—flank that unit first!",
    };
  }

  const hasFriendlyNeighbor = getNeighbors(
    targetCell.x,
    targetCell.y,
    targetCell.z,
  ).some((n) => n.cell.occupant && n.cell.occupant.faction === faction);
  if (!hasFriendlyNeighbor) {
    return {
      valid: false,
      reason: "Must be adjacent to your connected supply chain.",
    };
  }

  const enemyBaseKey = enemyFaction === "blue" ? BLUE_BASE_KEY : RED_BASE_KEY;
  const ownBaseKey = faction === "blue" ? BLUE_BASE_KEY : RED_BASE_KEY;

  const laserDirs = getActiveLaserDirs(unitType, rot);
  const laserTargetKeys = laserDirs
    .map((d) =>
      keyOf(
        targetCell.x + DIRECTIONS[d].dx,
        targetCell.y + DIRECTIONS[d].dy,
        targetCell.z + DIRECTIONS[d].dz,
      ),
    )
    .filter((k) => state.cells.has(k));

  const isAdjacentToEnemyBase = getNeighbors(
    targetCell.x,
    targetCell.y,
    targetCell.z,
  ).some((n) => n.key === enemyBaseKey);
  const hitsEnemyBase = laserTargetKeys.includes(enemyBaseKey);

  if (isAdjacentToEnemyBase && !hitsEnemyBase) {
    return {
      valid: false,
      reason: "Units next to Enemy HQ must aim a laser directly at Enemy HQ!",
    };
  }

  if (laserTargetKeys.includes(ownBaseKey)) {
    return {
      valid: false,
      reason: "Cannot fire a laser at your own Home Base!",
    };
  }

  const simCells = cloneCells(state.cells);
  simCells.get(targetKey).occupant = {
    faction,
    type: unitType,
    isBase: false,
    rot,
  };

  const directHits = [];
  for (const hitKey of laserTargetKeys) {
    if (hitKey === enemyBaseKey) continue;
    const occ = simCells.get(hitKey)?.occupant;
    if (occ && !occ.isBase) {
      directHits.push({ key: hitKey, occupant: { ...occ } });
      simCells.get(hitKey).occupant = null;
    }
  }

  const ownConnected = findConnectedKeys(simCells, faction);
  if (!ownConnected.has(targetKey)) {
    return {
      valid: false,
      reason:
        "Illegal orientation: unit would sever its own supply line to Base!",
    };
  }

  const enemyConnected = findConnectedKeys(simCells, enemyFaction);
  const cutUnits = [];

  for (const [k, cell] of simCells.entries()) {
    if (!cell.occupant || cell.occupant.isBase) continue;
    const occFaction = cell.occupant.faction;
    const connectedSet = occFaction === faction ? ownConnected : enemyConnected;
    if (!connectedSet.has(k)) {
      cutUnits.push({ key: k, occupant: { ...cell.occupant } });
      cell.occupant = null;
    }
  }

  return {
    valid: true,
    isSwap,
    previousOccupant: existing ? { ...existing } : null,
    laserTargetKeys,
    directHits,
    cutUnits,
    hitsEnemyBase,
    simCells,
  };
}

function getHexAvailability(targetKey) {
  const preferredRot = state.selectedRotation;
  const currentSim = simulateMove(
    state.turn,
    state.selectedUnitType,
    preferredRot,
    targetKey,
  );
  if (currentSim.valid) {
    return { canPlace: true, defaultRot: preferredRot, sim: currentSim };
  }
  for (let offset = 1; offset < 6; offset++) {
    const r = (preferredRot + offset) % 6;
    const trySim = simulateMove(
      state.turn,
      state.selectedUnitType,
      r,
      targetKey,
    );
    if (trySim.valid) {
      return { canPlace: true, defaultRot: r, sim: trySim };
    }
  }
  return { canPlace: false, reason: currentSim.reason };
}

function handleDestroyedUnit(faction, unitType) {
  if (!UNIT_TYPES[unitType]?.isAdvanced) return;
  const pool = state.reserves[faction];
  if (!pool.spent.includes(unitType)) pool.spent.push(unitType);
  if (pool.spent.length >= 5) {
    pool.available = [...ADVANCED_IDS];
    pool.spent = [];
  }
}

function commitMove(targetKey, rot) {
  if (state.winner) return;
  const faction = state.turn;
  const unitType = state.selectedUnitType;
  const sim = simulateMove(faction, unitType, rot, targetKey);

  if (!sim.valid) {
    setLog(sim.reason);
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

  for (const hit of sim.directHits)
    handleDestroyedUnit(hit.occupant.faction, hit.occupant.type);
  for (const cut of sim.cutUnits)
    handleDestroyedUnit(cut.occupant.faction, cut.occupant.type);

  state.cells = sim.simCells;
  state.stagedHexKey = null;
  state.hoverHexKey = null;
  state.aiPreview = null;
  state.isAnimatingAi = false;

  const enemyFaction = faction === "blue" ? "red" : "blue";

  if (sim.hitsEnemyBase) {
    state.winner = faction;
    setLog(
      `${faction.toUpperCase()} WINS! Direct laser strike on ${enemyFaction.toUpperCase()} HQ!`,
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
      `${faction.toUpperCase()} WINS! All ${enemyFaction.toUpperCase()} units were eliminated!`,
    );
    renderAll();
    return;
  }

  state.turn = enemyFaction;
  state.selectedUnitType = "basic";
  state.selectedRotation = state.turn === "blue" ? 0 : 3;

  const actionLabel = sim.isSwap ? "updated" : "deployed";
  const hitCount = sim.directHits.length;
  const cutCount = sim.cutUnits.length;
  let detailMsg = ".";
  if (hitCount > 0 || cutCount > 0) {
    const parts = [];
    if (hitCount > 0)
      parts.push(`${hitCount} direct hit${hitCount > 1 ? "s" : ""}`);
    if (cutCount > 0) parts.push(`${cutCount} isolated by supply cut`);
    detailMsg = ` (${parts.join(" + ")}!).`;
  }

  setLog(
    `${faction.toUpperCase()} ${actionLabel} ${UNIT_TYPES[unitType].name}${detailMsg}`,
  );
  renderAll();

  if (state.mode === "ai" && state.turn === "red" && !state.winner) {
    state.isAnimatingAi = true;
    setTimeout(runAiTurn, 450);
  }
}

function runAiTurn() {
  if (state.winner || state.turn !== "red") return;

  const candidateTypes = ["basic", ...state.reserves.red.available];
  let bestMove = null;
  let bestScore = -9999;

  for (const uType of candidateTypes) {
    for (const [k, cell] of state.cells.entries()) {
      for (let rot = 0; rot < 6; rot++) {
        const sim = simulateMove("red", uType, rot, k);
        if (!sim.valid) continue;

        if (
          sim.isSwap &&
          sim.previousOccupant.type === uType &&
          sim.directHits.length === 0 &&
          !sim.hitsEnemyBase
        ) {
          continue;
        }

        let score = 0;
        if (sim.hitsEnemyBase) score += 10000;

        for (const h of sim.directHits)
          score += h.occupant.faction === "blue" ? 42 : -38;
        for (const c of sim.cutUnits)
          score += c.occupant.faction === "blue" ? 60 : -55;

        score += (cell.z - cell.y) * 3;

        if (
          uType !== "basic" &&
          sim.directHits.length === 0 &&
          !sim.hitsEnemyBase
        ) {
          score -= 10;
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
    setLog("BLUE WINS! Red AI is completely encircled and has no legal moves.");
    renderAll();
    return;
  }

  // Show a 1.1-second visual preview of the AI's placement, lasers, HIT! and CUT! badges before applying!
  state.selectedUnitType = bestMove.unitType;
  state.selectedRotation = bestMove.rot;
  state.aiPreview = bestMove;
  setLog(`Red AI is deploying ${UNIT_TYPES[bestMove.unitType].name}...`);
  renderAll();

  setTimeout(() => {
    commitMove(bestMove.key, bestMove.rot);
  }, 1100);
}

function setLog(msg) {
  const el = document.getElementById("combatLog");
  if (el) el.textContent = msg;
}

function renderAll() {
  renderTurnBanner();
  renderScoreboard();
  renderUnitDock();
  renderBoard();
  renderToolbar();
}

function renderTurnBanner() {
  const banner = document.getElementById("turnBanner");
  const title = document.getElementById("turnTitle");
  const hint = document.getElementById("turnStepHint");

  banner.className = `turn-banner ${state.turn === "red" ? "red-turn" : "blue-turn"}`;

  if (state.winner) {
    title.textContent = `🏆 ${state.winner.toUpperCase()} VICTORY!`;
    hint.textContent = "Click 'New Match' in the top bar to play again.";
    return;
  }

  if (state.mode === "ai" && state.turn === "red") {
    title.textContent = "RED AI EXECUTING MOVE...";
    hint.textContent = "Watch the board for Red's laser fire and supply cuts.";
    return;
  }

  title.textContent = `${state.turn.toUpperCase()} COMMANDER'S TURN`;
  hint.textContent = !state.stagedHexKey
    ? "Step 1: Pick a unit card. Step 2: Click/tap any green dashed hex on the board."
    : "Target locked! Use Rotate ⟲ / ⟳ to aim lasers, then click 'Confirm Move ✓'.";
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
}

function createMiniUnitSvg(unitId, faction) {
  const color = faction === "red" ? "#f43f5e" : "#38bdf8";
  const rot = faction === "red" ? 3 : 0;
  const dirs = getActiveLaserDirs(unitId, rot);

  let rays = "";
  for (const d of dirs) {
    const angle = (Math.PI / 180) * DIRECTIONS[d].angleDeg;
    const x2 = (27 + 20 * Math.cos(angle)).toFixed(1);
    const y2 = (27 + 20 * Math.sin(angle)).toFixed(1);
    rays += `<line x1="27" y1="27" x2="${x2}" y2="${y2}" stroke="#facc15" stroke-width="3" stroke-linecap="round" />`;
  }

  return `
    <svg class="unit-mini-svg" viewBox="0 0 54 54">
      <polygon points="${hexPolygonPoints(27, 27, 22)}" fill="#0f172a" stroke="${color}" stroke-width="2" />
      ${rays}
      <circle cx="27" cy="27" r="7" fill="${color}" />
    </svg>
  `;
}

function renderUnitDock() {
  const dock = document.getElementById("unitDock");
  dock.innerHTML = "";

  const activeFaction = state.turn;
  const availableAdv = state.reserves[activeFaction].available;

  Object.values(UNIT_TYPES).forEach((u) => {
    const isAvailable = !u.isAdvanced || availableAdv.includes(u.id);
    const isSelected = state.selectedUnitType === u.id;

    const card = document.createElement("button");
    card.type = "button";
    card.className = `unit-card ${isSelected ? "selected" : ""} ${!isAvailable ? "disabled" : ""}`;
    card.disabled =
      !isAvailable || Boolean(state.winner) || state.isAnimatingAi;

    const statusLabel = !u.isAdvanced
      ? "∞ Supply"
      : isAvailable
        ? "Ready"
        : "Spent";

    card.innerHTML = `
      ${createMiniUnitSvg(u.id, activeFaction)}
      <div class="unit-name">${u.name}</div>
      <span class="unit-tag">${u.short} • ${statusLabel}</span>
    `;

    card.addEventListener("click", () => {
      if (!isAvailable || state.winner || state.isAnimatingAi) return;
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
  const confirmBtn = document.getElementById("confirmMoveBtn");
  const cancelBtn = document.getElementById("cancelHexBtn");

  const unitName = UNIT_TYPES[state.selectedUnitType]?.name || "Basic Striker";
  unitBadge.textContent = `Selected: ${unitName}`;

  if (state.isAnimatingAi) {
    hexBadge.textContent = "Red AI is firing...";
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    return;
  }

  if (!state.stagedHexKey) {
    hexBadge.textContent = "Click/tap any green hex on the board to lock";
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
  if (sim.valid) {
    const actionWord = sim.isSwap ? "Update Unit" : "Deploy Unit";
    hexBadge.textContent = `Target Locked — ${actionWord} Ready!`;
    confirmBtn.disabled = false;
  } else {
    hexBadge.textContent = sim.reason;
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
    : state.stagedHexKey || state.hoverHexKey;

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
    activeSim?.valid ? activeSim.cutUnits.map((c) => c.key) : [],
  );
  const hitKeySet = new Set(
    activeSim?.valid ? activeSim.directHits.map((h) => h.key) : [],
  );

  for (const [key, cell] of state.cells.entries()) {
    const { x, y } = cubeToPixel(cell.x, cell.y, cell.z);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const availability = isHumanTurn
      ? getHexAvailability(key)
      : { canPlace: false };
    const isStaged = state.stagedHexKey === key || state.aiPreview?.key === key;

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
          commitMove(key, state.selectedRotation);
          return;
        }
      }

      const check = getHexAvailability(key);
      if (check.canPlace) {
        state.stagedHexKey = key;
        state.hoverHexKey = null;
        state.selectedRotation = check.defaultRot;
        setLog(
          "Target locked! Use 'Rotate ⟲ / ⟳' to aim lasers, then click 'Confirm Move ✓' (or tap hex again).",
        );
        renderAll();
      } else {
        setLog(
          check.reason ||
            "Choose a highlighted green hex connected to your supply line.",
        );
      }
    });

    g.addEventListener("mouseenter", () => {
      if (!isHumanTurn || state.stagedHexKey || state.hoverHexKey === key)
        return;
      const check = getHexAvailability(key);
      if (check.canPlace) {
        state.hoverHexKey = key;
        state.selectedRotation = check.defaultRot;
        renderBoard();
      }
    });

    g.appendChild(poly);

    const occToDraw =
      previewKey === key && activeSim?.valid
        ? {
            faction: state.turn,
            type: state.selectedUnitType,
            isBase: false,
            rot: state.selectedRotation,
            isGhost: true,
          }
        : cell.occupant;

    if (occToDraw) drawOccupant(g, x, y, occToDraw);

    if (hitKeySet.has(key)) {
      drawBadge(g, x, y - 15, "HIT!", "#ef4444");
    } else if (cutKeySet.has(key)) {
      drawBadge(g, x, y - 15, "CUT!", "#f97316");
    }

    svg.appendChild(g);
  }

  // Draw subtle guarded-hex sight lines for all existing units on the board
  for (const [key, cell] of state.cells.entries()) {
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
      const tCell = state.cells.get(tKey);
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

  // Draw active preview laser beams
  if (activeSim?.valid && previewKey) {
    const srcCell = state.cells.get(previewKey);
    const { x: sx, y: sy } = cubeToPixel(srcCell.x, srcCell.y, srcCell.z);
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
      beam.setAttribute("stroke", "#facc15");
      beam.setAttribute("stroke-width", "4");
      beam.setAttribute("stroke-dasharray", "6 4");
      beam.setAttribute("pointer-events", "none");
      svg.appendChild(beam);
    }
  }
}

function drawOccupant(group, cx, cy, occ) {
  const color = occ.faction === "blue" ? "#38bdf8" : "#f43f5e";

  if (occ.isBase) {
    const baseRing = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    baseRing.setAttribute("cx", cx);
    baseRing.setAttribute("cy", cy);
    baseRing.setAttribute("r", 18);
    baseRing.setAttribute("fill", color);
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

  const dirs = getActiveLaserDirs(occ.type, occ.rot);
  for (const d of dirs) {
    const angle = (Math.PI / 180) * DIRECTIONS[d].angleDeg;
    const x2 = cx + 21 * Math.cos(angle);
    const y2 = cy + 21 * Math.sin(angle);

    const ray = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ray.setAttribute("x1", cx);
    ray.setAttribute("y1", cy);
    ray.setAttribute("x2", x2);
    ray.setAttribute("y2", y2);
    ray.setAttribute("stroke", occ.isGhost ? "#facc15" : color);
    ray.setAttribute("stroke-width", "3.5");
    ray.setAttribute("stroke-linecap", "round");
    ray.setAttribute("pointer-events", "none");
    group.appendChild(ray);
  }

  const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  body.setAttribute("cx", cx);
  body.setAttribute("cy", cy);
  body.setAttribute("r", occ.type === "basic" ? 9.5 : 12.5);
  body.setAttribute("fill", occ.isGhost ? "#facc15" : color);
  body.setAttribute("stroke", "#0b101b");
  body.setAttribute("stroke-width", "2.5");
  body.setAttribute("pointer-events", "none");
  group.appendChild(body);
}

function drawBadge(group, x, y, text, bgColor) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x - 18);
  rect.setAttribute("y", y - 8);
  rect.setAttribute("width", 36);
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
  label.setAttribute("font-size", "9");
  label.setAttribute("font-weight", "800");
  label.setAttribute("pointer-events", "none");
  label.textContent = text;
  group.appendChild(label);
}

function rotateSelected(delta) {
  if (state.isAnimatingAi) return;
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
  if (state.stagedHexKey && !state.isAnimatingAi) {
    commitMove(state.stagedHexKey, state.selectedRotation);
  }
});

document.getElementById("cancelHexBtn").addEventListener("click", () => {
  if (state.isAnimatingAi) return;
  state.stagedHexKey = null;
  renderAll();
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
document
  .getElementById("howToPlayBtn")
  .addEventListener("click", () => rulesModal.classList.remove("hidden"));
document
  .getElementById("closeRulesBtn")
  .addEventListener("click", () => rulesModal.classList.add("hidden"));
rulesModal.addEventListener("click", (e) => {
  if (e.target === rulesModal) rulesModal.classList.add("hidden");
});

window.addEventListener("keydown", (e) => {
  if (state.isAnimatingAi) return;
  if (e.key === "q" || e.key === "Q") rotateSelected(-1);
  if (e.key === "e" || e.key === "E") rotateSelected(1);
  if (e.key === "Enter" && state.stagedHexKey)
    commitMove(state.stagedHexKey, state.selectedRotation);
  if (e.key === "Escape" && state.stagedHexKey) {
    state.stagedHexKey = null;
    renderAll();
  }
});

initGame();
