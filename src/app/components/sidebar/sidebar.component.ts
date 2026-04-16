import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TollService } from '../../services/toll.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="sidebar">
      <div class="brand">
        <h2>🚚 IntelliToll</h2>
        <p>Commercial Truck Routing</p>
      </div>

      <form [formGroup]="routeForm" (ngSubmit)="onSubmit()" class="route-form">
        <div class="form-group">
          <label for="apiKey">Tollguru API Key (Optional)</label>
          <input id="apiKey" type="password" formControlName="apiKey" placeholder="Leave blank to use default key" />
        </div>

        <div class="form-group autocomplete-wrapper">
          <label for="from">Departure</label>
          <input id="from" type="text" formControlName="from" placeholder="e.g. Dallas, TX" autocomplete="off" />
          <ul class="autocomplete-dropdown" *ngIf="showFromResults()">
            <li *ngFor="let res of fromResults()" (click)="selectFrom(res)">
              {{ res.display_name.split(',')[0] + ', ' + (res.display_name.split(',')[1] || '') }}
              <small>{{ res.display_name }}</small>
            </li>
          </ul>
        </div>

        <div class="form-group autocomplete-wrapper">
          <label for="to">Destination</label>
          <input id="to" type="text" formControlName="to" placeholder="e.g. Austin, TX" autocomplete="off" />
          <ul class="autocomplete-dropdown" *ngIf="showToResults()">
            <li *ngFor="let res of toResults()" (click)="selectTo(res)">
              {{ res.display_name.split(',')[0] + ', ' + (res.display_name.split(',')[1] || '') }}
              <small>{{ res.display_name }}</small>
            </li>
          </ul>
        </div>

        <div class="form-group">
          <label for="fuelPrice">Fuel Price ($/gal)</label>
          <div class="input-with-icon">
             <span>$</span>
             <input id="fuelPrice" type="number" step="0.01" formControlName="fuelPrice" />
          </div>
        </div>

        <button type="submit" [disabled]="routeForm.invalid || tollService.isLoading()" class="btn-calculate">
          <span *ngIf="tollService.isLoading()">Calculating...</span>
          <span *ngIf="!tollService.isLoading()">Calculate Route</span>
        </button>
      </form>

      <div *ngIf="tollService.errorMsg() as error" class="error-msg">
        {{ error }}
      </div>

      <div *ngIf="tollService.activeRoute() as route" class="results-container">
        <h3>Active Route Summary</h3>
        
        <div class="metrics-grid">
          <div class="metric-card shadow">
            <span class="metric-label">ETA</span>
            <span class="metric-value">{{ route.summary.duration.text }}</span>
          </div>

          <div class="metric-card shadow">
            <span class="metric-label">Distance</span>
            <span class="metric-value">{{ route.summary.distance.text || route.summary.distance.imperial }}</span>
          </div>
          
          <div class="metric-card shadow">
            <span class="metric-label">Est. Fuel Cost</span>
            <span class="metric-value">\${{ (route.costs?.fuel || estimatedFuelCost(route.summary.distance.value)) | number:'1.2-2' }}</span>
          </div>

          <div class="metric-card highlight-card shadow">
            <span class="metric-label text-warning">Max Toll Cost</span>
            <span class="metric-value highlight-value">\${{ maxTollCost(route) | number:'1.2-2' }}</span>
          </div>
        </div>

        <h3 class="mt-4">Available Route Options</h3>
        <div class="route-options-list">
          
          <!-- Optimal Route -->
          <div *ngIf="optimalRoute() as optRoute" class="option-card" [class.active-option]="route === optRoute">
            <div class="opt-header">
              <h4>⭐ Optimal Route</h4>
              <button *ngIf="route !== optRoute" class="btn-swap" (click)="tollService.activeRoute.set(optRoute)">Preview</button>
              <span *ngIf="route === optRoute" class="active-badge">Active</span>
            </div>
            <div class="alt-metrics">
              <div><span class="label">Time:</span> {{ optRoute.summary.duration.text }}</div>
              <div><span class="label">Distance:</span> {{ optRoute.summary.distance.text || optRoute.summary.distance.imperial }}</div>
              <div><span class="label">Tolls:</span> \${{ maxTollCost(optRoute) | number:'1.2-2' }}</div>
            </div>
          </div>

          <!-- Fastest Route -->
          <div *ngIf="fastestRoute() as fRoute" class="option-card" [class.active-option]="route === fRoute">
            <div class="opt-header">
              <h4>⚡ Fastest Route</h4>
              <button *ngIf="route !== fRoute" class="btn-swap" (click)="tollService.activeRoute.set(fRoute)">Preview</button>
              <span *ngIf="route === fRoute" class="active-badge">Active</span>
            </div>
             <div class="alt-metrics">
              <div><span class="label">Time:</span> {{ fRoute.summary.duration.text }}</div>
              <div><span class="label">Distance:</span> {{ fRoute.summary.distance.text || fRoute.summary.distance.imperial }}</div>
              <div><span class="label">Tolls:</span> \${{ maxTollCost(fRoute) | number:'1.2-2' }}</div>
            </div>
          </div>

          <!-- Toll-Free Route -->
          <div class="option-card toll-free-box" [class.active-option]="route === tollFreeRoute()">
            <div class="opt-header">
              <h4 class="text-success">🌿 Toll-Free Route</h4>
              <button *ngIf="tollFreeRoute() && route !== tollFreeRoute()" class="btn-swap" (click)="tollService.activeRoute.set(tollFreeRoute()!)">Preview</button>
              <span *ngIf="tollFreeRoute() && route === tollFreeRoute()" class="active-badge">Active</span>
            </div>
            
            <div *ngIf="tollFreeRoute() as tfRoute; else noFreeRoute">
              <div class="alt-metrics">
                <div><span class="label">Time:</span> {{ tfRoute.summary.duration.text }}</div>
                <div><span class="label">Distance:</span> {{ tfRoute.summary.distance.text || tfRoute.summary.distance.imperial }}</div>
                <div><span class="label">Tolls:</span> $0.00</div>
              </div>
            </div>
            
            <ng-template #noFreeRoute>
              <div class="no-route-msg">
                A toll-free route isn't possible from origin to destination for this vehicle configuration.
              </div>
            </ng-template>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  fromResults = signal<any[]>([]);
  toResults = signal<any[]>([]);
  showFromResults = signal<boolean>(false);
  showToResults = signal<boolean>(false);

  routeForm = this.fb.group({
    apiKey: [''],
    from: ['Dallas, TX', Validators.required],
    to: ['Austin, TX', Validators.required],
    fuelPrice: [4.00, [Validators.required, Validators.min(0.01)]]
  });

  optimalRoute = computed(() => {
    const routes = this.tollService.allRoutes();
    return routes.length > 0 ? routes[0] : null;
  });

  fastestRoute = computed(() => {
    const routes = this.tollService.allRoutes();
    if (routes.length === 0) return null;
    return routes.reduce((prev, curr) => (prev.summary.duration.value < curr.summary.duration.value) ? prev : curr);
  });

  tollFreeRoute = computed(() => {
    const routes = this.tollService.allRoutes();
    const tollFree = routes.filter(r => r.summary.hasTolls === false);
    if (tollFree.length === 0) return null;
    return tollFree.reduce((prev, curr) => (prev.summary.duration.value < curr.summary.duration.value) ? prev : curr);
  });

  constructor(
    private fb: FormBuilder,
    public tollService: TollService
  ) {}

  ngOnInit() {
    this.routeForm.get('from')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(val => {
        if (!val || val.length < 4) {
          this.showFromResults.set(false);
          return of([]);
        }
        return this.tollService.searchLocations(val).pipe(catchError(() => of([])));
      })
    ).subscribe(results => {
      this.fromResults.set(results);
      this.showFromResults.set(results.length > 0);
    });

    this.routeForm.get('to')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(val => {
        if (!val || val.length < 4) {
          this.showToResults.set(false);
          return of([]);
        }
        return this.tollService.searchLocations(val).pipe(catchError(() => of([])));
      })
    ).subscribe(results => {
      this.toResults.set(results);
      this.showToResults.set(results.length > 0);
    });
  }

  selectFrom(result: any) {
    this.routeForm.patchValue({ from: result.display_name }, { emitEvent: false });
    this.showFromResults.set(false);
  }

  selectTo(result: any) {
    this.routeForm.patchValue({ to: result.display_name }, { emitEvent: false });
    this.showToResults.set(false);
  }

  onSubmit(): void {
    if (this.routeForm.valid) {
      const { from, to, apiKey, fuelPrice } = this.routeForm.value;
      
      const departureTime = Math.floor(Date.now() / 1000) + 3600;

      this.tollService.calculateRoute({
        from: { address: from! },
        to: { address: to! },
        vehicle: {
          type: '5AxlesTruck',
          weight: { value: 80000, unit: 'pounds' },
          height: { value: 13.5, unit: 'feet' }
        },
        fuelOptions: {
          fuelCost: fuelPrice!,
          fuelUnit: 'gallon',
          fuelEfficiency: {
            city: 6, // Avg MPG for 5-axle
            hwy: 6,
            units: 'mpg'
          }
        },
        departure_time: departureTime
      }, apiKey).subscribe();
    }
  }

  estimatedFuelCost(distanceMeters: number | undefined): number {
    if (!distanceMeters) return 0;
    const miles = distanceMeters / 1609.34;
    const price = this.routeForm.value.fuelPrice || 4.0;
    return (miles / 6) * price;
  }

  maxTollCost(route: any): number {
    if (!route) return 0;
    if (route.costs && (route.costs.cash !== undefined || route.costs.licensePlate !== undefined)) {
       return Math.max(route.costs.cash || 0, route.costs.licensePlate || 0, route.costs.tag || 0);
    }
    
    if (!route.tolls) return 0;
    
    return route.tolls.reduce((sum: number, toll: any) => {
      const maxFee = Math.max(toll.cashCost || toll.cash || 0, toll.licensePlateCost || toll.licensePlate || 0, toll.tagCost || toll.tag || 0);
      return sum + maxFee;
    }, 0);
  }
}
