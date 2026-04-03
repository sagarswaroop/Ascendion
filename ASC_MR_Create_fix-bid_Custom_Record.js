/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/query', 'N/format', "./Projects/Library/Project Library.js", "N/file"],
    function (search, record, runtime, query, format, lib, file) {

        function getInputData() {
            const weekDayDate = "04/01/2025"; // to calculate the week dates for the month.
            const monthEndDate = "04/30/2025"; // to get the resources which are active till this date.
            try {
                const SqlQuery = `SELECT 
                                        emp.employeetype, 
                                        job.id AS projectId, 
                                        job.custentity_clb_projecttypeforinvoicing, 
                                        resAlloc.startdate, 
                                        resAlloc.allocationresource AS empid, 
                                        resAlloc.custevent_clb_subsidiary as empsubsidiary, 
                                        resAlloc.endDate 
                                    FROM 
                                        job AS job 
                                        INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project 
                                        INNER JOIN employee emp ON emp.id = resAlloc.allocationresource 
                                    WHERE  
                                        job.custentity_clb_projecttypeforinvoicing IN (5) 
                                        AND resAlloc.endDate >= '${monthEndDate}'
                                        AND job.id NOT IN (101604)
                                        AND CASE WHEN (emp.subsidiary='4' AND emp.employeetype='5') OR (emp.subsidiary<>'4' AND emp.employeetype IS NOT NULL) THEN 1 ELSE 0 END = 1`;

                const pagedResults = query.runSuiteQLPaged({
                    query: SqlQuery,
                    pageSize: 1000 // You can change page size up to 1000
                });

                var projectDetails = [];
                pagedResults.pageRanges.forEach(function (pageRange) {
                    var page = pagedResults.fetch(pageRange.index);
                    projectDetails = projectDetails.concat(page.data.asMappedResults());
                });

                if (projectDetails.length > 0) {
                    var projObj = {};

                    for (var ii = 0; ii < projectDetails.length; ii++) {

                        // log.debug("length",ii);
                        var projectId = projectDetails[ii].id;
                        const weekDates = getSundaysOfCurrentMonth(weekDayDate);

                        var dataArray = [];
                        weekDates.forEach(object => {
                            values = {};
                            values["projectid"] = projectDetails[ii].projectid;
                            values["startdate"] = projectDetails[ii].startdate;
                            values["enddate"] = projectDetails[ii].enddate;
                            values["empId"] = projectDetails[ii].empid;
                            values["empType"] = projectDetails[ii].employeetype;
                            values["empSubsidiary"] = projectDetails[ii].empsubsidiary;
                            values["custrecord_bln_strt_dte"] = object.monday;
                            values["custrecord_blng_end_dte"] = object.sunday;

                            dataArray.push(values);
                        });

                        var key = projectId + "_" + ii;
                        projObj[key] = dataArray;
                        log.debug("project Details :", projObj)
                    }
                    return projObj;
                } else {
                    log.audit("No projects found with Missing Vendor Bill Dates")
                }
            } catch (error) {
                log.error("Errot at Stage : Get Input Data: ", error);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(error));
            }

        }

        function reduce(context) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var deploymentID = scriptObj.deploymentId;
                var resourceDetailsArray = JSON.parse(context.values[0])
                log.debug("resourceDetailsArray", resourceDetailsArray);
                for (var resourceindex = 0; resourceindex < resourceDetailsArray.length; resourceindex++) {
                    var resourceDetails = resourceDetailsArray[resourceindex];
                    var nsToDt, nsfrmDt;
                    var projectID = resourceDetails.projectid;
                    var employeeId = resourceDetails.empId;
                    var projectLookUp = search.lookupFields({
                        type: "job",
                        id: projectID,
                        columns: ['subsidiary']
                    });
                    log.debug("projectLookUp", projectLookUp);
                    var projSubsidiary = projectLookUp.subsidiary[0].value;
                    if (projSubsidiary == 4) {
                        nsToDt = resourceDetails.custrecord_blng_end_dte;
                        nsfrmDt = resourceDetails.custrecord_bln_strt_dte;

                        log.debug("nsfrmDt:nsToDt", nsfrmDt + ":" + nsToDt);

                        var vendstrtDate = resourceDetails.startdate;
                        var vendEndDate = resourceDetails.enddate;

                        //return;
                        // if(new Date(nsfrmDt) > new Date(vendEndDate)) then break the loop
                        if (new Date(vendstrtDate) > new Date(nsfrmDt)) {
                            nsfrmDt = vendstrtDate;
                        }
                        if (new Date(vendEndDate) < new Date(nsToDt)) {
                            nsToDt = vendEndDate;
                        }
                        if (new Date(nsToDt) >= new Date(nsfrmDt)) {
                            log.debug("nsfrmDt:nsToDt", nsfrmDt + ":" + nsToDt);
                            createScheduleRecord(projectID, nsfrmDt, nsToDt, employeeId);
                        }
                    }
                }


            } catch (e) {
                log.error("error is", e);
                log.debug("Errot at Stage : Reduce", JSON.stringify(e))
            }
        }

        function summarize(summary) {

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
        function getSundaysOfCurrentMonth(dateString) {
            const today = new Date(dateString);
            const year = today.getFullYear();
            const month = today.getMonth(); // 0-indexed

            const weekDays = [];

            const date = new Date(year, month, 1);

            debugger;
            while (date.getMonth() === month) {
                if (date.getDay() === 0) {
                    const lastDate = new Date(date);
                    lastDate.setDate(date.getDate() - 6);
                    weekDays.push({ "monday": formatDate(new Date(lastDate)), "sunday": formatDate(new Date(date)) });
                }
                date.setDate(date.getDate() + 1);
            }

            return weekDays;
        }

        function formatDate(str) {
            var date = new Date(str),
                mnth = ("0" + (date.getMonth() + 1)).slice(-2),
                day = ("0" + date.getDate()).slice(-2);
            return [mnth, day, date.getFullYear()].join("/");
        }

        return {
            getInputData: getInputData,
            // map: map,
            reduce: reduce,
            summarize: summarize
        }
    });