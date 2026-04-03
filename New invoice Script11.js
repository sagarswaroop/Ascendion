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

                queryStr = "SELECT billng_info.custrecord_blng_cyle,job.ID,job.custentity_clb_bilcycle,job.customer,billng_info.custrecord_bln_strt_dte,billng_info.custrecord_blng_end_dte,job.custentity_clb_lastday,job.custentity_clb_projecttypeforinvoicing,job.parent,job.custentity_clb_missing_invoice_dates FROM job LEFT JOIN customrecord_clb_clientspecificbillingcy AS billng_info ON (billng_info.custrecord_blng_cyle = job.custentity_clb_bilcycle) WHERE (job.custentity_clb_projecttypeforinvoicing IN (4)) AND (job.custentity_clb_parentproject IS NULL) AND (job.custentity_clb_bilcycle IS NOT NULL) AND (job.startdate<= '11/11/2024' ) AND (billng_info.custrecord_blng_end_dte >='09/01/2024') AND (billng_info.custrecord_blng_end_dte <='09/29/2024') AND (billng_info.custrecord_blng_end_dte >= job.startdate) AND job.ID IN(76033)";

                log.debug("getInputData : queryStr ", queryStr)
                if (queryStr) {
                    var results = query.runSuiteQL({
                        query: queryStr
                    });
                    var projectData = results.asMappedResults();
                    // var projectDetails = results.asMappedResults();
                    
                    log.debug("project found: ", projectDetails)
                    var DataArray = [];
                    for (var i = 0; i < projectData.length; i++) {
                        var projectDetails = projectData[i];
                        log.debug("Reduce Stage: projectDetails", (projectDetails));
                        var billingStartDate = projectDetails.custrecord_bln_strt_dte;
                        var billingEndDate = projectDetails.custrecord_blng_end_dte;
                        // log.debug("Reduce Stage: startDate:endDate : ", billingStartDate + " : " + billingEndDate)


                        var weekendingDays;
                        //---------------------------Customer PO details---------------------------
                        var splitDate = '';
                        var customerPODetails = false;
                        var poLength = 0;
                        var billSplit = false;
                        var customerID = projectDetails.customer;
                        // log.debug("customerID",customerID);
                        var projectID = projectDetails.id;
                        var projectLookUp = search.lookupFields({
                            type: "job",
                            id: projectID,
                            columns: ['subsidiary', 'custentity_clb_missing_invoice_dates', 'custentity_clb_lastday']
                        });
                        var missingInvoices = projectLookUp.custentity_clb_missing_invoice_dates ? projectLookUp.custentity_clb_missing_invoice_dates : '';
                        var projectWeekendingDay = projectLookUp.custentity_clb_lastday[0].text
                        log.debug("projectLookUp", projectLookUp)
                        log.debug("reduce", "missingInvoices   " + missingInvoices)
                        log.debug("reduce", "projectWeekendingDay   " + projectWeekendingDay)
                        var projSubsidiary = projectLookUp.subsidiary[0].value;
                        var projectFilter = [];
                        var projectType = projectDetails.custentity_clb_projecttypeforinvoicing;
                        var createInvoiceCheck = false;
                        var tranErr = false;
                        if (projSubsidiary == 4 && projectType == 4) {
                            var billCycle = projectDetails.custentity_clb_bilcycle;
                            var billcycleDiff = false;
                            //log.debug("Parent Project Bill Cycle", billCycle)
                            var subProjQuery = "SELECT resourceAllocation.allocationResource AS employee,job.ID,job.custentity_clb_bilcycle,job.customer,job.custentity_clb_lastday,resourceAllocation.startdate,resourceAllocation.enddate FROM job LEFT JOIN resourceAllocation ON (job.id = resourceAllocation.project) WHERE (job.custentity_clb_projecttypeforinvoicing IN (1,2,3)) AND (job.custentity_clb_parentproject = '" + projectID + "') AND (job.startdate <= '" + billingEndDate + "' ) AND (resourceAllocation.startdate <= '" + billingEndDate + "' AND resourceAllocation.enddate >= '" + billingStartDate + "')";
                            var subRunQuery = query.runSuiteQL({
                                query: subProjQuery
                            });
                            var subProjResults = subRunQuery.asMappedResults();
                            log.debug("Sub project found: ", subProjResults.length);
                            if (subProjResults.length > 0) {
                                for (var sp = 0; sp < subProjResults.length; sp++) {
                                    var tmpBlCycl = subProjResults[sp].custentity_clb_bilcycle;
                                    //   log.debug("Bill Cycle of the child project: " + sp,tmpBlCycl);
                                    if (tmpBlCycl != billCycle) {
                                        billcycleDiff = true;
                                    }
                                }
                                // log.debug("billcycleDiff", billcycleDiff)
                                if (!billcycleDiff) {
                                    log.debug("inside")
                                    var grpInvCrtn = true;
                                    for (var sub = 0; sub < subProjResults.length; sub++) {
                                        var tempBillStart = projectDetails.custrecord_bln_strt_dte;
                                        var tempBillEnd = projectDetails.custrecord_blng_end_dte;
                                        // log.debug("subproject internal id: ", subProjResults[sub].id)

                                        projectFilter.push(subProjResults[sub].id);
                                        var resStrt = subProjResults[sub].startdate;
                                        var resEnd = subProjResults[sub].enddate;
                                        if (new Date(resStrt) > new Date(tempBillStart)) {
                                            tempBillStart = resStrt;
                                        }
                                        if (new Date(tempBillEnd) > new Date(resEnd)) {
                                            tempBillEnd = resEnd;
                                        }
                                       // log.debug("tempBillStart : tempBillEnd", tempBillStart + " : " + tempBillEnd);
                                        var wkendinTime = checktsCount(subProjResults[sub].id, tempBillStart, tempBillEnd);
                                        // weekendingDays = getDaysinPeriod(tempBillStart, tempBillEnd);
                                        weekendingDays = countWeekends(tempBillStart, tempBillEnd, projectWeekendingDay)
                                        if (wkendinTime != weekendingDays) {
                                            log.debug("Days in Cycle : Days in Time Track of Subproject: " + subProjResults[sub].id, weekendingDays + " : " + wkendinTime);
                                        }
                                        if (wkendinTime < weekendingDays) {
                                            grpInvCrtn = false;
                                        }
                                    }
                                    // log.debug("Reduce Stage: Create Invoice for grp: ", grpInvCrtn);
                                    if (grpInvCrtn) {
                                        createInvoiceCheck = true;
                                    }
                                    log.debug("get input: Create Invoice: ", createInvoiceCheck);

                                } else {
                                    log.error("Transaction Failure Report creation")
                                    var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because Subprojects has different Billing Cycles.", 1, projectID)
                                    log.error("Error in createInvoice: Created the Transaction Error ID", errID);

                                    tranErr = true;
                                    // log.debug("Transaction Error check", tranErr)
                                }
                            } else {
                                log.error("Transaction Failure Report creation")
                                var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because Subprojects are not available to bill.", 1, projectID);
                                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                tranErr = true;
                                log.debug("Transaction Error check", tranErr)
                            }
                            if (!tranErr) {
                                // log.debug("Customer PO search: for individual project");
                                var customerPOSearchObj = search.create({
                                    type: "customrecord_ascendion_cust_po_details",
                                    filters: [
                                        ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectID],
                                        "AND",
                                        [
                                            ["custrecord_asc_cpd_end_date", "onorafter", billingStartDate], "AND", ["custrecord_asc_cpd_start_date", "onorbefore", billingEndDate]
                                        ]
                                    ],
                                    columns: [
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_start_date",
                                            sort: search.Sort.ASC,
                                            label: "Start Date"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_single_budget"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_ignore_budget"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_billing_address"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_billing_address_2"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_city"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_state"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_zip"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_country"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_start_date"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_end_date"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_cust_po_num"
                                        }),
                                        search.createColumn({
                                            name: "custrecord_asc_cpd_sales_tax"
                                        })
                                    ]
                                });
                                var poResultSet = customerPOSearchObj.run();
                                customerPODetails = poResultSet.getRange({
                                    start: 0,
                                    end: 1
                                });
                                poLength = customerPODetails.length;
                                log.debug("Customer PO Details found: ", customerPODetails.length);
                                if (customerPODetails.length == 2) {
                                    splitDate = customerPODetails[1].getValue("custrecord_asc_cpd_start_date");
                                } else {
                                    splitDate = "nosplit";

                                    if (customerPODetails.length > 0) {
                                        customerPODetails = customerPODetails[0]
                                    } else {
                                        customerPODetails = false

                                    }
                                    if (projectType == 1 || projectType == 2 || projectType == 3) {
                                        var employee = projectDetails.employee;
                                        log.debug("employee for the project", employee);
                                        var customrecord_clb_subconbillrateSearchObj = search.create({
                                            type: "customrecord_clb_subconbillrate",
                                            filters: [
                                                ["custrecord_clb_subconbillrecord", "anyof", employee],
                                                "AND",
                                                ["custrecord_clb_proj_bill", "anyof", projectID],
                                                "AND",
                                                ["custrecord_clb_eff_date", "onorbefore", billingEndDate],
                                                "AND",
                                                ["custrecord_clb_eff_date", "after", billingStartDate]
                                            ],
                                            columns: [
                                                search.createColumn({
                                                    name: "custrecord_clb_eff_date",
                                                    summary: "GROUP",
                                                    label: "Effective Date",
                                                    sort: search.Sort.DESC
                                                }),
                                            ]
                                        });
                                        var billrateSearch = customrecord_clb_subconbillrateSearchObj.run();
                                        billrateSearch = billrateSearch.getRange({
                                            start: 0,
                                            end: 1
                                        });
                                        log.debug("billrateSearch.length", billrateSearch.length)
                                        if (billrateSearch.length >= 1) {

                                            splitDate = billrateSearch[0].getValue({
                                                name: "custrecord_clb_eff_date",
                                                summary: "GROUP",
                                                label: "Effective Date"
                                            })
                                            billSplit = true;
                                        }
                                    }

                                }
                                log.debug("Split Date: ", splitDate)

                            }
                            var poStartDate;
                            var poEndDate;
                            //   log.debug("customerPODetails", customerPODetails)
                            if (customerPODetails) {
                                if (poLength == 2) {
                                    poStartDate = customerPODetails[0].getValue("custrecord_asc_cpd_start_date");
                                    poEndDate = customerPODetails[1].getValue("custrecord_asc_cpd_end_date");
                                } else if (poLength > 0) {
                                    poStartDate = customerPODetails.getValue("custrecord_asc_cpd_start_date");
                                    poEndDate = customerPODetails.getValue("custrecord_asc_cpd_end_date");
                                }
                                log.debug("poStartDate : poEndDate", poStartDate + " : " + poEndDate)
                                if (new Date(poStartDate) > new Date(billingStartDate)) {
                                    billingStartDate = poStartDate;
                                }
                                if (new Date(poEndDate) < new Date(billingEndDate)) {
                                    billingEndDate = poEndDate
                                }
                                log.debug("Final billingStartDate : billingEndDate", billingStartDate + " : " + billingEndDate)
                            }
                            DataArray.push({ 'billingEndDate': billingEndDate, 'billingStartDate': billingStartDate, 'customerPODetails': customerPODetails, 'projectID': projectID, 'customerID': customerID, 'createInvoiceCheck': createInvoiceCheck, 'projectFilter': projectFilter, 'splitDate': splitDate })

                        }

                    }
                    return DataArray;

                } else {
                    log.debug("No project to process.")
                }


            } catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }
        }
        function map(context) {
            var invDetails = JSON.parse(context.value);
             log.debug('context',invDetails)
            if(invDetails.createInvoiceCheck == true){
                var timebillSearchObj = search.create({
                    type: "timebill",
                    filters: [
                        ["customer", "anyof", invDetails.projectFilter],
                        "AND",
                        ["date", "within", invDetails.billingStartDate, invDetails.billingEndDate],
                        "AND",
                        ["custcol_asc_timesheet_status", "anyof", "2"],
                        "AND",
                        ["status", "is", "T"],
                        "AND",
                        ["type", "anyof", "A"],
                        "AND",
                        ["custcol_clb_weekendingdate", "isnotempty", ""],
                        "AND",
                        ["custcol_clb_invoice", "anyof", "@NONE@"]
                    ],
                    columns: [
                        search.createColumn({
                            name: "date",
                            sort: search.Sort.ASC
                        }),
                        search.createColumn({
                            name: "internalid",
                            join: "item"
                        }),
                        search.createColumn({
                            name: "hours"
                        }),
                        search.createColumn({
                            name: "custcol_clb_billrate"
                        }),
                        search.createColumn({
                            name: "durationdecimal"
                        }),
    
                    ]
                });
                var searchResultCount = timebillSearchObj.runPaged().count;
                log.debug("searchResultCount", searchResultCount);
                if (invDetails.splitDate == "nosplit") {
                    // log.debug("inside no split")
                    var invoicingDetails = {};
                    var invoiceTotal = 0;
                    //  log.debug('timebillSearchObj1',timebillSearchObj);
                    var counter = 0;
    
                    const pagedData = timebillSearchObj.runPaged({
                        pageSize: 100
                    });
    
                    // let lineCount = 0;
                    // prRecords.forEach(function (result) {
                    pagedData.pageRanges.forEach(function (pageRange) {
                        const page = pagedData.fetch({ index: pageRange.index });
                        page.data.forEach(function (result) {
                            var trackTimeID = result.id;
                            var taskID = result.getValue({
                                name: "internalid",
                                join: "item"
                            });
                            var hours = result.getValue("hours") ? result.getValue("hours") : 0;
                            var billRate = result.getValue("custcol_clb_billrate") ? result.getValue("custcol_clb_billrate") : 0;
                            var hoursDecimal = result.getValue("durationdecimal") ? result.getValue("durationdecimal") : 0;
                            // log.debug("billRate",billRate);
                            if (!invoicingDetails.hasOwnProperty(taskID)) {
                                var trackTimeDetails = {
                                    "tracktimeId": [],
                                    "hours": [],
                                    "billRate": [],
                                    "taskTotal": 0,
                                    "existingTotal": 0
                                };
                                invoicingDetails[taskID] = trackTimeDetails;
    
                            }
                            // log.debug("invoicingDetails 1",invoicingDetails);
    
                            invoicingDetails[taskID]["tracktimeId"].push(trackTimeID);
                            invoicingDetails[taskID]["hours"].push(hours);
                            invoicingDetails[taskID]["billRate"].push(billRate);
                            var tempTotal = hoursDecimal * billRate;
                            invoiceTotal += tempTotal;
                            invoicingDetails[taskID].taskTotal += tempTotal
                            // log.debug("invoicingDetails 2",invoicingDetails);
    
                            return true;
                        })
                    });
    
                    // log.debug('invoicingDetails',invoicingDetails);
                    context.write({ key: invDetails.customerID, value: { invoiceDetails: invDetails, tiemsheetDetails: invoicingDetails } });
    
                }

            }
           

        }
        function reduce(context) {
            // log.debug("context",context);
            // log.debug("context.key",context.key);
            // log.debug("context.values",JSON.parse(context.values));
            var data = JSON.parse(context.values);
            try {

                log.debug("data", data);
                var invoicingDetails = data.invoiceDetails;

               // log.debug("invoicingDetails",invoicingDetails);

               // createInvoice(data.tiemsheetDetails, '4', invoicingDetails.customerID, invoicingDetails.projectID, invoicingDetails.billingStartDate, invoicingDetails.billingEndDate, invoicingDetails.customerPODetails);
                context.write({
                    key: 1,
                    value: data
                });
            } catch (error) {
                log.error("Reduce error: ", error);
            }

        }



        function summarize(context) {
            context.output.iterator().each(function(key, value) {
                log.debug('Summarized Result', 'Key: ' + key + ', Final Sum: ' + value);
                value = JSON.parse(value);
                var invoicingDetails = value.invoiceDetails;
                log.debug('invoicingDetails',invoicingDetails)
                createInvoice(value.tiemsheetDetails, '4', invoicingDetails.customerID, invoicingDetails.projectID, invoicingDetails.billingStartDate, invoicingDetails.billingEndDate, invoicingDetails.customerPODetails);
                
            });

        }

        function getCustomerAddresses(customerId) {
            var addresses = [];
            try {
                var customerSearchObj = search.create({
                    type: "customer",
                    filters:
                        [
                            ["internalid", "anyof", "68806"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "address", label: "Address" }),
                            search.createColumn({ name: "city", label: "City" }),
                            search.createColumn({ name: "state", label: "State/Province" }),
                            search.createColumn({ name: "zipcode", label: "Zip Code" }),
                            search.createColumn({ name: "country", label: "Country" }),
                            search.createColumn({ name: "address1", label: "Address 1" }),
                            search.createColumn({ name: "address2", label: "Address 2" })
                        ]
                });
                var searchResultCount = customerSearchObj.runPaged().count;
                //  console.log("customerSearchObj result count",searchResultCount);
                customerSearchObj.run().each(function (result) {
                    var address = {
                        // internalid: result.getValue({ name: 'addressinternalid' }),
                        label: result.getValue({ name: 'addresslabel' }),
                        addr1: result.getValue({ name: 'address1' }),
                        addr2: result.getValue({ name: 'address2' }),
                        city: result.getValue({ name: 'city' }),
                        state: result.getValue({ name: 'state' }),
                        zip: result.getValue({ name: 'zipcode' }),
                        country: result.getValue({ name: 'country' })
                    };

                    addresses.push(address);
                    return true;  // Continue iteration
                });
            } catch (e) {
                log.error({
                    title: 'Error fetching customer addresses',
                    details: e
                });
            }

            return addresses;
        }

        function createInvoice(invoicingDetails, projectType, customerID, projectID, billingStartDate, billingEndDate, customerPOInfo) {
            try {
                log.debug("customerPOInfo", customerPOInfo);
                log.debug("invoice creation function for the customer: " + customerID, "Project Type: " + projectType + "  Project ID: " + projectID);
                var invoiceObj = record.create({ type: 'invoice', isDynamic: true });
                invoiceObj.setValue("entity", customerID);
                invoiceObj.setValue("custbody_clb_projecttypeapproval", projectType);
                invoiceObj.setValue("custbody_asc_inv_project_selected", projectID);
                invoiceObj.setValue("taxdetailsoverride", true);
                var customerAddress = getCustomerAddresses(customerID);
                customerAddress = customerAddress.length > 0 ? customerAddress[0] : "";

                invoiceObj.setValue({ fieldId: 'customform', value: 168, ignoreFieldChange: true });

                customerPOInfo = record.load({
                    type: 'customrecord_ascendion_cust_po_details',
                    id: customerPOInfo.id,
                    isDynamic: true,
                })

                log.debug("customerPOInfo: ",customerPOInfo);
                if (customerPOInfo != true) {
                    
                    var poStartDate = new Date(customerPOInfo.getValue("custrecord_asc_cpd_start_date"));
                    var poEndDate = new Date(customerPOInfo.getValue("custrecord_asc_cpd_end_date"));

                    log.debug("poStartDate: "+poStartDate+ " poEndDate: "+poEndDate);

                    if (poStartDate > new Date(billingStartDate)) {
                        invoiceObj.setValue("custbody_clb_periodstartingdate", poStartDate);
                    }
                    else {
                        invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate));
                    }
                    if (poEndDate < new Date(billingEndDate)) {
                        invoiceObj.setValue("custbody_clb_periodendingdate", poEndDate);
                    }
                    else {
                        invoiceObj.setValue("custbody_clb_periodendingdate", new Date(billingEndDate));
                    }
                    invoiceObj.setValue("startdate", poStartDate);
                    invoiceObj.setValue("enddate", poEndDate);
                    invoiceObj.setValue("otherrefnum", customerPOInfo.getValue("custrecord_asc_cpd_cust_po_num"));

                    log.debug("customerPOInfo.getValue(custrecord_asc_cpd_country)[0]",customerPOInfo.getValue("custrecord_asc_cpd_country")[0]);

                    if (customerPOInfo.getValue("custrecord_asc_cpd_country")[0]) //&&customerPOInfo.getValue("custrecord_asc_cpd_state")[0]&&customerPOInfo.getValue("custrecord_asc_cpd_city")&&customerPOInfo.getValue("custrecord_asc_cpd_billing_address")
                    {
                        var subrec = invoiceObj.getSubrecord({ fieldId: 'shippingaddress' });
                        var country = customerPOInfo.getText("custrecord_asc_cpd_country");
                        subrec.setText({ fieldId: 'country', value: country });
                        var state = customerPOInfo.getValue("custrecord_asc_cpd_state") ? customerPOInfo.getValue("custrecord_asc_cpd_state") : customerAddress.state;
                        subrec.setValue({ fieldId: 'state', value: state ? state : country });
                        var city = customerPOInfo.getValue("custrecord_asc_cpd_city") ? customerPOInfo.getValue("custrecord_asc_cpd_city") : customerAddress.city;
                        subrec.setValue({ fieldId: 'city', value: city ? city : country });
                        var addr1 = customerPOInfo.getValue("custrecord_asc_cpd_billing_address") ? customerPOInfo.getValue("custrecord_asc_cpd_billing_address") : customerAddress.addr1;
                        subrec.setValue({ fieldId: 'addr1', value: addr1 ? addr1 : country });
                        var addr2 = customerPOInfo.getValue("custrecord_asc_cpd_billing_address_2") ? customerPOInfo.getValue("custrecord_asc_cpd_billing_address_2") : customerAddress.addr2;
                        subrec.setValue({ fieldId: 'addr2', value: addr2 ? addr2 : country });
                        var zip = customerPOInfo.getValue("custrecord_asc_cpd_zip") ? customerPOInfo.getValue("custrecord_asc_cpd_zip") : customerAddress.zip;
                        subrec.setValue({ fieldId: 'zip', value: zip ? zip : country });
                    }
                    var salesTax = customerPOInfo.getValue("custrecord_asc_cpd_sales_tax");
                    if (salesTax) {
                        var salesTaxLookup = search.lookupFields({
                            type: "customrecord_clb_taxgroup",
                            id: salesTax,
                            columns: ['custrecord_asc_taxcode_isgroup']
                        });
                        log.debug("salesTaxLookup", salesTaxLookup);
                        if (salesTaxLookup.custrecord_asc_taxcode_isgroup == true) {
                            invoiceObj.setValue("custbody_clb_applicable_tax_group", salesTax);
                        }
                        else {
                            invoiceObj.setValue("custbody_clb_applicable_tax_code", salesTax);
                        }
                    }
                }
                else {
                    log.debug("inside else part")
                    invoiceObj.setValue("custbody_clb_periodendingdate", new Date(billingEndDate))
                    invoiceObj.setValue("custbody_clb_periodstartingdate", new Date(billingStartDate))
                }
                var timeSheetconsolidatedIDs = [];
                Object.keys(invoicingDetails).forEach(function (key) {
                    log.debug("InvoicingDetails: 1 ", JSON.stringify(invoicingDetails));
                    if (key != 'invoiceTotal') {
                        log.debug('Key : ' + key, 'Value : ' + JSON.stringify(invoicingDetails[key]));
                        var trackTimeDetails = invoicingDetails[key];
                        var trackTimeIDs = trackTimeDetails["tracktimeId"];
                        var timeRate = trackTimeDetails["billRate"];
                        log.debug("Invoice creation Function: ", trackTimeIDs.length + " : " + timeRate)
                        var count = 0;
                        for (var tt = 0; tt < trackTimeIDs.length; tt++) {
                            var linenum = invoiceObj.findSublistLineWithValue({ sublistId: 'time', fieldId: 'doc', value: trackTimeIDs[tt] });
                            timeSheetconsolidatedIDs.push(trackTimeIDs[tt])
                            //log.debug("linenum of trackTimeIDs[tt] ", trackTimeIDs[tt] + "is:" + linenum)
                            if (linenum > -1) {
                                count++;
                                invoiceObj.selectLine({ sublistId: 'time', line: linenum });
                                invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'apply', value: true });
                                invoiceObj.setCurrentSublistValue({ sublistId: 'time', fieldId: 'rate', value: timeRate[tt] });
                                invoiceObj.commitLine({ sublistId: 'time' });
                            }
                        }
                        //log.debug("count", count);
                    }
                });
                var invAmount = invoiceObj.getValue("total");
                log.debug("invAmount",invAmount);
              //  log.debug("Invoice obj: ", invoiceObj);
                if (invAmount > 0) {
                    var invoiceID = invoiceObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                    log.debug('invoiceID',invoiceID);
                    log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs.length + " : " + timeSheetconsolidatedIDs.length)
                    if (invoiceID) {
                        // for (var ii = 0; ii < timeSheetconsolidatedIDs.length; ii++) {
                        //     record.submitFields({
                        //         type: record.Type.TIME_BILL,
                        //         id: timeSheetconsolidatedIDs[ii],
                        //         values: {
                        //             "custcol_clb_invoice": invoiceID
                        //         },
                        //         options: {
                        //             enableSourcing: false,
                        //             ignoreMandatoryFields: true
                        //         }
                        //     });
                        // }
                    }
                    return invoiceID;
                }
                else {
                    var e = {};
                    e.message = "No Timesheets with hours more than 0 found or No Bill Rate found for the period dates."
                    throw e;
                }
            }
            catch (e) {
                log.error("Errot at Stage : createInvoice function", e)
                log.error("Transaction Failure Report creation")
                var errID = lib.trnsctnFailureRec(billingStartDate, billingEndDate, "Invoice Creation Failed because: " + e.message, 1, projectID)
                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                var projectID = record.submitFields({
                    type: record.Type.JOB,
                    id: projectID,
                    values: {
                        "custentity_clb_nst_lst_invc_dte": new Date()
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            }
        }

        function countWeekends(startDate, endDate, weekendDay) {
            // Convert startDate and endDate to Date objects
            let start = new Date(startDate);
            let end = new Date(endDate);

            // Get the weekend day number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
            let weekendDayNumber = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(weekendDay);

            // Initialize the weekend count
            let weekendCount = 0;
            let lastWeekend = null;

            // Loop through the date range
            let current = new Date(start);
            while (current <= end) {
                // Check if the current date is the weekend day
                if (current.getDay() === weekendDayNumber) {
                    weekendCount++;
                    lastWeekend = new Date(current); // Store the last weekend date
                }
                // Move to the next day
                current.setDate(current.getDate() + 1);
            }

            // Check if there are remaining days after the last weekend but before the end date
            if (lastWeekend && lastWeekend < end) {
                // Calculate the next weekend after the last one
                let nextWeekend = new Date(lastWeekend);
                nextWeekend.setDate(lastWeekend.getDate() + 7);

                // If the next weekend doesn't exceed the end date, add it to the count
                if (nextWeekend > end) {
                    weekendCount++;
                }
            }
            if (weekendCount == 0) {
                weekendCount = 1;
            }

            return weekendCount;


        }
        function checktsCount(projectFilter, billingStartDate, billingEndDate) {
            //  log.debug("Check TS Count function")
            var wkendinTime;
            var trackTimeObj = search.create({
                type: "timebill",
                filters: [
                    ["customer", "anyof", projectFilter],
                    "AND",
                    ["date", "within", billingStartDate, billingEndDate],
                    "AND",
                    ["custcol_asc_timesheet_status", "anyof", "2"],
                    "AND",
                    ["status", "is", "T"],
                    "AND",
                    ["custcol_clb_weekendingdate", "isnotempty", ""],
                    "AND",
                    ["type", "anyof", "A"],
                    "AND",
                    ["custcol_clb_invoice", "anyof", "@NONE@"]
                ],
                columns: [
                    search.createColumn({
                        name: "custcol_clb_weekendingdate",
                        summary: "GROUP",
                        label: "Week Ending Date"
                    }),
                    //,
                    // search.createColumn({
                    //     name: "customer",
                    //     summary: "GROUP"
                    // })
                ]
            });
            wkendinTime = trackTimeObj.runPaged().count;
        //    log.debug("Reduce Stage: Weekending Dates In Time", wkendinTime);
            return wkendinTime;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize,
        };
    });