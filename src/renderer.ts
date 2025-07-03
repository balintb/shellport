interface Point {
  x: number;
  y: number;
}

export class AirportRenderer {
  private width: number;
  private height: number;
  private canvas: string[][];
  private scale: { lat: number; lon: number };
  private offset: { lat: number; lon: number };

  constructor(width: number = 120, height: number = 40) {
    this.width = width;
    this.height = height;
    this.canvas = Array(height).fill(null).map(() => Array(width).fill(' '));
  }

  render(airportData: any, options: { showBorder?: boolean; showTitle?: boolean; showLegend?: boolean } = {}): string {
    const latRange = airportData.bounds.maxLat - airportData.bounds.minLat;
    const lonRange = airportData.bounds.maxLon - airportData.bounds.minLon;
    
    const padding = 0.1;
    this.scale = {
      lat: (this.height - 4) / (latRange * (1 + padding * 2)),
      lon: (this.width - 4) / (lonRange * (1 + padding * 2)),
    };
    
    this.offset = {
      lat: airportData.bounds.minLat - latRange * padding,
      lon: airportData.bounds.minLon - lonRange * padding,
    };

    this.clear();

    for (const taxiway of airportData.taxiways) {
      this.drawTaxiway(taxiway);
    }

    for (const runway of airportData.runways) {
      this.drawRunway(runway);
    }

    const airportPoint = this.latLonToCanvas(airportData.lat, airportData.lon);
    if (this.isInBounds(airportPoint)) {
      this.canvas[airportPoint.y][airportPoint.x] = '⊕';
    }

    this.addLabels(airportData, options.showTitle, options.showLegend);

    return this.toString(options.showBorder);
  }

  private clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.canvas[y][x] = ' ';
      }
    }
  }

  private latLonToCanvas(lat: number, lon: number): Point {
    return {
      x: Math.round((lon - this.offset.lon) * this.scale.lon) + 2,
      y: this.height - Math.round((lat - this.offset.lat) * this.scale.lat) - 2,
    };
  }

  private isInBounds(point: Point): boolean {
    return point.x >= 0 && point.x < this.width && point.y >= 0 && point.y < this.height;
  }

  private drawLine(p1: Point, p2: Point, char: string): void {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const sx = p1.x < p2.x ? 1 : -1;
    const sy = p1.y < p2.y ? 1 : -1;
    let err = dx - dy;

    let x = p1.x;
    let y = p1.y;

    while (true) {
      if (this.isInBounds({ x, y })) {
        // Determine character based on line direction
        if (dx > dy * 2) {
          this.canvas[y][x] = '━';
        } else if (dy > dx * 2) {
          this.canvas[y][x] = '┃';
        } else if ((sx > 0 && sy > 0) || (sx < 0 && sy < 0)) {
          this.canvas[y][x] = '╲';
        } else {
          this.canvas[y][x] = '╱';
        }
      }

      if (x === p2.x && y === p2.y) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private drawRunway(runway: any): void {
    const p1 = this.latLonToCanvas(runway.lat1, runway.lon1);
    const p2 = this.latLonToCanvas(runway.lat2, runway.lon2);
    
    this.drawLine(p1, p2, '═');
    
    if (this.isInBounds(p1)) {
      this.canvas[p1.y][p1.x] = '◆';
    }
    if (this.isInBounds(p2)) {
      this.canvas[p2.y][p2.x] = '◆';
    }
  }

  private drawTaxiway(taxiway: any): void {
    if (taxiway.coords.length < 2) return;

    for (let i = 0; i < taxiway.coords.length - 1; i++) {
      const p1 = this.latLonToCanvas(taxiway.coords[i].lat, taxiway.coords[i].lon);
      const p2 = this.latLonToCanvas(taxiway.coords[i + 1].lat, taxiway.coords[i + 1].lon);
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      
      for (let j = 0; j <= steps; j++) {
        const x = Math.round(p1.x + (dx * j) / steps);
        const y = Math.round(p1.y + (dy * j) / steps);
        
        if (this.isInBounds({ x, y }) && j % 2 === 0) {
          this.canvas[y][x] = '·';
        }
      }
    }
  }

  private addLabels(airportData: any, showTitle: boolean = false, showLegend: boolean = false): void {
    if (showTitle) {
      const title = `${airportData.name} (${airportData.icao})`;
      const titleX = Math.max(0, Math.floor((this.width - title.length) / 2));
      for (let i = 0; i < title.length && titleX + i < this.width; i++) {
        this.canvas[0][titleX + i] = title[i];
      }
    }

    if (showTitle) {
      let labelY = 2;
      for (const runway of airportData.runways.slice(0, 5)) {
        const label = `${runway.name}`;
        if (labelY < this.height - 2) {
          for (let i = 0; i < label.length && i < 10; i++) {
            this.canvas[labelY][this.width - 12 + i] = label[i];
          }
          labelY++;
        }
      }
    }

    if (showLegend) {
      const legendY = this.height - 2;
      const legend = '◆ Runway  · Taxiway  ⊕ Terminal';
      for (let i = 0; i < legend.length && i < this.width; i++) {
        this.canvas[legendY][i] = legend[i];
      }
    }
  }

  private toString(showBorder: boolean = false): string {
    if (!showBorder) {
      return this.canvas.map(row => row.join('')).join('\n');
    }
    
    const border = '─';
    const topBorder = '┌' + border.repeat(this.width) + '┐';
    const bottomBorder = '└' + border.repeat(this.width) + '┘';
    
    let result = topBorder + '\n';
    for (const row of this.canvas) {
      result += '│' + row.join('') + '│\n';
    }
    result += bottomBorder;
    
    return result;
  }
}