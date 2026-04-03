/**
** @NApiVersion 2.1
** @NScriptType MapReduceScript
** @NModuleScope SameAccount
*
** @libraries used:
                    
 
 -- Date--      -- Modified By--      --Requested By--     --Description
DD-MM-YYYY        Employee Name         Client Name           One line description
 
 */
define(['N/search', 'N/record', 'N/runtime', 'N/query', 'N/format', './Projects/Library/Project Library.js'],
    function (search, record, runtime, query, format, lib) {
        var accountDetails = {
            '7315200_SB2': {
                subsidiary: "4",
                // terms : ["7","699"]
            },
            '7315200_SB1': {
                subsidiary: "4",
                //terms : ["210"]
            },
            '7315200': {
                subsidiary: "4",
                // terms : ["7"]
            }
        };
        function getInputData() {
            try {
                log.audit('getInputData', 'Start');
                var scriptObj = runtime.getCurrentScript();
                var deploymentID = scriptObj.deploymentId;
                var accid = runtime.accountId;
                log.audit("Account Id: ", accid);
                var subsidiary = accountDetails[accid].subsidiary;
                log.debug("Subsidiary = ", subsidiary)
                log.debug('getInputData', 'Deployment Id: ' + deploymentID);
                var projectInfoList = []//{projectInfo : "", projectDetails: []};
                var invoiceSearchObj = search.create({
                    type: "invoice",
                    filters:
                        [
                            ["type", "anyof", "CustInvc"], "AND",
                            ["mainline", "is", "T"], "AND",
                           // ["systemnotes.date","on","today"], "AND", 
                           // ["systemnotes.type","is","F"], "AND",
                           ["internalid", "anyof", "39433",], "AND",
                               ["status","anyof","CustInvc:A"], "AND", 
                            ["custbody_clb_vendor_bill_links", "anyof", "@NONE@"], "AND",
                            ["subsidiary", "anyof", accountDetails[accid].subsidiary],
                             //  "AND", 
                             // ["datecreated","onorafter","01/13/2025 12:00 am"],  
                               "AND", 
                               ["custbody_clb_projecttypeapproval","anyof","2","4"], 
 
                        ],
                    columns:
                        [   
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                             search.createColumn({ name: "custbody_asc_inv_project_selected", label: "Project ID" }),
                          //  search.createColumn({ name: "internalid", join: "jobMain", label: "Internal ID" }),
                            search.createColumn({ name: "custbody_clb_projecttypeapproval", }),
                            search.createColumn({ name: "custbody_clb_periodstartingdate", label: "Period Starting Date" }),
                            search.createColumn({ name: "custbody_clb_periodendingdate", label: "Period Ending Date" }),
                        ]
                });
                var searchResultCount = invoiceSearchObj.runPaged().count;
                log.debug("invoiceSearchObj result count", searchResultCount);
                invoiceSearchObj.run().each(function (result) {
                    var invoiceID = result.getValue({ name: "internalid", label: "Internal ID" });
                    var projectID = result.getValue({ name: "custbody_asc_inv_project_selected", label: "Project ID" });
                    var projectType = result.getValue({ name: "custbody_clb_projecttypeapproval", });
                    var periodStart = result.getValue({ name: "custbody_clb_periodstartingdate", label: "Period Starting Date" });
                    var periodEnd = result.getValue({ name: "custbody_clb_periodendingdate", label: "Period Ending Date" });

                    if (projectType != 4) {
                        log.debug("individual project")
                        // var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle,job.custentity_clb_parentproject, job.custentity_clb_isparentproject, job.custentity_clb_missingvendorbilldates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID)  WHERE  (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND ((resVend.custrecord_clb_originalstartdate <='"+periodEnd+"') AND (resVend.custrecord_clb_originalenddate >= '"+periodStart+"')) AND (resVend.custrecord_clb_newapbased IN (1)) AND (job.ID = '"+ projectID +"')";
                        var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle,job.custentity_clb_parentproject, job.custentity_clb_isparentproject,resVend.custrecord_asc_subcon_paystatus, resAlloc.startdate,resAlloc.endDate FROM job AS job INNER JOIN customrecord_clb_subconvendor AS resVend ON job.ID = resVend.custrecord_clb_subcon_project INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND ((resAlloc.startdate <='" + periodEnd + "') AND (resAlloc.endDate >= '" + periodStart + "')) AND ((resVend.custrecord_clb_originalstartdate <='" + periodEnd + "') AND (resVend.custrecord_clb_originalenddate >= '" + periodStart + "')) AND (resVend.custrecord_clb_newapbased IN (1)) AND (job.ID = '" + projectID + "') AND (resVend.custrecord_clb_workflowid = resAlloc.custevent_clb_prjct_workl_tsk_id) AND (resVend.custrecord_clb_vendor NOT IN (67134,67145,67150,67151,67901,103726,88844,90555,103455,103419,103454,88792,103453,103452))";
                        log.debug("reduce : queryStr ", queryStr);
                        var results = query.runSuiteQL({ query: queryStr });
                        var projectDetails = results.asMappedResults();
                        log.debug("project found: ", projectDetails.length)
                        var uniqueId
                        if (projectDetails.length > 0) {
                            for (var pd = 0; pd < projectDetails.length; pd++) {
                              
                                log.debug("projectDetails[pd] ", JSON.stringify(projectDetails[pd]))
                                var projectInfo = projectDetails[pd];
                                log.debug('projectInfo', projectInfo);
                                var projectID = projectInfo.id;
                            
                                projectInfo.periodStart = periodStart;
                                projectInfo.periodEnd = periodEnd;
                                projectInfo.invoiceID = invoiceID;
                                projectInfoList.push(projectInfo);
                               
                            }
                        }
                    }
                    else {
                        log.debug("Group project")
                        var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle,job.custentity_clb_parentproject, job.custentity_clb_isparentproject,resVend.custrecord_asc_subcon_paystatus, resAlloc.startdate,resAlloc.endDate FROM job AS job INNER JOIN customrecord_clb_subconvendor AS resVend ON job.ID = resVend.custrecord_clb_subcon_project INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project WHERE  (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND ((resAlloc.startdate <='" + periodEnd + "') AND (resAlloc.endDate >= '" + periodStart + "')) AND ((resVend.custrecord_clb_originalstartdate <='" + periodEnd + "') AND (resVend.custrecord_clb_originalenddate >= '" + periodStart + "')) AND (resVend.custrecord_clb_newapbased IN (1)) AND (job.ID  = '" + projectID + "') AND (resVend.custrecord_clb_workflowid = resAlloc.custevent_clb_prjct_workl_tsk_id) AND (resVend.custrecord_clb_vendor NOT IN (67134,67145,67150,67151,67901,103726,88844,90555,103455,103419,103454,88792,103453,103452))"
                        // var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle,job.custentity_clb_parentproject, job.custentity_clb_isparentproject, job.custentity_clb_missingvendorbilldates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID)  WHERE  (job.custentity_clb_projecttypeforinvoicing IN (1,2)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_originalstartdate <='"+periodEnd+"') AND  (resVend.custrecord_clb_originalenddate >= '"+periodStart+"') AND (resVend.custrecord_clb_newapbased IN (1)) AND (job.custentity_clb_parentproject  = '"+ projectID +"')"
                        //var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle,job.custentity_clb_parentproject, job.custentity_clb_isparentproject, job.custentity_clb_missingvendorbilldates,resVend.custrecord_asc_subcon_paystatus, resAlloc.custevent_actual_startdate,resAlloc.endDate FROM job AS job INNER JOIN customrecord_clb_subconvendor AS resVend ON job.ID = resVend.custrecord_clb_subcon_project INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project WHERE  (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND ((resAlloc.custevent_actual_startdate <='"+periodEnd+"') AND (resAlloc.endDate >= '"+periodStart+"')) AND (resVend.custrecord_clb_newapbased IN (1)) AND (job.custentity_clb_parentproject  = '"+ projectID +"') AND (resVend.custrecord_clb_workflowid = resAlloc.custevent_clb_prjct_workl_tsk_id) AND (resVend.custrecord_clb_vendor NOT IN (67134,67145,67150,67151,67901))";// AND (resVend.ID IN(11459,8899,11679,8900,8909,8903,8904,8905))";
                        log.debug("reduce : queryStr ", queryStr)
                        var results = query.runSuiteQL({ query: queryStr });
                        var projectDetails = results.asMappedResults();
                        log.debug("resource found",projectDetails.length);
   
                        if (projectDetails.length) {
                            for (var proj = 0; proj < projectDetails.length; proj++) {
                                log.debug("projectDetails[proj] ", JSON.stringify(projectDetails[proj]))
                                var projectInfo = projectDetails[proj];
                                log.debug('projectInfo', projectInfo);
                                var projectID = projectInfo.id;
                                var employee = projectInfo.custrecord_clb_subconresource;
                                var payStatus = projectDetails.custrecord_asc_subcon_paystatus;
                                projectInfo.periodStart = periodStart;
                                projectInfo.periodEnd = periodEnd;
                                projectInfo.invoiceID = invoiceID;
                                projectInfoList.push(projectInfo);

                            }

                        }
                    }
                  return true;
                });
               log.debug("projectInfoList ", projectInfoList);
                projectInfoList = projectInfoList.filter((item, index, self) =>  index === self.findIndex(obj => obj.custrecord_clb_subconresource === item.custrecord_clb_subconresource) );
                log.debug("projectInfoList 1", projectInfoList);
                
              return projectInfoList;




            }

            catch (e) {
                log.error("Errot at Stage : Map Data: ", e.message);
                log.error("Errot at Stage : Map Input Data: ", JSON.stringify(e));
            }

        }
        function map(context) {
            try {
                var CreateBillDetailsList = [];
                log.debug('context map', context);
                var invoiceDetails = JSON.parse(context.value);
                log.debug("map Stage", invoiceDetails);
                var invoiceID = invoiceDetails.invoiceID;
                log.debug("map Stage", "invoice ID: " + invoiceID);
                var projectID = invoiceDetails.id;
                log.debug("map Stage", "projectID: " + projectID);
                var periodStart = invoiceDetails.periodStart;
                var periodEnd = invoiceDetails.periodEnd;
                var employee = invoiceDetails.custrecord_clb_subconresource
                log.debug("map Stage", "projectID  : periodStart : periodEnd: " + projectID + "  : " + periodStart + " : " + periodEnd);
                var vendorID, term, paymentMode;

                var vendstrtDate = invoiceDetails.startdate;
                var vendEndDate = invoiceDetails.endDate;
                if (new Date(vendstrtDate) > new Date(periodStart)) {
                    periodStart = vendstrtDate;
                    invoiceDetails.periodStart = vendstrtDate;
                }
                if (new Date(vendEndDate) < new Date(periodEnd)) {
                    periodEnd = vendEndDate;
                    invoiceDetails.vendEndDate = vendEndDate;
                }
            
                log.debug("billingStartDate:billingEndDate", periodStart + ":" + periodEnd);
              
                //----------------------VendorBillCreation - Start--------------------------------
                var trackTimeObj = search.create({
                    type: "timebill",
                    filters:
                        [
                            ["billable", "is", "T"],
                            "AND",
                            ["customer", "anyof", projectID],
                            "AND",
                            ["date", "within", periodStart, periodEnd],
                            "AND",
                            ["custcol_asc_timesheet_status", "anyof", "2"],
                            //"AND", 
                            //   ["status","is","F"],
                            "AND",
                            ["custcol_clb_vendor_bill_link", "anyof", "@NONE@"],
                            "AND",
                            ["custcol_clb_weekendingdate", "isnotempty", ""],
                            "AND",
                            ["custcol_clb_invoice", "anyof", invoiceID],
                            "AND",
                            ["custcol_clb_invoice.mainline", "is", "T"],
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
                log.debug("map Stage track time result count", searchResultCount);
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

                     context.write({ key: context.key, value: { vendorBillDetails: vendorBillDetails, resVendDetails: invoiceDetails } });


                }
                else {
                    var errID = lib.trnsctnFailureRec(periodStart, periodEnd, "Failure in Vendor Bill Creation. Timecards are missing for the Project.", 2, projectID, employee)

                    log.debug("No timecard found to create VB", errID)
                }
                //--------------------------------------------------------------------------------





                // CreateBillDetailsList.forEach((obj, index) => {
                //     context.write({ key: index, value: obj });
                // })



            }

            catch (e) {
                log.error("Errot at Stage : Map Data: ", e.message);
                log.error("Errot at Stage : Map Input Data: ", JSON.stringify(e));
            }
        }
        function reduce(context) {
            try {
                log.debug("reduce summary:", context)
                // var key = JSON.parse(context.key);
                // log.debug("key",key);
                var data = (JSON.parse(context.values));

                log.debug("data", data);
                var vendorBillIds = [];

                // log.debug("data" +typeof data, data);
                var vendorBillDetails = data.vendorBillDetails;
                var vendorID = data.resVendDetails.custrecord_clb_vendor;
                var term = data.resVendDetails.custrecord_clb_subcon_terms;
                var apbased = data.resVendDetails.custrecord_clb_newapbased
                var paymentMode = data.resVendDetails.custrecord_clb_paymode;
                var employee = data.resVendDetails.custrecord_clb_subconresource;
                var periodStart = data.resVendDetails.periodStart;
                var periodEnd = data.resVendDetails.periodEnd;
                var payStatus = data.resVendDetails.payStatus;
                var invoiceID = data.resVendDetails.invoiceID
                var projectID = data.resVendDetails.id;
                log.debug("vendorID:term:paymentMode:employee ", vendorID + ":" + term + ":" + paymentMode + ":" + employee);
                var vendBillID = createVendorBill(vendorBillDetails, projectID, periodStart, periodEnd, vendorID, term, paymentMode, employee, invoiceID, payStatus, apbased)
                // context.write({key:invoiceID,value:vendBillID})
                if (vendBillID) {
                    let invRecord = record.load({
                        type: record.Type.INVOICE,
                        id: invoiceID,
                    });


                    let BillId = invRecord.getValue('custbody_clb_vendor_bill_links');
                    BillId.push(vendBillID);
                    log.debug("BillId", BillId)
                    invRecord.setValue('custbody_clb_vendor_bill_links', BillId)
                    invRecord.save({ ignoreMandatoryFields: true });
                }
            } catch (error) {
                log.debug("error in reduce", error)
            }

        }
        function summarize(context) {
            log.debug("summarize summary:", JSON.stringify(context))
            context.output.iterator().each(function (key, value) {
                log.debug("Key- " + key + "value :-", value)
                //     record.submitFields({
                //         type: record.Type.INVOICE,
                //         id: invoiceID,
                //         values: {
                //             "custbody_clb_vendor_bill_links": vendBillID //check how to set multiple vendor ids
                //         },
                //         options: {
                //             enableSourcing: false,
                //             ignoreMandatoryFields: true
                //         }
                //     });
                //  }
            });

        }
        function createVendorBill(vendorBillDetails, projectID, billingStartDate, billingEndDate, vendor, term, paymentMode, employee, invoiceID, payStatus, apbased) {
            try {

                log.debug("createVendorBill", "Vendor Bill creation function for the project: " + projectID + " employee: " + employee)
                var vendorLookup = search.lookupFields({
                    type: "vendor",
                    id: vendor,
                    columns: ['representingsubsidiary', 'custentity_on_hold', 'custentity_clb_1099_eligible']
                });
                var repreSub = vendorLookup.representingsubsidiary;
                var eligible = vendorLookup.custentity_clb_1099_eligible;
                var vendhold = vendorLookup.custentity_on_hold;
                log.debug("represent Subsidiary", repreSub)

                var employeeLookup = search.lookupFields({
                    type: "employee",
                    id: employee,
                    columns: ['custentity_clb_entityid', 'custentity_asc_ref_number', 'releasedate']
                })

                var entityId = employeeLookup.custentity_clb_entityid;
                var refNum = employeeLookup.custentity_asc_ref_number;
                var terminationDate;
                if (employeeLookup.releasedate) {
                    terminationDate = new Date(employeeLookup.releasedate);
                }

                var serviceStartDate = new Date(billingStartDate);
                var serviceEndDate = new Date(billingEndDate);
                log.debug("serviceStartDate", serviceStartDate)
                log.debug("terminationDate", terminationDate)
                log.debug("serviceEndDate", serviceEndDate)
                var lastconsultantInv = false;
                if (terminationDate > serviceStartDate && terminationDate <= serviceEndDate && terminationDate) {
                    log.debug("termination date is between start and end date of service period")
                    billingEndDate = employeeLookup.releasedate
                    lastconsultantInv = true;
                }
                if (refNum) {
                    refNum = parseInt(refNum) + 1;
                }
                else {
                    refNum = 1;
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
                });
                entityId = entityId + "_" + refNum;

                if (terminationDate < serviceStartDate && terminationDate) {
                    log.debug("Employee is already terminated.")

                    log.error("Transaction Failure Report creation")
                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Vendor Bill Creation Failed because Employee is already Terminated", 2, projectID, employee)
                    log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                    return false;
                }
                else {

                    var vendorBillObj = record.create({
                        type: 'vendorbill',
                        isDynamic: true
                    });
                    vendorBillObj.setValue("entity", vendor)
                    vendorBillObj.setValue("terms", term)
                    vendorBillObj.setValue("subsidiary", 4); // Ascendion INC.
                    vendorBillObj.setValue("currency", 2); // Ascendion INC.
                    vendorBillObj.setValue("custbody_asc_ap_based", apbased)
                    var terms = vendorBillObj.getText("terms");
                    log.debug("terms", terms)

                    if (terms == "Pay When Paid" || payStatus == "2" || vendhold == true) {
                        vendorBillObj.setValue("paymenthold", true)
                    }
                    if (eligible) {
                        vendorBillObj.setValue("custbody_asc_1099_eligible", true)
                    }
                    vendorBillObj.setValue("custbody_clb_created_from_inv", invoiceID)
                    vendorBillObj.setValue("custbody_clb_startdate", new Date(billingStartDate))
                    vendorBillObj.setValue("custbody_clb_enddate", new Date(billingEndDate))
                    vendorBillObj.setValue("custbody_clb_paymentmode", paymentMode);
                    vendorBillObj.setValue("custbodyclb_vendorbillcatory", 5);
                    vendorBillObj.setValue("tranid", entityId);

                    if (lastconsultantInv) {
                        vendorBillObj.setValue("custbody_clb_lastconsultantbill", true);
                    }
                    if (repreSub.length > 0) {
                        vendorBillObj.setValue("approvalstatus", 2);
                    }
                    var timeSheetconsolidatedIDs = [];
                    Object.keys(vendorBillDetails).forEach(function (key) {
                        log.debug('Key : ' + key, ' Value : ' + JSON.stringify(vendorBillDetails[key]));
                        var trackTimeDetails = vendorBillDetails[key]
                        log.debug("trackTimeDetails[tracktimeId]", typeof (trackTimeDetails["tracktimeId"]))
                        timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);

                        var quantity = parseFloat(trackTimeDetails["hours"])
                        var timeRate = parseFloat(trackTimeDetails["payRate"]);
                        log.debug("Vendor Bill creation Function: quantity and timerate ", quantity + " : " + timeRate)

                        log.debug("Key", key.split("_")[0])
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
                    vendorBillObj.setValue({
                        fieldId: "custbody_asc_createdfromtimetrack",
                        value: timeSheetconsolidatedIDs
                    });
                    vendorBillObj.setValue({
                        fieldId: "job",
                        value: projectID
                    });
                    vendorBillObj.setValue({
                        fieldId: "custbody_asc_inv_project_selected",
                        value: projectID
                    });
                    var vbAmt = vendorBillObj.getValue("total");
                    var vbCurrency = vendorBillObj.getValue("currency");
                    var projSubsidiary = vendorBillObj.getValue("subsidiary");
                    var vendorBillID;
                    if (vbAmt > 0) {
                        vendorBillID = vendorBillObj.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        log.debug('vendorBillID', vendorBillID);
                    } else {
                        throw { message: "Vendor Bill Amount is less than 0 due to 0 hours for the week." }
                    }

                    if (vendorBillID) {
                        var vendorCrditId = "";
                        if(repreSub.length > 0  && (vendor == "83124" || vendor == "83125"))  {
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
                            log.debug("enside else")
                            var repreSubId = repreSub[0].value;
                            var selectedSubList = [11,10];
                            if (selectedSubList.findIndex(element => element == repreSubId) != -1) {
                                log.debug("repreSubId", repreSubId);
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
                                log.debug("representCust", representCust);
                                log.debug("vbCurrency", vbCurrency);
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
                                intrecompnayInvRec.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate))
                                intrecompnayInvRec.setValue("custbody_clb_periodendingdate", new Date(billingEndDate))
                                intrecompnayInvRec.setValue("terms", term);
                                Object.keys(vendorBillDetails).forEach(function (key) {
                                    log.debug('Key : ' + key, 'Value : ' + JSON.stringify(vendorBillDetails[key]));

                                    var trackTimeDetails = vendorBillDetails[key]
                                    timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);

                                    var quantity = parseFloat(trackTimeDetails["hours"])
                                    var timeRate = parseFloat(trackTimeDetails["payRate"]);
                                    log.debug("Vendor Bill creation Function: quantity and timerate ", quantity + " : " + timeRate)

                                    log.debug("Key", key.split("_")[0])
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
                        log.debug("update on timesheet starts:")
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
                        log.debug("update on timesheet ends:")
                    }

                    return vendorBillID;

                }
            } catch (e) {
                log.debug("Errot at Stage : createbill function", JSON.stringify(e))
                log.debug("Errot at Stage : createbill function", e.message)
                log.error("Transaction Failure Report creation")
                var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Vendor Bill Creation Failed due to: " + e.message, 2, projectID, employee)
                //log.error("Error in createInvoice: Created the Transaction Error ID", errID);
            }


        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    }); 