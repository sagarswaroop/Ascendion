/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
* @NAmdConfig /SuiteScripts/Library/requireConfig.json
 */
define(['N/runtime', 'N/record', 'N/search', 'lodash'], function (runtime, record, search, _) {

    function execute(context) {
        var scriptObj = runtime.getCurrentScript();
        try {
            let paramObj = JSON.parse(scriptObj.getParameter({ name: 'custscript_tax_sch_record_details' }));
            log.debug("paramObj",paramObj);

        let isInvoice;
        // let transactionRecord = context.newRecord;
        let transactionRecord = record.load({type: paramObj.type,id: paramObj.id,isDynamic: true});
        
        let subsidiary = transactionRecord.getValue('subsidiary'); // Ascendion Inc. = 4, AEPL = 5
        if (Number(subsidiary) === 4) {
            if (transactionRecord.type === record.Type.INVOICE) {
                isInvoice = true;
            }
            let transactionRecordDetails = {};
            transactionRecordDetails.taxCode = transactionRecord.getValue('custbody_clb_applicable_tax_code');
            log.debug('transactionRecordDetails.taxCode', transactionRecordDetails.taxCode);
            transactionRecordDetails.taxGroup = transactionRecord.getValue('custbody_clb_applicable_tax_group');
            log.debug('transactionRecordDetails.taxGroup', transactionRecordDetails.taxGroup);

            /* Making sure both Tax Group and Tax Codes are not provided (Only one can exist), throwing error if both are provided */
            if (transactionRecordDetails.taxGroup && transactionRecordDetails.taxCode) {
                throw {
                    name: "CONFLICT",
                    message: "Tax Group and Tax Code both are provided. Either provide a Tax Code or a Tax Group for appropriate Tax Lines. Both cannot co-exist.",
                    stack: ""
                };
            }

            let salesTaxTypeRecordInternalIds = [], salesTaxCodeRecordInternalIds = [], salesTaxRates = [];

            /* Checking and fetching Tax Type & Tax Code Record Internal IDs if Tax Group provided is a valid one */
            if (transactionRecordDetails.taxGroup) {
                let salesTaxGroupDetails = getTaxGroupDetails(transactionRecordDetails.taxGroup);
                log.debug('salesTaxGroupDetails', salesTaxGroupDetails);
                salesTaxTypeRecordInternalIds = _.cloneDeep(salesTaxGroupDetails.salesTaxTypeRecordInternalIds);
                salesTaxCodeRecordInternalIds = _.cloneDeep(salesTaxGroupDetails.salesTaxCodeRecordInternalIds);
                salesTaxRates = _.cloneDeep(salesTaxGroupDetails.salesTaxRates);
            }
            /* Checking and fetching Tax Type & Tax Code Record Internal ID if Tax Code provided is a valid one */
            else if (transactionRecordDetails.taxCode) {
                let salesTaxDetails = findTaxCodeAndType(transactionRecordDetails.taxCode);
                salesTaxCodeRecordInternalIds.push(salesTaxDetails.salesTaxCodeRecordInternalId);
                salesTaxTypeRecordInternalIds.push(salesTaxDetails.salesTaxTypeRecordInternalId);
                salesTaxRates.push(salesTaxDetails.salesTaxRates);
            }

            /* Understanding the Tax Lines situation from what is mentioned in the dropdown */
            let weHaveTaxGroupChosen, weHaveSingleTaxCodeChosen;

            log.debug('salesTaxCodeRecordInternalIds', salesTaxCodeRecordInternalIds)
            if (salesTaxCodeRecordInternalIds.length > 1) {
                weHaveTaxGroupChosen = true;
            }
            if (salesTaxCodeRecordInternalIds.length === 1) {
                weHaveSingleTaxCodeChosen = true;
            }

            transactionRecord.setValue('taxdetailsoverride', true);

            let itemLineCount = transactionRecord.getLineCount('item');
            let salesTaxLineCount = transactionRecord.getLineCount('taxdetails');
            let newLineNumber = salesTaxLineCount;

            /* Adding Tax Lines For Each Item */
            
            for (let itemLineIndex = 0; itemLineIndex < itemLineCount; itemLineIndex++) {
                let taxDetailsReferenceNumberOnItemLine = transactionRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxdetailsreference',
                    line: itemLineIndex
                });
                let amountOnItemLine = transactionRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: itemLineIndex
                });

                /* If we have Tax Group chosen */
                if (weHaveTaxGroupChosen) {
                    let alreadyUsedTaxLines = [];
                    for (let salesTaxArrayIndex = 0; salesTaxArrayIndex < salesTaxCodeRecordInternalIds.length; salesTaxArrayIndex++) {
                        let foundUsableTaxLineToEditForCurrentTaxCode = false;
                        for (let salesTaxLineIndex = 0; salesTaxLineIndex < salesTaxLineCount; salesTaxLineIndex++) {
                            if (!alreadyUsedTaxLines.includes(salesTaxLineIndex)) {
                                transactionRecord.selectLine({sublistId: 'taxdetails', line: salesTaxLineIndex})
                                let taxDetailsReferenceNumberOnCurrentTaxLine = transactionRecord.getSublistValue({
                                    sublistId: 'taxdetails',
                                    fieldId: 'taxdetailsreference',
                                    line: salesTaxLineIndex
                                });
                                if (taxDetailsReferenceNumberOnCurrentTaxLine === taxDetailsReferenceNumberOnItemLine) {
                                    foundUsableTaxLineToEditForCurrentTaxCode = true;
                                    populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[salesTaxArrayIndex], salesTaxCodeRecordInternalIds[salesTaxArrayIndex], amountOnItemLine, salesTaxRates[salesTaxArrayIndex], salesTaxLineIndex);
                                    
                                    transactionRecord.commitLine({sublistId: 'taxdetails'});
                                    
                                    alreadyUsedTaxLines.push(salesTaxLineIndex);
                                    break;
                                }
                            }
                        }
                        if (!foundUsableTaxLineToEditForCurrentTaxCode) {
                            transactionRecord.selectLine({sublistId: 'taxdetails', line: newLineNumber})
                            transactionRecord.setCurrentSublistValue({
                                sublistId: 'taxdetails',
                                fieldId: 'taxdetailsreference',
                                line: newLineNumber,
                                value: taxDetailsReferenceNumberOnItemLine
                            });
                            populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[salesTaxArrayIndex], salesTaxCodeRecordInternalIds[salesTaxArrayIndex], amountOnItemLine, salesTaxRates[salesTaxArrayIndex], newLineNumber);

                            transactionRecord.commitLine({sublistId: 'taxdetails'});
                            newLineNumber++;
                        }
                    }
                }
                /* Else if we have Tax Code chosen */
                else if (weHaveSingleTaxCodeChosen) {
                    log.debug("inside else if")
                    let existingTaxLineNumber = transactionRecord.findSublistLineWithValue({
                        sublistId: 'taxdetails',
                        fieldId: 'taxdetailsreference',
                        value: taxDetailsReferenceNumberOnItemLine
                    });
                    /* Adding or Updating Tax Line */
                    if (existingTaxLineNumber === -1) {
                        transactionRecord.selectLine({sublistId: 'taxdetails', line: newLineNumber});
                        transactionRecord.setCurrentSublistValue({
                            sublistId: 'taxdetails',
                            fieldId: 'taxdetailsreference',
                            line: newLineNumber,
                            value: taxDetailsReferenceNumberOnItemLine
                        });
                        
                        populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[0], salesTaxCodeRecordInternalIds[0], amountOnItemLine, salesTaxRates[0], newLineNumber);

                        transactionRecord.commitLine({sublistId: 'taxdetails'});
                        newLineNumber++;
                    }
                    else {
                        transactionRecord.selectLine({sublistId: 'taxdetails', line: existingTaxLineNumber});
                        populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[0], salesTaxCodeRecordInternalIds[0], amountOnItemLine, salesTaxRates[0], existingTaxLineNumber);
                        transactionRecord.commitLine({sublistId: 'taxdetails'});
                    }
                }
            }

            /* If the record we are operating on is an invoice then we are considering the Billable Time sublist too */
            if (isInvoice) {
                let billableTimeCount = transactionRecord.getLineCount('time');

                /* Adding Tax Lines For Each Item */
                for (let billableTimeLineIndex = 0; billableTimeLineIndex < billableTimeCount; billableTimeLineIndex++) {
                    let taxDetailsReferenceNumberOnBillableTimeLine = transactionRecord.getSublistValue({
                        sublistId: 'time',
                        fieldId: 'taxdetailsreference',
                        line: billableTimeLineIndex
                    });
                    let amountOnBillableTimeLine = transactionRecord.getSublistValue({
                        sublistId: 'time',
                        fieldId: 'amount',
                        line: billableTimeLineIndex
                    });
                    let apply = transactionRecord.getSublistValue({
                        sublistId: 'time',
                        fieldId: 'apply',
                        line: billableTimeLineIndex
                    });

                    if (apply) {
                        /* If we have Tax Group chosen */
                        if (weHaveTaxGroupChosen) {
                            let alreadyUsedTaxLines = [];
                            for (let salesTaxArrayIndex = 0; salesTaxArrayIndex < salesTaxCodeRecordInternalIds.length; salesTaxArrayIndex++) {
                                let foundUsableTaxLineToEditForCurrentTaxCode = false;
                                for (let salesTaxLineIndex = 0; salesTaxLineIndex < salesTaxLineCount; salesTaxLineIndex++) {
                                    if (!alreadyUsedTaxLines.includes(salesTaxLineIndex)) {
                                        let taxDetailsReferenceNumberOnCurrentTaxLine = transactionRecord.getSublistValue({
                                            sublistId: 'taxdetails',
                                            fieldId: 'taxdetailsreference',
                                            line: salesTaxLineIndex
                                        });
                                        if (taxDetailsReferenceNumberOnCurrentTaxLine === taxDetailsReferenceNumberOnBillableTimeLine) {
                                            foundUsableTaxLineToEditForCurrentTaxCode = true;
                                            populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[salesTaxArrayIndex], salesTaxCodeRecordInternalIds[salesTaxArrayIndex], amountOnBillableTimeLine, salesTaxRates[salesTaxArrayIndex], salesTaxLineIndex);
                                            alreadyUsedTaxLines.push(salesTaxLineIndex);
                                            break;
                                        }
                                    }
                                }
                                if (!foundUsableTaxLineToEditForCurrentTaxCode) {
                                    transactionRecord.selectLine({sublistId: 'taxdetails', line: newLineNumber});
                                    transactionRecord.setCurrentSublistValue({
                                        sublistId: 'taxdetails',
                                        fieldId: 'taxdetailsreference',
                                        line: newLineNumber,
                                        value: taxDetailsReferenceNumberOnBillableTimeLine
                                    });
                                    populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[salesTaxArrayIndex], salesTaxCodeRecordInternalIds[salesTaxArrayIndex], amountOnBillableTimeLine, salesTaxRates[salesTaxArrayIndex], newLineNumber);
                                    transactionRecord.commitLine({sublistId: 'taxdetails'});
                                    newLineNumber++;
                                }
                            }
                        }
                        /* Else if we have Tax Code chosen */
                        else if (weHaveSingleTaxCodeChosen) {
                            let existingTaxLineNumber = transactionRecord.findSublistLineWithValue({
                                sublistId: 'taxdetails',
                                fieldId: 'taxdetailsreference',
                                value: taxDetailsReferenceNumberOnBillableTimeLine
                            });
                            /* Adding or Updating Tax Line */
                            if (existingTaxLineNumber === -1) {
                                transactionRecord.selectLine({sublistId: 'taxdetails', line: newLineNumber});
                                transactionRecord.setCurrentSublistValue({
                                    sublistId: 'taxdetails',
                                    fieldId: 'taxdetailsreference',
                                    line: newLineNumber,
                                    value: taxDetailsReferenceNumberOnBillableTimeLine
                                });
                                populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[0], salesTaxCodeRecordInternalIds[0], amountOnBillableTimeLine, salesTaxRates[0], newLineNumber);
                                transactionRecord.commitLine({sublistId: 'taxdetails'});
                                newLineNumber++;
                            }
                            else {
                                transactionRecord.selectLine({sublistId: 'taxdetails', line: existingTaxLineNumber});
                                populateTaxLine(transactionRecord, salesTaxTypeRecordInternalIds[0], salesTaxCodeRecordInternalIds[0], amountOnBillableTimeLine, salesTaxRates[0], existingTaxLineNumber);

                                transactionRecord.commitLine({sublistId: 'taxdetails'});
                                
                            }
                        }
                    }
                }
            }

            /* Removing Stray Tax Lines before saving record [if any] to prevent any disparity or error */
            removeStrayTaxLines(transactionRecord, weHaveTaxGroupChosen, weHaveSingleTaxCodeChosen, salesTaxCodeRecordInternalIds, isInvoice);

            const udpatedRecord = transactionRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug("udpatedRecord: "+udpatedRecord);

            
        }
        } catch (error) {
            log.error("TAX CALCULATION SCHEDULE ERROR", error);
        }

    }

    let getTaxGroupDetails = (taxGroupInternalId) => {
        let salesTaxGroupDetails = {};
        log.debug({
            title: 'Finding Tax Group Details...',
            details: 'Finding Tax Codes for Tax Group with Internal ID: ' + taxGroupInternalId
        });

        let taxGroupSearchObj = search.create({
            type: "customrecord_clb_taxgroup",
            filters:
                [
                    ["internalid", "is", taxGroupInternalId]
                ],
            columns:
                [
                    search.createColumn({ name: "name", label: "Name" }),
                    search.createColumn({ name: "custrecord_clb_state_level_tax_code", label: "State Level Tax Code" }),
                    search.createColumn({ name: "custrecord_clb_state_level_tax_type", label: "State Level Tax Type" }),
                    search.createColumn({ name: "custrecord_clb_state_level_tax_rate", label: "State Level Tax Rate" }),
                    search.createColumn({ name: "custrecord_clb_county_level_tax_code", label: "County Level Tax Code" }),
                    search.createColumn({ name: "custrecord_clb_county_level_tax_type", label: "County Level Tax Type" }),
                    search.createColumn({ name: "custrecord_clb_county_level_tax_rate", label: "County Level Tax Rate" })
                ]
        });

        let taxGroupSearchResultCount = taxGroupSearchObj.runPaged().count;

        log.debug({
            title: 'Tax Code Search Completed',
            details: 'Tax Code Search Result Size is: ' + taxGroupSearchResultCount
        });

        if (taxGroupSearchResultCount) {
            let taxGroupSearchResult = taxGroupSearchObj.run().getRange({ start: 0, end: 1 });
            salesTaxGroupDetails.name = taxGroupSearchResult[0].getValue({ name: "name" });

            log.debug({
                title: 'Tax Group Found',
                details: 'Name of Tax Group with Internal ID' + taxGroupInternalId + ' is: ' + salesTaxGroupDetails.name
            });

            salesTaxGroupDetails.salesTaxCodeRecordInternalIds = [];
            salesTaxGroupDetails.salesTaxTypeRecordInternalIds = [];
            salesTaxGroupDetails.salesTaxRates = [];

            salesTaxGroupDetails.salesTaxCodeRecordInternalIds.push(taxGroupSearchResult[0].getValue({ name: "custrecord_clb_state_level_tax_code" }));
            salesTaxGroupDetails.salesTaxTypeRecordInternalIds.push(taxGroupSearchResult[0].getValue({ name: "custrecord_clb_state_level_tax_type" }));
            salesTaxGroupDetails.salesTaxRates.push(taxGroupSearchResult[0].getValue({ name: "custrecord_clb_state_level_tax_rate" }).slice(0, -1));

            salesTaxGroupDetails.salesTaxCodeRecordInternalIds.push(taxGroupSearchResult[0].getValue({ name: "custrecord_clb_county_level_tax_code" }));
            salesTaxGroupDetails.salesTaxTypeRecordInternalIds.push(taxGroupSearchResult[0].getValue({ name: "custrecord_clb_county_level_tax_type" }));
            salesTaxGroupDetails.salesTaxRates.push(taxGroupSearchResult[0].getValue({ name: "custrecord_clb_county_level_tax_rate" }).slice(0, -1));
        }
        else {
            throw {
                name: "INVALID ARGUMENTS",
                message: "Invalid Tax Group provided [" + taxGroup + "].",
                stack: ""
            };
        }
        return salesTaxGroupDetails;
    };

    let findTaxCodeAndType = (taxCode) => {
        let salesTaxDetails = {};
        log.debug({
            title: 'Finding Tax Code Internal ID...',
            details: 'Finding Tax Code for Value: ' + taxCode
        });

        let taxCodeSearchObj = search.create({
            type: "customrecord_clb_taxgroup",
            filters:
                [
                    ["internalid", "is", taxCode]
                ],
            columns:
                [
                    search.createColumn({ name: "name", label: "Name" }),
                    search.createColumn({ name: "custrecord_clb_state_level_tax_code", label: "State Level Tax Code" }),
                    search.createColumn({ name: "custrecord_clb_state_level_tax_type", label: "State Level Tax Type" }),
                    search.createColumn({ name: "custrecord_clb_state_level_tax_rate", label: "State Level Tax Rate" }),
                ]
        });

        let taxCodeSearchResultCount = taxCodeSearchObj.runPaged().count;

        log.debug({
            title: 'Tax Code Search Completed',
            details: 'Tax Code Search Result Size is: ' + taxCodeSearchResultCount
        });

        if (taxCodeSearchResultCount) {
            let taxCodeSearchResult = taxCodeSearchObj.run().getRange({ start: 0, end: 1 });
            salesTaxDetails.salesTaxCodeRecordInternalId = taxCodeSearchResult[0].getValue({ name: "custrecord_clb_state_level_tax_code", label: "State Level Tax Code" });
            salesTaxDetails.salesTaxTypeRecordInternalId = taxCodeSearchResult[0].getValue({ name: "custrecord_clb_state_level_tax_type", label: "State Level Tax Type" });
            salesTaxDetails.salesTaxRates = taxCodeSearchResult[0].getValue({ name: "custrecord_clb_state_level_tax_rate", label: "State Level Tax Rate" });
            log.debug({
                title: 'Tax Code Found',
                details: 'InternalID of ' + taxCode + ' is: ' + salesTaxDetails.salesTaxCodeRecordInternalId
            });

            log.debug({
                title: 'Tax Code Found',
                details: 'Tax Type of ' + taxCode + ' is: ' + salesTaxDetails.salesTaxTypeRecordInternalId
            });
            log.debug('salesTaxDetails', salesTaxDetails);
        }
        else {
            throw {
                name: "INVALID ARGUMENTS",
                message: "Invalid Tax Code provided [" + taxCode + "].",
                stack: ""
            };
        }
        return salesTaxDetails;
    };

    let populateTaxLine = (transactionRecord, salesTaxType, salesTaxCode, amount, salestaxRate, lineNumber) => {
        transactionRecord.setCurrentSublistValue({
            sublistId: 'taxdetails',
            fieldId: 'taxtype',
            line: lineNumber,
            value: salesTaxType
        });

        transactionRecord.setCurrentSublistValue({
            sublistId: 'taxdetails',
            fieldId: 'taxcode',
            line: lineNumber,
            value: salesTaxCode
        });

        transactionRecord.setCurrentSublistValue({
            sublistId: 'taxdetails',
            fieldId: 'taxbasis',
            line: lineNumber,
            value: Number(amount)
        });
        var rate = removePercentage(salestaxRate)
        //log.debug("salestaxRate",rate);
        transactionRecord.setCurrentSublistValue({
            sublistId: 'taxdetails',
            fieldId: 'taxrate',
            line: lineNumber,
            value: rate
        });

        transactionRecord.setCurrentSublistValue({
            sublistId: 'taxdetails',
            fieldId: 'taxamount',
            line: lineNumber,
            value: (rate * Number(amount)) / 100
        });

        return transactionRecord;
    };

    let removeStrayTaxLines = (transactionRecord, weHaveTaxGroupChosen, weHaveSingleTaxCodeChosen, salesTaxCodeRecordInternalIds, isInvoice) => {

        let salesTaxLineCount = transactionRecord.getLineCount('taxdetails');

        for (let salesTaxLineIndex = salesTaxLineCount; salesTaxLineIndex > 0; salesTaxLineIndex--) {
            let billableTimeLineWithSameTaxDetailsReference = -1;
            let taxDetailsReferenceNumberForCurrentTaxLine = transactionRecord.getSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'taxdetailsreference',
                line: salesTaxLineIndex - 1
            });
            let taxCodeForCurrentTaxLine = transactionRecord.getSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'taxcode',
                line: salesTaxLineIndex - 1
            });

            let itemLineWithSameTaxDetailsReference = transactionRecord.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'taxdetailsreference',
                value: taxDetailsReferenceNumberForCurrentTaxLine
            });

            if (isInvoice) {
                let billableTimeCount = transactionRecord.getLineCount('time');

                /* Adding Tax Lines For Each Item */
                for (let billableTimeLineIndex = 0; billableTimeLineIndex < billableTimeCount; billableTimeLineIndex++) {
                    let apply = transactionRecord.getSublistValue({
                        sublistId: 'time',
                        fieldId: 'apply',
                        line: billableTimeLineIndex
                    });

                    if (apply) {
                        let taxDetailsReferenceNumberOnBillableTimeLine = transactionRecord.getSublistValue({
                            sublistId: 'time',
                            fieldId: 'taxdetailsreference',
                            line: billableTimeLineIndex
                        });
                        if (taxDetailsReferenceNumberOnBillableTimeLine === taxDetailsReferenceNumberForCurrentTaxLine) {
                            billableTimeLineWithSameTaxDetailsReference = billableTimeLineIndex;
                            break;
                        }
                    }
                }
            }

            /* If Tax Details Reference does not exist on the Item lines or Billable Time Lines (If it's an invoice), we are removing the Tax Line */
            if (!isInvoice && itemLineWithSameTaxDetailsReference === -1 || isInvoice && itemLineWithSameTaxDetailsReference === -1 && billableTimeLineWithSameTaxDetailsReference === -1) {
                transactionRecord.removeLine({
                    sublistId: 'taxdetails',
                    line: salesTaxLineIndex - 1,
                    ignoreRecalc: true
                });
            }
            /* If Tax Details Reference exists but the Tax Code is not applicable */
            else {
                /* If the Tax Code for the line with valid Tax Details Reference does not match with Tax Codes in the payload [If Any], we are removing the Tax Line */
                if (weHaveSingleTaxCodeChosen || weHaveTaxGroupChosen) {
                    if (!salesTaxCodeRecordInternalIds.includes(taxCodeForCurrentTaxLine)) {
                        transactionRecord.removeLine({
                            sublistId: 'taxdetails',
                            line: salesTaxLineIndex - 1,
                            ignoreRecalc: true
                        });
                    }
                }
                /* If we don't have any Tax Code or Tax Group chosen, there should be no tax lines - hence deleting it */
                else {
                    transactionRecord.removeLine({
                        sublistId: 'taxdetails',
                        line: salesTaxLineIndex - 1,
                        ignoreRecalc: true
                    });
                }
            }
        }

        return transactionRecord;
    };
    function removePercentage(value) {
        return parseFloat(value.replace('%', ''));
    }

    return {
        execute: execute
    }
});
