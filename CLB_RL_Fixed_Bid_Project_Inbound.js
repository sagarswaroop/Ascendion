/**
     * @NApiVersion 2.1
     * @NScriptType Restlet
     * @NModuleScope SameAccount
     */

define(['N/file', 'N/record', 'N/search', 'N/runtime', 'N/task','./Projects/Library/Project Library.js'], function (file, record, search, runtime, task,lib) {


    /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {Object} requestBody - The HTTPS request body; request body parsed into an Object. Content-Type is 'application/json' (The body must be a valid JSON)
         * @returns {Object} HTTPS response body
         * @since 2022.2
         */

    function post(requestBody) {
        try {
            let fixBidJSON = requestBody;

            log.debug('Project JSON Request Body', fixBidJSON);
            var recID = lib.createIntegrationRec(fixBidJSON, "Project Fix-bid")
            log.debug('Integration Record ID: ', recID);
            if (recID) {
                let response = processFile(recID);
                return response;
            }
        } catch (error) {
            log.audit("post function error: ", JSON.stringify(error));
            return {
                status: "FAILED",
                message: "Project creation has failed. Please try again.",
            };
        }



    }
    let processFile = (recID) => {
        try {
            log.audit("Process File Function", "Start");
            let taskObj = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_asc_mr_create_fixbid",
                params: {
                    "custscript_fixbid_data": recID
                }
            });
            // Submit the map/reduce task
            let taskId = taskObj.submit();
            let taskStatus = task.checkStatus(taskId);
            log.debug("taskStatus", taskStatus)
            log.debug({ title: "Map Reduce Script Task Id", details: taskId });
            return {
                status: "SUCCESS",
                message: "Project creation is in progress.",
                referenceId: recID
            };
            //return taskId;
        }
        catch (ex) {
            log.debug({
                title: "Error in calling the batch job: ",
                details: JSON.stringify(ex)
            });
            return {
                status: "FAILED",
                message: "Project creation has failed due to: " + ex.message + " Please try again.",
            };
        }
    };
    return {
        post: post
    };
});