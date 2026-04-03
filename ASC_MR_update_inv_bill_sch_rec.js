/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search","N/record","N/query"], function(search,record,query) {

    function getInputData() {
        var invoiceSearchObj = search.create({
            type: "invoice",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
               ["type","anyof","CustInvc"], 
               "AND", 
               ["mainline","is","T"], 
               "AND", 
               ["custbody_asc_transaction_reversed","is","T"], 
               "AND", 
               ["memo","is","Reversed the Invoice due to Timesheet Correction"], 
               "AND", 
               ["status","anyof","CustInvc:B"],
            //    "AND", 
            //     ["internalid","anyof","68916"]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({name: "applyingtransaction", label: "Applying Transaction"})
            ]
         });
         var searchResultCount = invoiceSearchObj.runPaged().count;
         log.debug("invoiceSearchObj result count",searchResultCount);

         return invoiceSearchObj;
    }
    function map(context) {
        try {
            log.debug("context",context);
            const result = JSON.parse(context.value).values;
            log.debug("map:context.value: ",result);
            log.debug("map", "Credit Memo ID: " + result.internalid.value + " Invoice ID: " + result.applyingtransaction.value);
            attachReversaltoInvBillScheduleRec( result.applyingtransaction.value, result.internalid.value);
        } catch (error) {
            log.error("error is", error);
        }
    }

    function summarize(summary) {
        
    }

    function attachReversaltoInvBillScheduleRec(cmID, invId) {
        try {
            log.debug("attachReversaltoInvBillScheduleRec", "Attach Credit Memo to the Invoice Bill Schedule")

            const sqlString = `select custrec.id from customrecord_asc_invbill_schedule as custrec inner join transaction on transaction.id = custrec.custrecord_asc_schrec_invoice AND transaction.id = ${invId}`;
            const sqlResults = query.runSuiteQL({ query: sqlString }).asMappedResults();
            log.debug("sqlResults", sqlResults);

            let invBillSchRecId = sqlResults[0].id;
            log.debug("invBillSchRecId", invBillSchRecId);

            if (!invBillSchRecId) {
                log.error(`No Invoice Bill Schedule Record found for the Invoice ID ${invId}`);
            } else {

                record.submitFields({
                    type: "customrecord_asc_invbill_schedule",
                    id: invBillSchRecId,
                    values: { "custrecord_asc_schrec_creditmemo": cmID, "custrecord_asc_schrec_reversed": true },
                });

                log.debug("Credit Memo attached to the Invoice Bill Schedule Record ID: " + invBillSchRecId, "Credit Memo ID: " + cmID);
            }

            log.debug("attachReversaltoInvBillScheduleRec", "Credit Memo attached to the Invoice Bill Schedule Record ID: " + invBillSchRecId)
        } catch (e) {
            log.error("Error in attachReversaltoInvBillScheduleRec", JSON.stringify(e));
        }
    }
    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    }
});
