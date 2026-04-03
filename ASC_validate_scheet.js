/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@author Sagar Kumar
 */
define(['N/record', 'N/file', "N/runtime", "N/search", "N/query", "N/https"], (record, file, runtime, search, query, https) => {

    const projectType = {
        "Subtier resource": 2,
        "Group Projects": 4,
        "Fixed Prices Projects": 5
    }

    // Biweekly cycle 2, Friday-ending Weekly, Special Invoicing terms, monthly
    const billingcycleList = {
        "Monthly": 2,
        "Friday-ending Weekly": 26, // bill will generate on friday.
        "Weekly": 3, // bill will generate on saturday  .
        "Biweekly": 42, // bill will generate on 2nd saturday.
        "Sunday-ending Weekly": 160, // bill will generate on sunday.
        "Biweekly cycle 1": 18, // bill will generate on 2nd saturday.
        "Biweekly cycle 2": 19, // bill will generate on 2nd saturday.
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
                // validateDataList.push({ "empId": lineValues[0], "empId": lineValues[1], "startDate": lineValues[2], "endDate": lineValues[3] });
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

            approvedTSresult = checkApprovedTimeBill(rowData.empId, rowData.startDate, rowData.endDate, "");

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
                approvedTSresult = checkSubmitTimeBill(rowData.empId, rowData.startDate, rowData.endDate, "");

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

            context.write({ key: rowData.empId + "_" + rowData.startDate + "_" + rowData.endDate, value: JSON.stringify({ originalData: rowData, result: approvedTSresult }) });
        } catch (error) {
            log.error("Map Stage: Error", error);
        }

    }

    function reduce(context) {
        log.debug("Reduce Stage: key", context.key);

        let errorList = [];
        try {
            context.values.forEach(function (val) {
                log.debug("Reduce Stage: val", val);
                let isNoError = true;

                const data = JSON.parse(val);
                const tsStatus = data.originalData.tsApprovalStatus;

                if (!tsStatus) {
                    // let gciId = data.originalData.empId;
                    // EhrisId = gciId.replace(/\D/g, '');
                    // let wsd = data.originalData.startDate;
                    // let wed = data.originalData.endDate;
                    // let dataObj = { "gciId": EhrisId, "wsd": formatDate(new Date(wsd)), "wed": formatDate(new Date(wed)) };
                    // let res = importTimesheet(dataObj);

                    errorList.push(`*TS is not available - ${data.originalData.empId}`);
                    isNoError = false;
                    return;
                }

                if (data.result.length > 1) {
                    errorList.push(`** Allocated to multiple projects - ${context.key}.`);
                    isNoError = false;
                }

                log.debug("redcue: checked multiple projects");

                const resourceWiseErrorObj = {}
                data.result.forEach(lineData => {
                    let resultlineError = [];
                    try {
                        // log.debug("validateData", lineData);

                        // fetch project and resource allocation details.
                        let resourceDetails = getProjectDetails(lineData.project, data.originalData.empId);
                        log.debug("Reduce: resourceDetails", resourceDetails);
                        // get total dates as per 7 days.

                        // check resource allocation.
                        if (resourceDetails.length == 0 && data.result.length > 1) {
                            return;
                        } else if (resourceDetails.length == 0) {
                            errorList.push(`* No resource allocation available - period ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId}`);
                            isNoError = false;
                            return;
                        } else {
                            // it check resource allocation for given period.
                            let isValidResource = false;
                            resourceDetails.forEach(resAllocation => {
                                if (new Date(resAllocation.resourceend) > new Date(lineData.endDate)) {
                                    isValidResource = true;
                                    resourceDetails = resAllocation;
                                }
                            });

                            if (!isValidResource && resourceDetails.length > 0) {
                                resourceDetails = resourceDetails[0];
                            }
                        }

                        resourceWiseErrorObj.project = resourceDetails.entityid;
                        resourceWiseErrorObj.task = resourceDetails.taskid;


                        let updatedData = getDateBasedBillingCycle(resourceDetails, lineData.startDate, lineData.endDate, lineData.project, data.originalData.empId);
                        // log.debug("Reduce: updatedData", updatedData);

                        if (updatedData.length == 0) {
                            updatedData = lineData;
                            // log.debug("Reduce: updatedData: updatedData = lineData;", updatedData);
                        } else {
                            updatedData = updatedData[0];
                            // log.debug("Reduce: updatedData : updatedData = updatedData[0]", updatedData);
                        }

                        //check vendor bill is available and log if found.
                        let billList = updatedData.vdrBill.filter(id => id !== "") || [];

                        log.debug("redcue: checking Vendor bill");
                        if (billList.length > 0) {
                            //empty the error list if bill available as don't need any other validation.
                            errorList = [];
                            billList.forEach(billId => {
                                log.debug("billId", billId);
                                let billList = getBillDetails(billId, "", "", "", "");
                                billList.forEach(billDetails => {
                                    errorList.push(`${billDetails.tranid} bill available - ${billDetails.billstartdate} : ${billDetails.billenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`)
                                });
                            });
                        } else {
                            // log.debug("no bill id");
                            billList = getBillDetails("", updatedData.startDate, updatedData.endDate, lineData.project, data.originalData.empId);

                            if (billList.length > 0) {
                                errorList = [];
                                billList.forEach(billDetails => {
                                    errorList.push(`${billDetails.tranid} bill available - ${billDetails.billstartdate} : ${billDetails.billenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`)
                                });
                            }
                        }

                        log.debug("redcue: checked Vendor bill");

                        if (billList.length > 0) {
                            context.write({ key: context.key, value: errorList });
                            return;
                        }

                        // check resource allocation.
                        log.debug("redcue: checking resource allocation");
                        if (!resourceDetails) {
                            errorList.push(`* No resource allocation found - period ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                            isNoError = false;
                        } else {
                            if (resourceDetails.projecttype == "") {
                                errorList.push(` ${resourceDetails.entityid} Project type is missing - ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} - ${resourceDetails.taskid}`);
                                log.debug("validateData", `Project type is missing- ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }

                            if (new Date(resourceDetails.resourcestart).getTime() > new Date(updatedData.endDate).getTime()) {
                                errorList.push(` No allocation for this period and started from- ${resourceDetails.resourcestart} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }

                            // log.debug("validateData", `Resource Allocation End Date: ${resourceDetails.resourceend} | TS Start Date: ${updatedData.startDate}`);
                            if (new Date(resourceDetails.resourceend).getTime() < new Date(updatedData.startDate).getTime()) {
                                errorList.push(`No allocation for this period and ended on - ${resourceDetails.resourceend} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }

                            // check resource end date is before resource start date.
                            if (new Date(resourceDetails.resourceend).getTime() < new Date(resourceDetails.resourcestart).getTime()) {
                                errorList.push(`* Resource allocation is wrong - ${resourceDetails.resourcestart} : ${resourceDetails.resourceend} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }

                            if (new Date(resourceDetails.projectenddate).getTime() < new Date(resourceDetails.resourceend).getTime()) {
                                errorList.push(`Project (${resourceDetails.projectenddate}) End before resource end - ${resourceDetails.resourcestart} : ${resourceDetails.resourceend} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }
                        }

                        log.debug("redcue: checked resource allocation");
                        // check other details if no bill found.

                        log.debug("redcue: checking other details", `resourceDetails.resourceDetails ${resourceDetails.toString()}, billList.length ${billList.length}`);
                        if (resourceDetails && billList.length == 0) {

                            //check customer invoice is available and log if found except Fix bid.
                            if (resourceDetails.projecttype != projectType["Fixed Prices Projects"]) {
                                let invList = updatedData.invoice.filter(id => id !== "");

                                if (invList.length == 0) {
                                    let openInvoices = checkOpenInvoices(updatedData.startDate, updatedData.endDate, lineData.project, data.originalData.empId);
                                    if (openInvoices.length > 0) {
                                        openInvoices.forEach(invId => {
                                            errorList.push(`${invId.tranid} (id) Customer Invoice available - period ${invId.custbody_clb_periodstartingdate} : ${invId.custbody_clb_periodendingdate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                            // isNoError = false;
                                        });
                                    } else {
                                        errorList.push(`No Invoice avaiable - period ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                        isNoError = false;
                                    }
                                } else {
                                    invList.forEach(invId => {
                                        // const billDetails = getBillDetails(billId);
                                        let invoice = getInvData(invId);
                                        if (invoice.length > 0) {
                                            invoice = invoice[0];
                                            errorList.push(`${invoice.tranid} (id) Customer Invoice available - period ${invoice.invstartdate} : ${invoice.invenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                            // isNoError = false;
                                        }
                                    });
                                }
                            }

                            log.debug("redcue: checked customer invoice");

                            // check project end before resource allocation end date.
                            if (new Date(resourceDetails.projectenddate).getTime() < new Date(updatedData.startDate).getTime()) {
                                errorList.push(`* Project end before resource allocation end - ${resourceDetails.projectenddate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }

                            log.debug("redcue: checked project end");

                            // check pay rate.
                            const payRateRecord = getPayRate(data.originalData.empId, lineData.project);

                            if (payRateRecord.length == 0) {
                                errorList.push(`* No pay Rate available - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            } else {
                                if (payRateRecord.length > 1) {
                                    payRateRecord.forEach(PayRateData => {
                                        if (PayRateData.taskType == "1" && PayRateData.rate > 0) { //ST
                                            if (new Date(PayRateData.date) <= new Date(updatedData.startDate)) {
                                                // all good nothing to log.
                                                // errorList.push(`${PayRateData.rate} ST pay rate is available - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            } else if (new Date(PayRateData.date) <= new Date(updatedData.endDate) && new Date(PayRateData.date) > new Date(updatedData.startDate)) {
                                                errorList.push(` ${PayRateData.rate} ST Pay rate is available from mid date - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                                isNoError = false;
                                            } else if (new Date(data.date) >= new Date(updatedData.endDate)) {
                                                errorList.push(` ${PayRateData.rate} ST Pay rate is available after - ${data.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                                isNoError = false;
                                            }
                                        } else if (PayRateData.taskType == "2" && PayRateData.rate > 0) { //OT
                                            if (new Date(PayRateData.date) <= new Date(updatedData.startDate)) {
                                                // all good nothing to log.
                                                // errorList.push(`${PayRateData.rate} OT pay rate is available - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            } else if (new Date(PayRateData.date) <= new Date(updatedData.endDate) && new Date(PayRateData.date) > new Date(updatedData.startDate)) {
                                                errorList.push(` ${PayRateData.rate} OT Pay rate is available from mid date - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                                isNoError = false;
                                            } else if (new Date(PayRateData.date) >= new Date(updatedData.endDate)) {
                                                errorList.push(` ${PayRateData.rate} OT Pay rate is available after - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                                isNoError = false;
                                            }
                                        } else {
                                            errorList.push(`* No pay Rate available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                            isNoError = false;
                                        }
                                    });
                                } else {
                                    const PayRateData = payRateRecord[0];
                                    if (PayRateData.taskType == "1" && PayRateData.rate > 0) {
                                        errorList.push(`OT Rate not available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                        isNoError = false;
                                    } else {
                                        errorList.push(`ST Rate not available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                        isNoError = false;
                                    }
                                }
                            }

                            log.debug("redcue: checked pay rate");

                            // check vendor details.
                            const VendorDetails = getVendorDetail(data.originalData.empId, lineData.project, updatedData.startDate);

                            if (VendorDetails.length > 0) {
                                VendorDetails.forEach(detail => {
                                    // vendor details started before timesheet start date.
                                    if (new Date(detail.startdate).getTime() <= new Date(updatedData.startDate).getTime()) {
                                        // errorList.push(`Vendor Detail available and correct - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                        if (detail.missindatefield == "" || detail.missindatefield == null) {
                                            errorList.push(`* Vendor Detail not available - employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                            isNoError = false;
                                        }
                                    } else if (new Date(detail.startdate).getTime() > new Date(updatedData.endDate).getTime()) {
                                        // vendor details started after timesheet end date.
                                        errorList.push(` Vendor Detail available after date - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                    }
                                    // vendor details ended before timesheet start date.
                                    else if (new Date(detail.enddate).getTime() < new Date(updatedData.startDate).getTime()) {
                                        errorList.push(` Vendor Detail available before date - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                    }
                                });
                            } else {
                                errorList.push(`* Vendor Detail not available - employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            }

                            log.debug("redcue: checked vendor details");

                            // check time track.
                            if (updatedData.tsDateList.length == 0) {
                                errorList.push(`* TS is not available- ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                log.debug("validateData", `* TS is not available- ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            } else if (updatedData.tsStatus == 'submit') {
                                errorList.push(` Time sheet available with submit - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                log.debug("validateData", `Time sheet available with submit - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                isNoError = false;
                            } else if (updatedData.tsStatus == 'approved') {
                                if (updatedData.tsDateList.length > 0 && (updatedData.tsDateList.length != 7 || updatedData.tsDateList.length != 30)) {
                                    errorList.push(`Time sheet incomplete with ${updatedData.tsStatus} - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} with total TS days: ${updatedData.tsDateList.length}`);
                                    isNoError = false;
                                }
                                //  else {
                                //     errorList.push(`Time sheet available with approved - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                                // }
                            }
                        }

                        log.debug("redcue: checked time track");

                        if (isNoError) {
                            errorList.push(`* No error found for employee ${data.originalData.empId} for period ${updatedData.startDate} : ${updatedData.endDate} with project ${resourceDetails.entityid} - ${resourceDetails.taskid}`);
                            return;
                        }
                    } catch (error) {
                        log.error({
                            title: "Reduce: Validate Data Error",
                            details: error
                        });

                    }
                });

                if (isNoError) {
                    errorList.push(`* No error found for employee ${data.originalData.empId}`);
                }
            });

            errorList = getUnique(errorList);

            context.write({
                key: context.key,
                value: errorList
            });

        } catch (error) {
            log.error({
                title: "Reduce Stage JSON Error",
                details: error
            });
        }
    }

    function summarize(summary) {
        try {
            const scriptObj = runtime.getCurrentScript();
            const fileId = scriptObj.getParameter({ name: "custscript_csv_fileid" });
            const inputFile = file.load({ id: fileId });
            const folderId = inputFile.folder;
            // log.debug("Summarize Stage: File Folder", folderId);

            const errorMap = {};

            // Read all results from reduce stage
            summary.output.iterator().each(function (key, value) {
                try {
                    // log.debug("summarize key value", { key: key, value: value });
                    let errorList = JSON.parse(value);
                    errorList = [...new Set(errorList)];
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

    function getUnique(arr) {
        var map = {};
        var output = [];
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            if (!map[item]) {
                map[item] = true;
                output.push(item);
            }
        }
        return output;
    }

    function formateDate(date) {
        let sysdate = new Date(date);
        return ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
            + ('0' + sysdate.getDate()).slice(-2) + '/'
            + sysdate.getFullYear();
    }

    function checkSubmitTimeBill(empId, startDate, endDate, projectId) {
        const submittedTimeBillList = [];
        const myfilters = [
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
        ];
        if (projectId) {
            myfilters.push("AND");
            myfilters.push(["customer", "anyof", projectId]);
        }
        try {
            let isApprovedTimeBill = true;
            var timeBillSubmittedStatusObj = search.create({
                type: "timebill",
                filters: myfilters,
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

    function checkApprovedTimeBill(empId, startDate, endDate, projectId) {

        log.debug("checkApprovedTimeBill data:", { empId: empId, startDate: startDate, endDate: endDate });
        const approvedTimeBillList = [];
        const myfilters = [
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
        ];
        if (projectId) {
            myfilters.push("AND");
            myfilters.push(["customer", "anyof", projectId]);
        }
        try {
            var timeBillApprovalStatusObj = search.create({
                type: "timebill",
                filters: myfilters,
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
            // log.debug("timeBillApprovalStatusObj result count", timeBillApprovalStatusCount);
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

            // log.debug("checkApprovedTimeBill: approvedTimeBillList", approvedTimeBillList);
            return approvedTimeBillList;
        } catch (error) {
            log.error("checkApprovedTimeBill: error", error);
        }
    }

    function getProjectDetails(projectId, empId) {
        try {
            const sqlString = `SELECT 
                                job.entityid,
                                job.custentity_clb_lastday AS WeekEnding,
                                job.custentity_clb_projecttypeforinvoicing AS projecttype,
                                job.custentity_clb_bilcycle AS projctbillingcycle,
                                job.startdate AS projectstartdate,
                                job.custentity_clb_projct_end_dte AS projectenddate,
                                resourceAllocation.custevent_clb_prjct_workl_tsk_id AS taskid,
                                resourceAllocation.startdate AS resourceStart,
                                resourceAllocation.enddate AS resourceend
                            FROM 
                                job 
                                FULL JOIN resourceAllocation 
                                    ON resourceAllocation.project = job.id
                            WHERE 
                                job.id = ${projectId}
                                AND resourceAllocation.allocationresource = ${empId}
                                AND resourceAllocation.startdate <> resourceAllocation.enddate
                            ORDER BY 
                                resourceAllocation.enddate DESC;
                            `;
            let projectDetails = query.runSuiteQL({ query: sqlString }).asMappedResults();

            projectDetails = projectDetails.length > 0 ? projectDetails : [];

            return projectDetails;
        } catch (error) {
            log.error('getProjectDetails: error', error);
            return {};
        }
    }

    function getBillDetails(billId, startDate, endDate, projectId, empId) {
        try {
            let sqlString = '';
            if (projectId == "" && billId) {
                sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billStartDate, vendorBill.custbody_clb_enddate as billEndDate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.id = ${billId} AND vendorBill.custbody_asc_transaction_reversed = 'F'`;
            } else {
                // sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billstartdate, vendorBill.custbody_clb_enddate as billenddate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.custbody_clb_startdate >= '${startDate}' AND vendorBill.custbody_asc_inv_project_selected = '${projectId}' AND vendorBill.custbody_asc_subcon_employee = '${empId}'`;
                sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billstartdate, vendorBill.custbody_clb_enddate as billenddate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.custbody_clb_startdate >= '${startDate}' AND vendorBill.custbody_clb_startdate <= '${endDate}' AND vendorBill.custbody_asc_inv_project_selected = '${projectId}' AND vendorBill.custbody_asc_subcon_employee = '${empId}' AND vendorBill.custbody_asc_transaction_reversed = 'F'`;
            }

            // log.debug("getBillDetails: sqlString", sqlString);

            let billDetails = query.runSuiteQL({ query: sqlString }).asMappedResults();

            billDetails = billDetails.length > 0 ? billDetails : [];

            // if (billDetails.length == 0) {
            //     sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billstartdate, vendorBill.custbody_clb_enddate as billenddate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.custbody_clb_enddate <= '${endDate}' AND vendorBill.custbody_asc_inv_project_selected = '${projectId}' AND vendorBill.custbody_asc_subcon_employee = '${empId}'`;
            //     billDetails = query.runSuiteQL({ query: sqlString }).asMappedResults();
            //     billDetails = billDetails.length > 0 ? billDetails : [];
            // }

            return billDetails;
        } catch (error) {
            log.error('getBillDetails: error', error);
            return [];
        }
    }

    function getInvData(invId) {
        let sqlString = `SELECT invoice.tranid ,invoice.custbody_clb_periodstartingdate as invstartdate, invoice.custbody_clb_periodendingdate as invenddate FROM transaction as invoice Where type = 'CustInvc' AND invoice.id = ${invId}`;

        let invoice = query.runSuiteQL({ query: sqlString }).asMappedResults();

        invoice = invoice.length > 0 ? invoice : [];

        return invoice;
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
            // log.debug("resouceDetails", resouceDetails);
            const billingCycle = resouceDetails.projctbillingcycle;
            let billingCycleDetails = [];
            let periodStartDate = formateDate(startDate);
            let periodEndDate = formateDate(endDate);

            if (resouceDetails.projecttype == projectType["Fixed Prices Projects"]) {
                // log.debug("getDateBasedBillingCycle: Fixed Prices Projects");
                periodStartDate = getWeekdayDate(startDate, endDate, "monday");
                periodEndDate = getWeekStartDate(periodStartDate, 6);
            } else {
                log.debug("getDateBasedBillingCycle: else");
                let queryStr = `SELECT custrecord_bln_strt_dte AS billingstartdate, custrecord_blng_end_dte AS billingenddate FROM customrecord_clb_clientspecificbillingcy WHERE custrecord_blng_cyle = ${resouceDetails.projctbillingcycle} AND custrecord_blng_end_dte >= '${startDate}' ORDER BY custrecord_bln_strt_dte ASC`;

                log.debug("getDateBasedBillingCycle: queryStr", queryStr);
                billingCycleDetails = query.runSuiteQL({ query: queryStr }).asMappedResults();

                billingCycleDetails = billingCycleDetails.length > 0 ? billingCycleDetails[0] : [];

                if (billingCycleDetails) {
                    log.debug("getDateBasedBillingCycle: billingCycleDetails", billingCycleDetails);
                    periodStartDate = billingCycleDetails.billingstartdate;
                    periodEndDate = billingCycleDetails.billingenddate;
                } else {
                    log.debug("getDateBasedBillingCycle - billingCycleDetails: else");
                    if (billingCycle == billingcycleList.Biweekly || billingCycle == billingcycleList["Biweekly cycle 1"] || billingCycle == billingcycleList["Biweekly cycle 2"]) {
                        log.debug("getDateBasedBillingCycle - billingCycleDetails: Biweekly");
                        periodStartDate = getWeekdayDate(startDate, endDate, "sunday");
                        periodEndDate = getWeekStartDate(periodStartDate, 13);
                    } else if (billingCycle == billingcycleList["Friday-ending Weekly"]) {
                        log.debug("getDateBasedBillingCycle - billingCycleDetails: Friday-ending Weekly");
                        periodStartDate = getWeekdayDate(startDate, endDate, "sturday");
                        periodEndDate = getWeekStartDate(periodStartDate, 6);
                    } else if (billingCycle == billingcycleList.Monthly) {
                        log.debug("getDateBasedBillingCycle - billingCycleDetails: Monthly");
                        // First day of month
                        startDate = new Date(startDate);
                        periodStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                        // Last day of month
                        endDate = new Date(endDate)
                        periodEndDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

                    } else if (billingCycle == billingcycleList["Sunday-ending Weekly"]) {
                        log.debug("getDateBasedBillingCycle - billingCycleDetails: Sunday-ending Weekly");
                        periodStartDate = getWeekdayDate(startDate, endDate, "monday");
                        periodEndDate = getWeekStartDate(periodStartDate, 6);
                    } else if (billingCycle == billingcycleList.Weekly) {
                        log.debug("getDateBasedBillingCycle - billingCycleDetails: Weekly");
                        periodStartDate = getWeekdayDate(startDate, endDate, "sunday");
                        periodEndDate = getWeekStartDate(periodStartDate, 6);
                    } else {
                        log.debug("getDateBasedBillingCycle - billingCycleDetails: else");
                        periodStartDate = startDate;
                        periodEndDate = endDate;
                    }
                }
            }

            periodStartDate = formateDate(periodStartDate);
            periodEndDate = formateDate(periodEndDate);
            startDate = formateDate(startDate);
            endDate = formateDate(endDate);

            // log.debug("getDateBasedBillingCycle: periodStartDate", { "periodStartDate": periodStartDate, "periodEndDate": periodEndDate, "startDate": startDate, "endDate": endDate });

            let returnData = [];
            if (new Date(periodStartDate).getTime() != new Date(startDate).getTime() && new Date(periodEndDate).getTime() != new Date(endDate).getTime()) {
                // log.debug("getDateBasedBillingCycle: checkApprovedTimeBill");
                returnData = checkApprovedTimeBill(employeeId, periodStartDate, periodEndDate, projectId);
            }

            if (returnData.length > 0) {
                if (returnData[0].tsDateList.length == 0) {
                    log.debug("getDateBasedBillingCycle: checkSubmitTimeBill");
                    returnData = checkSubmitTimeBill(employeeId, periodStartDate, periodEndDate, projectId);
                }
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

    // function addmisingDate(vdrDetailsRecId, startDate, endDate) {
    //     record.submitFields({
    //         type: "",
    //         id: number | string*,
    //         values: Object*,
    //         options: {
    //             enablesourcing: boolean,

    //     })

    // }

    const importTimesheet = (dataObj) => {
        try {
            log.debug({ title: "dataObj", details: dataObj });
            let apiUrl = "https://devnetsuiteapi.ascendion.com/PostConsultantTimesheet_Manual?GCIID=" + dataObj.gciId + "&DateFrom=" + dataObj.wsd + "&DateTo=" + dataObj.wed + "";
            log.debug({ title: "apiUrl", details: apiUrl });
            let headers = {
                "Content-Type": "application/json",
                "UserId": "NetsuiteResponse",
                "Password": "Password@123",
                "Cache-Control": "no-cache",
                "Accept-Encoding": " gzip, deflate, br",
                "Connection": "keep-alive"
            };
            let responseObj = "";
            responseObj = https.post({ url: apiUrl, body: "", headers: headers });

            return responseObj;
        }
        catch (ex) {
            log.error({ title: "Import Timesheet", details: ex });
        }
    };

    const checkOpenInvoices = (startDate, endDate, projectId, empId) => {
        log.debug({ title: "checkOpenInvoices", details: { startDate: startDate, endDate: endDate, projectId: projectId, empId: empId } });
        try {
            const quryStr = `SELECT id, tranid, custbody_clb_periodstartingdate, custbody_clb_periodendingdate FROM transaction WHERE type = 'CustInvc' AND job = ${projectId} AND custbody_clb_periodendingdate >='${startDate}' AND custbody_clb_periodendingdate <= '${endDate}' AND custbody_asc_transaction_reversed = 'F' AND custbody_clb_periodstartingdate IS NOT NULL AND custbody_clb_periodendingdate IS NOT NULL`;
            log.debug({ title: "quryStr", details: quryStr });
            return query.runSuiteQL({ query: quryStr }).asMappedResults();
        } catch (error) {
            log.error({ title: "checkOpenInvoices Error", details: error });
            return [];
        }
    }


    const formatDate = (date) => { return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() };

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});