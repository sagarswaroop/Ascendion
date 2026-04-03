/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search'], function (record, search) {

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
               ["status","anyof","CustInvc:D"], 
               "AND", 
               ["intercotransaction","noneof","@NONE@"]
            ],
            columns:
            [
               search.createColumn({name: "tranid", label: "Document Number"}),
               search.createColumn({name: "internalid", label: "Internal ID"})
            ]
         });
         var searchResultCount = invoiceSearchObj.runPaged().count;
         log.debug("invoiceSearchObj result count",searchResultCount);
        return invoiceSearchObj;
    }

    function map(context) {
        log.debug({
            title: "context",
            details: context
        });

        let data = JSON.parse(context.value);

        log.debug(data.id);

        try {
            let currRecord = record.load({
                type: record.Type.INVOICE,
                id: data.id,
                isDynamic: true
            });

            const status = currRecord.getValue({
                fieldId: 'approvalstatus'
            });

            log.debug(`status ${status}`);

            currRecord.setValue({
                fieldId: 'approvalstatus',
                value: 2
            });
            let udpatedRecord = currRecord.save();

            log.debug("udpatedRecord", udpatedRecord);

            // let udpatedRecord = record.submitFields({
            //     type: record.Type.INVOICE,
            //     id: id,
            //     values: { approvalstatus: 2 }
            // });
            // log.debug("udpatedRecord", udpatedRecord);
        } catch (error) {
            log.debug("error is:", error);
        }
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    }
});
