/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @author Sagar Kumar
 * @description To view the purchase requisition on procure module.
 */
define([
    "N/ui/serverWidget",
    "N/record",
    "N/redirect"
], function (
    serverWidget,
    record,
    redirect
) {

    function summaryUi(subTotal, totalAmount) {
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
        
                <div class="summary-item summary-total">
                    <span>TOTAL</span>
                    <span>${totalAmount}.00</span>
                </div>
            </div>
        </body>
        </html>`
    }

    function onRequest(context) {
        if (context.request.method === 'GET') {
            const requisition = context.request.parameters.requisitionid;

            const requisitionRecord = record.load({
                type: record.Type.PURCHASE_REQUISITION,
                id: requisition
            });
            // log.debug('Error', requisitionRecord);

            var form = serverWidget.createForm({
                title: "Purchase order Requisition",
                hideNavBar: true,
            });

            form.addSubmitButton({
                label: "Cancel"
            })

            form.addFieldGroup({
                id: "custpage_primary_info",
                label: "Primary Information",
            });

            let requisitionId = form.addField({
                id: "custpage_requisitionid", // Fixed: Prefixed with "custpage"
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                label: "Requisition #",
            });

            requisitionId.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let tranid = requisitionRecord.getValue({
                fieldId: 'tranid'
            });

            if (tranid)
                requisitionId.defaultValue = tranid;

            let currentdate = form.addField({
                id: "custpage_currentdate", // Fixed: Prefixed with "custpage"
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                //source: "transaction",
                label: "Date",
            });

            currentdate.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let trandate = requisitionRecord.getValue({
                fieldId: 'trandate'
            });

            if (trandate)
                currentdate.defaultValue = trandate;

            let employeeField = form.addField({
                id: "custpage_employee",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.SELECT,
                source: "employee",
                label: "Requestor",
            });

            employeeField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let entity = requisitionRecord.getValue({
                fieldId: 'entity'
            });

            log.debug("employee is; "+entity);

            if (entity)
                employeeField.defaultValue = entity;

            let memoField = form.addField({
                id: "custpage_memo", // Fixed: Prefixed with "custpage"
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                source: "transaction",
                label: "Memo",
            });

            memoField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let memo = requisitionRecord.getValue({
                fieldId: 'memo'
            });

            if (memo)
                memoField.defaultValue = memo;

            let duedateField = form.addField({
                id: "custpage_duedate", // Fixed: Prefixed with "custpage"
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                source: "transaction",
                label: "Due Date",
            });

            duedateField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let duedate = requisitionRecord.getValue({
                fieldId: 'duedate'
            });

            if (duedate)
                duedateField.defaultValue = duedate;

            let subsidiaryField = form.addField({
                id: "custpage_subsidiary",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                source: "subsidiary",
                label: "Subsidiary",
            });

            subsidiaryField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            subsidiaryField.updateBreakType({
                breakType: serverWidget.FieldBreakType.STARTCOL
            });

            let subsidiary = requisitionRecord.getText({
                fieldId: 'subsidiary'
            })

            if (subsidiary) {
                subsidiaryField.defaultValue = subsidiary;
            }

            let LocationField = form.addField({
                id: "custpage_location",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                //source: "subsidiary",
                label: "Location",
            });

            LocationField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let location = requisitionRecord.getText({
                fieldId: 'location'
            })

            if (location) {
                LocationField.defaultValue = location;
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

            let subTotal = requisitionRecord.getValue({
                fieldId: "estimatedtotal"
            });

            let totalAmount = requisitionRecord.getValue({
                fieldId: "total"
            });


            summaryField.defaultValue = summaryUi(subTotal, totalAmount);

            /*****************************add item subtab and sublist with list column: START*********************/

            form.addTab({
                id: "itemtab",
                label: "Items",
            });

            var item_sublist = form.addSublist({
                id: "custpage_item_list",
                type: serverWidget.SublistType.LIST,
                label: "Items",
                tab: "itemtab",
            });
            item_sublist.addField({
                id: "custpage_item_id",
                type: serverWidget.FieldType.TEXT,
                label: "Item",
                // source: "item",
            });

            item_sublist.addField({
                id: "custpage_vendor",
                type: serverWidget.FieldType.TEXT,
                label: "Vendor",
            });


            item_sublist.addField({
                id: "custpage_line_descrption",
                type: serverWidget.FieldType.TEXTAREA,
                label: "Description",
            });

            item_sublist.addField({
                id: "custpage_qty",
                type: serverWidget.FieldType.TEXT,
                label: "Quantity",
            });

            item_sublist.addField({
                id: "custpage_unit_rate",
                type: serverWidget.FieldType.CURRENCY,
                label: "Rate",
            });

            // item_sublist.addField({
            //     id: "custpage_unit_ind_tax_nature",
            //     type: serverWidget.FieldType.TEXT,
            //     label: "Indian Tax Nature",
            //     source: "customlist_in_nature_of_item",
            // });

            item_sublist.addField({
                id: "custpage_amount",
                type: serverWidget.FieldType.CURRENCY,
                label: "Amount",
            })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });

            const totalLines = requisitionRecord.getLineCount({
                sublistId: 'item'
            })

            for (let index = 0; index < totalLines; index++) {
                const itemId = 'item'
                let itemValue = requisitionRecord.getSublistText({
                    sublistId: itemId,
                    fieldId: "item",
                    line: index
                });

                if (itemValue)
                    item_sublist.setSublistValue({
                        id: "custpage_item_id", line: index, value: itemValue,
                    });

                let vandor = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "vandor",
                    line: index
                });
                if (vandor)
                    item_sublist.setSublistValue({
                        id: "custpage_vendor", line: index, value: vandor,
                    });
                let description = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "description",
                    line: index
                });

                if (description)
                    item_sublist.setSublistValue({
                        id: "custpage_line_descrption", line: index, value: description,
                    });

                let quantity = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "quantity",
                    line: index
                });

                if (quantity)
                    item_sublist.setSublistValue({
                        id: "custpage_qty", line: index, value: quantity,
                    });

                let rate = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "rate",
                    line: index
                });

                if (rate)
                    item_sublist.setSublistValue({
                        id: "custpage_unit_rate", line: index, value: rate,
                    });

                let lineAmount = requisitionRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "estimatedtotal",
                    line: index
                });

                if (lineAmount)
                    item_sublist.setSublistValue({
                        id: "custpage_amount", line: index, value: lineAmount,
                    });

            }


            context.response.writePage(form);
        } else {

            const employeeId = context.request.parameters.custpage_employee;
            log.debug("employee id: "+employeeId);

            redirect.toSuitelet({
                scriptId: 'customscript_asd_po_dashboard',
                deploymentId: 'customdeploy_asd_po_dashboard',
                // isExternal: true,
                employeeid: employeeId
            })
        }
    }

    return {
        onRequest: onRequest,
    };
});
