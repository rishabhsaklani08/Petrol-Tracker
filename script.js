// script.js
const TANK_CAPACITY = 5; // liters (used for validation/warning)
const form = document.getElementById('fuelForm');
const saveBtn = document.getElementById('saveBtn');
const tableBody = document.querySelector('#fuelTable tbody');

let logs = JSON.parse(localStorage.getItem('fuelLogs')) || [];
let editId = null; // store id of entry being edited (not array index)

// --- Utilities ---
function saveLogs() {
  localStorage.setItem('fuelLogs', JSON.stringify(logs));
}

function recomputeAll() {
  // normalize numeric types
  logs.forEach(l => {
    l.liters = parseFloat(l.liters);
    l.amount = parseFloat(l.amount);
    l.rate = parseFloat(l.rate);
    l.meter = parseInt(l.meter, 10);
    l.mileage = null;
    l.cost = null;
  });

  // sort by odometer ascending (chronological by distance)
  logs.sort((a, b) => a.meter - b.meter);

  // compute mileage & cost for each entry starting from the second
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1];
    const curr = logs[i];
    const distance = curr.meter - prev.meter;

    if (distance > 0 && curr.liters > 0) {
      // liters added on current fill == fuel consumed since previous full tank
      curr.mileage = (distance / curr.liters).toFixed(2);
      curr.cost = (curr.amount / distance).toFixed(2);
    } else {
      curr.mileage = null;
      curr.cost = null;
    }
  }
}

function renderTable() {
  tableBody.innerHTML = "";
  logs.forEach((log) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${log.date}</td>
      <td>${log.liters}</td>
      <td>${log.amount}</td>
      <td>${log.rate}</td>
      <td>${log.meter}</td>
      <td>${log.mileage ?? "-"}</td>
      <td>${log.cost ?? "-"}</td>
      <td>
        <button class="edit-btn" onclick="editEntry(${log.id})">Edit</button>
        <button class="delete-btn" onclick="deleteEntry(${log.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  updateSummary();
}

function updateSummary() {
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById("summaryMonth").textContent = currentMonth;

  const monthlyLogs = logs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (monthlyLogs.length === 0) {
    document.getElementById("totalCost").textContent = 0;
    document.getElementById("totalLiters").textContent = 0;
    document.getElementById("avgMileage").textContent = "-";
    document.getElementById("avgCost").textContent = "-";
    return;
  }

  const totalCost = monthlyLogs.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const totalLiters = monthlyLogs.reduce((sum, l) => sum + (parseFloat(l.liters) || 0), 0);
  const mileageEntries = monthlyLogs.filter(l => l.mileage).map(l => parseFloat(l.mileage));
  const costEntries = monthlyLogs.filter(l => l.cost).map(l => parseFloat(l.cost));

  const avgMileage = mileageEntries.length ?
    (mileageEntries.reduce((a, b) => a + b, 0) / mileageEntries.length).toFixed(2) : "-";
  const avgCost = costEntries.length ?
    (costEntries.reduce((a, b) => a + b, 0) / costEntries.length).toFixed(2) : "-";

  document.getElementById("totalCost").textContent = totalCost.toFixed(2);
  document.getElementById("totalLiters").textContent = totalLiters.toFixed(2);
  document.getElementById("avgMileage").textContent = avgMileage;
  document.getElementById("avgCost").textContent = avgCost;
}

// --- Form handling ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = document.getElementById('date').value;
  const liters = parseFloat(document.getElementById('liters').value);
  const amount = parseFloat(document.getElementById('amount').value);
  const rate = parseFloat(document.getElementById('rate').value);
  const meter = parseInt(document.getElementById('meter').value, 10);

  if (isNaN(liters) || isNaN(amount) || isNaN(rate) || isNaN(meter) || !date) {
    alert("Please fill in valid values for all fields.");
    return;
  }

  if (liters > TANK_CAPACITY) {
    if (!confirm(`You entered ${liters} L which is more than tank capacity (${TANK_CAPACITY} L). Continue?`)) {
      return;
    }
  }

  const entry = {
    id: editId ?? Date.now(),
    date,
    liters,
    amount,
    rate,
    meter
  };

  if (editId !== null) {
    // find by id and update
    const idx = logs.findIndex(l => l.id === editId);
    if (idx !== -1) {
      logs[idx] = entry;
    } else {
      logs.push(entry);
    }
    editId = null;
    saveBtn.textContent = "Add Entry";
  } else {
    logs.push(entry);
  }

  recomputeAll();
  saveLogs();
  renderTable();
  form.reset();
});

// --- Edit / Delete (exposed globally so inline onclick works) ---
function deleteEntry(id) {
  if (!confirm("Are you sure you want to delete this entry?")) return;
  logs = logs.filter(l => l.id !== id);
  recomputeAll();
  saveLogs();
  renderTable();
}

function editEntry(id) {
  const idx = logs.findIndex(l => l.id === id);
  if (idx === -1) return;
  const log = logs[idx];
  // populate form
  document.getElementById('date').value = log.date;
  document.getElementById('liters').value = log.liters;
  document.getElementById('amount').value = log.amount;
  document.getElementById('rate').value = log.rate;
  document.getElementById('meter').value = log.meter;
  editId = id;
  saveBtn.textContent = "Update Entry";
}

// initial compute + render
recomputeAll();
renderTable();
