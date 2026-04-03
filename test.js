require(['N'], function (N) {
    for (var n in N) { window[n] = N[n]; };
    try {

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
                    sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billStartDate, vendorBill.custbody_clb_enddate as billEndDate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.id = ${billId}`;
                } else {
                    sqlString = `SELECT vendorBill.tranid ,vendorBill.custbody_clb_startdate as billstartdate, vendorBill.custbody_clb_enddate as billenddate FROM transaction as vendorBill Where type = 'VendBill' AND vendorBill.custbody_clb_startdate >= '${startDate}' AND vendorBill.custbody_clb_enddate <= '${endDate}' AND vendorBill.custbody_asc_inv_project_selected = '${projectId}' AND vendorBill.custbody_asc_subcon_employee = '${empId}'`;
                }

                let billDetails = query.runSuiteQL({ query: sqlString }).asMappedResults();

                billDetails = billDetails.length > 0 ? billDetails : [];

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

        // const data = [
        //     {
        //         key: "116459_09/22/25_09/28/25",
        //         data: {
        //             originalData: {
        //                 empId: "116459",
        //                 startDate: "09/22/25",
        //                 endDate: "09/28/25",
        //                 tsApprovalStatus: "approved"
        //             },
        //             result: [
        //                 {
        //                     tsStatus: "approved",
        //                     startDate: "09/22/2025",
        //                     endDate: "09/28/2025",
        //                     weekendingDate: "09/28/2025",
        //                     project: "118622",
        //                     empId: "116459",
        //                     duration: 40,
        //                     workflowTaskId: "354599",
        //                     billRate: ".01",
        //                     payRate: "2.99",
        //                     tsDateList: [
        //                         "09/22/2025",
        //                         "09/23/2025",
        //                         "09/24/2025",
        //                         "09/25/2025",
        //                         "09/26/2025",
        //                         "09/27/2025",
        //                         "09/28/2025"
        //                     ],
        //                     vdrBill: [
        //                         ""
        //                     ],
        //                     invoice: [
        //                         ""
        //                     ]
        //                 }
        //             ]
        //         }
        //     },
        //     {
        //         key: "116476_09/22/25_09/28/25",
        //         data: {
        //             originalData: {
        //                 empId: "116476",
        //                 startDate: "09/22/25",
        //                 endDate: "09/28/25",
        //                 tsApprovalStatus: "approved"
        //             },
        //             result: [
        //                 {
        //                     tsStatus: "approved",
        //                     startDate: "09/22/2025",
        //                     endDate: "09/28/2025",
        //                     weekendingDate: "09/28/2025",
        //                     project: "118621",
        //                     empId: "116476",
        //                     duration: 40,
        //                     workflowTaskId: "354607",
        //                     billRate: ".01",
        //                     payRate: "2.99",
        //                     tsDateList: [
        //                         "09/22/2025",
        //                         "09/23/2025",
        //                         "09/24/2025",
        //                         "09/25/2025",
        //                         "09/26/2025",
        //                         "09/27/2025",
        //                         "09/28/2025"
        //                     ],
        //                     vdrBill: [
        //                         ""
        //                     ],
        //                     invoice: [
        //                         ""
        //                     ]
        //                 }
        //             ]
        //         }
        //     }
        // ]

        const data = [
            {
                key: "115988_08/01/25_08/25/25",
                data: {
                    originalData: {
                        empId: "115988",
                        startDate: "08/01/25",
                        endDate: "08/25/25",
                        tsApprovalStatus: "approved"
                    },
                    result: [
                        {
                            tsStatus: "approved",
                            startDate: "08/01/2025",
                            endDate: "08/25/2025",
                            weekendingDate: "08/03/2025",
                            project: "119956",
                            empId: "115988",
                            duration: 129,
                            workflowTaskId: "344029",
                            billRate: "29",
                            payRate: "20.6",
                            tsDateList: [
                                "08/01/2025",
                                "08/02/2025",
                                "08/03/2025",
                                "08/04/2025",
                                "08/05/2025",
                                "08/06/2025",
                                "08/07/2025",
                                "08/08/2025",
                                "08/09/2025",
                                "08/10/2025",
                                "08/11/2025",
                                "08/12/2025",
                                "08/13/2025",
                                "08/14/2025",
                                "08/15/2025",
                                "08/16/2025",
                                "08/17/2025",
                                "08/18/2025",
                                "08/19/2025",
                                "08/20/2025",
                                "08/21/2025",
                                "08/22/2025",
                                "08/23/2025",
                                "08/24/2025",
                                "08/25/2025"
                            ],
                            vdrBill: [
                                ""
                            ],
                            invoice: [
                                "",
                                "167431"
                            ]
                        },
                        {
                            tsStatus: "approved",
                            startDate: "08/01/2025",
                            endDate: "08/25/2025",
                            weekendingDate: "08/31/2025",
                            project: "113444",
                            empId: "115988",
                            duration: 0,
                            workflowTaskId: "369281",
                            billRate: "",
                            payRate: "",
                            tsDateList: [
                                "08/25/2025"
                            ],
                            vdrBill: [
                                ""
                            ],
                            invoice: [
                                ""
                            ]
                        }
                    ]
                }
            }
        ]

        function reduce(context) {
            log.debug("Reduce Stage: context", context);
            let errorList = [];
            try {
                debugger;
                const uniqueKey = context.key;
                const data = JSON.parse(context.values);
                log.debug("Reduce stage: fetch data", { key: uniqueKey, data: data });
                const tsStatus = data.originalData.tsApprovalStatus;
                log.debug("Reduce stage: tsStatus", tsStatus);
                if (!tsStatus) {
                    errorList.push(`*TS is not available - ${uniqueKey}.`);
                    log.debug("Reduce stage: lineData", "TS is not available.");
                } else {
                    if (data.result.length > 1) {
                        errorList.push(`** Allocated to multiple projects - ${uniqueKey}.`);
                        log.debug("Reduce stage: validateData", "Allocated to multiple projects - ${uniqueKey}.");
                    }
                    data.result.forEach(lineData => {
                        // log.debug("validateData", lineData);

                        // fetch project and resource allocation details.
                        let resourceDetails = getProjectDetails(lineData.project, data.originalData.empId);
                        // log.debug("Reduce: resourceDetails", resourceDetails);
                        // get total dates as per 7 days.

                        // check resource allocation.
                        if (resourceDetails.length == 0) {
                            errorList.push(`* No resource allocation available - period ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId}`);
                        } else {
                            let isValidResource = false;
                            resourceDetails.forEach(resAllocation => {
                                if (new Date(resAllocation.resourceend) > new Date(lineData.endDate)) {
                                    isValidResource = true;
                                    resourceDetails = resAllocation;
                                }
                            });

                            if (!isValidResource) {
                                resourceDetails = resourceDetails[0];
                            }
                        }

                        let updatedData = getDateBasedBillingCycle(resourceDetails, lineData.startDate, lineData.endDate, lineData.project, data.originalData.empId);
                        log.debug("Reduce: updatedData", updatedData);

                        if (updatedData.length == 0) {
                            updatedData = lineData;
                        } else {
                            updatedData = updatedData[0];
                        }

                        //check vendor bill is available and log if found.
                        let billList = updatedData.vdrBill.filter(id => id !== "");

                        if (billList.length > 1) {
                            billList.forEach(billId => {
                                let billDetails = getBillDetails(billId, "", "", "", "");
                                errorList.push(`${billDetails.tranid} bill available - ${billDetails.billstartdate} : ${billDetails.billenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            });
                        } else {
                            billList = getBillDetails("", updatedData.startDate, updatedData.endDate, lineData.project, data.originalData.empId)

                            billList.forEach(billDetails => {
                                errorList.push(`${billDetails.tranid} bill available - ${billDetails.billstartdate} : ${billDetails.billenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`)
                            });
                        }

                        if (billList.length > 0) {
                            context.write({ key: uniqueKey, value: errorList });
                            return;
                        }

                        // check other details if no bill found.
                        if (billList.length == 0) {

                            //check customer invoice is available and log if found.
                            let invList = updatedData.invoice.filter(id => id !== "");
                            invList.forEach(invId => {
                                // const billDetails = getBillDetails(billId);
                                let invoice = getInvData(invId);
                                if (invoice.length > 0) {
                                    invoice = invoice[0];
                                    errorList.push(`${invoice.tranid} (id) Customer Invoice available - period ${invoice.invstartdate} : ${invoice.invenddate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                }

                            });

                            // check resource allocation.
                            if (resourceDetails.length == 0) {
                                errorList.push(`* No resource allocation found - period ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            } else {
                                if (resourceDetails.projecttype == "") {
                                    errorList.push(` ${resourceDetails.entityid} Project type is missing - ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} - ${resourceDetails.taskid} (task id)`);
                                    log.debug("validateData", `Project type is missing- ${lineData.startDate} : ${lineData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                }

                                if (new Date(resourceDetails.resourcestart) > new Date(updatedData.endDate)) {
                                    errorList.push(` Resource allocation start after time sheet period - ${resourceDetails.resourcestart} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                }

                                // log.debug("validateData", `Resource Allocation End Date: ${resourceDetails.resourceend} | TS Start Date: ${updatedData.startDate}`);
                                if (new Date(resourceDetails.resourceend) < new Date(updatedData.startDate)) {
                                    errorList.push(`* Resource allocation end before time sheet period - ${resourceDetails.resourceend} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                }
                            }

                            // check project end before resource allocation end date.
                            if (new Date(resourceDetails.projectenddate) < new Date(updatedData.startDate)) {
                                errorList.push(`* Project end before resource allocation end - ${resourceDetails.projectenddate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            }


                            // check pay rate.
                            const payRateRecord = getPayRate(data.originalData.empId, lineData.project);

                            if (payRateRecord.length == 0) {
                                errorList.push(`* No pay Rate available - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            } else {
                                if (payRateRecord.length > 1) {
                                    payRateRecord.forEach(PayRateData => {
                                        if (PayRateData.taskType == "1" && PayRateData.rate > 0) { //ST
                                            if (new Date(PayRateData.date) <= new Date(updatedData.startDate)) {
                                                errorList.push(`${PayRateData.rate} ST pay rate is available - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            } else if (new Date(PayRateData.date) <= new Date(updatedData.endDate) && new Date(PayRateData.date) > new Date(updatedData.startDate)) {
                                                errorList.push(` ${PayRateData.rate} ST Pay rate is available from - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            } else if (new Date(PayRateData.date) >= new Date(updatedData.endDate)) {
                                                errorList.push(` ${PayRateData.rate} ST Pay rate is available after - ${updatedData.endDate} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            }
                                        } else if (PayRateData.taskType == "2" && PayRateData.rate > 0) { //OT
                                            if (new Date(PayRateData.date) <= new Date(updatedData.startDate)) {
                                                errorList.push(`${PayRateData.rate} OT pay rate is available - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            } else if (new Date(PayRateData.date) <= new Date(updatedData.endDate) && new Date(PayRateData.date) > new Date(updatedData.startDate)) {
                                                errorList.push(` ${PayRateData.rate} OT Pay rate is available from - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            } else if (new Date(PayRateData.date) >= new Date(updatedData.endDate)) {
                                                errorList.push(` ${PayRateData.rate} OT Pay rate is available after - ${PayRateData.date} effective date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${PayRateData.wkfTaskId}`);
                                            }
                                        } else {
                                            errorList.push(`* No pay Rate available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                        }
                                    });
                                } else {
                                    const PayRateData = payRateRecord[0];
                                    if (PayRateData.taskType == "1" && PayRateData.rate > 0) {
                                        errorList.push(` OT Rate not available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                    } else {
                                        errorList.push(`* ST Rate not available : ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                    }
                                }
                            }

                            // check vendor details.
                            const VendorDetails = getVendorDetail(data.originalData.empId, lineData.project, updatedData.startDate);

                            if (VendorDetails.length > 0) {
                                VendorDetails.forEach(detail => {
                                    // vendor details started before timesheet start date.
                                    if (detail.startdate <= updatedData.startDate) {
                                        errorList.push(`Vendor Detail available and correct - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                    }
                                    // vendor details started after timesheet end date.
                                    else if (detail.startdate > updatedData.endDate) {
                                        errorList.push(` Vendor Detail available after date - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                    }
                                    // vendor details ended before timesheet start date.
                                    else if (detail.enddate < updatedData.startDate) {
                                        errorList.push(` Vendor Detail available before date - ${detail.startdate} date for employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                    }
                                });
                            } else {
                                errorList.push(`* Vendor Detail not available - employee ${data.originalData.empId} with Project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            }

                            // check time track.
                            if (updatedData.tsDateList.length == 0) {
                                errorList.push(`* TS is not available- ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                log.debug("validateData", `* TS is not available- ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            } else if (updatedData.tsStatus == 'submit') {
                                errorList.push(` Time sheet available with submit - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                log.debug("validateData", `Time sheet available with submit - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                            } else if (updatedData.tsStatus == 'approved') {
                                if (updatedData.tsDateList.length > 0 && updatedData.tsDateList.length != 7) {
                                    errorList.push(` Time sheet incomplete with ${updatedData.tsStatus} - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id) TS Dates: ${updatedData.tsDateList.join(", ")}`);
                                } else {
                                    errorList.push(`Time sheet available with approved - ${updatedData.startDate} : ${updatedData.endDate} for employee ${data.originalData.empId} with project ${resourceDetails.entityid} - ${resourceDetails.taskid} (task id)`);
                                }
                            }
                        }
                    });
                }

                errorList = getUnique(errorList);

                log.debug("Reduce stage: errorList", errorList);

                context.write({ key: uniqueKey, value: errorList });
            } catch (error) {
                log.error("Reduce Stage: Error", error);
            }
        }

        reduce({ key: data[0].key, values: [JSON.stringify(data[0].data)] });

    } catch (e) { console.error(e.message); }
})