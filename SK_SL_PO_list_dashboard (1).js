/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @author Sagar Kumar
 * @description show the employee information with transactions (PO) list that he created where he can view and edit and save the edit list.
 */

var PAGE_SIZE = 50;
var SEARCH_ID = 'customsearch225';
var CLIENT_SCRIPT_FILE_ID = 5345;
define(["N/record", "N/search", "N/ui/serverWidget", "N/runtime"], function (
    record,
    search,
    serverWidget,
    runtime
) {

    function getInformation(empId, columnsList) {
        var columnFields = [];
        const employeeData = {};
        for (let index = 0; index < columnsList.length; index++) {
            columnFields.push(search.createColumn({ name: columnsList[index] }));
        }

        var employeeSearchObj = search.create({
            type: "employee",
            filters:
                [["internalid", "anyof", empId]
                ],
            columns: columnFields
        });
        var searchResultCount = employeeSearchObj.runPaged().count;
        log.debug("employeeSearchObj result count", searchResultCount);
        employeeSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            columnsList.forEach(element => {
                if (element == 'location') {
                    employeeData[element] = result.getText(element);
                } else {
                    employeeData[element] = result.getValue(element);
                }

            });
            return true;
        });

        return employeeData;
    }

    function test() {
        var purchaseorderSearchObj = search.create({
            type: "purchaseorder",
            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            filters:
                [["type", "anyof", "PurchOrd"], "AND", ["employee", "anyof", empid]
                ],
            columns:
                [search.createColumn({ name: "tranid", label: "Document Number" }), search.createColumn({ name: "trandate", label: "Date" }), search.createColumn({ name: "entity", label: "Name" }), search.createColumn({ name: "duedate", label: "Due Date/Receive By" }), search.createColumn({ name: "amount", label: "Amount" })
                ]
        });
        var searchResultCount = purchaseorderSearchObj.runPaged().count;
        log.debug("purchaseorderSearchObj result count", searchResultCount);
        purchaseorderSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            return true;
        });

        /*
        purchaseorderSearchObj.id="customsearch1719923691827";
        purchaseorderSearchObj.title="Custom Transaction Search 2 PO -sk (copy)";
        var newSearchId = purchaseorderSearchObj.save();
        */
    }



    function onRequest(context) {
        if (context.request.method === "GET") {
            var employeeId = context.request.parameters.employeeId || 278051;
            const employeeData = getInformation(employeeId, ["entityid", "email", "department", "location", "supervisor"]);

            log.debug(`employeeDate`, employeeData);

            // Create a form
            var form = serverWidget.createForm({
                title: "PO Dashboard",
                hideNavBar: true,
            });

            form.clientScriptModulePath =
                "SuiteScripts/SK_CS_handle_Po_authentication.js";

            // Add Group to form.
            form.addFieldGroup({
                id: "custpage_user_info",
                label: "User Information",
            });

            let employeeField = form.addField({
                id: "employee",
                container: "custpage_user_info",
                type: serverWidget.FieldType.SELECT,
                source: "employee",
                label: "Employee",
            });

            employeeField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            employeeField.defaultValue = employeeId;

            let employeeEmailField = form.addField({
                id: "email",
                container: "custpage_user_info",
                type: serverWidget.FieldType.TEXT,
                label: "Email",
            });

            employeeEmailField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            employeeEmailField.defaultValue = employeeData.email;

            let employeeDepField = form.addField({
                id: "department",
                container: "custpage_user_info",
                type: serverWidget.FieldType.TEXT,
                label: "Department",
            });

            employeeDepField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            employeeDepField.defaultValue = employeeData.department;

            let employeeLocationField = form.addField({
                id: "location",
                container: "custpage_user_info",
                type: serverWidget.FieldType.TEXT,
                label: "Location",
            });

            employeeLocationField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            employeeLocationField.defaultValue = employeeData.location;

            let employeeSupervisorField = form.addField({
                id: "supervisor",
                container: "custpage_user_info",
                type: serverWidget.FieldType.SELECT,
                source: "employee",
                label: "Supervisor",
            });

            employeeSupervisorField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            employeeSupervisorField.defaultValue = employeeData.supervisor;

            form.addTab({
                id: "itemtab",
                label: "Items"
            });

            // Add a sublist to display records
            var sublist = form.addSublist({
                id: "custpage_record_sublist",
                type: serverWidget.SublistType.LIST,
                label: "Purchase Orders List",
                tab: "itemtab"
            });

            // Define columns for the sublist
            sublist.addField({
                id: "view",
                type: serverWidget.FieldType.TEXT,
                label: "View",
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED,
            });
            sublist
                .addField({
                    id: "edit", type: serverWidget.FieldType.TEXT, label: "Edit",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });

            sublist
                .addField({
                    id: "tranid", type: serverWidget.FieldType.TEXT, label: "document Number",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });

            sublist
                .addField({
                    id: "trandate", type: serverWidget.FieldType.TEXT, label: "Date",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });

            sublist
                .addField({
                    id: "entity", type: serverWidget.FieldType.TEXT, label: "Vendor",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });

            sublist
                .addField({
                    id: "duedate", type: serverWidget.FieldType.TEXT, label: "Due Date",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });
            sublist
                .addField({
                    id: "status", type: serverWidget.FieldType.TEXT, label: "Status",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });

            sublist
                .addField({
                    id: "amount", type: serverWidget.FieldType.CURRENCY, label: "Amount",
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED,
                });


            // Define pagination parameters
            var pageSize = 50;
            var currentPage = context.request.parameters.page || 1;
            var offset = (currentPage - 1) * pageSize;

            //get purchase order details.
            var customRecordSearch = search.create({
                type: "purchaseorder",
                filters: [["type", "anyof", "PurchOrd"], "AND", ["employee", "anyof", employeeId], "AND", ["mainline", "is", "T"]],
                columns: [search.createColumn({ name: "internalid" }), search.createColumn({ name: "tranid" }), search.createColumn({ name: "trandate" }), search.createColumn({ name: "entity" }), search.createColumn({ name: "duedate" }), search.createColumn({ name: "creditfxamount" }), search.createColumn({ name: "statusref" })]
            });

            // Run the search
            var pagedSearch = customRecordSearch.run();
            var records = pagedSearch.getRange({ start: offset, end: pageSize });

            log.debug({
                title: "records",
                details: records
            })

            // var lineIndex = 0;
            records.forEach(function (result, lineIndex) {

                let id = result.getValue({ name: "internalid" });
                let docNumber = result.getValue({ name: "tranid" });
                let tranDate = result.getValue({ name: "trandate" });
                let vendor = result.getText({ name: "entity" });
                let dueDate = result.getValue({ name: "duedate" });
                let amount = result.getValue({ name: "creditfxamount" });
                let status = result.getValue({ name: "statusref" });

                log.debug(`id ${id} , doucment nubmer: ${docNumber}, trandate: ${tranDate}, vendor ${vendor}, dueDate: ${dueDate}, amount ${amount}`)

                log.debug(result.getValue("internalid"), lineIndex);

                if (id > 0) {
                    sublist.setSublistValue({
                        id: "internalid", line: lineIndex, value: id,
                    });
                }

                if (docNumber)
                    sublist.setSublistValue({
                        id: "tranid", line: lineIndex, value: docNumber,
                    });

                if (tranDate)
                    sublist.setSublistValue({
                        id: "trandate", line: lineIndex, value: tranDate,
                    });

                if (vendor)
                    sublist.setSublistValue({
                        id: "entity", line: lineIndex, value: vendor,
                    });

                if (dueDate)
                    sublist.setSublistValue({
                        id: "duedate", line: lineIndex, value: dueDate,
                    });

                if (status)
                    sublist.setSublistValue({
                        id: "status", line: lineIndex, value: status,
                    });

                if (amount)
                    sublist.setSublistValue({
                        id: "amount", line: lineIndex, value: Math.abs(amount),
                    });
            });

            context.response.writePage(form);
        }
    }

    return {
        onRequest: onRequest,
    };
});
