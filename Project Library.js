/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/record", "N/search","N/email"], (file, record, search,email) => {
    const createFile = (fileName, fileContents, folderId) =>{
        try
        {
            let payloadFile = file.create({
                fileType: "JSON",
                name: fileName,
                contents: JSON.stringify(fileContents, undefined, 4)
            });
            payloadFile.folder = folderId;
            let fileId = payloadFile.save();
            return fileId;
        } 
        catch(ex) 
        {
            log.error({title: "Create File", details: ex});
        }
    };
    const moveFile = (fileId, folderId) =>{
        try
        {
            if(!fileId)
                return;

            let payloadFile = file.load({id: fileId});
            payloadFile.folder = folderId;
            let newFileId = payloadFile.save();
            return newFileId;
        } 
        catch(ex) 
        {
            log.debug({title: "Create File", details: ex});
        }
    };
    /* const searchProject = (entityId, taskId) =>{
        try
        {
            if(!entityId)
                return "";

            let projectId = "";
            let projectSearch = search.create({
                type: search.Type.JOB,
                filters:[
                        [["entityid", "is", entityId] , "OR", ["custentity_clb_workflow_tsk_id", "is", taskId]], "AND",
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
    }; */
    const searchProject = (workflowTaskId) =>{
        try
        {
            let projectId = "";
            let searchObj = search.create({
                type: "resourceallocation",
                filters: [
                    ["custevent_clb_prjct_workl_tsk_id", "is", workflowTaskId]
                ],
                columns: [
                    {name: "company", sort: search.Sort.DESC}
                ]
             });
            let searchResult = searchObj.run().getRange({start: 0, end: 1});
            if(searchResult.length > 0) 
            {                
                projectId = searchResult[0].getValue({name: "company"});
            }
            return projectId;
        } 
        catch(ex) 
        {
            log.error({title: "Search Project", details: ex});
        }
    };    
    const getEntityId = (recordType, entityId) =>{
        try
        {
            if(!entityId)
                return "";

            //log.debug({title: "Entity ID : Record Type", details: entityId+ " : " +recordType});
            let internalId = "";
            let fieldId = recordType === "customer" ? "entityid" : "custentity_clb_entityid";
            let filters = [[fieldId, "is", entityId], "AND",["isinactive", "is", "F"]];
            if(recordType === "employee")
            {
                filters.push("AND", ["releasedate", "isempty", ""]);
            }
            let projectSearch = search.create({
                type: recordType,
                filters: filters,
                columns: []
            });
            let searchResult = projectSearch.run().getRange({start: 0, end: 1});
            //log.debug({title: "Entity "+recordType, details: searchResult});
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
    const createErrorRec = (responseObj, refRecordId, type) =>{
        try
        {            
            let recordIds = [];
            for(let i=0 ; i<responseObj.length ; i++)
            {
                //log.debug({title: "responseObj", details: responseObj[i].status});
                if((responseObj[i].status).toLowerCase() == "failed")
                {
                    let recordObj = record.create({type: "customrecord_clb_integration_failed_rec", isDynamic: true});
                    recordObj.setValue({fieldId: "custrecord_clb_rec_type", value: type});
                    recordObj.setValue({fieldId: "custrecord_clb_record_status", value: "1"});
                    recordObj.setValue({fieldId: "custrecord_clb_failed_reason", value: JSON.stringify(responseObj[i])});    
                    recordObj.setValue({fieldId: "custrecord_clb_master_record_ref", value: refRecordId}); 
                    let recordId = recordObj.save(); 
                    recordIds.push(recordId);
                }
            }
            return recordIds;
        }
        catch(ex)
        {
            log.error({title: "Create Error Record", details: ex});
        }
    };
    const getSelectValueId = (recordType, fieldType, fieldId, fieldValue, sublistId) => {
        try
        {
            let fieldObj = "", internalId = "", dropdownFieldOptions = "";
            //log.debug({title: "fieldId In function ", details: recordType+" : "+fieldType+" : "+fieldId+" : "+fieldValue});
            if(fieldType === "bodyLevelField") 
            {
                fieldObj = recordType.getField({fieldId: fieldId});
            }
            else if(fieldType === "lineLevelField") 
            {
                fieldObj = recordType.getCurrentSublistField({fieldId: fieldId, sublistId: sublistId});
            }
           //log.debug({title: "fieldObj", details: fieldObj});
            if(fieldId === "subsidiary" || fieldId === "account") 
            {
                dropdownFieldOptions = fieldObj.getSelectOptions({filter: fieldValue, operator: "contains"});
                //log.debug({title: "Field ID : Internal ID", details: fieldId + " : " + dropdownFieldOptions});
            }
            else 
            {
                dropdownFieldOptions = fieldObj.getSelectOptions({filter: fieldValue, operator: "is"});
            }
            if(dropdownFieldOptions.length > 0) 
            {
                internalId = dropdownFieldOptions[0].value;               
            }
            return internalId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Select Value Internal Id", details: ex});
        }        
    };
    const getServiceItem = (taskType) =>{
        try 
        {
            if(!taskType)
                return "";

            log.debug({title: "Service Item taskType", details: taskType});
            
            let itemId = "";
            let searchObj = search.create({
                type: "serviceitem",
                filters: [
                    ["custitem_clb_projecttasktype", "anyof", taskType], "AND",
                    ["isinactive", "is", "F"]
                ],
                columns:[]
            });
            let searchResult = searchObj.run().getRange({start: 0, end: 1});
            log.debug({title: "Service Item searchResult", details: searchResult});
            if(searchResult.length > 0)
            {
                itemId = searchResult[0].id;
            }
            return itemId;
        } 
        catch(ex) 
        {
            log.error({title: "Get Service Item", details: ex});
        }
    };
    const rollBack = (createdRecordsArr) =>{
        try
        {
            log.debug({title: "createdRecordsArr", details: createdRecordsArr});
            for (let i in createdRecordsArr) 
            {
                let deletedRec = record.delete({type: createdRecordsArr[i].recordType, id: createdRecordsArr[i].internalId});
                log.debug({title: "Deleted Records", details: createdRecordsArr[i].recordType + " : "+deletedRec});
            }         
        }
        catch(ex) 
        {
            log.error({title: "Rollback Created Records", details: ex});
        } 
    };
    const isParentProject = (projectId) => {     
        try
        {
            if(!projectId)
                return "";

            let jobId, name; 
            let searchObj = search.create({
                type: record.Type.JOB,
                filters:[
                    ["internalid", "anyof", projectId]
                ],
                columns:[
                    {name: "entityid", sort: search.Sort.ASC},
                    {name: "altname"}
                ]
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1});
            if(searchResult.length > 0) 
            {                
                jobId = projectSearchResult[0].getValue({name: "entityid"});
                name = projectSearchResult[0].getValue({name: "altname"});
                log.debug({
                    title: "Project Found",
                    details: "Job ID of Project with Internal ID " + projectId + " is: "+ jobId + ", while Name is:" + name
                });
                return true;
            }
            return false;
        }   
        catch(ex)
        {
            log.error({title: "Check If Project is Parent Project", details: ex});
        }        
    };
    const validateParent = (entityId) => {
        /* Checking if it is a customer */
        let customerSearch = search.create({
            type: record.Type.CUSTOMER,
            columns: ['entityid'],
            filters: [['entityid', 'is', entityId], "AND", ["isinactive", "is", "F"]]
        });

        let customerSearchResultCount = customerSearch.runPaged().count;
        if(customerSearchResultCount) {
            return true;
        }

        /* Else Checking if it is a project */
        let projectSearch = search.create({
            type: record.Type.JOB,
            columns: ['entityid'],
            filters: [['entityid', 'is', entityId], "AND", ["isinactive", "is", "F"]]
        });

        let projectSearchResultCount = projectSearch.runPaged().count;
        if (projectSearchResultCount) {
            if (!entityId.startsWith('T')) {
                return "The parent provided in the parent field is a valid project, but only T Projects can be referred to as a parent to a child project in the case of Group T&M projects. Please ensure you enter a valid value for the parent and try again.";
            }
            return true;
        }

        /* If no result is still found yet, returning false */
        return false;
    };
    const trimValues = (key, value) =>{
        if(typeof value === 'string') 
        {
            return value.trim();
        }
        return value;
    };
    const cleanPayload = (payload) =>{
        return JSON.parse(JSON.stringify(payload, trimValues, 4).trim());
    };
    const fieldInputTypeMatches = (fieldCategoryArray, fieldIdToMatch) =>{
        return fieldCategoryArray.some(fieldCategoryElement => fieldCategoryElement === fieldIdToMatch);
    };
    const isValidNumber = (value) =>{
        if (/^\d+$/.test(value)) 
        {
            return true;
        } 
        else 
        {
            return /^\d+\.\d+$/.test(value);
        }
    };
    const checkLength = (fieldValue, fieldName, maxDigits, context) => {
        if(fieldValue.length > maxDigits) 
        {
            return fieldName + " [" + fieldValue + "] mentioned for the " + context + " cannot have more than " + maxDigits + " digits. Please verify the payload and try again.";
        }
        else
        {
            return "";
        }
    };
    const isValidPercentage = (fieldValue, fieldName, maxPercentage, context) => {
        if(Number(fieldValue) > Number(maxPercentage) || Number(fieldValue) < 0) 
        {
            /* throw {
                name: "INVALID ARGUMENTS",
                message: fieldName + " [" + fieldValue + "] mentioned for the " + context + " should be between 0 and " + maxPercentage + ". Please verify the payload and try again.",
                stack: ""
            }; */
            return fieldName + " [" + fieldValue + "] mentioned for the " + context + " should be between 0 and " + maxPercentage + ". Please verify the payload and try again.";
        }
        else
        {
            return "";
        }
    };
    const validateDate = (dateValue) =>{
        let selectedDate = dateValue;
        if(selectedDate == '')
            return false;

        let regExp = /^(\d{1,2})(\/|-)(\d{1,2})(\/|-)(\d{4})$/; //Declare Regex
        let dateArray = selectedDate.match(regExp); // is format OK?

        if(dateArray == null) 
        {
            return false;
        }
        let month = dateArray[1];
        let day = dateArray[3];
        let year = dateArray[5];

        if(month < 1 || month > 12) 
        {
            return false;
        }
        else if(day < 1 || day > 31) 
        {
            return false;
        } 
        else if((month == 4 || month == 6 || month == 9 || month == 11) && day == 31) 
        {
            return false;
        } 
        else if(month == 2) 
        {
            let isLeapYear = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
            if(day > 29 || (day == 29 && !isLeapYear)) 
            {
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
    const removeTags = (str) =>{ 
        if ((str===null) || (str==='')) 
            return false; 
        else
            str = str.toString();  

        let str1 = str.replace( /(<([^>]+)>)/ig, '');
        return str1; 
    };    
    const errorCodeLib = (fieldId, errorCode) =>[{
        "MISSING_ARGUMENT": "Field value for ["+fieldId+"] is either missing or has unacceptable values.",
        "INVALID_ARGUMENT": "Field value for ["+fieldId+"] is invalid. Please verify the payload and try again.",
    }][0][errorCode];
    const groupData = (payload) => {
		const groupedData = [...payload.reduce((previousPayloadObject, currentPayloadObject) => {
			const key = currentPayloadObject.employee + '-' + currentPayloadObject.custcol_clb_weekendingdate;

			const keyGroup = previousPayloadObject.get(key) || Object.assign({}, currentPayloadObject, {
				requestMode: [],
				employee: currentPayloadObject.employee,
				workflowTaskId: [],
				trandate: [],
				custcol_clb_timesheettype: [],
				hours: [],
				custcol_clb_weekendingdate: currentPayloadObject.custcol_clb_weekendingdate,
				isbillable: [],
				custcol_clb_submitted: []
			});

			keyGroup.requestMode.push(currentPayloadObject.requestMode);
			keyGroup.workflowTaskId.push(currentPayloadObject.workflowTaskId);
			keyGroup.trandate.push(currentPayloadObject.trandate);
			keyGroup.custcol_clb_timesheettype.push(currentPayloadObject.custcol_clb_timesheettype);
			keyGroup.hours.push(currentPayloadObject.hours);
			keyGroup.isbillable.push(currentPayloadObject.isbillable);
			keyGroup.custcol_clb_submitted.push(currentPayloadObject.custcol_clb_submitted);

			return previousPayloadObject.set(key, keyGroup);
		}, new Map).values()];

		return groupedData;
	};
    const fieldValueMatches = (acceptableFieldValues, fieldValue) => {
		return acceptableFieldValues.some(fieldCategoryElement => fieldCategoryElement === fieldValue);
	};                 
    const getTaskType = (taskType) =>[{"ST": "1", "OT": "2", "DT": "3", "Fix-Bid": "4", "Sick Time": "5", "Sick_Time": "5", "Holiday": "6", "Non_ST": "7", "Non_OT": "8", "Non_Sick_Time": "9", "Time_Off": "10", "Time Off": "10"}][0][taskType];
    const getTimesheetStatus = (tsStatus) =>{
        try
        {
            let statusObj = {};
            switch(tsStatus)
            {
                case "Approved":
                    statusObj.approvalStatus = {text: "Approved", internalId: "3"};
                    statusObj.tsStatus = {text: "Approved", internalId: "2"};
                break;
                case "Submitted":
                    statusObj.approvalStatus = {text: "Pending Approval", internalId: "2"};
                    statusObj.tsStatus = {text: "Submitted", internalId: "1"};
                break;
                case "Pending":
                    statusObj.approvalStatus = {text: "Pending Approval", internalId: "2"};
                    statusObj.tsStatus = {text: "Submitted", internalId: "1"};
                break;
                case "Draft":
                    statusObj.approvalStatus = {text: "Pending Approval", internalId: "2"};
                    statusObj.tsStatus = {text: "Accrual", internalId: "6"};
                break;
            }
            return statusObj;
        }
        catch(ex)
        {
            log.error({title: "Get Timesheet Status", details: ex});
        }
    };
    const createIntegrationRec = (requestPayload, integrationType) => {
        try 
        {
            let recordObj = record.create({type: "customrecord_intgrtn_mstr_rcrd_dtls", isDynamic: true});
            recordObj.setText({fieldId: "custrecord_intgrtn_rcrd_type", text: integrationType});
            recordObj.setValue({fieldId: "custrecord_int_rqst_pyld", value: JSON.stringify(requestPayload)});
    
            let recordId = recordObj.save();            
            return recordId;
        } 
        catch(ex) 
        {
            log.debug({title: "Create Integration Record", details: ex});
        }
    };    
    const getCategoryId = (category) => {
        try
        {
            let categoryId = "";

            if(!category) return categoryId;
    
            let searchObj = search.create({
                type: "customlist_clb_customerclassidlist",
                filters:[
                    ["name", "is", category], "AND",    
                    ["isinactive", "is", "F"]
                ],
                columns:[]
            });
            let searchResult = searchObj.run().getRange({start: 0, end: 1});
            if(searchResult.length > 0) 
            {
                categoryId = searchResult[0].id;
            }
            return categoryId;
        }
        catch(ex)
        {
            log.error({title: "Get Category Id", details: ex});
        }
    };
    const caseInsensitiveStringCompare = (firstAddressKeyItem, secondAddressKeyItem) => {
        if(typeof firstAddressKeyItem === "string" && typeof secondAddressKeyItem === "string                                                ") 
        {
            return firstAddressKeyItem.toUpperCase() === secondAddressKeyItem.toUpperCase();
        }
        else if(typeof firstAddressKeyItem === typeof secondAddressKeyItem) 
        {
            return true;
        }
        else 
        {
            return false;
        }
    };
    const addDays = (date, days) => {
		var result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	};
    const trnsctnFailureRec = (periodStartDate,periodEndDate,errorDescription,trnsctnType,projectId,employeeid) => {
        try 
        {
            let recordObj = record.create({type: "customrecord_asc_trnsctn_crtn_rprt_arap", isDynamic: true});
            recordObj.setValue({fieldId: "custrecord_asc_period_strt_date", value: new Date(periodStartDate)});
            recordObj.setValue({fieldId: "custrecord_asc_period_end_date", value: new Date(periodEndDate)});
            recordObj.setValue({fieldId: "custrecord_asc_error_description", value: errorDescription});
            recordObj.setValue({fieldId: "custrecord_asc_transaction_type", value: trnsctnType});
            recordObj.setValue({fieldId: "custrecord_asc_project_id", value: projectId});
          if(employeeid){
             recordObj.setValue({fieldId: "custrecord_asc_employee", value: employeeid});
          }

            let recordId = recordObj.save();            
            return recordId;
        } 
        catch(ex) 
        {
            log.error({title: "Create Error Record", details: ex.message});
        }
    };
    /* const generateProjectId = (resourceId, resourceIntId, projectType) =>{
        try 
        {
            log.debug({title: "resourceId", details: resourceId});  
            let projectId = "";
            //let resourceIntId = getEntityId("employee", resourceId);
            let searchObj = search.create({
                type: "resourceallocation",
                filters:[
                   ["resource", "anyof", resourceIntId], "AND", 
                   ["job.entityid", "startswith", projectType]
                ],
                columns:[
                   {name: "resource"},
                   {name: "entityid", join: "job", sort: search.Sort.DESC},
                   {name: "datecreated", join: "job", sort: search.Sort.DESC}
                ]
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                let prevProjId = searchRes[0].getValue({name: "entityid", join: "job"});
                if(prevProjId.startsWith(projectType))
                {
                    //log.debug({title: "prevProjId", details: prevProjId}); 
                    prevProjId = prevProjId.slice(1);
                    projectId = (resourceId.charAt(0))+""+generateId((Number(prevProjId)+1));
                }
                else
                {
                    projectId = (resourceId.charAt(0))+""+resourceId.slice(1)+"001";
                    //log.error({title: "Else projectId", details: projectId}); 
                }
            }
            else
            {
                projectId = (resourceId.charAt(0))+""+resourceId.slice(1)+"001";
                //log.error({title: "Else projectId", details: projectId}); 
            }
            return projectId;
        } 
        catch(ex) 
        {
            log.error({title: "Generate New Project Id", details: ex});    
        }
    }; */
    const generateProjectId = (resourceId, projectType) =>{
        try 
        {
            log.debug({title: "resourceId", details: resourceId});  
            let projectId = "";
            let searchObj = search.create({
                type: "job",
                filters:[
                   ["entityid", "startswith", resourceId]
                ],
                columns:[
                   {name: "entityid", sort: search.Sort.DESC}
                ]
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 1});
            if(searchRes.length > 0)
            {
                let prevProjId = searchRes[0].getValue({name: "entityid"});
                if(prevProjId.startsWith(projectType))
                {
                    //log.debug({title: "prevProjId", details: prevProjId}); 
                    prevProjId = prevProjId.slice(1);
                    projectId = (resourceId.charAt(0))+""+generateId((Number(prevProjId)+1));
                }
                else
                {
                    projectId = (resourceId.charAt(0))+""+resourceId.slice(1)+"001";
                    //log.error({title: "Else projectId", details: projectId}); 
                }
            }
            else
            {
                projectId = (resourceId.charAt(0))+""+resourceId.slice(1)+"001";
                //log.error({title: "Else projectId", details: projectId}); 
            }
            return projectId;
        } 
        catch(ex) 
        {
            log.error({title: "Generate New Project Id", details: ex});    
        }
    };
    const generateId = (num) =>{
        let s = "000000000" + num;
        return s.substring(s.length-9);
    };
    let sendEmail = (customerName, projectName, transId, transType,tranDate,sourceTran,sourceId) =>{
        try{
            var senderId = -5;
            var recipientId =[9,78576,17444];
               log.debug("Sending Email: ");     
                    email.send({
                        author: senderId,
                        recipients: recipientId,
                        subject: transType + " released for adjustments",
                        body: 'Hi Team,'+"\n\n"+transType+" has been released for manual adjustment due to reversal of the " + sourceTran+ ": "+sourceId+" for the customer: "+customerName+ " for the project: "+projectName+" with Transaction number "+transId+" dated "+ tranDate +"."+"\n\n Thanks!"
                    }); 
                    log.debug("Sent Email "); 
        }catch(ex){
            log.debug({title: "Create Error Record", details: ex.message});
        }
    };
	const titleCase = (str) =>{
	   let splitStr = str.toLowerCase().split(' ');
	   for(let i = 0; i < splitStr.length; i++) 
	   {
		   splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
	   }
	   return splitStr.join(' '); 
	};
    return{
        createFile: createFile,
        moveFile: moveFile,
        searchProject: searchProject,
        getEntityId: getEntityId,
        createErrorRec: createErrorRec,
        getSelectValueId: getSelectValueId,
        getServiceItem: getServiceItem,
        rollBack: rollBack,
        isParentProject: isParentProject,
        validateParent: validateParent,
        trimValues: trimValues,
        cleanPayload: cleanPayload,
        fieldInputTypeMatches: fieldInputTypeMatches,
        isValidNumber: isValidNumber,
        checkLength: checkLength,
        isValidPercentage: isValidPercentage,
        validateDate: validateDate,
        isLessThanStartDate: isLessThanStartDate,
        removeTags: removeTags,
        errorCodeLib: errorCodeLib,
        groupData: groupData,
        fieldValueMatches: fieldValueMatches,
        getTaskType: getTaskType,
        getTimesheetStatus: getTimesheetStatus,
        createIntegrationRec: createIntegrationRec,
        getCategoryId: getCategoryId,
        caseInsensitiveStringCompare: caseInsensitiveStringCompare,
        addDays: addDays,
        trnsctnFailureRec:trnsctnFailureRec,
        generateProjectId: generateProjectId,
		sendEmail: sendEmail,
		titleCase: titleCase
    }
});