/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/runtime", "N/format", "SuiteScripts/Projects/Library/Project Library.js"], (search, record, runtime, format, lib) => {
    const scriptConstants = {
        folderId: {},
        inputByValue: [
            "parent",
            "custentity_clb_invoiceheader",
            "companyname",
            "startdate",
            "custentity_clb_projct_end_dte",
            "custentity_clb_projectaddressline1",
            "custentity_clb_projectaddressline2",
            "custentity_clb_projectaddresslinecity",
            "custentity_clb_prpjectaddresslinestate",
            "custentity_clb_projectaddresslinezip",
            "custentity_clb_projectaddresslinecountry",
            "custentity_clb_econ",
            "custentity_clb_salesforceopportunityid",
            "custentity_clb_bench_project",
            "custentity3",
            "custentity_clb_parentproject",
            "custentity_clb_workflow_tsk_id"
        ],
        inputByDropdown: [
            "customer",
            "custentity_clb_bilcycle",
            "projectmanager",
            "subsidiary",
            "currency", 
            "jobbillingtype",
            "custentity_clb_salesaccountant",
            "custentity_clb_lastday",
            "entitystatus",
            "custentity_clb_industryvertical",
            "custentity_clb_practicetower",
            "custentity_clb_projectbillingtype",
            "custentity_clb_reqtype",
            "custentity_clb_engagementmodel",
            "custentity_clb_sow",
            "custentity_clb_engineering",
            "cseg_clb_digitower",
            "custentity_clb_geo",
            "custentity_clb_billabletype",
			"custentity_clb_resourcebillingtype"
        ],
        raInputByDropdown: [
            "custevent_clb_circles", 
            "custevent_clb_resourcebillingtype",
            "custevent_clb_businesstype", 
            "custevent_clb_resource_location",
            "custevent_asc_payrollgroup",
            "allocationtype",
            "custevent_resource_allocation_status"
        ],
        poInputByDropdown: [
            "custrecord_asc_cpd_sales_tax", 
            "custrecord_asc_cpd_country", 
            "custrecord_asc_cpd_state"
        ],
        projectTypeForInvVal: {
            "G": "T&M Projects - W2 Employees",
            "S": "T&M Projects - Subtier resource",
            "P": "T&M Projects - Pass thru resource",
        },
        taskType: ["ST", "OT", "DT"]
    };
    let createdRecordsArr = [];
    let isChildProject = false;
    let recordId = "";
    const getInputData = (context) => {
        try 
        {
            let scriptObj = runtime.getCurrentScript();
            recordId = scriptObj.getParameter({name: "custscript_proj_integration_recid"});
            let projectJSON = record.load({type: "customrecord_intgrtn_mstr_rcrd_dtls", id: recordId, isDynamic: true}).getValue({fieldId: "custrecord_int_rqst_pyld"});
            log.debug({ title: "projectJSON", details: projectJSON});
            return JSON.parse(projectJSON);            
        } 
        catch(ex) 
        {
            log.debug({title: "Get Input Data", details: ex});
        }
    };
    const reduce = (context) => {
        try 
        {
            let isCreate = false;
            let projectJSON = JSON.parse(context.values[0]);
            //log.debug({title: "projectJSON", details: projectJSON});
            let entityId = projectJSON.entityid;
            let wfTaskId = projectJSON.custentity_clb_workflow_tsk_id;
            //Check project is exists or not if yes then load for update
            let projectId = lib.searchProject(wfTaskId);
            log.debug({title: "Existing Project ID", details: projectId});
            if(!projectId) isCreate = true;

            let validationObj = validateData(projectJSON, isCreate);
            //log.debug({title: "validationObj", details: validationObj});
            if(validationObj.length > 0)
            {
                let returnObj = {"status": "FAILED", "nsInternalId": "", "nsProjectId": "", "taskId": projectJSON.custentity_clb_workflow_tsk_id, "errorCode": "", "errorDetails": validationObj, "stack": ""};
                context.write({key: entityId, value: returnObj});  
            } 
            else
            {
                let responseObj = createProject(projectJSON, projectId, isCreate); 
                log.debug({title: "responseObj", details: responseObj});   
                context.write({key: entityId, value: responseObj});  
            }                 
        } 
        catch(ex) 
        {
            log.debug({title: "Reduce", details: ex});
        }
    };
    const summarize = (context) => {
        try 
        {
            let reponseArray = [];
            context.output.iterator().each(function (key, value) {
               // log.debug("Summarize", "Key : " + key + "; Value : " + (value));
                let reponseObj = JSON.parse(value);
                reponseObj["entityId"] = key;
                reponseArray.push(reponseObj)
                return true;
            });
            log.debug('reponseArray', reponseArray);
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_proj_integration_recid"});
            log.debug({ title: "Summarize recordId", details: recordId });
            let recordIds = lib.createErrorRec(reponseArray, recordId, "1");//Project T&M
            log.debug({ title: "recordIds", details: recordIds });
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
            log.debug({title: "Summarize", details: ex});
        }
    };
    const createProject = (projectJSON, projectId, isCreate) =>{
        let errorObjArr = [];   
        projectJSON = JSON.parse(JSON.stringify(projectJSON));
        let wfTaskId = projectJSON.custentity_clb_workflow_tsk_id;
        let jobId = "", newProjectId = "";
        let scriptObj = runtime.getCurrentScript();
        let intRecordId = scriptObj.getParameter({name: "custscript_proj_integration_recid"});
        try 
        {
            let projectRec = "";
            //log.debug({title: "projectId In Create", details: projectId});               
            let empId = (projectJSON.projectresource[0].custrecord_clb_subcon_emp).slice(1);
            //log.debug({title: "empId", details: empId});
            let employeeId = getEntityId(empId);
            log.debug({title: "employeeId", details: employeeId}); 
            if(employeeId)
            {
                updateEmployee(employeeId);
            }  
            if(!employeeId)
            {
                employeeId = createEmployee(projectJSON.projectresource[0].empdetails, projectJSON.projectresource[0].custrecord_clb_subcon_emp);
            }               
                    
            if(!projectId)
            {
                projectRec = record.create({type: record.Type.JOB, isDynamic: true});
                projectRec.setValue({fieldId: "materializetime", value: false});
                projectRec.setValue({fieldId: "autoname", value:  false});
                projectRec.setValue({fieldId: "custentity_clb_pushed_via_intgrtion", value: true});
                projectRec.setValue({fieldId: "projectexpensetype", value: -2});                
                jobId = lib.generateProjectId(projectJSON.projectresource[0].custrecord_clb_subcon_emp, projectJSON.projectType);
                log.debug({title: "New Job Id", details: jobId}); 
                projectRec.setValue({fieldId: "entityid", value: jobId}); 
            }
            else
            {
                projectRec = record.load({type: record.Type.JOB, id: projectId, isDynamic: true}) 
                jobId = projectRec.getValue({fieldId: "entityid"});
            }
            let projectTypeVal = projectJSON.projectType;
            let projectJSONKeys = Object.keys(projectJSON);         
            let isParent = true;
            let projectInternalId = "";
            //Setting project header values
            for(let a in projectJSONKeys)
            {
                if(lib.fieldInputTypeMatches(scriptConstants.inputByValue, projectJSONKeys[a])) 
                {
                    if(projectJSONKeys[a] === "parent") 
                    {
                        //log.debug({title: "isCreate", details: isCreate});
                        if(isCreate === true)
                        {
                            let customerId = lib.getEntityId("customer", projectJSON[projectJSONKeys[a]]);
                            log.debug({title: "customerId", details: customerId});
                            if(customerId) 
                            {
                                projectRec.setValue({fieldId: projectJSONKeys[a], value: customerId});
                            }
                        }
                    }
                    else if(projectJSONKeys[a] === "custentity_clb_parentproject") 
                    {
                        if(projectJSON[projectJSONKeys[a]])
                        {
                            projectInternalId = getParentProject(projectJSON[projectJSONKeys[a]]).projectId;
                            //log.debug({title: "projectInternalId", details: projectInternalId});
                            if(projectInternalId) 
                            {
                                projectRec.setValue({fieldId: projectJSONKeys[a], value: projectInternalId});
                                isParent = false;
                            }
                        }
                    }
                    else if(projectJSONKeys[a] === "companyname" && isCreate === true)
                    {
                        projectRec.setValue({fieldId: "companyname", value: projectJSON["companyname"]});
                    }
                    else 
                    {
                        if((projectJSONKeys[a] == "startdate" && isCreate == true) || (projectJSONKeys[a] == "custentity_clb_projct_end_dte"))
                        {
                            projectRec.setValue({fieldId: projectJSONKeys[a], value: new Date(projectJSON[projectJSONKeys[a]])});
                        }
                        else
                        {
                            if(projectJSON[projectJSONKeys[a]] && (projectJSONKeys[a] !== "startdate"))
                                projectRec.setValue({fieldId: projectJSONKeys[a], value: projectJSON[projectJSONKeys[a]]});
                        }
                    }
                }
                else if(lib.fieldInputTypeMatches(scriptConstants.inputByDropdown, projectJSONKeys[a]))
                {
                    if(projectJSONKeys[a] === "currency") {}
                    else if(projectJSON[projectJSONKeys[a]] === "") 
                    {
                        projectRec.setValue({fieldId: projectJSONKeys[a], value: ""});
                    }
                    else if(projectJSONKeys[a] === "projectmanager" && projectJSON[projectJSONKeys[a]]) 
                    {
                        let projectMgrId = getProjectManager(projectJSON[projectJSONKeys[a]]);
                        projectRec.setValue({fieldId: "projectmanager", value: projectMgrId});
                    }
                    else 
                    {
                        //log.debug({title: "Key : Value", details: projectJSONKeys[a] +" : "+ projectJSON[projectJSONKeys[a]]});       
                        if(projectJSON[projectJSONKeys[a]] != "")
                        {
                            let selectedOptionId = lib.getSelectValueId(projectRec, "bodyLevelField", projectJSONKeys[a], projectJSON[projectJSONKeys[a]]);
                            if(!selectedOptionId) 
                            {
                                log.debug('Dropdown Value Not Found', 'Could not find Internal ID for selected value for ' + projectJSONKeys[a]);
                                throw{                            
                                    name: "INVALID ARGUMENT",
                                    message: "Invalid Field Value [" + projectJSON[projectJSONKeys[a]] + "] entered for: " + projectJSONKeys[a] + ". Please verify the payload and try again later"
                                };
                            }
                            projectRec.setValue({fieldId: projectJSONKeys[a], value: selectedOptionId});
                            if(projectJSONKeys[a] === "jobbillingtype") 
                            {
                                if(selectedOptionId === "TM") 
                                {
                                    if(projectTypeVal == "G" || projectTypeVal == "S" || projectTypeVal == "P") 
                                    {
                                        let selectedValue = lib.getSelectValueId(projectRec, "bodyLevelField", "custentity_clb_projecttypeforinvoicing", scriptConstants.projectTypeForInvVal[projectTypeVal]);
                                        log.debug({title: "Project Type selectedValue", details: selectedValue});    
                                        projectRec.setValue({fieldId: "custentity_clb_projecttypeforinvoicing", value: selectedValue});
                                    }
                                    if(projectTypeVal == 'T') 
                                    {
                                        let selectedValue = lib.getSelectValueId(projectRec, "bodyLevelField", "custentity_clb_projecttypeforinvoicing", "Group Projects");
                                        projectRec.setValue({fieldId: "custentity_clb_projecttypeforinvoicing", value: selectedValue});
                                    }
                                }
                            }
                        }
                    }
                }                
            }             
            projectRec.setValue({fieldId: "allowtasktimeforrsrcalloc", value: true});
            projectRec.setValue({fieldId: "custentity_integration_record_ref", value: intRecordId});
            
            newProjectId = projectRec.save({ignoreMandatoryFields: true, enableSourcing: true});
            log.debug({title: "newProjectId", details: newProjectId});       
            createdRecordsArr.push({"recordType": "job", "internalId": newProjectId});  
            if(projectJSON.hasOwnProperty("projectresource") && projectJSON.projectresource != null)
            {
                let createdRAObj = createResourceAllocation(projectJSON, newProjectId);
                log.debug({title: "createdRAObj", details: createdRAObj});
                if(createdRAObj.status == "Failed")
                {
                    throw{status: "Failed", message: "Resource Allocation creation is failed."};
                }
            }
            let customerPoObj = "";
            if(projectJSON.hasOwnProperty("customerpo") && projectJSON.customerpo)
            {
                if(projectJSON.customerpo.custrecord_asc_cpd_cust_po_num)
                {
                    let projectIdForPO = "", companynameForPO = "";
                    if(projectJSON["custentity_clb_parentproject"] != "")
                    {
                        let parentProjObj = getParentProject(projectJSON["custentity_clb_parentproject"]);                        
                        projectIdForPO = parentProjObj.projectId;
                        companynameForPO = parentProjObj.companyname;
                    }
                    else
                    {
                        projectIdForPO = newProjectId;
                        companynameForPO = projectJSON.companyname;
                    }
                    log.debug({title: "projectIdForPO", details: projectIdForPO});
                    customerPoObj = createCustPORec(projectJSON.customerpo, projectIdForPO, companynameForPO);
                    log.debug({title: "customerPoObj", details: customerPoObj});
                    if(customerPoObj.status == "Failed")
                    {
                        throw{status: "Failed", message: "Customer PO creation is failed."};
                    }
                }
            }
            if(projectJSON.hasOwnProperty("projectresource") && projectJSON.projectresource != null)
            {
                if(projectJSON.projectresource[0].taskdetails)
                {
                    //Creating tasks
                    let createdTasksObj = createTask(projectJSON, newProjectId, customerPoObj.recordIds, isCreate);
                    log.debug({title: "createdTasksObj", details: createdTasksObj});
                    if(createdTasksObj.status == "Failed")
                    {
                        throw{status: "Failed", message: "Task creation is failed."};
                    }
                }
            }
            if(newProjectId)
            {
                return {"status": "SUCCESS", "nsInternalId": newProjectId, "nsProjectId": jobId, "taskId": wfTaskId, "errorCode": "", "errorDetails": [], "stack": ""};
            }
            else
            {
                return {"status": "FAILED", "nsInternalId": newProjectId, "nsProjectId": "", "taskId": wfTaskId, "errorCode": "", "errorDetails": errorObjArr, "stack": ""};
            }
        } 
        catch(ex) 
        {
            log.debug({title: "Create Project", details: ex}); 
            errorObjArr.push({name: "UNEXPECTED ERROR", message: ex.message});
            return {"status": "FAILED", "nsInternalId": newProjectId, "nsProjectId": "", "taskId": wfTaskId, "errorCode": "", "errorDetails": errorObjArr, "stack": ""};
        }
    };
    const validateData = (projectJSON, isCreate) =>{ 
        try
        {            
            log.debug({title: "In Validation isCreate", details: isCreate});   
            let errorObjArr = [];
            let errorCnt = 0;
            let projectStartDate = projectJSON.startdate;
            let projectEndDate = projectJSON.custentity_clb_projct_end_dte;
            let projectTypeArr = ["G", "S", "P"];
            if(!projectTypeArr.includes(projectJSON.projectType.toUpperCase())) 
            {                
                errorCnt++;
                let errorObj = {
                    name: "INVALID_ARGUMENTS",
                    message: "Project Type ["+projectJSON.projectType+"] provided in the payload is invalid. Individual / Child T&M Projects whose Project Type is starting with the characters 'G', 'S', and 'P' are only accepted. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            /* Validating Payload */
            if(typeof projectJSON.startdate !== 'string' && isCreate == true) 
            {                
                errorCnt++;
                let errorObj = {
                    name: "INVALID_ARGUMENTS",
                    message: "Project Start Date is missing is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);               
            }
            if(!lib.validateDate(projectJSON.startdate)) 
            {                
                errorCnt++;      
                let errorObj = {
                    name: "INVALID_ARGUMENTS",
                    message: "Project Start Date is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                };                     
                errorObjArr.push(errorObj);            
            }
            if(typeof projectJSON.custentity_clb_projct_end_dte !== 'string' && isCreate == true) 
            {                
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Project End Date is either missing or has unacceptable values is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if(!lib.validateDate(projectJSON.custentity_clb_projct_end_dte)) 
            {
                errorCnt++;
                let errorObj = {
                    name: "INVALID_ARGUMENTS",
                    message: "Project End Date is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                };                     
                errorObjArr.push(errorObj);
            }
            if(new Date(projectJSON.startdate) > new Date(projectJSON.custentity_clb_projct_end_dte)) 
            {
                errorCnt++;
                let errorObj = {
                    name: "INVALID_ARGUMENTS",
                    message: "Start Date of the Project [" + projectJSON.startdate + "] is after the End Date of the Project [" + projectJSON.custentity_clb_projct_end_dte + "]. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.companyname !== 'string' || projectJSON.companyname === "") && isCreate == true)
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Company Name [companyname] of the project is either missing or has unacceptable values in the payload. Company Name of the Project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if(projectJSON.companyname.length > 300) 
            {
                errorCnt++;
                let errorObj = {
                    name: "CHARACTER LIMIT EXCEEDED",
                    message: "Company Name for the Project cannot have more than 300 characters. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.parent !== 'string' || projectJSON.parent === "") && isCreate == true)
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Parent / Customer [parent] of the project is either missing or has unacceptable values in the payload. Parent / Customer of the Project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if(!lib.validateParent(projectJSON.parent)) 
            {
                if(projectJSON.parent.startsWith('T')) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "The Parent Project/Customer [" + projectJSON.parent + "] specified for the Project is either inactive or does not exist in system. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                else 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "The Customer [" + projectJSON.parent + "] specified for the Project is either inactive or does not exist in system. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
            }
            if(typeof projectJSON.projectmanager !== 'string' && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Project Manager [projectmanager] of the project is either missing or has unacceptable values in the payload. It should be in String format and must be at least mentioned as ''. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.subsidiary !== 'string' || projectJSON.subsidiary === "") && isCreate == true)
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Subsidiary [subsidiary] of the project is either missing or has unacceptable values in the payload. Subsidiary of the Project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.jobbillingtype !== 'string' || projectJSON.jobbillingtype === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Job Billing Type [jobbillingtype] for the Project is either missing or has unacceptable values in the payload. Job Billing Type of the Project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.currency !== 'string' || projectJSON.currency === "" || projectJSON.currency.toUpperCase() !== 'US DOLLAR') && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Currency [currency] of the project is either missing or has unacceptable values in the payload. Currency of the Project must be 'US Dollar' in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_lastday !== 'string' || projectJSON.custentity_clb_lastday === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "The weekending Day [custentity_clb_lastday] for the Project is either missing or has unacceptable values in the payload. Weekending Day for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_industryvertical !== 'string' || projectJSON.custentity_clb_industryvertical === "") && isCreate == true)
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Industry Vertical [custentity_clb_industryvertical] of the project is either missing or has unacceptable values in the payload. Industry Vertical for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_practicetower !== 'string' || projectJSON.custentity_clb_practicetower === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Practice Tower [custentity_clb_practicetower] of the project is either missing or has unacceptable values in the payload. Project Practice Tower for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_projectbillingtype !== 'string' || projectJSON.custentity_clb_projectbillingtype === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Project Billing Type [custentity_clb_projectbillingtype] of the project is either missing or has unacceptable values in the payload. Project Billing Type for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_reqtype !== 'string' || projectJSON.custentity_clb_reqtype === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Requisition Type [custentity_clb_reqtype] of the project is either missing or has unacceptable values in the payload. Requisition Type for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_engagementmodel !== 'string') && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Engagement Model [custentity_clb_engagementmodel] of the project is either missing or has unacceptable values in the payload. It should be in String format and must be at least mentioned as '' while creating / updating a Project. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_engineering !== 'string' || projectJSON.custentity_clb_engineering === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Engineering [custentity_clb_engineering] of the project is either missing or has unacceptable values in the payload. Engineering for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.cseg_clb_digitower !== 'string' || projectJSON.cseg_clb_digitower === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Digital Tower [cseg_clb_digitower] of the project is either missing or has unacceptable values in the payload. Digital Tower for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if((typeof projectJSON.custentity_clb_geo !== 'string' || projectJSON.custentity_clb_geo === "") && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "Geo [custentity_clb_geo] of the project is either missing or has unacceptable values in the payload. Geo for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if(typeof projectJSON.custentity_clb_invoiceheader !== 'string' && isCreate == true) 
            {
                errorCnt++;
                let errorObj = {
                    name: "INVALID_ARGUMENTS",
                    message: "Invoice Header [custentity_clb_invoiceheader] of the Project is either missing or has unacceptable values in the payload. It should be in String format and must be at least mentioned as ''. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if(projectJSON.custentity_clb_invoiceheader.length > 300) 
            {
                errorCnt++;
                let errorObj = {
                    name: "CHARACTER LIMIT EXCEEDED",
                    message: "Invoice Header of the Project cannot have more than 300 characters. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            }
            if(projectJSON.custentity_clb_econ !== "" && isCreate == true) 
            {
                if(!lib.isValidNumber(projectJSON.custentity_clb_econ)) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "Econ [" + projectJSON.custentity_clb_econ + "] mentioned for the Project is invalid. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                let res = lib.checkLength(projectJSON.custentity_clb_econ, 'Econ', 15, 'Project');
                if(res !== "")
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: res
                    };                     
                    errorObjArr.push(errorObj);
                }
            }       
            /* if((typeof projectJSON.custentity_clb_bilcycle !== 'string' || projectJSON.custentity_clb_bilcycle === "") && isCreate == true)
            {
                errorCnt++;
                let errorObj = {
                    name: "MISSING_ARGUMENTS",
                    message: "The Billing Cycle [custentity_clb_bilcycle] is either missing or has unacceptable values in the payload. Billing Cycle for the project must be mentioned and be in String format. Please verify the payload and try again."
                };                     
                errorObjArr.push(errorObj);
            } */   
            let employeeData = projectJSON.projectresource;
            if(employeeData)
            {
                employeeData = lib.cleanPayload(employeeData[0]);
                if(typeof employeeData !== 'object' || Array.isArray(employeeData)) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "The Project Resource Details [projectresource] is either missing or has unacceptable values. It must be an object consisting all the details of the resource. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                if((typeof employeeData.custrecord_clb_subcon_emp !== 'string' || employeeData.custrecord_clb_subcon_emp === "") && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Employee ID is either missing or has unacceptable values. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                if(employeeData.custrecord_clb_subcon !== true && employeeData.custrecord_clb_subcon !== false) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "The Subcon Flag [custrecord_clb_subcon] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. Acceptable Values for custrecord_clb_subcon are Boolean values [true/false]. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                if(employeeData.custrecord_clb_vendor && !employeeData.custrecord_clb_subcon) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "Vendor is mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " while Subcon value [custrecord_clb_subcon] is set as false. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
               /*  if(employeeData.custrecord_clb_subcon_emp && !employeeData.custrecord_clb_subcon_emp.startsWith('G') && employeeData.custrecord_clb_subcon === false) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "Subcon is mentioned as false for the Resource " + employeeData.custrecord_clb_subcon_emp + ". Subcon employees must have a vendor. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                } */
                if((typeof employeeData.resource_wf_task_id !== 'string' || employeeData.resource_wf_task_id === "") && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Workflow Task ID [resource_wf_task_id] is either missing or has unacceptable values in the payload for the Resource " + employeeData.custrecord_clb_subcon_emp + ". Workflow Task ID must be mentioned and be in String format. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                } 
                if((typeof employeeData.custevent_clb_resourcebillingtype !== 'string' || employeeData.custevent_clb_resourcebillingtype === "") && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Resource Billing Type [custevent_clb_resourcebillingtype] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. Resource Billing Type must be mentioned and be in String format. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                if((typeof employeeData.custevent_clb_businesstype !== 'string' || employeeData.custevent_clb_businesstype === "") && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Business Type [custevent_clb_businesstype] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. Business Type must be mentioned and be in String format. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                if((typeof employeeData.custevent_clb_resource_location !== 'string' || employeeData.custevent_clb_resource_location === "") && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Resource Location [custevent_clb_resource_location] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. Resource Location must be mentioned and be in String format. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
                let dummyResourceAllocationRecord = record.create({ type: record.Type.RESOURCE_ALLOCATION, isDynamic: true });       
                if(employeeData.custevent_clb_resourcebillingtype) 
                {
                    if(!lib.getSelectValueId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_resourcebillingtype', employeeData.custevent_clb_resourcebillingtype))
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Resource Billing Type [" + employeeData.custevent_clb_resourcebillingtype + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                }
                if(employeeData.custevent_clb_businesstype) 
                {
                    if(!lib.getSelectValueId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_businesstype', employeeData.custevent_clb_businesstype)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Business Type [" + employeeData.custevent_clb_businesstype + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                }
                if(employeeData.custevent_clb_resource_location) 
                {
                    if(!lib.getSelectValueId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_resource_location', employeeData.custevent_clb_resource_location)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Resource Location [" + employeeData.custevent_clb_resource_location + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                }
                if(employeeData.custrecord_clb_subcon) 
                {
                    if((typeof employeeData.custrecord_clb_newapbased !== 'string' || employeeData.custrecord_clb_newapbased === "") && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "AP Based [custrecord_clb_newapbased] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values while Subcon value [custrecord_clb_subcon] is set as true. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if((typeof employeeData.custrecord_clb_vendor !== "string" || employeeData.custrecord_clb_vendor === "") && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "Vendor for the Resource " + employeeData.custrecord_clb_subcon_emp + " is not mentioned while Subcon value [custrecord_clb_subcon] is set as true. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    let vendorInternalIdForValidation = lib.getEntityId("vendor", employeeData.custrecord_clb_vendor);
                    if(!vendorInternalIdForValidation) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "The vendor [" + employeeData.custrecord_clb_vendor + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either inactive or does not exist in system or missing from the payload. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if((typeof employeeData.custrecord_clb_originalstartdate !== 'string' || employeeData.custrecord_clb_originalstartdate === "" || employeeData.custrecord_clb_originalstartdate === null) && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "Vendor Start Date [custrecord_clb_originalstartdate] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if(!lib.validateDate(employeeData.custrecord_clb_originalstartdate)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Vendor Start Date [" + employeeData.custrecord_clb_originalstartdate + "] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if((typeof employeeData.custrecord_clb_originalenddate !== 'string' || employeeData.custrecord_clb_originalenddate === "" || employeeData.custrecord_clb_originalenddate === null) && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "Vendor End Date [custrecord_clb_originalenddate] for the Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if(!lib.validateDate(employeeData.custrecord_clb_originalenddate)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Vendor End Date [" + employeeData.custrecord_clb_originalenddate + "] for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    /* if(new Date(employeeData.custrecord_clb_originalstartdate) > new Date(employeeData.custrecord_clb_originalenddate)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Vendor Start Date [" + employeeData.custrecord_clb_originalstartdate + "] for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is after the Vendor End Date [" + employeeData.custrecord_clb_originalenddate + "]. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    } */
                    if(employeeData.achFees !== "" && isCreate == true) {
                        if (!lib.isValidNumber(employeeData.achFees)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "ACH Fees [" + employeeData.achFees + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        let res = lib.isValidPercentage(employeeData.achFees, 'ACH Fees', 100, "Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor);
                        if(res !== "")
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: res
                            };                     
                            errorObjArr.push(errorObj);
                        }
                    }
                    if(employeeData.placefees !== "" && isCreate == true) 
                    {
                        if (!lib.isValidNumber(employeeData.placefees)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "PLACE Fees [" + employeeData.placefees + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        let res = lib.isValidPercentage(employeeData.placefees, 'PLACE Fees', 100, "Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor);
                        if(res !== "")
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: res
                            };                     
                            errorObjArr.push(errorObj);
                        }
                    }
                    if(employeeData.insuCharges !== "" && isCreate == true) 
                    {
                        if(!lib.isValidNumber(employeeData.insuCharges)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "Insurance Charges [" + employeeData.insuCharges + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        let res = lib.isValidPercentage(employeeData.insuCharges, 'Insurance Charges', 100, "Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor);
                        if(res !== "")
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: res
                            };                     
                            errorObjArr.push(errorObj);
                        }
                    }
                    if(typeof employeeData.withHolding !== 'string' && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "California Witholding Tax for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is either missing or has unacceptable values. It should be in String format and must be at least mentioned as '' while creating / updating a Resource Vendor Detail. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if(employeeData.withHolding !== "" && isCreate == true) 
                    {
                        if(!lib.isValidNumber(employeeData.withHolding)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "California Witholding Tax [" + employeeData.withHolding + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        let res = lib.isValidPercentage(employeeData.withHolding, 'California Witholding Tax', 100, "Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor);
                        if(res !== "")
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: res
                            };                     
                            errorObjArr.push(errorObj);
                        }
                    }
                    /* Validating Dropdown Values of Resource Vendor Details */
                    if((typeof employeeData.custrecord_clb_paymode !== "string" || employeeData.custrecord_clb_paymode === "") && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "Payment Mode of the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is either missing or has unacceptable values. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if((typeof employeeData.custrecord_clb_subcon_terms !== "string" || employeeData.custrecord_clb_subcon_terms === "") && isCreate == true) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "Terms of the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is either missing or has unacceptable values. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    let dummyVendorRecord = record.create({ type: 'customrecord_clb_subconvendor', isDynamic: true });
                    if(employeeData.custrecord_clb_newapbased) {
                        if(!lib.getSelectValueId(dummyVendorRecord, 'bodyLevelField', 'custrecord_clb_newapbased', employeeData.custrecord_clb_newapbased)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "AP Based [" + employeeData.custrecord_clb_newapbased + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                    }
                    if(!lib.getSelectValueId(dummyVendorRecord, 'bodyLevelField', 'custrecord_clb_paymode', employeeData.custrecord_clb_paymode)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Payment Mode [" + employeeData.custrecord_clb_paymode + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    if(!lib.getSelectValueId(dummyVendorRecord, 'bodyLevelField', 'custrecord_clb_subcon_terms', employeeData.custrecord_clb_subcon_terms)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Terms [" + employeeData.custrecord_clb_subcon_terms + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " from the Vendor " + employeeData.custrecord_clb_vendor + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                }        
                // log.debug({title: "employeeData In Foreach", details: employeeData.taskdetails});            
                if(employeeData.taskdetails)
                {
                    if(!Array.isArray(employeeData.taskdetails)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "MISSING_ARGUMENTS",
                            message: "The Task Details [taskdetails] of Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. It must be an array consisting the Task Details of the resource. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                    employeeData.taskdetails.forEach(function(taskDetail) {
                        if((typeof taskDetail.custrecord_clb_tastype !== 'string' || taskDetail.custrecord_clb_tastype === "") && isCreate == true)
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "MISSING_ARGUMENTS",
                                message: "Task Type of Resource " + employeeData.custrecord_clb_subcon_emp + " is either missing or has unacceptable values. Acceptable Task Types are 'ST', 'OT' and 'DT'. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(taskDetail.custrecord_clb_billrate === "" && isCreate == true)
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "MISSING_ARGUMENTS",
                                message: "Bill Rate for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is either missing in the payload, or isn't in correct format. It should be in String format. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(!lib.isValidNumber(taskDetail.custrecord_clb_billrate)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "Bill Rate [" + taskDetail.custrecord_clb_billrate + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        let res = lib.checkLength(taskDetail.custrecord_clb_billrate, 'Bill Rate', 15, "Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype);
                        if(res !== "")
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: res
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(taskDetail.custrecord_clb_payrate === "" && isCreate == true) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "MISSING_ARGUMENTS",
                                message: "Pay Rate for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is either missing in the payload, or isn't in correct format. It should be in String format. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(!lib.isValidNumber(taskDetail.custrecord_clb_payrate)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "Pay Rate [" + taskDetail.custrecord_clb_payrate + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        let res1 = lib.checkLength(taskDetail.custrecord_clb_payrate, 'Pay Rate', 15, "Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype);
                        if(res1 !== "")
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: res1
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(taskDetail.custrecord_clb_intercopayrate) 
                        {
                            if(taskDetail.custrecord_clb_intercopayrate === "" && isCreate == true) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "Intercompany Pay Rate [" + taskDetail.custrecord_clb_intercopayrate + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. It should be in String format. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            if(!lib.isValidNumber(taskDetail.custrecord_clb_intercopayrate)) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "Intercompany Pay Rate [" + taskDetail.custrecord_clb_intercopayrate + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            let res = lib.checkLength(taskDetail.custrecord_clb_intercopayrate, 'Intercompany Pay Rate', 15, "Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype);
                            if(res !== "")
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: res
                                };                     
                                errorObjArr.push(errorObj);
                            }                  
                        }
                        if(taskDetail.custrecord_clb_inrequivalentrate) 
                        {
                            if(taskDetail.custrecord_clb_inrequivalentrate == "" && isCreate == true) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "INR Equivalent Rate [" + taskDetail.custrecord_clb_inrequivalentrate + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. It should be in String format. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            if(!lib.isValidNumber(taskDetail.custrecord_clb_inrequivalentrate))
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "INR Equivalent Rate [" + taskDetail.custrecord_clb_inrequivalentrate + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            let res = lib.checkLength(taskDetail.custrecord_clb_inrequivalentrate, 'INR Equivalent Rate', 15, "Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype);
                            if(res !== "")
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: res
                                };                     
                                errorObjArr.push(errorObj);
                            }                   
                        }
                        if(taskDetail.custrecord_clb_inrmonthlyamount) 
                        {
                            if(taskDetail.custrecord_clb_inrmonthlyamount === "" && isCreate == true) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "INR Monthly Amount [" + taskDetail.custrecord_clb_inrmonthlyamount + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. It should be in String format. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            if(!lib.isValidNumber(taskDetail.custrecord_clb_inrmonthlyamount)) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "INR Monthly Amount [" + taskDetail.custrecord_clb_inrmonthlyamount + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            let res = lib.checkLength(taskDetail.custrecord_clb_inrmonthlyamount, 'INR Monthly Amount', 15, "Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype);
                            if(res !== "")
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: res
                                };                     
                                errorObjArr.push(errorObj);
                            }                    
                        }
                        if((typeof taskDetail.custrecord_clb_start_date !== 'string' && taskDetail.custrecord_clb_start_date === "" && taskDetail.custrecord_clb_start_date === null) && isCreate == true) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "MISSING_ARGUMENTS",
                                message: "Start Date for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(taskDetail.custrecord_clb_start_date)
                        {
                            if(!lib.validateDate(taskDetail.custrecord_clb_start_date)) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "Start Date [" + taskDetail.custrecord_clb_start_date + "] for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                        }
                        if((typeof taskDetail.custrecord_clb_end_date !== 'string' && taskDetail.custrecord_clb_end_date === "" && taskDetail.custrecord_clb_end_date === null) && isCreate == true) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "MISSING_ARGUMENTS",
                                message: "End Date for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(taskDetail.custrecord_clb_end_date)
                        {
                            if(!lib.validateDate(taskDetail.custrecord_clb_end_date)) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "End Date [" + taskDetail.custrecord_clb_end_date + "] for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                        }
                        if(new Date(taskDetail.custrecord_clb_start_date) > new Date(taskDetail.custrecord_clb_end_date))
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "Start Date [" + taskDetail.custrecord_clb_start_date + "] of Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is after the End Date [" + taskDetail.custrecord_clb_end_date + "]. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(new Date(taskDetail.custrecord_clb_start_date) < new Date(projectStartDate)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "Start Date [" + taskDetail.custrecord_clb_start_date + "] of Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is outside the date range of the project [" + projectStartDate + " - " + projectEndDate + "]. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(new Date(taskDetail.custrecord_clb_end_date) > new Date(projectEndDate)) 
                        {
                            errorCnt++;
                            let errorObj = {
                                name: "INVALID_ARGUMENTS",
                                message: "End Date [" + taskDetail.custrecord_clb_end_date + "] of Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is outside the date range of the project [" + projectStartDate + " - " + projectEndDate + "]. Please verify the payload and try again."
                            };                     
                            errorObjArr.push(errorObj);
                        }
                        if(taskDetail.custevent_ascdion_prj_budget) 
                        {
                            if(taskDetail.custevent_ascdion_prj_budget === "" && isCreate == true) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "INR Monthly Amount [" + taskDetail.custrecord_clb_inrmonthlyamount + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. It should be in String format. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            if(!lib.isValidNumber(taskDetail.custevent_ascdion_prj_budget)) 
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: "INR Monthly Amount [" + taskDetail.custrecord_clb_inrmonthlyamount + "] mentioned for the Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype + " is invalid. Please verify the payload and try again."
                                };                     
                                errorObjArr.push(errorObj);
                            }
                            let res = lib.checkLength(taskDetail.custevent_ascdion_prj_budget, "Budget", 15, "Resource " + employeeData.custrecord_clb_subcon_emp + " for the task " + taskDetail.custrecord_clb_tastype);
                            if(res !== "")
                            {
                                errorCnt++;
                                let errorObj = {
                                    name: "INVALID_ARGUMENTS",
                                    message: res
                                };                     
                                errorObjArr.push(errorObj);
                            }                    
                        }      
                    });  
                }
            } 
            //Customer PO data validation - Starts     
            let customerPoData = projectJSON.customerpo;    
            if(customerPoData && customerPoData.custrecord_asc_cpd_cust_po_num != "")
            {
                let cpoDummyRec = record.create({type: "customrecord_ascendion_cust_po_details", isDynamic: true});  
                if(customerPoData.custrecord_asc_cpd_cust_po_num === "" && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Customer PO Number is missing from the JSON payload. Please verify the payload and try again."
                    };
                    errorObjArr.push(errorObj);
                } 
                if((typeof customerPoData.custrecord_asc_cpd_start_date !== 'string' && customerPoData.custrecord_asc_cpd_start_date === "" && customerPoData.custrecord_asc_cpd_start_date === null) && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "Start Date for the Customer PO " + customerPoData.custrecord_asc_cpd_start_date + " is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                    };
                    errorObjArr.push(errorObj);
                }
                if(customerPoData.custrecord_asc_cpd_start_date)
                {
                    if(!lib.validateDate(customerPoData.custrecord_asc_cpd_start_date)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Start Date [" + customerPoData.custrecord_asc_cpd_start_date + "] for the Customer PO " + customerPoData.custrecord_asc_cpd_cust_po_num + " is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                        };
                        errorObjArr.push(errorObj);
                    }
                }
                if((typeof customerPoData.custrecord_asc_cpd_end_date !== 'string' && customerPoData.custrecord_asc_cpd_end_date === "" && customerPoData.custrecord_asc_cpd_end_date === null) && isCreate == true) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "MISSING_ARGUMENTS",
                        message: "End Date for the Customer PO " + customerPoData.custrecord_asc_cpd_end_date + " is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."
                    };
                    errorObjArr.push(errorObj);
                }
                if(customerPoData.custrecord_asc_cpd_end_date)
                {
                    if(!lib.validateDate(customerPoData.custrecord_asc_cpd_end_date)) 
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "End Date [" + customerPoData.custrecord_asc_cpd_end_date + "] for the Customer PO " + customerPoData.custrecord_asc_cpd_cust_po_num + " is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."
                        };
                        errorObjArr.push(errorObj);
                    }
                }
                if(new Date(customerPoData.custrecord_asc_cpd_start_date) > new Date(customerPoData.custrecord_asc_cpd_end_date))
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "Start Date [" + customerPoData.custrecord_asc_cpd_start_date + "] of the Customer PO " + customerPoData.custrecord_asc_cpd_cust_po_num + " is after the End Date [" + customerPoData.custrecord_asc_cpd_end_date + "]. Please verify the payload and try again."
                    };
                    errorObjArr.push(errorObj);
                }
                if(new Date(customerPoData.custrecord_asc_cpd_start_date) < new Date(projectStartDate)) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "Start Date [" + customerPoData.custrecord_asc_cpd_start_date + "] of the Customer PO " + customerPoData.custrecord_asc_cpd_cust_po_num + " is outside the date range of the project [" + projectStartDate + " - " + projectEndDate + "]. Please verify the payload and try again."
                    };
                    errorObjArr.push(errorObj);
                }
                if(new Date(customerPoData.custrecord_asc_cpd_end_date) > new Date(projectEndDate)) 
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "End Date [" + customerPoData.custrecord_asc_cpd_end_date + "] of the Customer PO  " + customerPoData.custrecord_asc_cpd_cust_po_num + " is outside the date range of the project [" + projectStartDate + " - " + projectEndDate + "]. Please verify the payload and try again."
                    };
                    errorObjArr.push(errorObj);
                }
                if(customerPoData.custrecord_asc_cpd_sales_tax) 
                {
                    if(!lib.getSelectValueId(cpoDummyRec, "bodyLevelField", "custrecord_asc_cpd_sales_tax", customerPoData.custrecord_asc_cpd_sales_tax))
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Tax Code [" + customerPoData.custrecord_asc_cpd_sales_tax + "] mentioned for the Resource " + customerPoData.custrecord_asc_cpd_cust_po_num + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                }
                if(customerPoData.custrecord_asc_cpd_country) 
                {
                    if(!lib.getSelectValueId(cpoDummyRec, "bodyLevelField", "custrecord_asc_cpd_country", customerPoData.custrecord_asc_cpd_country))
                    {
                        errorCnt++;
                        let errorObj = {
                            name: "INVALID_ARGUMENTS",
                            message: "Country [" + customerPoData.custrecord_asc_cpd_country + "] mentioned for the Resource " + customerPoData.custrecord_asc_cpd_cust_po_num + " is invalid. Please verify the payload and try again."
                        };                     
                        errorObjArr.push(errorObj);
                    }
                }
                else
                {
                    errorCnt++;
                    let errorObj = {
                        name: "INVALID_ARGUMENTS",
                        message: "Country is missing for the Customer PO " + customerPoData.custrecord_asc_cpd_cust_po_num + ".. Please verify the payload and try again."
                    };                     
                    errorObjArr.push(errorObj);
                }
            }
            //Customer PO data validation - End
            return errorObjArr; 
        } 
        catch(ex) 
        {
            log.debug({title: "Validate Data", details: ex});
        }                   
    };
    const createResourceAllocation = (projectJSON, projectId) =>{
        try 
        {
            let wfTaskId = projectJSON.custentity_clb_workflow_tsk_id;
            let raInternalId = "";
            for(let a in projectJSON.projectresource)
            {
                let projectResource = projectJSON.projectresource[a];
                let recordObj;
                let employeeId = getEntityId((projectResource.custrecord_clb_subcon_emp).slice(1));  
                log.debug({title: "employeeId", details: employeeId});                   
                let searchObj = search.create({
                    type: "resourceallocation",
                    filters: [
                        ["resource", "anyof", employeeId], "AND",
                        ["project", "anyof", projectId]
                    ],
                    columns: []
                });
                let serachRes = searchObj.run().getRange({start: 0, end: 1});
                if(serachRes.length > 0)
                {
                    raInternalId = serachRes[0].id;
                }
                log.debug({title: "Existing RA raInternalId", details: raInternalId});
                if(raInternalId)
                {
                    recordObj = record.load({type: record.Type.RESOURCE_ALLOCATION, id: raInternalId, isDynamic: true});
                }
                else
                {
                    recordObj = record.create({type: record.Type.RESOURCE_ALLOCATION, isDynamic: true});  
                } 
                recordObj.setValue({fieldId: "allocationresource", value: employeeId});
                recordObj.setValue({fieldId: "startdate", value: new Date(projectJSON.startdate)});
                recordObj.setValue({fieldId: "enddate", value:  new Date(projectJSON.custentity_clb_projct_end_dte)});  
                recordObj.setText({fieldId: "allocationunit", text: "Percent of Time"});  
                recordObj.setValue({fieldId: "allocationamount", value: "100"}); 
                recordObj.setValue({fieldId: "project", value:  projectId});
                recordObj.setValue({fieldId: "custevent_clb_prjct_workl_tsk_id", value: wfTaskId});

                if(projectResource.custevent_isoffboarded === true)
                {
                    recordObj.setValue({fieldId: "custevent_isoffboarded", value: projectResource.custevent_isoffboarded});
                    recordObj.setValue({fieldId: "enddate", value:  new Date(projectResource.offboardingDate)});  
                }

                let projectResourceKeys = Object.keys(projectResource);
                //log.debug({title: "projectResourceKeys", details: projectResourceKeys});
                for(let b in projectResourceKeys) 
                {
                    if(lib.fieldInputTypeMatches(scriptConstants.raInputByDropdown, projectResourceKeys[b])) 
                    {
                        if(projectResource[projectResourceKeys[b]] === '') 
                        {
                            recordObj.setValue({fieldId: projectResourceKeys[b], value: null});
                        }
                        else if(projectResourceKeys[b] === "allocationtype")
                        {
                            recordObj.setText({fieldId: projectResourceKeys[b], text: projectResource[projectResourceKeys[b]]});
                        }
                        else if(projectResourceKeys[b] === "custevent_resource_allocation_status")
                        {
                            let raStatusObj = getAllocationStatus(projectResource[projectResourceKeys[b]]);
                            recordObj.setText({fieldId: projectResourceKeys[b], text: raStatusObj.text});
                            if(projectResource[projectResourceKeys[b]] === "Abandoned")
                            {
                                closeProject(projectId);
                                recordObj.setValue({fieldId: "custevent_isoffboarded", value: true});
                                
                            }
                        }
                        else 
                        {
                            let selectedOptionInternalId = lib.getSelectValueId(recordObj, 'bodyLevelField', projectResourceKeys[b], projectResource[projectResourceKeys[b]]);
                            //log.debug('Dropdown Select Value', selectedOptionInternalId);
                            if(!selectedOptionInternalId) 
                            {
                                log.debug('Dropdown Value Not Found', 'Could not find Internal ID for selected value for ' + projectResourceKeys[b]);                          
                                throw{ 
                                    name: "INVALID ARGUMENT",
                                    message: "Invalid Field Value [" + projectResource[projectResourceKeys[b]] + "] entered for: " + projectResourceKeys[b] + ". Please verify the payload and try again later."
                                };
                            }
                            recordObj.setValue({fieldId: projectResourceKeys[b], value: selectedOptionInternalId});
                        }
                    }
                }
                if(projectResource.custevent_actual_startdate)
                    recordObj.setValue({fieldId: "custevent_actual_startdate", value:  new Date(projectResource.custevent_actual_startdate)});  

               // log.debug({title: "Resource Allocation Record", details: recordObj});
                let resourceId = recordObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                log.debug('Created / Updated Resource Allocation Record', 'Internal ID : ' + resourceId);
                createdRecordsArr.push({"recordType": "resourceallocation", "internalId": resourceId});
                return{
                    status: "Success",
                    message: "Resource Allocation Record is Created.",
                    recordIds: resourceId
                };
            }            
        } 
        catch(ex) 
        {
            log.debug({title: "Create Resource Allocation Record", details: ex});
            return{status: "Failed", message: ex.message};
        }        
    }; 
    const createTask = (projectJSON, projectId, customerPoId, isCreate) =>{
        let taskRecord, taskRecordArr = [], resourcePayRateObj = [], vendorObj = {}, apDedObj = {};
        try 
        {
            let projResourceObj = projectJSON.projectresource;
            let subsidiary = projectJSON.subsidiary;
            let currency = projectJSON.currency;
            let wfTaskId = projectJSON.custentity_clb_workflow_tsk_id;
            for(let a in projResourceObj)
            {                
                let projectResource = projResourceObj[a];
                let projectResourceKeys = Object.keys(projectResource);
                let employeeId = getEntityId((projectResource.custrecord_clb_subcon_emp).slice(1));                 
                log.debug({title: "employeeId", details: employeeId});
                if(!employeeId)
                {
                    throw{
                        name: "INVALID ARGUMENT",
                        message: "Employee ["+projectResource.custrecord_clb_subcon_emp+"] is either not available in the NetSuite or Inactive/Terminated. Please verify the payload and try again."
                    }
                }
                let workflowTaskId = projectResource.resource_wf_task_id;
                log.debug({title: "workflowTaskId", details: workflowTaskId});
                for(let b in projectResource.taskdetails)
                { 
                    let payRateObj = {};
                    let taskDetails = projectResource.taskdetails[b];

                    let taskTitle = taskDetails.custrecord_clb_tastype;
                    let taskType = taskDetails.custrecord_clb_tastype == "ST" ? "1" : taskDetails.custrecord_clb_tastype == "OT" ? "2" : taskDetails.custrecord_clb_tastype == "DT" ? "3" : taskDetails.custrecord_clb_tastype == "Fix-Bid" ? "4" : taskDetails.custrecord_clb_tastype == "Sick Time" ? "5" : taskDetails.custrecord_clb_tastype == "Holiday" ? "6" : "";
                    log.debug({title: "taskType", details: taskType});
                    taskDetails.taskTypeId = taskType;
                   // taskDetails.custrecord_clb_tastype = taskType;
                    let exTaskId = getExistingTask(taskDetails, projectId);
                    log.debug({title: "exTaskId", details: exTaskId});
                    if(exTaskId)
                    {
                        taskRecord = record.load({type: record.Type.PROJECT_TASK, id: exTaskId, isDynamic: true});    
                    }   
                    else
                    {                        
                        taskRecord = record.create({type: record.Type.PROJECT_TASK, isDynamic: true});
                        taskDetails.startdate = format.parse({ value: taskDetails.custrecord_clb_start_date, type: format.Type.DATE});
                        taskRecord.setValue({fieldId: "startdate", value: taskDetails.startdate});
                    }
                    taskRecord.setValue({fieldId: "constrainttype", value: "FIXEDSTART"});
                    taskRecord.setValue({fieldId: "company", value: projectId});
                    taskRecord.setValue({fieldId: "title", value: taskTitle});
                    taskRecord.setValue({fieldId: "custevent_clb_taskenddate", value: new Date(taskDetails.custrecord_clb_end_date)});
                    taskRecord.setValue({fieldId: "status", value: "PROGRESS"});
                    taskRecord.setValue({fieldId: "custevent_clb_tasktype", value: taskType});
                    taskRecord.setValue({fieldId: "estimatedwork", value: 2080});     
                    taskRecord.setValue({fieldId: "custevent_ascdion_prj_budget", value: taskDetails.custevent_ascdion_prj_budget});                  
                    taskRecord.setText({fieldId: "custevent_clb_intecompanypayrate", text: taskDetails.custrecord_clb_intercopayrate});
                    taskRecord.setText({fieldId: "custevent_clb_inrequivalentrate", text: taskDetails.custrecord_clb_inrequivalentrate});
                    taskRecord.setText({fieldId: "custevent_clb_wrlk_tsk_id ", text: wfTaskId});
                    taskRecord.setValue({fieldId: "custevent_clb_recordsource", value: 28});
                    taskRecord.setValue({fieldId: "custevent_clb_resourc_dtls_tsk_id", value: taskDetails.uniqueId});   
                    taskRecord.setValue({fieldId: "custevent_ascendion_prj_poid", value: customerPoId});   
                         
                
                    let itemId = lib.getServiceItem(taskType);
                    log.debug({title: "itemId", details: itemId});

                    taskRecord.selectLine({ sublistId: "assignee", line: 0});
                    let newTaskEndDate = new Date(taskDetails.custevent_clb_taskenddate);
                    newTaskEndDate = newTaskEndDate.getMonth() + 1 + "/" + newTaskEndDate.getDate() + "/" + newTaskEndDate.getFullYear();
                    taskRecord.setCurrentSublistValue({sublistId: "assignee", fieldId: "resource", value: employeeId });
                    taskRecord.setCurrentSublistValue({sublistId: "assignee", fieldId: "serviceitem", value: itemId});                    
                    taskRecord.setCurrentSublistValue({sublistId: "assignee", fieldId: "estimatedwork", value: 2080});
                    taskRecord.setCurrentSublistValue({sublistId: "assignee", fieldId: "unitcost", value: 1});
                    taskRecord.setCurrentSublistValue({sublistId: "assignee", fieldId: "unitprice", value: 1});
                    taskRecord.commitLine({sublistId: "assignee"});

                    let taskId = taskRecord.save({ignoreMandatoryFields: true, enableSourcing: true});
                    log.debug({title: "taskId", details: taskId});
                    taskRecordArr.push({"recordType": "projecttask", "internalId": taskId});

                    payRateObj.projectId = projectId;
                    payRateObj.taskType = taskType;
                    payRateObj.payRate = taskDetails.custrecord_clb_payrate;
                    payRateObj.billRate = taskDetails.custrecord_clb_billrate;
                    payRateObj.interCompPayRate = taskDetails.custrecord_clb_intercopayrate;
                    payRateObj.inrEquRate = taskDetails.custrecord_clb_inrequivalentrate;
                    payRateObj.inrMonthAmt = taskDetails.custrecord_clb_inrmonthlyamount
                    payRateObj.effectiveDate = taskDetails.custrecord_clb_start_date;
                    payRateObj.title = taskDetails.custrecord_clb_tastype;
                    payRateObj.workflowId = wfTaskId;
                    resourcePayRateObj.push(payRateObj);
                }
                let vendorId = "";
                if(projectResource.custrecord_clb_vendor)
                    vendorId = lib.getEntityId("vendor", projectResource.custrecord_clb_vendor);     
               
                vendorObj.projectId = projectId;
                vendorObj.vendor = vendorId;
                vendorObj.originalStartDate = projectResource.custrecord_clb_originalstartdate;
                vendorObj.originalEndDate = projectResource.custrecord_clb_originalenddate;
                vendorObj.paymode = projectResource.custrecord_clb_paymode;
                vendorObj.terms = projectResource.custrecord_clb_subcon_terms;
                vendorObj.withhotax = projectResource.custrecord_clb_withhotax;   
                vendorObj.subcon = projectResource.custrecord_clb_subcon;
                vendorObj.apBased = projectResource.custrecord_clb_newapbased;
                vendorObj.workflowId = wfTaskId;    
                vendorObj.payStatus = projectResource.custrecord_asc_subcon_paystatus;
                vendorObj.onholdNotes = projectResource.custrecord_asc_onhold_notes;         

                apDedObj.workflowId = wfTaskId;   
                apDedObj.projectId = projectId;
                apDedObj.vendor = vendorId; 
                apDedObj.subsidiary = subsidiary;
                apDedObj.currency = currency;
                apDedObj.feesObj = [
                    {"type": "Place", "percentage": projectResource.placefees, "effectiveDate": projectResource.placefeesEffDate}, 
                    {"type": "Insurance", "percentage": projectResource.insuCharges, "effectiveDate": projectResource.insuChargesEffDate}, 
                    {"type": "California Withholding", "percentage": projectResource.withHolding, "effectiveDate": projectResource.withHoldingEffDate}, 
                    {"type": "ACH", "percentage": projectResource.achFees, "effectiveDate": projectResource.achFeesEffDate}	, 
                    {"type": "CBC", "percentage": projectResource.cbcAmount, "effectiveDate": projectResource.cbcEffDate}	
                ];
                let resultObj = createResourceDetailsRec(employeeId, resourcePayRateObj, vendorObj, apDedObj, isCreate);
                log.debug({title: "Resource Details Records Result", details: resultObj});
                if(resultObj.status == "Failed")
                {
                    throw {
                        status: "Failed",
                        message: "Resource Details Record Creation/Updation is Failed."
                    };
                }
            }
            return{
                status: "Success",
                message: "All Task Records are Created/Updated.",
                recordIds: taskRecordArr
            };
        } 
        catch(ex) 
        {
            log.debug({title: "Create Task", details: ex});
            throw{
                status: "Failed",
                message: ex.message
            };
        }        
    };    
    const createResourceDetailsRec = (employeeId, dataObj, vendorObj, apDedObj, isCreate) =>{
        try
        {
            let recordIds = [];
            log.debug({title: "Employee dataObj", details: dataObj});            
            for(let a in dataObj)
            {
                let payRateObj = dataObj[a];                

                let exPayRateRecId = getExPayRateRec(payRateObj.projectId, payRateObj.taskType, payRateObj.effectiveDate, employeeId);
                log.debug({title: "exPayRateRecId", details: exPayRateRecId});
                if(exPayRateRecId)
                {
                    let payRateRecObj = record.load({type: "customrecord_clb_subcontask", id: exPayRateRecId, isDynamic: true});
                    payRateRecObj.setValue({fieldId: "custrecord_clb_payrate", value: payRateObj.payRate});
                    let payRateRecId = payRateRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                    log.debug({title: "payRateRecId", details: payRateRecId});
                    createdRecordsArr.push({"recordType": "customrecord_clb_subcontask", "internalId": payRateRecId});   
                    recordIds.push(payRateRecId);
                }
                else
                {
                    if(Number(payRateObj.payRate) > 0)
                    {
                        let payRateRecObj = record.create({type: "customrecord_clb_subcontask", isDynamic: true});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_proj", value: payRateObj.projectId});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_tastype", value: payRateObj.taskType});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_payrate", value: payRateObj.payRate});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_intercopayrate", value: payRateObj.interCompPayRate});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_inrequivalentrate", value: payRateObj.inrEquRate});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_inrmonthlyamount", value: payRateObj.inrMonthAmt});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_start_date", value: new Date(payRateObj.effectiveDate)});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_title", value: payRateObj.title});
                        payRateRecObj.setValue({fieldId: "custrecord_workflow_task_id", value: payRateObj.workflowId});
                        payRateRecObj.setValue({fieldId: "custrecord_clb_subcontaskrecord", value: employeeId});
        
                        let payRateRecId = payRateRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                        log.debug({title: "payRateRecId", details: payRateRecId});
                        createdRecordsArr.push({"recordType": "customrecord_clb_subcontask", "internalId": payRateRecId});  
                        recordIds.push(payRateRecId);
                    }
                }   

                let exBillRateRecId = getExBillRateRec(payRateObj.projectId, payRateObj.taskType, payRateObj.effectiveDate, employeeId);
                log.debug({title: "exBillRateRecId", details: exBillRateRecId});
                if(exBillRateRecId)
                {
                    let billRateRecObj = record.load({type: "customrecord_clb_subconbillrate", id: exBillRateRecId, isDynamic: true});
                    billRateRecObj.setValue({fieldId: "custrecord_clb_billrate", value: payRateObj.billRate});    
                    let billRateRecId = billRateRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                    log.debug({title: "billRateRecId", details: billRateRecId});
                    createdRecordsArr.push({"recordType": "customrecord_clb_subconbillrate", "internalId": billRateRecId}); 
                    recordIds.push(billRateRecId);
                }
                else
                {
                    if(Number(payRateObj.billRate) > 0)
                    {
                        let billRateRecObj = record.create({type: "customrecord_clb_subconbillrate", isDynamic: true});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_proj_bill", value: payRateObj.projectId});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_tastype_bill", value: payRateObj.taskType});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_billrate", value: payRateObj.billRate});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_eff_date", value: new Date(payRateObj.effectiveDate)});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_title_bill", value: payRateObj.title});
                        billRateRecObj.setValue({fieldId: "custrecord_workflow_task_id_bill", value: payRateObj.workflowId});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_subconbillrecord", value: employeeId});
        
                        let billRateRecId = billRateRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                        log.debug({title: "billRateRecId", details: billRateRecId});
                        createdRecordsArr.push({"recordType": "customrecord_clb_subconbillrate", "internalId": billRateRecId}); 
                        recordIds.push(billRateRecId);
                    }
                }
            }
            if(vendorObj.vendor)
            {
                let isNew = false;
                let vendorDetRecObj = "";
                let vendorDetId = getExVendor(vendorObj.projectId, vendorObj.originalStartDate, vendorObj.originalEndDate, employeeId);
                if(vendorDetId)
                {
                    vendorDetRecObj = record.load({type: "customrecord_clb_subconvendor", id: vendorDetId, isDynamic: true});
                }
                else
                {
                    vendorDetRecObj = record.create({type: "customrecord_clb_subconvendor", isDynamic: true});
                    isNew = true;
                    if(vendorObj.paymode)
                        vendorDetRecObj.setText({fieldId: "custrecord_clb_paymode", text: vendorObj.paymode});
                }           
                vendorDetRecObj.setValue({fieldId: "custrecord_clb_subcon_project", value: vendorObj.projectId});
                vendorDetRecObj.setValue({fieldId: "custrecord_clb_vendor", value: vendorObj.vendor});
                vendorDetRecObj.setValue({fieldId: "custrecord_clb_originalstartdate", value: new Date(vendorObj.originalStartDate)});
                vendorDetRecObj.setValue({fieldId: "custrecord_clb_originalenddate", value: new Date(vendorObj.originalEndDate)});
                
                if(vendorObj.terms)
                    vendorDetRecObj.setText({fieldId: "custrecord_clb_subcon_terms", text: lib.titleCase(vendorObj.terms)});
                if(vendorObj.withhotax)
                    vendorDetRecObj.setText({fieldId: "custrecord_clb_withhotax", text: vendorObj.withhotax});
                if(vendorObj.subcon)
                    vendorDetRecObj.setValue({fieldId: "custrecord_clb_subcon", value: vendorObj.subcon});

                vendorDetRecObj.setValue({fieldId: "custrecord_clb_subconresource", value: employeeId});
                if(vendorObj.apBased)
                {
                    if(vendorObj.apBased == "Fixed Price - Weekly" || vendorObj.apBased == "Fixed Price - Monthly")
                    {
                        vendorDetRecObj.setValue({fieldId: "custrecord_clb_newapbased", value: 3});
                    }
                    else
                    {
                        vendorDetRecObj.setText({fieldId: "custrecord_clb_newapbased", text: vendorObj.apBased});
                    }
                }
                vendorDetRecObj.setValue({fieldId: "custrecord_clb_workflowid", value: vendorObj.workflowId});
                if(vendorObj.payStatus)
                    vendorDetRecObj.setText({fieldId: "custrecord_asc_subcon_paystatus", text: vendorObj.payStatus});
                if(vendorObj.onholdNotes)
                    vendorDetRecObj.setValue({fieldId: "custrecord_asc_onhold_notes", value: vendorObj.onholdNotes});     
        
                let vendorDetRecId = vendorDetRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                log.debug({title: "vendorDetRecId", details: vendorDetRecId});
                if(isNew && vendorDetRecId)
                {
                    updateOldVendorDeatils(vendorDetRecId, vendorObj.originalStartDate, vendorObj.projectId, vendorObj.vendor);
                }
                createdRecordsArr.push({"recordType": "customrecord_clb_subconvendor", "internalId": vendorDetRecId});  
                recordIds.push(vendorDetRecId);
            }
            if(apDedObj.vendor)
            {
                let subsidiaryId = getSubsidiaryId(apDedObj.subsidiary);
                let feesObj = apDedObj.feesObj;
                log.debug({title: "apDedObj", details: apDedObj});
                for(let i = 0 ; i<feesObj.length ; i++)
                {
                    //log.debug({title: "feesObj[i].percentage", details: feesObj[i].type+ " : " +feesObj[i].percentage+ " : " +feesObj[i].effectiveDate});
                    if(feesObj[i].percentage)
                    {
                        let exDedId = getExApDed(employeeId, apDedObj.projectId, apDedObj.workflowId, apDedObj.vendor, subsidiaryId, feesObj[i].type);
                        //log.debug({title: "exDedId", details: exDedId});
                        if(exDedId)
                            continue;

                        let apDedRecObj = record.create({type: "customrecord_ap_deduction_details", isDynamic: true});
                        apDedRecObj.setValue({fieldId: "custrecord_apd_employee", value: employeeId});  
                        apDedRecObj.setValue({fieldId: "custrecord_apd_workflowtaskid", value: apDedObj.workflowId});  
                        apDedRecObj.setValue({fieldId: "custrecord_apd_project", value: apDedObj.projectId}); 
                        apDedRecObj.setValue({fieldId: "custrecord_apd_vendor", value: apDedObj.vendor}); 
                        apDedRecObj.setValue({fieldId: "custrecord_apd_subsidiary", value: subsidiaryId}); 
                        apDedRecObj.setText({fieldId: "custrecord_apd_currency", text: apDedObj.currency}); 
                        apDedRecObj.setText({fieldId: "custrecord_apd_deduction_type", text: feesObj[i].type}); 
                        log.debug({title: "feesObj[i].effectiveDate", details: feesObj[i].effectiveDate});
                        apDedRecObj.setValue({fieldId: "custrecord_apd_effective_date", value: new Date(feesObj[i].effectiveDate)}); 
                        let perFieldId = feesObj[i].type == "CBC" ? "custrecord_apd_deduction_amount" : "custrecord_apd_deduction_per";
                        apDedRecObj.setValue({fieldId: perFieldId, value: feesObj[i].percentage});    
                        let apDedRecId = apDedRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                        log.debug({title: "apDedRecId", details: apDedRecId});
                        createdRecordsArr.push({"recordType": "customrecord_ap_deduction_details", "internalId": apDedRecId});  
                        recordIds.push(apDedRecId);
                    }
                }               
            } 
            log.debug({title: "createdRecordsArr", details: createdRecordsArr});       
            return{
                status: "Success",
                message: "Resource Detail Records Created/Updated.",
                recordIds: recordIds
            };
        } 
        catch(ex) 
        {
            log.debug({title: "Create Resource Details Records", details: ex});
            throw{status: "Failed", message: ex.message};
        }
    };
    const createCustPORec = (customerPOObj, projectId, projectName) =>{
        try
        {
            let customerPORecId = "", recordObj = "";
            let isNew = true;
            let searchObj = search.create({
                type: "customrecord_ascendion_cust_po_details",
                filters: [
                    ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectId], "AND",
                    ["custrecord_asc_cpd_cust_po_num", "is", customerPOObj.custrecord_asc_cpd_cust_po_num]
                ],
                columns: []

            });
            let serachRes = searchObj.run().getRange({start: 0, end: 1});
            if(serachRes.length > 0)
            {
                customerPORecId = serachRes[0].id;
                isNew = false;
            }
            if(customerPORecId)
            {
                recordObj = record.load({type: "customrecord_ascendion_cust_po_details", id: customerPORecId, isDynamic: true});
            }
            else
            {
                recordObj = record.create({type: "customrecord_ascendion_cust_po_details", isDynamic: true});
            }            
            recordObj.setValue({fieldId: "custrecord_asc_cpd_lnk_to_prj", value: projectId});
            // poInputByDropdown
            let customerPOKeys = Object.keys(customerPOObj);
            for(let b in customerPOKeys) 
            {
                if(lib.fieldInputTypeMatches(scriptConstants.poInputByDropdown, customerPOKeys[b])) 
                {
                    if(customerPOObj[customerPOKeys[b]] === '') 
                    {
                        recordObj.setValue({fieldId: customerPOKeys[b], value: null});
                    }
                    else 
                    {
                        let selectedOptionInternalId = lib.getSelectValueId(recordObj, 'bodyLevelField', customerPOKeys[b], customerPOObj[customerPOKeys[b]]);
                        //log.debug('Dropdown Select Value', selectedOptionInternalId);
                        if(selectedOptionInternalId) 
                        {
                            /* log.debug('Dropdown Value Not Found', 'Could not find Internal ID for selected value for ' + customerPOKeys[b]);                          
                            throw{  
                                name: "INVALID ARGUMENT",
                                message: "Invalid Field Value [" + customerPOObj[customerPOKeys[b]] + "] entered for: " + customerPOKeys[b] + ". Please verify the payload and try again later."
                            }; */
                            try {
                                recordObj.setValue({fieldId: customerPOKeys[b], value: selectedOptionInternalId});
                            } catch (error) {
                                
                            }
                           
                        }
                        //recordObj.setValue({fieldId: customerPOKeys[b], value: selectedOptionInternalId});
                    }
                }
                else
                {
                    if(customerPOKeys[b] == "custrecord_asc_cpd_start_date" || customerPOKeys[b] == "custrecord_asc_cpd_end_date")
                        recordObj.setValue({fieldId: customerPOKeys[b], value: new Date(customerPOObj[customerPOKeys[b]])});
                    else if(customerPOKeys[b] === "custrecord_asc_cpd_ignore_budget")
                        recordObj.setValue({fieldId: customerPOKeys[b], value: customerPOObj[customerPOKeys[b]] === "0" ? false : true});
                    else
                        recordObj.setValue({fieldId: customerPOKeys[b], value: customerPOObj[customerPOKeys[b]]});
                }
            }
            recordObj.setValue({fieldId: "name", value: projectName});
            log.debug({title: "isNew", details: isNew});
            let customerPoId = recordObj.save({ignoreMandatoryFields: true, enableSourcing: true});
            log.debug({title: "customerPoId", details: customerPoId});
            createdRecordsArr.push({"recordType": "customrecord_ascendion_cust_po_details", "internalId": customerPoId});  
            if(isNew)
            {
                let updatedPO = updateOldPo(customerPoId, customerPOObj["custrecord_asc_cpd_start_date"], projectId);
                log.debug({title: "Updated Old PO", details: updatedPO});
            }
            return{status: "Success", message: "Cusotmer PO Record is Created/Updated.", recordIds: customerPoId};
        } 
        catch(ex) 
        {
            log.debug({title: "Create Customer PO Record", details: ex});
            throw{status: "Failed", message: ex.message};
        }
    };
    const getExistingTask = (taskDetails, projectId) =>{
        try 
        {
            log.debug({title: "Get Existing Task taskDetails", details: taskDetails});
            let taskId = "";
            let searchObj = search.create({
                type: record.Type.PROJECT_TASK,
                filters:[
                    ["project", "anyof", projectId], "AND",
                    ["custevent_clb_tasktype", "anyof", Number(taskDetails.taskTypeId)]/* , "AND",
                    ["startdate", "on", taskDetails.custrecord_clb_start_date], "AND",
                    ["custevent_clb_taskenddate", "on", taskDetails.custrecord_clb_end_date] */
                ],
                columns:[]
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                taskId = searchRes[0].id;
            }
            return taskId;
        } 
        catch(ex) 
        {
            log.debug({title: "Get Existing Task", details: ex});
        }
    };
    const getExPayRateRec = (projectId, taskType, effectiveDate, employeeId) =>{
        try 
        {
            let payRateId = "";
            let searchObj = search.create({
                type: "customrecord_clb_subcontask",
                filters:[
                   ["custrecord_clb_proj", "anyof", projectId], "AND", 
                   ["custrecord_clb_tastype", "anyof",  taskType],  "AND", 
                   ["custrecord_clb_start_date", "on", effectiveDate], "AND",
                   ["custrecord_clb_subcontaskrecord", "anyof", employeeId]
                ],
                columns:[]
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                payRateId = searchRes[0].id;
            }
            return payRateId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Existing Pay Rate Record", details: ex});            
        }
    };
    const getExBillRateRec = (projectId, taskType, effectiveDate, employeeId) =>{
        try 
        {
            let billRateId = "";
            let searchObj = search.create({
                type: "customrecord_clb_subconbillrate",
                filters: [
                    ["custrecord_clb_proj_bill", "anyof", projectId], "AND", 
                    ["custrecord_clb_tastype_bill", "anyof", taskType], "AND", 
                    ["custrecord_clb_eff_date", "on", effectiveDate], "AND",
                    ["custrecord_clb_subconbillrecord", "anyof", employeeId]
                ],
                columns: []
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                billRateId = searchRes[0].id;
            }
            return billRateId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Existing Bill Rate Record", details: ex});            
        }
    };
    const getExVendor = (projectId, startDate, endDate, employeeId) =>{
        try 
        {
            let customerPoId = "";
            let searchObj = search.create({
                type: "customrecord_clb_subconvendor",
                filters:[
                   ["custrecord_clb_subcon_project", "anyof", projectId], "AND", 
                   ["custrecord_clb_originalstartdate", "on", startDate], "AND", 
                   ["custrecord_clb_originalenddate", "on", endDate], "AND",
                   ["custrecord_clb_subconresource", "anyof", employeeId]
                ],
                columns: []
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                customerPoId = searchRes[0].id;
            }
            return customerPoId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Existing Customer PO", details: ex});   
        }
    };
    const getExApDed = (employeeId, projectId, workflowId, vendor, subsidiaryId, type) =>{
        try 
        {
            //log.debug({title: "Filters", details: employeeId+" : "+projectId+" : "+workflowId+" : "+vendor+" : "+subsidiaryId+" : "+type});   
            let apDedRecId = "";
            let searchObj = search.create({
                type: "customrecord_ap_deduction_details",
                filters:[
                    ["custrecord_apd_employee", "anyof", employeeId], "AND", 
                    ["custrecord_apd_project", "anyof", projectId], "AND", 
                    ["custrecord_apd_workflowtaskid", "is", workflowId], "AND", 
                    ["custrecord_apd_vendor", "anyof", vendor], "AND", 
                    ["custrecord_apd_subsidiary", "anyof", subsidiaryId], "AND",
                    ["custrecord_apd_deduction_type", "anyof", deductionType(type)]
                ],
                columns: []
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                apDedRecId = searchRes[0].id;
            }
            return apDedRecId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Existing AP Deduction", details: ex});   
        }
    };
    const deductionType = (type) =>[{"ACH": 1,"Place": 2,"Insurance": 3,"California Withholding": 4,"CBC": 5}][0][type];
    const getParentProject = (entityId) =>{
        try
        {
            if(!entityId)
                return "";

            log.debug({title: "Parent Project", details: entityId});
            let projectObj = {};
            let projectSearch = search.create({
                type: "job",
                filters:[
                    ["entityid", "is", entityId.trim()], "AND",
                    ["isinactive", "is", "F"]
                ],
                columns:[
                    {name: "companyname"}
                ]
            });
            log.debug({title: "projectSearch Obj", details: projectSearch});
            let searchResult = projectSearch.run().getRange({start: 0, end: 10});
            log.debug({title: "Project Search", details: searchResult});
            if(searchResult.length > 0)
            {                
                projectObj.projectId = searchResult[0].id;
                projectObj.companyname = searchResult[0].getValue({name: "companyname"});
            }
            return projectObj;
        } 
        catch(ex) 
        {
            log.error({title: "Search Project", details: ex});
        }
    };   
    const updateOldPo = (newPoId, newPOStartDate, projectId) =>{
        try 
        {
            let updatedPO = [];
            let newDate = new Date(newPOStartDate);
            newDate.setDate(newDate.getDate() - 1);
            log.debug({title: "newDate", details: newDate});
            search.create({
                type: "customrecord_ascendion_cust_po_details",
                filters: [
                    ["internalid", "noneof", newPoId], "AND",
                    ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectId]
                ],
                columns: []
            }).run().each(function(result){
                let poId = result.id;
                record.submitFields({
                    type: "customrecord_ascendion_cust_po_details",
                    id: poId,
                    values:{
                        "custrecord_asc_cpd_end_date": newDate
                    }
                });
                updatedPO.push(poId);
                return true;
            });
            log.debug({title: "updatedPO", details: updatedPO});
            return updatedPO;
        } 
        catch(ex) 
        {
            log.debug({title: "Update Old Customer PO Record", details: ex});
        }
    }; 
    const updateOldVendorDeatils = (newVdId, newVDStartDate, projectId, vendorId) =>{
        try 
        {
            let updatedVD = [];
            let newDate = new Date(newVDStartDate);
            newDate.setDate(newDate.getDate() - 1);
            log.debug({title: "newDate", details: newDate});
            search.create({
                type: "customrecord_clb_subconvendor",
                filters: [
                    ["internalid", "noneof", newVdId], "AND",
                    ["custrecord_clb_subcon_project", "anyof", projectId],/*  "AND",
                    ["custrecord_clb_vendor", "anyof", vendorId] */
                ],
                columns: []
            }).run().each(function(result){
                record.submitFields({
                    type: "customrecord_clb_subconvendor",
                    id: result.id,
                    values:{
                        "custrecord_clb_originalenddate": newDate
                    }
                });
                updatedVD.push(result.id);
                return true;
            });
            log.debug({title: "updatedVD", details: updatedVD});
            return updatedVD;
        } 
        catch(ex) 
        {
            log.error({title: "Update Old Vendor Details Record", details: ex});
        }
    };
    const createEmployee = (employeeData, empId) =>{
        try
        {
            log.debug({title: "Employee Creation", details: employeeData});
            let empRecord = record.create({type: record.Type.EMPLOYEE, isDynamic: true});
            if(empId) 
            {
                empRecord.setValue({fieldId: 'custentity_clb_entityid', value: empId});
                empRecord.setValue({fieldId: 'entityid', value: empId});
                empRecord.setValue({fieldId: 'autoname', value: false});
            }
            if(employeeData.subsidiary) 
            {
                let subsidiaryId = getSubsidiaryId(employeeData.subsidiary);
                empRecord.setValue({fieldId: "subsidiary", value: subsidiaryId});
            }
            if(employeeData.custentity_clb_econ) empRecord.setValue({fieldId: 'custentity_clb_econ', value: employeeData.custentity_clb_econ});
            if(employeeData.custentity_clb_premiumdtpayrate) empRecord.setValue({fieldId: 'custentity_clb_premiumdtpayrate', value: employeeData.custentity_clb_premiumdtpayrate});
            if(employeeData.custentity_clb_hourlyotrate) empRecord.setValue({fieldId: 'custentity_clb_hourlyotrate', value: employeeData.custentity_clb_hourlyotrate});
            if(employeeData.custentity_clb_hourlyrate) empRecord.setValue({fieldId: 'custentity_clb_hourlyrate', value: employeeData.custentity_clb_hourlyrate});
            if(employeeData.custentity_clb_enddate) 
            {
                let endDate = format.parse({value: employeeData.custentity_clb_enddate, type: format.Type.DATE});
                empRecord.setValue({fieldId: 'custentity_clb_enddate', value: endDate});
            }
            if(employeeData.custentity_clb_effectivedate) 
            {
                let effectiveDate = format.parse({value: employeeData.custentity_clb_effectivedate, type: format.Type.DATE});
                empRecord.setValue({fieldId: 'custentity_clb_effectivedate', value: effectiveDate});
            }
            if(employeeData.custentity_clb_weeklysalary) 
            empRecord.setValue({fieldId: 'custentity_clb_weeklysalary', value: employeeData.custentity_clb_weeklysalary});
            if(employeeData.custentity_clb_vendorid) 
            {
                let dropdownField = empRecord.getField({fieldId: "custentity_clb_vendorid"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.custentity_clb_vendorid, operator: 'contains'}); 
                if (dropdownFieldOptions.length > 0) 
                {
                    let vendor = (dropdownFieldOptions[0].text);
                    let venId = (vendor.split(' ')[0]);
                    if(employeeData.custentity_clb_vendorid == venId) 
                    {
                        try 
                        {
                            empRecord.setValue({fieldId: 'custentity_clb_vendorid', value: dropdownFieldOptions[0].value});
                        } 
                        catch(error) 
                        {
                            log.debug("error",error);
                        }                        
                    }
                }
            }
            if(employeeData.gender) empRecord.setText({fieldId: 'gender', text: employeeData.gender});            
            if(employeeData.supervisor) 
            {
                let dropdownField = empRecord.getField({fieldId: "supervisor"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.supervisor, operator: 'is'});                
                if (dropdownFieldOptions.length > 0) 
                {
                    if(employeeData.supervisor == dropdownFieldOptions[0].text) 
                    {
                        empRecord.setText({fieldId: 'supervisor', text: supervisor});
                    }
                }
            }
            //if(employeeData.isinactive) empRecord.setValue({fieldId: 'isinactive', value: employeeData.isinactive == 1 ? true : false});
            if(employeeData.maritalstatus) empRecord.setText({fieldId: 'maritalstatus', text: employeeData.maritalstatus});
            if(employeeData.phone) empRecord.setValue({fieldId: 'phone', value: employeeData.phone});
            if(employeeData.homephone) empRecord.setValue({fieldId: 'homephone', value: employeeData.homephone});
            if(employeeData.mobilephone) empRecord.setValue({fieldId: 'mobilephone', value: employeeData.mobilephone});
            if(employeeData.fax) empRecord.setValue({fieldId: 'fax', value: employeeData.fax});
            if(employeeData.isjobresource) empRecord.setValue({fieldId: 'isjobresource', value: employeeData.isjobresource == 1 ? true : false});
            if(employeeData.birthdate)
            {
                let birthDate = format.parse({value: employeeData.birthdate, type: format.Type.DATE});
                empRecord.setValue({fieldId: 'birthdate', value: birthDate});
            }
            if(employeeData.hiredate) 
            {
                let hireDate = format.parse({value: employeeData.hiredate, type: format.Type.DATE});
                empRecord.setValue({fieldId: 'hiredate', value: hireDate});
            }
            if(employeeData.releasedate) 
            {
                let releaseDate = format.parse({value: employeeData.releasedate, type: format.Type.DATE});
                empRecord.setValue({fieldId: 'releasedate', value: releaseDate});
            }
            if(employeeData.firstname) empRecord.setValue({fieldId: 'firstname', value: employeeData.firstname});
            if(employeeData.middlename) empRecord.setValue({fieldId: 'middlename', value: employeeData.middlename});
            if(employeeData.lastname) empRecord.setValue({fieldId: 'lastname', value: employeeData.lastname});           
            if(employeeData.class) 
            {
                let dropdownField = empRecord.getField({fieldId: "class"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.class, operator: 'is'});
                if(dropdownFieldOptions.length > 0) 
                {
                    if(employeeData.class == dropdownFieldOptions[0].text) 
                    {
                        empRecord.setText({fieldId: 'class', text: dropdownFieldOptions[0].text});
                    }
                }
            }
            if(employeeData.department) 
            {
                let dropdownField = empRecord.getField({fieldId: "department"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.department, operator: 'is'});
                if(dropdownFieldOptions.length > 0) 
                {
                    if(employeeData.department == dropdownFieldOptions[0].text) 
                    {
                        empRecord.setText({fieldId: 'department', text: employeeData.department});
                    }
                }
            }
            if(employeeData.location) 
            {
                let dropdownField = empRecord.getField({fieldId: "location"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.location, operator: 'is'});
                if (dropdownFieldOptions.length > 0) 
                {
                    if (employeeData.location == dropdownFieldOptions[0].text) 
                    {
                        empRecord.setText({fieldId: 'location', text: employeeData.location});
                    }
                }
            }
            if(employeeData.officephone) empRecord.setValue({fieldId: 'officephone', value: employeeData.officephone});
            if(employeeData.issalesrep) empRecord.setValue({fieldId: 'issalesrep', value: employeeData.issalesrep == 1 ? true : false});
            if(employeeData.email) 
            {
                try 
                {
                    empRecord.setValue({fieldId: 'email', value: employeeData.email});
                } 
                catch (error) 
                {
                    log.debug("error",error);
                }
            }
            if(employeeData.employeetype) 
            {
                let dropdownField = empRecord.getField({fieldId: "employeetype"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.employeetype, operator: 'is'});
                if (dropdownFieldOptions.length > 0) 
                {
                    if (employeeData.employeetype === dropdownFieldOptions[0].text) 
                    {   
                        try 
                        {
                            empRecord.setValue({fieldId: 'employeetype', value: dropdownFieldOptions[0].value});
                        } 
                        catch (error) 
                        {
                            log.debug("error",error);
                        }                        
                    }
                }            
            }
            if(employeeData.title) empRecord.setValue({fieldId: 'title', value: employeeData.title});            
            if(employeeData.customlist_clb_employeepaytype) 
            {
                let dropdownField = empRecord.getField({fieldId: "custentity_clb_employeepaytype"});
                let dropdownFieldOptions = dropdownField.getSelectOptions({filter: employeeData.customlist_clb_employeepaytype, operator: 'is'});
                if (dropdownFieldOptions.length > 0) 
                {
                    if(employeeData.customlist_clb_employeepaytype == dropdownFieldOptions[0].text) 
                    {
                        empRecord.setText({fieldId: 'custentity_clb_employeepaytype', text: employeeData.customlist_clb_employeepaytype});
                    }
                }
            }
            let firstNameVal = empRecord.getValue({fieldId: 'firstname'});
            let lastNameVal = empRecord.getValue({fieldId: 'lastname'});
            let middleNameVal = empRecord.getValue({fieldId: 'middlename'});
            let nameFinal = '';
            if(firstNameVal) 
            {
                nameFinal += firstNameVal;
                if(middleNameVal) 
                {
                    nameFinal += ' ' + middleNameVal;
                }
                if (lastNameVal) 
                {
                    nameFinal += ' ' + lastNameVal;
                }
            } 
            else if (middleNameVal) 
            {
                nameFinal += middleNameVal;
                if (lastNameVal) 
                {
                    nameFinal += ' ' + lastNameVal;
                }
            } 
            else 
            {
                nameFinal = lastNameVal;
            }
            empRecord.setValue('entityid', empId + ' ' + nameFinal);            
            empRecord.setValue('custentity_clb_pushed_via_intgrtion', true);
                                    
            if(employeeData.custentity_clb_office_employee)
                empRecord.setValue('custentity_clb_office_employee', employeeData.custentity_clb_office_employee == 1 ? true : false);     

            empRecord.setValue('custentity_payrate_st', employeeData.custentity_payrate_st);             
            empRecord.setValue('custentity_payrate_ot', employeeData.custentity_payrate_ot);          
            empRecord.setValue('socialsecuritynumber', employeeData.socialsecuritynumber);
                                    
            if(employeeData.custentity_clb_effectivedate)
            {
                if(lib.validateDate(employeeData.custentity_clb_effectivedate)) 
                {                                
                    empRecord.setValue('custentity_clb_effectivedate', new Date(employeeData.custentity_clb_effectivedate));
                }
            }     
            let empRecordId = empRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
            return empRecordId;
        }
        catch(ex)
        {
            log.error({title: "Create New Employee", details: ex});
        }
    };
    const getSubsidiaryId = (subsidiary) =>{
        try
        {
            let subsidiaryId = "";
            let searchObj = search.create({
                type: search.Type.SUBSIDIARY,
                filters: [
                    {name: 'namenohierarchy', operator: search.Operator.IS, values: subsidiary}
                ],
                columns: []
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0) 
            {
                subsidiaryId = searchRes[0].id;
            }
            return subsidiaryId;
        }
        catch(ex)
        {
            log.error({title: "Get Subsidiary Id", details: ex});
        }
    };
    const getProjectManager = (managerId) =>{
        try
        {
            let internalId = "";
            let searchObj = search.create({
                type: "employee",
                filters: [
                    ["custentity_clb_entityid", "is", managerId]
                ],
                columns: []
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0) 
            {
                internalId = searchRes[0].id;
                record.submitFields({
                    type: "employee",
                    id: internalId,
                    values: {
                        "isjobresource": true,
                        "isjobmanager": true
                    }
                })
            }
            return internalId;             
        } 
        catch(ex) 
        {
            log.error({title: "Update Project Manager", details: ex});
        }
    };
    const getAllocationStatus = (raStatus) =>{
        try 
        {
            let raStatusArr = {"completed": {"id": "1", "text": "Allocated"}, "pending": {"id": "2", "text": "Workflow Initiated"}, "Abandoned": {"id": "3", "text": "Deallocated"}, "rejected": {"id": "4", "text": "Deallocated"}};
            return raStatusArr[raStatus];
        } 
        catch(ex)
        {
            log.error({title: "Get Resource Allocation Status", details: ex});
        }
    };
    const closeProject = (projectId) =>{
        try
        {
            let projRec = record.load({type: "job", id: projectId, isDynamic: true});
            projRec.setValue({fieldId: "entitystatus", value: "1"});//Closed
            projRec.setValue({fieldId: "custentity_clb_projct_end_dte", value: projRec.getValue({fieldId: "startdate"})});
            let projRecId = projRec.save({enableSourcing: true, ignoreMandatoryFields: true});
            return projRecId;
        }
        catch(ex)
        {
            log.error({title: "Close Project", details: ex});
        }
    };
    const updateEmployee = (employeeId) =>{
        try 
        {
            record.submitFields({
                type: "employee",
                id: employeeId,
                values: {
                    "isjobresource": true,
                    "isinactive": false,
                    "releasedate": ""
                }
            });
        } 
        catch(ex)
        {
            log.error({title: "Update Employee Project Preference", details: ex});    
        }
    };    
    const getEntityId = (entityId) =>{
        try
        {
            if(!entityId)
                return "";

            let internalId = "";
            let projectSearch = search.create({
                type: "employee",
                filters: [
                    ["custentity_clb_entityid", "contains", entityId]/* , "AND",
                    ["releasedate", "isempty", ""] */
                ],
                columns: []
            });
            let searchResult = projectSearch.run().getRange({start: 0, end: 1});
            log.debug({title: "Employee "+entityId, details: searchResult});
            if(searchResult.length > 0) 
            {                
                internalId = searchResult[0].id;
            }
            return internalId;
        } 
        catch(ex) 
        {
            log.error({title: "Search Entity", details: ex});
        }
    };
    return {getInputData, reduce, summarize};
});