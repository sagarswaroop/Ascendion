/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/currentRecord", "N/url"], function (currentRecord, url) {

    function pageInit(context) {
        // alert("client script added");
    }

    function createNew() {
        const currRecord = currentRecord.get();

        let empId = currRecord.getValue({
            fieldId: 'employee'
        });

        var output = url.resolveScript({
            scriptId: "customscript_asc_procure_new_requisition",
            deploymentId: "customdeploy_asc_procure_new_requisition",
            // returnExternalUrl: true,
            params: { employeeId: empId },
            // returnExternalUrl: true
        });
        document.location = "https://7315200-sb2.app.netsuite.com/"+output;
    }

    function getSuiteletPage(suiteletScriptId, suiteletDeploymentId, pageId) {
        var output = url.resolveScript({
            scriptId: suiteletScriptId,
            deploymentId: suiteletDeploymentId,
            params: {
                'page': pageId
            },
            // returnExternalUrl: true
        });

        console.log("output",output);

        document.location = "https://7315200-sb2.app.netsuite.com/"+output;
    }

    function getParameterFromURL(param) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == param) {
                return decodeURIComponent(pair[1]);
            }
        }
        return (false);
    }

    return {
        pageInit: pageInit, // after record load
        createNew: createNew,
        getSuiteletPage: getSuiteletPage
        // saveRecord: saveRecord,
        // validateField: validateField,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged
    }
});
