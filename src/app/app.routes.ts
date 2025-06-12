import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CultiveComponent } from './components/cultive/cultive.component';
import { ComercialComponent } from './components/comercial/comercial.component';
import { UsersComponent } from './components/users/users.component';
import { CultivePlanningComponent } from './components/cultive-planning/cultive-planning.component';
import { RolesComponent } from './components/roles/roles.component';
import { ComercialPlanningComponent } from './components/comercial-planning/comercial-planning.component';
import { CultiveDetailsComponent } from './components/cultive-details/cultive-details.component';
import { CultiveMapComponent } from './components/cultive-map/cultive-map.component';
import { RankingComponent } from './components/ranking/ranking.component';
import { StockComponent } from './components/stock/stock.component';
import { StockDetailsComponent } from './components/stock-details/stock-details.component';
import { ChangelogComponent } from './components/changelog/changelog.component';
import { VariablesGlobalesComponent } from './components/variables-globales/variables-globales.component';


export const routes: Routes = [
  // Redirige la raíz al login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Ruta para el login (sin layout)
  { path: 'login', component: LoginComponent },

  // Rutas protegidas que usan un layout común
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'cultive', component: CultiveComponent },
      { path: 'comercial', component: ComercialComponent },
      { path: 'users', component: UsersComponent },
      { path: 'cultive-planning', component: CultivePlanningComponent },
      { path: 'roles', component: RolesComponent },
      { path: 'cultive/:id', component: CultiveDetailsComponent },
      { path: 'comercial-planning', component: ComercialPlanningComponent },
      { path: 'cultive-map', component: CultiveMapComponent },
      { path: 'cultive-ranking', component: RankingComponent },
      { path: 'stock', component: StockComponent },
      { path: 'stock-details/:id', component: StockDetailsComponent },
      { path: 'changelog', component: ChangelogComponent },
      {path:'variables',component:VariablesGlobalesComponent},
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

    ]
  },

  // Ruta comodín redirige a login
  { path: '**', redirectTo: 'login' }
];