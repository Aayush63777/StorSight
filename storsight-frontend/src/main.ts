import { bootstrapApplication } from '@angular/platform-browser';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

injectSpeedInsights({ framework: 'angular' });

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
