# Arkeon: Tactical Hexagonal Supply & Chain-Reaction Strategy

An open-source, zero-dependency HTML5 and SVG web reconstruction of **Arkeon**, the 2011 abstract strategy board game created by **Dominique Breton** (originally prototyped as _Viral_) and published on Android by **Hyperfiction**.

[**Play the Live Game Here**](https://pirasalbe.github.io/Arkeon/)

---

## Overview

**Arkeon** blends the positional encirclement and supply-chain fragility of _Go_ with directional laser combat and chain-reaction board manipulation. Two players (**Blue** and **Red**) battle across a 29-hex arena flanked by two Home Bases (31 hexes total). Every unit must maintain an unbroken chain of adjacent friendly units back to its Home Base, or be immediately vaporized.

---

## How to Play (Complete Official Rules)

### 1. The Board & Starting Setup

- The arena consists of **29 playable hexes** plus **2 Home Bases** at opposite ends of the vertical centerline:
  - **Red HQ** starts at top center (`C1`), fronted by 3 starting Basic Strikers at `B1`, `C2`, and `D1` aiming South.
  - **Blue HQ** starts at bottom center (`C7`), fronted by 3 starting Basic Strikers at `B5`, `C6`, and `D5` aiming North.

### 2. Turn Actions: Deploy or Replace (Upgrade, Downgrade, Swap)

Players alternate turns. On your turn, you must perform **one** of two actions:

1. **Deploy a New Unit:** Place a unit (Basic or Advanced) from your available reserve onto an empty hex that is adjacent to at least one of your existing connected units.
2. **Replace an Existing Unit (Upgrade, Downgrade, or Swap):** Select a different unit type in your Arsenal and click one of your existing units on the board to replace it:
   - **Upgrade (Basic to Advanced):** Replace a Basic Striker on the board with one of your Advanced units. The Basic Striker returns to your infinite supply.
   - **Downgrade (Advanced to Basic):** Replace an Advanced unit on the board with a Basic Striker. The removed Advanced unit returns directly to your active hand so you can redeploy it elsewhere on a future turn.
   - **Swap Advanced Units:** Replace an Advanced unit on the board with a different Advanced unit from your reserve, returning the previous Advanced unit to your hand.
   - **No In-Place Rotation:** You cannot spend a turn simply rotating a piece that is already on the board; you must replace it with a different unit type.

### 3. The Authentic Unit Arsenal (1 Basic + 5 Advanced Units)

Each player commands an infinite reserve of **Basic Strikers** and a specialized squad of **5 Advanced Units**:

- **Basic Striker (`∞` Supply, Aggressive):** Attacks the 1 adjacent hex it points at (`[0]`). Always reusable when destroyed or swapped out.
- **Triple Striker (`Le triple attaque`, Advanced, Aggressive):** Attacks the 3 forward adjacent hexes it points at simultaneously (`[5, 0, 1]`).
- **Clockwise Rotator (`Le tournicoteur: sens horaire`, Advanced, Non-Aggressive):** Forces all adjacent aggressive units (both enemy and friendly) to pivot 60 degrees clockwise (`⟳`).
- **CCW Rotator (`Le tournicoteur: sens anti-horaire`, Advanced, Non-Aggressive):** Forces all adjacent aggressive units (both enemy and friendly) to pivot 60 degrees counter-clockwise (`⟲`).
- **Pacifier (`Le pacificateur`, Advanced, Non-Aggressive):** Pacifies all adjacent aggressive units (both enemy and friendly) by forcing them to pivot so their attack lasers turn their backs (`☮`) directly away from the Pacifier.
- **Repulsor (`Le répulseur`, Advanced, Non-Aggressive):** Pushes all units (including your own units and **including Home Bases**) outward by 1 hex along all 6 hexagonal axes (`❖`) until they hit an immovable obstacle (the edge of the board or another blocked piece).

**The 5-Unit Graveyard Refresh Mechanic:**

- When an **Advanced Unit** is destroyed on the board (either by direct laser hit or by supply-line isolation), it is placed in your **Spent** pool and cannot be used right away.
- **Downgrading or swapping** an Advanced unit on the board does _not_ destroy it; it returns directly to your playable hand.
- Once **all 5** of your Advanced Units have been destroyed, all 5 are immediately refreshed and returned to your available reserve.

### 4. The 5-Step Chain-Reaction Resolution Order

When a unit is placed or swapped, the turn resolves in five strict steps:

1. **Step 1 (Manipulator Action):** If a Rotator, Pacifier, or Repulsor is placed, all adjacent rotations or 6-axis pushes happen first.
2. **Step 2 (Active Player's Attacks):** All of the active player's aggressive units that were just placed, rotated, or pushed fire their lasers into the hexes they point at (destroying both enemy and friendly units in those spaces).
3. **Step 3 (Opponent's Supply Check):** Any opponent units that are no longer connected to their Home Base by a continuous chain of friendly units are immediately destroyed (`CUT!`).
4. **Step 4 (Opponent's Triggered Attacks):** Any surviving opponent units that were rotated or pushed in Step 1 now fire their lasers in their new direction.
5. **Step 5 (Active Player's Supply Check):** Any of the active player's units disconnected from their Home Base are destroyed (`CUT!`). A move is legal only if the newly placed unit survives all 5 steps and is not left in the active laser beam of a surviving enemy unit.

### 5. Victory Conditions

- **Direct Base Strike:** Pointing an aggressive unit's laser at the opponent's Home Base wins the match (resolved in step order if both bases are targeted on the same turn).
- **Total Elimination / Encirclement:** Eliminating all of an opponent's connected units or leaving them with zero legal moves also secures victory.

---

## Credits & Historical Sources

This project is an educational fan preservation and web reconstruction of _Arkeon_.

- **Original Game Concept & Rules:** [Dominique Breton](https://www.facebook.com/ZeBlate) (_Viral_ / _Arkeon_)
- **Original 2011 Android Release:** Hyperfiction
- **Reference Sources Used for Reconstruction:**
  - [Tric Trac Official Game Sheet & Complete French Rulebook: Arkeon (2012)](https://trictrac.net/jeu-de-societe/arkeon)
  - [Tric Trac Designer Forum Thread: [Viral] Edité = ARKEON sur Store Google Play](https://forum.trictrac.net/t/viral-edite-arkeon-sur-store-google-play/95863)
  - [LaunchBox Games Database: Arkeon (2011) Entry](https://gamesdb.launchbox-app.com/games/details/119187-arkeon)
  - [Arkeon Gameplay & Rules Explanation Video featuring Designer Dominique Breton (YouTube)](https://www.youtube.com/watch?v=D0NzeG29Ods)
