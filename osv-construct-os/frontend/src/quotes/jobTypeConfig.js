export const JOB_TYPES = {
  fencing: {
    label: 'Fencing & Screening',
    subcategories: [
      { label: 'Timber Paling Fence', hint: 'Classic wooden fence made from vertical timber boards (palings). The most popular style for backyard boundary fences in Melbourne.' },
      { label: 'Colorbond Fence', hint: 'Steel fence panels in a range of colours. Low maintenance, durable, and gives a clean, modern look.' },
      { label: 'Aluminium Slat Fencing', hint: 'Lightweight metal fence with horizontal or vertical slats. Popular for front yards and pool areas because of its sleek appearance.' },
      { label: 'Picket Fence', hint: 'Traditional low fence with evenly spaced pointed or rounded timber boards. Typically used for front gardens.' },
      { label: 'Pool Fencing (Compliant)', hint: 'Fencing that meets Australian safety standards for swimming pool barriers, including self-closing gates and specific height requirements.' },
      { label: 'Acoustic / Noise Barrier Fencing', hint: 'Extra-thick fence designed to block sound from busy roads or neighbours. Uses dense materials and sealed construction.' },
      { label: 'Privacy Screening', hint: 'Panels or screens that block the view into your yard. Can be timber, aluminium, or composite slats.' },
      { label: 'Retaining Wall + Fence Combo', hint: 'A retaining wall with a fence built on top. Used when the ground level is different on each side of the boundary.' },
      { label: 'Farm / Rural Fencing', hint: 'Post-and-wire or post-and-rail fencing for large rural properties, paddocks, and livestock.' }
    ],
    scopeFields: [
      { key: 'linear_metres', label: 'Linear Metres (m)', type: 'number', required: true,
        hint: 'The total length of fencing needed, measured in metres along the ground from start to finish.' },
      { key: 'fence_height', label: 'Fence Height', type: 'select', required: true,
        options: ['1.2m', '1.5m', '1.8m', '2.1m', 'Custom'],
        hint: 'How tall the fence will be. 1.8m is standard for privacy; 1.2m is the minimum for pool compliance.' },
      { key: 'material_type', label: 'Material Type', type: 'text',
        hint: 'The main material for the fence panels. Auto-filled from subcategory — change it if you need something different.' },
      { key: 'gates_count', label: 'Number of Gates', type: 'number', default: 0,
        hint: 'How many gate openings you need in the fence line.' },
      { key: 'gate_type', label: 'Gate Type', type: 'multi-select',
        options: ['Pedestrian', 'Double', 'Sliding'],
        showWhen: (scope) => (scope.gates_count || 0) > 0,
        hint: 'Pedestrian = single walk-through gate. Double = wide gate for cars/trailers. Sliding = rolls sideways on a track.' },
      { key: 'terrain', label: 'Terrain', type: 'select',
        options: ['Flat', 'Gentle Slope', 'Steep Slope', 'Stepped'],
        hint: 'The ground slope along the fence line. Sloping or stepped ground requires extra work and materials.' },
      { key: 'existing_fence_removal', label: 'Existing Fence Removal', type: 'boolean',
        hint: 'Tick this if there is an old fence that needs to be pulled out and disposed of before the new one goes in.' },
      { key: 'plinth_base', label: 'Plinth / Concrete Sleeper Base', type: 'boolean',
        hint: 'A concrete or sleeper strip that runs along the bottom of the fence. Keeps out animals and prevents rot from ground contact.' },
      { key: 'post_type', label: 'Post Type', type: 'select',
        options: ['In-Ground Concrete', 'Bolt-Down', 'Steel Post in Concrete'],
        hint: 'How the fence posts are secured. In-ground concrete is most common. Bolt-down is used on existing slabs or retaining walls.' }
    ]
  },

  decking: {
    label: 'Decking',
    subcategories: [
      { label: 'Timber Decking (Merbau, Spotted Gum, Treated Pine)', hint: 'Traditional hardwood or treated pine deck boards. Natural timber look with grain and character.' },
      { label: 'Composite Decking', hint: 'Boards made from a mix of wood fibre and plastic. Low maintenance, won\'t splinter or rot, and comes in many colours.' },
      { label: 'Rooftop Decking', hint: 'Decking installed on a flat roof or upper-level surface. Requires special waterproofing and lightweight materials.' },
      { label: 'Pool Decking', hint: 'Decking built around a swimming pool. Uses slip-resistant, water-tolerant materials that stay cool underfoot.' },
      { label: 'Elevated / Multi-Level Decking', hint: 'Decks raised well above ground, often with multiple tiers or split levels connected by stairs.' },
      { label: 'Deck Restoration & Resurfacing', hint: 'Bringing an old deck back to life by sanding, repairing, and re-coating the existing boards and frame.' }
    ],
    scopeFields: [
      { key: 'deck_area', label: 'Deck Area (m\u00B2)', type: 'number', required: true,
        hint: 'The total surface area of the deck in square metres. Multiply length by width to estimate.' },
      { key: 'height_off_ground', label: 'Height Off Ground (m)', type: 'number', required: true,
        hint: 'How far off the ground the deck surface will be. Higher decks need more structural support and may need a balustrade.' },
      { key: 'board_material', label: 'Board Material', type: 'text',
        hint: 'The type of decking boards. Auto-filled from subcategory — edit if needed.' },
      { key: 'subframe', label: 'Subframe', type: 'select',
        options: ['New Build', 'Existing (Reuse)', 'Existing (Replace)'],
        hint: 'The structural frame under the deck boards. "New Build" means we build it from scratch. "Reuse" means the existing frame is in good shape.' },
      { key: 'stairs_count', label: 'Number of Stairs', type: 'number', default: 0,
        hint: 'How many sets of stairs are needed to access the deck from ground level.' },
      { key: 'stair_width', label: 'Stair Width (m)', type: 'number',
        showWhen: (scope) => (scope.stairs_count || 0) > 0,
        hint: 'How wide each set of stairs will be, in metres. Standard is about 1m.' },
      { key: 'balustrade_required', label: 'Balustrade Required', type: 'boolean',
        hint: 'A railing or barrier around the deck edge. Required by law if the deck is more than 1m off the ground.' },
      { key: 'balustrade_type', label: 'Balustrade Type', type: 'select',
        options: ['Timber', 'Wire', 'Glass', 'Aluminium'],
        showWhen: (scope) => !!scope.balustrade_required,
        hint: 'The style of railing. Glass gives a modern look; wire is affordable; timber matches the deck.' },
      { key: 'balustrade_metres', label: 'Balustrade Linear Metres', type: 'number',
        showWhen: (scope) => !!scope.balustrade_required,
        hint: 'Total length of balustrade needed around the deck edge, in metres.' },
      { key: 'fascia_skirting', label: 'Fascia / Skirting', type: 'boolean',
        hint: 'Boards that cover the exposed sides and understructure of the deck for a clean, finished look.' },
      { key: 'finish', label: 'Finish', type: 'select',
        options: ['Oil', 'Stain', 'Paint', 'None'],
        hint: 'How the deck surface will be treated after installation. Oil and stain protect the timber and enhance the grain.' }
    ]
  },

  pergolas: {
    label: 'Pergolas & Outdoor Living',
    subcategories: [
      { label: 'Timber Pergola', hint: 'An open-roofed outdoor structure built from timber posts and beams. Provides shade and defines your outdoor living area.' },
      { label: 'Steel Pergola', hint: 'A pergola with steel posts and frame. Slimmer, stronger, and more modern than timber, with longer spans between posts.' },
      { label: 'Insulated Patio (Stratco / Lysaght)', hint: 'A fully roofed outdoor area using insulated panels. Keeps it cool in summer and dry in the rain.' },
      { label: 'Shade Sail Structure', hint: 'Tensioned fabric sails stretched between posts or anchor points. An affordable way to create shade over outdoor areas.' },
      { label: 'Outdoor Kitchen / BBQ Area', hint: 'A built-in cooking and entertaining space with countertops, storage, and connections for a BBQ, sink, or fridge.' },
      { label: 'Alfresco Extension', hint: 'An extension of your home\'s living area into the outdoors, typically with a roof, and often enclosed on one or more sides.' },
      { label: 'Carport', hint: 'A covered structure for parking cars, usually open on one or more sides. Can be attached to the house or freestanding.' }
    ],
    scopeFields: [
      { key: 'length', label: 'Footprint Length (m)', type: 'number', required: true,
        hint: 'How long the structure will be, in metres.' },
      { key: 'width', label: 'Footprint Width (m)', type: 'number', required: true,
        hint: 'How deep/wide the structure will be, in metres.' },
      { key: 'roof_type', label: 'Roof Type', type: 'select',
        options: ['Open Rafters', 'Polycarbonate', 'Colorbond', 'Insulated Panel'],
        hint: 'Open rafters let light through but offer no rain cover. Insulated panels keep it cool underneath and block rain.' },
      { key: 'attachment', label: 'Attachment', type: 'select',
        options: ['Attached to House', 'Freestanding'],
        hint: 'Whether the structure connects to your house wall or stands on its own with posts on all sides.' },
      { key: 'post_material', label: 'Post Material', type: 'select',
        options: ['Timber', 'Steel'],
        hint: 'The material for the main support posts. Steel is stronger and slimmer; timber gives a warmer, natural look.' },
      { key: 'electrical', label: 'Electrical', type: 'multi-select',
        options: ['Lighting', 'Ceiling Fan', 'Power Points', 'None'],
        hint: 'Any electrical work needed under the structure. A licensed electrician will be required for these.' },
      { key: 'ceiling_lining', label: 'Ceiling Lining', type: 'boolean',
        hint: 'A finished ceiling surface underneath the roof, giving a more polished indoor feel to the outdoor area.' },
      { key: 'ceiling_material', label: 'Ceiling Material', type: 'select',
        options: ['Timber', 'VJ Panel', 'Plasterboard'],
        showWhen: (scope) => !!scope.ceiling_lining,
        hint: 'VJ Panel is tongue-and-groove timber sheeting — a popular choice for outdoor ceilings. Plasterboard is cheaper but less weather-resistant.' },
      { key: 'gutter_connection', label: 'Gutter / Drainage Connection', type: 'boolean',
        hint: 'Whether the roof runoff needs to be connected to existing gutters and downpipes.' },
      { key: 'council_permit', label: 'Council Permit Status', type: 'select',
        options: ['Not Required', 'Required (Not Obtained)', 'Required (Obtained)', 'Unsure'],
        hint: 'Most structures over a certain size need a council building permit. If unsure, we can check for you.' }
    ]
  },

  landscaping: {
    label: 'Landscaping & Garden Construction',
    subcategories: [
      { label: 'Garden Bed Construction', hint: 'Building raised or in-ground garden beds with edging, soil, and planting-ready preparation.' },
      { label: 'Retaining Walls (Timber / Stone / Concrete)', hint: 'Walls that hold back soil on sloped land. Built from sleepers, stone, or concrete blocks to create level areas.' },
      { label: 'Paving & Pathways', hint: 'Hard surfaces like concrete, brick, or stone pavers laid for driveways, patios, or walkways.' },
      { label: 'Turf & Lawn Installation', hint: 'Laying fresh rolls of turf grass to create an instant lawn, including soil preparation and levelling.' },
      { label: 'Irrigation Systems', hint: 'Automated watering systems with sprinklers, drip lines, and timers to keep your garden watered without a hose.' },
      { label: 'Drainage Solutions', hint: 'Underground pipes, pits, and channels that carry water away from your property to prevent flooding and erosion.' },
      { label: 'Garden Lighting', hint: 'Low-voltage outdoor lights for paths, garden beds, and feature areas. Creates ambiance and improves safety at night.' },
      { label: 'Water Features', hint: 'Decorative fountains, ponds, or cascading water elements that add a calming focal point to your garden.' },
      { label: 'Planting & Mulching', hint: 'Selecting and planting trees, shrubs, and ground covers, then spreading mulch to retain moisture and suppress weeds.' }
    ],
    scopeFields: [
      { key: 'site_area', label: 'Total Site Area (m\u00B2)', type: 'number', required: true,
        hint: 'The overall area of the garden/landscape zone being worked on, in square metres.' },
      { key: 'scope_elements', label: 'Scope Elements', type: 'multi-select', required: true,
        options: ['Retaining', 'Paving', 'Turf', 'Planting', 'Irrigation', 'Drainage', 'Lighting', 'Water Feature'],
        hint: 'Select every type of work included in this job. This determines which detail fields appear below.' },
      { key: 'retaining_metres', label: 'Retaining Wall Length (m)', type: 'number',
        showWhen: (scope) => (scope.scope_elements || []).includes('Retaining'),
        hint: 'Total length of retaining wall, in metres.' },
      { key: 'retaining_height', label: 'Retaining Wall Height (m)', type: 'number',
        showWhen: (scope) => (scope.scope_elements || []).includes('Retaining'),
        hint: 'How tall the retaining wall needs to be. Walls over 1m usually need engineering certification.' },
      { key: 'retaining_material', label: 'Retaining Wall Material', type: 'select',
        options: ['Timber Sleeper', 'Concrete Sleeper', 'Stone', 'Concrete Block'],
        showWhen: (scope) => (scope.scope_elements || []).includes('Retaining'),
        hint: 'Timber sleepers are the most affordable. Concrete sleepers are durable and low-maintenance. Stone is premium.' },
      { key: 'paving_area', label: 'Paving Area (m\u00B2)', type: 'number',
        showWhen: (scope) => (scope.scope_elements || []).includes('Paving'),
        hint: 'The area to be paved, in square metres.' },
      { key: 'paving_material', label: 'Paving Material', type: 'select',
        options: ['Concrete', 'Natural Stone', 'Brick', 'Porcelain'],
        showWhen: (scope) => (scope.scope_elements || []).includes('Paving'),
        hint: 'The type of paver or hard surface. Concrete is most common; natural stone is a premium option.' },
      { key: 'turf_area', label: 'Turf Area (m\u00B2)', type: 'number',
        showWhen: (scope) => (scope.scope_elements || []).includes('Turf'),
        hint: 'The area to be turfed, in square metres.' },
      { key: 'turf_variety', label: 'Turf Variety', type: 'select',
        options: ['Sir Walter', 'Kikuyu', 'Couch', 'TifTuf'],
        showWhen: (scope) => (scope.scope_elements || []).includes('Turf'),
        hint: 'Sir Walter is soft and shade-tolerant. Kikuyu is hardy and fast-growing. TifTuf is drought-resistant.' },
      { key: 'irrigation_zones', label: 'Irrigation Zones', type: 'number',
        showWhen: (scope) => (scope.scope_elements || []).includes('Irrigation'),
        hint: 'Number of separate watering zones. Each zone waters a different area on its own timer.' },
      { key: 'drainage_type', label: 'Drainage Type', type: 'select',
        options: ['Ag Pipe', 'Channel Drain', 'Pit Drain'],
        showWhen: (scope) => (scope.scope_elements || []).includes('Drainage'),
        hint: 'Ag pipe is a perforated pipe buried underground to collect water. Channel drain is a surface grate. Pit drain is a collection box.' },
      { key: 'drainage_metres', label: 'Drainage Length (m)', type: 'number',
        showWhen: (scope) => (scope.scope_elements || []).includes('Drainage'),
        hint: 'Total length of drainage run, in metres.' },
      { key: 'soil_mulch_delivery', label: 'Soil / Mulch Delivery Required', type: 'boolean',
        hint: 'Whether bulk soil, mulch, or gravel needs to be delivered to the site.' },
      { key: 'plant_design', label: 'Plant List / Designer', type: 'select',
        options: ['Client Supplied', 'OSV to Design', 'Landscape Architect Supplied'],
        hint: 'Who is choosing the plants? We can design the planting scheme, or you can supply your own list.' }
    ]
  },

  excavation: {
    label: 'Excavation, Site Clearing & Levelling',
    subcategories: [
      { label: 'Residential Excavation', hint: 'Digging and earthmoving for house sites, pools, driveways, or foundations on residential properties.' },
      { label: 'Site Clearing (Vegetation / Demolition)', hint: 'Removing trees, shrubs, old structures, or debris from a site before construction begins.' },
      { label: 'Cut & Fill / Site Levelling', hint: 'Cutting soil from high spots and filling low spots to create a flat, even surface ready for building.' },
      { label: 'Trenching (Drainage / Services)', hint: 'Digging narrow channels in the ground for pipes, cables, or drainage lines.' },
      { label: 'Rock Breaking / Removal', hint: 'Breaking up and removing large rocks or boulders from the site using a hydraulic hammer or similar equipment.' },
      { label: 'Bobcat / Mini Excavator Work', hint: 'General earthmoving using a small bobcat or mini excavator. Ideal for tight spaces where large machines can\'t fit.' }
    ],
    scopeFields: [
      { key: 'area', label: 'Area (m\u00B2)', type: 'number', required: true,
        hint: 'The total area to be excavated or cleared, in square metres.' },
      { key: 'volume', label: 'Volume (m\u00B3)', type: 'number',
        hint: 'The total volume of soil/material to be removed. Helpful for cut & fill jobs. Leave blank if unknown.' },
      { key: 'depth', label: 'Depth of Dig (m)', type: 'number',
        hint: 'How deep the excavation needs to go, in metres.' },
      { key: 'ground_type', label: 'Ground Type', type: 'select', required: true,
        options: ['Clay', 'Sandy', 'Rock', 'Fill', 'Mixed / Unknown'],
        hint: 'The type of soil on site. Rock and clay are harder and more expensive to dig. If unsure, select Mixed/Unknown.' },
      { key: 'access_width', label: 'Access Width for Machinery (m)', type: 'number', required: true,
        hint: 'The narrowest point a machine needs to fit through to reach the work area. Affects which machines can be used.' },
      { key: 'spoil_disposal', label: 'Spoil Disposal Required', type: 'boolean',
        hint: 'Whether the dug-up soil/rock needs to be trucked away from site. If not, it stays on site for reuse.' },
      { key: 'spoil_volume', label: 'Estimated Spoil Volume (m\u00B3)', type: 'number',
        showWhen: (scope) => !!scope.spoil_disposal,
        hint: 'How much material needs to be carted away, in cubic metres. One truck load is about 5-8 m\u00B3.' },
      { key: 'services_located', label: 'Services Located (Dial Before You Dig)', type: 'select',
        options: ['Yes', 'No', 'Unknown'],
        hint: 'Whether underground services (gas, water, power, data) have been located and marked. This is legally required before digging.' },
      { key: 'retaining_after', label: 'Retaining Required After Excavation', type: 'boolean',
        hint: 'Whether a retaining wall is needed to hold back the earth after the dig is done.' },
      { key: 'compaction_tolerance', label: 'Compaction / Levelling Tolerance', type: 'select',
        options: ['Rough (\u00B150mm)', 'Standard (\u00B125mm)', 'Precision (\u00B110mm)'],
        hint: 'How flat and firm the ground needs to be after levelling. Precision is needed for slabs; rough is fine for gardens.' }
    ]
  },

  cladding: {
    label: 'Cladding & Feature Walls',
    subcategories: [
      { label: 'Timber Cladding', hint: 'Real wood boards fixed to walls for a warm, natural look. Available in profiles like shiplap, weatherboard, and tongue-and-groove.' },
      { label: 'Composite / PVC Cladding', hint: 'Synthetic or mixed-material boards that look like timber but don\'t need painting or staining. Weather-resistant and low maintenance.' },
      { label: 'Stone & Brick Feature Walls', hint: 'Natural or manufactured stone and brick applied to walls for a textured, premium look. Common for fireplaces and entrance features.' },
      { label: 'Metal Cladding (Colorbond / Aluminium)', hint: 'Steel or aluminium sheets or panels fixed to walls. Gives a modern, industrial look and is highly durable.' },
      { label: 'Rendered Feature Walls', hint: 'A cement-based coating applied to walls and finished smooth or textured. Can be painted any colour for a clean, contemporary style.' },
      { label: 'Acoustic Panelling', hint: 'Panels designed to absorb sound and reduce echo. Used in home theatres, offices, studios, and noisy rooms.' },
      { label: 'MDF Panels', hint: 'Medium-density fibreboard panels with a smooth, paintable surface. Affordable and versatile for interior feature walls, wainscoting, and decorative panelling.' }
    ],
    scopeFields: [
      { key: 'wall_area', label: 'Wall Area (m\u00B2)', type: 'number', required: true,
        hint: 'The total wall surface area to be clad, in square metres. Multiply wall height by width.' },
      { key: 'wall_height', label: 'Wall Height (m)', type: 'number', required: true,
        hint: 'How tall the wall is from bottom to top, in metres.' },
      { key: 'cladding_material', label: 'Cladding Material', type: 'text',
        hint: 'The material being applied to the wall. Auto-filled from subcategory — edit if needed.' },
      { key: 'location', label: 'Location', type: 'select',
        options: ['Internal', 'External', 'Both'],
        hint: 'Whether the cladding is going on inside walls, outside walls, or both.' },
      { key: 'substrate_condition', label: 'Substrate Condition', type: 'select',
        options: ['New Frame', 'Existing Wall (Good)', 'Existing Wall (Needs Prep)'],
        hint: 'The state of the wall behind the cladding. "Needs Prep" means patching, sanding, or waterproofing is required first.' },
      { key: 'insulation_required', label: 'Insulation Required', type: 'boolean',
        hint: 'Whether insulation batts or boards need to be installed behind the cladding for thermal or acoustic performance.' },
      { key: 'access_requirements', label: 'Access Requirements', type: 'select',
        options: ['Ground Level', 'Ladder', 'Scaffold', 'Elevated Work Platform'],
        hint: 'What equipment is needed to reach the work area. Scaffold and EWP add cost but are required for high walls.' }
    ]
  },

  carpentry: {
    label: 'Carpentry & Bespoke Timber Work',
    subcategories: [
      { label: 'Custom Furniture', hint: 'One-off pieces designed and built to your exact requirements. Tables, benches, desks, bed frames, and more.' },
      { label: 'Built-in Shelving & Cabinetry', hint: 'Shelves and cabinets built into the walls of your home for a seamless, space-saving look.' },
      { label: 'Timber Doors & Windows', hint: 'Handcrafted or custom-sized timber door and window frames. Solid timber gives excellent insulation and character.' },
      { label: 'Staircase Construction', hint: 'Building internal or external staircases from timber, including treads, risers, stringers, and handrails.' },
      { label: 'Timber Screens & Partitions', hint: 'Decorative timber panels or slatted screens used to divide spaces or add visual interest without a solid wall.' },
      { label: 'Structural Timber Beams', hint: 'Load-bearing timber beams that support roofs, floors, or other structures. Often left exposed as a design feature.' }
    ],
    scopeFields: [
      { key: 'timber_species', label: 'Timber Species', type: 'select',
        options: ['Spotted Gum', 'Blackbutt', 'Victorian Ash', 'Tasmanian Oak', 'Treated Pine', 'Recycled Timber', 'Other'],
        hint: 'The type of wood to be used. Spotted Gum and Blackbutt are durable hardwoods. Treated Pine is the most affordable option.' },
      { key: 'dimensions', label: 'Dimensions (L x W x H)', type: 'text', required: true,
        hint: 'The overall size of the piece or structure, e.g. "2.4m long x 0.6m deep x 2.1m high".' },
      { key: 'units_count', label: 'Number of Pieces / Units', type: 'number', required: true,
        hint: 'How many individual items or units are being built. E.g. 3 shelving units, 2 doors, 1 staircase.' },
      { key: 'finish', label: 'Finish', type: 'select',
        options: ['Raw', 'Oiled', 'Stained', 'Painted', 'Clear Coat'],
        hint: 'How the timber surface will be treated. "Raw" means no finish. Oil brings out the natural grain; clear coat adds a protective sheen.' },
      { key: 'installation_type', label: 'Installation Type', type: 'select',
        options: ['Wall-Mounted', 'Freestanding', 'Structural', 'Built-In'],
        hint: 'How the item is installed. "Built-In" means it becomes part of the wall/room. "Structural" means it carries load (like a beam).' },
      { key: 'hardware_requirements', label: 'Hardware Requirements', type: 'text',
        hint: 'Any specific handles, hinges, brackets, or fittings needed. Leave blank if you want us to recommend.' }
    ]
  },

  painting: {
    label: 'Painting, Staining & Surface Finishes',
    subcategories: [
      { label: 'Interior House Painting', hint: 'Painting walls, ceilings, doors, and trim inside your home. Includes prep work like filling holes and sanding.' },
      { label: 'Exterior House Painting', hint: 'Painting the outside of your house, including walls, fascias, gutters, and trim. Protects against weather.' },
      { label: 'Deck & Fence Staining / Oiling', hint: 'Applying stain or oil to timber decks and fences to protect them from sun, rain, and wear.' },
      { label: 'Commercial Painting', hint: 'Painting for shops, offices, warehouses, and other business premises. Often done after hours to avoid disruption.' },
      { label: 'Feature Wall / Accent Colours', hint: 'Painting one wall a bold or different colour to create a focal point in a room.' },
      { label: 'Surface Prep & Repair', hint: 'Fixing damaged surfaces before painting — patching holes, sanding rough areas, removing old paint, and priming.' },
      { label: 'Spray Painting', hint: 'Using a spray gun instead of brushes or rollers for a smooth, even finish. Ideal for large areas, fences, and furniture.' },
      { label: 'Anti-Graffiti / Protective Coatings', hint: 'Clear or coloured coatings that protect surfaces from graffiti, UV damage, stains, and moisture.' }
    ],
    scopeFields: [
      { key: 'surface_type', label: 'Surface Type', type: 'select',
        options: ['Timber', 'Plaster', 'Render', 'Metal', 'Brick', 'Mixed'],
        hint: 'What the paint or stain is going onto. Different surfaces need different prep and products.' },
      { key: 'total_area', label: 'Total Area (m\u00B2) or Number of Rooms', type: 'text', required: true,
        hint: 'Either the total wall area in square metres, or the number of rooms. E.g. "120 m\u00B2" or "4 bedrooms + hallway".' },
      { key: 'location', label: 'Location', type: 'select',
        options: ['Interior', 'Exterior', 'Both'],
        hint: 'Whether the painting is inside, outside, or both. Exterior work needs weather-resistant paint.' },
      { key: 'coats', label: 'Number of Coats', type: 'select',
        options: ['1', '2', '3'],
        hint: 'How many layers of paint. 2 coats is standard for a good finish. 1 coat is a refresh; 3 is for strong colour changes.' },
      { key: 'paint_type', label: 'Paint / Finish Type', type: 'select',
        options: ['Flat', 'Low Sheen', 'Satin', 'Semi-Gloss', 'Gloss', 'Oil / Stain'],
        hint: 'The sheen level. Flat hides imperfections; gloss is shiny and wipeable; satin is a popular middle ground.' },
      { key: 'prep_work', label: 'Prep Work Required', type: 'multi-select',
        options: ['Sanding', 'Patching', 'Scraping', 'Priming', 'Filling', 'None'],
        hint: 'Work needed before painting starts. Old flaky paint needs scraping; holes need filling; bare surfaces need priming.' },
      { key: 'height_access', label: 'Height / Access', type: 'select',
        options: ['Ground Level', 'Ladder', 'Scaffold', 'EWP'],
        hint: 'What equipment is needed to reach the surfaces. EWP = Elevated Work Platform (cherry picker), used for very high areas.' },
      { key: 'colour_scheme', label: 'Colour Scheme', type: 'select',
        options: ['Client Supplied', 'To Be Advised', 'Colour Consultation Required'],
        hint: 'Whether you already know the colours, or need help choosing. We can arrange a colour consultation.' }
    ]
  },

  structural: {
    label: 'Structural & Framing Work',
    subcategories: [
      { label: 'Wall Framing (Timber / Steel)', hint: 'Building the skeleton of internal or external walls using timber studs or steel frames.' },
      { label: 'Roof Framing & Trusses', hint: 'Building the timber or steel structure that supports the roof, including rafters, ridge beams, and prefabricated trusses.' },
      { label: 'Bearer & Joist Systems', hint: 'The horizontal framework that supports floors and decks. Bearers carry the load to posts; joists sit on top and support the flooring.' },
      { label: 'Steel Beam Installation', hint: 'Installing heavy steel beams (I-beams) to support roofs, floors, or openings where walls have been removed.' },
      { label: 'Post & Pier Footings', hint: 'Concrete foundations poured into holes in the ground that anchor posts and support structures above.' },
      { label: 'Demolition & Strip-Out', hint: 'Safely tearing down walls, ceilings, floors, or entire structures and removing the debris from site.' },
      { label: 'Load-Bearing Wall Modifications', hint: 'Removing or altering walls that carry the weight of the building. Requires temporary supports and a new beam.' }
    ],
    scopeFields: [
      { key: 'structure_type', label: 'Structure Type', type: 'text',
        hint: 'The type of structure being built or modified. Auto-filled from subcategory — edit if needed.' },
      { key: 'span_dimensions', label: 'Span / Dimensions (m)', type: 'text', required: true,
        hint: 'The key measurements — e.g. "6m span steel beam" or "4m x 8m floor frame". Critical for engineering.' },
      { key: 'material', label: 'Material', type: 'select',
        options: ['Timber (MGP10)', 'Timber (LVL)', 'Steel (UB)', 'Steel (SHS)', 'Treated Pine'],
        hint: 'MGP10 is standard framing timber. LVL is engineered timber for long spans. UB = Universal Beam (steel I-beam). SHS = Square Hollow Section (steel posts).' },
      { key: 'engineering_plans', label: 'Engineering Plans', type: 'select',
        options: ['Supplied', 'Required (OSV to Arrange)', 'Not Applicable'],
        hint: 'Whether you have an engineer\'s design. Structural work usually needs certified plans — we can organise an engineer if needed.' },
      { key: 'posts_piers_count', label: 'Number of Posts / Piers', type: 'number',
        hint: 'How many vertical support posts or concrete piers are needed.' },
      { key: 'footing_type', label: 'Footing Type', type: 'select',
        options: ['Concrete Pier', 'Pad Footing', 'Strip Footing', 'Screw Pile'],
        hint: 'The type of foundation. Concrete pier is a deep hole filled with concrete. Screw pile is drilled in — fast but more expensive.' },
      { key: 'working_at_heights', label: 'Working at Heights', type: 'boolean',
        hint: 'Whether the work is above 2 metres. This requires additional safety measures and may affect pricing.' },
      { key: 'demolition_scope', label: 'Demolition Scope', type: 'textarea',
        showWhen: (scope) => (scope.structure_type || '').toLowerCase().includes('demolition'),
        hint: 'Describe what needs to be demolished or stripped out — e.g. "Remove existing internal wall between kitchen and living room".' }
    ]
  },

  renovations: {
    label: 'Renovations & Fit-Outs',
    subcategories: [
      { label: 'Bathroom Renovation', hint: 'A full or partial makeover of your bathroom including tiling, plumbing, waterproofing, and new fixtures.' },
      { label: 'Kitchen Renovation', hint: 'Updating your kitchen with new cabinetry, benchtops, splashbacks, appliances, and layout changes.' },
      { label: 'Laundry Renovation', hint: 'Revamping your laundry with new cabinetry, tiling, plumbing, and better storage and layout.' },
      { label: 'Full House Renovation', hint: 'A complete overhaul of your home covering multiple rooms, often including structural, plumbing, and electrical changes.' },
      { label: 'Room Addition / Extension', hint: 'Building a new room or extending an existing one to add living space. Includes footings, framing, and all finishes.' },
      { label: 'Garage Conversion', hint: 'Turning your garage into a liveable space like a bedroom, home office, or studio. Includes insulation, flooring, and windows.' },
      { label: 'Granny Flat / Studio', hint: 'A self-contained small dwelling built on your property, typically with its own kitchen, bathroom, and entrance.' }
    ],
    scopeFields: [
      { key: 'room_area', label: 'Room / Space Area (m\u00B2)', type: 'number', required: true,
        hint: 'The floor area of the room being renovated, in square metres.' },
      { key: 'scope_of_works', label: 'Scope of Works', type: 'multi-select', required: true,
        options: ['Demolition', 'Framing', 'Plastering', 'Tiling', 'Waterproofing', 'Painting', 'Flooring', 'Joinery', 'Fixtures'],
        hint: 'Select every type of work included. This helps us estimate the trades and time required.' },
      { key: 'structural_changes', label: 'Structural Changes', type: 'select',
        options: ['None', 'Wall Removal', 'Beam Installation', 'Both'],
        hint: 'Whether any load-bearing walls are being removed or beams added. This requires engineering sign-off.' },
      { key: 'services', label: 'Services', type: 'multi-select',
        options: ['Plumbing Relocation', 'Electrical Upgrade', 'Waterproofing', 'HVAC', 'None'],
        hint: 'Any plumbing, electrical, or climate control work needed. Each of these requires a licensed tradesperson.' },
      { key: 'fixtures_fittings', label: 'Fixtures / Fittings', type: 'select',
        options: ['Client Supplied', 'OSV to Quote', 'Mix'],
        hint: 'Who is providing taps, sinks, handles, lights, etc. "Client Supplied" means you buy them; "OSV to Quote" means we source and price them.' },
      { key: 'council_permit', label: 'Council / Building Permit', type: 'select',
        options: ['Not Required', 'Required (Not Obtained)', 'Required (Obtained)', 'Unsure'],
        hint: 'Renovations that change the structure, wet areas, or building footprint usually need a permit. If unsure, we can advise.' },
      { key: 'timeline', label: 'Timeline Constraint', type: 'text',
        hint: 'Any deadlines or timing requirements — e.g. "Must be done before Christmas" or "Tenants moving in March 1".' }
    ]
  },

  commercial: {
    label: 'Commercial Fit-Outs',
    subcategories: [
      { label: 'Office Fit-Out', hint: 'Designing and building an office workspace including partitions, desks, meeting rooms, and common areas.' },
      { label: 'Retail Fit-Out', hint: 'Building the interior of a shop or showroom including display areas, counters, storage, and signage.' },
      { label: 'Hospitality Fit-Out (Cafe / Restaurant / Bar)', hint: 'Constructing the interior of a food or drink venue including kitchen, bar, seating areas, and service zones.' },
      { label: 'Medical / Dental Fit-Out', hint: 'Specialised fit-out for medical or dental practices with strict hygiene, ventilation, and accessibility requirements.' },
      { label: 'Warehouse / Industrial Fit-Out', hint: 'Setting up a warehouse or industrial space with offices, mezzanines, racking, and loading areas.' }
    ],
    scopeFields: [
      { key: 'floor_area', label: 'Floor Area (m\u00B2)', type: 'number', required: true,
        hint: 'The total floor area of the commercial space, in square metres.' },
      { key: 'rooms_zones', label: 'Number of Rooms / Zones', type: 'number', required: true,
        hint: 'How many separate rooms or areas are being created or modified.' },
      { key: 'scope_of_works', label: 'Scope of Works', type: 'multi-select', required: true,
        options: ['Demolition', 'Framing', 'Plastering', 'Painting', 'Flooring', 'Joinery', 'Ceiling Grid', 'Partitions'],
        hint: 'All the types of building work involved. Ceiling grid = suspended ceiling tiles. Partitions = room divider walls.' },
      { key: 'services_coordination', label: 'Services Coordination', type: 'multi-select',
        options: ['Electrical', 'Plumbing', 'HVAC', 'Data / Comms', 'Fire', 'None'],
        hint: 'Which other trades need to be coordinated. Data/Comms = network cabling. Fire = sprinklers and detection.' },
      { key: 'compliance', label: 'Compliance Requirements', type: 'multi-select',
        options: ['BCA Class', 'Fire Rating', 'DDA Accessibility', 'None / Unknown'],
        hint: 'BCA = Building Code of Australia classification. DDA = Disability Discrimination Act (wheelchair access, etc.). Fire Rating = fire-resistant walls/doors.' },
      { key: 'after_hours', label: 'After-Hours Work Required', type: 'boolean',
        hint: 'Whether work must be done outside normal business hours (evenings/weekends) to avoid disrupting the business.' },
      { key: 'timeline', label: 'Timeline Constraint', type: 'text',
        hint: 'Any deadlines — e.g. "Lease starts June 1" or "Must open before Christmas trading period".' }
    ]
  },

  maintenance: {
    label: 'Property Maintenance & Handyman Services',
    subcategories: [
      { label: 'General Repairs', hint: 'Fixing everyday wear-and-tear items around the home like loose handles, cracked tiles, dripping taps, and squeaky hinges.' },
      { label: 'Door & Window Repairs / Replacement', hint: 'Fixing or replacing doors and windows that are damaged, stuck, draughty, or outdated.' },
      { label: 'Lock & Hardware Replacement', hint: 'Swapping out old locks, handles, hinges, and other door or window hardware for new ones.' },
      { label: 'Gutter Cleaning & Repairs', hint: 'Clearing debris from gutters and downpipes, and fixing any leaks, rust holes, or sagging sections.' },
      { label: 'Pressure Washing', hint: 'Using a high-pressure water spray to clean driveways, paths, decks, walls, and other outdoor surfaces.' },
      { label: 'Minor Carpentry', hint: 'Small timber jobs like fixing a broken shelf, replacing skirting boards, trimming a door, or patching timber damage.' },
      { label: 'Fixture Installation (Shelves / Blinds / TVs)', hint: 'Mounting and installing items on walls or ceilings, including shelves, curtain rods, blinds, mirrors, and TV brackets.' },
      { label: 'Weatherproofing & Sealing', hint: 'Sealing gaps around doors, windows, and other openings to keep out draughts, rain, and pests.' }
    ],
    scopeFields: [
      { key: 'task_description', label: 'Task Description', type: 'textarea', required: true,
        hint: 'Describe everything that needs doing. Be as specific as possible — e.g. "Fix squeaky door hinge in bedroom, replace broken towel rail in bathroom".' },
      { key: 'task_count', label: 'Number of Tasks / Items', type: 'number', required: true,
        hint: 'How many separate jobs or items need attention.' },
      { key: 'estimated_hours', label: 'Estimated Hours (if known)', type: 'number',
        hint: 'Your best guess at how long the work will take. Leave blank if you\'re not sure — we\'ll estimate it.' },
      { key: 'access_requirements', label: 'Access Requirements', type: 'select',
        options: ['Standard', 'Ladder Required', 'Roof Access', 'Confined Space'],
        hint: 'Any special access needed. Roof access and confined spaces require additional safety equipment.' },
      { key: 'materials_by', label: 'Materials Supplied By', type: 'select',
        options: ['OSV', 'Client', 'Mix'],
        hint: 'Who is providing the materials. "OSV" = we source and supply everything. "Client" = you provide them. "Mix" = some of each.' },
      { key: 'urgency', label: 'Urgency', type: 'select',
        options: ['Standard', 'Urgent (48hr)', 'Emergency (Same Day)'],
        hint: 'How quickly the work needs to be done. Urgent and emergency jobs attract a higher rate.' }
    ]
  },

  rendering_design: {
    label: '3D Rendering & Visual Design',
    subcategories: [
      { label: 'Architectural 3D Renders', hint: 'Photorealistic computer-generated images of a proposed building or structure, showing exactly how it will look when finished.' },
      { label: 'Landscape Design Renders', hint: '3D visualisations of garden and outdoor designs, including plants, paving, structures, and lighting.' },
      { label: 'Interior Design Visualisation', hint: '3D images of proposed interior layouts showing furniture, materials, colours, and lighting in realistic detail.' },
      { label: 'Before & After Concepts', hint: 'Side-by-side images showing the current state and the proposed design, so you can clearly see the transformation.' },
      { label: 'Drone Survey / Site Modelling', hint: 'Using a drone to capture aerial photos and measurements of a site, then creating a 3D model from the data.' }
    ],
    scopeFields: [
      { key: 'project_description', label: 'Project Description', type: 'textarea', required: true,
        hint: 'Describe what you want visualised — e.g. "3D render of proposed rear deck and pergola extension showing how it connects to the house".' },
      { key: 'views_count', label: 'Number of Views / Angles', type: 'number', required: true,
        hint: 'How many different viewpoints you want rendered. E.g. 1 front view + 1 aerial view = 2 views.' },
      { key: 'revision_rounds', label: 'Revision Rounds', type: 'select',
        options: ['1', '2', '3', 'Unlimited'],
        hint: 'How many rounds of changes are included. Each round lets you request tweaks to colours, materials, layout, etc.' },
      { key: 'source_material', label: 'Source Material', type: 'multi-select',
        options: ['Architectural Plans', 'Sketches', 'Site Photos', 'Drone Footage'],
        hint: 'What reference material you can provide for us to work from.' },
      { key: 'delivery_format', label: 'Delivery Format', type: 'multi-select',
        options: ['Still Images', 'Video Walkthrough', 'PDF Presentation'],
        hint: 'How you want the final renders delivered. Video walkthroughs let you "fly through" the design.' },
      { key: 'resolution', label: 'Resolution', type: 'select',
        options: ['Standard (1080p)', 'High (4K)', 'Print Quality'],
        hint: 'Image quality. Standard is fine for screens; Print Quality is needed for large printed materials.' }
    ]
  },

  project_management: {
    label: 'Project Management & Quoting',
    subcategories: [
      { label: 'Full Project Management', hint: 'We oversee your entire project from start to finish, coordinating trades, scheduling, budgeting, and quality control.' },
      { label: 'Quoting & Estimation Only', hint: 'We provide a detailed cost estimate and scope of works without managing the project. You can use it to plan or compare.' },
      { label: 'Site Supervision', hint: 'Regular on-site visits to check work quality, resolve issues, and keep the project on track and up to standard.' },
      { label: 'Trade Coordination', hint: 'Scheduling and managing multiple tradespeople so they arrive in the right order and don\'t overlap or delay each other.' },
      { label: 'Council / Permit Applications', hint: 'Preparing and lodging building or planning permit applications with your local council on your behalf.' }
    ],
    scopeFields: [
      { key: 'project_description', label: 'Project Description', type: 'textarea', required: true,
        hint: 'Describe the overall project that needs managing — e.g. "Full renovation of 3-bedroom house including kitchen, bathroom, and outdoor area".' },
      { key: 'project_value', label: 'Estimated Project Value ($)', type: 'number', required: true,
        hint: 'The approximate total budget or value of the project being managed, in dollars.' },
      { key: 'project_duration', label: 'Project Duration', type: 'text', required: true,
        hint: 'How long the project is expected to take — e.g. "6 weeks", "3 months".' },
      { key: 'trades_count', label: 'Number of Trades to Coordinate', type: 'number',
        hint: 'How many different trade types are involved — e.g. carpenter, plumber, electrician, tiler = 4 trades.' },
      { key: 'client_plans', label: 'Client-Supplied Plans', type: 'boolean',
        hint: 'Whether you already have architectural or engineering plans for the project.' },
      { key: 'permits_required', label: 'Permits Required', type: 'select',
        options: ['None', 'Council Permit', 'Building Permit', 'Both', 'Unknown'],
        hint: 'What approvals are needed. Council permits cover planning/zoning; building permits cover structural and safety compliance.' },
      { key: 'site_visits', label: 'Site Visits Required', type: 'number',
        hint: 'How many times we need to visit the site for inspections and supervision.' }
    ]
  }
};

export const JOB_TYPE_KEYS = Object.keys(JOB_TYPES);

export function getJobTypeByLabel(label) {
  return Object.entries(JOB_TYPES).find(([, config]) => config.label === label);
}

export function getDefaultScope(jobTypeKey) {
  const config = JOB_TYPES[jobTypeKey];
  if (!config) return {};
  const scope = {};
  config.scopeFields.forEach(field => {
    if (field.default !== undefined) {
      scope[field.key] = field.default;
    } else if (field.type === 'boolean') {
      scope[field.key] = false;
    } else if (field.type === 'multi-select') {
      scope[field.key] = [];
    } else if (field.type === 'number') {
      scope[field.key] = '';
    } else {
      scope[field.key] = '';
    }
  });
  return scope;
}
