/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {
    function getInputData() {
        try {
            log.audit({ title: 'getInputData', details: 'Fetching projects with status Closed or Abandoned' });
            const projectResult = search.create({
                type: "job",
                filters:
                    [
                        ["status", "anyof", "1", "17"],
                        // "AND",
                        // ["internalid", "anyof", "79681"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "entityid", label: "ID" }),
                        search.createColumn({ name: "altname", label: "Name" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });

            log.debug({
                title: 'Total projects to process',
                details: projectResult.runPaged().count
            });

            return projectResult;

        } catch (error) {
            log.error({ title: 'Error in getInputData', details: error });
        }
    }

    function reduce(context) {
        try {
            var projectId = context.key;

            log.audit({ title: 'reduce', details: 'Processing project ID: ' + projectId });

            var accrualSearch = search.create({
                type: 'customrecord_msng_tmsht_for_accrual',
                filters: [["custrecord_msng_ts_project", "anyof", projectId]],
                columns: ['internalid']
            });

            log.debug({
                title: 'Total Accrual records to process',
                details: accrualSearch.runPaged().count
            });

            accrualSearch.run().each(function (accrual) {
                var accrualId = accrual.getValue('internalid');
                try {
                    record.delete({ type: 'customrecord_msng_tmsht_for_accrual', id: accrualId });
                    log.audit({ title: 'Deleted Accrual Record', details: 'Accrual ID: ' + accrualId });
                } catch (deleteError) {
                    log.error({ title: 'Error deleting accrual', details: deleteError });
                }
                return true;
            });
        } catch (error) {
            log.error({ title: 'Error in reduce function', details: error });
        }
    }

    function summarize(summary) {
        log.audit({ title: 'Summary', details: 'Map/Reduce Execution Summary' });
        summary.inputSummary.error && log.error({ title: 'Input Error', details: summary.inputSummary.error });
        summary.mapSummary.errors.iterator().each(function (key, error) {
            log.error({ title: 'reduce Error - ' + key, details: error });
            return true;
        });
        log.audit({ title: 'Script Completed', details: 'Processed Successfully' });
    }

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});
