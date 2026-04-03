/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/url', 'N/https', "/SuiteScripts/Timesheet Portal/Library/Auth Library/Encode Decode Lib.js", "/SuiteScripts/Timesheet Portal/Library/Auth Library/oauth.js", "/SuiteScripts/Timesheet Portal/Library/Auth Library/secret.js"], 
    (url, https, _, oauth, secret) => {
    const onRequest = (scriptContext) => {
        try 
        {
    	    log.debug({title: "scriptContext.request", details: scriptContext.request.body});
            let restUrl = getRestletUrl();
            log.debug({title: "restUrl", details: restUrl});
            let body = scriptContext.request.body;	     	    
    		
    	    let method  = 'POST';
    	    let headers = oauth.getHeaders({
    	            url:         restUrl,
    	            method:      method,
    	            tokenKey:    secret.token.public,
    	            tokenSecret: secret.token.secret
    	    });    	    
    	    headers['Content-Type'] = 'application/json';
    	    let restResponse = https.post({
    	            url: restUrl,
    	            headers: headers,
    	            body: body
    	    });
    	    log.debug({title: "restResponse.body", details: restResponse.body});
            scriptContext.response.write({ output: restResponse.body});
        }
        catch(ex)
        {
            log.error({title: "Data Exchange Middleware Suitelet", details: ex});
        }
    };
    const getRestletUrl = () =>{
		let restUrl = url.resolveScript({
            scriptId: "customscript_asc_rest_tsportal_command",
            deploymentId: "customdeploy_asc_rest_tsportal_command",
            returnExternalUrl: true
        }).split("&compid=")[0];
		return restUrl;
	};    
    return {onRequest};
});
