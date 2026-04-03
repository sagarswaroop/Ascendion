/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/file', "N/runtime", "N/search"], (record, file, runtime, search) => {
    const getInputData = (inputContext) => {
        try {
            let tsData = [];
            let scriptObj = runtime.getCurrentScript();
            let fileId = scriptObj.getParameter({ name: "custscript_fileid1" });
            log.debug({ title: "fileId", details: fileId });
            let fileObj = file.load({ id: fileId });
            let iterator = fileObj.lines.iterator();
            // Skip the first line, which is the CSV header line
            iterator.each(function () { return false; });
            // Process each line in the file
            iterator.each(function (line) {
                // Update the total based on the line value
                let lineValues = line.value.split(',');
                tsData.push({ "internalId": lineValues[0], "recordType": record.Type.VENDOR_BILL });
                // tsData.push({ "internalId": lineValues[0], "intercompany": lineValues[1], "recordType": record.Type.VENDOR_BILL });
                return true;
            });
            log.debug({ title: "tsData", details: tsData.length });
            return tsData;
        }
        catch (ex) {
            log.error({ title: "Get Input Data", details: ex });
        }
    };
    const reduce = (reduceContext) => {
        let dataObj = JSON.parse(reduceContext.values[0]);
        log.debug({ title: "dataObj", details: dataObj });
        try {

            var records = record.load({
                type: dataObj.recordType,
                id: dataObj.internalId,
            });

            let approvalStatus = records.getValue({
                fieldId: 'approvalstatus'
            });

            let projectId = records.getValue({
                fieldId: 'custbody_asc_inv_project_selected'
            });

            let employee = records.getValue({
                fieldId: 'custbody_asc_subcon_employee'
            });

            let startDate = records.getValue({
                fieldId: 'custbody_clb_startdate'
            });

            let endDate = records.getValue({
                fieldId: 'custbody_clb_enddate'
            });

            debugger;
            startDate = formateDate(startDate);
            endDate = formateDate(endDate);

            // empty time track bill link attachment
            var trackTimeObj = search.create({
                type: "timebill",
                filters:
                    [
                        ["billable", "is", "T"],
                        "AND",
                        ["customer", "anyof", projectId],
                        "AND",
                        ["date", "within", startDate, endDate],
                        // "AND",
                        // ["custcol_asc_timesheet_status", "anyof", "2"],
                        "AND",
                        ["custcol_clb_vendor_bill_link", "anyof", dataObj.internalId],
                        "AND",
                        ["employee", "anyof", employee]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custcol_asc_payrete", label: "Pay Rate" }),
                        search.createColumn({
                            name: "internalid",
                            join: "item",
                        }),
                        search.createColumn({ name: "durationdecimal" })
                    ]
            });
            var searchResultCount = trackTimeObj.runPaged().count;
            log.debug("Reduce Stage: track time result count", searchResultCount);

            // if (searchResultCount > 0) { return }

            trackTimeObj.run().each(function (result) {
                var trackTimeID = result.id;
                record.submitFields({
                    type: record.Type.TIME_BILL,
                    id: trackTimeID,
                    values: { "custcol_clb_vendor_bill_link": "", "custcol_clb_vendor_credit": "" },
                    options: { enableSourcing: false, ignoreMandatoryFields: true }
                });
                return true;
            });

            if (approvalStatus == 2) {
                log.debug({ title: "Already Approved", details: dataObj.internalId });
            } else {
                records.setValue('approvalstatus', 2);
            }

            records.setValue('custbody_asc_transaction_reversed', true);
            records.setValue('memo', 'Reversed due to invoice/amount/rate update');
            records.setValue('custbody_asc_createdfromtimetrack', "");
            const updatedBill = records.save();

            if (approvalStatus == 2) {
                record.load({
                    type: record.Type.VENDOR_CREDIT,
                    id: updatedBill,
                });
            }

            if (approvalStatus != 2) {

                log.debug({ title: "updatedBill with vendor credit ", details: updatedBill });
                const creditRecord = record.transform({
                    fromType: record.Type.VENDOR_BILL,
                    fromId: updatedBill,
                    toType: record.Type.VENDOR_CREDIT,
                    isDynamic: true
                });

                creditRecord.setValue("taxdetailsoverride", true);
                creditRecord.setValue('memo', 'Reversed due to invoice/amount/rate update');

                const creatediCreditMemo = creditRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });


                log.debug({ title: "creatediCreditMemo", details: creatediCreditMemo });
            }

            log.debug({ title: "Processed passed bill id", details: dataObj.internalId });
        }
        catch (ex) {
            log.error({ title: "Reduce", details: ex });
        }
    };
    const summarize = (summaryContext) => {

    };

    function formateDate(date) {
        let sysdate = new Date(date);
        return ('0' + (sysdate.getMonth() + 1)).slice(-2) + '/'
            + ('0' + sysdate.getDate()).slice(-2) + '/'
            + sysdate.getFullYear();
    }
    return { getInputData, reduce, summarize }
});