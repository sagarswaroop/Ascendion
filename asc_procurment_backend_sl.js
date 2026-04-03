/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@author Sagar Kumar
 *@description handle all request for time sheet data
 */
define(["N/search", 'N/query', 'N/url', "N/record", "N/https", "N/crypto"], function (search, query, url, record, https, crypto) {

    function onRequest(context) {
        var param = context.request.parameters;
        if (context.request.method === 'POST') {
            log.debug("param.type", param.type);
            const employeeId = param.employee;

            if (param.type == "login") {
                const email = context.request.parameters.email;
                const password = context.request.parameters.pass;

                log.debug(`email: ${email}, password: ${password}`);

                if (email && password) {
                    let queryString = `select custentity_asd_emp_acess_code, id from employee where email = '${email}' AND custentity_asd_emp_acess_code='${password}'`;
                    var result = query.runSuiteQL({ query: queryString }).asMappedResults();
                    log.debug("result is", result);

                    if (result.length > 0) {
                        // log.debug("redirectUrl",redirectUrl);
                        context.response.write(JSON.stringify({ success: true, id: result[0].id }));
                    } else {
                        // returnLoginPage();
                        context.response.write(JSON.stringify({ success: false }));
                    }
                }
            }
            if (param.type == "purchaseorder") {
                let customRecordSearch = search.create({
                    type: "purchaseorder",
                    filters: [["type", "anyof", "PurchOrd"], "AND", ["employee", "anyof", employeeId], "AND", ["mainline", "is", "T"]],
                    columns: [search.createColumn({ name: "internalid" }), search.createColumn({ name: "tranid" }), search.createColumn({ name: "trandate" }), search.createColumn({ name: "entity" }), search.createColumn({ name: "duedate" }), search.createColumn({ name: "creditfxamount" }), search.createColumn({ name: "statusref" })]
                });

                log.debug("customRecordSearch.runPaged().count", customRecordSearch.runPaged().count);

                let pagedSearch = customRecordSearch.run();
                let records = pagedSearch.getRange({ start: 0, end: customRecordSearch.runPaged().count });
                const poList = [];
                records.forEach(function (result, lineIndex) {
                    let id = result.getValue({ name: "internalid" });

                    poList.push({
                        id: result.getValue({ name: "internalid" }),
                        docNumber: result.getValue({ name: "tranid" }),
                        tranDate: result.getValue({ name: "trandate" }),
                        vendor: result.getText({ name: "entity" }),
                        dueDate: result.getValue({ name: "duedate" }),
                        amount: result.getValue({ name: "creditfxamount" }),
                        status: result.getValue({ name: "statusref" }),
                        // viewUrl: URL//getViewUrl({ purchaseid: id })
                    });



                });

                // log.debug("poList", poList);
                context.response.write(JSON.stringify(poList));
            }

            if (param.type == "purchaserequisition") {
                var purchaserequisitionSearchObj = search.create({
                    type: "purchaserequisition",
                    filters:
                        [
                            ["type", "anyof", "PurchReq"],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["employee", "anyof", employeeId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid" }),
                            search.createColumn({ name: "trandate", label: "Date" }),
                            search.createColumn({ name: "tranid", label: "Document Number" }),
                            search.createColumn({ name: "departmentnohierarchy", label: "Department (no hierarchy)" }),
                            search.createColumn({ name: "locationnohierarchy", label: "Location (no hierarchy)" }),
                            search.createColumn({ name: "estimatedtotal", label: "Estimated Total" })
                        ]
                });
                var searchResultCount = purchaserequisitionSearchObj.runPaged().count;
                let pagedSearch = purchaserequisitionSearchObj.run();
                let prRecords = pagedSearch.getRange({ start: 0, end: searchResultCount });
                const prList = [];
                prRecords.forEach(function (result, lineIndex) {
                    prList.push({
                        id: result.getValue({ name: "internalid" }),
                        docNumber: result.getValue({ name: "tranid" }),
                        tranDate: result.getValue({ name: "trandate" }),
                        department: result.getValue({ name: "departmentnohierarchy" }),
                        location: result.getValue({ name: "locationnohierarchy" }),
                        amount: result.getValue({ name: "estimatedtotal" })
                        // viewUrl: URL//getViewUrl({ purchaseid: id })
                    });
                });

                log.debug("prList", prList);
                context.response.write(JSON.stringify(prList));
            }

            if (param.type == "itemreceipt") {
                var itemreceiptSearchObj = search.create({
                    type: "itemreceipt",
                    filters:
                        [
                            ["type", "anyof", "ItemRcpt"],
                            "AND",
                            ["createdfrom.employee", "anyof", employeeId],
                            "AND",
                            ["mainline", "is", "T"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "trandate", label: "Date" }),
                            search.createColumn({ name: "tranid", label: "Document Number" }),
                            search.createColumn({ name: "entity", label: "Name" }),
                            search.createColumn({ name: "memo", label: "Memo" }),
                            search.createColumn({ name: "amount", label: "Amount" })
                        ]
                });
                let searchResultCount = itemreceiptSearchObj.runPaged().count;
                let pagedSearch = itemreceiptSearchObj.run();
                let prRecords = pagedSearch.getRange({ start: 0, end: searchResultCount });
                const itemReceiptList = [];
                prRecords.forEach(function (result, lineIndex) {
                    itemReceiptList.push({
                        id: result.getValue({ name: "internalid" }),
                        docNumber: result.getValue({ name: "tranid" }),
                        tranDate: result.getValue({ name: "trandate" }),
                        entity: result.getValue({ name: "entity" }),
                        memo: result.getValue({ name: "memo" }),
                        amount: result.getValue({ name: "amount" })
                        // viewUrl: URL//getViewUrl({ purchaseid: id })
                    });
                });

                log.debug("itemReceiptList", itemReceiptList);
                context.response.write(JSON.stringify(itemReceiptList));
            }
        }

    }

    return {
        onRequest: onRequest
    }
});
