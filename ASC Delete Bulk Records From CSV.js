/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/file', "N/runtime", "N/search"], (record, file, runtime, search) => {
    const getInputData = (inputContext) => {
        try {
            let tsData = [];
            let scriptObj = runtime.getCurrentScript();
            let fileId = scriptObj.getParameter({ name: "custscript_fileid" });
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
        try {
            let count = 0;
            let dataObj = JSON.parse(reduceContext.values[0]);
            log.debug({ title: "dataObj", details: dataObj });
            let udpatedRecord = record.submitFields({
                type: dataObj.recordType,
                id: dataObj.internalId,
                values: { "approvalstatus": 2 },
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });

            log.debug({ title: "udpatedRecord", details: udpatedRecord });
                 // var records = record.load({
                 //      type: dataObj.recordType,
                 //      id: dataObj.internalId,
                 //  })
               // records.setValue('approvalstatus',2);
               // records.save();

/**
           
           record.delete({
               type: dataObj.recordType,
               id: dataObj.internalId,
          });
            var line = records.getLineCount({ sublistId: "links" });
            if (line > 0) {
                for (var i = 0; i < line; i++) {
                    var type = records.getSublistValue({
                        sublistId: "links",
                        fieldId: "type",
                        line: i,
                    });
                    var id = records.getSublistValue({
                        sublistId: "links",
                        fieldId: "id",
                        line: i,
                    });
                    log.debug("type", type);
                    if (type == "Credit Memo") {

                        record.delete({
                            type: "creditmemo",
                            id: id,
                        });
                        log.debug({ title: "deleted dependend ", details: id });
                    }
                    else if (type == "Payment") {
                        var paymentrecords = record.load({
                            type: "customerpayment",
                            id: id,
                            isDynamic:true,
                        })
                        var linenum = paymentrecords.findSublistLineWithValue({
                            sublistId: 'apply',
                            fieldId: 'doc',
                            value: dataObj.internalId,
                        });
                        paymentrecords.selectLine({
                            sublistId: 'apply',
                            line: linenum
                        });
                        paymentrecords.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: false
                        });
                        paymentrecords.commitLine({
                            sublistId: 'apply'
                        });

                        var paymentId = paymentrecords.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        });
                        log.debug({ title: "unlinked payment ", details: id });

                    }
                    else if (type == "Bill Credit")
                    {
                        record.delete({
                            type: "vendorcredit",
                            id: id,
                        });
                    }
                    else{
                        continue;
                    }

                }
            }
            record.delete({
                type: "invoice",
                id: dataObj.internalId,
            });
**/
           log.debug({ title: "updated id", details: dataObj.internalId });



        }
        catch (ex) {
            log.error({ title: "Reduce", details: ex });
        }
    };
    const summarize = (summaryContext) => {

    };
    return { getInputData, reduce, summarize }
});
