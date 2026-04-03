/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(["N/record", "N/search", "N/ui/serverWidget", "N/runtime"], function (
  record,
  search,
  serverWidget,
  runtime
) {
  function onRequest(context) {
    if (context.request.method === "GET") {
      var startDate = context.request.parameters.start_date;
      var endDate = context.request.parameters.end_date;

      log.debug("startDate", startDate);
      log.debug("endDate", endDate);

      // Create a form
      var form = serverWidget.createForm({
        title: "Payment Advice Result",
      });

      var startDateField = form.addField({
        id: "custpage_mark",
        label: "Start Date",
        type: serverWidget.FieldType.TEXT,
      });

      var startDateField = form.addField({
        id: "custpage_start_date",
        label: "Start Date",
        type: serverWidget.FieldType.TEXT,
      });

      var endDateField = form.addField({
        id: "custpage_end_date",
        label: "End Date",
        type: serverWidget.FieldType.TEXT,
      });

      startDateField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

      endDateField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

      startDateField.defaultValue = startDate;
      endDateField.defaultValue = endDate;

      // Add a sublist to display records
      var sublist = form.addSublist({
        id: "custpage_record_sublist",
        type: serverWidget.SublistType.LIST,
        label: "Bill Payment",
      });

      // Define columns for the sublist
      sublist
      .addField({
        id: "internalid",
        type: serverWidget.FieldType,
        label: "Id",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

      sublist
        .addField({
          id: "internalid",
          type: serverWidget.FieldType.TEXT,
          label: "Id",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      sublist
        .addField({
          id: "type",
          type: serverWidget.FieldType.TEXT,
          label: "Type",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      sublist
        .addField({
          id: "datecreated",
          type: serverWidget.FieldType.TEXT,
          label: "Date",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      sublist
        .addField({
          id: "entity",
          type: serverWidget.FieldType.TEXT,
          label: "Vendor",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      sublist
        .addField({
          id: "amount",
          type: serverWidget.FieldType.CURRENCY,
          label: "Amount",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      sublist
        .addField({
          id: "subsidiary",
          type: serverWidget.FieldType.TEXT,
          label: "Subsidiary",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      sublist
        .addField({
          id: "custbody_payment_advice_flag",
          type: serverWidget.FieldType.CHECKBOX,
          label: "Payment Advice Flag",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

      // // Define pagination parameters
      var pageSize = 50;
      var currentPage = context.request.parameters.page || 1;
      var offset = (currentPage - 1) * pageSize;

      // Create a search to retrieve records (replace 'your_custom_record_id' with your custom record's internal ID)
      var customRecordSearch = search.create({
        type: "vendorpayment",
        filters: [
          ["custbody_payment_advice_flag", "is", "T"],
          "AND",
          ["type", "anyof", "VendPymt"],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["trandate", "within", startDate, endDate],
          //   ["trandate", "within", "01/03/2023", "30/09/2023"],
          "AND",
          ["systemnotes.date", "within", "today"],
        ],
        columns: [
          search.createColumn({ name: "internalid", label: "Internal ID" }),
          search.createColumn({ name: "type", label: "Type" }),
          search.createColumn({ name: "datecreated", label: "Date Created" }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({ name: "amount", label: "Amount" }),
          search.createColumn({ name: "subsidiary", label: "Subsidiary" }),
          search.createColumn({
            name: "custbody_payment_advice_flag",
            label: "Payment Advice Flag",
          }),
        ],
      });

      // log.debug("offset: " + offset, "pageSize" + pageSize);

      // Run the search
      var pagedSearch = customRecordSearch.run();
      var records = pagedSearch.getRange({ start: offset, end: pageSize });

      //   log.debug("record", records);

      // var lineIndex = 0;
      records.forEach(function (result, lineIndex) {
        // log.debug(result.getValue("internalid"));

        sublist.setSublistValue({
          id: "internalid",
          line: lineIndex,
          value: result.getValue({ name: "internalid" }),
        });

        // log.debug("lineIndex"+ lineIndex, result.getValue({ name: "internalid" }));

        sublist.setSublistValue({
          id: "type",
          line: lineIndex,
          value: result.getValue({ name: "type" }),
        });

        sublist.setSublistValue({
          id: "datecreated",
          line: lineIndex,
          value: new Date(result.getValue({ name: "datecreated" })),
        });
        sublist.setSublistValue({
          id: "entity",
          line: lineIndex,
          value: result.getText({ name: "entity" }),
        });
        sublist.setSublistValue({
          id: "amount",
          line: lineIndex,
          value: Math.abs(result.getValue({ name: "amount" })),
        });
        sublist.setSublistValue({
          id: "subsidiary",
          line: lineIndex,
          value: result.getText({ name: "subsidiary" }),
        });
        sublist.setSublistValue({
          id: "custbody_payment_advice_flag",
          line: lineIndex,
          value: "T",
        });
      });

      // Add pagination links
      // log.debug("offset", offset);
      // if (offset > 0) {
      //     form.addButton({
      //     id: "custpage_prev_button",
      //     label: "Previous",
      //     functionName: "goToPage(" + (currentPage - 1) + ")",
      //     });
      // }

      // log.debug("records.length: "+ records.length+ " pageSize : "+pageSize+ "pagedSearch.count :"+ pagedSearch.count);

      // if (records.length * pageSize < pagedSearch.count) {
      //     form.addButton({
      //     id: "custpage_next_button",
      //     label: "Next",
      //     functionName: "goToPage(" + (currentPage + 1) + ")",
      //     });
      // }

      // form.clientScriptModulePath = "./amg_CS_pay_adv_renderPages.js";

      context.response.writePage(form);
    }
  }

  return {
    onRequest: onRequest,
  };
});
