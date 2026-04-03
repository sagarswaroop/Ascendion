/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@author Sagar Kumar
 *@description shows the po page to enter the details for purchase order creation.
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
              <span>${textTotal}.00</span>
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
        if (context.request.method === "GET") {
            var purchaseId = context.request.parameters.purchaseid;

            const poRecord = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: purchaseId
            })

            var form = serverWidget.createForm({
                title: "Purchase order",
                hideNavBar: true,
            });

            // Add Group to form.
            form.addFieldGroup({
                id: "custpage_primary_info",
                label: "Primary Information",
            });

            // Add fields to the form

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

            let employee = poRecord.getText({
                fieldId: 'employee'
            })

            if(employee)
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

            if(tranid)
            poNumber.defaultValue = tranid;

            let vendorField = form.addField({
                id: "vendor",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                // source: "vendor",
                label: "Vendor",
            });

            vendorField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let entity = poRecord.getText({
                fieldId: 'entity'
            })

            vendorField.defaultValue = entity ? entity : "";


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
                displayType: serverWidget.FieldDisplayType.INLINE,
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

            let subsidiary = poRecord.getText({
                fieldId: 'subsidiary'
            })

            if (subsidiary) {
                subsidiaryField.defaultValue = subsidiary;
            }

            let departmentField = form.addField({
                id: "department",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                label: "Department",
            });

            departmentField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let department = poRecord.getText({
                fieldId: 'department'
            })

            if (department) {
                departmentField.defaultValue = department;
            }

            let locationField = form.addField({
                id: "location",
                container: "custpage_primary_info",
                type: serverWidget.FieldType.TEXT,
                label: "Location",
            });

            locationField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let location = poRecord.getText({
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

            memoField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let memo = poRecord.getValue({
                fieldId: 'memo'
            })

            if (memo) {
                memoField.defaultValue = memo;
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

            let totalAmount = poRecord.getValue({
                fieldId: "total"
            });


            summaryField.defaultValue = summaryUi(subTotal, textTotal || 0, totalAmount);

            /*****************************add item subtab and sublist with list column: START*********************/

            form.addTab({
                id: "itemtab",
                label: "Items",
            });

            //   form.addSubtab({
            //     id: "custpage_items",
            //     label: "Item",
            //   });

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

            item_sublist.addField({
                id: "custpage_unit_ind_tax_nature",
                type: serverWidget.FieldType.TEXT,
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

            // add Billing tab.
            form.addTab({
                id: "billtab",
                label: "Billing",
            });

            let termsField = form.addField({
                id: "terms",
                label: "Terms",
                type: serverWidget.FieldType.TEXT,
                // source: "terms",
                container: "billtab",
            });

            termsField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let term = poRecord.getText({
                fieldId: 'terms'
            })

            if (term) {
                termsField.defaultValue = term;
            }

            // Add submit button
            form.addSubmitButton({
                label: "Cancel",
            });

            const totalLines = poRecord.getLineCount({
                sublistId: 'item'
            })

            for (let index = 0; index < totalLines; index++) {
                const itemId = 'item'
                let itemValue = poRecord.getSublistText({
                    sublistId: itemId,
                    fieldId: "item",
                    line: index
                });

                if (itemValue)
                    item_sublist.setSublistValue({
                        id: "custpage_item_id", line: index, value: itemValue,
                    });

                let description = poRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "description",
                    line: index
                });

                if (description)
                    item_sublist.setSublistValue({
                        id: "custpage_line_descrption", line: index, value: description,
                    });

                let quantity = poRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "quantity",
                    line: index
                });

                if (quantity)
                    item_sublist.setSublistValue({
                        id: "custpage_qty", line: index, value: quantity,
                    });

                let rate = poRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "rate",
                    line: index
                });

                if (rate)
                    item_sublist.setSublistValue({
                        id: "custpage_unit_rate", line: index, value: rate,
                    });

                let taxNature = poRecord.getSublistText({
                    sublistId: itemId,
                    fieldId: "custcol_in_nature_of_item",
                    line: index
                });

                if (taxNature)
                    item_sublist.setSublistValue({
                        id: "custpage_unit_ind_tax_nature", line: index, value: taxNature,
                    });

                let lineAmount = poRecord.getSublistValue({
                    sublistId: itemId,
                    fieldId: "amount",
                    line: index
                });

                if (lineAmount)
                    item_sublist.setSublistValue({
                        id: "custpage_amount", line: index, value: lineAmount,
                    });

            }

            // Send response with the form
            context.response.writePage(form);
        } else if (context.request.method === "POST") {

              redirect.toSuitelet({
                scriptId: 'customscript_asd_po_dashboard',
                deploymentId: 'customdeploy_asd_po_dashboard',
                isExternal: true,
              })

        }

    }

    return {
        onRequest: onRequest,
    };
});
