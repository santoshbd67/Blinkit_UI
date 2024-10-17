import {
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges
} from "@angular/core";
import { ChartService } from "src/app/services/chart.service";

@Component({
  selector: "app-uploads-overview",
  templateUrl: "./uploads-overview.component.html",
  styleUrls: ["./uploads-overview.component.scss"]
})
export class UploadsOverviewComponent implements OnInit {
  applyHover: boolean = false;
  chart: any;
  @Input() dashboardSummary: any;
  constructor(private chartService: ChartService) {}

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes &&
      changes.dashboardSummary &&
      changes.dashboardSummary.currentValue
    ) {
      // this.generateProcessingChart();
    }
  }

  generateProcessingChart() {
    let chartId = "processingChart";

    let chartData = {
      datasets: [
        {
          data: [
            this.dashboardSummary.totalDocumentsProcessed,
            this.dashboardSummary.failedDocumentsCount
          ],
          backgroundColor: ["#0db40d", "#fc9220"]
        }
      ],
      labels: ["Documents Processed", "Documents Failed"]
    };

    let chartConfig = {
      id: chartId,
      type: "pie",
      data: chartData,
      options: {
        legend: {
          display: false
        }
      }
    };
    if(this.chart) {
      this.chart.destroy();
    }

    this.chart = this.chartService.getPieChart(chartConfig);
  }

  overMe(event) {
    this.applyHover = true;
  }
  outMe(event) {
    this.applyHover = false;
  }
}
