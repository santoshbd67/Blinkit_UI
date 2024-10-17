const config = require("../config");
const resUtil = require("../util/resUtil");
const tokenService = require("./tokenService");
const dbutil = require("../util/db");
const async = require("async");
const axios = require('axios');
const db = dbutil.getDatabase(config.mongoDBName);
const graphsCollection = db.collection("dashboard_graphs");

module.exports.getChartConfigs = (req, res) => {
    try {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.charts.getChartConfigs",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData) {
            console.log(`Entered in getChartConfigs method at ${new Date().toUTCString()}`);
        }

        let that = this;
        let filters = reqData && reqData.filter ? reqData.filter : [];
        let tabId = reqData && reqData.tabId ? reqData.tabId : "Extraction";
        let time_zone = reqData && reqData.timeZone ? reqData.timeZone : "Asia/Calcutta";

        async.waterfall([
            function (callback) {
                if (reqData.token) {
                    tokenService.validateToken(reqData.token, callback);
                } else {
                    callback(null, reqData);
                }
            },
            function (tokenRes, callback) {
                graphsCollection.find({}).toArray(function (err, graphConfigs) {
                    if (err) {
                        callback(err, null);
                        return;
                    }
                    callback(null, graphConfigs)
                });
            },
            async function (graphConfigs, callback) {
                let summaryData = {};

                try {
                    let summary = that.getSummary(tabId);
                    const chartsPath = config.chartsAPIRootPath + "populate_dashboard";
                    const payload = {
                        time_zone,
                        chart_tab: tabId.toUpperCase(),
                        list_charts: that.getEnabledChartsList(graphConfigs, tabId),
                        filters
                    }

                    console.log(`Path called for Charts API is ${chartsPath} at ${new Date().toUTCString()}`);
                    console.log(`Payload sent for Charts API is \n ${JSON.stringify(payload)} at ${new Date().toUTCString()}`);

                    const response = await axios.post(chartsPath, payload);
                    //console.log(`Received Response for charts API is:- \n ${JSON.stringify(response.data)} at ${new Date().toUTCString()}`);

                    if (response && response.data && response.data.chart_data) {
                        console.log(`Good, Chart API Response includes chart_data at ${new Date().toUTCString()}`);

                        for (let key in response.data.chart_data) {

                            let summaryIndex = summary.indexOf(key);
                            if (summaryIndex >= 0) summaryData[key] = response.data.chart_data[key];

                            let index = graphConfigs.findIndex(object => object.chartId === key)
                            if (index >= 0) graphConfigs[index].currentData = response.data.chart_data[key];
                        }

                        return (null, that.getFilteredDashboardData(graphConfigs, summaryData, tabId));
                    }
                    else {
                        console.log(`Oh, ho, Chart API Response doesn't includes chart_data at ${new Date().toUTCString()}`);
                        return (null, that.getFilteredDashboardData(graphConfigs, summaryData, tabId));
                    }
                } catch (error) {
                    console.log(`Error occured in getcharts API method at ${new Date().toUTCString()}`);
                    console.log(error);
                    return ({ status_code: 500, errmsg: error, err: "Inner function Exception" }, null)
                }
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (!result) {
                resUtil.BADREQUEST(res, apiParams, {});
            }
            resUtil.OK(res, apiParams, result);
        });
    } catch (error) {
        console.log(`Error while getChartConfigs at ${new Date().toUTCString()}`);
        console.log(error);
        resUtil.handleError(req, res, { err: "Exception occured", errmsg: error });
    }
}

module.exports.updateChartsData = (req, res) => {
    try {
        let reqData = req.body.request.updatedChartsData;
        let calledFrom = req.body.request.calledFrom;
        let token = req.body.request.token

        const apiParams = {
            id: "api.charts.updateChartsData",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.chartId) {
            console.log(`Entered in updateCharts method at ${new Date().toUTCString()} with chartId ${reqData.chartId}`);
        }
        async.waterfall([
            function (callback) {
                if (token) {
                    tokenService.validateToken(token, callback);
                } else {
                    callback(null, reqData);
                }
            },
            function (tokenRes, callback) {
                if (calledFrom && calledFrom == 'enableGraph') {
                    graphsCollection.find({ enabled: reqData.enabled, chartTab: reqData.chartTab }).toArray(function (err, enabledGraph) {
                        if (err) {
                            callback(err, null);
                            return;
                        }
                        callback(null, enabledGraph)
                    });

                } else {
                    callback(null, reqData);
                }

            },
            function (graphs, callback) {
                if (reqData && calledFrom && calledFrom == 'enableGraph' && graphs.length > 0) {
                    reqData.index = graphs.length + 1;
                }
                graphsCollection.findOneAndUpdate(
                    { chartId: reqData.chartId }, {
                    $set: reqData
                }, {
                    upsert: false,
                    returnOriginal: false
                },
                    function (err, result) {
                        if (err) {
                            console.log("Error in graphCollection findOneAndUpdate");
                            console.log(err);
                        }
                        if (!result) {
                            console.log("Result NULL in graphCollection findOneAndUpdate");
                        }
                        callback(null, reqData);
                    }
                );
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (!result) {
                resUtil.BADREQUEST(res, apiParams, {});
            }
            resUtil.OK(res, apiParams, result);
        });
    } catch (error) {
        console.log(`Error while updateCharts at ${new Date().toUTCString()}`);
        console.log(error);
        return {}
    }
}

module.exports.bulkUpdateCharts = (req, res) => {
    try {
        let reqData = req.body.request;
        let updateReqData = reqData.updatedChartsData
        const apiParams = {
            id: "api.charts.bulkUpdateCharts",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (updateReqData && updateReqData.length > 0) {
            console.log(`Entered in bulkUpdateCharts method at ${new Date().toUTCString()}`);
        }
        async.waterfall([
            function (callback) {
                if (reqData.token) {
                    tokenService.validateToken(reqData.token, callback);
                } else {
                    callback(null, updateReqData);
                }
            },
            function (tokenRes, callback) {
                (reqData && reqData.token) ? delete reqData.token : '';
                if (updateReqData && updateReqData.length > 0) {
                    let operations = [];
                    updateReqData.forEach(chart => {
                        operations.push({
                            updateOne: {
                                filter: { chartId: chart.chartId },
                                update: { $set: chart },
                                upsert: true
                            }
                        })
                    })
                    console.log('operations:-');
                    console.log(JSON.stringify(operations));
                    //callback(null, updateReqData);
                    graphsCollection.bulkWrite(operations, { upsert: true }, function (err, r) {
                        callback(err, r);
                    });
                }
                else {
                    callback(null, updateReqData);
                }
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (!result) {
                resUtil.BADREQUEST(res, apiParams, {});
            }
            resUtil.OK(res, apiParams, result);
        });
    } catch (error) {
        console.log(`Error while bulkUpdateCharts at ${new Date().toUTCString()}`);
        console.log(error);
        return {}
    }
}

module.exports.getVendorsList = (req, res) => {
    try {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.charts.getVendorsList",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData) {
            console.log(`Entered in getVendorsList method at ${new Date().toUTCString()}`);
        }

        async.waterfall([
            function (callback) {
                if (reqData.token) {
                    tokenService.validateToken(reqData.token, callback);
                } else {
                    callback(null, reqData);
                }
            },
            async function (graphConfigs, callback) {
                try {

                    const chartsPath = config.chartsAPIRootPath + "populate_dashboard" + "/get_vendors";
                    const payload = {}

                    console.log(`Path called for get_vendors API is ${chartsPath} at ${new Date().toUTCString()}`);
                    console.log(`Payload sent for get_vendors API is \n ${JSON.stringify(payload)} at ${new Date().toUTCString()}`);

                    const response = await axios.post(chartsPath, payload);
                    if (response && response.data) {
                        console.log(`Got success Response for get_vendors API at ${new Date().toUTCString()}`);
                        return (null, response.data);
                    }
                    else {
                        console.log(`get_vendors API Reponse Failed ${response} at ${new Date().toUTCString()}`);
                        return (null, { status: 500, msg: 'Unable to get_vendors Data' });
                    }

                } catch (error) {
                    console.log(`Error occured in get_vendors API method at ${new Date().toUTCString()}`);
                    console.log(error);
                    return (null, { status_code: 500, msg: error, chartsData: [] })
                }
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (!result) {
                resUtil.BADREQUEST(res, apiParams, {});
            }
            resUtil.OK(res, apiParams, result);
        });
    } catch (error) {
        console.log(`Error while get_vendors at ${new Date().toUTCString()}`);
        console.log(error);
        resUtil.handleError(req, res, { err: "Exception occured", errmsg: error });
    }
}

module.exports.getBillingStatesList = (req, res) => {
    try {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.charts.getBillingStatesList",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData) {
            console.log(`Entered in getBillingStatesList method at ${new Date().toUTCString()}`);
        }

        async.waterfall([
            function (callback) {
                if (reqData.token) {
                    tokenService.validateToken(reqData.token, callback);
                } else {
                    callback(null, reqData);
                }
            },
            async function (graphConfigs, callback) {
                try {

                    const chartsPath = config.chartsAPIRootPath + "populate_dashboard" + "/get_billing_units";
                    const payload = {}

                    console.log(`Path called for get_billing_units API is ${chartsPath} at ${new Date().toDateString()}`);
                    console.log(`Payload sent for get_billing_units API is \n ${JSON.stringify(payload)} at ${new Date().toDateString()}`);

                    const response = await axios.post(chartsPath, payload);
                    if (response && response.data) {
                        console.log(`Got success Response for get_billing_units API at ${new Date().toDateString()}`);
                        return (null, response.data);
                    }
                    else {
                        console.log(`get_billing_units API Reponse Failed ${response} at ${new Date().toDateString()}`);
                        return (null, { status: 500, msg: 'Unable to get_billing_units Data' });
                    }

                } catch (error) {
                    console.log(`Error occured in get_billing_units API method at ${new Date().toDateString()}`);
                    console.log(error);
                    return (null, { status_code: 500, msg: error, chartsData: [] })
                }
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (!result) {
                resUtil.BADREQUEST(res, apiParams, {});
            }
            resUtil.OK(res, apiParams, result);
        });
    } catch (error) {
        console.log(`Error while get_billing_units at ${new Date().toDateString()}`);
        console.log(error);
        resUtil.handleError(req, res, { err: "Exception occured", errmsg: error });
    }
}

module.exports.getChartsData = (req, res) => {
    try {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.charts.getChartsData",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.chartId) {
            console.log(`Entered in getCharts method at ${new Date().toUTCString()} with chartId ${reqData.chartId}`);
        }

        let chartData;
        switch (reqData.type) {
            case 'line':
                chartData = {
                    labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                    datasets: [
                        {
                            label: 'Total Document Count',
                            data: [220, 160, 120, 200, 300, 125, 323, 345, 190, 155],
                            borderWidth: 1,
                            backgroundColor: 'rgba(232, 218, 239, 0.8)',
                            borderColor: '#7D3C98'
                        },
                        {
                            label: 'Review Completed Documents',
                            data: [120, 120, 80, 190, 110, 100, 200, 231, 150, 120],
                            borderWidth: 1,
                            backgroundColor: 'rgba(236, 112, 99,0.8)',
                            borderColor: '#D4AC0D'
                        }
                    ]
                }
                break;
            case 'bar':
                chartData = {
                    labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                    datasets: [
                        {
                            label: 'Document Count by Hour',
                            data: [22, 16, 12, 2, 0, 8, 3, 3, 2, 6, 25, 29, 47, 44, 32, 23, 14, 22, 21, 25, 14, 8, 6, 6],
                            borderWidth: 1,
                            backgroundColor: 'rgba(232, 218, 239, 0.8)',
                            borderColor: '#7D3C98'
                        },
                        {
                            label: 'Months Set 2',
                            data: [2, 1, 10, 12, 10, 18, 13, 13, 12, 16, 5, 9, 7, 4, 2, 3, 4, 12, 1, 5, 4, 18, 16, 16],
                            borderWidth: 1,
                            backgroundColor: 'rgba(232, 218, 239,0.8)',
                            borderColor: '#D4AC0D'
                        }
                    ]
                }
                break;
            case 'bubble':
                chartData = {
                    datasets: [
                        {
                            label: 'Accuracy and Document Count',
                            data: [{ x: 1, y: 234, r: 8.5 },
                            { x: 2, y: 421, r: 19.5 },
                            { x: 3, y: 456, r: 12.8 },
                            { x: 4, y: 523, r: 25 }],
                            borderWidth: 1,
                            backgroundColor: 'rgba(240, 178, 122, 0.8)',
                            borderColor: '#7D3C98'
                        }
                    ]
                }
                break;
            case 'scatter':
                chartData = {
                    datasets: [
                        {
                            label: 'Accuracy',
                            data: [{ x: 1, y: 85 },
                            { x: 2, y: 92.5 },
                            { x: 3, y: 87 },
                            { x: 4, y: 78.9 }],
                            borderWidth: 1,
                            backgroundColor: 'rgba(218, 247, 166, 0.8)',
                            borderColor: '#7D3C98'
                        }
                    ]
                }
                break;
            case 'pie':
                chartData = {
                    labels: ['Review', 'Deleted', 'Review Completed'],
                    datasets: [{
                        label: 'My First Dataset',
                        data: [300, 50, 100],
                        backgroundColor: [
                            'rgb(255, 99, 132,0.6)',
                            'rgb(54, 162, 235,0.6)',
                            'rgb(255, 205, 86,0.6)'
                        ]
                    }]
                }
                break;
            case 'doughnut':
                chartData = {
                    labels: ['Review', 'Deleted', 'Review Completed'],
                    datasets: [
                        {
                            label: 'My First Dataset',
                            data: [300, 50, 100],
                            backgroundColor: [
                                'rgb(255, 99, 132,0.6)',
                                'rgb(54, 162, 235,0.6)',
                                'rgb(255, 205, 86,0.6)'
                            ]
                        }
                    ]
                }
                break;
            case 'polarArea':
                chartData = {
                    labels: ['Review', 'Deleted', 'Review Completed'],
                    datasets: [
                        {
                            label: 'My First Dataset',
                            data: [300, 50, 100],
                            backgroundColor: [
                                'rgb(255, 99, 132,0.6)',
                                'rgb(54, 162, 235,0.6)',
                                'rgb(255, 205, 86,0.6)'
                            ]
                        }
                    ]
                }
                break;
            default:
                break;
        }
        resUtil.OK(res, apiParams, chartData);
        return;
    } catch (error) {
        console.log(`Error while getCharts at ${new Date().toUTCString()}`);
        console.log(error);
        return {}
    }
}

module.exports.getFilteredDashboardData = (graphConfigs, summaryData, tabId) => {
    graphConfigs = graphConfigs.filter((config) => {
        return config.chartTab.toLowerCase() === tabId.toLowerCase();
    })

    let dashboardData = {
        summaryData: summaryData,
        graphConfigs: graphConfigs
    };

    return dashboardData;
}

module.exports.getSummary = (tabId) => {
    let summary = [];
    switch (tabId.toLowerCase()) {
        case 'extraction':
            summary = ["extraction_current_summary", "extraction_forever_summary"]
            break;
        case 'posting':
            summary = ["posting_current_summary", "posting_forever_summary"]
            break;
        default:
            break;
    }

    return summary;
}

module.exports.getEnabledChartsList = (graphConfigs, tabId) => {
    let enabledChartsList = [];

    graphConfigs.forEach(element => {
        if (element.enabled && element.chartTab.toLowerCase() == tabId.toLowerCase()) {
            enabledChartsList.push(element.chartId)
        }
    });

    let summary = this.getSummary(tabId);

    summary.forEach(summaryObj => {
        enabledChartsList.push(summaryObj)
    });

    return enabledChartsList;
}