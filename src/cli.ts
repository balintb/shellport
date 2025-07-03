#!/usr/bin/env bun

import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    border: {
      type: "boolean",
      short: "b",
    },
    "runway-info": {
      type: "boolean",
      short: "r",
    },
    info: {
      type: "boolean",
      short: "i",
    },
    title: {
      type: "boolean",
      short: "t",
    },
    legend: {
      type: "boolean",
      short: "l",
    },
    "no-cache": {
      type: "boolean",
      short: "n",
    },
    "clear-cache": {
      type: "boolean",
      short: "c",
    },
  },
  strict: false,
  allowPositionals: true,
});

if (values["clear-cache"]) {
  const { AirportCache } = await import("./cache");
  const cache = new AirportCache();
  const size = await cache.size();
  await cache.clear();
  console.log(`Cache cleared. Removed ${size} cached airport(s).`);
  process.exit(0);
}

if (values.help || Bun.argv.length < 3) {
  console.log(`
shellport - Display airport diagrams in terminal

Usage: shellport <ICAO> [options]

Examples:
  shellport KJFK              # Minimal airport map (runways/taxiways only)
  shellport EGLL --border     # With border
  shellport LFPG -i           # With airport info output
  shellport LHBP -tl          # With title and legend
  shellport KJFK -brilt       # All options enabled

Options:
  -h, --help         Show this help message
  -b, --border       Display border around the map (default: off)
  -r, --runway-info  Display runway information (default: off)
  -i, --info         Display airport info during fetch (default: off)
  -t, --title        Display airport title on map (default: off)
  -l, --legend       Display legend on map (default: off)
  -n, --no-cache     Bypass cache and fetch fresh data (default: off)
  -c, --clear-cache  Clear all cached airport data and exit
`);
  process.exit(0);
}

const icao = Bun.argv[2]?.toUpperCase();

if (!icao || icao.length !== 4) {
  console.error("Error: Please provide a valid 4-letter ICAO code");
  process.exit(1);
}

import { displayAirportMap } from "./main";

try {
  await displayAirportMap(icao, {
    showBorder: values.border || false,
    showRunwayInfo: values["runway-info"] || false,
    showInfo: values.info || false,
    showTitle: values.title || false,
    showLegend: values.legend || false,
    useCache: !(values["no-cache"] || false),
  });
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}