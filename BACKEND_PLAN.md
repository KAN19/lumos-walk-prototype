# LumosWalk: Backend Implementation Plan

This document defines the step-by-step engineering roadmap for the LumosWalk Python backend.

---

## Phased Execution Strategy

1. **Step 1: Data Conversion Pipeline (Seed Phase)**
   - Ingest existing `src/data/lodzOsmPilotZones.json` (3,221 buildings, 2,755 trees, 5,854 sidewalks).
   - Convert into **GeoParquet** (`buildings.parquet`, `trees.parquet`, `sidewalks.parquet`) for fast backend in-memory loading.
   - Convert into **Vector Tiles / GeoJSON** (`lodz_pilot.pmtiles` or FastAPI-served tile endpoint) for MapLibre GPU 3D rendering.

2. **Step 2: Core Backend Engine & APIs (FastAPI)**
   - Initialize `backend/` directory structure and virtual environment.
   - Build astronomical solar calculator (`app/core/solar.py` using solar ephemeris for Łódź: azimuth, elevation, photopic direct vs. diffuse lux).
   - Build Shapely 2.0 `STRtree` spatial index (`app/services/spatial_index.py`) for $< 0.15\text{ ms}$ raycasting against 3D buildings and tree crowns.
   - Build real-time 3D shadow extrusion engine (`app/services/shadow_engine.py`).
   - Build sun-weighted pedestrian router (`app/services/router_engine.py`) using NetworkX:
     - **Default detour limit**: $+20\%$ (`detour_ratio = 1.20`).
     - **Adjustable ceiling**: Clamped strictly between $1.00$ and $1.50$ ($+50\%$ maximum detour).
     - **Nighttime guarantee**: When solar elevation $\le 0^\circ$, automatically returns shortest route with 0 sun minutes.
   - Expose core REST endpoints:
     - `POST /api/v1/routes/calculate`
     - `GET /api/v1/spatial/obstacles`
     - `GET /api/v1/spatial/shadows`
     - `POST /api/v1/solar/inspect`

3. **Step 3: Frontend Integration & Decoupling**
   - Connect `src/services/sunPathRoutingService.js` to `POST /api/v1/routes/calculate`.
   - Connect `src/components/MapComponent.jsx` to load 3D obstacles and ground shadows dynamically.
   - Add detour tolerance slider ($10\% - 50\%$) to the Sunlight Path selector UI.
   - Remove the static 4.78 MB `lodzOsmPilotZones.json` import from the frontend bundle (reducing bundle size from ~6 MB to $< 350\text{ KB}$).
   - Verify end-to-end functionality, performance, and accuracy.

4. **Step 4: Citywide Crawler & Scale-Up**
   - Implement `backend/scripts/crawl_lodz_osm.py` to systematically crawl all ~130,000 buildings and 85,000 trees across Greater Łódź from OpenStreetMap / Overpass / Geofabrik.
   - Apply building height imputation heuristics (tenements = 16.5m, residential blocks = 33m, single-family homes = 7.5m).
   - Re-export citywide `lodz_buildings.parquet` and compile citywide `lodz_buildings.pmtiles`.
   - The backend automatically reloads the expanded citywide dataset with zero breaking changes.

---

## Project Directory Layout

```text
hackathon/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app, CORS, lifespan data loader
│   │   ├── core/
│   │   │   ├── config.py               # Settings, data paths, CORS
│   │   │   └── solar.py                # Astronomical solar position, lux models
│   │   ├── schemas/
│   │   │   ├── routing.py              # Pydantic models for A-to-B routing
│   │   │   ├── spatial.py              # GeoJSON schemas for obstacles & shadows
│   │   │   └── solar.py                # Solar inspection schemas
│   │   ├── services/
│   │   │   ├── spatial_index.py        # Shapely 2.0 STRtree singleton
│   │   │   ├── shadow_engine.py        # Ground shadow polygon extrusion
│   │   │   └── router_engine.py        # Sun-weighted A* routing algorithm
│   │   └── api/
│   │       ├── routes.py               # POST /api/v1/routes/calculate
│   │       ├── spatial.py              # GET /api/v1/spatial/obstacles & /shadows
│   │       └── solar.py                # POST /api/v1/solar/inspect
│   ├── data/
│   │   ├── seed/
│   │   │   └── lodzOsmPilotZones.json  # Reused baseline data
│   │   ├── processed/
│   │   │   ├── buildings.parquet       # Fast binary spatial cache
│   │   │   ├── trees.parquet           # Tree crown polygons
│   │   │   └── sidewalks.parquet       # Walkable path graph segments
│   │   └── tiles/
│   │       └── lodz_pilot.pmtiles      # Vector tile archive for MapLibre
│   ├── scripts/
│   │   ├── convert_seed_data.py        # Step 1: Converts seed JSON to Parquet/Tiles
│   │   └── crawl_lodz_osm.py           # Step 4: Full city crawler
│   ├── requirements.txt
│   └── README.md
├── src/                                # Existing React frontend
├── package.json
└── BACKEND_PLAN.md                     # This file
```

---

## Detailed Step-by-Step Task Checklist

### Step 1: Seed Data Conversion Pipeline
- [ ] Create `backend/data/seed/` and copy `src/data/lodzOsmPilotZones.json`.
- [ ] Create Python conversion script `backend/scripts/convert_seed_data.py`.
- [ ] Parse buildings, trees, and sidewalks into separate GeoDataFrames.
- [ ] Export to `backend/data/processed/buildings.parquet`, `trees.parquet`, and `sidewalks.parquet`.
- [ ] Export GeoJSON / Vector tile payload for MapLibre consumption.
- [ ] Verify file sizes, schema integrity, and coordinate validity.

### Step 2: FastAPI Backend Engine
- [ ] Create `backend/requirements.txt` (`fastapi`, `uvicorn`, `shapely>=2.0`, `geopandas`, `networkx`, `pydantic>=2.0`, `pyarrow`).
- [ ] Implement `app/core/config.py` and `app/core/solar.py` (solar azimuth, elevation, and photopic lux calculation).
- [ ] Implement `app/services/spatial_index.py`:
  - Load Parquet files on startup via FastAPI lifespan hook.
  - Build `shapely.STRtree` for sub-millisecond raycast intersection.
- [ ] Implement `app/services/shadow_engine.py`:
  - Extrude building footprints along solar vector to ground shadow polygons.
- [ ] Implement `app/services/router_engine.py`:
  - Build pedestrian network graph from sidewalks.
  - Compute Shortest Route distance $L_{\text{short}}$.
  - Compute Sunniest Route via $A^*$ with distance pruning at $L_{\text{max}} = L_{\text{short}} \times \min(1.50, \max(1.00, \text{detour\_ratio}))$.
- [ ] Implement API route handlers:
  - `POST /api/v1/routes/calculate`
  - `GET /api/v1/spatial/obstacles`
  - `GET /api/v1/spatial/shadows`
  - `POST /api/v1/solar/inspect`
- [ ] Test all endpoints via automated test script and verify OpenAPI docs at `http://localhost:8000/docs`.

### Step 3: Frontend Integration & Decoupling
- [ ] Configure `VITE_API_BASE_URL` in frontend.
- [ ] Refactor `src/services/sunPathRoutingService.js` to call the Python routing endpoint.
- [ ] Refactor `src/components/MapComponent.jsx` to load 3D obstacles and shadows from the backend.
- [ ] Add the Detour Tolerance slider ($10\% - 50\%$, default $20\%$) to the Sunlight Path UI in `src/App.jsx`.
- [ ] Remove the 4.78 MB `lodzOsmPilotZones.json` import from frontend source files.
- [ ] Verify that Vite build produces a clean bundle $< 350\text{ KB}$ and runs at 60 FPS.

### Step 4: Citywide Crawler & Scale-Up
- [ ] Implement `backend/scripts/crawl_lodz_osm.py` with bounding-box chunking and rate-limiting.
- [ ] Run crawler across Greater Łódź BBOX (`[51.685, 19.330, 51.860, 19.650]`).
- [ ] Impute missing building heights and synthesize tree crown octagons.
- [ ] Re-export citywide GeoParquet and compile citywide Vector Tiles.
- [ ] Confirm the entire city loads smoothly in the app without performance degradation.
