import React, { useState, useEffect } from 'react';
import {
  Hospital, MapPin, NavigationArrow, Phone, Globe,
  MagnifyingGlass, WarningCircle, Funnel, ArrowClockwise, FirstAid, Spinner
} from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';

// ── Haversine distance ────────────────────────────────────────────────────────
function haversine(la1, lo1, la2, lo2) {
  const R = 6371;
  const dLat = (la2 - la1) * Math.PI / 180;
  const dLon = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

// ── Curated fallback hospitals for major Indian cities ───────────────────────
function getFallbackHospitals(lat, lng) {
  const cities = [
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946, hospitals: [
      { name: 'Bowring & Lady Curzon Hospital', lat: 12.9784, lng: 77.6069, phone: '080-25463300', type: 'hospital', emergency: true },
      { name: 'Vydehi Institute of Medical Sciences', lat: 12.9856, lng: 77.7480, phone: '080-28413381', type: 'hospital', emergency: true },
      { name: 'Victoria Hospital', lat: 12.9655, lng: 77.5762, phone: '080-26701150', type: 'hospital', emergency: true },
      { name: 'Nimhans (Mental Health)', lat: 12.9407, lng: 77.5958, phone: '080-46110007', type: 'hospital', emergency: false },
    ]},
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777, hospitals: [
      { name: 'KEM Hospital', lat: 19.0027, lng: 72.8414, phone: '022-24107000', type: 'hospital', emergency: true },
      { name: 'Nair Hospital', lat: 18.9637, lng: 72.8274, phone: '022-23027600', type: 'hospital', emergency: true },
    ]},
    { name: 'Delhi', lat: 28.6139, lng: 77.2090, hospitals: [
      { name: 'AIIMS Delhi', lat: 28.5672, lng: 77.2100, phone: '011-26588500', type: 'hospital', emergency: true },
      { name: 'Safdarjung Hospital', lat: 28.5672, lng: 77.2006, phone: '011-26165060', type: 'hospital', emergency: true },
    ]}
  ];

  let nearestCity = cities[0];
  let minDist = haversine(lat, lng, cities[0].lat, cities[0].lng);
  for (const city of cities) {
    const d = haversine(lat, lng, city.lat, city.lng);
    if (d < minDist) { minDist = d; nearestCity = city; }
  }

  return nearestCity.hospitals.map((h, i) => ({
    id: `fallback-${i}`,
    name: h.name,
    latitude: h.lat,
    longitude: h.lng,
    address: nearestCity.name,
    distance_km: haversine(lat, lng, h.lat, h.lng),
    phone: h.phone,
    type: h.type,
    emergency: h.emergency,
    open_now: h.emergency ? true : null,
    google_maps_url: `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`,
    isFallback: true,
  })).sort((a, b) => a.distance_km - b.distance_km);
}

// ── Overpass direct fetch ──────────────────────────────────────────────────
async function fetchFromOverpass(lat, lng, radiusM) {
  const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:${radiusM},${lat},${lng});way["amenity"="hospital"](around:${radiusM},${lat},${lng});node["amenity"="clinic"](around:${radiusM},${lat},${lng});node["amenity"="pharmacy"](around:${radiusM},${lat},${lng});node["healthcare"="hospital"](around:${radiusM},${lat},${lng}););out center tags;`;
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 18000);
      const r = await fetch(ep, {
        method: 'POST', body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (r.ok) return (await r.json()).elements || [];
    } catch (e) {}
  }
  return null;
}

function parseElements(elements, lat, lng) {
  const typeMap = { hospital: 'hospital', clinic: 'clinic', doctors: 'clinic', pharmacy: 'pharmacy' };
  const seen = new Set();
  return elements.map(el => {
    const lt = el.type === 'node' ? el.lat : el.center?.lat;
    const ln = el.type === 'node' ? el.lon : el.center?.lon;
    if (!lt || !ln || !el.tags) return null;
    const name = el.tags.name || el.tags['name:en'] || (el.tags.amenity === 'hospital' ? 'Unnamed Hospital' : null);
    if (!name) return null;
    const id = `${el.type[0]}_${el.id}`;
    if (seen.has(id)) return null;
    seen.add(id);
    const addrParts = ['addr:housenumber', 'addr:street', 'addr:city'].map(k => el.tags[k]).filter(Boolean);
    const address = addrParts.length ? addrParts.join(', ') : 'Address not listed';
    const amenity = el.tags.amenity || 'hospital';
    return {
      id, name, latitude: lt, longitude: ln, address,
      distance_km: haversine(lat, lng, lt, ln),
      phone: el.tags.phone || el.tags['contact:phone'] || null,
      type: typeMap[amenity] || 'clinic',
      emergency: amenity === 'hospital' || el.tags.emergency === 'yes',
      google_maps_url: `https://www.google.com/maps/dir/?api=1&destination=${lt},${ln}`,
    };
  }).filter(Boolean).sort((a, b) => a.distance_km - b.distance_km).slice(0, 50);
}

function typeBadge(type) {
  if (type === 'hospital') return { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Hospital' };
  if (type === 'pharmacy') return { bg: 'rgba(52,211,153,0.15)', color: '#34d399', border: 'rgba(52,211,153,0.3)', label: 'Pharmacy' };
  return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)', label: 'Clinic' };
}

export default function NearbyHospitals() {
  const toast = useToast();
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(5);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [mapSrc, setMapSrc] = useState('');

  const buildMapSrc = (lat, lng, query = 'hospital') =>
    `https://www.google.com/maps?q=${encodeURIComponent(query + ' near ' + lat + ',' + lng)}&output=embed&z=13`;

  const loadHospitals = async (lat, lng, rad) => {
    setLoading(true);
    setIsFallback(false);
    setMapSrc(buildMapSrc(lat, lng, 'hospital'));

    try {
      const radiusM = Math.round(rad * 1000);
      const elements = await fetchFromOverpass(lat, lng, radiusM);
      if (!elements || elements.length === 0) {
        setIsFallback(true);
        toast.warning(`No live facilities found within ${rad}km. Showing verified nearby hospitals.`);
        setHospitals(getFallbackHospitals(lat, lng));
      } else {
        setHospitals(parseElements(elements, lat, lng));
      }
    } catch (err) {
      setIsFallback(true);
      toast.warning('Live lookup unavailable. Showing verified nearby hospitals.');
      setHospitals(getFallbackHospitals(lat, lng));
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    setLoading(true);
    if (!('geolocation' in navigator)) {
      const fallback = { lat: 12.9716, lng: 77.5946 };
      setLocation(fallback);
      loadHospitals(fallback.lat, fallback.lng, radius);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        loadHospitals(coords.lat, coords.lng, radius);
      },
      () => {
        toast.warning('Location access denied. Showing Bangalore hospitals.');
        const fallback = { lat: 12.9716, lng: 77.5946 };
        setLocation(fallback);
        loadHospitals(fallback.lat, fallback.lng, radius);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => { getUserLocation(); }, []);

  const handleRadiusChange = (r) => {
    setRadius(r);
    if (location) loadHospitals(location.lat, location.lng, r);
  };

  const filtered = hospitals.filter(h => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || h.name.toLowerCase().includes(q) || (h.address && h.address.toLowerCase().includes(q));
    const matchEmergency = !emergencyOnly || h.emergency;
    return matchSearch && matchEmergency;
  });

  return (
    <div className="module-view">
      {/* Header */}
      <header className="module-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'var(--accent-cyan-transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)'
          }}>
            <Hospital size={26} weight="duotone" color="var(--accent-cyan)" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px' }}>Nearby Hospitals & ER</h2>
            <p className="subtitle">
              {isFallback ? 'Verified hospital directory for your area' : 'Real-time facility lookup via OpenStreetMap'}
            </p>
          </div>
        </div>
        <button onClick={getUserLocation} className="btn-secondary" disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ArrowClockwise size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </header>

      {/* Controls */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="input-icon-wrapper" style={{ flex: 1, minWidth: '250px' }}>
          <MagnifyingGlass size={16} />
          <input
            type="search"
            placeholder="Search hospital name or area..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--panel-bg)', borderRadius: '12px', padding: '6px 12px', border: '1px solid var(--panel-border)' }}>
          <Funnel size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Radius:</span>
          {[2, 5, 10, 20].map(r => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              style={{
                padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: radius === r ? 'var(--accent-cyan)' : 'transparent',
                color: radius === r ? '#0f172a' : 'var(--text-secondary)'
              }}
            >
              {r}km
            </button>
          ))}
        </div>

        <button
          onClick={() => setEmergencyOnly(!emergencyOnly)}
          className={emergencyOnly ? 'btn-primary' : 'btn-secondary'}
          style={emergencyOnly ? { backgroundColor: 'var(--danger-red)', borderColor: 'var(--danger-red)', color: '#fff' } : {}}
        >
          <FirstAid size={16} /> ER Only
        </button>
      </div>

      {/* Map & List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px', alignItems: 'start' }}>
        {/* Map */}
        <div className="glass-panel" style={{ height: '540px', padding: 0, overflow: 'hidden', position: 'relative' }}>
          {location && mapSrc ? (
            <iframe
              src={mapSrc} title="Map" width="100%" height="100%" style={{ border: 'none' }}
              loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
              <Spinner size={32} color="var(--accent-cyan)" className="spin" />
              <span style={{ color: 'var(--text-secondary)' }}>Detecting your location...</span>
            </div>
          )}
          {location && (
            <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
              <a href={`https://www.google.com/maps/search/hospitals/@${location.lat},${location.lng},14z`} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
                <Globe size={16} /> Open in Google Maps
              </a>
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '540px', overflowY: 'auto', paddingRight: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{loading ? 'Scanning...' : `Facilities Found (${filtered.length})`}</span>
          </div>

          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: '20px' }}>
              <div className="skeleton skeleton-title" style={{ width: '70%', marginBottom: '12px' }} />
              <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="glass-panel empty-state">
              <Hospital size={36} />
              <h3>No facilities found</h3>
              <p>Try expanding the radius or removing filters.</p>
            </div>
          )}

          {!loading && filtered.map(h => {
            const badge = typeBadge(h.type);
            const isSelected = selectedHospital?.id === h.id;
            return (
              <div
                key={h.id}
                onClick={() => setSelectedHospital(h)}
                className="glass-panel card-interactive"
                style={{
                  padding: '16px',
                  background: isSelected ? 'var(--accent-cyan-transparent)' : 'var(--panel-bg)',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--panel-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{h.name}</span>
                    {h.emergency && <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>24/7 ER</span>}
                    {h.isFallback && <span className="badge" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>Verified</span>}
                  </div>
                  <span className="badge" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    {h.distance_km} km
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                  <MapPin size={14} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.address}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge" style={{ backgroundColor: badge.bg, color: badge.color, borderColor: badge.border }}>{badge.label}</span>
                    {h.phone && (
                      <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px' }}>
                        <Phone size={12} /> {h.phone}
                      </a>
                    )}
                  </div>
                  <a href={h.google_maps_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                    <NavigationArrow size={14} /> Directions
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
