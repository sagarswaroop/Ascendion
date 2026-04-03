/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@description : CRUD Operation of Invoice Bill Schedule (custom) Record.
 */
define(["N/query", "N/record"], function (query, record) {
    function afterSubmit(context) {
        const newRecord = context.newRecord;
        const oldRecord = context.oldRecord;
        const contextType = context.type;
        const today = new Date();
        const projectypes = {
            fixBid: 5,
            tmw2: 1,
            tmSub: 2,
            tmpassthr: 3,
            group: 4
        };
        const lastDateOfCurrentMonth = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

        let resStartDate = formatDate(newRecord.getValue({ fieldId: "startdate" }));
        let resEndDate = formatDate(newRecord.getValue({ fieldId: "enddate" }));
        // let resOldEndDate = oldRecord.getValue({ fieldId: "enddate" });
        let projectId = newRecord.getValue({ fieldId: "project" });
        let resID = newRecord.getValue({ fieldId: "allocationresource" });

        //get project type from project.
        let queryString = 'select custentity_clb_projecttypeforinvoicing, custentity_clb_bilcycle from job where job.id =' + projectId;
        var results = query.runSuiteQL({ query: queryString });
        var resultDataList = results.asMappedResults();
        let projectType = resultDataList[0].custentity_clb_projecttypeforinvoicing;
        let billCycle = resultDataList[0].custentity_clb_bilcycle;

        log.debug("billCycle", billCycle);
        log.debug("projectType", projectType);



        if (contextType == context.UserEventType.CREATE) {
            if (projectType == projectypes.group || projectType == projectypes.tmSub || projectType == projectypes.tmpassthr || projectType == projectypes.tmw2) {
                const cycleList = getBillingCycleList(billCycle, resStartDate, lastDateOfCurrentMonth);
                cycleList.forEach(object => {
                    let cycleStartDate = object.custrecord_bln_strt_dte;
                    let cycleEndDate = object.custrecord_blng_end_dte;
                    if (new Date(resStartDate) > new Date(cycleStartDate)) {
                        cycleStartDate = resStartDate;
                    }
                    if (new Date(resEndDate) < new Date(cycleEndDate)) {
                        cycleEndDate = resEndDate
                    }
                    log.debug("Final cycleStartDate : cycleEndDate", cycleStartDate + " : " + cycleEndDate)

                    createScheduleRecord(projectId, cycleStartDate, cycleEndDate, resID)
                });
            }
        }
    }

    function getMondaysAndSundays(startDateStr) {
        const startDate = new Date(startDateStr);
        const now = new Date();

        // Set to the last day of the current month
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const result = [];

        const current = new Date(startDate);

        while (current <= endDate) {
            const day = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            if (day === 0 || day === 1) {
                result.push({
                    date: formatDate(current)
                });
            }

            current.setDate(current.getDate() + 1);
        }

        return result;
    }
    function formatDate(str) {
        var date = new Date(str),
            mnth = ("0" + (date.getMonth() + 1)).slice(-2),
            day = ("0" + date.getDate()).slice(-2);
        return [mnth, day, date.getFullYear()].join("/");
    }

    function createScheduleRecord(projectId, startDate, EndDate, employeeID) {
        log.debug("in Created record function");
        var recObj = record.create({ type: 'customrecord_asc_invbill_schedule', isDynamic: true });
        recObj.setValue("custrecord_asc_schrec_project", projectId);
        recObj.setValue("custrecord_asc_schrec_startdate", new Date(startDate));
        recObj.setValue("custrecord_asc_schrec_enddate", new Date(EndDate));
        recObj.setValue("custrecord_asc_schrec_employee", employeeID);

        var recId = recObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
        log.debug("recId", recId);


    }

    const getBillingCycleList = (billCycle, resStartDate, lastDateOfCurrentMonth) => {
        let sqlString = `select custrecord_bln_strt_dte, custrecord_blng_end_dte from customrecord_clb_clientspecificbillingcy as billingCycle where billingCycle.custrecord_blng_cyle = '${billCycle}' AND billingCycle.custrecord_blng_end_dte >= '${resStartDate}' AND billingCycle.custrecord_blng_end_dte <= '${lastDateOfCurrentMonth}' ORDER BY billingCycle.custrecord_bln_strt_dte`;
        let results = query.runSuiteQL({ query: sqlString })
        let resultsArr = results.asMappedResults();

        log.debug("resultsArr", resultsArr);
        return resultsArr;
    }

    return {
        afterSubmit: afterSubmit
    }
});
