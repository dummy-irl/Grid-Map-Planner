const board = document.getElementById("board");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const createMainBtn = document.getElementById("createGrid");

const pieceRowsInput = document.getElementById("pieceRows");
const pieceColsInput = document.getElementById("pieceCols");
const addPieceBtn = document.getElementById("addPiece");
const pieceList = document.getElementById("pieceList");

const CELL_SIZE = 30; // must match .cell width/height in CSS

let mainRows = 0;
let mainCols = 0;

let occupancy = [];

let pieceIdSeq = 1;

let drag = null;

createMainBtn.addEventListener("click", createMainGrid);
addPieceBtn.addEventListener("click", addPiece);

createMainGrid();

function createMainGrid() {
  mainRows = Number(rowsInput.value);
  mainCols = Number(colsInput.value);

  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${mainCols}, ${CELL_SIZE}px)`;

  occupancy = Array.from({ length: mainRows }, () => Array(mainCols).fill(null));

  for (let r = 0; r < mainRows; r++) {
    for (let c = 0; c < mainCols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      board.appendChild(cell);
    }
  }
}

function addPiece() {
  const pr = Number(pieceRowsInput.value);
  const pc = Number(pieceColsInput.value);

  const item = document.createElement("div");
  item.className = "pieceItem";

  const pieceGrid = document.createElement("div");
  pieceGrid.className = "pieceGrid";
  pieceGrid.dataset.pr = String(pr);
  pieceGrid.dataset.pc = String(pc);

  pieceGrid.style.gridTemplateColumns = `repeat(${pc}, ${CELL_SIZE}px)`;

  for (let r = 0; r < pr; r++) {
    for (let c = 0; c < pc; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      pieceGrid.appendChild(cell);
    }
  }

  pieceGrid.addEventListener("pointerdown", (e) => {
    startDragFromSidebar(e, pr, pc);
  });

  item.appendChild(pieceGrid);
  pieceList.prepend(item);
}

function startDragFromSidebar(e, pr, pc) {
  e.preventDefault();

  const ghostEl = document.createElement("div");
  ghostEl.className = "ghost";
  ghostEl.style.width = `${pc * CELL_SIZE}px`;
  ghostEl.style.height = `${pr * CELL_SIZE}px`;
  board.appendChild(ghostEl);

  drag = { pr, pc, ghostEl };

  document.addEventListener("pointermove", onDragMove, { passive: false });
  document.addEventListener("pointerup", onDragEnd, { passive: false });
}

function onDragMove(e) {
  if (!drag) return;
  e.preventDefault();

  const { r, c } = pointerToCell(e.clientX, e.clientY);

  drag.ghostEl.style.left = `${c * CELL_SIZE}px`;
  drag.ghostEl.style.top = `${r * CELL_SIZE}px`;

  const ok = canPlace(r, c, drag.pr, drag.pc);
  drag.ghostEl.style.borderColor = ok ? "#50FF50" : "#ff5050";
}

function onDragEnd(e) {
  if (!drag) return;
  e.preventDefault();

  const { r, c } = pointerToCell(e.clientX, e.clientY);

  if (canPlace(r, c, drag.pr, drag.pc)) {
    placePiece(r, c, drag.pr, drag.pc);
  }

  drag.ghostEl.remove();
  drag = null;

  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
}

function pointerToCell(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let c = Math.floor(x / CELL_SIZE);
  let r = Math.floor(y / CELL_SIZE);

  return { r, c };
}

function canPlace(r0, c0, pr, pc) {
  if (r0 < 0 || c0 < 0) return false;
  if (r0 + pr > mainRows) return false;
  if (c0 + pc > mainCols) return false;

  for (let r = r0; r < r0 + pr; r++) {
    for (let c = c0; c < c0 + pc; c++) {
      if (occupancy[r][c] !== null) return false;
    }
  }
  return true;
}

function placePiece(r0, c0, pr, pc) {
  const id = `p${pieceIdSeq++}`;

  for (let r = r0; r < r0 + pr; r++) {
    for (let c = c0; c < c0 + pc; c++) {
      occupancy[r][c] = id;
    }
  }

  const placed = document.createElement("div");
  placed.className = "placedPiece";
  placed.style.width = `${pc * CELL_SIZE}px`;
  placed.style.height = `${pr * CELL_SIZE}px`;
  placed.style.left = `${c0 * CELL_SIZE}px`;
  placed.style.top = `${r0 * CELL_SIZE}px`;

  board.appendChild(placed);
}
