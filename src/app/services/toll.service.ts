import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TollGuruRequest, TollGuruResponse, Route } from '../models/tollguru.interface';
import { environment } from '../../environments/environment';
import { catchError, Observable, tap, throwError, of, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TollService {
  // Signals for reactive state management
  public activeRoute = signal<Route | null>(null);
  public allRoutes = signal<Route[]>([]);
  public isLoading = signal<boolean>(false);
  public errorMsg = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  searchLocations(query: string): Observable<any[]> {
    if (!query || query.length < 4) return of([]);
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'jsonv2')
      .set('limit', '10') // Fetch more to filter down
      .set('countrycodes', 'us,ca');
      
    return this.http.get<any[]>('https://nominatim.openstreetmap.org/search', { params }).pipe(
      map(results => results.filter(r => r.class === 'place' || r.class === 'boundary').slice(0, 5))
    );
  }

  calculateRoute(requestParams: TollGuruRequest, overrideApiKey?: string | null): Observable<TollGuruResponse> {
    this.isLoading.set(true);
    this.errorMsg.set(null);
    this.activeRoute.set(null);
    this.allRoutes.set([]);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': overrideApiKey || environment.tollguruApiKey
    });

    return this.http.post<TollGuruResponse>(`${environment.apiUrl}/toll/v2/origin-destination-waypoints`, requestParams, { headers }).pipe(
      tap(response => {
        this.isLoading.set(false);
        if (response && response.routes && response.routes.length > 0) {
          this.allRoutes.set(response.routes);
          this.activeRoute.set(response.routes[0]);
        } else {
          this.errorMsg.set('No route found in the response.');
        }
      }),
      catchError(error => {
        this.isLoading.set(false);
        const backendMessage = error.error?.message || error.message;
        this.errorMsg.set(`Error: ${backendMessage}`);
        return throwError(() => new Error(backendMessage));
      })
    );
  }

  decodePolyline(encoded: string): [number, number][] {
    if (!encoded) return [];
    
    const poly: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push([lat / 1e5, lng / 1e5]);
    }
    return poly;
  }
}
