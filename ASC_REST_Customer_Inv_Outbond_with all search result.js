/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@author Sagar Kumar
 *@description send data of invoice with project details.
 */
define(["N/search"], function (search) {

    let _get = (requestParams) => {
        try {
            let invoiceList = getCustInvoice();
            if (invoiceList.length > 0) {
                let internalId = invoiceList[invoiceList.length - 1].nsInternalId;
                log.debug({ title: "internalId", details: internalId });
                updateInternalId(internalId);
                return { "status": "Success", "data": invoiceList };
            } else {
                return { "status": "Failed", "data": "Data not found in the System" }
            }

        }
        catch (ex) {
            log.error({ title: "Send Response", details: ex });
        }
    };

    function getCustInvoice() {
        try {
            let responseList = [];
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                    [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["subsidiary", "anyof", "4"],
                        "AND",
                        ["custbody_clb_projecttypeapproval", "anyof", "1", "2", "3", "4", "5"],
                        "AND",
                        ["item", "anyof", "307", "308", "315"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            label: "internalid"
                        }),

                        search.createColumn({
                            name: "tranid",
                            summary: "GROUP",
                            label: "Document Number"
                        }),
                        search.createColumn({
                            name: "altname",
                            join: "customerMain",
                            summary: "GROUP",
                            label: "Cust Name"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "customerMain",
                            summary: "GROUP",
                            label: "Cust Id"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "job",
                            summary: "GROUP",
                            label: "Child Project Id"
                        }),
                        search.createColumn({
                            name: "entity",
                            summary: "GROUP",
                            label: "Child Project Name"
                        }),
                        search.createColumn({
                            name: "custbody_asc_inv_project_selected",
                            summary: "GROUP",
                            label: "Parent Project"
                        }),
                        search.createColumn({
                            name: "custbody_clb_periodstartingdate",
                            summary: "GROUP",
                            label: "Period Starting Date"
                        }),
                        search.createColumn({
                            name: "custbody_clb_periodendingdate",
                            summary: "GROUP",
                            label: "Period Ending Date"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "Case WHEN {item}= 'ST Item' Then {quantity} else 0 END",
                            label: "Formula (Numeric)"
                        }),
                        search.createColumn({
                            name: "formulacurrency",
                            summary: "AVG",
                            formula: "Case WHEN {item}= 'ST Item' Then {rate} else 0 END",
                            label: "Formula (Currency)"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "Case WHEN {item}= 'OT Item' Then {quantity} else 0 END",
                            label: "Formula (Numeric)"
                        }),
                        search.createColumn({
                            name: "formulacurrency",
                            summary: "AVG",
                            formula: "Case WHEN {item}= 'OT Item' Then {rate} else 0 END",
                            label: "Formula (Currency)"
                        }),
                        search.createColumn({
                            name: "amount",
                            summary: "MAX",
                            label: "Amount"
                        })
                    ]
            });

            var searchResultCount = invoiceSearchObj.runPaged().count;
            log.debug("invoiceSearchObj result count", searchResultCount);

            // let pagedSearch = invoiceSearchObj.run();
            // let prRecords = pagedSearch.getRange({ start: 0, end: 2 });

            if (searchResultCount > 0) {
                const pagedData = invoiceSearchObj.runPaged({
                    pageSize: 100
                });

                let lineCount = 0;
                // prRecords.forEach(function (result) {
                pagedData.pageRanges.forEach(function (pageRange) {
                    const page = pagedData.fetch({ index: pageRange.index });
                    page.data.forEach(function (result) {
                        let docNumber = result.getValue({
                            name: "tranid",
                            summary: "GROUP",
                            label: "Document Number"
                        });
                        let customerName = result.getValue({
                            name: "altname",
                            join: "customerMain",
                            summary: "GROUP",
                            label: "Cust Name"
                        });
                        let customerId = result.getValue({
                            name: "entityid",
                            join: "customerMain",
                            summary: "GROUP",
                            label: "Cust Id"
                        });

                        let childProId = result.getValue({
                            name: "entityid",
                            join: "job",
                            summary: "GROUP",
                            label: "Child Project Id"
                        });

                        let childProName = result.getText({
                            name: "entity",
                            summary: "GROUP",
                            label: "Child Project Name"
                        });

                        let parentProject = result.getText({
                            name: "custbody_asc_inv_project_selected",
                            summary: "GROUP",
                            label: "Parent Project"
                        });

                        let proStartingDate = result.getValue({
                            name: "custbody_clb_periodstartingdate",
                            summary: "GROUP",
                            label: "Period Starting Date"
                        });
                        let periodEndDate = result.getValue({
                            name: "custbody_clb_periodendingdate",
                            summary: "GROUP",
                            label: "Period Ending Date"
                        });
                        let stItemQty = result.getValue({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "Case WHEN {item}= 'ST Item' Then {quantity} else 0 END",
                            label: "Formula (Numeric)"
                        });
                        let stItemRate = result.getValue({
                            name: "formulacurrency",
                            summary: "AVG",
                            formula: "Case WHEN {item}= 'ST Item' Then {rate} else 0 END",
                            label: "Formula (Currency)"
                        });

                        let otItemQty = result.getValue({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: "Case WHEN {item}= 'OT Item' Then {quantity} else 0 END",
                            label: "Formula (Numeric)"
                        });

                        let otItemRate = result.getValue({
                            name: "formulacurrency",
                            summary: "AVG",
                            formula: "Case WHEN {item}= 'OT Item' Then {rate} else 0 END",
                            label: "Formula (Currency)"
                        });

                        let amount = result.getValue({
                            name: "amount",
                            summary: "MAX",
                            label: "Amount"
                        });

                        responseList.push({
                            "documentNumber": docNumber,
                            "customerName": customerName,
                            "customerId": customerId,
                            "childProjectName": childProName,
                            "childProjectId": childProId,
                            "parentProject": parentProject,
                            "startingDate": proStartingDate,
                            "endDate": periodEndDate,
                            "stItemQty": stItemQty,
                            "stItemRate": stItemRate,
                            "otItemQty": otItemQty,
                            "otItemRate": otItemRate,
                            "amount": amount
                        });

                        lineCount++;
                    });
                });

                log.debug("line count is; " + lineCount);

                log.debug("response data:", JSON.stringify(responseList));
                return { "status": "Success", "data": responseList };

            } else {
                return { "status": "Failed", "data": "Data not found in the System" }
            }


        }
        catch (ex) {
            log.debug({ title: "Send Response", details: ex });
        }
    }

    const updateInternalId = (internalId) =>{
        try 
        {
            record.submitFields({
                type: "scriptdeployment",
                id: "7984",
                values: {
                    "custscript_search_bill_last_internal_id": internalId
                }
            });
        } 
        catch(ex) 
        {
            log.error({title: "Update Last Internal Id", details: ex});
        }
    };


    return {
        get: _get
    }
});
