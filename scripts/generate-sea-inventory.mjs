import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedTsPath = path.join(root, 'src/data/generated-sea-listings.ts');
const migrationPath = path.join(root, 'migrations/0018_sea_inventory.sql');

const propertyTypes = ['Condo', 'Villa', 'Townhouse', 'Apartment', 'Land', 'House'];
const tones = ['sea', 'sun', 'forest', 'night', 'clay', 'sky'];
const buyStatuses = ['Move-in ready', 'Family-ready', 'Verified seller', 'New to market', 'Value-positioned', 'Quiet lane'];
const rentStatuses = ['Managed rental', 'Ready now', 'Flexible move-in', 'Owner-listed', 'Professionally kept', 'Fast-response rental'];
const saleAdjectives = ['Skyline', 'Courtyard', 'Riverside', 'Garden', 'Transit-linked', 'Harbour-edge', 'Family-scale', 'Design-led', 'Central', 'Quiet-lane'];
const rentAdjectives = ['Move-in ready', 'Flexible', 'Well-run', 'Bright', 'Low-friction', 'Calm', 'Modern', 'Efficient', 'Managed', 'Neighbourhood-first'];
const buyBuyerFits = ['buyers who want a credible long-term hold', 'owner-occupiers who care about liveability first', 'families looking for easier day-to-day flow', 'buyers who want a better district entry point', 'investors who still need real end-user appeal'];
const rentBuyerFits = ['tenants who want an easier move-in path', 'renters who care about reliable daily operations', 'households that want more space without friction', 'professionals who want a cleaner district base', 'tenants who want clearer landlord communication'];
const ownerRoleOptions = ['Owner', 'Exclusive seller', 'Property manager', 'Seller representative', 'Developer team'];
const responseTimes = ['~5 minutes', '~9 minutes', '~14 minutes', '~18 minutes', '~25 minutes'];
const commonFeatures = ['Natural light', 'Storage', 'Parking', 'Lift access', 'Balcony', 'Home office nook', 'Flexible second bedroom', 'Building amenities', 'District retail access', 'Transit connection'];
const auctionTerms = 'Register before the auction window, review the pack, inspect first, and confirm funding before bidding.';

const markets = [
  {
    country: 'Vietnam',
    city: 'Ho Chi Minh City',
    districts: ['Thu Duc City', 'District 1', 'District 7', 'Binh Thanh', 'Tan Binh'],
    wards: ['Thao Dien', 'Ben Nghe', 'Tan Phu', 'Ward 22', 'Ward 2'],
    baseLat: 10.7769,
    baseLng: 106.7009,
    price: { buySuffix: 'B VND', rentSuffix: 'M VND / month', buyMin: 3.8, buyMax: 24.5, rentMin: 16, rentMax: 95 },
    nearby: ['Metro-linked access', 'Retail and dining clusters', 'Well-used school and service network'],
    commute: 'Trips into the strongest business and lifestyle districts stay practical, while daily errands are usually handled within the district itself.',
    names: ['Nguyen Anh', 'Tran Linh', 'Pham Bao', 'Le Minh', 'Vo Hanh'],
  },
  {
    country: 'Vietnam',
    city: 'Hanoi',
    districts: ['Tay Ho', 'Ba Dinh', 'Cau Giay', 'Long Bien', 'Hai Ba Trung'],
    wards: ['Quang An', 'Ngoc Ha', 'Dich Vong', 'Bo De', 'Pham Dinh Ho'],
    baseLat: 21.0285,
    baseLng: 105.8542,
    price: { buySuffix: 'B VND', rentSuffix: 'M VND / month', buyMin: 3.2, buyMax: 22.8, rentMin: 14, rentMax: 82 },
    nearby: ['Lake and park access', 'Embassy and office reach', 'Daily retail and school access'],
    commute: 'Most core-city trips are practical, while district-level errands stay easier than fully central addresses.',
    names: ['Nguyen Bao', 'Hoang Linh', 'Do Minh', 'Bui Trang', 'Dang Phuong'],
  },
  {
    country: 'Vietnam',
    city: 'Da Nang',
    districts: ['Hai Chau', 'Son Tra', 'Ngu Hanh Son', 'Thanh Khe', 'Cam Le'],
    wards: ['Binh Hien', 'An Hai Bac', 'My An', 'Xuan Ha', 'Hoa Tho Dong'],
    baseLat: 16.0544,
    baseLng: 108.2022,
    price: { buySuffix: 'B VND', rentSuffix: 'M VND / month', buyMin: 2.1, buyMax: 14.8, rentMin: 10, rentMax: 48 },
    nearby: ['Beach and city access', 'Airport practicality', 'Growing cafe and service mix'],
    commute: 'Cross-city trips are usually short by regional standards, and daily access tends to stay low-friction.',
    names: ['Tran Minh', 'Nguyen Uyen', 'Le Quang', 'Pham Ha', 'Vo An'],
  },
  {
    country: 'Singapore',
    city: 'Singapore',
    districts: ['Orchard', 'River Valley', 'Tanjong Pagar', 'Novena', 'East Coast'],
    wards: ['Tanglin', 'Somerset', 'Robertson Quay', 'Outram', 'Katong'],
    baseLat: 1.3521,
    baseLng: 103.8198,
    price: { buySuffix: 'M SGD', rentSuffix: 'SGD / month', buyMin: 1.2, buyMax: 9.8, rentMin: 3200, rentMax: 16500 },
    nearby: ['MRT reach', 'Prime retail access', 'School and lifestyle anchors'],
    commute: 'Transit access is usually strong, with business and lifestyle districts well connected for daily movement.',
    names: ['Amelia Tan', 'Marcus Lim', 'Rachel Goh', 'Daniel Teo', 'Ethan Ong'],
  },
  {
    country: 'Indonesia',
    city: 'Jakarta',
    districts: ['SCBD', 'Menteng', 'Kuningan', 'Kemang', 'Pantai Indah Kapuk'],
    wards: ['Senayan', 'Menteng', 'Setiabudi', 'Bangka', 'Kapuk Muara'],
    baseLat: -6.2088,
    baseLng: 106.8456,
    price: { buySuffix: 'B IDR', rentSuffix: 'M IDR / month', buyMin: 2.4, buyMax: 26.5, rentMin: 18, rentMax: 140 },
    nearby: ['Office core access', 'Mall and dining clusters', 'International school routes'],
    commute: 'Daily movement is strongest when the district matches the work and lifestyle pattern, which is why micro-location matters here.',
    names: ['Nadia Putri', 'Rizky Pratama', 'Ayu Lestari', 'Bima Hartono', 'Kevin Wijaya'],
  },
  {
    country: 'Thailand',
    city: 'Bangkok',
    districts: ['Sukhumvit', 'Sathorn', 'Ari', 'Thonglor', 'Rama 9'],
    wards: ['Phrom Phong', 'Chong Nonsi', 'Samsen Nai', 'Khlong Tan Nuea', 'Huai Khwang'],
    baseLat: 13.7563,
    baseLng: 100.5018,
    price: { buySuffix: 'M THB', rentSuffix: 'THB / month', buyMin: 4.5, buyMax: 42.0, rentMin: 22000, rentMax: 185000 },
    nearby: ['BTS or MRT access', 'Dining and wellness clusters', 'Daily retail convenience'],
    commute: 'Well-connected districts reduce daily friction materially, especially where rail and lifestyle anchors overlap.',
    names: ['Narin Chai', 'Suda Kitt', 'Pimlada Sae', 'Arthit Wong', 'Kanya Rung'],
  },
  {
    country: 'Philippines',
    city: 'Manila',
    districts: ['Makati', 'BGC', 'Ortigas', 'Pasig', 'Alabang'],
    wards: ['Salcedo', 'Fort Bonifacio', 'San Antonio', 'Kapitolyo', 'Ayala Alabang'],
    baseLat: 14.5995,
    baseLng: 120.9842,
    price: { buySuffix: 'M PHP', rentSuffix: 'PHP / month', buyMin: 5.5, buyMax: 75.0, rentMin: 25000, rentMax: 220000 },
    nearby: ['Business district access', 'School and hospital reach', 'Retail-led convenience'],
    commute: 'The strongest value comes from matching district choice to daily travel patterns and avoiding avoidable cross-city friction.',
    names: ['Alyssa Cruz', 'Miguel Santos', 'Jana Reyes', 'Paolo Garcia', 'Nicole Tan'],
  },
  {
    country: 'Malaysia',
    city: 'Kuala Lumpur',
    districts: ['KLCC', 'Bangsar', 'Mont Kiara', 'Damansara Heights', 'Cheras'],
    wards: ['City Centre', 'Telawi', 'Segambut', 'Bukit Damansara', 'Taman Connaught'],
    baseLat: 3.139,
    baseLng: 101.6869,
    price: { buySuffix: 'M MYR', rentSuffix: 'MYR / month', buyMin: 0.9, buyMax: 8.4, rentMin: 2200, rentMax: 21000 },
    nearby: ['Transit and road access', 'Mall and dining convenience', 'International school routes'],
    commute: 'City access is usually manageable when the district is chosen for work pattern first rather than just postcode prestige.',
    names: ['Aina Rahman', 'Daniel Lee', 'Farah Ismail', 'Jason Tan', 'Nurul Sofea'],
  },
  {
    country: 'Brunei',
    city: 'Bandar Seri Begawan',
    districts: ['Kiulap', 'Gadong', 'Beribi', 'Kiarong', 'Mata-Mata'],
    wards: ['Kiulap', 'Gadong', 'Beribi', 'Kiarong', 'Mata-Mata'],
    baseLat: 4.9031,
    baseLng: 114.9398,
    price: { buySuffix: 'M BND', rentSuffix: 'BND / month', buyMin: 0.4, buyMax: 3.5, rentMin: 1200, rentMax: 9500 },
    nearby: ['Retail corridors', 'Embassy and civic access', 'Family services'],
    commute: 'Most cross-city movement stays manageable, so home choice can focus more on fit and service access than raw travel time.',
    names: ['Afiq Hamzah', 'Nur Izzah', 'Haziq Rahman', 'Siti Huda', 'Hakim Yusof'],
  },
  {
    country: 'Myanmar',
    city: 'Yangon',
    districts: ['Bahan', 'Mayangon', 'Yankin', 'Kamayut', 'Sanchaung'],
    wards: ['Golden Valley', 'Mayangon', 'Yankin', 'Hledan', 'Sanchaung'],
    baseLat: 16.8409,
    baseLng: 96.1735,
    price: { buySuffix: 'B MMK', rentSuffix: 'M MMK / month', buyMin: 0.6, buyMax: 7.5, rentMin: 1.2, rentMax: 18 },
    nearby: ['Commercial corridors', 'International school access', 'Neighbourhood services'],
    commute: 'District choice materially affects daily convenience, so stronger micro-location usually matters more than headline size.',
    names: ['Aye Chan', 'Moe Thidar', 'Kyaw Min', 'Su Mon', 'Htet Lin'],
  },
  {
    country: 'Cambodia',
    city: 'Phnom Penh',
    districts: ['BKK1', 'Toul Kork', 'Daun Penh', 'Chroy Changvar', 'Sen Sok'],
    wards: ['Boeung Keng Kang', 'Tuek Lakk', 'Wat Phnom', 'Sangkat Chroy Changvar', 'Khmuonh'],
    baseLat: 11.5564,
    baseLng: 104.9282,
    price: { buySuffix: 'M USD', rentSuffix: 'USD / month', buyMin: 0.18, buyMax: 2.6, rentMin: 700, rentMax: 6200 },
    nearby: ['Embassy and dining areas', 'International school access', 'Retail and daily services'],
    commute: 'The strongest buyer and renter experience usually comes from staying close to work, school, and reliable service corridors.',
    names: ['Sokha Lim', 'Dara Chan', 'Malis Nguon', 'Piseth Sok', 'Vannak Heng'],
  },
  {
    country: 'Laos',
    city: 'Vientiane',
    districts: ['Sisattanak', 'Chanthabuly', 'Xaysetha', 'Sikhottabong', 'Hadxaifong'],
    wards: ['Dongpalane', 'Watchan', 'Phonetong', 'Nongtha', 'Kaoliao'],
    baseLat: 17.9757,
    baseLng: 102.6331,
    price: { buySuffix: 'M USD', rentSuffix: 'USD / month', buyMin: 0.12, buyMax: 1.9, rentMin: 550, rentMax: 4800 },
    nearby: ['Embassy and civic access', 'Riverfront routes', 'Daily services and schools'],
    commute: 'City movement is generally manageable, which makes neighbourhood fit and service quality the more decisive factors.',
    names: ['Anousone Vong', 'Kanya Phom', 'Sengdavone Keo', 'Noy Chantha', 'Vilayphone Souk'],
  },
];

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPrice(market, intent, raw) {
  if (intent === 'buy') {
    return { numericPrice: raw, priceLabel: `${formatNumber(raw)}${market.price.buySuffix}`, priceUnit: market.price.buySuffix.replace(/^.*\s/, '').includes('/ month') ? market.price.buySuffix : market.price.buySuffix.replace(/^[0-9.]+/, '').trim() };
  }
  return { numericPrice: raw, priceLabel: `${Math.round(raw).toLocaleString('en-US')} ${market.price.rentSuffix}`, priceUnit: market.price.rentSuffix };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function deterministic(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function buildListing(market, index) {
  const district = market.districts[index % market.districts.length];
  const ward = market.wards[index % market.wards.length];
  const type = propertyTypes[index % propertyTypes.length];
  const intent = index % 5 < 2 ? 'rent' : 'buy';
  const saleMode = intent === 'buy' && index % 10 === 0 ? 'auction' : 'private-sale';
  const adjective = (intent === 'rent' ? rentAdjectives : saleAdjectives)[index % (intent === 'rent' ? rentAdjectives.length : saleAdjectives.length)];
  const fit = (intent === 'rent' ? rentBuyerFits : buyBuyerFits)[index % (intent === 'rent' ? rentBuyerFits.length : buyBuyerFits.length)];
  const ownerName = market.names[index % market.names.length];
  const ownerRole = ownerRoleOptions[index % ownerRoleOptions.length];
  const ownerVerified = index % 3 !== 1;
  const responseTime = responseTimes[index % responseTimes.length];
  const tone = tones[index % tones.length];
  const beds = type === 'Land' ? 0 : clamp((index % 5) + (intent === 'buy' ? 2 : 1), 1, 5);
  const baths = type === 'Land' ? 0 : clamp(beds - (index % 2 === 0 ? 0 : 1), 1, 5);
  const area = type === 'Land' ? 220 + (index % 8) * 60 : 58 + (index % 9) * 22 + (type === 'Villa' || type === 'House' ? 90 : 0);
  const buySpan = market.price.buyMax - market.price.buyMin;
  const rentSpan = market.price.rentMax - market.price.rentMin;
  const rawPrice = intent === 'buy'
    ? Number((market.price.buyMin + buySpan * (0.08 + (index % 47) / 52)).toFixed(1))
    : Math.round(market.price.rentMin + rentSpan * (0.05 + (index % 43) / 48));
  const { numericPrice, priceLabel, priceUnit } = formatPrice(market, intent, rawPrice);
  const titleCore = `${adjective} ${type.toLowerCase()} in ${district}`;
  const title = saleMode === 'auction' ? `${titleCore} auction` : titleCore;
  const status = saleMode === 'auction' ? ['Auction inventory', 'Timed bidding', 'Inspection-ready'][index % 3] : (intent === 'rent' ? rentStatuses[index % rentStatuses.length] : buyStatuses[index % buyStatuses.length]);
  const featureA = commonFeatures[index % commonFeatures.length];
  const featureB = commonFeatures[(index + 3) % commonFeatures.length];
  const featureC = commonFeatures[(index + 6) % commonFeatures.length];
  const summary = intent === 'buy'
    ? `${adjective} ${type.toLowerCase()} in ${district}, ${market.city} for ${fit}, with ${featureA.toLowerCase()} and ${featureB.toLowerCase()} already doing the hard work.`
    : `${adjective} ${type.toLowerCase()} in ${district}, ${market.city} for ${fit}, with ${featureA.toLowerCase()} and ${featureB.toLowerCase()} making the move-in path easier.`;
  const description = intent === 'buy'
    ? `This ${type.toLowerCase()} is aimed at ${fit}. The layout, district fit, and service access make it easier to justify both the initial decision and the longer hold, especially when compared with thinner stock elsewhere in ${market.city}.`
    : `This rental is aimed at ${fit}. The combination of ${featureA.toLowerCase()}, ${featureB.toLowerCase()}, and ${featureC.toLowerCase()} gives tenants a cleaner day-to-day setup than generic rental stock in ${market.city}.`;
  const tags = [district, market.country, saleMode === 'auction' ? 'Auction' : intent === 'rent' ? 'Rental' : 'For sale'];
  const features = [featureA, featureB, featureC, commonFeatures[(index + 8) % commonFeatures.length]];
  const baseDate = new Date(Date.UTC(2026, 2, 1 + (index % 25), 8 + (index % 11), 0, 0));
  const auctionStartsAt = saleMode === 'auction' ? new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 2).toISOString() : null;
  const auctionEndsAt = saleMode === 'auction' ? new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 4).toISOString() : null;
  const lat = Number((market.baseLat + ((index % 10) - 5) * 0.006 + deterministic(index + 1) * 0.002).toFixed(6));
  const lng = Number((market.baseLng + ((index % 7) - 3) * 0.006 + deterministic(index + 9) * 0.002).toFixed(6));
  const slug = slugify(`${market.city}-${district}-${ward}-${title}-${index + 1}`);

  return {
    slug,
    title: title.replace(/\b\w/g, (char) => char.toUpperCase()),
    country: market.country,
    city: market.city,
    district,
    ward,
    type,
    intent,
    priceLabel,
    numericPrice,
    priceUnit,
    beds,
    baths,
    area,
    status,
    tone,
    summary,
    description,
    tags,
    features,
    owner: {
      name: ownerName,
      role: ownerRole,
      responseTime,
      verified: ownerVerified,
    },
    stats: {
      views24h: 35 + (index % 18) * 11,
      saves: 4 + (index % 14) * 2,
      enquiries: 1 + (index % 9),
    },
    location: {
      lat,
      lng,
      precisionLabel: `Approximate area in ${district}`,
    },
    neighborhood: {
      headline: `${district} in ${market.city}, ${market.country} suits ${fit}, especially when buyers and renters care about cleaner neighborhood fit rather than only headline pricing.`,
      commute: market.commute,
      nearby: market.nearby,
      trustSignals: [ownerVerified ? 'Verified contact' : 'Direct contact', saleMode === 'auction' ? 'Auction pack available' : 'Structured listing flow', 'Clear location context'],
    },
    saleMode,
    auction: saleMode === 'auction' ? {
      startsAt: auctionStartsAt,
      endsAt: auctionEndsAt,
      startingPriceLabel: priceLabel.replace(/^/, 'Starting bid '),
      reservePriceLabel: 'Reserve on request',
      terms: auctionTerms,
      phase: 'scheduled',
    } : undefined,
  };
}

const listings = markets.flatMap((market) => Array.from({ length: 50 }, (_, index) => buildListing(market, index)));

const tsBody = `// Auto-generated by scripts/generate-sea-inventory.mjs\nexport const generatedSeaListings = ${JSON.stringify(listings, null, 2)};\n`;
fs.writeFileSync(generatedTsPath, tsBody);

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

const existingCountryUpdates = [
  ["Ho Chi Minh City", 'Vietnam'],
  ['Hanoi', 'Vietnam'],
  ['Da Nang', 'Vietnam'],
];

const sqlRows = listings.map((listing, index) => {
  const createdAt = new Date(Date.UTC(2026, 1, 1 + (index % 28), 3 + (index % 8), (index * 7) % 60, 0)).toISOString();
  const ownerEmail = `${listing.owner.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@demo.property-app.local`;
  const ownerPhone = `+65 8${String(1000000 + index).slice(-7)}`;
  return `(${[
    sqlString(listing.slug),
    sqlString(listing.title),
    sqlString(listing.country),
    sqlString(listing.city),
    sqlString(listing.district),
    sqlString(listing.ward),
    sqlString(listing.type),
    sqlString(listing.intent),
    sqlString(listing.priceLabel),
    sqlString(listing.numericPrice),
    sqlString(listing.priceUnit),
    sqlString(listing.beds),
    sqlString(listing.baths),
    sqlString(listing.area),
    sqlString(listing.status),
    sqlString(listing.tone),
    sqlString(listing.summary),
    sqlString(listing.description),
    sqlString(JSON.stringify(listing.tags)),
    sqlString(JSON.stringify(listing.features)),
    sqlString('[]'),
    sqlString(listing.neighborhood.headline),
    sqlString(listing.neighborhood.commute),
    sqlString(JSON.stringify(listing.neighborhood.nearby)),
    sqlString(JSON.stringify(listing.neighborhood.trustSignals)),
    sqlString(listing.location.lat),
    sqlString(listing.location.lng),
    sqlString(listing.location.precisionLabel),
    sqlString(listing.saleMode || 'private-sale'),
    sqlString(listing.auction?.startsAt || null),
    sqlString(listing.auction?.endsAt || null),
    sqlString(listing.auction?.startingPriceLabel || null),
    sqlString(listing.auction?.reservePriceLabel || null),
    sqlString(listing.auction?.terms || null),
    'NULL',
    sqlString('paid'),
    'NULL',
    'NULL',
    'NULL',
    sqlString(listing.owner.name),
    sqlString(ownerEmail),
    sqlString(ownerPhone),
    sqlString(listing.owner.role),
    sqlString(listing.owner.responseTime),
    sqlString(listing.owner.verified ? 1 : 0),
    sqlString(listing.stats.views24h),
    sqlString(listing.stats.saves),
    sqlString(listing.stats.enquiries),
    sqlString(1),
    sqlString(createdAt),
  ].join(', ')})`;
});

const insertPrefix = `INSERT OR IGNORE INTO listings (
  slug, title, country, city, district, ward, property_type, intent,
  price_label, numeric_price, price_unit, beds, baths, area,
  status, tone, summary, description, tags, features, image_keys,
  neighborhood_headline, commute_notes, nearby_places, trust_signals,
  lat, lng, location_precision_label,
  sale_mode, auction_starts_at, auction_ends_at, auction_starting_price_label, auction_reserve_price_label, auction_terms,
  owner_user_id, plan_type, trial_ends_at, paid_until, promoted_until,
  owner_name, owner_email, owner_phone, owner_role, owner_response_time, owner_verified,
  views_24h, saves, enquiries, published, created_at
) VALUES`;

const chunkSize = 20;
const insertStatements = [];
for (let index = 0; index < sqlRows.length; index += chunkSize) {
  const chunk = sqlRows.slice(index, index + chunkSize);
  insertStatements.push(`${insertPrefix}\n${chunk.join(',\n')};`);
}

const migrationSql = `ALTER TABLE listings ADD COLUMN country TEXT NOT NULL DEFAULT 'Vietnam';
CREATE INDEX IF NOT EXISTS idx_listings_country_city ON listings(country, city);
${existingCountryUpdates.map(([city, country]) => `UPDATE listings SET country = '${country}' WHERE city = '${city}';`).join('\n')}

${insertStatements.join('\n\n')}
`;

fs.writeFileSync(migrationPath, migrationSql);
console.log(`Generated ${listings.length} listings`);
console.log(`Wrote ${generatedTsPath}`);
console.log(`Wrote ${migrationPath}`);
