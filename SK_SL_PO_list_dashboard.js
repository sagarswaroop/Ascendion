/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @author Sagar Kumar
 * @description show the employee information with transactions (PO) list that he created where he can view and edit and save the edit list.
 */

var PAGE_SIZE = 5;
define(["N/record", "N/search", "N/ui/serverWidget", "N/runtime", "N/redirect", "N/url"], function (
    record,
    search,
    serverWidget,
    runtime,
    redirect,
    url

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

    function getViewUrl(paramters) {
        return url.resolveScript({
            deploymentId: 'customdeploy_asc_po_view_page',
            scriptId: 'customscript_asc_po_view_page',
            params: paramters,
            returnExternalUrl: true
        })
    }

    function getEditUrl(paramters) {
        return url.resolveScript({
            deploymentId: 'customdeploy_asd_view_edit_page',
            scriptId: 'customscript_asd_view_edit_page',
            params: paramters,
            returnExternalUrl: true
        })
    }

    function returnLoginPage() {
        log.debug("return to login page...");
        redirect.toSuitelet({
            scriptId: "customscript_asd_po_authenticate_page",
            deploymentId: "customdeploy_asd_po_authenticate_page",
            isExternal: true,
            parameters: { success: false },
        });
    }


    function onRequest(context) {
        if (context.request.method === "GET") {
            // Get parameters
            var pageId = parseInt(context.request.parameters.page) || 1;
            var scriptId = context.request.parameters.script;
            var deploymentId = context.request.parameters.deploy;
            const STATUS = {};
            var employeeId = context.request.parameters.employeeId || 278051;
            const employeeData = getInformation(employeeId, ["entityid", "email", "department", "location", "supervisor"]);
            // Create a form
            var form = serverWidget.createForm({
                title: "Welcome Procurement Dashboard",
                hideNavBar: true,
            });

            form.clientScriptModulePath =
                "SuiteScripts/SK_CS_PO_dashboard_handler.js";

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
                type: serverWidget.FieldType.SELECT,
                source: 'department',
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

            sublist.addButton({
                id: 'custpage_create_new',
                label: 'Create New Purchase Order',
                functionName: 'createNew()'
            });

            let viewEditList = sublist.addField({
                id: "view",
                type: serverWidget.FieldType.TEXT,
                label: "View",
            })

            viewEditList.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let sublistEdit = sublist
                .addField({
                    id: "edit", type: serverWidget.FieldType.TEXT, label: "Edit",
                });

            sublistEdit.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
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

            //get purchase order details.
            var customRecordSearch = search.create({
                type: "purchaseorder",
                filters: [["type", "anyof", "PurchOrd"], "AND", ["employee", "anyof", employeeId], "AND", ["mainline", "is", "T"]],
                columns: [search.createColumn({ name: "internalid" }), search.createColumn({ name: "tranid" }), search.createColumn({ name: "trandate" }), search.createColumn({ name: "entity" }), search.createColumn({ name: "duedate" }), search.createColumn({ name: "creditfxamount" }), search.createColumn({ name: "statusref" })]
            });

            var pageCount = Math.ceil(customRecordSearch.runPaged().count / PAGE_SIZE);

            // Add buttons to simulate Next & Previous
            if (pageId > 1) {
                sublist.addButton({
                    id: 'custpage_previous',
                    label: 'Previous Page',
                    functionName: 'getSuiteletPage(' + scriptId + ', ' + deploymentId + ', ' + (pageId - 1) + ')'
                });
            }

            if (pageId != pageCount) {
                sublist.addButton({
                    id: 'custpage_next',
                    label: 'Next Page',
                    functionName: 'getSuiteletPage(' + scriptId + ', ' + deploymentId + ', ' + (pageId + 1) + ')'
                });
            }

            // Run the search
            var offset = Math.abs((pageId - 1) * PAGE_SIZE);
            var pagedSearch = customRecordSearch.run();
            var records = pagedSearch.getRange({ start: offset, end: offset + PAGE_SIZE });

            // var lineIndex = 0;
            records.forEach(function (result, lineIndex) {
                let id = result.getValue({ name: "internalid" });
                let docNumber = result.getValue({ name: "tranid" });
                let tranDate = result.getValue({ name: "trandate" });
                let vendor = result.getText({ name: "entity" });
                let dueDate = result.getValue({ name: "duedate" });
                let amount = result.getValue({ name: "creditfxamount" });
                let status = result.getValue({ name: "statusref" });

                let viewUrl = getViewUrl({ purchaseid: id });

                let editUrl = getEditUrl({ purchaseid: id });

                if (status == 'fullyBilled') {
                    sublist.setSublistValue({
                        id: "view", line: lineIndex, value: '<a href="' + viewUrl + '" target="_self">View</a>'
                    });
                } else {
                    sublist.setSublistValue({
                        id: "view", line: lineIndex, value: '<a href="' + viewUrl + '" target="_self">View</a>'
                    });
                    sublist.setSublistValue({
                        id: "edit", line: lineIndex, value: '<a href="' + editUrl + '" target="_self">Edit</a>'
                    });
                }

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

            form.addSubmitButton({
                label: "Log Out"
            });

            context.response.writePage(form);
        } else {
            redirect.toSuitelet({
                scriptId: "customscript_asd_po_authenticate_page",
                deploymentId: "customdeploy_asd_po_authenticate_page",
                // isExternal: true
            });
        }
    }

    return {
        onRequest: onRequest,
    };
});
