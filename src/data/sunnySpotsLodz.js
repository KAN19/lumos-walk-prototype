// Curated real-world outdoor sunny rest areas across Greater Łódź, Poland.
// Covers all major districts: Śródmieście, Nowe Centrum, Bałuty, Polesie/Retkinia, Widzew, and Górna.
// Each area contains geographic centroid [lng, lat], boundary polygon,
// 3D obstruction profile, microclimate characteristics, and amenity metadata.

export const LODZ_CENTER = {
  lng: 19.4586,
  lat: 51.7687,
  zoom: 14.2
};

// Default user position (Piotrkowska 70, pedestrian heart of Łódź)
export const DEFAULT_USER_LOCATION = [19.4574, 51.7678];

export const SUNNY_AREAS = [
  // ==========================================
  // 1. ŚRÓDMIEŚCIE & NOWE CENTRUM ŁODZI
  // ==========================================
  {
    id: 'spot-rubinstein',
    name: 'Pasaż Rubinsteina & Promenade',
    district: 'Śródmieście',
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
    district: 'Śródmieście',
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
      perk: '15% off specialty filter coffees & plant matcha',
      code: 'LUMOS-OWOCE'
    }
  },
  {
    id: 'spot-schiller',
    name: 'Pasaż Schillera (Civic Sun Promenade)',
    district: 'Śródmieście',
    category: 'plaza',
    categoryLabel: 'Civic Promenade',
    address: 'Pasaż Leona Schillera, Piotrkowska 110',
    coordinates: [19.4595, 51.7635],
    polygon: [
      [19.4578, 51.7642],
      [19.4612, 51.7640],
      [19.4610, 51.7628],
      [19.4576, 51.7630],
      [19.4578, 51.7642]
    ],
    skyViewFactor: 0.86,
    minSunElevation: 13,
    azimuthRange: [135, 230],
    seatingType: 'Modern granite & hardwood amphitheater steps and parklets',
    windShielding: 'Medium (wide pedestrian corridor)',
    description: 'Major pedestrian promenade connecting Piotrkowska and Sienkiewicza. Recently reconstructed with abundant southern sky exposure and solar benches.',
    partnerCafe: {
      name: 'Kawiarnia Przędza',
      distance: '60m away',
      address: 'ul. Piotrkowska 107',
      perk: '10% off artisanal batch brew',
      code: 'LUMOS-PRZEDZA'
    }
  },
  {
    id: 'spot-off-piotrkowska',
    name: 'OFF Piotrkowska Center (Courtyard Zone)',
    district: 'Śródmieście',
    category: 'courtyard',
    categoryLabel: 'Industrial Brick Patio',
    address: 'ul. Piotrkowska 138/140, Łódź',
    coordinates: [19.4605, 51.7588],
    polygon: [
      [19.4590, 51.7600],
      [19.4625, 51.7596],
      [19.4620, 51.7578],
      [19.4585, 51.7582],
      [19.4590, 51.7600]
    ],
    skyViewFactor: 0.72,
    minSunElevation: 18,
    azimuthRange: [150, 210],
    seatingType: 'Industrial wooden sun decks & cafe outdoor patios',
    windShielding: 'High (surrounded by 19th-century cotton mill facades)',
    description: 'Vibrant cultural hub in Ramisch factory. Exposed red brick absorbs thermal heat, creating an insulated warm sun pocket around solar noon.',
    partnerCafe: {
      name: 'Spółdzielnia',
      distance: '20m away',
      address: 'ul. Piotrkowska 138/140',
      perk: 'Complimentary hot lemon-ginger cordial with lunch',
      code: 'LUMOS-SPOLDZIELNIA'
    }
  },
  {
    id: 'spot-ec1',
    name: 'EC1 Łódź — Miasto Kultury (Amphitheater Plaza)',
    district: 'Nowe Centrum',
    category: 'plaza',
    categoryLabel: 'Open Science Square',
    address: 'ul. Targowa 1/3, Łódź',
    coordinates: [19.4720, 51.7668],
    polygon: [
      [19.4700, 51.7680],
      [19.4745, 51.7675],
      [19.4740, 51.7655],
      [19.4695, 51.7660],
      [19.4700, 51.7680]
    ],
    skyViewFactor: 0.92,
    minSunElevation: 12,
    azimuthRange: [120, 240],
    seatingType: 'Concrete sun terraces and wooden stepped seating',
    windShielding: 'Medium to High (historic boiler house backdrop)',
    description: 'Post-industrial power plant plaza. Low eastern profile provides unobstructed solar exposure from 10:00 to 15:30 with high photopic lux values.',
    partnerCafe: {
      name: 'Kawiarnia w EC1',
      distance: '50m away',
      address: 'ul. Targowa 1/3',
      perk: 'Free shot of espresso added to any specialty drink',
      code: 'LUMOS-EC1'
    }
  },
  {
    id: 'spot-salacinskiego',
    name: 'Plac Sałacińskiego (Łódź Fabryczna Solar Plaza)',
    district: 'Nowe Centrum',
    category: 'plaza',
    categoryLabel: 'Grand Transit Forum',
    address: 'Plac Bronisława Sałacińskiego 1, Łódź',
    coordinates: [19.4715, 51.7695],
    polygon: [
      [19.4695, 51.7705],
      [19.4735, 51.7702],
      [19.4730, 51.7688],
      [19.4690, 51.7690],
      [19.4695, 51.7705]
    ],
    skyViewFactor: 0.95,
    minSunElevation: 10,
    azimuthRange: [115, 245],
    seatingType: 'Sculptural stone seats & sun benches facing south',
    windShielding: 'Medium',
    description: 'Expansive modern civic square outside the monumental glass facade of Łódź Fabryczna station. Maximal uninterrupted southern sky view.',
    partnerCafe: {
      name: 'Costa Coffee Fabryczna',
      distance: '30m away',
      address: 'Dworzec Fabryczna',
      perk: 'Upgrade to large coffee for small price',
      code: 'LUMOS-FABRYKA'
    }
  },
  {
    id: 'spot-moniuszki',
    name: 'Park Moniuszki (Station Sun Glade)',
    district: 'Nowe Centrum',
    category: 'park',
    categoryLabel: 'Station Park Glade',
    address: 'Park im. Stanisława Moniuszki, Łódź',
    coordinates: [19.4675, 51.7688],
    polygon: [
      [19.4655, 51.7698],
      [19.4695, 51.7695],
      [19.4690, 51.7678],
      [19.4650, 51.7682],
      [19.4655, 51.7698]
    ],
    skyViewFactor: 0.89,
    minSunElevation: 12,
    azimuthRange: [125, 235],
    seatingType: 'Classic ergonomic park benches along fountain promenade',
    windShielding: 'Medium (buffered by mature trees)',
    description: 'Historic shaded park in summer that turns into an open sun glade in autumn/winter, opposite Łódź Fabryczna.',
    partnerCafe: {
      name: 'Lodziarnia & Kawiarnia Naturalna',
      distance: '90m away',
      address: 'ul. Kilińskiego 68',
      perk: 'Free hot winter tea with pastry',
      code: 'LUMOS-MONIUSZKO'
    }
  },
  {
    id: 'spot-wolnosci',
    name: 'Plac Wolności (Octagonal Plaza Zone)',
    district: 'Śródmieście',
    category: 'plaza',
    categoryLabel: 'Historic Roundabout Plaza',
    address: 'Plac Wolności, Łódź',
    coordinates: [19.4560, 51.7770],
    polygon: [
      [19.4540, 51.7785],
      [19.4580, 51.7785],
      [19.4580, 51.7755],
      [19.4540, 51.7755],
      [19.4540, 51.7785]
    ],
    skyViewFactor: 0.90,
    minSunElevation: 12,
    azimuthRange: [110, 250],
    seatingType: 'Round granite benches around the Kościuszko monument',
    windShielding: 'Low to Medium (open civic roundabout)',
    description: 'Renovated green octagonal market square with low surrounding tenement profiles. Unimpeded solar access throughout the midday period.',
    partnerCafe: {
      name: 'Kawiarnia Tubajka Wolności',
      distance: '60m away',
      address: 'Plac Wolności 2',
      perk: '10% off warm spiced winter apple tea',
      code: 'LUMOS-WOLNOSC'
    }
  },
  {
    id: 'spot-dabrowski',
    name: 'Plac Dąbrowskiego (Grand Theater Esplanade)',
    district: 'Śródmieście',
    category: 'plaza',
    categoryLabel: 'Civic Esplanade',
    address: 'Plac Jaracza / Narutowicza, Łódź',
    coordinates: [19.4690, 51.7740],
    polygon: [
      [19.4670, 51.7752],
      [19.4715, 51.7750],
      [19.4710, 51.7730],
      [19.4665, 51.7732],
      [19.4670, 51.7752]
    ],
    skyViewFactor: 0.94,
    minSunElevation: 11,
    azimuthRange: [115, 245],
    seatingType: 'Broad stone tiers and wooden seats facing fountain',
    windShielding: 'Low (wide open urban expanse)',
    description: 'Vast civic plaza facing Teatr Wielki. Extensive southern and southwestern sky exposure generates intense direct photopic lux.',
    partnerCafe: {
      name: 'Teatralna Cafe',
      distance: '40m away',
      address: 'Plac Dąbrowskiego (Teatr Wielki)',
      perk: '10% off drip coffees & seasonal lattes',
      code: 'LUMOS-TEATR'
    }
  },

  // ==========================================
  // 2. BAŁUTY & STARE MIASTO
  // ==========================================
  {
    id: 'spot-manufaktura',
    name: 'Manufaktura Rynek (Main Plaza Area)',
    district: 'Bałuty',
    category: 'plaza',
    categoryLabel: 'Heritage Industrial Marketplace',
    address: 'ul. Karskiego 5 / Drewnowska 58, Łódź',
    coordinates: [19.4475, 51.7790],
    polygon: [
      [19.4450, 51.7805],
      [19.4505, 51.7802],
      [19.4500, 51.7780],
      [19.4445, 51.7782],
      [19.4450, 51.7805]
    ],
    skyViewFactor: 0.86,
    minSunElevation: 13,
    azimuthRange: [130, 230],
    seatingType: '30+ wooden benches along illuminated fountain axis',
    windShielding: 'High (protected by historic Poznański brick mills)',
    description: 'Massive 3-hectare open brick marketplace. Excellent southern exposure between Poznański palace and central red-brick galleries.',
    partnerCafe: {
      name: 'Costa Coffee Manufaktura',
      distance: '35m away',
      address: 'Rynek Manufaktury',
      perk: 'Free upgrade to oat milk in any winter brew',
      code: 'LUMOS-MANU'
    }
  },
  {
    id: 'spot-staromiejski',
    name: 'Park Staromiejski (Amphitheater & Sun Glade)',
    district: 'Bałuty',
    category: 'park',
    categoryLabel: 'Old Town Park Amphitheater',
    address: 'ul. Nowomiejska / Wojska Polskiego, Łódź',
    coordinates: [19.4540, 51.7795],
    polygon: [
      [19.4510, 51.7810],
      [19.4570, 51.7805],
      [19.4565, 51.7785],
      [19.4505, 51.7790],
      [19.4510, 51.7810]
    ],
    skyViewFactor: 0.92,
    minSunElevation: 10,
    azimuthRange: [120, 240],
    seatingType: 'Curved wooden amphitheater benches and expansive lawn loungers',
    windShielding: 'Medium (sheltered in valley of historic Łódka riverbed)',
    description: 'Recently revitalized "Park Śledzia" featuring south-facing amphitheater steps and open meadows along the historic Łódka riverbed.',
    partnerCafe: {
      name: 'Cafe Staromiejska',
      distance: '110m away',
      address: 'ul. Wojska Polskiego 12',
      perk: 'Free ginger honey spoon with tea',
      code: 'LUMOS-STARE'
    }
  },
  {
    id: 'spot-stary-rynek',
    name: 'Stary Rynek w Łodzi (Historic Solar Forum)',
    district: 'Bałuty',
    category: 'plaza',
    categoryLabel: 'Civic Sun Forum',
    address: 'Stary Rynek, Łódź',
    coordinates: [19.4570, 51.7808],
    polygon: [
      [19.4550, 51.7818],
      [19.4590, 51.7815],
      [19.4585, 51.7800],
      [19.4545, 51.7802],
      [19.4550, 51.7818]
    ],
    skyViewFactor: 0.91,
    minSunElevation: 11,
    azimuthRange: [125, 235],
    seatingType: 'Under-canopy wooden benches and sunny flat stone steps',
    windShielding: 'Medium (enclosed by pastel low-rise tenement colonnades)',
    description: 'Completely redesigned historic square with flat open topography and low arcades. Receives unobstructed sunshine throughout peak noon hours.',
    partnerCafe: {
      name: 'Kawiarnia Bałucka',
      distance: '50m away',
      address: 'Stary Rynek 5',
      perk: '15% discount on hot chocolate',
      code: 'LUMOS-BALUTY'
    }
  },
  {
    id: 'spot-helenow',
    name: 'Park Helenów (Historic Gazebo Sun Lawn)',
    district: 'Bałuty',
    category: 'park',
    categoryLabel: 'Heritage Park Glade',
    address: 'ul. Północna / Smugowa, Łódź',
    coordinates: [19.4720, 51.7790],
    polygon: [
      [19.4690, 51.7805],
      [19.4750, 51.7800],
      [19.4745, 51.7778],
      [19.4685, 51.7782],
      [19.4690, 51.7805]
    ],
    skyViewFactor: 0.89,
    minSunElevation: 12,
    azimuthRange: [125, 235],
    seatingType: 'Historic wooden park benches around gazebo and ponds',
    windShielding: 'High (buffered by century-old tree ring)',
    description: 'Former Anstadt family private park with ponds and grottos. Central glade receives calm, windless sunlight during midday.',
    partnerCafe: {
      name: 'Przystanek Helenów',
      distance: '130m away',
      address: 'ul. Północna 36',
      perk: '10% off warm cider and coffee',
      code: 'LUMOS-HELENOW'
    }
  },
  {
    id: 'spot-julianowski',
    name: 'Park Julianowski (Pond Promenade & Great Glade)',
    district: 'Bałuty',
    category: 'park',
    categoryLabel: 'Lakeside Park Promenade',
    address: 'Park im. A. Mickiewicza, ul. Zgierska',
    coordinates: [19.4440, 51.7990],
    polygon: [
      [19.4400, 51.8010],
      [19.4480, 51.8005],
      [19.4475, 51.7975],
      [19.4395, 51.7980],
      [19.4400, 51.8010]
    ],
    skyViewFactor: 0.90,
    minSunElevation: 11,
    azimuthRange: [120, 240],
    seatingType: 'Curved wooden benches facing pond & open sun lawn',
    windShielding: 'Medium',
    description: 'Premier park in northern Łódź with scenic water cascade and massive south-facing sunny lawn, popular for winter sunbathing.',
    partnerCafe: {
      name: 'Cafe Julianka',
      distance: '90m away',
      address: 'ul. Sowińskiego 2',
      perk: 'Free homemade shortbread cookie with coffee',
      code: 'LUMOS-JULIAN'
    }
  },

  // ==========================================
  // 3. POLESIE & RETKINIA
  // ==========================================
  {
    id: 'spot-poniatowski',
    name: 'Park Poniatowskiego (Lakeside Solarium Zone)',
    district: 'Polesie',
    category: 'park',
    categoryLabel: 'Waterfront Solarium',
    address: 'Park im. ks. J. Poniatowskiego, Łódź',
    coordinates: [19.4480, 51.7520],
    polygon: [
      [19.4450, 51.7535],
      [19.4505, 51.7530],
      [19.4500, 51.7510],
      [19.4445, 51.7515],
      [19.4450, 51.7535]
    ],
    skyViewFactor: 0.91,
    minSunElevation: 10,
    azimuthRange: [100, 260],
    seatingType: 'Curved wooden benches facing the pond',
    windShielding: 'Low to Medium (open water expanse)',
    description: 'Maximal open sky exposure. Solar rays reflect off the pond surface, multiplying natural photopic lux for circadian therapy.',
    partnerCafe: {
      name: 'Cukiernia Dybalski',
      distance: '210m away',
      address: 'ul. Żeromskiego 74',
      perk: 'Free traditional pączek with hot winter tea',
      code: 'LUMOS-DYBALSKI'
    }
  },
  {
    id: 'spot-zdrowie-polana',
    name: 'Park na Zdrowiu (Wielka Polana Rekreacyjna)',
    district: 'Polesie',
    category: 'park',
    categoryLabel: 'Grand Sun Glade',
    address: 'Park im. J. Piłsudskiego (Zdrowie), al. Unii Lubelskiej',
    coordinates: [19.4180, 51.7660],
    polygon: [
      [19.4130, 51.7685],
      [19.4230, 51.7680],
      [19.4225, 51.7640],
      [19.4125, 51.7645],
      [19.4130, 51.7685]
    ],
    skyViewFactor: 0.96,
    minSunElevation: 8,
    azimuthRange: [110, 250],
    seatingType: 'Rustic wooden park benches & sprawling sunny grass field',
    windShielding: 'Medium (enclosed by expansive woodland)',
    description: 'Largest recreational glade in Łódź. Virtually zero vertical building obstruction, offering 100% full-day solar exposure.',
    partnerCafe: {
      name: 'Bistro na Zdrowiu',
      distance: '180m away',
      address: 'al. Unii Lubelskiej 2',
      perk: '15% off hot Belgian waffles & tea',
      code: 'LUMOS-ZDROWIE'
    }
  },
  {
    id: 'spot-botaniczny',
    name: 'Ogród Botaniczny (Alpinarium Sun Slope)',
    district: 'Polesie',
    category: 'park',
    categoryLabel: 'Botanical Sun Slope',
    address: 'ul. Krzemieniecka 36/38, Łódź',
    coordinates: [19.4085, 51.7610],
    polygon: [
      [19.4050, 51.7625],
      [19.4120, 51.7620],
      [19.4115, 51.7595],
      [19.4045, 51.7600],
      [19.4050, 51.7625]
    ],
    skyViewFactor: 0.94,
    minSunElevation: 9,
    azimuthRange: [115, 245],
    seatingType: 'Botanical rest benches on south-facing gravel terraces',
    windShielding: 'High (contoured rock garden topography)',
    description: 'South-facing botanical rock garden. Terraced stone design retains solar heat, creating a warm microclimate with elevated ground temperatures.',
    partnerCafe: {
      name: 'Kawiarnia Botaniczna',
      distance: '80m away',
      address: 'ul. Krzemieniecka 36',
      perk: 'Free herbal infusion sampler with coffee',
      code: 'LUMOS-BOTANIK'
    }
  },
  {
    id: 'spot-retkinia-blonia',
    name: 'Błonia Retkińskie (Wyszyńskiego Promenade)',
    district: 'Retkinia',
    category: 'park',
    categoryLabel: 'Linear Sun Belt',
    address: 'al. kard. S. Wyszyńskiego / Retkińska, Łódź',
    coordinates: [19.3950, 51.7525],
    polygon: [
      [19.3910, 51.7540],
      [19.3990, 51.7535],
      [19.3985, 51.7510],
      [19.3905, 51.7515],
      [19.3910, 51.7540]
    ],
    skyViewFactor: 0.92,
    minSunElevation: 11,
    azimuthRange: [120, 240],
    seatingType: 'Ergonomic wooden promenade benches along cycle path',
    windShielding: 'Low to Medium',
    description: 'Wide southern green corridor traversing Retkinia. Generous setback from residential blocks ensures bright uninterrupted sun.',
    partnerCafe: {
      name: 'Cukiernia Bracia Misztela (Retkinia)',
      distance: '120m away',
      address: 'al. Wyszyńskiego 29',
      perk: '10% off freshly baked yeast buns',
      code: 'LUMOS-RETKINIA'
    }
  },
  {
    id: 'spot-park-smulsko',
    name: 'Park na Smulsku & Łąki Retkińskie',
    district: 'Retkinia',
    category: 'park',
    categoryLabel: 'Open Meadow Park',
    address: 'ul. Nowy Józefów / Smulska, Łódź',
    coordinates: [19.3780, 51.7480],
    polygon: [
      [19.3740, 51.7495],
      [19.3820, 51.7490],
      [19.3815, 51.7465],
      [19.3735, 51.7470],
      [19.3740, 51.7495]
    ],
    skyViewFactor: 0.95,
    minSunElevation: 9,
    azimuthRange: [110, 250],
    seatingType: 'Timber park benches overlooking wild flower meadows',
    windShielding: 'Medium',
    description: 'Tranquil western green oasis on the edge of Retkinia with low rural horizon and pristine southern sun exposure.',
    partnerCafe: {
      name: 'Smulsko Coffee Corner',
      distance: '160m away',
      address: 'ul. Nowy Józefów 14',
      perk: 'Free ginger syrup with any latte',
      code: 'LUMOS-SMULSKO'
    }
  },

  // ==========================================
  // 4. WIDZEW & JANÓW
  // ==========================================
  {
    id: 'spot-monopolis',
    name: 'Monopolis Courtyard & Art Plaza',
    district: 'Widzew',
    category: 'courtyard',
    categoryLabel: 'Revitalized Industrial Patio',
    address: 'ul. Kopcińskiego 58/60, Łódź',
    coordinates: [19.4890, 51.7640],
    polygon: [
      [19.4870, 51.7650],
      [19.4910, 51.7648],
      [19.4905, 51.7632],
      [19.4865, 51.7635],
      [19.4870, 51.7650]
    ],
    skyViewFactor: 0.81,
    minSunElevation: 15,
    azimuthRange: [140, 220],
    seatingType: 'Hardwood amphitheater loungers and sunny cafe terraces',
    windShielding: 'High (protected by historic spirit factory brick walls)',
    description: 'Award-winning revitalized spirit factory Monopol Wódczany. Sun deck captures rich midday light with zero wind disturbance.',
    partnerCafe: {
      name: 'Bake a Wish Monopolis',
      distance: '25m away',
      address: 'ul. Kopcińskiego 58/60',
      perk: 'Buy coffee, get croissant for 6 PLN',
      code: 'LUMOS-MONOPOLIS'
    }
  },
  {
    id: 'spot-widzewski',
    name: 'Park Widzewski (Lakeside Sun Deck)',
    district: 'Widzew',
    category: 'park',
    categoryLabel: 'Park Lakeside Promenade',
    address: 'al. Piłsudskiego / Niciarniana, Łódź',
    coordinates: [19.5050, 51.7650],
    polygon: [
      [19.5010, 51.7665],
      [19.5090, 51.7660],
      [19.5085, 51.7635],
      [19.5005, 51.7640],
      [19.5010, 51.7665]
    ],
    skyViewFactor: 0.91,
    minSunElevation: 11,
    azimuthRange: [120, 240],
    seatingType: 'Wooden deck seating along pond shore & willow groves',
    windShielding: 'Medium',
    description: 'Scenic water glade in the heart of Widzew. Open water expanse reflects southern sunbeams onto the walking promenade.',
    partnerCafe: {
      name: 'Kawiarnia u Przyjaciół (Widzew)',
      distance: '140m away',
      address: 'al. Piłsudskiego 135',
      perk: '10% off hot spiced apple pie',
      code: 'LUMOS-WIDZEW'
    }
  },
  {
    id: 'spot-podolski',
    name: 'Park Podolski (South Sports Lawn & Sun Benches)',
    district: 'Widzew',
    category: 'park',
    categoryLabel: 'Open Sports Meadow',
    address: 'ul. Zbaraska / Śmigłego-Rydza, Łódź',
    coordinates: [19.5020, 51.7480],
    polygon: [
      [19.4980, 51.7495],
      [19.5060, 51.7490],
      [19.5055, 51.7465],
      [19.4975, 51.7470],
      [19.4980, 51.7495]
    ],
    skyViewFactor: 0.93,
    minSunElevation: 10,
    azimuthRange: [115, 245],
    seatingType: 'Modern park benches & expansive green lawn',
    windShielding: 'Medium',
    description: 'Extensive linear park connecting Zarzew and Dąbrowa. Broad southern horizons guarantee direct solar irradiance all afternoon.',
    partnerCafe: {
      name: 'Cukiernia Dąbrowska',
      distance: '150m away',
      address: 'ul. Tatrzańska 42',
      perk: 'Free mini eclair with hot tea',
      code: 'LUMOS-PODOLSKI'
    }
  },
  {
    id: 'spot-gornicza',
    name: 'Park Górnicza (Sunny Meadow Clearing)',
    district: 'Widzew',
    category: 'park',
    categoryLabel: 'Park Meadow Glade',
    address: 'ul. Górnicza / Wojska Polskiego, Łódź',
    coordinates: [19.4980, 51.7820],
    polygon: [
      [19.4940, 51.7835],
      [19.5020, 51.7830],
      [19.5015, 51.7805],
      [19.4935, 51.7810],
      [19.4940, 51.7835]
    ],
    skyViewFactor: 0.90,
    minSunElevation: 11,
    azimuthRange: [120, 235],
    seatingType: 'Comfortable timber benches along birch avenues',
    windShielding: 'Medium',
    description: 'Sunny neighborhood park glade in northern Widzew with clear views of the southern sky between 10:30 and 15:00.',
    partnerCafe: {
      name: 'Górnicza Cafe',
      distance: '110m away',
      address: 'ul. Strykowska 18',
      perk: '10% off drip brew',
      code: 'LUMOS-GORNICZA'
    }
  },

  // ==========================================
  // 5. GÓRNA & RUDA PABIANICKA
  // ==========================================
  {
    id: 'spot-ksiezy-mlyn',
    name: 'Księży Młyn & Park Źródliska (Palmiarnia Lawn)',
    district: 'Górna',
    category: 'courtyard',
    categoryLabel: 'Historic Factory & Botanical Lawn',
    address: 'ul. Księży Młyn 12 / al. Piłsudskiego 61',
    coordinates: [19.4792, 51.7582],
    polygon: [
      [19.4776, 51.7594],
      [19.4810, 51.7592],
      [19.4808, 51.7570],
      [19.4774, 51.7572],
      [19.4776, 51.7594]
    ],
    skyViewFactor: 0.90,
    minSunElevation: 10,
    azimuthRange: [110, 245],
    seatingType: 'Botanical garden benches & revitalized brick factory terraces',
    windShielding: 'High (shielded by Scheibler red-brick walls)',
    description: 'Historic Scheibler factory district combined with the sunny glasshouse lawns around Palmiarnia Łódzka.',
    partnerCafe: {
      name: 'Kawiarnia Tubajka (Park Źródliska)',
      distance: '45m away',
      address: 'Plac Zwycięstwa 1, Park Źródliska',
      perk: 'Free roasted almond cookie with hot ginger brew',
      code: 'LUMOS-TUBAJKA'
    }
  },
  {
    id: 'spot-reymonta',
    name: 'Park Reymonta & Bielnik Geyera (Biała Fabryka)',
    district: 'Górna',
    category: 'park',
    categoryLabel: 'Lakeside Heritage Lawn',
    address: 'ul. Piotrkowska 282 (Biała Fabryka), Łódź',
    coordinates: [19.4615, 51.7455],
    polygon: [
      [19.4585, 51.7470],
      [19.4645, 51.7465],
      [19.4640, 51.7440],
      [19.4580, 51.7445],
      [19.4585, 51.7470]
    ],
    skyViewFactor: 0.89,
    minSunElevation: 12,
    azimuthRange: [125, 235],
    seatingType: 'Classic green benches facing Geyer pond & historic wooden architecture',
    windShielding: 'High (white factory walls buffer northerly winds)',
    description: 'Sunny romantic park surrounding the historic Geyer pond and Central Museum of Textiles. Warm southern reflections off water.',
    partnerCafe: {
      name: 'Bistro Biała Fabryka',
      distance: '50m away',
      address: 'ul. Piotrkowska 282',
      perk: '15% off hot chocolate & apple cake',
      code: 'LUMOS-GEYER'
    }
  },
  {
    id: 'spot-stefanskiego',
    name: 'Stawy Stefańskiego (Lakeside Beach & Sun Pier)',
    district: 'Górna',
    category: 'waterfront',
    categoryLabel: 'Lakeside Beach & Pier',
    address: 'ul. Patriotyczna 3, Łódź (Ruda Pabianicka)',
    coordinates: [19.4450, 51.7050],
    polygon: [
      [19.4400, 51.7070],
      [19.4500, 51.7065],
      [19.4495, 51.7035],
      [19.4395, 51.7040],
      [19.4400, 51.7070]
    ],
    skyViewFactor: 0.97,
    minSunElevation: 7,
    azimuthRange: [100, 260],
    seatingType: 'Wooden beach recliners, picnic tables & wide pier benches',
    windShielding: 'Low (wide open lake view)',
    description: 'Premier open-water solarium in southern Łódź. Zero vertical obstruction allows all-day uninterrupted sunshine with lake reflection.',
    partnerCafe: {
      name: 'Przystań Stefańskiego Cafe',
      distance: '40m away',
      address: 'ul. Patriotyczna 3',
      perk: 'Free ginger shot with hot coffee',
      code: 'LUMOS-STAWY'
    }
  },
  {
    id: 'spot-wenecja',
    name: 'Park Słowackiego (Park Wenecja Lakeside)',
    district: 'Górna',
    category: 'park',
    categoryLabel: 'Historic Waterfront Park',
    address: 'ul. Pabianicka / Cieszyńska, Łódź',
    coordinates: [19.4680, 51.7370],
    polygon: [
      [19.4650, 51.7385],
      [19.4710, 51.7380],
      [19.4705, 51.7355],
      [19.4645, 51.7360],
      [19.4650, 51.7385]
    ],
    skyViewFactor: 0.88,
    minSunElevation: 12,
    azimuthRange: [130, 230],
    seatingType: 'Wooden park benches along lake channels',
    windShielding: 'Medium',
    description: 'Historic amusement park "Wenecja" on the Jasień river. Southern grass banks capture rich afternoon sunshine.',
    partnerCafe: {
      name: 'Cukiernia Wenecja',
      distance: '110m away',
      address: 'ul. Pabianicka 28',
      perk: '10% off tea and traditional pastries',
      code: 'LUMOS-WENECJA'
    }
  }
];

// Alias for backward compatibility
export const SUNNY_SPOTS = SUNNY_AREAS;
