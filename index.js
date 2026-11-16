// Arkeon — Complete Hexagonal Strategy Engine (Touch, Tablet & Desktop Adaptive)

const HEX_SIZE = 34;
const SQRT3 = Math.sqrt(3);

// 6 Axial Hex Directions (Pointy-Top, 0 = North-East, clockwise)
const DIRECTIONS = [
  { dq: 1, dr: -1 }, // 0: NE
  { dq: 1, dr: 0 },  // 1: E
  { dq: 0, dr: 1 },  // 2: SE
  { dq: -1, dr: 1 }, // 3: SW
  { dq: -1, dr: 0 }, // 4: W
  { dq: 0, dr: -1 }  // 5: NW
];

// Unit Definitions: Basic (infinite) + 5 Advanced Units
const UNIT_TYPES = {
  basic: {
    id: "basic",
    name: "Basic Striker",
    short: "1 Laser",
    isAdvanced: false,
    lasers: [0]
  },
  spear: {
    id: "spear",
    name: "Spear V",
    short: "Narrow 2-Beam",
    isAdvanced: true,
    lasers: [0, 1]
  },
  fork: {
    id: "fork",
    name: "Wide Fork",
    short: "Split 2-Beam",
    isAdvanced: true,
    lasers: [5, 1]
  },
  lancer: {
    id: "lancer",
    name: "Lancer Line",
    short: "Dual Opposing",
    isAdvanced: true,
    lasers: [0, 3]
  },
  trident: {
    id: "trident",
    name: "Trident Fan",
    short: "3-Way Front",
    isAdvanced: true,
    lasers: [5, 0, 1]
  },
  aegis: {
    id: "aegis",
    name: "Tri-Star",
    short: "3-Way Radial",
    isAdvanced: true,
    lasers: [0, 2, 4]
  }
};

const ADVANCED_IDS = ["spear", "fork", "lancer", "trident", "aegis"];

// Build the 31-Hex Arena (29 Playable Hexes + 2 Home Bases at (0,-3) and (0,3))
function generateBoardCoords() {
  const coords = [];
  for (let r = -3; r <= 3; r++) {
    for (let q = -3; q <= 3; q++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= 3) {
        // Trim the 6 outer left/right corners on rows r = -3 and r = 3 so bases sit at (0,-3) and (0,3)
        if (Math.abs(r) === 3 && q !== 0) continue;
        coords.push({ q, r });
      }
    }
  }
  return coords;
}

const BOARD_COORDS = generateBoardCoords();

function keyOf(q, r) {
  return `${q},${r}`;
}

function axialToPixel(q, r) {
  const x = HEX_SIZE * SQRT3 * (q + r / 2);
  const y = HEX_SIZE * 1.5 * r;
  return { x, y };
}

function hexPolygonPoints(cx, cy, radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Game State
let state = {
  mode: "ai", // "ai" or "pvp"
  turn: "blue",
  winner: null,
  cells: new Map(),
  reserves: {
    blue: { available: [...ADVANCED_IDS], spent: [] },
    red: { available: [...ADVANCED_IDS], spent: [] }
  },
  selectedUnitType: "basic",
  selectedRotation: 0, // 0..5
  stagedHexKey: null,  // Currently tapped/selected board hex for preview & rotation
  hoverHexKey: null
};

function initGame() {
  state.turn = "blue";
  state.winner = null;
  state.cells = new Map();

  for (const { q, r } of BOARD_COORDS) {
    state.cells.set(keyOf(q, r), { q, r, occupant: null });
  }

  // Place Red Base at (0, -3) and Blue Base at (0, 3)
  state.cells.get("0,-3").occupant = { faction: "red", type: "base", isBase: true, rot: 2 };
  state.cells.get("0,3").occupant = { faction: "blue", type: "base", isBase: true, rot: 5 };

  // Starting 3 Basic Units for Red (facing South-East / South-West toward center)
  [
    { q: -1, r: -2, rot: 2 },
    { q: 0, r: -2, rot: 2 },
    { q: 1, r: -2, rot: 3 }
  ].forEach((u) => {
    state.cells.get(keyOf(u.q, u.r)).occupant = {
      faction: "red",
      type: "basic",
      isBase: false,
      rot: u.rot
    };
  });

  // Starting 3 Basic Units for Blue (facing North-East / North-West toward center)
  [
    { q: -1, r: 2, rot: 0 },
    { q: 0, r: 2, rot: 5 },
    { q: 1, r: 2, rot: 5 }
  ].forEach((u) => {
    state.cells.get(keyOf(u.q, u.r)).occupant = {
      faction: "blue",
      type: "basic",
      isBase: false,
      rot: u.rot
    };
  });

  state.reserves = {
    blue: { available: [...ADVANCED_IDS], spent: [] },
    red: { available: [...ADVANCED_IDS], spent: [] }
  };

  state.selectedUnitType = "basic";
  state.selectedRotation = 5; // Default Blue facing upward
  state.stagedHexKey = null;
  state.hoverHexKey = null;

  setLog("Match ready! Step 1: Pick a unit card. Step 2: Tap any green hex on the board to preview & rotate.");
  renderAll();
}

function cloneCells(cellsMap) {
  const copy = new Map();
  for (const [k, v] of cellsMap.entries()) {
    copy.set(k, {
      q: v.q,
      r: v.r,
      occupant: v.occupant ? { ...v.occupant } : null
    });
  }
  return copy;
}

function getNeighbors(q, r, cellsMap = state.cells) {
  const list = [];
  for (let dir = 0; dir < 6; dir++) {
    const nq = q + DIRECTIONS[dir].dq;
    const nr = r + DIRECTIONS[dir].dr;
    const cell = cellsMap.get(keyOf(nq, nr));
    if (cell) list.push({ dir, key: keyOf(nq, nr), cell });
  }
  return list;
}

function getActiveLaserDirs(unitType, rot) {
  const spec = UNIT_TYPES[unitType];
  if (!spec) return [];
  return spec.lasers.map((d) => (d + rot) % 6);
}

// Breadth-First Search (BFS) from each faction's Home Base
function findConnectedKeys(cellsMap, faction) {
  const baseKey = faction === "blue" ? "0,3" : "0,-3";
  const baseCell = cellsMap.get(baseKey);
  const visited = new Set();
  if (!baseCell || !baseCell.occupant || baseCell.occupant.faction !== faction) {
    return visited;
  }

  const queue = [baseKey];
  visited.add(baseKey);

  while (queue.length > 0) {
    const currKey = queue.shift();
    const curr = cellsMap.get(currKey);
    for (const { key, cell } of getNeighbors(curr.q, curr.r, cellsMap)) {
      if (!visited.has(key) && cell.occupant && cell.occupant.faction === faction) {
        visited.add(key);
        queue.push(key);
      }
    }
  }
  return visited;
}

// Simulate placing/swapping (faction, unitType, rot) on targetKey
function simulateMove(faction, unitType, rot, targetKey) {
  const targetCell = state.cells.get(targetKey);
  if (!targetCell) return { valid: false, reason: "Invalid hex." };

  const existing = targetCell.occupant;
  if (existing && existing.isBase) {
    return { valid: false, reason: "Cannot place on a Home Base." };
  }

  // Must be either empty (Deploy) or occupied by own non-base unit (Upgrade/Downgrade Swap)
  const isSwap = Boolean(existing && existing.faction === faction);
  if (existing && existing.faction !== faction) {
    return { valid: false, reason: "Hex is occupied by an enemy unit." };
  }

  if (isSwap && existing.type === unitType) {
    return { valid: false, reason: "Select a different unit type to swap/upgrade/downgrade." };
  }

  // Check unit availability in reserve
  if ( unitType !== "basic" && !state.reserves[faction].available.includes(unitType) ) {
    return { valid: false, reason: "That Advanced unit is not currently available." };
  }

  // Check adjacency to at least one friendly piece before placement
  const hasFriendlyNeighbor = getNeighbors(targetCell.q, targetCell.r).some(
    (n) => n.cell.occupant && n.cell.occupant.faction === faction
  );
  if (!hasFriendlyNeighbor) {
    return { valid: false, reason: "Must be placed adjacent to your connected supply chain." };
  }

  // Enemy Base Adjacency Restriction:
  // Cannot place adjacent to Enemy Base UNLESS pointing a laser directly at the Enemy Base
  const enemyFaction = faction === "blue" ? "red" : "blue";
  const enemyBaseKey = enemyFaction === "blue" ? "0,3" : "0,-3";
  const laserDirs = getActiveLaserDirs(unitType, rot);
  const laserTargetKeys = laserDirs
    .map((d) => keyOf(targetCell.q + DIRECTIONS[d].dq, targetCell.r + DIRECTIONS[d].dr))
    .filter((k) => state.cells.has(k));

  const isAdjacentToEnemyBase = getNeighbors(targetCell.q, targetCell.r).some(
    (n) => n.key === enemyBaseKey
  );
  const hitsEnemyBase = laserTargetKeys.includes(enemyBaseKey);

  if (isAdjacentToEnemyBase && !hitsEnemyBase) {
    return {
      valid: false,
      reason: "Units adjacent to the Enemy Base must aim a laser at the Base!"
    };
  }

  // Clone board and execute placement + laser hits
  const simCells = cloneCells(state.cells);
  simCells.get(targetKey).occupant = {
    faction,
    type: unitType,
    isBase: false,
    rot
  };

  // Never allow firing at your own Home Base
  const ownBaseKey = faction === "blue" ? "0,3" : "0,-3";
  if (laserTargetKeys.includes(ownBaseKey)) {
    return { valid: false, reason: "Cannot fire a laser at your own Home Base!" };
  }

  const directHits = [];
  for (const hitKey of laserTargetKeys) {
    if (hitKey === enemyBaseKey) continue; // Base hit wins immediately
    const occ = simCells.get(hitKey)?.occupant;
    if (occ && !occ.isBase) {
      directHits.push({ key: hitKey, occupant: { ...occ } });
      simCells.get(hitKey).occupant = null;
    }
  }

  // Check if newly placed unit still has a valid supply line to its own base after firing
  const ownConnected = findConnectedKeys(simCells, faction);
  if (!ownConnected.has(targetKey)) {
    return {
      valid: false,
      reason: "Illegal move: unit would be disconnected from your Home Base!"
    };
  }

  // Find isolated units (CUT!) for both factions
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
    simCells
  };
}

// Check if a hex is valid for ANY rotation of the currently selected unit
function getHexAvailability(targetKey) {
  const currentSim = simulateMove(
    state.turn,
    state.selectedUnitType,
    state.selectedRotation,
    targetKey
  );
  if (currentSim.valid) {
    return { canPlace: true, defaultRot: state.selectedRotation, sim: currentSim };
  }

  for (let r = 0; r < 6; r++) {
    const trySim = simulateMove(state.turn, state.selectedUnitType, r, targetKey);
    if (trySim.valid) {
      return { canPlace: true, defaultRot: r, sim: trySim };
    }
  }
  return { canPlace: false, reason: currentSim.reason };
}

function handleDestroyedUnit(faction, unitType) {
  if (!UNIT_TYPES[unitType]?.isAdvanced) return;
  const pool = state.reserves[faction];
  if (!pool.spent.includes(unitType)) {
    pool.spent.push(unitType);
  }
  // 5-Unit Graveyard Refresh Rule: once all 5 Advanced units are destroyed, all 5 refresh!
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

  // Update reserve pools for Deploy or Upgrade/Downgrade Swap
  const pool = state.reserves[faction];
  if (unitType !== "basic") {
    pool.available = pool.available.filter((id) => id !== unitType);
  }

  // If swapping out an existing Advanced unit on the board (Downgrade/Swap), return it to hand!
  if (sim.isSwap && sim.previousOccupant && sim.previousOccupant.type !== "basic") {
    if (!pool.available.includes(sim.previousOccupant.type)) {
      pool.available.push(sim.previousOccupant.type);
    }
  }

  // Process destroyed units (direct hits + supply-line cuts)
  for (const hit of sim.directHits) {
    handleDestroyedUnit(hit.occupant.faction, hit.occupant.type);
  }
  for (const cut of sim.cutUnits) {
    handleDestroyedUnit(cut.occupant.faction, cut.occupant.type);
  }

  state.cells = sim.simCells;
  state.stagedHexKey = null;

  const enemyFaction = faction === "blue" ? "red" : "blue";

  // Check Victory Conditions
  if (sim.hitsEnemyBase) {
    state.winner = faction;
    setLog(`${faction.toUpperCase()} WINS! Direct laser strike on the ${enemyFaction.toUpperCase()} Home Base!`);
    renderAll();
    return;
  }

  const remainingEnemyUnits = Array.from(state.cells.values()).filter(
    (c) => c.occupant && c.occupant.faction === enemyFaction && !c.occupant.isBase
  ).length;

  if (remainingEnemyUnits === 0) {
    state.winner = faction;
    setLog(`${faction.toUpperCase()} WINS! All ${enemyFaction.toUpperCase()} forces were eliminated!`);
    renderAll();
    return;
  }

  // Switch Turn
  state.turn = enemyFaction;
  state.selectedUnitType = "basic";
  state.selectedRotation = state.turn === "blue" ? 5 : 2;

  const actionLabel = sim.isSwap ? "swapped in" : "deployed";
  const casualties = sim.directHits.length + sim.cutUnits.length;
  setLog(
    `${faction.toUpperCase()} ${actionLabel} ${UNIT_TYPES[unitType].name}` +
      (casualties > 0 ? ` (${casualties} unit${casualties > 1 ? "s" : ""} eliminated).` : ".")
  );

  renderAll();

  if (state.mode === "ai" && state.turn === "red" && !state.winner) {
    setTimeout(runAiTurn, 550);
  }
}

// Heuristic AI for Red Faction
function runAiTurn() {
  if (state.winner || state.turn !== "red") return;

  const candidateTypes = ["basic", ...state.reserves.red.available];
  let bestMove = null;
  let bestScore = -9999;

  for (const uType of candidateTypes) {
    for (const [k] of state.cells.entries()) {
      for (let rot = 0; rot < 6; rot++) {
        const sim = simulateMove("red", uType, rot, k);
        if (!sim.valid) continue;

        let score = 0;
        if (sim.hitsEnemyBase) score += 10000;

        for (const h of sim.directHits) {
          score += h.occupant.faction === "blue" ? 38 : -32;
        }
        for (const c of sim.cutUnits) {
          score += c.occupant.faction === "blue" ? 55 : -50;
        }

        const cell = state.cells.get(k);
        // Encourage advancing toward Blue Base at (0, 3)
        score += (cell.r + 3) * 4;

        // Slightly conserve advanced units unless they score hits
        if (uType !== "basic" && sim.directHits.length === 0 && !sim.hitsEnemyBase) {
          score -= 8;
        }

        // Small random tie-breaker
        score += Math.random() * 3;

        if (score > bestScore) {
          bestScore = score;
          bestMove = { key: k, unitType: uType, rot };
        }
      }
    }
  }

  if (!bestMove) {
    state.winner = "blue";
    setLog("BLUE WINS! Red AI has no legal moves remaining.");
    renderAll();
    return;
  }

  state.selectedUnitType = bestMove.unitType;
  state.selectedRotation = bestMove.rot;
  commitMove(bestMove.key, bestMove.rot);
}

// UI Rendering
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
    hint.textContent = "Tap 'New Match' in the top bar to play again.";
    return;
  }

  if (state.mode === "ai" && state.turn === "red") {
    title.textContent = "RED AI THINKING...";
    hint.textContent = "Calculating supply lines and laser trajectories...";
    return;
  }

  title.textContent = `${state.turn.toUpperCase()} COMMANDER'S TURN`;
  if (!state.stagedHexKey) {
    hint.textContent =
      "Step 1: Pick a unit card from your Arsenal. Step 2: Tap any green hex on the board.";
  } else {
    hint.textContent =
      "Step 3: Use Rotate ⟲ / ⟳ to aim lasers, then tap 'Confirm Move ✓' (or tap the hex again).";
  }
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
  document.getElementById("blueAdvCount").textContent = `${state.reserves.blue.available.length}/5`;
  document.getElementById("redAdvCount").textContent = `${state.reserves.red.available.length}/5`;

  const blueSpentNames = state.reserves.blue.spent.map((id) => UNIT_TYPES[id].name).join(", ");
  const redSpentNames = state.reserves.red.spent.map((id) => UNIT_TYPES[id].name).join(", ");
  document.getElementById("blueGraveyard").textContent = `Spent Adv (${state.reserves.blue.spent.length}/5): ${blueSpentNames || "None"}`;
  document.getElementById("redGraveyard").textContent = `Spent Adv (${state.reserves.red.spent.length}/5): ${redSpentNames || "None"}`;
  document.getElementById("redFactionLabel").textContent =
    state.mode === "ai" ? "Red Faction (AI)" : "Red Faction (Player 2)";
}

function createMiniUnitSvg(unitId, faction) {
  const spec = UNIT_TYPES[unitId];
  const color = faction === "red" ? "#f43f5e" : "#38bdf8";
  const rot = faction === "red" ? 2 : 5;
  const dirs = getActiveLaserDirs(unitId, rot);

  let rays = "";
  for (const d of dirs) {
    const angle = (Math.PI / 180) * (60 * d - 30);
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
    card.disabled = !isAvailable || Boolean(state.winner);

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
      if (!isAvailable || state.winner) return;
      state.selectedUnitType = u.id;
      // Re-validate staged hex if one is selected
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

  if (!state.stagedHexKey) {
    hexBadge.textContent = "Tap any green hex on the board to aim";
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    return;
  }

  const sim = simulateMove(state.turn, state.selectedUnitType, state.selectedRotation, state.stagedHexKey);
  if (sim.valid) {
    const actionWord = sim.isSwap ? "Swap Unit" : "Deploy Unit";
    hexBadge.textContent = `${actionWord} at (${state.stagedHexKey}) — Ready!`;
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

  const isHumanTurn = !state.winner && (state.mode === "pvp" || state.turn === "blue");
  const previewKey = state.stagedHexKey || state.hoverHexKey;
  let activeSim = null;

  if (isHumanTurn && previewKey) {
    activeSim = simulateMove(state.turn, state.selectedUnitType, state.selectedRotation, previewKey);
  }

  const cutKeySet = new Set(activeSim?.valid ? activeSim.cutUnits.map((c) => c.key) : []);
  const hitKeySet = new Set(activeSim?.valid ? activeSim.directHits.map((h) => h.key) : []);

  // 1. Render Hex Cells & Pieces
  for (const [key, cell] of state.cells.entries()) {
    const { x, y } = axialToPixel(cell.q, cell.r);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const availability = isHumanTurn ? getHexAvailability(key) : { canPlace: false };
    const isStaged = state.stagedHexKey === key;

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", hexPolygonPoints(x, y, HEX_SIZE - 2));

    let fill = "#162033";
    if (cell.occupant?.isBase) {
      fill = cell.occupant.faction === "blue" ? "#0c2d48" : "#3b0d1e";
    } else if (availability.canPlace) {
      fill = "rgba(34, 197, 94, 0.13)";
    }

    poly.setAttribute("fill", fill);
    poly.setAttribute("stroke", "#2c3e5a");
    poly.setAttribute("stroke-width", "1.5");
    poly.setAttribute(
      "class",
      `hex-cell ${availability.canPlace ? "hex-valid" : ""} ${isStaged ? "hex-selected" : ""}`
    );

    // Click / Tap Interaction:
    // 1st Tap on a valid hex -> stages the piece there so user can see lasers & rotate
    // 2nd Tap on the SAME staged hex -> confirms the move
    g.addEventListener("click", () => {
      if (!isHumanTurn) return;

      if (state.stagedHexKey === key) {
        const checkNow = simulateMove(state.turn, state.selectedUnitType, state.selectedRotation, key);
        if (checkNow.valid) {
          commitMove(key, state.selectedRotation);
          return;
        }
      }

      const check = getHexAvailability(key);
      if (check.canPlace) {
        state.stagedHexKey = key;
        state.selectedRotation = check.defaultRot;
        setLog("Hex selected! Use 'Rotate ⟲ / ⟳' to aim lasers, then tap 'Confirm Move ✓' (or tap hex again).");
        renderAll();
      } else {
        setLog(check.reason || "Choose a highlighted green hex connected to your supply line.");
      }
    });

    // Desktop hover preview when no hex is locked
    g.addEventListener("mouseenter", () => {
      if (!isHumanTurn || state.stagedHexKey) return;
      const check = getHexAvailability(key);
      if (check.canPlace) {
        state.hoverHexKey = key;
        state.selectedRotation = check.defaultRot;
        renderBoard();
      }
    });

    g.addEventListener("mouseleave", () => {
      if (state.hoverHexKey === key) {
        state.hoverHexKey = null;
        renderBoard();
      }
    });

    g.appendChild(poly);

    // Draw existing occupant (or ghost preview if this is the previewed hex)
    const occToDraw =
      isHumanTurn && previewKey === key && activeSim?.valid
        ? { faction: state.turn, type: state.selectedUnitType, isBase: false, rot: state.selectedRotation, isGhost: true }
        : cell.occupant;

    if (occToDraw) {
      drawOccupant(g, x, y, occToDraw);
    }

    // Draw Direct Hit or Supply Cut Badges
    if (hitKeySet.has(key)) {
      drawBadge(g, x, y - 16, "HIT!", "#ef4444");
    } else if (cutKeySet.has(key)) {
      drawBadge(g, x, y - 16, "CUT!", "#f97316");
    }

    svg.appendChild(g);
  }

  // 2. Render Laser Beams Overlay for Active Preview
  if (activeSim?.valid && previewKey) {
    const srcCell = state.cells.get(previewKey);
    const { x: sx, y: sy } = axialToPixel(srcCell.q, srcCell.r);
    for (const targetKey of activeSim.laserTargetKeys) {
      const tCell = state.cells.get(targetKey);
      const { x: tx, y: ty } = axialToPixel(tCell.q, tCell.r);

      const beam = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
    const baseRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    baseRing.setAttribute("cx", cx);
    baseRing.setAttribute("cy", cy);
    baseRing.setAttribute("r", 19);
    baseRing.setAttribute("fill", color);
    baseRing.setAttribute("opacity", "0.25");
    group.appendChild(baseRing);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", cx);
    label.setAttribute("y", cy + 4);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#ffffff");
    label.setAttribute("font-size", "10");
    label.setAttribute("font-weight", "800");
    label.setAttribute("pointer-events", "none");
    label.textContent = occ.faction === "blue" ? "BLUE HQ" : "RED HQ";
    group.appendChild(label);
    return;
  }

  // Draw laser emitters on the unit
  const dirs = getActiveLaserDirs(occ.type, occ.rot);
  for (const d of dirs) {
    const angle = (Math.PI / 180) * (60 * d - 30);
    const x2 = cx + 22 * Math.cos(angle);
    const y2 = cy + 22 * Math.sin(angle);

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
  body.setAttribute("r", occ.type === "basic" ? 10 : 13);
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

// Controls & Event Listeners
function rotateSelected(delta) {
  state.selectedRotation = (state.selectedRotation + delta + 6) % 6;
  renderAll();
}

document.getElementById("rotateLeftBtn").addEventListener("click", () => rotateSelected(-1));
document.getElementById("rotateRightBtn").addEventListener("click", () => rotateSelected(1));

document.getElementById("confirmMoveBtn").addEventListener("click", () => {
  if (state.stagedHexKey) {
    commitMove(state.stagedHexKey, state.selectedRotation);
  }
});

document.getElementById("cancelHexBtn").addEventListener("click", () => {
  state.stagedHexKey = null;
  renderAll();
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

// Rules Modal
const rulesModal = document.getElementById("rulesModal");
document.getElementById("howToPlayBtn").addEventListener("click", () => {
  rulesModal.classList.remove("hidden");
});
document.getElementById("closeRulesBtn").addEventListener("click", () => {
  rulesModal.classList.add("hidden");
});
rulesModal.addEventListener("click", (e) => {
  if (e.target === rulesModal) rulesModal.classList.add("hidden");
});

// Keyboard shortcuts for Desktop (Q/E to rotate, Enter to confirm, Escape to cancel)
window.addEventListener("keydown", (e) => {
  if (e.key === "q" || e.key === "Q") rotateSelected(-1);
  if (e.key === "e" || e.key === "E") rotateSelected(1);
  if (e.key === "Enter" && state.stagedHexKey) {
    commitMove(state.stagedHexKey, state.selectedRotation);
  }
  if (e.key === "Escape" && state.stagedHexKey) {
    state.stagedHexKey = null;
    renderAll();
  }
});

initGame();