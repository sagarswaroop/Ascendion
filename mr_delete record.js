/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/record','N/search'], function(record,search) {

    function getInputData() {
        var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
            type: "customrecord_asc_trnsctn_crtn_rprt_arap",
            filters:
            [
                // ["internalidnumber","equalto","1628740"]
            ],
            columns:
            [
               search.createColumn({name: "id", label: "ID"}),
               search.createColumn({name: "custrecord_asc_period_strt_date", label: "Period Start Date"}),
               search.createColumn({name: "custrecord_asc_period_end_date", label: "Period End Date"}),
               search.createColumn({name: "custrecord_asc_error_description", label: "Error Description"}),
               search.createColumn({name: "custrecord_asc_transaction_type", label: "Transaction Type"}),
               search.createColumn({name: "custrecord_asc_project_id", label: "Project ID"}),
               search.createColumn({name: "custrecord_asc_employee", label: "Employee"}),
               search.createColumn({
                  name: "custentity_clb_projct_end_dte",
                  join: "CUSTRECORD_ASC_PROJECT_ID",
                  label: "Project End Date"
               })
            ]
         });
         var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
         log.debug("customrecord_asc_trnsctn_crtn_rprt_arapSearchObj result count",searchResultCount);
         return customrecord_asc_trnsctn_crtn_rprt_arapSearchObj;
    }

    function map(context) {
        // log.debug(context);
        var recordToDelete = JSON.parse(context.value);
        log.debug("map Stage:","recordToDelete: " + JSON.stringify(recordToDelete));
        
        let deltedId = record.delete({
            type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
            id: recordToDelete.id,
        });

        log.debug("delete id", deltedId);
    }

    function summarize(context){
        log.debug("summarize...");
    
    }
    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        // summarize: summarize
    }
});
