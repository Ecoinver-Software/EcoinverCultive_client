import { Component, Input, type OnInit, ViewChild, type AfterViewInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { MatTableModule, MatTableDataSource } from "@angular/material/table"
import { MatSortModule, MatSort } from "@angular/material/sort"
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator"
import { MatCheckboxModule } from "@angular/material/checkbox"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatInputModule } from "@angular/material/input"
import { MatSelectModule } from "@angular/material/select"
import { MatExpansionModule } from "@angular/material/expansion"
import { MatChipsModule } from "@angular/material/chips"
import { MatTooltipModule } from "@angular/material/tooltip"
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"
import { SelectionModel } from "@angular/cdk/collections"

export interface ColumnConfig {
  key: string
  label: string
  type: "text" | "number" | "date" | "boolean"
  sortable?: boolean
  filterable?: boolean
  groupable?: boolean
}

export interface GroupedData {
  groupKey: string
  groupValue: any
  items: any[]
  expanded: boolean
}

@Component({
  selector: "app-comercial-grouped",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./comercial-grouped.component.html",
  styleUrls: ["./comercial-grouped.component.css"],
})
export class ComercialGroupedComponent {
 
  
}
