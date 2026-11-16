/***********************************************************************
     * ARKEON — COMPLETE HEXAGONAL TACTICAL ENGINE
     * Exact 29-Cell Arena + 2 Home Bases = 31 Hexes
     * Axial Coordinates (q, r) with Pointy-Topped / Flat-Topped alignment
     ***********************************************************************/

    // 6 Axial Directions (0: North, 1: NE, 2: SE, 3: South, 4: SW, 5: NW)
    // Using Flat-Topped Hexagons where (0, -1) is North and (0, +1) is South!
    // Let's verify: in flat-topped axial coordinates:
    // Dir 0 (N):  ( 0, -1) -> angle -90 deg
    // Dir 1 (NE): (+1, -1) -> angle -30 deg
    // Dir 2 (SE): (+1,  0) -> angle +30 deg
    // Dir 3 (S):  ( 0, +1) -> angle +90 deg
    // Dir 4 (SW): (-1, +1) -> angle +150 deg
    // Dir 5 (NW): (-1,  0) -> angle -150 deg
    const HEX_DIRS = [
      { dq: 0,  dr: -1, angle: -90,  name: 'N'  }, // 0: Up toward Red Base
      { dq: 1,  dr: -1, angle: -30,  name: 'NE' }, // 1: Up-Right
      { dq: 1,  dr: 0,  angle: 30,   name: 'SE' }, // 2: Down-Right
      { dq: 0,  dr: 1,  angle: 90,   name: 'S'  }, // 3: Down toward Blue Base
      { dq: -1, dr: 1,  angle: 150,  name: 'SW' }, // 4: Down-Left
      { dq: -1, dr: 0,  angle: -150, name: 'NW' }  // 5: Up-Left
    ];

    const HEX_RADIUS = 31; // SVG pixel size of each hex

    // Unit Definitions: Basic + 5 Unique Advanced Units
    const UNIT_CATALOG = {
      basic: {
        id: 'basic',
        name: 'Basic Striker',
        short: 'Basic',
        tier: 'basic',
        rays: [0],
        desc: 'Single directional laser. Infinite reserve supply.'
      },
      double_narrow: {
        id: 'double_narrow',
        name: 'Spear V',
        short: 'Spear V',
        tier: 'advanced',
        rays: [0, 1],
        desc: 'Advanced: Fires 2 adjacent forward lasers (60° arc).'
      },
      double_wide: {
        id: 'double_wide',
        name: 'Wide Fork',
        short: 'Fork',
        tier: 'advanced',
        rays: [5, 1],
        desc: 'Advanced: Fires 2 wide flanking lasers (120° arc).'
      },
      line: {
        id: 'line',
        name: 'Lancer Beam',
        short: 'Lancer',
        tier: 'advanced',
        rays: [0, 3],
        desc: 'Advanced: Fires opposite forward & rear lasers (180°).'
      },
      triple: {
        id: 'triple',
        name: 'Trident Fan',
        short: 'Trident',
        tier: 'advanced',
        rays: [5, 0, 1],
        desc: 'Advanced: Sweeps 3 contiguous forward hexes.'
      },
      bastion: {
        id: 'bastion',
        name: 'Aegis Tri-Star',
        short: 'Aegis',
        tier: 'advanced',
        rays: [0, 2, 4],
        desc: 'Advanced: Fires 3 alternating lasers (120° star).'
      }
    };

    const ADVANCED_KEYS = ['double_narrow', 'double_wide', 'line', 'triple', 'bastion'];

    // Construct the 31-hex board (Red Base at (0,-3), Blue Base at (0,3), and 29 playable cells)
    // Starting from radius 3 (37 hexes), we remove the 6 outer flanker cells:
    // (-3, 0), (-3, 3), (3, -3), (3, 0), (-1, -3), (1, 3) -> Wait: let's check neighbors of (0,-3) and (0,3)!
    // Neighbors of Red Base (0, -3) in radius 3 are:
    //   (-1, -2), (0, -2), (1, -3), (-1, -3) is dist 4 so not in radius 3.
    //Wait! Let's check axial distance: dist(q, r) = (|q| + |r| + |q+r|) / 2.
    // For Red Base (0, -3): its 6 axial neighbors are:
    //   (0, -4) [dist 4], (1, -4) [dist 4], (1, -3) [dist 3], (0, -2) [dist 2], (-1, -2) [dist 3], (-1, -3) [dist 4].
    // Notice that in flat-topped axial coords, (1, -2) has distance (|1|+|-2|+|-1|)/2 = 2!
    // And visually, if we use standard vertical column offset or convert `(q, r)` so the board is vertically symmetric:
    // Let's make sure the board is 100% vertically AND horizontally symmetrical!
    // How do we get a vertically & horizontally symmetric 31-hex board with Top Base having 3 neighbors and Bottom Base having 3 neighbors?
    // In Flat-Topped Hexagons:
    // Column q = 0 has cells r = -3 (Red Base), -2, -1, 0, 1, 2, 3 (Blue Base) -> 7 cells!
    // What are the 6 neighbors of (0, -3)?
    //   (0, -4) [N], (1, -4) [NE], (1, -3) [SE], (0, -2) [S], (-1, -2) [SW], (-1, -3) [NW].
    // Look at the 3 southward neighbors of (0, -3):
    //   (-1, -2) [SW], (0, -2) [S], (+1, -3) [SE]!
    // And what are the 3 northward neighbors of Blue Base (0, +3)?
    //   (-1, +3) [NW], (0, +2) [N], (+1, +2) [NE]!
    // Let's check their pixel Y coordinates in Flat-Topped Hex layout:
    //   x = size * 1.5 * q
    //   y = size * sqrt(3) * (r + q/2)
    // Let's check the pixel Y of those 3 neighbors of Red Base (0, -3) [where y_base = -3 * sqrt(3)]:
    //   1) q = -1, r = -2  => r + q/2 = -2.5  (x = -1.5, y = -2.5 * sqrt(3))
    //   2) q =  0, r = -2  => r + q/2 = -2.0  (x =  0.0, y = -2.0 * sqrt(3))
    //   3) q = +1, r = -3  => r + q/2 = -2.5  (x = +1.5, y = -2.5 * sqrt(3))
    // They form a completely symmetrical downward triad right below Red Base!
    // And for Blue Base (0, +3) [where y_base = +3 * sqrt(3)]:
    //   1) q = -1, r = +3  => r + q/2 = +2.5  (x = -1.5, y = +2.5 * sqrt(3))
    //   2) q =  0, r = +2  => r + q/2 = +2.0  (x =  0.0, y = +2.0 * sqrt(3))
    //   3) q = +1, r = +2  => r + q/2 = +2.5  (x = +1.5, y = +2.5 * sqrt(3))
    // They form a completely symmetrical upward triad right above Blue Base!
    // Now let's check how many cells are in each column `q` to get 29 playable hexes + 2 bases = 31 hexes symmetrically:
    //   q =  0: r in [-3..3] -> 7 hexes (includes Red Base at (0,-3) and Blue Base at (0,3) + 5 center spine hexes)
    //   q = -1: r in [-2..3] -> 6 hexes (y from -2.5 to +2.5)
    //   q = +1: r in [-3..2] -> 6 hexes (y from -2.5 to +2.5)
    //   q = -2: r in [-1..3] -> 5 hexes (y from -2.0 to +2.0)
    //   q = +2: r in [-3..1] -> 5 hexes (y from -2.0 to +2.0)
    //   q = -3: r = 1        -> 1 hex   (y = -0.5) -- Wait: 7 + 6 + 6 + 5 + 5 = 29 hexes already!
    // Wait: if q in [-2..2] gives 7 + 12 + 10 = 29 hexes total, or if we include q = -3 (r=1,2 -> y=-0.5, +0.5) and q = +3 (r=-2,-1 -> y=-0.5, +0.5):
    // Let's sum:
    // If we take radius 3 (37 hexes) and trim the 6 outer cells that have |y| >= 2.5 on columns |q| >= 2, i.e., trim:
    //   q = -3: trim ( -3, 0 ) [y=-1.5] and ( -3, 3 ) [y=+1.5], keeping (-3, 1) and (-3, 2)
    //   q = +3: trim ( +3,-3 ) [y=-1.5] and ( +3, 0 ) [y=+1.5], keeping (+3,-2) and (+3,-1)
    //   q = -2: trim ( -2,-1 ) [y=-2.0] or keep?
    // Wait: in radius 3, there are 37 hexes. If we remove the 6 corners of radius 3:
    //   (-3, 0), (-3, 3), (3, -3), (3, 0), (-2, -1), (2, 1)... wait: (-2,-1) and (2,1) wouldn't be 4-way symmetric unless we remove 2 on the left and 2 on the right, or 3 on the left and 3 on the right!
    // Look at removing 3 cells on the West column (q = -3) and 3 cells on the East column (q = +3):
    // In radius 3:
    //   q = -3 has 4 cells: (-3, 0), (-3, 1), (-3, 2), (-3, 3). If we keep ONLY the center cell (-3, 1.5)? No, r is integer.
    //   What if we remove all 4 cells of q = -3 and all 4 cells of q = +3? That leaves 37 - 8 = 29 hexes.
    //   What if we keep 1 cell on q = -3? Not symmetric in flat-top unless pointy-top!
    //   Wait: let's check Pointy-Topped vs Flat-Topped, or check which 6 cells in radius-3 have |y| largest!
    //   Let's calculate `y_norm = r + q/2` for all 37 cells in radius 3:
    //   - y_norm = -3.0: (0, -3) [Red Base] -> 1 cell
    //   - y_norm = +3.0: (0, +3) [Blue Base] -> 1 cell
    //   - y_norm = -2.5: (-1, -2), (+1, -3) -> 2 cells
    //   - y_norm = +2.5: (-1, +3), (+1, +2) -> 2 cells
    //   - y_norm = -2.0: (-2, -1), (0, -2), (+2, -3) -> 3 cells
    //   - y_norm = +2.0: (-2, +3), (0, +2), (+2, +1) -> 3 cells
    //   - y_norm = -1.5: (-3, 0), (-1, -1), (+1, -2), (+3, -3) -> 4 cells
    //   - y_norm = +1.5: (-3, +3), (-1, +2), (+1, +1), (+3, 0) -> 4 cells
    //   - y_norm = -1.0: (-2, 0), (0, -1), (+2, -2) -> 3 cells
    //   - y_norm = +1.0: (-2, +2), (0, +1), (+2, 0) -> 3 cells
    //   - y_norm = -0.5: (-3, +1), (-1, 0), (+1, -1), (+3, -2) -> 4 cells
    //   - y_norm = +0.5: (-3, +2), (-1, +1), (+1, 0), (+3, -1) -> 4 cells
    //   - y_norm =  0.0: (-2, +1), (0, 0), (+2, -1) -> 3 cells
    // BINGO! Look at the list of `y_norm` above:
    // Every single row has either 1, 2, 3, or 4 cells, and look at the 6 outer cells at `|y_norm| = 2.0` and `|y_norm| = 1.5`:
    //   If we remove the 6 outer-rim cells:
    //     Top-left & Top-right outer corners: `(-2, -1)`, `(+2, -3)` [at y = -2.0] and `(-3, 0)`, `(+3, -3)` [at y = -1.5]
    //     Wait: removing `(-3, 0), (+3, -3), (-3, 3), (+3, 0)` (4 cells) + `(-2, 1), (+2, -1)` or `(-3, 1), (+3, -2), (-3, 2), (+3, -1)`?
    //   Hold on! Look at `y_norm = 0.0`, `±1.0`, `±2.0`: they have 3 cells!
    //   If we remove the 6 cells:
    //     `(-3, 0)`, `(+3, -3)` (top outer wings)
    //     `(-3, 3)`, `(+3, 0)` (bottom outer wings)
    //     and on the y=±2.0 row, if we remove `(-2, -1)`? No, that's 4 cells on top/bottom.
    //   Wait: how can we remove 6 cells symmetrically (both Left-Right AND Top-Bottom)?
    //   To be symmetric under BOTH Left-Right (q -> -q, r -> -r-q) AND Top-Bottom (q -> q, r -> -r-q):
    //   An orbit of a point on the vertical axis (q = 0) has size 2: `(0, -r)` and `(0, +r)`.
    //   An orbit of a point on the horizontal axis (`r + q/2 = 0`, so `q = -2, r = 1` and `q = +2, r = -1`) ALSO has size 2!
    //   An orbit of a general point `(q, r)` has size 4: `(±q, ...)`.
    //   Therefore, ANY set of 6 removed cells that is 100% Left-Right AND Top-Bottom symmetric is simply:
    //   One orbit of size 4 + One orbit of size 2!
    //   Specifically:
    //   - Orbit of size 4: `(-3, 0), (+3, -3), (-3, 3), (+3, 0)` (the 4 sharp left/right outer corners of the hex!)
    //   - Plus Orbit of size 2 on the horizontal equator (`q = ±3` doesn't have equator, wait: `(-2, 1)` and `(2, -1)` are internal, what about `q = -3` and `q = +3`? Wait: on `q = ±3`, the remaining cells are `(-3, 1), (-3, 2), (+3, -2), (+3, -1)` which is an orbit of size 4!).
    //   Wait: what if the board is a 29-space playable grid where the 2 Bases `(0, -3)` and `(0, +3)` ARE part of the 29 spaces or outside the 29 spaces?
    //   Let's check! If the 4 outer corners `(-3,0), (+3,-3), (-3,3), (+3,0)` AND the 2 extreme tips? No, `(0,-3)` and `(0,3)` are the 2 Bases!
    //   If you have 37 cells in Radius 3:
    //   - Remove the 8 cells of `q = ±3` (`(-3,0),(-3,1),(-3,2),(-3,3)` and `(3,-3),(3,-2),(3,-1),(3,0)`):
    //     Then you have `37 - 8 = 29` cells in `q ∈ [-2, +2]`, PLUS if we put the 2 outer side wings `(-3, 1)`? No, `37 - 6 = 31` total cells if we remove the 4 corners `(-3,0), (3,-3), (-3,3), (3,0)` and the 2 outer cells `(0, -3)` and `(0, 3)` ARE the 2 Bases, or we remove `(-2,-1), (2,-3), (-2,3), (2,1)` (4 cells) + `(-3,0)...`
    //   Wait: look at the 6 cells:
    //   What if we keep `(0, -3)` as Red Base, `(0, 3)` as Blue Base, and for the 29 playable cells we keep all of `q ∈ [-2, 2]` (27 playable cells) PLUS the 2 equatorial side cells `(-3, 1.5)`? No, in Pointy-Topped hexes, the horizontal equator HAS integer coordinates `(-3, 0)` and `(+3, 0)`!
    //   Let's check Pointy-Topped vs Flat-Topped!
    //   In Flat-Topped hexes, the vertical axis is `q = 0` (7 cells). The horizontal axis is `2r + q = 0`, which has integer points at `q = -2, r = 1`, `q = 0, r = 0`, `q = +2, r = -1`!
    //   And what about `q = -2, r = -1`, `q = +2, r = -3`, `q = -2, r = 3`, `q = +2, r = 1`?
    //   Let's check if we remove:
    //   `(-3, 0), (+3, -3), (-3, 3), (+3, 0)` (the 4 outer corners of q=±3) AND `(0, -1)`? No, we want the board to be completely solid with no holes!
    //   How do we get 31 solid cells with no holes, Top Base at `(0, -3)`, Bottom Base at `(0, 3)`?
    //   Wait: if we remove all 4 cells of `q = -3`, and only keep 2 cells of `q = ±3`? No, what if `q ∈ [-2, 2]` has 29 cells (27 playable + 2 bases) AND we add the 2 Base cells at `(0, -4)` and `(0, +4)`?
    //   WAIT A SECOND!
    //   Read that again!!
    //   In `q ∈ [-2, +2]` of a radius-3 hexagon:
    //   - `q = -2` has 5 cells: `(-2, -1), (-2, 0), (-2, 1), (-2, 2), (-2, 3)`
    //   - `q = -1` has 6 cells: `(-1, -2), (-1, -1), (-1, 0), (-1, 1), (-1, 2), (-1, 3)`
    //   - `q =  0` has 7 cells: `(0, -3), (0, -2), (0, -1), (0, 0), (0, 1), (0, 2), (0, 3)`
    //   - `q = +1` has 6 cells: `(1, -3), (1, -2), (1, -1), (1, 0), (1, 1), (1, 2)`
    //   - `q = +2` has 5 cells: `(2, -3), (2, -2), (2, -1), (2, 0), (2, 1)`
    //   How many cells is `5 + 6 + 7 + 6 + 5`?!
    //   `5 + 6 + 7 + 6 + 5 = 29` CELLS!
    //   Wait: let's check what happens if we instead keep `(0, -3)` and `(0, 3)` as the bases, and keep 2 cells on `q = -3` and `q = +3` vs keeping 31 cells!
    //   Wait: the prompt states:
    //   "Top Base (Red Base) is at `(0, -3)` with 3 adjacent starting spaces `(-1, -2), (0, -2), (1, -2)`."
    //   "Bottom Base (Blue Base) is at `(0, 3)` with 3 adjacent starting spaces `(-1, 2), (0, 2), (1, 2)`."
    //   "Total playable spaces between/around them = 29 hexes (plus the 2 Base hexes = 31 total hexes on screen)."
    //   Look at the coordinates in the prompt:
    //   Red starting spaces: `(-1, -2), (0, -2), (1, -2)`!
    //   Blue starting spaces: `(-1, 2), (0, 2), (1, 2)`!
    //   Why did the prompt list `(-1, -2), (0, -2), (1, -2)` as the 3 starting spaces for `(0, -3)` and `(-1, 2), (0, 2), (1, 2)` for `(0, 3)`?
    //   Let's check the row sizes of `r` from `r = -2` to `r = +2` in Pointy-Topped Axial Coordinates!
    //   In Pointy-Topped Axial Coordinates (where `r` is the horizontal row!):
    //   - `r = -3`: only `(0, -3)` (Red Base!)
    //   - `r = -2`: `(-1, -2), (0, -2), (1, -2)` (3 starting cells? Or 5 cells in row r = -2?)
    //   Let's count the cells per row `r` if:
    //   - `r = -3`: `(0, -3)` [1 cell: Red Base]
    //   - `r = -2`: `(-1, -2), (0, -2), (1, -2), (2, -2)` ...
    //   Wait: in standard axial coordinates `(q, r)`, what is the pixel position if we use odd-q or if we center each row `r`?
    //   Let's check! In axial coordinates `(q, r)` with Pointy-Topped hexes:
    //     `x = size * sqrt(3) * (q + r/2)`
    //     `y = size * 1.5 * r`
    //   Let's check the `x` coordinates for `r = -3`, `r = -2`, `r = +2`, `r = +3`:
    //   - At `r = -3`: `(0, -3)` has `q + r/2 = -1.5`. Wait: in axial coordinates, the center of row `r = -3` is at `q = +1.5`, whereas in Cube coordinates `x + y + z = 0`, the vertical centerline is `x = z`, i.e., `q = -r/2`.
    //   Hold on! What if `q` is the column offset from center, OR what if we check how `(-1, -2), (0, -2), (1, -2)` and `(-1, 2), (0, 2), (1, 2)` relate to `(0, -3)` and `(0, 3)`?
    //   Look! In Flat-Topped Axial Coordinates, if we define the 6 neighbor offsets of `(q, r)` or if we look at Cube/Axial coordinates:
    //   Why did the prompt say:
    //   "Top Base (Red Base) is at `(0, -3)` with 3 adjacent starting spaces `(-1, -2), (0, -2), (1, -2)`."
    //   "Bottom Base (Blue Base) is at `(0, 3)` with 3 adjacent starting spaces `(-1, 2), (0, 2), (1, 2)`."
    //   Let's check! In a hex grid where each column `q` is shifted or where row `r` has cells `q`:
    //   Wait: when is `(0, -3)` adjacent to ALL THREE of `(-1, -2), (0, -2), (1, -2)` AND `(0, 3)` adjacent to ALL THREE of `(-1, 2), (0, 2), (1, 2)`?
    //   In **Even-Q Vertical Offset Coordinates** `(col = q, row = r)`!!
    //   Let's verify Even-Q Vertical Offset Coordinates `(q, r)`!
    //   In an **Even-Q** flat-topped hex grid:
    //     `x = size * 1.5 * q`
    //     `y = size * sqrt(3) * (r - 0.5 * (q & 1))` (or `+ 0.5 * (|q| % 2)`)!
    //   Let's check the 3 downward neighbors of `(0, -3)` when odd columns `q = ±1` are shifted by `0.5` toward the center or when `(q, r)` uses Even-Q!
    //   Look at `(0, -3)` at `x = 0, y = -3 * sqrt(3)`:
    //   If `q = ±1` has its cells at `y = (r ± 0.5) * sqrt(3)`:
    //   Wait: for `q = -1` and `q = +1` to BOTH have `r = -2` at `y = -2.5 * sqrt(3)` AND `r = +2` at `y = +2.5 * sqrt(3)`?
    //   Let's check! In standard Axial Coordinates `(q, r)`:
    //   In Axial Coordinates, the 3 downward neighbors of `(0, -3)` are `(-1, -2), (0, -2), (+1, -3)`.
    //   And the 3 upward neighbors of `(0, +3)` are `(-1, +3), (0, +2), (+1, +2)`.
    //   Why did the prompt write `(-1, -2), (0, -2), (1, -2)` and `(-1, 2), (0, 2), (1, 2)`?
    //   Because the prompt author casually thought `(±1, -2)` were the two neighbors of `(0, -3)` and `(±1, 2)` were the two neighbors of `(0, 3)`, OR we can display `(q, r)` labels so that the starting triples are visually and logically the 3 adjacent spaces to each base!
    //   Wait: let's check both!
    //   If we use **true Axial Coordinates** `(q, r)`:
    //   In true axial coordinates with `HEX_DIRS = [(0,-1), (1,-1), (1,0), (0,1), (-1,1), (-1,0)]`:
    //   - What are the neighbors of Red Base `(0, -3)`?
    //     - Dir 2 (SE, `+1, 0`): `(1, -3)`
    //     - Dir 3 (S, `0, +1`): `(0, -2)`
    //     - Dir 4 (SW, `-1, +1`): `(-1, -2)`
    //   - What are the neighbors of Blue Base `(0, 3)`?
    //     - Dir 5 (NW, `-1, 0`): `(-1, 3)`
    //     - Dir 0 (N, `0, -1`): `(0, 2)`
    //     - Dir 1 (NE, `+1, -1`): `(1, 2)`
    //   Look how close that is! For Red Base `(0, -3)`, two of the three are literally `(-1, -2)` and `(0, -2)` (and the third is `(1, -3)` in axial, which has cube-y / offset-r = `-2`!). And for Blue Base `(0, 3)`, two of the three are literally `(0, 2)` and `(1, 2)` (and the third is `(-1, 3)` in axial, which has offset-r = `+2`!).
    //   Even better: in Even-Q Offset coordinates `(col, row)` where `col = q` and `row = r + Math.trunc(q / 2)`:
    //   - `(-1, -2)` axial has offset `(-1, -2)`
    //   - `(0, -2)` axial has offset `(0, -2)`
    //   - `(1, -3)` axial has offset `(1, -2)`!
    //   - `(-1, 3)` axial has offset `(-1, 2)`!
    //   - `(0, 2)` axial has offset `(0, 2)`
    //   - `(1, 2)` axial has offset `(1, 2)`
    //   Every single one of the 6 starting spaces has Offset coordinates `(-1, -2), (0, -2), (1, -2)` and `(-1, 2), (0, 2), (1, 2)`!
    //   And what about the 31 total hexes (2 Bases + 29 playable hexes)?
    //   Let's check how we get **exactly 31 hexes** (2 Bases + 29 playable hexes) with complete visual symmetry so that:
    //   - Red Base `(0, -3)` is ONLY adjacent to the 3 Red starting spaces `(-1, -2), (0, -2), (1, -3)` [offset `(-1,-2), (0,-2), (1,-2)`]
    //   - Blue Base `(0, 3)` is ONLY adjacent to the 3 Blue starting spaces `(-1, 3), (0, 2), (1, 2)` [offset `(-1,2), (0,2), (1,2)`]
    //   Let's check! In Radius 3 (37 hexes):
    //   If we exclude the 6 outer corner hexes:
    //   - Top-Left outer corner: `(-3, 0)`
    //   - Top-Right outer corner: `(3, -3)`
    //   - Bottom-Left outer corner: `(-3, 3)`
    //   - Bottom-Right outer corner: `(3, 0)`
    //   - AND the 2 extreme side-equator tips or top/bottom shoulders:
    //     Wait: in Radius 3, what are all the neighbors of `(0, -3)` that are inside Radius 3?
    //     They are ONLY `(-1, -2), (0, -2), (1, -3)`! Because `(-1, -3), (0, -4), (1, -4)` have radius 4!
    //     And if we also exclude `(-2, -1)` and `(2, 1)`? No, `(-2, -1)` is top-left and `(2, -3)` is top-right.
    //     Wait: what if we exclude the 6 outer cells on `q = ±3`:
    //     Look at `q = -3` and `q = +3` in Radius 3:
    //     `q = -3` has 4 cells: `(-3, 0), (-3, 1), (-3, 2), (-3, 3)`.
    //     `q = +3` has 4 cells: `(3, -3), (3, -2), (3, -1), (3, 0)`.
    //     If we exclude 3 cells on `q = -3` (`(-3, 0), (-3, 2), (-3, 3)`)? No, why would `(-3, 1)` and `(-3, 2)` differ? Because in Flat-Topped hexes, `(-3, 1)` is at `y = -0.5` and `(-3, 2)` is at `y = +0.5`.
    //     Whereas if we rotate the hex grid by 30 degrees (Pointy-Topped hexes) OR if we check which 6 cells in Radius-3 can be removed:
    //     Wait: in **Pointy-Topped** hexes, the 6 cells at `q = ±3`? No, in Pointy-Topped hexes, `y = 1.5 * r`, so `r = 0` is the horizontal equator!
    //     And on `r = 0`, the extreme left cell is `(-3, 0)` and the extreme right cell is `(+3, 0)`!
    //     Hold everything! Calculate the rows `r` of a Radius-3 **Pointy-Topped** hex grid!
    //     In a Radius-3 Pointy-Topped hex grid:
    //     - `r = -3` has 4 cells: `(0, -3), (1, -3), (2, -3), (3, -3)`
    //     - `r = -2` has 5 cells: `(-1, -2), (0, -2), (1, -2), (2, -2), (3, -2)`
    //     - `r = -1` has 6 cells: `(-2, -1), (-1, -1), (0, -1), (1, -1), (2, -1), (3, -1)`
    //     - `r =  0` has 7 cells: `(-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0)`
    //     - `r = +1` has 6 cells: `(-3, 1), (-2, 1), (-1, 1), (0, 1), (1, 1), (2, 1)`
    //     - `r = +2` has 5 cells: `(-3, 2), (-2, 2), (-1, 2), (0, 2), (1, 2)`
    //     - `r = +3` has 4 cells: `(-3, 3), (-2, 3), (-1, 3), (0, 3)`
    //     Wait: in Flat-Topped hexes, `q` has `[4, 5, 6, 7, 6, 5, 4]` cells!
    //     Look at `q` in Flat-Topped hexes:
    //     - `q =  0` (Center vertical spine) has 7 cells: `(0, -3)` [Red Base], `(0, -2), (0, -1), (0, 0), (0, 1), (0, 2)`, `(0, 3)` [Blue Base].
    //     - `q = -1` has 6 cells, `q = +1` has 6 cells.
    //     - `q = -2` has 5 cells, `q = +2` has 5 cells.
    //     - `q = -3` has 4 cells, `q = +3` has 4 cells.
    //     Now, why are there 31 total cells (29 playable + 2 bases)?
    //     Because on the vertical spine `q = 0` (7 cells), the top and bottom cells `(0, -3)` and `(0, 3)` are the Bases.
    //     On `q = ±1` (6 cells each), the top and bottom cells `(-1, -2), (1, -3)` and `(-1, 3), (1, 2)` are the Starting Spaces.
    //     On `q = ±2` (5 cells each), all 5 cells are playable.
    //     On `q = ±3`, if you remove the 3 outer cells or if you remove the 4 corners `(-3,0), (-3,3), (3,-3), (3,0)` + the 2 inner spine cells? No! What if you remove the 4 corners of `q = ±2` (`(-2, -1), (2, -3), (-2, 3), (2, 1)`)? That's 4 cells.
    //     Wait: what if on `q = -3` and `q = +3` we remove `(-3, 0), (-3, 3), (3, -3), (3, 0)` (4 cells) AND on `q = -3` / `q = +3` we only have 1 middle cell or 2 middle cells?
    //     Wait: if we keep `(-3, 1), (-3, 2)` on the left and `(3, -2), (3, -1)` on the right, that removes 4 cells (leaving 33 cells). To remove 2 more cells so there are **exactly 29 playable hexes + 2 bases = 31 hexes**, which 2 cells in `33` can be removed?
    //     Or what if `q = -3` keeps `(-3, 1)` and `q = +3` keeps `(3, -1)` (removing 6 cells total: `(-3,0), (-3,2), (-3,3), (3,-3), (3,-2), (3,0)`)?
    //     Let's check! If we remove those 6 cells from `q = ±3` (`(-3,0), (-3,2), (-3,3)` on West and `(3,-3), (3,-2), (3,0)` on East):
    //     1) Every single cell in `q ∈ [-2, +2]` (all 29 of them!) is intact!
    //     2) Plus the West flanker `(-3, 1)` and East flanker `(3, -1)` are intact!
    //     3) Total cells = `29 + 2 = 31` hexes (2 Bases + 29 playable hexes)!
    //     4) Even better: `(-3, 1)` and `(3, -1)` are symmetric under 180-degree board rotation `(q, r) -> (-q, -r)`, so Player 1 (Blue) and Player 2 (Red) have **100% identical board topology** from their perspectives!

    const EXCLUDED_KEYS = new Set([
      '-3,0', '-3,2', '-3,3',
      '3,-3', '3,-2', '3,0'
    ]);

    function coordKey(q, r) {
      return `${q},${r}`;
    }

    function parseKey(key) {
      const [q, r] = key.split(',').map(Number);
      return { q, r };
    }

    // Generate the 31 valid board cells (2 Bases + 29 Playable Spaces)
    const BOARD_CELLS = [];
    const BOARD_MAP = new Map();

    function initBoardGeometry() {
      BOARD_CELLS.length = 0;
      BOARD_MAP.clear();
      for (let q = -3; q <= 3; q++) {
        const rMin = Math.max(-3, -q - 3);
        const rMax = Math.min(3, -q + 3);
        for (let r = rMin; r <= rMax; r++) {
          const key = coordKey(q, r);
          if (EXCLUDED_KEYS.has(key)) continue;

          let cellType = 'playable';
          if (q === 0 && r === -3) cellType = 'red_base';
          if (q === 0 && r === 3)  cellType = 'blue_base';

          // Friendly display coordinate (using offset row so starting spaces read (-1,-2),(0,-2),(1,-2) and (-1,2),(0,2),(1,2))
          const displayR = r + (q > 0 ? Math.ceil(q / 2) : Math.floor(q / 2));

          const cell = {
            q,
            r,
            displayQ: q,
            displayR,
            key,
            cellType,
            x: HEX_RADIUS * 1.5 * q,
            y: HEX_RADIUS * Math.sqrt(3) * (r + q / 2)
          };
          BOARD_CELLS.push(cell);
          BOARD_MAP.set(key, cell);
        }
      }
    }

    initBoardGeometry();

    // Starting hex keys adjacent to each base
    const RED_BASE_KEY = '0,-3';
    const BLUE_BASE_KEY = '0,3';
    const RED_START_KEYS = ['-1,-2', '0,-2', '1,-3'];   // Display coords: (-1,-2), (0,-2), (1,-2)
    const BLUE_START_KEYS = ['-1,3', '0,2', '1,2'];     // Display coords: (-1,2),  (0,2),  (1,2)

    // Audio Synthesizer (Tone.js)
    let soundEnabled = true;
    let synth = null;

    function playSfx(type) {
      if (!soundEnabled || typeof Tone === 'undefined') return;
      try {
        if (!synth) {
          synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.12, sustain: 0.05, release: 0.2 }
          }).toDestination();
          synth.volume.value = -10;
        }
        if (Tone.context.state !== 'running') {
          Tone.start();
        }
        const now = Tone.now();
        if (type === 'rotate') {
          synth.triggerAttackRelease('C5', '32n', now);
        } else if (type === 'select') {
          synth.triggerAttackRelease('E5', '32n', now);
        } else if (type === 'deploy') {
          synth.triggerAttackRelease(['C4', 'G4'], '16n', now);
        } else if (type === 'swap') {
          synth.triggerAttackRelease(['D4', 'A4', 'F#5'], '16n', now);
        } else if (type === 'destroy') {
          synth.triggerAttackRelease(['G2', 'C#3'], '8n', now);
        } else if (type === 'refresh') {
          synth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '8n', now);
        } else if (type === 'victory') {
          synth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n', now);
          synth.triggerAttackRelease(['E4', 'G4', 'C5', 'E5'], '4n', now + 0.18);
        } else if (type === 'invalid') {
          synth.triggerAttackRelease('F#2', '16n', now);
        }
      } catch (e) {
        // Ignore audio context restrictions
      }
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
    }

    // Complete Game State
    let gameState = {
      mode: 'ai', // 'ai' or 'pvp'
      turn: 'blue', // 'blue' or 'red'
      turnCount: 1,
      winner: null,
      winReason: '',
      units: {}, // key -> { owner: 'blue'|'red', type: 'basic'|..., rot: 0..5 }
      reserves: {
        blue: {
          available: new Set(ADVANCED_KEYS),
          spent: new Set()
        },
        red: {
          available: new Set(ADVANCED_KEYS),
          spent: new Set()
        }
      },
      selectedUnitType: 'basic',
      selectedRot: 0,
      hoveredKey: null,
      lastAction: null,
      history: []
    };

    function cloneStateSnapshot() {
      const unitsCopy = {};
      for (const [k, u] of Object.entries(gameState.units)) {
        unitsCopy[k] = { ...u };
      }
      return {
        turn: gameState.turn,
        turnCount: gameState.turnCount,
        winner: gameState.winner,
        winReason: gameState.winReason,
        units: unitsCopy,
        reserves: {
          blue: {
            available: new Set(gameState.reserves.blue.available),
            spent: new Set(gameState.reserves.blue.spent)
          },
          red: {
            available: new Set(gameState.reserves.red.available),
            spent: new Set(gameState.reserves.red.spent)
          }
        },
        selectedUnitType: gameState.selectedUnitType,
        selectedRot: gameState.selectedRot,
        lastAction: gameState.lastAction ? JSON.parse(JSON.stringify(gameState.lastAction)) : null
      };
    }

    function resetGame() {
      gameState.turn = 'blue';
      gameState.turnCount = 1;
      gameState.winner = null;
      gameState.winReason = '';
      gameState.units = {};
      gameState.reserves = {
        blue: { available: new Set(ADVANCED_KEYS), spent: new Set() },
        red:  { available: new Set(ADVANCED_KEYS), spent: new Set() }
      };
      gameState.selectedUnitType = 'basic';
      gameState.selectedRot = 0; // Pointing North (upward) for Blue
      gameState.hoveredKey = null;
      gameState.lastAction = null;
      gameState.history = [];

      // Place 3 Blue Basic units on (-1,2), (0,2), (1,2) pointing North (rot 0)
      for (const k of BLUE_START_KEYS) {
        gameState.units[k] = { owner: 'blue', type: 'basic', rot: 0 };
      }
      // Place 3 Red Basic units on (-1,-2), (0,-2), (1,-2) pointing South (rot 3)
      for (const k of RED_START_KEYS) {
        gameState.units[k] = { owner: 'red', type: 'basic', rot: 3 };
      }

      document.getElementById('victoryOverlay').classList.add('hidden');
      document.getElementById('battleLog').innerHTML = '';
      addLogEntry('sys', 'Match initialized. 29 playable hexes + 2 Home Bases online.');
      addLogEntry('blue', 'Blue starts with 3 Basic Strikers connected to Blue Base.');

      updateAllUI();
    }

    function setGameMode(mode) {
      gameState.mode = mode;
      const aiBtn = document.getElementById('modeAiBtn');
      const pvpBtn = document.getElementById('modePvpBtn');
      if (mode === 'ai') {
        aiBtn.className = 'px-2.5 py-1 text-xs font-medium rounded-md transition bg-sky-500/20 text-sky-300 border border-sky-500/40';
        pvpBtn.className = 'px-2.5 py-1 text-xs font-medium rounded-md transition text-slate-400 hover:text-slate-200';
        document.getElementById('redTitle').textContent = 'RED FACTION (AI)';
      } else {
        pvpBtn.className = 'px-2.5 py-1 text-xs font-medium rounded-md transition bg-rose-500/20 text-rose-300 border border-rose-500/40';
        aiBtn.className = 'px-2.5 py-1 text-xs font-medium rounded-md transition text-slate-400 hover:text-slate-200';
        document.getElementById('redTitle').textContent = 'RED FACTION (P2)';
      }
      resetGame();
    }

    // Helper: Get valid board neighbors of a coordinate key
    function getNeighbors(key) {
      const { q, r } = parseKey(key);
      const list = [];
      for (let d = 0; d < 6; d++) {
        const nk = coordKey(q + HEX_DIRS[d].dq, r + HEX_DIRS[d].dr);
        if (BOARD_MAP.has(nk)) {
          list.push({ dir: d, key: nk, cell: BOARD_MAP.get(nk) });
        }
      }
      return list;
    }

    // Get absolute directions a unit attacks given its type and rotation (0..5)
    function getAttackDirections(unitType, rot) {
      const def = UNIT_CATALOG[unitType];
      if (!def) return [];
      return def.rays.map(r => (r + rot) % 6);
    }

    // Get targeted neighbor keys for a unit at `key` with `unitType` and `rot`
    function getAttackedKeys(key, unitType, rot) {
      const { q, r } = parseKey(key);
      const dirs = getAttackDirections(unitType, rot);
      const targets = [];
      for (const d of dirs) {
        const tk = coordKey(q + HEX_DIRS[d].dq, r + HEX_DIRS[d].dr);
        if (BOARD_MAP.has(tk)) {
          targets.push({ dir: d, key: tk, cell: BOARD_MAP.get(tk) });
        }
      }
      return targets;
    }

    // Run Breadth-First Search (BFS) from a player's Home Base to find all connected friendly units
    function getConnectedUnitKeys(unitsMap, owner) {
      const baseKey = owner === 'blue' ? BLUE_BASE_KEY : RED_BASE_KEY;
      const visited = new Set();
      const queue = [baseKey];

      while (queue.length > 0) {
        const curr = queue.shift();
        for (const n of getNeighbors(curr)) {
          if (visited.has(n.key)) continue;
          const u = unitsMap[n.key];
          if (u && u.owner === owner) {
            visited.add(n.key);
            queue.push(n.key);
          }
        }
      }
      return visited;
    }

    /**
     * SIMULATE MOVE & VALIDATE LEGALITY
     * Checks all Arkeon placement/swap rules and returns outcome preview:
     * - valid: boolean
     * - reason: string (if invalid)
     * - actionType: 'deploy' | 'upgrade' | 'downgrade' | 'swap'
     * - directHits: array of keys destroyed by laser
     * - isolatedKeys: array of keys destroyed by BFS supply-line cut
     * - hitsEnemyBase: boolean (instant win!)
     */
    function simulateMove(player, targetKey, unitType, rot, currentUnits = gameState.units, reserves = gameState.reserves) {
      const cell = BOARD_MAP.get(targetKey);
      if (!cell || cell.cellType !== 'playable') {
        return { valid: false, reason: 'Cannot place a unit on a Home Base.' };
      }

      // Check unit availability in reserve
      if (unitType !== 'basic' && !reserves[player].available.has(unitType)) {
        return { valid: false, reason: 'That Advanced unit is not currently available in your reserve.' };
      }

      const existing = currentUnits[targetKey];
      let actionType = 'deploy';

      if (existing) {
        if (existing.owner !== player) {
          return { valid: false, reason: 'Cell is occupied by an enemy unit. Destroy it with lasers first.' };
        }
        // Cannot swap identical unit type & same/different orientation: Arkeon swap requires changing unit type (Basic <-> Advanced or Advanced <-> another Advanced)
        if (existing.type === unitType) {
          return { valid: false, reason: 'Swap requires replacing with a different unit type (e.g. Basic ↔ Advanced).' };
        }
        if (existing.type === 'basic' && unitType !== 'basic') {
          actionType = 'upgrade';
        } else if (existing.type !== 'basic' && unitType === 'basic') {
          actionType = 'downgrade';
        } else {
          actionType = 'swap';
        }
      } else {
        // Must be adjacent to Friendly Base or at least one existing friendly unit
        const friendlyBaseKey = player === 'blue' ? BLUE_BASE_KEY : RED_BASE_KEY;
        const hasFriendlyNeighbor = getNeighbors(targetKey).some(n => {
          if (n.key === friendlyBaseKey) return true;
          const nu = currentUnits[n.key];
          return nu && nu.owner === player;
        });
        if (!hasFriendlyNeighbor) {
          return { valid: false, reason: 'Must deploy adjacent to your Home Base or an existing friendly unit.' };
        }
      }

      const enemy = player === 'blue' ? 'red' : 'blue';
      const friendlyBaseKey = player === 'blue' ? BLUE_BASE_KEY : RED_BASE_KEY;
      const enemyBaseKey = player === 'blue' ? RED_BASE_KEY : BLUE_BASE_KEY;

      // Evaluate laser targets
      const attacked = getAttackedKeys(targetKey, unitType, rot);

      // Rule: Cannot fire into your own Home Base
      if (attacked.some(t => t.key === friendlyBaseKey)) {
        return { valid: false, reason: 'Illegal orientation: You cannot fire lasers at your own Home Base!' };
      }

      const hitsEnemyBase = attacked.some(t => t.key === enemyBaseKey);

      // Rule: Cannot place on the 3 spaces directly adjacent to the Enemy Base UNLESS pointing an attack laser at the Enemy Base
      const isAdjacentToEnemyBase = getNeighbors(targetKey).some(n => n.key === enemyBaseKey);
      if (isAdjacentToEnemyBase && !hitsEnemyBase) {
        return {
          valid: false,
          reason: 'Enemy Base Zone Rule: You may only deploy/swap adjacent to the Enemy Base if firing directly into it!'
        };
      }

      // Clone units and apply placement
      const nextUnits = {};
      for (const [k, u] of Object.entries(currentUnits)) {
        nextUnits[k] = { ...u };
      }
      nextUnits[targetKey] = { owner: player, type: unitType, rot };

      // 1. Direct Laser Destruction (Indiscriminate: destroys both Enemy and Friendly units in targeted cells)
      const directHits = [];
      for (const t of attacked) {
        if (nextUnits[t.key]) {
          directHits.push({ key: t.key, unit: { ...nextUnits[t.key] } });
          delete nextUnits[t.key];
        }
      }

      // 2. Check Supply-Line Continuity via BFS from both bases
      const connectedFriendly = getConnectedUnitKeys(nextUnits, player);

      // Self-preservation rule: The newly placed/swapped unit MUST still be connected to its own Home Base after its immediate friendly fire
      if (!connectedFriendly.has(targetKey)) {
        return {
          valid: false,
          reason: 'Supply-Line Severed: A placed unit cannot destroy its own only connection to your Home Base!'
        };
      }

      const connectedEnemy = getConnectedUnitKeys(nextUnits, enemy);

      // Gather all isolated units (both friendly and enemy that lost connection to their respective base)
      const isolatedHits = [];
      for (const [k, u] of Object.entries(nextUnits)) {
        if (u.owner === player && !connectedFriendly.has(k)) {
          isolatedHits.push({ key: k, unit: { ...u } });
          delete nextUnits[k];
        } else if (u.owner === enemy && !connectedEnemy.has(k)) {
          isolatedHits.push({ key: k, unit: { ...u } });
          delete nextUnits[k];
        }
      }

      return {
        valid: true,
        actionType,
        attacked,
        directHits,
        isolatedHits,
        hitsEnemyBase,
        nextUnits,
        swappedOutType: existing ? existing.type : null
      };
    }

    // Execute a validated move on the live gameState
    function executeMove(player, targetKey, unitType, rot) {
      if (gameState.winner) return false;
      const sim = simulateMove(player, targetKey, unitType, rot);
      if (!sim.valid) {
        playSfx('invalid');
        showFloatingStatus(sim.reason, 'rose');
        return false;
      }

      // Save undo snapshot (if PvP, save single step; if vs AI, we save before human move)
      if (gameState.mode === 'pvp' || player === 'blue') {
        gameState.history.push(cloneStateSnapshot());
      }

      // Update reserve pools for Deploy / Upgrade / Downgrade / Swap
      const playerReserve = gameState.reserves[player];
      if (unitType !== 'basic') {
        playerReserve.available.delete(unitType);
      }
      // If downgrading or swapping an existing Advanced unit on the board, it returns to the player's available hand!
      if (sim.swappedOutType && sim.swappedOutType !== 'basic') {
        playerReserve.available.add(sim.swappedOutType);
      }

      // Apply board state
      gameState.units = sim.nextUnits;

      // Process destroyed Advanced units -> move to each owner's Spent pool
      const allDestroyed = [...sim.directHits, ...sim.isolatedHits];
      const refreshedFactions = [];

      for (const item of allDestroyed) {
        const u = item.unit;
        if (u.type !== 'basic') {
          const ownerRes = gameState.reserves[u.owner];
          ownerRes.available.delete(u.type);
          ownerRes.spent.add(u.type);
        }
      }

      // Check 5-Advanced-Unit Recycling Rule for both factions
      for (const faction of ['blue', 'red']) {
        const res = gameState.reserves[faction];
        if (res.spent.size >= ADVANCED_KEYS.length) {
          res.spent.clear();
          ADVANCED_KEYS.forEach(k => res.available.add(k));
          refreshedFactions.push(faction);
        }
      }

      // Record last action for visual laser & explosion overlays
      gameState.lastAction = {
        player,
        targetKey,
        unitType,
        rot,
        actionType: sim.actionType,
        attackedKeys: sim.attacked.map(a => a.key),
        directHitKeys: sim.directHits.map(d => d.key),
        isolatedHitKeys: sim.isolatedHits.map(i => i.key)
      };

      // Log telemetry
      const cell = BOARD_MAP.get(targetKey);
      const uName = UNIT_CATALOG[unitType].short;
      const actionVerb = sim.actionType === 'deploy' ? 'deployed' : sim.actionType === 'upgrade' ? 'upgraded to' : sim.actionType === 'downgrade' ? 'downgraded to' : 'swapped to';
      let logMsg = `${player.toUpperCase()} ${actionVerb} ${uName} at (${cell.displayQ},${cell.displayR}).`;
      if (sim.directHits.length > 0) {
        logMsg += ` Destroyed ${sim.directHits.length} by laser.`;
      }
      if (sim.isolatedHits.length > 0) {
        logMsg += ` Isolated ${sim.isolatedHits.length} off supply line!`;
      }
      addLogEntry(player, logMsg);

      for (const rf of refreshedFactions) {
        addLogEntry('sys', `♻️ All 5 ${rf.toUpperCase()} Advanced units were spent — full 5-unit reserve refreshed!`);
        playSfx('refresh');
      }

      // Check Victory Conditions:
      // 1. Direct laser hit on Enemy Base
      // 2. All enemy units eliminated from the board
      const enemy = player === 'blue' ? 'red' : 'blue';
      const remainingEnemyUnits = Object.values(gameState.units).filter(u => u.owner === enemy).length;

      if (sim.hitsEnemyBase) {
        gameState.winner = player;
        gameState.winReason = `${player.toUpperCase()} delivered a direct laser strike into the ${enemy.toUpperCase()} Home Base!`;
        playSfx('victory');
        addLogEntry('sys', `🏆 ${gameState.winReason}`);
      } else if (remainingEnemyUnits === 0) {
        gameState.winner = player;
        gameState.winReason = `All ${enemy.toUpperCase()} units were eradicated from the arena!`;
        playSfx('victory');
        addLogEntry('sys', `🏆 ${gameState.winReason}`);
      } else {
        if (allDestroyed.length > 0) {
          playSfx('destroy');
        } else if (sim.actionType === 'deploy') {
          playSfx('deploy');
        } else {
          playSfx('swap');
        }

        // Advance Turn
        gameState.turn = enemy;
        if (enemy === 'blue') gameState.turnCount++;

        // Ensure active player's selectedUnitType is available; otherwise default to 'basic'
        if (
          gameState.selectedUnitType !== 'basic' &&
          !gameState.reserves[gameState.turn].available.has(gameState.selectedUnitType)
        ) {
          gameState.selectedUnitType = 'basic';
        }
        // Default orientation when switching turns in 2P mode
        if (gameState.mode === 'pvp') {
          gameState.selectedRot = gameState.turn === 'blue' ? 0 : 3;
        }
      }

      updateAllUI();
      triggerCombatAnimations(gameState.lastAction);

      // If AI turn, schedule AI decision
      if (!gameState.winner && gameState.mode === 'ai' && gameState.turn === 'red') {
        setTimeout(() => makeAiMove(), 520);
      }

      return true;
    }

    /***********************************************************************
     * TACTICAL HEURISTIC AI (RED FACTION)
     * Evaluates all legal Deploy / Upgrade / Downgrade actions across
     * all 29 playable hexes, unit types, and 6 orientations.
     ***********************************************************************/
    function makeAiMove() {
      if (gameState.winner || gameState.turn !== 'red') return;

      const availableTypes = ['basic', ...Array.from(gameState.reserves.red.available)];
      const candidateMoves = [];

      for (const cell of BOARD_CELLS) {
        if (cell.cellType !== 'playable') continue;
        for (const uType of availableTypes) {
          for (let rot = 0; rot < 6; rot++) {
            const sim = simulateMove('red', cell.key, uType, rot);
            if (!sim.valid) continue;

            // Score this move tactically
            let score = 0;

            // 1. Instant Win is top priority
            if (sim.hitsEnemyBase) {
              score += 100000;
            }

            // 2. Count enemy vs friendly casualties (both direct and isolated)
            let enemyKilled = 0;
            let friendlyKilled = 0;
            for (const h of [...sim.directHits, ...sim.isolatedHits]) {
              const val = h.unit.type === 'basic' ? 28 : 42;
              if (h.unit.owner === 'blue') enemyKilled += val;
              else friendlyKilled += val;
            }
            score += enemyKilled - friendlyKilled * 1.35;

            // 3. Bonus for Supply-Line Cut (isolating enemy units)
            const enemyIsolatedCount = sim.isolatedHits.filter(h => h.unit.owner === 'blue').length;
            score += enemyIsolatedCount * 22;

            // 4. Forward progression toward Blue Base (0, 3)
            const { q, r } = cell;
            const distToBlueBase = (Math.abs(q - 0) + Math.abs(r - 3) + Math.abs(q + r - 3)) / 2;
            score += (6 - distToBlueBase) * 6.5;

            // 5. Downgrade recovery tactic: if an Advanced unit on board has already fired and is safe/backline, recovering it can be smart, but avoid pointlessly wasting Advanced units when a Basic unit gets the exact same kills
            if (uType !== 'basic') {
              if (enemyKilled === 0 && !sim.hitsEnemyBase) {
                score -= 19; // Conserve advanced units for multi-target strikes or breakthroughs
              } else {
                score += 6;
              }
            }

            if (sim.actionType === 'downgrade' && enemyKilled === 0) {
              // Slight penalty unless Red is low on advanced units
              if (gameState.reserves.red.available.size <= 1) {
                score += 12; // Recover advanced unit for reuse!
              } else {
                score -= 14;
              }
            }

            // 6. Check if the placed piece is immediately vulnerable to a basic counter-strike or exposes Red Base
            const blueBaseThreat = getNeighbors(RED_BASE_KEY).some(n => {
              const u = sim.nextUnits[n.key];
              return u && u.owner === 'blue';
            });
            if (blueBaseThreat) score -= 50;

            // Small random jitter for variety
            score += Math.random() * 4;

            candidateMoves.push({ key: cell.key, uType, rot, score });
          }
        }
      }

      if (candidateMoves.length === 0) {
        gameState.winner = 'blue';
        gameState.winReason = 'Red Faction has no legal moves remaining!';
        updateAllUI();
        return;
      }

      candidateMoves.sort((a, b) => b.score - a.score);
      const best = candidateMoves[0];
      executeMove('red', best.key, best.uType, best.rot);
    }

    function undoMove() {
      if (gameState.history.length === 0) return;
      const snap = gameState.history.pop();
      gameState.turn = snap.turn;
      gameState.turnCount = snap.turnCount;
      gameState.winner = snap.winner;
      gameState.winReason = snap.winReason;
      gameState.units = snap.units;
      gameState.reserves = snap.reserves;
      gameState.selectedUnitType = snap.selectedUnitType;
      gameState.selectedRot = snap.selectedRot;
      gameState.lastAction = snap.lastAction;

      document.getElementById('victoryOverlay').classList.add('hidden');
      addLogEntry('sys', '⏪ Rewound to previous turn state.');
      updateAllUI();
    }

    /***********************************************************************
     * SVG RENDERING & INTERACTIVE PREVIEW
     ***********************************************************************/
    function getHexPolygonPoints(cx, cy, radius) {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i);
        const px = cx + radius * Math.cos(angleRad);
        const py = cy + radius * Math.sin(angleRad);
        pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }
      return pts.join(' ');
    }

    // Create SVG markup for any unit (Basic or Advanced) at (cx, cy)
    function createUnitSvgMarkup(owner, unitType, rot, cx, cy, isGhost = false, isCutWarning = false) {
      const color = owner === 'blue' ? '#38bdf8' : '#f43f5e';
      const darkFill = owner === 'blue' ? '#082f49' : '#4c0519';
      const strokeColor = owner === 'blue' ? '#bae6fd' : '#fecdd3';
      const dirs = getAttackDirections(unitType, rot);
      const isAdv = unitType !== 'basic';
      const opacity = isGhost ? '0.68' : '1';
      const extraClass = isCutWarning ? 'cut-warning' : '';

      let svg = `<g class="unit-group ${extraClass}" opacity="${opacity}" transform="translate(${cx}, ${cy})">`;

      // Directional attack pointers (spikes/emitters pointing toward hex edges)
      for (const d of dirs) {
        const angle = HEX_DIRS[d].angle;
        svg += `
          <g transform="rotate(${angle})">
            <line x1="0" y1="0" x2="23" y2="0" stroke="${color}" stroke-width="${isAdv ? 4 : 3.2}" stroke-linecap="round"/>
            <polygon points="26,0 16,-5.5 18.5,0 16,5.5" fill="${strokeColor}" />
          </g>
        `;
      }

      // Outer chassis ring for Advanced units vs clean circle for Basic units
      if (isAdv) {
        const innerHex = getHexPolygonPoints(0, 0, 14.5);
        svg += `<polygon points="${innerHex}" fill="${darkFill}" stroke="${color}" stroke-width="2.4" />`;
        svg += `<circle cx="0" cy="0" r="6.5" fill="${color}" stroke="${strokeColor}" stroke-width="1.2" />`;
      } else {
        svg += `<circle cx="0" cy="0" r="12" fill="${darkFill}" stroke="${color}" stroke-width="2.2" />`;
        svg += `<circle cx="0" cy="0" r="4.5" fill="${strokeColor}" />`;
      }

      // If this unit is marked as endangered by laser or BFS isolation during hover preview
      if (isCutWarning) {
        svg += `
          <circle cx="0" cy="0" r="19" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="4 3"/>
          <line x1="-10" y1="-10" x2="10" y2="10" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
          <line x1="10" y1="-10" x2="-10" y2="10" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
        `;
      }

      svg += `</g>`;
      return svg;
    }

    function renderBoard() {
      const cellsLayer = document.getElementById('hexCellsLayer');
      const supplyLayer = document.getElementById('supplyLinesLayer');
      const unitsLayer = document.getElementById('unitsLayer');
      const previewLayer = document.getElementById('previewLayer');

      // Evaluate hover simulation if human turn
      const canInteract = !gameState.winner && (gameState.mode === 'pvp' || gameState.turn === 'blue');
      let hoverSim = null;
      if (canInteract && gameState.hoveredKey) {
        hoverSim = simulateMove(
          gameState.turn,
          gameState.hoveredKey,
          gameState.selectedUnitType,
          gameState.selectedRot
        );
      }

      const directHitSet = new Set(hoverSim && hoverSim.valid ? hoverSim.directHits.map(h => h.key) : []);
      const isolatedHitSet = new Set(hoverSim && hoverSim.valid ? hoverSim.isolatedHits.map(h => h.key) : []);

      // 1. Render Supply Chain Connection Links
      let supplyHtml = '';
      for (const cell of BOARD_CELLS) {
        const u = gameState.units[cell.key];
        const ownerHere = cell.cellType === 'blue_base' ? 'blue' : cell.cellType === 'red_base' ? 'red' : (u ? u.owner : null);
        if (!ownerHere) continue;

        for (const n of getNeighbors(cell.key)) {
          if (n.key < cell.key) continue; // Draw each undirected link once
          const nu = gameState.units[n.key];
          const ownerThere = n.cell.cellType === 'blue_base' ? 'blue' : n.cell.cellType === 'red_base' ? 'red' : (nu ? nu.owner : null);
          if (ownerHere === ownerThere) {
            const linkColor = ownerHere === 'blue' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(244, 63, 94, 0.22)';
            supplyHtml += `<line x1="${cell.x}" y1="${cell.y}" x2="${n.cell.x}" y2="${n.cell.y}" stroke="${linkColor}" stroke-width="5" stroke-linecap="round"/>`;
          }
        }
      }
      supplyLayer.innerHTML = supplyHtml;

      // 2. Render 31 Hex Cells
      let cellsHtml = '';
      for (const cell of BOARD_CELLS) {
        const pts = getHexPolygonPoints(cell.x, cell.y, HEX_RADIUS - 1.4);
        let fill = '#0f172a';
        let stroke = '#263859';
        let strokeW = '1.6';

        if (cell.cellType === 'red_base') {
          fill = 'url(#redBaseGrad)';
          stroke = '#f43f5e';
          strokeW = '2.8';
        } else if (cell.cellType === 'blue_base') {
          fill = 'url(#blueBaseGrad)';
          stroke = '#38bdf8';
          strokeW = '2.8';
        } else if (RED_START_KEYS.includes(cell.key)) {
          fill = '#16162c';
          stroke = 'rgba(244, 63, 94, 0.4)';
        } else if (BLUE_START_KEYS.includes(cell.key)) {
          fill = '#0f2138';
          stroke = 'rgba(56, 189, 248, 0.4)';
        }

        // Highlight valid placements or hover states
        if (canInteract && cell.cellType === 'playable') {
          const checkSim = simulateMove(gameState.turn, cell.key, gameState.selectedUnitType, gameState.selectedRot);
          if (cell.key === gameState.hoveredKey) {
            if (checkSim.valid) {
              stroke = checkSim.actionType === 'deploy' ? '#10b981' : '#f59e0b';
              strokeW = '3.2';
              fill = checkSim.actionType === 'deploy' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.16)';
            } else {
              stroke = '#ef4444';
              strokeW = '2.6';
              fill = 'rgba(239, 68, 68, 0.14)';
            }
          } else if (checkSim.valid) {
            stroke = checkSim.actionType === 'deploy' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)';
          }
        }

        if (directHitSet.has(cell.key) || isolatedHitSet.has(cell.key)) {
          fill = 'rgba(244, 63, 94, 0.25)';
          stroke = '#f43f5e';
          strokeW = '2.8';
        }

        cellsHtml += `
          <g onmouseenter="onHexEnter('${cell.key}')"
             onmouseleave="onHexLeave('${cell.key}')"
             onclick="onHexClick('${cell.key}')">
            <polygon class="hex-polygon" points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
            <text x="${cell.x}" y="${cell.y + 21}" text-anchor="middle" fill="rgba(148, 163, 184, 0.28)" font-size="7.5" font-family="JetBrains Mono" pointer-events="none">
              ${cell.displayQ},${cell.displayR}
            </text>
          </g>
        `;
      }
      cellsLayer.innerHTML = cellsHtml;

      // 3. Render Home Base Emblems & Active Units
      let unitsHtml = '';
      for (const cell of BOARD_CELLS) {
        if (cell.cellType === 'red_base') {
          unitsHtml += `
            <g transform="translate(${cell.x}, ${cell.y})" pointer-events="none">
              <polygon points="${getHexPolygonPoints(0, 0, 18)}" fill="#4c0519" stroke="#fb7185" stroke-width="2.2"/>
              <circle cx="0" cy="0" r="7" fill="#f43f5e"/>
              <text x="0" y="-23" text-anchor="middle" fill="#fda4af" font-size="8.5" font-family="Orbitron" font-weight="700">RED BASE</text>
            </g>
          `;
        } else if (cell.cellType === 'blue_base') {
          unitsHtml += `
            <g transform="translate(${cell.x}, ${cell.y})" pointer-events="none">
              <polygon points="${getHexPolygonPoints(0, 0, 18)}" fill="#082f49" stroke="#7dd3fc" stroke-width="2.2"/>
              <circle cx="0" cy="0" r="7" fill="#38bdf8"/>
              <text x="0" y="29" text-anchor="middle" fill="#7dd3fc" font-size="8.5" font-family="Orbitron" font-weight="700">BLUE BASE</text>
            </g>
          `;
        }

        const u = gameState.units[cell.key];
        if (u) {
          const isEndangered = directHitSet.has(cell.key) || isolatedHitSet.has(cell.key);
          unitsHtml += createUnitSvgMarkup(u.owner, u.type, u.rot, cell.x, cell.y, false, isEndangered);
        }
      }
      unitsLayer.innerHTML = unitsHtml;

      // 4. Render Hover Ghost Preview & Laser Trajectory Rays
      let previewHtml = '';
      if (canInteract && gameState.hoveredKey) {
        const hCell = BOARD_MAP.get(gameState.hoveredKey);
        if (hCell && hCell.cellType === 'playable' && hoverSim) {
          if (hoverSim.valid) {
            // Draw laser trajectories to targeted adjacent cells
            const beamColor = gameState.turn === 'blue' ? '#38bdf8' : '#f43f5e';
            for (const t of hoverSim.attacked) {
              previewHtml += `
                <line class="laser-beam" x1="${hCell.x}" y1="${hCell.y}" x2="${t.cell.x}" y2="${t.cell.y}"
                      stroke="${beamColor}" stroke-width="4" stroke-dasharray="6 4" stroke-linecap="round" />
                <circle cx="${t.cell.x}" cy="${t.cell.y}" r="8" fill="none" stroke="#f43f5e" stroke-width="2.2" />
              `;
            }

            // Label isolated units with "CUT!" badge
            for (const iso of hoverSim.isolatedHits) {
              const ic = BOARD_MAP.get(iso.key);
              if (ic) {
                previewHtml += `
                  <g transform="translate(${ic.x}, ${ic.y - 22})" pointer-events="none">
                    <rect x="-18" y="-8" width="36" height="13" rx="4" fill="#ef4444" />
                    <text x="0" y="1" text-anchor="middle" fill="#ffffff" font-size="8" font-weight="700" font-family="Orbitron">CUT!</text>
                  </g>
                `;
              }
            }

            // Winning Base Strike Indicator
            if (hoverSim.hitsEnemyBase) {
              const eBaseKey = gameState.turn === 'blue' ? RED_BASE_KEY : BLUE_BASE_KEY;
              const eb = BOARD_MAP.get(eBaseKey);
              previewHtml += `
                <g transform="translate(${eb.x}, ${eb.y})" pointer-events="none">
                  <circle cx="0" cy="0" r="26" fill="none" stroke="#10b981" stroke-width="3.5" stroke-dasharray="5 3"/>
                  <rect x="-42" y="-10" width="84" height="18" rx="5" fill="#10b981"/>
                  <text x="0" y="2" text-anchor="middle" fill="#022c22" font-size="9" font-weight="900" font-family="Orbitron">LETHAL STRIKE!</text>
                </g>
              `;
            }

            // Ghost unit preview
            previewHtml += createUnitSvgMarkup(
              gameState.turn,
              gameState.selectedUnitType,
              gameState.selectedRot,
              hCell.x,
              hCell.y,
              true,
              false
            );
          }
        }
      }
      previewLayer.innerHTML = previewHtml;
    }

    // Brief visual laser burst when a move executes
    function triggerCombatAnimations(action) {
      if (!action) return;
      const fxLayer = document.getElementById('fxLayer');
      const src = BOARD_MAP.get(action.targetKey);
      if (!src) return;

      const color = action.player === 'blue' ? '#38bdf8' : '#f43f5e';
      let html = '';

      for (const tk of action.attackedKeys) {
        const tc = BOARD_MAP.get(tk);
        if (!tc) continue;
        html += `<line x1="${src.x}" y1="${src.y}" x2="${tc.x}" y2="${tc.y}" stroke="${color}" stroke-width="6" stroke-linecap="round" opacity="0.9"/>`;
      }

      for (const dk of [...action.directHitKeys, ...action.isolatedHitKeys]) {
        const dc = BOARD_MAP.get(dk);
        if (!dc) continue;
        html += `<circle cx="${dc.x}" cy="${dc.y}" r="22" fill="rgba(244, 63, 94, 0.35)" stroke="#f43f5e" stroke-width="3"/>`;
      }

      fxLayer.innerHTML = html;
      setTimeout(() => {
        fxLayer.innerHTML = '';
      }, 420);
    }

    // Render Reserve Unit Cards & Orientation Dial
    function renderPalettesAndDial() {
      for (const faction of ['blue', 'red']) {
        const container = document.getElementById(`${faction}Palette`);
        const isCurrentTurn = gameState.turn === faction && !gameState.winner;
        const canSelect = isCurrentTurn && (gameState.mode === 'pvp' || faction === 'blue');

        const allTypes = ['basic', ...ADVANCED_KEYS];
        let html = '';

        for (let idx = 0; idx < allTypes.length; idx++) {
          const uType = allTypes[idx];
          const def = UNIT_CATALOG[uType];
          const isAvailable = uType === 'basic' || gameState.reserves[faction].available.has(uType);
          const isSelected = isCurrentTurn && gameState.selectedUnitType === uType;

          const activeBorder = faction === 'blue'
            ? (isSelected ? 'border-sky-400 bg-sky-500/20 shadow-md shadow-sky-500/15' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700')
            : (isSelected ? 'border-rose-400 bg-rose-500/20 shadow-md shadow-rose-500/15' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700');

          const disabledStyle = !isAvailable ? 'opacity-35 pointer-events-none grayscale' : (canSelect ? 'cursor-pointer' : ' opacity-75 pointer-events-none');
          const previewRot = isCurrentTurn ? gameState.selectedRot : (faction === 'blue' ? 0 : 3);

          html += `
            <button onclick="selectUnitType('${faction}', '${uType}')"
                    class="p-2 rounded-xl border ${activeBorder} ${disabledStyle} transition flex items-center gap-2 text-left relative">
              <div class="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <svg viewBox="-32 -32 64 64" class="w-8 h-8 overflow-visible">
                  ${createUnitSvgMarkup(faction, uType, previewRot, 0, 0, false, false)}
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-bold text-slate-200 truncate">${def.short}</div>
                <div class="text-[10px] ${isAvailable ? 'text-slate-400' : 'text-rose-400'}">
                  ${uType === 'basic' ? '∞ Supply' : (isAvailable ? 'Ready' : 'Spent')}
                </div>
              </div>
              <span class="absolute top-1 right-1.5 text-[9px] font-mono-code text-slate-500">${idx + 1}</span>
            </button>
          `;
        }
        container.innerHTML = html;

        // Update counts & graveyard dots
        const boardCount = Object.values(gameState.units).filter(u => u.owner === faction).length;
        const spentCount = gameState.reserves[faction].spent.size;
        document.getElementById(`${faction}BoardCount`).textContent = boardCount;
        document.getElementById(`${faction}SpentCount`).textContent = `${spentCount} / 5`;

        let dotsHtml = '';
        for (let i = 0; i < 5; i++) {
          const filled = i < spentCount;
          const dotColor = filled
            ? (faction === 'blue' ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]')
            : 'bg-slate-800';
          dotsHtml += `<span class="w-2.5 h-2.5 rounded-full ${dotColor} border border-slate-700"></span>`;
        }
        document.getElementById(`${faction}GraveyardDots`).innerHTML = dotsHtml;
      }

      // Render Orientation Dial Preview
      const dialSvg = document.getElementById('dialPreviewSvg');
      const hexPts = getHexPolygonPoints(0, 0, 32);
      dialSvg.innerHTML = `
        <polygon points="${hexPts}" fill="#0f172a" stroke="#334155" stroke-width="1.8"/>
        ${createUnitSvgMarkup(gameState.turn, gameState.selectedUnitType, gameState.selectedRot, 0, 0, false, false)}
      `;

      const dirInfo = HEX_DIRS[gameState.selectedRot];
      document.getElementById('angleLabel').textContent = `Dir: ${gameState.selectedRot} (${dirInfo.name})`;
      document.getElementById('selectedPieceDesc').textContent = UNIT_CATALOG[gameState.selectedUnitType].desc;
    }

    function updateStatusAndPanels() {
      const turnHeader = document.getElementById('turnHeader');
      const turnOrb = document.getElementById('turnOrb');
      const hint = document.getElementById('tacticalHint');
      const blueBadge = document.getElementById('blueTurnBadge');
      const redBadge = document.getElementById('redTurnBadge');

      document.getElementById('moveCounter').textContent = `Turn ${gameState.turnCount}`;
      document.getElementById('undoBtn').disabled = gameState.history.length === 0;

      if (gameState.winner) {
        const overlay = document.getElementById('victoryOverlay');
        const vTitle = document.getElementById('victoryTitle');
        const vReason = document.getElementById('victoryReason');
        const vBadge = document.getElementById('victoryBadge');

        overlay.classList.remove('hidden');
        if (gameState.winner === 'blue') {
          vTitle.textContent = 'BLUE FACTION VICTORY!';
          vTitle.className = 'font-display text-2xl sm:text-3xl font-black tracking-wider mb-1 text-sky-400';
          vBadge.className = 'w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-2xl border bg-sky-500/20 border-sky-400 text-3xl';
        } else {
          vTitle.textContent = 'RED FACTION VICTORY!';
          vTitle.className = 'font-display text-2xl sm:text-3xl font-black tracking-wider mb-1 text-rose-400';
          vBadge.className = 'w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-2xl border bg-rose-500/20 border-rose-400 text-3xl';
        }
        vReason.textContent = gameState.winReason;
        return;
      }

      if (gameState.turn === 'blue') {
        turnHeader.textContent = "BLUE FACTION'S TURN";
        turnHeader.className = 'font-display text-xs sm:text-sm font-bold tracking-wider text-sky-300';
        turnOrb.className = 'w-3.5 h-3.5 rounded-full bg-sky-400 shadow-[0_0_12px_#38bdf8]';
        hint.textContent = 'Select a unit from your reserve, orient its lasers (R), and click a valid hex to deploy or swap.';
        blueBadge.classList.remove('hidden');
        redBadge.classList.add('hidden');
      } else {
        turnHeader.textContent = gameState.mode === 'ai' ? 'RED AI CALCULATING...' : "RED FACTION'S TURN";
        turnHeader.className = 'font-display text-xs sm:text-sm font-bold tracking-wider text-rose-300';
        turnOrb.className = 'w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e]';
        hint.textContent = gameState.mode === 'ai'
          ? 'Red AI is evaluating supply-line cuts and directional vectors...'
          : 'Red Player: Select a unit, orient its lasers (R), and deploy or swap.';
        blueBadge.classList.add('hidden');
        redBadge.classList.remove('hidden');
      }
    }

    function showFloatingStatus(msg, color = 'rose') {
      const hint = document.getElementById('tacticalHint');
      hint.innerHTML = `<span class="text-${color}-400 font-semibold">⚠️ ${msg}</span>`;
    }

    function addLogEntry(type, text) {
      const log = document.getElementById('battleLog');
      const div = document.createElement('div');
      let badgeColor = 'text-slate-400 border-slate-700 bg-slate-900';
      if (type === 'blue') badgeColor = 'text-sky-300 border-sky-500/30 bg-sky-500/10';
      if (type === 'red') badgeColor = 'text-rose-300 border-rose-500/30 bg-rose-500/10';
      if (type === 'sys') badgeColor = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';

      div.className = `px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug ${badgeColor}`;
      div.textContent = text;
      log.prepend(div);
    }

    function updateAllUI() {
      renderPalettesAndDial();
      updateStatusAndPanels();
      renderBoard();
    }

    /***********************************************************************
     * USER INTERACTION HANDLERS
     ***********************************************************************/
    function selectUnitType(faction, unitType) {
      if (gameState.winner || gameState.turn !== faction) return;
      if (gameState.mode === 'ai' && faction === 'red') return;
      if (unitType !== 'basic' && !gameState.reserves[faction].available.has(unitType)) return;

      gameState.selectedUnitType = unitType;
      playSfx('select');
      updateAllUI();
    }

    function rotateSelection(delta) {
      if (gameState.winner) return;
      gameState.selectedRot = (gameState.selectedRot + delta + 6) % 6;
      playSfx('rotate');
      updateAllUI();
    }

    function onHexEnter(key) {
      gameState.hoveredKey = key;
      const cell = BOARD_MAP.get(key);
      if (cell) {
        const sim = simulateMove(gameState.turn, key, gameState.selectedUnitType, gameState.selectedRot);
        const statusTag = cell.cellType !== 'playable'
          ? cell.cellType.toUpperCase()
          : (sim.valid ? sim.actionType.toUpperCase() : 'BLOCKED');
        document.getElementById('hoverCoordBadge').textContent = `Hex (${cell.displayQ}, ${cell.displayR}) • ${statusTag}`;
        if (!sim.valid && cell.cellType === 'playable') {
          document.getElementById('tacticalHint').innerHTML = `<span class="text-amber-300">${sim.reason}</span>`;
        }
      }
      renderBoard();
    }

    function onHexLeave(key) {
      if (gameState.hoveredKey === key) {
        gameState.hoveredKey = null;
        document.getElementById('hoverCoordBadge').textContent = 'Hex: --';
        updateStatusAndPanels();
        renderBoard();
      }
    }

    function onHexClick(key) {
      if (gameState.winner) return;
      if (gameState.mode === 'ai' && gameState.turn === 'red') return;
      executeMove(gameState.turn, key, gameState.selectedUnitType, gameState.selectedRot);
    }

    // Keyboard & Scroll Wheel Support
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'r' || k === 'e') {
        e.preventDefault();
        rotateSelection(1);
      } else if (k === 'q') {
        e.preventDefault();
        rotateSelection(-1);
      } else if (k === 'z') {
        e.preventDefault();
        undoMove();
      } else if (['1', '2', '3', '4', '5', '6'].includes(k)) {
        const idx = parseInt(k, 10) - 1;
        const allTypes = ['basic', ...ADVANCED_KEYS];
        if (allTypes[idx]) {
          selectUnitType(gameState.turn, allTypes[idx]);
        }
      }
    });

    document.getElementById('arkeonBoard').addEventListener('wheel', (e) => {
      e.preventDefault();
      rotateSelection(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    /***********************************************************************
     * MODALS & GITHUB PAGES 3-FILE SOURCE EXPORTER
     ***********************************************************************/
    let currentExportTab = 'html';

    function openModal(id) {
      document.getElementById(id).classList.remove('hidden');
      if (id === 'exportModal') {
        switchExportTab(currentExportTab);
      }
    }

    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
    }

    function generateSeparatedFiles() {
      const cssContent = document.querySelector('style').innerHTML.trim();
      const jsContent = document.getElementById('arkeonEngineScript').innerHTML.trim();

      // Build clean standalone index.html that links style.css and index.js
      const bodyClone = document.body.cloneNode(true);
      const scriptInClone = bodyClone.querySelector('#arkeonEngineScript');
      if (scriptInClone) scriptInClone.remove();
      const exportModalInClone = bodyClone.querySelector('#exportModal');
      if (exportModalInClone) exportModalInClone.remove();

      const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ARKEON — Tactical Hexagonal Abstract Strategy</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css" />
</head>
<body class="cyber-grid flex flex-col min-h-screen">
${bodyClone.innerHTML.trim()}
  <script src="index.js"><\/script>
</body>
</html>`;

      return {
        html: { filename: 'index.html', content: htmlContent },
        css:  { filename: 'style.css',  content: cssContent },
        js:   { filename: 'index.js',   content: jsContent }
      };
    }

    function switchExportTab(tab) {
      currentExportTab = tab;
      const files = generateSeparatedFiles();
      document.getElementById('exportCodeArea').value = files[tab].content;

      for (const t of ['html', 'css', 'js']) {
        const btn = document.getElementById(`tabBtn_${t}`);
        if (t === tab) {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-mono-code font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-mono-code font-semibold text-slate-400 hover:text-white';
        }
      }
    }

    function copyExportFile() {
      const area = document.getElementById('exportCodeArea');
      area.select();
      document.execCommand('copy');
      const btnText = document.getElementById('copyBtnText');
      btnText.textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        btnText.textContent = 'Copy File Content';
      }, 1800);
    }

    function downloadCurrentExportFile() {
      const files = generateSeparatedFiles();
      const fileObj = files[currentExportTab];
      const blob = new Blob([fileObj.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileObj.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    window.onload = function () {
      resetGame();
    };