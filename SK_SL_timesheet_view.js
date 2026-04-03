/**
 *@NApiVersion 2.1
*@NScriptType Suitelet
*@author Smair papade
*@description For create script for weekly time sheet  
*/
define(["N/record", "N/ui/serverWidget", "N/search"], (record, serverWidget, search) => {
    const onRequest = (context) => {
        if (context.request.method === "GET") {
            let timeSheetId = context.request.parameters.sheetid || 386908;

            const timeSheetRecord = record.load({
                type: record.Type.TIME_SHEET,
                id: timeSheetId
            });

            let employeeName = timeSheetRecord.getText({
                fieldId: 'employee'
            });

            let employeeId = timeSheetRecord.getValue({
                fieldId: 'employee'
            });

            let weekOffDate = timeSheetRecord.getValue({
                fieldId: 'trandate'
            });

            let form = serverWidget.createForm({ title: "Weekly Timesheet" });
            form.addField({
                id: 'custpage_tsname',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            }).updateLayoutType({
                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
            }).updateBreakType({
                breakType: serverWidget.FieldBreakType.STARTROW
            }).defaultValue = '<p style="font-size:24px; color: #6f6f6f;font-weight: normal; display:inline-flex;">' + employeeName + " " + weekOffDate + '</p><br><br>';

            // form.clientScriptModulePath = "SuiteScripts/cs_weekly_time_sheet_page.js";


            form.addTab({ id: "timestab", label: "Enter Time" });
            form.addFieldGroup({ id: "custpage_primary_info", label: "Primary Information" });
            form.addFieldGroup({ id: "custpage_entertime", label: "Enter Time" });
            // Adding the field to the form
            let empFieldObj = form.addField({ id: "custpage_employee", type: serverWidget.FieldType.SELECT, label: "Employee", source: "employee", container: "custpage_primary_info" });
            empFieldObj.defaultValue = employeeId;
            empFieldObj.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });
            let dateFieldObj = form.addField({ id: "custpage_date", type: serverWidget.FieldType.DATE, label: "Date", container: "custpage_primary_info" });
            dateFieldObj.defaultValue = weekOffDate;
            // dateFieldObj.isMandatory = true;
            let subsidiary = form.addField({ id: "custpage_subsidiary", type: serverWidget.FieldType.SELECT, label: "Subsidiary", source: "subsidiary", container: "custpage_primary_info" });
            subsidiary.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE,
            });

            let subsidiaryValue = timeSheetRecord.getValue({
                fieldId: 'subsidiary'
            });

            if(subsidiaryValue > 0)
            subsidiary.defaultValue = subsidiaryValue;
            
            let weekenddate = form.addField({ id: "custpage_weekenddate", type: serverWidget.FieldType.DATE, label: "Week End Date", container: "custpage_primary_info" });
            weekenddate.defaultValue = weekOffDate;
            // let timesheetStatus = form.addField({ id: "custpage_timesheet_ststus", type: serverWidget.FieldType.SELECT, label: "Status", container: "custpage_primary_info" });
            // timesheetStatus.addSelectOption({
            //     text: "Draft",
            //     value: "1"
            // });
            // timesheetStatus.addSelectOption({
            //     text: "Submitted",
            //     value: "2"
            // });

            var taskOptions = [
                { value: '', text: '' },
                { value: '1', text: 'ST' },
                { value: '2', text: 'OT' },
                { value: '3', text: 'DT' },
                { value: '4', text: 'Sick Time' },
                { value: '5', text: 'Holiday' },
                { value: '6', text: 'Lunch Time' }
            ];

            let timeSublist = form.addSublist({
                id: "custpage_weeklytimesheet",
                type: serverWidget.SublistType.LIST,
                label: "Enter Time",
                tab: "timestab",
                container: "custpage_entertime"
            });

            // project List display
            var projectList = timeSublist.addField({ id: "custpage_project", type: serverWidget.FieldType.TEXT, label: "Project" });

            var custpage_task = timeSublist.addField({ id: "custpage_task", type: serverWidget.FieldType.TEXT, label: "Task" });

            // timeSublist.addField({id: "custpage_billable", type: serverWidget.FieldType.CHECKBOX, label: "Billable"});
            timeSublist.addField({ id: "custpage_monday", type: serverWidget.FieldType.INTEGER, label: "MON" });
            timeSublist.addField({ id: "custpage_tuesday", type: serverWidget.FieldType.INTEGER, label: "TUE" });
            timeSublist.addField({ id: "custpage_wednesday", type: serverWidget.FieldType.INTEGER, label: "WED" });
            timeSublist.addField({ id: "custpage_thursday", type: serverWidget.FieldType.INTEGER, label: "THU" });
            timeSublist.addField({ id: "custpage_friday", type: serverWidget.FieldType.INTEGER, label: "FRI" });
            timeSublist.addField({ id: "custpage_saturday", type: serverWidget.FieldType.INTEGER, label: "SAT" });
            timeSublist.addField({ id: "custpage_sunday", type: serverWidget.FieldType.INTEGER, label: "SUN" });
            const totalHours = timeSublist.addField({ id: "custpage_total", type: serverWidget.FieldType.INTEGER, label: "Total" });
            form.addSubmitButton({
                label: "Cancel"
            });

            let totlaLines = timeSheetRecord.getLineCount({
                sublistId: "timeitem"
            });

            if(totalLines >0){
                for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
                    let project = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'customer',
                        line: lineIndex
                    });

                    let task = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'casetaskevent',
                        line: lineIndex
                    });

                    let sundayHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours0',
                        line: lineIndex
                    });

                    let mondayHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours1',
                        line: lineIndex
                    });

                    let tueHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours2',
                        line: lineIndex
                    });

                    let wedHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours3',
                        line: lineIndex
                    });

                    let thrHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours4',
                        line: lineIndex
                    });

                    let friHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours5',
                        line: lineIndex
                    });

                    let satHours = timeSheetRecord.getSublistValue({
                        sublistId: 'timeitem',
                        fieldId: 'hours6',
                        line: lineIndex
                    });

                    
                    
                }
            }
            context.response.writePage(form);
        } else if (context.request.method === "POST") {
            // Process form submission
            let empId = context.request.parameters.custpage_employee;
            let date = context.request.parameters.custpage_date;
            let weekEndDate = context.request.parameters.custpage_weekenddate;
            let subsidiary = context.request.parameters.custpage_subsidiary;
            let status = context.request.parameters.custpage_timesheet_ststus;

            var totalLines = context.request.getLineCount({
                group: "custpage_weeklytimesheet",
            });
            const itemsList = [];
            for (let index = 0; index < totalLines; index++) {
                let project = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_project",
                    line: index,
                });
                let task = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_task",
                    line: index,
                });
                let custpage_monday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_monday",
                    line: index,
                });
                let custpage_tuesday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_tuesday",
                    line: index,
                });
                let custpage_wednesday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_wednesday",
                    line: index,
                });
                let custpage_thursday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_thursday",
                    line: index,
                });
                let custpage_friday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_friday",
                    line: index,
                });
                let custpage_saturday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_saturday",
                    line: index,
                });
                let custpage_sunday = context.request.getSublistValue({
                    group: "custpage_weeklytimesheet",
                    name: "custpage_sunday",
                    line: index,
                });
                itemsList.push({
                    project: project > 0 ? project : 0,
                    task: task ? task : "",
                    custpage_monday: qtcustpage_mondayy > 0 ? custpage_monday : 0,
                    custpage_tuesday: custpage_tuesday > 0 ? custpage_tuesday : 0,
                    custpage_wednesday: custpage_wednesday > 0 ? custpage_wednesday : 0,
                    custpage_thursday: custpage_thursday > 0 ? custpage_thursday : 0,
                    custpage_friday: custpage_friday > 0 ? custpage_friday : 0,
                    custpage_saturday: custpage_saturday > 0 ? custpage_saturday : 0,
                    custpage_sunday: custpage_sunday > 0 ? custpage_sunday : 0,
                });
            }
            try {
                var newRecord = record.create({
                    type: record.Type.timesheet,
                    isDynamic: true,
                });
                if (empId > 0) {
                    newRecord.setValue({
                        fieldId: "custpage_employee",
                        value: empId,
                    });
                }

                if (weekEndDate > 0) {
                    newRecord.setValue({
                        fieldId: "custrecord_weekenddate_",
                        value: weekEndDate,
                    });
                }

                if (date > 0) {
                    newRecord.setValue({
                        fieldId: "custpage_date",
                        value: date,
                    });
                }
                if (subsidiary > 0) {
                    newRecord.setValue({
                        fieldId: "subsidiary",
                        value: subsidiary,
                    });
                }
                if (status > 0) {
                    newRecord.setValue({
                        fieldId: "custrecord_timeheetstatus_",
                        value: status,
                    });
                }

                itemsList.forEach((obj) => {
                    newRecord.selectNewLine({ sublistId: "custpage_weeklytimesheet" });

                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "project",
                        value: obj.project,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "project",
                        value: obj.custpage_task,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_monday,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_thursday,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_wednesday,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_thursday,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_friday,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_saturday,
                    });
                    newRecord.setCurrentSublistValue({
                        sublistId: "custpage_weeklytimesheet",
                        fieldId: "monday",
                        value: obj.custpage_sunday,
                    });
                    newRecord.commitLine({ sublistId: "custpage_weeklytimesheet" });

                });

                var recordId = newRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true,
                });


            } catch (error) {
                context.response.writePage(renderErrorScreen(error.name, error.message));
            }
        }
    };

    return {
        onRequest: onRequest,
    };
});