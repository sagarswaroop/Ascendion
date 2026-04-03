/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */

// Sample payload.
// [
// {
//     type: 'Engineering',
//     options: ['option1', 'option2']
// }
// ]

let listDetails = [{ type: "Engineering", id: "customlist_clb_engnmt_modl_list", recordId: 529 }];
define(['N/record', 'N/log', 'N/error'], function (record, log, error) {
    function postRequest(context) {
        try {
            log.debug({ title: 'Received Payload', details: context });

            if (!context || !Array.isArray(context)) {
                throw {
                    status: "Failed",
                    error: error.create({
                        name: 'INVALID_PAYLOAD',
                        message: 'Invalid payload structure. Expected {type: "customlist_example", options: ["option1", "option2"]}'
                    })
                };
            }

            // mergeMatchingObjects function is a generator function that will return one object at a time
            // from the context array that matches the type from listDetails array
            for (const obj of mergeMatchingObjects(context, listDetails)) {
                console.log("Processing:", obj);
                var response = []
                obj.options.forEach(option => {
                    let responseObj = {}
                    let existingOption = search.create({
                        type: obj.id,
                        filters: [['name', 'is', option]],
                        columns: ['name']
                    }).run().getRange({ start: 0, end: 1 });

                    if (existingOption.length > 0) {
                        log.debug("Option already exists", option);
                        responseObj[option] = 'Available';
                        responseObj.error = [];
                    } else {
                        let newOption = record.create({ type: obj.id });
                        newOption.setValue({ fieldId: 'name', value: option });
                        let savedRecord = newOption.save();

                        if (savedRecord) {
                            responseObj.status = "Success";
                            responseObj[option] = 'Added';
                            responseObj.error = [];
                        } else {
                            responseObj.status = "Failed";
                            responseObj[option] = 'Failed';
                            responseObj.error = ["Error in adding option"];
                        }
                    }

                    response.push(responseObj);
                });
                // Further processing for each merged object
            }

            log.debug({ title: 'Response', details: response });
            return response;
        } catch (e) {
            log.error({ title: 'Error in API', details: e });
            return { error: e.name, message: e.message };
        }
    }

    function* mergeMatchingObjects(arr1, arr2) {
        const map = new Map(arr2.map(obj => [obj.type, obj])); // Create a map for quick lookup

        for (const obj of arr1) {
            if (map.has(obj.type)) {
                yield { ...obj, ...map.get(obj.type) }; // Merge objects and yield one at a time
            }
        }
    }

    return {
        post: postRequest
    };
});
