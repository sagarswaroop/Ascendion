/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @author Samir Papade 
 */
define(["N/search"], (search) => {
    let get = (requestParams) => {
        try {
            let reponseArray = [];
            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                [
                   ["type","anyof","VendBill"], 
                   "AND", 
                   ["mainline","is","F"], 
                   "AND", 
                   ["custbodyclb_vendorbillcatory","noneof","6","7"], 
                   "AND", 
                   ["subsidiary","anyof","4"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "tranid",
                      summary: "GROUP",
                      label: "Document Number"
                   }),
                   search.createColumn({
                      name: "entity",
                      summary: "GROUP",
                      label: "Name"
                   }),
                   search.createColumn({
                      name: "custbody_asc_inv_project_selected",
                      summary: "GROUP",
                      label: "Project Selected"
                   }),
                   search.createColumn({
                      name: "custbody_clb_startdate",
                      summary: "GROUP",
                      label: "Start Date"
                   }),
                   search.createColumn({
                      name: "custbody_clb_enddate",
                      summary: "GROUP",
                      label: "End Date"
                   }),
                   search.createColumn({
                      name: "custcol_clb_subconemployee",
                      summary: "GROUP",
                      label: "Subcon Employee"
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
                   }),
                   search.createColumn({
                      name: "terms",
                      summary: "GROUP",
                      label: "Terms"
                   }),
                   search.createColumn({
                      name: "custbody_clb_paymentmode",
                      summary: "GROUP",
                      label: "Mode"
                   })
                ]
             });
                var searchResultCount = vendorbillSearchObj.runPaged().count;
                let pagedSearch = vendorbillSearchObj.run();
                let prRecords = pagedSearch.getRange({ start: 0, end: 100 });
                if (searchResultCount > 0) {
                prRecords.forEach(function (result) {
                    var transID = result.getValue({name: "tranid",summary: "GROUP",label: "Document Number"});
                    var vendor = result.getText({
                        name: "entity",
                        summary: "GROUP",
                        label: "Name"
                     });
                    var vendorId = (vendor.split(' ')[0])
                    let vendorname = vendor.substr(vendor.indexOf(" ") + 1);
                    var ProjectName = result.getText({
                        name: "custbody_asc_inv_project_selected",
                        summary: "GROUP",
                        label: "Project Selected"
                     });
                    var startDate = result.getValue({
                        name: "custbody_clb_startdate",
                        summary: "GROUP",
                        label: "Start Date"
                     });
                    var Enddate = result.getValue({
                        name: "custbody_clb_enddate",
                        summary: "GROUP",
                        label: "End Date"
                     });
                    var Employee = result.getText({
                        name: "custcol_clb_subconemployee",
                        summary: "GROUP",
                        label: "Subcon Employee"
                     });
                    var STHour = result.getValue({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "Case WHEN {item}= 'ST Item' Then {quantity} else 0 END",
                        label: "Formula (Numeric)"
                     });
                    var STRate = result.getValue({
                        name: "formulacurrency",
                        summary: "AVG",
                        formula: "Case WHEN {item}= 'ST Item' Then {rate} else 0 END",
                        label: "Formula (Currency)"
                     });
                    var OTHour = result.getValue({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "Case WHEN {item}= 'OT Item' Then {quantity} else 0 END",
                        label: "Formula (Numeric)"
                     });
                     var OTRate = result.getValue({
                        name: "formulacurrency",
                        summary: "AVG",
                        formula: "Case WHEN {item}= 'OT Item' Then {rate} else 0 END",
                        label: "Formula (Currency)"
                     });
                    var amount = result.getValue({
                        name: "amount",
                        summary: "MAX",
                        label: "Amount"
                     });
                    var PaymentMode = result.getText({
                        name: "custbody_clb_paymentmode",
                        summary: "GROUP",
                        label: "Mode"
                     });
                    var Terms = result.getText({
                        name: "terms",
                        summary: "GROUP",
                        label: "Terms"
                     });

                     var responseObj = {
                        "transID":transID,
                        "vendorId":vendorId,
                        "vendorname":vendorname,
                        "ProjectName":ProjectName,
                        "startDate":startDate,
                        "Enddate":Enddate,
                        "Employee":Employee,
                        "STHour":STHour,
                        "STRate":STRate,
                        "STHour":OTHour,
                        "OTRate":OTRate,
                        "amount": Math.abs(amount),
                        "PaymentMode":PaymentMode,
                        "paymentTerm":Terms,
                        
                    }
                    reponseArray.push(responseObj);
                    return true;
               
             });
                return {
                    "status": "Success",
                    "data": reponseArray
                }
            }else {
                return {
                    "status": "Failed",
                    "data": "Data not found in the System"
                }
            }
             
             /*
             vendorbillSearchObj.id="customsearch1721893088028";
             vendorbillSearchObj.title="Vendor bill report for API (copy)";
             var newSearchId = vendorbillSearchObj.save();
             */
        }
        catch (ex) {
            log.debug({ title: "Send  Response", details: ex });
        }
    };
    
    return { get:get }
});