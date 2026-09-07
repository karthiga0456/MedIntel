import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  FirstAid, 
  WarningCircle, 
  Funnel, 
  Eye, 
  Info, 
  ShieldCheck, 
  Pulse,
  Compass,
  MagnifyingGlass,
  Layers,
  Globe
} from '@phosphor-icons/react';
import { api } from '../services/api';

const TILE_PROVIDERS = {
  carto_dark: {
    name: 'CARTO Dark (Surveillance)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  },
  osm_standard: {
    name: 'OpenStreetMap (Standard)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
    maxZoom: 19
  },
  esri_satellite: {
    name: 'Esri Satellite (Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: '',
    maxZoom: 18
  },
  carto_light: {
    name: 'CARTO Positron (Light)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }
};

export default function GISMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);
  const searchMarkerRef = useRef(null);

  const [layersData, setLayersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Map Tile Style State
  const [activeTileStyle, setActiveTileStyle] = useState('carto_dark');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Layer Toggles
  const [showClusters, setShowClusters] = useState(true);
  const [showVillages, setShowVillages] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [filterDisease, setFilterDisease] = useState('ALL');

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const data = await api.map.getLayers();
        setLayersData(data);
      } catch (err) {
        console.error('Failed to load map data:', err);
        setError(err.message || 'Error loading GIS layers');
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered around Tamil Nadu / Coimbatore default coordinates
    const map = L.map(mapContainerRef.current, {
      center: [10.9982, 76.9634],
      zoom: 11,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const initialProvider = TILE_PROVIDERS.carto_dark;
    const tileLayer = L.tileLayer(initialProvider.url, {
      attribution: initialProvider.attribution,
      subdomains: initialProvider.subdomains,
      maxZoom: initialProvider.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Base Map Tile Provider dynamically
  const handleTileStyleChange = (styleKey) => {
    setActiveTileStyle(styleKey);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const newProvider = TILE_PROVIDERS[styleKey];
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newTileLayer = L.tileLayer(newProvider.url, {
      attribution: newProvider.attribution,
      subdomains: newProvider.subdomains,
      maxZoom: newProvider.maxZoom
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  };

  // Perform Free Nominatim Geocoding Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setShowSearchResults(true);
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await resp.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Location search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setView([lat, lon], 13, { animate: true });

    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
    }

    const searchMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        html: `<div style="background:#8b5cf6; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 12px #8b5cf6;"></div>`,
        className: 'search-pin',
        iconSize: [16, 16]
      })
    }).addTo(mapInstanceRef.current);

    searchMarkerRef.current = searchMarker;

    setSelectedEntity({
      type: 'SEARCH_LOCATION',
      title: result.display_name.split(',')[0],
      address: result.display_name,
      coords: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    });

    setShowSearchResults(false);
  };

  // Render Map Markers whenever layersData or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !layersData) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = [];

    // 1. Render Outbreak Clusters (Pulsing / Glowing Circles)
    if (showClusters && layersData.outbreak_clusters) {
      layersData.outbreak_clusters.forEach(cluster => {
        if (filterDisease !== 'ALL' && !cluster.disease.toLowerCase().includes(filterDisease.toLowerCase())) {
          return;
        }

        const latLng = [cluster.center_lat, cluster.center_lng];
        bounds.push(latLng);

        const circle = L.circle(latLng, {
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.22,
          radius: cluster.radius_meters || 2500,
          weight: 2,
          dashArray: '4, 8'
        }).addTo(layerGroup);

        circle.on('click', () => {
          setSelectedEntity({
            type: 'CLUSTER',
            title: `Outbreak Hotspot: ${cluster.disease}`,
            disease: cluster.disease,
            cases: cluster.case_count,
            severity: cluster.severity,
            radius: `${(cluster.radius_meters / 1000).toFixed(1)} km`,
            coords: `${cluster.center_lat.toFixed(4)}, ${cluster.center_lng.toFixed(4)}`
          });
        });
      });
    }

    // 2. Render Villages (Color-coded markers based on risk level)
    if (showVillages && layersData.villages) {
      layersData.villages.forEach(v => {
        if (filterDisease !== 'ALL' && v.top_disease && !v.top_disease.toLowerCase().includes(filterDisease.toLowerCase())) {
          return;
        }

        const latLng = [v.latitude, v.longitude];
        bounds.push(latLng);

        let markerColor = '#10b981'; // LOW
        if (v.risk_level === 'OUTBREAK') markerColor = '#ef4444';
        else if (v.risk_level === 'HIGH') markerColor = '#f97316';
        else if (v.risk_level === 'MODERATE') markerColor = '#f59e0b';

        const marker = L.circleMarker(latLng, {
          radius: 9,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.9
        }).addTo(layerGroup);

        marker.on('click', () => {
          setSelectedEntity({
            type: 'VILLAGE',
            title: `Village: ${v.name}`,
            name: v.name,
            population: v.population,
            total_cases: v.total_cases,
            active_7d: v.active_cases_7d,
            vaccination_rate: `${v.vaccination_rate_percent}%`,
            risk: v.risk_level,
            top_disease: v.top_disease || 'None',
            coords: `${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}`
          });
        });
      });
    }

    // 3. Render Health Facilities (PHCs, Hospitals)
    if (showFacilities && layersData.facilities) {
      layersData.facilities.forEach(fac => {
        const latLng = [fac.latitude, fac.longitude];
        bounds.push(latLng);

        const iconHtml = `
          <div style="
            width: 24px;
            height: 24px;
            background: #06b6d4;
            border: 2px solid #ffffff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
            color: #ffffff;
            font-size: 13px;
            font-weight: bold;
          ">
            +
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'health-facility-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker(latLng, { icon: customIcon }).addTo(layerGroup);
        marker.on('click', () => {
          setSelectedEntity({
            type: 'FACILITY',
            title: fac.name,
            facility_type: fac.facility_type,
            beds: fac.available_beds,
            contact: fac.emergency_contact,
            coords: `${fac.latitude.toFixed(4)}, ${fac.longitude.toFixed(4)}`
          });
        });
      });
    }

    if (bounds.length > 0 && !searchMarkerRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [layersData, showClusters, showVillages, showFacilities, filterDisease]);

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 120px)', display: 'flex', overflow: 'hidden' }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ flex: 1, width: '100%', height: '100%', zIndex: 1 }} />

      {/* Floating Control Toolbar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        width: '340px',
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        padding: '18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Compass size={20} color="#fff" weight="bold" />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>GIS Health & Outbreak Map</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Free OpenStreetMap & CARTO GIS Engine</span>
          </div>
        </div>

        {/* Location Search Bar (Nominatim Free API) */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search village, city, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '12px', padding: '8px 10px 8px 30px', width: '100%' }}
              />
              <MagnifyingGlass size={14} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '10px' }} />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={searching}
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              {searching ? '...' : 'Search'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              maxHeight: '180px',
              overflowY: 'auto',
              zIndex: 20,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
            }}>
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(res)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    borderBottom: idx === searchResults.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MapPin size={12} color="#06b6d4" style={{ display: 'inline', marginRight: '6px' }} />
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Tile Style Switcher */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            <Layers size={13} color="#06b6d4" />
            Base Map Provider
          </label>
          <select 
            className="input-field"
            value={activeTileStyle}
            onChange={(e) => handleTileStyleChange(e.target.value)}
            style={{ fontSize: '12px', padding: '8px 10px' }}
          >
            {Object.entries(TILE_PROVIDERS).map(([key, provider]) => (
              <option key={key} value={key}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Disease */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Filter Disease
          </label>
          <select 
            className="input-field"
            value={filterDisease}
            onChange={(e) => setFilterDisease(e.target.value)}
            style={{ fontSize: '12px', padding: '8px 10px' }}
          >
            <option value="ALL">All Tracked Pathogens</option>
            <option value="Dengue">Dengue Fever</option>
            <option value="Malaria">Malaria</option>
            <option value="Chikungunya">Chikungunya</option>
            <option value="Typhoid">Typhoid</option>
            <option value="Cholera">Cholera</option>
          </select>
        </div>

        {/* Layer Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showClusters} 
              onChange={(e) => setShowClusters(e.target.checked)} 
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
              Outbreak Hotspot Zones
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showVillages} 
              onChange={(e) => setShowVillages(e.target.checked)} 
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
              Village Surveillance Nodes
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showFacilities} 
              onChange={(e) => setShowFacilities(e.target.checked)} 
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#06b6d4' }}></span>
              Health Facilities (PHCs/CHCs)
            </span>
          </label>
        </div>

        {/* Map Legend */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Village Risk Matrix
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
              <span>Outbreak (Red)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }}></span>
              <span>High (Orange)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
              <span>Moderate (Yellow)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <span>Low (Green)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Entity Inspector Drawer */}
      {selectedEntity && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 10,
          width: '340px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span className="badge" style={{ 
                backgroundColor: selectedEntity.type === 'CLUSTER' ? 'rgba(239, 68, 68, 0.2)' : selectedEntity.type === 'FACILITY' ? 'rgba(6, 182, 212, 0.2)' : selectedEntity.type === 'SEARCH_LOCATION' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: selectedEntity.type === 'CLUSTER' ? '#f87171' : selectedEntity.type === 'FACILITY' ? '#38bdf8' : selectedEntity.type === 'SEARCH_LOCATION' ? '#a78bfa' : '#34d399',
                marginBottom: '6px',
                display: 'inline-block'
              }}>
                {selectedEntity.type}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                {selectedEntity.title}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedEntity(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            {selectedEntity.type === 'SEARCH_LOCATION' && (
              <>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Full Location Address</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>{selectedEntity.address}</span>
                </div>
              </>
            )}

            {selectedEntity.type === 'VILLAGE' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Population</span>
                  <span style={{ fontWeight: 600 }}>{selectedEntity.population?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Reported Cases</span>
                  <span style={{ fontWeight: 600, color: '#f87171' }}>{selectedEntity.total_cases}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cases (Last 7 Days)</span>
                  <span style={{ fontWeight: 600, color: '#fbbf24' }}>{selectedEntity.active_7d}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vaccination Coverage</span>
                  <span style={{ fontWeight: 600, color: '#34d399' }}>{selectedEntity.vaccination_rate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Top Pathogen</span>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>{selectedEntity.top_disease}</span>
                </div>
              </>
            )}

            {selectedEntity.type === 'CLUSTER' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pathogen</span>
                  <span style={{ fontWeight: 600, color: '#f87171' }}>{selectedEntity.disease}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cluster Cases</span>
                  <span style={{ fontWeight: 600 }}>{selectedEntity.cases}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Surveillance Radius</span>
                  <span style={{ fontWeight: 600 }}>{selectedEntity.radius}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Risk Severity</span>
                  <span style={{ fontWeight: 600, color: '#f87171' }}>{selectedEntity.severity?.toUpperCase()}</span>
                </div>
              </>
            )}

            {selectedEntity.type === 'FACILITY' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Facility Grade</span>
                  <span style={{ fontWeight: 600 }}>{selectedEntity.facility_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Available Beds</span>
                  <span style={{ fontWeight: 600, color: '#34d399' }}>{selectedEntity.beds} Beds</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Emergency Dispatch</span>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>{selectedEntity.contact}</span>
                </div>
              </>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              GPS: {selectedEntity.coords}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

