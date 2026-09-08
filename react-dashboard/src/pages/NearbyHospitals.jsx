import React, { useState, useEffect, useRef } from 'react';
import { 
  Hospital, 
  MapPin, 
  NavigationArrow, 
  Phone, 
  Globe, 
  Compass, 
  MagnifyingGlass, 
  WarningCircle, 
  CheckCircle,
  Funnel,
  ArrowClockwise,
  FirstAid
} from '@phosphor-icons/react';
import { api } from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet icon paths in Webpack/Vite bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom SVG Icons for Leaflet Map
const createUserIcon = () => L.divIcon({
  className: 'user-marker',
  html: `<div style="background-color: #3b82f6; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(59,130,246,0.8); animation: pulse 2s infinite;"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const createHospitalIcon = (isEmergency) => L.divIcon({
  className: 'hospital-marker',
  html: `<div style="background-color: ${isEmergency ? '#ef4444' : '#10b981'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-weight: bold; font-size: 16px;">🏥</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

export default function NearbyHospitals() {
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(5);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Get current position on component mount
  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    setLoading(true);
    setError(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          setLocationPermission('granted');
          fetchHospitals(coords.lat, coords.lng, radius);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setLocationPermission('denied');
          // Default fallback location (e.g. New York / Central hub fallback)
          const fallback = { lat: 40.7128, lng: -74.0060 };
          setLocation(fallback);
          setError('Location access denied or timed out. Showing default location results.');
          fetchHospitals(fallback.lat, fallback.lng, radius);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      const fallback = { lat: 40.7128, lng: -74.0060 };
      setLocation(fallback);
      fetchHospitals(fallback.lat, fallback.lng, radius);
    }
  };

  const fetchHospitals = async (lat, lng, rad) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.hospitals.getNearby(lat, lng, rad);
      if (data && data.success) {
        setHospitals(data.hospitals || []);
      } else {
        setHospitals(data?.hospitals || []);
        if (data?.note) {
          setError(data.note);
        }
      }
    } catch (err) {
      console.error('Failed to load nearby hospitals:', err);
      setError('Unable to reach medical location service. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (location) {
      fetchHospitals(location.lat, location.lng, newRadius);
    }
  };

  // Initialize and update map
  useEffect(() => {
    if (!mapRef.current || !location) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [location.lat, location.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.setView([location.lat, location.lng], 13);
    }

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add user marker
    const userMarker = L.marker([location.lat, location.lng], { icon: createUserIcon() })
      .addTo(mapInstanceRef.current)
      .bindPopup('<b>Your Location</b>');
    markersRef.current.push(userMarker);

    // Add hospital markers
    const filtered = hospitals.filter(h => {
      const matchSearch = searchQuery === '' || 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchEmergency = !emergencyOnly || h.emergency;
      return matchSearch && matchEmergency;
    });

    filtered.forEach(h => {
      if (h.latitude && h.longitude) {
        const marker = L.marker([h.latitude, h.longitude], { icon: createHospitalIcon(h.emergency) })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="font-size: 14px; color: #1e293b;">${h.name}</strong><br/>
              <span style="font-size: 12px; color: #64748b;">${h.distance_km ? `${h.distance_km} km away` : ''}</span><br/>
              <span style="font-size: 12px; color: #0284c7;">${h.address || 'Address available on directions'}</span>
            </div>
          `);

        marker.on('click', () => {
          setSelectedHospital(h);
        });

        markersRef.current.push(marker);
      }
    });

  }, [location, hospitals, searchQuery, emergencyOnly]);

  const filteredHospitals = hospitals.filter(h => {
    const matchSearch = searchQuery === '' || 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchEmergency = !emergencyOnly || h.emergency;
    return matchSearch && matchEmergency;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Hospital size={28} weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Nearby Hospitals & Emergency Care</h1>
              <p className="text-slate-400 text-sm mt-0.5">Real-time geospatial health facility lookup via OpenStreetMap</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={getUserLocation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-sm font-medium border border-slate-700 disabled:opacity-50"
          >
            <ArrowClockwise size={18} className={loading ? 'animate-spin' : ''} />
            Refetch Location
          </button>
        </div>
      </div>

      {/* Banner Error / Warning */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <WarningCircle size={22} className="flex-shrink-0 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <MagnifyingGlass size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search facility name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>

        {/* Radius Selector */}
        <div className="md:col-span-4 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
          <Funnel size={18} className="text-slate-400 mr-2" />
          <span className="text-xs text-slate-400 font-medium mr-3">Radius:</span>
          <div className="flex gap-1 w-full">
            {[1, 2, 5, 10, 25].map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`flex-1 py-1 text-xs rounded-lg font-medium transition ${
                  radius === r 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Filter */}
        <div className="md:col-span-3 flex items-center">
          <button
            onClick={() => setEmergencyOnly(!emergencyOnly)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition ${
              emergencyOnly
                ? 'bg-red-500/20 border-red-500/50 text-red-400 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <FirstAid size={18} className={emergencyOnly ? 'text-red-400' : 'text-slate-400'} />
            Emergency ER Only
          </button>
        </div>
      </div>

      {/* Main Grid: Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Map */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl h-[520px] relative">
          <div ref={mapRef} className="w-full h-full z-0" />
          {loading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl shadow-2xl">
                <ArrowClockwise size={20} className="animate-spin text-cyan-400" />
                <span className="text-slate-200 text-sm font-medium">Scanning health facilities...</span>
              </div>
            </div>
          )}
        </div>

        {/* Hospital Cards List */}
        <div className="lg:col-span-5 space-y-3 h-[520px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Facilities Found ({filteredHospitals.length})
            </span>
            {location && (
              <span className="text-xs text-slate-500">
                Lat: {location.lat.toFixed(3)}, Lng: {location.lng.toFixed(3)}
              </span>
            )}
          </div>

          {filteredHospitals.length === 0 && !loading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <Hospital size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-300 font-medium text-sm">No hospitals found within {radius}km</p>
              <p className="text-slate-500 text-xs mt-1">Try expanding the search radius or clearing search filters.</p>
            </div>
          )}

          {filteredHospitals.map((h) => {
            const isSelected = selectedHospital?.id === h.id;
            return (
              <div
                key={h.id || h.name}
                onClick={() => setSelectedHospital(h)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-500/5' 
                    : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                      {h.name}
                      {h.emergency && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                          24/7 ER
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
                      <MapPin size={14} className="text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{h.address || 'Address not listed'}</span>
                    </p>
                  </div>
                  {h.distance_km && (
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0">
                      {h.distance_km} km
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-3 text-slate-400">
                    {h.phone && (
                      <a href={`tel:${h.phone}`} className="flex items-center gap-1 hover:text-cyan-400 transition" onClick={(e) => e.stopPropagation()}>
                        <Phone size={14} />
                        <span>{h.phone}</span>
                      </a>
                    )}
                    {h.website && (
                      <a href={h.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-cyan-400 transition" onClick={(e) => e.stopPropagation()}>
                        <Globe size={14} />
                        <span>Web</span>
                      </a>
                    )}
                  </div>

                  <a
                    href={h.google_maps_url || `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    <NavigationArrow size={14} weight="bold" />
                    <span>Directions</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
