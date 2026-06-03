# Itinerary Planner & Geospatial Mapper

An interactive map builder designed to help planners and travelers create, visualize, and share beautiful geographic travel itineraries. 

The main vision of this project is to provide a seamless way to create **fully printable high-resolution PDF maps** and **interactive shareable links** to map itineraries out for travelers, without requiring heavy database dependencies.

---

## 🧭 Core Vision

* **Precision Itineraries**: Plan multi-day routes with exact waypoints, lodging symbols, stay durations, elevations, and distance calculations.
* **Printable Maps**: Generate vector-accurate A1–A5 print-ready landscape or portrait PDF maps with a custom Legend, North Arrow, scale controls, and branding watermark.
* **Shareable Maps**: Instantly package full itinerary configurations, layer settings, and custom view coordinates directly into a URL-encoded string. Travelers who open the link can pan, zoom, and interact with the itinerary in a clean, distraction-free **View Only** mode without registering or authenticating.

---

## 🛠️ Key Features

1. **Interactive Day Planner**: Create multi-day treks. Markers represent stops colored dynamically (Solid primary blue for Start/End, white-blue for waypoints) with custom category icons (Hotel, Rest, Dining, Sightseeing, Hiking, Shopping).
2. **Elevation Profile & Distance Sparkline**: Automatically computes consecutive haversine distances and graphs elevation profiles inside a draggable Legend panel.
3. **Data Layer Import**: Supports importing custom geospatial files (GeoJSON, CSV coordinates, or Shapefiles in ZIP format) as map layers or directly into the Day Planner itinerary list.
4. **Clean View-Only Layout**: Hides the sidebar navigation entirely in read-only mode, expanding the map canvas to full screen, and provides a clear "Create Itinerary" top navigation link back to the main app.
5. **Secure Clipboard Fallback**: Automatically copies generated share links. Works in secure HTTPS domains using the Clipboard API, and falls back to a textarea copy helper or window prompt dialog in non-secure HTTP contexts.
6. **Watermark / Branding overlay**: Drags and prints a compass logo branding watermark on the map canvas.

---

## 🗺️ Acknowledgements to Map Layer Providers

This project relies on high-quality map layers and data. We thank the following organizations and open-source contributors for making their services available:

* **[OpenStreetMap](https://www.openstreetmap.org/)**: For the standard base map tile layer and Nominatim geocoding search APIs.
* **[Esri (Environmental Systems Research Institute)](https://www.esri.com/)**: For the high-resolution World Imagery satellite basemap.
* **[CARTO](https://carto.com/)**: For the light/dark minimal base maps (CartoDB Light/Dark).
* **[OpenTopoMap](https://opentopomap.org/)**: For the topographic elevation detail basemaps.

---

## ⚙️ Run the Project

### Local Installation

**Prerequisites:** [Node.js](https://nodejs.org/) (v18+ recommended)

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Run the developer servers (client + express api proxy)**:
   ```bash
   npm run dev
   ```
3. **Open the browser**:
   Visit [http://localhost:3000](http://localhost:3000)

### Production Build

To compile TypeScript and bundle the Vite client and Node server assets:
```bash
npm run build
```

---

## 🐳 Docker Deployment

The application is containerized and runs without any external key dependencies:

1. **Start the container**:
   ```bash
   docker compose up --build -d
   ```
2. **Access the application**:
   Go to [http://localhost:3001](http://localhost:3001)
3. **Stop the container**:
   ```bash
   docker compose down
   ```

---

## 📈 Progress Tracking Log

- `[x]` **AI Feature Cleanups**: Removed all AI assistant sidebar components, Express command API endpoints, and google/genai package dependencies.
- `[x]` **Layout Consolidation**: Streamlined sidebar sections into collapsible accordions (Map Setup, Day Planner, Print & Export).
- `[x]` **High-Resolution Map Export Fixes**:
  - Implemented container aspect-ratio fitting (avoiding page stretching).
  - Added invalidated map size triggers for tile loading.
  - Setup 1800ms loading delays to prevent unrendered tile captures.
  - Ignored browser controllers (like base-map controls) on canvas export.
- `[x]` **Symbology Overhauls**: Replaced Material Icons fallback texts with robust, inline vector SVGs in Leaflet markers, clustered popups, and the Legend. Corrected the North Arrow pointer orientation.
- `[x]` **URL Share Links**: Implemented client-side Base64 state serialization/deserialization on mounting.
- `[x]` **View-Only Mode**: Created a clean layout where the sidebar is hidden, editing inputs are disabled, marker popups are read-only, and redirection options back to the main site are integrated into the TopNavBar.
- `[x]` **Itinerary Imports**: Configured CSV/GeoJSON file uploads to parse point coordinates and load stops directly into the itinerary tracker, complete with connecting route lines.
- `[x]` **Watermark Overlay & Favicon**: Added branding compass watermarks to the map layout and configured the browser tab favicon.
