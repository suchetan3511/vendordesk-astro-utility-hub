/**
 * Common LTL commodities and how they classify.
 *
 * A deliberate omission: there is no NMFC item-number column. Item numbers are part of the
 * licensed NMFTA publication, and Docket 2025-1 consolidated roughly 2,000 listings in
 * July 2025 — so any item number floating around free on the web is probably stale. Publishing
 * numbers we cannot stand behind would make this page look authoritative while being wrong,
 * which is the opposite of useful. What we can say accurately is whether a commodity rates on
 * density or on a fixed class, and what class it typically lands at.
 *
 * `typicalClass` is indicative, for orientation before you look up the real listing. For
 * density-based commodities the actual class depends entirely on how that particular shipment
 * is packed.
 */

export type ClassBasis = 'density' | 'fixed';

export interface NmfcEntry {
	commodity: string;
	basis: ClassBasis;
	/** A single class, or a range for density-based goods that vary by packing. */
	typicalClass: string;
	category: string;
}

export const NMFC_CATEGORIES = [
	'Building & construction',
	'Metals & hardware',
	'Automotive',
	'Food & beverage',
	'Furniture & fixtures',
	'Electronics & appliances',
	'Apparel & textiles',
	'Machinery & industrial',
	'Paper, print & packaging',
	'Household & retail goods',
	'Sporting & recreation',
	'Medical & laboratory',
	'Chemicals & plastics',
	'Agriculture & outdoor',
] as const;

export const NMFC_COMMODITIES: NmfcEntry[] = [
	// Building & construction
	{ commodity: 'Bricks, common clay', basis: 'density', typicalClass: '50', category: 'Building & construction' },
	{ commodity: 'Cement, bagged', basis: 'density', typicalClass: '50', category: 'Building & construction' },
	{ commodity: 'Concrete blocks', basis: 'density', typicalClass: '50', category: 'Building & construction' },
	{ commodity: 'Ceramic tile, boxed', basis: 'density', typicalClass: '55–60', category: 'Building & construction' },
	{ commodity: 'Hardwood flooring, boxed', basis: 'density', typicalClass: '55–60', category: 'Building & construction' },
	{ commodity: 'Lumber, banded', basis: 'density', typicalClass: '55–70', category: 'Building & construction' },
	{ commodity: 'Plywood and sheet board', basis: 'density', typicalClass: '55–70', category: 'Building & construction' },
	{ commodity: 'Roofing shingles, palletized', basis: 'density', typicalClass: '50–55', category: 'Building & construction' },
	{ commodity: 'Drywall / gypsum board', basis: 'density', typicalClass: '60–70', category: 'Building & construction' },
	{ commodity: 'Molding and trim', basis: 'density', typicalClass: '55–85', category: 'Building & construction' },
	{ commodity: 'Windows, crated', basis: 'density', typicalClass: '85–125', category: 'Building & construction' },
	{ commodity: 'Doors, wood, crated', basis: 'density', typicalClass: '70–100', category: 'Building & construction' },
	{ commodity: 'Insulation, batts or foam board', basis: 'density', typicalClass: '250–400', category: 'Building & construction' },
	{ commodity: 'PVC pipe', basis: 'density', typicalClass: '125–250', category: 'Building & construction' },

	// Metals & hardware
	{ commodity: 'Steel plate', basis: 'density', typicalClass: '50', category: 'Metals & hardware' },
	{ commodity: 'Steel bar and rod', basis: 'density', typicalClass: '50', category: 'Metals & hardware' },
	{ commodity: 'Nuts, bolts and fasteners', basis: 'density', typicalClass: '50', category: 'Metals & hardware' },
	{ commodity: 'Sheet metal, flat-stacked', basis: 'density', typicalClass: '50–60', category: 'Metals & hardware' },
	{ commodity: 'Sheet metal parts, formed', basis: 'density', typicalClass: '125–250', category: 'Metals & hardware' },
	{ commodity: 'Aluminium extrusions', basis: 'density', typicalClass: '70–125', category: 'Metals & hardware' },
	{ commodity: 'Copper tubing', basis: 'density', typicalClass: '60–85', category: 'Metals & hardware' },
	{ commodity: 'Wire rope and cable, reeled', basis: 'density', typicalClass: '50–65', category: 'Metals & hardware' },
	{ commodity: 'Hand tools, boxed', basis: 'density', typicalClass: '60–85', category: 'Metals & hardware' },
	{ commodity: 'Chain, palletized', basis: 'density', typicalClass: '50', category: 'Metals & hardware' },

	// Automotive
	{ commodity: 'Engines, crated', basis: 'density', typicalClass: '70–85', category: 'Automotive' },
	{ commodity: 'Transmissions, crated', basis: 'density', typicalClass: '70–85', category: 'Automotive' },
	{ commodity: 'Car parts, boxed', basis: 'density', typicalClass: '65–85', category: 'Automotive' },
	{ commodity: 'Car accessories', basis: 'density', typicalClass: '60–100', category: 'Automotive' },
	{ commodity: 'Tires, new', basis: 'density', typicalClass: '85–125', category: 'Automotive' },
	{ commodity: 'Batteries, lead-acid', basis: 'fixed', typicalClass: '60–70', category: 'Automotive' },
	{ commodity: 'Auto body sheet metal panels', basis: 'density', typicalClass: '150–250', category: 'Automotive' },
	{ commodity: 'Bumpers, plastic', basis: 'density', typicalClass: '250–400', category: 'Automotive' },
	{ commodity: 'Windshields, crated', basis: 'density', typicalClass: '85–125', category: 'Automotive' },

	// Food & beverage
	{ commodity: 'Bottled beverages, palletized', basis: 'density', typicalClass: '60–65', category: 'Food & beverage' },
	{ commodity: 'Canned goods, palletized', basis: 'density', typicalClass: '55–65', category: 'Food & beverage' },
	{ commodity: 'Wine, cased', basis: 'density', typicalClass: '65–100', category: 'Food & beverage' },
	{ commodity: 'Flour and sugar, bagged', basis: 'density', typicalClass: '50–60', category: 'Food & beverage' },
	{ commodity: 'Coffee, roasted, bagged', basis: 'density', typicalClass: '100–175', category: 'Food & beverage' },
	{ commodity: 'Snack foods, boxed', basis: 'density', typicalClass: '175–400', category: 'Food & beverage' },
	{ commodity: 'Frozen foods, palletized', basis: 'density', typicalClass: '60–85', category: 'Food & beverage' },
	{ commodity: 'Bottled water, palletized', basis: 'density', typicalClass: '50–60', category: 'Food & beverage' },

	// Furniture & fixtures
	{ commodity: 'Bathroom fixtures, crated', basis: 'density', typicalClass: '85–125', category: 'Furniture & fixtures' },
	{ commodity: 'Cabinets, wood, assembled', basis: 'density', typicalClass: '250–300', category: 'Furniture & fixtures' },
	{ commodity: 'Cabinets, flat-packed', basis: 'density', typicalClass: '100–125', category: 'Furniture & fixtures' },
	{ commodity: 'Bookcases, assembled', basis: 'density', typicalClass: '125–175', category: 'Furniture & fixtures' },
	{ commodity: 'Tables and chairs, assembled', basis: 'density', typicalClass: '250–300', category: 'Furniture & fixtures' },
	{ commodity: 'Couches and upholstered furniture', basis: 'density', typicalClass: '175–300', category: 'Furniture & fixtures' },
	{ commodity: 'Mattresses', basis: 'density', typicalClass: '175–300', category: 'Furniture & fixtures' },
	{ commodity: 'Office desks, crated', basis: 'density', typicalClass: '85–125', category: 'Furniture & fixtures' },
	{ commodity: 'Shelving, steel, knocked down', basis: 'density', typicalClass: '70–100', category: 'Furniture & fixtures' },

	// Electronics & appliances
	{ commodity: 'Computers and servers, boxed', basis: 'density', typicalClass: '92.5–125', category: 'Electronics & appliances' },
	{ commodity: 'Monitors and displays, boxed', basis: 'density', typicalClass: '92.5–150', category: 'Electronics & appliances' },
	{ commodity: 'Flat-panel televisions', basis: 'density', typicalClass: '125–250', category: 'Electronics & appliances' },
	{ commodity: 'Refrigerators', basis: 'density', typicalClass: '92.5–125', category: 'Electronics & appliances' },
	{ commodity: 'Washing machines and dryers', basis: 'density', typicalClass: '85–100', category: 'Electronics & appliances' },
	{ commodity: 'Small kitchen appliances, boxed', basis: 'density', typicalClass: '100–175', category: 'Electronics & appliances' },
	{ commodity: 'Cable and wiring assemblies', basis: 'density', typicalClass: '85–125', category: 'Electronics & appliances' },
	{ commodity: 'Lighting fixtures, boxed', basis: 'density', typicalClass: '125–250', category: 'Electronics & appliances' },
	{ commodity: 'Lamp shades', basis: 'density', typicalClass: '300–400', category: 'Electronics & appliances' },

	// Apparel & textiles
	{ commodity: 'Clothing, boxed', basis: 'density', typicalClass: '125–175', category: 'Apparel & textiles' },
	{ commodity: 'Clothing on hangers', basis: 'density', typicalClass: '175–250', category: 'Apparel & textiles' },
	{ commodity: 'Fabric rolls', basis: 'density', typicalClass: '85–125', category: 'Apparel & textiles' },
	{ commodity: 'Carpet and rugs, rolled', basis: 'density', typicalClass: '85–125', category: 'Apparel & textiles' },
	{ commodity: 'Shoes, boxed', basis: 'density', typicalClass: '125–175', category: 'Apparel & textiles' },
	{ commodity: 'Canvas and boat covers', basis: 'density', typicalClass: '100–125', category: 'Apparel & textiles' },
	{ commodity: 'Pillows and bedding', basis: 'density', typicalClass: '300–400', category: 'Apparel & textiles' },

	// Machinery & industrial
	{ commodity: 'Machinery, crated', basis: 'density', typicalClass: '70–85', category: 'Machinery & industrial' },
	{ commodity: 'Machine parts, boxed', basis: 'density', typicalClass: '70–100', category: 'Machinery & industrial' },
	{ commodity: 'Cast iron stoves', basis: 'density', typicalClass: '85', category: 'Machinery & industrial' },
	{ commodity: 'Table saws and bench tools', basis: 'density', typicalClass: '100–125', category: 'Machinery & industrial' },
	{ commodity: 'Pumps and compressors', basis: 'density', typicalClass: '70–100', category: 'Machinery & industrial' },
	{ commodity: 'Electric motors', basis: 'density', typicalClass: '60–85', category: 'Machinery & industrial' },
	{ commodity: 'HVAC units, crated', basis: 'density', typicalClass: '92.5–150', category: 'Machinery & industrial' },
	{ commodity: 'Generators, crated', basis: 'density', typicalClass: '70–100', category: 'Machinery & industrial' },

	// Paper, print & packaging
	{ commodity: 'Books, boxed', basis: 'density', typicalClass: '55–65', category: 'Paper, print & packaging' },
	{ commodity: 'Paper, cartoned', basis: 'density', typicalClass: '55–70', category: 'Paper, print & packaging' },
	{ commodity: 'Corrugated boxes, flat, banded', basis: 'density', typicalClass: '85–125', category: 'Paper, print & packaging' },
	{ commodity: 'Corrugated boxes, assembled', basis: 'density', typicalClass: '300–400', category: 'Paper, print & packaging' },
	{ commodity: 'Printed catalogues and brochures', basis: 'density', typicalClass: '55–70', category: 'Paper, print & packaging' },
	{ commodity: 'Plastic film and stretch wrap', basis: 'density', typicalClass: '70–125', category: 'Paper, print & packaging' },
	{ commodity: 'Empty plastic bottles', basis: 'density', typicalClass: '400–500', category: 'Paper, print & packaging' },

	// Household & retail goods
	{ commodity: 'Framed artwork', basis: 'density', typicalClass: '110–250', category: 'Household & retail goods' },
	{ commodity: 'Caskets', basis: 'density', typicalClass: '100–150', category: 'Household & retail goods' },
	{ commodity: 'Display racks, lightweight', basis: 'density', typicalClass: '300–400', category: 'Household & retail goods' },
	{ commodity: 'Toys, boxed', basis: 'density', typicalClass: '150–250', category: 'Household & retail goods' },
	{ commodity: 'Glassware and ceramics, packed', basis: 'density', typicalClass: '85–150', category: 'Household & retail goods' },
	{ commodity: 'Cleaning supplies, cased', basis: 'density', typicalClass: '65–100', category: 'Household & retail goods' },

	// Sporting & recreation
	{ commodity: 'Bicycles, boxed', basis: 'density', typicalClass: '150–250', category: 'Sporting & recreation' },
	{ commodity: 'Exercise equipment', basis: 'density', typicalClass: '100–175', category: 'Sporting & recreation' },
	{ commodity: 'Kayaks and canoes', basis: 'density', typicalClass: '300–400', category: 'Sporting & recreation' },
	{ commodity: 'Model boats', basis: 'density', typicalClass: '300', category: 'Sporting & recreation' },
	{ commodity: 'Ping-pong balls', basis: 'density', typicalClass: '400–500', category: 'Sporting & recreation' },

	// Medical & laboratory
	{ commodity: 'Medical devices, crated', basis: 'fixed', typicalClass: '92.5–175', category: 'Medical & laboratory' },
	{ commodity: 'Hospital beds', basis: 'density', typicalClass: '150–250', category: 'Medical & laboratory' },
	{ commodity: 'Laboratory glassware', basis: 'density', typicalClass: '125–250', category: 'Medical & laboratory' },
	{ commodity: 'Pharmaceuticals, boxed', basis: 'fixed', typicalClass: '70–125', category: 'Medical & laboratory' },

	// Chemicals & plastics
	{ commodity: 'Paint, cased', basis: 'density', typicalClass: '60–85', category: 'Chemicals & plastics' },
	{ commodity: 'Adhesives, drummed', basis: 'density', typicalClass: '55–70', category: 'Chemicals & plastics' },
	{ commodity: 'Plastic resin pellets, bagged', basis: 'density', typicalClass: '55–65', category: 'Chemicals & plastics' },
	{ commodity: 'Hazardous materials, packaged', basis: 'fixed', typicalClass: 'Varies', category: 'Chemicals & plastics' },
	{ commodity: 'Foam products', basis: 'density', typicalClass: '400–500', category: 'Chemicals & plastics' },

	// Agriculture & outdoor
	{ commodity: 'Fertilizer, bagged', basis: 'density', typicalClass: '50–55', category: 'Agriculture & outdoor' },
	{ commodity: 'Seed, bagged', basis: 'density', typicalClass: '55–65', category: 'Agriculture & outdoor' },
	{ commodity: 'Garden tools', basis: 'density', typicalClass: '100–150', category: 'Agriculture & outdoor' },
	{ commodity: 'Patio furniture, assembled', basis: 'density', typicalClass: '250–400', category: 'Agriculture & outdoor' },
	{ commodity: 'Nursery stock and plants', basis: 'fixed', typicalClass: '150–300', category: 'Agriculture & outdoor' },
	{ commodity: 'Deer antlers', basis: 'density', typicalClass: '400', category: 'Agriculture & outdoor' },
];
