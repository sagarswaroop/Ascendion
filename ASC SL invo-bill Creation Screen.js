/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount

 */
var NS_MAX_SEARCH_RESULT = 1000;
define(['N/ui/serverWidget', 'N/format', 'N/runtime', 'N/search', 'N/record', 'N/config', 'N/task'], (serverWidget, format, runtime, search, record, config, task) =>{
    const onRequest = (context) =>{
        if(context.request.method == 'GET') 
		{
            try 
		    {
                var user = runtime.getCurrentUser()
                var userRole = user.role;
                var userSubsidiary = user.subsidiary;
                var projectValue = context.request.parameters.custpage_project;
                var vendorSelected = context.request.parameters.custpage_customerSelected;
                var subsidiarySelected = context.request.parameters.custpage_subsidiarySelected;
                var startDateValue = context.request.parameters.stdate;
                var endDateValue = context.request.parameters.enddate;

                var formObject = serverWidget.createForm({ title: 'Invoice And Voucher Creation Screen' });
                    
                formObject.addFieldGroup({ id: 'pinfo', label: 'Primary Information' });
                formObject.addFieldGroup({ id: 'billinginfo', label: 'billing information' });
                formObject.addButton({ id: 'custpage_submit', label: 'Submit', functionName: 'submit()' });
                formObject.clientScriptModulePath = 'SuiteScripts/ASC CS Inv-Bill Creation Validation.js';
                var subsidaryField = formObject.addField({ id: 'custpage_subsidiary', type: serverWidget.FieldType.SELECT, label: 'Subsidiary', container: 'pinfo' });
                addSubsidiarySelectOption(subsidaryField, subsidiarySelected);
                subsidaryField.defaultValue = subsidiarySelected;

                var projectField = formObject.addField({ id: 'custpage_project', type: serverWidget.FieldType.SELECT, label: 'Project', container: 'pinfo' });
                if(subsidiarySelected > 0)
                    addProjectSelectOption(projectField, projectValue, subsidiarySelected);
                    
                let docDateField = formObject.addField({ id: 'custpage_documentdate', type: serverWidget.FieldType.DATE, label: 'Document Date', container: 'pinfo' });
                let fromDateField = formObject.addField({ id: 'custpage_fromdate', type: serverWidget.FieldType.DATE, label: 'From Date', container: 'pinfo' });
                fromDateField.isMandatory = true;
                let toDateField = formObject.addField({ id: 'custpage_todate', type: serverWidget.FieldType.DATE, label: 'To Date', container: 'pinfo' });
                toDateField.isMandatory = true;

                var totalHoursField = formObject.addField({ id: 'custpage_totalhours', label: 'Total Hours', type: serverWidget.FieldType.TEXT, container: 'billinginfo' });
                totalHoursField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                var invoiceAmount = formObject.addField({ id: 'custpage_totalinvamount', label: 'Total Invoice Amount', type: serverWidget.FieldType.TEXT, container: 'billinginfo' });
                invoiceAmount.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                var BillAmount = formObject.addField({ id: 'custpage_totalbillamount', label: 'Total Bill Amount', type: serverWidget.FieldType.TEXT, container: 'billinginfo' });
                BillAmount.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                formObject.addField({ id: 'create_invoice', type: serverWidget.FieldType.CHECKBOX, label: 'Create Invoice', container: 'pinfo' });
                formObject.addField({ id: 'create_vendorbill', type: serverWidget.FieldType.CHECKBOX, label: 'Create Bill', container: 'pinfo' });
                context.response.writePage(formObject)
            } 
            catch(ex) 
            {
                log.debug({title: "Invoice Creation Form", details: ex});
            }
        }
        if(context.request.method == 'POST') 
        {
            let isNoData = '';
            let counter = 0;
            const scriptUsageLimit = runtime.getCurrentScript().getRemainingUsage();
            log.debug('Remaining governance units: START ' + scriptUsageLimit);
            var request = context.request.parameters;
            const empType = { contractor: 5 };
            const INV_FORM = 163;
            // create invoice if it is marked.
            if(request.createInvoice == "true") 
			{
                let response = createInvoice(request, empType, INV_FORM);
                context.response.write(JSON.stringify(response));
            }
            // create vendor bill if create bill is true.
            if(request.createBill == "true") 
            {
                let response = createVendorBill(request);
                context.response.write(JSON.stringify(response));
            }
        }
    };
    const getBillData = (project, fromDate, toDate, subsidiary) =>{
        var timeCardSearch = search.create({
            type: "timebill",
            filters:[
                ["type", "anyof", "A"], "AND",
                ["customer", "anyof", project], "AND",
                ["approvalstatus", "anyof", "3"], "AND",
                ["date", "within", fromDate, toDate], "AND",
                ["custcol_clb_vendor_bill_link", "anyof", "@NONE@"], "AND",
                ["employee.employeetype", "anyof", "5"], "AND", 
                ["subsidiary", "anyof", subsidiary]
            ],
            columns:[
                search.createColumn({ name: "employee", summary: "GROUP", label: "Employee" }),
                search.createColumn({ name: "durationdecimal", summary: "SUM", label: "Duration (Decimal)" }),
                search.createColumn({ name: "custcol_asc_payrete", summary: "GROUP", label: "Pay Rate" }),
                search.createColumn({ name: "item", summary: "GROUP", label: "Timesheet Type" }),
                search.createColumn({ name: "internalid", summary: "GROUP", label: "Internal ID" })
            ]
        });
        var searchResultCount = timeCardSearch.runPaged().count;
        log.debug("timeCardSearch result count", searchResultCount);
        const billList = { timeCardId: [], employeeId: "", billLines: [] };
        const billData = [];
        debugger;
        timeCardSearch.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            let internalId = result.getValue({ name: "internalid", summary: "GROUP", label: "Internal ID" })
            let employee = result.getValue({ name: "employee", summary: "GROUP", label: "Employee" });
            let duration = result.getValue({ name: "durationdecimal", summary: "SUM", label: "Duration (Decimal)" });
            let payRate = result.getValue({ name: "custcol_asc_payrete", summary: "GROUP", label: "Pay Rate" });
            let timeType = result.getValue({ name: "item", summary: "GROUP", label: "Timesheet Type" });

            billList.timeCardId.push(internalId);
            var index = billData.findIndex(obj => obj.employeeId == employee);
            if(index != -1) 
            {
                billData[index].billLines.push({ type: timeType, rate: payRate, hours: duration });
            } 
            else 
            {
                billList.employeeId = employee;
                billList.billLines.push({ type: timeType, rate: payRate, hours: duration });
                billData.push(billList);
            }
            return true;
        });
        return billData;
    };
    const getInvoiceData = (project, fromDate, toDate, subsidiary) =>{
        try 
        {
            var timebillSearchObj = search.create({
                type: "timebill",
                filters:[
                    ["type", "anyof", "A"], "AND",
                    ["customer", "anyof", project], "AND",
                    ["approvalstatus", "anyof", "3"], "AND",
                    ["date", "within", fromDate, toDate], "AND",
                    ["custcol_clb_invoice", "anyof", "@NONE@"], "AND", 
                    ["subsidiary", "anyof", subsidiary]
                ],
                columns:[
                    { name: "internalid", label: "Internal ID" },
                    { name: "employeetype", join: "employee", label: "Employee Type" },
                    { name: "custentity_clb_projecttypeforinvoicing", join: "job", label: "Project Type For Invoicing " },
                    { name: "customer", join: "job", label: "Customer" },
                    { name: "custcol_clb_billrate", label: "Bill Rate" }
                ]
            });
            var searchResultCount = timebillSearchObj.runPaged().count;
            log.debug("timebillSearchObj result count", searchResultCount);
            let counter = 0;
            const invData = { employeeType: "", projectType: "", customer: "", timeSheet: [] };
            timebillSearchObj.run().each(function (result) {
                let internalId = result.getValue({ name: "internalid", label: "Internal ID" });
                invData.employeeType = result.getValue({ name: "employeetype", join: "employee", label: "Employee Type" });
                invData.projectType = result.getValue({ name: "custentity_clb_projecttypeforinvoicing", join: "job", label: "Project Type For Invoicing " });
                invData.customer = result.getValue({ name: "customer", join: "job", label: "Customer" });
                let billRate = result.getValue({ name: "custcol_clb_billrate", label: "Bill Rate" });
                invData.timeSheet.push({ id: internalId, rate: billRate });
                return true;
            });
            return invData;
        } 
        catch(ex)
        {
            log.error({title: "Get Invoice Data", details: ex});
        }
    };
    const addProjectSelectOption = (field, value, subsidaryId) =>{
        try
        {
            var filters = [
                ["isinactive", "is", "F"], "AND",
                ["subsidiary", "anyof", subsidaryId]
            ];
            var columns = [];
            columns.push(search.createColumn({ name: "internalid", label: "Internal ID", sort: search.Sort.ASC }));
            columns.push(search.createColumn({ name: "altname", label: "Name", }));
            columns.push(search.createColumn({ name: "formulatext", formula: "CONCAT( {entityid},{altname})", }));
            var results = searchRecords("job", filters, columns);
            // log.debug("project result", results)
            if(results.length > 0) 
            {
                field.addSelectOption({ value: "", text: "" });
                for(var i = 0; i < results.length; i++) 
                {
                    if(value == results[i].getValue({ name: "internalid" })) 
                    {
                        field.addSelectOption({ value: results[i].getValue({ name: "internalid" }), text: results[i].getValue({ name: "formulatext", formula: "CONCAT( {entityid},{altname})", }), isSelected: true });
                    }
                    else
                    {
                        field.addSelectOption({ value: results[i].getValue({ name: "internalid" }), text: results[i].getValue({ name: "formulatext", formula: "CONCAT( {entityid},{altname})", }) });
                    }
                }
            }
        } 
        catch(ex)
        {
            log.error({title: "addProjectSelectOption", details: ex});
        }
    };
    const addSubsidiarySelectOption = (field, value) =>{
        try 
        {
            var filters = [
                ["isinactive", "is", "F"], "AND",
                ["internalid", "anyof", "8", "10", "11"]
            ];
            var columns = [];
            columns.push(search.createColumn({ name: "internalid", label: "Internal ID", sort: search.Sort.ASC }));
            columns.push(search.createColumn({ name: "name", label: "Name", }));
            // columns.push(search.createColumn({ name: "formulatext", formula:  "CONCAT( {entityid},{altname})", }));

            var results = searchRecords("subsidiary", filters, columns);
            if(results.length > 0) 
            {
                field.addSelectOption({ value: "", text: "" });
                for(var i = 0; i < results.length; i++) 
                {
                    // field.addSelectOption({ value: results[i].getValue({ name: "internalid" }), text: results[i].getValue({ name: "altname" }) });
                    if(value == results[i].getValue({ name: "internalid" })) 
                    {
                        field.addSelectOption({ value: results[i].getValue({ name: "internalid" }), text: results[i].getValue({ name: "name", label: "Name", }) });
                    } 
                    else
                    {
                        field.addSelectOption({ value: results[i].getValue({ name: "internalid" }), text: results[i].getValue({ name: "name", label: "Name", }) });
                    }
                }
            }
        } 
        catch(ex) 
        {
            log.error({title: "addSubsidiarySelectOption", details: ex});
        }
    };
    const searchRecords = (type, filters, columns) =>{
        try 
        {
            var results = [];
            // Type is required or else searc.create will break
            if(type != null && type != '' && typeof type !== 'undefined') 
            {
                var searchObject = search.create({
                    type: type,
                    filters: filters,
                    columns: columns
                });
                var searchResultsSets = searchObject.run();
                var allResultsFound = false;
                var resultsSetsCounter = 0;
                while(!allResultsFound) 
                {
                    //Starts from 0 to 1000, increment the resultsSetsCounter as we go to move by 1000 increments. 1000 to 2000, 2000 to 3000 ...
                    var resultsSet = searchResultsSets.getRange({
                        start: resultsSetsCounter * NS_MAX_SEARCH_RESULT,
                        end: NS_MAX_SEARCH_RESULT + NS_MAX_SEARCH_RESULT * resultsSetsCounter
                    });
                    // If original results set is empty,  stop
                    if(resultsSet == null || resultsSet == "") 
                    {
                        allResultsFound = true;
                    }
                    else 
                    {
                        // If current results set is under the maximum number of results
                        if(resultsSet.length < NS_MAX_SEARCH_RESULT) 
                        {
                            results = results.concat(resultsSet);
                            allResultsFound = true;
                        }
                        else 
                        {
                            // Otherwise keep on concatenating the results
                            results = results.concat(resultsSet);
                            resultsSetsCounter++;
                        }
                    }
                }
            }
            else 
            {
                var errorObj = error.create({
                    name: 'SSS_MISSING_REQD_ARGUMENT',
                    message: 'Missing a required argument : type',
                    notifyOff: false
                });
                throw errorObj;
            }
            return results;
        }
        catch(ex) 
        {
            log.error({title: "Search Records", details: ex});
        }
    };
    const createInvoice = (request, empType, INV_FORM) =>{
        let invoiceObj = getInvoiceData(request.project, request.fromDate, request.toDate, request.subsidiary);
        log.debug("invoiceObj", invoiceObj);
        let poObj = getPODetails(request.project, request.fromDate, request.toDate);
        if(invoiceObj.timeSheet.length > 0) 
        {
            var invoiceID = "";
            try 
            {
                let invRecord = record.create({type: record.Type.INVOICE, isDynamic: true});
                invRecord.setValue({fieldId: 'customform', value: INV_FORM});
                invRecord.setValue({fieldId: 'entity', value: invoiceObj.customer});
                invRecord.setValue({fieldId: 'subsidiary', value: request.subsidiary});
                invRecord.setValue({fieldId: 'custbody_clb_projecttypeapproval', value: invoiceObj.projectType});
                invRecord.setValue({fieldId: 'trandate', value: new Date(request.docDate) || new Date()});
                invRecord.setValue({fieldId: 'custbody_clb_periodstartingdate', value: new Date(request.fromDate)});
                invRecord.setValue({fieldId: 'custbody_clb_periodendingdate', value: new Date(request.toDate)});
                invRecord.setValue({fieldId: 'custbody_asc_inv_project_selected', value: request.project});
                invRecord.setValue({fieldId: 'otherrefnum', value: poObj.poNumber});
                let taxFieldId = poObj.isTaxGroup == true ? "custbody_clb_applicable_tax_group" : "custbody_clb_applicable_tax_code";
                invRecord.setValue({fieldId: taxFieldId, value: poObj.taxCode});

                invRecord.setValue({fieldId: 'approvalstatus',value: 2});

                var timesheetObj = invoiceObj.timeSheet;
                log.debug({title: "timesheetObj", details: timesheetObj});
                invoiceObj.timeSheet.forEach((obj) => {								
                    log.debug({title: "obj", details: obj});
                    var lineNumber = invRecord.findSublistLineWithValue({sublistId: 'time', fieldId: 'doc', value: obj.id});						
                    log.debug({title: "lineNumber", details: lineNumber});
                    if(lineNumber > -1) 
                    {
                        invRecord.selectLine({sublistId: 'time', line: lineNumber});
                        invRecord.setCurrentSublistValue({sublistId: 'time', fieldId: 'apply', value: true});
                        invRecord.setCurrentSublistValue({sublistId: 'time', fieldId: 'rate', value: obj.rate});
                        invRecord.commitLine({sublistId: 'time'});
                    }
                });
                invoiceID = invRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
                log.debug("invoiceID: " + invoiceID);
            } 
            catch(error) 
            {
                log.error("INVOICE RECORD_CREATE_ERROR", error);
            }
            if(invoiceID > 0) 
            {
                try 
                {
                    invoiceObj.timeSheet.forEach(timeObj => {
                        record.submitFields({
                            type: record.Type.TIME_BILL,
                            id: timeObj.id,
                            values: {
                                "custcol_clb_invoice": invoiceID
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    });
                } 
                catch(error) 
                {
                    log.error({title: "Update Timesheet", details: ex});
                }
            }
            return invoiceID;
        }
        else
        {
            isNoData = 'invoice';
            counter++;
            return {isNoData: isNoData, counter: counter};
        } 
    };
    const createVendorBill = (request) =>{
        // fetch information of time bill record data to create bill.
        let vdrBillRecord = getBillData(request.project, request.fromDate, request.toDate, request.subsidiary);
        log.debug("vdrBillRecord", vdrBillRecord);

        if(vdrBillRecord.length > 0) 
        {
            let vendorId = 0;
            log.debug("vdrBillRecord[0].employeeId", vdrBillRecord[0].employeeId);
            // get the vendor from timeSheet employee.
            var customrecord_clb_subconvendorSearchObj = search.create({
                type: "customrecord_clb_subconvendor",
                filters:[
                    ["custrecord_clb_subconresource", "anyof", vdrBillRecord[0].employeeId], "AND",
                    ["custrecord_clb_subcon_project", "anyof", request.project]
                ],
                columns:[
                    { name: "custrecord_clb_vendor", label: "Vendor" }
                ]
            });
            customrecord_clb_subconvendorSearchObj.run().each(function (result) {
                vendorId = result.getValue("custrecord_clb_vendor");
                return true;
            });
            if(vendorId > 0) 
            {

                try 
                {
                    // Creating vendor bill for all Related Time Bill.
                    const billRecord = record.create({
                        type: record.Type.VENDOR_BILL,
                        isDynamic: true
                    });
                    billRecord.setValue({fieldId: 'entity', value: vendorId});
                    billRecord.setValue({fieldId: 'subsidiary', value: request.subsidiary});
                    billRecord.setValue({fieldId: 'trandate', value: new Date(request.docDate) || new Date()});
                    billRecord.setValue({fieldId: 'custbody_clb_startdate', value: new Date(request.fromDate)});
                    billRecord.setValue({fieldId: 'custbody_clb_enddate', value: new Date(request.toDate)});
                    log.debug("vdrBillRecord.timeCardId: "+vdrBillRecord[0].timeCardId);
                    //add the list of time bills to vendor bill custom field.
                    billRecord.setValue({fieldId: 'custbody_asc_createdfromtimetrack', value: vdrBillRecord[0].timeCardId, ignoreFieldChange: true});

                    vdrBillRecord.forEach(billObj => {
                        // adding lines for every time bill type in vendor bill.
                        billObj.billLines.forEach(lineElements => {
                            // log.debug("lineElements", lineElements);
                            billRecord.selectNewLine({sublistId: 'item'});
                            billRecord.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: lineElements.type});
                            billRecord.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: lineElements.hours});
                            billRecord.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: lineElements.rate});
                            billRecord.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_clb_subconemployee', value: billObj.employeeId});
                            billRecord.commitLine({sublistId: 'item'});
                         });
                    });
                    var createdBillId = billRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                } 
                catch(error) 
                {
                    log.error("VENDOR_BILL_RECORD_CREATE_ERROR", error);
                }
                log.debug("Created Bill id: " + createdBillId);
                // update the bill record in related Time bill Record of employee.
                if(createdBillId > 0) 
                {
                    try 
                    {
                        // get the time Bill internal id from bill record array.
                        vdrBillRecord[0].timeCardId.forEach(billTimeId => {
                            record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: billTimeId,
                                values: {
                                    "custcol_clb_vendor_bill_link": createdBillId
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                        });
                    }
                    catch(error) 
                    {
                        log.error("TIME_SHEET_BILL_UPDATE_ERROR", error);
                    }
                    log.debug('Remaining governance units - Time Bill Update : Process END ' + scriptUsageLimit);
                }
            }
        }
        else
        {
            isNoData = 'bill';
            counter++;
        }
    };
    const getPODetails = (projectId, fromDate, toDate) =>{
            try 
            {
                let poObj = {};
                let searchObj = search.create({
                    type: "customrecord_ascendion_cust_po_details",
                    filters:[
                        ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectId], "AND", 
                        ["custrecord_asc_cpd_start_date", "onorbefore", fromDate], "AND", 
                        ["custrecord_asc_cpd_end_date", "onorafter", toDate]
                    ],
                    columns:[
                        {name: "internalid", sort: search.Sort.DESC, label: "Internal Id"},
                        {name: "name", label: "Name"},
                        {name: "custrecord_asc_cpd_cust_po_num", label: "Cust PO Num"},
                        {name: "custrecord_asc_cpd_sales_tax", label: "Sales Tax"},
                        {name: "custrecord_asc_cpd_billing_address", label: "Billing Address 1"},
                        {name: "custrecord_asc_cpd_billing_address_2", label: "Billing Address 2"},
                        {name: "custrecord_asc_cpd_city", label: "City"},
                        {name: "custrecord_asc_cpd_country", label: "Country"},
                        {name: "custrecord_asc_cpd_state", label: "State"},
                        {name: "custrecord_asc_cpd_zip", label: "Zip"},
                        {name: "custrecord_asc_taxcode_isgroup", join: "CUSTRECORD_ASC_CPD_SALES_TAX", label: "Is group"}
                    ]
                });
                let searchRes = searchObj.run().getRange({start: 0, end: 1});
                for(let i=0; i<searchRes.length; i++)
                {
                    poObj.name = searchRes[i].getValue({name: "name"});
                    poObj.poNumber = searchRes[i].getValue({name: "custrecord_asc_cpd_cust_po_num"});
                    poObj.taxCode = searchRes[i].getValue({name: "custrecord_asc_cpd_sales_tax"});
                    poObj.isTaxGroup = searchRes[i].getValue({name: "custrecord_asc_taxcode_isgroup", join: "CUSTRECORD_ASC_CPD_SALES_TAX", label: "Is group"});
                    poObj.billAddr1 = searchRes[i].getValue({name: "custrecord_asc_cpd_billing_address"});
                    poObj.billAddr2 = searchRes[i].getValue({name: "custrecord_asc_cpd_billing_address_2"});
                    poObj.city = searchRes[i].getValue({name: "custrecord_asc_cpd_city"});
                    poObj.country = searchRes[i].getValue({name: "custrecord_asc_cpd_country"});
                    poObj.state = searchRes[i].getValue({name: "custrecord_asc_cpd_state"});
                    poObj.zip = searchRes[i].getValue({name: "custrecord_asc_cpd_zip"});
                }
                return poObj;
            } 
            catch(ex)
            {
                log.error({title: "Get PO Details", details: ex});
            }
    };
    return {
        onRequest: onRequest
    };
});
