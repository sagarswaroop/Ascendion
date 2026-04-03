/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/runtime", "N/file", "SuiteScripts/Projects/Library/Project Library.js"], (search, record, runtime, file, lib) => {
    const scriptConstraint = {
        folderId: {},        
		mandatoryFields: ["requestMode", "customer", "casetaskevent", "employee", "workflowTaskId", "trandate", "custcol_clb_timesheettype", "hours", "custcol_clb_weekendingdate", "isbillable", "custcol_clb_submitted"],
		timesheetTypes: ["straight time", "over time", "double time", "fix-bid", "sick time", "Time_Off"]
    };
    let reversedTsId = "";
    const getInputData = (inputContext) => {
        try 
        {
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_ts_integration_rec_id"});
            let timesheetJson = record.load({type: "customrecord_intgrtn_mstr_rcrd_dtls", id: recordId, isDynamic: true}).getValue({fieldId: "custrecord_int_rqst_pyld"});
            //log.debug({ title: "timesheetJson", details: timesheetJson});
            return JSON.parse(timesheetJson);
        }   
        catch(ex) 
        {
            log.error({title: "Get Input Data", details: ex});
        }
    };
    const reduce = (reduceContext) => {            
        try 
        {              
            let timesheetObj =  reduceContext.values[0];
            timesheetObj = JSON.parse(timesheetObj);
            //log.debug({ title: "reduce timesheetObj", details: timesheetObj});
            let validationObj = validateData(timesheetObj.timesheetDetails);
            let gciId = timesheetObj.gci_id;
            let tsStatus = timesheetObj.status;
            let returnObj = [];
            //log.debug({ title: "validationObj", details: validationObj});
            if(validationObj.length === 0)
            {
                let requestMode = timesheetObj.requestMode;
                //log.debug({ title: "requestMode", details: requestMode});
                if(requestMode === "create")
                {
                    let createdTSId = createTimesheet(timesheetObj, tsStatus);
                    returnObj.push(createdTSId);

                }
                if(requestMode === "update")
                {
                    let updatedTSId = updateTimesheet(timesheetObj, tsStatus);
                    returnObj.push(updatedTSId);
                }
            }
            else
            {
                returnObj = validationObj;
            }
            reduceContext.write({key: gciId, value: returnObj});
        }
        catch(ex) 
        {
            log.error({title: "Reduce", details: ex});
        }
    };
    const summarize = (context) => {
        try 
        {                
            let reponseArray = [];
            context.output.iterator().each(function (key, value) {
                let reponseObj = JSON.parse(value);
                reponseObj["entityId"] = key;
                reponseArray.push(reponseObj[0]);
                return true;
            }); 
            log.debug({title: "reponseArray", details: reponseArray});
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_ts_integration_rec_id"});
            let recordIds = createErrorRec(reponseArray, recordId, "4");//Timesheet
            log.debug({ title: "Failed Record Id's", details: recordIds });
            let updatedRecId = record.submitFields({
                type: "customrecord_intgrtn_mstr_rcrd_dtls",
                id: recordId,
                values: {
                    "custrecord_int_rspns_pyld": JSON.stringify(reponseArray)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug({title: "updatedRecId", details: updatedRecId});     
        }
        catch(ex) 
        {
            log.error({title: "Summarize", details: ex});
        }
    };
    let createTimesheet = (timesheetObj, status) =>{
        let responseObj = [];  
        try 
        {
            log.debug({title: "timesheetObj - Create", details: timesheetObj}); 
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_ts_integration_rec_id"});
            let timesheetDataArr = JSON.parse(JSON.stringify(timesheetObj.timesheetDetails));  
            log.debug({title: "timesheetDataArr - Create", details: timesheetDataArr});             
            for(let sp=0 ; sp<timesheetDataArr.length ; sp++)
            { 
                let errorObjArr = [];   
                var timesheetData = timesheetDataArr[sp];
                let employee = timesheetData.employee;
                                
                let customer = timesheetData.customer;       
                let workflowTaskId = timesheetData.workflowTaskId;             
                let task = timesheetData.casetaskevent;                
                let timesheetType = timesheetData.custcol_clb_timesheettype;  
                var uniqueId = (timesheetData.uniqueId).toString();   
                //log.debug({title: "uniqueId", details: uniqueId});
                if(timesheetData.requestMode === "create")
                {
                    let exTSId = isTimesheetExist(uniqueId, timesheetData.custcol_clb_weekendingdate, timesheetData.trandate);
                    log.debug({title: "isTimesheetExist : uniqueId", details: exTSId+" : "+uniqueId}); 
                    if(exTSId)
                    {
                        errorObjArr.push({name: "INVALID ARGUMENT", message: "Timesheet with Unique Id ["+uniqueId+"] and Timesheet Date ["+timesheetData.trandate+"] and Weekending date ["+timesheetData.custcol_clb_weekendingdate+"] is already exists. Please verify the payload and try again."});                                        
                        responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": uniqueId, "tranDate": timesheetData.trandate});                        
                        continue;
                    }
                    else
                    {
                        let timesheetRec = record.create({type: record.Type.TIME_BILL, isDynamic: true});
                        let projectData = getProjectData(customer, employee, workflowTaskId);
                        log.debug({title: "projectData", details: projectData});                 
                        if(Object.keys(projectData).length > 0)
                        {                
                            let employeeId = projectData.employeeId;//lib.getEntityId("employee", employee);                
                            let customerId = projectData.projectId;//searchProject(customer);               
                            let taskTypeId = lib.getTaskType(task);
                            let tsTypeId = lib.getSelectValueId(timesheetRec, "bodyLevelField", "custcol_clb_timesheettype", timesheetType, "");
                            let statusIdObj = lib.getTimesheetStatus(status);
                            let statusId = lib.getSelectValueId(timesheetRec, "bodyLevelField", "approvalstatus", statusIdObj.approvalStatus.text, "");
                            let tsStatusId = lib.getSelectValueId(timesheetRec, "bodyLevelField", "custcol_asc_timesheet_status", statusIdObj.tsStatus.text, "");
                            let taskId = "";
                            if(customerId)
                            {
                                log.debug({title: "tsTypeId", details: tsTypeId});
                                taskId = getTask(customerId, tsTypeId, task);
                                log.debug({title: "taskId", details: taskId});
                                if(!taskId)
                                {
                                    taskId = createNewTask(task, customerId, timesheetType, timesheetData.isbillable, workflowTaskId);
                                }
                            }                
                            //log.debug({title: "taskTypeId", details: taskTypeId});
                            let itemId = lib.getServiceItem(taskTypeId);
                            //log.debug({title: "itemId", details: itemId});
                            timesheetRec.setValue({fieldId: "employee", value: employeeId});
                            timesheetRec.setValue({fieldId: "trandate", value: new Date(timesheetData.trandate)});
                            timesheetRec.setValue({fieldId: "hours", value: Number(timesheetData.hours)});
                            timesheetRec.setValue({fieldId: "customer", value: customerId});
                            timesheetRec.setValue({fieldId: "casetaskevent", value: taskId});
                            timesheetRec.setValue({fieldId: "item", value: itemId});
                            timesheetRec.setValue({fieldId: "isbillable", value: timesheetData.isbillable == "T" ? true : false});
                            timesheetRec.setValue({fieldId: "custcol_clb_billable_for_ascendion", value: timesheetData.custcol_clb_billable_for_ascendion == "T" ? true : false});
                            timesheetRec.setValue({fieldId: "approvalstatus", value: statusId});
                            timesheetRec.setValue({fieldId: "custcol_asc_timesheet_status", value: tsStatusId});
                            timesheetRec.setValue({fieldId: "custcol_clb_uniqueid", value: uniqueId});
                            timesheetRec.setValue({fieldId: "custcol_clb_timesheettype", value: tsTypeId});                    
                            timesheetRec.setValue({fieldId: "custcol_clb_weekendingdate", value: new Date(timesheetData.custcol_clb_weekendingdate)});
                            timesheetRec.setValue({fieldId: "custcol_clb_pushedviaintegration", value: true});   
                            timesheetRec.setValue({fieldId: "custcol_integration_record_ref", value: recordId});   
                            timesheetRec.setValue({fieldId: "custcol_asc_workflow_taskid", value: workflowTaskId});                                
                            
                            if(reversedTsId)
                            {
                                timesheetRec.setValue({fieldId: "custcol_reversed_timesheet", value: reversedTsId == null ? "" : reversedTsId}); 
                            }
                            let timesheetId = "";
                            //log.error({title: "errorObjArr In TS Creation", details: errorObjArr});
                            if(errorObjArr.length == 0)
                            {
                                timesheetId = timesheetRec.save({enableSourcing: true, ignoreMandatoryFields: true});
                                //log.debug({title: "Created Timehseet", details: timesheetId});          
                                if(timesheetId)
                                {
                                    responseObj.push({"status": "SUCCESS", "nsInternalId": timesheetId, "errorDetails": [], "entityId": uniqueId, "tranDate": timesheetData.trandate});
                                }
                                else
                                {                
                                    responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": uniqueId, "tranDate": timesheetData.trandate});
                                }
                            }  
                            else
                            {                
                                responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": uniqueId, "tranDate": timesheetData.trandate});
                                continue;
                            }
                        }
                        else
                        {
                            if(Object.keys(projectData).length <= 0)
                            {
                                errorObjArr.push({name: "INVALID ARGUMENT", message: "Employee ["+employee+"] OR Project/Customer ["+customer+"] OR Resource Allocation is missing in the NetSuite. Please verify the payload and try again."});
                                responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": uniqueId, "tranDate": timesheetData.trandate});
                                continue;
                            }
                        }
                    }
                }                
            }
            return responseObj;
        } 
        catch(ex) 
        {
            log.error({title: "Create timesheet", details: ex});
            responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": [{name: "UNEXPECTED ERROR", message: ex.message}], "entityId": uniqueId, "tranDate": timesheetData.trandate});
            return responseObj;  
        }           
    };
    const updateTimesheet = (timesheetJson, status) =>{
        let tsObj = timesheetJson.timesheetDetails;
        let groupedTSData = groupBy(tsObj, "casetaskevent");
        //log.debug({title: "groupedTSData", details: groupedTSData});                 
        let responseObj = [], errorObjArr = [];
        let uniqueId = "", tranDate = "";
        try
        {            
            for(let a in groupedTSData)
            {
                let timesheetData = groupedTSData[a];
                log.debug({title: "timesheetData : "+a, details: timesheetData}); 
                //let employeeId =  lib.getEntityId("employee", timesheetData[0].employee);    
                //log.debug({title: "employeeId", details: employeeId});         
                tranDate = timesheetData[0].trandate;
                //let customerId = searchProject(timesheetData[0].customer);           
                uniqueId = timesheetData[0].uniqueId;
                let weekEndDate = timesheetData[0].custcol_clb_weekendingdate;
                let weeklyTSData = getWeeklyTimesheet(timesheetData[0].customer, timesheetData[0].employee, uniqueId, weekEndDate);
                log.debug({title: "weeklyTSData", details: weeklyTSData});             
                if(weeklyTSData.length > 0)
                {   
                    let isModified = validateTSHoursChange(weeklyTSData, timesheetData);
                    log.debug({title: "uniqueId - weekEndDate - isModified" , details: uniqueId+ " - " + weekEndDate +" - "+isModified}); 
                    //return;
                    if(isModified)
                    {
                        let reversedTSIds = reverseTimesheet(weeklyTSData);
                    // log.debug({title: "reversedTSIds", details: reversedTSIds}); 
                        if(reversedTSIds.length > 0)
                        {
                            timesheetJson = upateRequestMode(timesheetJson);
                            responseObj = createTimesheet(timesheetJson, status);
                            log.debug({title: "responseObj", details: responseObj});
                            return responseObj;
                        }
                    }
                    else
                    {      
                        for(let p in weeklyTSData)
                        {
                            let timesheetId = weeklyTSData[p].internalId;
                            let timesheetRecDummy = record.load({type: record.Type.TIME_BILL, id: timesheetId, isDynamic: true});        
                            let statusIdObj = lib.getTimesheetStatus(status); 
                            let statusId = lib.getSelectValueId(timesheetRecDummy, "bodyLevelField", "approvalstatus", statusIdObj.approvalStatus.text, "");
                            let tsStatusId = lib.getSelectValueId(timesheetRecDummy, "bodyLevelField", "custcol_asc_timesheet_status", statusIdObj.tsStatus.text, ""); 
                            let tsDate = timesheetRecDummy.getText({fieldId: "trandate"});                   
                            let updatedTSId = record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: timesheetId,
                                values: {                            
                                    "approvalstatus": statusId,
                                    "custcol_asc_timesheet_status": tsStatusId
                                }
                            });
                        // log.debug({title: "Updated Timehseet", details: updatedTSId});
                            if(updatedTSId)
                            {
                                responseObj.push({"status": "SUCCESS", "nsInternalId": updatedTSId, "errorDetails": [], "entityId": uniqueId, "tranDate": tsDate});
                            }
                            else
                            {    
                                errorObjArr.push({name: "FAILED", message: "Failed to Update the Timesheet."});            
                                responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": uniqueId, "tranDate": tsDate});
                            }
                        }
                    }
                }
                else
                {
                    for(let j=0 ; j <timesheetData.length ; j++)
                    {
                        errorObjArr.push({name: "MISSING DATA", message: "Timesheet is not available for the tran date ["+timesheetData[j].trandate+"] and weekending ["+timesheetData[j].custcol_clb_weekendingdate+"] and unique id ["+timesheetData[j].uniqueId+"]."});   
                        responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": timesheetData[j].uniqueId, "tranDate": timesheetData[j].custcol_clb_weekendingdate});
                    }  
                }
            }
            return responseObj;
        }
        catch(ex)
        {
            log.error({title: "Update timesheet", details: ex});
            responseObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": [{name: "UNEXPECTED ERROR", message: ex.message}], "entityId": uniqueId, "tranDate": tranDate});
        }
    };
    const getTask = (projectId, taskType, taskName) => {
        try 
        {                        
            //log.debug({title: "Task Filters", details: employeeId+" : "+projectId +" : "+tsEntryDate +" : "+taskType});        
            let taskId = "";   
            let searchObj = search.create({
                type: record.Type.PROJECT_TASK,
                filters:[
                    ["status", "anyof", "PROGRESS", "NOTSTART"], "AND",
                    ["project", "anyof", projectId], "AND",
                    ["custevent_clb_tasktype", "anyof", taskType], "AND",
                    ["title", "is", taskName]
                ],
                columns:[
                    search.createColumn({name: "internalid", label: "Internal ID" }),
                    search.createColumn({name: "enddate", sort: search.Sort.DESC}),
                    search.createColumn({name: "createddate", label: "Date Created" }),
                    search.createColumn({name: "formuladatetime", formula: "{createddate}", sort: search.Sort.DESC})
                ]
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1 });
            if(searchResult.length > 0) 
            {
                taskId = searchResult[0].id;
            }
            return taskId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Existing Tasks", details: ex});
            return {
                status: "Failed",
                message: "Failed to Get Existing Task.\n "+ex.message
            };
        }
    };
    const createNewTask = (task, customerId, timesheetType, workflowTaskId) =>{
        try
        {
            let projectObj = getProjectDates(customerId);
            let taskRecord = record.create({type: record.Type.PROJECT_TASK, isDynamic: true});            
            taskRecord.setValue({fieldId: "title", value: task});           
            taskRecord.setValue({fieldId: "company", value: customerId});            
            taskRecord.setValue({fieldId: "startdate", value: new Date(projectObj.startdate)});
            taskRecord.setValue({fieldId: "custevent_clb_taskenddate", value: new Date(projectObj.custentity_clb_projct_end_dte)});
            taskRecord.setText({fieldId: "custevent_clb_tasktype", text: timesheetType});
            taskRecord.setValue({fieldId: "estimatedwork", value: 2080});     
            taskRecord.setText({fieldId: "custevent_clb_wrlk_tsk_id ", text: workflowTaskId});
             
            let taskId = taskRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
            log.debug({title: "taskId", details: taskId});
            return taskId;
        }
        catch(ex)
        {
            log.error({title: "Create New Task on Project", details: ex});
        }
    };
    const getProjectDates = (projectId) =>{
        try 
        {
            let fieldObj = search.lookupFields({
                type: "job",
                id: projectId,
                columns: ["startdate", "custentity_clb_projct_end_dte"]
            });
            return fieldObj;
        } 
        catch(ex) 
        {
            log.error({title: "Get Project Dates", details: ex});
        }
    };
    const getTimesheetId = (dataObj) => {
        try 
        {
            log.debug({title: "dataObj", details: dataObj}); 
            let timesheetObj= {};
    
            let searchObj = search.create({
                type: record.Type.TIME_BILL,
                filters:[
                    ["employee", "anyof", dataObj.employeeId], "AND",
                    ["date", "on", dataObj.tsEntryDate], "AND",
                    ["customer", "anyof", dataObj.customerId], "AND",
                    //["casetaskevent", "anyof", dataObj.taskId], "AND",                        
                    ["custcol_clb_timesheettype", "anyof", dataObj.timesheetType], "AND",
                    ["custcol_clb_uniqueid", "is", dataObj.uniqueId]
                ],
                columns:[
                    {name: "internalid"},
                    {name: "datecreated"},
                    {name: "status"},
                    {name: "hours"},
                    {name: "formuladatetime", formula: "{datecreated}", sort: search.Sort.DESC}
                ]
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1 });    
            log.debug({title: "Existing Timesheet", details: searchResult}); 
            if(searchResult.length > 0) 
            {
                timesheetObj.internalId = searchResult[0].id;
                timesheetObj.status = searchResult[0].getValue({name: "status"});
                timesheetObj.hours = searchResult[0].getValue({name: "hours"});
            }
            return timesheetObj;                
        } 
        catch(ex) 
        {
            log.error({title: "Get Timesheet Id", details: ex});    
            return{status: "Failed", message: ex.message};   
        }
    };
    let reverseTimesheet = (weeklyTSData) =>{
        try 
        {
            let reversedTSArr = [];
            for(let a in weeklyTSData)
            {
                let timesheetId = weeklyTSData[a].internalId;
                let copiedRecObj = record.copy({type: record.Type.TIME_BILL, id: timesheetId, isDynamic: true});
                let hours = copiedRecObj.getValue({fieldId: "hours"});
                let uniqueId = copiedRecObj.getValue({fieldId: "custcol_clb_uniqueid"});
                // log.debug({title: "hours", details: hours+" : "+uniqueId});    
                uniqueId = uniqueId.substr(0,text.indexOf("_"));
                log.debug({title: "Reverse TS Unique ID", details: uniqueId}); 
                copiedRecObj.setValue({fieldId: "billed", value: false});
                copiedRecObj.setValue({fieldId: "hours", value: -hours});
                copiedRecObj.setValue({fieldId: "custcol_clb_uniqueid", value: uniqueId+"_Rev"});
                copiedRecObj.setValue({fieldId: "custcol_asc_timesheet_status", value: 4});
                copiedRecObj.setValue({fieldId: "custcol_asc_timesheet_reversed", value: true});
                copiedRecObj.setValue({fieldId: "custcol_clb_pushedviaintegration", value: true});
                copiedRecObj.setValue({fieldId: "custcol_reversed_from_timesheet", value: timesheetId});
                copiedRecObj.setValue({fieldId: "custcol_clb_invoice", value: ""});
                copiedRecObj.setValue({fieldId: "custcol_clb_vendor_bill_link", value: ""});
                copiedRecObj.setValue({fieldId: "isbillable", value: false});
                
                let reversedTs = copiedRecObj.save({enableSourcing: true, ignoreMandatoryFields: true});
                //log.debug({title: "reversedTs", details: reversedTs});
                
                let newUniqueId = uniqueId ? uniqueId+"_Updated" : "";
                    
                record.submitFields({
                    type: record.Type.TIME_BILL,
                    id: timesheetId,
                    values: {
                        "custcol_asc_timesheet_status": 3,
                        "custcol_clb_timesheetupdated": true,
                        "custcol_clb_uniqueid": newUniqueId
                    }
                });
                reversedTSArr.push(reversedTs);
            }
            return reversedTSArr;
        } 
        catch(ex) 
        {
            log.error({title: "Reverse Billed Timesheet", details: ex});  
            return {status: "Failed", message: ex.message};   
        }
    };
    let validateData = (timesheetData) => {  
        try
        {          
            let returnObj = [];
            timesheetData = JSON.parse(JSON.stringify(timesheetData));            
            for(let a in timesheetData)
            {
                let errorObjArr = [];
                let obj = timesheetData[a];
                //log.debug({title: "obj", details: obj});                
                scriptConstraint.mandatoryFields.forEach(property => {
                   if(typeof obj[property] !== "string" && obj[property] === "" && property !== "customer") 
                   {
                       errorObjArr.push({name: "MISSING_ARGUMENTS", message: property + " is either not specified or not in String format for Time Tracking Object Number " + (Number(a)+1) + " in the payload. " + property + " must be sent in quotes ['']."});
                   }
                   if(property === "requestMode" && (obj[property].toLowerCase() !== "create" && obj[property].toLowerCase() !== "update")) 
                   {
                       errorObjArr.push({name: "INVALID_ARGUMENTS", message: "Request mode is incorrectly specified for Time Tracking Object Number " + (Number(a)+1) + " in the payload. Acceptable request modes can be 'Create' or 'Update', case inSenSitiVE."});
                   }
                   else if((property === "trandate" || property === "custcol_clb_weekendingdate") && (!lib.validateDate(obj[property]))) 
                   {
                       errorObjArr.push({name: "INVALID_ARGUMENTS", message: property + " is incorrectly specified for Time Tracking Object Number " + (Number(a)+1)+ " in the payload. Please make sure you enter a valid date in MM/DD/YYYY format."});
                   }
                  /*  else if(property === "custcol_clb_timesheettype" && (!lib.fieldValueMatches(scriptConstraint.timesheetTypes, obj[property].toLowerCase()))) 
                   {
                       errorObjArr.push({name: "INVALID_ARGUMENTS", message: "Timesheet Type is incorrectly specified for Time Tracking Object Number " + (Number(a)+1)+ " in the payload. Acceptable timesheet types can be 'Straight Time', 'Over Time' and 'Double Time' and 'Time_Off', case inSenSitiVE."});
                   } */
                   else if(property === "hours") 
                   {
                       if(!lib.isValidNumber(obj[property])) 
                       {
                           errorObjArr.push({name: "INVALID_ARGUMENTS", message: "Number of hours is incorrectly specified for Time Tracking Object Number " + (Number(a)+1)+ " in the payload. It should be a valid number."});
                       }
                   }
                   else if(property === "isbillable" && (obj[property].toUpperCase() !== "T" && obj[property].toUpperCase() !== "F")) 
                   {
                      errorObjArr.push({name: "INVALID_ARGUMENTS", message: "Billable status is incorrectly specified for Time Tracking Object Number " + (Number(a)+1) + " in the payload. Acceptable billable values can be 'T' or 'F'."});
                   }
                   else if(property === "custcol_clb_submitted" && (obj[property].toUpperCase() !== "T" && obj[property].toUpperCase() !== "F")) 
                   {
                       errorObjArr.push({name: "INVALID_ARGUMENTS", message: "Submitted status is incorrectly specified for Time Tracking Object Number " + (Number(a)+1) + " in the payload. Acceptable submitted status values can be 'T' or 'F'."});
                   }
                   else if(property === "customer" && (obj[property] === "")) 
                   {
                       errorObjArr.push({name: "MISSING_ARGUMENTS", message: "Customer is missing from Time Tracking Object Number " + (Number(a)+1)});
                   }
               });
               //log.debug({title: "errorObjArr In Validation", details: errorObjArr});
               if(errorObjArr.length > 0)
               {
                    returnObj.push({"status": "FAILED", "nsInternalId": "", "errorDetails": errorObjArr, "entityId": obj.uniqueId, "tranDate": obj.trandate});
               }                
            }
            if(returnObj.length > 0)
            {
                return [returnObj];
            }
            else
            {
                return returnObj;
            }
        }
        catch(ex)
        {
            log.error({title: "Validate Data", details: ex});
            return {"status": "FAILED", "nsInternalId": "", "errorDetails": [{name: ex.name, message: ex.message}], "entityId": "", "tranDate": ""};
        }
    };
    let isTimesheetExist = (uniqueId, weekEndDate, tranDate) => {
        try 
        {
            let timesheetId = "";        
            let searchObj = search.create({
                type: record.Type.TIME_BILL,
                filters:[["custcol_clb_uniqueid", "is", uniqueId], "AND", ["custcol_clb_weekendingdate", "on", weekEndDate], "AND", ["date", "on", tranDate]],
                columns:[]
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1}); 
            if(searchResult.length > 0) 
            {
                timesheetId = searchResult[0].id;
            }
            return timesheetId;                
        } 
        catch(ex) 
        {
            log.error({title: "Check TS Exist", details: ex});  
        }
    };
    const searchProject = (entityId) =>{
        try
        {
            if(!entityId)
                return "";

            let projectId = "";
            let projectSearch = search.create({
                type: search.Type.JOB,
                filters:[
                        ["entityid", "is", entityId], "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:[]
            });
            let searchResult = projectSearch.run().getRange({start: 0, end: 1});
            //log.debug({title: "Project Search", details: searchResult});
            if (searchResult.length > 0) {                
                projectId = searchResult[0].id;
            }
            return projectId;
        } 
        catch(ex) 
        {
            log.error({title: "Search Project", details: ex});
        }
    };
    const getWeeklyTimesheet = (customer, employee, uniqueId, weekEndDate) =>{
        try 
        {
            let weeklyTSData = [];
            search.create({
                type: "timebill",
                filters: [
                  /*  ["customer", "anyof", customer], "AND", 
                   ["employee", "anyof", employee], "AND", 
                   ["custcol_clb_uniqueid", "is", uniqueId], "AND", 
                   ["custcol_clb_weekendingdate", "on", weekEndDate], "AND",  */
                    ["customer.entityid", "is", customer], "AND", 
                    ["employee.custentity_clb_entityid", "is", employee], "AND", 
                    ["custcol_clb_uniqueid", "is", uniqueId], "AND", 
                    ["custcol_clb_weekendingdate", "on", weekEndDate], "AND", 
                    ["custcol_asc_timesheet_status", "anyof", "1", "2", "6"]
                ],
                columns:[                
                    {name: "durationdecimal"},
                    {name: "date"}
                ]
            }).run().each(function(result){
                weeklyTSData.push({
                    "internalId": result.id,
                    "hour": result.getValue({name: "durationdecimal"}),
                    "tranDate": result.getValue({name: "date"})
                });
                return true;
            });
            return weeklyTSData;
        } 
        catch(ex) 
        {
            log.error({title: "Get Weekly Timesheet", details: ex});
        }
    };
    const validateTSHoursChange = (exTSObj, newTSObj) =>{
        try 
        {
            let groupedTSObj = groupBy(exTSObj, "tranDate");
            let flag = false;
            for(let i=0; i<newTSObj.length ; i++)
            {
                let tranDate = newTSObj[i].trandate;
                let newHours = newTSObj[i].hours;
                let exHours = groupedTSObj[tranDate][0].hour;
                //log.debug({title: "New Hours : Existing Hours", details: tranDate+ " - " +Number(newHours)+" - "+Number(exHours)}); 
                if(Number(exHours) !== Number(newHours))
                {
                    flag = true;
                }
            }
            return flag;
        } 
        catch(ex)
        {
            log.error({title: "Validate Timesheet Changes", details: ex});    
        }
    };
    const getProjectData = (projectId, employeeId, workflowTaskId) =>{
        try 
        {
            let projectData = {};
            let searchObj = search.create({
                type: "resourceallocation",
                filters: [
                    [["resource.custentity_clb_entityid", "is", employeeId], "OR", ["resource.entityid" , "startswith", employeeId]], "AND", 
                    ["job.entityid", "is", projectId], "AND",
                    ["custevent_clb_prjct_workl_tsk_id", "is", workflowTaskId]
                ],
                columns:[
                    {name: "resource"},
                    {name: "entityid", join: "job", sort: search.Sort.DESC},
                    {name: "internalid", join: "job"}
                ]
            });
            let searchResult = searchObj.run().getRange({start: 0, end: 1});
            log.debug({title: "Project searchResult", details: searchResult});    
            if(searchResult.length > 0) 
            {                
                projectData.employeeId = searchResult[0].getValue({name: "resource"});
                projectData.projectId = searchResult[0].getValue({name: "internalid", join: "job"});
            }
            return projectData;
        } 
        catch(ex) 
        {
            log.error({title: "Get Project/Resource Allocation", details: ex});    
        }
    };
    const groupBy = function(xs, key) {
        return xs.reduce(function(rv, x) {
          (rv[x[key]] = rv[x[key]] || []).push(x);
          return rv;
        }, {});
    };
    const createErrorRec = (responseObj, refRecordId, type) =>{
        try
        {            
            let recordIds = [], failedDataObj = [];
           // log.debug({title: "dataObj", details: dataObj});
            for(let i=0 ; i<responseObj.length ; i++)
            {
                let resObj = responseObj[i];
                for(let j in resObj)
                {
                    let dataObj = resObj[j];                    
                    if((dataObj.status).toLowerCase() == "failed")
                    {
                        failedDataObj.push(dataObj);
                    }
                }
            }
            if(failedDataObj.length > 0)
            {
                let recordObj = record.create({type: "customrecord_clb_integration_failed_rec", isDynamic: true});
                recordObj.setValue({fieldId: "custrecord_clb_rec_type", value: type});
                recordObj.setValue({fieldId: "custrecord_clb_record_status", value: "1"});
                recordObj.setValue({fieldId: "custrecord_clb_failed_reason", value: JSON.stringify(failedDataObj)});    
                recordObj.setValue({fieldId: "custrecord_clb_master_record_ref", value: refRecordId}); 
                let recordId = recordObj.save(); 
                recordIds.push(recordId);
            }
            return recordIds;
        }
        catch(ex)
        {
            log.error({title: "Create Error Record", details: ex});
        }
    };
    const upateRequestMode = (timesheetJson) =>{
        try
        {
            timesheetJson.requestMode = "create";        
            for(let sp=0 ; sp<timesheetJson.timesheetDetails.length ; sp++)
            {
                timesheetJson.timesheetDetails[sp].requestMode = "create";
            }
            return timesheetJson;
        }
        catch(ex)
        {
            log.error({title: "Update Request Mode", details: ex});
        }
    };
    return {
        getInputData: getInputData, 
        reduce: reduce, 
        summarize: summarize
    };
});