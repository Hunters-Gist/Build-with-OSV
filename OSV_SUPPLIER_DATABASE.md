# OSV Construct — Supplier Database Handoff Document
**Version:** 2025.1  
**Purpose:** Full supplier database for the OSV Construct Operating System supplier engine  
**For:** Claude Code — implement this as the complete supplier database in the portal  
**Business:** OSV Construct | Gillian J. Bazerque (Jack) | Melbourne, VIC | 0435 855 190

---

## HOW TO USE THIS DOCUMENT

This file contains every supplier OSV Construct sources materials from across all trade categories. Use it to:

1. **Populate the Supplier Engine** — replace the existing 14 suppliers with this full database
2. **Power the Quote Engine auto-selection** — tier logic and category matching is defined below
3. **Drive material request routing** — when subbies flag urgent material needs, route to correct supplier
4. **Inform offline AI scoring** — product options in the quote generator should reference these brands

---

## TIER SYSTEM LOGIC

The supplier engine uses a 5-tier system. Auto-selection follows this priority order:

```
TIER 1 — Core Supplier       → Default starting point for all jobs
TIER 2 — Specialist          → Override when: quality = Premium OR specific product required
TIER 3 — Fast Access         → Override when: urgency = Urgent OR same-day needed
TIER 4 — Bulk / Direct       → Override when: job size = Large/Bulk OR volume discount needed
TIER 5 — Recycled / Fill     → Override when: material = Fill / Sub-base / Recycled aggregate
```

**OSV RULE: Bunnings Warehouse is ALWAYS listed first for Tier 3 (Fast Access) regardless of trade category.**

### Auto-Selection Scoring (per supplier, out of 10)
- **Price** /10
- **Reliability** /10
- **Speed** /10
- **Quality** /10

Selection priority: Reliability first → Quality second → Price third → Speed for urgent

---

## SUPPLIER DATABASE

### FORMAT PER ENTRY
```
ID | Name | Tier | Categories | Phone | Website | Scores | Notes
```

---

## CATEGORY 1: GENERAL HARDWARE & BUILDING SUPPLIES

| ID | Supplier | Tier | Phone | Website | Price | Reliability | Speed | Quality | Notes |
|----|----------|------|-------|---------|-------|-------------|-------|---------|-------|
| SUP001 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | 7 | 9 | 10 | 7 | ALWAYS FIRST for urgent. 10% markup applied. All Melbourne metro locations |
| SUP002 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | 6 | 9 | 8 | 9 | Primary timber supplier. Trade accounts. Melbourne-wide |
| SUP003 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | 6 | 9 | 7 | 9 | Whole-of-house supply. Craigieburn + Laverton + metro. Trade accounts |
| SUP004 | Mitre 10 (Crameri's South Melbourne) | T3 | 03 9699 8655 | mitre10.com.au | 7 | 8 | 9 | 7 | Local independent. South Melbourne. Trade accounts. Est. 1900 |
| SUP005 | Rex Paine Building Supplies | T1 | — | paines.com.au | 7 | 9 | 7 | 8 | Full range. 90+ years Melbourne. Timber, decking, roofing, mesh |
| SUP006 | A Class Building Materials | T1 | — | aclassbuildingmaterials.com.au | 8 | 8 | 7 | 7 | Fencing, decking, sleepers, pavers, hardware, garden sheds |
| SUP007 | DeMar Hardware | T3 | — | demar.com.au | 7 | 8 | 9 | 7 | Inner-city Melbourne. Drive-thru timber yard. 30+ years |
| SUP008 | VSV Building Supplies | T2 | — | vsvbuildingsupplies.com.au | 7 | 7 | 7 | 7 | Concrete, bricks, steel, glass, insulation, engineered timber |
| SUP009 | Robot Building Supplies | T2 | — | robotbuildingsupplies.com.au | 7 | 7 | 8 | 7 | Roofing, steel, fencing, timber, cladding, fibreglass, polycarb |
| SUP010 | Melbourne Building Materials | T2 | — | melbournebuildingmaterials.com.au | 8 | 7 | 7 | 7 | Plasterboard, studs, fibre cement, insulation, partitioning |
| SUP011 | Total Tools | T3 | 1300 TOT TOOLS | totaltools.com.au | 7 | 8 | 9 | 8 | Tools, fixings, power tools, spray systems, hardware |
| SUP012 | Wettrades Highett | T2 | 03 9555 4108 | wettrades.com.au | 7 | 8 | 8 | 8 | Render, waterproofing, tiling, concrete repair, cladding systems |
| SUP013 | Upside Building | T2 | — | upsidebuilding.com.au | 7 | 8 | 7 | 8 | BGC Innova full range, fibre cement residential & commercial |
| SUP014 | Agnew Building Supplies | T2 | — | agnewbuildingsupplies.com.au | 7 | 8 | 7 | 9 | BGC Innova, Easycraft, James Hardie, Laminex, Weathertex, CSR, Biowood, VistaClad |

---

## CATEGORY 2: DECKING

| ID | Supplier | Tier | Phone | Website | Price | Reliability | Speed | Quality | Notes |
|----|----------|------|-------|---------|-------|-------------|-------|---------|-------|
| SUP020 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | 7 | 9 | 10 | 7 | H4 pine, Merbau, Ekodeck composite, all fixings. Always first urgent |
| SUP021 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | 6 | 9 | 8 | 9 | Hardwood, treated pine, structural framing |
| SUP022 | Demak Timber & Hardware | T1 | 03 8756 3050 | demak.com.au | 7 | 9 | 8 | 9 | Merbau, Spotted Gum, Blackbutt, Ironbark, Modwood, Trex, Millboard, Azek. Custom machining |
| SUP023 | Urbanline Architectural | T2 | 03 9555 4888 | urbanline.com.au | 5 | 9 | 7 | 10 | Premium composite & hardwood. Ekodeck system, Spotted Gum, Merbau |
| SUP024 | Mathews Timber | T2 | 03 9543 5622 | mathewstimber.com.au | 6 | 9 | 7 | 10 | Spotted Gum, Blackbutt, Merbau specialty. Exotic species. Custom mouldings |
| SUP025 | Chippy's Outdoor Clayton | T2 | 03 9755 6811 | chippysoutdoor.com.au | 6 | 8 | 7 | 9 | Composite, timber decking. Showroom display. Clayton VIC. 40+ years |
| SUP026 | Greenhill Timbers | T2 | — | greenhilltimbers.com.au | 6 | 8 | 7 | 9 | Premium decking, composite, screening. Price match guarantee |
| SUP027 | 5Star Fencing & Decking | T1 | — | 5startimberandhardware.com.au | 7 | 8 | 8 | 8 | Treated pine, composite, structural timber. Trade pricing. Melbourne-wide delivery |
| SUP028 | Roots Timber & Hardware | T1 | — | rootstimber.com.au | 7 | 8 | 8 | 8 | Merbau, Spotted Gum, composite, bamboo, artificial grass. 20+ years |
| SUP029 | Westall Timber Springvale | T2 | — | westalltimber.com.au | 7 | 8 | 7 | 8 | Trade decking, building materials. Springvale. Drive-thru warehouse |
| SUP030 | WR Timbers | T2 | — | wrtimbers.com.au | 6 | 8 | 7 | 9 | 45+ species, Modwood, custom mouldings, stair components |
| SUP031 | Elite Timber & Hardware | T2 | — | elitetimber.com.au | 7 | 8 | 8 | 8 | Hardwood decking, fencing, landscaping. Fast delivery VIC |
| SUP032 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | 6 | 9 | 7 | 8 | Trade timber, structural framing, whole-of-house |
| SUP033 | Mitre 10 | T3 | — | mitre10.com.au | 7 | 8 | 9 | 7 | Decking boards, fixings, hardware. Local Melbourne stores |
| SUP034 | Rex Paine Building Supplies | T1 | — | paines.com.au | 7 | 9 | 7 | 8 | Decking boards, flooring, all timber. 90+ years |
| SUP035 | A Class Building Materials | T1 | — | aclassbuildingmaterials.com.au | 8 | 8 | 7 | 7 | Decking, timber treatments, sleepers, hardware |

### Decking Product Options (use in quote material selector)
```
TIMBER DECKING:
- Merbau 90x19mm          → $38/lm    → SUP022 Demak / SUP024 Mathews
- Merbau 140x19mm         → $52/lm    → SUP022 Demak / SUP024 Mathews
- Spotted Gum 90x19mm     → $52/lm    → SUP024 Mathews / SUP023 Urbanline
- Blackbutt 90x19mm       → $48/lm    → SUP024 Mathews / SUP022 Demak
- H4 Treated Pine 90x19mm → $18/lm    → SUP020 Bunnings / SUP021 Bowens
- H4 Treated Pine 140x19mm→ $24/lm    → SUP020 Bunnings / SUP021 Bowens

COMPOSITE DECKING:
- Ekodeck Designer 90mm   → $68/lm    → SUP020 Bunnings EXCLUSIVE
- Ekodeck Classic 90mm    → $55/lm    → SUP020 Bunnings EXCLUSIVE
- Modwood 88x23mm         → $62/lm    → SUP022 Demak / SUP029 Westall
- Trex Composite          → $75/lm    → SUP022 Demak / SUP025 Chippy's
- Millboard                → $95/lm    → SUP022 Demak
```

---

## CATEGORY 3: CLADDING & FEATURE WALLS

### Cladding Brands (what to specify on quotes)

| Brand | Type | Product Range | Application | Key Supplier |
|-------|------|---------------|-------------|--------------|
| James Hardie / Scyon | Fibre cement | Axon (vertical), Linea (weatherboard), Matrix (panels), Stria (shiplap), HardiePlank | External | Bunnings, Bowens, Dahlsens |
| Ekodeck Shiplap Cladding | Composite | Shiplap composite — no paint or seal | External feature | Bunnings EXCLUSIVE |
| Laminex Surround | MDF decorative | VJ100, VJ150, Heritage, Batten, Demi Round, Scallop, Scallop Grande | Internal | Mitre 10, Plyco, Bunnings |
| Laminex Architectural Panels | HPL | Woodgrain decors, seamless walls | Commercial/joinery | Plyco, Laminex direct |
| Easycraft | MDF decorative | easyVJ (60/100/150/300mm), easyREGENCY, easyASCOT, easyGROOVE, easyLINE, easyCLAD, easyBEADED, easyVENEER, Expressions | Internal / semi-exterior | Bunnings, Bowens, Mitre 10 |
| BGC Innova | Fibre cement | Montage (pre-finished), Duracom, Duragrid, Duragroove (100/150/400mm), Durascape, Stratum planks, InterGroove | External residential & commercial | The Wall Store, Upside Building, Agnew |
| Weathertex | Natural hardwood composite | Weathergroove, Selvedge, Weatherboard, Architex wall panels | External — eco-friendly | The Wall Store, Bowens |
| CSR Cemintel | Fibre cement | Barestone, Designer Series, Territory, Edge | Modern facades | Bowens, Dahlsens |
| Hebel (CSR) | AAC aerated concrete | PowerBlock, PowerPanel, PowerFloor | Fire rated, party walls | Wall Warehouse |
| NRG Greenboard | EPS polystyrene | Codemark approved — render finish | Lightweight external | Wall Warehouse, Wettrades |
| Biowood | Composite timber-look | Cladding, screening — no paint required | External feature | Agnew, Urbanline |
| VistaClad | Bamboo composite | Bamboo composite cladding | Premium sustainable | Agnew Building Supplies |
| Shadowclad | Plywood | Grooved plywood exterior | External / feature | Bowens, Dahlsens |
| Specialised VJ/MDF | Primed boards | 45/90/135mm profile, scallop | Internal lining | Specialised Cladding Solutions |
| Dincel | Polymer structural | Structural wall system | Basement / boundary walls | The Wall Store |

### Cladding Suppliers

| ID | Supplier | Tier | Phone | Website | Brands Stocked |
|----|----------|------|-------|---------|----------------|
| SUP050 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | Easycraft, Ekodeck, Scyon/James Hardie, Laminex Surround, Shadowclad |
| SUP051 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | James Hardie full range, BGC Innova, Weathertex, Shadowclad |
| SUP052 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | Fibre cement, weatherboards, lightweight cladding systems |
| SUP053 | Mitre 10 | T3 | — | mitre10.com.au | Laminex Surround, Easycraft, James Hardie, Ekodeck |
| SUP054 | Plyco Melbourne | T2 | — | plyco.com.au | Laminex Surround full range, Laminex Architectural Panels, plywood |
| SUP055 | Specialised Cladding Solutions | T2 | 03 9544 2200 | specialisedcladding.com.au | VJ MDF primed, scallop, profile 45/90/135mm — SPECIALIST |
| SUP056 | Urbanline Architectural | T2 | 03 9555 4888 | urbanline.com.au | Premium composite, Ekodeck system, hardwood cladding |
| SUP057 | The Wall Store Melbourne | T2 | — | thewallstore.com.au | BGC Innova, Weathertex, NRG Greenboard, Hebel, Rondo, insulation |
| SUP058 | Wall Warehouse Melbourne | T2 | — | wallwarehouse.com.au | Hebel SPECIALIST, BGC Innova, CSR, Weathertex, NRG — showroom |
| SUP059 | Chippy's Outdoor Clayton | T2 | 03 9755 6811 | chippysoutdoor.com.au | Timber cladding, screening, privacy panels — showroom |
| SUP060 | Total Clad & Coat | T2 | — | totalcladandcoat.com.au | Hebel + Scyon supply & install + render + paint — full package |
| SUP061 | Wettrades Highett | T2 | 03 9555 4108 | wettrades.com.au | Polystyrene cladding, render systems, fibre cement |
| SUP062 | Robot Building Supplies | T2 | — | robotbuildingsupplies.com.au | Metal cladding, steel panels, fibreglass, polycarb |
| SUP063 | Melbourne Building Materials | T2 | — | melbournebuildingmaterials.com.au | Fibre cement, plasterboard, studs, partitioning, insulation |
| SUP064 | Upside Building | T2 | — | upsidebuilding.com.au | BGC Innova full range — residential & commercial |
| SUP065 | Agnew Building Supplies | T2 | — | agnewbuildingsupplies.com.au | BGC Innova, Easycraft, James Hardie, Laminex, Weathertex, CSR, Biowood, VistaClad |
| SUP066 | Elite Timber & Hardware | T2 | — | elitetimber.com.au | Timber and hardwood cladding |

### Cladding Quick Selector
```
EXTERNAL - weatherboard look     → James Hardie Scyon Linea       → Bowens / Bunnings
EXTERNAL - vertical groove       → James Hardie Scyon Axon        → Bowens / Bunnings
EXTERNAL - modern panels         → BGC Innova Duragroove/Montage  → Wall Store / Upside
EXTERNAL - low maintenance composite → Ekodeck Shiplap            → Bunnings EXCLUSIVE
EXTERNAL - natural/eco           → Weathertex Weathergroove       → Wall Store / Bowens
EXTERNAL - render look           → BGC Innova Durascape / NRG     → Wall Warehouse / Wettrades
EXTERNAL - fire rated            → Hebel PowerPanel / BGC Innova  → Wall Warehouse
INTERNAL - VJ classic            → Easycraft easyVJ 100/150mm    → Bunnings / Bowens / Mitre 10
INTERNAL - Hamptons style        → Easycraft easyREGENCY/ASCOT   → Bunnings / Mitre 10
INTERNAL - contemporary          → Laminex Surround Batten/Scallop → Mitre 10 / Plyco
INTERNAL - shiplap look          → Easycraft easyLINE             → Bunnings / Bowens
INTERNAL - semi-exterior wet     → Easycraft easyCLAD             → Bunnings
INTERNAL - premium commercial    → Laminex Architectural Panels   → Plyco / Laminex direct
INTERNAL - MDF primed boards     → VJ 90/135mm scallop primed     → Specialised Cladding
SCREENING / privacy - no paint   → Biowood composite              → Agnew / Urbanline
```

---

## CATEGORY 4: CARPENTRY & BESPOKE TIMBER

| ID | Supplier | Tier | Phone | Website | Speciality |
|----|----------|------|-------|---------|------------|
| SUP080 | WR Timbers | T2 | — | wrtimbers.com.au | 45+ species, joinery, stair components, benchtops, flooring |
| SUP081 | Mathews Timber | T2 | 03 9543 5622 | mathewstimber.com.au | Exotic/sustainable, custom mouldings, laminating, joinery trade |
| SUP082 | CERES Fair Wood | T2 | — | ceresfairwood.org.au | Sustainable/ethical hardwood, furniture timber, cladding, VIC growers |
| SUP083 | Australian Sustainable Hardwoods ASH | T2 | — | ash.com.au | Tasmanian Oak, American Oak, LVL, MASSLAM, joinery, benchtops |
| SUP084 | Eco Timber Group | T2 | — | ecotimbergroup.com.au | Joinery, stair treads, benchtops — Melbourne based |
| SUP085 | CJ Riley Joinery | T2 | — | cjrileydoorswindows.com.au | Bespoke timber doors, windows, period joinery. Est. 1986 |
| SUP086 | Glencoe Trade Timber | T2 | — | glencoetrade.com.au | Blackbutt, Spotted Gum, Southern Ash, Tasmanian Oak — Central VIC |
| SUP087 | Tile Importer Oakleigh | T2 | — | tileimporter.com.au | Furniture-grade hardwood, dressed & skip-dressed, native/overseas |
| SUP088 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | Trade timber — framing, hardwood, structural, doors |
| SUP089 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | Whole-of-house, frames, trusses, cladding, doors |
| SUP090 | Demak Timber & Hardware | T1 | 03 8756 3050 | demak.com.au | Merbau, Spotted Gum, Blackbutt, composite, custom machining workshop |
| SUP091 | Rex Paine Building Supplies | T1 | — | paines.com.au | Full timber — 90+ years, decking, flooring, roofing |
| SUP092 | DeMar Hardware | T3 | — | demar.com.au | Inner-city, drive-thru yard, 30+ years |
| SUP093 | Mitre 10 | T3 | — | mitre10.com.au | Hardware, timber, trade supplies — multiple Melbourne stores |
| SUP094 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | All hardware, fixings, timber — urgent fallback |

---

## CATEGORY 5: FENCING & SCREENING

| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP100 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | Colorbond, timber palings, posts, rails, mesh, gates. Always first urgent |
| SUP101 | 5Star Fencing & Decking | T1 | — | 5startimberandhardware.com.au | Treated pine, Colorbond, composite, structural posts. Trade pricing |
| SUP102 | Demak Timber & Hardware | T1 | 03 8756 3050 | demak.com.au | Timber fencing, lattice, fence extensions, Modwood screening |
| SUP103 | Roots Timber & Hardware | T1 | — | rootstimber.com.au | Timber fencing, lattice, picket fences, sleepers |
| SUP104 | A Class Building Materials | T1 | — | aclassbuildingmaterials.com.au | Fencing, Colorbond, mesh, gates, rural fencing |
| SUP105 | Robot Building Supplies | T2 | — | robotbuildingsupplies.com.au | Steel fencing, Colorbond, rural fencing, metal products |
| SUP106 | Chippy's Outdoor Clayton | T2 | 03 9755 6811 | chippysoutdoor.com.au | Privacy screening, decorative screening, feature fencing |
| SUP107 | Elite Timber & Hardware | T2 | — | elitetimber.com.au | Timber and Colorbond fencing. Fast delivery VIC |
| SUP108 | Westall Timber Springvale | T2 | — | westalltimber.com.au | Fencing timber, trade pricing |
| SUP109 | Mitre 10 | T3 | — | mitre10.com.au | Fencing, hardware, posts, rails — local Melbourne stores |
| SUP110 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | Trade fencing supply, posts, mesh |

---

## CATEGORY 6: LANDSCAPING & GARDEN CONSTRUCTION

| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP120 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | Pavers, soil, edging, turf, weed mat, all landscaping |
| SUP121 | Melbourne Brick | T1 | 1300 722 102 | melbournebrick.com.au | Pavers, bricks, turf, sleepers, retaining. Glen Iris + Hallam superstores |
| SUP122 | Fulton Brickyard Wantirna | T2 | — | fultonbrickyard.com.au | Bricks, pavers, sleepers, turf, retaining wall blocks |
| SUP123 | Pavers Plus Ringwood | T2 | — | paversplus.com.au | Natural stone, bluestone, limestone, pool coping, synthetic turf. 25 years |
| SUP124 | Midland Brick | T2 | 13 15 40 | midlandbrick.com.au | Pavers, retaining wall blocks, premium landscaping products |
| SUP125 | Outback Sleepers | T1 | 03 9798 2633 | outbacksleepers.com.au | Concrete, timber and hardwood sleepers, retaining walls |
| SUP126 | Fultons Hawthorn/Wantirna/Bayside | T1 | — | cfulton.com.au | Soils, mulch, pavers, sleepers, pebbles, compost, edging. Est. 1954 |
| SUP127 | All Green Nursery Hoppers Crossing | T2 | — | allgreen.com.au | Mulch, soil, pebbles, crushed rock, sand, compost — bulk supply |
| SUP128 | Donnelly's Garden Supplies Cranbourne | T2 | — | donnellysgardensupplies.com.au | Soil, rocks, mulch, turf, pavers, retaining. 60+ years family owned |
| SUP129 | Bayside Garden Supplies | T2 | — | gardensupply.com.au | Topsoil, pebbles, sands, crushed rock, path toppings, river pebbles |
| SUP130 | Deer Park Building & Garden Supplies | T2 | — | dpbgsupplies.com.au | Mulch, pebbles, soil, rock, sand, gravel, bark. Melbourne-wide delivery |
| SUP131 | A Class Building Materials | T1 | — | aclassbuildingmaterials.com.au | Pavers, concrete mixes, sealants, hardware |
| SUP132 | Mitre 10 | T3 | — | mitre10.com.au | Landscaping supplies, edging, soil, fertiliser |

---

## CATEGORY 7: TURF & INSTANT LAWN

| ID | Supplier | Tier | Phone | Website | Varieties | Notes |
|----|----------|------|-------|---------|-----------|-------|
| SUP140 | Lilydale Instant Lawn | T1 | — | lilydaleinstantlawn.com.au | Sir Walter, Eureka Kikuyu VG (VIC exclusive), TifTuf Bermuda, Sir Grange | TRADE ACCOUNTS. 3 VIC farms. Up to 33% trade discount. GPS tracked delivery |
| SUP141 | Coolabah Turf | T1 | — | coolturf.com.au | Sir Walter, Village Green Kikuyu, Santa Ana Couch, TifTuf | Refrigerated delivery. Harvested daily. Tailgate forklift. 6 days/week |
| SUP142 | The Green Centre | T1 | 03 9331 5300 | thegreencentre.com.au | Sir Walter Buffalo, Eureka Kikuyu, TifTuf, RTF Tall Fescue | Est. 1993. Organic soils & mulch. Commercial landscapers preferred |
| SUP143 | Instant Lawn | T2 | 03 9331 5632 | instantlawn.com.au | Sir Walter, Village Green Kikuyu, TifTuf, RTF Tall Fescue | Call ahead for availability. Supply + install service available |
| SUP144 | Austral Turf | T2 | — | australturf.com.au | Sir Walter, Kikuyu | Daily harvest. $160 flat delivery within 30km CBD |
| SUP145 | Melbourne Turf Supplies | T2 | — | melbourneturfsupplies.com.au | Kikuyu, Buffalo, Tall Fescue, Santa Ana, Prestige Buffalo | Also pavers, sleepers, galvanised posts, concrete sealers |

### Turf Variety Reference
```
Sir Walter Buffalo DNA Certified  → Shade: HIGH  | Water: LOW  | Traffic: HIGH | #1 seller
Eureka Kikuyu VG (VIC grown)      → Shade: LOW   | Water: LOW  | Traffic: HIGH | Self-repairing
TifTuf Bermuda                    → Shade: LOW   | Water: VERY LOW | Traffic: HIGH | Drought champion
Sir Grange Zoysia                 → Shade: MED   | Water: VERY LOW | Traffic: LOW  | Ornamental premium
RTF Tall Fescue                   → Shade: MED   | Water: MED  | Traffic: MED  | Year-round green
Santa Ana Couch                   → Shade: LOW   | Water: LOW  | Traffic: MED  | Fine leaf, sunny
Village Green Kikuyu               → Shade: LOW   | Water: LOW  | Traffic: HIGH | Dogs/kids areas
Prestige Soft Leaf Buffalo         → Shade: MED   | Water: LOW  | Traffic: HIGH | Low maintenance

RATE: ~$14-22/m² for standard rolls | Trade pricing 20-33% less than retail
DELIVERY: Same day possible via Coolabah (refrigerated). Lilydale for trade volume
```

---

## CATEGORY 8: SAND, SOIL, CRUSHED ROCK & AGGREGATES

| ID | Supplier | Tier | Phone | Website | Products | Notes |
|----|----------|------|-------|---------|----------|-------|
| SUP150 | Soilworx | T1 | — | soilworx.com.au | Class 2/3 VicRoads crushed rock, 20mm, scoria, stone dust, topsoil, gravel | GPS tracked delivery. Est. 1977. Bulk and bulka bags |
| SUP151 | Cootes Quarry Pakenham | T1 | — | stoneandpebble.com.au | Crushed rock Class 1-4, sands (pipe/brick/turf/packing), pebbles (Goulburn/Nicholson/Ovens River), basalt/scoria/granite aggregates 7-20mm | Family owned. SE Victoria. VicRoads spec |
| SUP152 | Rapid Quarries | T1 | — | rapidquarries.com.au | Crushed rock, sands, topsoil, premium lawn mix, mushroom compost mulch | Melbourne-wide delivery. Removal services available |
| SUP153 | LTE Quarries SE Melbourne | T2 | — | ltequarries.com.au | Crushed rock, aggregates, Type A & B, rubble, blended soils | Quarry direct. SE Melbourne. Fill acceptance |
| SUP154 | Jodha Group Cranbourne | T2 | 03 5902 4659 / 0469 588 615 | jodha.com.au | Sand, topsoil, mulch, crushed rock, crusher dust, aggregates, recycled asphalt, decorative rocks | Cranbourne, Berwick, Narre Warren + all Melbourne suburbs |
| SUP155 | Alex Fraser Group | T5 | 03 9768 2366 | alexfraser.com.au | Recycled aggregates, crushed rock, fill, sub-base — bulk civil | Recycled specialist. Bulk only. Civil-grade |
| SUP156 | Holcim Australia | T4 | — | holcim.com.au | Hard rock, sand, gravel, drainage aggregates, river gravels, concrete/asphalt ingredients | Major quarry. National. Bulk orders |
| SUP157 | Hanson Construction Materials | T4 | 13 HANSON | hanson.com.au | Concrete, aggregates, pre-mix, bulk quarry products | Major supplier. Bulk only. Trade accounts |
| SUP158 | Westernport Sand & Soil | T2 | — | westernportsandandsoil.com.au | Sand, soil, rock, screenings, mulch, pebbles. SE Melbourne | Family owned second generation. Wholesale pricing |
| SUP159 | Melbourne's Cheapest Soils | T3 | — | melbournescheapestsoils.com.au | Topsoil, crushed rock (5mm-20mm), crusher dust, synthetic turf base, pebbles, decorative aggregate | Western suburbs. Bobcat, excavator & tipper services |
| SUP160 | Bayside Garden Supplies | T2 | — | gardensupply.com.au | Brick sand, packing sand, turf sand, concrete sand, Dromana/Lilydale toppings, crushed granite | Bay area. Full range soils, sands, pebbles, rocks |
| SUP161 | Deer Park Building & Garden Supplies | T2 | — | dpbgsupplies.com.au | Sand, soil, rock, mulch, pebbles, decorative gravels — Melbourne-wide fleet | Semi-trucks, trailers, small tip trucks |
| SUP162 | Fultons Hawthorn/Wantirna | T1 | — | cfulton.com.au | Road base crushed rock, drainage screenings, scoria, concrete mix. Est. 1954 | Three Melbourne yards. Green Chevrolet fleet |

### Product Reference Guide
```
PRODUCT               | USE CASE                                          | SIZE       | SUPPLIER
Crusher Dust          | Under pavers, synthetic turf base, packing        | 5mm minus  | SUP150/SUP154/SUP159
Crushed Rock          | Sub-base, driveways, under slabs, backfill        | 7-40mm     | SUP150/SUP151/SUP152
Road Base Class 2/3   | VicRoads spec, driveways, paths, under slabs      | 20mm minus | SUP150/SUP151/SUP153
Road Base Class 1     | Heavy traffic, civil works                        | 20mm minus | SUP151/SUP153
Packing Sand          | Under pavers, bedding, paving base                | Fine/coarse| SUP151/SUP160
Brick Sand            | Mortar, bricklaying, concreting                   | Fine       | SUP151/SUP160
Turf/Lawn Sand        | Top dressing, turf establishment, drainage        | Washed fine| SUP151/SUP160
Concrete Sand         | Concrete mixing, screeds                          | Coarse     | SUP151/SUP157
Topsoil Premium       | Lawn prep, garden beds, raised beds               | Screened   | SUP150/SUP152/SUP154
Garden Mix 3-way      | Planting, beds — soil + compost + manure          | Blended    | SUP152/SUP162
Scoria                | Drainage, lightweight fill, garden beds            | 7mm        | SUP150/SUP151
River Pebbles         | Water features, garden beds, paths                | 7-40mm     | SUP151/SUP160
Dromana Topping       | Driveways, paths, decorative surfaces             | 10mm minus | SUP160/SUP162
Lilydale Topping      | Driveways, paths — popular Melbourne finish       | 10mm minus | SUP160/SUP162
Basalt Aggregate      | Drainage, concrete, landscaping                   | 7-20mm     | SUP151/SUP156
Granite Aggregate     | Drainage, paths, decorative                       | 7-20mm     | SUP151/SUP159
```

---

## CATEGORY 9: PERGOLAS & OUTDOOR LIVING

### Structural Timber for Frames
| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP170 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | H4 posts, rafters, beams, hardware, fixings — urgent |
| SUP171 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | H4 structural timber, LVL beams |
| SUP172 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | Structural timber, roofing, complete pergola framing |
| SUP173 | Chippy's Outdoor Clayton | T2 | 03 9755 6811 | chippysoutdoor.com.au | Feature pergola timber, screening, outdoor structures — showroom |

### Louvre & Roof Systems
| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP174 | LouvreElite Bayswater | T2 | — | louvreelite.com.au | Motorised aluminium louvre pergolas. Freestanding, retractable. 15yr warranty. Showroom |
| SUP175 | Louvre Roofs Australia | T2 | — | louvreroofs.com.au | Custom opening roof systems — Melbourne leading provider |
| SUP176 | LouvreSky | T2 | — | louvresky.com.au | Aluminium louvres, smart control, 10yr warranty, concealed motor |
| SUP177 | Totally Outdoors | T2 | — | totallyoutdoors.com.au | Steel & aluminium pergolas, verandahs, louvres. Display centre. Builder warranty |
| SUP178 | Luxi Living | T2 | — | luxiliving.com.au | Aluminium pergolas, louvred, retractable. Melbourne showrooms |
| SUP179 | SkyFlex Epping | T2 | — | skyflex.au | Louvred pergolas, showroom Epping. Residential & commercial |
| SUP180 | Modern Roofs | T3 | — | modernroofs.com.au | DIY louvre roof kits, aluminium flat pack — supply only |
| SUP181 | Lumex Roofing Systems | T2 | — | lumexopeningroofs.com.au | Motorised louvre roof systems. Trapezoid blade design. 10yr warranty |
| SUP182 | Alfresco Blinds Co | T2 | — | alfrescoblindsco.com.au | Lumex roof systems, retractable louvres, Melbourne-wide |

---

## CATEGORY 10: PAINTING, STAINING & SURFACE FINISHES

### Paint Brands
| Brand | Best For | Trade Account | Website |
|-------|----------|---------------|---------|
| Dulux / Weathershield | Premium exterior. #1 trade brand AU | Yes — Dulux Accredited | dulux.com.au |
| Haymes Paint | Australian made. 350+ stockists. Trade accounts | Yes — Haymes Trade | haymespaint.com.au |
| Wattyl / Solagard | Durable exterior, budget-friendly trade | Yes | wattyl.com.au |
| Taubmans Endure | Interior/exterior mid-range | No | taubmans.com.au |
| Bristol Paint (PPG) | Melbourne-born 1938 Carlton. Trade decorator centres | Yes — PPG Trade | bristol.com.au |
| Resene | Bold colours, eco-friendly, NZ-origin | Yes | resene.com.au |
| Feast Watson | Timber stains, decking oils, clear finishes — outdoor specialist | No | feastwatson.com.au |
| Cabot's | Deck stains, timber care, exterior coatings | No | cabots.com.au |
| Solver Paints | Trade quality, competitive pricing | Yes | solver.com.au |
| British Paints (PPG) | Reliable, affordable. 4 Seasons range | No | britishpaints.com.au |

### Paint Trade Suppliers
| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP190 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | Dulux, Wattyl, Resene, drop cloths, brushes, spray gear |
| SUP191 | Dulux Trade Centre | T1 | 13 25 25 | dulux.com.au | Trade accounts, colour matching, Accredited Painter program |
| SUP192 | Haymes Paint Trade | T1 | — | haymespaint.com.au | Trade accounts. Australian made. 350+ Melbourne stockists |
| SUP193 | Bristol Decorator Centres | T1 | — | bristol.com.au | PPG brands, trade-focused. Multiple Melbourne stores |
| SUP194 | Paint Place | T2 | — | paintplace.com.au | All major brands — Dulux, Haymes, Taubmans, Resene, Bristol, Wattyl |
| SUP195 | Total Tools | T3 | 1300 TOT TOOLS | totaltools.com.au | Airless spray systems, compressors, spray guns, accessories |
| SUP196 | Mitre 10 | T3 | — | mitre10.com.au | Paint, tools, prep materials — local Melbourne stores |

---

## CATEGORY 11: STRUCTURAL & FRAMING

| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP200 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | MGP10 studs, plates, noggings, nails, bolts, anchors |
| SUP201 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | Structural framing — MGP10/12, LVL beams, engineered timber |
| SUP202 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | Wall frames, roof trusses, LVL, posi-struts — trade supplier |
| SUP203 | Australian Sustainable Hardwoods ASH | T2 | — | ash.com.au | LVL, MASSLAM mass timber, structural hardwood |
| SUP204 | Mitre 10 | T3 | — | mitre10.com.au | Structural pine, LVL, hardware, bolts — trade |
| SUP205 | Rex Paine Building Supplies | T1 | — | paines.com.au | Structural timber, mesh, engineered products |
| SUP206 | Hanson Construction Materials | T4 | 13 HANSON | hanson.com.au | Concrete, aggregates, pre-mix — footings and slabs |
| SUP207 | Boral Building Products | T4 | 13 BORAL | boral.com.au | Masonry, concrete, roofing, structural cladding |
| SUP208 | Robot Building Supplies | T2 | — | robotbuildingsupplies.com.au | Structural steel, metal roofing, rainwater goods |
| SUP209 | VSV Building Supplies | T2 | — | vsvbuildingsupplies.com.au | Structural steel, concrete, reinforcing mesh |
| SUP210 | Total Tools | T3 | 1300 TOT TOOLS | totaltools.com.au | Power tools, nail guns, structural fixings |
| SUP211 | Wettrades Highett | T2 | 03 9555 4108 | wettrades.com.au | Concrete repair, waterproofing, structural coatings |

---

## CATEGORY 12: TILING

| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP220 | Beaumont Tiles | T1 | 1300 BEAUMONT | beaumont-tiles.com.au | Primary tile supplier. Trade accounts. All Melbourne locations |
| SUP221 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | Tiles, adhesives, grout, tools |
| SUP222 | Wettrades Highett | T2 | 03 9555 4108 | wettrades.com.au | Tiling supplies, waterproofing, tile adhesives, trade specialist |

---

## CATEGORY 13: COMMERCIAL FIT-OUTS & RENOVATIONS

| ID | Supplier | Tier | Phone | Website | Notes |
|----|----------|------|-------|---------|-------|
| SUP230 | Bunnings Warehouse | T3 | 1800 BUNNINGS | bunnings.com.au | Full commercial range |
| SUP231 | Dahlsens Building Centres | T1 | 1300 324 573 | dahlsens.com.au | Foundation to fitout — whole of house supply |
| SUP232 | Bowens Timber & Hardware | T1 | 1800 BOWENS | bowens.com.au | Fitout timber, doors, frames, cladding |
| SUP233 | Melbourne Building Materials | T2 | — | melbournebuildingmaterials.com.au | Partitioning, plasterboard, ceilings, insulation — wholesale |
| SUP234 | James Hardie Australia | T1 | — | jameshardie.com.au | Commercial cladding, fire-rated walls — manufacturer |
| SUP235 | Robot Building Supplies | T2 | — | robotbuildingsupplies.com.au | Steel, roofing, fibreglass, polycarb — commercial |
| SUP236 | Wettrades Highett | T2 | 03 9555 4108 | wettrades.com.au | Waterproofing, render, tiling for commercial |
| SUP237 | Total Tools | T3 | 1300 TOT TOOLS | totaltools.com.au | Power tools, trade tools, fixings |
| SUP238 | VSV Building Supplies | T2 | — | vsvbuildingsupplies.com.au | Concrete, bricks, steel, insulation |
| SUP239 | Mitre 10 Trade Centre | T3 | — | mitre10.com.au | Hardware, tools, materials — trade accounts |

---

## AUTO-SELECTION LOGIC

### For Claude Code — implement this selection algorithm:

```javascript
function selectSupplier(trade, category, budget, urgency, quality, jobSize) {
  
  // RULE 1: Always show Bunnings first for urgent jobs
  if (urgency === 'urgent') {
    return filterByCategory(SUPPLIERS, category)
      .sort((a, b) => b.scores.speed - a.scores.speed);
  }
  
  // RULE 2: Premium quality → Tier 2 specialists first
  if (quality === 'premium') {
    return filterByCategory(SUPPLIERS, category)
      .filter(s => s.tier === 2)
      .sort((a, b) => b.scores.quality - a.scores.quality);
  }
  
  // RULE 3: Bulk/large job → Tier 4 direct suppliers
  if (jobSize === 'bulk' || jobSize === 'large') {
    return filterByCategory(SUPPLIERS, category)
      .filter(s => s.tier === 4)
      .sort((a, b) => b.scores.price - a.scores.price);
  }
  
  // RULE 4: Fill/sub-base/recycled → Tier 5
  if (category === 'fill' || category === 'sub-base' || category === 'recycled') {
    return filterByCategory(SUPPLIERS, category)
      .filter(s => s.tier === 5);
  }
  
  // DEFAULT: Tier 1 Core suppliers, sorted by reliability
  return filterByCategory(SUPPLIERS, category)
    .filter(s => s.tier === 1)
    .sort((a, b) => b.scores.reliability - a.scores.reliability);
}
```

### Category Mapping (trade → supplier category)
```
Decking            → CATEGORY 2 (Decking)
Timber Framing     → CATEGORY 11 (Structural)
Cladding           → CATEGORY 3 (Cladding)
Feature Walls      → CATEGORY 3 (Cladding)
Carpentry          → CATEGORY 4 (Carpentry)
Joinery            → CATEGORY 4 (Carpentry)
Fencing            → CATEGORY 5 (Fencing)
Screening          → CATEGORY 5 (Fencing)
Landscaping        → CATEGORY 6 (Landscaping)
Garden             → CATEGORY 6 (Landscaping)
Turf               → CATEGORY 7 (Turf)
Lawn               → CATEGORY 7 (Turf)
Excavation         → CATEGORY 8 (Sand/Soil/Rock) for materials
Crushed Rock       → CATEGORY 8 (Sand/Soil/Rock)
Topsoil            → CATEGORY 8 (Sand/Soil/Rock)
Pergola            → CATEGORY 9 (Pergolas)
Outdoor Living     → CATEGORY 9 (Pergolas)
Painting           → CATEGORY 10 (Painting)
Staining           → CATEGORY 10 (Painting)
Tiling             → CATEGORY 12 (Tiling)
Fitout             → CATEGORY 13 (Fitouts)
Renovation         → CATEGORY 13 (Fitouts)
General            → CATEGORY 1 (General Hardware)
```

---

## MATERIALS MARKUP RULE

```
All materials purchased from suppliers: apply 10% markup before presenting to client
Formula: Client Material Cost = Supplier Cost × 1.10
GST is added on top of total client price at 10%
```

---

## SUPPLIER PRIORITY HIERARCHY

```
1. Bunnings Warehouse    → Default first for: urgent, standard hardware, fixings
2. Tier 1 Core          → Default for: all standard jobs, reliable supply
3. Tier 2 Specialist    → Use when: premium spec, specific brand required
4. Tier 3 Fast Access   → Use when: same-day, urgent, local pickup needed
5. Tier 4 Bulk Direct   → Use when: >$5000 materials, large volume order
6. Tier 5 Recycled      → Use when: fill, sub-base, recycled aggregates
```

---

## TOTAL SUPPLIER COUNT

| Category | Suppliers |
|----------|-----------|
| General Hardware & Building | 14 |
| Decking | 16 |
| Cladding & Feature Walls | 17 |
| Carpentry & Bespoke Timber | 15 |
| Fencing & Screening | 11 |
| Landscaping & Garden | 13 |
| Turf & Instant Lawn | 6 |
| Sand, Soil, Crushed Rock | 13 |
| Pergolas & Outdoor Living | 13 |
| Painting & Surface Finishes | 10 brands + 7 stores |
| Structural & Framing | 12 |
| Tiling | 3 |
| Commercial Fitouts & Renovations | 10 |
| **TOTAL** | **~160 entries** |

---

## IMPLEMENTATION NOTES FOR CLAUDE CODE

1. **Database format**: Store as JSON array in `supplierDB.js` or PostgreSQL table `suppliers`
2. **Required fields per supplier**: `id, name, tier, tierLabel, categories[], phone, website, scores{price,reliability,speed,quality}, notes, products[]`
3. **Category field**: Use array — one supplier can appear in multiple categories (e.g. Bunnings is in ALL categories)
4. **Auto-selection**: Run `selectSupplier()` function on Quote Engine form submission
5. **Urgent material routing**: In Job Tickets, when subbie flags urgent material — auto-run selection with `urgency='urgent'`
6. **Display**: Show top 3 suppliers per selection, with scores displayed as coloured bars
7. **Override**: Allow OSV owner to manually override selected supplier on any quote
8. **Bunnings rule**: Hardcode Bunnings as always appearing in Tier 3 results for every category

---

*Document generated for OSV Construct Operating System | Melbourne, VIC | 2025*
*Owner: Gillian J. Bazerque (Jack) | 0435 855 190 | invoices@onsitevisuals.com.au*
