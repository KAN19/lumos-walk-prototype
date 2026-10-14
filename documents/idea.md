
# **Project Summary: LumosWalk (Urban Microclimate & Mental Health Platform)**

### **1\. Problem to Solve**

During Central and Northern European winters (especially in Poland from November to March), days are exceptionally short (under 8 hours of daylight) with frequent heavy cloud cover (*szaruga*). This acute lack of natural sunlight disrupts circadian rhythms, triggers **Seasonal Affective Disorder (SAD)** in 3–5% of the population, and causes milder "Winter Blues" in up to 20% of residents.  
Coupled with freezing temperatures, people adopt sedentary, indoor lifestyles that worsen physical lethargy and cause **social isolation** (particularly among remote workers, international students, and newcomers). Current navigation tools prioritize shortest distance rather than sunlight exposure, failing to support residents in maximizing their daily light absorption.

### **2\. Target Hackathon Category**

* **Track:** **Health Shift / Zdrowie na Nowo** (Future Smart City Hackathon)  
* **Alignment:** Directly addresses **mental health (wellbeing)**, **circadian alignment**, **physical activity**, and **preventative healthcare** by transforming urban microclimate data into daily active-living habits. It also generates positive spillover into sustainable micro-mobility and local economic recovery.

### **3\. Brief Solution**

LumosWalk acts as a **"Digital Prescription for Winter Sunlight"** that translates open urban 3D data into actionable daylight therapy through a dual-mode experience:

* **Dual Interaction Modes:**  
  * **Mode 1 – Sunny Loops (Active Walking):** Generates closed-loop pedestrian routes (e.g., 15-, 30-, or 45-minute circular walks returning to the origin) optimized for maximum sunlight exposure by factoring in 3D building shadow projections and real-time cloud cover.  
  * **Mode 2 – Sunny Spots (Stationary Sun-Soaking):** Identifies nearby public rest spots (park benches, open plazas, unobstructed courtyards) and provides a live "Sun Window" countdown indicating how long the spot will remain bathed in sunlight.  
* **Social Companion (Optional Pairing):** Users can opt to pair with a walking buddy or join small lunch-break walking cohorts from nearby campuses or neighborhoods, lowering barriers to social connection and combating winter isolation.  
* **Proof-of-Sunlight Local Synergy:** Tracks verified physical exposure ("Sun Minutes"). Reaching the daily clinical threshold (15–20 minutes) unlocks instant micro-discounts (QR vouchers) for warm beverages or pastries at nearby local cafés, revitalizing local small businesses during slow winter hours without artificial gamification points.

### **4\. Technical Architecture & Available Data Sources**

* **Astronomical & Shadow Computation:**  
  * **SunCalc / Astronomical Ephemeris:** Calculates real-time solar azimuth and elevation angles.  
  * **ShadeMap SDK / WebGL Raycasting (Client/Server):** Projects 3D building shadows onto ground networks.  
* **Urban & Elevation Data (Poland):**  
  * **OpenStreetMap (OSM) Overpass API:** Retrieves pedestrian ways (highway=footway/pedestrian), building footprints, and building heights (building:levels, height).  
  * **Polish National Geoportal (GUGiK / ISOK):** Open-access nation-wide LiDAR point clouds and LoD1/LoD2 3D city models providing accurate building obstruction envelopes.  
* **Real-time Meteorology (Overcast Fallback):**  
  * **Open-Meteo API / IMGW (Polish Met Office):** Ingests real-time cloud coverage and UV index. If clouds reach 100%, the routing engine pivots to open park/scenic green corridors.  
* **Routing Engine & Anti-Cheating (Backend):**  
  * **GraphHopper / pgRouting (PostGIS):** Cost-weighted A\*/Dijkstra algorithm:  
  * EdgeCost=Distance(1-wSunlightFactor)  
  * **Geofencing Verification:** Validates pedestrian walking speed (3–6 km/h) across designated route waypoints or stationary presence within a 25m radius of a Sunny Spot before issuing voucher tokens.

### **5\. Competitive Landscape: Similar Ideas vs. LumosWalk**

| Solution / Platform | Core Concept & Scope | Key Limitations | How LumosWalk Differs (Our Unfair Advantage) |
| :---- | :---- | :---- | :---- |
| **Shadowmap / ShadeMap** | Pure 3D physics & shadow simulation platform for PropTech, solar panels, and media. | Technical simulation tool only. No pedestrian semantic routing, no health focus, no local venue or community integration. | **Action-oriented health layer:** Converts abstract 3D shadow meshes into turn-by-turn walkable loops and public health metrics. |
| **SunSeekr / Coffee in the Sun / SunMap** | B2C venue finders for outdoor pub gardens and café terraces across Western Europe. | **Summer & lifestyle focus:** Built for warm weather (*ogródki letnie*); useless in winter when terraces close. Ignores cloud cover and thermal comfort. | **Winter health intervention:** Optimized for low-sun winter conditions, public open spaces (benches/plazas), and overcast-aware daylight routing. |
| **dminder / Rise Science / Circadian Apps** | Mobile apps tracking UV index, sleep rhythms, and vitamin D synthesis windows. | **Passive tracking:** Informs users when to go out, but cannot guide them where to walk or where to find actual unshaded areas. | **Active spatial guidance:** Bridges the gap between medical advice and spatial navigation by pinpointing exact sunlit sidewalks in real time. |
| **SAD / Mood Trackers (Sanvello, Wysa)** | Mental health journals, light therapy lamp guides, and indoor mood tracking. | Screen-bound and isolated; lacks real-world physical activity and urban interaction. | **Combines physical mobility with social connection:** Encourages stepping outdoors and offers neighborhood walk-buddy matching. |
