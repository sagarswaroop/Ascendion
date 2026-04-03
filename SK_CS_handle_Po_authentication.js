/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@author Sagar Kumar
 *@description show alert for incorrect email id and password.
 */

let existingLines = 0;
let isFieldChange = false;
define(["N/runtime", "N/ui/dialog", "N/currentRecord", "N/url"], function (
  runtime,
  dialog,
  currentRecord,
  url
) {

  function pageInit(context) {
    debugger;
    var currentUrl = document.location.href;
    var url = new URL(currentUrl);
    var isSuccess = url.searchParams.get("success");

    if (isSuccess) {
      function showAlert() {

        dialog.alert({
          title: "Error Message",
          message: "Email or Passwor is incorrect. \n Connect to Administrator"
        });
      }
      showAlert();
    }
  }

  function fieldChanged(context) {
    const currRecord = context.currentRecord;
    var sublistFieldName = context.fieldId;
    isFieldChange = true;
  }

  function validateLine(context) {
    const currRecord = context.currentRecord;

    let quantity = currRecord.getCurrentSublistValue({
      sublistId: "custpage_item_list",
      fieldId: "custpage_qty",
    });

    let rate = currRecord.getCurrentSublistValue({
      sublistId: "custpage_item_list",
      fieldId: "custpage_unit_rate",
    });

    if (quantity > 0 && rate > 0) {
      currRecord.setCurrentSublistValue({
        sublistId: "custpage_item_list",
        fieldId: "custpage_amount",
        value: rate * quantity,
        ignoreFieldChange: true,
      });

      let lineAmount = currRecord.getCurrentSublistValue({
        sublistId: "custpage_item_list",
        fieldId: "custpage_amount",
      });

      let totalAmount = currRecord.getValue({
        fieldId: "amount"
      });

      totalAmount += lineAmount;
      document.getElementById("cust_ui_amt").innerHTML = totalAmount;
      return true;
    } else {
      alert("Enter the value for: rate, quantity");
      return false;
    }
  }

  function sublistChanged(context) {
    debugger;
    const currRecord = context.currentRecord;
    let lineAmount = 0;

    // let totalAmount = currRecord.getValue({
    //   fieldId: "amount"
    // });

    let currentLineCount = currRecord.getLineCount({
      sublistId: "custpage_item_list"
    });

    for (let index = 0; index < currentLineCount; index++) {
      lineAmount+= currRecord.getSublistValue({
        sublistId: "custpage_item_list",
        fieldId: "custpage_amount",
        line: index
      });

    }

    // if (currentLineCount > existingLines) {
    //   totalAmount += lineAmount;
    // }else{
    //   totalAmount = totalAmount - lineAmount;
    // }


    // totalAmount += lineAmount
    currRecord.setValue({
      fieldId: "amount",
      value: lineAmount,
      ignoreFieldChange: true
    });

    document.getElementById("cust_ui_amt").innerHTML = lineAmount;
  }

  function validateDelete(context) {
    debugger;
    const currRecord = context.currentRecord;
    let lineAmount = currRecord.getCurrentSublistValue({
      sublistId: "custpage_item_list",
      fieldId: "custpage_amount",
    });

    let totalAmount = currRecord.getValue({
      fieldId: "amount"
    });

    totalAmount -= lineAmount;

    currRecord.setValue({
      fieldId: "amount",
      value: totalAmount,
      ignoreFieldChange: true
    });

    document.getElementById("cust_ui_amt").innerHTML = totalAmount;
    return true;
  }

  function lineInit(context) {
    console.log("pageinit called");
    existingLines = context.currentRecord.getLineCount({
      sublistId: 'custpage_item_list'
    })
  }

  function saveRecord(context) {
    const currRecord = context.currentRecord;

    const poNumber = currRecord.getValue({
      fieldId: 'ponumber'
    });

    log.debug("po number is: " + poNumber + " field changed: " + fieldChanged)
    if (poNumber && !isFieldChange) {
      alert("Record has not been changed. \n You can't submit the Record")
      return false;
    } else {
      return true;
    }
  }

  function openDashboard() {

    // document.location = url.resolveScript({
    //   deploymentId: "customdeploy_asd_po_dashboard",
    //   scriptId: "customscript_asd_po_dashboard",
    //   // returnExternalUrl: true
    // });

    history.back();
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    validateLine: validateLine,
    sublistChanged: sublistChanged,
    openDashboard: openDashboard,
    // validateDelete: validateDelete,
    lineInit: lineInit,
    saveRecord: saveRecord,
    // validateInsert:validateInsert
  };
});
