/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@author Sagar Kumar
 *@description shows the po page to enter the details for purchase order creation.
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
  "N/ui/message"
], function (
  serverWidget,
  record,
  search,
  query,
  email,
  file,
  runtime,
  render,
  message
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
            <span>SUBTOTAL</span>
            <span id='cust_ui_amt'>00.0</span>
        </div>
        <div class="summary-item">
            <span>TAX TOTAL</span>
            <span>To be Generate</span>
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

  const DEFAULTFORM = 183;
  function onRequest(context) {
    if (context.request.method === "GET") {
      var employeeId = context.request.parameters.employeeId || 278051;
      const DEFAULTSUBSIDIARY = 5;
      // Create form
      var form = serverWidget.createForm({
        title: "Ascendion PO Portal",
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

      employeeField.defaultValue = employeeId;

      let poNumber = form.addField({
        id: "ponumber",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.TEXT,
        source: "transaction",
        label: "PO Number",
      });

      poNumber.defaultValue = "To Be Genrated";

      poNumber.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

      let vendorField = form.addField({
        id: "vendor",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.SELECT,
        // source: "vendor",
        label: "Vendor",
      });

      vendorField.isMandatory = true;
      addDropeDownList("vendor", DEFAULTSUBSIDIARY, { id: "internalid", name: "entityid" }, vendorField);

      let date = form.addField({
        id: "date",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.DATE,
        label: "Date",
      });

      date.defaultValue = new Date();

      form.addField({
        id: "duedate",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.DATE,
        label: "Due Date",
      });

      let subsidiaryField = form.addField({
        id: "subsidiary",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.SELECT,
        source: "subsidiary",
        label: "Subsidiary",
      });

      subsidiaryField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

      subsidiaryField.updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTCOL
      });

      subsidiaryField.defaultValue = DEFAULTSUBSIDIARY;

      let departmentField = form.addField({
        id: "department",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.SELECT,
        // source: "department",
        label: "Department",
      });
      addDropeDownList("department", DEFAULTSUBSIDIARY, { id: "internalid", name: "name" }, departmentField);

      let locationField = form.addField({
        id: "location",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.SELECT,
        // source: "location",
        label: "Location",
      });

      addDropeDownList("location", DEFAULTSUBSIDIARY, { id: "internalid", name: "name" }, locationField);

      form.addField({
        id: "memo",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.TEXT,
        label: "Memo",
      });

      let totalAmount = form.addField({
        id: "amount",
        container: "custpage_primary_info",
        type: serverWidget.FieldType.CURRENCY,
        label: "Amount",
      });

      totalAmount.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

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

      var indTaxNature = item_sublist.addField({
        id: "custpage_unit_ind_tax_nature",
        type: serverWidget.FieldType.SELECT,
        label: "Indian Tax Nature",
        source: "customlist_in_nature_of_item",
      });

      var amount_fld = item_sublist
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

      //   form.addSubtab({
      //     id: "custpage_bill",
      //     label: "billing",
      //   });

      let termsField = form.addField({
        id: "terms",
        label: "Terms",
        type: serverWidget.FieldType.SELECT,
        // source: "terms",
        container: "billtab",
      });
      setNullforDropDown(termsField);

      // Add submit button
      form.addSubmitButton({
        label: "Submit",
      });

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
      } catch (error) {
        context.response.writePage(renderErrorScreen(error.name, error.message));
      }

      // Send response with the form
      context.response.writePage(form);
    } else if (context.request.method === "POST") {
      // Process form submission
      let vendor = context.request.parameters.vendor;
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
        var newRecord = record.create({
          type: record.Type.PURCHASE_ORDER,
          isDynamic: true,
        });

        newRecord.setValue({
          fieldId: "customform",
          value: DEFAULTFORM
        });

        if (vendor > 0) {
          newRecord.setValue({
            fieldId: "entity",
            value: vendor,
          });
        }

        if (subsidiary > 0) {
          newRecord.setValue({
            fieldId: "subsidiary",
            value: subsidiary,
          });
        }

        if (employee > 0) {
          newRecord.setValue({
            fieldId: "employee",
            value: employee,
          });
        }

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

        log.debug("date", date);
        if (date) {
          newRecord.setValue({
            fieldId: "trandate",
            value: new Date(date),
          });
        }

        // if (category > 0) {
        //   newRecord.setValue({
        //     fieldId: "custbodyclb_vendorbillcatory",
        //     value: category,
        //   });
        // }

        newRecord.setValue({
          fieldId: "memo",
          value: (memo = "" ? "" : memo),
        });

        if (terms > 0) {
          newRecord.setValue({
            fieldId: "terms",
            value: terms,
          });
        }

        // newRecord.setValue({
        //   fieldId: "",
        //   value: duedate,
        // });

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
        });

        if (recordId > 0) {
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
            " Hello, </br> The Below transaciton created successfully. </br> Document Number: " +
            documentNumber +
            "</br> Subsidiary: " +
            subsidiary +
            "</br> Memo: " +
            poMemo +
            " </br> Amount: " +
            amount +
            "</br> </br> Regards";

          email.send({
            author: atuo,
            body: emailBody,
            recipients: employee,
            subject: emailSubject,
            attachments: [generatePDF(recordId)],
            // relatedRecords: poRecord,
          });

          const form = serverWidget.createForm({
            title: "Ascendion PO Portal",
            hideNavBar: true,
          });

          let htmlField = form.addField({
            id: "html",
            label: "html Field",
            type: serverWidget.FieldType.INLINEHTML,
          })


          htmlField.defaultValue = '<html><head><link href="https://fonts.googleapis.com/css?family=Nunito+Sans:400,400i,700,900&display=swap" rel="stylesheet"></head>\
      <style> body { \
          text-align: center;\
          padding: 40px 0;\
          background: #EBF0F5;\
        }\
          h1 {\
            color: #88B04B;\
            font-family: "Nunito Sans", "Helvetica Neue", sans-serif;\
            font-weight: 900;\
            font-size: 40px;\
            margin-bottom: 10px;\
          }\
          p {\
            color: #404F5E;\
            font-family: "Nunito Sans", "Helvetica Neue", sans-serif;\
            font-size:20px;\
            margin: 0;\
          }\
        i {\
          color: #9ABC66;\
          font-size: 100px;\
          line-height: 200px;\
          margin-left:-15px;\
        }\
        .card {\
          background: white;\
          padding: 60px;\
          border-radius: 4px;\
          box-shadow: 0 2px 3px #C8D0D8;\
          display: inline-block;\
          margin: 0 auto;\
        }\
      </style>\
      <body>\
        <div class="card">\
        <div style="border-radius:200px; height:200px; width:200px; background: #F8FAF5; margin:0 auto;">\
          <i class="checkmark">✓</i>\
        </div>\
          <h1>Success</h1> \
          <p>PO ('+ documentNumber + ') created;<br/> Notification will recieve shortly!</p>\
        </div>\
      </body>\
  </html>'

          context.response.writePage(form);
        }
      } catch (error) {
        context.response.writePage(renderErrorScreen(error.name, error.message));
      }
    }
  }

  return {
    onRequest: onRequest,
  };
});
