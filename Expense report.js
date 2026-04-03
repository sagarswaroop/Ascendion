/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
 define(['N/search', 'N/record', 'N/runtime'], function (search, record, runtime) {

    function getInputData() {
        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
                [
                    [["type", "anyof", "ExpRept"], "OR", [["type", "anyof", "VendBill"], "AND", ["item", "noneof", "@NONE@"], "AND", ["approvalstatus", "anyof", "2"]]],
                    "AND",
                    ["custbody_clb_invoicegenerated", "is", "F"],
                    "AND",
                    ["billable", "is", "T"],
                    "AND",
                    ["customer.internalid", "isnotempty", ""]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "Internal ID"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "customer",
                        summary: "GROUP",
                        label: "Internal ID"
                    }),
                    search.createColumn({
                        name: "altname",
                        join: "job",
                        summary: "GROUP",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "fxamount",
                        summary: "SUM",
                        label: "Amount (Foreign Currency)"
                    }),
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "Item"
                    }),
                    search.createColumn({
                        name: "type",
                        summary: "GROUP",
                        label: "Type"
                    }),
                    search.createColumn({
                        name: "custentity_clb_projecttypeforinvoicing",
                        join: "customer",
                        summary: "GROUP",
                        label: "Project Type For Invoicing "
                    }),
                    search.createColumn({
                        name: "transactionnumber",
                        summary: "GROUP",
                        label: "Transaction Number"
                    }),
                    search.createColumn({
                        name: "customer",
                        join: "job",
                        summary: "GROUP",
                        label: "Customer"
                    }),
                    search.createColumn({
                        name: "trandate",
                        summary: "GROUP",
                        sort: search.Sort.ASC,
                        label: "Date"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        summary: "GROUP",
                        formula: "CONCAT(CONCAT({internalid}, '_'),{linesequencenumber})",
                        label: "Formula (Text)"
                    }),
                    search.createColumn({
                        name: "subsidiary",
                        join: "customer",
                        summary: "GROUP",
                        label: "Primary Subsidiary (no hierarchy)"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "employee",
                        summary: "GROUP",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "custcol_clb_subconemployee",
                        summary: "GROUP",
                        label: "Subcon Employee"
                    }),
                    search.createColumn({
                        name: "custbody_clb_startdate",
                        summary: "GROUP",
                        label: "Start Date"
                    }),
                    search.createColumn({
                        name: "custbody_clb_enddate",
                        summary: "GROUP",
                        label: "End Date"
                    }),
                    search.createColumn({
                        name: "formulanumeric",
                        summary: "MAX",
                        formula: "CASE WHEN {applyingtransaction.fxamount} is NULL THEN{fxamount} ELSE {fxamount}+{applyingtransaction.fxamount} END",
                        label: "Formula (Numeric)"
                    })
                ]
        });
        var searchResultCount = transactionSearchObj.runPaged().count;
        log.debug("transactionSearchObj result count", searchResultCount);
        // transactionSearchObj.run().each(function (result) {
        //     // .run().each has a limit of 4,000 results
        //     return true;
        // });
        if(searchResultCount>0){
            return transactionSearchObj;
        }else{
            log.debug("No Expense available")
        }
    }

    function map(context) {
        try {
            
            var expenseDetalisObj = {};
            var expenseResults = JSON.parse(context.value);
            var expenseDetails = expenseResults.values;
            log.audit("expenseDetails", expenseDetails)
            var expenseInternalID = expenseDetails["GROUP(internalid)"].value;
            var customerID = expenseDetails["GROUP(customer.job)"].value;
            var projectID = expenseDetails["GROUP(altname.job)"];
            var projectInternalID = expenseDetails["GROUP(internalid.customer)"].value;
            var amount = expenseDetails["SUM(fxamount)"];
            //var amount = expenseDetails["MAX(formulanumeric)"];
            var tranUniqueValue = expenseDetails["GROUP(internalid)"].value;
            var projectTypeForInvoicing = expenseDetails["GROUP(custentity_clb_projecttypeforinvoicing.customer)"].value;
            var date = expenseDetails["GROUP(trandate)"];
            var startDate = expenseDetails["GROUP(custbody_clb_startdate)"];
            var endDate = expenseDetails["GROUP(custbody_clb_enddate)"];
            var type = expenseDetails["GROUP(type)"].value;
            if (type == "VendBill") {
                var employee = expenseDetails["GROUP(custcol_clb_subconemployee)"].value;
            } else {
                var employee = expenseDetails["GROUP(internalid.employee)"].value;
            }

            var item = expenseDetails["GROUP(item)"].value;
            if (item == null || item == "")
                item = "empty";
            //log.audit("Type", type + "item" + item + "tranUniqueValue" + tranUniqueValue)
            var uniqueData = customerID + projectInternalID + employee + startDate + endDate + type;
           // log.audit("projectID", projectID + "amount" + amount + "date" + date + "uniqueData" + uniqueData)
            expenseDetalisObj.expenseinternalid = expenseInternalID;
            expenseDetalisObj.customerid = customerID;
            expenseDetalisObj.projectid = projectInternalID;
            expenseDetalisObj.amount = amount;
            expenseDetalisObj.projecttypeforinvoicing = projectTypeForInvoicing;
            expenseDetalisObj.date = date;
            expenseDetalisObj.startDate = startDate;
            expenseDetalisObj.endDate = endDate;
            expenseDetalisObj.type = type;
            expenseDetalisObj.item = item;
            expenseDetalisObj.employee = employee;
            expenseDetalisObj.subsidiary = expenseDetails["GROUP(subsidiary.customer)"].value;
            expenseDetalisObj.tranuniquevalue = tranUniqueValue
            context.write({
                key: uniqueData,
                value: expenseDetalisObj
            })
        } catch (e) {
            log.error("Map Error", e.message)
            context.write({
                key: expenseInternalID,
                value: {
                    expnseError: e.message
                }
            })
        }

    }

    function reduce(context) {
        try{

        var expenseInternalID = context.key;
        var user = runtime.getCurrentUser().id;

        log.audit("date", expenseInternalID+"user"+user)
        var data = context.values;
        var invoiceRec = record.create({
            type: "invoice",
            isDynamic: true
        })
        invoiceRec.setValue({
            fieldId: "customform",
            value: 188
        })
        var expenseIDArray = []
        log.debug("data.length",data.length);
        for (var i = 0; i < data.length; i++) {
            log.audit("data", JSON.parse(data[i]))
            var reduceData = JSON.parse(data[i])
            expenseIDArray.push(reduceData.expenseinternalid)
            try {
                if (i == 0) {
                    invoiceRec.setValue({
                        fieldId: "entity",
                        value: reduceData.customerid
                    });
                    invoiceRec.setValue({
                        fieldId: "entity",
                        value: reduceData.projectid
                    });

                    if(reduceData.startDate)
                    invoiceRec.setValue({
                        fieldId: "custbody_clb_periodstartingdate",
                        value: new Date(reduceData.startDate)
                    });
                    if(reduceData.endDate)
                    invoiceRec.setValue({
                        fieldId: "custbody_clb_periodendingdate",
                        value: new Date(reduceData.endDate)
                    });
                   /* invoiceRec.setValue({
                        fieldId: "custbody_clb_transactioncreatedbyuser",
                        value: runtime.getCurrentUser().id;
                    })*/
                    // var customrecord_clb_approvalmatrixSearchObj = search.create({
                    //     type: "customrecord_clb_approvalmatrix",
                    //     filters:
                    //     [
                    //        ["custrecord_clb_transactiontypes","anyof","7"], 
                    //        "AND", 
                    //        ["isinactive","is","F"], 
                    //        "AND", 
                    //        ["custrecord_clb_subsidiaries","anyof",reduceData.subsidiary], 
                    //        "AND", 
                    //        ["custrecord_clb_invoicetype","anyof","9"]
                    //     ],
                    //     columns:
                    //     [
                    //        search.createColumn({
                    //           name: "internalid",
                    //           sort: search.Sort.ASC,
                    //           label: "Internal ID"
                    //        }),
                    //        search.createColumn({name: "custrecord_clb_approvallevel1role", label: "Approval Level 1 Role"})
                    //     ]
                    //  });
                    //  var searchResultCount = customrecord_clb_approvalmatrixSearchObj.runPaged().count;
                    //  log.debug("customrecord_clb_approvalmatrixSearchObj result count",searchResultCount);
                    //  var roleID = "";
                    //  customrecord_clb_approvalmatrixSearchObj.run().each(function(result){
                    //     // .run().each has a limit of 4,000 results
                    //     roleID = result.getValue({name: "custrecord_clb_approvallevel1role"})
                    //     return true;
                    //  });
                   /// if(roleID)
                    //  invoiceRec.setValue({
                       // fieldId: "custbody_clb_pendingapprovalfromrole",
                       // value: roleID
                     //  })
                    invoiceRec.setValue({
                        fieldId: "taxdetailsoverride",
                        value: true
                    })
                    invoiceRec.setValue({
                        fieldId: "custbody_clb_projecttypeapproval",
                        value: 9
                    })

                    var taxLineCount = invoiceRec.getLineCount({ sublistId: 'taxdetails' })
                    log.audit("taxLineCount", taxLineCount)
                    for (var k = 0; k < taxLineCount; k++) {
                        log.audit("k", k)
                        invoiceRec.removeLine({
                            sublistId: 'taxdetails',
                            line: 0
                        });
                    }
                }
                var sublistID = "expcost";
                log.audit("reduceData.type ", reduceData.type + "reduceData.item" + reduceData.item)
                if (reduceData.type == "VendBill" && reduceData.item != "empty") {
                    sublistID = "itemcost";
                }
                log.audit("sublistID", sublistID + "reduceData.item" + reduceData.item)
                var expenseCount = invoiceRec.getLineCount({
                    sublistId: sublistID
                })
                log.audit("expenseCount", expenseCount + "Amount" + reduceData.amount)
                //for (var j = 0; j < expenseCount; j++) {
                    try {
                        var tranUniqueNumber = sublistID + "_" + reduceData.tranuniquevalue + "_"+(i+1);
                        var lineNumber = invoiceRec.findSublistLineWithValue({
                            sublistId: sublistID,
                            fieldId: 'taxdetailsreference',
                            value: tranUniqueNumber
                           });
                           log.debug("lineNumber for tranUniqueNumber: "+tranUniqueNumber,lineNumber)
                           if(lineNumber>=0){
                                invoiceRec.selectLine({ sublistId: sublistID, line: lineNumber });
                                invoiceRec.setCurrentSublistValue({
                                    sublistId: sublistID,
                                    fieldId: "apply",
                                    value: true
                                })
                            //     invoiceRec.setCurrentSublistValue({
                            //     sublistId: sublistID,
                            //     fieldId: "amount",
                            //     value: reduceData.amount
                            // })
                                invoiceRec.commitLine({ sublistId: sublistID });

                           }
                        // var expenseDoc = invoiceRec.getSublistValue({
                        //     sublistId: sublistID,
                        //     fieldId: "doc",
                        //     line: j
                        // })
                        // var expenseProjectId = invoiceRec.getSublistValue({
                        //     sublistId: sublistID,
                        //     fieldId: "job",
                        //     line: j
                        // })
                       
                        
                       // log.audit("expenseProjectId: ", taxReferenceNumber + ":  tranUniqueNumber:  " + tranUniqueNumber)
                        //if (expenseDoc == reduceData.expenseinternalid && expenseProjectId == reduceData.projectid) {\
                        // if (tranUniqueNumber == taxReferenceNumber) {
                           
                        //     if(sublistID == "itemcost"){
                        //         invoiceRec.setCurrentSublistValue({
                        //             sublistId: sublistID,
                        //             fieldId: "itemcostcount",
                        //             value: 1
                        //         })
                        //         invoiceRec.setCurrentSublistValue({
                        //             sublistId: sublistID,
                        //             fieldId: "cost",
                        //             value: reduceData.amount
                        //         }) 
                        //     }
                        //     // invoiceRec.setCurrentSublistValue({
                        //     //     sublistId: sublistID,
                        //     //     fieldId: "amount",
                        //     //     value: reduceData.amount
                        //     // })
                        //     // invoiceRec.setCurrentSublistValue({
                        //     //     sublistId: sublistID,
                        //     //     fieldId: "grossamt",
                        //     //     value: reduceData.amount
                        //     // })
                           
                        //     break;
                        // }
                    } catch (e) {
                        log.error("Error", e.message)
                        log.error("Error", JSON.stringify(e))
                    }
               // }

            } catch (e) {
                log.error("Error", e.message)
                log.error("Error", JSON.stringify(e))
            }
        }
        var invID = invoiceRec.save({ enableSourcing: true, ignoreMandatoryFields: true })
        log.audit("invID", invID+"expenseIDArray"+expenseIDArray+"length_"+expenseIDArray.length)
        if (invID) {
            if (reduceData.type == "VendBill") {
                log.audit("submit Vendor bill")
                for(var l=0;l<expenseIDArray.length;l++){
                    record.submitFields({
                        type: "vendorbill",
                        id: expenseIDArray[l],
                        values: {
                            "custbody_clb_invoicegenerated": true,
                            "custbody_clb_billableinvoicerefno": invID
                        }
                    })
                }
                

            } else {
              for(var l=0;l<expenseIDArray.length;l++){
                record.submitFields({
                    type: "expensereport",
                    id: expenseIDArray[l],
                    values: {
                        "custbody_clb_invoicegenerated": true,
                        "custbody_clb_billableinvoicerefno": invID
                    }
                })
              }
            }

        }

        }catch(e){
             log.error("Error", e.message)
             log.error("Error", JSON.stringify(e))
        }
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});