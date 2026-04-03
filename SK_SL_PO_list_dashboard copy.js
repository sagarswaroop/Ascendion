/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @author Sagar Kumar
 * @description show the employee information with transactions (PO) list that he created where he can view and edit and save the edit list.
 */

var PAGE_SIZE = 5;
define(["N/record", "N/search", "N/ui/serverWidget", "N/runtime", "N/redirect", "N/url", "N/query", "N/https"], function (
    record,
    search,
    serverWidget,
    runtime,
    redirect,
    url,
    query,
    https

) {

    function getInformation(empId, columnsList) {
        log.debug("emp:"+empId, columnsList);
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

    function getListData(recordType, employeeId) {
        var redirectSL = url.resolveScript({
            scriptId: 'customscript_proc_protal_data_hadler',
            deploymentId: 'customdeploy_proc_protal_data_hadler',
            params: { type: recordType, employee: employeeId },
            returnExternalUrl: true
        });
        var response = https.post({
            url: redirectSL
        });

        log.debug('response - ', response.body);

        return JSON.parse(response.body);

    }

    function getViewUrl(deployId, scriptId, parameters) {
        return url.resolveScript({
            deploymentId: deployId,
            scriptId: scriptId,
            params: parameters,
            // returnExternalUrl: true
        })
    }

    function getEditUrl(parameters) {
        return url.resolveScript({
            deploymentId: 'customdeploy_asd_view_edit_page',
            scriptId: 'customscript_asd_view_edit_page',
            params: parameters,
            returnExternalUrl: true
        })
    }

    function onRequest(context) {
        var scriptId = context.request.parameters.script;
        var deploymentId = context.request.parameters.deploy;

        if (context.request.method === "GET") {

            try {
                const employeeId = context.request.parameters.employeeid || 278051;

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

                /****************Purchase Requisition Code: Start *************************************/

                form.addTab({
                    id: "pr_tab",
                    label: "Purchase Requisitions"
                });

                // Add a sublist to display records
                var prList = form.addSublist({
                    id: "custpage_pr_sublist",
                    type: serverWidget.SublistType.LIST,
                    label: "Purchase Requisitions",
                    tab: "pr_tab"
                });

                prList.addButton({
                    id: 'custpage_create_new',
                    label: 'Create New Requisition',
                    functionName: 'createNew()'
                });

                let prViewField = prList.addField({
                    id: "view",
                    type: serverWidget.FieldType.TEXT,
                    label: "View",
                })

                prViewField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                let prEditField = prList.addField({
                    id: "edit", type: serverWidget.FieldType.TEXT, label: "Edit",
                });

                prEditField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                prList.addField({
                    id: "tranid", type: serverWidget.FieldType.TEXT, label: "document Number",
                })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                prList.addField({
                    id: "trandate", type: serverWidget.FieldType.TEXT, label: "Date",
                })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                prList.addField({
                    id: "department", type: serverWidget.FieldType.TEXT, label: "Department",
                })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                // prList.addField({
                //         id: "duedate", type: serverWidget.FieldType.TEXT, label: "Due Date",
                //     })
                //     .updateDisplayType({
                //         displayType: serverWidget.FieldDisplayType.DISABLED,
                //     });
                prList.addField({
                    id: "location", type: serverWidget.FieldType.TEXT, label: "Location",
                })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                prList.addField({
                    id: "amount", type: serverWidget.FieldType.CURRENCY, label: "Amount",
                })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                const prListArray = getListData(record.Type.PURCHASE_REQUISITION, employeeId);

                // log.debug("prListArray: ", prListArray);

                if (prListArray.length > 0) {
                    prListArray.forEach(function (result, lineIndex) {
                        // log.debug("result", result);

                        let id = result.id;
                        let docNumber = result.docNumber;
                        let tranDate = result.tranDate;
                        let department = result.department;
                        let location = result.location;
                        let amount = result.amount;

                        let viewUrl = getViewUrl("customdeploy_asc_pr_view_page", "customscriptasc_pr_view_page", { requisitionid: id });
                        // let editUrl = getEditUrl("deploy","script",{ purchaseid: id });

                        prList.setSublistValue({
                            id: "view", line: lineIndex, value: '<a href="' + viewUrl + '" target="_self">View</a>'
                        });

                        // prList.setSublistValue({
                        //     id: "edit", line: lineIndex, value: '<a href="' + editUrl + '" target="_self">Edit</a>'
                        // });

                        if (id > 0) {
                            prList.setSublistValue({
                                id: "internalid", line: lineIndex, value: id,
                            });
                        }

                        if (docNumber)
                            prList.setSublistValue({
                                id: "tranid", line: lineIndex, value: docNumber,
                            });

                        if (tranDate)
                            prList.setSublistValue({
                                id: "trandate", line: lineIndex, value: tranDate,
                            });

                        if (department)
                            prList.setSublistValue({
                                id: "department", line: lineIndex, value: department,
                            });

                        // if (dueDate)
                        //     prList.setSublistValue({
                        //         id: "duedate", line: lineIndex, value: dueDate,
                        //     });

                        if (location)
                            prList.setSublistValue({
                                id: "location", line: lineIndex, value: location,
                            });

                        if (amount)
                            prList.setSublistValue({
                                id: "amount", line: lineIndex, value: Math.abs(amount),
                            });
                    });
                }


                /**************** PO list code : START**********************************************/

                form.addTab({
                    id: "po_tab",
                    label: "Purchase Orders"
                });

                // Add a sub-list to display records
                var poList = form.addSublist({
                    id: "custpage_po_list",
                    type: serverWidget.SublistType.LIST,
                    label: "Purchase Orders",
                    tab: "po_tab"
                });

                let poViewField = poList.addField({
                    id: "view",
                    type: serverWidget.FieldType.TEXT,
                    label: "View",
                })

                poViewField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                poList
                    .addField({
                        id: "tranid", type: serverWidget.FieldType.TEXT, label: "document Number",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                poList
                    .addField({
                        id: "trandate", type: serverWidget.FieldType.TEXT, label: "Date",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                poList
                    .addField({
                        id: "entity", type: serverWidget.FieldType.TEXT, label: "Vendor",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                poList
                    .addField({
                        id: "duedate", type: serverWidget.FieldType.TEXT, label: "Due Date",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });
                poList
                    .addField({
                        id: "status", type: serverWidget.FieldType.TEXT, label: "Status",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                poList
                    .addField({
                        id: "amount", type: serverWidget.FieldType.CURRENCY, label: "Amount",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                let poListArr = getListData(record.Type.PURCHASE_ORDER, employeeId);
                if (poListArr.length > 0) {
                    poListArr.forEach(function (result, lineIndex) {
                        // log.debug("result", result);

                        let id = result.id;
                        let docNumber = result.docNumber;
                        let tranDate = result.tranDate;
                        let vendor = result.vendor;
                        let dueDate = result.dueDate;
                        let amount = result.amount;
                        let status = result.status;

                        let viewUrl = getViewUrl('customdeploy_asc_po_view_page', 'customscript_asc_po_view_page', { purchaseid: id });

                        poList.setSublistValue({
                            id: "view", line: lineIndex, value: '<a href="' + viewUrl + '" target="_self">View</a>'
                        });

                        if (id > 0) {
                            poList.setSublistValue({
                                id: "internalid", line: lineIndex, value: id,
                            });
                        }

                        if (docNumber)
                            poList.setSublistValue({
                                id: "tranid", line: lineIndex, value: docNumber,
                            });

                        if (tranDate)
                            poList.setSublistValue({
                                id: "trandate", line: lineIndex, value: tranDate,
                            });

                        if (vendor)
                            poList.setSublistValue({
                                id: "entity", line: lineIndex, value: vendor,
                            });

                        if (dueDate)
                            poList.setSublistValue({
                                id: "duedate", line: lineIndex, value: dueDate,
                            });

                        if (status)
                            poList.setSublistValue({
                                id: "status", line: lineIndex, value: status,
                            });

                        if (amount)
                            poList.setSublistValue({
                                id: "amount", line: lineIndex, value: Math.abs(amount),
                            });
                    });
                }

                /****************Purchase Order List Code: End ******************************************* */

                /**************** Item Receipt list code : START**********************************************/

                form.addTab({
                    id: "item_receipt_tab",
                    label: "Item Receipt"
                });

                // Add a sub-list to display records
                var itemReceiptList = form.addSublist({
                    id: "custpage_ir_sublist",
                    type: serverWidget.SublistType.LIST,
                    label: "Item Receipt",
                    tab: "item_receipt_tab"
                });

                let IRViewField = itemReceiptList.addField({
                    id: "view",
                    type: serverWidget.FieldType.TEXT,
                    label: "View",
                })

                IRViewField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE,
                });

                itemReceiptList
                    .addField({
                        id: "tranid", type: serverWidget.FieldType.TEXT, label: "document Number",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                itemReceiptList
                    .addField({
                        id: "trandate", type: serverWidget.FieldType.TEXT, label: "Date",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                itemReceiptList
                    .addField({
                        id: "entity", type: serverWidget.FieldType.TEXT, label: "Vendor",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                // itemReceiptList
                //     .addField({
                //         id: "duedate", type: serverWidget.FieldType.TEXT, label: "Due Date",
                //     })
                //     .updateDisplayType({
                //         displayType: serverWidget.FieldDisplayType.DISABLED,
                //     });
                itemReceiptList
                    .addField({
                        id: "memo", type: serverWidget.FieldType.TEXT, label: "Memo",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                itemReceiptList
                    .addField({
                        id: "amount", type: serverWidget.FieldType.CURRENCY, label: "Amount",
                    })
                    .updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED,
                    });

                let itemReceiptListArr = getListData(record.Type.ITEM_RECEIPT, employeeId);
                if (itemReceiptListArr.length > 0) {
                    itemReceiptListArr.forEach(function (result, lineIndex) {
                        // log.debug("result", result);

                        let id = result.id;
                        let docNumber = result.docNumber;
                        let tranDate = result.tranDate;
                        let vendor = result.entity;
                        // let dueDate = result.dueDate;
                        let amount = result.amount;
                        let memo = result.memo;

                        let viewUrl = getViewUrl('customdeploy_asc_pro_portal_ir_view_page', 'customscript_asc_pro_portal_ir_view_page', { itemreceiptid: id });

                        itemReceiptList.setSublistValue({
                            id: "view", line: lineIndex, value: '<a href="' + viewUrl + '" target="_self">View</a>'
                        });

                        if (id > 0) {
                            itemReceiptList.setSublistValue({
                                id: "internalid", line: lineIndex, value: id,
                            });
                        }

                        if (docNumber)
                            itemReceiptList.setSublistValue({
                                id: "tranid", line: lineIndex, value: docNumber,
                            });

                        if (tranDate)
                            itemReceiptList.setSublistValue({
                                id: "trandate", line: lineIndex, value: tranDate,
                            });

                        if (vendor)
                            itemReceiptList.setSublistValue({
                                id: "entity", line: lineIndex, value: vendor,
                            });

                        // if (dueDate)
                        //     itemReceiptList.setSublistValue({
                        //         id: "duedate", line: lineIndex, value: dueDate,
                        //     });

                        if (memo)
                            itemReceiptList.setSublistValue({
                                id: "memo", line: lineIndex, value: memo,
                            });

                        if (amount)
                            itemReceiptList.setSublistValue({
                                id: "amount", line: lineIndex, value: Math.abs(amount),
                            });
                    });
                }

                form.addSubmitButton({
                    label: "Log Out"
                });

                context.response.writePage(form);

            } catch (error) {
                log.error({
                    title: "Dashboard: Error",
                    details: error
                });
            }

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
