/**
** @NApiVersion 2.1
** @NScriptType MapReduceScript
** @NModuleScope SameAccount
*
** @libraries used:
                    
 
 -- Date--      -- Modified By--      --Requested By--     --Description
DD-MM-YYYY        Employee Name         Client Name           One line description
 
 */
define(['N/search', 'N/record', 'N/runtime', 'N/query', "N/config","./Projects/Library/Project Library.js"],
    function(search, record, runtime, query, config,lib) {
        function getInputData() {
            try {
                log.audit('getInputData', 'Start');
                var timebillSearchObj = search.create({
                    type: "timebill",
                    filters: [
                         // ["customer", "anyof", "101471"],
                         // "AND",
                        ["custcol_clb_timesheetupdated", "is", "T"],
                        "AND",
                        ["custcol_clb_vendor_bill_link", "noneof", "@NONE@"],
                        "AND",
                        ["custcol_asc_timesheet_status", "anyof", "3"],
                        "AND",
                        ["custcol_clb_vendor_bill_link.mainline", "is", "T"],
                        "AND",
                        ["custcol_vb_corrected", "is", "F"],
                        "AND",
                        ["custcol_clb_vendor_bill_link.custbody_asc_ap_based","anyof","2","3","4","5"]
                    ],
                    columns: [
                        search.createColumn({
                            name: "custcol_clb_vendor_bill_link",
                            sort: search.Sort.ASC,
                            label: "Vendor Bill Link"
                        })
                    ]
                });
                var searchResultCount = timebillSearchObj.runPaged().count;
                log.audit("Time Track update count:", searchResultCount)
                if (searchResultCount > 0) {
                    return timebillSearchObj;
                } else {
                    log.audit("No timesheet for correction are available");
                }

            } catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }

        }

        function map(context) {
            try {
                log.debug("Map Stage: ", "Timesheet ID" + context.key + " context.value" + JSON.stringify(context.value));
                var contextValue = JSON.parse(context.value);
                var timeSheetDetails = contextValue.values;
                var timeSheetID = context.key;

                var vbID = timeSheetDetails.custcol_clb_vendor_bill_link.value;
                var tsPrcsed = record.submitFields({
                    type: record.Type.TIME_BILL,
                    id: timeSheetID,
                    values: {
                        custcol_vb_corrected: true,
                        custcol_clb_vendor_bill_link: ''
                    },
                    options: {
                        enablesourcing: true,
                    }

                });
                //------------------------------Creation of negative timesheet-----------------------------------------
                // var timeSheetReversal = createReverseTimeCard(timeSheetDetails,timeSheetID);

                log.debug("vbID : timeSheetID", vbID + " : " + timeSheetID)

                if (vbID) {
                    context.write({
                        "key": vbID,
                        "value": timeSheetID
                    })
                }

            } catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }


        }

        function reduce(context) {
            try {
                var configObj = config.load({
                    type: config.Type.COMPANY_PREFERENCES
                });
                var achFees = configObj.getValue('custscript_clb_ach_fee');
                var placeFees = configObj.getValue('custscript_clb_place_fee');
                var insuranceCharges = configObj.getValue('custscript_clb_insurance_charge');
                var calWHT = configObj.getValue('custscript_clb_california_wht');
                log.debug("achFees : placeFees : insuranceCharges : calWHT", achFees + " : " + placeFees + " : " + insuranceCharges + " : " + calWHT)
                var vbID = context.key;
                var timesheetIds = context.values;
                log.debug("Reduce:", "vbID:" + vbID + " timesheetIds: " + JSON.stringify(timesheetIds))
                // log.debug("timesheetIds: ",typeof timesheetIds);
                var tsLookup = search.lookupFields({
                    type: search.Type.TIME_BILL,
                    id: timesheetIds[0],
                    columns: ['employee']
                });
                var empID = tsLookup.employee[0].value
                var vbLookup = search.lookupFields({
                    type: search.Type.VENDOR_BILL,
                    id: vbID,
                    columns: ['custbody_clb_startdate', 'custbody_clb_enddate', 'statusref', 'custbody_asc_inv_project_selected', 'amountremaining', 'entity']
                });
                log.debug("Reduce:", "vbLookup:" + JSON.stringify(vbLookup))

                var remainingVbAmt = vbLookup.amountremaining;
                log.debug("remainingVbAmt", remainingVbAmt);
                var periodStartDate = vbLookup.custbody_clb_startdate;
                log.debug("periodStartDate", periodStartDate);
                var periodEndDate = vbLookup.custbody_clb_enddate;
                log.debug("periodEndDate", periodEndDate);
                var vbStatus = vbLookup.statusref[0].value;
                log.debug("vbStatus", vbStatus);
                var vendorId = vbLookup.entity[0].value
                log.debug("vendorId", vendorId);
                // var timetrackLinks = vbLookup.custbody_asc_createdfromtimetrack;
                // log.debug("timetrackLinks",timetrackLinks);
                var project = vbLookup.custbody_asc_inv_project_selected[0].value;
                log.debug("project", project);
                var timebillSearchObj = search.create({
                    type: "timebill",
                    filters: [
                        ["customer", "anyof", project],
                        "AND",
                        ["date", "within", periodStartDate, periodEndDate],
                        "AND",
                        ["custcol_asc_timesheet_status", "anyof", "2", "1"],
                        "AND",
                        ["employee", "anyof", empID]
                    ],
                    columns: [
                        search.createColumn({
                            name: "custitem_clb_projecttasktype",
                            join: "item",
                            label: "Project Task Type"
                        }),
                        search.createColumn({
                            name: "custcol_asc_payrete",
                            label: "Pay Rate"
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "item",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "durationdecimal",
                            label: "Duration (Decimal)"
                        })
                    ]
                });
                var searchResultCount = timebillSearchObj.runPaged().count;
                log.debug("Reduce Stage: track time result count", searchResultCount);
                if (searchResultCount > 0) {
                    var vendorBillDetails = {};
                    timebillSearchObj.run().each(function(result) {
                        var trackTimeID = result.id;
                        var taskID = result.getValue({
                            name: "internalid",
                            join: "item",
                        });
                        var hoursDecimal = result.getValue("durationdecimal") ? result.getValue("durationdecimal") : 0;
                        var payRate = result.getValue("custcol_asc_payrete") ? result.getValue("custcol_asc_payrete") : 0;
                        taskID = taskID + "_" + payRate;
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
                    var vendBillID = createVendorBill(vendorBillDetails, project, periodStartDate, periodEndDate, vbID, vbStatus, empID, remainingVbAmt, vendorId, achFees, placeFees, insuranceCharges, calWHT);
                    log.debug("Reduce Stage: vendBillID: ", vendBillID);

                }

                // for(var vb=0;vb<vendorBillLinks.length;vb++){
                //     var vendorcredit = reverseVB(vendorBillLinks[vb].value)
                //     log.debug("vendorcredit created for Vendor Bill",vendorcredit);

                // }    
                // log.debug("Create Remaining timesheet reversal:");
                // var timebillSearchObj = search.create({
                //     type: "timebill",
                //     filters:
                //     [
                //        ["custcol_clb_timesheetupdated","is","F"], 
                //        "AND", 
                //        ["custcol_clb_invoice","anyof",invoiceID], 
                //        "AND", 
                //        ["custcol_asc_timesheet_status","anyof","2"], 
                //        "AND", 
                //        ["status","is","F"], 
                //        "AND", 
                //        ["custcol_clb_invoice.mainline","is","T"]
                //     ],
                //     columns:[
                //         search.createColumn({ name: "custcol_clb_invoice"}),
                //         search.createColumn({name: "customer"}),
                //         search.createColumn({name: "employee"}),
                //         search.createColumn({name: "durationdecimal"}),
                //         search.createColumn({ name: "casetaskevent" }),
                //         search.createColumn({
                //             name: "internalid",
                //             join: "item"
                //         }),
                //         search.createColumn({name: "custcol_clb_timesheettype"}),
                //         search.createColumn({name: "isbillable"}),
                //         search.createColumn({name: "custcol_clb_weekendingdate"}),
                //         search.createColumn({name: "custcol_clb_weekendingday"}),
                //         search.createColumn({name: "date"})
                //     ]

                //  });
                //  var remainingTimeTrackCount = timebillSearchObj.runPaged().count;
                //  log.audit("Time Track update count:",remainingTimeTrackCount)
                //  if(remainingTimeTrackCount>0){
                //     timebillSearchObj.run().each(function(result){
                //         var hoursinDecimal = result.getValue("durationdecimal")
                //         var customer = result.getValue("customer")
                //         if(uniqueProjects.indexOf(customer) == -1){
                //             uniqueProjects.push(customer);
                //         }
                //         var timebill = createReversalandNewTimeCard(result,result.id,hoursinDecimal);
                //         return true;
                //      });

                //  }


                // log.debug("periodStartDate:periodEndDate ", periodStartDate + " : "+ periodEndDate + " Status: "+invoiceStatus);
                // var newInvoiceCreation = createInvoice(invoiceID,periodStartDate,periodEndDate,uniqueProjects)
                // log.debug("new Invoice Created:",newInvoiceCreation);
                // if(invoiceStatus == "pendingApproval"){
                //     record.submitFields({
                //         type: "invoice",
                //         id: invoiceID,
                //         values: {
                //             "approvalstatus": 2,
                //             "memo": "Reversed the Invoice due to Timesheet Correction"
                //         },
                //         options: {
                //             enableSourcing: false,
                //             ignoreMandatoryFields: true
                //         }
                //     })  
                //     var cmID =  createCreditMemo(invoiceID);
                //     log.debug("credit memo : ",cmID)
                //     return cmID;
                // }
                // else if(invoiceStatus == "open"){
                //     record.submitFields({
                //         type: "invoice",
                //         id: invoiceID,
                //         values: {
                //             "memo": "Reversed the Invoice due to Timesheet Correction"
                //         },
                //         options: {
                //             enableSourcing: false,
                //             ignoreMandatoryFields: true
                //         }
                //     }) 
                //     var cmID =  createCreditMemo(invoiceID);
                //     log.debug("credit memo : ",cmID)
                //     return cmID;

                // }
                // else if(invoiceStatus == "paidInFull"){
                //     var invoiceObj = record.load({
                //         type: record.Type.INVOICE,
                //         id: invoiceID,
                //         isDynamic: true,
                //        });
                //     var lineNumber = invoiceObj.findSublistLineWithValue({
                //         sublistId: 'links',
                //         fieldId: 'type',
                //         value: "Payment"
                //        });
                //     var paymentID = invoiceObj.getSublistValue({
                //         sublistId: 'links',
                //         fieldId: 'id',
                //         line: lineNumber
                //        }); 
                //     log.debug("paymentID", paymentID)  
                //     if(paymentID){
                //         var paymentObj = record.load({
                //             type: record.Type.CUSTOMER_PAYMENT,
                //             id: paymentID,
                //             isDynamic: true,
                //         });
                //         var invoiceLineNumber = paymentObj.findSublistLineWithValue({
                //             sublistId: 'apply',
                //             fieldId: 'internalid',
                //             value: invoiceID
                //            }); 
                //         paymentObj.selectLine({
                //             sublistId: 'apply',
                //             line: invoiceLineNumber
                //         });
                //         paymentObj.setCurrentSublistValue({
                //             sublistId: 'apply',
                //             fieldId: 'apply',
                //             value: false
                //         });
                //         paymentObj.commitLine({
                //             sublistId: 'apply'
                //         });
                //        var paymentObj = paymentObj.save({
                //             enableSourcing: false,
                //             ignoreMandatoryFields: true
                //             }); 
                //     }
                //     invoiceObj.setValue("memo", "Reversed the Invoice due to Timesheet Correction")
                //     var invoiceID = invoiceObj.save({
                //         enableSourcing: false,
                //         ignoreMandatoryFields: true
                //     });
                //     var cmID =  createCreditMemo(invoiceID);
                //         return cmID;   

                // }


            } catch (e) {
                log.debug("Errot at Stage : Reduce", JSON.stringify(e))
            }
        }

        function createVendorBill(vendorBillDetails, project, periodStartDate, periodEndDate, vbID, vbStatus, empID, remainingAmt, vendorId, achFees, placeFees, insuranceCharges, calWHT) {
            try {
                // log.debug("vendorBillDetails: " ,JSON.stringify(vendorBillDetails));

                log.debug("createVendorBill", "vendor bill updation/creation function for the project: " + project) // + " employee: "+employee)
                var vendorLookup = search.lookupFields({
                    type: "vendor",
                    id: vendorId,
                    columns: ['representingsubsidiary']
                });
                var repreSub = vendorLookup.representingsubsidiary;


                log.debug("represent Subsidiary", repreSub);

                if (vbStatus == "pendingApproval") {
                    var vendorBillObj = record.load({
                        type: record.Type.VENDOR_BILL,
                        id: vbID,
                        isDynamic: true,
                    });
                    var timeSheetconsolidatedIDs = [];
                    var itemLineCount = vendorBillObj.getLineCount({
                        sublistId: 'item'
                    });
                    log.debug("Exisiting Lines: ", itemLineCount);
                    if (itemLineCount > 0) {
                        log.debug("Removing old lines of vbs")
                        for (var rm = 0; rm < itemLineCount; rm++) {
                            log.debug("removing line item:", rm)
                            vendorBillObj.removeLine({
                                sublistId: 'item',
                                line: 0,
                                ignoreRecalc: true
                            });

                        }
                    }
                    Object.keys(vendorBillDetails).forEach(function(key) {
                        log.debug('Key : ' + key, ' Value : ' + JSON.stringify(vendorBillDetails[key]));
                        var trackTimeDetails = vendorBillDetails[key]
                        timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);

                        var quantity = parseFloat(trackTimeDetails["hours"])
                        var timeRate = parseFloat(trackTimeDetails["payRate"]);
                        var taskType = trackTimeDetails["taskType"];

                        log.debug("Invoice creation Function: quantity ", quantity)

                        log.debug("Key", key.split("_")[0])
                        if (timeRate > 0 && quantity > 0) {
                            log.debug("inside item add")
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
                                value: empID
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'customer',
                                value: project
                            });
                            vendorBillObj.commitLine({
                                sublistId: 'item'
                            });
                            log.debug("committed line")

                        }



                    });
                    log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs + " : " + timeSheetconsolidatedIDs.length)
                    vendorBillObj.setValue("custbody_asc_createdfromtimetrack", timeSheetconsolidatedIDs); //use settext if doesnt work

                    var vendorID = vendorBillObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    if (vendorID) {
                        for (var ii = 0; ii < timeSheetconsolidatedIDs.length; ii++) {
                            record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: timeSheetconsolidatedIDs[ii],
                                values: {
                                    "custcol_clb_vendor_bill_link": vendorID
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            })
                        }
                    }

                    return vendorID;

                }
                if (vbStatus == "paidInFull" || vbStatus == "open") {
                    //------------logic for creating new Vb----------------
                    var vendorBillObj = record.load({
                        type: record.Type.VENDOR_BILL,
                        id: vbID,
                        isDynamic: true,
                    });
                    var oldEntityId = vendorBillObj.getValue("tranid");
                    var periodStart = vendorBillObj.getText('custbody_clb_startdate');
                    var periodEnd = vendorBillObj.getText('custbody_clb_enddate');
                    var projectSelected = vendorBillObj.getValue("custbody_asc_inv_project_selected");
                    var vendId = vendorBillObj.getValue("entity");
                    var linkLineCount = vendorBillObj.getLineCount({
                        sublistId: 'links'
                    });
                    var billCredits = {};
                    var revVBId = '';
                    log.debug("Total Credits Available", linkLineCount)
                    if (linkLineCount > 0) {

                        for (var links = 0; links < linkLineCount; links++) {
                            var type = vendorBillObj.getSublistValue({
                                sublistId: 'links',
                                fieldId: 'type',
                                line: links
                            });
                            if (type == "Bill Credit") {
                                var docId = vendorBillObj.getSublistValue({
                                    sublistId: 'links',
                                    fieldId: 'tranid',
                                    line: links
                                });
                                if (docId.indexOf("ACH") >= 0 || docId.indexOf("PLACE") >= 0 || docId.indexOf("INSURE") >= 0 || docId.indexOf("CWHT") >= 0) {
                                    var amount = vendorBillObj.getSublistValue({
                                        sublistId: 'links',
                                        fieldId: 'total',
                                        line: links
                                    });
                                    billCredits[docId] = amount;
                                }
                            }
                        }
                    }
                    var creditKeys = Object.keys(billCredits);
                    log.debug("creditKeys", creditKeys)
                    if (creditKeys.length > 0) {
                        log.debug("Creation of VB to adjust the AP Deductions")
                        var revVendBill = record.create({
                            type: record.Type.VENDOR_BILL,
                            isDynamic: true
                        });
                        var reventityId = oldEntityId + '_APADJ'
                        log.debug("reventityId", reventityId)
                        revVendBill.setValue("entity", vendId)
                        revVendBill.setValue("tranid", reventityId);
                        revVendBill.setValue('custbody_asc_createdfromtimetrack', "");
                        revVendBill.setValue("approvalstatus", 2);


                        Object.keys(billCredits).forEach(function(key) {

                            revVendBill.selectNewLine('item');
                            if (key.indexOf("ACH") >= 0) {
                                revVendBill.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: achFees
                                });
                            }
                            if (key.indexOf("PLACE") >= 0) {
                                revVendBill.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: placeFees
                                });
                            }
                            if (key.indexOf("INSURE") >= 0) {
                                revVendBill.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: insuranceCharges
                                });
                            }
                            if (key.indexOf("CWHT") >= 0) {
                                revVendBill.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: calWHT
                                });
                            }

                            revVendBill.setCurrentSublistValue('item', 'quantity', 1);
                            revVendBill.setCurrentSublistValue('item', 'rate', billCredits[key]);
                            revVendBill.setCurrentSublistValue('item', 'custcol_clb_subconemployee', empID);
                            revVendBill.setCurrentSublistValue('item', 'customer', projectSelected);
                            // revVendBill.setCurrentSublistValue('item', 'custcol_fees_ap_deduction', parseFloat(insuranceCharges));

                            revVendBill.commitLine('item');
                        });
                        revVendBill.setValue("custbody_clb_startdate", new Date(periodStart))
                        revVendBill.setValue("custbody_clb_enddate", new Date(periodEnd))
                        revVendBill.setValue("custbodyclb_vendorbillcatory", 7);
                        revVendBill.setValue("custbody_asc_transaction_reversed", true)
                        revVendBill.setValue("memo", "Vendor Bill created to Adjust AP Deductions.")
                        revVendBill.setValue('custbody_clb_created_from_inv', '')
                        revVendBill.setValue("custbody_asc_inv_project_selected", projectSelected);
                        revVendBill.setValue("taxdetailsoverride", true)
                        revVBId = revVendBill.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        log.debug("Reversed Vendor Bill Created", revVBId);
                    }
                    //------------new logic ends-----------------

                    var employeeID = search.lookupFields({
                        type: "employee",
                        id: empID,
                        columns: ['custentity_clb_entityid', 'custentity_asc_ref_number', 'releasedate']
                    });
                    var entityId = employeeID.custentity_clb_entityid;
                    var refNum = employeeID.custentity_asc_ref_number;
                    if (refNum) {
                        refNum = parseInt(refNum) + 1;
                    } else {
                        refNum = 1;
                    }
                    entityId = entityId + "_" + refNum;
                    //creation of new VB-----
                    var newvbObject = record.copy({
                        type: record.Type.VENDOR_BILL,
                        id: vbID,
                        isDynamic: true
                    });
                    var timeSheetconsolidatedIDs = [];
                    if (repreSub.length > 0) {
                        newvbObject.setValue("approvalstatus", 2);
                    }
                    newvbObject.setValue("tranid", entityId);
                    var itemLineCount = newvbObject.getLineCount({
                        sublistId: 'item'
                    });
                    log.debug("Exisiting Lines: ", itemLineCount);
                    if (itemLineCount > 0) {
                        log.debug("Removing old lines of vbs")
                        for (var rm = 0; rm < itemLineCount; rm++) {
                            newvbObject.removeLine({
                                sublistId: 'item',
                                line: 0,
                                ignoreRecalc: true
                            });

                        }
                    }
                    Object.keys(vendorBillDetails).forEach(function(key) {
                        log.debug('Key : ' + key, ' Value : ' + JSON.stringify(vendorBillDetails[key]));
                        var trackTimeDetails = vendorBillDetails[key]
                        timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);

                        var quantity = parseFloat(trackTimeDetails["hours"])
                        var timeRate = parseFloat(trackTimeDetails["payRate"]);
                        log.debug("VB creation Function: quantity ", quantity)

                        log.debug("Key", key.split("_")[0])
                        if (timeRate > 0 && quantity > 0) {
                            log.debug("inside item add")
                            newvbObject.selectNewLine({
                                sublistId: 'item'
                            });
                            newvbObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: key.split("_")[0]
                            });
                            newvbObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: quantity
                            });
                            newvbObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: timeRate
                            });
                            newvbObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_clb_subconemployee',
                                value: empID
                            });
                            newvbObject.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'customer',
                                value: project
                            });
                            newvbObject.commitLine({
                                sublistId: 'item'
                            });
                            log.debug("committed line")

                        }
                    });
                    log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs + " : " + timeSheetconsolidatedIDs.length)
                    newvbObject.setValue("custbody_asc_createdfromtimetrack", timeSheetconsolidatedIDs); //use settext if doesnt work
                    var vbCurrency = newvbObject.getValue("currency");
                    var projSubsidiary = newvbObject.getValue("subsidiary");
                    var newvendorID = newvbObject.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    var vendorCrditId = ""
                    if(repreSub.length>0 && newvendorID && vendorId =="83124") {
                        //  var entityId = vbObj.getValue('tranid');
                             var cmentityId = "VC_"+entityId+"_REV"
                              log.debug("Reversing VB as it is intercompany vendor")
                              var vendorCredit = record.transform({
                                  fromType: record.Type.VENDOR_BILL,
                                  fromId: newvendorID,
                                  toType: record.Type.VENDOR_CREDIT,
                                  isDynamic: true,
                              });
                              vendorCredit.setValue("tranid",cmentityId)
                              vendorCredit.setValue("taxdetailsoverride",true)
                              vendorCredit.setValue("memo", "Vendor Bill Reversed due to Intercompany Vendor")
                              var vbLineNumber = vendorCredit.findSublistLineWithValue({
                                  sublistId: 'apply',
                                  fieldId: 'internalid',
                                  value: newvendorID
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
                               vendorCrditId= vendorCredit.save({
                                  enableSourcing: false,
                                  ignoreMandatoryFields: true
                              });
                              log.debug("Vendor Bill Reversed due to intercompany vendor",vendorCrditId)
                      }
                    
                    if (newvendorID) {
                        for (var ii = 0; ii < timeSheetconsolidatedIDs.length; ii++) {
                            record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: timeSheetconsolidatedIDs[ii],
                                values: {
                                    "custcol_clb_vendor_bill_link": newvendorID,
                                    "custcol_clb_vendor_credit":vendorCrditId
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            })
                        }
                        record.submitFields({
                            type: record.Type.EMPLOYEE,
                            id: empID,
                            values: {
                                "custentity_asc_ref_number": refNum
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                    //-------------------------   

                    var paymentID = "";
                    var lineNumber = vendorBillObj.findSublistLineWithValue({
                        sublistId: 'links',
                        fieldId: 'type',
                        value: 'Bill Payment'
                    });
                    log.debug("lineNumber", lineNumber);
                    if (lineNumber >= 0) {

                        paymentID = vendorBillObj.getSublistValue({
                            sublistId: 'links',
                            fieldId: 'id',
                            line: lineNumber
                        });
                        log.debug("paymentID", paymentID)
                    }

                    if (paymentID && vbStatus == "paidInFull") {
                        log.debug("inside standalone vendor credit creation")
                        var vendorCredit = record.transform({
                            fromType: record.Type.VENDOR_BILL,
                            fromId: vbID,
                            toType: record.Type.VENDOR_CREDIT,
                            isDynamic: true,
                        });
                        var vendorName = vendorCredit.getText("entity");
                            log.debug("vendorName: ",vendorName)
                            var projectName = vendorCredit.getText("custbody_asc_inv_project_selected");
                            log.debug("projectName: ",projectName)
                            var tranDate = vendorCredit.getValue("trandate");

                        vendorCredit.setValue("taxdetailsoverride", true)
                        vendorCredit.setValue("memo", "Vendor Credit created because of Hour Corrections.")
                        var vbentity = vendorCredit.getValue("tranid")
                        var entityId = "VC_" + vbentity + "_REV"
                        vendorCredit.setValue("tranid", entityId)
                        if (revVBId) {
                            var vbLineNumber = vendorCredit.findSublistLineWithValue({
                                sublistId: 'apply',
                                fieldId: 'internalid',
                                value: revVBId
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
                        }
                        var vendorCredit = vendorCredit.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        lib.sendEmail(vendorName, projectName, entityId, "Vendor Credit",tranDate,"Vendor Bill",entityId)
                        log.debug("Reduce", "Vendor Credit Created: " + vendorCredit)

                        if(vendorCredit){
                            
                        }

                    }
                    if (vbStatus == "open") {
                        log.debug("inside vendor credit creation")
                        var vendorCredit = record.transform({
                            fromType: record.Type.VENDOR_BILL,
                            fromId: vbID,
                            toType: record.Type.VENDOR_CREDIT,
                            isDynamic: true,
                        });
                        vendorCredit.setValue("taxdetailsoverride", true)
                        vendorCredit.setValue("memo", "Vendor Credit created because of Hour corrections.")
                        vendorCredit.setValue("custbody_asc_createdfromtimetrack", "");
                        var entityId = "VC_" + vendorCredit.getValue("tranid") + "_REV"
                        vendorCredit.setValue("tranid", entityId)
                        var vbLineNumber = vendorCredit.findSublistLineWithValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            value: vbID
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
                        if (revVBId) {
                            vbLineNumber = vendorCredit.findSublistLineWithValue({
                                sublistId: 'apply',
                                fieldId: 'internalid',
                                value: revVBId
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
                        }
                        var vendorCredit = vendorCredit.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        log.debug("Reduce", "Vendor Credit Created: " + vendorCredit)


                    }
                    var vendorBillObj = record.load({
                        type: record.Type.VENDOR_BILL,
                        id: vbID,
                        isDynamic: true,
                    });
                    vendorBillObj.setValue("custbody_asc_transaction_reversed", true)
                    vendorBillObj.setValue("memo", "Reversed the transaction because of Hour Correction.")
                    vendorBillObj.setValue('custbody_clb_created_from_inv', '')
                    vendorBillObj.setValue('custbody_asc_createdfromtimetrack', '')
                    vendorBillObj.setValue("taxdetailsoverride", true)
                    var vbID = vendorBillObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    log.debug("Vendor Bill Updation Completed");

                    return newvendorID;
                }


            } catch (e) {
                log.debug("Errot at Stage : createVendorBill function", JSON.stringify(e))
                //return "No invoice created due to error."
            }


        }

        function summarize(context) {
            log.debug("reduce summary:", JSON.stringify(context.reduceSummary));
            log.debug("Map summary:", JSON.stringify(context.mapSummary))

        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });