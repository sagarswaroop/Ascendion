/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/file"], (file) => {
    const onRequest = (scriptContext) => {
        try 
        {
            if(scriptContext.request.method === "GET")
            {
                let fileId = scriptContext.request.parameters.fileId;
                log.debug({title: "fileId", details: fileId});
                fileId = (!fileId) ? "2292321" : fileId;
                scriptContext.response.write(file.load({id: fileId}).getContents());
            }            
        } 
        catch(ex) 
        {
            log.error({title: "Load File", details: ex});            
        }
    };
    return {onRequest};
});
