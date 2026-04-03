/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @author Samir Papade 
 */
let functionalCall = 0
define(["N/search", "N/runtime", "N/record"], (search, runtime, record) => {
    let get = (requestParams) => {
        try {
            let vendorBillsArr = getVendorBills();
            if (vendorBillsArr.length > 0) {
                let internalId = vendorBillsArr[vendorBillsArr.length - 1].nsInternalId;
                log.debug({ title: "internalId", details: internalId });
                updateInternalId(internalId);
                return { "status": "Success", "data": vendorBillsArr };
            } else {
                return { "status": "Failed", "data": "Data not found in the System" }
            }

        }
        catch (ex) {
            log.error({ title: "Send Response", details: ex });
        }
    };
    const getVendorBills = () => {
        try {
            let scriptObj = runtime.getCurrentScript();
            let lastInternalId = scriptObj.getParameter({ name: "custscript_search_bill_last_internal_id" });
            lastInternalId = lastInternalId == "" ? 0 : lastInternalId;
            log.debug({ title: "lastInternalId", details: lastInternalId });
            let reponseArray = [];
            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                filters: [
                    ["type", "anyof", "VendBill"], "AND",
                    ["mainline", "is", "F"], "AND",
                    ["custbodyclb_vendorbillcatory", "noneof", "6", "7"], "AND",
                    ["subsidiary", "anyof", "4"], "AND",
                    ["item", "anyof", "307", "308"], "AND",
                    ["internalidnumber", "greaterthan", lastInternalId],
                    "AND",
                    ["datecreated", "onorafter", "07/01/2024"]
                ],
                columns: [
                    search.createColumn({ name: "internalid", summary: "GROUP", label: "internalid", sort: search.Sort.ASC }),
                    search.createColumn({ name: "tranid", summary: "GROUP", label: "Document Number" }),
                    search.createColumn({ name: "mainname", summary: "GROUP", label: "Name" }),
                    search.createColumn({ name: "custbody_asc_inv_project_selected", summary: "GROUP", label: "Project Selected" }),
                    search.createColumn({ name: "custbody_clb_startdate", summary: "GROUP", label: "Start Date" }),
                    search.createColumn({ name: "custbody_clb_enddate", summary: "GROUP", label: "End Date" }),
                    search.createColumn({ name: "custcol_clb_subconemployee", summary: "GROUP", label: "Subcon Employee" }),
                    search.createColumn({ name: "formulanumeric1", summary: "SUM", formula: "Case WHEN {item} = 'ST Item' Then {quantity} else 0 END", label: "Formula (Numeric)" }),
                    search.createColumn({ name: "formulacurrency2", summary: "SUM", formula: "Case WHEN {item} = 'ST Item' Then {rate} else 0 END", label: "Formula (Currency)" }),
                    search.createColumn({ name: "formulanumeric3", summary: "SUM", formula: "Case WHEN {item} = 'OT Item' Then {quantity} else 0 END", label: "Formula (Numeric)" }),
                    search.createColumn({ name: "formulacurrency4", summary: "SUM", formula: "Case WHEN {item} = 'OT Item' Then {rate} else 0 END", label: "Formula (Currency)" }),
                    search.createColumn({ name: "amount", summary: "MAX", label: "Amount" }),
                    search.createColumn({ name: "terms", summary: "GROUP", label: "Terms" }),
                    search.createColumn({ name: "custbody_clb_paymentmode", summary: "GROUP", label: "Mode" })
                ]
            });
            var searchResultCount = vendorbillSearchObj.runPaged().count;
            log.debug("vendorbillSearchObj result count", searchResultCount);
            let pagedSearch = vendorbillSearchObj.run();
            let prRecords = pagedSearch.getRange({ start: 0, end: 500 });
            log.debug({ title: "prRecords", details: prRecords });
            log.debug("functionalCall", functionalCall);
            if (prRecords.length > 0) {
                prRecords.forEach(function (result) {
                    var internalId = result.getValue({ name: "internalid", summary: "GROUP", label: "internalid" });
                    var transID = result.getValue({ name: "tranid", summary: "GROUP", label: "Document Number" });
                    var vendor = result.getText({ name: "mainname", summary: "GROUP", label: "Name" });
                    var vendorId = (vendor.split(' ')[0])
                    let vendorname = vendor.substr(vendor.indexOf(" ") + 1);
                    var ProjectName = result.getText({ name: "custbody_asc_inv_project_selected", summary: "GROUP", label: "Project Selected" });
                    var startDate = result.getValue({ name: "custbody_clb_startdate", summary: "GROUP", label: "Start Date" });
                    var Enddate = result.getValue({ name: "custbody_clb_enddate", summary: "GROUP", label: "End Date" });
                    var Employee = result.getText({ name: "custcol_clb_subconemployee", summary: "GROUP", label: "Subcon Employee" });
                    var STHour = result.getValue({ name: "formulanumeric1", summary: "SUM", label: "Formula (Numeric)" });
                    var STRate = result.getValue({ name: "formulacurrency2", summary: "SUM", label: "Formula (Currency)" });
                    var OTHour = result.getValue({ name: "formulanumeric3", summary: "SUM", label: "Formula (Numeric)" });
                    var OTRate = result.getValue({ name: "formulacurrency4", summary: "SUM", label: "Formula (Currency)" });
                    var amount = result.getValue({ name: "amount", summary: "MAX", label: "Amount" });
                    var PaymentMode = result.getText({ name: "custbody_clb_paymentmode", summary: "GROUP", label: "Mode" });
                    var Terms = result.getText({ name: "terms", summary: "GROUP", label: "Terms" });
                    var responseObj = {
                        "nsInternalId": internalId,
                        "transID": transID,
                        "vendorId": vendorId,
                        "vendorname": vendorname,
                        "ProjectName": ProjectName,
                        "startDate": startDate,
                        "Enddate": Enddate,
                        "Employee": Employee,
                        "STHour": STHour,
                        "STRate": !STRate ? 0 : STRate,
                        "OTHour": OTHour,
                        "OTRate": !OTRate ? 0 : OTRate,
                        "amount": Math.abs(amount),
                        "PaymentMode": PaymentMode,
                        "paymentTerm": Terms
                    }
                    reponseArray.push(responseObj);
                    return true;
                });
                functionalCall = 0;
            } else {
                if (functionalCall == 0) {
                    log.debug("function call else part executed");
                    updateInternalId(0);
                    functionalCall++;
                    getVendorBills();
                }
            }
            return reponseArray;
        }
        catch (ex) {
            log.error({ title: "Get Vendor Bills", details: ex });
        }
    };

    const updateInternalId = (internalId) => {
        try {
            record.submitFields({
                type: "scriptdeployment",
                id: "7984",
                values: {
                    "custscript_search_bill_last_internal_id": internalId
                }
            });
        }
        catch (ex) {
            log.error({ title: "Update Last Internal Id", details: ex });
        }
    };
    const getAllResults = (searchObj) => {
        try {
            let start = 0;
            let totalResults = new Array();
            do {
                if (searchObj != null && searchObj != "") {
                    var results = searchObj.getRange({ start: start, end: start + 1000 });
                    for (let s = 0; s < results.length; s++) {
                        start++;
                        totalResults[totalResults.length] = results[s];
                    }
                }
            } while (results.length >= 1000);
            return totalResults;
        }
        catch (ex) {
            log.error({ title: "Get All Result", details: ex });
        }
    };
    return { get: get }
});