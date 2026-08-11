// backoffice/admin/dashboard/dashboard.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { DashboardStats } from '../../../core/models/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private service = inject(CatalogueAdminService);
  stats: DashboardStats | null = null;

  ngOnInit(): void {
    this.service.getStats().subscribe({ next: (s) => (this.stats = s) });
  }
}
