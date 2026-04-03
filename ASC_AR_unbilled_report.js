/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@author Sagar Kumar
 *@description This script is used to generate the un-billed time sheet report for the AR department.
 */
define([], function() {

    function onRequest(context) {
        let form = serverWidget.createForm({ title: 'AP Unbilled Report' });
        // Add date fields
        form.addField({ id: 'custpage_startdate', type: serverWidget.FieldType.DATE, label: 'Start Date' });
        form.addField({ id: 'custpage_enddate', type: serverWidget.FieldType.DATE, label: 'End Date' });
    
        // Add Submit button
        form.addSubmitButton({ label: 'Generate Report' });

        context.response.writePage(form);
    }

    return {
        onRequest: onRequest
    }
});
