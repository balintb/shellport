import { fetchAirportData } from "./airport-data";
import { AirportRenderer } from "./renderer";

interface DisplayOptions {
  showBorder?: boolean;
  showRunwayInfo?: boolean;
  showInfo?: boolean;
  showTitle?: boolean;
  showLegend?: boolean;
  useCache?: boolean;
}

export async function displayAirportMap(icao: string, options: DisplayOptions = {}): Promise<void> {
  if (options.showInfo) {
    console.log(`Fetching airport data for ${icao}...`);
  }
  
  try {
    const airportData = await fetchAirportData(icao, options.useCache);
    
    if (options.showInfo) {
      console.log(`\nFound: ${airportData.name}`);
      console.log(`Runways: ${airportData.runways.length}`);
      console.log(`Taxiways: ${airportData.taxiways.length}\n`);
    }
    
    // Get terminal size
    const terminalWidth = process.stdout.columns || 120;
    const terminalHeight = Math.min(process.stdout.rows || 40, 50) - 10; // Leave space for info
    
    const renderer = new AirportRenderer(
      Math.min(terminalWidth - 2, 150),
      Math.min(terminalHeight, 40)
    );
    
    const map = renderer.render(airportData, {
      showBorder: options.showBorder,
      showTitle: options.showTitle,
      showLegend: options.showLegend,
    });
    console.log(map);
    
    // Display runway information if requested
    if (options.showRunwayInfo && airportData.runways.length > 0) {
      console.log("\nRunway Information:");
      for (const runway of airportData.runways) {
        console.log(`  ${runway.name}: ${runway.surface || 'Unknown surface'}`);
      }
    }
  } catch (error) {
    if (error.message.includes('not found')) {
      throw new Error(`Airport ${icao} not found. Please check the ICAO code.`);
    }
    throw error;
  }
}