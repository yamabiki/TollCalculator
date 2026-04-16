import { Component, effect, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { TollService } from '../../services/toll.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <div #map id="map"></div>
    </div>
  `,
  styles: [`
    .map-container {
      height: 100%;
      width: 100%;
      position: relative;
    }
    #map {
      height: 100%;
      width: 100%;
      border-radius: 16px;
      z-index: 1;
    }
  `]
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('map', { static: true }) mapElement!: ElementRef;
  private map!: L.Map;
  private polylineLayer: L.Polyline | null = null;
  private tollPlazasLayer: L.LayerGroup = new L.LayerGroup();

  constructor(private tollService: TollService) {
    // Reactively update the map when activeRoute changes
    effect(() => {
      const route = this.tollService.activeRoute();
      if (route) {
        this.renderRoute(route);
      } else {
        this.clearMap();
      }
    });
  }

  ngOnInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    // Initialize map centered roughly at US
    this.map = L.map(this.mapElement.nativeElement).setView([39.8283, -98.5795], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(this.map);

    this.tollPlazasLayer.addTo(this.map);
  }

  private renderRoute(route: any): void {
    this.clearMap();

    const decodedPath = this.tollService.decodePolyline(route.polyline);
    if (!decodedPath || decodedPath.length === 0) return;

    this.polylineLayer = L.polyline(decodedPath, {
      color: '#3b82f6', // Bright blue for the route
      weight: 6,
      opacity: 0.8
    }).addTo(this.map);

    // Fit bounds to polyline
    this.map.fitBounds(this.polylineLayer.getBounds(), { padding: [50, 50] });

    // Draw Toll Plazas and Toll Sectors
    if (route.tolls) {
      route.tolls.forEach((toll: any) => {
        // Visual representation of a Toll Sector (if start and end coordinates exist)
        if (toll.start && toll.end) {
           const startIndex = this.findClosestIndex(toll.start.lat, toll.start.lng, decodedPath);
           const endIndex = this.findClosestIndex(toll.end.lat, toll.end.lng, decodedPath);
           if (startIndex !== -1 && endIndex !== -1) {
             const minIdx = Math.min(startIndex, endIndex);
             const maxIdx = Math.max(startIndex, endIndex);
             const tollSegment = decodedPath.slice(minIdx, maxIdx + 1);

             const sectorPolyline = L.polyline(tollSegment, {
               color: '#ef4444', // Highlight toll segments in vibrant red
               weight: 8,
               opacity: 0.85
             }).bindPopup(`<b>${toll.name || 'Toll Sector'}</b><br/>Cash: $${toll.cashCost || toll.cash || 0}<br/>Tag: $${toll.tagCost || toll.tag || 0}`);
             
             sectorPolyline.addTo(this.map);
             this.tollPlazasLayer.addLayer(sectorPolyline);
           }
        }

        // Draw individual Point Markers
        const lat = toll.lat || (toll.start && toll.start.lat);
        const lng = toll.lng || (toll.start && toll.start.lng);

        if (lat && lng) {
          const marker = L.circleMarker([lat, lng], {
            radius: 6,
            fillColor: '#ef4444',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).bindPopup(`<b>${toll.name || 'Toll Location'}</b><br/>Cash: $${toll.cashCost || toll.cash || 0}<br/>Tag: $${toll.tagCost || toll.tag || 0}`);
          
          this.tollPlazasLayer.addLayer(marker);
        }
      });
    }

    // Add Start and End Markers
    L.circleMarker(decodedPath[0], { radius: 8, fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 1 })
      .bindPopup('Start')
      .addTo(this.tollPlazasLayer);

    L.circleMarker(decodedPath[decodedPath.length - 1], { radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1 })
      .bindPopup('End')
      .addTo(this.tollPlazasLayer);
  }

  private findClosestIndex(lat: number, lng: number, path: [number, number][]): number {
    if (!path || path.length === 0) return -1;
    let minDistance = Infinity;
    let closestIndex = -1;
    for (let i = 0; i < path.length; i++) {
        const dLat = path[i][0] - lat;
        const dLng = path[i][1] - lng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = i;
        }
    }
    return closestIndex;
  }

  private clearMap(): void {
    if (this.polylineLayer) {
      this.polylineLayer.remove();
      this.polylineLayer = null;
    }
    this.tollPlazasLayer.clearLayers();
  }
}
