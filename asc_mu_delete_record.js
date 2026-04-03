/**
 *@NApiVersion 2.1
 *@NScriptType MassUpdateScript
 */
define(['N/record'], function(record) {

    function each(params) {
        const deletedRecord = record.delete({
            type: params.type,
            id: params.id
        });

        log.debug({
            title: 'deletedRecord',
            details: deletedRecord
        })
    }

    return {
        each: each
    }
});
