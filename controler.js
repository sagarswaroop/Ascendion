$(document).ready(function () {
    // Retrieve data from localStorage
    const data = localStorage.getItem("dashboardData");
    console.log("body data is:*****", data);
    console.log("body data is:", JSON.parse(data));

    // If user data exists in localStorage
    if (data) {
        // Parse the string into an object
        const bodyData = JSON.parse(JSON.stringify({"employeeDetails":{"employeeId":86682,"firstname":"Sagar","lastname":"Kumar","department":null,"location":null,"supervisor":null},"poDetails":[{"internalId":null,"docNo":"PO-200-00001","date":"09/29/2024","name":"0AB0015 ABT Electronics, Inc.","vdrId":"32604","qty":"2","itemText":"Fixed Bid","itemId":"311","itemRate":".00","itemAmount":".00","memo":"test ","totalAmount":".00","status":null,"statusId":null},{"internalId":null,"docNo":"PO-200-00002","date":"10/06/2024","name":"0AB0015 ABT Electronics, Inc.","vdrId":"32604","qty":"1","itemText":"Fixed Bid","itemId":"311","itemRate":"500.00","itemAmount":"500.00","memo":"test ","totalAmount":"500.00","status":null,"statusId":null},{"internalId":null,"docNo":"PO-200-00003","date":"10/06/2024","name":"0AB0007 Absolute Shredding LLC","vdrId":"32603","qty":"-1","itemText":"Open AP Item","itemId":"41525","itemRate":"46.04","itemAmount":"-46.04","memo":"","totalAmount":"-46.04","status":null,"statusId":null}],"prDetails":[{"internalId":"39557","docNo":"PURCHREQ2","date":"09/29/2024","quantity":"1","itemName":"Fixed Bid","itemId":"311","itemRate":".00","amount":".00","memo":"","status":"pendingOrder","totalAmount":".00","name":"sagar.kumar@ascendion.com Sagar Kumar"},{"internalId":"39558","docNo":"PURCHREQ3","date":"09/29/2024","quantity":"1","itemName":"Fixed Bid","itemId":"311","itemRate":".00","amount":".00","memo":"","status":"pendingOrder","totalAmount":".00","requestor":"Samir Papade"}],"irDetails":[]}));
        
        const user = bodyData.employeeDetails;
        // const prList = [
        //     { date: "01/01/2001", documentNumber: "INV-001", name: "test vendor", memo: "test memo", status: "pending approval", amount: "10000" }
        // ]

        console.log("bodyData.prDetails",bodyData.prDetails);
        console.log("bodyData.poDetails",bodyData.poDetails);
        // function userInfo() {
        //     this.name = user.firstname + " " + user.lastname;
        //     this.manager = user.supervisor ? user.supervisor : "";
        //     this.location = user.location;
        //     this.department = user.department;
        //     this.email = user.email;
        // }

        function viewDataModel() {
            var self = this;
            self.name = user.firstname + " " + user.lastname;
            self.manager = user.supervisor ? user.supervisor : "";
            self.location = user.location;
            self.department = user.department;
            self.email = user.email;

            self.prlist = bodyData.prDetails;
            self.polist = bodyData.poDetails;
            self.irlist = bodyData.irDetails;
            self.prView = bodyData.prDetails[prIndex];
        }

        ko.applyBindings(new viewDataModel());
} else {
        console.log("No user data found in localStorage.");
    }
});
