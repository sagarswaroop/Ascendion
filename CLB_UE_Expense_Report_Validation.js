/**
     * @author Anirban Gupta (Huron)
     * @NApiVersion 2.1
     * @NScriptType UserEventScript
     * @NModuleScope SameAccount
     * @NAmdConfig /SuiteScripts/Library/requireConfig.json
     */
/**
     * Module Description
     * Script to validate billable expenses in Expense Report against expense budget for related sales orders based on data entered manually or sourced from CSV.
     * THIS SCRIPT DOES NOT SUPPORT OR RUN IN THE EVENT OF AMOUNT CHANGES ON LINE LEVEL ON RECORD EDITING.
     *
     *  Version   Date           Author              Comments
     *  1.0       15 Mar 2022    Jyoti Bhasme        Script Created.
     *  1.1       22 Nov 2022    Anirban Gupta       Restructured the code, major logical changes, removed unnecessary variables, 
     *                                               code optimization, cleanup and major bug fixes.
     *
 */

define(['N/runtime', 'N/record', 'N/search'], function (runtime, record, search) {

    /**
     * Function definition to be triggered before record is submitted.
     *
     * @param {Object} context - Context
     * @Since 2015.2
     */
    function beforeSubmit(context) {
        log.audit('UE Type', context.type);
        log.audit('Execution Context', runtime.executionContext);

        let expenseAgainstSalesOrder = [];

        if (isSupportedUserEventType(context) && isSupportedContext()) {
            let expenseLineCount = context.newRecord.getLineCount('expense');

            for (let lineIndex = 0; lineIndex < expenseLineCount; lineIndex++) {

                let existingExpenseData, isProject, salesOrderDetails;
                let lineDetails = {};

                lineDetails.isbillable = context.newRecord.getSublistValue({
                    sublistId: 'expense',
                    fieldId: 'isbillable',
                    line: lineIndex
                });

                lineDetails.customerInternalId = context.newRecord.getSublistValue({
                    sublistId: 'expense',
                    fieldId: 'customer',
                    line: lineIndex
                });

                if (lineDetails.customerInternalId) {
                    isProject = checkIfProject(lineDetails.customerInternalId);
                }

                /* If the line is billable and has a project tagged in the customer field, calculate expense data */

                if (lineDetails.isbillable && isProject) {
                    lineDetails.lineAmount = context.newRecord.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        line: lineIndex
                    });
                    lineDetails.expensedate = convertDateIntoSavedSearchFormat(context.newRecord.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'expensedate',
                        line: lineIndex
                    }));

                    /* Look for the active sales order for the project during the expense date period */
                    salesOrderDetails = getSalesOrderDetailsForProject(lineDetails.customerInternalId, lineDetails.expensedate);

                    /* Check if Sales Order already exists in our array */
                    existingExpenseData = expenseAgainstSalesOrder.find(expenseDataInArray => expenseDataInArray.salesOrderInternalId === salesOrderDetails.internalId);

                    /* If sales order already exists in our array, add line amount to expense amount calculated against the sales order so far */
                    if (existingExpenseData) {
                        existingExpenseData.expenseAmount = Number(existingExpenseData.expenseAmount) + Number(lineDetails.lineAmount);
                        log.debug('[BeforeSubmit] Updated Expense Against Sales Order', expenseAgainstSalesOrder);

                        /* If budget is not ignored [Ignore Budget or Ignore Expense Budget] for this Sales Order, checking the total expense against the expense budget */
                        if (!existingExpenseData.isIgnoreAnyBudget && Number(existingExpenseData.expenseAmount) > Number(existingExpenseData.expenseBudget)) {
                            throw {
                                name: "ERROR",
                                message: "Cannot enter Expense Against Project with Internal ID: " + lineDetails.customerInternalId + " on: " + lineDetails.expensedate + " since it will exceed the expense budget worth " + existingExpenseData.expenseBudget + ". ",
                                stack: ""
                            };
                        }
                    }
                    else {
                        let newExpenseData = {
                            salesOrderInternalId: salesOrderDetails.internalId,
                            isIgnoreAnyBudget: (salesOrderDetails.isExpenseIgnoreBudget || salesOrderDetails.isIgnoreBudget),
                            expenseBudget: Number(salesOrderDetails.expenseBudget),
                            expenseAmount: Number(salesOrderDetails.totalExpenseAmountSoFar) + Number(lineDetails.lineAmount)
                        };

                        expenseAgainstSalesOrder.push(newExpenseData);
                        log.debug('[BeforeSubmit] Updated Expense Against Sales Order', expenseAgainstSalesOrder);

                        /* If budget is not ignored [Ignore Budget or Ignore Expense Budget] for this Sales Order, checking the total expense against the expense budget */
                        if (!newExpenseData.isIgnoreAnyBudget && Number(newExpenseData.expenseAmount) > Number(newExpenseData.expenseBudget)) {
                            throw {
                                name: "ERROR",
                                message: "Cannot enter Expense Against Project with Internal ID: " + lineDetails.customerInternalId + " on: " + lineDetails.expensedate + " since it will exceed the expense budget worth " + newExpenseData.expenseBudget + ".",
                                stack: ""
                            };
                        }
                    }
                }
            }
        }
    }

    /**
     * Function definition to be triggered after record is submitted.
     *
     * @param {Object} context - Context
     * @Since 2015.2
     */
    function afterSubmit(context) {
        log.audit('UE Type', context.type);
        log.audit('Execution Context', runtime.executionContext);

        let expenseAgainstSalesOrder = [];

        if (isSupportedUserEventType(context) && isSupportedContext()) {
            let expenseLineCount = context.newRecord.getLineCount('expense');

            for (let lineIndex = 0; lineIndex < expenseLineCount; lineIndex++) {

                let existingExpenseData, isProject, salesOrderDetails;
                let lineDetails = {};

                lineDetails.isbillable = context.newRecord.getSublistValue({
                    sublistId: 'expense',
                    fieldId: 'isbillable',
                    line: lineIndex
                });

                lineDetails.customerInternalId = context.newRecord.getSublistValue({
                    sublistId: 'expense',
                    fieldId: 'customer',
                    line: lineIndex
                });

                if (lineDetails.customerInternalId) {
                    isProject = checkIfProject(lineDetails.customerInternalId);
                }

                /* If the line is billable and has a project tagged in the customer field, calculate expense data */

                if (lineDetails.isbillable && isProject) {
                    lineDetails.lineAmount = context.newRecord.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        line: lineIndex
                    });
                    lineDetails.expensedate = convertDateIntoSavedSearchFormat(context.newRecord.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'expensedate',
                        line: lineIndex
                    }));

                    /* Look for the active sales order for the project during the expense date period */
                    salesOrderDetails = getSalesOrderDetailsForProject(lineDetails.customerInternalId, lineDetails.expensedate);

                    /* Check if Sales Order already exists in our array */
                    existingExpenseData = expenseAgainstSalesOrder.find(expenseDataInArray => expenseDataInArray.salesOrderInternalId === salesOrderDetails.internalId);

                    /* If sales order already exists in our array, add line amount to expense amount calculated against the sales order so far */
                    if (existingExpenseData) {
                        existingExpenseData.expenseAmount = Number(existingExpenseData.expenseAmount) + Number(lineDetails.lineAmount);
                        log.debug('[AfterSubmit] Updated Expense Against Sales Order', expenseAgainstSalesOrder);
                    }
                    else {
                        let newExpenseData = {
                            salesOrderInternalId: salesOrderDetails.internalId,
                            expenseBudget: Number(salesOrderDetails.expenseBudget),
                            expenseAmount: Number(salesOrderDetails.totalExpenseAmountSoFar) + Number(lineDetails.lineAmount)
                        };

                        expenseAgainstSalesOrder.push(newExpenseData);
                        log.debug('[AfterSubmit] Updated Expense Against Sales Order', expenseAgainstSalesOrder);
                    }
                }
            }

            /* Updating new expense amounts upon saving the Expense Report */
            expenseAgainstSalesOrder.forEach(expenseDetails => record.submitFields({
                type: record.Type.SALES_ORDER,
                id: expenseDetails.salesOrderInternalId,
                values: {
                    custbody_clb_total_expense_amount: expenseDetails.expenseAmount
                }
            }));
        }
    }

    // Does not support EDIT and XEDIT
    let isSupportedUserEventType = (context) => {
        let UserEventType = context.UserEventType;
        return [UserEventType.CREATE].indexOf(context.type) > -1;
    };

    // Does not support Webstore and RESTlet
    let isSupportedContext = () => {
        let ContextType = runtime.ContextType;

        return [
            ContextType.CLIENT,
            ContextType.CSV_IMPORT,
            ContextType.CUSTOM_MASSUPDATE,
            ContextType.DEBUGGER,
            ContextType.MAP_REDUCE,
            ContextType.SCHEDULED,
            ContextType.SUITELET,
            ContextType.USEREVENT,
            ContextType.USER_INTERFACE,
            ContextType.WORKFLOW].indexOf(runtime.executionContext) > -1;
    };

    let checkIfProject = (projectInternalId) => {
        let jobId, name;
        log.debug({
            title: 'Finding Project...',
            details: 'Finding Project Internal ID for Reference Number: ' + projectInternalId
        });

        let projectSearchObj = search.create({
            type: "job",
            filters:
                [
                    ["internalid", "anyof", projectInternalId]
                ],
            columns:
                [
                    search.createColumn({ name: "entityid", sort: search.Sort.ASC, label: "ID" }),
                    search.createColumn({ name: "altname", label: "Name" })
                ]
        });

        let projectSearchResultCount = projectSearchObj.runPaged().count;

        log.debug({
            title: 'Project Search Completed',
            details: 'Project Search Result Size is: ' + projectSearchResultCount
        });

        if (projectSearchResultCount) {
            let projectSearchResult = projectSearchObj.run().getRange({ start: 0, end: 1 });
            jobId = projectSearchResult[0].getValue({ name: "entityid" });
            name = projectSearchResult[0].getValue({ name: "altname" });

            log.debug({
                title: 'Project Found',
                details: 'Job ID of Project with Internal ID ' + projectInternalId + ' is: ' + jobId + ', while Name is: ' + name
            });

            return true;
        }

        return false;
    };

    let getSalesOrderDetailsForProject = (projectInternalId, expenseDate) => {
        let salesOrderRecordDetails = {};
        log.debug({
            title: 'Finding Sales Order...',
            details: 'Finding Sales Order for Project Internal ID: ' + projectInternalId + " on date: " + expenseDate
        });

        let salesOrderSearchObj = search.create({
            type: record.Type.SALES_ORDER,
            filters:
                [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["customer.internalid", "anyof", projectInternalId],
                    "AND",
                    ["startdate", "onorbefore", expenseDate],
                    "AND",
                    ["enddate", "onorafter", expenseDate]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "datecreated", sort: search.Sort.DESC, label: "Date Created" }),
                    search.createColumn({ name: "startdate", label: "Start Date" }),
                    search.createColumn({ name: "enddate", label: "End Date" }),
                    search.createColumn({ name: "custbody_clb_ignorebudget", label: "Ignore Budget" }),
                    search.createColumn({ name: "custbody_clb_expenseignorebudget", label: "EXPENSE IGNORE BUDGET" }),
                    search.createColumn({ name: "custbody_clb_expensebudgetamount", label: "EXPENSE BUDGET AMOUNT" }),
                    search.createColumn({ name: "custbody_clb_total_expense_amount", label: "Total Expense Amount So Far" })
                ]
        });

        let salesOrderSearchResultCount = salesOrderSearchObj.runPaged().count;

        log.debug({
            title: 'Sales Order Search Completed',
            details: 'Sales Order Search Result Size is: ' + salesOrderSearchResultCount
        });

        if (salesOrderSearchResultCount) {
            let salesOrderSearchResult = salesOrderSearchObj.run().getRange({ start: 0, end: 1 });
            salesOrderRecordDetails.internalId = salesOrderSearchResult[0].getValue({ name: "internalid", label: "Internal ID" });
            salesOrderRecordDetails.startDate = salesOrderSearchResult[0].getValue({ name: "startdate", label: "Start Date" });
            salesOrderRecordDetails.endDate = salesOrderSearchResult[0].getValue({ name: "enddate", label: "End Date" });
            salesOrderRecordDetails.isIgnoreBudget = salesOrderSearchResult[0].getValue({ name: "custbody_clb_ignorebudget", label: "Ignore Budget" });
            salesOrderRecordDetails.isExpenseIgnoreBudget = salesOrderSearchResult[0].getValue({ name: "custbody_clb_expenseignorebudget", label: "EXPENSE IGNORE BUDGET" });
            salesOrderRecordDetails.expenseBudget = salesOrderSearchResult[0].getValue({ name: "custbody_clb_expensebudgetamount", label: "EXPENSE BUDGET AMOUNT" });
            salesOrderRecordDetails.totalExpenseAmountSoFar = salesOrderSearchResult[0].getValue({ name: "custbody_clb_total_expense_amount", label: "Total Expense Amount So Far" });

            log.debug({
                title: 'Sales Order Found',
                details: 'Expense Budget of Sales Order with Project Internal ID ' + projectInternalId + ' is: ' + salesOrderRecordDetails.expenseBudget
            });
        }
        else {
            throw {
                name: "INVALID ARGUMENTS",
                message: "Could not find any valid Sales Order to enter Expense Against for Project with Internal ID: " + projectInternalId + " on: " + expenseDate + ". Please verify the data you entered and try again.",
                stack: ""
            };
        }
        return salesOrderRecordDetails;
    };

    let convertDateIntoSavedSearchFormat = (date) => {
        let dateObject = new Date(date);
        let convertedDateString = ((dateObject.getMonth() + 1).toString() + '/' + (dateObject.getDate()).toString() + '/' + dateObject.getFullYear().toString()).toString();
        return convertedDateString;
    };

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});