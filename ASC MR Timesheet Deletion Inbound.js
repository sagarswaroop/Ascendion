/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/runtime", "SuiteScripts/Projects/Library/Project Library.js", "N/config", "N/query"], (search, record, runtime, lib, config, query) => {
    const getInputData = (inputContext) => {
        try 
        {
            let timeTrackJson = getRequestPayload();
            return JSON.parse(timeTrackJson);
        } 
        catch(ex) 
        {
            log.error({ title: "Get Input Data", details: ex });
        }
    };
    const reduce = (context) => {
        log.debug("reduce: Context", context);
        //var isTransactionExist = context.key;
        let payloadData = JSON.parse(context.values);
        log.debug("payloadData", payloadData);
        let gcId = payloadData.gci_id;
        let periodDate = payloadData.pe_date;
        let uniqueId = payloadData.uniqueId;
        let workflowTaskId = payloadData.workflowTaskId;
        let invoiceID = 0;
        try 
        {
            
            var timeBills = getTimesheet(gcId, periodDate, workflowTaskId);
            var timeBillList = [];
            log.debug("timeTrackSearchObj result count", timeBills.length);
            if(timeBills.length > 0)
            {
                var isTransactionExist = false;
                timeBills.forEach(ts => {
                    let timeSheetID = ts.timeSheetID;
                    let invoiceID = ts.invId;
                    let vendBillId = ts.vendBillId;
                    let durationdecimal = ts.hours;
    
                    if(invoiceID || vendBillId) isTransactionExist = true;
    
                    timeBillList.push({timeSheetID: timeSheetID, invId: invoiceID, vendBillId: vendBillId, hours: durationdecimal});
                });
    
                if(timeBillList.length > 0) 
                {
                    timeBillList.forEach((obj) => {
                        if(isTransactionExist) 
                        {
                            if(obj.hours > 0 && obj.invId > 0)
                                invoiceID = obj.invId ? obj.invId : invoiceID;
                        } 
                        else 
                        {
                            let deleteTimeId = record.delete({type: "timebill", id: obj.timeSheetID});
                            log.debug({title: "Deleted Timesheet", details: deleteTimeId});
                            // log.debug("Un-billed Time sheet Delete process: End");
                        }
                    });
                }    
                if(invoiceID > 0) 
                {
                    var invoiceLookup = search.lookupFields({
                        type: search.Type.INVOICE,
                        id: invoiceID,
                        columns: [
                            "custbody_clb_periodstartingdate",
                            "custbody_clb_periodendingdate",
                            "statusref",
                            "custbody_clb_vendor_bill_links",
                            "custbody_asc_inv_project_selected",
                        ],
                    });
                    log.debug("Reduce:", "invoiceLookup:" + JSON.stringify(invoiceLookup));    
                    var invoiceStatus = invoiceLookup.statusref[0].value;
                    var vendorBillLinks = invoiceLookup.custbody_clb_vendor_bill_links;
                    log.debug("vendorBillLinks", vendorBillLinks);
                    log.debug("vendorBillLinks.length", vendorBillLinks.length);
                    var vcDet = {};
                    for(var vb = 0; vb < vendorBillLinks.length; vb++) 
                    {
                        var vendorcredit = reverseVB(vendorBillLinks[vb].value);
                        vcDet[vendorBillLinks[vb].value] = vendorcredit;
                        log.debug("vendorcredit created for Vendor Bill", vendorcredit);
                    }
                    var cmID = "";
                    if(invoiceStatus == "pendingApproval")
                    {
    
                        let deleteInv = record.delete({type: "invoice", id: invoiceID});    
                        timeBillList.forEach(obj => {
                            let deleteTimeId = record.delete({type: "timebill", id: obj.timeSheetID});
                            log.debug(`pending approval delete inv ${deleteInv} with ts ${deleteTimeId}`);
                        });
                    } 
                    else if(invoiceStatus == "open") 
                    {    
                        timeBillList.forEach(obj => {
                            reverseTimesheet(obj.timeSheetID);
                        });    
                        record.submitFields({
                            type: "invoice",
                            id: invoiceID,
                            values: {
                                memo: "Reversed the Invoice due to Timesheet Correction",
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true,
                            },
                        });
                        cmID = createCreditMemo(invoiceID);
                        log.debug("credit memo : ", cmID);
                        //  return cmID;
                    } 
                    else if(invoiceStatus == "paidInFull") 
                    {
    
                        timeBillList.forEach(obj => {
                            reverseTimesheet(obj.timeSheetID);
                        });    
                        var invoiceObj = record.load({type: record.Type.INVOICE, id: invoiceID, isDynamic: true,});
                        var lineNumber = invoiceObj.findSublistLineWithValue({sublistId: "links", fieldId: "type", value: "Payment"});
                        var customerName = invoiceObj.getText("entity");
                        var projectName = invoiceObj.getText("custbody_asc_inv_project_selected");
                        var invId = invoiceObj.getValue("tranid");
                        log.debug("invId: ", invId);
                        if(lineNumber > -1)
                        {
                            log.debug("payment record found.");
                            var paymentID = invoiceObj.getSublistValue({sublistId: "links", fieldId: "id", line: lineNumber});
                            log.debug("paymentID", paymentID);
                            var paymentObj = record.load({type: record.Type.CUSTOMER_PAYMENT, id: paymentID, isDynamic: true});
                            var invoiceLineNumber = paymentObj.findSublistLineWithValue({sublistId: "apply", fieldId: "internalid", value: invoiceID});
                            paymentObj.selectLine({sublistId: "apply", line: invoiceLineNumber});
                            paymentObj.setCurrentSublistValue({sublistId: "apply", fieldId: "apply", value: false});
                            paymentObj.commitLine({sublistId: "apply"});
                            var transId = paymentObj.getValue("checknumber") ? paymentObj.getValue("checknumber") : paymentObj.getValue("tranid");
                            var tranDate = paymentObj.getText("trandate");
                            var paymentObj = paymentObj.save({enableSourcing: false, ignoreMandatoryFields: true});
                            lib.sendEmail(customerName, projectName, transId, "Payment", tranDate, "Invoice", invId);
                            record.submitFields({
                                type: "invoice",
                                id: invoiceID,
                                values: {
                                    memo: "Reversed the Invoice due to Timesheet Correction",
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true,
                                },
                            });
                            cmID = createCreditMemo(invoiceID);
                            // return cmID;
                        }
                    }
    
                    log.debug("CM ID is", cmID);
    
                    if(cmID) 
                    {
                        timeBillList.forEach(obj => {
                            var oldTimeSheetID = record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: obj.timeSheetID,
                                values: {
                                    custcol_clb_credit_memo: cmID,
                                },
                                options: {
                                    enablesourcing: true,
                                },
                            });
                            log.debug("status update of old timesheet to updated :", oldTimeSheetID);
                        });
    
                    }
                }    
                let response = [];
                response.push({"status": "SUCCESS", "nsInternalId": (timeBillList.map(obj=> obj.timeSheetID)).toString(), "errorDetails": [], "entityId": uniqueId, "trandate": periodDate});                
                log.debug("for summary: ", response);    
                context.write({ key: uniqueId, value: response});
            }
            else
            {
                let response = [];
                response.push({"status": "SUCCESS", "nsInternalId": "", "errorDetails": [{name: "MISSING DATA", message: 'Timesheet not Available or deleted from the NetSuite'}], "entityId": uniqueId, "trandate": periodDate}); 
                log.debug("for summary: ", response);    
                context.write({key: uniqueId, value: response });
            }            
        } 
        catch(error) 
        {
            log.error({ title: "Reduce", details: ex });
            let response = [];
            response.push({"status": "FAILED", "nsInternalId": "", "errorDetails": [{name: "UNEXPECTED ERROR", message: error.message}], "entityId": uniqueId, "trandate": periodDate}); 
            context.write({key: uniqueId, value: response});
        }
    };
    const summarize = (context) => {
        try
        {
            let reponseArray = [];
            context.output.iterator().each(function (key, value) {
                log.debug("value in summary:", value);
                let reponseObj = JSON.parse(value);
                reponseObj["entityId"] = key;
                reponseArray.push(reponseObj);
                return true;
            });
            
            log.debug({ title: "reponseArray", details: reponseArray });
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({
                name: "custscript_ts_integration_del_rec_id",
            });
            if(reponseArray[0])
            {
                let recordIds = lib.createErrorRec(reponseArray[0], recordId, "4"); //Timesheet
                log.debug({ title: "Failed Record Id's", details: recordIds });
            }
            let updatedRecId = record.submitFields({
                type: "customrecord_intgrtn_mstr_rcrd_dtls",
                id: recordId,
                values: {
                    custrecord_int_rspns_pyld: JSON.stringify(reponseArray),
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                },
            });
            log.debug({ title: "updatedRecId", details: updatedRecId });
        } catch (ex) {
            log.error({ title: "Summarize", details: ex });
        }
    };

    function reverseVB(vbID) {
        try {
            log.debug("Reverse Vendor Bill created from Invoice");
            var configObj = config.load({
                type: config.Type.COMPANY_PREFERENCES,
            });
            var achFees = configObj.getValue("custscript_clb_ach_fee");
            var placeFees = configObj.getValue("custscript_clb_place_fee");
            var insuranceCharges = configObj.getValue(
                "custscript_clb_insurance_charge"
            );
            var calWHT = configObj.getValue("custscript_clb_california_wht");
            log.debug(
                "achFees : placeFees : insuranceCharges : calWHT",
                achFees + " : " + placeFees + " : " + insuranceCharges + " : " + calWHT
            );
            var vendorCreditid = "";
            var vendorCredit;
            //var remainingAmt = vbLookup.amountremaining;
            var vbObj = record.load({
                type: record.Type.VENDOR_BILL,
                id: vbID,
                isDynamic: true,
            });
            vbStatus = vbObj.getValue("status");
            log.debug("VB status", vbStatus);
            if (vbStatus == "Pending Approval") {
                let deleteRecordVB = record.delete({
                    type: record.Type.VENDOR_BILL,
                    id: vbID,
                });

                log.debug("Reduce: Vendor bill Delte id " + deleteRecordVB);
            } else if (vbStatus == "Paid In Full" || vbStatus == "Open") {
                var oldEntityId = vbObj.getValue("tranid");
                var periodStart = vbObj.getText("custbody_clb_startdate");
                var periodEnd = vbObj.getText("custbody_clb_enddate");
                var projectSelected = vbObj.getValue(
                    "custbody_asc_inv_project_selected"
                );
                var vendId = vbObj.getValue("entity");
                var revVBId = "";
                var linkLineCount = vbObj.getLineCount({
                    sublistId: "links",
                });
                var billCredits = {};
                log.debug("Total Credits Available", linkLineCount);
                if (linkLineCount > 0) {
                    for (var links = 0; links < linkLineCount; links++) {
                        var type = vbObj.getSublistValue({
                            sublistId: "links",
                            fieldId: "type",
                            line: links,
                        });
                        if (type == "Bill Credit") {
                            var docId = vbObj.getSublistValue({
                                sublistId: "links",
                                fieldId: "tranid",
                                line: links,
                            });
                            if (
                                docId.indexOf("ACH") >= 0 ||
                                docId.indexOf("PLACE") >= 0 ||
                                docId.indexOf("INSURE") >= 0 ||
                                docId.indexOf("CWHT") >= 0
                            ) {
                                var amount = vbObj.getSublistValue({
                                    sublistId: "links",
                                    fieldId: "total",
                                    line: links,
                                });
                                billCredits[docId] = amount;
                            }
                        }
                    }
                }
                var creditKeys = Object.keys(billCredits);
                log.debug("creditKeys", creditKeys);
                if (creditKeys.length > 0) {
                    log.debug("Creation of VB to adjust the AP Deductions");
                    var revVendBill = record.create({
                        type: record.Type.VENDOR_BILL,
                        isDynamic: true,
                    });
                    var reventityId = oldEntityId + "_APADJ";
                    log.debug("reventityId", reventityId);
                    revVendBill.setValue("entity", vendId);
                    revVendBill.setValue("tranid", reventityId);
                    revVendBill.setValue("custbody_asc_createdfromtimetrack", "");
                    revVendBill.setValue("approvalstatus", 2);

                    Object.keys(billCredits).forEach(function (key) {
                        revVendBill.selectNewLine("item");
                        if (key.indexOf("ACH") >= 0) {
                            revVendBill.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "item",
                                value: achFees,
                            });
                        }
                        if (key.indexOf("PLACE") >= 0) {
                            revVendBill.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "item",
                                value: placeFees,
                            });
                        }
                        if (key.indexOf("INSURE") >= 0) {
                            revVendBill.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "item",
                                value: insuranceCharges,
                            });
                        }
                        if (key.indexOf("CWHT") >= 0) {
                            revVendBill.setCurrentSublistValue({
                                sublistId: "item",
                                fieldId: "item",
                                value: calWHT,
                            });
                        }

                        revVendBill.setCurrentSublistValue("item", "quantity", 1);
                        revVendBill.setCurrentSublistValue(
                            "item",
                            "rate",
                            billCredits[key]
                        );
                        revVendBill.setCurrentSublistValue(
                            "item",
                            "custcol_clb_subconemployee",
                            employee
                        );
                        revVendBill.setCurrentSublistValue(
                            "item",
                            "customer",
                            projectSelected
                        );
                        // revVendBill.setCurrentSublistValue('item', 'custcol_fees_ap_deduction', parseFloat(insuranceCharges));

                        revVendBill.commitLine("item");
                    });
                    revVendBill.setValue("custbody_clb_startdate", new Date(periodStart));
                    revVendBill.setValue("custbody_clb_enddate", new Date(periodEnd));
                    revVendBill.setValue("custbodyclb_vendorbillcatory", 7);
                    revVendBill.setValue("custbody_asc_transaction_reversed", true);
                    revVendBill.setValue(
                        "memo",
                        "Vendor Bill created to Adjust AP Deductions."
                    );
                    revVendBill.setValue("custbody_clb_created_from_inv", "");
                    revVendBill.setValue(
                        "custbody_asc_inv_project_selected",
                        projectSelected
                    );
                    revVendBill.setValue("taxdetailsoverride", true);
                    revVBId = revVendBill.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    });
                    log.debug("Reversed Vendor Bill Created", revVBId);
                }

                var paymentID = "";
                var lineNumber = vbObj.findSublistLineWithValue({
                    sublistId: "links",
                    fieldId: "type",
                    value: "Bill Payment",
                });
                log.debug("lineNumber", lineNumber);
                if (lineNumber >= 0) {
                    paymentID = vbObj.getSublistValue({
                        sublistId: "links",
                        fieldId: "id",
                        line: lineNumber,
                    });
                    log.debug("paymentID", paymentID);
                }

                if (paymentID && vbStatus == "Paid In Full") {
                    log.debug("inside standalone vendor credit creation");
                    vendorCredit = record.transform({
                        fromType: record.Type.VENDOR_BILL,
                        fromId: vbID,
                        toType: record.Type.VENDOR_CREDIT,
                        isDynamic: true,
                    });
                    vendorCredit.setValue("taxdetailsoverride", true);
                    vendorCredit.setValue(
                        "memo",
                        "Vendor Credit created because of Change in Timesheet."
                    );
                    var vbentity = vendorCredit.getValue("tranid");
                    var entityId = "VC_" + vbentity + "_REV";
                    vendorCredit.setValue("tranid", entityId);
                    // var itemLineCount = vendorCredit.getLineCount({
                    if (revVBId) {
                        var vbLineNumber = vendorCredit.findSublistLineWithValue({
                            sublistId: "apply",
                            fieldId: "internalid",
                            value: revVBId,
                        });
                        log.debug("vbLineNumber", vbLineNumber);
                        if (vbLineNumber >= 0) {
                            vendorCredit.selectLine({
                                sublistId: "apply",
                                line: vbLineNumber,
                            });
                            vendorCredit.setCurrentSublistValue({
                                sublistId: "apply",
                                fieldId: "apply",
                                value: true,
                            });
                            vendorCredit.commitLine({
                                sublistId: "apply",
                            });
                        }
                    }
                    var vendorName = vendorCredit.getText("entity");
                    log.debug("vendorName: ", vendorName);
                    var projectName = vendorCredit.getText(
                        "custbody_asc_inv_project_selected"
                    );
                    log.debug("projectName: ", projectName);
                    var tranDate = vendorCredit.getValue("trandate");
                    vendorCreditid = vendorCredit.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    });
                    lib.sendEmail(
                        vendorName,
                        projectName,
                        entityId,
                        "Vendor Credit",
                        tranDate,
                        "Vendor Bill",
                        vbentity
                    );
                    log.debug("Reduce", "Vendor Credit Created: " + vendorCreditid);
                }
                if (vbStatus == "Open") {
                    log.debug("inside vendor credit creation");
                    vbObj.setValue(
                        "memo",
                        "Vendor Bill Reversed due to Timesheet changes"
                    );
                    //vbObj.setValue("approvalstatus",2)
                    var vbID = vbObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    });
                    vendorCredit = record.transform({
                        fromType: record.Type.VENDOR_BILL,
                        fromId: vbID,
                        toType: record.Type.VENDOR_CREDIT,
                        isDynamic: true,
                    });
                    vendorCredit.setValue("taxdetailsoverride", true);
                    vendorCredit.setValue(
                        "memo",
                        "Vendor Credit created because of Change in Timesheet"
                    );
                    vendorCredit.setValue("custbody_asc_createdfromtimetrack", "");
                    var entityId = "VC_" + vendorCredit.getValue("tranid") + "_REV";
                    vendorCredit.setValue("tranid", entityId);

                    var vbLineNumber = vendorCredit.findSublistLineWithValue({
                        sublistId: "apply",
                        fieldId: "internalid",
                        value: vbID,
                    });
                    log.debug("vbLineNumber", vbLineNumber);
                    if (vbLineNumber >= 0) {
                        vendorCredit.selectLine({
                            sublistId: "apply",
                            line: vbLineNumber,
                        });
                        vendorCredit.setCurrentSublistValue({
                            sublistId: "apply",
                            fieldId: "apply",
                            value: true,
                        });
                        vendorCredit.commitLine({
                            sublistId: "apply",
                        });
                    }
                    if (revVBId) {
                        vbLineNumber = vendorCredit.findSublistLineWithValue({
                            sublistId: "apply",
                            fieldId: "internalid",
                            value: revVBId,
                        });
                        log.debug("vbLineNumber", vbLineNumber);
                        if (vbLineNumber >= 0) {
                            vendorCredit.selectLine({
                                sublistId: "apply",
                                line: vbLineNumber,
                            });
                            vendorCredit.setCurrentSublistValue({
                                sublistId: "apply",
                                fieldId: "apply",
                                value: true,
                            });
                            vendorCredit.commitLine({
                                sublistId: "apply",
                            });
                        }
                    }
                    vendorCreditid = vendorCredit.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                    });
                    log.debug("Reduce", "Vendor Credit Created: " + vendorCreditid);
                }
            }
            return vendorCreditid;
        } catch (e) {
            log.debug("Errot at Stage : reverse Vendor Bill", JSON.stringify(e));
        }
    }

    function createCreditMemo(invoiceId) {
        try {
            log.debug("Create Credit Memo function");
            var cmObj = record.transform({
                fromType: record.Type.INVOICE,
                fromId: invoiceId,
                toType: record.Type.CREDIT_MEMO,
                isDynamic: true,
            });

            var cmObjid = cmObj.save({
                enableSourcing: false,
                ignoreMandatoryFields: true,
            });
            return cmObjid;
        } catch (e) {
            log.error("Error in createCreditMemo", JSON.stringify(e));
        }
    }

    let reverseTimesheet = (timesheetId) => {
        log.debug("reversal ts id", timesheetId);
        try {
            let copiedRecObj = record.copy({
                type: record.Type.TIME_BILL,
                id: timesheetId,
                isDynamic: true,
            });
            let hours = copiedRecObj.getValue({ fieldId: "hours" });
            let uniqueId = copiedRecObj.getValue({ fieldId: "custcol_clb_uniqueid" });
            // log.debug({title: "hours", details: hours+" : "+uniqueId});
            if (uniqueId.indexOf("_") > 0)
                uniqueId = uniqueId.substr(0, uniqueId.indexOf("_"));

            log.debug({ title: "Reverse TS Unique ID", details: uniqueId });
            copiedRecObj.setValue({ fieldId: "billed", value: false });
            copiedRecObj.setValue({ fieldId: "hours", value: -hours });
            copiedRecObj.setValue({
                fieldId: "custcol_clb_uniqueid",
                value: uniqueId + "_Rev",
            });
            copiedRecObj.setValue({fieldId: "custcol_asc_timesheet_status", value: 4});
            copiedRecObj.setValue({fieldId: "custcol_asc_timesheet_reversed", value: true});
            copiedRecObj.setValue({fieldId: "custcol_clb_pushedviaintegration", value: true});
            copiedRecObj.setValue({fieldId: "custcol_reversed_from_timesheet", value: timesheetId});
            copiedRecObj.setValue({ fieldId: "custcol_clb_invoice", value: "" });
            copiedRecObj.setValue({fieldId: "custcol_clb_vendor_bill_link", value: ""});
            copiedRecObj.setValue({ fieldId: "isbillable", value: false });

            let reversedTs = copiedRecObj.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
            });
            //log.debug({title: "reversedTs", details: reversedTs});

            let newUniqueId = uniqueId ? uniqueId + "_Updated" : "";

            record.submitFields({
                type: record.Type.TIME_BILL,
                id: timesheetId,
                values: {
                    custcol_asc_timesheet_status: 3,
                    //custcol_clb_timesheetupdated: true,
                    custcol_clb_uniqueid: newUniqueId
                },
            });
            return reversedTs;
        } catch (ex) {
            log.error({ title: "Reverse Billed Timesheet", details: ex });
            return { status: "Failed", message: ex.message };
        }
    };

    function deleteTimeTrack(timeSheetID) {
        let deleteTimeId = record.delete({
            type: "timebill",
            id: timeSheetID,
        });

        return deleteTimeId;
    }
    const getTimesheet = (gciId, weekendDate, taskId) =>{
        try
        {
            let timeBillList = [];
            let suiteQL = "SELECT tb.id, tb.custcol_clb_invoice, tb.custcol_clb_vendor_bill_link, tb.hours FROM timebill tb JOIN employee e ON tb.employee=e.id WHERE e.custentity_clb_entityid=? AND tb.custcol_clb_weekendingdate=?  AND tb.custcol_asc_workflow_taskid=? AND tb.timetype='A' AND tb.custcol_asc_timesheet_status='2'";
            let results =  query.runSuiteQLPaged({query: suiteQL, params: [gciId, weekendDate, taskId], pageSize: 1000}).iterator();       
            results.each(function(page) {
                let pageIterator = page.value.data.iterator();
                pageIterator.each(function(row) {
                    timeBillList.push({timeSheetID: row.value.getValue(0), invId: row.value.getValue(1), vendBillId: row.value.getValue(2), hours: row.value.getValue(3)});
                    return true;
                });
                return true;
            });
            return timeBillList;
        }
        catch(ex)
        {
            log.error({title: "Get Timesheets", details: ex});
        }
    };
    const getRequestPayload = () =>{
        try
        {
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_ts_integration_del_rec_id"});
            let suiteQL = "SELECT custrecord_int_rqst_pyld FROM customrecord_intgrtn_mstr_rcrd_dtls WHERE id='"+recordId+"'";
            let response = query.runSuiteQL(suiteQL);
            return response.results.length ? response.results[0].values[0] : "";
        }
        catch(ex)
        {
            log.error({title: "Get Request Payload", details: ex});
        }
    };
    return {
        getInputData: getInputData,
        // map: map,
        reduce: reduce,
        summarize: summarize,
    };
});