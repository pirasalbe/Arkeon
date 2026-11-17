# Arkeon: Tactical Hexagonal Supply & Laser Strategy

An open-source, zero-dependency HTML5 and SVG web reconstruction of **Arkeon**, the 2011 abstract strategy board game created by **Dominique Breton** (originally prototyped as _Viral_) and published on Android by **Hyperfiction**.

[**Play the Live Game Here**](https://pirasalbe.github.io/Arkeon/)

---

## Overview

**Arkeon** blends the positional encirclement and supply-chain fragility of _Go_ with the directional tactical strikes of _Chess_. Two players (**Blue** and **Red**) battle across a 29-hex arena flanked by two Home Bases (31 hexes total). Every unit projects directional attack beams, and every single piece on the board must maintain an unbroken chain of adjacent friendly units back to its Home Base, or be immediately vaporized.

---

## How to Play (Complete Rules)

### 1. The Board & Starting Setup

- The arena consists of **29 playable hexes** plus **2 Home Bases** at opposite ends of the vertical centerline:
  - **Red HQ** sits at top center (`C1`), fronted by 3 starting Basic Strikers at `B1`, `C2`, and `D1` aiming South.
  - **Blue HQ** sits at bottom center (`C7`), fronted by 3 starting Basic Strikers at `B5`, `C6`, and `D5` aiming North.

### 2. Turn Actions: Deploy or Replace (Upgrade, Downgrade, Swap)

Players alternate turns. On your turn, you must perform **one** of two actions:

1. **Deploy a New Unit:** Place a unit (Basic or Advanced) from your available reserve onto an empty hex that is adjacent to at least one of your existing connected units.
2. **Replace an Existing Unit (Upgrade, Downgrade, or Swap):** Select a different unit type in your Arsenal and click one of your existing units on the board to replace it:
   - **Upgrade (Basic to Advanced):** Replace a Basic Striker on the board with one of your Advanced units to fire multi-directional lasers and break stalemates. The Basic Striker returns to your infinite supply.
   - **Downgrade (Advanced to Basic):** Replace an Advanced unit on the board with a Basic Striker. The removed Advanced unit returns directly to your active hand so you can redeploy it elsewhere on a future turn.
   - **Swap Advanced Units:** Replace an Advanced unit on the board with a different Advanced unit from your reserve, returning the previous Advanced unit to your hand.
   - **No In-Place Rotation:** You cannot spend a turn simply rotating a piece that is already on the board; you must replace it with a different unit type.

### 3. Directional Lasers, Friendly Fire & Counter-Attacks

- Before confirming a placement or replacement, you can **rotate** your chosen unit across any of the 6 hexagonal orientations (`Q` and `E` keys, or the on-screen Rotate buttons).
- **Mandatory & Indiscriminate Attacks:** As soon as a move is confirmed, the unit's colored laser beams destroy **any** unit sitting in the adjacent hex(es) it points at, **including your own friendly units**.
- **Line of Fire & Counter-Attacks:** You cannot end your placement on a hex that is still being aimed at by a surviving enemy unit. To deploy or swap onto a hex guarded by an enemy laser, your newly placed unit **must simultaneously destroy** that enemy unit (either by aiming a laser directly back at it or by severing its supply chain).

### 4. The Supply-Line Rule (Base Connection)

- **Continuous Chain:** Every unit you control must have an unbroken path of adjacent friendly units leading back to your Home Base (`C1` for Red, `C7` for Blue).
- **Chain Collapse (`CUT!`):** Whenever an attack destroys a unit (whether enemy or friendly via friendly fire), the board recalculates connectivity using Breadth-First Search (BFS). Any unit from either faction that is no longer connected to its Home Base is **instantly destroyed** on the same turn.
- **No Suicidal Moves:** You cannot make a move or replacement that leaves the newly placed unit itself disconnected from your Home Base, and you cannot fire a laser at your own Home Base.
- **Enemy Base Approach Restriction:** You cannot place or swap a unit on a hex directly adjacent to the opponent's Home Base unless that unit is actively pointing a laser beam at the enemy Home Base to win the game.

### 5. Unit Arsenal & The 5-Unit Refresh Cycle

Each player commands an infinite reserve of **Basic Strikers** and a squad of **5 Advanced Units**:

- **Basic Striker (`∞` Supply):** Fires 1 forward laser (`[0]`). Always reusable when destroyed or swapped out.
- **Spear V (Advanced):** Fires 2 narrow forward-angled lasers (`[0, 1]`).
- **Wide Fork (Advanced):** Fires 2 wide-split forward lasers (`[5, 1]`).
- **Lancer Line (Advanced):** Fires 2 opposing lasers in a straight line (`[0, 3]`).
- **Trident Fan (Advanced):** Fires a 3-way forward fan (`[5, 0, 1]`).
- **Tri-Star (Advanced):** Fires 3 alternating lasers in a Y-pattern (`[0, 2, 4]`).

**The Graveyard Refresh Mechanic:**

- When an **Advanced Unit** is destroyed on the board (either by direct laser hit or by supply-line isolation), it is placed in your **Spent** pool and cannot be used right away.
- **Downgrading or swapping** an Advanced unit on the board does _not_ destroy it; it returns directly to your playable hand.
- Once **all 5** of your Advanced Units have been destroyed, all 5 are immediately refreshed and returned to your available reserve.

### 6. Victory Conditions

- **Direct Base Strike:** Pointing any unit's attack laser directly at the opponent's Home Base immediately wins the match.
- **Total Elimination / Encirclement:** Eliminating all of an opponent's connected units or leaving them with zero legal moves also secures victory.

---

## Controls & Built-In Assist Tools

- **Select Unit:** Click or tap any available unit card in your Unit Arsenal dock.
- **Lock Target Hex:** Click or tap any green dashed hex on the board to stage your unit and preview its lasers.
- **Rotate Orientation:** Click the **Rotate ⟲ / ⟳** buttons or press `Q` and `E`.
- **Confirm Move:** Click **Confirm Move ✓** (or click/tap the locked hex a second time).
- **Move History & Coordinate Grid (`A1` to `E7`):** Toggle board coordinates on or off and click **Copy Log** to copy the full match transcript.

---

## Project Structure

- `index.html`: Semantic application layout, SVG arena container, unit docks, rules modal, and move history log.
- `style.css`: Responsive dark-mode tactical UI for desktop, tablet, and mobile screens.
- `index.js`: Cube hex coordinate engine, Breadth-First Search (BFS) supply-line solver, move legality validator, and AI heuristic evaluator.

---

## Credits & Historical Sources

This project is an educational fan preservation and web reconstruction of _Arkeon_.

- **Original Game Concept & Rules:** [Dominique Breton](https://www.facebook.com/ZeBlate) (_Viral_ / _Arkeon_)
- **Original 2011 Android Release:** Hyperfiction
- **Reference Sources Used for Reconstruction:**
  - [LaunchBox Games Database: Arkeon (2011) Entry](https://gamesdb.launchbox-app.com/games/details/119187-arkeon)
  - [Arkeon Gameplay & Rules Explanation Video featuring Designer Dominique Breton (YouTube)](https://www.youtube.com/watch?v=D0NzeG29Ods)
