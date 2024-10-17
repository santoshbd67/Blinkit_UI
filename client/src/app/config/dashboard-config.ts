export const DashboardConfig = {
  defaultMetrics: [],
  summaries: true,
  ranges: true,
  vendorMetrics: true,
  timeLineData: true,
  timeLineOverallScoreConfidence: true,
  totalProcessed: true,
  masterDataOfSelectedPeriods: [
    {
      name: "Last 24 Hours",
      value: "LAST_24_HOURS"
    },
    {
      name: "Last 7 Days",
      value: "LAST_7_DAYS"
    },
    {
      name: "Last 14 Days",
      value: "LAST_14_DAYS"
    },
    {
      name: "Last 4 Weeks",
      value: "LAST_4_WEEKS"
    },
    {
      name: "Last 12 Months ",
      value: "LAST_12_MONTHS"
    }
  ],

  dashboardCharts: [
    {
      index: 0,
      chartId: "averageConfidenceAndSTP",
      yAxis_1: "Average Confidence%",
      xAxisLabel: "Dates",
      yAxis_2: "STP %",
      yAxisLabel: "0-100%",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "line",
      multipleAxis: "true",
      noOfBar: "2",
      suffix: "",
      chartInfo: "Average Confidence and STP"
    },
    {
      index: 1,
      chartId: "accuracyVrsInvoicesData",
      yAxis_1: " Invoices",
      xAxisLabel: "Accuracy (%)",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "bar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "%",
      chartInfo: "Field Level Accuracy"
    },
    {
      index: 2,
      chartId: "errorCountVsTotalInvoices",
      yAxis_1: " Invoices",
      xAxisLabel: " Fields manually corrected",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "bar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "",
      chartInfo: "Doc Type Level Accuracy"
    },
    {
      index: 3,
      chartId: "documentVsAverageAccuracy",
      yAxis_1: "Documents Processed",
      xAxisLabel: "Average Accuracy (%)",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "bar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "%",
      chartInfo: "Extraction Confidence"
    },
    {
      index: 4,
      chartId: "noOfDocsVsDays",
      yAxis_1: "Documents Processed",
      xAxisLabel: "Dates",
      yAxis_2: "",
      yAxisLabel: "",
      borderColor_1: "#79BA50",
      backgroundColor_1: "#79BA50",
      borderColor_2: "#52C1EE",
      backgroundColor_2: "#52C1EE",
      type: "bar",
      multipleAxis: "false",
      noOfBar: "1",
      suffix: "",
      chartInfo: "Documents Processed"
    },
  ]
};
