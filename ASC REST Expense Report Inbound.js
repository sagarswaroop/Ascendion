/**
     * @NApiVersion 2.1
     * @NScriptType Restlet
     * @NModuleScope SameAccount
     */

define(["N/task", "SuiteScripts/Projects/Library/Project Library.js"], function (task, lib) {

    const post = (requestBody) =>{
        try
        {
            let expReportJson = requestBody;
            log.debug("expReportJson", expReportJson);
            let recordId = lib.createIntegrationRec(expReportJson, "Expense Report");
            log.debug("recordId", recordId);
            let status = "", message = "", referenceId = "";
            if(recordId)
            {
                let taskId = processData(recordId);
                if(taskId)
                {
                    status = "Success";
                    message = "Expense Report Creations is in Progress.";
                    referenceId = recordId;
                }               
                else
                {
                    status = "Failed";
                    message = "Expense Report data is failed to process.";            
                }  
            }                
            else
            {
                status = "Failed";
                message = "Expense Report data is failed to process.";             
            }            
            return {
                status: status,
                message: message,
                referenceId: referenceId
            };
        }
        catch(ex)
        {
            log.debug({title: "Create Expense Report - POST", details: ex});
        }
    }; 
    const processData = (recordId) =>{
        try 
        {
            let taskObj = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_asc_mr_expreport_inbound",
                params: {
                    "custscript_er_integration_rec_id": recordId
                }
            });
            // Submit the map/reduce task
            let taskId = taskObj.submit();
            log.debug({title: "Map Reduce Script Task Id", details: taskId});
            return taskId;
        } 
        catch(ex) 
        {
            log.debug({title: "Execeute Map Reduce Script", details: ex});
        }
    };
    return {
        post: post
    };
});