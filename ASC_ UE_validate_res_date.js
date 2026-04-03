/**
* @NApiVersion 2.1
* @NScriptType UserEventScript
*/
define(['N/record', 'N/search', 'N/log', 'N/format'], function (record, search, log, format) {



    function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;

            var type = context.type;
            log.debug(`Record Mode is ${type}`);
            if (type === context.UserEventType.CREATE) {
                log.debug("Date validation and update process: START");
                // Get the start and end date from the newly created record
                let newStartDate = newRecord.getValue('startdate');
                let newEndDate = newRecord.getValue('enddate')
                let project = newRecord.getValue('project');
                let workflowId = newRecord.getValue('custevent_clb_prjct_workl_tsk_id');
                // let customer = newRecord.getValue('customer');
                let empId = newRecord.getValue('allocationresource');

                // Convert dates to proper format for comparison
                var newStartDateFormatted = format.parse({ value: newStartDate, type: format.Type.DATE });
                var newEndDateFormatted = format.parse({ value: newEndDate, type: format.Type.DATE });

                var resourceallocationSearchObj = search.create({
                    type: "resourceallocation",
                    filters:
                        [
                            ["custevent_clb_prjct_workl_tsk_id", "is", workflowId],
                            "AND",
                            ["project", "anyof", project],
                            "AND",
                            ["resource", "anyof", empId]
                        ],
                    columns:
                        [
                            search.createColumn({ sort: search.Sort.DESC, name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "startdate", label: "Start Date" }),
                            search.createColumn({ name: "enddate", label: "End Date" })
                        ]
                });
                var searchResultCount = resourceallocationSearchObj.runPaged().count;
                log.debug("resourceallocationSearchObj result count", searchResultCount);

                var resultSet = resourceallocationSearchObj.run();
                var results = resultSet.getRange({ start: 0, end: 2 }); // Get the most recent record

                if (results.length > 1) {
                    var recentRecord = results[1];
                    var recentRecordId = recentRecord.getValue('internalid');
                    var recentStartDate = recentRecord.getValue('startdate');
                    var recentEndDate = recentRecord.getValue('enddate');

                    log.debug(`recent start date ${recentStartDate} and end date is ${recentEndDate} with record id ${recentRecordId}`);

                    var recentStartDateFormatted = format.parse({ value: recentStartDate, type: format.Type.DATE });
                    var recentEndDateFormatted = format.parse({ value: recentEndDate, type: format.Type.DATE });
                    // Compare the start date with the recently created record's end date
                    if (newStartDateFormatted < recentEndDateFormatted && newStartDateFormatted >= recentStartDateFormatted) {
                        // If criteria met, update the end date of the recent record to one day before the new record's start date

                        log.debug("difference found in dates: update process start");
                        newStartDateFormatted = new Date(newStartDateFormatted);
                        newStartDateFormatted.setDate(newStartDateFormatted.getDate() - 1);
                        // var updatedEndDate = newStartDateFormatted.addDays(-1);
                        newStartDateFormatted = format.parse({ value: newStartDateFormatted, type: format.Type.DATE });

                        log.debug("newStartDateFormatted", newStartDateFormatted);
                        record.submitFields({
                            type: 'resourceallocation',
                            id: recentRecordId,
                            values: { 'enddate': newStartDateFormatted }
                        });

                        log.debug('Record Updated', 'The end date of the recent record has been updated to: ' + newStartDateFormatted);
                    } else {
                        log.debug({
                            title: 'No Update Needed',
                            details: 'The new start date does not meet the criteria to adjust the recent record end date.'
                        });
                    }
                } else {
                    log.debug({
                        title: 'No Recent Records Found',
                        details: 'No recently created records found to compare with the newly created record.'
                    });
                }
            }

        } catch (error) {
            log.error('ERROR During Date VAlIDATION & UPDATE', error);
        }
        log.debug("Date validation and update process: END");
    }
    return {
        afterSubmit: afterSubmit
    };
});
