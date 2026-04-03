/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * Version    Date            Author           Remarks
 * 1.00       09 July 2024   Pradeep Pol
 */
define(["N/ui/serverWidget", "N/http"], (serverWidget, http) => {

    const onRequest = (scriptContext) => {
        log.debug({ title: "method", details: scriptContext.request.method });
        let eventRouter = {};
        eventRouter[http.Method.GET] = executeGet;
        eventRouter[scriptContext.request.method] ? eventRouter[scriptContext.request.method](scriptContext) : "";

    };
    const executeGet = (scriptContext) => {
        try {
            let flag = scriptContext.request.parameters.flag;
            var Message_Flag = "";
            if (flag == 'T') { Message_Flag = "Invalid Employee ID Or Password. Please Try Again !!!"; }

            var strName = '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.1//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile11.dtd">';
            strName += '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">';
            strName += '<head>';
            strName += '<title>Ascendion Timesheet Portal</title>';
            strName += '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
            strName += '<meta charset="UTF-8">';
            strName += '<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">';
            strName += '<meta name="mobile-web-app-capable" content="yes">';
            strName += '<script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>';
            strName += '<script src="https://7315200-sb1.app.netsuite.com/core/media/media.nl?id=2292314&c=7315200_SB1&h=_idlKcArJ7yZXMndvnCIG-SzUZ6dvib0ULpmJGHZISsVuIR_&_xt=.js"></script>';
            strName += '<link href="https://7315200-sb1.app.netsuite.com/core/media/media.nl?id=2292308&c=7315200_SB1&h=rfDpN5mOamqJnkzizLZX-LqGIFytzLubTbkf50Yq7MyvdxyZ&_xt=.css" rel="stylesheet">';
            strName += '<link href="https://7315200-sb1.app.netsuite.com/core/media/media.nl?id=2292307&c=7315200_SB1&h=k9H99t5agrN10lWPS3mPkeiR_opq0kvRxSDos1rw-LFem0BS&_xt=.css" rel="stylesheet">';

            strName += '<script type="text/javascript">';
            strName += '$(document).ready(function(){';
            // strName += `let url = new URL(window.location.href);
            // let success = url.searchParams.get("success");
            // if(success == 'false'){
            //     alert("Invalid Credentials");
            //     const params = new URLSearchParams(url.search);
            //     params.delete("success");
            //     document.location.href = url;
            // }else{`
            strName += '    sessionStorage.clear();';
            strName += '    sessionStorage.removeItem("username");';
            strName += '    sessionStorage.removeItem("pass");';
            strName += '    $("#login").submit(function(event){';
            strName += '        event.preventDefault();';
            strName += '    });';
            strName += '    $("#login").click(function(){';
            strName += '        var userName = $("#userName").val();';
            strName += '        var password = $("#password").val();';
            strName += '        if(!userName)';
            strName += '        {   alert("User Name is required");}else if(!password){';
            strName += '            alert("User Password is required");}else{';
            // strName += '                         console.log("user name:"+userName+" password: "+password)'

            // strName += '            sessionStorage.setItem("userName", userName);';
            // strName += '            var encryptedPass = CryptoJS.AES.encrypt(password.trim(),"Secret Passphrase");';
            // strName += '            encryptedPass = encryptedPass.toString();';						
            // strName += '            sessionStorage.setItem("password", encryptedPass);';
            strName += '            document.location.href="https://7315200-sb2.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1329&deploy=1&compid=7315200_SB2&ns-at=AAEJ7tMQzQTw5iZlWUvBS8J3k6g1Lu94UsdqI84cr47jY_-g3tM&userName="+userName+"&password="+password+""';
            strName += '        }';
            strName += '    });';
            strName += '});';
            strName += '</script>';
            strName += '</head>';
            strName += '<body class="form-02-main">';
            strName += '<div style="float: left;">';
            strName += '     <img width="50%" src="https://7315200-sb1.app.netsuite.com/core/media/media.nl?id=2292318&c=7315200_SB1&h=oLcbreBqonoaqcOZzLI02gDaglTHOqwz5qiuE9rj1zEgA9ak">';
            strName += '</div>';
            strName += '<section>';
            strName += '  <div class="container">';
            strName += '    <div class="row">';
            strName += '      <div class="col-md-12">';
            strName += '        <div class="_lk_de">';
            strName += '          <div class="form-03-main">';
            //strName +='            <div class="logo">';
            // strName +='              <img src="https://7315200-sb1.app.netsuite.com/core/media/media.nl?id=2292312&c=7315200_SB1&h=BqbiTA6FhGWdmLDmKixelZgIq-yvGS_YirbYgutxjEfMAc1K">';
            //strName +='            </div>';
            strName += '            <div align="center">';
            strName += '              <h5>Welcome To Ascendion</h5>';
            strName += '            </div>';
            strName += '            <div class="form-group">';
            strName += '              <input type="email" name="email" id="userName" class="form-control _ge_de_ol" type="text" placeholder="User Name" required="" aria-required="true">';
            strName += '           </div>';
            strName += '            <div class="form-group">';
            strName += '              <input type="password" name="password" id="password" class="form-control _ge_de_ol" type="text" placeholder="Password" required="" aria-required="true">';
            strName += '            </div>';
            strName += '            <div class="form-group">';
            strName += '                <input type="button" id="login" value="Login" class="btn btn-success" style="width: 100%;border-radius: 20px;display: inline-block;padding: 12px 0px;text-align: center;font-size: 16px;" />';
            strName += '            </div>';
            strName += '            <div class="checkbox form-group">';
            strName += '              <a href="#">Forgot Password</a>';
            strName += '            </div>';
            strName += '          </div>';
            strName += '       </div>';
            strName += '      </div>';
            strName += '    </div>';
            strName += '  </div>';
            strName += '</section>';
            strName += '</body> </html>';
            scriptContext.response.write(strName);
        }
        catch (ex) {
            log.error({ title: "Execute Get", details: ex });
        }
    };
    const getEmployeeData = (employeeId) => {
        try {
            let employeeeObj = {};
            let lookupObj = search.lookupFields({
                type: "employee",
                id: employeeId,
                columns: ["entityid", "subsidiarynohierarchy", "location", "department"]
            });
            if (lookupObj) {
                employeeeObj.name = lookupObj.entityid;
                employeeeObj.subsidiary = lookupObj.subsidiarynohierarchy[0].text;
                employeeeObj.location = lookupObj.location.length > 0 ? lookupObj.location[0].text : "";
                employeeeObj.department = lookupObj.department.length > 0 ? lookupObj.department[0].text : "";
            }
            return employeeeObj;
        }
        catch (ex) {
            log.error({ title: "Get Employee Data", details: ex });
        }
    };
    return { onRequest };
});