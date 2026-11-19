// ---------- Items (default sample data) ----------
let items = [
  { name: "Book",   weight: 2, value: 100 },
  { name: "Laptop", weight: 5, value: 500 },
  { name: "Bottle", weight: 3, value: 150 },
  { name: "Shoes",  weight: 4, value: 200 },
];

const $ = id => document.getElementById(id);

function renderItems() {
  $("itemsBody").innerHTML = items.map((it, i) =>
    `<tr><td>${it.name}</td><td>${it.weight} kg</td><td>₹${it.value}</td>
     <td><button onclick="removeItem(${i})">✕</button></td></tr>`).join("");
}
function removeItem(i) { items.splice(i, 1); renderItems(); }

$("addBtn").onclick = () => {
  const name = $("name").value.trim();
  const weight = +$("weight").value, value = +$("value").value;
  if (!name || weight <= 0 || value <= 0) return alert("Enter valid name, weight and value");
  items.push({ name, weight, value });
  $("name").value = $("weight").value = $("value").value = "";
  renderItems();
};

// ---------- Genetic Algorithm ----------
// Chromosome = array of 0/1 (1 = item is in the bag)
const randomChromosome = n => Array.from({ length: n }, () => Math.random() < 0.5 ? 1 : 0);

function totals(ch) {
  let w = 0, v = 0;
  ch.forEach((g, i) => { if (g) { w += items[i].weight; v += items[i].value; } });
  return { w, v };
}

// Fitness: total value; if overweight -> 0 (invalid solution)
function fitness(ch, cap) {
  const { w, v } = totals(ch);
  return w > cap ? 0 : v;
}

// Tournament selection (pick best of 3 random)
function select(pop, fits) {
  let best = Math.floor(Math.random() * pop.length);
  for (let k = 0; k < 2; k++) {
    const c = Math.floor(Math.random() * pop.length);
    if (fits[c] > fits[best]) best = c;
  }
  return pop[best];
}

// Single-point crossover
function crossover(a, b) {
  const p = 1 + Math.floor(Math.random() * (a.length - 1 || 1));
  return [a.slice(0, p).concat(b.slice(p)), b.slice(0, p).concat(a.slice(p))];
}

// Bit-flip mutation
const mutate = (ch, rate) => ch.map(g => Math.random() < rate ? 1 - g : g);

function runGA(cap, popSize, gens, mutRate) {
  const n = items.length;
  let pop = Array.from({ length: popSize }, () => randomChromosome(n));
  let best = { ch: null, fit: -1, gen: 0 };
  const bestHist = [], avgHist = [];

  for (let g = 1; g <= gens; g++) {
    const fits = pop.map(c => fitness(c, cap));
    const genBestIdx = fits.indexOf(Math.max(...fits));
    if (fits[genBestIdx] > best.fit) best = { ch: pop[genBestIdx].slice(), fit: fits[genBestIdx], gen: g };
    bestHist.push(Math.max(...fits));
    avgHist.push(fits.reduce((a, b) => a + b, 0) / fits.length);

    // New generation: keep the best (elitism), fill rest with offspring
    const next = [pop[genBestIdx].slice()];
    while (next.length < popSize) {
      const [c1, c2] = crossover(select(pop, fits), select(pop, fits));
      next.push(mutate(c1, mutRate));
      if (next.length < popSize) next.push(mutate(c2, mutRate));
    }
    pop = next;
  }
  return { best, bestHist, avgHist };
}

// ---------- Chart (plain canvas, no libraries) ----------
function drawChart(best, avg) {
  const c = $("chart"), ctx = c.getContext("2d"), W = c.width, H = c.height, pad = 40;
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(...best, 1);
  const x = i => pad + i * (W - 2 * pad) / Math.max(best.length - 1, 1);
  const y = v => H - pad - v / max * (H - 2 * pad);

  ctx.strokeStyle = "#9db8e8"; ctx.fillStyle = "#4b6aa8"; ctx.font = "12px Arial";
  ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
  ctx.fillText(max, 4, pad + 4); ctx.fillText("0", 20, H - pad + 4);
  ctx.fillText("Generation →", W / 2 - 30, H - 10);

  [[avg, "#a9cdfb"], [best, "#1e63d6"]].forEach(([data, color]) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
    data.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)));
    ctx.stroke();
  });
}

// ---------- Run button ----------
$("runBtn").onclick = () => {
  if (!items.length) return alert("Add at least one item");
  const cap = +$("capacity").value, pop = +$("popSize").value,
        gens = +$("generations").value, mut = +$("mutation").value;
  const { best, bestHist, avgHist } = runGA(cap, pop, gens, mut);
  const t = totals(best.ch);
  const chosen = items.filter((_, i) => best.ch[i]).map(it => it.name);

  $("resultCard").hidden = false;
  $("rValue").textContent = t.v;
  $("rWeight").textContent = t.w;
  $("rGen").textContent = best.gen;
  $("rItems").textContent = chosen.length ? chosen.join(", ") : "None (no item fits)";
  drawChart(bestHist, avgHist);
};

renderItems();