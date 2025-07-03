interface OurAirportsAirport {
  id: string;
  ident: string;
  type: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number;
  continent: string;
  iso_country: string;
  iso_region: string;
  municipality: string;
  scheduled_service: string;
  icao_code: string;
  iata_code: string;
  gps_code: string;
  local_code: string;
  home_link: string;
  wikipedia_link: string;
  keywords: string;
}

interface OurAirportsRunway {
  id: string;
  airport_ref: string;
  airport_ident: string;
  length_ft: number;
  width_ft: number;
  surface: string;
  lighted: boolean;
  closed: boolean;
  le_ident: string;
  le_latitude_deg: number;
  le_longitude_deg: number;
  le_elevation_ft: number;
  le_heading_degT: number;
  le_displaced_threshold_ft: number;
  he_ident: string;
  he_latitude_deg: number;
  he_longitude_deg: number;
  he_elevation_ft: number;
  he_heading_degT: number;
  he_displaced_threshold_ft: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseAirportFromCSV(line: string): OurAirportsAirport | null {
  const fields = parseCSVLine(line);
  if (fields.length < 19) return null;
  
  return {
    id: fields[0],
    ident: fields[1],
    type: fields[2],
    name: fields[3],
    latitude_deg: parseFloat(fields[4]) || 0,
    longitude_deg: parseFloat(fields[5]) || 0,
    elevation_ft: parseFloat(fields[6]) || 0,
    continent: fields[7],
    iso_country: fields[8],
    iso_region: fields[9],
    municipality: fields[10],
    scheduled_service: fields[11],
    icao_code: fields[12],
    iata_code: fields[13],
    gps_code: fields[14],
    local_code: fields[15],
    home_link: fields[16],
    wikipedia_link: fields[17],
    keywords: fields[18],
  };
}

function parseRunwayFromCSV(line: string): OurAirportsRunway | null {
  const fields = parseCSVLine(line);
  if (fields.length < 20) return null;
  
  return {
    id: fields[0],
    airport_ref: fields[1],
    airport_ident: fields[2],
    length_ft: parseFloat(fields[3]) || 0,
    width_ft: parseFloat(fields[4]) || 0,
    surface: fields[5],
    lighted: fields[6] === '1',
    closed: fields[7] === '1',
    le_ident: fields[8],
    le_latitude_deg: parseFloat(fields[9]) || 0,
    le_longitude_deg: parseFloat(fields[10]) || 0,
    le_elevation_ft: parseFloat(fields[11]) || 0,
    le_heading_degT: parseFloat(fields[12]) || 0,
    le_displaced_threshold_ft: parseFloat(fields[13]) || 0,
    he_ident: fields[14],
    he_latitude_deg: parseFloat(fields[15]) || 0,
    he_longitude_deg: parseFloat(fields[16]) || 0,
    he_elevation_ft: parseFloat(fields[17]) || 0,
    he_heading_degT: parseFloat(fields[18]) || 0,
    he_displaced_threshold_ft: parseFloat(fields[19]) || 0,
  };
}

export async function fetchAirportFromOurAirports(icao: string): Promise<any | null> {
  try {
    const airportsResponse = await fetch('https://davidmegginson.github.io/ourairports-data/airports.csv');
    if (!airportsResponse.ok) {
      throw new Error('Failed to fetch airports data from OurAirports');
    }
    
    const airportsText = await airportsResponse.text();
    const airportLines = airportsText.split('\n');
    
    let airport: OurAirportsAirport | null = null;
    for (let i = 1; i < airportLines.length; i++) {
      const line = airportLines[i].trim();
      if (!line) continue;
      
      const parsed = parseAirportFromCSV(line);
      if (parsed && (parsed.icao_code === icao || parsed.ident === icao)) {
        airport = parsed;
        break;
      }
    }
    
    if (!airport) {
      return null;
    }
    
    const runwaysResponse = await fetch('https://davidmegginson.github.io/ourairports-data/runways.csv');
    if (!runwaysResponse.ok) {
      throw new Error('Failed to fetch runways data from OurAirports');
    }
    
    const runwaysText = await runwaysResponse.text();
    const runwayLines = runwaysText.split('\n');
    
    const runways: any[] = [];
    for (let i = 1; i < runwayLines.length; i++) {
      const line = runwayLines[i].trim();
      if (!line) continue;
      
      const parsed = parseRunwayFromCSV(line);
      if (parsed && parsed.airport_ident === airport.ident && !parsed.closed) {
        const runwayName = `${parsed.le_ident}/${parsed.he_ident}`;
        runways.push({
          name: runwayName,
          lat1: parsed.le_latitude_deg,
          lon1: parsed.le_longitude_deg,
          lat2: parsed.he_latitude_deg,
          lon2: parsed.he_longitude_deg,
          width: parsed.width_ft * 0.3048, // Convert feet to meters
          surface: parsed.surface.toLowerCase(),
        });
      }
    }
    
    let minLat = airport.latitude_deg;
    let maxLat = airport.latitude_deg;
    let minLon = airport.longitude_deg;
    let maxLon = airport.longitude_deg;
    
    for (const runway of runways) {
      minLat = Math.min(minLat, runway.lat1, runway.lat2);
      maxLat = Math.max(maxLat, runway.lat1, runway.lat2);
      minLon = Math.min(minLon, runway.lon1, runway.lon2);
      maxLon = Math.max(maxLon, runway.lon1, runway.lon2);
    }
    
    return {
      name: airport.name,
      icao: airport.icao_code || airport.ident,
      lat: airport.latitude_deg,
      lon: airport.longitude_deg,
      runways,
      taxiways: [], // no twy data
      bounds: { minLat, maxLat, minLon, maxLon },
    };
  } catch (error) {
    console.warn(`Warning: Failed to fetch from OurAirports: ${error.message}`);
    return null;
  }
}