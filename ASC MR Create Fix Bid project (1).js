/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(["N/search", "N/record", "N/runtime", "N/file", "N/format", "SuiteScripts/Projects/Library/Project Library.js"], (search, record, runtime, file, format, lib) => {
    const SCRIPT_CONSTANTS = {
        resourceAllocationFieldsToInputByDropdown: [
            'custevent_clb_circles', 
            'custevent_clb_resourcebillingtype', 
            'custevent_clb_businesstype', 
            'custevent_clb_resource_location'
        ],
        TASKTYPES: ['ST', 'OT', 'DT']
    };

    let projectId, projectRec;
    const getInputData = (inputContext) => {
        try 
        {
            var scriptObj = runtime.getCurrentScript();
            var intRecID = scriptObj.getParameter({ name: "custscript_fixbid_data" });
            log.debug("getInputData: ", "intRecID: "+intRecID)
            var recObj = search.lookupFields({
                type: "customrecord_intgrtn_mstr_rcrd_dtls",
                id: intRecID,
                columns: ["custrecord_int_rqst_pyld"]
            });
            var EmployeeJson = JSON.parse(recObj.custrecord_int_rqst_pyld);
            return EmployeeJson;
        }
        catch(ex) 
        {
            log.debug({ title: "Get Input Data", details: ex });
        }
    };
    const reduce = (reduceContext) => {
        let projectData = "";
        try 
        {
            log.audit("reduce: ", "start");
            projectData = JSON.parse(reduceContext.values[0]);
            log.debug({ title: "projectData", details: projectData });
            let validationObj = validateData(projectData);
            if(validationObj.length > 0)
            {
                let returnObj = {"status": "FAILED", "nsInternalId": "", "nsProjectId": "", "entityId": projectData.entityid, "taskId": projectData.projectresource[0].resource_wf_task_id, "errorCode": "", "errorDetails": validationObj, "stack": ""};
                reduceContext.write({key: projectData.entityid, value: returnObj});  
            }
            else
            {
                let responseArr = createRecords(projectData, projectData.projectresource[0].resource_wf_task_id);
                log.debug('resArr', responseArr);
                reduceContext.write({ key: projectData.entityid, value: responseArr });
            }
        }
        catch(ex) 
        {
            log.debug({ title: "Reduce", details: ex });
        }
    };
    const summarize = (summaryContext) => {
        try 
        {
            let reponseArray = [];
            summaryContext.output.iterator().each(function (key, value) {
                let reponseObj = JSON.parse(value);
                reponseArray.push(reponseObj)
                return true;
            });
            let scriptObj = runtime.getCurrentScript();
            log.debug('reponseArray', reponseArray);
            let intRecID = scriptObj.getParameter({ name: "custscript_fixbid_data" });
            let recordIds = lib.createErrorRec(reponseArray, intRecID, "10");//Fix Bid 
            log.debug({ title: "Failed Record Id's", details: recordIds });
            let updateResponse = record.submitFields({
                type: "customrecord_intgrtn_mstr_rcrd_dtls",
                id: intRecID,
                values: {
                    "custrecord_int_rspns_pyld": JSON.stringify(reponseArray)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug('updateResponse on the Custom record:', updateResponse);
        }
        catch(ex) 
        {
            log.error({title: "Summarize", details: ex});
        }
    };
    const createRecords = (projectJSON, taskId) => {
        let resArray = [];     
        try 
        {
            let scriptObj = runtime.getCurrentScript();
            let intRecordId = scriptObj.getParameter({name: "custscript_fixbid_data"});
            //search project exists or not, if exists then load
            let projectSearch = search.create({
                type: record.Type.JOB,
                filters:[
                    ["entityid", "is", projectJSON.entityid], "AND",
                    ["isinactive", "is", "F"]
                ],
                columns:[]
            });
            let projectSearchResult = projectSearch.run().getRange({ start: 0, end: 1 });
            if(projectSearchResult.length > 0) 
            {
                projectId = projectSearchResult[0].id;
                projectRec = record.load({type: 'job', id: projectId, isDynamic: true });
            } 
            else
            {
                resArray.push({name: 'Entity ID not found', message: 'Project not found with the given entity id '+projectJSON.entityid});
            }
            log.debug('Project Record ID', projectId);
            if(projectId) 
            {
                let projectStartDate = projectRec.getText('startdate');
                let projectEndDate = projectRec.getText('custentity_clb_projct_end_dte');
                let newEndDate = projectJSON.custentity_clb_projct_end_dte;
                if(newEndDate)
                {
                    if(projectEndDate !== newEndDate)
                    {
                        projectRec.setValue({fieldId: "custentity_clb_projct_end_dte", value: new Date(newEndDate)});
                    }
                }
                /* Read project resource from JSON payload */
                let projectResourceArray = projectJSON.projectresource;
                // loop through subcon array and create custom record by setting the values
                for(let g in projectResourceArray) 
                {
                    // check employee if exist and update checkbox of isjobresource and return employee id.
                    let empInternalId = getEmployeeInternalId((projectResourceArray[g].resource).slice(1));
                    log.debug('empInternalId', empInternalId);
                    if(!empInternalId)
                    {
                        // create employee record if doesn't exist.
                        empInternalId = createEmployee(projectResourceArray[g].empdetails, projectResourceArray[g].resource);
                    }
                    //Creating resource allocation record
                    var resourceId = createRARecord(projectResourceArray[g], projectId, empInternalId);
                    log.debug('resourceId', resourceId);  

                    // get the vendor id.
                    let vendor_id = "";
                    if(projectResourceArray[g].hasOwnProperty("vendorDetails") && projectResourceArray[g].vendorDetails.custrecord_clb_vendor)
                    {
                        vendor_id = getVendorInternalId(projectResourceArray[g].vendorDetails.custrecord_clb_vendor);
                    }


                    let taskArray = projectResourceArray[g].taskdetails;
                    if(resourceId)
                    {
                        // create custom record of pay bill rate
                        createPayBillRate(taskArray, empInternalId, projectResourceArray[g].resource_wf_task_id, projectId);                 
                        if(vendor_id)
                        {
                            //create custom vendor record.
                            var vendorId = createVendorDetails(projectResourceArray[g].vendorDetails, projectId, empInternalId, vendor_id, projectResourceArray[g].resource_wf_task_id);
                            log.debug('vendorId', vendorId);

                            createAPDeductionDetails(empInternalId,projectResourceArray[g].resource_wf_task_id, projectId, vendorId,empInternalId,projectResourceArray[g].empdetails.subsidiary)
                        }


                    }
                }                
                projectRec.setValue({fieldId: "custentity_integration_record_ref", value: intRecordId});
                let updatedProjectId = projectRec.save({ignoreMandatoryFields: true, enableSourcing: true});
                log.debug({title: "updatedProjectId", details: updatedProjectId});      
                if(projectResourceArray.hasOwnProperty("vendorDetails") && resourceId && vendorId) 
                {
                    return {'status': 'SUCCESS', 'nsInternalId': projectId, "entityId": projectJSON.entityid, "taskId": taskId, 'errorCode': '', 'errorDetails': [], 'stack': ''};
                }
                else if(!projectResourceArray.hasOwnProperty("vendorDetails") && resourceId) 
                {
                    return {'status': 'SUCCESS', 'nsInternalId': projectId, "entityId": projectJSON.entityid, "taskId": taskId, 'errorCode': '', 'errorDetails': [], 'stack': ''};
                }
                else 
                {
                    return {'status': 'Failed', 'nsInternalId': projectId, "entityId": projectJSON.entityid, "taskId": taskId, 'errorCode': '', 'errorDetails': resArray, 'stack': ''};
                }
            }
            else 
            {
                return {'status': 'Failed', 'nsInternalId': projectId, "entityId": projectJSON.entityid, "taskId": taskId, 'errorCode': '', 'errorDetails': resArray, 'stack': ''};
            }
        } 
        catch(error) 
        {
            log.debug("Create Dependent Records", error);
            resArray.push({name: "SCRIPT ERROR", message: error.message})
            return {'status': 'ERROR', 'nsInternalId': '', "entityId": projectJSON.entityid, "taskId": taskId, 'errorCode': error.name, 'errorDetails': resArray, 'stack': ''};
        }
    };
    const validateData = (projectJSON) =>{
        let resArray = [];     
        try 
        {
            //search project exists or not, if exists then load
            let projectSearch = search.create({
                type: record.Type.JOB,
                filters:[
                    ["entityid", "is", projectJSON.entityid], "AND",
                    ["isinactive", "is", "F"]
                ],
                columns:[
                    { name: "internalid", label: "Internal ID" }
                ]
            });
            let projectSearchResult = projectSearch.run().getRange({ start: 0, end: 1 });
            if(projectSearchResult.length > 0) 
            {
                projectId = projectSearchResult[0].getValue({name: "internalid"});
                projectRec = record.load({type: 'job', id: projectId, isDynamic: true});
            } 
            else
            {
                resArray.push({name: 'Entity ID not found', message: 'Project not found with the given entity id'});
            }
            if(!projectJSON.entityid.startsWith('F')) 
            {
                resArray.push({name: 'Entity ID is not a Fix Bid Entity ID', message: 'Project Job id is not a Fixed Bid Project ID, please verify the ID and try again.'});
            }
            log.debug('Project Record ID', projectId);
            if(projectId) 
            {
                let projectResourceArray = projectJSON.projectresource;
                if(!Array.isArray(projectResourceArray)) 
                {
                    resArray.push({name: "MISSING ARGUMENTS", message: "The Project Resource Details [projectresource] is either missing or has unacceptable values. It must be an array consisting all the details of the resource. Please verify the payload and try again."});
                }
                projectResourceArray.forEach(function (employeeData) {
                    if(typeof employeeData.resource !== 'string' && employeeData.resource === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS",
                            message: "Employee ID is missing in the payload. Please verify the payload and try again.",

                        });
                    }
                    /* if(employeeData.hasOwnProperty("vendorDetails"))
                    {
                        if(employeeData.vendorDetails.custrecord_clb_subcon !== true && employeeData.vendorDetails.custrecord_clb_subcon !== false) 
                        {
                            resArray.push({name: "MISSING ARGUMENTS",message: "The Subcon Flag [custrecord_clb_subcon] for the Resource "+employeeData.resource+" is either missing or has unacceptable values. Acceptable Values for custrecord_clb_subcon are Boolean values [true/false]. Please verify the payload and try again."});
                        }
                        if(employeeData.resource.startsWith('G') && employeeData.vendorDetails.custrecord_clb_subcon === true) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Vendor is mentioned as true for the Resource "+employeeData.resource+". W2 employees cannot have a vendor. Please verify the payload and try again."});
                        }
                        if(!employeeData.resource.startsWith('G') && employeeData.vendorDetails.custrecord_clb_subcon === false) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Subcon is mentioned as false for the Resource "+employeeData.resource+". Subcon employees must have a vendor. Please verify the payload and try again."});
                        }
                    } */
                    if(typeof employeeData.resource_wf_task_id !== 'string' && employeeData.resource_wf_task_id === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Workflow Task ID [resource_wf_task_id] is either missing or has unacceptable values in the payload for the Resource "+employeeData.resource+". Workflow Task ID must be mentioned and be in String format. Please verify the payload and try again."});
                    }
                    //resourse start Aad and date validation
                    if(typeof employeeData.resourcestartdate !== 'string' && employeeData.resourcestartdate === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Resource Start Date ["+employeeData.resourcestartdate+"] for the Resource "+employeeData.resource+" either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                    }
                    if(!validateDate(employeeData.resourcestartdate)) 
                    {
                        resArray.push({name: "INVALID ARGUMENTS", message: "Resource Start Date ["+employeeData.resourcestartdate+"] for the Resource "+employeeData.resource+" is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."});
                    }
                    if(typeof employeeData.resourceenddate !== 'string' && employeeData.resourceenddate === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Resource End Date ["+employeeData.resourceenddate+"] for the Resource "+employeeData.resource+" either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                    }
                    if(!validateDate(employeeData.resourceenddate)) 
                    {
                        resArray.push({name: "INVALID ARGUMENTS", message: "Resource End Date ["+employeeData.resourceenddate+"] for the Resource "+employeeData.resource+" is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."});
                    }
                    /* if(new Date(employeeData.resourcestartdate) > new Date(employeeData.resourceenddate)) 
                    {
                        resArray.push({name: "INVALID ARGUMENTS", message: "Resource Start Date ["+employeeData.resourcestartdate+"] for the Resource "+employeeData.resource+" is after the Resource End Date ["+employeeData.resourceenddate+"]. Please verify the payload and try again."});
                    } */
                    if(typeof employeeData.custevent_clb_circles !== 'string') 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Circle [custevent_clb_circles] for the Resource "+employeeData.resource+" is either missing or has unacceptable values. It should be in String format and must be at least mentioned as '' while creating / updating a Project Resource's data. Please verify the payload and try again."});
                    }
                    if(typeof employeeData.custevent_clb_resourcebillingtype !== 'string' && employeeData.custevent_clb_resourcebillingtype === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Resource Billing Type [custevent_clb_resourcebillingtype] for the Resource "+employeeData.resource+" is either missing or has unacceptable values. Resource Billing Type must be mentioned and be in String format. Please verify the payload and try again."});
                    }
                    if(typeof employeeData.custevent_clb_businesstype !== 'string' && employeeData.custevent_clb_businesstype === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Business Type [custevent_clb_businesstype] for the Resource "+employeeData.resource+" is either missing or has unacceptable values. Business Type must be mentioned and be in String format. Please verify the payload and try again."});
                    }
                    if(typeof employeeData.custevent_clb_resource_location !== 'string' && employeeData.custevent_clb_resource_location === "") 
                    {
                        resArray.push({name: "MISSING ARGUMENTS", message: "Resource Location [custevent_clb_resource_location] for the Resource "+employeeData.resource+" is either missing or has unacceptable values. Resource Location must be mentioned and be in String format. Please verify the payload and try again."});
                    }
                    let dummyResourceAllocationRecord = record.create({ type: record.Type.RESOURCE_ALLOCATION, isDynamic: true });
                    if(employeeData.custevent_clb_circles) 
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_circles', employeeData.custevent_clb_circles.trim())) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Circle ["+employeeData.custevent_clb_circles+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }
                    if(employeeData.custevent_clb_resourcebillingtype) 
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_resourcebillingtype', employeeData.custevent_clb_resourcebillingtype)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Resource Billing Type ["+employeeData.custevent_clb_resourcebillingtype+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }
                    if(employeeData.custevent_clb_engineering_pm) 
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_engineering_pm', employeeData.custevent_clb_engineering_pm)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Engineering PM ["+employeeData.custevent_clb_engineering_pm+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }
                    if(employeeData.custevent_clb_te_emp_type) 
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_te_emp_type', employeeData.custevent_clb_te_emp_type)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Employee Type ["+employeeData.custevent_clb_te_emp_type+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }
                    if(employeeData.custevent_asc_payrollgroup) 
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_asc_payrollgroup', employeeData.custevent_asc_payrollgroup)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Payroll Group ["+employeeData.custevent_asc_payrollgroup+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }
                    if(employeeData.custevent_clb_businesstype)
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_businesstype', employeeData.custevent_clb_businesstype)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Business Type ["+employeeData.custevent_clb_businesstype+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }
                    if(employeeData.custevent_clb_resource_location)
                    {
                        if(!getSelectValueInternalId(dummyResourceAllocationRecord, 'bodyLevelField', 'custevent_clb_resource_location', employeeData.custevent_clb_resource_location)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Resource Location ["+employeeData.custevent_clb_resource_location+"] mentioned for the Resource "+employeeData.resource+" is invalid. Please verify the payload and try again."});
                        }
                    }  
                    if(employeeData.hasOwnProperty("vendorDetails"))
                    {
                        if(typeof employeeData.vendorDetails.custrecord_clb_newapbased !== 'string' && employeeData.vendorDetails.custrecord_clb_newapbased === "") 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "AP Based [vendorDetails.custrecord_clb_newapbased] for the Resource "+employeeData.resource+" is either missing or has unacceptable values while Subcon value [custrecord_clb_subcon] is set as true. Please verify the payload and try again."});
                        }                       
                        if(typeof employeeData.vendorDetails.custrecord_clb_vendor !== "string" & employeeData.vendorDetails.custrecord_clb_vendor === "") 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "Vendor for the Resource "+employeeData.resource+" is either missing or has unacceptable values while Subcon value [custrecord_clb_subcon] is set as true. It should be in String format. Please verify the payload and try again."});
                        }
                       /*  let vendorInternalIdForValidation = getVendorInternalId(employeeData.vendorDetails.custrecord_clb_vendor);
                        if(!vendorInternalIdForValidation) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "The vendor ["+employeeData.vendorDetails.custrecord_clb_vendor+"] mentioned for the Resource "+employeeData.resource+" is either inactive or does not exist in system. Please verify the payload and try again."});
                        } */
                        if(typeof employeeData.vendorDetails.custrecord_clb_originalstartdate !== 'string' && employeeData.vendorDetails.custrecord_clb_originalstartdate === "") 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "Vendor Start Date [vendorDetails.custrecord_clb_originalstartdate] for the Resource "+employeeData.resource+" either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                        }
                        if(!validateDate(employeeData.vendorDetails.custrecord_clb_originalstartdate)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Vendor Start Date ["+employeeData.vendorDetails.custrecord_clb_originalstartdate+"] for the Resource "+employeeData.resource+" is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."});
                        }
                        if(typeof employeeData.vendorDetails.custrecord_clb_originalenddate !== 'string' & employeeData.vendorDetails.custrecord_clb_originalenddate === "") 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "Vendor End Date [vendorDetails.custrecord_clb_originalenddate] for the Resource "+employeeData.resource+" either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                        }
                        if(!validateDate(employeeData.vendorDetails.custrecord_clb_originalenddate))
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Vendor End Date ["+employeeData.vendorDetails.custrecord_clb_originalenddate+"] for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."});
                        }
                        if(employeeData.vendorDetails.custrecord_clb_originalstartdate && employeeData.custrecord_clb_terminationdate && isLessThanStartDate(employeeData.custrecord_clb_terminationdate, employeeData.vendorDetails.custrecord_clb_originalstartdate)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Termination Date ["+employeeData.custrecord_clb_terminationdate+"] for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is before the Start date ["+employeeData.vendorDetails.custrecord_clb_originalstartdate+"], incorrectly specified in the payload. Please make sure you enter valid dates."});
                        }
                        if(new Date(employeeData.vendorDetails.custrecord_clb_originalstartdate) > new Date(employeeData.vendorDetails.custrecord_clb_originalenddate)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Vendor Start Date ["+employeeData.vendorDetails.custrecord_clb_originalstartdate+"] for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is after the Vendor End Date ["+employeeData.vendorDetails.custrecord_clb_originalenddate+"]. Please verify the payload and try again."});
                        }
                        if(typeof employeeData.vendorDetails.custrecord_clb_subcon_achfees !== 'string') 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "ACH Fees for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" has unacceptable values. It should be in String format and must be at least mentioned as '' while creating / updating a Resource Vendor Detail. Please verify the payload and try again."});
                        }
                        if(employeeData.vendorDetails.custrecord_clb_subcon_achfees !== "") 
                        {
                            if (!isValidNumber(employeeData.vendorDetails.custrecord_clb_subcon_achfees)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "ACH Fees ["+employeeData.vendorDetails.custrecord_clb_subcon_achfees+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                            }
                            checkIfValidPercentage(employeeData.vendorDetails.custrecord_clb_subcon_achfees, 'ACH Fees', 100, "Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor);
                        }
                        if(typeof employeeData.vendorDetails.custrecord_clb_subcon_placefees !== 'string') 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "PLACE Fees for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" has unacceptable values. It should be in String format and must be at least mentioned as '' while creating / updating a Resource Vendor Detail. Please verify the payload and try again."});
                        }
                        if(employeeData.vendorDetails.custrecord_clb_subcon_placefees !== "") 
                        {
                            if(!isValidNumber(employeeData.vendorDetails.custrecord_clb_subcon_placefees)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "PLACE Fees ["+employeeData.vendorDetails.custrecord_clb_subcon_placefees+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                            }
                            checkIfValidPercentage(employeeData.vendorDetails.custrecord_clb_subcon_placefees, 'PLACE Fees', 100, "Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor);
                        }
                        if(typeof employeeData.vendorDetails.custrecord_clb_subcon_insurancecharges !== 'string') 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "Insurance Charges for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" has unacceptable values. It should be in String format and must be at least mentioned as '' while creating / updating a Resource Vendor Detail. Please verify the payload and try again."});
                        }
                        if(employeeData.vendorDetails.custrecord_clb_subcon_insurancecharges !== "") 
                        {
                            if(!isValidNumber(employeeData.vendorDetails.custrecord_clb_subcon_insurancecharges)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "Insurance Charges ["+employeeData.vendorDetails.custrecord_clb_subcon_insurancecharges+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                            }
                            checkIfValidPercentage(employeeData.vendorDetails.custrecord_clb_subcon_insurancecharges, 'Insurance Charges', 100, "Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor);
                        }
                        if(typeof employeeData.vendorDetails.custrecord_clb_withhotax !== 'string') 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "California Witholding Tax for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" has unacceptable values. It should be in String format and must be at least mentioned as '' while creating / updating a Resource Vendor Detail. Please verify the payload and try again."});
                        }
                        if(employeeData.vendorDetails.custrecord_clb_withhotax !== "") 
                        {
                            if(!isValidNumber(employeeData.vendorDetails.custrecord_clb_withhotax)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "California Witholding Tax ["+employeeData.vendorDetails.custrecord_clb_withhotax+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                            }
                            checkIfValidPercentage(employeeData.vendorDetails.custrecord_clb_withhotax, 'California Witholding Tax', 100, "Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor);
                        }
                        /* Validating Dropdown Values of Resource Vendor Details */
                        if(typeof employeeData.vendorDetails.custrecord_clb_paymode !== "string" && employeeData.vendorDetails.custrecord_clb_paymode === "") 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "Payment Mode of the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is missing in the payload. Please verify the payload and try again."});
                        }
                        if(typeof employeeData.vendorDetails.custrecord_clb_subcon_terms !== "string" && employeeData.vendorDetails.custrecord_clb_subcon_terms === "") 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "Terms of the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is missing in the payload. Please verify the payload and try again."});
                        }
                        let dummyVendorRecord = record.create({ type: 'customrecord_clb_subconvendor', isDynamic: true });
                        if(employeeData.vendorDetails.custrecord_clb_newapbased) 
                        {
                            if(!getSelectValueInternalId(dummyVendorRecord, 'bodyLevelField', 'custrecord_clb_newapbased', employeeData.vendorDetails.custrecord_clb_newapbased)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "AP Based ["+employeeData.vendorDetails.custrecord_clb_newapbased+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                            }
                        }
                        if(!getSelectValueInternalId(dummyVendorRecord, 'bodyLevelField', 'custrecord_clb_paymode', employeeData.vendorDetails.custrecord_clb_paymode)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Payment Mode ["+employeeData.vendorDetails.custrecord_clb_paymode+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                        }
                        if(!getSelectValueInternalId(dummyVendorRecord, 'bodyLevelField', 'custrecord_clb_subcon_terms', employeeData.vendorDetails.custrecord_clb_subcon_terms)) 
                        {
                            resArray.push({name: "INVALID ARGUMENTS", message: "Terms ["+employeeData.vendorDetails.custrecord_clb_subcon_terms+"] mentioned for the Resource "+employeeData.resource+" from the Vendor "+employeeData.vendorDetails.custrecord_clb_vendor+" is invalid. Please verify the payload and try again."});
                        }
                    }  
                    if(employeeData.taskdetails) 
                    {
                        if(!Array.isArray(employeeData.taskdetails)) 
                        {
                            resArray.push({name: "MISSING ARGUMENTS", message: "The Task Details [taskdetails] of Resource "+employeeData.resource+" is either missing or has unacceptable values. It must be an array of Task Details for the resource. Please verify the payload and try again."});
                        }
                        employeeData.taskdetails.forEach(function (taskDetail) {
                            if(typeof taskDetail.custrecord_clb_tastype !== 'string' || taskDetail.custrecord_clb_tastype === "") 
                            {
                                resArray.push({name: "MISSING ARGUMENTS", message: "Task Type of Resource "+employeeData.resource+" is missing in the payload. Acceptable Task Types are 'ST', 'OT' and 'DT'. Please verify the payload and try again."});
                            }
                            if(taskDetail.custrecord_clb_billrate === "") 
                            {
                                resArray.push({name: "MISSING ARGUMENTS", message: "Bill Rate for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                            }
                            if(!isValidNumber(taskDetail.custrecord_clb_billrate)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "Bill Rate ["+taskDetail.custrecord_clb_billrate+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. Please verify the payload and try again."});
                            }
                            checkNumberOfDigits(taskDetail.custrecord_clb_billrate, 'Bill Rate', 15, "Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype);                           
                            if(typeof taskDetail.custrecord_clb_payrate !== 'string' || taskDetail.custrecord_clb_payrate === "") 
                            {
                                resArray.push({name: "MISSING ARGUMENTS", message: "Pay Rate for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                            }
                            if(!isValidNumber(taskDetail.custrecord_clb_payrate)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "Pay Rate ["+taskDetail.custrecord_clb_payrate+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. Please verify the payload and try again."});
                            }
                            checkNumberOfDigits(taskDetail.custrecord_clb_payrate, 'Pay Rate', 15, "Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype);    
                            if(taskDetail.custrecord_clb_intercopayrate) 
                            {
                                if(typeof taskDetail.custrecord_clb_intercopayrate !== 'string') 
                                {
                                    resArray.push({name: "INVALID ARGUMENTS", message: "Intercompany Pay Rate ["+taskDetail.custrecord_clb_intercopayrate+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. It should be in String format. Please verify the payload and try again."    });
                                }
                                if(!isValidNumber(taskDetail.custrecord_clb_intercopayrate)) 
                                {
                                    resArray.push({name: "INVALID ARGUMENTS", message: "Intercompany Pay Rate ["+taskDetail.custrecord_clb_intercopayrate+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. Please verify the payload and try again."    });
                                }
                                checkNumberOfDigits(taskDetail.custrecord_clb_intercopayrate, 'Intercompany Pay Rate', 15, "Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype);
                            }
                            if(taskDetail.custrecord_clb_inrequivalentrate) 
                            {
                                if(typeof taskDetail.custrecord_clb_inrequivalentrate !== 'string') 
                                {
                                    resArray.push({name: "INVALID ARGUMENTS", message: "INR Equivalent Rate ["+taskDetail.custrecord_clb_inrequivalentrate+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. It should be in String format. Please verify the payload and try again."    });
                                }
                                if(!isValidNumber(taskDetail.custrecord_clb_inrequivalentrate)) 
                                {
                                    resArray.push({name: "INVALID ARGUMENTS", message: "INR Equivalent Rate ["+taskDetail.custrecord_clb_inrequivalentrate+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. Please verify the payload and try again."    });
                                }
                                checkNumberOfDigits(taskDetail.custrecord_clb_inrequivalentrate, 'INR Equivalent Rate', 15, "Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype);
                            }
                            if(taskDetail.custrecord_clb_inrmonthlyamount) 
                            {
                                if(typeof taskDetail.custrecord_clb_inrmonthlyamount !== 'string') 
                                {
                                    resArray.push({name: "INVALID ARGUMENTS", message: "INR Monthly Amount ["+taskDetail.custrecord_clb_inrmonthlyamount+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. It should be in String format. Please verify the payload and try again."    });
                                }
                                if(!isValidNumber(taskDetail.custrecord_clb_inrmonthlyamount)) 
                                {
                                    resArray.push({name: "INVALID ARGUMENTS", message: "INR Monthly Amount ["+taskDetail.custrecord_clb_inrmonthlyamount+"] mentioned for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is invalid. Please verify the payload and try again."    });
                                }
                                checkNumberOfDigits(taskDetail.custrecord_clb_inrmonthlyamount, 'INR Monthly Amount', 15, "Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype);
                            }
                            if(typeof taskDetail.custrecord_clb_eff_date !== 'string' || taskDetail.custrecord_clb_eff_date === "") 
                            {
                                resArray.push({name: "MISSING ARGUMENTS", message: "Start Date for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is either missing or has unacceptable values. It should be in String format. Please verify the payload and try again."});
                            }
                            if(!validateDate(taskDetail.custrecord_clb_eff_date)) 
                            {
                                resArray.push({name: "INVALID ARGUMENTS", message: "Start Date ["+taskDetail.custrecord_clb_eff_date+"] for the Resource "+employeeData.resource+" for the task "+taskDetail.custrecord_clb_tastype+" is incorrectly specified in the payload. Please ensure you enter a valid date in MM/DD/YYYY format."    
                                });
                            }
                        });
                    }
                });
            }
            log.debug('resArray', resArray);
            return resArray;
        } 
        catch(ex) 
        {
            log.error({ title: "Validate Data", details: ex });
        }
    };
    let createRARecord = (projectResourceDetail, projectId, resourceInternalId) => {
        try 
        {
            log.debug('projectResourceDetail', projectResourceDetail);
            let recordObj;
            let searchObj = search.create({
                type: record.Type.RESOURCE_ALLOCATION,
                filters: [
                    ["project", "anyof", projectId], "AND",
                    ["resource", "anyof", resourceInternalId], "AND",
                    ["custevent_clb_prjct_workl_tsk_id", "is", projectResourceDetail.resource_wf_task_id]
                ],
                columns:[]
            });
            let searchRes = searchObj.run().getRange({ start: 0, end: 1 });
            if(searchRes.length > 0) 
            {                
                let internalId = searchRes[0].id;
                log.debug('Found Resource Allocation to Update', 'Internal ID: ' + internalId);
                recordObj = record.load({ type: 'resourceallocation', id: internalId, isDynamic: true });
            }
            else 
            {
                recordObj = record.create({ type: 'resourceallocation', isDynamic: true });
                recordObj.setValue('allocationamount', '100');
                recordObj.setValue('allocationunit', 'P');
            }
            if(projectResourceDetail.custevent_isoffboarded === true)
            {
                recordObj.setValue({fieldId: "custevent_isoffboarded", value: projectResourceDetail.custevent_isoffboarded});
                recordObj.setValue({fieldId: "enddate", value:  new Date(projectResourceDetail.offboardingDate)});  
            }    
            if(projectResourceDetail.allocationtype)           
                recordObj.setText('allocationtype', projectResourceDetail.allocationtype);

            if(projectResourceDetail.custevent_actual_startdate)
            {
                recordObj.setValue('custevent_actual_startdate', new Date(projectResourceDetail.custevent_actual_startdate));
            }
            if(projectResourceDetail.custevent_resource_allocation_status)
            {
                let raStatusObj = getAllocationStatus(projectResourceDetail.custevent_resource_allocation_status);
                if(raStatusObj)
                    recordObj.setText({fieldId: "custevent_resource_allocation_status", text: raStatusObj.text});
    
                if(projectResourceDetail.custevent_resource_allocation_status === "Abandoned")
                {
                    recordObj.setValue({fieldId: "custevent_isoffboarded", value: true}); 
                    //closeProject(projectId);               
                }
            }
            recordObj.setValue('project', projectId);
            recordObj.setValue('allocationresource', resourceInternalId);
            recordObj.setValue('startdate', format.parse({ value: projectResourceDetail.resourcestartdate, type: format.Type.DATE }));
            recordObj.setValue('enddate', format.parse({ value: projectResourceDetail.resourceenddate, type: format.Type.DATE }));
            recordObj.setValue('custevent_clb_prjct_workl_tsk_id', projectResourceDetail.resource_wf_task_id);
            if(projectResourceDetail.custevent_clb_circles)
                recordObj.setText('custevent_clb_circles', capitalize(projectResourceDetail.custevent_clb_circles.trim()));

            //log.debug('Resource Billing Type',capitalize(projectResourceDetail.custevent_clb_resourcebillingtype));
            if(projectResourceDetail.custevent_clb_resourcebillingtype)
                recordObj.setText('custevent_clb_resourcebillingtype', capitalize(projectResourceDetail.custevent_clb_resourcebillingtype.trim()));

            if(projectResourceDetail.custevent_clb_businesstype)
                recordObj.setText('custevent_clb_businesstype', capitalize(projectResourceDetail.custevent_clb_businesstype.trim()));

            if(projectResourceDetail.custevent_clb_resource_location)
                recordObj.setText('custevent_clb_resource_location', capitalize(projectResourceDetail.custevent_clb_resource_location.trim()));

            if(projectResourceDetail.custevent_asc_payrollgroup) 
                recordObj.setText('custevent_asc_payrollgroup', capitalize(projectResourceDetail.custevent_asc_payrollgroup.trim()));
                
            if(projectResourceDetail.custevent_clb_te_emp_type) 
                recordObj.setText('custevent_clb_te_emp_type', projectResourceDetail.custevent_clb_te_emp_type);

            if(projectResourceDetail.custevent_clb_engineering_pm) 
                recordObj.setText('custevent_clb_engineering_pm', projectResourceDetail.custevent_clb_engineering_pm.trim());

            let resourceAllocationId = recordObj.save({ignoreMandatoryFields: true, enableSourcing: true});
            log.debug('Created / Updated Resource Allocation Record: ', 'Internal ID : ' + resourceAllocationId);
            return resourceAllocationId;
        } 
        catch(error) 
        {
            log.debug({title: "Create Resource Allocaton", details: error});
        }
    };
    let createPayBillRate = (taskArray, empInternalId, taskId, projectId) =>{
        try 
        {
            if(taskArray) 
            {
                for(let i in taskArray) 
                {
                    let exPayRateRecId = getExPayRateRec(projectId, getTaskType(taskArray[i].custrecord_clb_tastype), taskArray[i].custrecord_clb_eff_date, empInternalId);
                    log.debug({title: "exPayRateRecId", details: exPayRateRecId});
                    if(exPayRateRecId)
                    {
                        let payRateObj = record.load({type: "customrecord_clb_subcontask", id: exPayRateRecId, isDynamic: true});
                        payRateObj.setValue({fieldId: "custrecord_clb_payrate", value: taskArray[i].custrecord_clb_payrate});
                        let payRateRecId = payRateObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                        log.debug({title: "payRateRecId", details: payRateRecId});
                    }
                    else
                    {
                        if(Number(taskArray[i].custrecord_clb_payrate) > 0)
                        {
                            let payRateObj = record.create({type: 'customrecord_clb_subcontask', isDynamic: true});
                            payRateObj.setValue('custrecord_clb_proj', projectId);
                            payRateObj.setValue('custrecord_clb_payrate', taskArray[i].custrecord_clb_payrate);
                            payRateObj.setValue('custrecord_clb_intercopayrate', taskArray[i].custrecord_clb_intercopayrate);
                            payRateObj.setValue('custrecord_clb_inrequivalentrate', taskArray[i].custrecord_clb_inrequivalentrate);
                            payRateObj.setValue('custrecord_clb_inrmonthlyamount', taskArray[i].custrecord_clb_inrmonthlyamount);
                            payRateObj.setValue('custrecord_clb_subcontaskrecord', empInternalId);    
                            payRateObj.setValue('custrecord_clb_start_date', format.parse({ value: taskArray[i].custrecord_clb_eff_date, type: format.Type.DATE }));
                            payRateObj.setValue('custrecord_workflow_task_id', taskId);
                            payRateObj.setValue('custrecord_clb_title', taskArray[i].custrecord_clb_tastype);
                            payRateObj.setValue('custrecord_clb_tastype', getTaskType(taskArray[i].custrecord_clb_tastype));
                            let payRateId = payRateObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                            log.debug('payRateId', payRateId);
                        }
                    }
                   
                    let exBillRateRecId = getExBillRateRec(projectId, getTaskType(taskArray[i].custrecord_clb_tastype), taskArray[i].custrecord_clb_eff_date, empInternalId);
                    log.debug({title: "exBillRateRecId", details: exBillRateRecId});
                    if(exBillRateRecId)
                    {
                        let billRateRecObj = record.load({type: "customrecord_clb_subconbillrate", id: exBillRateRecId, isDynamic: true});
                        billRateRecObj.setValue({fieldId: "custrecord_clb_billrate", value:  taskArray[i].custrecord_clb_billrate});    
                        let billRateRecId = billRateRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                        log.debug({title: "billRateRecId", details: billRateRecId});
                    }
                    else
                    {
                        if(Number(taskArray[i].custrecord_clb_billrate) > 0)
                        {
                            //creating bill rate
                            billRateObj = record.create({type: 'customrecord_clb_subconbillrate', isDynamic: true});
                            billRateObj.setValue('custrecord_clb_proj_bill', projectId);
                            billRateObj.setValue('custrecord_clb_subconbillrecord', empInternalId);
                            billRateObj.setValue('custrecord_clb_billrate', taskArray[i].custrecord_clb_billrate);
                            billRateObj.setValue('custrecord_clb_eff_date', format.parse({ value: taskArray[i].custrecord_clb_eff_date, type: format.Type.DATE }));
                            billRateObj.setValue('custrecord_workflow_task_id_bill', taskId);
                            billRateObj.setValue('custrecord_clb_title_bill', taskArray[i].custrecord_clb_tastype);
                            billRateObj.setValue('custrecord_clb_tastype_bill',  getTaskType(taskArray[i].custrecord_clb_tastype));
                            let billRateId = billRateObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                            log.debug('billRateId', billRateId);
                        }
                    }
                }
            }
        } 
        catch(ex) 
        {
            log.debug({title: "Create Pay/Bill Rate Records", details: ex});
        }
    };
    let createVendorDetails = (projectResourceVendorDetail, projectId, resourceInternalId, vendorId, taskId) => {
        try 
        {
            log.debug('projectResourceVendorDetail', projectResourceVendorDetail);
            let vendorRecObj
            let searchObj = search.create({
                type: "customrecord_clb_subconvendor",
                filters: [
                    ["custrecord_clb_subcon_project", "anyof", projectId], "AND",
                    ["custrecord_clb_subconresource", "anyof", resourceInternalId], "AND",
                    ["custrecord_clb_workflowid", "is", taskId]
                ],
                columns: []
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1 });
            if(searchResult.length > 0) 
            {
                let internalId = searchResult[0].id;
                log.debug('Found Resource Vendor to Update', 'Internal ID: ' + internalId);
                vendorRecObj = record.load({type: 'customrecord_clb_subconvendor', id: internalId, isDynamic: true });
            }
            else 
            {
                vendorRecObj = record.create({type: 'customrecord_clb_subconvendor', isDynamic: true });
                vendorRecObj.setText('custrecord_clb_paymode', projectResourceVendorDetail.custrecord_clb_paymode);
            }
            vendorRecObj.setValue('custrecord_clb_subcon_project', projectId);
            vendorRecObj.setValue('custrecord_clb_subconresource', resourceInternalId);
            vendorRecObj.setValue('custrecord_clb_vendor', vendorId);
            vendorRecObj.setValue('custrecord_clb_originalstartdate', format.parse({ value: projectResourceVendorDetail.custrecord_clb_originalstartdate, type: format.Type.DATE }));
            vendorRecObj.setValue('custrecord_clb_originalenddate', format.parse({ value: projectResourceVendorDetail.custrecord_clb_originalenddate, type: format.Type.DATE }));
            if(projectResourceVendorDetail.custrecord_clb_terminationdate) 
            {
                vendorRecObj.setValue('custrecord_clb_terminationdate', format.parse({ value: projectResourceVendorDetail.custrecord_clb_terminationdate, type: format.Type.DATE }));
            }
            // vendorRecObj.setValue('custrecord_clb_subcon_achfees', projectResourceVendorDetail.custrecord_clb_subcon_achfees);
            // vendorRecObj.setValue('custrecord_clb_subcon_placefees', projectResourceVendorDetail.custrecord_clb_subcon_placefees);
            // vendorRecObj.setValue('custrecord_clb_subcon_insurancecharges', projectResourceVendorDetail.custrecord_clb_subcon_insurancecharges);
            vendorRecObj.setValue('custrecord_vendor_id', projectResourceVendorDetail.custrecord_vendor_id);
            // if(projectResourceVendorDetail.custrecord_clb_paymode)
            //     vendorRecObj.setText('custrecord_clb_paymode', projectResourceVendorDetail.custrecord_clb_paymode);

            if(projectResourceVendorDetail.custrecord_clb_subcon_terms)
                vendorRecObj.setText('custrecord_clb_subcon_terms', projectResourceVendorDetail.custrecord_clb_subcon_terms);

            if(projectResourceVendorDetail.custrecord_clb_newapbased)
                vendorRecObj.setText('custrecord_clb_newapbased', projectResourceVendorDetail.custrecord_clb_newapbased);

            vendorRecObj.setValue('custrecord_clb_withhotax', projectResourceVendorDetail.custrecord_clb_withhotax);
            vendorRecObj.setValue('custrecord_clb_subcon', projectResourceVendorDetail.custrecord_clb_subcon);
            vendorRecObj.setValue('custrecord_clb_workflowid', taskId);
            log.debug('Pay Status : On Hold Notes',projectResourceVendorDetail.custrecord_asc_subcon_paystatus+" : "+projectResourceVendorDetail.custrecord_asc_onhold_notes);
            
            if(projectResourceVendorDetail.custrecord_asc_subcon_paystatus)
                vendorRecObj.setText({fieldId: 'custrecord_asc_subcon_paystatus', text: projectResourceVendorDetail.custrecord_asc_subcon_paystatus});

            vendorRecObj.setValue('custrecord_asc_onhold_notes', projectResourceVendorDetail.custrecord_asc_onhold_notes);
            
            //vendorRecObj.setValue('custrecord_clb_workflowid', projectResourceVendorDetail.custrecord_clb_originalstartdate);
            var vendorId = vendorRecObj.save({ignoreMandatoryFields: true, enableSourcing: true});
            log.debug('Resource Vendor - Updated', vendorId);

            return vendorId;
        } 
        catch(error) 
        {
            log.debug("Error in Create Vendor", error);
        }
    };

    let createAPDeductionDetails = (wfTaskId, projectId, vendorId, empId, subsidiary)=>{
        let apDedcutoinDetailsRecord = record.create({
            type: 'customrecord_ap_deduction_details',
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_employee',
            value: empId
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_workflowtaskid',
            value: wfTaskId
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_project',
            value: projectId
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_vendor',
            value: vendorId
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_subsidiary',
            value: subsidiary
        });

        //
        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_currency',
            value: ''
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_deduction_type',
            value: ''
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_effective_date',
            value: ''
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_deduction_per',
            value: ''
        });

        apDedcutoinDetailsRecord.setValue({
            fieldId: 'custrecord_apd_deduction_amount',
            value: ''
        });

        apDedcutoinDetailsRecord =  apDedcutoinDetailsRecord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        return apDedcutoinDetailsRecord;
    };
    const getExPayRateRec = (projectId, taskType, effectiveDate, empInternalId) =>{
        try 
        {
            let payRateId = "";
            let searchObj = search.create({
                type: "customrecord_clb_subcontask",
                filters:[
                   ["custrecord_clb_proj", "anyof", projectId], "AND", 
                   ["custrecord_clb_tastype", "anyof",  taskType],  "AND", 
                   ["custrecord_clb_start_date", "on", effectiveDate], "AND",
                   ["custrecord_clb_subcontaskrecord", "anyof", empInternalId]
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
    const getExBillRateRec = (projectId, taskType, effectiveDate, empInternalId) =>{
        try 
        {
            let billRateId = "";
            let searchObj = search.create({
                type: "customrecord_clb_subconbillrate",
                filters: [
                    ["custrecord_clb_proj_bill", "anyof", projectId], "AND", 
                    ["custrecord_clb_tastype_bill", "anyof", taskType], "AND", 
                    ["custrecord_clb_eff_date", "on", effectiveDate], "AND",
                    ["custrecord_clb_subconbillrecord", "anyof", empInternalId]
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
    let getVendorInternalId = (vendor_id) =>{
        try 
        {
            let vendorSearchObj = search.create({
                type: "vendor",
                filters: [
                    ["custentity_clb_entityid", "is", vendor_id], "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: []
            }).run().getRange(0, 1);    
            if (!vendorSearchObj[0]) return false;
            return vendorSearchObj[0].id;            
        } 
        catch(ex) 
        {
            log.debug({title: "Get Vendor Internal Id", details: ex});
        }
    };
    let getEmployeeInternalId = (emp_id) =>{
        try 
        {            
            log.debug({title: "emp_id", details: emp_id});
            let employeeSearchObj = search.create({
                type: "employee",
                filters: [
                    ["custentity_clb_entityid", "contains", emp_id], "AND",
                    ["isinactive", "is", "F"]
                ],
                columns:[
                    {name: "isjobresource"}
                ]
            }).run().getRange({start: 0, end: 1});
            log.debug({title: "employeeSearchObj", details: employeeSearchObj});
            if(employeeSearchObj.length > 0)   
            {                
                let empId = employeeSearchObj[0].id;
                log.debug({title: "empId", details: empId});
                let isJobResource = employeeSearchObj[0].getValue({name: "isjobresource"});
                log.debug({title: "isJobResource", details: isJobResource});
                if(!isJobResource)
                {
                    let updatedEmp = record.submitFields({
                        type: "employee",
                        id: empId,
                        values: {
                            "isjobresource": true
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields : true
                        }
                    });
                    log.debug({title: "updatedEmp", details: updatedEmp});
                }
                return empId;
            }         
            else
                return "";
        } 
        catch(ex) 
        {
            log.debug({title: "Get Employee Internal Id", details: ex});
        }
    };
    let getSelectValueInternalId = (recordType, fieldType, fieldId, fieldValue, sublistId) => {
        try 
        {
            let dropdownField, selectedOptionInternalId, dropdownFieldOptions;
            if(fieldType === 'bodyLevelField') 
            {
                dropdownField = recordType.getField({ fieldId: fieldId });
            }
            else if (fieldType === 'lineLevelField') 
            {
                dropdownField = recordType.getCurrentSublistField({ fieldId: fieldId, sublistId: sublistId});
            }
            if (fieldId === 'subsidiary') 
            {
                dropdownFieldOptions = dropdownField.getSelectOptions({ filter: fieldValue, operator: 'contains' });
            }
            else 
            {
                dropdownFieldOptions = dropdownField.getSelectOptions({ filter: fieldValue, operator: 'is' });
            }
            if (dropdownFieldOptions.length > 0) 
            {
                selectedOptionInternalId = dropdownFieldOptions[0].value;
                let selectedOptionText = ((dropdownFieldOptions[0].text).trim()).replaceAll("&nbsp;", "");
                let incomingValueForSubsidiary = fieldValue.toLowerCase().trim();
                if (selectedOptionText.toLowerCase().trim() !== incomingValueForSubsidiary) 
                {
                    return true;
                }
            }
            else 
            {
                return false;
            }
            return selectedOptionInternalId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Select Value Internal Id", details: ex});    
        }
    };
    let searchResourceAllocation = (projectInternalId, resourceInternalId, workflowTaskId, uniqueId) => {
        let resourceallocationSearchObj = search.create({
            type: record.Type.RESOURCE_ALLOCATION,
            filters:
                [
                    ["project", "anyof", projectInternalId],
                    "AND",
                    ["resource", "anyof", resourceInternalId],
                    "AND",
                    ["custevent_clb_prjct_workl_tsk_id", "is", workflowTaskId],
                    "AND",
                    ["custevent_clb_resourc_dtls_tsk_id", "is", uniqueId]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        let searchResultCount = resourceallocationSearchObj.runPaged().count;
        return searchResultCount;
    };
    const createEmployee = (employeeData, empId) =>{
        try
        {
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
            if(employeeData.custentity_clb_vendorid != "") 
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
            if(employeeData.supervisor != "") 
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
            if(employeeData.class != "") 
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
            if(employeeData.department != "") 
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
            if(employeeData.location != "") 
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
            if(employeeData.issupportrep) empRecord.setValue({fieldId: 'issupportrep', value: employeeData.issupportrep == 1 ? true : false});
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
            if(employeeData.employeetype != "") 
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
            if(employeeData.customlist_clb_employeepaytype != "") 
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
                empRecord.setValue('custentity_clb_office_employee', employeeData.custentity_clb_office_employee == "1" ? true : false);
    
            empRecord.setValue('custentity_payrate_st', employeeData.custentity_payrate_st);             
            empRecord.setValue('custentity_payrate_ot', employeeData.custentity_payrate_ot);               
            empRecord.setValue('socialsecuritynumber', employeeData.socialsecuritynumber);                  
            if(employeeData.custentity_clb_effectivedate)
            {
                if(validateDate(employeeData.custentity_clb_effectivedate)) 
                {                                
                    empRecord.setValue('custentity_clb_effectivedate', new Date(employeeData.custentity_clb_effectivedate));
                }
            } 
            let empRecordId = empRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
            log.debug({title: "New Employee", details: empRecordId});
            return empRecordId;
        }
        catch(ex)
        {
            log.error({title: "Create New Employee", details: ex});
            return {'status': 'ERROR', 'nsInternalId': '', "entityId": "", "taskId": "", 'errorCode': ex.name, 'errorDetails': ex.message, 'stack': ''};
        }
    };
    const getSubsidiaryId = (subsidiaryName) =>{
        try 
        {
            let subsidiaryId = "";
            let searchObj = search.create({
                type: search.Type.SUBSIDIARY,
                filters: [
                    {name: "namenohierarchy", operator: search.Operator.IS, values: subsidiaryName}
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
            log.debug({title: "Get Subsidiary Id", details: ex});    
        }
    };
    let fieldInputTypeMatches = (fieldCategoryArray, fieldIdToMatch) => {
        return fieldCategoryArray.some(fieldCategoryElement => fieldCategoryElement === fieldIdToMatch);
    };
    let isValidNumber = (value) => {
        if (/^\d+$/.test(value)) {
            return true;
        } else {
            return /^\d+\.\d+$/.test(value);
        }
    };
    let checkNumberOfDigits = (fieldValue, fieldName, maxDigits, context) => {
        if (fieldValue.length > maxDigits) {
            throw {
                name: "INVALID ARGUMENTS",
                message: fieldName+" ["+fieldValue+"] mentioned for the "+context+" cannot have more than "+maxDigits+" digits. Please verify the payload and try again.",

            };
        }
    };
    let checkIfValidPercentage = (fieldValue, fieldName, maxPercentage, context) => {
        if (Number(fieldValue) > Number(maxPercentage) || Number(fieldValue) < 0) {
            throw {
                name: "INVALID ARGUMENTS",
                message: fieldName+" ["+fieldValue+"] mentioned for the "+context+" should be between 0 and "+maxPercentage+". Please verify the payload and try again.",

            };
        }
    };
    let validateDate = (dateValue) => {
        let selectedDate = dateValue;
        if (selectedDate == '')
            return false;

        let regExp = /^(\d{1,2})(\/|-)(\d{1,2})(\/|-)(\d{4})$/; //Declare Regex
        let dateArray = selectedDate.match(regExp); // is format OK?

        if (dateArray == null) {
            return false;
        }

        let month = dateArray[1];
        let day = dateArray[3];
        let year = dateArray[5];

        if (month < 1 || month > 12) {
            return false;
        } else if (day < 1 || day > 31) {
            return false;
        } else if ((month == 4 || month == 6 || month == 9 || month == 11) && day == 31) {
            return false;
        } else if (month == 2) {
            let isLeapYear = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
            if (day > 29 || (day == 29 && !isLeapYear)) {
                return false;
            }
        }
        return true;
    };
    const isLessThanStartDate = (termination_date, start_date) =>{
        var terminationDate = new Date(termination_date);
        var startDate = new Date(start_date);
        return terminationDate <= startDate;
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
    const getTaskType = (taskType) =>[{"ST": "1", "OT": "2", "DT": "3", "Fix-Bid": "4", "Sick Time": "5", "Holiday": "6"}][0][taskType];
    const capitalize = s => s && s[0].toUpperCase() + s.slice(1);
    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});