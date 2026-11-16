# Arkeon — Tactical Hexagonal Supply & Laser Strategy

An open-source, zero-dependency HTML5/SVG web reconstruction of **Arkeon**, the 2011 abstract strategy board game created by **Dominique Breton** (originally prototyped as *Viral*) and published on Android by **Hyperfiction**.

[**Play the Live Demo Here**]([https://<YOUR-GITHUB-USERNAME>.github.io/arkeon/](https://pirasalbe.github.io/Arkeon/))

---

## Overview

**Arkeon** blends the positional encirclement and supply-chain fragility of *Go* with the directional tactical strikes of *Chess*. Two players (**Blue** and **Red**) battle across a 29-hex arena flanked by two Home Bases (31 hexes total). Every unit projects directional attack beams, and every single piece on the board must maintain an unbroken chain of adjacent friendly units back to its Home Base—or be immediately vaporized.

---

## How to Play (Tutorial & Rules)

### 1. The Board & Starting Setup
* The arena consists of **29 playable hexes** plus **2 Home Bases** at opposite poles:
  * **Red Base** at `(0, -3)` with 3 starting frontline hexes: `(-1, -2)`, `(0, -2)`, and `(1, -2)`.
  * **Blue Base** at `(0, 3)` with 3 starting frontline hexes: `(-1, 2)`, `(0, 2)`, and `(1, 2)`.
* Both players begin the match with **3 Basic Units** already deployed on their starting frontline hexes, pointing forward toward the center of the arena.

### 2. Turn Actions
Players alternate turns. On your turn, you must perform **one** of two actions:
1. **Deploy:** Place a unit (Basic or Advanced) from your available reserve onto an empty hex that is adjacent to at least one of your existing connected units.
2. **Upgrade / Downgrade (Swap):** Replace one of your existing units on the board with a different unit from your reserve:
   * **Upgrade:** Swap a Basic unit on the board for an Advanced unit to unleash multi-directional attacks and break a stalemate.
   * **Downgrade:** Swap an Advanced unit on the board back to a Basic unit. The Advanced unit returns immediately to your active hand so you can redeploy it elsewhere on a future turn!

### 3. Directional Lasers & Friendly Fire
* Before confirming a placement or swap, you can **rotate** your unit across any of the 6 hexagonal orientations (`Q` / `E` keys, mouse wheel, or on-screen controls).
* **Mandatory & Indiscriminate Attacks:** As soon as a unit is placed, its colored laser beams destroy **any** unit sitting in the adjacent hex(es) it points at—**including your own friendly units**.

### 4. The Supply-Line Rule (Base Connection)
* **Continuous Chain:** Every unit you control must have an unbroken path of adjacent friendly units leading back to your Home Base.
* **Chain Collapse (`CUT!`):** Whenever an attack destroys a unit (whether enemy or friendly via friendly fire), the board recalculates connectivity using Breadth-First Search (BFS). Any unit—from either faction—that is no longer connected to its Home Base is **instantly destroyed** in the same turn.
* **No Suicidal Moves:** You cannot make a move or swap that leaves the newly placed unit itself disconnected from your Home Base.
* **Enemy Base Approach Restriction:** You cannot place a unit on a hex directly adjacent to the opponent's Home Base *unless* that unit is actively pointing a laser beam at the enemy base to win the game.

### 5. Unit Arsenal & The 5-Unit Refresh Cycle
Each player commands an infinite reserve of **Basic Units** and a specialized squad of **5 Advanced Units**:

* **Basic Striker (`∞` Supply):** Fires 1 forward laser (`[0]`). Returns immediately to your reserve when destroyed.
* **Spear V (Advanced):** Fires 2 narrow forward-angled lasers (`[0, 1]`).
* **Wide Fork (Advanced):** Fires 2 wide-split lasers (`[0, 2]`).
* **Lancer Beam (Advanced):** Fires 2 opposing lasers in a straight line (`[0, 3]`).
* **Trident Fan (Advanced):** Fires a 3-way forward fan (`[5, 0, 1]`).
* **Aegis Tri-Star (Advanced):** Fires 3 alternating lasers in a Y-pattern (`[0, 2, 4]`).

**The Graveyard Refresh Mechanic:**
* When an **Advanced Unit** is destroyed on the board (either by direct laser hit or by supply-line isolation), it is placed in your **Spent / Graveyard** pool and cannot be used right away.
* **Downgrading** an Advanced unit on the board does *not* destroy it—it returns directly to your playable hand.
* Once **all 5** of your Advanced Units have been destroyed, all 5 are immediately refreshed and returned to your available reserve!

### 6. Victory Condition
* **Direct Base Strike:** Pointing any unit's attack laser directly at the opponent's Home Base immediately wins the match.
* **Total Annihilation / Encirclement:** Eliminating all of an opponent's connected units or leaving them with zero legal placements also secures victory.

---

## Controls & Built-In Assist Tools

* **Select Unit:** Click any available unit card in your reserve dock.
* **Rotate Orientation:** Press `Q` / `E`, click the Rotate buttons, or scroll your mouse wheel while hovering over the board.
* **Live Tactical Preview:** Hover over any highlighted valid hex to preview your unit's laser vectors, direct blast targets, and a pulsing **`CUT!`** badge on any units that will be isolated from their Home Base.
* **Game Modes:** Play local 2-Player Pass & Play or against the built-in heuristic AI opponent.

---

## Project Structure

* `index.html` — Semantic application layout, SVG arena container, unit docks, rules guide, and modal exporter.
* `style.css` — Responsive dark-mode tactical UI, hexagonal hover states, laser beam animations, and status badges.
* `index.js` — Axial hex coordinate engine, Breadth-First Search (BFS) supply-line solver, move legality validator, and AI heuristic evaluator.

---

## Credits & Historical Sources

This project is an educational fan preservation and web reconstruction of *Arkeon*.

* **Original Game Concept & Rules:** Dominique Breton (*Viral* / *Arkeon*)
* **Original 2011 Android Release:** Hyperfiction
* **Reference Sources Used for Reconstruction:**
  * [LaunchBox Games Database — Arkeon (2011) Entry](https://gamesdb.launchbox-app.com/games/details/119187-arkeon)
  * [Arkeon Gameplay & Rules Explanation Video featuring Designer Dominique Breton (YouTube)](https://www.youtube.com/watch?v=D0NzeG29Ods)
