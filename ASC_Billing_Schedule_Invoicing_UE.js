/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

 define(["N/record", "N/search", "N/format","N/runtime","./Projects/Library/Project Library.js"], function (record, search, format,runtime,lib) {
    function beforeLoad(scriptContext){
      log.debug("scriptContext: "+scriptContext.type,JSON.stringify(scriptContext))
      var exeContext = runtime.executionContext;
      if(exeContext == "USERINTERFACE"){
        var parms = scriptContext.request.parameters;
        var currentRec = scriptContext.newRecord;
        log.debug("parms",parms)
        if(scriptContext.type == "create" && parms.custrecord_clb_prjectreference){
            var projId = parms.custrecord_clb_prjectreference;
            log.debug("Set Project:",projId);
            currentRec.setValue("custrecord_clb_prjectreference",projId)    
         } 
      }
      
    }
     function beforeSubmit(scriptContext) {
       try {
         var exeContext = runtime.executionContext;
         log.audit("Execution Context: ",exeContext);
         if(exeContext == "USERINTERFACE" ||  exeContext == "MAPREDUCE" || exeContext == "CSVIMPORT"){
          var newBillSchobj = scriptContext.newRecord;
         log.debug("newBillSchobj: ", JSON.stringify(newBillSchobj)); 
          var projectID = newBillSchobj.getValue("custrecord_clb_prjectreference");  
          log.debug("project Internal ID: ",projectID)
          var projectInfoLookup = search.lookupFields({
                               type: search.Type.JOB,
                               id: projectID,
                               columns: ['custentity_clb_projecttypeforinvoicing','customer','jobitem','jobbillingtype','subsidiary']
                           });
           log.debug("projectInfoLookup",JSON.stringify(projectInfoLookup))    
           var subsidiaryText = projectInfoLookup.subsidiary[0].text;          
           var projectType = projectInfoLookup.custentity_clb_projecttypeforinvoicing[0].text;
           var projectTypeID = projectInfoLookup.custentity_clb_projecttypeforinvoicing[0].value;
           var projectBillingType = projectInfoLookup.jobbillingtype[0].value;
           var customer = projectInfoLookup.customer[0].value  
           
           var itemID = projectInfoLookup.jobitem[0].text 
           log.debug("customer : projectType : itemID : projectBillingType ", customer + " : "+ projectType + " : "+itemID + " : "+projectBillingType); 
           
           if((projectType == "Fixed Prices Projects" || projectType == "DHR" || projectType == "Perm placement Projects" || projectType == "Conversion Fees Projects")){
              var invoicingLines = newBillSchobj.getValue("custrecord_clb_invoicing_lines");
              log.debug("invoicingLines",":"+invoicingLines+":")
              if(invoicingLines){
                var lineArray = invoicingLines.split('');
                log.debug("lineArray: ", lineArray + " lineArray.length: " + lineArray.length);
                let soId = "";
                var milestoneEndDate = newBillSchobj.getSublistValue({
                 sublistId: 'recmachcustrecord_clb_billingsche',
                 fieldId: 'custrecord_clb_milstoneenddate',
                 line: lineArray[0]
                });
               var nsfrmDtmilestoneEndDate = nsDate(milestoneEndDate);
               var customerPODetails = false;
               var ignoreBudget = false;
               var singleBudget = "";
                var customerPOSearchObj = search.create({
                    type: "customrecord_ascendion_cust_po_details",
                    filters: [
                        ["custrecord_asc_cpd_lnk_to_prj", "anyof", projectID],
                        "AND",
                        [["custrecord_asc_cpd_end_date","onorafter",nsfrmDtmilestoneEndDate]]
                    ],
                    columns: [
                        search.createColumn({
                            name: "custrecord_asc_cpd_start_date",
                            sort: search.Sort.ASC,
                            label: "Start Date"
                         }),
                        search.createColumn({
                            name: "custrecord_asc_cpd_single_budget"
                        }),
                        search.createColumn({
                            name: "custrecord_asc_cpd_ignore_budget"
                        }),
                        search.createColumn({
                            name: "custrecord_asc_cpd_end_date"
                        })
                    ]
                });
                var poResultSet = customerPOSearchObj.run();
                customerPODetails = poResultSet.getRange({
                    start: 0,
                    end: 1
                });
                poLength = customerPODetails.length;
                log.debug("Customer PO Details found: ", customerPODetails.length);
                if(customerPODetails.length > 0){
                    customerPODetails = customerPODetails[0];
                    ignoreBudget = customerPODetails.getValue("custrecord_asc_cpd_ignore_budget");
                    log.debug("CheckBudget Function: ", "ignoreBudget " + ignoreBudget)
                    if (!ignoreBudget) {
                         singleBudget = customerPODetails.getValue("custrecord_asc_cpd_single_budget");
                        log.debug("singleBudget",singleBudget)
                        var customerPOstartDate = customerPODetails.getValue('custrecord_asc_cpd_start_date');
                        var customerPOEndDate = customerPODetails.getValue('custrecord_asc_cpd_end_date');
                        var existingInvoiceTotal = 0;
                        if (singleBudget != "" && singleBudget > 0) {
                        var invoiceSearchObj = search.create({
                            type: "invoice",
                            filters: [
                                ["type", "anyof", "CustInvc"],
                                "AND",
                                ["custbody_asc_inv_project_selected", "anyof", projectID],
                                "AND",
                                ["mainline", "is", "T"],
                                "AND",
                                ["custbody_clb_periodstartingdate", "onorafter", customerPOstartDate],
                                "AND",
                                ["custbody_clb_periodendingdate", "onorbefore", customerPOEndDate] // status check with satish
                            ],
                            columns: [
                                search.createColumn({
                                    name: "amount",
                                    summary: "SUM"
                                })
                            ]
                        });
                        var searchRun = invoiceSearchObj.run();
                        var existinginvoiceDetails = searchRun.getRange({
                            start: 0,
                            end: 1
                        });
                        log.debug("existing invoices length: ", existinginvoiceDetails.length + " : " + JSON.stringify(existinginvoiceDetails))
                        if (existinginvoiceDetails.length > 0) {
                            existingInvoiceTotal = existinginvoiceDetails[0].getValue({
                                name: "amount",
                                summary: "SUM"
                            });
                            log.debug("CheckBudget Function: ", "existingInvoiceTotal " + existingInvoiceTotal);
                        }
                      }
                    }
                    
                }
              
               if(projectBillingType == 'FBM'){
                  var salesorderSearchObj = search.create({
                      type: "salesorder",
                      filters:
                      [
                         ["type","anyof","SalesOrd"], 
                         "AND", 
                         ["job.internalidnumber","equalto",projectID], 
                         "AND", 
                         ["startdate","onorbefore","today"], 
                         "AND", 
                         ["enddate","onorafter","today"]
                      ],
                      columns:[
                      ]
                   });
                   var socount = salesorderSearchObj.runPaged().count;
                   log.debug("salesorderSearchObj result count",socount);
                   
                   if(socount>0){
                      let soSearch = salesorderSearchObj.run().getRange({ start: 0, end: 1 });
                      log.debug("soSearchObj",JSON.stringify(soSearch))
                      soId = soSearch[0].id;
                      log.debug("SO ID: ", soId)
                   }
               } 
               
                   for(var ii = 0;ii<lineArray.length;ii++) {
                       var taskID = newBillSchobj.getSublistValue({
                           sublistId: 'recmachcustrecord_clb_billingsche',
                           fieldId: 'custrecord_clb_milestone',
                           line: lineArray[ii]
                          });
                          log.debug("taskID: ",taskID);   
                       var projectStartDate = newBillSchobj.getSublistValue({
                           sublistId: 'recmachcustrecord_clb_billingsche',
                           fieldId: 'custrecord_clb_projectstartdate',
                           line: lineArray[ii]
                          });
                          var nsfrmDtProjstartDate = nsDate(projectStartDate);   
                          log.debug("projectStartDate : nsfrmDtProjstartDate ", projectStartDate +" : "+nsfrmDtProjstartDate);
                           
                       var projectEndDate = newBillSchobj.getSublistValue({
                           sublistId: 'recmachcustrecord_clb_billingsche',
                           fieldId: 'custrecord_clb_projectenddate',
                           line: lineArray[ii]
                          });
                      var nsfrmDtProjEndDate = nsDate(projectEndDate);
                          log.debug("projectEndDate : nsfrmDtProjEndDate", projectEndDate + " : " + nsfrmDtProjEndDate);
                          
                          var milestoneEndDate = newBillSchobj.getSublistValue({
                              sublistId: 'recmachcustrecord_clb_billingsche',
                              fieldId: 'custrecord_clb_milstoneenddate',
                              line: lineArray[ii]
                             });
                          var nsfrmDtmilestoneEndDate = nsDate(milestoneEndDate);
                          var scheduleAmount = newBillSchobj.getSublistValue({
                           sublistId: 'recmachcustrecord_clb_billingsche',
                           fieldId: 'custrecord_clb_amountt',
                           line: lineArray[ii]
                          });
                       var invoicecreated = newBillSchobj.getSublistValue({
                           sublistId: 'recmachcustrecord_clb_billingsche',
                           fieldId: 'custrecord_clb_invoice',
                           line: lineArray[ii]
                          });   
                          log.debug("scheduleAmount : invoicecreated", scheduleAmount +":"+invoicecreated);
                          if(!invoicecreated && parseFloat(scheduleAmount)>0){
                            var createInv = true;
                            if (singleBudget != "" && singleBudget > 0 && !ignoreBudget) {
                                existingInvoiceTotal += parseFloat(scheduleAmount);
                                if(existingInvoiceTotal>parseFloat(singleBudget)){
                                    createInv = false
                                }

                            }
                                if(createInv){
                                    var invoiceID = createInvoice(customer,projectID,projectStartDate,projectEndDate,projectTypeID,scheduleAmount,itemID,projectTypeID,nsfrmDtmilestoneEndDate,projectBillingType,soId);   
                                        
                                        log.debug("invoiceID",invoiceID)
                                        if(invoiceID){
                                            
                                                newBillSchobj.setSublistValue({
                                                sublistId: 'recmachcustrecord_clb_billingsche',
                                                fieldId: 'custrecord_clb_invoice',
                                                value: invoiceID,
                                                line: lineArray[ii]
                                                });
                                                
                                            log.debug("Invoice Created & set for scheduleID " ,invoiceID + " : "+lineArray[ii])
                                            
                                            }
                                            else{
                                                log.debug("Invoice Creation failed:");
                                            }
                                }else{
                                    log.debug("invoice creation failed due to budget issue")
                                                log.debug("Transaction Failure Report creation")
                                                var errID = lib.trnsctnFailureRec(nsfrmDtProjstartDate,nsfrmDtProjEndDate,"Invoice Creation failed due to Budget Issue of PO: "+customerPODetails.getValue("name"),1,projectID)
                                                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
                                }
                               
                       
                           
                      }
                       else if(parseFloat(scheduleAmount)<0){
                             var creditMemoID = reversalInvoice(customer,projectID,nsfrmDtProjstartDate,nsfrmDtProjEndDate,scheduleAmount,taskID)
                             if(creditMemoID){
                              newBillSchobj.setSublistValue({
                                  sublistId: 'recmachcustrecord_clb_billingsche',
                                  fieldId: 'custrecord_clb_reversed',
                                  value: true,
                                  line: lineArray[ii]
                                 });
                              log.debug("credit memo id: ", creditMemoID) 
                             }
                             else{
                              log.debug("NO Credit Memo created.") 
                             }
                             
                          }
                        
                   }
                   
              } 
                
           }
           else{
              log.audit("Project type is not suitable.")
              
           }
           var scriptObj = runtime.getCurrentScript();
           log.debug("Remaining governance units: " + scriptObj.getRemainingUsage());
         } 
         
                      
       } catch (e) {
          var scriptObj = runtime.getCurrentScript();
          log.debug("Remaining governance units: " + scriptObj.getRemainingUsage());
         log.error("Error in afterSubmit", e.message);
  
       }
     }
     function createInvoice(customer,projectID,projectStartDate,projectEndDate,projectType,scheduleAmount,itemID,projectTypeID,nsfrmDtmilestoneEndDate,projectBillingType,soId){
      try{
          log.debug("Create invoice function");
          var invoiceObj;
          log.debug("projectBillingType : SO ID: ", projectBillingType + " : " +soId)
          if(projectBillingType == 'FBM' && soId){
              log.debug("SO found: Record is transformed from SO.")
              invoiceObj = record.transform({
                  fromType: record.Type.SALES_ORDER,
                  fromId: soId,
                  toType: record.Type.INVOICE,
                  isDynamic: true,
                 });
          }else{
              invoiceObj = record.create({
                  type: 'invoice',
                  isDynamic: true
                  });
          }
             
                 invoiceObj.setValue({
                     fieldId: 'customform',
                     value: 165,
                     ignoreFieldChange: true
                 })
              invoiceObj.setValue("entity",customer);
              invoiceObj.setValue("custbody_clb_projecttypeapproval",projectTypeID);
              invoiceObj.setValue("custbody_asc_inv_project_selected",projectID);
              invoiceObj.setValue("custbody_clb_periodendingdate",new Date(projectEndDate));
              invoiceObj.setValue("custbody_clb_periodstartingdate",new Date(projectStartDate));
              invoiceObj.setValue("taxdetailsoverride",true)
              if(projectBillingType == 'FBM' && soId){
                 invoiceObj.selectLine({
                     sublistId: 'item',
                     line: 0
                    });
              } else{
                 invoiceObj.selectNewLine({
                     sublistId: 'item'
                    });
                 invoiceObj.setCurrentSublistText({
                 sublistId: 'item',
                 fieldId: 'item',
                 text: itemID
                 });
                 invoiceObj.setCurrentSublistValue({
                                 sublistId: 'item',
                                 fieldId: 'job',
                                 value: projectID
                                 });
                                 
                 
              }
              
                 
              
                 if(projectBillingType == 'FBM' && soId){
                  var soRate = invoiceObj.getCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: 'rate'
                     });
                  log.debug("soRate : ", soRate)   
                  var quantity = scheduleAmount/soRate;
                  log.debug("quantity : ", quantity)   
                  invoiceObj.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: 'quantity',
                      value: quantity.toFixed(2),
                      ignoreFieldChange: true
                     });
                 invoiceObj.setCurrentSublistValue({
                     sublistId: 'item',
                     fieldId: 'amount',
                     value: scheduleAmount
                     });
                 }else{
                  invoiceObj.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: 'quantity',
                      value: 1
                     });
                     invoiceObj.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: 'amount',
                      value: scheduleAmount
                     });
                 }
                 
  
                 invoiceObj.commitLine({
                  sublistId: 'item'
                 });
                 
                var invoiceid = invoiceObj.save({
                      enableSourcing: false,
                      ignoreMandatoryFields: true
                 });
                 return invoiceid; 
         
          
      } catch (e) {
         log.error("Error in createInvoice: Creating the Transaction Error Report", e.message);
         var errID = lib.trnsctnFailureRec(projectStartDate,projectEndDate,"Error in createInvoice of Billing Schedule: "+e.message,1,projectID)
         log.error("Error in createInvoice: Created the Transaction Error ID", errID);
       }   
      
     }
     function reversalInvoice(customer,projectID,projectStartDate,projectEndDate,scheduleAmount,taskID){
      try{
          var detailsObj = search.create({
              type: "customrecord_clb_childrecord",
              filters:
              [
                 ["custrecord_clb_milestone","is",taskID], 
                 "AND", 
                 ["custrecord_clb_projectenddate","on",projectEndDate], 
                 "AND", 
                 ["custrecord_clb_projectstartdate","on",projectStartDate], 
                 "AND", 
                 ["custrecord_clb_amountt","equalto",Math.abs(scheduleAmount)], 
                 "AND", 
                 ["custrecord_clb_details_project","is",projectID],
                 "AND", 
                  ["custrecord_clb_invoice.mainline","is","T"]
              ],
              columns:
              [
                 search.createColumn({name: "custrecord_clb_invoice", label: "Invoice"}),
                 search.createColumn({
                    name: "approvalstatus",
                    join: "CUSTRECORD_CLB_INVOICE",
                    label: "Approval Status"
                 }),
                 search.createColumn({
                  name: "statusref",
                  join: "CUSTRECORD_CLB_INVOICE",
                  label: "Status"
               })
              ]
           });
           var searchResultCount = detailsObj.runPaged().count;
              log.debug("detailsObj result count",searchResultCount);
              detailsObj.run().each(function(result){
                  var invoiceId = result.getValue("custrecord_clb_invoice");
                  log.debug("Invoice Available: ", invoiceId);
                  if(invoiceId){
                      var invoiceStatus = result.getValue({
                          name: "statusref",
                          join: "CUSTRECORD_CLB_INVOICE"
                      });
                      log.debug("invoiceStatus" , invoiceStatus)
                      if(invoiceStatus == "pendingApproval"){
                          record.submitFields({
                              type: "invoice",
                              id: invoiceId,
                              values: {
                                  "approvalstatus": 2,
                                  "memo":"Reversed the Invoice due to changes in Schedule Amount"
                              },
                              options: {
                                  enableSourcing: false,
                                  ignoreMandatoryFields: true
                              }
                          })  
                          var cmID =  createCreditMemo(invoiceId);
                          log.debug("credit memo : ",cmID)
                          return cmID;
                      }
                      else if(invoiceStatus == "open"){
                          record.submitFields({
                              type: "invoice",
                              id: invoiceId,
                              values: {
                                  "memo":"Reversed the Invoice due to changes in Schedule Amount"
                              },
                              options: {
                                  enableSourcing: false,
                                  ignoreMandatoryFields: true
                              }
                          }) 
                          var cmID =  createCreditMemo(invoiceId);
                          log.debug("credit memo : ",cmID)
                          return cmID;
                             
                      }
                      else if(invoiceStatus == "paidInFull"){
                          var invoiceObj = record.load({
                              type: record.Type.INVOICE,
                              id: invoiceId,
                              isDynamic: true,
                             });
                          var customerName = invoiceObj.getText("entity");
                          log.debug("customerName: ",customerName)
                          var projectName = invoiceObj.getText("custbody_asc_inv_project_selected");
                          log.debug("projectName: ",projectName)
                          var invId = invoiceObj.getValue("tranid");
                          log.debug("invId: ",invId)
 
                          var lineNumber = invoiceObj.findSublistLineWithValue({
                              sublistId: 'links',
                              fieldId: 'type',
                              value: "Payment"
                             });
                          if(lineNumber>=0){
                              var paymentID = invoiceObj.getSublistValue({
                                  sublistId: 'links',
                                  fieldId: 'id',
                                  line: lineNumber
                                 }); 
                              log.debug("paymentID", paymentID)  
                              if(paymentID){
                                  var paymentObj = record.load({
                                      type: record.Type.CUSTOMER_PAYMENT,
                                      id: paymentID,
                                      isDynamic: true,
                                  });
                                  var transId = paymentObj.getValue("checknumber")?paymentObj.getValue("checknumber"):paymentObj.getValue("tranid");
                                  var tranDate = paymentObj.getText("trandate");
                                  var invoiceLineNumber = paymentObj.findSublistLineWithValue({
                                      sublistId: 'apply',
                                      fieldId: 'internalid',
                                      value: invoiceId
                                     }); 
                                  paymentObj.selectLine({
                                      sublistId: 'apply',
                                      line: invoiceLineNumber
                                  });
                                  paymentObj.setCurrentSublistValue({
                                      sublistId: 'apply',
                                      fieldId: 'apply',
                                      value: false
                                  });
                                  paymentObj.commitLine({
                                      sublistId: 'apply'
                                  });
                                 var paymentObj = paymentObj.save({
                                      enableSourcing: false,
                                      ignoreMandatoryFields: true
                                      }); 
                               // log.debug("sending email: ")
                               lib.sendEmail(customerName, projectName, transId, "Payment",tranDate,"Invoice",invId)     
                                 var invId = record.submitFields({
                                     type: "invoice",
                                     id: invoiceId,
                                     values: {
                                         "memo":"Reversed the Invoice due to changes in Schedule Amount"
                                     },
                                     options: {
                                         enableSourcing: false,
                                         ignoreMandatoryFields: true
                                     }
                                 }) 
                                 log.debug("Invoice Memo changed: ",invId)       
                                 //  invoiceObj.setValue("memo","Reversed the Invoice due to changes in Schedule Amount")
                                 //  invoiceObj.save({
                                 //      enableSourcing: false,
                                 //      ignoreMandatoryFields: true
                                 //  })  
                                  var cmID =  createCreditMemo(invoiceId);
                                          return cmID;     
                              }
                          }   
                          
                          
                          return false;  
                             
                      }
                  }
                 
              return true;
              });
              return true;
      }catch (e) {
         log.error("Error in reversalInvoice", e.message);
         var errID = lib.trnsctnFailureRec(projectStartDate,projectEndDate,"Error in Reversal of the Invoice for Billing Schedule: " +e.message,1,projectID)
         log.error("Error in createInvoice: Created the Transaction Error ID", errID);
       }
     }
     function createCreditMemo(invoiceId){
      try{
          log.debug("Create Credit Memo function")
          var cmObj = record.transform({
              fromType: record.Type.INVOICE,
              fromId: invoiceId,
              toType: record.Type.CREDIT_MEMO,
              isDynamic: true,
             });
             
         var cmObjid = cmObj.save({
              enableSourcing: false,
              ignoreMandatoryFields: true
              }); 
              log.debug("Credit Memo created : ", cmObjid)
              return cmObjid;
      }catch (e) {
          log.error("Error in createCreditMemo", e.message);
        }
      
     }
     function nsDate(dateinfo){
      try{ 
          var tempdate = new Date(dateinfo)
          var nsformatteddate = ('0' + (tempdate.getMonth() + 1)).slice(-2) + '/'
                                  + ('0' + tempdate.getDate()).slice(-2) + '/'
                                  + tempdate.getFullYear();
                                  return nsformatteddate;
  
      }catch (e) {
         log.error("Error in nsDate", JSON.stringify(e));
       }
             
     }
     return {
       beforeLoad:beforeLoad,
      beforeSubmit: beforeSubmit
     };
   });