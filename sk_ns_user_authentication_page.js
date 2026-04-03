/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@author Sagar Kumar
 *@description use to authenticate the user with netsuite Employee that can crate transaction with *acess code without acess to NetSuite directly.
 */

define([
  "N/ui/serverWidget",
  "N/record",
  "N/search",
  "N/url",
  "N/redirect",
], function (serverWidget, record, search, url, redirect) {
  function returnLoginPage() {
    log.debug("return to login page...");
    redirect.toSuitelet({
      scriptId: "customscript_asd_po_authenticate_page",
      deploymentId: "customdeploy_asd_po_authenticate_page",
      isExternal: true,
      parameters: { success: false },
    });
  }
  function onRequest(context) {
    if (context.request.method === "GET") {
      // Create form
      var form = serverWidget.createForm({
        title: "Ascendion Procurement Login",
        hideNavBar: true,
      });

      form.clientScriptModulePath = "SuiteScripts/SK_CS_handle_Po_authentication.js";

      // Add fields to the form
      form.addField({
        id: "email",
        type: serverWidget.FieldType.EMAIL,
        label: "Email",
      });

      form.addField({
        id: "password",
        type: serverWidget.FieldType.PASSWORD,
        label: "Password",
      });

      // Add submit button
      form.addSubmitButton({
        label: "Login",
      });

      context.response.writePage(form);
    } else if (context.request.method === "POST") {
      // Process form submission
      var email = context.request.parameters.email;
      var password = context.request.parameters.password;
      // var employeeId = context.request.parameters.employee;

      try {
        if (email && password) {
          var employeeSearchObj = search.create({
            type: "employee",
            filters: [
              ["email", "is", email],
              "AND",
              ["custentity_asd_emp_acess_code", "isnotempty", ""],
            ],
            columns: [
              search.createColumn({ name: "internalid", label: "Internal ID" }),
              search.createColumn({ name: "entityid", label: "Name" }),
              search.createColumn({
                name: "custentity_asd_emp_acess_code",
                label: "Access Code",
              }),
            ],
          });
          var searchResultCount = employeeSearchObj.runPaged().count;
          log.debug("employeeSearchObj result count", searchResultCount);
  
          if (searchResultCount > 0) {
            employeeSearchObj.run().each(function (result) {
              // .run().each has a limit of 4,000 results
  
              let accessCode = result.getValue("custentity_asd_emp_acess_code");
              let empId = result.getValue("internalid");
  
              log.debug("accessCode: " + accessCode + " password:" + password);
  
              if (accessCode == password) {
                log.debug("login successfully");
                redirect.toSuitelet({
                  scriptId: "customscript_asd_po_dashboard",
                  deploymentId: "customdeploy_asd_po_dashboard",
                  // isExternal: true,
                  parameters: { employeeId: empId },
                });
              } else {
                returnLoginPage();
              }
              return true;
            });
          } else {
            returnLoginPage();
          }
        }
      } catch (error) {
        log.error({
          title: "Error during PO portal authentication",
          details: error
        })
        returnLoginPage();
      }
    }
  }

  return {
    onRequest: onRequest,
  };
});
