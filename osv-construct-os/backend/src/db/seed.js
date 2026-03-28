/**
 * Seed script — populates the SQLite database with realistic Melbourne
 * construction data so the dashboard has real numbers to display.
 *
 * Usage:  node src/db/seed.js
 * Run from the backend/ directory.
 */

import db from './index.js';
import { randomUUID } from 'crypto';

const now = Date.now();
const DAY = 86400000;
const HOUR = 3600000;

// ── helpers ──────────────────────────────────────────────────────────
function id() { return randomUUID(); }
function daysAgo(n) { return now - n * DAY; }
function hoursAgo(n) { return now - n * HOUR; }
function futureDate(days) {
  const d = new Date(now + days * DAY);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD text for due_date
}
function pastDate(days) {
  const d = new Date(now - days * DAY);
  return d.toISOString().split('T')[0];
}

// ── Subcontractors ───────────────────────────────────────────────────
const subs = [
  { name: 'Dean Morello',    business: 'Morello Carpentry',       trade: 'Carpentry',    crew_size: 4, rate: 85,  phone: '0412 345 678', email: 'dean@morello.com.au',    tier: 'Gold',   rating: 4.8, jobs: 22 },
  { name: 'Shaz Patel',      business: 'Patel Electrical',        trade: 'Electrical',   crew_size: 3, rate: 95,  phone: '0423 456 789', email: 'shaz@patelelectrical.au', tier: 'Silver', rating: 4.5, jobs: 14 },
  { name: 'Liam O\'Brien',   business: 'OB Plumbing',             trade: 'Plumbing',     crew_size: 2, rate: 90,  phone: '0434 567 890', email: 'liam@obplumbing.com.au',  tier: 'Gold',   rating: 4.7, jobs: 18 },
  { name: 'Marco Rossi',     business: 'Rossi Tiling & Stone',    trade: 'Tiling',       crew_size: 3, rate: 80,  phone: '0445 678 901', email: 'marco@rossitiling.au',    tier: 'Iron',   rating: 4.2, jobs: 8  },
  { name: 'Amy Chen',        business: 'Chen Painting Co',        trade: 'Painting',     crew_size: 5, rate: 70,  phone: '0456 789 012', email: 'amy@chenpainting.com.au', tier: 'Gold',   rating: 4.9, jobs: 31 },
  { name: 'Tom Westbrook',   business: 'Westbrook Demo',          trade: 'Demolition',   crew_size: 6, rate: 75,  phone: '0467 890 123', email: 'tom@westbrookdemo.au',    tier: 'Silver', rating: 4.3, jobs: 11 },
  { name: 'Nina Kaur',       business: 'Kaur Joinery',            trade: 'Cabinetry',    crew_size: 3, rate: 88,  phone: '0478 901 234', email: 'nina@kaurjoinery.com.au', tier: 'Silver', rating: 4.6, jobs: 15 },
  { name: 'Jake Sullivan',   business: 'Sullivan Roofing',        trade: 'Roofing',      crew_size: 4, rate: 82,  phone: '0489 012 345', email: 'jake@sullivanroof.au',    tier: 'Iron',   rating: 4.1, jobs: 6  },
];

const subIds = [];
const insertSub = db.prepare(`
  INSERT OR IGNORE INTO subcontractors (id, name, business, trade, crew_size, rate_per_hr, phone, email, tier, rating, jobs_completed, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const s of subs) {
  const sid = id();
  subIds.push({ id: sid, name: s.name, trade: s.trade });
  insertSub.run(sid, s.name, s.business, s.trade, s.crew_size, s.rate, s.phone, s.email, s.tier, s.rating, s.jobs, daysAgo(60));
}

// ── Leads ────────────────────────────────────────────────────────────
const leads = [
  // New leads (recent)
  { client: 'Sarah Mitchell',   suburb: 'Richmond',     title: 'Kitchen Renovation',       trade: 'Carpentry',   stage: 'New',        value: 45000,  daysOld: 1 },
  { client: 'James Thornton',   suburb: 'South Yarra',  title: 'Penthouse Fitout',         trade: 'General',     stage: 'New',        value: 280000, daysOld: 0 },
  { client: 'Priya Sharma',     suburb: 'Fitzroy',      title: 'Cafe Conversion',          trade: 'General',     stage: 'New',        value: 120000, daysOld: 2 },
  // Contacted (some old enough to trigger follow-up alerts)
  { client: 'Michael Wong',     suburb: 'Brunswick',    title: 'Retail Shell Fitout',      trade: 'General',     stage: 'Contacted',  value: 95000,  daysOld: 5 },
  { client: 'Emma Davis',       suburb: 'Collingwood',  title: 'Warehouse Office Build',   trade: 'Carpentry',   stage: 'Contacted',  value: 75000,  daysOld: 3 },
  { client: 'Daniel Kim',       suburb: 'Prahran',      title: 'Bathroom Reno x3',         trade: 'Plumbing',    stage: 'Contacted',  value: 38000,  daysOld: 1 },
  // Qualified
  { client: 'Rachel Green',     suburb: 'Hawthorn',     title: 'Heritage Home Extension',  trade: 'General',     stage: 'Qualified',  value: 350000, daysOld: 4 },
  { client: 'Tom Nguyen',       suburb: 'Carlton',      title: 'Medical Clinic Fitout',    trade: 'General',     stage: 'Qualified',  value: 185000, daysOld: 6 },
  // Quoted
  { client: 'Lisa Park',        suburb: 'Toorak',       title: 'Pool House Build',         trade: 'General',     stage: 'Quoted',     value: 220000, daysOld: 8 },
  { client: 'Chris Johnson',    suburb: 'Northcote',    title: 'Deck & Pergola',           trade: 'Carpentry',   stage: 'Quoted',     value: 32000,  daysOld: 10 },
  // Won / Lost
  { client: 'Andrew Bell',      suburb: 'Camberwell',   title: 'Office Refurbishment',     trade: 'General',     stage: 'Won',        value: 112000, daysOld: 14 },
  { client: 'Olivia Martinez',  suburb: 'St Kilda',     title: 'Restaurant Refit',         trade: 'General',     stage: 'Lost',       value: 68000,  daysOld: 20 },
  // Extra open leads for volume
  { client: 'Ben Harper',       suburb: 'Doncaster',    title: 'Granny Flat Build',        trade: 'General',     stage: 'New',        value: 150000, daysOld: 0 },
  { client: 'Megan Liu',        suburb: 'Box Hill',     title: 'Shop Partition',            trade: 'Carpentry',   stage: 'New',        value: 22000,  daysOld: 1 },
  { client: 'Ryan O\'Connor',   suburb: 'Essendon',     title: 'Garage Conversion',        trade: 'General',     stage: 'Qualified',  value: 55000,  daysOld: 3 },
  { client: 'Sophie Laurent',   suburb: 'Brighton',     title: 'Master Suite Reno',        trade: 'General',     stage: 'Contacted',  value: 88000,  daysOld: 4 },
];

const insertLead = db.prepare(`
  INSERT OR IGNORE INTO leads (id, ref_num, client_name, suburb, job_title, trade, stage, estimated_value, source, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < leads.length; i++) {
  const l = leads[i];
  const created = daysAgo(l.daysOld);
  insertLead.run(id(), `L-${2000 + i}`, l.client, l.suburb, l.title, l.trade, l.stage, l.value, 'Website', created, created);
}

// ── Quotes ───────────────────────────────────────────────────────────
const quotes = [
  // Draft quotes — some recent, some >3 days old (triggers "urgent" KPI)
  { client: 'Sarah Mitchell',   trade: 'Carpentry',  summary: 'Full kitchen reno — demolish, frame, cabinetry, benchtops, tiling, painting',     cost: 38000,  margin: 18, status: 'draft',    daysOld: 1,  sentDaysAgo: null },
  { client: 'Priya Sharma',     trade: 'General',    summary: 'Cafe conversion — demo existing, new partition walls, electrical, plumbing, fitout', cost: 98000,  margin: 22, status: 'draft',    daysOld: 2,  sentDaysAgo: null },
  { client: 'Ben Harper',       trade: 'General',    summary: 'Granny flat — slab, frame, clad, roof, internal fitout, plumbing, electrical',      cost: 125000, margin: 20, status: 'draft',    daysOld: 0,  sentDaysAgo: null },
  { client: 'Daniel Kim',       trade: 'Plumbing',   summary: 'Three bathrooms — strip out, waterproof, tile, fixtures, vanities',                 cost: 30000,  margin: 25, status: 'draft',    daysOld: 4,  sentDaysAgo: null },  // urgent (>3 days)
  { client: 'Ryan O\'Connor',   trade: 'General',    summary: 'Garage-to-studio conversion — insulation, lining, electrical, flooring',            cost: 42000,  margin: 20, status: 'draft',    daysOld: 5,  sentDaysAgo: null },  // urgent
  // Sent quotes — some recent, some overdue (>5 days triggers alerts)
  { client: 'Lisa Park',        trade: 'General',    summary: 'Pool house — slab, steel frame, glazing, outdoor kitchen, landscaping',             cost: 185000, margin: 19, status: 'sent',     daysOld: 8,  sentDaysAgo: 6  },  // overdue
  { client: 'Chris Johnson',    trade: 'Carpentry',  summary: 'Merbau deck 60sqm with insulated pergola and fan',                                 cost: 26000,  margin: 23, status: 'sent',     daysOld: 10, sentDaysAgo: 8  },  // overdue
  { client: 'Rachel Green',     trade: 'General',    summary: 'Heritage extension — underpinning, new rear addition, period details',              cost: 290000, margin: 21, status: 'sent',     daysOld: 4,  sentDaysAgo: 2  },
  { client: 'Sophie Laurent',   trade: 'General',    summary: 'Master suite — knock out wall, ensuite, walk-in robe, new window',                 cost: 72000,  margin: 20, status: 'sent',     daysOld: 4,  sentDaysAgo: 1  },
  // Approved / Won / Lost
  { client: 'Andrew Bell',      trade: 'General',    summary: 'Full office refurb — partition, ceiling, electrical, data, paint, carpet',          cost: 92000,  margin: 22, status: 'approved', daysOld: 14, sentDaysAgo: 12 },
  { client: 'Tom Nguyen',       trade: 'General',    summary: 'Medical clinic fitout — consulting rooms, reception, lab, compliance works',        cost: 155000, margin: 19, status: 'won',      daysOld: 20, sentDaysAgo: 18 },
  { client: 'Olivia Martinez',  trade: 'General',    summary: 'Restaurant refit — kitchen exhaust, cool room, dining floor, bar',                 cost: 55000,  margin: 24, status: 'lost',     daysOld: 25, sentDaysAgo: 22 },
];

const insertQuote = db.prepare(`
  INSERT OR IGNORE INTO quotes (id, quote_num, client_name, trade, summary, total_cost, margin, profit, final_client_quote, status, sent_at, generated_json, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
`);

for (let i = 0; i < quotes.length; i++) {
  const q = quotes[i];
  const profit = Math.round(q.cost * q.margin / 100);
  const clientPrice = q.cost + profit;
  const created = daysAgo(q.daysOld);
  const sentAt = q.sentDaysAgo != null ? daysAgo(q.sentDaysAgo) : null;
  insertQuote.run(id(), `Q-${3000 + i}`, q.client, q.trade, q.summary, q.cost, q.margin, profit, clientPrice, q.status, sentAt, created, created);
}

// ── Jobs ─────────────────────────────────────────────────────────────
const jobs = [
  // Active jobs with various statuses
  { title: 'Richmond Office Fitout',      client: 'Andrew Bell',     trade: 'General',    status: 'In Progress', sub: 0, due: futureDate(3),  risk: null,              daysOld: 10 },
  { title: 'Brunswick Retail Shell',      client: 'Michael Wong',    trade: 'Electrical', status: 'In Progress', sub: 1, due: futureDate(1),  risk: 'Material delay — steel frames backordered', daysOld: 12 },
  { title: 'South Yarra Penthouse Reno',  client: 'James Thornton',  trade: 'Cabinetry',  status: 'In Progress', sub: 6, due: futureDate(7),  risk: null,              daysOld: 8  },
  { title: 'Collingwood Warehouse Office',client: 'Emma Davis',      trade: 'Demolition', status: 'Assigned',    sub: 5, due: futureDate(5),  risk: null,              daysOld: 5  },
  { title: 'Carlton Medical Clinic',      client: 'Tom Nguyen',      trade: 'General',    status: 'In Progress', sub: 0, due: futureDate(14), risk: null,              daysOld: 7  },
  { title: 'Hawthorn Heritage Extension', client: 'Rachel Green',    trade: 'General',    status: 'Assigned',    sub: 2, due: futureDate(21), risk: 'Council permit pending', daysOld: 3  },
  // Posted (unassigned) — some old enough to trigger alerts
  { title: 'Prahran Bathroom Renovation', client: 'Daniel Kim',      trade: 'Plumbing',   status: 'Posted',      sub: null, due: futureDate(10), risk: null,            daysOld: 3  },
  { title: 'Fitzroy Cafe Demolition',     client: 'Priya Sharma',    trade: 'Demolition', status: 'Posted',      sub: null, due: futureDate(8),  risk: null,            daysOld: 1  },
  // Completed
  { title: 'Camberwell Kitchen Reno',     client: 'Sarah Mitchell',  trade: 'Carpentry',  status: 'Completed',   sub: 0, due: pastDate(2),   risk: null,              daysOld: 30 },
  { title: 'Northcote Deck & Pergola',    client: 'Chris Johnson',   trade: 'Carpentry',  status: 'Completed',   sub: 0, due: pastDate(5),   risk: null,              daysOld: 25 },
];

const insertJob = db.prepare(`
  INSERT OR IGNORE INTO jobs (id, job_num, title, client_name, trade, status, assigned_sub_id, assigned_sub_name, due_date, risk_flag, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < jobs.length; i++) {
  const j = jobs[i];
  const created = daysAgo(j.daysOld);
  const subRef = j.sub != null ? subIds[j.sub] : null;
  insertJob.run(id(), `J-${4000 + i}`, j.title, j.client, j.trade, j.status, subRef?.id || null, subRef?.name || null, j.due, j.risk, created, created);
}

// ── Summary ──────────────────────────────────────────────────────────
const counts = {
  subcontractors: db.prepare('SELECT COUNT(*) as c FROM subcontractors').get().c,
  leads: db.prepare('SELECT COUNT(*) as c FROM leads').get().c,
  quotes: db.prepare('SELECT COUNT(*) as c FROM quotes').get().c,
  jobs: db.prepare('SELECT COUNT(*) as c FROM jobs').get().c,
};

console.log('\n✓ Seed complete');
console.log(`  Subcontractors: ${counts.subcontractors}`);
console.log(`  Leads:          ${counts.leads}`);
console.log(`  Quotes:         ${counts.quotes}`);
console.log(`  Jobs:           ${counts.jobs}\n`);
