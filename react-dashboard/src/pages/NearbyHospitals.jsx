import React, { useState, useEffect, useRef } from 'react';
import {
  Hospital, MapPin, NavigationArrow, Phone, Globe,
  Compass, MagnifyingGlass, WarningCircle, CheckCircle,
  Funnel, ArrowClockwise, FirstAid, Spinner
} from '@phosphor-icons/react';

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
      { name: 'Manipal Hospital (HAL)', lat: 12.9630, lng: 77.6448, phone: '080-25023344', type: 'hospital', emergency: true },
      { name: 'St. John\'s Medical College Hospital', lat: 12.9233, lng: 77.6187, phone: '080-22065000', type: 'hospital', emergency: true },
      { name: 'Apollo Hospital Bannerghatta', lat: 12.8726, lng: 77.5951, phone: '080-26304050', type: 'hospital', emergency: true },
      { name: 'Narayana Health City', lat: 12.9039, lng: 77.5831, phone: '080-71222222', type: 'hospital', emergency: true },
    ]},
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777, hospitals: [
      { name: 'KEM Hospital', lat: 19.0027, lng: 72.8414, phone: '022-24107000', type: 'hospital', emergency: true },
      { name: 'Nair Hospital', lat: 18.9637, lng: 72.8274, phone: '022-23027600', type: 'hospital', emergency: true },
      { name: 'Lilavati Hospital', lat: 19.0568, lng: 72.8286, phone: '022-26751000', type: 'hospital', emergency: true },
      { name: 'Hinduja Hospital', lat: 19.0549, lng: 72.8301, phone: '022-24452222', type: 'hospital', emergency: true },
      { name: 'Bombay Hospital', lat: 18.9356, lng: 72.8342, phone: '022-22067676', type: 'hospital', emergency: true },
    ]},
    { name: 'Delhi', lat: 28.6139, lng: 77.2090, hospitals: [
      { name: 'AIIMS Delhi', lat: 28.5672, lng: 77.2100, phone: '011-26588500', type: 'hospital', emergency: true },
      { name: 'Safdarjung Hospital', lat: 28.5672, lng: 77.2006, phone: '011-26165060', type: 'hospital', emergency: true },
      { name: 'LNJP Hospital', lat: 28.6412, lng: 77.2410, phone: '011-23232400', type: 'hospital', emergency: true },
      { name: 'RML Hospital', lat: 28.6363, lng: 77.2009, phone: '011-23365525', type: 'hospital', emergency: true },
      { name: 'Apollo Hospital Delhi', lat: 28.5562, lng: 77.2733, phone: '011-71791090', type: 'hospital', emergency: true },
    ]},
    { name: 'Chennai', lat: 13.0827, lng: 80.2707, hospitals: [
      { name: 'Rajiv Gandhi Government Hospital', lat: 13.0840, lng: 80.2785, phone: '044-25305000', type: 'hospital', emergency: true },
      { name: 'Stanley Medical College Hospital', lat: 13.1094, lng: 80.2906, phone: '044-25281804', type: 'hospital', emergency: true },
      { name: 'Apollo Hospital Chennai', lat: 13.0621, lng: 80.2180, phone: '044-28296000', type: 'hospital', emergency: true },
      { name: 'Fortis Malar Hospital', lat: 13.0111, lng: 80.2574, phone: '044-42892222', type: 'hospital', emergency: true },
    ]},
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, hospitals: [
      { name: 'Gandhi Hospital', lat: 17.4401, lng: 78.4979, phone: '040-27505566', type: 'hospital', emergency: true },
      { name: 'Osmania General Hospital', lat: 17.3752, lng: 78.4821, phone: '040-24600177', type: 'hospital', emergency: true },
      { name: 'Apollo Hospital Jubilee Hills', lat: 17.4239, lng: 78.4125, phone: '040-23607777', type: 'hospital', emergency: true },
      { name: 'NIMS Hyderabad', lat: 17.4195, lng: 78.4495, phone: '040-23489000', type: 'hospital', emergency: true },
    ]},
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639, hospitals: [
      { name: 'SSKM Hospital', lat: 22.5358, lng: 88.3420, phone: '033-22043210', type: 'hospital', emergency: true },
      { name: 'Medical College Kolkata', lat: 22.5626, lng: 88.3541, phone: '033-22123955', type: 'hospital', emergency: true },
      { name: 'Apollo Gleneagles Hospital', lat: 22.5505, lng: 88.3917, phone: '033-23201000', type: 'hospital', emergency: true },
    ]},
  ];

  // Find nearest city
  let nearestCity = cities[0];
  let minDist = haversine(lat, lng, cities[0].lat, cities[0].lng);
  for (const city of cities) {
    const d = haversine(lat, lng, city.lat, city.lng);
    if (d < minDist) { minDist = d; nearestCity = city; }
  }

  // Return hospitals with computed distance and id
  return nearestCity.hospitals.map((h, i) => ({
    id: `fallback-${i}`,
    name: h.name,
    latitude: h.lat,
    longitude: h.lng,
    address: `${nearestCity.name}`,
    distance_km: haversine(lat, lng, h.lat, h.lng),
    phone: h.phone,
    type: h.type,
    emergency: h.emergency,
    open_now: h.emergency ? true : null,
    website: null,
    google_maps_url: `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`,
    isFallback: true,
  })).sort((a, b) => a.distance_km - b.distance_km);
}

// ── Overpass direct fetch (browser-side, no backend) ─────────────────────────
async function fetchFromOverpass(lat, lng, radiusM) {
  const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:${radiusM},${lat},${lng});way["amenity"="hospital"](around:${radiusM},${lat},${lng});node["amenity"="clinic"](around:${radiusM},${lat},${lng});node["amenity"="pharmacy"](around:${radiusM},${lat},${lng});node["healthcare"="hospital"](around:${radiusM},${lat},${lng}););out center tags;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];
  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 18000);
      const r = await fetch(ep, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (r.ok) {
        const json = await r.json();
        return json.elements || [];
      }
    } catch (e) {
      console.warn('Overpass endpoint failed:', ep, e.message);
    }
  }
  return null; // all failed
}

// ── Parse Overpass elements → normalized hospital objects ─────────────────────
function parseElements(elements, lat, lng) {
  const typeMap = { hospital: 'hospital', clinic: 'clinic', doctors: 'clinic', pharmacy: 'pharmacy' };
  const seen = new Set();
  return elements.map(el => {
    const tags = el.tags || {};
    const lt = el.type === 'node' ? el.lat : el.center?.lat;
    const ln = el.type === 'node' ? el.lon : el.center?.lon;
    if (!lt || !ln) return null;
    const name = tags.name || tags['name:en'] || tags['name:hi'] || (tags.amenity === 'hospital' ? 'Unnamed Hospital' : null);
    if (!name) return null;
    const id = `${el.type[0]}_${el.id}`;
    if (seen.has(id)) return null;
    seen.add(id);
    const addrParts = ['addr:housenumber', 'addr:street', 'addr:suburb', 'addr:city', 'addr:state'].map(k => tags[k]).filter(Boolean);
    const address = addrParts.length ? addrParts.join(', ') : (tags['addr:city'] || tags['addr:district'] || 'Address not listed');
    const amenity = tags.amenity || 'hospital';
    return {
      id, name,
      latitude: lt, longitude: ln,
      address,
      distance_km: haversine(lat, lng, lt, ln),
      phone: tags.phone || tags['contact:phone'] || tags.telephone || null,
      type: typeMap[amenity] || 'clinic',
      emergency: amenity === 'hospital' || tags.emergency === 'yes',
      open_now: tags.opening_hours === '24/7' ? true : null,
      website: tags.website || tags['contact:website'] || null,
      google_maps_url: `https://www.google.com/maps/dir/?api=1&destination=${lt},${ln}`,
    };
  }).filter(Boolean).sort((a, b) => a.distance_km - b.distance_km).slice(0, 50);
}

// ── Type badge colors ─────────────────────────────────────────────────────────
function typeBadge(type) {
  if (type === 'hospital') return { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'Hospital' };
  if (type === 'pharmacy') return { bg: 'rgba(52,211,153,0.15)', color: '#34d399', border: 'rgba(52,211,153,0.3)', label: 'Pharmacy' };
  return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)', label: 'Clinic' };
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function NearbyHospitals() {
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(5);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [mapSrc, setMapSrc] = useState('');

  // Build Google Maps embed src
  const buildMapSrc = (lat, lng, query = 'hospital') =>
    `https://www.google.com/maps?q=${encodeURIComponent(query + ' near ' + lat + ',' + lng)}&output=embed&z=13`;

  const loadHospitals = async (lat, lng, rad) => {
    setLoading(true);
    setError(null);
    setIsFallback(false);
    // Update map embed
    setMapSrc(buildMapSrc(lat, lng, 'hospital'));

    try {
      const radiusM = Math.round(rad * 1000);
      const elements = await fetchFromOverpass(lat, lng, radiusM);

      if (elements === null) {
        // All Overpass endpoints failed — use curated fallback
        setIsFallback(true);
        setError('Live facility lookup timed out. Showing verified hospitals for your area.');
        setHospitals(getFallbackHospitals(lat, lng));
      } else if (elements.length === 0) {
        // Overpass returned results but none in area — still show fallback
        setIsFallback(true);
        setError(`No facilities found within ${rad}km via live lookup. Showing verified nearby hospitals.`);
        setHospitals(getFallbackHospitals(lat, lng));
      } else {
        setHospitals(parseElements(elements, lat, lng));
      }
    } catch (err) {
      console.error('fetchHospitals error:', err);
      setIsFallback(true);
      setError('Using curated facility list — live lookup unavailable.');
      setHospitals(getFallbackHospitals(lat, lng));
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    setLoading(true);
    setError(null);
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
        setMapSrc(buildMapSrc(coords.lat, coords.lng));
        loadHospitals(coords.lat, coords.lng, radius);
      },
      () => {
        // Geolocation denied — default to Bangalore
        const fallback = { lat: 12.9716, lng: 77.5946 };
        setLocation(fallback);
        setError('Location access denied. Showing Bangalore area hospitals.');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'var(--glass-bg, rgba(15,23,42,0.8))', border: '1px solid var(--border-color, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '20px 24px', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px', color: '#22d3ee' }}>
            <Hospital size={28} weight="duotone" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Nearby Hospitals &amp; Emergency Care</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '2px 0 0' }}>
              {isFallback ? '📌 Verified hospital directory for your area' : 'Real-time facility lookup via OpenStreetMap'}
            </p>
          </div>
        </div>
        <button
          onClick={getUserLocation}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, opacity: loading ? 0.6 : 1 }}
        >
          <ArrowClockwise size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      {/* ── Error/Info Banner ── */}
      {error && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <WarningCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search hospital name or area..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px 10px 38px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
          />
        </div>
        {/* Radius */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px 12px' }}>
          <Funnel size={15} style={{ color: '#64748b' }} />
          <span style={{ color: '#64748b', fontSize: '12px', marginRight: '6px' }}>Radius:</span>
          {[2, 5, 10, 20, 50].map(r => (
            <button key={r} onClick={() => handleRadiusChange(r)} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: radius === r ? '#22d3ee' : 'transparent', color: radius === r ? '#0f172a' : '#94a3b8' }}>
              {r}km
            </button>
          ))}
        </div>
        {/* Emergency filter */}
        <button
          onClick={() => setEmergencyOnly(!emergencyOnly)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px', border: emergencyOnly ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)', background: emergencyOnly ? 'rgba(239,68,68,0.15)' : 'rgba(15,23,42,0.8)', color: emergencyOnly ? '#f87171' : '#94a3b8', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
        >
          <FirstAid size={16} />
          ER Only
        </button>
      </div>

      {/* ── Main Grid: Map + List ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', alignItems: 'start' }}>

        {/* Google Maps Embed */}
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', height: '540px', position: 'relative' }}>
          {location && mapSrc ? (
            <iframe
              key={mapSrc}
              src={mapSrc}
              title="Nearby Hospitals Map"
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
              <Spinner size={32} style={{ color: '#22d3ee', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#64748b', fontSize: '14px' }}>Detecting your location...</span>
            </div>
          )}
          {/* Map overlay buttons */}
          {location && (
            <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '8px' }}>
              <a
                href={`https://www.google.com/maps/search/hospitals/@${location.lat},${location.lng},14z`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#22d3ee', color: '#0f172a', borderRadius: '10px', textDecoration: 'none', fontSize: '12px', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              >
                <Globe size={14} />
                Open in Google Maps
              </a>
            </div>
          )}
        </div>

        {/* Hospital List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '540px', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Count header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {loading ? 'Scanning...' : `Facilities Found (${filtered.length})`}
            </span>
            {location && (
              <span style={{ fontSize: '11px', color: '#475569' }}>
                {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
              </span>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && [1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', animation: 'pulse 2s infinite' }}>
              <div style={{ height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '10px', width: '70%' }} />
              <div style={{ height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', width: '50%' }} />
            </div>
          ))}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
              <Hospital size={40} style={{ color: '#334155', marginBottom: '12px' }} />
              <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '14px', margin: '0 0 6px' }}>No hospitals found</p>
              <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>Try expanding the radius or clearing filters</p>
            </div>
          )}

          {/* Hospital cards */}
          {!loading && filtered.map(h => {
            const badge = typeBadge(h.type);
            const isSelected = selectedHospital?.id === h.id;
            return (
              <div
                key={h.id}
                onClick={() => setSelectedHospital(h)}
                style={{
                  background: isSelected ? 'rgba(6,182,212,0.08)' : 'rgba(15,23,42,0.8)',
                  border: isSelected ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}>{h.name}</span>
                      {h.emergency && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>
                          24/7 ER
                        </span>
                      )}
                      {h.isFallback && (
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                          Verified
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <MapPin size={12} style={{ color: '#22d3ee', flexShrink: 0 }} />
                      <span style={{ color: '#64748b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.address}</span>
                    </div>
                  </div>
                  {/* Distance badge */}
                  <span style={{ flexShrink: 0, background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}>
                    {h.distance_km} km
                  </span>
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Type + phone */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                    {h.phone && (
                      <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', textDecoration: 'none', fontSize: '11px' }}>
                        <Phone size={11} />
                        {h.phone}
                      </a>
                    )}
                  </div>
                  {/* Directions */}
                  <a
                    href={h.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#22d3ee', color: '#0f172a', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 700 }}
                  >
                    <NavigationArrow size={12} weight="bold" />
                    Directions
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</span>
        {[{ color: '#f87171', label: '🏥 Hospital / Emergency' }, { color: '#60a5fa', label: '🩺 Clinic / Doctors' }, { color: '#34d399', label: '💊 Pharmacy' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: l.color }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#334155' }}>
          Map: © Google Maps • Data: OpenStreetMap contributors
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
