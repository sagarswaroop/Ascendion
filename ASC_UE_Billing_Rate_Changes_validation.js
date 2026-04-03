/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */

 define(["N/record", "N/search", "N/format","N/runtime","N/task"], function (record, search, format,runtime,task) {
   
   function afterSubmit(scriptContext) {
     try {
       var exeContext = runtime.executionContext;
       log.audit("Execution Context: ",exeContext);

        var newBillSchobj = scriptContext.newRecord;
        log.debug("newBillSchobj: ", JSON.stringify(newBillSchobj)); 
        var projectID = newBillSchobj.getValue("custrecord_clb_proj_bill");
        var projectLookUp = search.lookupFields({
            type: "job",    
            id: projectID,
            columns: ['custentity_clb_parentproject' ,"custentity_clb_projecttypeforinvoicing","subsidiary"]
        })  
        var projSubsidiary = projectLookUp.subsidiary[0].value;
        var employeeID = newBillSchobj.getValue("custrecord_clb_subconbillrecord");  
        var taskType = newBillSchobj.getValue("custrecord_clb_tastype_bill");
        var billrate = newBillSchobj.getValue("custrecord_clb_billrate");
        var recType = scriptContext.type;
        log.debug("projectID : employeeID : taskType : ",projectID + " : "+employeeID + " : " +taskType);
        var oldpayRateobj = scriptContext.oldRecord;
        var old_rate;
        if (NullCheck(oldpayRateobj)) {
         old_rate = oldpayRateobj.getValue({ fieldId: 'custrecord_clb_billrate' });
        }
        log.debug("recType : ",recType);
        log.debug("old Rate : New Rate",old_rate + " : "+billrate)
        if(((recType == "edit" && (parseFloat(old_rate) != parseFloat(billrate)))  || recType == "create") && projSubsidiary == 4){
		//if(recType == "edit" && projSubsidiary == 4){
        if(taskType ==1){
          log.debug("effective date from record: ",newBillSchobj.getValue("custrecord_clb_eff_date"));
        var effDate = newBillSchobj.getValue("custrecord_clb_eff_date");
        log.debug("effDate",effDate)

        var nseffDate = ('0' + (effDate.getMonth() + 1)).slice(-2) + '/'
        + ('0' + effDate.getDate()).slice(-2) + '/'
        + effDate.getFullYear();
        log.debug("nseffDate",nseffDate)

        var effectiveDate = new Date(effDate);
        var today = new Date();
        var formattedDate = format.format({
           value: today,
           type: format.Type.DATETIME,
           timezone: 'America/New_York'
       })
       var sysdate = new Date(formattedDate);
       log.debug("aftersubmit", " tempDate: " + sysdate + " : day is: " + sysdate.getDay());
        var nstoday = ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
        + ('0' + sysdate.getDate()).slice(-2) + '/'
        + sysdate.getFullYear();
        log.debug("nstoday",nstoday)

        log.debug("effectiveDate : today",effectiveDate + " : "+sysdate)
        if(effectiveDate > sysdate) {
            log.debug("Effectivedate is future date.");
            return true;
        }else if(nseffDate == nstoday){ 
            log.debug("Check if there is any invoice created for today's end date.");
             
            log.debug("projectLookUp Parent Project: ",projectLookUp.custentity_clb_parentproject[0]);
           
            
            var parentProj;
            if(projectLookUp.custentity_clb_parentproject[0]){
               parentProj = projectLookUp.custentity_clb_parentproject[0].value;
                log.debug("parentProj: ",parentProj);
            }
            else{
                parentProj = projectID
                log.debug("parentProj is same as current project: ",parentProj);
            }
            log.debug("search for invoice: ");
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                [
                   ["type","anyof","CustInvc"], 
               //    "AND", 
                 //  ["item.custitem_clb_projecttasktype","anyof",taskType], 
                   "AND", 
                   ["custbody_clb_periodendingdate","on","today"], 
                   "AND", 
                   ["custbody_asc_inv_project_selected","anyof",parentProj],
                   "AND",
                   ["custbody_clb_projecttypeapproval", "anyof", "1", "2", "3", "4"]
                ],
                columns:[
                   search.createColumn({
                       name: "internalid",
                       summary: "GROUP"
                    })
                
                ]
             });
             var searchResultCount = invoiceSearchObj.runPaged().count;
             log.debug("invoiceSearchObj result count",searchResultCount);
             if(searchResultCount>0){
                var invoiceIDs = [];
                var billrateChangedetails = {};
                billrateChangedetails["billRateID"] = newBillSchobj.id;
                invoiceSearchObj.run().each(function(result){
                   var id = result.getValue({
                       name: "internalid",
                       summary: "GROUP"
                    });
                    invoiceIDs.push(id)
                    return true;
                 });
                 billrateChangedetails["invoiceID"] = invoiceIDs;
                 log.debug("billratechangedetail obj: ",JSON.stringify(billrateChangedetails))
                 var mrTaskCall = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: "customscript_asc_mr_billrate_chng_rtroft",
                    deploymentId: "",
                    params: {
                       "custscript_asc_invoice_process":billrateChangedetails,
                   }
                });
                var mrTaskId = mrTaskCall.submit();
                log.debug("Task Created for reversing/updating the invoices");

             }
               

        }else{
            log.debug("Search to find out the invoices created with old billing rate.");
            var customrecord_clb_subconbillrateSearchObj = search.create({
                type: "customrecord_clb_subconbillrate",
                filters:
                [
                   ["custrecord_clb_proj_bill","anyof",projectID], 
                   "AND", 
                   ["custrecord_clb_tastype_bill","anyof",taskType], 
                   "AND", 
                   ["custrecord_clb_subconbillrecord","anyof",employeeID], 
                   "AND", 
                   ["custrecord_clb_eff_date","after",nseffDate]
                ],
                columns:
                [
                   search.createColumn({
                      name: "custrecord_clb_eff_date",
                      sort: search.Sort.ASC,
                      label: "Effective Date"
                   }),
                   search.createColumn({
                      name: "custentity_clb_parentproject",
                      join: "CUSTRECORD_CLB_PROJ_BILL"
                   }),
                   search.createColumn({
                     name: "custentity_clb_projecttypeforinvoicing",
                     join: "CUSTRECORD_CLB_PROJ_BILL"
                  })

                ]
             });
             var searchResultCount = customrecord_clb_subconbillrateSearchObj.runPaged().count;
             log.debug("bill rate record found after the entered effective date",searchResultCount);
                if(searchResultCount>0){
                    var searchRunObj = customrecord_clb_subconbillrateSearchObj.run();
                    var billrateDetails = searchRunObj.getRange({
                        start: 0,
                        end: 1
                    });
                    log.debug("billrateDetails", JSON.stringify(billrateDetails));
                    var toEffectiveDate = billrateDetails[0].getValue("custrecord_clb_eff_date");
                    log.debug("toEffectiveDate",toEffectiveDate);
                    var isParent =  parentProject = billrateDetails[0].getValue({
                       name: "custentity_clb_parentproject",
                       join: "CUSTRECORD_CLB_PROJ_BILL"
                   });
                    log.debug("isParent",isParent);
                    var parentProject; 
                    var projectType;
                    if(isParent){
                        parentProject = billrateDetails[0].getValue({
                            name: "custentity_clb_parentproject",
                            join: "CUSTRECORD_CLB_PROJ_BILL"
                        });
                        projectType = 4;
                    }else{
                        parentProject = projectID;
                        projectType = billrateDetails[0].getValue({
                           name: "custentity_clb_projecttypeforinvoicing",
                           join: "CUSTRECORD_CLB_PROJ_BILL"
                       });;
                    }
                     
                    log.debug("parentProject",parentProject);
                    var invoiceSearchObj = search.create({
                        type: "invoice",
                        filters:
                        [
                           ["type","anyof","CustInvc"], 
                          // "AND", 
                         //  ["item.custitem_clb_projecttasktype","anyof",taskType], 
                           "AND", 
                           [[["custbody_clb_periodstartingdate","onorbefore",nseffDate],"AND",["custbody_clb_periodendingdate","onorafter",nseffDate]],"OR",[["custbody_clb_periodstartingdate","onorafter",nseffDate]]],
                           "AND", 
                           ["custbody_asc_inv_project_selected","anyof",parentProject],
                           "AND",
                           ["custbody_clb_periodstartingdate","before",toEffectiveDate],
                           "AND",
                           ["custbody_clb_projecttypeapproval", "anyof", "1","2","3","4"]
                        ],
                        columns:[
                           search.createColumn({
                               name: "internalid",
                               summary: "GROUP"
                            })
                        ]
                     });
                     var searchResultCount = invoiceSearchObj.runPaged().count;
                     log.debug("invoiceSearchObj result count",searchResultCount);
                     if(searchResultCount>0){
                        var invoiceIDs = [];
                        var billrateChangedetails = {
                           "invoiceID":[],
                           "billRateID":"",
                           "projectType" : projectType
                        };
                        billrateChangedetails["billRateID"] = newBillSchobj.id;
                        invoiceSearchObj.run().each(function(result){
                           var id = result.getValue({
                               name: "internalid",
                               summary: "GROUP"
                            });
                            invoiceIDs.push(id)
                            return true;
                         });
                         billrateChangedetails["invoiceID"] = invoiceIDs;
                         log.debug("billratechangedetail obj: ",JSON.stringify(billrateChangedetails))
                         var mrTaskCall = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: "customscript_asc_mr_billrate_chng_rtroft",
                           deploymentId: "",
                            params: {
                               "custscript_asc_invoice_process":billrateChangedetails,
                           }
                            
                        });
                        var mrTaskId = mrTaskCall.submit();
                        }

                }
                else{
                    log.debug("Bill Rate entered is of older date. Search for Invoice created.",effDate);
                    { 
                        log.debug("Check if there is any invoice created for today.");
                        
                        log.debug("projectLookUp: parent project",projectLookUp.custentity_clb_parentproject[0]);
                        log.debug("projectLookUp: Project type",projectLookUp.custentity_clb_projecttypeforinvoicing[0].value);
                        var parentProj;
                        var projectType;
                        if(projectLookUp.custentity_clb_parentproject[0]){
                            parentProj = projectLookUp.custentity_clb_parentproject[0].value;
                            log.debug("parentProj: ",parentProj);
                            projectType = 4;
                        }
                        else{
                            parentProj = projectID
                            log.debug("parentProj is same as current project: ",parentProj);
                            projectType = projectLookUp.custentity_clb_projecttypeforinvoicing[0].value;
                        }
                        log.debug("search for invoice: ");
                        var invoiceSearchObj = search.create({
                            type: "invoice",
                            filters:
                            [
                               ["type","anyof","CustInvc"], 
                            //   "AND", 
                         //      ["item.custitem_clb_projecttasktype","anyof",taskType], 
                               "AND",
                               ["custbody_asc_inv_project_selected","anyof",parentProj],
                               "AND",
                               [[["custbody_clb_periodstartingdate","onorbefore",nseffDate],"AND",["custbody_clb_periodendingdate","onorafter",nseffDate]],"OR",[["custbody_clb_periodstartingdate","onorafter",nseffDate]]],
                               "AND",
                               ["custbody_clb_projecttypeapproval", "anyof", "1","2","3","4"]
                            ],
                            columns:[
                                   search.createColumn({
                                       name: "internalid",
                                       summary: "GROUP"
                                   })
                            ]
                         });
                         var searchResultCount = invoiceSearchObj.runPaged().count;
                         log.debug("invoiceSearchObj result count",searchResultCount);
                         if(searchResultCount>0){
                            var invoiceIDs = [];
                            var billrateChangedetails = {
                               "invoiceID":[],
                               "billRateID":"",
                               "projectType":projectType
                            };
                            billrateChangedetails["billRateID"] = newBillSchobj.id;
                            invoiceSearchObj.run().each(function(result){
                                   var id = result.getValue({
                                       name: "internalid",
                                       summary: "GROUP"
                                   });
                                   invoiceIDs.push(id)
                                   return true;
                             });
                             billrateChangedetails["invoiceID"] = invoiceIDs;
                             log.debug("billratechangedetail obj: ",JSON.stringify(billrateChangedetails))
                             var mrTaskCall = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: "customscript_asc_mr_billrate_chng_rtroft",
                               deploymentId: "",
                                params: {
                                   "custscript_asc_invoice_process":billrateChangedetails,
                               }
                            });
                            var mrTaskId = mrTaskCall.submit();
                         }
                    }

                }
             
        }
        
       var scriptObj = runtime.getCurrentScript();
        log.debug("Remaining governance units: " + scriptObj.getRemainingUsage());
       }
      }
                    
     } catch (e) {
        var scriptObj = runtime.getCurrentScript();
        log.debug("Remaining governance units: " + scriptObj.getRemainingUsage());
       log.error("Error in afterSubmit", JSON.stringify(e));
     }
   }
   function NullCheck(variable) {
      try {
          if (variable != '' && variable != 0 && variable != -1 && variable != '[]' && variable != null && variable != undefined && variable != false && variable != 'false' && variable != 'F') {
              return true
          } else {
              return false
          }
      } catch (err) {
          log.error('Error in NullCheck', err)
      }
  }
   return {
     afterSubmit: afterSubmit,
   };
 });