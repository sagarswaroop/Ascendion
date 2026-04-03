/**
* @NApiVersion 2.1
* @NScriptType UserEventScript
*/
define(['N/record', 'N/search', 'N/log', 'N/format'], function (record, search, log, format) {



    function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;

            // Get the start and end date from the newly created record
            var type = context.type;
            log.debug(`Record Mode is ${type}`);
            if (type === context.UserEventType.CREATE) {
                var newStartDate = newRecord.getValue('custrecord_clb_originalstartdate');
                var newEndDate = newRecord.getValue('custrecord_clb_originalenddate')
                var project = newRecord.getValue('custrecord_clb_subcon_project');
                var workflowId = newRecord.getValue('custrecord_clb_workflowid');
                var vendor = newRecord.getValue('custrecord_clb_vendor');
                var empId = newRecord.getValue('custrecord_clb_subconresource');


                // Convert dates to proper format for comparison
                var newStartDateFormatted = format.parse({ value: newStartDate, type: format.Type.DATE });
                var newEndDateFormatted = format.parse({ value: newEndDate, type: format.Type.DATE });


                // Search for the most recently created custom record
                var customrecord_clb_subconvendorSearchObj = search.create({
                    type: "customrecord_clb_subconvendor",
                    filters:
                        [
                            ["custrecord_clb_vendor", "anyof", vendor],
                            "AND",
                            ["custrecord_clb_subcon_project", "anyof", project],
                            "AND",
                            ["custrecord_clb_workflowid", "is", workflowId],
                            "AND",
                            ["custrecord_clb_subconresource", "anyof", empId]
                        ],
                    columns:
                        [
                            search.createColumn({ sort: search.Sort.DESC, name: "created", label: "Date Created" }),
                            search.createColumn({ name: "custrecord_clb_originalstartdate", label: "Original Start Date" }),
                            search.createColumn({ name: "custrecord_clb_originalenddate", label: "Original End Date" }),
                            search.createColumn({ name: "internalid", label: "Original End Date" })
                        ]
                });
                //  var searchResultCount = customrecord_clb_subconvendorSearchObj.runPaged().count;
                //  log.debug("customrecord_clb_subconvendorSearchObj result count",searchResultCount);
                //  customrecord_clb_subconvendorSearchObj.run().each(function(result){
                //     // .run().each has a limit of 4,000 results
                //     return true;
                //  });


                var resultSet = customrecord_clb_subconvendorSearchObj.run();
                var results = resultSet.getRange({ start: 0, end: 2 }); // Get the most recent record

                if (results.length > 0) {
                    var recentRecord = results[1];
                    var recentRecordId = recentRecord.getValue('internalid');
                    var recentStartDate = recentRecord.getValue('custrecord_clb_originalstartdate');
                    var recentEndDate = recentRecord.getValue('custrecord_clb_originalenddate');

                    log.debug(`recent start date ${recentStartDate} and end date is ${recentEndDate} with record id ${recentRecordId}`);

                    var recentStartDateFormatted = format.parse({ value: recentStartDate, type: format.Type.DATE });
                    var recentEndDateFormatted = format.parse({ value: recentEndDate, type: format.Type.DATE });


                    debugger;
                    // Compare the start date with the recently created record's end date
                    if (newStartDateFormatted < recentEndDateFormatted && newStartDateFormatted >= recentStartDateFormatted) {
                        // If criteria met, update the end date of the recent record to one day before the new record's start date

                        log.debug("difference found in dates: update process start");
                        newStartDateFormatted = new Date(newStartDateFormatted);
                        newStartDateFormatted.setDate(newStartDateFormatted.getDate() - 1);
                        // var updatedEndDate = newStartDateFormatted.addDays(-1);
                        newStartDateFormatted = format.parse({ value: newStartDateFormatted, type: format.Type.DATE });

                        log.debug("newStartDateFormatted", newStartDateFormatted);
                        let updatedRecordId = record.submitFields({
                            type: 'customrecord_clb_subconvendor',
                            id: recentRecordId,
                            values: { 'custrecord_clb_originalenddate': newStartDateFormatted }
                        });

                        log.debug(updatedRecordId + ' Record Updated', 'The end date of the recent record has been updated to: ' + newStartDateFormatted);
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
            log.error('ERROR During Date VAlIDATION & UPDATE', error.message);
        }
    }



    return {
        afterSubmit: afterSubmit
    };



});
