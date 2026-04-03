/**
** @NApiVersion 2.1
** @NScriptType MapReduceScript
** @NModuleScope SameAccount
*
** @libraries used:
                    
 
 -- Date--      -- Modified By--      --Requested By--     --Description
DD-MM-YYYY        Employee Name         Client Name           One line description
 
 */
define(['N/search', 'N/record', 'N/runtime','N/query',"./Projects/Library/Project Library.js","N/config"],
    function (search, record, runtime,query,lib,config) {
        function getInputData() {
            try {
                log.audit('getInputData', 'Start');
                var timebillSearchObj = search.create({
                    type: "timebill",
                    filters:
                    [
                        ["custcol_clb_timesheetupdated","is","T"], 
                        "AND", 
                        ["custcol_asc_timesheet_status","anyof","3"], 
                        "AND", 
                        ["custcol_clb_invoice.mainline","is","T"],
                        "AND", 
                        ["custcol_invoice_corrected","is","F"],
                        "AND",
                        ["custcol_clb_invoice","noneof","@NONE@"]
                    ],
                    columns:[
                        search.createColumn({ name: "custcol_clb_invoice"}),
                        search.createColumn({name: "customer"}),
                        search.createColumn({name: "employee"}),
                        search.createColumn({name: "durationdecimal"}),
                        search.createColumn({ name: "casetaskevent" }),
                        search.createColumn({name: "custcol_clb_vendor_bill_link"}),
                        search.createColumn({
                            name: "internalid",
                            join: "item"
                        }),
                        search.createColumn({name: "custcol_clb_timesheettype"}),
                        search.createColumn({name: "isbillable"}),
                        search.createColumn({name: "custcol_clb_weekendingdate"}),
                        search.createColumn({name: "custcol_clb_weekendingday"}),
                        search.createColumn({name: "date"})
                    ]
                    
                 });
                 var searchResultCount = timebillSearchObj.runPaged().count;
                 log.audit("Time Track update count:",searchResultCount)
                 if(searchResultCount>0){
                    return timebillSearchObj;
                 }
                 else{
                    log.audit("No timesheet for correction are available");
                 }
                 
            } catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }
 
        }
        function map(context){
            try{
                log.debug("Map Stage: ","Timesheet ID" + context.key + " context.value" + JSON.stringify(context.value));
                var contextValue = JSON.parse(context.value);
                var timeSheetDetails = contextValue.values;
                var timeSheetID = context.key;
                
                var invoiceID = timeSheetDetails.custcol_clb_invoice.value;
                var projectID = timeSheetDetails.customer.value;
                var vendBillId = timeSheetDetails.custcol_clb_vendor_bill_link.value;
                //------------------------------Creation of negative timesheet-----------------------------------------
               // var timeSheetReversal = createReverseTimeCard(timeSheetDetails,timeSheetID);
               var tsPrcsed = record.submitFields({
                type: record.Type.TIME_BILL,
                id: timeSheetID,
                values: {
                    custcol_invoice_corrected : true
                },
                options: {
                    enablesourcing: true,
                }

            });
            log.debug("tsPrcsed: ", tsPrcsed)
                log.debug("InvoiceID : projectID", invoiceID + " : " +projectID)
                
                if(invoiceID){
                    var value = projectID + "_"+timeSheetID + "_"
                    if(vendBillId){
                        value += vendBillId
                    }
                    context.write({
                        "key":invoiceID,
                        "value": value
                    })
                }
                
            }catch (e) {
                log.error("Errot at Stage : Get Input Data: ", e.message);
                log.error("Errot at Stage : Get Input Data: ", JSON.stringify(e));
            }
            

        }
        function reduce(context) {
            try {
                var invoiceID = context.key;
                var contValues = context.values;
                log.debug("Reduce","Context Value: "+contValues);
                var uniqueProjects = [];
                var timeCards = {};
                for(var cv=0;cv<contValues.length;cv++){
                    var dataSplit = contValues[cv].split("_");
                    var projId = dataSplit[0];
                    var tsId = dataSplit[1];
                    uniqueProjects.push(projId);
                    timeCards[tsId] = dataSplit[2];
                }
                

                uniqueProjects = uniqueProjects.filter(onlyUnique);
                log.debug("Reduce:" ,"InvoiceID:" + invoiceID+ " projectIds: "+ uniqueProjects)
                log.debug("Reduce","Time Cards array for update: "+timeCards);
                log.debug("unique Projects: ", uniqueProjects);
                    var invoiceLookup = search.lookupFields({
                        type: search.Type.INVOICE,
                        id: invoiceID,
                        columns: ['custbody_clb_periodstartingdate', 'custbody_clb_periodendingdate','statusref','custbody_clb_vendor_bill_links','custbody_asc_inv_project_selected']
                    });
                    log.debug("Reduce:" ,"invoiceLookup:" + JSON.stringify(invoiceLookup))
               
                var periodStartDate = invoiceLookup.custbody_clb_periodstartingdate;
                var periodEndDate = invoiceLookup.custbody_clb_periodendingdate;
                var invoiceStatus = invoiceLookup.statusref[0].value;
                var vendorBillLinks = invoiceLookup.custbody_clb_vendor_bill_links;
                var parentProj = invoiceLookup.custbody_asc_inv_project_selected[0].value
                log.debug("vendorBillLinks",vendorBillLinks);
                log.debug("vendorBillLinks.length",vendorBillLinks.length);
                var vcDet = {};
                for(var vb=0;vb<vendorBillLinks.length;vb++){
                  
                    var vendorcredit = reverseVB(vendorBillLinks[vb].value)
                    vcDet[vendorBillLinks[vb].value] = vendorcredit;
                    log.debug("vendorcredit created for Vendor Bill",vendorcredit);

                }    
                log.debug("vendorcredit created for Vendor Bill",JSON.stringify(vcDet));
                log.debug("Create Remaining timesheet reversal:");
                var timebillSearchObj = search.create({
                    type: "timebill",
                    filters:
                    [
                       ["custcol_clb_timesheetupdated","is","F"], 
                       "AND", 
                       ["custcol_clb_invoice","anyof",invoiceID], 
                       "AND", 
                       ["custcol_asc_timesheet_status","anyof","2"], 
                       "AND", 
                       ["status","is","F"], 
                       "AND", 
                       ["custcol_clb_invoice.mainline","is","T"]
                    ],
                    columns:[
                        search.createColumn({ name: "custcol_clb_invoice"}),
                        search.createColumn({name: "customer"}),
                        search.createColumn({name: "employee"}),
                        search.createColumn({name: "durationdecimal"}),
                        search.createColumn({ name: "casetaskevent" }),
                        search.createColumn({
                            name: "internalid",
                            join: "item"
                        }),
                        search.createColumn({name: "custcol_clb_timesheettype"}),
                        search.createColumn({name: "isbillable"}),
                        search.createColumn({name: "custcol_clb_weekendingdate"}),
                        search.createColumn({name: "custcol_clb_weekendingday"}),
                        search.createColumn({name: "date"}),
                        search.createColumn({name: "custcol_clb_vendor_bill_link"}),
                    ]
                    
                 });
                 var remainingTimeTrackCount = timebillSearchObj.runPaged().count;
                 log.audit("Time Track update count:",remainingTimeTrackCount)
                 if(remainingTimeTrackCount>0){
                    timebillSearchObj.run().each(function(result){
                        var hoursinDecimal = result.getValue("durationdecimal")
                        var customer = result.getValue("customer")
                        if(uniqueProjects.indexOf(customer) == -1){
                            uniqueProjects.push(customer);
                        }
                        if(hoursinDecimal>0){
                            timeCards[result.id] = result.getValue("custcol_clb_vendor_bill_link");
                            createReversalandNewTimeCard(result,result.id,hoursinDecimal,vcDet,timeCards);
                        }
                        return true;
                     });  
                 }
               
                log.debug("periodStartDate:periodEndDate ", periodStartDate + " : "+ periodEndDate + " Status: "+invoiceStatus);
                var newInvoiceCreation = createInvoice(invoiceID,periodStartDate,periodEndDate,uniqueProjects)
                log.debug("new Invoice Created:",newInvoiceCreation);
                var cmID = "";
                if(invoiceStatus == "pendingApproval"){
                    record.submitFields({
                        type: "invoice",
                        id: invoiceID,
                        values: {
                            "approvalstatus": 2,
                            "memo": "Reversed the Invoice due to Timesheet Correction",
                          "custbody_asc_transaction_reversed": true,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    })  
                    cmID =  createCreditMemo(invoiceID);
                    log.debug("credit memo : ",cmID)
                    return cmID;
                }
                else if(invoiceStatus == "open"){
                    record.submitFields({
                        type: "invoice",
                        id: invoiceID,
                        values: {
                            "memo": "Reversed the Invoice due to Timesheet Correction",
                          "custbody_asc_transaction_reversed": true,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    }) 
                    cmID =  createCreditMemo(invoiceID);
                    log.debug("credit memo : ",cmID)
                    return cmID;
                       
                }
                else if(invoiceStatus == "paidInFull"){
                    var invoiceObj = record.load({
                        type: record.Type.INVOICE,
                        id: invoiceID,
                        isDynamic: true,
                       });
                    var lineNumber = invoiceObj.findSublistLineWithValue({
                        sublistId: 'links',
                        fieldId: 'type',
                        value: "Payment"
                       });
                    var customerName = invoiceObj.getText("entity");
                    log.debug("customerName: ",customerName)
                    var projectName = invoiceObj.getText("custbody_asc_inv_project_selected");
                    log.debug("projectName: ",projectName)
                    var invId = invoiceObj.getValue("tranid");
                                    log.debug("invId: ",invId)
                    if(lineNumber>-1){
                        var paymentID = invoiceObj.getSublistValue({
                            sublistId: 'links',
                            fieldId: 'id',
                            line: lineNumber
                           }); 
                        log.debug("paymentID", paymentID)  
                            var paymentObj = record.load({
                                type: record.Type.CUSTOMER_PAYMENT,
                                id: paymentID,
                                isDynamic: true,
                            });
                            var invoiceLineNumber = paymentObj.findSublistLineWithValue({
                                sublistId: 'apply',
                                fieldId: 'internalid',
                                value: invoiceID
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
                            var transId = paymentObj.getValue("checknumber")?paymentObj.getValue("checknumber"):paymentObj.getValue("tranid");
                            var tranDate = paymentObj.getText("trandate");
                           var paymentObj = paymentObj.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                                }); 
                            lib.sendEmail(customerName, projectName, transId, "Payment",tranDate,"Invoice",invId)    
                                record.submitFields({
                                    type: "invoice",
                                    id: invoiceID,
                                    values: {
                                        "memo": "Reversed the Invoice due to Timesheet Correction",
                                      "custbody_asc_transaction_reversed": true,
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                }) 
                        cmID =  createCreditMemo(invoiceID);
                            return cmID;   
                    }  
                }
                var tsInternalids = Object.keys(timeCards);
                if(cmID){
                    for(var ts=0;ts<tsInternalids;ts++){
                        var oldTimeSheetID = record.submitFields({
                            type: record.Type.TIME_BILL,
                            id: tsInternalids[ts],
                            values: {
                                custcol_clb_credit_memo : cmID
                            },
                            options: {
                                enablesourcing: true,
                            }
                        });
            log.debug("status update of old timesheet to updated :", oldTimeSheetID)
                    }
                }
                
            } catch (e) {
                log.debug("Errot at Stage : Reduce", JSON.stringify(e))
                log.debug("error message",e.message)
                log.error("Transaction Failure Report creation")
                var errID = lib.trnsctnFailureRec(periodStartDate,periodEndDate,"Invoice Creation Failed because of Script error:" +e.message,1,parentProj)
                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
           }
        }
        function onlyUnique(value, index, array) {
            return array.indexOf(value) === index;
        }
        function createInvoice(invoiceID,periodStartDate,periodEndDate,uniqueProjects){
            try{
                log.debug("createInvoice: ", periodStartDate + " : "+ periodEndDate + " "+uniqueProjects)
               
                var trackTimeObj = search.create({
                    type: "timebill",
                    filters:
                    [
                       ["customer","anyof",uniqueProjects], 
                       "AND", 
                       ["date","within",periodStartDate,periodEndDate], 
                       "AND", 
                       ["custcol_asc_timesheet_status","anyof","2"], 
                       "AND", 
                       ["status","is","T"]
                    ],
                    columns:
                    [
                        search.createColumn({name: "custcol_clb_billrate"})
                    ]
                });
                log.debug("invoice creation function for the projects: ");
                var invoiceObj = record.copy({
                    type: record.Type.INVOICE,
                    id: invoiceID,
                    isDynamic: true
                   });
                   var trackTimeIDs = [];
                   trackTimeObj.run().each(function(result){
                    trackTimeIDs.push(result.id);
                        var linenum = invoiceObj.findSublistLineWithValue({
                            sublistId: 'time',
                            fieldId: 'doc',
                            value: result.id
                        });
                        if(linenum>-1){
                            invoiceObj.selectLine({
                                sublistId: 'time',
                                line: linenum
                            });
                            invoiceObj.setCurrentSublistValue({
                                sublistId: 'time',
                                fieldId: 'apply',
                                value: true
                            });
                            invoiceObj.setCurrentSublistValue({
                                sublistId: 'time',
                                fieldId: 'rate',
                                value: result.getValue("custcol_clb_billrate")
                            });
                            invoiceObj.commitLine({
                                sublistId: 'time'
                            });
                        }
                        
                        return true;
                    });
                    var parentProj = invoiceObj.getValue("custbody_asc_inv_project_selected")
                    invoiceObj.setValue("custbody_clb_vendor_bill_links","")
                    var invoiceID = invoiceObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    for(var ii = 0;ii<trackTimeIDs.length;ii++){
                        record.submitFields({
                            type: record.Type.TIME_BILL,
                            id: trackTimeIDs[ii],
                            values: {
                                "custcol_clb_invoice": invoiceID
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        })
                    }
                    return invoiceID;

            }catch(e){
                log.debug("Errot at Stage : createInvoice function", JSON.stringify(e))
                log.error("Transaction Failure Report creation")
                var errID = lib.trnsctnFailureRec(periodStartDate,periodEndDate,"Invoice Creation Failed because of Script error:" +e.message,1,parentProj)
                log.error("Error in createInvoice: Created the Transaction Error ID", errID);
            }
           
                
        }
        // function createReverseTimeCard(timeSheetDetails,timeSheetID){
        //     try {
        //         log.audit("createReverseTimeCard for time track id: ", timeSheetID);
        //         var projectID = timeSheetDetails.customer.value;
        //         var employee = timeSheetDetails.employee.value;
        //         var hours = timeSheetDetails.durationdecimal;
        //         var caseTask = timeSheetDetails.casetaskevent.value;
        //         var item = timeSheetDetails["internalid.item"].value;
        //         var timeSheetType = timeSheetDetails.custcol_clb_timesheettype.value;
        //         var isBillable = timeSheetDetails.isbillable;
        //         var weekendingDate = timeSheetDetails.custcol_clb_weekendingdate;
        //         var weekendingDay = timeSheetDetails.custcol_clb_weekendingday.value
        //         var date = timeSheetDetails.date;

        //         if(isBillable == 'T'){
        //             isBillable = true;
        //         }
        //         else{
        //             isBillable = false;
        //         }
        //         log.debug("createReverseTimeCard: " ,"create negative timesheet: " + isBillable);
        //         var NegativetimesheetRecord = record.create({
        //             type: record.Type.TIME_BILL
        //         });

    
        //         // Set field values from the JSON object
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'employee',
        //             value: employee
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'trandate',
        //             value: new Date(date)
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'hours',
        //             value: -parseFloat(hours)             //-(timesheetData.hours).toString()
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'customer',
        //             value: projectID
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'custcol_asc_timesheet_status',
        //             value: 4,
        //         });
    
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'casetaskevent',
        //             value: caseTask
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'item',
        //             value: item
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'custcol_clb_timesheettype',
        //             value: timeSheetType
        //         });
        //         NegativetimesheetRecord.setValue({
        //             fieldId: 'isbillable',
        //             value: isBillable
        //         });

        //         if(weekendingDate){
        //             NegativetimesheetRecord.setValue({
        //                 fieldId: 'custcol_clb_weekendingdate',
        //                 value: new Date(weekendingDate)
        //             });
        //         }
        //         if(weekendingDay){
        //             NegativetimesheetRecord.setValue({
        //                 fieldId: 'custcol_clb_weekendingday',
        //                 value: weekendingDay
        //             });
        //         }
                
            
        //         var NegtimesheetId = NegativetimesheetRecord.save({
        //             enableSourcing: false,
        //             ignoreMandatoryFields: true
        //         });

        //         log.debug('Created Negative Timesheet Record', 'Record ID: ' + NegtimesheetId);
        //         var oldTimeSheetID = record.submitFields({
        //             type: record.Type.TIME_BILL,
        //             id: timeSheetID,
        //             values: {
        //                 custcol_asc_timesheet_status: 3,
        //             },
        //             options: {
        //                 enablesourcing: true,
        //             }
        //         });
        //         log.debug("status update of old timesheet :", oldTimeSheetID)
        //         return NegtimesheetId;
        //     } catch (error) {
        //         log.debug("Error in createNegativeTimsheet", error)
        //     }
        // }
        function createReversalandNewTimeCard(result,timeSheetID,hours,vcDet,timeCards){
            log.debug("createReversalandNewTimeCard","create Reversal and new timesheet of the attached remaining time cards to the invoice");
            var reversalTimeTrack = record.copy({
                type: record.Type.TIME_BILL,
                id: timeSheetID,
                isDynamic: true
               });
            var uniqueId = reversalTimeTrack.getValue({fieldId: "custcol_clb_uniqueid"});
            log.debug({title: "uniqueId", details: uniqueId});   
            reversalTimeTrack.setValue({fieldId: "custcol_clb_uniqueid", value: uniqueId+"_Rev"});
            if(hours>0){
                reversalTimeTrack.setValue("hours", -parseFloat(hours));
            }else{
                reversalTimeTrack.setValue("hours", 0);

            }

            reversalTimeTrack.setValue({fieldId: 'custcol_asc_timesheet_status', value: 4,});
            reversalTimeTrack.setValue({fieldId: "custcol_reversed_from_timesheet", value: timeSheetID});
            reversalTimeTrack.setValue({fieldId: "custcol_asc_timesheet_reversed", value: true});
            reversalTimeTrack.setValue("billed", false);
            reversalTimeTrack.setValue("custcol_clb_invoice", '');
            reversalTimeTrack.setValue("custcol_clb_vendor_bill_link", '');
            var negativetimesheetRecord = reversalTimeTrack.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
            log.debug("createReversalandNewTimeCard : reversalTimeTracke",negativetimesheetRecord);

            var newTimeTrack = record.copy({
                type: record.Type.TIME_BILL,
                id: timeSheetID,
                isDynamic: true
               }); 
               
            newTimeTrack.setValue("custcol_clb_invoice", '');
            var vendLink = newTimeTrack.getValue("custcol_clb_vendor_bill_link");
            log.debug("vendLink",vendLink)
            var vcDetKeys = Object.keys(vcDet);
            log.debug("vcDetKeys",vcDetKeys + " :vcDetKeys.indexOf(vendLink) "+vcDetKeys.indexOf(vendLink));
            if(vcDetKeys.indexOf(vendLink)>-1){
                newTimeTrack.setValue("custcol_clb_vendor_bill_link", '');
            }
            var projectID = newTimeTrack.getValue({ fieldId: "customer" });
            var task = newTimeTrack.getText({ fieldId: "casetaskevent" });
            var item = newTimeTrack.getText({ fieldId: "item" });
            var projectLookUp = search.lookupFields({
                type: "job",
                id: projectID,
                columns: ['custentity_clb_parentproject']
            }) 
            if(projectLookUp.custentity_clb_parentproject[0]){
           // log.debug("projectLookUp",projectLookUp)
            var parentProj = projectLookUp.custentity_clb_parentproject[0].value;
            //log.debug("parentProj: ",parentProj);
                newTimeTrack.setValue("customer", parentProj);  
                newTimeTrack.setText("casetaskevent", task); 
                newTimeTrack.setText("item", item);  
            }
            newTimeTrack.setValue("billed", false);
            var newTimeTrackID = newTimeTrack.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            }); 
            var vendId = timeCards[timeSheetID]
            log.debug("createReversalandNewTimeCard : newTimeTrack",newTimeTrackID);

            var oldtsVals= {
                custcol_asc_timesheet_status: 3,
                custcol_clb_timesheetupdated: true,
                custcol_clb_uniqueid: uniqueId+"_Updated",
                custcol_invoice_corrected : true,
                //custcol_clb_vendor_credit : vcDet[vendId]
            };
            if(vcDetKeys.indexOf(vendLink)<0){
                oldtsVals["custcol_clb_vendor_bill_link"] = "";
                oldtsVals["custcol_vb_corrected"] = true;
            }else{
                if(vcDet[vendId]){
                    oldtsVals["custcol_clb_vendor_credit"] = vcDet[vendId]
                }
                oldtsVals["custcol_vb_corrected"] = true;
            }
            var oldTimeSheetID = record.submitFields({
                                type: record.Type.TIME_BILL,
                                id: timeSheetID,
                                values: oldtsVals,
                                options: {
                                    enablesourcing: true,
                                }
                            });
                log.debug("status update of old timesheet to updated :", oldTimeSheetID)
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

                    attachReversaltoInvBillScheduleRec(cmObjid,invoiceId);
                    return cmObjid;
            }catch (e) {
                log.error("Error in createCreditMemo", JSON.stringify(e));
              }
            
        }
        function reverseVB(vbID){
            try{
                log.debug("Reverse Vendor Bill created from Invoice")
                var configObj = config.load({
                    type: config.Type.COMPANY_PREFERENCES
                 });
                    var achFees = configObj.getValue('custscript_clb_ach_fee');
                    var placeFees = configObj.getValue('custscript_clb_place_fee');
                    var insuranceCharges = configObj.getValue('custscript_clb_insurance_charge');
                    var calWHT = configObj.getValue('custscript_clb_california_wht');
                    log.debug("achFees : placeFees : insuranceCharges : calWHT",achFees + " : " + placeFees + " : " + insuranceCharges + " : " + calWHT)
                var vendorCreditid = "";
                var vendorCredit;
                //var remainingAmt = vbLookup.amountremaining;
                var vbObj = record.load({
                    type: record.Type.VENDOR_BILL,
                    id: vbID,
                    isDynamic: true,
                    });
            vbStatus =  vbObj.getValue("status");       
                log.debug("VB status",vbStatus);
                if(vbStatus == "Pending Approval"){
                    vbObj.setValue("memo", "Vendor Bill Reversed due to Timesheet changes")
                    vbObj.setValue("custbody_asc_transaction_reversed", true)
                    vbObj.setValue("approvalstatus",2)
                    var vbID = vbObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    log.debug("Vendor Bill approved.");
                    log.debug("inside vendor credit creation")
                    vendorCredit = record.transform({
                        fromType: record.Type.VENDOR_BILL,
                        fromId: vbID,
                        toType: record.Type.VENDOR_CREDIT,
                        isDynamic: true,
                    });
                    vendorCredit.setValue("taxdetailsoverride",true)
                    vendorCredit.setValue("memo", "Vendor Credit created because of Change in Timesheet.")
                    vendorCredit.setValue("custbody_asc_createdfromtimetrack", "");
                    var entityId = "VC_"+vendorCredit.getValue("tranid")+"_REV"
                    vendorCredit.setValue("tranid",entityId)
                    // var itemLineCount = vendorCredit.getLineCount({
                    //             sublistId: 'item'
                    //             });
                    //         if(itemLineCount > 1){
                    //             log.debug("Removing other lines due to Credit Memo created for Fees.")
                    //             for(var rm=1;rm<itemLineCount;rm++){
                    //                 vendorCredit.removeLine({
                    //                     sublistId: 'item',
                    //                     line: rm,
                    //                     ignoreRecalc: true
                    //                    });
                                       
                    //             }
                    //         }
                            // vendorCredit.selectLine({
                            //     sublistId: 'item',
                            //     line: 0
                            // });
                            // vendorCredit.setCurrentSublistValue({
                            //     sublistId: 'item',
                            //     fieldId: 'quantity',
                            //     value: 1
                            // });
                            // vendorCredit.setCurrentSublistValue({
                            //     sublistId: 'item',
                            //     fieldId: 'rate',
                            //     value: remainingAmt
                            // });
                            // vendorCredit.commitLine({
                            //     sublistId: 'item'
                            // }); 
                    var vbLineNumber = vendorCredit.findSublistLineWithValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        value: vbID
                        }); 
                        log.debug("vbLineNumber",vbLineNumber)
                        if(vbLineNumber>=0){
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
                        log.debug("Reduce","Vendor Credit Created: "+vendorCreditid)
    
                }
                else if(vbStatus == "Paid In Full"  || vbStatus == "Open"){
                    var oldEntityId = vbObj.getValue("tranid");
                    var periodStart = vbObj.getText('custbody_clb_startdate');
                    var periodEnd = vbObj.getText('custbody_clb_enddate');
                    var projectSelected = vbObj.getValue("custbody_asc_inv_project_selected");
                    var vendId = vbObj.getValue("entity");
                    var revVBId = '';
                    var linkLineCount = vbObj.getLineCount({
                        sublistId: 'links'
                        });
                    var billCredits = {};
                    log.debug("Total Credits Available",linkLineCount)
                        if(linkLineCount > 0){
                            
                            for(var links=0;links<linkLineCount;links++){
                               var type = vbObj.getSublistValue({
                                sublistId: 'links',
                                fieldId: 'type',
                                line: links
                                }); 
                                if(type == "Bill Credit"){
                                    var docId = vbObj.getSublistValue({
                                        sublistId: 'links',
                                        fieldId: 'tranid',
                                        line: links
                                        }); 
                                    if(docId.indexOf("ACH")>=0 || docId.indexOf("PLACE")>=0 || docId.indexOf("INSURE")>=0 || docId.indexOf("CWHT")>=0){
                                        var amount = vbObj.getSublistValue({
                                            sublistId: 'links',
                                            fieldId: 'total',
                                            line: links
                                            }); 
                                        billCredits[docId] = amount;
                                    }
                                }
                            }
                        }
                    var creditKeys = Object.keys(billCredits);    
                    log.debug("creditKeys",creditKeys)
                    if(creditKeys.length>0){
                        log.debug("Creation of VB to adjust the AP Deductions")
                        var revVendBill = record.create({
                            type: record.Type.VENDOR_BILL,
                            isDynamic: true
                           });
                           var reventityId = oldEntityId+'_APADJ'
                           log.debug("reventityId",reventityId)
                           revVendBill.setValue("entity",vendId)
                           revVendBill.setValue("tranid",reventityId); 
                           revVendBill.setValue('custbody_asc_createdfromtimetrack',"");
                           revVendBill.setValue("approvalstatus",2);
                        
                           log.debug("billCredits",billCredits)
                            Object.keys(billCredits).forEach(function(key) {
                                log.debug("inside select line")
                                revVendBill.selectNewLine('item');
                                if(key.indexOf("ACH")>=0)
                                {
                                    revVendBill.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: achFees
                                       });
                                }
                                if(key.indexOf("PLACE")>=0)
                                {
                                    revVendBill.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: placeFees
                                       });
                                }
                                if(key.indexOf("INSURE")>=0)
                                {
                                    revVendBill.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: insuranceCharges
                                       });
                                }
                                if(key.indexOf("CWHT")>=0)
                                {
                                    revVendBill.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: calWHT
                                       });
                                }
                                
                                revVendBill.setCurrentSublistValue('item', 'quantity', 1);
                                revVendBill.setCurrentSublistValue('item', 'rate', billCredits[key]);
                                revVendBill.setCurrentSublistValue('item', 'custcol_clb_subconemployee', employee);
                                revVendBill.setCurrentSublistValue('item', 'customer', projectSelected);
                               // revVendBill.setCurrentSublistValue('item', 'custcol_fees_ap_deduction', parseFloat(insuranceCharges));
                                
                                revVendBill.commitLine('item');
                            });
                            revVendBill.setValue("custbody_clb_startdate",new Date(periodStart))
                            revVendBill.setValue("custbody_clb_enddate",new Date(periodEnd))
                            revVendBill.setValue("custbodyclb_vendorbillcatory",7);
                            revVendBill.setValue("custbody_asc_transaction_reversed", true)
                            revVendBill.setValue("memo", "Vendor Bill created to Adjust AP Deductions.")
                            revVendBill.setValue('custbody_clb_created_from_inv','')
                            revVendBill.setValue("custbody_asc_inv_project_selected",projectSelected);
                            revVendBill.setValue("taxdetailsoverride",true)
                            revVBId = revVendBill.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            });
                            log.debug("Reversed Vendor Bill Created",revVBId);
                            

                    }  


                    var paymentID = ""
                    var lineNumber = vbObj.findSublistLineWithValue({
                        sublistId: 'links',
                        fieldId: 'type',
                        value: 'Bill Payment'
                        });
                   log.debug("lineNumber",lineNumber);    
                   if(lineNumber>=0){
    
                    paymentID = vbObj.getSublistValue({
                        sublistId: 'links',
                        fieldId: 'id',
                        line: lineNumber
                        }); 
                    log.debug("paymentID", paymentID)  
                   }
                    
                    if(paymentID && vbStatus == "Paid In Full"){
                        log.debug("inside standalone vendor credit creation")
                        vendorCredit = record.transform({
                            fromType: record.Type.VENDOR_BILL,
                            fromId: vbID,
                            toType: record.Type.VENDOR_CREDIT,
                            isDynamic: true,
                        });
                        vendorCredit.setValue("taxdetailsoverride",true)
                        vendorCredit.setValue("memo", "Vendor Credit created because of Change in Timesheet.")
                        var vbentity = vendorCredit.getValue("tranid")
                        var entityId = "VC_"+vbentity+"_REV"
                        vendorCredit.setValue("tranid",entityId)
                        // var itemLineCount = vendorCredit.getLineCount({
                            if(revVBId){
                                var vbLineNumber = vendorCredit.findSublistLineWithValue({
                                   sublistId: 'apply',
                                   fieldId: 'internalid',
                                   value: revVBId
                                   }); 
                                   log.debug("vbLineNumber",vbLineNumber)
                                   if(vbLineNumber>=0){
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
                           }
                           var vendorName = vendorCredit.getText("entity");
                           log.debug("vendorName: ",vendorName)
                           var projectName = vendorCredit.getText("custbody_asc_inv_project_selected");
                           log.debug("projectName: ",projectName)
                           var tranDate = vendorCredit.getValue("trandate");
                         vendorCreditid = vendorCredit.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        lib.sendEmail(vendorName, projectName, entityId, "Vendor Credit",tranDate,"Vendor Bill",vbentity)   
                        log.debug("Reduce","Vendor Credit Created: "+vendorCreditid)
                          
                    }
                    if(vbStatus == "Open"){
                        log.debug("inside vendor credit creation")
                        vbObj.setValue("memo", "Vendor Bill Reversed due to Timesheet changes")
                        vbObj.setValue("custbody_asc_transaction_reversed", true)
                   //vbObj.setValue("approvalstatus",2)
                        var vbID = vbObj.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                         vendorCredit = record.transform({
                            fromType: record.Type.VENDOR_BILL,
                            fromId: vbID,
                            toType: record.Type.VENDOR_CREDIT,
                            isDynamic: true,
                        });
                        vendorCredit.setValue("taxdetailsoverride",true)
                        vendorCredit.setValue("memo", "Vendor Credit created because of Change in Timesheet")
                        vendorCredit.setValue("custbody_asc_createdfromtimetrack", "");
                        var entityId = "VC_"+vendorCredit.getValue("tranid")+"_REV"
                        vendorCredit.setValue("tranid",entityId)
                        
                        var vbLineNumber = vendorCredit.findSublistLineWithValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            value: vbID
                            }); 
                            log.debug("vbLineNumber",vbLineNumber)
                            if(vbLineNumber>=0){
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
                            if(revVBId){
                                vbLineNumber = vendorCredit.findSublistLineWithValue({
                                   sublistId: 'apply',
                                   fieldId: 'internalid',
                                   value: revVBId
                                   }); 
                                   log.debug("vbLineNumber",vbLineNumber)
                                   if(vbLineNumber>=0){
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
                           }
                             vendorCreditid = vendorCredit.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            });
                            log.debug("Reduce","Vendor Credit Created: "+vendorCreditid)
                       
                       
                    }
                     vbObj.setValue("memo", "Vendor Bill Reversed due to Timesheet changes")
                     vbObj.setValue("custbody_asc_transaction_reversed", true)
                    //vbObj.setValue("approvalstatus",2)
                    var vbID = vbObj.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                        
                }  
                return vendorCreditid;               
            }catch (e) {
                //log.debug("Errot at Stage : reverse Vendor Bill", e)
                log.error({
                    title: 'Error at reverse vendor bill', 
                    details: e
                });
           }
            
            
        }

        function attachReversaltoInvBillScheduleRec(cmID, invId){
            try{
                log.debug("attachReversaltoInvBillScheduleRec","Attach Credit Memo to the Invoice Bill Schedule")

                const sqlString = `select custrec.id from customrecord_asc_invbill_schedule as custrec inner join transaction on transaction.id = custrec.custrecord_asc_schrec_invoice AND transaction.id = ${invId}`;
                const sqlResults = query.runSuiteQL({ query: sqlString }).asMappedResults();
                log.debug("sqlResults",sqlResults);

                let invBillSchRecId = sqlResults[0].id;
                log.debug("invBillSchRecId",invBillSchRecId);

                if(!invBillSchRecId){
                    log.error(`No Invoice Bill Schedule Record found for the Invoice ID ${invId}`);
                }else{

                    record.submitFields({
                        type: "customrecord_asc_invbill_schedule",
                        id: invBillSchRecId,
                        values: {"custrecord_asc_schrec_creditmemo": cmID, "custrecord_asc_schrec_reversed" : true},
                    });

                    log.debug("Credit Memo attached to the Invoice Bill Schedule Record ID: "+invBillSchRecId, "Credit Memo ID: "+cmID);
                }

                log.debug("attachReversaltoInvBillScheduleRec","Credit Memo attached to the Invoice Bill Schedule Record ID: "+invBillSchRecId)
            }catch (e) {
                log.error("Error in attachReversaltoInvBillScheduleRec", JSON.stringify(e));
              }
        }
        
      function summarize(context){
            log.debug("reduce summary:" , JSON.stringify(context.reduceSummary));
        log.debug("Map summary:" , JSON.stringify(context.mapSummary))

        } 
        return {
            getInputData: getInputData,
            map:map,
            reduce: reduce,
          summarize:summarize
        };
    });