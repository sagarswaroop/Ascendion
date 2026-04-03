function showSection(sectionId) {
    document.querySelectorAll('.form-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

function openForm() {
    document.getElementById("purhcase-request-form").style.display = "block";
}

function closeForm() {
    document.getElementById("purhcase-request-form").style.display = "none";
}



// Handle form submissions
// document.getElementById('purchase-requirements-form').addEventListener('submit', function (event) {
//     event.preventDefault();
//     const formData = new FormData(this);
//     sendDataToAPI('/api/purchase-requirements', formData);
// });

// document.getElementById('purchase-orders-form').addEventListener('submit', function (event) {
//     event.preventDefault();
//     const formData = new FormData(this);
//     sendDataToAPI('/api/purchase-orders', formData);
// });

// document.getElementById('item-receipts-form').addEventListener('submit', function (event) {
//     event.preventDefault();
//     const formData = new FormData(this);
//     sendDataToAPI('/api/item-receipts', formData);
// });

// var formData = {
//     requestorId: 86683,
//     receiveby: "10/03/2024",
//     memo: "api request create",
//     formLines: [
//         { itemId: "311", qty: "4", description: "line description", rate: "20" },
//         { itemId: "311", qty: "8", description: "line description", rate: "40" }
//     ]
// }

// var recordType = "requisition"



// function sendDataToAPI(formData, recType) {
//     $.ajax({
//         url: 'https://7315200-sb1.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2050&deploy=1&compid=7315200_SB1&ns-at=AAEJ7tMQ3GYtkYa2mn412ncmN1J4XUWLHpkgad29MQ3xKdlfQmE',
//         method: 'POST',
//         data: { data: formData, type: recType },
//         success: function (response) {
//             let responseObj = JSON.parse(response);
//             console.log("responseObj", responseObj);
//             let value = responseObj.success;
//             if (value == true) {
//                 localStorage.clear();
//                 localStorage.setItem("dashboardData", JSON.stringify(responseObj.data));
//                 let data = localStorage.getItem("dashboardData");
//                 console.log("retrived data:", data);
//                 // alert("login successful.",data);
//                 document.location.href = responseObj.url;
//             } else {
//                 alert("Invalid credentials");
//             }
//         },
//         error: function (error) {
//             console.error('Error:', error);
//             // $('#response').text('Error: ' + JSON.stringify(error));
//         }
//     });
// }

// sendDataToAPI(formData, recordType);


// test file js.

// const data = [
//     { id: 1, name: 'Item 1' },
//     { id: 2, name: 'Item 2' },
//     { id: 3, name: 'Item 3' },
// ];

// // Load data from localStorage if available
// function loadData() {
//     const storedData = localStorage.getItem('data');
//     return storedData ? JSON.parse(storedData) : data;
// }

// // Save data to localStorage
// function saveData(data) {
//     localStorage.setItem('data', JSON.stringify(data));
// }

// // Populate the data list
// function populateList() {
//     const dataList = document.getElementById('data-list');
//     dataList.innerHTML = '';
//     loadData().forEach(item => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td>${item.id}</td>
//             <td>${item.name}</td>
//             <td>
//                 <button class="btn btn-info btn-sm" onclick="showViewModal(${item.id})">View</button>
//                 <button class="btn btn-warning btn-sm" onclick="showEditModal(${item.id})">Edit</button>
//             </td>
//         `;
//         dataList.appendChild(row);
//     });
// }

// Show view modal
// function showViewModal(id) {
//     const item = loadData().find(item => item.id === id);
//     document.getElementById('view-info').textContent = `ID: ${item.id}, Name: ${item.name}`;
//     $('#viewModal').modal('show');
// }

// // Show edit modal
// function showEditModal(id) {
//     const item = loadData().find(item => item.id === id);
//     document.getElementById('edit-name').value = item.name;
//     document.getElementById('edit-id').value = item.id;
//     $('#editModal').modal('show');
// }

// // Save edited data
// document.getElementById('save-button').onclick = function() {
//     const id = parseInt(document.getElementById('edit-id').value);
//     const name = document.getElementById('edit-name').value;

//     let items = loadData();
//     const index = items.findIndex(item => item.id === id);
//     if (index !== -1) {
//         items[index].name = name;
//     }

//     saveData(items);
//     $('#editModal').modal('hide');
//     populateList();
// };

// // Initialize the list
// populateList();
