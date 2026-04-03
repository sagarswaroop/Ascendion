/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@author Sagar Kumar
 *@description timesheet data handling
 */
define([], function() {

    function _get(context) {
        
    }

    function _post(context) {
        if(type = record.Type.PURCHASE_ORDER){
            var customRecordSearch = search.create({
                type: "purchaseorder",
                filters: [["type", "anyof", "PurchOrd"], "AND", ["employee", "anyof", employeeId], "AND", ["mainline", "is", "T"]],
                columns: [search.createColumn({ name: "internalid" }), search.createColumn({ name: "tranid" }), search.createColumn({ name: "trandate" }), search.createColumn({ name: "entity" }), search.createColumn({ name: "duedate" }), search.createColumn({ name: "creditfxamount" }), search.createColumn({ name: "statusref" })]
            });
        }
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
