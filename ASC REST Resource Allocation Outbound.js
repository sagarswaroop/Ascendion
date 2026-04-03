/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(["N/search", "N/runtime", "N/record"], (search, runtime, record) => {
    const get = (requestParams) => {
        try 
        {
            let resourceData = getResourceData();
            log.debug({title: "resourceData", details: resourceData});
            if(resourceData.length > 0)
            {
                let internalId = resourceData[resourceData.length-1].nsInternalId;
                log.debug({title: "internalId", details: internalId});
                updateInternalId(internalId);
                return {"status": "Success", "message": "Response Generated", errorCode: "", "responseObj": resourceData};                
            }
            else
            {
                return {"status": "Success", "responseObj": [], "errorCode": "DATA NOT AVAILABLE", "message": "Resource Allocations Not Found."}   
            }
        } 
        catch(ex) 
        {
            log.error({title: "Resource Allocation Outbound", details: ex});
        }
    };
    const getResourceData = () =>{
        try 
        {
            let scriptObj = runtime.getCurrentScript();
            let lastInternalId = scriptObj.getParameter({name: "custscript_last_internalid"});
            lastInternalId = lastInternalId == "" ? 0 : lastInternalId;
            log.debug({title: "lastInternalId", details: lastInternalId});
            let resourceAllData = [];
            let searchObj = search.create({
                type: "resourceallocation",
                filters: [
					["systemnotes.date","onorafter","yesterday"], "AND", 
					["systemnotes.type","any",""] //, "AND", 
                   // ["internalidnumber", "greaterthan", lastInternalId]
                ],
                columns:[                  
                    {name: "internalid", sort: search.Sort.ASC},  
                    {name: "entityid", join: "job", sort: search.Sort.ASC},                    
                    {name: "resource"},
                    {name: "custentity_clb_entityid", join: "employee"},
                    {name: "firstname", join: "employee"},
                    {name: "lastname", join: "employee"},
                    {name: "hiredate", join: "employee"},
                    {name: "releasedate", join: "employee"},
                    {name: "project"},
                    {name: "custentity_clb_parentproject", join: "job"},
                    {name: "custentity_clb_projecttypeforinvoicing", join: "job"},
                    {name: "startdate", join: "job"},
                    {name: "custentity_clb_projct_end_dte", join: "job"},
                    {name: "customer", join: "job"},
                    {name: "companyname", join: "job"},
                    {name: "custevent_clb_prjct_workl_tsk_id"}                    
                ]
            });
            let searchRes = getAllResults(searchObj.run(), "getResourceData");  
            let counter = searchRes.length > 100 ? 100 : searchRes.length;
            if(searchRes)
            {
                for(let i=0 ; i<counter ; i++)
                {
                    let employeeId = searchRes[i].getValue({name: "resource"});
                    let projectId = searchRes[i].getValue({name: "project"});
                    let parentProject = searchRes[i].getValue({name: "custentity_clb_parentproject", join: "job"});
                    let projStartDate = searchRes[i].getValue({name: "startdate", join: "job"});
                    let projEndDate = searchRes[i].getValue({name: "custentity_clb_projct_end_dte", join: "job"});
                    let poObj = getPODetails(projectId, projStartDate, projEndDate);
                    if(!poObj)
                    {
                        if(parentProject)
                        {
                            poObj = getPODetails(parentProject, projStartDate, projEndDate);
                        }
                    }
                    let payRateData = getPayRateData(employeeId, projectId);
                    if(payRateData.length <=0 )
                    {
                        payRateData.push({"taskType": "", "payRate": 0, "effectiveDate": ""});
                    }                    
                    let billRateData = getBillRateData(employeeId, projectId);
                    if(billRateData.length <=0 )
                    {
                        billRateData.push({"taskType": "", "billRate": 0, "effectiveDate": ""});
                    }
                    let vendorDetails = getVendorDetails(projectId, projStartDate, projEndDate, employeeId);
                    let projectName = searchRes[i].getValue({name: "companyname", join: "job"}).split(":")[1];
                    resourceAllData.push({
                        "nsInternalId": searchRes[i].id,
                        "gciId": searchRes[i].getValue({name: "custentity_clb_entityid", join: "employee"}),
                        "employeeName": searchRes[i].getValue({name: "firstname", join: "employee"})+" "+searchRes[i].getValue({name: "lastname", join: "employee"}),
                        "hireDate": searchRes[i].getValue({name: "hiredate", join: "employee"}),
                        "lastWorkingDay": searchRes[i].getValue({name: "releasedate", join: "employee"}),                        
                        "projectId": searchRes[i].getValue({name: "entityid", join: "job"}),
                        "projectName": projectName.trim(),
                        "parentProject": searchRes[i].getText({name: "custentity_clb_parentproject", join: "job"}).split(" ")[0],
                        "projectDescription": projectName.trim(),//searchRes[i].getValue({name: "companyname", join: "job"}),
                        "projectType": searchRes[i].getText({name: "custentity_clb_projecttypeforinvoicing", join: "job"}),
                        "taskId": searchRes[i].getValue({name: "custevent_clb_prjct_workl_tsk_id"}),
                        "clientId": searchRes[i].getText({name: "customer", join: "job"}).split(" ")[0],
                        "projStartDate": projStartDate,
                        "projEndDate": projEndDate,
                        "poDetails": poObj,
                        "vendorDetails": vendorDetails,
                        "payRate": payRateData,
                        "billRate": billRateData
                    });
                    log.debug({title: "resourceAllData", details: resourceAllData});
                }
            }
            return resourceAllData;
        } 
        catch (ex) 
        {
            log.error({title: "Get Resource", details: ex});
        }
    };
    const getPODetails = (projectId) =>{
        try 
        {
            let poObjArr = [];
            let searchObj = search.create({
                type: "customrecord_ascendion_cust_po_details",
                filters:[
                    ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectId]
                ],
                columns:[
                    {name: "created", sort: search.Sort.DESC},
                    {name: "custrecord_asc_cpd_cust_po_num"},
                    {name: "custrecord_asc_cpd_start_date"},
                    {name: "custrecord_asc_cpd_end_date"}
                ]
            });
            let searchRes = getAllResults(searchObj.run(), "getPODetails");  
            if(searchRes)
            {
                for(let i=0 ; i<searchRes.length ; i++)
                {
                    poObjArr.push({
                        "poNumber": searchRes[i].getValue({name: "custrecord_asc_cpd_cust_po_num"}),
                        "startDate": searchRes[i].getValue({name: "custrecord_asc_cpd_start_date"}),
                        "endDate": searchRes[i].getValue({name: "custrecord_asc_cpd_end_date"})
                    });
                }
            }
            return poObjArr;
        } 
        catch (ex) 
        {
            log.error({title: "Get PO Details", details: ex});
        }
    };
    const getVendorDetails = (projectId, projStartDate, projEndDate, employeeId) =>{
        try 
        {
            let vendorDetailsArr = [], filters = [["custrecord_clb_subcon_project", "anyof", projectId], "AND",  ["custrecord_clb_originalstartdate", "on", projStartDate], "AND"];
            if(projEndDate)
            {
                filters.push(["custrecord_clb_originalenddate", "on", projEndDate], "AND");
            }
            if(employeeId)
            {
                filters.push(["custrecord_clb_subconresource", "anyof", employeeId]);
            }
            let vendorSearchObj = search.create({
                type: "customrecord_clb_subconvendor",
                filters: filters,
                columns: [
                    {name: "custrecord_clb_vendor"},
                    {name: "custrecord_clb_originalstartdate"},
                    {name: "custrecord_clb_originalenddate"},
                    {name: "created", sort: search.Sort.DESC}
                ]
            });
            let vendorSearchRes = vendorSearchObj.run().getRange({start: 0, end: 1000});
            if(vendorSearchRes.length > 0)
            {
                for(let j=0 ; j<vendorSearchRes.length ; j++)
                {
                    vendorDetailsArr.push({
                        "vendor": vendorSearchRes[j].getText({name: "custrecord_clb_vendor"}),
                        "startDate": vendorSearchRes[j].getValue({name: "custrecord_clb_originalstartdate"}),
                        "endDate": vendorSearchRes[j].getValue({name: "custrecord_clb_originalenddate"})
                    });
                }
            }
            return vendorDetailsArr;
        } 
        catch (ex) 
        {
            log.error({title: "Get Resource Vendor Details", details: ex});
        }
    };
    const getPayRateData = (employeeId, projectId) =>{
        try
        {
            let payRateData = [];
            let searchObj = search.create({
                type: "customrecord_clb_subcontask",
                filters: [
                   ["custrecord_clb_proj", "anyof", projectId], "AND", 
                   ["custrecord_clb_subcontaskrecord", "anyof", employeeId] , "AND", 
                   ["custrecord_clb_tastype", "anyof", "1", "2"]
                ],
                columns: [                    
                    {name: "created", sort: search.Sort.DESC},
                    {name: "custrecord_clb_payrate"},
                    {name: "custrecord_clb_tastype"},
                    {name: "custrecord_clb_start_date"}
                ]
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 999});
            if(searchRes.length > 0)
            {                
                for(let i=0 ; i<searchRes.length ; i++)
                {
                    payRateData.push({
                        "taskType": getTaskType(searchRes[i].getValue({name: "custrecord_clb_tastype"})),
                        "payRate": searchRes[i].getValue({name: "custrecord_clb_payrate"}),
                        "effectiveDate": searchRes[i].getValue({name: "custrecord_clb_start_date"})
                    });
                }
            }
           /*  else
            {
                payRateData.push({"taskType": "", "payRate": 0, "effectiveDate": ""});
            }  */           
            return payRateData;
        }
        catch(ex)
        {
            log.debug({title: "Get Pay Rate Data", details: ex});
        }
    };
    const getBillRateData = (employeeId, projectId) =>{
        try
        {
            let billRateData = [];
            let searchObj = search.create({
                type: "customrecord_clb_subconbillrate",
                filters: [
                   ["custrecord_clb_proj_bill", "anyof", projectId], "AND", 
                   ["custrecord_clb_subconbillrecord", "anyof", employeeId] , "AND", 
                   ["custrecord_clb_tastype_bill", "anyof", "1", "2"]
                ],
                columns: [
                   {name: "created", sort: search.Sort.DESC},
                   {name: "custrecord_clb_tastype_bill"},
                   {name: "custrecord_clb_billrate"},
                   {name: "custrecord_clb_eff_date"}
                ]
            });
            let searchRes = searchObj.run().getRange({start: 0, end: 999});
            if(searchRes.length > 0)
            {
                for(let i=0 ; i<searchRes.length ; i++)
                {
                    billRateData.push({
                        "taskType": getTaskType(searchRes[i].getValue({name: "custrecord_clb_tastype_bill"})),
                        "billRate": searchRes[i].getValue({name: "custrecord_clb_billrate"}),
                        "effectiveDate": searchRes[i].getValue({name: "custrecord_clb_eff_date"})
                    }); 
                }
            }
            /* else
            {
                billRateData.push({"taskType": "", "billRate": 0, "effectiveDate": ""});
            } */
            return billRateData;
        }
        catch(ex)
        {
            log.debug({title: "Get Bill Rate Data", details: ex});
        }
    };    
	const getAllResults = (searchObj, functionName) =>{
        try
        {
            let start = 0;
            let totalResults = new Array();
            do {
                if(searchObj != null && searchObj != "") 
                {
                    var results = searchObj.getRange({ start: start, end: start + 1000 });
                    for(let s = 0; s < results.length; s++) 
                    {
                        start++;
                        totalResults[totalResults.length] = results[s];
                    }
                }
            } while (results.length >= 1000);
            return totalResults;
        } 
        catch (ex) 
        {
            log.error({title: "Get All Result "+functionName, details: ex});
        }
	};
    const updateInternalId = (internalId) =>{
        try 
        {
            record.submitFields({
                type: "scriptdeployment",
                id: "7528",
                values: {
                    custscript_last_internalid: internalId
                }
            });
        } 
        catch(ex) 
        {
            log.error({title: "Update Last Internal Id", details: ex});
        }
    };
    const getTaskType = (taskType) =>[{"1": "ST", "2": "OT", "3": "DT", "4": "Fix-Bid", "5": "Sick Time", "6": "Holiday"}][0][taskType];
    return {get};
});