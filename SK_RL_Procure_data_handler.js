/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define([], function() {

    function _get(context) {
        log.debug({
            title: 'context',
            details: context
        });

        return "success";
    }

    function _post(context) {
        log.debug({
            title: 'context',
            details: context
        });

        return "success";
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        // put: _put,
        // delete: _delete
    }
});
