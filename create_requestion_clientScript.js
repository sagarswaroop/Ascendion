/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', 'N/search'], function (record, search) {
    function fieldChanged(context) {
        debugger
        var currentRecord = context.currentRecord;

        if (context.fieldId === 'custpage_entity') {
            var employeeId = currentRecord.getValue({
                fieldId: 'custpage_entity'
            });

            if (employeeId) {
                var employeeRecord = record.load({
                    type: record.Type.EMPLOYEE,
                    id: employeeId
                });

                var subsidiaryId = employeeRecord.getValue({
                    fieldId: 'subsidiary'
                });

                currentRecord.setValue({
                    fieldId: 'custpage_subsidiary',
                    value: subsidiaryId
                });
            }
        } else if (context.fieldId === 'custpage_item' || context.fieldId === 'custpage_quantity' || context.fieldId === 'custpage_rate') {
            var itemId = currentRecord.getCurrentSublistValue({
                sublistId: 'custpage_items',
                fieldId: 'custpage_item'
            });

            var quantity = currentRecord.getCurrentSublistValue({
                sublistId: 'custpage_items',
                fieldId: 'custpage_quantity'
            });

            var rate = currentRecord.getCurrentSublistValue({
                sublistId: 'custpage_items',
                fieldId: 'custpage_rate'
            });

            if (itemId && (context.fieldId === 'custpage_item' || context.fieldId === 'custpage_quantity')) {
                var itemRecord = search.lookupFields({
                    type: "item",
                    id: itemId,
                    columns: ['baseprice', 'department']
                })

                rate = itemRecord.baseprice ? itemRecord.baseprice : 0;
                department = itemRecord.department[0].value
                currentRecord.setCurrentSublistValue({
                    sublistId: 'custpage_items',
                    fieldId: 'custpage_rate',
                    value: parseFloat(rate)
                });
                currentRecord.setCurrentSublistValue({
                    sublistId: 'custpage_items',
                    fieldId: 'custpage_line_department',
                    value: department
                });
            }

            if (quantity && rate) {
                var amount = rate * quantity;

                currentRecord.setCurrentSublistValue({
                    sublistId: 'custpage_items',
                    fieldId: 'custpage_amount',
                    value: amount
                });
            }
        }
    }

    return {
        fieldChanged: fieldChanged
    };
});
