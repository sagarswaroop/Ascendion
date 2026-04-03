/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@author Sagar Kumar
 *@description validate the acess code entered by user.
 */
define([], function () {
  function fieldChanged(context) {
    debugger;
    const currRecord = context.currentRecord;
    var sublistFieldName = context.fieldId;

    if (sublistFieldName == "custentity_asd_emp_acess_code") {
      try {
        let accessCode = currRecord.getValue({
            fieldId: "custentity_asd_emp_acess_code",
          });
    
          log.debug({
            title: "validation check for acess code...",
            details: accessCode,
          });
    
          if (accessCode) {
            if (accessCode.length < 4 || accessCode.length > 4) {
              alert("Enter 4-digit Access Code");
    
              currRecord.setValue({
                fieldId: "custentity_asd_emp_acess_code",
                value: "",
                ignoreFieldChange: true,
              });
            }
          }
      } catch (error) {
        log.error({
            title: "error during execution of Acess code validation",
            details: error
        });

        alert(error.message);
      }
    }
  }

  return {
    // pageInit: pageInit,
    // saveRecord: saveRecord,
    // validateField: validateField,
    fieldChanged: fieldChanged,
    // postSourcing: postSourcing,
    // lineInit: lineInit,
    // validateDelete: validateDelete,
    // validateInsert: validateInsert,
    // validateLine: validateLine,
    // sublistChanged: sublistChanged
  };
});
