// Curated real-world outdoor rest areas in central Łódź, Poland
// Each area contains geographic centroid [lng, lat], boundary polygon,
// 3D obstruction profile, and amenity/health metadata.

export const LODZ_CENTER = {
  lng: 19.4586,
  lat: 51.7687,
  zoom: 14.2
};

// Default user position (Piotrkowska 70, pedestrian heart of Łódź)
export const DEFAULT_USER_LOCATION = [19.4574, 51.7678];

export const SUNNY_AREAS = [
  {
    id: 'spot-rubinstein',
    name: 'Pasaż Rubinsteina & Promenade',
    category: 'bench',
    categoryLabel: 'Urban Parklet Area',
    address: 'ul. Piotrkowska 76/78, Łódź',
    coordinates: [19.4578, 51.7690],
    polygon: [
      [19.4566, 51.7695],
      [19.4592, 51.7692],
      [19.4589, 51.7684],
      [19.4564, 51.7687],
      [19.4566, 51.7695]
    ],
    skyViewFactor: 0.78,
    minSunElevation: 16,
    azimuthRange: [145, 215],
    seatingType: 'Teak wood park benches with backrests',
    windShielding: 'High (protected by historic tenement walls)',
    description: 'Sheltered urban promenade branching off Piotrkowska. Catches concentrated southern solar beams between 11:30 and 14:00.',
    partnerCafe: {
      name: 'The Brick Coffee Factory',
      distance: '45m away',
      address: 'ul. Piotrkowska 63',
      perk: 'Buy one flat white, get warm cinnamon bun for 5 PLN',
      code: 'LUMOS-BRICK5'
    }
  },
  {
    id: 'spot-sienkiewicz',
    name: 'Park Sienkiewicza (Central Meadow Area)',
    category: 'park',
    categoryLabel: 'Park Glade',
    address: 'Park im. H. Sienkiewicza, Łódź',
    coordinates: [19.4632, 51.7645],
    polygon: [
      [19.4615, 51.7658],
      [19.4655, 51.7654],
      [19.4650, 51.7635],
      [19.4610, 51.7638],
      [19.4615, 51.7658]
    ],
    skyViewFactor: 0.88,
    minSunElevation: 14,
    azimuthRange: [135, 225],
    seatingType: 'Classical park benches along central gravel lane',
    windShielding: 'Medium (buffered by mature trees)',
    description: 'Central historic city park. Bare winter tree canopies allow 70% direct solar transmittance while buffering chilly breezes.',
    partnerCafe: {
      name: 'Owoce i Warzywa',
      distance: '150m away',
      address: 'ul. Traugutta 9',
      perk: '20% off specialty filter brew or hot cocoa',
      code: 'LUMOS-OIW20'
    }
  },
  {
    id: 'spot-off-piotrkowska',
    name: 'OFF Piotrkowska Center (Courtyard Zone)',
    category: 'courtyard',
    categoryLabel: 'Factory Courtyard',
    address: 'ul. Piotrkowska 138/140, Łódź',
    coordinates: [19.4608, 51.7602],
    polygon: [
      [19.4598, 51.7608],
      [19.4622, 51.7605],
      [19.4620, 51.7595],
      [19.4595, 51.7597],
      [19.4598, 51.7608]
    ],
    skyViewFactor: 0.71,
    minSunElevation: 17,
    azimuthRange: [150, 210],
    seatingType: 'Recycled wood industrial pallet benches',
    windShielding: 'Maximum (enclosed on 3 sides)',
    description: 'Vibrant cultural factory courtyard. High brick walls provide exceptional wind shielding during winter.',
    partnerCafe: {
      name: 'Drukarnia Skład Wina & Chleba',
      distance: '20m away',
      address: 'Pasaż OFF Piotrkowska',
      perk: '15% off Hot Mulled Non-Alcoholic Cider',
      code: 'LUMOS-OFF15'
    }
  },
  {
    id: 'spot-ec1',
    name: 'EC1 Łódź — Miasto Kultury (Amphitheater Plaza)',
    category: 'plaza',
    categoryLabel: 'Cultural Plaza Area',
    address: 'ul. Targowa 1/3, Łódź',
    coordinates: [19.4725, 51.7656],
    polygon: [
      [19.4705, 51.7665],
      [19.4745, 51.7662],
      [19.4740, 51.7648],
      [19.4700, 51.7651],
      [19.4705, 51.7665]
    ],
    skyViewFactor: 0.90,
    minSunElevation: 10,
    azimuthRange: [115, 235],
    seatingType: 'Tiered architectural stone amphitheater',
    windShielding: 'High (shielded against north winds by main power hall)',
    description: 'Post-industrial arts complex near Fabryczna station. South-facing stone steps store thermal radiation for ambient warmth.',
    partnerCafe: {
      name: 'Café Planetarium EC1',
      distance: '30m away',
      address: 'Hala Maszyn EC1',
      perk: '15% off Hot Ginger Lemon Infusion',
      code: 'LUMOS-EC1WARM'
    }
  },
  {
    id: 'spot-wolnosci',
    name: 'Plac Wolności (Octagonal Plaza Zone)',
    category: 'plaza',
    categoryLabel: 'Historic Square Area',
    address: 'Plac Wolności, Łódź',
    coordinates: [19.4560, 51.7767],
    polygon: [
      [19.4550, 51.7775],
      [19.4570, 51.7775],
      [19.4578, 51.7768],
      [19.4575, 51.7758],
      [19.4564, 51.7754],
      [19.4550, 51.7757],
      [19.4542, 51.7765],
      [19.4550, 51.7775]
    ],
    skyViewFactor: 0.92,
    minSunElevation: 12,
    azimuthRange: [130, 230],
    seatingType: 'Modern ergonomic green-space benches',
    windShielding: 'Low (open roundabout esplanade)',
    description: 'Recently revitalized octagonal square at the northern head of Piotrkowska. Unobstructed southern exposure directly facing monument.',
    partnerCafe: {
      name: 'Kawiarnia Przędza',
      distance: '120m away',
      address: 'ul. Piotrkowska 107',
      perk: 'Free oat milk upgrade & 20% off drip coffee',
      code: 'LUMOS-WOLNOSC20'
    }
  },
  {
    id: 'spot-dabrowski',
    name: 'Plac Dąbrowskiego (Grand Theater Esplanade)',
    category: 'plaza',
    categoryLabel: 'Public Esplanade Area',
    address: 'Plac Dąbrowskiego, Łódź',
    coordinates: [19.4690, 51.7745],
    polygon: [
      [19.4672, 51.7755],
      [19.4712, 51.7752],
      [19.4706, 51.7736],
      [19.4668, 51.7739],
      [19.4672, 51.7755]
    ],
    skyViewFactor: 0.93,
    minSunElevation: 11,
    azimuthRange: [120, 240],
    seatingType: 'Polished granite ledges and benches',
    windShielding: 'Low to Medium',
    description: 'Expansive open civic square opposite Teatr Wielki. Broad southern angle guarantees bright light even on early winter mornings.',
    partnerCafe: {
      name: 'Kawiarnia Grand Teatr',
      distance: '75m away',
      address: 'ul. Narutowicza 42',
      perk: 'Free double espresso shot upgrade',
      code: 'LUMOS-GRAND20'
    }
  },
  {
    id: 'spot-manufaktura',
    name: 'Manufaktura Rynek (Main Plaza Area)',
    category: 'plaza',
    categoryLabel: 'Open Plaza Area',
    address: 'ul. Drewnowska 58, Łódź',
    coordinates: [19.4475, 51.7797],
    polygon: [
      [19.4452, 51.7808],
      [19.4504, 51.7805],
      [19.4500, 51.7786],
      [19.4448, 51.7789],
      [19.4452, 51.7808]
    ],
    skyViewFactor: 0.94,
    minSunElevation: 9,
    azimuthRange: [120, 240],
    seatingType: 'Public wooden loungers & granite steps',
    windShielding: 'Medium (enclosed by historic brick structures)',
    description: 'Vast historic post-industrial textile square. Wide open southern view provides steady, uninterrupted winter sunlight.',
    partnerCafe: {
      name: 'Bistro Bawełna',
      distance: '60m away',
      address: 'Rynek Manufaktury',
      perk: '15% off Hot Spiced Apple Winter Tea',
      code: 'LUMOS-MANU15'
    }
  },
  {
    id: 'spot-poniatowski',
    name: 'Park Poniatowskiego (Lakeside Solarium Zone)',
    category: 'park',
    categoryLabel: 'Waterside Park Area',
    address: 'ul. Parkowa, Łódź',
    coordinates: [19.4435, 51.7525],
    polygon: [
      [19.4410, 51.7540],
      [19.4462, 51.7535],
      [19.4456, 51.7512],
      [19.4406, 51.7516],
      [19.4410, 51.7540]
    ],
    skyViewFactor: 0.96,
    minSunElevation: 8,
    azimuthRange: [100, 260],
    seatingType: 'Curved wooden benches facing the pond',
    windShielding: 'Low (open water expanse)',
    description: 'Maximal open sky exposure. Solar rays reflect off the pond surface, multiplying natural photopic lux for circadian therapy.',
    partnerCafe: {
      name: 'Cukiernia Dybalski',
      distance: '210m away',
      address: 'ul. Żeromskiego 74',
      perk: 'Free traditional pączek with hot winter tea',
      code: 'LUMOS-DYBALSKI'
    }
  }
];

// Alias for backward compatibility
export const SUNNY_SPOTS = SUNNY_AREAS;
