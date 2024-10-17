import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ChartNewService } from 'src/app/services/chart-new.service';
import { DashboardNewConfig } from './../../config/dashboard-new-config';

@Component({
  selector: 'app-chart-new',
  templateUrl: './chart-new.component.html',
  styleUrls: ['./chart-new.component.scss']
})
export class ChartNewComponent implements OnInit {
  @Input() chartData: any;
  @Input() chartConfig: any;
  @Input() selectedPeriod: any;
  renderedChart: any;
  count: any[] = [];
  range: any[] = [];
  yaxis2: any[] = [];
  dashboardConfig = DashboardNewConfig

  constructor(private chartService: ChartNewService) { }

  ngOnInit() {
    this.registerChartComponents();
  }

  registerChartComponents() {
    //Chart.register(Colors);
    //Chart.plugins.register(Colors);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes.chartData && changes.chartData.currentValue) {
      /* Check if the canvas is ready. If not ngViewInit will take care of the chart.  */
      if (document.getElementById(this.chartConfig.chartId)) {
        this.generateDashboardChartsData();
      }
    }
  }

  ngAfterViewInit(): void {
    this.generateDashboardChartsData();
  }

  generateDashboardChartsData() {

    if (this.chartConfig) {
      switch (this.chartConfig.type) {
        case 'line':
        case 'bar':
        case 'bubble':
        case 'scatter': this.generateSingleAxisChart();
          break;
        case 'pie':
        case 'doughnut':
        case 'polarArea': this.generatePieChart();
          break;
        default:
          break;
      }
    }
  }

  generateSingleAxisChart() {
    const { chartId, xAxisLabel, yAxisLabel, type, name } = this.chartConfig;
    const chartData = this.chartConfig.currentData ? this.chartConfig.currentData : this.chartConfig.defaultData;//response.result;

    let chartConfig = {
      id: chartId,
      type: type,
      data: chartData,
      name: name,
      xLabel: xAxisLabel,
      yLabel: yAxisLabel
    };

    if (this.chartConfig.rescale) {
      chartConfig["rescale"] = this.chartConfig.rescale;
    }

    this.destroyChart();
    this.renderedChart = this.chartService.getChartDetailsForSingleAxis(chartConfig);
  }

  generatePieChart() {
    const { chartId, type, name } = this.chartConfig;
    const chartData = this.chartConfig.currentData ? this.chartConfig.currentData : this.chartConfig.defaultData;//response.result;

    let chartConfig = {
      id: chartId,
      type: type,
      data: chartData,
      name: name
    };

    this.destroyChart();
    this.renderedChart = this.chartService.getPieChart(chartConfig);
  }

  destroyChart() {
    /* destroy previously drawn charts */
    if (this.renderedChart) {
      this.renderedChart.destroy();
    }
  }
}
