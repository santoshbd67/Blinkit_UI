import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgbCarouselModule } from '@ng-bootstrap/ng-bootstrap';
import { ChartNewService } from 'src/app/services/chart-new.service';
import { DataService } from 'src/app/services/data.service';
@Component({
  selector: 'app-dashboard-new-disabled-graphs',
  templateUrl: './dashboard-new-disabled-graphs.component.html',
  styleUrls: ['./dashboard-new-disabled-graphs.component.scss']
})
export class DashboardNewDisabledGraphsComponent implements OnInit {

  @Input() modalData: any = {
    Graphs: [],
    isLoading: false
  }
  @Output() closeModal = new EventEmitter<any>();
  isGraphEnable: boolean = false;
  constructor(
    public activeModal: NgbActiveModal,
    private chartService: ChartNewService,
    private dataService: DataService) { }

  ngOnInit() {
    this.isGraphEnable = false
  }

  dismissModal() {
    this.activeModal.close();
    if (this.isGraphEnable) {
      this.closeModal.emit({
        modalClose: true
      })
    }
  }

  enableGraph(innerChart) {
    const index = this.modalData.Graphs.findIndex(chart => (chart == innerChart))
    if (index >= 0) {
      this.modalData.Graphs.splice(index, 1);
      this.isGraphEnable = true
    }
    let payload = {
      chartId: innerChart.chartId,
      enabled: true,
      chartTab: innerChart.chartTab,
    }
    this.chartService.updateChartsData(payload, "enableGraph").subscribe((response) => {
      console.log(response);

      if (response && response.responseCode == 'OK' && response.result && response.result.chartId && response.result.enabled) {
        console.log(`Graph with id ${innerChart.chartId} enabled successfully`);
        if (this.modalData.Graphs.length == 0) {
          this.dataService.showInfo("No more disabled graphs found.", "No more disabled Graphs");
          this.dismissModal();
        }
      }
    }, (error) => {
      console.log("Error in getChartConfigs method");
      console.log(error);
    })
  }
}
