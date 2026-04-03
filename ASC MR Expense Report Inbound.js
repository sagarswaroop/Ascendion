/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/runtime", "N/format", "SuiteScripts/Projects/Library/Project Library.js"], (search, record, runtime, format, lib) => {
    let scriptConstants = {
		folderId: {},
		fieldsToInputByValue: ["custbody_clb_unique_id", "trandate", "duedate", "advance"],
		fieldsToInputByText: ["acctcorpcardexp", "memo", "custbody_clb_eventcode", "custbody_clb_status", "custbody_clb_managername"],
		fieldsToInputByDropdown: ["expensereportcurrency", "department", "class", "location"],
		booleanInputFields: ["custbody_clb_clearing"],
		lineLevelDepartmentClassLocation: ["department", "class", "location"],
		lineLevelFieldsToInputByValue: ["expensedate", "exchangerate", "amount", "memo", "customer", "custcol_clb_companyamount", "quantity", "custcol_clb_unit", "custcol_clb_rate"],
		lineLevelFieldsToInputByText: ["category"],
		lineLevelFieldsToInputByDropdown: ["currency"],
		lineLevelBooleanInputFields: ["isbillable", "corporatecreditcard"]
	};
    let expenseAgainstCustomerPO = [], errorObjArr = [];
    const getInputData = (context) => {
        try
        {
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_er_integration_rec_id"});
            let expReportJson = record.load({type: "customrecord_intgrtn_mstr_rcrd_dtls", id: recordId, isDynamic: true}).getValue({fieldId: "custrecord_int_rqst_pyld"});
            //log.debug({ title: "expReportJson", details: expReportJson});
            return JSON.parse(expReportJson);
        }
        catch(ex)
        {
            log.debug({title: "Get Input Data", details: ex});            
        }
    };       
    const reduce = (context) => {
        let expReportJson = "";
        try 
        {
            expReportJson = JSON.parse(context.values[0]);
            //log.debug({ title: "expReportJson", details: expReportJson});

            let erRecResponse = createExpReport(expReportJson);
            log.debug({title: "erRecResponse", details: erRecResponse});

            context.write({ 
                key: expReportJson.bodyLevelFields.custbody_clb_unique_id, 
                value: erRecResponse 
            });    
        }
        catch(ex) 
        {
            log.debug({ title: "Reduce", details: ex});
        }
    };
    const summarize = (context) => {
        try
        {
            let reponseArray = [];
            let scriptObj = runtime.getCurrentScript();
            let recordId = scriptObj.getParameter({name: "custscript_er_integration_rec_id"});
            context.output.iterator().each(function (key, value) {
                log.debug("Summarize", "Key : " + key + "; Value : " + (value));
                let reponseObj = JSON.parse(value);
                reponseObj["entityId"] = key;
                reponseArray.push(reponseObj)
                return true;
            });
            log.debug('reponseArray', reponseArray);
            log.debug({ title: "Summarize recordId", details: recordId });
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
    const createExpReport = (expenseReportJSON) =>{
        let employeeInternalId = "", tranDate = "", dueDate = "";
        try 
        {
            let isExistingNSRecord = false;
			validatePayload(expenseReportJSON);            
            
			expenseReportJSON.bodyLevelFields.trandate = expenseReportJSON.bodyLevelFields.trandate || today;
			expenseReportJSON.bodyLevelFields.duedate = lib.addDays(expenseReportJSON.bodyLevelFields.trandate.toString(), 30);
			expenseReportJSON.bodyLevelFields.trandate = format.parse({ value: expenseReportJSON.bodyLevelFields.trandate, type: format.Type.DATE });
			expenseReportJSON.bodyLevelFields.duedate = format.parse({ value: expenseReportJSON.bodyLevelFields.duedate, type: format.Type.DATE });

            tranDate = expenseReportJSON.bodyLevelFields.trandate;
            dueDate = expenseReportJSON.bodyLevelFields.duedate;

			if(!expenseReportJSON.bodyLevelFields.custbody_clb_unique_id) 
            {
				errorObjArr.push({name: "MISSING ARGUMENTS", message: "Collabera Unique ID not specified.", stack: ""});
			}
			if(!expenseReportJSON.bodyLevelFields.entity) 
            {
				errorObjArr.push({name: "MISSING ARGUMENTS", message: "Entity not specified.", stack: ""});
			}
			let employeeDetails = getEmployeeDetails(expenseReportJSON.bodyLevelFields.entity);
			employeeInternalId = employeeDetails.internalid;
            //log.debug({title: "employeeInternalId", details: employeeInternalId});
			if(!employeeInternalId) 
            {
				errorObjArr.push({name: "NOT FOUND", message: "No existing Employee found with entity: " + expenseReportJSON.bodyLevelFields.entity, stack: ""});
                createErrorRecord(employeeInternalId, errorObjArr, tranDate, dueDate);
                return {"status": "FAILED", "nsInternalId": "", "errorCode": "", "errorDetails": errorObjArr, "stack": ""};
			}
			let erInternalId = findExpenseReport(expenseReportJSON.bodyLevelFields.custbody_clb_unique_id);

			if(erInternalId) 
			{
				//expenseReportRecord = record.load({ type: record.Type.EXPENSE_REPORT, id: erInternalId, isDynamic: true });
				isExistingNSRecord = true;
                errorObjArr.push({name: "DUPLICATE", message: "Expense Report Already Exist with same Unique Id["+expenseReportJSON.bodyLevelFields.custbody_clb_unique_id+"]."});
                createErrorRecord(employeeInternalId, errorObjArr, tranDate, dueDate);
                return {"status": "FAILED", "nsInternalId": "", "errorCode": "", "errorDetails": errorObjArr, "stack": ""};
			}
			let expenseReportRecord = record.create({type: record.Type.EXPENSE_REPORT, isDynamic: true});
            log.debug({title: "Expense Report Record", details: expenseReportRecord});

			let expenseReportJSONBodyLevelKeys = Object.keys(expenseReportJSON.bodyLevelFields);

			/* Setting hardcoded values for applicable fields */
			expenseReportRecord.setValue({fieldId: "entity", value: employeeInternalId});            
			expenseReportRecord.setValue({fieldId: "custbody_clb_pushedviaintegration", value:true});
			expenseReportRecord.setValue({fieldId: "approvalstatus", value: 2});
			expenseReportRecord.setValue({fieldId: "complete", value: true});
			expenseReportRecord.setValue({fieldId: "usemulticurrency", value: true});

			/* Setting dynamic values for non-payload fields */

			/* Setting dynamic values for payload body level fields */
			for(let keyIndex in expenseReportJSONBodyLevelKeys) 
            {
				if(lib.fieldInputTypeMatches(scriptConstants.fieldsToInputByValue, expenseReportJSONBodyLevelKeys[keyIndex])) 
                {
					expenseReportRecord.setValue(expenseReportJSONBodyLevelKeys[keyIndex], expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]]);
				}
				else if(lib.fieldInputTypeMatches(scriptConstants.fieldsToInputByText, expenseReportJSONBodyLevelKeys[keyIndex])) 
                {
					if(expenseReportJSONBodyLevelKeys[keyIndex] === "acctcorpcardexp") 
                    {
						//expenseReportRecord.setText({fieldId: "acctcorpcardexp", text: expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]]});
						//expenseReportRecord.setValue({fieldId: "corpcardbydefault", value: true });
					}
					else
						expenseReportRecord.setText(expenseReportJSONBodyLevelKeys[keyIndex], expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]]);
				}
				else if(lib.fieldInputTypeMatches(scriptConstants.fieldsToInputByDropdown, expenseReportJSONBodyLevelKeys[keyIndex]) && expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]]) 
                {
                    log.debug({title: "Drop Down Values : "+expenseReportJSONBodyLevelKeys[keyIndex], details: lib.getSelectValueId(expenseReportRecord, "bodyLevelField", expenseReportJSONBodyLevelKeys[keyIndex], expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]])});
                    expenseReportRecord.setValue(expenseReportJSONBodyLevelKeys[keyIndex], lib.getSelectValueId(expenseReportRecord, "bodyLevelField", expenseReportJSONBodyLevelKeys[keyIndex], expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]]));
                }
				else if(lib.fieldInputTypeMatches(scriptConstants.booleanInputFields, expenseReportJSONBodyLevelKeys[keyIndex])) 
                {
					if(expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]].toUpperCase() === "T") 
                    {
						expenseReportRecord.setValue(expenseReportJSONBodyLevelKeys[keyIndex], true);
					}
					else if(expenseReportJSON.bodyLevelFields[expenseReportJSONBodyLevelKeys[keyIndex]].toUpperCase() === "F") 
                    {
						expenseReportRecord.setValue(expenseReportJSONBodyLevelKeys[keyIndex], false);
					}
					else 
                    {
						errorObjArr.push({name: "INVALID ARGUMENTS", message: expenseReportJSONBodyLevelKeys[keyIndex] + " is incorrectly specified in the payload. Acceptable values can be 'T' or 'F'."});
					}
				}
			}
			/* Line level fields are populated only during create */
			if(!isExistingNSRecord) 
			{
				expenseReportJSON.lineLevelFields.forEach(function (lineDetails, lineIndex) {
					let existingExpenseData, projectInternalId, customerPODetails;

					if(!lineDetails.isbillable) 
						lineDetails.isbillable = "F";

					if(lineDetails.customer) 
					{
						projectInternalId = lib.searchProject(lineDetails.customer);
					}
					else
					{
						if(lineDetails.isbillable === "T") 
						{
							errorObjArr.push({name: "MISSING ARGUMENTS", message: "Customer (Project) is not specified for Expense Line " + (lineIndex + 1) + " while the line is billable as mentioned in the payload. Please verify the payload and try again later."});
						}
					}
					expenseReportRecord = populateExpenseLine(expenseReportJSON.lineLevelFields, expenseReportRecord, lineDetails, projectInternalId, lineIndex + 1);

					/* If the line that was just populated was billable, calculate expense data */
					if(lineDetails.isbillable.toUpperCase() === 'T') 
					{
						let lineAmount = expenseReportRecord.getSublistValue({sublistId: "expense", fieldId: "amount", line: lineIndex});
						/* Look for the active Customer PO for the project during the expense date period */
						customerPODetails = getCustomerPODetails(projectInternalId, lineDetails.expensedate);
						/* Check if Sales Order already exists in our array */
						existingExpenseData = expenseAgainstCustomerPO.find(expenseDataInArray => expenseDataInArray.customerPOId === customerPODetails.internalId);
						/* If Customer PO already exists in our array, add line amount to expense amount calculated against the Customer PO so far */
						if(existingExpenseData) 
                        {
							existingExpenseData.expenseAmount = Number(existingExpenseData.expenseAmount) + Number(lineAmount);
							log.debug('Updated Expense Against Sales Order', expenseAgainstCustomerPO);

							/* If budget is not ignored [Ignore Budget or Ignore Expense Budget] for this Sales Order, checking the total expense against the expense budget */
							if(!existingExpenseData.isIgnoreAnyBudget && Number(existingExpenseData.expenseAmount) > Number(existingExpenseData.expenseBudget)) 
                            {
								errorObjArr.push({
									name: "ERROR",
									message: "Cannot enter Expense Against Project: " + lineDetails.customer + " on: " + lineDetails.expensedate + " since it will exceed the expense budget worth " + existingExpenseData.expenseBudget + ". ",
									stack: ""
								});
							}
						}
						else 
                        {
							let newExpenseData = {
								customerPOId: customerPODetails.internalId,
								isIgnoreAnyBudget: customerPODetails.isIgnoreBudget,
								expenseBudget: Number(customerPODetails.expenseBudget),
								expenseAmount: Number(lineAmount)
							};

							expenseAgainstCustomerPO.push(newExpenseData);
							log.debug('Updated Expense Against Customer PO Details', expenseAgainstCustomerPO);

							/* If budget is not ignored [Ignore Budget or Ignore Expense Budget] for this Sales Order, checking the total expense against the expense budget */
							if(!newExpenseData.isIgnoreAnyBudget && Number(newExpenseData.expenseAmount) > Number(newExpenseData.expenseBudget)) 
                            {
								errorObjArr.push({
									name: "ERROR",
									message: "Cannot enter Expense Against Project: " + lineDetails.customer + " on: " + lineDetails.expensedate + " since it will exceed the expense budget worth " + newExpenseData.expenseBudget + ".",
									stack: ""
								});
							}
						}
					}
				});
			}
			let erRecId = expenseReportRecord.save();
            log.debug({title: "Expense Report Id", details: erRecId});

			/* Updating new expense amounts upon saving the Expense Report */
			if(!isExistingNSRecord) 
            {
				expenseAgainstCustomerPO.forEach(expenseDetails => record.submitFields({
					type: "customrecord_ascendion_cust_po_details",
					id: expenseDetails.customerPOId,
					values: {
						custbody_clb_total_expense_amount: expenseDetails.expenseAmount
					}
				}));
			}
            if(erRecId)
            {
                return {"status": "SUCCESS", "nsInternalId": erRecId, "errorCode": "", "errorDetails": "", "stack": ""};
            }
            else
            {                
                createErrorRecord(employeeInternalId, errorObjArr, tranDate, dueDate);
                return {"status": "FAILED", "nsInternalId": "", "errorCode": "", "errorDetails": errorObjArr, "stack": ""};
            }
        } 
        catch(ex) 
        {
            log.debug({title: "Create Expense Report", details: ex});
            errorObjArr.push({name: "UNEXPECTED ERROR", message: ex.message, stack: ""});
            createErrorRecord(employeeInternalId, errorObjArr, tranDate, dueDate);
            return {"status": "FAILED", "nsInternalId": "", "errorCode": "", "errorDetails": errorObjArr, "stack": ""};
        }
    };
    const findExpenseReport = (uniqueId) => {
        try
        {
            let expenseReportId = "";
            let searchObj = search.create({
                type: record.Type.EXPENSE_REPORT,
                filters:[
                    ["type", "anyof", "ExpRept"], "AND",
                    ["custbody_clb_unique_id", "is", uniqueId], "AND",
                    ["mainline", "is", "T"]
                ],
                columns:[
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
            });
            let searchResult = searchObj.run().getRange({start: 0, end: 1});
            if(searchResult.length > 0) 
            {
                expenseReportId = searchResult[0].id;
                log.debug({title: "Expense Report Found", details: "InternalID of " + uniqueId + " is: " + expenseReportId});
            }
            return expenseReportId;
        }
        catch(ex)
        {
            log.debug({title: "Find Existing Expense Report", details: ex});            
        }		
	};
    const validatePayload = (payload) => {
		let payloadJSONKeys = Object.keys(payload);
		for(let keyIndex in payloadJSONKeys) 
        {
			if(typeof payload[payloadJSONKeys[keyIndex]] === 'string') 
            {
				continue;
			} 
            else if(typeof payload[payloadJSONKeys[keyIndex]] === 'object') 
            {
				validatePayload(payload[payloadJSONKeys[keyIndex]]);
			} 
            else 
            {
				errorObjArr.push({
					name: "INVALID ARGUMENTS",
					message: "Invalid Field Value [" + payload[payloadJSONKeys[keyIndex]] + "] entered for: " + payloadJSONKeys[keyIndex] + ". All attribute values must be in String format. Please verify the payload and try again later.",
					stack: ""
				});
			}
		}
	};
    const getEmployeeDetails = (employeeId) => {
        try 
        {
            let employeeDetails = {};
            let searchObj = search.create({
                type: record.Type.EMPLOYEE,
                filters:[
                    [["entityid", "is", employeeId], "OR", ["custentity_clb_entityid", "is", employeeId]], "AND",					
                    ["isinactive", "is", false]
                ],
                columns:[
                    {name: "location"},
                    {name: "department"},
                    {name: "billingclass"}
                ]
            });
            let searchResult = searchObj.run().getRange({start: 0, end: 2});
            //log.debug({title: "Employee searchResult", details: searchResult});            
            if(searchResult.length > 0) 
            {
                employeeDetails.internalid = searchResult[0].id;
                employeeDetails.location = searchResult[0].getValue({name: "location"});
                employeeDetails.department = searchResult[0].getValue({name: "department"});
                employeeDetails.class = searchResult[0].getValue({name: "billingclass"});
            }
            log.debug({title: "Employee Details", details: employeeDetails});
            return employeeDetails;            
        } 
        catch(ex) 
        {
            log.debug({title: "Get Employee Details", details: ex});
        }
	};
    const getCustomerPODetails = (projectId, expenseDate) => {
        try 
        {            
            let customerPOObj = {};
            let searchObj = search.create({
                type: "customrecord_ascendion_cust_po_details",
                filters:[
                    ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectId], "AND",
                    ["custrecord_asc_cpd_start_date", "onorbefore", expenseDate], "AND",
                    ["custrecord_asc_cpd_end_date", "onorafter", expenseDate]
                ],
                columns:[
                    { name: "created", sort: search.Sort.DESC},
                    { name: "custrecord_asc_cpd_start_date"},
                    { name: "custrecord_asc_cpd_end_date"},
                    { name: "custrecord_asc_cpd_ignore_budget"},
                    { name: "custrecord_asc_cpd_expense_budget"}
                ]
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1 });
            //log.debug({title: "Customer PO Details searchResult", details: searchResult});
            if(searchResult.length > 0) 
            {
                customerPOObj.internalId = searchResult[0].id;
                customerPOObj.startDate = searchResult[0].getValue({name: "custrecord_asc_cpd_start_date"});
                customerPOObj.endDate = searchResult[0].getValue({name: "custrecord_asc_cpd_end_date"});
                customerPOObj.isIgnoreBudget = searchResult[0].getValue({name: "custrecord_asc_cpd_ignore_budget"});
                customerPOObj.expenseBudget = searchResult[0].getValue({name: "custrecord_asc_cpd_expense_budget"});

            }
            else 
            {
                errorObjArr.push({
                    name: "INVALID ARGUMENTS",
                    message: "Could not find any valid Customer PO Details to enter Expense Against for Project with Internal ID: " + projectId + " on: " + expenseDate + ". Please verify the payload and try again later.",
                    stack: ""
                });
            }
            return customerPOObj;
        } 
        catch(ex) 
        {
            log.debug({title: "Get Customer PO Details", details: ex});
        }
	};
    const populateExpenseLine = (lineLevelFields, expenseReportRecord, lineDetails, projectInternalId, lineNumber) => {
        try 
        {
            log.debug({title: "expenseReportRecord Subsidiary", details: expenseReportRecord.getValue({fieldId: "subsidiary"})});
            expenseReportRecord.selectNewLine({sublistId: "expense"});

            if(lineDetails.expensedate) 
            {
                if(!lib.validateDate(lineDetails.expensedate)) 
                {
                    errorObjArr.push({
                        name: "MISSING ARGUMENTS",
                        message: "Expense Date is not incorrectly specified for Expense Line " + lineNumber + " in the payload. All dates are expected in MM/DD/YYYY format. Please verify the payload and try again later.",
                        stack: ""
                    });
                }
            }
            else 
            {
                errorObjArr.push({
                    name: "MISSING ARGUMENTS",
                    message: "Expense Date is not specified for Expense Line " + lineNumber + " in the payload. Please verify the payload and try again later.",
                    stack: ""
                });
            }

            if(!lineDetails.currency) 
            {
                errorObjArr.push({
                    name: "MISSING ARGUMENTS",
                    message: "Currency is not specified for Expense Line " + lineNumber + " in the payload. Please verify the payload and try again later.",
                    stack: ""
                });
            }

            if(!lineDetails.amount) 
            {
                errorObjArr.push({
                    name: "MISSING ARGUMENTS",
                    message: "Amount is not specified for Expense Line " + lineNumber + " in the payload. Please verify the payload and try again later.",
                    stack: ""
                });
            }

            let lineDetailsJSONKeys = Object.keys(lineDetails);

            for(let keyIndex in lineDetailsJSONKeys) 
            {
                if(lib.fieldInputTypeMatches(scriptConstants.lineLevelFieldsToInputByValue, lineDetailsJSONKeys[keyIndex])) 
                {
                    if(lineDetailsJSONKeys[keyIndex] === 'expensedate') 
                    {
                        expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], format.parse({ value: lineDetails[lineDetailsJSONKeys[keyIndex]], type: format.Type.DATE }));
                    }
                    else if(lineDetailsJSONKeys[keyIndex] === 'exchangerate' && lineDetails[lineDetailsJSONKeys[keyIndex]]) 
                    {
                        expenseReportRecord.setCurrentSublistValue('expense', 'exchangerate', lineDetails[lineDetailsJSONKeys[keyIndex]]);
                    }
                    else if(lineDetailsJSONKeys[keyIndex] === 'amount') 
                    {
                        expenseReportRecord.setCurrentSublistValue('expense', 'foreignamount', lineDetails[lineDetailsJSONKeys[keyIndex]]);
                    }
                    else if(lineDetailsJSONKeys[keyIndex] === 'customer') 
                    {
                        expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], projectInternalId);
                    }
                    else if(lineDetailsJSONKeys[keyIndex] === 'custcol_clb_unit') 
                    {
                        let quantityRequired = checkIfRateOrQuantityIsRequired(lineDetails.category);
						log.debug({title: "quantityRequired", details: quantityRequired});
                        if(quantityRequired) 
                        {
                            if(lib.isValidNumber(lineDetails.custcol_clb_unit)) 
                            {
                                expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], lineDetails[lineDetailsJSONKeys[keyIndex]]);
                                expenseReportRecord.setCurrentSublistValue('expense', "quantity", lineDetails[lineDetailsJSONKeys[keyIndex]]);
                            }
							else if(lib.isValidNumber(lineDetails.custcol_clb_rate)) 
                            {
                                expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], lineDetails[lineDetailsJSONKeys[keyIndex]]);
                                expenseReportRecord.setCurrentSublistValue('expense', "rate", lineDetails[lineDetailsJSONKeys[keyIndex]]);
                            }
                            else 
                            {
                                errorObjArr.push({
                                    name: "INVALID ARGUMENTS",
                                    message: lineDetailsJSONKeys[keyIndex] + " is incorrectly specified for Expense Line " + lineNumber + " in the payload. Please enter a valid number for quantity.",
                                    stack: ""
                                });
                            }
                        }
                        else 
                        {
                            if(lineDetails.quantity) 
                            {
                                errorObjArr.push({
                                    name: "INVALID ARGUMENTS",
                                    message: lineDetailsJSONKeys[keyIndex] + " is incorrectly specified for Expense Line " + lineNumber + " in the payload. Quanity is only required for expense categories whose rates applicable.",
                                    stack: ""
                                });
                            }
                        }
                    }
                    else
                        expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], lineDetails[lineDetailsJSONKeys[keyIndex]]);
                }
                else if(lib.fieldInputTypeMatches(scriptConstants.lineLevelFieldsToInputByText, lineDetailsJSONKeys[keyIndex])) 
                {
                    if(lineDetailsJSONKeys[keyIndex] === 'category') 
                    {
                        //let categoryId = lib.getSelectValueId(expenseReportRecord, 'lineLevelField', lineDetailsJSONKeys[keyIndex], lineDetails[lineDetailsJSONKeys[keyIndex]], 'expense');
                        //log.debug({title: "Category Id", details: lineDetails[lineDetailsJSONKeys[keyIndex]]});
                        expenseReportRecord.setCurrentSublistText('expense', "category", lineDetails[lineDetailsJSONKeys[keyIndex]]);
                    }
                }
                else if(lib.fieldInputTypeMatches(scriptConstants.lineLevelFieldsToInputByDropdown, lineDetailsJSONKeys[keyIndex])) 
                {
                    expenseReportRecord.setCurrentSublistValue({sublistId: 'expense', fieldId: lineDetailsJSONKeys[keyIndex], value: lib.getSelectValueId(expenseReportRecord, 'lineLevelField', lineDetailsJSONKeys[keyIndex], lineDetails[lineDetailsJSONKeys[keyIndex]], 'expense')});
                }
                else if(lib.fieldInputTypeMatches(scriptConstants.lineLevelBooleanInputFields, lineDetailsJSONKeys[keyIndex])) 
                {
                    if(lineDetails[lineDetailsJSONKeys[keyIndex]].toUpperCase() === 'T') 
                    {
                        expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], true);
                    }
                    else if(lineDetails[lineDetailsJSONKeys[keyIndex]].toUpperCase() === 'F') 
                    {
                        expenseReportRecord.setCurrentSublistValue('expense', lineDetailsJSONKeys[keyIndex], false);
                    }
                    else 
                    {
                        errorObjArr.push({
                            name: "INVALID ARGUMENTS",
                            message: lineDetailsJSONKeys[keyIndex] + " is incorrectly specified for Expense Line " + lineNumber + " in the payload. Acceptable values can be 'T' or 'F'.",
                            stack: ""
                        });
                    }
                }
            }
            scriptConstants.lineLevelDepartmentClassLocation.forEach(function (fieldId) {
                if(lineDetails[fieldId]) 
                {
                    expenseReportRecord.setCurrentSublistValue({sublistId: 'expense', fieldId: fieldId, value: lib.getSelectValueId(expenseReportRecord, 'lineLevelField', fieldId, lineDetails[fieldId], 'expense')});
                }
                else if(lineLevelFields[fieldId]) 
                {
                    expenseReportRecord.setCurrentSublistValue({sublistId: 'expense', fieldId: fieldId, value: lineLevelFields[fieldId]});
                }
                else 
                {
                    expenseReportRecord.setCurrentSublistValue({sublistId: 'expense', fieldId: fieldId, value: expenseReportRecord.getValue(fieldId)});
                }
            });
            expenseReportRecord.commitLine({sublistId: 'expense'});
            return expenseReportRecord;
        } 
        catch(ex) 
        {
            log.debug({title: "Populate Expense Line", details: ex});
        }		
	};
    const checkIfRateOrQuantityIsRequired = (expenseCategoryName) => {
        try 
        {
            let rateRequired = "";
            let searchObj = search.create({
                type: record.Type.EXPENSE_CATEGORY,
                filters:[
                    ["name", "is", expenseCategoryName]
                ],
                columns:[
                    { name: "raterequired"}
                ]
            });
            let searchResult = searchObj.run().getRange({ start: 0, end: 1 });
            if(searchResult) 
            {
                rateRequired = searchResult[0].getValue({name: "raterequired"});
            }
            return rateRequired;            
        } 
        catch(ex) 
        {
            log.debug({title: "Check If Rate/Qty is Required", details: ex});
        }
	};
    const createErrorRecord = (employeeId, errorObj, tranDate, dueDate) =>{
        try 
        {
            let recordObj = record.create({type: "customrecord_asc_trnsctn_crtn_rprt_arap", isDynamic: true});
            recordObj.setValue({fieldId: "custrecord_asc_error_description", value: JSON.stringify(errorObj)});
            recordObj.setValue({fieldId: "custrecord_asc_transaction_type", value: 3});
            recordObj.setValue({fieldId: "custrecord_asc_employee", value: employeeId});
            recordObj.setValue({fieldId: "custrecord_asc_period_strt_date", value: tranDate});
            recordObj.setValue({fieldId: "custrecord_asc_period_end_date", value: dueDate});
            let errRecId = recordObj.save({enableSourcing: true, ignoreMandatoryFields: true});
            log.debug({title: "Error Record Id", details: errRecId});
        } 
        catch(ex) 
        {
            log.error({title: "Create Error Record", details: ex});    
        }
    };
    return {getInputData, reduce, summarize};
});