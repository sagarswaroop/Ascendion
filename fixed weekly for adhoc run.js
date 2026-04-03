    /**
    ** @NApiVersion 2.1
    ** @NScriptType MapReduceScript
    ** @NModuleScope SameAccount
    *
    ** @libraries used:
                        
    
    -- Date--      -- Modified By--      --Requested By--     --Description
    DD-MM-YYYY        Employee Name         Client Name           One line description
    
    */
    define(['N/search', 'N/record', 'N/runtime', 'N/query', 'N/format', "./Projects/Library/Project Library.js", "N/file"],
        function (search, record, runtime, query, format, lib, file) {
            function getInputData() {
                try {
                    log.audit('getInputData', 'Start');
                    var scriptObj = runtime.getCurrentScript();
                    var deploymentID = scriptObj.deploymentId;
                  
                        //var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle, job.custentity_clb_projecttypeforinvoicing,resVend.id, resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_newapbased IN (4)) AND (resVend.custrecord_clb_msng_vb_dates IS NULL) AND (job.id IN (52709,53132,53132,53132,53137,53138,53138,53138,53138,53138,53139,53139,53140,53140,53140,53141,53141,53141,53147,53147,53392,53392,53392,53414,53414,53414,53414,53431,53686,53686,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,53697,54064,54076,54085,54085,54086,54086,54086,54086,54086,54133,54133,54133,54264,60771,60772,54308,54328,54328,60777,54461,54475,54475,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54487,54499,54521,54528,54528,54528,54528,54528,54528,54533,54545,54548,54548,54548,54551,54557,60781,54684,54684,54685,54685,54700,54703,54708,54721,54721,54721,54721,54721,54721,54721,54722,54722,54722,54722,54722,54723,54729,54745,54748,54753,54753,54753,54753,54753,54753,54757,54757,54967,54977,54977,54977,54988,54988,54988,54991,54993,54993,54993,54995,55005,55005,55012,55031,55033,55033,55036,55045,55050,55050,54487,54753,55026,54727,54753,54753,54528,54988,53697,54753,54487,52662)) AND (job.custentity_clb_lastday = '7' )";
                        // var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource,resVend.custrecord_clb_workflowid, job.ID, job.custentity_clb_bilcycle, job.custentity_clb_projecttypeforinvoicing,resVend.id, resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_newapbased IN (4)) AND (job.id IN (52662,52667,52709,53133,53137,53138,53139,53140,53141,53145,53147,53384,53431,53436,53446,53458,53664,53689,53697,53705,54064,54076,54085,54086,54133,54136,54266,54294,54306,54328,54360,54461,54475,54487,54519,54520,54528,54533,54545,54548,54554,54555,54661,54662,54663,54668,54672,54680,54685,54686,54692,54694,54700,54701,54703,54708,54717,54718,54719,54721,54722,54729,54734,54742,54744,54745,54746,54748,54751,54752,54753,54757,54962,54963,54964,54965,54967,54968,54972,54977,54978,54981,54988,54990,54991,54992,54994,54996,54997,54998,54999,55007,55010,55013,55020,55025,55026,55028,55031,55033,55034,55036,55041,55042,55043,55045,55047,55050,55052,55056,55060,55264,55265,60772,60776,60780,60781,66487,68787,71988,82895,92496,175510,215712,259032,260536,299256)) AND (job.custentity_clb_lastday = '7')"; //AND (resVend.custrecord_clb_msng_vb_dates IS NOT NULL)
                        //var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource,resVend.custrecord_clb_workflowid, job.ID,job.custentity_clb_bilcycle,job.custentity_clb_projecttypeforinvoicing,resVend.id,resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus,resAlloc.custevent_actual_startdate,resAlloc.endDate FROM job AS job INNER JOIN customrecord_clb_subconvendor AS resVend ON job.ID = resVend.custrecord_clb_subcon_project INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project WHERE job.custentity_clb_projecttypeforinvoicing IN (5) AND resVend.custrecord_clb_subconresource IS NOT NULL AND resVend.custrecord_clb_newapbased IN (4) AND resVend.custrecord_clb_workflowid = resAlloc.custevent_clb_prjct_workl_tsk_id AND (resVend.custrecord_clb_msng_vb_dates IS  NULL) AND (job.custentity_clb_lastday = '7' ) AND (resVend.ID IN (12275))";// (resVend.custrecord_clb_originalenddate >='07/31/2024') AND (resAlloc.endDate >='07/31/2024')";
                        var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource,resVend.custrecord_clb_workflowid, job.ID,job.custentity_clb_bilcycle,job.custentity_clb_projecttypeforinvoicing,resVend.id,resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus,resAlloc.startdate,resAlloc.endDate FROM job AS job INNER JOIN customrecord_clb_subconvendor AS resVend ON job.ID = resVend.custrecord_clb_subcon_project INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project WHERE job.custentity_clb_projecttypeforinvoicing IN (5) AND resVend.custrecord_clb_subconresource IS NOT NULL AND resVend.custrecord_clb_newapbased IN (4) AND resVend.custrecord_clb_workflowid = resAlloc.custevent_clb_prjct_workl_tsk_id AND (resVend.custrecord_clb_vendor NOT IN (67134,67145,67150,67151,67901,103726,88844,90555,103455,103419,103454,88792,103453,103452)) AND (resVend.custrecord_clb_originalenddate > '01/27/2025') AND resVend.custrecord_clb_vendor IN (83128)" //AND  (job.ID IN(75869)) AND (resAlloc.enddate > '12/31/2024')";
                        //add project id criteria - AND job.id IN (internal id seperated by comma for eg 1234555,123455)
                        //add project weekending criteria - AND AND (job.custentity_clb_lastday = '5' ) if weekending day is friday(internal id of weekending day from UI)

                        log.debug("getInputData : queryStr ", queryStr)
                        var results = query.runSuiteQL({ query: queryStr });
                        var projectDetails = results.asMappedResults();
                        log.debug("project found: ", projectDetails.length);
                        // log.debug("projectDetails",projectDetails);
                        

                        if (projectDetails.length > 0) {
                            var projObj = {};

                            for (var ii = 0; ii < projectDetails.length; ii++) {

                                // log.debug("length",ii);
                                var projectId = projectDetails[ii].id;

                                var dateString = projectDetails[ii].custrecord_clb_msng_vb_dates;
                                var dateArray = [];
                                if (dateString) {
                                    dateArray = dateString.split(",");
                                }
                                var startDate, endDate;
                                //  startDate = '03/31/2024'; //for saturday weekending
                                //  endDate = '4/06/2024';
                              //need to ask weather we need resource allocation rtart date od resource vendor start date
                                startDate = '01/20/2025'; //for sunday weekending start day is monday end day is  sunday
                                endDate = '01/26/2025';
                                var weeks = 7; //how many weeks needs to be processed
                                var dataArray = [];
                                for (var innerindex = 0; innerindex < weeks; innerindex++) {
                                    //   log.debug("length of week",innerindex);
                                    var values = {};
                                    startDate = new Date(startDate);
                                    startDate.setDate(startDate.getDate() + 7);
                                    var nsfromDt = ('0' + (startDate.getMonth() + 1)).slice(-2) + '/'
                                        + ('0' + (startDate.getDate())).slice(-2) + '/'
                                        + startDate.getFullYear();

                                    endDate = new Date(endDate);
                                    endDate.setDate(endDate.getDate() + 7);
                                    var nstodate = ('0' + (endDate.getMonth() + 1)).slice(-2) + '/'
                                        + ('0' + (endDate.getDate())).slice(-2) + '/'
                                        + endDate.getFullYear();
                                // log.debug("startDate:endDate",nsfromDt + " : "+nstodate)
                                    // if (dateArray[i]) {
                                    values["id"] = projectId;
                                    values["id_0"] = projectDetails[ii].id_0;
                                    //var tempDate = dateArray[i].split(":");
                                    //  startDate = tempDate[0];
                                    // endDate = tempDate[1];

                                    log.debug("startDate:endDate",startDate + " : "+endDate)
                                    values["custrecord_clb_originalstartdate"] = projectDetails[ii].custrecord_clb_originalstartdate;
                                    values["custrecord_clb_originalenddate"] = projectDetails[ii].custrecord_clb_originalenddate;
                                    values["custrecord_clb_workflowid"] = projectDetails[ii].custrecord_clb_workflowid;
                                    values["startdate"] = projectDetails[ii].startdate;
                                    values["enddate"] = projectDetails[ii].enddate;
                                    values["custrecord_bln_strt_dte"] = nsfromDt;
                                    values["custrecord_blng_end_dte"] = nstodate;
                                    values["custrecord_clb_msng_vb_dates"] = dateString;
                                    values["custrecord_clb_vendor"] = projectDetails[ii].custrecord_clb_vendor;
                                    values["custrecord_clb_subcon_terms"] = projectDetails[ii].custrecord_clb_subcon_terms;
                                    values["custrecord_clb_newapbased"] = projectDetails[ii].custrecord_clb_newapbased;
                                    values["custrecord_clb_paymode"] = projectDetails[ii].custrecord_clb_paymode;
                                    values["custrecord_clb_subconresource"] = projectDetails[ii].custrecord_clb_subconresource;
                                    values["custrecord_asc_subcon_paystatus"] = projectDetails[ii].custrecord_asc_subcon_paystatus;
                                    // var key = projectId + "_" + innerindex;
                                    // log.debug("key",key)
                                    dataArray.push(values)
                                    //projObj[key] = values;
                                    // }
                                    
                                }
                                var key = projectId + "_" + ii;
                                projObj[key] = dataArray;
                            //log.debug("project Details :", projObj)
                            }
                         return projObj;
                        } else {
                            log.audit("No projects found with Missing Vendor Bill Dates")
                        }

                

                } catch (e) {
                    log.error("Errot at Stage : Get Input Data: ", e.message);
                    log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
                }

            }

            function reduce(context) {
                try {
                    var scriptObj = runtime.getCurrentScript();
                    var deploymentID = scriptObj.deploymentId;
                    var key = context.key;
                    //log.debug("key", key);
                    //log.debug("resourceDetailsArray 121",typeof context.values[0]);
                    var resourceDetailsArray = JSON.parse(context.values[0])
                    log.debug("resourceDetailsArray",resourceDetailsArray);
                    //// log.debug("resourceDetailsArray",resourceDetailsArray.length);
                    // log.debug("Reduce Stage: projectDetails key: "+key , JSON.stringify(resourceDetails));
                    for (var resourceindex = 0; resourceindex < resourceDetailsArray.length; resourceindex++) {
                        var resourceDetails = resourceDetailsArray[resourceindex];
                    //  log.debug("resourceDetails", resourceDetails);
                        var nsToDt;
                        var nsfrmDt;
                        var projectID = resourceDetails.id;
                    // log.debug("projectID", projectID);
                        var resourceID = resourceDetails.custrecord_clb_subconresource;
                        var projectLookUp = search.lookupFields({
                            type: "job",
                            id: projectID,
                            columns: ['subsidiary']
                        });
                        var projSubsidiary = projectLookUp.subsidiary[0].value;
                        if (projSubsidiary == 4) {
                                nsToDt = resourceDetails.custrecord_blng_end_dte;
                                nsfrmDt = resourceDetails.custrecord_bln_strt_dte;

                                log.debug("nsfrmDt:nsToDt", nsfrmDt + ":" + nsToDt);
                    
                            var workflowTaskId = resourceDetails.custrecord_clb_workflowid;
                            var vendstrtDate = resourceDetails.startdate;
                            var vendEndDate = resourceDetails.enddate;
                            // var vendstrtDate = resourceDetails.custrecord_clb_originalstartdate;
                            // var vendEndDate = resourceDetails.custrecord_clb_originalenddate;

                            //return;
                        // if(new Date(nsfrmDt) > new Date(vendEndDate)) then break the loop
                            if (new Date(vendstrtDate) > new Date(nsfrmDt)) {
                                nsfrmDt = vendstrtDate;
                            }
                            if (new Date(vendEndDate) < new Date(nsToDt)) {
                                nsToDt = vendEndDate;
                            }
                           // log.debug("after nsfrmDt:nsToDt", nsfrmDt + ":" + nsToDt);
                            if (new Date(nsToDt) >= new Date(nsfrmDt)) {
                            
                            var missingVendorBillDates = resourceDetails.custrecord_clb_msng_vb_dates ? resourceDetails.custrecord_clb_msng_vb_dates : '';

                            var vendorID = resourceDetails.custrecord_clb_vendor;
                            var term = resourceDetails.custrecord_clb_subcon_terms;
                            var apbased = resourceDetails.custrecord_clb_newapbased
                            var paymentMode = resourceDetails.custrecord_clb_paymode;
                            var employee = resourceDetails.custrecord_clb_subconresource;
                            var resVendId = resourceDetails.id_0;
                            var payStatus = resourceDetails.custrecord_asc_subcon_paystatus;
                            log.debug("projectID:employee", projectID + ":" + employee);
                            var trackTimeObj = search.create({
                                type: "timebill",
                                filters:
                                    [
                                        ["billable", "is", "T"],
                                        "AND",
                                        ["customer", "anyof", projectID],
                                        "AND",
                                        ["date", "within", nsfrmDt, nsToDt],
                                        "AND",
                                        ["custcol_asc_timesheet_status", "anyof", "2"],
                                        "AND",
                                        ["custcol_clb_vendor_bill_link", "anyof", "@NONE@"],
                                        "AND",
                                        ["employee", "anyof", employee]
                                    ],
                                columns:
                                    [
                                        search.createColumn({ name: "custcol_asc_payrete", label: "Pay Rate" }),
                                        search.createColumn({
                                            name: "internalid",
                                            join: "item",
                                        }),
                                        search.createColumn({ name: "durationdecimal" })
                                    ]
                            });
                            var searchResultCount = trackTimeObj.runPaged().count;
                            log.debug("Reduce Stage: track time result count", searchResultCount);
                            var vendorBillDetails = {};
                            if (searchResultCount > 0) {
                                trackTimeObj.run().each(function (result) {
                                    var trackTimeID = result.id;
                                    var taskID = result.getValue({
                                        name: "internalid",
                                        join: "item",
                                    });

                                    var payRate = result.getValue("custcol_asc_payrete") ? result.getValue("custcol_asc_payrete") : 0;
                                    taskID = taskID + "_" + payRate;
                                    var hoursDecimal = result.getValue("durationdecimal") ? result.getValue("durationdecimal") : 0;

                                    //log.debug("If Key is present" , vendorBillDetails.hasOwnProperty(taskID));
                                    if (!vendorBillDetails.hasOwnProperty(taskID)) {
                                        var trackTimeDetails = {
                                            "tracktimeId": [],
                                            "hours": 0,
                                            "payRate": 0,

                                        };
                                        vendorBillDetails[taskID] = trackTimeDetails;

                                    }
                                    vendorBillDetails[taskID]["tracktimeId"].push(trackTimeID);
                                    vendorBillDetails[taskID]["hours"] = parseFloat(vendorBillDetails[taskID]["hours"]) + parseFloat(hoursDecimal);
                                    if (vendorBillDetails[taskID]["payRate"] == 0) {
                                        vendorBillDetails[taskID]["payRate"] = payRate;
                                    }

                                    return true;
                                });
                                log.debug("vendorBillDetails", JSON.stringify(vendorBillDetails));
                                var vendBillID = createVendorBill(vendorBillDetails, projectID, nsfrmDt, nsToDt, vendorID, term, paymentMode, employee, payStatus, apbased,projSubsidiary);
                                log.debug("Reduce Stage: vendBillID: ", vendBillID);
                                var currentmissingDates = nsfrmDt + ":" + nsToDt + ",";
                                if (vendBillID) {
                                    if (deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly') {
                                        if (missingVendorBillDates && missingVendorBillDates.indexOf(currentmissingDates) > -1) {
                                            var newMissingInvoices = missingVendorBillDates.replace(currentmissingDates, '');
                                            var resourceVendId = record.submitFields({
                                                type: 'customrecord_clb_subconvendor',
                                                id: resVendId,
                                                values: {
                                                    "custrecord_clb_msng_vb_dates": newMissingInvoices,
                                                    "custrecord_clb_subcon_vb_date": new Date()
                                                },
                                                options: {
                                                    enableSourcing: false,
                                                    ignoreMandatoryFields: true
                                                }
                                            });

                                            log.debug("Search for the log created for Missing Timecard and delete if available.")
                                            var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
                                                type: "customrecord_asc_trnsctn_crtn_rprt_arap",
                                                filters:
                                                    [
                                                        ["custrecord_asc_period_strt_date", "on", nsfrmDt],
                                                        "AND",
                                                        ["custrecord_asc_period_end_date", "on", nsToDt],
                                                        "AND",
                                                        ["custrecord_asc_transaction_type", "anyof", "2"],
                                                        "AND",
                                                        ["custrecord_asc_project_id", "anyof", projectID],
                                                        "AND",
                                                        ["custrecord_asc_employee", "anyof", employee]
                                                    ],
                                                columns:
                                                    []
                                            });
                                            var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
                                            log.debug("transaction error report result count", searchResultCount);
                                            customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.run().each(function (result) {
                                                var transactionerr = record.delete({
                                                    type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
                                                    id: result.id,
                                                });
                                                log.debug("transaction report record deleted id", transactionerr)
                                                return true;
                                            });
                                        }
                                        else {
                                            var resourceVendId = record.submitFields({
                                                type: 'customrecord_clb_subconvendor',
                                                id: resVendId,
                                                values: {
                                                    "custrecord_clb_subcon_vb_date": new Date()
                                                },
                                                options: {
                                                    enableSourcing: false,
                                                    ignoreMandatoryFields: true
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        log.debug("Search for the log created for Missing Timecard and delete if available.")
                                        var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
                                            type: "customrecord_asc_trnsctn_crtn_rprt_arap",
                                            filters:
                                                [
                                                    ["custrecord_asc_period_strt_date", "on", nsfrmDt],
                                                    "AND",
                                                    ["custrecord_asc_period_end_date", "on", nsToDt],
                                                    "AND",
                                                    ["custrecord_asc_transaction_type", "anyof", "2"],
                                                    "AND",
                                                    ["custrecord_asc_project_id", "anyof", projectID],
                                                    "AND",
                                                    ["custrecord_asc_employee", "anyof", employee]
                                                ],
                                            columns:
                                                []
                                        });
                                        var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
                                        log.debug("transaction error report result count", searchResultCount);
                                        customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.run().each(function (result) {
                                            var transactionerr = record.delete({
                                                type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
                                                id: result.id,
                                            });
                                            log.debug("transaction report record deleted id", transactionerr)
                                            return true;
                                        });
                                        context.write({ key: resVendId, value: currentmissingDates })
                                    }

                                }
                                else {
                                    log.error("ERROR WHILE CREATING VENDOR BILL")
                                    if (deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly') {
                                        var resourceVendId = record.submitFields({
                                            type: 'customrecord_clb_subconvendor',
                                            id: resVendId,
                                            values: {
                                                "custrecord_clb_subcon_vb_date": new Date()
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    } else {
                                        //search for the bill
                                        //log.audit("searching for the bill")
                                        var billId = searchExistingBill(employee, projectID, nsfrmDt, nsToDt)
                                    //  log.audit("billId", billId);
                                        if (billId) {
                                        //  log.audit("bill is already Present")
                                        }
                                        else {
                                            var projectLookUp = search.lookupFields({
                                                            type: 'customrecord_clb_subconvendor',
                                                            id: resVendId,
                                                            columns: ['custrecord_clb_msng_vb_dates']
                                                        })
                                    
                                            var currentMissingVBDate = projectLookUp.custrecord_clb_msng_vb_dates ? projectLookUp.custrecord_clb_msng_vb_dates : '';
                                        //  log.debug("Reduce Stage: Set Missing Dates on project: missing Vendor Bills-1", currentMissingVBDate);
                                            var currentmissingDates = nsfrmDt + ":" + nsToDt + ",";
                                            log.audit("currentmissingDates 1", currentmissingDates);
                                            var newMissingDates = '';
                                            if (currentMissingVBDate.indexOf(currentmissingDates) == -1) {
                                                log.debug("Dates are not present in the missing Vendor Bill field")
                                                newMissingDates = currentMissingVBDate + currentmissingDates;
                                            }
                                            log.audit("newMissingDates", newMissingDates);
                                            if (currentMissingVBDate != newMissingDates && newMissingDates != '') {
                                                log.debug("currentMissingVBDate setting on project")
                                                var resourceVendId = record.submitFields({
                                                    type: 'customrecord_clb_subconvendor',
                                                    id: resVendId,
                                                    values: {
                                                        "custrecord_clb_msng_vb_dates": newMissingDates
                                                    },
                                                    options: {
                                                        enableSourcing: false,
                                                        ignoreMandatoryFields: true
                                                    }
                                                });
                                                log.audit("resourceVndId updated: " + resourceVendId)
                                                var errID = lib.trnsctnFailureRec(nsfrmDt, nsToDt, "Failure in Vendor Bill Creation. Timecards are missing for the Project.", 2, projectID, employee)
                                                log.error("Error: Created the Transaction Error ID", errID);
                                            }
                                        }

                                    }


                                }

                            }
                            else {
                            
                                    log.debug("searching for the bill")
                                    var billId = searchExistingBill(employee, projectID, nsfrmDt, nsToDt)
                                // log.debug("billId", billId);
                                    if (billId) {
                                    // log.debug("vb is presnet")
                                    }
                                    else {
                                        var projectLookUp = search.lookupFields({
                                            type: 'customrecord_clb_subconvendor',
                                            id: resVendId,
                                            columns: ['custrecord_clb_msng_vb_dates']
                                        })
                    
                                    var currentMissingVBDate = projectLookUp.custrecord_clb_msng_vb_dates ? projectLookUp.custrecord_clb_msng_vb_dates : '';
                                    // log.debug("Reduce Stage: Set Missing Dates on project: missing Vendor Bills- 2", currentMissingVBDate);
                                        var currentmissingDates = nsfrmDt + ":" + nsToDt + ",";
                                        var newMissingDates = '';
                                        if (currentMissingVBDate.indexOf(currentmissingDates) == -1) {
                                            log.debug("Dates are not present in the missing Vendor Bill field")
                                            newMissingDates = currentMissingVBDate + currentmissingDates;
                                        }

                                        if (currentMissingVBDate != newMissingDates && newMissingDates != '') {
                                        // log.debug("currentMissingVBDate setting on project")
                                            var resourceVendId = record.submitFields({
                                                type: 'customrecord_clb_subconvendor',
                                                id: resVendId,
                                                values: {
                                                    "custrecord_clb_msng_vb_dates": newMissingDates
                                                },
                                                options: {
                                                    enableSourcing: false,
                                                    ignoreMandatoryFields: true
                                                }
                                            });
                                            log.audit("resourceVndId updated: " + resourceVendId)
                                            var errID = lib.trnsctnFailureRec(nsfrmDt, nsToDt, "Failure in Vendor Bill Creation. Timecards are missing for the Project.", 2, projectID, employee)
                                            log.error("Error: Created the Transaction Error ID", errID);
                                        }
                                    }
                                
                                

                            }
                            }
                        }
                    }


                } catch (e) {
                    log.debug("Errot at Stage : Reduce", JSON.stringify(e))
                }
            }
            function createVendorBill(vendorBillDetails, projectID, billingStartDate, billingEndDate, vendorID, term, paymentMode, employee, payStatus, apbased,projSubsidiary) {
                try {
                    //log.debug("vendorBillDetails: " ,JSON.stringify(vendorBillDetails));

                    log.debug("createVendorBill", "Vendor Bill creation function for the project: " + projectID + " employee: " + employee)
                    var vendorLookup = search.lookupFields({
                        type: "vendor",
                        id: vendorID,
                        columns: ['representingsubsidiary', 'custentity_on_hold', 'custentity_clb_1099_eligible']
                    });
                    var repreSub = vendorLookup.representingsubsidiary;
                //  log.debug("vendorLookup", JSON.stringify(vendorLookup))
                    var employeeLookUp = search.lookupFields({
                        type: "employee",
                        id: employee,
                        columns: ['custentity_clb_entityid', 'custentity_asc_ref_number', 'releasedate']
                    })
                    var eligible = vendorLookup.custentity_clb_1099_eligible;
                    var vendhold = vendorLookup.custentity_on_hold;
                    var entityId = employeeLookUp.custentity_clb_entityid;
                    var refNum = employeeLookUp.custentity_asc_ref_number;
                    var terminationDate;
                    if (employeeLookUp.releasedate) {
                        terminationDate = new Date(employeeLookUp.releasedate);
                    }
                    var serviceStartDate = new Date(billingStartDate);
                    var serviceEndDate = new Date(billingEndDate);
                    var lastconsultantInv = false;
                    if (terminationDate > serviceStartDate && terminationDate <= serviceEndDate && terminationDate) {
                        //log.debug("termination date is between start and end date of service period")
                        billingEndDate = employeeLookUp.releasedate;
                        lastconsultantInv = true;
                    }
                    if (refNum) {
                        refNum = parseInt(refNum) + 1;

                    }
                    else {
                        refNum = 1;
                    }
                    entityId = entityId + "_" + refNum;
                    if (terminationDate < serviceStartDate && terminationDate) {
                    // log.debug("Employee is already terminated.")
                        log.error("Transaction Failure Report creation")
                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Vendor Bill Creation Failed because Employee " + entityId + " is already terminated.", 2, projectID, employee)
                        log.error("Error in createVendor: Created the Transaction Error ID", errID);
                    } else {
                        var vendorBillObj = record.create({
                            type: 'vendorbill',
                            isDynamic: true
                        });
                        vendorBillObj.setValue("entity", vendorID)
                        vendorBillObj.setValue("terms", term);
                        vendorBillObj.setValue("subsidiary", 4); // Ascendion INC.
                        vendorBillObj.setValue("currency", 2); // US Dollar.
                        vendorBillObj.setValue("custbody_asc_ap_based", apbased);
                        vendorBillObj.setValue("custbody_clb_startdate", new Date(billingStartDate))
                        vendorBillObj.setValue("custbody_clb_enddate", new Date(billingEndDate))
                        vendorBillObj.setValue("custbody_clb_paymentmode", paymentMode);
                        vendorBillObj.setValue("custbodyclb_vendorbillcatory", 5);
                        vendorBillObj.setValue("custbody_asc_inv_project_selected", projectID);
                        var terms = vendorBillObj.getText("terms");
                    // log.debug("terms", terms)

                        if (terms == "Pay When Paid" || payStatus == "2" || vendhold == true) {
                            vendorBillObj.setValue("paymenthold", true)
                        }
                        if (eligible) {
                            vendorBillObj.setValue("custbody_asc_1099_eligible", true)
                        }
                        if (lastconsultantInv) {
                            vendorBillObj.setValue("custbody_clb_lastconsultantbill", true);
                        }
                        vendorBillObj.setValue("tranid", entityId);
                        if (repreSub.length > 0) {
                            vendorBillObj.setValue("approvalstatus", 2);
                        }
                        var timeSheetconsolidatedIDs = [];
                        Object.keys(vendorBillDetails).forEach(function (key) {
                            log.debug('Key : ' + key, 'Value : ' + JSON.stringify(vendorBillDetails[key]));

                            var trackTimeDetails = vendorBillDetails[key]
                            timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);

                            var quantity = parseFloat(trackTimeDetails["hours"])
                            var timeRate = parseFloat(trackTimeDetails["payRate"]);
                            log.debug("Vendor Bill creation Function: quantity and timerate ", quantity + " : " + timeRate)

                        // log.debug("Key", key.split("_")[0])
                            if (timeRate > 0 && quantity > 0) {
                                vendorBillObj.selectNewLine({
                                    sublistId: 'item'
                                });
                                vendorBillObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: key.split("_")[0]
                                });
                                vendorBillObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: quantity
                                });
                                vendorBillObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    value: timeRate
                                });
                                vendorBillObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_clb_subconemployee',
                                    value: employee
                                });
                                vendorBillObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'customer',
                                    value: projectID
                                });
                                vendorBillObj.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'isbillable',
                                    value: false
                                });
                                vendorBillObj.commitLine({
                                    sublistId: 'item'
                                });
                            }


                        });
                        log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs + " : " + timeSheetconsolidatedIDs.length)

                        vendorBillObj.setValue("custbody_asc_createdfromtimetrack", timeSheetconsolidatedIDs); //use settext if doesnt work
                        var vendorBillID;
                        var vbAmt = vendorBillObj.getValue("total");
                        var vbCurrency = vendorBillObj.getValue("currency");
                        if (vbAmt > 0) {
                            vendorBillID = vendorBillObj.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            });
                        }
                        else {
                            throw { message: "Vendor Bill Amount is less than 0 due to 0 hours or 0 Pay Rate for the week." }
                        }
                        if (vendorBillID) {
                            var vendorCrditId = ""
                             if(repreSub.length>0  && (vendorID == "83124" || vendorID == "83125"))  {
                                //  var entityId = vbObj.getValue('tranid');
                                var cmentityId = "VC_" + entityId + "_REV"
                                log.debug("Reversing VB as it is intercompany vendor")
                                var vendorCredit = record.transform({
                                    fromType: record.Type.VENDOR_BILL,
                                    fromId: vendorBillID,
                                    toType: record.Type.VENDOR_CREDIT,
                                    isDynamic: true,
                                });
                                vendorCredit.setValue("tranid", cmentityId)
                                vendorCredit.setValue("taxdetailsoverride", true)
                                vendorCredit.setValue("memo", "Vendor Bill Reversed due to Intercompany Vendor")
                                var vbLineNumber = vendorCredit.findSublistLineWithValue({
                                    sublistId: 'apply',
                                    fieldId: 'internalid',
                                    value: vendorBillID
                                });
                                log.debug("vbLineNumber", vbLineNumber)
                                if (vbLineNumber >= 0) {
                                    vendorCredit.selectLine({
                                        sublistId: 'apply',
                                        line: vbLineNumber
                                    });
                                    vendorCredit.setCurrentSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'apply',
                                        value: true
                                    });
                                    vendorCredit.commitLine({
                                        sublistId: 'apply'
                                    });

                                }
                                vendorCrditId = vendorCredit.save({
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                });
                                log.debug("Vendor Bill Reversed due to intercompany vendor", vendorCrditId)
                            }
                            else if (repreSub.length > 0) {
                            // log.debug("enside else")
                                var repreSubId = repreSub[0].value;
                                var selectedSubList = [11,10];
                                if(selectedSubList.findIndex(element=> element == repreSubId) != -1){
                                    //log.debug("repreSubId", repreSubId);
                                    var subsidiaryLookup = search.lookupFields({
                                        type: "subsidiary",
                                        id: projSubsidiary,
                                        columns: ['representingcustomer', 'representingvendor']
                                    });
                                    var representCust = '83226';
                                // var representCust = subsidiaryLookup.representingcustomer[0].value;
                                // var representVdr = subsidiaryLookup.representingvendor[0].value;
                                    var projectLookUp = search.lookupFields({
                                        type: "job",
                                        id: projectID,
                                        columns: ['custentity_clb_projecttypeforinvoicing',]
                                    })
                                    var projectType = projectLookUp.custentity_clb_projecttypeforinvoicing[0].value;
                                    //log.debug("representCust",representCust);
                                //  log.debug("vbCurrency",vbCurrency);
                                // if(vendorID ==  representVdr){
                                        var intrecompnayInvRec = record.create({
                                            type: record.Type.INVOICE,
                                            isDynamic: true,
                                        });
    
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'customform',
                                            value: 163
                                        });
    
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'entity',
                                            value: representCust
                                        });
    
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'custbody_clb_projecttypeapproval',
                                            value: projectType
                                        });
    
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'subsidiary',
                                            value: repreSubId
                                        });
    
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'currency',
                                            value: vbCurrency
                                        });
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'approvalstatus',
                                            value: 2 //approve status.
                                        });
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'custbody_asc_inv_project_selected',
                                            value: projectID //approve status.
                                        });
    
                                        intrecompnayInvRec.setValue({
                                            fieldId: 'intercotransaction',
                                            value: vendorBillID
                                        });
                                        intrecompnayInvRec.setValue("custbody_clb_periodstartingdate",new Date(billingStartDate))
                                        intrecompnayInvRec.setValue("custbody_clb_periodendingdate",new Date(billingEndDate))
                                        intrecompnayInvRec.setValue("terms",term);
                                        Object.keys(vendorBillDetails).forEach(function (key) {
                                        // log.debug('Key : ' + key, 'Value : ' + JSON.stringify(vendorBillDetails[key]));
                
                                            var trackTimeDetails = vendorBillDetails[key]
                                            timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);
                
                                            var quantity = parseFloat(trackTimeDetails["hours"])
                                            var timeRate = parseFloat(trackTimeDetails["payRate"]);
                                            //log.debug("Vendor Bill creation Function: quantity and timerate ", quantity + " : " + timeRate)
                
                                        // log.debug("Key", key.split("_")[0])
                                            if (timeRate > 0 && quantity > 0) {
                                                intrecompnayInvRec.selectNewLine({
                                                    sublistId: 'item'
                                                });
                                                intrecompnayInvRec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'item',
                                                    value: key.split("_")[0]
                                                });
                                                intrecompnayInvRec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'quantity',
                                                    value: quantity
                                                });
                                                intrecompnayInvRec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'rate',
                                                    value: timeRate
                                                });
                                                intrecompnayInvRec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_clb_subconemployee',
                                                    value: employee
                                                });
                                                // intrecompnayInvRec.setCurrentSublistValue({
                                                //     sublistId: 'item',
                                                //     fieldId: 'isbillable',
                                                //     value: false
                                                // });
                                                intrecompnayInvRec.commitLine({
                                                    sublistId: 'item'
                                                });
                                            }
                                        
                                        });
                                        intrecompnayInvRec.save({
                                            enableSourcing: true,
                                            ignoreMandatoryFields: true
                                        });
                                    //}
                                }
                            }
                        
                            for (var ii = 0; ii < timeSheetconsolidatedIDs.length; ii++) {
                                var subVal = {
                                    "custcol_clb_vendor_bill_link": vendorBillID
                                }
                                if (vendorCrditId) {
                                    subVal["custcol_clb_vendor_credit"] = vendorCrditId
                                }
                                record.submitFields({
                                    type: record.Type.TIME_BILL,
                                    id: timeSheetconsolidatedIDs[ii],
                                    values: subVal,
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                })
                            }
                            record.submitFields({
                                type: record.Type.EMPLOYEE,
                                id: employee,
                                values: {
                                    "custentity_asc_ref_number": refNum
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            })


                        }

                        return vendorBillID;
                    }


                } catch (e) {
                    log.debug("Error at Stage : createVendorBill function", JSON.stringify(e))
                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Failure in Vendor Bill Creation due: " + e.message, 2, projectID, employee)
                    log.error("Error in createVendorBill: Created the Transaction Error ID", errID);
                }


            }

            function searchExistingBill(employeeId, project, fromDate, toDate) {
                var billId = '';
                var vendorbillSearchObj = search.create({
                    type: "vendorbill",
                    settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                    filters:
                        [
                            ["type", "anyof", "VendBill"],
                            "AND",
                            ["custcol_clb_subconemployee", "anyof", employeeId],
                            "AND",
                            ["custbody_asc_inv_project_selected", "anyof", project],
                            "AND",
                            ["custbody_clb_startdate", "on", fromDate],
                            "AND",
                            ["custbody_clb_enddate", "on", toDate]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" })
                        ]
                });
                var searchResultCount = vendorbillSearchObj.runPaged().count;
                log.debug("vendorbillSearchObj result count", searchResultCount);
                if (searchResultCount) {
                    vendorbillSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        billId = result.getValue({ name: "internalid" });
                        return true;
                    });
                }
                return billId
                /*
                vendorbillSearchObj.id="customsearch1721123018779";
                vendorbillSearchObj.title="Search to check avlbl vb (copy)";
                var newSearchId = vendorbillSearchObj.save();
                */
            }
            function summarize(context) {
                log.debug("reduce summary:", JSON.stringify(context.reduceSummary))
                var scriptObj = runtime.getCurrentScript();
                var deploymentID = scriptObj.deploymentId;
                // if (deploymentID == 'customdeploy_asc_mr_ap_fxbd_msng_vb_wkly') {
                //     var missingVBObj = {};
                //     context.output.iterator().each(function (key, value) {
                //         log.debug("Summarize", "Key : " + key + "; Value : " + JSON.stringify(value));
                //         if (!missingVBObj.hasOwnProperty(key)) {
                //             missingVBObj[key] = [];
                //             missingVBObj[key].push(value);
                //         }
                //         missingVBObj[key].push(value);
                //         return true;
                //     })
                //     log.audit("Summarize", "missingOnvObj : " + JSON.stringify(missingVBObj));
                //     Object.keys(missingVBObj).forEach(function (key) {
                //         log.debug("key",key);
                //         var values = missingVBObj[key];
                //         log.debug("values",values);
                //         var projectLookUp = search.lookupFields({
                //             type: 'customrecord_clb_subconvendor',
                //             id: key,
                //             columns: ['custrecord_clb_msng_vb_dates']
                //         })

                //         var currentMissingVBDate = projectLookUp.custrecord_clb_msng_vb_dates ? projectLookUp.custrecord_clb_msng_vb_dates : '';
                //         log.audit("Summarize", "currentMissingVBDate Before : " + currentMissingVBDate);
                //         values.forEach(function (value) {
                //             currentMissingVBDate = currentMissingVBDate.replace(value, "");
                //         })
                //         log.audit("Summarize", "currentMissingVBDate After : " + currentMissingVBDate);

                //         var resourceVndId = record.submitFields({
                //             type: 'customrecord_clb_subconvendor',
                //             id: key,
                //             values: {
                //                 "custrecord_clb_msng_vb_dates": currentMissingVBDate
                //             },
                //             options: {
                //                 enableSourcing: false,
                //                 ignoreMandatoryFields: true
                //             }
                //         });
                //         log.debug("summarize: ", "resourceVndId updated: " + resourceVndId)
                //     });

                // }
            }
            return {
                getInputData: getInputData,
                reduce: reduce,
                summarize: summarize
            };
        });