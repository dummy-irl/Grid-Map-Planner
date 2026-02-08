const board = document.getElementById("board");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const createMainBtn = document.getElementById("createGrid");

const pieceRowsInput = document.getElementById("pieceRows");
const pieceColsInput = document.getElementById("pieceCols");
const addPieceBtn = document.getElementById("addPiece");
const pieceList = document.getElementById("pieceList");

const CELL_SIZE = 30;

let mainRows = 0;
let mainCols = 0;

// occupancy[r][c] = null or pieceId
let occupancy = [];

// placed pieces: id -> { id, pr, pc, r, c, color, el }
const placedPieces = new Map();
let pieceIdSeq = 1;

// drag state
let drag = null;

createMainBtn.addEventListener("click", createMainGrid);
addPieceBtn.addEventListener("click", addPiece);

// prevent right-click menu on board area
board.addEventListener("contextmenu", (e) => e.preventDefault());

// start
createMainGrid();

/* ---------------- COLOR HELPERS ---------------- */

function randomColorHex() {
  // bright-ish colors: keep each channel in 80..255
  const ch = () => (80 + Math.floor(Math.random() * 176)).toString(16).padStart(2, "0");
  return `#${ch()}${ch()}${ch()}`;
}

/* ---------------- MAIN GRID ---------------- */

function createMainGrid() {
  mainRows = Number(rowsInput.value);
  mainCols = Number(colsInput.value);

  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${mainCols}, ${CELL_SIZE}px)`;

  occupancy = Array.from({ length: mainRows }, () => Array(mainCols).fill(null));
  placedPieces.clear();

  for (let r = 0; r < mainRows; r++) {
    for (let c = 0; c < mainCols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      board.appendChild(cell);
    }
  }
}

/* ---------------- SIDEBAR PIECES ---------------- */

function addPiece() {
  const pr = Number(pieceRowsInput.value);
  const pc = Number(pieceColsInput.value);

  const item = document.createElement("div");
  item.className = "pieceItem";

  const header = document.createElement("div");
  header.className = "pieceHeader";

  const label = document.createElement("div");
  label.textContent = `${pr}×${pc}`;

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.className = "colorPicker";
  colorInput.value = randomColorHex();

  const removeBtn = document.createElement("button");
  removeBtn.className = "removeBtn";
  removeBtn.type = "button";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    item.remove();
  });

  header.appendChild(label);
  header.appendChild(colorInput);
  header.appendChild(removeBtn);

  const pieceGrid = document.createElement("div");
  pieceGrid.className = "pieceGrid";
  pieceGrid.style.gridTemplateColumns = `repeat(${pc}, ${CELL_SIZE}px)`;
  pieceGrid.style.setProperty("--piece-color", colorInput.value);

  colorInput.addEventListener("input", () => {
    pieceGrid.style.setProperty("--piece-color", colorInput.value);
  });

  for (let r = 0; r < pr; r++) {
    for (let c = 0; c < pc; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      pieceGrid.appendChild(cell);
    }
  }

  pieceGrid.addEventListener("pointerdown", (e) => {
    // don’t drag if clicking a button or the color input
    if (e.target && e.target.closest && e.target.closest("button")) return;
    if (e.target && e.target.closest && e.target.closest("input")) return;

    startDragFromSidebar(e, pr, pc, colorInput.value);
  });

  item.appendChild(header);
  item.appendChild(pieceGrid);
  pieceList.prepend(item);
}

/* ---------------- DRAGGING ---------------- */

function startDragFromSidebar(e, pr, pc, color) {
  e.preventDefault();

  const ghostEl = createGhost(pr, pc, color);

  // center under cursor
  const offsetX = (pc * CELL_SIZE) / 2;
  const offsetY = (pr * CELL_SIZE) / 2;

  drag = {
    source: "sidebar",
    id: null,
    pr, pc,
    color,
    ghostEl,
    offsetX,
    offsetY,
    original: null
  };

  document.addEventListener("pointermove", onDragMove, { passive: false });
  document.addEventListener("pointerup", onDragEnd, { passive: false });
  document.addEventListener("keydown", onDragKeyDown);
}

function startDragPlaced(e, id) {
  // don’t drag if clicking a button
  if (e.target && e.target.closest && e.target.closest("button")) return;

  e.preventDefault();

  const p = placedPieces.get(id);
  if (!p) return;

  // pointer offset inside the rectangle (so it doesn't jump)
  const rect = p.el.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  // temporarily clear occupancy for this piece while moving
  setOccupancyForPiece(id, p.r, p.c, p.pr, p.pc, null);

  const ghostEl = createGhost(p.pr, p.pc, p.color);

  drag = {
    source: "placed",
    id,
    pr: p.pr,
    pc: p.pc,
    color: p.color,
    ghostEl,
    offsetX,
    offsetY,
    original: { r: p.r, c: p.c, pr: p.pr, pc: p.pc }
  };

  document.addEventListener("pointermove", onDragMove, { passive: false });
  document.addEventListener("pointerup", onDragEnd, { passive: false });
  document.addEventListener("keydown", onDragKeyDown);
}

function onDragKeyDown(e) {
  if (!drag) return;

  if (e.key === "r" || e.key === "R") {
    // rotate: swap pr <-> pc
    const tmp = drag.pr;
    drag.pr = drag.pc;
    drag.pc = tmp;

    // update ghost size
    drag.ghostEl.style.width = `${drag.pc * CELL_SIZE}px`;
    drag.ghostEl.style.height = `${drag.pr * CELL_SIZE}px`;

    // after rotation, snapping feels best if we center under cursor
    drag.offsetX = (drag.pc * CELL_SIZE) / 2;
    drag.offsetY = (drag.pr * CELL_SIZE) / 2;
  }
}

function createGhost(pr, pc, color = "#50FF50") {
  const ghostEl = document.createElement("div");
  ghostEl.className = "ghost";
  ghostEl.style.width = `${pc * CELL_SIZE}px`;
  ghostEl.style.height = `${pr * CELL_SIZE}px`;
  ghostEl.style.setProperty("--piece-color", color);
  board.appendChild(ghostEl);
  return ghostEl;
}

function onDragMove(e) {
  if (!drag) return;
  e.preventDefault();

  const { r, c } = pointerToCell(e.clientX, e.clientY, drag);

  drag.ghostEl.style.left = `${c * CELL_SIZE}px`;
  drag.ghostEl.style.top = `${r * CELL_SIZE}px`;

  const ok = canPlace(r, c, drag.pr, drag.pc, drag.id);

  // keep piece color when valid, show red when invalid
  drag.ghostEl.style.borderColor = ok ? (drag.color || "#50FF50") : "#ff5050";
}

function onDragEnd(e) {
  if (!drag) return;
  e.preventDefault();

  const { r, c } = pointerToCell(e.clientX, e.clientY, drag);
  const ok = canPlace(r, c, drag.pr, drag.pc, drag.id);

  if (drag.source === "sidebar") {
    if (ok) placeNewPiece(r, c, drag.pr, drag.pc, drag.color);
  } else if (drag.source === "placed") {
    const id = drag.id;
    const p = placedPieces.get(id);

    if (ok) {
      p.r = r;
      p.c = c;
      p.pr = drag.pr;
      p.pc = drag.pc;

      p.el.style.left = `${c * CELL_SIZE}px`;
      p.el.style.top = `${r * CELL_SIZE}px`;
      p.el.style.width = `${p.pc * CELL_SIZE}px`;
      p.el.style.height = `${p.pr * CELL_SIZE}px`;
      p.el.style.gridTemplateColumns = `repeat(${p.pc}, ${CELL_SIZE}px)`;

      setOccupancyForPiece(id, p.r, p.c, p.pr, p.pc, id);
    } else {
      p.r = drag.original.r;
      p.c = drag.original.c;
      p.pr = drag.original.pr;
      p.pc = drag.original.pc;

      p.el.style.left = `${p.c * CELL_SIZE}px`;
      p.el.style.top = `${p.r * CELL_SIZE}px`;
      p.el.style.width = `${p.pc * CELL_SIZE}px`;
      p.el.style.height = `${p.pr * CELL_SIZE}px`;
      p.el.style.gridTemplateColumns = `repeat(${p.pc}, ${CELL_SIZE}px)`;

      setOccupancyForPiece(id, p.r, p.c, p.pr, p.pc, id);
    }
  }

  drag.ghostEl.remove();
  drag = null;

  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  document.removeEventListener("keydown", onDragKeyDown);
}

function pointerToCell(clientX, clientY, dragState) {
  const rect = board.getBoundingClientRect();
  let x = clientX - rect.left;
  let y = clientY - rect.top;

  // offset to top-left of rectangle
  x -= dragState.offsetX;
  y -= dragState.offsetY;

  const c = Math.floor(x / CELL_SIZE);
  const r = Math.floor(y / CELL_SIZE);
  return { r, c };
}

/* ---------------- PLACEMENT RULES ---------------- */

function canPlace(r0, c0, pr, pc, ignoreId) {
  if (r0 < 0 || c0 < 0) return false;
  if (r0 + pr > mainRows) return false;
  if (c0 + pc > mainCols) return false;

  for (let r = r0; r < r0 + pr; r++) {
    for (let c = c0; c < c0 + pc; c++) {
      const occ = occupancy[r][c];
      if (occ !== null && occ !== ignoreId) return false;
    }
  }
  return true;
}

function setOccupancyForPiece(id, r0, c0, pr, pc, value) {
  for (let r = r0; r < r0 + pr; r++) {
    for (let c = c0; c < c0 + pc; c++) {
      occupancy[r][c] = value;
    }
  }
}

/* ---------------- REMOVE ---------------- */

function removePlacedPiece(id) {
  const p = placedPieces.get(id);
  if (!p) return;

  setOccupancyForPiece(id, p.r, p.c, p.pr, p.pc, null);
  p.el.remove();
  placedPieces.delete(id);
}

/* ---------------- CREATE PLACED PIECE ---------------- */

function placeNewPiece(r0, c0, pr, pc, color = "#50FF50") {
  const id = `p${pieceIdSeq++}`;

  setOccupancyForPiece(id, r0, c0, pr, pc, id);

  const placed = document.createElement("div");
  placed.className = "placedPiece";
  placed.dataset.id = id;

  placed.style.left = `${c0 * CELL_SIZE}px`;
  placed.style.top = `${r0 * CELL_SIZE}px`;
  placed.style.width = `${pc * CELL_SIZE}px`;
  placed.style.height = `${pr * CELL_SIZE}px`;
  placed.style.gridTemplateColumns = `repeat(${pc}, ${CELL_SIZE}px)`;
  placed.style.setProperty("--piece-color", color);

  // fill it with cells so it looks like the sidebar preview
  for (let r = 0; r < pr; r++) {
    for (let c = 0; c < pc; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      placed.appendChild(cell);
    }
  }

  // left click drag
  placed.addEventListener("pointerdown", (e) => startDragPlaced(e, id));

  // right click remove
  placed.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    removePlacedPiece(id);
  });

  board.appendChild(placed);
  placedPieces.set(id, { id, pr, pc, r: r0, c: c0, color, el: placed });
}
