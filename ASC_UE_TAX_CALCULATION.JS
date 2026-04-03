/**
     * @author Anirban Gupta (Huron)
     * @NApiVersion 2.1
     * @NScriptType UserEventScript
     * @NModuleScope SameAccount
     * @NAmdConfig /SuiteScripts/Library/requireConfig.json
     */
/**
     * Module Description
     * Script to add / change / remove Sales Tax Lines based on Tax Group or Tax Code entered through UI.
     *
     *  Version   Date           Author              Comments
     *  1.0       21 Dec 2022    Anirban Gupta       Script Created.
     *
 */

define(['N/runtime', "N/task"], function (runtime, task) {

    /**
     * Function definition to be triggered before record is submitted.
     *
     * @param {Object} context - Context
     * @Since 2015.2
     */
    function beforeSubmit(context) {
        log.audit('UE Type', context.type);
        log.audit('Execution Context', runtime.executionContext);

        if (isSupportedUserEventType(context) && isSupportedContext()) {
            //schedule script code will here.
            try {
                const scheduleTaskId = runTaxSchedule(context);
                log.debug({title: "scheduleTaskId",details: scheduleTaskId});
            } catch (error) {
                log.error("Run Tax Calculation Error", error);
            }
        }
    }

    let runTaxSchedule = (context)=>{
        const data = JSON.stringify( {type: context.newRecord.type, id: context.newRecord.id});

            var scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT
            });
            scriptTask.scriptId = "customscript_asc_tax_cal_schedule";
            scriptTask.params = {
                "custscript_tax_sch_record_details": data
            };
            var scriptTaskId = scriptTask.submit();
            
            return scriptTaskId;

    }

    let isSupportedUserEventType = (context) => {
        let UserEventType = context.UserEventType;
        return [UserEventType.CREATE, UserEventType.EDIT, UserEventType.XEDIT].indexOf(context.type) > -1;
    };

    // Does not support Webstore and RESTlet
    let isSupportedContext = () => {
        let ContextType = runtime.ContextType;

        return [
            ContextType.CLIENT,
            ContextType.CSV_IMPORT,
            ContextType.USEREVENT,
            ContextType.USER_INTERFACE,
            ContextType.WORKFLOW].indexOf(runtime.executionContext) > -1;
    };
    return {
        beforeSubmit: beforeSubmit
    };
});