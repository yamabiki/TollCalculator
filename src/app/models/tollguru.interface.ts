export interface TollGuruRequest {
  from: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  to: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  vehicle: VehicleParameters;
  departure_time?: number; // Epoch timestamp
  fuelOptions?: FuelOptions;
}

export interface FuelOptions {
  fuelCost: number;
  fuelUnit: string;
  fuelEfficiency: {
    city: number;
    hwy: number;
    units: string;
  };
}

export interface VehicleParameters {
  type: string;          // e.g., '5AxlesTruck'
  weight: {
    value: number;       // e.g., 80000
    unit: string;        // 'pounds' or 'kg'
  };
  height: {
    value: number;       // e.g., 13.5
    unit: string;        // 'feet' or 'meters'
  };
}

export interface TollGuruResponse {
  routes: Route[];
  summary?: {
    share: any;
  };
}

export interface Route {
  summary: TollSummary;
  costs?: {
    fuel?: number;
    tag?: number;
    cash?: number;
    licensePlate?: number;
  };
  tolls: Toll[];
  polyline: string; 
}

export interface TollSummary {
  hasTolls: boolean;
  distance: { // Note: v2 uses "distance" instead of "distances"
    text: string;
    metric?: string;
    imperial?: string;
    value: number;
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  departure_time?: number;
  arrival_time?: number;
}

export interface Toll {
  lat: number;
  lng: number;
  name: string;
  type: string;
  tagCost: number;
  cashCost: number;
  licensePlateCost: number;
}
