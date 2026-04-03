/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/query", "N/runtime", "N/record"], (query, runtime, record) => {
    const getInputData = (inputContext) => {
        try
        {
            let scriptObj = runtime.getCurrentScript();
            let dataObj = scriptObj.getParameter({name: "custscript_ts_data"});
            dataObj = JSON.parse(dataObj);
            let fromProject = dataObj.fromProject;
            let toProject = dataObj.toProject;
            let resource = dataObj.resource;
            let fromDate = dataObj.fromDate;
            let toDate = dataObj.toDate;
            let timesheetArr = getTimesheets(fromProject, resource, fromDate, toDate, toProject);
            log.debug({title: "timesheetArr", details: timesheetArr});
            return timesheetArr;
        }
        catch(ex)
        {
            log.error({title: "Get Input Data", details: ex});
        }
    };
    const map = (mapContext) => {
        try
        {
            let dataObj = JSON.parse(mapContext.value);
            log.debug({title: "mapContext dataObj", details: dataObj});
            mapContext.write({
                key: dataObj.toProject+"_"+dataObj.fromProject,
                value: {"id": dataObj.id, "task": dataObj.task, "item": dataObj.item}
            });
        }
        catch(ex)
        {
            log.error({title: "Map", details: ex});
        }
    };
    const reduce = (reduceContext) => {
        try
        {
            let projId = reduceContext.key
            let toProject = projId.split("_")[0];
            let fromProject = projId.split("_")[1];
            let tsArray = reduceContext.values;
            log.debug({title: toProject +" : "+ fromProject, details: tsArray});
            let updateTSArr = moveTimesheets(toProject, fromProject, tsArray);
            log.debug({title: "updateTSArr", details: updateTSArr});
        }
        catch(ex)
        {
            log.error({title: "Reduce", details: ex});
        }
    };
    const summarize = (summaryContext) => {
        try
        {

        }
        catch(ex)
        {
            log.error({title: "Summarize", details: ex});
        }
    };
    const getTimesheets = (fromProject, resource, fromDate, toDate, toProject) => {
        try
        {
            let timesheetArr = [];
            let suiteQL = "SELECT tb.id,pt.title AS task,tb.item FROM timebill tb JOIN projectTask pt ON tb.casetaskevent=pt.id  WHERE customer='"+fromProject+"' AND employee='"+resource+"' AND trandate BETWEEN '"+fromDate+"' AND '"+toDate+"' AND custcol_asc_timesheet_status IN('1','2','6')";
            let response = query.runSuiteQL(suiteQL);
            if(response.results.length > 0)
            {
                for(let i = 0; i < response.results.length ; i++)
                {
                    timesheetArr.push({"id": response.results[i].values[0],"task": response.results[i].values[1],"item": response.results[i].values[2], "fromProject": fromProject, "toProject": toProject, "resource": resource});
                }
            }
            return timesheetArr;
        }
        catch(ex)
        {
            log.error({title: "Get Timesheets", details: ex});
        }
    };
    const moveTimesheets = (toProject, fromProject, tsArray) => {
        try
        {
            let updateTSArr = [];
            log.debug({title: "tsArray", details: tsArray});
            tsArray.forEach(function (tsObj) {
                tsObj = JSON.parse(tsObj);
                let recObj = record.load({type: "timebill", id: tsObj.id});
                recObj.setValue({fieldId: "customer", value: toProject});
                recObj.setText({fieldId: "casetaskevent", text: tsObj.task+" (Project Task)"});
                recObj.setValue({fieldId: "item", value: tsObj.item});             
                let updatedTs = recObj.save({ignoreMandatoryFields: true, enableSourcing: true});
                log.debug({title: "updatedTs", details: updatedTs});
                updateTSArr.push(updatedTs);
            });
            log.debug({title: "updateTSArr", details: updateTSArr});
            return updateTSArr;
        }
        catch(ex)
        {
            log.error({title: "Move Timesheets", details: ex});
        }
    };
    const updateRA = (fromProject, resource) => {
        try
        {
            let updatedRA = record.submitFields({
                type: "resourceallocation",
                id: tsObj.id,
                values: {
                    "enddate": toProject,
                    "custevent_resource_allocation_status": 3
                    
                },
                options: {
                    enablesourcing: true
                }                    
            });
        }
        catch(ex)
        {
            log.error({title: "Move Timesheets", details: ex});
        }
    };
    const getRA = (fromProject, resource) => {
        try
        {
            let raId = "";
            let suiteQL = "SELECT id FROM resourceallocation WHERE project='"+fromProject+"' AND allocationresource='"+resource+"'";
            let response = query.runSuiteQL(suiteQL);
            if(response.results.length > 0)
            {
                raId = response.results[0].values[0];
            }
            return raId;
        }
        catch(ex)
        {
            log.error({title: "Get Resource Allocation", details: ex});
        }
    };
    return {getInputData, map, reduce, summarize};
});
