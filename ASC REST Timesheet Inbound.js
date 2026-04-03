/**
     * @NApiVersion 2.1
     * @NScriptType Restlet
     * @NModuleScope SameAccount
     */

define(["N/task", "SuiteScripts/Projects/Library/Project Library.js"], function (task, lib) {

    const post = (requestBody) =>{
        try
        {
            let timesheetJson = requestBody;
            log.debug("timesheetJson", timesheetJson);
            let recordId = lib.createIntegrationRec(timesheetJson, "Timesheet");
            log.debug("recordId", recordId);
            let status = "", message = "", referenceId = "";
            if(recordId)
            {
                let taskId = processData(recordId);
                if(taskId)
                {
                    status = "Success";
                    message = "Timesheets Creation is in Progress.";
                    referenceId = recordId;
                }               
                else
                {
                    status = "Failed";
                    message = "Timesheets data is failed to process.";            
                }  
            }                
            else
            {
                status = "Failed";
                message = "Timesheets data is failed to process.";           
            }            
            return {
                status: status,
                message: message,
                referenceId: referenceId
            };
        }
        catch(ex)
        {
            log.debug({title: "Create Timesheet - POST", details: ex});
        }
    }; 
    const processData = (recordId) =>{
        try 
        {
            let taskObj = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_asc_mr_timsheet_inbound",
                params: {
                    "custscript_ts_integration_rec_id": recordId
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