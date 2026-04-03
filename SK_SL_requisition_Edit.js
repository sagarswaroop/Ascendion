/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
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
    redirect
) {
    const summaryUi = `<!DOCTYPE html>
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
                    <span>ESTIMATED TOTAL</span>
                    <span id='cust_ui_amt'>00.0</span>
                </div>
                <div class="summary-item summary-total">
                    <span>TOTAL</span>
                    <span>To be Generate</span>
                </div>
            </div>
        </body>
        </html>`

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

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var requisitionId = context.request.parameters.requisitionid || 278051;
            const DEFAULTSUBSIDIARY = 5;

            var form = serverWidget.createForm({
                title: 'Requisition Form',
                hideNavBar: true,
            });

            form.addButton({
                id: 'custpage_cancel',
                label: "Cancel",
                functionName: 'openDashboard()'
            });

            form.addFieldGroup({
                id: "custpage_primary_info",
                label: "Primary Information",
            });

            const requisitionRecord = record.load({
                type: record.Type.PURCHASE_REQUISITION,
                id: requisitionId,
                isDynamic: false
            });

            let poNumber = form.addField({
                id: "custpage_tranid",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                source: "transaction",
                label: "REQUISITION #",
            });

            poNumber.defaultValue = "To Be Genrated";

            poNumber.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });

            let employeeField = form.addField({
                id: "employee",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.SELECT,
                source: "employee",
                label: "Employee",
            });

            employeeField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });

            let entity = requisitionRecord.getValue({
                fieldId: 'entity'
            });

            if (entity)
                employeeField.defaultValue = entity;

            let date = form.addField({
                id: "date",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.DATE,
                label: "Date",
            });

            let trandate = requisitionRecord.getValue({
                fieldId: 'trandate'
            });

            if (trandate)
                currentdate.defaultValue = trandate;

            let dueDateField = form.addField({
                id: "duedate",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.DATE,
                label: "Received By",
            });

            dueDateField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let duedate = requisitionRecord.getValue({
                fieldId: 'duedate'
            });

            if (duedate)
                duedateField.defaultValue = duedate;

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

            subsidiaryField.defaultValue = DEFAULTSUBSIDIARY;


            let departmentField = form.addField({
                id: "custpage_department",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.SELECT,
                // source: "department",
                label: "Department",
            });

            addDropeDownList("department", DEFAULTSUBSIDIARY, { id: "internalid", name: "name" }, departmentField);

            let department = requisitionRecord.getValue({
                fieldId: 'department'
            });

            if (department)
                departmentField.defaultValue = department;

            let locationField = form.addField({
                id: "location",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.SELECT,
                // source: "location",
                label: "Location",
            });

            addDropeDownList("location", DEFAULTSUBSIDIARY, { id: "internalid", name: "name" }, locationField);

            let location = requisitionRecord.getValue({
                fieldId: 'location'
            });

            if (location)
                locationField.defaultValue = location;

            let summaryField = form.addField({
                id: 'totalamount',
                container: "custpage_primary_info",
                type: serverWidget.FieldType.INLINEHTML,
                label: 'amount ui'
            });

            summaryField.updateBreakType({
                breakType: serverWidget.FieldBreakType.STARTCOL
            });

            summaryField.defaultValue = summaryUi;

            /*****************************add item sub-tab and sub-list with list column: START*********************/

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
                label: "Quantity",
            });

            qty_fld.isMandatory = true;

            var rate_fld = item_sublist.addField({
                id: "custpage_unit_rate",
                type: serverWidget.FieldType.CURRENCY,
                label: "Rate",
            });
            rate_fld.isMandatory = true;

            var amount_fld = item_sublist
                .addField({
                    id: "custpage_amount",
                    type: serverWidget.FieldType.CURRENCY,
                    label: "Amount",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });


            // Adding the data to the item sublist.

            let totalItems = requisitionRecord.getLineCount({
                sublistId: 'item'
            });

            for (let index = 0; index < totalItems; index++) {
                const itemId = 'item'
                let itemValue = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "item",
                    line: index
                });

                log.debug("item value is: ", itemValue);

                if (itemValue)
                    item_sublist.setSublistValue({
                        id: "custpage_item_id", line: index, value: itemValue,
                    });

                let description = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "description",
                    line: index
                });

                log.debug("description: ", description)

                if (description)
                    item_sublist.setSublistValue({
                        id: "custpage_line_descrption", line: index, value: description,
                    });

                let quantity = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "quantity",
                    line: index
                });

                log.debug("quantity: ", quantity);

                // if (quantity > 0){
                item_sublist.setSublistValue({ id: "custpage_qty", line: index, value: parseInt(quantity) });
                // }

                let rate = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "rate",
                    line: index
                });

                // if (rate)
                item_sublist.setSublistValue({
                    id: "custpage_unit_rate", line: index, value: rate,
                });

                let taxNature = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "custcol_in_nature_of_item",
                    line: index
                });

                // if (taxNature)
                item_sublist.setSublistValue({
                    id: "custpage_unit_ind_tax_nature", line: index, value: taxNature,
                });

                let lineAmount = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "amount",
                    line: index
                });

                // if (lineAmount)
                item_sublist.setSublistValue({
                    id: "custpage_amount", line: index, value: lineAmount,
                });

            }

            form.clientScriptModulePath =
                "SuiteScripts/SK_CS_handle_Po_authentication.js";

            form.addSubmitButton({
                label: 'Submit'
            });

            context.response.writePage(form);
        } else {
            // Process form submission
            // let vendor = context.request.parameters.vendor;
            let employee = context.request.parameters.employee;
            let subsidiary = context.request.parameters.subsidiary;
            let department = context.request.parameters.department;
            let location = context.request.parameters.location;
            let date = context.request.parameters.date;
            let duedate = context.request.parameters.duedate;
            // let category = context.request.parameters.category;
            let memo = context.request.parameters.memo;
            // let amount = context.request.parameters.amount;
            // let terms = context.request.parameters.terms;

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
                    amount: itemAmount > 0 ? itemAmount : 0,
                });
            }

            try {
                // Creating PO new record.
                var newRecord = record.create({
                    type: record.Type.PURCHASE_REQUISITION,
                    isDynamic: true,
                });

                // newRecord.setValue({
                //   fieldId: "customform",
                //   value: DEFAULTFORM
                // });

                if (employee > 0)
                    newRecord.setValue({
                        fieldId: "entity",
                        value: employee,
                    });

                log.debug("subsidiary: " + subsidiary);

                if (subsidiary) {
                    newRecord.setValue({
                        fieldId: "subsidiary",
                        value: subsidiary,
                    });
                }

                log.debug("department: " + department);
                if (department) {
                    newRecord.setValue({
                        fieldId: "department",
                        value: 8,
                    });
                }

                if (location > 0) {
                    newRecord.setValue({
                        fieldId: "location",
                        value: location,
                    });
                }

                log.debug("date", date);
                if (date) {
                    newRecord.setValue({
                        fieldId: "trandate",
                        value: new Date(date),
                    });
                }

                newRecord.setValue({
                    fieldId: "memo",
                    value: (memo = "" ? "" : memo),
                });

                if (duedate)
                    newRecord.setValue({
                        fieldId: "duedate",
                        value: new Date(duedate),
                    });

                itemsList.forEach((obj) => {
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
                        fieldId: "amount",
                        value: obj.amount,
                    });

                    newRecord.commitLine({ sublistId: "item" });
                });

                var recordId = newRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                });

                log.debug("created record id:", recordId);

                // var recordId = 272728;
                // if (recordId > 0) {
                //     const poRecord = record.load({
                //         type: record.Type.PURCHASE_ORDER,
                //         id: recordId,
                //     });

                //     // let employee = poRecord.getValue({
                //     //   fieldId: "employee",
                //     // });

                //     let documentNumber = poRecord.getValue({
                //         fieldId: "tranid",
                //     });

                //     let subsidiary = poRecord.getValue({
                //         fieldId: "subsidiary",
                //     });

                //     let amount = poRecord.getValue({
                //         fieldId: "total",
                //     });

                //     let poMemo = poRecord.getValue({
                //         fieldId: "memo",
                //     });

                //     let emailSubject = "Purchase order Created - " + documentNumber;
                //     let emailBody =
                //         " Hello, </br> The Below transaciton created successfully. </br> Document Number: " +
                //         documentNumber +
                //         "</br> Subsidiary: " +
                //         subsidiary +
                //         "</br> Memo: " +
                //         poMemo +
                //         " </br> Amount: " +
                //         amount +
                //         "</br> </br> Regards";

                //     log.debug("employee: " + employee);

                //     email.send({
                //         author: 21099,
                //         body: emailBody,
                //         recipients: employee,
                //         subject: emailSubject,
                //         attachments: [generatePDF(recordId)],
                //         // relatedRecords: poRecord,
                //     });

                //     redirect.toSuitelet({
                //         scriptId: 'customscript_asd_po_dashboard',
                //         deploymentId: 'customdeploy_asd_po_dashboard',
                //         // isExternal: true,
                //     });
                // }
            } catch (error) {
                log.error("error", error);
                context.response.writePage(renderErrorScreen(error.name, error.message));
            }
        }
    }

    return {
        onRequest: onRequest
    };
});
