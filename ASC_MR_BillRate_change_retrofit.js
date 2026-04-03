/**
** @NApiVersion 2.1
** @NScriptType MapReduceScript
** @NModuleScope SameAccount
*
** @libraries used:     
 -- Date--      -- Modified By--      --Requested By--     --Description
DD-MM-YYYY        Employee Name         Client Name           One line description 
 */
define(['N/search', 'N/record', 'N/runtime', "./Projects/Library/Project Library.js"], (search, record, runtime, lib) => {
    const getInputData = () => {
        try {
            let scriptParam = runtime.getCurrentScript().getParameter({ name: 'custscript_asc_invoice_process' });
            let jsonData = JSON.parse(scriptParam);
            log.debug("jsonData: ", JSON.stringify(jsonData));
            let invoiceIDs = jsonData.invoiceID;
            let projectType = jsonData.projectType;
            let billingRateDetails = search.lookupFields({
                type: "customrecord_clb_subconbillrate",
                id: jsonData.billRateID,
                columns: ['custrecord_clb_billrate', 'custrecord_clb_proj_bill', 'custrecord_clb_tastype_bill', 'custrecord_clb_subconbillrecord', 'custrecord_clb_eff_date']
            });
            log.debug("billingRateDetails", JSON.stringify(billingRateDetails));
            let billRate = billingRateDetails.custrecord_clb_billrate;
            let billRateProject = billingRateDetails.custrecord_clb_proj_bill[0].value;
            let billRateTask = billingRateDetails.custrecord_clb_tastype_bill[0].value;
            let employeeRec = billingRateDetails.custrecord_clb_subconbillrecord[0].value;
            let effDate = billingRateDetails.custrecord_clb_eff_date;
            log.debug("GetinputData", "billRate:billRateProject:billRateTask:employeeRec:effDate " + billRate + " :  " + billRateProject + " :  " + billRateTask + " :  " + employeeRec + " : " + effDate);
            let customerPODetail = getPODetails(effDate, billRateProject);
            let processInvoice = {};
            for (let ii = 0; ii < invoiceIDs.length; ii++) {
                let values = {};
                values["id"] = invoiceIDs[ii];
                values["billRate"] = billRate
                values["billRateProject"] = billRateProject;
                values["billRateTask"] = billRateTask;
                values["employeeRec"] = employeeRec;
                values["effDate"] = effDate;
                values["projectType"] = projectType
                values["customerPODetail"] = customerPODetail
                processInvoice[invoiceIDs[ii]] = values;
            }
            log.debug("getInputData: ", "processInvoice obj: " + JSON.stringify(processInvoice));
            return processInvoice;
        }
        catch (e) {
            log.error({ title: "Get Input Data", details: e });
        }
    };
    const reduce = (context) => {
        try {
            let invoiceID = context.key;
            let invoiceDetails = JSON.parse(context.values[0]);
            log.debug("Reduce Stage: invoiceDetails: Internal ID: ", invoiceID);
            log.debug("Reduce Stage: Invoice Details", JSON.stringify(invoiceDetails));
            let newbillRate = invoiceDetails.billRate;
            let billRateProject = invoiceDetails.billRateProject;
            let billRateTask = invoiceDetails.billRateTask;
            let employee = invoiceDetails.employeeRec
            let effDate = invoiceDetails.effDate;
            let projectType = invoiceDetails.projectType;
            let customerPODetail = false;
            //log.debug("invoiceDetails.customerPODetail",invoiceDetails.customerPODetail);
            if (invoiceDetails.customerPODetail) {
                customerPODetail = JSON.parse(JSON.stringify(invoiceDetails.customerPODetail));
            }
            let timesheetIDs = [];
            search.create({
                type: "timebill",
                filters: [
                    ["custcol_clb_invoice.internalidnumber", "equalto", invoiceID], "AND",
                    ["custcol_clb_invoice.mainline", "is", "T"]
                ],
                columns: []
            }).run().each(function (result) {
                timesheetIDs.push(result.id);
                return true;
            });
            log.debug("timesheetIDs", timesheetIDs)
            let invoiceObj = record.load({ type: record.Type.INVOICE, id: invoiceID, isDynamic: true });
            let invoiceStatus = invoiceObj.getValue("status");
            let invProject = invoiceObj.getValue("custbody_asc_inv_project_selected");
            let billingStartDate = invoiceObj.getText("custbody_clb_periodstartingdate");
            let billingEndDate = invoiceObj.getText("custbody_clb_periodendingdate");
            log.debug("invoiceStatus", invoiceStatus)
            let memo = invoiceObj.getValue("memo");
            log.debug("memo", memo)
            let splitDate = "nosplit";
            if (memo.indexOf('Reversed') < 0) {
                if (new Date(billingStartDate) < new Date(effDate) && new Date(billingEndDate) > new Date(effDate)) {
                    splitDate = effDate;
                }
                if ((projectType == 1 || projectType == 2) && splitDate != "nosplit") {
                    log.debug("ProjectType is T&M Individual and Split Invoice is true");
                    if (invoiceStatus == "Pending Approval") {
                        log.debug("inside penidng aproval", invoiceStatus)
                        let splitTimeCard = [];
                        for (let ii = 0; ii < timesheetIDs.length; ii++) {
                            let lineNumber = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: timesheetIDs[ii] });
                            if (lineNumber > -1) {
                                let timeDate = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'billeddate', line: lineNumber });
                                log.debug("timeDate", timeDate)
                                log.debug("split Date", splitDate);
                                if (new Date(timeDate) >= new Date(splitDate)) {
                                    invoiceObj.selectLine({ sublistId: 'time', line: lineNumber });
                                    invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'apply', value: false });
                                    invoiceObj.commitLine({ sublistId: 'time' });
                                    let splittsupdate = record.submitFields({
                                        type: record.Type.TIME_BILL,
                                        id: timesheetIDs[ii],
                                        values: {
                                            custcol_clb_billrate: parseFloat(newbillRate),
                                            custcol_clb_invoice: "",

                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                    splitTimeCard.push(splittsupdate);

                                }
                            }
                            else {
                                let dateLookup = search.lookupFields({
                                    type: search.Type.TIME_BILL,
                                    id: timesheetIDs[ii],
                                    columns: ['date']
                                })
                                let date = dateLookup.date;
                                log.debug("date for 0 duration ts ", date);
                                if (new Date(date) >= new Date(splitDate)) {
                                    splitTimeCard.push(timesheetIDs[ii]);
                                }
                            }
                        }
                        invoiceObj.setValue("memo", "Invoice Amount adjusted due to new Bill Rate.");
                        let yesterday = new Date(splitDate);
                        yesterday.setDate(yesterday.getDate() - 1);

                        invoiceObj.setValue("custbody_clb_periodendingdate", yesterday);
                        let invoiceID = invoiceObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                        let newInvCreate = createInvoice(invoiceObj, splitTimeCard, customerPODetail, splitDate, billingEndDate)
                        log.debug("New Invoice ID: ", newInvCreate)
                       
                    }
                    else if (invoiceStatus == "Paid In Full" || invoiceStatus == "Open") {
                        let cmID = ""
                        let customerName = invoiceObj.getText("entity");
                        //log.debug("customerName: ",customerName)
                        let projectName = invoiceObj.getText("custbody_asc_inv_project_selected");
                        log.debug("projectName: ", projectName)
                        let invId = invoiceObj.getValue("tranid");
                        log.debug("invId: ", invId)

                        let lineNumber = invoiceObj.findSublistLineWithValue({ sublistId: 'links', fieldId: 'type', value: "Payment" });
                        log.debug("lineNumber", lineNumber)
                        if (lineNumber >= 0) {
                            let paymentID = invoiceObj.getSublistValue({ sublistId: 'links', fieldId: 'id', line: lineNumber });
                            log.debug("paymentID", paymentID);
                            let paymentObj = record.load({
                                type: record.Type.CUSTOMER_PAYMENT,
                                id: paymentID,
                                isDynamic: true,
                            });
                            let transId = paymentObj.getValue("checknumber") ? paymentObj.getValue("checknumber") : paymentObj.getValue("tranid");
                            let tranDate = paymentObj.getText("trandate");
                            let invoiceLineNumber = paymentObj.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: invoiceID });
                            paymentObj.selectLine({ sublistId: 'apply', line: invoiceLineNumber });
                            paymentObj.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: false });
                            paymentObj.commitLine({ sublistId: 'apply' });
                            let paymentid = paymentObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                            lib.sendEmail(customerName, projectName, transId, "Payment", tranDate, "Invoice", invId);
                            cmID = createCreditMemo(invoiceID);
                            log.debug("credit memo generated: ", cmID)
                        }
                        if (invoiceStatus == "Open") {
                            cmID = createCreditMemo(invoiceID);
                        }
                        let newTimesheetIDs = [];
                        let splitTimeCard = [];
                        for (let ii = 0; ii < timesheetIDs.length; ii++) {
                            let lineNumber = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: timesheetIDs[ii] });
                            if (lineNumber > -1) {
                                log.debug("Timesheet ID and Line Number: " + timesheetIDs[ii] + " : " + lineNumber);
                                let hours = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'qty', line: lineNumber });
                                let timedate = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'billeddate', line: lineNumber });
                                let reversalEntry = createReverseTimeCard(timesheetIDs[ii], hours);
                                if (reversalEntry) {
                                    let newTimeTrackID = createNewTimeCard(invoiceObj, lineNumber, timesheetIDs[ii], newbillRate, billRateProject, billRateTask, employee, cmID)
                                    if (new Date(timedate) < new Date(splitDate)) {
                                        newTimesheetIDs.push(newTimeTrackID);
                                    }
                                    else {
                                        splitTimeCard.push(newTimeTrackID);
                                    }
                                }
                            }
                            else {
                                let dateLookup = search.lookupFields({
                                    type: search.Type.TIME_BILL,
                                    id: timesheetIDs[ii],
                                    columns: ['date']
                                })
                                let tsdate = dateLookup.date;
                                log.debug("date for 0 duration ts ", tsdate);
                                if (new Date(tsdate) >= new Date(splitDate)) {
                                    splitTimeCard.push(timesheetIDs[ii]);
                                }
                                else {
                                    newTimesheetIDs.push(timesheetIDs[ii]);
                                }
                            }
                        }
                        log.debug("newTimesheetIDs", newTimesheetIDs)
                        if (newTimesheetIDs.length > 0 && splitTimeCard.length > 0) {
                            let yesterday = new Date(splitDate);
                            yesterday.setDate(yesterday.getDate() - 1);

                            let newInvoiceID = createInvoice(invoiceObj, newTimesheetIDs, false, false, yesterday);
                            let splitedInvId = createInvoice(invoiceObj, splitTimeCard, customerPODetail, splitDate, false);
                            log.debug("newInvoiceID : splitedInvId", newInvoiceID + " : " + splitedInvId)
                            if (newInvoiceID && splitedInvId) {
                                let invoiceObj = record.load({ type: record.Type.INVOICE, id: invoiceID, isDynamic: true });
                                invoiceObj.setValue("custbody_clb_vendor_bill_links", "");
                                invoiceObj.setValue("custbody_asc_transaction_reversed", true);
                                invoiceObj.setValue("memo", "Reversed the Invoice due to Bill Rate Correction");

                                let invoiceID = invoiceObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                                log.debug("Old invoice updated: ", invoiceID)
                            }
                        }
                    }
                }
                else {
                    /** 
                    if (invoiceStatus == "Pending Approval") {
                        for (let ii = 0; ii < timesheetIDs.length; ii++) {
                            let lineNumber = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: timesheetIDs[ii] });
                            if (lineNumber > -1) {
                                //log.debug("setting the rate on line")
                                 let timeemployee = invoiceObj.getSublistValue({sublistId: 'time', fieldId: 'employee', line: lineNumber});
                                // let timeproject = invoiceObj.getSublistValue({sublistId: 'time', fieldId: 'job', line: lineNumber});
                                let timeTask = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'custcol_clb_timesheettype', line: lineNumber });
                                if (timeTask == billRateTask && billRateProject == invProject &&  employee == timeemployee)
                                {   
                                    log.debug("inside if condition")
                                    invoiceObj.selectLine({ sublistId: 'time', line: lineNumber });
                                    invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'rate', value: parseFloat(newbillRate) });
                                    invoiceObj.commitLine({ sublistId: 'time' });
                                }
                                else {
                                    let rateLookup = search.lookupFields({
                                        type: search.Type.TIME_BILL,
                                        id: timesheetIDs[ii],
                                        columns: ['custcol_clb_billrate']
                                    });
                                    invoiceObj.selectLine({ sublistId: 'time', line: lineNumber });
                                    invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'rate', value: parseFloat(rateLookup.custcol_clb_billrate) });
                                    invoiceObj.commitLine({ sublistId: 'time' });
                                }
                            }
                            if (customerPODetail) {
                              //  log.debug("customerPODetail In Error Code 1", customerPODetail);
                                invoiceObj.setValue("memo", "Invoice Updated with new PO & Bill Rate");
                                invoiceObj.setValue("startdate", new Date(customerPODetail.values.custrecord_asc_cpd_start_date));
                                invoiceObj.setValue("enddate", new Date(customerPODetail.values.custrecord_asc_cpd_end_date));
                                invoiceObj.setValue("otherrefnum", customerPODetail.values.custrecord_asc_cpd_cust_po_num);
                                if (customerPODetail.values.custrecord_asc_cpd_sales_tax.length > 0) {
                                    let salesTax = customerPODetail.values.custrecord_asc_cpd_sales_tax[0].value;
                                    if (salesTax) {
                                        invoiceObj.setValue("custbody_clb_applicable_tax_group", salesTax);
                                    }
                                }
                                if (customerPODetail.values.custrecord_asc_cpd_country) {
                                   // log.debug("customerPODetail In Error Code 2", customerPODetail);
                                    let subrec = invoiceObj.getSubrecord({ fieldId: 'shippingaddress' });
                                    subrec.setText({ fieldId: 'country', value: customerPODetail.values.custrecord_asc_cpd_country[0].text });
                                    subrec.setValue({ fieldId: 'state', value: customerPODetail.values.custrecord_asc_cpd_state[0].text ? customerPODetail.values.custrecord_asc_cpd_state[0].text : "" });
                                    subrec.setValue({ fieldId: 'city', value: customerPODetail.values.custrecord_asc_cpd_city ? customerPODetail.values.custrecord_asc_cpd_city : "" });
                                    subrec.setValue({ fieldId: 'addr1', value: customerPODetail.values.custrecord_asc_cpd_billing_address ? customerPODetail.values.custrecord_asc_cpd_billing_address : "" });
                                    subrec.setValue({ fieldId: 'addr2', value: customerPODetail.values.custrecord_asc_cpd_billing_address_2 ? customerPODetail.values.custrecord_asc_cpd_billing_address_2 : "" });
                                    subrec.setValue({ fieldId: 'zip', value: customerPODetail.values.custrecord_asc_cpd_zip ? customerPODetail.values.custrecord_asc_cpd_zip : "" });
                                   // log.debug("shipping Address Setting done");
                                }
                            }
                        }
                        let invoiceID = invoiceObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                    }
                    else if (invoiceStatus == "Paid In Full" || invoiceStatus == "Open") {
                        let cmID = ""
                        let customerName = invoiceObj.getText("entity");
                        log.debug("customerName: ", customerName)
                        let projectName = invoiceObj.getText("custbody_asc_inv_project_selected");
                        log.debug("projectName: ", projectName)
                        let invEntity = invoiceObj.getValue("tranid");
                        let paymentLineNumber = invoiceObj.findSublistLineWithValue({ sublistId: 'links', fieldId: 'type', value: "Payment" });
                        log.debug("paymentLineNumber", paymentLineNumber)
                        if (paymentLineNumber >= 0) {
                            let paymentID = invoiceObj.getSublistValue({ sublistId: 'links', fieldId: 'id', line: paymentLineNumber });
                            log.debug("paymentID", paymentID)
                            let paymentObj = record.load({
                                type: record.Type.CUSTOMER_PAYMENT,
                                id: paymentID,
                                isDynamic: true,
                            });
                            let transId = paymentObj.getValue("checknumber") ? paymentObj.getValue("checknumber") : paymentObj.getValue("tranid");
                            let tranDate = paymentObj.getText("trandate");
                            let invoiceLineNumber = paymentObj.findSublistLineWithValue({ sublistId: 'apply', fieldId: 'internalid', value: invoiceID });
                            paymentObj.selectLine({ sublistId: 'apply', line: invoiceLineNumber });
                            paymentObj.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: false });
                            paymentObj.commitLine({ sublistId: 'apply' });
                            let paymentid = paymentObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                            lib.sendEmail(customerName, projectName, transId, "Payment", tranDate, "Invoice", invEntity);
                            cmID = createCreditMemo(invoiceID);
                            log.debug("credit memo generated: ", cmID);
                        }
                        if (invoiceStatus == "Open") {
                            cmID = createCreditMemo(invoiceID);
                        }
                        let newTimesheetIDs = []
                        for (let ii = 0; ii < timesheetIDs.length; ii++) {
                            let lineNumber = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: timesheetIDs[ii] });
                            log.debug("lineNumber of ts",lineNumber)
                            if (lineNumber > -1) {
                                log.debug("Timesheet ID and Line Number: " + timesheetIDs[ii] + " : " + lineNumber);
                                let hours = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'qty', line: lineNumber });
                                let reversalEntry = createReverseTimeCard(timesheetIDs[ii], hours);
                                if (reversalEntry) {
                                    let newTimeTrackID = createNewTimeCard(invoiceObj, lineNumber, timesheetIDs[ii], newbillRate, billRateProject, billRateTask, employee, cmID)
                                    newTimesheetIDs.push(newTimeTrackID);
                                }
                            }
                            else {
                                newTimesheetIDs.push(timesheetIDs[ii]);
                            }
                          
                        }
                        log.debug("newTimesheetIDs", newTimesheetIDs)
                        if (newTimesheetIDs.length > 0) {
                            let newInvoiceID;
                            if (customerPODetail) {
                                newInvoiceID = createInvoice(invoiceObj, newTimesheetIDs, customerPODetail, false, false);
                            }
                            else {
                                newInvoiceID = createInvoice(invoiceObj, newTimesheetIDs, false, false, false);
                            }
                            log.debug("newInvoiceID", newInvoiceID)
                            if (newInvoiceID) {
                                let invoiceObj = record.load({ type: record.Type.INVOICE, id: invoiceID, isDynamic: true });
                                invoiceObj.setValue("custbody_clb_vendor_bill_links", "");
                                invoiceObj.setValue("custbody_asc_transaction_reversed", true);
                                invoiceObj.setValue("memo", "Reversed the Invoice due to Bill Rate Correction");

                                let invoiceID = invoiceObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                                log.debug("Old invoice updated: ", invoiceID)
                            }
                        }
                    }**/
                }
            }
        }
        catch (e) {
            log.error({ title: "Errot at Reduce Stage", details: e });
            return "No invoice created due to error."
        }
    }
    const summarize = (context) => {
        log.debug("reduce summary:", JSON.stringify(context.reduceSummary))

    }
    const getPODetails = (effDate, billRateProject) => {
        try {
            let customerPODetail = false;
            let customerPOSearchObj = search.create({
                type: "customrecord_ascendion_cust_po_details",
                filters: [
                    ["custrecord_asc_cpd_start_date", "on", effDate],
                    "AND",
                    ["custrecord_asc_cpd_lnk_to_prj", "anyof", billRateProject]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_asc_cpd_single_budget" }),
                    search.createColumn({ name: "custrecord_asc_cpd_ignore_budget" }),
                    search.createColumn({ name: "custrecord_asc_cpd_billing_address" }),
                    search.createColumn({ name: "custrecord_asc_cpd_billing_address_2" }),
                    search.createColumn({ name: "custrecord_asc_cpd_city" }),
                    search.createColumn({ name: "custrecord_asc_cpd_state" }),
                    search.createColumn({ name: "custrecord_asc_cpd_zip" }),
                    search.createColumn({ name: "custrecord_asc_cpd_country" }),
                    search.createColumn({ name: "custrecord_asc_cpd_start_date" }),
                    search.createColumn({ name: "custrecord_asc_cpd_end_date" }),
                    search.createColumn({ name: "custrecord_asc_cpd_cust_po_num" }),
                    search.createColumn({ name: "custrecord_asc_cpd_sales_tax" }),
                ]
            });
            let poResultSet = customerPOSearchObj.run();
            customerPODetail = poResultSet.getRange({ start: 0, end: 1 });
            if (customerPODetail.length > 0) {
                customerPODetail = customerPODetail[0]
            }
            else {
                customerPODetail = false;
            }
            return customerPODetail;
        }
        catch (ex) {
            log.error({ title: "Get PO Details", details: ex });
        }
    };
    const createReverseTimeCard = (timeSheetID, hours) => {
        try {
            log.audit("createReverseTimeCard for time track id: ", timeSheetID);
            let reversalTimeTrack = record.copy({ type: record.Type.TIME_BILL, id: timeSheetID, isDynamic: true });
            reversalTimeTrack.setValue("billed", false)
            reversalTimeTrack.setValue("hours", -parseFloat(hours));
            reversalTimeTrack.setValue({ fieldId: 'custcol_asc_timesheet_status', value: 4 });
            reversalTimeTrack.setValue("custcol_clb_invoice", '');
            reversalTimeTrack.setValue("custcol_clb_vendor_bill_link", '');
            reversalTimeTrack.setValue("custcol_clb_vendor_credit", '');
            let negativetimesheetRecord = reversalTimeTrack.save({ enableSourcing: false, ignoreMandatoryFields: true });
            log.debug("createReversalandNewTimeCard : reversalTimeTrack", negativetimesheetRecord);
            return negativetimesheetRecord;
        }
        catch (error) {
            log.error({ title: "Reverse Timesheet", details: error });
        }
    };
    const createNewTimeCard = (invoiceObj, lineNumber, timeSheetID, newbillRate, billRateProject, billRateTask, employee, cmID) => {
        try {
            log.debug("createNewTimeCard");
            let timeemployee = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'employee', line: lineNumber });
            //let timeproject = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'job', line: lineNumber });
            let timeTask = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'custcol_clb_timesheettype', line: lineNumber });
            log.audit("timeTask",timeTask);
            log.audit("timeemployee",timeemployee);
            let newTimeTrack = record.copy({ type: record.Type.TIME_BILL, id: timeSheetID, isDynamic: true });
            let uniqueId = newTimeTrack.getValue({ fieldId: "custcol_clb_uniqueid" });
            let projectID = newTimeTrack.getValue({ fieldId: "customer" });
            let task = newTimeTrack.getText({ fieldId: "casetaskevent" });
            let item = newTimeTrack.getText({ fieldId: "item" });
            /*
            let projectLookUp = search.lookupFields({
                type: "job",
                id: projectID,
                columns: ['custentity_clb_parentproject']
            })
              log.debug("projectLookUp",projectLookUp) 
            if(projectLookUp.custentity_clb_parentproject[0]){
            let parentProj = projectLookUp.custentity_clb_parentproject[0].value;
       
                newTimeTrack.setValue("customer", parentProj);   
                newTimeTrack.setText("casetaskevent", task); 
                newTimeTrack.setText("item", item); 
            }*/
            if (timeTask == billRateTask && employee == timeemployee) {
                log.audit("new bill Rate set",newbillRate)
                newTimeTrack.setValue("custcol_clb_billrate", newbillRate);
            }
     
            newTimeTrack.setValue("custcol_clb_invoice", '');
            newTimeTrack.setValue("custcol_asc_timesheet_status", 2);            
            newTimeTrack.setValue("billed", false);
            let billRatenew = newTimeTrack.getValue({ fieldId: "custcol_clb_billrate" });
            log.audit("new bill Rate get",billRatenew);
            let newTimeTrackID = newTimeTrack.save({ enableSourcing: false, ignoreMandatoryFields: true });
            log.debug("createNewTimeCard : newTimeTrack", newTimeTrackID);
            let oldtsupdated = record.submitFields({
                type: record.Type.TIME_BILL,
                id: timeSheetID,
                values: {
                    custcol_asc_timesheet_status: 3,
                    custcol_clb_vendor_bill_link: "",
                    custcol_clb_uniqueid: uniqueId + "_Updated",
                    custcol_invoice_corrected: true,
                    custcol_clb_vendor_credit: "",
                    custcol_clb_credit_memo: cmID
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug("createNewTimeCard function : oldtsupdated", oldtsupdated);
            return newTimeTrackID;
        }
        catch (error) {
            log.error({ title: "Create New Timesheet", details: error });
        }
    };
    const createInvoice = (oldinvoiceObj, newTimesheetIDs, customerPOInfo, splitStartDate, splitEndDate) => {
        try {
            log.debug("createInvoice newTimesheetIDs: ", newTimesheetIDs)
            log.debug("project", oldinvoiceObj.getValue("custbody_asc_inv_project_selected"))
            let vendorBillLinks = [];
            if (oldinvoiceObj.getValue("custbody_clb_vendor_bill_links")) {
                vendorBillLinks = oldinvoiceObj.getValue("custbody_clb_vendor_bill_links")
            }
            let invoiceObj = record.create({ type: 'invoice', isDynamic: true });
            let projType = oldinvoiceObj.getValue("custbody_clb_projecttypeapproval")
            if (projType == 1 || projType == 2) {
                invoiceObj.setValue({ fieldId: 'customform', value: 163, ignoreFieldChange: true });
            }
            else {
                invoiceObj.setValue({ fieldId: 'customform', value: 168, ignoreFieldChange: true });
            }
            invoiceObj.setValue("entity", oldinvoiceObj.getValue("entity"))
            invoiceObj.setValue("job", oldinvoiceObj.getValue("custbody_asc_inv_project_selected"));
            invoiceObj.setValue("custbody_clb_projecttypeapproval", oldinvoiceObj.getValue("custbody_clb_projecttypeapproval"))
          

            invoiceObj.setValue("custbody_asc_inv_project_selected", oldinvoiceObj.getValue("custbody_asc_inv_project_selected"))
            if (splitEndDate) {
                invoiceObj.setValue("custbody_clb_periodendingdate", new Date(splitEndDate));
            }
            else {
                invoiceObj.setValue("custbody_clb_periodendingdate", new Date(oldinvoiceObj.getValue("custbody_clb_periodendingdate")));
            }
            if (splitStartDate) {
                invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(splitStartDate));
            }
            else {
                invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(oldinvoiceObj.getValue("custbody_clb_periodstartingdate")));
            }
            invoiceObj.setValue("custbody_clb_vendor_bill_links", oldinvoiceObj.getValue("custbody_clb_vendor_bill_links"))
            invoiceObj.setValue("taxdetailsoverride", true);
            if (customerPOInfo) {
                invoiceObj.setValue("startdate", new Date(customerPOInfo.values.custrecord_asc_cpd_start_date));
                invoiceObj.setValue("enddate", new Date(customerPOInfo.values.custrecord_asc_cpd_end_date));
                invoiceObj.setValue("otherrefnum", customerPOInfo.values.custrecord_asc_cpd_cust_po_num);
                if (customerPOInfo.values.custrecord_asc_cpd_country) {
                    let subrec = invoiceObj.getSubrecord({ fieldId: 'shippingaddress' });
                    subrec.setText({ fieldId: 'country', text: customerPOInfo.values.custrecord_asc_cpd_country[0].text });
                    subrec.setValue({ fieldId: 'state', value: customerPOInfo.values.custrecord_asc_cpd_state.length > 0 ? customerPOInfo.values.custrecord_asc_cpd_state[0].value : "" });
                    subrec.setValue({ fieldId: 'city', value: customerPOInfo.values.custrecord_asc_cpd_city ? customerPOInfo.values.custrecord_asc_cpd_city : "" });
                    subrec.setValue({ fieldId: 'addr1', value: customerPOInfo.values.custrecord_asc_cpd_billing_address ? customerPOInfo.values.custrecord_asc_cpd_billing_address : "" });
                    subrec.setValue({ fieldId: 'addr2', value: customerPOInfo.values.custrecord_asc_cpd_billing_address_2 ? customerPOInfo.values.custrecord_asc_cpd_billing_address_2 : "" });
                    subrec.setValue({ fieldId: 'zip', value: customerPOInfo.values.custrecord_asc_cpd_zip ? customerPOInfo.values.custrecord_asc_cpd_zip : "" });
                    log.debug("Billing Address Setting done");
                }
                if (customerPOInfo.values.custrecord_asc_cpd_sales_tax.length > 0) {
                    let salesTax = customerPOInfo.values.custrecord_asc_cpd_sales_tax[0].value;
                    if (salesTax) {
                        let salesTaxLookup = search.lookupFields({
                            type: "customrecord_clb_taxgroup",
                            id: salesTax,
                            columns: ['custrecord_asc_taxcode_isgroup']
                        });
                        if (salesTaxLookup.custrecord_asc_taxcode_isgroup == true) {
                            invoiceObj.setValue("custbody_clb_applicable_tax_group", salesTax);
                        }
                        else {
                            invoiceObj.setValue("custbody_clb_applicable_tax_code", salesTax);
                        }
                    }
                }
            }
            else {
                if (oldinvoiceObj.getText("startdate")) {
                    invoiceObj.setValue("startdate", new Date(oldinvoiceObj.getText("startdate")));
                }
                if (oldinvoiceObj.getText("enddate")) {
                    invoiceObj.setValue("enddate", new Date(oldinvoiceObj.getText("enddate")));
                }
                invoiceObj.setValue("otherrefnum", oldinvoiceObj.getValue("otherrefnum"));
                let subrec = invoiceObj.getSubrecord({ fieldId: 'shippingaddress' });
                subrec.setValue({ fieldId: 'country', value: oldinvoiceObj.getValue("shipcountry") });
                subrec.setValue({ fieldId: 'state', value: oldinvoiceObj.getValue("shipstate") });
                subrec.setValue({ fieldId: 'city', value: oldinvoiceObj.getValue("shipcity") });
                subrec.setValue({ fieldId: 'addr1', value: oldinvoiceObj.getValue("shipaddr1") });
                subrec.setValue({ fieldId: 'addr2', value: oldinvoiceObj.getValue("shipaddr2") });
                subrec.setValue({ fieldId: 'zip', value: oldinvoiceObj.getValue("shipzip") });
                let salesTax = oldinvoiceObj.getValue("custbody_clb_applicable_tax_group");
                if (salesTax) {
                    invoiceObj.setValue("custbody_clb_applicable_tax_group", salesTax);
                }
            }
            // let line = invoiceObj.getLineCount('time');
            // log.debug("line count",line)
            // for(let ij = 0;ij <line ; ij++){
            //     let tsid = invoiceObj.getSublistValue({ sublistId: 'time', fieldId: 'doc',line: ij });
            //     log.debug("tsid",tsid);
            // }
            for (let k = 0; k < newTimesheetIDs.length; k++) {
                log.debug("ts id",newTimesheetIDs[k]);
                let linenum = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: newTimesheetIDs[k] });
                log.debug("line", linenum)
                if (linenum > -1) {
                    invoiceObj.selectLine({ sublistId: 'time', line: linenum });
                    invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'apply', value: true });
                    let rate = invoiceObj.getCurrentSublistValue({ sublistId: 'time', fieldId: 'custcol_clb_billrate' });
                    invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'rate', value: parseFloat(rate) });
                    invoiceObj.commitLine({ sublistId: 'time' });
                }
            }
            let invoiceID = invoiceObj.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.debug("Timesheet Updation with invoice ID: " + invoiceID);
            if (invoiceID) {
                for (let ii = 0; ii < newTimesheetIDs.length; ii++) {
                    record.submitFields({
                        type: record.Type.TIME_BILL,
                        id: newTimesheetIDs[ii],
                        values: {
                            "custcol_clb_invoice": invoiceID
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
                for (let vb = 0; vb < vendorBillLinks.length; vb++) {
                    let vbid = record.submitFields({
                        type: record.Type.VENDOR_BILL,
                        id: vendorBillLinks[vb],
                        values: { custbody_clb_created_from_inv: invoiceID },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    log.debug("vendor bill updated: ", vbid);
                }
                return invoiceID;
            }
        }
        catch (e) {
            log.error({ title: "createInvoice function", details: e });
        }
    };
    const createCreditMemo = (invoiceId) => {
        try {
            log.debug("Create Credit Memo function");
            let cmObj = record.transform({
                fromType: record.Type.INVOICE,
                fromId: invoiceId,
                toType: record.Type.CREDIT_MEMO,
                isDynamic: true,
            });
            let cmObjid = cmObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
            return cmObjid;
        }
        catch (e) {
            log.error({ title: "Create Credit Memo", details: e });
        }
    };
    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});