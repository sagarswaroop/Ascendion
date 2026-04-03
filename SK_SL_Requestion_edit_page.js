/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@author Sagar Kumar
 *@description shows the po page to enter the details for purchase order creation.
 */

const DEFAULTFORM = 183;
define([
    "N/ui/serverWidget",
    "N/record",
    "N/search",
    "N/query",
    "N/email",
    "N/file",
    "N/runtime",
    "N/render",
    "N/ui/message",
    "N/error",
    "N/redirect"
], function (
    serverWidget,
    record,
    search,
    query,
    email,
    file,
    runtime,
    render,
    message,
    error,
    redirect
) {

    function summaryUi(subTotal, textTotal, totalAmount) {
        return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Summary Box</title>
      <style>
          .summary-box {
              width: 200px;
              border: 1px solid #d3d3d3;
              background-color: #e6edf4;
              padding: 10px;
              font-family: Arial, sans-serif;
              margin-left: 80px;
              margin-top: 70px;
          }
          .summary-box h2 {
              margin-top: 0;
              font-size: 18px;
              color: white;
              background-color: #506a8b;
              padding: 5px;
              text-align: center;
          }
          .summary-item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
          }
          .summary-total {
              border-top: 1px solid #000;
              margin-top: 5px;
              padding-top: 5px;
              font-weight: bold;
          }
      </style>
  </head>
  <body>
      <div class="summary-box">
          <h2>Summary</h2>
          <div class="summary-item">
              <span>SUBTOTAL</span>
              <span id='cust_ui_amt'>${subTotal}.00</span>
          </div>
          <div class="summary-item">
              <span>TAX TOTAL</span>
              <span>To Be Generate</span>
          </div>
          <div class="summary-item summary-total">
              <span>TOTAL</span>
              <span>To Be Generate</span>
          </div>
      </div>
  </body>
  </html>`
    }

    // add drop down options to selction type field
    function addDropeDownList(recType, DEFAULTSUBSIDIARY, columnvalue, Field) {

        // null for fist time.
        Field.addSelectOption({
            value: "",
            text: "",
        });

        var vendorSearchObj = search.create({
            type: recType,
            filters: [["subsidiary", "anyof", DEFAULTSUBSIDIARY]],
            columns: [
                search.createColumn({ name: columnvalue.id }),
                search.createColumn({ name: columnvalue.name }),
            ],
        });
        vendorSearchObj.run().each(function (result) {
            Field.addSelectOption({
                value: result.getValue(columnvalue.id),
                text: result.getValue(columnvalue.name),
            });

            return true;
        });
    }

    function renderErrorScreen(errorCode, errorMessage) {
        var errorScreen = serverWidget.createForm({
            title: 'Error Screen'
        });

        errorScreen.addField({
            id: 'custpage_error_message',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Error Message'
        }).defaultValue = `<div style="color: red; font-size: 14pt;">
          <b>Error Message:</b><br>
          ${errorCode}: ${errorMessage}<br><br>
          Please correct the error and try again.
      </div>`;

        return errorScreen;
    }
    function setNullforDropDown(obj) {
        obj.addSelectOption({
            value: "",
            text: "",
        });
    }

    // Function to generate PDF (example function)
    function generatePDF(recordId) {
        var transactionFile = render.transaction({
            entityId: recordId,
            printMode: render.PrintMode.PDF,
        });

        return transactionFile;
    }

    function onRequest(context) {
        if (context.request.method === "GET") {
            var poId = context.request.parameters.purchaseid || 273447;
            log.debug("po id is: "+poId);
            if (!poId) {
                context.response.writePage(renderErrorScreen('No_Record_found', "Unable to load the record. Contact to Administrator"));
            } else {
                const DEFAULTSUBSIDIARY = 5;

                const poRecord = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: true
                })

                // Create form
                var form = serverWidget.createForm({
                    title: "Purchase order",
                    hideNavBar: true,
                });

                form.clientScriptModulePath =
                    "SuiteScripts/SK_CS_handle_Po_authentication.js";

                // Add Group to form.
                form.addFieldGroup({
                    id: "custpage_primary_info",
                    label: "Primary Information",
                });

                // Add fields to the form

                let poIdField = form.addField({
                    id: "poid",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.INTEGER,
                    label: "poid",
                });

                poIdField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });
                poIdField.defaultValue = poId;

                let employeeField = form.addField({
                    id: "employee",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.SELECT,
                    source: "employee",
                    label: "Employee",
                });

                employeeField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                let employee = poRecord.getValue({
                    fieldId: 'employee'
                })

                if (employee)
                    employeeField.defaultValue = employee;

                let poNumber = form.addField({
                    id: "ponumber",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.TEXT,
                    source: "transaction",
                    label: "PO Number",
                });

                poNumber.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                let tranid = poRecord.getValue({
                    fieldId: 'tranid'
                })

                if (tranid)
                    poNumber.defaultValue = tranid;

                let vendorField = form.addField({
                    id: "vendor",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.SELECT,
                    // source: "vendor",
                    label: "Vendor",
                });

                vendorField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL,
                });
                vendorField.isMandatory = true;

                addDropeDownList("vendor", DEFAULTSUBSIDIARY, { id: "internalid", name: "entityid" }, vendorField);

                let entity = poRecord.getValue({
                    fieldId: 'entity'
                })

                if (entity)
                    vendorField.defaultValue = entity;

                let dateField = form.addField({
                    id: "date",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.DATE,
                    label: "Date",
                });

                dateField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                let trandate = poRecord.getValue({
                    fieldId: 'trandate'
                })

                if (trandate)
                    dateField.defaultValue = trandate;

                let dueDateField = form.addField({
                    id: "duedate",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.DATE,
                    label: "Due Date",
                });

                dueDateField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL,
                });

                let duedate = poRecord.getValue({
                    fieldId: 'duedate'
                })

                if (duedate) {
                    dueDateField.defaultValue = duedate;
                }

                let subsidiaryField = form.addField({
                    id: "subsidiary",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.SELECT,
                    source: "subsidiary",
                    label: "Subsidiary",
                });

                subsidiaryField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                subsidiaryField.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                let subsidiary = poRecord.getValue({
                    fieldId: 'subsidiary'
                })

                if (subsidiary) {
                    subsidiaryField.defaultValue = subsidiary || DEFAULTSUBSIDIARY;
                }

                let departmentField = form.addField({
                    id: "department",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.SELECT,
                    label: "Department",
                });

                addDropeDownList("department", DEFAULTSUBSIDIARY, { id: "internalid", name: "name" }, departmentField);

                let department = poRecord.getValue({
                    fieldId: 'department'
                })

                if (department) {
                    departmentField.defaultValue = department;
                }

                let locationField = form.addField({
                    id: "location",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.SELECT,
                    label: "Location",
                });
                addDropeDownList("location", DEFAULTSUBSIDIARY, { id: "internalid", name: "name" }, locationField);

                let location = poRecord.getValue({
                    fieldId: 'location'
                })

                if (location) {
                    locationField.defaultValue = location;
                }

                let memoField = form.addField({
                    id: "memo",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.TEXT,
                    label: "Memo",
                });

                let memo = poRecord.getValue({
                    fieldId: 'memo'
                })

                if (memo) {
                    memoField.defaultValue = memo;
                }

                let totalAmount = form.addField({
                    id: "amount",
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.CURRENCY,
                    label: "Amount",
                });

                totalAmount.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN,
                });

                let amount = poRecord.getValue({
                    fieldId: "total"
                });

                if (amount) {
                    totalAmount.defaultValue = amount;
                }

                let summaryField = form.addField({
                    id: 'totalamount',
                    container: "custpage_primary_info",
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'amount ui'
                });

                summaryField.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                let subTotal = poRecord.getValue({
                    fieldId: "subtotal"
                });

                let textTotal = poRecord.getValue({
                    fieldId: "taxtotal"
                });



                summaryField.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });

                summaryField.defaultValue = summaryUi(subTotal, textTotal || 0, amount);

                /*****************************add item subtab and sublist with list column: START*********************/

                form.addTab({
                    id: "itemtab",
                    label: "Items",
                });

                var item_sublist = form.addSublist({
                    id: "custpage_item_list",
                    type: serverWidget.SublistType.INLINEEDITOR,
                    label: "Items",
                    tab: "itemtab",
                });

                var item_fld = item_sublist.addField({
                    id: "custpage_item_id",
                    type: serverWidget.FieldType.SELECT,
                    label: "Item",
                    // source: "item",
                });

                item_fld.isMandatory = true;
                addDropeDownList("item", DEFAULTSUBSIDIARY, { id: "internalid", name: "itemid" }, item_fld);

                var descr_fld = item_sublist.addField({
                    id: "custpage_line_descrption",
                    type: serverWidget.FieldType.TEXTAREA,
                    label: "Description",
                });

                var qty_fld = item_sublist.addField({
                    id: "custpage_qty",
                    type: serverWidget.FieldType.INTEGER,
                    label: "Quantity"
                });

                qty_fld.isMandatory = true;

                // qty_fld.defaultValue = 2;

                var rate_fld = item_sublist.addField({
                    id: "custpage_unit_rate",
                    type: serverWidget.FieldType.CURRENCY,
                    label: "Rate",
                });

                rate_fld.isMandatory = true;

                let taxNatureField = item_sublist.addField({
                    id: "custpage_unit_ind_tax_nature",
                    type: serverWidget.FieldType.SELECT,
                    label: "Indian Tax Nature",
                    source: "customlist_in_nature_of_item",
                });

                item_sublist
                    .addField({
                        id: "custpage_amount",
                        type: serverWidget.FieldType.CURRENCY,
                        label: "Amount",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });


                /****************Item sublist fields Added Code: End *********** */

                // add Billing tab.
                form.addTab({
                    id: "billtab",
                    label: "Billing",
                });

                let termsField = form.addField({
                    id: "terms",
                    label: "Terms",
                    type: serverWidget.FieldType.SELECT,
                    // source: "terms",
                    container: "billtab",
                });

                setNullforDropDown(termsField);

                let term = poRecord.getText({
                    fieldId: 'terms'
                });

                if (term) {
                    termsField.defaultValue = term;
                }

                // Add submit button
                form.addSubmitButton({
                    label: "Save",
                });

                form.addButton({
                    id: 'custpage_cancel',
                    label: "Cancel",
                    functionName: 'openDashboard()'
                })

                try {
                    const termQuery = "select id, name from term";
                    var termsData = query.runSuiteQL({ query: termQuery }).asMappedResults();

                    if (termsData.length > 0) {
                        termsData.forEach((termObj) => {
                            termsField.addSelectOption({
                                value: termObj.id,
                                text: termObj.name,
                            });
                        });
                    }

                    const totalLines = poRecord.getLineCount({
                        sublistId: 'item'
                    })

                    for (let index = 0; index < totalLines; index++) {
                        const itemId = 'item'
                        let itemValue = poRecord.getSublistValue({
                            sublistId: itemId,
                            fieldId: "item",
                            line: index
                        });

                        log.debug("item value is: ", itemValue);

                        if (itemValue)
                            item_sublist.setSublistValue({
                                id: "custpage_item_id", line: index, value: itemValue,
                            });

                        let description = poRecord.getSublistValue({
                            sublistId: itemId,
                            fieldId: "description",
                            line: index
                        });

                        log.debug("description: ", description)

                        if (description)
                            item_sublist.setSublistValue({
                                id: "custpage_line_descrption", line: index, value: description,
                            });

                        let quantity = poRecord.getSublistValue({
                            sublistId: itemId,
                            fieldId: "quantity",
                            line: index
                        });

                        log.debug("quantity: ", quantity);

                        // if (quantity > 0){
                        item_sublist.setSublistValue({ id: "custpage_qty", line: index, value: parseInt(quantity) });
                        // }

                        let rate = poRecord.getSublistValue({
                            sublistId: itemId,
                            fieldId: "rate",
                            line: index
                        });

                        // if (rate)
                        item_sublist.setSublistValue({
                            id: "custpage_unit_rate", line: index, value: rate,
                        });

                        let taxNature = poRecord.getSublistValue({
                            sublistId: itemId,
                            fieldId: "custcol_in_nature_of_item",
                            line: index
                        });

                        // if (taxNature)
                        item_sublist.setSublistValue({
                            id: "custpage_unit_ind_tax_nature", line: index, value: taxNature,
                        });

                        let lineAmount = poRecord.getSublistValue({
                            sublistId: itemId,
                            fieldId: "amount",
                            line: index
                        });

                        // if (lineAmount)
                        item_sublist.setSublistValue({
                            id: "custpage_amount", line: index, value: lineAmount,
                        });

                    }


                } catch (error) {
                    log.error("Error during Form Load", error);
                }
                // Send response with the form
                context.response.writePage(form);
            }
        } else if (context.request.method === "POST") {
            // Process form submission
            let vendor = context.request.parameters.vendor;
            let purchaseId = context.request.parameters.poid;
            let employee = context.request.parameters.employee;
            let subsidiary = context.request.parameters.subsidiary;
            let department = context.request.parameters.department;
            let location = context.request.parameters.location;
            let date = context.request.parameters.date;
            let duedate = context.request.parameters.duedate;
            // let category = context.request.parameters.category;
            let memo = context.request.parameters.memo;
            let amount = context.request.parameters.amount;
            let terms = context.request.parameters.terms;

            var totalLines = context.request.getLineCount({
                group: "custpage_item_list",
            });

            const itemsList = [];

            for (let index = 0; index < totalLines; index++) {
                let item = context.request.getSublistValue({
                    group: "custpage_item_list",
                    name: "custpage_item_id",
                    line: index,
                });
                let description = context.request.getSublistValue({
                    group: "custpage_item_list",
                    name: "custpage_line_descrption",
                    line: index,
                });
                let qty = context.request.getSublistValue({
                    group: "custpage_item_list",
                    name: "custpage_qty",
                    line: index,
                });
                let rate = context.request.getSublistValue({
                    group: "custpage_item_list",
                    name: "custpage_unit_rate",
                    line: index,
                });
                let texNature = context.request.getSublistValue({
                    group: "custpage_item_list",
                    name: "custpage_unit_ind_tax_nature",
                    line: index,
                });
                let itemAmount = context.request.getSublistValue({
                    group: "custpage_item_list",
                    name: "custpage_amount",
                    line: index,
                });

                itemsList.push({
                    itemid: item > 0 ? item : 0,
                    description: description ? description : "",
                    quantity: qty > 0 ? qty : 0,
                    rate: rate > 0 ? rate : 0,
                    texnature: texNature > 0 ? texNature : "",
                    amount: itemAmount > 0 ? itemAmount : 0,
                });
            }

            try {

                // Creating PO new record.
                var newRecord = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: purchaseId,
                    isDynamic: true
                });

                log.debug("vendor", vendor);

                newRecord.setValue({
                    fieldId: "customform",
                    value: DEFAULTFORM
                });

                if (vendor) {
                    newRecord.setValue({
                        fieldId: "entity",
                        value: 23120,
                    });
                }

                // if (subsidiary > 0) {
                //     newRecord.setValue({
                //         fieldId: "subsidiary",
                //         value: subsidiary,
                //     });
                // }

                // if (employee > 0) {
                //     newRecord.setValue({
                //         fieldId: "employee",
                //         value: employee,
                //     });
                // }

                log.debug("department: ",department);
                if (department > 0) {
                    newRecord.setValue({
                        fieldId: "department",
                        value: department,
                    });
                }

                if (location > 0) {
                    newRecord.setValue({
                        fieldId: "location",
                        value: location,
                    });
                }

                if (date) {
                    newRecord.setValue({
                        fieldId: "trandate",
                        value: new Date(date),
                    });
                }

                if (duedate > 0) {
                    newRecord.setValue({
                        fieldId: "duedate",
                        value: duedate
                    });
                }

                newRecord.setValue({
                    fieldId: "memo",
                    value: (memo = "" ? "" : memo)
                });

                if (terms > 0) {
                    newRecord.setValue({
                        fieldId: "terms",
                        value: terms,
                    });
                }

                let oldPOTotalLines = newRecord.getLineCount({
                    sublistId: 'item'
                });

                log.debug("oldPOTotalLines before remove function", oldPOTotalLines);

                for (let oldPOLineIndex = oldPOTotalLines - 1; oldPOLineIndex >= 0; oldPOLineIndex--) {
                    log.debug("oldPOLineIndex", oldPOLineIndex);
                    newRecord.removeLine({
                        sublistId: 'item',
                        line: oldPOLineIndex,
                        // ignoreRecalc: true
                    })

                }

                log.debug("oldPOTotalLines after remove function", oldPOTotalLines);

                itemsList.forEach((obj) => {
                    log.debug("object for line:", obj);
                    newRecord.selectNewLine({ sublistId: "item" });

                    newRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item",
                        value: obj.itemid,
                    });

                    newRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "description",
                        value: obj.description,
                    });

                    newRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                        value: obj.quantity,
                    });

                    newRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "rate",
                        value: obj.rate,
                    });

                    newRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_in_nature_of_item",
                        value: obj.texnature,
                    });

                    newRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "amount",
                        value: obj.amount,
                    });

                    newRecord.commitLine({ sublistId: "item" });
                });

                var recordId = newRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                    // disabletriggers: true
                });

                log.debug("recordId: " + recordId)

                if (recordId > 0) {
                    let authorId = runtime.getCurrentScript().getParameter({ name: 'custscript_email_author_id' })
                    const poRecord = record.load({
                        type: record.Type.PURCHASE_ORDER,
                        id: recordId,
                    });

                    let employee = poRecord.getValue({
                        fieldId: "employee",
                    });

                    let documentNumber = poRecord.getValue({
                        fieldId: "tranid",
                    });

                    let subsidiary = poRecord.getValue({
                        fieldId: "subsidiary",
                    });

                    let amount = poRecord.getValue({
                        fieldId: "total",
                    });

                    let poMemo = poRecord.getValue({
                        fieldId: "memo",
                    });

                    let emailSubject = "Purchase order Created - " + documentNumber;
                    let emailBody =
                        " Hello, </br> The Below transaction Updated successfully. </br> Document Number: " +
                        documentNumber +
                        "</br> Subsidiary: " +
                        subsidiary +
                        "</br> Memo: " +
                        poMemo +
                        " </br> Amount: " +
                        amount +
                        "</br> </br> Regards";

                    email.send({
                        author: authorId,
                        body: emailBody,
                        recipients: employee,
                        subject: emailSubject,
                        attachments: [generatePDF(recordId)],
                        // relatedRecords: poRecord,
                    });

                    redirect.toSuitelet({
                        scriptId: "customscript_asd_po_dashboard",
                        deploymentId: "customdeploy_asd_po_dashboard",
                        isExternal: true,
                        parameters: { employeeId: employee },
                    });

                }
            } catch (error) {
                log.error("error", error);
                context.response.writePage(renderErrorScreen(error.name, error.message));
            }
        }
    }

    return {
        onRequest: onRequest,
    };
});
