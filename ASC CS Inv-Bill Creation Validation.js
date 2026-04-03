/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
var NS_SL_SCRIPT_ID = 'customscript_asc_invbii_creation_screen';
var NS_SL_DEPLOY_ID = 'customdeploy_asc_invbii_creation_screen';
define(['N/search', 'N/currentRecord', 'N/url', 'N/ui/message', 'N/log', 'N/https'], function (search, currentRecord, url, message, log, https) {

    function fieldChanged(context) {
        try {
            var fieldId = context.fieldId;
            var recordObject = context.currentRecord;
            if (fieldId == 'custpage_subsidiary') {
                var subsidiary = recordObject.getValue('custpage_subsidiary')
                var param = { custpage_subsidiarySelected: subsidiary };
                var suiteletURL = url.resolveScript({
                    scriptId: NS_SL_SCRIPT_ID,
                    deploymentId: NS_SL_DEPLOY_ID,
                    params: param
                });
                window.onbeforeunload = null;
                document.location = suiteletURL;
            }
            if (fieldId == 'custpage_project') {
                var subsidiary = recordObject.getValue('custpage_subsidiary');
                var from_project = recordObject.getValue('custpage_project');
                //  var vendor = recordObject.getValue('custpage_vendor');
                var param = {
                    custpage_project: from_project,
                    // custpage_vendorSelected: vendor,
                    custpage_subsidiarySelected: subsidiary
                };
                var suiteletURL = url.resolveScript({
                    scriptId: NS_SL_SCRIPT_ID,
                    deploymentId: NS_SL_DEPLOY_ID,
                    params: param
                });
                window.onbeforeunload = null;
                document.location = suiteletURL;
            }
            if (fieldId == 'custpage_fromdate') {
                var projectId = ''
                var startDate = recordObject.getValue('custpage_fromdate');
                var endDate = recordObject.getValue('custpage_todate');
                var subsidiary = recordObject.getValue('custpage_subsidiary');
                var project = recordObject.getValue('custpage_project');

                if (startDate && endDate) {
                    var timeBillInformation = searchHoursWithRate(project, startDate, endDate, subsidiary)
                    console.log("totalHours " + timeBillInformation);
                    if (timeBillInformation) {
                        recordObject.setValue('custpage_totalhours', timeBillInformation.totalHours);
                        let invAmount = timeBillInformation.totalHours * timeBillInformation.payRate;

                        recordObject.setValue('custpage_totalinvamount', invAmount);
                        let billAmount = timeBillInformation.totalHours * timeBillInformation.billRate;

                        recordObject.setValue('custpage_totalbillamount', billAmount);

                    }
                    else {
                        recordObject.setValue('custpage_totalhours', 0);
                        recordObject.setValue('custpage_totalinvamount', 0);
                        recordObject.setValue('custpage_totalbillamount', 0);

                    }
                }
            }
            if (fieldId == 'custpage_todate') {
                var startDate = recordObject.getValue('custpage_fromdate');
                var endDate = recordObject.getValue('custpage_todate');
                var project = recordObject.getValue('custpage_project');

                if (startDate && endDate) {
                    var timeBillInformation = searchHoursWithRate(project, startDate, endDate, subsidiary)
                    console.log("totalHours " + timeBillInformation);

                    if (timeBillInformation) {
                        recordObject.setValue('custpage_totalhours', timeBillInformation.totalHours);
                        let invAmount = timeBillInformation.totalHours * timeBillInformation.billRate;
                        recordObject.setValue('custpage_totalinvamount', invAmount);
                        let billAmount = timeBillInformation.totalHours * timeBillInformation.payRate;
                        recordObject.setValue('custpage_totalbillamount', billAmount);

                    }
                    else {
                        recordObject.setValue('custpage_totalhours', 0);
                        recordObject.setValue('custpage_totalinvamount', 0);
                        recordObject.setValue('custpage_totalbillamount', 0);

                    }
                }



                // var suiteletURL = url.resolveScript({
                //     scriptId: NS_SL_SCRIPT_ID,
                //     deploymentId: NS_SL_DEPLOY_ID,
                //     params: {stdate: startDate, enddate: endDate}
                // });

                // window.onbeforeunload = null;
                // document.location = suiteletURL;

                // var subsidiary = recordObject.getValue('custpage_subsidiary');  
                // if(startDate && endDate)
                // {
                //   // alert("inside condition")
                //     var totalHours = searchHourstobill(project, startDate, endDate, subsidiary);
                //     var totalHourstoBill = searchHoursWithRate(project,startDate,endDate, subsidiary)
                //     alert("totalHours bill "+totalHourstoBill);
                //     alert("totalHours invoice "+totalHours);
                //     if(totalHourstoBill)
                //     {
                //         recordObject.setValue('custpage_totalhours',totalHourstoBill);
                //     }
                //     else
                //     {
                //         recordObject.setValue('custpage_totalhours',0);
                //     }                  
                // }               
            }
        }
        catch (error) {
            alert(JSON.stringify(error));
        }
    }
    function submit(context) {
        try {
            var recordObject = currentRecord.get();
            var hours = recordObject.getValue('custpage_totalhours');
            var isInvoice = recordObject.getValue('create_invoice');
            var isBill = recordObject.getValue('create_vendorbill');

            console.log(`isInvoice : ${isInvoice} || isBill : ${isBill}`);

            let isCreate = isBill ? isBill : false;
            if (!isCreate) isCreate = isInvoice ? isInvoice : false;

            console.log("is create: " + isCreate);

            if (hours <= 0) {
                alert("You Don't have hours to bill for the selected project ");
                return false;
            } else if (!isCreate) {
                alert("Select any one (Invoice or Bill) transaction to create");
                return false;
            } else {
                var dataObj = {
                    createInvoice: isInvoice,
                    createBill: isBill,
                    subsidiary: recordObject.getValue('custpage_subsidiary'),
                    docDate: formatDate(recordObject.getValue('custpage_documentdate')),
                    project: recordObject.getValue('custpage_project'),
                    fromDate: formatDate(recordObject.getValue('custpage_fromdate')),
                    toDate: formatDate(recordObject.getValue('custpage_todate')),
                    invAmount: recordObject.getValue('custpage_totalinvamount'),
                    billAmount: recordObject.getValue('custpage_totalbillamount')
                };

                var headersObj = {};
                headersObj['Content-Type'] = 'application/json';
                var executeSuiteletURL = url.resolveScript({
                    scriptId: NS_SL_SCRIPT_ID,
                    deploymentId: NS_SL_DEPLOY_ID,
                    returnExternalUrl: false
                });
                var responseObj = https.post({
                    body: dataObj,//JSON.stringify(dataObj),
                    url: executeSuiteletURL,
                    // headers: headersObj
                });

                debugger;
                const body = JSON.parse(responseObj.body);
                console.log("response",body);

                let information = '';
                if(body.count != 0){
                    information = 'No date found for: '+body.noData;
                }

                window.onbeforeunload = null;
                var messageDetails = "";
                messageDetails += "your request is being processes Please wait.";

                var msg = message.create({
                    title: 'CONFIRMATION',
                    message: messageDetails,
                    type: message.Type.CONFIRMATION
                });

                msg.show();

                if(information){
                    var infoMsg = message.create({
                        title: 'INFORMATION',
                        message: information,
                        type: message.Type.INFORMATION
                    });
    
                    infoMsg.show();
                }

                var suiteletURL = url.resolveScript({
                    scriptId: NS_SL_SCRIPT_ID,
                    deploymentId: NS_SL_DEPLOY_ID
                });
                setTimeout(function () {
                    msg.hide();
                    if(information) infoMsg.hide();
                    document.location = suiteletURL
                }, 10000);
            }
        }
        catch (error) {
            log.debug('Error in submit', error)
        }
    }

    function searchHourstobill(project, fdate, tdate, subsidiary) {
        debugger;
        try {

            var sDate = formatDate(fdate)
            var eDate = formatDate(tdate)
            //alert(subsidiary);
            //alert('project '+project+ 'startDate ' +sDate+ 'endDate ' +eDate )
            var hours = '';
            var filters = [
                ["customer", "anyof", project], "AND",
                ["status", "is", "T"], "AND",
                ["date", "within", sDate, eDate], "AND",
                ["custcol_asc_timesheet_status", "anyof", "2", "1"]
            ];
            if (subsidiary != "5") {
                filters.push("AND", ["custcol_clb_weekendingdate", "isnotempty", ""]);
            }
            // alert(JSON.stringify(filters));
            var timebillSearchObj = search.create({
                type: "timebill",
                filters: filters,
                columns: [
                    search.createColumn({ name: "durationdecimal", summary: "SUM", sort: search.Sort.ASC, label: "Duration (Decimal)" })
                ]
            });
            var searchResultCount = timebillSearchObj.runPaged().count;
            // log.debug("timebillSearchObj result count",searchResultCount);
            //alert("searchResultCount : "+searchResultCount)
            if (searchResultCount > 0) {
                timebillSearchObj.run().each(function (result) {
                    //alert("result : "+JSON.stringify(result));
                    hours = result.getValue({ name: "durationdecimal", summary: "SUM", sort: search.Sort.ASC, label: "Duration (Decimal)" });
                    return true;
                });
            }
            return hours
        }
        catch (ex) {
            log.error({ title: "Title Get Hours", details: ex });
        }
    }

    function searchHoursWithRate(project, fdate, tdate, subsidiary) {
        try {

            var sDate = formatDate(fdate)
            var eDate = formatDate(tdate)
            //alert(subsidiary);
            // alert('project '+project+ 'startDate ' +sDate+ 'endDate ' +eDate )
            var hours = '';
            var filters = [
                ["date", "within", sDate, eDate],"AND",
                ["customer", "anyof", project],"AND",
                ["approvalstatus", "anyof", "3"],"AND",
                ["type", "anyof", "A"],"AND",
                ["custcol_clb_vendor_bill_link", "anyof", "@NONE@"],"AND",
                ["custcol_clb_invoice", "anyof", "@NONE@"]
            ];
            // alert(JSON.stringify(filters));
            var timebillSearchObj = search.create({
                type: "timebill",
                filters: filters,
                columns: [
                    search.createColumn({
                        name: "durationdecimal",
                        summary: "SUM",
                        label: "Duration (Decimal)"
                    }),
                    search.createColumn({
                        name: "custcol_asc_payrete",
                        summary: "GROUP",
                        label: "Pay Rate"
                    }),
                    search.createColumn({
                        name: "custcol_clb_billrate",
                        summary: "GROUP",
                        label: "Bill Rate"
                    })
                ]
            });

            var billInfo = {
                totalHours: 0,
                payRate: 0,
                billRate: 0
            };
            var searchResultCount = timebillSearchObj.runPaged().count;
            // log.debug("timebillSearchObj result count",searchResultCount);
            //  alert("searchResultCount : "+searchResultCount)
            if (searchResultCount > 0) {
                timebillSearchObj.run().each(function (result) {
                    //alert("result : "+JSON.stringify(result));
                    let empHours = result.getValue({
                        name: "durationdecimal",
                        summary: "SUM",
                        label: "Duration (Decimal)"
                    });
                    let empPayRate = result.getValue({
                        name: "custcol_asc_payrete",
                        summary: "GROUP",
                        label: "Pay Rate"
                    });
                    let empBillRate = result.getValue({
                        name: "custcol_clb_billrate",
                        summary: "GROUP",
                        label: "Bill Rate"
                    });

                    billInfo.totalHours += parseInt(empHours);
                    billInfo.payRate += parseInt(empPayRate);
                    billInfo.billRate += parseInt(empBillRate);

                    return true;
                });
            }
            return billInfo;
        }
        catch (ex) {
            log.error({ title: "Title Get Hours", details: ex });
        }
    }
    function formatDate(str) {
        var date = new Date(str),
            mnth = ("0" + (date.getMonth() + 1)).slice(-2),
            day = ("0" + date.getDate()).slice(-2);
        return [mnth, day, date.getFullYear()].join("/");
    }
    return {
        fieldChanged: fieldChanged,
        submit: submit
    };
});