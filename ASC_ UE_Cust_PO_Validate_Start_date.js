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
                var newStartDate = newRecord.getValue('custrecord_asc_cpd_start_date');
                var newEndDate = newRecord.getValue('custrecord_asc_cpd_end_date')
                var project = newRecord.getValue('custrecord_asc_cpd_lnk_to_prj');
                var workflowId = newRecord.getValue('custrecord_asc_cpd_workflowtaskid');
                // var vendor = newRecord.getValue('custrecord_clb_vendor');
                // var empId = newRecord.getValue('custrecord_clb_subconresource');


                // Convert dates to proper format for comparison
                var newStartDateFormatted = format.parse({ value: newStartDate, type: format.Type.DATE });
                var newEndDateFormatted = format.parse({ value: newEndDate, type: format.Type.DATE });


                var customrecord_ascendion_cust_po_detailsSearchObj = search.create({
                    type: "customrecord_ascendion_cust_po_details",
                    filters:
                    [
                       ["custrecord_asc_cpd_lnk_to_prj","anyof",project], 
                       "AND", 
                       ["custrecord_asc_cpd_workflowtaskid","is",workflowId]
                    ],
                    columns:
                    [
                       search.createColumn({sort: search.Sort.DESC, name: "internalid", label: "Internal ID"}),
                       search.createColumn({name: "custrecord_asc_cpd_end_date", label: "End Date"}),
                        search.createColumn({name: "custrecord_asc_cpd_start_date", label: "Start Date"})
                    ]
                 });

                var resultSet = customrecord_ascendion_cust_po_detailsSearchObj.run();
                var results = resultSet.getRange({ start: 0, end: 2 }); // Get the most recent record

                if (results.length > 0) {
                    var recentRecord = results[1];
                    var recentRecordId = recentRecord.getValue('internalid');
                    var recentStartDate = recentRecord.getValue('custrecord_asc_cpd_start_date');
                    var recentEndDate = recentRecord.getValue('custrecord_asc_cpd_end_date');

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
                            type: 'customrecord_ascendion_cust_po_details',
                            id: recentRecordId,
                            values: { 'custrecord_asc_cpd_end_date': newStartDateFormatted }
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
