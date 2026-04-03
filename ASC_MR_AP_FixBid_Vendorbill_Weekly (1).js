/**
** @NApiVersion 2.1
** @NScriptType MapReduceScript
** @NModuleScope SameAccount
*
** @libraries used:
                    
 
 -- Date--      -- Modified By--      --Requested By--     --Description
DD-MM-YYYY        Employee Name         Client Name           One line description
 
 */
define(['N/search', 'N/record', 'N/runtime','N/query','N/format',"./Projects/Library/Project Library.js"],
    function (search, record, runtime,query,format,lib) {
        function getInputData() {
            try {
                log.audit('getInputData', 'Start');
                var scriptObj = runtime.getCurrentScript();
                var deploymentID  = scriptObj.deploymentId;
                log.debug('getInputData', 'Deployment Id: ' + deploymentID);
                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly'){
                    var today = new Date();
                    var formattedDate = format.format({
                        value: today,
                        type: format.Type.DATETIME,
                        timezone: 'America/New_York'
                    })
                    var sysdate = new Date(formattedDate);
                    log.debug("getInputData:", " tempDate: " + sysdate + " : day is: " + sysdate.getDay());
                    var day = sysdate.getDay();
                    if(day == 0){
                        day = 7;
                    }
                    var nstoDt = ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
                        + ('0' + sysdate.getDate()).slice(-2) + '/'
                        + sysdate.getFullYear();
    
                     
                    var fromDate = new Date(formattedDate);
                    fromDate.setDate(fromDate.getDate() - 6);    
                    var nsfromDt = ('0' + (fromDate.getMonth() + 1)).slice(-2) + '/'
                    + ('0' + (fromDate.getDate())).slice(-2) + '/'
                    + fromDate.getFullYear();
                    log.debug("getInputData: Today's Day is: + nstoDt : nsfromDt" , day + " : " + nstoDt + " : "+nsfromDt)   

                    var queryStr = "SELECT resVend.custrecord_clb_subcon_vb_date,resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle, job.custentity_clb_projecttypeforinvoicing,resVend.id, resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_originalstartdate <= '"+nstoDt+"') AND  (resVend.custrecord_clb_originalenddate >= '"+nsfromDt+"') AND (resVend.custrecord_clb_newapbased IN (4)) AND (resVend.custrecord_clb_subcon_vb_date < '" + nstoDt+ "' OR resVend.custrecord_clb_subcon_vb_date IS NULL) AND (job.custentity_clb_lastday = '"+ day+"' ) AND (job.custentity_clb_lastday = '7' ) AND (resVend.custrecord_clb_vendor NOT IN (26824,26607,26509,26508,63269))";
                    log.debug("getInputData : queryStr " , queryStr)    
                    var results = query.runSuiteQL({ query: queryStr });
                    var projectDetails = results.asMappedResults();
                    log.debug("project found: ", projectDetails.length)
                    if(projectDetails.length>0){
                        return projectDetails;
                    }
                    else{
                        log.debug("No resource detail found to process today.")
                    }
                }
                else{
                  //  var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource,resVend.custrecord_clb_workflowid, job.ID,job.custentity_clb_bilcycle,job.custentity_clb_projecttypeforinvoicing,resVend.id,resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus,resAlloc.custevent_actual_startdate,resAlloc.endDate FROM job AS job INNER JOIN customrecord_clb_subconvendor AS resVend ON job.ID = resVend.custrecord_clb_subcon_project INNER JOIN resourceAllocation AS resAlloc ON job.ID = resAlloc.project WHERE job.custentity_clb_projecttypeforinvoicing IN (5) AND resVend.custrecord_clb_subconresource IS NOT NULL AND resVend.custrecord_clb_newapbased IN (4) AND (resVend.custrecord_clb_msng_vb_dates IS NOT NULL) AND resVend.custrecord_clb_workflowid = resAlloc.custevent_clb_prjct_workl_tsk_id AND (resVend.custrecord_clb_vendor NOT IN (26187,26824,26607,26509,26508,63269))"
                    var queryStr ="SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle, job.custentity_clb_projecttypeforinvoicing,resVend.id, resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_newapbased IN (4)) AND (resVend.custrecord_clb_msng_vb_dates IS NOT NULL) AND (resVend.custrecord_clb_vendor NOT IN (26824,26607,26509,26508,63269))"
                    // var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_bilcycle, job.custentity_clb_projecttypeforinvoicing,resVend.id, resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_newapbased IN (4)) AND (resVend.custrecord_clb_msng_vb_dates IS NOT NULL)"; //AND (resVend.custrecord_clb_msng_vb_dates IS NOT NULL)
                    log.debug("getInputData : queryStr " , queryStr)    
                    var results = query.runSuiteQL({ query: queryStr });
                    var projectDetails = results.asMappedResults();
                    log.debug("project found: ", projectDetails.length);
                    
                    var projObj = {};
                    if(projectDetails.length>0){

                        for(var ii=0;ii<projectDetails.length;ii++){
                            var projectId = projectDetails[ii].id;
                            
                            var dateString = projectDetails[ii].custrecord_clb_msng_vb_dates;
                            var dateArray = dateString.split(",");
                            var startDate, endDate;
                            var dataArray = [];
                            for (var i = 0; i<dateArray.length; i++) {
                               
                                var values = {};
                                
                                // startDate = new Date(startDate);
                                // startDate.setDate(startDate.getDate() + 7);    
                                // var nsfromDt = ('0' + (startDate.getMonth() + 1)).slice(-2) + '/'
                                // + ('0' + (startDate.getDate())).slice(-2) + '/'
                                // + startDate.getFullYear();

                                // endDate = new Date(endDate);
                                // endDate.setDate(endDate.getDate() + 7);    
                                // var nstodate = ('0' + (endDate.getMonth() + 1)).slice(-2) + '/'
                                // + ('0' + (endDate.getDate())).slice(-2) + '/'
                                // + endDate.getFullYear();

                                if (dateArray[i]) {
                                    values["id"] = projectId;
                                    values["id_0"] = projectDetails[ii].id_0;
                                   var tempDate = dateArray[i].split(":");
                                    startDate = tempDate[0];
                                    endDate = tempDate[1];
                                    log.debug("startDate:endDate",startDate + " : "+endDate)
                                    values["custrecord_clb_originalstartdate"] = projectDetails[ii].custrecord_clb_originalstartdate;
                                    values["custrecord_clb_originalenddate"] = projectDetails[ii].custrecord_clb_originalenddate;
                                    values["custevent_actual_startdate"] = projectDetails[ii].custevent_actual_startdate;
                                    values["enddate"] = projectDetails[ii].enddate;
                                    values["custrecord_bln_strt_dte"] = startDate;
                                    values["custrecord_blng_end_dte"] = endDate;
                                    values["custrecord_clb_msng_vb_dates"] = dateString;
                                    values["custrecord_clb_vendor"] = projectDetails[ii].custrecord_clb_vendor;
                                    values["custrecord_clb_subcon_terms"] = projectDetails[ii].custrecord_clb_subcon_terms;
                                    values["custrecord_clb_newapbased"] = projectDetails[ii].custrecord_clb_newapbased;
                                    values["custrecord_clb_paymode"] = projectDetails[ii].custrecord_clb_paymode;
                                    values["custrecord_clb_subconresource"] = projectDetails[ii].custrecord_clb_subconresource;
                                    values["custrecord_asc_subcon_paystatus"] = projectDetails[ii].custrecord_asc_subcon_paystatus;
                                    // var key = projectId + "_" + i;
                                    // log.debug("key",key)
                                   // projObj[key] = values;
                                   dataArray.push(values)
                                }
                            }
                            var key = projectId + "_" + ii;
                            projObj[key] = dataArray;
                        }
                        log.debug("project Details :",JSON.stringify(projObj) )
                        return projObj;
                    }else{
                        log.audit("No projects found with Missing Vendor Bill Dates")
                    }

                }
                
            } catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }
 
        }
 
        function reduce(context) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var deploymentID  = scriptObj.deploymentId;
                var key = context.key;
                var resourceDetailsArray = JSON.parse(context.values[0])
                log.debug("Reduce Stage: projectDetails key: "+key , JSON.stringify(resourceDetails));
                for (var resourceindex = 0; resourceindex < resourceDetailsArray.length; resourceindex++) {
                    var resourceDetails = resourceDetailsArray[resourceindex];
                    log.debug("resourceDetails", resourceDetails);
                var nsToDt;
                var nsfrmDt;
                var projectID = resourceDetails.id;
                var projectLookUp = search.lookupFields({
                    type: "job",
                    id: projectID,
                    columns: ['subsidiary']
                });
                var projSubsidiary =   projectLookUp.subsidiary[0].value;
                if(projSubsidiary == 4){
                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly'){
                    var today = new Date();
                    var formattedDate = format.format({
                        value: today,
                        type: format.Type.DATETIME,
                        timezone: 'America/New_York'
                    })
                    var sysdate = new Date(formattedDate);
                    var fromDate = new Date(formattedDate);
                    fromDate.setDate(fromDate.getDate() - 6);


                    nsToDt = ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
                        + ('0' + sysdate.getDate()).slice(-2) + '/'
                        + sysdate.getFullYear();
                    nsfrmDt = ('0' + (fromDate.getMonth() + 1)).slice(-2) + '/'
                        + ('0' + (fromDate.getDate())).slice(-2) + '/'
                        + fromDate.getFullYear();
                    // nsToDt= "01/07/2024"
                    // nsfrmDt= "01/01/2024"
                    log.debug("before nsfrmDt:nsToDt", nsfrmDt + ":"+nsToDt);  
                    
                }
                else{
                    nsToDt = resourceDetails.custrecord_blng_end_dte;
                    nsfrmDt = resourceDetails.custrecord_bln_strt_dte;
                    
                    log.debug("nsfrmDt:nsToDt", nsfrmDt + ":"+nsToDt);  
                }
                //var vendstrtDate = resourceDetails.custevent_actual_startdate;
                //var vendEndDate = resourceDetails.enddate;
                    var vendstrtDate = resourceDetails.custrecord_clb_originalstartdate;
                    var vendEndDate = resourceDetails.custrecord_clb_originalenddate;
                    if(new Date(vendstrtDate) > new Date(nsfrmDt)){
                        nsfrmDt = vendstrtDate;
                    }
                    if(new Date(vendEndDate) < new Date(nsToDt)){
                        nsToDt = vendEndDate;
                    }  
                    log.debug("after nsfrmDt:nsToDt", nsfrmDt + ":"+nsToDt);  

               
                var missingVendorBillDates = resourceDetails.custrecord_clb_msng_vb_dates?resourceDetails.custrecord_clb_msng_vb_dates:'';
                

                var vendorID = resourceDetails.custrecord_clb_vendor;
                var term = resourceDetails.custrecord_clb_subcon_terms;
                var apbased = resourceDetails.custrecord_clb_newapbased
                var paymentMode = resourceDetails.custrecord_clb_paymode;
                var employee = resourceDetails.custrecord_clb_subconresource;
                var resVendId = resourceDetails.id_0;
                var payStatus = resourceDetails.custrecord_asc_subcon_paystatus;

                    var trackTimeObj = search.create({
                        type: "timebill",
                        filters:
                        [
                            ["billable","is","T"],
                            "AND",
                            ["customer","anyof",projectID], 
                            "AND", 
                            ["date","within",nsfrmDt,nsToDt], 
                            "AND", 
                            ["custcol_asc_timesheet_status","anyof","2"], 
                             "AND",
                             ["custcol_clb_vendor_bill_link","anyof","@NONE@"],
                             "AND", 
                             ["employee","anyof",employee]
                        ],
                        columns:
                        [
                            search.createColumn({name: "custcol_asc_payrete", label: "Pay Rate"}),
                            search.createColumn({
                                name: "internalid",
                                join: "item",
                             }),
                            search.createColumn({name: "durationdecimal"})
                        ]
                    });
                     var searchResultCount = trackTimeObj.runPaged().count;
                     log.debug("Reduce Stage: track time result count",searchResultCount);
                     var vendorBillDetails = {};
                        if(searchResultCount>0){
                            trackTimeObj.run().each(function(result){
                                var trackTimeID = result.id;
                                var taskID = result.getValue({
                                    name: "internalid",
                                    join: "item",
                                 });
                                
                                var payRate = result.getValue("custcol_asc_payrete")?result.getValue("custcol_asc_payrete"):0;
                                taskID = taskID +"_"+ payRate;
                                var hoursDecimal = result.getValue("durationdecimal")?result.getValue("durationdecimal"):0;
                                
                                //log.debug("If Key is present" , vendorBillDetails.hasOwnProperty(taskID));
                                if(!vendorBillDetails.hasOwnProperty(taskID)){
                                    var trackTimeDetails = {
                                        "tracktimeId" : [],
                                        "hours" : 0,
                                        "payRate": 0,
                                        
                                     };
                                    vendorBillDetails[taskID] = trackTimeDetails;
                                    
                                }
                                vendorBillDetails[taskID]["tracktimeId"].push(trackTimeID);
                                vendorBillDetails[taskID]["hours"] = parseFloat(vendorBillDetails[taskID]["hours"]) + parseFloat(hoursDecimal);
                                if(vendorBillDetails[taskID]["payRate"] == 0){
                                    vendorBillDetails[taskID]["payRate"] = payRate;
                                }
                                
                                return true;
                             });
                             log.debug("vendorBillDetails", JSON.stringify(vendorBillDetails));
                             var vendBillID = createVendorBill(vendorBillDetails,projectID,nsfrmDt,nsToDt,vendorID,term,paymentMode,employee,payStatus,apbased);
                             log.debug("Reduce Stage: vendBillID: ",vendBillID);
                             var currentmissingDates = nsfrmDt + ":" +nsToDt + ",";
                             if(vendBillID){
                                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly'){
                                    if(missingVendorBillDates && missingVendorBillDates.indexOf(currentmissingDates)>-1){
                                        var newMissingInvoices = missingVendorBillDates.replace(currentmissingDates,'');
                                        var resourceVendId = record.submitFields({
                                            type: 'customrecord_clb_subconvendor',
                                            id: resVendId,
                                            values: {
                                                "custrecord_clb_msng_vb_dates": newMissingInvoices,
                                                "custrecord_clb_subcon_vb_date": new Date()  
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                                                                
                                         log.debug("Search for the log created for Missing Timecard and delete if available.")
                                            var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
                                                type: "customrecord_asc_trnsctn_crtn_rprt_arap",
                                                filters:
                                                [
                                                   ["custrecord_asc_period_strt_date","on",nsfrmDt], 
                                                   "AND", 
                                                   ["custrecord_asc_period_end_date","on",nsToDt], 
                                                   "AND", 
                                                   ["custrecord_asc_transaction_type","anyof","2"], 
                                                   "AND", 
                                                   ["custrecord_asc_project_id","anyof",projectID], 
                                                   "AND", 
                                                   ["custrecord_asc_employee","anyof",employee]
                                                ],
                                                columns:
                                                []
                                             });
                                             var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
                                             log.debug("transaction error report result count",searchResultCount);
                                             customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.run().each(function(result){
                                                var transactionerr = record.delete({
                                                    type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
                                                    id: result.id,
                                                    });
                                                log.debug("transaction report record deleted id",transactionerr)    
                                                return true;
                                             });
                                    }
                                    else{
                                        var resourceVendId = record.submitFields({
                                            type: 'customrecord_clb_subconvendor',
                                            id: resVendId,
                                            values: {
                                               "custrecord_clb_subcon_vb_date": new Date()  
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    }
                                }
                                else{
                                    log.debug("Search for the log created for Missing Timecard and delete if available.")
                                            var customrecord_asc_trnsctn_crtn_rprt_arapSearchObj = search.create({
                                                type: "customrecord_asc_trnsctn_crtn_rprt_arap",
                                                filters:
                                                [
                                                   ["custrecord_asc_period_strt_date","on",nsfrmDt], 
                                                   "AND", 
                                                   ["custrecord_asc_period_end_date","on",nsToDt], 
                                                   "AND", 
                                                   ["custrecord_asc_transaction_type","anyof","2"], 
                                                   "AND", 
                                                   ["custrecord_asc_project_id","anyof",projectID], 
                                                   "AND", 
                                                   ["custrecord_asc_employee","anyof",employee]
                                                ],
                                                columns:
                                                []
                                             });
                                             var searchResultCount = customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.runPaged().count;
                                             log.debug("transaction error report result count",searchResultCount);
                                             customrecord_asc_trnsctn_crtn_rprt_arapSearchObj.run().each(function(result){
                                                var transactionerr = record.delete({
                                                    type: 'customrecord_asc_trnsctn_crtn_rprt_arap',
                                                    id: result.id,
                                                    });
                                                log.debug("transaction report record deleted id",transactionerr)    
                                                return true;
                                             });
                                     context.write({ key: resVendId, value: currentmissingDates })
                                }
                                
                             }
                             else{
                                log.debug("ERROR WHILE CREATING VENDOR BILL")
                                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly'){
                                    var resourceVendId = record.submitFields({
                                        type: 'customrecord_clb_subconvendor',
                                        id: resVendId,
                                        values: {
                                           "custrecord_clb_subcon_vb_date": new Date()  
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                }else{
                                    var currentmissingDates = nsfrmDt + ":" +nsToDt + ",";
                                    context.write({ key: resVendId, value: currentmissingDates })
                                }
                                

                             }
                                
                            }
                            else{
                                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_weekly'){
                                    log.debug("Reduce Stage: Set Missing Dates on project: missing Vendor Bills-", missingVendorBillDates);
                                    var currentmissingDates = nsfrmDt + ":" +nsToDt + ",";
                                    var newMissingDates = '';
                                    if(missingVendorBillDates.indexOf(currentmissingDates) == -1){ 
                                            log.debug("Dates are not present in the missing Vendor Bill field")
                                            newMissingDates = missingVendorBillDates+currentmissingDates;
                                    }
                                    
                                     if(missingVendorBillDates != newMissingDates && newMissingDates != ''){
                                        log.debug("missingVendorBillDates setting on project")
                                        var resourceVendId = record.submitFields({
                                            type: 'customrecord_clb_subconvendor',
                                            id: resVendId,
                                            values: {
                                                "custrecord_clb_msng_vb_dates": newMissingDates 
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                        var errID = lib.trnsctnFailureRec(nsfrmDt,nsToDt,"Failure in Vendor Bill Creation. Timecards are missing for the Project.",2,projectID,employee)
                                        log.error("Error: Created the Transaction Error ID", errID);
                                     } 
                                }
                                else{
                                      log.debug("Track Time is still missing for the project")
                                }
                                  
                                 
                            }
                  }
                }
                
                
            } catch (e) {
                log.debug("Errot at Stage : Reduce", JSON.stringify(e))
           }
        }
        function createVendorBill(vendorBillDetails,projectID,billingStartDate,billingEndDate,vendorID,term,paymentMode,employee,payStatus,apbased){
            try{
                //log.debug("vendorBillDetails: " ,JSON.stringify(vendorBillDetails));
                
                log.debug("createVendorBill","Vendor Bill creation function for the project: "+projectID + " employee: "+employee)
                var vendorLookup = search.lookupFields({
                    type: "vendor",
                    id: vendorID,
                    columns: ['representingsubsidiary','custentity_on_hold','custentity_clb_1099_eligible']
                });
                var repreSub = vendorLookup.representingsubsidiary;
                log.debug("vendorLookup",JSON.stringify(vendorLookup))
                var employeeLookUp = search.lookupFields({
                    type: "employee",
                    id: employee,
                    columns: ['custentity_clb_entityid','custentity_asc_ref_number','releasedate']
                })
                var eligible = vendorLookup.custentity_clb_1099_eligible;
                var vendhold = vendorLookup.custentity_on_hold;
                var entityId = employeeLookUp.custentity_clb_entityid;
                var refNum = employeeLookUp.custentity_asc_ref_number;
                var terminationDate;
                if(employeeLookUp.releasedate){
                    terminationDate = new Date(employeeLookUp.releasedate);
                }
                var serviceStartDate = new Date(billingStartDate);
                var serviceEndDate = new Date(billingEndDate);
                var lastconsultantInv = false;
                if(terminationDate>serviceStartDate && terminationDate<=serviceEndDate && terminationDate){
                    log.debug("termination date is between start and end date of service period")
                    billingEndDate = employeeLookUp.releasedate;
                    lastconsultantInv = true;
                }
                if(refNum){
                    refNum = parseInt(refNum)+1;
                    
                }
                else{
                    refNum = 1;
                }
                entityId = entityId+"_"+refNum;
                if(terminationDate<serviceStartDate && terminationDate){
                    log.debug("Employee is already terminated.")
                    log.error("Transaction Failure Report creation")
                    var errID = lib.trnsctnFailureRec(billingStartDate,billingEndDate,"Vendor Bill Creation Failed because Employee "+entityId+" is already terminated.",2,projectID,employee)
                    log.error("Error in createVendor: Created the Transaction Error ID", errID);
                }else{
                    var vendorBillObj = record.create({
                        type: 'vendorbill',
                        isDynamic: true
                        });
                        vendorBillObj.setValue("entity",vendorID)
                        vendorBillObj.setValue("terms",term);
                        vendorBillObj.setValue("custbody_asc_ap_based",apbased);
                        vendorBillObj.setValue("custbody_clb_startdate",new Date(billingStartDate))
                        vendorBillObj.setValue("custbody_clb_enddate",new Date(billingEndDate))
                        vendorBillObj.setValue("custbody_clb_paymentmode",paymentMode);
                        vendorBillObj.setValue("custbodyclb_vendorbillcatory",5);
                        vendorBillObj.setValue("custbody_asc_inv_project_selected",projectID);
                        var terms = vendorBillObj.getText("terms");
                        log.debug("terms",terms)
                        
                        if(terms == "Pay When Paid" || payStatus == "2" || vendhold == true){
                            vendorBillObj.setValue("paymenthold",true)
                        }
                        if(eligible){
                            vendorBillObj.setValue("custbody_asc_1099_eligible",true)
                        }
                        if(lastconsultantInv){
                            vendorBillObj.setValue("custbody_clb_lastconsultantbill",true);
                        }
                        vendorBillObj.setValue("tranid",entityId);
                        if(repreSub.length>0){
                            vendorBillObj.setValue("approvalstatus",2);
                        }
                        var timeSheetconsolidatedIDs = [];
                        Object.keys(vendorBillDetails).forEach(function(key) {
                            log.debug('Key : ' + key,'Value : ' + JSON.stringify(vendorBillDetails[key]));

                            var trackTimeDetails = vendorBillDetails[key]
                            timeSheetconsolidatedIDs = timeSheetconsolidatedIDs.concat(trackTimeDetails["tracktimeId"]);
                            
                            var quantity  = parseFloat(trackTimeDetails["hours"])
                            var timeRate = parseFloat(trackTimeDetails["payRate"]);
                            log.debug("Vendor Bill creation Function: quantity and timerate " , quantity + " : " + timeRate)
    
                            log.debug("Key",key.split("_")[0])
                        if(timeRate > 0 && quantity > 0){
                            vendorBillObj.selectNewLine({
                                sublistId: 'item'
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: key.split("_")[0]
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: quantity
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: timeRate
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_clb_subconemployee',
                                value: employee
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'customer',
                                value: projectID
                            });
                            vendorBillObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'isbillable',
                                value: false
                            });
                            vendorBillObj.commitLine({
                                sublistId: 'item'
                            });
                        }
                           
                      
                        });
                        log.debug("timeSheetconsolidatedIDs: timeSheetconsolidatedIDs.length", timeSheetconsolidatedIDs + " : "+ timeSheetconsolidatedIDs.length)
                       
                        vendorBillObj.setValue("custbody_asc_createdfromtimetrack",timeSheetconsolidatedIDs); //use settext if doesnt work
                         var vendorID;
                         var vbAmt = vendorBillObj.getValue("total");
                         if(vbAmt>0){
                         vendorID= vendorBillObj.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                    }
                    else{
                        throw {message: "Vendor Bill Amount is less than 0 due to 0 hours or 0 Pay Rate for the week." }
                    }
                        if(vendorID){
                            var vendorCrditId = ""
                            if(repreSub.length>0  || vendorID == 33313) {
                                //  var entityId = vbObj.getValue('tranid');
                                     var cmentityId = "VC_"+entityId+"_REV"
                                      log.debug("Reversing VB as it is intercompany vendor")
                                      var vendorCredit = record.transform({
                                          fromType: record.Type.VENDOR_BILL,
                                          fromId: vendorID,
                                          toType: record.Type.VENDOR_CREDIT,
                                          isDynamic: true,
                                      });
                                      vendorCredit.setValue("tranid",cmentityId)
                                      vendorCredit.setValue("taxdetailsoverride",true)
                                      vendorCredit.setValue("memo", "Vendor Bill Reversed due to Intercompany Vendor")
                                      var vbLineNumber = vendorCredit.findSublistLineWithValue({
                                          sublistId: 'apply',
                                          fieldId: 'internalid',
                                          value: vendorID
                                      });
                                      log.debug("vbLineNumber", vbLineNumber)
                                      if (vbLineNumber >= 0) {
                                          vendorCredit.selectLine({
                                              sublistId: 'apply',
                                              line: vbLineNumber
                                          });
                                          vendorCredit.setCurrentSublistValue({
                                              sublistId: 'apply',
                                              fieldId: 'apply',
                                              value: true
                                          });
                                          vendorCredit.commitLine({
                                              sublistId: 'apply'
                                          });
              
                                      }
                                      vendorCrditId = vendorCredit.save({
                                          enableSourcing: false,
                                          ignoreMandatoryFields: true
                                      });
                                      log.debug("Vendor Bill Reversed due to intercompany vendor",vendorCrditId)
                              }
                            for(var ii = 0;ii<timeSheetconsolidatedIDs.length;ii++){
                                var subVal = {
                                    "custcol_clb_vendor_bill_link": vendorID
                                }
                                if(vendorCrditId){
                                    subVal["custcol_clb_vendor_credit"] = vendorCrditId
                                }
                                record.submitFields({
                                    type: record.Type.TIME_BILL,
                                    id: timeSheetconsolidatedIDs[ii],
                                    values: subVal,
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                })
                            }
                            record.submitFields({
                                type: record.Type.EMPLOYEE,
                                id: employee,
                                values: {
                                    "custentity_asc_ref_number": refNum
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            })
                            
    
                        }
                        
                        return vendorID;
                }
                

            }catch(e){
                log.debug("Error at Stage : createVendorBill function", JSON.stringify(e))
                var errID = lib.trnsctnFailureRec(billingStartDate,billingEndDate,"Failure in Vendor Bill Creation due: "+e.message,2,projectID,employee)
                log.error("Error in createVendorBill: Created the Transaction Error ID", errID);
            }
           
                
        }
        function summarize(context){
            log.debug("reduce summary:" , JSON.stringify(context.reduceSummary))
            var scriptObj = runtime.getCurrentScript();
            var deploymentID  = scriptObj.deploymentId;
            if(deploymentID == 'customdeploy_asc_mr_ap_fxbd_msng_vb_wkly'){
                var missingVBObj = {};
                context.output.iterator().each(function (key, value) {
                    log.debug("Summarize", "Key : " + key + "; Value : " + JSON.stringify(value));
                    if (!missingVBObj.hasOwnProperty(key)) {
                        missingVBObj[key] = [];
                        missingVBObj[key].push(value);
                    }
                    missingVBObj[key].push(value);
                    return true;
                })
                log.debug("Summarize", "missingOnvObj : " + JSON.stringify(missingVBObj));
                Object.keys(missingVBObj).forEach(function (key) {

                    var values = missingVBObj[key];

                    var projectLookUp = search.lookupFields({
                        type: 'customrecord_clb_subconvendor',
                        id: key,
                        columns: ['custrecord_clb_msng_vb_dates']
                    })

                    var currentMissingVBDate = projectLookUp.custrecord_clb_msng_vb_dates?projectLookUp.custrecord_clb_msng_vb_dates:'';
                    log.debug("Summarize", "currentMissingVBDate Before : " + currentMissingVBDate);
                    values.forEach(function (value) {
                        currentMissingVBDate = currentMissingVBDate.replace(value, "");
                    })
                    log.debug("Summarize", "currentMissingVBDate After : " + currentMissingVBDate);
                    
                        var resourceVndId = record.submitFields({
                            type: 'customrecord_clb_subconvendor',
                            id: key,
                            values: {
                                "custrecord_clb_msng_vb_dates": currentMissingVBDate
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        log.debug("summarize: " ,"resourceVndId updated: "+resourceVndId)
                    });

            }
        }    
        return {
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });