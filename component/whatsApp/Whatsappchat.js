"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, X, Send, Paperclip, Image as ImageIcon, FileText, Search,
  Check, CheckCheck, Clock3, RefreshCw, MessageSquareText,
  AlertCircle, Loader2, Smile, MapPin, File, ChevronDown, Navigation,
  ExternalLink, UserPlus, Download,
} from "lucide-react";
import TemplateModal from "./Templatemodal";

const API = "/api/whatsapp";
const MAX_FILE = 16 * 1024 * 1024;
const TEMPLATE_CACHE_KEY = "whatsapp-approved-templates-v1";
const TEMPLATE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const cls = (...v) => v.filter(Boolean).join(" ");
const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- formatting helpers ---------- */

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(value) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
function getVariables(text = "") {
  return [...new Set([...String(text).matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))].sort((a, b) => Number(a) - Number(b));
}
function templateParts(template) {
  const components = template?.components || [];
  const find = (t) => components.find((c) => c.type?.toUpperCase() === t);
  return { header: find("HEADER"), body: find("BODY"), footer: find("FOOTER"), buttons: find("BUTTONS")?.buttons || [] };
}

/* ---------- OpenStreetMap helpers ---------- */

const osmEmbed = (lat, lon, d = 0.005) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d * 0.6},${lon + d},${lat + d * 0.6}&layer=mapnik&marker=${lat},${lon}`;
const osmLink = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

async function nominatim(path) {
  const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Map search is unavailable right now");
  return res.json();
}

/**
 * Reverse-geocode a coordinate with Photon (Komoot).
 * The first Photon feature is the primary result; nearby Overpass names
 * must never silently replace it.
 */
async function photonReverse(lat, lon) {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "en");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Photon reverse geocoding failed (${response.status})`);
  }

  const data = await response.json();
  const feature = data?.features?.[0];
  if (!feature) return null;

  const p = feature.properties || {};

  // Photon can return a POI name, street, or locality depending on map data.
  const name =
    clean(p.name) ||
    clean(p.street) ||
    clean(p.district) ||
    clean(p.city) ||
    clean(p.county) ||
    "Dropped pin";

  const addressParts = [
    clean(p.name),
    clean(p.housenumber),
    clean(p.street),
    clean(p.suburb),
    clean(p.district),
    clean(p.city),
    clean(p.state),
    clean(p.postcode),
    clean(p.country),
  ].filter(Boolean);

  const address = [...new Set(addressParts)].join(", ");

  return {
    latitude: lat,
    longitude: lon,
    name,
    address: address || name,
    properties: p,
  };
}

const clean = (v) => (v && v !== "yes" ? String(v).trim() : "");

const toPlace = (r) => {
  const a = r.address || {};
  const parts = String(r.display_name || "").split(",").map((p) => p.trim()).filter(Boolean);

  // Preference order: real POI name -> house number + street -> area/locality.
  const poi =
    clean(r.namedetails?.name) || clean(r.name) ||
    clean(a.amenity) || clean(a.shop) || clean(a.tourism) ||
    clean(a.leisure) || clean(a.office) || clean(a.building);
  const street = [clean(a.house_number), clean(a.road || a.pedestrian || a.footway)].filter(Boolean).join(", ");
  const area =
    clean(a.neighbourhood) || clean(a.suburb) || clean(a.village) ||
    clean(a.town) || clean(a.city_district) || clean(a.city) || clean(a.county);

  return {
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    name: poi || street || area || parts[0] || "Current location",
    address: r.display_name || parts.join(", "),
  };
};

/* ---------- small UI pieces ---------- */

function StatusIcon({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "read") return <CheckCheck size={14} className="text-[#34A8E0]" />;
  if (s === "delivered") return <CheckCheck size={14} />;
  if (s === "sent") return <Check size={14} />;
  if (s === "failed") return <AlertCircle size={13} className="text-red-500" />;
  return null;
}

function LocationCard({ location }) {
  const { latitude: lat, longitude: lon, name, address } = location;
  return (
    <a href={osmLink(lat, lon)} target="_blank" rel="noreferrer" className="group block w-[260px] max-w-full overflow-hidden rounded-lg bg-white/70">
      <div className="relative h-32 overflow-hidden">
        <iframe title={name || "Location"} src={osmEmbed(lat, lon)} loading="lazy" className="pointer-events-none h-full w-full border-0" />
        <span className="absolute inset-0" />
      </div>
      <div className="space-y-0.5 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#222]">
          <MapPin size={14} className="shrink-0 text-rose-500" />
          <span className="truncate">{name || "Shared location"}</span>
        </div>
        {address && <div className="line-clamp-2 text-xs text-[#666]">{address}</div>}
        <div className="flex items-center justify-between pt-1 text-[11px] text-[#888]">
          <span>{lat.toFixed(5)}, {lon.toFixed(5)}</span>
          <span className="inline-flex items-center gap-1 font-medium text-[#1687B9] group-hover:underline">OpenStreetMap <ExternalLink size={11} /></span>
        </div>
      </div>
    </a>
  );
}

function MediaView({ media, onImage }) {
  if (!media?.url) return null;
  if (media.type === "image")
    return (
      <button type="button" onClick={() => onImage(media.url)} className="block overflow-hidden rounded-lg">
        <img src={media.url} alt="Attachment" loading="lazy" className="max-h-72 w-full max-w-[320px] object-cover" />
      </button>
    );
  if (media.type === "video") return <video src={media.url} controls className="max-h-72 max-w-[320px] rounded-lg" />;
  if (media.type === "audio") return <audio src={media.url} controls className="w-[260px] max-w-full" />;
  return (
    <a href={media.url} target="_blank" rel="noreferrer" className="flex w-[260px] max-w-full items-center gap-3 rounded-lg bg-black/5 p-3 text-sm hover:bg-black/10">
      <FileText size={20} className="shrink-0 text-[#555]" />
      <span className="min-w-0 flex-1 truncate">{media.filename || "Open attachment"}</span>
      <Download size={15} className="shrink-0 text-[#777]" />
    </a>
  );
}

function Bubble({ item, onImage }) {
  const out = item.direction === "out";
  const isTemplate = Boolean(item.templateName);
  return (
    <div className={cls("flex", out ? "justify-end" : "justify-start")}>
      <article className={cls("max-w-[86%] rounded-2xl px-2.5 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.08)]", out ? "rounded-tr-md bg-[#D9FDD3]" : "rounded-tl-md bg-white")}>
        {isTemplate && (
          <div className="mb-1.5 flex items-center gap-1 px-0.5 text-[10px] font-medium text-[#6B7A72]">
            <MessageSquareText size={11} /> Template: {item.templateName}
          </div>
        )}
        {item.media && <div className="mb-1"><MediaView media={item.media} onImage={onImage} /></div>}
        {item.location && <div className="mb-1"><LocationCard location={item.location} /></div>}
        <div className="px-0.5">
          {item.headerText && <p className="mb-1 text-[13px] font-semibold text-[#222]">{item.headerText}</p>}
          {item.text && <p className="whitespace-pre-wrap break-words text-[13.5px] leading-5 text-[#222]">{item.text}</p>}
          {item.caption && <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-[#444]">{item.caption}</p>}
          {item.footer && <p className="mt-1.5 whitespace-pre-wrap text-[11.5px] text-[#7A7A7A]">{item.footer}</p>}
        </div>
        {!!item.buttons?.length && (
          <div className="mt-2 divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-white/60">
            {item.buttons.map((b, i) => <div key={i} className="px-3 py-1.5 text-center text-xs font-medium text-[#1687B9]">{b.text}</div>)}
          </div>
        )}
        {item.error && <div className="mt-1 px-0.5 text-[11px] text-red-600">{item.error}</div>}
        <div className="mt-0.5 flex items-center justify-end gap-1 px-0.5 text-[10px] text-[#66736B]">
          {formatTime(item.createdAt)}
          {out && <StatusIcon status={item.status} />}
        </div>
      </article>
    </div>
  );
}

/* ---------- Leaflet 2.0 (alpha.1, global build loaded on demand, no npm install needed) ---------- */

const LEAFLET_BASE = "https://unpkg.com/leaflet@2.0.0-alpha.1/dist";
let leafletPromise = null;

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject(new Error("Map is only available in the browser"));
  // Leaflet 2 has no factory methods (L.map, L.marker...), so L.marker being absent means v2 is already loaded.
  if (window.L?.Map && !window.L.marker) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet-css]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${LEAFLET_BASE}/leaflet.css`;
      link.setAttribute("data-leaflet-css", "1");
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = `${LEAFLET_BASE}/leaflet-global.js`;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      leafletPromise = null;
      script.remove();
      reject(new Error("The map could not be loaded. Check your internet connection and try again."));
    };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const PIN_HTML =
  '<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7 0 15.7 0 27.5 16 42 16 42s16-14.5 16-26.3C32 7 24.8 0 16 0z" fill="#E11D48"/><circle cx="16" cy="15.5" r="6" fill="#fff"/></svg>';
const DEFAULT_CENTER = [22.9734, 78.6569]; // centre of India, shown only until a location is found

const toRad = (d) => (d * Math.PI) / 180;
function distanceM(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const zoomFor = (accuracy) => (accuracy <= 30 ? 18 : accuracy <= 150 ? 17 : accuracy <= 1000 ? 15 : 13);

// Shortest distance (metres) from the point to the segment a-b.
function segmentDistanceM(lat, lon, a, b) {
  const k = Math.cos(toRad(lat));
  const ax = (a.lon - lon) * k * 111320, ay = (a.lat - lat) * 110540;
  const bx = (b.lon - lon) * k * 111320, by = (b.lat - lat) * 110540;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? -(ax * dx + ay * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

// Named things within ~120 m (flyovers, roads, shops, buildings).
// Sorted so the thing you are standing ON (e.g. a flyover) beats a point-of-interest that is merely close.
async function nearbyNames(lat, lon) {
  const ql = `[out:json][timeout:8];(node(around:120,${lat},${lon})[name];way(around:120,${lat},${lon})[name];);out geom 40;`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(ql)}`,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("Nearby places unavailable");
    const json = await res.json();
    const best = new Map();
    for (const el of json.elements || []) {
      const tags = el.tags || {};
      const nm = String(tags["name:en"] || tags.name || "").trim();
      if (!nm || tags.boundary || tags.admin_level) continue;

      let d = Infinity;
      if (el.type === "node") d = distanceM(lat, lon, el.lat, el.lon);
      else {
        const g = el.geometry || [];
        if (g.length === 1) d = distanceM(lat, lon, g[0].lat, g[0].lon);
        for (let i = 0; i < g.length - 1; i++) d = Math.min(d, segmentDistanceM(lat, lon, g[i], g[i + 1]));
      }
      if (!Number.isFinite(d)) continue;

      let bonus = 0;
      if (tags.bridge || tags.man_made === "bridge" || /flyover|overpass|underpass|bridge/i.test(nm)) bonus = 40;
      else if (el.type === "way" && tags.highway) bonus = 15;

      const score = d - bonus;
      const prev = best.get(nm);
      if (!prev || score < prev.score) best.set(nm, { name: nm, distance: d, score });
    }
    return [...best.values()].sort((a, b) => a.score - b.score).slice(0, 6);
  } finally {
    clearTimeout(t);
  }
}

/* ---------- location picker (map + searchable dropdown + current location) ---------- */

function LocationPicker({ onClose, onSend, sending }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [place, setPlace] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [liveAcc, setLiveAcc] = useState(null);

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const bestRef = useRef(null);
  const finishRef = useRef(null);
  const reqRef = useRef(0);
  const nameEditedRef = useRef(false);
  const pickRef = useRef(() => {});
  const autoRef = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    clearTimeout(timerRef.current);
  }, []);

  /* ----- marker + accuracy circle on the map ----- */
  const drawPoint = useCallback((lat, lon, accuracy, zoom) => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!markerRef.current) {
      markerRef.current = new L.Marker([lat, lon], {
        draggable: true,
        icon: new L.DivIcon({ className: "", html: PIN_HTML, iconSize: [32, 42], iconAnchor: [16, 42] }),
      }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        pickRef.current(p.lat, p.lng, {});
      });
    } else {
      markerRef.current.setLatLng([lat, lon]);
    }
    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
    if (accuracy > 0) {
      circleRef.current = new L.Circle([lat, lon], { radius: accuracy, color: "#00A884", weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map);
    }
    if (zoom) map.setView([lat, lon], zoom, { animate: true });
    else map.panTo([lat, lon], { animate: true });
  }, []);

  /* ----- choose a point (map tap, pin drag, search result or GPS) ----- */
  const pick = useCallback(async (lat, lon, opts = {}) => {
    const { accuracy = null, zoom = null, preset = null } = opts;
    const id = ++reqRef.current;

    nameEditedRef.current = false;
    drawPoint(lat, lon, accuracy, zoom);

    setErr("");
    setNotice("");
    setSuggestions([]);

    setPlace({
      latitude: lat,
      longitude: lon,
      accuracy,
      name: preset?.name || "",
      address: preset?.address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    });

    // Search results already contain a selected place name/address.
    // Do not reverse-geocode and overwrite the user's chosen search result.
    if (preset) {
      setResolving(false);
      return;
    }

    setResolving(true);

    // Photon is the primary reverse-geocoder, just like the other app.
    // Overpass is used only to provide optional nearby-name suggestions.
    const [photonResult, nearbyResult] = await Promise.allSettled([
      photonReverse(lat, lon),
      nearbyNames(lat, lon),
    ]);

    // Ignore stale responses when the user moves the marker quickly.
    if (id !== reqRef.current) return;

    const photon =
      photonResult.status === "fulfilled" ? photonResult.value : null;

    const nearby =
      nearbyResult.status === "fulfilled" ? nearbyResult.value : [];

    // Keep Photon as the primary name. Nearby places must not replace it.
    const primaryName = photon?.name || "";
    const nearbySuggestions = nearby
      .filter((item) => item.distance <= 100)
      .map((item) => item.name);

    const suggestionsList = [
      primaryName,
      ...nearbySuggestions,
    ].filter(Boolean);

    const uniqueSuggestions = [...new Set(suggestionsList)].slice(0, 8);

    setPlace((current) => {
      if (!current) return current;

      return {
        ...current,
        name: nameEditedRef.current
          ? current.name
          : primaryName || nearby[0]?.name || "Dropped pin",
        address: photon?.address || current.address,
      };
    });

    setSuggestions(uniqueSuggestions);
    setResolving(false);
  }, [drawPoint]);
  pickRef.current = pick;

  /* ----- map setup ----- */
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapElRef.current || mapRef.current) return;
        const map = new L.Map(mapElRef.current, { center: DEFAULT_CENTER, zoom: 5 });
        new L.TileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);
        map.on("click", (e) => pickRef.current(e.latlng.lat, e.latlng.lng, {}));
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 60);
        setMapReady(true);
      })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => {
      cancelled = true;
      stopWatch();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [stopWatch]);

  /* ----- current location (keeps refining, keeps the most accurate reading) ----- */
  const useCurrent = () => {
    if (!navigator.geolocation) {
      setErr("This browser does not support location access.");
      return;
    }
    stopWatch();
    bestRef.current = null;
    setLocating(true);
    setErr("");
    setNotice("");
    setLiveAcc(null);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stopWatch();
      setLocating(false);
      const best = bestRef.current;
      if (!best) {
        setErr("Could not get your location. Check that device location is on, then try again or tap the map.");
        return;
      }
      pick(best.latitude, best.longitude, { accuracy: best.accuracy, zoom: zoomFor(best.accuracy) });
      if (best.accuracy > 100) {
        setNotice(
          `Your device could only locate you to about ±${Math.round(best.accuracy)} m (computers use WiFi/IP, not GPS). ` +
          `Tap the map or drag the pin onto your exact spot, then send.`
        );
      }
    };
    finishRef.current = finish;

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude);
        const longitude = Number(coords.longitude);
        const accuracy = Number(coords.accuracy);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        if (!bestRef.current || accuracy < bestRef.current.accuracy) {
          bestRef.current = { latitude, longitude, accuracy };
          setLiveAcc(Math.round(accuracy));
          drawPoint(latitude, longitude, accuracy, zoomFor(accuracy)); // show progress live on the map
        }
        if (accuracy <= 20) finish();
      },
      (error) => {
        if (bestRef.current) { finish(); return; }
        finished = true;
        stopWatch();
        setLocating(false);
        if (error.code === 1) setErr("Location permission was denied. Allow location access in your browser settings, or tap the map to choose a spot.");
        else if (error.code === 3) setErr("Getting your location timed out. Turn on device location and try again, or tap the map.");
        else setErr("Could not get your location. Check that device location services are enabled, or tap the map.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
    timerRef.current = setTimeout(finish, 15000);
  };

  // Show the map straight away, then start finding the current location once.
  useEffect(() => {
    if (mapReady && !autoRef.current) {
      autoRef.current = true;
      useCurrent();
    }
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- searchable dropdown ----- */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const b = mapRef.current?.getBounds();
        const vb = b ? `&viewbox=${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}` : "";
        const rows = await nominatim(`search?format=jsonv2&limit=8&addressdetails=1&namedetails=1${vb}&q=${encodeURIComponent(q)}`);
        if (!cancelled) { setResults(rows.map(toPlace)); setActiveIdx(-1); }
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const chooseResult = (r) => {
    setQuery(r.name);
    setDropdownOpen(false);
    pick(r.latitude, r.longitude, { zoom: 17, preset: r });
  };

  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownOpen(true);
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIdx >= 0 ? activeIdx : 0];
      if (dropdownOpen && r) chooseResult(r);
    } else if (e.key === "Escape" && dropdownOpen) {
      e.stopPropagation();
      setDropdownOpen(false);
    }
  };

  const showDropdown = dropdownOpen && query.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-3">
      <section className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#EAEAE8] px-4 py-3">
          <div className="text-sm font-semibold">Send location</div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-[#777] hover:bg-[#F3F3F1]"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {/* Searchable dropdown */}
          <div className="relative z-20">
            <div className="flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 focus-within:border-[#00A884]">
              <Search size={15} className="text-[#888]" />
              <input
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                onKeyDown={onSearchKey}
                placeholder="Search a place, area or address…"
                className="w-full py-2.5 text-sm outline-none"
              />
              {searching && <Loader2 size={15} className="animate-spin text-[#888]" />}
              {query && !searching && (
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(""); setResults([]); }} aria-label="Clear search"><X size={14} className="text-[#888]" /></button>
              )}
            </div>
            {showDropdown && (
              <ul role="listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-64 overflow-y-auto rounded-lg border border-[#E5E5E5] bg-white shadow-xl">
                {results.length === 0 && (
                  <li className="px-3 py-3 text-xs text-[#888]">{searching ? "Searching…" : "No places found. Try a different name, or tap the map."}</li>
                )}
                {results.map((r, i) => (
                  <li key={`${r.latitude}-${r.longitude}-${i}`} role="option" aria-selected={i === activeIdx}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => chooseResult(r)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={cls("flex w-full items-start gap-2 px-3 py-2.5 text-left", i === activeIdx ? "bg-[#F1F8F5]" : "hover:bg-[#F7F7F5]")}
                    >
                      <MapPin size={15} className="mt-0.5 shrink-0 text-rose-500" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="line-clamp-2 text-xs text-[#777]">{r.address}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map (always visible) */}
          <div className="relative isolate z-0 overflow-hidden rounded-xl border border-[#E5E5E5]">
            <div ref={mapElRef} className="h-72 w-full bg-[#E9EEF0]" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#F4F6F6] text-sm text-[#777]">
                <Loader2 size={16} className="animate-spin" /> Loading map…
              </div>
            )}
            <button
              onClick={useCurrent}
              disabled={!mapReady || locating}
              title="Use my current location"
              className="absolute right-2 top-2 z-[500] flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-[#087F5B] shadow-md hover:bg-[#F5FBF8] disabled:opacity-60"
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              My location
            </button>
          </div>

          {/* Status line */}
          {locating ? (
            <div className="flex items-center gap-2 text-xs text-[#555]">
              <Loader2 size={13} className="animate-spin text-[#00A884]" />
              <span className="flex-1">Finding your exact location…{liveAcc ? ` ±${liveAcc} m` : ""}</span>
              {liveAcc && (
                <button onClick={() => finishRef.current?.()} className="rounded bg-[#E8F6EF] px-2 py-0.5 font-medium text-[#087F5B]">Use now</button>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#777]">Tap the map or drag the pin to choose the exact spot.</p>
          )}

          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
          {notice && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{notice}</div>}

          {/* Selected place */}
          {place && (
            <div className="rounded-xl border border-[#E5E5E5] p-3">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-2 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={place.name}
                      onChange={(e) => { nameEditedRef.current = true; setPlace((p) => ({ ...p, name: e.target.value })); }}
                      placeholder={resolving ? "Finding place name…" : "Place name"}
                      className="w-full rounded border border-[#E5E5E5] px-2 py-1 text-sm font-semibold focus:border-[#00A884] focus:outline-none"
                    />
                    {resolving && <Loader2 size={14} className="shrink-0 animate-spin text-[#888]" />}
                  </div>
                  <div className="line-clamp-2 px-0.5 text-xs text-[#777]">{place.address}</div>
                  <div className="px-0.5 text-[10px] text-[#888]">
                    {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                    {Number.isFinite(place.accuracy) && ` · GPS accuracy ±${Math.round(place.accuracy)} m`}
                  </div>
                </div>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2.5">
                  <div className="mb-1 text-[11px] text-[#888]">Not the right name? Pick a nearby one:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { nameEditedRef.current = true; setPlace((p) => ({ ...p, name: s })); }}
                        className={cls(
                          "rounded-full border px-2.5 py-1 text-xs",
                          place.name === s ? "border-[#00A884] bg-[#E8F6EF] text-[#087F5B]" : "border-[#E5E5E5] text-[#555] hover:border-[#00A884]"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-[#EAEAE8] p-3">
          <button
            disabled={!place || sending}
            onClick={() => onSend({ ...place, name: (place.name || "").trim() || "Dropped pin" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00A884] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#008F70] disabled:opacity-40"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send this location
          </button>
        </footer>
      </section>
    </div>
  );
}

/* ---------- main component ---------- */

const EMOJIS = ["😀","😂","😊","😍","🥳","👍","🙏","❤️","🔥","🎉","👏","😎","🤝","💯","✨","😉","🙌","😇"];

export default function WhatsAppChat({ mobile, name = "", inline = false, className = "",  autoOpen = false,
  hideTrigger = false, }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [attachmentMenu, setAttachmentMenu] = useState(false);
  const [emojiMenu, setEmojiMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesFetchedAt, setTemplatesFetchedAt] = useState(0);
  const [templateSending, setTemplateSending] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [lightbox, setLightbox] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [clock, setClock] = useState(Date.now());

  const scrollRef = useRef(null);
  const imageFileRef = useRef(null);
  const anyFileRef = useRef(null);
  const textareaRef = useRef(null);
  const autoOpenedRef = useRef(false);
  const phone = last10(mobile);
useEffect(() => {
  if (autoOpen && phone) {
    setOpen(true);
  }
}, [autoOpen, phone]);
  const request = useCallback(async (url, options) => {
    const response = await fetch(url, { cache: "no-store", ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) throw new Error(result.message || "Request failed");
    return result;
  }, []);

  const postJson = useCallback(
    (body) => request(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    [request]
  );

  // Returns the API result (or null on failure) so callers can react to it.
  const load = useCallback(async (filters = {}) => {
    if (!phone) return null;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ mobile: phone, name: name || phone });
      const from = "from" in filters ? filters.from : dateFrom;
      const to = "to" in filters ? filters.to : dateTo;
      if (from) params.set("from_date", from);
      if (to) params.set("to_date", to);
      const result = await request(`${API}?${params}`);
      setData(result);
      if (result.contact?.id && result.contact.unreadCount > 0) {
        postJson({ action: "read", contactId: result.contact.id }).catch(() => {});
      }
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [phone, name, dateFrom, dateTo, request, postJson]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Poll for new messages (skipped while a date filter is applied)
  useEffect(() => {
    if (!open || !data?.contact?.id || dateFrom || dateTo) return;
    const timer = setInterval(() => load(), 15000);
    return () => clearInterval(timer);
  }, [open, data?.contact?.id, dateFrom, dateTo, load]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [open]);

  // Reset when the panel is closed
  useEffect(() => {
    if (!open) { autoOpenedRef.current = false; setData(null); setMessage(""); setSelectedFile(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox("");
      else if (locationModal) setLocationModal(false);
      else if (templateModal) setTemplateModal(false);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lightbox, locationModal, templateModal]);

  const sessionOpen = Boolean(data?.sessionExpiresAt && data.sessionExpiresAt > clock);
  const sessionRemaining = data?.sessionExpiresAt ? Math.max(0, data.sessionExpiresAt - clock) : 0;
  const isNewContact = Boolean(data?.contact?.isNew);
  const sessionLabel = sessionOpen
    ? `${Math.floor(sessionRemaining / 3600000)}h ${Math.floor((sessionRemaining % 3600000) / 60000)}m left`
    : isNewContact ? "New contact" : "Session expired";

  const fetchTemplates = useCallback(async ({ background = false } = {}) => {
    if (!background) setTemplatesLoading(true);
    try {
      const result = await request(`${API}?action=templates`);
      const freshTemplates = Array.isArray(result.templates) ? result.templates : [];
      const fetchedAt = Date.now();

      setTemplates(freshTemplates);
      setTemplatesFetchedAt(fetchedAt);

      // Cache templates for six hours in this browser.
      try {
        localStorage.setItem(
          TEMPLATE_CACHE_KEY,
          JSON.stringify({ templates: freshTemplates, fetchedAt })
        );
      } catch (storageError) {
        console.warn("Unable to cache WhatsApp templates:", storageError);
      }

      return freshTemplates;
    } catch (e) {
      setError(e.message || "Unable to load WhatsApp templates");
      return null;
    } finally {
      if (!background) setTemplatesLoading(false);
    }
  }, [request]);

  const openTemplates = useCallback(async () => {
    setTemplateModal(true);

    // Use a valid cache immediately; fetch again only after it expires.
    let cached = null;
    try {
      const raw = localStorage.getItem(TEMPLATE_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {
      console.warn("Unable to read WhatsApp template cache:", e);
    }

    const cacheIsValid =
      cached &&
      Array.isArray(cached.templates) &&
      Number.isFinite(cached.fetchedAt) &&
      Date.now() - cached.fetchedAt < TEMPLATE_CACHE_TTL;

    if (cacheIsValid) {
      setTemplates(cached.templates);
      setTemplatesFetchedAt(cached.fetchedAt);
      setTemplatesLoading(false);
      return;
    }

    // Show stale data while refreshing, so the picker does not go blank.
    if (cached && Array.isArray(cached.templates)) {
      setTemplates(cached.templates);
    }

    await fetchTemplates();
  }, [fetchTemplates]);

  // If the template picker stays open, refresh automatically when its cache reaches six hours.
  useEffect(() => {
    if (!templateModal || !templatesFetchedAt) return;

    const remaining = Math.max(
      0,
      templatesFetchedAt + TEMPLATE_CACHE_TTL - Date.now()
    );
    const timer = setTimeout(() => {
      fetchTemplates({ background: templates.length > 0 });
    }, remaining);

    return () => clearTimeout(timer);
  }, [templateModal, templatesFetchedAt, templates.length, fetchTemplates]);

  // A contact with no conversation yet: open the template picker straight away (once).
  useEffect(() => {
    if (open && isNewContact && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openTemplates();
    }
  }, [open, isNewContact, openTemplates]);

  /* ----- uploads ----- */

  const uploadFile = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const result = await request(API, { method: "POST", body: form });
    if (!result.url) throw new Error("Upload finished but no file link was returned");
    return result;
  };

  const uploadTemplateMedia = async (file) => {
    if (file.size > MAX_FILE) throw new Error("Maximum file size is 16 MB");
    const r = await uploadFile(file);
    return {
      url: r.url,
      fileName: r.fileName || file.name,
      type: file.type.startsWith("video/") ? "video" : file.type === "application/pdf" ? "document" : "image",
    };
  };

  /* ----- sending ----- */

  const sendFreeMessage = async () => {
    if ((!message.trim() && !selectedFile) || !sessionOpen || sending) return;
    setSending(true);
    setError("");
    try {
      let mediaUrl = "", mediaType = "", filename = "";
      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        mediaUrl = uploaded.url;
        const t = selectedFile.type;
        mediaType = t.startsWith("image/") ? "image" : t.startsWith("video/") ? "video" : t.startsWith("audio/") ? "audio" : "document";
        filename = uploaded.fileName || selectedFile.name;
      }
      await postJson({
        action: "send-message",
        mobile: phone,
        name: data?.contact?.name || name,
        replyFrom: data?.channel?.replyFrom,
        message: selectedFile ? "" : message.trim(),
        caption: selectedFile ? message.trim() : "",
        mediaUrl, mediaType, filename,
      });
      setMessage("");
      setSelectedFile(null);
      setAttachmentMenu(false);
      setEmojiMenu(false);
      if (imageFileRef.current) imageFileRef.current.value = "";
      if (anyFileRef.current) anyFileRef.current.value = "";
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendLocation = async (place) => {
    setSending(true);
    setError("");
    try {
      await postJson({
        action: "send-message",
        mobile: phone,
        name: data?.contact?.name || name,
        replyFrom: data?.channel?.replyFrom,
        message: "",
        location: { latitude: place.latitude, longitude: place.longitude, name: place.name, address: place.address },
      });
      setLocationModal(false);
      await load();
    } catch (e) {
      setError(e.message);
      setLocationModal(false);
    } finally {
      setSending(false);
    }
  };

  // Called by TemplateModal. Throws on failure so the modal can show the error.
  const sendTemplate = async ({ template, variables, media }) => {
    setTemplateSending(true);
    try {
      const parts = templateParts(template);
      const values = {};
      getVariables(parts.body?.text || "").forEach((k) => { values[k] = variables[k] || ""; });

      const format = parts.header?.format?.toUpperCase();
      const approved = ["IMAGE", "VIDEO", "DOCUMENT"].includes(format) ? parts.header?.image_url || "" : "";
      const mediaUrl = media?.url || approved;
      const mediaType = media?.type || (format === "VIDEO" ? "video" : format === "DOCUMENT" ? "document" : mediaUrl ? "image" : "");

      const sent = await postJson({
        action: "send-template",
        isNew: Boolean(data?.contact?.isNew),
        mobile: phone,
        name: data?.contact?.name || name,
        templateId: template.id,
        campName: `Template to ${data?.contact?.name || name || phone}`,
        variables: values,
        mediaUrl,
        mediaType,
      });

      console.log("[WhatsApp] contact create result:", sent.contact);
      setTemplateModal(false);

      // A brand-new contact takes a moment to show up in the inbox, so retry a few times.
      for (let i = 0; i < 6; i++) {
        await sleep(i === 0 ? 800 : 2000);
        const result = await load();
        if (result?.contactFound) break;
      }
    } finally {
      setTemplateSending(false);
    }
  };

  /* ----- filters ----- */

  const applyDateFilter = () => {
    if (!dateFrom || !dateTo) { setError("Select both From and To dates."); return; }
    load({ from: dateFrom, to: dateTo });
  };
  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); load({ from: "", to: "" }); };

  const visibleMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    const all = data?.messages || [];
    if (!q) return all;
    return all.filter((m) =>
      [m.text, m.caption, m.footer, m.headerText, m.templateName, m.media?.filename, m.location?.name, m.location?.address]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [data?.messages, messageSearch]);

  // Insert a date separator whenever the day changes
  const timeline = useMemo(() => {
    const out = [];
    let lastDay = "";
    visibleMessages.forEach((item) => {
      const day = item.createdAt ? new Date(item.createdAt).toDateString() : "";
      if (day && day !== lastDay) {
        out.push({ kind: "date", key: `date-${day}`, label: dayLabel(item.createdAt) });
        lastDay = day;
      }
      out.push({ kind: "msg", key: item.key, item });
    });
    return out;
  }, [visibleMessages]);

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Stay pinned to the bottom unless the user has scrolled up to read history
  useEffect(() => { if (atBottom) scrollToBottom(); }, [timeline.length, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE) setError("Maximum file size is 16 MB");
    else setSelectedFile(file);
    e.target.value = ""; // lets the same file be picked again
  };

  const previewUrl = useMemo(
    () => (selectedFile?.type?.startsWith("image/") ? URL.createObjectURL(selectedFile) : ""),
    [selectedFile]
  );
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const growTextarea = (el) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 128)}px`; };

  const canSend = !sending && (message.trim() || selectedFile) && data?.channel?.replyFrom && !data?.block?.isBlocked;

  return (
    <>
     {!hideTrigger && (
  <button
    type="button"
    onClick={() => setOpen(true)}
    aria-label="Open WhatsApp chat"
    title="WhatsApp chat"
    className={cls(
      "inline-flex py-1 text-sm gap-1 items-center px-2 justify-center rounded-md border border-[#E5E7EB] bg-white text-[#00A884] transition hover:border-[#00A884] hover:bg-[#E9F8F1]",
      className
    )}
  >
    <MessageCircle size={14} /> WhatsApp
  </button>
)}
      {open && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          <button aria-label="Close overlay" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[1px]" />
          <section className="relative z-10 flex h-[100dvh] w-full max-w-[760px] flex-col bg-white shadow-2xl">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EAEAE8] bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDF5E8] text-sm font-semibold text-[#008F68]">
                  {(data?.contact?.name || name || "?").trim().charAt(0).toUpperCase() || <MessageCircle size={20} />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#252525]">{data?.contact?.name || name || "WhatsApp conversation"}</div>
                  <div className="flex items-center gap-2 text-xs text-[#777]">
                    <span>+{data?.contact?.mobile || phone}</span>
                    {data && (
                      <span className={cls("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", sessionOpen ? "bg-[#E7F7EF] text-[#087F5B]" : "bg-amber-50 text-amber-700")}>
                        <span className={cls("h-1.5 w-1.5 rounded-full", sessionOpen ? "bg-[#00A884]" : "bg-amber-500")} />
                        {sessionLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowFilters((v) => !v)} title="Search & filter" className={cls("rounded-md p-2 hover:bg-[#F4F4F2]", showFilters ? "bg-[#F4F4F2] text-[#00A884]" : "text-[#777]")}><Search size={16} /></button>
                <button onClick={() => load()} title="Refresh" className="rounded-md p-2 text-[#777] hover:bg-[#F4F4F2]"><RefreshCw size={16} className={loading && data ? "animate-spin" : ""} /></button>
                <button onClick={() => setOpen(false)} title="Close" className="rounded-md p-2 text-[#777] hover:bg-[#F4F4F2]"><X size={18} /></button>
              </div>
            </header>

            {/* Tags / groups */}
            {(data?.contact?.email || data?.tags?.length || data?.groups?.length || data?.block?.isBlocked) && (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[#EEEEEC] px-4 py-2 text-xs text-[#686868]">
                {data?.contact?.email && <span className="mr-1">{data.contact.email}</span>}
                {(data?.tags || []).map((t, i) => <span key={`t-${i}`} className="rounded-full bg-[#F1F1EF] px-2 py-0.5">{typeof t === "string" ? t : t.name}</span>)}
                {(data?.groups || []).map((g, i) => <span key={`g-${i}`} className="rounded-full bg-[#EEF4FF] px-2 py-0.5">{typeof g === "string" ? g : g.name}</span>)}
                {data?.block?.isBlocked && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">Blocked</span>}
              </div>
            )}

            {/* Search + date filter — one line */}
            {showFilters && (
              <div className="shrink-0 border-b border-[#EEEEEC] bg-[#FAFAF9] px-4 py-2">
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-[#686868]">
                  <div className="flex min-w-[170px] flex-1 items-center gap-2 rounded-lg border border-[#E8E8E6] bg-white px-2.5">
                    <Search size={14} className="shrink-0 text-[#888]" />
                    <input value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder="Search in conversation…" className="w-full bg-transparent py-1.5 outline-none" />
                    {messageSearch && <button onClick={() => setMessageSearch("")} aria-label="Clear search"><X size={13} /></button>}
                  </div>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" className="shrink-0 rounded border border-[#E5E5E5] bg-white px-2 py-1" />
                  <span className="shrink-0">–</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" className="shrink-0 rounded border border-[#E5E5E5] bg-white px-2 py-1" />
                  <button onClick={applyDateFilter} className="shrink-0 rounded bg-[#E8F6EF] px-2.5 py-1 font-medium text-[#087F5B] hover:bg-[#D9F0E6]">Apply</button>
                  {(dateFrom || dateTo) && <button onClick={clearDateFilter} className="shrink-0 hover:text-black">Clear</button>}
                </div>
              </div>
            )}

            {error && (
              <div className="mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={15} className="mt-px shrink-0" /><span className="min-w-0 flex-1">{error}</span>
                <button onClick={() => setError("")}><X size={14} /></button>
              </div>
            )}

            {/* Messages */}
            <main ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto bg-[#EFEAE2] px-3 py-4 sm:px-5">
              {loading && !data && (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-[#777]"><Loader2 className="animate-spin" size={18} />Loading conversation…</div>
              )}

              {isNewContact && (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-white p-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#DDF5E8] text-[#008F68]"><UserPlus size={20} /></div>
                  <div className="text-sm font-semibold text-[#252525]">No conversation yet</div>
                  <p className="mt-1 text-xs leading-5 text-[#777]">+{phone} has no conversation yet. Send an approved template to start the chat.</p>
                  <button onClick={openTemplates} className="mt-4 rounded-lg bg-[#00A884] px-4 py-2 text-xs font-semibold text-white hover:bg-[#008F70]">Choose template</button>
                </div>
              )}

              {data && !isNewContact && timeline.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="rounded-lg bg-white/80 px-4 py-3 text-sm text-[#777]">{messageSearch ? "No messages match your search." : "No messages found for this contact."}</div>
                </div>
              )}

              <div className="space-y-1.5">
                {timeline.map((row) =>
                  row.kind === "date" ? (
                    <div key={row.key} className="sticky top-0 z-[1] flex justify-center py-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-[#6B6B6B] shadow-sm">{row.label}</span>
                    </div>
                  ) : (
                    <Bubble key={row.key} item={row.item} onImage={setLightbox} />
                  )
                )}
              </div>

              {!atBottom && timeline.length > 0 && (
                <button onClick={() => scrollToBottom(true)} aria-label="Scroll to latest" className="sticky bottom-2 left-full float-right mr-0 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#555] shadow-lg hover:bg-[#F5F5F3]">
                  <ChevronDown size={18} />
                </button>
              )}
            </main>

            {/* Composer */}
            <footer className="shrink-0 border-t border-[#E8E8E6] bg-white p-3">
              {!sessionOpen ? (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-xs text-amber-800">
                    <Clock3 size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <strong>{isNewContact ? "Start with a template" : "24-hour window closed"}</strong>
                      <div className="mt-0.5">{isNewContact ? "WhatsApp only allows an approved template as the first message." : "Free-form messages are paused until the customer replies. Send an approved template to restart."}</div>
                    </div>
                  </div>
                  <button onClick={openTemplates} className="shrink-0 rounded-lg bg-[#00A884] px-3 py-2 text-xs font-semibold text-white hover:bg-[#008F70]">Choose template</button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <input ref={imageFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
                  <input ref={anyFileRef} type="file" accept="application/pdf,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" className="hidden" onChange={pickFile} />

                  <div className="relative">
                    <button onClick={() => { setAttachmentMenu((v) => !v); setEmojiMenu(false); }} title="Attach" className="rounded-full p-2.5 text-[#66736B] hover:bg-[#F2F2F0]"><Paperclip size={19} /></button>
                    {attachmentMenu && (
                      <div className="absolute bottom-12 left-0 z-30 w-52 overflow-hidden rounded-xl border border-[#E8E8E6] bg-white p-1 shadow-xl">
                        <button onClick={() => { setAttachmentMenu(false); imageFileRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-[#F5F5F3]"><ImageIcon size={16} className="text-emerald-600" /> Photos & videos</button>
                        <button onClick={() => { setAttachmentMenu(false); anyFileRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-[#F5F5F3]"><File size={16} className="text-blue-600" /> Document</button>
                        <button onClick={() => { setAttachmentMenu(false); setLocationModal(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-[#F5F5F3]"><MapPin size={16} className="text-rose-600" /> Location</button>
                        <button onClick={() => { setAttachmentMenu(false); openTemplates(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-[#F5F5F3]"><MessageSquareText size={16} className="text-violet-600" /> Message template</button>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 rounded-2xl border border-[#E5E5E5] bg-[#FAFAF9] px-3 py-2 focus-within:border-[#00A884]">
                    {selectedFile && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-white p-1.5 pr-2 text-xs text-[#555] shadow-sm">
                        {previewUrl ? <img src={previewUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded bg-[#F1F1EF]"><FileText size={16} /></span>}
                        <span className="min-w-0 flex-1 truncate">{selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} aria-label="Remove attachment"><X size={14} /></button>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); growTextarea(e.target); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFreeMessage(); } }}
                        rows={1}
                        placeholder={selectedFile ? "Add a caption…" : "Type a message"}
                        className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-0.5 text-sm outline-none"
                      />
                      <div className="relative">
                        <button onClick={() => { setEmojiMenu((v) => !v); setAttachmentMenu(false); }} title="Emoji" className="rounded-md p-1 text-[#66736B] hover:bg-[#EEEEEC]"><Smile size={18} /></button>
                        {emojiMenu && (
                          <div className="absolute bottom-9 right-0 z-30 grid w-56 grid-cols-6 gap-1 rounded-xl border bg-white p-2 shadow-xl">
                            {EMOJIS.map((emoji) => <button key={emoji} onClick={() => { setMessage((o) => `${o}${emoji}`); setEmojiMenu(false); textareaRef.current?.focus(); }} className="rounded p-1 text-lg hover:bg-[#F2F2F0]">{emoji}</button>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button disabled={!canSend} onClick={sendFreeMessage} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white hover:bg-[#008F70] disabled:cursor-not-allowed disabled:opacity-40">
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              )}
            </footer>
          </section>
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox("")}>
          <button aria-label="Close image" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={20} /></button>
          <img src={lightbox} alt="Attachment" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {locationModal && <LocationPicker onClose={() => setLocationModal(false)} onSend={sendLocation} sending={sending} />}

      {templateModal && (
        <TemplateModal
          templates={templates}
          loading={templatesLoading}
          sending={templateSending}
          onClose={() => setTemplateModal(false)}
          onUpload={uploadTemplateMedia}
          onSend={sendTemplate}
        />
      )}
    </>
  );
}