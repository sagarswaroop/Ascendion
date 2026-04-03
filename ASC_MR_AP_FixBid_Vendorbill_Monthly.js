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
                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_monthly'){
                   // var today = new Date();
                    var today = new Date();
                var formattedDate = format.format({
                    value: today,
                    type: format.Type.DATETIME,
                    timezone: 'America/New_York'
                })
                var sysdate = new Date("05/26/2024"); //todate  //formattedDate // need to paas formated date  03/31/2024
                log.debug("getInputData:", " tempDate: " + sysdate + " : day is: " + sysdate.getDay());
              
                var nstoDt = ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
                    + ('0' + sysdate.getDate()).slice(-2) + '/'
                    + sysdate.getFullYear();

                var lastSundayDate = lastSunday(sysdate.getFullYear(), sysdate.getMonth()+1)
                var lastSundayfrmt = ('0' + (lastSundayDate.getMonth() + 1)).slice(-2) + '/'
                    + ('0' + lastSundayDate.getDate()).slice(-2) + '/'
                    + lastSundayDate.getFullYear();

                var lastmonthSunday =  lastSunday(sysdate.getFullYear(), sysdate.getMonth());
                var nextDay = new Date(lastmonthSunday);
                nextDay.setDate(lastmonthSunday.getDate() + 1); 
                
                var nsfrmDt = ('0' + (nextDay.getMonth() + 1)).slice(-2) + '/'
                    + ('0' + (nextDay.getDate())).slice(-2) + '/'
                    + nextDay.getFullYear();
                log.debug("getInputData", nextDay + " : todays date"+sysdate)
                log.debug(" getInputData: nsfromdate : nstodate", nsfrmDt + " : "+ nstoDt)  
                log.debug("getInputData: Today's Day is : lastSundayfrmt " , lastSundayfrmt)  
             
              if(nstoDt == lastSundayfrmt){
                       var queryStr = "SELECT resVend.custrecord_clb_subcon_vb_date,resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_projecttypeforinvoicing,resVend.id,resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_originalstartdate <= '"+nstoDt+"') AND  (resVend.custrecord_clb_originalenddate >= '"+nsfrmDt+"') AND (resVend.custrecord_clb_newapbased IN (3))";// AND (resVend.custrecord_clb_subcon_vb_date < '" + nstoDt+ "' OR resVend.custrecord_clb_subcon_vb_date IS NULL)";//AND resVend.id = 12493
                        log.debug("getInputData : queryStr " , queryStr)    
                        var results = query.runSuiteQL({ query: queryStr });
                        var projectDetails = results.asMappedResults();
                        log.debug("project found: ", projectDetails.length)
                        if(projectDetails.length>0){
                            return projectDetails;
                        }
                        else{
                            log.debug("getInputData","No resource detail found to process today.")
                        }
                     }
                    else{
                        log.debug("getInputData","Sunday is not last sunday of the month hence no Vendor Bill Creation.")
                    }
                }else{
                    var queryStr = "SELECT resVend.custrecord_clb_originalstartdate,resVend.custrecord_clb_originalenddate,resVend.custrecord_clb_subcon_terms,resVend.custrecord_clb_newapbased,resVend.custrecord_clb_paymode,resVend.custrecord_clb_vendor,resVend.custrecord_clb_subconresource, job.ID, job.custentity_clb_projecttypeforinvoicing,resVend.id,resVend.custrecord_clb_msng_vb_dates,resVend.custrecord_asc_subcon_paystatus FROM customrecord_clb_subconvendor AS resVend LEFT JOIN job ON (resVend.custrecord_clb_subcon_project = job.ID) WHERE (job.custentity_clb_projecttypeforinvoicing IN (5)) AND (resVend.custrecord_clb_subconresource IS NOT NULL) AND (resVend.custrecord_clb_newapbased IN (3)) AND (resVend.custrecord_clb_msng_vb_dates IS NOT NULL)";
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
                            for (var i = 0; i < dateArray.length; i++) {
                                var values = {};
                                if (dateArray[i]) {
                                    values["id"] = projectId;
                                    values["id_0"] = projectDetails[ii].id_0;
                                    var tempDate = dateArray[i].split(":");
                                    startDate = tempDate[0];
                                    endDate = tempDate[1];
                                    values["custrecord_clb_originalstartdate"] = projectDetails[ii].custrecord_clb_originalstartdate;
                                    values["custrecord_clb_originalenddate"] = projectDetails[ii].custrecord_clb_originalenddate;
                                    values["custrecord_bln_strt_dte"] = startDate;
                                    values["custrecord_blng_end_dte"] = endDate;
                                    values["custrecord_clb_msng_vb_dates"] = dateString;
                                    values["custrecord_clb_vendor"] = projectDetails[ii].custrecord_clb_vendor;
                                    values["custrecord_clb_subcon_terms"] = projectDetails[ii].custrecord_clb_subcon_terms;
                                    values["custrecord_clb_newapbased"] = projectDetails[ii].custrecord_clb_newapbased;
                                    values["custrecord_clb_paymode"] = projectDetails[ii].custrecord_clb_paymode;
                                    values["custrecord_clb_subconresource"] = projectDetails[ii].custrecord_clb_subconresource;
                                    values["custrecord_asc_subcon_paystatus"] = projectDetails[ii].custrecord_asc_subcon_paystatus
                                    var key = projectId + "_" + i;
                                    projObj[key] = values;
                                }
                            }
                        }
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
                var resourceDetails = JSON.parse(context.values[0])
                log.debug("Reduce Stage: projectDetails" , JSON.stringify(resourceDetails));
                var scriptObj = runtime.getCurrentScript();
                var deploymentID  = scriptObj.deploymentId;
                var weekendingDays;
                var projectID = resourceDetails.id;
                var projectLookUp = search.lookupFields({
                    type: "job",
                    id: projectID,
                    columns: ['subsidiary']
                });
                var projSubsidiary =   projectLookUp.subsidiary[0].value;
                //var resourceDetails = JSON.parse(context.values[0]);
                if(projSubsidiary == 4){
                if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_monthly'){
                    var today = new Date();
                    var formattedDate = format.format({
                            value: today,
                            type: format.Type.DATETIME,
                            timezone: 'America/New_York'
                        })
                    var sysdate = new Date("05/26/2024");//"06/26/2023"//formattedDate // need to paas formated date 
                    //log.debug("getInputData:", " tempDate: " + sysdate + " : day is: " + sysdate.getDay());
                
                    var nsToDt = ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
                        + ('0' + sysdate.getDate()).slice(-2) + '/'
                        + sysdate.getFullYear();

                    var lastmonthSunday =  lastSunday(sysdate.getFullYear(), sysdate.getMonth());
                    var nextDay = new Date(lastmonthSunday);
                    nextDay.setDate(lastmonthSunday.getDate() + 1); 
                    
                    var nsfrmDt = ('0' + (nextDay.getMonth() + 1)).slice(-2) + '/'
                        + ('0' + (nextDay.getDate())).slice(-2) + '/'
                        + nextDay.getFullYear();
                        log.debug("reduce", nextDay + " : todays date"+sysdate)
                    log.debug(" Actual Dates: nsfromdate : nstodate", nsfrmDt + " : "+ nsToDt)  
                      
                    var vendstrtDate = resourceDetails.custrecord_clb_originalstartdate;
                    var vendEndDate = resourceDetails.custrecord_clb_originalenddate;
                    if(new Date(vendstrtDate) > new Date(nsfrmDt)){
                        nsfrmDt = vendstrtDate;
                    }
                    if(new Date(vendEndDate) < new Date(nsToDt)){
                        nsToDt = vendEndDate;
                    }  
                    log.debug(" After checking Vendor Details: nsToDt:nsfrmDt", nsfrmDt + ":"+nsToDt );   
                }
                else{
                    nsToDt = resourceDetails.custrecord_blng_end_dte;
                    nsfrmDt = resourceDetails.custrecord_bln_strt_dte;
                    log.debug("nsToDt:nsfrmDt", nsfrmDt + ":"+nsToDt );  
                }
                
                

                var missingVendorBillDates = resourceDetails.custrecord_clb_msng_vb_dates?resourceDetails.custrecord_clb_msng_vb_dates:'';
                
               // var customerID = resourceDetails.customer;
                var vendorID = resourceDetails.custrecord_clb_vendor;
                var term = resourceDetails.custrecord_clb_subcon_terms;
                var apbased = resourceDetails.custrecord_clb_newapbased
                var paymentMode = resourceDetails.custrecord_clb_paymode;
                var employee = resourceDetails.custrecord_clb_subconresource;
                var checkVendorBill = false;
                var resVendId = resourceDetails.id_0;
                var payStatus = resourceDetails.custrecord_asc_subcon_paystatus;
                weekendingDays = getDaysinMonth(nsfrmDt, nsToDt);

                log.debug("weekendingDays",weekendingDays)
                log.debug("Reduce: ", "Check Weekending Dates in Time Track:");
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
                             ["employee","anyof",employee],
                             "AND",
                             ["custcol_clb_weekendingdate","isnotempty",""], 
                        ],
                        columns:
                        [
                            search.createColumn({
                                name: "date",
                                summary: "GROUP"
                             })
                        ]
                    });
                    var wkendinTime = trackTimeObj.runPaged().count;
                    log.debug("Reduce Stage: Weekending Dates In Time",wkendinTime);      
                    if(wkendinTime >= weekendingDays)  {
                        checkVendorBill = true;
                        log.debug("Reduce Stage: Create checkVendorBill: ",checkVendorBill); 
                    }  

                    if(checkVendorBill){
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
                                    taskID = taskID + "_"+payRate
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
                                 if(vendBillID){
                                    var currentmissingDates = nsfrmDt + ":" +nsToDt + ",";
                                    if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_monthly'){
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
                                    if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_monthly'){
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
                                        log.debug("Set date on vendor details :",resourceVendId);
                                    }else{
                                        var currentmissingDates = nsfrmDt + ":" +nsToDt + ",";
                                        context.write({ key: resVendId, value: currentmissingDates })
                                    }
                                    log.debug("Vendor Bill Creation has been failed. Please check the Transaction Failure Report - AR/AP.")
                                 }
                                 
                                }
                    }else{
                        if(deploymentID == 'customdeploy_asc_mr_ap_fixbid_vb_monthly'){
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
                
            } catch (e) {
                log.debug("Errot at Stage : Reduce", JSON.stringify(e))
           }
        }
        function summarize(context){
            log.debug("reduce summary:" , JSON.stringify(context.reduceSummary))
            var scriptObj = runtime.getCurrentScript();
            var deploymentID  = scriptObj.deploymentId;
            if(deploymentID == 'customdeploy_asc_mr_ap_fxbd_msng_vb_mont'){
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
                        type: "customrecord_clb_subconvendor",
                        id: key,
                        columns: ['custrecord_clb_msng_vb_dates']
                    })

                    var currentMissingVBDate = projectLookUp.custrecord_clb_msng_vb_dates?projectLookUp.custrecord_clb_msng_vb_dates:'';
                    log.debug("Summarize", "currentMissingVBDate Before : " + currentMissingVBDate);
                    values.forEach(function (value) {
                        currentMissingVBDate = currentMissingVBDate.replace(value, "");
                    })
                    log.debug("Summarize", "currentMissingVBDate After : " + currentMissingVBDate);
                    
                        var subconVend = record.submitFields({
                            type: "customrecord_clb_subconvendor",
                            id: key,
                            values: {
                                "custrecord_clb_msng_vb_dates": currentMissingVBDate
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        log.debug("summarize: " ,"resourceVendId updated: "+subconVend)
                    });

            

            }
        }
        function createVendorBill(vendorBillDetails,projectID,billingStartDate,billingEndDate,vendorID,term,paymentMode,employee,payStatus,apbased){
            try{
                
                log.debug("createVendorBill","VendorBill creation function for the project: "+projectID + " employee: "+employee)
                var vendorLookup = search.lookupFields({
                    type: "vendor",
                    id: vendorID,
                    columns: ['representingsubsidiary','custentity_on_hold','custentity_clb_1099_eligible']
                });
                log.debug("vendorlookup",JSON.stringify(vendorLookup))
                var repreSub = vendorLookup.representingsubsidiary;
                log.debug("represent Subsidiary",repreSub)
                var eligible = vendorLookup.custentity_clb_1099_eligible;
                var vendhold = vendorLookup.custentity_on_hold;
                var employeeID = search.lookupFields({
                    type: "employee",
                    id: employee,
                    columns: ['custentity_clb_entityid','custentity_asc_ref_number','releasedate']
                })
                var terminationDate;
                if(employeeID.releasedate){
                    terminationDate = new Date(employeeID.releasedate);
                }
                var serviceStartDate = new Date(billingStartDate);
                var serviceEndDate = new Date(billingEndDate);
                var lastconsultantInv = false;
                if(terminationDate>serviceStartDate && terminationDate<=serviceEndDate && terminationDate){
                    lastconsultantInv = true;
                    billingEndDate = employeeID.releasedate;
                }
                var entityId = employeeID.custentity_clb_entityid;
                var refNum = employeeID.custentity_asc_ref_number;
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
                    var errID = lib.trnsctnFailureRec(billingStartDate,billingEndDate,"Vendor Bill Creation Failed because Employee is already terminated.",2,projectID,employee)
                    log.error("Error in createVendor: Created the Transaction Error ID", errID);
                }else{
                var vendorBillObj = record.create({
                    type: 'vendorbill',
                    isDynamic: true
                    });
                    vendorBillObj.setValue("entity",vendorID)
                    vendorBillObj.setValue("terms",term)
                    var terms = vendorBillObj.getText("terms");
                    log.debug("terms",terms)
                    if(terms == "Pay When Paid" || payStatus == "2" || vendhold == true){
                        vendorBillObj.setValue("paymenthold",true)
                    }
                    if(eligible){
                        vendorBillObj.setValue("custbody_asc_1099_eligible",true)
                    }
                    vendorBillObj.setValue("custbody_asc_ap_based",apbased)
                    vendorBillObj.setValue("custbody_clb_startdate",new Date(billingStartDate))
                    vendorBillObj.setValue("custbody_clb_enddate",new Date(billingEndDate))
                    vendorBillObj.setValue("custbody_clb_paymentmode",paymentMode);
                    vendorBillObj.setValue("custbodyclb_vendorbillcatory",5);
                    vendorBillObj.setValue("tranid",entityId);
                    vendorBillObj.setValue("custbody_asc_inv_project_selected",projectID);
                    
                    if(lastconsultantInv){
                        vendorBillObj.setValue("custbody_clb_lastconsultantbill",true);
                    }
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
                    var vbAmt = vendorBillObj.getValue("total");
                    var vendorID ;
                    if(vbAmt>0){
                     vendorID = vendorBillObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                }else{
                    throw {message: "Vendor Bill Amount is less than 0 due to 0 hours or 0 Pay Rate for the week." }
                }
                    var vendorCreditid = "";
                    if(repreSub.length>0){
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
                            vendorCreditid = vendorCredit.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            });
                    }
                    if(vendorID){
                        var subVal = {
                            "custcol_clb_vendor_bill_link": vendorID
                        }
                        if(vendorCreditid){
                            subVal["custcol_clb_vendor_credit"] = vendorCreditid
                        }
                        for(var ii = 0;ii<timeSheetconsolidatedIDs.length;ii++){
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
                log.debug("Errot at Stage : createVendorBill function", JSON.stringify(e))
                var errID = lib.trnsctnFailureRec(billingStartDate,billingEndDate,"Failure in Vendor Bill Creation due: "+e.message,2,projectID,employee)
                log.error("Error in createVendorBill: Created the Transaction Error ID", errID);

               }
           
                
        }
        function lastSunday(year, month) {
            log.debug("lastSunday function")
            var date = new Date(year,month,1,12);
            var weekday = date.getDay();
            var dayDiff = weekday===0 ? 7 : weekday;
            var lastSunday = date.setDate(date.getDate() - dayDiff);
            log.debug("Last Sunday of the month is: ",date)
            return date;
        }
        function getWeekendingDays(start, end) {
            try {
                log.debug("getWeekendingDays");
                var result = [];
                var today = new Date();
                var formattedDate = format.format({
                    value: today,
                    type: format.Type.DATETIME,
                    timezone: 'America/New_York'
                })
                var sysdate = new Date(formattedDate);
                log.debug("getInputData:", " tempDate: " + sysdate + " : day is: " + sysdate.getDay());
                var day = sysdate.getDay();

                // Copy start date
                var current = new Date(start);
                var endDate = new Date(end)
                // Shift to next of required days
                current.setDate(current.getDate() + (day - current.getDay() + 7) % 7);
                while (current <= endDate) {
                    result.push(new Date(+current));
                    current.setDate(current.getDate() + 7);
                }
                return result.length;
            } catch (e) {
                log.debug("Errot at Stage : getWorkingDays", JSON.stringify(e))
            }
        } 
        function getDaysinMonth(start,end){
            // The number of milliseconds in one day
                var ONE_DAY = 1000 * 60 * 60 * 24;
                var date1=new Date(start);
                var date2 =new Date(end);
                // Calculate the difference in milliseconds
                const differenceMs = Math.abs(date1 - date2);

                // Convert back to days and return
                return Math.round(differenceMs / ONE_DAY)+1;
        }   
        return {
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });