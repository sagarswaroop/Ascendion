/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author Sagar Kumar
 */
define(['N/record', 'N/file', "N/runtime", "N/search", "N/query"], (record, file, runtime, search, query) => {

    const projectType = {
        "Subtier resource": 2,
        "Group Projects": 4,
        "Fixed Prices Projects": 5
    }

    // Biweekly cycle 2, Friday-ending Weekly, Special Invoicing terms, monthly
    const billingcycleList = {
        "Monthly": 2,
        "Friday-ending Weekly": 26,
        "Weekly": 3,
        "Biweekly": 42,
        "Sunday-ending Weekly": 160,
        "Biweekly cycle 1": 18,
        "Biweekly cycle 2": 19,
    }

    function getInputData() {
        try {
            const validateDataList = [];
            const scriptObj = runtime.getCurrentScript();
            const fileId = scriptObj.getParameter({ name: "custscript_csv_fileid" });
            log.debug({ title: "fileId", details: fileId });
            const fileObj = file.load({ id: fileId });
            if (fileObj.fileType != file.Type.CSV) {
                throw new Error("Please provide CSV file.");
            }
            let iterator = fileObj.lines.iterator();

            // Skip the first line, which is the CSV header line
            iterator.each(function () { return false; });

            // log.debug({ title: "File Loaded", details: "Starting to read lines." });

            // Process each line in the file
            iterator.each(function (line) {
                // Update the total based on the line value
                let lineValues = line.value.split(',');
                // log.debug({ title: "lineValues", details: lineValues });
                validateDataList.push({ "empId": lineValues[0], "startDate": lineValues[1], "endDate": lineValues[2] });

                return true;
            });
            log.debug({ title: "Get input: validateDataList", details: validateDataList.length });
            return validateDataList;
        } catch (error) {
            log.error({ title: "Get Input : Error", details: error });
        }
    }

    function map(context) {
        try {
            const rowData = JSON.parse(context.value);
            rowData.tsApprovalStatus = "";
            let approvedTSresult = [];
            // log.debug({ title: "Map Context", details: rowData });

            approvedTSresult = checkApprovedTimeBill(rowData.empId, rowData.startDate, rowData.endDate);

            if (approvedTSresult.length > 0) {

                rowData.tsApprovalStatus = "approved";
                // approvedTSresult.forEach(data => {
                //     const resourceDetails = getProjectDetails(data.project, rowData.empId);
                //     getDateBasedBillingCycle(resourceDetails,rowData.startDate, rowData.endDate)
                //     if (data.weekendingDate !== rowData.endDate) {
                //         approvedTSresult = checkApprovedTimeBill(rowData.empId, getWeekStartDate(data.weekendingDate), data.weekendingDate);
                //     }
                // });

            } else {
                approvedTSresult = checkSubmitTimeBill(rowData.empId, rowData.startDate, rowData.endDate);

                if (approvedTSresult.length > 0) {

                    rowData.tsApprovalStatus = "submitted";
                    // submitTSresult.forEach(data => {

                    //     if (data.weekendingDate !== rowData.endDate) {
                    //         submitTSresult = checkSubmitTimeBill(rowData.empId, getWeekStartDate(data.weekendingDate), data.weekendingDate);
                    //     }
                    // });
                }

            }

            // const tsResult = [...approvedTSresult, ...submitTSresult];

            // log.debug("reduce data",{ key: rowData.empId, value: {result: approvedTSresult}});

            if (approvedTSresult.length == 0) {
                approvedTSresult.push(rowData);
            }

            // log.debug("Map Stage: approvedTSresult", approvedTSresult);

            context.write({ key: rowData.empId + "_" + rowData.startDate + "_" + rowData.endDate, value: { originalData: rowData, result: approvedTSresult } });
        } catch (error) {
            log.error("Map Stage: Error", error);
        }

    }



    function reduce(context) {
        log.debug("Reduce Stage: context", context);
        const errorList = [];
        try {
            debugger;
            const uniqueKey = context.key;
            const data = JSON.parse(context.values);
            log.debug("Reduce stage: fetch data", { key: uniqueKey, data: data });
            const tsStatus = data.originalData.tsApprovalStatus;
            log.debug("tsStatus", tsStatus);
            if (!tsStatus) {
                errorList.push(`*TS is not available - ${uniqueKey}.`);
                log.debug("validateData", "TS is not available.");
            } else {
                data.result.forEach(lineData => {
                    // log.debug("validateData", lineData);

                    // fetch project and resource allocation details.
                    const resourceDetails = getProjectDetails(lineData.project, data.originalData.empId);
                    // log.debug("Reduce: resourceDetails", resourceDetails);
                    // get total dates as per 7 days.

                    let updatedData = getDateBasedBillingCycle(resourceDetails, lineData.startDate, lineData.endDate, lineData.project, data.originalData.empId);
                    log.debug("Reduce: updatedData", updatedData);

                    if (updatedData.length == 0) {
                        updatedData = lineData;
                    }else{
                        updatedData = updatedData[0];
                    }

                    //check vendor bill is available and log if found.
                    let billList = updatedData.vdrBill.filter(id => id !== "");
                    billList.forEach(billId => {
                        const billDetails = getBillDetails(billId);
                        errorList.push(`${billDetails.tranid} bill available - ${billDetails.billstartdate} : ${billDetails.billenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                    });

                    // check other details if no bill found.
                    if (billList.length == 0) {

                        //check customer invoice is available and log if found.
                        let invList = updatedData.invoice.filter(id => id !== "");
                        invList.forEach(billId => {
                            // const billDetails = getBillDetails(billId);
                            errorList.push(`Customer Invoice available - period ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                        });

                        // check resource allocation.
                        if (resourceDetails.length == 0) {
                            errorList.push(`* No resource allocation found - period ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                        } else {
                            if (resourceDetails.projecttype == "") {
                                errorList.push(`* ${resourceDetails.entityid} Project type is missing - ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} - ${resourceDetails.taskid} (task id)`);
                                log.debug("validateData", `*Project type is missing- ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            }

                            if (resourceDetails.resourcestart > updatedData.endDate) {
                                errorList.push(`** Resource allocation start after time sheet period - ${resourceDetails.resourcestart} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            }

                            debugger;
                            log.debug("validateData", `Resource Allocation End Date: ${resourceDetails.resourceend} | TS Start Date: ${updatedData.startDate}`);
                            if (new Date(resourceDetails.resourceend) < new Date(updatedData.startDate)) {
                                errorList.push(`** Resource allocation end before time sheet period - ${resourceDetails.resourceend} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            }
                        }


                        // check pay rate.
                        const payRateRecord = getPayRate(data.originalData.empId, lineData.project);

                        if (payRateRecord.length == 0) {
                            errorList.push(`* No pay Rate available - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                        } else {
                            if (payRateRecord.length > 1) {
                                payRateRecord.forEach(PayRateData => {
                                    if (PayRateData.taskType == "1" && PayRateData.rate > 0) { //ST
                                        if (PayRateData.date <= updatedData.startDate) {
                                            errorList.push(`${PayRateData.rate} ST pay rate is available - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                        } else if (PayRateData.date <= updatedData.endDate && PayRateData.date > updatedData.startDate) {
                                            errorList.push(`*** ${PayRateData.rate} ST Pay rate is available from - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                        } else if (data.date >= updatedData.endDate) {
                                            errorList.push(`** ${PayRateData.rate} ST Pay rate is available after - ${data.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                        }
                                    } else if (PayRateData.taskType == "2" && PayRateData.rate > 0) { //OT
                                        if (PayRateData.date <= updatedData.startDate) {
                                            errorList.push(`${PayRateData.rate} OT pay rate is available - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                        } else if (PayRateData.date <= updatedData.endDate && PayRateData.date > updatedData.startDate) {
                                            errorList.push(`*** ${PayRateData.rate} OT Pay rate is available from - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                        } else if (PayRateData.date >= updatedData.endDate) {
                                            errorList.push(`** ${PayRateData.rate} OT Pay rate is available after - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                        }
                                    } else {
                                        errorList.push(`* No pay Rate available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                    }
                                });
                            }else{
                                const PayRateData = payRateRecord[0];
                                 if (PayRateData.taskType == "1" && PayRateData.rate > 0){
                                    errorList.push(`* OT Rate not available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                 }else{
                                    errorList.push(`* ST Rate not available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                 }
                            }
                        }

                        // check vendor details.
                        const VendorDetails = getVendorDetail(data.originalData.empId, lineData.project, updatedData.startDate);

                        if (VendorDetails.length > 0) {
                            VendorDetails.forEach(detail => {
                                if (detail.startdate <= updatedData.startDate) {
                                    errorList.push(`Vendor Detail available and correct - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                } else if (detail.startdate > updatedData.endDate) {
                                    errorList.push(`** Vendor Detail available after date - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                }
                            });
                        } else {
                            errorList.push(`* Vendor Detail not available - employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                        }

                        // check time track.
                        if (updatedData.tsDateList.length == 0) {
                            errorList.push(`* Time sheet is missing- ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            log.debug("validateData", `Time sheet is missing- ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                        } else if (updatedData.tsStatus == 'submit') {
                            errorList.push(`** Time sheet available with submit - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            log.debug("validateData", `Time sheet available with submit - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                        } else if (updatedData.tsStatus == 'approved') {
                            if (updatedData.tsDateList.length > 0 && updatedData.tsDateList.length != 7) {
                                errorList.push(`** Time sheet incomplete with ${updatedData.tsStatus} - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id) TS Dates: ${updatedData.tsDateList.join(", ")}`);
                            } else {
                                errorList.push(`Time sheet available with approved - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            }
                        }

                    }

                });
            }

            log.debug("Reduce stage: errorList", errorList);

            context.write({ key: uniqueKey, value: errorList });
        } catch (error) {
            log.error("Reduce Stage: Error", error);
        }
    }

    function summarize(summary) {
        try {
            const scriptObj = runtime.getCurrentScript();
            const fileId = scriptObj.getParameter({ name: "custscript_csv_fileid" });
            const inputFile = file.load({ id: fileId });
            const folderId = inputFile.folder;
            log.debug("Summarize Stage: File Folder", folderId);

            const errorMap = {};

            // Read all results from reduce stage
            summary.output.iterator().each(function (key, value) {
                try {
                    // log.debug("summarize key value", { key: key, value: value });
                    const errorList = JSON.parse(value);
                    errorMap[key] = errorList.join(" | ");
                } catch (err) {
                    log.error("summarize parse error", err);
                }
                return true;
            });

            //check
            // Skip the first line, which is the CSV header line
            let newHeader = "";
            let iterator = inputFile.lines.iterator();
            iterator.each(function (headerLine) {
                newHeader = headerLine.value + ",comment";
            });

            const outputLines = [newHeader];

            // Process each line in the file
            iterator.each(function (line) {
                // log.debug({ title: "line", details: line });
                // log.debug({ title: "line value", details: line.value });
                // Update the total based on the line value
                let uniqueKey = line.value.split(",").join("_");
                const comment = errorMap[uniqueKey] || "";
                outputLines.push(`${line.value},${comment}`);
                return true;
            });

            log.debug("Summarize Stage: outputLines: " + outputLines.length, outputLines);

            let newCsvContent = outputLines
                .map(line => {
                    // Split by comma and quote each field
                    let cols = line.split(",");
                    return cols.map(value => `"${value.replace(/"/g, '""')}"`).join(",");
                })
                .join("\n");

            // Save as new file
            const newFile = file.create({
                name: `Processed_${inputFile.name}`,
                fileType: file.Type.CSV,
                contents: newCsvContent,
                folder: folderId
            });

            const newFileId = newFile.save();
            log.audit("Summary Complete", `File created successfully with id: ${newFileId}`);

        } catch (e) {
            log.error("Summary Error", e);
        }
    }

    function formateDate(date) {
        let sysdate = new Date(date);
        return ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
            + ('0' + sysdate.getDate()).slice(-2) + '/'
            + sysdate.getFullYear();
    }

    function checkSubmitTimeBill(empId, startDate, endDate) {
        const submittedTimeBillList = [];
        try {
            let isApprovedTimeBill = true;
            var timeBillSubmittedStatusObj = search.create({
                type: "timebill",
                filters:
                    [
                        // ["approvalstatus", "anyof", "3"],
                        // "AND",
                        ["employee", "anyof", empId],
                        "AND",
                        ["date", "within", startDate, endDate],
                        "AND",
                        ["duration", "greaterthanorequalto", "0"],
                        "AND",
                        ["type", "anyof", "A"],
                        // "AND",
                        // ["custcol_clb_weekendingdate", "on", rowData.endDate]
                    ],
                columns:
                    [
                        search.createColumn({ name: "date", label: "Date" }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "durationdecimal", label: "Duration (Decimal)" }),
                        search.createColumn({ name: "type", label: "Type" }),
                        search.createColumn({ name: "custcol_asc_timesheet_status", label: "Approval Status" }),
                        // search.createColumn({ name: "casetaskevent", label: "Case/Task/Event" }),
                        // search.createColumn({ name: "timesheet", label: "Timesheet" }),
                        // search.createColumn({ name: "line.cseg_clb_eventsegme", label: "Event" }),
                        // search.createColumn({ name: "line.csegclb_busbu", label: "BU/SBU" }),
                        search.createColumn({ name: "custcol_asc_workflow_taskid", label: "Workflow Task Id" }),
                        search.createColumn({ name: "custcol_clb_weekendingdate", label: "Week Ending Date" }),
                        search.createColumn({ name: "customer", label: "customer" }),
                        search.createColumn({ name: "custcol_clb_billrate", label: "Bill Rate" }),
                        search.createColumn({ name: "custcol_asc_payrete", label: "Pay Rate" }),
                    ]
            });
            const timeBillApprovalStatusCount = timeBillSubmittedStatusObj.runPaged().count;
            log.debug("timeBillSubmittedStatusObj result count", timeBillApprovalStatusCount);
            timeBillSubmittedStatusObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                const tsDate = result.getValue({ name: "date", label: "Date" });
                const itemId = result.getValue({ name: "item", label: "Item" });
                const duration = result.getValue({ name: "durationdecimal", label: "Duration (Decimal)" });
                const wkfTaskId = result.getValue({ name: "custcol_asc_workflow_taskid", label: "Workflow Task Id" });
                const billRate = result.getValue({ name: "custcol_clb_billrate", label: "Bill Rate" });
                const payRate = result.getValue({ name: "custcol_asc_payrete", label: "Pay Rate" });
                const weekEndingDate = result.getValue({ name: "custcol_clb_weekendingdate", label: "Week Ending Date" });
                const approvalstatus = result.getValue({ name: "custcol_asc_timesheet_status", label: "Approval Status" });
                const project = result.getValue({ name: "customer", label: "customer" });

                if (approvalstatus == 1) {
                    isApprovedTimeBill = false;
                }

                const isProjectIndex = submittedTimeBillList.findIndex(rec =>
                    rec.project == project
                );

                if (isProjectIndex !== -1 && approvalstatus == 1) {
                    const obj = submittedTimeBillList[isProjectIndex];
                    if (obj.tsDateList.findIndex(date => date == tsDate) == -1) {
                        obj.tsDateList.push(tsDate);
                    }
                    if (obj.payRate == 0) {
                        obj.payRate = payRate;
                    }
                    if (obj.billRate == 0) {
                        obj.billRate = billRate;
                    }

                    obj.duration += parseFloat(duration);
                } else {
                    submittedTimeBillList.push({
                        "tsStatus": "submit",
                        "weekendingDate": weekEndingDate,
                        "startDate": formateDate(startDate),
                        "endDate": formateDate(endDate),
                        "project": project,
                        "empId": empId,
                        "duration": parseFloat(duration),
                        "workflowTaskId": wkfTaskId,
                        "billRate": billRate,
                        "payRate": payRate,
                        "tsDateList": [tsDate]
                    });
                }

                return true;
            });

            return submittedTimeBillList;
        } catch (error) {
            log.error("checkSubmitTimeBill: error", error);
            return [];
        }
    }

    function checkApprovedTimeBill(empId, startDate, endDate) {

        // log.debug("checkApprovedTimeBill data:", { empId: empId, startDate: startDate, endDate: endDate });
        const approvedTimeBillList = [];
        try {
            var timeBillApprovalStatusObj = search.create({
                type: "timebill",
                filters:
                    [
                        ["custcol_asc_timesheet_status", "anyof", "2"],
                        "AND",
                        ["employee", "anyof", empId],
                        "AND",
                        ["date", "within", startDate, endDate],
                        "AND",
                        ["duration", "greaterthanorequalto", "0"],
                        "AND",
                        ["type", "anyof", "A"],
                        // "AND",
                        // ["custcol_clb_weekendingdate", "on", rowData.endDate]
                    ],
                columns:
                    [
                        search.createColumn({ name: "date", label: "Date" }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "durationdecimal", label: "Duration (Decimal)" }),
                        search.createColumn({ name: "type", label: "Type" }),
                        search.createColumn({ name: "approvalstatus", label: "Approval Status" }),
                        // search.createColumn({ name: "casetaskevent", label: "Case/Task/Event" }),
                        // search.createColumn({ name: "timesheet", label: "Timesheet" }),
                        // search.createColumn({ name: "line.cseg_clb_eventsegme", label: "Event" }),
                        // search.createColumn({ name: "line.csegclb_busbu", label: "BU/SBU" }),
                        search.createColumn({ name: "custcol_asc_workflow_taskid", label: "Workflow Task Id" }),
                        search.createColumn({ name: "custcol_clb_weekendingdate", label: "Week Ending Date" }),
                        search.createColumn({ name: "customer", label: "customer" }),
                        search.createColumn({ name: "custcol_clb_billrate", label: "Bill Rate" }),
                        search.createColumn({ name: "custcol_asc_payrete", label: "Pay Rate" }),
                        search.createColumn({ name: "custcol_clb_invoice", label: "Invoice " }),
                        search.createColumn({ name: "custcol_clb_vendor_bill_link", label: "Vendor Bill Link" })
                    ]
            });
            const timeBillApprovalStatusCount = timeBillApprovalStatusObj.runPaged().count;
            log.debug("timeBillApprovalStatusObj result count", timeBillApprovalStatusCount);
            timeBillApprovalStatusObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                const tsDate = result.getValue({ name: "date", label: "Date" });
                const itemId = result.getValue({ name: "item", label: "Item" });
                const duration = result.getValue({ name: "durationdecimal", label: "Duration (Decimal)" });
                const wkfTaskId = result.getValue({ name: "custcol_asc_workflow_taskid", label: "Workflow Task Id" });
                const billRate = result.getValue({ name: "custcol_clb_billrate", label: "Bill Rate" });
                const payRate = result.getValue({ name: "custcol_asc_payrete", label: "Pay Rate" });
                const weekEndingDate = result.getValue({ name: "custcol_clb_weekendingdate", label: "Week Ending Date" });
                const approvalstatus = result.getValue({ name: "approvalstatus", label: "Approval Status" });
                const project = result.getValue({ name: "customer", label: "customer" });
                const invoiceId = result.getValue({ name: "custcol_clb_invoice", label: "Invoice " });
                const billId = result.getValue({ name: "custcol_clb_vendor_bill_link", label: "Vendor Bill Link" });

                const isProjectIndex = approvedTimeBillList.findIndex(rec =>
                    rec.project == project
                );

                if (isProjectIndex !== -1) {
                    const obj = approvedTimeBillList[isProjectIndex];
                    if (obj.tsDateList.findIndex(date => date == tsDate) == -1) {
                        obj.tsDateList.push(tsDate);
                    }

                    if (obj.vdrBill.findIndex(date => date == billId) == -1) {
                        obj.vdrBill.push(billId);
                    }

                    if (obj.invoice.findIndex(date => date == invoiceId) == -1) {
                        obj.invoice.push(invoiceId);
                    }

                    if (obj.payRate == 0) {
                        obj.payRate = payRate;
                    }
                    if (obj.billRate == 0) {
                        obj.billRate = billRate;
                    }
                    obj.duration += parseFloat(duration);
                } else {
                    approvedTimeBillList.push({
                        "tsStatus": "approved",
                        "startDate": formateDate(startDate),
                        "endDate": formateDate(endDate),
                        "weekendingDate": weekEndingDate,
                        "project": project,
                        "empId": empId,
                        "duration": parseFloat(duration),
                        "workflowTaskId": wkfTaskId,
                        "billRate": billRate,
                        "payRate": payRate,
                        "tsDateList": [tsDate],
                        "vdrBill": [],
                        "invoice": []
                    });
                }

                return true;
            });

            return approvedTimeBillList;
        } catch (error) {
            log.error("checkApprovedTimeBill: error", error);
        }
    }

    function getProjectDetails(projectId, empId) {
        try {
            const sqlString = `select job.entityid, job.custentity_clb_lastday as WeekEnding, job.custentity_clb_projecttypeforinvoicing as projecttype, job.custentity_clb_bilcycle as projctbillingcycle, job.startdate as projectstartdate, job.custentity_clb_projct_end_dte as projectenddate, resourceAllocation.custevent_clb_prjct_workl_tsk_id as taskid, resourceAllocation.startdate as resourceStart, resourceAllocation.enddate as resourceend from job full join resourceAllocation on (resourceAllocation.project = job.id) where job.id = ${projectId} AND resourceAllocation.allocationresource = ${empId}`;
            let projectDetails = query.runSuiteQL({ query: sqlString }).asMappedResults();

            projectDetails = projectDetails.length > 0 ? projectDetails[0] : [];

            return projectDetails;
        } catch (error) {
            log.error('getProjectDetails: error', error);
            return {};
        }
    }

    function getBillDetails(billId) {
        try {
            const sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billStartDate, vendorBill.custbody_clb_enddate as billEndDate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.id = ${billId}`;
            let billDetails = query.runSuiteQL({ query: sqlString }).asMappedResults();

            billDetails = billDetails.length > 0 ? billDetails[0] : [];

            return billDetails;
        } catch (error) {
            log.error('getBillDetails: error', error);
            return {};
        }
    }

    function getPayRate(empId, projectId) {
        const details = [];
        try {
            const customrecord_clb_subcontaskSearchObj = search.create({
                type: "customrecord_clb_subcontask",
                filters:
                    [
                        ["custrecord_clb_proj", "anyof", projectId],
                        "AND",
                        ["custrecord_clb_subcontaskrecord", "anyof", empId]
                    ],
                columns:
                    [

                        search.createColumn({ name: "custrecord_clb_tastype", label: "Task Type" }),
                        search.createColumn({ name: "custrecord_clb_payrate", label: "Pay Rate" }),
                        search.createColumn({ name: "custrecord_clb_start_date", label: "Effective Date" }),
                        search.createColumn({ name: "custrecord_clb_title", label: "Title" }),
                        search.createColumn({ name: "custrecord_workflow_task_id", label: "Workflow Task Id" })
                    ]
            });
            var searchResultCount = customrecord_clb_subcontaskSearchObj.runPaged().count;
            log.debug("customrecord_clb_subcontaskSearchObj result count", searchResultCount);
            customrecord_clb_subcontaskSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                details.push({
                    taskType: result.getValue({ name: "custrecord_clb_tastype", label: "Task Type" }),
                    rate: result.getValue({ name: "custrecord_clb_payrate", label: "Pay Rate" }),
                    date: result.getValue({ name: "custrecord_clb_start_date", label: "Effective Date" }),
                    wkfTaskId: result.getValue({ name: "custrecord_workflow_task_id", label: "Workflow Task Id" }),
                })
                return true;
            });

            return details;
        } catch (error) {
            log.error('getPayRate: error', error);
            return details;
        }
    }

    function getWeekStartDate(weekEndingDateStr, updateDays) {
        // Parse input date (format: MM/DD/YYYY)
        const endDate = new Date(weekEndingDateStr);

        // Start of the week (Monday) = 6 days before Sunday
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() + updateDays);

        // Format output as MM/DD/YYYY
        const formattedStartDate = (startDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
            startDate.getDate().toString().padStart(2, '0') + '/' +
            startDate.getFullYear();

        return formattedStartDate;
    }

    function getWeekdayDate(startDateStr, endDateStr, weekdayName) {
        const weekdays = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
        };

        try {
            const targetDay = weekdays[weekdayName.toLowerCase()];
            if (targetDay === undefined) throw new Error("Invalid weekday name");

            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);

            // Loop through the date range
            let current = new Date(startDate);
            while (current <= endDate) {
                if (current.getDay() === targetDay) {
                    return current.toDateString(); // Found within range
                }
                current.setDate(current.getDate() + 1);
            }

            // If not found, find the previous occurrence before start date
            const prevDate = new Date(startDate);
            const diff = (prevDate.getDay() - targetDay + 7) % 7 || 7;
            prevDate.setDate(prevDate.getDate() - diff);

            const formattedStartDate = (prevDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                prevDate.getDate().toString().padStart(2, '0') + '/' +
                prevDate.getFullYear();

            return formattedStartDate;
        } catch (error) {
            log.error({ title: "getWeekdayDate Error", details: error });
            return null;
        }
    }

    function getDateBasedBillingCycle(resouceDetails, startDate, endDate, projectId, employeeId) {
        try {
            const billingCycle = resouceDetails.projctbillingcycle;
            let periodStartDate = formateDate(startDate);
            let periodEndDate = formateDate(endDate);

            if (resouceDetails.projecttype == projectType["Fixed Prices Projects"]) {
                periodStartDate = getWeekdayDate(startDate, endDate, "monday");
                periodEndDate = getWeekStartDate(periodStartDate, 6);
            } else {
                if (billingCycle == billingcycleList.Biweekly || billingCycle == billingcycleList["Biweekly cycle 1"] || billingCycle == billingcycleList["Biweekly cycle 2"]) {
                    periodStartDate = getWeekdayDate(startDate, endDate, "sunday");
                    periodEndDate = getWeekStartDate(periodStartDate, 13);
                } else if (billingCycle == billingcycleList["Friday-ending Weekly"]) {
                    periodStartDate = getWeekdayDate(startDate, endDate, "sturday");
                    periodEndDate = getWeekStartDate(periodStartDate, 6);
                } else if (billingCycle == billingcycleList.Monthly) {
                    // First day of month
                    periodStartDate = new Date(date.getFullYear(), date.getMonth(), 1);
                    // Last day of month
                    periodEndDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                } else if (billingCycle == billingcycleList["Sunday-ending Weekly"]) {
                    periodStartDate = getWeekdayDate(startDate, endDate, "monday");
                    periodEndDate = getWeekStartDate(periodStartDate, 6);
                } else if (billingCycle == billingcycleList.Weekly) {
                    periodStartDate = getWeekdayDate(startDate, endDate, "sunday");
                    periodEndDate = getWeekStartDate(periodStartDate, 6);
                } else {
                    periodStartDate = startDate;
                    periodEndDate = endDate;
                }
            }

            periodStartDate = formateDate(periodStartDate);
            periodEndDate = formateDate(periodEndDate);
            startDate = formateDate(startDate);
            endDate = formateDate(endDate);

            let returnData = [];
            if (periodStartDate != startDate && periodEndDate != endDate) {
                returnData = checkApprovedTimeBill(employeeId, periodStartDate, periodEndDate);
            }

            if (returnData.length > 0) {
                if (returnData[0].tsDateList.length == 0)
                    returnData = checkSubmitTimeBill(employeeId, periodStartDate, periodEndDate);
            }

            return returnData
        } catch (error) {
            log.error({ title: "getDateBasedBillingCycle Error", details: error });
            return [];
        }
    }

    function getVendorDetail(empId, projectId, startDate) {
        try {
            const quryStr = `select id, custrecord_clb_originalstartdate as startdate, custrecord_clb_msng_vb_dates as missindatefield from customrecord_clb_subconvendor as vdrDetail where custrecord_clb_subcon_project = '${projectId}' AND custrecord_clb_subconresource = ${empId}`;
            return query.runSuiteQL({ query: quryStr }).asMappedResults();
        } catch (error) {
            log.error({ title: "getVendorDetail Error", details: error });
            return [];
        }

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});