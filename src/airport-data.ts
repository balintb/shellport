import { AirportCache } from './cache';
import { fetchAirportFromOurAirports } from './ourairports';

interface Runway {
  name: string;
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
  width: number;
  surface?: string;
}

interface Taxiway {
  name: string;
  coords: Array<{ lat: number; lon: number }>;
}

interface AirportData {
  name: string;
  icao: string;
  lat: number;
  lon: number;
  runways: Runway[];
  taxiways: Taxiway[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export async function fetchAirportData(icao: string, useCache: boolean = true): Promise<AirportData> {
  const cache = new AirportCache();
  
  // Try to get from cache first
  if (useCache) {
    const cachedData = await cache.get(icao);
    if (cachedData) {
      return cachedData;
    }
  }
  // Use a coordinate-based approach for known airports
  const knownAirports: Record<string, { name: string; lat: number; lon: number }> = {
    'KJFK': { name: 'John F. Kennedy International Airport', lat: 40.6413, lon: -73.7781 },
    'KLAX': { name: 'Los Angeles International Airport', lat: 33.9425, lon: -118.4081 },
    'EGLL': { name: 'London Heathrow', lat: 51.4700, lon: -0.4543 },
    'LFPG': { name: 'Paris Charles de Gaulle', lat: 49.0097, lon: 2.5479 },
    'EDDF': { name: 'Frankfurt Airport', lat: 50.0379, lon: 8.5622 },
    'RJTT': { name: 'Tokyo Haneda', lat: 35.5494, lon: 139.7798 },
    'ZBAA': { name: 'Beijing Capital International', lat: 40.0799, lon: 116.6031 },
    'YSSY': { name: 'Sydney Kingsford Smith', lat: -33.9461, lon: 151.1772 },
    'KATL': { name: 'Hartsfield-Jackson Atlanta', lat: 33.6407, lon: -84.4277 },
    'KORD': { name: "Chicago O'Hare", lat: 41.9742, lon: -87.9073 },
    'LHBP': { name: 'Budapest Ferenc Liszt International Airport', lat: 47.4369, lon: 19.2556 },
  };

  let airport: any;
  let airportLat: number;
  let airportLon: number;
  let airportName: string;

  if (knownAirports[icao]) {
    // Use known coordinates
    const known = knownAirports[icao];
    airportLat = known.lat;
    airportLon = known.lon;
    airportName = known.name;
    airport = { lat: airportLat, lon: airportLon, tags: { name: airportName } };
  } else {
    // Try to find in OpenStreetMap
    const airportQuery = `
      [out:json];
      (
        node["aeroway"="aerodrome"]["icao"="${icao}"];
        way["aeroway"="aerodrome"]["icao"="${icao}"];
      );
      out center;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: airportQuery,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch airport data');
    }

    const data = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      // Try OurAirports as fallback
      const ourAirportsData = await fetchAirportFromOurAirports(icao);
      if (ourAirportsData) {
        // Cache the data for future use
        if (useCache) {
          await cache.set(icao, ourAirportsData);
        }
        return ourAirportsData;
      }
      
      throw new Error(`Airport with ICAO code ${icao} not found`);
    }

    airport = data.elements[0];
    airportLat = airport.lat || airport.center?.lat;
    airportLon = airport.lon || airport.center?.lon;
    airportName = airport.tags?.name || icao;
  }
  
  // Now get runways and taxiways
  const runwayQuery = `
    [out:json];
    (
      way["aeroway"="runway"](around:5000,${airportLat},${airportLon});
      way["aeroway"="taxiway"](around:5000,${airportLat},${airportLon});
    );
    out geom;
  `;

  const runwayResponse = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: runwayQuery,
  });

  if (!runwayResponse.ok) {
    throw new Error('Failed to fetch runway data');
  }

  const runwayData = await runwayResponse.json();
  
  const runways: Runway[] = [];
  const taxiways: Taxiway[] = [];
  let minLat = airportLat, maxLat = airportLat;
  let minLon = airportLon, maxLon = airportLon;

  for (const element of runwayData.elements) {
    if (element.tags?.aeroway === 'runway' && element.geometry) {
      const coords = element.geometry;
      if (coords.length >= 2) {
        runways.push({
          name: element.tags.ref || `RW${runways.length + 1}`,
          lat1: coords[0].lat,
          lon1: coords[0].lon,
          lat2: coords[coords.length - 1].lat,
          lon2: coords[coords.length - 1].lon,
          width: parseFloat(element.tags.width) || 45,
          surface: element.tags.surface,
        });
      }
    } else if (element.tags?.aeroway === 'taxiway' && element.geometry) {
      taxiways.push({
        name: element.tags.ref || element.tags.name || `TX${taxiways.length + 1}`,
        coords: element.geometry.map((g: any) => ({ lat: g.lat, lon: g.lon })),
      });
    }

    // Update bounds
    if (element.geometry) {
      for (const coord of element.geometry) {
        minLat = Math.min(minLat, coord.lat);
        maxLat = Math.max(maxLat, coord.lat);
        minLon = Math.min(minLon, coord.lon);
        maxLon = Math.max(maxLon, coord.lon);
      }
    }
  }

  const airportData = {
    name: airportName,
    icao,
    lat: airportLat,
    lon: airportLon,
    runways,
    taxiways,
    bounds: { minLat, maxLat, minLon, maxLon },
  };
  
  // Cache the data for future use
  if (useCache) {
    await cache.set(icao, airportData);
  }
  
  return airportData;
}