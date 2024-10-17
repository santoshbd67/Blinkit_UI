import {
  Component,
  OnInit,
  Input,
  SimpleChanges,
  AfterViewInit,
  OnChanges
} from "@angular/core";
import { ChartService } from "src/app/services/chart.service";
import { DataService } from "src/app/services/data.service";
import { UnderScoreToSpacePipe } from "../../pipes/underscoreToSpace.pipe";

@Component({
  selector: "app-chart",
  templateUrl: "./chart.component.html",
  styleUrls: ["./chart.component.scss"]
})
export class ChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() chartData: any;
  @Input() chartConfig: any;
  renderedChart: any;
  count: any[] = [];
  range: any[] = [];
  yaxis2: any[] = [];

  @Input() selectedPeriod: any;
  constructor(
    private chartService: ChartService,
    private dataService: DataService,
    private underScoreToSpacePipe: UnderScoreToSpacePipe
  ) {}

  ngOnInit() {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes.chartData && changes.chartData.currentValue) {
      // this.processChartData();

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
    if (this.chartConfig && this.chartConfig.multipleAxis) {
      if (
        this.chartConfig.multipleAxis == "true" &&
        this.chartConfig.noOfBar == "3"
      ) {
        this.getThreeBarCharts();
      } else if (
        this.chartConfig.multipleAxis == "true" &&
        this.chartConfig.noOfBar == "2"
      ) {
        this.generateMultipleAxisChart();
      } else if (
        this.chartConfig.multipleAxis == "false" &&
        this.chartConfig.noOfBar == "1"
      ) {
        this.generateSingleAxisChart();
      } else {
        this.dataService.showSuccess("No Data!", "showInfo");
      }
    }
  }

  generateSingleAxisChart() {
    let count = [];
    let range = [];
    let chartId = this.chartConfig.chartId;
    const xAxisLabel = this.chartConfig.xAxisLabel;
    const yAxisLabel1 = this.chartConfig.yAxis_1;

    if (this.chartData && this.chartData.length > 0) {
      this.chartData.forEach(eachData => {
        count.push(eachData.count.toFixed(2));
        range.push(eachData.range);
      });
    }
    let label;
    if (this.chartConfig.type === "horizontalBar") {
      label = xAxisLabel;
    } else {
      label = yAxisLabel1;
    }

    const dataArray = [
      {
        label: label,
        data: count,
        fill: false,
        borderColor: this.chartConfig.borderColor_1,
        backgroundColor: this.chartConfig.backgroundColor_1
      }
    ];
    let chartConfig = {
      id: chartId,
      type: this.chartConfig.type,
      xAxisLabel: range,
      data: dataArray,
      xLabel: xAxisLabel,
      yLabel1: yAxisLabel1
    };

    if (this.renderedChart) {
      /* destroy previously drawn charts */
      this.renderedChart.destroy();
    }
    this.renderedChart = this.chartService.getChartDetailsForSingleAxis(
      chartConfig
    );
  }

  generateMultipleAxisChart() {
    const chartId = this.chartConfig.chartId;
    const yAxisLabel1 = this.chartConfig.yAxis_1;
    const xAxisLabel = this.chartConfig.xAxisLabel;
    const yAxisLabel2 = this.chartConfig.yAxis_2;

    const xAxisTicks = [];
    const yAxis1 = [];
    const yAxis2 = [];
    if (this.chartData && this.chartData.data1.length > 0) {
      this.chartData.data1.forEach(eachData => {
        yAxis1.push(eachData.count.toFixed(2));
        xAxisTicks.push(eachData.range);
      });
    }
    if (this.chartData && this.chartData.data2.length > 0) {
      this.chartData.data2.forEach(eachData => {
        yAxis2.push(eachData.count.toFixed(2));
      });
    }
    const dataArray = [
      {
        label: yAxisLabel1,
        data: yAxis1,
        fill: false,
        borderColor: this.chartConfig.borderColor_1,
        backgroundColor: this.chartConfig.backgroundColor_1
        // yAxisID: "y-axis-1" // cannot be changed
      },
      {
        label: yAxisLabel2,
        data: yAxis2,
        fill: false,
        borderColor: this.chartConfig.borderColor_2,
        backgroundColor: this.chartConfig.backgroundColor_2
        // yAxisID: "y-axis-2" // cannot be changed
      }
    ];

    let chartConfig = {
      id: chartId,
      type: this.chartConfig.type,
      xAxisLabel: xAxisTicks,
      data: dataArray,
      xLabel: xAxisLabel,
      yLabel: this.chartConfig.yAxisLabel,
      yLabel1: yAxisLabel1,
      yLabel2: yAxisLabel2
    };

    if (this.renderedChart) {
      /* destroy previously drawn charts */
      this.renderedChart.destroy();
    }
    this.renderedChart = this.chartService.getChartDetailsWithMultipleAxis(
      chartConfig
    );
  }

  getThreeBarCharts() {
    const chartId = this.chartConfig.chartId;
    const yAxisLabel1 = this.chartConfig.yAxis_1;
    const xAxisLabel = this.chartConfig.xAxisLabel;
    const yAxisLabel2 = this.chartConfig.yAxis_2;
    const yAxisLabel3 = this.chartConfig.yAxis_3;

    const xAxisTicks = [];
    const yAxis1 = [];
    const yAxis2 = [];
    const yAxis3 = [];
    if (this.chartData && this.chartData.data1.length > 0) {
      this.chartData.data1.forEach(eachData => {
        yAxis1.push(eachData.count.toFixed(2));
        xAxisTicks.push(eachData.range);
      });
    }
    if (this.chartData && this.chartData.data2.length > 0) {
      this.chartData.data2.forEach(eachData => {
        yAxis2.push(eachData.count.toFixed(2));
      });
    }
    if (this.chartData && this.chartData.data3.length > 0) {
      this.chartData.data3.forEach(eachData => {
        yAxis3.push(eachData.count.toFixed(2));
      });
    }
    const dataArray = [
      {
        label: yAxisLabel1,
        data: yAxis1,
        fill: false,
        borderColor: this.chartConfig.borderColor_1,
        backgroundColor: this.chartConfig.backgroundColor_1
      },
      {
        label: yAxisLabel2,
        data: yAxis2,
        fill: false,
        borderColor: this.chartConfig.borderColor_2,
        backgroundColor: this.chartConfig.backgroundColor_2
      },
      {
        label: yAxisLabel3,
        data: yAxis3,
        fill: false,
        borderColor: this.chartConfig.borderColor_2,
        backgroundColor: this.chartConfig.backgroundColor_3
      }
    ];

    let chartConfig = {
      id: chartId,
      type: this.chartConfig.type,
      xAxisLabel: xAxisTicks,
      data: dataArray,
      xLabel: xAxisLabel,
      yLabel: this.chartConfig.yAxisLabel,
      yLabel1: yAxisLabel1,
      yLabel2: yAxisLabel2
    };

    if (this.renderedChart) {
      /* destroy previously drawn charts */
      this.renderedChart.destroy();
    }
    this.renderedChart = this.chartService.getChartDetailsWithMultipleAxis(
      chartConfig
    );
  }
}
