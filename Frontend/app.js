const form = document.getElementById("predictForm");
const statusBadge = document.getElementById("status");
const demandLevelEl = document.getElementById("demandLevel");
const predictedDemandEl = document.getElementById("predictedDemand");
const taxisRequiredEl = document.getElementById("taxisRequired");

let chartInstance = null;

// Utility: change status badge
function setStatus(type, text) {
  statusBadge.className = "status-badge"; // reset
  if (type === "idle") statusBadge.classList.add("status-idle");
  if (type === "loading") statusBadge.classList.add("status-loading");
  if (type === "success") statusBadge.classList.add("status-success");
  if (type === "error") statusBadge.classList.add("status-error");
  statusBadge.textContent = text;
}

// Map numeric demand -> label
function getDemandLevelLabel(demand) {
  if (demand < 40) return "Low";
  if (demand < 90) return "Medium";
  if (demand < 150) return "High";
  return "Very High";
}

// Update chart with hourly prediction (dummy from base)
function updateChart(baseDemand) {
  const ctx = document.getElementById("demandChart").getContext("2d");

  // Generate 6-hour labels
  const labels = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000);
    labels.push(t.getHours().toString().padStart(2, "0") + ":00");
  }

  // Simple pattern: demand moves ±20% of base
  const data = labels.map((_, i) => {
    const factor = 0.8 + Math.sin(i / 2) * 0.25 + Math.random() * 0.1;
    return Math.max(5, Math.round(baseDemand * factor));
  });

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Predicted Rides",
          data,
          tension: 0.35,
          fill: true,
          borderWidth: 2,
          // without specifying colors, Chart.js will use defaults
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb", font: { size: 11 } },
        },
      },
    },
  });
}

// Handle form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const city = document.getElementById("city").value.trim();
  const datetime = document.getElementById("datetime").value;
  const weather = document.getElementById("weather").value;
  const traffic = document.getElementById("traffic").value;
  const event = document.getElementById("event").checked;

  if (!city || !datetime) {
    setStatus("error", "Please fill all the required fields.");
    return;
  }

  setStatus("loading", "Predicting demand using ML model…");

  const payload = {
    city,
    datetime,
    weather,
    traffic,
    event,
  };

  try {
    const response = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Server error " + response.status);
    }
    const data = await response.json();
    const predictedDemand = data.predicted_demand;
    const taxisRequired = data.taxis_required;
    const level = getDemandLevelLabel(predictedDemand);
    demandLevelEl.textContent = level;
    predictedDemandEl.textContent = predictedDemand;
    taxisRequiredEl.textContent = taxisRequired;
    updateChart(predictedDemand);
    setStatus("success", "Prediction generated successfully.");
  } catch (err) {
    console.error(err);
    const fallback = Math.floor(50 + Math.random() * 100);
    const level = getDemandLevelLabel(fallback);
    const taxis = Math.round(fallback * 0.7);

    demandLevelEl.textContent = level + " (demo)";
    predictedDemandEl.textContent = fallback + " (demo)";
    taxisRequiredEl.textContent = taxis + " (demo)";

    updateChart(fallback);
    setStatus(
      "error",
      "Could not reach backend – showing demo prediction. Check Flask/ML server."
    );
  }
});

// initial status
setStatus("idle", "Waiting for input…");
