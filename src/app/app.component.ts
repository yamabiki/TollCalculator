import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MapComponent, SidebarComponent],
  template: `
    <div class="app-layout">
      <aside class="app-sidebar">
        <app-sidebar></app-sidebar>
      </aside>
      <main class="app-main">
        <app-map></app-map>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: grid;
      grid-template-columns: 400px 1fr;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: #0f172a; /* Slate 900 */
    }

    .app-sidebar {
      height: 100%;
      z-index: 10;
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
    }

    .app-main {
      position: relative;
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
      background: linear-gradient(135deg, #1e1e2f, #151522);
    }
    
    @media (max-width: 768px) {
      .app-layout {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }
      .app-sidebar {
        height: auto;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
        z-index: 1000; /* Must be above leaflet */
      }
    }
  `]
})
export class AppComponent { }
